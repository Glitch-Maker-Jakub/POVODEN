// =============================================================================
// Mobile adaptation — landscape gate, dynamic-viewport sizing, fullscreen chip.
//
// The game is a fixed 1280x720 design FIT into #game. On a phone that breaks in
// two independent ways:
//
//   * PORTRAIT (e.g. 412x915): FIT of a 16:9 canvas gives 412x232 — a 0.32
//     scale, unreadable. Cure = play in landscape (732x412 = 0.57) full screen.
//   * LANDSCAPE on Android Chrome: `100vh` is the LARGE viewport (address bar
//     hidden), so while the bar is showing the #game box is taller than the
//     visible area; the FIT canvas is centred in that box and its bottom rows
//     (END PREPARATION, the card hand) fall below the fold, with
//     `overflow:hidden` preventing any scroll. Cure = size the parent to the
//     DYNAMIC viewport and refresh the scale manager on every change.
//
// Everything here is a no-op on desktop: nothing is added to the DOM, nothing
// is listened to. QA overrides (so this can be exercised without a phone):
//   ?mobile=1    force the mobile path on a desktop browser
//   ?portrait=1  force the rotate gate visible (needs ?mobile=1 too)
// =============================================================================

// --- QA overrides ----------------------------------------------------------
let FORCE_MOBILE = false;
let FORCE_PORTRAIT = false;
try {
  const q = new URLSearchParams(window.location.search);
  FORCE_MOBILE = q.get('mobile') === '1';
  FORCE_PORTRAIT = q.get('portrait') === '1';
} catch (e) { /* no URLSearchParams / no location — stay on the desktop path */ }

// A coarse pointer alone is not enough (touch laptops, drawing tablets); pair it
// with a physically small screen. 900 css-px of shortest edge keeps phones and
// small phablets in, and tablets/desktops out.
function detectMobile() {
  try {
    return window.matchMedia('(pointer: coarse)').matches &&
      Math.min(window.screen.width, window.screen.height) < 900;
  } catch (e) { return false; }
}

function isPortrait() {
  if (FORCE_PORTRAIT) return true;
  try { return window.matchMedia('(orientation: portrait)').matches; }
  catch (e) { return window.innerHeight > window.innerWidth; }
}

// --- Fullscreen / orientation ---------------------------------------------
const ROOT = document.documentElement;

function fsElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

// iPhone Safari exposes fullscreen on <video> only — no chip there, and the gate
// still helps because its text asks the player to rotate.
function canFullscreen() {
  try {
    if (document.fullscreenEnabled === false) return false;
    return !!(ROOT.requestFullscreen || ROOT.webkitRequestFullscreen);
  } catch (e) { return false; }
}

function lockLandscape() {
  // Android Chrome only, and only from inside fullscreen. iOS throws. Either way
  // a failure is fine — the gate stays up until the player rotates by hand.
  try {
    const o = window.screen && window.screen.orientation;
    if (o && o.lock) {
      const p = o.lock('landscape');
      if (p && p.catch) p.catch(function () { /* unsupported — ignore */ });
    }
  } catch (e) { /* ignore */ }
}

function goFullscreen() {
  let p = null;
  try {
    if (ROOT.requestFullscreen) p = ROOT.requestFullscreen({ navigationUI: 'hide' });
    else if (ROOT.webkitRequestFullscreen) ROOT.webkitRequestFullscreen();
  } catch (e) { p = null; }
  if (p && p.then) p.then(lockLandscape, lockLandscape);
  else lockLandscape();
}

// --- Strings (inline on purpose: i18n.js is owned elsewhere) ---------------
const STRINGS = {
  en: {
    head: 'Turn your phone sideways',
    body: 'POVODEŇ plays in landscape. Tap to go full screen.',
    play: '▶ PLAY FULL SCREEN',
  },
  cs: {
    head: 'Otočte telefon na šířku',
    body: 'POVODEŇ se hraje na šířku. Klepnutím přepnete na celou obrazovku.',
    play: '▶ HRÁT NA CELOU OBRAZOVKU',
  },
};
function strings() {
  let lang = 'en';
  try { if (localStorage.getItem('povoden_lang') === 'cs') lang = 'cs'; } catch (e) { /* ignore */ }
  return STRINGS[lang];
}

// Decorative rotate-the-phone glyph. Inline so there is no extra request and
// nothing to 404 on a static host.
const ROTATE_SVG =
  '<svg viewBox="0 0 140 104" width="128" height="95" aria-hidden="true" focusable="false">' +
  '<g fill="none" stroke="#c9a24b" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="16" y="6" width="36" height="62" rx="6"/>' +
  '<line x1="27" y1="15" x2="41" y2="15"/>' +
  '<g opacity=".5"><rect x="76" y="24" width="58" height="34" rx="6"/>' +
  '<line x1="125" y1="33" x2="125" y2="49"/></g>' +
  '<path d="M52 84c14 9 30 9 44 0"/>' +
  '<polyline points="88 78 97 83 92 92"/>' +
  '</g></svg>';

