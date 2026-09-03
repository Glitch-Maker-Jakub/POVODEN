// =============================================================================
// Seeded RNG (mulberry32)
// -----------------------------------------------------------------------------
// Every source of game randomness is injected as an `rng` function
// (createGameState, drawRegionalSeverity). The browser build keeps the
// Math.random default; tests and headless balance simulations pass
// createSeededRng(seed) instead, so a whole campaign replays identically
// from a known seed.
// =============================================================================

/** Fold an arbitrary seed (number or string) into a 32-bit unsigned integer. */
export function hashSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  const s = String(seed);
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** In-place Fisher–Yates shuffle driven by an injected rng. Returns the array. */
export function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Deterministic RNG with the same contract as Math.random: () => [0, 1).
 * Same seed -> same sequence, on every platform (integer math only).
 */
export function createSeededRng(seed = 0) {
  let a = hashSeed(seed);
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
