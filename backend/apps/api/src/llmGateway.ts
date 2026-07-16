import { createHash } from 'node:crypto';
import { doctrineSystemFor, DOCTRINE_VERSION } from './llmDoctrine.js';
import { redactForModel, type RedactionResult } from './dataRedaction.js';
import { verifyEvidenceEntailment, type EvidenceEntailmentSource, type EvidenceEntailmentReceipt } from './approvedKnowledgeGrounding.js';
import { validateJsonSchema, type JsonSchemaValidationResult } from './jsonSchemaValidation.js';
import {
  AIW_RELEASE,
  llmProviderCatalog,
  llmProviderIds,
  llmPurposes,
  type LlmApiProtocol,
  type LlmProviderDefinition,
  type LlmProviderId,
  type LlmModelAllowlistEntry,
  type LlmPurpose,
  type LlmRouteConfiguration,
  type LlmRuntimePolicy,
} from '@aiw/domain';

export interface LlmUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export type LlmModelIdentityValidationStatus = 'accepted-exact-request' | 'accepted-approved-alias-snapshot' | 'rejected';

export interface LlmProviderTransactionTelemetry {
  httpStatus?: number;
  providerRequestId?: string;
  requestedModel: string;
  providerReportedModel?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  elapsedDurationMs: number;
  retryCount: number;
  responseFingerprint?: string;
  schemaValidationStatus: 'not-run' | 'passed' | 'failed';
  identityValidationStatus: LlmModelIdentityValidationStatus | 'not-run';
  finalDisposition: 'accepted' | 'rejected-http' | 'rejected-invalid-json' | 'rejected-model-identity' | 'rejected-empty-response' | 'rejected-schema' | 'rejected-grounding' | 'rejected-other';
  semanticContentPersisted: false;
}

export interface LlmExecutionResult<T> {
  value: T;
  providerId: LlmProviderId;
  model: string;
  routeId: string;
  protocol: LlmApiProtocol;
  latencyMs: number;
  usage: LlmUsage;
  responseId?: string;
  httpStatus: number;
  providerReportedModel?: string;
  providerRequestId?: string;
  requestFingerprint: string;
  responseFingerprint: string;
  fallbackUsed: boolean;
  schemaValidation: JsonSchemaValidationResult;
  redaction: { system: RedactionResult; user: RedactionResult };
  groundingReceipt?: EvidenceEntailmentReceipt;
  transactionTelemetry: LlmProviderTransactionTelemetry;
}

export interface JsonGenerationRequest {
  purpose: LlmPurpose;
  system: string;
  user: string;
  schemaName: string;
  jsonSchema?: Record<string, unknown>;
  dataClassification?: 'public'|'internal'|'confidential'|'restricted';
  allowInsufficientGrounding?: boolean;
  requireEvidenceAllowlist?: boolean;
  requireProviderNativeSchema?: boolean;
  grounding?: {
    allowedReferenceIds: string[];
    sources: EvidenceEntailmentSource[];
    requireCitations?: boolean;
    minimumSupportScore?: number;
    precisionMode?: boolean;
  };
}

interface CircuitState { failures: number; openedAt?: number; }

export interface LlmDeadLetterRecord {
  id: string;
  createdAt: string;
  purpose: LlmPurpose;
  schemaName: string;
  requestFingerprint: string;
  attempts: number;
  errors: string[];
  providerTransactions: LlmProviderTransactionTelemetry[];
  containsPromptContent: false;
  productionAccepted: false;
}

export interface LlmGatewayOptions {
  deadLetterSink?: (record: LlmDeadLetterRecord) => void | Promise<void>;
}

export interface LlmModelEntitlementReceipt {
  providerId: LlmProviderId;
  purpose: LlmPurpose;
  model: string;
  apiRouteUsed: string;
  requestTimestamp: string;
  httpStatus: number;
  providerRequestId?: string;
  exactModelIdReturned?: string;
  available: boolean;
  requestCount: 1;
  retryCount: 0;
  redaction: { secretMaterialIncluded: false; safeErrorRedactions: number };
  safeProviderError?: { code?: string; type?: string; message: string };
}

const circuits = new Map<string, CircuitState>();

class LlmProviderTransactionRejectedError extends Error {
  constructor(message: string, readonly transactionTelemetry: LlmProviderTransactionTelemetry) {
    super(message);
    this.name = 'LlmProviderTransactionRejectedError';
  }
}

function containsPatternSyntax(value: string): boolean {
  return /[*?\[\]{}()|^$\\]/.test(value);
}

function envKeyForPurpose(purpose: LlmPurpose): string {
  return purpose.toUpperCase().replace(/-/g, '_');
}

function providerDefinition(id: LlmProviderId): LlmProviderDefinition {
  const provider = llmProviderCatalog.find((item) => item.id === id);
  if (!provider) throw new Error(`UNKNOWN_LLM_PROVIDER:${id}`);
  return provider;
}

function asProvider(value: string | undefined, fallback: LlmProviderId): LlmProviderId {
  return llmProviderIds.includes(value as LlmProviderId) ? value as LlmProviderId : fallback;
}

function asProtocol(value: string | undefined, provider: LlmProviderDefinition): LlmApiProtocol {
  const candidate = value as LlmApiProtocol | undefined;
  if (candidate && provider.protocols.includes(candidate)) return candidate;
  if (provider.protocols.includes('responses')) return 'responses';
  return provider.protocols[0] ?? 'chat-completions';
}

