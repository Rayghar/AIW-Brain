import pg from 'pg';
import type { PlatformAcceptanceReport } from './platformAcceptance.js';

export interface PlatformAcceptanceEvidence {
  runId: string;
  tenantId: string;
  actorId: string;
  generatedAt: string;
  report: PlatformAcceptanceReport;
}

export interface PlatformAcceptanceRepository {
  save(evidence: PlatformAcceptanceEvidence): Promise<void>;
  list(tenantId: string, limit?: number): Promise<PlatformAcceptanceEvidence[]>;
  close(): Promise<void>;
}

export class MemoryPlatformAcceptanceRepository implements PlatformAcceptanceRepository {
  private readonly records: PlatformAcceptanceEvidence[] = [];
  async save(evidence: PlatformAcceptanceEvidence): Promise<void> {
    this.records.unshift(structuredClone(evidence));
    if (this.records.length > 100) this.records.length = 100;
  }
  async list(tenantId: string, limit = 20): Promise<PlatformAcceptanceEvidence[]> {
    return this.records.filter((record) => record.tenantId === tenantId).slice(0, Math.max(1, Math.min(100, limit))).map((record) => structuredClone(record));
  }
  async close(): Promise<void> {}
}

export class PostgresPlatformAcceptanceRepository implements PlatformAcceptanceRepository {
  private readonly pool: pg.Pool;
  constructor(connectionString = process.env.DATABASE_URL) {
    if (!connectionString) throw new Error('DATABASE_URL_REQUIRED');
    this.pool = new pg.Pool({ connectionString, max: Number(process.env.AIW_DB_POOL_MAX || 10), application_name: 'aiw-platform-acceptance' });
  }

  private async tenantClient<T>(tenantId: string, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('aiw.tenant_id', $1, true)`, [tenantId]);
      const value = await fn(client);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async save(evidence: PlatformAcceptanceEvidence): Promise<void> {
    await this.tenantClient(evidence.tenantId, async (client) => {
      await client.query(
        `INSERT INTO platform_acceptance_runs(tenant_id, run_id, actor_id, platform_version, environment, production_accepted, verified_count, configured_count, open_count, report, generated_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
         ON CONFLICT (tenant_id, run_id) DO UPDATE SET report=excluded.report, production_accepted=excluded.production_accepted, verified_count=excluded.verified_count, configured_count=excluded.configured_count, open_count=excluded.open_count`,
        [evidence.tenantId, evidence.runId, evidence.actorId, evidence.report.platformVersion, evidence.report.environment, evidence.report.productionAccepted, evidence.report.verified, evidence.report.configured, evidence.report.open, JSON.stringify(evidence.report), evidence.generatedAt],
      );
    });
  }

  async list(tenantId: string, limit = 20): Promise<PlatformAcceptanceEvidence[]> {
    return this.tenantClient(tenantId, async (client) => {
      const result = await client.query(
        `SELECT run_id, tenant_id, actor_id, generated_at, report
         FROM platform_acceptance_runs
         WHERE tenant_id=$1
         ORDER BY generated_at DESC
         LIMIT $2`,
        [tenantId, Math.max(1, Math.min(100, limit))],
      );
      return result.rows.map((row) => ({
        runId: String(row.run_id),
        tenantId: String(row.tenant_id),
        actorId: String(row.actor_id),
        generatedAt: new Date(row.generated_at).toISOString(),
        report: row.report as PlatformAcceptanceReport,
      }));
    });
  }

  async close(): Promise<void> { await this.pool.end(); }
}

export function createPlatformAcceptanceRepository(): PlatformAcceptanceRepository {
  return process.env.DATABASE_URL ? new PostgresPlatformAcceptanceRepository() : new MemoryPlatformAcceptanceRepository();
}
