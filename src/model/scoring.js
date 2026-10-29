// =============================================================================
// POVODEŇ — Scoring
// -----------------------------------------------------------------------------
// The campaign is judged regionally: deaths, damage (including any bailout
// audit penalty), towns lost and average morale across all seven seats.
// =============================================================================

/** H_n = 1 + 1/2 + ... + 1/n, the expected number of records in n i.i.d. draws. */
export function harmonic(n) {
  let h = 0;
  for (let k = 1; k <= n; k++) h += 1 / k;
  return h;
}

/**
 * Record-breaking seasons the player saw: live seasons whose latent flood draw
 * (peak discharge) beat every live season before it. For a memoryless river the
 * expected count over n seasons is the harmonic number H_n (Section 3.1).
 */
export function recordSeasons(gs) {
  const draws = gs.seasonDraws || [];
  let best = -Infinity;
  let records = 0;
  for (const u of draws) {
    if (u > best) { records += 1; best = u; }
  }
  return { n: draws.length, records, expected: harmonic(draws.length) };
}

export function regionalScore(gs) {
  const totalDeaths = gs.munis.reduce((a, m) => a + m.deathsTotal, 0);
  const totalSaved = gs.munis.reduce((a, m) => a + m.savedTotal, 0);
  const auditPenalty = gs.auditPenalty || 0;
  const totalDamage = gs.munis.reduce((a, m) => a + m.damageTotal, 0) + auditPenalty;
  const destroyed = gs.munis.filter((m) => m.destroyed).length;
  const avgMorale = Math.round(gs.munis.reduce((a, m) => a + m.morale, 0) / gs.munis.length);
  return { totalDeaths, totalSaved, totalDamage, destroyed, avgMorale, auditPenalty };
}
