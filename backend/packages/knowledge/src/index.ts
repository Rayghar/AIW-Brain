import type { KnowledgeLibrary } from '@aiw/domain';
// Knowledge Operations package (Sprint 8.8.2)
// Pure workflow/domain helpers for the Knowledge Ops Workbench. The package is
// deliberately UI/API neutral so Admin, API, worker and future Postgres
// repositories can share one governed workflow contract.

export type KnowledgeReviewDecision = 'approved' | 'rejected' | 'needs-changes' | 'context-split';
export type ClaimDecisionAction = 'approve' | 'reject' | 'request-changes';
export type TriageResolution = 'context-split' | 'source-conflict' | 'outdated-claim' | 'escalate-expert';
export type WorkItemStatus = 'open' | 'assigned' | 'in-review' | 'blocked' | 'resolved' | 'escalated';
export type KnowledgeOpsRole = 'knowledge-curator' | 'architecture-reviewer' | 'security-reviewer' | 'compliance-reviewer' | 'enterprise-architect' | 'knowledge-admin';

export interface KnowledgeOpsQueueSummary {
  pendingClaims: number;
  openContradictions: number;
  candidateReleases: number;
  staleSources: number;
  duplicateGroups: number;
  synonymGroups: number;
  assignedItems: number;
  escalatedItems: number;
}

export interface ReviewerAssignment {
  itemType: 'claim' | 'contradiction' | 'source-refresh' | 'duplicate' | 'synonym';
  itemId: string;
  reviewer: string;
  reviewerRole: KnowledgeOpsRole | string;
  secondaryReviewer?: string;
  dueAt?: string;
  status: WorkItemStatus;
  assignedBy: string;
  assignedAt: string;
}

export interface KnowledgeOpsComment {
  itemType: ReviewerAssignment['itemType'];
  itemId: string;
  author: string;
  body: string;
  visibility: 'internal' | 'reviewer' | 'audit';
  createdAt: string;
}

export interface ClaimReviewRecord {
  claimId: string;
  decision: ClaimDecisionAction;
  reviewer: string;
  rationale: string;
  conditionsAdded?: string[];
  decidedAt: string;
  status: 'recorded' | 'candidate-release-required';
}

export interface ContradictionTriageRecord {
  subjectId: string;
  predicate: string;
  resolution: TriageResolution;
  conditionsA?: string[];
  conditionsB?: string[];
  reviewer: string;
  rationale: string;
  decidedAt: string;
  status: 'recorded' | 'candidate-release-required';
}

export interface SourceRefreshRecord {
  sourceId: string;
  requestedBy: string;
  reason: string;
  requestedAt: string;
  status: 'requested' | 'queued' | 'completed' | 'blocked';
  workerHint: string;
}

export interface DuplicateResolutionRecord {
  groupId: string;
  canonicalId: string;
  duplicateIds: string[];
  resolution: 'merge' | 'keep-separate' | 'deprecate-duplicates';
  reviewer: string;
  rationale: string;
  decidedAt: string;
}

export interface SynonymResolutionRecord {
  groupId: string;
  canonicalTerm: string;
  synonyms: string[];
  scope: 'pattern' | 'style' | 'quality-attribute' | 'technology' | 'vendor-realization';
  reviewer: string;
  rationale: string;
  decidedAt: string;
}

export interface CorroborationEvidenceRef {
  sourceId: string;
  trustTier?: string;
  posture?: string;
  independent: boolean;
  note?: string;
}

export interface CorroborationAnalysis {
  itemId: string;
  supportCount: number;
  independentSupportCount: number;
  contradictionCount: number;
  confidence: 'weak' | 'moderate' | 'strong';
  recommendation: string;
  evidence: CorroborationEvidenceRef[];
  generatedAt: string;
}

export function candidateKnowledgeCanScore(posture: string): boolean {
  return posture === 'released' || posture === 'approved-production';
}

