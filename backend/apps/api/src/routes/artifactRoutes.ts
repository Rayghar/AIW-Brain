import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ArchitectureProject, KnowledgeLibrary } from '@aiw/domain';
import { composeSdd } from '@aiw/engine';
import { compileSolutionDeliveryPack, createArtifactArchive, renderAccessibleSddPdf } from '@aiw/artifacts';

export interface ArtifactRouteDeps {
  principalFor: (request: FastifyRequest) => unknown;
  loadKnowledgeLibrary: () => Promise<KnowledgeLibrary>;
}

function isProject(value: unknown): value is ArchitectureProject {
  return Boolean(value && typeof value === 'object' && Array.isArray((value as ArchitectureProject).nodes) && Array.isArray((value as ArchitectureProject).edges));
}

export async function artifactRoutes(app: FastifyInstance, deps: ArtifactRouteDeps): Promise<void> {
  const { principalFor, loadKnowledgeLibrary } = deps;
  app.post('/api/sdd/compose', async (request, reply) => {
    principalFor(request);
    const body = (request.body ?? {}) as { project?: unknown };
    if (!isProject(body.project)) return reply.code(400).send({ error: 'PROJECT_REQUIRED' });
    const markdown = composeSdd(body.project, await loadKnowledgeLibrary());
    return { format: 'markdown', markdown };
  });

  app.post('/api/sdd/accessible-pdf', async (request, reply) => {
    principalFor(request);
    const body = (request.body ?? {}) as { project?: unknown; language?: string };
    if (!isProject(body.project)) return reply.code(400).send({ error: 'PROJECT_REQUIRED' });
    const result = renderAccessibleSddPdf(body.project, await loadKnowledgeLibrary(), body.language ?? 'en-GB');
    return { format: 'pdf', encoding: 'base64', content: result.base64, pageCount: result.pageCount, bookmarkCount: result.bookmarkCount, profile: result.profile };
  });

  app.post('/api/sdd/delivery-pack', async (request, reply) => {
    principalFor(request);
    const body = (request.body ?? {}) as { project?: unknown; archive?: boolean };
    if (!isProject(body.project)) return reply.code(400).send({ error: 'PROJECT_REQUIRED' });
    const bundle = compileSolutionDeliveryPack(body.project, await loadKnowledgeLibrary());
    if (!body.archive) return bundle;
    const archive = createArtifactArchive(bundle);
    let binary = '';
    for (const byte of archive.bytes) binary += String.fromCharCode(byte);
    const encoded = typeof btoa === 'function' ? btoa(binary) : Buffer.from(archive.bytes).toString('base64');
    return { fileName: archive.fileName, mediaType: archive.mediaType, encoding: 'base64', content: encoded, fileCount: archive.fileCount, totalUncompressedBytes: archive.totalUncompressedBytes };
  });
}
