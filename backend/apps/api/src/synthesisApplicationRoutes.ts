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

export async function registerSynthesisApplicationRoutes(context: ApplicationRouteContext) {
  const {
    app, repository, eventHub, auditLog, idempotency, telemetry, durableEvents,
    oidcVerifier, eventBroker, outboxWorker, knowledgeOperations, synthesisRepository,
    platformAcceptanceRepository, referenceSampleProject, publishActivity, architectureBrain,
  } = context;
  const simulationScenarioSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(simulationScenarioTypes),
    description: z.string(),
    parameters: z.object({
      trafficMultiplier: z.number().positive().optional(),
      dependencyAvailabilityPercent: z.number().min(0).max(100).optional(),
      regionLossPercent: z.number().min(0).max(100).optional(),
      networkAvailabilityPercent: z.number().min(0).max(100).optional(),
      teamCapacityPercent: z.number().min(0).max(100).optional(),
      budgetReductionPercent: z.number().min(0).max(100).optional(),
      maliciousRequestPercent: z.number().min(0).max(100).optional(),
      providerAvailabilityPercent: z.number().min(0).max(100).optional(),
    }),
    requiredCapabilities: z.array(z.string()),
  });

  const simulationCalibrationProfileSchema = z.object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    alternativeId: z.string().min(1).optional(),
    createdAt: z.string().min(1),
    createdBy: z.string().min(1),
    status: z.enum(["draft", "reviewed", "approved"]),
    evidence: z.array(
      z.object({
        id: z.string().min(1),
        sourceType: z.enum([
          "load-test",
          "runtime-telemetry",
          "chaos-test",
          "cloud-pricing",
          "incident",
          "dr-exercise",
          "expert-baseline",
        ]),
        sourceName: z.string().min(1),
        measuredAt: z.string().min(1),
        environment: z.string().min(1),
        scenarioType: z.union([
          z.enum(simulationScenarioTypes),
          z.literal("all"),
        ]),
        confidence: z.number().min(0).max(100),
        outcome: z.object({
          availabilityPercent: z.number().optional(),
          p95LatencyMs: z.number().optional(),
          recoveryTimeMinutes: z.number().optional(),
          recoveryPointMinutes: z.number().optional(),
          throughputCapacityMultiplier: z.number().optional(),
          estimatedMonthlyCost: z.number().optional(),
          operationalLoadScore: z.number().optional(),
          securityExposureScore: z.number().optional(),
          deliveryRiskScore: z.number().optional(),
        }),
        notes: z.array(z.string()),
        evidenceUri: z.string().optional(),
      }),
    ),
  });

  const canonicalProjectReferenceSchema = z.object({
    projectId: z.string().min(1),
    branchId: z.string().min(1),
    expectedRevision: z.number().int().nonnegative(),
  });
  const synthesisRequestSchema = canonicalProjectReferenceSchema.extend({
    knowledgeReleaseId: z.string().min(1).optional(),
    strategyIds: z.array(z.enum(synthesisStrategyIds)).min(2).max(7).optional(),
    maxAlternatives: z.number().int().min(2).max(7).optional(),
    requireDiversity: z.boolean().optional(),
    useLlmEnrichment: z.boolean().optional(),
    dataClassification: z
      .enum(["public", "internal", "confidential", "restricted"])
      .optional(),
  });

  async function loadCanonicalSynthesisProject(input: {
    request: FastifyRequest;
    reply: any;
    projectId: string;
    branchId: string;
    expectedRevision: number;
  }): Promise<ArchitectureProject | undefined> {
    const principal = principalFor(input.request);
    const project = await repository.getProject(principal.tenantId, input.projectId, input.branchId);
    if (!project || !canPerform(project, principal.subject, "project.read")) {
      input.reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
      return undefined;
    }
    if (project.revision !== input.expectedRevision) {
      input.reply.code(409).send({
        error: "STALE_ARCHITECTURE_BRAIN_CONTEXT",
        expectedRevision: input.expectedRevision,
        actualRevision: project.revision,
      });
      return undefined;
    }
    return project;
  }

  app.get("/api/synthesis/scenarios", async (request) => {
    principalFor(request);
    return {
      version: AIW_RELEASE.version,
      deterministicModelVersion: "aiw-simulation-1.0",
      scenarios: sprint80DefaultSimulationScenarios,
    };
  });
  app.post("/api/synthesis/assess", async (request, reply) => {
    markArchitectureBrainCompatibilityAlias(reply, "/api/synthesis/runs");
    const parsed = canonicalProjectReferenceSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_SYNTHESIS_ASSESSMENT_REQUEST", details: parsed.error.flatten() });
    const project = await loadCanonicalSynthesisProject({ request, reply, ...parsed.data });
    if (!project) return;
    return architectureBrain.synthesisAssessment(project);
  });
  app.post("/api/synthesis/runs", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = synthesisRequestSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: "INVALID_ARCHITECTURE_SYNTHESIS_REQUEST",
        issues: parsed.error.issues,
      });
    const project = await loadCanonicalSynthesisProject({
      request,
      reply,
      projectId: parsed.data.projectId,
      branchId: parsed.data.branchId,
      expectedRevision: parsed.data.expectedRevision,
    });
    if (!project) return;
    try {
      const result = await architectureBrain.synthesize({
        tenantId: principal.tenantId,
        request: {
          project,
          ...(parsed.data.knowledgeReleaseId
            ? { knowledgeReleaseId: parsed.data.knowledgeReleaseId }
            : {}),
          ...(parsed.data.strategyIds
            ? { strategyIds: parsed.data.strategyIds }
            : {}),
          ...(parsed.data.maxAlternatives !== undefined
            ? { maxAlternatives: parsed.data.maxAlternatives }
            : {}),
          ...(parsed.data.requireDiversity !== undefined
            ? { requireDiversity: parsed.data.requireDiversity }
            : {}),
          ...(parsed.data.useLlmEnrichment !== undefined
            ? { useLlmEnrichment: parsed.data.useLlmEnrichment }
            : {}),
          ...(parsed.data.dataClassification
            ? { dataClassification: parsed.data.dataClassification }
            : {}),
        },
      });
      await synthesisRepository.saveRun(result.run, principal.subject);
      if (result.llmExecution)
        await knowledgeOperations.saveLlmAudit(principal.tenantId, {
          executionId: createId("llm-synthesis"),
          purpose: "architecture-reasoning",
          routeId: result.llmExecution.routeId,
          providerId: result.llmExecution.providerId,
          model: result.llmExecution.model,
          requestFingerprint: result.llmExecution.requestFingerprint,
          dataClassification: parsed.data.dataClassification ?? "internal",
          fallbackUsed: result.llmExecution.fallbackUsed,
          latencyMs: result.llmExecution.latencyMs,
          usage: result.llmExecution.usage as Record<string, unknown>,
          status: "succeeded",
        });
      return reply.code(201).send({ ...result.run, brainReceipt: result.brainReceipt });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "ARCHITECTURE_SYNTHESIS_FAILED";
      return reply
        .code(message.startsWith("LLM_") ? 503 : 409)
        .send({ error: message });
    }
  });
  app.get("/api/synthesis/runs/:runId", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({ runId: z.string().min(1) })
      .safeParse(request.params);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_SYNTHESIS_RUN_ID" });
    return (
      (await synthesisRepository.getRun(
        principal.tenantId,
        parsed.data.runId,
      )) ?? reply.code(404).send({ error: "SYNTHESIS_RUN_NOT_FOUND" })
    );
  });
  app.get("/api/synthesis/projects/:projectId/runs", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({ projectId: z.string().min(1) })
      .safeParse(request.params);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_SYNTHESIS_PROJECT_ID" });
    return {
      runs: await synthesisRepository.listRuns(
        principal.tenantId,
        parsed.data.projectId,
      ),
    };
  });
  app.post("/api/synthesis/runs/:runId/simulate", async (request, reply) => {
    const principal = principalFor(request);
    const params = z
      .object({ runId: z.string().min(1) })
      .safeParse(request.params);
    const body = z
      .object({
        alternativeId: z.string().min(1),
        scenarioIds: z.array(z.string()).optional(),
        scenarios: z.array(simulationScenarioSchema).optional(),
        calibrationProfile: simulationCalibrationProfileSchema.optional(),
      })
      .safeParse(request.body);
    if (!params.success || !body.success)
      return reply
        .code(400)
        .send({ error: "INVALID_ARCHITECTURE_SIMULATION_REQUEST" });
    const run = await synthesisRepository.getRun(
      principal.tenantId,
      params.data.runId,
    );
    if (!run) return reply.code(404).send({ error: "SYNTHESIS_RUN_NOT_FOUND" });
    const selectedScenarios = body.data.scenarios?.length
      ? body.data.scenarios
      : body.data.scenarioIds?.length
        ? sprint80DefaultSimulationScenarios.filter((item) =>
            body.data.scenarioIds!.includes(item.id),
          )
        : sprint80DefaultSimulationScenarios;
    const requestedScenarios: ArchitectureSimulationScenario[] =
      selectedScenarios.map(
        (scenario) =>
          ({
            ...scenario,
            parameters: Object.fromEntries(
              Object.entries(scenario.parameters).filter(
                ([, value]) => value !== undefined,
              ),
            ),
          }) as ArchitectureSimulationScenario,
      );
    if (!requestedScenarios.length)
      return reply
        .code(400)
        .send({ error: "NO_SIMULATION_SCENARIOS_SELECTED" });
    try {
      const calibrationProfile = body.data.calibrationProfile as
        SimulationCalibrationProfile | undefined;
      if (calibrationProfile && calibrationProfile.projectId !== run.projectId)
        return reply
          .code(400)
          .send({ error: "CALIBRATION_PROFILE_PROJECT_MISMATCH" });
      if (
        calibrationProfile?.alternativeId &&
        calibrationProfile.alternativeId !== body.data.alternativeId
      )
        return reply
          .code(400)
          .send({ error: "CALIBRATION_PROFILE_ALTERNATIVE_MISMATCH" });
      const results = requestedScenarios.map((scenario) =>
        simulateArchitectureAlternative(
          run,
          body.data.alternativeId,
          scenario,
          calibrationProfile,
        ),
      );
      await synthesisRepository.saveSimulations(
        principal.tenantId,
        results,
        principal.subject,
      );
      return { runId: run.id, alternativeId: body.data.alternativeId, results };
    } catch (error) {
      return reply.code(404).send({
        error: error instanceof Error ? error.message : "SIMULATION_FAILED",
      });
    }
  });
  app.get("/api/synthesis/runs/:runId/simulations", async (request, reply) => {
    const principal = principalFor(request);
    const params = z
      .object({ runId: z.string().min(1) })
      .safeParse(request.params);
    if (!params.success)
      return reply.code(400).send({ error: "INVALID_SYNTHESIS_RUN_ID" });
    const query = request.query as { alternativeId?: string };
    return {
      results: await synthesisRepository.listSimulations(
        principal.tenantId,
        params.data.runId,
        query.alternativeId,
      ),
    };
  });
  app.get("/api/synthesis/runs/:runId/comparison", async (request, reply) => {
    const principal = principalFor(request);
    const params = z
      .object({ runId: z.string().min(1) })
      .safeParse(request.params);
    if (!params.success)
      return reply.code(400).send({ error: "INVALID_SYNTHESIS_RUN_ID" });
    const run = await synthesisRepository.getRun(
      principal.tenantId,
      params.data.runId,
    );
    return run
      ? compareArchitectureAlternatives(run.alternatives)
      : reply.code(404).send({ error: "SYNTHESIS_RUN_NOT_FOUND" });
  });
  app.post(
    "/api/synthesis/runs/:runId/apply-preview",
    async (request, reply) => {
      const principal = principalFor(request);
      const params = z
        .object({ runId: z.string().min(1) })
        .safeParse(request.params);
      const body = z
        .object({
          projectId: z.string().min(1),
          branchId: z.string().min(1),
          expectedRevision: z.number().int().nonnegative(),
          alternativeId: z.string().min(1),
          status: z.enum(["considering", "accepted"]).default("considering"),
        })
        .safeParse(request.body);
      if (!params.success || !body.success)
        return reply
          .code(400)
          .send({ error: "INVALID_SYNTHESIS_APPLY_REQUEST" });
      const project = await loadCanonicalSynthesisProject({
        request,
        reply,
        projectId: body.data.projectId,
        branchId: body.data.branchId,
        expectedRevision: body.data.expectedRevision,
      });
      if (!project) return;
      const run = await synthesisRepository.getRun(
        principal.tenantId,
        params.data.runId,
      );
      if (!run)
        return reply.code(404).send({ error: "SYNTHESIS_RUN_NOT_FOUND" });
      if (project.revision !== run.projectRevision)
        return reply.code(409).send({
          error: "SYNTHESIS_PROJECT_REVISION_CHANGED",
          expectedRevision: run.projectRevision,
          actualRevision: project.revision,
        });
      const alternative = run.alternatives.find(
        (item: any) => item.id === body.data.alternativeId,
      );
      if (!alternative)
        return reply
          .code(404)
          .send({ error: "SYNTHESIS_ALTERNATIVE_NOT_FOUND" });
      return {
        runId: run.id,
        alternativeId: alternative.id,
        project: applyArchitectureAlternative(
          project,
          alternative,
          body.data.status,
        ),
        warnings: alternative.governanceWarnings,
      };
    },
  );
  app.post("/api/synthesis/runs/:runId/decision", async (request, reply) => {
    const principal = principalFor(request);
    const params = z
      .object({ runId: z.string().min(1) })
      .safeParse(request.params);
    const body = z
      .object({
        alternativeId: z.string().min(1),
        rationale: z.string().min(5),
        accept: z.boolean().default(false),
      })
      .safeParse(request.body);
    if (!params.success || !body.success)
      return reply
        .code(400)
        .send({ error: "INVALID_SYNTHESIS_DECISION_REQUEST" });
    const run = await synthesisRepository.getRun(
      principal.tenantId,
      params.data.runId,
    );
    if (!run) return reply.code(404).send({ error: "SYNTHESIS_RUN_NOT_FOUND" });
    const simulations = await synthesisRepository.listSimulations(
      principal.tenantId,
      run.id,
      body.data.alternativeId,
    );
    try {
      const decision = createSynthesisDecisionPackage(
        run,
        body.data.alternativeId,
        simulations,
        body.data.rationale,
        body.data.accept,
      );
      await synthesisRepository.saveDecision(
        principal.tenantId,
        decision,
        principal.subject,
      );
      return reply.code(body.data.accept ? 200 : 201).send(decision);
    } catch (error) {
      return reply.code(404).send({
        error:
          error instanceof Error ? error.message : "SYNTHESIS_DECISION_FAILED",
      });
    }
  });
  app.post("/api/synthesis/runs/:runId/artifacts", async (request, reply) => {
    const principal = principalFor(request);
    const params = z
      .object({ runId: z.string().min(1) })
      .safeParse(request.params);
    const body = z
      .object({
        alternativeId: z.string().min(1),
        rationale: z.string().min(5).optional(),
      })
      .safeParse(request.body);
    if (!params.success || !body.success)
      return reply
        .code(400)
        .send({ error: "INVALID_SYNTHESIS_ARTIFACT_REQUEST" });
    const run = await synthesisRepository.getRun(
      principal.tenantId,
      params.data.runId,
    );
    if (!run) return reply.code(404).send({ error: "SYNTHESIS_RUN_NOT_FOUND" });
    const simulations = await synthesisRepository.listSimulations(
      principal.tenantId,
      run.id,
      body.data.alternativeId,
    );
    try {
      const bundle = compileSynthesisArtifacts(
        run,
        body.data.alternativeId,
        simulations,
        body.data.rationale,
      );
      await synthesisRepository.saveArtifactBundle(
        principal.tenantId,
        bundle,
        principal.subject,
      );
      return bundle;
    } catch (error) {
      return reply.code(404).send({
        error:
          error instanceof Error
            ? error.message
            : "SYNTHESIS_ARTIFACT_GENERATION_FAILED",
      });
    }
  });
  app.post(
    "/api/synthesis/runs/:runId/conformance-handoff",
    async (request, reply) => {
      const principal = principalFor(request);
      const params = z
        .object({ runId: z.string().min(1) })
        .safeParse(request.params);
      const body = z
        .object({ alternativeId: z.string().min(1) })
        .safeParse(request.body);
      if (!params.success || !body.success)
        return reply
          .code(400)
          .send({ error: "INVALID_SYNTHESIS_HANDOFF_REQUEST" });
      const run = await synthesisRepository.getRun(
        principal.tenantId,
        params.data.runId,
      );
      const alternative = run?.alternatives.find(
        (item: any) => item.id === body.data.alternativeId,
      );
      if (!run || !alternative)
        return reply
          .code(404)
          .send({ error: "SYNTHESIS_ALTERNATIVE_NOT_FOUND" });
      const fitness = generateArchitectureFitnessFunctions(
        alternative.patternIds,
      );
      return {
        runId: run.id,
        alternativeId: alternative.id,
        patternIds: alternative.patternIds,
        fitnessArtifacts: fitness,
        deliveryEndpoint: "/api/fitness-functions/deliver",
        evidenceEndpoint: "/api/conformance/evidence",
        reviewRequired: true,
      };
    },
  );

}