export function normalizeClaimPredicate(predicate: string): string {
  return predicate.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function normalizeWorkItemId(input: string): string {
  return input.trim().replace(/[^a-zA-Z0-9:_-]+/g, '-').replace(/^-|-$/g, '');
}

export function validateReviewerAssignment(input: Partial<ReviewerAssignment>): { ok: true; assignment: ReviewerAssignment } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.itemType) reasons.push('Item type is required.');
  if (!input.itemId?.trim()) reasons.push('Item id is required.');
  if (!input.reviewer?.trim()) reasons.push('Reviewer is required.');
  if (!input.reviewerRole?.trim()) reasons.push('Reviewer role is required.');
  if (!input.assignedBy?.trim()) reasons.push('Assigner is required.');
  if (input.dueAt && Number.isNaN(new Date(input.dueAt).getTime())) reasons.push('Due date must be a valid ISO date when supplied.');
  if (reasons.length) return { ok: false, reasons };
  return {
    ok: true,
    assignment: {
      itemType: input.itemType!,
      itemId: normalizeWorkItemId(input.itemId!),
      reviewer: input.reviewer!.trim(),
      reviewerRole: input.reviewerRole!.trim(),
      ...(input.secondaryReviewer?.trim() ? { secondaryReviewer: input.secondaryReviewer.trim() } : {}),
      ...(input.dueAt ? { dueAt: new Date(input.dueAt).toISOString() } : {}),
      status: input.status ?? 'assigned',
      assignedBy: input.assignedBy!.trim(),
      assignedAt: input.assignedAt ?? new Date().toISOString(),
    },
  };
}

export function validateComment(input: Partial<KnowledgeOpsComment>): { ok: true; comment: KnowledgeOpsComment } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.itemType) reasons.push('Item type is required.');
  if (!input.itemId?.trim()) reasons.push('Item id is required.');
  if (!input.author?.trim()) reasons.push('Author is required.');
  if (!input.body?.trim()) reasons.push('Comment body is required.');
  if (reasons.length) return { ok: false, reasons };
  return {
    ok: true,
    comment: {
      itemType: input.itemType!,
      itemId: normalizeWorkItemId(input.itemId!),
      author: input.author!.trim(),
      body: input.body!.trim(),
      visibility: input.visibility ?? 'reviewer',
      createdAt: input.createdAt ?? new Date().toISOString(),
    },
  };
}

export function validateDuplicateResolution(input: Partial<DuplicateResolutionRecord>): { ok: true; record: DuplicateResolutionRecord } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.groupId?.trim()) reasons.push('Duplicate group id is required.');
  if (!input.canonicalId?.trim()) reasons.push('Canonical id is required.');
  if (!input.duplicateIds?.length) reasons.push('At least one duplicate id is required.');
  if (!input.reviewer?.trim()) reasons.push('Reviewer is required.');
  if (!input.rationale?.trim()) reasons.push('Rationale is required.');
  if (reasons.length) return { ok: false, reasons };
  return {
    ok: true,
    record: {
      groupId: normalizeWorkItemId(input.groupId!),
      canonicalId: input.canonicalId!.trim(),
      duplicateIds: [...new Set(input.duplicateIds!.map((id) => id.trim()).filter(Boolean))],
      resolution: input.resolution ?? 'merge',
      reviewer: input.reviewer!.trim(),
      rationale: input.rationale!.trim(),
      decidedAt: input.decidedAt ?? new Date().toISOString(),
    },
  };
}

export function validateSynonymResolution(input: Partial<SynonymResolutionRecord>): { ok: true; record: SynonymResolutionRecord } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.groupId?.trim()) reasons.push('Synonym group id is required.');
  if (!input.canonicalTerm?.trim()) reasons.push('Canonical term is required.');
  if (!input.synonyms?.length) reasons.push('At least one synonym is required.');
  if (!input.reviewer?.trim()) reasons.push('Reviewer is required.');
  if (!input.rationale?.trim()) reasons.push('Rationale is required.');
  if (reasons.length) return { ok: false, reasons };
  return {
    ok: true,
    record: {
      groupId: normalizeWorkItemId(input.groupId!),
      canonicalTerm: input.canonicalTerm!.trim(),
      synonyms: [...new Set(input.synonyms!.map((term) => term.trim()).filter(Boolean))],
      scope: input.scope ?? 'pattern',
      reviewer: input.reviewer!.trim(),
      rationale: input.rationale!.trim(),
      decidedAt: input.decidedAt ?? new Date().toISOString(),
    },
  };
}

