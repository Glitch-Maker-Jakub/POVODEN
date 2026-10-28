// =============================================================================
// POVODEŇ — Round lifecycle: environment, forecast, flood resolution, advance
// -----------------------------------------------------------------------------
// Owns the PREP -> SUMMARY -> PREP/GAMEOVER progression: pre-drawing the
// season's flood, the regional event deck, the payable forecast band, the
// flood resolution (delegated to floodModel) with its economic/political
// consequences, and the centralised per-round reset in advanceRound().
// =============================================================================

import { BALANCE, SEVERITY, EVENTS, PRODUCERS } from '../data/gameData.js';
import { drawRegionalSeverity, severityFromDraw, resolveFlood } from './floodModel.js';
import { PHASE, initPending, muniById, playerMuni, oceanaLost } from './state.js';
import { boatsWereSent, betrayalEvents } from './events.js';
import { resolveProposals, generateProposals } from './diplomacy.js';
import { dealCards } from './cards.js';
import { shuffle } from './rng.js';

// --- Forecast & events (per-round environment) -------------------------------

export function startRoundEnvironment(gs) {
  gs.forecastLevel = 0;
  gs.eventFlags = {};
  // One rng call, exactly as drawRegionalSeverity makes it; the latent draw is
  // kept for the end-of-campaign record panel.
  gs.upcomingDraw = gs.rng();
  gs.upcomingSeverity = severityFromDraw(gs.upcomingDraw); // hidden; revealed via forecast

  if (!gs.eventDeck.length) gs.eventDeck = shuffle([...EVENTS], gs.rng);
  let ev = gs.eventDeck.pop();
  if (gs.round <= 1) ev = EVENTS.find((e) => e.id === 'calm') || ev; // quiet first week
  gs.currentEvent = { id: ev.id, name: ev.name, desc: ev.desc };
  ev.apply(gs); // may shift upcomingSeverity / forecastLevel / budgets / flags

  // Gentle on-ramp: the first two seasons stay calm (no damage, no deaths) so the
  // player can learn the systems and prepare before the river turns dangerous.
  if (gs.round <= 2) gs.upcomingSeverity = SEVERITY.NONE;

  // Where the truth sits inside the forecast band: one uniform draw per round,
  // ALWAYS consumed here (last), whatever the event or forecast level, so the
  // rng order stays fixed. See docs/architecture/model.md.
  gs.forecastU = gs.rng();
}

/**
 * The forecast band shown to the player. Its WIDTH depends only on the forecast
 * level (BALANCE.forecast.bandWidth: 2 -> 1 -> 0 severity steps), and the true
 * severity sits at a uniformly random position among the placements that keep
 * the band inside None..Catastrophic. So the band never encodes the truth: at
 * a given level every band can come from more than one severity (until the
 * last paid sharpening makes it exact). The placement draw is gs.forecastU.
 */
export function forecastBand(gs) {
  if (oceanaLost(gs)) return { low: 0, high: 4, exact: false, blind: true }; // no data hub → no intel
  const t = gs.upcomingSeverity ?? 0;
  const widths = BALANCE.forecast.bandWidth;
  const w = widths[Math.min(gs.forecastLevel, widths.length - 1)];
  if (w === 0) return { low: t, high: t, exact: true, blind: false };
  const lowMin = Math.max(SEVERITY.NONE, t - w);
  const lowMax = Math.min(t, SEVERITY.CATASTROPHIC - w);
  const u = gs.forecastU ?? 0;
  const low = lowMin + Math.min(lowMax - lowMin, Math.floor(u * (lowMax - lowMin + 1)));
  return { low, high: low + w, exact: false, blind: false };
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
  // Same flags as resolveRound (e.g. Chemical Inspection's noToxic), applied to
  // a copy so the preview never mutates gs.pending.
  return resolveFlood(buildFloodInput(gs), severity, floodEffects(gs));
}

/** The this-round flood modifiers, plus the event flags resolveFlood reads. */
function floodEffects(gs) {
  return { ...gs.pending, noToxic: !!gs.eventFlags?.noToxic };
}

export function resolveRound(gs) {
  resolveProposals(gs); // honour or break the deals struck this round
  // The flood was pre-drawn at the start of the round (the forecast hinted at it).
  const severity = gs.upcomingSeverity != null ? gs.upcomingSeverity : drawRegionalSeverity(gs.rng);
  gs.regionalSeverity = severity;
  // Live seasons (after the calm on-ramp) feed the record-seasons panel.
  if (gs.round > 2 && gs.upcomingDraw != null) gs.seasonDraws.push(gs.upcomingDraw);
  gs.pending.noToxic = !!gs.eventFlags.noToxic; // Chemical Inspection event

  const results = resolveFlood(buildFloodInput(gs), severity, floodEffects(gs));
  gs.lastResults = results;

  let tradersDamaged = false;
  let millingtonDamaged = false;
  for (const r of results) {
    const m = muniById(gs, r.id);
    m.deathsTotal += r.deaths;
    m.savedTotal += r.saved;
    m.damageTotal += r.damage;

    const deathFrac = r.deaths / m.population;
    if (r.deaths > 0) m.morale = Math.max(0, m.morale - Math.round(deathFrac * BALANCE.deathMoraleFactor));
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
  // After Oceana is lost the region's universities and gauging stations keep a
  // slower research trickle going, but only in quiet seasons (severity at most
  // researchQuietMaxSeverity): protecting Oceana unlocks the rare tier sooner
  // and more surely, losing it no longer locks the rare tier out for good.
  if (oceana && !oceana.destroyed) gs.research += BALANCE.researchPerSafeOceana;
  else if (severity <= BALANCE.researchQuietMaxSeverity) gs.research += BALANCE.researchPerQuietSeason;

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
