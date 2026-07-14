import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  architectureProjectSchema,
  architectureStages,
  samplePortfolioProjects,
  type ArchitectureProject,
  type AuthenticatedPrincipal,
  type KnowledgeLibrary,
} from '@aiw/domain';
import {
  buildArchitectureOutcomeScenarios,
  buildGovernedCalibrationProposal,
  createRecommendationOutcome,
  runArchitectureIntelligenceBenchmarkSuite,
  runArchitectureOutcomeBenchmark,
} from '@aiw/engine';
import type { KnowledgeOperationsRepository } from '../knowledgeOperationsRepository.js';
import type { ArchitectureBrainOrchestrator } from '../architectureBrainOrchestrator.js';
import { markArchitectureBrainCompatibilityAlias } from '../architectureBrainRouteBoundary.js';

export interface IntelligenceRouteDeps {
  principalFor: (request: FastifyRequest) => AuthenticatedPrincipal;
  tenantProject: (project: ArchitectureProject, principal: AuthenticatedPrincipal) => boolean;
  loadKnowledgeLibrary: () => Promise<KnowledgeLibrary>;
  knowledgeOperations: KnowledgeOperationsRepository;
  architectureBrain: ArchitectureBrainOrchestrator;
}

const outcomeInputSchema = z.object({
  projectId: z.string().min(1).max(200),
  recommendationId: z.string().min(1).max(240),
  recommendationType: z.enum(['style','pattern','tactic','finding','decision','sol-response']),
  recordId: z.string().min(1).max(240).optional(),
  stage: z.enum(architectureStages),
  decision: z.enum(['accepted','rejected','deferred','implemented','superseded']),
  reason: z.string().min(8).max(4000),
  decidedAt: z.string().datetime().optional(),
  implementedAt: z.string().datetime().optional(),
  reviewResult: z.enum(['passed','conditional','failed']).optional(),
  conformanceResult: z.enum(['conformant','partial','non-conformant']).optional(),
  observedOutcomes: z.record(z.string(), z.union([z.number(),z.string(),z.boolean()])).optional(),
  expectedOutcomes: z.record(z.string(), z.union([z.number(),z.string(),z.boolean()])).optional(),
  knowledgeReleaseId: z.string().min(1).max(240),
});

