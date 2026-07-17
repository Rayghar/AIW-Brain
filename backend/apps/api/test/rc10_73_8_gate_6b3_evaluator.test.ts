import { describe, expect, it } from 'vitest';
import {
  classifyDeterministicEvidencePosture, createEpistemicMigrationView,
  deriveAssetSynthesisStatus, evaluateGate6b3Case, gate6b3EpistemicMigrationViewSchema,
  planSemanticIsolationFallback, type Gate6b3HistoricAsset, type Gate6b3LabelV2,
} from '../src/gate6b3Evaluator.js';
import type { ResolvedEvidenceAtom } from '../src/gate6b2R2SemanticTransformation.js';

const label: Gate6b3LabelV2 = {
  caseId: 'C1', expectedDisposition: 'candidate-assets', permittedDispositions: ['candidate-assets'],
  primaryAssetTypes: ['security-control'], secondaryAssetTypes: ['source-reference'], assetTypeAliases: { 'security-control': ['security-obligation'] },
  permittedSourceAtomEpistemicStatuses: ['normative-requirement','source-stated-recommendation'], expectedSynthesisStatuses: ['deterministic-composition'],
  fieldEpistemicExpectations: [{ fieldName: 'mechanism', permittedStatuses: ['normative-requirement'] }],
  conditionApplicability: 'required', requiredConditionEvidenceTerms: ['when exposed'],
  limitationApplicability: 'not-applicable', requiredLimitationEvidenceTerms: [], expectedNonClaim: false, expectedAbstention: false,
};
const atom = (overrides: Partial<ResolvedEvidenceAtom> = {}): ResolvedEvidenceAtom => ({
  atomId: 'A1', caseId: 'C1', evidenceId: 'E1', atomType: 'requirement', exactSupportText: 'Use a control when exposed.', supportRole: 'primary', polarity: 'affirmed', sourceModality: 'must', proposedEpistemicStatus: 'normative-requirement', occurrenceHint: null, conditionAtomIds: [], limitationAtomIds: [], resolvedStart: 0, resolvedEnd: 27, excerptHash: 'sha256:test', quotationValidation: 'exact-unique-match', ...overrides,
});
const asset = (overrides: Partial<Gate6b3HistoricAsset> = {}): Gate6b3HistoricAsset => ({
  assetId: 'AS1', caseId: 'C1', assetType: 'security-obligation', statement: 'Use a control.', epistemicStatus: 'expert-interpretation', supportingAtomIds: ['A1'], fields: [{ fieldName: 'mechanism', value: 'control', knowledgeState: 'stated', supportingAtomIds: ['A1'] }], conditions: [], limitations: [], authority: 'candidate', productionAccepted: false, automaticPromotionAllowed: false, designGraphMutationAllowed: false, ...overrides,
});

describe('Gate 6B.3 deterministic evidence posture', () => {
  it('distinguishes no evidence', () => expect(classifyDeterministicEvidencePosture({ evidenceAvailable: false, text: '' })).toBe('abstain-insufficient-evidence'));
  it('accepts deterministic heading-only non-claim', () => expect(classifyDeterministicEvidencePosture({ evidenceAvailable: true, text: 'Security', parserClassification: 'heading-only' })).toBe('non-claim'));
  it('accepts deterministic metadata-only non-claim', () => expect(classifyDeterministicEvidencePosture({ evidenceAvailable: true, text: 'name=x', parserClassification: 'metadata-only' })).toBe('non-claim'));
  it('distinguishes bibliographic source', () => expect(classifyDeterministicEvidencePosture({ evidenceAvailable: true, text: 'Smith 2020', parserClassification: 'bibliographic' })).toBe('source-reference'));
  it('distinguishes failed atom extraction from non-claim', () => expect(classifyDeterministicEvidencePosture({ evidenceAvailable: true, text: 'A system must authenticate.', atomExtractionStatus: 'unsupported-atoms' })).toBe('atom-extraction-failed'));
  it('recognises valid prose architecture statements', () => expect(classifyDeterministicEvidencePosture({ evidenceAvailable: true, text: 'A system must authenticate requests.', parserClassification: 'prose', atomExtractionStatus: 'validated-atoms' })).toBe('claim-bearing'));
  it('recognises machine-readable facts', () => expect(classifyDeterministicEvidencePosture({ evidenceAvailable: true, text: '{}', parserClassification: 'machine-readable-fact' })).toBe('claim-bearing'));
});

