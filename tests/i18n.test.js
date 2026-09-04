// Localization guarantees (TASK-005): the en/cs catalogs stay in 1:1 key
// parity with identical placeholder sets, no value is empty, every key the
// code references (statically or through a known dynamic family) exists in
// BOTH languages, and no catalog key is dead. A key added to only one
// language, or a placeholder renamed on one side, fails this suite — which is
// what keeps a Czech campaign free of silent English fallbacks.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, sep } from 'node:path';

import en from '../src/i18n/en.js';
import cs from '../src/i18n/cs.js';
import { t, setLang, getLang, plural, fmtEuro } from '../src/i18n.js';
import {
  MUNICIPALITIES, INVESTMENTS, CARDS, EVENTS, TIER, SEVERITY, PRODUCERS,
} from '../src/data/gameData.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOGS = { en, cs };

// --- parity -------------------------------------------------------------------

test('en and cs have exactly the same keys', () => {
  const enKeys = new Set(Object.keys(en));
  const csKeys = new Set(Object.keys(cs));
  const enOnly = [...enKeys].filter((k) => !csKeys.has(k));
  const csOnly = [...csKeys].filter((k) => !enKeys.has(k));
  assert.deepEqual(enOnly, [], `keys missing in cs.js: ${enOnly}`);
  assert.deepEqual(csOnly, [], `keys missing in en.js: ${csOnly}`);
});

test('placeholders match per key in both languages', () => {
  const tokens = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(en)) {
    if (!(key in cs)) continue; // parity test reports that
    assert.deepEqual(tokens(cs[key]), tokens(en[key]),
      `placeholders differ for '${key}': en=${tokens(en[key])} cs=${tokens(cs[key])}`);
  }
});

test('no catalog value is empty', () => {
  for (const [name, cat] of Object.entries(CATALOGS)) {
    for (const [key, val] of Object.entries(cat)) {
      assert.ok(String(val).trim().length > 0, `${name}: '${key}' is empty`);
    }
  }
});

// --- code ↔ catalog cross-check -------------------------------------------------

const I18N_FILE = join(ROOT, 'src', 'i18n.js');
const I18N_DIR = join(ROOT, 'src', 'i18n');

/**
 * All .js source files of the client (game code only, not tests/tools).
 * i18n.js and the catalogs under src/i18n/ are excluded: the loader documents
 * its API in prose (t('key', vars?)) and the catalogs are data, not call sites.
 * The exclusion is built with join()/sep so it also holds on Windows, where a
 * hardcoded '/' never matches a native path.
 */
function sourceFiles(dir = join(ROOT, 'src'), acc = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) sourceFiles(p, acc);
    else if (f.endsWith('.js') && p !== I18N_FILE && !p.startsWith(I18N_DIR + sep)) acc.push(p);
  }
  return acc;
}

const allSource = sourceFiles().map((p) => readFileSync(p, 'utf8')).join('\n');

