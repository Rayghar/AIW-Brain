import type { FastifyInstance, FastifyRequest } from 'fastify';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildClaimReviewQueue, buildContradictionQueue, buildSourceRefreshQueue, hasPermission } from '@aiw/engine';
import {
  buildCorroborationAnalysis,
  summarizeKnowledgeOpsQueues,
  validateComment,
  validateDuplicateResolution,
  validateReviewerAssignment,
  validateSynonymResolution,
  type CorroborationEvidenceRef,
} from '@aiw/knowledge';
import { actorName } from '@aiw/admin';
import { adminRepositories } from '../repositories/adminRepositories.js';
import { knowledgeOpsDurableRepository } from '../repositories/knowledgeOpsDurableRepository.js';
import { livingCanvasFeedbackStore } from '../livingCanvasFeedbackStore.js';

interface RuntimePrincipal { tenantId: string; subject?: string; userId?: string; sub?: string }
export interface KnowledgeOpsWorkbenchDeps {
  principalFor: (request: FastifyRequest) => RuntimePrincipal;
  loadKnowledgeLibrary: () => Promise<never>;
}

const sourcesPath = fileURLToPath(new URL('../../../../data/trusted-architecture-sources.json', import.meta.url));
const loadSources = (): Array<{ id: string; title?: string; status?: string; reviewedAt?: string; refreshCadenceDays?: number }> => {
  try { const parsed = JSON.parse(readFileSync(sourcesPath, 'utf8')); return Array.isArray(parsed) ? parsed : parsed.sources ?? []; }
  catch { return []; }
};
const actorOf = actorName;

function denyAudit(principal: unknown, permission: string, roles: string[]) {
  adminRepositories.audit.push({ actor: actorOf(principal), action: 'rbac.denied', subject: permission, at: new Date().toISOString(), detail: `roles: ${roles.join(',') || 'none'}` });
}

function requireKnowledgeRead(reply: { code: (status: number) => { send: (payload: unknown) => unknown } }, principal: unknown) {
  const guard = hasPermission(principal, 'knowledge.read');
  if (guard.ok) return null;
  denyAudit(principal, 'knowledge.read', guard.roles);
  return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'knowledge.read', roles: guard.roles });
}

