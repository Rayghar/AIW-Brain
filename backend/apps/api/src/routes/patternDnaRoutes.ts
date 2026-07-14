import type { FastifyInstance, FastifyRequest } from 'fastify';
import { hasPermission } from '@aiw/engine';
import type { KnowledgeLibrary } from '@aiw/domain';
import {
  applyPatternDnaEditsToLibrary,
  buildKnowledgeOpsEvent,
  createKnowledgeReleaseCandidate,
  createPatternDnaEdit,
  summarizePatternDnaOperations,
  validatePatternDnaEditRecord,
  type PatternDnaEditableField,
  type PatternDnaEditRecord,
} from '@aiw/knowledge';
import { adminRepositories } from '../repositories/adminRepositories.js';
import { knowledgeOpsDurableRepository } from '../repositories/knowledgeOpsDurableRepository.js';

// Pattern DNA Operations (Sprint 8.8.4). Doctrine enforced here: edits are
// durable staged operations, then materialized into knowledge-release candidates.
// The live production library is never mutated by this surface.

export interface PatternDnaDeps {
  principalFor: (request: FastifyRequest) => unknown;
  loadKnowledgeLibrary: () => Promise<KnowledgeLibrary>;
}
const actorOf = (principal: unknown): string => String((principal as { userId?: string })?.userId ?? (principal as { sub?: string })?.sub ?? 'unknown-actor');

function audit(actor: string, action: string, subject: string, detail: string): void {
  const at = new Date().toISOString();
  adminRepositories.audit.push({ actor, action, subject, at, detail });
  knowledgeOpsDurableRepository.recordEvent(buildKnowledgeOpsEvent({ actor, action, subject, detail, at }));
}

function guard(request: FastifyRequest, permission: string, principalFor: (request: FastifyRequest) => unknown): { ok: true; actor: string } | { ok: false; response: { error: string; permission: string; roles: string[] }; status: 403 } {
  const principal = principalFor(request);
  const rbacGuard = hasPermission(principal, permission);
  const actor = actorOf(principal);
  if (!rbacGuard.ok) {
    audit(actor, 'rbac.denied', permission, `roles: ${rbacGuard.roles.join(',') || 'none'}`);
    return { ok: false, status: 403, response: { error: 'PERMISSION_DENIED', permission, roles: rbacGuard.roles } };
  }
  return { ok: true, actor };
}

function listActivePatternEdits(): PatternDnaEditRecord[] {
  return knowledgeOpsDurableRepository.listPatternDnaEdits().filter((edit) => edit.status === 'staged');
}

function patternSummary(pattern: Record<string, unknown> & { id: string; name?: string }) {
  const list = (value: unknown): string[] => Array.isArray(value) ? value.map(String).filter(Boolean) : [];
  return {
    id: pattern.id,
    name: String(pattern.name ?? pattern.id),
    category: String(pattern.category ?? 'uncategorized'),
    status: String(pattern.status ?? pattern.lifecycle ?? 'unknown'),
    curated: Boolean(pattern.impactProvenance) && !String(pattern.impactProvenance ?? '').includes('pending'),
    draft: String(pattern.status ?? '').toLowerCase().includes('draft') || String(pattern.impactProvenance ?? '').includes('pending'),
    impacts: pattern.qualityAttributeImpact ?? {},
    aliases: list(pattern.aliases),
    pairsWellWith: list(pattern.pairsWellWith),
    conflictsWith: list(pattern.conflictsWith),
    obligations: list(pattern.obligations),
    risks: list(pattern.risks),
    mitigations: list(pattern.mitigations),
    vendorRealizations: list(pattern.vendorRealizations),
    requires: list(pattern.requires),
    evidence: list(pattern.evidence),
    impactNote: String(pattern.impactNote ?? ''),
  };
}

