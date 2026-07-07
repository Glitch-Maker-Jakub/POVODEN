// Boot: preload the generated pixel-art assets, then start the menu.
import { MUNICIPALITIES } from '../data/gameData.js';
import { fitCamera, DESIGN_W, DESIGN_H } from '../ui/widgets.js';

const Phaser = window.Phaser;

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    fitCamera(this);
    const width = DESIGN_W, height = DESIGN_H;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0e1726);
    const txt = this.add.text(width / 2, height / 2, 'Loading…',
      { fontFamily: 'monospace', fontSize: '20px', color: '#8aa0bd' }).setOrigin(0.5);
    this.load.on('progress', (p) => txt.setText(`Loading… ${Math.round(p * 100)}%`));

    this.load.image('title_bg', 'assets/title_bg.jpg');
    this.load.image('map_valley', 'assets/map/valley.jpg');
    this.load.image('tile_water', 'assets/tiles/water.png');
    this.load.image('tile_flood', 'assets/tiles/flood.png');
    MUNICIPALITIES.forEach((m) => this.load.image(`town_${m.id}`, `assets/towns/${m.id}.png`));
    // Realistic newspaper photos, keyed by outcome tone.
    ['calm', 'minor', 'rescue', 'disaster', 'cooperation', 'ruin'].forEach((k) =>
      this.load.image(`news_${k}`, `assets/news/${k}.jpg`));
  }

  create() {
    // Key the flat navy background out of each town sprite so it can sit on the
    // river map with no square edge. Produces a `<key>_t` transparent texture.
    MUNICIPALITIES.forEach((m) => this.keyOutBackground(`town_${m.id}`));
    this.scene.start('Menu');
  }

  keyOutBackground(key) {
    if (!this.textures.exists(key)) return;
    const src = this.textures.get(key).getSourceImage();
    const w = src.width, h = src.height;
    let tex;
    try { tex = this.textures.createCanvas(`${key}_t`, w, h); } catch (e) { return; }
    if (!tex) return;
    const ctx = tex.context;
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const br = d[0], bg = d[1], bb = d[2]; // top-left corner = background colour
    for (let i = 0; i < d.length; i += 4) {
      const dr = d[i] - br, dg = d[i + 1] - bg, db = d[i + 2] - bb;
      if (dr * dr + dg * dg + db * db < 1100) d[i + 3] = 0; // near-bg → transparent
    }
    ctx.putImageData(img, 0, 0);
    tex.refresh();
  }
}
