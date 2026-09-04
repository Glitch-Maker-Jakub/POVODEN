# Domain model architecture

The game model is pure JavaScript — no Phaser, no DOM, no network. Scenes and
the AI import **only** `src/model/gameState.js` (the public façade); the
domain internals live in sibling modules and may be reorganised freely behind
it. `tests/architecture.test.js` enforces both rules (façade-only imports,
acyclic module graph) in CI.

## Module map

```
gameState.js   public façade: createGameState() + re-exports of everything below
├── state.js       PHASE constants, initPending(), selectors, relationship clamp
├── events.js      typed domain events (model writes no user-facing text)
├── economy.js     investments, scarcity surcharges/caps, purchase()
├── diplomacy.js   agendas, deals, favours, Regional Meeting
├── cards.js       hand economy, tier unlocks (effects in cardEffects.js)
├── round.js       forecast, regional events, resolveRound(), advanceRound()
├── scoring.js     regionalScore()
├── cardEffects.js card -> state mutations (self-contained)
├── floodModel.js  severity draw + river coupling + Lotka–Volterra rescue
├── zetaNoise.js   deterministic ζ-gap noise for the rescue model
└── rng.js         seeded RNG (mulberry32) + shuffle
```

Import graph is a DAG: `state.js`/`events.js` sit at the bottom;
`round.js` is the only module that composes the others; nothing imports
`gameState.js` internally.

## State machine

```
createGameState()
      │
      ▼
   PREP ──resolveRound()──► SUMMARY ──advanceRound()──► PREP   (rounds 2..10)
                                │
                                └─ advanceRound() when round == totalRounds
                                                  ──► GAMEOVER (terminal)
```

- **PREP** — the only phase in which `purchase`, `playCard`, `sharpenForecast`,
  `holdMeeting`, `askFavour` and proposal responses are legal (each checks it).
- **FLOOD** exists as a constant for the UI's animation phase; the model itself
  transitions PREP → SUMMARY atomically inside `resolveRound()`.
- **SUMMARY** — read-only for the model; the UI shows the newspaper.
- **GAMEOVER** — terminal; `advanceRound()` is idempotent there.

The season's severity is **pre-drawn** in `startRoundEnvironment()` (so the
forecast can hint at it) and consumed by `resolveRound()`. Rounds 1–2 are
forced calm (learning on-ramp). Regional events may shift the pre-drawn
severity, budgets or per-round flags.

## Field ownership & lifetime

**Per campaign** (created once in `createGameState`, never reset):
`playerMuniId`, `munis[].def/id/population/exposure`, `agendas`, `relationship`
(evolves, never reset), cumulative `deathsTotal/savedTotal/damageTotal`,
`destroyed`, `research`, `auditPenalty`, `log`, `eventDeck` (reshuffled when
exhausted), `hand` (persists under `handCap`).

**Per round** (reset **only** in `advanceRound()` — the centralised reset):
`pending` (all flood modifiers, via `initPending()`), `notifications`,
`proposals` (regenerated), `favoursAsked`, `scarceBought`,
`playerContribThisRound`, `scheduledRewards` (paid out then emptied),
`meetingHeld`, `eventFlags`, `forecastLevel`, `upcomingSeverity`,
`currentEvent`, `pc` (recomputed with the cooperation dividend), `munis[].budget`
(recomputed from base − economic penalty + banked − debt), `banked`, `audited`.

**Derived per flood** (written by `resolveRound()`, read by the UI):
`regionalSeverity`, `lastResults`, `economicPenalty`, `scarce`,
`oceanaJustLost`, `coopDividendApplied`.

## Domain events

The model never builds user-facing sentences. Round happenings are pushed to
`gs.notifications` as typed events (`events.js`):

| Event | Payload | Emitted by |
|---|---|---|
| `boats_sent` | `townId`, `boats` | AI reciprocity (`mayorAI.js`) |
| `favour_answered` | `townId`, `boats` | `askFavour()` |
| `deal_kept` | `townId` | `resolveProposals()` |
| `deal_broken` | `townId` | `resolveProposals()` |

Consumers aggregate through the predicates (`boatHelpEvents`, `boatsWereSent`,
`betrayalEvents`): the press reaction in `resolveRound()`, the newspaper
paragraphs and the cooperation photo choice. Localisation happens entirely in
the view layer.

## Reproducibility contract

All randomness flows through `gs.rng` (injected in `createGameState`). The
**order of rng consumption is part of the public contract**: any refactor must
leave a seeded campaign bit-identical (see `tests/campaign.test.js`; the
TASK-004 split was verified against 40 pre-refactor golden campaigns).
