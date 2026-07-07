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

Windows are PostgreSQL date-truncated: monthly = current calendar month, weekly =
current ISO week (Monday start). Input is validated and length-limited; writes are
rate-limited to 10/min per IP.

Part of POVODEŇ — GNU AGPL v3.0 (see `../LICENSE`).
