import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { KnowledgeLibrary } from '@aiw/domain';
import { hasPermission } from '@aiw/engine';
import {
  approveKnowledgeReleaseCandidate,
  buildKnowledgeOpsEvent,
  createKnowledgeReleaseCandidate,
  pinKnowledgeRelease,
  promoteKnowledgeReleaseCandidate,
  releaseManifestToJson,
  rollbackKnowledgeReleaseCandidate,
  validateKnowledgeReleaseCandidate,
} from '@aiw/knowledge';
import { adminRepositories } from '../repositories/adminRepositories.js';
import { knowledgeOpsDurableRepository } from '../repositories/knowledgeOpsDurableRepository.js';

// Knowledge Release routes (Sprint 8.8.3) — release lifecycle is now backed by
// the durable Knowledge Ops repository. Candidate knowledge remains isolated
// until explicit validation + promotion creates a released manifest.
export interface KnowledgeReleaseDeps {
  principalFor: (request: FastifyRequest) => unknown;
  loadKnowledgeLibrary: () => Promise<KnowledgeLibrary>;
}

const actorOf = (principal: unknown): string => String((principal as { userId?: string })?.userId ?? (principal as { sub?: string })?.sub ?? 'unknown-actor');

function deny(reply: { code: (status: number) => { send: (payload: unknown) => unknown } }, principal: unknown, permission: string) {
  const guard = hasPermission(principal, permission);
  if (guard.ok) return null;
  const actor = actorOf(principal);
  const event = buildKnowledgeOpsEvent({ actor, action: 'rbac.denied', subject: permission, detail: `roles: ${guard.roles.join(',') || 'none'}` });
  knowledgeOpsDurableRepository.recordEvent(event);
  adminRepositories.audit.push({ actor, action: event.action, subject: event.subject, at: event.at, detail: event.detail });
  return reply.code(403).send({ error: 'PERMISSION_DENIED', permission, roles: guard.roles });
}

