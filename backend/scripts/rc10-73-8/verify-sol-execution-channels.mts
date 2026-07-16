import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import { LlmGateway, loadLlmRuntimePolicy, type JsonGenerationRequest } from '../../apps/api/src/llmGateway.ts';
import { healthRoutes } from '../../apps/api/src/routes/healthRoutes.ts';
import { InMemoryBrainTransactionRepository } from '../../apps/api/src/brainTransactionRepository.ts';
import type { LlmRuntimePolicy } from '@aiw/domain';

const here = dirname(fileURLToPath(import.meta.url));
const product = resolve(here, '../../..');
const evidenceRoot = resolve(product, 'release-evidence/local-environment');
const generatedAt = new Date().toISOString();
const intendedModel = 'gpt-5.6-sol';
const secretPresent = Boolean(process.env.OPENAI_API_KEY);
const priorProviderEvidencePath = resolve(product, 'release-evidence/rc10.72.3/LIVE_SOL_PROVIDER_ACCEPTANCE.json');
const priorProviderEvidence = JSON.parse(await readFile(priorProviderEvidencePath, 'utf8')) as { status?: string; productionAccepted?: boolean; liveProviderUsed?: boolean; routes?: Array<{ providerId?: string; model?: string; configured?: boolean }> };

function sha256(value: unknown): string {
  return `sha256:${createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex')}`;
}

const boundedSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['authority','proposal','evidenceRefs','requiresHumanReview'],
  properties: {
    authority: { type: 'string', const: 'candidate' },
    proposal: { type: 'string', minLength: 20, maxLength: 800 },
    evidenceRefs: { type: 'array', minItems: 1, maxItems: 4, uniqueItems: true, items: { type: 'string', enum: ['EVIDENCE-ALPHA'] } },
    requiresHumanReview: { type: 'boolean', const: true },
  },
};

const source = {
  id: 'EVIDENCE-ALPHA', recordId: 'PAT-BOUNDED-TRANSFORMATION', title: 'Bounded transformation control',
  statement: 'Use bounded transformations to produce candidate proposals that require independent human review.',
  sourceReleaseId: 'LOCAL-READINESS-EVIDENCE', activeKnowledgeReleaseId: 'AKR-0.10.73.5', reviewStatus: 'verified' as const,
};

const request: JsonGenerationRequest = {
  purpose: 'architecture-reasoning', schemaName: 'sol_bounded_candidate_proposal', jsonSchema: boundedSchema,
  dataClassification: 'internal', allowInsufficientGrounding: false,
  system: 'Transform only the supplied approved evidence into a candidate proposal. Never mutate project state.',
  user: 'Evidence EVIDENCE-ALPHA says candidate proposals require independent human review. api_key=sk-test-redaction-only-1234567890',
  grounding: { allowedReferenceIds: ['EVIDENCE-ALPHA'], sources: [source], requireCitations: true, minimumSupportScore: 0.08 },
};

let guardedNetworkCalls = 0;
const actualGateway = new LlmGateway(loadLlmRuntimePolicy(), async () => {
  guardedNetworkCalls += 1;
  throw new Error('NETWORK_GUARD_SHOULD_NOT_BE_REACHED_WITHOUT_SECRET');
});
const healthApp = Fastify();
await healthRoutes(healthApp, {
  principalFor: () => ({ tenantId: 'local-sol-readiness' }),
  llmRuntimeConfigurations: { gateway: async () => actualGateway },
  knowledgeOperations: { saveLlmAudit: async () => undefined },
});
const healthResponse = await healthApp.inject({ method: 'GET', url: '/api/llm-brain/health' });
assert.equal(healthResponse.statusCode, 200);
const healthPayload = healthResponse.json() as { routes: Array<{ routeId: string; providerId: string; model: string; configured: boolean; circuit: string }> };
const reasoningHealth = healthPayload.routes.find((route) => route.routeId.startsWith('architecture-reasoning:'));
assert.ok(reasoningHealth);
assert.equal(reasoningHealth.providerId, 'openai');
assert.equal(reasoningHealth.model, intendedModel);
const activeProbeResponse = await healthApp.inject({ method: 'POST', url: '/api/llm-brain/active-probe', payload: { purpose: 'architecture-reasoning' } });
const activeProbePayload = activeProbeResponse.json() as Record<string, unknown>;
if (!secretPresent) {
  assert.equal(activeProbeResponse.statusCode, 503);
  assert.match(String(activeProbePayload.error), /LLM_MODEL_NOT_ALLOWLISTED|LLM_API_KEY_NOT_CONFIGURED/);
  assert.equal(guardedNetworkCalls, 0);
}
await healthApp.close();

