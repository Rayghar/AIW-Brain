import { createHash, randomUUID } from 'node:crypto';
import type {
  ArchitectureBrainProposalReceipt,
  ArchitectureBrainTransaction,
  ArchitectureBrainTransactionEvent,
  ArchitectureBrainTransactionEventType,
  ArchitectureBrainTransactionStatus,
  ArchitectureBrainTransactionSummary,
  ArchitectureRuleWaiver,
} from '@aiw/domain';
import { databaseProvider, mongodbDbName, mongodbUri } from './databaseMode.js';

export class BrainTransactionNotFound extends Error {
  constructor() { super('BRAIN_TRANSACTION_NOT_FOUND'); }
}

export class BrainTransactionVersionConflict extends Error {
  constructor(public readonly currentVersion: number) { super('BRAIN_TRANSACTION_VERSION_CONFLICT'); }
}

export class BrainTransactionTransitionError extends Error {
  constructor(code: string) { super(code); }
}

export interface RecordBrainProposalInput {
  tenantId: string;
  actorId: string;
  actorRoles: string[];
  correlationId: string;
  receipt: ArchitectureBrainProposalReceipt;
  summary: ArchitectureBrainTransactionSummary;
}

export interface AppendBrainTransactionEventInput {
  tenantId: string;
  transactionId: string;
  expectedVersion: number;
  type: Exclude<ArchitectureBrainTransactionEventType, 'proposal-recorded'>;
  actorId: string;
  actorRoles: string[];
  rationale?: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
}

export interface CreateArchitectureRuleWaiverInput {
  tenantId: string;
  projectId: string;
  branchId: string;
  transactionId?: string;
  findingId: string;
  ruleId: string;
  scopeRef?: string;
  reason: string;
  compensatingControls: string[];
  evidenceRefs: string[];
  ownerId: string;
  approvedBy: string;
  expiresAt: string;
  createdAt?: string;
}

export interface RevokeArchitectureRuleWaiverInput {
  tenantId: string;
  waiverId: string;
  revokedBy: string;
  reason: string;
  revokedAt?: string;
}

export interface BrainTransactionRepository {
  recordProposal(input: RecordBrainProposalInput): Promise<ArchitectureBrainTransaction>;
  getTransaction(tenantId: string, transactionId: string): Promise<ArchitectureBrainTransaction | null>;
  listTransactions(tenantId: string, projectId: string, branchId: string, limit?: number): Promise<ArchitectureBrainTransaction[]>;
  listEvents(tenantId: string, transactionId: string): Promise<ArchitectureBrainTransactionEvent[]>;
  appendEvent(input: AppendBrainTransactionEventInput): Promise<{ transaction: ArchitectureBrainTransaction; event: ArchitectureBrainTransactionEvent }>;
  createWaiver(input: CreateArchitectureRuleWaiverInput): Promise<ArchitectureRuleWaiver>;
  revokeWaiver(input: RevokeArchitectureRuleWaiverInput): Promise<ArchitectureRuleWaiver>;
  listWaivers(tenantId: string, projectId: string, branchId: string, status?: ArchitectureRuleWaiver['status']): Promise<ArchitectureRuleWaiver[]>;
  expireWaivers(tenantId: string, now?: string): Promise<number>;
  close(): Promise<void>;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(record).sort().map((key) => [key, stableValue(record[key])]));
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');
}

function newId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

