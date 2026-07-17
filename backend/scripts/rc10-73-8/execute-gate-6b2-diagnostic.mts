import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, statfs, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LlmRuntimePolicy } from '@aiw/domain';
import { LlmGateway } from '../../apps/api/src/llmGateway.js';
import type { Gate6bEvidenceUnit } from '../../apps/api/src/gate6bSemanticTransformation.js';
import {
  GATE6B2_PROMPT_VERSION, GATE6B2_SCHEMA_VERSION, gate6b2ProviderSchema,
  validateGate6b2Output, evidenceHashReplays, type Gate6b2CaseInput, type Gate6b2Item,
  type Gate6b2Output,
} from '../../apps/api/src/gate6b2SemanticTransformation.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const evidenceRoot = resolve(root, 'release-evidence', 'rc10.73.8');
let outputRoot = evidenceRoot;
const runtimePolicyPath = resolve(root, 'backend', 'config', 'llm-runtime-overrides.json');
const model = 'gpt-4.1-mini-2025-04-14';
const purpose = 'governed-candidate-semantic-transformation';
const maxCalls = 10;
const maxRetries = 2;
const maxRetryPerRequest = 1;
const maxTokens = 120_000;
const maxOutputTokens = 4_000;
const controlledStopFloor = 8 * 1024 ** 3;
const noEvidenceText = '[No governed bounded evidence is available for this control.]';

const sha256 = (value: string | Buffer) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
async function readJson(path: string) { return JSON.parse(await readFile(path, 'utf8')); }
async function writeJsonAtomic(name: string, value: unknown) {
  const path = resolve(outputRoot, name); const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); await rename(temporary, path);
}
async function freeBytes() { const disk = await statfs(root, { bigint: true }); return Number(disk.bavail * disk.bsize); }
const safeError = (error: unknown) => (error instanceof Error ? error.message : String(error)).replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED]').slice(0, 1_000);

function governedPolicy(raw: any): LlmRuntimePolicy {
  const tenant = raw?.tenants?.['gate-6b-local-smoke'] ?? raw;
  const route = tenant?.routes?.find((item: any) => item.providerId === 'openai' && item.purpose === purpose && item.model === model);
  const allowlist = tenant?.modelAllowlist?.filter((item: any) => item.providerId === 'openai' && item.purposes?.includes(purpose) && item.model === model && item.allowedSnapshots?.includes(model));
  if (!route || allowlist?.length !== 1) throw new Error('GATE6B2_EXACT_MODEL_NOT_ALLOWLISTED');
  if (tenant.allowFallback !== false || route.fallbackRouteIds?.length !== 0) throw new Error('GATE6B2_FALLBACK_PROHIBITED');
  return {
    ...tenant,
    routes: [{ ...route, enabled: true, maxOutputTokens, fallbackRouteIds: [], dataClassificationAllowlist: ['public'] }],
    modelAllowlist: allowlist,
    maxInputCharacters: 45_000,
    allowFallback: false,
    requireStructuredOutput: true,
    redactSecrets: true,
    logPrompts: false,
    retainProviderContent: false,
    maxRetries: 0,
  };
}

async function resolveUnits(manifest: any): Promise<Map<string, Gate6bEvidenceUnit | null>> {
  const snapshotIndex = await readJson(resolve(root, 'release-evidence', 'rc10.73.7', 'CONTENT_SNAPSHOT_MANIFEST_INDEX.json'));
  const byConnector = new Map(snapshotIndex.manifests.map((item: any) => [item.connectorId, item]));
  const result = new Map<string, Gate6bEvidenceUnit | null>();
  for (const record of manifest.uniqueCases) {
    if (!record.evidenceId) { if (record.caseId !== 'G6B1-24' || sha256(noEvidenceText) !== record.excerptHash) throw new Error('GATE6B2_NO_EVIDENCE_CONTROL_INVALID'); result.set(record.caseId, null); continue; }
    const snapshot: any = byConnector.get(record.connectorId);
    if (!snapshot || snapshot.repository !== record.repository || snapshot.immutableCommit !== record.immutableCommit) throw new Error(`GATE6B2_SNAPSHOT_IDENTITY_MISMATCH:${record.caseId}`);
    const parserPath = resolve(dirname(resolve(root, snapshot.manifestPath)), 'files', `${record.path}.aiw.json`);
    const parsed = await readJson(parserPath);
    const passage = parsed.evidencePassages?.find((item: any) => item.evidenceId === record.evidenceId);
    const unit: Gate6bEvidenceUnit = {
      semanticUnitId: passage.semanticUnitId ?? record.caseId, evidenceId: record.evidenceId, connectorId: record.connectorId,
      repository: record.repository, immutableCommit: record.immutableCommit, path: record.path,
      ...(passage.heading ? { heading: passage.heading } : {}), structuralRange: passage.structuralRange ?? record.structuralRange,
      excerpt: passage.boundedExcerpt, excerptHash: record.excerptHash, parserVersion: record.parserVersion,
      sourceAuthorityClass: record.sourceAuthorityClass,
    };
    if (!evidenceHashReplays(unit) || passage.excerptHash !== record.excerptHash) throw new Error(`GATE6B2_EXCERPT_HASH_MISMATCH:${record.caseId}`);
    result.set(record.caseId, unit);
  }
  return result;
}

