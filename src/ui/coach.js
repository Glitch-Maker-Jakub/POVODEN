// =============================================================================
// Coach callouts — short, non-blocking, anchored hints shown in the FIRST TWO
// rounds of a campaign that explain WHAT each control does and HOW to use it.
//
// Deliberately FUNCTION-ONLY, never SOLUTION: the coach describes mechanics and
// what happens on screen. It never evaluates an option, never says what is
// better/cheaper/safer, and never mentions downstream deflection, cooperation
// pay-offs, the regional score or re-election. Those belong to the advisor and
// the How-To screens. This game is used in a research study measuring whether
// cooperation behaviour changes across campaigns — a hint that nudges a choice
// would contaminate the data.
//
// The bubble sits at depth 1500: above the game, BELOW the hover tooltips
// (2000/2001). Only the bubble body swallows clicks; everything else stays live.
//
//   const coach = createCoach(scene, steps, { onLog });
//   coach.begin();                 // after an advisor modal closes
//   coach.refresh();               // from refreshAll() and every modal close
//   coach.used('buy');             // auto-advance when the control was used
//   coach.destroy();               // on the scene's 'shutdown' event
// =============================================================================

import { COL, FONT, makeButton, DESIGN_W, DESIGN_H } from './widgets.js';
import { PHASE } from '../model/gameState.js';
import { t } from '../i18n.js';

const FLAG_KEY = 'povoden_coach';   // '1' once skipped or completed
const DEPTH = 1500;
const PAD = 12;                     // inner padding of the bubble
const WRAP = 300;                   // text wrap width
const GAP = 12;                     // distance between anchor and bubble
const MARGIN = 8;                   // keep-inside-screen margin
const ROW_H = 24;                   // button row height
const GOLD = 0xc9a24b;

// QA override: ?coach=1 forces the callouts on even for a returning player.
let forced = false;
try {
  forced = /(?:^|[?&])coach=1(?:&|$)/.test(String(window.location.search || ''));
} catch (e) { forced = false; }

function flagSet() {
  try { return localStorage.getItem(FLAG_KEY) === '1'; } catch (e) { return false; }
}
function raiseFlag() {
  try { localStorage.setItem(FLAG_KEY, '1'); } catch (e) { /* private mode */ }
}

/** True when this browser has already skipped/completed the coach (and no ?coach=1). */
export function coachDisabled() { return !forced && flagSet(); }

const clamp = (v, lo, hi) => (hi < lo ? lo : v < lo ? lo : v > hi ? hi : v);

function rectsOverlap(a, b) {
  return a.x < b.right && a.x + a.w > b.left && a.y < b.bottom && a.y + a.h > b.top;
}

/** Normalise an anchor (game object, array of objects, or plain rect) to bounds. */
function boundsOf(anchor) {
  if (!anchor) return null;
  const list = Array.isArray(anchor) ? anchor : [anchor];
  let l = Infinity, r = -Infinity, tp = Infinity, b = -Infinity;
  for (const o of list) {
    if (!o) continue;
    let bb;
    if (typeof o.getBounds === 'function') bb = o.getBounds();
    else if (o.width != null && o.x != null) bb = { left: o.x, right: o.x + o.width, top: o.y, bottom: o.y + o.height };
    else continue;
    if (!isFinite(bb.left) || !isFinite(bb.top)) continue;
    l = Math.min(l, bb.left); r = Math.max(r, bb.right);
    tp = Math.min(tp, bb.top); b = Math.max(b, bb.bottom);
  }
  if (!isFinite(l) || r <= l) return null;
  return { left: l, right: r, top: tp, bottom: b, centerX: (l + r) / 2, centerY: (tp + b) / 2 };
}

/**
 * Choose a bubble position beside/above/below the anchor: fully inside the
 * 1280x720 design space, never covering the anchor itself, and — where a side
 * allows it — clear of the step's `avoid` rects (other controls the player
 * should still see). Falls back to the least-bad candidate, hard-clamped
 * inside the screen.
 */