function statusForEvent(
  current: ArchitectureBrainTransactionStatus,
  type: ArchitectureBrainTransactionEventType,
): ArchitectureBrainTransactionStatus {
  switch (type) {
    case 'proposal-recorded': return 'proposed';
    case 'deterministic-verified':
      if (!['proposed', 'verified'].includes(current)) throw new BrainTransactionTransitionError('BRAIN_TRANSACTION_VERIFICATION_NOT_ALLOWED');
      return 'verified';
    case 'review-assigned':
      if (!['proposed', 'verified', 'changes-requested'].includes(current)) throw new BrainTransactionTransitionError('BRAIN_TRANSACTION_REVIEW_ASSIGNMENT_NOT_ALLOWED');
      return 'review-pending';
    case 'review-started':
      if (current !== 'review-pending') throw new BrainTransactionTransitionError('BRAIN_TRANSACTION_REVIEW_START_NOT_ALLOWED');
      return 'review-pending';
    case 'review-approved':
      if (current !== 'review-pending') throw new BrainTransactionTransitionError('BRAIN_TRANSACTION_REVIEW_DISPOSITION_NOT_ALLOWED');
      return 'approved';
    case 'review-rejected':
      if (current !== 'review-pending') throw new BrainTransactionTransitionError('BRAIN_TRANSACTION_REVIEW_DISPOSITION_NOT_ALLOWED');
      return 'rejected';
    case 'changes-requested':
      if (current !== 'review-pending') throw new BrainTransactionTransitionError('BRAIN_TRANSACTION_REVIEW_DISPOSITION_NOT_ALLOWED');
      return 'changes-requested';
    case 'waiver-granted':
      if (!['review-pending', 'approved'].includes(current)) throw new BrainTransactionTransitionError('BRAIN_TRANSACTION_WAIVER_NOT_ALLOWED');
      return 'approved-with-waiver';
    case 'waiver-revoked':
      if (current !== 'approved-with-waiver') throw new BrainTransactionTransitionError('BRAIN_TRANSACTION_WAIVER_REVOCATION_NOT_ALLOWED');
      return 'review-pending';
    case 'committed':
      if (!['approved', 'approved-with-waiver'].includes(current)) throw new BrainTransactionTransitionError('BRAIN_TRANSACTION_COMMIT_NOT_ALLOWED');
      return 'committed';
    case 'superseded':
      if (current === 'committed') throw new BrainTransactionTransitionError('COMMITTED_BRAIN_TRANSACTION_CANNOT_BE_SUPERSEDED');
      return 'superseded';
  }
}

function validateEventAuthority(transaction: ArchitectureBrainTransaction, input: AppendBrainTransactionEventInput): void {
  const reviewEvents: ArchitectureBrainTransactionEventType[] = [
    'review-started', 'review-approved', 'review-rejected', 'changes-requested', 'waiver-granted', 'waiver-revoked',
  ];
  if (input.type === 'review-assigned') {
    const assignedReviewerId = String(input.payload?.assignedReviewerId ?? '').trim();
    if (!assignedReviewerId) throw new BrainTransactionTransitionError('ASSIGNED_REVIEWER_REQUIRED');
    if (assignedReviewerId === transaction.createdBy) throw new BrainTransactionTransitionError('INDEPENDENT_REVIEWER_REQUIRED');
  }
  if (reviewEvents.includes(input.type)) {
    if (input.actorId === transaction.createdBy) throw new BrainTransactionTransitionError('INDEPENDENT_REVIEWER_REQUIRED');
    if (transaction.assignedReviewerId && input.actorId !== transaction.assignedReviewerId) {
      throw new BrainTransactionTransitionError('ASSIGNED_REVIEWER_MISMATCH');
    }
    if (!input.rationale?.trim()) throw new BrainTransactionTransitionError('REVIEW_RATIONALE_REQUIRED');
  }
  if (input.type === 'committed' && input.actorId !== transaction.createdBy) {
    const roles = new Set(input.actorRoles);
    if (!roles.has('platform-admin') && !roles.has('solution-architect') && !roles.has('platform-architect')) {
      throw new BrainTransactionTransitionError('BRAIN_TRANSACTION_COMMIT_AUTHORITY_REQUIRED');
    }
  }
}

type BrainTransactionEventDraft = Omit<AppendBrainTransactionEventInput, 'expectedVersion' | 'type'> & {
  type: ArchitectureBrainTransactionEventType;
};

function eventFor(
  transaction: ArchitectureBrainTransaction,
  input: BrainTransactionEventDraft,
): ArchitectureBrainTransactionEvent {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const sequence = transaction.version + 1;
  const previousHash = transaction.lastEventHash;
  const payload = input.payload ?? {};
  const eventBase = {
    schemaVersion: '1.0' as const,
    id: newId('brain-event'),
    tenantId: input.tenantId,
    transactionId: transaction.id,
    sequence,
    type: input.type,
    actorId: input.actorId,
    actorRoles: [...new Set(input.actorRoles)].sort(),
    ...(input.rationale?.trim() ? { rationale: input.rationale.trim() } : {}),
    payload: structuredClone(payload),
    previousHash,
    createdAt,
  };
  return { ...eventBase, eventHash: sha256(eventBase) };
}

