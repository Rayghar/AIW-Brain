import type { FastifyInstance, FastifyRequest } from 'fastify';
import { hasPermission } from '@aiw/engine';
import {
  activateSignedKnowledgePack,
  buildMindFactoryAuditTimeline,
  buildReleaseImpactPreview,
  buildStageKnowledgeTraceability,
  captureSourceSnapshot,
  createMindFactoryPersistencePlan,
  createMindFactoryWorkerJobPlan,
  createSignedKnowledgePackManifest,
  executeRepositorySourceRefresh,
  extractCandidateClaimsFromSnapshot,
  normalizeMindFactoryClaims,
  persistKnowledgePackActivation,
  signKnowledgePackWithKms,
  verifyKnowledgePackActivation,
  createAiwKpackEnvelope,
  verifyAiwKpackEnvelope,
  buildReleaseActivationScreen
} from '@aiw/knowledge';
import type { QuarantinedCandidateClaim, SourceQuarantineSnapshot } from '@aiw/domain';
import { actorName } from '@aiw/admin';
import { adminRepositories } from '../repositories/adminRepositories.js';
import { createKmsProviderBindingGuide, createProviderBoundDeploymentSmokePlan, createReadOnlyProviderFetchPlan } from '@aiw/integrations';

export interface MindFactoryRouteDeps { principalFor: (request: FastifyRequest) => unknown; }

function ensureArrays(): void {
  adminRepositories.sourceQuarantineSnapshots ??= [] as SourceQuarantineSnapshot[];
  adminRepositories.quarantinedClaims ??= [] as QuarantinedCandidateClaim[];
  adminRepositories.normalizedClaimRuns ??= [] as unknown[];
  adminRepositories.releaseImpactPreviews ??= [] as unknown[];
  adminRepositories.knowledgePackExports ??= [] as unknown[];
  adminRepositories.knowledgePackImports ??= [] as unknown[];
  adminRepositories.mindFactoryWorkerJobs ??= [] as unknown[];
  adminRepositories.knowledgePackActivations ??= [] as unknown[];
  adminRepositories.mindFactoryPersistenceRecords ??= [] as unknown[];
  adminRepositories.repositorySourceExecutions ??= [] as unknown[];
  adminRepositories.kmsSignatures ??= [] as unknown[];
  adminRepositories.providerBindingPlans ??= [] as unknown[];
  adminRepositories.kmsBindingGuides ??= [] as unknown[];
  adminRepositories.aiwKpackExports ??= [] as unknown[];
  adminRepositories.aiwKpackImports ??= [] as unknown[];
  adminRepositories.stageKnowledgeTraceability ??= buildStageKnowledgeTraceability();
}

function actorOf(principal: unknown): string { return actorName(principal); }

function guard(principal: unknown, permission: string): { ok: true } | { ok: false; body: unknown } {
  const rbac = hasPermission(principal, permission);
  if (!rbac.ok) return { ok: false, body: { error: 'PERMISSION_DENIED', permission, roles: rbac.roles } };
  return { ok: true };
}

