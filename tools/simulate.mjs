#!/usr/bin/env node
// =============================================================================
// Headless balance simulator (TASK-009)
// -----------------------------------------------------------------------------
// Replays full campaigns over the domain model — no Phaser, no DOM, no network
// — for every municipality under a set of named player strategies, on the SAME
// seeds, so differences between rows are differences in strategy, not luck.
//
//   node tools/simulate.mjs                         # print Markdown to stdout
//   node tools/simulate.mjs --seeds 60 --out docs/balance/baseline.md
//
// The report compares strategies, measures the marginal value of each
// investment type (ablation) and each power card (played whenever drawn), and
// probes the sensitivity of outcomes to the main balance constants. It changes
// NO game rules: target intervals and any constant changes are design
// decisions to be made with the team, using this data.
// =============================================================================

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import {
  createGameState, PHASE, playerMuni, muniById,
  purchase, canInvest, resolveRound, advanceRound, regionalScore,
  acceptProposal, declineProposal, canPlayCard, playCard,
} from '../src/model/gameState.js';
import { runAllAI } from '../src/ai/mayorAI.js';
import { createSeededRng } from '../src/model/rng.js';
import { drawRegionalSeverity } from '../src/model/floodModel.js';
import {
  MUNICIPALITIES, BALANCE, CARDS, CARD_BY_ID, SEVERITY_LABELS,
} from '../src/data/gameData.js';

// --- CLI ----------------------------------------------------------------------

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const SEEDS = Number(arg('seeds', 40));
const SENS_SEEDS = Math.min(SEEDS, 20);
const OUT = arg('out', null);

// --- Player strategies ----------------------------------------------------------
// Each strategy acts once per PREP phase through the same public API the UI
// uses. All randomness comes from gs.rng, so a (strategy, town, seed) triple is
// fully reproducible.

const downstreamOf = (gs, id) => {
  const me = muniById(gs, id);
  return gs.munis
    .filter((m) => m.def.pos > me.def.pos && !m.destroyed)
    .sort((a, b) => a.def.pos - b.def.pos)[0] || null;
};

const buy = (gs, targetId, type) =>
  canInvest(gs, type, targetId) && purchase(gs, gs.playerMuniId, targetId, type);

/** Do nothing at all — the reference agent (baseline emergency response only). */
function passive() {}

/** Wall up, hoard, never help, decline every deal. */
function selfish(gs) {
  const me = playerMuni(gs);
  gs.proposals.forEach((p) => declineProposal(gs, p.id));
  let guard = 0;
  while (guard++ < 40) {
    if (me.leveesBuilt < 2 && buy(gs, me.id, 'levee')) continue;
    if (me.stock.boat < 2 && buy(gs, me.id, 'boat')) continue;
    if (buy(gs, me.id, 'reserve')) continue;
    break;
  }
}

/** Protect yourself modestly, honour deals, arm the neighbour downstream. */
function cooperative(gs, stats, skip = new Set()) {
  const me = playerMuni(gs);
  for (const p of gs.proposals) {
    if (p.accepted === null) acceptProposal(gs, p.id);
    if (p.accepted && !skip.has(p.askInv) && buy(gs, p.from, p.askInv)) stats.coopActions += 1;
  }
  if (!skip.has('levee') && me.def.trait !== 'absorptive' && me.leveesBuilt < 1) buy(gs, me.id, 'levee');
  const down = downstreamOf(gs, me.id);
  let guard = 0;
  while (guard++ < 40) {
    if (!skip.has('boat') && me.stock.boat < 3 && buy(gs, me.id, 'boat')) continue;
    if (!skip.has('boat') && down && muniById(gs, down.id).stock.boat < 2 && buy(gs, down.id, 'boat')) {
      stats.coopActions += 1; continue;
    }
    if (!skip.has('kit') && me.stock.kit < 2 && buy(gs, me.id, 'kit')) continue;
    if (!skip.has('fun') && me.morale < 45 && buy(gs, me.id, 'fun')) continue;
    if (!skip.has('reserve') && buy(gs, me.id, 'reserve')) continue;
    break;
  }
}

/** Levees and nothing but levees; the historical status-quo caricature. */
function floodwall(gs) {
  const me = playerMuni(gs);
  let guard = 0;
  while (guard++ < 40) {
    if (me.leveesBuilt < 3 && buy(gs, me.id, 'levee')) continue;
    if (buy(gs, me.id, 'reserve')) continue;
    break;
  }
}

/** Boats and kits first, no walls: pure life-saving posture. */
function rescueFirst(gs) {
  const me = playerMuni(gs);
  let guard = 0;
  while (guard++ < 40) {
    if (me.stock.boat < 5 && buy(gs, me.id, 'boat')) continue;
    if (me.stock.kit < 4 && buy(gs, me.id, 'kit')) continue;
    if (me.morale < 50 && buy(gs, me.id, 'fun')) continue;
    if (buy(gs, me.id, 'reserve')) continue;
    break;
  }
}