/** Statically referenced keys: t('some.key') with no interpolation. */
const staticKeys = [...allSource.matchAll(/\bt\(\s*'([\w.]+)'/g)].map((m) => m[1]);

// The in-play coach (src/ui/coach.js) renders each step with t(`coach.${step.key}`),
// so its keys are never literals in the source. The step list is defined in
// GameScene.buildCoach; keep this in step with it, and adding a callout without
// both translations fails the cross-check below.
const COACH_STEPS = [
  'town', 'budget', 'invest', 'forecast', 'cards', 'end',
  'event', 'meeting', 'deal', 'ledger',
];

// Dynamic key families the code builds with template literals, enumerated
// from game data so that ADDING a card/event/trait/investment without its
// translations fails here.
function dynamicKeys() {
  const keys = [];
  const rewardKeys = ['cooperator', 'opportunist', 'reciprocator', 'grudge', 'freerider', 'default'];
  for (let s = SEVERITY.NONE; s <= SEVERITY.CATASTROPHIC; s++) keys.push(`sev.${s}`);
  for (const key of Object.keys(INVESTMENTS)) keys.push(`inv.${key}.name`, `inv.${key}.hint`);
  for (const c of CARDS) keys.push(`card.${c.id}.name`, `card.${c.id}.blurb`);
  for (const tier of Object.values(TIER)) keys.push(`tier.${tier}`);
  for (const e of EVENTS) keys.push(`event.${e.id}.name`, `event.${e.id}.desc`);
  for (const m of MUNICIPALITIES) keys.push(`trait.${m.trait}.name`, `trait.${m.trait}.desc`, `mayor.${m.id}.title`);
  for (const p of Object.values(PRODUCERS)) keys.push(`res.${p.res}`, `prod.dep.${p.res}`);
  for (const r of rewardKeys) keys.push(`deal.reward.${r}`);
  for (const rel of ['ally', 'neutral', 'rival']) keys.push(`rel.${rel}`);
  for (const step of COACH_STEPS) keys.push(`coach.${step}`);
  return keys;
}

test('every key the code references exists in both catalogs', () => {
  const missing = [];
  for (const key of [...new Set([...staticKeys, ...dynamicKeys()])]) {
    for (const [name, cat] of Object.entries(CATALOGS)) {
      if (!(key in cat)) missing.push(`${name}: ${key}`);
    }
  }
  assert.deepEqual(missing, [], `referenced keys missing from catalogs:\n${missing.join('\n')}`);
});

test('no catalog key is dead (unreferenced by code)', () => {
  // A key is referenced if it appears as a quoted literal anywhere in the code
  // (covers both t('key') and keys stored in variables/tables and translated
  // later), or belongs to an enumerated dynamic family, or to a family whose
  // members are picked at runtime (round number, page number, …).
  const dynamic = new Set(dynamicKeys());
  const dynamicPrefixes = ['advisor.', 'howto.', 'diagram.', 'score.', 'summary.cap.'];
  const dead = Object.keys(en).filter((k) =>
    !allSource.includes(`'${k}'`)
    && !dynamic.has(k)
    && !dynamicPrefixes.some((p) => k.startsWith(p)));
  assert.deepEqual(dead, [], `unused catalog keys (delete or wire up):\n${dead.join('\n')}`);
});

test('the coach step list stays in step with GameScene.buildCoach', () => {
  // COACH_STEPS is what makes the two checks above see coach.* keys at all, so
  // it must not silently drift from the scene that defines the callouts.
  const src = readFileSync(join(ROOT, 'src', 'scenes', 'GameScene.js'), 'utf8');
  const inCode = [...src.matchAll(/\{\s*key:\s*'(\w+)',\s*minRound:/g)].map((m) => m[1]);
  assert.deepEqual(inCode, COACH_STEPS,
    'COACH_STEPS differs from the steps in GameScene.buildCoach — add the new '
    + 'callout to both catalogs and list it here');
});

// --- runtime behaviour -----------------------------------------------------------

test('t() interpolates, falls back to English, then to the key itself', () => {
  const prev = getLang();
  try {
    setLang('cs');
    assert.notEqual(t('menu.start'), en['menu.start'], 'cs must not silently show English');
    assert.equal(t('definitely.not.a.key'), 'definitely.not.a.key');
  } finally {
    setLang(prev);
  }
});

test('language toggle persists via setLang and clamps unknown values', () => {
  const prev = getLang();
  try {
    setLang('de');
    assert.equal(getLang(), 'en', 'unknown languages clamp to en');
    setLang('cs');
    assert.equal(getLang(), 'cs');
  } finally {
    setLang(prev);
  }
});

test('shared formatters: euro amounts and Czech plural agreement', () => {
  assert.equal(fmtEuro(0), '€0');
  assert.equal(fmtEuro(123.4), '€123M');
  assert.equal(fmtEuro(1234), '€1.2bn');
  const prev = getLang();
  try {
    setLang('cs');
    assert.equal(plural(1, { one: 'oběť', few: 'oběti', many: 'obětí' }), 'oběť');
    assert.equal(plural(3, { one: 'oběť', few: 'oběti', many: 'obětí' }), 'oběti');
    assert.equal(plural(7, { one: 'oběť', few: 'oběti', many: 'obětí' }), 'obětí');
    setLang('en');
    assert.equal(plural(1, { one: 'life', other: 'lives' }), 'life');
    assert.equal(plural(2, { one: 'life', other: 'lives' }), 'lives');
  } finally {
    setLang(prev);
  }
});
