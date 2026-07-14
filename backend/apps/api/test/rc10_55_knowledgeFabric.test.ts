import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildApp({ repository: new InMemoryProjectRepository(), logger: false });
});

afterEach(async () => {
  await app.close();
});

describe('rc.10.55 Architecture Knowledge Fabric', () => {
  it('publishes the governed knowledge-fabric summary', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/knowledge-fabric/summary' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.releaseId).toBe('AKR-0.10.55');
    expect(body.patternDna2.totalRecords).toBe(328);
    expect(body.patternDna2.deepEditorialRecords).toBe(50);
    expect(body.assessment.allowed).toBe(true);
  });

  it('searches Pattern DNA 2.0 while preserving generation and evidence contracts', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/knowledge-fabric/patterns?q=outbox&limit=10' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.releaseId).toBe('AKR-0.10.55');
    expect(body.records.length).toBeGreaterThan(0);
    const outbox = body.records.find((record: { id: string }) => record.id === 'PAT-TRANSACTIONAL-OUTBOX');
    expect(outbox).toBeTruthy();
    expect(outbox.dnaVersion).toBe('2.0');
    expect(outbox.componentKit.length).toBeGreaterThan(0);
    expect(outbox.interfaceKit.length).toBeGreaterThan(0);
    expect(outbox.evidence.length).toBeGreaterThan(0);
    expect(Object.values(outbox.generationContract).some(Boolean)).toBe(true);
  });

  it('publishes repository dossiers, Cambridge grammar and eight lifecycle stage kits', async () => {
    const [sources, cambridge, kits] = await Promise.all([
      app.inject({ method: 'GET', url: '/api/knowledge-fabric/source-map' }),
      app.inject({ method: 'GET', url: '/api/knowledge-fabric/cambridge-pack' }),
      app.inject({ method: 'GET', url: '/api/knowledge-fabric/stage-kits' }),
    ]);
    expect(sources.statusCode).toBe(200);
    expect(cambridge.statusCode).toBe(200);
    expect(kits.statusCode).toBe(200);
    expect(sources.json().dossiers).toHaveLength(47);
    expect(cambridge.json().reviewRules.length).toBeGreaterThanOrEqual(6);
    expect(cambridge.json().sddGrammar.length).toBeGreaterThanOrEqual(15);
    expect(kits.json().stages).toHaveLength(8);
  });
});
