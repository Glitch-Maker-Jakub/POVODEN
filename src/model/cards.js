// =============================================================================
// POVODEŇ — Power cards: dealing, tier unlocks, playing
// -----------------------------------------------------------------------------
// The hold-vs-play hand economy: research (funded by protecting Oceana) gates
// the rarer tiers, the hand persists across rounds under a cap, and playing a
// card costs political capital. Card EFFECTS live in cardEffects.js.
// =============================================================================

import { CARDS, CARD_BY_ID, TIER_UNLOCK, BALANCE } from '../data/gameData.js';
import { applyCardEffect, cardIsPlayable } from './cardEffects.js';
import { PHASE } from './state.js';

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
