// =============================================================================
// The Elbe Herald / Labský kurýr — procedural newspaper after each flood season.
// Pure, client-side, template-driven: no API, no cost, instant, works hosted.
// Turns the round's raw outcome into a few sentences of plain-language reporting
// with consequence (who was spared, who was hit, who helped, who walled up).
// Bilingual: English and Czech share the same numbers but build their own prose.
// =============================================================================

import { MAYORS, EXPOSURE, RELATIONSHIP } from '../data/gameData.js';
import { getLang, t } from '../i18n.js';

const euro = (m) => (!m || m < 1 ? '€0' : m >= 1000 ? `€${(m / 1000).toFixed(1)}bn` : `€${Math.round(m)}M`);

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

// Czech count agreement: 1 -> one, 2–4 -> few, else -> many.
function cz(n, one, few, many) { return n === 1 ? one : (n >= 2 && n <= 4 ? few : many); }

/**
 * Build the season's article from game state. Returns
 * { masthead, dateline, headline, paragraphs[], quote, footer, tone }.
 */
export function writeArticle(gs) {
  const rng = gs.rng;
  const results = gs.lastResults || [];
  const sev = gs.regionalSeverity ?? 0;
  const player = gs.munis.find((m) => m.isPlayer);
  const playerMayor = MAYORS[gs.playerMuniId];

  const totalDamage = results.reduce((a, r) => a + r.damage, 0);
  const totalDeaths = results.reduce((a, r) => a + r.deaths, 0);
  const worst = results.slice().sort((a, b) => b.damage - a.damage)[0];
  const worstMuni = worst && gs.munis.find((m) => m.id === worst.id);
  const destroyed = gs.munis.filter((m) => m.destroyed);

  const ordered = [...gs.munis].sort((a, b) => a.def.pos - b.def.pos);
  const wallers = ordered.filter((m) => m.leveesBuilt >= 2 && m.def.pos <= 4);
  const helps = (gs.notifications || []).filter((n) => n.includes('sent'));
  const betrayals = (gs.notifications || []).filter((n) => n.includes('betrayed'));
  const dataLost = destroyed.some((m) => m.def.trait === 'dataVuln');
  const evtName = gs.currentEvent && gs.currentEvent.id !== 'calm' ? t(`event.${gs.currentEvent.id}.name`) : null;
  const sevLabel = t(`sev.${sev}`);
  const tone = totalDeaths > 0 ? 'disaster' : totalDamage > 120 ? 'damage' : sev === 0 ? 'calm' : 'mild';

  const cs = getLang() === 'cs';
  const paragraphs = [];
  let headline, quote, footer, masthead, dateline;

  if (cs) {
    // --- Czech -----------------------------------------------------------
    masthead = 'LABSKÝ KURÝR';
    dateline = `Povodňová sezóna ${gs.round} z 10 · Severní Čechy`;

    if (sev === 0 || totalDamage < 5) {
      headline = pick(rng, ['KLIDNÁ SEZÓNA NA LABI', 'LABE ZACHOVALO KLID', 'LETOS BEZ POVODNĚ — OBCE SI ODDECHLY']);
    } else if (totalDeaths === 0 && totalDamage < 120) {
      headline = pick(rng, ['ŘEKA STOUPLA, OBCE ODOLALY', 'MOKRÁ SEZÓNA, ALE HRÁZE VYDRŽELY', 'MÍRNÉ ZÁPLAVY, ŽÁDNÉ OBĚTI']);
    } else if (totalDeaths === 0) {
      headline = pick(rng, ['NÁKLADNÁ POVODEŇ — ALE BEZ JEDINÉ OBĚTI', `${euro(totalDamage)} ŠKOD, NULA OBĚTÍ`, 'VODA VZALA ULICE, NE LIDI']);
    } else if (totalDeaths < 40) {
      headline = `POVODEŇ SI VYŽÁDALA ${totalDeaths} ${cz(totalDeaths, 'OBĚŤ', 'OBĚTI', 'OBĚTÍ')}; NEJHŮŘE ZASAŽEN ${(worstMuni?.def.name || 'ÚDOLÍ').toUpperCase()}`;
    } else {
      headline = pick(rng, [`KATASTROFA NA LABI: ${totalDeaths} MRTVÝCH`, `KATASTROFA — ${totalDeaths} ŽIVOTŮ, ${euro(totalDamage)} PRYČ`]);
    }
    if (dataLost) headline += '  ·  DATOVÉ CENTRUM OCEANA ZNIČENO';

    const open = sev === 0 ? 'Řeka letos zůstala ve svém korytě.' : `Řeka letos stoupla na úroveň „${sevLabel.toLowerCase()}“.`;
    const evtClause = evtName ? `Na pozadí události „${evtName}“: ` : '';
    const damage = sev === 0 && totalDamage < 1
      ? `${evtClause}obce byly ušetřeny — žádné škody, žádné oběti.`
      : `${evtClause}celkové škody v sedmi obcích dosáhly ${euro(totalDamage)}` +
        (totalDeaths === 0 ? ', a — pozoruhodně — nikdo nepřišel o život.'
          : `, a o život ${cz(totalDeaths, 'přišel jeden člověk', 'přišli lidé', 'přišlo mnoho lidí')} (${totalDeaths}).`);
    paragraphs.push(`${open} ${damage}`);

    if (worst && worst.damage > 5 && worstMuni) {
      paragraphs.push(`${worstMuni.def.name} utrpěl nejtěžší ránu — ${euro(worst.damage)}` +
        (worst.deaths > 0 ? ` a ${worst.deaths} ${cz(worst.deaths, 'oběť', 'oběti', 'obětí')}.` : ' na majetku a infrastruktuře.'));
    }
    if (helps.length) {
      paragraphs.push(`Projevem solidarity poslali ${cz(helps.length, 'sousední starosta', 'sousední starostové', 'sousední starostové')} (${helps.length}) čluny na pomoc obci ${player.def.name}.`);
    }
    if (wallers.length && totalDamage > 100) {
      const w = wallers[0];
      paragraphs.push(`Kritici upozornili, že ${w.def.name} se skrýval za ${w.leveesBuilt} ${cz(w.leveesBuilt, 'hrází', 'hrázemi', 'hrázemi')}, zatímco rozvodněná řeka tlačila na obce po proudu.`);
    }
    if (betrayals.length) {
      paragraphs.push('Nálady se vyhrotily poté, co slíbený příspěvek nedorazil — porušení, na které sousedé hned tak nezapomenou.');
    }

    if (totalDeaths > 0) quote = `„Truchlíme a ptáme se, zda se nedalo udělat víc.“ — ${(worstMuni && MAYORS[worstMuni.id] || playerMayor).name}`;
    else if (totalDamage < 50) quote = `„Byli jsme připraveni. Řeka nás zastihla nachystané.“ — ${playerMayor.name}`;
    else quote = `„Budovy se dají postavit znovu. Své lidi jsme ochránili.“ — ${playerMayor.name}`;

    footer = sev >= 3 ? 'Meteorologové varují, že řeka pro příští sezónu nic neslibuje.' : 'Obce se teď obracejí k nadcházející sezóně.';
  } else {
    // --- English ---------------------------------------------------------
    masthead = 'THE ELBE HERALD';
    dateline = `Flood Season ${gs.round} of 10 · North Bohemia`;

    if (sev === 0 || totalDamage < 5) {
      headline = pick(rng, ['A QUIET SEASON ON THE ELBE', 'THE ELBE HOLDS ITS PEACE', 'NO FLOOD THIS YEAR — TOWNS CATCH THEIR BREATH']);
    } else if (totalDeaths === 0 && totalDamage < 120) {
      headline = pick(rng, ['RIVER SWELLS, TOWNS HOLD FIRM', 'A WET SEASON, BUT THE DEFENCES HELD', 'MINOR FLOODING, NO LIVES LOST']);
    } else if (totalDeaths === 0) {
      headline = pick(rng, ['COSTLY FLOOD — BUT NOT A SINGLE LIFE LOST', `${euro(totalDamage)} IN DAMAGE, ZERO DEATHS`, 'THE WATER TOOK THE STREETS, NOT THE PEOPLE']);
    } else if (totalDeaths < 40) {
      headline = `FLOOD CLAIMS ${totalDeaths} AS ${(worstMuni?.def.name || 'THE VALLEY').toUpperCase()} BEARS THE BRUNT`;
    } else {
      headline = pick(rng, [`DISASTER ON THE ELBE: ${totalDeaths} DEAD`, `CATASTROPHE — ${totalDeaths} LIVES, ${euro(totalDamage)} GONE`]);
    }
    if (dataLost) headline += '  ·  OCEANA DATA HUB DESTROYED';

    const evtClause = evtName ? ` Against the backdrop of ${evtName.toLowerCase()}, t` : ' T';
    const open = sev === 0 ? `The Elbe stayed within its banks this season.` : `The Elbe rose to ${sevLabel.toLowerCase()} levels this season.`;
    const damage = sev === 0 && totalDamage < 1
      ? `${evtClause}he townships were spared: no damage, no casualties.`
      : `${evtClause}otal damage across the seven townships reached ${euro(totalDamage)}` +
        (totalDeaths === 0 ? ', and — remarkably — no lives were lost.'
          : `, and ${totalDeaths} ${totalDeaths === 1 ? 'life was' : 'lives were'} lost.`);
    paragraphs.push(open + damage);

    if (worst && worst.damage > 5 && worstMuni) {
      paragraphs.push(`${worstMuni.def.name} suffered the heaviest blow — ${euro(worst.damage)}` +
        (worst.deaths > 0 ? ` and ${worst.deaths} dead.` : ' in property and infrastructure.'));
    }
    if (helps.length) {
      paragraphs.push(`In a show of solidarity, ${helps.length} neighbouring ${helps.length === 1 ? 'mayor' : 'mayors'} sent boats to ${player.def.name}'s aid.`);
    }
    if (wallers.length && totalDamage > 100) {
      const w = wallers[0];
      paragraphs.push(`Critics noted that ${w.def.name} sat behind ${w.leveesBuilt} levees while the swollen river pressed on the towns downstream.`);
    }
    if (betrayals.length) {
      paragraphs.push('Tempers flared after a promised contribution failed to arrive — a breach neighbours say will not be soon forgotten.');
    }

    if (totalDeaths > 0) quote = `"We grieve, and we ask whether more could have been done." — ${(worstMuni && MAYORS[worstMuni.id] || playerMayor).name}`;
    else if (totalDamage < 50) quote = `"We were ready. The river found us prepared." — ${playerMayor.name}`;
    else quote = `"Buildings can be rebuilt. We kept our people safe." — ${playerMayor.name}`;

    footer = sev >= 3 ? 'Forecasters caution that the river gives no promises for next season.' : 'The towns turn now to the season ahead.';
  }

  return { masthead, dateline, headline, paragraphs, quote, footer, tone };
}

