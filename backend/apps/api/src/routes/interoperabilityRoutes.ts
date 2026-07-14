import type { FastifyInstance, FastifyRequest } from 'fastify';
import { architectureExchangeFormats, architectureViewpointKinds, providerProductCatalog, type ArchitectureExchangeDocument, type ArchitectureProject, type ArchitectureViewpointKind, type ImportConflictResolution } from '@aiw/domain';
import { applyAdvancedViewLayout, assessArchitectureRoundTrip, exportArchitectureExchange, importArchitectureExchange, mergeImportedArchitecture, validateArchitectureExchange } from '@aiw/modelling';

export interface InteroperabilityRouteDeps {
  principalFor: (request: FastifyRequest) => unknown;
}

function isProject(value: unknown): value is ArchitectureProject {
  return Boolean(value && typeof value === 'object' && Array.isArray((value as ArchitectureProject).nodes) && Array.isArray((value as ArchitectureProject).edges));
}

function isDocument(value: unknown): value is ArchitectureExchangeDocument {
  const candidate = value as ArchitectureExchangeDocument;
  return Boolean(candidate && typeof candidate === 'object' && architectureExchangeFormats.includes(candidate.format) && typeof candidate.content === 'string');
}

export async function interoperabilityRoutes(app: FastifyInstance, deps: InteroperabilityRouteDeps): Promise<void> {
  const { principalFor } = deps;

  app.post('/api/interoperability/export', async (request, reply) => {
    principalFor(request);
    const body = (request.body ?? {}) as { project?: unknown; format?: unknown };
    if (!isProject(body.project)) return reply.code(400).send({ error: 'PROJECT_REQUIRED' });
    if (!architectureExchangeFormats.includes(body.format as never)) return reply.code(400).send({ error: 'SUPPORTED_FORMAT_REQUIRED', supportedFormats: architectureExchangeFormats });
    return exportArchitectureExchange(body.project, body.format as never);
  });

  app.post('/api/interoperability/validate', async (request, reply) => {
    principalFor(request);
    const body = (request.body ?? {}) as { document?: unknown };
    if (!isDocument(body.document)) return reply.code(400).send({ error: 'EXCHANGE_DOCUMENT_REQUIRED' });
    const issues = validateArchitectureExchange(body.document);
    return { valid: !issues.some((issue) => issue.severity === 'error'), issues };
  });

  app.post('/api/interoperability/import', async (request, reply) => {
    principalFor(request);
    const body = (request.body ?? {}) as { project?: unknown; document?: unknown };
    if (!isProject(body.project)) return reply.code(400).send({ error: 'PROJECT_REQUIRED' });
    if (!isDocument(body.document)) return reply.code(400).send({ error: 'EXCHANGE_DOCUMENT_REQUIRED' });
    return importArchitectureExchange(body.project, body.document);
  });

  app.post('/api/interoperability/merge', async (request, reply) => {
    principalFor(request);
    const body = (request.body ?? {}) as { project?: unknown; imported?: unknown; resolutions?: Record<string,ImportConflictResolution> };
    if (!isProject(body.project)) return reply.code(400).send({ error: 'PROJECT_REQUIRED' });
    if (!body.imported || typeof body.imported !== 'object' || !isProject((body.imported as { project?: unknown }).project)) return reply.code(400).send({ error: 'IMPORT_RESULT_REQUIRED' });
    return mergeImportedArchitecture(body.project, body.imported as never, body.resolutions ?? {});
  });

  app.post('/api/interoperability/round-trip', async (request, reply) => {
    principalFor(request);
    const body = (request.body ?? {}) as { project?: unknown; format?: unknown };
    if (!isProject(body.project)) return reply.code(400).send({ error: 'PROJECT_REQUIRED' });
    const project = body.project;
    if (body.format && !architectureExchangeFormats.includes(body.format as never)) return reply.code(400).send({ error: 'SUPPORTED_FORMAT_REQUIRED', supportedFormats: architectureExchangeFormats });
    const formats = body.format ? [body.format as (typeof architectureExchangeFormats)[number]] : [...architectureExchangeFormats];
    const reports = formats.map((format) => assessArchitectureRoundTrip(project, format));
    return { passed: reports.every((report) => report.passed), reports };
  });

  app.post('/api/layout/apply', async (request, reply) => {
    principalFor(request);
    const body = (request.body ?? {}) as { project?: unknown; viewId?: unknown; options?: unknown };
    if (!isProject(body.project)) return reply.code(400).send({ error: 'PROJECT_REQUIRED' });
    if (!architectureViewpointKinds.includes(body.viewId as ArchitectureViewpointKind)) return reply.code(400).send({ error: 'VIEWPOINT_REQUIRED', supportedViewpoints: architectureViewpointKinds });
    return applyAdvancedViewLayout(body.project, body.viewId as ArchitectureViewpointKind, (body.options ?? {}) as never);
  });

  app.get('/api/provider-products/catalog', async (request) => {
    principalFor(request);
    return { releaseId: 'PPC-0.10.60', providerNeutralFirst: true, entries: providerProductCatalog };
  });
}
