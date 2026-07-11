import { COL, FONT, makeButton, fitCamera, DESIGN_W, DESIGN_H } from '../ui/widgets.js';
import { sfx } from '../ui/sfx.js';
import { writeArticle, postMortem, finalReport, roundBriefing } from '../ui/newspaper.js';
import { t, getLang } from '../i18n.js';
import { submitScore, promptName } from '../net/scoreboard.js';
import { beginCampaign, logEvent, flush as flushTelemetry } from '../net/telemetry.js';
import {
  createGameState, PHASE, muniById, playerMuni,
  purchase, canInvest, resolveRound, advanceRound, regionalScore,
  playCard, canPlayCard, unlockedTiers,
  holdMeeting, meetingAffordable, isRevealed,
  acceptProposal, declineProposal, relationshipLabel,
  forecastBand, canSharpenForecast, sharpenForecast,
  canAskFavour, askFavour, oceanaLost, investmentCost, previewFlood,
  boatsWereSent,
} from '../model/gameState.js';
import { runAllAI } from '../ai/mayorAI.js';
import { gameImages, newsImages, queueMissing } from '../ui/assets.js';
import {
  INVESTMENTS, INVESTMENT_ORDER, BALANCE,
  SEVERITY_COLORS, EXPOSURE, PRODUCERS, INVEST_RESOURCE,
  CARD_BY_ID, TIER_COLOR, MAYORS,
} from '../data/gameData.js';

const Phaser = window.Phaser;
const MAP_W = 880;

