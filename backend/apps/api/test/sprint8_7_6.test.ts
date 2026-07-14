import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sampleEnterpriseCatalog, samplePortfolioProjects } from '@aiw/domain';
import { requiredV10ProductionEvidence, type ProductionEvidenceRecord } from '@aiw/engine';
import { buildApp } from '../src/app.js';

const auth = { authorization: 'Bearer dev:user-owner:owner:tenant-reference' };

function evidence(kind: ProductionEvidenceRecord['kind']): ProductionEvidenceRecord {
  return {
    id: `evid-${kind}`,
    tenantId: 'tenant-reference',
    environmentId: 'prod-like-1',
    kind,
    label: `Verified ${kind}`,
    status: 'verified',
    source: kind === 'repository-conformance' ? 'ci-run' : kind === 'runtime-telemetry' ? 'runtime-observation' : kind === 'identity-access' ? 'identity-provider' : kind === 'model-routing' ? 'model-router' : kind === 'pilot-signoff' ? 'human-signoff' : kind === 'architecture-board-approval' ? 'architecture-board' : 'enterprise-probe',
    collectedAt: '2026-07-03T19:00:00.000Z',
    projectIds: samplePortfolioProjects.map((project) => project.id),
    evidenceRefs: [`ref-${kind}`],
    summary: `Verified target evidence for ${kind}`,
  };
}

describe('Sprint 8.7.6 production acceptance API', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { app = await buildApp({ logger: false }); });
  afterEach(async () => { await app.close(); });

  it('publishes the 8.7.6 / v0.10.0 acceptance package boundary', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/releases/8.7.6', headers: auth });
    expect(response.statusCode).toBe(200);
    expect(response.json().version).toBe('0.10.0-rc.2');
    expect(response.json().targetReleaseId).toBe('AIW-0.10.0');
  });

  it('lists production evidence requirements', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/production-acceptance/requirements', headers: auth });
    expect(response.statusCode).toBe(200);
    expect(response.json().requirements.length).toBe(requiredV10ProductionEvidence().length);
    expect(response.json().architectureBoardApprovalRequired).toBe(true);
  });

  it('holds final declaration when target evidence is missing', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/production-acceptance/assess', headers: auth, payload: { projects: samplePortfolioProjects, catalog: sampleEnterpriseCatalog, environmentId: 'prod-like-1' } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.assessment.productionAccepted).toBe(false);
    expect(body.assessment.finalDeclarationAllowed).toBe(false);
    expect(body.assessment.visualModel.nodes.some((node: { kind: string }) => node.kind === 'blocker')).toBe(true);
  });

  it('allows final declaration when all target evidence is verified', async () => {
    const evidenceRecords = requiredV10ProductionEvidence().map((requirement) => evidence(requirement.kind));
    const response = await app.inject({ method: 'POST', url: '/api/production-acceptance/assess', headers: auth, payload: { projects: samplePortfolioProjects, catalog: sampleEnterpriseCatalog, environmentId: 'prod-like-1', evidenceRecords } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.assessment.productionAccepted).toBe(true);
    expect(body.assessment.finalDeclarationAllowed).toBe(true);
    expect(body.assessment.releaseDecision.recommendation).toBe('declare-final');
  });

  it('enforces tenant boundary on production acceptance evidence', async () => {
    const badEvidence = evidence('enterprise-runtime');
    badEvidence.tenantId = 'tenant-other';
    const response = await app.inject({ method: 'POST', url: '/api/production-acceptance/assess', headers: auth, payload: { projects: samplePortfolioProjects, catalog: sampleEnterpriseCatalog, environmentId: 'prod-like-1', evidenceRecords: [badEvidence] } });
    expect(response.statusCode).toBe(403);
  });
});
