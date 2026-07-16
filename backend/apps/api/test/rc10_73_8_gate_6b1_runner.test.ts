import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PINNED_MODEL,
  PURPOSE,
  MATCHED_CASE_PAIRS,
  Gate6b1Stop,
  type BenchmarkManifest,
  type PlannedRequest,
  assertNoForbiddenOutcome,
  assessPlan,
  buildRequestPlan,
  collectExecutionAuthorizationBlockers,
  executeIsolatedStrategies,
  createGovernedGatewayExecutor,
  calculateStrategyRequestCharacters,
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
const limits = {
  maximumSemanticUnits: 24, plannedCalls: 36, maximumCalls: 40, maximumTotalTokens: 120_000,
  maximumRetries: 1, globalRetryBudget: 4, maximumIndividualRequestCharacters: 10_000,
  maximumGroupedRequestCharacters: 18_000, concurrency: 2,
};
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
    expect(first.filter((item) => item.strategy === 'same-source-bounded-micro-batches')).toHaveLength(6);
    expect(first.filter((item) => item.strategy === 'bounded-architecture-group')).toHaveLength(6);
    expect(first).toHaveLength(36);
    const assessment = assessPlan(first, limits);
    expect(assessment).toMatchObject({ plannedRequestCount: 36, maximumCallsIncludingRetryReserve: 40, blockers: [] });
    expect(assessment.projectedTokenEnvelope.maximumIncludingRetries).toBeLessThanOrEqual(120_000);
    const groupedPairs = first.filter((item) => item.strategy === 'same-source-bounded-micro-batches').map((item) => item.caseIds);
    expect(groupedPairs).toEqual(MATCHED_CASE_PAIRS.map((pair) => [...pair]));
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
    expect(code(() => validatePlanLimits(buildRequestPlan(manifest), { ...limits, maximumCalls: 39 }))).toBe('CALL_LIMIT_EXCEEDED');
  });
  it('stops when the token envelope is exceeded', () => {
    expect(code(() => validatePlanLimits(buildRequestPlan(manifest), { ...limits, maximumTotalTokens: 1 }))).toBe('TOKEN_ESTIMATE_EXCEEDED');
  });
  it('accepts the revised character bounds and stops an oversized individual request', () => {
    const plan = buildRequestPlan(manifest);
    expect(code(() => validateRequestCharacterBounds(plan, limits))).toBe('NO_ERROR');
    const invalid = [{ ...plan[0], inputCharacters: 10_001 }];
    expect(code(() => validateRequestCharacterBounds(invalid, limits))).toBe('REQUEST_INPUT_LIMIT_EXCEEDED');
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
    const full = buildRequestPlan(manifest);
    const plan = (['one-semantic-unit-per-call', 'same-source-bounded-micro-batches', 'bounded-architecture-group'] as const)
      .map((strategy) => full.find((item) => item.strategy === strategy)!);
    let adapterCalls = 0;
    const result = await executeIsolatedStrategies({
      plan,
      limits: { ...limits, plannedCalls: 3, maximumCalls: 3, globalRetryBudget: 0, maximumTotalTokens: 20_000 },
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
  it('stops before a retry can exceed the absolute provider-call ceiling', async () => {
    const planned = buildRequestPlan(manifest)[0];
    await expect(executeIsolatedStrategies({
      plan: [planned],
      limits: { ...limits, plannedCalls: 1, maximumCalls: 1, globalRetryBudget: 1, maximumTotalTokens: 10_000 },
      freeBytes: async () => 17 * 1024 ** 3,
      executor: async () => { throw new Gate6b1Stop('HTTP_429', 'fixture'); },
    })).rejects.toMatchObject({ code: 'CALL_LIMIT_EXCEEDED' });
  });
  it('binds live execution to the existing governed LLM gateway interface without direct HTTP', async () => {
    const excerpt = 'A bounded public architecture statement with one explicit limitation.';
    const excerptHash = `sha256:${createHash('sha256').update(excerpt).digest('hex')}`;
    const unit = {
      semanticUnitId: 'SEMU-fixture', evidenceId: 'BEV-1234567890abcdef12345678', connectorId: 'GH-FIXTURE', repository: 'owner/repo',
      immutableCommit: 'a'.repeat(40), path: 'docs/example.md', structuralRange: 'lines 1-2', excerpt, excerptHash,
      parserVersion: 'fixture-v1', sourceAuthorityClass: 'reviewed-practitioner-or-implementation-source',
    };
    const base = buildRequestPlan(manifest)[0];
    const promptCases = [{ caseId: 'CASE-1', semanticUnitId: unit.semanticUnitId, evidenceId: unit.evidenceId, repository: unit.repository, immutableCommit: unit.immutableCommit, path: unit.path, structuralRange: unit.structuralRange, excerpt }];
    const planned = { ...base, caseIds: ['CASE-1'], semanticUnitIds: [unit.semanticUnitId], evidenceIds: [unit.evidenceId], repositories: [unit.repository], architectureGroupIds: [], caseLineage: [{ caseId: 'CASE-1', evidenceId: unit.evidenceId, excerptHash }], inputCharacters: calculateStrategyRequestCharacters(base.strategy, base.matchedPairId, [], promptCases) };
    let gatewayCalls = 0;
    const candidates: unknown[] = [];
    const executor = createGovernedGatewayExecutor({
      evidenceByCase: new Map([['CASE-1', unit]]),
      appendCandidate: async (record) => { candidates.push(record); },
      gateway: { generateJson: async (request: any) => {
        gatewayCalls += 1;
        expect(request).toMatchObject({ purpose: PURPOSE, requireEvidenceAllowlist: true, requireProviderNativeSchema: true });
        return {
          value: { schemaVersion: '1.0', authority: 'candidate', cases: [{ caseId: 'CASE-1', evidenceId: unit.evidenceId, disposition: 'abstain', claims: [], abstentionReason: 'Fixture abstention.', reviewRequired: true }], productionAccepted: false, automaticPromotionAllowed: false, designGraphMutationAllowed: false },
          usage: { inputTokens: 20, outputTokens: 10 }, schemaValidation: { valid: true, violations: [] }, groundingReceipt: { verified: true },
        };
      } } as any,
    });
    const outcome = await executor(planned);
    expect(gatewayCalls).toBe(1);
    expect(candidates).toHaveLength(1);
    expect(outcome).toMatchObject({ candidateAuthority: 'candidate', candidateRecordsCreated: 1, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0 });
  });
  it('uses an empty evidence allowlist and requires strict abstention for the no-evidence control', async () => {
    const excerpt = '[No governed bounded evidence is available for this control.]';
    const excerptHash = `sha256:${createHash('sha256').update(excerpt).digest('hex')}`;
    const base = buildRequestPlan(manifest)[0];
    const promptCases = [{ caseId: 'CASE-NO-EVIDENCE', semanticUnitId: 'SEMU-NO-EVIDENCE', evidenceId: null, repository: 'owner/repo', immutableCommit: null, path: null, structuralRange: null, excerpt }];
    const planned = {
      ...base, caseIds: ['CASE-NO-EVIDENCE'], semanticUnitIds: ['SEMU-NO-EVIDENCE'], evidenceIds: [], repositories: ['owner/repo'], architectureGroupIds: [],
      caseLineage: [{ caseId: 'CASE-NO-EVIDENCE', evidenceId: null, excerptHash }],
      inputCharacters: calculateStrategyRequestCharacters(base.strategy, base.matchedPairId, [], promptCases),
    };
    const candidates: unknown[] = [];
    const executor = createGovernedGatewayExecutor({
      evidenceByCase: new Map([['CASE-NO-EVIDENCE', { kind: 'no-evidence-control', semanticUnitId: 'SEMU-NO-EVIDENCE', connectorId: 'GH-FIXTURE', repository: 'owner/repo', sourceAuthorityClass: 'educational-or-discovery-source', excerpt, excerptHash }]]),
      appendCandidate: async (record) => { candidates.push(record); },
      gateway: { generateJson: async (request: any) => {
        expect(request.grounding).toMatchObject({ allowedReferenceIds: [], sources: [], requireCitations: false });
        return {
          value: { schemaVersion: '1.0', authority: 'candidate', cases: [{ caseId: 'CASE-NO-EVIDENCE', evidenceId: null, disposition: 'abstain', claims: [], abstentionReason: 'No governed evidence is available.', reviewRequired: true }], productionAccepted: false, automaticPromotionAllowed: false, designGraphMutationAllowed: false },
          usage: { inputTokens: 20, outputTokens: 10 }, schemaValidation: { valid: true, violations: [] }, groundingReceipt: { verified: true },
        };
      } } as any,
    });
    await expect(executor(planned)).resolves.toMatchObject({ candidateRecordsCreated: 1, evidenceLineageValid: true });
    expect(candidates).toHaveLength(1);
  });
});
