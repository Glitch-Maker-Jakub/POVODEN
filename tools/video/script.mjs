// =============================================================================
// POVODEŇ — intro & check-in video scripts, structured for the build pipeline.
// -----------------------------------------------------------------------------
// Human-readable references: docs/intro_video_script_en.md, docs/checkin_videos_en.md
// This file is the SINGLE SOURCE the generator consumes: every scene carries its
// still (image prompt), captions (en/cs) and voiced lines (en/cs per speaker).
// Czech is an ADAPTATION, not a literal translation — Fojtík should sound like
// a Czech riverman. (Czech native speaker: proofread the `cs` fields!)
// =============================================================================

export const VOICES = {
  // Gemini prebuilt voices + per-speaker delivery instruction prepended to TTS.
  fojtik: {
    voice: 'Algenib',
    style: {
      en: 'Speak as a weathered man in his late seventies, a retired Czech river ferryman. Slow, dry, gravelly, calm, with long pauses: ',
      cs: 'Mluv jako ošlehaný muž ke konci sedmdesátky, vysloužilý převozník na Labi. Pomalu, suše, chraplavě, klidně, s dlouhými pauzami: ',
    },
  },
  reporter: {
    voice: 'Leda',
    style: {
      en: 'Speak as a young woman journalist, calm, curious, respectful, slightly quiet: ',
      cs: 'Mluv jako mladá novinářka, klidně, zvědavě, s respektem, spíš potichu: ',
    },
  },
};

// Shared look for all generated stills (kept in every prompt for consistency).
const LOOK =
  'Painterly documentary illustration, muted Central-European palette, soft natural light, ' +
  'cinematic 16:9 composition, quiet and dignified mood. No text, no lettering, no watermark.';
const MEMORY = 'Desaturated, faded, archival feel, cooler tones, like a remembered scene. ';
const PRESENT = 'Warm afternoon light, present-day, gentle color. ';

