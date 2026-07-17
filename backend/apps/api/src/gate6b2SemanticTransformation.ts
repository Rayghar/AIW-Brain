import { createHash } from 'node:crypto';
import { canonicalEpistemicStatuses, type CanonicalEpistemicStatus, type EpistemicStatementOrigin } from '@aiw/domain';
import { scoreEvidenceSupport } from './approvedKnowledgeGrounding.js';
import type { Gate6bEvidenceUnit } from './gate6bSemanticTransformation.js';

export const GATE6B2_PROMPT_VERSION = 'gate-6b2-typed-semantic-assets-v1' as const;
export const GATE6B2_SCHEMA_VERSION = 'aiw-gate-6b2-typed-semantic-assets-v1' as const;
export const GATE6B2_LEXICAL_SCREENING_THRESHOLD = 0.60;
export const NO_EVIDENCE_ID = 'NO-EVIDENCE';

export const gate6b2Dispositions = [
  'atomic-claim-candidate', 'structured-asset-candidate', 'source-reference',
  'procedure-or-runbook-step', 'non-claim', 'abstain-insufficient-evidence',
] as const;
export type Gate6b2Disposition = (typeof gate6b2Dispositions)[number];

export const gate6b2AssetTypes = [
  'atomic-claim', 'pattern-dna', 'architecture-genome', 'implementation-observation',
  'machine-readable-architecture-fact', 'source-example', 'interface-obligation',
  'data-obligation', 'security-control', 'resilience-control',
  'contradiction-or-scoped-distinction', 'duplicate-or-reusable-procedure',
  'source-reference', 'procedure-or-runbook-step', 'non-claim',
  'insufficient-evidence-abstention',
] as const;
export type Gate6b2AssetType = (typeof gate6b2AssetTypes)[number];

export const applicabilityStates = ['stated', 'not-stated', 'not-applicable', 'requires-additional-evidence'] as const;
export type ApplicabilityState = (typeof applicabilityStates)[number];

export interface Gate6b2SupportSpan { quote: string; start: number; end: number }
export interface Gate6b2StructuredField {
  name: string;
  value: string;
  epistemicStatus: CanonicalEpistemicStatus;
  supportSpans: Gate6b2SupportSpan[];
  unknown: boolean;
}

export interface Gate6b2Item {
  caseId: string;
  evidenceId: string | null;
  disposition: Gate6b2Disposition;
  assetType: Gate6b2AssetType;
  authority: 'candidate';
  reviewRequired: true;
  productionAccepted: false;
  automaticPromotionAllowed: false;
  designGraphMutationAllowed: false;
  statement: string;
  epistemicStatus: CanonicalEpistemicStatus;
  statementOrigin: EpistemicStatementOrigin;
  epistemicBasis: 'normative-text' | 'source-advice' | 'documented-example' | 'implementation-evidence' | 'measurement' | 'expert-review' | 'sol-interpretation' | 'hypothesis' | 'illustration' | 'unknown';
  supportSpans: Gate6b2SupportSpan[];
  conditions: string[];
  conditionState: ApplicabilityState;
  conditionSupportSpans: Gate6b2SupportSpan[];
  limitations: string[];
  limitationState: ApplicabilityState;
  limitationSupportSpans: Gate6b2SupportSpan[];
  confidence: number;
  reviewRationale: string;
  fields: Gate6b2StructuredField[];
  nonClaimReason: string;
  nonClaimUse: string;
  missingEvidence: string[];
  additionalEvidenceRequired: string[];
  abstentionRationale: string;
}

export interface Gate6b2Output {
  schemaVersion: '2.0';
  promptVersion: typeof GATE6B2_PROMPT_VERSION;
  authority: 'candidate';
  items: Gate6b2Item[];
  productionAccepted: false;
  automaticPromotionAllowed: false;
  designGraphMutationAllowed: false;
}

export interface Gate6b2CaseInput {
  caseId: string;
  unit: Gate6bEvidenceUnit | null;
  expectedEvidenceId: string | null;
}

export interface Gate6b2ItemValidation {
  caseId: string;
  evidenceId: string | null;
  disposition: Gate6b2Disposition;
  assetType: Gate6b2AssetType;
  accepted: boolean;
  routedForDelegatedReview: boolean;
  lexicalCoverage: number | null;
  supportSpanValid: boolean;
  conditionComplete: boolean;
  limitationComplete: boolean;
  epistemicValid: boolean;
  crossCaseContamination: boolean;
  violations: string[];
}