export function buildCorroborationAnalysis(input: {
  itemId: string;
  evidence?: CorroborationEvidenceRef[];
  contradictionCount?: number;
  generatedAt?: string;
}): CorroborationAnalysis {
  const evidence = input.evidence ?? [];
  const supportCount = evidence.length;
  const independentSupportCount = evidence.filter((item) => item.independent).length;
  const contradictionCount = input.contradictionCount ?? 0;
  const confidence = independentSupportCount >= 3 && contradictionCount === 0 ? 'strong'
    : independentSupportCount >= 2 && contradictionCount <= 1 ? 'moderate'
    : 'weak';
  const recommendation = confidence === 'strong'
    ? 'Eligible for release-candidate inclusion after reviewer approval.'
    : confidence === 'moderate'
      ? 'Keep in review queue; ask reviewer to attach applicability conditions.'
      : 'Do not promote; gather stronger independent evidence or escalate to expert review.';
  return { itemId: normalizeWorkItemId(input.itemId), supportCount, independentSupportCount, contradictionCount, confidence, recommendation, evidence, generatedAt: input.generatedAt ?? new Date().toISOString() };
}

export function summarizeKnowledgeOpsQueues(input: {
  claimReview?: unknown[];
  contradictions?: unknown[];
  sourceRefresh?: unknown[];
  releaseCandidates?: unknown[];
  duplicateGroups?: unknown[];
  synonymGroups?: unknown[];
  assignments?: ReviewerAssignment[];
}): KnowledgeOpsQueueSummary {
  const assignments = input.assignments ?? [];
  return {
    pendingClaims: input.claimReview?.length ?? 0,
    openContradictions: input.contradictions?.length ?? 0,
    candidateReleases: input.releaseCandidates?.length ?? 0,
    staleSources: input.sourceRefresh?.length ?? 0,
    duplicateGroups: input.duplicateGroups?.length ?? 0,
    synonymGroups: input.synonymGroups?.length ?? 0,
    assignedItems: assignments.filter((item) => item.status === 'assigned' || item.status === 'in-review').length,
    escalatedItems: assignments.filter((item) => item.status === 'escalated').length,
  };
}


// -----------------------------------------------------------------------------
// Sprint 8.8.3 — Knowledge Release Manager and durable Knowledge Ops contracts
// -----------------------------------------------------------------------------

export type KnowledgeReleaseStatus = 'draft' | 'candidate' | 'under-review' | 'approved' | 'released' | 'superseded' | 'rolled-back' | 'blocked';
export type KnowledgeReleaseScope = 'tenant' | 'project';
export type KnowledgeChangeType = 'added' | 'removed' | 'modified';

export interface KnowledgeReleaseChange {
  recordId: string;
  recordType: string;
  change: KnowledgeChangeType;
  fieldChanges?: Array<{ field: string; before: unknown; after: unknown }>;
}

export interface KnowledgeReleaseValidationCheck {
  id: string;
  ok: boolean;
  severity: 'blocker' | 'warning' | 'info';
  detail: string;
}

export interface KnowledgeReleaseValidationResult {
  allowed: boolean;
  checkedAt: string;
  checks: KnowledgeReleaseValidationCheck[];
}

export interface KnowledgeReleaseCandidateRecord {
  candidateId: string;
  baseReleaseId: string;
  proposedReleaseId?: string;
  status: KnowledgeReleaseStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  changes: KnowledgeReleaseChange[];
  proposedLibrary: KnowledgeLibrary;
  validation?: KnowledgeReleaseValidationResult;
  approvedBy?: string;
  approvedAt?: string;
  promotedBy?: string;
  promotedAt?: string;
  rolledBackBy?: string;
  rolledBackAt?: string;
  rollbackReason?: string;
}

export interface KnowledgeReleasePinRecord {
  scope: KnowledgeReleaseScope;
  scopeId: string;
  releaseId: string;
  pinnedBy: string;
  pinnedAt: string;
}

export interface KnowledgeReleaseManifest {
  releaseId: string;
  baseReleaseId: string;
  candidateId: string;
  promotedBy: string;
  promotedAt: string;
  changeCount: number;
  changes: KnowledgeReleaseChange[];
  validation: KnowledgeReleaseValidationResult;
  provenance: {
    authority: 'knowledge-release-manager';
    candidateKnowledgeInfluence: 'blocked-until-promotion';
    llmAuthority: 'none';
    rollbackAvailable: true;
  };
}

