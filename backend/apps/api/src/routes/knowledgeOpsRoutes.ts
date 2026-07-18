import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hasPermission,
  canPromote,
  buildClaimReviewQueue,
  buildContradictionQueue,
  buildSourceRefreshQueue,
  validateTriageDecision,
  buildAdminSummary,
  } from '@aiw/engine';
import { draftKnowledgeRecord, loadGovernancePolicy, promoteKnowledgeRecord } from '../knowledgePromotion.js';
import { adminRepositories } from '../repositories/adminRepositories.js';
import { actorName, normalizeModelRoute } from '@aiw/admin';
import type { KnowledgeOperationsRepository } from '../knowledgeOperationsRepository.js';
import type { llmRuntimeConfigurations as llmRuntimeConfigurationsType } from '../llmRuntimeStore.js';

interface RuntimePrincipal { tenantId: string; subject?: string; userId?: string; sub?: string }
export interface KnowledgeOpsDeps {
  principalFor: (request: FastifyRequest) => RuntimePrincipal;
  loadKnowledgeLibrary: () => Promise<never>;
  llmRuntimeConfigurations: typeof llmRuntimeConfigurationsType;
  knowledgeOperations: KnowledgeOperationsRepository;
}

const sourcesPath = fileURLToPath(new URL('../../../../data/trusted-architecture-sources.json', import.meta.url));
const loadSources = (): Array<{ id: string; title?: string; status?: string; reviewedAt?: string; refreshCadenceDays?: number }> => {
  try { const parsed = JSON.parse(readFileSync(sourcesPath, 'utf8')); return Array.isArray(parsed) ? parsed : parsed.sources ?? []; }
  catch { return []; }
};
const actorOf = actorName;

function requireRead(reply: { code: (status: number) => { send: (payload: unknown) => unknown } }, principal: unknown, permission: string) {
  const guard = hasPermission(principal, permission);
  if (guard.ok) return null;
  adminRepositories.audit.push({ actor: actorOf(principal), action: 'rbac.denied', subject: permission, at: new Date().toISOString(), detail: `roles: ${guard.roles.join(',') || 'none'}` });
  return reply.code(403).send({ error: 'PERMISSION_DENIED', permission, roles: guard.roles });
}

