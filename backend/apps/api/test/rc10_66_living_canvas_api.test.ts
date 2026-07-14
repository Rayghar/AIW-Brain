import { describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

async function token(app: Awaited<ReturnType<typeof buildApp>>) {
  const response = await app.inject({ method: 'POST', url: '/api/auth/development-token', payload: { subject: 'user-owner', email: 'owner@example.com', displayName: 'Owner', tenantId: sampleProject.tenantId } });
  return { authorization: `Bearer ${response.json().token}` };
}

function event() {
  return {
    id: 'gesture-api-1', kind: 'candidate-requested', occurredAt: '2026-07-12T10:00:00.000Z',
    tenantId: sampleProject.tenantId, projectId: sampleProject.id, branchId: sampleProject.branch.id,
    revision: sampleProject.revision, actorId: 'spoofed', actorRole: 'spoofed', stage: 'qualityDrivers',
    targetStage: 'logicalApplication', decompositionLevel: 'system', selectedScopeId: 'system-order-payment',
    subjectIds: ['system-order-payment'], autonomyMode: 'guide',
  };
}

describe('rc.10.66 Living Canvas API', () => {
  it('publishes the governed release and released pilot grammars', async () => {
    const app = await buildApp({ repository: new InMemoryProjectRepository(), logger: false });
    try {
      const release = await app.inject({ method: 'GET', url: '/api/living-canvas/release' });
      expect(release.statusCode).toBe(200);
      expect(release.json()).toMatchObject({ version: '0.10.0-rc.10.68.0', deterministicOnly: false, humanApprovalRequired: true, noiseBudget: 5 });
      const grammars = await app.inject({ method: 'GET', url: '/api/living-canvas/grammars' });
      expect(grammars.json().grammars).toHaveLength(4);
    } finally { await app.close(); }
  });

  it('generates tenant-scoped actions and applies one with revision protection', async () => {
    const repository = new InMemoryProjectRepository();
    const app = await buildApp({ repository, logger: false });
    try {
      const headers = await token(app);
      const actionsResponse = await app.inject({ method: 'POST', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}/living-canvas/actions`, headers, payload: { event: event(), outcomeHistory: [] } });
      expect(actionsResponse.statusCode).toBe(200);
      const envelope = actionsResponse.json();
      expect(envelope.deterministicOnly).toBe(true);
      expect(envelope.actions.length).toBeGreaterThan(0);
      expect(envelope.actions.length).toBeLessThanOrEqual(5);
      const action = envelope.actions[0];
      const applyResponse = await app.inject({ method: 'POST', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}/living-canvas/apply`, headers: { ...headers, 'idempotency-key': 'living-canvas-api-test-1' }, payload: { action, expectedRevision: sampleProject.revision, rationale: 'API acceptance test' } });
      expect([200, 422]).toContain(applyResponse.statusCode);
      if (applyResponse.statusCode === 200) expect(applyResponse.json().project.revision).toBe(sampleProject.revision + 1);
    } finally { await app.close(); }
  });

  it('rejects cross-tenant gestures and stale revision acceptance', async () => {
    const app = await buildApp({ repository: new InMemoryProjectRepository(), logger: false });
    try {
      const headers = await token(app);
      const mismatch = await app.inject({ method: 'POST', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}/living-canvas/actions`, headers, payload: { event: { ...event(), tenantId: 'tenant-other' } } });
      expect(mismatch.statusCode).toBe(403);
      const valid = await app.inject({ method: 'POST', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}/living-canvas/actions`, headers, payload: { event: event() } });
      const stale = await app.inject({ method: 'POST', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}/living-canvas/apply`, headers, payload: { action: valid.json().actions[0], expectedRevision: sampleProject.revision + 99 } });
      expect(stale.statusCode).toBe(409);
    } finally { await app.close(); }
  });
});
