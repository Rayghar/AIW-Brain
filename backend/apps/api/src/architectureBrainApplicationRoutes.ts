import { z } from "zod";
import { architectureProjectSchema } from "@aiw/domain";
import { applySystemContextCandidate, canPerform } from "@aiw/engine";
import type { ApplicationRouteContext } from "./applicationRouteContext.js";
import {
  principalFor,
  projectParamsSchema,
} from "./appRuntimeSupport.js";
import { runSolCalibration, SOL_CALIBRATION_SCENARIOS } from "./solCalibration.js";

export async function registerArchitectureBrainApplicationRoutes(
  context: ApplicationRouteContext,
) {
  const { app, repository, architectureBrain } = context;

  app.get("/api/architecture-brain/authority-audit", async (request) => {
    principalFor(request);
    return architectureBrain.authorityAudit();
  });

  app.post(
    "/api/projects/:projectId/branches/:branchId/design-graph/preview",
    async (request, reply) => {
      const params = projectParamsSchema.safeParse(request.params);
      const body = z.object({ expectedRevision: z.number().int().nonnegative() }).safeParse(request.body);
      if (!params.success || !body.success)
        return reply.code(400).send({
          error: "INVALID_DESIGN_GRAPH_PREVIEW_REQUEST",
          details: body.success ? undefined : body.error.flatten(),
        });
      const principal = principalFor(request);
      const project = await repository.getProject(
        principal.tenantId,
        params.data.projectId,
        params.data.branchId,
      );
      if (!project || !canPerform(project, principal.subject, "project.read"))
        return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
      if (project.revision !== body.data.expectedRevision)
        return reply.code(409).send({
          error: "REVISION_CONFLICT",
          currentRevision: project.revision,
        });
      return architectureBrain.designGraphPreview({ project });
    },
  );

  app.post(
    "/api/projects/:projectId/branches/:branchId/design-graph/materialize",
    async (request, reply) => {
      const params = projectParamsSchema.safeParse(request.params);
      const body = z.object({
        expectedRevision: z.number().int().nonnegative(),
        previewFingerprint: z.string().min(1).max(200),
      }).safeParse(request.body);
      if (!params.success || !body.success)
        return reply.code(400).send({
          error: "INVALID_DESIGN_GRAPH_MATERIALIZATION_REQUEST",
          details: body.success ? undefined : body.error.flatten(),
        });
      const principal = principalFor(request);
      const project = await repository.getProject(
        principal.tenantId,
        params.data.projectId,
        params.data.branchId,
      );
      if (!project) return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
      if (!canPerform(project, principal.subject, "project.edit"))
        return reply.code(403).send({ error: "FORBIDDEN:project.edit" });
      if (project.revision !== body.data.expectedRevision)
        return reply.code(409).send({
          error: "REVISION_CONFLICT",
          currentRevision: project.revision,
        });
      const preview = architectureBrain.designGraphPreview({ project });
      if (preview.fingerprint !== body.data.previewFingerprint)
        return reply.code(409).send({
          error: "STALE_DESIGN_GRAPH_PREVIEW",
          currentRevision: project.revision,
          currentFingerprint: preview.fingerprint,
        });
      try {
        const materialized = architectureBrain.materializeDesignGraph({
          project,
          expectedPreviewFingerprint: body.data.previewFingerprint,
        });
        const saved = await repository.saveProject(materialized.project, project.revision);
        context.auditLog.append({
          tenantId: saved.tenantId,
          projectId: saved.id,
          branchId: saved.branch.id,
          actorId: principal.subject,
          eventType: "architecture-brain",
          action: "materialize-design-graph",
          targetType: "design-graph",
          targetId: saved.designGraph?.fingerprint ?? materialized.receipt.materializedFingerprint,
          outcome: "success",
          correlationId: request.id,
          retentionDays: saved.securitySettings.auditRetentionDays,
          metadata: {
            fromRevision: materialized.receipt.fromRevision,
            toRevision: materialized.receipt.toRevision,
            previewFingerprint: materialized.receipt.previewFingerprint,
            materializedFingerprint: materialized.receipt.materializedFingerprint,
            recordCount: materialized.receipt.recordCount,
            relationshipCount: materialized.receipt.relationshipCount,
          },
        });
        return {
          project: saved,
          designGraph: saved.designGraph,
          materializationReceipt: materialized.receipt,
          brainReceipt: preview.brainReceipt,
        };
      } catch (error) {
        const code = error instanceof Error ? error.message : "DESIGN_GRAPH_MATERIALIZATION_FAILED";
        if (code === "STALE_DESIGN_GRAPH_PREVIEW")
          return reply.code(409).send({ error: code, currentRevision: project.revision });
        if (code === "DESIGN_GRAPH_INTEGRITY_FAILED")
          return reply.code(422).send({ error: code });
        throw error;
      }
    },
  );

  app.get(
    "/api/projects/:projectId/branches/:branchId/design-graph/state-authority",
    async (request, reply) => {
      const params = projectParamsSchema.safeParse(request.params);
      if (!params.success)
        return reply.code(400).send({ error: "INVALID_DESIGN_GRAPH_STATE_AUTHORITY_REQUEST" });
      const principal = principalFor(request);
      const project = await repository.getProject(
        principal.tenantId,
        params.data.projectId,
        params.data.branchId,
      );
      if (!project || !canPerform(project, principal.subject, "project.read"))
        return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
      return {
        projectRevision: project.revision,
        graphFingerprint: project.designGraph?.fingerprint ?? null,
        authority: architectureBrain.designGraphStateAuthority(project),
        compatibilityProjectionRetained: true,
      };
    },
  );

  app.post(
    "/api/projects/:projectId/branches/:branchId/design-graph/migrate-state",
    async (request, reply) => {
      const params = projectParamsSchema.safeParse(request.params);
      const body = z.object({
        expectedRevision: z.number().int().nonnegative(),
        graphFingerprint: z.string().min(1).max(200),
      }).safeParse(request.body);
      if (!params.success || !body.success)
        return reply.code(400).send({
          error: "INVALID_DESIGN_GRAPH_STATE_MIGRATION_REQUEST",
          details: body.success ? undefined : body.error.flatten(),
        });
      const principal = principalFor(request);
      const project = await repository.getProject(
        principal.tenantId,
        params.data.projectId,
        params.data.branchId,
      );
      if (!project) return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
      if (!canPerform(project, principal.subject, "project.edit"))
        return reply.code(403).send({ error: "FORBIDDEN:project.edit" });
      if (project.revision !== body.data.expectedRevision)
        return reply.code(409).send({ error: "REVISION_CONFLICT", currentRevision: project.revision });
      if (architectureBrain.designGraphStateAuthority(project))
        return reply.code(409).send({ error: "DESIGN_GRAPH_STATE_ALREADY_MIGRATED" });
      try {
        const migrated = architectureBrain.migrateDesignGraphState({
          project,
          expectedGraphFingerprint: body.data.graphFingerprint,
          actorId: principal.subject,
        });
        const saved = await repository.saveProject(migrated.project, project.revision);
        context.auditLog.append({
          tenantId: saved.tenantId,
          projectId: saved.id,
          branchId: saved.branch.id,
          actorId: principal.subject,
          eventType: "architecture-brain",
          action: "migrate-canonical-state-to-design-graph",
          targetType: "design-graph",
          targetId: saved.designGraph?.fingerprint ?? migrated.receipt.migratedGraphFingerprint,
          outcome: "success",
          correlationId: request.id,
          retentionDays: saved.securitySettings.auditRetentionDays,
          metadata: {
            fromRevision: migrated.receipt.fromRevision,
            toRevision: migrated.receipt.toRevision,
            canonicalStateKinds: migrated.receipt.canonicalStateKinds,
            sourceGraphFingerprint: migrated.receipt.sourceGraphFingerprint,
            migratedGraphFingerprint: migrated.receipt.migratedGraphFingerprint,
          },
        });
        return {
          project: saved,
          designGraph: saved.designGraph,
          stateAuthority: architectureBrain.designGraphStateAuthority(saved),
          migrationReceipt: migrated.receipt,
        };
      } catch (error) {
        const code = error instanceof Error ? error.message : "DESIGN_GRAPH_STATE_MIGRATION_FAILED";
        if (code === "STALE_DESIGN_GRAPH_STATE_MIGRATION")
          return reply.code(409).send({
            error: code,
            currentRevision: project.revision,
            currentFingerprint: project.designGraph?.fingerprint,
          });
        if (code === "DESIGN_GRAPH_INTEGRITY_FAILED")
          return reply.code(422).send({ error: code });
        throw error;
      }
    },
  );

  app.put(
    "/api/projects/:projectId/branches/:branchId/design-graph/state",
    async (request, reply) => {
      const params = projectParamsSchema.safeParse(request.params);
      const body = z.object({
        expectedRevision: z.number().int().nonnegative(),
        graphFingerprint: z.string().min(1).max(200),
        canonicalState: z.object({
          requirementsIntelligence: z.unknown().optional(),
          interfaces: z.unknown().optional(),
          decisions: z.unknown().optional(),
          findings: z.unknown().optional(),
        }).refine((value) => Object.keys(value).length > 0, "At least one canonical state field is required"),
      }).safeParse(request.body);
      if (!params.success || !body.success)
        return reply.code(400).send({
          error: "INVALID_DESIGN_GRAPH_STATE_COMMAND",
          details: body.success ? undefined : body.error.flatten(),
        });
      const principal = principalFor(request);
      const project = await repository.getProject(
        principal.tenantId,
        params.data.projectId,
        params.data.branchId,
      );
      if (!project) return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
      if (!canPerform(project, principal.subject, "project.edit"))
        return reply.code(403).send({ error: "FORBIDDEN:project.edit" });
      if (project.revision !== body.data.expectedRevision)
        return reply.code(409).send({ error: "REVISION_CONFLICT", currentRevision: project.revision });
      if (!architectureBrain.designGraphStateAuthority(project))
        return reply.code(409).send({ error: "DESIGN_GRAPH_STATE_MIGRATION_REQUIRED" });

      const state = body.data.canonicalState;
      const candidateInput: Record<string, unknown> = { ...project };
      for (const key of ["requirementsIntelligence", "interfaces", "decisions", "findings"] as const) {
        if (Object.prototype.hasOwnProperty.call(state, key)) candidateInput[key] = state[key];
      }
      const candidate = architectureProjectSchema.safeParse(candidateInput);
      if (!candidate.success)
        return reply.code(400).send({
          error: "INVALID_CANONICAL_GRAPH_STATE",
          details: candidate.error.flatten(),
        });
      const patch: Record<string, unknown> = {};
      for (const key of ["requirementsIntelligence", "interfaces", "decisions", "findings"] as const) {
        if (Object.prototype.hasOwnProperty.call(state, key)) patch[key] = candidate.data[key];
      }
      try {
        const applied = architectureBrain.applyDesignGraphCanonicalState({
          project,
          expectedGraphFingerprint: body.data.graphFingerprint,
          patch: patch as never,
          actorId: principal.subject,
        });
        const saved = await repository.saveProject(applied.project, project.revision);
        context.auditLog.append({
          tenantId: saved.tenantId,
          projectId: saved.id,
          branchId: saved.branch.id,
          actorId: principal.subject,
          eventType: "architecture-brain",
          action: "apply-canonical-design-graph-state",
          targetType: "design-graph",
          targetId: saved.designGraph?.fingerprint ?? applied.receipt.graphFingerprint,
          outcome: "success",
          correlationId: request.id,
          retentionDays: saved.securitySettings.auditRetentionDays,
          metadata: {
            fromRevision: applied.receipt.fromRevision,
            toRevision: applied.receipt.toRevision,
            changedStateKinds: applied.receipt.changedStateKinds,
            previousGraphFingerprint: applied.receipt.previousGraphFingerprint,
            graphFingerprint: applied.receipt.graphFingerprint,
          },
        });
        return {
          project: saved,
          designGraph: saved.designGraph,
          stateAuthority: architectureBrain.designGraphStateAuthority(saved),
          commandReceipt: applied.receipt,
        };
      } catch (error) {
        const code = error instanceof Error ? error.message : "DESIGN_GRAPH_STATE_COMMAND_FAILED";
        if (["STALE_DESIGN_GRAPH_STATE_COMMAND", "DESIGN_GRAPH_STATE_MIGRATION_REQUIRED"].includes(code))
          return reply.code(409).send({
            error: code,
            currentRevision: project.revision,
            currentFingerprint: project.designGraph?.fingerprint,
          });
        if (code === "EMPTY_DESIGN_GRAPH_STATE_COMMAND")
          return reply.code(422).send({ error: code });
        throw error;
      }
    },
  );

  app.post("/api/architecture-brain/manifest", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        projectId: z.string().min(1).max(200),
        branchId: z.string().min(1).max(200),
        expectedRevision: z.number().int().nonnegative(),
        knowledgeReleaseId: z.string().max(160).optional(),
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: "INVALID_ARCHITECTURE_BRAIN_MANIFEST_REQUEST",
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
        error: "REVISION_CONFLICT",
        currentRevision: project.revision,
      });
    return architectureBrain.manifest(
      project,
      parsed.data.knowledgeReleaseId,
    );
  });

  app.post(
    "/api/architecture-brain/workspace-projection",
    async (request, reply) => {
      const principal = principalFor(request);
      const parsed = z
        .object({
          projectId: z.string().min(1).max(200),
          branchId: z.string().min(1).max(200),
          expectedRevision: z.number().int().nonnegative(),
          selectedNodeId: z.string().max(200).optional(),
          trigger: z
            .enum([
              "initial",
              "intent-change",
              "quality-change",
              "style-selection",
              "pattern-selection",
              "canvas-change",
              "scope-change",
            ])
            .default("initial"),
          workspace: z.enum([
            "design-brief",
            "quality",
            "design-canvas",
            "synthesis",
            "patterns",
            "governance",
            "realization",
            "portfolio",
            "operations",
            "knowledge",
            "collaboration",
            "security",
            "drift",
            "comparison",
          ]),
          event: z.record(z.string(), z.unknown()).optional(),
          intelligencePreferences: z
            .object({ demoted: z.record(z.string(), z.number()) })
            .optional(),
        })
        .safeParse(request.body);
      if (!parsed.success)
        return reply.code(400).send({
          error: "INVALID_ARCHITECTURE_BRAIN_PROJECTION_REQUEST",
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
          error: "REVISION_CONFLICT",
          currentRevision: project.revision,
        });
      return architectureBrain.workspaceProjection({
        project,
        trigger: parsed.data.trigger,
        workspace: parsed.data.workspace,
        ...(parsed.data.selectedNodeId
          ? { selectedNodeId: parsed.data.selectedNodeId }
          : {}),
        ...(parsed.data.event ? { event: parsed.data.event as never } : {}),
        ...(parsed.data.intelligencePreferences
          ? { intelligencePreferences: parsed.data.intelligencePreferences }
          : {}),
      });
    },
  );

  app.post(
    "/api/projects/:projectId/branches/:branchId/system-context/preview",
    async (request, reply) => {
      const params = projectParamsSchema.safeParse(request.params);
      const body = z
        .object({ expectedRevision: z.number().int().nonnegative() })
        .safeParse(request.body);
      if (!params.success || !body.success)
        return reply.code(400).send({
          error: "INVALID_SYSTEM_CONTEXT_PREVIEW_REQUEST",
          details: body.success ? undefined : body.error.flatten(),
        });
      const principal = principalFor(request);
      const project = await repository.getProject(
        principal.tenantId,
        params.data.projectId,
        params.data.branchId,
      );
      if (!project || !canPerform(project, principal.subject, "project.read"))
        return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
      if (project.revision !== body.data.expectedRevision)
        return reply.code(409).send({
          error: "REVISION_CONFLICT",
          currentRevision: project.revision,
        });
      const result = architectureBrain.systemContextCandidate({ project });
      if (!result.journeyCoverage.length)
        return reply.code(422).send({
          error: "SYSTEM_CONTEXT_REQUIRES_ACCEPTED_JOURNEY",
          brainReceipt: result.brainReceipt,
        });
      return result;
    },
  );

  app.post(
    "/api/projects/:projectId/branches/:branchId/system-context/apply",
    async (request, reply) => {
      const params = projectParamsSchema.safeParse(request.params);
      const body = z
        .object({
          expectedRevision: z.number().int().nonnegative(),
          contextFingerprint: z.string().min(1).max(200),
        })
        .safeParse(request.body);
      if (!params.success || !body.success)
        return reply.code(400).send({
          error: "INVALID_SYSTEM_CONTEXT_APPLY_REQUEST",
          details: body.success ? undefined : body.error.flatten(),
        });
      const principal = principalFor(request);
      const project = await repository.getProject(
        principal.tenantId,
        params.data.projectId,
        params.data.branchId,
      );
      if (!project)
        return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
      if (!canPerform(project, principal.subject, "project.edit"))
        return reply.code(403).send({ error: "FORBIDDEN:project.edit" });
      if (project.revision !== body.data.expectedRevision)
        return reply.code(409).send({
          error: "REVISION_CONFLICT",
          currentRevision: project.revision,
        });
      const proposal = architectureBrain.systemContextCandidate({ project });
      if (proposal.brainReceipt.contextFingerprint !== body.data.contextFingerprint)
        return reply.code(409).send({
          error: "STALE_SYSTEM_CONTEXT_PROPOSAL",
          currentRevision: project.revision,
        });
      if (!proposal.journeyCoverage.length)
        return reply
          .code(422)
          .send({ error: "SYSTEM_CONTEXT_REQUIRES_ACCEPTED_JOURNEY" });
      const next = applySystemContextCandidate(project, proposal);
      const saved = await repository.saveProject(next, project.revision);
      context.auditLog.append({
        tenantId: saved.tenantId,
        projectId: saved.id,
        branchId: saved.branch.id,
        actorId: principal.subject,
        eventType: "architecture-brain",
        action: "accept-system-context",
        targetType: "system-context",
        targetId: proposal.systemNodeRef,
        outcome: "success",
        correlationId: request.id,
        retentionDays: saved.securitySettings.auditRetentionDays,
        metadata: {
          fromRevision: project.revision,
          toRevision: saved.revision,
          proposalId: proposal.brainReceipt.proposalId,
          contextFingerprint: proposal.brainReceipt.contextFingerprint,
        },
      });
      return { project: saved, brainReceipt: proposal.brainReceipt };
    },
  );

  app.get("/api/architecture-brain/sol-calibration/scenarios", async (request) => {
    principalFor(request);
    return {
      releaseId: "AIW-0.10.0-rc.10.73.5",
      scenarios: SOL_CALIBRATION_SCENARIOS,
      governanceBoundary:
        "Calibration scenarios evaluate deterministic and governed-LLM responses. They do not claim production acceptance or substitute for independent human expert scoring.",
    };
  });

  app.post(
    "/api/projects/:projectId/branches/:branchId/sol-calibration",
    async (request, reply) => {
      const params = projectParamsSchema.safeParse(request.params);
      const body = z
        .object({ expectedRevision: z.number().int().nonnegative() })
        .safeParse(request.body);
      if (!params.success || !body.success)
        return reply.code(400).send({
          error: "INVALID_SOL_CALIBRATION_REQUEST",
          details: body.success ? undefined : body.error.flatten(),
        });
      const principal = principalFor(request);
      const project = await repository.getProject(
        principal.tenantId,
        params.data.projectId,
        params.data.branchId,
      );
      if (!project || !canPerform(project, principal.subject, "project.read"))
        return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
      if (project.revision !== body.data.expectedRevision)
        return reply.code(409).send({
          error: "REVISION_CONFLICT",
          currentRevision: project.revision,
        });
      const report = await runSolCalibration({
        architectureBrain,
        tenantId: principal.tenantId,
        project,
      });
      context.auditLog.append({
        tenantId: project.tenantId,
        projectId: project.id,
        branchId: project.branch.id,
        actorId: principal.subject,
        eventType: "architecture-brain",
        action: "run-sol-calibration",
        targetType: "project",
        targetId: project.id,
        outcome: report.summary.passedScenarios === report.summary.scenarioCount ? "success" : "conditional",
        correlationId: request.id,
        retentionDays: project.securitySettings.auditRetentionDays,
        metadata: {
          projectRevision: project.revision,
          providerConfigured: report.providerConfigured,
          liveProviderUsed: report.liveProviderUsed,
          deterministicAverage: report.summary.deterministicAverage,
          governedLlmAverage: report.summary.governedLlmAverage,
          passedScenarios: report.summary.passedScenarios,
          scenarioCount: report.summary.scenarioCount,
        },
      });
      return report;
    },
  );

  app.get(
    "/api/projects/:projectId/branches/:branchId/architecture-context-graph",
    async (request, reply) => {
      const params = projectParamsSchema.safeParse(request.params);
      if (!params.success)
        return reply.code(400).send({ error: "INVALID_PROJECT_PARAMS" });
      const principal = principalFor(request);
      const project = await repository.getProject(
        principal.tenantId,
        params.data.projectId,
        params.data.branchId,
      );
      if (!project || !canPerform(project, principal.subject, "project.read"))
        return reply.code(404).send({ error: "PROJECT_NOT_FOUND" });
      return {
        projectRevision: project.revision,
        graph: project.requirementsIntelligence?.contextGraph ?? null,
        semanticChanges:
          project.requirementsIntelligence?.semanticChanges ?? [],
        conflicts: project.requirementsIntelligence?.conflicts ?? [],
        manifest: architectureBrain.manifest(project),
      };
    },
  );
}
