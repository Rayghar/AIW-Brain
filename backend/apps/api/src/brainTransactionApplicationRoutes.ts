import { z } from 'zod';
import { architectureReviewDispositions } from '@aiw/domain';
import { canPerform, assignReview, completeReview, hasPermission } from '@aiw/engine';
import type { ApplicationRouteContext } from './applicationRouteContext.js';
import { principalFor, projectParamsSchema } from './appRuntimeSupport.js';
import {
  BrainTransactionNotFound,
  BrainTransactionTransitionError,
  BrainTransactionVersionConflict,
} from './brainTransactionRepository.js';

function transactionError(reply: any, error: unknown) {
  if (error instanceof BrainTransactionNotFound) return reply.code(404).send({ error: error.message });
  if (error instanceof BrainTransactionVersionConflict) return reply.code(409).send({ error: error.message, currentVersion: error.currentVersion });
  if (error instanceof BrainTransactionTransitionError) return reply.code(409).send({ error: error.message });
  const code = error instanceof Error ? error.message : 'BRAIN_TRANSACTION_OPERATION_FAILED';
  const status = /FORBIDDEN|AUTHORITY|INDEPENDENT|REVIEWER_MISMATCH/.test(code) ? 403 : /NOT_FOUND/.test(code) ? 404 : 409;
  return reply.code(status).send({ error: code });
}

