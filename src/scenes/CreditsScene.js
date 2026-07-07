// =============================================================================
// Credits — the people, institutions and funding behind POVODEŇ, taken from
// the accompanying paper's acknowledgements and author-contribution statement.
// =============================================================================

import { COL, FONT, makeButton, fitCamera, DESIGN_W, DESIGN_H } from '../ui/widgets.js';
import { sfx } from '../ui/sfx.js';
import { t } from '../i18n.js';

const Phaser = window.Phaser;

// Names are proper nouns (identical in both languages); roles are localized.
const TEAM = [
  { name: 'Jakub Binter', role: 'credits.role.binter' },
  { name: 'Hermann Prossinger', role: 'credits.role.prossinger' },
  { name: 'Martin Stachoň', role: 'credits.role.models' },
  { name: 'Natalie Čermáková', role: 'credits.role.models' },
  { name: 'Lenka Slavíková', role: 'credits.role.models' },
  { name: 'Daniel Říha', role: 'credits.role.riha' },
  { name: 'Eduard Eck', role: 'credits.role.eck' },
  { name: 'Tomáš Grasl', role: 'credits.role.grasl' },
];

export default class CreditsScene extends Phaser.Scene {
  constructor() {
    super('Credits');
  }

  create() {
    fitCamera(this);
    const width = DESIGN_W, height = DESIGN_H;
    this.add.image(width / 2, height / 2, 'title_bg').setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0f1a, 0.84);

    const cx = width / 2;
    let y = 46;
    this.add.text(cx, y, t('credits.title'), {
      fontFamily: FONT, fontSize: '32px', color: '#dce8f7', fontStyle: 'bold',
    }).setOrigin(0.5); y += 44;

    // --- Funding & institutions ------------------------------------------
    this.add.text(cx, y, t('credits.fundingHead'), {
      fontFamily: FONT, fontSize: '14px', color: '#e8c879', fontStyle: 'bold',
    }).setOrigin(0.5); y += 22;
    const funding = this.add.text(cx, y, t('credits.funding'), {
      fontFamily: FONT, fontSize: '13px', color: COL.ink, align: 'center',
      wordWrap: { width: 980 }, lineSpacing: 5,
    }).setOrigin(0.5, 0); y += funding.height + 18;

    // --- Team --------------------------------------------------------------
    this.add.text(cx, y, t('credits.teamHead'), {
      fontFamily: FONT, fontSize: '14px', color: '#e8c879', fontStyle: 'bold',
    }).setOrigin(0.5); y += 24;
    const nameX = cx - 470, roleX = cx - 200;
    TEAM.forEach((m) => {
      this.add.text(nameX, y, m.name, { fontFamily: FONT, fontSize: '14px', color: '#cfe0f5', fontStyle: 'bold' });
      this.add.text(roleX, y, t(m.role), {
        fontFamily: FONT, fontSize: '12px', color: COL.inkDim, wordWrap: { width: 670 },
      });
      y += 27;
    });
    y += 6;

    // --- The agent + thanks -------------------------------------------------
    const agent = this.add.text(cx, y, t('credits.agent'), {
      fontFamily: FONT, fontSize: '12px', color: '#9fb6d0', align: 'center',
      wordWrap: { width: 980 }, lineSpacing: 4,
    }).setOrigin(0.5, 0); y += agent.height + 12;
    const thanks = this.add.text(cx, y, t('credits.thanks'), {
      fontFamily: FONT, fontSize: '12px', color: COL.inkDim, align: 'center',
      wordWrap: { width: 980 }, lineSpacing: 4,
    }).setOrigin(0.5, 0); y += thanks.height + 12;

    this.add.text(cx, y, t('credits.license'), {
      fontFamily: FONT, fontSize: '12px', color: '#7fd1a0', align: 'center',
      wordWrap: { width: 980 },
    }).setOrigin(0.5, 0);

    makeButton(this, cx, height - 56, 200, 48, t('howto.toMenu'), () => {
      sfx.click(); this.scene.start('Menu');
    }, { fill: 0x1f7a3d, fillHover: 0x2a9b4f, fontSize: 15 });
  }
}