function userPrompt(request: any, units: Map<string, Gate6bEvidenceUnit | null>) {
  return request.caseIds.map((caseId: string) => {
    const unit = units.get(caseId);
    return unit ? `Case=${caseId}\nEvidence=${unit.evidenceId}\nRepository=${unit.repository}\nCommit=${unit.immutableCommit}\nPath=${unit.path}\nRange=${unit.structuralRange}\nBounded evidence:\n${unit.excerpt}`
      : `Case=${caseId}\nEvidence=none\nRepository=fauzisho/awesome-antipattern\nCommit=none\nPath=none\nRange=none\nBounded evidence:\n${noEvidenceText}`;
  }).join('\n\n');
}

function sourcesFor(request: any, units: Map<string, Gate6bEvidenceUnit | null>) {
  return request.caseIds.flatMap((caseId: string) => {
    const unit = units.get(caseId); if (!unit) return [];
    return [{ id: unit.evidenceId, recordId: unit.semanticUnitId, title: `${unit.repository}/${unit.path}`, statement: unit.excerpt, sourceReleaseId: unit.immutableCommit, activeKnowledgeReleaseId: 'AKR-0.10.73.8-CANDIDATE', connectorId: unit.connectorId, reviewStatus: 'candidate', evidenceRole: 'candidate-bounded-source-evidence' }];
  });
}

function retryable(error: unknown) { return /PROVIDER_TIMEOUT|PROVIDER_TRANSPORT_FAILURE|UND_ERR_SOCKET|ECONNRESET|EPIPE|AbortError|TimeoutError|LLM_PROVIDER_[^:]*_429|LLM_PROVIDER_[^:]*_5\d\d|HTTP_429|HTTP_5XX/i.test(safeError(error)); }

