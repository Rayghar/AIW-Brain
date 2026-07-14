import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AIW_RELEASE, sampleProject } from '@aiw/domain';
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

describe('Sprint 7.5 intelligent design canvas API', () => {
  it('reports the recentered workbench release', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.json().version).toBe(AIW_RELEASE.version);
  });

  it('serves stage-aware components, patterns and styles', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/design-library?stage=logicalApplication', headers: auth });
    expect(response.statusCode).toBe(200);
    expect(response.json().some((item: { id: string }) => item.id === 'COMP-LOGICAL-SERVICE')).toBe(true);
    expect(response.json().every((item: { applicableStages: string[] }) => item.applicableStages.includes('logicalApplication'))).toBe(true);
  });


  it('serves the complete visual library when no stage filter is supplied', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/design-library', headers: auth });
    expect(response.statusCode).toBe(200);
    expect(response.json().length).toBeGreaterThanOrEqual(150);
    expect(response.json().some((item: { id: string }) => item.id === 'TPL-EVENT-PROCESSING')).toBe(true);
  });

  it('uses the requested stage rather than the sample project stage for contextual ordering', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/design-library?stage=logicalTechnology', headers: auth });
    expect(response.statusCode).toBe(200);
    expect(response.json().some((item: { id: string }) => item.id === 'COMP-MESSAGE-BROKER')).toBe(true);
    expect(response.json().every((item: { applicableStages: string[] }) => item.applicableStages.includes('logicalTechnology'))).toBe(true);
  });

  it('preflights a semantic drag-and-drop placement', async () => {
    const project = { ...structuredClone(sampleProject), activeStage: 'logicalTechnology' as const };
    const response = await app.inject({ method: 'POST', url: '/api/design/drop-preview', headers: auth, payload: { project, recordId: 'COMP-MESSAGE-BROKER', stage: 'logicalTechnology', position: { x: 300, y: 220 } } });
    expect(response.statusCode).toBe(200);
    expect(response.json().record.id).toBe('COMP-MESSAGE-BROKER');
    expect(response.json().nodes[0].kind).toBe('LogicalTechnologyCapability');
  });

  it('returns semantic connection options and transparent control coverage', async () => {
    const connections = await app.inject({ method: 'POST', url: '/api/design/connection-options', headers: auth, payload: { project: sampleProject, sourceId: 'logical-order-service', targetId: 'logical-payment-service' } });
    const compliance = await app.inject({ method: 'POST', url: '/api/design/compliance', headers: auth, payload: { project: sampleProject } });
    expect(connections.statusCode).toBe(200);
    expect(connections.json().some((item: { kind: string }) => item.kind === 'communicatesWith')).toBe(true);
    expect(compliance.statusCode).toBe(200);
    expect(compliance.json()[0]).toHaveProperty('applicableControls');
    expect(compliance.json()[0]).toHaveProperty('evidenceGaps');
  });
});
