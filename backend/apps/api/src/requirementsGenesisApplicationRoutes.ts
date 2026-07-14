import { z } from 'zod';
import type { RequirementsDistillationProposal, RequirementSourceKind } from '@aiw/domain';
import { canPerform, mergeRequirementsProposal, migrateLegacyRequirementsProject, resolveRequirementConflict } from '@aiw/engine';
import type { ApplicationRouteContext } from './applicationRouteContext.js';
import { principalFor, projectParamsSchema } from './appRuntimeSupport.js';
import { RepositoryRevisionConflict } from './repository.js';

const classificationSchema = z.enum(['public','internal','confidential','restricted']);
const sourceKindSchema = z.enum(['idea','paste','text','markdown','docx','pdf','spreadsheet','workshop-note','existing-sdd']);

function mediaKind(filename: string, mediaType: string): RequirementSourceKind {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.docx') || /wordprocessingml/.test(mediaType)) return 'docx';
  if (lower.endsWith('.pdf') || mediaType === 'application/pdf') return 'pdf';
  if (lower.endsWith('.md') || /markdown/.test(mediaType)) return 'markdown';
  if (lower.endsWith('.csv') || /csv/.test(mediaType) || lower.endsWith('.xlsx')) return 'spreadsheet';
  return 'text';
}

async function extractFileText(filename: string, mediaType: string, base64: string): Promise<{ text: string; warnings: string[]; kind: RequirementSourceKind }> {
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) throw new Error('EMPTY_SOURCE_FILE');
  if (buffer.length > 7 * 1024 * 1024) throw new Error('SOURCE_FILE_TOO_LARGE');
  const kind = mediaKind(filename, mediaType);
  const warnings: string[] = [];
  if (kind === 'docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    warnings.push(...result.messages.map((item) => String(item.message)).filter(Boolean).slice(0, 10));
    return { text: result.value.trim(), warnings, kind };
  }
  if (kind === 'pdf') {
    const module = await import('pdf-parse');
    const parse = (module.default ?? module) as unknown as (data: Buffer) => Promise<{ text?: string; numpages?: number }>;
    const result = await parse(buffer);
    if (!result.text?.trim()) warnings.push('The PDF contains little or no extractable text. Scanned documents require a text-enabled source.');
    return { text: result.text?.trim() ?? '', warnings, kind };
  }
  if (kind === 'spreadsheet' && filename.toLowerCase().endsWith('.xlsx')) {
    warnings.push('XLSX binary extraction is not enabled in this release. Export the requirements register as CSV for exact row-level ingestion.');
    return { text: '', warnings, kind };
  }
  return { text: buffer.toString('utf8').replace(/^\uFEFF/, '').trim(), warnings, kind };
}

