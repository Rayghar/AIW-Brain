import type { FastifyInstance, FastifyRequest } from 'fastify';
import { hasPermission } from '@aiw/engine';
import {
  captureSourceSnapshot,
  createAiwKpackEnvelope,
  createMindFactoryWorkerJobPlan,
  executeRepositorySourceRefresh,
  extractCandidateClaimsFromSnapshot,
  normalizeMindFactoryClaims,
  verifyAiwKpackEnvelope,
} from '@aiw/knowledge';
import type { QuarantinedCandidateClaim, SourceQuarantineSnapshot } from '@aiw/domain';
import { actorName } from '@aiw/admin';
import { adminRepositories } from '../repositories/adminRepositories.js';
import type { MindFactoryRouteDeps } from './mindFactoryRoutes.js';


function actorOf(principal: unknown): string { return actorName(principal); }

function guard(principal: unknown, permission: string): { ok: true } | { ok: false; body: unknown } {
  const rbac = hasPermission(principal, permission);
  if (!rbac.ok) return { ok: false, body: { error: 'PERMISSION_DENIED', permission, roles: rbac.roles } };
  return { ok: true };
}

// Mind Factory job-execution + knowledge-pack IO routes — split from
// mindFactoryRoutes honoring the 320-line route budget (the ratchet applies
// to every author).
export async function mindFactoryJobsRoutes(app: FastifyInstance, deps: MindFactoryRouteDeps): Promise<void> {
  const { principalFor } = deps;

  app.post('/api/admin/mind-factory/jobs/source-refresh', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'mind-factory.worker');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    const body = (request.body ?? {}) as { sourceId?: string };
    const job = createMindFactoryWorkerJobPlan({ operation: 'source-refresh', sourceId: body.sourceId ?? 'all-sources', queuedBy: actorOf(principal), tenantId: String((principal as { tenantId?: string }).tenantId ?? 'tenant-reference') });
    adminRepositories.mindFactoryWorkerJobs.push(job);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'mind-factory.worker-source-refresh-queued', subject: job.jobId, at: new Date().toISOString(), detail: `${job.sourceId}; queue=${job.workerQueue}` });
    return { job, note: 'Source refresh queued as a governed worker plan. Live fetch execution remains target-environment dependent.' };
  });
  app.post('/api/admin/mind-factory/jobs/claim-extraction', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'mind-factory.worker');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    const body = (request.body ?? {}) as { snapshotId?: string };
    const job = createMindFactoryWorkerJobPlan({ operation: 'claim-extraction', snapshotId: body.snapshotId ?? adminRepositories.sourceQuarantineSnapshots.at(-1)?.snapshotId ?? 'latest-snapshot', queuedBy: actorOf(principal), tenantId: String((principal as { tenantId?: string }).tenantId ?? 'tenant-reference') });
    adminRepositories.mindFactoryWorkerJobs.push(job);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'mind-factory.worker-claim-extraction-queued', subject: job.jobId, at: new Date().toISOString(), detail: `${job.snapshotId}; non-scoring candidates only` });
    return { job, authority: { candidateKnowledgeNonScoring: true, humanReviewRequired: true } };
  });
  app.post('/api/admin/mind-factory/aiw-kpack/export', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'knowledge-pack.kpack');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    const body = (request.body ?? {}) as { manifest?: unknown; tenantId?: string; projectId?: string };
    const manifest = (body.manifest ?? adminRepositories.knowledgePackExports.at(-1)) as never;
    if (!manifest) return reply.code(404).send({ error: 'MANIFEST_NOT_FOUND' });
    const envelope = createAiwKpackEnvelope({ manifest, createdBy: actorOf(principal), ...(body.tenantId ? { tenantId: body.tenantId } : {}), ...(body.projectId ? { projectId: body.projectId } : {}) });
    adminRepositories.aiwKpackExports.push(envelope);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'knowledge-pack.aiw-kpack-exported', subject: envelope.fileName, at: new Date().toISOString(), detail: `${envelope.manifest.releaseId}; checksum=${envelope.payload.checksum}` });
    reply.header('content-type', envelope.mimeType);
    reply.header('content-disposition', `attachment; filename="${envelope.fileName}"`);
    return envelope;
  });
  app.post('/api/admin/mind-factory/aiw-kpack/import', async (request, reply) => {
    const principal = principalFor(request) as { tenantId?: string };
    const allowed = guard(principal, 'knowledge-pack.kpack');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    const body = (request.body ?? {}) as { envelope?: unknown; tenantId?: string; projectId?: string };
    const result = verifyAiwKpackEnvelope({ envelope: body.envelope ?? adminRepositories.aiwKpackExports.at(-1), tenantId: body.tenantId ?? String(principal.tenantId ?? 'tenant-reference'), ...(body.projectId ? { projectId: body.projectId } : {}), activatedBy: actorOf(principal) });
    adminRepositories.aiwKpackImports.push(result);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'knowledge-pack.aiw-kpack-import-checked', subject: result.packId ?? 'unknown-pack', at: new Date().toISOString(), detail: result.status });
    if (result.status === 'rejected') return reply.code(400).send({ result });
    return { result, note: '.aiw-kpack verified. Activation still requires explicit tenant/project pinning.' };
  });
  app.post('/api/admin/mind-factory/jobs/execute-next', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'mind-factory.execute');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    const job = adminRepositories.mindFactoryWorkerJobs.find((item: { status?: string }) => item.status === 'queued');
    if (!job) return reply.code(404).send({ error: 'NO_QUEUED_JOB' });
    job.status = 'completed';
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'mind-factory.worker-executed-next', subject: job.jobId, at: new Date().toISOString(), detail: `${job.operation}; deterministic dry-run execution; no unsafe side effects` });
    return { job, execution: { status: 'completed', unsafeSideEffects: false, candidateKnowledgeNonScoring: true } };
  });
  app.post('/api/admin/mind-factory/repository-sources/:connectorId/execute-refresh', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'repository-source.execute');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    const connectorId = (request.params as { connectorId: string }).connectorId;
    const connector = adminRepositories.repositoryConnectors.get(connectorId);
    if (!connector) return reply.code(404).send({ error: 'CONNECTOR_NOT_FOUND' });
    if (connector.writeEnabled) return reply.code(400).send({ error: 'CONNECTOR_WRITE_ENABLED', message: 'Mind Factory repository execution requires a read-only connector.' });
    const body = (request.body ?? {}) as { commitSha?: string; licence?: string };
    const execution = executeRepositorySourceRefresh({
      connectorId,
      provider: connector.provider,
      repositoryUrl: connector.repositoryUrl,
      branch: connector.defaultBranch ?? 'main',
      allowedPaths: connector.allowedPaths ?? [],
      readOnly: true,
      executedBy: actorOf(principal),
      ...(body.commitSha ? { commitSha: body.commitSha } : {}),
      ...(body.licence ? { licence: body.licence } : {}),
    });
    adminRepositories.repositorySourceExecutions.push(execution);
    if (execution.snapshot) adminRepositories.sourceQuarantineSnapshots.push(execution.snapshot);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'mind-factory.repository-source-executed', subject: execution.executionId, at: new Date().toISOString(), detail: `${connectorId}; status=${execution.status}; paths=${execution.detectedPaths.length}` });
    return { execution, note: 'Repository source execution is read-only and produces a quarantined snapshot only; it does not promote knowledge or mutate architecture.' };
  });
  app.post('/api/admin/mind-factory/sources/:sourceId/snapshot', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'mind-factory.snapshot');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    const sourceId = (request.params as { sourceId: string }).sourceId;
    const body = (request.body ?? {}) as { sourceTitle?: string; sourceType?: string; content?: string; commitSha?: string; license?: string; provenanceUrl?: string; allowedClaimTypes?: string[]; blockedClaimTypes?: string[] };
    const source = adminRepositories.knowledgeSources.get(sourceId);
    const snapshot = captureSourceSnapshot({
      sourceId,
      sourceTitle: body.sourceTitle ?? source?.title ?? sourceId,
      sourceType: body.sourceType ?? source?.sourceType ?? 'manual-import',
      capturedBy: actorOf(principal),
      ...(body.content ? { content: body.content } : {}),
      ...(body.commitSha ? { commitSha: body.commitSha } : {}),
      license: body.license ?? source?.licence ?? 'unknown',
      ...(body.provenanceUrl ? { provenanceUrl: body.provenanceUrl } : {}),
      ...(body.allowedClaimTypes?.length ? { allowedClaimTypes: body.allowedClaimTypes as never } : {}),
      ...(body.blockedClaimTypes?.length ? { blockedClaimTypes: body.blockedClaimTypes as never } : {}),
    });
    adminRepositories.sourceQuarantineSnapshots.push(snapshot);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'mind-factory.snapshot-captured', subject: snapshot.snapshotId, at: new Date().toISOString(), detail: `${snapshot.sourceId} -> ${snapshot.status}` });
    return { snapshot, note: 'Snapshot is quarantined. Extracted claims remain non-scoring until named-human review and release promotion.' };
  });
  app.post('/api/admin/mind-factory/snapshots/:snapshotId/extract-claims', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'mind-factory.extract');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    const snapshot = adminRepositories.sourceQuarantineSnapshots.find((item: SourceQuarantineSnapshot) => item.snapshotId === (request.params as { snapshotId: string }).snapshotId) as SourceQuarantineSnapshot | undefined;
    if (!snapshot) return reply.code(404).send({ error: 'SNAPSHOT_NOT_FOUND' });
    const body = (request.body ?? {}) as { content?: string };
    const claims = extractCandidateClaimsFromSnapshot(snapshot, body.content);
    adminRepositories.quarantinedClaims.push(...claims);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'mind-factory.claims-extracted', subject: snapshot.snapshotId, at: new Date().toISOString(), detail: `${claims.length} candidate claim(s); non-scoring` });
    return { claims, authority: { nonScoring: true, reviewerRequired: true, llmCannotApprove: true } };
  });
  app.post('/api/admin/mind-factory/claims/normalize', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'mind-factory.normalize');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    const body = (request.body ?? {}) as { claimIds?: string[] };
    const candidates = body.claimIds?.length ? adminRepositories.quarantinedClaims.filter((claim: QuarantinedCandidateClaim) => body.claimIds?.includes(claim.claimId)) : adminRepositories.quarantinedClaims;
    const result = normalizeMindFactoryClaims(candidates);
    adminRepositories.normalizedClaimRuns.push({ runId: `norm-${Date.now().toString(36)}`, generatedAt: new Date().toISOString(), result });
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'mind-factory.claims-normalized', subject: 'candidate-claims', at: new Date().toISOString(), detail: `${result.normalizedClaims.length} normalized; ${result.duplicateGroups.length} duplicates; ${result.contradictionGroups.length} contradictions` });
    return { result, note: 'Normalization detects duplicates, synonyms and contradictions but does not promote knowledge.' };
  });

}