const harnessPolicy: LlmRuntimePolicy = {
  routes: [{ id: `architecture-reasoning:openai:${intendedModel}`, purpose: 'architecture-reasoning', providerId: 'openai', model: intendedModel, baseUrl: 'https://api.openai.com/v1', apiKeyEnvironmentVariable: 'OPENAI_API_KEY', protocol: 'responses', timeoutMs: 10_000, maxOutputTokens: 600, temperature: 0, enabled: true, fallbackRouteIds: [], dataClassificationAllowlist: ['public','internal'] }],
  modelAllowlist: [{ providerId: 'openai', model: intendedModel, purposes: ['architecture-reasoning'], verificationReference: 'deterministic-transport-harness-only' }],
  maxInputCharacters: 32768,
  allowFallback: false, requireStructuredOutput: true, redactSecrets: true, logPrompts: false, retainProviderContent: false,
  maxRetries: 0, circuitBreakerFailures: 20, circuitBreakerResetSeconds: 60,
};

const originalKey = process.env.OPENAI_API_KEY;
process.env.OPENAI_API_KEY = 'local-harness-placeholder-not-a-user-secret';
let responseMode: 'valid'|'extra-field'|'outside-allowlist'|'unsupported' = 'valid';
let transmittedAuthorizationPresent = false;
let transmittedSecretPatternPresent = false;
const harnessFetch: typeof fetch = async (_url, init) => {
  const headers = init?.headers as Record<string, string> | undefined;
  transmittedAuthorizationPresent = Boolean(headers?.authorization);
  const body = String(init?.body ?? '');
  transmittedSecretPatternPresent = /sk-test-redaction-only/i.test(body);
  const values = {
    valid: { authority: 'candidate', proposal: source.statement, evidenceRefs: ['EVIDENCE-ALPHA'], requiresHumanReview: true },
    'extra-field': { authority: 'candidate', proposal: source.statement, evidenceRefs: ['EVIDENCE-ALPHA'], requiresHumanReview: true, promote: true },
    'outside-allowlist': { authority: 'candidate', proposal: source.statement, evidenceRefs: ['NOT-ALLOWED'], requiresHumanReview: true },
    unsupported: { authority: 'candidate', proposal: 'This guarantees 100% success without risk or trade-off.', evidenceRefs: ['EVIDENCE-ALPHA'], requiresHumanReview: true },
  };
  return new Response(JSON.stringify({ id: 'local-harness-response', output_text: JSON.stringify(values[responseMode]), usage: { input_tokens: 10, output_tokens: 10, total_tokens: 20 } }), { status: 200, headers: { 'content-type': 'application/json' } });
};
const harnessGateway = new LlmGateway(harnessPolicy, harnessFetch);
const graphBefore = { revision: 73, nodes: [{ id: 'node-1', kind: 'System', label: 'Unchanged' }], edges: [] as unknown[] };
const graphFingerprintBefore = sha256(graphBefore);
const success = await harnessGateway.generateJson<{ authority: 'candidate'; proposal: string; evidenceRefs: string[]; requiresHumanReview: true }>(request);
const graphFingerprintAfter = sha256(graphBefore);

async function rejection(mode: typeof responseMode): Promise<string> {
  responseMode = mode;
  try { await harnessGateway.generateJson(request); return 'NOT_REJECTED'; }
  catch (error) { return error instanceof Error ? error.message : String(error); }
}
const strictSchemaRejection = await rejection('extra-field');
const allowlistRejection = await rejection('outside-allowlist');
const unsupportedClaimRejection = await rejection('unsupported');
responseMode = 'valid';

