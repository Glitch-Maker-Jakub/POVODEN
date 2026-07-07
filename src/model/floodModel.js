// =============================================================================
// Flood model (paper Section 3)
// -----------------------------------------------------------------------------
// Two pieces:
//   1. drawRegionalSeverity()  — the harmonic-calibrated, i.i.d. flood draw.
//   2. resolveFlood()          — propagates the wave downstream through the
//      shared river (the coupling that makes cooperation rational) and runs a
//      competitive Lotka–Volterra rescue simulation per municipality.
//
// All randomness is injected via an `rng` function (defaults to Math.random)
// so simulations are reproducible and unit-testable.
// =============================================================================

import { SEVERITY, BALANCE } from '../data/gameData.js';
import { makeZetaNoise } from './zetaNoise.js';

/**
 * Draw this round's regional flood severity (0..4).
 *
 * The draw is i.i.d. across rounds by design: the chapter's harmonic-number
 * diagnostic (Section 3.1) found the Elbe record series indistinguishable from
 * exchangeable randomness, i.e. there is NO exploitable pattern. So a player
 * cannot "learn the streak" — last round tells you nothing about this one.
 */
export function drawRegionalSeverity(rng = Math.random) {
  const w = BALANCE.severityWeights;
  const u = rng();
  let acc = 0;
  for (let s = SEVERITY.NONE; s <= SEVERITY.CATASTROPHIC; s++) {
    acc += w[s];
    if (u <= acc) return s;
  }
  return SEVERITY.CATASTROPHIC;
}

const clampSeverity = (s) =>
  Math.max(SEVERITY.NONE, Math.min(SEVERITY.CATASTROPHIC, s));

/**
 * Lotka–Volterra rescue simulation for a single municipality.
 *
 *   x_{j+1} = a · x_j · (1 − (x_j + y_j + z_j) / N)
 *
 * where x = deaths, y = rescued-by-boat, z = sustained-by-kit. Boats and kits
 * each follow a Gaussian-in-time effectiveness profile, perturbed by zeta-gap
 * noise. Returns final death count and lives saved versus a no-intervention
 * baseline run with the same severity.
 */
export function simulateRescue({
  population, effSeverity, boats, kits, noiseOffset = 0,
  boatMult = 1, atRiskMult = 1, morale = 60,
}) {
  const lv = BALANCE.lv;
  const N = population;
  const sevIdx = clampSeverity(Math.round(effSeverity));
  const atRisk = N * lv.atRiskBySeverity[sevIdx] * atRiskMult;
  const lethalPool = atRisk * lv.lethalityBySeverity[sevIdx];
  if (atRisk <= 0 || lethalPool <= 0) {
    return { deaths: 0, saved: 0, atRisk: Math.round(atRisk), deathRate: 0 };
  }

  // Baseline modern emergency response saves most of the lethal pool — but it is
  // scaled by morale. A town in chaos (morale → 0) loses this safety net, so a
  // reckless player can still produce mass casualties. Only the RESIDUAL pool
  // depends on the player's own boats/kits (the Lotka–Volterra rescue layer).
  const baselineFrac = lv.baselineRescueFrac * Math.max(0, Math.min(1, morale / 55));
  const residualPool = lethalPool * (1 - baselineFrac);
  if (residualPool <= 0) {
    return { deaths: 0, saved: 0, atRisk: Math.round(atRisk), deathRate: 0 };
  }

  const peak = lv.steps * 0.45;
  const spread = lv.profileSpread;
  const boatNoise = makeZetaNoise(noiseOffset);
  const kitNoise = makeZetaNoise(noiseOffset + 7);
  const gaussian = (t) => Math.exp(-((t - peak) * (t - peak)) / (2 * spread * spread));

  // Lotka–Volterra death dynamics over the residual pool; boats/kits are the
  // "predators" preying on the death rate.
  const run = (boatCount, kitCount) => {
    let x = residualPool * 0.06 + 1;
    if (x > residualPool) x = residualPool;
    for (let j = 0; j < lv.steps; j++) {
      const g = gaussian(j);
      const yNoise = 1 + lv.noiseAmplitude * boatNoise.next();
      const zNoise = 1 + lv.noiseAmplitude * kitNoise.next();
      const y = boatCount * boatMult * lv.boatAmplitude * N * g * yNoise;
      const z = kitCount * lv.kitAmplitude * N * g * zNoise;
      x = lv.growth * x * (1 - (x + y + z) / N);
      if (x < 0) x = 0;
      if (x > residualPool) x = residualPool;
    }
    return x;
  };

  const deaths = Math.round(Math.min(run(boats, kits), residualPool));
  const baselineDeaths = Math.round(Math.min(run(0, 0), residualPool));
  const saved = Math.max(0, baselineDeaths - deaths);

  return { deaths, saved, atRisk: Math.round(atRisk), deathRate: deaths / N };
}

