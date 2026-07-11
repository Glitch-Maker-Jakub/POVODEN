// =============================================================================
// AI mayors — hand-authored heuristics (paper Section 8.1)
// -----------------------------------------------------------------------------
// "if budget exceeds threshold X, invest in levee; if a neighbour invested in
//  me last round, reciprocate; otherwise hoard reserves."
//
// Baseline behaviour leans toward self-protection (defection) — that is the
// historical status quo the game is meant to expose. A `cooperativeness` trait
// makes some mayors occasionally fund a downstream neighbour instead.
// Greenhaven, by trait, declines to wall itself off (its floodplain is the
// region's relief valve), which is itself a cooperative posture.
// =============================================================================

import { purchase, canAfford, muniById, notify, EVENT } from '../model/gameState.js';
import { INVESTMENTS } from '../data/gameData.js';

// Per-municipality disposition. 0 = pure self-interest, 1 = strongly cooperative.
const DISPOSITION = {
  delta: 0.45,
  millington: 0.30,
  greenhaven: 0.70,
  traders: 0.25,
  bayview: 0.55, // most exposed -> reaches out, but has little leverage
  oceana: 0.40,
  finalpoint: 0.50,
};

function downstreamNeighbour(gs, muniId) {
  const me = muniById(gs, muniId);
  return gs.munis
    .filter((m) => m.def.pos > me.def.pos && !m.destroyed)
    .sort((a, b) => a.def.pos - b.def.pos)[0];
}

/**
 * Run one AI mayor's preparation-phase decisions. Mutates state via purchase().
 */
export function decideAI(gs, muniId) {
  const me = muniById(gs, muniId);
  if (!me || me.destroyed) return;
  const r = gs.rng;

  // Cooperativeness = disposition + hidden agenda + regional goodwill + how the
  // player has treated THIS mayor (relationship). Media Appeal raises goodwill;
  // Upstream Diversion and broken deals lower the relationship.
  const ag = gs.agendas?.[muniId] || { coopMod: 0, reciprocity: 0 };
  const rel = gs.relationship?.[muniId] ?? 50;
  const coop = Math.max(0, Math.min(1,
    (DISPOSITION[muniId] ?? 0.3) + ag.coopMod + (gs.goodwillBonus || 0) + (rel - 50) / 200));

  // Reciprocity: a well-treated mayor pre-positions boats in the player's town —
  // a visible act of friendship the player feels directly.
  const player = gs.munis.find((m) => m.isPlayer);
  if (player && !player.destroyed && player.id !== muniId) {
    const chance = Math.max(0, (rel - 55) / 45) * (0.4 + ag.reciprocity);
    let sent = 0;
    while (rel >= 58 && sent < 2 && me.budget >= INVESTMENTS.boat.cost && r() < chance) {
      if (!purchase(gs, muniId, player.id, 'boat')) break;
      sent++;
    }
    if (sent > 0) notify(gs, { type: EVENT.BOATS_SENT, townId: muniId, boats: sent });
  }

  let guard = 0; // safety against infinite loops

  while (guard++ < 40) {
    const b = me.budget;

    // 1. Foundational levee on self, unless we are the absorptive floodplain.
    if (me.def.trait !== 'absorptive' && me.leveesBuilt < 1 && canAfford(gs, muniId, 'levee')) {
      const target = coop > 0.6 && r() < coop ? downstreamNeighbour(gs, muniId) : me;
      purchase(gs, muniId, (target || me).id, 'levee');
      continue;
    }

    // 2. Keep a small rescue fleet on hand (boats persist + attrition, so top up).
    if (b >= INVESTMENTS.boat.cost && (me.stock.boat < 3) && r() < 0.7) {
      const target = r() < coop ? downstreamNeighbour(gs, muniId) || me : me;
      purchase(gs, muniId, target.id, 'boat');
      continue;
    }

    // 3. A life kit (cheap resilience).
    if (b >= INVESTMENTS.kit.cost && me.stock.kit < 2 && r() < 0.6) {
      purchase(gs, muniId, muniId, 'kit');
      continue;
    }

    // 4. Morale upkeep if sagging.
    if (me.morale < 45 && canAfford(gs, muniId, 'fun')) {
      purchase(gs, muniId, muniId, 'fun');
      continue;
    }

    // 5. A second levee if rich and risk-averse (low cooperativeness => walls up).
    if (b >= INVESTMENTS.levee.cost && me.leveesBuilt < 2 && coop < 0.4 && r() < 0.5 &&
        me.def.trait !== 'absorptive') {
      purchase(gs, muniId, muniId, 'levee');
      continue;
    }

    // 6. Audited mayors are shamed out of hoarding — they spend instead.
    if (me.audited && b >= INVESTMENTS.boat.cost) {
      purchase(gs, muniId, muniId, 'boat');
      continue;
    }

    // 7. Otherwise bank the rest (the defection move).
    if (canAfford(gs, muniId, 'reserve')) {
      purchase(gs, muniId, muniId, 'reserve');
      continue;
    }
    break;
  }
}

/** Decide for every AI municipality, upstream -> downstream (paper turn order). */
export function runAllAI(gs) {
  gs.munis
    .filter((m) => !m.isPlayer)
    .sort((a, b) => a.def.pos - b.def.pos)
    .forEach((m) => decideAI(gs, m.id));
}
