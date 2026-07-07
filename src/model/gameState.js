// =============================================================================
// POVODEŇ — Game state & round/phase machine
// -----------------------------------------------------------------------------
// Pure logic, no Phaser. The scenes read this and render it; this module never
// touches the display. Mirrors the data/logic/presentation split the paper
// describes for the Godot build (Section 5.1).
// =============================================================================

import {
  MUNICIPALITIES, INVESTMENTS, BALANCE, SEVERITY, EXPOSURE,
  CARDS, CARD_BY_ID, TIER_UNLOCK,
  MAYORS, AGENDAS, RELATIONSHIP, EVENTS,
  PRODUCERS, INVEST_RESOURCE,
} from '../data/gameData.js';
import { drawRegionalSeverity, resolveFlood } from './floodModel.js';
import { applyCardEffect, cardIsPlayable } from './cardEffects.js';

export const PHASE = { PREP: 'prep', FLOOD: 'flood', SUMMARY: 'summary', GAMEOVER: 'gameover' };

function initPending() {
  return {
    tempLevee: {},   // townId -> extra (non-deflecting) levees this round
    sevMod: {},      // townId -> effective-severity delta
    boatMult: {},    // townId -> boat-effectiveness multiplier
    atRiskMult: {},  // townId -> at-risk-fraction multiplier
    boatPrice: {},   // townId(buyer) -> discounted boat cost
    insured: {},     // townId -> true (post-flood payout if damaged)
    pactTowns: null, // [id,id,id] sharing pooled boats
  };
}

export function createGameState(playerMuniId = 'millington', rng = Math.random) {
  const munis = MUNICIPALITIES.map((def) => ({
    def,
    id: def.id,
    isPlayer: def.id === playerMuniId,
    budget: def.baseBudget,
    banked: 0,
    leveesBuilt: 0,
    stock: { boat: 0, kit: 0 },   // PERSISTENT fleet — carries across rounds (boats no longer vanish)
    morale: 60,
    population: def.population,
    exposure: EXPOSURE[def.id] || 0,
    deathsTotal: 0,
    savedTotal: 0,
    damageTotal: 0,          // cumulative economic damage (€M)
    destroyed: false,
    audited: false,
    debtSchedule: [],
  }));

  const gs = {
    rng,
    round: 1,
    phase: PHASE.PREP,
    playerMuniId,
    munis,
    regionalSeverity: null,
    lastResults: null,
    economicPenalty: 0,
    research: 0,
    pc: BALANCE.politicalCapital, // political capital this round
    hand: [],
    goodwillBonus: 0,
    auditPenalty: 0,
    lastAudit: null,
    meetingHeld: false,   // have you convened a Regional Meeting this round?
    pending: initPending(),
    log: [],
    relationship: {},          // player ↔ each AI town, 0..100
    agendas: {},               // townId -> hidden agenda (shuffled per game)
    proposals: [],             // deals the AI mayors offer this round
    notifications: [],         // felt one-liners the UI surfaces
    playerContribThisRound: {},// what the player invested where (for deal checking)
    scheduledRewards: [],      // deal payoffs applied next round
    favoursAsked: {},          // towns you've already called on this round
    upcomingSeverity: null,    // this round's flood, pre-drawn but only forecast
    forecastLevel: 0,          // how sharp the forecast is (0..maxLevel)
    eventDeck: [],
    currentEvent: null,        // the regional event in play this round
    eventFlags: {},            // per-round flags set by events
    scarce: {},                // resource -> 'strained'|'cut' (a producer flooded last round)
    scarceBought: {},          // per-round count of scarce items the player has bought (for the cap)
    cooperatedThisRound: false,// did the player help a neighbour / keep a deal? (capital dividend)
  };
  assignAgendas(gs);
  gs.munis.forEach((m) => { if (!m.isPlayer) gs.relationship[m.id] = RELATIONSHIP.start; });
  gs.eventDeck = shuffle([...EVENTS], gs.rng);
  dealCards(gs, BALANCE.initialHand);
  generateProposals(gs);
  startRoundEnvironment(gs);
  return gs;
}

// --- Forecast & events (per-round environment) -------------------------------

