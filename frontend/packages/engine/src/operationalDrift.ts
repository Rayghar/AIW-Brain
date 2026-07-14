import { createId, type ArchitectureNode, type ArchitectureProject, type DriftWaiver, type OperationalDriftFinding, type OperationalDriftReport, type RuntimeInventory } from '@aiw/domain';

function n(value: unknown): number | undefined { return typeof value === 'number' && Number.isFinite(value) ? value : undefined; }
function nodeMatch(node: ArchitectureNode, inventory: RuntimeInventory) { const key = node.label.toLowerCase().replace(/[^a-z0-9]/g, ''); return inventory.resources.find((r) => r.labels['aiw.node-id'] === node.id) ?? inventory.resources.find((r) => r.name.toLowerCase().replace(/[^a-z0-9]/g, '') === key); }
function activeWaiver(findingId: string, waivers: DriftWaiver[], now = Date.now()): boolean { return waivers.some((w) => w.findingId === findingId && w.status === 'active' && Date.parse(w.expiresAt) > now); }

export function analyseOperationalDrift(project: ArchitectureProject, inventory: RuntimeInventory): OperationalDriftReport {
  const findings: OperationalDriftFinding[] = [];
  for (const node of project.nodes.filter((item) => item.stage === 'physicalTechnology')) {
    const actual = nodeMatch(node, inventory); if (!actual) continue;
    const expectedCost = n(node.properties.expectedMonthlyCost); const actualCost = n(actual.properties.monthlyCost);
    if (expectedCost !== undefined && actualCost !== undefined && actualCost > expectedCost * 1.15) findings.push({ id: createId('op-drift'), category: 'cost', severity: actualCost > expectedCost * 1.5 ? 'SIGNIFICANT' : 'ADVISORY', title: `Cost drift for ${node.label}`, message: `Observed monthly cost ${actualCost} exceeds expected ${expectedCost}.`, intendedNodeId: node.id, actualResourceId: actual.id, expectedValue: expectedCost, actualValue: actualCost, estimatedMonthlyImpact: actualCost - expectedCost, recommendation: 'Review sizing, reservations, lifecycle policies and workload placement.', status: 'open' });
    const expectedReplicas = n(node.properties.replicas); const actualReplicas = n(actual.properties.replicas);
    if (expectedReplicas !== undefined && actualReplicas !== undefined && actualReplicas < expectedReplicas) findings.push({ id: createId('op-drift'), category: 'capacity', severity: 'SIGNIFICANT', title: `Capacity shortfall for ${node.label}`, message: `Observed replicas ${actualReplicas} are below intended ${expectedReplicas}.`, intendedNodeId: node.id, actualResourceId: actual.id, expectedValue: expectedReplicas, actualValue: actualReplicas, recommendation: 'Restore intended replica count or approve a revised capacity decision.', status: 'open' });
    const expectedZones = n(node.properties.availabilityZones); const actualZones = n(actual.properties.availabilityZones);
    if ((node.tags.includes('critical') || expectedZones !== undefined) && (actualZones ?? 1) < (expectedZones ?? 2)) findings.push({ id: createId('op-drift'), category: 'resilience', severity: 'HARD', title: `Resilience drift for ${node.label}`, message: `Observed failure-domain coverage ${(actualZones ?? 1)} is below intended ${(expectedZones ?? 2)}.`, intendedNodeId: node.id, actualResourceId: actual.id, expectedValue: expectedZones ?? 2, actualValue: actualZones ?? 1, recommendation: 'Distribute the runtime across the approved number of failure domains before production approval.', status: 'open' });
  }
  for (const finding of findings) if (activeWaiver(finding.id, project.driftWaivers)) finding.status = 'waived';
  return { id: createId('operational-drift'), inventoryId: inventory.id, generatedAt: new Date().toISOString(), projectRevision: project.revision, summary: { cost: findings.filter((f) => f.category === 'cost').length, capacity: findings.filter((f) => f.category === 'capacity').length, resilience: findings.filter((f) => f.category === 'resilience').length, estimatedMonthlyImpact: findings.reduce((sum, f) => sum + (f.estimatedMonthlyImpact ?? 0), 0) }, findings };
}

export function createDriftWaiver(findingId: string, reason: string, ownerId: string, approvedBy: string, expiresAt: string): DriftWaiver {
  if (Date.parse(expiresAt) <= Date.now()) throw new Error('WAIVER_EXPIRY_MUST_BE_FUTURE');
  return { id: createId('waiver'), findingId, reason, ownerId, approvedBy, createdAt: new Date().toISOString(), expiresAt, status: 'active' };
}
export function expireDriftWaivers(waivers: DriftWaiver[], now = new Date()): DriftWaiver[] { return waivers.map((w) => w.status === 'active' && Date.parse(w.expiresAt) <= now.getTime() ? { ...w, status: 'expired' as const } : w); }
