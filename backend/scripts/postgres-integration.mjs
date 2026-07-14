import pg from 'pg';
import { sampleProject } from '../packages/domain/dist/index.js';
import { PostgresProjectRepository } from '../apps/api/dist/repository.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const client = new pg.Client({ connectionString });
await client.connect();
try {
  const migrations = await client.query('SELECT version FROM schema_migrations ORDER BY version');
  if (!migrations.rows.some((row) => row.version === '002_sprint5_observability_and_drift.sql')) throw new Error('Sprint 5 migration is not applied');
  const tables = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('durable_events','runtime_inventories','architecture_drift_reports','architecture_policy_gate_results')`);
  if (tables.rowCount !== 4) throw new Error(`Expected four Sprint 5 tables, found ${tables.rowCount}`);
} finally { await client.end(); }
const repository = new PostgresProjectRepository(connectionString);
try {
  await repository.saveProject(sampleProject);
  const restored = await repository.getProject(sampleProject.tenantId, sampleProject.id, sampleProject.branch.id);
  if (!restored || restored.schemaVersion !== '0.8.0') throw new Error('PostgreSQL project round trip failed');
  console.log(JSON.stringify({ migrations: 'ok', tables: 'ok', projectRoundTrip: 'ok', schemaVersion: restored.schemaVersion }, null, 2));
} finally { await repository.close(); }