function startRoundEnvironment(gs) {
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

/** Oceana (the data city) provides flood intel. Lose it and you forecast blind. */
export function oceanaLost(gs) {
  const oceana = gs.munis.find((m) => m.def.trait === 'dataVuln');
  return !!(oceana && oceana.destroyed);
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

// --- Mayors, agendas, relationships ------------------------------------------

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function assignAgendas(gs) {
  const ai = gs.munis.filter((m) => !m.isPlayer).map((m) => m.id);
  const pool = shuffle([...AGENDAS], gs.rng);
  gs.agendas = {};
  ai.forEach((id, i) => { gs.agendas[id] = pool[i % pool.length]; });
}

export const relationshipLabel = (v) =>
  v >= RELATIONSHIP.allyAt ? 'ally' : v <= RELATIONSHIP.rivalAt ? 'rival' : 'neutral';

export function adjustRelationship(gs, townId, delta) {
  if (gs.relationship[townId] == null) return;
  gs.relationship[townId] = Math.max(0, Math.min(100, gs.relationship[townId] + delta));
}

export function notify(gs, msg) { gs.notifications.push(msg); }

// --- Favours: spend the trust you've built with an ally for concrete help ----

export function canAskFavour(gs, townId) {
  if (gs.phase !== PHASE.PREP) return false;
  if (townId === gs.playerMuniId || gs.relationship[townId] == null) return false;
  if (gs.favoursAsked[townId]) return false;
  return gs.relationship[townId] >= BALANCE.favour.minRel && gs.pc >= BALANCE.favour.pcCost;
}

export function askFavour(gs, townId) {
  if (!canAskFavour(gs, townId)) return false;
  playerMuni(gs).stock.boat += BALANCE.favour.boats; // an ally sends boats now (durable stock)
  gs.pc -= BALANCE.favour.pcCost;
  adjustRelationship(gs, townId, -BALANCE.favour.relCost); // spends the goodwill
  gs.favoursAsked[townId] = true;
  notify(gs, `${MAYORS[townId].name} answered your call — ${BALANCE.favour.boats} boats sent to your town.`);
  return true;
}

// --- Deals / proposals -------------------------------------------------------

function rewardText(ag) {
  switch (ag.id) {
    case 'cooperator': return 'will send 2 boats to your town next round';
    case 'opportunist': return 'will forward €20M to your coffers next round';
    case 'reciprocator': return 'will remember the favour and stand with you';
    case 'grudge': return 'will count it as a debt repaid in full';
    case 'freerider': return 'offers warm words and little else';
    default: return 'will think well of you';
  }
}
function rewardFor(ag) {
  if (ag.id === 'cooperator') return { boats: 2 };
  if (ag.id === 'opportunist') return { budget: 20 };
  return { goodwill: true };
}

/** Offer the player at most one deal this round from a fitting AI mayor. */
export function generateProposals(gs) {
  gs.proposals = [];
  const ai = gs.munis.filter((m) => !m.isPlayer && !m.destroyed);
  if (!ai.length) return;
  // Sociable agendas (and a little randomness) are likeliest to reach out.
  const scored = ai.map((m) => ({
    m,
    w: 0.3 + (gs.agendas[m.id]?.reciprocity || 0) + (gs.agendas[m.id]?.coopMod || 0) + gs.rng() * 0.6,
  }));
  scored.sort((a, b) => b.w - a.w);
  const from = scored[0].m;
  const ag = gs.agendas[from.id];
  const askInv = gs.rng() < 0.5 ? 'levee' : 'boat';
  const M = MAYORS[from.id];
  const rewardKey = ['cooperator', 'opportunist', 'reciprocator', 'grudge', 'freerider'].includes(ag.id)
    ? ag.id : 'default';
  gs.proposals.push({
    id: `p${gs.round}_${from.id}`,
    from: from.id,
    askInv,
    reward: rewardFor(ag),
    rewardKey,              // i18n key suffix; the scene renders the localized sentence
    accepted: null,
    // English fallback (the UI builds a localized string from the fields above).
    text: `${M.name} asks you to fund a ${INVESTMENTS[askInv].name} in ${from.def.name} this round — and ${rewardText(ag)}.`,
  });
}

export function acceptProposal(gs, id) {
  const p = gs.proposals.find((x) => x.id === id);
  if (p) p.accepted = true;
}

export function declineProposal(gs, id) {
  const p = gs.proposals.find((x) => x.id === id);
  if (!p || p.accepted === false) return;
  p.accepted = false;
  adjustRelationship(gs, p.from, -RELATIONSHIP.declineLoss);
}

/** Check whether accepted deals were honoured; adjust relationships & rewards. */
function resolveProposals(gs) {
  for (const p of gs.proposals) {
    const M = MAYORS[p.from];
    const town = muniById(gs, p.from);
    const fulfilled = (gs.playerContribThisRound[p.from]?.[p.askInv] || 0) >= 1;
    if (p.accepted === true) {
      if (fulfilled) {
        adjustRelationship(gs, p.from, RELATIONSHIP.dealKept);
        gs.cooperatedThisRound = true;   // honouring a deal counts as cooperation
        if (p.reward.boats) gs.scheduledRewards.push({ boats: p.reward.boats });
        if (p.reward.budget) gs.scheduledRewards.push({ budget: p.reward.budget });
        notify(gs, `${M.name} (${town.def.name}) is grateful — you kept your word.`);
      } else {
        adjustRelationship(gs, p.from, -RELATIONSHIP.dealBroken);
        notify(gs, `${M.name} (${town.def.name}) feels betrayed — you promised and did not deliver.`);
      }
    } else if (p.accepted === null) {
      adjustRelationship(gs, p.from, -Math.round(RELATIONSHIP.declineLoss / 2)); // ignored
    }
  }
}

/**
 * Convene a Regional Meeting: for a small budget the player learns what every
 * municipality has actually committed this round (levees, boats, kits, reserves,
 * morale) — turning invisible neighbours into legible allies or rivals.
 * Information about your neighbours is itself a cooperative good that costs to obtain.
 */
export function holdMeeting(gs) {
  if (gs.phase !== PHASE.PREP || gs.meetingHeld) return false;
  const p = playerMuni(gs);
  if (p.budget < BALANCE.meetingCost) return false;
  p.budget -= BALANCE.meetingCost;
  gs.meetingHeld = true;
  return true;
}

export const meetingAffordable = (gs) =>
  gs.phase === PHASE.PREP && !gs.meetingHeld && playerMuni(gs).budget >= BALANCE.meetingCost;

/** Is this municipality's private state currently visible to the player? */
export const isRevealed = (gs, id) => id === gs.playerMuniId || gs.meetingHeld;

export const muniById = (gs, id) => gs.munis.find((m) => m.id === id);
export const playerMuni = (gs) => muniById(gs, gs.playerMuniId);

// --- Cards --------------------------------------------------------------------

export function unlockedTiers(gs) {
  return Object.keys(TIER_UNLOCK).filter((t) => gs.research >= TIER_UNLOCK[t]);
}

function weightedSampleDistinct(items, weightFn, k, rng) {
  const pool = [...items];
  const picked = [];
  while (picked.length < k && pool.length) {
    const total = pool.reduce((a, it) => a + weightFn(it), 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) { r -= weightFn(pool[idx]); if (r <= 0) break; }
    picked.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
  }
  return picked;
}

/** Add up to `count` new cards to the hand (held across rounds, capped). */
export function dealCards(gs, count) {
  const tiers = new Set(unlockedTiers(gs));
  const pool = CARDS.filter((c) => tiers.has(c.tier));
  const room = Math.max(0, BALANCE.handCap - gs.hand.length);
  const n = Math.min(count, room);
  if (n <= 0 || !pool.length) return;
  const w = BALANCE.tierWeights;
  const picked = weightedSampleDistinct(pool, (c) => w[c.tier] ?? 0.1, n, gs.rng).map((c) => c.id);
  gs.hand.push(...picked);
}

export function canPlayCard(gs, cardId, selectedTargetId) {
  if (gs.phase !== PHASE.PREP) return false;
  if (gs.pc < BALANCE.cardPcCost) return false;       // out of political capital
  if (!gs.hand.includes(cardId)) return false;
  return cardIsPlayable(gs, CARD_BY_ID[cardId], selectedTargetId);
}

export function playCard(gs, cardId, selectedTargetId) {
  if (!canPlayCard(gs, cardId, selectedTargetId)) return false;
  applyCardEffect(gs, CARD_BY_ID[cardId], selectedTargetId);
  gs.hand.splice(gs.hand.indexOf(cardId), 1);
  gs.pc -= BALANCE.cardPcCost;
  return true;
}

// --- Preparation phase --------------------------------------------------------

/** Surcharge on an item whose input resource is short this round (1 if flowing). */
export function scarcityMult(gs, type) {
  const res = INVEST_RESOURCE[type];
  const state = res && gs.scarce ? gs.scarce[res] : null;
  if (state === 'cut') return BALANCE.scarcity.cutSurcharge;
  if (state === 'strained') return BALANCE.scarcity.surcharge;
  return 1;
}

export function investmentCost(gs, type, buyerId) {
  if (type === 'boat' && gs.pending.boatPrice[buyerId] != null) {
    return gs.pending.boatPrice[buyerId];
  }
  return Math.round(INVESTMENTS[type].cost * scarcityMult(gs, type));
}

/** When a resource is scarce, the PLAYER can only buy a few of its gated item. */
function scarceCapReached(gs, type) {
  const res = INVEST_RESOURCE[type];
  if (!res || !gs.scarce || !gs.scarce[res]) return false;
  return (gs.scarceBought[type] || 0) >= BALANCE.scarcity.cap;
}

export function canAfford(gs, buyerId, type) {
  const buyer = muniById(gs, buyerId);
  return buyer && !buyer.destroyed && buyer.budget >= investmentCost(gs, type, buyerId);
}

/** Can the human player invest `type` in `targetId` right now (budget + capital)? */
export function canInvest(gs, type, targetId) {
  if (gs.phase !== PHASE.PREP) return false;
  if (type === 'reserve' && gs.eventFlags?.noReserve) return false; // Budget Freeze event
  if (scarceCapReached(gs, type)) return false;                     // resource short — capped this round
  if (!canAfford(gs, gs.playerMuniId, type)) return false;
  const coop = targetId !== gs.playerMuniId && type !== 'reserve';
  const coopCost = gs.eventFlags?.freeCoop ? 0 : BALANCE.coopPcCost; // Media Storm event
  if (coop && gs.pc < coopCost) return false;
  return true;
}

export function purchase(gs, buyerId, targetId, type) {
  if (gs.phase !== PHASE.PREP) return false;
  if (type === 'reserve' && buyerId === gs.playerMuniId && gs.eventFlags?.noReserve) return false;
  if (!canAfford(gs, buyerId, type)) return false;
  const buyer = muniById(gs, buyerId);
  const target = muniById(gs, targetId);
  if (!target) return false;

  // The PLAYER spends political capital to invest in another town (cooperation),
  // unless a Media Storm event makes cooperation free this round.
  const coop = buyerId === gs.playerMuniId && targetId !== buyerId && type !== 'reserve';
  const coopCost = gs.eventFlags?.freeCoop ? 0 : BALANCE.coopPcCost;
  if (coop && gs.pc < coopCost) return false;

  if (buyerId === gs.playerMuniId && scarceCapReached(gs, type)) return false; // resource short
  buyer.budget -= investmentCost(gs, type, buyerId);
  if (coop) gs.pc -= coopCost;
  switch (type) {
    case 'levee': target.leveesBuilt += 1; break;
    case 'boat': target.stock.boat += 1; break;   // persistent fleet
    case 'kit': target.stock.kit += 1; break;
    case 'fun':
      // Big approval lift, but a celebration leaves people exposed this round.
      target.morale = Math.min(100, target.morale + BALANCE.funMorale);
      gs.pending.atRiskMult[target.id] = (gs.pending.atRiskMult[target.id] || 1) * BALANCE.funRisk;
      break;
    case 'reserve': {
      // Player reserves earn interest but anger the public (hoarding ≠ helping).
      const isPlayer = buyerId === gs.playerMuniId;
      buyer.banked += Math.round(INVESTMENTS.reserve.cost * (isPlayer ? BALANCE.reserveInterest : 1));
      if (isPlayer) buyer.morale = Math.max(0, buyer.morale - BALANCE.reserveMoraleCost);
      break;
    }
  }
  // Count scarce-gated purchases toward the per-round cap.
  if (buyerId === gs.playerMuniId && INVEST_RESOURCE[type] && gs.scarce[INVEST_RESOURCE[type]]) {
    gs.scarceBought[type] = (gs.scarceBought[type] || 0) + 1;
  }

  // Track what the player put where (for deal-keeping) and reward cooperation:
  // the neighbour warms to you (relationship), your own voters approve (morale),
  // and you earn a political-capital dividend next round.
  if (buyerId === gs.playerMuniId && type !== 'reserve') {
    const c = gs.playerContribThisRound[targetId] || (gs.playerContribThisRound[targetId] = {});
    c[type] = (c[type] || 0) + 1;
    if (coop) {
      adjustRelationship(gs, targetId, RELATIONSHIP.coopGain);
      buyer.morale = Math.min(100, buyer.morale + BALANCE.coopVote);
      gs.cooperatedThisRound = true;
    }
  }
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
  const player = playerMuni(gs);
  const regionDeaths = results.reduce((a, r) => a + r.deaths, 0);
  let press = 0;
  if (regionDeaths === 0) press += 4;                                  // "no lives lost"
  if (gs.notifications.some((n) => n.includes('sent'))) press += 3;    // allies rallied
  if (gs.notifications.some((n) => n.includes('betrayed'))) press -= 7; // a broken promise
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

// --- Scoring ------------------------------------------------------------------

export function regionalScore(gs) {
  const totalDeaths = gs.munis.reduce((a, m) => a + m.deathsTotal, 0);
  const totalSaved = gs.munis.reduce((a, m) => a + m.savedTotal, 0);
  const auditPenalty = gs.auditPenalty || 0;
  const totalDamage = gs.munis.reduce((a, m) => a + m.damageTotal, 0) + auditPenalty;
  const destroyed = gs.munis.filter((m) => m.destroyed).length;
  const avgMorale = Math.round(gs.munis.reduce((a, m) => a + m.morale, 0) / gs.munis.length);
  return { totalDeaths, totalSaved, totalDamage, destroyed, avgMorale, auditPenalty };
}
