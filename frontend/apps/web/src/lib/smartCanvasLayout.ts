import type { ArchitectureEdge, ArchitectureNode, ArchitectureStage, Point } from '@aiw/domain';

export type SmartCanvasLayoutMode =
  | 'smart'
  | 'tree-horizontal'
  | 'tree-vertical'
  | 'radial'
  | 'grid';

export interface SmartCanvasLayoutOptions {
  mode: SmartCanvasLayoutMode;
  stage: ArchitectureStage;
  origin?: Point;
  horizontalGap?: number;
  verticalGap?: number;
  nodeWidth?: number;
  nodeHeight?: number;
}

export interface SmartCanvasLayoutResult {
  requestedMode: SmartCanvasLayoutMode;
  resolvedMode: Exclude<SmartCanvasLayoutMode, 'smart'>;
  positions: Record<string, Point>;
  dimensions: Record<string, { width: number; height: number }>;
  explanation: string;
}

const DEFAULT_NODE_WIDTH = 248;
const DEFAULT_NODE_HEIGHT = 148;
const DEFAULT_HORIZONTAL_GAP = 112;
const DEFAULT_VERTICAL_GAP = 84;

function stableNodeSort(a: ArchitectureNode, b: ArchitectureNode) {
  return `${a.kind}:${a.label}:${a.id}`.localeCompare(`${b.kind}:${b.label}:${b.id}`);
}

function stageGraph(nodes: ArchitectureNode[], edges: ArchitectureEdge[], stage: ArchitectureStage) {
  const stageNodes = nodes
    .filter((node) => node.stage === stage && node.status !== 'deprecated')
    .sort(stableNodeSort);
  const ids = new Set(stageNodes.map((node) => node.id));
  const stageEdges = edges.filter(
    (edge) => edge.stage === stage && ids.has(edge.sourceId) && ids.has(edge.targetId) && edge.sourceId !== edge.targetId,
  );
  const roots = stageNodes.filter((node) => !node.parentId || !ids.has(node.parentId));
  const rootIds = new Set(roots.map((node) => node.id));
  const rootEdges = stageEdges.filter((edge) => rootIds.has(edge.sourceId) && rootIds.has(edge.targetId));
  return { stageNodes, stageEdges, roots, rootEdges, ids };
}

function buildAdjacency(nodes: ArchitectureNode[], edges: ArchitectureEdge[]) {
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  const undirected = new Map<string, Set<string>>();
  for (const node of nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
    undirected.set(node.id, new Set());
  }
  for (const edge of edges) {
    if (!outgoing.has(edge.sourceId) || !outgoing.has(edge.targetId)) continue;
    outgoing.get(edge.sourceId)!.push(edge.targetId);
    incoming.get(edge.targetId)!.push(edge.sourceId);
    undirected.get(edge.sourceId)!.add(edge.targetId);
    undirected.get(edge.targetId)!.add(edge.sourceId);
  }
  for (const values of outgoing.values()) values.sort();
  for (const values of incoming.values()) values.sort();
  return { outgoing, incoming, undirected };
}

function chooseSmartMode(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): Exclude<SmartCanvasLayoutMode, 'smart'> {
  if (nodes.length <= 3 || edges.length === 0) return 'grid';
  const { outgoing, incoming, undirected } = buildAdjacency(nodes, edges);
  const indegree = new Map(nodes.map((node) => [node.id, incoming.get(node.id)?.length ?? 0]));
  const queue = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id);
  let visited = 0;
  while (queue.length) {
    const id = queue.shift()!;
    visited += 1;
    for (const target of outgoing.get(id) ?? []) {
      const next = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, next);
      if (next === 0) queue.push(target);
    }
  }
  const acyclic = visited === nodes.length;
  const highestDegree = Math.max(...nodes.map((node) => undirected.get(node.id)?.size ?? 0), 0);
  const density = edges.length / Math.max(1, nodes.length);
  if (!acyclic || highestDegree >= Math.max(4, Math.ceil(nodes.length * 0.35))) return 'radial';
  if (density <= 1.8) return 'tree-horizontal';
  return 'grid';
}

