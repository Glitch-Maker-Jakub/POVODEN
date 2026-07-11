// =============================================================================
// POVODEŇ — Game state: public model API
// -----------------------------------------------------------------------------
// Pure logic, no Phaser. The scenes and the AI import ONLY this module (and
// floodModel/rng where they need those directly) — the domain internals live
// in the sibling modules and may be reorganised freely behind this façade:
//
//   state.js      phase machine constants, pending effects, selectors
//   events.js     typed domain events (the model writes no user-facing text)
//   economy.js    investments, scarcity, purchases
//   diplomacy.js  agendas, deals, favours, the Regional Meeting
//   cards.js      hand economy and tier unlocks (effects: cardEffects.js)
//   round.js      forecast, regional events, flood resolution, round advance
//   scoring.js    the regional score
//
// The import graph is a DAG (enforced by tests/architecture.test.js); the
// state machine and field ownership are documented in
// docs/architecture/model.md.
// =============================================================================

import { MUNICIPALITIES, BALANCE, EXPOSURE, RELATIONSHIP, EVENTS } from '../data/gameData.js';
import { PHASE, initPending } from './state.js';
import { assignAgendas, generateProposals } from './diplomacy.js';
import { dealCards } from './cards.js';
import { startRoundEnvironment } from './round.js';
import { shuffle } from './rng.js';

export { PHASE, initPending, muniById, playerMuni, isRevealed, oceanaLost, relationshipLabel, adjustRelationship } from './state.js';
export { EVENT, notify, boatHelpEvents, boatsWereSent, betrayalEvents } from './events.js';
export { scarcityMult, investmentCost, canAfford, canInvest, purchase } from './economy.js';
export {
  canAskFavour, askFavour, generateProposals, acceptProposal, declineProposal,
  holdMeeting, meetingAffordable,
} from './diplomacy.js';
export { unlockedTiers, dealCards, canPlayCard, playCard } from './cards.js';
export {
  forecastBand, canSharpenForecast, sharpenForecast,
  previewFlood, resolveRound, advanceRound,
} from './round.js';
export { regionalScore } from './scoring.js';

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
    notifications: [],         // typed domain events this round (events.js)
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