export async function mindFactoryRoutes(app: FastifyInstance, deps: MindFactoryRouteDeps): Promise<void> {
  const { principalFor } = deps;
  ensureArrays();

  app.get('/api/admin/mind-factory', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'knowledge.read');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    return {
      pipeline: ['register-source', 'capture-pinned-snapshot', 'quarantine', 'extract-candidate-claims', 'normalize-duplicates-synonyms', 'detect-contradictions', 'calculate-corroboration', 'release-impact-preview', 'signed-knowledge-pack-export', 'tenant-project-pinning'],
      counts: {
        snapshots: adminRepositories.sourceQuarantineSnapshots.length,
        candidateClaims: adminRepositories.quarantinedClaims.length,
        normalizationRuns: adminRepositories.normalizedClaimRuns.length,
        impactPreviews: adminRepositories.releaseImpactPreviews.length,
        packExports: adminRepositories.knowledgePackExports.length,
        packImports: adminRepositories.knowledgePackImports.length,
        workerJobs: adminRepositories.mindFactoryWorkerJobs.length,
        activations: adminRepositories.knowledgePackActivations.length,
        persistedActivations: adminRepositories.mindFactoryPersistenceRecords.length,
        repositoryExecutions: adminRepositories.repositorySourceExecutions.length,
        kmsSignatures: adminRepositories.kmsSignatures.length,
        providerBindings: adminRepositories.providerBindingPlans.length,
        kmsGuides: adminRepositories.kmsBindingGuides.length,
        aiwKpackExports: adminRepositories.aiwKpackExports.length,
        aiwKpackImports: adminRepositories.aiwKpackImports.length,
      },
      snapshots: adminRepositories.sourceQuarantineSnapshots.slice(-10),
      candidateClaims: adminRepositories.quarantinedClaims.slice(-20),
      workerJobs: adminRepositories.mindFactoryWorkerJobs.slice(-10),
      packExports: adminRepositories.knowledgePackExports.slice(-10),
      activations: adminRepositories.knowledgePackActivations.slice(-10),
      persistedActivations: adminRepositories.mindFactoryPersistenceRecords.slice(-10),
      repositoryExecutions: adminRepositories.repositorySourceExecutions.slice(-10),
      kmsSignatures: adminRepositories.kmsSignatures.slice(-10),
      providerBindings: adminRepositories.providerBindingPlans.slice(-10),
      kmsGuides: adminRepositories.kmsBindingGuides.slice(-10),
      aiwKpackExports: adminRepositories.aiwKpackExports.slice(-10),
      aiwKpackImports: adminRepositories.aiwKpackImports.slice(-10),
      timeline: buildMindFactoryAuditTimeline(adminRepositories.audit).slice(-25),
      authority: {
        candidateClaimsAreNonScoring: true,
        llmExtractionCannotApprove: true,
        releaseImpactPreviewRequired: true,
        unsignedPacksCannotActivate: true,
        actor: actorOf(principal),
      },
    };
  });




  app.get('/api/admin/mind-factory/activation', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'knowledge.read');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    return { activations: adminRepositories.knowledgePackActivations, imports: adminRepositories.knowledgePackImports.slice(-10), exports: adminRepositories.knowledgePackExports.slice(-10), rule: 'Signed packs activate only after verification and tenant/project pinning.' };
  });

  app.get('/api/admin/mind-factory/audit-timeline', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'knowledge.read');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    return { timeline: buildMindFactoryAuditTimeline(adminRepositories.audit) };
  });



  app.get('/api/admin/mind-factory/provider-bindings', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'knowledge.read');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    return {
      repositoryPlans: adminRepositories.providerBindingPlans.slice(-20),
      kmsGuides: adminRepositories.kmsBindingGuides.slice(-20),
      deploymentSmokePlan: createProviderBoundDeploymentSmokePlan(),
      doctrine: { readOnlyRepositoryFetch: true, kmsKeyMaterialNeverStored: true, outputGoesToQuarantine: true },
    };
  });

  app.post('/api/admin/mind-factory/provider-bindings/repository/fetch-plan', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'repository-source.bind');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    const body = (request.body ?? {}) as { connectorId?: string; provider?: string; repositoryUrl?: string; branch?: string; allowedPaths?: string[]; tokenRef?: string; allowLiveNetwork?: boolean };
    const connector = body.connectorId ? adminRepositories.repositoryConnectors.get(body.connectorId) : undefined;
    const plan = createReadOnlyProviderFetchPlan({
      connectorId: body.connectorId ?? connector?.id ?? 'provider-reference',
      provider: body.provider ?? connector?.provider ?? 'github',
      repositoryUrl: body.repositoryUrl ?? connector?.repositoryUrl ?? 'https://github.com/example/aiw-reference',
      branch: body.branch ?? connector?.defaultBranch ?? 'main',
      allowedPaths: body.allowedPaths ?? connector?.allowedPaths ?? ['docs/architecture', 'adr', 'openapi'],
      ...(body.tokenRef ? { tokenRef: body.tokenRef } : {}),
      allowLiveNetwork: body.allowLiveNetwork === true,
      requestedBy: actorOf(principal),
    });
    adminRepositories.providerBindingPlans.push(plan);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'mind-factory.provider-fetch-plan-created', subject: plan.planId, at: new Date().toISOString(), detail: `${plan.provider}; mode=${plan.mode}; readiness=${plan.readiness}` });
    return { plan, note: 'Provider fetch plan is read-only and emits quarantined snapshots only.' };
  });

  app.post('/api/admin/mind-factory/provider-bindings/kms/guide', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'knowledge-pack.kms-guide');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    const body = (request.body ?? {}) as { provider?: string; keyRef?: string; sovereign?: boolean };
    const guide = createKmsProviderBindingGuide({ provider: body.provider ?? 'reference-local', ...(body.keyRef ? { keyRef: body.keyRef } : {}), sovereign: body.sovereign === true });
    adminRepositories.kmsBindingGuides.push(guide);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'mind-factory.kms-binding-guide-created', subject: guide.guideId, at: new Date().toISOString(), detail: `${guide.provider}; keyRef=${guide.keyRef}; zeroEgress=${guide.zeroEgressPosture}` });
    return { guide, note: 'KMS provider binding guide stores no key material and signs only the manifest hash.' };
  });

  app.get('/api/admin/mind-factory/release-activation-screen', async (request, reply) => {
    const principal = principalFor(request) as { tenantId?: string };
    const allowed = guard(principal, 'knowledge.read');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    return { screen: buildReleaseActivationScreen({ tenantId: String(principal.tenantId ?? 'tenant-reference'), exports: adminRepositories.knowledgePackExports, persistedActivations: adminRepositories.mindFactoryPersistenceRecords }) };
  });



  app.get('/api/admin/mind-factory/persistence', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'knowledge.read');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    return {
      plan: createMindFactoryPersistencePlan({ backend: 'postgres', generatedBy: 'admin-api' }),
      records: adminRepositories.mindFactoryPersistenceRecords.slice(-20),
      migration: 'database/migrations/016_sprint8_9_7_mind_factory_production.sql',
      doctrine: { tenantScoped: true, rlsRequired: true, candidateClaimsNonScoring: true, auditTimelineAppendOnly: true },
    };
  });

  app.post('/api/admin/mind-factory/persistence/pin-activation', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'mind-factory.persistence');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    const body = (request.body ?? {}) as { activationIndex?: number; backend?: 'reference-memory' | 'postgres' };
    const activation = adminRepositories.knowledgePackActivations.at(body.activationIndex ?? -1);
    if (!activation?.packId || !activation?.releaseId) return reply.code(404).send({ error: 'ACTIVATION_NOT_FOUND' });
    const record = persistKnowledgePackActivation({ activation, persistedBy: actorOf(principal), backend: body.backend ?? 'postgres' });
    adminRepositories.mindFactoryPersistenceRecords.push(record);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'mind-factory.activation-persisted', subject: record.recordId, at: new Date().toISOString(), detail: `${record.releaseId}; tenant=${record.tenantId}; backend=${record.backend}` });
    return { record, note: 'Activation persistence record is tenant/project scoped and RLS-ready.' };
  });

  app.post('/api/admin/mind-factory/kms/sign', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'knowledge-pack.sign');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    const body = (request.body ?? {}) as { manifest?: unknown; provider?: 'reference-local' | 'aws-kms' | 'azure-keyvault' | 'gcp-kms' | 'hashicorp-vault' | 'sovereign-hsm'; keyRef?: string; tenantId?: string; projectId?: string };
    const manifest = (body.manifest ?? adminRepositories.knowledgePackExports.at(-1)) as never;
    if (!manifest) return reply.code(404).send({ error: 'MANIFEST_NOT_FOUND' });
    const result = signKnowledgePackWithKms({ manifest, provider: body.provider ?? 'reference-local', keyRef: body.keyRef ?? 'aiw/reference/mind-factory', requestedBy: actorOf(principal), ...(body.tenantId ? { tenantId: body.tenantId } : {}), ...(body.projectId ? { projectId: body.projectId } : {}) });
    adminRepositories.knowledgePackExports.push(result.manifest);
    adminRepositories.kmsSignatures.push(result.signature);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'knowledge-pack.kms-signed', subject: result.signature.signatureId, at: new Date().toISOString(), detail: `${result.signature.provider}; keyRef=${result.signature.keyRef}; pack=${result.manifest.packId}` });
    return { manifest: result.manifest, signature: result.signature, note: 'Reference KMS adapter attests the signed manifest; production deployments bind provider/keyRef to real KMS.' };
  });






  app.post('/api/admin/mind-factory/release-impact-preview', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'mind-factory.release-impact');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    const body = (request.body ?? {}) as { baseReleaseId?: string; candidateReleaseId?: string; claimIds?: string[]; changedPatterns?: string[] };
    const claims = body.claimIds?.length ? adminRepositories.quarantinedClaims.filter((claim: QuarantinedCandidateClaim) => body.claimIds?.includes(claim.claimId)) : adminRepositories.quarantinedClaims;
    const preview = buildReleaseImpactPreview({ baseReleaseId: body.baseReleaseId ?? 'akr-current', candidateReleaseId: body.candidateReleaseId ?? 'akr-candidate', changedClaims: claims, ...(body.changedPatterns?.length ? { changedPatterns: body.changedPatterns } : {}) });
    adminRepositories.releaseImpactPreviews.push(preview);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'mind-factory.release-impact-previewed', subject: preview.previewId, at: new Date().toISOString(), detail: `${preview.changedClaimCount} claims; gate=${preview.promotionGate}` });
    return { preview, authority: 'candidate knowledge remains preview-only until promoted release is pinned' };
  });

  app.get('/api/admin/mind-factory/stage-traceability', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'knowledge.read');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    adminRepositories.stageKnowledgeTraceability = buildStageKnowledgeTraceability();
    return { traceability: adminRepositories.stageKnowledgeTraceability };
  });

  app.post('/api/admin/mind-factory/knowledge-pack/export', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'knowledge-pack.export');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    const body = (request.body ?? {}) as { releaseId?: string; files?: Record<string, string> };
    const manifest = createSignedKnowledgePackManifest({ releaseId: body.releaseId ?? 'akr-current', generatedBy: actorOf(principal), ...(body.files ? { files: body.files } : {}) });
    adminRepositories.knowledgePackExports.push(manifest);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'knowledge-pack.exported', subject: manifest.packId, at: new Date().toISOString(), detail: `${manifest.releaseId}; files=${manifest.files.length}` });
    return { manifest };
  });


  app.post('/api/admin/mind-factory/knowledge-pack/activate', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'knowledge-pack.activate');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    const body = (request.body ?? {}) as { manifest?: unknown; tenantId?: string; projectId?: string; activationMode?: 'offline-essential' | 'enterprise-tenant' | 'sovereign-airgapped' };
    const result = activateSignedKnowledgePack({ manifest: (body.manifest ?? {}) as never, tenantId: body.tenantId ?? String((principal as { tenantId?: string }).tenantId ?? 'tenant-reference'), activatedBy: actorOf(principal), ...(body.projectId ? { projectId: body.projectId } : {}), ...(body.activationMode ? { activationMode: body.activationMode } : {}) });
    if ('status' in result && result.status === 'rejected') return reply.code(400).send({ result });
    adminRepositories.knowledgePackActivations.push(result);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'knowledge-pack.activated', subject: ('packId' in result ? result.packId : 'unknown-pack'), at: new Date().toISOString(), detail: 'releaseId' in result ? `${result.releaseId}; pinned=${'pinned' in result ? result.pinned : false}` : 'rejected' });
    return { result, note: 'Knowledge pack activation verified and recorded for tenant/project pinning.' };
  });

  app.post('/api/admin/mind-factory/knowledge-pack/import', async (request, reply) => {
    const principal = principalFor(request);
    const allowed = guard(principal, 'knowledge-pack.import');
    if (!allowed.ok) return reply.code(403).send(allowed.body);
    const body = (request.body ?? {}) as { manifest?: unknown };
    const result = verifyKnowledgePackActivation((body.manifest ?? {}) as never);
    adminRepositories.knowledgePackImports.push(result);
    adminRepositories.audit.push({ actor: actorOf(principal), action: 'knowledge-pack.import-checked', subject: result.releaseId ?? 'unknown-release', at: new Date().toISOString(), detail: result.status });
    return { result };
  });
}
