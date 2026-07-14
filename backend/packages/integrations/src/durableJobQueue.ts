import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export type ProductionJobStatus = 'queued' | 'leased' | 'retry-wait' | 'completed' | 'failed' | 'dead-letter' | 'cancelled';

export interface ProductionJob<T = Record<string, unknown>> {
  id: string;
  tenantId: string;
  queue: string;
  payload: T;
  status: ProductionJobStatus;
  attempts: number;
  maxAttempts: number;
  availableAt: string;
  createdAt: string;
  updatedAt: string;
  leasedBy?: string;
  leaseExpiresAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  lastError?: string;
  correlationId?: string;
}

export interface EnqueueJobInput<T = Record<string, unknown>> {
  tenantId: string;
  queue: string;
  payload: T;
  id?: string;
  maxAttempts?: number;
  availableAt?: string;
  correlationId?: string;
}

export interface JobQueueAdapter {
  enqueue<T extends Record<string, unknown>>(input: EnqueueJobInput<T>): Promise<ProductionJob<T>>;
  reserve(workerId: string, queues: string[], leaseMs: number): Promise<ProductionJob | undefined>;
  heartbeat(workerId: string, jobId: string, leaseMs: number): Promise<boolean>;
  complete(workerId: string, jobId: string): Promise<ProductionJob>;
  fail(workerId: string, jobId: string, error: string, baseBackoffMs?: number): Promise<ProductionJob>;
  cancel(tenantId: string, jobId: string): Promise<ProductionJob>;
  get(tenantId: string, jobId: string): Promise<ProductionJob | undefined>;
  list(tenantId: string, statuses?: ProductionJobStatus[]): Promise<ProductionJob[]>;
  requeueExpiredLeases(now?: Date): Promise<number>;
  health(): Promise<{ adapter: string; ready: boolean; durable: boolean; detail: string }>;
}

function iso(date = new Date()): string { return date.toISOString(); }
function parseTime(value?: string): number { return value ? Date.parse(value) : 0; }
function clone<T>(value: T): T { return structuredClone(value); }
function retryDelay(baseMs: number, attempts: number): number {
  const capped = Math.min(baseMs * 2 ** Math.max(0, attempts - 1), 15 * 60_000);
  const jitter = Math.floor(capped * 0.1 * ((attempts % 5) / 5));
  return capped + jitter;
}

export class InMemoryJobQueue implements JobQueueAdapter {
  protected jobs = new Map<string, ProductionJob>();

  async enqueue<T extends Record<string, unknown>>(input: EnqueueJobInput<T>): Promise<ProductionJob<T>> {
    const now = iso();
    const id = input.id ?? randomUUID();
    if (this.jobs.has(id)) return clone(this.jobs.get(id) as ProductionJob<T>);
    const job: ProductionJob<T> = {
      id,
      tenantId: input.tenantId,
      queue: input.queue,
      payload: clone(input.payload),
      status: 'queued',
      attempts: 0,
      maxAttempts: Math.max(1, input.maxAttempts ?? 5),
      availableAt: input.availableAt ?? now,
      createdAt: now,
      updatedAt: now,
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
    };
    this.jobs.set(id, job);
    await this.persist();
    return clone(job);
  }

  async reserve(workerId: string, queues: string[], leaseMs: number): Promise<ProductionJob | undefined> {
    await this.requeueExpiredLeases();
    const nowMs = Date.now();
    const job = [...this.jobs.values()]
      .filter((item) => queues.includes(item.queue) && ['queued', 'retry-wait'].includes(item.status) && parseTime(item.availableAt) <= nowMs)
      .sort((a, b) => parseTime(a.availableAt) - parseTime(b.availableAt) || parseTime(a.createdAt) - parseTime(b.createdAt))[0];
    if (!job) return undefined;
    job.status = 'leased';
    job.leasedBy = workerId;
    job.leaseExpiresAt = iso(new Date(nowMs + Math.max(1_000, leaseMs)));
    job.attempts += 1;
    job.updatedAt = iso();
    await this.persist();
    return clone(job);
  }

