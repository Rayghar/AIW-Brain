import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required for active backup/restore acceptance');
const evidencePath = resolve(process.env.AIW_BACKUP_RESTORE_EVIDENCE || 'release-evidence/rc10.58/backup-restore-evidence.json');
const source = new URL(connectionString); const originalDatabase = source.pathname.slice(1);
const restoreDatabase = `${originalDatabase}_restore_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, '_');
const admin = new URL(connectionString); admin.pathname = '/postgres';
const restore = new URL(connectionString); restore.pathname = `/${restoreDatabase}`;
const temp = mkdtempSync(join(tmpdir(), 'aiw-rc1058-backup-')); const dumpPath = join(temp, 'aiw.dump');
const adminClient = new pg.Client({ connectionString: admin.toString() }); let connected = false;
const evidence = { release: '0.10.0-rc.10.58.0', startedAt: new Date().toISOString(), sourceDatabase: originalDatabase, restoreDatabase, status: 'started' };
try {
  execFileSync('pg_dump', ['--format=custom', '--no-owner', '--file', dumpPath, connectionString], { stdio: 'inherit' });
  const dumpSha256 = createHash('sha256').update(readFileSync(dumpPath)).digest('hex');
  await adminClient.connect(); connected = true; await adminClient.query(`CREATE DATABASE "${restoreDatabase}"`);
  execFileSync('pg_restore', ['--no-owner', '--dbname', restore.toString(), dumpPath], { stdio: 'inherit' });
  const sourceClient = new pg.Client({ connectionString }); const restoreClient = new pg.Client({ connectionString: restore.toString() }); await sourceClient.connect(); await restoreClient.connect();
  try {
    const tables = ['project_branch_documents','production_jobs','evidence_objects','environment_promotions']; const rowCounts = {};
    for (const table of tables) { const exists = await sourceClient.query('SELECT to_regclass($1) AS table_name', [`public.${table}`]); if (!exists.rows[0]?.table_name) continue; const sourceCount = Number((await sourceClient.query(`SELECT count(*)::bigint AS count FROM ${table}`)).rows[0].count); const restoreCount = Number((await restoreClient.query(`SELECT count(*)::bigint AS count FROM ${table}`)).rows[0].count); if (sourceCount !== restoreCount) throw new Error(`BACKUP_RESTORE_ROW_COUNT_MISMATCH:${table}`); rowCounts[table] = restoreCount; }
    Object.assign(evidence, { status: 'verified', completedAt: new Date().toISOString(), dumpSha256, rowCounts });
  } finally { await sourceClient.end(); await restoreClient.end(); }
} catch (error) { Object.assign(evidence, { status: 'failed', completedAt: new Date().toISOString(), error: error instanceof Error ? error.stack ?? error.message : String(error) }); throw error; }
finally { if (connected) await adminClient.query(`DROP DATABASE IF EXISTS "${restoreDatabase}" WITH (FORCE)`).catch(() => undefined); await adminClient.end().catch(() => undefined); await mkdir(dirname(evidencePath), { recursive: true }); writeFileSync(evidencePath, JSON.stringify(evidence, null, 2)); rmSync(temp, { recursive: true, force: true }); console.log(JSON.stringify(evidence, null, 2)); }
