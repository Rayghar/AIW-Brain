import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { FileDurableJobQueue, InMemoryJobQueue, PostgresJobQueue, type JobQueueAdapter, type ProductionJob, type RepositorySourceAdapter, GitHubAppRepositoryAdapter, GitLabRepositoryAdapter, AzureDevOpsRepositoryAdapter } from '@aiw/integrations';
import type { WorkerQueueName } from './queues/queueTypes.js';

export interface WorkerExecutionContext {
  workerId: string;
  signal: AbortSignal;
  heartbeat(): Promise<void>;
}
export type ProductionJobHandler = (job: ProductionJob, context: WorkerExecutionContext) => Promise<void>;
export type ProductionJobHandlers = Partial<Record<WorkerQueueName, ProductionJobHandler>>;

export interface ScheduledProductionJob {
  id: string;
  tenantId: string;
  queue: WorkerQueueName;
  payload: Record<string, unknown>;
  everyMs: number;
  maxAttempts?: number;
}

export interface ProductionWorkerOptions {
  queue: JobQueueAdapter;
  handlers?: ProductionJobHandlers;
  workerId?: string;
  queues?: WorkerQueueName[];
  leaseMs?: number;
  pollMs?: number;
  heartbeatMs?: number;
  heartbeatFile?: string;
  schedules?: ScheduledProductionJob[];
  scheduleTickMs?: number;
}

const DEFAULT_QUEUES: WorkerQueueName[] = ['knowledge-source-refresh', 'claim-extraction', 'repository-scan', 'conformance-evidence-ingestion', 'knowledge-release-validation', 'telemetry-ingestion', 'mind-factory-orchestration', 'knowledge-pack-activation', 'evidence-expiry', 'environment-promotion-validation', 'backup-restore-acceptance'];
const delay = (ms: number, signal?: AbortSignal) => new Promise<void>((resolveDelay) => { const timer = setTimeout(resolveDelay, ms); signal?.addEventListener('abort', () => { clearTimeout(timer); resolveDelay(); }, { once: true }); });

function environmentSecret(name: string): string | undefined {
  const direct = process.env[name];
  if (direct?.trim()) return direct;
  const file = process.env[`${name}_FILE`];
  if (!file?.trim()) return undefined;
  return readFileSync(file, 'utf8').trim();
}

function configuredRepositoryAdapter(): RepositorySourceAdapter | undefined {
  const provider = process.env.AIW_REPOSITORY_PROVIDER;
  const githubPrivateKey = environmentSecret('GITHUB_APP_PRIVATE_KEY');
  const gitlabToken = environmentSecret('GITLAB_TOKEN');
  const azurePat = environmentSecret('AZURE_DEVOPS_PAT');
  if (provider === 'github' && process.env.GITHUB_APP_ID && process.env.GITHUB_APP_INSTALLATION_ID && githubPrivateKey) return new GitHubAppRepositoryAdapter({ appId: process.env.GITHUB_APP_ID, installationId: process.env.GITHUB_APP_INSTALLATION_ID, privateKeyPem: githubPrivateKey.replace(/\\n/g, '\n'), ...(process.env.GITHUB_API_BASE ? { apiBase: process.env.GITHUB_API_BASE } : {}) });
  if (provider === 'gitlab' && gitlabToken) return new GitLabRepositoryAdapter({ token: gitlabToken, ...(process.env.GITLAB_API_BASE ? { apiBase: process.env.GITLAB_API_BASE } : {}) });
  if (provider === 'azure-devops' && process.env.AZURE_DEVOPS_ORGANIZATION && process.env.AZURE_DEVOPS_PROJECT && azurePat) return new AzureDevOpsRepositoryAdapter({ organization: process.env.AZURE_DEVOPS_ORGANIZATION, project: process.env.AZURE_DEVOPS_PROJECT, pat: azurePat, ...(process.env.AZURE_DEVOPS_API_BASE ? { apiBase: process.env.AZURE_DEVOPS_API_BASE } : {}) });
  return undefined;
}