export async function knowledgeOpsWorkbenchRoutes(app: FastifyInstance, deps: KnowledgeOpsWorkbenchDeps): Promise<void> {
  const { principalFor, loadKnowledgeLibrary } = deps;

  app.get('/api/knowledge-ops/workbench', async (request, reply) => {
    const principal = principalFor(request);
    const denied = requireKnowledgeRead(reply, principal);
    if (denied) return denied;
    const library = await loadKnowledgeLibrary();
    const claimReview = buildClaimReviewQueue(library);
    const contradictions = buildContradictionQueue(library);
    const sourceRefresh = buildSourceRefreshQueue(loadSources());
    const duplicateGroups = adminRepositories.duplicateResolutions.length ? [] : claimReview.slice(0, 3).map((claim: { subjectId: string; claimId: string }, index: number) => ({
      groupId: `dup-${index + 1}-${claim.subjectId}`,
      canonicalId: claim.claimId,
      duplicateIds: claimReview.filter((item: { subjectId: string; claimId: string }) => item.subjectId === claim.subjectId && item.claimId !== claim.claimId).slice(0, 3).map((item: { claimId: string }) => item.claimId),
      reason: 'Candidate same-subject review group; curator must confirm merge or keep separate.',
    })).filter((group: { duplicateIds: string[] }) => group.duplicateIds.length > 0);
    const synonymGroups = adminRepositories.synonymResolutions.length ? [] : [
      { groupId: 'syn-event-driven', canonicalTerm: 'Event-Driven Architecture', synonyms: ['EDA', 'event based architecture', 'pub/sub architecture'], scope: 'pattern' },
      { groupId: 'syn-zero-trust', canonicalTerm: 'Zero Trust', synonyms: ['ZTNA', 'never trust always verify'], scope: 'security' },
    ];
    const summary = summarizeKnowledgeOpsQueues({ claimReview, contradictions, sourceRefresh, releaseCandidates: knowledgeOpsDurableRepository.listCandidates(), duplicateGroups, synonymGroups, assignments: adminRepositories.reviewerAssignments });
    const livingCanvasFeedback = livingCanvasFeedbackStore.list(principal.tenantId, 200);
    return {
      summary, claimReview, contradictions, sourceRefresh, duplicateGroups, synonymGroups, livingCanvasFeedback,
      assignments: adminRepositories.reviewerAssignments,
      comments: adminRepositories.knowledgeOpsComments.slice(-100).reverse(),
      claimDecisions: adminRepositories.claimDecisions.slice(-100).reverse(),
      triageDecisions: adminRepositories.triageDecisions.slice(-100).reverse(),
      sourceRefreshRequests: adminRepositories.sourceRefreshRequests.slice(-100).reverse(),
      duplicateResolutions: adminRepositories.duplicateResolutions.slice(-100).reverse(),
      synonymResolutions: adminRepositories.synonymResolutions.slice(-100).reverse(),
      corroborationAnalyses: adminRepositories.corroborationAnalyses.slice(-50).reverse(),
    };
  });

  app.get('/api/knowledge-ops/living-canvas-feedback', async (request, reply) => {
    const principal = principalFor(request);
    const denied = requireKnowledgeRead(reply, principal);
    if (denied) return denied;
    const query = (request.query ?? {}) as { limit?: string; status?: string };
    const limit = Math.max(1, Math.min(500, Number(query.limit ?? 100) || 100));
    const allowedStatuses = new Set(['queued-for-curation','recorded','under-review','converted-to-candidate','dismissed']);
    const status = query.status && allowedStatuses.has(query.status) ? query.status as never : undefined;
    return { feedback: livingCanvasFeedbackStore.list(principal.tenantId, limit, status) };
  });

  app.post('/api/knowledge-ops/living-canvas-feedback/:receiptId/triage', async (request, reply) => {
    const principal = principalFor(request);
    const guard = hasPermission(principal, 'claims.assign');
    if (!guard.ok) { denyAudit(principal, 'claims.assign', guard.roles); return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'claims.assign', roles: guard.roles }); }
    const receiptId = (request.params as { receiptId: string }).receiptId;
    const body = (request.body ?? {}) as { status?: 'under-review' | 'converted-to-candidate' | 'dismissed'; rationale?: string };
    const rationale = String(body.rationale ?? '').trim();
    if (!body.status || !['under-review','converted-to-candidate','dismissed'].includes(body.status)) return reply.code(400).send({ error: 'INVALID_FEEDBACK_STATUS' });
    if (!rationale) return reply.code(400).send({ error: 'RATIONALE_REQUIRED' });
    const updated = livingCanvasFeedbackStore.triage({ tenantId: principal.tenantId, receiptId, status: body.status, curator: actorOf(principal), curationNote: rationale });
    if (!updated) return reply.code(404).send({ error: 'LIVING_CANVAS_FEEDBACK_NOT_FOUND' });
    const at = updated.reviewedAt ?? new Date().toISOString();
    const action = body.status === 'converted-to-candidate' ? 'living-canvas-feedback.candidate-staged' : body.status === 'dismissed' ? 'living-canvas-feedback.dismissed' : 'living-canvas-feedback.review-started';
    knowledgeOpsDurableRepository.recordEvent({ eventId: `event-${receiptId}-${Date.now()}`, actor: actorOf(principal), action, subject: receiptId, detail: rationale.slice(0, 500), at });
    adminRepositories.audit.push({ actor: actorOf(principal), action, subject: receiptId, at, detail: rationale.slice(0, 180) });
    return { triaged: true, feedback: updated, note: body.status === 'converted-to-candidate' ? 'The signal is staged for curator work. It remains non-scoring until a reviewed knowledge release is promoted.' : undefined };
  });

  app.get('/api/knowledge-ops/claims/:claimId', async (request, reply) => {
    const principal = principalFor(request);
    const denied = requireKnowledgeRead(reply, principal);
    if (denied) return denied;
    const claimId = (request.params as { claimId: string }).claimId;
    const claim = buildClaimReviewQueue(await loadKnowledgeLibrary()).find((item) => item.claimId === claimId);
    if (!claim) return reply.code(404).send({ error: 'CLAIM_NOT_FOUND' });
    return { claim, assignments: adminRepositories.reviewerAssignments.filter((item: { itemId: string }) => item.itemId === claimId), comments: adminRepositories.knowledgeOpsComments.filter((item: { itemId: string }) => item.itemId === claimId), decisions: adminRepositories.claimDecisions.filter((item: { claimId: string }) => item.claimId === claimId), note: 'Review events require a knowledge-release candidate before production scoring changes.' };
  });

  app.post('/api/knowledge-ops/claims/:claimId/assign', async (request, reply) => {
    const principal = principalFor(request); const guard = hasPermission(principal, 'claims.assign');
    if (!guard.ok) { denyAudit(principal, 'claims.assign', guard.roles); return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'claims.assign', roles: guard.roles }); }
    const claimId = (request.params as { claimId: string }).claimId;
    const body = (request.body ?? {}) as { reviewer?: string; reviewerRole?: string; secondaryReviewer?: string; dueAt?: string };
    const input = { itemType: 'claim' as const, itemId: claimId, assignedBy: actorOf(principal), ...(body.reviewer ? { reviewer: body.reviewer } : {}), ...(body.reviewerRole ? { reviewerRole: body.reviewerRole } : {}), ...(body.secondaryReviewer ? { secondaryReviewer: body.secondaryReviewer } : {}), ...(body.dueAt ? { dueAt: body.dueAt } : {}) };
    const verdict = validateReviewerAssignment(input);
    if (!verdict.ok) return reply.code(400).send({ error: 'ASSIGNMENT_INVALID', reasons: verdict.reasons });
    adminRepositories.reviewerAssignments = adminRepositories.reviewerAssignments.filter((item: { itemType: string; itemId: string }) => !(item.itemType === 'claim' && item.itemId === claimId));
    adminRepositories.reviewerAssignments.push(verdict.assignment);
    adminRepositories.audit.push({ actor: verdict.assignment.assignedBy, action: 'claim.assigned', subject: claimId, at: verdict.assignment.assignedAt, detail: `${verdict.assignment.reviewer} (${verdict.assignment.reviewerRole})` });
    return { assigned: true, assignment: verdict.assignment };
  });

  app.post('/api/knowledge-ops/items/:itemType/:itemId/comment', async (request, reply) => {
    const principal = principalFor(request); const guard = hasPermission(principal, 'knowledge-ops.comment');
    if (!guard.ok) { denyAudit(principal, 'knowledge-ops.comment', guard.roles); return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'knowledge-ops.comment', roles: guard.roles }); }
    const params = request.params as { itemType: string; itemId: string }; const body = (request.body ?? {}) as { body?: string; visibility?: 'internal' | 'reviewer' | 'audit' };
    const verdict = validateComment({ itemType: params.itemType as never, itemId: params.itemId, author: actorOf(principal), ...(body.body ? { body: body.body } : {}), ...(body.visibility ? { visibility: body.visibility } : {}) });
    if (!verdict.ok) return reply.code(400).send({ error: 'COMMENT_INVALID', reasons: verdict.reasons });
    adminRepositories.knowledgeOpsComments.push(verdict.comment);
    adminRepositories.audit.push({ actor: verdict.comment.author, action: 'knowledge-ops.comment', subject: `${params.itemType}:${params.itemId}`, at: verdict.comment.createdAt, detail: verdict.comment.body.slice(0, 180) });
    return { recorded: true, comment: verdict.comment };
  });

  app.post('/api/knowledge-ops/items/:itemType/:itemId/escalate', async (request, reply) => {
    const principal = principalFor(request); const guard = hasPermission(principal, 'knowledge-ops.escalate');
    if (!guard.ok) { denyAudit(principal, 'knowledge-ops.escalate', guard.roles); return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'knowledge-ops.escalate', roles: guard.roles }); }
    const params = request.params as { itemType: string; itemId: string }; const reason = String(((request.body ?? {}) as { reason?: string }).reason ?? '').trim();
    if (!reason) return reply.code(400).send({ error: 'RATIONALE_REQUIRED' });
    const assignment = { itemType: params.itemType, itemId: params.itemId, reviewer: 'knowledge-admin', reviewerRole: 'knowledge-admin', status: 'escalated', assignedBy: actorOf(principal), assignedAt: new Date().toISOString() };
    adminRepositories.reviewerAssignments.push(assignment);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'knowledge-ops.escalated', subject: `${params.itemType}:${params.itemId}`, at: assignment.assignedAt, detail: reason.slice(0, 180) });
    return { escalated: true, assignment };
  });

  app.post('/api/knowledge-ops/sources/:sourceId/refresh/request', async (request, reply) => {
    const principal = principalFor(request); const guard = hasPermission(principal, 'source.refresh');
    if (!guard.ok) { denyAudit(principal, 'source.refresh', guard.roles); return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'source.refresh', roles: guard.roles }); }
    const sourceId = (request.params as { sourceId: string }).sourceId; const reason = String(((request.body ?? {}) as { reason?: string }).reason ?? '').trim();
    if (!reason) return reply.code(400).send({ error: 'RATIONALE_REQUIRED' });
    const record = { sourceId, requestedBy: actorOf(principal), reason, requestedAt: new Date().toISOString(), status: 'requested', workerHint: 'apps/worker knowledgeSourceRefreshJob executes the target-environment source refresh.' };
    adminRepositories.sourceRefreshRequests.push(record); adminRepositories.audit.push({ actor: record.requestedBy, action: 'source-refresh.requested', subject: sourceId, at: record.requestedAt, detail: reason.slice(0, 180) });
    return { requested: true, refresh: record };
  });

  app.post('/api/knowledge-ops/duplicates/resolve', async (request, reply) => {
    const principal = principalFor(request); const guard = hasPermission(principal, 'duplicates.resolve');
    if (!guard.ok) { denyAudit(principal, 'duplicates.resolve', guard.roles); return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'duplicates.resolve', roles: guard.roles }); }
    const verdict = validateDuplicateResolution({ ...((request.body ?? {}) as object), reviewer: actorOf(principal) });
    if (!verdict.ok) return reply.code(400).send({ error: 'DUPLICATE_RESOLUTION_INVALID', reasons: verdict.reasons });
    adminRepositories.duplicateResolutions.push(verdict.record); adminRepositories.audit.push({ actor: verdict.record.reviewer, action: `duplicate.${verdict.record.resolution}`, subject: verdict.record.groupId, at: verdict.record.decidedAt, detail: verdict.record.rationale.slice(0, 180) });
    return { resolved: true, record: verdict.record, note: 'Staged; production effects require a knowledge-release candidate.' };
  });

  app.post('/api/knowledge-ops/synonyms/resolve', async (request, reply) => {
    const principal = principalFor(request); const guard = hasPermission(principal, 'synonyms.resolve');
    if (!guard.ok) { denyAudit(principal, 'synonyms.resolve', guard.roles); return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'synonyms.resolve', roles: guard.roles }); }
    const verdict = validateSynonymResolution({ ...((request.body ?? {}) as object), reviewer: actorOf(principal) });
    if (!verdict.ok) return reply.code(400).send({ error: 'SYNONYM_RESOLUTION_INVALID', reasons: verdict.reasons });
    adminRepositories.synonymResolutions.push(verdict.record); adminRepositories.audit.push({ actor: verdict.record.reviewer, action: 'synonym.resolved', subject: verdict.record.groupId, at: verdict.record.decidedAt, detail: verdict.record.rationale.slice(0, 180) });
    return { resolved: true, record: verdict.record, note: 'Staged; production effects require a knowledge-release candidate.' };
  });

  app.post('/api/knowledge-ops/corroboration/analyse', async (request, reply) => {
    const principal = principalFor(request); const guard = hasPermission(principal, 'corroboration.analyse');
    if (!guard.ok) { denyAudit(principal, 'corroboration.analyse', guard.roles); return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'corroboration.analyse', roles: guard.roles }); }
    const body = (request.body ?? {}) as { itemId?: string; evidence?: CorroborationEvidenceRef[]; contradictionCount?: number };
    if (!body.itemId?.trim()) return reply.code(400).send({ error: 'ITEM_ID_REQUIRED' });
    const analysis = buildCorroborationAnalysis({ itemId: body.itemId, ...(body.evidence ? { evidence: body.evidence } : {}), ...(body.contradictionCount !== undefined ? { contradictionCount: body.contradictionCount } : {}) });
    adminRepositories.corroborationAnalyses.push(analysis); adminRepositories.audit.push({ actor: actorOf(principal), action: 'corroboration.analysed', subject: analysis.itemId, at: analysis.generatedAt, detail: `${analysis.confidence}; independent=${analysis.independentSupportCount}; contradictions=${analysis.contradictionCount}` });
    return { analysed: true, analysis };
  });
}
