// =============================================================================
// POVODEŇ — Czech (Čeština) UI catalog. Counterpart: en.js.
// Keys must stay in 1:1 parity with the other language, with identical
// {placeholder} sets — tests/i18n.test.js enforces both in CI.
// Town and mayor NAMES are proper nouns shared by both languages by design.
// =============================================================================

export default {
    'loading': 'Načítání…',
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
};
