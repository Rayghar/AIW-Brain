import { createHash } from 'node:crypto';
import { llmProviderCatalog, type LlmProviderId, type LlmRouteConfiguration } from '@aiw/domain';
import { loadLlmRuntimePolicy } from './llmGateway.js';

export interface EmbeddingResult {
  vector: number[];
  providerId: LlmProviderId | 'deterministic-local';
  model: string;
  dimensions: number;
  contentHash: string;
  latencyMs: number;
}

function deterministicVector(text: string, dimensions = 1536): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = text.toLowerCase().replace(/[^a-z0-9._-]+/g, ' ').split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const digest = createHash('sha256').update(token).digest();
    for (let offset = 0; offset < digest.length; offset += 4) {
      const index = digest.readUInt16BE(offset % (digest.length - 1)) % dimensions;
      const sign = digest[(offset + 2) % digest.length]! % 2 === 0 ? 1 : -1;
      vector[index] = (vector[index] ?? 0) + sign * (1 + (digest[(offset + 3) % digest.length]! / 255));
    }
  }
  const norm = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0)) || 1;
  return vector.map((item) => item / norm);
}

function normalizeDimensions(input: number[], dimensions = 1536): number[] {
  const result = input.slice(0, dimensions);
  while (result.length < dimensions) result.push(0);
  const norm = Math.sqrt(result.reduce((sum, item) => sum + item * item, 0)) || 1;
  return result.map((item) => item / norm);
}

function providerBase(route: LlmRouteConfiguration): string {
  const provider = llmProviderCatalog.find((item) => item.id === route.providerId);
  const base = route.baseUrl || provider?.defaultBaseUrl;
  if (!base) throw new Error(`LLM_BASE_URL_REQUIRED:${route.id}`);
  return base.replace(/\/$/, '');
}

function providerKey(route: LlmRouteConfiguration): string {
  if (route.providerId === 'local-openai' && !process.env[route.apiKeyEnvironmentVariable || 'AIW_LOCAL_LLM_API_KEY']) return 'local-no-key';
  const provider = llmProviderCatalog.find((item) => item.id === route.providerId);
  const name = route.apiKeyEnvironmentVariable || provider?.apiKeyEnvironmentVariable;
  if (!name || !process.env[name]) throw new Error(`LLM_API_KEY_NOT_CONFIGURED:${route.providerId}:${name ?? 'unknown'}`);
  return process.env[name]!;
}

export class EmbeddingGateway {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async embed(text: string): Promise<EmbeddingResult> {
    const started = Date.now();
    const contentHash = createHash('sha256').update(text).digest('hex');
    if (process.env.AIW_VECTOR_EMBEDDING_MODE === 'deterministic' || process.env.NODE_ENV === 'test') {
      return { vector: deterministicVector(text), providerId: 'deterministic-local', model: 'hash-embedding-v1', dimensions: 1536, contentHash, latencyMs: Date.now() - started };
    }
    const policy = loadLlmRuntimePolicy();
    const route = policy.routes.find((item) => item.purpose === 'embedding' && item.enabled);
    if (!route) throw new Error('NO_EMBEDDING_ROUTE_CONFIGURED');
    const provider = llmProviderCatalog.find((item) => item.id === route.providerId);
    if (!provider?.supportsEmbeddings) throw new Error(`PROVIDER_EMBEDDINGS_NOT_SUPPORTED:${route.providerId}`);
    const response = await this.fetchImpl(`${providerBase(route)}/embeddings`, {
      method: 'POST', headers: { authorization: `Bearer ${providerKey(route)}`, 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'AIW-Embedding-Gateway/0.8.9' },
      body: JSON.stringify({ model: route.model, input: text, encoding_format: 'float' }), signal: AbortSignal.timeout(route.timeoutMs ?? 120_000),
    });
    const body = await response.json() as any;
    if (!response.ok) throw new Error(`EMBEDDING_PROVIDER_${route.providerId}_${response.status}:${body?.error?.message ?? body?.message ?? 'request failed'}`);
    const raw = body?.data?.[0]?.embedding;
    if (!Array.isArray(raw) || !raw.every((value: unknown) => typeof value === 'number')) throw new Error('EMBEDDING_RESPONSE_INVALID');
    const vector = normalizeDimensions(raw);
    return { vector, providerId: route.providerId, model: route.model, dimensions: vector.length, contentHash, latencyMs: Date.now() - started };
  }
}

export function vectorLiteral(vector: number[]): string { return `[${vector.map((value) => Number.isFinite(value) ? value.toFixed(8) : '0').join(',')}]`; }
