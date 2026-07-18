import { z } from 'zod';
import type { DesignGestureEvent, GenerativeActionOption, GenerativeOutcomeHistoryItem, StageDecompositionSession } from '@aiw/domain';
import {
  applyGenerativeAction,
  canPerform,
  livingCanvasReleaseDescriptor,
  stageTransformationGrammars,
  StaleGenerativeProposalError,
  InvalidGenerativeMutationError,
} from '@aiw/engine';
import type { ApplicationRouteContext } from './applicationRouteContext.js';
import { principalFor, projectParamsSchema } from './appRuntimeSupport.js';
import { RepositoryRevisionConflict } from './repository.js';
import { livingCanvasFeedbackStore } from './livingCanvasFeedbackStore.js';

const gestureSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    'scope-hovered','scope-selected','scope-opened','empty-canvas-invoked','decompose-requested','candidate-requested','candidate-previewed','candidate-edited','candidate-accepted','candidate-rejected','candidate-deferred','scope-finalized','stage-finalization-requested','stage-handoff-accepted',
  ]),
  occurredAt: z.string(),
  tenantId: z.string(),
  projectId: z.string(),
  branchId: z.string(),
  revision: z.number().int().nonnegative(),
  actorId: z.string(),
  actorRole: z.string(),
  stage: z.enum(['requirements','qualityDrivers','systemContext','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','reviewAssurance','sddPack']),
  targetStage: z.enum(['requirements','qualityDrivers','systemContext','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','reviewAssurance','sddPack']).optional(),
  viewpointId: z.string().optional(),
  decompositionLevel: z.enum(['landscape','system','container','component','code','deployment']).optional(),
  selectedScopeId: z.string().optional(),
  subjectIds: z.array(z.string()).optional(),
  canvasPoint: z.object({ x: z.number(), y: z.number() }).optional(),
  autonomyMode: z.enum(['guide','compose','draft-stage']),
  payload: z.record(z.string(), z.unknown()).optional(),
});

