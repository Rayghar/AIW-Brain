import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LlmRuntimePolicy } from '@aiw/domain';
import { LlmGateway, LlmStrictStructuredError } from '../src/llmGateway.js';
import {
  deterministicNoEvidenceControl, gate6b2R2StageASchema, gate6b2R2StageBSchema,
  resolveExactSupportQuotation, validateEvidenceAtomGate, validateTypedAssetGate,
  type Gate6b2R2StageAOutput, type Gate6b2R2StageBOutput,
} from '../src/gate6b2R2SemanticTransformation.js';

const originalEnvironment = { ...process.env };
beforeEach(() => { process.env = { ...originalEnvironment, OPENAI_API_KEY: 'test-only-placeholder' }; });
afterEach(() => { process.env = { ...originalEnvironment }; vi.restoreAllMocks(); });

function policy(): LlmRuntimePolicy {
  return {
    routes: [{ id: 'r2', purpose: 'governed-candidate-semantic-transformation', providerId: 'openai', model: 'gpt-4.1-mini-2025-04-14', baseUrl: 'https://example.test/v1', apiKeyEnvironmentVariable: 'OPENAI_API_KEY', protocol: 'responses', timeoutMs: 1_000, maxOutputTokens: 6_000, temperature: 0, enabled: true, fallbackRouteIds: [], dataClassificationAllowlist: ['public'] }],
    modelAllowlist: [{ providerId: 'openai', provider: 'openai', model: 'gpt-4.1-mini-2025-04-14', configuredAlias: 'gpt-4.1-mini', requestedModel: 'gpt-4.1-mini-2025-04-14', resolvedModel: 'gpt-4.1-mini-2025-04-14', modelFamily: 'gpt-4.1-mini', allowedSnapshots: ['gpt-4.1-mini-2025-04-14'], modelIdentityDecision: 'exact-snapshot-pinned', purposes: ['governed-candidate-semantic-transformation'], verificationReference: 'offline-r2-test', verificationTimestamp: '2026-07-17T00:00:00.000Z', verificationMethod: 'offline-test' }],
    maxInputCharacters: 60_000, allowFallback: false, requireStructuredOutput: true, redactSecrets: true, logPrompts: false, retainProviderContent: false, maxRetries: 0, circuitBreakerFailures: 10, circuitBreakerResetSeconds: 60,
  };
}

const atom = { atomId: 'A1', caseId: 'C1', evidenceId: 'E1', atomType: 'recommendation' as const, exactSupportText: 'validate input', supportRole: 'primary' as const, polarity: 'affirmed' as const, sourceModality: 'should' as const, proposedEpistemicStatus: 'source-stated-recommendation' as const, occurrenceHint: null, conditionAtomIds: [], limitationAtomIds: [] };
function stageA(atoms = [atom]): Gate6b2R2StageAOutput { return { schemaVersion: 'aiw-gate-6b2-r2-strict-structured-v1', promptVersion: 'gate-6b2-r2-two-stage-cognition-v1', stage: 'evidence-atom-extraction', authority: 'candidate', productionAccepted: false, automaticPromotionAllowed: false, designGraphMutationAllowed: false, cases: [{ caseId: 'C1', disposition: atoms.length ? 'atoms-proposed' : 'abstain-insufficient-evidence', additionalEvidenceRequired: [], atoms }] }; }
function response(output: unknown, overrides: Record<string, unknown> = {}) { return { id: 'resp-r2', model: 'gpt-4.1-mini-2025-04-14', status: 'completed', output: [], output_parsed: output, usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 }, ...overrides }; }
function gateway(output: any) { const parse = vi.fn(() => ({ withResponse: async () => ({ data: output, response: { status: 200 }, request_id: 'req-r2' }) })); return { gateway: new LlmGateway(policy(), fetch, { structuredClientFactory: () => ({ responses: { parse } }) }), parse }; }
const request = { purpose: 'governed-candidate-semantic-transformation' as const, system: 'bounded', user: 'bounded', schemaName: 'gate6b2_r2_evidence_atoms', schema: gate6b2R2StageASchema, dataClassification: 'public' as const };

