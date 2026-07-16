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
      id: 'gate-6b-test', purpose: 'knowledge-extraction', providerId: 'openai', model: 'test-supported-model',
      baseUrl: 'https://example.test/v1', apiKeyEnvironmentVariable: 'OPENAI_API_KEY', protocol: 'responses',
      timeoutMs: 10_000, maxOutputTokens: 1_000, temperature: 0, enabled: true, fallbackRouteIds: [], dataClassificationAllowlist: ['internal'],
    }],
    modelAllowlist: [{ providerId: 'openai', model: 'test-supported-model', purposes: ['knowledge-extraction'], verificationReference: 'deterministic-test-fixture' }],
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

function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(status === 200
    ? { id: 'gate-6b-test-response', output_text: JSON.stringify(value), usage: { input_tokens: 120, output_tokens: 80, total_tokens: 200 } }
    : { error: { message: 'bounded temporary failure' } }), { status, headers: { 'content-type': 'application/json' } });
}

describe('rc.10.73.8 Gate 6B governed runtime readiness', () => {
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
      purpose: 'knowledge-extraction', schemaName: 'bounded', system: 'x'.repeat(800), user: 'y'.repeat(800),
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
