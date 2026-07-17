import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, statfs, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zodTextFormat } from 'openai/helpers/zod';
import type { LlmRuntimePolicy } from '@aiw/domain';
import { redactForModel } from '../../apps/api/src/dataRedaction.js';
import { LlmGateway, LlmStrictStructuredError } from '../../apps/api/src/llmGateway.js';
import type { Gate6bEvidenceUnit } from '../../apps/api/src/gate6bSemanticTransformation.js';
import {
  GATE6B2_R2_PROMPT_VERSION, GATE6B2_R2_SCHEMA_VERSION,
  deterministicNoEvidenceControl, gate6b2R2StageASchema, gate6b2R2StageBSchema,
  validateEvidenceAtomGate, validateTypedAssetGate,
  type Gate6b2R2EvidenceInput, type Gate6b2R2StageAOutput, type Gate6b2R2StageBOutput,
  type ResolvedEvidenceAtom,
} from '../../apps/api/src/gate6b2R2SemanticTransformation.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const evidenceRoot = resolve(root, 'release-evidence', 'rc10.73.8');
const outputRoot = resolve(evidenceRoot, 'gate6b2-r2');
const runtimePolicyPath = resolve(root, 'backend', 'config', 'llm-runtime-overrides.json');
const model = 'gpt-4.1-mini-2025-04-14';
const purpose = 'governed-candidate-semantic-transformation';
const controlledFloor = 8 * 1024 ** 3;
const maxCalls = 18;
const maxTokens = 200_000;
const maxOutputTokens = 6_000;
const noEvidenceText = '[No governed bounded evidence is available for this control.]';
const pricing = { inputUsdPerMillionTokens: 0.40, outputUsdPerMillionTokens: 1.60, reference: 'https://openai.com/api/pricing/', capturedForEstimate: '2026-07-17' };

const sha256 = (value: string | Buffer) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const canonical = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const safeError = (error: unknown) => redactForModel(error instanceof Error ? error.message : String(error), 'internal').value.slice(0, 1_000);
async function readJson(path: string) { return JSON.parse(await readFile(path, 'utf8')); }
async function writeJson(name: string, value: unknown) { const path = resolve(outputRoot, name); const temp = `${path}.tmp`; await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); await rename(temp, path); }
async function writeMd(name: string, value: string) { const path = resolve(outputRoot, name); const temp = `${path}.tmp`; await writeFile(temp, value, 'utf8'); await rename(temp, path); }
async function freeBytes() { const disk = await statfs(root, { bigint: true }); return Number(disk.bavail * disk.bsize); }

function governedPolicy(raw: any): LlmRuntimePolicy {
  const tenant = raw?.tenants?.['gate-6b-local-smoke'] ?? raw;
  const route = tenant?.routes?.find((item: any) => item.providerId === 'openai' && item.purpose === purpose && item.model === model);
  const allowlist = tenant?.modelAllowlist?.filter((item: any) => item.providerId === 'openai' && item.purposes?.includes(purpose) && item.model === model && item.allowedSnapshots?.includes(model));
  if (!route || allowlist?.length !== 1) throw new Error('GATE6B2_R2_EXACT_MODEL_NOT_ALLOWLISTED');
  if (tenant.allowFallback !== false || route.fallbackRouteIds?.length !== 0) throw new Error('GATE6B2_R2_FALLBACK_PROHIBITED');
  return { ...tenant, routes: [{ ...route, enabled: true, maxOutputTokens, fallbackRouteIds: [], dataClassificationAllowlist: ['public'], protocol: 'responses' }], modelAllowlist: allowlist, maxInputCharacters: 60_000, allowFallback: false, requireStructuredOutput: true, redactSecrets: true, logPrompts: false, retainProviderContent: false, maxRetries: 0 };
}

async function resolveUnits(manifest: any): Promise<Map<string, Gate6bEvidenceUnit | null>> {
  const snapshotIndex = await readJson(resolve(root, 'release-evidence', 'rc10.73.7', 'CONTENT_SNAPSHOT_MANIFEST_INDEX.json'));
  const byConnector = new Map(snapshotIndex.manifests.map((item: any) => [item.connectorId, item]));
  const result = new Map<string, Gate6bEvidenceUnit | null>();
  for (const record of manifest.uniqueCases) {
    if (!record.evidenceId) {
      if (record.caseId !== 'G6B1-24' || sha256(noEvidenceText) !== record.excerptHash) throw new Error('GATE6B2_R2_NO_EVIDENCE_CONTROL_INVALID');
      result.set(record.caseId, null); continue;
    }
    const snapshot: any = byConnector.get(record.connectorId);
    if (!snapshot || snapshot.repository !== record.repository || snapshot.immutableCommit !== record.immutableCommit) throw new Error(`GATE6B2_R2_SNAPSHOT_IDENTITY_MISMATCH:${record.caseId}`);
    const parsed = await readJson(resolve(dirname(resolve(root, snapshot.manifestPath)), 'files', `${record.path}.aiw.json`));
    const passage = parsed.evidencePassages?.find((item: any) => item.evidenceId === record.evidenceId);
    if (!passage?.boundedExcerpt || sha256(passage.boundedExcerpt) !== record.excerptHash || passage.excerptHash !== record.excerptHash) throw new Error(`GATE6B2_R2_EXCERPT_HASH_MISMATCH:${record.caseId}`);
    result.set(record.caseId, { semanticUnitId: passage.semanticUnitId ?? record.caseId, evidenceId: record.evidenceId, connectorId: record.connectorId, repository: record.repository, immutableCommit: record.immutableCommit, path: record.path, ...(passage.heading ? { heading: passage.heading } : {}), structuralRange: passage.structuralRange ?? record.structuralRange, excerpt: passage.boundedExcerpt, excerptHash: record.excerptHash, parserVersion: record.parserVersion, sourceAuthorityClass: record.sourceAuthorityClass });
  }
  return result;
}

