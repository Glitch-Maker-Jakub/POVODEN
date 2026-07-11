// =============================================================================
// POVODEŇ — Round lifecycle: environment, forecast, flood resolution, advance
// -----------------------------------------------------------------------------
// Owns the PREP -> SUMMARY -> PREP/GAMEOVER progression: pre-drawing the
// season's flood, the regional event deck, the payable forecast band, the
// flood resolution (delegated to floodModel) with its economic/political
// consequences, and the centralised per-round reset in advanceRound().
// =============================================================================

import { BALANCE, SEVERITY, EVENTS, PRODUCERS } from '../data/gameData.js';
import { drawRegionalSeverity, resolveFlood } from './floodModel.js';
import { PHASE, initPending, muniById, playerMuni, oceanaLost } from './state.js';
import { boatsWereSent, betrayalEvents } from './events.js';
import { resolveProposals, generateProposals } from './diplomacy.js';
import { dealCards } from './cards.js';
import { shuffle } from './rng.js';

// --- Forecast & events (per-round environment) -------------------------------

export function startRoundEnvironment(gs) {
  gs.forecastLevel = 0;
  gs.eventFlags = {};
  gs.upcomingSeverity = drawRegionalSeverity(gs.rng); // hidden; revealed via forecast

  if (!gs.eventDeck.length) gs.eventDeck = shuffle([...EVENTS], gs.rng);
  let ev = gs.eventDeck.pop();
  if (gs.round <= 1) ev = EVENTS.find((e) => e.id === 'calm') || ev; // quiet first week
  gs.currentEvent = { id: ev.id, name: ev.name, desc: ev.desc };
  ev.apply(gs); // may shift upcomingSeverity / forecastLevel / budgets / flags

  // Gentle on-ramp: the first two seasons stay calm (no damage, no deaths) so the
  // player can learn the systems and prepare before the river turns dangerous.
  if (gs.round <= 2) gs.upcomingSeverity = SEVERITY.NONE;
}

/** The forecast band shown to the player: tightens around the truth as sharpened. */
export function forecastBand(gs) {
  if (oceanaLost(gs)) return { low: 0, high: 4, exact: false, blind: true }; // no data hub → no intel
  const t = gs.upcomingSeverity ?? 0;
  const w = BALANCE.forecast.maxLevel - gs.forecastLevel; // 2 → 1 → 0
  return { low: Math.max(0, t - w), high: Math.min(4, t + w), exact: w === 0, blind: false };
}

export function canSharpenForecast(gs) {
  return gs.phase === PHASE.PREP
    && !oceanaLost(gs)                                   // nothing to sharpen without the data hub
    && gs.forecastLevel < BALANCE.forecast.maxLevel
    && playerMuni(gs).budget >= BALANCE.forecast.sharpenCost;
}

export function sharpenForecast(gs) {
  if (!canSharpenForecast(gs)) return false;
  playerMuni(gs).budget -= BALANCE.forecast.sharpenCost;
  gs.forecastLevel += 1;
  return true;
}

// --- Flood phase --------------------------------------------------------------

/** Build the flood-model input from current state (investments + morale). */
function buildFloodInput(gs) {
  return gs.munis.map((m) => ({
    id: m.id,
    pos: m.def.pos,
    population: m.population,
    exposure: m.exposure,
    morale: m.morale,
    trait: m.def.trait,
    invest: { levee: m.leveesBuilt, boat: m.stock.boat, kit: m.stock.kit },
  }));
}

/**
 * Project this round's outcome at a hypothetical severity WITHOUT mutating state
 * — the engine behind the Regional Meeting's planning table. resolveFlood is
 * deterministic (its rescue noise is seeded per-town), so the preview matches
 * exactly what the real flood would do given the current preparations.
 */
export function previewFlood(gs, severity) {
  return resolveFlood(buildFloodInput(gs), severity, gs.pending);
}

