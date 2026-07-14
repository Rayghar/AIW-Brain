import type {
  ArchitectureEdge,
  ArchitectureNode,
  ArchitectureView,
  ArchitectureViewComment,
  ArchitectureViewKind,
  ArchitectureViewLayer,
  ArchitectureViewVersion,
  ArchitectureNodeViewState,
  Point,
} from '@aiw/domain';

export function createDefaultArchitectureView(input: { projectId: string; branchId: string; name?: string; createdBy?: string }): ArchitectureView {
  const now = new Date().toISOString();
  return {
    id: `view-${input.projectId}-${Date.now()}`,
    projectId: input.projectId,
    branchId: input.branchId,
    name: input.name ?? 'Main architecture view',
    kind: 'model',
    density: 'standard',
    filters: {},
    nodeStates: {},
    edgeStates: {},
    layers: [],
    comments: [],
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy ?? 'system',
    version: 1,
  };
}

export function createNamedArchitectureView(input: { projectId: string; branchId: string; name: string; kind?: ArchitectureViewKind; intent?: string; createdBy?: string; base?: ArchitectureView }): ArchitectureView {
  const now = new Date().toISOString();
  const base = input.base;
  return {
    id: `view-${input.projectId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId: input.projectId,
    branchId: input.branchId,
    name: input.name,
    kind: input.kind ?? base?.kind ?? 'model',
    density: base?.density ?? 'standard',
    ...(input.intent ? { intent: input.intent } : {}),
    filters: structuredClone(base?.filters ?? {}),
    nodeStates: structuredClone(base?.nodeStates ?? {}),
    edgeStates: structuredClone(base?.edgeStates ?? {}),
    layers: structuredClone(base?.layers ?? []),
    comments: structuredClone(base?.comments ?? []),
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy ?? 'system',
    version: 1,
  };
}

export function createArchitectureViewVersion(view: ArchitectureView, label: string, createdBy = 'system'): ArchitectureViewVersion {
  return {
    id: `view-version-${view.id}-${view.version + 1}`,
    viewId: view.id,
    version: view.version + 1,
    label,
    createdAt: new Date().toISOString(),
    createdBy,
    snapshot: structuredClone({ ...view, version: view.version + 1, updatedAt: new Date().toISOString() }),
  };
}

export function projectNodeIntoView(node: ArchitectureNode, viewId = 'main'): ArchitectureNodeViewState {
  return { nodeId: node.id, position: node.positions[viewId] ?? node.positions.default, width: 220, height: 120, collapsed: false, locked: false };
}

export function moveViewNode(state: ArchitectureNodeViewState, position: Point): ArchitectureNodeViewState { return { ...state, position }; }
export function resizeViewNode(state: ArchitectureNodeViewState, width: number, height: number): ArchitectureNodeViewState { return { ...state, width: Math.max(120, Math.round(width)), height: Math.max(64, Math.round(height)) }; }

export function deriveArchitectureLayers(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): ArchitectureViewLayer[] {
  const stages = [...new Set(nodes.map((node) => node.stage))];
  const stageLayers: ArchitectureViewLayer[] = stages.map((stage, index) => ({
    id: `layer-stage-${stage}`,
    name: stage.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
    kind: 'stage',
    visible: true,
    locked: false,
    nodeIds: nodes.filter((node) => node.stage === stage).map((node) => node.id),
    edgeIds: edges.filter((edge) => {
      const source = nodes.find((node) => node.id === edge.sourceId);
      const target = nodes.find((node) => node.id === edge.targetId);
      return source?.stage === stage || target?.stage === stage;
    }).map((edge) => edge.id),
    order: index,
  }));
  return [
    ...stageLayers,
    { id: 'layer-relationships', name: 'Relationships', kind: 'relationship', visible: true, locked: false, nodeIds: [], edgeIds: edges.map((edge) => edge.id), order: stageLayers.length },
    { id: 'layer-annotations', name: 'Comments and annotations', kind: 'annotation', visible: true, locked: false, nodeIds: [], edgeIds: [], order: stageLayers.length + 1 },
  ];
}

export function toggleLayerVisibility(view: ArchitectureView, layerId: string): ArchitectureView {
  const layers = (view.layers ?? []).map((layer) => layer.id === layerId ? { ...layer, visible: !layer.visible } : layer);
  return { ...view, layers, updatedAt: new Date().toISOString(), version: view.version + 1 };
}

export function addViewComment(view: ArchitectureView, comment: Omit<ArchitectureViewComment, 'id' | 'createdAt' | 'status'>): ArchitectureView {
  const comments = [...(view.comments ?? []), { ...comment, id: `comment-${Date.now()}`, createdAt: new Date().toISOString(), status: 'open' as const }];
  return { ...view, comments, updatedAt: new Date().toISOString(), version: view.version + 1 };
}

export function resolveViewVisibleNodeIds(view: ArchitectureView, nodes: ArchitectureNode[]): Set<string> {
  const hiddenLayerNodeIds = new Set((view.layers ?? []).filter((layer) => !layer.visible).flatMap((layer) => layer.nodeIds));
  const visibleLayerIds = new Set(view.filters.visibleLayerIds ?? []);
  const allowedByVisibleLayers = visibleLayerIds.size
    ? new Set((view.layers ?? []).filter((layer) => visibleLayerIds.has(layer.id)).flatMap((layer) => layer.nodeIds))
    : null;
  const stages = view.filters.stages?.length ? new Set(view.filters.stages) : null;
  const includeNodeIds = view.filters.includeNodeIds?.length ? new Set(view.filters.includeNodeIds) : null;
  const excludeNodeIds = new Set(view.filters.excludeNodeIds ?? []);
  const includeTags = new Set((view.filters.includeTags ?? []).map((tag) => tag.toLowerCase()));
  const excludeTags = new Set((view.filters.excludeTags ?? []).map((tag) => tag.toLowerCase()));
  return new Set(nodes.filter((node) => {
    if (hiddenLayerNodeIds.has(node.id) || excludeNodeIds.has(node.id)) return false;
    if (allowedByVisibleLayers && !allowedByVisibleLayers.has(node.id)) return false;
    if (stages && !stages.has(node.stage)) return false;
    if (includeNodeIds && !includeNodeIds.has(node.id)) return false;
    const normalizedTags = node.tags.map((tag) => tag.toLowerCase());
    if (excludeTags.size && normalizedTags.some((tag) => excludeTags.has(tag))) return false;
    if (includeTags.size && !normalizedTags.some((tag) => includeTags.has(tag)) && !includeNodeIds) return false;
    return true;
  }).map((node) => node.id));
}

export function resolveViewVisibleEdgeIds(view: ArchitectureView, edges: ArchitectureEdge[]): Set<string> {
  const hiddenLayerEdgeIds = new Set((view.layers ?? []).filter((layer) => !layer.visible).flatMap((layer) => layer.edgeIds));
  const visibleLayerIds = new Set(view.filters.visibleLayerIds ?? []);
  const allowedByVisibleLayers = visibleLayerIds.size
    ? new Set((view.layers ?? []).filter((layer) => visibleLayerIds.has(layer.id)).flatMap((layer) => layer.edgeIds))
    : null;
  return new Set(edges.filter((edge) => {
    if (hiddenLayerEdgeIds.has(edge.id)) return false;
    if (allowedByVisibleLayers && !allowedByVisibleLayers.has(edge.id)) return false;
    return true;
  }).map((edge) => edge.id));
}

export function createPresentationExportPayload(view: ArchitectureView, format: 'svg' | 'png' | 'pdf' | 'json'): string {
  return JSON.stringify({ viewId: view.id, viewName: view.name, format, generatedAt: new Date().toISOString(), density: view.density, filters: view.filters, layers: view.layers ?? [], comments: view.comments ?? [] }, null, 2);
}
export * from './canonicalArchitecture.js';

export * from './architectureInteroperability.js';
export * from './advancedLayout.js';
export * from './interactiveDecomposition.js';