function defaultModel(providerId: LlmProviderId): string {
  const names: Record<LlmProviderId, string> = {
    openai: process.env.OPENAI_MODEL || 'gpt-5.6-sol',
    xai: process.env.XAI_MODEL || 'grok-3-mini',
    gemini: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    qwen: process.env.QWEN_MODEL || 'qwen-plus',
    deepseek: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    'custom-openai': process.env.AIW_CUSTOM_LLM_MODEL || 'configured-model',
    'local-openai': process.env.AIW_LOCAL_LLM_MODEL || 'local-model',
  };
  return names[providerId];
}

function routeFromEnvironment(purpose: LlmPurpose): LlmRouteConfiguration {
  const suffix = envKeyForPurpose(purpose);
  const defaultProvider = purpose === 'embedding' ? asProvider(process.env.AIW_EMBEDDING_PROVIDER, 'openai') : asProvider(process.env.AIW_LLM_PROVIDER, 'openai');
  const providerId = asProvider(process.env[`AIW_LLM_${suffix}_PROVIDER`] || (purpose === 'embedding' ? process.env.AIW_EMBEDDING_PROVIDER : undefined), defaultProvider);
  const provider = providerDefinition(providerId);
  const baseUrl = process.env[`AIW_LLM_${suffix}_BASE_URL`]
    || process.env[`AIW_LLM_${providerId.toUpperCase().replace(/-/g, '_')}_BASE_URL`]
    || (providerId === 'qwen' ? process.env.AIW_LLM_QWEN_BASE_URL : undefined)
    || (providerId === 'custom-openai' ? process.env.AIW_CUSTOM_LLM_BASE_URL : undefined)
    || (providerId === 'local-openai' ? process.env.AIW_LOCAL_LLM_BASE_URL : undefined)
    || provider.defaultBaseUrl;
  const model = process.env[`AIW_LLM_${suffix}_MODEL`]
    || (purpose === 'knowledge-extraction' ? process.env.AIW_KNOWLEDGE_MODEL : undefined)
    || (purpose === 'embedding' ? process.env.AIW_EMBEDDING_MODEL : undefined)
    || process.env.AIW_LLM_MODEL
    || defaultModel(providerId);
  return {
    id: `${purpose}:${providerId}:${model}`,
    purpose,
    providerId,
    model,
    ...(baseUrl ? { baseUrl } : {}),
    apiKeyEnvironmentVariable: process.env[`AIW_LLM_${suffix}_API_KEY_ENV`] || provider.apiKeyEnvironmentVariable,
    protocol: purpose === 'embedding' ? 'embeddings' : asProtocol(process.env[`AIW_LLM_${suffix}_PROTOCOL`] || process.env.AIW_LLM_PROTOCOL, provider),
    timeoutMs: Number(process.env[`AIW_LLM_${suffix}_TIMEOUT_MS`] || process.env.AIW_LLM_TIMEOUT_MS || 120_000),
    maxOutputTokens: Number(process.env[`AIW_LLM_${suffix}_MAX_OUTPUT_TOKENS`] || 12_000),
    temperature: Number(process.env[`AIW_LLM_${suffix}_TEMPERATURE`] || 0),
    enabled: process.env[`AIW_LLM_${suffix}_ENABLED`] !== 'false',
    fallbackRouteIds: [],
    dataClassificationAllowlist: ['public','internal','confidential'],
  };
}

function modelAllowlistFromEnvironment(): LlmModelAllowlistEntry[] {
  const raw = process.env.AIW_LLM_MODEL_ALLOWLIST?.trim();
  if (!raw) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error('AIW_LLM_MODEL_ALLOWLIST_INVALID_JSON'); }
  if (!Array.isArray(parsed)) throw new Error('AIW_LLM_MODEL_ALLOWLIST_MUST_BE_ARRAY');
  return parsed as LlmModelAllowlistEntry[];
}

