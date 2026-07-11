// =============================================================================
// Headless campaign runner (test helper)
// -----------------------------------------------------------------------------
// Replays the exact round loop GameScene drives — player policy, then AI
// mayors, then flood resolution, then round advance — but without Phaser, DOM
// or network. With a seeded RNG the whole 10-round campaign is reproducible,
// which is what the characterization tests (and future balance simulations)
// build on.
// =============================================================================

import {
  createGameState, resolveRound, advanceRound, regionalScore,
  PHASE, playerMuni, canInvest, purchase,
} from '../../src/model/gameState.js';
import { runAllAI } from '../../src/ai/mayorAI.js';
import { createSeededRng } from '../../src/model/rng.js';
import { MUNICIPALITIES, BALANCE } from '../../src/data/gameData.js';

/**
 * Deterministic self-protective player: one levee, keep a small fleet and kit
 * stock topped up, bank the rest. Enough to exercise purchases, scarcity caps
 * and the persistent-stock economy every round.
 */
export function defaultPolicy(gs) {
  const me = playerMuni(gs);
  let guard = 0;
  while (guard++ < 60) {
    if (me.leveesBuilt < 1 && canInvest(gs, 'levee', me.id)) {
      if (!purchase(gs, me.id, me.id, 'levee')) break;
      continue;
    }
    if (me.stock.boat < 3 && canInvest(gs, 'boat', me.id)) {
      if (!purchase(gs, me.id, me.id, 'boat')) break;
      continue;
    }
    if (me.stock.kit < 2 && canInvest(gs, 'kit', me.id)) {
      if (!purchase(gs, me.id, me.id, 'kit')) break;
      continue;
    }
    if (canInvest(gs, 'reserve', me.id)) {
      if (!purchase(gs, me.id, me.id, 'reserve')) break;
      continue;
    }
    break;
  }
}

/** Plain-data snapshot of one resolved round — safe to deep-compare via JSON. */
export function snapshot(gs) {
  return {
    round: gs.round,
    severity: gs.regionalSeverity,
    pc: gs.pc,
    research: gs.research,
    hand: [...gs.hand],
    relationship: { ...gs.relationship },
    munis: gs.munis.map((m) => ({
      id: m.id,
      budget: m.budget,
      banked: m.banked,
      morale: m.morale,
      levees: m.leveesBuilt,
      boats: m.stock.boat,
      kits: m.stock.kit,
      deaths: m.deathsTotal,
      saved: m.savedTotal,
      damage: m.damageTotal,
      destroyed: m.destroyed,
    })),
  };
}

/**
 * Model invariants that must hold after every resolved round, whatever the
 * seed. Returns a list of human-readable violations (empty = all good).
 */
export function invariantViolations(gs) {
  const v = [];
  const bad = (msg) => v.push(`round ${gs.round}: ${msg}`);

  const expectedOrder = MUNICIPALITIES.map((d) => d.id).join(',');
  const actualOrder = gs.munis.map((m) => m.id).join(',');
  if (actualOrder !== expectedOrder) bad(`municipality order changed: ${actualOrder}`);

  for (const m of gs.munis) {
    if (!(m.budget >= 0)) bad(`${m.id}: negative budget ${m.budget}`);
    if (!(m.banked >= 0)) bad(`${m.id}: negative banked ${m.banked}`);
    if (!(m.morale >= 0 && m.morale <= 100)) bad(`${m.id}: morale out of range ${m.morale}`);
    if (!(m.stock.boat >= 0)) bad(`${m.id}: negative boat stock ${m.stock.boat}`);
    if (!(m.stock.kit >= 0)) bad(`${m.id}: negative kit stock ${m.stock.kit}`);
    if (!(m.leveesBuilt >= 0)) bad(`${m.id}: negative levees ${m.leveesBuilt}`);
    if (!(m.deathsTotal >= 0)) bad(`${m.id}: negative deaths ${m.deathsTotal}`);
    if (!(m.deathsTotal <= m.population)) bad(`${m.id}: deaths ${m.deathsTotal} exceed population ${m.population}`);
    if (!(m.damageTotal >= 0)) bad(`${m.id}: negative damage ${m.damageTotal}`);
    if (!(m.savedTotal >= 0)) bad(`${m.id}: negative saved ${m.savedTotal}`);
  }
  for (const [id, rel] of Object.entries(gs.relationship)) {
    if (!(rel >= 0 && rel <= 100)) bad(`relationship with ${id} out of range: ${rel}`);
  }
  if (!(gs.pc >= 0)) bad(`negative political capital ${gs.pc}`);
  if (!(gs.hand.length <= BALANCE.handCap)) bad(`hand over cap: ${gs.hand.length}`);
  if (gs.lastResults) {
    for (const r of gs.lastResults) {
      if (!(r.deaths >= 0)) bad(`${r.id}: negative round deaths ${r.deaths}`);
      if (!(r.damage >= 0)) bad(`${r.id}: negative round damage ${r.damage}`);
      if (!(r.effSeverity >= 0 && r.effSeverity <= 4)) bad(`${r.id}: effSeverity out of range ${r.effSeverity}`);
    }
  }
  return v;
}

/**
 * Run a full campaign headless. Returns per-round snapshots, the final score
 * and the final game state. Deterministic for a given seed + policy.
 */
export function runCampaign({ seed = 1, playerMuniId = 'millington', policy = defaultPolicy, onRound } = {}) {
  const gs = createGameState(playerMuniId, createSeededRng(seed));
  const rounds = [];
  let guard = 0;
  while (gs.phase !== PHASE.GAMEOVER && guard++ < BALANCE.totalRounds + 5) {
    policy(gs);
    runAllAI(gs);
    resolveRound(gs);
    rounds.push(snapshot(gs));
    if (onRound) onRound(gs);
    advanceRound(gs);
  }
  return { gs, rounds, score: regionalScore(gs) };
}