describe('Gate 6B.3 epistemic and asset-set evaluation', () => {
  it('keeps source atom, field, and synthesis epistemic levels distinct', () => {
    const view = createEpistemicMigrationView(asset({ supportingAtomIds: ['A1','A2'] }), [atom(), atom({ atomId: 'A2' })], label);
    expect(view.sourceAtoms[0]?.epistemicStatus).toBe('normative-requirement');
    expect(view.fields[0]?.epistemicStatus).toBe('normative-requirement');
    expect(view.assetSynthesisStatus).toBe('deterministic-composition');
  });
  it('rejects non-canonical migration statuses', () => expect(() => gate6b3EpistemicMigrationViewSchema.parse({ ...createEpistemicMigrationView(asset(), [atom()], label), assetSynthesisStatus: 'normative-requirement' })).toThrow());
  it('does not make a composite asset normative from one normative atom', () => expect(deriveAssetSynthesisStatus(asset({ supportingAtomIds: ['A1','A2'] }))).toBe('deterministic-composition'));
  it('evaluates the complete asset set and normalises governed aliases', () => {
    const result = evaluateGate6b3Case({ label, atoms: [atom()], assets: [asset({ assetType: 'source-reference' }), asset()] });
    expect(result.primaryAssetTypeCorrect).toBe(true); expect(result.secondaryTypes).toContain('source-reference');
  });
  it('does not allow a source reference to substitute for the primary asset', () => expect(evaluateGate6b3Case({ label, atoms: [atom()], assets: [asset({ assetType: 'source-reference' })] }).primaryAssetTypeCorrect).toBe(false));
  it('excludes non-applicable limitations from required completeness', () => expect(evaluateGate6b3Case({ label, atoms: [atom()], assets: [asset()] }).limitationCaptured).toBeNull());
  it('requires condition evidence only when applicability is required', () => expect(evaluateGate6b3Case({ label, atoms: [atom()], assets: [asset()] }).conditionCaptured).toBe(true));
  it('detects candidate authority leakage independently of epistemic status', () => expect(evaluateGate6b3Case({ label, atoms: [atom()], assets: [asset({ productionAccepted: true as false })] }).authorityLeakage).toBe(1));
});

describe('Gate 6B.3 semantic isolation fallback', () => {
  const request = { pairedRequestId: 'P1', caseId: 'C1', caseCount: 2, failure: 'zero-validated-atoms' as const, priorFallbackCount: 0, promptFingerprint: 'p', model: 'm', evidenceId: 'e', excerptHash: 'h', schemaFingerprint: 's' };
  it('creates one individual fallback with frozen prompt/model/evidence/schema', () => expect(planSemanticIsolationFallback(request)).toMatchObject({ providerCallCount: 1, samePrompt: true, sameModel: true, sameEvidence: true, sameSchema: true, pairedAttemptPreserved: true }));
  it('creates a distinct deterministic request fingerprint', () => expect(planSemanticIsolationFallback(request).requestFingerprint).toMatch(/^sha256:[a-f0-9]{64}$/));
  it('rejects fallback for a singleton request', () => expect(() => planSemanticIsolationFallback({ ...request, caseCount: 1 })).toThrow('PAIRED_REQUEST'));
  it('enforces one fallback per failed paired case', () => expect(() => planSemanticIsolationFallback({ ...request, priorFallbackCount: 1 })).toThrow('EXHAUSTED'));
});
