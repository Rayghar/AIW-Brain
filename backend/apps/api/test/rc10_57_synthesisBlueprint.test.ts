import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildApp({ repository: new InMemoryProjectRepository(), logger: false });
});

afterEach(async () => {
  await app.close();
});

describe('rc.10.57 Architecture Synthesis Blueprint API', () => {
  it('generates alternatives with eligibility, contracts, overlays, deployment and ten views', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/synthesis/runs',
      payload: {
        projectId: sampleProject.id,
        branchId: sampleProject.branch.id,
        expectedRevision: sampleProject.revision,
        knowledgeReleaseId: 'AKR-0.10.55',
        strategyIds: ['balanced','simplicity-first','resilience-first','security-first','cost-first'],
        maxAlternatives: 5,
        requireDiversity: true,
        useLlmEnrichment: false,
      },
    });
    expect(response.statusCode).toBe(201);
    const run = response.json();
    expect(run.knowledgeReleaseId).toBe('AKR-0.10.55');
    expect(run.alternatives.length).toBeGreaterThanOrEqual(2);
    for (const alternative of run.alternatives) {
      expect(alternative.eligibility.deterministicRuleVersion).toBe('aiw-synthesis-eligibility-2.0');
      expect(alternative.blueprint.providerNeutralFirst).toBe(true);
      expect(alternative.blueprint.views).toHaveLength(10);
      expect(alternative.blueprint.providerOverlays).toHaveLength(5);
    }
  });

  it('returns counterfactual comparison and a blueprint-rich artifact package', async () => {
    const create = await app.inject({ method: 'POST', url: '/api/synthesis/runs', payload: { projectId: sampleProject.id,
        branchId: sampleProject.branch.id,
        expectedRevision: sampleProject.revision, knowledgeReleaseId: 'AKR-0.10.55', strategyIds: ['balanced','resilience-first','security-first'], maxAlternatives: 3, requireDiversity: true, useLlmEnrichment: false } });
    expect(create.statusCode).toBe(201);
    const run = create.json();
    const alternative = run.alternatives[0];
    const comparison = await app.inject({ method: 'GET', url: `/api/synthesis/runs/${run.id}/comparison` });
    expect(comparison.statusCode).toBe(200);
    expect(comparison.json().counterfactuals.length).toBeGreaterThan(0);
    const artifacts = await app.inject({ method: 'POST', url: `/api/synthesis/runs/${run.id}/artifacts`, payload: { alternativeId: alternative.id, rationale: 'Governed API test rationale.' } });
    expect(artifacts.statusCode).toBe(200);
    const paths = artifacts.json().files.map((file: { path: string }) => file.path);
    expect(paths).toContain('synthesis/architecture-blueprint.json');
    expect(paths.filter((path: string) => path.endsWith('.svg'))).toHaveLength(10);
  });

  it('falls back cleanly to deterministic synthesis when external enrichment is unavailable', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/synthesis/runs',
      payload: {
        projectId: sampleProject.id,
        branchId: sampleProject.branch.id,
        expectedRevision: sampleProject.revision,
        knowledgeReleaseId: 'AKR-0.10.55',
        strategyIds: ['balanced','resilience-first'],
        maxAlternatives: 2,
        requireDiversity: true,
        useLlmEnrichment: true,
      },
    });
    expect(response.statusCode).toBe(201);
    const run = response.json();
    expect(run.mode).toBe('deterministic');
    expect(run.alternatives.length).toBeGreaterThanOrEqual(2);
    expect(run.warnings).toContain('External narrative enrichment was unavailable. AIW completed synthesis using the governed deterministic architecture kernel.');
  });
});
