import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PINNED_MODEL,
  PURPOSE,
  Gate6b1Stop,
  type BenchmarkManifest,
  type PlannedRequest,
  assertNoForbiddenOutcome,
  buildRequestPlan,
  collectExecutionAuthorizationBlockers,
  executeIsolatedStrategies,
  validateBenchmark,
  validateIndependentReviewReceipt,
  validatePlanLimits,
  validateRequestIsolation,
  validateRequestCharacterBounds,
  validateRuntimePosture,
  validateTokenAndCostReceipt,
} from '../../../scripts/rc10-73-8/run-gate-6b-strategy-micro-pilot.mts';

const root = resolve(import.meta.dirname, '..', '..', '..', '..');
const manifestPath = resolve(root, 'release-evidence', 'rc10.73.8', 'GATE_6B_24_CASE_BENCHMARK_MANIFEST.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as BenchmarkManifest;
const limits = { maximumSemanticUnits: 24, maximumCalls: 100, maximumTotalTokens: 500_000, maximumRetries: 1, concurrency: 2 };
const posture = {
  provider: 'openai' as const, exactModel: PINNED_MODEL, allowedSnapshots: [PINNED_MODEL], purpose: PURPOSE,
  fallbackDisabled: true, candidateOnlyPersistence: true, designGraphMutationProhibited: true, automaticPromotionProhibited: true,
};
const code = (action: () => unknown) => {
  try { action(); return 'NO_ERROR'; } catch (error) { return error instanceof Gate6b1Stop ? error.code : 'UNEXPECTED'; }
};

describe('Gate 6B.1 offline runner fail-closed controls', () => {
  it('builds all strategies deterministically without provider access', () => {
    validateRuntimePosture(posture);
    validateBenchmark(manifest, manifest.fingerprint, limits);
    const first = buildRequestPlan(manifest);
    const second = buildRequestPlan(manifest);
    expect(first).toEqual(second);
    expect(first.filter((item) => item.strategy === 'one-semantic-unit-per-call')).toHaveLength(24);
    expect(first.filter((item) => item.strategy === 'same-source-bounded-micro-batches')).toHaveLength(17);
    expect(first.filter((item) => item.strategy === 'bounded-architecture-group')).toHaveLength(18);
  });

  it('stops on an incorrect benchmark fingerprint', () => {
    expect(code(() => validateBenchmark(manifest, 'sha256:wrong', limits))).toBe('BENCHMARK_FINGERPRINT_MISMATCH');
  });
  it('stops when independent review is missing', () => {
    expect(code(() => validateIndependentReviewReceipt({}, manifest.fingerprint))).toBe('INDEPENDENT_REVIEW_RECEIPT_INVALID');
  });
  it('stops when token and cost approval is missing', () => {
    expect(code(() => validateTokenAndCostReceipt({}, PINNED_MODEL, limits))).toBe('TOKEN_AND_COST_APPROVAL_INVALID');
  });
  it('stops on a model mismatch', () => {
    expect(code(() => validateRuntimePosture({ ...posture, exactModel: 'gpt-4.1-2025-04-14' }))).toBe('MODEL_MISMATCH');
  });
  it('stops when an alias replaces the pinned snapshot', () => {
    expect(code(() => validateRuntimePosture({ ...posture, exactModel: 'gpt-4.1-mini' }))).toBe('MODEL_MISMATCH');
  });
  it('stops on a wildcard model entry', () => {
    expect(code(() => validateRuntimePosture({ ...posture, exactModel: 'gpt-4.1-mini-*' }))).toBe('WILDCARD_MODEL_ENTRY');
  });
  it('stops when fallback is enabled', () => {
    expect(code(() => validateRuntimePosture({ ...posture, fallbackDisabled: false }))).toBe('FALLBACK_ENABLED');
  });
  it('stops when the semantic-unit ceiling is exceeded', () => {
    expect(code(() => validateBenchmark(manifest, manifest.fingerprint, { ...limits, maximumSemanticUnits: 23 }))).toBe('SEMANTIC_UNIT_LIMIT_EXCEEDED');
  });
  it('stops when the call ceiling is exceeded', () => {
    expect(code(() => validatePlanLimits(buildRequestPlan(manifest), { ...limits, maximumCalls: 40 }))).toBe('CALL_LIMIT_EXCEEDED');
  });
  it('stops when the token envelope is exceeded', () => {
    expect(code(() => validatePlanLimits(buildRequestPlan(manifest), { ...limits, maximumCalls: 100, maximumTotalTokens: 1 }))).toBe('TOKEN_ESTIMATE_EXCEEDED');
  });
  it('stops when a bounded request exceeds the 8,000-character route limit', () => {
    expect(code(() => validateRequestCharacterBounds(buildRequestPlan(manifest)))).toBe('REQUEST_INPUT_LIMIT_EXCEEDED');
  });
  it('stops on an invalid evidence ID', () => {
    const copy = structuredClone(manifest); copy.cases[0].evidenceId = 'BEV-invalid';
    expect(code(() => validateBenchmark(copy, copy.fingerprint, limits))).toBe('INVALID_EVIDENCE_ID');
  });
  it('stops on an excerpt-hash mismatch', () => {
    const copy = structuredClone(manifest); copy.cases[0].boundedEvidenceHash = 'sha256:mismatch';
    expect(code(() => validateBenchmark(copy, copy.fingerprint, limits))).toBe('EXCERPT_HASH_MISMATCH');
  });
  it('stops a cross-source micro-batch', () => {
    const invalid = { ...buildRequestPlan(manifest)[24], repositories: ['one/repo', 'other/repo'] } as PlannedRequest;
    expect(code(() => validateRequestIsolation([invalid]))).toBe('CROSS_SOURCE_MICRO_BATCH');
  });
  it('stops unrelated architecture-group mixing', () => {
    const valid = buildRequestPlan(manifest).find((item) => item.strategy === 'bounded-architecture-group')!;
    const invalid = { ...valid, caseIds: ['one', 'two'], architectureGroupIds: ['ACFG-one', 'ACFG-two'] };
    expect(code(() => validateRequestIsolation([invalid]))).toBe('UNRELATED_ARCHITECTURE_GROUP_MIXTURE');
  });
  it('reports a missing secret and insufficient capacity before execution', () => {
    const blockers = collectExecutionAuthorizationBlockers({ capacityReady: false, secretPresent: false, executionApprovalPresent: true, independentReviewValid: true, tokenAndCostApprovalValid: true });
    expect(blockers).toEqual(['INSUFFICIENT_DISK_CAPACITY', 'MISSING_SECRET']);
  });
  it('stops candidate-authority leakage', () => {
    expect(code(() => assertNoForbiddenOutcome({ candidateAuthority: 'approved', approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0 }))).toBe('CANDIDATE_AUTHORITY_LEAKAGE');
  });
  it('stops Design Graph mutation attempts', () => {
    expect(code(() => assertNoForbiddenOutcome({ candidateAuthority: 'candidate', approvedRecordsChanged: 0, designGraphMutations: 1, automaticPromotions: 0 }))).toBe('DESIGN_GRAPH_MUTATION_ATTEMPT');
  });
  it('stops automatic-promotion attempts', () => {
    expect(code(() => assertNoForbiddenOutcome({ candidateAuthority: 'candidate', approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 1 }))).toBe('AUTOMATIC_PROMOTION_ATTEMPT');
  });
  it('executes three strategies as isolated offline requests through an injected adapter', async () => {
    const source = buildRequestPlan(manifest).find((item) => item.strategy === 'one-semantic-unit-per-call')!;
    const plan = (['one-semantic-unit-per-call', 'same-source-bounded-micro-batches', 'bounded-architecture-group'] as const).map((strategy, index) => ({
      ...source, requestId: `${strategy}:fixture-${index}`, strategy,
    }));
    let adapterCalls = 0;
    const result = await executeIsolatedStrategies({
      plan,
      limits: { ...limits, maximumCalls: 3, maximumTotalTokens: 10_000 },
      freeBytes: async () => 16 * 1024 ** 3,
      executor: async () => {
        adapterCalls += 1;
        return { candidateAuthority: 'candidate', candidateRecordsCreated: 1, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0, inputTokens: 100, outputTokens: 50, schemaValid: true, evidenceLineageValid: true };
      },
    });
    expect(adapterCalls).toBe(3);
    expect(result.strategies.map((item) => item.strategy)).toEqual(['one-semantic-unit-per-call', 'same-source-bounded-micro-batches', 'bounded-architecture-group']);
    expect(result).toMatchObject({ totalCalls: 3, totalRetries: 0, totalTokens: 450 });
  });
});
