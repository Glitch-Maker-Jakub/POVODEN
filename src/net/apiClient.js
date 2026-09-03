// =============================================================================
// Shared API client — the ONE place that knows how to talk to the optional
// server. Everything network-shaped goes through apiFetch(): one source of the
// base URL, a real AbortController timeout (the request is actually cancelled
// and the timer cleared), safe JSON parsing, and normalised error states so
// callers can distinguish offline / timeout / server error / bad payload
// internally while showing the player one simple localised message.
//
// No DOM, no Phaser, no storage — importable headless, tested with a mocked
// fetch in tests/net.test.js. Used by the in-game scoreboard, the research
// telemetry and the standalone scoreboard.html page.
// =============================================================================

/** Single source of the API base URL (strips a trailing slash). */
export const apiBase = () => (globalThis.POVODEN_API || '/api').replace(/\/$/, '');

export const NET_ERROR = {
  OFFLINE: 'offline',        // fetch rejected — no network / server down / CORS
  TIMEOUT: 'timeout',        // aborted by our deadline
  SERVER: 'server',          // HTTP status outside 2xx
  BAD_RESPONSE: 'bad_response', // 2xx but the body was not valid JSON
};

/**
 * Fetch `${apiBase()}${path}` and normalise the outcome:
 *   { ok: true,  data }                          on success
 *   { ok: false, error: NET_ERROR.*, status? }   on any failure
 * Never throws. The timeout aborts the underlying request and the timer is
 * always cleared, however the call ends.
 */
export async function apiFetch(path, { method = 'GET', body, timeoutMs = 6000, fetchImpl } = {}) {
  const doFetch = fetchImpl || ((...args) => globalThis.fetch(...args));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await doFetch(`${apiBase()}${path}`, {
      method,
      signal: ctrl.signal,
      headers: body != null ? { 'Content-Type': 'application/json' } : undefined,
      body: body != null ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return { ok: false, error: NET_ERROR.SERVER, status: res.status };
    try {
      return { ok: true, data: await res.json() };
    } catch (e) {
      return { ok: false, error: NET_ERROR.BAD_RESPONSE };
    }
  } catch (e) {
    return { ok: false, error: ctrl.signal.aborted ? NET_ERROR.TIMEOUT : NET_ERROR.OFFLINE };
  } finally {
    clearTimeout(timer);
  }
}