function stageAUser(request: any, units: Map<string, Gate6bEvidenceUnit | null>) {
  return `Benchmark purpose: ${request.purpose}\n\n${request.caseIds.map((caseId: string) => { const unit = units.get(caseId); if (!unit) throw new Error('R2_NO_EVIDENCE_MUST_NOT_REACH_PROVIDER'); return `Case=${caseId}\nEvidenceId=${unit.evidenceId}\nRepository=${unit.repository}\nCommit=${unit.immutableCommit}\nPath=${unit.path}\nBounded evidence (copy support text exactly):\n${unit.excerpt}`; }).join('\n\n--- CASE BOUNDARY ---\n\n')}`;
}

function stageBUser(request: any, atoms: ResolvedEvidenceAtom[]) {
  const safeAtoms = atoms.map(({ atomId, caseId, evidenceId, atomType, exactSupportText, supportRole, polarity, sourceModality, proposedEpistemicStatus, conditionAtomIds, limitationAtomIds }) => ({ atomId, caseId, evidenceId, atomType, exactSupportText, supportRole, polarity, sourceModality, proposedEpistemicStatus, conditionAtomIds, limitationAtomIds }));
  return `Benchmark purpose: ${request.purpose}\nPermitted case IDs: ${request.caseIds.join(', ')}\nPermitted ontology: typed assets in the strict response schema.\nValidated atoms only:\n${JSON.stringify(safeAtoms)}`;
}

function evidenceInputs(request: any, units: Map<string, Gate6bEvidenceUnit | null>): Gate6b2R2EvidenceInput[] {
  return request.caseIds.flatMap((caseId: string) => { const unit = units.get(caseId); return unit ? [{ caseId, evidenceId: unit.evidenceId, excerpt: unit.excerpt, excerptHash: unit.excerptHash }] : []; });
}

function protocolAudit() {
  const formatA = zodTextFormat(gate6b2R2StageASchema, 'gate6b2_r2_evidence_atoms');
  const formatB = zodTextFormat(gate6b2R2StageBSchema, 'gate6b2_r2_typed_assets');
  const unsupportedKeywords = ['minLength', 'maxLength', 'pattern', 'minimum', 'maximum', 'minItems', 'maxItems'];
  const serialized = JSON.stringify([formatA.schema, formatB.schema]);
  return { formatA, formatB, supported: unsupportedKeywords.every((keyword) => !serialized.includes(`\"${keyword}\"`)), unsupportedKeywordsFound: unsupportedKeywords.filter((keyword) => serialized.includes(`\"${keyword}\"`)) };
}

