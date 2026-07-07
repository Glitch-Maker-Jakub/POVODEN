// =============================================================================
// POVODEŇ — Game data
// -----------------------------------------------------------------------------
// Single source of truth for the design described in the chapter:
//   - the seven municipalities along a shared river (headwaters -> estuary)
//   - the five investment categories (the "cards")
//   - global balance constants
//
// Kept deliberately as plain data so the academic team can tune balance
// without touching gameplay code (mirrors the game_data.gd separation in the
// Godot build described in the paper, Section 5.1).
// =============================================================================

// Flood severity is an ordered category. Levees shift a municipality DOWN this
// ladder; unmitigated upstream water pushes downstream municipalities UP it.
export const SEVERITY = {
  NONE: 0,
  MINOR: 1,
  MODERATE: 2,
  SEVERE: 3,
  CATASTROPHIC: 4,
};

export const SEVERITY_LABELS = ['None', 'Minor', 'Moderate', 'Severe', 'Catastrophic'];
export const SEVERITY_COLORS = [0x3a7d44, 0x6fb1c4, 0x4a90d9, 0x2f5fb0, 0x16264f];

// -----------------------------------------------------------------------------
// The seven municipalities. `pos` is river order: 1 = headwaters, 7 = estuary.
// `baseBudget` is the per-round municipal budget. Traits encode the strategic
// asymmetries that make cooperation instrumentally rational (Section 4.4).
// `color` is the placeholder identity colour until pixel art is slotted in.
// -----------------------------------------------------------------------------
export const MUNICIPALITIES = [
  {
    id: 'delta',
    name: 'Delta Outpost',
    pos: 1,
    population: 8200,
    baseBudget: 90,
    trait: 'earlyWarning',
    traitName: 'Early Warning',
    traitDesc: 'Levees here give downstream towns a one-round warning (+rescue).',
    color: 0x7a8b99,
  },
  {
    id: 'millington',
    name: 'Millington',
    pos: 2,
    population: 32000,
    baseBudget: 130,
    trait: 'denseHousing',
    traitName: 'Dense Housing',
    traitDesc: 'High population — high casualties if flooded, but high tax revenue.',
    color: 0xc94f4f,
  },
  {
    id: 'greenhaven',
    name: 'Greenhaven',
    pos: 3,
    population: 6400,
    baseBudget: 75,
    trait: 'absorptive',
    traitName: 'Absorptive Capacity',
    traitDesc: 'If left unleveéd, its floodplain soaks up flow and spares downstream.',
    color: 0x5fa052,
  },
  {
    id: 'traders',
    name: "Trader's Reach",
    pos: 4,
    population: 18500,
    baseBudget: 120,
    trait: 'economicEngine',
    traitName: 'Economic Engine',
    traitDesc: 'Damage here cuts every town’s budget next round.',
    color: 0xd9a441,
  },
  {
    id: 'bayview',
    name: 'Bayview',
    pos: 5,
    population: 14000,
    baseBudget: 105,
    trait: 'toxicRisk',
    traitName: 'Toxic Risk',
    traitDesc: 'Flooding releases pollutants that harm Oceana and Final Point.',
    color: 0x8e44ad,
  },
  {
    id: 'oceana',
    name: 'Oceana',
    pos: 6,
    population: 11000,
    baseBudget: 110,
    trait: 'dataVuln',
    traitName: 'Data Vulnerability',
    traitDesc: 'Even minor flooding is catastrophic. Funds the regional research budget.',
    color: 0x16a085,
  },
  {
    id: 'finalpoint',
    name: 'Final Point',
    pos: 7,
    population: 9300,
    baseBudget: 95,
    trait: 'cumulative',
    traitName: 'Cumulative Burden',
    traitDesc: 'Receives all upstream water and cannot pass it on.',
    color: 0x34495e,
  },
];

// -----------------------------------------------------------------------------
// Floodable asset value per municipality, in € millions. This is the EXPOSURE
// that drives economic damage — the headline loss of a real flood. Scaled by
// archetype: dense housing, commercial and high-tech assets are worth far more
// than agricultural floodplain (cheap to lose, per the Greenhaven design).
// (2021 EU floods: ~€46bn damage, 243 deaths — money dominates, deaths are rare.)
// -----------------------------------------------------------------------------
export const EXPOSURE = {
  delta: 130,
  millington: 1400,
  greenhaven: 95,    // cheap farmland — low € damage per hectare
  traders: 1850,     // commercial hub — high value, regional multiplier
  bayview: 1250,     // industry + chemical cleanup costs
  oceana: 2300,      // irreplaceable data/research — highest value
  finalpoint: 270,
};

