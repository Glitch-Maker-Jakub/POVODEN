// =============================================================================
// Tiny UI helpers shared by the scenes. Kept framework-thin on purpose.
// =============================================================================

const Phaser = window.Phaser;

export const FONT = 'monospace';

// Logical design size. The canvas backing buffer is 2x this; each scene's camera
// zooms 2x and centres so the 1280x720 layout fills the high-res canvas (crisp).
export const DESIGN_W = 1280;
export const DESIGN_H = 720;
export function fitCamera(scene) {
  scene.cameras.main.setZoom(2).centerOn(DESIGN_W / 2, DESIGN_H / 2);
}

// Old-school palette.
export const COL = {
  bg: 0x0e1726,
  panel: 0x15233b,
  panelLight: 0x1d3357,
  ink: '#e6eef7',
  inkDim: '#8aa0bd',
  accent: 0xf1c40f,
  good: '#5fd17a',
  bad: '#ff6b6b',
  river: 0x2f6db0,
  riverDark: 0x1d4778,
};

/**
 * A rectangular button with hover + click. Returns the container so callers can
 * enable/disable or restyle it.
 */
export function makeButton(scene, x, y, w, h, label, onClick, opts = {}) {
  const fill = opts.fill ?? COL.panelLight;
  const fillHover = opts.fillHover ?? 0x2a4a7a;
  const fontSize = opts.fontSize ?? 16;
  const c = scene.add.container(x, y);

  const bg = scene.add.rectangle(0, 0, w, h, fill).setStrokeStyle(2, 0x3a5b8a);
  const txt = scene.add
    .text(0, 0, label, { fontFamily: FONT, fontSize: `${fontSize}px`, color: COL.ink, align: 'center', wordWrap: { width: w - 10 } })
    .setOrigin(0.5);

  c.add([bg, txt]);
  c.setSize(w, h);
  c.bg = bg;
  c.txt = txt;
  c.enabled = true;

  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerover', () => { if (c.enabled) bg.setFillStyle(fillHover); });
  bg.on('pointerout', () => bg.setFillStyle(c.enabled ? fill : 0x223349));
  bg.on('pointerdown', () => { if (c.enabled) onClick(); });

  c.setEnabled = (on) => {
    c.enabled = on;
    bg.setFillStyle(on ? fill : 0x223349);
    txt.setColor(on ? COL.ink : COL.inkDim);
  };
  return c;
}

/** A label + value text pair, value updatable via .set(). */
export function makeStat(scene, x, y, label, value, opts = {}) {
  const t = scene.add.text(x, y, `${label}${value}`, {
    fontFamily: FONT,
    fontSize: `${opts.fontSize ?? 14}px`,
    color: opts.color ?? COL.ink,
  });
  t.setLabel = (v) => t.setText(`${label}${v}`);
  return t;
}

/** Simple horizontal bar (e.g. morale). */
export function makeBar(scene, x, y, w, h, frac, color) {
  const g = scene.add.graphics();
  g.x = x; g.y = y;
  g.redraw = (f, col) => {
    g.clear();
    g.fillStyle(0x0a1422, 1).fillRect(0, 0, w, h);
    g.fillStyle(col, 1).fillRect(1, 1, Math.max(0, (w - 2) * f), h - 2);
    g.lineStyle(1, 0x3a5b8a, 1).strokeRect(0, 0, w, h);
  };
  g.redraw(frac, color);
  return g;
}