export async function registerRequirementsGenesisApplicationRoutes(context: ApplicationRouteContext) {
  const { app, repository, auditLog, publishActivity, architectureBrain } = context;

  app.post('/api/requirements-intelligence/extract-source', async (request, reply) => {
    const parsed = z.object({
      filename: z.string().min(1).max(260), mediaType: z.string().max(160).default('application/octet-stream'),
      base64: z.string().min(1).max(11_000_000), classification: classificationSchema.default('internal'),
    }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_REQUIREMENTS_SOURCE', details: parsed.error.flatten() });
    principalFor(request);
    try {
      const extracted = await extractFileText(parsed.data.filename, parsed.data.mediaType, parsed.data.base64);
      return { name: parsed.data.filename, mediaType: parsed.data.mediaType, classification: parsed.data.classification, ...extracted, characterCount: extracted.text.length };
    } catch (error) {
      const code = error instanceof Error ? error.message : 'SOURCE_EXTRACTION_FAILED';
      if (['EMPTY_SOURCE_FILE','SOURCE_FILE_TOO_LARGE'].includes(code)) return reply.code(400).send({ error: code });
      return reply.code(422).send({ error: 'SOURCE_EXTRACTION_FAILED', message: code });
    }
  });

  app.post('/api/requirements-intelligence/distill', async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z.object({
      projectId: z.string().min(1).max(200),
      branchId: z.string().min(1).max(200),
      expectedRevision: z.number().int().nonnegative(),
      sources: z.array(z.object({ id: z.string().optional(), name: z.string().min(1).max(260), mediaType: z.string().max(160).optional(), kind: sourceKindSchema.optional(), classification: classificationSchema.optional(), text: z.string().min(1).max(400000) })).min(1).max(20),
      intelligenceMode: z.enum(['deterministic','hybrid']).default('hybrid'),
      knowledgeReleaseId: z.string().max(160).default('CAMBRIDGE-SA-1.0'),
    }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_REQUIREMENTS_DISTILLATION_REQUEST', details: parsed.error.flatten() });
    const project = await repository.getProject(principal.tenantId, parsed.data.projectId, parsed.data.branchId);
    if (!project || !canPerform(project, principal.subject, 'project.read')) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' });
    if (project.revision !== parsed.data.expectedRevision) return reply.code(409).send({ error: 'REVISION_CONFLICT', currentRevision: project.revision });
    const sourceInputs = parsed.data.sources.map((item) => ({
      name: item.name,
      text: item.text,
      ...(item.id ? { id: item.id } : {}),
      ...(item.mediaType ? { mediaType: item.mediaType } : {}),
      ...(item.kind ? { kind: item.kind } : {}),
      ...(item.classification ? { classification: item.classification } : {}),
    }));
    return architectureBrain.distillRequirements({
      tenantId: principal.tenantId,
      project,
      sources: sourceInputs,
      intelligenceMode: parsed.data.intelligenceMode,
      knowledgeReleaseId: parsed.data.knowledgeReleaseId,
    });
  });

  app.post('/api/projects/:projectId/branches/:branchId/requirements-intelligence/apply', async (request, reply) => {
    const params = projectParamsSchema.safeParse(request.params);
    const body = z.object({ expectedRevision: z.number().int().nonnegative(), proposal: z.custom<RequirementsDistillationProposal>((value) => Boolean(value && typeof value === 'object' && (value as { schemaVersion?: unknown }).schemaVersion === '1.0')), knowledgeReleaseId: z.string().max(160).default('CAMBRIDGE-SA-1.0') }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'INVALID_REQUIREMENTS_APPLY_REQUEST', details: body.success ? undefined : body.error.flatten() });
    const principal = principalFor(request);
    const project = await repository.getProject(principal.tenantId, params.data.projectId, params.data.branchId);
    if (!project) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' });
    if (!canPerform(project, principal.subject, 'project.edit')) return reply.code(403).send({ error: 'FORBIDDEN:project.edit' });
    if (project.revision !== body.data.expectedRevision) return reply.code(409).send({ error: 'REVISION_CONFLICT', currentRevision: project.revision });
    try {
      const next = mergeRequirementsProposal(project, body.data.proposal, body.data.knowledgeReleaseId);
      const saved = await repository.saveProject(next, project.revision);
      auditLog.append({ tenantId: saved.tenantId, projectId: saved.id, branchId: saved.branch.id, actorId: principal.subject, eventType: 'architecture-intelligence', action: 'accept-requirements-genesis-proposal', targetType: 'requirements-model', targetId: saved.id, outcome: 'success', correlationId: request.id, retentionDays: saved.securitySettings.auditRetentionDays, metadata: { sourceCount: saved.requirementsIntelligence?.sources.length ?? 0, requirementCount: saved.requirementsIntelligence?.requirements.length ?? 0, journeyCount: saved.requirementsIntelligence?.journeys.length ?? 0, knowledgeReleaseId: body.data.knowledgeReleaseId, previousRevision: project.revision, nextRevision: saved.revision } });
      await publishActivity({ tenantId: saved.tenantId, projectId: saved.id, branchId: saved.branch.id, type: 'requirements-genesis.accepted', actorId: principal.subject, summary: `Accepted ${saved.requirementsIntelligence?.requirements.length ?? 0} requirements and ${saved.requirementsIntelligence?.journeys.length ?? 0} solution journeys`, revision: saved.revision, correlationId: request.id });
      return reply.send(saved);
    } catch (error) {
      if (error instanceof RepositoryRevisionConflict) return reply.code(409).send({ error: 'REVISION_CONFLICT', currentRevision: error.currentRevision });
      if (error instanceof Error && error.message === 'STALE_REQUIREMENTS_PROPOSAL') return reply.code(409).send({ error: 'STALE_REQUIREMENTS_PROPOSAL', currentRevision: project.revision });
      if (error instanceof Error && error.message === 'UNRESOLVED_REQUIREMENTS_CONFLICTS') return reply.code(422).send({ error: 'UNRESOLVED_REQUIREMENTS_CONFLICTS', message: 'Resolve or explicitly disposition every selected conflict before accepting the canonical requirements model.' });
      if (error instanceof Error && error.message === 'INVALID_REQUIREMENTS_CONFLICT_RESOLUTION') return reply.code(422).send({ error: 'INVALID_REQUIREMENTS_CONFLICT_RESOLUTION', message: 'Every conflict disposition requires a clear resolution rationale.' });
      throw error;
    }
  });


  app.post('/api/projects/:projectId/branches/:branchId/requirements-intelligence/conflicts/:conflictId/resolve', async (request, reply) => {
    const params = z.object({ projectId: z.string().min(1).max(200), branchId: z.string().min(1).max(200), conflictId: z.string().min(1).max(240) }).safeParse(request.params);
    const body = z.object({
      expectedRevision: z.number().int().nonnegative(),
      status: z.enum(['resolved','accepted-variance','false-positive']),
      resolution: z.string().trim().min(8).max(4000),
    }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'INVALID_REQUIREMENTS_CONFLICT_RESOLUTION', details: body.success ? undefined : body.error.flatten() });
    const principal = principalFor(request);
    const project = await repository.getProject(principal.tenantId, params.data.projectId, params.data.branchId);
    if (!project) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' });
    if (!canPerform(project, principal.subject, 'project.edit')) return reply.code(403).send({ error: 'FORBIDDEN:project.edit' });
    if (project.revision !== body.data.expectedRevision) return reply.code(409).send({ error: 'REVISION_CONFLICT', currentRevision: project.revision });
    try {
      const next = resolveRequirementConflict(project, { conflictId: params.data.conflictId, status: body.data.status, resolution: body.data.resolution });
      const saved = await repository.saveProject(next, project.revision);
      auditLog.append({
        tenantId: saved.tenantId,
        projectId: saved.id,
        branchId: saved.branch.id,
        actorId: principal.subject,
        eventType: 'architecture-intelligence',
        action: 'resolve-requirements-conflict',
        targetType: 'requirements-conflict',
        targetId: params.data.conflictId,
        outcome: 'success',
        correlationId: request.id,
        retentionDays: saved.securitySettings.auditRetentionDays,
        metadata: { previousRevision: project.revision, nextRevision: saved.revision, status: body.data.status },
      });
      await publishActivity({
        tenantId: saved.tenantId,
        projectId: saved.id,
        branchId: saved.branch.id,
        type: 'requirements-genesis.conflict-resolved',
        actorId: principal.subject,
        summary: `Dispositioned requirements conflict ${params.data.conflictId} as ${body.data.status}`,
        revision: saved.revision,
        correlationId: request.id,
      });
      return reply.send(saved);
    } catch (error) {
      if (error instanceof RepositoryRevisionConflict) return reply.code(409).send({ error: 'REVISION_CONFLICT', currentRevision: error.currentRevision });
      if (error instanceof Error && error.message === 'REQUIREMENTS_CONFLICT_NOT_FOUND') return reply.code(404).send({ error: 'REQUIREMENTS_CONFLICT_NOT_FOUND' });
      if (error instanceof Error && error.message === 'REQUIREMENTS_INTELLIGENCE_NOT_INITIALIZED') return reply.code(409).send({ error: 'REQUIREMENTS_INTELLIGENCE_NOT_INITIALIZED' });
      if (error instanceof Error && error.message === 'REQUIREMENTS_CONFLICT_RESOLUTION_REQUIRED') return reply.code(400).send({ error: 'REQUIREMENTS_CONFLICT_RESOLUTION_REQUIRED' });
      throw error;
    }
  });

  app.post('/api/projects/:projectId/branches/:branchId/requirements-intelligence/migrate-legacy', async (request, reply) => {
    const params = projectParamsSchema.safeParse(request.params);
    const body = z.object({
      expectedRevision: z.number().int().nonnegative(),
      knowledgeReleaseId: z.string().max(160).default('CAMBRIDGE-SA-1.0'),
    }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'INVALID_REQUIREMENTS_MIGRATION_REQUEST', details: body.success ? undefined : body.error.flatten() });
    const principal = principalFor(request);
    const project = await repository.getProject(principal.tenantId, params.data.projectId, params.data.branchId);
    if (!project) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' });
    if (!canPerform(project, principal.subject, 'project.edit')) return reply.code(403).send({ error: 'FORBIDDEN:project.edit' });
    if (project.revision !== body.data.expectedRevision) return reply.code(409).send({ error: 'REVISION_CONFLICT', currentRevision: project.revision });
    if (project.requirementsIntelligence?.migrationReceipt) return reply.send(project);
    try {
      const next = migrateLegacyRequirementsProject(project, body.data.knowledgeReleaseId);
      const saved = await repository.saveProject(next, project.revision);
      auditLog.append({
        tenantId: saved.tenantId,
        projectId: saved.id,
        branchId: saved.branch.id,
        actorId: principal.subject,
        eventType: 'architecture-intelligence',
        action: 'migrate-legacy-requirements',
        targetType: 'requirements-model',
        targetId: saved.id,
        outcome: 'success',
        correlationId: request.id,
        retentionDays: saved.securitySettings.auditRetentionDays,
        metadata: {
          previousRevision: project.revision,
          nextRevision: saved.revision,
          migratedRequirementCount: saved.requirementsIntelligence?.requirements.length ?? 0,
          migratedStakeholderCount: saved.requirementsIntelligence?.stakeholders.length ?? 0,
          graphNodeCount: saved.requirementsIntelligence?.contextGraph?.nodes.length ?? 0,
          graphEdgeCount: saved.requirementsIntelligence?.contextGraph?.edges.length ?? 0,
          knowledgeReleaseId: body.data.knowledgeReleaseId,
        },
      });
      await publishActivity({
        tenantId: saved.tenantId,
        projectId: saved.id,
        branchId: saved.branch.id,
        type: 'requirements-genesis.legacy-migrated',
        actorId: principal.subject,
        summary: 'Migrated legacy requirements into the canonical Requirements Intelligence model',
        revision: saved.revision,
        correlationId: request.id,
      });
      return reply.send(saved);
    } catch (error) {
      if (error instanceof RepositoryRevisionConflict) return reply.code(409).send({ error: 'REVISION_CONFLICT', currentRevision: error.currentRevision });
      throw error;
    }
  });

  app.get('/api/projects/:projectId/branches/:branchId/requirements-intelligence', async (request, reply) => {
    const params = projectParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'INVALID_PROJECT_PARAMS' });
    const principal = principalFor(request);
    const project = await repository.getProject(principal.tenantId, params.data.projectId, params.data.branchId);
    if (!project || !canPerform(project, principal.subject, 'project.read')) return reply.code(404).send({ error: 'PROJECT_NOT_FOUND' });
    return { state: project.requirementsIntelligence ?? null, projectRevision: project.revision };
  });
}
