import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildApp({ repository: new InMemoryProjectRepository(), logger: false });
});

afterEach(async () => {
  await app.close();
});

describe('AIW API Sprint 5', () => {
  it('returns live contextual styles, patterns and decisions', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/recommendations/contextual',
      payload: {
        project: sampleProject,
        context: {
          stage: 'logicalApplication',
          scopeNodeId: 'logical-order-domain',
          trigger: 'scope-change',
        },
      },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.styles.length).toBeGreaterThan(0);
    expect(body.patterns.some((item: { patternId: string }) => item.patternId === 'PAT-OUTBOX')).toBe(true);
    expect(Array.isArray(body.decisions)).toBe(true);
  });

  it('creates and retrieves immutable project snapshots', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: `/api/projects/${sampleProject.id}/snapshots`,
      payload: {
        project: sampleProject,
        label: 'Sprint 1 baseline',
        status: 'reviewed',
        createdBy: 'test-user',
      },
    });
    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json();
    expect(created.contentHash).toMatch(/^[a-f0-9]{64}$/);

    const listResponse = await app.inject({ method: 'GET', url: `/api/projects/${sampleProject.id}/snapshots` });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toHaveLength(1);

    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/projects/${sampleProject.id}/snapshots/${created.id}`,
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json().project.schemaVersion).toBe('0.8.0');
  });
});


describe('governance and branch APIs', () => {
  it('returns impact analysis and approval readiness', async () => {
    const impact = await app.inject({ method: 'POST', url: '/api/impact', payload: { project: sampleProject, sourceIds: ['logical-order-service'] } });
    expect(impact.statusCode).toBe(200);
    expect(impact.json().affectedNodes.length).toBeGreaterThan(0);

    const readiness = await app.inject({ method: 'POST', url: '/api/governance/approval-readiness', payload: { project: sampleProject, stage: 'logicalApplication', openObligations: 0 } });
    expect(readiness.statusCode).toBe(200);
    expect(Array.isArray(readiness.json().blockers)).toBe(true);
  });

  it('compares two governed branches', async () => {
    const target = structuredClone(sampleProject);
    target.branch = { ...target.branch, id: 'branch-target', name: 'Target' };
    target.objectives.push('New target objective');
    const response = await app.inject({ method: 'POST', url: '/api/branches/compare', payload: { source: sampleProject, target } });
    expect(response.statusCode).toBe(200);
    expect(response.json().targetBranchId).toBe('branch-target');
  });
});


describe('Sprint 3 collaboration APIs', () => {
  it('persists branch-scoped projects with optimistic revision checks', async () => {
    const saved = await app.inject({ method: 'PUT', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}`, payload: { project: sampleProject } });
    expect(saved.statusCode).toBe(200);
    const changed = structuredClone(sampleProject);
    changed.revision += 1;
    changed.updatedAt = new Date().toISOString();
    const conflict = await app.inject({ method: 'PUT', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}`, payload: { project: changed, expectedRevision: 0 } });
    expect(conflict.statusCode).toBe(409);
  });

  it('assigns independent reviews and produces notifications', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/reviews/assign', payload: { project: sampleProject, stage: 'logicalApplication', assignedTo: 'user-reviewer', assignedBy: 'user-owner', priority: 'high' } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.reviewAssignments).toHaveLength((sampleProject.reviewAssignments?.length ?? 0) + 1);
    expect(body.notifications.some((item: { type: string }) => item.type === 'review-assigned')).toBe(true);
  });

  it('creates merge plans and requires explicit conflict resolution', async () => {
    const source = structuredClone(sampleProject);
    source.branch = { ...source.branch, id: 'branch-source', name: 'Source' };
    source.nodes[0]!.label = 'Customer actor changed in source';
    const target = structuredClone(sampleProject);
    target.nodes[0]!.label = 'Customer actor changed in target';
    const planResponse = await app.inject({ method: 'POST', url: '/api/branches/merge-plan', payload: { source, target } });
    expect(planResponse.statusCode).toBe(200);
    expect(planResponse.json().conflicts.length).toBeGreaterThan(0);
  });

  it('rejects stale concurrent operations', async () => {
    await app.inject({ method: 'PUT', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}`, payload: { project: sampleProject } });
    const response = await app.inject({ method: 'POST', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}/operations`, payload: { operationId: 'op-stale-api', idempotencyKey: 'idem-stale-api-0001', tenantId: sampleProject.tenantId, projectId: sampleProject.id, branchId: sampleProject.branch.id, baseRevision: 0, actorId: 'user-owner', operations: [{ type: 'DELETE_NODE', nodeId: 'logical-order-service' }] } });
    expect(response.statusCode).toBe(409);
  });
});


describe('Sprint 4 security, tenant and live collaboration APIs', () => {
  const headers = { 'x-aiw-tenant-id': sampleProject.tenantId, 'x-aiw-user-id': 'user-owner' };

  it('isolates project reads by tenant', async () => {
    const allowed = await app.inject({ method: 'GET', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}`, headers });
    expect(allowed.statusCode).toBe(200);
    const denied = await app.inject({ method: 'GET', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}`, headers: { 'x-aiw-tenant-id': 'tenant-other', 'x-aiw-user-id': 'user-owner' } });
    expect(denied.statusCode).toBe(404);
  });

  it('returns a redacted security posture and accepts presence heartbeats', async () => {
    const posture = await app.inject({ method: 'GET', url: `/api/security/posture/${sampleProject.id}/${sampleProject.branch.id}`, headers });
    expect(posture.statusCode).toBe(200);
    expect(posture.json().tenantId).toBe(sampleProject.tenantId);
    expect(posture.json().identityProviders[0].clientId).toBeUndefined();

    const heartbeat = await app.inject({ method: 'POST', url: '/api/presence/heartbeat', headers, payload: { connectionId: 'connection-test', branchId: sampleProject.branch.id, stage: 'logicalApplication' } });
    expect(heartbeat.statusCode).toBe(200);
    const presence = await app.inject({ method: 'GET', url: `/api/presence/${sampleProject.branch.id}`, headers });
    expect(presence.json()).toHaveLength(1);
  });

  it('replays idempotent project saves and rejects key reuse with a different request', async () => {
    const requestHeaders = { ...headers, 'idempotency-key': 'save-idempotency-0001' };
    const first = await app.inject({ method: 'PUT', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}`, headers: requestHeaders, payload: { project: sampleProject } });
    expect(first.statusCode).toBe(200);
    expect(first.headers['idempotency-replayed']).toBe('false');
    const replay = await app.inject({ method: 'PUT', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}`, headers: requestHeaders, payload: { project: sampleProject } });
    expect(replay.statusCode).toBe(200);
    expect(replay.headers['idempotency-replayed']).toBe('true');
    const changed = structuredClone(sampleProject); changed.description = 'Different request';
    const conflict = await app.inject({ method: 'PUT', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}`, headers: requestHeaders, payload: { project: changed } });
    expect(conflict.statusCode).toBe(409);
  });

  it('publishes tenant-scoped activity and retains audit records', async () => {
    const save = await app.inject({ method: 'PUT', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}`, headers: { ...headers, 'idempotency-key': 'activity-save-0001' }, payload: { project: sampleProject } });
    expect(save.statusCode).toBe(200);
    const activity = await app.inject({ method: 'GET', url: `/api/activity?projectId=${sampleProject.id}`, headers });
    expect(activity.json().some((event: { type: string }) => event.type === 'project.saved')).toBe(true);
    const audit = await app.inject({ method: 'GET', url: '/api/audit', headers });
    expect(audit.json().some((event: { action: string }) => event.action === 'save')).toBe(true);
  });

  it('issues signed development tokens when development authentication is enabled', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/auth/development-token', payload: { subject: 'user-owner', email: 'owner@example.com', displayName: 'Owner', tenantId: sampleProject.tenantId } });
    expect(response.statusCode).toBe(200);
    expect(response.json().token).toMatch(/^aiwdev\./);
  });
});
