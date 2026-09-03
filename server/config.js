// =============================================================================
// Configuration — the only module that reads the environment.
// =============================================================================

'use strict';

function parseTrustProxy(v) {
  if (!v || v === 'false') return false;      // default: trust the socket only
  if (v === 'true') return 1;                 // one reverse proxy in front
  const hops = parseInt(v, 10);
  return Number.isFinite(hops) ? hops : v;    // number of hops, or an express preset ('loopback', …)
}

function fromEnv(env = process.env) {
  return {
    port: parseInt(env.PORT || '3000', 10),
    databaseUrl: env.DATABASE_URL || '',
    // Comma-separated origin allowlist. Unset → NO cross-origin access
    // (same-origin only). '*' must be configured explicitly to open the API.
    corsOrigins: (env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
    // How many proxy hops to trust for req.ip. Without this, a spoofed
    // x-forwarded-for header cannot bypass rate limiting.
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    // Serve the static game from the repo root (one process hosts everything).
    serveStatic: env.SERVE_STATIC !== 'false',
    rate: {
      score: { limit: 10, windowMs: 60_000 },   // campaign submissions per IP
      events: { limit: 30, windowMs: 60_000 },  // telemetry envelopes per IP
      erase: { limit: 5, windowMs: 60_000 },    // GDPR deletions per IP
    },
  };
}

module.exports = { fromEnv };
