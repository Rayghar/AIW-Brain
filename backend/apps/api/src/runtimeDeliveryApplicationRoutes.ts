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

export async function registerRuntimeDeliveryApplicationRoutes(context: ApplicationRouteContext) {
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

  app.post("/api/runtime-inventories/import", async (request, reply) => {
    const parsed = z
      .object({
        project: architectureProjectSchema,
        name: z.string().min(1),
        sourceType: z.enum([
          "kubernetes",
          "terraform-state",
          "openapi",
          "manual",
          "aws",
          "azure",
          "gcp",
          "telemetry",
        ]),
        raw: z.unknown(),
        sourceRevision: z.string().optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: "INVALID_RUNTIME_INVENTORY",
        details: parsed.error.flatten(),
      });
    if (!tenantProject(parsed.data.project, principalFor(request)))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    return importRuntimeInventory(
      parsed.data.project,
      parsed.data.name,
      parsed.data.sourceType as RuntimeInventorySource,
      parsed.data.raw,
      parsed.data.sourceRevision,
    );
  });
  app.post("/api/drift/analyse", async (request, reply) => {
    const parsed = z
      .object({
        project: architectureProjectSchema,
        inventory: runtimeInventorySchema,
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: "INVALID_DRIFT_REQUEST",
        details: parsed.error.flatten(),
      });
    if (
      !tenantProject(parsed.data.project, principalFor(request)) ||
      parsed.data.inventory.tenantId !== parsed.data.project.tenantId
    )
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    return analyseArchitectureDrift(parsed.data.project, parsed.data.inventory);
  });
  app.post("/api/policy-gates/evaluate", async (request, reply) => {
    markArchitectureBrainCompatibilityAlias(
      reply,
      "/api/architecture-brain/workspace-projection",
    );
    const parsed = z
      .object({
        project: architectureProjectSchema,
        gate: architecturePolicyGateSchema,
        inventory: runtimeInventorySchema.optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: "INVALID_POLICY_GATE_REQUEST",
        details: parsed.error.flatten(),
      });
    if (!tenantProject(parsed.data.project, principalFor(request)))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    return architectureBrain.evaluatePolicyGate({
      project: parsed.data.project,
      gate: parsed.data.gate,
      ...(parsed.data.inventory ? { inventory: parsed.data.inventory } : {}),
    });
  });
  app.get("/api/durable-events/pending", async (request) =>
    durableEvents.pending(principalFor(request).tenantId, 100),
  );
  app.post("/api/durable-events/dispatch", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        settings: z
          .object({
            adapter: z.enum([
              "memory",
              "webhook",
              "kafka",
              "service-bus",
              "pubsub",
            ]),
            endpointReference: z.string().optional(),
            topic: z.string(),
            maxAttempts: z.number().int().positive(),
            retryDelayMs: z.number().int().nonnegative(),
            deadLetterEnabled: z.boolean(),
          })
          .optional(),
      })
      .safeParse(request.body ?? {});
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_BROKER_SETTINGS" });
    return outboxWorker.dispatch(
      principal.tenantId,
      (parsed.data.settings ??
        sampleProject.eventBrokerSettings) as EventBrokerSettings,
      100,
    );
  });

  app.get("/api/collectors/health", async (request) => {
    const principal = principalFor(request);
    const project =
      (await repository.getProject(
        principal.tenantId,
        sampleProject.id,
        sampleProject.branch.id,
      )) ?? sampleProject;
    return collectorHealth(project);
  });
  app.post("/api/collectors/run", async (request, reply) => {
    const parsed = z
      .object({
        project: architectureProjectSchema,
        collector: inventoryCollectorSchema,
        raw: z.unknown(),
        sourceRevision: z.string().optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: "INVALID_COLLECTOR_RUN",
        details: parsed.error.flatten(),
      });
    if (!tenantProject(parsed.data.project, principalFor(request)))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    return executeCollector(
      parsed.data.project,
      parsed.data.collector,
      parsed.data.raw,
      parsed.data.sourceRevision,
    );
  });
  app.post("/api/topology/from-telemetry", async (request, reply) => {
    const parsed = z
      .object({
        project: architectureProjectSchema,
        name: z.string().min(1),
        spans: z.array(telemetrySpanEvidenceSchema).min(1),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: "INVALID_TELEMETRY_TOPOLOGY",
        details: parsed.error.flatten(),
      });
    if (!tenantProject(parsed.data.project, principalFor(request)))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    return deriveTopologyFromTelemetry(
      parsed.data.project,
      parsed.data.name,
      parsed.data.spans,
    );
  });
  app.post("/api/operational-drift/analyse", async (request, reply) => {
    const parsed = z
      .object({
        project: architectureProjectSchema,
        inventory: runtimeInventorySchema,
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: "INVALID_OPERATIONAL_DRIFT",
        details: parsed.error.flatten(),
      });
    if (!tenantProject(parsed.data.project, principalFor(request)))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    return analyseOperationalDrift(parsed.data.project, parsed.data.inventory);
  });
  app.post("/api/drift-waivers", async (request, reply) => {
    const parsed = z
      .object({
        project: architectureProjectSchema,
        findingId: z.string(),
        reason: z.string().min(1),
        ownerId: z.string(),
        approvedBy: z.string(),
        expiresAt: z.string(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_DRIFT_WAIVER" });
    const principal = principalFor(request);
    if (
      !tenantProject(parsed.data.project, principal) ||
      parsed.data.approvedBy !== principal.subject
    )
      return reply.code(403).send({ error: "ACTOR_OR_TENANT_MISMATCH" });
    try {
      return createDriftWaiver(
        parsed.data.findingId,
        parsed.data.reason,
        parsed.data.ownerId,
        parsed.data.approvedBy,
        parsed.data.expiresAt,
      );
    } catch (error) {
      return reply.code(409).send({
        error: error instanceof Error ? error.message : "WAIVER_FAILED",
      });
    }
  });
  app.post("/api/drift-waivers/expire", async (request, reply) => {
    const parsed = z
      .object({
        project: architectureProjectSchema,
        now: z.string().optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_WAIVER_EXPIRY" });
    return expireDriftWaivers(
      parsed.data.project.driftWaivers,
      parsed.data.now ? new Date(parsed.data.now) : new Date(),
    );
  });
  app.post("/api/remediation-plans", async (request, reply) => {
    const parsed = z
      .object({
        project: architectureProjectSchema,
        report: operationalDriftReportSchema,
        createdBy: z.string(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_REMEDIATION_PLAN" });
    if (parsed.data.createdBy !== principalFor(request).subject)
      return reply.code(403).send({ error: "ACTOR_MISMATCH" });
    return createRemediationPlan(parsed.data.report, parsed.data.createdBy);
  });
  app.post("/api/remediation-plans/submit", async (request, reply) => {
    const parsed = z
      .object({ plan: remediationPlanSchema })
      .safeParse(request.body);
    return parsed.success
      ? submitRemediationPlan(parsed.data.plan)
      : reply.code(400).send({ error: "INVALID_REMEDIATION_PLAN" });
  });
  app.post("/api/remediation-plans/decide", async (request, reply) => {
    const parsed = z
      .object({
        plan: remediationPlanSchema,
        approved: z.boolean(),
        approver: z.string(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_REMEDIATION_DECISION" });
    if (parsed.data.approver !== principalFor(request).subject)
      return reply.code(403).send({ error: "ACTOR_MISMATCH" });
    try {
      return decideRemediationPlan(
        parsed.data.plan,
        parsed.data.approved,
        parsed.data.approver,
      );
    } catch (error) {
      return reply.code(409).send({
        error:
          error instanceof Error
            ? error.message
            : "REMEDIATION_DECISION_FAILED",
      });
    }
  });
  app.post("/api/slos/evaluate", async (request, reply) => {
    const parsed = z
      .object({
        slo: serviceLevelObjectiveSchema,
        observedValue: z.number(),
        alertPolicies: z.array(
          z.object({
            id: z.string(),
            sloId: z.string(),
            name: z.string(),
            channels: z.array(z.enum(["email", "webhook", "pager", "chat"])),
            severity: z.enum(["warning", "critical"]),
            burnRateThreshold: z.number(),
            evaluationWindowMinutes: z.number(),
            enabled: z.boolean(),
          }),
        ),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_SLO_EVALUATION" });
    const evaluation = evaluateSlo(parsed.data.slo, parsed.data.observedValue);
    return {
      evaluation,
      triggeredPolicies: triggeredAlertPolicies(
        evaluation,
        parsed.data.alertPolicies,
      ),
    };
  });
  app.post("/api/repositories/pull-request-preview", async (request, reply) => {
    const parsed = z
      .object({ project: architectureProjectSchema, bindingId: z.string() })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_PULL_REQUEST_PREVIEW" });
    const binding = parsed.data.project.repositoryBindings.find(
      (item) => item.id === parsed.data.bindingId,
    );
    if (!binding)
      return reply.code(404).send({ error: "REPOSITORY_BINDING_NOT_FOUND" });
    const library = await loadKnowledgeLibrary();
    const bundle = compileArtifacts(
      parsed.data.project,
      library,
      await architectureBrain.recommendations(parsed.data.project),
    );
    return createPullRequestPreview(parsed.data.project, binding, bundle);
  });

  app.post("/api/repositories/pull-request", async (request, reply) => {
    const parsed = z
      .object({
        project: architectureProjectSchema,
        bindingId: z.string(),
        approved: z.literal(true),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "EXPLICIT_APPROVAL_REQUIRED" });
    const principal = principalFor(request);
    if (
      !tenantProject(parsed.data.project, principal) ||
      !canPerform(parsed.data.project, principal.subject, "artifact.generate")
    )
      return reply.code(403).send({ error: "FORBIDDEN" });
    if (process.env.AIW_ENABLE_REPOSITORY_WRITES !== "true")
      return reply.code(503).send({ error: "REPOSITORY_WRITES_DISABLED" });
    const binding = parsed.data.project.repositoryBindings.find(
      (item) => item.id === parsed.data.bindingId,
    );
    if (!binding)
      return reply.code(404).send({ error: "REPOSITORY_BINDING_NOT_FOUND" });
    const library = await loadKnowledgeLibrary();
    const bundle = compileArtifacts(
      parsed.data.project,
      library,
      await architectureBrain.recommendations(parsed.data.project),
    );
    try {
      return await openRepositoryPullRequest(
        parsed.data.project,
        binding,
        bundle,
        process.env.AIW_REPOSITORY_TOKEN ?? "",
      );
    } catch (error) {
      return reply.code(502).send({
        error: error instanceof Error ? error.message : "PULL_REQUEST_FAILED",
      });
    }
  });

  app.post("/api/repositories/sync-preview", async (request, reply) => {
    const parsed = z
      .object({ project: architectureProjectSchema, bindingId: z.string() })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_REPOSITORY_SYNC_REQUEST" });
    const principal = principalFor(request);
    if (!tenantProject(parsed.data.project, principal))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    const binding = parsed.data.project.repositoryBindings.find(
      (item) => item.id === parsed.data.bindingId,
    );
    if (!binding)
      return reply.code(404).send({ error: "REPOSITORY_BINDING_NOT_FOUND" });
    const library = await loadKnowledgeLibrary();
    const bundle = compileArtifacts(
      parsed.data.project,
      library,
      await architectureBrain.recommendations(parsed.data.project),
    );
    return {
      provider: binding.provider,
      repositoryUrl: binding.repositoryUrl,
      branch: binding.defaultBranch,
      commitMessage: `Update AIW architecture revision ${parsed.data.project.revision}`,
      files: bundle.files.map((file) => ({
        path: file.path,
        mediaType: file.mediaType,
        bytes: Buffer.byteLength(file.content),
      })),
      warning:
        "Preview only. A provider-specific connector and reviewed credentials are required to push changes.",
    };
  });

  app.post("/api/artifacts", async (request, reply) =>
    projectEndpoint(request, reply, async (project) =>
      compileArtifacts(
        project,
        await loadKnowledgeLibrary(),
        await architectureBrain.recommendations(project),
      ),
    ),
  );

  app.post("/api/projects/:projectId/snapshots", async (request, reply) => {
    const principal = principalFor(request);
    const params = z
      .object({ projectId: z.string() })
      .safeParse(request.params);
    const body = snapshotRequestSchema.safeParse(request.body);
    if (
      !params.success ||
      !body.success ||
      params.data.projectId !== body.data.project.id ||
      !tenantProject(body.data.project, principal)
    )
      return reply.code(400).send({ error: "INVALID_SNAPSHOT_REQUEST" });
    return reply.code(201).send(await repository.saveSnapshot(body.data));
  });
  app.get("/api/projects/:projectId/snapshots", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({ projectId: z.string() })
      .safeParse(request.params);
    return parsed.success
      ? repository.listSnapshots(principal.tenantId, parsed.data.projectId)
      : reply.code(400).send({ error: "INVALID_PROJECT_ID" });
  });
  app.get(
    "/api/projects/:projectId/snapshots/:snapshotId",
    async (request, reply) => {
      const principal = principalFor(request);
      const parsed = z
        .object({ projectId: z.string(), snapshotId: z.string() })
        .safeParse(request.params);
      if (!parsed.success)
        return reply.code(400).send({ error: "INVALID_SNAPSHOT_ID" });
      return (
        (await repository.getSnapshot(
          principal.tenantId,
          parsed.data.projectId,
          parsed.data.snapshotId,
        )) ?? reply.code(404).send({ error: "SNAPSHOT_NOT_FOUND" })
      );
    },
  );

  app.post("/api/authorize", async (request, reply) => {
    const parsed = z
      .object({
        project: architectureProjectSchema,
        actorId: z.string(),
        permission: z.enum([
          "project.read",
          "project.edit",
          "branch.create",
          "branch.merge",
          "review.assign",
          "review.decide",
          "approval.request",
          "approval.decide",
          "comment.create",
          "comment.resolve",
          "member.manage",
          "rulepack.manage",
          "artifact.generate",
        ]),
      })
      .safeParse(request.body);
    return parsed.success
      ? {
          allowed:
            tenantProject(parsed.data.project, principalFor(request)) &&
            canPerform(
              parsed.data.project,
              parsed.data.actorId,
              parsed.data.permission,
            ),
        }
      : reply.code(400).send({ error: "INVALID_AUTHORIZATION_CHECK" });
  });
}