function configuredSchedules(): ScheduledProductionJob[] {
  const raw = process.env.AIW_SCHEDULED_JOBS_JSON;
  if (!raw?.trim()) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error('AIW_SCHEDULED_JOBS_JSON_MUST_BE_ARRAY');
  return parsed.map((item, index) => {
    const schedule = item as Partial<ScheduledProductionJob>;
    if (!schedule.id || !schedule.tenantId || !schedule.queue || !schedule.payload || !Number.isFinite(schedule.everyMs) || Number(schedule.everyMs) < 1_000) {
      throw new Error(`INVALID_SCHEDULED_JOB:${index}`);
    }
    if (!DEFAULT_QUEUES.includes(schedule.queue)) throw new Error(`UNSUPPORTED_SCHEDULE_QUEUE:${schedule.queue}`);
    return { id: schedule.id, tenantId: schedule.tenantId, queue: schedule.queue, payload: schedule.payload, everyMs: Number(schedule.everyMs), ...(schedule.maxAttempts ? { maxAttempts: schedule.maxAttempts } : {}) };
  });
}

function defaultHandlers(): ProductionJobHandlers {
  return {
    'knowledge-source-refresh': async (job) => {
      const adapter = configuredRepositoryAdapter();
      if (!adapter) throw new Error('REPOSITORY_ADAPTER_NOT_CONFIGURED');
      const payload = job.payload as { repository?: string; ref?: string; allowedPaths?: string[]; evidenceFile?: string };
      if (!payload.repository) throw new Error('REPOSITORY_REQUIRED');
      const snapshot = await adapter.snapshot(payload.repository, payload.ref, payload.allowedPaths ?? []);
      if (payload.evidenceFile) { await mkdir(dirname(payload.evidenceFile), { recursive: true }); await writeFile(payload.evidenceFile, JSON.stringify(snapshot, null, 2)); }
    },
    'repository-scan': async (job) => {
      const output = process.env.AIW_WORKER_AUDIT_FILE || resolve(process.cwd(), '.aiw-runtime/worker-audit.jsonl');
      await mkdir(dirname(output), { recursive: true });
      await appendFile(output, `${JSON.stringify({ at: new Date().toISOString(), event: 'repository-scan', jobId: job.id, tenantId: job.tenantId, payload: job.payload })}\n`);
    },
    'claim-extraction': async (job) => {
      if (!(job.payload as { pinnedKnowledgeReleaseId?: string }).pinnedKnowledgeReleaseId) throw new Error('PINNED_KNOWLEDGE_RELEASE_REQUIRED');
    },
    'knowledge-release-validation': async (job) => {
      if (!(job.payload as { releaseId?: string }).releaseId) throw new Error('RELEASE_ID_REQUIRED');
    },
    'knowledge-pack-activation': async (job) => {
      const payload = job.payload as { blockers?: string[]; releaseId?: string };
      if (!payload.releaseId) throw new Error('RELEASE_ID_REQUIRED');
      if (payload.blockers?.length) throw new Error(`ACTIVATION_BLOCKED:${payload.blockers.join(',')}`);
    },
    'environment-promotion-validation': async (job) => {
      const payload = job.payload as { target?: string; blockers?: string[]; pinnedKnowledgeReleaseId?: string };
      if (payload.target === 'production' && payload.blockers?.length) throw new Error(`PRODUCTION_PROMOTION_BLOCKED:${payload.blockers.join(',')}`);
      if (payload.target === 'production' && !payload.pinnedKnowledgeReleaseId) throw new Error('PINNED_KNOWLEDGE_RELEASE_REQUIRED');
    },
    'evidence-expiry': async () => undefined,
    'backup-restore-acceptance': async (job) => {
      if (!(job.payload as { backupId?: string }).backupId) throw new Error('BACKUP_ID_REQUIRED');
    },
    'conformance-evidence-ingestion': async () => undefined,
    'telemetry-ingestion': async () => undefined,
    'mind-factory-orchestration': async () => undefined,
  };
}

export class ProductionMindFactoryWorker {
  readonly workerId: string;
  private readonly queue: JobQueueAdapter;
  private readonly handlers: ProductionJobHandlers;
  private readonly queues: WorkerQueueName[];
  private readonly leaseMs: number;
  private readonly pollMs: number;
  private readonly heartbeatMs: number;
  private readonly heartbeatFile: string;
  private readonly schedules: ScheduledProductionJob[];
  private readonly scheduleTickMs: number;
  private readonly scheduledSlots = new Map<string, number>();
  private controller: AbortController | undefined;
  private activeJobId: string | undefined;

