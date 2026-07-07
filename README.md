# POVODEŇ — Flood (web build)

A 2D, old-school **serious game** that trains mayors and municipal crisis staff in
flood preparation, rescue-resource allocation, and **inter-municipal cooperation**
along a shared river. Web reimplementation of the POVODEŇ game described in the
RUR / UJEP chapter, built to be **fully static and self-hostable** for workshops
and public play. Bilingual (English / Čeština).

> Seven municipalities sit on one river, headwaters → estuary. Each round you
> prepare (levees, boats, life kits, morale, reserves), then the flood arrives.
> The catch: a levee protects *your* town but pushes water **downstream**. Local
> optimisation by every mayor is globally catastrophic — exactly the dilemma the
> 2002 and 2013 Elbe floods exposed. Cooperation is not a moral nicety here; it
> is instrumentally rational, and the game makes you feel it.

## Run / host

This is a **zero-build static site** — plain ES modules + Phaser 3 vendored
locally (`vendor/phaser.min.js`). No bundler, no Node on the server.

**Locally** (ES modules need HTTP, not `file://`):

```bash
cd povoden
python -m http.server 8124        # then open http://127.0.0.1:8124
```

**On your server:** copy the whole `povoden/` folder into any static web root
(Apache, nginx, GitHub Pages, itch.io, university web space). Done. No build step.

## Scoreboard (optional, PostgreSQL)

A small optional **Node.js + PostgreSQL** service under `server/` provides a public
scoreboard with **all-time, monthly and weekly** rankings. The game works fully
without it — the in-game Scoreboard screen simply reports itself offline.

```bash
cd server
npm install
psql -c "CREATE DATABASE povoden"
psql povoden -f schema.sql
export DATABASE_URL=postgres://user:pass@localhost:5432/povoden   # Windows: set DATABASE_URL=...
npm start          # serves BOTH the game and the API on http://localhost:3000
```

When the Node server runs, one process serves the game and the API. If the static
game is hosted elsewhere, point it at the API by defining
`window.POVODEN_API = "https://your-server/api"` before the game scripts load
(see `index.html`). Details: [`server/README.md`](server/README.md).

## How it maps to the paper

The scientifically grounded layers from the chapter are implemented as real,
citable code:

| Paper section | File | What it does |
|---|---|---|
| §3.1 Harmonic-number flood arrival | `src/model/floodModel.js` → `drawRegionalSeverity()` | i.i.d. severity draw — **no exploitable pattern** to learn (inoculates against gambler's-fallacy reasoning) |
| §3.2 Lotka–Volterra rescue | `src/model/floodModel.js` → `simulateRescue()` | logistic death dynamics vs Gaussian-in-time boat/kit rescue |
| §3.2 Zeta-derived noise | `src/model/zetaNoise.js` | rescue effectiveness perturbed by **gaps between Riemann ζ zeros** (feels "weathery") |
| §4.1 Seven municipalities + traits | `src/data/gameData.js` | Delta Outpost … Final Point, each with its strategic asymmetry |
| §4.2 Five investment categories | `src/data/gameData.js` → `INVESTMENTS` | Levee, Boat, Life Kit, Fun, Reserve |
| §4.4 Cooperation dilemma | `src/model/floodModel.js` → `resolveFlood()` | levees deflect water downstream; Greenhaven's floodplain absorbs it; Final Point bears the cumulative burden |
| §5.1 data / logic / presentation split | `data/` · `model/` + `ai/` · `scenes/` + `ui/` | same separation as the Godot build |

## Project structure

```
povoden/
├── index.html              # static shell, loads Phaser then the game
├── vendor/phaser.min.js    # Phaser 3 (vendored — no CDN dependency)
├── assets/                 # pixel-art assets (placeholders for now)
└── src/
    ├── main.js             # Phaser config + scene registration
    ├── data/gameData.js    # municipalities, investments, balance constants
    ├── model/
    │   ├── zetaNoise.js     # Riemann ζ-gap noise source
    │   ├── floodModel.js    # severity draw + Lotka–Volterra solver + river coupling
    │   └── gameState.js     # round/phase machine, scoring
    ├── ai/mayorAI.js        # rule-based AI mayors (cooperativeness dial)
    ├── ui/widgets.js        # buttons, bars, palette
    └── scenes/
        ├── BootScene.js
        ├── MenuScene.js     # title + municipality picker
        └── GameScene.js     # the board: prep ↔ flood ↔ summary
```

## Current state — playable alpha

Working: full 10-round campaign loop, 7 municipalities with traits, the
target-city **cooperation lever**, AI mayors, the flood draw + Lotka–Volterra
resolution with downstream coupling, flood animation, per-round and final
reports, and the **15-card power deck** (§4.3) — three rarity tiers gated by a
research budget that grows while Oceana is protected. Card effects hook into
preparation (budget/morale/levees), flood resolution (temporary levees,
severity redirection, boat pooling, evacuation), and across rounds (goodwill,
audits, debt, insurance). See `src/data/gameData.js` (`CARDS`) and
`src/model/cardEffects.js`.

Also working:

- **Felt AI mayors.** The six AI towns are run by named, characterised mayors
  (`MAYORS`) with **hidden agendas shuffled every game** (`AGENDAS`) — so the
  regional politics differ each playthrough. A **relationship** (0–100) tracks
  how each mayor regards you: it rises when you fund their town or keep a deal,
  falls when you divert the flood onto them or break your word. **Well-treated
  mayors reciprocate** — they pre-position boats in *your* town. Each round one
  mayor **offers a deal** (Accept/Decline) you can honour or betray. See
  `MAYORS`/`AGENDAS`/`RELATIONSHIP` in `gameData.js`, the deal system in
  `gameState.js`, and reciprocity in `ai/mayorAI.js`.
- **Economy of attention.** Political Capital (⚡2/round) limits how many cards
  you play and how much you can help *other* towns — your own town is free. Cards
  are held across rounds (hand cap 4). You cannot do everything; you must choose
  allies and time your plays.
- **Invisible neighbours + Regional Meeting.** Each mayor's exact plan (levees,
  boats, reserves) is *hidden* until you convene a Regional Meeting (§15) — which
  reveals everyone for the round. Information is itself a cooperative good.