// Early-season advisor: clarifies the goal and the self-vs-region choice, then
// gets out of the way (shown only in rounds 1–3). Text lives in i18n
// (advisor.1 / advisor.2 / advisor.3).
const ADVISOR_ROUNDS = [1, 2, 3];

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.gs = createGameState(data.playerMuniId || 'millington');
    this.targetId = this.gs.playerMuniId;
    this.animating = false;
    this.nodes = {};
  }

  preload() {
    // Board art loads on campaign start, not at boot. On a restart everything
    // is already in the texture cache and this queues nothing.
    if (queueMissing(this, gameImages()) > 0) {
      fitCamera(this);
      this.add.rectangle(DESIGN_W / 2, DESIGN_H / 2, DESIGN_W, DESIGN_H, COL.bg);
      const txt = this.add.text(DESIGN_W / 2, DESIGN_H / 2, 'Loading…',
        { fontFamily: FONT, fontSize: '20px', color: '#8aa0bd' }).setOrigin(0.5);
      this.load.on('progress', (p) => txt.setText(`Loading… ${Math.round(p * 100)}%`));
    }
  }

  create() {
    fitCamera(this);
    const width = DESIGN_W, height = DESIGN_H;
    this.add.rectangle(width / 2, height / 2, width, height, COL.bg);
    // Illustrated river-valley backdrop for the map area, dimmed for contrast so
    // the river and town markers read clearly on top (mockup-style).
    if (this.textures.exists('map_valley')) {
      this.add.image(MAP_W / 2, height / 2, 'map_valley').setDisplaySize(MAP_W, height);
      this.add.rectangle(MAP_W / 2, height / 2, MAP_W, height, 0x0a1020, 0.42);
    }

    this.buildTopBar();
    this.buildMap();
    this.buildMeetingControl();
    this.buildDiplomacy();
    this.buildRightPanel();
    this.buildCardHand();
    this.buildTooltips();
    this.refreshAll();
    if (this.gs.round === 1) {
      beginCampaign(playerMuni(this.gs).def.name);   // opt-in research: campaign start
      this.showAdvisor(t('advisor.1'));
    }
    // Newspaper photos arrive in the background while the player prepares; the
    // summary modal falls back to a plain banner if one is still in flight.
    if (queueMissing(this, newsImages()) > 0) this.load.start();
  }

  // Hover tooltips that explain the HUD symbols a non-gamer won't recognise.
  buildTooltips() {
    this.tipBg = this.add.rectangle(0, 0, 10, 10, 0x0a1422, 0.97)
      .setStrokeStyle(1, COL.accent).setVisible(false).setDepth(2000);
    this.tipTxt = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '12px', color: '#e6eef7', align: 'left',
      wordWrap: { width: 340 }, lineSpacing: 3 }).setVisible(false).setDepth(2001);
    const tip = (obj, key) => {
      if (!obj) return;
      obj.setInteractive();
      obj.on('pointerover', () => this.showTip(obj, t(key)));
      obj.on('pointerout', () => this.hideTip());
    };
    tip(this.sevText, 'tip.forecast');
    tip(this.sharpenBtn && this.sharpenBtn.bg, 'tip.sharpen');
    tip(this.budgetText, 'tip.budget');
    tip(this.researchText, 'tip.ledger');
    tip(this.eventText, 'tip.event');
    tip(this.meetingBtn && this.meetingBtn.bg, 'tip.meeting');
  }

  showTip(obj, str) {
    const b = obj.getBounds();
    this.tipTxt.setText(str);
    const tw = this.tipTxt.width + 16, th = this.tipTxt.height + 12;
    const x = Phaser.Math.Clamp(b.centerX, 12 + tw / 2, DESIGN_W - 12 - tw / 2);
    let y = b.top - 8, oy = 1;
    if (y - th < 8) { y = b.bottom + 8; oy = 0; }   // not enough room above → below
    this.tipBg.setPosition(x, y).setSize(tw, th).setOrigin(0.5, oy).setVisible(true);
    this.tipTxt.setPosition(x, y).setOrigin(0.5, oy).setVisible(true);
  }

  hideTip() { this.tipBg.setVisible(false); this.tipTxt.setVisible(false); }

  buildMeetingControl() {
    this.meetingBtn = makeButton(this, 440, 98, 340, 30,
      t('meeting.call'),
      () => { if (this.gs.meetingHeld) this.showFloodTable(); else this.callMeeting(); },
      { fill: 0x2a4a7a, fillHover: 0x37609b, fontSize: 12 });
    this.meetingStatus = this.add.text(440, 120, '',
      { fontFamily: FONT, fontSize: '10px', color: COL.inkDim }).setOrigin(0.5);
  }

  // --- Diplomacy: the deal an AI mayor offers this round ----------------------
  buildDiplomacy() {
    const x = 440, y = 172, w = 540, h = 100;
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, 0x1a2c4a).setStrokeStyle(2, 0xc9a24b);
    const head = this.add.text(-w / 2 + 14, -h / 2 + 8, t('deal.offered'),
      { fontFamily: FONT, fontSize: '12px', color: '#ffd56b' });
    const body = this.add.text(-w / 2 + 14, -h / 2 + 26, '',
      { fontFamily: FONT, fontSize: '12px', color: COL.ink, wordWrap: { width: w - 28 }, lineSpacing: 2 });
    c.add([bg, head, body]);
    const accept = makeButton(this, x - 115, y + h / 2 - 16, 140, 26, t('deal.accept'),
      () => this.respondProposal(true), { fill: 0x1f7a3d, fillHover: 0x2a9b4f, fontSize: 13 });
    const decline = makeButton(this, x + 115, y + h / 2 - 16, 140, 26, t('deal.decline'),
      () => this.respondProposal(false), { fill: 0x6b3a3a, fillHover: 0x8a4a4a, fontSize: 13 });
    this.diplo = { c, body, accept, decline };
    this.setDiploVisible(false);
  }

  setDiploVisible(on, pending = false) {
    this.diplo.c.setVisible(on);
    this.diplo.accept.setVisible(on && pending);
    this.diplo.decline.setVisible(on && pending);
  }

  updateProposal() {
    const p = this.gs.proposals && this.gs.proposals[0];
    // Only show a deal while it still awaits your answer. Once you accept or
    // decline, it disappears (the flash message confirms the outcome) so it
    // never lingers on top of the map and hides the texts behind it.
    const show = !!p && p.accepted === null && this.gs.phase === PHASE.PREP && !this.animating;
    if (!show) { this.setDiploVisible(false); return; }
    this.diplo.body.setText(t('deal.text', {
      mayor: MAYORS[p.from].name,
      inv: t(`inv.${p.askInv}.name`),
      town: muniById(this.gs, p.from).def.name,
      reward: t(`deal.reward.${p.rewardKey || 'default'}`),
    }));
    this.setDiploVisible(true, true);
  }

  respondProposal(accept) {
    if (this.animating) return;
    const p = this.gs.proposals && this.gs.proposals[0];
    if (!p || p.accepted !== null) return;
    logEvent('deal', { from: p.from, accepted: !!accept }, this.gs.round);
    if (accept) {
      acceptProposal(this.gs, p.id);
      sfx.deal();
      this.flashText(t('flash.dealStruck', { mayor: MAYORS[p.from].name }));
    } else {
      declineProposal(this.gs, p.id);
      sfx.click();
      this.flashText(t('flash.declined', { mayor: MAYORS[p.from].name }));
    }
    this.updateProposal();
    this.refreshAll();
  }

  callMeeting() {
    if (this.animating) return;
    if (holdMeeting(this.gs)) {
      sfx.meeting();
      logEvent('meeting', {}, this.gs.round);
      this.flashText(t('flash.meetingConvened'));
      this.refreshAll();
      this.showFloodTable();   // show the planning data they just paid for
    } else {
      this.flashText(t('flash.meetingFail'));
    }
  }

  // The Regional Meeting's payoff: a planning table projecting what each flood
  // level would cost EVERY town given today's preparations — run live off the
  // deterministic flood model (previewFlood), so it updates as you invest.
  showFloodTable() {
    const gs = this.gs;
    const width = DESIGN_W, height = DESIGN_H;
    const sevs = [1, 2, 3, 4];
    const previews = {};
    sevs.forEach((s) => { previews[s] = previewFlood(gs, s); });
    const ordered = [...gs.munis].sort((a, b) => a.def.pos - b.def.pos);

    const pw = 900, ph = 462, cx = width / 2, top = height / 2 - ph / 2;
    const group = [];
    const add = (o) => { group.push(o); return o; };
    add(this.add.rectangle(cx, height / 2, width, height, 0x000000, 0.7).setInteractive());
    add(this.add.rectangle(cx, height / 2, pw, ph, 0x10192b).setStrokeStyle(3, 0x2a4a7a));

    let ty = top + 24;
    add(this.add.text(cx, ty, t('table.title'), { fontFamily: FONT, fontSize: '19px', color: '#ffd56b', fontStyle: 'bold' }).setOrigin(0.5)); ty += 26;
    add(this.add.text(cx, ty, t('table.subtitle'), { fontFamily: FONT, fontSize: '12px', color: COL.inkDim }).setOrigin(0.5)); ty += 26;

    const nameX = cx - pw / 2 + 28;
    const col0 = cx - pw / 2 + 232, colW = 160;
    const colX = (i) => col0 + i * colW + colW / 2;

    add(this.add.text(nameX, ty, t('table.town'), { fontFamily: FONT, fontSize: '12px', color: COL.inkDim }).setOrigin(0, 0.5));
    sevs.forEach((s, i) => {
      const hex = '#' + SEVERITY_COLORS[s].toString(16).padStart(6, '0');
      add(this.add.text(colX(i), ty, t(`sev.${s}`), { fontFamily: FONT, fontSize: '13px', color: hex, fontStyle: 'bold' }).setOrigin(0.5));
    });
    ty += 10;
    add(this.add.rectangle(cx, ty, pw - 44, 1, 0x2a4a63)); ty += 18;

    const cell = (r) => {
      if (!r) return { txt: '—', col: '#5e718f' };
      const txt = r.deaths > 0 ? `${this.euro(r.damage)} ☠${r.deaths}` : this.euro(r.damage);
      const col = r.deaths > 0 ? '#ff8a8a' : r.damage >= 10 ? '#ffcf8b' : '#7fd1a0';
      return { txt, col };
    };

    ordered.forEach((m) => {
      add(this.add.text(nameX, ty, m.def.name + (m.isPlayer ? ' ◄' : ''),
        { fontFamily: FONT, fontSize: '12px', color: m.isPlayer ? '#ffd56b' : COL.ink }).setOrigin(0, 0.5));
      sevs.forEach((s, i) => {
        const c = cell(previews[s].find((x) => x.id === m.id));
        add(this.add.text(colX(i), ty, c.txt, { fontFamily: FONT, fontSize: '12px', color: c.col }).setOrigin(0.5));
      });
      ty += 28;
    });

    ty += 4;
    add(this.add.rectangle(cx, ty - 8, pw - 44, 1, 0x2a4a63));
    add(this.add.text(nameX, ty, t('table.region'), { fontFamily: FONT, fontSize: '12px', color: '#cfe0f5', fontStyle: 'bold' }).setOrigin(0, 0.5));
    sevs.forEach((s, i) => {
      const tot = previews[s].reduce((a, r) => ({ d: a.d + r.damage, k: a.k + r.deaths }), { d: 0, k: 0 });
      const txt = tot.k > 0 ? `${this.euro(tot.d)} ☠${tot.k}` : this.euro(tot.d);
      add(this.add.text(colX(i), ty, txt, { fontFamily: FONT, fontSize: '12px', color: tot.k > 0 ? '#ff8a8a' : '#ffcf8b', fontStyle: 'bold' }).setOrigin(0.5));
    });

    const btn = makeButton(this, cx, top + ph - 28, 200, 42, t('table.close'),
      () => { sfx.click(); group.forEach((o) => o.destroy()); btn.destroy(); },
      { fill: 0x2a4a7a, fillHover: 0x37609b, fontSize: 14 });
  }

  // --- Top bar ---------------------------------------------------------------
  buildTopBar() {
    const width = DESIGN_W;
    this.add.rectangle(width / 2, 28, width, 56, COL.panel).setStrokeStyle(2, 0x2a4a7a);
    this.roundText = this.add.text(16, 16, '', { fontFamily: FONT, fontSize: '20px', color: COL.ink });
    this.phaseText = this.add.text(250, 18, '', { fontFamily: FONT, fontSize: '15px', color: '#ffd56b' });
    this.sevText = this.add.text(470, 18, '', { fontFamily: FONT, fontSize: '15px', color: COL.ink });
    this.sharpenBtn = makeButton(this, 800, 28, 130, 32, t('hud.sharpen'),
      () => this.doSharpen(), { fill: 0x2a4a7a, fillHover: 0x37609b, fontSize: 12 });

    // Event banner: thin strip directly under the top bar (full-ish width).
    this.add.rectangle(440, 70, 800, 22, 0x223a2a).setStrokeStyle(1, 0x3f6b4a);
    this.eventText = this.add.text(440, 70, '', {
      fontFamily: FONT, fontSize: '12px', color: '#bfe6c4', align: 'center', wordWrap: { width: 784 },
    }).setOrigin(0.5);
  }

  doSharpen() {
    if (this.animating) return;
    if (sharpenForecast(this.gs)) {
      sfx.click();
      logEvent('sharpen', { level: this.gs.forecastLevel }, this.gs.round);
      this.flashText(t('flash.sharpened'));
      this.refreshAll();
    }
  }

  // --- Map -------------------------------------------------------------------
  buildMap() {
    // Compute node positions along a flowing diagonal river.
    const ordered = [...this.gs.munis].sort((a, b) => a.def.pos - b.def.pos);
    const pts = ordered.map((m, i) => {
      const t = i / (ordered.length - 1);
      return {
        m,
        x: 110 + t * (MAP_W - 220),
        y: 165 + t * 370 + Math.sin(t * Math.PI * 2) * 42,
      };
    });

    // River poly-line behind nodes.
    const river = this.add.graphics();
    river.lineStyle(26, COL.riverDark, 1);
    river.beginPath();
    pts.forEach((p, i) => (i === 0 ? river.moveTo(p.x, p.y) : river.lineTo(p.x, p.y)));
    river.strokePath();
    river.lineStyle(10, COL.river, 1);
    river.beginPath();
    pts.forEach((p, i) => (i === 0 ? river.moveTo(p.x, p.y) : river.lineTo(p.x, p.y)));
    river.strokePath();
    this.add.text(pts[0].x - 30, pts[0].y - 78, t('map.headwaters'), { fontFamily: FONT, fontSize: '12px', color: COL.inkDim });
    this.add.text(pts[pts.length - 1].x - 20, pts[pts.length - 1].y + 60, t('map.estuary'), { fontFamily: FONT, fontSize: '12px', color: COL.inkDim });

    this.riverPts = pts.map((p) => ({ x: p.x, y: p.y })); // for the flood wave
    pts.forEach((p) => this.buildNode(p.m, p.x, p.y));
  }

  buildNode(m, x, y) {
    const c = this.add.container(x, y);

    const ring = this.add.circle(0, 0, 42, 0x000000, 0).setStrokeStyle(4, COL.accent).setVisible(false);
    const idRing = this.add.circle(0, 0, 38, 0x0e1726, 0.45).setStrokeStyle(3, m.def.color);
    // Town sprites ship pre-keyed (transparent background) — see tools/build-assets.py.
    const sprite = this.add.image(0, -2, `town_${m.id}`).setDisplaySize(74, 74);
    const floodTint = this.add.circle(0, 0, 38, 0x16264f, 0).setVisible(false);
    // Small numbered identity badge (top-left) so the art reads clearly.
    const badge = this.add.circle(-26, -26, 12, m.def.color).setStrokeStyle(2, 0x0a1422);
    const num = this.add.text(-26, -26, String(m.def.pos), {
      fontFamily: FONT, fontSize: '14px', color: '#0a1422', fontStyle: 'bold',
    }).setOrigin(0.5);
    const name = this.add.text(0, 46, m.def.name, { fontFamily: FONT, fontSize: '13px', color: COL.ink }).setOrigin(0.5);
    const youTag = this.add.text(0, -56, t('map.you'), {
      fontFamily: FONT, fontSize: '12px', color: '#0a1422', backgroundColor: '#ffd56b', padding: { x: 4, y: 1 },
    }).setOrigin(0.5).setVisible(m.isPlayer);
    const levees = this.add.text(0, -42, '', { fontFamily: FONT, fontSize: '13px', color: '#cfe0f5' }).setOrigin(0.5);
    const invInfo = this.add.text(0, 60, '', { fontFamily: FONT, fontSize: '11px', color: COL.inkDim }).setOrigin(0.5);
    const status = this.add.text(0, 4, '', { fontFamily: FONT, fontSize: '13px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5).setStroke('#0a1422', 4);
    // Producer cities advertise the resource they supply the region (always on,
    // from round 1) so dependencies are known BEFORE the city is ever lost.
    let prodTag = null;
    if (PRODUCERS[m.id]) {
      prodTag = this.add.text(0, 73, `⚙ ${t(`res.${PRODUCERS[m.id].res}`)}`,
        { fontFamily: FONT, fontSize: '10px', color: '#c9a24b' }).setOrigin(0.5).setStroke('#0a1422', 3);
    }

    c.add([ring, idRing, sprite, floodTint, badge, num, status, name, youTag, levees, invInfo]);
    if (prodTag) c.add(prodTag);

    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerover', () => idRing.setStrokeStyle(3, COL.accent));
    sprite.on('pointerout', () => idRing.setStrokeStyle(3, m.def.color));
    sprite.on('pointerdown', () => this.selectTarget(m.id));

    this.nodes[m.id] = { c, ring, idRing, sprite, levees, invInfo, floodTint, status, name, prodTag, color: m.def.color, x, y };
  }

  // --- Right panel -----------------------------------------------------------
  buildRightPanel() {
    const height = DESIGN_H;
    const px = MAP_W, pw = DESIGN_W - MAP_W;
    this.add.rectangle(px + pw / 2, height / 2, pw, height, COL.panel).setStrokeStyle(2, 0x2a4a7a);

    const cx = px + 20;
    this.panelTitle = this.add.text(cx, 70, '', { fontFamily: FONT, fontSize: '18px', color: '#ffd56b' });

    // Town portrait of the currently selected Target City (identity is public).
    this.townThumb = this.add.image(px + pw - 60, 112, 'town_millington').setDisplaySize(100, 100);
    this.add.rectangle(px + pw - 60, 112, 104, 104).setStrokeStyle(1, 0x3a5b8a);

    this.budgetText = this.add.text(cx, 100, '', { fontFamily: FONT, fontSize: '22px', color: COL.good });
    this.researchText = this.add.text(cx, 126, '', { fontFamily: FONT, fontSize: '12px', color: '#c77dff' });

    this.add.text(cx, 150, t('panel.targetCity'), { fontFamily: FONT, fontSize: '12px', color: COL.inkDim });
    this.targetText = this.add.text(cx, 166, '', { fontFamily: FONT, fontSize: '16px', color: COL.ink, wordWrap: { width: pw - 40 } });
    this.targetDetail = this.add.text(cx, 196, '', { fontFamily: FONT, fontSize: '12px', color: COL.inkDim, lineSpacing: 3, wordWrap: { width: pw - 40 } });

    this.add.text(cx, 268, t('panel.invest'), { fontFamily: FONT, fontSize: '12px', color: COL.inkDim });

    // Investment cards.
    this.cards = [];
    let cy = 288;
    INVESTMENT_ORDER.forEach((key) => {
      const inv = INVESTMENTS[key];
      const btn = makeButton(this, px + pw / 2, cy + 26, pw - 36, 48,
        `${inv.icon}  ${t(`inv.${key}.name`)}   €${inv.cost}M`,
        () => this.buy(key), { fontSize: 15, fill: COL.panelLight });
      btn.invKey = key;
      btn.txt.setY(-7);
      // Second line: live "prevents ~€X" / "saves lives" / scarcity reason.
      btn.subTxt = this.add.text(0, 12, '', { fontFamily: FONT, fontSize: '10px', color: '#9fd9b4' }).setOrigin(0.5);
      btn.add(btn.subTxt);
      btn.bg.on('pointerover', () => this.investHint && this.investHint.setText(t(`inv.${key}.hint`)));
      btn.bg.on('pointerout', () => this.investHint && this.investHint.setText(this.defaultHint));
      this.cards.push(btn);
      cy += 56;
    });

    this.defaultHint = t('panel.investHintDefault');
    this.investHint = this.add.text(cx, cy + 14, this.defaultHint,
      { fontFamily: FONT, fontSize: '12px', color: '#9fb6d0', lineSpacing: 4, wordWrap: { width: pw - 40 } });

    // Favour: spend the trust you've built with an ally for boats now.
    this.favourBtn = makeButton(this, px + pw / 2, height - 98, pw - 36, 30,
      t('panel.askFavour'), () => this.doFavour(),
      { fill: 0x2e6b4a, fillHover: 0x3a8a5e, fontSize: 13 });
    this.favourBtn.setVisible(false);

    this.endBtn = makeButton(this, px + pw / 2, height - 50, pw - 36, 56,
      t('panel.weather'), () => this.endPreparation(),
      { fill: 0x8a2b2b, fillHover: 0xb33636, fontSize: 17 });
  }

  doFavour() {
    if (this.animating) return;
    if (askFavour(this.gs, this.targetId)) {
      sfx.deal();
      logEvent('favour', { town: this.targetId }, this.gs.round);
      this.flashText(t('flash.favourCalled', { mayor: MAYORS[this.targetId].name }));
      this.refreshAll();
    }
  }

  // --- Card hand -------------------------------------------------------------
  buildCardHand() {
    this.add.text(20, 622, t('cards.header'),
      { fontFamily: FONT, fontSize: '11px', color: COL.inkDim });
    const slotW = 206, slotH = 92, gap = 9, y = 668;
    let x = 12;
    this.cardSlots = [];
    for (let i = 0; i < BALANCE.handCap; i++) {
      const c = this.add.container(x + slotW / 2, y);
      const bg = this.add.rectangle(0, 0, slotW, slotH, COL.panel).setStrokeStyle(2, 0x3a5b8a);
      const name = this.add.text(-slotW / 2 + 10, -slotH / 2 + 8, '',
        { fontFamily: FONT, fontSize: '13px', color: COL.ink, fontStyle: 'bold' });
      const tier = this.add.text(slotW / 2 - 10, -slotH / 2 + 8, '',
        { fontFamily: FONT, fontSize: '10px', color: COL.inkDim }).setOrigin(1, 0);
      const blurb = this.add.text(-slotW / 2 + 10, -slotH / 2 + 30, '',
        { fontFamily: FONT, fontSize: '11px', color: COL.inkDim, wordWrap: { width: slotW - 20 }, lineSpacing: 2 });
      c.add([bg, name, tier, blurb]);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => { if (c.cardId && !this.animating) bg.setFillStyle(COL.panelLight); });
      bg.on('pointerout', () => bg.setFillStyle(COL.panel));
      bg.on('pointerdown', () => this.tryPlayCard(i));
      c.bg = bg; c.nameT = name; c.tierT = tier; c.blurbT = blurb; c.cardId = null;
      this.cardSlots.push(c);
      x += slotW + gap;
    }
  }

  updateHand() {
    const gs = this.gs;
    this.cardSlots.forEach((slot, i) => {
      const cardId = gs.hand[i];
      slot.cardId = cardId || null;
      if (!cardId) { slot.setVisible(false); return; }
      slot.setVisible(true);
      const card = CARD_BY_ID[cardId];
      const hex = '#' + TIER_COLOR[card.tier].toString(16).padStart(6, '0');
      slot.nameT.setText(t(`card.${card.id}.name`));
      slot.tierT.setText(t(`tier.${card.tier}`)).setColor(hex);
      slot.blurbT.setText(t(`card.${card.id}.blurb`));
      const playable = canPlayCard(gs, cardId, this.targetId) && !this.animating;
      slot.bg.setStrokeStyle(2, playable ? TIER_COLOR[card.tier] : 0x33485f);
      slot.nameT.setColor(playable ? COL.ink : COL.inkDim);
    });
  }

  tryPlayCard(i) {
    if (this.animating || this.gs.phase !== PHASE.PREP) return;
    const cardId = this.cardSlots[i].cardId;
    if (!cardId) return;
    const card = CARD_BY_ID[cardId];
    if (playCard(this.gs, cardId, this.targetId)) {
      sfx.card();
      logEvent('card', { id: card.id, target: this.targetId }, this.gs.round);
      const cardName = t(`card.${card.id}.name`);
      let msg = t('flash.cardPlayed', { card: cardName });
      if (this.gs.lastAudit) msg = t('flash.cardReserves', { card: cardName, audit: this.gs.lastAudit.name, banked: this.gs.lastAudit.banked });
      this.flashText(msg);
      this.refreshAll();
    } else {
      this.flashText(t('flash.cardNoTarget', { card: t(`card.${card.id}.name`) }));
    }
  }

  // --- Interaction -----------------------------------------------------------
  selectTarget(id) {
    if (this.animating || this.gs.phase !== PHASE.PREP) return;
    this.targetId = id;
    this.refreshAll();
  }

  buy(key) {
    if (this.animating || this.gs.phase !== PHASE.PREP) return;
    const ok = purchase(this.gs, this.gs.playerMuniId, this.targetId, key);
    if (ok) {
      sfx.invest();
      logEvent('invest', { kind: key, target: this.targetId, own: this.targetId === this.gs.playerMuniId }, this.gs.round);
      this.flashText(t('flash.invested', { inv: t(`inv.${key}.name`), town: muniById(this.gs, this.targetId).def.name }));
      this.refreshAll();
    }
  }

  endPreparation() {
    if (this.animating || this.gs.phase !== PHASE.PREP) return;
    runAllAI(this.gs);                 // AI mayors commit
    const results = resolveRound(this.gs); // draw severity + simulate (phase -> SUMMARY)
    this.playFlood(results);
  }

  // --- Flood animation -------------------------------------------------------
  playFlood(results) {
    this.animating = true;
    this.setDiploVisible(false);
    this.favourBtn.setVisible(false);
    this.cards.forEach((b) => b.setEnabled(false));
    this.endBtn.setEnabled(false);
    this.sharpenBtn.setEnabled(false);

    const sev = this.gs.regionalSeverity;
    this.sevText.setText(t('hud.flood', { sev: t(`sev.${sev}`) })).setColor('#ff9a6b');
    this.phaseText.setText(t('hud.floodPhase'));
    sfx.flood(sev);
    if (sev >= 3) this.cameras.main.shake(700, 0.006);

    const ordered = [...results].sort((a, b) => a.pos - b.pos);
    const pts = this.riverPts;

    // A wave crest travels headwaters → estuary; each town reacts as it passes.
    const wave = this.add.circle(pts[0].x, pts[0].y - 4, 18, 0x9fdcff, 0.5).setStrokeStyle(2, 0xffffff);
    const step = (idx) => {
      if (idx >= pts.length) {
        wave.destroy();
        this.time.delayedCall(600, () => this.showSummary());
        return;
      }
      this.tweens.add({
        targets: wave, x: pts[idx].x, y: pts[idx].y, duration: idx === 0 ? 120 : 380, ease: 'Sine.inOut',
        onComplete: () => { this.showFloodAt(ordered[idx]); step(idx + 1); },
      });
    };
    step(0);
  }

  showFloodAt(r) {
    const node = this.nodes[r.id];
    const m = muniById(this.gs, r.id);
    const col = SEVERITY_COLORS[Math.max(0, Math.min(4, Math.round(r.effSeverity)))];
    const tintAlpha = Math.min(0.85, 0.12 + r.effSeverity * 0.18); // scale with severity
    node.floodTint.setFillStyle(col).setVisible(true).setAlpha(0);
    this.tweens.add({ targets: node.floodTint, alpha: tintAlpha, duration: 400, yoyo: r.effSeverity < 1, hold: 0 });
    if (r.deaths > 0) sfx.bad();

    if (r.damage >= 1) {
      let s = this.euro(r.damage);
      if (r.deaths > 0) s += `  ☠${r.deaths}`;
      node.status.setText(s).setColor(r.deaths > 0 ? '#ff9a9a' : '#ffcf8b');
      this.popText(node.x, node.y - 30, this.euro(r.damage), '#ffb060');
      if (r.deaths > 0) this.popText(node.x + 34, node.y - 6, `☠${r.deaths}`, '#ff6b6b');
    } else if (r.effSeverity >= 0.5) {
      node.status.setText(t('map.minor')).setColor('#9fd9b4');  // nuisance flood, negligible
    } else {
      node.status.setText(t('map.dry')).setColor('#bfeacb');    // spared
    }
    if (m.destroyed) {
      node.status.setText(t('map.dataLost')).setColor('#ffd56b');
    }
    // Equipment swept away by the flood (boats persist, so loss is felt).
    if (r.boatsLost > 0) this.popText(node.x - 34, node.y + 2, `−${r.boatsLost}⛵`, '#9fd9ff');
  }

  showAdvisor(text) {
    const width = DESIGN_W, height = DESIGN_H;
    const pw = 640, ph = 390;
    const group = [];
    const add = (o) => { group.push(o); return o; };
    add(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setInteractive());
    add(this.add.rectangle(width / 2, height / 2, pw, ph, COL.panel).setStrokeStyle(3, COL.accent));
    add(this.add.text(width / 2, height / 2 - ph / 2 + 24, t('advisor.title'), { fontFamily: FONT, fontSize: '18px', color: '#ffd56b' }).setOrigin(0.5));
    add(this.add.text(width / 2 - pw / 2 + 28, height / 2 - ph / 2 + 58, text, {
      fontFamily: FONT, fontSize: '14px', color: COL.ink, align: 'left', wordWrap: { width: pw - 56 }, lineSpacing: 6,
    }).setOrigin(0, 0));
    const btn = makeButton(this, width / 2, height / 2 + ph / 2 - 32, 200, 46, t('advisor.gotit'),
      () => { sfx.click(); group.forEach((o) => o.destroy()); btn.destroy(); },
      { fill: 0x1f7a3d, fillHover: 0x2a9b4f, fontSize: 15 });
  }

  // --- Summary / advance -----------------------------------------------------
  showSummary() {
    const gs = this.gs;
    const width = DESIGN_W, height = DESIGN_H;
    const last = gs.log[gs.log.length - 1];
    const isFinal = gs.round >= BALANCE.totalRounds;

    // Opt-in research: the round's outcome snapshot (decisions were logged live).
    {
      const ownRow = (gs.lastResults || []).find((r) => r.id === gs.playerMuniId) || { damage: 0, deaths: 0 };
      const rels = Object.values(gs.relationship || {});
      logEvent('round_end', {
        sev: gs.regionalSeverity,
        ownDmg: Math.round(ownRow.damage || 0), ownDeaths: ownRow.deaths || 0,
        regDmg: Math.round(last.totalDamage || 0), regDeaths: last.totalDeaths || 0,
        rel: rels.length ? Math.round(rels.reduce((a, b) => a + b, 0) / rels.length) : 50,
        morale: playerMuni(gs).morale,
      }, gs.round);
      flushTelemetry();
    }
    if (last.totalDeaths > 100 || last.totalDamage > 1500) sfx.bad(); else sfx.good();

    const art = writeArticle(gs);
    const toneColor = ({ calm: 0x356a9c, mild: 0x3a7d8a, damage: 0x9c6a2b, disaster: 0x8a2b2b })[art.tone] || 0x356a9c;
    const toneCap = t(`summary.cap.${art.tone}`);

    const pw = 740;
    const cx = width / 2;
    const left = cx - pw / 2 + 30, wrap = pw - 60;
    const topM = 18;
    const group = [];          // everything (for teardown)
    const mod = [];            // modal pieces to recentre vertically (not the dim overlay)
    const add = (o) => { group.push(o); mod.push(o); return o; };

    // Dim backdrop (full screen, never shifted).
    group.push(this.add.rectangle(cx, height / 2, width, height, 0x000000, 0.6).setInteractive());
    // Newsprint sheet — top-anchored, height set once the content is measured.
    const bg = add(this.add.rectangle(cx, topM, pw, 100, 0xede4d0).setStrokeStyle(3, 0x2b2419).setOrigin(0.5, 0));

    let ty = topM + 16;
    const mast = add(this.add.text(cx, ty, art.masthead, { fontFamily: FONT, fontSize: '30px', color: '#181206', fontStyle: 'bold' }).setOrigin(0.5, 0));
    ty += mast.height + 6;
    add(this.add.rectangle(cx, ty, pw - 44, 2, 0x2b2419).setOrigin(0.5, 0)); ty += 10;
    const dl = add(this.add.text(cx, ty, art.dateline.toUpperCase(), { fontFamily: FONT, fontSize: '11px', color: '#6a5836' }).setOrigin(0.5, 0));
    ty += dl.height + 12;

    // Realistic newspaper photo, chosen by the season's outcome.
    let imgKey = ({ calm: 'news_calm', mild: 'news_minor', damage: 'news_ruin', disaster: 'news_rescue' })[art.tone] || 'news_calm';
    if (boatsWereSent(gs.notifications) && (art.tone === 'calm' || art.tone === 'mild')) imgKey = 'news_cooperation';
    if (this.textures.exists(imgKey)) {
      add(this.add.image(cx, ty, imgKey).setDisplaySize(360, 202).setOrigin(0.5, 0));
      add(this.add.rectangle(cx, ty + 202 - 9, 360, 18, 0x1a1208, 0.85));
      add(this.add.text(cx, ty + 202 - 9, toneCap, { fontFamily: FONT, fontSize: '11px', color: '#ede4d0' }).setOrigin(0.5));
      ty += 202 + 12;
    } else {
      add(this.add.rectangle(cx, ty, pw - 60, 60, toneColor).setOrigin(0.5, 0)); ty += 72;
    }

    const hl = add(this.add.text(left, ty, art.headline, { fontFamily: FONT, fontSize: '18px', color: '#181206', fontStyle: 'bold', wordWrap: { width: wrap }, lineSpacing: 2 }).setOrigin(0, 0));
    ty += hl.height + 10;

    if (isFinal) {
      const rv = add(this.add.text(left, ty, t('summary.review'), { fontFamily: FONT, fontSize: '13px', color: '#6a5836', fontStyle: 'bold' }));
      ty += rv.height + 6;
      const pm = add(this.add.text(left, ty, postMortem(gs).slice(0, 4).map((s) => '• ' + s).join('\n\n'),
        { fontFamily: FONT, fontSize: '12px', color: '#2a2012', wordWrap: { width: wrap }, lineSpacing: 3 }).setOrigin(0, 0));
      ty += pm.height + 10;
    } else {
      const body = add(this.add.text(left, ty, art.paragraphs.slice(0, 3).join('\n\n'),
        { fontFamily: FONT, fontSize: '13px', color: '#2a2012', wordWrap: { width: wrap }, lineSpacing: 5 }).setOrigin(0, 0));
      ty += body.height + 12;
      const q = add(this.add.text(left, ty, art.quote,
        { fontFamily: FONT, fontSize: '13px', color: '#4a3a1e', fontStyle: 'italic', wordWrap: { width: wrap }, lineSpacing: 3 }).setOrigin(0, 0));
      ty += q.height + 10;
      const figs = [...gs.lastResults].sort((a, b) => a.pos - b.pos)
        .map((r) => `${muniById(gs, r.id).def.name.split(' ')[0]} ${this.euro(r.damage)}${r.deaths > 0 ? ' ☠' + r.deaths : ''}`).join('   ·   ');
      const fg = add(this.add.text(left, ty, figs, { fontFamily: FONT, fontSize: '11px', color: '#5a4a2a', wordWrap: { width: wrap }, lineSpacing: 2 }).setOrigin(0, 0));
      ty += fg.height + 12;
    }

    // Private "Mayor's note" — your own-town standing + one next-step nudge,
    // stitched onto the foot of the public paper (no extra screen/click). The
    // full dark memo is reserved for round 10 (isFinal), so suppress it there.
    if (!isFinal) {
      ty += 4;
      add(this.add.rectangle(cx, ty, pw - 60, 1, 0x2b2419).setOrigin(0.5, 0)); ty += 9;
      add(this.add.text(left, ty, t('brief.note'),
        { fontFamily: FONT, fontSize: '10px', color: '#9c6a2b', fontStyle: 'bold' }).setOrigin(0, 0));
      ty += 16;
      const rep = roundBriefing(gs);
      if (gs.round <= 2) {
        const o = add(this.add.text(left, ty, t('briefRound.onramp'),
          { fontFamily: FONT, fontSize: '12px', color: '#6a5836', fontStyle: 'italic', wordWrap: { width: wrap } }).setOrigin(0, 0));
        ty += o.height + 6;
      } else {
        const arrow = rep.trend === 'up' ? `▲ +${rep.delta}` : rep.trend === 'down' ? `▼ ${Math.abs(rep.delta)}` : '▬';
        const l1 = add(this.add.text(left, ty,
          t('briefRound.standing', { pct: rep.reElection, arrow, mood: t(rep.moodKey) }),
          { fontFamily: FONT, fontSize: '13px', color: '#181206', fontStyle: 'bold' }).setOrigin(0, 0));
        ty += l1.height + 5;
        const ownDeathsTok = rep.ownDeathsRound > 0 ? t('briefRound.lost', { n: rep.ownDeathsRound }) : t('briefRound.noLives');
        const l2 = add(this.add.text(left, ty,
          t('briefRound.townVsRegion', { ownDmg: rep.ownDmgRound, ownDeaths: ownDeathsTok, regionDmg: rep.regionDmgRound, regionDeaths: rep.regionDeathsRound }),
          { fontFamily: FONT, fontSize: '12px', color: rep.ownDeathsRound > 0 ? '#9c2b2b' : '#3a2f1a', wordWrap: { width: wrap } }).setOrigin(0, 0));
        ty += l2.height + 5;
        const l3 = add(this.add.text(left, ty, `→ ${t(rep.adviceKey)}`,
          { fontFamily: FONT, fontSize: '12px', color: '#6a3a14', fontStyle: 'bold', wordWrap: { width: wrap }, lineSpacing: 2 }).setOrigin(0, 0));
        ty += l3.height + 6;
      }
      gs.prevReElection = rep.reElection;   // cache for next round's trend arrow
    }

    const btn = makeButton(this, cx, ty + 23, isFinal ? 320 : 260, 46,
      isFinal ? t('summary.toBriefing') : t('summary.next'),
      () => {
        sfx.click();
        group.forEach((o) => o.destroy());
        btn.destroy();
        if (isFinal) this.showFinalBriefing();   // public paper → private memo
        else this.startNextRound();
      }, { fill: 0x1f7a3d, fillHover: 0x2a9b4f, fontSize: 16 });
    mod.push(btn);
    ty += 46 + 16;

    // Size the sheet to wrap the measured content, then recentre the whole modal.
    const totalH = ty - topM;
    bg.setSize(pw, totalH);
    let dy = (height - totalH) / 2 - topM;
    if (topM + dy < 8) dy = 8 - topM;             // never let it run off the top
    mod.forEach((o) => { o.y += dy; });
  }

  // The private, confidential end-of-campaign memo (your town only): score +
  // grade, re-election odds, public mood, and lives/damage for your town vs the
  // whole region, side by side — so the parochial-vs-cooperative gap is visible.
  showFinalBriefing() {
    const width = DESIGN_W, height = DESIGN_H;
    const rep = finalReport(this.gs);
    // Opt-in research: the campaign's final outcome.
    logEvent('campaign_end', {
      score: rep.score, grade: rep.grade, re: rep.reElection, verdict: rep.verdictKey,
      regDeaths: rep.regionDeaths, regDmg: rep.regionDamageRaw, town: rep.ownName,
    });
    flushTelemetry();
    const pw = 640, cx = width / 2;
    const left = cx - pw / 2 + 34, right = cx + pw / 2 - 34, wrap = pw - 68;
    const topM = 20;
    const group = [], mod = [];
    const add = (o) => { group.push(o); mod.push(o); return o; };

    group.push(this.add.rectangle(cx, height / 2, width, height, 0x000000, 0.72).setInteractive());
    const card = add(this.add.rectangle(cx, topM, pw, 100, 0x111a2c).setStrokeStyle(3, 0xc9a24b).setOrigin(0.5, 0));

    let ty = topM + 22;
    add(this.add.text(cx, ty, t('brief.title'), { fontFamily: FONT, fontSize: '15px', color: '#e8c879', fontStyle: 'bold' }).setOrigin(0.5, 0)); ty += 22;
    add(this.add.text(cx, ty, t('brief.subtitle', { town: rep.ownName }), { fontFamily: FONT, fontSize: '13px', color: COL.inkDim }).setOrigin(0.5, 0)); ty += 26;
    add(this.add.rectangle(cx, ty, pw - 56, 1, 0x3a4a63).setOrigin(0.5, 0)); ty += 18;

    add(this.add.text(cx, ty, t('brief.score'), { fontFamily: FONT, fontSize: '12px', color: COL.inkDim }).setOrigin(0.5, 0)); ty += 18;
    const scoreColor = rep.score >= 78 ? '#5fd17a' : rep.score >= 60 ? '#ffcf8b' : '#ff8a8a';
    add(this.add.text(cx - 26, ty, String(rep.score), { fontFamily: FONT, fontSize: '58px', color: scoreColor, fontStyle: 'bold' }).setOrigin(0.5, 0));
    add(this.add.text(cx + 56, ty + 18, t('brief.grade', { grade: rep.grade }), { fontFamily: FONT, fontSize: '20px', color: scoreColor }).setOrigin(0, 0));
    ty += 76;

    const row = (label, value, color, sep) => {
      add(this.add.text(left, ty, label, { fontFamily: FONT, fontSize: '14px', color: COL.inkDim }).setOrigin(0, 0));
      add(this.add.text(right, ty, value, { fontFamily: FONT, fontSize: '15px', color: color || COL.ink, fontStyle: 'bold' }).setOrigin(1, 0));
      ty += 28;
      if (sep) { add(this.add.rectangle(cx, ty - 4, pw - 56, 1, 0x2a3850).setOrigin(0.5, 0)); ty += 10; }
    };
    const reColor = rep.reElection >= 55 ? '#5fd17a' : rep.reElection >= 35 ? '#ffcf8b' : '#ff8a8a';
    row(t('brief.reelection'), rep.reElection + '%', reColor);
    row(t('brief.mood'), t(rep.moodKey), null, true);
    row(t('brief.livesOwn'), String(rep.ownDeaths), rep.ownDeaths > 0 ? '#ff9a9a' : '#bfeacb');
    row(t('brief.livesRegion'), String(rep.regionDeaths), rep.regionDeaths > 0 ? '#ffb38a' : '#bfeacb');
    row(t('brief.damageOwn'), rep.ownDamage);
    row(t('brief.damageRegion'), rep.regionDamage);
    ty += 8;

    const v = add(this.add.text(cx, ty, t(rep.verdictKey), { fontFamily: FONT, fontSize: '13px', color: '#cde0f5', align: 'center', wordWrap: { width: wrap }, lineSpacing: 4 }).setOrigin(0.5, 0));
    ty += v.height + 18;

    // Submit to the optional scoreboard server (left) · play again (right).
    const subBtn = makeButton(this, cx - 135, ty + 23, 250, 46, t('score.submit'), () => {
      if (subBtn.done) return;
      sfx.click();
      promptName(t('score.namePrompt'), t('score.ok'), t('score.cancel'), async (name) => {
        if (!name) return;
        subBtn.setEnabled(false);
        const res = await submitScore({
          name, town: rep.ownName, score: rep.score, grade: rep.grade,
          reElection: rep.reElection, regionDeaths: rep.regionDeaths,
          regionDamage: rep.regionDamageRaw, lang: getLang(),
        });
        if (res && res.ok) {
          subBtn.done = true;
          subBtn.txt.setText(t('score.submitted', res.rank)).setFontSize(11);
        } else {
          subBtn.setEnabled(true);
          subBtn.txt.setText(t('score.submitFail')).setFontSize(10);
        }
      });
    }, { fill: 0x2a4a7a, fillHover: 0x37609b, fontSize: 14 });
    mod.push(subBtn);
    const btn = makeButton(this, cx + 135, ty + 23, 250, 46, t('brief.again'), () => {
      sfx.click(); group.forEach((o) => o.destroy()); btn.destroy(); subBtn.destroy(); this.scene.start('Menu');
    }, { fill: 0x1f7a3d, fillHover: 0x2a9b4f, fontSize: 16 });
    mod.push(btn); ty += 46 + 20;

    card.setSize(pw, ty - topM);
    let dy = (height - (ty - topM)) / 2 - topM;
    if (topM + dy < 8) dy = 8 - topM;
    mod.forEach((o) => { o.y += dy; });
    sfx.good();
  }

  verdict(sc) {
    if (sc.totalDamage < 3000 && sc.destroyed === 0 && sc.totalDeaths < 80)
      return 'A cooperative region. Shared boats and well-placed levees kept the damage low and the estuary safe — the outcome a cost–benefit report can describe but never make you feel.';
    if (sc.totalDamage < 8000 && sc.totalDeaths < 1000)
      return 'Mixed. Some towns walled themselves off and pushed water downstream. The region survived, but the bill — and the toll — fell unevenly.';
    return 'Every mayor optimised their own town. The water went somewhere — downstream — and the damage piled up. This is the status quo the 2002 and 2013 floods exposed.';
  }

  startNextRound() {
    advanceRound(this.gs);
    this.targetId = this.gs.playerMuniId;
    // Reset per-node flood visuals.
    Object.values(this.nodes).forEach((n) => {
      n.floodTint.setVisible(false);
      n.status.setText('');
    });
    this.cards.forEach((b) => b.setEnabled(true));
    this.endBtn.setEnabled(true);
    this.animating = false;
    this.sevText.setColor(COL.ink);
    this.refreshAll();
    if (this.gs.coopDividendApplied) { this.gs.coopDividendApplied = false; this.flashText(t('flash.coopDividend')); }
    // One-time warning the season after the data city is lost: forecasts are gone.
    if (this.gs.oceanaJustLost) {
      this.gs.oceanaJustLost = false;
      this.showAdvisor(t('advisor.oceanaLost'));
    } else if (ADVISOR_ROUNDS.includes(this.gs.round)) {
      this.showAdvisor(t(`advisor.${this.gs.round}`));
    }
  }

  // --- Rendering -------------------------------------------------------------
  refreshAll() {
    const gs = this.gs;
    this.roundText.setText(t('hud.round', { n: gs.round, total: BALANCE.totalRounds }));
    if (gs.phase === PHASE.PREP) {
      this.phaseText.setText(t('hud.prep'));
      const b = forecastBand(gs);
      if (b.blind) {
        this.sevText.setText(t('hud.forecastBlind')).setColor('#ff8a8a');
      } else {
        this.sevText.setText(b.exact
          ? t('hud.forecastExact', { sev: t(`sev.${b.low}`) })
          : t('hud.forecastBand', { low: t(`sev.${b.low}`), high: t(`sev.${b.high}`) }))
          .setColor(b.exact ? '#ffcf8b' : COL.ink);
      }
      this.sharpenBtn.setEnabled(canSharpenForecast(gs));
    }
    if (gs.currentEvent) {
      const ev = gs.currentEvent;
      this.eventText.setText(`⚑ ${t(`event.${ev.id}.name`)} — ${t(`event.${ev.id}.desc`)}`);
    }

    // Nodes — AI municipalities' plans stay hidden until a meeting is convened.
    gs.munis.forEach((m) => {
      const n = this.nodes[m.id];
      n.ring.setVisible(m.id === this.targetId);
      if (isRevealed(gs, m.id)) {
        n.levees.setText(m.leveesBuilt > 0 ? '▲'.repeat(Math.min(m.leveesBuilt, 5)) : '');
        const tr = m.stock;                          // persistent fleet, shown every round
        const bits = [];
        if (tr.boat) bits.push(`⛵${tr.boat}`);
        if (tr.kit) bits.push(`✚${tr.kit}`);
        n.invInfo.setText(bits.join(' ')).setColor(COL.inkDim);
      } else {
        n.levees.setText('');
        n.invInfo.setText(t('map.unknown')).setColor('#5e718f');
      }
      // Producer tag colours by supply state: gold flowing / amber scarce / red cut.
      if (n.prodTag && PRODUCERS[m.id]) {
        const st = gs.scarce[PRODUCERS[m.id].res];
        n.prodTag.setColor(m.destroyed || st === 'cut' ? '#ff6b6b' : st === 'strained' ? '#ffcf8b' : '#c9a24b');
      }
      // Relationship stance colours the AI town's name (ally green / rival red).
      if (!m.isPlayer && gs.relationship) {
        const lab = relationshipLabel(gs.relationship[m.id]);
        n.name.setColor(lab === 'ally' ? '#7fd1a0' : lab === 'rival' ? '#ff8a8a' : COL.ink);
      }
    });

    // Panel.
    const p = playerMuni(gs);
    this.panelTitle.setText(t('panel.prepTitle', { town: p.def.name }));
    this.budgetText.setText(t('panel.budget', { n: p.budget }));

    const tc = muniById(gs, this.targetId);
    const own = tc.id === gs.playerMuniId ? t('panel.yourTown') : t('panel.coop');
    this.targetText.setText(`${tc.def.pos}. ${tc.def.name}${own}`);
    this.targetText.setColor(tc.id === gs.playerMuniId ? COL.ink : '#7fd1a0');
    this.townThumb.setTexture(`town_${tc.id}`).setDisplaySize(100, 100);

    const stats = isRevealed(gs, tc.id)
      ? t('panel.statsRevealed', {
          pop: tc.population.toLocaleString(), lev: tc.leveesBuilt,
          b: tc.stock.boat, k: tc.stock.kit, m: tc.morale })
      : t('panel.statsHidden', { pop: tc.population.toLocaleString() });
    let mayorLine = '';
    if (tc.id !== gs.playerMuniId && gs.relationship) {
      const mr = MAYORS[tc.id];
      mayorLine = t('panel.mayorLine', {
        name: mr.name, title: t(`mayor.${tc.id}.title`),
        rel: t(`rel.${relationshipLabel(gs.relationship[tc.id])}`) }) + '\n';
    }
    this.targetDetail.setText(`${mayorLine}${t(`trait.${tc.def.trait}.name`)}: ${t(`trait.${tc.def.trait}.desc`)}\n${stats}`);
    // Production dependency goes in the hint area (room to wrap) so it never
    // collides with the invest controls. The map's ⚙ tag is the always-on cue.
    this.defaultHint = PRODUCERS[tc.id]
      ? t(`prod.dep.${PRODUCERS[tc.id].res}`)
      : t('panel.investHintDefault');
    this.investHint.setText(this.defaultHint);

    // Favour: appears when the selected town is an ally you can call on.
    const showFav = canAskFavour(gs, tc.id);
    this.favourBtn.setVisible(showFav);
    if (showFav) {
      const surname = (MAYORS[tc.id].name.split(' ')[1] || 'ally');
      this.favourBtn.txt.setText(t('panel.favourBtn', {
        surname: surname.toUpperCase(), n: BALANCE.favour.boats, pc: BALANCE.favour.pcCost }));
    }

    // Once a meeting is held, the same button opens the flood PLANNING TABLE.
    this.meetingBtn.setEnabled((meetingAffordable(gs) || gs.meetingHeld) && !this.animating);
    this.meetingBtn.txt.setText(gs.meetingHeld ? t('meeting.viewTable') : t('meeting.call'));
    this.meetingStatus.setText(gs.meetingHeld ? t('meeting.held') : t('meeting.hidden'));
    this.meetingStatus.setColor(gs.meetingHeld ? '#7fd1a0' : COL.inkDim);

    // Invest buttons: affordable in budget AND (for cooperation) political capital.
    // Show the LIVE cost (with scarcity surcharge) and a second line that makes
    // the cost-vs-benefit concrete: a levee's prevented €damage at the selected
    // target, "saves lives" for boats/kits, or the scarcity reason in amber.
    const band = forecastBand(gs);
    const dmg = BALANCE.economic.damageBySeverity;
    const floodLikely = gs.round > 2 && band.high >= 1;
    this.cards.forEach((b) => {
      const key = b.invKey;
      const inv = INVESTMENTS[key];
      b.setEnabled(canInvest(gs, key, this.targetId));
      const cost = investmentCost(gs, key, gs.playerMuniId);
      const res = INVEST_RESOURCE[key];
      const scarce = res && gs.scarce[res];
      b.txt.setText(`${inv.icon}  ${t(`inv.${key}.name`)}   €${cost}M`);
      if (scarce) b.txt.setColor('#ffcf8b');
      if (scarce) {
        b.subTxt.setText(t('inv.scarce', { res: t(`res.${res}`) })).setColor('#ffcf8b');
      } else if (key === 'levee' && floodLikely) {
        const prevented = Math.round((EXPOSURE[this.targetId] || 0) * (dmg[band.high] - dmg[Math.max(0, band.high - 1)]));
        b.subTxt.setText(prevented > 0 ? t('inv.prevents', { n: prevented }) : '').setColor('#9fd9b4');
      } else if ((key === 'boat' || key === 'kit') && floodLikely) {
        b.subTxt.setText(t('inv.savesLives')).setColor('#9fd9b4');
      } else {
        b.subTxt.setText('');
      }
    });

    // Ledger line B — your held assets + capital + research, plus any scarcity.
    let assets = t('panel.assets', {
      lev: p.leveesBuilt, boat: p.stock.boat, kit: p.stock.kit,
      pc: gs.pc, max: BALANCE.politicalCapital, r: gs.research });
    const scarceBits = Object.keys(gs.scarce || {}).map((r) =>
      gs.scarce[r] === 'cut' ? t('panel.cut', { res: t(`res.${r}`) }) : t('panel.scarce', { res: t(`res.${r}`) }));
    if (scarceBits.length) assets += '     ' + scarceBits.join('  ');
    this.researchText.setText(assets).setColor(scarceBits.length ? '#ffcf8b' : '#9fb6d0');
    this.updateHand();
    this.updateProposal();
  }

  // --- little fx -------------------------------------------------------------
  euro(m) {
    if (!m || m < 1) return '€0';
    return m >= 1000 ? `€${(m / 1000).toFixed(1)}B` : `€${Math.round(m)}M`;
  }

  popText(x, y, str, color) {
    const t = this.add.text(x, y, str, { fontFamily: FONT, fontSize: '18px', color, fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  flashText(str) {
    if (this._flash) this._flash.destroy();
    this._flash = this.add.text(20, 604, str,
      { fontFamily: FONT, fontSize: '13px', color: '#7fd1a0' });
    this.tweens.add({ targets: this._flash, alpha: 0, delay: 1200, duration: 600 });
  }
}
