import { createHash } from 'node:crypto';
import { doctrineSystemFor, DOCTRINE_VERSION } from './llmDoctrine.js';
import { redactForModel, type RedactionResult } from './dataRedaction.js';
import { verifyEvidenceEntailment, type ApprovedGroundingSource, type EvidenceEntailmentReceipt } from './approvedKnowledgeGrounding.js';
import { validateJsonSchema, type JsonSchemaValidationResult } from './jsonSchemaValidation.js';
import {
  AIW_RELEASE,
  llmProviderCatalog,
  llmProviderIds,
  llmPurposes,
  type LlmApiProtocol,
  type LlmProviderDefinition,
  type LlmProviderId,
  type LlmPurpose,
  type LlmRouteConfiguration,
  type LlmRuntimePolicy,
} from '@aiw/domain';

export interface LlmUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
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
  requestFingerprint: string;
  fallbackUsed: boolean;
  schemaValidation: JsonSchemaValidationResult;
  redaction: { system: RedactionResult; user: RedactionResult };
  groundingReceipt?: EvidenceEntailmentReceipt;
}

export interface JsonGenerationRequest {
  purpose: LlmPurpose;
  system: string;
  user: string;
  schemaName: string;
  jsonSchema?: Record<string, unknown>;
  dataClassification?: 'public'|'internal'|'confidential'|'restricted';
  allowInsufficientGrounding?: boolean;
  grounding?: {
    allowedReferenceIds: string[];
    sources: ApprovedGroundingSource[];
    requireCitations?: boolean;
    minimumSupportScore?: number;
  };
}

interface CircuitState { failures: number; openedAt?: number; }

const circuits = new Map<string, CircuitState>();

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
    openai: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
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

function validatePolicy(policy: LlmRuntimePolicy): LlmRuntimePolicy {
  const ids = new Set<string>();
  for (const route of policy.routes) {
    if (ids.has(route.id)) throw new Error(`DUPLICATE_LLM_ROUTE:${route.id}`);
    ids.add(route.id);
    if (!llmPurposes.includes(route.purpose)) throw new Error(`INVALID_LLM_PURPOSE:${route.purpose}`);
    if (!llmProviderIds.includes(route.providerId)) throw new Error(`INVALID_LLM_PROVIDER:${route.providerId}`);
    if (!route.model.trim()) throw new Error(`LLM_MODEL_REQUIRED:${route.id}`);
    const provider = providerDefinition(route.providerId);
    const protocol = route.protocol ?? provider.protocols[0];
    if (!protocol || !provider.protocols.includes(protocol)) throw new Error(`UNSUPPORTED_LLM_PROTOCOL:${route.id}:${protocol}`);
    if (!route.baseUrl && !provider.defaultBaseUrl) throw new Error(`LLM_BASE_URL_REQUIRED:${route.id}`);
  }
  return policy;
}