/** Uniformly random affordable actions (uses gs.rng — reproducible). */
function randomPolicy(gs) {
  const types = ['levee', 'boat', 'kit', 'fun', 'reserve'];
  for (let n = 0; n < 6; n++) {
    const type = types[Math.floor(gs.rng() * types.length)];
    const town = gs.munis[Math.floor(gs.rng() * gs.munis.length)];
    const target = type === 'reserve' ? gs.playerMuniId : town.id;
    if (canInvest(gs, type, target)) purchase(gs, gs.playerMuniId, target, type);
  }
}

export const STRATEGIES = {
  passive,
  selfish,
  cooperative: (gs, stats) => cooperative(gs, stats),
  floodwall,
  'rescue-first': rescueFirst,
  random: randomPolicy,
};

/** cooperative, but one investment type is never bought (ablation). */
const coopWithout = (type) => (gs, stats) => cooperative(gs, stats, new Set([type]));

/** cooperative, plus: play the given card whenever it is drawn and playable. */
const coopWithCard = (cardId) => (gs, stats) => {
  const card = CARD_BY_ID[cardId];
  const target = card.target === 'choose' ? gs.playerMuniId : null;
  if (canPlayCard(gs, cardId, target) && playCard(gs, cardId, target)) stats.cardPlays += 1;
  cooperative(gs, stats);
};

// --- Campaign runner --------------------------------------------------------------

function runCampaign(seed, playerMuniId, policy) {
  const gs = createGameState(playerMuniId, createSeededRng(seed));
  const stats = { coopActions: 0, cardPlays: 0 };
  const severities = [];
  let guard = 0;
  while (gs.phase !== PHASE.GAMEOVER && guard++ < BALANCE.totalRounds + 5) {
    policy(gs, stats);
    runAllAI(gs);
    resolveRound(gs);
    severities.push(gs.regionalSeverity);
    advanceRound(gs);
  }
  const score = regionalScore(gs);
  const me = playerMuni(gs);
  return {
    score, stats, severities,
    own: { deaths: me.deathsTotal, damage: me.damageTotal, morale: me.morale },
    destroyed: gs.munis.filter((m) => m.destroyed).map((m) => m.id),
  };
}

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sem = (a) => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1) / a.length);
};
const fmt = (v, d = 1) => v.toFixed(d);
const signed = (v, d = 1) => `${v >= 0 ? '+' : ''}${fmt(v, d)}`;

/** Aggregate one (policy, town) cell over all seeds. */
function cell(policy, townId, seeds) {
  const runs = [];
  for (let s = 1; s <= seeds; s++) runs.push(runCampaign(s, townId, policy));
  return {
    regionalDeaths: mean(runs.map((r) => r.score.totalDeaths)),
    regionalDamage: mean(runs.map((r) => r.score.totalDamage)),
    ownDeaths: mean(runs.map((r) => r.own.deaths)),
    ownDamage: mean(runs.map((r) => r.own.damage)),
    avgMorale: mean(runs.map((r) => r.score.avgMorale)),
    destroyed: mean(runs.map((r) => r.score.destroyed)),
    coopActions: mean(runs.map((r) => r.stats.coopActions)),
    cardPlays: mean(runs.map((r) => r.stats.cardPlays)),
    // Per-run series in (seed) order — kept so variants can be compared PAIRED
    // (same town, same seed), which cancels most of the flood-draw variance.
    runDeaths: runs.map((r) => r.score.totalDeaths),
    runDamage: runs.map((r) => r.score.totalDamage),
  };
}

/** Aggregate a policy across all seven playable municipalities. */
function policyRow(policy, seeds) {
  const perTown = {};
  for (const m of MUNICIPALITIES) perTown[m.id] = cell(policy, m.id, seeds);
  const towns = Object.values(perTown);
  const agg = {};
  for (const k of ['regionalDeaths', 'regionalDamage', 'ownDeaths', 'ownDamage', 'avgMorale', 'destroyed', 'coopActions', 'cardPlays']) {
    agg[k] = mean(towns.map((t) => t[k]));
  }
  agg.deathsSem = sem(towns.flatMap((t) => t.runDeaths));
  return { perTown, agg };
}

/** Paired per-(town, seed) difference of a variant against a base row. */
function pairedDelta(variant, base, key) {
  const diffs = [];
  for (const m of MUNICIPALITIES) {
    const a = variant.perTown[m.id][key];
    const b = base.perTown[m.id][key];
    for (let i = 0; i < a.length; i++) diffs.push(a[i] - b[i]);
  }
  return { mean: mean(diffs), sem: sem(diffs) };
}

