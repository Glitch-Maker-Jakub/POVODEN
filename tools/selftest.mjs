#!/usr/bin/env node
// =============================================================================
// POVODEŇ — self-test. No dependencies, no build, no browser.
//
//   node tools/selftest.mjs
//
// Checks, in order:
//   1. SYNTAX  — every .js/.mjs under src/ and server/ parses.
//   2. I18N    — the `en` and `cs` catalogs (src/i18n/en.js, src/i18n/cs.js)
//                hold exactly the same key set.
//   3. KEYS    — every literal key passed to t('…') / t(`…`) anywhere in src/
//                exists in the `en` catalog. Template keys that interpolate
//                (t(`inv.${k}.name`)) are checked by their literal prefix.
//
// Exits non-zero and prints the offending files/keys on any failure, so a
// deploy can gate on it. A tool without a test does not ship.
// =============================================================================

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const rel = (p) => relative(ROOT, p).split(sep).join('/');

const failures = [];
const fail = (section, msg) => failures.push(`[${section}] ${msg}`);

// --- helpers -----------------------------------------------------------------
function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch (e) { return out; }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(js|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

// --- 1. syntax ---------------------------------------------------------------
const sources = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'server'))];
if (!sources.length) fail('SYNTAX', 'no source files found under src/ or server/');

for (const file of sources) {
  let r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) {
    // Older node parses a bare .js as CommonJS — retry explicitly as a module.
    const r2 = spawnSync(process.execPath, ['--input-type=module', '--check'],
      { encoding: 'utf8', input: readFileSync(file, 'utf8') });
    if (r2.status !== 0) {
      fail('SYNTAX', `${rel(file)}\n${(r.stderr || r2.stderr || '').trim()}`);
    }
  }
}

// --- 2 & 3. i18n -------------------------------------------------------------
// Anything under src/ is browser code and may read localStorage at load time
// (i18n.js does, guarded by try/catch); stub it so an imported module behaves
// exactly as it does in a browser with storage available.
globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); },
};
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;

// The catalogs are one plain default-export module per language; i18n.js only
// wires them together (const S = { en, cs }), so read the two files directly
// instead of reaching into a module-private const.
const I18N = join(ROOT, 'src', 'i18n.js');
const I18N_DIR = join(ROOT, 'src', 'i18n');
let tables = null;
try {
  const [en, cs] = await Promise.all(['en', 'cs'].map(async (l) =>
    (await import(pathToFileURL(join(I18N_DIR, `${l}.js`)).href)).default));
  if (!en || !cs) throw new Error('en/cs catalogs have no default export');
  tables = { en, cs };
} catch (e) {
  fail('I18N', `could not load the catalogs under ${rel(I18N_DIR)}: ${e.message}`);
}

let enKeys = new Set();
if (tables) {
  enKeys = new Set(Object.keys(tables.en));
  const csKeys = new Set(Object.keys(tables.cs));
  const missingCs = [...enKeys].filter((k) => !csKeys.has(k));
  const missingEn = [...csKeys].filter((k) => !enKeys.has(k));
  if (missingCs.length) fail('I18N', `missing in cs (${missingCs.length}): ${missingCs.join(', ')}`);
  if (missingEn.length) fail('I18N', `missing in en (${missingEn.length}): ${missingEn.join(', ')}`);
  for (const k of enKeys) {
    if (typeof tables.en[k] !== 'string') fail('I18N', `en.${k} is not a string`);
    if (csKeys.has(k) && typeof tables.cs[k] !== 'string') fail('I18N', `cs.${k} is not a string`);
  }
}

// --- 3. every t('…') key used in the code exists ------------------------------
// i18n.js itself is skipped: its header comment documents the API with example
// calls (t('key', vars?)) that are prose, not real lookups. The catalogs under
// src/i18n/ are skipped for the same reason — they are data, not call sites.
const RE_QUOTED = /(^|[^\w$.])t\(\s*(['"])((?:\\.|(?!\2)[^\\])*)\2/g;
const RE_TEMPLATE = /(^|[^\w$.])t\(\s*`([^`]*)`/g;
let checked = 0;
if (tables) {
  const prefixes = [...enKeys];
  for (const file of walk(join(ROOT, 'src'))) {
    if (file === I18N || file.startsWith(I18N_DIR + sep)) continue;
    const code = readFileSync(file, 'utf8');
    let m;
    RE_QUOTED.lastIndex = 0;
    while ((m = RE_QUOTED.exec(code)) !== null) {
      const key = m[3];
      checked++;
      if (!enKeys.has(key)) fail('KEYS', `${rel(file)} → t('${key}') is not in the en catalog`);
    }
    RE_TEMPLATE.lastIndex = 0;
    while ((m = RE_TEMPLATE.exec(code)) !== null) {
      const raw = m[2];
      checked++;
      if (!raw.includes('${')) {
        if (!enKeys.has(raw)) fail('KEYS', `${rel(file)} → t(\`${raw}\`) is not in the en catalog`);
        continue;
      }
      const prefix = raw.slice(0, raw.indexOf('${'));
      if (!prefix) continue;   // fully dynamic key — nothing static to verify
      if (!prefixes.some((k) => k.startsWith(prefix))) {
        fail('KEYS', `${rel(file)} → no en key starts with "${prefix}" (from t(\`${raw}\`))`);
      }
    }
  }
}

// --- report -------------------------------------------------------------------
if (failures.length) {
  console.error('\nSELFTEST FAILED\n');
  for (const f of failures) console.error('  ' + f);
  console.error(`\n${failures.length} problem(s).\n`);
  process.exit(1);
}
console.log(`PASS · ${sources.length} files parse · ${enKeys.size} i18n keys in en+cs · ${checked} t() call sites verified`);