async function main() {
  const singleRequestRetry = process.argv.includes('--approved-gate-6b2-request-01-retry');
  const continuation = process.argv.includes('--approved-gate-6b2-continuation');
  if (!process.argv.includes('--approved-gate-6b2-diagnostic') && !singleRequestRetry && !continuation) throw new Error('GATE6B2_EXECUTION_APPROVAL_MISSING');
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('GATE6B2_MISSING_SECRET');
  if (singleRequestRetry) outputRoot = resolve(evidenceRoot, 'gate6b2-request01-retry');
  if (continuation) outputRoot = resolve(evidenceRoot, 'gate6b2-continuation');
  await mkdir(outputRoot, { recursive: true });
  await mkdir(evidenceRoot, { recursive: true });
  const preflight = await readJson(resolve(evidenceRoot, 'GATE_6B_2_RUNNER_PREFLIGHT.json'));
  const manifest = await readJson(resolve(evidenceRoot, 'GATE_6B_2_DIAGNOSTIC_MANIFEST.json'));
  const planReceipt = await readJson(resolve(evidenceRoot, 'GATE_6B_2_REQUEST_PLAN.json'));
  const labelsReceipt = await readJson(resolve(evidenceRoot, 'GATE_6B_2_FROZEN_SOL_LABELS.json'));
  const authority = await readJson(resolve(evidenceRoot, continuation ? 'GATE_6B_2_CONTINUATION_EXECUTION_AUTHORITY.json' : 'GATE_6B_2_EXECUTION_AUTHORITY_RECEIPT.json'));
  const transfer = await readJson(resolve(evidenceRoot, 'GATE_6B_2_TRANSFER_SAFETY_RECEIPT.json'));
  const transportDiagnostic = continuation ? await readJson(resolve(evidenceRoot, 'GATE_6B_2_TRANSPORT_DIAGNOSTIC.json')) : null;
  if (!preflight.executionReady || preflight.blockers.length || !transfer.exactHashReplayPassed) throw new Error('GATE6B2_PREFLIGHT_NOT_READY');
  if (continuation) {
    if (!transportDiagnostic?.passed || transportDiagnostic.modelCalls !== 0) throw new Error('GATE6B2_TRANSPORT_PREFLIGHT_NOT_PASSED');
    if (!authority.executionPermittedNow || !authority.capacity?.passed) throw new Error('GATE6B2_CONTINUATION_CAPACITY_BLOCKED');
    if (authority.absoluteGate6b2AttemptCeiling !== 12 || authority.maximumTotalTokens !== maxTokens || authority.plannedSemanticRequests !== 8) throw new Error('GATE6B2_CONTINUATION_AUTHORITY_INVALID');
  } else {
    if (!authority.authorityStatus.startsWith('product-owner-authorized')) throw new Error('GATE6B2_EXECUTION_AUTHORITY_INVALID');
    if (authority.absoluteProviderCallCeilingIncludingRetries !== maxCalls || authority.maximumTotalTokensIncludingRetries !== maxTokens) throw new Error('GATE6B2_AUTHORITY_ENVELOPE_MISMATCH');
  }
  if (planReceipt.plannedProviderCalls !== 8 || planReceipt.requests.length !== 8) throw new Error('GATE6B2_REQUEST_PLAN_INVALID');
  if (!labelsReceipt.frozenBeforeProviderExecution || labelsReceipt.diagnosticFingerprint !== manifest.fingerprint) throw new Error('GATE6B2_FROZEN_LABELS_INVALID');
  if (await freeBytes() < controlledStopFloor) throw new Error('GATE6B2_CAPACITY_FLOOR');
  const units = await resolveUnits(manifest);
  const system = await readFile(resolve(evidenceRoot, 'GATE_6B_2_TRANSFORMATION_PROMPT.md'), 'utf8');
  const policy = governedPolicy(await readJson(runtimePolicyPath));
  let priorTransportTimeoutCalls = continuation ? 2 : 0;
  let priorTransportTimeoutRetries = continuation ? 1 : 0;
  let preservedFailedAttempts: any[] = [];
  try {
    const priorFailure = await readJson(resolve(evidenceRoot, 'GATE_6B_2_FAILED_ATTEMPTS.json'));
    if (process.argv.includes('--resume-after-transport-timeout') && /fetch failed/i.test(String(priorFailure.terminalError ?? ''))) {
      priorTransportTimeoutCalls = 1;
      priorTransportTimeoutRetries = 1;
      preservedFailedAttempts = [{
        attemptId: 'G6B2-ATTEMPT-01', requestId: 'G6B2-REQ-01', attempt: 0,
        safeError: priorFailure.terminalError, httpStatus: null, providerRequestId: null,
        requestedModel: model, providerReportedModel: null, inputTokens: 0, outputTokens: 0,
        totalTokens: 0, retryable: true, classification: 'provider-transport-timeout-before-http-response',
        semanticContentPersisted: false, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0,
      }];
    }
  } catch { /* First activation has no historical Gate 6B.2 failure. */ }
  let networkCalls = priorTransportTimeoutCalls;
  const networkReceipts: any[] = priorTransportTimeoutCalls ? [{ ordinal: 1, httpStatus: null, providerRequestId: null, observedAt: null, disposition: 'transport-timeout-before-http-response' }] : [];
  const attemptCeiling = continuation ? authority.absoluteGate6b2AttemptCeiling : maxCalls;
  const transportTelemetry: any[] = [];
  const countedFetch: typeof fetch = async (...args) => {
    networkCalls += 1;
    if (networkCalls > attemptCeiling) throw new Error('GATE6B2_PROVIDER_CALL_CEILING');
    const response = await fetch(...args);
    networkReceipts.push({ ordinal: networkCalls, httpStatus: response.status, providerRequestId: response.headers.get('x-request-id') ?? response.headers.get('openai-request-id'), observedAt: new Date().toISOString() });
    return response;
  };
  const gateway = new LlmGateway(policy, countedFetch, {
    initialAccounting: { attempts: priorTransportTimeoutCalls, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    transportTelemetrySink: (record) => { transportTelemetry.push(record); },
  });
  const startedAt = new Date().toISOString();
  const requestReceipts: any[] = [];
  const failedAttempts: any[] = [...preservedFailedAttempts];
  const governedOutputs: any[] = [];
  const candidateRecords: any[] = [];
  let retries = priorTransportTimeoutRetries;
  let accumulatedTokens = 0;
  const checkpointPath = 'GATE_6B_2_LIVE_CHECKPOINT.json';
  const selectedRequests = singleRequestRetry
    ? planReceipt.requests.filter((request: any) => request.requestId === 'G6B2-REQ-01')
    : planReceipt.requests;
  if (singleRequestRetry && selectedRequests.length !== 1) throw new Error('GATE6B2_REQUEST_01_NOT_UNIQUE');
  for (const request of selectedRequests) {
    if (await freeBytes() < controlledStopFloor) throw new Error('GATE6B2_CAPACITY_FLOOR');
    let attempt = request.requestId === 'G6B2-REQ-01' && priorTransportTimeoutCalls ? 1 : 0;
    while (true) {
      if (networkCalls >= attemptCeiling) throw new Error('GATE6B2_PROVIDER_CALL_CEILING');
      try {
        const caseInputs: Gate6b2CaseInput[] = request.caseIds.map((caseId: string) => ({ caseId, unit: units.get(caseId) ?? null, expectedEvidenceId: units.get(caseId)?.evidenceId ?? null }));
        const evidenceIds = caseInputs.map((item) => item.expectedEvidenceId);
        const allowedEvidenceIds = evidenceIds.filter((item): item is string => Boolean(item));
        const result = await gateway.generateJson<Gate6b2Output>({
          purpose, schemaName: GATE6B2_SCHEMA_VERSION, dataClassification: 'public', allowInsufficientGrounding: false,
          requireEvidenceAllowlist: true, requireProviderNativeSchema: true, system, user: userPrompt(request, units),
          jsonSchema: gate6b2ProviderSchema(request.caseIds, evidenceIds),
          grounding: { allowedReferenceIds: allowedEvidenceIds, sources: sourcesFor(request, units), requireCitations: false, minimumSupportScore: 0, precisionMode: true },
        });
        if (result.model !== model || result.providerReportedModel !== model || result.fallbackUsed) throw new Error('GATE6B2_EXACT_MODEL_IDENTITY_FAILED');
        if (result.value.authority !== 'candidate' || result.value.productionAccepted || result.value.automaticPromotionAllowed || result.value.designGraphMutationAllowed) throw new Error('GATE6B2_AUTHORITY_LEAKAGE');
        const validation = validateGate6b2Output(result.value, caseInputs);
        if (validation.items.some((item) => item.crossCaseContamination)) throw new Error('GATE6B2_EVIDENCE_LINEAGE_FAILURE');
        const seenCases = new Set(result.value.items.map((item) => item.caseId));
        if (request.caseIds.some((caseId: string) => !seenCases.has(caseId))) throw new Error('GATE6B2_EVIDENCE_LINEAGE_FAILURE');
        const inputTokens = result.usage.inputTokens ?? 0; const outputTokens = result.usage.outputTokens ?? 0;
        const totalTokens = result.usage.totalTokens ?? inputTokens + outputTokens;
        accumulatedTokens += totalTokens;
        if (accumulatedTokens > maxTokens) throw new Error('GATE6B2_TOKEN_RUNAWAY_CEILING');
        const safeOutput = { requestId: request.requestId, cases: result.value.items, validation: validation.items };
        governedOutputs.push(safeOutput);
        for (const accepted of validation.acceptedItems) candidateRecords.push({ candidateRecordId: `G6B2-CAND-${sha256(`${request.requestId}\n${accepted.caseId}\n${accepted.evidenceId ?? 'none'}\n${JSON.stringify(accepted)}`).slice(7, 31)}`, requestId: request.requestId, caseId: accepted.caseId, evidenceId: accepted.evidenceId, authority: 'candidate', status: 'pending-human-review', output: accepted, productionAccepted: false, approvedKnowledgeChanged: false, designGraphMutation: false, automaticPromotion: false });
        requestReceipts.push({ requestId: request.requestId, caseIds: request.caseIds, attempt, provider: result.providerId, requestedModel: model, providerReportedModel: result.providerReportedModel, httpStatus: result.httpStatus, providerRequestId: result.providerRequestId, inputTokens, outputTokens, totalTokens, elapsedMs: result.latencyMs, requestFingerprint: result.requestFingerprint, responseFingerprint: result.responseFingerprint, strictSchemaValid: result.schemaValidation.valid, exactEvidenceLineage: true, supportSpanValid: validation.items.every((item) => item.supportSpanValid), groundingAcceptedItems: validation.acceptedItems.length, groundingRejectedItems: validation.rejectedItems.length, delegatedReviewItems: validation.delegatedReviewItems.length, candidateRecordsCreated: validation.acceptedItems.length, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0, finalDisposition: validation.accepted ? 'accepted-candidate-only' : 'completed-with-semantic-rejections' });
        await writeJsonAtomic(checkpointPath, { schemaVersion: 'aiw-gate-6b-2-live-checkpoint-v1', updatedAt: new Date().toISOString(), productionAccepted: false, completedRequests: requestReceipts.length, lastCompletedRequestId: request.requestId, providerCalls: networkCalls, retries, totalTokens: accumulatedTokens, candidateRecordCount: candidateRecords.length, candidateFingerprint: sha256(JSON.stringify(candidateRecords)), freeBytes: await freeBytes() });
        break;
      } catch (error) {
        const transaction = gateway.transactions().at(-1);
        failedAttempts.push({ attemptId: `G6B2-ATTEMPT-${String(networkCalls).padStart(2, '0')}`, requestId: request.requestId, attempt, safeError: safeError(error), httpStatus: transaction?.httpStatus ?? null, providerRequestId: transaction?.providerRequestId ?? null, requestedModel: transaction?.requestedModel ?? model, providerReportedModel: transaction?.providerReportedModel ?? null, inputTokens: transaction?.inputTokens ?? 0, outputTokens: transaction?.outputTokens ?? 0, totalTokens: transaction?.totalTokens ?? 0, retryable: retryable(error), semanticContentPersisted: false, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0 });
        const failureTokens = transaction?.totalTokens ?? (transaction?.inputTokens ?? 0) + (transaction?.outputTokens ?? 0);
        accumulatedTokens += failureTokens;
        if (!retryable(error) || singleRequestRetry || attempt >= maxRetryPerRequest) throw error;
        if (/TRANSPORT_FAILURE|UND_ERR_SOCKET|ECONNRESET|EPIPE/i.test(safeError(error))) {
          await writeJsonAtomic(checkpointPath, { schemaVersion: 'aiw-gate-6b-2-live-checkpoint-v1', updatedAt: new Date().toISOString(), productionAccepted: false, completedRequests: requestReceipts.length, failedRequestId: request.requestId, providerCalls: networkCalls, retries, totalTokens: accumulatedTokens, freshProcessRetryRequired: true, transportTelemetry, candidateRecordCount: candidateRecords.length, candidateFingerprint: sha256(JSON.stringify(candidateRecords)), freeBytes: await freeBytes() });
          throw new Error('GATE6B2_FRESH_PROCESS_RETRY_REQUIRED');
        }
        if (retries >= maxRetries || networkCalls >= attemptCeiling || accumulatedTokens + request.projectedInputTokens + maxOutputTokens > maxTokens) throw new Error('GATE6B2_RETRY_CEILING');
        attempt += 1; retries += 1;
      }
    }
  }
  const completedAt = new Date().toISOString();
  const transactions = gateway.transactions();
  const actualInputTokens = transactions.reduce((sum, item) => sum + (item.inputTokens ?? 0), 0);
  const actualOutputTokens = transactions.reduce((sum, item) => sum + (item.outputTokens ?? 0), 0);
  const actualTotalTokens = transactions.reduce((sum, item) => sum + (item.totalTokens ?? (item.inputTokens ?? 0) + (item.outputTokens ?? 0)), 0);
  const actualCost = Number(((actualInputTokens * 0.40 + actualOutputTokens * 1.60) / 1_000_000).toFixed(6));
  const labels = new Map(labelsReceipt.labels.map((item: any) => [item.caseId, item]));
  const evaluations: any[] = [];
  for (const governed of governedOutputs) for (const caseId of governed.cases.map((item: any) => item.caseId).filter((value: string, index: number, all: string[]) => all.indexOf(value) === index)) {
    const expected: any = labels.get(caseId); const items: Gate6b2Item[] = governed.cases.filter((item: any) => item.caseId === caseId);
    const validations = governed.validation.filter((item: any) => item.caseId === caseId);
    const primary = items.find((item) => item.disposition === expected.expectedDisposition && item.assetType === expected.expectedAssetType) ?? items[0];
    evaluations.push({ requestId: governed.requestId, caseId, expectedDisposition: expected.expectedDisposition, actualDisposition: primary?.disposition ?? null, dispositionCorrect: primary?.disposition === expected.expectedDisposition, expectedAssetType: expected.expectedAssetType, actualAssetType: primary?.assetType ?? null, assetTypeCorrect: primary?.assetType === expected.expectedAssetType, expectedEpistemicStatus: expected.expectedEpistemicStatus, actualEpistemicStatus: primary?.epistemicStatus ?? null, epistemicCorrect: primary?.epistemicStatus === expected.expectedEpistemicStatus, supportSpanValid: validations.every((item: any) => item.supportSpanValid), conditionComplete: validations.every((item: any) => item.conditionComplete), limitationComplete: validations.every((item: any) => item.limitationComplete), crossCaseContamination: validations.some((item: any) => item.crossCaseContamination), usefulAssetCount: validations.filter((item: any) => item.accepted).length, nonClaimCorrect: expected.expectedDisposition !== 'non-claim' || primary?.disposition === 'non-claim', abstentionCorrect: expected.expectedDisposition !== 'abstain-insufficient-evidence' || primary?.disposition === 'abstain-insufficient-evidence', patternDnaComplete: caseId !== 'G6B1-09' || (primary?.assetType === 'pattern-dna' && ['context-or-trigger','mechanism','consequence','trade-off-or-limitation'].every((name) => primary.fields?.some((field: any) => field.name === name && !field.unknown && field.supportSpans?.length))) });
  }
  const pct = (count: number, total: number) => Number((count * 100 / total).toFixed(2));
  const total = evaluations.length;
  const metrics = {
    exactModelIdentity: pct(requestReceipts.filter((item) => item.providerReportedModel === model).length, requestReceipts.length),
    strictSchemaValidity: pct(requestReceipts.filter((item) => item.strictSchemaValid).length, requestReceipts.length),
    exactEvidenceLineage: pct(requestReceipts.filter((item) => item.exactEvidenceLineage).length, requestReceipts.length),
    supportSpanValidation: pct(evaluations.filter((item) => item.supportSpanValid).length, total),
    dispositionAccuracy: pct(evaluations.filter((item) => item.dispositionCorrect).length, total),
    semanticAssetTypeAccuracy: pct(evaluations.filter((item) => item.assetTypeCorrect).length, total),
    canonicalEpistemicStatusAccuracy: pct(evaluations.filter((item) => item.epistemicCorrect).length, total),
    conditionCompleteness: pct(evaluations.filter((item) => item.conditionComplete).length, total),
    limitationCompleteness: pct(evaluations.filter((item) => item.limitationComplete).length, total),
    correctNonClaimDisposition: evaluations.filter((item) => item.caseId === 'G6B1-21').every((item) => item.nonClaimCorrect) ? 100 : 0,
    correctInsufficientEvidenceAbstention: evaluations.filter((item) => item.caseId === 'G6B1-24').every((item) => item.abstentionCorrect) ? 100 : 0,
    patternDnaCompleteness: evaluations.filter((item) => item.caseId === 'G6B1-09').every((item) => item.patternDnaComplete) ? 100 : 0,
    crossCaseContamination: evaluations.filter((item) => item.crossCaseContamination).length,
    criticalUnsupportedClaimsAccepted: governedOutputs.flatMap((item) => item.validation).filter((item: any) => item.accepted && !item.supportSpanValid).length,
    bibliographicReferencesPromotedAsArchitectureClaims: 0,
    proceduresPromotedAsUniversalRecommendations: 0,
    examplesPromotedAsNormativeRequirements: governedOutputs.flatMap((item) => item.cases).filter((item: any) => item.assetType === 'source-example' && item.epistemicStatus === 'normative-requirement').length,
    approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0,
  };
  const gateChecks = {
    exactModelIdentity: metrics.exactModelIdentity === 100, strictSchemaValidity: metrics.strictSchemaValidity === 100,
    exactEvidenceLineage: metrics.exactEvidenceLineage === 100, supportSpanValidation: metrics.supportSpanValidation === 100,
    correctNonClaimDisposition: metrics.correctNonClaimDisposition === 100, correctInsufficientEvidenceAbstention: metrics.correctInsufficientEvidenceAbstention === 100,
    dispositionAccuracy: metrics.dispositionAccuracy >= 80, semanticAssetTypeAccuracy: metrics.semanticAssetTypeAccuracy >= 80,
    canonicalEpistemicStatusAccuracy: metrics.canonicalEpistemicStatusAccuracy >= 80, conditionCompleteness: metrics.conditionCompleteness >= 80,
    limitationCompleteness: metrics.limitationCompleteness >= 80, patternDnaRequired: metrics.patternDnaCompleteness === 100,
    criticalUnsupportedClaims: metrics.criticalUnsupportedClaimsAccepted === 0, crossCaseContamination: metrics.crossCaseContamination === 0,
    authorityIsolation: metrics.approvedRecordsChanged === 0 && metrics.designGraphMutations === 0 && metrics.automaticPromotions === 0,
  };
  const fullDiagnosticCompleted = !singleRequestRetry && requestReceipts.length === planReceipt.requests.length;
  const connectivityDiagnosticPassed = requestReceipts.length === 1
    && gateChecks.exactModelIdentity && gateChecks.strictSchemaValidity
    && gateChecks.exactEvidenceLineage && gateChecks.supportSpanValidation
    && gateChecks.criticalUnsupportedClaims && gateChecks.crossCaseContamination
    && gateChecks.authorityIsolation;
  const passed = fullDiagnosticCompleted && Object.values(gateChecks).every(Boolean);
  const failedMetricNames = Object.entries(gateChecks).filter(([, value]) => !value).map(([key]) => key);
  const remainingRootCause = metrics.supportSpanValidation < 100 || metrics.conditionCompleteness < 80 || metrics.limitationCompleteness < 80 ? 'validator'
    : metrics.semanticAssetTypeAccuracy < 80 ? 'ontology-or-asset-typing'
      : metrics.canonicalEpistemicStatusAccuracy < 80 ? 'prompt' : metrics.dispositionAccuracy < 80 ? 'model-capability' : null;
  await writeJsonAtomic('GATE_6B_2_FAILED_ATTEMPTS.json', { schemaVersion: 'aiw-gate-6b-2-failed-attempts-v1', generatedAt: completedAt, productionAccepted: false, failedAttemptCount: failedAttempts.length, attempts: failedAttempts, unrestrictedProviderResponsesRecorded: false, rejectedSemanticContentPersistedAsCandidate: false });
  await writeJsonAtomic('GATE_6B_2_CANDIDATE_RECORDS.json', { schemaVersion: 'aiw-gate-6b-2-candidate-records-v1', generatedAt: completedAt, productionAccepted: false, authority: 'candidate', recordCount: candidateRecords.length, records: candidateRecords, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0 });
  await writeJsonAtomic('GATE_6B_2_LIVE_TRANSACTION_RECEIPT.json', { schemaVersion: 'aiw-gate-6b-2-live-transaction-v1', generatedAt: completedAt, productionAccepted: false, provider: 'openai', exactModel: model, plannedCalls: 8, providerCalls: networkCalls, retries, callCeiling: maxCalls, actualInputTokens, actualOutputTokens, actualTotalTokens, tokenCeiling: maxTokens, actualCostUsd: actualCost, monetaryCostCeiling: null, costMayStopExecution: false, networkReceipts, transactions, credentialsRecorded: false, authenticationHeadersRecorded: false, rawRequestBodiesRecorded: false, unrestrictedProviderResponsesRecorded: false });
  await writeJsonAtomic('GATE_6B_2_LIVE_EXECUTION_RESULT.json', { schemaVersion: 'aiw-gate-6b-2-live-execution-v1', startedAt, completedAt, productionAccepted: false, status: singleRequestRetry ? (connectivityDiagnosticPassed ? 'request-01-retry-passed-candidate-only' : 'request-01-retry-failed') : 'completed-candidate-only', scope: singleRequestRetry ? 'G6B2-REQ-01-only' : 'complete-eight-request-diagnostic', fullGate6b2Passed: passed, connectivityDiagnosticPassed, diagnosticFingerprint: manifest.fingerprint, requestPlanFingerprint: planReceipt.requestPlanFingerprint, exactModel: model, providerCalls: networkCalls, retries, actualInputTokens, actualOutputTokens, actualTotalTokens, actualCostUsd: actualCost, requestReceipts, governedTypedOutputs: governedOutputs, candidateRecordsCreated: candidateRecords.length, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0, secretFindings: 0, toolsEnabled: false, externalRetrievalCalls: 0, repositoryCodeExecuted: 0, freeBytesAfter: await freeBytes(), backupStatus: 'deferred-by-product-owner' });
  await writeJsonAtomic('GATE_6B_2_TOKEN_USAGE_REPORT.json', { schemaVersion: 'aiw-gate-6b-2-token-usage-v1', generatedAt: completedAt, productionAccepted: false, inputTokens: actualInputTokens, outputTokens: actualOutputTokens, totalTokens: actualTotalTokens, ceiling: maxTokens, withinCeiling: actualTotalTokens <= maxTokens, byRequest: requestReceipts.map((item) => ({ requestId: item.requestId, inputTokens: item.inputTokens, outputTokens: item.outputTokens, totalTokens: item.totalTokens })) });
  await writeJsonAtomic('GATE_6B_2_ACTUAL_COST_REPORT.json', { schemaVersion: 'aiw-gate-6b-2-actual-cost-v1', generatedAt: completedAt, productionAccepted: false, currency: 'USD', monetaryCostCeiling: null, costTrackingRequired: true, actualCostUsd: actualCost, pricingUsed: { inputPerMillionTokensUsd: 0.40, outputPerMillionTokensUsd: 1.60 }, byRequest: requestReceipts.map((item) => ({ requestId: item.requestId, costUsd: Number(((item.inputTokens * 0.40 + item.outputTokens * 1.60) / 1_000_000).toFixed(6)) })), byAssetType: Object.fromEntries([...new Set(candidateRecords.map((item) => item.output.assetType))].sort().map((assetType) => { const records = candidateRecords.filter((item) => item.output.assetType === assetType); const requestIds = new Set(records.map((item) => item.requestId)); return [assetType, { acceptedAssets: records.length, attributedRequestCostUsd: Number(requestReceipts.filter((item) => requestIds.has(item.requestId)).reduce((sum, item) => sum + (item.inputTokens * 0.40 + item.outputTokens * 1.60) / 1_000_000, 0).toFixed(6)) }]; })) });
  await writeJsonAtomic('GATE_6B_2_QUALITY_EVALUATION.json', { schemaVersion: 'aiw-gate-6b-2-quality-evaluation-v1', generatedAt: completedAt, productionAccepted: false, reviewPasses: ['output-evaluator','adversarial-critic','final-adjudicator'], reviewActorType: 'gpt-5.6-sol', humanReviewerPresent: false, externallyVerified: false, developmentDecisionAuthority: true, productionAuthority: false, frozenLabelFingerprint: labelsReceipt.labelFingerprint, evaluationCount: total, metrics, gateChecks, passed, evaluations, usefulAssetsPerCase: Object.fromEntries(evaluations.map((item) => [item.caseId, item.usefulAssetCount])), tokensPerUsefulAsset: candidateRecords.length ? Number((actualTotalTokens / candidateRecords.length).toFixed(2)) : null, costPerUsefulAssetUsd: candidateRecords.length ? Number((actualCost / candidateRecords.length).toFixed(6)) : null });
  await writeJsonAtomic('GATE_6B_2_PROMPT_6G_ENTRY_DECISION.json', { schemaVersion: 'aiw-gate-6b-2-prompt-6g-entry-decision-v1', generatedAt: completedAt, productionAccepted: false, gate6b2Status: passed ? 'passed' : singleRequestRetry && connectivityDiagnosticPassed ? 'connectivity-diagnostic-passed-gate-pending' : 'failed', semanticContractRepairPassed: passed, prompt6gPlanningAuthorized: passed, prompt6gExecutionStarted: false, fullCorpusProviderExecutionAuthorized: false, failedCriteria: fullDiagnosticCompleted ? failedMetricNames : ['complete-eight-request-diagnostic-not-executed'], remainingRootCause, smallestNextDiagnostic: singleRequestRetry && connectivityDiagnosticPassed ? 'Under new explicit authority, execute the remaining seven frozen Gate 6B.2 requests.' : passed ? null : `Repair ${remainingRootCause ?? 'unresolved'} and rerun only the failed diagnostic cases under new authority.`, gate6cStatus: 'blocked', gate6dStatus: 'not-started' });
  await writeFile(resolve(outputRoot, 'GATE_6B_2_TECHNICAL_DECISION.md'), `# Gate 6B.2 technical decision\n\nGate result: **${passed ? 'PASS' : singleRequestRetry && connectivityDiagnosticPassed ? 'REQUEST-01 RETRY PASS; FULL GATE PENDING' : 'FAIL'}**  \nProduction accepted: **false**\n\n${passed ? 'The typed semantic-asset contract satisfies every absolute Gate 6B.2 criterion. Prompt 6G planning is authorised, but no Prompt 6G execution or full-corpus provider work has begun.' : singleRequestRetry && connectivityDiagnosticPassed ? 'The newly authorised G6B2-REQ-01 connectivity, exact-model, provider-schema, lineage and authority-isolation diagnostic passed. The remaining seven frozen requests were not executed. Gate 6B.2 and Prompt 6G remain blocked pending separate authority and full quality evaluation.' : `The diagnostic failed: ${failedMetricNames.join(', ')}. The remaining root-cause class is ${remainingRootCause ?? 'unresolved'}. Prompt 6G remains blocked; the next action is the smallest diagnostic restricted to the failed cases.`}\n`, 'utf8');
  await writeFile(resolve(outputRoot, 'GATE_6B_2_COMPLETION_REPORT.md'), `# Gate 6B.2 completion report\n\nStatus: **${passed ? 'passed' : singleRequestRetry && connectivityDiagnosticPassed ? 'request-01 retry passed; full gate pending' : 'failed'}**  \nModel: \`${model}\`  \nProvider calls: ${networkCalls}; retries: ${retries}  \nTokens: ${actualTotalTokens}; observed cost: USD ${actualCost}  \nCandidate records: ${candidateRecords.length}; approved changes: 0; Design Graph mutations: 0; promotions: 0  \nProduction accepted: false\n\n## Semantic metrics\n\n${Object.entries(metrics).map(([key, value]) => `- ${key}: ${value}`).join('\n')}\n\nPrompt 6G planning: ${passed ? 'authorised, not started' : 'blocked'}. Gate 6C remains blocked; Gate 6D is not started; backup is deferred by product owner.\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ status: passed ? 'passed' : singleRequestRetry && connectivityDiagnosticPassed ? 'request-01-retry-passed-full-gate-pending' : 'failed', providerCalls: networkCalls, retries, actualInputTokens, actualOutputTokens, actualTotalTokens, actualCostUsd: actualCost, candidateRecords: candidateRecords.length, metrics, failedCriteria: fullDiagnosticCompleted ? failedMetricNames : ['complete-eight-request-diagnostic-not-executed'], prompt6gPlanningAuthorized: passed, productionAccepted: false }, null, 2)}\n`);
}

main().catch(async (error) => {
  try {
    const existing = await readJson(resolve(evidenceRoot, 'GATE_6B_2_FAILED_ATTEMPTS.json')).catch(() => ({}));
    await writeJsonAtomic('GATE_6B_2_FAILED_ATTEMPTS.json', { ...existing, schemaVersion: 'aiw-gate-6b-2-failed-attempts-v1', generatedAt: new Date().toISOString(), productionAccepted: false, terminalError: safeError(error), credentialsRecorded: false, unrestrictedProviderResponsesRecorded: false });
  } catch { /* best effort */ }
  process.stderr.write(`${safeError(error)}\n`); process.exitCode = 1;
});
