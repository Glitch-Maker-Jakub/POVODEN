// Network-layer tests over a mocked fetch — no real server, no browser.
// Covers the shared apiClient's normalised error states and real abort/timer
// behaviour, the scoreboard contract, and the telemetry queue's offline
// resilience (persistence, batchId dedup, retry cap, consent revocation).

import test from 'node:test';
import assert from 'node:assert/strict';

// --- shims so browser-flavoured modules import cleanly headless ----------------
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

const { apiFetch, apiBase, NET_ERROR } = await import('../src/net/apiClient.js');
const { fetchScores, submitScore } = await import('../src/net/scoreboard.js');
const telemetry = await import('../src/net/telemetry.js');

const jsonResponse = (data, ok = true, status = 200) => ({
  ok, status, json: async () => data,
});

// --- apiClient -----------------------------------------------------------------

test('apiBase has one config source and strips the trailing slash', () => {
  assert.equal(apiBase(), '/api');
  globalThis.POVODEN_API = 'https://example.org/api/';
  assert.equal(apiBase(), 'https://example.org/api');
  delete globalThis.POVODEN_API;
});

test('a successful call returns parsed data', async () => {
  const res = await apiFetch('/scores', { fetchImpl: async () => jsonResponse({ entries: [] }) });
  assert.deepEqual(res, { ok: true, data: { entries: [] } });
});

test('HTTP errors are SERVER errors with the status attached', async () => {
  const res = await apiFetch('/scores', { fetchImpl: async () => jsonResponse({}, false, 503) });
  assert.deepEqual(res, { ok: false, error: NET_ERROR.SERVER, status: 503 });
});

test('a 2xx with a non-JSON body is BAD_RESPONSE', async () => {
  const res = await apiFetch('/scores', {
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('nope'); } }),
  });
  assert.deepEqual(res, { ok: false, error: NET_ERROR.BAD_RESPONSE });
});

test('a rejected fetch is OFFLINE', async () => {
  const res = await apiFetch('/scores', { fetchImpl: async () => { throw new TypeError('network down'); } });
  assert.deepEqual(res, { ok: false, error: NET_ERROR.OFFLINE });
});

test('the timeout actually aborts the request and reports TIMEOUT', async () => {
  let sawSignal = null;
  const res = await apiFetch('/slow', {
    timeoutMs: 20,
    fetchImpl: (url, opts) => new Promise((_, reject) => {
      sawSignal = opts.signal;
      opts.signal.addEventListener('abort', () => reject(new Error('aborted')));
    }),
  });
  assert.deepEqual(res, { ok: false, error: NET_ERROR.TIMEOUT });
  assert.equal(sawSignal.aborted, true, 'the underlying request must be aborted');
});

test('a fast response never gets aborted afterwards (timer cleared)', async () => {
  let sawSignal = null;
  const res = await apiFetch('/fast', {
    timeoutMs: 20,
    fetchImpl: async (url, opts) => { sawSignal = opts.signal; return jsonResponse({ ok: 1 }); },
  });
  assert.equal(res.ok, true);
  await new Promise((r) => setTimeout(r, 40)); // past the timeout deadline
  assert.equal(sawSignal.aborted, false, 'timer must be cleared after completion');
});

// --- scoreboard contract ----------------------------------------------------------

test('fetchScores returns entries on success and a typed error on failure', async () => {
  globalThis.fetch = async () => jsonResponse({ entries: [{ rank: 1, name: 'A' }] });
  assert.deepEqual(await fetchScores('all', 5), { entries: [{ rank: 1, name: 'A' }], error: null });

  globalThis.fetch = async () => { throw new TypeError('down'); };
  assert.deepEqual(await fetchScores('all', 5), { entries: null, error: NET_ERROR.OFFLINE });

  globalThis.fetch = async () => jsonResponse({ nonsense: true });
  assert.deepEqual(await fetchScores('all', 5), { entries: null, error: NET_ERROR.BAD_RESPONSE });
});

