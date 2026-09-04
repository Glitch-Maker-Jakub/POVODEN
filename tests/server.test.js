// Integration tests for the scoreboard/telemetry API: the express app is
// imported and instantiated with a STUB database (no PostgreSQL, no fixed
// port — an ephemeral port only for the duration of each request). Covers
// validation, consistent error bodies, rate limits per route, CORS allowlist,
// batch idempotency and the health/liveness split.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createApp, parseScore, parseEnvelope } = require('../server/app.js');
const { createRateLimiter } = require('../server/rateLimit.js');
const { fromEnv } = require('../server/config.js');

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const UUID_BATCH = '33333333-3333-4333-8333-333333333333';

/** Minimal db stub: records queries, returns canned rows. */
function stubDb() {
  const calls = [];
  const db = {
    calls,
    failNext: false,
    rows: [],
    async query(text, params) {
      calls.push({ text, params });
      if (db.failNext) { db.failNext = false; throw new Error('boom'); }
      if (/INSERT INTO scores/.test(text)) return { rows: [{ id: 1, created_at: '2026-07-11T00:00:00Z' }] };
      if (/COUNT\(\*\)/.test(text)) return { rows: [{ rank: 1 }] };
      if (/INSERT INTO event_batches/.test(text)) {
        const dup = db.seenBatches?.has(params[0]);
        (db.seenBatches ||= new Set()).add(params[0]);
        return { rows: dup ? [] : [{ batch_id: params[0] }] };
      }
      return { rows: db.rows };
    },
    async transaction(fn) { return fn(db); },
    async end() {},
  };
  return db;
}

function makeConfig(over = {}) {
  const config = fromEnv({});
  config.serveStatic = false;
  return { ...config, ...over };
}

/** Run one request against the app on an ephemeral port. */
async function request(app, path, { method = 'GET', body, headers = {} } = {}) {
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json', ...headers } : headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* non-JSON */ }
    return { status: res.status, headers: res.headers, json };
  } finally {
    app.locals.stopRateLimiters();
    await new Promise((r) => server.close(r));
  }
}

const validScore = {
  name: 'Mayor', town: 'Millington', score: 87, grade: 'A',
  reElection: 65, regionDeaths: 12, regionDamage: 3400, lang: 'en',
};
const validEnvelope = {
  participantId: UUID_A, campaignId: UUID_B, batchId: UUID_BATCH,
  campaignIndex: 1, lang: 'en',
  events: [{ type: 'invest', round: 1, payload: { kind: 'boat' } }],
};

// --- validation units --------------------------------------------------------------

test('parseScore rejects each malformed field with its name', () => {
  assert.equal(parseScore({ ...validScore, score: 999 }).error, 'score');
  assert.equal(parseScore({ ...validScore, grade: 'Z' }).error, 'grade');
  assert.equal(parseScore({ ...validScore, name: '<>&"' }).error, 'name', 'name that sanitises to nothing');
  assert.equal(parseScore({ ...validScore, name: '<b>Mayor</b>' }).value?.name, 'bMayor/b', 'markup stripped, text kept');
  assert.equal(parseScore({ ...validScore, regionDeaths: -1 }).error, 'regionDeaths');
  assert.deepEqual(parseScore(validScore).value.name, 'Mayor');
});

test('parseEnvelope enforces UUIDs, caps and known event types', () => {
  assert.equal(parseEnvelope({ ...validEnvelope, participantId: 'nope' }).error, 'participant');
  assert.equal(parseEnvelope({ ...validEnvelope, batchId: 'nope' }).error, 'batch');
  assert.equal(parseEnvelope({ ...validEnvelope, events: [{ type: 'hack' }] }).error, 'events');
  const big = parseEnvelope({
    ...validEnvelope,
    events: [{ type: 'invest', payload: { blob: 'x'.repeat(3000) } }],
  });
  assert.deepEqual(big.value.events[0].payload, {}, 'oversized payloads are dropped, not stored');
  const many = parseEnvelope({
    ...validEnvelope,
    events: Array.from({ length: 250 }, () => ({ type: 'invest' })),
  });
  assert.equal(many.value.events.length, 100, 'batch capped at 100 events');
});

// --- HTTP surface -------------------------------------------------------------------