// -----------------------------------------------------------------------------
// The five investment categories (Section 4.2, Table). Each purchase targets a
// city number, which need not be the player's own — that is the cooperation /
// defection lever.
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// Production chains (the cooperation thesis as supply lines). Each producer city
// makes ONE resource the whole region needs; protect it and that resource keeps
// flowing cheap & plentiful, let it flood and the resource turns SCARCE & COSTLY
// next round (never hard-blocked — a player is punished, not bricked).
//   millington → funds    (its tax base; flooding cuts every town's budget)
//   traders    → concrete → gates LEVEES
//   bayview    → plastic  → gates BOATS
//   greenhaven → relief   → gates LIFE-KITS
//   oceana     → intel    → gates the FORECAST (already wired: oceanaLost)
// Delta and Final Point produce nothing — pure downstream stakes.
// -----------------------------------------------------------------------------
export const PRODUCERS = {
  millington: { res: 'funds' },
  traders: { res: 'concrete', gate: 'levee' },
  bayview: { res: 'plastic', gate: 'boat' },
  greenhaven: { res: 'relief', gate: 'kit' },
  oceana: { res: 'intel', gate: 'forecast' },
};
// item the player buys → the resource it consumes (for the scarcity surcharge).
export const INVEST_RESOURCE = { levee: 'concrete', boat: 'plastic', kit: 'relief' };

export const INVESTMENTS = {
  levee: {
    key: 'levee', name: 'Levee', cost: 30, icon: '▲', color: 0x9aa7b0,
    blurb: 'Permanent. Drops local flood severity by one step — but deflects water downstream.',
    hint: 'Cuts € damage here — but pushes water onto the towns downstream.',
  },
  boat: {
    key: 'boat', name: 'Boat', cost: 15, icon: '⛵', color: 0x4a90d9,
    blurb: 'Raises the rescue (boat) term in the survival model. Mobile.',
    hint: 'Saves lives during the flood. The main way to prevent deaths.',
  },
  kit: {
    key: 'kit', name: 'Life Kit', cost: 10, icon: '✚', color: 0xe74c3c,
    blurb: 'Sustains stranded residents until rescue. Cheap, lower effect than boats.',
    hint: 'Cheap life-saver — sustains people until the boats reach them.',
  },
  fun: {
    key: 'fun', name: 'Fun', cost: 20, icon: '★', color: 0xf1c40f,
    blurb: 'Morale boost. A calm, ordered town keeps its head in a flood.',
    hint: 'Raises morale. Low morale = panic = more deaths when the flood hits.',
  },
  reserve: {
    key: 'reserve', name: 'Reserve', cost: 5, icon: '●', color: 0x95a5a6,
    blurb: 'Bank budget to next round (1:1).',
    hint: 'Bank this budget for next round. Save up for the big floods.',
  },
};

export const INVESTMENT_ORDER = ['levee', 'boat', 'kit', 'fun', 'reserve'];

// -----------------------------------------------------------------------------
// The fifteen power cards (Section 4.3), three rarity tiers of five.
// `target` tells the UI what the card needs:
//   'self'       — applies to the player's own town
//   'choose'     — applies to the currently selected Target City
//   'downstream' — auto-targets the nearest downstream neighbour
//   'upstream'   — auto-targets the nearest upstream neighbour
//   'none'       — global / no target
//   'pact'       — player's town + two chosen others
// Rarer tiers unlock once the regional research budget (funded by protecting
// Oceana) crosses a threshold.
// -----------------------------------------------------------------------------
export const TIER = { COMMON: 'common', UNCOMMON: 'uncommon', RARE: 'rare' };

export const TIER_COLOR = {
  common: 0x6b8aa8,
  uncommon: 0x4a90d9,
  rare: 0xc77dff,
};

// Research budget needed to draw a tier.
export const TIER_UNLOCK = { common: 0, uncommon: 2, rare: 4 };

