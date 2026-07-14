// Sprint 8.9.5 — Mind Administration and Knowledge Ingestion Factory contracts.
// These are pure contracts: no UI, API, worker or LLM authority lives here.

export type MindFactorySourceType = 'github' | 'gitlab' | 'azure-devops' | 'bitbucket' | 'document' | 'book' | 'paper' | 'internal-standard' | 'vendor-doc' | 'policy-pack' | 'manual-import';
export type MindFactorySnapshotStatus = 'quarantined' | 'extraction-ready' | 'blocked';
export type CandidateClaimStatus = 'candidate' | 'normalized' | 'duplicate' | 'contradicted' | 'approved-for-candidate-release' | 'rejected';
export type ClaimPredicateClass = 'applicability' | 'benefit' | 'liability' | 'obligation' | 'risk' | 'mitigation' | 'quality-impact' | 'prerequisite' | 'conflict' | 'tactic' | 'fitness-test' | 'vendor-realization' | 'compliance' | 'security' | 'cost' | 'operational-maturity';
export type KnowledgePackActivationStatus = 'accepted' | 'rejected';

export interface SourceQuarantineSnapshot {
  snapshotId: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: MindFactorySourceType | string;
  capturedAt: string;
  capturedBy: string;
  commitSha?: string;
  contentHash: string;
  license?: string;
  provenanceUrl?: string;
  status: MindFactorySnapshotStatus;
  quarantineReason: string;
  eligibleClaimTypes: ClaimPredicateClass[];
  blockedClaimTypes: ClaimPredicateClass[];
  evidenceRefs: string[];
}

export interface QuarantinedCandidateClaim {
  claimId: string;
  snapshotId: string;
  sourceId: string;
  predicate: ClaimPredicateClass;
  subject: string;
  object: string;
  applicabilityContext: string[];
  evidenceRefs: string[];
  sourceSpan?: string;
  confidence: 'weak' | 'moderate' | 'strong';
  status: CandidateClaimStatus;
  reviewerRequired: true;
  nonScoring: true;
}

export interface NormalizedClaimResult {
  normalizedClaims: QuarantinedCandidateClaim[];
  duplicateGroups: Array<{ groupId: string; canonicalClaimId: string; duplicateClaimIds: string[]; reason: string }>;
  synonymGroups: Array<{ groupId: string; canonicalTerm: string; synonyms: string[]; scope: string }>;
  contradictionGroups: Array<{ groupId: string; subject: string; opposingClaimIds: string[]; resolution: 'needs-context-split' | 'needs-review'; reason: string }>;
  corroboration: Array<{ claimId: string; independentSupportCount: number; confidence: 'weak' | 'moderate' | 'strong'; recommendation: string }>;
}

export interface ReleaseImpactPreview {
  previewId: string;
  baseReleaseId: string;
  candidateReleaseId: string;
  generatedAt: string;
  changedClaimCount: number;
  changedPatternCount: number;
  affectedStages: string[];
  recommendationMovement: Array<{ recommendationId: string; before: string; after: string; reason: string }>;
  riskNotes: string[];
  promotionGate: 'blocked' | 'review-required' | 'eligible-after-human-approval';
}

export interface StageKnowledgeTraceabilityRecord {
  stageId: string;
  stageName: string;
  knowledgeInputs: string[];
  claimPredicates: ClaimPredicateClass[];
  evidenceRequired: string[];
  offlineAvailable: boolean;
  adminControls: string[];
}

export interface SignedKnowledgePackManifest {
  packId: string;
  releaseId: string;
  generatedAt: string;
  generatedBy: string;
  files: Array<{ path: string; sha256: string; bytes: number }>;
  activationRules: string[];
  rejectionRules: string[];
  provenance: {
    candidateKnowledgeInfluence: 'blocked-until-promotion';
    llmAuthority: 'none';
    humanPromotionRequired: true;
  };
  signature: {
    algorithm: 'reference-sha256-manifest' | 'kms-attested-sha256-manifest';
    value: string;
    provider?: KmsSigningProvider;
    keyRef?: string;
  };
}

export interface KnowledgePackActivationResult {
  status: KnowledgePackActivationStatus;
  releaseId?: string;
  activatedAt: string;
  reasons: string[];
  manifest?: SignedKnowledgePackManifest;
}

export const AIW_MIND_FACTORY_PIPELINE = [
  'register-source',
  'capture-pinned-snapshot',
  'quarantine',
  'extract-candidate-claims',
  'normalize-duplicates-synonyms',
  'detect-contradictions',
  'calculate-corroboration',
  'named-human-review',
  'release-impact-preview',
  'signed-knowledge-pack-export',
  'tenant-project-pinning',
] as const;