export async function patternDnaRoutes(app: FastifyInstance, deps: PatternDnaDeps): Promise<void> {
  const { principalFor, loadKnowledgeLibrary } = deps;

  app.get('/api/admin/pattern-dna', async (request, reply) => {
    const permission = guard(request, 'knowledge.read', principalFor);
    if (!permission.ok) return reply.code(permission.status).send(permission.response);
    const library = await loadKnowledgeLibrary() as unknown as { patterns: Array<Record<string, unknown> & { id: string; name?: string }> };
    const stagedEdits = listActivePatternEdits();
    const summary = summarizePatternDnaOperations(library as unknown as KnowledgeLibrary, stagedEdits);
    return { summary, staged: stagedEdits.length, stagedEdits, patterns: library.patterns.map(patternSummary) };
  });

  app.get('/api/admin/pattern-dna/pattern/:patternId', async (request, reply) => {
    const permission = guard(request, 'knowledge.read', principalFor);
    if (!permission.ok) return reply.code(permission.status).send(permission.response);
    const patternId = (request.params as { patternId: string }).patternId;
    const library = await loadKnowledgeLibrary() as unknown as { patterns: Array<Record<string, unknown> & { id: string; name?: string }> };
    const pattern = library.patterns.find((item) => item.id === patternId);
    if (!pattern) return reply.code(404).send({ error: 'PATTERN_NOT_FOUND', patternId });
    const stagedEdits = listActivePatternEdits().filter((edit) => edit.patternId === patternId);
    return { pattern: patternSummary(pattern), stagedEdits };
  });

  app.post('/api/admin/pattern-dna/:patternId/stage', async (request, reply) => {
    const permission = guard(request, 'pattern-dna.stage', principalFor);
    if (!permission.ok) return reply.code(permission.status).send(permission.response);
    const patternId = (request.params as { patternId: string }).patternId;
    const body = (request.body ?? {}) as { field?: PatternDnaEditableField; value?: unknown; rationale?: string };
    const created = createPatternDnaEdit({ patternId, field: body.field as PatternDnaEditableField, value: body.value, editor: permission.actor, rationale: String(body.rationale ?? '') });
    const verdict = validatePatternDnaEditRecord(created, await loadKnowledgeLibrary());
    if (!verdict.ok) return reply.code(400).send({ error: 'EDIT_INVALID', reasons: verdict.reasons });
    knowledgeOpsDurableRepository.savePatternDnaEdit(verdict.edit);
    audit(permission.actor, 'pattern-dna.edit-staged', `${patternId}.${verdict.edit.field}`, verdict.edit.rationale.slice(0, 180));
    return { staged: true, edit: verdict.edit, stagedCount: listActivePatternEdits().length, note: 'Staged only. Materialize into a release candidate to walk diff → validate → promote.' };
  });

  app.delete('/api/admin/pattern-dna/staged/:editId', async (request, reply) => {
    const permission = guard(request, 'pattern-dna.stage', principalFor);
    if (!permission.ok) return reply.code(permission.status).send(permission.response);
    const editId = (request.params as { editId: string }).editId;
    const discarded = knowledgeOpsDurableRepository.discardPatternDnaEdit(editId, permission.actor);
    if (!discarded) return reply.code(404).send({ error: 'EDIT_NOT_FOUND', editId });
    audit(permission.actor, 'pattern-dna.edit-discarded', editId, `Discarded staged Pattern DNA edit for ${discarded.patternId}.${discarded.field}`);
    return { discarded };
  });

  app.post('/api/admin/pattern-dna/candidate', async (request, reply) => {
    const permission = guard(request, 'release.candidate', principalFor);
    if (!permission.ok) return reply.code(permission.status).send(permission.response);
    const staged = listActivePatternEdits();
    if (!staged.length) return reply.code(400).send({ error: 'NOTHING_STAGED' });
    const current = await loadKnowledgeLibrary();
    const proposed = applyPatternDnaEditsToLibrary(current, staged);
    const candidate = createKnowledgeReleaseCandidate({ currentLibrary: current, proposedLibrary: proposed, actor: permission.actor });
    knowledgeOpsDurableRepository.saveCandidate(candidate);
    knowledgeOpsDurableRepository.clearMaterializedPatternDnaEdits(staged.map((edit) => edit.editId));
    audit(permission.actor, 'pattern-dna.candidate-created', candidate.candidateId, `${staged.length} staged Pattern DNA edit(s) materialized into a durable release candidate`);
    return { candidate: { candidateId: candidate.candidateId, status: candidate.status, baseReleaseId: candidate.baseReleaseId, changeCount: candidate.changes.length }, materializedEditIds: staged.map((edit) => edit.editId) };
  });

  // The board's act as a product flow: ratify one draft-ai attribute → candidate.
  app.post('/api/admin/calibration/:attributeId/ratify', async (request, reply) => {
    const permission = guard(request, 'calibration.ratify', principalFor);
    if (!permission.ok) return reply.code(permission.status).send(permission.response);
    const attributeId = (request.params as { attributeId: string }).attributeId;
    const current = await loadKnowledgeLibrary();
    const proposed: KnowledgeLibrary = JSON.parse(JSON.stringify(current)) as KnowledgeLibrary;
    const attribute = (proposed.qualityAttributes as unknown as Array<Record<string, unknown> & { id: string }>).find((item) => item.id === attributeId);
    if (!attribute) return reply.code(400).send({ error: 'RATIFICATION_INVALID', reason: `unknown attribute '${attributeId}'` });
    if (attribute.calibrationStatus === 'production') return reply.code(400).send({ error: 'RATIFICATION_INVALID', reason: 'already production-calibrated' });
    attribute.calibrationStatus = 'production';
    attribute.ratifiedBy = permission.actor;
    attribute.ratifiedAt = new Date().toISOString();
    const candidate = createKnowledgeReleaseCandidate({ currentLibrary: current, proposedLibrary: proposed, actor: permission.actor });
    knowledgeOpsDurableRepository.saveCandidate(candidate);
    audit(permission.actor, 'calibration.ratification-staged', attributeId, `draft-ai → production, pending release validation + promotion through ${candidate.candidateId}`);
    return { candidate: { candidateId: candidate.candidateId, status: candidate.status, baseReleaseId: candidate.baseReleaseId, changeCount: candidate.changes.length }, note: 'Ratification is staged as a release candidate. Validate then promote — the board act is gated like everything else.' };
  });
}