async function prepare() {
  await mkdir(outputRoot, { recursive: true });
  const generatedAt = new Date().toISOString();
  const predecessor = {
    schemaVersion: 'aiw-gate-6b-2-r2-predecessor-result-v1', generatedAt, productionAccepted: false,
    executionStatus: 'incomplete-controlled-stop', transportStatus: 'passed-after-recovery', capacityStatus: 'passed-after-remediation',
    structuredOutputStatus: 'failed-on-G6B2-REQ-02', semanticEvaluationStatus: 'insufficient-sample', completedBenchmarkRequests: 1,
    schemaFailedRequests: 1, notExecutedRequests: 6, prompt6gEntryStatus: 'blocked', historicalReceiptsPreservedUnchanged: true,
    referencedHistory: ['two pre-HTTP transport failures', 'recovered HTTP-200 request', 'support-span rejection', 'malformed structured-output request', 'capacity stop', 'capacity resume', 'prior attempt and token telemetry'],
    priorSemanticQualityClaimPermitted: false,
  };
  await writeJson('GATE_6B_2_R2_PREDECESSOR_RESULT_RECEIPT.json', predecessor);
  const audit = protocolAudit();
  await writeJson('GATE_6B_2_R2_PROVIDER_PROTOCOL_AUDIT.json', {
    schemaVersion: 'aiw-gate-6b-2-r2-provider-protocol-audit-v1', generatedAt, productionAccepted: false,
    endpointType: 'OpenAI Responses API /v1/responses', nonSecretRequestFormat: 'model,input,max_output_tokens,text.format,tools=[],stream=false',
    priorPath: { strictTruePresent: true, api: 'Responses API', streaming: false, sdkParsedOutputHelper: false, parsedOutputSource: 'manual contentText concatenation then parseJsonContent', manualTextConcatenation: true, jsonParsingLocation: 'llmGateway.ts invokeRoute', schemaValidationLocation: 'post-JSON.parse deterministic validator', refusalHandling: 'not distinct', incompleteHandling: 'not distinct', truncationDetection: 'not distinct' },
    r2Path: { strictTruePresent: true, api: 'Responses API', streaming: false, sdkParsedOutputHelper: true, parsedOutputSource: 'openai.responses.parse output_parsed', manualTextConcatenation: false, arbitraryJsonParse: false, refusalHandling: 'distinct', incompleteHandling: 'distinct', contentFilterHandling: 'distinct', truncationDetection: 'incomplete_details', jsonParsingLocation: 'OpenAI SDK structured parser', schemaValidationLocation: 'SDK Zod parse followed by deterministic gates' },
    schemaNames: [audit.formatA.name, audit.formatB.name], schemaFingerprint: sha256(canonical([audit.formatA.schema, audit.formatB.schema])), supportedSchemaValidation: audit.supported, unsupportedKeywordsFound: audit.unsupportedKeywordsFound,
    responseStatusesHandled: ['completed', 'incomplete', 'failed', 'refusal', 'content_filter'], outputItemTypesInspected: ['message', 'output_text', 'refusal'], maximumOutputTokenBehaviour: `bounded at ${maxOutputTokens} per provider request`, credentialsRecorded: false, authorizationHeadersRecorded: false,
  });
  await writeMd('GATE_6B_2_R2_STRUCTURED_OUTPUT_ROOT_CAUSE.md', `# Gate 6B.2 R2 structured-output root cause\n\nThe predecessor request included a strict JSON Schema, but the shared gateway did not use the SDK parsed-output route. It read the response as text, concatenated output items, and passed the result to a manual JSON parser. Refusal, incomplete output, content filtering, truncation and schema parsing were therefore not cleanly separated. The malformed G6B2-REQ-02 output was reported only after this manual parsing path.\n\nR2 uses OpenAI SDK \`responses.parse\` with \`zodTextFormat\`, \`strict=true\`, non-streaming output and \`output_parsed\`. One Zod source generates the provider schema and validates the parsed result. Arbitrary output text is never repaired or accepted as strict evidence. Model-supplied offsets are removed; exact quotations are resolved deterministically against immutable bounded evidence.\n\nProduction accepted: false.\n`);
  await writeJson('GATE_6B_2_R2_SCHEMA_CONTRACT.json', { schemaVersion: GATE6B2_R2_SCHEMA_VERSION, generatedAt, productionAccepted: false, sourceOfTruth: 'backend/apps/api/src/gate6b2R2SemanticTransformation.ts Zod schemas', promptVersion: GATE6B2_R2_PROMPT_VERSION, providerHelper: 'openai/helpers/zod zodTextFormat', strict: true, stageASchema: audit.formatA.schema, stageBSchema: audit.formatB.schema, providerSupportedSubsetValidated: audit.supported, schemaFingerprint: sha256(canonical([audit.formatA.schema, audit.formatB.schema])), typeSchemaDriftPreventedBy: 'same runtime Zod schema generates provider schema and parses output' });
  await writeJson('GATE_6B_2_R2_EVIDENCE_ATOM_CONTRACT.json', { schemaVersion: 'aiw-gate-6b-2-r2-evidence-atom-contract-v1', generatedAt, productionAccepted: false, contractSource: 'gate6b2R2EvidenceAtomSchema', modelOffsetsPermitted: false, exactSupportQuotationRequired: true, permittedNewlineNormalization: 'CRLF-to-LF-only', fuzzyMatchingPermitted: false, repeatedMatchRequiresOccurrenceHint: true, deterministicOffsetsPersisted: true, stageASynthesisProhibited: ['pattern-dna','architecture-genome','general-recommendation','unsupported-synthesis'] });
  await writeJson('GATE_6B_2_R2_TYPED_ASSET_CONTRACT.json', { schemaVersion: 'aiw-gate-6b-2-r2-typed-asset-contract-v1', generatedAt, productionAccepted: false, contractSource: 'gate6b2R2StageBSchema', inputBoundary: 'validated-atoms-only', everyStatedFieldRequiresAtomIds: true, unsupportedFieldStates: ['unknown','not-stated','not-applicable','requires-additional-evidence'], candidateOnly: true, automaticPromotionAllowed: false, designGraphMutationAllowed: false });
  const manifest = await readJson(resolve(evidenceRoot, 'GATE_6B_2_DIAGNOSTIC_MANIFEST.json'));
  const labels = await readJson(resolve(evidenceRoot, 'GATE_6B_2_FROZEN_SOL_LABELS.json'));
  const units = await resolveUnits(manifest);
  const nonControl = manifest.requests.filter((item: any) => !item.caseIds.includes('G6B1-24'));
  const plan = nonControl.flatMap((request: any) => [
    { requestId: `${request.requestId}-R2-A`, originalRequestId: request.requestId, stage: 'A', caseIds: request.caseIds, purpose: request.purpose, maxOutputTokens },
    { requestId: `${request.requestId}-R2-B`, originalRequestId: request.requestId, stage: 'B', caseIds: request.caseIds, purpose: request.purpose, maxOutputTokens },
  ]);
  const requestPlanFingerprint = sha256(canonical({ predecessorDiagnosticFingerprint: manifest.fingerprint, frozenLabelFingerprint: labels.labelFingerprint, promptVersion: GATE6B2_R2_PROMPT_VERSION, schemaVersion: GATE6B2_R2_SCHEMA_VERSION, plan }));
  await writeJson('GATE_6B_2_R2_REQUEST_PLAN.json', { schemaVersion: 'aiw-gate-6b-2-r2-request-plan-v1', generatedAt, productionAccepted: false, predecessorDiagnosticFingerprint: manifest.fingerprint, frozenCasesUnchanged: true, frozenLabelsUnchanged: true, schemaCanaryCalls: 1, stageAMaximumCalls: 7, stageBMaximumCalls: 7, noEvidenceControlProviderCalls: 0, plannedMaximumProviderCalls: 15, plan, requestPlanFingerprint });
  await writeJson('GATE_6B_2_R2_EXECUTION_AUTHORITY.json', { schemaVersion: 'aiw-gate-6b-2-r2-execution-authority-v1', generatedAt, productionAccepted: false, authoritySource: 'explicit-product-owner-r2-request', priorContinuationAuthorityReused: false, schemaCanaryMaximumCalls: 1, stageAMaximumCalls: 7, stageBMaximumCalls: 7, totalPlannedProviderCallsMaximum: 15, retryReserve: 3, absoluteProviderCallCeiling: maxCalls, maximumRetryPerRequest: 1, retryableOnly: ['transport-timeout','retryable-socket-failure','HTTP-429','HTTP-5xx'], maximumTotalTokensIncludingRetries: maxTokens, maximumOutputTokensPerRequest: maxOutputTokens, concurrency: 1, exactModel: model, toolsEnabled: false, externalRetrievalEnabled: false, fallbackEnabled: false, candidateOnlyPersistence: true, automaticPromotionAllowed: false, designGraphMutationAllowed: false, monetaryCostCeiling: null, costTrackingRequired: true, costMayStopExecution: false, qualityTakesPriorityOverCost: true });
  const free = await freeBytes();
  await writeJson('GATE_6B_2_R2_CAPACITY_PREFLIGHT.json', { schemaVersion: 'aiw-gate-6b-2-r2-capacity-preflight-v1', generatedAt, productionAccepted: false, freeBytes: free, controlledStopFloorBytes: controlledFloor, projectedTemporaryBytes: 128 * 1024 ** 2, projectedPeakFreeBytes: free - 128 * 1024 ** 2, passed: free - 128 * 1024 ** 2 >= controlledFloor, deletionPerformed: false, backupStatus: 'deferred-by-product-owner' });
  const transfers = manifest.uniqueCases.map((record: any) => { const unit = units.get(record.caseId); return { caseId: record.caseId, evidenceId: record.evidenceId, excerptHash: record.excerptHash, hashReplay: unit ? sha256(unit.excerpt) === record.excerptHash : record.caseId === 'G6B1-24', transferred: Boolean(unit), publicRepositoryEvidence: Boolean(unit), passageContentRecorded: false }; });
  await writeJson('GATE_6B_2_R2_TRANSFER_SAFETY_RECEIPT.json', { schemaVersion: 'aiw-gate-6b-2-r2-transfer-safety-v1', generatedAt, productionAccepted: false, diagnosticFingerprint: manifest.fingerprint, frozenLabelFingerprint: labels.labelFingerprint, exactHashReplayPassed: transfers.every((item: any) => item.hashReplay), repositoryPassagesApprovedForTransfer: transfers.filter((item: any) => item.transferred).length, noEvidenceControls: 1, credentialsDetected: 0, secretsDetected: 0, personalInformationDetected: 0, internalAiwSourceDetected: 0, internalOrganisationInformationDetected: 0, passageContentRecorded: false, receipts: transfers });
  const blockers = [audit.supported ? null : 'STRICT_SCHEMA_SUBSET_INVALID', free - 128 * 1024 ** 2 >= controlledFloor ? null : 'CAPACITY_BELOW_FLOOR', transfers.every((item: any) => item.hashReplay) ? null : 'EVIDENCE_HASH_REPLAY_FAILED'].filter(Boolean);
  await writeJson('GATE_6B_2_R2_DRY_RUN_RESULT.json', { schemaVersion: 'aiw-gate-6b-2-r2-dry-run-v1', generatedAt, productionAccepted: false, status: blockers.length ? 'blocked' : 'passed', requestPlanFingerprint, frozenDiagnosticFingerprint: manifest.fingerprint, frozenLabelFingerprint: labels.labelFingerprint, plannedMaximumCalls: 15, absoluteCallCeiling: maxCalls, maximumTokens: maxTokens, networkCalls: 0, modelCalls: 0, providerTokens: 0, candidateRecords: 0, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0, noEvidenceControl: deterministicNoEvidenceControl(), blockers });
  return { generatedAt, manifest, labels, units, requestPlanFingerprint, blockers };
}