export interface Gate6b2ValidationResult {
  accepted: boolean;
  items: Gate6b2ItemValidation[];
  acceptedItems: Gate6b2Item[];
  rejectedItems: Gate6b2Item[];
  delegatedReviewItems: Gate6b2Item[];
  violations: string[];
}

const STRUCTURED_ASSETS = new Set<Gate6b2AssetType>([
  'pattern-dna', 'architecture-genome', 'implementation-observation', 'machine-readable-architecture-fact',
  'source-example', 'interface-obligation', 'data-obligation', 'security-control', 'resilience-control',
  'contradiction-or-scoped-distinction', 'duplicate-or-reusable-procedure',
]);

const basisByStatus: Record<CanonicalEpistemicStatus, Gate6b2Item['epistemicBasis']> = {
  'normative-requirement': 'normative-text',
  'source-stated-recommendation': 'source-advice',
  'measured-result': 'measurement',
  'source-example': 'documented-example',
  'implementation-observation': 'implementation-evidence',
  'expert-interpretation': 'expert-review',
  'sol-inference': 'sol-interpretation',
  hypothesis: 'hypothesis', illustration: 'illustration', unknown: 'unknown',
};

function spanSchema() {
  return {
    type: 'object', additionalProperties: false,
    required: ['quote', 'start', 'end'],
    properties: { quote: { type: 'string' }, start: { type: 'integer' }, end: { type: 'integer' } },
  };
}

export function gate6b2ProviderSchema(caseIds: string[], evidenceIds: Array<string | null>): Record<string, unknown> {
  const noEvidenceRequest = evidenceIds.length === 1 && evidenceIds[0] === null;
  const fieldSchema = {
    type: 'object', additionalProperties: false,
    required: ['name', 'value', 'epistemicStatus', 'supportSpans', 'unknown'],
    properties: {
      name: { type: 'string' }, value: { type: 'string' },
      epistemicStatus: { type: 'string', enum: [...canonicalEpistemicStatuses] },
      supportSpans: { type: 'array', items: spanSchema() }, unknown: { type: 'boolean' },
    },
  };
  const item = {
    type: 'object', additionalProperties: false,
    required: [
      'caseId', 'evidenceId', 'disposition', 'assetType', 'authority', 'reviewRequired',
      'productionAccepted', 'automaticPromotionAllowed', 'designGraphMutationAllowed', 'statement',
      'epistemicStatus', 'statementOrigin', 'epistemicBasis', 'supportSpans', 'conditions',
      'conditionState', 'conditionSupportSpans', 'limitations', 'limitationState',
      'limitationSupportSpans', 'confidence', 'reviewRationale', 'fields', 'nonClaimReason',
      'nonClaimUse', 'missingEvidence', 'additionalEvidenceRequired', 'abstentionRationale',
    ],
    properties: {
      caseId: { type: 'string', enum: caseIds }, evidenceId: noEvidenceRequest ? { type: 'null' } : { type: 'string', enum: evidenceIds },
      disposition: { type: 'string', enum: [...gate6b2Dispositions] },
      assetType: { type: 'string', enum: [...gate6b2AssetTypes] },
      authority: { type: 'string', enum: ['candidate'] }, reviewRequired: { type: 'boolean', enum: [true] },
      productionAccepted: { type: 'boolean', enum: [false] }, automaticPromotionAllowed: { type: 'boolean', enum: [false] },
      designGraphMutationAllowed: { type: 'boolean', enum: [false] }, statement: { type: 'string' },
      epistemicStatus: { type: 'string', enum: [...canonicalEpistemicStatuses] },
      statementOrigin: { type: 'string', enum: ['source', 'sol', 'hypothesis', 'expert', 'unknown'] },
      epistemicBasis: { type: 'string', enum: ['normative-text', 'source-advice', 'documented-example', 'implementation-evidence', 'measurement', 'expert-review', 'sol-interpretation', 'hypothesis', 'illustration', 'unknown'] },
      supportSpans: { type: 'array', items: spanSchema() }, conditions: { type: 'array', items: { type: 'string' } },
      conditionState: { type: 'string', enum: [...applicabilityStates] }, conditionSupportSpans: { type: 'array', items: spanSchema() },
      limitations: { type: 'array', items: { type: 'string' } }, limitationState: { type: 'string', enum: [...applicabilityStates] },
      limitationSupportSpans: { type: 'array', items: spanSchema() }, confidence: { type: 'number' },
      reviewRationale: { type: 'string' }, fields: { type: 'array', items: fieldSchema },
      nonClaimReason: { type: 'string' }, nonClaimUse: { type: 'string' },
      missingEvidence: { type: 'array', items: { type: 'string' } }, additionalEvidenceRequired: { type: 'array', items: { type: 'string' } },
      abstentionRationale: { type: 'string' },
    },
  };
  return {
    type: 'object', additionalProperties: false,
    required: ['schemaVersion', 'promptVersion', 'authority', 'items', 'productionAccepted', 'automaticPromotionAllowed', 'designGraphMutationAllowed'],
    properties: {
      schemaVersion: { type: 'string', enum: ['2.0'] }, promptVersion: { type: 'string', enum: [GATE6B2_PROMPT_VERSION] },
      authority: { type: 'string', enum: ['candidate'] }, items: { type: 'array', minItems: caseIds.length, items: item },
      productionAccepted: { type: 'boolean', enum: [false] }, automaticPromotionAllowed: { type: 'boolean', enum: [false] },
      designGraphMutationAllowed: { type: 'boolean', enum: [false] },
    },
  };
}

