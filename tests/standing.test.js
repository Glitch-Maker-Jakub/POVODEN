// The private end-of-campaign standing (src/ui/newspaper.js): the bailout audit
// must lower the regional score the player sees.

import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };

const { createGameState, playCard, resolveRound, advanceRound, PHASE } = await import('../src/model/gameState.js');
const { createSeededRng } = await import('../src/model/rng.js');
const { cityStanding } = await import('../src/ui/newspaper.js');
const { BALANCE } = await import('../src/data/gameData.js');

function campaign(withBailout) {
  const gs = createGameState('millington', createSeededRng(4242));
  if (withBailout) {
    gs.hand[0] = 'bailout';                 // same seed; only the card differs
    assert.equal(playCard(gs, 'bailout', null), true);
  }
  // The first two seasons are calm: no flood damage, so the damage term is not capped.
  for (let i = 0; i < 2 && gs.phase !== PHASE.GAMEOVER; i++) { resolveRound(gs); advanceRound(gs); }
  return gs;
}

test('a campaign with the bailout played scores lower than the same campaign without it', () => {
  const without = campaign(false);
  const withB = campaign(true);
  assert.equal(withB.auditPenalty, BALANCE.bailoutScorePenalty);
  assert.ok(cityStanding(withB).score < cityStanding(without).score,
    `bailout ${cityStanding(withB).score} vs none ${cityStanding(without).score}`);
});
