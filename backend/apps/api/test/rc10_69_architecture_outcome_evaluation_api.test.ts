import { describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

const headers = {
  'x-aiw-tenant-id': sampleProject.tenantId,
  'x-aiw-user-id': 'reference-enterprise-architect',
  'x-aiw-roles': 'enterprise-architect',
};

describe('rc.10.69 architecture outcome evaluation API', () => {
  it('returns seven governed scenario definitions without making a pilot claim', async () => {
    const app = await buildApp({ repository: new InMemoryProjectRepository(), logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/intelligence/outcome-evaluation/scenarios',
        headers,
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().scenarios).toHaveLength(7);
      expect(response.json().governanceBoundary).toMatch(/do not claim human expert validation/i);
    } finally {
      await app.close();
    }
  });

  it('evaluates the supplied tenant project and returns a blinded expert-review pack', async () => {
    const app = await buildApp({ repository: new InMemoryProjectRepository(), logger: false });
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/intelligence/outcome-evaluation/run',
        headers,
        payload: {
          project: sampleProject,
          knowledgeReleaseId: 'AKR-0.10.69-REFERENCE',
          grammarVersion: 'living-canvas-grammar-0.10.69',
          patternDnaVersion: 'pattern-dna-2.0-pilot-core',
          providerPolicyVersion: 'governed-co-creation-0.10.69',
        },
      });
      expect(response.statusCode).toBe(200);
      const report = response.json();
      expect(report.summary.scenarioCount).toBe(7);
      expect(report.expertReviewPack.anonymizedVariantIds).toHaveLength(21);
      expect(report.governance.productionAcceptanceClaimed).toBe(false);
      expect(report.governance.llmHasCanonicalMutationAuthority).toBe(false);
      expect(report.navigationUx.unresolvedBlockers).toBe(0);
    } finally {
      await app.close();
    }
  });

  it('denies evaluation of a project from another tenant', async () => {
    const app = await buildApp({ repository: new InMemoryProjectRepository(), logger: false });
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/intelligence/outcome-evaluation/run',
        headers: { ...headers, 'x-aiw-tenant-id': 'tenant-other' },
        payload: { project: sampleProject },
      });
      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({ error: 'TENANT_BOUNDARY_VIOLATION' });
    } finally {
      await app.close();
    }
  });
});
