// =============================================================================
// Card effects (paper Section 4.3)
// -----------------------------------------------------------------------------
// Each card maps to a function that mutates game state. Effects land in one of
// three places:
//   • immediate     — budget / morale / permanent levees, applied now
//   • gs.pending     — this-round modifiers consumed by the flood resolution
//   • cross-round    — flags read next round (goodwill, audits, debt, insurance)
//
// Self-contained (no import from gameState) to avoid a circular dependency.
// =============================================================================

import { BALANCE, RELATIONSHIP } from '../data/gameData.js';

const muni = (gs, id) => gs.munis.find((m) => m.id === id);
const rel = (gs, id, d) => {
  if (gs.relationship && gs.relationship[id] != null) {
    gs.relationship[id] = Math.max(0, Math.min(100, gs.relationship[id] + d));
  }
};
const addMorale = (gs, id, d) => {
  const m = muni(gs, id);
  if (m) m.morale = Math.max(0, Math.min(100, m.morale + d));
};
const bump = (obj, id, d) => { obj[id] = (obj[id] || 0) + d; };

function ordered(gs) {
  return [...gs.munis].sort((a, b) => a.def.pos - b.def.pos);
}
function downstreamNearest(gs, id, n = 1) {
  const me = muni(gs, id);
  return ordered(gs).filter((m) => m.def.pos > me.def.pos).slice(0, n).map((m) => m.id);
}
function upstreamNearest(gs, id) {
  const me = muni(gs, id);
  const up = ordered(gs).filter((m) => m.def.pos < me.def.pos);
  return up.length ? up[up.length - 1].id : null;
}

/** Resolve what a card actually targets, given the UI's selected Target City. */
export function resolveCardTarget(gs, card, selectedTargetId) {
  switch (card.target) {
    case 'self': return { selfId: gs.playerMuniId, targetId: gs.playerMuniId };
    case 'none': return { selfId: gs.playerMuniId, targetId: null };
    case 'choose': return { selfId: gs.playerMuniId, targetId: selectedTargetId };
    case 'downstream': {
      const d = downstreamNearest(gs, gs.playerMuniId, 1)[0] || null;
      return { selfId: gs.playerMuniId, targetId: d };
    }
    case 'upstream':
      return { selfId: gs.playerMuniId, targetId: upstreamNearest(gs, gs.playerMuniId) };
    case 'pact': {
      const partners = downstreamNearest(gs, gs.playerMuniId, 2);
      const pact = [gs.playerMuniId, ...partners];
      return { selfId: gs.playerMuniId, targetId: null, pactTowns: pact };
    }
    default: return { selfId: gs.playerMuniId, targetId: selectedTargetId };
  }
}

/** Is the card playable right now (e.g. downstream/upstream neighbour exists)? */
export function cardIsPlayable(gs, card, selectedTargetId) {
  const ctx = resolveCardTarget(gs, card, selectedTargetId);
  if (card.target === 'downstream' || card.target === 'upstream') return !!ctx.targetId;
  if (card.target === 'pact') return ctx.pactTowns.length >= 2;
  if (card.target === 'choose') return !!ctx.targetId;
  return true;
}

const EFFECTS = {
  // --- Common ---
  sandbag: (gs, c) => { bump(gs.pending.tempLevee, c.targetId, 1); rel(gs, c.targetId, RELATIONSHIP.cardGain); },
  volunteer: (gs, c) => {
    gs.pending.boatMult[c.selfId] = (gs.pending.boatMult[c.selfId] || 1) * 2;
    addMorale(gs, c.selfId, -15);
  },
  insurance: (gs, c) => { gs.pending.insured[c.selfId] = true; },
  mutualaid: (gs, c) => { const t = muni(gs, c.targetId); if (t) { t.stock.boat += 1; rel(gs, c.targetId, RELATIONSHIP.cardGain); } },
  drill: (gs, c) => { addMorale(gs, c.selfId, 18); muni(gs, c.selfId).stock.kit += 1; },

  // --- Uncommon ---
  decree: (gs, c) => { muni(gs, c.selfId).budget += 30; addMorale(gs, c.selfId, -8); },
  media: (gs, c) => { gs.goodwillBonus = 0.25; },
  audit: (gs, c) => {
    const t = muni(gs, c.targetId);
    if (t) { t.audited = true; gs.lastAudit = { id: t.id, name: t.def.name, banked: t.banked }; }
  },
  bond: (gs, c) => {
    const m = muni(gs, c.selfId);
    m.budget += 40;
    m.debtSchedule = (m.debtSchedule || []).concat([20, 20]);
  },
  procure: (gs, c) => { gs.pending.boatPrice[c.selfId] = 7; },

  // --- Rare ---
  pact: (gs, c) => { gs.pending.pactTowns = c.pactTowns; },
  bailout: (gs, c) => {
    muni(gs, c.selfId).budget += 120;
    gs.auditPenalty = (gs.auditPenalty || 0) + BALANCE.bailoutScorePenalty;
  },
  diversion: (gs, c) => {
    bump(gs.pending.sevMod, c.selfId, -2);
    if (c.targetId) { bump(gs.pending.sevMod, c.targetId, +2); rel(gs, c.targetId, -RELATIONSHIP.diversionLoss); }
    addMorale(gs, c.selfId, -15);
    gs.goodwillBonus = -0.2; // breaks trust: AI less cooperative next round
  },
  grant: (gs, c) => {
    [c.selfId, ...downstreamNearest(gs, c.selfId, 2)].forEach((id) => {
      const m = muni(gs, id); if (m) m.leveesBuilt += 1;
    });
  },
  evac: (gs, c) => {
    gs.pending.atRiskMult[c.selfId] = 0.5;
    addMorale(gs, c.selfId, -10);
    const m = muni(gs, c.selfId); m.budget = Math.max(0, m.budget - 20);
  },
};

/** Apply a card's effect. Returns true if applied. */
export function applyCardEffect(gs, card, selectedTargetId) {
  const fn = EFFECTS[card.id];
  if (!fn) return false;
  const ctx = resolveCardTarget(gs, card, selectedTargetId);
  ctx.pactTowns = ctx.pactTowns || null;
  fn(gs, ctx);
  return true;
}
