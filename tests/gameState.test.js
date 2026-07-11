// Characterization tests for the round/phase machine: purchases, political
// capital, scarcity, forecast, meetings, deals, favours, round reset and the
// campaign end.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createGameState, PHASE, playerMuni, muniById,
  purchase, canInvest, investmentCost, scarcityMult,
  sharpenForecast, canSharpenForecast, forecastBand, oceanaLost,
  holdMeeting, meetingAffordable, isRevealed,
  acceptProposal, declineProposal, askFavour, canAskFavour,
  resolveRound, advanceRound, regionalScore, adjustRelationship,
} from '../src/model/gameState.js';
import { createSeededRng } from '../src/model/rng.js';
import { MUNICIPALITIES, INVESTMENTS, BALANCE, RELATIONSHIP, SEVERITY } from '../src/data/gameData.js';

const newGame = (seed = 42, player = 'millington') => createGameState(player, createSeededRng(seed));

// --- Initial state --------------------------------------------------------------

test('a new game starts in PREP, round 1, with the seven towns in river order', () => {
  const gs = newGame();
  assert.equal(gs.phase, PHASE.PREP);
  assert.equal(gs.round, 1);
  assert.deepEqual(gs.munis.map((m) => m.id), MUNICIPALITIES.map((m) => m.id));
  assert.equal(playerMuni(gs).id, 'millington');
  assert.equal(gs.pc, BALANCE.politicalCapital);
  assert.equal(gs.hand.length, BALANCE.initialHand);
});

test('every AI mayor starts neutral and carries a hidden agenda', () => {
  const gs = newGame();
  const ai = gs.munis.filter((m) => !m.isPlayer);
  for (const m of ai) {
    assert.equal(gs.relationship[m.id], RELATIONSHIP.start, `relationship with ${m.id}`);
    assert.ok(gs.agendas[m.id], `agenda missing for ${m.id}`);
  }
  assert.equal(gs.relationship[gs.playerMuniId], undefined, 'no relationship with yourself');
});

test('the first two rounds are forced calm (learning on-ramp)', () => {
  const gs = newGame();
  assert.equal(gs.upcomingSeverity, SEVERITY.NONE, 'round 1 must be calm');
  resolveRound(gs);
  advanceRound(gs);
  assert.equal(gs.round, 2);
  assert.equal(gs.upcomingSeverity, SEVERITY.NONE, 'round 2 must be calm');
});

// --- Purchases & political capital ------------------------------------------------

test('buying a levee for your own town costs budget, not political capital', () => {
  const gs = newGame();
  const me = playerMuni(gs);
  const budget = me.budget;
  assert.equal(purchase(gs, me.id, me.id, 'levee'), true);
  assert.equal(me.leveesBuilt, 1);
  assert.equal(me.budget, budget - INVESTMENTS.levee.cost);
  assert.equal(gs.pc, BALANCE.politicalCapital, 'own-town investment is free of capital');
});

test('investing in a neighbour costs political capital and builds the relationship', () => {
  const gs = newGame();
  const me = playerMuni(gs);
  const moraleBefore = me.morale;
  assert.equal(purchase(gs, me.id, 'greenhaven', 'boat'), true);
  assert.equal(gs.pc, BALANCE.politicalCapital - BALANCE.coopPcCost);
  assert.equal(gs.relationship.greenhaven, RELATIONSHIP.start + RELATIONSHIP.coopGain);
  assert.equal(me.morale, moraleBefore + BALANCE.coopVote, 'voters approve of helping');
  assert.equal(gs.cooperatedThisRound, true);
  assert.equal(muniById(gs, 'greenhaven').stock.boat, 1);
});

test('with no political capital left you can still help yourself, not others', () => {
  const gs = newGame();
  const me = playerMuni(gs);
  purchase(gs, me.id, 'greenhaven', 'kit');
  purchase(gs, me.id, 'delta', 'kit');
  assert.equal(gs.pc, 0);
  assert.equal(canInvest(gs, 'kit', 'greenhaven'), false, 'no capital -> no cooperation');
  assert.equal(canInvest(gs, 'kit', me.id), true, 'own town stays free');
});

test('player reserves earn interest but cost approval', () => {
  const gs = newGame();
  const me = playerMuni(gs);
  const budget = me.budget;
  const morale = me.morale;
  purchase(gs, me.id, me.id, 'reserve');
  assert.equal(me.budget, budget - INVESTMENTS.reserve.cost);
  assert.equal(me.banked, Math.round(INVESTMENTS.reserve.cost * BALANCE.reserveInterest));
  assert.equal(me.morale, morale - BALANCE.reserveMoraleCost);
});