export function verifySpan(span: Gate6b2SupportSpan, excerpt: string): boolean {
  return Number.isInteger(span.start) && Number.isInteger(span.end) && span.start >= 0 && span.end > span.start
    && span.end <= excerpt.length && excerpt.slice(span.start, span.end) === span.quote;
}

function hasMaterialCondition(value: string): boolean {
  return /\b(?:if|when|unless|where|while|only\s+(?:if|when|for)|provided\s+that|in\s+case\s+of)\b/i.test(value);
}

function hasMaterialLimitation(value: string): boolean {
  return /\b(?:however|but|except|limitation|trade-?off|risk|may\s+not|might\s+not|cannot|can't|does\s+not|isn't|only|requires?|beyond\s+the\s+scope)\b/i.test(value);
}

function negations(value: string): string[] {
  return [...value.toLowerCase().matchAll(/\b(?:not|no|never|without|cannot|can't|doesn't|isn't|don't|avoid|except)\b/g)].map((match) => match[0]);
}

function validateEpistemic(item: Gate6b2Item, unit: Gate6bEvidenceUnit | null): string[] {
  const violations: string[] = [];
  if (!canonicalEpistemicStatuses.includes(item.epistemicStatus)) violations.push('NON_CANONICAL_EPISTEMIC_STATUS');
  if (basisByStatus[item.epistemicStatus] !== item.epistemicBasis) violations.push('EPISTEMIC_BASIS_MISMATCH');
  const sourceStatuses = new Set<CanonicalEpistemicStatus>(['normative-requirement', 'source-stated-recommendation', 'measured-result', 'source-example', 'implementation-observation']);
  if (sourceStatuses.has(item.epistemicStatus) && item.statementOrigin !== 'source') violations.push('SOURCE_STATUS_ORIGIN_MISMATCH');
  if (item.epistemicStatus === 'sol-inference' && item.statementOrigin !== 'sol') violations.push('SOL_INFERENCE_RECORDED_AS_SOURCE');
  if (item.epistemicStatus === 'hypothesis' && item.statementOrigin !== 'hypothesis') violations.push('HYPOTHESIS_RECORDED_AS_FACT');
  if (item.epistemicStatus === 'expert-interpretation') violations.push('EXPERT_INTERPRETATION_REQUIRES_EXTERNAL_REVIEW');
  if (item.epistemicStatus === 'normative-requirement') {
    if (unit?.sourceAuthorityClass !== 'official-specification-or-standard') violations.push('NORMATIVE_STATUS_AUTHORITY_REQUIRED');
    const support = item.supportSpans.map((span) => span.quote).join(' ');
    if (!/\b(?:must|shall|required|prohibited|may\s+not)\b/i.test(support)) violations.push('NORMATIVE_BINDING_LANGUAGE_REQUIRED');
  }
  if (item.assetType === 'source-example' && item.epistemicStatus === 'normative-requirement') violations.push('EXAMPLE_PROMOTED_TO_NORMATIVE_REQUIREMENT');
  return violations;
}

