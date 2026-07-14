import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

let app: FastifyInstance;
const tenantId = sampleProject.tenantId;

function projectFor(id: string, role: 'architect' | 'reviewer' | 'owner') {
  const project = structuredClone(sampleProject);
  project.members.push({ id, displayName: id, email: `${id}@reference.aiw.invalid`, role, status: 'active', joinedAt: new Date().toISOString() });
  return project;
}

beforeEach(async () => { app = await buildApp({ repository: new InMemoryProjectRepository(), logger: false }); });
afterEach(async () => { await app.close(); });

describe('rc.10.51 API role boundary', () => {
  it('allows an architecture reviewer to run review but denies delivery generation', async () => {
    const headers = { 'x-aiw-tenant-id': tenantId, 'x-aiw-user-id': 'reference-reviewer', 'x-aiw-roles': 'architecture-reviewer' };
    const project = projectFor('reference-reviewer', 'reviewer');
    const review = await app.inject({ method: 'POST', url: '/api/review-studio/run', headers, payload: { project } });
    expect(review.statusCode).toBe(200);
    const handoff = await app.inject({ method: 'POST', url: '/api/review-studio/handoff-pack', headers, payload: { project } });
    expect(handoff.statusCode).toBe(403);
    expect(handoff.json()).toMatchObject({ error: 'PERMISSION_DENIED', permission: 'artifact.generate' });
  });

  it('allows the solution architect to generate a governed delivery pack', async () => {
    const headers = { 'x-aiw-tenant-id': tenantId, 'x-aiw-user-id': 'reference-solution-architect', 'x-aiw-roles': 'solution-architect' };
    const project = projectFor('reference-solution-architect', 'architect');
    const handoff = await app.inject({ method: 'POST', url: '/api/review-studio/handoff-pack', headers, payload: { project } });
    expect(handoff.statusCode).toBe(200);
    expect(handoff.json().bundle.files.length).toBeGreaterThan(0);
  });

  it('enforces role-specific read boundaries for admin and knowledge surfaces', async () => {
    const reviewer = { 'x-aiw-tenant-id': tenantId, 'x-aiw-user-id': 'reference-reviewer', 'x-aiw-roles': 'architecture-reviewer' };
    const curator = { 'x-aiw-tenant-id': tenantId, 'x-aiw-user-id': 'reference-curator', 'x-aiw-roles': 'knowledge-curator' };
    const enterprise = { 'x-aiw-tenant-id': tenantId, 'x-aiw-user-id': 'reference-enterprise', 'x-aiw-roles': 'enterprise-architect' };
    const solution = { 'x-aiw-tenant-id': tenantId, 'x-aiw-user-id': 'reference-solution', 'x-aiw-roles': 'solution-architect' };
    const platform = { 'x-aiw-tenant-id': tenantId, 'x-aiw-user-id': 'reference-platform', 'x-aiw-roles': 'platform-architect' };

    const reviewerMindFactory = await app.inject({ method: 'GET', url: '/api/admin/mind-factory', headers: reviewer });
    expect(reviewerMindFactory.statusCode).toBe(403);
    expect(reviewerMindFactory.json()).toMatchObject({ permission: 'knowledge.read' });

    const curatorMindFactory = await app.inject({ method: 'GET', url: '/api/admin/mind-factory', headers: curator });
    expect(curatorMindFactory.statusCode).toBe(200);
    const curatorControlPlane = await app.inject({ method: 'GET', url: '/api/admin/control-plane/snapshot', headers: curator });
    expect(curatorControlPlane.statusCode).toBe(403);
    expect(curatorControlPlane.json()).toMatchObject({ permission: 'admin.control-plane.read' });

    const enterpriseReleases = await app.inject({ method: 'GET', url: '/api/knowledge-releases', headers: enterprise });
    expect(enterpriseReleases.statusCode).toBe(200);

    const solutionAudit = await app.inject({ method: 'GET', url: '/api/admin/audit', headers: solution });
    expect(solutionAudit.statusCode).toBe(403);
    expect(solutionAudit.json()).toMatchObject({ permission: 'audit.read' });

    const platformRepository = await app.inject({ method: 'GET', url: '/api/admin/repository-conformance/pilot', headers: platform });
    expect(platformRepository.statusCode).toBe(200);
  });

  it('authorizes project persistence against the stored project rather than client-supplied membership', async () => {
    const headers = { 'x-aiw-tenant-id': tenantId, 'x-aiw-user-id': 'reference-solution-architect', 'x-aiw-roles': 'solution-architect' };
    const loaded = await app.inject({ method: 'GET', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}`, headers });
    expect(loaded.statusCode).toBe(200);
    const project = loaded.json();
    const expectedRevision = project.revision;
    project.description = `${project.description} Governed save verification.`;
    project.revision += 1;
    const saved = await app.inject({
      method: 'PUT',
      url: `/api/projects/${project.id}/branches/${project.branch.id}`,
      headers,
      payload: { project, expectedRevision },
    });
    expect(saved.statusCode).toBe(200);
  });

  it('prevents a client from granting itself project access in the submitted document', async () => {
    const attackerId = 'reference-self-grant-attacker';
    const headers = { 'x-aiw-tenant-id': tenantId, 'x-aiw-user-id': attackerId, 'x-aiw-roles': 'solution-architect' };
    const project = structuredClone(sampleProject);
    project.members.push({ id: attackerId, displayName: 'Self Grant Attacker', email: 'attacker@reference.aiw.invalid', role: 'owner', status: 'active', joinedAt: new Date().toISOString() });
    project.revision += 1;
    const response = await app.inject({
      method: 'PUT',
      url: `/api/projects/${project.id}/branches/${project.branch.id}`,
      headers,
      payload: { project, expectedRevision: sampleProject.revision },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ error: 'FORBIDDEN:project.edit' });
  });

  it('requires member-manage permission when an architect changes project membership', async () => {
    const headers = { 'x-aiw-tenant-id': tenantId, 'x-aiw-user-id': 'reference-solution-architect', 'x-aiw-roles': 'solution-architect' };
    const loaded = await app.inject({ method: 'GET', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}`, headers });
    const project = loaded.json();
    const expectedRevision = project.revision;
    project.members.push({ id: 'new-reviewer', displayName: 'New Reviewer', email: 'new-reviewer@example.com', role: 'reviewer', status: 'active', joinedAt: new Date().toISOString() });
    project.revision += 1;
    const response = await app.inject({
      method: 'PUT',
      url: `/api/projects/${project.id}/branches/${project.branch.id}`,
      headers,
      payload: { project, expectedRevision },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ error: 'FORBIDDEN:member.manage' });
  });


  it('returns the latest stored demo project revision', async () => {
    const headers = { 'x-aiw-tenant-id': tenantId, 'x-aiw-user-id': 'reference-solution-architect', 'x-aiw-roles': 'solution-architect' };
    const initial = await app.inject({ method: 'GET', url: '/api/projects/demo', headers });
    expect(initial.statusCode).toBe(200);
    const project = initial.json();
    const expectedRevision = project.revision;
    project.description = `${project.description} Demo freshness verification.`;
    project.revision += 1;
    const saved = await app.inject({
      method: 'PUT',
      url: `/api/projects/${project.id}/branches/${project.branch.id}`,
      headers: { ...headers, 'idempotency-key': `demo-freshness-${project.revision}` },
      payload: { project, expectedRevision },
    });
    expect(saved.statusCode).toBe(200);
    const refreshed = await app.inject({ method: 'GET', url: '/api/projects/demo', headers });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json().revision).toBe(project.revision);
    expect(refreshed.json().description).toContain('Demo freshness verification.');
  });

});
