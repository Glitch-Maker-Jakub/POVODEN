// Validates the hand-tuned data tables in gameData.js: unique IDs, complete
// cross-references, well-formed balance arrays. A failure names the exact
// offending ID/field so a data edit can be fixed without spelunking.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MUNICIPALITIES, EXPOSURE, INVESTMENTS, INVESTMENT_ORDER, INVEST_RESOURCE,
  PRODUCERS, CARDS, CARD_BY_ID, TIER, TIER_UNLOCK, TIER_COLOR,
  MAYORS, AGENDAS, EVENTS, RELATIONSHIP, BALANCE,
  SEVERITY, SEVERITY_LABELS, SEVERITY_COLORS,
} from '../src/data/gameData.js';
import { applyCardEffect } from '../src/model/cardEffects.js';
import { createGameState } from '../src/model/gameState.js';
import { createSeededRng } from '../src/model/rng.js';

const MUNI_IDS = MUNICIPALITIES.map((m) => m.id);

test('municipalities have unique ids and river positions 1..7', () => {
  assert.equal(new Set(MUNI_IDS).size, MUNICIPALITIES.length, 'duplicate municipality id');
  const positions = MUNICIPALITIES.map((m) => m.pos).sort((a, b) => a - b);
  assert.deepEqual(positions, [1, 2, 3, 4, 5, 6, 7], 'positions must be exactly 1..7');
});

test('every municipality has complete, sane fields', () => {
  for (const m of MUNICIPALITIES) {
    assert.ok(m.name, `municipality ${m.id}: missing name`);
    assert.ok(m.trait, `municipality ${m.id}: missing trait`);
    assert.ok(m.traitName, `municipality ${m.id}: missing traitName`);
    assert.ok(m.traitDesc, `municipality ${m.id}: missing traitDesc`);
    assert.ok(m.population > 0, `municipality ${m.id}: population must be positive`);
    assert.ok(m.baseBudget > 0, `municipality ${m.id}: baseBudget must be positive`);
    assert.equal(typeof m.color, 'number', `municipality ${m.id}: color must be a number`);
  }
});

test('EXPOSURE covers exactly the seven municipalities with positive values', () => {
  assert.deepEqual(Object.keys(EXPOSURE).sort(), [...MUNI_IDS].sort());
  for (const [id, val] of Object.entries(EXPOSURE)) {
    assert.ok(val > 0, `EXPOSURE.${id} must be positive, got ${val}`);
  }
});

test('INVESTMENT_ORDER matches the INVESTMENTS table', () => {
  assert.deepEqual([...INVESTMENT_ORDER].sort(), Object.keys(INVESTMENTS).sort());
  for (const [key, inv] of Object.entries(INVESTMENTS)) {
    assert.equal(inv.key, key, `INVESTMENTS.${key}: key field mismatch (${inv.key})`);
    assert.ok(inv.cost > 0, `INVESTMENTS.${key}: cost must be positive`);
    assert.ok(inv.name, `INVESTMENTS.${key}: missing name`);
  }
});

test('production chains reference real cities, investments and resources', () => {
  const producedResources = new Set(Object.values(PRODUCERS).map((p) => p.res));
  for (const [cityId, p] of Object.entries(PRODUCERS)) {
    assert.ok(MUNI_IDS.includes(cityId), `PRODUCERS: unknown city ${cityId}`);
    assert.ok(p.res, `PRODUCERS.${cityId}: missing resource`);
    if (p.gate && p.gate !== 'forecast') {
      assert.ok(INVESTMENTS[p.gate], `PRODUCERS.${cityId}: gate '${p.gate}' is not an investment`);
    }
  }
  for (const [item, res] of Object.entries(INVEST_RESOURCE)) {
    assert.ok(INVESTMENTS[item], `INVEST_RESOURCE: unknown investment '${item}'`);
    assert.ok(producedResources.has(res), `INVEST_RESOURCE.${item}: no producer makes '${res}'`);
  }
});

test('cards have unique ids, known tiers and known target types', () => {
  const ids = CARDS.map((c) => c.id);
  assert.equal(new Set(ids).size, CARDS.length, `duplicate card id in ${ids}`);
  const tiers = new Set(Object.values(TIER));
  const targets = new Set(['self', 'choose', 'downstream', 'upstream', 'none', 'pact']);
  for (const c of CARDS) {
    assert.ok(tiers.has(c.tier), `card ${c.id}: unknown tier '${c.tier}'`);
    assert.ok(targets.has(c.target), `card ${c.id}: unknown target '${c.target}'`);
    assert.ok(c.name, `card ${c.id}: missing name`);
    assert.ok(c.blurb, `card ${c.id}: missing blurb`);
  }
  assert.deepEqual(Object.keys(CARD_BY_ID).sort(), [...ids].sort(), 'CARD_BY_ID out of sync with CARDS');
});

