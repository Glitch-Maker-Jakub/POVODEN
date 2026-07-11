// =============================================================================
// Structured logging — one JSON object per line, no request bodies, no
// telemetry payloads, no personal data. Fields are explicit at the call site
// so nothing sensitive can leak in by accident.
// =============================================================================

'use strict';

function line(level, msg, fields) {
  const entry = { ts: new Date().toISOString(), level, msg, ...fields };
  const out = JSON.stringify(entry);
  if (level === 'error') console.error(out);
  else console.log(out);
}

module.exports = {
  info: (msg, fields = {}) => line('info', msg, fields),
  error: (msg, fields = {}) => line('error', msg, fields),
};
