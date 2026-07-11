// =============================================================================
// POVODEŇ — State shape & selectors
// -----------------------------------------------------------------------------
// The phase machine constants, the per-round `pending` effect container, and
// the small read/clamp helpers every other model module builds on. This module
// imports only game data — it sits at the bottom of the model import graph
// (see docs/architecture/model.md).
// =============================================================================

import { RELATIONSHIP } from '../data/gameData.js';

export const PHASE = { PREP: 'prep', FLOOD: 'flood', SUMMARY: 'summary', GAMEOVER: 'gameover' };

/** This-round flood modifiers, written by cards/events, consumed by resolveFlood. */
export function initPending() {
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

export const muniById = (gs, id) => gs.munis.find((m) => m.id === id);
export const playerMuni = (gs) => muniById(gs, gs.playerMuniId);

/** Is this municipality's private state currently visible to the player? */
export const isRevealed = (gs, id) => id === gs.playerMuniId || gs.meetingHeld;

/** Oceana (the data city) provides flood intel. Lose it and you forecast blind. */
export function oceanaLost(gs) {
  const oceana = gs.munis.find((m) => m.def.trait === 'dataVuln');
  return !!(oceana && oceana.destroyed);
}

export const relationshipLabel = (v) =>
  v >= RELATIONSHIP.allyAt ? 'ally' : v <= RELATIONSHIP.rivalAt ? 'rival' : 'neutral';

export function adjustRelationship(gs, townId, delta) {
  if (gs.relationship[townId] == null) return;
  gs.relationship[townId] = Math.max(0, Math.min(100, gs.relationship[townId] + delta));
}