function gridLayout(nodes: ArchitectureNode[], origin: Point, nodeWidth: number, nodeHeight: number, hGap: number, vGap: number) {
  const count = nodes.length;
  const columns = Math.max(1, Math.ceil(Math.sqrt(count * 1.35)));
  const positions: Record<string, Point> = {};
  nodes.forEach((node, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    positions[node.id] = {
      x: origin.x + column * (nodeWidth + hGap),
      y: origin.y + row * (nodeHeight + vGap),
    };
  });
  return positions;
}

function layeredLevels(nodes: ArchitectureNode[], edges: ArchitectureEdge[]) {
  const { outgoing, incoming, undirected } = buildAdjacency(nodes, edges);
  const indegree = new Map(nodes.map((node) => [node.id, incoming.get(node.id)?.length ?? 0]));
  const roots = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id);
  if (!roots.length && nodes.length) {
    roots.push(
      [...nodes]
        .sort((a, b) => (undirected.get(b.id)?.size ?? 0) - (undirected.get(a.id)?.size ?? 0) || stableNodeSort(a, b))[0]!.id,
    );
  }
  const levelById = new Map<string, number>();
  const queue = roots.map((id) => ({ id, level: 0 }));
  while (queue.length) {
    const current = queue.shift()!;
    const previous = levelById.get(current.id);
    if (previous !== undefined && previous >= current.level) continue;
    levelById.set(current.id, current.level);
    for (const target of outgoing.get(current.id) ?? []) queue.push({ id: target, level: current.level + 1 });
  }
  // Cyclic and disconnected nodes are placed by undirected breadth-first traversal, then in a final level.
  for (const node of nodes) {
    if (levelById.has(node.id)) continue;
    const linkedLevels = [...(undirected.get(node.id) ?? [])]
      .map((id) => levelById.get(id))
      .filter((value): value is number => value !== undefined);
    levelById.set(node.id, linkedLevels.length ? Math.min(...linkedLevels) + 1 : Math.max(0, ...levelById.values()) + 1);
  }
  const levels = new Map<number, ArchitectureNode[]>();
  for (const node of nodes) {
    const level = levelById.get(node.id) ?? 0;
    const bucket = levels.get(level) ?? [];
    bucket.push(node);
    levels.set(level, bucket);
  }
  for (const bucket of levels.values()) bucket.sort(stableNodeSort);
  return [...levels.entries()].sort(([a], [b]) => a - b).map(([, bucket]) => bucket);
}

function treeLayout(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
  origin: Point,
  nodeWidth: number,
  nodeHeight: number,
  hGap: number,
  vGap: number,
  vertical: boolean,
) {
  const levels = layeredLevels(nodes, edges);
  const positions: Record<string, Point> = {};
  const maxCount = Math.max(1, ...levels.map((level) => level.length));
  levels.forEach((level, levelIndex) => {
    const primarySpan = vertical ? nodeWidth + hGap : nodeHeight + vGap;
    const offset = ((maxCount - level.length) * primarySpan) / 2;
    level.forEach((node, index) => {
      if (vertical) {
        positions[node.id] = {
          x: origin.x + offset + index * (nodeWidth + hGap),
          y: origin.y + levelIndex * (nodeHeight + vGap + 34),
        };
      } else {
        positions[node.id] = {
          x: origin.x + levelIndex * (nodeWidth + hGap + 52),
          y: origin.y + offset + index * (nodeHeight + vGap),
        };
      }
    });
  });
  return positions;
}

