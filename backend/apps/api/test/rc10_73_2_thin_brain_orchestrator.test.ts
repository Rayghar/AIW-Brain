import { describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

const headers = {
  'x-aiw-tenant-id': sampleProject.tenantId,
  'x-aiw-user-id': 'user-owner',
};

function expectCompatibilityBoundary(response: {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
}) {
  expect(response.statusCode).toBeLessThan(500);
  expect(response.headers.deprecation).toBe('true');
  expect(response.headers['x-aiw-brain-authority']).toBe('AIW Brain Orchestrator');
  expect(response.headers['x-aiw-brain-boundary-version']).toBe('0.10.0-rc.10.73.5');
  expect(String(response.headers.link)).toContain('successor-version');
}

describe('rc.10.73.2 thin Brain orchestrator and parallel-authority retirement', () => {
  it('routes legacy intelligence surfaces through the Brain compatibility boundary', async () => {
    const repository = new InMemoryProjectRepository();
    const app = await buildApp({ repository, logger: false });
    try {
      const project = await repository.getProject(
        sampleProject.tenantId,
        sampleProject.id,
        sampleProject.branch.id,
      );
      expect(project).toBeDefined();

      const cases = [
        {
          url: '/api/recommendations',
          payload: project,
        },
        {
          url: '/api/validate',
          payload: project,
        },
        {
          url: '/api/audits/deterministic',
          payload: project,
        },
        {
          url: '/api/intelligence/evaluate',
          payload: { project, event: { kind: 'state-recomputed' } },
        },
        {
          url: '/api/governance/evaluate',
          payload: project,
        },
        {
          url: '/api/governance/approval-readiness',
          payload: {
            project,
            stage: project!.activeStage,
            openObligations: 0,
          },
        },
        {
          url: '/api/policy-gates/evaluate',
          payload: {
            project,
            gate: project!.policyGates[0],
          },
        },
        {
          url: '/api/synthesis/assess',
          payload: {
            projectId: project!.id,
            branchId: project!.branch.id,
            expectedRevision: project!.revision,
          },
        },
      ];

      for (const testCase of cases) {
        const response = await app.inject({
          method: 'POST',
          url: testCase.url,
          headers,
          payload: testCase.payload,
        });
        expectCompatibilityBoundary(response);
      }
    } finally {
      await app.close();
    }
  });

  it('reports one consolidated architecture-runtime authority with isolated knowledge operations', async () => {
    const app = await buildApp({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/architecture-brain/authority-audit',
        headers,
      });
      expect(response.statusCode).toBe(200);
      const audit = response.json();
      expect(audit.applicationVersion).toBe('0.10.0-rc.10.73.5');
      expect(audit.summary.migrationRequiredPaths).toBe(0);
      expect(audit.summary.blockedPaths).toBe(0);
      expect(audit.paths.find((item: { id: string }) => item.id === 'legacy-project-intelligence-aliases')).toMatchObject({
        orchestrated: true,
        status: 'consolidated',
        owner: 'AIW Brain Orchestrator',
      });
      expect(audit.paths.find((item: { id: string }) => item.id === 'review-studio')).toMatchObject({
        orchestrated: true,
        status: 'consolidated',
      });
      expect(
        audit.paths
          .filter((item: { category: string }) => item.category === 'architecture-runtime')
          .every((item: { orchestrated: boolean; owner: string }) =>
            item.orchestrated && item.owner === 'AIW Brain Orchestrator',
          ),
      ).toBe(true);
    } finally {
      await app.close();
    }
  });
});