test('every card tier has an unlock threshold, draw weight and colour', () => {
  for (const c of CARDS) {
    assert.ok(TIER_UNLOCK[c.tier] != null, `card ${c.id}: tier '${c.tier}' missing in TIER_UNLOCK`);
    assert.ok(BALANCE.tierWeights[c.tier] != null, `card ${c.id}: tier '${c.tier}' missing in tierWeights`);
    assert.ok(TIER_COLOR[c.tier] != null, `card ${c.id}: tier '${c.tier}' missing in TIER_COLOR`);
  }
});

test('every card in the deck has an implemented effect', () => {
  for (const c of CARDS) {
    const gs = createGameState('millington', createSeededRng(1));
    const applied = applyCardEffect(gs, c, 'greenhaven');
    assert.equal(applied, true, `card ${c.id}: no effect implementation`);
  }
});

test('every municipality has a mayor; agendas have unique ids', () => {
  assert.deepEqual(Object.keys(MAYORS).sort(), [...MUNI_IDS].sort());
  for (const [id, m] of Object.entries(MAYORS)) {
    assert.ok(m.name, `MAYORS.${id}: missing name`);
  }
  const agendaIds = AGENDAS.map((a) => a.id);
  assert.equal(new Set(agendaIds).size, AGENDAS.length, `duplicate agenda id in ${agendaIds}`);
});

test('event deck has unique ids, apply functions and the calm opener', () => {
  const ids = EVENTS.map((e) => e.id);
  assert.equal(new Set(ids).size, EVENTS.length, `duplicate event id in ${ids}`);
  for (const e of EVENTS) {
    assert.ok(e.name && e.desc, `event ${e.id}: missing name/desc`);
    assert.equal(typeof e.apply, 'function', `event ${e.id}: apply must be a function`);
  }
  // Round 1 forces the 'calm' event — it must exist.
  assert.ok(ids.includes('calm'), "event deck must contain 'calm' (forced in round 1)");
});

test('severity tables all cover the five severity levels', () => {
  assert.equal(SEVERITY_LABELS.length, 5);
  assert.equal(SEVERITY_COLORS.length, 5);
  assert.equal(BALANCE.economic.damageBySeverity.length, 5, 'economic.damageBySeverity');
  assert.equal(BALANCE.lv.atRiskBySeverity.length, 5, 'lv.atRiskBySeverity');
  assert.equal(BALANCE.lv.lethalityBySeverity.length, 5, 'lv.lethalityBySeverity');
  assert.equal(BALANCE.attrition.boat.length, 5, 'attrition.boat');
  assert.equal(BALANCE.attrition.kit.length, 5, 'attrition.kit');
});

test('severity draw weights cover 0..4 and sum to 1', () => {
  let sum = 0;
  for (let s = SEVERITY.NONE; s <= SEVERITY.CATASTROPHIC; s++) {
    const w = BALANCE.severityWeights[s];
    assert.ok(w != null && w >= 0, `severityWeights[${s}] missing or negative`);
    sum += w;
  }
  assert.ok(Math.abs(sum - 1) < 1e-9, `severityWeights sum to ${sum}, expected 1`);
});

test('severity-indexed tables are monotonically non-decreasing', () => {
  const tables = {
    'economic.damageBySeverity': BALANCE.economic.damageBySeverity,
    'lv.atRiskBySeverity': BALANCE.lv.atRiskBySeverity,
    'lv.lethalityBySeverity': BALANCE.lv.lethalityBySeverity,
    'attrition.boat': BALANCE.attrition.boat,
    'attrition.kit': BALANCE.attrition.kit,
  };
  for (const [name, arr] of Object.entries(tables)) {
    for (let i = 1; i < arr.length; i++) {
      assert.ok(arr[i] >= arr[i - 1], `${name}[${i}] (${arr[i]}) < ${name}[${i - 1}] (${arr[i - 1]})`);
    }
  }
});

test('relationship thresholds are ordered within 0..100', () => {
  assert.ok(RELATIONSHIP.rivalAt < RELATIONSHIP.allyAt, 'rivalAt must be below allyAt');
  assert.ok(RELATIONSHIP.start >= 0 && RELATIONSHIP.start <= 100, 'start out of range');
});