export interface KnowledgeOpsEventRecord {
  eventId: string;
  actor: string;
  action: string;
  subject: string;
  at: string;
  detail: string;
  payload?: unknown;
}



// -----------------------------------------------------------------------------
// Sprint 8.8.4 — Pattern DNA Operations contracts
// -----------------------------------------------------------------------------

export type PatternDnaEditableField =
  | 'qualityAttributeImpact'
  | 'obligations'
  | 'risks'
  | 'mitigations'
  | 'pairsWellWith'
  | 'conflictsWith'
  | 'aliases'
  | 'vendorRealizations'
  | 'requires'
  | 'fitnessTestMappings'
  | 'impactNote';

export interface PatternDnaEditRecord {
  editId: string;
  patternId: string;
  field: PatternDnaEditableField;
  value: unknown;
  editor: string;
  rationale: string;
  stagedAt: string;
  status: 'staged' | 'materialized' | 'discarded';
}

export interface PatternDnaOperationSummary {
  totalPatterns: number;
  draftOrUncuratedPatterns: number;
  stagedEdits: number;
  obligationCoverage: number;
  evidenceCoverage: number;
  compatibilityCoverage: number;
}

const PATTERN_DNA_IMPACT_MIN = -2;
const PATTERN_DNA_IMPACT_MAX = 2;

function getPatternRecords(library: KnowledgeLibrary): Array<Record<string, unknown> & { id: string; name?: string }> {
  return (library.patterns as unknown as Array<Record<string, unknown> & { id: string; name?: string }>) ?? [];
}

