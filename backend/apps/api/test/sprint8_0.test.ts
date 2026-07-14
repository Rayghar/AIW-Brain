import { afterEach, describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';

let app: Awaited<ReturnType<typeof buildApp>> | undefined;
afterEach(async () => { if (app) await app.close(); app = undefined; });

async function authenticated() {
  app = await buildApp();
  const tokenResponse = await app.inject({ method: 'POST', url: '/api/auth/development-token', payload: { subject: 'user-owner', email: 'owner@example.com', displayName: 'Owner', tenantId: sampleProject.tenantId } });
  return { authorization: `Bearer ${tokenResponse.json().token}` };
}

describe('Sprint 8.0 synthesis API', () => {
  it('exposes the Sprint 8.0 platform release and deterministic scenarios', async () => {
    const headers = await authenticated();
    const release = await app!.inject({ method: 'GET', url: '/api/releases/8.0', headers });
    expect(release.statusCode).toBe(200);
    expect(release.json().releaseId).toBe('AIW-0.9.0');
    expect(release.json().knowledgeReleaseId).toBe('AKR-0.8.9');
    const scenarios = await app!.inject({ method: 'GET', url: '/api/synthesis/scenarios', headers });
    expect(scenarios.statusCode).toBe(200);
    expect(scenarios.json().scenarios.length).toBeGreaterThanOrEqual(8);
  });

  it('creates, persists and retrieves a governed synthesis run', async () => {
    const headers = await authenticated();
    const response = await app!.inject({ method: 'POST', url: '/api/synthesis/runs', headers, payload: { ...{ projectId: sampleProject.id, branchId: sampleProject.branch.id, expectedRevision: sampleProject.revision }, strategyIds: ['balanced','simplicity-first','resilience-first','security-first'], maxAlternatives: 4, requireDiversity: true, useLlmEnrichment: false } });
    expect(response.statusCode).toBe(201);
    const run = response.json();
    expect(run.alternatives.length).toBeGreaterThanOrEqual(2);
    expect(run.mode).toBe('deterministic');
    const retrieved = await app!.inject({ method: 'GET', url: `/api/synthesis/runs/${run.id}`, headers });
    expect(retrieved.statusCode).toBe(200);
    expect(retrieved.json().inputFingerprint).toBe(run.inputFingerprint);
    const comparison = await app!.inject({ method: 'GET', url: `/api/synthesis/runs/${run.id}/comparison`, headers });
    expect(comparison.statusCode).toBe(200);
    expect(comparison.json().paretoAlternativeIds.length).toBeGreaterThan(0);
  });

  it('simulates, packages and previews application of a selected alternative', async () => {
    const headers = await authenticated();
    const creation = await app!.inject({ method: 'POST', url: '/api/synthesis/runs', headers, payload: { ...{ projectId: sampleProject.id, branchId: sampleProject.branch.id, expectedRevision: sampleProject.revision }, strategyIds: ['balanced','resilience-first','cost-first'], useLlmEnrichment: false } });
    const run = creation.json();
    const alternativeId = run.alternatives[0].id;
    const simulation = await app!.inject({ method: 'POST', url: `/api/synthesis/runs/${run.id}/simulate`, headers, payload: { alternativeId, scenarioIds: ['SIM-BASELINE','SIM-REGION-FAILURE','SIM-SECURITY-INCIDENT'] } });
    expect(simulation.statusCode).toBe(200);
    expect(simulation.json().results).toHaveLength(3);
    const artifacts = await app!.inject({ method: 'POST', url: `/api/synthesis/runs/${run.id}/artifacts`, headers, payload: { alternativeId, rationale: 'API integration test.' } });
    expect(artifacts.statusCode).toBe(200);
    expect(artifacts.json().files.some((item: { path: string }) => item.path === 'architecture/calm.json')).toBe(true);
    const preview = await app!.inject({ method: 'POST', url: `/api/synthesis/runs/${run.id}/apply-preview`, headers, payload: { ...{ projectId: sampleProject.id, branchId: sampleProject.branch.id, expectedRevision: sampleProject.revision }, alternativeId, status: 'considering' } });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().project.revision).toBeGreaterThan(sampleProject.revision);
  });

  it('rejects application when the project revision has changed since synthesis', async () => {
    const headers = await authenticated();
    const creation = await app!.inject({ method: 'POST', url: '/api/synthesis/runs', headers, payload: { ...{ projectId: sampleProject.id, branchId: sampleProject.branch.id, expectedRevision: sampleProject.revision }, strategyIds: ['balanced','resilience-first'] } });
    const run = creation.json();
    const changed = structuredClone(sampleProject);
    changed.revision += 1;
    const preview = await app!.inject({ method: 'POST', url: `/api/synthesis/runs/${run.id}/apply-preview`, headers, payload: { projectId: changed.id, branchId: changed.branch.id, expectedRevision: changed.revision, alternativeId: run.alternatives[0].id, status: 'accepted' } });
    expect(preview.statusCode).toBe(409);
    expect(['STALE_ARCHITECTURE_BRAIN_CONTEXT','SYNTHESIS_PROJECT_REVISION_CHANGED']).toContain(preview.json().error);
  });
});
