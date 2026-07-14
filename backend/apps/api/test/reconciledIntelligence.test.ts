import { afterEach, describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';

let app: Awaited<ReturnType<typeof buildApp>> | undefined;
afterEach(async () => { if (app) await app.close(); app = undefined; });

async function authenticated() {
  process.env.AIW_ALLOW_DEV_AUTH = 'true';
  app = await buildApp();
  const token = await app.inject({ method: 'POST', url: '/api/auth/development-token', payload: { subject: 'user-owner', email: 'owner@example.com', displayName: 'Owner', tenantId: sampleProject.tenantId } });
  return { authorization: `Bearer ${token.json().token}` };
}

describe('v0.9.6 reconciled intelligence API', () => {
  it('exposes the reconciled platform release and approved knowledge boundary', async () => {
    const headers = await authenticated();
    const release = await app!.inject({ method: 'GET', url: '/api/releases/8.0.3', headers });
    expect(release.statusCode).toBe(200);
    expect(release.json().releaseId).toBe('AIW-0.9.6');
    expect(release.json().knowledgeReleaseId).toBe('AKR-0.10.60');
    expect(release.json().capabilities.releaseBoundKnowledgeRetrieval).toBe(true);
  });

  it('enforces the production knowledge target through the governance endpoint', async () => {
    const headers = await authenticated();
    const response = await app!.inject({ method: 'GET', url: '/api/knowledge/governance', headers });
    expect(response.statusCode).toBe(200);
    expect(response.json().productionPatternRelease.releaseAllowed).toBe(true);
    expect(response.json().productionPatternRelease.stats.reviewedComplete).toBeGreaterThanOrEqual(200);
  });

  it('keeps stage advice safely degraded when no model provider is configured', async () => {
    const headers = await authenticated();
    const project = structuredClone(sampleProject);
    project.activeStage = 'logicalApplication';
    const response = await app!.inject({ method: 'POST', url: '/api/design/stage-advice', headers, payload: { projectId: project.id, branchId: project.branch.id, expectedRevision: project.revision, selectedNodeId: project.nodes.find((node) => node.stage === 'logicalApplication')?.id } });
    expect(response.statusCode).toBe(200);
    expect(response.json().available).toBe(false);
    expect(typeof response.json().degradedReason).toBe('string');
  });

  it('requires a named human owner before any knowledge promotion', async () => {
    const headers = await authenticated();
    const response = await app!.inject({ method: 'POST', url: '/api/knowledge/promote', headers, payload: { record: { id: 'PAT-TEST', recordType: 'pattern' }, owner: 'A', targetStatus: 'reviewed' } });
    expect(response.statusCode).toBe(400);
  });
});
