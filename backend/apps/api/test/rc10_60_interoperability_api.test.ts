import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

let app: FastifyInstance;
beforeEach(async () => { app = await buildApp({ repository: new InMemoryProjectRepository(), logger: false }); });
afterEach(async () => { await app.close(); });

describe('rc.10.60 interoperability, layout and accessible delivery APIs', () => {
  it('exports, validates, imports and round-trips all architecture exchange formats', async () => {
    for (const format of ['structurizr-dsl','calm-json','likec4'] as const) {
      const exported = await app.inject({ method:'POST', url:'/api/interoperability/export', payload:{ project:sampleProject, format } });
      expect(exported.statusCode).toBe(200);
      const document = exported.json();
      const validated = await app.inject({ method:'POST', url:'/api/interoperability/validate', payload:{ document } });
      expect(validated.statusCode).toBe(200);
      expect(validated.json().valid).toBe(true);
      const imported = await app.inject({ method:'POST', url:'/api/interoperability/import', payload:{ project:sampleProject, document } });
      expect(imported.statusCode).toBe(200);
      expect(imported.json().project.nodes.length).toBe(sampleProject.nodes.length);
    }
    const roundTrip = await app.inject({ method:'POST', url:'/api/interoperability/round-trip', payload:{ project:sampleProject } });
    expect(roundTrip.statusCode).toBe(200);
    expect(roundTrip.json().passed).toBe(true);
    expect(roundTrip.json().reports).toHaveLength(3);
  });

  it('applies advanced layout and exposes governed provider-product mappings', async () => {
    const layout = await app.inject({ method:'POST', url:'/api/layout/apply', payload:{ project:sampleProject, viewId:'logical-application' } });
    expect(layout.statusCode).toBe(200);
    expect(layout.json().laidOutNodeIds.length).toBeGreaterThan(0);
    expect(layout.json().routedEdgeIds.length).toBeGreaterThan(0);
    const catalogue = await app.inject({ method:'GET', url:'/api/provider-products/catalog' });
    expect(catalogue.statusCode).toBe(200);
    expect(catalogue.json().providerNeutralFirst).toBe(true);
    expect(catalogue.json().entries.length).toBeGreaterThanOrEqual(40);
  });

  it('generates a tagged accessible PDF and complete interoperable delivery pack', async () => {
    const library = { knowledgeReleaseId:'AKR-0.10.60', libraryId:'api-test', version:'0.10.60', status:'approved', generatedAt:'2026-07-11T00:00:00.000Z', disclaimer:'Test', qualityAttributes:[], architectureStyles:[], patterns:[], viewpoints:[], evidence:[], rulePacks:[] };
    const pdf = await app.inject({ method:'POST', url:'/api/sdd/accessible-pdf', payload:{ project:sampleProject } });
    expect(pdf.statusCode).toBe(200);
    expect(pdf.json().pageCount).toBeGreaterThan(10);
    expect(pdf.json().profile.tagged).toBe(true);
    const pack = await app.inject({ method:'POST', url:'/api/sdd/delivery-pack', payload:{ project:sampleProject, archive:true } });
    expect(pack.statusCode).toBe(200);
    expect(pack.json().fileCount).toBeGreaterThan(35);
    expect(pack.json().content.length).toBeGreaterThan(1000);
  });
});