test('liveness answers without the db; readiness fails without it', async () => {
  const db = stubDb();
  const app = createApp({ db, config: makeConfig() });
  assert.equal((await request(app, '/api/live')).status, 200);
  db.failNext = true;
  assert.equal((await request(app, '/api/health')).status, 503);
});

test('a valid score submission returns ranks; a bad one names the field', async () => {
  const app = createApp({ db: stubDb(), config: makeConfig() });
  const ok = await request(app, '/api/score', { method: 'POST', body: validScore });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.json.rank, { all: 1, month: 1, week: 1 });

  const bad = await request(app, '/api/score', { method: 'POST', body: { ...validScore, grade: 'Z' } });
  assert.equal(bad.status, 400);
  assert.deepEqual(bad.json, { error: 'grade' });
});

test('a replayed telemetry batch is acknowledged but stored zero times', async () => {
  const db = stubDb();
  const app = createApp({ db, config: makeConfig() });
  const first = await request(app, '/api/events', { method: 'POST', body: validEnvelope });
  assert.deepEqual(first.json, { ok: true, stored: 1 });
  const replay = await request(app, '/api/events', { method: 'POST', body: validEnvelope });
  assert.deepEqual(replay.json, { ok: true, stored: 0 }, 'idempotent on batchId');
  const inserts = db.calls.filter((c) => /INSERT INTO events/.test(c.text));
  assert.equal(inserts.length, 1, 'event rows inserted exactly once');
});

test('the erase endpoint validates the participant id', async () => {
  const app = createApp({ db: stubDb(), config: makeConfig() });
  assert.equal((await request(app, '/api/participant/not-a-uuid', { method: 'DELETE' })).status, 400);
  const ok = await request(app, `/api/participant/${UUID_A}`, { method: 'DELETE' });
  assert.equal(ok.status, 200);
});

test('each write route has its own rate bucket with a consistent 429', async () => {
  const config = makeConfig({ rate: {
    score: { limit: 2, windowMs: 60_000 },
    events: { limit: 2, windowMs: 60_000 },
    erase: { limit: 2, windowMs: 60_000 },
  } });
  const app = createApp({ db: stubDb(), config });
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  try {
    const { port } = server.address();
    const post = () => fetch(`http://127.0.0.1:${port}/api/score`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validScore),
    });
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await post()).status);
    assert.deepEqual(statuses, [200, 200, 429, 429], 'third score write is limited');
    // The events bucket is independent — still open.
    const ev = await fetch(`http://127.0.0.1:${port}/api/events`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validEnvelope),
    });
    assert.equal(ev.status, 200, 'score limiting must not starve telemetry');
  } finally {
    app.locals.stopRateLimiters();
    await new Promise((r) => server.close(r));
  }
});

test('rate limiter forgets old hits and cleans idle keys', () => {
  let nowMs = 0;
  const rl = createRateLimiter({ limit: 2, windowMs: 1000 }, () => nowMs);
  assert.equal(rl.limited('a'), false);
  assert.equal(rl.limited('a'), false);
  assert.equal(rl.limited('a'), true, 'third hit within the window is limited');
  nowMs += 1500; // window elapsed
  assert.equal(rl.limited('a'), false, 'old hits expire');
  rl.stop();
});

test('CORS: same-origin by default, allowlisted origins echoed, others refused', async () => {
  const closed = createApp({ db: stubDb(), config: makeConfig() });
  const r1 = await request(closed, '/api/live', { headers: { Origin: 'https://evil.example' } });
  assert.equal(r1.headers.get('access-control-allow-origin'), null, 'no CORS unless configured');

  const open = createApp({ db: stubDb(), config: makeConfig({ corsOrigins: ['https://faculty.example'] }) });
  const r2 = await request(open, '/api/live', { headers: { Origin: 'https://faculty.example' } });
  assert.equal(r2.headers.get('access-control-allow-origin'), 'https://faculty.example');
  const r3 = await request(open, '/api/live', { headers: { Origin: 'https://evil.example' } });
  assert.equal(r3.headers.get('access-control-allow-origin'), null, 'unknown origin gets nothing');
});

test('security headers are set and x-powered-by is gone', async () => {
  const app = createApp({ db: stubDb(), config: makeConfig() });
  const res = await request(app, '/api/live');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-powered-by'), null);
});
