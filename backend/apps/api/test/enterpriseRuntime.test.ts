import { afterEach, describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import type { LlmGateway } from '../src/llmGateway.js';
import { buildPlatformAcceptanceReport, enforcePlatformAcceptance } from '../src/platformAcceptance.js';
import type { KnowledgeObjectStore, StoredKnowledgeObject } from '../src/knowledgeObjectStore.js';
import type { OidcJwksVerifier } from '../src/oidcJwks.js';
import { TelemetryRuntime } from '../src/observability.js';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';
import { MemoryPlatformAcceptanceRepository } from '../src/platformAcceptanceRepository.js';

const original = { ...process.env };
afterEach(() => {
  for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
  Object.assign(process.env, original);
});

class MemoryObjectStore implements KnowledgeObjectStore {
  private readonly values = new Map<string, Uint8Array>();
  async put(key: string, content: Uint8Array | string, mediaType: string): Promise<StoredKnowledgeObject> {
    const value = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    this.values.set(key, value);
    const { createHash } = await import('node:crypto');
    return { key, uri: `s3://test/${key}`, sha256: createHash('sha256').update(value).digest('hex'), sizeBytes: value.byteLength, mediaType, storedAt: new Date().toISOString() };
  }
  async get(key: string): Promise<Uint8Array> { const value = this.values.get(key); if (!value) throw new Error('NOT_FOUND'); return value; }
  async delete(key: string): Promise<void> { this.values.delete(key); }
  async health() { return { adapter: 's3', ready: true, detail: 'test' }; }
}

const gateway = {
  async health() { return [{ routeId: 'route-test', providerId: 'openai', model: 'test', configured: true, circuit: 'closed' }]; },
  async generateJson() { return { value: { status: 'ok' }, providerId: 'openai', model: 'test', routeId: 'route-test', protocol: 'responses', latencyMs: 4, usage: {}, requestFingerprint: 'sha256:test', fallbackUsed: false }; },
} as unknown as LlmGateway;

const oidc = {
  async health(issuer: string) { return { ready: true, issuer, jwksUri: `${issuer}/jwks`, keyCount: 2, algorithms: ['RS256'], detail: '2 signing keys discovered.' }; },
} as unknown as OidcJwksVerifier;

const fetcher = (async (input: string | URL | Request) => {
  const url = String(input);
  if (url.includes('api.github.com/repos/')) return new Response(JSON.stringify({ full_name: 'example/aiw-acceptance', default_branch: 'main', permissions: { push: true } }), { status: 200, headers: { 'content-type': 'application/json' } });
  if (url.endsWith('/v1/traces')) return new Response('', { status: 200 });
  return new Response('{}', { status: 404 });
}) as typeof fetch;

describe('Sprint 8.7.2 enterprise runtime acceptance', () => {
  it('distinguishes configured posture from active verification', async () => {
    process.env.AIW_KNOWLEDGE_OBJECT_STORE = 's3';
    process.env.AIW_ENABLE_GITHUB_KNOWLEDGE = 'true';
    process.env.AIW_GITHUB_TOKEN = 'secret-reference';
    process.env.AIW_GITHUB_ACCEPTANCE_REPOSITORY = 'example/aiw-acceptance';
    process.env.AIW_FITNESS_TARGET_REPOSITORY = 'https://github.com/example/aiw-acceptance';
    process.env.AIW_OIDC_ISSUER = 'https://identity.example.test';
    process.env.AIW_OIDC_AUDIENCE = 'aiw';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'https://otel.example.test';
    process.env.AIW_RELEASE_PRIVATE_KEY_PEM = ['-----BEGIN', 'PRIVATE KEY-----\ntest\n-----END', 'PRIVATE KEY-----'].join(' ');

    const passive = await buildPlatformAcceptanceReport(gateway, { objectStore: new MemoryObjectStore(), oidcVerifier: oidc, telemetry: new TelemetryRuntime(), fetcher });
    expect(passive.checks.find((item) => item.id === 'ACC-OIDC')?.status).toBe('configured');
    expect(passive.checks.find((item) => item.id === 'ACC-OBJECT-STORE')?.status).toBe('configured');

    const report = await buildPlatformAcceptanceReport(gateway, {
      activeProbeIds: ['ACC-OBJECT-STORE','ACC-LLM','ACC-GITHUB','ACC-OIDC','ACC-OTEL','ACC-SIGNING'],
      requiredCheckIds: ['ACC-OBJECT-STORE','ACC-LLM','ACC-GITHUB','ACC-OIDC','ACC-OTEL','ACC-SIGNING'],
      objectStore: new MemoryObjectStore(), oidcVerifier: oidc, telemetry: new TelemetryRuntime(), fetcher, tenantId: sampleProject.tenantId,
    });
    expect(report.productionAccepted).toBe(true);
    expect(report.checks.filter((item) => report.requiredChecks.includes(item.id)).every((item) => item.status === 'verified')).toBe(true);
    expect(report.checks.find((item) => item.id === 'ACC-CI')?.status).toBe('verified');
    expect(() => enforcePlatformAcceptance(report)).not.toThrow();
  });

  it('fails startup enforcement when a required probe is not verified', async () => {
    const report = await buildPlatformAcceptanceReport(gateway, { requiredCheckIds: ['ACC-POSTGRES'], objectStore: new MemoryObjectStore() });
    expect(report.productionAccepted).toBe(false);
    expect(() => enforcePlatformAcceptance(report)).toThrow(/ACC-POSTGRES/);
  });

  it('persists active acceptance evidence through the API', async () => {
    const repository = new MemoryPlatformAcceptanceRepository();
    const app = await buildApp({ repository: new InMemoryProjectRepository(), platformAcceptanceRepository: repository });
    try {
      const token = await app.inject({ method: 'POST', url: '/api/auth/development-token', payload: { subject: 'user-owner', email: 'owner@example.com', displayName: 'Owner', tenantId: sampleProject.tenantId } });
      const headers = { authorization: `Bearer ${token.json().token}` };
      const probe = await app.inject({ method: 'POST', url: '/api/platform/acceptance/probe', headers, payload: { checkIds: ['ACC-OBJECT-STORE'], requiredCheckIds: ['ACC-OBJECT-STORE'] } });
      expect(probe.statusCode).toBe(200);
      expect(probe.json().report.checks.find((item: { id: string }) => item.id === 'ACC-OBJECT-STORE').probeMode).toBe('active');
      const history = await app.inject({ method: 'GET', url: '/api/platform/acceptance/history', headers });
      expect(history.statusCode).toBe(200);
      expect(history.json().records).toHaveLength(1);
      expect(history.json().records[0].runId).toBe(probe.json().runId);
    } finally { await app.close(); }
  });
});
