// =============================================================================
// Scoreboard client — talks to the optional server/ API through the shared
// apiClient. Every call degrades gracefully: if the API is absent/unreachable
// the game keeps working and the UI shows an "offline" state instead of an
// error. Also imported by the standalone scoreboard.html page, so the game
// and the embeddable board share one contract.
// =============================================================================

import { apiFetch } from './apiClient.js';

/**
 * Fetch ranked entries for 'all' | 'month' | 'week'.
 * Returns { entries, error }: entries is an array on success and null on any
 * failure, with `error` carrying the normalised reason (NET_ERROR.*) so
 * callers can log/branch internally while showing one simple message.
 */
export async function fetchScores(period = 'all', limit = 15) {
  const res = await apiFetch(`/scores?period=${period}&limit=${limit}`);
  if (!res.ok) return { entries: null, error: res.error };
  if (!Array.isArray(res.data?.entries)) return { entries: null, error: 'bad_response' };
  return { entries: res.data.entries, error: null };
}

/** Submit a finished campaign. Returns {ok, rank:{all,month,week}} or null when offline. */
export async function submitScore(entry) {
  const res = await apiFetch('/score', { method: 'POST', body: entry });
  return res.ok ? res.data : null;
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
