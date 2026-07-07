import { COL, FONT, makeButton, fitCamera, DESIGN_W, DESIGN_H } from '../ui/widgets.js';
import { sfx } from '../ui/sfx.js';
import { t } from '../i18n.js';

const Phaser = window.Phaser;

const PAGE_KEYS = ['1', '2', '3', '4', '5', 'diagram'];

// The final "diagram" page: each row is one ACTION → what it CAUSES → the ADVANTAGE.
const DIAGRAM_ROWS = [
  { icon: '▲',  tint: 0x2f4d77, key: 'levee' },
  { icon: '⛵✚', tint: 0x255d77, key: 'boatkit' },
  { icon: '★',  tint: 0x7a6a22, key: 'fun' },
  { icon: '●',  tint: 0x4a4a5a, key: 'reserve' },
  { icon: '🤝', tint: 0x2a6048, key: 'coop' },
  { icon: '🏭', tint: 0x6f4326, key: 'producers' },
];

export default class HowToScene extends Phaser.Scene {
  constructor() {
    super('HowTo');
    this.page = 0;
  }

  create() {
    fitCamera(this);
    const width = DESIGN_W, height = DESIGN_H;
    this.add.image(width / 2, height / 2, 'title_bg').setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0f1a, 0.78);

    this.add.text(width / 2, 54, t('howto.title'), {
      fontFamily: FONT, fontSize: '34px', color: '#dce8f7', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.titleText = this.add.text(width / 2, 130, '', {
      fontFamily: FONT, fontSize: '22px', color: '#ffd56b', align: 'center',
    }).setOrigin(0.5);
    this.bodyText = this.add.text(width / 2, 320, '', {
      fontFamily: FONT, fontSize: '15px', color: COL.ink, align: 'left', lineSpacing: 7,
    }).setOrigin(0.5);
    this.pageDots = this.add.text(width / 2, height - 150, '', {
      fontFamily: FONT, fontSize: '14px', color: COL.inkDim,
    }).setOrigin(0.5);

    this.prevBtn = makeButton(this, width / 2 - 250, height - 80, 160, 50, t('howto.back'),
      () => this.go(-1), { fontSize: 15 });
    this.nextBtn = makeButton(this, width / 2 + 250, height - 80, 160, 50, t('howto.next'),
      () => this.go(1), { fontSize: 15 });
    this.menuBtn = makeButton(this, width / 2, height - 80, 200, 50, t('howto.toMenu'),
      () => { sfx.click(); this.scene.start('Menu'); },
      { fill: 0x1f7a3d, fillHover: 0x2a9b4f, fontSize: 15 });

    this.page = 0;
    this.render();
  }

  go(d) {
    sfx.click();
    this.page = Phaser.Math.Clamp(this.page + d, 0, PAGE_KEYS.length - 1);
    this.render();
  }

  render() {
    const k = PAGE_KEYS[this.page];
    this.clearDiagram();
    if (k === 'diagram') {
      this.titleText.setText(t('diagram.title'));
      this.bodyText.setText('');
      this.buildDiagram();
    } else {
      this.titleText.setText(t(`howto.${k}.title`));
      this.bodyText.setText(t(`howto.${k}.body`));
    }
    this.pageDots.setText(PAGE_KEYS.map((_, i) => (i === this.page ? '●' : '○')).join(' '));
    this.prevBtn.setEnabled(this.page > 0);
    this.nextBtn.setEnabled(this.page < PAGE_KEYS.length - 1);
  }

  clearDiagram() {
    if (this.diagramObjs) { this.diagramObjs.forEach((o) => o.destroy()); }
    this.diagramObjs = [];
  }

  // A visual action→cause→advantage map (the "diagram" the player asked for).
  buildDiagram() {
    const cx = DESIGN_W / 2;
    const objs = this.diagramObjs = [];
    const add = (o) => { objs.push(o); return o; };
    const X_CHIP = 200, X_CAUSE = 348, X_ADV = 738;

    // Column headers.
    add(this.add.text(X_CHIP, 150, t('diagram.colAction'), { fontFamily: FONT, fontSize: '12px', color: COL.inkDim }).setOrigin(0.5));
    add(this.add.text(X_CAUSE, 150, t('diagram.colCause'), { fontFamily: FONT, fontSize: '12px', color: COL.inkDim }).setOrigin(0, 0.5));
    add(this.add.text(X_ADV, 150, t('diagram.colAdv'), { fontFamily: FONT, fontSize: '12px', color: '#7fd1a0' }).setOrigin(0, 0.5));

    let y = 174;
    DIAGRAM_ROWS.forEach((row) => {
      add(this.add.rectangle(X_CHIP, y, 230, 46, row.tint, 0.9).setStrokeStyle(2, 0x6a8ab0));
      add(this.add.text(X_CHIP, y, `${row.icon}  ${t(`diagram.${row.key}.act`)}`,
        { fontFamily: FONT, fontSize: '15px', color: '#eaf2fb', fontStyle: 'bold' }).setOrigin(0.5));
      add(this.add.text(X_CHIP + 130, y, '→', { fontFamily: FONT, fontSize: '20px', color: '#8aa0bd' }).setOrigin(0.5));
      add(this.add.text(X_CAUSE, y, t(`diagram.${row.key}.cause`),
        { fontFamily: FONT, fontSize: '12px', color: COL.ink, wordWrap: { width: 340 }, lineSpacing: 2 }).setOrigin(0, 0.5));
      add(this.add.text(X_ADV - 26, y, '→', { fontFamily: FONT, fontSize: '20px', color: '#8aa0bd' }).setOrigin(0.5));
      add(this.add.text(X_ADV, y, t(`diagram.${row.key}.adv`),
        { fontFamily: FONT, fontSize: '12px', color: '#9fe0b8', wordWrap: { width: 330 }, lineSpacing: 2 }).setOrigin(0, 0.5));
      y += 56;
    });

    // The goal band the actions all feed.
    const gy = y + 4;
    add(this.add.rectangle(cx, gy, 1090, 56, 0x16263f, 0.95).setStrokeStyle(2, COL.accent));
    add(this.add.text(cx, gy, t('diagram.goal'),
      { fontFamily: FONT, fontSize: '13px', color: '#ffd56b', align: 'center', wordWrap: { width: 1050 }, lineSpacing: 4 }).setOrigin(0.5));
  }
}
