import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LlmRuntimePolicy } from '@aiw/domain';
import { LlmGateway } from '../../apps/api/src/llmGateway.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const outputRoot = resolve(root, 'release-evidence', 'rc10.73.8', 'gate6b3');
const runtimePath = resolve(root, 'backend', 'config', 'llm-runtime-overrides.json');
const model = 'gpt-5.6-sol';
const purpose = 'governed-candidate-semantic-transformation';
const readJson = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const safe = (value: unknown) => String(value ?? '').replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED]').slice(0, 500);

async function main() {
  if (!process.argv.includes('--approved-exact-entitlement-check')) throw new Error('GATE6B3_ENTITLEMENT_APPROVAL_MISSING');
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('GATE6B3_OPENAI_SECRET_MISSING');
  const raw = await readJson(runtimePath); const tenant = raw?.tenants?.['gate-6b-local-smoke'] ?? raw;
  const current = tenant.routes?.find((item: any) => item.providerId === 'openai' && item.purpose === purpose);
  if (!current) throw new Error('GATE6B3_EXISTING_GOVERNED_OPENAI_ROUTE_MISSING');
  const generatedAt = new Date().toISOString();
  const policy: LlmRuntimePolicy = {
    ...tenant,
    routes: [{ ...current, id: 'gate6b3-gpt56-sol-entitlement-only', model, enabled: true, protocol: 'responses', fallbackRouteIds: [], dataClassificationAllowlist: ['public'] }],
    modelAllowlist: [{ providerId: 'openai', provider: 'openai', model, configuredAlias: model, requestedModel: model, resolvedModel: model, modelFamily: 'gpt-5.6-sol', allowedSnapshots: [model], modelIdentityDecision: 'pending-exact-entitlement-check', purposes: [purpose], verificationReference: 'GATE_6B_3_GPT56_SOL_ENTITLEMENT_RECEIPT.json', verificationTimestamp: generatedAt, verificationMethod: 'authenticated-exact-model-get-non-generation' }],
    allowFallback: false, maxRetries: 0, requireStructuredOutput: true, logPrompts: false, retainProviderContent: false,
  };
  const gateway = new LlmGateway(policy);
  let receipt: any;
  try {
    const result = await gateway.verifyExactModelEntitlement({ providerId: 'openai', purpose, model });
    receipt = { schemaVersion: 'aiw-gate-6b-3-gpt56-sol-entitlement-v1', generatedAt, productionAccepted: false, provider: 'openai', exactRequestedModel: model, apiRouteUsed: result.apiRouteUsed, requestTimestamp: result.requestTimestamp, httpStatus: result.httpStatus, providerRequestId: result.providerRequestId ?? null, exactModelIdReturned: result.exactModelIdReturned ?? null, entitled: result.available, responsesApiRequired: true, structuredOutputsRequired: true, fallbackUsed: false, providerCalls: 1, generationCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, redaction: result.redaction, safeProviderError: result.safeProviderError ?? null, credentialsRecorded: false, authenticationHeadersRecorded: false };
  } catch (error) {
    receipt = { schemaVersion: 'aiw-gate-6b-3-gpt56-sol-entitlement-v1', generatedAt, productionAccepted: false, provider: 'openai', exactRequestedModel: model, apiRouteUsed: `/v1/models/${model}`, requestTimestamp: generatedAt, httpStatus: null, providerRequestId: null, exactModelIdReturned: null, entitled: false, responsesApiRequired: true, structuredOutputsRequired: true, fallbackUsed: false, providerCalls: 1, generationCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, safeProviderError: { message: safe(error instanceof Error ? error.message : error) }, credentialsRecorded: false, authenticationHeadersRecorded: false };
  }
  await writeFile(resolve(outputRoot, 'GATE_6B_3_GPT56_SOL_ENTITLEMENT_RECEIPT.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ exactRequestedModel: model, entitled: receipt.entitled, httpStatus: receipt.httpStatus, exactModelIdReturned: receipt.exactModelIdReturned, providerCalls: 1, generationCalls: 0, productionAccepted: false }, null, 2)}\n`);
  if (!receipt.entitled) process.exitCode = 2;
}

main().catch((error) => { process.stderr.write(`${safe(error instanceof Error ? error.message : error)}\n`); process.exitCode = 1; });
