import { describe, expect, it } from 'vitest';
import { sampleProject, type RuntimeInventory, type TelemetrySpanEvidence } from '@aiw/domain';
import { analyseOperationalDrift, collectorDue, createDriftWaiver, createPullRequestPreview, createRemediationPlan, decideRemediationPlan, deriveTopologyFromTelemetry, evaluateSlo, executeCollector, expireDriftWaivers, submitRemediationPlan, triggeredAlertPolicies } from '../src/index.js';

function project() {
  const value = structuredClone(sampleProject);
  const postgres = value.nodes.find((node) => node.id === 'physical-postgres')!;
  postgres.tags.push('critical');
  postgres.properties.expectedMonthlyCost = 500;
  postgres.properties.replicas = 2;
  postgres.properties.availabilityZones = 2;
  return value;
}

function inventory(): RuntimeInventory {
  return {
    id: 'inventory-operational', tenantId: sampleProject.tenantId, projectId: sampleProject.id, branchId: sampleProject.branch.id,
    name: 'Operational inventory', sourceType: 'aws', capturedAt: new Date().toISOString(), rawFingerprint: 'test', relationships: [],
    resources: [{ id: 'actual-db', sourceType: 'aws', externalId: 'aws:rds:db', resourceType: 'rds', name: 'Managed PostgreSQL', provider: 'aws', region: 'eu-west-1', properties: { monthlyCost: 900, replicas: 1, availabilityZones: 1 }, labels: { 'aiw.node-id': 'physical-postgres' }, discoveredAt: new Date().toISOString() }],
  };
}

describe('Sprint 6 operational intelligence', () => {
  it('runs provider collectors and updates health metadata', () => {
    const p = project(); const collector = { ...p.inventoryCollectors[0]!, provider: 'aws' as const };
    expect(collectorDue(collector)).toBe(true);
    const result = executeCollector(p, collector, { resources: [{ id: 'arn:db', name: 'Managed PostgreSQL', type: 'rds', region: 'eu-west-1', monthlyCost: 800, replicas: 1, availabilityZones: 1, tags: { 'aiw.node-id': 'physical-postgres' } }] });
    expect(result.run.status).toBe('completed');
    expect(result.inventory.sourceType).toBe('aws');
    expect(result.inventory.resources).toHaveLength(1);
    expect(result.collector.status).toBe('healthy');
  });

  it('derives dependency topology and service signals from spans', () => {
    const spans: TelemetrySpanEvidence[] = [
      { traceId: 't1', spanId: 's1', serviceName: 'Order API', peerService: 'Payment Worker', operation: 'pay', status: 'ok', durationMs: 20, observedAt: new Date().toISOString(), attributes: {} },
      { traceId: 't2', spanId: 's2', serviceName: 'Order API', peerService: 'Payment Worker', operation: 'pay', status: 'error', durationMs: 120, observedAt: new Date().toISOString(), attributes: {} },
    ];
    const topology = deriveTopologyFromTelemetry(project(), 'Trace topology', spans);
    expect(topology.resources).toHaveLength(2);
    expect(topology.relationships).toHaveLength(1);
    expect(topology.relationships[0]?.properties.callCount).toBe(2);
  });

  it('detects cost, capacity and resilience drift', () => {
    const report = analyseOperationalDrift(project(), inventory());
    expect(report.summary.cost).toBe(1);
    expect(report.summary.capacity).toBe(1);
    expect(report.summary.resilience).toBe(1);
    expect(report.summary.estimatedMonthlyImpact).toBe(400);
  });

  it('creates time-bound waivers and expires them deterministically', () => {
    const waiver = createDriftWaiver('finding-1', 'Temporary migration exception', 'owner', 'approver', new Date(Date.now() + 60_000).toISOString());
    expect(waiver.status).toBe('active');
    const expired = expireDriftWaivers([waiver], new Date(Date.now() + 120_000));
    expect(expired[0]?.status).toBe('expired');
  });

  it('creates and approves human-controlled remediation plans', () => {
    const report = analyseOperationalDrift(project(), inventory());
    const draft = createRemediationPlan(report, 'architect');
    expect(draft.actions).toHaveLength(3);
    const submitted = submitRemediationPlan(draft);
    const approved = decideRemediationPlan(submitted, true, 'reviewer');
    expect(approved.status).toBe('approved');
    expect(approved.actions.every((action) => action.status === 'approved')).toBe(true);
  });

  it('evaluates SLOs and selects matching alert policies', () => {
    const p = project(); const slo = p.serviceLevelObjectives[0]!;
    const evaluation = evaluateSlo(slo, 99.7);
    expect(evaluation.status).toBe('critical');
    expect(triggeredAlertPolicies(evaluation, p.alertPolicies)).toHaveLength(1);
  });

  it('creates provider-neutral pull-request previews', () => {
    const p = project(); const binding = p.repositoryBindings[0]!;
    const preview = createPullRequestPreview(p, binding, { generatedAt: new Date().toISOString(), projectId: p.id, files: [{ path: 'architecture/manifest.json', mediaType: 'application/json', content: '{}' }] });
    expect(preview.status).toBe('preview');
    expect(preview.files[0]?.contentHash).toMatch(/^fnv1a-/);
  });
});
