// =============================================================================
// Procedural sound effects via the Web Audio API.
// No audio files — everything is synthesised, so the game stays a self-contained
// static site. The AudioContext is created lazily and resumed on first user
// gesture (browser autoplay policy).
// =============================================================================

let ctx = null;
let enabled = true;

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, { type = 'sine', gain = 0.12, slideTo = null, delay = 0 } = {}) {
  const c = ac();
  if (!c || !enabled) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function chord(freqs, dur, opts = {}) {
  freqs.forEach((f, i) => tone(f, dur, { ...opts, delay: i * 0.04 }));
}

// Filtered noise burst for the flood (a watery rush whose intensity = severity).
function rush(severity = 2) {
  const c = ac();
  if (!c || !enabled) return;
  const dur = 0.5 + severity * 0.12;
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const env = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * env * env;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(300 + severity * 220, c.currentTime);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.06 + severity * 0.03, c.currentTime + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start();
}

export const sfx = {
  setEnabled(v) { enabled = v; },
  resume() { ac(); },
  click() { tone(420, 0.05, { type: 'square', gain: 0.05 }); },
  invest() { tone(620, 0.08, { type: 'triangle', gain: 0.08, slideTo: 740 }); },
  card() { tone(500, 0.12, { type: 'sawtooth', gain: 0.06, slideTo: 760 }); },
  meeting() { chord([392, 523], 0.18, { type: 'sine', gain: 0.06 }); },
  deal() { chord([523, 659, 784], 0.2, { type: 'triangle', gain: 0.06 }); },
  good() { chord([523, 659, 784, 1047], 0.3, { type: 'sine', gain: 0.06 }); },
  bad() { tone(150, 0.45, { type: 'sawtooth', gain: 0.12, slideTo: 70 }); },
  flood(severity) { rush(severity); },
};
