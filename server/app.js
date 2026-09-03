// =============================================================================
// POVODEŇ scoreboard/telemetry API — the express app, dependency-injected.
//
//   createApp({ db, config })  ->  express app (no listening, no env reads)
//
// The process bootstrap (index.js) wires the real database and config in;
// tests inject a stub db and exercise the full HTTP surface without
// PostgreSQL. Every route validates its input and answers errors with a
// consistent `{ error: '<code>' }` body.
// =============================================================================

'use strict';

const path = require('path');
const express = require('express');
const { createRateLimiter } = require('./rateLimit.js');
const log = require('./logger.js');

// Period → SQL window over created_at. Weekly uses the ISO week (Monday start).
const PERIODS = {
  all: '',
  month: "WHERE created_at >= date_trunc('month', now())",
  week: "WHERE created_at >= date_trunc('week', now())",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT_TYPES = new Set([
  'consent', 'campaign_start', 'invest', 'card', 'deal', 'meeting',
  'favour', 'sharpen', 'round_end', 'campaign_end',
]);
const MAX_BATCH_EVENTS = 100;
const MAX_PAYLOAD_CHARS = 2000;

// --- field validators (shared shape: return the clean value or undefined) ------

const cleanText = (v, max) => {
  const s = String(v || '').replace(/[<>&"'`]/g, '').trim().slice(0, max);
  return s || undefined;
};
const intIn = (v, lo, hi) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= lo && n <= hi ? n : undefined;
};

/** Validate a score submission; returns { value } or { error }. */
function parseScore(b) {
  const value = {
    name: cleanText(b.name, 24),
    town: cleanText(b.town, 32),
    score: intIn(b.score, 0, 100),
    grade: /^(A\+|A|B|C|D|F)$/.test(String(b.grade || '')) ? String(b.grade) : undefined,
    reElection: intIn(b.reElection, 0, 100),
    regionDeaths: intIn(b.regionDeaths, 0, 10_000_000),
    regionDamage: intIn(b.regionDamage, 0, 10_000_000),
    lang: b.lang === 'cs' ? 'cs' : 'en',
  };
  for (const [field, v] of Object.entries(value)) {
    if (v === undefined) return { error: field };
  }
  return { value };
}

/** Validate a telemetry envelope; returns { value } or { error }. */
function parseEnvelope(b) {
  if (!UUID_RE.test(String(b.participantId))) return { error: 'participant' };
  if (!UUID_RE.test(String(b.campaignId))) return { error: 'campaign' };
  // batchId is the client's delivery-dedup key (older clients may omit it).
  const batchId = b.batchId == null ? null : String(b.batchId);
  if (batchId !== null && !UUID_RE.test(batchId)) return { error: 'batch' };
  const campaignIndex = intIn(b.campaignIndex, 1, 100000);
  if (campaignIndex === undefined) return { error: 'index' };
  const lang = b.lang === 'cs' ? 'cs' : 'en';
  const raw = Array.isArray(b.events) ? b.events.slice(0, MAX_BATCH_EVENTS) : [];

  const events = [];
  for (const e of raw) {
    const type = String(e.type || '');
    if (!EVENT_TYPES.has(type)) continue;
    const round = e.round == null ? null : intIn(e.round, 0, 100);
    if (e.round != null && round === undefined) continue;
    let payload = e.payload && typeof e.payload === 'object' ? e.payload : {};
    if (JSON.stringify(payload).length > MAX_PAYLOAD_CHARS) payload = {}; // cap oversized payloads
    events.push({ round, type, payload });
  }
  if (!events.length) return { error: 'events' };
  return { value: { participantId: b.participantId, campaignId: b.campaignId, batchId, campaignIndex, lang, events } };
}

// --- app factory -----------------------------------------------------------------

function createApp({ db, config }) {
  const app = express();
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  // CORS: same-origin by default; cross-origin only for the configured
  // allowlist ('*' must be set explicitly to open the API to everyone).
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allow = config.corsOrigins.includes('*') ? '*'
      : origin && config.corsOrigins.includes(origin) ? origin : null;
    if (allow) {
      res.set('Access-Control-Allow-Origin', allow);
      res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      if (allow !== '*') res.set('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  });

  // Security headers (kept iframe-friendly: scoreboard.html is MEANT to embed).
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  const limits = {
    score: createRateLimiter(config.rate.score),
    events: createRateLimiter(config.rate.events),
    erase: createRateLimiter(config.rate.erase),
  };
  app.locals.stopRateLimiters = () => Object.values(limits).forEach((l) => l.stop());

  // Liveness: the process answers. Readiness: the database answers too.
  app.get('/api/live', (_req, res) => res.json({ ok: true }));
  app.get('/api/health', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ ok: true });
    } catch (e) {
      res.status(503).json({ ok: false });
    }
  });

  // GET /api/scores?period=all|month|week&limit=15  → ranked list
  app.get('/api/scores', async (req, res) => {
    const period = PERIODS[req.query.period] !== undefined ? req.query.period : 'all';
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '15', 10) || 15));
    try {
      const { rows } = await db.query(
        `SELECT name, town, score, grade, re_election, region_deaths, region_damage,
                created_at,
                RANK() OVER (ORDER BY score DESC, created_at ASC) AS rank
           FROM scores ${PERIODS[period]}
          ORDER BY score DESC, created_at ASC
          LIMIT $1`,
        [limit]
      );
      res.json({ period, entries: rows });
    } catch (e) {
      log.error('scores query failed', { error: e.message });
      res.status(500).json({ error: 'db' });
    }
  });

  // POST /api/score  {name, town, score, grade, reElection, regionDeaths, regionDamage, lang}
  app.post('/api/score', limits.score, async (req, res) => {
    const parsed = parseScore(req.body || {});
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const v = parsed.value;
    try {
      const ins = await db.query(
        `INSERT INTO scores (name, town, score, grade, re_election, region_deaths, region_damage, lang)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, created_at`,
        [v.name, v.town, v.score, v.grade, v.reElection, v.regionDeaths, v.regionDamage, v.lang]
      );
      // Rank of the new entry in each window (score DESC, created_at ASC).
      const rankIn = async (where) => {
        const { rows } = await db.query(
          `SELECT COUNT(*)::int + 1 AS rank FROM scores
            ${where ? where + ' AND' : 'WHERE'}
            (score > $1 OR (score = $1 AND created_at < $2))`,
          [v.score, ins.rows[0].created_at]
        );
        return rows[0].rank;
      };
      res.json({
        ok: true,
        rank: { all: await rankIn(''), month: await rankIn(PERIODS.month), week: await rankIn(PERIODS.week) },
      });
    } catch (e) {
      log.error('score insert failed', { error: e.message });
      res.status(500).json({ error: 'db' });
    }
  });

  // POST /api/events — batched research telemetry (STRICTLY OPT-IN client-side).
  // Envelopes carry a client-minted batchId; a batch seen before is answered
  // ok without inserting anything, so client retries and sendBeacon replays
  // cannot duplicate rows.
  app.post('/api/events', limits.events, async (req, res) => {
    const parsed = parseEnvelope(req.body || {});
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const v = parsed.value;
    try {
      const stored = await db.transaction(async (client) => {
        if (v.batchId) {
          const dup = await client.query(
            'INSERT INTO event_batches (batch_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING batch_id',
            [v.batchId]
          );
          if (!dup.rows.length) return 0; // already delivered — idempotent no-op
        }
        const values = [];
        const params = [];
        v.events.forEach((e, i) => {
          const o = i * 7;
          values.push(`($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7})`);
          params.push(v.participantId, v.campaignId, v.campaignIndex, e.round, e.type, e.payload, v.lang);
        });
        await client.query(
          `INSERT INTO events (participant_id, campaign_id, campaign_index, round, type, payload, lang)
           VALUES ${values.join(',')}`,
          params
        );
        return v.events.length;
      });
      res.json({ ok: true, stored });
    } catch (e) {
      log.error('events insert failed', { error: e.message });
      res.status(500).json({ error: 'db' });
    }
  });

  // DELETE /api/participant/:id — GDPR erasure: a participant (who knows their
  // own ID, shown in the consent dialog) can have all their rows removed.
  app.delete('/api/participant/:id', limits.erase, async (req, res) => {
    if (!UUID_RE.test(String(req.params.id))) return res.status(400).json({ error: 'participant' });
    try {
      const del = await db.query('DELETE FROM events WHERE participant_id = $1', [req.params.id]);
      log.info('participant erased', { deleted: del.rowCount });
      res.json({ ok: true, deleted: del.rowCount });
    } catch (e) {
      log.error('participant erase failed', { error: e.message });
      res.status(500).json({ error: 'db' });
    }
  });

  // Convenience: serve the static game from the repository root, so one
  // process hosts game + scoreboard together.
  if (config.serveStatic) {
    app.use(express.static(path.join(__dirname, '..')));
  }

  return app;
}

module.exports = { createApp, parseScore, parseEnvelope };
