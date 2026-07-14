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

export async function registerPatternPilotApplicationRoutes(context: ApplicationRouteContext) {
  const {
    app, repository, eventHub, auditLog, idempotency, telemetry, durableEvents,
    oidcVerifier, eventBroker, outboxWorker, knowledgeOperations, synthesisRepository,
    platformAcceptanceRepository, referenceSampleProject, publishActivity,
  } = context;
  const patternRecommendationSchema = z.object({
    query: z.string().min(3),
    project: architectureProjectSchema,
    stage: z.enum(architectureStages).optional(),
    scopeNodeId: z.string().optional(),
    category: z.string().optional(),
    limit: z.number().int().min(1).max(25).optional(),
  });
  const searchPatternCatalogue = (query: {
    category?: string;
    recordType?: string;
    lifecycle?: string;
    stage?: string;
    q?: string;
    limit?: string;
  }) => {
    let records = sprint78PatternCorpus;
    if (query.category)
      records = records.filter((record) => record.category === query.category);
    if (query.recordType)
      records = records.filter(
        (record) => record.recordType === query.recordType,
      );
    if (query.lifecycle)
      records = records.filter(
        (record) => record.lifecycle === query.lifecycle,
      );
    if (query.stage)
      records = records.filter((record) =>
        record.applicableStages.includes(
          query.stage as (typeof architectureStages)[number],
        ),
      );
    if (query.q) {
      const q = query.q.trim().toLowerCase();
      records = records.filter((record) => {
        const searchable = [
          record.id,
          record.name,
          ...record.aliases,
          record.recordType,
          record.category,
          record.summary,
          record.problem,
          ...record.context,
          ...record.forces,
          ...record.tags,
          ...record.applicabilityRules,
          ...record.exclusions,
          ...record.prerequisites,
          ...record.qualityImpacts.flatMap((impact) => [
            impact.attributeId,
            impact.rationale,
            ...impact.conditions,
          ]),
          ...(record.componentKit ?? []).flatMap((component) => [
            component.key,
            component.name,
            component.archetype,
            component.responsibility,
          ]),
          ...(record.interfaceKit ?? []).flatMap((contract) => [
            contract.key,
            contract.name,
            contract.providerRole,
            contract.consumerRole,
            contract.interaction,
            contract.protocol,
            contract.contractType,
          ]),
        ]
          .join(" ")
          .toLowerCase();
        return searchable.includes(q);
      });
    }
    const limit = Math.max(1, Math.min(500, Number(query.limit ?? 250)));
    return records.slice(0, limit);
  };

  app.get("/api/pattern-intelligence/corpus", async (request) => {
    principalFor(request);
    const query = request.query as {
      category?: string;
      recordType?: string;
      lifecycle?: string;
      stage?: string;
      q?: string;
      limit?: string;
    };
    const manifest = sprint78KnowledgeReleaseManifest();
    return {
      version: manifest.version,
      releaseId: manifest.releaseId,
      ontologyVersion: manifest.ontologyVersion,
      metrics: patternCorpusMetrics(sprint78PatternCorpus),
      normalization: normalizePatternCorpus(sprint78PatternCorpus),
      records: searchPatternCatalogue(query),
    };
  });

  app.get("/api/visual-composition/catalogue", async (request) => {
    principalFor(request);
    const query = request.query as {
      category?: string;
      recordType?: string;
      lifecycle?: string;
      stage?: string;
      q?: string;
      limit?: string;
    };
    const manifest = sprint78KnowledgeReleaseManifest();
    const records = searchPatternCatalogue(query);
    const categories = [
      ...new Set(sprint78PatternCorpus.map((record) => record.category)),
    ].sort();
    const recordTypes = [
      ...new Set(sprint78PatternCorpus.map((record) => record.recordType)),
    ].sort();
    return {
      releaseId: manifest.releaseId,
      ontologyVersion: manifest.ontologyVersion,
      workflow: [
        "search",
        "compare",
        "inspect",
        "preview-topology",
        "apply-to-scope",
        "review-changes",
        "accept",
        "validate-obligations",
      ],
      facets: { categories, recordTypes, stages: architectureStages },
      records,
    };
  });
  app.get("/api/pattern-intelligence/metrics", async (request) => {
    principalFor(request);
    return patternCorpusMetrics(sprint78PatternCorpus);
  });
  app.post("/api/pattern-intelligence/recommend", async (request, reply) => {
    principalFor(request);
    const parsed = patternRecommendationSchema.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_PATTERN_RECOMMENDATION_REQUEST" });
    return buildRecommendationEvidencePack({
      query: parsed.data.query,
      project: parsed.data.project,
      ...(parsed.data.stage ? { stage: parsed.data.stage } : {}),
      ...(parsed.data.scopeNodeId
        ? { scopeNodeId: parsed.data.scopeNodeId }
        : {}),
      ...(parsed.data.category ? { category: parsed.data.category } : {}),
      ...(parsed.data.limit !== undefined ? { limit: parsed.data.limit } : {}),
    });
  });
  app.post("/api/pattern-composition/preview", async (request, reply) => {
    principalFor(request);
    const parsed = z
      .object({
        project: architectureProjectSchema,
        patternIds: z.array(z.string()).min(1).max(12),
        scopeNodeId: z.string().optional(),
        stage: z.enum(architectureStages).optional(),
        anchor: z.object({ x: z.number(), y: z.number() }).optional(),
        allowConditionalPrerequisites: z.boolean().optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_PATTERN_COMPOSITION_REQUEST" });
    return composePatterns({
      project: parsed.data.project,
      patternIds: parsed.data.patternIds,
      ...(parsed.data.scopeNodeId
        ? { scopeNodeId: parsed.data.scopeNodeId }
        : {}),
      ...(parsed.data.stage ? { stage: parsed.data.stage } : {}),
      ...(parsed.data.anchor ? { anchor: parsed.data.anchor } : {}),
      ...(parsed.data.allowConditionalPrerequisites !== undefined
        ? {
            allowConditionalPrerequisites:
              parsed.data.allowConditionalPrerequisites,
          }
        : {}),
    });
  });
  app.post("/api/pattern-composition/apply-preview", async (request, reply) => {
    principalFor(request);
    const parsed = z
      .object({
        project: architectureProjectSchema,
        patternIds: z.array(z.string()).min(1).max(12),
        scopeNodeId: z.string().optional(),
        allowConditionalPrerequisites: z.boolean().optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_PATTERN_COMPOSITION_REQUEST" });
    const plan = composePatterns({
      project: parsed.data.project,
      patternIds: parsed.data.patternIds,
      ...(parsed.data.scopeNodeId
        ? { scopeNodeId: parsed.data.scopeNodeId }
        : {}),
      ...(parsed.data.allowConditionalPrerequisites !== undefined
        ? {
            allowConditionalPrerequisites:
              parsed.data.allowConditionalPrerequisites,
          }
        : {}),
    });
    if (!plan.eligible)
      return reply
        .code(409)
        .send({ error: "PATTERN_COMPOSITION_BLOCKED", plan });
    return {
      plan,
      project: applyPatternComposition(parsed.data.project, plan),
    };
  });
  app.post("/api/fitness-functions/generate", async (request, reply) => {
    principalFor(request);
    const parsed = z
      .object({ patternIds: z.array(z.string()).min(1).max(40) })
      .safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_FITNESS_FUNCTION_REQUEST" });
    const artifacts = generateArchitectureFitnessFunctions(
      parsed.data.patternIds,
    );
    return { version: "0.8.8", artifacts, reviewRequired: true };
  });

  app.post("/api/fitness-functions/deliver", async (request, reply) => {
    const principal = principalFor(request);
    if (process.env.AIW_ENABLE_REPOSITORY_WRITES !== "true")
      return reply.code(503).send({ error: "REPOSITORY_WRITES_DISABLED" });
    const parsed = z
      .object({
        project: architectureProjectSchema,
        patternIds: z.array(z.string()).min(1).max(40),
        binding: z.object({
          id: z.string(),
          provider: z.enum(["github", "gitlab"]),
          repositoryUrl: z.string().url(),
          defaultBranch: z.string().min(1),
          architecturePath: z.string().min(1),
          runtimeInventoryPath: z.string().min(1),
          policyGatePath: z.string().min(1),
          status: z.enum(["configured", "connected", "error"]),
        }),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_FITNESS_DELIVERY_REQUEST" });
    if (!tenantProject(parsed.data.project, principal))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    const token = process.env.AIW_REPOSITORY_TOKEN;
    if (!token)
      return reply.code(503).send({ error: "REPOSITORY_TOKEN_NOT_CONFIGURED" });
    try {
      return await deliverFitnessFunctions({
        project: parsed.data.project,
        binding: parsed.data.binding,
        patternIds: parsed.data.patternIds,
        token,
      });
    } catch (error) {
      return reply.code(409).send({
        error:
          error instanceof Error ? error.message : "FITNESS_DELIVERY_FAILED",
      });
    }
  });

  app.post("/api/conformance/evidence", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        id: z.string().min(1),
        projectId: z.string().min(1),
        branchId: z.string().min(1),
        sourceType: z.enum(conformanceSourceTypes),
        repositoryUrl: z.string().url().optional(),
        commitSha: z.string().optional(),
        workflowRunId: z.string().optional(),
        environment: z.string().optional(),
        collectedAt: z.string().datetime(),
        payload: z.unknown(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_CONFORMANCE_EVIDENCE" });
    const evidence: ConformanceEvidenceEnvelope = {
      id: parsed.data.id,
      projectId: parsed.data.projectId,
      branchId: parsed.data.branchId,
      sourceType: parsed.data.sourceType,
      collectedAt: parsed.data.collectedAt,
      payload: parsed.data.payload,
      ...(parsed.data.repositoryUrl
        ? { repositoryUrl: parsed.data.repositoryUrl }
        : {}),
      ...(parsed.data.commitSha ? { commitSha: parsed.data.commitSha } : {}),
      ...(parsed.data.workflowRunId
        ? { workflowRunId: parsed.data.workflowRunId }
        : {}),
      ...(parsed.data.environment
        ? { environment: parsed.data.environment }
        : {}),
    };
    const findings = normalizeConformanceEvidence(evidence);
    await knowledgeOperations.saveConformance(
      principal.tenantId,
      evidence,
      findings,
    );
    return reply.code(202).send({
      evidenceId: evidence.id,
      sourceType: evidence.sourceType,
      findings,
      summary: {
        total: findings.length,
        critical: findings.filter((item) => item.severity === "critical")
          .length,
        high: findings.filter((item) => item.severity === "high").length,
        warning: findings.filter((item) => item.severity === "warning").length,
      },
    });
  });
  app.post("/api/conformance/plan", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        project: architectureProjectSchema,
        patternIds: z.array(z.string()).max(40).optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_CONFORMANCE_PLAN_REQUEST" });
    if (!tenantProject(parsed.data.project, principal))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    return {
      plan: buildArchitectureConformancePlan(
        parsed.data.project,
        parsed.data.patternIds,
      ),
      reviewRequired: true,
    };
  });

  app.post("/api/conformance/assess", async (request, reply) => {
    const principal = principalFor(request);
    const evidenceSchema = z.object({
      id: z.string().min(1),
      projectId: z.string().min(1),
      branchId: z.string().min(1),
      sourceType: z.enum(conformanceSourceTypes),
      repositoryUrl: z.string().url().optional(),
      commitSha: z.string().optional(),
      workflowRunId: z.string().optional(),
      environment: z.string().optional(),
      collectedAt: z.string().datetime(),
      payload: z.unknown(),
    });
    const parsed = z
      .object({
        project: architectureProjectSchema,
        patternIds: z.array(z.string()).max(40).optional(),
        evidence: z.array(evidenceSchema).max(200).default([]),
        driftReportId: z.string().optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_CONFORMANCE_ASSESSMENT_REQUEST" });
    if (!tenantProject(parsed.data.project, principal))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    const plan = buildArchitectureConformancePlan(
      parsed.data.project,
      parsed.data.patternIds,
    );
    const driftReport = parsed.data.driftReportId
      ? parsed.data.project.driftReports.find(
          (item) => item.id === parsed.data.driftReportId,
        )
      : parsed.data.project.driftReports[0];
    const assessment = assessContinuousConformance({
      project: parsed.data.project,
      plan,
      evidence: parsed.data.evidence as ConformanceEvidenceEnvelope[],
      ...(driftReport ? { driftReport } : {}),
    });
    return {
      plan,
      assessment,
      visualModel: buildConformanceVisualModel(parsed.data.project, assessment),
    };
  });

  app.post("/api/conformance/remediation-preview", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        project: architectureProjectSchema,
        patternIds: z.array(z.string()).max(40).optional(),
        evidenceIds: z.array(z.string()).default([]),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_CONFORMANCE_REMEDIATION_REQUEST" });
    if (!tenantProject(parsed.data.project, principal))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    const plan = buildArchitectureConformancePlan(
      parsed.data.project,
      parsed.data.patternIds,
    );
    const assessment = assessContinuousConformance({
      project: parsed.data.project,
      plan,
      ...(parsed.data.project.driftReports[0]
        ? { driftReport: parsed.data.project.driftReports[0] }
        : {}),
    });
    return {
      changeSet: buildConformanceRemediationChangeSet(assessment),
      reviewRequired: true,
      automaticMutationApplied: false,
    };
  });

  app.get("/api/repository-governance/policies", async (request) => {
    principalFor(request);
    return { version: "0.8.8", policies: buildRepositoryGovernancePolicies() };
  });
  app.post("/api/repository-governance/evaluate", async (request, reply) => {
    principalFor(request);
    const parsed = z
      .object({
        connectorId: z.string().min(1),
        operation: z.enum([
          "monitor",
          "snapshot",
          "extract-claims",
          "recommend",
          "generate-template",
          "reuse-code",
        ]),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_REPOSITORY_GOVERNANCE_REQUEST" });
    const decision = governRepositoryOperation(
      parsed.data.connectorId,
      parsed.data.operation,
    );
    return reply.code(decision.allowed ? 200 : 403).send(decision);
  });
  await releaseRegistryRoutes(app, { knowledgeOperations });
  app.get("/api/pattern-intelligence/benchmarks", async (request) => {
    principalFor(request);
    return { version: "0.8.8", scenarios: sprint78BenchmarkScenarios };
  });
  app.post(
    "/api/pattern-intelligence/benchmarks/run",
    async (request, reply) => {
      principalFor(request);
      const parsed = z
        .object({ project: architectureProjectSchema })
        .safeParse(request.body);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ error: "INVALID_PATTERN_BENCHMARK_REQUEST" });
      const results = runSprint78BenchmarkSuite(parsed.data.project);
      return {
        version: "0.8.8",
        passed: results.filter((result) => result.passed).length,
        total: results.length,
        results,
      };
    },
  );

  app.post("/api/design/interview", async (request, reply) => {
    principalFor(request);
    const parsed = z
      .object({
        project: architectureProjectSchema,
        limit: z.number().int().min(1).max(20).optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_INTERVIEW_REQUEST" });
    return nextArchitectureQuestions(
      parsed.data.project,
      parsed.data.limit ?? 6,
    );
  });
  app.post("/api/design/anti-patterns", async (request, reply) => {
    principalFor(request);
    const parsed = z
      .object({ project: architectureProjectSchema })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_ANTI_PATTERN_REQUEST" });
    return {
      generatedAt: new Date().toISOString(),
      findings: detectArchitectureAntiPatterns(parsed.data.project),
    };
  });
  app.get("/api/design-library", async (request) => {
    principalFor(request);
    const library = await loadKnowledgeLibrary();
    const stage =
      typeof (request.query as { stage?: string }).stage === "string"
        ? (request.query as { stage: string }).stage
        : undefined;
    if (!stage) return createDesignLibrary(library);
    if (!architectureStages.includes(stage as typeof sampleProject.activeStage))
      return [];
    const contextualProject = {
      ...structuredClone(sampleProject),
      activeStage: stage as typeof sampleProject.activeStage,
    };
    return contextualLibrary(contextualProject, library);
  });
  app.post("/api/design/drop-preview", async (request, reply) => {
    principalFor(request);
    const parsed = z
      .object({
        project: architectureProjectSchema,
        recordId: z.string(),
        stage: z.enum(architectureStages),
        position: z.object({ x: z.number(), y: z.number() }),
        scopeNodeId: z.string().optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_DESIGN_DROP_REQUEST" });
    try {
      return previewLibraryDrop(
        parsed.data.project,
        await loadKnowledgeLibrary(),
        parsed.data.recordId,
        parsed.data.stage,
        parsed.data.position,
        parsed.data.scopeNodeId,
      );
    } catch (error) {
      return reply.code(404).send({
        error:
          error instanceof Error ? error.message : "LIBRARY_RECORD_NOT_FOUND",
      });
    }
  });
  app.post("/api/design/connection-options", async (request, reply) => {
    principalFor(request);
    const parsed = z
      .object({
        project: architectureProjectSchema,
        sourceId: z.string(),
        targetId: z.string(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_CONNECTION_OPTIONS_REQUEST" });
    return getSemanticConnectionOptions(
      parsed.data.project,
      parsed.data.sourceId,
      parsed.data.targetId,
    );
  });
  app.post("/api/design/compliance", async (request, reply) => {
    principalFor(request);
    const parsed = z
      .object({ project: architectureProjectSchema })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_COMPLIANCE_REQUEST" });
    return computeCanvasCompliance(
      parsed.data.project,
      await loadKnowledgeLibrary(),
    );
  });

  app.get("/api/pilot/scenarios", async (request) => {
    const principal = principalFor(request);
    return {
      version: "0.10.0-rc.1",
      scenarios: buildReferencePilotScenarios(
        samplePortfolioProjects.filter(
          (project) => project.tenantId === principal.tenantId,
        ),
      ),
    };
  });

  app.post("/api/pilot/evaluate", async (request, reply) => {
    const principal = principalFor(request);
    const scenarioSchema = z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      kind: z.enum([
        "digital-banking",
        "payment-processing",
        "ecommerce",
        "saas-platform",
        "logistics",
        "healthcare",
        "public-sector",
        "data-platform",
        "iot",
        "agentic-ai",
        "legacy-modernization",
        "low-connectivity",
      ]),
      projectIds: z.array(z.string()).min(1),
      businessCriticality: z.enum([
        "low",
        "medium",
        "high",
        "mission-critical",
      ]),
      successThreshold: z.number().min(0).max(100),
      evaluationFocus: z.array(z.string()).default([]),
      requiredCapabilities: z.array(z.string()).default([]),
      acceptanceEvidence: z.array(z.string()).default([]),
    });
    const parsed = z
      .object({
        projects: z.array(architectureProjectSchema).optional(),
        catalog: enterpriseArchitectureCatalogSchema.optional(),
        scenarios: z.array(scenarioSchema).optional(),
      })
      .safeParse(request.body ?? {});
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_PILOT_EVALUATION_REQUEST" });
    const catalog = parsed.data.catalog ?? sampleEnterpriseCatalog;
    if (catalog.tenantId !== principal.tenantId)
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    const projects = parsed.data.projects ?? samplePortfolioProjects;
    if (projects.some((project) => project.tenantId !== principal.tenantId))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    const scenarios =
      parsed.data.scenarios ?? buildReferencePilotScenarios(projects);
    return runPilotEvaluationSuite(scenarios, projects, catalog);
  });

  app.post("/api/pilot/release-readiness", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        projects: z.array(architectureProjectSchema).optional(),
        catalog: enterpriseArchitectureCatalogSchema.optional(),
      })
      .safeParse(request.body ?? {});
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_RELEASE_READINESS_REQUEST" });
    const catalog = parsed.data.catalog ?? sampleEnterpriseCatalog;
    if (catalog.tenantId !== principal.tenantId)
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    const projects = parsed.data.projects ?? samplePortfolioProjects;
    if (projects.some((project) => project.tenantId !== principal.tenantId))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    const report = runPilotEvaluationSuite(
      buildReferencePilotScenarios(projects),
      projects,
      catalog,
    );
    return { report, readiness: buildV10ReleaseReadiness(report) };
  });

  app.get("/api/production-acceptance/requirements", async (request) => {
    principalFor(request);
    return {
      version: AIW_RELEASE.version,
      targetVersion: "0.10.0",
      requirements: requiredV10ProductionEvidence(),
      architectureBoardApprovalRequired: true,
    };
  });

  app.post("/api/production-acceptance/assess", async (request, reply) => {
    const principal = principalFor(request);
    const evidenceSchema = z.object({
      id: z.string().min(1),
      tenantId: z.string().min(1),
      environmentId: z.string().min(1),
      kind: z.enum([
        "enterprise-runtime",
        "repository-conformance",
        "runtime-telemetry",
        "identity-access",
        "model-routing",
        "pilot-signoff",
        "architecture-board-approval",
      ]),
      label: z.string().min(1),
      status: z.enum([
        "verified",
        "failed",
        "missing",
        "expired",
        "superseded",
      ]),
      source: z.enum([
        "enterprise-probe",
        "ci-run",
        "runtime-observation",
        "identity-provider",
        "model-router",
        "human-signoff",
        "architecture-board",
      ]),
      collectedAt: z.string().min(1),
      expiresAt: z.string().optional(),
      projectIds: z.array(z.string()).default([]),
      evidenceRefs: z.array(z.string()).default([]),
      summary: z.string().min(1),
      verifiedBy: z.string().optional(),
    });
    const parsed = z
      .object({
        projects: z.array(architectureProjectSchema).optional(),
        catalog: enterpriseArchitectureCatalogSchema.optional(),
        environmentId: z
          .string()
          .min(1)
          .default("target-environment-not-specified"),
        evidenceRecords: z.array(evidenceSchema).default([]),
      })
      .safeParse(request.body ?? {});
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_PRODUCTION_ACCEPTANCE_REQUEST" });
    const catalog = parsed.data.catalog ?? sampleEnterpriseCatalog;
    if (catalog.tenantId !== principal.tenantId)
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    const projects = parsed.data.projects ?? samplePortfolioProjects;
    if (projects.some((project) => project.tenantId !== principal.tenantId))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    if (
      parsed.data.evidenceRecords.some(
        (record) => record.tenantId !== principal.tenantId,
      )
    )
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    const report = runPilotEvaluationSuite(
      buildReferencePilotScenarios(projects),
      projects,
      catalog,
    );
    const assessment = assessV10ProductionAcceptance({
      pilotReport: report,
      evidenceRecords: parsed.data.evidenceRecords,
      tenantId: principal.tenantId,
      environmentId: parsed.data.environmentId,
    });
    return { report, assessment };
  });

  await portfolioRoutes(app);
}
