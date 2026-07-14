import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AIW_RELEASE, createId } from '@aiw/domain';

type RuntimePrincipal = { tenantId: string };
interface HealthRouteDeps {
  principalFor: (request: FastifyRequest) => RuntimePrincipal;
  llmRuntimeConfigurations: any;
  knowledgeOperations: any;
  version?: string;
}

// Health routes (extracted honoring the shrink-only ratchet).
export async function healthRoutes(app: FastifyInstance, deps: HealthRouteDeps): Promise<void> {
  const { principalFor, llmRuntimeConfigurations, knowledgeOperations, version = AIW_RELEASE.version } = deps;

  app.get('/api/llm-brain/health', async (request) => {
    const principal = principalFor(request);
    const gateway = await llmRuntimeConfigurations.gateway(principal.tenantId);
    return { version, routes: await gateway.health(), note: 'Configured indicates that the required secret reference is resolvable; use the active probe to exercise a provider.' };
  });

  app.post('/api/llm-brain/active-probe', async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z.object({ purpose: z.enum(['knowledge-extraction','architecture-reasoning','recommendation-explanation','artifact-drafting']).default('architecture-reasoning') }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_LLM_PROBE_REQUEST' });
    const gateway = await llmRuntimeConfigurations.gateway(principal.tenantId);
    try {
      const result = await gateway.generateJson({ purpose: parsed.data.purpose, schemaName: 'aiw_llm_probe', jsonSchema: { type: 'object', additionalProperties: false, required: ['status'], properties: { status: { type: 'string', enum: ['ok'] } } }, dataClassification: 'public', system: 'Return only a valid JSON object matching the schema. Do not add commentary.', user: 'Respond with status ok.' });
      await knowledgeOperations.saveLlmAudit(principal.tenantId, { executionId: createId('llm-execution'), purpose: parsed.data.purpose, routeId: result.routeId, providerId: result.providerId, model: result.model, requestFingerprint: result.requestFingerprint, dataClassification: 'public', fallbackUsed: result.fallbackUsed, latencyMs: result.latencyMs, usage: result.usage as Record<string, unknown>, status: 'succeeded' });
      return { status: 'ok', providerId: result.providerId, model: result.model, routeId: result.routeId, protocol: result.protocol, latencyMs: result.latencyMs, fallbackUsed: result.fallbackUsed };
    } catch (error) {
      return reply.code(503).send({ error: error instanceof Error ? error.message : 'LLM_ACTIVE_PROBE_FAILED' });
    }
  });
}
