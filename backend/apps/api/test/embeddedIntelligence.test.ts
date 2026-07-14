import { afterEach, describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';

let app: Awaited<ReturnType<typeof buildApp>> | undefined;
afterEach(async () => { if (app) await app.close(); app = undefined; });

async function authenticated(tenantId = sampleProject.tenantId) {
  app = await buildApp();
  const token = await app.inject({
    method: 'POST',
    url: '/api/auth/development-token',
    payload: { subject: 'user-owner', email: 'owner@example.com', displayName: 'Owner', tenantId },
  });
  return { authorization: `Bearer ${token.json().token}` };
}

describe('v0.10.0-alpha.1 full-journey intelligence API', () => {
  it('preserves v0.9.9 and exposes Sprint 8.7.1 as the active platform', async () => {
    const headers = await authenticated();
    const release = await app!.inject({ method: 'GET', url: '/api/releases/8.6', headers });
    expect(release.statusCode).toBe(200);
    expect(release.json().releaseId).toBe('AIW-0.9.9');
    expect(release.json().knowledgeReleaseId).toBe('AKR-0.10.60');
    expect(release.json().capabilities.unifiedArchitectureEventModel).toBe(true);
    expect(release.json().calibrationBoundary.productionCalibratedAttributes).toBe(8);
    expect(release.json().calibrationBoundary.aiDraftedAttributesPendingIndependentReview).toBe(12);

    const fullJourney = await app!.inject({ method: 'GET', url: '/api/releases/8.7.1', headers });
    expect(fullJourney.statusCode).toBe(200);
    expect(fullJourney.json().releaseId).toBe('AIW-0.10.0-alpha.1');
    expect(fullJourney.json().capabilities.kernelProjectedVisualModels).toBe(true);

    const active = await app!.inject({ method: 'GET', url: '/api/knowledge/releases/active', headers });
    expect(active.json().platform.releaseId).toBe('AIW-0.10.0-rc.6');
    expect(active.json().release.releaseId).toBe('AKR-0.10.60');
  });

  it('returns a release-bound intelligence response for a semantic event', async () => {
    const headers = await authenticated();
    const response = await app!.inject({
      method: 'POST',
      url: '/api/intelligence/evaluate',
      headers,
      payload: {
        project: sampleProject,
        event: {
          kind: 'connection-intent',
          sourceId: 'logical-order-service',
          targetId: 'logical-payment-service',
          relationshipKind: 'communicatesWith',
          eventId: 'api-trace-001',
          workspace: 'quality',
        },
      },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.trace.id).toBe('api-trace-001');
    expect(body.evidence.knowledgeReleaseId).toBe('AKR-0.10.60');
    expect(body.evidence.candidateKnowledgeUsed).toBe(false);
    expect(body.suggestedRelationships.length).toBeGreaterThan(0);
    expect(body.proposedChangeSets.length).toBeGreaterThan(0);
    expect(body.context.workspace).toBe('quality');
    expect(body.visualModel.generatedFrom).toBe('canonical-project-and-intelligence-kernel');
    expect(body.visualModel.nodes.length).toBeGreaterThan(0);
  });

  it('rejects malformed events and cross-tenant projects', async () => {
    const headers = await authenticated('tenant-other');
    const malformed = await app!.inject({
      method: 'POST', url: '/api/intelligence/evaluate', headers,
      payload: { project: sampleProject, event: { kind: 'unknown-event' } },
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json().error).toBe('INVALID_INTELLIGENCE_EVALUATION');

    const forbidden = await app!.inject({
      method: 'POST', url: '/api/intelligence/evaluate', headers,
      payload: { project: sampleProject, event: { kind: 'state-recomputed' } },
    });
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.json().error).toBe('TENANT_BOUNDARY_VIOLATION');
  });
});