const requiredPatternFields = ['context-or-trigger', 'mechanism', 'consequence', 'trade-off-or-limitation'];

function validateDispositionAndType(item: Gate6b2Item): string[] {
  const violations: string[] = [];
  if (item.disposition === 'atomic-claim-candidate' && item.assetType !== 'atomic-claim') violations.push('ATOMIC_CLAIM_TYPE_MISMATCH');
  if (item.disposition === 'structured-asset-candidate' && !STRUCTURED_ASSETS.has(item.assetType)) violations.push('STRUCTURED_ASSET_TYPE_MISMATCH');
  if (item.disposition === 'source-reference' && item.assetType !== 'source-reference') violations.push('SOURCE_REFERENCE_TYPE_MISMATCH');
  if (item.disposition === 'procedure-or-runbook-step' && !['procedure-or-runbook-step', 'duplicate-or-reusable-procedure'].includes(item.assetType)) violations.push('PROCEDURE_TYPE_MISMATCH');
  if (item.disposition === 'non-claim' && item.assetType !== 'non-claim') violations.push('NON_CLAIM_TYPE_MISMATCH');
  if (item.disposition === 'abstain-insufficient-evidence' && item.assetType !== 'insufficient-evidence-abstention') violations.push('ABSTENTION_TYPE_MISMATCH');
  return violations;
}

