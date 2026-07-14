import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { LlmRuntimePolicy } from '@aiw/domain';
import { LlmGateway, loadLlmRuntimePolicy } from './llmGateway.js';

interface StoredPolicies { version: '0.9.6' | '0.9.7' | '0.9.9' | '0.10.0-alpha.1' | '0.10.0-alpha.2' | '0.10.0-alpha.3' | '0.10.0-rc.1' | '0.10.0-rc.2'; tenants: Record<string, LlmRuntimePolicy> }

/**
 * Stores tenant model-routing policy in PostgreSQL when DATABASE_URL is present.
 * The file backend is retained for local/offline development and single-node demos.
 * Policies contain only provider metadata and environment-variable references, never secret values.
 */
export class LlmRuntimeConfigurationStore {
  private loaded = false;
  private policies = new Map<string, LlmRuntimePolicy>();
  private pool: import('pg').Pool | null = null;
  private readonly path = resolve(process.env.AIW_LLM_RUNTIME_CONFIG_PATH ?? 'config/llm-runtime-overrides.json');
  private readonly connectionString = process.env.DATABASE_URL;

  persistenceMode(): 'postgresql' | 'filesystem' { return this.connectionString ? 'postgresql' : 'filesystem'; }

  private async getPool(): Promise<import('pg').Pool> {
    if (this.pool) return this.pool;
    if (!this.connectionString) throw new Error('DATABASE_URL_NOT_CONFIGURED');
    const { Pool } = await import('pg');
    this.pool = new Pool({ connectionString: this.connectionString, max: Number(process.env.AIW_DB_POOL_MAX ?? 10), application_name: 'aiw-llm-runtime-policy' });
    return this.pool;
  }

  private async loadFile(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const parsed = JSON.parse(await readFile(this.path, 'utf8')) as StoredPolicies;
      for (const [tenantId, policy] of Object.entries(parsed.tenants ?? {})) this.policies.set(tenantId, policy);
    } catch { /* The environment policy remains authoritative until an override is saved. */ }
  }

  private async getPostgres(tenantId: string): Promise<LlmRuntimePolicy | null> {
    const client = await (await this.getPool()).connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('aiw.tenant_id', $1, true)`, [tenantId]);
      const result = await client.query(`SELECT policy FROM llm_runtime_policies WHERE tenant_id=$1`, [tenantId]);
      await client.query('COMMIT');
      return (result.rows[0]?.policy as LlmRuntimePolicy | undefined) ?? null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async get(tenantId: string): Promise<LlmRuntimePolicy> {
    if (this.connectionString) return structuredClone((await this.getPostgres(tenantId)) ?? loadLlmRuntimePolicy());
    await this.loadFile();
    return structuredClone(this.policies.get(tenantId) ?? loadLlmRuntimePolicy());
  }

  async set(tenantId: string, policy: LlmRuntimePolicy, updatedBy = 'system'): Promise<LlmRuntimePolicy> {
    const safe = structuredClone(policy);
    if (this.connectionString) {
      const client = await (await this.getPool()).connect();
      try {
        await client.query('BEGIN');
        await client.query(`SELECT set_config('aiw.tenant_id', $1, true)`, [tenantId]);
        await client.query(
          `INSERT INTO llm_runtime_policies(tenant_id,policy,updated_by,updated_at) VALUES($1,$2::jsonb,$3,now())
           ON CONFLICT(tenant_id) DO UPDATE SET policy=EXCLUDED.policy,updated_by=EXCLUDED.updated_by,updated_at=now()`,
          [tenantId, JSON.stringify(safe), updatedBy],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
      return structuredClone(safe);
    }

    await this.loadFile();
    this.policies.set(tenantId, safe);
    await mkdir(dirname(this.path), { recursive: true });
    const payload: StoredPolicies = { version: '0.10.0-rc.2', tenants: Object.fromEntries(this.policies) };
    await writeFile(this.path, `${JSON.stringify(payload, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    return structuredClone(safe);
  }

  async gateway(tenantId: string): Promise<LlmGateway> { return new LlmGateway(await this.get(tenantId)); }
  async close(): Promise<void> { if (this.pool) await this.pool.end(); }
}

export const llmRuntimeConfigurations = new LlmRuntimeConfigurationStore();
