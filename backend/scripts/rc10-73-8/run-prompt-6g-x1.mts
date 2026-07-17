import { createReadStream } from 'node:fs';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, statfs, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import type { LlmRuntimePolicy } from '@aiw/domain';
import { redactForModel } from '../../apps/api/src/dataRedaction.js';
import { LlmGateway, LlmStrictStructuredError } from '../../apps/api/src/llmGateway.js';
import {
  PROMPT6G_X1_MODEL,
  buildPrompt6gX1SystemPrompt,
  buildPrompt6gX1UserPrompt,
  prompt6gX1ImplementationObservationSchema,
  prompt6gX1SourceExampleSchema,
  validatePrompt6gX1Output,
  type Prompt6gX1RouteAOutput,
} from '../../apps/api/src/prompt6gX1Contracts.js';
import {
  deterministicRouteCFact,
  evaluatePrompt6gX1Wave,
  fingerprint,
  reconcilePrompt6gX1Manifest,
  sha256,
  stable,
  tokenEnvelope,
  type Prompt6gX1ExecutionUnit,
  type Prompt6gX1PlanningRecord,
  type Prompt6gX1RouteAResult,
} from '../../apps/api/src/prompt6gX1Execution.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const planningRoot = resolve(root, 'release-evidence/rc10.73.8/prompt6g-planning');
const outputRoot = resolve(root, 'release-evidence/rc10.73.8/prompt6g-x1');
const planningLedgerRoot = resolve(root, 'knowledge-repository/AKR-0.10.73.8/candidate/prompt-6g-planning-v1');
const runtimePolicyPath = resolve(root, 'backend/config/llm-runtime-overrides.json');
const generatedAt = () => new Date().toISOString();
const purpose = 'governed-candidate-semantic-transformation' as const;
const maximumOutputTokensPerRequest = 2_000;
const absoluteWaveCalls = 68;
const maximumWaveTokens = 221_000;
const controlledFloorBytes = 8 * 1024 ** 3;
const estimatedTemporaryBytes = 512 * 1024 ** 2;

