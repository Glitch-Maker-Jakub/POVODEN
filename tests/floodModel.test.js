// Characterization tests for the flood model: the severity draw, the
// Lotka–Volterra rescue simulation, and the river coupling that carries the
// cooperation dilemma (levee deflection, Greenhaven absorption, Final Point
// burden, the Bayview toxic spill).

import test from 'node:test';
import assert from 'node:assert/strict';

import { drawRegionalSeverity, simulateRescue, resolveFlood } from '../src/model/floodModel.js';
import { MUNICIPALITIES, EXPOSURE, SEVERITY, BALANCE } from '../src/data/gameData.js';

/** Build resolveFlood input from the real municipality table. */
function towns(investById = {}, moraleById = {}) {
  return MUNICIPALITIES.map((def) => ({
    id: def.id,
    pos: def.pos,
    population: def.population,
    exposure: EXPOSURE[def.id],
    morale: moraleById[def.id] ?? 60,
    trait: def.trait,
    invest: { levee: 0, boat: 0, kit: 0, ...(investById[def.id] || {}) },
  }));
}

const byId = (results, id) => results.find((r) => r.id === id);

// --- drawRegionalSeverity -----------------------------------------------------

test('severity draw maps the unit interval onto the weight ladder', () => {
  const w = BALANCE.severityWeights;
  assert.equal(drawRegionalSeverity(() => 0), SEVERITY.NONE);
  assert.equal(drawRegionalSeverity(() => w[0]), SEVERITY.NONE, 'boundary belongs to the lower step');
  assert.equal(drawRegionalSeverity(() => w[0] + 0.0001), SEVERITY.MINOR);
  assert.equal(drawRegionalSeverity(() => 0.9999), SEVERITY.CATASTROPHIC);
  assert.equal(drawRegionalSeverity(() => 1), SEVERITY.CATASTROPHIC, 'u=1 falls through to the top step');
});

// --- simulateRescue -------------------------------------------------------------

test('no effective severity means no deaths', () => {
  const r = simulateRescue({ population: 20000, effSeverity: 0, boats: 0, kits: 0 });
  assert.deepEqual(r, { deaths: 0, saved: 0, atRisk: 0, deathRate: 0 });
});

test('rescue simulation is deterministic for identical inputs', () => {
  const args = { population: 20000, effSeverity: 3, boats: 2, kits: 1, noiseOffset: 6, morale: 60 };
  assert.deepEqual(simulateRescue(args), simulateRescue(args));
});

test('boats reduce deaths and register as lives saved', () => {
  const base = { population: 20000, effSeverity: 3, kits: 0, morale: 60 };
  const without = simulateRescue({ ...base, boats: 0 });
  const withBoats = simulateRescue({ ...base, boats: 5 });
  assert.ok(withBoats.deaths < without.deaths,
    `5 boats should cut deaths (${withBoats.deaths} vs ${without.deaths})`);
  assert.ok(withBoats.saved > 0, 'boats must register saved lives');
});

test('collapsed morale removes the baseline safety net (more deaths)', () => {
  const base = { population: 20000, effSeverity: 3, boats: 0, kits: 0 };
  const calm = simulateRescue({ ...base, morale: 100 });
  const chaos = simulateRescue({ ...base, morale: 0 });
  assert.ok(chaos.deaths > calm.deaths,
    `morale 0 should be deadlier than morale 100 (${chaos.deaths} vs ${calm.deaths})`);
});

test('deaths never exceed the population', () => {
  const r = simulateRescue({ population: 100, effSeverity: 4, boats: 0, kits: 0, morale: 0 });
  assert.ok(r.deaths >= 0 && r.deaths <= 100, `deaths out of bounds: ${r.deaths}`);
});

// --- resolveFlood: river coupling ----------------------------------------------

test('a calm season is genuinely calm: zero damage and deaths everywhere', () => {
  const results = resolveFlood(towns({ delta: { levee: 3 }, millington: { levee: 2 } }), SEVERITY.NONE);
  for (const r of results) {
    assert.equal(r.damage, 0, `${r.id}: damage in a calm season`);
    assert.equal(r.deaths, 0, `${r.id}: deaths in a calm season`);
    assert.equal(r.effSeverity, 0, `${r.id}: effective severity in a calm season`);
  }
});

test('results come back in input order, not river order', () => {
  const input = [...towns()].reverse();
  const results = resolveFlood(input, SEVERITY.MODERATE);
  assert.deepEqual(results.map((r) => r.id), input.map((m) => m.id));
});

