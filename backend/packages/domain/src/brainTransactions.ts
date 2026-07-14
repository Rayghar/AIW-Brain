import type { ArchitectureBrainProposalReceipt, ArchitectureBrainTaskKind } from './architectureBrain.js';

export const architectureBrainTransactionStatuses = [
  'proposed',
  'verified',
  'review-pending',
  'approved',
  'approved-with-waiver',
  'changes-requested',
  'rejected',
  'committed',
  'superseded',
] as const;
export type ArchitectureBrainTransactionStatus =
  (typeof architectureBrainTransactionStatuses)[number];

export const architectureBrainTransactionEventTypes = [
  'proposal-recorded',
  'deterministic-verified',
  'review-assigned',
  'review-started',
  'review-approved',
  'review-rejected',
  'changes-requested',
  'waiver-granted',
  'waiver-revoked',
  'committed',
  'superseded',
] as const;
export type ArchitectureBrainTransactionEventType =
  (typeof architectureBrainTransactionEventTypes)[number];

export interface ArchitectureBrainTransactionSummary {
  title: string;
  description: string;
  externalRefs: Record<string, string>;
  warningCount: number;
  knowledgeRefCount: number;
  llmUsed: boolean;
}

export interface ArchitectureBrainTransaction {
  schemaVersion: '1.0';
  id: string;
  tenantId: string;
  projectId: string;
  branchId: string;
  projectRevision: number;
  graphRevision: number;
  graphFingerprint: string;
  task: ArchitectureBrainTaskKind;
  status: ArchitectureBrainTransactionStatus;
  version: number;
  createdBy: string;
  assignedReviewerId?: string;
  correlationId: string;
  receipt: ArchitectureBrainProposalReceipt;
  summary: ArchitectureBrainTransactionSummary;
  createdAt: string;
  updatedAt: string;
  lastEventHash: string;
}

export interface ArchitectureBrainTransactionEvent {
  schemaVersion: '1.0';
  id: string;
  tenantId: string;
  transactionId: string;
  sequence: number;
  type: ArchitectureBrainTransactionEventType;
  actorId: string;
  actorRoles: string[];
  rationale?: string;
  payload: Record<string, unknown>;
  previousHash: string;
  eventHash: string;
  createdAt: string;
}

export const architectureReviewDispositions = [
  'approved',
  'rejected',
  'changes-requested',
] as const;
export type ArchitectureReviewDisposition =
  (typeof architectureReviewDispositions)[number];

export const architectureRuleWaiverStatuses = [
  'active',
  'expired',
  'revoked',
] as const;
export type ArchitectureRuleWaiverStatus =
  (typeof architectureRuleWaiverStatuses)[number];

export interface ArchitectureRuleWaiver {
  schemaVersion: '1.0';
  id: string;
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
  createdAt: string;
  expiresAt: string;
  status: ArchitectureRuleWaiverStatus;
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;
}