function radialLayout(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
  origin: Point,
  nodeWidth: number,
  nodeHeight: number,
  compact = false,
) {
  const positions: Record<string, Point> = {};
  if (!nodes.length) return positions;
  const { undirected } = buildAdjacency(nodes, edges);
  const centre = [...nodes].sort(
    (a, b) => (undirected.get(b.id)?.size ?? 0) - (undirected.get(a.id)?.size ?? 0) || stableNodeSort(a, b),
  )[0]!;
  const ringById = new Map<string, number>([[centre.id, 0]]);
  const queue = [centre.id];
  while (queue.length) {
    const id = queue.shift()!;
    const ring = ringById.get(id) ?? 0;
    for (const neighbour of undirected.get(id) ?? []) {
      if (ringById.has(neighbour)) continue;
      ringById.set(neighbour, ring + 1);
      queue.push(neighbour);
    }
  }
  const radialOrder = nodes
    .filter((node) => node.id !== centre.id)
    .sort((a, b) => {
      const leftDistance = ringById.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const rightDistance = ringById.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return leftDistance - rightDistance || stableNodeSort(a, b);
    });
  // A strict breadth-first ring produces a misleading vertical stack when a
  // graph is a chain (one object in each depth). Radial views are intended for
  // relationship exploration, so distribute related objects around bounded
  // rings while preserving breadth-first ordering within the orbit.
  const ringCapacity = compact ? 8 : 10;
  const rings = new Map<number, ArchitectureNode[]>();
  radialOrder.forEach((node, index) => {
    const ring = Math.floor(index / ringCapacity) + 1;
    const bucket = rings.get(ring) ?? [];
    bucket.push(node);
    rings.set(ring, bucket);
  });
  const maxRing = Math.max(0, ...rings.keys());
  const radiusStep = compact
    ? Math.max(nodeWidth * 1.08, nodeHeight * 1.72, 224)
    : Math.max(nodeWidth * 1.45, nodeHeight * 2.35, 360);
  // Calculate the centre from the outermost ring so compound children never
  // receive negative relative coordinates inside a parent boundary.
  const centreX = origin.x + radiusStep * Math.max(1, maxRing) + nodeWidth / 2;
  const centreY = origin.y + radiusStep * Math.max(1, maxRing) + nodeHeight / 2;
  positions[centre.id] = { x: centreX - nodeWidth / 2, y: centreY - nodeHeight / 2 };
  for (const [ring, bucket] of [...rings.entries()].sort(([a], [b]) => a - b)) {
    bucket.sort(stableNodeSort);
    const radius = radiusStep * ring;
    bucket.forEach((node, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / bucket.length;
      positions[node.id] = {
        x: centreX + Math.cos(angle) * radius - nodeWidth / 2,
        y: centreY + Math.sin(angle) * radius - nodeHeight / 2,
      };
    });
  }
  return positions;
}

function arrangeChildren(
  allNodes: ArchitectureNode[],
  allEdges: ArchitectureEdge[],
  positions: Record<string, Point>,
  dimensions: Record<string, { width: number; height: number }>,
  nodeWidth: number,
  nodeHeight: number,
  hGap: number,
  vGap: number,
  mode: Exclude<SmartCanvasLayoutMode, 'smart'>,
) {
  const byParent = new Map<string, ArchitectureNode[]>();
  for (const node of allNodes) {
    if (!node.parentId) continue;
    const children = byParent.get(node.parentId) ?? [];
    children.push(node);
    byParent.set(node.parentId, children);
  }
  const depthById = new Map<string, number>();
  const depthOf = (id: string): number => {
    if (depthById.has(id)) return depthById.get(id)!;
    const node = allNodes.find((candidate) => candidate.id === id);
    const depth = node?.parentId ? depthOf(node.parentId) + 1 : 0;
    depthById.set(id, depth);
    return depth;
  };

  // Deepest compound scopes are arranged first. Their resulting dimensions
  // can then be respected when the containing scope is laid out.
  const parentEntries = [...byParent.entries()].sort(([left], [right]) => depthOf(right) - depthOf(left));
  for (const [parentId, children] of parentEntries) {
    children.sort(stableNodeSort);
    const childIds = new Set(children.map((child) => child.id));
    const childEdges = allEdges.filter((edge) => childIds.has(edge.sourceId) && childIds.has(edge.targetId));
    const childNodeWidth = Math.min(nodeWidth, 214);
    const childNodeHeight = Math.min(nodeHeight, 126);
    const childHGap = Math.min(hGap, 58);
    const childVGap = Math.min(vGap, 50);
    // React Flow child coordinates are relative to the parent boundary.
    const childOrigin = { x: 42, y: 82 };
    let childPositions: Record<string, Point>;
    if (mode === 'tree-horizontal') {
      childPositions = treeLayout(children, childEdges, childOrigin, childNodeWidth, childNodeHeight, childHGap, childVGap, false);
    } else if (mode === 'tree-vertical') {
      childPositions = treeLayout(children, childEdges, childOrigin, childNodeWidth, childNodeHeight, childHGap, childVGap, true);
    } else if (mode === 'radial') {
      childPositions = radialLayout(children, childEdges, childOrigin, childNodeWidth, childNodeHeight, true);
    } else {
      childPositions = gridLayout(children, childOrigin, childNodeWidth, childNodeHeight, childHGap, childVGap);
    }
    Object.assign(positions, childPositions);

    const maximumX = Math.max(
      0,
      ...children.map((child) => (positions[child.id]?.x ?? childOrigin.x) + (dimensions[child.id]?.width ?? childNodeWidth)),
    );
    const maximumY = Math.max(
      0,
      ...children.map((child) => (positions[child.id]?.y ?? childOrigin.y) + (dimensions[child.id]?.height ?? childNodeHeight)),
    );
    dimensions[parentId] = {
      width: Math.max(380, Math.min(1180, Math.ceil(maximumX + 52))),
      height: Math.max(260, Math.min(880, Math.ceil(maximumY + 54))),
    };
    // Keep the parent in the result even when it had no prior explicit position.
    if (!positions[parentId]) positions[parentId] = { x: 80, y: 80 };
  }
}

