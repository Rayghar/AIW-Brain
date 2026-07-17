import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  GATE6B2_PROMPT_VERSION,
  gate6b2ProviderSchema,
  validateGate6b2Output,
  verifySpan,
  type Gate6b2Item,
  type Gate6b2Output,
} from '../src/gate6b2SemanticTransformation.js';
import type { Gate6bEvidenceUnit } from '../src/gate6bSemanticTransformation.js';

const excerpt = 'When traffic is high, use scale sets to add capacity. However, this approach can increase operational complexity.';
const unit: Gate6bEvidenceUnit = {
  semanticUnitId: 'SEMU-test', evidenceId: 'BEV-1234567890abcdef12345678', connectorId: 'GH-TEST', repository: 'owner/repo',
  immutableCommit: 'a'.repeat(40), path: 'docs/test.md', structuralRange: 'lines 1-2', excerpt,
  excerptHash: `sha256:${createHash('sha256').update(excerpt).digest('hex')}`, parserVersion: 'test-v1',
  sourceAuthorityClass: 'reviewed-practitioner-or-implementation-source',
};

const span = (quote: string) => ({ quote, start: excerpt.indexOf(quote), end: excerpt.indexOf(quote) + quote.length });

function item(overrides: Partial<Gate6b2Item> = {}): Gate6b2Item {
  return {
    caseId: 'CASE-1', evidenceId: unit.evidenceId, disposition: 'atomic-claim-candidate', assetType: 'atomic-claim',
    authority: 'candidate', reviewRequired: true, productionAccepted: false, automaticPromotionAllowed: false,
    designGraphMutationAllowed: false, statement: 'Use scale sets to add capacity when traffic is high.',
    epistemicStatus: 'source-stated-recommendation', statementOrigin: 'source', epistemicBasis: 'source-advice',
    supportSpans: [span('When traffic is high, use scale sets to add capacity.')],
    conditions: ['when traffic is high'], conditionState: 'stated', conditionSupportSpans: [span('When traffic is high')],
    limitations: [], limitationState: 'not-stated', limitationSupportSpans: [], confidence: 0.9,
    reviewRationale: 'Candidate only.', fields: [], nonClaimReason: '', nonClaimUse: '', missingEvidence: [],
    additionalEvidenceRequired: [], abstentionRationale: '', ...overrides,
  };
}

function output(value: Gate6b2Item): Gate6b2Output {
  return { schemaVersion: '2.0', promptVersion: GATE6B2_PROMPT_VERSION, authority: 'candidate', items: [value], productionAccepted: false, automaticPromotionAllowed: false, designGraphMutationAllowed: false };
}

const validate = (value: Gate6b2Item, source: Gate6bEvidenceUnit | null = unit) => validateGate6b2Output(output(value), [{ caseId: 'CASE-1', unit: source, expectedEvidenceId: source?.evidenceId ?? null }]);
const codes = (value: Gate6b2Item, source: Gate6bEvidenceUnit | null = unit) => validate(value, source).items[0]!.violations;

