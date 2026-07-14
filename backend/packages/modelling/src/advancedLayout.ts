import type { ArchitectureEdge, ArchitectureNode, ArchitectureProject, ArchitectureViewpointKind, Point } from '@aiw/domain';
import { architectureViewpointDefinitions, materializeArchitectureViewpoint } from './canonicalArchitecture.js';

export interface AdvancedLayoutOptions {
  direction?: 'left-to-right' | 'top-to-bottom';
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalGap?: number;
  verticalGap?: number;
  clusterGap?: number;
  preserveManualPositions?: boolean;
}

export interface AdvancedLayoutResult {
  project: ArchitectureProject;
  viewId: ArchitectureViewpointKind;
  laidOutNodeIds: string[];
  routedEdgeIds: string[];
  clusters: Array<{ id: string; label: string; nodeIds: string[]; bounds: { x: number; y: number; width: number; height: number } }>;
  warnings: string[];
}

const defaults: Required<AdvancedLayoutOptions> = { direction: 'left-to-right', nodeWidth: 220, nodeHeight: 96, horizontalGap: 120, verticalGap: 74, clusterGap: 160, preserveManualPositions: false };

function overlap(a: {x:number;y:number;width:number;height:number}, b: {x:number;y:number;width:number;height:number}): boolean {
  return !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y);
}

function topologicalRanks(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): Map<string,number> {
  const ids = new Set(nodes.map((node) => node.id)); const incoming = new Map(nodes.map((node) => [node.id,0])); const outgoing = new Map(nodes.map((node) => [node.id,[] as string[]]));
  for (const edge of edges) if (ids.has(edge.sourceId) && ids.has(edge.targetId) && edge.sourceId !== edge.targetId) { incoming.set(edge.targetId,(incoming.get(edge.targetId) ?? 0) + 1); outgoing.get(edge.sourceId)?.push(edge.targetId); }
  const queue = [...nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0).map((node) => node.id)].sort(); const ranks = new Map<string,number>();
  while (queue.length) { const id = queue.shift()!; const rank = ranks.get(id) ?? 0; for (const target of outgoing.get(id) ?? []) { ranks.set(target, Math.max(ranks.get(target) ?? 0, rank + 1)); incoming.set(target,(incoming.get(target) ?? 1) - 1); if (incoming.get(target) === 0) queue.push(target); } queue.sort(); }
  for (const node of nodes) if (!ranks.has(node.id)) ranks.set(node.id, 0);
  return ranks;
}

function routeOrthogonal(source: {x:number;y:number;width:number;height:number}, target: {x:number;y:number;width:number;height:number}, obstacles: Array<{x:number;y:number;width:number;height:number}>): Point[] {
  const start = { x: source.x + source.width, y: source.y + source.height / 2 }; const end = { x: target.x, y: target.y + target.height / 2 }; let midX = Math.round((start.x + end.x) / 2);
  const vertical = { x: midX - 4, y: Math.min(start.y,end.y), width: 8, height: Math.max(8,Math.abs(start.y-end.y)) };
  if (obstacles.some((box) => overlap(vertical,box))) midX += 52;
  return [start,{x:midX,y:start.y},{x:midX,y:end.y},end];
}