export function validateLlmRuntimePolicy(policy: LlmRuntimePolicy): LlmRuntimePolicy {
  const normalized: LlmRuntimePolicy = {
    ...policy,
    modelAllowlist: [...(policy.modelAllowlist ?? [])],
    maxInputCharacters: policy.maxInputCharacters ?? 32_768,
  };
  if (!Number.isInteger(normalized.maxInputCharacters) || normalized.maxInputCharacters! < 1_024 || normalized.maxInputCharacters! > 262_144) throw new Error('LLM_MAX_INPUT_CHARACTERS_OUT_OF_RANGE');
  if (!Number.isInteger(normalized.maxRetries) || normalized.maxRetries < 0 || normalized.maxRetries > 2) throw new Error('LLM_MAX_RETRIES_OUT_OF_RANGE');
  if (!normalized.requireStructuredOutput) throw new Error('LLM_STRUCTURED_OUTPUT_REQUIRED');
  if (!normalized.redactSecrets || normalized.logPrompts || normalized.retainProviderContent) throw new Error('UNSAFE_LLM_CONTENT_POLICY');
  const allowedModels = new Set<string>();
  for (const entry of normalized.modelAllowlist ?? []) {
    if (!llmProviderIds.includes(entry.providerId)) throw new Error(`INVALID_LLM_MODEL_ALLOWLIST_PROVIDER:${entry.providerId}`);
    if (!entry.model?.trim()) throw new Error(`INVALID_LLM_MODEL_ALLOWLIST_MODEL:${entry.providerId}`);
    if (entry.provider && entry.provider !== entry.providerId) throw new Error(`LLM_MODEL_IDENTITY_PROVIDER_MISMATCH:${entry.providerId}:${entry.provider}`);
    const identityValues = [entry.model, entry.configuredAlias, entry.requestedModel, entry.resolvedModel, entry.modelFamily, ...(entry.allowedSnapshots ?? [])].filter((value): value is string => Boolean(value));
    if (identityValues.some(containsPatternSyntax)) throw new Error(`LLM_MODEL_IDENTITY_PATTERN_PROHIBITED:${entry.providerId}:${entry.model}`);
    if (!entry.verificationReference?.trim()) throw new Error(`LLM_MODEL_ALLOWLIST_VERIFICATION_REQUIRED:${entry.providerId}:${entry.model}`);
    if (entry.purposes?.some((purpose) => !llmPurposes.includes(purpose))) throw new Error(`INVALID_LLM_MODEL_ALLOWLIST_PURPOSE:${entry.providerId}:${entry.model}`);
    if (entry.purposes?.includes('governed-candidate-semantic-transformation')) {
      if (!entry.verificationTimestamp || !Number.isFinite(Date.parse(entry.verificationTimestamp))) throw new Error(`LLM_MODEL_ALLOWLIST_VERIFICATION_TIMESTAMP_REQUIRED:${entry.providerId}:${entry.model}`);
      if (!entry.verificationMethod?.trim()) throw new Error(`LLM_MODEL_ALLOWLIST_VERIFICATION_METHOD_REQUIRED:${entry.providerId}:${entry.model}`);
      if (!entry.provider || !entry.configuredAlias?.trim() || !entry.requestedModel?.trim() || !entry.resolvedModel?.trim()
        || !entry.modelFamily?.trim() || !entry.allowedSnapshots?.length || !entry.modelIdentityDecision) {
        throw new Error(`LLM_MODEL_IDENTITY_CONTRACT_REQUIRED:${entry.providerId}:${entry.model}`);
      }
      if (entry.model !== entry.requestedModel) throw new Error(`LLM_ROUTE_MODEL_IDENTITY_MISMATCH:${entry.providerId}:${entry.model}:${entry.requestedModel}`);
      if (new Set(entry.allowedSnapshots).size !== entry.allowedSnapshots.length) throw new Error(`LLM_MODEL_SNAPSHOT_DUPLICATE:${entry.providerId}:${entry.model}`);
      if (entry.modelIdentityDecision === 'exact-snapshot-pinned' && (entry.requestedModel !== entry.resolvedModel || !entry.allowedSnapshots.includes(entry.resolvedModel))) {
        throw new Error(`LLM_EXACT_SNAPSHOT_PIN_INVALID:${entry.providerId}:${entry.model}`);
      }
      if (entry.modelIdentityDecision === 'approved-alias-explicit-snapshot' && entry.requestedModel !== entry.configuredAlias) {
        throw new Error(`LLM_APPROVED_ALIAS_REQUEST_MISMATCH:${entry.providerId}:${entry.model}`);
      }
    }
    const key = `${entry.providerId}\n${entry.model}\n${[...(entry.purposes ?? [])].sort().join(',')}`;
    if (allowedModels.has(key)) throw new Error(`DUPLICATE_LLM_MODEL_ALLOWLIST_ENTRY:${entry.providerId}:${entry.model}`);
    allowedModels.add(key);
  }
  const ids = new Set<string>();
  for (const route of normalized.routes) {
    if (ids.has(route.id)) throw new Error(`DUPLICATE_LLM_ROUTE:${route.id}`);
    ids.add(route.id);
    if (!llmPurposes.includes(route.purpose)) throw new Error(`INVALID_LLM_PURPOSE:${route.purpose}`);
    if (!llmProviderIds.includes(route.providerId)) throw new Error(`INVALID_LLM_PROVIDER:${route.providerId}`);
    if (!route.model.trim()) throw new Error(`LLM_MODEL_REQUIRED:${route.id}`);
    if (route.purpose === 'governed-candidate-semantic-transformation' && route.fallbackRouteIds.length) throw new Error(`LLM_GOVERNED_TRANSFORMATION_FALLBACK_PROHIBITED:${route.id}`);
    const provider = providerDefinition(route.providerId);
    const protocol = route.protocol ?? provider.protocols[0];
    if (!protocol || !provider.protocols.includes(protocol)) throw new Error(`UNSUPPORTED_LLM_PROTOCOL:${route.id}:${protocol}`);
    if (!route.baseUrl && !provider.defaultBaseUrl) throw new Error(`LLM_BASE_URL_REQUIRED:${route.id}`);
  }
  return normalized;
}

