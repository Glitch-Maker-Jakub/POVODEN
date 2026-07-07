// =============================================================================
// POVODEŇ scoreboard server — optional Node.js + PostgreSQL service.
// -----------------------------------------------------------------------------
// Provides a public scoreboard (all-time / monthly / weekly) for the game and,
// for convenience, serves the static game itself from the repository root, so a
// single `npm start` hosts everything. The game degrades gracefully when this
// server is absent — it is an optional companion, not a dependency.
//
//   ENV:  DATABASE_URL  postgres connection string (required)
//         PORT          listen port (default 3000)
//
// Part of POVODEŇ — GNU Affero General Public License v3.0 (see ../LICENSE).
// =============================================================================

'use strict';

const path = require('path');
const express = require('express');
const { Pool } = require('pg');

const PORT = parseInt(process.env.PORT || '3000', 10);
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Example:');
  console.error('  export DATABASE_URL=postgres://user:pass@localhost:5432/povoden');
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const app = express();
app.use(express.json({ limit: '4kb' }));

// CORS — the scoreboard is a public read/write API for a browser game.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// --- tiny in-memory rate limit: max 10 writes per minute per IP ---------------
const writeLog = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const hits = (writeLog.get(ip) || []).filter((t) => now - t < 60_000);
  hits.push(now);
  writeLog.set(ip, hits);
  return hits.length > 10;
}

// Period → SQL window over created_at. Weekly uses the ISO week (Monday start).
const PERIODS = {
  all: '',
  month: "WHERE created_at >= date_trunc('month', now())",
  week: "WHERE created_at >= date_trunc('week', now())",
};

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

// GET /api/scores?period=all|month|week&limit=15  → ranked list
app.get('/api/scores', async (req, res) => {
  const period = PERIODS[req.query.period] !== undefined ? req.query.period : 'all';
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '15', 10) || 15));
  try {
    const { rows } = await pool.query(
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
    console.error('GET /api/scores', e.message);
    res.status(500).json({ error: 'db' });
  }
});

// POST /api/score  {name, town, score, grade, reElection, regionDeaths, regionDamage, lang}
app.post('/api/score', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?';
  if (rateLimited(String(ip))) return res.status(429).json({ error: 'rate' });

  const b = req.body || {};
  const name = String(b.name || '').replace(/[<>&"'`]/g, '').trim().slice(0, 24);
  const town = String(b.town || '').replace(/[<>&"'`]/g, '').trim().slice(0, 32);
  const score = Math.round(Number(b.score));
  const grade = String(b.grade || '').slice(0, 2);
  const reElection = Math.round(Number(b.reElection));
  const regionDeaths = Math.round(Number(b.regionDeaths));
  const regionDamage = Math.round(Number(b.regionDamage));
  const lang = b.lang === 'cs' ? 'cs' : 'en';

  if (!name || !town) return res.status(400).json({ error: 'name' });
  if (!Number.isFinite(score) || score < 0 || score > 100) return res.status(400).json({ error: 'score' });
  if (!/^(A\+|A|B|C|D|F)$/.test(grade)) return res.status(400).json({ error: 'grade' });
  if (!Number.isFinite(reElection) || reElection < 0 || reElection > 100) return res.status(400).json({ error: 're' });
  if (!Number.isFinite(regionDeaths) || regionDeaths < 0 || regionDeaths > 10_000_000) return res.status(400).json({ error: 'deaths' });
  if (!Number.isFinite(regionDamage) || regionDamage < 0 || regionDamage > 10_000_000) return res.status(400).json({ error: 'damage' });

  try {
    const ins = await pool.query(
      `INSERT INTO scores (name, town, score, grade, re_election, region_deaths, region_damage, lang)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, created_at`,
      [name, town, score, grade, reElection, regionDeaths, regionDamage, lang]
    );
    // Rank of the new entry in each window (score DESC, created_at ASC).
    const rankIn = async (where) => {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int + 1 AS rank FROM scores
          ${where ? where + ' AND' : 'WHERE'}
          (score > $1 OR (score = $1 AND created_at < $2))`,
        [score, ins.rows[0].created_at]
      );
      return rows[0].rank;
    };
    res.json({
      ok: true,
      rank: {
        all: await rankIn(''),
        month: await rankIn(PERIODS.month),
        week: await rankIn(PERIODS.week),
      },
    });
  } catch (e) {
    console.error('POST /api/score', e.message);
    res.status(500).json({ error: 'db' });
  }
});

// Convenience: serve the static game from the repository root, so one process
// hosts game + scoreboard together.
app.use(express.static(path.join(__dirname, '..')));

app.listen(PORT, () => {
  console.log(`POVODEN scoreboard + game on http://localhost:${PORT}`);
});