const transactions = new InMemoryBrainTransactionRepository();
const transaction = await transactions.recordProposal({
  tenantId: 'local-sol-readiness', actorId: 'aiw-runtime-sol', actorRoles: ['ai-assistant'], correlationId: 'sol-bounded-transformation-test',
  receipt: {
    schemaVersion: '1.0', proposalId: `sol-proposal-${sha256(success.requestFingerprint).slice(-16)}`, task: 'explain-or-challenge',
    projectId: 'local-readiness-project', branchId: 'local-readiness-branch', projectRevision: 73, stage: 'governance', contextFingerprint: sha256(request.user),
    graph: { revision: graphBefore.revision, fingerprint: graphFingerprintBefore, projectionMode: 'compatibility', integrityHealthy: true, legacyProjectionUsed: false, stateAuthorityMode: 'graph-primary', canonicalStateKinds: ['nodes','edges'] },
    generatedAt, manifest: { releaseId: 'AKR-0.10.73.5', fingerprint: sha256('AKR-0.10.73.5') },
    authorityChain: [], deterministicRules: ['candidate-only-output','human-review-required','no-direct-model-mutation'], knowledgeRefs: ['EVIDENCE-ALPHA'],
    llm: { requested: true, used: false, fallbackUsed: true, providerId: success.providerId, model: success.model, routeId: success.routeId, requestFingerprint: success.requestFingerprint, latencyMs: success.latencyMs },
    governance: { humanApprovalRequired: true, directModelMutationAllowed: false, staleIfProjectRevisionChanges: true, auditRequired: true },
    warnings: ['Provider response was generated by a deterministic transport harness; AIW runtime Sol is not activated.'],
  } as any,
  summary: { title: 'Sol bounded candidate transformation', description: 'Candidate proposal recorded for independent review.', externalRefs: {}, warningCount: 1, knowledgeRefCount: 1, llmUsed: false },
});
const transactionEvents = await transactions.listEvents('local-sol-readiness', transaction.id);
await transactions.close();
if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;

assert.equal(success.model, intendedModel);
assert.equal(success.value.authority, 'candidate');
assert.equal(success.schemaValidation.valid, true);
assert.equal(success.groundingReceipt?.verified, true);
assert.equal(success.redaction.user.changed, true);
assert.equal(transmittedAuthorizationPresent, true);
assert.equal(transmittedSecretPatternPresent, false);
assert.match(strictSchemaRejection, /LLM_RESPONSE_SCHEMA_INVALID/);
assert.match(allowlistRejection, /LLM_RESPONSE_SCHEMA_INVALID|LLM_CITATION_OUTSIDE_ALLOWLIST/);
assert.match(unsupportedClaimRejection, /LLM_EVIDENCE_ENTAILMENT_FAILED/);
assert.equal(graphFingerprintAfter, graphFingerprintBefore);
assert.equal(transaction.status, 'proposed');
assert.equal(transactionEvents.length, 1);
assert.equal(transactionEvents[0]?.type, 'proposal-recorded');