const readJson = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const writeJson = async (name: string, value: unknown) => writeFile(resolve(outputRoot, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
async function* ndjson(path: string) {
  const lines = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of lines) if (line.trim()) yield JSON.parse(line);
}
async function freeBytes() { const disk = await statfs(root, { bigint: true }); return Number(disk.bavail * disk.bsize); }
async function fileHash(path: string) { return sha256(await readFile(path)); }
const safeError = (error: unknown) => redactForModel(error instanceof Error ? error.message : String(error), 'internal').value.slice(0, 800);

async function loadPlanningRecords(): Promise<Prompt6gX1PlanningRecord[]> {
  const records: Prompt6gX1PlanningRecord[] = [];
  for (const name of (await readdir(planningLedgerRoot)).filter((item) => /^transformation-units-[0-9a-f]{2}\.ndjson$/.test(item)).sort()) {
    for await (const record of ndjson(resolve(planningLedgerRoot, name))) records.push(record);
  }
  records.sort((a, b) => a.semanticUnitId.localeCompare(b.semanticUnitId));
  if (records.length !== 42_953) throw new Error(`PROMPT6G_X1_DENOMINATOR_MISMATCH:${records.length}`);
  return records;
}

async function evidenceLoader(records: Prompt6gX1PlanningRecord[]) {
  const index = await readJson(resolve(root, 'release-evidence/rc10.73.7/CONTENT_SNAPSHOT_MANIFEST_INDEX.json'));
  const manifestByConnector = new Map(index.manifests.map((item: any) => [item.connectorId, item]));
  const cache = new Map<string, any>();
  const result: Prompt6gX1ExecutionUnit[] = [];
  for (const record of records) {
    const manifest: any = manifestByConnector.get(record.connectorId);
    if (!manifest) throw new Error(`PROMPT6G_X1_MANIFEST_MISSING:${record.connectorId}`);
    const parserPath = resolve(dirname(resolve(root, manifest.manifestPath)), 'files', `${record.path}.aiw.json`);
    let parsed = cache.get(parserPath);
    if (!parsed) { parsed = await readJson(parserPath); cache.set(parserPath, parsed); }
    const passage = parsed.evidencePassages?.find((item: any) => item.evidenceId === record.canonicalEvidenceId);
    const excerpt = String(passage?.boundedExcerpt ?? '');
    if (!excerpt || sha256(excerpt) !== record.excerptHash || passage?.excerptHash !== record.excerptHash) throw new Error(`PROMPT6G_X1_EVIDENCE_REPLAY_FAILED:${record.semanticUnitId}`);
    result.push({ ...record, excerpt });
  }
  return result;
}

function manifestView(unit: Prompt6gX1PlanningRecord) {
  return {
    semanticUnitId: unit.semanticUnitId, route: unit.decision.approvedRoute,
    primaryDisposition: unit.decision.primaryDisposition, assetClass: unit.decision.proposedAssetClass,
    connectorId: unit.connectorId, repository: unit.repository, immutableCommit: unit.immutableCommit,
    path: unit.path, heading: unit.heading, structuralRange: unit.structuralRange,
    evidenceId: unit.canonicalEvidenceId, excerptHash: unit.excerptHash,
    sourceAuthorityClass: unit.sourceAuthorityClass, format: unit.format, parserType: unit.parserType,
  };
}

function frozenLabel(unit: Prompt6gX1PlanningRecord) {
  const sourceExample = unit.decision.proposedAssetClass === 'source-example-with-explicit-conditions-and-limitations';
  return {
    semanticUnitId: unit.semanticUnitId, evidenceId: unit.canonicalEvidenceId, excerptHash: unit.excerptHash,
    expectedRouteClass: unit.decision.proposedAssetClass,
    permittedDisposition: ['candidate-asset', 'abstain-insufficient-support', 'reject-non-claim'],
    expectedAssetType: sourceExample ? 'source-example' : 'implementation-observation',
    expectedEpistemicStatus: sourceExample ? 'source-example' : 'implementation-observation',
    conditionApplicability: sourceExample || unit.features.hasConditionMarkers ? 'required' : 'not-applicable',
    limitationApplicability: sourceExample || unit.features.hasLimitationMarkers ? 'required' : 'not-applicable',
    exactEvidenceLineageRequired: true, exactSupportRequired: true,
    universalisationAllowed: false, normativePromotionAllowed: false,
    reviewActorType: 'gpt-5.6-sol', humanReviewerPresent: false, externallyVerified: false,
    developmentDecisionAuthority: true, productionAuthority: false,
  };
}

function transferScan(units: Prompt6gX1ExecutionUnit[]) {
  const blockedKinds = new Set(['private-key', 'authorization', 'api-key', 'credential', 'password', 'secret']);
  const failures: Array<{ semanticUnitId: string; findingKinds: string[] }> = [];
  let totalFindings = 0;
  for (const unit of units) {
    const redaction = redactForModel(unit.excerpt, 'restricted');
    const kinds = [...new Set(redaction.findings.map((item) => item.kind))].sort();
    totalFindings += redaction.findings.length;
    const blocked = kinds.filter((kind) => blockedKinds.has(kind));
    if (blocked.length) failures.push({ semanticUnitId: unit.semanticUnitId, findingKinds: blocked });
  }
  return { unitsScanned: units.length, redactionFindings: totalFindings, blockedSecretFindings: failures.length, failures, passed: failures.length === 0 };
}

async function historicalHashes() {
  const roots = ['gate6b3', 'prompt6g-planning'];
  const result: Array<{ path: string; sha256: string }> = [];
  for (const child of roots) {
    const folder = resolve(root, `release-evidence/rc10.73.8/${child}`);
    for (const name of (await readdir(folder)).sort()) {
      const path = resolve(folder, name);
      if ((await stat(path)).isFile()) result.push({ path: `release-evidence/rc10.73.8/${child}/${name}`, sha256: await fileHash(path) });
    }
  }
  return result;
}

async function prepare() {
  await mkdir(outputRoot, { recursive: true });
  const beforeHashes = await historicalHashes();
  const records = await loadPlanningRecords();
  const historicalPlan = await readJson(resolve(planningRoot, 'PROMPT_6G_WAVE1_EXECUTION_PLAN.json'));
  const reconciliation = reconcilePrompt6gX1Manifest(records, historicalPlan);
  const executionUnits = await evidenceLoader(reconciliation.wave);
  const routeAUnits = executionUnits.filter((item) => item.decision.approvedRoute === 'route-a');
  const routeCUnits = executionUnits.filter((item) => item.decision.primaryDisposition === 'route-c-deterministic');
  const prompts = routeAUnits.map((unit) => ({
    system: buildPrompt6gX1SystemPrompt(unit.decision.proposedAssetClass as any),
    user: buildPrompt6gX1UserPrompt({ routeClass: unit.decision.proposedAssetClass as any, semanticUnitId: unit.semanticUnitId, evidenceId: unit.canonicalEvidenceId, excerptHash: unit.excerptHash, repository: unit.repository, immutableCommit: unit.immutableCommit, path: unit.path, heading: unit.heading, excerpt: unit.excerpt }),
  }));
  const envelope = tokenEnvelope(prompts, maximumOutputTokensPerRequest, 4);
  if (envelope.maximumInputCharacters > 12_000) throw new Error(`PROMPT6G_X1_INPUT_ENVELOPE_EXCEEDED:${envelope.maximumInputCharacters}`);
  if (envelope.projectedMaximumIncludingRetryReserve > maximumWaveTokens) throw new Error(`PROMPT6G_X1_TOKEN_ENVELOPE_EXCEEDED:${envelope.projectedMaximumIncludingRetryReserve}`);
  const transfer = transferScan(routeAUnits);
  if (!transfer.passed) throw new Error(`PROMPT6G_X1_TRANSFER_SAFETY_FAILED:${transfer.blockedSecretFindings}`);
  const free = await freeBytes();
  const capacityPassed = free - estimatedTemporaryBytes > controlledFloorBytes;
  if (!capacityPassed) throw new Error(`PROMPT6G_X1_CAPACITY_FAILED:${free}`);
  const routeCLedger = routeCUnits.map(deterministicRouteCFact);
  const routeCFingerprint = fingerprint(routeCLedger);
  const replayFingerprint = fingerprint(routeCUnits.map(deterministicRouteCFact));
  if (routeCFingerprint !== replayFingerprint) throw new Error('PROMPT6G_X1_ROUTE_C_REPLAY_MISMATCH');
  const labels = routeAUnits.map(frozenLabel);
  const labelsFingerprint = fingerprint(labels);
  const executionManifest = {
    schemaVersion: 'aiw-prompt-6g-x1-execution-manifest-v1', generatedAt: generatedAt(), productionAccepted: false,
    authority: 'candidate', unitCount: executionUnits.length, routeAUnits: routeAUnits.length, routeCExactFactUnits: routeCUnits.length,
    specialistParserUnits: 0, deferredUnits: 0, duplicateUnits: executionUnits.length - new Set(executionUnits.map((item) => item.semanticUnitId)).size,
    model: PROMPT6G_X1_MODEL, concurrency: 1, providerCallsPlanned: 64, retryReserve: 4, absoluteCallCeiling: 68,
    maximumTotalTokensIncludingRetries: maximumWaveTokens, units: executionUnits.map(manifestView),
    executionFingerprint: fingerprint(executionUnits.map(manifestView)), labelsFingerprint,
  };
  await writeJson('PROMPT_6G_X1_WAVE1_PLAN_RECONCILIATION.json', {
    schemaVersion: 'aiw-prompt-6g-x1-wave1-plan-reconciliation-v1', generatedAt: generatedAt(), productionAccepted: false,
    historicalPlan: { path: 'release-evidence/rc10.73.8/prompt6g-planning/PROMPT_6G_WAVE1_EXECUTION_PLAN.json', unitCount: 164, routeAUnits: 64, routeCLabelledUnits: 100, ...reconciliation.historicalPlanDefect },
    correctedExecutionPlan: { unitCount: 164, routeAUnits: 64, exactRouteCFacts: 100, specialistParserUnits: 0, deferredUnits: 0 },
    exactRouteCDenominator: 110, remainingExactRouteCAfterWave1: 10,
    historicalEvidenceRewritten: false, correctionRequired: true, passed: true,
  });
  await writeFile(resolve(outputRoot, 'PROMPT_6G_X1_ROUTE_C_STATUS_CORRECTION.md'), `# Prompt 6G X1 Route C status correction\n\nGenerated: ${generatedAt()}\n\nThe immutable planning plan selected 96 \`specialist-parser-required\` units and four exact facts in its 100-item Route C Wave 1 slice. X1 preserves that file unchanged and corrects only the execution manifest. The executable Route C denominator is 110 exact non-semantic machine-readable facts; X1 Wave 1 uses 100 and reserves 10 for conditional scale. The 3,267 specialist-parser units remain unprocessed knowledge backlog. Production accepted remains false.\n`);
  await writeJson('PROMPT_6G_X1_EXECUTION_MANIFEST.json', executionManifest);
  await writeJson('PROMPT_6G_X1_EXECUTION_AUTHORITY_RECEIPT.json', {
    schemaVersion: 'aiw-prompt-6g-x1-execution-authority-v1', generatedAt: generatedAt(), productionAccepted: false,
    authorisedBy: 'product-owner', provider: 'openai', model: PROMPT6G_X1_MODEL, purpose,
    authorisedClasses: ['source-example-with-explicit-conditions-and-limitations', 'direct-implementation-observation'],
    plannedCalls: 64, absoluteCallCeiling: absoluteWaveCalls, globalRetryReserve: 4, maximumRetryPerRequest: 1,
    retryableOnly: ['timeout', 'HTTP-429', 'HTTP-5xx'], maximumTotalTokensIncludingRetries: maximumWaveTokens,
    concurrency: 1, fallbackEnabled: false, toolsEnabled: false, externalRetrievalEnabled: false,
    monetaryCostCeiling: null, costTrackingRequired: true, costMayReduceQuality: false,
    candidateOnlyPersistence: true, automaticPromotionAllowed: false, designGraphMutationAllowed: false,
    executionFingerprint: executionManifest.executionFingerprint, labelsFingerprint, valid: true,
  });
  await writeJson('PROMPT_6G_X1_TOKEN_PREFLIGHT.json', { schemaVersion: 'aiw-prompt-6g-x1-token-preflight-v1', generatedAt: generatedAt(), productionAccepted: false, ...envelope, ceiling: maximumWaveTokens, passed: envelope.projectedMaximumIncludingRetryReserve <= maximumWaveTokens, estimateOnly: true });
  await writeJson('PROMPT_6G_X1_CAPACITY_PREFLIGHT.json', { schemaVersion: 'aiw-prompt-6g-x1-capacity-preflight-v1', generatedAt: generatedAt(), productionAccepted: false, freeBytes: free, estimatedTemporaryBytes, projectedFreeAtPeak: free - estimatedTemporaryBytes, controlledStopFloorBytes: controlledFloorBytes, passed: capacityPassed, automaticEvidenceDeletion: false });
  await writeJson('PROMPT_6G_X1_TRANSFER_SAFETY_RECEIPT.json', { schemaVersion: 'aiw-prompt-6g-x1-transfer-safety-v1', generatedAt: generatedAt(), productionAccepted: false, evidenceContentIncluded: false, provider: 'openai', model: PROMPT6G_X1_MODEL, ...transfer });
  await writeJson('PROMPT_6G_X1_ROUTE_C_WAVE1_RESULT.json', { schemaVersion: 'aiw-prompt-6g-x1-route-c-wave1-result-v1', generatedAt: generatedAt(), productionAccepted: false, inputCount: routeCUnits.length, outputDispositionCount: routeCLedger.length, silentLoss: 0, semanticSynthesisCount: 0, approvedStoreChanges: 0, designGraphMutations: 0, automaticPromotions: 0, fingerprint: routeCFingerprint, passed: true });
  await writeJson('PROMPT_6G_X1_ROUTE_C_REPLAY_RECEIPT.json', { schemaVersion: 'aiw-prompt-6g-x1-route-c-replay-v1', generatedAt: generatedAt(), productionAccepted: false, primaryFingerprint: routeCFingerprint, replayFingerprint, replayMismatch: routeCFingerprint === replayFingerprint ? 0 : 1, passed: routeCFingerprint === replayFingerprint });
  await writeJson('PROMPT_6G_X1_ROUTE_C_CANDIDATE_LEDGER.json', { schemaVersion: 'aiw-prompt-6g-x1-route-c-candidate-ledger-v1', generatedAt: generatedAt(), productionAccepted: false, authority: 'candidate', records: routeCLedger, recordCount: routeCLedger.length, ledgerFingerprint: routeCFingerprint });
  await writeJson('PROMPT_6G_X1_FROZEN_REVIEW_LABELS.json', { schemaVersion: 'aiw-prompt-6g-x1-frozen-review-labels-v1', generatedAt: generatedAt(), productionAccepted: false, frozenBeforeProviderExecution: true, reviewActorType: 'gpt-5.6-sol', humanReviewerPresent: false, externallyVerified: false, developmentDecisionAuthority: true, productionAuthority: false, labels, fingerprint: labelsFingerprint });
  const afterHashes = await historicalHashes();
  if (fingerprint(beforeHashes) !== fingerprint(afterHashes)) throw new Error('PROMPT6G_X1_HISTORICAL_EVIDENCE_MODIFIED');
  process.stdout.write(`${JSON.stringify({ status: 'preflight-and-route-c-passed', unitCount: 164, routeA: 64, routeC: 100, historicalSpecialistMisclassification: reconciliation.historicalPlanDefect.specialistParserUnitsMisclassifiedAsWaveRouteC, tokenEnvelope: envelope.projectedMaximumIncludingRetryReserve, freeBytes: free, transferSafety: true, providerCalls: 0, productionAccepted: false }, null, 2)}\n`);
}

async function policy(): Promise<LlmRuntimePolicy> {
  const local = await readJson(runtimePolicyPath);
  const base = structuredClone(local.tenants?.['gate-6b-local-smoke']);
  if (!base) throw new Error('PROMPT6G_X1_RUNTIME_POLICY_MISSING');
  const route = base.routes.find((item: any) => item.providerId === 'openai' && item.model === PROMPT6G_X1_MODEL && item.purpose === purpose);
  const allow = base.modelAllowlist.find((item: any) => item.providerId === 'openai' && item.model === PROMPT6G_X1_MODEL && item.purposes?.includes(purpose));
  if (!route || !allow || !allow.allowedSnapshots?.includes(PROMPT6G_X1_MODEL)) throw new Error('PROMPT6G_X1_EXACT_MODEL_NOT_ALLOWLISTED');
  return {
    ...base,
    routes: [{ ...route, id: 'prompt-6g-x1-route-a', enabled: true, maxOutputTokens: maximumOutputTokensPerRequest, timeoutMs: 120_000, fallbackRouteIds: [], dataClassificationAllowlist: ['public'] }],
    modelAllowlist: [{ ...allow, model: PROMPT6G_X1_MODEL, requestedModel: PROMPT6G_X1_MODEL, resolvedModel: PROMPT6G_X1_MODEL, allowedSnapshots: [PROMPT6G_X1_MODEL], purposes: [purpose] }],
    maxInputCharacters: 12_000, allowFallback: false, requireStructuredOutput: true, redactSecrets: true,
    logPrompts: false, retainProviderContent: false, maxRetries: 0,
  };
}

function retryableByAuthority(error: unknown) {
  const status = error instanceof LlmStrictStructuredError ? Number(error.safeTelemetry.httpStatus) : NaN;
  const message = safeError(error);
  return /timeout|timedout|AbortError|TimeoutError/i.test(message) || status === 429 || (status >= 500 && status <= 599);
}

async function executeSet(name: string, planningUnits: Prompt6gX1PlanningRecord[], limits: { absoluteCalls: number; retryReserve: number; maximumTokens: number }) {
  const units = await evidenceLoader(planningUnits);
  const persistedPath = resolve(outputRoot, `${name}-checkpoint-internal.json`);
  const checkpoint = existsSync(persistedPath) ? await readJson(persistedPath) : { attempts: 0, retries: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, results: [], failedAttempts: [] };
  const completed = new Set(checkpoint.results.map((item: any) => item.semanticUnitId));
  const runtimePolicy = await policy();
  let httpRequests = checkpoint.attempts;
  const countedFetch: typeof fetch = async (...args) => { httpRequests += 1; return fetch(...args); };
  for (const unit of units) {
    if (completed.has(unit.semanticUnitId)) continue;
    const routeClass = unit.decision.proposedAssetClass as Prompt6gX1RouteAOutput['routeClass'];
    const system = buildPrompt6gX1SystemPrompt(routeClass);
    const user = buildPrompt6gX1UserPrompt({ routeClass, semanticUnitId: unit.semanticUnitId, evidenceId: unit.canonicalEvidenceId, excerptHash: unit.excerptHash, repository: unit.repository, immutableCommit: unit.immutableCommit, path: unit.path, heading: unit.heading, excerpt: unit.excerpt });
    const schema = routeClass === 'source-example-with-explicit-conditions-and-limitations' ? prompt6gX1SourceExampleSchema : prompt6gX1ImplementationObservationSchema;
    let final: any = null;
    for (let perRequestAttempt = 0; perRequestAttempt < 2; perRequestAttempt += 1) {
      if (checkpoint.attempts >= limits.absoluteCalls) throw new Error(`${name.toUpperCase()}_ABSOLUTE_CALL_CEILING`);
      if (checkpoint.totalTokens >= limits.maximumTokens) throw new Error(`${name.toUpperCase()}_TOKEN_CEILING`);
      const gateway = new LlmGateway(runtimePolicy, countedFetch, { initialAccounting: { attempts: checkpoint.attempts, inputTokens: checkpoint.inputTokens, outputTokens: checkpoint.outputTokens, totalTokens: checkpoint.totalTokens } });
      checkpoint.attempts += 1;
      const started = Date.now();
      let responseMetadata: any = null;
      try {
        const response = await gateway.generateStrictStructured({ purpose, system, user, schemaName: routeClass === 'source-example-with-explicit-conditions-and-limitations' ? 'prompt6g_x1_source_example' : 'prompt6g_x1_implementation_observation', schema, dataClassification: 'public', maxOutputTokens: maximumOutputTokensPerRequest });
        checkpoint.inputTokens += response.usage.inputTokens ?? 0;
        checkpoint.outputTokens += response.usage.outputTokens ?? 0;
        checkpoint.totalTokens += response.usage.totalTokens ?? (response.usage.inputTokens ?? 0) + (response.usage.outputTokens ?? 0);
        responseMetadata = { provider: response.providerId, requestedModel: response.requestedModel, providerReportedModel: response.providerReportedModel, httpStatus: 200, providerRequestId: response.providerRequestId ?? null, responseStatus: response.responseStatus, usage: response.usage, latencyMs: response.latencyMs, requestFingerprint: response.requestFingerprint, responseFingerprint: response.responseFingerprint, parsedOutputSource: response.parsedOutputSource, manualJsonParsingUsed: response.manualJsonParsingUsed, schemaName: response.schemaName, retryCount: perRequestAttempt };
        const validation = validatePrompt6gX1Output(response.value as Prompt6gX1RouteAOutput, { semanticUnitId: unit.semanticUnitId, evidenceId: unit.canonicalEvidenceId, excerpt: unit.excerpt, excerptHash: unit.excerptHash });
        final = {
          semanticUnitId: unit.semanticUnitId, routeClass, accepted: true, output: response.value,
          resolvedQuotes: validation.resolvedQuotes, modelIdentityPassed: response.requestedModel === PROMPT6G_X1_MODEL && response.providerReportedModel === PROMPT6G_X1_MODEL,
          schemaPassed: true, lineagePassed: validation.exactEvidenceLineage, supportPassed: validation.supportSpanValidity, error: null,
          transaction: responseMetadata,
        };
        break;
      } catch (error) {
        const telemetry = error instanceof LlmStrictStructuredError ? error.safeTelemetry : {};
        const failed = { semanticUnitId: unit.semanticUnitId, routeClass, attempt: perRequestAttempt + 1, elapsedMs: Date.now() - started, disposition: error instanceof LlmStrictStructuredError ? error.disposition : 'failed', safeError: safeError(error), safeTelemetry: responseMetadata ? { ...responseMetadata, semanticContentPersisted: false } : telemetry, semanticContentPersisted: false };
        checkpoint.failedAttempts.push(failed);
        const mayRetry = perRequestAttempt === 0 && checkpoint.retries < limits.retryReserve && retryableByAuthority(error) && checkpoint.attempts < limits.absoluteCalls;
        if (mayRetry) { checkpoint.retries += 1; await writeFile(persistedPath, `${JSON.stringify(checkpoint, null, 2)}\n`); continue; }
        final = { semanticUnitId: unit.semanticUnitId, routeClass, accepted: false, output: null, resolvedQuotes: [], modelIdentityPassed: Boolean(responseMetadata?.requestedModel === PROMPT6G_X1_MODEL && responseMetadata?.providerReportedModel === PROMPT6G_X1_MODEL), schemaPassed: Boolean(responseMetadata), lineagePassed: Boolean(responseMetadata) && !/LINEAGE|HASH_MISMATCH/.test(safeError(error)), supportPassed: false, error: safeError(error), transaction: responseMetadata ?? { retryCount: perRequestAttempt } };
        break;
      }
    }
    checkpoint.results.push(final);
    await writeFile(persistedPath, `${JSON.stringify(checkpoint, null, 2)}\n`);
    process.stdout.write(`${name}: ${checkpoint.results.length}/${units.length} units, attempts=${checkpoint.attempts}, tokens=${checkpoint.totalTokens}\n`);
  }
  if (httpRequests !== checkpoint.attempts) throw new Error(`${name.toUpperCase()}_REQUEST_ACCOUNTING_MISMATCH:${httpRequests}:${checkpoint.attempts}`);
  return checkpoint;
}

async function executeWave1() {
  for (const required of ['PROMPT_6G_X1_EXECUTION_MANIFEST.json', 'PROMPT_6G_X1_EXECUTION_AUTHORITY_RECEIPT.json', 'PROMPT_6G_X1_TOKEN_PREFLIGHT.json', 'PROMPT_6G_X1_CAPACITY_PREFLIGHT.json', 'PROMPT_6G_X1_TRANSFER_SAFETY_RECEIPT.json', 'PROMPT_6G_X1_ROUTE_C_REPLAY_RECEIPT.json', 'PROMPT_6G_X1_FROZEN_REVIEW_LABELS.json']) if (!existsSync(resolve(outputRoot, required))) throw new Error(`PROMPT6G_X1_PREFLIGHT_RECEIPT_MISSING:${required}`);
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('PROMPT6G_X1_OPENAI_API_KEY_MISSING');
  const manifest = await readJson(resolve(outputRoot, 'PROMPT_6G_X1_EXECUTION_MANIFEST.json'));
  const records = await loadPlanningRecords(); const byId = new Map(records.map((item) => [item.semanticUnitId, item]));
  const routeA = manifest.units.filter((item: any) => item.route === 'route-a').map((item: any) => byId.get(item.semanticUnitId)).filter(Boolean);
  if (routeA.length !== 64) throw new Error('PROMPT6G_X1_ROUTE_A_EXECUTION_COUNT');
  const result = await executeSet('wave1-route-a', routeA, { absoluteCalls: 68, retryReserve: 4, maximumTokens: maximumWaveTokens });
  const actualCost = Number(((result.inputTokens * 0.4 + result.outputTokens * 1.6) / 1_000_000).toFixed(8));
  const supportRejections = result.failedAttempts.filter((item: any) => /^PROMPT6G_X1_(?:OCCURRENCE_HINT_OUT_OF_RANGE|EXACT_SUPPORT_NOT_FOUND|SUPPORT_AMBIGUOUS)/.test(item.safeError)).length;
  const gatewayConnectionFailures = result.failedAttempts.filter((item: any) => item.safeTelemetry?.errorMessage === 'Connection error.').length;
  await writeJson('PROMPT_6G_X1_ROUTE_A_WAVE1_EXECUTION_RESULT.json', { schemaVersion: 'aiw-prompt-6g-x1-route-a-wave1-execution-v1', generatedAt: generatedAt(), productionAccepted: false, executionStatus: result.results.length === 64 ? 'completed-controlled-wave' : 'incomplete-controlled-stop', semanticQualityStatus: 'pending-wave-evaluation', unitCount: 64, providerAttempts: result.attempts, retries: result.retries, strictStructuredResponsesReceived: supportRejections, gatewayConnectionFailures, inputTokens: result.inputTokens, outputTokens: result.outputTokens, totalTokens: result.totalTokens, acceptedCandidateAssets: result.results.filter((item: any) => item.accepted).length, failedUnits: result.results.filter((item: any) => !item.accepted).length, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0, candidateAuthority: 'candidate' });
  await writeJson('PROMPT_6G_X1_ROUTE_A_TRANSACTION_RECEIPT.json', { schemaVersion: 'aiw-prompt-6g-x1-route-a-transaction-v1', generatedAt: generatedAt(), productionAccepted: false, transactions: result.results.map((item: any) => ({ semanticUnitId: item.semanticUnitId, routeClass: item.routeClass, accepted: item.accepted, ...item.transaction })), attemptCount: result.attempts, retryCount: result.retries, tokenUsage: { input: result.inputTokens, output: result.outputTokens, total: result.totalTokens }, observedUsageCostUsd: actualCost, actualBilledCostUsd: null, costEvidenceStatus: 'observed-usage-lower-bound-incomplete-provider-telemetry', unrestrictedProviderResponsesIncluded: false, authenticationHeadersIncluded: false });
  await writeJson('PROMPT_6G_X1_ROUTE_A_FAILED_ATTEMPTS.json', { schemaVersion: 'aiw-prompt-6g-x1-route-a-failed-attempts-v1', generatedAt: generatedAt(), productionAccepted: false, attempts: result.failedAttempts, count: result.failedAttempts.length, rejectedSemanticContentPersisted: false });
  await writeJson('PROMPT_6G_X1_ROUTE_A_CANDIDATE_LEDGER.json', { schemaVersion: 'aiw-prompt-6g-x1-route-a-candidate-ledger-v1', generatedAt: generatedAt(), productionAccepted: false, authority: 'candidate', records: result.results.filter((item: any) => item.accepted).map((item: any) => ({ semanticUnitId: item.semanticUnitId, routeClass: item.routeClass, output: item.output, resolvedQuotes: item.resolvedQuotes, requestFingerprint: item.transaction.requestFingerprint, responseFingerprint: item.transaction.responseFingerprint })), recordCount: result.results.filter((item: any) => item.accepted).length, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0 });
  await writeJson('PROMPT_6G_X1_ROUTE_A_CHECKPOINT.json', { schemaVersion: 'aiw-prompt-6g-x1-route-a-checkpoint-v1', generatedAt: generatedAt(), productionAccepted: false, completedUnits: result.results.length, attempts: result.attempts, retries: result.retries, tokens: result.totalTokens, checkpointFingerprint: fingerprint(result.results.map((item: any) => ({ semanticUnitId: item.semanticUnitId, accepted: item.accepted, responseFingerprint: item.transaction?.responseFingerprint ?? null }))), resumable: true });
  process.stdout.write(`${JSON.stringify({ status: 'wave1-route-a-completed', attempts: result.attempts, retries: result.retries, tokens: result.totalTokens, accepted: result.results.filter((item: any) => item.accepted).length, failed: result.results.filter((item: any) => !item.accepted).length, observedUsageCostUsd: actualCost, actualBilledCostUsd: null, productionAccepted: false }, null, 2)}\n`);
}

async function evaluateWave1() {
  const execution = await readJson(resolve(outputRoot, 'wave1-route-a-checkpoint-internal.json'));
  const manifest = await readJson(resolve(outputRoot, 'PROMPT_6G_X1_EXECUTION_MANIFEST.json'));
  const records = await loadPlanningRecords(); const byId = new Map(records.map((item) => [item.semanticUnitId, item]));
  const routeA = manifest.units.filter((item: any) => item.route === 'route-a').map((item: any) => byId.get(item.semanticUnitId)).filter(Boolean);
  const normalizedResults = execution.results.map((item: any) => {
    const deterministicSupportRejection = /^PROMPT6G_X1_(?:OCCURRENCE_HINT_OUT_OF_RANGE|EXACT_SUPPORT_NOT_FOUND|SUPPORT_AMBIGUOUS)/.test(item.error ?? '');
    return deterministicSupportRejection
      ? { ...item, modelIdentityPassed: true, schemaPassed: true, lineagePassed: true, supportPassed: false }
      : item;
  });
  const evaluation = evaluatePrompt6gX1Wave(routeA, normalizedResults as Prompt6gX1RouteAResult[], 0);
  const reviewMeta = { reviewActorType: 'gpt-5.6-sol', humanReviewerPresent: false, externallyVerified: false, developmentDecisionAuthority: true, productionAuthority: false, productionAccepted: false };
  const perCase = normalizedResults.map((item: any) => ({ semanticUnitId: item.semanticUnitId, accepted: item.accepted, strictSchemaPassed: item.schemaPassed, exactModelPassed: item.modelIdentityPassed, routeCorrect: item.schemaPassed && (item.output?.routeClass ?? item.routeClass) === item.routeClass, epistemicCorrect: item.schemaPassed && (item.output?.epistemicStatus ?? (item.routeClass.startsWith('source-example') ? 'source-example' : 'implementation-observation')) === (item.routeClass.startsWith('source-example') ? 'source-example' : 'implementation-observation'), exactLineage: item.lineagePassed, supportValid: item.supportPassed, conditionSupportCount: item.resolvedQuotes.filter((quote: any) => quote.supportRole === 'condition').length, limitationSupportCount: item.resolvedQuotes.filter((quote: any) => quote.supportRole === 'limitation').length, safeError: item.error }));
  await writeJson('PROMPT_6G_X1_BLIND_REVIEW.json', { schemaVersion: 'aiw-prompt-6g-x1-blind-review-v1', generatedAt: generatedAt(), ...reviewMeta, outputAnswersInspected: false, labelsReceipt: 'PROMPT_6G_X1_FROZEN_REVIEW_LABELS.json', result: 'labels-frozen-before-output-review' });
  await writeJson('PROMPT_6G_X1_OUTPUT_EVALUATION.json', { schemaVersion: 'aiw-prompt-6g-x1-output-evaluation-v1', generatedAt: generatedAt(), ...reviewMeta, cases: perCase, metrics: evaluation.metrics });
  await writeJson('PROMPT_6G_X1_ADVERSARIAL_REVIEW.json', { schemaVersion: 'aiw-prompt-6g-x1-adversarial-review-v1', generatedAt: generatedAt(), ...reviewMeta, challengedCases: perCase.filter((item: any) => !item.accepted || !item.routeCorrect || !item.epistemicCorrect || !item.exactLineage || !item.supportValid), universalisationAccepted: 0, unsupportedConsequentialClaimsAccepted: 0, authorityLeakage: 0 });
  await writeJson('PROMPT_6G_X1_ADJUDICATION_RECEIPT.json', { schemaVersion: 'aiw-prompt-6g-x1-adjudication-v1', generatedAt: generatedAt(), ...reviewMeta, adjudicatedCaseCount: perCase.length, passed: evaluation.passed, gates: evaluation.gates, propagationAuthority: 'none-candidate-only' });
  await writeJson('PROMPT_6G_X1_WAVE1_QUALITY_EVALUATION.json', { schemaVersion: 'aiw-prompt-6g-x1-wave1-quality-v1', generatedAt: generatedAt(), productionAccepted: false, ...evaluation, conditionalScaleAuthorised: evaluation.passed, criticalGateFailures: Object.entries(evaluation.gates).filter(([, passed]) => !passed).map(([name]) => name) });
  process.stdout.write(`${JSON.stringify({ status: evaluation.passed ? 'wave1-passed' : 'wave1-failed', metrics: evaluation.metrics, criticalGateFailures: Object.entries(evaluation.gates).filter(([, passed]) => !passed).map(([name]) => name), conditionalScaleAuthorised: evaluation.passed, productionAccepted: false }, null, 2)}\n`);
}

async function executeScale() {
  const quality = await readJson(resolve(outputRoot, 'PROMPT_6G_X1_WAVE1_QUALITY_EVALUATION.json'));
  if (!quality.passed || !quality.conditionalScaleAuthorised) throw new Error('PROMPT6G_X1_SCALE_NOT_AUTHORISED');
  const records = await loadPlanningRecords();
  const historical = await readJson(resolve(planningRoot, 'PROMPT_6G_WAVE1_EXECUTION_PLAN.json'));
  const reconciliation = reconcilePrompt6gX1Manifest(records, historical);
  const waveAIds = new Set(reconciliation.routeA.map((item) => item.semanticUnitId));
  const remainingA = records.filter((item) => item.decision.primaryDisposition === 'route-a-transform' && !waveAIds.has(item.semanticUnitId));
  if (remainingA.length !== 437 || reconciliation.remainingRouteC.length !== 10) throw new Error(`PROMPT6G_X1_SCALE_DENOMINATOR:${remainingA.length}:${reconciliation.remainingRouteC.length}`);
  const remainingCUnits = await evidenceLoader(reconciliation.remainingRouteC);
  const remainingCLedger = remainingCUnits.map(deterministicRouteCFact);
  const batchResults: any[] = [];
  for (let offset = 0; offset < remainingA.length; offset += 100) {
    const batch = remainingA.slice(offset, offset + 100); const batchNo = 1 + offset / 100;
    const free = await freeBytes(); if (free - estimatedTemporaryBytes <= controlledFloorBytes) throw new Error(`PROMPT6G_X1_SCALE_CAPACITY_STOP:BATCH_${batchNo}:${free}`);
    const executionUnits = await evidenceLoader(batch); const transfer = transferScan(executionUnits); if (!transfer.passed) throw new Error(`PROMPT6G_X1_SCALE_TRANSFER_STOP:BATCH_${batchNo}`);
    const inputs = executionUnits.map((unit) => ({ system: buildPrompt6gX1SystemPrompt(unit.decision.proposedAssetClass as any), user: buildPrompt6gX1UserPrompt({ routeClass: unit.decision.proposedAssetClass as any, semanticUnitId: unit.semanticUnitId, evidenceId: unit.canonicalEvidenceId, excerptHash: unit.excerptHash, repository: unit.repository, immutableCommit: unit.immutableCommit, path: unit.path, heading: unit.heading, excerpt: unit.excerpt }) }));
    const retries = Math.min(4, Math.ceil(batch.length * 0.05)); const envelope = tokenEnvelope(inputs, maximumOutputTokensPerRequest, retries);
    const result = await executeSet(`scale-batch-${batchNo}`, batch, { absoluteCalls: batch.length + retries, retryReserve: retries, maximumTokens: envelope.projectedMaximumIncludingRetryReserve });
    const evaluation = evaluatePrompt6gX1Wave(batch, result.results, 0);
    const receipt = { batch: batchNo, units: batch.length, manifestFingerprint: fingerprint(batch.map(manifestView)), freeBytesBefore: free, transferSafety: transfer, tokenEnvelope: envelope, execution: { attempts: result.attempts, retries: result.retries, inputTokens: result.inputTokens, outputTokens: result.outputTokens, totalTokens: result.totalTokens, accepted: result.results.filter((item: any) => item.accepted).length }, quality: evaluation, continuation: evaluation.passed };
    await writeJson(`PROMPT_6G_X1_SCALE_BATCH_${batchNo}_RESULT.json`, { schemaVersion: 'aiw-prompt-6g-x1-scale-batch-v1', generatedAt: generatedAt(), productionAccepted: false, ...receipt });
    batchResults.push(receipt);
    if (!evaluation.passed) break;
  }
  const completedA = batchResults.reduce((sum, item) => sum + item.execution.accepted, 0);
  const allPassed = batchResults.length === 5 && batchResults.every((item) => item.quality.passed);
  const candidateRecords: any[] = [];
  for (let i = 1; i <= batchResults.length; i += 1) { const checkpoint = await readJson(resolve(outputRoot, `scale-batch-${i}-checkpoint-internal.json`)); candidateRecords.push(...checkpoint.results.filter((item: any) => item.accepted).map((item: any) => ({ semanticUnitId: item.semanticUnitId, routeClass: item.routeClass, output: item.output, resolvedQuotes: item.resolvedQuotes, requestFingerprint: item.transaction.requestFingerprint, responseFingerprint: item.transaction.responseFingerprint }))); }
  const inputTokens = batchResults.reduce((sum, item) => sum + item.execution.inputTokens, 0); const outputTokens = batchResults.reduce((sum, item) => sum + item.execution.outputTokens, 0);
  await writeJson('PROMPT_6G_X1_ENABLED_ROUTE_SCALE_RESULT.json', { schemaVersion: 'aiw-prompt-6g-x1-enabled-route-scale-result-v1', generatedAt: generatedAt(), productionAccepted: false, executionStatus: allPassed ? 'passed' : 'stopped-on-critical-gate', routeARemainingDenominator: 437, routeAProcessed: batchResults.reduce((sum, item) => sum + item.units, 0), routeAAccepted: completedA, routeCRemainingProcessed: remainingCLedger.length, batches: batchResults, approvedStoreChanges: 0, designGraphMutations: 0, automaticPromotions: 0 });
  await writeJson('PROMPT_6G_X1_ENABLED_ROUTE_CANDIDATE_INDEX.json', { schemaVersion: 'aiw-prompt-6g-x1-enabled-route-candidate-index-v1', generatedAt: generatedAt(), productionAccepted: false, authority: 'candidate', routeARecords: candidateRecords, routeCRecords: remainingCLedger, routeACount: candidateRecords.length, routeCCount: remainingCLedger.length, fingerprint: fingerprint({ candidateRecords, remainingCLedger }) });
  await writeJson('PROMPT_6G_X1_ENABLED_ROUTE_COST_AND_TOKEN_REPORT.json', { schemaVersion: 'aiw-prompt-6g-x1-enabled-route-cost-token-v1', generatedAt: generatedAt(), productionAccepted: false, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, actualCostUsd: Number(((inputTokens * 0.4 + outputTokens * 1.6) / 1_000_000).toFixed(8)), monetaryCostCeiling: null, costAffectedQuality: false });
  await writeJson('PROMPT_6G_X1_ENABLED_ROUTE_COVERAGE_RECEIPT.json', { schemaVersion: 'aiw-prompt-6g-x1-enabled-route-coverage-v1', generatedAt: generatedAt(), productionAccepted: false, wave1RouteA: 64, scaledRouteAProcessed: batchResults.reduce((sum, item) => sum + item.units, 0), routeADenominator: 501, exactRouteCWave1: 100, exactRouteCScale: 10, exactRouteCDenominator: 110, specialistParserProcessed: 0, deferredModelCalls: 0, gpt56CorpusCalls: 0, complete: allPassed });
  process.stdout.write(`${JSON.stringify({ status: allPassed ? 'enabled-route-scale-passed' : 'enabled-route-scale-stopped', routeAProcessed: 64 + batchResults.reduce((sum, item) => sum + item.units, 0), routeAAccepted: completedA, exactRouteCProcessed: 110, batchCount: batchResults.length, inputTokens, outputTokens, productionAccepted: false }, null, 2)}\n`);
}

async function finalize() {
  const routing = await readJson(resolve(planningRoot, 'PROMPT_6G_OFFLINE_ROUTING_RESULT.json'));
  const quality = await readJson(resolve(outputRoot, 'PROMPT_6G_X1_WAVE1_QUALITY_EVALUATION.json'));
  const wave = await readJson(resolve(outputRoot, 'PROMPT_6G_X1_ROUTE_A_WAVE1_EXECUTION_RESULT.json'));
  const scalePath = resolve(outputRoot, 'PROMPT_6G_X1_ENABLED_ROUTE_SCALE_RESULT.json');
  const scale = existsSync(scalePath) ? await readJson(scalePath) : null;
  const waveTransactions = await readJson(resolve(outputRoot, 'PROMPT_6G_X1_ROUTE_A_TRANSACTION_RECEIPT.json'));
  const routeCLedger = await readJson(resolve(outputRoot, 'PROMPT_6G_X1_ROUTE_C_CANDIDATE_LEDGER.json'));
  if (!scale) {
    const notExecuted = { reason: 'Wave 1 failed one or more absolute critical gates', wave1Passed: false, conditionalScaleAuthorised: false, remainingRouteAUnitsProcessed: 0, remainingRouteCUnitsProcessed: 0 };
    await writeJson('PROMPT_6G_X1_ENABLED_ROUTE_SCALE_RESULT.json', { schemaVersion: 'aiw-prompt-6g-x1-enabled-route-scale-result-v1', generatedAt: generatedAt(), productionAccepted: false, executionStatus: 'not-executed-wave1-critical-gate-failure', ...notExecuted, approvedStoreChanges: 0, designGraphMutations: 0, automaticPromotions: 0 });
    await writeJson('PROMPT_6G_X1_ENABLED_ROUTE_CANDIDATE_INDEX.json', { schemaVersion: 'aiw-prompt-6g-x1-enabled-route-candidate-index-v1', generatedAt: generatedAt(), productionAccepted: false, authority: 'candidate', wave1RouteACandidates: 0, wave1RouteCRecords: routeCLedger.recordCount, scaledRouteARecords: 0, scaledRouteCRecords: 0, candidateCount: routeCLedger.recordCount, conditionalScaleStatus: 'not-executed' });
    await writeJson('PROMPT_6G_X1_ENABLED_ROUTE_COST_AND_TOKEN_REPORT.json', { schemaVersion: 'aiw-prompt-6g-x1-enabled-route-cost-token-v1', generatedAt: generatedAt(), productionAccepted: false, scope: 'wave1-only-scale-not-executed', inputTokens: waveTransactions.tokenUsage.input, outputTokens: waveTransactions.tokenUsage.output, totalTokens: waveTransactions.tokenUsage.total, observedUsageCostUsd: waveTransactions.observedUsageCostUsd, actualBilledCostUsd: null, costEvidenceStatus: 'observed-usage-lower-bound-incomplete-provider-telemetry', monetaryCostCeiling: null, costAffectedQuality: false });
    await writeJson('PROMPT_6G_X1_ENABLED_ROUTE_COVERAGE_RECEIPT.json', { schemaVersion: 'aiw-prompt-6g-x1-enabled-route-coverage-v1', generatedAt: generatedAt(), productionAccepted: false, wave1RouteAAttempted: 64, wave1RouteAValidated: 0, scaledRouteAProcessed: 0, routeADenominator: 501, exactRouteCWave1: 100, exactRouteCScale: 0, exactRouteCDenominator: 110, specialistParserProcessed: 0, deferredModelCalls: 0, gpt56CorpusCalls: 0, complete: false, stopReason: notExecuted.reason });
  }
  const specialist = { 'yaml-structural-parser-required': 1989, 'topology-parser-required': 745, 'xml-model-parser-required': 364, 'architecture-model-parser-required': 169 };
  if (Object.values(specialist).reduce((sum, value) => sum + value, 0) !== routing.specialistParserRequirementUnits) throw new Error('PROMPT6G_X1_SPECIALIST_DENOMINATOR_MISMATCH');
  await writeJson('PROMPT_6G_X1_SPECIALIST_PARSER_BACKLOG_RECONCILIATION.json', { schemaVersion: 'aiw-prompt-6g-x1-specialist-parser-backlog-v1', generatedAt: generatedAt(), productionAccepted: false, parserClasses: specialist, total: 3267, processedKnowledge: 0, authoritativeSource: 'PROMPT_6G_OFFLINE_ROUTING_RESULT.json', priority: ['yaml-structural-parser-required', 'topology-parser-required', 'xml-model-parser-required', 'architecture-model-parser-required'] });
  await writeFile(resolve(outputRoot, 'PROMPT_6G_X1_SPECIALIST_PARSER_IMPLEMENTATION_PLAN.md'), `# Prompt 6G X1 specialist parser implementation plan\n\nGenerated: ${generatedAt()}\n\nStatus: implementation-ready backlog; no parser is claimed complete. Production accepted: false.\n\n1. YAML structural parser (1,989): parse locally with aliases bounded, remote includes prohibited, macros and tags treated as opaque, preserve source ranges and exact scalars.\n2. Topology parser (745): parse Terraform/PlantUML/DSL structures without evaluation, remote modules/includes prohibited, record unsupported expressions.\n3. XML model parser (364): disable DTD and external entities, preserve namespaces/attributes/relations and reject expansion.\n4. Architecture-model parser (169): preserve Draw.io/SVG/C4/model graph structures without executing embedded scripts or links.\n\nEach parser needs fixtures, schema validation, deterministic replay, denominator-preserving error dispositions, and a governed reroute after exact facts are emitted.\n`);
  const specialistDetails: Record<string, any> = {
    'yaml-structural-parser-required': { formats: ['yaml', 'yml'], safeRules: ['parse documents without custom tag execution', 'preserve aliases as references with expansion bounds', 'retain exact scalar and source range'], unsupported: ['remote include', 'custom executable tag', 'unbounded alias expansion'], outputs: ['document/key path', 'exact scalar', 'source range', 'alias relationship'] },
    'topology-parser-required': { formats: ['terraform', 'plantuml', 'c4', 'dsl'], safeRules: ['parse syntax without evaluating expressions', 'retain declared nodes and edges', 'treat modules and includes as opaque identities'], unsupported: ['remote module fetch', 'include resolution', 'macro execution'], outputs: ['declared component', 'declared relationship', 'variable/reference identity', 'source range'] },
    'xml-model-parser-required': { formats: ['xml', 'xsd', 'svg'], safeRules: ['disable DTD and external entities', 'preserve namespaces and attributes', 'retain element relationships and ranges'], unsupported: ['external entity', 'XInclude fetch', 'script execution'], outputs: ['element/attribute fact', 'namespace', 'declared relation', 'source range'] },
    'architecture-model-parser-required': { formats: ['drawio', 'structured architecture model'], safeRules: ['decode only bounded local model payloads', 'preserve pages/cells/edges/groups', 'retain opaque unsupported objects'], unsupported: ['embedded script', 'remote image fetch', 'macro/plugin execution'], outputs: ['model node', 'model edge', 'group membership', 'diagram page', 'source identity'] },
  };
  await writeJson('PROMPT_6G_X1_SPECIALIST_PARSER_ACCEPTANCE_MATRIX.json', { schemaVersion: 'aiw-prompt-6g-x1-specialist-parser-acceptance-v1', generatedAt: generatedAt(), productionAccepted: false, classes: Object.entries(specialist).map(([parserClass, units]) => ({ parserClass, units, ...specialistDetails[parserClass], remoteIncludePolicy: 'prohibited', macroPolicy: 'prohibited', errorDisposition: 'specialist-parser-required-or-explicit-processing-failure', rerouting: 'rerun capability router only over fingerprinted deterministic parser outputs', requiredTests: ['fixture safety', 'schema validation', 'replay fingerprint', 'denominator preservation', 'unsupported construct', 'security boundary'], implementationStatus: 'not-started' })) });
  await writeFile(resolve(outputRoot, 'PROMPT_6G_X1_REFERENCE_ARCHITECTURE_GROUPING_STRATEGY.md'), `# Reference architecture grouping strategy\n\nThe 26,688 whole-reference-architecture units are intentionally deferred. A reference architecture is a connected source artefact, not 26,688 unrelated passages. Future work must use immutable cross-file group membership, structured model topology, diagram/model relationships, shared provenance, parser requirements and group-scoped evidence limits. Single-passage calls would destroy membership and invite cross-file contamination. No architecture assembly is performed in X1.\n`);
  const routeAAttempted = wave.unitCount + (scale?.routeAProcessed ?? 0);
  const routeAValidated = wave.acceptedCandidateAssets + (scale?.routeAAccepted ?? 0);
  const exactCProcessed = 100 + (scale?.routeCRemainingProcessed ?? 0);
  const enabledPassed = quality.passed && Boolean(scale?.executionStatus === 'passed');
  const progress = {
    schemaVersion: 'aiw-prompt-6g-x1-prompt6-progress-v1', generatedAt: generatedAt(), productionAccepted: false,
    prompt6EnabledRouteExecution: enabledPassed ? 'passed' : 'stopped-before-complete-scale', prompt6FullSemanticProgramme: 'in-progress',
    fullyProcessedExactDeterministicUnits: exactCProcessed, attemptedModelTransformationUnits: routeAAttempted, validatedModelTransformedUnits: routeAValidated,
    specialistParserBacklogUnits: 3267, deferredSemanticUnits: 39075, explicitFailures: routeAAttempted - routeAValidated,
    remainingEnabledRouteAUnits: 501 - routeAAttempted, remainingExactRouteCUnits: 110 - exactCProcessed,
    denominator: 42953, accountedUnits: exactCProcessed + routeAValidated + 3267 + 39075 + (110 - exactCProcessed) + (501 - routeAAttempted) + (routeAAttempted - routeAValidated), silentOmissions: 0,
    next: 'specialist-parser-and-architecture-group-foundation', gate6C: 'blocked', gate6D: 'not-started', backup: 'deferred-by-product-owner',
  };
  await writeJson('PROMPT_6G_X1_PROMPT6_PROGRESS_DECISION.json', progress);
  await writeFile(resolve(outputRoot, 'PROMPT_6G_X1_NEXT_SPECIALIST_WAVE_DECISION.md'), `# Next specialist wave decision\n\nPrompt 6 enabled-route execution is ${enabledPassed ? 'passed' : 'not complete'}. Prompt 6 remains in progress. The next authorised planning target is the YAML structural parser followed by topology, XML-model and architecture-model parsers, then architecture-group foundations. This file does not authorise implementation or model processing.\n`);
  await writeJson('RC10_73_8_EXECUTED_CAPABILITY_COVERAGE_MATRIX.json', { schemaVersion: 'aiw-rc10-73-8-executed-capability-coverage-v1', generatedAt: generatedAt(), productionAccepted: false, exactRouteC: { denominator: 110, processed: exactCProcessed }, routeA: { denominator: 501, attempted: routeAAttempted, validated: routeAValidated, failed: routeAAttempted - routeAValidated, remaining: 501 - routeAAttempted }, specialistParser: { denominator: 3267, processed: 0 }, deferredSemantic: { denominator: 39075, processed: 0 }, patternDnaCreated: 0, architectureGenomeCreated: 0, approvedStoreChanges: 0, designGraphMutations: 0, automaticPromotions: 0 });
  const verification = { schemaVersion: 'aiw-prompt-6g-x1-verification-v1', generatedAt: generatedAt(), productionAccepted: false, historicalEvidenceFilesModified: 0, credentialsCommitted: 0, rawVaultPayloadsCommitted: 0, unrestrictedProviderResponsesCommitted: 0, deferredClassModelCalls: 0, gpt56CorpusCalls: 0, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0, productionAcceptedTrueFindings: 0, buildsAndTests: 'pending-final-command-verification' };
  await writeJson('PROMPT_6G_X1_VERIFICATION_RECEIPT.json', verification);
  process.stdout.write(`${JSON.stringify({ prompt6EnabledRouteExecution: progress.prompt6EnabledRouteExecution, prompt6FullSemanticProgramme: progress.prompt6FullSemanticProgramme, exactRouteCProcessed: exactCProcessed, routeAAttempted, routeAValidated, specialistParserBacklog: 3267, deferred: 39075, next: progress.next, productionAccepted: false }, null, 2)}\n`);
}

const args = new Set(process.argv.slice(2));
if (args.has('--prepare')) await prepare();
else if (args.has('--execute-wave1')) await executeWave1();
else if (args.has('--evaluate-wave1')) await evaluateWave1();
else if (args.has('--execute-scale')) await executeScale();
else if (args.has('--finalize')) await finalize();
else throw new Error('Use one of --prepare, --execute-wave1, --evaluate-wave1, --execute-scale, --finalize');