// --- Report sections -----------------------------------------------------------------

function severityDrawSection() {
  const rng = createSeededRng('severity-check');
  const n = 100000;
  const counts = [0, 0, 0, 0, 0];
  for (let i = 0; i < n; i++) counts[drawRegionalSeverity(rng)] += 1;
  const lines = ['| Severity | Configured | Observed (100k draws) |', '|---|---:|---:|'];
  for (let s = 0; s < 5; s++) {
    lines.push(`| ${SEVERITY_LABELS[s]} | ${(BALANCE.severityWeights[s] * 100).toFixed(1)} % | ${(counts[s] / n * 100).toFixed(1)} % |`);
  }
  return lines.join('\n');
}

function strategyMatrix(rows) {
  const townCols = MUNICIPALITIES.map((m) => m.def?.name || m.name);
  const lines = [
    `| Strategy | ${townCols.join(' | ')} | mean |`,
    `|---|${'---:|'.repeat(townCols.length + 1)}`,
  ];
  for (const [name, row] of Object.entries(rows)) {
    const cells = MUNICIPALITIES.map((m) => fmt(row.perTown[m.id].regionalDeaths));
    lines.push(`| ${name} | ${cells.join(' | ')} | **${fmt(row.agg.regionalDeaths)}** |`);
  }
  return lines.join('\n');
}

function strategySummary(rows) {
  const lines = [
    '| Strategy | Regional deaths (±SEM) | Regional damage €M | Own deaths | Own damage €M | Avg morale | Towns lost | Coop acts/campaign |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const [name, { agg }] of Object.entries(rows)) {
    lines.push(`| ${name} | ${fmt(agg.regionalDeaths)} ± ${fmt(agg.deathsSem)} | ${fmt(agg.regionalDamage, 0)} | ${fmt(agg.ownDeaths)} | ${fmt(agg.ownDamage, 0)} | ${fmt(agg.avgMorale, 0)} | ${fmt(agg.destroyed, 2)} | ${fmt(agg.coopActions)} |`);
  }
  return lines.join('\n');
}

function ablationSection(base, seeds) {
  const lines = [
    '| Investment removed | Δ regional deaths (paired ±SEM) | Δ regional damage €M (paired ±SEM) |',
    '|---|---:|---:|',
  ];
  for (const type of ['levee', 'boat', 'kit', 'fun', 'reserve']) {
    const row = policyRow(coopWithout(type), seeds);
    const dd = pairedDelta(row, base, 'runDeaths');
    const dg = pairedDelta(row, base, 'runDamage');
    lines.push(`| no ${type} | ${signed(dd.mean)} ± ${fmt(dd.sem)} | ${signed(dg.mean, 0)} ± ${fmt(dg.sem, 0)} |`);
  }
  return lines.join('\n');
}

function cardSection(base, seeds) {
  const lines = [
    '| Card (tier) | Plays/campaign | Δ regional deaths (paired ±SEM) | Δ regional damage €M (paired ±SEM) |',
    '|---|---:|---:|---:|',
  ];
  for (const c of CARDS) {
    const row = policyRow(coopWithCard(c.id), seeds);
    const dd = pairedDelta(row, base, 'runDeaths');
    const dg = pairedDelta(row, base, 'runDamage');
    lines.push(`| ${c.name} (${c.tier}) | ${fmt(row.agg.cardPlays, 2)} | ${signed(dd.mean)} ± ${fmt(dd.sem)} | ${signed(dg.mean, 0)} ± ${fmt(dg.sem, 0)} |`);
  }
  return lines.join('\n');
}

function sensitivitySection(base) {
  // Temporarily patch a balance constant, re-run the cooperative row, restore.
  const KNOBS = [
    { label: 'leveeDeflection', get: () => BALANCE.leveeDeflection, set: (v) => { BALANCE.leveeDeflection = v; } },
    { label: 'absorptionRelief', get: () => BALANCE.absorptionRelief, set: (v) => { BALANCE.absorptionRelief = v; } },
    { label: 'lv.baselineRescueFrac', get: () => BALANCE.lv.baselineRescueFrac, set: (v) => { BALANCE.lv.baselineRescueFrac = v; } },
    { label: 'lv.boatAmplitude', get: () => BALANCE.lv.boatAmplitude, set: (v) => { BALANCE.lv.boatAmplitude = v; } },
  ];
  const lines = [
    '| Constant | ×0.8 → Δ deaths / Δ damage | ×1.2 → Δ deaths / Δ damage |',
    '|---|---:|---:|',
  ];
  const baseRef = policyRow((gs, stats) => cooperative(gs, stats), SENS_SEEDS).agg;
  for (const knob of KNOBS) {
    const orig = knob.get();
    const deltas = [];
    for (const mult of [0.8, 1.2]) {
      knob.set(orig * mult);
      try {
        const { agg } = policyRow((gs, stats) => cooperative(gs, stats), SENS_SEEDS);
        deltas.push(`${agg.regionalDeaths - baseRef.regionalDeaths >= 0 ? '+' : ''}${fmt(agg.regionalDeaths - baseRef.regionalDeaths)} / ${agg.regionalDamage - baseRef.regionalDamage >= 0 ? '+' : ''}${fmt(agg.regionalDamage - baseRef.regionalDamage, 0)}`);
      } finally {
        knob.set(orig);
      }
    }
    lines.push(`| ${knob.label} (=${orig}) | ${deltas[0]} | ${deltas[1]} |`);
  }
  return lines.join('\n');
}

