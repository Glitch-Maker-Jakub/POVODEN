// =============================================================================
// Windowed in-memory rate limiter with periodic cleanup.
//
// Keyed by req.ip — which express derives according to the `trust proxy`
// setting, so a spoofed x-forwarded-for header cannot bypass it unless the
// operator explicitly trusts that hop (TRUST_PROXY). Each write route gets its
// own bucket (score / events / erase) so telemetry bursts cannot starve score
// submissions and vice versa.
//
// Scope note: the store is per-process. For a multi-instance deployment put
// the limit at the shared reverse proxy, or back this with a shared store —
// documented in README.md; a single-process deploy (the supported default)
// needs neither.
// =============================================================================

'use strict';

function createRateLimiter({ limit, windowMs }, now = Date.now) {
  const hits = new Map(); // key -> [timestamps]

  // Periodic cleanup so idle keys do not accumulate forever. unref() keeps the
  // interval from holding the process open (tests, graceful shutdown).
  const janitor = setInterval(() => {
    const cutoff = now() - windowMs;
    for (const [key, times] of hits) {
      const alive = times.filter((t) => t > cutoff);
      if (alive.length) hits.set(key, alive);
      else hits.delete(key);
    }
  }, windowMs);
  if (janitor.unref) janitor.unref();

  function limited(key) {
    const cutoff = now() - windowMs;
    const alive = (hits.get(key) || []).filter((t) => t > cutoff);
    alive.push(now());
    hits.set(key, alive);
    return alive.length > limit;
  }

  /** Express middleware: 429 with a consistent body when over the limit. */
  const middleware = (req, res, next) => {
    if (limited(req.ip || 'unknown')) return res.status(429).json({ error: 'rate' });
    return next();
  };
  middleware.limited = limited;                    // exposed for tests
  middleware.stop = () => clearInterval(janitor);  // deterministic teardown
  return middleware;
}

module.exports = { createRateLimiter };