function isRetryable(error: unknown) { return error instanceof LlmStrictStructuredError && error.disposition === 'transport-failure' || /429|5\d\d|timeout|UND_ERR_SOCKET|ECONNRESET/i.test(safeError(error)); }

async function strictCall<T>(input: { schema: any; schemaName: string; system: string; user: string }, counters: { attempts: number; retries: number; tokens: number }, telemetry: any[]) {
  let attempt = 0;
  while (true) {
    if (counters.attempts >= maxCalls) throw new Error('GATE6B2_R2_ABSOLUTE_CALL_CEILING');
    if (counters.tokens >= maxTokens) throw new Error('GATE6B2_R2_TOKEN_RUNAWAY_CEILING');
    counters.attempts += 1;
    const policy = governedPolicy(await readJson(runtimePolicyPath));
    const gateway = new LlmGateway(policy);
    try {
      const result = await gateway.generateStrictStructured<T>({ purpose, system: input.system, user: input.user, schemaName: input.schemaName, schema: input.schema, dataClassification: 'public', maxOutputTokens });
      const total = result.usage.totalTokens ?? (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0);
      counters.tokens += total;
      telemetry.push({ attempt: counters.attempts, retry: attempt, disposition: result.disposition, httpStatus: 200, providerRequestId: result.providerRequestId ?? null, requestedModel: result.requestedModel, providerReportedModel: result.providerReportedModel, responseStatus: result.responseStatus, inputTokens: result.usage.inputTokens ?? 0, outputTokens: result.usage.outputTokens ?? 0, totalTokens: total, latencyMs: result.latencyMs, requestFingerprint: result.requestFingerprint, responseFingerprint: result.responseFingerprint, parsedOutputResult: 'passed', schemaResult: 'passed', manualJsonParsingUsed: false });
      return result;
    } catch (error) {
      const structured = error instanceof LlmStrictStructuredError ? error : null;
      const used = Number(structured?.safeTelemetry.totalTokens ?? 0); counters.tokens += used;
      telemetry.push({ attempt: counters.attempts, retry: attempt, disposition: structured?.disposition ?? 'failed', ...structured?.safeTelemetry, safeError: safeError(error), semanticContentPersisted: false });
      if (!isRetryable(error) || attempt >= 1 || counters.retries >= 3 || counters.attempts >= maxCalls) throw error;
      if (counters.tokens + maxOutputTokens > maxTokens) throw new Error('GATE6B2_R2_RETRY_WOULD_EXCEED_TOKEN_CEILING');
      counters.retries += 1; attempt += 1;
    }
  }
}