// -----------------------------------------------------------------------------
// VIDEO 1 — "What the River Remembers" (~5 min intro)
// -----------------------------------------------------------------------------
export const INTRO = {
  id: 'intro',
  scenes: [
    {
      id: 's00_masthead',
      still: {
        file: 'still_00_masthead',
        prompt: 'An old physical newspaper lying on dark wood, slightly water-stained, elegant serif masthead area left BLANK (no letters), moody close-up, lamplight. ' + LOOK,
      },
      caption: { en: 'THE ELBE HERALD', cs: 'LABSKÝ KURÝR' },
      lines: [
        { sp: 'reporter', en: 'Every mayor on this river has a plan. Old Fojtík has forty years of watching those plans meet the water.', cs: 'Každý starosta na téhle řece má plán. Starý Fojtík se čtyřicet let dívá, jak se ty plány potkávají s vodou.' },
      ],
    },
    {
      id: 's01_kitchen',
      still: {
        file: 'still_01_kitchen',
        prompt: PRESENT + 'A small Czech kitchen table by a window, a wide river visible outside, two ceramic mugs, an elderly weathered man with white stubble sits across from a young woman journalist holding a notebook. ' + LOOK,
      },
      caption: null,
      lines: [
        { sp: 'reporter', en: 'Mr. Fojtík — you pulled people out of the water in two thousand two. Again in twenty thirteen. If a new mayor sat down at this table today, what would you tell them?', cs: 'Pane Fojtíku — v roce dva tisíce dva jste tahal lidi z vody. A znovu ve třináctém. Kdyby si dnes k tomuhle stolu sedl nový starosta, co byste mu řekl?' },
        { sp: 'fojtik', en: 'First? That every euro you spend, and every euro the flood costs you — it is the same coin. Spend it wisely before the water comes. Because afterward, you are just counting the damage in the money you did not spend.', cs: 'Nejdřív? Že každé euro, které utratíš, a každé euro, které tě stojí povodeň — je to táž mince. Utrácej moudře, dokud voda nepřišla. Protože potom už jen počítáš škody v penězích, které jsi neutratil.' },
        { sp: 'reporter', en: 'And after that?', cs: 'A potom?' },
        { sp: 'fojtik', en: 'That the river does not forgive arithmetic. It forgives neighbors.', cs: 'Že řeka neodpouští počtářům. Odpouští sousedům.' },
        { sp: 'reporter', en: 'What do you mean?', cs: 'Jak to myslíte?' },
        { sp: 'fojtik', en: 'Sit. I will go town by town. Seven of them, one river. Same seven mistakes, every generation. And after the towns — I will tell you what the water taught mayors about cards, promises, and elections. That part matters just as much.', cs: 'Sedněte si. Vezmu to město po městu. Sedm měst, jedna řeka. Stejných sedm chyb, generace za generací. A po městech vám povím, co voda naučila starosty o kartách, slibech a volbách. To je stejně důležité.' },
      ],
    },
    {
      id: 's02_delta',
      still: {
        file: 'still_02_delta',
        prompt: MEMORY + 'A lone wooden watchtower with a warning bell on a hill above a narrow mountain stream, dawn light, wide empty landscape, headwaters of a river. ' + LOOK,
      },
      caption: { en: 'Your first town’s choices ripple down the whole river.', cs: 'Rozhodnutí prvního města se nesou po celé řece.' },
      lines: [
        { sp: 'fojtik', en: 'Up at Delta, at the headwaters — that is where it starts. A mayor up there thinks, the flood is downstream, not my problem. Wrong. Whatever you build up there — a levee, a warning bell — it changes what everyone below you gets. Delta does not flood first. Delta decides who floods worst.', cs: 'Nahoře v Deltě, u pramenů — tam to začíná. Starosta si tam říká: povodeň je po proudu, to není moje starost. Omyl. Cokoli tam nahoře postavíš — hráz, zvon na poplach — mění to, co dostanou všichni pod tebou. Delta se nezaplaví první. Delta rozhoduje, kdo se zaplaví nejhůř.' },
      ],
    },
    {
      id: 's03_forecast',
      still: {
        file: 'still_03_study',
        prompt: PRESENT + 'A cluttered riverman’s study: hand-drawn river charts pinned to the wall, an old brass barometer, a rain gauge visible through the window, open ledgers on a desk, lamplight. ' + LOOK,
      },
      caption: { en: 'Sharpen the forecast; call a meeting to see the planning table.', cs: 'Zpřesněte předpověď; svolejte setkání a uvidíte tabulku plánování.' },
      lines: [
        { sp: 'fojtik', en: 'You will get a forecast every season — a range, not a promise. Pay to sharpen it, and that range narrows toward the truth. Pay nothing, and you prepare blind, hoping the middle number holds.', cs: 'Každou sezónu dostaneš předpověď — rozsah, ne slib. Zaplať za zpřesnění, a rozsah se stáhne k pravdě. Nezaplatíš nic, a připravuješ se naslepo. Doufáš, že vyjde prostředek.' },
        { sp: 'reporter', en: 'And if a mayor wants to know what the others are planning?', cs: 'A když chce starosta vědět, co chystají ostatní?' },
        { sp: 'fojtik', en: 'Call a meeting. Costs money, same as anything worth knowing. But it opens the room — you see every neighbor’s hand, and a table besides, showing exactly what each flood would cost each town, this season, as things stand. I have known mayors who called that meeting every single season. Never once regretted the price.', cs: 'Svolej setkání. Stojí to peníze, jako všechno, co stojí za to vědět. Ale otevře ti to místnost — vidíš karty všech sousedů, a k tomu tabulku, co přesně by která povodeň letos stála které město, tak jak věci stojí. Znal jsem starosty, kteří to setkání svolávali každičkou sezónu. Ani jednou nelitovali.' },
        { sp: 'reporter', en: 'The river does not answer questions.', cs: 'Řeka na otázky neodpovídá.' },
        { sp: 'fojtik', en: 'No. But your neighbors might.', cs: 'Ne. Ale sousedi možná ano.' },
      ],
    },
    {
      id: 's04_millington',
      still: {
        file: 'still_04_millington',
        prompt: MEMORY + 'A crowded row of Central-European red-roofed houses and one apartment block, laundry lines between windows, children’s bicycles left in a courtyard, lived-in and dense. ' + LOOK,
      },
      caption: { en: 'Celebrations lift approval — and raise risk if the flood comes that season.', cs: 'Slavnosti zvedají podporu — a riziko, přijde-li tou sezónou povodeň.' },
      lines: [
        { sp: 'fojtik', en: 'Millington is packed tight — more people than anywhere else on the river, and more of the region’s money besides. I watched a mayor wall the town so high he forgot to buy a single boat. The water never got in. Did not matter. When the panic got in, it cost him just the same.', cs: 'Millington je namačkaný — víc lidí než kdekoli jinde na řece, a k tomu většina peněz celého kraje. Viděl jsem starostu, který město obehnal tak vysokou hrází, že zapomněl koupit jedinou loďku. Voda se dovnitř nedostala. Nebylo to nic platné. Když se dovnitř dostala panika, stálo ho to stejně.' },
        { sp: 'reporter', en: 'Panic?', cs: 'Panika?' },
        { sp: 'fojtik', en: 'A town with no boats and no calm is not safe. It is just dry and frightened.', cs: 'Město bez člunů a bez klidu není v bezpečí. Je jenom suché a vyděšené.' },
        { sp: 'reporter', en: 'Is there no safe way to lift their spirits?', cs: 'A nejde jim zvednout náladu bezpečně?' },
        { sp: 'fojtik', en: 'There is. But time it with care. A festival can save a town’s soul — or leave it looking the wrong way when the wave comes. Cheer them up between floods, not during one.', cs: 'Jde. Ale musíš to načasovat. Slavnost umí zachránit duši města — anebo ho nechat koukat špatným směrem, když přijde vlna. Rozveseluj lidi mezi povodněmi. Ne během nich.' },
      ],
    },
    {
      id: 's05_greenhaven',
      still: {
        file: 'still_05_greenhaven',
        prompt: MEMORY + 'Open green floodplain fields with a modest farmhouse and distant barn, water pooling naturally at the low edge of a field, soft agricultural land by a river. ' + LOOK,
      },
      caption: { en: 'Some land protects the region best by staying un-leveed.', cs: 'Některá půda chrání kraj nejlíp bez hráze.' },
      lines: [
        { sp: 'fojtik', en: 'Greenhaven is a field that knows how to drown quietly so a town downstream does not have to. Every young mayor wants to wall it like the others. Do not. Leave that ground open and it swallows water that would otherwise go looking for someone’s kitchen.', cs: 'Greenhaven je pole, které se umí potichu utopit, aby se nemuselo topit město po proudu. Každý mladý starosta ho chce obehnat hrází jako ostatní města. Nedělej to. Nech tu zem otevřenou a spolkne vodu, která by si jinak našla něčí kuchyň.' },
        { sp: 'reporter', en: 'So — the best defense there is no defense?', cs: 'Takže nejlepší obrana je tam žádná obrana?' },
        { sp: 'fojtik', en: 'The best defense is knowing which ground is supposed to get wet.', cs: 'Nejlepší obrana je vědět, která zem má zmoknout.' },
      ],
    },
    {
      id: 's06_traders',
      still: {
        file: 'still_06_traders',
        prompt: MEMORY + 'A busy river market town: warehouses, loading docks, stacked wooden crates, a stone bridge, barges moored, commerce and motion. ' + LOOK,
      },
      caption: { en: 'Producer towns supply what everyone needs — lose one, the whole region pays more.', cs: 'Výrobní města zásobují všechny — ztratíš-li jedno, platí celý kraj víc.' },
      lines: [
        { sp: 'fojtik', en: 'Trader’s Reach is the region’s wallet — and its quarry. Every bag of concrete for every levee on this river starts there. Let it flood, and it is not just their loss. Every town’s budget shrinks the next season, and levees everywhere get scarce and dear.', cs: 'Trader’s Reach je peněženka kraje — a jeho lom. Každý pytel betonu na každou hráz na téhle řece začíná tam. Nech ho zaplavit, a není to jen jejich škoda. Příští sezónu se ztenčí rozpočet všech měst a hráze všude zdraží a dojdou.' },
        { sp: 'reporter', en: 'You are saying protect the rich town.', cs: 'Říkáte: chraňte bohaté město.' },
        { sp: 'fojtik', en: 'I am saying protect whoever keeps the shelves stocked. Pride does not rebuild a levee. Concrete does.', cs: 'Říkám: chraň toho, kdo plní regály. Hrdost hráz nepostaví. Beton ano.' },
      ],
    },
    {
      id: 's07_bayview',
      still: {
        file: 'still_07_bayview',
        prompt: MEMORY + 'An industrial riverside district: chemical storage tanks, smokestacks against a grey sky, a faint iridescent sheen on the river surface, uneasy stillness. ' + LOOK,
      },
      caption: { en: 'A flooded producer makes its resource scarce for everyone, next season.', cs: 'Zaplavené výrobní město příští sezónu zdraží svou surovinu všem.' },
      lines: [
        { sp: 'fojtik', en: 'Bayview keeps this region’s boats built — the plastic, the hulls. But it sits on chemicals it cannot always hold. I have seen a flood there poison the water for every town downstream, on top of the water itself. Ignore Bayview and two disasters arrive as one.', cs: 'Bayview staví čluny pro celý kraj — plasty, trupy. Jenže sedí na chemii, kterou vždycky neudrží. Viděl jsem, jak povodeň odtamtud otrávila vodu všem městům po proudu — navrch k té vodě samotné. Ignoruj Bayview, a přijdou dvě neštěstí v jednom.' },
        { sp: 'reporter', en: 'And if it floods anyway?', cs: 'A když se stejně zaplaví?' },
        { sp: 'fojtik', en: 'Then boats get expensive and scarce right when you need them most. That is the lesson, not just the warning.', cs: 'Pak čluny zdraží a dojdou přesně ve chvíli, kdy je potřebuješ nejvíc. To je ta lekce. Ne jen varování.' },
      ],
    },
    {
      id: 's08_cards',
      still: {
        file: 'still_08_cards',
        prompt: PRESENT + 'A weathered leather satchel and hand-labeled cards spread by lantern light on a rough wooden table, ink drawings faintly visible on the cards like old tarot, warm shadows. ' + LOOK,
      },
      caption: { en: 'Playing a card costs political capital — the same coin that helps a neighbor.', cs: 'Zahrát kartu stojí politický kapitál — touž mincí se pomáhá sousedům.' },
      lines: [
        { sp: 'fojtik', en: 'Every mayor carries a hand of tricks — cards, they call them now. A quick wall for one season, no more. A call to volunteers that doubles what your boats can save, if you do not mind what it costs your people’s spirits. Rarer tricks wait behind a locked door.', cs: 'Každý starosta nosí v rukávu pár triků — dneska se tomu říká karty. Rychlá hráz na jednu sezónu, víc ne. Svolání dobrovolníků, které zdvojnásobí, co tvoje čluny zachrání — pokud ti nevadí, co to udělá s náladou lidí. Vzácnější triky čekají za zamčenými dveřmi.' },
        { sp: 'reporter', en: 'The key being?', cs: 'A klíč?' },
        { sp: 'fojtik', en: 'I will get to that. For now, just know — every trick costs you influence to play. Same coin it takes to help a neighbor. Spend it all on your own hand, and you have none left to lend across the border.', cs: 'K tomu se dostanu. Zatím si pamatuj — každý trik tě stojí vliv. Touž mincí se platí pomoc sousedovi. Utratíš-li všechno za vlastní karty, nezbude ti nic, co bys půjčil přes hranici.' },
      ],
    },
    {
      id: 's09_oceana',
      still: {
        file: 'still_09_oceana',
        prompt: MEMORY + 'A sleek low research campus by a river at dusk, antennae and cooling units on flat roofs, soft blue glow from inside, fragile against a wide sky. ' + LOOK,
      },
      caption: { en: 'Lose the data town: no forecast — and no rare cards.', cs: 'Ztratíte-li datové město: žádná předpověď — a žádné vzácné karty.' },
      lines: [
        { sp: 'fojtik', en: 'Oceana floods at the slightest touch — always has. But it is the only place on this river that can tell you what is coming. Lose it, and you are not just down one town. You are blind for every season left. No forecast. No warning. Just weather, arriving.', cs: 'Oceana se zaplaví při sebemenším dotyku — odjakživa. Jenže je to jediné místo na řece, které ti umí říct, co přichází. Ztrať ji, a nepřišel jsi jen o jedno město. Jsi slepý po všechny zbývající sezóny. Žádná předpověď. Žádné varování. Jen počasí, které přichází.' },
        { sp: 'reporter', en: 'That sounds like the worst one to lose.', cs: 'To zní jako nejhorší možná ztráta.' },
        { sp: 'fojtik', en: 'It is. And there is a second cost, quieter than the first — guard Oceana, and the region’s researchers keep handing you sharper tricks. The rarest cards only come while Oceana stands. That is the key I mentioned. Protect the eyes before you protect the walls.', cs: 'Je. A je tu ještě druhá cena, tišší než ta první — dokud Oceanu chráníš, výzkumníci ti dál podávají ostřejší triky. Nejvzácnější karty přicházejí, jen dokud Oceana stojí. To je ten klíč, o kterém jsem mluvil. Chraň oči dřív než zdi.' },
      ],
    },
    {
      id: 's10_promises',
      still: {
        file: 'still_10_promises',
        prompt: MEMORY + 'Two silhouetted figures shaking hands on a rain-slicked wooden dock at dusk, one holding a lantern, the dark river behind them, quiet trust. ' + LOOK,
      },
      caption: { en: 'Cooperation costs capital now — and repays it in trust, boats, and capital.', cs: 'Spolupráce teď stojí kapitál — a vrací ho v důvěře, člunech a kapitálu.' },
      lines: [
        { sp: 'fojtik', en: 'Every mayor downriver has their own nature, though you will not know it plain at first. Some keep their word without being asked twice. Some remember every slight for a lifetime. Some will take your help gladly and give nothing back. You learn who is who by how they treat you — and how you treat them in return.', cs: 'Každý starosta po proudu má svou povahu, i když ji zprvu neuvidíš. Někdo drží slovo, aniž bys musel říkat dvakrát. Někdo si pamatuje každou křivdu do smrti. Někdo si tvou pomoc rád vezme a nevrátí nic. Kdo je kdo, poznáš podle toho, jak se chovají k tobě — a jak ty k nim.' },
        { sp: 'reporter', en: 'And that matters how?', cs: 'A proč na tom záleží?' },
        { sp: 'fojtik', en: 'Fund a neighbor. Keep a promise you made. They warm to you — send boats when you need them most. Break a promise, or push the flood onto their doorstep to spare your own, and they remember. For a long time.', cs: 'Přispěj sousedovi. Dodrž, co jsi slíbil. Nakloní se ti — pošlou čluny, když je potřebuješ nejvíc. Poruš slib, nebo jim přežeň povodeň přede dveře, abys ušetřil vlastní práh — a budou si to pamatovat. Dlouho.' },
        { sp: 'reporter', en: 'Is there a cost to being kind?', cs: 'Stojí něco být laskavý?' },
        { sp: 'fojtik', en: 'Helping another town costs you influence, same as playing a trick card. But keep your word, and it comes back to you the season after — more influence, a town more inclined to trust you. Kindness compounds, same as debt does. Just slower. And kinder.', cs: 'Pomoc cizímu městu tě stojí vliv, stejně jako zahraná karta. Ale drž slovo, a vrátí se ti to hned další sezónu — víc vlivu, město ochotnější ti věřit. Laskavost se úročí jako dluh. Jen pomaleji. A laskavěji.' },
      ],
    },
    {
      id: 's11_finalpoint',
      still: {
        file: 'still_11_finalpoint',
        prompt: MEMORY + 'A small harbor town at a river mouth in the evening: a lighthouse, moored fishing boats, the river widening into open water, melancholy calm. ' + LOOK,
      },
      caption: { en: 'The last town inherits every decision made above it.', cs: 'Poslední město dědí každé rozhodnutí učiněné nad ním.' },
      lines: [
        { sp: 'fojtik', en: 'And at the end of it all — Final Point. Every choice made upstream arrives there, all at once, with nowhere left to send it. I have known good mayors from Final Point who did everything right in their own town. The water that hurt them was never theirs to begin with.', cs: 'A na samém konci — Final Point. Každé rozhodnutí z horního toku tam dorazí najednou, a už není kam je poslat dál. Znal jsem dobré starosty z Final Pointu, kteří ve svém městě udělali všechno správně. Voda, která jim ublížila, nikdy nebyla jejich.' },
        { sp: 'reporter', en: 'That does not sound fair.', cs: 'To nezní spravedlivě.' },
        { sp: 'fojtik', en: 'It is not. That is why it cannot be one mayor’s job to fix. It has to be all seven.', cs: 'Není. A proto to nemůže spravit jeden starosta. Musí to být všech sedm.' },
      ],
    },
    {
      id: 's12_election',
      still: {
        file: 'still_12_election',
        prompt: 'A crooked framed campaign photograph of a smiling politician hanging on faded wallpaper, a dark waterline stain creeping up the wall just beneath the frame, a flooded street faintly visible through a window behind. Muted, ironic, somber. ' + LOOK,
      },
      caption: { en: 'Re-election is yours. The region is scored separately. You can win one and lose the other.', cs: 'Znovuzvolení je vaše. Kraj se hodnotí zvlášť. Lze vyhrát jedno a prohrát druhé.' },
      lines: [
        { sp: 'fojtik', en: 'I knew a mayor once who did everything right — for his own town. Walled it high. Kept it dry. Kept his people fed and cheerful. Every season, his numbers looked wonderful. His own numbers.', cs: 'Znal jsem kdysi starostu, který udělal všechno správně — pro svoje město. Obehnal ho vysokou hrází. Udržel ho v suchu. Lidi najedené a veselé. Každou sezónu jeho čísla vypadala nádherně. Jeho vlastní čísla.' },
        { sp: 'reporter', en: 'What happened?', cs: 'A co se stalo?' },
        { sp: 'fojtik', en: 'He won every election he ran. Eighty percent, sometimes higher. And the valley around him drowned, season after season — because the water he turned away always had to go somewhere. Understand, there are two reports every season. One for the newspaper. One just for the mayor, in private. His private report always looked wonderful. It just never said what it cost everyone else.', cs: 'Vyhrál každé volby, do kterých šel. Osmdesát procent, někdy víc. A údolí kolem něj se topilo, sezónu za sezónou — protože voda, kterou odháněl, vždycky musela někam jít. Rozumějte, každou sezónu přijdou dvě zprávy. Jedna do novin. Druhá jen pro starostu, důvěrná. Ta jeho důvěrná vypadala vždycky nádherně. Jen v ní nikdy nestálo, co to stálo všechny ostatní.' },
        { sp: 'reporter', en: 'So he never knew?', cs: 'Takže to nevěděl?' },
        { sp: 'fojtik', en: 'He knew. He just was not graded on it. That is the part nobody tells a new mayor — you can keep your seat, and still be the reason the region failed.', cs: 'Věděl. Jen ho z toho nikdo neznámkoval. A tohle novému starostovi nikdo neřekne — můžeš si udržet křeslo, a přesto být důvodem, proč kraj selhal.' },
      ],
    },
    {
      id: 's13_thesis',
      still: { file: 'still_01_kitchen', reuse: true, zoom: 'close' },
      caption: null,
      lines: [
        { sp: 'reporter', en: 'So what is the one thing you would want a new mayor to remember? Before the water comes?', cs: 'Takže — co jediné by si měl nový starosta zapamatovat? Než přijde voda?' },
        { sp: 'fojtik', en: 'A levee protects your town. It is your neighbor who pays for it. Remember that, and you will build fewer walls — and a lot more boats.', cs: 'Hráz chrání tvoje město. Platí ji ale tvůj soused. Tohle si pamatuj — a postavíš míň zdí. A mnohem víc člunů.' },
        { sp: 'reporter', en: 'And the election?', cs: 'A volby?' },
        { sp: 'fojtik', en: 'Win it, if you can. But ask yourself, some quiet evening, what you won it over.', cs: 'Vyhraj je, jestli to dokážeš. Ale jednou, za tichého večera, se sám sebe zeptej, nad čím jsi vlastně vyhrál.' },
        { sp: 'reporter', en: 'And if a mayor does not ask?', cs: 'A když se starosta nezeptá?' },
        { sp: 'fojtik', en: 'Then I will be telling this story again, to somebody else’s grandchildren.', cs: 'Pak budu tenhle příběh vyprávět znovu. Vnoučatům někoho jiného.' },
      ],
    },
    {
      id: 's14_title',
      still: {
        file: 'still_14_valley',
        prompt: 'A wide aerial view of a green Central-European river valley at golden hour, a single river winding from forested mountains to a distant sea estuary, seven small towns along its banks, peaceful and vast. ' + LOOK,
      },
      caption: { en: 'POVODEŇ — seven towns · one river · ten seasons', cs: 'POVODEŇ — sedm měst · jedna řeka · deset sezón' },
      lines: [
        { sp: 'reporter', en: 'Every season, two reports arrive. One for the people. One for you, alone. Seven towns. One river. Ten seasons to get both of them right.', cs: 'Každou sezónu přijdou dvě zprávy. Jedna pro lidi. Druhá jen pro vás. Sedm měst. Jedna řeka. Deset sezón na to, aby obě vyšly.' },
      ],
    },
  ],
};