function transactionFromProposal(input: RecordBrainProposalInput): { transaction: ArchitectureBrainTransaction; event: ArchitectureBrainTransactionEvent } {
  if (input.receipt.projectId.length === 0 || input.receipt.branchId.length === 0) throw new Error('INVALID_BRAIN_PROPOSAL_RECEIPT');
  const createdAt = input.receipt.generatedAt || new Date().toISOString();
  const seed = {
    schemaVersion: '1.0' as const,
    id: input.receipt.proposalId,
    tenantId: input.tenantId,
    projectId: input.receipt.projectId,
    branchId: input.receipt.branchId,
    projectRevision: input.receipt.projectRevision,
    graphRevision: input.receipt.graph.revision,
    graphFingerprint: input.receipt.graph.fingerprint,
    task: input.receipt.task,
    status: 'proposed' as const,
    version: 0,
    createdBy: input.actorId,
    correlationId: input.correlationId,
    receipt: structuredClone(input.receipt),
    summary: structuredClone(input.summary),
    createdAt,
    updatedAt: createdAt,
    lastEventHash: '',
  };
  const event = eventFor(seed, {
    tenantId: input.tenantId,
    transactionId: seed.id,
    type: 'proposal-recorded',
    actorId: input.actorId,
    actorRoles: input.actorRoles,
    payload: {
      task: input.receipt.task,
      contextFingerprint: input.receipt.contextFingerprint,
      manifestFingerprint: input.receipt.manifest.fingerprint,
      graphFingerprint: input.receipt.graph.fingerprint,
    },
    createdAt,
  });
  const transaction: ArchitectureBrainTransaction = {
    ...seed,
    version: 1,
    lastEventHash: event.eventHash,
  };
  return { transaction, event };
}

function updatedTransaction(
  transaction: ArchitectureBrainTransaction,
  event: ArchitectureBrainTransactionEvent,
): ArchitectureBrainTransaction {
  const status = statusForEvent(transaction.status, event.type);
  const assignedReviewerId = event.type === 'review-assigned'
    ? String(event.payload.assignedReviewerId)
    : transaction.assignedReviewerId;
  return {
    ...transaction,
    status,
    version: event.sequence,
    ...(assignedReviewerId ? { assignedReviewerId } : {}),
    updatedAt: event.createdAt,
    lastEventHash: event.eventHash,
  };
}

export class InMemoryBrainTransactionRepository implements BrainTransactionRepository {
  private readonly transactions = new Map<string, ArchitectureBrainTransaction>();
  private readonly events = new Map<string, ArchitectureBrainTransactionEvent[]>();
  private readonly waivers = new Map<string, ArchitectureRuleWaiver>();
  private key(tenantId: string, id: string): string { return `${tenantId}:${id}`; }

  async recordProposal(input: RecordBrainProposalInput): Promise<ArchitectureBrainTransaction> {
    const key = this.key(input.tenantId, input.receipt.proposalId);
    const existing = this.transactions.get(key);
    if (existing) return structuredClone(existing);
    const { transaction, event } = transactionFromProposal(input);
    this.transactions.set(key, transaction);
    this.events.set(key, [event]);
    return structuredClone(transaction);
  }

  async getTransaction(tenantId: string, transactionId: string): Promise<ArchitectureBrainTransaction | null> {
    const value = this.transactions.get(this.key(tenantId, transactionId));
    return value ? structuredClone(value) : null;
  }

  async listTransactions(tenantId: string, projectId: string, branchId: string, limit = 100): Promise<ArchitectureBrainTransaction[]> {
    return [...this.transactions.values()]
      .filter((item) => item.tenantId === tenantId && item.projectId === projectId && item.branchId === branchId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit)
      .map((item) => structuredClone(item));
  }

  async listEvents(tenantId: string, transactionId: string): Promise<ArchitectureBrainTransactionEvent[]> {
    return (this.events.get(this.key(tenantId, transactionId)) ?? []).map((item) => structuredClone(item));
  }

  async appendEvent(input: AppendBrainTransactionEventInput): Promise<{ transaction: ArchitectureBrainTransaction; event: ArchitectureBrainTransactionEvent }> {
    const key = this.key(input.tenantId, input.transactionId);
    const current = this.transactions.get(key);
    if (!current) throw new BrainTransactionNotFound();
    if (current.version !== input.expectedVersion) throw new BrainTransactionVersionConflict(current.version);
    validateEventAuthority(current, input);
    const event = eventFor(current, input);
    const next = updatedTransaction(current, event);
    this.transactions.set(key, next);
    this.events.set(key, [...(this.events.get(key) ?? []), event]);
    return { transaction: structuredClone(next), event: structuredClone(event) };
  }

