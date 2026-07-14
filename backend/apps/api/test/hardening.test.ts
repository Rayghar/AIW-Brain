import { afterEach, describe, expect, it } from 'vitest';
import { rm } from 'node:fs/promises';
import { sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';

let app: Awaited<ReturnType<typeof buildApp>> | undefined;
afterEach(async () => {
  if (app) await app.close();
  app = undefined;
  await rm('config/llm-runtime-overrides.json', { force: true }).catch(() => undefined);
});

async function authenticated() {
  app = await buildApp();
  const tokenResponse = await app.inject({ method: 'POST', url: '/api/auth/development-token', payload: { subject: 'user-owner', email: 'owner@example.com', displayName: 'Owner', tenantId: sampleProject.tenantId } });
  return { authorization: `Bearer ${tokenResponse.json().token}` };
}

describe('v0.9.7 production hardening APIs', () => {
  it('exposes the hardening release as the active platform boundary', async () => {
    const headers = await authenticated();
    const release = await app!.inject({ method: 'GET', url: '/api/releases/8.0.4', headers });
    expect(release.statusCode).toBe(200);
    expect(release.json().releaseId).toBe('AIW-0.9.7');
    expect(release.json().capabilities.knowledgeDepthScoringAndRetrievalGate).toBe(true);
    const active = await app!.inject({ method: 'GET', url: '/api/knowledge/releases/active', headers });
    expect(active.json().platform.releaseId).toBe('AIW-0.10.0-rc.6');
  });

  it('reports knowledge depth and recommendation eligibility policy', async () => {
    const headers = await authenticated();
    const response = await app!.inject({ method: 'GET', url: '/api/knowledge/depth', headers });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.releaseId).toBe('AKR-0.10.60');
    expect(body.recordCount).toBeGreaterThanOrEqual(200);
    expect(body.productionDeep + body.productionSupporting + body.needsEnrichment).toBe(body.recordCount);
    expect(body.policy.primaryRecommendationMinimumGrade).toBe('production-deep');
  });

  it('reports configured and verified platform capabilities separately', async () => {
    const headers = await authenticated();
    const response = await app!.inject({ method: 'GET', url: '/api/platform/acceptance', headers });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.boundary).toContain('Configured');
    expect(Array.isArray(body.checks)).toBe(true);
    expect(body.checks.some((item: { status: string }) => item.status === 'not-configured' || item.status === 'reference-only' || item.status === 'configured' || item.status === 'verified')).toBe(true);
  });
});
