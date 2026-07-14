import type { KnowledgeLibrary } from '@aiw/domain';
import type { AiPrompt } from './aiContracts.js';
import type { GovernancePolicy } from './knowledgeGovernance.js';
import { evaluateRecordCompleteness } from './knowledgeGovernance.js';

// -----------------------------------------------------------------------------
// Record drafting (Sprint 8.3) — the LLM-powered half of the promotion bridge.
// The mesh produces quarantined evidence and claim candidates; this contract
// has the LLM DRAFT a complete Pattern-DNA record from them, plus a reviewer
// brief (gaps, contradictions, recommendation). Invariants:
//   * a drafted record is ALWAYS status 'candidate' — the sanitizer forces it,
//   * evidence may cite ONLY the supplied source ids (others are dropped),
//   * owner stays empty: promotion is a named-human act via canPromote,
//   * missing required fields are reported, never invented silently.
// The LLM accelerates curation; it cannot promote. Governance stays mechanical.
// -----------------------------------------------------------------------------

export interface DraftEvidenceInput {
  id: string;
  excerpt: string;
}

export interface DraftClaimInput {
  claimType: string;
  predicate: string;
  object: string;
}

export interface RecordDraftRequest {
  recordType: 'architectureStyle' | 'pattern';
  subjectName: string;
  evidence: DraftEvidenceInput[];
  claims: DraftClaimInput[];
}

export interface ReviewerBrief {
  completenessGaps: string[];
  contradictions: string[];
  promotionRecommendation: string;
}

export interface DraftedRecordResult {
  record: Record<string, unknown>;
  reviewerBrief: ReviewerBrief;
  missingRequired: string[];
}

function slugId(recordType: RecordDraftRequest['recordType'], name: string): string {
  const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `${recordType === 'architectureStyle' ? 'STYLE' : 'PAT'}-${slug || 'UNNAMED'}`;
}

export function buildRecordDraftPrompt(
  request: RecordDraftRequest,
  policy: GovernancePolicy,
  library: KnowledgeLibrary,
): AiPrompt {
  const required = policy.requiredFieldsByType[request.recordType] ?? policy.requiredFieldsByType.default ?? [];
  const existingNames = [...library.architectureStyles, ...library.patterns].map((record) => record.name).slice(0, 80);
  return {
    purpose: 'architecture-reasoning',
    schemaName: 'knowledge_record_draft',
    system: [
      'You are the knowledge editor of an architecture workbench, drafting a CANDIDATE record from supplied evidence.',
      'You never invent citations: the evidence array may reference ONLY the supplied evidence ids.',
      'If the evidence does not support a required field, leave it as an empty string or empty array — a human completes it. Do not fabricate.',
      'status must be exactly "candidate" and owner must be an empty string.',
      `Required fields to attempt: ${required.join(', ')}.`,
      'Also produce a reviewer brief: completeness gaps you left, contradictions you noticed between claims or sources, and a one-sentence promotion recommendation.',
      'Respond with ONLY minified JSON: {"record": {"id": string, "name": string, "recordType": string, "status": "candidate", "owner": "", "version": "0.1.0", ...required fields...}, "reviewerBrief": {"completenessGaps": string[] max 5, "contradictions": string[] max 3, "promotionRecommendation": string <= 30 words}}.',
    ].join(' '),
    user: JSON.stringify({
      recordType: request.recordType,
      subjectName: request.subjectName,
      avoidDuplicateOfExistingNames: existingNames,
      allowedEvidenceIds: request.evidence.map((item) => item.id),
      evidence: request.evidence.map((item) => ({ id: item.id, excerpt: item.excerpt.slice(0, 600) })).slice(0, 8),
      claims: request.claims.slice(0, 40),
    }),
  };
}

export function sanitizeDraftedRecord(
  raw: unknown,
  request: RecordDraftRequest,
  policy: GovernancePolicy,
): DraftedRecordResult {
  const value = (raw ?? {}) as Record<string, unknown>;
  const record = { ...((value.record ?? {}) as Record<string, unknown>) };
  const allowed = new Set(request.evidence.map((item) => item.id));

  record.recordType = request.recordType;
  record.status = 'candidate';
  record.owner = '';
  record.version = typeof record.version === 'string' && record.version ? String(record.version).slice(0, 12) : '0.1.0';
  record.name = String(record.name ?? request.subjectName).slice(0, 80) || request.subjectName;
  record.id = typeof record.id === 'string' && /^(STYLE|PAT)-[A-Z0-9-]+$/.test(record.id as string)
    ? record.id
    : slugId(request.recordType, record.name as string);
  record.evidence = (Array.isArray(record.evidence) ? record.evidence : [])
    .map((item) => (typeof item === 'string' ? item : String((item as { sourceId?: string }).sourceId ?? '')))
    .filter((id) => allowed.has(id));

  const briefRaw = (value.reviewerBrief ?? {}) as Record<string, unknown>;
  const list = (input: unknown, max: number) => (Array.isArray(input) ? input : []).map(String).map((item) => item.slice(0, 200)).slice(0, max);
  const reviewerBrief: ReviewerBrief = {
    completenessGaps: list(briefRaw.completenessGaps, 5),
    contradictions: list(briefRaw.contradictions, 3),
    promotionRecommendation: String(briefRaw.promotionRecommendation ?? '').slice(0, 240),
  };

  const completeness = evaluateRecordCompleteness(record as { id: string; recordType?: string }, policy);
  return { record, reviewerBrief, missingRequired: completeness.missing };
}
