-- Telemetry delivery idempotency + DB-level payload cap.
--
-- The game client (src/net/telemetry.js) retries undelivered envelopes and may
-- also hand them to navigator.sendBeacon on tab close — so the same batch can
-- legitimately arrive twice. Each envelope carries a client-minted batchId;
-- recording it here (primary key) inside the same transaction as the event
-- rows makes re-delivery a clean no-op instead of duplicate rows.

CREATE TABLE IF NOT EXISTS event_batches (
  batch_id   UUID        PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce the app-level payload cap in the database too: no row may carry a
-- payload bigger than the documented 2000 JSON characters.
ALTER TABLE events
  ADD CONSTRAINT events_payload_size
  CHECK (char_length(payload::text) <= 2000);
