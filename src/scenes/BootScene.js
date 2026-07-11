// Boot: detect the best image format, load ONLY what the menu needs, then
// start the menu. The heavier board art loads when a campaign starts
// (GameScene.preload) and the newspaper photos trickle in behind the board —
// so first paint is never blocked by images the player is minutes away from.
import { fitCamera, DESIGN_W, DESIGN_H } from '../ui/widgets.js';
import { probeImageFormats, menuImages, queueMissing } from '../ui/assets.js';

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
  }

  create() {
    // The WebP probe is async (a 1px decode), so the menu assets are queued
    // here rather than in preload(); the loader runs fine outside preload.
    probeImageFormats().then(() => {
      queueMissing(this, menuImages());
      this.load.once('complete', () => this.scene.start('Menu'));
      this.load.start();
    });
  }
}