export function validateGate6b2Output(output: Gate6b2Output, cases: Gate6b2CaseInput[]): Gate6b2ValidationResult {
  const globalViolations: string[] = [];
  if (output.authority !== 'candidate' || output.productionAccepted || output.automaticPromotionAllowed || output.designGraphMutationAllowed) globalViolations.push('AUTHORITY_ISOLATION_FAILED');
  if (output.schemaVersion !== '2.0' || output.promptVersion !== GATE6B2_PROMPT_VERSION) globalViolations.push('CONTRACT_VERSION_MISMATCH');
  const byCase = new Map(cases.map((item) => [item.caseId, item]));
  const validations: Gate6b2ItemValidation[] = [];
  const acceptedItems: Gate6b2Item[] = [];
  const rejectedItems: Gate6b2Item[] = [];
  const delegatedReviewItems: Gate6b2Item[] = [];
  for (const item of output.items) {
    const violations = validateDispositionAndType(item);
    const source = byCase.get(item.caseId);
    const crossCaseContamination = !source || item.evidenceId !== source.expectedEvidenceId;
    if (crossCaseContamination) violations.push('CROSS_CASE_CONTAMINATION');
    if (item.authority !== 'candidate' || !item.reviewRequired || item.productionAccepted || item.automaticPromotionAllowed || item.designGraphMutationAllowed) violations.push('ITEM_AUTHORITY_ISOLATION_FAILED');
    const excerpt = source?.unit?.excerpt ?? '';
    const allSpans = [...item.supportSpans, ...item.conditionSupportSpans, ...item.limitationSupportSpans, ...item.fields.flatMap((field) => field.supportSpans)];
    const supportSpanValid = source?.unit ? allSpans.every((span) => verifySpan(span, excerpt)) : allSpans.length === 0;
    if (!supportSpanValid) violations.push('SUPPORT_SPAN_INVALID');
    if (!Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 1) violations.push('CONFIDENCE_INVALID');

    const claimLike = item.disposition === 'atomic-claim-candidate' || item.disposition === 'structured-asset-candidate';
    const propositionBearing = claimLike || item.disposition === 'procedure-or-runbook-step';
    if (claimLike && !item.statement.trim() && item.fields.every((field) => field.unknown || !field.value.trim())) violations.push('SEMANTIC_CONTENT_REQUIRED');
    if (claimLike && item.supportSpans.length === 0 && item.fields.filter((field) => !field.unknown).every((field) => field.supportSpans.length === 0)) violations.push('SUPPORT_SPAN_REQUIRED');
    if (!propositionBearing && item.disposition !== 'source-reference' && item.statement.trim()) violations.push('NON_CLAIM_STATEMENT_PROHIBITED');

    const supportText = item.supportSpans.map((span) => span.quote).join(' ');
    const lexical = item.statement.trim() && supportText ? scoreEvidenceSupport(item.statement, supportText, true).supportScore : null;
    const exactConditionApplies = hasMaterialCondition(supportText);
    const conditionComplete = !propositionBearing ? true : item.conditionState === 'not-applicable'
      ? !exactConditionApplies
      : item.conditionState === 'stated'
        ? item.conditions.length > 0 && item.conditionSupportSpans.length > 0
        : item.conditionState === 'requires-additional-evidence' || (item.conditionState === 'not-stated' && !exactConditionApplies);
    if (!conditionComplete) violations.push('MATERIAL_CONDITION_OMITTED');
    const exactLimitationApplies = hasMaterialLimitation(supportText);
    const limitationComplete = !propositionBearing ? true : item.limitationState === 'not-applicable'
      ? !exactLimitationApplies
      : item.limitationState === 'stated'
        ? item.limitations.length > 0 && item.limitationSupportSpans.length > 0
        : item.limitationState === 'requires-additional-evidence' || (item.limitationState === 'not-stated' && !exactLimitationApplies);
    if (!limitationComplete) violations.push('MATERIAL_LIMITATION_OMITTED');
    if (item.statement.trim() && supportText && negations(item.statement).length !== negations(supportText).length
      && (negations(item.statement).length > 0 || negations(supportText).length > 0)) violations.push('CLAIM_POLARITY_MISMATCH');
    const epistemicViolations = validateEpistemic(item, source?.unit ?? null);
    violations.push(...epistemicViolations);

    if (item.disposition === 'non-claim' && (!item.nonClaimReason.trim() || !item.nonClaimUse.trim() || item.supportSpans.length === 0)) violations.push('NON_CLAIM_RATIONALE_INCOMPLETE');
    if (item.disposition === 'abstain-insufficient-evidence' && (!item.abstentionRationale.trim() || item.missingEvidence.length === 0 || item.additionalEvidenceRequired.length === 0)) violations.push('ABSTENTION_RATIONALE_INCOMPLETE');
    if (item.assetType === 'pattern-dna') {
      const known = new Set(item.fields.filter((field) => !field.unknown && field.value.trim() && field.supportSpans.length).map((field) => field.name));
      for (const required of requiredPatternFields) if (!known.has(required)) violations.push(`PATTERN_DNA_FIELD_MISSING:${required}`);
    }
    if (item.assetType === 'architecture-genome' && item.fields.filter((field) => !field.unknown && field.supportSpans.length > 0).length < 2) violations.push('ARCHITECTURE_GENOME_FIELDS_INSUFFICIENT');

    const hardViolations = violations.filter((code) => !code.startsWith('LEXICAL_SCREENING_'));
    const routedForDelegatedReview = claimLike && lexical !== null && lexical < GATE6B2_LEXICAL_SCREENING_THRESHOLD && hardViolations.length === 0;
    if (routedForDelegatedReview) violations.push('LEXICAL_SCREENING_REVIEW_REQUIRED');
    const accepted = hardViolations.length === 0;
    const validation = {
      caseId: item.caseId, evidenceId: item.evidenceId, disposition: item.disposition, assetType: item.assetType,
      accepted, routedForDelegatedReview, lexicalCoverage: lexical, supportSpanValid, conditionComplete,
      limitationComplete, epistemicValid: epistemicViolations.length === 0, crossCaseContamination, violations,
    } satisfies Gate6b2ItemValidation;
    validations.push(validation);
    if (accepted) acceptedItems.push(item); else rejectedItems.push(item);
    if (routedForDelegatedReview) delegatedReviewItems.push(item);
  }
  for (const expected of cases) {
    if (!output.items.some((item) => item.caseId === expected.caseId)) globalViolations.push(`CASE_OUTPUT_MISSING:${expected.caseId}`);
  }
  return { accepted: globalViolations.length === 0 && rejectedItems.length === 0, items: validations, acceptedItems, rejectedItems, delegatedReviewItems, violations: globalViolations };
}

export function evidenceHashReplays(unit: Gate6bEvidenceUnit): boolean {
  return unit.excerptHash === `sha256:${createHash('sha256').update(unit.excerpt).digest('hex')}`;
}