const runtimeActivated = secretPresent && activeProbeResponse.statusCode === 200;
const boundedTest = {
  schemaVersion: 'aiw-sol-bounded-transformation-test-v1', generatedAt, productionAccepted: false,
  executionClassification: runtimeActivated ? 'aiw-runtime-sol-transformation' : 'deterministic-governed-gateway-harness',
  actualRuntime: {
    providerConfigured: reasoningHealth.configured, providerId: reasoningHealth.providerId, model: reasoningHealth.model,
    activeProbeStatusCode: activeProbeResponse.statusCode, activeProbePassed: activeProbeResponse.statusCode === 200,
    runtimeSolActivated: runtimeActivated, missingSecret: !secretPresent ? 'OPENAI_API_KEY' : null,
    networkCallAttempted: guardedNetworkCalls > 0,
  },
  governedHarness: {
    provider: success.providerId, model: success.model, strictSchemaValidationPassed: success.schemaValidation.valid,
    redactionReceipt: { changed: success.redaction.user.changed, counts: success.redaction.user.counts, findingKinds: success.redaction.user.findings.map((item) => item.kind) },
    secretPatternTransmitted: transmittedSecretPatternPresent, evidenceAllowlistEnforced: /SCHEMA_INVALID|CITATION_OUTSIDE_ALLOWLIST/.test(allowlistRejection),
    evidenceEntailmentVerified: success.groundingReceipt?.verified === true, unsupportedClaimRejected: /EVIDENCE_ENTAILMENT_FAILED/.test(unsupportedClaimRejection),
    invalidOrExtraFieldsRejected: /SCHEMA_INVALID/.test(strictSchemaRejection), outputAuthority: success.value.authority,
    candidateOnly: success.value.authority === 'candidate', graphFingerprintBefore, graphFingerprintAfter,
    designGraphMutated: graphFingerprintBefore !== graphFingerprintAfter, automaticPromotion: transaction.status !== 'proposed',
    transactionReceipt: { id: transaction.id, status: transaction.status, version: transaction.version, eventCount: transactionEvents.length, lastEventHash: transaction.lastEventHash, humanApprovalRequired: transaction.receipt.governance.humanApprovalRequired, directModelMutationAllowed: transaction.receipt.governance.directModelMutationAllowed },
  },
  distinctions: {
    codexSolSupervisedTransformation: 'active-this-session',
    aiwRuntimeSolTransformation: runtimeActivated ? 'active-probe-passed' : 'unconfigured-missing-secret',
    deterministicFallback: 'governed-gateway-transport-harness-passed; not a provider activation claim',
    unconfiguredRuntime: runtimeActivated ? false : true,
  },
};

const channelReceipt = {
  schemaVersion: 'aiw-sol-execution-channel-receipt-v1', generatedAt, baseline: 'AIW v0.10.0-rc.10.73.6', productionAccepted: false,
  channels: {
    codexAgent: { identity: 'GPT-5.6 Sol', role: 'engineering supervision, execution, inspection and review', status: 'active', mutationAuthority: 'repository-scoped engineering changes under user direction' },
    aiwProductRuntime: { providerId: reasoningHealth.providerId, intendedModel, resolvedModel: reasoningHealth.model, secretReference: 'OPENAI_API_KEY', secretPresent, healthConfigured: reasoningHealth.configured, activeProbePassed: activeProbeResponse.statusCode === 200, status: runtimeActivated ? 'active' : 'unconfigured', authority: 'candidate proposals only; no graph mutation or promotion' },
  },
  secretHandling: { secretValueReadIntoEvidence: false, secretValueLogged: false, repositorySecretModified: false },
  runtimeInspection: {
    providerPolicy: 'OpenAI Responses API route with provider, purpose, protocol and data-classification controls.',
    explicitModelNameAllowlistPresent: false,
    modelValidation: 'Route model must be non-empty; provider protocol must be supported. The configured model identifier is auditable but not restricted by a name allowlist.',
    structuredOutput: 'Provider-native strict JSON Schema plus independent AIW post-validation.',
    redaction: 'System and user content are redacted before transport; receipts contain kinds, counts and fingerprints only.',
    grounding: 'Approved reference allowlist, required citations and deterministic entailment verification.',
    transactionAndReview: 'Proposal-recorded transaction; human approval required; direct model mutation prohibited; independent reviewer controls remain external.',
    legacyIntegrationsAdapter: 'Scaffold only; not used as evidence of runtime provider activation.',
  },
  priorProviderEvidence: {
    path: 'release-evidence/rc10.72.3/LIVE_SOL_PROVIDER_ACCEPTANCE.json', status: priorProviderEvidence.status ?? 'unknown',
    productionAccepted: priorProviderEvidence.productionAccepted === true, liveProviderUsed: priorProviderEvidence.liveProviderUsed === true,
    routes: (priorProviderEvidence.routes ?? []).map((route) => ({ providerId: route.providerId, model: route.model, configured: route.configured === true })),
  },
  activationClaim: runtimeActivated ? 'AIW runtime Sol active probe passed.' : 'AIW runtime Sol is not activated because OPENAI_API_KEY is absent.',
};