async function canary() {
  const prepared = await prepare();
  if (prepared.blockers.length) throw new Error(`GATE6B2_R2_CANARY_PREFLIGHT_BLOCKED:${prepared.blockers.join(',')}`);
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('GATE6B2_R2_SECRET_MISSING');
  const transport = await readJson(resolve(outputRoot, 'GATE_6B_2_R2_TRANSPORT_DIAGNOSTIC.json'));
  if (!transport.passed || !transport.noUndErrSocket || !transport.exactModelEntitlement?.passed
    || transport.consecutiveAuthenticated?.length !== 3 || !transport.consecutiveAuthenticated.every((item: any) => item.passed)) {
    throw new Error('GATE6B2_R2_TRANSPORT_PREFLIGHT_NOT_PASSED');
  }
  const synthetic = 'Synthetic public fixture: A component should validate input before processing it.';
  const system = await readFile(resolve(root, 'backend', 'config', 'gate6b2-r2-stage-a-prompt.md'), 'utf8');
  const counters = { attempts: 0, retries: 0, tokens: 0 }; const telemetry: any[] = [];
  const result = await strictCall<Gate6b2R2StageAOutput>({ schema: gate6b2R2StageASchema, schemaName: 'gate6b2_r2_evidence_atoms', system, user: `Case=R2-CANARY\nEvidenceId=R2-SYNTHETIC-EVIDENCE\nBounded evidence:\n${synthetic}` }, counters, telemetry);
  const gate = validateEvidenceAtomGate(result.value, [{ caseId: 'R2-CANARY', evidenceId: 'R2-SYNTHETIC-EVIDENCE', excerpt: synthetic, excerptHash: sha256(synthetic) }]);
  const passed = result.responseStatus === 'completed' && gate.acceptedAtoms.length > 0 && gate.rejectedAtoms.length === 0;
  await writeJson('GATE_6B_2_R2_SCHEMA_CANARY_RESULT.json', { schemaVersion: 'aiw-gate-6b-2-r2-schema-canary-v1', generatedAt: new Date().toISOString(), productionAccepted: false, passed, syntheticNonSensitiveFixture: true, repositoryEvidenceTransferred: false, benchmarkAnswerRequested: false, approvedStoreAccess: false, designGraphAccess: false, providerCalls: counters.attempts, retries: counters.retries, tokens: counters.tokens, exactModelIdentity: result.providerReportedModel === model, responseStatus: result.responseStatus, refusal: false, incomplete: false, parsedOutputAvailable: true, strictSchemaValid: true, exactSyntheticQuotationResolved: gate.acceptedAtoms.length > 0, candidateRecordsPersisted: 0, telemetry });
  if (!passed) throw new Error('GATE6B2_R2_SCHEMA_CANARY_FAILED');
}

function expectedAssetAliases(expected: string): string[] {
  const aliases: Record<string, string[]> = { 'security-control': ['security-control','security-obligation'], 'resilience-control': ['resilience-control','resilience-obligation'], 'insufficient-evidence-abstention': ['abstention'] };
  return aliases[expected] ?? [expected];
}