  async createWaiver(input: CreateArchitectureRuleWaiverInput): Promise<ArchitectureRuleWaiver> {
    const createdAt = input.createdAt ?? new Date().toISOString();
    if (new Date(input.expiresAt).getTime() <= new Date(createdAt).getTime()) throw new Error('WAIVER_EXPIRY_MUST_BE_FUTURE');
    if (input.ownerId === input.approvedBy) throw new Error('INDEPENDENT_WAIVER_APPROVER_REQUIRED');
    const waiver: ArchitectureRuleWaiver = {
      schemaVersion: '1.0',
      id: newId('architecture-waiver'),
      tenantId: input.tenantId,
      projectId: input.projectId,
      branchId: input.branchId,
      ...(input.transactionId ? { transactionId: input.transactionId } : {}),
      findingId: input.findingId,
      ruleId: input.ruleId,
      ...(input.scopeRef ? { scopeRef: input.scopeRef } : {}),
      reason: input.reason.trim(),
      compensatingControls: [...new Set(input.compensatingControls.map((item) => item.trim()).filter(Boolean))],
      evidenceRefs: [...new Set(input.evidenceRefs.map((item) => item.trim()).filter(Boolean))],
      ownerId: input.ownerId,
      approvedBy: input.approvedBy,
      createdAt,
      expiresAt: input.expiresAt,
      status: 'active',
    };
    this.waivers.set(this.key(input.tenantId, waiver.id), waiver);
    return structuredClone(waiver);
  }

  async revokeWaiver(input: RevokeArchitectureRuleWaiverInput): Promise<ArchitectureRuleWaiver> {
    const key = this.key(input.tenantId, input.waiverId);
    const waiver = this.waivers.get(key);
    if (!waiver) throw new Error('ARCHITECTURE_WAIVER_NOT_FOUND');
    if (waiver.status !== 'active') throw new Error('ARCHITECTURE_WAIVER_NOT_ACTIVE');
    const next: ArchitectureRuleWaiver = {
      ...waiver,
      status: 'revoked',
      revokedAt: input.revokedAt ?? new Date().toISOString(),
      revokedBy: input.revokedBy,
      revocationReason: input.reason.trim(),
    };
    this.waivers.set(key, next);
    return structuredClone(next);
  }

  async listWaivers(tenantId: string, projectId: string, branchId: string, status?: ArchitectureRuleWaiver['status']): Promise<ArchitectureRuleWaiver[]> {
    return [...this.waivers.values()]
      .filter((item) => item.tenantId === tenantId && item.projectId === projectId && item.branchId === branchId && (!status || item.status === status))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((item) => structuredClone(item));
  }

  async expireWaivers(tenantId: string, now = new Date().toISOString()): Promise<number> {
    let count = 0;
    for (const [key, waiver] of this.waivers) {
      if (waiver.tenantId === tenantId && waiver.status === 'active' && waiver.expiresAt <= now) {
        this.waivers.set(key, { ...waiver, status: 'expired' });
        count += 1;
      }
    }
    return count;
  }

  async close(): Promise<void> {}
}

interface PostgresTransactionRow {
  transaction_id: string;
  tenant_id: string;
  project_id: string;
  branch_id: string;
  project_revision: number;
  graph_revision: number;
  graph_fingerprint: string;
  task: ArchitectureBrainTransaction['task'];
  status: ArchitectureBrainTransaction['status'];
  version: number;
  created_by: string;
  assigned_reviewer_id: string | null;
  correlation_id: string;
  receipt: ArchitectureBrainProposalReceipt;
  summary: ArchitectureBrainTransactionSummary;
  created_at: Date | string;
  updated_at: Date | string;
  last_event_hash: string;
}

function iso(value: Date | string): string { return value instanceof Date ? value.toISOString() : value; }

function mapPostgresTransaction(row: PostgresTransactionRow): ArchitectureBrainTransaction {
  return {
    schemaVersion: '1.0', id: row.transaction_id, tenantId: row.tenant_id,
    projectId: row.project_id, branchId: row.branch_id, projectRevision: row.project_revision,
    graphRevision: row.graph_revision, graphFingerprint: row.graph_fingerprint, task: row.task,
    status: row.status, version: row.version, createdBy: row.created_by,
    ...(row.assigned_reviewer_id ? { assignedReviewerId: row.assigned_reviewer_id } : {}),
    correlationId: row.correlation_id, receipt: row.receipt, summary: row.summary,
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at), lastEventHash: row.last_event_hash,
  };
}