export function loadLlmRuntimePolicy(): LlmRuntimePolicy {
  if (process.env.AIW_LLM_CONFIG_JSON) {
    const parsed = JSON.parse(process.env.AIW_LLM_CONFIG_JSON) as LlmRuntimePolicy;
    return validateLlmRuntimePolicy(parsed);
  }
  const routes = llmPurposes.map(routeFromEnvironment);
  return validateLlmRuntimePolicy({
    routes,
    modelAllowlist: modelAllowlistFromEnvironment(),
    maxInputCharacters: Number(process.env.AIW_LLM_MAX_INPUT_CHARACTERS || 32_768),
    allowFallback: process.env.AIW_LLM_ALLOW_FALLBACK !== 'false',
    requireStructuredOutput: process.env.AIW_LLM_REQUIRE_STRUCTURED_OUTPUT !== 'false',
    redactSecrets: true,
    logPrompts: false,
    retainProviderContent: false,
    maxRetries: Number(process.env.AIW_LLM_MAX_RETRIES || 1),
    circuitBreakerFailures: Number(process.env.AIW_LLM_CIRCUIT_FAILURES || 3),
    circuitBreakerResetSeconds: Number(process.env.AIW_LLM_CIRCUIT_RESET_SECONDS || 120),
  });
}

function contentText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(contentText).join('');
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.text === 'string') return record.text;
    if (typeof record.content === 'string') return record.content;
    if (Array.isArray(record.content)) return contentText(record.content);
  }
  return '';
}

function parseJsonContent(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(trimmed); }
  catch {
    const start = Math.min(...['{','['].map((marker) => { const index = trimmed.indexOf(marker); return index < 0 ? Number.MAX_SAFE_INTEGER : index; }));
    const end = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'));
    if (start !== Number.MAX_SAFE_INTEGER && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error('LLM_RESPONSE_NOT_JSON');
  }
}

function baseUrl(route: LlmRouteConfiguration): string {
  const provider = providerDefinition(route.providerId);
  const value = route.baseUrl || provider.defaultBaseUrl;
  if (!value) throw new Error(`LLM_BASE_URL_REQUIRED:${route.id}`);
  return value.replace(/\/$/, '');
}

function apiKey(route: LlmRouteConfiguration): string {
  if (route.providerId === 'local-openai' && !process.env[route.apiKeyEnvironmentVariable || 'AIW_LOCAL_LLM_API_KEY']) return 'local-no-key';
  const name = route.apiKeyEnvironmentVariable || providerDefinition(route.providerId).apiKeyEnvironmentVariable;
  const value = process.env[name];
  if (!value) throw new Error(`LLM_API_KEY_NOT_CONFIGURED:${route.providerId}:${name}`);
  return value;
}

function circuitAllows(route: LlmRouteConfiguration, policy: LlmRuntimePolicy): boolean {
  const state = circuits.get(route.id);
  if (!state?.openedAt) return true;
  if (Date.now() - state.openedAt >= policy.circuitBreakerResetSeconds * 1000) {
    circuits.delete(route.id);
    return true;
  }
  return false;
}

function markSuccess(routeId: string): void { circuits.delete(routeId); }
function markFailure(routeId: string, policy: LlmRuntimePolicy): void {
  const state = circuits.get(routeId) ?? { failures: 0 };
  state.failures += 1;
  if (state.failures >= policy.circuitBreakerFailures) state.openedAt = Date.now();
  circuits.set(routeId, state);
}


function insufficientGroundingSchema(): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['insufficientGrounding', 'missing'],
    properties: {
      insufficientGrounding: { type: 'boolean', const: true },
      missing: { type: 'string', minLength: 1, maxLength: 2000 },
    },
  };
}

function effectiveSchema(request: JsonGenerationRequest): Record<string, unknown> | undefined {
  if (!request.jsonSchema) return undefined;
  return request.allowInsufficientGrounding === false
    ? request.jsonSchema
    : { anyOf: [request.jsonSchema, insufficientGroundingSchema()] };
}

function isInsufficientGrounding(value: unknown): value is { insufficientGrounding: true; missing: string } {
  return Boolean(value && typeof value === 'object'
    && (value as Record<string, unknown>).insufficientGrounding === true
    && typeof (value as Record<string, unknown>).missing === 'string');
}

function collectCitationIds(value: unknown, key = ''): string[] {
  const citationKey = /(?:citedRecordIds?|kbRefs?|claimIds?|evidenceRefs?|sourceRefs?|evidenceRecordIds?)$/i;
  if (typeof value === 'string' && citationKey.test(key)) return [value];
  if (Array.isArray(value)) {
    if (citationKey.test(key)) return value.filter((item): item is string => typeof item === 'string');
    return value.flatMap((item) => collectCitationIds(item, key));
  }
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([childKey, child]) => collectCitationIds(child, childKey));
}

function flattenOutputText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(flattenOutputText).join(' ');
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).map(flattenOutputText).join(' ');
  return '';
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function requestFingerprint(request: JsonGenerationRequest): string {
  return sha256(canonicalJson({
    doctrineVersion: DOCTRINE_VERSION,
    purpose: request.purpose,
    system: request.system,
    user: request.user,
    schemaName: request.schemaName,
    jsonSchema: request.jsonSchema ?? null,
    dataClassification: request.dataClassification ?? 'internal',
    allowedReferenceIds: [...(request.grounding?.allowedReferenceIds ?? [])].sort(),
    sourceIdentities: (request.grounding?.sources ?? []).map((source) => ({ id: source.id, sourceReleaseId: source.sourceReleaseId, statementFingerprint: sha256(source.statement) })).sort((left, right) => left.id.localeCompare(right.id)),
  }));
}

function responseFingerprint(value: unknown): string {
  return sha256(canonicalJson(value));
}

