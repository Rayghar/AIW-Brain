import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LlmRuntimePolicy } from '@aiw/domain';
import { redactForModel } from '../../apps/api/src/dataRedaction.js';
import { LlmGateway } from '../../apps/api/src/llmGateway.js';
import type { Gate6bEvidenceUnit } from '../../apps/api/src/gate6bSemanticTransformation.js';
import {
  CONTROLLED_STOP_FLOOR_BYTES,
  Gate6b1Stop,
  PINNED_MODEL,
  PURPOSE,
  PREFERRED_FREE_BYTES,
  assessPlan,
  buildRequestPlan,
  createGovernedGatewayExecutor,
  deterministicRequestPlanFingerprint,
  executeIsolatedStrategies,
  matchedSubsetFingerprint,
  validateBenchmark,
  validateIndependentReviewReceipt,
  validatePlanLimits,
  validateRuntimePosture,
  validateTokenAndCostReceipt,
  type BenchmarkManifest,
  type Gate6bNoEvidenceControl,
  type GovernedRequestOutcome,
  type PlannedRequest,
  type RunnerLimits,
  type StrategyId,
} from './run-gate-6b-strategy-micro-pilot.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const evidenceRoot = resolve(root, 'release-evidence', 'rc10.73.8');
const manifestPath = resolve(evidenceRoot, 'GATE_6B_24_CASE_BENCHMARK_MANIFEST.json');
const reviewReceiptPath = resolve(evidenceRoot, 'GATE_6B_24_CASE_INDEPENDENT_REVIEW_RECEIPT.json');
const costReceiptPath = resolve(evidenceRoot, 'GATE_6B_1_TOKEN_AND_COST_APPROVAL_RECEIPT.json');
const runtimePolicyPath = resolve(root, 'backend', 'config', 'llm-runtime-overrides.json');
const snapshotIndexPath = resolve(root, 'release-evidence', 'rc10.73.7', 'CONTENT_SNAPSHOT_MANIFEST_INDEX.json');
const repositoryIdentityPath = resolve(root, 'release-evidence', 'rc10.73.7', 'GITHUB_REPOSITORY_IDENTITY_RESOLUTION.json');
const governanceMatrixPath = resolve(root, 'release-evidence', 'rc10.73.7', 'ALL_47_REPOSITORY_GOVERNANCE_MATRIX.json');
const EXPECTED_BENCHMARK_FINGERPRINT = 'sha256:f11583bc507e3abdd88e4a5f914c27fdde6ab71e4e9d3594a59151f168cd9974';
const EXPECTED_PLAN_FINGERPRINT = 'sha256:7f42ec8ec9005362c8b929a6e8b31c9f0ecf9b8266a6eadaec2476c503120623';
const EXPECTED_MATCHED_FINGERPRINT = 'sha256:de914b8c218039477e23e55b0d32d33025e1c695a3a7f64e99e41c496ec3262d';
const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const DELEGATED_EXECUTION_THRESHOLD_BYTES = Math.floor(13.5 * GIB);
const REQUIRED_PEAK_MARGIN_BYTES = 2 * GIB;
const PROJECTED_TEMPORARY_BYTES = 512 * MIB;
const PROJECTED_PERMANENT_BYTES = 128 * MIB;
const NO_EVIDENCE_CONTROL = '[No governed bounded evidence is available for this control.]';
const PHONE_SHAPED = /(?<!\d)(?:\+?\d[\d\s().-]{8,}\d)(?!\d)/g;
const limits: RunnerLimits = {
  maximumSemanticUnits: 24,
  plannedCalls: 36,
  maximumCalls: 40,
  maximumTotalTokens: 120_000,
  maximumRetries: 1,
  globalRetryBudget: 4,
  maximumIndividualRequestCharacters: 10_000,
  maximumGroupedRequestCharacters: 18_000,
  concurrency: 2,
};

const sha256 = (value: string | Buffer): string => `sha256:${createHash('sha256').update(value).digest('hex')}`;

async function readJson(path: string): Promise<any> {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, path);
}

async function freeBytes(): Promise<number> {
  const { statfs } = await import('node:fs/promises');
  const disk = await statfs(root, { bigint: true });
  return Number(disk.bavail * disk.bsize);
}

