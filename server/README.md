# POVODEŇ scoreboard server (optional)

A minimal **Node.js + PostgreSQL** companion service for the game: a public scoreboard
with **all-time, monthly and weekly** rankings. The game runs fine without it — the
in-game Scoreboard screen just reports itself offline.

## Setup

```bash
# 1. Dependencies (Node ≥ 18)
cd server
npm install

# 2. Database
psql -c "CREATE DATABASE povoden"
psql povoden -f schema.sql

# 3. Configuration + run
export DATABASE_URL=postgres://user:pass@localhost:5432/povoden   # Windows: set DATABASE_URL=...
npm start
```

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
`favour`, `sharpen`) and per-round outcomes (`round_end`, `campaign_end`), with
`campaign_index` (a participant's 1st, 2nd, 3rd… campaign) as the longitudinal axis.

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