const serializedEvidence = JSON.stringify({ boundedTest, channelReceipt });
assert.equal(/sk-test-redaction-only|local-harness-placeholder/i.test(serializedEvidence), false);
await mkdir(evidenceRoot, { recursive: true });
await writeFile(resolve(evidenceRoot, 'SOL_EXECUTION_CHANNEL_RECEIPT.json'), `${JSON.stringify(channelReceipt, null, 2)}\n`);
await writeFile(resolve(evidenceRoot, 'SOL_BOUNDED_TRANSFORMATION_TEST.json'), `${JSON.stringify(boundedTest, null, 2)}\n`);
const healthReport = `# AIW LLM Runtime Health Report\n\nBaseline: AIW v0.10.0-rc.10.73.6  \nGenerated: ${generatedAt}  \nProduction accepted: **false**\n\n## Execution channels\n\n- **Codex agent channel:** GPT-5.6 Sol is supervising this local engineering and verification task.\n- **AIW product-runtime channel:** **${runtimeActivated ? 'ACTIVE' : 'UNCONFIGURED'}**. Provider is ${reasoningHealth.providerId}; the resolved model is \`${reasoningHealth.model}\`.\n- **Deterministic fallback/harness:** Passed the gateway governance controls, but is not evidence of an external model call.\n\n## Actual AIW health route\n\nThe product's \`GET /api/llm-brain/health\` route resolved the architecture-reasoning route to OpenAI / \`${reasoningHealth.model}\`, with \`configured=${reasoningHealth.configured}\`. The active probe returned HTTP ${activeProbeResponse.statusCode}. ${runtimeActivated ? 'The provider call passed.' : 'No provider call was made because OPENAI_API_KEY is absent; the route failed closed before network access.'}\n\n## Configuration and controls inspected\n\n- The real API gateway uses the OpenAI Responses API and strict provider-native JSON Schema, then independently post-validates the returned object.\n- System and user content are redacted before provider transport. Redaction receipts expose only categories, counts and fingerprints.\n- Claim-bearing output is restricted to an approved evidence-reference allowlist and deterministic entailment verification.\n- Transactions begin in \`proposed\` state, require human review, and prohibit direct model mutation.\n- Provider, purpose, protocol and data classification are allowlisted. There is currently **no explicit model-name allowlist**; model identifiers are required to be non-empty and are recorded in route and audit receipts.\n- The older integrations OpenAI adapter remains a scaffold and is not the runtime channel tested here.\n\n## Prior provider evidence\n\n\`release-evidence/rc10.72.3/LIVE_SOL_PROVIDER_ACCEPTANCE.json\` recorded status \`${priorProviderEvidence.status ?? 'unknown'}\`, \`liveProviderUsed=${priorProviderEvidence.liveProviderUsed === true}\`, and \`productionAccepted=${priorProviderEvidence.productionAccepted === true}\` for the former \`${priorProviderEvidence.routes?.[0]?.model ?? 'unknown'}\` route. It is historical evidence, not proof of the current model route.\n\n## Governed bounded-transformation controls\n\nThe production gateway implementation was exercised with a deterministic provider transport harness. Strict schema validation, redaction receipts, evidence allowlisting, unsupported-claim rejection, candidate-only authority, unchanged Design Graph fingerprint, no automatic promotion, and proposed transaction receipt generation all passed. This harness result must not be read as AIW runtime Sol activation.\n\n## Activation blocker\n\n${runtimeActivated ? 'None for the bounded active probe. Production acceptance remains false.' : 'OPENAI_API_KEY is not configured. Supply it through the external environment or approved secret manager, then rerun this receipt generator with approved network access. No secret file was created or modified.'}\n`;
await writeFile(resolve(evidenceRoot, 'AIW_LLM_RUNTIME_HEALTH_REPORT.md'), healthReport);
console.log(JSON.stringify({ intendedModel, resolvedModel: reasoningHealth.model, providerConfigured: reasoningHealth.configured, activeProbeStatusCode: activeProbeResponse.statusCode, runtimeSolActivated: runtimeActivated, governedHarnessPassed: true, transactionStatus: transaction.status, productionAccepted: false }, null, 2));
