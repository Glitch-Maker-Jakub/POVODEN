// =============================================================================
// POVODEŇ — Diplomacy: agendas, deals, favours, the Regional Meeting
// -----------------------------------------------------------------------------
// The felt-politics layer: hidden agendas shuffled onto the AI mayors, the
// one-deal-per-round proposal system with honour/betray consequences, favours
// that convert built-up trust into boats, and the meeting that reveals the
// neighbours' plans. Outcomes are recorded as typed domain events — the UI
// localises them; no user-facing sentences are written here.
// =============================================================================

import { BALANCE, RELATIONSHIP, AGENDAS } from '../data/gameData.js';
import { PHASE, muniById, playerMuni, adjustRelationship } from './state.js';
import { EVENT, notify } from './events.js';
import { shuffle } from './rng.js';

export function assignAgendas(gs) {
  const ai = gs.munis.filter((m) => !m.isPlayer).map((m) => m.id);
  const pool = shuffle([...AGENDAS], gs.rng);
  gs.agendas = {};
  ai.forEach((id, i) => { gs.agendas[id] = pool[i % pool.length]; });
}

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
  notify(gs, { type: EVENT.FAVOUR_ANSWERED, townId, boats: BALANCE.favour.boats });
  return true;
}

// --- Deals / proposals -------------------------------------------------------

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
  const rewardKey = ['cooperator', 'opportunist', 'reciprocator', 'grudge', 'freerider'].includes(ag.id)
    ? ag.id : 'default';
  // The scene renders the whole deal sentence from these fields via i18n.
  gs.proposals.push({
    id: `p${gs.round}_${from.id}`,
    from: from.id,
    askInv,
    reward: rewardFor(ag),
    rewardKey,              // i18n key suffix for the promised reward
    accepted: null,
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
export function resolveProposals(gs) {
  for (const p of gs.proposals) {
    const fulfilled = (gs.playerContribThisRound[p.from]?.[p.askInv] || 0) >= 1;
    if (p.accepted === true) {
      if (fulfilled) {
        adjustRelationship(gs, p.from, RELATIONSHIP.dealKept);
        gs.cooperatedThisRound = true;   // honouring a deal counts as cooperation
        if (p.reward.boats) gs.scheduledRewards.push({ boats: p.reward.boats });
        if (p.reward.budget) gs.scheduledRewards.push({ budget: p.reward.budget });
        notify(gs, { type: EVENT.DEAL_KEPT, townId: p.from });
      } else {
        adjustRelationship(gs, p.from, -RELATIONSHIP.dealBroken);
        notify(gs, { type: EVENT.DEAL_BROKEN, townId: p.from });
      }
    } else if (p.accepted === null) {
      adjustRelationship(gs, p.from, -Math.round(RELATIONSHIP.declineLoss / 2)); // ignored
    }
  }
}

// --- Regional Meeting ----------------------------------------------------------

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