// =============================================================================
export function initMobile(game) {
  const isMobile = FORCE_MOBILE || detectMobile();

  // Desktop: touch nothing at all.
  if (!isMobile) {
    window.POVODEN_MOBILE = { isMobile: false, refresh: function () {} };
    return;
  }

  const parent = document.getElementById('game');
  let gate = null;
  let gateHead = null;
  let gateBody = null;
  let gatePlay = null;
  let chip = null;
  let t1 = 0;
  let t2 = 0;

  // --- viewport -> parent height -> Phaser -------------------------------
  function applyViewport() {
    const vv = window.visualViewport;
    // While the player is pinch-zoomed the visual viewport shrinks; resizing the
    // box then would shrink the canvas by exactly as much as the zoom magnifies
    // it, cancelling the zoom out. Leave the last good height alone instead.
    const zoomed = !!(vv && vv.scale && vv.scale > 1.05);
    if (parent && !zoomed) {
      const h = Math.round((vv && vv.height) || window.innerHeight || 0);
      if (h > 0) parent.style.height = h + 'px';
    }
    try { if (game && game.scale) game.scale.refresh(); } catch (e) { /* ignore */ }
  }

  function refresh() {
    clearTimeout(t1);
    clearTimeout(t2);
    t1 = setTimeout(applyViewport, 100);
    // Android reports stale innerHeight/visualViewport sizes for a few hundred
    // ms after a rotation or after the address bar slides away — measure again.
    t2 = setTimeout(applyViewport, 400);
  }

  // --- portrait gate ------------------------------------------------------
  function buildGate() {
    gate = document.createElement('div');
    gate.id = 'povoden-rotate-gate';
    gate.style.cssText =
      'position:fixed;top:0;left:0;inset:0;z-index:20000;background:#0a0f1a;' +
      'color:#e6eef7;font-family:monospace;text-align:center;cursor:pointer;' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'gap:18px;box-sizing:border-box;padding:24px;' +
      'padding-top:max(24px,env(safe-area-inset-top,0px));' +
      'padding-bottom:max(24px,env(safe-area-inset-bottom,0px));' +
      '-webkit-tap-highlight-color:transparent;touch-action:manipulation;';

    const art = document.createElement('div');
    art.innerHTML = ROTATE_SVG;
    art.style.cssText = 'line-height:0;';

    gateHead = document.createElement('div');
    gateHead.style.cssText =
      'font-size:22px;font-weight:bold;color:#c9a24b;letter-spacing:.04em;';

    gateBody = document.createElement('div');
    gateBody.style.cssText =
      'font-size:14px;line-height:1.55;color:#9fb3cc;max-width:34em;';

    gatePlay = document.createElement('button');
    gatePlay.type = 'button';
    gatePlay.style.cssText =
      'margin-top:6px;min-height:52px;padding:14px 24px;font-family:monospace;' +
      'font-size:15px;letter-spacing:.04em;cursor:pointer;color:#e6eef7;' +
      'background:rgba(17,26,44,.9);border:2px solid #c9a24b;border-radius:4px;' +
      '-webkit-tap-highlight-color:transparent;touch-action:manipulation;';

    gate.append(art, gateHead, gateBody, gatePlay);
    // One handler: the button's click bubbles up to the gate.
    gate.addEventListener('click', function () {
      // The ?portrait=1 QA override is one-shot: it forces the gate to appear on
      // load, then releases so the rest of the flow (fullscreen -> gate hides ->
      // chip hides) can be walked through on a desktop browser. On a real phone
      // it is already false and the gate keeps itself up until the device
      // actually turns.
      FORCE_PORTRAIT = false;
      goFullscreen();
      update();
      refresh();
    });
    document.body.append(gate);
  }

  function showGate() {
    if (!gate) buildGate();
    const s = strings();               // re-read: the player may have switched language
    gateHead.textContent = s.head;
    gateBody.textContent = s.body;
    gatePlay.textContent = s.play;
    gate.style.display = 'flex';
  }

  function hideGate() {
    if (gate) gate.style.display = 'none';
  }

  // --- fullscreen chip ----------------------------------------------------
  function buildChip() {
    chip = document.createElement('button');
    chip.type = 'button';
    chip.id = 'povoden-fs-chip';
    chip.textContent = '⛶';
    chip.setAttribute('aria-label', 'Full screen');
    // Below the story-video overlay (z 10000) so it never floats over a film.
    chip.style.cssText =
      'position:fixed;z-index:9000;display:none;align-items:center;' +
      'justify-content:center;width:38px;height:38px;padding:0;line-height:1;' +
      'left:8px;bottom:8px;left:max(8px,env(safe-area-inset-left,0px));' +
      'bottom:max(8px,env(safe-area-inset-bottom,0px));' +
      'font-size:18px;font-family:monospace;color:#e6eef7;' +
      'background:rgba(17,26,44,.55);border:1px solid rgba(201,162,75,.6);' +
      'border-radius:6px;cursor:pointer;-webkit-tap-highlight-color:transparent;' +
      'touch-action:manipulation;';
    chip.addEventListener('click', function (e) {
      e.stopPropagation();
      goFullscreen();
      refresh();
    });
    document.body.append(chip);
  }

  // --- state machine ------------------------------------------------------
  function update() {
    const portrait = isPortrait();
    if (portrait) showGate(); else hideGate();

    const wantChip = !portrait && canFullscreen() && !fsElement();
    if (wantChip && !chip) buildChip();
    if (chip) chip.style.display = wantChip ? 'flex' : 'none';
  }

  function onChange() { update(); refresh(); }

  window.addEventListener('resize', onChange, { passive: true });
  window.addEventListener('orientationchange', onChange, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onChange, { passive: true });
  }
  document.addEventListener('fullscreenchange', onChange);
  document.addEventListener('webkitfullscreenchange', onChange);
  try {
    const mq = window.matchMedia('(orientation: portrait)');
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  } catch (e) { /* ignore */ }

  update();
  applyViewport();
  refresh();

  window.POVODEN_MOBILE = { isMobile: true, refresh: refresh };
}
