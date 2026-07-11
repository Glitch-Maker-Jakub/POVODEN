// =============================================================================
// POVODEŇ — Domain events
// -----------------------------------------------------------------------------
// The model never writes user-facing sentences. Anything the UI might want to
// tell the player is pushed into gs.notifications as a typed event; the view
// layer localises or aggregates it (newspaper paragraphs, press reaction,
// cooperation imagery). The list is per-round: advanceRound() clears it.
// =============================================================================

export const EVENT = {
  BOATS_SENT: 'boats_sent',           // an AI mayor pre-positioned boats in your town
  FAVOUR_ANSWERED: 'favour_answered', // an ally answered your favour call with boats
  DEAL_KEPT: 'deal_kept',             // you honoured an accepted deal
  DEAL_BROKEN: 'deal_broken',         // you accepted a deal and failed to deliver
};

/** Record a domain event for this round. */
export function notify(gs, event) { gs.notifications.push(event); }

/** All boat-help events this round (the newspaper counts the helpers). */
export const boatHelpEvents = (notifications) =>
  (notifications || []).filter((n) => n.type === EVENT.BOATS_SENT || n.type === EVENT.FAVOUR_ANSWERED);

/** Did anyone send boats to the player's town this round? (press reaction) */
export const boatsWereSent = (notifications) => boatHelpEvents(notifications).length > 0;

/** All broken-promise events this round. */
export const betrayalEvents = (notifications) =>
  (notifications || []).filter((n) => n.type === EVENT.DEAL_BROKEN);