test('a celebration lifts morale but leaves people exposed this round', () => {
  const gs = newGame();
  const me = playerMuni(gs);
  const morale = me.morale;
  purchase(gs, me.id, me.id, 'fun');
  assert.equal(me.morale, Math.min(100, morale + BALANCE.funMorale));
  assert.equal(gs.pending.atRiskMult[me.id], BALANCE.funRisk);
});

test('purchases are rejected outside the preparation phase', () => {
  const gs = newGame();
  resolveRound(gs);
  assert.equal(gs.phase, PHASE.SUMMARY);
  assert.equal(purchase(gs, gs.playerMuniId, gs.playerMuniId, 'boat'), false);
  assert.equal(canInvest(gs, 'boat', gs.playerMuniId), false);
});

// --- Scarcity ---------------------------------------------------------------------

test('a strained resource makes its gated item cost more; a cut resource, even more', () => {
  const gs = newGame();
  assert.equal(investmentCost(gs, 'levee', gs.playerMuniId), INVESTMENTS.levee.cost);
  gs.scarce = { concrete: 'strained' };
  assert.equal(scarcityMult(gs, 'levee'), BALANCE.scarcity.surcharge);
  assert.equal(investmentCost(gs, 'levee', gs.playerMuniId),
    Math.round(INVESTMENTS.levee.cost * BALANCE.scarcity.surcharge));
  gs.scarce = { concrete: 'cut' };
  assert.equal(investmentCost(gs, 'levee', gs.playerMuniId),
    Math.round(INVESTMENTS.levee.cost * BALANCE.scarcity.cutSurcharge));
});

test('scarce items are capped per round for the player', () => {
  const gs = newGame();
  gs.scarce = { plastic: 'strained' };
  const me = playerMuni(gs);
  for (let i = 0; i < BALANCE.scarcity.cap; i++) {
    assert.equal(purchase(gs, me.id, me.id, 'boat'), true, `purchase ${i + 1} within the cap`);
  }
  assert.equal(canInvest(gs, 'boat', me.id), false, 'cap reached');
  assert.equal(purchase(gs, me.id, me.id, 'boat'), false);
});

// --- Forecast & meeting --------------------------------------------------------------

test('paying to sharpen the forecast narrows the band to the truth', () => {
  const gs = newGame();
  const me = playerMuni(gs);
  const w0 = forecastBand(gs);
  assert.equal(w0.high - w0.low <= 2 * BALANCE.forecast.maxLevel, true);
  const budget = me.budget;
  assert.equal(sharpenForecast(gs), true);
  assert.equal(me.budget, budget - BALANCE.forecast.sharpenCost);
  assert.equal(sharpenForecast(gs), true);
  const band = forecastBand(gs);
  assert.equal(band.exact, true);
  assert.equal(band.low, gs.upcomingSeverity);
  assert.equal(band.high, gs.upcomingSeverity);
  assert.equal(canSharpenForecast(gs), false, 'nothing left to sharpen');
});

test('losing Oceana blinds the forecast', () => {
  const gs = newGame();
  muniById(gs, 'oceana').destroyed = true;
  assert.equal(oceanaLost(gs), true);
  assert.deepEqual(forecastBand(gs), { low: 0, high: 4, exact: false, blind: true });
  assert.equal(canSharpenForecast(gs), false);
});

test('a regional meeting costs budget and reveals every neighbour for the round', () => {
  const gs = newGame();
  const me = playerMuni(gs);
  assert.equal(isRevealed(gs, 'delta'), false);
  assert.equal(meetingAffordable(gs), true);
  const budget = me.budget;
  assert.equal(holdMeeting(gs), true);
  assert.equal(me.budget, budget - BALANCE.meetingCost);
  assert.equal(isRevealed(gs, 'delta'), true);
  assert.equal(holdMeeting(gs), false, 'one meeting per round');
});

// --- Deals & favours -----------------------------------------------------------------

function plantProposal(gs, from = 'greenhaven', askInv = 'levee') {
  gs.proposals = [{
    id: `p${gs.round}_${from}`, from, askInv,
    reward: { boats: 2 }, rewardKey: 'cooperator', accepted: null, text: '',
  }];
  return gs.proposals[0];
}

test('an accepted and honoured deal builds trust and pays out next round', () => {
  const gs = newGame();
  const p = plantProposal(gs);
  acceptProposal(gs, p.id);
  purchase(gs, gs.playerMuniId, 'greenhaven', 'levee'); // fund what was asked
  const relAfterCoop = gs.relationship.greenhaven;
  resolveRound(gs);
  assert.equal(gs.relationship.greenhaven, relAfterCoop + RELATIONSHIP.dealKept);
  assert.deepEqual(gs.scheduledRewards, [{ boats: 2 }]);
  const boats = playerMuni(gs).stock.boat;
  advanceRound(gs);
  assert.equal(playerMuni(gs).stock.boat, boats + 2, 'promised boats arrive next round');
});