export function loadLlmRuntimePolicy(): LlmRuntimePolicy {
  if (process.env.AIW_LLM_CONFIG_JSON) {
    const parsed = JSON.parse(process.env.AIW_LLM_CONFIG_JSON) as LlmRuntimePolicy;
    return validatePolicy(parsed);
  }
  const routes = llmPurposes.map(routeFromEnvironment);
  return validatePolicy({
    routes,
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

function requestFingerprint(request: JsonGenerationRequest): string {
  return `sha256:${createHash('sha256').update(`${DOCTRINE_VERSION}\n${request.purpose}\n${request.system}\n${request.user}\n${request.schemaName}`).digest('hex')}`;
}

async function invokeRoute<T>(route: LlmRouteConfiguration, request: JsonGenerationRequest, policy: LlmRuntimePolicy, fetchImpl: typeof fetch): Promise<LlmExecutionResult<T>> {
  if (!route.enabled) throw new Error(`LLM_ROUTE_DISABLED:${route.id}`);
  const classification = request.dataClassification ?? 'internal';
  if (!route.dataClassificationAllowlist.includes(classification)) throw new Error(`LLM_DATA_CLASSIFICATION_BLOCKED:${route.id}:${classification}`);
  if (!circuitAllows(route, policy)) throw new Error(`LLM_CIRCUIT_OPEN:${route.id}`);
  const provider = providerDefinition(route.providerId);
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
  let payload: any;
  try { payload = text ? JSON.parse(text) : {}; }
  catch { throw new Error(`LLM_PROVIDER_INVALID_JSON:${route.providerId}:${response.status}`); }
  if (!response.ok) throw new Error(`LLM_PROVIDER_${route.providerId}_${response.status}:${payload?.error?.message ?? payload?.message ?? 'request failed'}`);
  const outputText = protocol === 'responses'
    ? (typeof payload.output_text === 'string' ? payload.output_text : contentText(payload.output))
    : contentText(payload.choices?.[0]?.message?.content);
  if (!outputText) throw new Error(`LLM_PROVIDER_EMPTY_RESPONSE:${route.providerId}`);
  const value = parseJsonContent(outputText) as T;
  if (isInsufficientGrounding(value)) throw new Error(`LLM_INSUFFICIENT_GROUNDING:${value.missing}`);
  if (policy.requireStructuredOutput && !request.jsonSchema) throw new Error(`LLM_JSON_SCHEMA_REQUIRED:${request.schemaName}`);
  const schemaValidation = request.jsonSchema ? validateJsonSchema(value, request.jsonSchema) : { valid: true, violations: [] };
  if (!schemaValidation.valid) {
    const detail = schemaValidation.violations.slice(0, 8).map((item) => `${item.path}:${item.rule}`).join(',');
    throw new Error(`LLM_RESPONSE_SCHEMA_INVALID:${request.schemaName}:${detail}`);
  }
  let groundingReceipt: EvidenceEntailmentReceipt | undefined;
  if (request.grounding) {
    const citedReferenceIds = [...new Set(collectCitationIds(value))];
    const allowlist = new Set(request.grounding.allowedReferenceIds);
    const outsideAllowlist = citedReferenceIds.filter((id) => !allowlist.has(id));
    if (outsideAllowlist.length) throw new Error(`LLM_CITATION_OUTSIDE_ALLOWLIST:${outsideAllowlist.join(',')}`);
    if (request.grounding.requireCitations && !citedReferenceIds.length) throw new Error('LLM_GROUNDED_CITATION_REQUIRED');
    groundingReceipt = verifyEvidenceEntailment({
      outputText: flattenOutputText(value),
      citedReferenceIds,
      sources: request.grounding.sources,
      ...(request.grounding.minimumSupportScore !== undefined ? { threshold: request.grounding.minimumSupportScore } : {}),
    });
    if (!groundingReceipt.verified) throw new Error(`LLM_EVIDENCE_ENTAILMENT_FAILED:${groundingReceipt.unsupportedReferenceIds.join(',')}`);
  }
  const usage = protocol === 'responses'
    ? { inputTokens: payload.usage?.input_tokens, outputTokens: payload.usage?.output_tokens, totalTokens: payload.usage?.total_tokens }
    : { inputTokens: payload.usage?.prompt_tokens, outputTokens: payload.usage?.completion_tokens, totalTokens: payload.usage?.total_tokens };
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
    requestFingerprint: requestFingerprint(redactedRequest),
    fallbackUsed: false,
    schemaValidation,
    redaction: { system: systemRedaction, user: userRedaction },
    ...(groundingReceipt ? { groundingReceipt } : {}),
  };
}

function orderedRoutes(policy: LlmRuntimePolicy, purpose: LlmPurpose): LlmRouteConfiguration[] {
  const primary = policy.routes.filter((route) => route.purpose === purpose && route.enabled);
  if (!primary.length) throw new Error(`NO_LLM_ROUTE_CONFIGURED:${purpose}`);
  const byId = new Map(policy.routes.map((route) => [route.id, route]));
  const result: LlmRouteConfiguration[] = [];
  for (const route of primary) {
    if (!result.some((item) => item.id === route.id)) result.push(route);
    if (policy.allowFallback) for (const id of route.fallbackRouteIds) {
      const fallback = byId.get(id);
      if (fallback?.enabled && !result.some((item) => item.id === fallback.id)) result.push(fallback);
    }
  }
  return result;
}

export class LlmGateway {
  constructor(private readonly policy: LlmRuntimePolicy = loadLlmRuntimePolicy(), private readonly fetchImpl: typeof fetch = fetch) {}

  configuration(): { policy: LlmRuntimePolicy; providers: Array<LlmProviderDefinition & { configured: boolean; routes: string[] }> } {
    return {
      policy: { ...this.policy, routes: this.policy.routes.map((route) => ({ ...route, apiKeyEnvironmentVariable: route.apiKeyEnvironmentVariable || providerDefinition(route.providerId).apiKeyEnvironmentVariable })) },
      providers: llmProviderCatalog.map((provider) => ({
        ...provider,
        configured: provider.id === 'local-openai' || Boolean(process.env[provider.apiKeyEnvironmentVariable]) || this.policy.routes.some((route) => route.providerId === provider.id && Boolean(route.apiKeyEnvironmentVariable && process.env[route.apiKeyEnvironmentVariable])),
        routes: this.policy.routes.filter((route) => route.providerId === provider.id).map((route) => route.id),
      })),
    };
  }

  async generateJson<T>(request: JsonGenerationRequest): Promise<LlmExecutionResult<T>> {
    const errors: string[] = [];
    const routes = orderedRoutes(this.policy, request.purpose);
    for (let index = 0; index < routes.length; index += 1) {
      const route = routes[index]!;
      const attempts = Math.max(1, this.policy.maxRetries + 1);
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          const result = await invokeRoute<T>(route, request, this.policy, this.fetchImpl);
          return index === 0 ? result : { ...result, fallbackUsed: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`${route.id}:${message}`);
          markFailure(route.id, this.policy);
          if (message.includes('DATA_CLASSIFICATION_BLOCKED') || message.includes('API_KEY_NOT_CONFIGURED') || message.includes('ROUTE_DISABLED') || message.includes('INSUFFICIENT_GROUNDING') || message.includes('SCHEMA_INVALID') || message.includes('JSON_SCHEMA_REQUIRED') || message.includes('CITATION_OUTSIDE_ALLOWLIST') || message.includes('EVIDENCE_ENTAILMENT_FAILED') || message.includes('GROUNDED_CITATION_REQUIRED')) break;
        }
      }
    }
    throw new Error(`LLM_ALL_ROUTES_FAILED:${errors.join('|')}`);
  }

  async health(purpose?: LlmPurpose): Promise<Array<{ routeId: string; providerId: LlmProviderId; model: string; configured: boolean; circuit: 'closed'|'open'; baseUrl?: string }>> {
    const routes = this.policy.routes.filter((route) => !purpose || route.purpose === purpose);
    return routes.map((route) => {
      const provider = providerDefinition(route.providerId);
      const keyName = route.apiKeyEnvironmentVariable || provider.apiKeyEnvironmentVariable;
      return {
        routeId: route.id,
        providerId: route.providerId,
        model: route.model,
        configured: route.providerId === 'local-openai' || Boolean(process.env[keyName]),
        circuit: circuitAllows(route, this.policy) ? 'closed' : 'open',
        ...(route.baseUrl || provider.defaultBaseUrl ? { baseUrl: route.baseUrl || provider.defaultBaseUrl } : {}),
      };
    });
  }
}