export function computeSmartCanvasLayout(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
  options: SmartCanvasLayoutOptions,
): SmartCanvasLayoutResult {
  const origin = options.origin ?? { x: 96, y: 96 };
  const nodeWidth = options.nodeWidth ?? DEFAULT_NODE_WIDTH;
  const nodeHeight = options.nodeHeight ?? DEFAULT_NODE_HEIGHT;
  const horizontalGap = options.horizontalGap ?? DEFAULT_HORIZONTAL_GAP;
  const verticalGap = options.verticalGap ?? DEFAULT_VERTICAL_GAP;
  const graph = stageGraph(nodes, edges, options.stage);
  const resolvedMode = options.mode === 'smart' ? chooseSmartMode(graph.roots, graph.rootEdges) : options.mode;
  const dimensions: Record<string, { width: number; height: number }> = {};
  let positions: Record<string, Point>;
  if (resolvedMode === 'tree-horizontal') {
    positions = treeLayout(graph.roots, graph.rootEdges, origin, nodeWidth, nodeHeight, horizontalGap, verticalGap, false);
  } else if (resolvedMode === 'tree-vertical') {
    positions = treeLayout(graph.roots, graph.rootEdges, origin, nodeWidth, nodeHeight, horizontalGap, verticalGap, true);
  } else if (resolvedMode === 'radial') {
    positions = radialLayout(graph.roots, graph.rootEdges, origin, nodeWidth, nodeHeight);
  } else {
    positions = gridLayout(graph.roots, origin, nodeWidth, nodeHeight, horizontalGap, verticalGap);
  }
  arrangeChildren(
    graph.stageNodes,
    graph.stageEdges,
    positions,
    dimensions,
    nodeWidth,
    nodeHeight,
    horizontalGap,
    verticalGap,
    resolvedMode,
  );
  const explanations: Record<Exclude<SmartCanvasLayoutMode, 'smart'>, string> = {
    'tree-horizontal': 'Arranged by dependency depth from left to right so upstream responsibilities and downstream realisations are easy to follow.',
    'tree-vertical': 'Arranged by dependency depth from top to bottom for presentation, review and decomposition journeys.',
    radial: 'Placed the most connected object at the centre and distributed related responsibilities in relationship rings.',
    grid: 'Distributed objects on a collision-resistant grid because the current model has limited or highly mixed relationship structure.',
  };
  return {
    requestedMode: options.mode,
    resolvedMode,
    positions,
    dimensions,
    explanation: explanations[resolvedMode],
  };
}
