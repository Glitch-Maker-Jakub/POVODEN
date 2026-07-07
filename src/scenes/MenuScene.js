import { COL, FONT, makeButton, fitCamera, DESIGN_W, DESIGN_H } from '../ui/widgets.js';
import { MUNICIPALITIES } from '../data/gameData.js';
import { sfx } from '../ui/sfx.js';
import { t, toggleLang } from '../i18n.js';

const Phaser = window.Phaser;

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
    this.chosen = 'millington';
  }

  create() {
    fitCamera(this);
    const width = DESIGN_W, height = DESIGN_H;
    // Flooded-town title art (generated), darkened for legibility.
    const bg = this.add.image(width / 2, height / 2, 'title_bg');
    bg.setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0f1a, 0.55);
    this.add.rectangle(width / 2, height - 130, width, 260, 0x0a0f1a, 0.5);
    this.add.rectangle(width / 2, 150, width, 260, 0x0a0f1a, 0.4);

    this.add.text(width / 2, 110, 'POVODEŇ', {
      fontFamily: FONT, fontSize: '72px', color: '#dce8f7', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 172, t('menu.subtitle'), {
      fontFamily: FONT, fontSize: '22px', color: COL.inkDim, letterSpacing: 8,
    }).setOrigin(0.5);

    this.add.text(width / 2, 232, t('menu.tagline'),
      { fontFamily: FONT, fontSize: '16px', color: COL.ink, align: 'center', lineSpacing: 6 }
    ).setOrigin(0.5);

    // Language toggle (top-right).
    makeButton(this, width - 90, 40, 140, 40, t('menu.switchLang'), () => {
      sfx.click(); toggleLang(); this.scene.restart();
    }, { fontSize: 15 });

    // Municipality picker.
    this.add.text(width / 2, 312, t('menu.choose'), {
      fontFamily: FONT, fontSize: '15px', color: COL.inkDim,
    }).setOrigin(0.5);

    const picks = [...MUNICIPALITIES].sort((a, b) => a.pos - b.pos);
    const bw = 150, gap = 14;
    const totalW = picks.length * bw + (picks.length - 1) * gap;
    let x = width / 2 - totalW / 2 + bw / 2;
    this.pickButtons = [];
    picks.forEach((m) => {
      const btn = makeButton(this, x, 360, bw, 56, `${m.pos}. ${m.name}`, () => {
        this.chosen = m.id;
        this.highlightPick();
      }, { fontSize: 13 });
      btn.muniId = m.id;
      this.pickButtons.push(btn);
      x += bw + gap;
    });
    this.traitText = this.add.text(width / 2, 408, '', {
      fontFamily: FONT, fontSize: '14px', color: COL.good, align: 'center',
    }).setOrigin(0.5);
    this.highlightPick();

    makeButton(this, width / 2 - 150, height - 90, 280, 64, t('menu.start'), () => {
      sfx.resume(); sfx.click();
      this.scene.start('Game', { playerMuniId: this.chosen });
    }, { fill: 0x1f7a3d, fillHover: 0x2a9b4f, fontSize: 20 });

    makeButton(this, width / 2 + 160, height - 90, 200, 64, t('menu.howto'), () => {
      sfx.resume(); sfx.click();
      this.scene.start('HowTo');
    }, { fontSize: 16 });

    // Scoreboard (optional server) and credits, tucked into the bottom corners.
    makeButton(this, 110, height - 90, 180, 48, t('menu.scoreboard'), () => {
      sfx.resume(); sfx.click();
      this.scene.start('Scoreboard');
    }, { fontSize: 13 });
    makeButton(this, width - 110, height - 90, 180, 48, t('menu.credits'), () => {
      sfx.resume(); sfx.click();
      this.scene.start('Credits');
    }, { fontSize: 13 });

    this.add.text(width / 2, height - 34, t('menu.footer'),
      { fontFamily: FONT, fontSize: '12px', color: COL.inkDim }
    ).setOrigin(0.5);
  }

  highlightPick() {
    this.pickButtons.forEach((b) => {
      const on = b.muniId === this.chosen;
      b.bg.setStrokeStyle(on ? 3 : 2, on ? COL.accent : 0x3a5b8a);
      b.bg.setFillStyle(on ? 0x2a4a7a : COL.panelLight);
    });
    const m = MUNICIPALITIES.find((x) => x.id === this.chosen);
    this.traitText.setText(`${t(`trait.${m.trait}.name`)} — ${t(`trait.${m.trait}.desc`)}`);
  }
}