/**
 * End-of-campaign post-mortem: concrete, actionable "what could have been better"
 * read off the actual playthrough — the real-feedback ending.
 */
export function postMortem(gs) {
  const cs = getLang() === 'cs';
  const munis = gs.munis;
  const totalDmg = munis.reduce((a, m) => a + m.damageTotal, 0);
  const totalDeaths = munis.reduce((a, m) => a + m.deathsTotal, 0);
  const rels = Object.values(gs.relationship || {});
  const avgRel = rels.length ? rels.reduce((a, b) => a + b, 0) / rels.length : 50;

  const fp = munis.find((m) => m.def.trait === 'cumulative');
  const oceana = munis.find((m) => m.def.trait === 'dataVuln');
  const greenhaven = munis.find((m) => m.def.trait === 'absorptive');
  const deadly = munis.filter((m) => m.deathsTotal > 40);

  const joinNames = (arr, andW) => arr.map((m) => m.def.name).join(', ').replace(/, ([^,]*)$/, ` ${andW} $1`);

  const tips = [];
  if (cs) {
    tips.push(`Konečná bilance: ${euro(totalDmg)} škod a ${totalDeaths} ${cz(totalDeaths, 'oběť', 'oběti', 'obětí')} v regionu. Dobře sehraná hra na této mapě se pohybuje kolem €1–3 mld. s téměř nulovými oběťmi.`);
    if (oceana && oceana.destroyed) tips.push('Datové centrum Oceany bylo ztraceno — zaplaví se při sebemenším dotyku. Jedna hráz tam v každé nebezpečné sezóně ji ochrání a udrží tok výzkumu pro vzácné karty.');
    if (fp && totalDmg > 0 && fp.damageTotal > totalDmg * 0.22) tips.push('Final Point pohltil neúměrný díl škod. Nese odtok všech obcí: ponechat Greenhaven bez hrází (aby jeho niva pohltila vodu) a nepřehradit obce výše po proudu by ústí ušetřilo.');
    if (greenhaven && greenhaven.leveesBuilt >= 2) tips.push('Greenhaven jste silně opevnili — jeho síla je ale pohlcovat vodu, když zůstane nivou. Hráze ho chrání, ale ženou víc vody na všechny níže.');
    if (avgRel < 45) tips.push(`Sousedé si vás nikdy nenaklonili (průměrná pozice ${Math.round(avgRel)}/100). Financování souseda nebo dodržení dohody mění rivaly ve spojence, kteří vám posílají čluny — spolupráce výrazně překonává hru na vlastní pěst.`);
    if (deadly.length) {
      const names = deadly.length > 3 ? 'Několik obcí' : joinNames(deadly, 'a');
      tips.push(`${names} ${cz(deadly.length, 'přišla o životy', 'přišly o životy', 'přišlo o životy')}, které by čluny a záchranné sady zachránily. I pár člunů srazí počet obětí silné povodně téměř k nule.`);
    }
    if (tips.length === 1) tips.push('Silná, kooperativní kampaň: škody i oběti udrženy nízko a obce většinou táhly za jeden provaz — blízko optimu, který model odměňuje.');
  } else {
    tips.push(`Final tally: ${euro(totalDmg)} in damage and ${totalDeaths} dead across the region. A well-coordinated run on this map lands near €1–3bn with almost no deaths.`);
    if (oceana && oceana.destroyed) tips.push('Oceana’s data hub was lost — it floods at the slightest touch. One levee there in every dangerous season protects it and keeps your rare-card research flowing.');
    if (fp && totalDmg > 0 && fp.damageTotal > totalDmg * 0.22) tips.push('Final Point soaked up a disproportionate share of the damage. It bears every town’s runoff: leaving Greenhaven unleveed (so its floodplain absorbs flow) and not over-walling the upstream towns would have spared the estuary.');
    if (greenhaven && greenhaven.leveesBuilt >= 2) tips.push('You walled Greenhaven heavily — but its strength is to absorb flow when left as a floodplain. Levees there protect it while pushing more water onto everyone below.');
    if (avgRel < 45) tips.push(`Your neighbours never warmed to you (average standing ${Math.round(avgRel)}/100). Funding a neighbour or honouring a deal turns rivals into allies who send you boats — cooperation hugely out-scores going it alone.`);
    if (deadly.length) {
      const names = deadly.length > 3 ? 'Several towns' : joinNames(deadly, 'and');
      tips.push(`${names} lost lives that boats and life-kits would have saved. Even a couple of boats cuts a severe flood’s death toll close to zero.`);
    }
    if (tips.length === 1) tips.push('A strong, cooperative campaign: damage and deaths kept low and the towns mostly pulled together — close to the optimum the model rewards.');
  }
  return tips.slice(0, 5);
}

