// Smoke tests for the balance simulator's building blocks: the strategies act
// only through the public game API and a (strategy, town, seed) triple must be
// fully reproducible.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createGameState, PHASE, resolveRound, advanceRound, regionalScore, playerMuni,
} from '../src/model/gameState.js';
import { runAllAI } from '../src/ai/mayorAI.js';
import { createSeededRng } from '../src/model/rng.js';
import { BALANCE } from '../src/data/gameData.js';
import { invariantViolations } from './helpers/campaign.js';
import { STRATEGIES } from '../tools/simulate.mjs';

function run(seed, townId, policy) {
  const gs = createGameState(townId, createSeededRng(seed));
  const stats = { coopActions: 0, cardPlays: 0 };
  let guard = 0;
  while (gs.phase !== PHASE.GAMEOVER && guard++ < BALANCE.totalRounds + 5) {
    policy(gs, stats);
    runAllAI(gs);
    resolveRound(gs);
    const violations = invariantViolations(gs);
    assert.deepEqual(violations, [], violations.join('; '));
    advanceRound(gs);
  }
  return { score: regionalScore(gs), own: playerMuni(gs).deathsTotal, stats };
}

test('every named strategy finishes a campaign and keeps the invariants', () => {
  for (const [name, policy] of Object.entries(STRATEGIES)) {
    const r = run(5, 'millington', policy);
    assert.ok(r.score.totalDamage >= 0, `${name}: negative damage`);
  }
});

test('a (strategy, town, seed) triple is fully reproducible', () => {
  for (const name of ['cooperative', 'selfish', 'random']) {
    const a = run(9, 'bayview', STRATEGIES[name]);
    const b = run(9, 'bayview', STRATEGIES[name]);
    assert.deepEqual(a, b, `${name}: same seed diverged`);
  }
});

test('the cooperative strategy actually cooperates; selfish never does', () => {
  const coop = run(3, 'millington', STRATEGIES.cooperative);
  const self = run(3, 'millington', STRATEGIES.selfish);
  assert.ok(coop.stats.coopActions > 0, 'cooperative made no cooperative purchases');
  assert.equal(self.stats.coopActions, 0);
});