function place(bounds, w, h, prefer, avoid = []) {
  const order = prefer && prefer.length ? prefer : ['right', 'left', 'below', 'above'];
  let best = null;
  for (const side of order) {
    let x, y;
    if (side === 'right') { x = bounds.right + GAP; y = bounds.centerY - h / 2; }
    else if (side === 'left') { x = bounds.left - GAP - w; y = bounds.centerY - h / 2; }
    else if (side === 'below') { x = bounds.centerX - w / 2; y = bounds.bottom + GAP; }
    else { x = bounds.centerX - w / 2; y = bounds.top - GAP - h; }

    // Slide along the free axis only, so the bubble stays on its chosen side.
    if (side === 'right' || side === 'left') y = clamp(y, MARGIN, DESIGN_H - MARGIN - h);
    else x = clamp(x, MARGIN, DESIGN_W - MARGIN - w);

    const rect = { x, y, w, h, side };
    const over = Math.max(0, MARGIN - x) + Math.max(0, MARGIN - y)
      + Math.max(0, x + w - (DESIGN_W - MARGIN)) + Math.max(0, y + h - (DESIGN_H - MARGIN));
    const hit = rectsOverlap(rect, bounds);
    const covers = avoid.filter((a) => rectsOverlap(rect, a)).length;
    if (over <= 0.5 && !hit && covers === 0) return rect;
    const score = over + (hit ? 10000 : 0) + covers * 100;
    if (!best || score < best.score) best = Object.assign(rect, { score });
  }
  best.x = clamp(best.x, MARGIN, DESIGN_W - MARGIN - w);
  best.y = clamp(best.y, MARGIN, DESIGN_H - MARGIN - h);
  return best;
}

/**
 * @param {Phaser.Scene} scene
 * @param {Array} steps  [{ key, minRound, anchor(), usedBy?, when?, prefer? }]
 * @param {Object} opts  { onLog(step, action) }
 */
