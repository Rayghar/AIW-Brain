import { describe, expect, it } from 'vitest';
import type { ArchitectureEdge, ArchitectureNode } from '@aiw/domain';
import { computeSmartCanvasLayout } from '../smartCanvasLayout';

const nodes: ArchitectureNode[] = ['a', 'b', 'c', 'd'].map((id, index) => ({
  id,
  kind: 'ApplicationComponent',
  stage: 'logicalApplication',
  label: `Node ${index + 1}`,
  properties: {},
  lineageFrom: [],
  positions: {},
  tags: [],
  status: 'draft',
}));
const edges: ArchitectureEdge[] = [
  { id: 'ab', sourceId: 'a', targetId: 'b', kind: 'dependsOn', stage: 'logicalApplication', properties: {} },
  { id: 'ac', sourceId: 'a', targetId: 'c', kind: 'dependsOn', stage: 'logicalApplication', properties: {} },
  { id: 'cd', sourceId: 'c', targetId: 'd', kind: 'dependsOn', stage: 'logicalApplication', properties: {} },
];

describe('smart canvas layout', () => {
  it.each(['smart', 'tree-horizontal', 'tree-vertical', 'radial', 'grid'] as const)('produces a stable position for every node in %s mode', (mode) => {
    const result = computeSmartCanvasLayout(nodes, edges, { mode, stage: 'logicalApplication' });
    expect(Object.keys(result.positions)).toHaveLength(nodes.length);
    expect(new Set(Object.values(result.positions).map((point) => `${Math.round(point.x)}:${Math.round(point.y)}`)).size).toBe(nodes.length);
  });

  it('uses relationship-aware tree layout for an acyclic connected graph', () => {
    const result = computeSmartCanvasLayout(nodes, edges, { mode: 'smart', stage: 'logicalApplication' });
    expect(result.resolvedMode).toBe('tree-horizontal');
    expect(result.positions.a!.x).toBeLessThan(result.positions.b!.x);
    expect(result.positions.c!.x).toBeLessThan(result.positions.d!.x);
  });

  it('uses radial layout for a cyclic graph', () => {
    const cyclic = [...edges, { id: 'da', sourceId: 'd', targetId: 'a', kind: 'dependsOn', stage: 'logicalApplication', properties: {} } as ArchitectureEdge];
    const result = computeSmartCanvasLayout(nodes, cyclic, { mode: 'smart', stage: 'logicalApplication' });
    expect(result.resolvedMode).toBe('radial');
  });

  it('arranges compound children using the selected layout and smart-sizes their boundary', () => {
    const boundary: ArchitectureNode = {
      id: 'boundary',
      kind: 'System',
      stage: 'logicalApplication',
      label: 'Order platform',
      properties: {},
      lineageFrom: [],
      positions: {},
      tags: [],
      status: 'draft',
    };
    const children = nodes.map((node) => ({ ...node, parentId: boundary.id }));
    const result = computeSmartCanvasLayout([boundary, ...children], edges, {
      mode: 'radial',
      stage: 'logicalApplication',
      nodeWidth: 210,
      nodeHeight: 126,
    });
    const childPoints = children.map((node) => result.positions[node.id]!);
    expect(new Set(childPoints.map((point) => Math.round(point.x))).size).toBeGreaterThan(1);
    expect(new Set(childPoints.map((point) => Math.round(point.y))).size).toBeGreaterThan(1);
    expect(result.dimensions.boundary?.width).toBeGreaterThan(380);
    expect(result.dimensions.boundary?.height).toBeGreaterThan(260);
    expect(childPoints.every((point) => point.x >= 0 && point.y >= 0)).toBe(true);
  });
});