describe('Gate 6B.2 R2 provider protocol', () => {
  it('uses strict SDK parsed structured output from one schema source', async () => {
    const mock = gateway(response(stageA())); const result = await mock.gateway.generateStrictStructured(request);
    expect(result.value).toEqual(stageA()); expect(result.manualJsonParsingUsed).toBe(false); expect(result.parsedOutputSource).toContain('responses-parse');
    const body = mock.parse.mock.calls[0]![0] as any; expect(body.text.format.strict).toBe(true); expect(body.text.format.schema).toEqual(result.providerSchema); expect(body.stream).toBe(false);
  });
  it.each([
    ['refused', response(null, { output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] }), 'refused'],
    ['incomplete', response(null, { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } }), 'incomplete'],
    ['content filtered', response(null, { status: 'incomplete', incomplete_details: { reason: 'content_filter' } }), 'content-filtered'],
    ['malformed text without parsed output', response(null, { output: [{ type: 'message', content: [{ type: 'output_text', text: '{broken' }] }] }), 'schema-rejected'],
  ])('classifies %s distinctly', async (_label, payload, disposition) => {
    const mock = gateway(payload); await expect(mock.gateway.generateStrictStructured(request)).rejects.toMatchObject({ disposition });
  });
  it('rejects model mismatch without fallback', async () => { const mock = gateway(response(stageA(), { model: 'similar-model' })); await expect(mock.gateway.generateStrictStructured(request)).rejects.toMatchObject({ disposition: 'model-mismatch' }); });
  it('does not repair markdown or malformed JSON manually', async () => { const mock = gateway(response(undefined, { output_text: '```json\n{}\n```' })); await expect(mock.gateway.generateStrictStructured(request)).rejects.toBeInstanceOf(LlmStrictStructuredError); });
  it('rejects parsed output that drifts from the application schema', async () => { const mock = gateway(response({ ...stageA(), extra: true })); await expect(mock.gateway.generateStrictStructured(request)).rejects.toMatchObject({ disposition: 'schema-rejected' }); });
});

describe('Gate 6B.2 R2 exact evidence quotation gate', () => {
  const evidence = { caseId: 'C1', evidenceId: 'E1', excerpt: 'A system should validate input before use.', excerptHash: '50f691f8f7f746d087b050093290ffe2a99fafbf4818edcd49b04f459eeab1fe' };
  it('resolves exact quotation and calculates deterministic offsets', () => { const result = resolveExactSupportQuotation(atom, evidence); expect(evidence.excerpt.slice(result.resolvedStart, result.resolvedEnd)).toBe('validate input'); });
  it('permits only CRLF-to-LF normalization', () => { const excerpt = 'line one\r\nline two'; const input = { ...evidence, excerpt, excerptHash: '8ec4c37982ffc5a839234595530d36fa868683bc09ea40fe9960cb64c7847e33' }; const result = resolveExactSupportQuotation({ ...atom, exactSupportText: 'one\nline' }, input); expect(excerpt.slice(result.resolvedStart, result.resolvedEnd)).toBe('one\r\nline'); });
  it('rejects unsupported quotation without fuzzy conversion', () => { expect(() => resolveExactSupportQuotation({ ...atom, exactSupportText: 'validate everything' }, evidence)).toThrow('NOT_FOUND'); });
  it('rejects ambiguous repeated quotation without an occurrence hint', () => { const excerpt = 'validate input; validate input'; const input = { ...evidence, excerpt, excerptHash: 'd40fd443b58b334d13b932a765b0ea91af9ce9c06ed37bb8300c299faec668a5' }; expect(() => resolveExactSupportQuotation(atom, input)).toThrow('AMBIGUOUS'); });
  it('uses an explicit repeated occurrence hint', () => { const excerpt = 'validate input; validate input'; const input = { ...evidence, excerpt, excerptHash: 'd40fd443b58b334d13b932a765b0ea91af9ce9c06ed37bb8300c299faec668a5' }; expect(resolveExactSupportQuotation({ ...atom, occurrenceHint: 2 }, input).resolvedStart).toBe(16); });
  it('rejects cross-case and cross-source atoms before synthesis', () => { const result = validateEvidenceAtomGate(stageA([{ ...atom, caseId: 'C2' }]), [evidence]); expect(result.acceptedAtoms).toHaveLength(0); expect(result.crossCaseContamination).toBe(1); });
  it('rejects condition links to unvalidated atoms', () => { const result = validateEvidenceAtomGate(stageA([{ ...atom, conditionAtomIds: ['missing'] }]), [evidence]); expect(result.acceptedAtoms).toHaveLength(0); expect(result.rejectedAtoms[0]?.reason).toContain('LINKED_ATOM'); });
});

