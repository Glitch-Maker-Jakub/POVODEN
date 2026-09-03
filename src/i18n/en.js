// =============================================================================
// POVODEŇ — English UI catalog. Counterpart: cs.js.
// Keys must stay in 1:1 parity with the other language, with identical
// {placeholder} sets — tests/i18n.test.js enforces both in CI.
// Town and mayor NAMES are proper nouns shared by both languages by design.
// =============================================================================

export default {
    'loading': 'Loading…',
    // --- Menu -------------------------------------------------------------
    'menu.subtitle': 'F L O O D',
    'menu.tagline': 'A serious game of flood crisis management and\ninter-municipal cooperation on a shared river.',
    'menu.choose': 'Choose your municipality:',
    'menu.start': '▶  START CAMPAIGN',
    'menu.howto': 'HOW TO PLAY',
    'menu.footer': '10 rounds · prepare, then weather the flood · cooperation beats walls',
    'menu.switchLang': 'Čeština',

    // --- How to play (5 pages) -------------------------------------------
    'howto.title': 'HOW TO PLAY',
    'howto.back': '◀ BACK',
    'howto.next': 'NEXT ▶',
    'howto.toMenu': 'TO MENU',
    'howto.1.title': 'You are a mayor on a shared river',
    'howto.1.body':
      'Seven towns sit on one river, from the headwaters (1) to the estuary (7).\n' +
      'You run one of them. Over ten flood seasons your job is to keep the\n' +
      'whole region’s DAMAGE (in €) and DEATHS as low as you can.\n\n' +
      'The twist: it is a shared river. Local self-interest drowns the region —\n' +
      'cooperation beats walls. That is the whole game.',
    'howto.2.title': 'Each round: prepare, then weather the flood',
    'howto.2.body':
      'Spend your budget (in €M, the same unit as the damage you prevent) on:\n' +
      '  ▲ Levee   — cuts flood damage to a town… but pushes water DOWNSTREAM.\n' +
      '  ⛵ Boat / ✚ Life Kit — save lives during the flood (yours to keep, round to round).\n' +
      '  ★ Fun     — morale (a town in chaos loses its emergency response).\n\n' +
      'Read the Forecast (top bar). It is a band — pay €10M to SHARPEN it toward\n' +
      'the truth. Prepare blind and cheap, or buy certainty and prepare precisely.',
    'howto.3.title': 'You cannot do everything',
    'howto.3.body':
      'Political Capital ⚡ (2 per round) limits how much you can reach beyond\n' +
      'your own town. Investing in YOUR town is free. Helping ANOTHER town, or\n' +
      'playing a power card, each costs ⚡.\n\n' +
      'So every round you must choose: who do I help, and which card do I spend?\n' +
      'Cards are kept in hand across rounds — time them well.',
    'howto.4.title': 'The other mayors are players, not scenery',
    'howto.4.body':
      'The six AI towns are run by mayors with names, personalities and HIDDEN\n' +
      'agendas that change every game. A relationship meter tracks how each one\n' +
      'regards you.\n\n' +
      'Fund their town or keep a deal → they warm to you and send boats to YOUR\n' +
      'town. Divert the flood onto them or break a promise → they turn on you.\n' +
      'Each round one mayor offers a DEAL — accept and honour it, or decline.\n' +
      'Call a Regional Meeting (€15M) to see what everyone is secretly planning.',
    'howto.5.title': 'No two seasons are the same',
    'howto.5.body':
      'A random regional EVENT hits every round — a grant, an upstream dam\n' +
      'release, a scandal, a volunteer surge. And the flood itself is random:\n' +
      'you can forecast THIS year’s flood, but never predict the next one.\n' +
      '“We’ve been fine for years” tells you nothing.\n\n' +
      'Good luck, Mayor. The river is patient.',

    // --- How-to-play DIAGRAM (action → cause → advantage) -----------------
    'diagram.title': 'How your choices play out',
    'diagram.colAction': 'YOU DO',
    'diagram.colCause': 'WHICH CAUSES',
    'diagram.colAdv': 'GIVING YOU',
    'diagram.levee.act': 'Levee',
    'diagram.levee.cause': 'Cuts your town’s € damage — but shoves water DOWNSTREAM onto neighbours',
    'diagram.levee.adv': 'Less money lost (worth it on valuable towns, a waste on cheap floodplain)',
    'diagram.boatkit.act': 'Boats & Kits',
    'diagram.boatkit.cause': 'Rescue people in the flood — and they stay yours, round to round',
    'diagram.boatkit.adv': 'Fewer deaths — the lives you save',
    'diagram.fun.act': 'Fun',
    'diagram.fun.cause': 'Lifts morale & public approval — but a festival leaves people exposed',
    'diagram.fun.adv': 'Re-election rises (a gamble if a flood hits that season)',
    'diagram.reserve.act': 'Reserve',
    'diagram.reserve.cause': 'Banks money +50% for next round — but hoarding instead of helping angers people',
    'diagram.reserve.adv': 'Save up for the big, expensive defences',
    'diagram.coop.act': 'Help / Deals',
    'diagram.coop.cause': 'Fund a neighbour or keep a deal (costs ⚡ political capital)',
    'diagram.coop.adv': 'Allies warm to you and send boats back to YOUR town',
    'diagram.producers.act': 'Protect makers',
    'diagram.producers.cause': 'Keep a producer city safe — it supplies concrete, plastic or flood intel',
    'diagram.producers.adv': 'Your gear stays cheap & available',
    'diagram.goal': 'GOAL: keep the WHOLE region’s € damage and deaths low — that is your SCORE, and cooperation beats walls. Your own town’s safety drives your RE-ELECTION.',

    // --- Scoreboard ---------------------------------------------------------
    'menu.scoreboard': 'SCOREBOARD',
    'score.title': 'SCOREBOARD',
    'score.all': 'ALL TIME',
    'score.month': 'THIS MONTH',
    'score.week': 'THIS WEEK',
    'score.colName': 'MAYOR',
    'score.colTown': 'TOWN',
    'score.colScore': 'SCORE',
    'score.loading': 'Loading…',
    'score.empty': 'No campaigns recorded yet — be the first mayor on the board.',
    'score.offline': 'Scoreboard server not reachable — the game plays fine without it.',
    'score.submit': 'SUBMIT SCORE  ▶',
    'score.namePrompt': 'Your name for the scoreboard:',
    'score.ok': 'SUBMIT',
    'score.cancel': 'CANCEL',
    'score.submitted': 'Saved — rank #{all} all-time · #{month} this month · #{week} this week',
    'score.submitFail': 'Could not reach the scoreboard server — score not saved.',

    // --- Credits ------------------------------------------------------------
    'menu.credits': 'CREDITS',
    'credits.title': 'CREDITS',
    'credits.fundingHead': 'FUNDING & INSTITUTIONS',
    'credits.funding': 'Developed under the RUR — Region to University, University to Region strategic project (CZ.10.02.01/00/22_002/0000210) at Jan Evangelista Purkyně University (UJEP), Ústí nad Labem, funded by the Operational Programme Just Transition (EU Just Transition Fund), with the institutional support of the UJEP Faculty of Social and Economic Studies.',
    'credits.teamHead': 'TEAM',
    'credits.role.binter': 'training accuracy & measurement, formative evaluation, models; built the game and directed the coding agents; first draft',
    'credits.role.prossinger': 'training accuracy & measurement, formative evaluation; hydrological-statistical & rescue models; first draft',
    'credits.role.models': 'hydrological-statistical and rescue models; flood-domain validity',
    'credits.role.riha': 'serious-games and game-development expertise',
    'credits.role.eck': 'game-design critique and engagement direction',
    'credits.role.grasl': 'pixel-art zero-build browser-game base; coding-agent and model-use consultations',
    'credits.agent': 'Implementation, balancing, localization and verification were carried out by a large-language-model coding agent (Anthropic Claude Opus 4.7 / 4.8) under the team’s direction — all design authority rested with the human team.',
    'credits.thanks': 'With thanks to the three independent play testers whose sessions shaped the game’s onboarding and pacing, and to the audiences and reviewers of Videogame Cultures 2025.',
    'credits.license': 'Free software under the GNU Affero General Public License v3.0 · github.com/Glitch-Maker-Jakub/POVODEN',

    // --- Research consent (opt-in telemetry) --------------------------------
    'research.title': '🔬  HELP OUR RESEARCH?',
    'research.body':
      'POVODEŇ is part of a university research project on cooperation in flood management. ' +
      'With your consent, the game will record your in-game decisions (investments, deals, ' +
      'meetings) and round outcomes, so we can study how play changes across campaigns.\n\n' +
      'Anonymous by design: a random ID is created in your browser — no name, no e-mail, ' +
      'no personal data. You can turn this off at any time on the menu, and you can request ' +
      'deletion of your data using your ID (shown on the menu).\n\n' +
      'May we record your gameplay for research?',
    'research.yes': 'YES, I’LL HELP',
    'research.no': 'NO, JUST PLAY',
    'research.on': '🔬 Research: ON',
    'research.off': '🔬 Research: OFF',
    'research.id': 'research ID: {id}',

    // --- HUD / top bar ----------------------------------------------------
    'hud.round': 'ROUND {n} / {total}',
    'hud.prep': '● PREPARATION',
    'hud.floodPhase': '▶ FLOOD PHASE',
    'hud.flood': 'FLOOD: {sev}',
    'hud.forecastBand': 'Forecast: {low}–{high}',
    'hud.forecastExact': 'Forecast: {sev} (confirmed)',
    'hud.forecastBlind': 'Forecast: no data (Oceana)',
    'hud.sharpen': 'Sharpen €10M',

    // --- Regional meeting / diplomacy ------------------------------------
    'meeting.call': 'CALL REGIONAL MEETING · €15M',
    'meeting.viewTable': '▦  OPEN FLOOD PLANNING TABLE',
    'meeting.held': 'Meeting convened — neighbours’ plans revealed this round',
    'meeting.hidden': 'Neighbours’ plans are hidden — convene to reveal allies & rivals',
    'table.title': 'FLOOD PLANNING — projected outcomes',
    'table.subtitle': 'What each flood level would cost every town, given today’s preparations.',
    'table.town': 'TOWN',
    'table.region': 'REGION (total)',
    'table.close': 'CLOSE',
    'deal.offered': '✉  DEAL OFFERED',
    'deal.accept': 'ACCEPT',
    'deal.decline': 'DECLINE',
    'deal.text': '{mayor} asks you to fund a {inv} in {town} this round — and {reward}.',
    'deal.reward.cooperator': 'will send 2 boats to your town next round',
    'deal.reward.opportunist': 'will forward €20M to your coffers next round',
    'deal.reward.reciprocator': 'will remember the favour and stand with you',
    'deal.reward.grudge': 'will count it as a debt repaid in full',
    'deal.reward.freerider': 'offers warm words and little else',
    'deal.reward.default': 'will think well of you',

    // --- Right panel ------------------------------------------------------
    'panel.prepTitle': 'PREPARATION · {town}',
    'panel.budget': 'Budget: €{n}M',
    'panel.assets': '▲{lev}  ⛵{boat}  ✚{kit}     ⚡{pc}/{max}     🔬{r}',
    'panel.scarce': '⚠ {res}',
    'panel.cut': '✗ {res}',
    'res.concrete': 'concrete', 'res.plastic': 'plastic', 'res.relief': 'relief', 'res.intel': 'intel', 'res.funds': 'funds',
    'prod.dep.concrete': 'Makes the region’s CONCRETE → levees. If it floods, levees cost +50% & are limited next round.',
    'prod.dep.plastic': 'Makes the PLASTIC for boats. If it floods, boats cost +50% & are limited next round.',
    'prod.dep.relief': 'Makes RELIEF for life-kits. If it floods, kits cost +50% & are limited next round.',
    'prod.dep.intel': 'Supplies flood INTEL → the forecast. If it floods, you forecast blind.',
    'prod.dep.funds': 'The region’s tax base. If it floods, every town’s budget falls next round.',
    'inv.prevents': 'prevents ~€{n}M', 'inv.savesLives': 'saves lives', 'inv.scarce': '⚠ {res} short',
    'tip.forecast': 'The likely flood this season, shown as a RANGE. Pay to Sharpen it toward the exact value. Lose Oceana and you forecast blind.',
    'tip.sharpen': 'Narrow the forecast band toward the true flood (€10M).',
    'tip.budget': 'Money to spend this season (€M) — the SAME unit as the damage you prevent, so you can weigh cost vs. benefit.',
    'tip.ledger': 'Capital ⚡ (to help others / play cards), Levees ▲, Boats ⛵, Kits ✚ (kept round to round). 🔬 research unlocks rarer cards. ⚠/✗ = a resource is scarce/cut because its producer city flooded.',
    'tip.event': 'A random regional event this season — it can shift the flood, budgets, or relationships.',
    'tip.meeting': 'Pay €15M to reveal neighbours’ plans AND open a table projecting every flood level’s damage to each town.',
    'panel.targetCity': 'TARGET CITY',
    'panel.invest': 'INVEST  (click a town to retarget)',
    'panel.yourTown': '  (your town)',
    'panel.coop': '  ← COOPERATION',
    'panel.investHintDefault': 'Invest in YOUR town for free; helping another town costs ⚡ capital. Hover an option to see what it does.',
    'panel.statsRevealed': 'pop {pop} · ▲{lev} ⛵{b} ✚{k} · morale {m}',
    'panel.statsHidden': 'pop {pop} · ?  — call a meeting to reveal',
    'panel.mayorLine': '{name} ({title}) — you are: {rel}',
    'panel.weather': 'WEATHER THE FLOOD  ▶',
    'panel.askFavour': 'ASK A FAVOUR',
    'panel.favourBtn': 'ASK {surname} FOR {n} BOATS · ⚡{pc}',

    // --- Power cards ------------------------------------------------------
    'cards.header': 'POWER CARDS — play before the flood (rarer cards unlock with research)',
    'tier.common': 'common',
    'tier.uncommon': 'uncommon',
    'tier.rare': 'rare',

    // --- Advisor ----------------------------------------------------------
    'advisor.title': '⚑  YOUR ADVISOR',
    'advisor.gotit': 'GOT IT  ▶',
    'advisor.1':
      'Welcome, Mayor. Over ten flood seasons your job is to keep DAMAGE (€) and ' +
      'DEATHS low across ALL SEVEN towns — the region is judged together.\n\n' +
      'The river is calm this first season — a chance to learn. Remember: a Levee ' +
      'cuts your town’s damage but shoves water DOWNSTREAM onto your neighbours. ' +
      'Boats and Life Kits save lives. Cooperation beats walls.',
    'advisor.2':
      'You can play this two ways:\n\n' +
      '• Go it alone — protect only your own town. Cheap, but the water you deflect ' +
      'drowns the towns below, and the regional score suffers.\n' +
      '• Cooperate — fund neighbours and keep deals. It costs Political Capital ⚡, ' +
      'but allies send boats back to you and regional losses fall sharply.\n\n' +
      'You needn’t save every town every year. Sometimes a controlled loss upstream ' +
      'spares a catastrophe below. The choice is yours.',
    'advisor.3':
      'From next season the river turns dangerous. Watch the Forecast — pay to ' +
      'Sharpen it when you’re unsure — build your relationships now, and decide ' +
      'who you will stand with when the great flood finally comes.',
    'advisor.oceanaLost':
      'Oceana’s data hub has been destroyed. With it goes the region’s flood ' +
      'intelligence — there will be NO forecast for the rest of the campaign. ' +
      'Every remaining season is now a gamble in the dark.\n\n' +
      'This is why the data city matters: protect it, and you see the water ' +
      'coming. Lose it, and you prepare blind.',

    // --- Summary / newspaper chrome --------------------------------------
    'summary.next': 'NEXT EDITION  ▶',
    'summary.review': 'THE SEASON IN REVIEW — what the record shows',
    'summary.toBriefing': 'YOUR PRIVATE BRIEFING  ▶',

    // --- Final private briefing (your city only) -------------------------
    'brief.title': 'CONFIDENTIAL · OFFICE OF THE MAYOR',
    'brief.subtitle': 'Internal briefing — {town}',
    'brief.score': 'REGIONAL SCORE',
    'brief.grade': 'GRADE {grade}',
    'brief.reelection': 'Re-election chance',
    'brief.mood': 'Public mood',
    'brief.livesOwn': 'Lives lost — your town',
    'brief.livesRegion': 'Lives lost — whole region',
    'brief.damageOwn': 'Damage — your town',
    'brief.damageRegion': 'Damage — whole region',
    'brief.again': '↻  PLAY AGAIN',
    'mood.furious': 'Furious',
    'mood.anxious': 'Anxious',
    'mood.steady': 'Steady',
    'mood.hopeful': 'Hopeful',
    'mood.grateful': 'Grateful',
    'brief.verdict.coop': 'You protected the whole valley, not just your own streets. This is the cooperative outcome the model — and the real region — rewards.',
    'brief.verdict.parochial': 'You saved your own town and kept your seat — but the water you turned away drowned the towns downstream. A re-elected mayor of a poorer region.',
    'brief.verdict.mixed': 'A mixed record: the region mostly held, but the burden fell unevenly and some neighbours will remember it.',
    'brief.verdict.poor': 'The water went downstream and the damage piled up — the go-it-alone status quo the 2002 and 2013 floods exposed.',

    // --- Per-round private "Mayor's note" (in the newspaper) -------------
    'brief.note': 'YOUR OFFICE — PRIVATE',
    'briefRound.standing': 'Re-election {pct}% {arrow}   ·   Mood: {mood}',
    'briefRound.townVsRegion': 'Your town: {ownDmg} · {ownDeaths}      Region: {regionDmg} · ☠{regionDeaths}',
    'briefRound.lost': '☠{n}',
    'briefRound.noLives': 'no lives lost',
    'briefRound.onramp': 'Calm waters — your story as mayor begins when the river first rises.',
    'brief.adv.deaths': 'Your town lost lives — boats and life-kits, not walls, save people. Buy a few.',
    'brief.adv.falling': 'Approval is slipping — keep your own town’s homes and lives safe to win voters back.',
    'brief.adv.panic': 'Low morale becomes panic in a flood — fund Fun, or expect more losses.',
    'brief.adv.blind': 'No forecast left (Oceana gone) — prepare for the worst case, not the average.',
    'brief.adv.parochial': 'Your seat is safe, the valley is not — fund one neighbour; allies send boats back.',
    'brief.adv.favour': 'A neighbour trusts you — next round you can ask an ally for boats (⚡1).',
    'brief.adv.hoard': 'Unspent budget protects no one — invest, reserve, or build a levee now.',
    'brief.adv.steady': 'Well run — keep spreading help up and down the valley; the score rewards everyone.',
    'summary.cap.calm': '— calm waters —',
    'summary.cap.mild': '— the river rises —',
    'summary.cap.damage': '— streets underwater —',
    'summary.cap.disaster': '— rescue and ruin —',

    // --- Transient flash messages ----------------------------------------
    'flash.dealStruck': 'Deal struck with {mayor} — keep your word this round.',
    'flash.declined': 'You turned down {mayor}.',
    'flash.meetingConvened': 'Regional meeting convened — neighbours revealed this round',
    'flash.meetingFail': 'Cannot convene a meeting right now',
    'flash.favourCalled': 'Favour called in from {mayor} — boats on the way.',
    'flash.sharpened': 'Forecast sharpened.',
    'flash.coopDividend': 'Cooperation paid off — voters approve and you gained +1 capital this round.',
    'flash.invested': '{inv} → {town}',
    'flash.cardPlayed': 'Played {card}',
    'flash.cardReserves': '{card} · {audit} reserves: €{banked}M',
    'flash.cardNoTarget': '{card} has no valid target right now',

    // --- Status words on the map -----------------------------------------
    'map.headwaters': '⛰ headwaters',
    'map.estuary': 'estuary 🌊',
    'map.you': 'YOU',
    'map.minor': 'minor',
    'map.dry': 'dry',
    'map.dataLost': 'DATA LOST',
    'map.unknown': '· ? ·',

    // --- Severities -------------------------------------------------------
    'sev.0': 'None', 'sev.1': 'Minor', 'sev.2': 'Moderate', 'sev.3': 'Severe', 'sev.4': 'Catastrophic',

    // --- Relationship -----------------------------------------------------
    'rel.ally': 'ally', 'rel.neutral': 'neutral', 'rel.rival': 'rival',

    // --- Investments ------------------------------------------------------
    'inv.levee.name': 'Levee',
    'inv.levee.hint': 'Cuts € damage here — but pushes water onto the towns downstream.',
    'inv.boat.name': 'Boat',
    'inv.boat.hint': 'Saves lives during the flood. The main way to prevent deaths.',
    'inv.kit.name': 'Life Kit',
    'inv.kit.hint': 'Cheap life-saver — sustains people until the boats reach them.',
    'inv.fun.name': 'Fun',
    'inv.fun.hint': 'Big morale & approval boost — but a festival leaves people exposed, so it’s riskier if a flood hits the same season.',
    'inv.reserve.name': 'Reserve',
    'inv.reserve.hint': 'Banks with 50% interest for next round — but hoarding instead of helping angers your people (−morale).',

    // --- Cards ------------------------------------------------------------
    'card.sandbag.name': 'Sandbag Brigade',
    'card.sandbag.blurb': 'A quick wall: +1 levee at the target town, this round only.',
    'card.volunteer.name': 'Volunteer Call',
    'card.volunteer.blurb': 'Your boats rescue twice as many this round — but morale −15.',
    'card.drill.name': 'Public Drill',
    'card.drill.blurb': '+18 morale and a free life kit at your town.',
    'card.decree.name': 'Emergency Decree',
    'card.decree.blurb': 'Override the council: +30 budget now, −8 morale.',
    'card.grant.name': 'Resilience Grant',
    'card.grant.blurb': 'Permanent +1 levee at your town and your two downstream neighbours.',
    'card.evac.name': 'Evacuation Order',
    'card.evac.blurb': 'Halve your town’s flood casualties this round. −10 morale, −20 budget.',
    'card.pact.name': 'Regional Solidarity Pact',
    'card.pact.blurb': 'You + two downstream towns pool boats this round. Signatories won’t defect.',
    'card.bailout.name': 'Central-Government Bailout',
    'card.bailout.blurb': '+120 budget now — but a post-campaign audit penalises your final score.',
    'card.diversion.name': 'Upstream Diversion',
    'card.diversion.blurb': 'Shove the flood back: −2 severity here, +2 on an upstream neighbour. Breaks trust.',

    // --- Mayor titles (names are proper nouns, unchanged) ----------------
    'mayor.delta.title': 'the Sentinel',
    'mayor.millington.title': 'the Pragmatist',
    'mayor.greenhaven.title': 'the Steward',
    'mayor.traders.title': 'the Merchant',
    'mayor.bayview.title': 'the Exposed',
    'mayor.oceana.title': 'the Technocrat',
    'mayor.finalpoint.title': 'the Stoic',

    // --- Events -----------------------------------------------------------
    'event.calm.name': 'A Quiet Week',
    'event.calm.desc': 'Nothing stirs on the river. Plan in peace.',
    'event.damrelease.name': 'Upstream Dam Release',
    'event.damrelease.desc': 'A reservoir spilled overnight — this flood runs one step worse.',
    'event.dryspell.name': 'Dry Spell',
    'event.dryspell.desc': 'The river runs low this season — the flood is one step milder.',
    'event.eugrant.name': 'EU Recovery Grant',
    'event.eugrant.desc': 'Just Transition funds arrive — every town gains €30 budget.',
    'event.volunteers.name': 'Volunteer Surge',
    'event.volunteers.desc': 'Citizens turn out in force — every town gets a free boat this round.',
    'event.solidarity.name': 'Solidarity Wave',
    'event.solidarity.desc': 'A wave of regional goodwill — every mayor warms to you.',
    'event.scandal.name': 'Political Scandal',
    'event.scandal.desc': 'A graft scandal rocks a riverside town hall — morale and trust fall there.',
    'event.forecastgift.name': 'Clear-Skies Briefing',
    'event.forecastgift.desc': 'The meteorological office shares a sharp forecast — free this round.',
    'event.freeze.name': 'Budget Freeze',
    'event.freeze.desc': 'Austerity: no budget can be reserved for later this round.',
    'event.mediastorm.name': 'Media Storm',
    'event.mediastorm.desc': 'Cameras everywhere — helping neighbours costs no political capital this round.',
    'event.inspection.name': 'Chemical Inspection',
    'event.inspection.desc': 'Bayview is forced to spend on safety: −€40 there, but no toxic spill this round.',

    // --- Traits (also used on the menu) ----------------------------------
    'trait.earlyWarning.name': 'Early Warning',
    'trait.earlyWarning.desc': 'Levees here give downstream towns a one-round warning (+rescue).',
    'trait.denseHousing.name': 'Dense Housing',
    'trait.denseHousing.desc': 'High population — high casualties if flooded, but high tax revenue.',
    'trait.absorptive.name': 'Absorptive Capacity',
    'trait.absorptive.desc': 'If left unleveed, its floodplain soaks up flow and spares downstream.',
    'trait.economicEngine.name': 'Economic Engine',
    'trait.economicEngine.desc': 'Damage here cuts every town’s budget next round.',
    'trait.toxicRisk.name': 'Toxic Risk',
    'trait.toxicRisk.desc': 'Flooding releases pollutants that harm Oceana and Final Point.',
    'trait.dataVuln.name': 'Data Vulnerability',
    'trait.dataVuln.desc': 'Even minor flooding is catastrophic. Funds the regional research budget.',
    'trait.cumulative.name': 'Cumulative Burden',
    'trait.cumulative.desc': 'Receives all upstream water and cannot pass it on.',
};
