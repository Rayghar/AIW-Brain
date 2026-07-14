import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { AIW_RELEASE, sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

let app: FastifyInstance;
beforeEach(async () => { app = await buildApp({ repository: new InMemoryProjectRepository(), logger: false }); });
afterEach(async () => { await app.close(); });

describe('Sprint 5 observability, inventory and policy APIs', () => {
  it('exposes readiness, W3C trace context and Prometheus metrics', async () => {
    const health = await app.inject({ method: 'GET', url: '/health' });
    expect(health.statusCode).toBe(200);
    expect(health.json().version).toBe(AIW_RELEASE.version);
    expect(health.headers.traceparent).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/);
    const ready = await app.inject({ method: 'GET', url: '/ready' });
    expect(ready.json().status).toBe('ready');
    const metrics = await app.inject({ method: 'GET', url: '/metrics' });
    expect(metrics.body).toContain('aiw_http_requests_total');
  });

  it('imports a runtime inventory and analyses architecture drift', async () => {
    const imported = await app.inject({ method: 'POST', url: '/api/runtime-inventories/import', payload: {
      project: sampleProject, name: 'API runtime inventory', sourceType: 'manual', raw: {
        resources: [{ id: 'actual-order', externalId: 'actual-order', resourceType: 'Deployment', name: 'Order API', labels: { 'aiw.node-id': 'deployable-order-api' }, properties: { runtime: 'Node.js' } }], relationships: [],
      },
    } });
    expect(imported.statusCode).toBe(200);
    const inventory = imported.json();
    expect(inventory.resources).toHaveLength(1);
    const drift = await app.inject({ method: 'POST', url: '/api/drift/analyse', payload: { project: sampleProject, inventory } });
    expect(drift.statusCode).toBe(200);
    expect(drift.json().summary.missingActual).toBeGreaterThan(0);
  });

  it('evaluates the configured architecture policy gate', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/policy-gates/evaluate', payload: { project: sampleProject, gate: sampleProject.policyGates[0] } });
    expect(response.statusCode).toBe(200);
    expect(response.json().passed).toBe(false);
    expect(response.json().reasons.length).toBeGreaterThan(0);
  });
  it('previews an architecture-as-code repository synchronization', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/repositories/sync-preview', payload: { project: sampleProject, bindingId: sampleProject.repositoryBindings[0]!.id } });
    expect(response.statusCode).toBe(200);
    expect(response.json().files.some((file: { path: string }) => file.path === 'architecture/manifest.json')).toBe(true);
    expect(response.json().warning).toContain('Preview only');
  });

});
