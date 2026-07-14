import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { knowledgeRepositoryConnectors, sampleProject, seedKnowledgeClaims } from '@aiw/domain';
import { buildApp } from '../src/app.js';
import { previewGitHubKnowledgeRefresh } from '../src/githubKnowledgeConnector.js';

let app: Awaited<ReturnType<typeof buildApp>>;
let auth: Record<string,string>;
beforeEach(async () => {
  process.env.AIW_ALLOW_DEV_AUTH = 'true';
  delete process.env.AIW_ENABLE_GITHUB_KNOWLEDGE;
  app = await buildApp();
  const token = await app.inject({ method: 'POST', url: '/api/auth/development-token', payload: { subject: 'user-owner', email: 'owner@example.com', displayName: 'Owner', tenantId: sampleProject.tenantId } });
  auth = { authorization: `Bearer ${token.json().token}` };
});
afterEach(async () => { await app.close(); delete process.env.AIW_ENABLE_GITHUB_KNOWLEDGE; });

describe('Sprint 7.7 knowledge mesh API', () => {
  it('serves the deep connector catalogue and approved claims', async () => {
    const connectors = await app.inject({ method: 'GET', url: '/api/knowledge-mesh/connectors', headers: auth });
    const claims = await app.inject({ method: 'GET', url: '/api/knowledge-mesh/claims', headers: auth });
    expect(connectors.statusCode).toBe(200);
    expect(connectors.json().connectors.length).toBeGreaterThanOrEqual(40);
    expect(connectors.json().coverage.approvedConnectors).toBeGreaterThanOrEqual(30);
    expect(claims.statusCode).toBe(200);
    expect(claims.json().claims.length).toBe(seedKnowledgeClaims.length);
    expect(connectors.json().connectors.some((item: { id: string }) => item.id === 'GH-MESHERY')).toBe(true);
  });

  it('retrieves approved claims and exposes the current release boundary', async () => {
    const result = await app.inject({ method: 'POST', url: '/api/knowledge-mesh/retrieve', headers: auth, payload: { query: 'Java architecture dependency tests', includeCandidateClaims: true } });
    const release = await app.inject({ method: 'GET', url: '/api/knowledge-mesh/releases/current', headers: auth });
    expect(result.statusCode).toBe(200);
    expect(result.json().approved.some((hit: { claim: { id: string } }) => hit.claim.id === 'KCLM-ARCHUNIT-RULES')).toBe(true);
    expect(release.statusCode).toBe(200);
    expect(release.json().status).toBe('approved');
  });

  it('keeps GitHub refresh disabled by default', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/knowledge-mesh/github/refresh-preview', headers: auth, payload: { connectorId: 'GH-MICROSOFT-ARCH-CENTER' } });
    expect(response.statusCode).toBe(503);
    expect(response.json().error).toBe('GITHUB_KNOWLEDGE_REFRESH_DISABLED');
  });

  it('builds a quarantined refresh preview using mocked GitHub responses', async () => {
    process.env.AIW_ENABLE_GITHUB_KNOWLEDGE = 'true';
    const fakeFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: 'commit-123' }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: 'tree-123', truncated: false, tree: [
        { path: 'docs/patterns/circuit-breaker.md', type: 'blob', sha: 'blob-1', size: 5000 },
        { path: 'docs/patterns/media/image.png', type: 'blob', sha: 'blob-2', size: 1000 },
      ] }), { status: 200, headers: { etag: 'etag-1', 'x-ratelimit-remaining': '49' } }));
    const preview = await previewGitHubKnowledgeRefresh({ connectorId: 'GH-MICROSOFT-ARCH-CENTER', fetchImpl: fakeFetch as typeof fetch, now: '2026-07-02T00:00:00.000Z' });
    expect(preview.snapshot.status).toBe('quarantined');
    expect(preview.snapshot.files).toHaveLength(1);
    expect(preview.publicationStatus).toBe('quarantined-only');
  });

  it('creates a reviewable proposal preview from candidate claims', async () => {
    const claim = structuredClone(seedKnowledgeClaims[0]!);
    claim.id = `${claim.id}-API-CANDIDATE`;
    claim.reviewStatus = 'candidate';
    const response = await app.inject({ method: 'POST', url: '/api/knowledge-mesh/proposals/preview', headers: auth, payload: { title: 'Candidate knowledge update', sourceSnapshotIds: ['KSNAP-API'], claims: [claim], recommendationRegressionIds: ['REG-01'] } });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('draft');
    expect(response.json().newClaims).toHaveLength(1);
  });
});