export function resolveRound(gs) {
  resolveProposals(gs); // honour or break the deals struck this round
  // The flood was pre-drawn at the start of the round (the forecast hinted at it).
  const severity = gs.upcomingSeverity != null ? gs.upcomingSeverity : drawRegionalSeverity(gs.rng);
  gs.regionalSeverity = severity;
  gs.pending.noToxic = !!gs.eventFlags.noToxic; // Chemical Inspection event

  const results = resolveFlood(buildFloodInput(gs), severity, gs.pending);
  gs.lastResults = results;

  let tradersDamaged = false;
  let millingtonDamaged = false;
  for (const r of results) {
    const m = muniById(gs, r.id);
    m.deathsTotal += r.deaths;
    m.savedTotal += r.saved;
    m.damageTotal += r.damage;

    const deathFrac = r.deaths / m.population;
    if (r.deaths > 0) m.morale = Math.max(0, m.morale - Math.round(deathFrac * 600));
    else if (r.effSeverity <= SEVERITY.MINOR) m.morale = Math.min(100, m.morale + 4);

    // Equipment attrition — floods sink/wreck a fraction of the persistent fleet.
    const eff = Math.max(0, Math.min(4, Math.round(r.effSeverity)));
    const boatsBefore = m.stock.boat, kitsBefore = m.stock.kit;
    m.stock.boat = Math.floor(m.stock.boat * (1 - BALANCE.attrition.boat[eff]));
    m.stock.kit = Math.floor(m.stock.kit * (1 - BALANCE.attrition.kit[eff]));
    r.boatsLost = boatsBefore - m.stock.boat;   // surfaced as a "−N ⛵" pop on the map
    r.kitsLost = kitsBefore - m.stock.kit;

    if (m.def.trait === 'dataVuln' && r.effSeverity >= SEVERITY.MINOR && !m.destroyed) {
      m.destroyed = true;
      gs.oceanaJustLost = true;   // surface a one-time "forecasts gone" advisor next prep
    }
    if (m.def.trait === 'economicEngine' && r.effSeverity >= SEVERITY.MODERATE) tradersDamaged = true;
    if (m.id === 'millington' && r.effSeverity >= SEVERITY.MODERATE) millingtonDamaged = true;

    // Insurance payout.
    if (gs.pending.insured[r.id] && r.deaths > 0) m.banked += 40;
  }

  // Research budget grows while Oceana survives (funds rare cards).
  const oceana = gs.munis.find((m) => m.def.trait === 'dataVuln');
  if (oceana && !oceana.destroyed) gs.research += BALANCE.researchPerSafeOceana;

  // Funds chain: the economic engine (Trader's) and the tax base (Millington)
  // both cut every town's budget next round when they flood.
  gs.economicPenalty = (tradersDamaged ? 0.35 : 0) + (millingtonDamaged ? 0.2 : 0);

  // Production scarcity for NEXT round — recomputed each flood, so a single safe
  // season clears it. A producer that took eff ≥ MODERATE strains its resource;
  // a destroyed producer cuts it.
  gs.scarce = {};
  for (const cityId of Object.keys(PRODUCERS)) {
    const pm = muniById(gs, cityId);
    const pr = results.find((x) => x.id === cityId);
    if (!pm || !pr) continue;
    if (pm.destroyed) gs.scarce[PRODUCERS[cityId].res] = 'cut';
    else if (pr.effSeverity >= SEVERITY.MODERATE) gs.scarce[PRODUCERS[cityId].res] = 'strained';
  }

  // Press consequence — the season's reporting moves the mayor's approval.
  // Reads the round's domain events; no notification text is inspected.
  const player = playerMuni(gs);
  const regionDeaths = results.reduce((a, r) => a + r.deaths, 0);
  let press = 0;
  if (regionDeaths === 0) press += 4;                          // "no lives lost"
  if (boatsWereSent(gs.notifications)) press += 3;             // allies rallied
  if (betrayalEvents(gs.notifications).length > 0) press -= 7; // a broken promise
  player.morale = Math.max(0, Math.min(100, player.morale + press));

  gs.phase = PHASE.SUMMARY;
  gs.log.push(summariseRound(gs));
  return results;
}

function summariseRound(gs) {
  const totalDeaths = gs.lastResults.reduce((a, r) => a + r.deaths, 0);
  const totalSaved = gs.lastResults.reduce((a, r) => a + r.saved, 0);
  const totalDamage = gs.lastResults.reduce((a, r) => a + r.damage, 0);
  return { round: gs.round, severity: gs.regionalSeverity, totalDeaths, totalSaved, totalDamage };
}

// --- Advance ------------------------------------------------------------------

/**
 * The centralised per-round reset. Everything that lives for exactly one round
 * is re-initialised HERE and nowhere else — see the field-ownership table in
 * docs/architecture/model.md.
 */
export function advanceRound(gs) {
  if (gs.round >= BALANCE.totalRounds) {
    gs.phase = PHASE.GAMEOVER;
    return;
  }
  gs.round += 1;
  gs.phase = PHASE.PREP;

  for (const m of gs.munis) {
    let base = m.def.baseBudget * (1 - gs.economicPenalty);
    base = Math.round(base) + m.banked;
    if (m.debtSchedule.length) base -= m.debtSchedule.shift(); // Levy Bond repayment
    m.budget = Math.max(0, base);
    m.banked = 0;
    m.audited = false;
    // NB: m.stock (boats/kits) is NOT reset — equipment persists across rounds.
  }
  gs.economicPenalty = 0;
  gs.regionalSeverity = null;
  gs.goodwillBonus = 0;
  gs.lastAudit = null;
  gs.meetingHeld = false;
  // Cooperation dividend: cooperating last round grants extra capital now.
  gs.pc = BALANCE.politicalCapital + (gs.cooperatedThisRound ? BALANCE.coopDividend : 0);
  gs.coopDividendApplied = gs.cooperatedThisRound;   // for a one-time UI note
  gs.cooperatedThisRound = false;

  // Deal payoffs promised last round arrive now (boats added to durable stock).
  const player = playerMuni(gs);
  for (const r of gs.scheduledRewards) {
    if (r.boats) player.stock.boat += r.boats;
    if (r.budget) player.budget += r.budget;
  }
  gs.scheduledRewards = [];
  gs.playerContribThisRound = {};
  gs.favoursAsked = {};
  gs.scarceBought = {};
  gs.notifications = [];
  gs.pending = initPending();
  dealCards(gs, BALANCE.drawPerRound);
  generateProposals(gs);
  startRoundEnvironment(gs); // pre-draw next flood + draw this round's event
}