describe('Gate 6B.2 R2 Stage B boundary and authority', () => {
  const evidence = { caseId: 'C1', evidenceId: 'E1', excerpt: 'A system should validate input before use.', excerptHash: '50f691f8f7f746d087b050093290ffe2a99fafbf4818edcd49b04f459eeab1fe' };
  const accepted = validateEvidenceAtomGate(stageA(), [evidence]).acceptedAtoms;
  function stageB(asset: any): Gate6b2R2StageBOutput { return { schemaVersion: 'aiw-gate-6b2-r2-strict-structured-v1', promptVersion: 'gate-6b2-r2-two-stage-cognition-v1', stage: 'typed-architecture-asset-synthesis', authority: 'candidate', productionAccepted: false, automaticPromotionAllowed: false, designGraphMutationAllowed: false, cases: [{ caseId: 'C1', disposition: 'candidate-assets', additionalEvidenceRequired: [], assets: [asset] }] }; }
  const validAsset = { assetId: 'AS1', caseId: 'C1', assetType: 'atomic-claim', statement: 'Validate input before use.', epistemicStatus: 'source-stated-recommendation', supportingAtomIds: ['A1'], fields: [{ fieldName: 'action', value: 'validate input', knowledgeState: 'stated', supportingAtomIds: ['A1'] }], conditions: [], limitations: [], reviewRequired: true, authority: 'candidate', productionAccepted: false, automaticPromotionAllowed: false, designGraphMutationAllowed: false };
  it('accepts only field-to-validated-atom lineage', () => { expect(validateTypedAssetGate(stageB(validAsset), accepted).acceptedAssets).toHaveLength(1); });
  it('rejects unvalidated atom references', () => { expect(validateTypedAssetGate(stageB({ ...validAsset, supportingAtomIds: ['NOPE'] }), accepted).rejectedAssets[0]?.reasons).toContain('R2_UNVALIDATED_ATOM_REFERENCE:NOPE'); });
  it('rejects cross-case atom contamination', () => { expect(validateTypedAssetGate(stageB({ ...validAsset, caseId: 'C2' }), accepted).crossCaseContamination).toBeGreaterThan(0); });
  it('requires stated fields to cite validated atoms', () => { expect(validateTypedAssetGate(stageB({ ...validAsset, fields: [{ fieldName: 'action', value: 'validate', knowledgeState: 'stated', supportingAtomIds: [] }] }), accepted).rejectedAssets[0]?.reasons).toContain('R2_STATED_FIELD_WITHOUT_ATOM:action'); });
  it('requires all four supported Pattern DNA fields', () => { expect(validateTypedAssetGate(stageB({ ...validAsset, assetType: 'pattern-dna' }), accepted).rejectedAssets[0]?.reasons).toContain('R2_PATTERN_DNA_FIELD_REQUIRED:context-or-trigger'); });
  it('denies candidate authority leakage, approved-store mutation and promotion at schema level', () => { expect(() => gate6b2R2StageBSchema.parse({ ...stageB(validAsset), productionAccepted: true })).toThrow(); expect(() => gate6b2R2StageBSchema.parse({ ...stageB(validAsset), automaticPromotionAllowed: true })).toThrow(); expect(() => gate6b2R2StageBSchema.parse({ ...stageB(validAsset), designGraphMutationAllowed: true })).toThrow(); });
  it('resolves the no-evidence control deterministically with zero provider calls', () => { expect(deterministicNoEvidenceControl()).toMatchObject({ disposition: 'abstain-insufficient-evidence', providerCalls: 0, candidateClaimsCreated: 0 }); });
  it('allows semantic rejection to be recorded without representing protocol failure', () => { const result = validateTypedAssetGate(stageB({ ...validAsset, supportingAtomIds: ['NOPE'] }), accepted); expect(result.rejectedAssets).toHaveLength(1); expect(() => validateTypedAssetGate(stageB(validAsset), accepted)).not.toThrow(); });
});