// -----------------------------------------------------------------------------
// VIDEO 2 — "The Calm Ends" (~30 s, plays entering Round 3 preparation)
// -----------------------------------------------------------------------------
export const CALM = {
  id: 'calm',
  scenes: [
    {
      id: 'c00_dock',
      still: {
        file: 'still_c_dock',
        prompt: PRESENT + 'An old man alone on a wooden river dock at dusk, tightening the mooring rope of a small boat, a dark line of storm cloud low on the horizon behind him, wind in the grass, foreboding but quiet. ' + LOOK,
      },
      caption: { en: 'The calm seasons are over. Prepare, or hope.', cs: 'Klidné sezóny skončily. Připravte se — nebo doufejte.' },
      lines: [
        { sp: 'fojtik', en: 'Two seasons of calm. Do not mistake that for peace — it is just the river taking a breath.', cs: 'Dvě klidné sezóny. Nepleť si to s mírem — řeka se jen nadechuje.' },
        { sp: 'fojtik', en: 'I have seen mayors spend those two seasons on speeches and parties, with nothing in the boathouse to show for it. Check your levees. Check your boats. Check who you can call on — and who is already calling on you.', cs: 'Viděl jsem starosty, kteří ty dvě sezóny utratili za projevy a oslavy — a v loděnici po nich nezbylo nic. Zkontroluj hráze. Zkontroluj čluny. Zkontroluj, na koho se můžeš obrátit — a kdo se už obrací na tebe.' },
        { sp: 'fojtik', en: 'From here on, the water means it.', cs: 'Odteď to voda myslí vážně.' },
      ],
    },
  ],
};