export async function knowledgeReleaseRoutes(app: FastifyInstance, deps: KnowledgeReleaseDeps): Promise<void> {
  const { principalFor, loadKnowledgeLibrary } = deps;

  app.get('/api/knowledge-releases', async (request, reply) => {
    const principal = principalFor(request);
    const denied = deny(reply, principal, 'release.read');
    if (denied) return denied;
    return {
      candidates: knowledgeOpsDurableRepository.listCandidates().map((candidate) => ({
        candidateId: candidate.candidateId,
        status: candidate.status,
        baseReleaseId: candidate.baseReleaseId,
        proposedReleaseId: candidate.proposedReleaseId,
        createdBy: candidate.createdBy,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt,
        changeCount: candidate.changes.length,
        validation: candidate.validation,
      })),
    };
  });

  app.get('/api/knowledge-releases/released', async (request, reply) => {
    const principal = principalFor(request);
    const denied = deny(reply, principal, 'release.read');
    if (denied) return denied;
    return { manifests: knowledgeOpsDurableRepository.listReleasedManifests() };
  });
  app.get('/api/knowledge-releases/pins', async (request, reply) => {
    const principal = principalFor(request);
    const denied = deny(reply, principal, 'release.read');
    if (denied) return denied;
    return { pins: knowledgeOpsDurableRepository.listPins() };
  });
  app.get('/api/knowledge-releases/events', async (request, reply) => {
    const principal = principalFor(request);
    const denied = deny(reply, principal, 'release.read');
    if (denied) return denied;
    return { events: knowledgeOpsDurableRepository.listEvents(250) };
  });
  app.get('/api/knowledge-ops/durable-snapshot', async (request, reply) => {
    const principal = principalFor(request);
    const denied = deny(reply, principal, 'release.read');
    if (denied) return denied;
    const snapshot = knowledgeOpsDurableRepository.snapshot();
    return {
      ...snapshot,
      candidates: snapshot.candidates.map((candidate) => ({ ...candidate, proposedLibrary: { libraryId: candidate.proposedLibrary.libraryId, version: candidate.proposedLibrary.version, knowledgeReleaseId: candidate.proposedLibrary.knowledgeReleaseId } })),
    };
  });

  app.post('/api/knowledge-releases/candidate', async (request, reply) => {
    const principal = principalFor(request);
    const denied = deny(reply, principal, 'release.candidate');
    if (denied) return denied;
    const body = (request.body ?? {}) as { proposedLibrary?: KnowledgeLibrary };
    if (!body.proposedLibrary || typeof body.proposedLibrary !== 'object') return reply.code(400).send({ error: 'PROPOSED_LIBRARY_REQUIRED' });
    const current = await loadKnowledgeLibrary();
    const candidate = createKnowledgeReleaseCandidate({ currentLibrary: current, proposedLibrary: body.proposedLibrary, actor: actorOf(principal) });
    knowledgeOpsDurableRepository.saveCandidate(candidate);
    const event = buildKnowledgeOpsEvent({ actor: actorOf(principal), action: 'release.candidate.created', subject: candidate.candidateId, detail: `${candidate.changes.length} staged change(s) on ${candidate.baseReleaseId}` });
    knowledgeOpsDurableRepository.recordEvent(event);
    adminRepositories.audit.push({ actor: event.actor, action: event.action, subject: event.subject, at: event.at, detail: event.detail });
    return { candidate: { ...candidate, proposedLibrary: { libraryId: candidate.proposedLibrary.libraryId, version: candidate.proposedLibrary.version, knowledgeReleaseId: candidate.proposedLibrary.knowledgeReleaseId } }, note: 'Candidate knowledge is isolated from production recommendations until validation and promotion.' };
  });

  app.get('/api/knowledge-releases/:candidateId/diff', async (request, reply) => {
    const principal = principalFor(request);
    const denied = deny(reply, principal, 'release.read');
    if (denied) return denied;
    const candidate = knowledgeOpsDurableRepository.getCandidate((request.params as { candidateId: string }).candidateId);
    if (!candidate) return reply.code(404).send({ error: 'CANDIDATE_NOT_FOUND' });
    return { candidateId: candidate.candidateId, status: candidate.status, baseReleaseId: candidate.baseReleaseId, proposedReleaseId: candidate.proposedReleaseId, changes: candidate.changes };
  });

  app.post('/api/knowledge-releases/:candidateId/validate', async (request, reply) => {
    const principal = principalFor(request);
    const candidate = knowledgeOpsDurableRepository.getCandidate((request.params as { candidateId: string }).candidateId);
    if (!candidate) return reply.code(404).send({ error: 'CANDIDATE_NOT_FOUND' });
    const body = (request.body ?? {}) as { openContradictions?: number; licenseBlockers?: number; regressionFailures?: number; candidateInfluencesProduction?: boolean };
    const current = await loadKnowledgeLibrary();
    const validation = validateKnowledgeReleaseCandidate({
      candidate,
      currentReleaseId: current.knowledgeReleaseId ?? current.version,
      openContradictions: Number(body.openContradictions ?? 0),
      licenseBlockers: Number(body.licenseBlockers ?? 0),
      regressionFailures: Number(body.regressionFailures ?? 0),
      candidateInfluencesProduction: body.candidateInfluencesProduction === true,
    });
    const updated = { ...candidate, validation, status: validation.allowed ? candidate.status : 'blocked' as const, updatedAt: validation.checkedAt };
    knowledgeOpsDurableRepository.saveCandidate(updated);
    const event = buildKnowledgeOpsEvent({ actor: actorOf(principal), action: validation.allowed ? 'release.validated' : 'release.validation.blocked', subject: candidate.candidateId, detail: validation.checks.filter((check) => !check.ok).map((check) => check.id).join(',') || 'all checks passed' });
    knowledgeOpsDurableRepository.recordEvent(event);
    adminRepositories.audit.push({ actor: event.actor, action: event.action, subject: event.subject, at: event.at, detail: event.detail });
    return { validation, candidate: { candidateId: updated.candidateId, status: updated.status } };
  });

  app.post('/api/knowledge-releases/:candidateId/approve', async (request, reply) => {
    const principal = principalFor(request);
    const denied = deny(reply, principal, 'release.promote');
    if (denied) return denied;
    const candidate = knowledgeOpsDurableRepository.getCandidate((request.params as { candidateId: string }).candidateId);
    if (!candidate) return reply.code(404).send({ error: 'CANDIDATE_NOT_FOUND' });
    if (!candidate.validation?.allowed) return reply.code(409).send({ error: 'VALIDATION_REQUIRED' });
    const updated = approveKnowledgeReleaseCandidate(candidate, actorOf(principal));
    knowledgeOpsDurableRepository.saveCandidate(updated);
    const event = buildKnowledgeOpsEvent({ actor: actorOf(principal), action: 'release.approved', subject: updated.candidateId, detail: 'candidate approved for promotion' });
    knowledgeOpsDurableRepository.recordEvent(event);
    adminRepositories.audit.push({ actor: event.actor, action: event.action, subject: event.subject, at: event.at, detail: event.detail });
    return { approved: true, candidateId: updated.candidateId, status: updated.status };
  });

  app.post('/api/knowledge-releases/:candidateId/promote', async (request, reply) => {
    const principal = principalFor(request);
    const denied = deny(reply, principal, 'release.promote');
    if (denied) return denied;
    const candidate = knowledgeOpsDurableRepository.getCandidate((request.params as { candidateId: string }).candidateId);
    if (!candidate) return reply.code(404).send({ error: 'CANDIDATE_NOT_FOUND' });
    const body = (request.body ?? {}) as { releaseId?: string };
    const result = promoteKnowledgeReleaseCandidate({ candidate, actor: actorOf(principal), ...(body.releaseId ? { releaseId: body.releaseId } : {}) });
    if ('error' in result) {
      knowledgeOpsDurableRepository.saveCandidate(result.candidate);
      return reply.code(409).send({ error: result.error, candidate: { candidateId: result.candidate.candidateId, status: result.candidate.status } });
    }
    knowledgeOpsDurableRepository.saveCandidate(result.candidate);
    knowledgeOpsDurableRepository.saveReleasedManifest(result.manifest);
    const event = buildKnowledgeOpsEvent({ actor: actorOf(principal), action: 'release.promoted', subject: result.manifest.releaseId, detail: `${result.manifest.changeCount} change(s) promoted from ${result.manifest.candidateId}`, payload: { manifest: result.manifest } });
    knowledgeOpsDurableRepository.recordEvent(event);
    adminRepositories.audit.push({ actor: event.actor, action: event.action, subject: event.subject, at: event.at, detail: event.detail });
    return { promoted: true, releaseId: result.manifest.releaseId, manifest: result.manifest };
  });

  app.post('/api/knowledge-releases/:candidateId/rollback', async (request, reply) => {
    const principal = principalFor(request);
    const denied = deny(reply, principal, 'release.rollback');
    if (denied) return denied;
    const candidate = knowledgeOpsDurableRepository.getCandidate((request.params as { candidateId: string }).candidateId);
    if (!candidate) return reply.code(404).send({ error: 'CANDIDATE_NOT_FOUND' });
    const body = (request.body ?? {}) as { reason?: string };
    const updated = rollbackKnowledgeReleaseCandidate(candidate, actorOf(principal), String(body.reason ?? 'unspecified'));
    knowledgeOpsDurableRepository.saveCandidate(updated);
    const event = buildKnowledgeOpsEvent({ actor: actorOf(principal), action: 'release.rolled-back', subject: updated.candidateId, detail: updated.rollbackReason ?? 'unspecified' });
    knowledgeOpsDurableRepository.recordEvent(event);
    adminRepositories.audit.push({ actor: event.actor, action: event.action, subject: event.subject, at: event.at, detail: event.detail });
    return { rolledBack: true, candidateId: updated.candidateId, status: updated.status };
  });

  app.post('/api/knowledge-releases/pin', async (request, reply) => {
    const principal = principalFor(request);
    const denied = deny(reply, principal, 'release.pin');
    if (denied) return denied;
    const body = (request.body ?? {}) as { scope?: string; scopeId?: string; releaseId?: string };
    if (!['tenant', 'project'].includes(String(body.scope)) || !body.scopeId || !body.releaseId) return reply.code(400).send({ error: 'PIN_INVALID' });
    const pin = pinKnowledgeRelease({ scope: body.scope as never, scopeId: body.scopeId, releaseId: body.releaseId, actor: actorOf(principal) });
    knowledgeOpsDurableRepository.savePin(pin);
    const event = buildKnowledgeOpsEvent({ actor: actorOf(principal), action: 'release.pinned', subject: `${pin.scope}:${pin.scopeId}`, detail: `→ ${pin.releaseId}` });
    knowledgeOpsDurableRepository.recordEvent(event);
    adminRepositories.audit.push({ actor: event.actor, action: event.action, subject: event.subject, at: event.at, detail: event.detail });
    return { pinned: true, pin };
  });

  app.get('/api/knowledge-releases/:candidateId/manifest', async (request, reply) => {
    const principal = principalFor(request);
    const denied = deny(reply, principal, 'release.read');
    if (denied) return denied;
    const candidateId = (request.params as { candidateId: string }).candidateId;
    const manifest = knowledgeOpsDurableRepository.listReleasedManifests().find((item) => item.candidateId === candidateId || item.releaseId === candidateId);
    if (!manifest) return reply.code(404).send({ error: 'MANIFEST_NOT_FOUND' });
    return { manifest, json: releaseManifestToJson(manifest) };
  });
}
