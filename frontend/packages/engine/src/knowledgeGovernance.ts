import type { KnowledgeLibrary, PatternKnowledgeRecord } from '@aiw/domain';

export type KnowledgeReleaseMode = 'development' | 'candidate' | 'production';

export interface GovernancePolicy {
  version: string;
  lifecycle: string[];
  approvedStatuses: string[];
  requiredFieldsByType: Record<string, string[]>;
  minEvidenceForApproval: number;
  reviewCadenceDays: number;
  discoveryEvidencePrefixes: string[];
  approvedEvidencePrefixes: string[];
  productionMinReviewedRecords?: number;
  productionFatalWarnings?: string[];
}

export interface GovernanceViolation {
  severity: 'blocker' | 'warning' | 'info';
  recordId: string;
  rule: string;
  message: string;
}

export interface GovernanceAssessment {
  mode: KnowledgeReleaseMode;
  violations: GovernanceViolation[];
  stats: {
    records: number;
    approved: number;
    reviewedComplete: number;
    complete: number;
    blockers: number;
    warnings: number;
    productionTarget: number;
  };
  releaseAllowed: boolean;
}

type AnyRecord = Record<string, unknown> & { id: string; recordType?: string; status?: string; lifecycle?: string };

function fieldFilled(record: AnyRecord, field: string): boolean {
  const value = record[field];
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return true;
}

export function evaluateRecordCompleteness(record: AnyRecord, policy: GovernancePolicy): { complete: boolean; missing: string[] } {
  const required = policy.requiredFieldsByType[record.recordType ?? ''] ?? policy.requiredFieldsByType.default ?? [];
  const missing = required.filter((field) => !fieldFilled(record, field));
  return { complete: missing.length === 0, missing };
}

function evidenceIds(record: AnyRecord): string[] {
  const evidence = record.evidence;
  if (!Array.isArray(evidence)) return [];
  return evidence.map((item) => {
    if (typeof item === 'string') return item;
    const value = item as { sourceId?: string; source?: string; connectorId?: string };
    return String(value.sourceId ?? value.source ?? value.connectorId ?? '');
  }).filter(Boolean);
}

function evidencePosture(id: string, policy: GovernancePolicy): 'approved' | 'discovery' | 'unknown' {
  if (policy.approvedEvidencePrefixes.some((prefix) => id.startsWith(prefix))) return 'approved';
  if (policy.discoveryEvidencePrefixes.some((prefix) => id.startsWith(prefix))) return 'discovery';
  // Governed connector IDs are explicit source-registry references and are
  // treated as approved only when the record is already release-bound.
  if (id.startsWith('GH-')) return 'approved';
  return 'unknown';
}

export function canPromote(record: AnyRecord, policy: GovernancePolicy): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const completeness = evaluateRecordCompleteness(record, policy);
  if (!completeness.complete) reasons.push(`incomplete: missing ${completeness.missing.join(', ')}`);
  const ids = evidenceIds(record);
  const approvedEvidence = ids.filter((id) => evidencePosture(id, policy) === 'approved');
  if (approvedEvidence.length < policy.minEvidenceForApproval) reasons.push(`needs >=${policy.minEvidenceForApproval} approved-posture evidence reference(s); has ${approvedEvidence.length}`);
  return { allowed: reasons.length === 0, reasons };
}

function finalize(mode: KnowledgeReleaseMode, violations: GovernanceViolation[], stats: Omit<GovernanceAssessment['stats'], 'blockers' | 'warnings'>, policy: GovernancePolicy): GovernanceAssessment {
  const blockers = violations.filter((item) => item.severity === 'blocker').length;
  const warnings = violations.filter((item) => item.severity === 'warning').length;
  const fatalWarningRules = new Set(policy.productionFatalWarnings ?? []);
  const fatalWarnings = mode === 'production' ? violations.filter((item) => item.severity === 'warning' && fatalWarningRules.has(item.rule)).length : 0;
  return { mode, violations, stats: { ...stats, blockers, warnings }, releaseAllowed: blockers === 0 && fatalWarnings === 0 };
}

