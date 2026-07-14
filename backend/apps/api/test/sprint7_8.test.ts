import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';

let app: Awaited<ReturnType<typeof buildApp>>;
let auth: Record<string,string>;
beforeEach(async () => {
  process.env.AIW_ALLOW_DEV_AUTH = 'true';
  app = await buildApp();
  const token = await app.inject({ method: 'POST', url: '/api/auth/development-token', payload: { subject: 'user-owner', email: 'owner@example.com', displayName: 'Owner', tenantId: sampleProject.tenantId } });
  auth = { authorization: `Bearer ${token.json().token}` };
});
afterEach(async () => { await app.close(); });

describe('Sprint 7.8 pattern intelligence API', () => {
  it('serves the governed Pattern DNA corpus and metrics', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/pattern-intelligence/corpus?category=integration&limit=500', headers: auth });
    expect(response.statusCode).toBe(200);
    expect(response.json().version).toBe('0.10.59');
    expect(response.json().metrics.totalRecords).toBeGreaterThanOrEqual(200);
    expect(response.json().records.every((item: { category: string }) => item.category === 'integration')).toBe(true);
  });

  it('produces evidence-backed recommendations from the signed release', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/pattern-intelligence/recommend', headers: auth, payload: { query: 'resilient event integration idempotency', project: sampleProject, limit: 8 } });
    expect(response.statusCode).toBe(200);
    expect(response.json().knowledgeRelease).toBe('AKR-0.10.60');
    expect(response.json().recommendations.length).toBeGreaterThan(0);
  });

  it('previews and applies an eligible composition without mutating the submitted project', async () => {
    const preview = await app.inject({ method: 'POST', url: '/api/pattern-composition/preview', headers: auth, payload: { project: sampleProject, patternIds: ['PAT-EVENT-DRIVEN-ARCHITECTURE','PAT-TRANSACTIONAL-OUTBOX'], allowConditionalPrerequisites: true } });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().eligible).toBe(true);
    const applied = await app.inject({ method: 'POST', url: '/api/pattern-composition/apply-preview', headers: auth, payload: { project: sampleProject, patternIds: ['PAT-TRANSACTIONAL-OUTBOX'], allowConditionalPrerequisites: true } });
    expect(applied.statusCode).toBe(200);
    expect(applied.json().project.nodes.length).toBeGreaterThan(sampleProject.nodes.length);
    expect(sampleProject.nodes.length).toBeLessThan(applied.json().project.nodes.length);
  });

  it('enforces source-class permissions for production recommendation use', async () => {
    const blocked = await app.inject({ method: 'POST', url: '/api/repository-governance/evaluate', headers: auth, payload: { connectorId: 'GH-SYSTEM-DESIGN-PRIMER', operation: 'recommend' } });
    const allowed = await app.inject({ method: 'POST', url: '/api/repository-governance/evaluate', headers: auth, payload: { connectorId: 'GH-MICROSOFT-ARCH-CENTER', operation: 'recommend' } });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json().allowed).toBe(false);
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json().allowed).toBe(true);
  });


  it('exposes a fully passing calibrated benchmark suite', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/pattern-intelligence/benchmarks/run', headers: auth, payload: { project: sampleProject } });
    expect(response.statusCode).toBe(200);
    expect(response.json().total).toBe(6);
    expect(response.json().passed).toBe(6);
    expect(response.json().results.every((item: { passed: boolean }) => item.passed)).toBe(true);
  });

  it('generates conformance artifacts and exposes the immutable release manifest', async () => {
    const fitness = await app.inject({ method: 'POST', url: '/api/fitness-functions/generate', headers: auth, payload: { patternIds: ['PAT-BOUNDED-CONTEXT','PAT-EVENT-DRIVEN-ARCHITECTURE'] } });
    const release = await app.inject({ method: 'GET', url: '/api/knowledge-releases/7.8', headers: auth });
    expect(fitness.statusCode).toBe(200);
    expect(fitness.json().artifacts.length).toBe(2);
    expect(release.statusCode).toBe(200);
    expect(release.json().governance.liveGitHubRecommendations).toBe(false);
    expect(release.json().recordIds.length).toBeGreaterThanOrEqual(200);
  });
});