  constructor(options: ProductionWorkerOptions) {
    this.queue = options.queue;
    this.handlers = { ...defaultHandlers(), ...options.handlers };
    this.workerId = options.workerId ?? `aiw-worker-${process.pid}-${randomUUID().slice(0, 8)}`;
    this.queues = options.queues ?? DEFAULT_QUEUES;
    this.leaseMs = options.leaseMs ?? 30_000;
    this.pollMs = options.pollMs ?? 1_000;
    this.heartbeatMs = options.heartbeatMs ?? 5_000;
    this.heartbeatFile = options.heartbeatFile ?? process.env.AIW_WORKER_HEARTBEAT_FILE ?? resolve(process.cwd(), '.aiw-runtime/worker-heartbeat.json');
    this.schedules = options.schedules ?? configuredSchedules();
    this.scheduleTickMs = options.scheduleTickMs ?? Number(process.env.AIW_SCHEDULE_TICK_MS || 30_000);
  }

  async start(): Promise<void> {
    if (this.controller) throw new Error('WORKER_ALREADY_RUNNING');
    this.controller = new AbortController();
    const signal = this.controller.signal;
    const heartbeatTimer = setInterval(() => void this.writeHeartbeat('running'), this.heartbeatMs);
    heartbeatTimer.unref();
    const scheduleTimer = setInterval(() => void this.enqueueDueSchedules(), Math.max(250, this.scheduleTickMs));
    scheduleTimer.unref();
    await this.writeHeartbeat('starting');
    await this.enqueueDueSchedules();
    try {
      while (!signal.aborted) {
        await this.queue.requeueExpiredLeases();
        const job = await this.queue.reserve(this.workerId, this.queues, this.leaseMs);
        if (!job) { await delay(this.pollMs, signal); continue; }
        this.activeJobId = job.id;
        const handler = this.handlers[job.queue as WorkerQueueName];
        try {
          if (!handler) throw new Error(`NO_JOB_HANDLER:${job.queue}`);
          await handler(job, { workerId: this.workerId, signal, heartbeat: () => this.queue.heartbeat(this.workerId, job.id, this.leaseMs).then(() => undefined) });
          await this.queue.complete(this.workerId, job.id);
        } catch (error) {
          await this.queue.fail(this.workerId, job.id, error instanceof Error ? error.stack ?? error.message : String(error), Number(process.env.AIW_WORKER_BACKOFF_MS || 1_000));
        } finally { this.activeJobId = undefined; }
      }
    } finally {
      clearInterval(heartbeatTimer);
      clearInterval(scheduleTimer);
      await this.writeHeartbeat('stopped');
      this.controller = undefined;
    }
  }


  private async enqueueDueSchedules(now = Date.now()): Promise<void> {
    for (const schedule of this.schedules) {
      const slot = Math.floor(now / schedule.everyMs);
      if (this.scheduledSlots.get(schedule.id) === slot) continue;
      this.scheduledSlots.set(schedule.id, slot);
      await this.queue.enqueue({
        id: `schedule:${schedule.id}:${slot}`,
        tenantId: schedule.tenantId,
        queue: schedule.queue,
        payload: { ...schedule.payload, scheduledBy: schedule.id, scheduledAt: new Date(now).toISOString() },
        maxAttempts: schedule.maxAttempts ?? 5,
        correlationId: `schedule:${schedule.id}`,
      });
    }
  }

  stop(): void { this.controller?.abort(); }
  private async writeHeartbeat(status: 'starting' | 'running' | 'stopped'): Promise<void> {
    await mkdir(dirname(this.heartbeatFile), { recursive: true });
    await writeFile(this.heartbeatFile, JSON.stringify({ service: 'aiw-worker', release: '0.10.0-rc.10.58.0', workerId: this.workerId, status, activeJobId: this.activeJobId ?? null, queues: this.queues, at: new Date().toISOString() }, null, 2));
    if (this.activeJobId && status === 'running') await this.queue.heartbeat(this.workerId, this.activeJobId, this.leaseMs);
  }
}

export async function createProductionJobQueue(): Promise<JobQueueAdapter> {
  const adapter = process.env.AIW_JOB_QUEUE_ADAPTER || (process.env.NODE_ENV === 'production' ? 'postgres' : 'file');
  if (adapter === 'memory') return new InMemoryJobQueue();
  if (adapter === 'file') return new FileDurableJobQueue();
  if (adapter === 'postgres') {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_REQUIRED_FOR_PRODUCTION_JOB_QUEUE');
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'disable' ? false : process.env.PGSSL === 'require' ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' } : undefined });
    return new PostgresJobQueue(pool);
  }
  throw new Error(`UNSUPPORTED_JOB_QUEUE_ADAPTER:${adapter}`);
}