test('an accepted but unfunded deal is a betrayal', () => {
  const gs = newGame();
  const p = plantProposal(gs);
  acceptProposal(gs, p.id);
  resolveRound(gs);
  assert.equal(gs.relationship.greenhaven, RELATIONSHIP.start - RELATIONSHIP.dealBroken);
  assert.deepEqual(gs.scheduledRewards, []);
});

test('declining costs a little trust; ignoring costs half of that', () => {
  const declined = newGame();
  const p1 = plantProposal(declined);
  declineProposal(declined, p1.id);
  assert.equal(declined.relationship.greenhaven, RELATIONSHIP.start - RELATIONSHIP.declineLoss);

  const ignored = newGame();
  plantProposal(ignored);
  resolveRound(ignored);
  assert.equal(ignored.relationship.greenhaven,
    RELATIONSHIP.start - Math.round(RELATIONSHIP.declineLoss / 2));
});

test('a favour converts built-up trust into boats, once per town per round', () => {
  const gs = newGame();
  gs.relationship.delta = 60;
  assert.equal(canAskFavour(gs, 'delta'), true);
  const boats = playerMuni(gs).stock.boat;
  const pc = gs.pc;
  assert.equal(askFavour(gs, 'delta'), true);
  assert.equal(playerMuni(gs).stock.boat, boats + BALANCE.favour.boats);
  assert.equal(gs.pc, pc - BALANCE.favour.pcCost);
  assert.equal(gs.relationship.delta, 60 - BALANCE.favour.relCost);
  assert.equal(canAskFavour(gs, 'delta'), false, 'already asked this round');
});

test('relationships clamp to 0..100', () => {
  const gs = newGame();
  adjustRelationship(gs, 'delta', +999);
  assert.equal(gs.relationship.delta, 100);
  adjustRelationship(gs, 'delta', -999);
  assert.equal(gs.relationship.delta, 0);
});

// --- Round lifecycle -------------------------------------------------------------------

test('resolve moves PREP to SUMMARY and logs the round', () => {
  const gs = newGame();
  const results = resolveRound(gs);
  assert.equal(gs.phase, PHASE.SUMMARY);
  assert.equal(results.length, MUNICIPALITIES.length);
  assert.equal(gs.log.length, 1);
  assert.equal(gs.log[0].round, 1);
});

test('advancing a round resets the per-round state', () => {
  const gs = newGame();
  purchase(gs, gs.playerMuniId, gs.playerMuniId, 'reserve');
  holdMeeting(gs);
  gs.pending.tempLevee.delta = 1;
  resolveRound(gs);
  advanceRound(gs);
  assert.equal(gs.round, 2);
  assert.equal(gs.phase, PHASE.PREP);
  assert.deepEqual(gs.pending.tempLevee, {}, 'pending effects cleared');
  assert.equal(gs.meetingHeld, false);
  assert.deepEqual(gs.notifications, []);
  assert.deepEqual(gs.favoursAsked, {});
  assert.deepEqual(gs.scarceBought, {});
  assert.equal(playerMuni(gs).banked, 0, 'bank paid out into the new budget');
});

test('cooperating this round pays a political-capital dividend next round', () => {
  const coop = newGame();
  purchase(coop, coop.playerMuniId, 'greenhaven', 'kit');
  resolveRound(coop);
  advanceRound(coop);
  assert.equal(coop.pc, BALANCE.politicalCapital + BALANCE.coopDividend);

  const selfish = newGame();
  resolveRound(selfish);
  advanceRound(selfish);
  assert.equal(selfish.pc, BALANCE.politicalCapital);
});

test('the campaign ends after the final round', () => {
  const gs = newGame();
  for (let round = 1; round <= BALANCE.totalRounds; round++) {
    assert.equal(gs.phase, PHASE.PREP, `round ${round} should start in PREP`);
    resolveRound(gs);
    assert.equal(gs.phase, PHASE.SUMMARY);
    advanceRound(gs);
  }
  assert.equal(gs.phase, PHASE.GAMEOVER);
  assert.equal(gs.round, BALANCE.totalRounds, 'the round counter stops at the last round');
});

test('the regional score aggregates the whole map plus audit penalties', () => {
  const gs = newGame();
  gs.auditPenalty = 250;
  const score = regionalScore(gs);
  assert.equal(score.totalDeaths, 0);
  assert.equal(score.auditPenalty, 250);
  assert.equal(score.totalDamage, 250, 'audit penalty counts as damage');
  assert.ok(score.avgMorale >= 0 && score.avgMorale <= 100);
});