test('a levee protects its own town', () => {
  const bare = byId(resolveFlood(towns(), SEVERITY.SEVERE), 'millington');
  const walled = byId(resolveFlood(towns({ millington: { levee: 1 } }), SEVERITY.SEVERE), 'millington');
  assert.equal(walled.effSeverity, bare.effSeverity - 1);
  assert.ok(walled.damage < bare.damage, `levee should cut damage (${walled.damage} vs ${bare.damage})`);
});

test('upstream levees deflect water onto downstream towns', () => {
  const base = byId(resolveFlood(towns(), SEVERITY.MODERATE), 'millington');
  const deflected = byId(resolveFlood(towns({ delta: { levee: 2 } }), SEVERITY.MODERATE), 'millington');
  assert.equal(base.effSeverity, SEVERITY.MODERATE);
  assert.equal(deflected.effSeverity, SEVERITY.MODERATE + 2 * BALANCE.leveeDeflection,
    'two upstream levees push leveeDeflection steps each onto the next town');
});

test('unleveed Greenhaven absorbs flow and spares the towns downstream', () => {
  const open = resolveFlood(towns({ delta: { levee: 2 } }), SEVERITY.MODERATE);
  const walled = resolveFlood(towns({ delta: { levee: 2 }, greenhaven: { levee: 1 } }), SEVERITY.MODERATE);
  assert.ok(byId(open, 'greenhaven').absorbed > 0, 'open floodplain must absorb');
  assert.equal(byId(walled, 'greenhaven').absorbed, 0, 'a leveed floodplain absorbs nothing');
  assert.ok(byId(open, 'traders').effSeverity < byId(walled, 'traders').effSeverity,
    'walling Greenhaven must worsen the flood downstream');
});

test('Final Point pays the cumulative burden when water arrives', () => {
  const fp = byId(resolveFlood(towns(), SEVERITY.MODERATE), 'finalpoint');
  assert.equal(fp.effSeverity, SEVERITY.MODERATE + BALANCE.cumulativeBurden);
});

test('a Bayview flood contaminates the towns downstream unless suppressed', () => {
  const spill = resolveFlood(towns(), SEVERITY.MODERATE);
  const inspected = resolveFlood(towns(), SEVERITY.MODERATE, { noToxic: true });
  for (const id of ['oceana', 'finalpoint']) {
    const extra = byId(spill, id).damage - byId(inspected, id).damage;
    assert.equal(extra, BALANCE.economic.toxicSpillDamage, `${id}: expected toxic cleanup damage`);
  }
  assert.equal(byId(spill, 'millington').damage, byId(inspected, 'millington').damage,
    'upstream towns are untouched by the spill');
});

test('even a minor flood destroys Oceana-class data assets', () => {
  const minor = byId(resolveFlood(towns(), SEVERITY.MINOR), 'oceana');
  const expectedBase = Math.round(EXPOSURE.oceana * BALANCE.economic.damageBySeverity[SEVERITY.MINOR]
    + EXPOSURE.oceana * BALANCE.economic.oceanaDataLoss);
  assert.equal(minor.damage, expectedBase, 'oceana damage must include the data-loss term');
});

test('temporary levees protect without deflecting downstream', () => {
  const temp = resolveFlood(towns(), SEVERITY.MODERATE, { tempLevee: { delta: 2 } });
  const perm = resolveFlood(towns({ delta: { levee: 2 } }), SEVERITY.MODERATE);
  assert.equal(byId(temp, 'delta').effSeverity, byId(perm, 'delta').effSeverity,
    'temporary levees protect their own town like permanent ones');
  assert.ok(byId(temp, 'millington').effSeverity < byId(perm, 'millington').effSeverity,
    'temporary levees must not push water downstream');
});

test('a solidarity pact pools and shares the signatories boats', () => {
  const input = towns({ millington: { boat: 6 } });
  const pact = ['millington', 'greenhaven', 'traders'];
  const shared = resolveFlood(input, SEVERITY.SEVERE, { pactTowns: pact });
  const alone = resolveFlood(input, SEVERITY.SEVERE);
  assert.ok(byId(shared, 'greenhaven').deaths <= byId(alone, 'greenhaven').deaths,
    'a pact member with no boats of its own must not be worse off');
  assert.ok(byId(shared, 'traders').saved >= byId(alone, 'traders').saved,
    'pooled boats should save lives in partner towns');
});

test('flood resolution is fully deterministic (no hidden randomness)', () => {
  const input = towns({ delta: { levee: 1 }, millington: { boat: 3, kit: 2 } });
  assert.deepEqual(
    resolveFlood(input, SEVERITY.SEVERE),
    resolveFlood(input, SEVERITY.SEVERE),
  );
});