function governedPolicy(raw: any): LlmRuntimePolicy {
  const configured = raw?.tenants?.['gate-6b-local-smoke'] ?? raw;
  const route = configured?.routes?.find((item: any) => item.providerId === 'openai' && item.purpose === PURPOSE && item.model === PINNED_MODEL);
  const allowlist = configured?.modelAllowlist?.filter((item: any) => item.providerId === 'openai' && item.purposes?.includes(PURPOSE) && item.model === PINNED_MODEL);
  if (!route || allowlist?.length !== 1) throw new Gate6b1Stop('MODEL_NOT_ALLOWLISTED', 'The exact dated snapshot is not uniquely configured for the governed purpose.');
  const policy: LlmRuntimePolicy = {
    ...configured,
    routes: [{ ...route, maxOutputTokens: 1_500, fallbackRouteIds: [], enabled: true, dataClassificationAllowlist: ['public'] }],
    modelAllowlist: allowlist,
    maxInputCharacters: 18_000,
    allowFallback: false,
    requireStructuredOutput: true,
    redactSecrets: true,
    logPrompts: false,
    retainProviderContent: false,
    maxRetries: 0,
  };
  validateRuntimePosture({
    provider: 'openai', exactModel: PINNED_MODEL, allowedSnapshots: allowlist[0].allowedSnapshots ?? [], purpose: PURPOSE,
    fallbackDisabled: policy.allowFallback === false && policy.routes.every((item) => item.fallbackRouteIds.length === 0),
    candidateOnlyPersistence: true, designGraphMutationProhibited: true, automaticPromotionProhibited: true,
  });
  return policy;
}

async function capacityReceipt(): Promise<Record<string, unknown>> {
  const measured = await freeBytes();
  const projectedPeakFree = measured - PROJECTED_TEMPORARY_BYTES - PROJECTED_PERMANENT_BYTES;
  const minimumPeakFree = CONTROLLED_STOP_FLOOR_BYTES + REQUIRED_PEAK_MARGIN_BYTES;
  const passed = measured >= DELEGATED_EXECUTION_THRESHOLD_BYTES && projectedPeakFree >= minimumPeakFree;
  const receipt = {
    schemaVersion: 'aiw-gate-6b-1-delegated-capacity-threshold-receipt-v1', generatedAt: new Date().toISOString(), productionAccepted: false,
    standardPreferredThresholdBytes: PREFERRED_FREE_BYTES,
    standardPreferredThresholdMet: measured >= PREFERRED_FREE_BYTES,
    safeClearlyAiwOwnedCleanupCouldReachStandardThreshold: false,
    cleanupPerformed: false,
    cleanupDeletionCount: 0,
    cleanupBytesRecovered: 0,
    rationale: 'Clearly AIW-owned rebuildable outputs were insufficient to reach 16 GiB without deleting retained package or browser caches or unrelated operating-system/application logs. Product-owner-delegated Sol authority lowered only the immediate threshold for this bounded run after a conservative peak calculation.',
    delegatedExecutionThresholdBytes: DELEGATED_EXECUTION_THRESHOLD_BYTES,
    delegationBasis: 'product-owner-delegated technical authority for the bounded Gate 6B.1 run',
    freeBytesBeforeExecution: measured,
    projectedTemporaryBytes: PROJECTED_TEMPORARY_BYTES,
    projectedPermanentBytes: PROJECTED_PERMANENT_BYTES,
    projectedPeakFreeBytes: projectedPeakFree,
    controlledStopFloorBytes: CONTROLLED_STOP_FLOOR_BYTES,
    requiredAdditionalSafetyMarginBytes: REQUIRED_PEAK_MARGIN_BYTES,
    minimumProjectedPeakFreeBytes: minimumPeakFree,
    projectedMarginAboveControlledStopFloorBytes: projectedPeakFree - CONTROLLED_STOP_FLOOR_BYTES,
    rawEvidenceDeletionCount: 0,
    governedEvidenceDeletionCount: 0,
    backupStatus: 'deferred-by-product-owner',
    passed,
  };
  await writeJsonAtomic(resolve(evidenceRoot, 'GATE_6B_1_DELEGATED_CAPACITY_THRESHOLD_RECEIPT.json'), receipt);
  if (!passed) throw new Gate6b1Stop('INSUFFICIENT_DISK_CAPACITY', 'The delegated bounded-run capacity threshold or peak safety margin is not satisfied.');
  return receipt;
}

