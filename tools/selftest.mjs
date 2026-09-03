#!/usr/bin/env node
// =============================================================================
// POVODEŇ — self-test. No dependencies, no build, no browser.
//
//   node tools/selftest.mjs
//
// Checks, in order:
//   1. SYNTAX  — every .js/.mjs under src/ and server/ parses.
//   2. I18N    — the `en` and `cs` tables hold exactly the same key set.
//   3. KEYS    — every literal key passed to t('…') / t(`…`) anywhere in src/
//                exists in the `en` table. Template keys that interpolate
//                (t(`inv.${k}.name`)) are checked by their literal prefix.
//
// Exits non-zero and prints the offending files/keys on any failure, so a
// deploy can gate on it. A tool without a test does not ship.
// =============================================================================

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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
// i18n.js reads localStorage at load (guarded by try/catch); stub it so the
// module behaves exactly as it does in a browser with storage available.
globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); },
};
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;

const I18N = join(ROOT, 'src', 'i18n.js');
let tables = null;
try {
  // The tables live in a module-private const, so append one test-only export
  // and import the result from memory. The file on disk is never modified.
  const src = readFileSync(I18N, 'utf8') + '\nexport const __TABLES__ = S;\n';
  const url = 'data:text/javascript;base64,' + Buffer.from(src, 'utf8').toString('base64');
  const mod = await import(url);
  tables = mod.__TABLES__;
  if (!tables || !tables.en || !tables.cs) throw new Error('en/cs tables not found');
} catch (e) {
  fail('I18N', `could not load ${rel(I18N)}: ${e.message}`);
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
// calls (t('key', vars?)) that are prose, not real lookups.
const RE_QUOTED = /(^|[^\w$.])t\(\s*(['"])((?:\\.|(?!\2)[^\\])*)\2/g;
const RE_TEMPLATE = /(^|[^\w$.])t\(\s*`([^`]*)`/g;
let checked = 0;
if (tables) {
  const prefixes = [...enKeys];
  for (const file of walk(join(ROOT, 'src'))) {
    if (file === I18N) continue;
    const code = readFileSync(file, 'utf8');
    let m;
    RE_QUOTED.lastIndex = 0;
    while ((m = RE_QUOTED.exec(code)) !== null) {
      const key = m[3];
      checked++;
      if (!enKeys.has(key)) fail('KEYS', `${rel(file)} → t('${key}') is not in the en table`);
    }
    RE_TEMPLATE.lastIndex = 0;
    while ((m = RE_TEMPLATE.exec(code)) !== null) {
      const raw = m[2];
      checked++;
      if (!raw.includes('${')) {
        if (!enKeys.has(raw)) fail('KEYS', `${rel(file)} → t(\`${raw}\`) is not in the en table`);
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