function observations(rows) {
  const out = [];
  const byDeaths = Object.entries(rows).sort((a, b) => a[1].agg.regionalDeaths - b[1].agg.regionalDeaths);
  const byDamage = Object.entries(rows).sort((a, b) => a[1].agg.regionalDamage - b[1].agg.regionalDamage);
  out.push(`Fewest regional deaths: **${byDeaths[0][0]}** (${fmt(byDeaths[0][1].agg.regionalDeaths)}); most: **${byDeaths.at(-1)[0]}** (${fmt(byDeaths.at(-1)[1].agg.regionalDeaths)}).`);
  out.push(`Least regional damage: **${byDamage[0][0]}** (€${fmt(byDamage[0][1].agg.regionalDamage, 0)}M); most: **${byDamage.at(-1)[0]}** (€${fmt(byDamage.at(-1)[1].agg.regionalDamage, 0)}M).`);
  const dd = pairedDelta(rows.cooperative, rows.selfish, 'runDeaths');
  const dg = pairedDelta(rows.cooperative, rows.selfish, 'runDamage');
  const verdict = dd.mean < 0 && dg.mean < 0
    ? 'cooperative beats selfish on both regional deaths and damage'
    : 'cooperative does NOT dominate selfish under these strategy definitions — a finding for the design team, not a rule change made here';
  out.push(`Design thesis check (paired, cooperative − selfish): Δ deaths ${signed(dd.mean)} ± ${fmt(dd.sem)}, Δ damage €${signed(dg.mean, 0)} ± ${fmt(dg.sem, 0)}M — ${verdict}.`);
  const towns = MUNICIPALITIES.map((m) => [m.name, mean(Object.values(rows).map((r) => r.perTown[m.id].regionalDeaths))]);
  towns.sort((a, b) => a[1] - b[1]);
  out.push(`Easiest seat (regional deaths, mean over strategies): **${towns[0][0]}** (${fmt(towns[0][1])}); hardest: **${towns.at(-1)[0]}** (${fmt(towns.at(-1)[1])}).`);
  return out.map((s) => `- ${s}`).join('\n');
}

// --- Main ------------------------------------------------------------------------------

function main() {
  const t0 = Date.now();
  const rows = {};
  for (const [name, policy] of Object.entries(STRATEGIES)) rows[name] = policyRow(policy, SEEDS);

  const report = `# POVODEŇ — balance simulation report

Generated by \`node tools/simulate.mjs --seeds ${SEEDS}\` on ${new Date().toISOString().slice(0, 10)}.
Every cell replays full 10-round campaigns over seeds 1..${SEEDS} for each of the
seven municipalities — identical seeds across strategies, so rows are directly
comparable. This report proposes no rule changes; target intervals are a design
decision for the team.

## Severity draw sanity check

${severityDrawSection()}

## Strategy × municipality — mean regional deaths per campaign

${strategyMatrix(rows)}

## Strategy summary (mean over all towns and seeds)

${strategySummary(rows)}

## Marginal value of each investment (ablation from *cooperative*)

Positive Δ = removing the investment makes outcomes worse (the investment helps).

${ablationSection(rows.cooperative, SEEDS)}

## Marginal value of each power card (played whenever drawn, on top of *cooperative*)

Plays/campaign reflects real draw rates (rarer tiers unlock via research and are
drawn less often, so their estimates are noisier). Caveat: these configs play
ONLY the measured card, so the four-card hand silts up with commons and
research-gated cards may never be drawn at all (0.00 plays) — reading a rare
card's true value needs a dedicated card-playing policy, not this screen.

${cardSection(rows.cooperative, SEEDS)}

## Sensitivity of the *cooperative* row to key constants (±20 %, ${SENS_SEEDS} seeds)

${sensitivitySection(rows)}

## Observations (computed from the tables above)

${observations(rows)}
`;

  if (OUT) {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, report);
    console.log(`written ${OUT} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } else {
    console.log(report);
    console.error(`\n(${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
}

// Run only when executed directly (`node tools/simulate.mjs`), not on import.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
