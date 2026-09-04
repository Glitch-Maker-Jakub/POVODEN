// =============================================================================
// POVODEŇ — Economy: investments, scarcity, purchases
// -----------------------------------------------------------------------------
// Everything money buys during preparation: the five investment categories,
// production-chain scarcity surcharges and caps, political-capital gating of
// cooperative purchases, and the purchase() mutation itself (used by both the
// player UI and the AI mayors).
// =============================================================================

import { INVESTMENTS, BALANCE, RELATIONSHIP, INVEST_RESOURCE } from '../data/gameData.js';
import { PHASE, muniById, adjustRelationship } from './state.js';

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