  async heartbeat(workerId: string, jobId: string, leaseMs: number): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'leased' || job.leasedBy !== workerId) return false;
    job.leaseExpiresAt = iso(new Date(Date.now() + Math.max(1_000, leaseMs)));
    job.updatedAt = iso();
    await this.persist();
    return true;
  }

  async complete(workerId: string, jobId: string): Promise<ProductionJob> {
    const job = this.requireLease(workerId, jobId);
    job.status = 'completed';
    job.completedAt = iso();
    job.updatedAt = job.completedAt;
    delete job.leasedBy;
    delete job.leaseExpiresAt;
    await this.persist();
    return clone(job);
  }

  async fail(workerId: string, jobId: string, error: string, baseBackoffMs = 1_000): Promise<ProductionJob> {
    const job = this.requireLease(workerId, jobId);
    job.lastError = error.slice(0, 8_000);
    job.updatedAt = iso();
    delete job.leasedBy;
    delete job.leaseExpiresAt;
    if (job.attempts >= job.maxAttempts) {
      job.status = 'dead-letter';
    } else {
      job.status = 'retry-wait';
      job.availableAt = iso(new Date(Date.now() + retryDelay(baseBackoffMs, job.attempts)));
    }
    await this.persist();
    return clone(job);
  }

  async cancel(tenantId: string, jobId: string): Promise<ProductionJob> {
    const job = this.jobs.get(jobId);
    if (!job || job.tenantId !== tenantId) throw new Error('JOB_NOT_FOUND');
    if (['completed', 'dead-letter'].includes(job.status)) throw new Error('JOB_TERMINAL');
    job.status = 'cancelled';
    job.cancelledAt = iso();
    job.updatedAt = job.cancelledAt;
    delete job.leasedBy;
    delete job.leaseExpiresAt;
    await this.persist();
    return clone(job);
  }

  async get(tenantId: string, jobId: string): Promise<ProductionJob | undefined> {
    const job = this.jobs.get(jobId);
    return job?.tenantId === tenantId ? clone(job) : undefined;
  }

  async list(tenantId: string, statuses?: ProductionJobStatus[]): Promise<ProductionJob[]> {
    return [...this.jobs.values()]
      .filter((job) => job.tenantId === tenantId && (!statuses?.length || statuses.includes(job.status)))
      .sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))
      .map(clone);
  }

  async requeueExpiredLeases(now = new Date()): Promise<number> {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'leased' && parseTime(job.leaseExpiresAt) <= now.getTime()) {
        delete job.leasedBy;
        delete job.leaseExpiresAt;
        job.status = job.attempts >= job.maxAttempts ? 'dead-letter' : 'retry-wait';
        job.availableAt = iso(now);
        job.updatedAt = iso(now);
        job.lastError = job.lastError || 'WORKER_LEASE_EXPIRED';
        count += 1;
      }
    }
    if (count) await this.persist();
    return count;
  }

  async health() { return { adapter: 'memory', ready: true, durable: false, detail: `${this.jobs.size} jobs` }; }
  protected async persist(): Promise<void> {}
  protected requireLease(workerId: string, jobId: string): ProductionJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('JOB_NOT_FOUND');
    if (job.status !== 'leased' || job.leasedBy !== workerId) throw new Error('JOB_LEASE_NOT_OWNED');
    return job;
  }
}

export class FileDurableJobQueue extends InMemoryJobQueue {
  private loaded = false;
  private writeChain: Promise<void> = Promise.resolve();
  constructor(private readonly filePath = process.env.AIW_JOB_QUEUE_FILE || resolve(process.cwd(), '.aiw-runtime/jobs.json')) { super(); }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as { jobs?: ProductionJob[] };
      this.jobs = new Map((parsed.jobs ?? []).map((job) => [job.id, job]));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  override async enqueue<T extends Record<string, unknown>>(input: EnqueueJobInput<T>): Promise<ProductionJob<T>> { await this.ensureLoaded(); return super.enqueue(input); }
  override async reserve(workerId: string, queues: string[], leaseMs: number): Promise<ProductionJob | undefined> { await this.ensureLoaded(); return super.reserve(workerId, queues, leaseMs); }
  override async heartbeat(workerId: string, jobId: string, leaseMs: number): Promise<boolean> { await this.ensureLoaded(); return super.heartbeat(workerId, jobId, leaseMs); }
  override async complete(workerId: string, jobId: string): Promise<ProductionJob> { await this.ensureLoaded(); return super.complete(workerId, jobId); }
  override async fail(workerId: string, jobId: string, error: string, baseBackoffMs?: number): Promise<ProductionJob> { await this.ensureLoaded(); return super.fail(workerId, jobId, error, baseBackoffMs); }
  override async cancel(tenantId: string, jobId: string): Promise<ProductionJob> { await this.ensureLoaded(); return super.cancel(tenantId, jobId); }
  override async get(tenantId: string, jobId: string): Promise<ProductionJob | undefined> { await this.ensureLoaded(); return super.get(tenantId, jobId); }
  override async list(tenantId: string, statuses?: ProductionJobStatus[]): Promise<ProductionJob[]> { await this.ensureLoaded(); return super.list(tenantId, statuses); }
  override async requeueExpiredLeases(now?: Date): Promise<number> { await this.ensureLoaded(); return super.requeueExpiredLeases(now); }
  override async health() {
    try { await this.ensureLoaded(); await this.persist(); return { adapter: 'file', ready: true, durable: true, detail: this.filePath }; }
    catch (error) { return { adapter: 'file', ready: false, durable: true, detail: error instanceof Error ? error.message : String(error) }; }
  }