function modelAllowlistEntry(policy: LlmRuntimePolicy, route: LlmRouteConfiguration): LlmModelAllowlistEntry | undefined {
  return (policy.modelAllowlist ?? []).find((entry) => entry.providerId === route.providerId
    && entry.model === route.model
    && (!entry.purposes?.length || entry.purposes.includes(route.purpose)));
}

function modelAllowed(policy: LlmRuntimePolicy, route: LlmRouteConfiguration): boolean {
  return Boolean(modelAllowlistEntry(policy, route));
}

export function validateResolvedModelIdentity(input: {
  entry: LlmModelAllowlistEntry;
  requestedModel: string;
  providerReportedModel?: string;
}): LlmModelIdentityValidationStatus {
  const { entry, requestedModel, providerReportedModel } = input;
  if (!providerReportedModel || requestedModel !== (entry.requestedModel ?? entry.model)) return 'rejected';
  if (providerReportedModel === requestedModel && entry.model === requestedModel) return 'accepted-exact-request';
  if (entry.configuredAlias === requestedModel
    && entry.modelIdentityDecision === 'approved-alias-explicit-snapshot'
    && (entry.allowedSnapshots ?? []).includes(providerReportedModel)) return 'accepted-approved-alias-snapshot';
  return 'rejected';
}

