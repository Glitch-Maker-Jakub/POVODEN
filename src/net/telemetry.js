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
//   • Consent is revocable at any time from the menu; revoking stops all
//     sending AND deletes everything queued locally.
//   • Degrades silently when the research server is unreachable.
//
// Delivery guarantees (offline resilience):
//   • Events are batched into envelopes with a client-minted batchId, so the
//     server can deduplicate replays.
//   • Undelivered envelopes persist in localStorage (bounded) and are retried
//     on later flushes and on the next session — a reload no longer loses the
//     round's events.
//   • Retries are capped per envelope; a batch that keeps failing is dropped.
// =============================================================================

import { getLang } from '../i18n.js';
import { apiFetch } from './apiClient.js';

const uuid = () =>
  (globalThis.crypto?.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    }));

// --- storage helpers (every access guarded — no storage means telemetry off) --

const store = {
  get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  set(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* ignore */ } },
  remove(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } },
};

// --- consent -----------------------------------------------------------------
// 'yes' | 'no' | null (= never asked)
export function consentState() {
  try { return localStorage.getItem('povoden_research') || null; } catch (e) { return 'no'; }
}
export function setConsent(yes) {
  store.set('povoden_research', yes ? 'yes' : 'no');
  if (yes && !store.get('povoden_pid')) store.set('povoden_pid', uuid());
  if (!yes) {
    // Revocation stops future sending AND clears everything queued locally.
    queue = [];
    pending = [];
    store.remove(PENDING_KEY);
  }
}
export const telemetryOn = () => consentState() === 'yes';

export function participantId() {
  return store.get('povoden_pid') || '';
}

// --- campaign lifecycle --------------------------------------------------------

const PENDING_KEY = 'povoden_tq';   // persisted undelivered envelopes
const MAX_QUEUE = 300;              // in-memory raw events
const MAX_PENDING = 20;             // persisted envelopes
const MAX_ATTEMPTS = 5;             // per envelope, then dropped

let campaignId = null;
let campaignIndex = 0;
let queue = [];                     // raw events of the running campaign
let pending = loadPending();        // undelivered envelopes (this + past sessions)
let flushing = false;

function loadPending() {
  if (consentState() !== 'yes') return [];
  try {
    const parsed = JSON.parse(store.get(PENDING_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, MAX_PENDING) : [];
  } catch (e) { return []; }
}

function savePending() {
  if (pending.length) store.set(PENDING_KEY, JSON.stringify(pending.slice(0, MAX_PENDING)));
  else store.remove(PENDING_KEY);
}

/** Call at campaign start. Increments this participant's campaign counter. */
export function beginCampaign(town) {
  if (!telemetryOn()) return;
  campaignId = uuid();
  const stored = parseInt(store.get('povoden_campaigns') || '0', 10) || 0;
  campaignIndex = stored + 1;
  store.set('povoden_campaigns', String(campaignIndex));
  logEvent('campaign_start', { town });
}

/** Queue one event; flushes automatically in small batches. */
export function logEvent(type, payload = {}, round = null) {
  if (!telemetryOn() || !campaignId) return;
  queue.push({ type, round, payload });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  if (queue.length >= 12) flush();
}

/** Seal the current in-memory events into a persistent, retryable envelope. */
function sealEnvelope() {
  if (!queue.length || !campaignId) return;
  pending.push({
    batchId: uuid(),                 // server-side deduplication key
    participantId: participantId(),
    campaignId,
    campaignIndex,
    lang: getLang(),
    events: queue.splice(0, queue.length),
    attempts: 0,
  });
  if (pending.length > MAX_PENDING) pending = pending.slice(-MAX_PENDING);
  savePending();
}

/**
 * Send everything queued (current events + undelivered past envelopes).
 * Failures stay persisted for the next flush or the next session; an envelope
 * is dropped after MAX_ATTEMPTS. A delivered envelope is never re-sent.
 */
export async function flush(useBeacon = false) {
  if (!telemetryOn()) return;
  sealEnvelope();
  if (!pending.length || flushing) return;

  if (useBeacon && globalThis.navigator?.sendBeacon) {
    // Tab is closing: hand the whole backlog to the browser. sendBeacon only
    // promises queueing — keep envelopes persisted unless it accepts them;
    // the batchId lets the server drop any duplicate delivery.
    const accepted = pending.every((env) =>
      navigator.sendBeacon(`${(globalThis.POVODEN_API || '/api').replace(/\/$/, '')}/events`,
        new Blob([JSON.stringify(env)], { type: 'application/json' })));
    if (accepted) { pending = []; savePending(); }
    return;
  }

  flushing = true;
  try {
    const still = [];
    for (const env of pending) {
      const res = await apiFetch('/events', { method: 'POST', body: env });
      if (!res.ok) {
        env.attempts = (env.attempts || 0) + 1;
        if (env.attempts < MAX_ATTEMPTS) still.push(env); // else: give up on this batch
      }
    }
    pending = still;
    savePending();
  } finally {
    flushing = false;
  }
}

// Last-chance flush when the tab closes mid-campaign (browser only).
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => flush(true));
}