  protected override async persist(): Promise<void> {
    const snapshot = JSON.stringify({ schemaVersion: 1, savedAt: iso(), jobs: [...this.jobs.values()] }, null, 2);
    this.writeChain = this.writeChain.then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true });
      const temp = `${this.filePath}.${process.pid}.tmp`;
      await writeFile(temp, snapshot, 'utf8');
      await rename(temp, this.filePath);
    });
    await this.writeChain;
  }
}

export interface PgQueryClient { query<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<{ rows: T[]; rowCount?: number | null }>; }

export class PostgresJobQueue implements JobQueueAdapter {
  constructor(private readonly db: PgQueryClient) {}
  async enqueue<T extends Record<string, unknown>>(input: EnqueueJobInput<T>): Promise<ProductionJob<T>> {
    const id = input.id ?? randomUUID();
    const result = await this.db.query<ProductionJob<T>>(`INSERT INTO production_jobs
      (id, tenant_id, queue_name, payload, status, attempts, max_attempts, available_at, correlation_id)
      VALUES ($1,$2,$3,$4::jsonb,'queued',0,$5,$6,$7)
      ON CONFLICT (id) DO UPDATE SET id=EXCLUDED.id
      RETURNING id, tenant_id AS "tenantId", queue_name AS queue, payload, status, attempts,
        max_attempts AS "maxAttempts", available_at AS "availableAt", created_at AS "createdAt", updated_at AS "updatedAt",
        leased_by AS "leasedBy", lease_expires_at AS "leaseExpiresAt", cancelled_at AS "cancelledAt", completed_at AS "completedAt",
        last_error AS "lastError", correlation_id AS "correlationId"`, [id, input.tenantId, input.queue, JSON.stringify(input.payload), input.maxAttempts ?? 5, input.availableAt ?? iso(), input.correlationId ?? null]);
    return result.rows[0]!;
  }
  async reserve(workerId: string, queues: string[], leaseMs: number): Promise<ProductionJob | undefined> {
    const result = await this.db.query<ProductionJob>(`WITH candidate AS (
      SELECT id FROM production_jobs
      WHERE queue_name = ANY($1::text[]) AND status IN ('queued','retry-wait') AND available_at <= NOW()
      ORDER BY available_at, created_at FOR UPDATE SKIP LOCKED LIMIT 1
    ) UPDATE production_jobs j SET status='leased', leased_by=$2, lease_expires_at=NOW()+($3::bigint * INTERVAL '1 millisecond'), attempts=attempts+1, updated_at=NOW()
      FROM candidate WHERE j.id=candidate.id
      RETURNING j.id, j.tenant_id AS "tenantId", j.queue_name AS queue, j.payload, j.status, j.attempts,
        j.max_attempts AS "maxAttempts", j.available_at AS "availableAt", j.created_at AS "createdAt", j.updated_at AS "updatedAt",
        j.leased_by AS "leasedBy", j.lease_expires_at AS "leaseExpiresAt", j.cancelled_at AS "cancelledAt", j.completed_at AS "completedAt",
        j.last_error AS "lastError", j.correlation_id AS "correlationId"`, [queues, workerId, leaseMs]);
    return result.rows[0];
  }
  async heartbeat(workerId: string, jobId: string, leaseMs: number): Promise<boolean> {
    const result = await this.db.query(`UPDATE production_jobs SET lease_expires_at=NOW()+($3::bigint * INTERVAL '1 millisecond'), updated_at=NOW() WHERE id=$1 AND leased_by=$2 AND status='leased'`, [jobId, workerId, leaseMs]);
    return (result.rowCount ?? 0) === 1;
  }
  private async transition(workerId: string, jobId: string, sql: string, values: unknown[] = []): Promise<ProductionJob> {
    const result = await this.db.query<ProductionJob>(`${sql} WHERE id=$1 AND leased_by=$2 AND status='leased' RETURNING id, tenant_id AS "tenantId", queue_name AS queue, payload, status, attempts, max_attempts AS "maxAttempts", available_at AS "availableAt", created_at AS "createdAt", updated_at AS "updatedAt", leased_by AS "leasedBy", lease_expires_at AS "leaseExpiresAt", cancelled_at AS "cancelledAt", completed_at AS "completedAt", last_error AS "lastError", correlation_id AS "correlationId"`, [jobId, workerId, ...values]);
    if (!result.rows[0]) throw new Error('JOB_LEASE_NOT_OWNED');
    return result.rows[0];
  }
  complete(workerId: string, jobId: string) { return this.transition(workerId, jobId, `UPDATE production_jobs SET status='completed', completed_at=NOW(), updated_at=NOW(), leased_by=NULL, lease_expires_at=NULL`); }
  async fail(workerId: string, jobId: string, error: string, baseBackoffMs = 1_000): Promise<ProductionJob> {
    return this.transition(workerId, jobId, `UPDATE production_jobs SET status=CASE WHEN attempts>=max_attempts THEN 'dead-letter' ELSE 'retry-wait' END, available_at=CASE WHEN attempts>=max_attempts THEN available_at ELSE NOW() + (($3::bigint * POWER(2, GREATEST(attempts-1,0))) * INTERVAL '1 millisecond') END, last_error=$4, updated_at=NOW(), leased_by=NULL, lease_expires_at=NULL`, [baseBackoffMs, error.slice(0, 8_000)]);
  }
  async cancel(tenantId: string, jobId: string): Promise<ProductionJob> {
    const result = await this.db.query<ProductionJob>(`UPDATE production_jobs SET status='cancelled', cancelled_at=NOW(), updated_at=NOW(), leased_by=NULL, lease_expires_at=NULL WHERE id=$1 AND tenant_id=$2 AND status NOT IN ('completed','dead-letter') RETURNING id, tenant_id AS "tenantId", queue_name AS queue, payload, status, attempts, max_attempts AS "maxAttempts", available_at AS "availableAt", created_at AS "createdAt", updated_at AS "updatedAt", cancelled_at AS "cancelledAt", completed_at AS "completedAt", last_error AS "lastError", correlation_id AS "correlationId"`, [jobId, tenantId]);
    if (!result.rows[0]) throw new Error('JOB_NOT_FOUND_OR_TERMINAL'); return result.rows[0];
  }
  async get(tenantId: string, jobId: string): Promise<ProductionJob | undefined> { const r = await this.db.query<ProductionJob>(`SELECT id, tenant_id AS "tenantId", queue_name AS queue, payload, status, attempts, max_attempts AS "maxAttempts", available_at AS "availableAt", created_at AS "createdAt", updated_at AS "updatedAt", leased_by AS "leasedBy", lease_expires_at AS "leaseExpiresAt", cancelled_at AS "cancelledAt", completed_at AS "completedAt", last_error AS "lastError", correlation_id AS "correlationId" FROM production_jobs WHERE id=$1 AND tenant_id=$2`, [jobId, tenantId]); return r.rows[0]; }
  async list(tenantId: string, statuses?: ProductionJobStatus[]): Promise<ProductionJob[]> { const r = await this.db.query<ProductionJob>(`SELECT id, tenant_id AS "tenantId", queue_name AS queue, payload, status, attempts, max_attempts AS "maxAttempts", available_at AS "availableAt", created_at AS "createdAt", updated_at AS "updatedAt", leased_by AS "leasedBy", lease_expires_at AS "leaseExpiresAt", cancelled_at AS "cancelledAt", completed_at AS "completedAt", last_error AS "lastError", correlation_id AS "correlationId" FROM production_jobs WHERE tenant_id=$1 AND ($2::text[] IS NULL OR status=ANY($2::text[])) ORDER BY created_at DESC`, [tenantId, statuses?.length ? statuses : null]); return r.rows; }
  async requeueExpiredLeases(): Promise<number> { const r = await this.db.query(`UPDATE production_jobs SET status=CASE WHEN attempts>=max_attempts THEN 'dead-letter' ELSE 'retry-wait' END, available_at=NOW(), leased_by=NULL, lease_expires_at=NULL, last_error=COALESCE(last_error,'WORKER_LEASE_EXPIRED'), updated_at=NOW() WHERE status='leased' AND lease_expires_at<NOW()`); return r.rowCount ?? 0; }
  async health() { try { await this.db.query('SELECT 1 FROM production_jobs LIMIT 1'); return { adapter: 'postgres', ready: true, durable: true, detail: 'production_jobs available' }; } catch (error) { return { adapter: 'postgres', ready: false, durable: true, detail: error instanceof Error ? error.message : String(error) }; } }
}
