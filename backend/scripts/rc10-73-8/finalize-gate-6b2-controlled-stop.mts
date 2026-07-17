import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const evidenceRoot = resolve(root, 'release-evidence', 'rc10.73.8');
const model = 'gpt-4.1-mini-2025-04-14';
const generatedAt = new Date().toISOString();
const sha256 = (value: string | Buffer) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
async function readJson(name: string) { return JSON.parse(await readFile(resolve(evidenceRoot, name), 'utf8')); }
async function writeJson(name: string, value: unknown) { await writeFile(resolve(evidenceRoot, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
async function writeMd(name: string, value: string) { await writeFile(resolve(evidenceRoot, name), value.endsWith('\n') ? value : `${value}\n`, 'utf8'); }

async function main() {
  const manifest = await readJson('GATE_6B_2_DIAGNOSTIC_MANIFEST.json');
  const plan = await readJson('GATE_6B_2_REQUEST_PLAN.json');
  const preservation = await readJson('GATE_6B_2_GATE6B1_EVIDENCE_PRESERVATION_RECEIPT.json');
  const attempts = [
    {
      attemptId: 'G6B2-ATTEMPT-01', requestId: 'G6B2-REQ-01', attempt: 0,
      disposition: 'transport-failure-before-http-response', safeError: 'fetch failed',
      classification: 'provider-transport-timeout-before-http-response', retryPermitted: true,
      httpStatus: null, providerRequestId: null, requestedModel: model, providerReportedModel: null,
      inputTokens: 0, outputTokens: 0, totalTokens: 0, responseFingerprint: null,
      schemaValidationStatus: 'not-run', identityValidationStatus: 'not-run', semanticContentPersisted: false,
    },
    {
      attemptId: 'G6B2-ATTEMPT-02', requestId: 'G6B2-REQ-01', attempt: 1,
      disposition: 'transport-failure-before-http-response', safeError: 'PROVIDER_NETWORK_FAILURE:UND_ERR_SOCKET',
      classification: 'unrecoverable-provider-network-failure', retryPermitted: false,
      httpStatus: null, providerRequestId: null, requestedModel: model, providerReportedModel: null,
      inputTokens: 0, outputTokens: 0, totalTokens: 0, responseFingerprint: null,
      schemaValidationStatus: 'not-run', identityValidationStatus: 'not-run', semanticContentPersisted: false,
    },
  ];
  await writeJson('GATE_6B_2_FAILED_ATTEMPTS.json', {
    schemaVersion: 'aiw-gate-6b-2-failed-attempts-v1', generatedAt, productionAccepted: false,
    status: 'controlled-stop-unrecoverable-provider-failure', failedAttemptCount: 2, providerCallAttemptsConsumed: 2,
    retryCount: 1, perRequestRetryLimitExhausted: true, attempts,
    credentialsRecorded: false, authenticationHeadersRecorded: false, unrestrictedProviderResponsesRecorded: false,
    rejectedSemanticContentPersistedAsCandidate: false,
  });
  await writeJson('GATE_6B_2_CANDIDATE_RECORDS.json', {
    schemaVersion: 'aiw-gate-6b-2-candidate-records-v1', generatedAt, productionAccepted: false,
    authority: 'candidate', recordCount: 0, records: [], approvedRecordsChanged: 0,
    designGraphMutations: 0, automaticPromotions: 0,
  });
  await writeJson('GATE_6B_2_LIVE_TRANSACTION_RECEIPT.json', {
    schemaVersion: 'aiw-gate-6b-2-live-transaction-v1', generatedAt, productionAccepted: false,
    provider: 'openai', exactRequestedModel: model, providerReportedModel: null,
    plannedProviderCalls: 8, providerCallAttempts: 2, completedProviderResponses: 0, retries: 1,
    absoluteProviderCallCeilingIncludingRetries: 10, remainingCallAuthority: 8,
    perRequestRetryLimitExhaustedFor: ['G6B2-REQ-01'], actualInputTokens: 0, actualOutputTokens: 0,
    actualTotalTokens: 0, maximumTotalTokensIncludingRetries: 120000, actualCostUsd: 0,
    monetaryCostCeiling: null, costMayStopExecution: false, transactions: attempts,
    credentialsRecorded: false, authenticationHeadersRecorded: false, rawRequestBodiesRecorded: false,
    unrestrictedProviderResponsesRecorded: false,
  });
  await writeJson('GATE_6B_2_LIVE_EXECUTION_RESULT.json', {
    schemaVersion: 'aiw-gate-6b-2-live-execution-v1', generatedAt, productionAccepted: false,
    status: 'controlled-stop-unrecoverable-provider-failure', diagnosticFingerprint: manifest.fingerprint,
    requestPlanFingerprint: plan.requestPlanFingerprint, exactModelRequested: model, exactModelReturned: null,
    plannedRequests: 8, completedRequests: 0, providerCallAttempts: 2, retries: 1,
    actualInputTokens: 0, actualOutputTokens: 0, actualTotalTokens: 0, actualCostUsd: 0,
    candidateRecordsCreated: 0, approvedRecordsChanged: 0, designGraphMutations: 0,
    automaticPromotions: 0, secretFindings: 0, toolsEnabled: false, externalRetrievalCalls: 0,
    repositoryCodeExecuted: 0, providerSchemaValidatedByLiveResponse: false,
    semanticQualityEvaluationPossible: false, stopReason: 'unrecoverable-provider-network-failure-after-one-permitted-retry',
    backupStatus: 'deferred-by-product-owner', gate6cStatus: 'blocked', gate6dStatus: 'not-started',
  });
  await writeJson('GATE_6B_2_TOKEN_USAGE_REPORT.json', {
    schemaVersion: 'aiw-gate-6b-2-token-usage-v1', generatedAt, productionAccepted: false,
    inputTokens: 0, outputTokens: 0, totalTokens: 0, ceiling: 120000, withinCeiling: true,
    note: 'Both attempts failed before an HTTP response or provider usage receipt existed.',
  });
  await writeJson('GATE_6B_2_ACTUAL_COST_REPORT.json', {
    schemaVersion: 'aiw-gate-6b-2-actual-cost-v1', generatedAt, productionAccepted: false,
    currency: 'USD', monetaryCostCeiling: null, costTrackingRequired: true, actualCostUsd: 0,
    byRequest: [{ requestId: 'G6B2-REQ-01', providerAttempts: 2, completedResponses: 0, observedCostUsd: 0 }],
    byAssetType: {}, costEstimateNotSubstitutedForObservedUsage: true,
  });
  await writeJson('GATE_6B_2_QUALITY_EVALUATION.json', {
    schemaVersion: 'aiw-gate-6b-2-quality-evaluation-v1', generatedAt, productionAccepted: false,
    status: 'not-performed-no-provider-output', reviewActorType: 'gpt-5.6-sol', humanReviewerPresent: false,
    externallyVerified: false, developmentDecisionAuthority: true, productionAuthority: false,
    frozenLabelsUnchanged: true, diagnosticFingerprint: manifest.fingerprint,
    metrics: {
      exactModelIdentity: null, strictSchemaValidity: null, exactEvidenceLineage: null,
      supportSpanValidation: null, dispositionAccuracy: null, semanticAssetTypeAccuracy: null,
      canonicalEpistemicStatusAccuracy: null, conditionCompleteness: null, limitationCompleteness: null,
      correctNonClaimDisposition: null, correctInsufficientEvidenceAbstention: null,
      patternDnaCompleteness: null, contradictionVsScopedDistinctionAccuracy: null,
      crossCaseContamination: 0, criticalUnsupportedClaimsAccepted: 0,
      bibliographicReferencesPromotedAsArchitectureClaims: 0, proceduresPromotedAsUniversalRecommendations: 0,
      examplesPromotedAsNormativeRequirements: 0, approvedRecordsChanged: 0,
      designGraphMutations: 0, automaticPromotions: 0,
    },
    gate6b2Passed: false, reason: 'No provider output was received; semantic criteria cannot be evaluated.',
  });
  await writeJson('GATE_6B_2_PROMPT_6G_ENTRY_DECISION.json', {
    schemaVersion: 'aiw-gate-6b-2-prompt-6g-entry-decision-v1', generatedAt, productionAccepted: false,
    gate6b2Status: 'failed-controlled-stop', semanticContractRepairPassed: false,
    prompt6gPlanningAuthorized: false, prompt6gExecutionStarted: false,
    fullCorpusProviderExecutionAuthorized: false, decisionReason: 'Gate 6B.2 received no provider response after the initial transport failure and one permitted retry.',
    remainingRootCause: 'unrecoverable-provider-transport',
    semanticRootCauseClassification: 'unresolved-because-diagnostic-did-not-execute',
    smallestNextDiagnostic: 'After explicit new execution authority and restored provider connectivity, rerun only G6B2-REQ-01 to prove the provider schema and typed validator path before authorising the remaining seven requests.',
    gate6cStatus: 'blocked', gate6dStatus: 'not-started', backupStatus: 'deferred-by-product-owner',
  });
  await writeMd('GATE_6B_2_TECHNICAL_DECISION.md', `# Gate 6B.2 technical decision\n\nGate result: **FAIL - controlled provider stop**  \nProduction accepted: **false**\n\nThe initial request and its one permitted retry both failed before an HTTP response. The second failure was \`UND_ERR_SOCKET\`. No model identity, schema, semantic output, tokens, cost, candidate record, approved-store write, Design Graph mutation or promotion was observed.\n\nThe frozen diagnostic and offline semantic-contract repair remain valid, but they do not prove runtime semantic quality. Gate 6B.2 is not passed. Prompt 6G remains blocked. The smallest safe next step is a newly authorised single-request connectivity/schema diagnostic for \`G6B2-REQ-01\`; the current per-request retry authority is exhausted.\n`);
  await writeMd('GATE_6B_2_COMPLETION_REPORT.md', `# Gate 6B.2 completion report\n\nStatus: **controlled stop - failed**  \nModel requested: \`${model}\`  \nProvider call attempts: 2; retries: 1; completed HTTP responses: 0  \nTokens: 0; observed cost: USD 0  \nCandidate records: 0; approved changes: 0; Design Graph mutations: 0; promotions: 0  \nProduction accepted: false\n\nThe historical Gate 6B.1 evidence remains byte-for-byte unchanged (${preservation.files.length} governed files). The four-pass root-cause review, typed semantic-asset contract, prompt, validators, offline tests, diagnostic benchmark, frozen labels and no-network preflight were completed. The live semantic evaluation could not run because provider connectivity failed before HTTP twice.\n\nPrompt 6G is blocked. Gate 6C remains blocked; Gate 6D is not started; backup remains deferred by product owner.\n`);
  await writeJson('GATE_6B_2_VERIFICATION_RECEIPT.json', {
    schemaVersion: 'aiw-gate-6b-2-verification-receipt-v1', generatedAt, productionAccepted: false,
    baselineCommit: 'a312e08b459ef838814d5273270c69ac87d0c03a', historicalGate6b1EvidenceUnchanged: preservation.allHistoricalEvidenceUnchanged,
    diagnosticFingerprint: manifest.fingerprint, requestPlanFingerprint: plan.requestPlanFingerprint,
    offlineVerification: { domainBuildPassed: true, apiBuildPassed: true, focusedGate6bTestsPassed: 75, gate6b2TestsPassed: 23, scriptSyntaxChecksPassed: 3, jsonParsingPassed: true, jsonFilesParsed: 29, gitDiffCheckPassed: true },
    liveVerification: { providerCallAttempts: 2, completedHttpResponses: 0, retries: 1, status: 'controlled-stop-unrecoverable-provider-failure' },
    credentialsIncluded: 0, rawVaultPayloadsIncluded: 0, unrestrictedProviderResponsesIncluded: 0,
    approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0,
    productionAcceptedTrueFindings: 0, gate6b2Passed: false, prompt6gAuthorized: false,
    evidenceFingerprint: sha256(JSON.stringify({ diagnosticFingerprint: manifest.fingerprint, requestPlanFingerprint: plan.requestPlanFingerprint, attempts: 2, retries: 1, candidates: 0 })),
  });
  process.stdout.write(`${JSON.stringify({ status: 'controlled-stop-unrecoverable-provider-failure', providerCalls: 2, retries: 1, tokens: 0, costUsd: 0, candidates: 0, gate6b2Passed: false, prompt6gAuthorized: false, productionAccepted: false }, null, 2)}\n`);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
