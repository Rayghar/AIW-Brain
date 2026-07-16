import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LlmRuntimePolicy } from '@aiw/domain';
import { LlmGateway } from '../src/llmGateway.js';
import { InMemoryGate6bCandidateStore, transformGate6bEvidenceUnit, type Gate6bEvidenceUnit, type Gate6bTransformationOutput } from '../src/gate6bSemanticTransformation.js';

const originalEnvironment = { ...process.env };

beforeEach(() => { process.env = { ...originalEnvironment, NODE_ENV: 'test', OPENAI_API_KEY: 'test-only-placeholder' }; });
afterEach(() => { process.env = { ...originalEnvironment }; vi.restoreAllMocks(); });

function policy(overrides: Partial<LlmRuntimePolicy> = {}): LlmRuntimePolicy {
  return {
    routes: [{
      id: 'gate-6b-test', purpose: 'governed-candidate-semantic-transformation', providerId: 'openai', model: 'test-supported-model',
      baseUrl: 'https://example.test/v1', apiKeyEnvironmentVariable: 'OPENAI_API_KEY', protocol: 'responses',
      timeoutMs: 10_000, maxOutputTokens: 1_000, temperature: 0, enabled: true, fallbackRouteIds: [], dataClassificationAllowlist: ['internal'],
    }],
    modelAllowlist: [{
      providerId: 'openai', provider: 'openai', model: 'test-supported-model', configuredAlias: 'test-supported',
      requestedModel: 'test-supported-model', resolvedModel: 'test-supported-model', modelFamily: 'test-supported',
      allowedSnapshots: ['test-supported-model'], modelIdentityDecision: 'exact-snapshot-pinned',
      purposes: ['governed-candidate-semantic-transformation'], verificationReference: 'deterministic-test-fixture',
      verificationTimestamp: '2026-07-16T00:00:00.000Z', verificationMethod: 'deterministic-test-fixture',
    }],
    maxInputCharacters: 32_768, allowFallback: false, requireStructuredOutput: true, redactSecrets: true,
    logPrompts: false, retainProviderContent: false, maxRetries: 0, circuitBreakerFailures: 20, circuitBreakerResetSeconds: 60,
    ...overrides,
  };
}

const unit: Gate6bEvidenceUnit = {
  semanticUnitId: 'SEMU-GATE6B-TEST', evidenceId: 'BEV-GATE6B-TEST', connectorId: 'GH-TEST', repository: 'example/architecture',
  immutableCommit: '0123456789abcdef0123456789abcdef01234567', path: 'docs/pattern.md', heading: 'Bounded pattern', structuralRange: 'lines 1-8',
  excerpt: 'A bounded candidate transformation retains exact evidence lineage and requires human review before any promotion.',
  excerptHash: `sha256:${createHash('sha256').update('A bounded candidate transformation retains exact evidence lineage and requires human review before any promotion.').digest('hex')}`, parserVersion: 'bounded-text-parser-v1', sourceAuthorityClass: 'educational-or-discovery-source',
};

function validOutput(): Gate6bTransformationOutput {
  return {
    schemaVersion: '1.0', authority: 'candidate', disposition: 'claim-candidate',
    summary: unit.excerpt,
    claims: [{ statement: unit.excerpt, evidenceRefs: [unit.evidenceId], epistemicStatus: 'source-asserted', conditions: [], limitations: ['Independent review is required.'], confidence: 0.8, reviewRequired: true }],
    evidenceRefs: [unit.evidenceId], abstentionReason: '', reviewRequired: true,
    productionAccepted: false, automaticPromotionAllowed: false, designGraphMutationAllowed: false,
  };
}

function response(value: unknown, status = 200, model = 'test-supported-model'): Response {
  return new Response(JSON.stringify(status === 200
    ? { id: 'gate-6b-test-response', model, output_text: JSON.stringify(value), usage: { input_tokens: 120, output_tokens: 80, total_tokens: 200 } }
    : { model, error: { message: 'bounded temporary failure' }, usage: { input_tokens: 12, output_tokens: 3, total_tokens: 15 } }), {
    status, headers: { 'content-type': 'application/json', 'x-request-id': 'req-bounded-test' },
  });
}

