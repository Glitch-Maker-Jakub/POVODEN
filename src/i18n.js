// =============================================================================
// Localization runtime (English / Czech). Call t('key', vars?) anywhere a UI
// string is needed. Language persists in localStorage and is chosen on the menu.
//
//   t('panel.budget', { n: 120 })  ->  "Budget: §120" / "Rozpočet: §120"
//
// The catalogs live in src/i18n/en.js and src/i18n/cs.js — one file per
// language, same keys, same {placeholder} sets. tests/i18n.test.js enforces
// parity in CI, so a key added to only one language fails the build.
//
// Data content (investments, cards, events, traits, severities, mayor titles)
// is keyed by id so gameplay code keeps English ids while the UI shows either
// language. Town and mayor NAMES are proper nouns and stay the same in both —
// a design decision, not a missing translation.
// Any missing key falls back to English, then to the key itself.
// =============================================================================

import en from './i18n/en.js';
import cs from './i18n/cs.js';

let lang = 'en';
try { lang = localStorage.getItem('povoden_lang') || 'en'; } catch (e) { /* no storage */ }

export function getLang() { return lang; }
export function setLang(l) {
  lang = l === 'cs' ? 'cs' : 'en';
  try { localStorage.setItem('povoden_lang', lang); } catch (e) { /* ignore */ }
}
export function toggleLang() { setLang(lang === 'en' ? 'cs' : 'en'); return lang; }

const S = { en, cs };

export function t(key, vars) {
  let s = (S[lang] && S[lang][key]) || S.en[key] || key;
  if (vars) {
    s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  }
  return s;
}

// --- Shared formatting helpers ------------------------------------------------
// One place for money and plural agreement, so the HUD, the map pops and the
// newspaper all print amounts the same way.

/** €M amounts as the game displays them: €0, €123M, €1.2bn. */
export function fmtEuro(m) {
  if (!m || m < 1) return '€0';
  return m >= 1000 ? `€${(m / 1000).toFixed(1)}bn` : `€${Math.round(m)}M`;
}

const PLURAL_RULES = { en: new Intl.PluralRules('en'), cs: new Intl.PluralRules('cs') };

/**
 * Pick the plural form for the CURRENT language. `forms` may provide
 * { one, few, many, other } — Czech uses one/few/many, English one/other;
 * missing categories fall back to the nearest sensible one.
 */
export function plural(n, forms) {
  const cat = PLURAL_RULES[lang].select(n);
  return forms[cat] ?? forms.other ?? forms.many ?? forms.few ?? forms.one;
}