async function invokeRoute<T>(route: LlmRouteConfiguration, request: JsonGenerationRequest, policy: LlmRuntimePolicy, fetchImpl: typeof fetch): Promise<LlmExecutionResult<T>> {
  if (!route.enabled) throw new Error(`LLM_ROUTE_DISABLED:${route.id}`);
  const allowlistEntry = modelAllowlistEntry(policy, route);
  if (!allowlistEntry) throw new Error(`LLM_MODEL_NOT_ALLOWLISTED:${route.providerId}:${route.model}:${route.purpose}`);
  const classification = request.dataClassification ?? 'internal';
  if (!route.dataClassificationAllowlist.includes(classification)) throw new Error(`LLM_DATA_CLASSIFICATION_BLOCKED:${route.id}:${classification}`);
  if (!circuitAllows(route, policy)) throw new Error(`LLM_CIRCUIT_OPEN:${route.id}`);
  const provider = providerDefinition(route.providerId);
  if (policy.requireStructuredOutput && !request.jsonSchema) throw new Error(`LLM_JSON_SCHEMA_REQUIRED:${request.schemaName}`);
  if (request.requireProviderNativeSchema && !provider.supportsJsonSchema) throw new Error(`LLM_PROVIDER_NATIVE_SCHEMA_REQUIRED:${route.providerId}`);
  if (request.system.length + request.user.length > (policy.maxInputCharacters ?? 32_768)) throw new Error(`LLM_INPUT_TOO_LARGE:${request.system.length + request.user.length}:${policy.maxInputCharacters ?? 32_768}`);
  if (request.requireEvidenceAllowlist && !request.grounding) throw new Error('LLM_EVIDENCE_ALLOWLIST_REQUIRED');
  if (request.grounding) {
    const allowed = new Set(request.grounding.allowedReferenceIds);
    const sourceIds = new Set(request.grounding.sources.map((source) => source.id));
    const missingSources = [...allowed].filter((id) => !sourceIds.has(id));
    const outsideAllowlist = [...sourceIds].filter((id) => !allowed.has(id));
    if (missingSources.length || outsideAllowlist.length) throw new Error(`LLM_GROUNDING_LINEAGE_MISMATCH:missing=${missingSources.join(',')}:outside=${outsideAllowlist.join(',')}`);
  }
  const protocol = route.protocol ?? provider.protocols[0] ?? 'chat-completions';
  const started = Date.now();
  const url = `${baseUrl(route)}/${protocol === 'responses' ? 'responses' : 'chat/completions'}`;
  const systemRedaction = redactForModel(request.system, classification);
  const userRedaction = redactForModel(request.user, classification);
  const redactedRequest: JsonGenerationRequest = { ...request, system: systemRedaction.value, user: userRedaction.value };
  const schema = effectiveSchema(redactedRequest);
  const messages = [{ role: 'system', content: doctrineSystemFor(redactedRequest.purpose, redactedRequest.system) }, { role: 'user', content: redactedRequest.user }];
  const body: Record<string, unknown> = protocol === 'responses'
    ? {
      model: route.model,
      input: messages,
      max_output_tokens: route.maxOutputTokens,
      ...(provider.supportsJsonSchema && schema ? { text: { format: { type: 'json_schema', name: request.schemaName, schema, strict: true } } } : {}),
    }
    : {
      model: route.model,
      messages,
      temperature: route.temperature,
      max_tokens: route.maxOutputTokens,
      ...(schema && provider.supportsJsonSchema ? { response_format: { type: 'json_schema', json_schema: { name: request.schemaName, schema, strict: true } } } : { response_format: { type: 'json_object' } }),
    };
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey(route)}`, 'content-type': 'application/json', accept: 'application/json', 'user-agent': `AIW-LLM-Gateway/${AIW_RELEASE.version}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(Math.max(1_000, route.timeoutMs ?? 120_000)),
  });
  const text = await response.text();
  const providerRequestId = response.headers.get('x-request-id') ?? response.headers.get('openai-request-id') ?? undefined;
  const telemetry: LlmProviderTransactionTelemetry = {
    httpStatus: response.status,
    ...(providerRequestId ? { providerRequestId } : {}),
    requestedModel: route.model,
    elapsedDurationMs: Date.now() - started,
    retryCount: 0,
    responseFingerprint: sha256(text),
    schemaValidationStatus: 'not-run',
    identityValidationStatus: 'not-run',
    finalDisposition: 'rejected-other',
    semanticContentPersisted: false,
  };
  let payload: any;
  try { payload = text ? JSON.parse(text) : {}; }
  catch {
    telemetry.finalDisposition = 'rejected-invalid-json';
    throw new LlmProviderTransactionRejectedError(`LLM_PROVIDER_INVALID_JSON:${route.providerId}:${response.status}`, telemetry);
  }
  const providerReportedModel = typeof payload.model === 'string' ? payload.model : undefined;
  if (providerReportedModel) telemetry.providerReportedModel = providerReportedModel;
  const usage = protocol === 'responses'
    ? { inputTokens: payload.usage?.input_tokens, outputTokens: payload.usage?.output_tokens, totalTokens: payload.usage?.total_tokens }
    : { inputTokens: payload.usage?.prompt_tokens, outputTokens: payload.usage?.completion_tokens, totalTokens: payload.usage?.total_tokens };
  if (Number.isFinite(usage.inputTokens)) telemetry.inputTokens = usage.inputTokens;
  if (Number.isFinite(usage.outputTokens)) telemetry.outputTokens = usage.outputTokens;
  if (Number.isFinite(usage.totalTokens)) telemetry.totalTokens = usage.totalTokens;
  if (!response.ok) {
    telemetry.finalDisposition = 'rejected-http';
    const providerMessage = redactForModel(String(payload?.error?.message ?? payload?.message ?? 'request failed'), 'internal').value.slice(0, 300);
    throw new LlmProviderTransactionRejectedError(`LLM_PROVIDER_${route.providerId}_${response.status}:${providerMessage}`, telemetry);
  }
  telemetry.identityValidationStatus = route.purpose === 'governed-candidate-semantic-transformation'
    ? validateResolvedModelIdentity({ entry: allowlistEntry, requestedModel: route.model, providerReportedModel })
    : (!providerReportedModel || providerReportedModel === route.model ? 'accepted-exact-request' : 'rejected');
  if (telemetry.identityValidationStatus === 'rejected') {
    telemetry.finalDisposition = 'rejected-model-identity';
    throw new LlmProviderTransactionRejectedError(`LLM_PROVIDER_MODEL_IDENTITY_REJECTED:${route.model}:${providerReportedModel ?? 'missing'}`, telemetry);
  }
  const outputText = protocol === 'responses'
    ? (typeof payload.output_text === 'string' ? payload.output_text : contentText(payload.output))
    : contentText(payload.choices?.[0]?.message?.content);
  if (!outputText) {
    telemetry.finalDisposition = 'rejected-empty-response';
    throw new LlmProviderTransactionRejectedError(`LLM_PROVIDER_EMPTY_RESPONSE:${route.providerId}`, telemetry);
  }
  let value: T;
  try { value = parseJsonContent(outputText) as T; }
  catch (error) {
    telemetry.schemaValidationStatus = 'failed';
    telemetry.finalDisposition = 'rejected-schema';
    throw new LlmProviderTransactionRejectedError(error instanceof Error ? error.message : 'LLM_RESPONSE_NOT_JSON', telemetry);
  }
  if (isInsufficientGrounding(value)) {
    telemetry.finalDisposition = 'rejected-grounding';
    throw new LlmProviderTransactionRejectedError(`LLM_INSUFFICIENT_GROUNDING:${value.missing}`, telemetry);
  }
  const schemaValidation = request.jsonSchema ? validateJsonSchema(value, request.jsonSchema) : { valid: true, violations: [] };
  if (!schemaValidation.valid) {
    telemetry.schemaValidationStatus = 'failed';
    telemetry.finalDisposition = 'rejected-schema';
    const detail = schemaValidation.violations.slice(0, 8).map((item) => `${item.path}:${item.rule}`).join(',');
    throw new LlmProviderTransactionRejectedError(`LLM_RESPONSE_SCHEMA_INVALID:${request.schemaName}:${detail}`, telemetry);
  }
  telemetry.schemaValidationStatus = 'passed';
  let groundingReceipt: EvidenceEntailmentReceipt | undefined;
  if (request.grounding) {
    const citedReferenceIds = [...new Set(collectCitationIds(value))];
    const allowlist = new Set(request.grounding.allowedReferenceIds);
    const outsideAllowlist = citedReferenceIds.filter((id) => !allowlist.has(id));
    if (outsideAllowlist.length) {
      telemetry.finalDisposition = 'rejected-grounding';
      throw new LlmProviderTransactionRejectedError(`LLM_CITATION_OUTSIDE_ALLOWLIST:${outsideAllowlist.join(',')}`, telemetry);
    }
    if (request.grounding.requireCitations && !citedReferenceIds.length) {
      telemetry.finalDisposition = 'rejected-grounding';
      throw new LlmProviderTransactionRejectedError('LLM_GROUNDED_CITATION_REQUIRED', telemetry);
    }
    groundingReceipt = verifyEvidenceEntailment({
      outputText: flattenOutputText(value),
      citedReferenceIds,
      sources: request.grounding.sources,
      ...(request.grounding.minimumSupportScore !== undefined ? { threshold: request.grounding.minimumSupportScore } : {}),
      ...(request.grounding.precisionMode !== undefined ? { precisionMode: request.grounding.precisionMode } : {}),
    });
    if (!groundingReceipt.verified) {
      telemetry.finalDisposition = 'rejected-grounding';
      throw new LlmProviderTransactionRejectedError(`LLM_EVIDENCE_ENTAILMENT_FAILED:${groundingReceipt.unsupportedReferenceIds.join(',')}`, telemetry);
    }
  }
  telemetry.finalDisposition = 'accepted';
  markSuccess(route.id);
  return {
    value,
    providerId: route.providerId,
    model: route.model,
    routeId: route.id,
    protocol,
    latencyMs: Date.now() - started,
    usage,
    ...(typeof payload.id === 'string' ? { responseId: payload.id } : {}),
    httpStatus: response.status,
    ...(providerReportedModel ? { providerReportedModel } : {}),
    ...(providerRequestId ? { providerRequestId } : {}),
    requestFingerprint: requestFingerprint(redactedRequest),
    responseFingerprint: responseFingerprint(value),
    fallbackUsed: false,
    schemaValidation,
    redaction: { system: systemRedaction, user: userRedaction },
    ...(groundingReceipt ? { groundingReceipt } : {}),
    transactionTelemetry: telemetry,
  };
}

