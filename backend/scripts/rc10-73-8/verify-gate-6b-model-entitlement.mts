import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LlmRuntimePolicy } from '@aiw/domain';
import { LlmGateway } from '../../apps/api/src/llmGateway.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const evidenceRoot = resolve(root, 'release-evidence/rc10.73.8');
const receiptPath = resolve(evidenceRoot, 'GATE_6B_LIVE_MODEL_ENTITLEMENT_RECEIPT.json');
const purpose = 'governed-candidate-semantic-transformation' as const;
const providerId = 'openai' as const;
const model = process.env.AIW_LLM_GOVERNED_CANDIDATE_SEMANTIC_TRANSFORMATION_MODEL
  || process.env.AIW_LLM_KNOWLEDGE_EXTRACTION_MODEL
  || process.env.AIW_LLM_MODEL
  || process.env.OPENAI_MODEL;

if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('OPENAI_API_KEY_NOT_PRESENT');
if (!model?.trim()) throw new Error('GATE_6B_INTENDED_MODEL_NOT_CONFIGURED');
if ((process.env.AIW_LLM_PROVIDER || 'openai') !== 'openai') throw new Error('GATE_6B_PROVIDER_MUST_BE_OPENAI');

const policy: LlmRuntimePolicy = {
  routes: [{
    id: `gate-6b-entitlement:${providerId}:${model}`, purpose, providerId, model,
    baseUrl: 'https://api.openai.com/v1', apiKeyEnvironmentVariable: 'OPENAI_API_KEY', protocol: 'responses',
    timeoutMs: 30_000, maxOutputTokens: 1_500, temperature: 0, enabled: true, fallbackRouteIds: [],
    dataClassificationAllowlist: ['internal'],
  }],
  modelAllowlist: [], maxInputCharacters: 8_000, allowFallback: false, requireStructuredOutput: true,
  redactSecrets: true, logPrompts: false, retainProviderContent: false, maxRetries: 0,
  circuitBreakerFailures: 1, circuitBreakerResetSeconds: 60,
};

const gateway = new LlmGateway(policy);
const entitlement = await gateway.verifyExactModelEntitlement({ providerId, purpose, model });
const receipt = {
  schemaVersion: 'aiw-gate-6b-live-model-entitlement-receipt-v1',
  generatedAt: new Date().toISOString(), productionAccepted: false,
  provider: providerId, purpose, intendedModel: model,
  entitlementStatus: entitlement.available ? 'passed' : 'failed',
  exactSupportedModelIdentifier: entitlement.available ? entitlement.exactModelIdReturned : null,
  intendedModelAvailableToApiProject: entitlement.available,
  apiRouteUsed: entitlement.apiRouteUsed, requestTimestamp: entitlement.requestTimestamp,
  httpStatus: entitlement.httpStatus,
  ...(entitlement.providerRequestId ? { providerRequestId: entitlement.providerRequestId } : {}),
  requestCount: entitlement.requestCount, retryCount: entitlement.retryCount,
  redactionResult: entitlement.redaction,
  ...(entitlement.safeProviderError ? { safeProviderError: entitlement.safeProviderError } : {}),
  completeModelCatalogueRecorded: false, fallbackAttempted: false, modelSubstitutionAttempted: false,
  secretValueRecorded: false, secretHashRecorded: false, secretFingerprintRecorded: false,
  liveTransformationExecuted: false,
};

await mkdir(evidenceRoot, { recursive: true });
await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ provider: providerId, purpose, intendedModel: model, entitlementStatus: receipt.entitlementStatus, httpStatus: receipt.httpStatus, exactSupportedModelIdentifier: receipt.exactSupportedModelIdentifier, requestCount: receipt.requestCount, retryCount: receipt.retryCount, redactionResult: receipt.redactionResult, receipt: 'release-evidence/rc10.73.8/GATE_6B_LIVE_MODEL_ENTITLEMENT_RECEIPT.json', productionAccepted: false }, null, 2)}\n`);
if (!entitlement.available) process.exitCode = 2;