// -----------------------------------------------------------------------------
// VIDEO 3 — "After the First Destruction" (~45 s, plays at first real loss)
// -----------------------------------------------------------------------------
export const LOSS = {
  id: 'loss',
  scenes: [
    {
      id: 'l00_street',
      still: {
        file: 'still_l_street',
        prompt: MEMORY + 'A flooded European town street being cleared after the water receded: a visible waterline on building facades, a rescue boat pulled up onto a curb, two figures working in the middle distance, overcast documentary mood. Sober, not gory. ' + LOOK,
      },
      caption: { en: 'Damage happened. What you do next round is what counts.', cs: 'Škody přišly. Teď rozhoduje, co uděláte příští kolo.' },
      lines: [
        { sp: 'fojtik', en: 'Every mayor remembers their first real flood.', cs: 'Každý starosta si pamatuje svou první opravdovou povodeň.' },
        { sp: 'fojtik', en: 'The water does not care how well you meant it.', cs: 'Vodu nezajímá, jak dobře jsi to myslel.' },
        { sp: 'reporter', en: 'What do you tell a mayor, after that?', cs: 'Co starostovi řeknete — potom?' },
        { sp: 'fojtik', en: 'That the first flood is not the one that defines you. The next nine are.', cs: 'Že tě nedefinuje první povodeň. Ale těch devět dalších.' },
        { sp: 'fojtik', en: 'Learn what that water was trying to tell you — where it came from, who it visited on the way. Then spend the next season answering it. Not with anger.', cs: 'Pochop, co ti ta voda zkoušela říct — odkud přišla, koho cestou navštívila. A příští sezónu jí odpověz. Ne vztekem.' },
        { sp: 'fojtik', en: 'With boats.', cs: 'Čluny.' },
      ],
    },
  ],
};

export const VIDEOS = [INTRO, CALM, LOSS];
