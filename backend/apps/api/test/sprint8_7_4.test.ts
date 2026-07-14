import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { sampleEnterpriseCatalog, samplePortfolioProjects } from '@aiw/domain';

const auth = { authorization: 'Bearer dev:user-owner:owner:tenant-reference' };
const standardChange = {
  id: 'change-mysql-5-prohibit',
  standardId: 'STD-RDBMS-MYSQL-LEGACY',
  changeType: 'prohibit',
  targetStatus: 'prohibited',
  replacementTechnology: 'PostgreSQL',
  effectiveFrom: '2026-10-01',
  rationale: 'Remove unsupported relational database version from the enterprise estate.',
};

describe('Sprint 8.7.4 portfolio intelligence API', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { app = await buildApp({ logger: false }); });
  afterEach(async () => { await app.close(); });

  it('publishes the 8.7.4 release boundary', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/releases/8.7.4', headers: auth });
    expect(response.statusCode).toBe(200);
    expect(response.json().version).toBe('0.10.0-alpha.4');
    expect(response.json().capabilities.standardsBlastRadiusAssessment).toBe(true);
  });

  it('returns a visual portfolio model with canonical project and standard nodes', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/portfolio/visual-model', headers: auth, payload: { projects: samplePortfolioProjects, catalog: sampleEnterpriseCatalog } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.visualModel.nodes.some((node: { kind: string }) => node.kind === 'project')).toBe(true);
    expect(body.visualModel.nodes.some((node: { kind: string }) => node.kind === 'standard')).toBe(true);
    expect(body.visualModel.edges.some((edge: { kind: string }) => edge.kind === 'depends-on')).toBe(true);
  });

  it('analyzes standards impact without applying mutations', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/portfolio/standards-impact', headers: auth, payload: { projects: samplePortfolioProjects, catalog: sampleEnterpriseCatalog, standardChange } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.summary.affectedProjects).toBeGreaterThan(0);
    expect(body.governance.reviewRequired).toBe(true);
    expect(body.governance.automaticMutationAllowed).toBe(false);
    expect(body.migrationWaves.every((wave: { humanApprovalRequired: boolean }) => wave.humanApprovalRequired)).toBe(true);
  });

  it('enforces tenant boundary on supplied portfolio catalog', async () => {
    const otherCatalog = structuredClone(sampleEnterpriseCatalog);
    otherCatalog.tenantId = 'tenant-other';
    const response = await app.inject({ method: 'POST', url: '/api/portfolio/standards-impact', headers: auth, payload: { catalog: otherCatalog, standardChange } });
    expect(response.statusCode).toBe(403);
  });
});