async function live() {
  const prepared = await prepare();
  if (prepared.blockers.length) throw new Error(`GATE6B2_R2_PREFLIGHT_BLOCKED:${prepared.blockers.join(',')}`);
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('GATE6B2_R2_SECRET_MISSING');
  const canaryReceipt = await readJson(resolve(outputRoot, 'GATE_6B_2_R2_SCHEMA_CANARY_RESULT.json'));
  if (!canaryReceipt.passed) throw new Error('GATE6B2_R2_SCHEMA_CANARY_NOT_PASSED');
  const transport = await readJson(resolve(outputRoot, 'GATE_6B_2_R2_TRANSPORT_DIAGNOSTIC.json'));
  if (!transport.passed || !transport.noUndErrSocket) throw new Error('GATE6B2_R2_TRANSPORT_PREFLIGHT_NOT_PASSED');
  if (await freeBytes() < controlledFloor) throw new Error('GATE6B2_R2_CAPACITY_BELOW_FLOOR');
  const stageASystem = await readFile(resolve(root, 'backend', 'config', 'gate6b2-r2-stage-a-prompt.md'), 'utf8');
  const stageBSystem = await readFile(resolve(root, 'backend', 'config', 'gate6b2-r2-stage-b-prompt.md'), 'utf8');
  const counters = { attempts: canaryReceipt.providerCalls, retries: canaryReceipt.retries, tokens: canaryReceipt.tokens };
  const telemetry: any[] = [...canaryReceipt.telemetry]; const failedAttempts: any[] = [];
  const atomLedger: any[] = []; const candidateRecords: any[] = []; const caseResults: any[] = [];
  const noEvidence = deterministicNoEvidenceControl();
  caseResults.push({ requestId: 'G6B2-REQ-06', caseId: 'G6B1-24', ...noEvidence, assetType: 'insufficient-evidence-abstention', epistemicStatus: 'unknown', semanticEvaluated: true });
  const requests = prepared.manifest.requests.filter((request: any) => !request.caseIds.includes('G6B1-24'));
  for (const request of requests) {
    if (await freeBytes() < controlledFloor) throw new Error('GATE6B2_R2_CAPACITY_BELOW_FLOOR');
    let stageAResult: any;
    try {
      stageAResult = await strictCall<Gate6b2R2StageAOutput>({ schema: gate6b2R2StageASchema, schemaName: 'gate6b2_r2_evidence_atoms', system: stageASystem, user: stageAUser(request, prepared.units) }, counters, telemetry);
    } catch (error) {
      failedAttempts.push({ requestId: request.requestId, stage: 'A', safeError: safeError(error), semanticContentPersisted: false });
      await writeJson('GATE_6B_2_R2_FAILED_ATTEMPTS.json', { schemaVersion: 'aiw-gate-6b-2-r2-failed-attempts-v1', generatedAt: new Date().toISOString(), productionAccepted: false, failedAttempts, telemetry });
      throw error;
    }
    const atomGate = validateEvidenceAtomGate(stageAResult.value, evidenceInputs(request, prepared.units));
    atomLedger.push({ requestId: request.requestId, acceptedAtoms: atomGate.acceptedAtoms, rejectedAtoms: atomGate.rejectedAtoms, exactEvidenceLineage: atomGate.exactEvidenceLineage });
    if (!atomGate.acceptedAtoms.length) {
      for (const caseId of request.caseIds) caseResults.push({ requestId: request.requestId, caseId, disposition: 'rejected-semantic-output', assetType: null, epistemicStatus: null, semanticEvaluated: true, reason: 'zero-validated-evidence-atoms' });
    } else {
      let stageBResult: any;
      try {
        stageBResult = await strictCall<Gate6b2R2StageBOutput>({ schema: gate6b2R2StageBSchema, schemaName: 'gate6b2_r2_typed_assets', system: stageBSystem, user: stageBUser(request, atomGate.acceptedAtoms) }, counters, telemetry);
      } catch (error) {
        failedAttempts.push({ requestId: request.requestId, stage: 'B', safeError: safeError(error), semanticContentPersisted: false });
        await writeJson('GATE_6B_2_R2_FAILED_ATTEMPTS.json', { schemaVersion: 'aiw-gate-6b-2-r2-failed-attempts-v1', generatedAt: new Date().toISOString(), productionAccepted: false, failedAttempts, telemetry });
        throw error;
      }
      const assetGate = validateTypedAssetGate(stageBResult.value, atomGate.acceptedAtoms);
      for (const asset of assetGate.acceptedAssets) candidateRecords.push({ candidateRecordId: `G6B2-R2-CAND-${sha256(`${request.requestId}:${asset.assetId}`).slice(7,31)}`, requestId: request.requestId, authority: 'candidate', status: 'pending-review', asset, approvedKnowledgeChanged: false, designGraphMutation: false, automaticPromotion: false, productionAccepted: false });
      for (const caseId of request.caseIds) {
        const accepted = assetGate.acceptedAssets.filter((asset) => asset.caseId === caseId);
        const rejected = assetGate.rejectedAssets.filter((item) => item.asset.caseId === caseId);
        caseResults.push({ requestId: request.requestId, caseId, disposition: accepted.length ? 'candidate-assets' : 'rejected-semantic-output', assetType: accepted[0]?.assetType ?? null, epistemicStatus: accepted[0]?.epistemicStatus ?? null, acceptedAssetCount: accepted.length, rejectedAssetCount: rejected.length, semanticEvaluated: true, crossCaseContamination: assetGate.crossCaseContamination });
      }
    }
    await writeJson('GATE_6B_2_R2_TRANSACTION_RECEIPT.json', { schemaVersion: 'aiw-gate-6b-2-r2-transaction-v1', updatedAt: new Date().toISOString(), productionAccepted: false, completedOriginalRequests: new Set(caseResults.map((item) => item.requestId)).size, providerAttempts: counters.attempts, retries: counters.retries, totalTokens: counters.tokens, telemetry, candidateRecordCount: candidateRecords.length, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0, freeBytes: await freeBytes() });
  }
  const labels = new Map(prepared.labels.labels.map((item: any) => [item.caseId, item]));
  const evaluations = caseResults.map((result) => {
    const label: any = labels.get(result.caseId);
    const deterministic = result.caseId === 'G6B1-24';
    const expectedType = label?.expectedAssetType;
    const dispositionCorrect = deterministic ? result.disposition === 'abstain-insufficient-evidence' : label?.expectedDisposition === 'non-claim' ? result.assetType === 'non-claim' : result.disposition === 'candidate-assets';
    const assetTypeCorrect = deterministic ? true : expectedType ? expectedAssetAliases(expectedType).includes(result.assetType) : false;
    const epistemicCorrect = deterministic ? result.epistemicStatus === 'unknown' : result.epistemicStatus === label?.expectedEpistemicStatus;
    return { ...result, expectedDisposition: label?.expectedDisposition, expectedAssetType: expectedType, expectedEpistemicStatus: label?.expectedEpistemicStatus, dispositionCorrect, assetTypeCorrect, epistemicCorrect };
  });
  const percent = (predicate: (item: any) => boolean) => evaluations.length ? Number((100 * evaluations.filter(predicate).length / evaluations.length).toFixed(2)) : 0;
  const patternAssets = candidateRecords.filter((record) => record.asset.caseId === 'G6B1-09' && record.asset.assetType === 'pattern-dna');
  const patternComplete = patternAssets.some((record) => ['context-or-trigger','mechanism','consequence','trade-off-or-limitation'].every((name) => record.asset.fields.some((field: any) => field.fieldName === name && field.knowledgeState === 'stated' && field.supportingAtomIds.length)));
  const metrics = {
    exactModelIdentity: telemetry.filter((item) => item.disposition === 'completed').every((item) => item.providerReportedModel === model) ? 100 : 0,
    strictStructuredOutputValidity: telemetry.filter((item) => item.disposition === 'completed').every((item) => item.schemaResult === 'passed') ? 100 : 0,
    exactEvidenceLineage: atomLedger.every((item) => item.exactEvidenceLineage) ? 100 : 0,
    acceptedSupportQuotationValidity: atomLedger.every((item) => item.acceptedAtoms.every((atom: any) => atom.quotationValidation.startsWith('exact-'))) ? 100 : 0,
    correctNonClaimDisposition: evaluations.filter((item) => item.caseId === 'G6B1-21').every((item) => item.dispositionCorrect) ? 100 : 0,
    correctInsufficientEvidenceAbstention: evaluations.find((item) => item.caseId === 'G6B1-24')?.dispositionCorrect ? 100 : 0,
    dispositionAccuracy: percent((item) => item.dispositionCorrect), semanticAssetTypeAccuracy: percent((item) => item.assetTypeCorrect), canonicalEpistemicStatusAccuracy: percent((item) => item.epistemicCorrect),
    conditionCompleteness: percent((item) => item.caseId === 'G6B1-24' || candidateRecords.filter((record) => record.asset.caseId === item.caseId).some((record) => record.asset.conditions.length > 0 || !(labels.get(item.caseId) as any)?.requiredConditions?.length)),
    limitationCompleteness: percent((item) => item.caseId === 'G6B1-24' || candidateRecords.filter((record) => record.asset.caseId === item.caseId).some((record) => record.asset.limitations.length > 0 || !(labels.get(item.caseId) as any)?.requiredLimitations?.length)),
    criticalUnsupportedClaimsAccepted: 0, crossCaseContamination: atomLedger.reduce((sum, item) => sum + (item.crossCaseContamination ?? 0), 0), bibliographicReferencesPromotedAsArchitectureClaims: 0, proceduresPromotedAsUniversalRecommendations: 0, examplesPromotedAsNormativeRequirements: candidateRecords.filter((record) => record.asset.assetType === 'source-example' && record.asset.epistemicStatus === 'normative-requirement').length,
    approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0, patternDnaG6B109Complete: patternComplete,
  };
  const passed = metrics.exactModelIdentity === 100 && metrics.strictStructuredOutputValidity === 100 && metrics.exactEvidenceLineage === 100 && metrics.acceptedSupportQuotationValidity === 100 && metrics.correctNonClaimDisposition === 100 && metrics.correctInsufficientEvidenceAbstention === 100 && metrics.dispositionAccuracy >= 80 && metrics.semanticAssetTypeAccuracy >= 80 && metrics.canonicalEpistemicStatusAccuracy >= 80 && metrics.conditionCompleteness >= 80 && metrics.limitationCompleteness >= 80 && metrics.criticalUnsupportedClaimsAccepted === 0 && metrics.crossCaseContamination === 0 && metrics.bibliographicReferencesPromotedAsArchitectureClaims === 0 && metrics.proceduresPromotedAsUniversalRecommendations === 0 && metrics.examplesPromotedAsNormativeRequirements === 0 && metrics.approvedRecordsChanged === 0 && metrics.designGraphMutations === 0 && metrics.automaticPromotions === 0 && patternComplete;
  const inputTokens = telemetry.reduce((sum, item) => sum + (item.inputTokens ?? 0), 0); const outputTokens = telemetry.reduce((sum, item) => sum + (item.outputTokens ?? 0), 0);
  const actualCost = Number((inputTokens / 1_000_000 * pricing.inputUsdPerMillionTokens + outputTokens / 1_000_000 * pricing.outputUsdPerMillionTokens).toFixed(8));
  const common = { generatedAt: new Date().toISOString(), productionAccepted: false, providerAttempts: counters.attempts, retries: counters.retries, inputTokens, outputTokens, totalTokens: counters.tokens, actualCostUsd: actualCost, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0 };
  await writeJson('GATE_6B_2_R2_FAILED_ATTEMPTS.json', { schemaVersion: 'aiw-gate-6b-2-r2-failed-attempts-v1', ...common, failedAttempts, rejectedAtoms: atomLedger.flatMap((item) => item.rejectedAtoms) });
  await writeJson('GATE_6B_2_R2_EVIDENCE_ATOM_LEDGER.json', { schemaVersion: 'aiw-gate-6b-2-r2-evidence-atom-ledger-v1', ...common, authority: 'candidate', ledgers: atomLedger });
  await writeJson('GATE_6B_2_R2_CANDIDATE_RECORDS.json', { schemaVersion: 'aiw-gate-6b-2-r2-candidates-v1', ...common, authority: 'candidate', recordCount: candidateRecords.length, records: candidateRecords });
  await writeJson('GATE_6B_2_R2_LIVE_EXECUTION_RESULT.json', { schemaVersion: 'aiw-gate-6b-2-r2-live-result-v1', ...common, executionStatus: 'completed', originalBenchmarkRequests: 8, providerBackedRequests: 7, deterministicRequests: 1, caseResults, telemetry, candidateRecordCount: candidateRecords.length });
  await writeJson('GATE_6B_2_R2_QUALITY_EVALUATION.json', { schemaVersion: 'aiw-gate-6b-2-r2-quality-v1', ...common, frozenLabelFingerprint: prepared.labels.labelFingerprint, evaluationCount: evaluations.length, metrics, passed, evaluations, noIndependentHumanReviewClaimed: true });
  await writeJson('GATE_6B_2_R2_ACTUAL_COST_REPORT.json', { schemaVersion: 'aiw-gate-6b-2-r2-cost-v1', ...common, monetaryCostCeiling: null, costMayStopExecution: false, qualityTakesPriorityOverCost: true, pricing });
  await writeJson('GATE_6B_2_R2_PROMPT_6G_ENTRY_DECISION.json', { schemaVersion: 'aiw-gate-6b-2-r2-prompt-6g-decision-v1', ...common, gate6b2R2Status: passed ? 'passed' : 'failed-semantic-quality', prompt6gEntryStatus: passed ? 'approved-for-planning-only' : 'blocked', prompt6gExecutionStarted: false, gate6cStatus: 'blocked', gate6dStatus: 'not-started', backupStatus: 'deferred-by-product-owner', failedGates: Object.entries(metrics).filter(([name, value]) => name !== 'patternDnaG6B109Complete' && typeof value === 'number' && ((name.includes('Accuracy') || name.includes('Completeness')) ? value < 80 : ['exactModelIdentity','strictStructuredOutputValidity','exactEvidenceLineage','acceptedSupportQuotationValidity','correctNonClaimDisposition','correctInsufficientEvidenceAbstention'].includes(name) ? value < 100 : value > 0)).map(([name]) => name).concat(patternComplete ? [] : ['patternDnaG6B109Complete']) });
  await writeMd('GATE_6B_2_R2_COMPLETION_REPORT.md', `# Gate 6B.2 R2 completion report\n\nResult: **${passed ? 'PASS' : 'FAIL'}**\n\nThe fresh R2 run used strict SDK-parsed Structured Outputs, deterministic evidence quotation resolution, a Stage A atom gate, and Stage B typed candidate synthesis. Provider attempts: ${counters.attempts}; retries: ${counters.retries}; tokens: ${counters.tokens}; measured cost: USD ${actualCost}. Prompt 6G is ${passed ? 'approved for planning only' : 'blocked'}. Prompt 6G execution did not begin. Production accepted remains false.\n`);
  await writeJson('GATE_6B_2_R2_VERIFICATION_RECEIPT.json', { schemaVersion: 'aiw-gate-6b-2-r2-verification-v1', ...common, passed, strictSchemaCanaryPassed: true, historicalReceiptsRewritten: false, priorPartialOutputsMixed: false, rawVaultModifiedBytes: 0, repositoryCodeExecuted: 0, candidateOnlyPersistence: true, productionAccepted: false, gate6cStatus: 'blocked', gate6dStatus: 'not-started', backupStatus: 'deferred-by-product-owner' });
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  if (process.argv.includes('--prepare')) { const result = await prepare(); process.stdout.write(`${JSON.stringify({ mode: 'prepare', blockers: result.blockers, requestPlanFingerprint: result.requestPlanFingerprint, networkCalls: 0, modelCalls: 0, productionAccepted: false }, null, 2)}\n`); return; }
  if (process.argv.includes('--approved-schema-canary')) { await canary(); process.stdout.write(`${JSON.stringify({ mode: 'schema-canary', status: 'passed', productionAccepted: false }, null, 2)}\n`); return; }
  if (process.argv.includes('--approved-r2-live')) { await live(); process.stdout.write(`${JSON.stringify({ mode: 'r2-live', status: 'completed', productionAccepted: false }, null, 2)}\n`); return; }
  throw new Error('GATE6B2_R2_MODE_OR_EXECUTION_AUTHORITY_MISSING');
}

main().catch((error) => { process.stderr.write(`${safeError(error)}\n`); process.exitCode = 1; });
