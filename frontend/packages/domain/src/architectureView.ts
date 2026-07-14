import type { ArchitectureStage, Point } from './types.js';
import type { ArchitectureViewpointKind } from './canonicalArchitecture.js';

export const architectureViewKinds = ['model', 'security', 'deployment', 'conformance', 'portfolio', 'executive', 'diagnostic'] as const;
export type ArchitectureViewKind = (typeof architectureViewKinds)[number];

export const architectureViewDensities = ['executive', 'standard', 'detailed', 'diagnostic'] as const;
export type ArchitectureViewDensity = (typeof architectureViewDensities)[number];

export const architectureLayerKinds = ['stage', 'domain', 'boundary', 'runtime', 'evidence', 'annotation', 'relationship'] as const;
export type ArchitectureLayerKind = (typeof architectureLayerKinds)[number];

export interface ArchitectureViewLayer {
  id: string;
  name: string;
  kind: ArchitectureLayerKind;
  visible: boolean;
  locked: boolean;
  nodeIds: string[];
  edgeIds: string[];
  order: number;
}

export interface ArchitectureViewComment {
  id: string;
  targetType: 'node' | 'edge' | 'view';
  targetId: string;
  author: string;
  message: string;
  createdAt: string;
  status: 'open' | 'resolved';
}

export interface ArchitectureNodeViewState {
  nodeId: string;
  position?: Point | undefined;
  width?: number | undefined;
  height?: number | undefined;
  fillColor?: string | undefined;
  borderColor?: string | undefined;
  textColor?: string | undefined;
  accentColor?: string | undefined;
  shape?: 'rounded-rectangle' | 'rectangle' | 'pill' | 'hexagon' | 'cylinder' | undefined;
  opacity?: number | undefined;
  collapsed?: boolean | undefined;
  locked?: boolean | undefined;
  zIndex?: number | undefined;
  labelDensity?: ArchitectureViewDensity | undefined;
  layerIds?: string[] | undefined;
}

export interface ArchitectureEdgeViewState {
  edgeId: string;
  hidden?: boolean | undefined;
  bundled?: boolean | undefined;
  labelVisible?: boolean | undefined;
  routeHint?: 'straight' | 'smooth' | 'orthogonal' | undefined;
  layerIds?: string[] | undefined;
}

export interface ArchitectureViewFilter {
  stages?: ArchitectureStage[] | undefined;
  includeTags?: string[] | undefined;
  excludeTags?: string[] | undefined;
  includeNodeIds?: string[] | undefined;
  excludeNodeIds?: string[] | undefined;
  showFindings?: boolean | undefined;
  showEvidence?: boolean | undefined;
  showRuntime?: boolean | undefined;
  visibleLayerIds?: string[] | undefined;
}

export interface ArchitectureView {
  id: string;
  projectId: string;
  branchId: string;
  name: string;
  viewpointId?: ArchitectureViewpointKind | undefined;
  kind: ArchitectureViewKind;
  density: ArchitectureViewDensity;
  description?: string | undefined;
  intent?: string | undefined;
  filters: ArchitectureViewFilter;
  nodeStates: Record<string, ArchitectureNodeViewState>;
  edgeStates: Record<string, ArchitectureEdgeViewState>;
  layers?: ArchitectureViewLayer[] | undefined;
  comments?: ArchitectureViewComment[] | undefined;
  presentationMode?: boolean | undefined;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
}

export interface ArchitectureViewVersion {
  id: string;
  viewId: string;
  version: number;
  label: string;
  createdAt: string;
  createdBy: string;
  snapshot: ArchitectureView;
}

export interface ArchitecturePresentationExport {
  id: string;
  viewId: string;
  format: 'svg' | 'png' | 'pdf' | 'json';
  generatedAt: string;
  generatedBy: string;
  artifactRef: string;
  status?: 'generated' | 'queued' | 'failed' | undefined;
}
