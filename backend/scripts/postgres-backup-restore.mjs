import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const source = new URL(connectionString);
const originalDatabase = source.pathname.slice(1);
const restoreDatabase = `${originalDatabase}_restore_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, '_');
const admin = new URL(connectionString); admin.pathname = '/postgres';
const restore = new URL(connectionString); restore.pathname = `/${restoreDatabase}`;
const temp = mkdtempSync(join(tmpdir(), 'aiw-backup-'));
const dumpPath = join(temp, 'aiw.dump');
const adminClient = new pg.Client({ connectionString: admin.toString() });
let adminConnected = false;
try {
  execFileSync('pg_dump', ['--format=custom', '--no-owner', '--file', dumpPath, connectionString], { stdio: 'inherit' });
  await adminClient.connect();
  adminConnected = true;
  await adminClient.query(`CREATE DATABASE "${restoreDatabase}"`);
  execFileSync('pg_restore', ['--no-owner', '--dbname', restore.toString(), dumpPath], { stdio: 'inherit' });
  const sourceClient = new pg.Client({ connectionString }); const restoreClient = new pg.Client({ connectionString: restore.toString() });
  await sourceClient.connect(); await restoreClient.connect();
  try {
    const sourceCount = await sourceClient.query('SELECT count(*)::int AS count FROM project_branch_documents');
    const restoreCount = await restoreClient.query('SELECT count(*)::int AS count FROM project_branch_documents');
    if (sourceCount.rows[0].count !== restoreCount.rows[0].count) throw new Error('Backup restore row count does not match');
    console.log(JSON.stringify({ backup: 'ok', restore: 'ok', projectDocuments: restoreCount.rows[0].count }, null, 2));
  } finally { await sourceClient.end(); await restoreClient.end(); }
} finally {
  if (adminConnected) await adminClient.query(`DROP DATABASE IF EXISTS "${restoreDatabase}" WITH (FORCE)`).catch(() => undefined);
  await adminClient.end().catch(() => undefined);
  rmSync(temp, { recursive: true, force: true });
}