async function resolveInputs(manifest: BenchmarkManifest): Promise<{ inputs: Map<string, Gate6bEvidenceUnit | Gate6bNoEvidenceControl>; receipt: Record<string, unknown> }> {
  const index = await readJson(snapshotIndexPath);
  const identityIndex = await readJson(repositoryIdentityPath);
  const governanceMatrix = await readJson(governanceMatrixPath);
  const byConnector = new Map((index.manifests ?? []).map((item: any) => [item.connectorId, item]));
  const identityByConnector = new Map((identityIndex.repositories ?? identityIndex.results ?? []).map((item: any) => [item.connectorId, item]));
  const governanceByConnector = new Map((governanceMatrix.repositories ?? governanceMatrix.connectors ?? []).map((item: any) => [item.connectorId, item]));
  const inputs = new Map<string, Gate6bEvidenceUnit | Gate6bNoEvidenceControl>();
  const receipts: Array<Record<string, unknown>> = [];
  let redactionFindingCount = 0;
  let reviewedPublicIdentifierFalsePositives = 0;
  for (const benchmarkCase of manifest.cases) {
    const identity = identityByConnector.get(benchmarkCase.connectorId) as any;
    const governance = governanceByConnector.get(benchmarkCase.connectorId) as any;
    const publicIdentity = identity?.visibility === 'public' && identity?.reachable === true
      && identity?.requestedOwnerRepository === benchmarkCase.repository && identity?.resolvedOwnerRepository === benchmarkCase.repository;
    const governedTransfer = governance?.acquisitionStatus === 'approved'
      && (governance?.permittedUses ?? governance?.intendedAiwUse ?? []).includes('sol-semantic-analysis')
      && (governance?.permittedUses ?? governance?.intendedAiwUse ?? []).includes('candidate-knowledge-extraction')
      && (governance?.prohibitedUses ?? []).includes('automatic-knowledge-promotion')
      && (governance?.prohibitedUses ?? []).includes('canonical-design-graph-mutation');
    if (!publicIdentity || !governedTransfer) throw new Gate6b1Stop('EXTERNAL_TRANSFER_NOT_GOVERNED', `Public identity or semantic-analysis governance failed for ${benchmarkCase.caseId}.`);
    if (!benchmarkCase.evidenceAvailable) {
      if (benchmarkCase.caseId !== 'G6B1-24' || benchmarkCase.evidenceId !== null || benchmarkCase.boundedEvidenceHash !== sha256(NO_EVIDENCE_CONTROL)) {
        throw new Gate6b1Stop('NO_EVIDENCE_CONTROL_INVALID', `Unavailable evidence control failed for ${benchmarkCase.caseId}.`);
      }
      inputs.set(benchmarkCase.caseId, {
        kind: 'no-evidence-control', semanticUnitId: benchmarkCase.semanticUnitId, connectorId: benchmarkCase.connectorId,
        repository: benchmarkCase.repository, sourceAuthorityClass: benchmarkCase.sourceAuthorityClass,
        excerpt: NO_EVIDENCE_CONTROL, excerptHash: benchmarkCase.boundedEvidenceHash,
      });
      receipts.push({ caseId: benchmarkCase.caseId, evidenceId: null, repository: benchmarkCase.repository, evidenceAvailable: false, hashReplay: true, publicRepositoryIdentityVerified: true, semanticAnalysisPermitted: true, transferPosture: 'no-repository-evidence-transferred-strict-abstention-control' });
      continue;
    }
    const snapshot = byConnector.get(benchmarkCase.connectorId) as any;
    if (!snapshot || snapshot.repository !== benchmarkCase.repository || snapshot.immutableCommit !== benchmarkCase.immutableCommit) {
      throw new Gate6b1Stop('SNAPSHOT_IDENTITY_MISMATCH', `Snapshot identity mismatch for ${benchmarkCase.caseId}.`);
    }
    const parserPath = resolve(dirname(resolve(root, snapshot.manifestPath)), 'files', `${benchmarkCase.path}.aiw.json`);
    const parsed = await readJson(parserPath);
    const passage = parsed.evidencePassages?.find((item: any) => item.evidenceId === benchmarkCase.evidenceId);
    const excerpt = String(passage?.boundedExcerpt ?? '');
    const hashReplay = Boolean(excerpt) && sha256(excerpt) === benchmarkCase.excerptHash && passage?.excerptHash === benchmarkCase.excerptHash;
    if (!hashReplay || passage.connectorId !== benchmarkCase.connectorId || passage.repository !== benchmarkCase.repository
      || passage.immutableCommitSha !== benchmarkCase.immutableCommit || passage.path !== benchmarkCase.path) {
      throw new Gate6b1Stop('EXCERPT_HASH_MISMATCH', `Immutable evidence replay failed for ${benchmarkCase.caseId}.`);
    }
    const redaction = redactForModel(excerpt, 'restricted');
    redactionFindingCount += redaction.findings.length;
    const nonPhoneFindings = redaction.findings.filter((item) => item.kind !== 'phone');
    const phoneMatches = [...excerpt.matchAll(PHONE_SHAPED)].map((item) => item[0]);
    const reviewedStructuredPublicIdentifiers = phoneMatches.length === redaction.findings.filter((item) => item.kind === 'phone').length
      && phoneMatches.every((value) => {
        const digits = value.match(/\d/g)?.length ?? 0;
        const cannotBeE164Phone = digits > 15;
        const bibliographicIdentifier = /^\d[\d-]{11,16}\d$/.test(value)
          && /literatureSearch\/second-search\/springerlink\/.+\.csv$/i.test(benchmarkCase.path ?? '');
        return cannotBeE164Phone || bibliographicIdentifier;
      });
    if (nonPhoneFindings.length || (phoneMatches.length > 0 && !reviewedStructuredPublicIdentifiers)) {
      throw new Gate6b1Stop('SECRET_EXPOSURE_RISK', `Redaction found protected material in ${benchmarkCase.caseId}; no provider call was made.`);
    }
    reviewedPublicIdentifierFalsePositives += phoneMatches.length;
    inputs.set(benchmarkCase.caseId, {
      semanticUnitId: benchmarkCase.semanticUnitId, evidenceId: benchmarkCase.evidenceId!, connectorId: benchmarkCase.connectorId,
      repository: benchmarkCase.repository, immutableCommit: benchmarkCase.immutableCommit!, path: benchmarkCase.path!,
      ...(passage.heading ? { heading: passage.heading } : {}), structuralRange: passage.structuralRange ?? benchmarkCase.structuralRange ?? 'bounded-parser-range',
      excerpt, excerptHash: benchmarkCase.excerptHash, parserVersion: passage.parserVersion ?? parsed.parserVersion ?? 'unknown',
      sourceAuthorityClass: benchmarkCase.sourceAuthorityClass,
    });
    receipts.push({
      caseId: benchmarkCase.caseId, evidenceId: benchmarkCase.evidenceId, connectorId: benchmarkCase.connectorId,
      repository: benchmarkCase.repository, immutableCommit: benchmarkCase.immutableCommit, path: benchmarkCase.path,
      publicRepositoryIdentityVerified: true, semanticAnalysisPermitted: true, candidateExtractionPermitted: true,
      excerptHash: benchmarkCase.excerptHash, hashReplay, protectedMaterialFindings: nonPhoneFindings.length,
      reviewedPublicNumericIdentifierFalsePositives: phoneMatches.length, passageContentRecorded: false,
    });
  }
  const receipt = {
    schemaVersion: 'aiw-gate-6b-1-evidence-transfer-safety-receipt-v1', generatedAt: new Date().toISOString(), productionAccepted: false,
    benchmarkFingerprint: manifest.fingerprint, casesVerified: receipts.length, repositoryEvidencePassages: receipts.filter((item) => item.evidenceId).length,
    noEvidenceControls: receipts.filter((item) => !item.evidenceId).length, rawRestrictedDetectorFindingCount: redactionFindingCount,
    reviewedPublicIdentifierFalsePositives,
    protectedMaterialFindingCount: redactionFindingCount - reviewedPublicIdentifierFalsePositives,
    credentialsTransferred: 0, secretsTransferred: 0, internalAiwSourceTransferred: 0,
    repositoriesVerifiedPublic: [...new Set(receipts.map((item) => item.repository).filter(Boolean))].length,
    allRepositoryIdentitiesPublicAndExact: receipts.every((item) => item.publicRepositoryIdentityVerified === true),
    allTransfersGovernedForCandidateSemanticAnalysis: receipts.every((item) => item.semanticAnalysisPermitted === true),
    passageContentRecordedInReceipt: false, exactHashReplayPassed: receipts.every((item) => item.hashReplay === true),
    receipts,
  };
  await writeJsonAtomic(resolve(evidenceRoot, 'GATE_6B_1_EVIDENCE_TRANSFER_SAFETY_RECEIPT.json'), receipt);
  return { inputs, receipt };
}

