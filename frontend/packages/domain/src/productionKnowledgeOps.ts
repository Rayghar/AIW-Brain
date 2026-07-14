export const conformanceSourceTypes = ['archunit','jqassistant','spring-modulith','openapi','asyncapi','terraform','kubernetes','runtime-inventory','opentelemetry','generic'] as const;
export type ConformanceSourceType = (typeof conformanceSourceTypes)[number];

export interface ConformanceEvidenceEnvelope {
  id: string;
  projectId: string;
  branchId: string;
  sourceType: ConformanceSourceType;
  repositoryUrl?: string;
  commitSha?: string;
  workflowRunId?: string;
  environment?: string;
  collectedAt: string;
  payload: unknown;
}

export interface ArchitectureConformanceFinding {
  id: string;
  evidenceId: string;
  projectId: string;
  branchId: string;
  architectureObjectId?: string;
  decisionId?: string;
  ruleId: string;
  severity: 'info'|'warning'|'high'|'critical';
  status: 'open'|'accepted'|'remediated'|'waived'|'false-positive';
  title: string;
  description: string;
  remediation?: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface KnowledgeReleaseSignature {
  releaseId: string;
  checksumSha256: string;
  signatureAlgorithm: 'Ed25519';
  publicKeyId: string;
  publicKeyPem: string;
  signatureBase64: string;
  signedBy: string;
  signedAt: string;
  verificationStatus: 'valid'|'invalid'|'unverified';
}

export interface KnowledgeRefreshExecution {
  id: string;
  connectorId: string;
  triggerType: 'scheduled'|'manual'|'webhook';
  status: 'queued'|'running'|'quarantined'|'review-required'|'failed'|'cancelled'|'published';
  requestedRevision?: string;
  resolvedRevision?: string;
  snapshotId?: string;
  objectManifestUri?: string;
  requestedBy: string;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  result: Record<string, unknown>;
  errorCode?: string;
}