test('submitScore keeps its contract: server JSON on success, null on failure', async () => {
  globalThis.fetch = async () => jsonResponse({ ok: true, rank: { all: 3 } });
  assert.deepEqual(await submitScore({ name: 'X' }), { ok: true, rank: { all: 3 } });
  globalThis.fetch = async () => jsonResponse({}, false, 500);
  assert.equal(await submitScore({ name: 'X' }), null);
});

// --- telemetry: consent, persistence, dedup, retry cap ------------------------------

function freshConsent() {
  storage.clear();
  telemetry.setConsent(true);
  telemetry.beginCampaign('Millington');
}

test('without consent nothing is queued or sent', async () => {
  storage.clear();
  telemetry.setConsent(false);
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return jsonResponse({ ok: true }); };
  telemetry.beginCampaign('Millington');
  telemetry.logEvent('invest', { kind: 'boat' }, 1);
  await telemetry.flush();
  assert.equal(calls, 0);
});

test('a delivered envelope is sent once and leaves nothing persisted', async () => {
  freshConsent();
  const bodies = [];
  globalThis.fetch = async (url, opts) => { bodies.push(JSON.parse(opts.body)); return jsonResponse({ ok: true }); };
  telemetry.logEvent('invest', { kind: 'boat' }, 1);
  await telemetry.flush();
  assert.equal(bodies.length, 1);
  assert.ok(bodies[0].batchId, 'envelope carries a batchId for server-side dedup');
  assert.equal(bodies[0].events.at(-1).type, 'invest');
  assert.equal(bodies[0].participantId, telemetry.participantId());
  await telemetry.flush();
  assert.equal(bodies.length, 1, 'a confirmed batch is never re-sent');
  assert.equal(storage.get('povoden_tq'), undefined, 'nothing persisted after success');
});

test('an undelivered envelope persists and retries with the SAME batchId', async () => {
  freshConsent();
  const bodies = [];
  globalThis.fetch = async (url, opts) => { bodies.push(JSON.parse(opts.body)); throw new TypeError('down'); };
  telemetry.logEvent('deal', { accepted: true }, 2);
  await telemetry.flush();
  assert.equal(bodies.length, 1);
  const persisted = JSON.parse(storage.get('povoden_tq'));
  assert.equal(persisted.length, 1, 'failed envelope persisted for later');
  assert.equal(persisted[0].batchId, bodies[0].batchId);

  // Server comes back: the retry re-sends the identical batch, then clears it.
  globalThis.fetch = async (url, opts) => { bodies.push(JSON.parse(opts.body)); return jsonResponse({ ok: true }); };
  await telemetry.flush();
  assert.equal(bodies.length, 2);
  assert.equal(bodies[1].batchId, bodies[0].batchId, 'retry must reuse the batchId (dedup key)');
  assert.equal(storage.get('povoden_tq'), undefined);
});

test('retries are capped: a hopeless batch is eventually dropped', async () => {
  freshConsent();
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new TypeError('down'); };
  telemetry.logEvent('meeting', {}, 3);
  for (let i = 0; i < 10; i++) await telemetry.flush();
  assert.ok(calls <= 5, `expected at most 5 attempts, saw ${calls}`);
  assert.equal(storage.get('povoden_tq'), undefined, 'dropped batch leaves no residue');
});

test('revoking consent stops sending and clears the local queue', async () => {
  freshConsent();
  globalThis.fetch = async () => { throw new TypeError('down'); };
  telemetry.logEvent('invest', { kind: 'levee' }, 1);
  await telemetry.flush();
  assert.ok(storage.get('povoden_tq'), 'envelope persisted while consented');

  telemetry.setConsent(false);
  assert.equal(storage.get('povoden_tq'), undefined, 'revocation clears persisted batches');
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return jsonResponse({ ok: true }); };
  await telemetry.flush();
  assert.equal(calls, 0, 'revocation stops all sending');
});
