// =============================================================================
// Database layer — owns the pg pool and its lifecycle. The app receives this
// object injected (createApp({ db })), so API tests can pass a stub instead
// of a live PostgreSQL.
// =============================================================================

'use strict';

const { Pool } = require('pg');

function createDb(databaseUrl) {
  const pool = new Pool({ connectionString: databaseUrl });

  return {
    query: (text, params) => pool.query(text, params),

    /** Run `fn(client)` inside a transaction; rolls back on any throw. */
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    },

    /** Graceful shutdown: drain and close every connection. */
    end: () => pool.end(),
  };
}

module.exports = { createDb };
