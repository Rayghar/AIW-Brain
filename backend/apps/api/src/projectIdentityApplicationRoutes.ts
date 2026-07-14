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
  getArchitectureDesignGraphStateAuthority,
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
export async function registerProjectIdentityApplicationRoutes(context: ApplicationRouteContext) {
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
  async function loadCanonicalBrainProject(input: {
    request: FastifyRequest;
    reply: any;
    projectId: string;
    branchId: string;
    expectedRevision: number;
  }): Promise<ArchitectureProject | undefined> {
    const principal = principalFor(input.request);
    const project = await repository.getProject(
      principal.tenantId,
      input.projectId,
      input.branchId,
    );
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
  app.get("/api/projects/demo", async (request, reply) => {
    const principal = principalFor(request);
    if (principal.tenantId !== referenceSampleProject.tenantId)
      return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
    const project =
      (await repository.getProject(
        referenceSampleProject.tenantId,
        referenceSampleProject.id,
        referenceSampleProject.branch.id,
      )) ?? referenceSampleProject;
    if (!canPerform(project, principal.subject, "project.read"))
      return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
    return project;
  });
  app.post("/api/projects", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        name: z.string().min(2).max(120),
        description: z.string().max(2000).optional(),
        template: z
          .enum([
            "blank",
            "reference",
            "microservice",
            "event-driven",
            "cloud-migration",
            "review-existing",
            "sdd-import",
            "repo-import",
          ])
          .default("blank"),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: "INVALID_PROJECT_CREATE_REQUEST",
        details: parsed.error.flatten(),
      });
    const now = new Date().toISOString();
    const project = structuredClone(sampleProject);
    project.id = createId("project");
    project.tenantId = principal.tenantId;
    project.name = parsed.data.name;
    const starterDescriptions: Record<string, string> = {
      blank: "",
      reference: sampleProject.description,
      microservice:
        "Guided starter for service boundaries, APIs, ownership, reliability and security obligations.",
      "event-driven":
        "Guided starter for events, brokers, outbox/idempotency, replay and observability decisions.",
      "cloud-migration":
        "Guided starter for platform migration, environment strategy, security controls and deployment posture.",
      "review-existing":
        "Guided review starter for an existing SDD, solution design or architecture decision package.",
      "sdd-import":
        "Document-first starter prepared for SDD, requirements and evidence extraction.",
      "repo-import":
        "Repository-evidence starter prepared for read-only connector setup and conformance checks.",
    };
    project.description =
      parsed.data.description ??
      starterDescriptions[parsed.data.template] ??
      "";
    project.branch = {
      id: "branch-main",
      name: "Main architecture",
      description: "Primary governed architecture baseline.",
      baseRevision: 0,
      status: "active",
      createdAt: now,
    };
    project.members = [
      {
        id: principal.subject,
        displayName: principal.displayName,
        email: principal.email,
        role: "owner",
        status: "active",
        joinedAt: now,
      },
    ];
    // The authorised reference role switcher represents multiple named project
    // collaborators. Seed those memberships only in explicit development-auth
    // mode so role journeys exercise the same project without weakening the
    // production membership boundary.
    if (process.env.AIW_ALLOW_DEV_AUTH === "true") {
      project.members = withReferenceMembers(project).members;
    }
    project.revision = 0;
    project.updatedAt = now;
    project.stageApprovals = [];
    project.reviewAssignments = [];
    project.discussionThreads = [];
    project.notifications = [];
    project.decisions = [];
    project.findings = [];
    if (parsed.data.template !== "reference") {
      const starterObjectives: Record<string, string[]> = {
        blank: [],
        reference: sampleProject.objectives,
        microservice: [
          "Define service boundaries, API contracts and ownership model.",
        ],
        "event-driven": [
          "Identify business events, asynchronous flows and failure-handling obligations.",
        ],
        "cloud-migration": [
          "Define target platform posture, runtime controls and migration sequencing.",
        ],
        "review-existing": [
          "Assess existing architecture readiness, risks, decisions and evidence gaps.",
        ],
        "sdd-import": [
          "Extract design intent, constraints and decisions from source documents.",
        ],
        "repo-import": [
          "Validate repository evidence against architecture model and conformance rules.",
        ],
      };
      project.objectives = starterObjectives[parsed.data.template] ?? [];
      project.constraints = [];
      project.assumptions = [];
      project.qualityPriorities = [
        {
          attributeId: "modifiability",
          weight: 4,
          rationale: "Default starter priority; refine during guided brief.",
        },
        {
          attributeId: "security",
          weight: 4,
          rationale: "Default starter priority; refine during guided brief.",
        },
      ];
      project.qualityScenarios = [];
      project.styleDecisions = [];
      project.patternSelections = [];
      project.nodes = [];
      project.edges = [];
      project.runtimeInventories = [];
      project.driftReports = [];
      project.operationalDriftReports = [];
      project.remediationPlans = [];
      project.activeStage = "designIntent";
    }
    await repository.saveProject(project);
    return reply.code(201).send(project);
  });
  app.get("/api/projects", async (request) =>
    repository.listProjects(principalFor(request).tenantId),
  );

  app.post("/api/auth/development-token", async (request, reply) => {
    if (process.env.AIW_ALLOW_DEV_AUTH === "false")
      return reply.code(404).send({ error: "NOT_FOUND" });
    const parsed = z
      .object({
        subject: z.string(),
        email: z.string().email(),
        displayName: z.string(),
        tenantId: z.string().default(DEFAULT_TENANT_ID),
        ttlMinutes: z.number().int().positive().max(720).default(60),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_TOKEN_REQUEST" });
    const now = new Date();
    const principal: AuthenticatedPrincipal = {
      subject: parsed.data.subject,
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      tenantId: parsed.data.tenantId,
      providerId: "idp-reference-development",
      issuedAt: now.toISOString(),
      expiresAt: new Date(
        now.getTime() + parsed.data.ttlMinutes * 60_000,
      ).toISOString(),
    };
    return {
      token: issueDevelopmentToken(
        principal,
        process.env.AIW_DEV_TOKEN_SECRET ?? "local-development-only-change-me",
      ),
      principal,
    };
  });

  app.get("/api/auth/session", async (request) => {
    const principal = principalFor(request);
    const accessMode = principal.authMode ?? "development";
    return {
      principal,
      authenticated:
        accessMode !== "development" || Boolean(request.headers.authorization),
      accessMode,
      developmentAuthEnabled: process.env.AIW_ALLOW_DEV_AUTH !== "false",
      guidance:
        accessMode === "development-token"
          ? "Development tenant token accepted. This is suitable for localhost evaluation only."
          : "No bearer token was supplied. AIW is using the local development access fallback.",
    };
  });

  app.post("/api/auth/oidc/verify", async (request, reply) => {
    const parsed = z
      .object({
        provider: z.object({
          id: z.string(),
          tenantId: z.string(),
          type: z.literal("oidc"),
          name: z.string(),
          issuer: z.string(),
          clientId: z.string(),
          scopes: z.array(z.string()),
          enabled: z.boolean(),
        }),
        token: z.string().min(20),
        tenantId: z.string(),
      })
      .safeParse(request.body);
    if (
      !parsed.success ||
      parsed.data.provider.tenantId !== parsed.data.tenantId
    )
      return reply
        .code(400)
        .send({ error: "INVALID_OIDC_VERIFICATION_REQUEST" });
    try {
      return {
        principal: await oidcVerifier.verify(
          parsed.data.token,
          parsed.data.provider,
          parsed.data.tenantId,
        ),
      };
    } catch (error) {
      return reply.code(401).send({
        error:
          error instanceof Error ? error.message : "OIDC_VERIFICATION_FAILED",
      });
    }
  });

  app.get(
    "/api/projects/:projectId/branches/:branchId",
    async (request, reply) => {
      const parsed = projectParamsSchema.safeParse(request.params);
      if (!parsed.success)
        return reply.code(400).send({ error: "INVALID_PROJECT_BRANCH" });
      const principal = principalFor(request);
      const project = await repository.getProject(
        principal.tenantId,
        parsed.data.projectId,
        parsed.data.branchId,
      );
      if (!project || !canPerform(project, principal.subject, "project.read"))
        return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
      return project;
    },
  );

  app.put(
    "/api/projects/:projectId/branches/:branchId",
    async (request, reply) => {
      const params = projectParamsSchema.safeParse(request.params);
      const body = z
        .object({
          project: architectureProjectSchema,
          expectedRevision: z.number().int().nonnegative().optional(),
        })
        .safeParse(request.body);
      if (
        !params.success ||
        !body.success ||
        body.data.project.id !== params.data.projectId ||
        body.data.project.branch.id !== params.data.branchId
      )
        return reply.code(400).send({ error: "INVALID_PROJECT_SAVE" });
      const principal = principalFor(request);
      let project = body.data.project;
      if (!tenantProject(project, principal))
        return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
      const existing = await repository.getProject(
        principal.tenantId,
        params.data.projectId,
        params.data.branchId,
      );
      if (!existing)
        return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
      if (
        getArchitectureDesignGraphStateAuthority(existing.designGraph)
        && !getArchitectureDesignGraphStateAuthority(project.designGraph)
      ) {
        project = { ...project, designGraph: existing.designGraph };
      }
      if (!canPerform(existing, principal.subject, "project.edit"))
        return reply.code(403).send({ error: "FORBIDDEN:project.edit" });
      if (
        !memberSetsMatch(existing.members, project.members) &&
        !canPerform(existing, principal.subject, "member.manage")
      )
        return reply.code(403).send({ error: "FORBIDDEN:member.manage" });
      const key = String(
        request.headers["idempotency-key"] ?? `save-${request.id}`,
      );
      try {
        const result = await idempotency.execute(
          principal.tenantId,
          `project-save:${project.id}:${project.branch.id}`,
          key,
          request.body,
          async () =>
            repository.saveProject(project, body.data.expectedRevision),
        );
        await publishActivity({
          tenantId: project.tenantId,
          projectId: project.id,
          branchId: project.branch.id,
          type: "project.saved",
          actorId: principal.subject,
          summary: `Saved revision ${project.revision}`,
          revision: project.revision,
          correlationId: request.id,
        });
        auditLog.append({
          tenantId: project.tenantId,
          projectId: project.id,
          branchId: project.branch.id,
          actorId: principal.subject,
          eventType: "project",
          action: "save",
          targetType: "branch",
          targetId: project.branch.id,
          outcome: "success",
          correlationId: request.id,
          retentionDays: project.securitySettings.auditRetentionDays,
          metadata: { revision: project.revision, replayed: result.replayed },
        });
        return reply
          .header("idempotency-replayed", String(result.replayed))
          .send(result.response);
      } catch (error) {
        if (error instanceof RepositoryRevisionConflict)
          return reply.code(409).send({
            error: "REVISION_CONFLICT",
            currentRevision: error.currentRevision,
          });
        if (
          error instanceof Error &&
          error.message.startsWith("IDEMPOTENCY_KEY")
        )
          return reply.code(409).send({ error: error.message });
        throw error;
      }
    },
  );

  app.post(
    "/api/projects/:projectId/branches/:branchId/operations",
    async (request, reply) => {
      const params = projectParamsSchema.safeParse(request.params);
      const body = collaborationOperationBatchSchema.safeParse(request.body);
      if (
        !params.success ||
        !body.success ||
        body.data.projectId !== params.data.projectId ||
        body.data.branchId !== params.data.branchId
      )
        return reply.code(400).send({
          error: "INVALID_OPERATION_BATCH",
          details: body.success ? undefined : body.error.flatten(),
        });
      const principal = principalFor(request);
      if (
        body.data.tenantId !== principal.tenantId ||
        body.data.actorId !== principal.subject
      )
        return reply.code(403).send({ error: "TENANT_OR_ACTOR_MISMATCH" });
      const project = await repository.getProject(
        principal.tenantId,
        params.data.projectId,
        params.data.branchId,
      );
      if (!project) return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
      try {
        const result = await idempotency.execute(
          principal.tenantId,
          `operations:${project.id}:${project.branch.id}`,
          body.data.idempotencyKey,
          body.data,
          async () => {
            const updated = applyCollaborationOperations(project, body.data);
            return repository.saveProject(updated, project.revision);
          },
        );
        await publishActivity({
          tenantId: project.tenantId,
          projectId: project.id,
          branchId: project.branch.id,
          type: "architecture.operations-applied",
          actorId: principal.subject,
          summary: `${body.data.operations.length} operation(s) applied`,
          revision: result.response.revision,
          correlationId: request.id,
        });
        auditLog.append({
          tenantId: project.tenantId,
          projectId: project.id,
          branchId: project.branch.id,
          actorId: principal.subject,
          eventType: "collaboration",
          action: "apply-operations",
          targetType: "branch",
          targetId: project.branch.id,
          outcome: "success",
          correlationId: request.id,
          retentionDays: project.securitySettings.auditRetentionDays,
          metadata: {
            operationId: body.data.operationId,
            operationCount: body.data.operations.length,
            replayed: result.replayed,
          },
        });
        return reply
          .header("idempotency-replayed", String(result.replayed))
          .send(result.response);
      } catch (error) {
        if (
          error instanceof OptimisticConcurrencyError ||
          error instanceof RepositoryRevisionConflict
        )
          return reply.code(409).send({
            error: "REVISION_CONFLICT",
            currentRevision: error.currentRevision,
          });
        if (error instanceof Error && error.message.startsWith("FORBIDDEN"))
          return reply.code(403).send({ error: error.message });
        if (
          error instanceof Error &&
          error.message.startsWith("IDEMPOTENCY_KEY")
        )
          return reply.code(409).send({ error: error.message });
        throw error;
      }
    },
  );

  app.get("/api/roles/:role/permissions", async (request, reply) => {
    const parsed = z
      .object({
        role: z.enum([
          "owner",
          "architect",
          "reviewer",
          "governance",
          "contributor",
          "viewer",
        ]),
      })
      .safeParse(request.params);
    return parsed.success
      ? {
          role: parsed.data.role,
          permissions: permissionsForRole(parsed.data.role),
        }
      : reply.code(400).send({ error: "INVALID_ROLE" });
  });

  app.get(
    "/api/security/posture/:projectId/:branchId",
    async (request, reply) => {
      const params = projectParamsSchema.safeParse(request.params);
      if (!params.success)
        return reply.code(400).send({ error: "INVALID_PROJECT_BRANCH" });
      const principal = principalFor(request);
      const project = await repository.getProject(
        principal.tenantId,
        params.data.projectId,
        params.data.branchId,
      );
      if (!project) return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
      return {
        tenantId: project.tenantId,
        securitySettings: project.securitySettings,
        identityProviders: project.identityProviders.map(
          ({ clientId: _clientId, ...provider }: any) => provider,
        ),
        secretReferences: project.secretReferences,
        findings: validateProjectSecurity(project),
      };
    },
  );

  app.post("/api/presence/heartbeat", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        connectionId: z.string(),
        branchId: z.string(),
        stage: z.enum(architectureStages),
        selectedNodeId: z.string().optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_PRESENCE" });
    const presence: CollaborationPresence = {
      tenantId: principal.tenantId,
      connectionId: parsed.data.connectionId,
      userId: principal.subject,
      branchId: parsed.data.branchId,
      stage: parsed.data.stage,
      selectedNodeId: parsed.data.selectedNodeId,
      lastSeenAt: new Date().toISOString(),
    };
    return eventHub.heartbeat(presence);
  });
  app.get("/api/presence/:branchId", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z.object({ branchId: z.string() }).safeParse(request.params);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_BRANCH" });
    return eventHub.listPresence(principal.tenantId, parsed.data.branchId, 45);
  });

  app.get("/api/activity", async (request) => {
    const principal = principalFor(request);
    const query = z
      .object({
        projectId: z.string().optional(),
        limit: z.coerce.number().int().positive().max(500).default(100),
      })
      .parse(request.query);
    return eventHub.list(principal.tenantId, query.projectId, query.limit);
  });
  app.get("/api/events", async (request, reply) => {
    const principal = principalFor(request);
    const query = z
      .object({ probe: z.coerce.boolean().optional() })
      .parse(request.query ?? {});
    if (query.probe)
      return {
        status: "ready",
        transport: "server-sent-events",
        tenantScoped: true,
        heartbeatSeconds: 20,
      };
    // This is a long-lived raw stream. Hijacking prevents Fastify from attempting a
    // second response after the initial SSE frame has been written.
    reply.hijack();
    reply.raw.statusCode = 200;
    reply.raw.setHeader("content-type", "text/event-stream; charset=utf-8");
    reply.raw.setHeader("cache-control", "no-cache, no-transform");
    reply.raw.setHeader("connection", "keep-alive");
    reply.raw.setHeader("x-accel-buffering", "no");
    reply.raw.flushHeaders?.();
    reply.raw.write(
      `event: ready\ndata: ${JSON.stringify({ tenantId: principal.tenantId })}\n\n`,
    );
    const unsubscribe = eventHub.subscribe(principal.tenantId, (event: any) => {
      if (!reply.raw.destroyed)
        reply.raw.write(`event: activity\ndata: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => {
      if (!reply.raw.destroyed)
        reply.raw.write(`event: heartbeat\ndata: ${Date.now()}\n\n`);
    }, 20_000);
    heartbeat.unref?.();
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      clearInterval(heartbeat);
      unsubscribe();
    };
    reply.raw.once("close", cleanup);
    reply.raw.once("error", cleanup);
    request.raw.once("aborted", cleanup);
    return reply;
  });

  app.get("/api/audit", async (request) => {
    const principal = principalFor(request);
    const query = z
      .object({
        limit: z.coerce.number().int().positive().max(500).default(100),
      })
      .parse(request.query);
    return auditLog.list(principal.tenantId, query.limit);
  });
  app.post("/api/audit/purge", async (request) => ({
    purged: auditLog.purge(),
    actorId: principalFor(request).subject,
  }));

  app.post("/api/recommendations", async (request, reply) => {
    markArchitectureBrainCompatibilityAlias(
      reply,
      "/api/architecture-brain/workspace-projection",
    );
    return projectEndpoint(request, reply, async (project) =>
      architectureBrain.recommendations(project),
    );
  });
  app.post("/api/recommendations/contextual", async (request, reply) => {
    markArchitectureBrainCompatibilityAlias(
      reply,
      "/api/architecture-brain/workspace-projection",
    );
    const parsed = contextualRecommendationRequestSchema.safeParse(
      request.body,
    );
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
    if (!tenantProject(parsed.data.project, principalFor(request)))
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    return architectureBrain.contextualRecommendations({
      project: parsed.data.project,
      context: parsed.data.context,
    });
  });
  app.post("/api/validate", async (request, reply) => {
    markArchitectureBrainCompatibilityAlias(
      reply,
      "/api/architecture-brain/workspace-projection",
    );
    return projectEndpoint(request, reply, async (project) => ({
      findings: await architectureBrain.validate(project),
    }));
  });
  app.post("/api/audits/deterministic", async (request, reply) => {
    markArchitectureBrainCompatibilityAlias(
      reply,
      "/api/architecture-brain/workspace-projection",
    );
    return projectEndpoint(request, reply, async (project) =>
      architectureBrain.deterministicAudit(project),
    );
  });
  app.post("/api/audits/assisted", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z.object({
      projectId: z.string().min(1),
      branchId: z.string().min(1),
      expectedRevision: z.number().int().nonnegative(),
    }).safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_ASSISTED_AUDIT_REQUEST", details: parsed.error.flatten() });
    const project = await loadCanonicalBrainProject({ request, reply, ...parsed.data });
    if (!project) return;
    return architectureBrain.assistedAudit({ tenantId: principal.tenantId, project });
  });

  app.post("/api/design-brief/analyse", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        projectId: z.string().min(1),
        branchId: z.string().min(1),
        expectedRevision: z.number().int().nonnegative(),
        briefText: z.string().min(20).max(40000),
        dataClassification: z
          .enum(["public", "internal", "confidential", "restricted"])
          .optional(),
        intelligenceMode: z.enum(["deterministic", "hybrid"]).optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: "INVALID_DESIGN_BRIEF_ANALYSIS_REQUEST",
        details: parsed.error.flatten(),
      });
    const project = await loadCanonicalBrainProject({
      request,
      reply,
      projectId: parsed.data.projectId,
      branchId: parsed.data.branchId,
      expectedRevision: parsed.data.expectedRevision,
    });
    if (!project) return;
    return architectureBrain.analyseBrief({
      tenantId: principal.tenantId,
      project,
      briefText: parsed.data.briefText,
      ...(parsed.data.dataClassification
        ? { dataClassification: parsed.data.dataClassification }
        : {}),
      ...(parsed.data.intelligenceMode
        ? { intelligenceMode: parsed.data.intelligenceMode }
        : {}),
    });
  });

  app.post("/api/design/explain-ranking", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z.object({
      projectId: z.string().min(1),
      branchId: z.string().min(1),
      expectedRevision: z.number().int().nonnegative(),
    }).safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        available: false,
        degradedReason: "INVALID_PROJECT_REFERENCE",
        details: parsed.error.flatten(),
      });
    const project = await loadCanonicalBrainProject({ request, reply, ...parsed.data });
    if (!project) return;
    return architectureBrain.explainRanking({ tenantId: principal.tenantId, project });
  });

  app.post("/api/design/stage-advice", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        projectId: z.string().min(1),
        branchId: z.string().min(1),
        expectedRevision: z.number().int().nonnegative(),
        selectedNodeId: z.string().optional(),
        selectedEdgeId: z.string().optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        available: false,
        degradedReason: "INVALID_PROJECT_REFERENCE",
        details: parsed.error.flatten(),
      });
    const project = await loadCanonicalBrainProject({
      request,
      reply,
      projectId: parsed.data.projectId,
      branchId: parsed.data.branchId,
      expectedRevision: parsed.data.expectedRevision,
    });
    if (!project) return;
    if (parsed.data.selectedNodeId && !project.nodes.some((node: ArchitectureProject["nodes"][number]) => node.id === parsed.data.selectedNodeId))
      return reply.code(400).send({ available: false, degradedReason: "UNKNOWN_SELECTED_SCOPE" });
    if (parsed.data.selectedEdgeId && !project.edges.some((edge) => edge.id === parsed.data.selectedEdgeId))
      return reply.code(400).send({ available: false, degradedReason: "UNKNOWN_SELECTED_RELATIONSHIP" });
    return architectureBrain.stageAdvice({
      tenantId: principal.tenantId,
      project,
      ...(parsed.data.selectedNodeId
        ? { selectedNodeId: parsed.data.selectedNodeId }
        : {}),
      ...(parsed.data.selectedEdgeId
        ? { selectedEdgeId: parsed.data.selectedEdgeId }
        : {}),
    });
  });

  app.get("/api/knowledge/governance", async (request) => {
    principalFor(request);
    const policy = await loadGovernancePolicy();
    const library = await loadKnowledgeLibrary();
    return {
      policy,
      candidateLibrary: assessLibraryGovernance(library, policy, "candidate"),
      productionPatternRelease: assessPatternReleaseGovernance(
        sprint78PatternCorpus,
        policy,
        "production",
      ),
    };
  });

  await app.register(async (scope) =>
    artifactRoutes(scope, { principalFor, loadKnowledgeLibrary }),
  );
  await app.register(async (scope) =>
    interoperabilityRoutes(scope, { principalFor }),
  );
  await app.register(async (scope) =>
    intelligenceRoutes(scope, {
      principalFor,
      tenantProject,
      loadKnowledgeLibrary,
      knowledgeOperations,
      architectureBrain,
    }),
  );
  await app.register(async (scope) =>
    adminConfigurationRoutes(scope, { principalFor }),
  );
  await app.register(async (scope) =>
    adminControlPlaneRoutes(scope, { principalFor: principalFor as never }),
  );
  await app.register(async (scope) =>
    patternDnaRoutes(scope, {
      principalFor: principalFor as never,
      loadKnowledgeLibrary: loadKnowledgeLibrary as never,
    }),
  );
  await app.register(async (scope) =>
    knowledgeReleaseRoutes(scope, {
      principalFor: principalFor as never,
      loadKnowledgeLibrary: loadKnowledgeLibrary as never,
    }),
  );
  await app.register(async (scope) =>
    healthRoutes(scope, {
      principalFor,
      llmRuntimeConfigurations,
      knowledgeOperations,
      version: AIW_RELEASE.version,
    }),
  );
  await app.register(async (scope) =>
    knowledgeFabricRoutes(scope, { principalFor: principalFor as never }),
  );
  await app.register(async (scope) =>
    knowledgeOpsRoutes(scope, {
      principalFor,
      loadKnowledgeLibrary: loadKnowledgeLibrary as never,
      llmRuntimeConfigurations,
      knowledgeOperations,
    }),
  );
  await app.register(async (scope) =>
    knowledgeOpsWorkbenchRoutes(scope, {
      principalFor,
      loadKnowledgeLibrary: loadKnowledgeLibrary as never,
    }),
  );
  await app.register(async (scope) =>
    mindFactoryRoutes(scope, { principalFor: principalFor as never }),
  );
  await app.register(async (scope) =>
    mindFactoryJobsRoutes(scope, { principalFor: principalFor as never }),
  );
  await app.register(async (scope) =>
    repositoryConformancePilotRoutes(scope, {
      principalFor: principalFor as never,
    }),
  );
  await app.register(async (scope) =>
    enterpriseSecurityRoutes(scope, {
      principalFor: principalFor as never,
      version: AIW_RELEASE.version,
    }),
  );
  await app.register(async (scope) =>
    productionMindFactoryRoutes(scope, { principalFor: principalFor as never }),
  );
  await app.register(async (scope) =>
    reviewStudioRoutes(scope, {
      principalFor,
      tenantProject,
      loadKnowledgeLibrary: loadKnowledgeLibrary as never,
      architectureBrain,
    }),
  );

  app.post("/api/co-architect/ask", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        projectId: z.string().min(1),
        branchId: z.string().min(1),
        expectedRevision: z.number().int().nonnegative(),
        question: z.string().min(2).max(4000),
        selectedNodeId: z.string().optional(),
        lifecycleStage: z.enum(["requirements", "quality", "context", "logical", "realization", "logicalTechnology", "physicalTechnology", "review", "sdd"]).optional(),
        scopeLabel: z.string().max(240).optional(),
        dataClassification: z
          .enum(["public", "internal", "confidential", "restricted"])
          .optional(),
        intelligenceMode: z.enum(["deterministic", "hybrid"]).optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: "INVALID_CO_ARCHITECT_REQUEST",
        details: parsed.error.flatten(),
      });
    const project = await repository.getProject(
      principal.tenantId,
      parsed.data.projectId,
      parsed.data.branchId,
    );
    if (!project || !canPerform(project, principal.subject, "project.read"))
      return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
    if (project.revision !== parsed.data.expectedRevision)
      return reply.code(409).send({
        error: "STALE_ARCHITECTURE_BRAIN_CONTEXT",
        expectedRevision: parsed.data.expectedRevision,
        actualRevision: project.revision,
      });
    if (
      parsed.data.selectedNodeId &&
      !project.nodes.some((node: ArchitectureProject["nodes"][number]) => node.id === parsed.data.selectedNodeId)
    )
      return reply.code(400).send({ error: "UNKNOWN_SELECTED_SCOPE" });
    return architectureBrain.askSol({
      tenantId: principal.tenantId,
      project,
      question: parsed.data.question,
      ...(parsed.data.selectedNodeId
        ? { selectedNodeId: parsed.data.selectedNodeId }
        : {}),
      ...(parsed.data.lifecycleStage ? { lifecycleStage: parsed.data.lifecycleStage } : {}),
      ...(parsed.data.scopeLabel ? { scopeLabel: parsed.data.scopeLabel } : {}),
      ...(parsed.data.dataClassification
        ? { dataClassification: parsed.data.dataClassification }
        : {}),
      ...(parsed.data.intelligenceMode
        ? { intelligenceMode: parsed.data.intelligenceMode }
        : {}),
    });
  });
}
