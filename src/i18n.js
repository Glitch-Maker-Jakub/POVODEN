// =============================================================================
// Localization (English / Czech). Call t('key', vars?) anywhere a UI string is
// needed. Language persists in localStorage and is chosen on the menu.
//
//   t('panel.budget', { n: 120 })  ->  "Budget: §120" / "Rozpočet: §120"
//
// Data content (investments, cards, events, traits, severities, mayor titles)
// is keyed by id so gameplay code keeps English ids while the UI shows either
// language. Town and mayor NAMES are proper nouns and stay the same in both.
// Any missing key falls back to English, then to the key itself.
// =============================================================================

let lang = 'en';
try { lang = localStorage.getItem('povoden_lang') || 'en'; } catch (e) { /* no storage */ }

export function getLang() { return lang; }
export function setLang(l) {
  lang = l === 'cs' ? 'cs' : 'en';
  try { localStorage.setItem('povoden_lang', lang); } catch (e) { /* ignore */ }
}
export function toggleLang() { setLang(lang === 'en' ? 'cs' : 'en'); return lang; }

const S = {
  en: {
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

    // --- Story videos -------------------------------------------------------
    'menu.interview': '▶ THE INTERVIEW',
    'video.skip': 'SKIP ▸',

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
    'deal.accepted': 'ACCEPTED',
    'deal.declined': 'DECLINED',
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
    'panel.capital': 'Capital ⚡{pc}/{max}  ·  Research §{r}  ·  {tiers}',
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
    'summary.again': '↻  PLAY AGAIN',
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
  },

  cs: {
    // --- Menu -------------------------------------------------------------
    'menu.subtitle': 'P O V O D E Ň',
    'menu.tagline': 'Vážná hra o zvládání povodňové krize a\nmezimunicipální spolupráci na sdílené řece.',
    'menu.choose': 'Vyberte si svou obec:',
    'menu.start': '▶  ZAČÍT KAMPAŇ',
    'menu.howto': 'JAK HRÁT',
    'menu.footer': '10 kol · připravte se a čelte povodni · spolupráce poráží hráze',
    'menu.switchLang': 'English',

    // --- How to play ------------------------------------------------------
    'howto.title': 'JAK HRÁT',
    'howto.back': '◀ ZPĚT',
    'howto.next': 'DÁL ▶',
    'howto.toMenu': 'DO MENU',
    'howto.1.title': 'Jste starosta na sdílené řece',
    'howto.1.body':
      'Na jedné řece leží sedm obcí, od pramene (1) k ústí (7).\n' +
      'Jednu z nich vedete. Během deseti povodňových sezón je vaším úkolem udržet\n' +
      'ŠKODY (v €) a OBĚTI celého regionu co nejnižší.\n\n' +
      'Háček: řeka je sdílená. Místní sobectví utopí celý region —\n' +
      'spolupráce poráží hráze. O tom je celá hra.',
    'howto.2.title': 'Každé kolo: připravte se, pak čelte povodni',
    'howto.2.body':
      'Utraťte svůj rozpočet (v €M, stejná jednotka jako škody, kterým bráníte) za:\n' +
      '  ▲ Hráz   — sníží škody v obci… ale tlačí vodu PO PROUDU.\n' +
      '  ⛵ Člun / ✚ Záchranná sada — zachraňují životy (zůstávají vám mezi koly).\n' +
      '  ★ Zábava — morálka (obec v chaosu ztrácí schopnost reagovat).\n\n' +
      'Sledujte Předpověď (horní lišta). Je to rozsah — za €10M ji ZPŘESNÍTE\n' +
      'k pravdě. Připravte se naslepo a levně, nebo si kupte jistotu a přesnost.',
    'howto.3.title': 'Nemůžete dělat všechno',
    'howto.3.body':
      'Politický kapitál ⚡ (2 za kolo) omezuje, kolik zvládnete mimo\n' +
      'vlastní obec. Investice do VAŠÍ obce jsou zdarma. Pomoc JINÉ obci nebo\n' +
      'zahrání karty moci stojí ⚡.\n\n' +
      'Každé kolo se tedy musíte rozhodnout: komu pomohu a kterou kartu zahraji?\n' +
      'Karty si držíte mezi koly — načasujte je dobře.',
    'howto.4.title': 'Ostatní starostové jsou hráči, ne kulisy',
    'howto.4.body':
      'Šest obcí řízených AI vedou starostové se jmény, povahami a SKRYTÝMI\n' +
      'plány, které se mění každou hru. Ukazatel vztahu sleduje, jak vás\n' +
      'každý z nich vnímá.\n\n' +
      'Financujte jejich obec nebo dodržte dohodu → nakloní si vás a pošlou\n' +
      'čluny do VAŠÍ obce. Odkloňte na ně povodeň nebo porušte slib → obrátí se proti vám.\n' +
      'Každé kolo jeden starosta nabídne DOHODU — přijměte a dodržte ji, nebo odmítněte.\n' +
      'Svolejte Regionální setkání (€15M) a uvidíte, co kdo tajně chystá.',
    'howto.5.title': 'Žádné dvě sezóny nejsou stejné',
    'howto.5.body':
      'Každé kolo udeří náhodná regionální UDÁLOST — dotace, vypuštění přehrady\n' +
      'výše po proudu, skandál, vlna dobrovolníků. A i samotná povodeň je náhodná:\n' +
      'letošní povodeň předpovíte, ale tu příští nikdy.\n' +
      '„Roky byl klid“ vám neřekne nic.\n\n' +
      'Hodně štěstí, starosto. Řeka je trpělivá.',

    // --- DIAGRAM (akce → příčina → výhoda) --------------------------------
    'diagram.title': 'Jak se vaše volby projeví',
    'diagram.colAction': 'UDĚLÁTE',
    'diagram.colCause': 'COŽ ZPŮSOBÍ',
    'diagram.colAdv': 'A ZÍSKÁTE',
    'diagram.levee.act': 'Hráz',
    'diagram.levee.cause': 'Sníží škody (€) ve vaší obci — ale žene vodu PO PROUDU na sousedy',
    'diagram.levee.adv': 'Méně ztrát (vyplatí se u cenných obcí, plýtvání u laciné nivy)',
    'diagram.boatkit.act': 'Čluny a sady',
    'diagram.boatkit.cause': 'Zachraňují lidi při povodni — a zůstávají vám mezi koly',
    'diagram.boatkit.adv': 'Méně obětí — životy, které zachráníte',
    'diagram.fun.act': 'Zábava',
    'diagram.fun.cause': 'Zvyšuje morálku i podporu — ale slavnost nechá lidi nechráněné',
    'diagram.fun.adv': 'Roste znovuzvolení (sázka, když přijde povodeň)',
    'diagram.reserve.act': 'Rezerva',
    'diagram.reserve.cause': 'Uloží peníze +50 % do dalšího kola — ale hromadění místo pomoci zlobí lidi',
    'diagram.reserve.adv': 'Šetřete na velké, drahé obrany',
    'diagram.coop.act': 'Pomoc / Dohody',
    'diagram.coop.cause': 'Financujte souseda nebo dodržte dohodu (stojí ⚡ politický kapitál)',
    'diagram.coop.adv': 'Spojenci si vás nakloní a pošlou čluny do VAŠÍ obce',
    'diagram.producers.act': 'Chraňte výrobce',
    'diagram.producers.cause': 'Udržte výrobní město v bezpečí — dodává beton, plast či povodňová data',
    'diagram.producers.adv': 'Vaše vybavení zůstane levné a dostupné',
    'diagram.goal': 'CÍL: udržet škody (€) a oběti CELÉHO regionu nízké — to je vaše SKÓRE, a spolupráce poráží hráze. Bezpečí vaší obce řídí vaše ZNOVUZVOLENÍ.',

    // --- Scoreboard ---------------------------------------------------------
    'menu.scoreboard': 'ŽEBŘÍČEK',
    'score.title': 'ŽEBŘÍČEK',
    'score.all': 'CELKOVĚ',
    'score.month': 'TENTO MĚSÍC',
    'score.week': 'TENTO TÝDEN',
    'score.colName': 'STAROSTA',
    'score.colTown': 'OBEC',
    'score.colScore': 'SKÓRE',
    'score.loading': 'Načítám…',
    'score.empty': 'Zatím žádné kampaně — buďte první starosta na tabuli.',
    'score.offline': 'Server žebříčku není dostupný — hra funguje i bez něj.',
    'score.submit': 'ULOŽIT SKÓRE  ▶',
    'score.namePrompt': 'Vaše jméno pro žebříček:',
    'score.ok': 'ULOŽIT',
    'score.cancel': 'ZRUŠIT',
    'score.submitted': 'Uloženo — #{all} celkově · #{month} tento měsíc · #{week} tento týden',
    'score.submitFail': 'Server žebříčku není dostupný — skóre neuloženo.',

    // --- Credits ------------------------------------------------------------
    'menu.credits': 'AUTOŘI',
    'credits.title': 'AUTOŘI A PODĚKOVÁNÍ',
    'credits.fundingHead': 'FINANCOVÁNÍ A INSTITUCE',
    'credits.funding': 'Vyvinuto v rámci strategického projektu RUR — Region pro univerzitu, univerzita pro region (CZ.10.02.01/00/22_002/0000210) na Univerzitě Jana Evangelisty Purkyně (UJEP) v Ústí nad Labem, financovaného z Operačního programu Spravedlivá transformace (Fond EU pro spravedlivou transformaci), s institucionální podporou Fakulty sociálně ekonomické UJEP.',
    'credits.teamHead': 'TÝM',
    'credits.role.binter': 'přesnost tréninku a měření, formativní evaluace, modely; stavba hry a řízení kódovacích agentů; první koncept textu',
    'credits.role.prossinger': 'přesnost tréninku a měření, formativní evaluace; hydrologicko-statistické a záchranné modely; první koncept textu',
    'credits.role.models': 'hydrologicko-statistické a záchranné modely; validita povodňové domény',
    'credits.role.riha': 'expertiza v serious games a vývoji her',
    'credits.role.eck': 'herně-designová kritika a směřování k poutavosti',
    'credits.role.grasl': 'pixel-artový zero-build základ webové hry; konzultace ke kódovacím agentům a využití modelů',
    'credits.agent': 'Implementaci, vyvažování, lokalizaci a ověřování provedl kódovací agent s velkým jazykovým modelem (Anthropic Claude Opus 4.7 / 4.8) pod vedením týmu — veškerá designová autorita zůstala lidskému týmu.',
    'credits.thanks': 'Děkujeme třem nezávislým testerům, jejichž hraní formovalo úvod a tempo hry, a publiku i recenzentům konference Videogame Cultures 2025.',
    'credits.license': 'Svobodný software pod licencí GNU Affero General Public License v3.0 · github.com/Glitch-Maker-Jakub/POVODEN',

    // --- Souhlas s výzkumem (opt-in telemetrie) ------------------------------
    'research.title': '🔬  POMŮŽETE NAŠEMU VÝZKUMU?',
    'research.body':
      'POVODEŇ je součástí univerzitního výzkumu spolupráce při zvládání povodní. ' +
      'S vaším souhlasem bude hra zaznamenávat vaše herní rozhodnutí (investice, dohody, ' +
      'setkání) a výsledky kol, abychom mohli zkoumat, jak se hraní mění napříč kampaněmi.\n\n' +
      'Anonymní už z principu: ve vašem prohlížeči se vytvoří náhodné ID — žádné jméno, ' +
      'žádný e-mail, žádné osobní údaje. Kdykoli to můžete v menu vypnout a pomocí svého ID ' +
      '(zobrazeného v menu) požádat o smazání dat.\n\n' +
      'Můžeme vaše hraní zaznamenávat pro výzkum?',
    'research.yes': 'ANO, POMŮŽU',
    'research.no': 'NE, JEN HRÁT',
    'research.on': '🔬 Výzkum: ZAPNUTO',
    'research.off': '🔬 Výzkum: VYPNUTO',
    'research.id': 'výzkumné ID: {id}',

    // --- Příběhová videa -----------------------------------------------------
    'menu.interview': '▶ ROZHOVOR',
    'video.skip': 'PŘESKOČIT ▸',

    // --- HUD --------------------------------------------------------------
    'hud.round': 'KOLO {n} / {total}',
    'hud.prep': '● PŘÍPRAVA',
    'hud.floodPhase': '▶ FÁZE POVODNĚ',
    'hud.flood': 'POVODEŇ: {sev}',
    'hud.forecastBand': 'Předpověď: {low}–{high}',
    'hud.forecastExact': 'Předpověď: {sev} (potvrzeno)',
    'hud.forecastBlind': 'Předpověď: bez dat (Oceana)',
    'hud.sharpen': 'Zpřesnit €10M',

    // --- Meeting / diplomacy ---------------------------------------------
    'meeting.call': 'SVOLAT REGIONÁLNÍ SETKÁNÍ · €15M',
    'meeting.viewTable': '▦  OTEVŘÍT TABULKU PLÁNOVÁNÍ',
    'meeting.held': 'Setkání svoláno — plány sousedů toto kolo odhaleny',
    'meeting.hidden': 'Plány sousedů jsou skryté — svolejte setkání a odhalte spojence i rivaly',
    'table.title': 'PLÁNOVÁNÍ POVODNĚ — odhad dopadů',
    'table.subtitle': 'Co by každá síla povodně stála každou obec při dnešní přípravě.',
    'table.town': 'OBEC',
    'table.region': 'REGION (celkem)',
    'table.close': 'ZAVŘÍT',
    'deal.offered': '✉  NABÍDKA DOHODY',
    'deal.accept': 'PŘIJMOUT',
    'deal.decline': 'ODMÍTNOUT',
    'deal.accepted': 'PŘIJATO',
    'deal.declined': 'ODMÍTNUTO',
    'deal.text': '{mayor} vás žádá, abyste toto kolo financovali {inv} v obci {town} — a {reward}.',
    'deal.reward.cooperator': 'příští kolo pošle 2 čluny do vaší obce',
    'deal.reward.opportunist': 'příští kolo převede €20M do vaší pokladny',
    'deal.reward.reciprocator': 'na laskavost nezapomene a postaví se za vás',
    'deal.reward.grudge': 'bude to považovat za zcela splacený dluh',
    'deal.reward.freerider': 'nabízí vřelá slova a jinak nic',
    'deal.reward.default': 'si vás bude vážit',

    // --- Right panel ------------------------------------------------------
    'panel.prepTitle': 'PŘÍPRAVA · {town}',
    'panel.budget': 'Rozpočet: €{n}M',
    'panel.capital': 'Kapitál ⚡{pc}/{max}  ·  Výzkum §{r}  ·  {tiers}',
    'panel.assets': '▲{lev}  ⛵{boat}  ✚{kit}     ⚡{pc}/{max}     🔬{r}',
    'panel.scarce': '⚠ {res}',
    'panel.cut': '✗ {res}',
    'res.concrete': 'beton', 'res.plastic': 'plast', 'res.relief': 'pomoc', 'res.intel': 'data', 'res.funds': 'finance',
    'prod.dep.concrete': 'Vyrábí regionální BETON → hráze. Když se zatopí, hráze stojí +50 % a jsou omezené příští kolo.',
    'prod.dep.plastic': 'Vyrábí PLAST na čluny. Když se zatopí, čluny stojí +50 % a jsou omezené příští kolo.',
    'prod.dep.relief': 'Vyrábí POMOC pro záchranné sady. Když se zatopí, sady stojí +50 % a jsou omezené příští kolo.',
    'prod.dep.intel': 'Dodává povodňová DATA → předpověď. Když se zatopí, předpovídáte naslepo.',
    'prod.dep.funds': 'Daňová základna regionu. Když se zatopí, klesne příští kolo rozpočet všech obcí.',
    'inv.prevents': 'zabrání ~€{n}M', 'inv.savesLives': 'zachraňuje životy', 'inv.scarce': '⚠ nedostatek: {res}',
    'tip.forecast': 'Pravděpodobná letošní povodeň jako ROZSAH. Za poplatek ji Zpřesníte k přesné hodnotě. Když ztratíte Oceanu, předpovídáte naslepo.',
    'tip.sharpen': 'Zúží rozsah předpovědi k pravé povodni (€10M).',
    'tip.budget': 'Peníze k utracení letos (€M) — STEJNÁ jednotka jako škody, kterým bráníte, takže můžete vážit náklady a přínos.',
    'tip.ledger': 'Kapitál ⚡ (pomoc jiným / hraní karet), Hráze ▲, Čluny ⛵, Sady ✚ (zůstávají mezi koly). 🔬 výzkum odemyká vzácnější karty. ⚠/✗ = surovina je vzácná/přerušená, protože její výrobní město se zatopilo.',
    'tip.event': 'Náhodná regionální událost této sezóny — může posunout povodeň, rozpočty nebo vztahy.',
    'tip.meeting': 'Za €15M odhalíte plány sousedů A otevřete tabulku odhadující škody každé síly povodně pro každou obec.',
    'panel.targetCity': 'CÍLOVÉ MĚSTO',
    'panel.invest': 'INVESTUJTE  (klikněte na obec pro změnu cíle)',
    'panel.yourTown': '  (vaše obec)',
    'panel.coop': '  ← SPOLUPRÁCE',
    'panel.investHintDefault': 'Do VAŠÍ obce investujete zdarma; pomoc jiné obci stojí ⚡ kapitál. Najeďte myší na možnost a uvidíte, co dělá.',
    'panel.statsRevealed': 'obyv. {pop} · ▲{lev} ⛵{b} ✚{k} · morálka {m}',
    'panel.statsHidden': 'obyv. {pop} · ?  — svolejte setkání',
    'panel.mayorLine': '{name} ({title}) — jste: {rel}',
    'panel.weather': 'ČELIT POVODNI  ▶',
    'panel.askFavour': 'POŽÁDAT O LASKAVOST',
    'panel.favourBtn': 'POŽÁDAT {surname} O {n} ČLUNY · ⚡{pc}',

    // --- Power cards ------------------------------------------------------
    'cards.header': 'KARTY MOCI — zahrajte před povodní (vzácnější karty odemkne výzkum)',
    'tier.common': 'běžná',
    'tier.uncommon': 'neobvyklá',
    'tier.rare': 'vzácná',

    // --- Advisor ----------------------------------------------------------
    'advisor.title': '⚑  VÁŠ PORADCE',
    'advisor.gotit': 'ROZUMÍM  ▶',
    'advisor.1':
      'Vítejte, starosto. Během deseti povodňových sezón je vaším úkolem udržet ŠKODY (€) ' +
      'a OBĚTI nízké ve VŠECH SEDMI obcích — region se hodnotí společně.\n\n' +
      'Tuto první sezónu je řeka klidná — příležitost se učit. Pamatujte: Hráz ' +
      'sníží škody ve vaší obci, ale žene vodu PO PROUDU na sousedy. ' +
      'Čluny a záchranné sady zachraňují životy. Spolupráce poráží hráze.',
    'advisor.2':
      'Můžete to hrát dvěma způsoby:\n\n' +
      '• Sám za sebe — chraňte jen vlastní obec. Levné, ale voda, kterou odkloníte, ' +
      'utopí obce níže a regionální skóre tím trpí.\n' +
      '• Spolupráce — financujte sousedy a dodržujte dohody. Stojí to politický kapitál ⚡, ' +
      'ale spojenci vám posílají čluny zpět a regionální ztráty prudce klesají.\n\n' +
      'Nemusíte zachránit každou obec každý rok. Někdy řízená ztráta výše po proudu ' +
      'odvrátí katastrofu níže. Volba je na vás.',
    'advisor.3':
      'Od příští sezóny začne být řeka nebezpečná. Sledujte Předpověď — když si nejste ' +
      'jistí, zaplaťte za její zpřesnění — budujte teď vztahy a rozhodněte se, ' +
      's kým budete stát, až nakonec přijde velká povodeň.',
    'advisor.oceanaLost':
      'Datové centrum Oceany bylo zničeno. S ním mizí i regionální povodňová ' +
      'data — po zbytek kampaně NEBUDE žádná předpověď. Každá zbývající sezóna ' +
      'je teď sázka naslepo.\n\n' +
      'Právě proto na datovém městě záleží: ochraňte ho a uvidíte vodu přicházet. ' +
      'Ztraťte ho a připravujete se naslepo.',

    // --- Summary / newspaper chrome --------------------------------------
    'summary.next': 'DALŠÍ VYDÁNÍ  ▶',
    'summary.again': '↻  HRÁT ZNOVU',
    'summary.review': 'OHLÉDNUTÍ ZA SEZÓNOU — co říkají záznamy',
    'summary.toBriefing': 'VÁŠ DŮVĚRNÝ BRÍFINK  ▶',

    // --- Final private briefing -------------------------------------------
    'brief.title': 'DŮVĚRNÉ · KANCELÁŘ STAROSTY',
    'brief.subtitle': 'Interní brífink — {town}',
    'brief.score': 'REGIONÁLNÍ SKÓRE',
    'brief.grade': 'ZNÁMKA {grade}',
    'brief.reelection': 'Šance na znovuzvolení',
    'brief.mood': 'Nálada veřejnosti',
    'brief.livesOwn': 'Ztracené životy — vaše obec',
    'brief.livesRegion': 'Ztracené životy — celý region',
    'brief.damageOwn': 'Škody — vaše obec',
    'brief.damageRegion': 'Škody — celý region',
    'brief.again': '↻  HRÁT ZNOVU',
    'mood.furious': 'Rozzuřená',
    'mood.anxious': 'Úzkostná',
    'mood.steady': 'Klidná',
    'mood.hopeful': 'Nadějná',
    'mood.grateful': 'Vděčná',
    'brief.verdict.coop': 'Ochránili jste celé údolí, ne jen vlastní ulice. To je kooperativní výsledek, který odměňuje model — i skutečný region.',
    'brief.verdict.parochial': 'Zachránili jste vlastní obec a udrželi si křeslo — ale voda, kterou jste odklonili, utopila obce po proudu. Znovuzvolený starosta chudšího regionu.',
    'brief.verdict.mixed': 'Smíšená bilance: region většinou vydržel, ale zátěž padla nerovnoměrně a někteří sousedé si to budou pamatovat.',
    'brief.verdict.poor': 'Voda šla po proudu a škody se hromadily — status quo „každý sám za sebe“, který odhalily povodně 2002 a 2013.',

    // --- Per-round private "Mayor's note" --------------------------------
    'brief.note': 'VAŠE KANCELÁŘ — DŮVĚRNÉ',
    'briefRound.standing': 'Znovuzvolení {pct}% {arrow}   ·   Nálada: {mood}',
    'briefRound.townVsRegion': 'Vaše obec: {ownDmg} · {ownDeaths}      Region: {regionDmg} · ☠{regionDeaths}',
    'briefRound.lost': '☠{n}',
    'briefRound.noLives': 'bez obětí',
    'briefRound.onramp': 'Klidné vody — váš příběh starosty začíná, až se řeka poprvé zvedne.',
    'brief.adv.deaths': 'Vaše obec ztratila životy — lidi zachrání čluny a sady, ne hráze. Pár jich kupte.',
    'brief.adv.falling': 'Podpora klesá — udržte doma domy a životy v bezpečí, tím získáte voliče zpět.',
    'brief.adv.panic': 'Nízká morálka se v povodni mění v paniku — zaplaťte Zábavu, nebo čekejte víc ztrát.',
    'brief.adv.blind': 'Žádná předpověď (Oceana ztracena) — připravte se na nejhorší, ne na průměr.',
    'brief.adv.parochial': 'Vaše křeslo je jisté, údolí ne — financujte souseda; spojenci posílají čluny zpět.',
    'brief.adv.favour': 'Soused vám důvěřuje — příští kolo můžete požádat spojence o čluny (⚡1).',
    'brief.adv.hoard': 'Neutracený rozpočet nikoho neochrání — investujte, dejte do rezervy nebo postavte hráz.',
    'brief.adv.steady': 'Dobře vedeno — šiřte pomoc po celém údolí; skóre odměňuje všechny.',
    'summary.cap.calm': '— klidné vody —',
    'summary.cap.mild': '— řeka stoupá —',
    'summary.cap.damage': '— ulice pod vodou —',
    'summary.cap.disaster': '— záchrana a zkáza —',

    // --- Transient flash messages ----------------------------------------
    'flash.dealStruck': 'Dohoda uzavřena se starostou {mayor} — toto kolo dodržte slovo.',
    'flash.declined': 'Odmítli jste starostu {mayor}.',
    'flash.meetingConvened': 'Regionální setkání svoláno — sousedé toto kolo odhaleni',
    'flash.meetingFail': 'Setkání teď nelze svolat',
    'flash.favourCalled': 'Laskavost vyžádána od starosty {mayor} — čluny jsou na cestě.',
    'flash.sharpened': 'Předpověď zpřesněna.',
    'flash.coopDividend': 'Spolupráce se vyplatila — voliči schvalují a získali jste +1 kapitál toto kolo.',
    'flash.invested': '{inv} → {town}',
    'flash.cardPlayed': 'Zahráno: {card}',
    'flash.cardReserves': '{card} · rezervy {audit}: €{banked}M',
    'flash.cardNoTarget': '{card} teď nemá platný cíl',

    // --- Map status -------------------------------------------------------
    'map.headwaters': '⛰ pramen',
    'map.estuary': 'ústí 🌊',
    'map.you': 'VY',
    'map.minor': 'mírná',
    'map.dry': 'sucho',
    'map.dataLost': 'DATA ZTRACENA',
    'map.unknown': '· ? ·',

    // --- Severities -------------------------------------------------------
    'sev.0': 'Žádná', 'sev.1': 'Mírná', 'sev.2': 'Střední', 'sev.3': 'Silná', 'sev.4': 'Katastrofická',

    // --- Relationship -----------------------------------------------------
    'rel.ally': 'spojenec', 'rel.neutral': 'neutrální', 'rel.rival': 'rival',

    // --- Investments ------------------------------------------------------
    'inv.levee.name': 'Hráz',
    'inv.levee.hint': 'Sníží škody (€) zde — ale žene vodu na obce po proudu.',
    'inv.boat.name': 'Člun',
    'inv.boat.hint': 'Zachraňuje životy během povodně. Hlavní způsob, jak předejít úmrtím.',
    'inv.kit.name': 'Záchranná sada',
    'inv.kit.hint': 'Levná záchrana — udrží lidi naživu, než dorazí čluny.',
    'inv.fun.name': 'Zábava',
    'inv.fun.hint': 'Velký nárůst morálky a podpory — ale slavnost nechá lidi nechráněné, takže je riskantnější, pokud ve stejné sezóně přijde povodeň.',
    'inv.reserve.name': 'Rezerva',
    'inv.reserve.hint': 'Úročí se o 50 % do dalšího kola — ale hromadění místo pomoci rozzlobí vaše lidi (−morálka).',

    // --- Cards ------------------------------------------------------------
    'card.sandbag.name': 'Pytlová brigáda',
    'card.sandbag.blurb': 'Rychlá hráz: +1 hráz v cílové obci, jen toto kolo.',
    'card.volunteer.name': 'Výzva dobrovolníkům',
    'card.volunteer.blurb': 'Vaše čluny toto kolo zachrání dvojnásobek — ale morálka −15.',
    'card.drill.name': 'Veřejné cvičení',
    'card.drill.blurb': '+18 morálky a záchranná sada zdarma ve vaší obci.',
    'card.decree.name': 'Nouzový dekret',
    'card.decree.blurb': 'Přehlasujte radu: +30 rozpočtu ihned, −8 morálky.',
    'card.grant.name': 'Dotace na odolnost',
    'card.grant.blurb': 'Trvalá +1 hráz ve vaší obci a u dvou sousedů po proudu.',
    'card.evac.name': 'Příkaz k evakuaci',
    'card.evac.blurb': 'Půlí oběti povodně ve vaší obci toto kolo. −10 morálky, −20 rozpočtu.',
    'card.pact.name': 'Pakt regionální solidarity',
    'card.pact.blurb': 'Vy + dvě obce po proudu toto kolo sdílíte čluny. Signatáři nezradí.',
    'card.bailout.name': 'Vládní finanční pomoc',
    'card.bailout.blurb': '+120 rozpočtu ihned — ale následný audit poškodí vaše konečné skóre.',
    'card.diversion.name': 'Odklon výše po proudu',
    'card.diversion.blurb': 'Odtlačte povodeň: −2 síla zde, +2 u souseda výše po proudu. Naruší důvěru.',

    // --- Mayor titles -----------------------------------------------------
    'mayor.delta.title': 'Strážce',
    'mayor.millington.title': 'Pragmatička',
    'mayor.greenhaven.title': 'Hospodář',
    'mayor.traders.title': 'Kupec',
    'mayor.bayview.title': 'Ohrožený',
    'mayor.oceana.title': 'Technokrat',
    'mayor.finalpoint.title': 'Stoička',

    // --- Events -----------------------------------------------------------
    'event.calm.name': 'Klidný týden',
    'event.calm.desc': 'Na řece se nic nehýbe. Plánujte v klidu.',
    'event.damrelease.name': 'Vypuštění přehrady',
    'event.damrelease.desc': 'Nádrž se přes noc přelila — tato povodeň je o stupeň horší.',
    'event.dryspell.name': 'Období sucha',
    'event.dryspell.desc': 'Řeka má letos málo vody — povodeň je o stupeň mírnější.',
    'event.eugrant.name': 'Dotace EU na obnovu',
    'event.eugrant.desc': 'Dorazily fondy Spravedlivé transformace — každá obec získá €30 rozpočtu.',
    'event.volunteers.name': 'Příliv dobrovolníků',
    'event.volunteers.desc': 'Občané vyrazili v houfu — každá obec toto kolo dostane člun zdarma.',
    'event.solidarity.name': 'Vlna solidarity',
    'event.solidarity.desc': 'Vlna regionální dobré vůle — každý starosta si vás nakloní.',
    'event.scandal.name': 'Politický skandál',
    'event.scandal.desc': 'Korupční skandál otřásl radnicí u řeky — morálka i důvěra tam klesnou.',
    'event.forecastgift.name': 'Brífink za jasného nebe',
    'event.forecastgift.desc': 'Meteorologové sdílí přesnou předpověď — toto kolo zdarma.',
    'event.freeze.name': 'Zmrazení rozpočtu',
    'event.freeze.desc': 'Úsporná opatření: toto kolo nelze nic uložit do rezervy.',
    'event.mediastorm.name': 'Mediální bouře',
    'event.mediastorm.desc': 'Kamery všude — pomoc sousedům toto kolo nestojí politický kapitál.',
    'event.inspection.name': 'Chemická inspekce',
    'event.inspection.desc': 'Bayview musí utratit za bezpečnost: −€40 tam, ale toto kolo žádný únik toxinů.',

    // --- Traits -----------------------------------------------------------
    'trait.earlyWarning.name': 'Včasné varování',
    'trait.earlyWarning.desc': 'Hráze zde dají obcím po proudu varování o jedno kolo (+záchrana).',
    'trait.denseHousing.name': 'Hustá zástavba',
    'trait.denseHousing.desc': 'Vysoký počet obyvatel — při povodni mnoho obětí, ale vysoké daňové příjmy.',
    'trait.absorptive.name': 'Vsakovací kapacita',
    'trait.absorptive.desc': 'Bez hrází jeho niva pohltí vodu a ochrání obce po proudu.',
    'trait.economicEngine.name': 'Ekonomický motor',
    'trait.economicEngine.desc': 'Škody zde sníží rozpočet všech obcí v dalším kole.',
    'trait.toxicRisk.name': 'Toxické riziko',
    'trait.toxicRisk.desc': 'Povodeň uvolní znečištění, které poškodí Oceanu a Final Point.',
    'trait.dataVuln.name': 'Zranitelnost dat',
    'trait.dataVuln.desc': 'I malá povodeň je katastrofa. Financuje regionální výzkum.',
    'trait.cumulative.name': 'Kumulativní zátěž',
    'trait.cumulative.desc': 'Přijímá veškerou vodu z horního toku a nemá ji kam předat.',
  },
};

export function t(key, vars) {
  let s = (S[lang] && S[lang][key]) || S.en[key] || key;
  if (vars) {
    s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  }
  return s;
}
