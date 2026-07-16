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

export async function registerPlatformKnowledgeApplicationRoutes(context: ApplicationRouteContext) {
  const {
    app, repository, eventHub, auditLog, idempotency, telemetry, durableEvents,
    oidcVerifier, eventBroker, outboxWorker, knowledgeOperations, synthesisRepository,
    platformAcceptanceRepository, referenceSampleProject, publishActivity,
  } = context;
  app.get("/health", async () => ({
    status: "ok",
    service: "aiw-api",
    version: AIW_RELEASE.version,
    securityMode:
      process.env.AIW_ALLOW_DEV_AUTH === "false"
        ? "sso-required"
        : "development-enabled",
  }));
  app.get("/ready", async () => ({
    status: "ready",
    version: AIW_RELEASE.version,
    storage: databaseStatus(),
    repository: databaseStatus().projectRepository,
    durableEvents: databaseStatus().outbox,
    acceptanceMode: process.env.AIW_RUNTIME_ACCEPTANCE_MODE ?? "report",
  }));
  app.get("/api/storage/status", async (request) => {
    principalFor(request);
    return {
      status: "ready",
      version: AIW_RELEASE.version,
      ...databaseStatus(),
      databaseName:
        process.env.MONGODB_URI || process.env.MONGO_URL
          ? (process.env.MONGODB_DB_NAME ??
            process.env.AIW_MONGODB_DATABASE ??
            "aiw")
          : undefined,
      secretValuesExposed: false,
    };
  });
  app.get("/api/platform/acceptance", async (request) => {
    const principal = principalFor(request);
    return buildPlatformAcceptanceReport(
      await llmRuntimeConfigurations.gateway(principal.tenantId),
      { telemetry, oidcVerifier, tenantId: principal.tenantId },
    );
  });
  app.post("/api/platform/acceptance/probe", async (request, reply) => {
    const principal = principalFor(request);
    if (!canRunEnterpriseAcceptance(principal))
      return reply
        .code(403)
        .send({ error: "ENTERPRISE_ACCEPTANCE_OPERATOR_REQUIRED" });
    const ids = platformAcceptanceProbeIds();
    const parsed = z
      .object({
        checkIds: z.array(z.string()).default(ids),
        requiredCheckIds: z.array(z.string()).optional(),
      })
      .safeParse(request.body ?? {});
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_ACCEPTANCE_PROBE_REQUEST" });
    const checkIds = parsed.data.checkIds.filter(
      (id): id is AcceptanceProbeId => ids.includes(id as AcceptanceProbeId),
    );
    const requiredCheckIds = parsed.data.requiredCheckIds?.filter(
      (id): id is AcceptanceProbeId => ids.includes(id as AcceptanceProbeId),
    );
    const report = await buildPlatformAcceptanceReport(
      await llmRuntimeConfigurations.gateway(principal.tenantId),
      {
        activeProbeIds: checkIds,
        ...(requiredCheckIds?.length ? { requiredCheckIds } : {}),
        telemetry,
        oidcVerifier,
        tenantId: principal.tenantId,
      },
    );
    const runId = createId("acceptance");
    await platformAcceptanceRepository.save({
      runId,
      tenantId: principal.tenantId,
      actorId: principal.subject,
      generatedAt: report.generatedAt,
      report,
    });
    auditLog.append({
      tenantId: principal.tenantId,
      actorId: principal.subject,
      eventType: "platform-acceptance",
      action: "run-active-probes",
      targetType: "enterprise-runtime",
      targetId: runId,
      outcome: report.productionAccepted ? "success" : "failure",
      correlationId: request.id,
      retentionDays: 365,
      metadata: {
        checkIds,
        requiredCheckIds: report.requiredChecks,
        verified: report.verified,
        open: report.open,
      },
    });
    return { runId, report };
  });
  app.get("/api/platform/acceptance/history", async (request) => {
    const principal = principalFor(request);
    const query = z
      .object({
        limit: z.coerce.number().int().positive().max(100).default(20),
      })
      .parse(request.query);
    return {
      records: await platformAcceptanceRepository.list(
        principal.tenantId,
        query.limit,
      ),
    };
  });
  app.get("/metrics", async (_request, reply) =>
    reply.type("text/plain; version=0.0.4").send(telemetry.prometheus()),
  );
  app.get("/api/observability/summary", async () => telemetry.summary());
  app.post("/api/observability/export", async (request, reply) => {
    principalFor(request);
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    if (!endpoint)
      return reply.code(503).send({ error: "OTLP_ENDPOINT_NOT_CONFIGURED" });
    try {
      return await telemetry.exportOtlp(endpoint);
    } catch (error) {
      return reply.code(502).send({
        error: error instanceof Error ? error.message : "OTLP_EXPORT_FAILED",
      });
    }
  });
  app.get("/api/library", async () => loadKnowledgeLibrary());
  app.get("/api/knowledge/releases/active", async (request) => {
    principalFor(request);
    return {
      release: sprint78KnowledgeReleaseManifest(),
      platform: sprint878PlatformRelease(),
    };
  });
  app.get("/api/knowledge/sources", async (request) => {
    principalFor(request);
    return { version: "0.8.8", sources: trustedArchitectureSources };
  });
  app.get("/api/knowledge/anti-patterns", async (request) => {
    principalFor(request);
    return { version: "0.8.8", records: coreAntiPatterns };
  });
  app.get("/api/knowledge/integrity", async (request) => {
    principalFor(request);
    return assessDesignLibraryIntegrity(await loadKnowledgeLibrary());
  });
  app.get("/api/knowledge/depth", async (request) => {
    principalFor(request);
    const portfolio = assessKnowledgeCorpusDepth(sprint78PatternCorpus);
    return {
      releaseId: "AKR-0.10.60",
      policy: {
        primaryRecommendationMinimumGrade: "production-deep",
        supportingMinimumGrade: "production-supporting",
      },
      ...portfolio,
    };
  });

  app.get("/api/llm-brain/providers", async (request) => {
    const principal = principalFor(request);
    const gateway = await llmRuntimeConfigurations.gateway(principal.tenantId);
    return {
      version: AIW_RELEASE.version,
      catalog: llmProviderCatalog,
      ...gateway.configuration(),
      secretValuesExposed: false,
    };
  });
  app.get("/api/llm-brain/config", async (request) => {
    const principal = principalFor(request);
    return {
      version: AIW_RELEASE.version,
      policy: await llmRuntimeConfigurations.get(principal.tenantId),
      secretValuesExposed: false,
      persistence: llmRuntimeConfigurations.persistenceMode(),
    };
  });
  app.put("/api/llm-brain/config", async (request, reply) => {
    const principal = principalFor(request);
    const routeSchema = z.object({
      id: z.string().min(3),
      purpose: z.enum(llmPurposes),
      providerId: z.enum(llmProviderIds),
      model: z.string().min(1),
      baseUrl: z.string().url().optional(),
      apiKeyEnvironmentVariable: z.string().min(3).optional(),
      protocol: z
        .enum(["responses", "chat-completions", "embeddings"])
        .optional(),
      timeoutMs: z.number().int().min(1000).max(600000).optional(),
      maxOutputTokens: z.number().int().min(64).max(100000).optional(),
      temperature: z.number().min(0).max(2).optional(),
      enabled: z.boolean(),
      fallbackRouteIds: z.array(z.string()),
      dataClassificationAllowlist: z
        .array(z.enum(["public", "internal", "confidential", "restricted"]))
        .min(1),
    });
    const parsed = z
      .object({
        policy: z.object({
          routes: z.array(routeSchema).min(1),
          modelAllowlist: z.array(z.object({
            providerId: z.enum(llmProviderIds),
            provider: z.enum(llmProviderIds).optional(),
            model: z.string().min(1),
            configuredAlias: z.string().min(1).max(200).optional(),
            requestedModel: z.string().min(1).max(200).optional(),
            resolvedModel: z.string().min(1).max(200).optional(),
            modelFamily: z.string().min(1).max(200).optional(),
            allowedSnapshots: z.array(z.string().min(1).max(200)).optional(),
            modelIdentityDecision: z.enum(['exact-model-allowlisted', 'approved-alias-explicit-snapshot', 'exact-snapshot-pinned']).optional(),
            purposes: z.array(z.enum(llmPurposes)).min(1).optional(),
            verificationReference: z.string().min(1).max(500),
            verificationTimestamp: z.string().datetime().optional(),
            verificationMethod: z.string().min(1).max(200).optional(),
          })),
          maxInputCharacters: z.number().int().min(1024).max(262144),
          allowFallback: z.boolean(),
          requireStructuredOutput: z.boolean(),
          redactSecrets: z.literal(true),
          logPrompts: z.boolean(),
          retainProviderContent: z.boolean(),
          maxRetries: z.number().int().min(0).max(2),
          circuitBreakerFailures: z.number().int().min(1).max(20),
          circuitBreakerResetSeconds: z.number().int().min(5).max(3600),
        }),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: "INVALID_LLM_RUNTIME_POLICY",
        details: parsed.error.flatten(),
      });
    if (
      parsed.data.policy.logPrompts ||
      parsed.data.policy.retainProviderContent
    )
      return reply.code(409).send({ error: "UNSAFE_LLM_RETENTION_POLICY" });
    const routes: LlmRouteConfiguration[] = parsed.data.policy.routes.map(
      (route) => ({
        id: route.id,
        purpose: route.purpose,
        providerId: route.providerId,
        model: route.model,
        enabled: route.enabled,
        fallbackRouteIds: route.fallbackRouteIds,
        dataClassificationAllowlist: route.dataClassificationAllowlist,
        ...(route.baseUrl ? { baseUrl: route.baseUrl } : {}),
        ...(route.apiKeyEnvironmentVariable
          ? { apiKeyEnvironmentVariable: route.apiKeyEnvironmentVariable }
          : {}),
        ...(route.protocol ? { protocol: route.protocol } : {}),
        ...(route.timeoutMs !== undefined
          ? { timeoutMs: route.timeoutMs }
          : {}),
        ...(route.maxOutputTokens !== undefined
          ? { maxOutputTokens: route.maxOutputTokens }
          : {}),
        ...(route.temperature !== undefined
          ? { temperature: route.temperature }
          : {}),
      }),
    );
    const policy: LlmRuntimePolicy = { ...parsed.data.policy, routes };
    return {
      version: AIW_RELEASE.version,
      policy: await llmRuntimeConfigurations.set(
        principal.tenantId,
        policy,
        principal.subject,
      ),
      secretValuesExposed: false,
    };
  });

  const knowledgeClaimSchema = z.object({
    id: z.string(),
    subjectId: z.string(),
    subjectName: z.string(),
    claimType: z.enum(knowledgeClaimTypes),
    predicate: z.string(),
    object: z.string(),
    statement: z.string(),
    polarity: z.enum([
      "supports",
      "limits",
      "requires",
      "prohibits",
      "neutral",
    ]),
    conditions: z.array(z.string()),
    limitations: z.array(z.string()),
    contextTags: z.array(z.string()),
    sourceLocations: z.array(
      z.object({
        connectorId: z.string(),
        repository: z.string(),
        revision: z.string(),
        path: z.string(),
        heading: z.string().optional(),
        lineStart: z.number().optional(),
        lineEnd: z.number().optional(),
        excerptHash: z.string(),
      }),
    ),
    extraction: z.object({
      mode: z.enum(["human", "llm", "deterministic-parser"]),
      provider: z.string().optional(),
      model: z.string().optional(),
      promptVersion: z.string().optional(),
      extractedAt: z.string(),
    }),
    sourceConfidence: z.number(),
    corroborationScore: z.number(),
    reviewStatus: z.enum([
      "candidate",
      "verified",
      "disputed",
      "rejected",
      "superseded",
    ]),
    reviewedBy: z.string().optional(),
    reviewedAt: z.string().optional(),
  });
  const sourceSnapshotSchema = z.object({
    id: z.string(),
    connectorId: z.string(),
    repositoryRevision: z.string(),
    fetchedAt: z.string(),
    etag: z.string().optional(),
    files: z.array(
      z.object({
        path: z.string(),
        blobSha: z.string(),
        sizeBytes: z.number(),
        mediaType: z.string(),
        content: z.string().optional(),
      }),
    ),
    contentHash: z.string(),
    status: z.enum(["quarantined", "analysed", "rejected", "accepted"]),
  });
  app.get("/api/knowledge-mesh/connectors", async (request) => {
    principalFor(request);
    return {
      version: "0.8.8",
      coverage: assessKnowledgeMeshCoverage(),
      connectors: knowledgeRepositoryConnectors,
      extractionContract: extractionPromptContract(),
    };
  });
  app.get("/api/knowledge-mesh/claims", async (request) => {
    principalFor(request);
    return { version: "0.8.8", claims: seedKnowledgeClaims };
  });
  app.get("/api/knowledge-mesh/releases/current", async (request) => {
    principalFor(request);
    return {
      id: "KREL-SEED-5b68d5eae03c",
      version: "0.8.7-seed",
      status: "approved",
      claimIds: seedKnowledgeClaims
        .filter((claim) => claim.reviewStatus === "verified")
        .map((claim) => claim.id),
      sourceSnapshotIds: [],
      proposalIds: [],
      checksum:
        "sha256:5b68d5eae03ce17ae0bde7d36583bbc4efd8f89ad6fb5f15f8312bcbcf8947bd",
      createdAt: "2026-07-02T00:00:00.000Z",
      createdBy: "Architecture Knowledge Council",
      notes: [
        "Seed release; external refreshes remain quarantined until approved.",
      ],
    };
  });
  app.post("/api/knowledge-mesh/retrieve", async (request, reply) => {
    principalFor(request);
    const parsed = z
      .object({
        query: z.string().min(2),
        stage: z.string().optional(),
        selectedNodeKind: z.string().optional(),
        qualityAttributeIds: z.array(z.string()).optional(),
        contextTags: z.array(z.string()).optional(),
        includeCandidateClaims: z.boolean().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_KNOWLEDGE_RETRIEVAL_REQUEST" });
    return retrieveArchitectureKnowledge({
      query: parsed.data.query,
      ...(parsed.data.stage ? { stage: parsed.data.stage } : {}),
      ...(parsed.data.selectedNodeKind
        ? { selectedNodeKind: parsed.data.selectedNodeKind }
        : {}),
      ...(parsed.data.qualityAttributeIds
        ? { qualityAttributeIds: parsed.data.qualityAttributeIds }
        : {}),
      ...(parsed.data.contextTags
        ? { contextTags: parsed.data.contextTags }
        : {}),
      ...(parsed.data.includeCandidateClaims !== undefined
        ? { includeCandidateClaims: parsed.data.includeCandidateClaims }
        : {}),
      ...(parsed.data.limit !== undefined ? { limit: parsed.data.limit } : {}),
    });
  });
  app.post("/api/knowledge-mesh/contradictions", async (request, reply) => {
    principalFor(request);
    const parsed = z
      .object({ claims: z.array(knowledgeClaimSchema).optional() })
      .safeParse(request.body ?? {});
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_KNOWLEDGE_CLAIMS" });
    return {
      contradictions: detectClaimContradictions(
        (parsed.data.claims ??
          seedKnowledgeClaims) as ArchitectureKnowledgeClaim[],
      ),
    };
  });
  app.post("/api/knowledge-mesh/proposals/preview", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        title: z.string().min(3),
        sourceSnapshotIds: z.array(z.string()).min(1),
        claims: z.array(knowledgeClaimSchema).min(1),
        affectedLibraryRecordIds: z.array(z.string()).optional(),
        recommendationRegressionIds: z.array(z.string()).optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_KNOWLEDGE_PROPOSAL" });
    return createKnowledgeProposal({
      title: parsed.data.title,
      createdBy: principal.subject,
      sourceSnapshotIds: parsed.data.sourceSnapshotIds,
      claims: parsed.data.claims as ArchitectureKnowledgeClaim[],
      ...(parsed.data.affectedLibraryRecordIds
        ? { affectedLibraryRecordIds: parsed.data.affectedLibraryRecordIds }
        : {}),
      ...(parsed.data.recommendationRegressionIds
        ? {
            recommendationRegressionIds:
              parsed.data.recommendationRegressionIds,
          }
        : {}),
    });
  });
  app.post(
    "/api/knowledge-mesh/github/refresh-preview",
    async (request, reply) => {
      principalFor(request);
      const parsed = z
        .object({ connectorId: z.string().min(1) })
        .safeParse(request.body);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ error: "INVALID_GITHUB_KNOWLEDGE_REFRESH" });
      try {
        return await previewGitHubKnowledgeRefresh({
          connectorId: parsed.data.connectorId,
          ...(process.env.AIW_GITHUB_TOKEN
            ? { token: process.env.AIW_GITHUB_TOKEN }
            : {}),
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "GITHUB_KNOWLEDGE_REFRESH_FAILED";
        return reply
          .code(message.endsWith("_DISABLED") ? 503 : 409)
          .send({ error: message });
      }
    },
  );

  app.post("/api/knowledge-mesh/github/refresh", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        connectorId: z.string().min(1),
        triggerType: z
          .enum(["scheduled", "manual", "webhook"])
          .default("manual"),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_GITHUB_KNOWLEDGE_REFRESH" });
    const job = {
      id: createId("knowledge-refresh"),
      connectorId: parsed.data.connectorId,
      triggerType: parsed.data.triggerType,
      status: "running" as const,
      requestedBy: principal.subject,
      requestedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      result: {},
    };
    await knowledgeOperations.saveRefresh(principal.tenantId, job);
    try {
      const result = await refreshGitHubKnowledge({
        connectorId: parsed.data.connectorId,
        ...(process.env.AIW_GITHUB_TOKEN
          ? { token: process.env.AIW_GITHUB_TOKEN }
          : {}),
        store: createKnowledgeObjectStore(),
      });
      const manifest = result.storedObjects.find((item) =>
        item.key.endsWith("/manifest.json"),
      );
      const status = result.quarantine.passed
        ? ("review-required" as const)
        : ("failed" as const);
      const completed = {
        ...job,
        status,
        resolvedRevision: result.revision,
        snapshotId: result.snapshot.id,
        ...(manifest ? { objectManifestUri: manifest.uri } : {}),
        completedAt: new Date().toISOString(),
        result: {
          eligibleFiles: result.eligibleFiles,
          ignoredFiles: result.ignoredFiles,
          storageAdapter: result.storageAdapter,
          quarantine: result.quarantine,
          warnings: result.warnings,
        },
      };
      await knowledgeOperations.saveObjects(
        principal.tenantId,
        result.snapshot.id,
        result.connectorId,
        result.quarantine.passed ? "quarantined" : "rejected",
        result.storedObjects,
      );
      await knowledgeOperations.saveRefresh(principal.tenantId, completed);
      return reply.code(result.quarantine.passed ? 202 : 409).send({
        job: completed,
        snapshot: result.snapshot,
        storedObjects: result.storedObjects,
        quarantine: result.quarantine,
        publicationStatus: "candidate-only",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "GITHUB_KNOWLEDGE_REFRESH_FAILED";
      await knowledgeOperations.saveRefresh(principal.tenantId, {
        ...job,
        status: "failed",
        completedAt: new Date().toISOString(),
        errorCode: message,
        result: {},
      });
      return reply
        .code(message.endsWith("_DISABLED") ? 503 : 409)
        .send({ error: message, jobId: job.id });
    }
  });
  app.post("/api/knowledge-mesh/extract", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        snapshot: sourceSnapshotSchema,
        sourcePath: z.string(),
        sourceText: z.string().min(20).max(120000),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_KNOWLEDGE_EXTRACTION_REQUEST" });
    const snapshot = {
      id: parsed.data.snapshot.id,
      connectorId: parsed.data.snapshot.connectorId,
      repositoryRevision: parsed.data.snapshot.repositoryRevision,
      fetchedAt: parsed.data.snapshot.fetchedAt,
      files: parsed.data.snapshot.files.map((file) => ({
        path: file.path,
        blobSha: file.blobSha,
        sizeBytes: file.sizeBytes,
        mediaType: file.mediaType,
        ...(file.content !== undefined ? { content: file.content } : {}),
      })),
      contentHash: parsed.data.snapshot.contentHash,
      status: parsed.data.snapshot.status,
      ...(parsed.data.snapshot.etag ? { etag: parsed.data.snapshot.etag } : {}),
    };
    try {
      const result = await extractKnowledgeClaims({
        snapshot,
        sourcePath: parsed.data.sourcePath,
        sourceText: parsed.data.sourceText,
        gateway: await llmRuntimeConfigurations.gateway(principal.tenantId),
      });
      await knowledgeOperations.saveLlmAudit(principal.tenantId, {
        executionId: createId("llm-execution"),
        purpose: "knowledge-extraction",
        routeId: result.routeId,
        providerId: result.provider,
        model: result.model,
        requestFingerprint: result.requestFingerprint,
        dataClassification: "public",
        fallbackUsed: result.fallbackUsed,
        latencyMs: result.latencyMs,
        usage: result.usage as Record<string, unknown>,
        status: "succeeded",
      });
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "KNOWLEDGE_EXTRACTION_FAILED";
      return reply
        .code(
          message.includes("NOT_CONFIGURED") ||
            message.includes("ALL_ROUTES_FAILED")
            ? 503
            : 409,
        )
        .send({ error: message });
    }
  });

  app.get("/api/knowledge-vector/health", async (request, reply) => {
    principalFor(request);
    if (!process.env.DATABASE_URL)
      return reply.code(503).send({
        ready: false,
        error: "DATABASE_URL_REQUIRED_FOR_VECTOR_STORE",
      });
    const store = new ApprovedKnowledgeVectorStore();
    try {
      return await store.health();
    } finally {
      await store.close();
    }
  });
  app.post("/api/knowledge-vector/reindex", async (request, reply) => {
    const principal = principalFor(request);
    if (process.env.AIW_ENABLE_VECTOR_INDEXING !== "true")
      return reply.code(503).send({ error: "VECTOR_INDEXING_DISABLED" });
    if (!process.env.DATABASE_URL)
      return reply
        .code(503)
        .send({ error: "DATABASE_URL_REQUIRED_FOR_VECTOR_STORE" });
    const parsed = z
      .object({
        releaseId: z.string().default("AKR-0.10.60"),
        recordIds: z.array(z.string()).max(500).optional(),
        limit: z.number().int().min(1).max(500).default(500),
      })
      .safeParse(request.body ?? {});
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_VECTOR_REINDEX_REQUEST" });
    const records = sprint78PatternCorpus
      .filter(
        (record) =>
          !parsed.data.recordIds || parsed.data.recordIds.includes(record.id),
      )
      .slice(0, parsed.data.limit);
    const store = new ApprovedKnowledgeVectorStore();
    try {
      const indexed = [];
      for (const record of records)
        indexed.push(
          await store.upsert(principal.tenantId, {
            releaseId: parsed.data.releaseId,
            recordType:
              record.recordType === "anti-pattern"
                ? "anti-pattern"
                : record.recordType === "topology-template"
                  ? "topology-template"
                  : "pattern",
            recordId: record.id,
            sourceText: [
              record.name,
              record.summary,
              record.problem,
              ...record.context,
              ...record.forces,
              ...record.tags,
            ].join(" "),
            metadata: {
              category: record.category,
              lifecycle: record.lifecycle,
              evidenceConnectorIds: record.evidence.map(
                (item) => item.connectorId,
              ),
            },
          }),
        );
      return {
        releaseId: parsed.data.releaseId,
        indexed: indexed.length,
        embeddingModels: [...new Set(indexed.map((item) => item.model))],
      };
    } finally {
      await store.close();
    }
  });
  app.post("/api/knowledge-vector/search", async (request, reply) => {
    const principal = principalFor(request);
    if (!process.env.DATABASE_URL)
      return reply
        .code(503)
        .send({ error: "DATABASE_URL_REQUIRED_FOR_VECTOR_STORE" });
    const parsed = z
      .object({
        releaseId: z.string().default("AKR-0.10.60"),
        query: z.string().min(2).max(4000),
        limit: z.number().int().min(1).max(50).default(12),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_VECTOR_SEARCH_REQUEST" });
    const store = new ApprovedKnowledgeVectorStore();
    try {
      return {
        releaseId: parsed.data.releaseId,
        hits: await store.search(
          principal.tenantId,
          parsed.data.releaseId,
          parsed.data.query,
          parsed.data.limit,
        ),
      };
    } finally {
      await store.close();
    }
  });
}