// Trimmed to 9 clear cards (3 per tier) — fewer, more legible choices.
export const CARDS = [
  // --- Common (from the start) ---
  { id: 'sandbag', name: 'Sandbag Brigade', tier: 'common', target: 'choose',
    blurb: 'A quick wall: +1 levee at the target town, this round only.' },
  { id: 'volunteer', name: 'Volunteer Call', tier: 'common', target: 'self',
    blurb: 'Your boats rescue twice as many this round — but morale −15.' },
  { id: 'drill', name: 'Public Drill', tier: 'common', target: 'self',
    blurb: '+18 morale and a free life kit at your town.' },

  // --- Uncommon (research ≥ 2) ---
  { id: 'decree', name: 'Emergency Decree', tier: 'uncommon', target: 'self',
    blurb: 'Override the council: +30 budget now, −8 morale.' },
  { id: 'grant', name: 'Resilience Grant', tier: 'uncommon', target: 'self',
    blurb: 'Permanent +1 levee at your town and your two downstream neighbours.' },
  { id: 'evac', name: 'Evacuation Order', tier: 'uncommon', target: 'self',
    blurb: 'Halve your town’s flood casualties this round. −10 morale, −20 budget.' },

  // --- Rare (research ≥ 4) ---
  { id: 'pact', name: 'Regional Solidarity Pact', tier: 'rare', target: 'pact',
    blurb: 'You + two downstream towns pool boats this round. Signatories won’t defect.' },
  { id: 'bailout', name: 'Central-Government Bailout', tier: 'rare', target: 'self',
    blurb: '+120 budget now — but a post-campaign audit penalises your final score.' },
  { id: 'diversion', name: 'Upstream Diversion', tier: 'rare', target: 'upstream',
    blurb: 'Shove the flood back: −2 severity here, +2 on an upstream neighbour. Breaks trust.' },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

// -----------------------------------------------------------------------------
// The mayors. Each municipality is run by a named, characterised person, so the
// AI towns read as allies or rivals rather than anonymous algorithms.
// -----------------------------------------------------------------------------
export const MAYORS = {
  delta:      { name: 'Mayor Hájek',     title: 'the Sentinel',   blurb: 'Watches the water and warns early.' },
  millington: { name: 'Mayor Dvořáková', title: 'the Pragmatist', blurb: 'Runs the numbers; protects her crowds.' },
  greenhaven: { name: 'Mayor Sedlák',    title: 'the Steward',    blurb: 'Trusts the floodplain and the commons.' },
  traders:    { name: 'Mayor Beneš',     title: 'the Merchant',   blurb: 'Guards commerce; bargains hard.' },
  bayview:    { name: 'Mayor Kovář',     title: 'the Exposed',    blurb: 'Anxious, chemical-bound, needs allies.' },
  oceana:     { name: 'Mayor Marek',     title: 'the Technocrat', blurb: 'Data first; everything is a transaction.' },
  finalpoint: { name: 'Mayor Horáková',  title: 'the Stoic',      blurb: 'Bears the burden; never forgets.' },
};

// -----------------------------------------------------------------------------
// Hidden agendas — shuffled onto the AI mayors at the start of each game so the
// regional politics differ every playthrough. coopMod shifts baseline
// cooperativeness; reciprocity scales how strongly they mirror your treatment.
// -----------------------------------------------------------------------------
export const AGENDAS = [
  { id: 'cooperator',  label: 'Solidarity',  desc: 'Believes the region rises or drowns together.', coopMod: 0.25, reciprocity: 0.3 },
  { id: 'survivalist', label: 'Self-first',  desc: 'Will not lift a finger until its own town is safe.', coopMod: -0.2, reciprocity: 0.1 },
  { id: 'freerider',   label: 'Free-rider',  desc: 'Happy to take help, slow to give it.', coopMod: -0.15, reciprocity: -0.25 },
  { id: 'reciprocator',label: 'Tit-for-tat', desc: 'Repays kindness and punishes slights in kind.', coopMod: 0.0, reciprocity: 0.5 },
  { id: 'opportunist', label: 'Opportunist', desc: 'Backs whoever looks like winning.', coopMod: 0.05, reciprocity: 0.2 },
  { id: 'grudge',      label: 'Long memory', desc: 'Forgives nothing; betrayal is permanent.', coopMod: 0.1, reciprocity: 0.4 },
];

// -----------------------------------------------------------------------------
// Regional event deck. One card is drawn each round and applied at the start of
// preparation, so no two playthroughs unfold the same way. `apply(gs)` mutates
// game state; severity-shifting events change the already-drawn (but still
// forecast-only) flood for this round.
// -----------------------------------------------------------------------------
const clampSev = (s) => Math.max(0, Math.min(4, s));

export const EVENTS = [
  { id: 'calm', name: 'A Quiet Week', desc: 'Nothing stirs on the river. Plan in peace.',
    apply: () => {} },
  { id: 'damrelease', name: 'Upstream Dam Release', desc: 'A reservoir spilled overnight — this flood runs one step worse.',
    apply: (gs) => { gs.upcomingSeverity = clampSev(gs.upcomingSeverity + 1); } },
  { id: 'dryspell', name: 'Dry Spell', desc: 'The river runs low this season — the flood is one step milder.',
    apply: (gs) => { gs.upcomingSeverity = clampSev(gs.upcomingSeverity - 1); } },
  { id: 'eugrant', name: 'EU Recovery Grant', desc: 'Just Transition funds arrive — every town gains €30 budget.',
    apply: (gs) => { gs.munis.forEach((m) => { m.budget += 30; }); } },
  { id: 'volunteers', name: 'Volunteer Surge', desc: 'Citizens turn out in force — every town gets a free boat this round.',
    apply: (gs) => { gs.munis.forEach((m) => { m.stock.boat += 1; }); } },
  { id: 'solidarity', name: 'Solidarity Wave', desc: 'A wave of regional goodwill — every mayor warms to you.',
    apply: (gs) => { Object.keys(gs.relationship).forEach((id) => { gs.relationship[id] = Math.min(100, gs.relationship[id] + 8); }); } },
  { id: 'scandal', name: 'Political Scandal', desc: 'A graft scandal rocks a riverside town hall — morale and trust fall there.',
    apply: (gs) => {
      const ai = gs.munis.filter((m) => !m.isPlayer && !m.destroyed);
      if (!ai.length) return;
      const t = ai[Math.floor(gs.rng() * ai.length)];
      t.morale = Math.max(0, t.morale - 25);
      if (gs.relationship[t.id] != null) gs.relationship[t.id] = Math.max(0, gs.relationship[t.id] - 12);
    } },
  { id: 'forecastgift', name: 'Clear-Skies Briefing', desc: 'The meteorological office shares a sharp forecast — free this round.',
    apply: (gs) => { gs.forecastLevel = BALANCE.forecast.maxLevel; } },
  { id: 'freeze', name: 'Budget Freeze', desc: 'Austerity: no budget can be reserved for later this round.',
    apply: (gs) => { gs.eventFlags.noReserve = true; } },
  { id: 'mediastorm', name: 'Media Storm', desc: 'Cameras everywhere — helping neighbours costs no political capital this round.',
    apply: (gs) => { gs.eventFlags.freeCoop = true; } },
  { id: 'inspection', name: 'Chemical Inspection', desc: 'Bayview is forced to spend on safety: −€40 there, but no toxic spill this round.',
    apply: (gs) => { const b = gs.munis.find((m) => m.id === 'bayview'); if (b) b.budget = Math.max(0, b.budget - 40); gs.eventFlags.noToxic = true; } },
];

export const RELATIONSHIP = {
  start: 50,            // neutral
  allyAt: 66,
  rivalAt: 34,
  coopGain: 12,        // you invested in their town
  cardGain: 8,         // you played a helpful card on them
  diversionLoss: 30,   // you redirected the flood onto them
  dealKept: 15,
  dealBroken: 25,
  declineLoss: 4,      // you turned down their request
};

// -----------------------------------------------------------------------------
// Global balance constants. Tunable.
// -----------------------------------------------------------------------------
export const BALANCE = {
  totalRounds: 10,

  // --- Card / action economy ---
  handCap: 4,                  // most cards you can hold at once (hold-vs-play)
  initialHand: 2,              // cards dealt at the start
  drawPerRound: 1,             // new cards drawn each round (you keep the rest)
  politicalCapital: 2,         // influence actions per round (does not carry over)
  cardPcCost: 1,               // political capital to play a card
  coopPcCost: 1,               // political capital to invest in ANOTHER town
  researchPerSafeOceana: 1,    // research budget gained per round Oceana survives
  bailoutScorePenalty: 250,    // €M penalty added to final score by a bailout audit
  tierWeights: { common: 0.6, uncommon: 0.3, rare: 0.1 }, // draw weighting (within unlocked)

  // --- Economic damage (the headline loss). Fraction of a town's EXPOSURE (€M)
  // wrecked at each effective severity. Levees lower effective severity, so they
  // cut damage. This is what the player is really fighting. ---
  economic: {
    damageBySeverity: [0.0, 0.015, 0.06, 0.20, 0.40],
    oceanaDataLoss: 0.6,       // extra fraction of Oceana exposure lost if inundated
    toxicSpillDamage: 90,      // €M cleanup forced on each downstream town if Bayview floods
  },

  // Per-round regional severity draw (Section 3.1). Probabilities are i.i.d.
  // across rounds — there is deliberately NO exploitable pattern to learn.
  // Calibrated so a 10-round campaign yields ~1–2 severe/catastrophic events.
  severityWeights: {
    [SEVERITY.NONE]: 0.18,
    [SEVERITY.MINOR]: 0.34,
    [SEVERITY.MODERATE]: 0.30,
    [SEVERITY.SEVERE]: 0.13,
    [SEVERITY.CATASTROPHIC]: 0.05,
  },

  // River coupling (the heart of the cooperation dilemma).
  // A levee protects its own town but deflects a fraction of that water onto
  // everyone downstream. Greenhaven's floodplain absorbs flow if not leveed.
  leveeDeflection: 0.5,      // severity-steps pushed downstream per local levee
  absorptionRelief: 1.0,     // severity-steps Greenhaven soaks up when unleveed
  cumulativeBurden: 0.5,     // extra steps Final Point suffers from accumulated flow

  // Lotka–Volterra rescue model (Section 3.2).
  lv: {
    steps: 24,               // simulation timesteps per flood
    growth: 1.18,            // logistic growth coefficient `a` of the death term
    // Fraction of population physically in harm's way, by effective severity.
    atRiskBySeverity: [0.0, 0.02, 0.10, 0.30, 0.60],
    // Of those at risk, the share in genuine MORTAL danger. Kept low: in a modern
    // context floods are an economic disaster, not a massacre.
    lethalityBySeverity: [0.0, 0.012, 0.05, 0.16, 0.38],
    // Baseline emergency response (early warning, fire/rescue) that saves people
    // even with zero player investment — BUT it is scaled by town morale. A town
    // in chaos (morale ~0) loses this safety net, so a reckless player who lets a
    // town collapse AND skips rescue can still cause mass casualties.
    baselineRescueFrac: 0.72,
    boatAmplitude: 0.16,     // share rescuable per boat, at the profile peak
    kitAmplitude: 0.07,      // share sustainable per kit, at the profile peak
    profileSpread: 6.0,      // Gaussian-in-time spread of rescue effort
    noiseAmplitude: 0.12,    // how strongly zeta-gap noise perturbs effectiveness
  },

  meetingCost: 15,           // budget cost to convene a Regional Meeting (reveal neighbours)

  // Forecast — readable, bettable uncertainty. The flood is pre-drawn but hidden;
  // the forecast shows a band around it that you can pay to narrow toward the
  // truth. Prepare blind and cheap, or buy certainty and prepare precisely.
  forecast: { sharpenCost: 10, maxLevel: 2 },

  // Favours — spend the TRUST you've built with an ally to call in help. Turns a
  // passive relationship stat into an active, spendable resource.
  favour: { minRel: 55, relCost: 20, pcCost: 1, boats: 2 },

  // Reserve earns interest (an incentive to save up for big purchases) but
  // hoarding instead of helping ANGERS the public (−morale). Applies to the
  // player only; AI banking is unchanged.
  reserveInterest: 1.5,        // €5M reserved → ~€8M next round
  reserveMoraleCost: 3,        // per reserve bought
  // Fun/Celebration is a big approval (morale) boost — but a festival in flood
  // season leaves people exposed, so it RAISES this round's at-risk fraction.
  funMorale: 20,
  funRisk: 1.4,                // ×at-risk for the town this round (the gamble)

  // Cooperation dividend — helping a neighbour or keeping a deal wins your own
  // voters (morale) AND earns extra political capital next round, so cooperating
  // compounds: the more you help, the more you CAN help.
  coopVote: 2,                 // own-town morale per cooperative act (votes)
  coopDividend: 1,             // extra ⚡ next round if you cooperated this round

  // Equipment attrition — boats & life-kits PERSIST as town stock, but floods
  // sink/wreck them by effective severity. So you build a fleet, a big flood
  // dents it, and pooling boats with neighbours beats hoarding in one town.
  // lossFrac indexed by effective severity 0..4 (NONE..CATASTROPHIC).
  attrition: {
    boat: [0, 0, 0, 0.30, 0.55],      // none below Severe; ~30% sunk at Severe, 55% at Catastrophic
    kit: [0, 0.15, 0.30, 0.50, 0.70], // flimsier consumables, wrecked even in minor floods
  },

  // Production scarcity — when a producer city floods (eff ≥ MODERATE) its
  // resource is short NEXT round: gated items cost more and are capped. A
  // destroyed producer cuts the resource (steeper surcharge). One safe round
  // clears it (scarcity is recomputed each flood). Never a hard block.
  scarcity: { surcharge: 1.5, cutSurcharge: 2.0, cap: 2 },
};
