import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AIW_RELEASE, sampleEnterpriseCatalog, samplePortfolioProjects, sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';

let app: Awaited<ReturnType<typeof buildApp>>;
let auth: Record<string, string>;

beforeEach(async () => {
  process.env.AIW_ALLOW_DEV_AUTH = 'true';
  app = await buildApp();
  const token = await app.inject({ method: 'POST', url: '/api/auth/development-token', payload: { subject: 'user-owner', email: 'owner@example.com', displayName: 'Owner', tenantId: sampleProject.tenantId } });
  auth = { authorization: `Bearer ${token.json().token}` };
});
afterEach(async () => { await app.close(); });

describe('Sprint 7 portfolio intelligence API', () => {
  it('reports current platform health', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json().version).toBe(AIW_RELEASE.version);
  });

  it('returns the tenant enterprise catalog and portfolio projects', async () => {
    const catalog = await app.inject({ method: 'GET', url: '/api/portfolio/catalog', headers: auth });
    const projects = await app.inject({ method: 'GET', url: '/api/portfolio/projects', headers: auth });
    expect(catalog.statusCode).toBe(200);
    expect(catalog.json().technologyStandards.length).toBeGreaterThan(0);
    expect(projects.statusCode).toBe(200);
    expect(projects.json()).toHaveLength(3);
  });

  it('generates an integrated portfolio analysis and roadmap', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/portfolio/analyze', headers: auth, payload: { projects: samplePortfolioProjects, catalog: sampleEnterpriseCatalog } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.summary.projects).toBe(3);
    expect(body.dependencyGraph.dependencies.length).toBeGreaterThan(0);
    expect(body.standardization.deprecated).toBeGreaterThan(0);
    expect(body.roadmap.length).toBeGreaterThan(0);
  });

  it('evaluates dependencies, costs, compliance and reuse independently', async () => {
    const dependencies = await app.inject({ method: 'POST', url: '/api/portfolio/dependencies', headers: auth, payload: { projects: samplePortfolioProjects } });
    const costs = await app.inject({ method: 'POST', url: '/api/portfolio/costs', headers: auth, payload: { projects: samplePortfolioProjects } });
    const compliance = await app.inject({ method: 'POST', url: '/api/portfolio/compliance', headers: auth, payload: { projects: samplePortfolioProjects, catalog: sampleEnterpriseCatalog } });
    const reuse = await app.inject({ method: 'POST', url: '/api/portfolio/reuse', headers: auth, payload: { projects: samplePortfolioProjects, catalog: sampleEnterpriseCatalog } });
    expect(dependencies.statusCode).toBe(200);
    expect(dependencies.json().centrality.length).toBe(3);
    expect(costs.statusCode).toBe(200);
    expect(costs.json().expectedMonthlyCost).toBeGreaterThan(0);
    expect(compliance.statusCode).toBe(200);
    expect(compliance.json().length).toBeGreaterThan(0);
    expect(reuse.statusCode).toBe(200);
    expect(reuse.json().usages.length).toBeGreaterThan(0);
  });

  it('includes enterprise portfolio artifacts in generated packages', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/artifacts', headers: auth, payload: sampleProject });
    expect(response.statusCode).toBe(200);
    const paths = response.json().files.map((file: { path: string }) => file.path);
    expect(paths).toContain('docs/enterprise-portfolio-intelligence.md');
    expect(paths).toContain('portfolio/enterprise-portfolio-intelligence.json');
    expect(paths).toContain('portfolio/enterprise-architecture-catalog.json');
  });
});
