// =============================================================================
// Story-video overlay — plays the Fojtík interview pieces (DOM <video> above
// the canvas, language-aware, always skippable). Degrades gracefully: if the
// video file is absent (e.g. a deployment without assets/video/), the callback
// fires immediately and the game continues as if nothing happened.
//
//   playVideo('intro', () => …)              — always plays (menu button)
//   playVideoOnce('calm', () => …)           — plays once per browser, then never
// =============================================================================

import { getLang, t } from '../i18n.js';

const seenKey = (id) => `povoden_video_${id}`;

export function videoSeen(id) {
  try { return localStorage.getItem(seenKey(id)) === '1'; } catch (e) { return true; }
}
function markSeen(id) {
  try { localStorage.setItem(seenKey(id), '1'); } catch (e) { /* ignore */ }
}

export function playVideo(id, onDone) {
  const src = `assets/video/${id}_${getLang()}.mp4`;
  const old = document.getElementById('povoden-video-overlay');
  if (old) old.remove();

  const wrap = document.createElement('div');
  wrap.id = 'povoden-video-overlay';
  wrap.style.cssText =
    'position:fixed;inset:0;z-index:10000;background:#000;display:flex;' +
    'align-items:center;justify-content:center;';
  const video = document.createElement('video');
  video.src = src;
  video.playsInline = true;
  video.style.cssText = 'max-width:100vw;max-height:100vh;width:100%;outline:none;';
  const skip = document.createElement('button');
  skip.textContent = t('video.skip');
  skip.style.cssText =
    'position:absolute;top:18px;right:22px;padding:9px 20px;font-family:monospace;' +
    'font-size:13px;cursor:pointer;color:#e6eef7;background:rgba(17,26,44,.85);' +
    'border:1px solid #c9a24b;';

  // Playback-speed control (the interview is deliberately unhurried — let the
  // player decide). Cycles through rates; the choice persists across videos.
  const RATES = [1, 1.25, 1.5, 2];
  let rate = 1;
  try { rate = parseFloat(localStorage.getItem('povoden_video_rate')) || 1; } catch (e) { /* ignore */ }
  if (!RATES.includes(rate)) rate = 1;
  const speed = document.createElement('button');
  speed.style.cssText =
    'position:absolute;top:18px;right:132px;padding:9px 16px;font-family:monospace;' +
    'font-size:13px;cursor:pointer;color:#e6eef7;background:rgba(17,26,44,.85);' +
    'border:1px solid #3a5b8a;';
  const showRate = () => { speed.textContent = `${rate}×`; video.playbackRate = rate; };
  speed.onclick = () => {
    rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    try { localStorage.setItem('povoden_video_rate', String(rate)); } catch (e) { /* ignore */ }
    showRate();
  };
  showRate();

  wrap.append(video, speed, skip);
  document.body.append(wrap);

  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    markSeen(id);
    wrap.remove();
    onDone && onDone(true);
  };
  skip.onclick = done;
  video.onended = done;
  // File absent/unplayable → continue silently; callers may fall back to text.
  video.onerror = () => { finished = true; wrap.remove(); onDone && onDone(false); };
  wrap.onkeydown = (e) => { if (e.key === 'Escape') done(); };

  video.play().catch(() => {
    // Autoplay-with-sound blocked or unplayable → show a tap-to-play state.
    video.controls = true;
    const tryPlay = () => video.play().catch(() => {});
    video.onclick = tryPlay;
  });
}

/** Play the video only if this browser hasn't seen it yet; otherwise continue. */
export function playVideoOnce(id, onDone) {
  if (videoSeen(id)) { onDone && onDone(true); return; }
  playVideo(id, onDone);
}
