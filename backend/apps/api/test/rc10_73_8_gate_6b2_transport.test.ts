import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LlmRuntimePolicy } from '@aiw/domain';
import { LlmGateway, LlmProviderTransportError, isRetryableLlmTransportFailure, type LlmSafeTransportTelemetry } from '../src/llmGateway.js';

const originalEnvironment = { ...process.env };
beforeEach(() => { process.env = { ...originalEnvironment, OPENAI_API_KEY: 'test-only-placeholder' }; });
afterEach(() => { process.env = { ...originalEnvironment }; vi.restoreAllMocks(); });

function policy(maxRetries = 0): LlmRuntimePolicy {
  return {
    routes: [{
      id: 'gate-6b2-transport', purpose: 'governed-candidate-semantic-transformation', providerId: 'openai',
      model: 'test-snapshot-2026-07-17', baseUrl: 'https://example.test/v1', apiKeyEnvironmentVariable: 'OPENAI_API_KEY',
      protocol: 'responses', timeoutMs: 1_000, maxOutputTokens: 500, temperature: 0, enabled: true,
      fallbackRouteIds: [], dataClassificationAllowlist: ['public'],
    }],
    modelAllowlist: [{
      providerId: 'openai', provider: 'openai', model: 'test-snapshot-2026-07-17', configuredAlias: 'test-snapshot',
      requestedModel: 'test-snapshot-2026-07-17', resolvedModel: 'test-snapshot-2026-07-17', modelFamily: 'test-snapshot',
      allowedSnapshots: ['test-snapshot-2026-07-17'], modelIdentityDecision: 'exact-snapshot-pinned',
      purposes: ['governed-candidate-semantic-transformation'], verificationReference: 'transport-test',
      verificationTimestamp: '2026-07-17T00:00:00.000Z', verificationMethod: 'offline-test',
    }],
    maxInputCharacters: 8_000, allowFallback: false, requireStructuredOutput: true, redactSecrets: true,
    logPrompts: false, retainProviderContent: false, maxRetries, circuitBreakerFailures: 20, circuitBreakerResetSeconds: 60,
  };
}

const request = {
  purpose: 'governed-candidate-semantic-transformation' as const,
  schemaName: 'transport_test', dataClassification: 'public' as const, system: 'bounded', user: 'bounded',
  requireProviderNativeSchema: true, jsonSchema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean' } }, required: ['ok'] },
};

function success(): Response {
  return new Response(JSON.stringify({
    id: 'response-transport-test', model: 'test-snapshot-2026-07-17', output_text: JSON.stringify({ ok: true }),
    usage: { input_tokens: 10, output_tokens: 2, total_tokens: 12 },
  }), { status: 200, headers: { 'content-type': 'application/json', 'x-request-id': 'req-transport-test' } });
}

function transportError(name: string, message: string, code?: string): Error {
  const error = new Error(message); error.name = name;
  if (code) (error as any).cause = { code, message: `${code} bounded cause`, socket: { localAddress: '127.0.0.1', localPort: 50000, remoteAddress: '203.0.113.1', remotePort: 443, bytesWritten: 10, bytesRead: 0 } };
  return error;
}

