// =============================================================================
// Asset manifest & progressive loading
// -----------------------------------------------------------------------------
// The images are grouped by when the player first needs them:
//   menu  — the title background; everything the menu screens show.
//   game  — the board map and town sprites; loaded when a campaign starts.
//   news  — newspaper photos; fetched in the background once the board is up
//           (the summary modal already falls back gracefully if one is missing).
// Photographic images ship as WebP with a JPEG twin; a one-pixel decode probe
// picks the format at boot. Large backgrounds come in 1x and @2x variants,
// chosen from the real display size (FIT-scaled canvas × devicePixelRatio).
// Pure data + DOM-free helpers, so tests can validate the manifest in Node.
// =============================================================================

import { MUNICIPALITIES } from '../data/gameData.js';

// Keep in sync with widgets.js (not imported: this module must load headless).
const DESIGN_W = 1280;
const DESIGN_H = 720;

// 1x1 lossy WebP. decode() succeeds only where WebP is actually supported.
const WEBP_PROBE =
  'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';

let webpSupported = null; // null until probeImageFormats() resolves
let probePromise = null;

/** Detect once (at boot) whether the browser decodes WebP. */
export function probeImageFormats() {
  if (probePromise) return probePromise;
  probePromise = new Promise((resolve) => {
    if (typeof Image === 'undefined') { webpSupported = false; resolve(false); return; }
    const img = new Image();
    img.onload = () => { webpSupported = img.width === 1; resolve(webpSupported); };
    img.onerror = () => { webpSupported = false; resolve(false); };
    img.src = WEBP_PROBE;
  });
  return probePromise;
}

/** Photo extension for this browser; JPEG until (or unless) the probe says WebP. */
export const photoExt = () => (webpSupported ? 'webp' : 'jpg');

/**
 * '' (1x) or '@2x' for the large backgrounds. The canvas is FIT-scaled into
 * the window, so the art is displayed at most at
 * min(width, height·16/9) × devicePixelRatio physical pixels — @2x only pays
 * for itself when that meaningfully exceeds the 1280×720 design resolution.
 */
export function assetVariant(view) {
  const v = view || (typeof window === 'undefined'
    ? { width: DESIGN_W, height: DESIGN_H, dpr: 1 }
    : { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 });
  const displayW = Math.min(v.width, v.height * (DESIGN_W / DESIGN_H)) * (v.dpr || 1);
  return displayW > DESIGN_W * 1.25 ? '@2x' : '';
}

export const NEWS_KEYS = ['calm', 'minor', 'rescue', 'disaster', 'cooperation', 'ruin'];

/** What the menu screens need. */
export function menuImages(ext = photoExt(), variant = assetVariant()) {
  return [{ key: 'title_bg', url: `assets/title_bg${variant}.${ext}` }];
}

/** What the game board needs (map + pre-keyed transparent town sprites). */
export function gameImages(ext = photoExt(), variant = assetVariant()) {
  return [
    { key: 'map_valley', url: `assets/map/valley${variant}.${ext}` },
    ...MUNICIPALITIES.map((m) => ({ key: `town_${m.id}`, url: `assets/towns/${m.id}.png` })),
  ];
}

/** Newspaper photos, needed only when a round summary opens. */
export function newsImages(ext = photoExt()) {
  return NEWS_KEYS.map((k) => ({ key: `news_${k}`, url: `assets/news/${k}.${ext}` }));
}

/** Queue every image the scene doesn't have yet; returns how many were queued. */
export function queueMissing(scene, images) {
  let queued = 0;
  for (const { key, url } of images) {
    if (!scene.textures.exists(key)) { scene.load.image(key, url); queued += 1; }
  }
  return queued;
}
