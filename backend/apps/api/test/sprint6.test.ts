import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AIW_RELEASE, sampleProject } from '@aiw/domain';
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

describe('Sprint 6 API', () => {
  it('reports current platform health', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200); expect(response.json().version).toBe(AIW_RELEASE.version);
  });

  it('runs a cloud collector', async () => {
    const collector = { ...sampleProject.inventoryCollectors[0]!, provider: 'aws' };
    const response = await app.inject({ method: 'POST', url: '/api/collectors/run', headers: auth, payload: { project: sampleProject, collector, raw: { resources: [{ id: 'arn:db', name: 'Managed PostgreSQL', type: 'rds', monthlyCost: 800 }] } } });
    expect(response.statusCode).toBe(200); expect(response.json().run.status).toBe('completed');
  });

  it('derives telemetry topology', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/topology/from-telemetry', headers: auth, payload: { project: sampleProject, name: 'Observed topology', spans: [{ traceId: 't1', spanId: 's1', serviceName: 'Order API', peerService: 'Payment Worker', operation: 'pay', status: 'ok', durationMs: 50, observedAt: new Date().toISOString(), attributes: {} }] } });
    expect(response.statusCode).toBe(200); expect(response.json().relationships).toHaveLength(1);
  });

  it('analyses operational drift and creates remediation plans', async () => {
    const project = structuredClone(sampleProject); const node = project.nodes.find((item) => item.id === 'physical-postgres')!; node.tags.push('critical'); node.properties.expectedMonthlyCost=500; node.properties.replicas=2; node.properties.availabilityZones=2;
    const inventory = { id:'inv',tenantId:project.tenantId,projectId:project.id,branchId:project.branch.id,name:'runtime',sourceType:'aws',capturedAt:new Date().toISOString(),rawFingerprint:'x',relationships:[],resources:[{id:'db',sourceType:'aws',externalId:'db',resourceType:'rds',name:'Managed PostgreSQL',properties:{monthlyCost:900,replicas:1,availabilityZones:1},labels:{'aiw.node-id':'physical-postgres'},discoveredAt:new Date().toISOString()}] };
    const drift = await app.inject({ method:'POST',url:'/api/operational-drift/analyse',headers:auth,payload:{project,inventory} });
    expect(drift.statusCode).toBe(200); expect(drift.json().findings).toHaveLength(3);
    const plan = await app.inject({ method:'POST',url:'/api/remediation-plans',headers:auth,payload:{project,report:drift.json(),createdBy:'user-owner'} });
    expect(plan.statusCode).toBe(200); expect(plan.json().actions).toHaveLength(3);
  });

  it('evaluates an SLO and creates a repository PR preview', async () => {
    const slo = await app.inject({ method:'POST',url:'/api/slos/evaluate',headers:auth,payload:{slo:sampleProject.serviceLevelObjectives[0],observedValue:99.7,alertPolicies:sampleProject.alertPolicies} });
    expect(slo.statusCode).toBe(200); expect(slo.json().evaluation.status).toBe('critical');
    const pr = await app.inject({ method:'POST',url:'/api/repositories/pull-request-preview',headers:auth,payload:{project:sampleProject,bindingId:sampleProject.repositoryBindings[0]!.id} });
    expect(pr.statusCode).toBe(200); expect(pr.json().status).toBe('preview'); expect(pr.json().files.length).toBeGreaterThan(10);
  });
});
