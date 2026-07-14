import Fastify, { type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
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
import { registerApplicationRoutes } from "./registerApplicationRoutes.js";
import { createArchitectureBrainOrchestrator } from "./architectureBrainOrchestrator.js";
import { createBrainTransactionRepository, type BrainTransactionRepository } from "./brainTransactionRepository.js";
import { findArchitectureBrainReceipt, parseJsonResponsePayload, summarizeArchitectureBrainResponse } from "./brainTransactionRecording.js";

export interface BuildAppOptions {
  repository?: ProjectRepository;
  logger?: boolean;
  eventHub?: TenantEventHub;
  auditLog?: AuditLog;
  idempotencyStore?: IdempotencyStore;
  telemetry?: TelemetryRuntime;
  durableEventStore?: DurableEventStore;
  oidcVerifier?: OidcJwksVerifier;
  eventBroker?: EventBrokerAdapter;
  knowledgeOperationsRepository?: KnowledgeOperationsRepository;
  synthesisRepository?: SynthesisRepository;
  platformAcceptanceRepository?: PlatformAcceptanceRepository;
  brainTransactionRepository?: BrainTransactionRepository;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const repository = options.repository ?? createProjectRepository();
  const eventHub = options.eventHub ?? new TenantEventHub();
  const auditLog = options.auditLog ?? new AuditLog();
  const idempotency = options.idempotencyStore ?? new IdempotencyStore();
  const telemetry = options.telemetry ?? new TelemetryRuntime("aiw-api");
  const durableEvents = options.durableEventStore ?? createDurableEventStore();
  const oidcVerifier = options.oidcVerifier ?? new OidcJwksVerifier();
  const eventBroker =
    options.eventBroker ?? createEventBroker(sampleProject.eventBrokerSettings);
  const outboxWorker = new OutboxWorker(durableEvents, eventHub, eventBroker);
  const knowledgeOperations =
    options.knowledgeOperationsRepository ??
    createKnowledgeOperationsRepository();
  const synthesisRepository =
    options.synthesisRepository ?? createSynthesisRepository();
  const platformAcceptanceRepository =
    options.platformAcceptanceRepository ??
    createPlatformAcceptanceRepository();
  const architectureBrain = createArchitectureBrainOrchestrator();
  const brainTransactions = options.brainTransactionRepository ?? createBrainTransactionRepository();
  const referenceSampleProject = withReferenceMembers(sampleProject);
  if (
    !(await repository.getProject(
      referenceSampleProject.tenantId,
      referenceSampleProject.id,
      referenceSampleProject.branch.id,
    ))
  )
    await repository.saveProject(referenceSampleProject);

  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: 8 * 1024 * 1024,
    requestIdHeader: "x-correlation-id",
  });
  const allowedOrigins = process.env.AIW_CORS_ORIGIN?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  await app.register(cors, {
    origin: allowedOrigins?.length ? allowedOrigins : true,
    credentials: true,
  });
  app.addHook("onRequest", async (request, reply) => {
    const context = telemetry.beginRequest(
      request.id,
      request.method,
      request.routeOptions.url ?? request.url,
      typeof request.headers.traceparent === "string"
        ? request.headers.traceparent
        : undefined,
    );
    reply.header("traceparent", context.traceparent);
    reply.header("x-correlation-id", request.id);
  });
  app.addHook("onResponse", async (request, reply) => {
    telemetry.endRequest(request.id, reply.statusCode);
  });
  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("referrer-policy", "no-referrer");
    reply.header("x-frame-options", "DENY");
    reply.header(
      "permissions-policy",
      "camera=(), microphone=(), geolocation=()",
    );
    return payload;
  });
  app.addHook("onSend", async (request, reply, payload) => {
    if (reply.statusCode < 200 || reply.statusCode >= 300) return payload;
    const contentType = String(reply.getHeader("content-type") ?? "");
    if (!contentType.includes("application/json")) return payload;
    const response = parseJsonResponsePayload(payload);
    const receipt = findArchitectureBrainReceipt(response);
    if (!receipt) return payload;
    const principal = principalFor(request);
    const transaction = await brainTransactions.recordProposal({
      tenantId: principal.tenantId,
      actorId: principal.subject,
      actorRoles: principal.roles ?? [],
      correlationId: request.id,
      receipt,
      summary: summarizeArchitectureBrainResponse(receipt, response),
    });
    reply.header("x-aiw-brain-transaction-id", transaction.id);
    reply.header("x-aiw-brain-transaction-version", String(transaction.version));
    reply.header("x-aiw-brain-transaction-status", transaction.status);
    return payload;
  });
  app.setErrorHandler((error, _request, reply) => {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "UNAUTHENTICATED")
      return reply.code(401).send({ error: "UNAUTHENTICATED" });
    if (message === "TENANT_BOUNDARY_VIOLATION")
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    app.log.error(error);
    return reply.code(500).send({ error: "INTERNAL_SERVER_ERROR" });
  });
  app.addHook("onClose", async () => {
    await repository.close();
    await durableEvents.close();
    await knowledgeOperations.close();
    await synthesisRepository.close();
    await platformAcceptanceRepository.close();
    await brainTransactions.close();
  });

  async function publishActivity(
    input: Omit<ActivityEvent, "id" | "createdAt">,
  ): Promise<ActivityEvent> {
    const activity: ActivityEvent = {
      ...input,
      id: createId("activity"),
      createdAt: new Date().toISOString(),
    };
    const record = await durableEvents.append({
      tenantId: input.tenantId,
      aggregateType: "architecture-project",
      aggregateId: input.projectId,
      eventType: input.type,
      payload: activity,
    });
    try {
      eventHub.publishPrepared(activity);
      await durableEvents.markPublished(record.id);
    } catch (error) {
      await durableEvents.markFailed(
        record.id,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
    return activity;
  }

  await registerApplicationRoutes({
    app,
    repository,
    eventHub,
    auditLog,
    idempotency,
    telemetry,
    durableEvents,
    oidcVerifier,
    eventBroker,
    outboxWorker,
    knowledgeOperations,
    synthesisRepository,
    platformAcceptanceRepository,
    referenceSampleProject,
    publishActivity,
    architectureBrain,
    brainTransactions,
  });

  return app;
}
