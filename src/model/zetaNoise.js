// =============================================================================
// Zeta-gap noise (paper Section 3.2)
// -----------------------------------------------------------------------------
// The rescue model is perturbed by pseudo-random fluctuations drawn not from a
// uniform RNG but from the GAPS between successive nontrivial zeros of the
// Riemann zeta function. Per Montgomery's pair-correlation conjecture these
// gaps have a pronounced mode (they "repel"), which players read as weathery /
// natural rather than arbitrary. This is a perceptual choice, not a
// mathematical necessity — but it is the choice the paper documents, so we
// implement it faithfully and the chapter can cite this file.
//
// Imaginary parts of the first 50 nontrivial zeros (Odlyzko's tables).
// =============================================================================

const ZETA_ZEROS = [
  14.134725, 21.022040, 25.010858, 30.424876, 32.935062,
  37.586178, 40.918719, 43.327073, 48.005151, 49.773832,
  52.970321, 56.446248, 59.347044, 60.831779, 65.112544,
  67.079811, 69.546402, 72.067158, 75.704691, 77.144840,
  79.337375, 82.910381, 84.735493, 87.425275, 88.809111,
  92.491899, 94.651344, 95.870634, 98.831194, 101.317851,
  103.725539, 105.446623, 107.168611, 111.029536, 111.874659,
  114.320221, 116.226680, 118.790783, 121.370125, 122.946829,
  124.256819, 127.516684, 129.578704, 131.087689, 133.497737,
  134.756510, 138.116042, 139.736209, 141.123707, 143.111846,
];

// Successive gaps, normalised to mean 0 and roughly unit range so they can be
// used directly as a multiplicative perturbation: effectiveness *= (1 + amp*n).
function buildGaps() {
  const gaps = [];
  for (let i = 1; i < ZETA_ZEROS.length; i++) {
    gaps.push(ZETA_ZEROS[i] - ZETA_ZEROS[i - 1]);
  }
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const maxDev = Math.max(...gaps.map((g) => Math.abs(g - mean)));
  return gaps.map((g) => (g - mean) / maxDev); // ~[-1, 1], modal near 0
}

const NORMALISED_GAPS = buildGaps();

/**
 * Create a deterministic zeta-gap noise generator. Each call to next() returns
 * the next normalised gap, cycling through the sequence. `offset` lets each
 * municipality / round start at a different phase so they don't move in lockstep.
 */
export function makeZetaNoise(offset = 0) {
  let i = ((offset % NORMALISED_GAPS.length) + NORMALISED_GAPS.length) % NORMALISED_GAPS.length;
  return {
    next() {
      const v = NORMALISED_GAPS[i];
      i = (i + 1) % NORMALISED_GAPS.length;
      return v;
    },
  };
}

export const ZETA_GAP_COUNT = NORMALISED_GAPS.length;
