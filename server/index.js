// =============================================================================
// POVODEŇ scoreboard server — process bootstrap.
// -----------------------------------------------------------------------------
// Wires the real environment together (config -> db -> app -> listen) and owns
// the process lifecycle: on SIGTERM/SIGINT the HTTP server stops accepting
// requests, in-flight requests finish, and the database pool closes cleanly.
// All request handling lives in app.js, which is importable and testable
// without touching this file, a port, or a real database.
//
//   ENV:  DATABASE_URL  postgres connection string (required)
//         PORT          listen port (default 3000)
//         CORS_ORIGINS  comma-separated origin allowlist ('*' to open; default same-origin)
//         TRUST_PROXY   proxy hops to trust for req.ip (default: none)
//         SERVE_STATIC  'false' to serve the API only (default: also serve the game)
//
// Part of POVODEŇ — GNU Affero General Public License v3.0 (see ../LICENSE).
// =============================================================================

'use strict';

const { fromEnv } = require('./config.js');
const { createDb } = require('./db.js');
const { createApp } = require('./app.js');
const log = require('./logger.js');

const config = fromEnv();
if (!config.databaseUrl) {
  console.error('DATABASE_URL is not set. Example:');
  console.error('  export DATABASE_URL=postgres://user:pass@localhost:5432/povoden');
  process.exit(1);
}

const db = createDb(config.databaseUrl);
const app = createApp({ db, config });

const server = app.listen(config.port, () => {
  log.info('listening', { port: config.port, static: config.serveStatic });
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info('shutdown initiated', { signal });
  app.locals.stopRateLimiters();
  server.close(async () => {
    try {
      await db.end();
      log.info('shutdown complete');
      process.exit(0);
    } catch (e) {
      log.error('shutdown error', { error: e.message });
      process.exit(1);
    }
  });
  // Failsafe: if connections refuse to drain, leave anyway.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
