// =============================================================================
// Research telemetry — STRICTLY OPT-IN behavioral logging for the RUR study.
// -----------------------------------------------------------------------------
// Purpose: a longitudinal record of player DECISIONS (invest own-vs-neighbour,
// deals kept/broken, meetings, favours, forecast use) and per-round OUTCOMES,
// keyed by a pseudonymous participant ID and a per-participant campaign index
// (1st, 2nd, 3rd campaign…) — the axis on which behavior change (e.g. a rising
// cooperation ratio) can be measured for scientific analysis.
//
// Privacy by design:
//   • OFF until the player explicitly consents (dialog on first campaign).
//   • participantId = random UUID minted in the browser; no personal data.
//   • The ID is shown to the participant so they can request erasure
//     (DELETE /api/participant/:id on the server).
//   • Consent is revocable at any time from the menu; revoking stops logging.
//   • Degrades silently when the research server is unreachable.
// =============================================================================

import { getLang } from '../i18n.js';

const API = () => (window.POVODEN_API || '/api').replace(/\/$/, '');

const uuid = () =>
  (crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    }));

// --- consent -----------------------------------------------------------------
// 'yes' | 'no' | null (= never asked)
export function consentState() {
  try { return localStorage.getItem('povoden_research') || null; } catch (e) { return 'no'; }
}
export function setConsent(yes) {
  try {
    localStorage.setItem('povoden_research', yes ? 'yes' : 'no');
    if (yes && !localStorage.getItem('povoden_pid')) {
      localStorage.setItem('povoden_pid', uuid());
    }
  } catch (e) { /* no storage → stays off */ }
}
export const telemetryOn = () => consentState() === 'yes';

export function participantId() {
  try { return localStorage.getItem('povoden_pid') || ''; } catch (e) { return ''; }
}

// --- campaign lifecycle --------------------------------------------------------
let campaignId = null;
let campaignIndex = 0;
let queue = [];

/** Call at campaign start. Increments this participant's campaign counter. */
export function beginCampaign(town) {
  if (!telemetryOn()) return;
  campaignId = uuid();
  try {
    campaignIndex = (parseInt(localStorage.getItem('povoden_campaigns') || '0', 10) || 0) + 1;
    localStorage.setItem('povoden_campaigns', String(campaignIndex));
  } catch (e) { campaignIndex = 1; }
  logEvent('campaign_start', { town });
}

/** Queue one event; flushes automatically in small batches. */
export function logEvent(type, payload = {}, round = null) {
  if (!telemetryOn() || !campaignId) return;
  queue.push({ type, round, payload });
  if (queue.length >= 12) flush();
}

/** Send everything queued. Fire-and-forget; failures re-queue (capped). */
export async function flush(useBeacon = false) {
  if (!queue.length || !telemetryOn() || !campaignId) return;
  const batch = queue.splice(0, 100);
  const body = JSON.stringify({
    participantId: participantId(),
    campaignId, campaignIndex, lang: getLang(),
    events: batch,
  });
  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(`${API()}/events`, new Blob([body], { type: 'application/json' }));
      return;
    }
    const res = await fetch(`${API()}/events`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
    });
    if (!res.ok) throw new Error(String(res.status));
  } catch (e) {
    // Offline / no research server: silently re-queue (bounded) and move on.
    queue = batch.concat(queue).slice(0, 300);
  }
}

// Last-chance flush when the tab closes mid-campaign.
window.addEventListener('beforeunload', () => flush(true));