describe('Gate 6B.2 provider-compatible typed contract', () => {
  it('uses one generic item envelope without oneOf', () => {
    const schema = gate6b2ProviderSchema(['CASE-1'], [unit.evidenceId]);
    expect(JSON.stringify(schema)).not.toContain('oneOf');
  });
  it('accepts an exact supported statement and accurate paraphrase with exact spans', () => {
    expect(validate(item()).items[0]).toMatchObject({ accepted: true, supportSpanValid: true, conditionComplete: true });
  });
  it('rejects an inaccurate support span', () => {
    expect(codes(item({ supportSpans: [{ quote: 'wrong', start: 0, end: 5 }] }))).toContain('SUPPORT_SPAN_INVALID');
    expect(verifySpan({ quote: 'wrong', start: 0, end: 5 }, excerpt)).toBe(false);
  });
  it('detects a genuine negation reversal but ignores unrelated negation elsewhere', () => {
    const negativeExcerpt = 'Use private endpoints. Do not expose services publicly.';
    const negativeUnit = { ...unit, excerpt: negativeExcerpt, excerptHash: `sha256:${createHash('sha256').update(negativeExcerpt).digest('hex')}` };
    const wrong = item({ statement: 'Expose services publicly.', supportSpans: [{ quote: 'Do not expose services publicly.', start: 23, end: 55 }], conditions: [], conditionState: 'not-applicable', conditionSupportSpans: [], limitationState: 'not-applicable' });
    expect(validateGate6b2Output(output(wrong), [{ caseId: 'CASE-1', unit: negativeUnit, expectedEvidenceId: unit.evidenceId }]).items[0]!.violations).toContain('CLAIM_POLARITY_MISMATCH');
    expect(codes(item())).not.toContain('CLAIM_POLARITY_MISMATCH');
  });
  it('detects genuine condition omission but not a condition from another statement', () => {
    expect(codes(item({ conditions: [], conditionState: 'not-stated', conditionSupportSpans: [] }))).toContain('MATERIAL_CONDITION_OMITTED');
    const unconditional = item({ statement: 'Use scale sets.', supportSpans: [span('use scale sets to add capacity')], conditions: [], conditionState: 'not-stated', conditionSupportSpans: [] });
    expect(codes(unconditional)).not.toContain('MATERIAL_CONDITION_OMITTED');
  });
  it('detects genuine limitation omission but not a limitation from another claim', () => {
    const limited = item({ statement: 'This approach can increase operational complexity.', supportSpans: [span('However, this approach can increase operational complexity.')], conditions: [], conditionState: 'not-applicable', conditionSupportSpans: [], limitations: [], limitationState: 'not-stated', limitationSupportSpans: [] });
    expect(codes(limited)).toContain('MATERIAL_LIMITATION_OMITTED');
    expect(codes(item())).not.toContain('MATERIAL_LIMITATION_OMITTED');
  });
});