/**
 * End-of-campaign PRIVATE briefing for the player's own town: a confidential
 * memo distinct from the public newspaper. Returns raw numbers + i18n keys so
 * the scene renders them localized. Embodies the core tension — re-election is
 * parochial (your town only) while the regional score rewards cooperation, so a
 * mayor can keep their seat while the valley drowns, and the memo says so.
 */
/**
 * The shared standing math — cumulative across the campaign. Used by BOTH the
 * end-game memo and the per-round briefing so the two can never disagree.
 *   reElection: parochial (your town's damage/deaths/morale + a small rel nudge)
 *   score:      regional cooperative outcome (region-wide damage/deaths + coop)
 */
export function cityStanding(gs) {
  const munis = gs.munis;
  const own = munis.find((m) => m.isPlayer) || munis[0];
  const regionDamage = munis.reduce((a, m) => a + m.damageTotal, 0);
  const regionDeaths = munis.reduce((a, m) => a + m.deathsTotal, 0);
  const ownDamage = own.damageTotal;
  const ownDeaths = own.deathsTotal;
  const ownMorale = own.morale ?? 50;
  const destroyed = munis.filter((m) => m.destroyed).length;
  const rels = Object.values(gs.relationship || {});
  const avgRel = rels.length ? rels.reduce((a, b) => a + b, 0) / rels.length : 50;
  // Re-election is RECOVERABLE: driven mainly by current MORALE (which falls with
  // disaster and rises again in calm, well-run seasons), with DEATHS the lasting
  // penalty and a small regional-standing nudge. Property damage hits morale, not
  // the ballot directly — voters forgive flooded streets if their mayor kept them
  // safe and hopeful. (Old formula penalised lifetime damage so hard that approval
  // could only ever fall — you could never climb back above ~30%.)
  let reElection = 20 + ownMorale * 0.6 - Math.min(30, ownDeaths * 0.15) + (avgRel - 50) * 0.2;
  reElection = Math.max(2, Math.min(98, Math.round(reElection)));

  // Public mood tracks morale closely, dampened by lives lost — so mood and the
  // re-election number stay consistent (no "grateful town, doomed mayor").
  const moodScore = ownMorale - Math.min(30, ownDeaths * 0.12);
  const moodKey = moodScore >= 75 ? 'mood.grateful' : moodScore >= 58 ? 'mood.hopeful'
    : moodScore >= 42 ? 'mood.steady' : moodScore >= 25 ? 'mood.anxious' : 'mood.furious';

  let score = 100 - Math.min(55, regionDamage / 120) - Math.min(35, regionDeaths * 0.05)
    - destroyed * 8 + (avgRel - 50) * 0.2;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = score >= 92 ? 'A+' : score >= 85 ? 'A' : score >= 78 ? 'B'
    : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

  return { own, ownMorale, avgRel, reElection, moodKey, score, grade,
    regionDamage, regionDeaths, ownDamage, ownDeaths };
}

