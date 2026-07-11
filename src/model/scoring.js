// =============================================================================
// POVODEŇ — Scoring
// -----------------------------------------------------------------------------
// The campaign is judged regionally: deaths, damage (including any bailout
// audit penalty), towns lost and average morale across all seven seats.
// =============================================================================

export function regionalScore(gs) {
  const totalDeaths = gs.munis.reduce((a, m) => a + m.deathsTotal, 0);
  const totalSaved = gs.munis.reduce((a, m) => a + m.savedTotal, 0);
  const auditPenalty = gs.auditPenalty || 0;
  const totalDamage = gs.munis.reduce((a, m) => a + m.damageTotal, 0) + auditPenalty;
  const destroyed = gs.munis.filter((m) => m.destroyed).length;
  const avgMorale = Math.round(gs.munis.reduce((a, m) => a + m.morale, 0) / gs.munis.length);
  return { totalDeaths, totalSaved, totalDamage, destroyed, avgMorale, auditPenalty };
}
