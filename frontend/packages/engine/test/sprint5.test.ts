import { describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import { analyseArchitectureDrift, evaluateArchitecturePolicyGate, importRuntimeInventory } from '../src/index.js';

describe('Sprint 5 runtime inventory and drift control', () => {
  it('imports Kubernetes resources into the canonical runtime inventory', () => {
    const inventory = importRuntimeInventory(sampleProject, 'cluster snapshot', 'kubernetes', {
      apiVersion: 'v1', kind: 'List', items: [
        { apiVersion: 'apps/v1', kind: 'Deployment', metadata: { name: 'order-api', namespace: 'commerce', labels: { 'aiw.node-id': 'deployable-order-api' } }, spec: { replicas: 3, template: { spec: { containers: [{ image: 'registry/order-api:1.0.0' }] } } } },
      ],
    });
    expect(inventory.resources).toHaveLength(1);
    expect(inventory.resources[0]?.externalId).toBe('k8s:commerce:Deployment:order-api');
    expect(inventory.resources[0]?.version).toBe('registry/order-api:1.0.0');
  });

  it('detects missing intended resources, unmanaged resources and property drift', () => {
    const inventory = importRuntimeInventory(sampleProject, 'manual inventory', 'manual', {
      resources: [
        { id: 'actual-order', externalId: 'actual-order', resourceType: 'Deployment', name: 'Order API', labels: { 'aiw.node-id': 'deployable-order-api' }, properties: { runtime: 'Java', replicas: 3 } },
        { id: 'actual-rogue', externalId: 'rogue-debug', resourceType: 'Pod', name: 'Debug Shell', labels: {}, properties: {} },
      ],
      relationships: [],
    });
    const report = analyseArchitectureDrift(sampleProject, inventory);
    expect(report.summary.matched).toBe(1);
    expect(report.summary.missingActual).toBeGreaterThan(0);
    expect(report.summary.unmanagedActual).toBe(1);
    expect(report.findings.some((finding) => finding.kind === 'property-mismatch')).toBe(true);
  });

  it('fails a policy gate when drift or required approvals exceed thresholds', () => {
    const project = structuredClone(sampleProject);
    project.stageApprovals = [];
    const inventory = importRuntimeInventory(project, 'empty', 'manual', { resources: [], relationships: [] });
    const report = analyseArchitectureDrift(project, inventory);
    const gate = project.policyGates[0]!;
    const result = evaluateArchitecturePolicyGate(project, gate, [], report);
    expect(result.passed).toBe(false);
    expect(result.reasons.some((reason) => reason.includes('missing'))).toBe(true);
    expect(result.reasons.some((reason) => reason.includes('approved stage'))).toBe(true);
  });
});
