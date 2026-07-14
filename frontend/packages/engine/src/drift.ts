import { createId, type ArchitectureNode, type ArchitecturePolicyGate, type ArchitectureProject, type DriftFinding, type DriftReport, type Finding, type PolicyGateResult, type RuntimeInventory, type RuntimeResource } from '@aiw/domain';

function normalize(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

function architectureExternalId(node: ArchitectureNode): string | undefined {
  const value = node.properties.externalId ?? node.properties.runtimeId ?? node.properties.terraformAddress;
  return typeof value === 'string' ? value : undefined;
}

function matchScore(node: ArchitectureNode, resource: RuntimeResource): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const explicit = resource.labels['aiw.node-id'];
  if (explicit === node.id) { score += 1; reasons.push('Runtime label aiw.node-id matches the intended component ID.'); }
  const externalId = architectureExternalId(node);
  if (externalId && externalId === resource.externalId) { score += 0.95; reasons.push('External resource identifier matches.'); }
  const nodeName = normalize(node.label);
  const resourceName = normalize(resource.name);
  if (nodeName === resourceName) { score += 0.75; reasons.push('Normalized names match exactly.'); }
  else if (nodeName && resourceName && (nodeName.includes(resourceName) || resourceName.includes(nodeName))) { score += 0.45; reasons.push('Normalized names are similar.'); }
  const expectedProvider = typeof node.properties.vendor === 'string' ? node.properties.vendor : typeof node.properties.provider === 'string' ? node.properties.provider : undefined;
  if (expectedProvider && resource.provider && normalize(expectedProvider).includes(normalize(resource.provider).split(' ')[0] ?? '')) { score += 0.15; reasons.push('Provider is compatible.'); }
  return { score: Math.min(1, score), reasons };
}

function driftSeverity(node: ArchitectureNode): 'HARD' | 'SIGNIFICANT' | 'ADVISORY' {
  if (node.tags.includes('critical') || node.tags.includes('security')) return 'HARD';
  if (node.stage === 'physicalTechnology' || node.stage === 'applicationRealization') return 'SIGNIFICANT';
  return 'ADVISORY';
}

function comparableProperties(node: ArchitectureNode, resource: RuntimeResource): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const keys = ['version', 'replicas', 'availabilityZones', 'encryptedAtRest', 'runtime', 'provider'] as const;
  for (const key of keys) {
    const intended = key === 'version' ? node.properties.version : key === 'provider' ? (node.properties.provider ?? node.properties.vendor) : node.properties[key];
    const actual = key === 'version' ? (resource.version ?? resource.properties.version ?? resource.properties.engine_version)
      : key === 'provider' ? resource.provider
        : resource.properties[key];
    if (intended === undefined || actual === undefined || String(intended) === String(actual)) continue;
    findings.push({
      id: createId('drift'), kind: key === 'version' ? 'version-drift' : 'property-mismatch', severity: driftSeverity(node),
      title: key === 'version' ? `Version drift for ${node.label}` : `${key} differs for ${node.label}`,
      message: `Intended ${key} is ${String(intended)}, while runtime inventory reports ${String(actual)}.`, intendedNodeId: node.id,
      actualResourceId: resource.id, propertyPath: `properties.${key}`, intendedValue: intended, actualValue: actual,
      rationale: 'The implemented resource no longer matches the governed architecture baseline.',
      recommendation: 'Confirm the runtime value, update the architecture baseline if intentional, or reconcile the deployed resource.', status: 'open',
    });
  }
  return findings;
}

