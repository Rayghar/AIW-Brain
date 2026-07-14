import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const client = new pg.Client({ connectionString, application_name: 'aiw-migrator' });
await client.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await client.query(`SELECT pg_advisory_lock(hashtext('aiw-schema-migrations'))`);
  const directory = resolve('database/migrations');
  const files = (await readdir(directory)).filter((file) => /^\d+.*\.sql$/.test(file)).sort();
  for (const file of files) {
    const applied = await client.query('SELECT 1 FROM schema_migrations WHERE version=$1', [file]);
    if (applied.rowCount) continue;
    const sql = await readFile(resolve(directory, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [file]);
      await client.query('COMMIT');
      console.log(`Applied ${file}`);
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  }
} finally {
  await client.query(`SELECT pg_advisory_unlock(hashtext('aiw-schema-migrations'))`).catch(() => undefined);
  await client.end();
}
