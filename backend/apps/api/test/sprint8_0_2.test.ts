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

describe('Sprint 8.0.2 integrated architecture journey', () => {
  it('exposes the integrated release and active governed knowledge boundary', async () => {
    const headers = await authenticated();
    const release = await app!.inject({ method: 'GET', url: '/api/releases/8.0.2', headers });
    expect(release.statusCode).toBe(200);
    expect(release.json().releaseId).toBe('AIW-0.9.2');
    expect(release.json().capabilities.serverAuthoritativeAutosave).toBe(true);
    expect(release.json().capabilities.fullPatternDnaRetrievalInWorkbench).toBe(true);
    const active = await app!.inject({ method: 'GET', url: '/api/knowledge/releases/active', headers });
    expect(active.statusCode).toBe(200);
    expect(active.json().platform.releaseId).toBe('AIW-0.10.0-rc.6');
    expect(active.json().release.releaseId).toBe('AKR-0.10.60');
  });

  it('creates, lists, loads and revision-protects a governed project', async () => {
    const headers = await authenticated();
    const createdResponse = await app!.inject({ method: 'POST', url: '/api/projects', headers, payload: { name: 'Integrated Payments Architecture', description: 'Design a resilient payment platform.', template: 'blank' } });
    expect(createdResponse.statusCode).toBe(201);
    const project = createdResponse.json();
    expect(project.nodes).toHaveLength(0);
    expect(project.tenantId).toBe(sampleProject.tenantId);

    const list = await app!.inject({ method: 'GET', url: '/api/projects', headers });
    expect(list.statusCode).toBe(200);
    expect(list.json().some((item: { id: string }) => item.id === project.id)).toBe(true);

    project.description = 'Updated governed brief.';
    project.revision = 1;
    const saved = await app!.inject({ method: 'PUT', url: `/api/projects/${project.id}/branches/branch-main`, headers: { ...headers, 'idempotency-key': `save-${project.id}-1` }, payload: { project, expectedRevision: 0 } });
    expect(saved.statusCode).toBe(200);
    expect(saved.json().revision).toBe(1);

    const stale = structuredClone(project);
    stale.revision = 2;
    const conflict = await app!.inject({ method: 'PUT', url: `/api/projects/${project.id}/branches/branch-main`, headers: { ...headers, 'idempotency-key': `save-${project.id}-2` }, payload: { project: stale, expectedRevision: 0 } });
    expect(conflict.statusCode).toBe(409);
  });

  it('structures a plain-language brief while preserving review and measurable-scenario boundaries', async () => {
    const headers = await authenticated();
    const created = await app!.inject({
      method: 'POST',
      url: '/api/projects',
      headers,
      payload: { name: 'Pan-African Payments Brief', description: 'Architecture brief analysis test.', template: 'blank' },
    });
    expect(created.statusCode).toBe(201);
    const project = created.json();
    const response = await app!.inject({
      method: 'POST',
      url: '/api/design-brief/analyse',
      headers,
      payload: {
        projectId: project.id,
        branchId: 'branch-main',
        expectedRevision: project.revision,
        briefText: 'Build a pan-African payment platform. It must preserve accepted transactions during provider outages, keep regulated data in-country, support rapid growth and operate with three product teams.',
        dataClassification: 'internal',
      },
    });
    expect(response.statusCode).toBe(200);
    expect(['llm-assisted','deterministic-fallback']).toContain(response.json().mode);
    expect(response.json().proposal.problemStatement.length).toBeGreaterThan(10);
    expect(Array.isArray(response.json().proposal.clarificationQuestions)).toBe(true);
    for (const scenario of response.json().proposal.qualityScenarios) {
      expect(typeof scenario.responseMeasure).toBe('string');
    }
  });

  it('persists safe tenant model-routing policy without accepting prompt retention', async () => {
    const headers = await authenticated();
    const config = await app!.inject({ method: 'GET', url: '/api/llm-brain/config', headers });
    expect(config.statusCode).toBe(200);
    const policy = config.json().policy;
    const safe = await app!.inject({ method: 'PUT', url: '/api/llm-brain/config', headers, payload: { policy } });
    expect(safe.statusCode).toBe(200);
    expect(safe.json().secretValuesExposed).toBe(false);

    const unsafe = structuredClone(policy);
    unsafe.logPrompts = true;
    const rejected = await app!.inject({ method: 'PUT', url: '/api/llm-brain/config', headers, payload: { policy: unsafe } });
    expect(rejected.statusCode).toBe(409);
    expect(rejected.json().error).toBe('UNSAFE_LLM_RETENTION_POLICY');
  });

  it('uses the full approved Pattern DNA corpus for contextual recommendation evidence', async () => {
    const headers = await authenticated();
    const response = await app!.inject({ method: 'POST', url: '/api/pattern-intelligence/recommend', headers, payload: { query: 'reliable asynchronous payment processing outbox idempotency recovery', project: sampleProject, stage: 'applicationRealization', limit: 12 } });
    expect(response.statusCode).toBe(200);
    expect(response.json().approvedRecordIds.length).toBeGreaterThan(0);
    expect(response.json().recommendations.length).toBeGreaterThan(0);
    expect(response.json().recommendations.every((item: { patternId: string }) => item.patternId.startsWith('PAT-') || item.patternId.startsWith('STYLE-') || item.patternId.length > 3)).toBe(true);
  });

  it('persists a governed project snapshot', async () => {
    const headers = await authenticated();
    const response = await app!.inject({ method: 'POST', url: `/api/projects/${sampleProject.id}/snapshots`, headers, payload: { project: sampleProject, label: 'Integrated journey acceptance', status: 'reviewed', createdBy: 'user-owner' } });
    expect(response.statusCode).toBe(201);
    expect(response.json().contentHash).toBeTruthy();
    const list = await app!.inject({ method: 'GET', url: `/api/projects/${sampleProject.id}/snapshots`, headers });
    expect(list.statusCode).toBe(200);
    expect(list.json().some((item: { label: string }) => item.label === 'Integrated journey acceptance')).toBe(true);
  });
});