function orderedRoutes(policy: LlmRuntimePolicy, purpose: LlmPurpose): LlmRouteConfiguration[] {
  const primary = policy.routes.filter((route) => route.purpose === purpose && route.enabled);
  if (!primary.length) throw new Error(`NO_LLM_ROUTE_CONFIGURED:${purpose}`);
  const byId = new Map(policy.routes.map((route) => [route.id, route]));
  const result: LlmRouteConfiguration[] = [];
  for (const route of primary) {
    if (!result.some((item) => item.id === route.id)) result.push(route);
    if (policy.allowFallback && purpose !== 'governed-candidate-semantic-transformation') for (const id of route.fallbackRouteIds) {
      const fallback = byId.get(id);
      if (fallback?.enabled && !result.some((item) => item.id === fallback.id)) result.push(fallback);
    }
  }
  return result;
}

export class LlmGateway {
  private readonly policy: LlmRuntimePolicy;
  private readonly fetchImpl: typeof fetch;
  private readonly options: LlmGatewayOptions;
  private readonly deadLetterRecords: LlmDeadLetterRecord[] = [];
  private readonly transactionTelemetryRecords: LlmProviderTransactionTelemetry[] = [];

  constructor(policy: LlmRuntimePolicy = loadLlmRuntimePolicy(), fetchImpl: typeof fetch = fetch, options: LlmGatewayOptions = {}) {
    this.policy = validateLlmRuntimePolicy(policy);
    this.fetchImpl = fetchImpl;
    this.options = options;
  }

  deadLetters(): LlmDeadLetterRecord[] { return structuredClone(this.deadLetterRecords); }
  transactions(): LlmProviderTransactionTelemetry[] { return structuredClone(this.transactionTelemetryRecords); }

  async verifyExactModelEntitlement(input: { providerId: LlmProviderId; purpose: LlmPurpose; model: string }): Promise<LlmModelEntitlementReceipt> {
    const route = this.policy.routes.find((item) => item.enabled && item.providerId === input.providerId && item.purpose === input.purpose && item.model === input.model);
    if (!route) throw new Error(`LLM_ENTITLEMENT_ROUTE_NOT_CONFIGURED:${input.providerId}:${input.model}:${input.purpose}`);
    const requestTimestamp = new Date().toISOString();
    const apiRouteUsed = `/v1/models/${encodeURIComponent(input.model)}`;
    const response = await this.fetchImpl(`${baseUrl(route)}/models/${encodeURIComponent(input.model)}`, {
      method: 'GET',
      headers: { authorization: `Bearer ${apiKey(route)}`, accept: 'application/json', 'user-agent': `AIW-LLM-Gateway/${AIW_RELEASE.version}` },
      signal: AbortSignal.timeout(Math.max(1_000, route.timeoutMs ?? 30_000)),
    });
    const providerRequestId = response.headers.get('x-request-id') ?? response.headers.get('openai-request-id') ?? undefined;
    const text = await response.text();
    let payload: Record<string, any> = {};
    try { payload = text ? JSON.parse(text) as Record<string, any> : {}; } catch { payload = {}; }
    const exactModelIdReturned = typeof payload.id === 'string' ? payload.id : undefined;
    const available = response.ok && exactModelIdReturned === input.model;
    const rawError = String(payload.error?.message ?? payload.message ?? (available ? '' : 'model entitlement check failed'));
    const redactedError = redactForModel(rawError, 'internal');
    return {
      providerId: input.providerId, purpose: input.purpose, model: input.model, apiRouteUsed, requestTimestamp,
      httpStatus: response.status, ...(providerRequestId ? { providerRequestId } : {}),
      ...(exactModelIdReturned ? { exactModelIdReturned } : {}), available, requestCount: 1, retryCount: 0,
      redaction: { secretMaterialIncluded: false, safeErrorRedactions: redactedError.findings.length },
      ...(!available ? { safeProviderError: {
        ...(typeof payload.error?.code === 'string' ? { code: payload.error.code.slice(0, 120) } : {}),
        ...(typeof payload.error?.type === 'string' ? { type: payload.error.type.slice(0, 120) } : {}),
        message: redactedError.value.slice(0, 500),
      } } : {}),
    };
  }

