// =============================================================================
// Scoreboard client — talks to the optional server/ API. Every call degrades
// gracefully: if the API is absent/unreachable the game keeps working and the
// UI shows an "offline" state instead of an error.
// =============================================================================

const API = () => (window.POVODEN_API || '/api').replace(/\/$/, '');

async function withTimeout(promise, ms = 6000) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

/** Fetch ranked entries for 'all' | 'month' | 'week'. Returns null when offline. */
export async function fetchScores(period = 'all', limit = 15) {
  try {
    const res = await withTimeout(fetch(`${API()}/scores?period=${period}&limit=${limit}`));
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.entries) ? data.entries : null;
  } catch (e) {
    return null;
  }
}

/** Submit a finished campaign. Returns {ok, rank:{all,month,week}} or null when offline. */
export async function submitScore(entry) {
  try {
    const res = await withTimeout(fetch(`${API()}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }));
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

/** Remember the player's display name between campaigns. */
export function savedName() {
  try { return localStorage.getItem('povoden_name') || ''; } catch (e) { return ''; }
}
export function rememberName(name) {
  try { localStorage.setItem('povoden_name', name); } catch (e) { /* ignore */ }
}

/**
 * A minimal DOM name-entry overlay (Phaser has no native text input). Calls
 * onDone(name) on confirm, onDone(null) on cancel. Styled to match the game.
 */
export function promptName(labelText, okText, cancelText, onDone) {
  const old = document.getElementById('povoden-name-overlay');
  if (old) old.remove();

  const wrap = document.createElement('div');
  wrap.id = 'povoden-name-overlay';
  wrap.style.cssText =
    'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;' +
    'background:rgba(4,8,16,.72);font-family:monospace;';
  const box = document.createElement('div');
  box.style.cssText =
    'background:#111a2c;border:2px solid #c9a24b;padding:22px 26px;min-width:320px;color:#e6eef7;';
  const label = document.createElement('div');
  label.textContent = labelText;
  label.style.cssText = 'margin-bottom:10px;font-size:14px;color:#e8c879;';
  const input = document.createElement('input');
  input.maxLength = 24;
  input.value = savedName();
  input.style.cssText =
    'width:100%;box-sizing:border-box;padding:8px;font-family:monospace;font-size:15px;' +
    'background:#0a1422;color:#e6eef7;border:1px solid #3a5b8a;outline:none;';
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:10px;margin-top:14px;justify-content:flex-end;';
  const mkBtn = (txt, bg) => {
    const b = document.createElement('button');
    b.textContent = txt;
    b.style.cssText =
      `padding:8px 18px;font-family:monospace;font-size:13px;cursor:pointer;border:none;color:#fff;background:${bg};`;
    return b;
  };
  const ok = mkBtn(okText, '#1f7a3d');
  const cancel = mkBtn(cancelText, '#4a4a5a');
  row.append(cancel, ok);
  box.append(label, input, row);
  wrap.append(box);
  document.body.append(wrap);
  input.focus();
  input.select();

  const finish = (val) => { wrap.remove(); onDone(val); };
  ok.onclick = () => {
    const name = input.value.trim().slice(0, 24);
    if (!name) { input.focus(); return; }
    rememberName(name);
    finish(name);
  };
  cancel.onclick = () => finish(null);
  input.onkeydown = (e) => {
    if (e.key === 'Enter') ok.onclick();
    if (e.key === 'Escape') cancel.onclick();
    e.stopPropagation(); // don't leak keys into the game
  };
}