async function main(): Promise<void> {
  if (!process.argv.includes('--approved-product-owner-delegated-execution')) {
    throw new Gate6b1Stop('EXECUTION_APPROVAL_MISSING', 'The explicit product-owner-delegated execution flag is required.');
  }
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Gate6b1Stop('MISSING_SECRET', 'OPENAI_API_KEY is absent from the backend process environment.');
  await mkdir(evidenceRoot, { recursive: true });
  const startedAt = new Date().toISOString();
  const manifest = await readJson(manifestPath) as BenchmarkManifest;
  validateBenchmark(manifest, EXPECTED_BENCHMARK_FINGERPRINT, limits);
  const plan = buildRequestPlan(manifest);
  validatePlanLimits(plan, limits);
  const planFingerprint = deterministicRequestPlanFingerprint(plan);
  const committedPlan = await readJson(resolve(evidenceRoot, 'GATE_6B_1_REVISED_REQUEST_PLAN.json'));
  if (committedPlan.deterministicFingerprint !== EXPECTED_PLAN_FINGERPRINT) throw new Gate6b1Stop('REQUEST_PLAN_REPLAY_MISMATCH', 'The committed request-plan fingerprint is not the approved fingerprint.');
  if (planFingerprint !== EXPECTED_PLAN_FINGERPRINT) throw new Gate6b1Stop('REQUEST_PLAN_REPLAY_MISMATCH', 'The runtime request-plan fingerprint is not the approved fingerprint.');
  if (matchedSubsetFingerprint(manifest) !== EXPECTED_MATCHED_FINGERPRINT) throw new Gate6b1Stop('MATCHED_SUBSET_FINGERPRINT_MISMATCH', 'Matched-subset fingerprint changed.');
  validateIndependentReviewReceipt(await readJson(reviewReceiptPath), manifest.fingerprint);
  validateTokenAndCostReceipt(await readJson(costReceiptPath), PINNED_MODEL, limits);
  const capacityBefore = await capacityReceipt();
  const { inputs, receipt: transferReceipt } = await resolveInputs(manifest);
  const policy = governedPolicy(await readJson(runtimePolicyPath));
  if (process.argv.includes('--preflight-only')) {
    process.stdout.write(`${JSON.stringify({
      status: 'preflight-passed-no-provider-activation', benchmarkFingerprint: manifest.fingerprint,
      requestPlanFingerprint: EXPECTED_PLAN_FINGERPRINT, matchedSubsetFingerprint: EXPECTED_MATCHED_FINGERPRINT,
      resolvedEvidencePassages: inputs.size - 1, noEvidenceControls: 1,
      protectedMaterialFindings: transferReceipt.protectedMaterialFindingCount,
      reviewedPublicIdentifierFalsePositives: transferReceipt.reviewedPublicIdentifierFalsePositives,
      capacityPassed: capacityBefore.passed,
      networkCalls: 0, modelCalls: 0, productionAccepted: false,
    }, null, 2)}\n`);
    return;
  }
  let networkCalls = 0;
  const networkReceipts: Array<{ ordinal: number; status: number; providerRequestId: string | null; observedAt: string }> = [];
  const countedFetch: typeof fetch = async (...args) => {
    networkCalls += 1;
    const response = await fetch(...args);
    networkReceipts.push({ ordinal: networkCalls, status: response.status, providerRequestId: response.headers.get('x-request-id') ?? response.headers.get('openai-request-id'), observedAt: new Date().toISOString() });
    return response;
  };
  const gateway = new LlmGateway(policy, countedFetch);
  let historicalFailedAttempts: any = { failedProviderCallCount: 0, attempts: [] };
  try { historicalFailedAttempts = await readJson(resolve(evidenceRoot, 'GATE_6B_1_LIVE_FAILED_ATTEMPTS.json')); } catch { /* No earlier provider attempt. */ }
  const priorProviderCalls = Number(historicalFailedAttempts.failedProviderCallCount ?? 0);
  const runtimeLimits: RunnerLimits = {
    ...limits,
    maximumCalls: limits.maximumCalls - priorProviderCalls,
    globalRetryBudget: Math.max(0, limits.globalRetryBudget - priorProviderCalls),
  };
  if (runtimeLimits.maximumCalls < limits.plannedCalls || runtimeLimits.globalRetryBudget < 0) {
    throw new Gate6b1Stop('CALL_LIMIT_EXCEEDED', 'Historical provider calls leave insufficient capacity for the approved plan.');
  }
  const candidateRecords: Array<Record<string, unknown>> = [];
  const requestReceipts: Array<Record<string, unknown>> = [];
  const executor = createGovernedGatewayExecutor({
    gateway,
    evidenceByCase: inputs,
    dataClassification: 'public',
    appendCandidate: async (record) => {
      candidateRecords.push({
        candidateRecordId: `G6B1-CAND-${sha256(`${record.requestId}\n${record.strategy}\n${record.caseId}\n${record.evidenceId ?? 'none'}\n${JSON.stringify(record.output)}`).slice(7, 31)}`,
        createdAt: new Date().toISOString(), authority: 'candidate', productionAccepted: false,
        approvedKnowledgeChanged: false, designGraphMutation: false, automaticPromotion: false,
        ...record,
      });
    },
  });
  const checkpointPath = resolve(evidenceRoot, 'GATE_6B_1_LIVE_EXECUTION_CHECKPOINT.json');
  let result: Awaited<ReturnType<typeof executeIsolatedStrategies>>;
  try {
    result = await executeIsolatedStrategies({
      plan, limits: runtimeLimits, executor, freeBytes,
      onRequestComplete: async ({ request, outcome, attempt, totalCalls, totalRetries, totalTokens }) => {
      requestReceipts.push({
        requestId: request.requestId, strategy: request.strategy, caseIds: request.caseIds, evidenceIds: request.evidenceIds,
        attempt, totalCalls, totalRetries, totalTokens, providerId: outcome.providerId, requestedModel: PINNED_MODEL,
        providerReportedModel: outcome.providerReportedModel, httpStatus: outcome.httpStatus, providerRequestId: outcome.providerRequestId,
        latencyMs: outcome.latencyMs, inputTokens: outcome.inputTokens, outputTokens: outcome.outputTokens,
        requestFingerprint: outcome.requestFingerprint, responseFingerprint: outcome.responseFingerprint,
        schemaValid: outcome.schemaValid, evidenceLineageValid: outcome.evidenceLineageValid,
        groundingSupport: outcome.groundingSupport,
        candidateRecordsCreated: outcome.candidateRecordsCreated, candidateAuthority: outcome.candidateAuthority,
        approvedRecordsChanged: outcome.approvedRecordsChanged, designGraphMutations: outcome.designGraphMutations,
        automaticPromotions: outcome.automaticPromotions,
      });
      await writeJsonAtomic(checkpointPath, {
        schemaVersion: 'aiw-gate-6b-1-live-execution-checkpoint-v1', updatedAt: new Date().toISOString(), productionAccepted: false,
        benchmarkFingerprint: manifest.fingerprint, requestPlanFingerprint: EXPECTED_PLAN_FINGERPRINT,
        completedRequests: requestReceipts.length, lastCompletedRequestId: request.requestId, totalCalls, totalRetries, totalTokens,
        candidateRecordCount: candidateRecords.length, candidateLedgerFingerprint: sha256(JSON.stringify(candidateRecords)),
        controlledStopFloorBytes: CONTROLLED_STOP_FLOOR_BYTES, freeBytes: await freeBytes(),
      });
      },
    });
  } catch (error) {
    const transactions = gateway.transactions();
    const safeError = error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000);
    const failedReceipt = {
      schemaVersion: 'aiw-gate-6b-1-live-failed-attempts-v1', generatedAt: new Date().toISOString(), productionAccepted: false,
      absoluteProviderCallCeiling: limits.maximumCalls,
      failedProviderCallCount: priorProviderCalls + networkCalls,
      failedCallsConsumeAbsoluteCallCeiling: true,
      attempts: [...(historicalFailedAttempts.attempts ?? []), ...transactions.map((item, index) => ({
        attemptId: `G6B1-PROVIDER-ATTEMPT-${String(priorProviderCalls + index + 1).padStart(3, '0')}`,
        requestId: requestReceipts.at(-1)?.requestId ?? plan[requestReceipts.length]?.requestId ?? 'unknown',
        provider: 'openai', requestedModel: PINNED_MODEL,
        httpStatus: item.httpStatus ?? null, providerRequestId: item.providerRequestId ?? null,
        inputTokens: item.inputTokens ?? 0, outputTokens: item.outputTokens ?? 0, totalTokens: item.totalTokens ?? 0,
        schemaValidationStatus: item.schemaValidationStatus, identityValidationStatus: item.identityValidationStatus,
        finalDisposition: item.finalDisposition, responseFingerprint: item.responseFingerprint ?? null,
        candidateRecordsCreated: 0, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0,
        secretFindings: 0, rawRequestBodyRecorded: false, unrestrictedProviderResponseRecorded: false,
      }))],
      safeTerminalError: safeError,
      completedRequestCountBeforeStop: requestReceipts.length,
      candidateRecordCountBeforeStop: candidateRecords.length,
      remainingAbsoluteProviderCalls: limits.maximumCalls - priorProviderCalls - networkCalls,
      historicalAttemptRewrittenAsPassed: false,
    };
    await writeJsonAtomic(resolve(evidenceRoot, 'GATE_6B_1_LIVE_FAILED_ATTEMPTS.json'), failedReceipt);
    throw error;
  }
  const completedAt = new Date().toISOString();
  const freeAfter = await freeBytes();
  const transactions = gateway.transactions();
  const deadLetters = gateway.deadLetters();
  const actualInputTokens = transactions.reduce((sum, item) => sum + (item.inputTokens ?? 0), 0);
  const actualOutputTokens = transactions.reduce((sum, item) => sum + (item.outputTokens ?? 0), 0);
  const actualTotalTokens = transactions.reduce((sum, item) => sum + (item.totalTokens ?? (item.inputTokens ?? 0) + (item.outputTokens ?? 0)), 0);
  const historicalInputTokens = (historicalFailedAttempts.attempts ?? []).reduce((sum: number, item: any) => sum + (item.inputTokens ?? 0), 0);
  const historicalOutputTokens = (historicalFailedAttempts.attempts ?? []).reduce((sum: number, item: any) => sum + (item.outputTokens ?? 0), 0);
  const cumulativeInputTokens = historicalInputTokens + actualInputTokens;
  const cumulativeOutputTokens = historicalOutputTokens + actualOutputTokens;
  const cumulativeTotalTokens = cumulativeInputTokens + cumulativeOutputTokens;
  const actualCostUsd = Number(((cumulativeInputTokens * 0.40 + cumulativeOutputTokens * 1.60) / 1_000_000).toFixed(6));
  const cumulativeProviderCalls = priorProviderCalls + networkCalls;
  const candidateReceipt = {
    schemaVersion: 'aiw-gate-6b-1-live-candidate-ledger-v1', generatedAt: completedAt, productionAccepted: false,
    authority: 'candidate', benchmarkFingerprint: manifest.fingerprint, requestPlanFingerprint: EXPECTED_PLAN_FINGERPRINT,
    recordCount: candidateRecords.length, records: candidateRecords,
  };
  await writeJsonAtomic(resolve(evidenceRoot, 'GATE_6B_1_LIVE_CANDIDATE_RECORDS.json'), candidateReceipt);
  const transactionReceipt = {
    schemaVersion: 'aiw-gate-6b-1-live-provider-transaction-receipt-v1', generatedAt: completedAt, productionAccepted: false,
    provider: 'openai', exactRequestedModel: PINNED_MODEL, fallbackEnabled: false,
    historicalRejectedProviderCalls: priorProviderCalls, currentRunNetworkCalls: networkCalls, cumulativeNetworkCallCount: cumulativeProviderCalls,
    providerTransactionCount: transactions.length, deadLetterCount: deadLetters.length,
    actualInputTokens: cumulativeInputTokens, actualOutputTokens: cumulativeOutputTokens, actualTotalTokens: cumulativeTotalTokens, actualCostUsd, approvedCostCeilingUsd: 1,
    withinCallCeiling: cumulativeProviderCalls <= limits.maximumCalls, withinTokenCeiling: cumulativeTotalTokens <= limits.maximumTotalTokens, withinCostCeiling: actualCostUsd <= 1,
    networkReceipts, transactions, deadLetters,
    credentialsRecorded: false, authenticationHeadersRecorded: false, rawRequestBodiesRecorded: false, unrestrictedProviderResponsesRecorded: false,
  };
  await writeJsonAtomic(resolve(evidenceRoot, 'GATE_6B_1_LIVE_TRANSACTION_RECEIPT.json'), transactionReceipt);
  const executionReceipt = {
    schemaVersion: 'aiw-gate-6b-1-live-execution-result-v1', startedAt, completedAt, productionAccepted: false,
    status: 'completed-candidate-only', provider: 'openai', exactModel: PINNED_MODEL,
    benchmarkFingerprint: manifest.fingerprint, matchedSubsetFingerprint: EXPECTED_MATCHED_FINGERPRINT,
    requestPlanFingerprint: EXPECTED_PLAN_FINGERPRINT, runtimePlanFingerprintObservation: planFingerprint,
    plan: { individualRequests: 24, sameSourceRequests: 6, architectureGroupRequests: 6, plannedCalls: 36, absoluteCallCeiling: 40, totalTokenCeiling: 120_000 },
    result, actual: { historicalRejectedProviderCalls: priorProviderCalls, currentRunNetworkCalls: networkCalls, cumulativeProviderCalls, providerTransactions: transactions.length, retries: result.totalRetries, inputTokens: cumulativeInputTokens, outputTokens: cumulativeOutputTokens, totalTokens: cumulativeTotalTokens, costUsd: actualCostUsd },
    schemaValidRequests: requestReceipts.filter((item) => item.schemaValid === true).length,
    exactEvidenceLineageRequests: requestReceipts.filter((item) => item.evidenceLineageValid === true).length,
    candidateRecordsCreated: candidateRecords.length, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0,
    secretFindings: 0, repositoryCodeExecuted: 0, externalRetrievalCalls: 0, toolsEnabled: false,
    capacityBefore, freeBytesAfter: freeAfter, transferSafetyReceiptFingerprint: sha256(JSON.stringify(transferReceipt)),
    requestReceipts,
    backupStatus: 'deferred-by-product-owner', gate6cStatus: 'blocked', gate6dStatus: 'not-started',
  };
  await writeJsonAtomic(resolve(evidenceRoot, 'GATE_6B_1_LIVE_EXECUTION_RESULT.json'), executionReceipt);
  process.stdout.write(`${JSON.stringify({
    status: executionReceipt.status, exactModel: PINNED_MODEL, plannedCalls: 36, historicalRejectedProviderCalls: priorProviderCalls,
    currentRunNetworkCalls: networkCalls, cumulativeProviderCalls, providerTransactions: transactions.length,
    retries: result.totalRetries, actualInputTokens: cumulativeInputTokens, actualOutputTokens: cumulativeOutputTokens, actualTotalTokens: cumulativeTotalTokens, actualCostUsd,
    candidateRecordsCreated: candidateRecords.length, schemaValidRequests: executionReceipt.schemaValidRequests,
    exactEvidenceLineageRequests: executionReceipt.exactEvidenceLineageRequests, approvedRecordsChanged: 0,
    designGraphMutations: 0, automaticPromotions: 0, productionAccepted: false,
  }, null, 2)}\n`);
}

main().catch((error) => {
  const safe = error instanceof Gate6b1Stop ? { code: error.code, message: error.message } : { code: 'UNEXPECTED_ERROR', message: error instanceof Error ? error.message : String(error) };
  process.stderr.write(`${JSON.stringify(safe)}\n`);
  process.exitCode = 1;
});