/**
 * Resolve a full flood round across all seven municipalities.
 *
 * @param {Object[]} munis     Ordered headwaters->estuary. Each needs:
 *                             { id, pos, population, trait,
 *                               invest: { levee, boat, kit } }  (counts this round)
 * @param {number}   regionalSeverity  0..4 from drawRegionalSeverity()
 * @returns {Object[]} per-municipality result, same order.
 *
 * Coupling logic — the cooperation dilemma made mechanical:
 *   • A levee drops the town's OWN effective severity by 1, but deflects
 *     `leveeDeflection` severity-steps onto everyone downstream.
 *   • Greenhaven's floodplain (absorptive trait), if left UNleveed, soaks up
 *     `absorptionRelief` steps of accumulated flow — protecting downstream at
 *     the cost of its own (cheap, scattered) farmland.
 *   • Final Point (cumulative trait) takes an extra `cumulativeBurden`.
 * The upshot: blanket upstream self-levees doom the estuary; the cooperative
 * optimum is absorptive capacity up top + levees concentrated on the dense /
 * toxic / data-critical towns + shared boats.
 */
export function resolveFlood(munis, regionalSeverity, effects = {}) {
  const B = BALANCE;

  // No regional flood this season → a genuinely calm year: zero damage and zero
  // deaths everywhere. There is no water to deflect downstream, nothing to push
  // onto Final Point, and Bayview cannot spill if it never floods. Without this
  // guard, an upstream levee's `carryover` (and the toxic/cumulative effects it
  // triggers) leaked damage and deaths even when the river stayed in its banks.
  if (regionalSeverity < SEVERITY.MINOR) {
    const tempL = effects.tempLevee || {};
    return munis.map((m) => ({
      id: m.id, pos: m.pos, effSeverity: 0, regionalSeverity,
      levees: (m.invest?.levee || 0) + (tempL[m.id] || 0),
      absorbed: 0, damage: 0, deaths: 0, saved: 0, atRisk: 0, deathRate: 0,
    }));
  }

  const ordered = [...munis].sort((a, b) => a.pos - b.pos);
  const tempLevee = effects.tempLevee || {};
  const sevMod = effects.sevMod || {};
  const boatMult = effects.boatMult || {};
  const atRiskMult = effects.atRiskMult || {};

  // Solidarity Pact: pool the signatories' boats and share them equally.
  const pact = effects.pactTowns;
  let pactShare = 0;
  if (pact && pact.length) {
    const pooled = ordered
      .filter((m) => pact.includes(m.id))
      .reduce((a, m) => a + (m.invest?.boat || 0), 0);
    pactShare = Math.ceil(pooled / pact.length);
  }

  const econ = B.economic;
  let carryover = 0;       // accumulated deflected water heading downstream
  let toxicActive = false; // Bayview spill contaminating everyone downstream
  const results = [];

  for (const m of ordered) {
    const permLevees = m.invest?.levee || 0;            // only these deflect
    const protLevees = permLevees + (tempLevee[m.id] || 0); // these protect
    let eff = regionalSeverity + carryover - protLevees + (sevMod[m.id] || 0);

    if (m.trait === 'cumulative' && eff > 0) eff += B.cumulativeBurden; // only when water actually arrives

    // Greenhaven only absorbs while it is left as a floodplain (no hard levees).
    let absorbed = 0;
    if (m.trait === 'absorptive' && permLevees === 0 && eff > 0) {
      absorbed = Math.min(B.absorptionRelief, eff);
    }
    eff = clampSeverity(eff - absorbed);
    const sIdx = clampSeverity(Math.round(eff));

    // --- Economic damage (€M) — the headline loss ---
    let damage = (m.exposure || 0) * econ.damageBySeverity[sIdx];
    if (m.trait === 'dataVuln' && eff >= SEVERITY.MINOR) {
      damage += (m.exposure || 0) * econ.oceanaDataLoss; // irreplaceable data/research
    }
    if (toxicActive) damage += econ.toxicSpillDamage;    // downstream cleanup/health

    let boats = m.invest?.boat || 0;
    if (pact && pact.includes(m.id)) boats = Math.max(boats, pactShare);

    const res = simulateRescue({
      population: m.population,
      effSeverity: eff,
      boats,
      kits: m.invest?.kit || 0,
      noiseOffset: m.pos * 3,
      boatMult: boatMult[m.id] || 1,
      atRiskMult: atRiskMult[m.id] || 1,
      morale: m.morale ?? 60,
    });

    results.push({
      id: m.id,
      pos: m.pos,
      effSeverity: eff,
      regionalSeverity,
      levees: protLevees,
      absorbed,
      damage: Math.round(damage),
      ...res,
    });

    if (!effects.noToxic && m.trait === 'toxicRisk' && eff >= SEVERITY.MODERATE) toxicActive = true;
    carryover += permLevees * B.leveeDeflection;
    carryover -= absorbed;
    if (carryover < 0) carryover = 0;
  }

  const byId = new Map(results.map((r) => [r.id, r]));
  return munis.map((m) => byId.get(m.id));
}
