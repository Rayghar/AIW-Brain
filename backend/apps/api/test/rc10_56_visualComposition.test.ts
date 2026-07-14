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

describe('rc.10.56 Visual Architecture Composition Studio API', () => {
  it('searches aliases, component kits and stage facets against the approved release', async () => {
    const aliasResponse = await app.inject({
      method: 'GET',
      url: '/api/visual-composition/catalogue?q=event-driven-architecture&stage=applicationRealization&limit=20',
    });
    expect(aliasResponse.statusCode).toBe(200);
    const aliasBody = aliasResponse.json();
    expect(aliasBody.releaseId).toBe('AKR-0.10.60');
    expect(aliasBody.ontologyVersion).toBe('pattern-dna-2.0');
    expect(aliasBody.workflow).toEqual([
      'search',
      'compare',
      'inspect',
      'preview-topology',
      'apply-to-scope',
      'review-changes',
      'accept',
      'validate-obligations',
    ]);
    expect(aliasBody.records.some((record: { id: string }) => record.id === 'PAT-EVENT-DRIVEN-ARCHITECTURE')).toBe(true);

    const kitResponse = await app.inject({
      method: 'GET',
      url: '/api/visual-composition/catalogue?q=Failure%20Channel&recordType=pattern&limit=50',
    });
    expect(kitResponse.statusCode).toBe(200);
    expect(kitResponse.json().records.length).toBeGreaterThan(0);
  });

  it('previews canonical model mutations before applying them', async () => {
    const payload = {
      project: structuredClone(sampleProject),
      patternIds: ['PAT-EVENT-DRIVEN-ARCHITECTURE', 'PAT-TRANSACTIONAL-OUTBOX'],
      stage: 'applicationRealization',
      allowConditionalPrerequisites: true,
    };
    const preview = await app.inject({
      method: 'POST',
      url: '/api/pattern-composition/preview',
      payload,
    });
    expect(preview.statusCode).toBe(200);
    const plan = preview.json();
    expect(plan.eligible).toBe(true);
    expect(plan.mutation.addNodes.length).toBeGreaterThan(0);
    expect(plan.mutation.addEdges.length).toBeGreaterThan(0);
    expect(plan.mutation.addInterfaces.length).toBeGreaterThan(0);
    expect(plan.mutation.addArchitectureViews).toHaveLength(1);
    expect(plan.obligations.length).toBeGreaterThan(0);
    expect(plan.canonicalChecks.every((check: { passed: boolean }) => check.passed)).toBe(true);
  });

  it('applies an eligible preview without uncontrolled duplicate model objects', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/api/pattern-composition/apply-preview',
      payload: {
        project: structuredClone(sampleProject),
        patternIds: ['PAT-TRANSACTIONAL-OUTBOX'],
        allowConditionalPrerequisites: true,
      },
    });
    expect(first.statusCode).toBe(200);
    const firstBody = first.json();
    expect(firstBody.project.nodes.length).toBeGreaterThan(sampleProject.nodes.length);
    expect(firstBody.project.interfaces.length).toBeGreaterThan((sampleProject.interfaces ?? []).length);
    expect(firstBody.project.architectureViews.length).toBeGreaterThan((sampleProject.architectureViews ?? []).length);

    const second = await app.inject({
      method: 'POST',
      url: '/api/pattern-composition/apply-preview',
      payload: {
        project: firstBody.project,
        patternIds: ['PAT-TRANSACTIONAL-OUTBOX'],
        allowConditionalPrerequisites: true,
      },
    });
    expect(second.statusCode).toBe(200);
    const secondBody = second.json();
    expect(secondBody.plan.duplicateSkips.length).toBeGreaterThan(0);
    expect(secondBody.project.nodes).toHaveLength(firstBody.project.nodes.length);
    expect(secondBody.project.edges).toHaveLength(firstBody.project.edges.length);
    expect(secondBody.project.interfaces).toHaveLength(firstBody.project.interfaces.length);
  });

  it('blocks candidate knowledge from mutating the architecture', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/pattern-composition/apply-preview',
      payload: {
        project: structuredClone(sampleProject),
        patternIds: ['PAT-CANDIDATE-EXPERIMENTAL'],
        allowConditionalPrerequisites: true,
      },
    });
    expect([400, 409]).toContain(response.statusCode);
  });
});
