import { COL, FONT, makeButton, fitCamera, DESIGN_W, DESIGN_H } from '../ui/widgets.js';
import { MUNICIPALITIES } from '../data/gameData.js';
import { sfx } from '../ui/sfx.js';
import { t, toggleLang } from '../i18n.js';
import { consentState, setConsent, participantId } from '../net/telemetry.js';
import { playVideo, playVideoOnce } from '../ui/video.js';

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
      // First-ever campaign: research consent once, then Fojtík's interview
      // (skippable, plays once), then the game.
      const begin = () => playVideoOnce('intro', () =>
        this.scene.start('Game', { playerMuniId: this.chosen }));
      if (consentState() === null) this.showConsent(begin);
      else begin();
    }, { fill: 0x1f7a3d, fillHover: 0x2a9b4f, fontSize: 20 });

    // Rewatch the interview anytime.
    makeButton(this, width - 110, 96, 180, 40, t('menu.interview'), () => {
      sfx.resume(); sfx.click();
      playVideo('intro');
    }, { fontSize: 12 });

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

    // Research-consent toggle (top-left, mirroring the language toggle). Click:
    // never-asked → show the dialog; already decided → flip the decision.
    this.researchBtn = makeButton(this, 120, 40, 200, 40, '', () => {
      sfx.click();
      if (consentState() === null) this.showConsent(() => this.refreshResearch());
      else { setConsent(consentState() !== 'yes'); this.refreshResearch(); }
    }, { fontSize: 12 });
    this.researchId = this.add.text(20, 66, '', {
      fontFamily: FONT, fontSize: '10px', color: COL.inkDim,
    });
    this.refreshResearch();
  }

  refreshResearch() {
    const on = consentState() === 'yes';
    this.researchBtn.txt.setText(on ? t('research.on') : t('research.off'));
    this.researchId.setText(on ? t('research.id', { id: participantId() }) : '');
  }

  // One-time, plain-language research-consent dialog (opt-in, revocable).
  showConsent(onDone) {
    const width = DESIGN_W, height = DESIGN_H;
    const pw = 680, ph = 420;
    const group = [];
    const add = (o) => { group.push(o); return o; };
    add(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setInteractive());
    add(this.add.rectangle(width / 2, height / 2, pw, ph, 0x111a2c).setStrokeStyle(3, 0xc9a24b));
    add(this.add.text(width / 2, height / 2 - ph / 2 + 28, t('research.title'), {
      fontFamily: FONT, fontSize: '18px', color: '#e8c879', fontStyle: 'bold',
    }).setOrigin(0.5));
    add(this.add.text(width / 2 - pw / 2 + 30, height / 2 - ph / 2 + 60, t('research.body'), {
      fontFamily: FONT, fontSize: '13px', color: COL.ink, wordWrap: { width: pw - 60 }, lineSpacing: 5,
    }).setOrigin(0, 0));
    const done = (yes) => {
      sfx.click(); setConsent(yes);
      group.forEach((o) => o.destroy()); yesBtn.destroy(); noBtn.destroy();
      this.refreshResearch();
      onDone();
    };
    const yesBtn = makeButton(this, width / 2 - 130, height / 2 + ph / 2 - 40, 230, 48,
      t('research.yes'), () => done(true), { fill: 0x1f7a3d, fillHover: 0x2a9b4f, fontSize: 14 });
    const noBtn = makeButton(this, width / 2 + 130, height / 2 + ph / 2 - 40, 230, 48,
      t('research.no'), () => done(false), { fontSize: 14 });
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