export function applyAdvancedViewLayout(project: ArchitectureProject, viewId: ArchitectureViewpointKind, options: AdvancedLayoutOptions = {}): AdvancedLayoutResult {
  const settings = { ...defaults, ...options }; const definition = architectureViewpointDefinitions.find((item) => item.id === viewId); if (!definition) throw new Error(`Unknown architecture viewpoint: ${viewId}`);
  const view = materializeArchitectureViewpoint(project, definition); const visibleIds = new Set(view.filters.includeNodeIds ?? []); const nodes = project.nodes.filter((node) => visibleIds.has(node.id)); const edges = project.edges.filter((edge) => visibleIds.has(edge.sourceId) && visibleIds.has(edge.targetId) && (view.layers ?? []).some((layer) => layer.edgeIds.includes(edge.id)));
  const ranks = topologicalRanks(nodes,edges); const clustersMap = new Map<string,ArchitectureNode[]>();
  for (const node of nodes) { const key = node.parentId ?? String(node.properties.networkZone ?? node.properties.domain ?? node.stage); clustersMap.set(key,[...(clustersMap.get(key) ?? []),node]); }
  const clusterKeys = [...clustersMap.keys()].sort(); const positions = new Map<string,Point>(); const boxes = new Map<string,{x:number;y:number;width:number;height:number}>(); const clusters: AdvancedLayoutResult['clusters'] = [];
  let clusterOffset = 0;
  clusterKeys.forEach((clusterKey,clusterIndex) => {
    const clusterNodes = clustersMap.get(clusterKey)!.sort((a,b) => (ranks.get(a.id) ?? 0) - (ranks.get(b.id) ?? 0) || a.label.localeCompare(b.label)); const byRank = new Map<number,ArchitectureNode[]>();
    for (const node of clusterNodes) { const rank = ranks.get(node.id) ?? 0; byRank.set(rank,[...(byRank.get(rank) ?? []),node]); }
    let maxCross = 0; let maxPrimary = 0;
    for (const [rank,rankNodes] of [...byRank.entries()].sort((a,b) => a[0]-b[0])) {
      rankNodes.forEach((node,index) => {
        const x = settings.direction === 'left-to-right' ? clusterOffset + 80 + rank * (settings.nodeWidth + settings.horizontalGap) : 80 + index * (settings.nodeWidth + settings.horizontalGap);
        const y = settings.direction === 'left-to-right' ? 100 + index * (settings.nodeHeight + settings.verticalGap) : clusterOffset + 100 + rank * (settings.nodeHeight + settings.verticalGap);
        const existing = node.positions?.[view.id]; const point = settings.preserveManualPositions && existing ? existing : {x,y}; positions.set(node.id,point); boxes.set(node.id,{...point,width:settings.nodeWidth,height:settings.nodeHeight}); maxPrimary = Math.max(maxPrimary,settings.direction === 'left-to-right' ? x + settings.nodeWidth : y + settings.nodeHeight); maxCross = Math.max(maxCross,settings.direction === 'left-to-right' ? y + settings.nodeHeight : x + settings.nodeWidth);
      });
    }
    const bounds = settings.direction === 'left-to-right' ? { x: clusterOffset + 32, y: 52, width: Math.max(360,maxPrimary-clusterOffset+48), height: Math.max(220,maxCross+52) } : { x: 32, y: clusterOffset + 52, width: Math.max(360,maxCross+52), height: Math.max(220,maxPrimary-clusterOffset+48) };
    clusters.push({ id: `cluster-${clusterIndex+1}`, label: clusterKey, nodeIds: clusterNodes.map((node) => node.id), bounds }); clusterOffset += (settings.direction === 'left-to-right' ? bounds.width : bounds.height) + settings.clusterGap;
  });
  const allBoxes = [...boxes.values()];
  const updatedNodes = project.nodes.map((node) => { const position = positions.get(node.id); if (!position) return node; return { ...node, positions: { ...node.positions, [view.id]: position }, properties: { ...node.properties, layoutWidth: settings.nodeWidth, layoutHeight: settings.nodeHeight, layoutCluster: clusters.find((cluster) => cluster.nodeIds.includes(node.id))?.id, layoutEngine: 'AIW deterministic compound layout v1' } }; });
  const updatedEdges = project.edges.map((edge) => { const source = boxes.get(edge.sourceId); const target = boxes.get(edge.targetId); if (!source || !target) return edge; return { ...edge, properties: { ...edge.properties, routeStyle: 'orthogonal', routePoints: routeOrthogonal(source,target,allBoxes.filter((box) => box !== source && box !== target)), layoutViewId: view.id } }; });
  return { project: { ...project, nodes: updatedNodes, edges: updatedEdges, revision: project.revision + 1, updatedAt: new Date().toISOString() }, viewId, laidOutNodeIds: [...positions.keys()], routedEdgeIds: edges.map((edge) => edge.id), clusters, warnings: nodes.length > 250 ? ['Large view detected; enable progressive disclosure for interactive editing.'] : [] };
}
