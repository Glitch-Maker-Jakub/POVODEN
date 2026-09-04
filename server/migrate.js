// =============================================================================
// Versioned, transactional migrations.
//
//   node migrate.js            # apply every pending migration in order
//
// Files in migrations/ run in lexical order (001_…, 002_…); each applied file
// is recorded in schema_migrations, and each runs inside its own transaction,
// so a failing migration leaves the database exactly where it was. Rollback
// strategy: restore from backup / apply a new forward migration — documented
// in README.md.
// =============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { fromEnv } = require('./config.js');
const { createDb } = require('./db.js');
const log = require('./logger.js');

async function migrate(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT        PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const { rows } = await db.query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.name));

  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await db.transaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    });
    log.info('migration applied', { file });
    ran += 1;
  }
  return { ran, total: files.length };
}

module.exports = { migrate };

if (require.main === module) {
  const config = fromEnv();
  if (!config.databaseUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  const db = createDb(config.databaseUrl);
  migrate(db)
    .then(({ ran, total }) => {
      log.info('migrations up to date', { ran, total });
      return db.end();
    })
    .catch((e) => {
      log.error('migration failed', { error: e.message });
      process.exit(1);
    });
}