  configuration(): { policy: LlmRuntimePolicy; providers: Array<LlmProviderDefinition & { configured: boolean; routes: string[] }> } {
    return {
      policy: { ...this.policy, routes: this.policy.routes.map((route) => ({ ...route, apiKeyEnvironmentVariable: route.apiKeyEnvironmentVariable || providerDefinition(route.providerId).apiKeyEnvironmentVariable })) },
      providers: llmProviderCatalog.map((provider) => ({
        ...provider,
        configured: this.policy.routes.some((route) => route.providerId === provider.id
          && route.enabled
          && modelAllowed(this.policy, route)
          && (provider.id === 'local-openai' || Boolean(process.env[route.apiKeyEnvironmentVariable || provider.apiKeyEnvironmentVariable]))),
        routes: this.policy.routes.filter((route) => route.providerId === provider.id).map((route) => route.id),
      })),
    };
  }

  async generateJson<T>(request: JsonGenerationRequest): Promise<LlmExecutionResult<T>> {
    const errors: string[] = [];
    const providerTransactions: LlmProviderTransactionTelemetry[] = [];
    let totalAttempts = 0;
    const routes = orderedRoutes(this.policy, request.purpose);
    for (let index = 0; index < routes.length; index += 1) {
      const route = routes[index]!;
      const attempts = Math.max(1, this.policy.maxRetries + 1);
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        totalAttempts += 1;
        try {
          const result = await invokeRoute<T>(route, request, this.policy, this.fetchImpl);
          this.transactionTelemetryRecords.push(structuredClone(result.transactionTelemetry));
          return index === 0 ? result : { ...result, fallbackUsed: true };
        } catch (error) {
          if (error instanceof LlmProviderTransactionRejectedError) {
            error.transactionTelemetry.retryCount = attempt;
            providerTransactions.push(structuredClone(error.transactionTelemetry));
            this.transactionTelemetryRecords.push(structuredClone(error.transactionTelemetry));
          }
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`${route.id}:${redactForModel(message, 'internal').value.slice(0, 500)}`);
          markFailure(route.id, this.policy);
          if (message.includes('DATA_CLASSIFICATION_BLOCKED') || message.includes('API_KEY_NOT_CONFIGURED') || message.includes('ROUTE_DISABLED') || message.includes('MODEL_NOT_ALLOWLISTED') || message.includes('MODEL_IDENTITY_REJECTED') || message.includes('INPUT_TOO_LARGE') || message.includes('EVIDENCE_ALLOWLIST_REQUIRED') || message.includes('GROUNDING_LINEAGE_MISMATCH') || message.includes('PROVIDER_NATIVE_SCHEMA_REQUIRED') || message.includes('INSUFFICIENT_GROUNDING') || message.includes('SCHEMA_INVALID') || message.includes('JSON_SCHEMA_REQUIRED') || message.includes('CITATION_OUTSIDE_ALLOWLIST') || message.includes('EVIDENCE_ENTAILMENT_FAILED') || message.includes('GROUNDED_CITATION_REQUIRED')) break;
        }
      }
    }
    const classification = request.dataClassification ?? 'internal';
    const safeRequest = { ...request, system: redactForModel(request.system, classification).value, user: redactForModel(request.user, classification).value };
    const deadLetter: LlmDeadLetterRecord = {
      id: `LLM-DLQ-${createHash('sha256').update(`${requestFingerprint(safeRequest)}\n${errors.join('\n')}`).digest('hex').slice(0, 24)}`,
      createdAt: new Date().toISOString(), purpose: request.purpose, schemaName: request.schemaName,
      requestFingerprint: requestFingerprint(safeRequest), attempts: totalAttempts, errors,
      providerTransactions,
      containsPromptContent: false, productionAccepted: false,
    };
    this.deadLetterRecords.push(deadLetter);
    await this.options.deadLetterSink?.(structuredClone(deadLetter));
    throw new Error(`LLM_ALL_ROUTES_FAILED:${errors.join('|')}`);
  }

  async health(purpose?: LlmPurpose): Promise<Array<{ routeId: string; providerId: LlmProviderId; model: string; allowlisted: boolean; configured: boolean; circuit: 'closed'|'open'; baseUrl?: string }>> {
    const routes = this.policy.routes.filter((route) => !purpose || route.purpose === purpose);
    return routes.map((route) => {
      const provider = providerDefinition(route.providerId);
      const keyName = route.apiKeyEnvironmentVariable || provider.apiKeyEnvironmentVariable;
      const allowlisted = modelAllowed(this.policy, route);
      return {
        routeId: route.id,
        providerId: route.providerId,
        model: route.model,
        allowlisted,
        configured: route.enabled && allowlisted && (route.providerId === 'local-openai' || Boolean(process.env[keyName])),
        circuit: circuitAllows(route, this.policy) ? 'closed' : 'open',
        ...(route.baseUrl || provider.defaultBaseUrl ? { baseUrl: route.baseUrl || provider.defaultBaseUrl } : {}),
      };
    });
  }
}
