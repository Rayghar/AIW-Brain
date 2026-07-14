import type { KnowledgeLibrary } from '@aiw/domain';

// =============================================================================
// KNOWLEDGE RELEASE MANAGER (Sprint 8.8.0) — knowledge releases treated like
// software releases: candidate → diff → validate → promote | rollback, with
// tenant/project pinning. Pure state machine; persistence lives in the API
// repositories; every transition yields an audit event for the admin trail.
//
// This is also where the "twelve attributes" stop being special: a calibration
// change is just one diff entry inside a candidate release, validated by the
// same gates as everything else.
// =============================================================================

export interface StagedRecordChange {
  recordId: string;
  recordType: string;
  change: 'added' | 'removed' | 'modified';
  fieldChanges?: Array<{ field: string; before: unknown; after: unknown }> | undefined;
}

export interface KnowledgeReleaseCandidate {
  candidateId: string;
  baseReleaseId: string;
  createdBy: string;
  createdAt: string;
  status: 'draft' | 'candidate' | 'under-review' | 'approved' | 'released' | 'superseded' | 'rolled-back' | 'blocked';
  changes: StagedRecordChange[];
}

export interface ReleaseValidationResult {
  allowed: boolean;
  checks: Array<{ id: string; ok: boolean; detail: string }>;
}

export interface ReleaseAuditEvent {
  actor: string;
  action: string;
  candidateId: string;
  at: string;
  detail: string;
}

type AnyRecord = Record<string, unknown> & { id: string; recordType?: string };

const allRecords = (kb: KnowledgeLibrary): AnyRecord[] =>
  [...(kb.architectureStyles as unknown as AnyRecord[]), ...(kb.patterns as unknown as AnyRecord[])];

/** Diff a proposed library against the current one into an auditable change set. */
export function diffKnowledge(current: KnowledgeLibrary, proposed: KnowledgeLibrary): StagedRecordChange[] {
  const before = new Map(allRecords(current).map((record) => [record.id, record]));
  const after = new Map(allRecords(proposed).map((record) => [record.id, record]));
  const changes: StagedRecordChange[] = [];
  for (const [id, record] of after) if (!before.has(id)) changes.push({ recordId: id, recordType: String(record.recordType ?? ''), change: 'added' });
  for (const [id, record] of before) if (!after.has(id)) changes.push({ recordId: id, recordType: String(record.recordType ?? ''), change: 'removed' });
  for (const [id, recordAfter] of after) {
    const recordBefore = before.get(id);
    if (!recordBefore) continue;
    const fieldChanges: StagedRecordChange['fieldChanges'] = [];
    const fields = new Set([...Object.keys(recordBefore), ...Object.keys(recordAfter)]);
    for (const field of fields) {
      const a = JSON.stringify(recordBefore[field]); const b = JSON.stringify(recordAfter[field]);
      if (a !== b) fieldChanges.push({ field, before: recordBefore[field], after: recordAfter[field] });
    }
    if (fieldChanges.length) changes.push({ recordId: id, recordType: String(recordAfter.recordType ?? ''), change: 'modified', fieldChanges });
  }
  return changes;
}

export function createCandidate(baseReleaseId: string, createdBy: string, changes: StagedRecordChange[], now = new Date()): { candidate: KnowledgeReleaseCandidate; audit: ReleaseAuditEvent } {
  const candidate: KnowledgeReleaseCandidate = {
    candidateId: `AKR-CAND-${now.getTime().toString(36)}`,
    baseReleaseId, createdBy, createdAt: now.toISOString(), status: 'candidate', changes,
  };
  return { candidate, audit: { actor: createdBy, action: 'release.candidate.created', candidateId: candidate.candidateId, at: candidate.createdAt, detail: `${changes.length} staged change(s) on ${baseReleaseId}` } };
}

/**
 * Validation gates for a candidate. Mirrors the constitution: counting
 * predicate on the RESULTING library, anti-placebo on calibrated attributes,
 * contradiction scan hook, and — the non-negotiable — candidate changes have
 * ZERO influence on production recommendations until promotion.
 */
export interface RegressionScenario { id: string; drivers: Record<string, number>; expectedLeaders: string[]; context?: { problemShapes?: string[] } | undefined; }

const SPECIAL_SHAPES: Record<string, string> = { 'STYLE-PIPELINE': 'dataPipeline', 'STYLE-MICROKERNEL': 'pluginPlatform' };

function rankForValidation(library: KnowledgeLibrary, drivers: Record<string, number>, shapes: string[] = []): string | undefined {
  const production = new Set(library.qualityAttributes.filter((a) => (a as { calibrationStatus?: string }).calibrationStatus === 'production').map((a) => a.id));
  const priorities = Object.entries(drivers).filter(([attributeId, weight]) => weight > 0 && production.has(attributeId));
  const totalWeight = priorities.reduce((sum, [, weight]) => sum + weight, 0) || 1;
  return library.architectureStyles
    .map((style) => ({
      id: style.id,
      applicable: !SPECIAL_SHAPES[style.id] || shapes.includes(SPECIAL_SHAPES[style.id]!),
      score: priorities.reduce((sum, [attributeId, weight]) => sum + (style.qualityAttributeRatings[attributeId] ?? 3) * weight, 0) / (totalWeight * 5)
        + (SPECIAL_SHAPES[style.id] && shapes.includes(SPECIAL_SHAPES[style.id]!) ? 0.15 : 0),
    }))
    .filter((entry) => entry.applicable)
    .sort((a, b) => b.score - a.score)[0]?.id;
}

