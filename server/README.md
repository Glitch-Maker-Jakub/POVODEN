# POVODEŇ scoreboard server (optional)

A minimal **Node.js + PostgreSQL** companion service for the game: a public scoreboard
with **all-time, monthly and weekly** rankings. The game runs fine without it — the
in-game Scoreboard screen just reports itself offline.

## Setup

```bash
# 1. Dependencies (Node ≥ 18) — reproducible from the lockfile
cd server
npm ci

# 2. Database + versioned migrations (transactional, tracked in schema_migrations)
psql -c "CREATE DATABASE povoden"
export DATABASE_URL=postgres://user:pass@localhost:5432/povoden   # Windows: set DATABASE_URL=...
npm run migrate

# 3. Run
npm start
```

## Configuration

| Env | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | — (required) | PostgreSQL connection string |
| `PORT` | `3000` | listen port |
| `CORS_ORIGINS` | unset | comma-separated origin allowlist; unset = same-origin only, `*` opens the API explicitly |
| `TRUST_PROXY` | none | proxy hops to trust for client IPs (`1` behind one reverse proxy); without it a spoofed `x-forwarded-for` cannot bypass rate limits |
| `SERVE_STATIC` | `true` | `false` = API only (game hosted elsewhere) |

## Go-live checklist (game on GitHub Pages, API on your server)

The one setting that silently breaks everything: **`CORS_ORIGINS`**. Unset, the
API only accepts same-origin requests, so a game served from
`https://<org>.github.io` gets every scoreboard and telemetry call rejected by
the browser - no error is shown to the player, the scoreboard just reports
itself offline and telemetry queues forever.

1. `cd server && npm ci`
2. Environment: `DATABASE_URL` (required), `CORS_ORIGINS=https://<org>.github.io`
   (comma-separate several), `TRUST_PROXY=1` if the API sits behind nginx or a
   load balancer (otherwise every player shares one rate-limit bucket), `PORT`
   if not 3000, `SERVE_STATIC=false` only if the game is hosted elsewhere.
3. `npm run migrate` - safe on a fresh database and on one created with the old
   `schema.sql` (001 is a no-op there, 002 adds batch tracking). It only fails if
   an existing `events` row already exceeds the new 2000-character payload cap;
   check first with `SELECT max(length(payload::text)) FROM events;`.
4. `npm start`, then open `/api/health` - expect `{"ok":true}`.
5. In the Pages-hosted `index.html`, uncomment the `window.POVODEN_API` line and
   point it at `https://<server>/api` (same-origin deployments skip this).

## Operations

- **Deploy**: `npm ci && npm run migrate && npm start` (migrations are idempotent
  and transactional; a failed migration rolls back and aborts the deploy).
- **Rollback**: restore the database from backup or ship a new forward
  migration — applied files are recorded in `schema_migrations`.
- **Shutdown**: on SIGTERM/SIGINT the server stops accepting requests, drains
  in-flight ones and closes the pool (readiness: `/api/health`, liveness: `/api/live`).
- **Scaling note**: the rate limiter is per-process. The supported deployment is
  a single instance; for several instances enforce limits at the shared reverse
  proxy instead.
- **Tests**: `npm test` in the repository root exercises the full API surface
  with a stubbed database — no PostgreSQL needed (`tests/server.test.js`).

`npm start` serves **both** the API and the static game from the repository root on
`http://localhost:3000` — one process hosts everything.

## Public scoreboard page

`../scoreboard.html` is a standalone, iframe-embeddable view of the rankings (for a
faculty webpage etc.): `scoreboard.html?api=https://your-host/api&lang=cs`. It is served
automatically by this server alongside the game.

## Hosting the game separately

If the static game lives on another host (e.g. university web space), run only this API
somewhere with PostgreSQL, and point the game at it by defining, in `index.html`
**before** the game scripts:

```html
<script>window.POVODEN_API = "https://your-server.example/api";</script>
```

## API

| Endpoint | Description |
|---|---|
| `GET /api/health` | liveness + DB check |
| `GET /api/scores?period=all\|month\|week&limit=15` | ranked entries for the window (rank = score DESC, earlier submission wins ties) |
| `POST /api/score` | submit `{name, town, score, grade, reElection, regionDeaths, regionDamage, lang}` → `{ok, rank:{all,month,week}}` |
| `POST /api/events` | **opt-in research telemetry** — batched decision/outcome events keyed by a pseudonymous participant UUID and a per-participant campaign index |
| `DELETE /api/participant/:id` | GDPR erasure — removes all events for a participant ID (the ID is shown to the player in the game menu) |

## Research telemetry

The game asks for consent once (first campaign) and is **off unless the player opts in**.
Consent is revocable from the menu; no personal data is collected — only a browser-generated
random UUID, in-game decisions (`invest` own-vs-neighbour, `card`, `deal`, `meeting`,
`favour`, `sharpen`), per-round outcomes (`round_end`, `campaign_end`) and use of the
first-rounds tutorial callouts (`coach`, payload `{step, action}` — how much explanation
a player needed, a covariate for the behaviour measures), with `campaign_index`
(a participant's 1st, 2nd, 3rd… campaign) as the longitudinal axis.

Example analyses (psql):

```sql
-- Cooperation ratio (share of investments placed in OTHER towns) per campaign
-- index — the headline behavior-change measure across repeated play:
SELECT campaign_index,
       AVG(CASE WHEN (payload->>'own')::boolean THEN 0 ELSE 1 END) AS coop_ratio,
       COUNT(*) AS investments
  FROM events WHERE type = 'invest'
 GROUP BY campaign_index ORDER BY campaign_index;

-- Deal acceptance rate over campaigns:
SELECT campaign_index,
       AVG(CASE WHEN (payload->>'accepted')::boolean THEN 1 ELSE 0 END) AS accept_rate
  FROM events WHERE type = 'deal'
 GROUP BY campaign_index ORDER BY campaign_index;

-- Final regional score by a participant's campaign order (learning curve):
SELECT campaign_index, AVG((payload->>'score')::int) AS avg_score, COUNT(*) AS n
  FROM events WHERE type = 'campaign_end'
 GROUP BY campaign_index ORDER BY campaign_index;

-- Within-participant change, first vs latest campaign (paired comparison):
SELECT participant_id,
       MIN(campaign_index) AS first, MAX(campaign_index) AS latest
  FROM events GROUP BY participant_id HAVING MAX(campaign_index) > 1;
```

Windows are PostgreSQL date-truncated: monthly = current calendar month, weekly =
current ISO week (Monday start). Input is validated and length-limited; writes are
rate-limited to 10/min per IP.

Part of POVODEŇ — GNU AGPL v3.0 (see `../LICENSE`).