- **Severity-graded lethality.** Not every flood is a catastrophe: minor floods
  are a nuisance (a handful of casualties region-wide), while severe and
  catastrophic events are genuinely deadly. See `lethalityBySeverity` in
  `gameData.js`.
- **Pixel art (generated).** Flooded-town title background, a portrait for each
  of the seven municipalities, and water/flood tiles — produced via OpenRouter
  (`google/gemini-2.5-flash-image`) and downscaled (`tools/`, total < 1 MB).

Also done: **town sprites on the river map** (backgrounds keyed transparent), a
**flood-wave animation** (the crest travels headwaters→estuary with camera
shake + a synthesized water rush), **procedural sound** (`src/ui/sfx.js`, Web
Audio — no files), and an **in-game tutorial** (`HowToScene`, reachable from the
menu). The alpha is feature-complete.

Possible next: post-campaign harmonic-number teaching widget (§3.1),
upstream-commits-first turn order, and balance tuning from real playtests.

## Assets

Pixel art is generated at build time and committed as static PNG/JPEG under
`assets/`. To regenerate or restyle, see `tools/README.md`
(`node tools/gen-assets.mjs` → `python tools/resize-assets.py`). The key lives
only in the gitignored `tools/.env.local`; it never ships with the game.

## Debugging

`window.GAME` is the Phaser instance. From the browser console you can drive
scenes, e.g. `GAME.scene.getScene('Game').gs` to inspect live game state.

## Credits & funding

Developed under the **RUR — Region to University, University to Region** strategic
project (**CZ.10.02.01/00/22_002/0000210**) at **Jan Evangelista Purkyně University
(UJEP)**, Ústí nad Labem, funded by the **Operational Programme Just Transition
(EU Just Transition Fund)**, with the institutional support of the UJEP Faculty of
Social and Economic Studies.

Team: **Jakub Binter, Hermann Prossinger, Martin Stachoň, Natalie Čermáková,
Lenka Slavíková, Daniel Říha, Eduard Eck, Tomáš Grasl.** Implementation, balancing,
localization and verification were carried out by a large-language-model coding
agent (Anthropic Claude) under the team's direction; all design authority rested
with the human team. Full credits: the **Credits** page in the game.

## License

Copyright (C) 2026 the POVODEŇ authors (RUR project, UJEP Ústí nad Labem).

This program is free software: you can redistribute it and/or modify it under the
terms of the **GNU Affero General Public License v3.0** (see [`LICENSE`](LICENSE)).
If you run a modified version on a server and let users interact with it there, the
AGPL requires you to offer those users the source of your modified version.