export function validateCandidate(
  resulting: KnowledgeLibrary,
  policy: { requiredFieldsByType: Record<string, string[]>; approvedEvidencePrefixes?: string[]; reviewedStatuses?: string[] },
  openContradictions: number,
  regressionScenarios: RegressionScenario[] = [],
): ReleaseValidationResult {
  const checks: ReleaseValidationResult['checks'] = [];
  const filled = (record: AnyRecord, field: string) => { const v = record[field]; if (v == null) return false; if (typeof v === 'string') return v.trim().length > 0; if (Array.isArray(v)) return v.length > 0; if (typeof v === 'object') return Object.keys(v as object).length > 0; return true; };
  const approvedStatuses = new Set(policy.reviewedStatuses ?? ['reviewed', 'approved']);
  let statusWithoutSubstance = 0;
  for (const record of allRecords(resulting)) {
    if (!approvedStatuses.has(String(record.status))) continue;
    const required = policy.requiredFieldsByType[String(record.recordType)] ?? policy.requiredFieldsByType.default ?? [];
    if (required.some((field) => !filled(record, field))) statusWithoutSubstance += 1;
  }
  checks.push({ id: 'counting-predicate', ok: statusWithoutSubstance === 0, detail: statusWithoutSubstance ? `${statusWithoutSubstance} record(s) claim review status without substance` : 'status implies substance for every reviewed record' });

  const rated = new Set<string>();
  for (const style of resulting.architectureStyles) Object.keys(style.qualityAttributeRatings ?? {}).forEach((key) => rated.add(key));
  const falseFlags = resulting.qualityAttributes.filter((attribute) => (attribute as { calibrated?: boolean }).calibrated === true && !rated.has(attribute.id));
  checks.push({ id: 'calibration-truthfulness', ok: falseFlags.length === 0, detail: falseFlags.length ? `calibrated flag without ratings: ${falseFlags.map((a) => a.id).join(', ')}` : 'calibrated flags truthful' });

  checks.push({ id: 'contradictions', ok: openContradictions === 0, detail: openContradictions ? `${openContradictions} unresolved contradiction(s) — context splits required` : 'no unresolved contradictions' });

  if (regressionScenarios.length) {
    const failures = regressionScenarios.filter((scenario) => {
      const leader = rankForValidation(resulting, scenario.drivers, scenario.context?.problemShapes ?? []);
      return !leader || !scenario.expectedLeaders.includes(leader);
    });
    checks.push({ id: 'scenario-regression', ok: failures.length === 0, detail: failures.length ? `${failures.length}/${regressionScenarios.length} scenarios regress: ${failures.slice(0, 3).map((f) => f.id).join(', ')}` : `${regressionScenarios.length} scenarios stable under the proposed release` });

    const productionAttributes = resulting.qualityAttributes.filter((a) => (a as { calibrationStatus?: string }).calibrationStatus === 'production').map((a) => a.id);
    const inert = productionAttributes.filter((attributeId) => {
      const ratings = resulting.architectureStyles
        .map((style) => style.qualityAttributeRatings?.[attributeId])
        .filter((rating): rating is number => typeof rating === 'number');
      return ratings.length === 0 || new Set(ratings).size <= 1;
    });
    checks.push({ id: 'anti-placebo', ok: inert.length === 0, detail: inert.length ? `production attributes with no rating differentiation: ${inert.join(', ')}` : 'every production attribute differentiates at least one architecture option' });
  }

  return { allowed: checks.every((check) => check.ok), checks };
}

export function promoteCandidate(candidate: KnowledgeReleaseCandidate, validation: ReleaseValidationResult, actor: string, newReleaseId: string, now = new Date()): { candidate: KnowledgeReleaseCandidate; releaseId?: string; audit: ReleaseAuditEvent; error?: string } {
  if (!actor || actor.trim().length < 2) return { candidate, audit: audit(actor, 'release.promotion.rejected', candidate, now, 'named actor required'), error: 'NAMED_ACTOR_REQUIRED' };
  if (candidate.status !== 'candidate' && candidate.status !== 'approved') return { candidate, audit: audit(actor, 'release.promotion.rejected', candidate, now, `status ${candidate.status}`), error: 'INVALID_STATUS' };
  if (!validation.allowed) return { candidate: { ...candidate, status: 'blocked' }, audit: audit(actor, 'release.promotion.blocked', candidate, now, validation.checks.filter((c) => !c.ok).map((c) => c.id).join(',')), error: 'VALIDATION_FAILED' };
  return { candidate: { ...candidate, status: 'released' }, releaseId: newReleaseId, audit: audit(actor, 'release.promoted', candidate, now, `→ ${newReleaseId}`) };
}

export function rollbackRelease(candidate: KnowledgeReleaseCandidate, actor: string, reason: string, now = new Date()): { candidate: KnowledgeReleaseCandidate; audit: ReleaseAuditEvent } {
  return { candidate: { ...candidate, status: 'rolled-back' }, audit: audit(actor, 'release.rolled-back', candidate, now, reason) };
}

export interface ReleasePin { scope: 'tenant' | 'project'; scopeId: string; releaseId: string; pinnedBy: string; pinnedAt: string; }
export function pinRelease(scope: ReleasePin['scope'], scopeId: string, releaseId: string, actor: string, now = new Date()): { pin: ReleasePin; audit: ReleaseAuditEvent } {
  const pin: ReleasePin = { scope, scopeId, releaseId, pinnedBy: actor, pinnedAt: now.toISOString() };
  return { pin, audit: { actor, action: 'release.pinned', candidateId: releaseId, at: pin.pinnedAt, detail: `${scope}:${scopeId} → ${releaseId}` } };
}

const audit = (actor: string, action: string, candidate: KnowledgeReleaseCandidate, now: Date, detail: string): ReleaseAuditEvent =>
  ({ actor, action, candidateId: candidate.candidateId, at: now.toISOString(), detail });