export class PostgresBrainTransactionRepository implements BrainTransactionRepository {
  private pool: import('pg').Pool | null = null;
  constructor(private readonly connectionString: string) {}
  private async getPool(): Promise<import('pg').Pool> {
    if (this.pool) return this.pool;
    const { Pool } = await import('pg');
    this.pool = new Pool({ connectionString: this.connectionString, max: Number(process.env.AIW_DB_POOL_MAX ?? 10), application_name: 'aiw-brain-transactions' });
    return this.pool;
  }
  private async tenantClient<T>(tenantId: string, operation: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
    const client = await (await this.getPool()).connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('aiw.tenant_id',$1,true)`, [tenantId]);
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async recordProposal(input: RecordBrainProposalInput): Promise<ArchitectureBrainTransaction> {
    const prepared = transactionFromProposal(input);
    return this.tenantClient(input.tenantId, async (client) => {
      const existing = await client.query<PostgresTransactionRow>('SELECT * FROM architecture_brain_transactions WHERE tenant_id=$1 AND transaction_id=$2', [input.tenantId, input.receipt.proposalId]);
      if (existing.rows[0]) return mapPostgresTransaction(existing.rows[0]);
      const t = prepared.transaction;
      await client.query(
        `INSERT INTO architecture_brain_transactions(tenant_id,transaction_id,project_id,branch_id,project_revision,graph_revision,graph_fingerprint,task,status,version,created_by,correlation_id,receipt,summary,created_at,updated_at,last_event_hash)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15,$16,$17)`,
        [t.tenantId,t.id,t.projectId,t.branchId,t.projectRevision,t.graphRevision,t.graphFingerprint,t.task,t.status,t.version,t.createdBy,t.correlationId,JSON.stringify(t.receipt),JSON.stringify(t.summary),t.createdAt,t.updatedAt,t.lastEventHash],
      );
      const e = prepared.event;
      await client.query(
        `INSERT INTO architecture_brain_transaction_events(tenant_id,event_id,transaction_id,sequence,event_type,actor_id,actor_roles,rationale,payload,previous_hash,event_hash,created_at)
         VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10,$11,$12)`,
        [e.tenantId,e.id,e.transactionId,e.sequence,e.type,e.actorId,JSON.stringify(e.actorRoles),e.rationale ?? null,JSON.stringify(e.payload),e.previousHash,e.eventHash,e.createdAt],
      );
      return t;
    });
  }

  async getTransaction(tenantId: string, transactionId: string): Promise<ArchitectureBrainTransaction | null> {
    return this.tenantClient(tenantId, async (client) => {
      const result = await client.query<PostgresTransactionRow>('SELECT * FROM architecture_brain_transactions WHERE tenant_id=$1 AND transaction_id=$2', [tenantId, transactionId]);
      return result.rows[0] ? mapPostgresTransaction(result.rows[0]) : null;
    });
  }

  async listTransactions(tenantId: string, projectId: string, branchId: string, limit = 100): Promise<ArchitectureBrainTransaction[]> {
    return this.tenantClient(tenantId, async (client) => {
      const result = await client.query<PostgresTransactionRow>('SELECT * FROM architecture_brain_transactions WHERE tenant_id=$1 AND project_id=$2 AND branch_id=$3 ORDER BY created_at DESC LIMIT $4', [tenantId, projectId, branchId, limit]);
      return result.rows.map(mapPostgresTransaction);
    });
  }

  async listEvents(tenantId: string, transactionId: string): Promise<ArchitectureBrainTransactionEvent[]> {
    return this.tenantClient(tenantId, async (client) => {
      const result = await client.query('SELECT * FROM architecture_brain_transaction_events WHERE tenant_id=$1 AND transaction_id=$2 ORDER BY sequence', [tenantId, transactionId]);
      return result.rows.map((row) => ({
        schemaVersion: '1.0', id: String(row.event_id), tenantId: String(row.tenant_id), transactionId: String(row.transaction_id), sequence: Number(row.sequence),
        type: row.event_type as ArchitectureBrainTransactionEventType, actorId: String(row.actor_id), actorRoles: Array.isArray(row.actor_roles) ? row.actor_roles.map(String) : [],
        ...(row.rationale ? { rationale: String(row.rationale) } : {}), payload: (row.payload ?? {}) as Record<string, unknown>, previousHash: String(row.previous_hash), eventHash: String(row.event_hash), createdAt: iso(row.created_at),
      }));
    });
  }

  async appendEvent(input: AppendBrainTransactionEventInput): Promise<{ transaction: ArchitectureBrainTransaction; event: ArchitectureBrainTransactionEvent }> {
    return this.tenantClient(input.tenantId, async (client) => {
      const result = await client.query<PostgresTransactionRow>('SELECT * FROM architecture_brain_transactions WHERE tenant_id=$1 AND transaction_id=$2 FOR UPDATE', [input.tenantId, input.transactionId]);
      if (!result.rows[0]) throw new BrainTransactionNotFound();
      const current = mapPostgresTransaction(result.rows[0]);
      if (current.version !== input.expectedVersion) throw new BrainTransactionVersionConflict(current.version);
      validateEventAuthority(current, input);
      const event = eventFor(current, input);
      const next = updatedTransaction(current, event);
      await client.query(
        `INSERT INTO architecture_brain_transaction_events(tenant_id,event_id,transaction_id,sequence,event_type,actor_id,actor_roles,rationale,payload,previous_hash,event_hash,created_at)
         VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10,$11,$12)`,
        [event.tenantId,event.id,event.transactionId,event.sequence,event.type,event.actorId,JSON.stringify(event.actorRoles),event.rationale ?? null,JSON.stringify(event.payload),event.previousHash,event.eventHash,event.createdAt],
      );
      await client.query(
        `UPDATE architecture_brain_transactions SET status=$3,version=$4,assigned_reviewer_id=$5,updated_at=$6,last_event_hash=$7 WHERE tenant_id=$1 AND transaction_id=$2`,
        [input.tenantId,input.transactionId,next.status,next.version,next.assignedReviewerId ?? null,next.updatedAt,next.lastEventHash],
      );
      return { transaction: next, event };
    });
  }

  async createWaiver(input: CreateArchitectureRuleWaiverInput): Promise<ArchitectureRuleWaiver> {
    const memory = new InMemoryBrainTransactionRepository();
    const waiver = await memory.createWaiver(input);
    return this.tenantClient(input.tenantId, async (client) => {
      await client.query(
        `INSERT INTO architecture_rule_waivers(tenant_id,waiver_id,project_id,branch_id,transaction_id,finding_id,rule_id,scope_ref,reason,compensating_controls,evidence_refs,owner_id,approved_by,created_at,expires_at,status)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14,$15,$16)`,
        [waiver.tenantId,waiver.id,waiver.projectId,waiver.branchId,waiver.transactionId ?? null,waiver.findingId,waiver.ruleId,waiver.scopeRef ?? null,waiver.reason,JSON.stringify(waiver.compensatingControls),JSON.stringify(waiver.evidenceRefs),waiver.ownerId,waiver.approvedBy,waiver.createdAt,waiver.expiresAt,waiver.status],
      );
      return waiver;
    });
  }

  async revokeWaiver(input: RevokeArchitectureRuleWaiverInput): Promise<ArchitectureRuleWaiver> {
    return this.tenantClient(input.tenantId, async (client) => {
      const result = await client.query('UPDATE architecture_rule_waivers SET status=\'revoked\',revoked_at=$3,revoked_by=$4,revocation_reason=$5 WHERE tenant_id=$1 AND waiver_id=$2 AND status=\'active\' RETURNING *', [input.tenantId,input.waiverId,input.revokedAt ?? new Date().toISOString(),input.revokedBy,input.reason.trim()]);
      if (!result.rows[0]) throw new Error('ARCHITECTURE_WAIVER_NOT_ACTIVE');
      return mapWaiverRow(result.rows[0]);
    });
  }

  async listWaivers(tenantId: string, projectId: string, branchId: string, status?: ArchitectureRuleWaiver['status']): Promise<ArchitectureRuleWaiver[]> {
    return this.tenantClient(tenantId, async (client) => {
      const result = await client.query(`SELECT * FROM architecture_rule_waivers WHERE tenant_id=$1 AND project_id=$2 AND branch_id=$3 ${status ? 'AND status=$4' : ''} ORDER BY created_at DESC`, status ? [tenantId,projectId,branchId,status] : [tenantId,projectId,branchId]);
      return result.rows.map(mapWaiverRow);
    });
  }

  async expireWaivers(tenantId: string, now = new Date().toISOString()): Promise<number> {
    return this.tenantClient(tenantId, async (client) => {
      const result = await client.query('UPDATE architecture_rule_waivers SET status=\'expired\' WHERE tenant_id=$1 AND status=\'active\' AND expires_at <= $2', [tenantId,now]);
      return result.rowCount ?? 0;
    });
  }

  async close(): Promise<void> { if (this.pool) await this.pool.end(); }
}

function mapWaiverRow(row: Record<string, unknown>): ArchitectureRuleWaiver {
  return {
    schemaVersion: '1.0', id: String(row.waiver_id), tenantId: String(row.tenant_id), projectId: String(row.project_id), branchId: String(row.branch_id),
    ...(row.transaction_id ? { transactionId: String(row.transaction_id) } : {}), findingId: String(row.finding_id), ruleId: String(row.rule_id),
    ...(row.scope_ref ? { scopeRef: String(row.scope_ref) } : {}), reason: String(row.reason),
    compensatingControls: Array.isArray(row.compensating_controls) ? row.compensating_controls.map(String) : [], evidenceRefs: Array.isArray(row.evidence_refs) ? row.evidence_refs.map(String) : [],
    ownerId: String(row.owner_id), approvedBy: String(row.approved_by), createdAt: iso(row.created_at as Date | string), expiresAt: iso(row.expires_at as Date | string),
    status: row.status as ArchitectureRuleWaiver['status'], ...(row.revoked_at ? { revokedAt: iso(row.revoked_at as Date | string) } : {}),
    ...(row.revoked_by ? { revokedBy: String(row.revoked_by) } : {}), ...(row.revocation_reason ? { revocationReason: String(row.revocation_reason) } : {}),
  };
}

export class MongoAtlasBrainTransactionRepository implements BrainTransactionRepository {
  private client: import('mongodb').MongoClient | null = null;
  private indexesReady = false;
  constructor(private readonly connectionString: string, private readonly dbName = mongodbDbName()) {}
  private async getClient(): Promise<import('mongodb').MongoClient> {
    if (this.client) return this.client;
    const { MongoClient } = await import('mongodb');
    this.client = new MongoClient(this.connectionString, { appName: 'aiw-brain-transactions', maxPoolSize: Number(process.env.AIW_DB_POOL_MAX ?? 10), serverSelectionTimeoutMS: Number(process.env.AIW_MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? 8000) });
    await this.client.connect();
    return this.client;
  }
  private async db(): Promise<import('mongodb').Db> { return (await this.getClient()).db(this.dbName); }
  private async ensureIndexes(): Promise<void> {
    if (this.indexesReady) return;
    const db = await this.db();
    await Promise.all([
      db.collection('architecture_brain_transactions').createIndex({ tenantId: 1, id: 1 }, { unique: true, name: 'uniq_brain_transaction' }),
      db.collection('architecture_brain_transactions').createIndex({ tenantId: 1, projectId: 1, branchId: 1, createdAt: -1 }, { name: 'brain_transactions_by_project' }),
      db.collection('architecture_brain_transaction_events').createIndex({ tenantId: 1, transactionId: 1, sequence: 1 }, { unique: true, name: 'uniq_brain_event_sequence' }),
      db.collection('architecture_rule_waivers').createIndex({ tenantId: 1, id: 1 }, { unique: true, name: 'uniq_architecture_waiver' }),
      db.collection('architecture_rule_waivers').createIndex({ tenantId: 1, projectId: 1, branchId: 1, status: 1, expiresAt: 1 }, { name: 'architecture_waivers_by_project' }),
    ]);
    this.indexesReady = true;
  }
  private async transaction<T>(operation: (db: import('mongodb').Db, session: import('mongodb').ClientSession) => Promise<T>): Promise<T> {
    await this.ensureIndexes();
    const client = await this.getClient();
    const session = client.startSession();
    try {
      let value!: T;
      await session.withTransaction(async () => { value = await operation(client.db(this.dbName), session); });
      return value;
    } finally { await session.endSession(); }
  }

  async recordProposal(input: RecordBrainProposalInput): Promise<ArchitectureBrainTransaction> {
    const prepared = transactionFromProposal(input);
    return this.transaction(async (db, session) => {
      const transactions = db.collection<ArchitectureBrainTransaction>('architecture_brain_transactions');
      const existing = await transactions.findOne({ tenantId: input.tenantId, id: input.receipt.proposalId }, { session });
      if (existing) return structuredClone(existing);
      await transactions.insertOne(prepared.transaction, { session });
      await db.collection<ArchitectureBrainTransactionEvent>('architecture_brain_transaction_events').insertOne(prepared.event, { session });
      return prepared.transaction;
    });
  }
  async getTransaction(tenantId: string, transactionId: string): Promise<ArchitectureBrainTransaction | null> {
    await this.ensureIndexes();
    const result = await (await this.db()).collection<ArchitectureBrainTransaction>('architecture_brain_transactions').findOne({ tenantId, id: transactionId });
    return result ? structuredClone(result) : null;
  }
  async listTransactions(tenantId: string, projectId: string, branchId: string, limit = 100): Promise<ArchitectureBrainTransaction[]> {
    await this.ensureIndexes();
    const results = await (await this.db()).collection<ArchitectureBrainTransaction>('architecture_brain_transactions').find({ tenantId, projectId, branchId }).sort({ createdAt: -1 }).limit(limit).toArray();
    return results.map((item) => structuredClone(item));
  }
  async listEvents(tenantId: string, transactionId: string): Promise<ArchitectureBrainTransactionEvent[]> {
    await this.ensureIndexes();
    const results = await (await this.db()).collection<ArchitectureBrainTransactionEvent>('architecture_brain_transaction_events').find({ tenantId, transactionId }).sort({ sequence: 1 }).toArray();
    return results.map((item) => structuredClone(item));
  }
  async appendEvent(input: AppendBrainTransactionEventInput): Promise<{ transaction: ArchitectureBrainTransaction; event: ArchitectureBrainTransactionEvent }> {
    return this.transaction(async (db, session) => {
      const transactions = db.collection<ArchitectureBrainTransaction>('architecture_brain_transactions');
      const current = await transactions.findOne({ tenantId: input.tenantId, id: input.transactionId }, { session });
      if (!current) throw new BrainTransactionNotFound();
      if (current.version !== input.expectedVersion) throw new BrainTransactionVersionConflict(current.version);
      validateEventAuthority(current, input);
      const event = eventFor(current, input);
      const next = updatedTransaction(current, event);
      const update = await transactions.replaceOne({ tenantId: input.tenantId, id: input.transactionId, version: input.expectedVersion }, next, { session });
      if (update.modifiedCount !== 1) {
        const latest = await transactions.findOne({ tenantId: input.tenantId, id: input.transactionId }, { session });
        throw new BrainTransactionVersionConflict(latest?.version ?? input.expectedVersion);
      }
      await db.collection<ArchitectureBrainTransactionEvent>('architecture_brain_transaction_events').insertOne(event, { session });
      return { transaction: next, event };
    });
  }
  async createWaiver(input: CreateArchitectureRuleWaiverInput): Promise<ArchitectureRuleWaiver> {
    const memory = new InMemoryBrainTransactionRepository();
    const waiver = await memory.createWaiver(input);
    await this.ensureIndexes();
    await (await this.db()).collection<ArchitectureRuleWaiver>('architecture_rule_waivers').insertOne(waiver);
    return waiver;
  }
  async revokeWaiver(input: RevokeArchitectureRuleWaiverInput): Promise<ArchitectureRuleWaiver> {
    await this.ensureIndexes();
    const result = await (await this.db()).collection<ArchitectureRuleWaiver>('architecture_rule_waivers').findOneAndUpdate(
      { tenantId: input.tenantId, id: input.waiverId, status: 'active' },
      { $set: { status: 'revoked', revokedAt: input.revokedAt ?? new Date().toISOString(), revokedBy: input.revokedBy, revocationReason: input.reason.trim() } },
      { returnDocument: 'after' },
    );
    if (!result) throw new Error('ARCHITECTURE_WAIVER_NOT_ACTIVE');
    return structuredClone(result);
  }
  async listWaivers(tenantId: string, projectId: string, branchId: string, status?: ArchitectureRuleWaiver['status']): Promise<ArchitectureRuleWaiver[]> {
    await this.ensureIndexes();
    const query: Record<string, unknown> = { tenantId, projectId, branchId };
    if (status) query.status = status;
    const results = await (await this.db()).collection<ArchitectureRuleWaiver>('architecture_rule_waivers').find(query).sort({ createdAt: -1 }).toArray();
    return results.map((item) => structuredClone(item));
  }
  async expireWaivers(tenantId: string, now = new Date().toISOString()): Promise<number> {
    await this.ensureIndexes();
    const result = await (await this.db()).collection<ArchitectureRuleWaiver>('architecture_rule_waivers').updateMany({ tenantId, status: 'active', expiresAt: { $lte: now } }, { $set: { status: 'expired' } });
    return result.modifiedCount;
  }
  async close(): Promise<void> { if (this.client) await this.client.close(); }
}

export function createBrainTransactionRepository(): BrainTransactionRepository {
  const provider = databaseProvider();
  if (provider === 'mongodb-atlas') {
    const uri = mongodbUri();
    if (!uri) throw new Error('MONGODB_URI_REQUIRED_FOR_ATLAS_PROVIDER');
    return new MongoAtlasBrainTransactionRepository(uri);
  }
  if (provider === 'postgresql') {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_REQUIRED_FOR_POSTGRESQL_PROVIDER');
    return new PostgresBrainTransactionRepository(process.env.DATABASE_URL);
  }
  return new InMemoryBrainTransactionRepository();
}