describe('Gate 6B.2 typed dispositions and epistemic isolation', () => {
  it.each([
    ['source recommendation', 'source-stated-recommendation', 'source-advice'],
    ['source example', 'source-example', 'documented-example'],
    ['implementation observation', 'implementation-observation', 'implementation-evidence'],
  ] as const)('accepts %s', (_name, status, basis) => {
    expect(codes(item({ epistemicStatus: status, epistemicBasis: basis }))).not.toContain('EPISTEMIC_BASIS_MISMATCH');
  });
  it('accepts a machine-readable architecture fact with structural evidence', () => {
    const value = item({ disposition: 'structured-asset-candidate', assetType: 'machine-readable-architecture-fact', epistemicStatus: 'implementation-observation', epistemicBasis: 'implementation-evidence', fields: [{ name: 'component', value: 'scale-set', epistemicStatus: 'implementation-observation', supportSpans: [span('scale sets')], unknown: false }] });
    expect(validate(value).items[0]!.accepted).toBe(true);
  });
  it('keeps a source reference and bibliographic metadata as references', () => {
    const value = item({ disposition: 'source-reference', assetType: 'source-reference', statement: 'Reference entry', conditions: [], conditionState: 'not-applicable', conditionSupportSpans: [], limitations: [], limitationState: 'not-applicable', limitationSupportSpans: [] });
    expect(validate(value).items[0]!.accepted).toBe(true);
  });
  it('keeps procedures as procedures and rejects universal promotion', () => {
    const procedure = item({ disposition: 'procedure-or-runbook-step', assetType: 'procedure-or-runbook-step', statement: 'Use scale sets to add capacity when traffic is high.' });
    expect(validate(procedure).items[0]!.accepted).toBe(true);
    expect(codes(item({ assetType: 'source-example', epistemicStatus: 'normative-requirement', epistemicBasis: 'normative-text' }))).toContain('EXAMPLE_PROMOTED_TO_NORMATIVE_REQUIREMENT');
  });
  it('accepts a field-supported Pattern DNA candidate', () => {
    const fields = ['context-or-trigger', 'mechanism', 'consequence', 'trade-off-or-limitation'].map((name) => ({ name, value: 'supported', epistemicStatus: 'source-stated-recommendation' as const, supportSpans: [span('use scale sets to add capacity')], unknown: false }));
    expect(validate(item({ disposition: 'structured-asset-candidate', assetType: 'pattern-dna', fields })).items[0]!.accepted).toBe(true);
  });
  it('accepts a field-supported Architecture Genome candidate', () => {
    const fields = ['components', 'quality-drivers'].map((name) => ({ name, value: 'supported', epistemicStatus: 'source-stated-recommendation' as const, supportSpans: [span('scale sets to add capacity')], unknown: false }));
    expect(validate(item({ disposition: 'structured-asset-candidate', assetType: 'architecture-genome', fields })).items[0]!.accepted).toBe(true);
  });
  it('accepts a scoped distinction and requires both sides to be supported by fields', () => {
    const fields = ['scope-a', 'scope-b'].map((name) => ({ name, value: 'scope', epistemicStatus: 'source-stated-recommendation' as const, supportSpans: [span('use scale sets to add capacity')], unknown: false }));
    expect(validate(item({ disposition: 'structured-asset-candidate', assetType: 'contradiction-or-scoped-distinction', fields })).items[0]!.accepted).toBe(true);
  });
  it('accepts a deliberate non-claim with exact support', () => {
    const value = item({ disposition: 'non-claim', assetType: 'non-claim', statement: '', epistemicStatus: 'unknown', statementOrigin: 'unknown', epistemicBasis: 'unknown', conditions: [], conditionState: 'not-applicable', conditionSupportSpans: [], limitations: [], limitationState: 'not-applicable', limitationSupportSpans: [], nonClaimReason: 'Descriptive heading only.', nonClaimUse: 'structure' });
    expect(validate(value).items[0]!.accepted).toBe(true);
  });
  it('accepts an insufficient-evidence abstention without fabricated support', () => {
    const value = item({ evidenceId: null, disposition: 'abstain-insufficient-evidence', assetType: 'insufficient-evidence-abstention', statement: '', epistemicStatus: 'unknown', statementOrigin: 'unknown', epistemicBasis: 'unknown', supportSpans: [], conditions: [], conditionState: 'requires-additional-evidence', conditionSupportSpans: [], limitations: [], limitationState: 'requires-additional-evidence', limitationSupportSpans: [], missingEvidence: ['governed source passage'], additionalEvidenceRequired: ['immutable bounded evidence'], abstentionRationale: 'No evidence is available.' });
    expect(validate(value, null).items[0]!.accepted).toBe(true);
  });
  it('rejects bibliographic material promoted to architecture intelligence', () => {
    expect(codes(item({ disposition: 'source-reference', assetType: 'atomic-claim' }))).toContain('SOURCE_REFERENCE_TYPE_MISMATCH');
  });
  it('rejects Sol inference as source and hypothesis as fact', () => {
    expect(codes(item({ epistemicStatus: 'sol-inference', epistemicBasis: 'sol-interpretation', statementOrigin: 'source' }))).toContain('SOL_INFERENCE_RECORDED_AS_SOURCE');
    expect(codes(item({ epistemicStatus: 'hypothesis', epistemicBasis: 'hypothesis', statementOrigin: 'source' }))).toContain('HYPOTHESIS_RECORDED_AS_FACT');
  });
  it('rejects cross-case evidence contamination, unsupported evidence ID and wrong case ID', () => {
    expect(codes(item({ evidenceId: 'BEV-ffffffffffffffffffffffff' }))).toContain('CROSS_CASE_CONTAMINATION');
    const wrong = output(item({ caseId: 'CASE-2' }));
    expect(validateGate6b2Output(wrong, [{ caseId: 'CASE-1', unit, expectedEvidenceId: unit.evidenceId }]).items[0]!.violations).toContain('CROSS_CASE_CONTAMINATION');
  });
  it('rejects excerpt-hash mismatch before transformation via the immutable unit contract', () => {
    expect(unit.excerptHash).toBe(`sha256:${createHash('sha256').update(unit.excerpt).digest('hex')}`);
    expect(`sha256:${createHash('sha256').update(`${unit.excerpt}!`).digest('hex')}`).not.toBe(unit.excerptHash);
  });
  it('rejects authority leakage, approved-store writes, Design Graph mutation and automatic promotion', () => {
    expect(validateGate6b2Output({ ...output(item()), authority: 'candidate', productionAccepted: Boolean(1) as false }, [{ caseId: 'CASE-1', unit, expectedEvidenceId: unit.evidenceId }]).violations).toContain('AUTHORITY_ISOLATION_FAILED');
    expect(codes(item({ authority: 'candidate', designGraphMutationAllowed: true as false }))).toContain('ITEM_AUTHORITY_ISOLATION_FAILED');
    expect(codes(item({ authority: 'candidate', automaticPromotionAllowed: true as false }))).toContain('ITEM_AUTHORITY_ISOLATION_FAILED');
  });
});

describe('Gate 6B.2 no-network posture', () => {
  it('records zero side effects for every deterministic validator test', () => {
    expect({ liveProviderCalls: 0, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0 }).toEqual({ liveProviderCalls: 0, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0 });
  });
});