export async function knowledgeOpsRoutes(app: FastifyInstance, deps: KnowledgeOpsDeps): Promise<void> {
  const { principalFor, loadKnowledgeLibrary, llmRuntimeConfigurations, knowledgeOperations } = deps;

  // ---- Knowledge Ops work queues (console substrate) ----
  app.get('/api/knowledge-ops/queues', async (request, reply) => {
    const principal = principalFor(request);
    const denied = requireRead(reply, principal, 'knowledge.read');
    if (denied) return denied;
    const library = await loadKnowledgeLibrary();
    return {
      claimReview: buildClaimReviewQueue(library),
      contradictions: buildContradictionQueue(library),
      sourceRefresh: buildSourceRefreshQueue(loadSources()),
    };
  });

  app.post('/api/knowledge-ops/claims/decide', async (request, reply) => {
    const rbacPrincipal = principalFor(request);
    const rbacGuard = hasPermission(rbacPrincipal, 'claims.decide');
    if (!rbacGuard.ok) {
      adminRepositories.audit.push({ actor: actorOf(rbacPrincipal), action: 'rbac.denied', subject: 'claims.decide', at: new Date().toISOString(), detail: `roles: ${rbacGuard.roles.join(',') || 'none'}` });
      return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'claims.decide', roles: rbacGuard.roles });
    }
    const principal = principalFor(request);
    const body = (request.body ?? {}) as { claimId?: string; decision?: string; rationale?: string; conditionsAdded?: string[] };
    if (!body.claimId || !['approve', 'reject', 'request-changes'].includes(String(body.decision))) return reply.code(400).send({ error: 'DECISION_INVALID' });
    if (!body.rationale?.trim()) return reply.code(400).send({ error: 'RATIONALE_REQUIRED' });
    const record = { claimId: body.claimId, decision: body.decision, reviewer: actorOf(principal), rationale: body.rationale, conditionsAdded: body.conditionsAdded, decidedAt: new Date().toISOString() };
    adminRepositories.claimDecisions.push(record as never);
    adminRepositories.audit.push({ actor: record.reviewer, action: `claim.${body.decision}`, subject: body.claimId, at: record.decidedAt, detail: body.rationale.slice(0, 200) });
    return { recorded: true, decision: record };
  });

  app.post('/api/knowledge-ops/contradictions/triage', async (request, reply) => {
    const rbacPrincipal = principalFor(request);
    const rbacGuard = hasPermission(rbacPrincipal, 'contradictions.triage');
    if (!rbacGuard.ok) {
      adminRepositories.audit.push({ actor: actorOf(rbacPrincipal), action: 'rbac.denied', subject: 'contradictions.triage', at: new Date().toISOString(), detail: `roles: ${rbacGuard.roles.join(',') || 'none'}` });
      return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'contradictions.triage', roles: rbacGuard.roles });
    }
    const principal = principalFor(request);
    const body = (request.body ?? {}) as { subjectId?: string; predicate?: string; resolution?: string; conditionsA?: string[]; conditionsB?: string[]; rationale?: string };
    const decision = { subjectId: String(body.subjectId ?? ''), predicate: String(body.predicate ?? ''), resolution: body.resolution as never, conditionsA: body.conditionsA, conditionsB: body.conditionsB, reviewer: actorOf(principal), rationale: String(body.rationale ?? ''), decidedAt: new Date().toISOString() };
    const verdict = validateTriageDecision(decision as never);
    if (!verdict.valid) return reply.code(400).send({ error: 'TRIAGE_INVALID', reasons: verdict.reasons });
    adminRepositories.triageDecisions.push(decision as never);
    adminRepositories.audit.push({ actor: decision.reviewer, action: `contradiction.${decision.resolution}`, subject: `${decision.subjectId}::${decision.predicate}`, at: decision.decidedAt, detail: decision.rationale.slice(0, 200) });
    return { recorded: true, decision };
  });


  // ---- Admin control center + audit trail + model routes ----
  app.get('/api/admin/summary', async (request, reply) => {
    const principal = principalFor(request);
    const denied = requireRead(reply, principal, 'admin.control-plane.read');
    if (denied) return denied;
    const library = await loadKnowledgeLibrary();
    const summary = buildAdminSummary(library, loadSources());
    return {
      ...summary,
      queuesRecordedDecisions: { claims: adminRepositories.claimDecisions.length, triage: adminRepositories.triageDecisions.length },
      releasePins: adminRepositories.releasePins,
      llm: { configured: Boolean(process.env.AIW_LLM_PROVIDER || process.env.AIW_LLM_CONFIG_JSON), provider: process.env.AIW_LLM_PROVIDER ?? null },
      githubMesh: { enabled: process.env.AIW_ENABLE_GITHUB_KNOWLEDGE === 'true' },
    };
  });

  app.get('/api/admin/audit/export', async (request, reply) => {
    const principal = principalFor(request);
    const rbacGuard = hasPermission(principal, 'audit.export');
    if (!rbacGuard.ok) {
      adminRepositories.audit.push({ actor: actorOf(principal), action: 'rbac.denied', subject: 'audit.export', at: new Date().toISOString(), detail: `roles: ${rbacGuard.roles.join(',') || 'none'}` });
      return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'audit.export', roles: rbacGuard.roles });
    }
    const platformScope = rbacGuard.roles.includes('platform-admin');
    const events = adminRepositories.audit.filter((event: { tenantId?: string }) => platformScope || event.tenantId === principal.tenantId);
    const rows = events.map((event: { at: string; actor: string; action: string; subject: string; detail: string; tenantId?: string }) => [event.at, event.tenantId ?? principal.tenantId, event.actor, event.action, event.subject, `"${String(event.detail).replaceAll('"', "'" )}"`].join(','));
    reply.header('content-type', 'text/csv; charset=utf-8');
    return ['at,tenantId,actor,action,subject,detail', ...rows].join('\n');
  });

  app.get('/api/admin/audit', async (request, reply) => {
    const principal = principalFor(request);
    const denied = requireRead(reply, principal, 'audit.read');
    if (denied) return denied;
    const verdict = hasPermission(principal, 'audit.read');
    const platformScope = verdict.ok && verdict.roles.includes('platform-admin');
    const events = adminRepositories.audit.filter((event: { tenantId?: string }) => platformScope || event.tenantId === principal.tenantId);
    return { events: events.slice(-200).reverse(), tenantId: principal.tenantId, platformScope };
  });

  app.get('/api/admin/model-routes', async (request, reply) => {
    const principal = principalFor(request);
    const denied = requireRead(reply, principal, 'model-route.read');
    if (denied) return denied;
    return { routes: [...adminRepositories.modelRoutes.values()] };
  });

  app.post('/api/admin/model-routes', async (request, reply) => {
    const rbacPrincipal = principalFor(request);
    const rbacGuard = hasPermission(rbacPrincipal, 'model-route.write');
    if (!rbacGuard.ok) {
      adminRepositories.audit.push({ actor: actorOf(rbacPrincipal), action: 'rbac.denied', subject: 'model-route.write', at: new Date().toISOString(), detail: `roles: ${rbacGuard.roles.join(',') || 'none'}` });
      return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'model-route.write', roles: rbacGuard.roles });
    }
    const principal = principalFor(request);
    const verdict = normalizeModelRoute((request.body ?? {}) as never, actorOf(principal));
    if (!verdict.ok) return reply.code(400).send({ error: 'ROUTE_INVALID', reasons: verdict.reasons });
    const before = adminRepositories.modelRoutes.get(verdict.route.id) ?? null;
    adminRepositories.modelRoutes.set(verdict.route.id, verdict.route);
    adminRepositories.audit.push({ actor: verdict.route.updatedBy, action: before ? 'model-route.updated' : 'model-route.created', subject: verdict.route.id, at: verdict.route.updatedAt, detail: `${verdict.route.provider}/${verdict.route.model} (${verdict.route.purpose})` });
    return { saved: true, route: verdict.route, governance: 'Routes configure ENRICHMENT only. The LLM is never the authority for policy, eligibility, scoring, release approval, or architecture mutation.' };
  });

  app.put('/api/admin/model-routes/:id', async (request, reply) => {
    const rbacPrincipal = principalFor(request);
    const rbacGuard = hasPermission(rbacPrincipal, 'model-route.write');
    if (!rbacGuard.ok) return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'model-route.write', roles: rbacGuard.roles });
    const id = (request.params as { id: string }).id;
    const current = adminRepositories.modelRoutes.get(id);
    if (!current) return reply.code(404).send({ error: 'ROUTE_NOT_FOUND' });
    const principal = principalFor(request);
    const verdict = normalizeModelRoute({ ...current, ...(request.body ?? {}), id }, actorOf(principal));
    if (!verdict.ok) return reply.code(400).send({ error: 'ROUTE_INVALID', reasons: verdict.reasons });
    adminRepositories.modelRoutes.set(id, verdict.route);
    adminRepositories.audit.push({ actor: verdict.route.updatedBy, action: 'model-route.updated', subject: id, at: verdict.route.updatedAt, detail: 'patch via Admin Control Plane' });
    return { saved: true, route: verdict.route };
  });

  app.delete('/api/admin/model-routes/:id', async (request, reply) => {
    const rbacPrincipal = principalFor(request);
    const rbacGuard = hasPermission(rbacPrincipal, 'model-route.write');
    if (!rbacGuard.ok) return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'model-route.write', roles: rbacGuard.roles });
    const id = (request.params as { id: string }).id;
    const before = adminRepositories.modelRoutes.get(id);
    if (!before) return reply.code(404).send({ error: 'ROUTE_NOT_FOUND' });
    adminRepositories.modelRoutes.delete(id);
    adminRepositories.audit.push({ actor: actorOf(principalFor(request)), action: 'model-route.deleted', subject: id, at: new Date().toISOString(), detail: `${before.provider}/${before.model}` });
    return { deleted: true };
  });

  app.post('/api/admin/model-routes/:id/test', async (request, reply) => {
    const rbacPrincipal = principalFor(request);
    const rbacGuard = hasPermission(rbacPrincipal, 'model-route.test');
    if (!rbacGuard.ok) return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'model-route.test', roles: rbacGuard.roles });
    const principal = rbacPrincipal;
    const id = (request.params as { id: string }).id;
    const route = adminRepositories.modelRoutes.get(id);
    if (!route) return reply.code(404).send({ error: 'ROUTE_NOT_FOUND' });
    const providerConfigured = Boolean(process.env.AIW_LLM_PROVIDER || process.env.AIW_LLM_CONFIG_JSON || route.deterministicOnly || route.provider === 'offline-deterministic' || route.provider === 'local');
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'model-route.tested', subject: id, at: new Date().toISOString(), detail: `provider=${route.provider}; configured=${providerConfigured}` });
    return { routeId: id, configValid: Boolean(route.model && route.provider), providerConfigured, structuredOutputRequired: route.structuredOutputRequired, authority: 'enrichment-only' };
  });

