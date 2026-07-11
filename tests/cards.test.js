// Characterization tests for the power-card system: dealing, tier unlocks,
// hand cap, political-capital gating, and each card's documented effect.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createGameState, playerMuni, muniById,
  unlockedTiers, dealCards, canPlayCard, playCard, regionalScore,
} from '../src/model/gameState.js';
import { createSeededRng } from '../src/model/rng.js';
import { CARD_BY_ID, BALANCE, RELATIONSHIP } from '../src/data/gameData.js';

const newGame = (seed = 42, player = 'millington') => createGameState(player, createSeededRng(seed));

/** Put exactly these cards in hand with full political capital. */
function withHand(gs, ...cardIds) {
  gs.hand = [...cardIds];
  gs.pc = BALANCE.politicalCapital;
  return gs;
}

// --- Dealing & gating ---------------------------------------------------------

test('the starting hand holds only common cards (no research yet)', () => {
  const gs = newGame();
  assert.equal(gs.hand.length, BALANCE.initialHand);
  for (const id of gs.hand) {
    assert.equal(CARD_BY_ID[id].tier, 'common', `card ${id} should not be dealt at research 0`);
  }
});

test('research unlocks card tiers at the documented thresholds', () => {
  const gs = newGame();
  gs.research = 0;
  assert.deepEqual(unlockedTiers(gs), ['common']);
  gs.research = 2;
  assert.deepEqual(unlockedTiers(gs).sort(), ['common', 'uncommon']);
  gs.research = 4;
  assert.deepEqual(unlockedTiers(gs).sort(), ['common', 'rare', 'uncommon']);
});

test('the hand never grows past the cap', () => {
  const gs = newGame();
  withHand(gs, 'sandbag', 'volunteer', 'drill', 'decree');
  dealCards(gs, 3);
  assert.equal(gs.hand.length, BALANCE.handCap);
});

test('playing a card needs the PREP phase, capital, and the card in hand', () => {
  const gs = newGame();
  withHand(gs, 'drill');
  assert.equal(canPlayCard(gs, 'sandbag', null), false, 'not in hand');
  gs.pc = 0;
  assert.equal(canPlayCard(gs, 'drill', null), false, 'no political capital');
  gs.pc = 2;
  assert.equal(canPlayCard(gs, 'drill', null), true);
});

test('playing a card consumes capital and discards it from hand', () => {
  const gs = newGame();
  withHand(gs, 'drill');
  assert.equal(playCard(gs, 'drill', null), true);
  assert.deepEqual(gs.hand, []);
  assert.equal(gs.pc, BALANCE.politicalCapital - BALANCE.cardPcCost);
  assert.equal(playCard(gs, 'drill', null), false, 'cannot play a spent card');
});

// --- Individual card effects ------------------------------------------------------

test('Sandbag Brigade: a one-round levee at the target, and they appreciate it', () => {
  const gs = newGame();
  withHand(gs, 'sandbag');
  playCard(gs, 'sandbag', 'greenhaven');
  assert.equal(gs.pending.tempLevee.greenhaven, 1);
  assert.equal(gs.relationship.greenhaven, RELATIONSHIP.start + RELATIONSHIP.cardGain);
});

test('Volunteer Call: doubled boat effectiveness at a morale price', () => {
  const gs = newGame();
  withHand(gs, 'volunteer');
  const morale = playerMuni(gs).morale;
  playCard(gs, 'volunteer', null);
  assert.equal(gs.pending.boatMult.millington, 2);
  assert.equal(playerMuni(gs).morale, morale - 15);
});

test('Public Drill: morale up and a free kit', () => {
  const gs = newGame();
  withHand(gs, 'drill');
  const morale = playerMuni(gs).morale;
  playCard(gs, 'drill', null);
  assert.equal(playerMuni(gs).morale, Math.min(100, morale + 18));
  assert.equal(playerMuni(gs).stock.kit, 1);
});

test('Emergency Decree: budget now, approval later', () => {
  const gs = newGame();
  withHand(gs, 'decree');
  const budget = playerMuni(gs).budget;
  const morale = playerMuni(gs).morale;
  playCard(gs, 'decree', null);
  assert.equal(playerMuni(gs).budget, budget + 30);
  assert.equal(playerMuni(gs).morale, morale - 8);
});

test('Resilience Grant: permanent levees for you and two downstream neighbours', () => {
  const gs = newGame();
  withHand(gs, 'grant');
  playCard(gs, 'grant', null);
  assert.equal(playerMuni(gs).leveesBuilt, 1);
  assert.equal(muniById(gs, 'greenhaven').leveesBuilt, 1);
  assert.equal(muniById(gs, 'traders').leveesBuilt, 1);
  assert.equal(muniById(gs, 'bayview').leveesBuilt, 0, 'only the two nearest downstream');
});

test('Evacuation Order: halved exposure, at a morale and budget cost', () => {
  const gs = newGame();
  withHand(gs, 'evac');
  const budget = playerMuni(gs).budget;
  const morale = playerMuni(gs).morale;
  playCard(gs, 'evac', null);
  assert.equal(gs.pending.atRiskMult.millington, 0.5);
  assert.equal(playerMuni(gs).morale, morale - 10);
  assert.equal(playerMuni(gs).budget, budget - 20);
});

test('Solidarity Pact: you and two downstream towns pool boats this round', () => {
  const gs = newGame();
  withHand(gs, 'pact');
  playCard(gs, 'pact', null);
  assert.deepEqual(gs.pending.pactTowns, ['millington', 'greenhaven', 'traders']);
});

test('Bailout: cash now, an audit on the final score later', () => {
  const gs = newGame();
  withHand(gs, 'bailout');
  const budget = playerMuni(gs).budget;
  playCard(gs, 'bailout', null);
  assert.equal(playerMuni(gs).budget, budget + 120);
  assert.equal(gs.auditPenalty, BALANCE.bailoutScorePenalty);
  assert.equal(regionalScore(gs).totalDamage, BALANCE.bailoutScorePenalty);
});

test('Upstream Diversion: shove the flood back and burn the bridge', () => {
  const gs = newGame();
  withHand(gs, 'diversion');
  const morale = playerMuni(gs).morale;
  playCard(gs, 'diversion', null);
  assert.equal(gs.pending.sevMod.millington, -2);
  assert.equal(gs.pending.sevMod.delta, +2, 'the nearest upstream neighbour takes the water');
  assert.equal(gs.relationship.delta, RELATIONSHIP.start - RELATIONSHIP.diversionLoss);
  assert.equal(playerMuni(gs).morale, morale - 15);
  assert.equal(gs.goodwillBonus, -0.2, 'the whole region cools toward you');
});

test('Upstream Diversion is unplayable at the headwaters (no one upstream)', () => {
  const gs = newGame(42, 'delta');
  withHand(gs, 'diversion');
  assert.equal(canPlayCard(gs, 'diversion', null), false);
});