const sessionSchema = z.custom<StageDecompositionSession>((value) => Boolean(value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string'));
const actionSchema = z.custom<GenerativeActionOption>((value) => Boolean(value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string' && typeof (value as { mutationSet?: { id?: unknown } }).mutationSet?.id === 'string'));
const outcomeSchema = z.custom<GenerativeOutcomeHistoryItem>((value) => Boolean(value && typeof value === 'object' && typeof (value as { actionSemanticKey?: unknown }).actionSemanticKey === 'string'));

function actorRoleFor(project: { members: Array<{ id: string; role: string }> }, subject: string): string {
  return project.members.find((item) => item.id === subject)?.role ?? 'viewer';
}

export async function registerLivingCanvasApplicationRoutes(context: ApplicationRouteContext) {
  const { app, repository, idempotency, auditLog, publishActivity, architectureBrain } = context;

  app.get('/api/living-canvas/release', async () => livingCanvasReleaseDescriptor());
  app.get('/api/living-canvas/grammars', async () => ({ grammars: stageTransformationGrammars() }));

  app.post('/api/projects/:projectId/branches/:branchId/stage-co-author', async (request, reply) => {
    const params = projectParamsSchema.safeParse(request.params);
    const body = z.object({
      targetStage: z.enum(['requirements','qualityDrivers','systemContext','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','reviewAssurance','sddPack']),
      intelligenceMode: z.enum(['deterministic', 'hybrid']).default('hybrid'),
      dataClassification: z.enum(['public','internal','confidential','restricted']).default('internal'),
      expectedRevision: z.number().int().nonnegative().optional(),
    }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'INVALID_STAGE_CO_AUTHOR_REQUEST', details: body.success ? undefined : body.error.flatten() });
    const principal = principalFor(request);
    const project = await repository.getProject(principal.tenantId, params.data.projectId, params.data.branchId);
    if (!project || !canPerform(project, principal.subject, 'project.read')) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' });
    if (body.data.expectedRevision !== undefined && project.revision !== body.data.expectedRevision) {
      return reply.code(409).send({
        error: 'REVISION_CONFLICT',
        currentRevision: project.revision,
        expectedRevision: body.data.expectedRevision,
      });
    }
    const proposal = await architectureBrain.stageCoAuthor({
      tenantId: principal.tenantId,
      project,
      targetStage: body.data.targetStage,
      intelligenceMode: body.data.intelligenceMode,
      dataClassification: body.data.dataClassification,
    });
    auditLog.append({
      tenantId: project.tenantId,
      projectId: project.id,
      branchId: project.branch.id,
      actorId: principal.subject,
      eventType: 'living-canvas',
      action: 'request-stage-co-author',
      targetType: 'architecture-stage',
      targetId: body.data.targetStage,
      outcome: proposal.mode === 'llm-assisted' ? 'success' : 'fallback',
      correlationId: request.id,
      retentionDays: project.securitySettings.auditRetentionDays,
      metadata: {
        targetStage: body.data.targetStage,
        mode: proposal.mode,
        operationCount: proposal.operations.length,
        clarificationCount: proposal.clarifications.length,
        projectRevision: proposal.projectRevision,
      },
    });
    return reply.send(proposal);
  });

  app.post('/api/projects/:projectId/branches/:branchId/living-canvas/actions', async (request, reply) => {
    const params = projectParamsSchema.safeParse(request.params);
    const body = z.object({
      event: gestureSchema,
      session: sessionSchema.optional(),
      outcomeHistory: z.array(outcomeSchema).max(100).default([]),
      intelligenceMode: z.enum(['deterministic', 'hybrid']).default('deterministic'),
    }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'INVALID_LIVING_CANVAS_REQUEST', details: body.success ? undefined : body.error.flatten() });
    const principal = principalFor(request);
    const project = await repository.getProject(principal.tenantId, params.data.projectId, params.data.branchId);
    if (!project || !canPerform(project, principal.subject, 'project.read')) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' });
    if (body.data.event.tenantId !== principal.tenantId || body.data.event.projectId !== project.id || body.data.event.branchId !== project.branch.id) return reply.code(403).send({ error: 'LIVING_CANVAS_SCOPE_MISMATCH' });
    const rawEvent = body.data.event;
    const event: DesignGestureEvent = {
      id: rawEvent.id,
      kind: rawEvent.kind,
      occurredAt: rawEvent.occurredAt,
      tenantId: rawEvent.tenantId,
      projectId: rawEvent.projectId,
      branchId: rawEvent.branchId,
      revision: project.revision,
      actorId: principal.subject,
      actorRole: actorRoleFor(project, principal.subject),
      stage: rawEvent.stage,
      ...(rawEvent.targetStage ? { targetStage: rawEvent.targetStage } : {}),
      ...(rawEvent.viewpointId ? { viewpointId: rawEvent.viewpointId } : {}),
      ...(rawEvent.decompositionLevel ? { decompositionLevel: rawEvent.decompositionLevel } : {}),
      ...(rawEvent.selectedScopeId ? { selectedScopeId: rawEvent.selectedScopeId } : {}),
      ...(rawEvent.subjectIds ? { subjectIds: rawEvent.subjectIds } : {}),
      ...(rawEvent.canvasPoint ? { canvasPoint: rawEvent.canvasPoint } : {}),
      autonomyMode: rawEvent.autonomyMode,
      ...(rawEvent.payload ? { payload: rawEvent.payload } : {}),
    };
    const permissions = canPerform(project, principal.subject, 'project.edit')
      ? ['project.read', 'architecture.write', 'generative.accept']
      : ['project.read'];
    const result = await architectureBrain.livingCanvasActions({
      tenantId: principal.tenantId,
      project,
      event,
      ...(body.data.session ? { session: body.data.session } : {}),
      outcomeHistory: body.data.outcomeHistory,
      permissions,
      intelligenceMode: body.data.intelligenceMode,
      dataClassification: 'internal',
    });
    const assistance = 'assistance' in result ? result.assistance : undefined;
    for (const signal of assistance?.knowledgeGapSignals ?? []) {
      livingCanvasFeedbackStore.record({
        tenantId: project.tenantId,
        projectId: project.id,
        branchId: project.branch.id,
        stage: project.activeStage,
        feedbackKind: 'knowledge-gap',
        actionSemanticKey: `knowledge-gap:${signal.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
        actionLabel: signal.topic,
        authorityClass: 'llm-proposed',
        outcome: 'deferred',
        reason: signal.reason,
        topic: signal.topic,
        suggestedSourceType: signal.suggestedSourceType,
        citedRecordIds: [],
        knowledgeReleaseId: result.context.activeKnowledgeReleaseId,
        ...(assistance?.trace ? { modelTrace: assistance.trace } : {}),
      });
    }
    auditLog.append({
      tenantId: project.tenantId,
      projectId: project.id,
      branchId: project.branch.id,
      actorId: principal.subject,
      eventType: 'living-canvas',
      action: 'request-architecture-brain-actions',
      targetType: 'design-context',
      targetId: result.context.contextFingerprint,
      outcome: assistance?.mode === 'llm-assisted' || body.data.intelligenceMode === 'deterministic' ? 'success' : 'fallback',
      correlationId: request.id,
      retentionDays: project.securitySettings.auditRetentionDays,
      metadata: {
        actionCount: result.actions.length,
        assistanceMode: assistance?.mode ?? 'deterministic',
        deterministicOnly: result.deterministicOnly,
        knowledgeReleaseId: result.context.activeKnowledgeReleaseId,
        knowledgeGapCount: assistance?.knowledgeGapSignals.length ?? 0,
        brainProposalId: result.brainReceipt.proposalId,
        brainContextFingerprint: result.brainReceipt.contextFingerprint,
      },
    });
    return reply.send(result);

  });


  app.post('/api/projects/:projectId/branches/:branchId/living-canvas/feedback', async (request, reply) => {
    const params = projectParamsSchema.safeParse(request.params);
    const body = z.object({
      stage: z.enum(['requirements','qualityDrivers','systemContext','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','reviewAssurance','sddPack']),
      actionSemanticKey: z.string().min(1).max(240),
      actionLabel: z.string().max(240).optional(),
      authorityClass: z.enum(['deterministic-required','deterministic-eligible','knowledge-recommended','architecture-inference','llm-proposed','architect-created']),
      outcome: z.enum(['accepted','rejected','deferred','edited']),
      reason: z.string().max(2000).optional(),
      citedRecordIds: z.array(z.string().max(180)).max(30).default([]),
      knowledgeReleaseId: z.string().min(1).max(180),
      modelTrace: z.object({
        providerId: z.string().max(120), model: z.string().max(160), routeId: z.string().max(200),
        requestFingerprint: z.string().max(200), latencyMs: z.number().nonnegative(), fallbackUsed: z.boolean(),
        activeKnowledgeReleaseId: z.string().max(180), doctrineVersion: z.string().max(120).optional(),
      }).optional(),
    }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'INVALID_LIVING_CANVAS_FEEDBACK', details: body.success ? undefined : body.error.flatten() });
    const principal = principalFor(request);
    const project = await repository.getProject(principal.tenantId, params.data.projectId, params.data.branchId);
    if (!project || !canPerform(project, principal.subject, 'project.read')) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' });
    const receipt = livingCanvasFeedbackStore.record({
      tenantId: project.tenantId,
      projectId: project.id,
      branchId: project.branch.id,
      stage: body.data.stage,
      actionSemanticKey: body.data.actionSemanticKey,
      ...(body.data.actionLabel ? { actionLabel: body.data.actionLabel } : {}),
      authorityClass: body.data.authorityClass,
      outcome: body.data.outcome,
      ...(body.data.reason ? { reason: body.data.reason } : {}),
      citedRecordIds: body.data.citedRecordIds,
      knowledgeReleaseId: body.data.knowledgeReleaseId,
      ...(body.data.modelTrace ? { modelTrace: {
        providerId: body.data.modelTrace.providerId,
        model: body.data.modelTrace.model,
        routeId: body.data.modelTrace.routeId,
        requestFingerprint: body.data.modelTrace.requestFingerprint,
        latencyMs: body.data.modelTrace.latencyMs,
        fallbackUsed: body.data.modelTrace.fallbackUsed,
        activeKnowledgeReleaseId: body.data.modelTrace.activeKnowledgeReleaseId,
        ...(body.data.modelTrace.doctrineVersion ? { doctrineVersion: body.data.modelTrace.doctrineVersion } : {}),
      } } : {}),
    });
    auditLog.append({ tenantId: project.tenantId, projectId: project.id, branchId: project.branch.id, actorId: principal.subject, eventType: 'living-canvas', action: 'record-co-creation-feedback', targetType: 'generative-action', targetId: body.data.actionSemanticKey, outcome: 'success', correlationId: request.id, retentionDays: project.securitySettings.auditRetentionDays, metadata: { feedbackOutcome: body.data.outcome, authorityClass: body.data.authorityClass, knowledgeReleaseId: body.data.knowledgeReleaseId, receiptStatus: receipt.status } });
    return reply.code(201).send(receipt);
  });

  app.post('/api/projects/:projectId/branches/:branchId/living-canvas/apply', async (request, reply) => {
    const params = projectParamsSchema.safeParse(request.params);
    const body = z.object({ action: actionSchema, expectedRevision: z.number().int().nonnegative(), rationale: z.string().max(2000).optional() }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'INVALID_LIVING_CANVAS_APPLY_REQUEST', details: body.success ? undefined : body.error.flatten() });
    const principal = principalFor(request);
    const project = await repository.getProject(principal.tenantId, params.data.projectId, params.data.branchId);
    if (!project) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' });
    if (!canPerform(project, principal.subject, 'project.edit')) return reply.code(403).send({ error: 'FORBIDDEN:project.edit' });
    if (body.data.expectedRevision !== project.revision) return reply.code(409).send({ error: 'REVISION_CONFLICT', currentRevision: project.revision });
    const key = String(request.headers['idempotency-key'] ?? body.data.action.mutationSet.idempotencyKey);
    try {
      const applied = applyGenerativeAction({ project, action: body.data.action, actorId: principal.subject, actorRole: actorRoleFor(project, principal.subject), ...(body.data.rationale ? { rationale: body.data.rationale } : {}) });
      const result = await idempotency.execute(principal.tenantId, `living-canvas:${project.id}:${project.branch.id}`, key, body.data, async () => {
        const saved = await repository.saveProject(applied.project, project.revision);
        return { ...applied, project: saved };
      });
      await publishActivity({ tenantId: project.tenantId, projectId: project.id, branchId: project.branch.id, type: 'living-canvas.action-accepted', actorId: principal.subject, summary: `Accepted ${body.data.action.label}`, revision: result.response.project.revision, correlationId: request.id });
      auditLog.append({ tenantId: project.tenantId, projectId: project.id, branchId: project.branch.id, actorId: principal.subject, eventType: 'living-canvas', action: 'accept-generative-action', targetType: 'mutation-set', targetId: body.data.action.mutationSet.id, outcome: 'success', correlationId: request.id, retentionDays: project.securitySettings.auditRetentionDays, metadata: { actionId: body.data.action.id, semanticKey: body.data.action.semanticKey, authorityClass: body.data.action.authorityClass, contextFingerprint: body.data.action.mutationSet.contextFingerprint, previousRevision: project.revision, nextRevision: result.response.project.revision, replayed: result.replayed } });
      return reply.header('idempotency-replayed', String(result.replayed)).send(result.response);
    } catch (error) {
      if (error instanceof StaleGenerativeProposalError) return reply.code(409).send({ error: error.code, message: error.message, currentRevision: project.revision });
      if (error instanceof InvalidGenerativeMutationError) return reply.code(422).send({ error: error.code, message: error.message });
      if (error instanceof RepositoryRevisionConflict) return reply.code(409).send({ error: 'REVISION_CONFLICT', currentRevision: error.currentRevision });
      if (error instanceof Error && error.message.startsWith('IDEMPOTENCY_KEY')) return reply.code(409).send({ error: error.message });
      throw error;
    }
  });
}
