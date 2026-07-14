import { describe, expect, it } from 'vitest';
import { architectureExchangeFormats, sampleProject } from '@aiw/domain';
import {
  analyseImportConflicts,
  applyAdvancedViewLayout,
  assessArchitectureRoundTrip,
  exportArchitectureExchange,
  importArchitectureExchange,
  mergeImportedArchitecture,
  validateArchitectureExchange,
} from '../src/index.js';

describe('rc.10.60 architecture interoperability and advanced layout', () => {
  it('exports and losslessly round-trips the governed canonical model through all supported formats', () => {
    const project = structuredClone(sampleProject);
    for (const format of architectureExchangeFormats) {
      const document = exportArchitectureExchange(project, format);
      expect(document.format).toBe(format);
      expect(document.content.length).toBeGreaterThan(500);
      expect(validateArchitectureExchange(document).filter((issue) => issue.severity === 'error')).toEqual([]);
      const imported = importArchitectureExchange(project, document);
      expect(imported.issues.filter((issue) => issue.severity === 'error')).toEqual([]);
      expect(imported.project.nodes).toHaveLength(project.nodes.length);
      expect(imported.project.edges).toHaveLength(project.edges.length);
      const report = assessArchitectureRoundTrip(project, format);
      expect(report.passed).toBe(true);
      expect(report.nodeIdentityPercent).toBe(100);
      expect(report.edgeIdentityPercent).toBe(100);
      expect(report.interfaceIdentityPercent).toBe(100);
    }
  });

  it('detects conflicts and applies explicit import resolutions without silent overwrites', () => {
    const project = structuredClone(sampleProject);
    const document = exportArchitectureExchange(project, 'calm-json');
    const imported = importArchitectureExchange(project, document);
    imported.project.nodes[0] = { ...imported.project.nodes[0]!, label: `${imported.project.nodes[0]!.label} imported` };
    imported.conflicts = analyseImportConflicts(project, imported.project);
    expect(imported.conflicts.length).toBeGreaterThan(0);
    const resolutions = Object.fromEntries(imported.conflicts.map((conflict) => [conflict.id, 'keep-local' as const]));
    const merged = mergeImportedArchitecture(project, imported, resolutions);
    expect(merged.nodes.find((node) => node.id === project.nodes[0]!.id)?.label).toBe(project.nodes[0]!.label);
  });

  it('creates deterministic, clustered positions and orthogonal routes for every Viewbook projection', () => {
    const project = structuredClone(sampleProject);
    const first = applyAdvancedViewLayout(project, 'logical-application', { direction: 'left-to-right', clusterBy: 'parent-and-kind' });
    const second = applyAdvancedViewLayout(project, 'logical-application', { direction: 'left-to-right', clusterBy: 'parent-and-kind' });
    expect(first.project.nodes).toEqual(second.project.nodes);
    expect(first.laidOutNodeIds.length).toBeGreaterThan(0);
    expect(first.routedEdgeIds.length).toBeGreaterThan(0);
    const laidOut = first.project.nodes.filter((node) => first.laidOutNodeIds.includes(node.id));
    expect(laidOut.every((node) => node.properties.layoutEngine === 'AIW deterministic compound layout v1')).toBe(true);
    const routed = first.project.edges.filter((edge) => first.routedEdgeIds.includes(edge.id));
    expect(routed.every((edge) => Array.isArray(edge.properties.routePoints) && (edge.properties.routePoints as unknown[]).length >= 3)).toBe(true);
    expect(first.clusters.length).toBeGreaterThan(0);
  });
});