export const AIW_MIND_FACTORY_HARD_RULES = [
  'candidate-claims-are-non-scoring',
  'llm-extraction-cannot-approve-or-weigh',
  'source-snapshots-must-be-quarantined-before-review',
  'release-impact-preview-required-before-promotion',
  'unsigned-knowledge-packs-cannot-activate',
  'stage-intelligence-must-show-knowledge-receipts',
] as const;

// Sprint 8.9.6 — Mind Factory UI, Worker Orchestration and Signed-Pack Activation contracts.
export type MindFactoryWorkerOperation = 'source-refresh' | 'claim-extraction' | 'claim-normalization' | 'release-impact-preview' | 'knowledge-pack-activation';
export type MindFactoryWorkerJobStatus = 'queued' | 'dry-run' | 'completed' | 'blocked';

export interface MindFactoryWorkerJobPlan {
  jobId: string;
  operation: MindFactoryWorkerOperation;
  sourceId?: string;
  snapshotId?: string;
  releaseId?: string;
  tenantId?: string;
  status: MindFactoryWorkerJobStatus;
  queuedAt: string;
  queuedBy: string;
  workerQueue: string;
  doctrine: {
    deterministicAuthority: true;
    candidateKnowledgeNonScoring: true;
    humanApprovalRequired: true;
  };
}

export interface KnowledgePackActivationPolicy {
  tenantId: string;
  projectId?: string;
  releaseId: string;
  packId: string;
  activatedBy: string;
  activatedAt: string;
  activationMode: 'offline-essential' | 'enterprise-tenant' | 'sovereign-airgapped';
  checks: Array<{ checkId: string; ok: boolean; detail: string }>;
  pinned: boolean;
}

export interface MindFactoryAuditTimelineEvent {
  at: string;
  actor: string;
  action: string;
  subject: string;
  detail: string;
  phase: 'snapshot' | 'extraction' | 'normalization' | 'impact-preview' | 'pack-export' | 'pack-import' | 'activation' | 'worker';
}


// Sprint 8.9.7 — Production Mind Factory Persistence, KMS Signing and Repository Source Execution contracts.
export type MindFactoryPersistenceBackend = 'reference-memory' | 'postgres';
export type MindFactoryPersistenceTable = 'mind_factory_source_snapshots' | 'mind_factory_candidate_claims' | 'mind_factory_worker_jobs' | 'mind_factory_pack_activations' | 'mind_factory_audit_timeline' | 'mind_factory_repository_executions' | 'mind_factory_kms_signatures';
export type KmsSigningProvider = 'reference-local' | 'aws-kms' | 'azure-keyvault' | 'gcp-kms' | 'hashicorp-vault' | 'sovereign-hsm';

export interface MindFactoryPersistencePlan {
  planId: string;
  backend: MindFactoryPersistenceBackend;
  generatedAt: string;
  tables: Array<{ table: MindFactoryPersistenceTable; tenantScoped: boolean; rlsRequired: true; purpose: string }>;
  migrations: string[];
  safety: {
    candidateClaimsNonScoring: true;
    releaseActivationTenantScoped: true;
    repositoryExecutionsReadOnly: true;
    auditTimelineAppendOnly: true;
  };
}

export interface KmsSigningRequest {
  provider: KmsSigningProvider;
  keyRef: string;
  requestedBy: string;
  tenantId?: string;
  projectId?: string;
  manifest: SignedKnowledgePackManifest;
}

export interface KmsSigningResult {
  signatureId: string;
  provider: KmsSigningProvider;
  keyRef: string;
  algorithm: 'kms-attested-sha256-manifest';
  value: string;
  signedAt: string;
  signedBy: string;
  manifestPackId: string;
  verification: {
    manifestHash: string;
    candidateKnowledgeBlocked: true;
    humanPromotionRequired: true;
    keyRefRecorded: true;
  };
}

export interface RepositorySourceExecutionPolicy {
  connectorId: string;
  provider: string;
  repositoryUrl: string;
  branch: string;
  allowedPaths: string[];
  readOnly: true;
  commitSha?: string;
  executedBy: string;
  licence?: string;
}

export interface RepositorySourceExecutionResult {
  executionId: string;
  connectorId: string;
  mode: 'reference-dry-run' | 'read-only-live';
  status: 'completed' | 'blocked';
  executedAt: string;
  snapshot?: SourceQuarantineSnapshot;
  detectedPaths: string[];
  warnings: string[];
  doctrine: {
    repositoryWritesDisabled: true;
    prCreationRequiresApproval: true;
    architectureMutationRequiresApproval: true;
    candidateClaimsNonScoring: true;
  };
}

export interface MindFactoryActivationPersistenceRecord {
  recordId: string;
  tenantId: string;
  projectId?: string;
  releaseId: string;
  packId: string;
  persistedAt: string;
  persistedBy: string;
  backend: MindFactoryPersistenceBackend;
  pinStatus: 'pinned' | 'blocked';
  rlsPartitionKey: string;
}
