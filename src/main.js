import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import HowToScene from './scenes/HowToScene.js';
import GameScene from './scenes/GameScene.js';
import ScoreboardScene from './scenes/ScoreboardScene.js';
import CreditsScene from './scenes/CreditsScene.js';

const Phaser = window.Phaser;

// --- Crisp text everywhere -------------------------------------------------
// Phaser rasterises each Text label at its logical font size, then the whole
// 1280x720 canvas is stretched up to fill the window — which blurs all text.
// Render every label at 2x resolution so it stays sharp under that upscale.
// One factory override beats adding `resolution: 2` to hundreds of call sites.
const _textFactory = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style) {
  style = style || {};
  if (style.resolution == null) style.resolution = 2;
  return _textFactory.call(this, x, y, text, style);
};

// The game is DESIGNED in a 1280x720 coordinate space, but the canvas backing
// buffer is rendered at 2560x1440 (2x). Each scene's camera uses zoom 2 +
// centerOn(640,360) so the 1280x720 layout fills the high-res canvas — crisp on
// large windows (the old 1280 buffer was stretched up and blurred everything).
const config = {
  type: Phaser.AUTO,
  width: 2560,
  height: 1440,
  backgroundColor: '#0e1726',
  // Antialiased (not pixelArt nearest-neighbour) for smooth text/UI.
  pixelArt: false,
  render: { antialias: true, roundPixels: false },
  parent: 'game',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, HowToScene, GameScene, ScoreboardScene, CreditsScene],
};

// Exposed for debugging / automated verification (drive scenes from the console).
window.GAME = new Phaser.Game(config);
