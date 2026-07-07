// =============================================================================
// Scoreboard — all-time / monthly / weekly rankings from the optional
// PostgreSQL server (see server/). Fully optional: when the API is
// unreachable the scene shows a calm "offline" note instead of data.
// =============================================================================

import { COL, FONT, makeButton, fitCamera, DESIGN_W, DESIGN_H } from '../ui/widgets.js';
import { sfx } from '../ui/sfx.js';
import { t, getLang } from '../i18n.js';
import { fetchScores } from '../net/scoreboard.js';

const Phaser = window.Phaser;

const PERIODS = ['all', 'month', 'week'];

export default class ScoreboardScene extends Phaser.Scene {
  constructor() {
    super('Scoreboard');
    this.period = 'all';
  }

  create() {
    fitCamera(this);
    const width = DESIGN_W, height = DESIGN_H;
    this.add.image(width / 2, height / 2, 'title_bg').setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0f1a, 0.82);

    this.add.text(width / 2, 54, t('score.title'), {
      fontFamily: FONT, fontSize: '34px', color: '#dce8f7', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Period tabs.
    this.tabs = {};
    const tabW = 190, gap = 16;
    let x = width / 2 - (tabW * 3 + gap * 2) / 2 + tabW / 2;
    PERIODS.forEach((p) => {
      this.tabs[p] = makeButton(this, x, 118, tabW, 42, t(`score.${p}`), () => {
        sfx.click(); this.period = p; this.refresh();
      }, { fontSize: 14 });
      x += tabW + gap;
    });

    // Table header + rows (fixed pool of text objects, updated per fetch).
    const leftX = width / 2 - 420;
    const cols = { rank: leftX, name: leftX + 70, town: leftX + 330, score: leftX + 560, grade: leftX + 650, date: leftX + 730 };
    this.cols = cols;
    this.header = this.add.text(leftX, 162,
      `#     ${t('score.colName')}                        ${t('score.colTown')}                  ${t('score.colScore')}`,
      { fontFamily: FONT, fontSize: '12px', color: COL.inkDim });
    this.rows = [];
    for (let i = 0; i < 15; i++) {
      this.rows.push(this.add.text(leftX, 190 + i * 27, '', {
        fontFamily: FONT, fontSize: '14px', color: COL.ink,
      }));
    }
    this.status = this.add.text(width / 2, 330, '', {
      fontFamily: FONT, fontSize: '15px', color: COL.inkDim, align: 'center',
    }).setOrigin(0.5);

    makeButton(this, width / 2, height - 70, 200, 50, t('howto.toMenu'), () => {
      sfx.click(); this.scene.start('Menu');
    }, { fill: 0x1f7a3d, fillHover: 0x2a9b4f, fontSize: 15 });

    this.refresh();
  }

  async refresh() {
    PERIODS.forEach((p) => {
      const on = p === this.period;
      this.tabs[p].bg.setFillStyle(on ? 0x2a4a7a : COL.panelLight);
      this.tabs[p].bg.setStrokeStyle(on ? 3 : 2, on ? COL.accent : 0x3a5b8a);
    });
    this.rows.forEach((r) => r.setText(''));
    this.status.setText(t('score.loading')).setColor(COL.inkDim);

    const wanted = this.period;                    // guard against stale responses
    const entries = await fetchScores(wanted, 15);
    if (wanted !== this.period || !this.scene.isActive()) return;

    if (entries === null) { this.status.setText(t('score.offline')).setColor('#ffcf8b'); return; }
    if (!entries.length) { this.status.setText(t('score.empty')).setColor(COL.inkDim); return; }
    this.status.setText('');

    const locale = getLang() === 'cs' ? 'cs-CZ' : 'en-GB';
    entries.slice(0, 15).forEach((e, i) => {
      const date = new Date(e.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
      const line =
        `${String(e.rank).padStart(2)}   ` +
        `${String(e.name).padEnd(24).slice(0, 24)}  ` +
        `${String(e.town).padEnd(16).slice(0, 16)}  ` +
        `${String(e.score).padStart(3)}  ${String(e.grade).padEnd(2)}  ${date}`;
      const col = e.rank === 1 ? '#ffd56b' : e.rank <= 3 ? '#cfe0f5' : COL.ink;
      this.rows[i].setText(line).setColor(col);
    });
  }
}