describe('rc.10.73.8 Gate 6B governed runtime readiness', () => {
  it('verifies only the exact configured model entitlement without listing the model catalogue', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ id: 'test-supported-model', object: 'model' }), {
      status: 200, headers: { 'content-type': 'application/json', 'x-request-id': 'req-test-only' },
    }));
    const gateway = new LlmGateway(policy({ modelAllowlist: [] }), fetchMock);
    const receipt = await gateway.verifyExactModelEntitlement({ providerId: 'openai', purpose: 'governed-candidate-semantic-transformation', model: 'test-supported-model' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://example.test/v1/models/test-supported-model');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'GET' });
    expect(receipt).toMatchObject({ available: true, exactModelIdReturned: 'test-supported-model', requestCount: 1, retryCount: 0, redaction: { secretMaterialIncluded: false } });
    expect(JSON.stringify(receipt)).not.toContain('test-only-placeholder');
  });

  it('requires verification metadata on a governed semantic-transformation allowlist entry', () => {
    const base = policy().modelAllowlist![0]!;
    expect(() => new LlmGateway(policy({
      modelAllowlist: [{ ...base, verificationReference: 'receipt-only', verificationTimestamp: undefined }],
    }))).toThrow('LLM_MODEL_ALLOWLIST_VERIFICATION_TIMESTAMP_REQUIRED');
  });

  it('accepts an exact allowlisted snapshot and records an exact identity decision', async () => {
    const gateway = new LlmGateway(policy(), vi.fn<typeof fetch>(async () => response(validOutput())));
    const result = await gateway.generateJson<Gate6bTransformationOutput>({
      purpose: 'governed-candidate-semantic-transformation', schemaName: 'exact_snapshot', system: 'bounded', user: 'bounded',
      requireProviderNativeSchema: true, jsonSchema: { type: 'object' },
    });
    expect(result.transactionTelemetry).toMatchObject({ identityValidationStatus: 'accepted-exact-request', finalDisposition: 'accepted' });
  });

  it('accepts an approved alias only when it resolves to an explicitly approved snapshot', async () => {
    const base = policy();
    const alias = 'test-supported';
    const snapshot = 'test-supported-2026-07-16';
    const aliasPolicy = policy({
      routes: [{ ...base.routes[0]!, model: alias }],
      modelAllowlist: [{ ...base.modelAllowlist![0]!, model: alias, configuredAlias: alias, requestedModel: alias,
        resolvedModel: snapshot, allowedSnapshots: [snapshot], modelIdentityDecision: 'approved-alias-explicit-snapshot' }],
    });
    const gateway = new LlmGateway(aliasPolicy, vi.fn<typeof fetch>(async () => response(validOutput(), 200, snapshot)));
    const result = await gateway.generateJson<Gate6bTransformationOutput>({
      purpose: 'governed-candidate-semantic-transformation', schemaName: 'approved_alias', system: 'bounded', user: 'bounded',
      requireProviderNativeSchema: true, jsonSchema: { type: 'object' },
    });
    expect(result.transactionTelemetry.identityValidationStatus).toBe('accepted-approved-alias-snapshot');
  });

  it.each([
    ['unlisted snapshot', 'test-supported-2026-07-17'],
    ['similar family name', 'test-supported-malicious'],
  ])('rejects an alias resolving to an %s without persisting semantic content', async (_label, reportedModel) => {
    const base = policy();
    const alias = 'test-supported';
    const approvedSnapshot = 'test-supported-2026-07-16';
    const aliasPolicy = policy({
      routes: [{ ...base.routes[0]!, model: alias }],
      modelAllowlist: [{ ...base.modelAllowlist![0]!, model: alias, configuredAlias: alias, requestedModel: alias,
        resolvedModel: approvedSnapshot, allowedSnapshots: [approvedSnapshot], modelIdentityDecision: 'approved-alias-explicit-snapshot' }],
    });
    const gateway = new LlmGateway(aliasPolicy, vi.fn<typeof fetch>(async () => response(validOutput(), 200, reportedModel)));
    const store = new InMemoryGate6bCandidateStore();
    await expect(transformGate6bEvidenceUnit({ gateway, store, unit })).rejects.toThrow('MODEL_IDENTITY_REJECTED');
    expect(store.candidates).toHaveLength(0);
    expect(store.deadLetters).toHaveLength(1);
    expect(store.deadLetters[0]?.providerTransactions).toEqual([expect.objectContaining({ finalDisposition: 'rejected-model-identity', semanticContentPersisted: false })]);
    expect(gateway.deadLetters()[0]?.providerTransactions).toEqual([expect.objectContaining({
      httpStatus: 200, providerRequestId: 'req-bounded-test', requestedModel: alias, providerReportedModel: reportedModel,
      inputTokens: 120, outputTokens: 80, totalTokens: 200, identityValidationStatus: 'rejected',
      finalDisposition: 'rejected-model-identity', semanticContentPersisted: false,
    })]);
    expect(JSON.stringify(gateway.deadLetters())).not.toContain(unit.excerpt);
  });

  it('rejects wildcard model identity entries and fallback on governed transformations', () => {
    const base = policy();
    expect(() => new LlmGateway(policy({ modelAllowlist: [{ ...base.modelAllowlist![0]!, allowedSnapshots: ['test-supported-*'] }] })))
      .toThrow('LLM_MODEL_IDENTITY_PATTERN_PROHIBITED');
    expect(() => new LlmGateway(policy({ routes: [{ ...base.routes[0]!, fallbackRouteIds: ['other'] }] })))
      .toThrow('LLM_GOVERNED_TRANSFORMATION_FALLBACK_PROHIBITED');
  });

  it('fails closed before transport when the selected model is not explicitly allowlisted', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const gateway = new LlmGateway(policy({ modelAllowlist: [] }), fetchMock);
    const store = new InMemoryGate6bCandidateStore();
    await expect(transformGate6bEvidenceUnit({ gateway, store, unit })).rejects.toThrow('LLM_MODEL_NOT_ALLOWLISTED');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(gateway.deadLetters()).toHaveLength(1);
    expect(store.deadLetters).toHaveLength(1);
    expect(JSON.stringify(gateway.deadLetters())).not.toContain(unit.excerpt);
  });

  it('enforces bounded input and complete evidence lineage before transport', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const gateway = new LlmGateway(policy({ maxInputCharacters: 1_024 }), fetchMock);
    await expect(gateway.generateJson({
      purpose: 'governed-candidate-semantic-transformation', schemaName: 'bounded', system: 'x'.repeat(800), user: 'y'.repeat(800),
      requireEvidenceAllowlist: true, requireProviderNativeSchema: true,
      jsonSchema: { type: 'object', additionalProperties: false, properties: {} },
      grounding: { allowedReferenceIds: ['E-1'], sources: [], requireCitations: true },
    })).rejects.toThrow(/INPUT_TOO_LARGE|GROUNDING_LINEAGE_MISMATCH/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('persists only a schema-valid, redacted, lineage-exact candidate and never mutates a Design Graph', async () => {
    let transmitted = '';
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) => { transmitted = String(init?.body ?? ''); return response(validOutput()); });
    const gateway = new LlmGateway(policy(), fetchMock);
    const store = new InMemoryGate6bCandidateStore();
    const graph = { revision: 73, nodes: [{ id: 'N-1' }], edges: [] as unknown[] };
    const graphBefore = JSON.stringify(graph);
    const sensitiveExcerpt = `${unit.excerpt} password=hunter22`;
    const sensitiveUnit = { ...unit, excerpt: sensitiveExcerpt, excerptHash: `sha256:${createHash('sha256').update(sensitiveExcerpt).digest('hex')}` };
    const record = await transformGate6bEvidenceUnit({ gateway, store, unit: sensitiveUnit, now: '2026-07-16T08:00:00.000Z' });
    expect(transmitted).not.toContain('hunter22');
    expect(record.requestFingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(record.responseFingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(record.usage.totalTokens).toBe(200);
    expect(record.evidenceLineage).toMatchObject({ connectorId: unit.connectorId, immutableCommit: unit.immutableCommit, parserVersion: unit.parserVersion });
    expect(record.redactionReceipt.userChanged).toBe(true);
    expect(record).toMatchObject({ authority: 'candidate', scoringEligible: false, hardConstraintEligible: false, conformanceEligible: false, automaticPromotionAllowed: false, designGraphMutationAllowed: false, productionAccepted: false });
    expect(store.candidates).toHaveLength(1);
    expect(store.deadLetters).toHaveLength(0);
    expect(JSON.stringify(graph)).toBe(graphBefore);
  });

  it('rejects extra fields, citations outside the evidence allowlist and unsupported critical claims', async () => {
    let mode: 'extra' | 'outside' | 'unsupported' = 'extra';
    const fetchMock = vi.fn<typeof fetch>(async () => {
      const output: any = validOutput();
      if (mode === 'extra') output.promote = true;
      if (mode === 'outside') { output.evidenceRefs = ['NOT-ALLOWED']; output.claims[0].evidenceRefs = ['NOT-ALLOWED']; }
      if (mode === 'unsupported') { output.summary = 'This guarantees 100% success without risk or trade-off.'; output.claims[0].statement = output.summary; }
      return response(output);
    });
    const gateway = new LlmGateway(policy(), fetchMock);
    const store = new InMemoryGate6bCandidateStore();
    await expect(transformGate6bEvidenceUnit({ gateway, store, unit })).rejects.toThrow('SCHEMA_INVALID');
    mode = 'outside';
    await expect(transformGate6bEvidenceUnit({ gateway, store, unit })).rejects.toThrow(/SCHEMA_INVALID|CITATION_OUTSIDE_ALLOWLIST/);
    mode = 'unsupported';
    await expect(transformGate6bEvidenceUnit({ gateway, store, unit })).rejects.toThrow('EVIDENCE_ENTAILMENT_FAILED');
    expect(store.candidates).toHaveLength(0);
    expect(store.deadLetters).toHaveLength(3);
  });

  it('caps retries at two and emits a bounded dead-letter record', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => response({}, 503));
    const gateway = new LlmGateway(policy({ maxRetries: 2 }), fetchMock);
    const store = new InMemoryGate6bCandidateStore();
    await expect(transformGate6bEvidenceUnit({ gateway, store, unit })).rejects.toThrow('LLM_ALL_ROUTES_FAILED');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(gateway.deadLetters()).toEqual([expect.objectContaining({ attempts: 3, containsPromptContent: false, productionAccepted: false })]);
    expect(store.deadLetters).toHaveLength(1);
  });
});