describe('rc.10.73.8 Gate 6B.2 shared gateway transport', () => {
  it.each([
    ['fetch failure', transportError('TypeError', 'fetch failed')],
    ['connection timeout', transportError('TimeoutError', 'request timed out', 'UND_ERR_CONNECT_TIMEOUT')],
    ['UND_ERR_SOCKET', transportError('TypeError', 'fetch failed', 'UND_ERR_SOCKET')],
  ])('retains safe nested telemetry for %s before rejecting', async (_label, failure) => {
    const persisted: LlmSafeTransportTelemetry[] = [];
    const gateway = new LlmGateway(policy(), vi.fn<typeof fetch>(async () => { throw failure; }), {
      transportTelemetrySink: (record) => { persisted.push(record); },
    });
    await expect(gateway.generateJson(request)).rejects.toThrow('LLM_ALL_ROUTES_FAILED');
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({ retryable: true, credentialsRecorded: false, authenticationHeadersRecorded: false });
    expect(gateway.transactions()).toEqual([expect.objectContaining({ finalDisposition: 'rejected-transport', semanticContentPersisted: false })]);
    expect(JSON.stringify(persisted)).not.toContain('test-only-placeholder');
  });

  it('closes a stale transport and retries once with a fresh transport', async () => {
    let closed = 0; let factories = 0;
    const stale = vi.fn<typeof fetch>(async () => { throw transportError('TypeError', 'fetch failed', 'UND_ERR_SOCKET'); });
    const fresh = vi.fn<typeof fetch>(async () => success());
    const gateway = new LlmGateway(policy(1), stale, {
      freshFetchFactory: () => { factories += 1; return { fetchImpl: fresh, close: () => { closed += 1; } }; },
    });
    const result = await gateway.generateJson<{ ok: boolean }>(request);
    expect(result.value.ok).toBe(true);
    expect(stale).toHaveBeenCalledTimes(1); expect(fresh).toHaveBeenCalledTimes(1); expect(factories).toBe(1);
    expect(gateway.transportTransactions()).toEqual([
      expect.objectContaining({ retryable: true, freshConnection: false }),
      expect.objectContaining({ httpStatus: 200, freshConnection: true }),
    ]);
    expect(closed).toBe(0);
  });

  it('stops when the fresh-connection retry is exhausted', async () => {
    const failure = () => { throw transportError('TypeError', 'fetch failed', 'UND_ERR_SOCKET'); };
    const gateway = new LlmGateway(policy(1), vi.fn<typeof fetch>(async () => failure()), {
      freshFetchFactory: () => ({ fetchImpl: vi.fn<typeof fetch>(async () => failure()) }),
    });
    await expect(gateway.generateJson(request)).rejects.toThrow('LLM_ALL_ROUTES_FAILED');
    expect(gateway.accounting().attempts).toBe(2);
    expect(gateway.transportTransactions()).toHaveLength(2);
    expect(gateway.deadLetters()[0]).toMatchObject({ attempts: 2, containsPromptContent: false, productionAccepted: false });
  });

  it('persists transport telemetry before the dead-letter sink runs', async () => {
    const order: string[] = [];
    const gateway = new LlmGateway(policy(), vi.fn<typeof fetch>(async () => { throw transportError('TypeError', 'fetch failed'); }), {
      transportTelemetrySink: () => { order.push('telemetry'); }, deadLetterSink: () => { order.push('dead-letter'); },
    });
    await expect(gateway.generateJson(request)).rejects.toThrow();
    expect(order).toEqual(['telemetry', 'dead-letter']);
  });

  it('carries attempt and token accounting across a resumed process boundary', async () => {
    const gateway = new LlmGateway(policy(), vi.fn<typeof fetch>(async () => success()), {
      initialAccounting: { attempts: 2, inputTokens: 100, outputTokens: 20, totalTokens: 120 },
    });
    await gateway.generateJson(request);
    expect(gateway.accounting()).toEqual({ attempts: 3, inputTokens: 110, outputTokens: 22, totalTokens: 132 });
  });

  it('classifies only bounded socket and timeout failures as retryable', () => {
    expect(isRetryableLlmTransportFailure(new LlmProviderTransportError('socket', {
      startedAt: '2026-07-17T00:00:00Z', endedAt: '2026-07-17T00:00:01Z', elapsedDurationMs: 1_000,
      requestOrigin: 'https://example.test', method: 'POST', attempt: 1, freshConnection: false,
      causeCode: 'UND_ERR_SOCKET', retryable: true, credentialsRecorded: false, authenticationHeadersRecorded: false,
    }))).toBe(true);
    expect(isRetryableLlmTransportFailure(new Error('schema validation failed'))).toBe(false);
  });
});
