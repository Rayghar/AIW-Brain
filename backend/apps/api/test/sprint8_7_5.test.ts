import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AIW_RELEASE, sampleEnterpriseCatalog, samplePortfolioProjects } from '@aiw/domain';
import { buildApp } from '../src/app.js';

const auth = { authorization: 'Bearer dev:user-owner:owner:tenant-reference' };

describe('Sprint 8.7.5 pilot evaluation API', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { app = await buildApp({ logger: false }); });
  afterEach(async () => { await app.close(); });

  it('publishes the 8.7.5 release boundary', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/releases/8.7.5', headers: auth });
    expect(response.statusCode).toBe(200);
    expect(response.json().version).toBe(AIW_RELEASE.version);
    expect(response.json().capabilities.referencePilotScenarioSuite).toBe(true);
  });

  it('returns reference pilot scenarios', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/pilot/scenarios', headers: auth });
    expect(response.statusCode).toBe(200);
    expect(response.json().scenarios.length).toBeGreaterThanOrEqual(6);
  });

  it('evaluates the pilot suite and returns a visual readiness model', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/pilot/evaluate', headers: auth, payload: { projects: samplePortfolioProjects, catalog: sampleEnterpriseCatalog } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.version).toBe(AIW_RELEASE.version);
    expect(body.visualModel.nodes.some((node: { kind: string }) => node.kind === 'scenario')).toBe(true);
    expect(body.visualModel.edges.some((edge: { kind: string }) => edge.kind === 'rolls-up-to')).toBe(true);
    expect(body.governance.automaticMutationAllowed).toBe(false);
  });

  it('returns release readiness without claiming production acceptance', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/pilot/release-readiness', headers: auth, payload: { projects: samplePortfolioProjects, catalog: sampleEnterpriseCatalog } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.readiness.version).toBe(AIW_RELEASE.version);
    expect(body.readiness.productionAcceptance.accepted).toBe(false);
    expect(body.readiness.productionAcceptance.requiredEvidence.length).toBeGreaterThan(0);
  });

  it('enforces tenant boundary on pilot catalogs', async () => {
    const otherCatalog = structuredClone(sampleEnterpriseCatalog);
    otherCatalog.tenantId = 'tenant-other';
    const response = await app.inject({ method: 'POST', url: '/api/pilot/evaluate', headers: auth, payload: { catalog: otherCatalog } });
    expect(response.statusCode).toBe(403);
  });
});