export async function registerBrainTransactionApplicationRoutes(context: ApplicationRouteContext) {
  const { app, repository, brainTransactions, auditLog, architectureBrain } = context;

  app.get('/api/projects/:projectId/branches/:branchId/brain-transactions', async (request, reply) => {
    const params = projectParamsSchema.safeParse(request.params);
    const query = z.object({ limit: z.coerce.number().int().min(1).max(500).default(100) }).safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: 'INVALID_BRAIN_TRANSACTION_LIST_REQUEST' });
    const principal = principalFor(request);
    const project = await repository.getProject(principal.tenantId, params.data.projectId, params.data.branchId);
    if (!project || !canPerform(project, principal.subject, 'project.read')) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' });
    await brainTransactions.expireWaivers(principal.tenantId);
    return {
      transactions: await brainTransactions.listTransactions(principal.tenantId, project.id, project.branch.id, query.data.limit),
      waivers: await brainTransactions.listWaivers(principal.tenantId, project.id, project.branch.id),
      sourceAuthority: 'durable-brain-transaction-ledger',
      appendOnlyEvents: true,
    };
  });

  app.get('/api/projects/:projectId/branches/:branchId/brain-transactions/:transactionId', async (request, reply) => {
    const params = z.object({ projectId: z.string(), branchId: z.string(), transactionId: z.string().min(1) }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'INVALID_BRAIN_TRANSACTION_REQUEST' });
    const principal = principalFor(request);
    const project = await repository.getProject(principal.tenantId, params.data.projectId, params.data.branchId);
    if (!project || !canPerform(project, principal.subject, 'project.read')) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' });
    const transaction = await brainTransactions.getTransaction(principal.tenantId, params.data.transactionId);
    if (!transaction || transaction.projectId !== project.id || transaction.branchId !== project.branch.id) return reply.code(404).send({ error: 'BRAIN_TRANSACTION_NOT_FOUND' });
    return { transaction, events: await brainTransactions.listEvents(principal.tenantId, transaction.id) };
  });

  app.post('/api/projects/:projectId/branches/:branchId/brain-transactions/:transactionId/verify', async (request, reply) => {
    const params = z.object({ projectId: z.string(), branchId: z.string(), transactionId: z.string().min(1) }).safeParse(request.params);
    const body = z.object({ expectedVersion: z.number().int().min(1), rationale: z.string().min(10).max(4000), evidenceRefs: z.array(z.string().min(1)).max(100).default([]) }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'INVALID_BRAIN_TRANSACTION_VERIFICATION' });
    const principal = principalFor(request);
    const project = await repository.getProject(principal.tenantId, params.data.projectId, params.data.branchId);
    if (!project || !canPerform(project, principal.subject, 'project.read')) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' });
    const transaction = await brainTransactions.getTransaction(principal.tenantId, params.data.transactionId);
    if (!transaction || transaction.projectId !== project.id || transaction.branchId !== project.branch.id) return reply.code(404).send({ error: 'BRAIN_TRANSACTION_NOT_FOUND' });
    const currentGraphFingerprint = architectureBrain.designGraphPreview({ project }).fingerprint;
    if (transaction.projectRevision !== project.revision || transaction.graphFingerprint !== currentGraphFingerprint) {
      return reply.code(409).send({ error: 'STALE_BRAIN_TRANSACTION', currentProjectRevision: project.revision, currentGraphFingerprint });
    }
    try {
      return await brainTransactions.appendEvent({
        tenantId: principal.tenantId, transactionId: transaction.id, expectedVersion: body.data.expectedVersion,
        type: 'deterministic-verified', actorId: principal.subject, actorRoles: principal.roles ?? [],
        rationale: body.data.rationale, payload: { evidenceRefs: body.data.evidenceRefs, graphFingerprint: transaction.graphFingerprint },
      });
    } catch (error) { return transactionError(reply, error); }
  });

  app.post('/api/projects/:projectId/branches/:branchId/brain-transactions/:transactionId/review/assign', async (request, reply) => {
    const params = z.object({ projectId: z.string(), branchId: z.string(), transactionId: z.string().min(1) }).safeParse(request.params);
    const body = z.object({ expectedVersion: z.number().int().min(1), assignedReviewerId: z.string().min(1), instructions: z.string().min(10).max(4000), priority: z.enum(['low','normal','high','critical']).default('normal'), snapshotId: z.string().optional() }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'INVALID_BRAIN_REVIEW_ASSIGNMENT' });
    const principal = principalFor(request);
    const project = await repository.getProject(principal.tenantId, params.data.projectId, params.data.branchId);
    if (!project) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' });
    if (!canPerform(project, principal.subject, 'review.assign') && !canPerform(project, principal.subject, 'approval.request')) return reply.code(403).send({ error: 'FORBIDDEN_REVIEW_ASSIGNMENT' });
    const transaction = await brainTransactions.getTransaction(principal.tenantId, params.data.transactionId);
    if (!transaction || transaction.projectId !== project.id || transaction.branchId !== project.branch.id) return reply.code(404).send({ error: 'BRAIN_TRANSACTION_NOT_FOUND' });
    try {
      const assignedProject = assignReview(project, {
        stage: project.activeStage, assignedTo: body.data.assignedReviewerId, assignedBy: principal.subject,
        instructions: body.data.instructions, priority: body.data.priority, ...(body.data.snapshotId ? { snapshotId: body.data.snapshotId } : {}),
      });
      const assignment = assignedProject.reviewAssignments[0];
      if (!assignment) throw new Error('REVIEW_ASSIGNMENT_FAILED');
      const recorded = await brainTransactions.appendEvent({
        tenantId: principal.tenantId, transactionId: transaction.id, expectedVersion: body.data.expectedVersion,
        type: 'review-assigned', actorId: principal.subject, actorRoles: principal.roles ?? [],
        payload: { assignedReviewerId: body.data.assignedReviewerId, assignmentId: assignment.id, instructions: assignment.instructions, priority: assignment.priority, compatibilityProjectionRevision: assignedProject.revision },
      });
      const saved = await repository.saveProject(assignedProject, project.revision);
      auditLog.append({ tenantId: saved.tenantId, projectId: saved.id, branchId: saved.branch.id, actorId: principal.subject, eventType: 'architecture-brain-review', action: 'assign-independent-brain-review', targetType: 'brain-transaction', targetId: transaction.id, outcome: 'success', correlationId: request.id, retentionDays: saved.securitySettings.auditRetentionDays, metadata: { assignmentId: assignment.id, assignedReviewerId: body.data.assignedReviewerId, transactionVersion: recorded.transaction.version } });
      return { ...recorded, project: saved, reviewAssignment: assignment };
    } catch (error) { return transactionError(reply, error); }
  });

  app.post('/api/projects/:projectId/branches/:branchId/brain-transactions/:transactionId/review/disposition', async (request, reply) => {
    const params = z.object({ projectId: z.string(), branchId: z.string(), transactionId: z.string().min(1) }).safeParse(request.params);
    const body = z.object({ expectedVersion: z.number().int().min(1), assignmentId: z.string().min(1), disposition: z.enum(architectureReviewDispositions), rationale: z.string().min(20).max(8000), evidenceRefs: z.array(z.string().min(1)).max(100).default([]) }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'INVALID_BRAIN_REVIEW_DISPOSITION' });
    const principal = principalFor(request);
    const enterpriseGuard = hasPermission(principal, 'review.disposition');
    if (!enterpriseGuard.ok) return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'review.disposition', roles: enterpriseGuard.roles });
    const project = await repository.getProject(principal.tenantId, params.data.projectId, params.data.branchId);
    if (!project || !canPerform(project, principal.subject, 'review.decide')) return reply.code(403).send({ error: 'FORBIDDEN_REVIEW_DECISION' });
    const transaction = await brainTransactions.getTransaction(principal.tenantId, params.data.transactionId);
    if (!transaction || transaction.projectId !== project.id || transaction.branchId !== project.branch.id) return reply.code(404).send({ error: 'BRAIN_TRANSACTION_NOT_FOUND' });
    const assignment = project.reviewAssignments.find((item: any) => item.id === body.data.assignmentId);
    if (!assignment || assignment.assignedTo !== principal.subject) return reply.code(403).send({ error: 'ASSIGNED_REVIEWER_MISMATCH' });
    try {
      const completed = completeReview(project, assignment.id, principal.subject);
      const type = body.data.disposition === 'approved' ? 'review-approved' : body.data.disposition === 'rejected' ? 'review-rejected' : 'changes-requested';
      const recorded = await brainTransactions.appendEvent({
        tenantId: principal.tenantId, transactionId: transaction.id, expectedVersion: body.data.expectedVersion,
        type, actorId: principal.subject, actorRoles: principal.roles ?? [], rationale: body.data.rationale,
        payload: { assignmentId: assignment.id, disposition: body.data.disposition, evidenceRefs: body.data.evidenceRefs, reviewedProjectRevision: project.revision, compatibilityProjectionRevision: completed.revision },
      });
      const saved = await repository.saveProject(completed, project.revision);
      auditLog.append({ tenantId: saved.tenantId, projectId: saved.id, branchId: saved.branch.id, actorId: principal.subject, eventType: 'architecture-brain-review', action: `brain-review-${body.data.disposition}`, targetType: 'brain-transaction', targetId: transaction.id, outcome: body.data.disposition === 'approved' ? 'success' : 'conditional', correlationId: request.id, retentionDays: saved.securitySettings.auditRetentionDays, metadata: { assignmentId: assignment.id, rationale: body.data.rationale, transactionVersion: recorded.transaction.version } });
      return { ...recorded, project: saved, disposition: body.data.disposition };
    } catch (error) { return transactionError(reply, error); }
  });

  app.post('/api/projects/:projectId/branches/:branchId/brain-transactions/:transactionId/commit', async (request, reply) => {
    const params = z.object({ projectId: z.string(), branchId: z.string(), transactionId: z.string().min(1) }).safeParse(request.params);
    const body = z.object({ expectedVersion: z.number().int().min(1), expectedProjectRevision: z.number().int().nonnegative(), expectedGraphFingerprint: z.string().min(1), rationale: z.string().min(10).max(4000) }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'INVALID_BRAIN_TRANSACTION_COMMIT' });
    const principal = principalFor(request);
    const project = await repository.getProject(principal.tenantId, params.data.projectId, params.data.branchId);
    if (!project || !canPerform(project, principal.subject, 'project.edit')) return reply.code(403).send({ error: 'FORBIDDEN:project.edit' });
    const transaction = await brainTransactions.getTransaction(principal.tenantId, params.data.transactionId);
    if (!transaction || transaction.projectId !== project.id || transaction.branchId !== project.branch.id) return reply.code(404).send({ error: 'BRAIN_TRANSACTION_NOT_FOUND' });
    const currentGraphFingerprint = architectureBrain.designGraphPreview({ project }).fingerprint;
    if (
      project.revision !== body.data.expectedProjectRevision ||
      currentGraphFingerprint !== body.data.expectedGraphFingerprint ||
      transaction.graphFingerprint !== currentGraphFingerprint
    ) return reply.code(409).send({ error: 'STALE_BRAIN_TRANSACTION_COMMIT', currentProjectRevision: project.revision, currentGraphFingerprint, transactionGraphFingerprint: transaction.graphFingerprint });
    try {
      const recorded = await brainTransactions.appendEvent({ tenantId: principal.tenantId, transactionId: params.data.transactionId, expectedVersion: body.data.expectedVersion, type: 'committed', actorId: principal.subject, actorRoles: principal.roles ?? [], rationale: body.data.rationale, payload: { projectRevision: project.revision, graphFingerprint: currentGraphFingerprint } });
      auditLog.append({ tenantId: project.tenantId, projectId: project.id, branchId: project.branch.id, actorId: principal.subject, eventType: 'architecture-brain', action: 'commit-approved-brain-transaction', targetType: 'brain-transaction', targetId: params.data.transactionId, outcome: 'success', correlationId: request.id, retentionDays: project.securitySettings.auditRetentionDays, metadata: { projectRevision: project.revision, graphFingerprint: currentGraphFingerprint, transactionVersion: recorded.transaction.version } });
      return recorded;
    } catch (error) { return transactionError(reply, error); }
  });

  app.post('/api/projects/:projectId/branches/:branchId/architecture-waivers', async (request, reply) => {
    const params = projectParamsSchema.safeParse(request.params);
    const body = z.object({ transactionId: z.string().optional(), expectedTransactionVersion: z.number().int().min(1).optional(), findingId: z.string().min(1), reason: z.string().min(20).max(8000), compensatingControls: z.array(z.string().min(3)).min(1).max(50), evidenceRefs: z.array(z.string().min(1)).max(100).default([]), ownerId: z.string().min(1), expiresAt: z.string().datetime() }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'INVALID_ARCHITECTURE_WAIVER_REQUEST', details: body.success ? undefined : body.error.flatten() });
    const principal = principalFor(request);
    const guard = hasPermission(principal, 'review.disposition');
    if (!guard.ok) return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'review.disposition', roles: guard.roles });
    const project = await repository.getProject(principal.tenantId, params.data.projectId, params.data.branchId);
    if (!project || !canPerform(project, principal.subject, 'review.decide')) return reply.code(403).send({ error: 'FORBIDDEN_REVIEW_DECISION' });
    const finding = project.findings.find((item: any) => item.id === body.data.findingId);
    if (!finding) return reply.code(404).send({ error: 'FINDING_NOT_FOUND' });
    if (!finding.canOverride) return reply.code(409).send({ error: 'FINDING_CANNOT_BE_WAIVED' });
    try {
      const waiver = await brainTransactions.createWaiver({ tenantId: principal.tenantId, projectId: project.id, branchId: project.branch.id, ...(body.data.transactionId ? { transactionId: body.data.transactionId } : {}), findingId: finding.id, ruleId: finding.ruleId, scopeRef: finding.affectedNodeIds[0] ?? finding.affectedEdgeIds[0], reason: body.data.reason, compensatingControls: body.data.compensatingControls, evidenceRefs: body.data.evidenceRefs, ownerId: body.data.ownerId, approvedBy: principal.subject, expiresAt: body.data.expiresAt });
      let transactionRecord = null;
      if (body.data.transactionId) {
        if (!body.data.expectedTransactionVersion) return reply.code(400).send({ error: 'EXPECTED_TRANSACTION_VERSION_REQUIRED' });
        transactionRecord = await brainTransactions.appendEvent({ tenantId: principal.tenantId, transactionId: body.data.transactionId, expectedVersion: body.data.expectedTransactionVersion, type: 'waiver-granted', actorId: principal.subject, actorRoles: principal.roles ?? [], rationale: body.data.reason, payload: { waiverId: waiver.id, findingId: waiver.findingId, expiresAt: waiver.expiresAt, compensatingControls: waiver.compensatingControls } });
      }
      auditLog.append({ tenantId: project.tenantId, projectId: project.id, branchId: project.branch.id, actorId: principal.subject, eventType: 'architecture-waiver', action: 'grant-architecture-rule-waiver', targetType: 'finding', targetId: finding.id, outcome: 'conditional', correlationId: request.id, retentionDays: project.securitySettings.auditRetentionDays, metadata: { waiverId: waiver.id, ownerId: waiver.ownerId, expiresAt: waiver.expiresAt, transactionId: waiver.transactionId } });
      return { waiver, transaction: transactionRecord?.transaction ?? null, event: transactionRecord?.event ?? null };
    } catch (error) { return transactionError(reply, error); }
  });

  app.get('/api/projects/:projectId/branches/:branchId/architecture-waivers', async (request, reply) => {
    const params = projectParamsSchema.safeParse(request.params);
    const query = z.object({ status: z.enum(['active','expired','revoked']).optional() }).safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: 'INVALID_ARCHITECTURE_WAIVER_LIST_REQUEST' });
    const principal = principalFor(request);
    const project = await repository.getProject(principal.tenantId, params.data.projectId, params.data.branchId);
    if (!project || !canPerform(project, principal.subject, 'project.read')) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' });
    await brainTransactions.expireWaivers(principal.tenantId);
    return { waivers: await brainTransactions.listWaivers(principal.tenantId, project.id, project.branch.id, query.data.status), driftWaiversAreSeparate: true };
  });
}
