import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LlmRuntimePolicy } from '@aiw/domain';
import { buildApprovedKnowledgeGroundingPack, verifyEvidenceEntailment } from '../src/approvedKnowledgeGrounding.js';
import { redactForModel } from '../src/dataRedaction.js';
import { validateJsonSchema } from '../src/jsonSchemaValidation.js';
import { LlmGateway } from '../src/llmGateway.js';

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv, OPENAI_API_KEY: 'test-openai-key' };
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

function policy(): LlmRuntimePolicy {
  return {
    routes: [{
      id: 'reasoning', purpose: 'architecture-reasoning', providerId: 'openai', model: 'test-model',
      baseUrl: 'https://example.test/v1', protocol: 'chat-completions', enabled: true,
      fallbackRouteIds: [], dataClassificationAllowlist: ['public', 'internal', 'confidential', 'restricted'],
    }],
    allowFallback: false, requireStructuredOutput: true, redactSecrets: true,
    logPrompts: false, retainProviderContent: false, maxRetries: 0,
    circuitBreakerFailures: 3, circuitBreakerResetSeconds: 60,
  };
}

describe('rc.10.73.4 governed cognitive grounding', () => {
  it('builds a claim-bearing pack from approved Pattern DNA only', () => {
    const pack = buildApprovedKnowledgeGroundingPack({
      activeKnowledgeReleaseId: 'AKR-0.10.72.0',
      recordIds: ['PAT-TRANSACTIONAL-OUTBOX', 'DOES-NOT-EXIST'],
      now: '2026-07-14T18:00:00.000Z',
    });
    expect(pack.sources.some((item) => item.id === 'PAT-TRANSACTIONAL-OUTBOX')).toBe(true);
    expect(pack.sources.some((item) => item.id.startsWith('PCLM-PAT-TRANSACTIONAL-OUTBOX'))).toBe(true);
    expect(pack.sources.every((item) => item.reviewStatus === 'verified')).toBe(true);
    expect(pack.excluded).toEqual([{ id: 'DOES-NOT-EXIST', reason: expect.stringContaining('not approved') }]);
    expect(pack.sourceFingerprint).toMatch(/^sha256:/);
  });

  it('redacts secrets and restricted personal identifiers before provider transmission', () => {
    const result = redactForModel('password=hunter22 email architect@example.com token: ghp_abcdefghijklmnopqrstuvwxyz account 0123456789', 'restricted');
    expect(result.value).not.toContain('hunter22');
    expect(result.value).not.toContain('architect@example.com');
    expect(result.value).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz');
    expect(result.value).not.toContain('0123456789');
    expect(result.findings.length).toBeGreaterThanOrEqual(4);
  });

  it('enforces required fields and rejects undeclared cognitive output', () => {
    const schema = {
      type: 'object', additionalProperties: false, required: ['answer'],
      properties: { answer: { type: 'string', minLength: 1 } },
    };
    expect(validateJsonSchema({ answer: 'grounded' }, schema).valid).toBe(true);
    const invalid = validateJsonSchema({ answer: 'grounded', mutation: true }, schema);
    expect(invalid.valid).toBe(false);
    expect(invalid.violations.some((item) => item.rule === 'additionalProperties')).toBe(true);
  });

  it('accepts only schema-valid, allowlisted and entailed model output after redaction', async () => {
    const pack = buildApprovedKnowledgeGroundingPack({ activeKnowledgeReleaseId: 'AKR-0.10.72.0', recordIds: ['PAT-TRANSACTIONAL-OUTBOX'] });
    let transmitted = '';
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) => {
      transmitted = String(init?.body ?? '');
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          answer: 'Transactional Outbox coordinates durable business state and event publication and requires duplicate-delivery handling.',
          citedRecordIds: ['PAT-TRANSACTIONAL-OUTBOX'],
        }) } }],
        usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const gateway = new LlmGateway(policy(), fetchMock);
    const result = await gateway.generateJson<{ answer: string; citedRecordIds: string[] }>({
      purpose: 'architecture-reasoning', schemaName: 'grounded_answer', dataClassification: 'restricted',
      system: 'Return governed JSON only.',
      user: 'password=hunter22 Explain the approved pattern for architect@example.com.',
      grounding: { allowedReferenceIds: pack.allowedReferenceIds, sources: pack.sources, requireCitations: true, minimumSupportScore: 0.03 },
      jsonSchema: {
        type: 'object', additionalProperties: false, required: ['answer', 'citedRecordIds'],
        properties: {
          answer: { type: 'string', minLength: 1 },
          citedRecordIds: { type: 'array', minItems: 1, items: { type: 'string', enum: pack.allowedReferenceIds } },
        },
      },
    });
    expect(result.schemaValidation.valid).toBe(true);
    expect(result.groundingReceipt?.verified).toBe(true);
    expect(result.redaction.user.changed).toBe(true);
    expect(transmitted).not.toContain('hunter22');
    expect(transmitted).not.toContain('architect@example.com');
  });

  it('rejects citations that do not entail the generated assertion', () => {
    const pack = buildApprovedKnowledgeGroundingPack({ activeKnowledgeReleaseId: 'AKR-0.10.72.0', recordIds: ['PAT-TRANSACTIONAL-OUTBOX'] });
    const receipt = verifyEvidenceEntailment({
      outputText: 'This pattern guarantees zero latency and unlimited throughput without operational cost.',
      citedReferenceIds: ['PAT-TRANSACTIONAL-OUTBOX'], sources: pack.sources, threshold: 0.2,
    });
    expect(receipt.verified).toBe(false);
    expect(receipt.unsupportedReferenceIds).toContain('PAT-TRANSACTIONAL-OUTBOX');
  });
});