export function createCoach(scene, steps, opts = {}) {
  const onLog = typeof opts.onLog === 'function' ? opts.onLog : () => {};
  const maxRound = opts.maxRound || 2;

  const seen = new Set();      // step keys done this campaign (memory only)
  const announced = new Set(); // step keys already logged as 'shown'
  let started = false, finished = false, dead = false;
  let curKey = null, lastSig = '';

  // --- objects -----------------------------------------------------------
  const c = scene.add.container(0, 0).setDepth(DEPTH).setVisible(false);
  const gfx = scene.add.graphics();
  const hitBox = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.001).setOrigin(0, 0);
  hitBox.setInteractive();                       // swallow clicks on the bubble only
  const txt = scene.add.text(PAD, PAD, '', {
    fontFamily: FONT, fontSize: '13px', color: COL.ink,
    align: 'left', wordWrap: { width: WRAP }, lineSpacing: 3,
  });
  const counter = scene.add.text(PAD, 0, '', { fontFamily: FONT, fontSize: '11px', color: COL.inkDim });
  const nextBtn = makeButton(scene, 0, 0, 92, ROW_H, t('coach.next'),
    () => advance('next'), { fill: 0x1f7a3d, fillHover: 0x2a9b4f, fontSize: 11 });
  const skipBtn = makeButton(scene, 0, 0, 118, ROW_H, t('coach.skip'),
    () => skip(), { fill: 0x27364f, fillHover: 0x38506f, fontSize: 10 });
  c.add([gfx, hitBox, txt, counter, skipBtn, nextBtn]);

  const halo = scene.add.rectangle(0, 0, 10, 10).setStrokeStyle(2, COL.accent)
    .setDepth(DEPTH - 1).setVisible(false);
  let haloTween = null;

  // --- queue -------------------------------------------------------------
  const safe = (fn, dflt) => { try { return fn(); } catch (e) { return dflt; } };
  const applicable = (s) => !seen.has(s.key) && s.minRound <= scene.gs.round
    && (!s.when || safe(s.when, false));
  const pending = () => steps.filter(applicable);

  /**
   * The step on screen right now. Once a step is showing it STAYS showing until
   * it is answered or stops applying — otherwise a control that appears later in
   * the round (a deal panel, a freshly dealt card) would yank the bubble away
   * from the hint the player is in the middle of reading.
   */
  function current() {
    if (!started || finished || !scene.gs || scene.gs.round > maxRound) return null;
    const list = pending();
    if (curKey) {
      const locked = list.find((s) => s.key === curKey);
      if (locked) return locked;
    }
    return list[0];
  }

  function roundCounter() {
    const inRound = steps.filter((s) => s.minRound <= scene.gs.round);
    const pos = inRound.filter((s) => seen.has(s.key)).length + 1;
    return `${Math.min(pos, inRound.length)}/${inRound.length}`;
  }

  // --- drawing -----------------------------------------------------------
  function draw(step, bounds) {
    txt.setText(t(`coach.${step.key}`));
    const w = WRAP + PAD * 2;
    const rowY = PAD + Math.ceil(txt.height) + 10;
    const h = rowY + ROW_H + PAD;

    counter.setPosition(PAD, rowY + ROW_H / 2).setOrigin(0, 0.5).setText(roundCounter());
    nextBtn.setPosition(w - PAD - 46, rowY + ROW_H / 2);
    skipBtn.setPosition(w - PAD - 92 - 8 - 59, rowY + ROW_H / 2);

    const avoid = (step.avoid ? safe(step.avoid, []) || [] : [])
      .map((a) => boundsOf(a)).filter(Boolean);
    const r = place(bounds, w, h, step.prefer, avoid);
    c.setPosition(Math.round(r.x), Math.round(r.y));

    gfx.clear();
    gfx.fillStyle(0x0a1422, 0.97);
    gfx.fillRoundedRect(0, 0, w, h, 8);
    gfx.lineStyle(2, GOLD, 1);
    gfx.strokeRoundedRect(0, 0, w, h, 8);
    // Small pointer toward the anchor, on the side the bubble was placed.
    const P = 9;
    gfx.fillStyle(0x0a1422, 1);
    if (r.side === 'right' || r.side === 'left') {
      const py = clamp(bounds.centerY - r.y, 18, h - 18);
      const px = r.side === 'right' ? 0 : w;
      const dx = r.side === 'right' ? -P : P;
      gfx.fillTriangle(px, py - P, px, py + P, px + dx, py);
      gfx.lineStyle(2, GOLD, 1);
      gfx.lineBetween(px, py - P, px + dx, py);
      gfx.lineBetween(px, py + P, px + dx, py);
    } else {
      const px = clamp(bounds.centerX - r.x, 18, w - 18);
      const py = r.side === 'below' ? 0 : h;
      const dy = r.side === 'below' ? -P : P;
      gfx.fillTriangle(px - P, py, px + P, py, px, py + dy);
      gfx.lineStyle(2, GOLD, 1);
      gfx.lineBetween(px - P, py, px, py + dy);
      gfx.lineBetween(px + P, py, px, py + dy);
    }
    // Resize the click-swallowing box. setInteractive() will NOT rebuild an
    // existing hit area, so the geometry has to be updated by hand.
    hitBox.setPosition(0, 0).setSize(w, h);
    if (hitBox.input && hitBox.input.hitArea && hitBox.input.hitArea.setTo) {
      hitBox.input.hitArea.setTo(0, 0, w, h);
    } else {
      hitBox.setInteractive();
    }
    c.setVisible(true);

    // Pulsing highlight around the anchor.
    const hw = Math.max(24, bounds.right - bounds.left) + 10;
    const hh = Math.max(24, bounds.bottom - bounds.top) + 10;
    halo.setPosition(bounds.centerX, bounds.centerY).setSize(hw, hh)
      .setScale(1).setAlpha(1).setVisible(true);
    if (!haloTween) {
      haloTween = scene.tweens.add({
        targets: halo, alpha: 0.3, scaleX: 1.05, scaleY: 1.06,
        duration: 720, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
    }
  }

  function hide() {
    c.setVisible(false);
    halo.setVisible(false);
    lastSig = '';
  }

  // --- api ---------------------------------------------------------------
  function refresh() {
    if (dead) return;
    if (!started || finished) { hide(); return; }
    const gs = scene.gs;
    if (!gs || gs.round > maxRound) { hide(); return; }
    const step = current();
    if (!step) {
      hide();
      if (gs.round >= maxRound) finish();
      return;
    }
    if (scene.animating || gs.phase !== PHASE.PREP || (scene.openModals | 0) > 0) { hide(); return; }
    const bounds = boundsOf(safe(step.anchor, null));
    if (!bounds) { hide(); return; }
    curKey = step.key;
    // Redraw only when something actually moved/changed (refreshAll is chatty).
    const sig = `${step.key}|${Math.round(bounds.left)},${Math.round(bounds.top)},` +
      `${Math.round(bounds.right)},${Math.round(bounds.bottom)}|${seen.size}`;
    if (sig !== lastSig) { lastSig = sig; draw(step, bounds); } else { c.setVisible(true); halo.setVisible(true); }
    if (!announced.has(step.key)) { announced.add(step.key); onLog(step.key, 'shown'); }
  }

  function advance(action) {
    if (dead || !started || finished) return;
    const step = current();
    if (!step) return;
    seen.add(step.key);
    onLog(step.key, action);
    hide();
    refresh();
  }

  function used(action) {
    if (dead || !started || finished) return;
    const step = current();
    if (!step || step.usedBy !== action) return;
    advance('used');
  }

  function skip() {
    if (dead || finished) return;
    onLog(curKey || '', 'skip');
    finished = true;
    raiseFlag();
    hide();
  }

  function finish() {
    if (finished) return;
    finished = true;
    raiseFlag();
    onLog('', 'done');
    hide();
  }

  function begin() {
    if (dead || finished || coachDisabled()) return;
    if (!scene.gs || scene.gs.round > maxRound) return;
    started = true;
    refresh();
  }

  function destroy() {
    if (dead) return;
    dead = true;
    if (haloTween) { haloTween.stop(); haloTween.remove && haloTween.remove(); haloTween = null; }
    scene.tweens.killTweensOf(halo);
    halo.destroy();
    c.destroy(true);   // destroys children (graphics, hit box, texts, buttons)
  }

  return { begin, refresh, used, advance, skip, destroy,
    get started() { return started; }, get finished() { return finished; } };
}
