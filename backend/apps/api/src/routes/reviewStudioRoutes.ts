import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { architectureProjectSchema, type ArchitectureProject, type AuthenticatedPrincipal, type KnowledgeLibrary } from '@aiw/domain';
import { reviewToArchitectureDecisions } from '@aiw/intelligence';
import type { ArchitectureBrainOrchestrator } from '../architectureBrainOrchestrator.js';
import { canPerform, hasPermission } from '@aiw/engine';
import { compileSolutionDeliveryPack, createArtifactArchive } from '@aiw/artifacts';

export interface ReviewStudioDeps {
  principalFor: (request: FastifyRequest) => AuthenticatedPrincipal;
  tenantProject: (project: ArchitectureProject, principal: AuthenticatedPrincipal) => boolean;
  loadKnowledgeLibrary: () => Promise<KnowledgeLibrary>;
  architectureBrain: ArchitectureBrainOrchestrator;
}

export async function reviewStudioRoutes(app: FastifyInstance, deps: ReviewStudioDeps): Promise<void> {
  const { principalFor, tenantProject, loadKnowledgeLibrary, architectureBrain } = deps;

  app.post('/api/review-studio/run', async (request, reply) => {
    const parsed = z.object({ project: architectureProjectSchema }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_REVIEW_REQUEST', details: parsed.error.flatten() });
    const principal = principalFor(request);
    if (!tenantProject(parsed.data.project, principal)) return reply.code(403).send({ error: 'TENANT_BOUNDARY_VIOLATION' });
    const roleGuard = hasPermission(principal, 'review.run');
    if (!roleGuard.ok) return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'review.run', roles: roleGuard.roles });
    if (!canPerform(parsed.data.project, principal.subject, 'project.read')) return reply.code(403).send({ error: 'PROJECT_PERMISSION_DENIED', permission: 'project.read' });
    const review = await architectureBrain.review(parsed.data.project);
    return { review };
  });

  app.post('/api/review-studio/handoff-pack', async (request, reply) => {
    const parsed = z.object({ project: architectureProjectSchema }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_HANDOFF_PACK_REQUEST', details: parsed.error.flatten() });
    const principal = principalFor(request);
    if (!tenantProject(parsed.data.project, principal)) return reply.code(403).send({ error: 'TENANT_BOUNDARY_VIOLATION' });
    const roleGuard = hasPermission(principal, 'artifact.generate');
    if (!roleGuard.ok) return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'artifact.generate', roles: roleGuard.roles });
    if (!canPerform(parsed.data.project, principal.subject, 'artifact.generate')) return reply.code(403).send({ error: 'PROJECT_PERMISSION_DENIED', permission: 'artifact.generate' });
    const library = await loadKnowledgeLibrary();
    const review = await architectureBrain.review(parsed.data.project);
    const bundle = compileSolutionDeliveryPack(parsed.data.project, library, review);
    return { reviewId: review.id, bundle };
  });


  app.post('/api/review-studio/handoff-pack.zip', async (request, reply) => {
    const parsed = z.object({ project: architectureProjectSchema }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_HANDOFF_PACK_ZIP_REQUEST', details: parsed.error.flatten() });
    const principal = principalFor(request);
    if (!tenantProject(parsed.data.project, principal)) return reply.code(403).send({ error: 'TENANT_BOUNDARY_VIOLATION' });
    const roleGuard = hasPermission(principal, 'artifact.generate');
    if (!roleGuard.ok) return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'artifact.generate', roles: roleGuard.roles });
    if (!canPerform(parsed.data.project, principal.subject, 'artifact.generate')) return reply.code(403).send({ error: 'PROJECT_PERMISSION_DENIED', permission: 'artifact.generate' });
    const library = await loadKnowledgeLibrary();
    const review = await architectureBrain.review(parsed.data.project);
    const bundle = compileSolutionDeliveryPack(parsed.data.project, library, review);
    const archive = createArtifactArchive(bundle, { fileName: `aiw-solution-delivery-pack-${parsed.data.project.id}.zip` });
    reply
      .header('content-type', archive.mediaType)
      .header('content-disposition', `attachment; filename="${archive.fileName}"`)
      .header('x-aiw-review-id', review.id)
      .header('x-aiw-artifact-count', String(archive.fileCount))
      .header('x-aiw-uncompressed-bytes', String(archive.totalUncompressedBytes));
    return reply.send(Buffer.from(archive.bytes));
  });

  app.post('/api/review-studio/generated-adrs', async (request, reply) => {
    const parsed = z.object({ project: architectureProjectSchema }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_REVIEW_ADR_REQUEST', details: parsed.error.flatten() });
    const principal = principalFor(request);
    if (!tenantProject(parsed.data.project, principal)) return reply.code(403).send({ error: 'TENANT_BOUNDARY_VIOLATION' });
    const roleGuard = hasPermission(principal, 'artifact.generate');
    if (!roleGuard.ok) return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'artifact.generate', roles: roleGuard.roles });
    if (!canPerform(parsed.data.project, principal.subject, 'artifact.generate')) return reply.code(403).send({ error: 'PROJECT_PERMISSION_DENIED', permission: 'artifact.generate' });
    const review = await architectureBrain.review(parsed.data.project);
    return { reviewId: review.id, decisions: reviewToArchitectureDecisions(review) };
  });
}