export function analyseArchitectureDrift(project: ArchitectureProject, inventory: RuntimeInventory): DriftReport {
  const intended = project.nodes.filter((node) => ['applicationRealization','logicalTechnology','physicalTechnology'].includes(node.stage) && node.status !== 'deprecated');
  const resourceById = new Map(inventory.resources.map((resource) => [resource.id, resource]));
  const byIntendedNodeId = new Map<string, RuntimeResource[]>();
  const byExternalId = new Map<string, RuntimeResource[]>();
  const byNormalizedName = new Map<string, RuntimeResource[]>();
  for (const resource of inventory.resources) {
    const intendedNodeId = resource.labels['aiw.node-id'];
    if (intendedNodeId) byIntendedNodeId.set(intendedNodeId, [...(byIntendedNodeId.get(intendedNodeId) ?? []), resource]);
    if (resource.externalId) byExternalId.set(resource.externalId, [...(byExternalId.get(resource.externalId) ?? []), resource]);
    const normalizedName = normalize(resource.name);
    if (normalizedName) byNormalizedName.set(normalizedName, [...(byNormalizedName.get(normalizedName) ?? []), resource]);
  }

  const available = new Set(resourceById.keys());
  const mappings: DriftReport['mappings'] = [];
  const findings: DriftFinding[] = [];

  for (const node of intended) {
    const indexedCandidates = new Map<string, RuntimeResource>();
    for (const resource of byIntendedNodeId.get(node.id) ?? []) indexedCandidates.set(resource.id, resource);
    const externalId = architectureExternalId(node);
    if (externalId) for (const resource of byExternalId.get(externalId) ?? []) indexedCandidates.set(resource.id, resource);
    for (const resource of byNormalizedName.get(normalize(node.label)) ?? []) indexedCandidates.set(resource.id, resource);

    // Exact indexes resolve normal cases in near-linear time. A full fuzzy scan is retained
    // only when no identity, external-ID or exact-name candidate is available.
    const candidateResources = indexedCandidates.size
      ? [...indexedCandidates.values()].filter((resource) => available.has(resource.id))
      : [...available].map((id) => resourceById.get(id)).filter((resource): resource is RuntimeResource => Boolean(resource));
    const candidates = candidateResources.map((resource) => ({ resource, ...matchScore(node, resource) })).sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (!best || best.score < 0.5) {
      findings.push({ id: createId('drift'), kind: 'missing-actual', severity: driftSeverity(node), title: `${node.label} is missing from runtime inventory`, message: 'No sufficiently confident runtime resource match was found.', intendedNodeId: node.id, rationale: 'A governed implementation component should be observable in the runtime inventory.', recommendation: 'Deploy the missing component, add an explicit aiw.node-id label, or document why the component is intentionally absent.', status: 'open' });
      continue;
    }
    available.delete(best.resource.id);
    mappings.push({ intendedNodeId: node.id, actualResourceId: best.resource.id, confidence: best.score, reasons: best.reasons });
    findings.push(...comparableProperties(node, best.resource));
  }

  for (const resource of inventory.resources.filter((item) => available.has(item.id) && item.labels['aiw.ignore'] !== 'true')) {
    findings.push({ id: createId('drift'), kind: 'unmanaged-actual', severity: resource.labels['aiw.critical'] === 'true' ? 'SIGNIFICANT' : 'ADVISORY', title: `${resource.name} is not represented in the architecture`, message: `Runtime resource ${resource.externalId} has no governed architecture mapping.`, actualResourceId: resource.id, rationale: 'Unmanaged resources increase operational, security and cost risk.', recommendation: 'Map the resource to an intended component, add it to the architecture, or explicitly mark it as ignored with governance approval.', status: 'open' });
  }

  const mappingByNode = new Map(mappings.map((mapping) => [mapping.intendedNodeId, mapping.actualResourceId]));
  const actualRelationKeys = new Set(inventory.relationships.map((edge) => `${edge.sourceResourceId}:${edge.targetResourceId}`));
  let topologyMismatches = 0;
  for (const edge of project.edges) {
    const source = mappingByNode.get(edge.sourceId); const target = mappingByNode.get(edge.targetId);
    if (!source || !target) continue;
    if (!actualRelationKeys.has(`${source}:${target}`) && !actualRelationKeys.has(`${target}:${source}`)) {
      topologyMismatches += 1;
      findings.push({ id: createId('drift'), kind: 'topology-mismatch', severity: 'ADVISORY', title: 'Runtime relationship not observed', message: `The intended relationship ${edge.sourceId} → ${edge.targetId} was not found in runtime inventory.`, intendedNodeId: edge.sourceId, rationale: 'Topology drift can indicate an incomplete inventory, broken dependency or undocumented implementation path.', recommendation: 'Validate telemetry or inventory coverage, then reconcile the intended or actual relationship.', status: 'open' });
    }
  }

  return {
    id: createId('drift-report'), inventoryId: inventory.id, projectRevision: project.revision, generatedAt: new Date().toISOString(), mappings,
    summary: {
      matched: mappings.length,
      missingActual: findings.filter((finding) => finding.kind === 'missing-actual').length,
      unmanagedActual: findings.filter((finding) => finding.kind === 'unmanaged-actual').length,
      propertyMismatches: findings.filter((finding) => finding.kind === 'property-mismatch').length,
      topologyMismatches,
      versionDrift: findings.filter((finding) => finding.kind === 'version-drift').length,
    }, findings,
  };
}

export function evaluateArchitecturePolicyGate(project: ArchitectureProject, gate: ArchitecturePolicyGate, architectureFindings: Finding[], driftReport?: DriftReport): PolicyGateResult {
  const hardFindings = architectureFindings.filter((finding) => finding.severity === 'HARD').length;
  const significantFindings = architectureFindings.filter((finding) => finding.severity === 'SIGNIFICANT').length;
  const advisoryFindings = architectureFindings.filter((finding) => finding.severity === 'ADVISORY').length;
  const missingResources = driftReport?.summary.missingActual ?? 0;
  const unmanagedResources = driftReport?.summary.unmanagedActual ?? 0;
  const approvedStages = project.stageApprovals.filter((approval) => approval.status === 'approved').map((approval) => approval.stage);
  const reasons: string[] = [];
  if (hardFindings > gate.hardFindingThreshold) reasons.push(`${hardFindings} hard finding(s) exceed the threshold of ${gate.hardFindingThreshold}.`);
  if (significantFindings > gate.significantFindingThreshold) reasons.push(`${significantFindings} significant finding(s) exceed the threshold of ${gate.significantFindingThreshold}.`);
  if (advisoryFindings > gate.advisoryFindingThreshold) reasons.push(`${advisoryFindings} advisory finding(s) exceed the threshold of ${gate.advisoryFindingThreshold}.`);
  if (missingResources > gate.maxMissingResources) reasons.push(`${missingResources} intended resource(s) are missing; maximum allowed is ${gate.maxMissingResources}.`);
  if (unmanagedResources > gate.maxUnmanagedResources) reasons.push(`${unmanagedResources} unmanaged runtime resource(s) exceed the maximum of ${gate.maxUnmanagedResources}.`);
  const missingApprovals = gate.requiredApprovedStages.filter((stage) => !approvedStages.includes(stage));
  if (missingApprovals.length) reasons.push(`Required approved stage(s) missing: ${missingApprovals.join(', ')}.`);
  return {
    gateId: gate.id, passed: reasons.length === 0, generatedAt: new Date().toISOString(), projectRevision: project.revision,
    inventoryId: driftReport?.inventoryId, reasons,
    metrics: { hardFindings, significantFindings, advisoryFindings, missingResources, unmanagedResources, approvedStages: approvedStages.length },
  };
}