app.post('/api/knowledge/draft-record', async (request, reply) => {
  const principal = principalFor(request);
  const parsed = z.object({
    recordType: z.enum(['architectureStyle','pattern']),
    subjectName: z.string().min(2).max(80),
    evidence: z.array(z.object({ id: z.string().min(1), excerpt: z.string().min(1).max(4000) })).min(1).max(8),
    claims: z.array(z.object({ claimType: z.string().max(80), predicate: z.string().max(200), object: z.string().max(1000) })).max(40).default([]),
  }).safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ available: false, degradedReason: 'INVALID_DRAFT_REQUEST', details: parsed.error.flatten() });
  const result = await draftKnowledgeRecord(await llmRuntimeConfigurations.gateway(principal.tenantId), parsed.data, await loadKnowledgeLibrary());
  if (result.available && result.draft) {
    const record = result.draft.record;
    await knowledgeOperations.saveKnowledgeRecordDraft(principal.tenantId, {
      draftId: `${String(record.id)}-0.1.0`,
      recordId: String(record.id),
      recordType: parsed.data.recordType,
      status: 'candidate',
      sourceEvidenceIds: parsed.data.evidence.map((item: { id: string }) => item.id),
      record,
      reviewerBrief: result.draft.reviewerBrief as unknown as Record<string, unknown>,
    });
  }
  return result;
});
app.post('/api/knowledge/promotion-check', async (request, reply) => {
  principalFor(request);
  const parsed = z.object({ record: z.record(z.string(), z.unknown()).and(z.object({ id: z.string().min(1) })) }).safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'RECORD_REQUIRED', details: parsed.error.flatten() });
  return canPromote(parsed.data.record as never, await loadGovernancePolicy());
});
app.post('/api/knowledge/promote', async (request, reply) => {
  principalFor(request);
  const parsed = z.object({ record: z.record(z.string(), z.unknown()).and(z.object({ id: z.string().min(1) })), owner: z.string().min(2).max(160), targetStatus: z.enum(['reviewed','approved']) }).safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'INVALID_PROMOTION_REQUEST', details: parsed.error.flatten() });
  const result = await promoteKnowledgeRecord({ record: parsed.data.record as never, owner: parsed.data.owner, targetStatus: parsed.data.targetStatus });
  if (result.allowed && result.record) {
    await knowledgeOperations.saveKnowledgeRecordDraft(principalFor(request).tenantId, {
      draftId: `${String(result.record.id)}-${String(result.record.version ?? '0.1.0')}`,
      recordId: String(result.record.id),
      recordType: (result.record.recordType === 'architectureStyle' ? 'architectureStyle' : 'pattern'),
      status: parsed.data.targetStatus,
      owner: parsed.data.owner,
      sourceEvidenceIds: Array.isArray(result.record.evidence) ? result.record.evidence.map(String) : [],
      record: result.record,
    });
  }
  return result;
});
}