function getQualityAttributeIds(library: KnowledgeLibrary): Set<string> {
  return new Set(((library.qualityAttributes as unknown as Array<{ id: string }>) ?? []).map((attribute) => attribute.id));
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

export function createPatternDnaEdit(input: Partial<PatternDnaEditRecord> & { patternId: string; field: PatternDnaEditableField; value: unknown; editor: string; rationale: string; now?: Date }): PatternDnaEditRecord {
  const now = input.now ?? new Date();
  return {
    editId: input.editId ?? `PDNA-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    patternId: input.patternId,
    field: input.field,
    value: input.value,
    editor: input.editor,
    rationale: input.rationale,
    stagedAt: input.stagedAt ?? now.toISOString(),
    status: input.status ?? 'staged',
  };
}

export function validatePatternDnaEditRecord(edit: Partial<PatternDnaEditRecord>, library: KnowledgeLibrary): { ok: true; edit: PatternDnaEditRecord } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  const patterns = getPatternRecords(library);
  const pattern = patterns.find((item) => item.id === edit.patternId);
  if (!pattern) reasons.push(`Unknown pattern '${String(edit.patternId ?? '')}'.`);
  if (!edit.field) reasons.push('Editable Pattern DNA field is required.');
  if (!edit.editor?.trim()) reasons.push('A named editor is required.');
  if (!edit.rationale?.trim()) reasons.push('A rationale is required for audit and release-diff traceability.');

  if (edit.field === 'qualityAttributeImpact') {
    const impacts = edit.value as Record<string, unknown>;
    const attributeIds = getQualityAttributeIds(library);
    if (!impacts || typeof impacts !== 'object' || Array.isArray(impacts) || !Object.keys(impacts).length) reasons.push('Quality impact must be a non-empty attribute-impact object.');
    else {
      for (const [attributeId, raw] of Object.entries(impacts)) {
        if (!attributeIds.has(attributeId)) reasons.push(`Unknown quality attribute '${attributeId}'.`);
        const score = Number(raw);
        if (!Number.isInteger(score) || score < PATTERN_DNA_IMPACT_MIN || score > PATTERN_DNA_IMPACT_MAX) reasons.push(`Impact for '${attributeId}' must be an integer in [${PATTERN_DNA_IMPACT_MIN}, ${PATTERN_DNA_IMPACT_MAX}].`);
      }
    }
  }

  if (edit.field && ['obligations','risks','mitigations','pairsWellWith','conflictsWith','aliases','vendorRealizations','requires','fitnessTestMappings'].includes(edit.field)) {
    const items = toStringArray(edit.value);
    if (!items.length) reasons.push(`${edit.field} must contain at least one non-empty entry.`);
    if ((edit.field === 'pairsWellWith' || edit.field === 'conflictsWith') && items.some((id) => !patterns.some((patternRecord) => patternRecord.id === id))) {
      reasons.push(`${edit.field} contains a pattern id that is not present in the governed library.`);
    }
  }

  if (edit.field === 'impactNote' && (typeof edit.value !== 'string' || !edit.value.trim())) reasons.push('Impact note must be a non-empty string.');

  if (reasons.length) return { ok: false, reasons };
  return { ok: true, edit: createPatternDnaEdit(edit as PatternDnaEditRecord & { now?: Date }) };
}

export function summarizePatternDnaOperations(library: KnowledgeLibrary, stagedEdits: PatternDnaEditRecord[]): PatternDnaOperationSummary {
  const patterns = getPatternRecords(library);
  const total = patterns.length || 1;
  const obligationCoverage = Math.round((patterns.filter((pattern) => toStringArray(pattern.obligations).length > 0).length / total) * 100);
  const evidenceCoverage = Math.round((patterns.filter((pattern) => toStringArray(pattern.evidence).length > 0).length / total) * 100);
  const compatibilityCoverage = Math.round((patterns.filter((pattern) => toStringArray(pattern.pairsWellWith).length || toStringArray(pattern.conflictsWith).length).length / total) * 100);
  return {
    totalPatterns: patterns.length,
    draftOrUncuratedPatterns: patterns.filter((pattern) => String(pattern.status ?? '').includes('draft') || String(pattern.impactProvenance ?? '').includes('pending')).length,
    stagedEdits: stagedEdits.filter((edit) => edit.status === 'staged').length,
    obligationCoverage,
    evidenceCoverage,
    compatibilityCoverage,
  };
}

export function applyPatternDnaEditsToLibrary(library: KnowledgeLibrary, edits: PatternDnaEditRecord[]): KnowledgeLibrary {
  const proposed: KnowledgeLibrary = JSON.parse(JSON.stringify(library)) as KnowledgeLibrary;
  const patterns = getPatternRecords(proposed);
  for (const edit of edits.filter((item) => item.status === 'staged')) {
    const pattern = patterns.find((item) => item.id === edit.patternId);
    if (!pattern) continue;
    pattern[edit.field] = edit.value;
    pattern.patternDnaLastStagedBy = edit.editor;
    pattern.patternDnaLastStagedAt = edit.stagedAt;
    pattern.patternDnaGovernance = 'release-candidate-required';
  }
  return proposed;
}

export interface KnowledgeOpsDurableSnapshot {
  candidates: KnowledgeReleaseCandidateRecord[];
  stagedPatternEdits: PatternDnaEditRecord[];
  releasedManifests: KnowledgeReleaseManifest[];
  pins: KnowledgeReleasePinRecord[];
  events: KnowledgeOpsEventRecord[];
}

export interface KnowledgeOpsRepositoryPort {
  snapshot(): KnowledgeOpsDurableSnapshot;
  listPatternDnaEdits(): PatternDnaEditRecord[];
  savePatternDnaEdit(edit: PatternDnaEditRecord): void | Promise<void>;
  discardPatternDnaEdit(editId: string, actor: string): PatternDnaEditRecord | undefined | Promise<PatternDnaEditRecord | undefined>;
  clearMaterializedPatternDnaEdits(editIds: string[]): void | Promise<void>;
  listCandidates(): KnowledgeReleaseCandidateRecord[];
  getCandidate(candidateId: string): KnowledgeReleaseCandidateRecord | undefined;
  saveCandidate(candidate: KnowledgeReleaseCandidateRecord): void | Promise<void>;
  listReleasedManifests(): KnowledgeReleaseManifest[];
  saveReleasedManifest(manifest: KnowledgeReleaseManifest): void | Promise<void>;
  listPins(): KnowledgeReleasePinRecord[];
  savePin(pin: KnowledgeReleasePinRecord): void | Promise<void>;
  recordEvent(event: KnowledgeOpsEventRecord): void | Promise<void>;
  listEvents(limit?: number): KnowledgeOpsEventRecord[];
}

type AnyKnowledgeRecord = Record<string, unknown> & { id: string; recordType?: string };

function allKnowledgeRecords(library: KnowledgeLibrary): AnyKnowledgeRecord[] {
  return [...(library.architectureStyles as unknown as AnyKnowledgeRecord[]), ...(library.patterns as unknown as AnyKnowledgeRecord[])];
}

export function diffKnowledgeLibraries(current: KnowledgeLibrary, proposed: KnowledgeLibrary): KnowledgeReleaseChange[] {
  const before = new Map(allKnowledgeRecords(current).map((record) => [record.id, record]));
  const after = new Map(allKnowledgeRecords(proposed).map((record) => [record.id, record]));
  const changes: KnowledgeReleaseChange[] = [];
  for (const [id, record] of after) {
    if (!before.has(id)) changes.push({ recordId: id, recordType: String(record.recordType ?? 'unknown'), change: 'added' });
  }
  for (const [id, record] of before) {
    if (!after.has(id)) changes.push({ recordId: id, recordType: String(record.recordType ?? 'unknown'), change: 'removed' });
  }
  for (const [id, recordAfter] of after) {
    const recordBefore = before.get(id);
    if (!recordBefore) continue;
    const fieldChanges: NonNullable<KnowledgeReleaseChange['fieldChanges']> = [];
    const fields = new Set([...Object.keys(recordBefore), ...Object.keys(recordAfter)]);
    for (const field of fields) {
      const beforeValue = JSON.stringify(recordBefore[field]);
      const afterValue = JSON.stringify(recordAfter[field]);
      if (beforeValue !== afterValue) fieldChanges.push({ field, before: recordBefore[field], after: recordAfter[field] });
    }
    if (fieldChanges.length) changes.push({ recordId: id, recordType: String(recordAfter.recordType ?? 'unknown'), change: 'modified', fieldChanges });
  }
  return changes;
}

export function createKnowledgeReleaseCandidate(input: {
  currentLibrary: KnowledgeLibrary;
  proposedLibrary: KnowledgeLibrary;
  actor: string;
  now?: Date;
}): KnowledgeReleaseCandidateRecord {
  const now = input.now ?? new Date();
  const baseReleaseId = input.currentLibrary.knowledgeReleaseId ?? input.currentLibrary.version ?? 'AKR-unversioned';
  const candidateId = `AKR-CAND-${now.getTime().toString(36)}`;
  return {
    candidateId,
    baseReleaseId,
    ...(input.proposedLibrary.knowledgeReleaseId ? { proposedReleaseId: input.proposedLibrary.knowledgeReleaseId } : {}),
    status: 'candidate',
    createdBy: input.actor,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    changes: diffKnowledgeLibraries(input.currentLibrary, input.proposedLibrary),
    proposedLibrary: input.proposedLibrary,
  };
}

export function validateKnowledgeReleaseCandidate(input: {
  candidate: KnowledgeReleaseCandidateRecord;
  currentReleaseId: string;
  openContradictions: number;
  candidateInfluencesProduction?: boolean;
  licenseBlockers?: number;
  regressionFailures?: number;
  now?: Date;
}): KnowledgeReleaseValidationResult {
  const checks: KnowledgeReleaseValidationCheck[] = [
    { id: 'candidate-has-changes', ok: input.candidate.changes.length > 0, severity: 'blocker', detail: input.candidate.changes.length ? `${input.candidate.changes.length} governed change(s) staged` : 'candidate contains no staged changes' },
    { id: 'no-candidate-to-production-leakage', ok: input.candidateInfluencesProduction !== true, severity: 'blocker', detail: input.candidateInfluencesProduction === true ? 'candidate knowledge influenced production scoring before promotion' : 'candidate knowledge remains isolated from production recommendations' },
    { id: 'release-base-match', ok: Boolean(input.candidate.baseReleaseId && input.currentReleaseId), severity: 'blocker', detail: `${input.candidate.baseReleaseId} compared against ${input.currentReleaseId}` },
    { id: 'contradiction-gate', ok: input.openContradictions === 0, severity: 'blocker', detail: input.openContradictions ? `${input.openContradictions} unresolved contradiction(s)` : 'no unresolved contradictions in proposed release' },
    { id: 'license-provenance-gate', ok: (input.licenseBlockers ?? 0) === 0, severity: 'blocker', detail: input.licenseBlockers ? `${input.licenseBlockers} licence/provenance blocker(s)` : 'no licence/provenance blockers detected' },
    { id: 'scenario-regression-gate', ok: (input.regressionFailures ?? 0) === 0, severity: 'blocker', detail: input.regressionFailures ? `${input.regressionFailures} scenario regression(s)` : 'scenario regression gate passed or no regressions supplied' },
  ];
  return { allowed: checks.filter((check) => check.severity === 'blocker').every((check) => check.ok), checkedAt: (input.now ?? new Date()).toISOString(), checks };
}

export function approveKnowledgeReleaseCandidate(candidate: KnowledgeReleaseCandidateRecord, actor: string, now = new Date()): KnowledgeReleaseCandidateRecord {
  return { ...candidate, status: 'approved', approvedBy: actor, approvedAt: now.toISOString(), updatedAt: now.toISOString() };
}

export function promoteKnowledgeReleaseCandidate(input: {
  candidate: KnowledgeReleaseCandidateRecord;
  actor: string;
  releaseId?: string;
  now?: Date;
}): { candidate: KnowledgeReleaseCandidateRecord; manifest: KnowledgeReleaseManifest } | { error: string; candidate: KnowledgeReleaseCandidateRecord } {
  const now = input.now ?? new Date();
  const validation = input.candidate.validation;
  if (input.candidate.status !== 'candidate' && input.candidate.status !== 'approved') return { error: 'INVALID_STATUS', candidate: input.candidate };
  if (!validation?.allowed) return { error: 'VALIDATION_REQUIRED', candidate: { ...input.candidate, status: 'blocked', updatedAt: now.toISOString() } };
  const releaseId = input.releaseId ?? input.candidate.proposedReleaseId ?? `AKR-${now.toISOString().slice(0, 10)}-${input.candidate.candidateId.slice(-4)}`;
  const candidate: KnowledgeReleaseCandidateRecord = { ...input.candidate, status: 'released', proposedReleaseId: releaseId, promotedBy: input.actor, promotedAt: now.toISOString(), updatedAt: now.toISOString() };
  const manifest: KnowledgeReleaseManifest = {
    releaseId,
    baseReleaseId: candidate.baseReleaseId,
    candidateId: candidate.candidateId,
    promotedBy: input.actor,
    promotedAt: now.toISOString(),
    changeCount: candidate.changes.length,
    changes: candidate.changes,
    validation,
    provenance: {
      authority: 'knowledge-release-manager',
      candidateKnowledgeInfluence: 'blocked-until-promotion',
      llmAuthority: 'none',
      rollbackAvailable: true,
    },
  };
  return { candidate, manifest };
}

export function rollbackKnowledgeReleaseCandidate(candidate: KnowledgeReleaseCandidateRecord, actor: string, reason: string, now = new Date()): KnowledgeReleaseCandidateRecord {
  return { ...candidate, status: 'rolled-back', rolledBackBy: actor, rolledBackAt: now.toISOString(), rollbackReason: reason, updatedAt: now.toISOString() };
}

export function pinKnowledgeRelease(input: { scope: KnowledgeReleaseScope; scopeId: string; releaseId: string; actor: string; now?: Date }): KnowledgeReleasePinRecord {
  return { scope: input.scope, scopeId: normalizeWorkItemId(input.scopeId), releaseId: input.releaseId, pinnedBy: input.actor, pinnedAt: (input.now ?? new Date()).toISOString() };
}

export function releaseManifestToJson(manifest: KnowledgeReleaseManifest): string {
  return JSON.stringify(manifest, null, 2);
}

export function buildKnowledgeOpsEvent(input: Omit<KnowledgeOpsEventRecord, 'eventId' | 'at'> & { eventId?: string; at?: string }): KnowledgeOpsEventRecord {
  const at = input.at ?? new Date().toISOString();
  return { eventId: input.eventId ?? `KOE-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, actor: input.actor, action: input.action, subject: input.subject, at, detail: input.detail, ...(input.payload !== undefined ? { payload: input.payload } : {}) };
}

export * from './mindFactory.js';

export * from './aiwKpack.js';
export * from './knowledgeFabric.js';

export * from "./governedKnowledgeCycle.js";

export * from "./governedGithubKnowledgeConversion.js";
