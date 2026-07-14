import { describe, expect, it } from 'vitest';
import { sampleProject, type ArchitectureAlternative } from '@aiw/domain';
import {
  applyArchitectureAlternative,
  compareArchitectureAlternatives,
  synthesizeArchitectureAlternatives,
} from '../src/index.js';

function run() {
  return synthesizeArchitectureAlternatives({
    project: structuredClone(sampleProject),
    knowledgeReleaseId: 'AKR-0.10.60',
    strategyIds: ['balanced','simplicity-first','resilience-first','scale-first','security-first','cost-first','modernization-first'],
    maxAlternatives: 7,
    requireDiversity: true,
    useLlmEnrichment: false,
  });
}

function patternOverlap(left: ArchitectureAlternative, right: ArchitectureAlternative): number {
  const union = new Set([...left.patternIds, ...right.patternIds]);
  const shared = left.patternIds.filter((id) => right.patternIds.includes(id));
  return union.size ? shared.length / union.size : 1;
}

describe('rc.10.57 Architecture Synthesis, Interfaces and Deployment', () => {
  it('generates materially different, deterministically eligible alternatives', () => {
    const synthesis = run();
    expect(synthesis.alternatives.length).toBeGreaterThanOrEqual(5);
    expect(new Set(synthesis.alternatives.map((item) => item.strategyId)).size).toBe(synthesis.alternatives.length);
    expect(synthesis.alternatives.every((item) => item.eligibility.deterministicRuleVersion === 'aiw-synthesis-eligibility-2.0')).toBe(true);
    expect(synthesis.alternatives.every((item) => item.eligibility.criteria.length >= 5)).toBe(true);
    const pairs = synthesis.alternatives.flatMap((left, index) => synthesis.alternatives.slice(index + 1).map((right) => patternOverlap(left, right)));
    expect(pairs.some((value) => value < 0.5)).toBe(true);
  });

  it('generates the ten required provider-neutral architecture views', () => {
    const synthesis = run();
    for (const alternative of synthesis.alternatives) {
      expect(alternative.blueprint.providerNeutralFirst).toBe(true);
      expect(alternative.blueprint.views).toHaveLength(10);
      expect(new Set(alternative.blueprint.views.map((view) => view.id))).toEqual(new Set([
        'system-context','logical-application','application-realization','interface-event-flow','data-architecture','logical-technology','physical-deployment','security-trust-boundaries','resilience-recovery','cross-stage-traceability',
      ]));
      expect(alternative.blueprint.completeness.requiredViewsPresent).toBe(10);
    }
  });

  it('traces every generated component to requirements and Pattern DNA', () => {
    const alternative = run().alternatives[0]!;
    expect(alternative.blueprint.componentLineage.length).toBe(alternative.projectedProject.nodes.length);
    expect(alternative.blueprint.componentLineage.every((item) => item.requirementRefs.length > 0)).toBe(true);
    expect(alternative.blueprint.componentLineage.every((item) => item.patternIds.length > 0)).toBe(true);
    expect(alternative.blueprint.completeness.componentTraceabilityPercent).toBe(100);
  });

  it('creates complete provider-consumer interface contracts', () => {
    const alternative = run().alternatives.find((item) => item.blueprint.interfaceContracts.length > 0)!;
    expect(alternative).toBeTruthy();
    expect(alternative.blueprint.interfaceContracts.every((item) => item.providerNodeId && item.consumerNodeIds.length && item.protocol && item.schemaRef && item.version)).toBe(true);
    expect(alternative.blueprint.interfaceContracts.every((item) => item.authentication && item.authorization && item.encryption && item.slo)).toBe(true);
    expect(alternative.blueprint.completeness.interfaceContractPercent).toBe(100);
  });

  it('keeps provider products as overlays that cannot override the neutral model', () => {
    const alternative = run().alternatives[0]!;
    expect(alternative.blueprint.providerOverlays).toHaveLength(5);
    expect(alternative.blueprint.providerOverlays.every((overlay) => overlay.status === 'proposal')).toBe(true);
    expect(alternative.blueprint.providerOverlays.every((overlay) => overlay.canonicalModelFingerprint === alternative.blueprint.canonicalModelFingerprint)).toBe(true);
    expect(alternative.blueprint.capabilityProductMappings.every((mapping) => mapping.selectionStatus === 'neutral' && !mapping.selectedProductOptionId)).toBe(true);
  });

  it('traces every physical deployment element to logical capability intent', () => {
    const alternative = run().alternatives.find((item) => item.blueprint.deploymentTopology.length > 0)!;
    expect(alternative.blueprint.deploymentTopology.every((item) => item.logicalCapabilityIds.length > 0)).toBe(true);
    expect(alternative.blueprint.completeness.physicalToLogicalTraceabilityPercent).toBe(100);
  });

  it('models security zones, failure paths, counterfactuals and governed application', () => {
    const synthesis = run();
    const alternative = synthesis.alternatives[0]!;
    expect(alternative.blueprint.trustZones.length).toBeGreaterThan(0);
    expect(alternative.blueprint.failurePaths.length).toBeGreaterThan(0);
    const comparison = compareArchitectureAlternatives(synthesis.alternatives);
    expect(comparison.counterfactuals.length).toBeGreaterThan(0);
    expect(Object.keys(comparison.materialDifferenceMatrix)).toHaveLength(synthesis.alternatives.length);
    const applied = applyArchitectureAlternative(structuredClone(sampleProject), alternative, 'accepted');
    expect((applied.interfaces ?? []).length).toBeGreaterThanOrEqual(alternative.blueprint.interfaceContracts.length);
    expect((applied.architectureViews ?? []).filter((view) => view.createdBy === 'aiw-synthesis')).toHaveLength(10);
    expect(applied.nodes.some((node) => node.properties.synthesisBlueprintId === alternative.blueprint.id)).toBe(true);
  });
});