export function finalReport(gs) {
  const s = cityStanding(gs);
  const verdictKey = (s.score >= 75 && s.avgRel >= 58) ? 'brief.verdict.coop'
    : (s.reElection >= 58 && s.score < 60) ? 'brief.verdict.parochial'
    : s.score >= 60 ? 'brief.verdict.mixed' : 'brief.verdict.poor';
  return {
    score: s.score, grade: s.grade, reElection: s.reElection, moodKey: s.moodKey, verdictKey,
    ownDeaths: s.ownDeaths, regionDeaths: s.regionDeaths,
    ownDamage: euro(s.ownDamage), regionDamage: euro(s.regionDamage),
    regionDamageRaw: Math.round(s.regionDamage),   // €M, numeric — for the scoreboard
    ownName: s.own.def.name,
  };
}

/**
 * Per-round private "Mayor's note": your standing + this season's own-vs-region
 * outcome + ONE forward-looking nudge for next round. Reads only own-town +
 * already-public data (never neighbours' hidden plans). `trend` compares this
 * round's re-election to the cached gs.prevReElection (the scene updates it).
 */
export function roundBriefing(gs) {
  const s = cityStanding(gs);
  const results = gs.lastResults || [];
  const ownRow = results.find((r) => r.id === gs.playerMuniId) || { damage: 0, deaths: 0 };
  const ownDeathsRound = ownRow.deaths || 0;
  const regionDmgRound = results.reduce((a, r) => a + (r.damage || 0), 0);
  const regionDeathsRound = results.reduce((a, r) => a + (r.deaths || 0), 0);

  const prev = gs.prevReElection == null ? s.reElection : gs.prevReElection;
  const delta = s.reElection - prev;
  const trend = delta >= 4 ? 'up' : delta <= -4 ? 'down' : 'flat';

  const oceanaDown = gs.munis.some((m) => m.def.trait === 'dataVuln' && m.destroyed);
  const spare = (s.own.budget || 0) + (s.own.banked || 0);

  // One nudge, highest-priority first — each maps to a lever on the next PREP.
  let adviceKey;
  if (ownDeathsRound > 0) adviceKey = 'brief.adv.deaths';
  else if (delta <= -8) adviceKey = 'brief.adv.falling';
  else if (s.ownMorale < 30) adviceKey = 'brief.adv.panic';
  else if (oceanaDown) adviceKey = 'brief.adv.blind';
  else if (s.reElection >= 70 && s.avgRel < 45) adviceKey = 'brief.adv.parochial';
  else if (s.avgRel >= RELATIONSHIP.allyAt) adviceKey = 'brief.adv.favour';
  else if (spare >= 70) adviceKey = 'brief.adv.hoard';
  else adviceKey = 'brief.adv.steady';

  return {
    reElection: s.reElection, trend, delta: Math.round(delta), moodKey: s.moodKey,
    ownDmgRound: euro(ownRow.damage || 0), ownDeathsRound,
    regionDmgRound: euro(regionDmgRound), regionDeathsRound,
    adviceKey, ownName: s.own.def.name,
  };
}
