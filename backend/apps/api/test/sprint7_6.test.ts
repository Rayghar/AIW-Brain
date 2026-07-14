import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';

let app: Awaited<ReturnType<typeof buildApp>>;
let auth: Record<string,string>;
beforeEach(async () => {
  process.env.AIW_ALLOW_DEV_AUTH = 'true';
  app = await buildApp();
  const token = await app.inject({ method: 'POST', url: '/api/auth/development-token', payload: { subject: 'user-owner', email: 'owner@example.com', displayName: 'Owner', tenantId: sampleProject.tenantId } });
  auth = { authorization: `Bearer ${token.json().token}` };
});
afterEach(async () => { await app.close(); });

describe('Sprint 7.6 evidence-backed design reasoning API', () => {
  it('serves the allowlisted trusted source registry', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/knowledge/sources', headers: auth });
    expect(response.statusCode).toBe(200);
    expect(response.json().sources.length).toBeGreaterThanOrEqual(10);
    expect(response.json().sources.some((source: { id: string }) => source.id === 'SRC-ISO-42010')).toBe(true);
  });

  it('reports design-library evidence integrity', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/knowledge/integrity', headers: auth });
    expect(response.statusCode).toBe(200);
    expect(response.json().summary.totalRecords).toBeGreaterThanOrEqual(150);
    expect(response.json().summary.averageConfidence).toBeGreaterThan(50);
  });

  it('generates adaptive questions and anti-pattern findings', async () => {
    const project = structuredClone(sampleProject);
    project.qualityScenarios = [];
    const interview = await app.inject({ method: 'POST', url: '/api/design/interview', headers: auth, payload: { project, limit: 8 } });
    const antiPatterns = await app.inject({ method: 'POST', url: '/api/design/anti-patterns', headers: auth, payload: { project } });
    expect(interview.statusCode).toBe(200);
    expect(interview.json().questions.length).toBeGreaterThan(0);
    expect(antiPatterns.statusCode).toBe(200);
    expect(Array.isArray(antiPatterns.json().findings)).toBe(true);
  });
});