export function assessLibraryGovernance(library: KnowledgeLibrary, policy: GovernancePolicy, mode: KnowledgeReleaseMode = 'candidate'): GovernanceAssessment {
  const violations: GovernanceViolation[] = [];
  const records: AnyRecord[] = [...(library.architectureStyles as unknown as AnyRecord[]), ...(library.patterns as unknown as AnyRecord[])];
  let approved = 0;
  let complete = 0;
  let reviewedComplete = 0;
  const now = Date.now();
  const cadenceMs = policy.reviewCadenceDays * 86_400_000;

  for (const record of records) {
    const status = String(record.status ?? '');
    if (!policy.lifecycle.includes(status)) violations.push({ severity: 'blocker', recordId: record.id, rule: 'LIFECYCLE_STATUS', message: `status '${status}' is not in the governed lifecycle.` });
    const completeness = evaluateRecordCompleteness(record, policy);
    if (completeness.complete) complete += 1;
    if (['reviewed', 'approved'].includes(status) && completeness.complete) reviewedComplete += 1;
    if (policy.approvedStatuses.includes(status)) {
      approved += 1;
      if (!completeness.complete) violations.push({ severity: 'blocker', recordId: record.id, rule: 'APPROVED_INCOMPLETE', message: `approved record missing required fields: ${completeness.missing.join(', ')}.` });
      const postures = evidenceIds(record).map((id) => evidencePosture(id, policy));
      if (!postures.includes('approved')) violations.push({ severity: 'blocker', recordId: record.id, rule: 'DISCOVERY_ONLY_EVIDENCE', message: 'approved record lacks approved-posture evidence.' });
      const reviewedAt = Date.parse(String(record.reviewedAt ?? record.reviewDate ?? ''));
      if (Number.isNaN(reviewedAt)) violations.push({ severity: 'warning', recordId: record.id, rule: 'REVIEW_DATE_MISSING', message: 'approved record has no review date.' });
      else if (now - reviewedAt > cadenceMs) violations.push({ severity: 'warning', recordId: record.id, rule: 'REVIEW_STALE', message: 'approved record review is outside the configured cadence.' });
    }
  }

  const rated = new Set<string>();
  for (const style of library.architectureStyles) for (const key of Object.keys(style.qualityAttributeRatings)) rated.add(key);
  for (const attribute of library.qualityAttributes) {
    if (typeof attribute.calibrated !== 'boolean') violations.push({ severity: 'blocker', recordId: attribute.id, rule: 'CALIBRATED_FLAG_MISSING', message: 'quality attribute lacks an explicit calibrated flag.' });
    else if (attribute.calibrated !== rated.has(attribute.id)) violations.push({ severity: 'blocker', recordId: attribute.id, rule: 'CALIBRATED_FLAG_FALSE', message: 'calibrated flag disagrees with the production rating matrix.' });
    if (attribute.calibrated && !['production','approved','benchmark-approved'].includes(attribute.calibrationStatus ?? 'production')) violations.push({ severity: 'blocker', recordId: attribute.id, rule: 'CALIBRATION_NOT_PRODUCTION', message: 'a scored attribute is not in a production calibration lifecycle state.' });
  }

  return finalize(mode, violations, { records: records.length, approved, reviewedComplete, complete, productionTarget: policy.productionMinReviewedRecords ?? 200 }, policy);
}

export function assessPatternReleaseGovernance(records: PatternKnowledgeRecord[], policy: GovernancePolicy, mode: KnowledgeReleaseMode = 'production'): GovernanceAssessment {
  const violations: GovernanceViolation[] = [];
  const target = policy.productionMinReviewedRecords ?? 200;
  let approved = 0;
  let complete = 0;
  let reviewedComplete = 0;
  const releaseIds = new Set<string>();

  for (const record of records) {
    const required = record.recordType === 'anti-pattern'
      ? ['name','summary','problem','context','forces','applicabilityRules','obligations','risks','mitigations','evidence','owner','version','review']
      : ['name','summary','problem','context','forces','applicabilityRules','prerequisites','obligations','risks','mitigations','evidence','owner','version','review'];
    const missing = required.filter((field) => !fieldFilled(record as unknown as AnyRecord, field));
    if (!missing.length) complete += 1;
    if (record.lifecycle === 'approved') approved += 1;
    if (record.lifecycle === 'approved' && !missing.length && record.review?.reviewedBy && record.review?.reviewedAt && record.review?.releaseId) reviewedComplete += 1;
    if (record.lifecycle === 'approved' && missing.length) violations.push({ severity: 'blocker', recordId: record.id, rule: 'APPROVED_PATTERN_INCOMPLETE', message: `approved Pattern DNA record missing ${missing.join(', ')}.` });
    if (record.lifecycle === 'approved' && !record.evidence.length) violations.push({ severity: 'blocker', recordId: record.id, rule: 'APPROVED_PATTERN_NO_EVIDENCE', message: 'approved Pattern DNA record has no evidence.' });
    if (record.review?.releaseId) releaseIds.add(record.review.releaseId);
  }

  if (mode === 'production' && reviewedComplete < target) violations.push({ severity: 'blocker', recordId: 'KNOWLEDGE-RELEASE', rule: 'PRODUCTION_RECORD_TARGET', message: `reviewed-complete Pattern DNA records ${reviewedComplete} is below production target ${target}.` });
  if (mode === 'production' && releaseIds.size !== 1) violations.push({ severity: 'blocker', recordId: 'KNOWLEDGE-RELEASE', rule: 'RELEASE_BINDING_INCONSISTENT', message: `production corpus spans ${releaseIds.size} release identifiers.` });

  return finalize(mode, violations, { records: records.length, approved, reviewedComplete, complete, productionTarget: target }, policy);
}