export async function intelligenceRoutes(app: FastifyInstance, deps: IntelligenceRouteDeps): Promise<void> {
  const { principalFor, tenantProject, loadKnowledgeLibrary, knowledgeOperations, architectureBrain } = deps;

  app.post('/api/intelligence/evaluate', async (request, reply) => {
    markArchitectureBrainCompatibilityAlias(
      reply,
      '/api/architecture-brain/workspace-projection',
    );
    const principal = principalFor(request);
    const eventKinds = [
      'object-added','object-removed','attribute-changed','relationship-created','relationship-removed','connection-intent',
      'pattern-considered','pattern-accepted','style-accepted','requirement-changed','quality-scenario-added','quality-scenario-changed',
      'technology-selected','decision-recorded','constraint-changed','finding-resolved','stage-entered','workspace-entered','selection-changed','state-recomputed',
    ] as const;
    const parsed = z.object({
      project: architectureProjectSchema,
      event: z.object({
        kind: z.enum(eventKinds),
        eventId: z.string().min(1).max(200).optional(),
        subjectIds: z.array(z.string().min(1)).max(100).optional(),
        sourceId: z.string().min(1).optional(),
        targetId: z.string().min(1).optional(),
        relationshipKind: z.string().min(1).optional(),
        field: z.string().min(1).max(200).optional(),
        previousValue: z.unknown().optional(),
        nextValue: z.unknown().optional(),
        occurredAt: z.string().datetime().optional(),
        workspace: z.enum(['design-brief','quality','design-canvas','synthesis','patterns','governance','realization','portfolio','operations','knowledge','collaboration','security','drift','comparison']).optional(),
      }),
    }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INTELLIGENCE_EVALUATION', details: parsed.error.flatten() });
    if (!tenantProject(parsed.data.project, principal)) return reply.code(403).send({ error: 'TENANT_BOUNDARY_VIOLATION' });
    return architectureBrain.evaluateEvent({ project: parsed.data.project, event: parsed.data.event as never });
  });

  app.get('/api/intelligence/benchmarks', async (request) => {
    principalFor(request);
    return runArchitectureIntelligenceBenchmarkSuite(await loadKnowledgeLibrary());
  });



  app.get('/api/intelligence/outcome-evaluation/scenarios', async (request) => {
    const principal = principalFor(request);
    const tenantPortfolio = samplePortfolioProjects.filter((project) => project.tenantId === principal.tenantId);
    return {
      releaseId: 'AIW-0.10.0-rc.10.70.1',
      scenarios: buildArchitectureOutcomeScenarios(tenantPortfolio),
      governanceBoundary: 'Scenario definitions are benchmark inputs. They do not claim human expert validation or production acceptance.',
    };
  });

  app.post('/api/intelligence/outcome-evaluation/run', async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z.object({
      project: architectureProjectSchema,
      portfolioProjects: z.array(architectureProjectSchema).max(20).optional(),
      knowledgeReleaseId: z.string().min(1).max(240).optional(),
      grammarVersion: z.string().min(1).max(240).optional(),
      patternDnaVersion: z.string().min(1).max(240).optional(),
      providerPolicyVersion: z.string().min(1).max(240).optional(),
    }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_ARCHITECTURE_OUTCOME_EVALUATION', details: parsed.error.flatten() });
    if (!tenantProject(parsed.data.project, principal)) return reply.code(403).send({ error: 'TENANT_BOUNDARY_VIOLATION' });
    const portfolio = (parsed.data.portfolioProjects ?? samplePortfolioProjects)
      .filter((candidate) => candidate.tenantId === principal.tenantId)
      .map((candidate) => candidate.id === parsed.data.project.id ? parsed.data.project : candidate);
    if (!portfolio.some((candidate) => candidate.id === parsed.data.project.id)) portfolio.unshift(parsed.data.project);
    return runArchitectureOutcomeBenchmark({
      projects: portfolio,
      ...(parsed.data.knowledgeReleaseId ? { knowledgeReleaseId: parsed.data.knowledgeReleaseId } : {}),
      ...(parsed.data.grammarVersion ? { grammarVersion: parsed.data.grammarVersion } : {}),
      ...(parsed.data.patternDnaVersion ? { patternDnaVersion: parsed.data.patternDnaVersion } : {}),
      ...(parsed.data.providerPolicyVersion ? { providerPolicyVersion: parsed.data.providerPolicyVersion } : {}),
    });
  });

  app.post('/api/intelligence/outcomes', async (request, reply) => {
    const principal = principalFor(request);
    const parsed = outcomeInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_RECOMMENDATION_OUTCOME', details: parsed.error.flatten() });
    const input = parsed.data;
    const outcome = createRecommendationOutcome({
      projectId: input.projectId,
      recommendationId: input.recommendationId,
      recommendationType: input.recommendationType,
      stage: input.stage,
      decision: input.decision,
      reason: input.reason,
      decidedBy: principal.subject,
      knowledgeReleaseId: input.knowledgeReleaseId,
      ...(input.recordId ? { recordId: input.recordId } : {}),
      ...(input.decidedAt ? { decidedAt: input.decidedAt } : {}),
      ...(input.implementedAt ? { implementedAt: input.implementedAt } : {}),
      ...(input.reviewResult ? { reviewResult: input.reviewResult } : {}),
      ...(input.conformanceResult ? { conformanceResult: input.conformanceResult } : {}),
      ...(input.observedOutcomes ? { observedOutcomes: input.observedOutcomes } : {}),
      ...(input.expectedOutcomes ? { expectedOutcomes: input.expectedOutcomes } : {}),
    });
    await knowledgeOperations.saveRecommendationOutcome(principal.tenantId, outcome);
    return reply.code(201).send(outcome);
  });

  app.get('/api/intelligence/outcomes', async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z.object({ recordId: z.string().min(1).max(240).optional() }).safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_OUTCOME_QUERY' });
    return { outcomes: await knowledgeOperations.listRecommendationOutcomes(principal.tenantId, parsed.data.recordId), autoLearningApplied: false };
  });

  app.get('/api/intelligence/calibration-proposal', async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z.object({ recordId: z.string().min(1).max(240).optional() }).safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_CALIBRATION_QUERY' });
    const outcomes = await knowledgeOperations.listRecommendationOutcomes(principal.tenantId, parsed.data.recordId);
    return buildGovernedCalibrationProposal(outcomes, parsed.data.recordId);
  });
}
