import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  architectureProjectSchema,
  architecturePolicyGateSchema,
  architectureStages,
  collaborationOperationBatchSchema,
  contextualRecommendationRequestSchema,
  runtimeInventorySchema,
  inventoryCollectorSchema,
  telemetrySpanEvidenceSchema,
  operationalDriftReportSchema,
  remediationPlanSchema,
  serviceLevelObjectiveSchema,
  createId,
  createDesignLibrary,
  sampleProject,
  samplePortfolioProjects,
  sampleEnterpriseCatalog,
  enterpriseArchitectureCatalogSchema,
  trustedArchitectureSources,
  coreAntiPatterns,
  knowledgeRepositoryConnectors,
  seedKnowledgeClaims,
  knowledgeClaimTypes,
  sprint78PatternCorpus,
  sprint78BenchmarkScenarios,
  patternCorpusMetrics,
  llmProviderCatalog,
  llmProviderIds,
  llmPurposes,
  conformanceSourceTypes,
  type LlmRouteConfiguration,
  type LlmRuntimePolicy,
  type ActivityEvent,
  type ArchitectureProject,
  type AuthenticatedPrincipal,
  type CollaborationPresence,
  type RuntimeInventorySource,
  type EventBrokerSettings,
  type ArchitectureKnowledgeClaim,
  type ConformanceEvidenceEnvelope,
  type ArchitectureSimulationScenario,
  type SimulationCalibrationProfile,
  sprint80DefaultSimulationScenarios,
  synthesisStrategyIds,
  simulationScenarioTypes,
  AIW_RELEASE,
} from "@aiw/domain";
import { compileArtifacts, compileSynthesisArtifacts } from "@aiw/artifacts";
import {
  addDiscussionComment,
  analyseImpact,
  applyCollaborationOperations,
  applyMergePlan,
  approvalReadiness,
  assignReview,
  canPerform,
  compareBranches,
  completeReview,
  createDiscussion,
  createMergePlan,
  evaluateGovernanceRulePacks,
  expireGovernanceItems,
  permissionsForRole,
  recommendArchitectureStyles,
  recommendInContext,
  resolveDiscussion,
  resolveMergeConflict,
  runDeterministicAudit,
  validateProject,
  canPromote,
  assessLibraryGovernance,
  assessPatternReleaseGovernance,
  portfolioIntelligencePlatformRelease,
  validateProjectSecurity,
  OptimisticConcurrencyError,
  importRuntimeInventory,
  analyseArchitectureDrift,
  evaluateArchitecturePolicyGate,
  executeCollector,
  collectorHealth,
  deriveTopologyFromTelemetry,
  analyseOperationalDrift,
  createDriftWaiver,
  expireDriftWaivers,
  createRemediationPlan,
  submitRemediationPlan,
  decideRemediationPlan,
  evaluateSlo,
  triggeredAlertPolicies,
  createPullRequestPreview,
  previewLibraryDrop,
  getSemanticConnectionOptions,
  computeCanvasCompliance,
  contextualLibrary,
  assessDesignLibraryIntegrity,
  detectArchitectureAntiPatterns,
  nextArchitectureQuestions,
  assessKnowledgeMeshCoverage,
  retrieveArchitectureKnowledge,
  detectClaimContradictions,
  createKnowledgeProposal,
  extractionPromptContract,
  buildRepositoryGovernancePolicies,
  governRepositoryOperation,
  normalizePatternCorpus,
  composePatterns,
  applyPatternComposition,
  buildRecommendationEvidencePack,
  generateArchitectureFitnessFunctions,
  runSprint78BenchmarkSuite,
  sprint78KnowledgeReleaseManifest,
  normalizeConformanceEvidence,
  buildArchitectureConformancePlan,
  assessContinuousConformance,
  buildConformanceRemediationChangeSet,
  buildConformanceVisualModel,
  assessArchitectureDesignBrief,
  synthesizeArchitectureAlternatives,
  simulateArchitectureAlternative,
  runArchitectureSimulationSuite,
  compareArchitectureAlternatives,
  applyArchitectureAlternative,
  createSynthesisDecisionPackage,
  assessKnowledgeCorpusDepth,
  buildReferencePilotScenarios,
  runPilotEvaluationSuite,
  buildV10ReleaseReadiness,
  pilotEvaluationPlatformRelease,
  requiredV10ProductionEvidence,
  assessV10ProductionAcceptance,
  productionAcceptancePlatformRelease,
  hasPermission,
} from "@aiw/engine";
import { loadGovernancePolicy } from "./knowledgePromotion.js";
import { artifactRoutes } from "./routes/artifactRoutes.js";
import { interoperabilityRoutes } from "./routes/interoperabilityRoutes.js";
import { intelligenceRoutes } from "./routes/intelligenceRoutes.js";
import { adminControlPlaneRoutes } from "./routes/adminControlPlaneRoutes.js";
import { adminConfigurationRoutes } from "./routes/adminConfigurationRoutes.js";
import { patternDnaRoutes } from "./routes/patternDnaRoutes.js";
import { repositoryConformancePilotRoutes } from "./routes/repositoryConformancePilotRoutes.js";
import { enterpriseSecurityRoutes } from "./routes/enterpriseSecurityRoutes.js";
import { reviewStudioRoutes } from "./routes/reviewStudioRoutes.js";
import { knowledgeReleaseRoutes } from "./routes/knowledgeReleaseRoutes.js";
import { healthRoutes } from "./routes/healthRoutes.js";
import { knowledgeOpsRoutes } from "./routes/knowledgeOpsRoutes.js";
import { knowledgeFabricRoutes } from "./routes/knowledgeFabricRoutes.js";
import { knowledgeOpsWorkbenchRoutes } from "./routes/knowledgeOpsWorkbenchRoutes.js";
import { mindFactoryRoutes } from "./routes/mindFactoryRoutes.js";
import { mindFactoryJobsRoutes } from "./routes/mindFactoryJobsRoutes.js";
import { releaseRegistryRoutes } from "./routes/releaseRegistryRoutes.js";
import { portfolioRoutes } from "./routes/portfolioRoutes.js";
import { memberSetsMatch, withReferenceMembers } from "./referenceProject.js";
import { runAiAssistedAudit } from "./aiAudit.js";
import { analyseDesignBrief } from "./designBriefAssistant.js";
import { adviseStage, explainStyleRanking } from "./designAssist.js";
import { loadKnowledgeLibrary } from "./library.js";
import {
  createProjectRepository,
  RepositoryRevisionConflict,
  type ProjectRepository,
} from "./repository.js";
import {
  AuditLog,
  DEFAULT_TENANT_ID,
  IdempotencyStore,
  TenantEventHub,
  issueDevelopmentToken,
} from "./securityRuntime.js";
import { TelemetryRuntime } from "./observability.js";
import {
  createDurableEventStore,
  type DurableEventStore,
} from "./durableEvents.js";
import { OidcJwksVerifier } from "./oidcJwks.js";
import {
  createEventBroker,
  OutboxWorker,
  type EventBrokerAdapter,
} from "./eventBroker.js";
import { openRepositoryPullRequest } from "./repositoryProviders.js";
import {
  previewGitHubKnowledgeRefresh,
  refreshGitHubKnowledge,
} from "./githubKnowledgeConnector.js";
import { extractKnowledgeClaims } from "./knowledgeExtraction.js";
import { LlmGateway } from "./llmGateway.js";
import { llmRuntimeConfigurations } from "./llmRuntimeStore.js";
import {
  buildPlatformAcceptanceReport,
  platformAcceptanceProbeIds,
  type AcceptanceProbeId,
} from "./platformAcceptance.js";
import { createKnowledgeObjectStore } from "./knowledgeObjectStore.js";
import { ApprovedKnowledgeVectorStore } from "./knowledgeVectorStore.js";
import {
  createKnowledgeOperationsRepository,
  type KnowledgeOperationsRepository,
} from "./knowledgeOperationsRepository.js";
import { deliverFitnessFunctions } from "./fitnessDelivery.js";
import {
  createSynthesisRepository,
  type SynthesisRepository,
} from "./synthesisRepository.js";
import { runGovernedArchitectureSynthesis } from "./architectureSynthesisService.js";
import {
  createPlatformAcceptanceRepository,
  type PlatformAcceptanceRepository,
} from "./platformAcceptanceRepository.js";
import { databaseStatus } from "./databaseMode.js";
import {
  snapshotRequestSchema,
  projectParamsSchema,
  principalFor,
  canRunEnterpriseAcceptance,
  tenantProject,
} from "./appRuntimeSupport.js";
import { sprint878PlatformRelease } from "./services/releaseRegistry.js";
import { productionMindFactoryRoutes } from "./routes/productionMindFactoryRoutes.js";
import type { ApplicationRouteContext } from "./applicationRouteContext.js";
import { markArchitectureBrainCompatibilityAlias } from "./architectureBrainRouteBoundary.js";
import { recordProjectReviewDecision } from './projectReviewDecisions.js';
export async function registerGovernanceCollaborationApplicationRoutes(context: ApplicationRouteContext) {
  const {
    app, repository, eventHub, auditLog, idempotency, telemetry, durableEvents,
    oidcVerifier, eventBroker, outboxWorker, knowledgeOperations, synthesisRepository,
    platformAcceptanceRepository, referenceSampleProject, publishActivity, architectureBrain,
  } = context;
  async function projectEndpoint(
    request: FastifyRequest,
    reply: any,
    handler: (project: ArchitectureProject) => unknown | Promise<unknown>,
  ) {
    const parsed = architectureProjectSchema.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_PROJECT", details: parsed.error.flatten() });
    if (!tenantProject(parsed.data, principalFor(request)))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    return handler(parsed.data);
  }

  app.get(
    "/api/governance/rule-packs",
    async () => (await loadKnowledgeLibrary()).rulePacks,
  );
  app.post("/api/governance/evaluate", async (request, reply) => {
    markArchitectureBrainCompatibilityAlias(
      reply,
      "/api/architecture-brain/workspace-projection",
    );
    return projectEndpoint(request, reply, async (project) => ({
      findings: await architectureBrain.evaluateGovernance(project),
    }));
  });
  app.post("/api/governance/approval-readiness", async (request, reply) => {
    markArchitectureBrainCompatibilityAlias(
      reply,
      "/api/architecture-brain/workspace-projection",
    );
    const parsed = z
      .object({
        project: architectureProjectSchema,
        stage: z.enum(architectureStages),
        openObligations: z.number().int().nonnegative().default(0),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
    if (!tenantProject(parsed.data.project, principalFor(request)))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    return architectureBrain.governanceApprovalReadiness({
      project: parsed.data.project,
      stage: parsed.data.stage,
      openObligations: parsed.data.openObligations,
    });
  });
  app.post("/api/governance/expire", async (request, reply) => {
    const parsed = z
      .object({
        project: architectureProjectSchema,
        now: z.string().optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_REQUEST" });
    return expireGovernanceItems(
      parsed.data.project,
      parsed.data.now ? new Date(parsed.data.now) : new Date(),
    );
  });

  app.post("/api/reviews/assign", async (request, reply) => {
    markArchitectureBrainCompatibilityAlias(
      reply,
      "/api/projects/{projectId}/branches/{branchId}/brain-transactions/{transactionId}/review/assign",
    );
    const parsed = z
      .object({
        project: architectureProjectSchema,
        stage: z.enum(architectureStages),
        assignedTo: z.string(),
        assignedBy: z.string(),
        instructions: z.string().optional(),
        priority: z.enum(["low", "normal", "high", "critical"]).optional(),
        snapshotId: z.string().optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: "INVALID_REVIEW_ASSIGNMENT",
        details: parsed.error.flatten(),
      });
    const principal = principalFor(request);
    if (parsed.data.assignedBy !== principal.subject)
      return reply.code(403).send({ error: "ACTOR_MISMATCH" });
    if (!tenantProject(parsed.data.project, principal))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    const current = await repository.getProject(
      principal.tenantId,
      parsed.data.project.id,
      parsed.data.project.branch.id,
    );
    if (!current) return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
    if (current.revision !== parsed.data.project.revision)
      return reply.code(409).send({ error: "REVISION_CONFLICT", currentRevision: current.revision });
    try {
      const updated = assignReview(current, parsed.data);
      const saved = await repository.saveProject(updated, current.revision);
      return saved;
    } catch (error) {
      return reply
        .code(
          error instanceof Error && error.message.startsWith("FORBIDDEN")
            ? 403
            : 409,
        )
        .send({
          error:
            error instanceof Error ? error.message : "REVIEW_ASSIGNMENT_FAILED",
        });
    }
  });
  app.post("/api/reviews/:assignmentId/complete", async (request, reply) => {
    markArchitectureBrainCompatibilityAlias(
      reply,
      "/api/projects/{projectId}/branches/{branchId}/brain-transactions/{transactionId}/review/disposition",
    );
    const params = z
      .object({ assignmentId: z.string() })
      .safeParse(request.params);
    const body = z
      .object({ project: architectureProjectSchema, actorId: z.string() })
      .safeParse(request.body);
    if (!params.success || !body.success)
      return reply.code(400).send({ error: "INVALID_REVIEW_COMPLETION" });
    const principal = principalFor(request);
    if (body.data.actorId !== principal.subject)
      return reply.code(403).send({ error: "ACTOR_MISMATCH" });
    if (!tenantProject(body.data.project, principal))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    const current = await repository.getProject(
      principal.tenantId,
      body.data.project.id,
      body.data.project.branch.id,
    );
    if (!current) return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
    if (current.revision !== body.data.project.revision)
      return reply.code(409).send({ error: "REVISION_CONFLICT", currentRevision: current.revision });
    try {
      const updated = completeReview(
        current,
        params.data.assignmentId,
        body.data.actorId,
      );
      return await repository.saveProject(updated, current.revision);
    } catch (error) {
      return reply.code(409).send({
        error:
          error instanceof Error ? error.message : "REVIEW_COMPLETION_FAILED",
      });
    }
  });

  app.post('/api/projects/:projectId/branches/:branchId/review-decisions', async (request, reply) => {
    const params = projectParamsSchema.safeParse(request.params);
    const body = z.object({
      targetType: z.enum(['candidate', 'graph-object', 'risk', 'project']),
      targetId: z.string().min(1),
      action: z.enum(['approve-project-candidate', 'return-with-comments', 'reject-candidate', 'request-evidence', 'request-regeneration', 'mark-risk-accepted', 'record-exception']),
      comment: z.string().max(4000).default(''),
      expectedRevision: z.number().int().nonnegative(),
    }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'INVALID_PROJECT_REVIEW_DECISION' });
    const principal = principalFor(request);
    const current = await repository.getProject(principal.tenantId, params.data.projectId, params.data.branchId);
    if (!current) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' });
    if (!canPerform(current, principal.subject, 'review.decide')) return reply.code(403).send({ error: 'FORBIDDEN:review.decide' });
    try {
      const recorded = recordProjectReviewDecision(current, { ...body.data, actorId: principal.subject });
      const saved = await repository.saveProject(recorded.project, current.revision);
      auditLog.append({
        tenantId: saved.tenantId, projectId: saved.id, branchId: saved.branch.id,
        actorId: principal.subject, eventType: 'review', action: body.data.action,
        targetType: body.data.targetType, targetId: body.data.targetId, outcome: 'success',
        correlationId: request.id, retentionDays: saved.securitySettings.auditRetentionDays,
        metadata: { decisionId: recorded.decision.id, authority: recorded.decision.authority, requestedRevision: body.data.expectedRevision, appliedRevision: current.revision },
      });
      return { project: saved, decision: recorded.decision };
    } catch (error) {
      return reply.code(409).send({ error: error instanceof Error ? error.message : 'PROJECT_REVIEW_DECISION_FAILED' });
    }
  });

  app.post("/api/discussions", async (request, reply) => {
    const parsed = z
      .object({
        project: architectureProjectSchema,
        actorId: z.string(),
        targetType: z.enum([
          "project",
          "stage",
          "node",
          "edge",
          "decision",
          "finding",
          "approval",
          "branch",
        ]),
        targetId: z.string(),
        title: z.string(),
        body: z.string(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_DISCUSSION" });
    if (parsed.data.actorId !== principalFor(request).subject)
      return reply.code(403).send({ error: "ACTOR_MISMATCH" });
    try {
      return createDiscussion(parsed.data.project, parsed.data);
    } catch (error) {
      return reply.code(403).send({
        error: error instanceof Error ? error.message : "DISCUSSION_FAILED",
      });
    }
  });
  app.post("/api/discussions/:threadId/comments", async (request, reply) => {
    const params = z.object({ threadId: z.string() }).safeParse(request.params);
    const body = z
      .object({
        project: architectureProjectSchema,
        actorId: z.string(),
        body: z.string().min(1),
      })
      .safeParse(request.body);
    if (!params.success || !body.success)
      return reply.code(400).send({ error: "INVALID_COMMENT" });
    if (body.data.actorId !== principalFor(request).subject)
      return reply.code(403).send({ error: "ACTOR_MISMATCH" });
    return addDiscussionComment(
      body.data.project,
      params.data.threadId,
      body.data.actorId,
      body.data.body,
    );
  });
  app.post("/api/discussions/:threadId/resolve", async (request, reply) => {
    const params = z.object({ threadId: z.string() }).safeParse(request.params);
    const body = z
      .object({ project: architectureProjectSchema, actorId: z.string() })
      .safeParse(request.body);
    if (!params.success || !body.success)
      return reply.code(400).send({ error: "INVALID_RESOLVE" });
    if (body.data.actorId !== principalFor(request).subject)
      return reply.code(403).send({ error: "ACTOR_MISMATCH" });
    return resolveDiscussion(
      body.data.project,
      params.data.threadId,
      body.data.actorId,
    );
  });

  app.post("/api/impact", async (request, reply) => {
    const parsed = z
      .object({
        project: architectureProjectSchema,
        sourceIds: z.array(z.string()).min(1),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
    return analyseImpact(parsed.data.project, parsed.data.sourceIds);
  });
  app.post("/api/branches/compare", async (request, reply) =>
    branchPair(request, reply, compareBranches),
  );
  app.post("/api/branches/merge-plan", async (request, reply) =>
    branchPair(request, reply, createMergePlan),
  );
  async function branchPair(
    request: FastifyRequest,
    reply: any,
    handler: (
      source: ArchitectureProject,
      target: ArchitectureProject,
    ) => unknown,
  ) {
    const parsed = z
      .object({
        source: architectureProjectSchema,
        target: architectureProjectSchema,
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_BRANCH_PAIR" });
    const principal = principalFor(request);
    if (
      !tenantProject(parsed.data.source, principal) ||
      !tenantProject(parsed.data.target, principal)
    )
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    return handler(parsed.data.source, parsed.data.target);
  }
  app.post("/api/branches/merge-plan/resolve", async (request, reply) => {
    const parsed = z
      .object({
        plan: z.any(),
        conflictId: z.string(),
        resolution: z.enum(["source", "target"]),
      })
      .safeParse(request.body);
    return parsed.success
      ? resolveMergeConflict(
          parsed.data.plan,
          parsed.data.conflictId,
          parsed.data.resolution,
        )
      : reply.code(400).send({ error: "INVALID_CONFLICT_RESOLUTION" });
  });
  app.post("/api/branches/merge-plan/apply", async (request, reply) => {
    const parsed = z
      .object({
        source: architectureProjectSchema,
        target: architectureProjectSchema,
        plan: z.any(),
      })
      .safeParse(request.body);
    return parsed.success
      ? applyMergePlan(parsed.data.source, parsed.data.target, parsed.data.plan)
      : reply.code(400).send({ error: "INVALID_MERGE_APPLY" });
  });

}
