// Full-campaign tests: seeded reproducibility (the guarantee every future
// refactor is checked against) and model invariants that must survive whole
// campaigns for any municipality.

import test from 'node:test';
import assert from 'node:assert/strict';

import { runCampaign, invariantViolations } from './helpers/campaign.js';
import { PHASE } from '../src/model/gameState.js';
import { MUNICIPALITIES, BALANCE } from '../src/data/gameData.js';

test('two campaigns with the same seed are identical, round by round', () => {
  const a = runCampaign({ seed: 12345 });
  const b = runCampaign({ seed: 12345 });
  assert.deepEqual(a.rounds, b.rounds, 'per-round snapshots must match exactly');
  assert.deepEqual(a.score, b.score, 'final scores must match exactly');
});

test('different seeds produce different campaigns', () => {
  const a = runCampaign({ seed: 1 });
  const b = runCampaign({ seed: 2 });
  assert.notEqual(JSON.stringify(a.rounds), JSON.stringify(b.rounds));
});

test('a campaign runs exactly the configured number of rounds and ends', () => {
  const { gs, rounds } = runCampaign({ seed: 7 });
  assert.equal(rounds.length, BALANCE.totalRounds);
  assert.equal(gs.phase, PHASE.GAMEOVER);
});

test('the first two rounds of any campaign are calm', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const { rounds } = runCampaign({ seed });
    assert.equal(rounds[0].severity, 0, `seed ${seed}: round 1 not calm`);
    assert.equal(rounds[1].severity, 0, `seed ${seed}: round 2 not calm`);
  }
});

test('model invariants hold after every round, for several seeds', () => {
  for (const seed of [1, 2, 3, 11, 99]) {
    runCampaign({
      seed,
      onRound: (gs) => {
        const violations = invariantViolations(gs);
        assert.deepEqual(violations, [], `seed ${seed}: ${violations.join('; ')}`);
      },
    });
  }
});

test('every one of the seven municipalities can play a full campaign', () => {
  for (const def of MUNICIPALITIES) {
    const { gs } = runCampaign({
      seed: 7,
      playerMuniId: def.id,
      onRound: (s) => {
        const violations = invariantViolations(s);
        assert.deepEqual(violations, [], `playing as ${def.id}: ${violations.join('; ')}`);
      },
    });
    assert.equal(gs.phase, PHASE.GAMEOVER, `playing as ${def.id}: campaign did not finish`);
  }
});

test('cumulative damage and deaths never decrease across rounds', () => {
  const { rounds } = runCampaign({ seed: 3 });
  for (let i = 1; i < rounds.length; i++) {
    for (let m = 0; m < rounds[i].munis.length; m++) {
      const prev = rounds[i - 1].munis[m];
      const cur = rounds[i].munis[m];
      assert.ok(cur.damage >= prev.damage, `${cur.id}: damage decreased in round ${rounds[i].round}`);
      assert.ok(cur.deaths >= prev.deaths, `${cur.id}: deaths decreased in round ${rounds[i].round}`);
    }
  }
});
