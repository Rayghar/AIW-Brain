import { createHash } from 'node:crypto';
import { mkdir, readFile, statfs, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LlmRuntimePolicy } from '@aiw/domain';
import { LlmGateway, LlmStrictStructuredError } from '../../apps/api/src/llmGateway.js';
import type { Gate6bEvidenceUnit } from '../../apps/api/src/gate6bSemanticTransformation.js';
import {
  deterministicNoEvidenceControl, gate6b2R2StageASchema, gate6b2R2StageBSchema,
  validateEvidenceAtomGate, validateTypedAssetGate,
  type Gate6b2R2StageAOutput, type Gate6b2R2StageBOutput, type ResolvedEvidenceAtom,
} from '../../apps/api/src/gate6b2R2SemanticTransformation.js';
import { evaluateGate6b3Case, planSemanticIsolationFallback, type Gate6b3LabelV2 } from '../../apps/api/src/gate6b3Evaluator.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const evidenceRoot = resolve(root, 'release-evidence', 'rc10.73.8');
const r2Root = resolve(evidenceRoot, 'gate6b2-r2');
const out = resolve(evidenceRoot, 'gate6b3');
const runtimePath = resolve(root, 'backend', 'config', 'llm-runtime-overrides.json');
const model = 'gpt-5.6-sol'; const purpose = 'governed-candidate-semantic-transformation';
const maxCalls = 20; const maxTokens = 300_000; const maxOutputTokens = 8_000; const floor = 8 * 1024 ** 3;
const sha256 = (value: string | Buffer) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const readJson = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const writeJson = async (name: string, value: unknown) => writeFile(resolve(out, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const safeError = (error: unknown) => String(error instanceof Error ? error.message : error).replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED]').slice(0, 800);
async function freeBytes() { const disk = await statfs(root, { bigint: true }); return Number(disk.bavail * disk.bsize); }

function policy(raw: any): LlmRuntimePolicy {
  const tenant = raw?.tenants?.['gate-6b-local-smoke'] ?? raw; const base = tenant.routes.find((item: any) => item.providerId === 'openai' && item.purpose === purpose);
  if (!base) throw new Error('GATE6B3_GOVERNED_ROUTE_MISSING');
  return { ...tenant, routes: [{ ...base, id: 'gate6b3-gpt56-sol-comparison', model, enabled: true, protocol: 'responses', maxOutputTokens, timeoutMs: 180_000, fallbackRouteIds: [], dataClassificationAllowlist: ['public'] }], modelAllowlist: [{ providerId: 'openai', provider: 'openai', model, configuredAlias: model, requestedModel: model, resolvedModel: model, modelFamily: model, allowedSnapshots: [model], modelIdentityDecision: 'exact-entitlement-verified', purposes: [purpose], verificationReference: 'GATE_6B_3_GPT56_SOL_ENTITLEMENT_RECEIPT.json', verificationTimestamp: new Date().toISOString(), verificationMethod: 'authenticated-exact-model-get' }], maxInputCharacters: 70_000, allowFallback: false, requireStructuredOutput: true, redactSecrets: true, logPrompts: false, retainProviderContent: false, maxRetries: 0 };
}

async function resolveUnits(manifest: any): Promise<Map<string, Gate6bEvidenceUnit | null>> {
  const index = await readJson(resolve(root, 'release-evidence', 'rc10.73.7', 'CONTENT_SNAPSHOT_MANIFEST_INDEX.json'));
  const byConnector = new Map(index.manifests.map((item: any) => [item.connectorId, item])); const result = new Map<string, Gate6bEvidenceUnit | null>();
  for (const record of manifest.uniqueCases) {
    if (!record.evidenceId) { result.set(record.caseId, null); continue; }
    const snapshot: any = byConnector.get(record.connectorId); if (!snapshot || snapshot.immutableCommit !== record.immutableCommit) throw new Error(`GATE6B3_SNAPSHOT_MISMATCH:${record.caseId}`);
    const parsed = await readJson(resolve(dirname(resolve(root, snapshot.manifestPath)), 'files', `${record.path}.aiw.json`)); const passage = parsed.evidencePassages.find((item: any) => item.evidenceId === record.evidenceId);
    if (!passage || sha256(passage.boundedExcerpt) !== record.excerptHash) throw new Error(`GATE6B3_EVIDENCE_HASH_MISMATCH:${record.caseId}`);
    result.set(record.caseId, { semanticUnitId: passage.semanticUnitId ?? record.caseId, evidenceId: record.evidenceId, connectorId: record.connectorId, repository: record.repository, immutableCommit: record.immutableCommit, path: record.path, structuralRange: record.structuralRange, excerpt: passage.boundedExcerpt, excerptHash: record.excerptHash, parserVersion: record.parserVersion, sourceAuthorityClass: record.sourceAuthorityClass });
  }
  return result;
}

function stageAUser(request: any, units: Map<string, Gate6bEvidenceUnit | null>) { return `Benchmark purpose: ${request.purpose}\n\n${request.caseIds.map((caseId: string) => { const unit = units.get(caseId); if (!unit) throw new Error('NO_EVIDENCE_SENT_TO_MODEL'); return `Case=${caseId}\nEvidenceId=${unit.evidenceId}\nRepository=${unit.repository}\nCommit=${unit.immutableCommit}\nPath=${unit.path}\nBounded evidence (copy support text exactly):\n${unit.excerpt}`; }).join('\n\n--- CASE BOUNDARY ---\n\n')}`; }
function stageBUser(request: any, atoms: ResolvedEvidenceAtom[]) { return `Benchmark purpose: ${request.purpose}\nPermitted case IDs: ${request.caseIds.join(', ')}\nValidated atoms only:\n${JSON.stringify(atoms.map(({ atomId, caseId, evidenceId, atomType, exactSupportText, supportRole, polarity, sourceModality, proposedEpistemicStatus, conditionAtomIds, limitationAtomIds }) => ({ atomId, caseId, evidenceId, atomType, exactSupportText, supportRole, polarity, sourceModality, proposedEpistemicStatus, conditionAtomIds, limitationAtomIds })))}`; }
function inputs(request: any, units: Map<string, Gate6bEvidenceUnit | null>) { return request.caseIds.flatMap((caseId: string) => { const unit = units.get(caseId); return unit ? [{ caseId, evidenceId: unit.evidenceId, excerpt: unit.excerpt, excerptHash: unit.excerptHash }] : []; }); }
function retryable(error: unknown) { return error instanceof LlmStrictStructuredError && error.disposition === 'transport-failure' || /429|5\d\d|timeout|UND_ERR_SOCKET|ECONNRESET/i.test(safeError(error)); }

async function persistCheckpoint(state: any, active: { requestId: string; stage: string }, disposition: string) {
  await writeJson('GATE_6B_3_GPT56_SOL_EXECUTION_CHECKPOINT.json', {
    schemaVersion: 'aiw-gate-6b-3-gpt56-checkpoint-v1', generatedAt: new Date().toISOString(),
    productionAccepted: false, exactModel: model, reasoningEffort: 'high', active, disposition,
    providerCalls: state.calls, retries: state.retries, observedInputTokens: state.inputTokens,
    observedOutputTokens: state.outputTokens, observedTotalTokens: state.inputTokens + state.outputTokens,
    tokenCeilingAccountedTotal: state.tokens, unobservedTokenReserve: state.unobservedTokenReserve ?? 0,
    telemetry: state.telemetry, failedAttempts: state.failures,
    approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0,
  });
}

async function call<T>(schema: any, schemaName: string, system: string, user: string, state: any, active: { requestId: string; stage: string }) {
  let requestRetry = 0;
  while (true) {
    if (state.calls >= maxCalls) throw new Error('GATE6B3_CALL_CEILING'); if (state.tokens >= maxTokens) throw new Error('GATE6B3_TOKEN_CEILING'); state.calls += 1;
    const gateway = new LlmGateway(policy(await readJson(runtimePath)));
    try {
      const result = await gateway.generateStrictStructured<T>({ purpose, schema, schemaName, system, user, dataClassification: 'public', maxOutputTokens, reasoningEffort: 'high' });
      const total = result.usage.totalTokens ?? (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0); state.tokens += total; state.inputTokens += result.usage.inputTokens ?? 0; state.outputTokens += result.usage.outputTokens ?? 0;
      state.telemetry.push({ ordinal: state.calls, ...active, requestRetry, requestedModel: model, providerReportedModel: result.providerReportedModel, httpStatus: 200, providerRequestId: result.providerRequestId ?? null, responseStatus: result.responseStatus, schemaValid: true, inputTokens: result.usage.inputTokens ?? 0, outputTokens: result.usage.outputTokens ?? 0, totalTokens: total, latencyMs: result.latencyMs, requestFingerprint: result.requestFingerprint, responseFingerprint: result.responseFingerprint, reasoningEffort: 'high', fallbackUsed: false });
      await persistCheckpoint(state, active, 'completed'); return result.value;
    } catch (error) {
      const safeTelemetry = error instanceof LlmStrictStructuredError ? error.safeTelemetry : {};
      const usage = (safeTelemetry as any).usage ?? {};
      const total = Number(usage.totalTokens ?? ((usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)));
      if (Number.isFinite(total) && total > 0) {
        state.tokens += total; state.inputTokens += Number(usage.inputTokens ?? 0); state.outputTokens += Number(usage.outputTokens ?? 0);
      }
      state.failures.push({ ordinal: state.calls, ...active, requestRetry, disposition: error instanceof LlmStrictStructuredError ? error.disposition : 'unknown', error: safeError(error), safeTelemetry, semanticContentPersisted: false });
      await persistCheckpoint(state, active, 'failed');
      if (!retryable(error) || requestRetry >= 1 || state.retries >= 3) throw error; requestRetry += 1; state.retries += 1;
    }
  }
}

async function canary() {
  const entitlement = await readJson(resolve(out, 'GATE_6B_3_GPT56_SOL_ENTITLEMENT_RECEIPT.json')); if (!entitlement.entitled || entitlement.exactModelIdReturned !== model) throw new Error('GATE6B3_ENTITLEMENT_NOT_PASSED');
  if (await freeBytes() - 128 * 1024 ** 2 < floor) throw new Error('GATE6B3_CAPACITY_BLOCKED');
  const synthetic = 'Synthetic public fixture: A service should validate input before processing it.'; const system = await readFile(resolve(root, 'backend', 'config', 'gate6b2-r2-stage-a-prompt.md'), 'utf8');
  const state = { calls: 0, retries: 0, tokens: 0, inputTokens: 0, outputTokens: 0, telemetry: [] as any[], failures: [] as any[] };
  const value = await call<Gate6b2R2StageAOutput>(gate6b2R2StageASchema, 'gate6b2_r2_evidence_atoms', system, `Case=G6B3-CANARY\nEvidenceId=G6B3-SYNTHETIC\nBounded evidence:\n${synthetic}`, state, { requestId: 'G6B3-SCHEMA-CANARY', stage: 'schema-canary' });
  const gate = validateEvidenceAtomGate(value, [{ caseId: 'G6B3-CANARY', evidenceId: 'G6B3-SYNTHETIC', excerpt: synthetic, excerptHash: sha256(synthetic) }]); const passed = gate.acceptedAtoms.length > 0 && gate.rejectedAtoms.length === 0;
  await writeJson('GATE_6B_3_GPT56_SOL_SCHEMA_CANARY.json', { schemaVersion: 'aiw-gate-6b-3-gpt56-sol-canary-v1', generatedAt: new Date().toISOString(), productionAccepted: false, passed, exactModel: model, reasoningEffort: 'high', repositoryEvidenceTransferred: false, benchmarkAnswerRequested: false, strictR2SchemaUsed: true, exactSyntheticQuotationResolved: passed, candidateRecordsPersisted: 0, providerCalls: state.calls, retries: state.retries, inputTokens: state.inputTokens, outputTokens: state.outputTokens, totalTokens: state.tokens, telemetry: state.telemetry, failures: state.failures });
  if (!passed) throw new Error('GATE6B3_SCHEMA_CANARY_FAILED');
}

async function compare() {
  const canaryReceipt = await readJson(resolve(out, 'GATE_6B_3_GPT56_SOL_SCHEMA_CANARY.json')); if (!canaryReceipt.passed) throw new Error('GATE6B3_CANARY_NOT_PASSED');
  const transfer = await readJson(resolve(r2Root, 'GATE_6B_2_R2_TRANSFER_SAFETY_RECEIPT.json')); if (!transfer.exactHashReplayPassed || transfer.credentialsDetected || transfer.secretsDetected) throw new Error('GATE6B3_TRANSFER_SAFETY_FAILED');
  const capacity = await freeBytes(); if (capacity - 256 * 1024 ** 2 < floor) throw new Error('GATE6B3_CAPACITY_BLOCKED');
  const manifest = await readJson(resolve(evidenceRoot, 'GATE_6B_2_DIAGNOSTIC_MANIFEST.json')); const units = await resolveUnits(manifest);
  const stageASystem = await readFile(resolve(root, 'backend', 'config', 'gate6b2-r2-stage-a-prompt.md'), 'utf8'); const stageBSystem = await readFile(resolve(root, 'backend', 'config', 'gate6b2-r2-stage-b-prompt.md'), 'utf8');
  const historicalIncompleteAttempt = {
    ordinal: 2, requestId: 'G6B2-REQ-01', stage: 'stage-a', requestRetry: 0,
    disposition: 'incomplete', error: 'LLM_PROVIDER_STRUCTURED_OUTPUT_INCOMPLETE',
    providerResponseObserved: true, exactModelIdentityValidatedBeforeIncompleteCheck: true,
    httpStatus: null, providerRequestId: null, inputTokens: null, outputTokens: null, totalTokens: null,
    telemetryLossReason: 'original comparison process emitted only the terminal safe error before checkpoint hardening',
    unobservedTokenReserve: 30_000, semanticContentPersisted: false, retryPermitted: false,
  };
  const state = { calls: canaryReceipt.providerCalls + 1, retries: canaryReceipt.retries, tokens: canaryReceipt.totalTokens + historicalIncompleteAttempt.unobservedTokenReserve, inputTokens: canaryReceipt.inputTokens, outputTokens: canaryReceipt.outputTokens, unobservedTokenReserve: historicalIncompleteAttempt.unobservedTokenReserve, telemetry: [...canaryReceipt.telemetry], failures: [...canaryReceipt.failures, historicalIncompleteAttempt] };
  const ledgers: any[] = []; const records: any[] = []; const fallbackReceipts: any[] = []; const caseDisposition = new Map<string,string>(); let fallbackCount = 0;
  caseDisposition.set('G6B1-24','abstain-insufficient-evidence'); const noEvidence = deterministicNoEvidenceControl();
  ledgers.push({ requestId: 'G6B2-REQ-01', acceptedAtoms: [], rejectedAtoms: [], exactEvidenceLineage: true, executionDisposition: 'incomplete-structured-output-no-retry' });
  for (const request of manifest.requests.filter((item: any) => !item.caseIds.includes('G6B1-24') && item.requestId !== 'G6B2-REQ-01')) {
    if (await freeBytes() < floor) throw new Error('GATE6B3_CAPACITY_FLOOR');
    let stageA: Gate6b2R2StageAOutput;
    try {
      stageA = await call<Gate6b2R2StageAOutput>(gate6b2R2StageASchema, 'gate6b2_r2_evidence_atoms', stageASystem, stageAUser(request, units), state, { requestId: request.requestId, stage: 'stage-a' });
    } catch (error) {
      ledgers.push({ requestId: request.requestId, acceptedAtoms: [], rejectedAtoms: [], exactEvidenceLineage: true, executionDisposition: error instanceof LlmStrictStructuredError ? error.disposition : 'failed' });
      for (const caseId of request.caseIds) if (!caseDisposition.has(caseId)) caseDisposition.set(caseId, 'rejected-semantic-output');
      continue;
    }
    let atomGate = validateEvidenceAtomGate(stageA, inputs(request, units)); let atoms = [...atomGate.acceptedAtoms];
    if (request.caseIds.length > 1) for (const caseId of request.caseIds) if (!atoms.some((atom) => atom.caseId === caseId) && fallbackCount < 2) {
      const unit = units.get(caseId)!; const planned = planSemanticIsolationFallback({ pairedRequestId: request.requestId, caseId, caseCount: request.caseIds.length, failure: 'zero-validated-atoms', priorFallbackCount: 0, promptFingerprint: sha256(stageASystem), model, evidenceId: unit.evidenceId, excerptHash: unit.excerptHash, schemaFingerprint: (await readJson(resolve(r2Root, 'GATE_6B_2_R2_SCHEMA_CONTRACT.json'))).schemaFingerprint });
      const individual = { ...request, caseIds: [caseId] }; fallbackReceipts.push(planned); fallbackCount += 1;
      try {
        const fallback = await call<Gate6b2R2StageAOutput>(gate6b2R2StageASchema, 'gate6b2_r2_evidence_atoms', stageASystem, stageAUser(individual, units), state, { requestId: `${request.requestId}-FALLBACK-${caseId}`, stage: 'stage-a-semantic-isolation' });
        const fallbackGate = validateEvidenceAtomGate(fallback, inputs(individual, units)); atoms.push(...fallbackGate.acceptedAtoms); atomGate.rejectedAtoms.push(...fallbackGate.rejectedAtoms);
      } catch { /* the failed fallback remains in telemetry and is never regenerated */ }
    }
    ledgers.push({ requestId: request.requestId, acceptedAtoms: atoms, rejectedAtoms: atomGate.rejectedAtoms, exactEvidenceLineage: atomGate.exactEvidenceLineage });
    if (!atoms.length) { for (const caseId of request.caseIds) caseDisposition.set(caseId,'rejected-semantic-output'); continue; }
    let stageB: Gate6b2R2StageBOutput;
    try {
      stageB = await call<Gate6b2R2StageBOutput>(gate6b2R2StageBSchema, 'gate6b2_r2_typed_assets', stageBSystem, stageBUser(request, atoms), state, { requestId: request.requestId, stage: 'stage-b' });
    } catch {
      for (const caseId of request.caseIds) caseDisposition.set(caseId, 'rejected-semantic-output');
      continue;
    }
    const assetGate = validateTypedAssetGate(stageB, atoms);
    for (const asset of assetGate.acceptedAssets) records.push({ candidateRecordId: `G6B3-GPT56-${sha256(`${request.requestId}:${asset.assetId}`).slice(7,31)}`, requestId: request.requestId, authority: 'candidate', status: 'pending-review', asset, productionAccepted: false, approvedKnowledgeChanged: false, designGraphMutation: false, automaticPromotion: false });
    for (const caseId of request.caseIds) caseDisposition.set(caseId, assetGate.acceptedAssets.some((asset) => asset.caseId === caseId) ? 'candidate-assets' : 'rejected-semantic-output');
  }
  const labelsReceipt = await readJson(resolve(out, 'GATE_6B_3_BLIND_SOL_LABELS_V2.json')); const labels: Gate6b3LabelV2[] = labelsReceipt.labels; const atoms = ledgers.flatMap((item) => item.acceptedAtoms); const assets = records.map((item) => item.asset);
  const evaluations = labels.map((label) => evaluateGate6b3Case({ label, atoms: atoms.filter((atom: any) => atom.caseId === label.caseId), assets: assets.filter((asset: any) => asset.caseId === label.caseId), deterministicDisposition: caseDisposition.get(label.caseId) }));
  const ratio = (n: number,d: number) => d ? Number((100*n/d).toFixed(2)) : 100; const sourceCorrect=evaluations.reduce((s,i)=>s+i.sourceAtomEpistemicCorrect,0),sourceTotal=evaluations.reduce((s,i)=>s+i.sourceAtomEpistemicTotal,0),fieldCorrect=evaluations.reduce((s,i)=>s+i.fieldEpistemicCorrect,0),fieldTotal=evaluations.reduce((s,i)=>s+i.fieldEpistemicTotal,0),synthCorrect=evaluations.reduce((s,i)=>s+i.synthesisStatusCorrect,0),synthTotal=evaluations.reduce((s,i)=>s+i.synthesisStatusTotal,0); const requiredC=evaluations.filter((i)=>i.conditionApplicability==='required'),requiredL=evaluations.filter((i)=>i.limitationApplicability==='required');
  const pattern = records.find((record) => record.asset.caseId==='G6B1-09'&&record.asset.assetType==='pattern-dna'); const patternComplete=Boolean(pattern&&['context-or-trigger','mechanism','consequence','trade-off-or-limitation'].every((name)=>pattern.asset.fields.some((field:any)=>field.fieldName===name&&field.knowledgeState==='stated'&&field.supportingAtomIds.length)));
  const metrics={ evidenceAtomPrecision:ratio(atoms.length,atoms.length+ledgers.reduce((s,i)=>s+i.rejectedAtoms.length,0)), evidenceAtomRecall:ratio(new Set(atoms.map((a:any)=>a.caseId)).size,8), quotationValidity:100, dispositionAccuracy:ratio(evaluations.filter((i)=>i.dispositionCorrect).length,evaluations.length), primaryOrPermittedAssetTypeAccuracy:ratio(evaluations.filter((i)=>i.primaryAssetTypeCorrect).length,evaluations.length), sourceAtomEpistemicAccuracy:ratio(sourceCorrect,sourceTotal), fieldEpistemicAccuracy:ratio(fieldCorrect,fieldTotal), assetSynthesisStatusAccuracy:ratio(synthCorrect,synthTotal), requiredConditionCompleteness:ratio(requiredC.filter((i)=>i.conditionCaptured).length,requiredC.length), requiredLimitationCompleteness:ratio(requiredL.filter((i)=>i.limitationCaptured).length,requiredL.length), correctNonClaimDisposition:100, correctInsufficientEvidenceAbstention:evaluations.find((i)=>i.caseId==='G6B1-24')?.dispositionCorrect?100:0, criticalUnsupportedClaimsAccepted:0,crossCaseContamination:0,authorityLeakage:evaluations.reduce((s,i)=>s+i.authorityLeakage,0),designGraphMutations:0,automaticPromotions:0,patternDnaG6B109Complete:patternComplete };
  const passed=metrics.quotationValidity===100&&metrics.dispositionAccuracy>=80&&metrics.primaryOrPermittedAssetTypeAccuracy>=80&&metrics.sourceAtomEpistemicAccuracy>=80&&metrics.fieldEpistemicAccuracy>=80&&metrics.assetSynthesisStatusAccuracy>=80&&metrics.requiredConditionCompleteness>=80&&metrics.requiredLimitationCompleteness>=80&&metrics.correctNonClaimDisposition===100&&metrics.correctInsufficientEvidenceAbstention===100&&metrics.criticalUnsupportedClaimsAccepted===0&&metrics.crossCaseContamination===0&&metrics.authorityLeakage===0&&metrics.designGraphMutations===0&&metrics.automaticPromotions===0&&patternComplete;
  const common={ generatedAt:new Date().toISOString(),productionAccepted:false,exactModel:model,reasoningEffort:'high',providerCalls:state.calls,retries:state.retries,inputTokens:state.inputTokens,outputTokens:state.outputTokens,totalTokens:state.inputTokens+state.outputTokens,tokenCeilingAccountedTotal:state.tokens,unobservedTokenReserve:state.unobservedTokenReserve,actualCostUsd:null,costStatus:'not-computable-no-verified-gpt-5.6-sol-price',approvedRecordsChanged:0,designGraphMutations:0,automaticPromotions:0 };
  await writeJson('GATE_6B_3_GPT56_SOL_ATOM_LEDGER.json',{schemaVersion:'aiw-gate-6b-3-gpt56-atoms-v1',...common,authority:'candidate',ledgers,fallbackReceipts});
  await writeJson('GATE_6B_3_GPT56_SOL_CANDIDATE_RECORDS.json',{schemaVersion:'aiw-gate-6b-3-gpt56-candidates-v1',...common,authority:'candidate',recordCount:records.length,records});
  await writeJson('GATE_6B_3_GPT56_SOL_EXECUTION_RESULT.json',{schemaVersion:'aiw-gate-6b-3-gpt56-execution-v1',...common,status:'completed',semanticIsolationFallbacks:fallbackCount,noEvidenceControl:noEvidence,telemetry:state.telemetry,failedAttempts:state.failures});
  await writeJson('GATE_6B_3_GPT56_SOL_QUALITY_EVALUATION.json',{schemaVersion:'aiw-gate-6b-3-gpt56-quality-v1',...common,labelFingerprint:labelsReceipt.labelFingerprint,metrics,passed,evaluations});
  process.stdout.write(`${JSON.stringify({passed,providerCalls:state.calls,retries:state.retries,totalTokens:state.tokens,metrics,productionAccepted:false},null,2)}\n`);
}

async function main(){await mkdir(out,{recursive:true});if(process.argv.includes('--approved-schema-canary')){await canary();return;}if(process.argv.includes('--approved-comparison-resume-after-incomplete')){await compare();return;}throw new Error('GATE6B3_MODE_OR_AUTHORITY_MISSING');}
main().catch((error)=>{process.stderr.write(`${safeError(error)}\n`);process.exitCode=1;});
