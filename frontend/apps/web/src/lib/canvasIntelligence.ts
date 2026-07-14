import type { ArchitectureNode, ArchitectureProject, ArchitectureStage, Finding, Point } from '@aiw/domain';

export type CanvasToolMode = 'select' | 'pan' | 'add-component' | 'relationship' | 'lasso' | 'group' | 'boundary' | 'annotation';
export type CanvasDensity = 'executive' | 'standard' | 'detailed' | 'diagnostic';
export type CanvasSemanticStyleMode = 'manual' | 'stage' | 'domain' | 'risk' | 'data' | 'conformance';
export type CanvasLayoutIntent = 'clean' | 'c4' | 'event-flow' | 'security' | 'deployment' | 'portfolio' | 'conformance';

export interface NodeVisualStyle {
  fill?: string;
  border?: string;
  text?: string;
  accent?: string;
  shape?: 'card' | 'rounded' | 'container' | 'capsule' | 'hex';
  icon?: string;
  width?: number;
  height?: number;
  opacity?: number;
  labelDensity?: CanvasDensity;
  badgesVisible?: boolean;
  collapsed?: boolean;
  locked?: boolean;
  zIndex?: number;
  themeRole?: string;
}

export interface LayoutPreviewOperation {
  nodeId: string;
  label: string;
  previous: Point;
  next: Point;
  width?: number;
  height?: number;
  group?: string;
}

export interface CanvasLayoutPreview {
  id: string;
  intent: CanvasLayoutIntent;
  title: string;
  summary: string;
  createdAt: string;
  operations: LayoutPreviewOperation[];
  asNewView: boolean;
}

export const DEFAULT_NODE_WIDTH = 188;
export const DEFAULT_NODE_HEIGHT = 108;

const STYLE_KEY = '__visualStyle';

export function getNodeVisualStyle(node: ArchitectureNode): NodeVisualStyle {
  const raw = node.properties[STYLE_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as NodeVisualStyle;
}

export function setNodeVisualStyle(node: ArchitectureNode, patch: Partial<NodeVisualStyle>): void {
  node.properties[STYLE_KEY] = { ...getNodeVisualStyle(node), ...patch } satisfies NodeVisualStyle;
}

export function resetNodeVisualStyle(node: ArchitectureNode): void {
  delete node.properties[STYLE_KEY];
}

function hashText(text: string): number {
  return [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9973, 17);
}

const stagePalette: Record<ArchitectureStage, { fill: string; border: string; accent: string }> = {
  designIntent: { fill: 'rgba(40, 151, 255, 0.12)', border: 'rgba(96, 191, 255, 0.74)', accent: '#60bfff' },
  logicalApplication: { fill: 'rgba(32, 220, 181, 0.11)', border: 'rgba(45, 230, 191, 0.72)', accent: '#2de6bf' },
  applicationRealization: { fill: 'rgba(174, 142, 255, 0.12)', border: 'rgba(190, 162, 255, 0.72)', accent: '#bea2ff' },
  logicalTechnology: { fill: 'rgba(255, 194, 88, 0.12)', border: 'rgba(255, 205, 113, 0.72)', accent: '#ffcd71' },
  physicalTechnology: { fill: 'rgba(111, 186, 255, 0.12)', border: 'rgba(126, 195, 255, 0.72)', accent: '#7ec3ff' },
  validationRealization: { fill: 'rgba(255, 128, 140, 0.12)', border: 'rgba(255, 141, 152, 0.72)', accent: '#ff8d98' },
};

const dataPalette: Record<string, { fill: string; border: string; accent: string }> = {
  public: { fill: 'rgba(112, 227, 163, 0.10)', border: 'rgba(112, 227, 163, 0.66)', accent: '#70e3a3' },
  internal: { fill: 'rgba(89, 185, 255, 0.10)', border: 'rgba(89, 185, 255, 0.66)', accent: '#59b9ff' },
  confidential: { fill: 'rgba(255, 188, 79, 0.12)', border: 'rgba(255, 188, 79, 0.72)', accent: '#ffbc4f' },
  restricted: { fill: 'rgba(255, 103, 123, 0.13)', border: 'rgba(255, 103, 123, 0.76)', accent: '#ff677b' },
  pci: { fill: 'rgba(255, 103, 123, 0.13)', border: 'rgba(255, 103, 123, 0.76)', accent: '#ff677b' },
};

export function semanticVisualStyleForNode(
  node: ArchitectureNode,
  findings: Finding[],
  mode: CanvasSemanticStyleMode,
): Partial<NodeVisualStyle> {
  if (mode === 'manual') return {};
  if (mode === 'stage') return stagePalette[node.stage] ?? {};
  const hardFinding = findings.some((finding) => finding.severity === 'HARD' && finding.affectedNodeIds.includes(node.id));
  const significantFinding = findings.some((finding) => finding.severity === 'SIGNIFICANT' && finding.affectedNodeIds.includes(node.id));
  if (mode === 'risk') {
    if (hardFinding) return { fill: 'rgba(255, 76, 96, 0.14)', border: 'rgba(255, 76, 96, 0.88)', accent: '#ff4c60', themeRole: 'critical-risk' };
    if (significantFinding) return { fill: 'rgba(255, 182, 72, 0.14)', border: 'rgba(255, 182, 72, 0.82)', accent: '#ffb648', themeRole: 'significant-risk' };
    return { fill: 'rgba(81, 222, 165, 0.11)', border: 'rgba(81, 222, 165, 0.64)', accent: '#51dea5', themeRole: 'healthy' };
  }
  if (mode === 'data') {
    const combined = `${node.properties.dataClassification ?? ''} ${node.properties.classification ?? ''} ${node.tags.join(' ')}`.toLowerCase();
    const key = Object.keys(dataPalette).find((item) => combined.includes(item));
    return key ? dataPalette[key]! : { fill: 'rgba(117, 143, 168, 0.11)', border: 'rgba(117, 143, 168, 0.62)', accent: '#8aa2b6' };
  }
  if (mode === 'conformance') {
    const status = String(node.properties.conformanceStatus ?? node.properties.controlState ?? '').toLowerCase();
    if (/fail|violat|breach/.test(status)) return { fill: 'rgba(255, 76, 96, 0.14)', border: 'rgba(255, 76, 96, 0.88)', accent: '#ff4c60', themeRole: 'conformance-failed' };
    if (/pass|verified/.test(status)) return { fill: 'rgba(81, 222, 165, 0.11)', border: 'rgba(81, 222, 165, 0.64)', accent: '#51dea5', themeRole: 'conformance-passed' };
    return { fill: 'rgba(255, 194, 88, 0.12)', border: 'rgba(255, 194, 88, 0.70)', accent: '#ffc258', themeRole: 'conformance-unverified' };
  }
  const domainSource = String(node.properties.domain ?? node.properties.capability ?? node.kind);
  const hue = hashText(domainSource) % 360;
  return {
    fill: `hsla(${hue}, 70%, 44%, 0.12)`,
    border: `hsla(${hue}, 78%, 62%, 0.72)`,
    accent: `hsl(${hue}, 78%, 64%)`,
    themeRole: `domain-${domainSource.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  };
}

function layerFor(node: ArchitectureNode, intent: CanvasLayoutIntent): number {
  const text = `${node.kind} ${node.label} ${node.tags.join(' ')}`.toLowerCase();
  if (intent === 'event-flow') {
    if (/actor|channel|api|gateway/.test(text)) return 0;
    if (/command|orchestr|service|handler/.test(text)) return 1;
    if (/event|broker|topic|queue|stream/.test(text)) return 2;
    if (/consumer|projector|read|view|notification/.test(text)) return 3;
    if (/data|store|ledger|database/.test(text)) return 4;
    return 2;
  }
  if (intent === 'security') {
    if (/actor|external|partner|client/.test(text)) return 0;
    if (/gateway|api|identity|policy|auth/.test(text)) return 1;
    if (/service|domain|orchestr|module/.test(text)) return 2;
    if (/data|store|secret|vault|ledger/.test(text)) return 3;
    if (/external|third|provider/.test(text)) return 4;
    return 2;
  }
  if (intent === 'deployment') {
    if (/region|environment|zone/.test(text)) return 0;
    if (/cluster|node|runtime|host/.test(text)) return 1;
    if (/service|api|worker|function|container/.test(text)) return 2;
    if (/database|queue|store|broker/.test(text)) return 3;
    return 2;
  }
  if (intent === 'portfolio') {
    if (/business|unit|stakeholder/.test(text)) return 0;
    if (/capability|domain/.test(text)) return 1;
    if (/project|system|application/.test(text)) return 2;
    if (/technology|standard|runtime|data/.test(text)) return 3;
    if (/risk|control|debt/.test(text)) return 4;
    return 2;
  }
  if (intent === 'conformance') {
    if (/intent|logical|domain|service|component/.test(text)) return 0;
    if (/control|test|policy/.test(text)) return 1;
    if (/runtime|resource|deployment|kubernetes|terraform/.test(text)) return 2;
    if (/finding|risk|violation|remediation/.test(text)) return 3;
    return 1;
  }
  if (intent === 'c4') {
    if (/actor|stakeholder|external/.test(text)) return 0;
    if (/system|application|platform/.test(text)) return 1;
    if (/container|service|api|worker|database|broker/.test(text)) return 2;
    if (/component|module|class|function/.test(text)) return 3;
    return 2;
  }
  if (/actor|external|stakeholder/.test(text)) return 0;
  if (/channel|api|gateway|interface/.test(text)) return 1;
  if (/domain|service|component|module|capability/.test(text)) return 2;
  if (/event|broker|queue|topic/.test(text)) return 3;
  if (/data|store|database|ledger/.test(text)) return 4;
  if (/external|provider|third/.test(text)) return 5;
  return 2;
}

export function createIntelligentLayoutPreview(
  project: ArchitectureProject,
  intent: CanvasLayoutIntent,
  stage: ArchitectureStage,
  asNewView = true,
): CanvasLayoutPreview {
  const stageNodes = project.nodes.filter((node) => node.stage === stage);
  const columns = new Map<number, ArchitectureNode[]>();
  for (const node of stageNodes) {
    const layer = layerFor(node, intent);
    columns.set(layer, [...(columns.get(layer) ?? []), node]);
  }
  const orderedLayers = [...columns.keys()].sort((a, b) => a - b);
  const operations: LayoutPreviewOperation[] = [];
  const baseX = 96;
  const baseY = 96;
  const colGap = 260;
  const rowGap = 168;
  for (const [columnIndex, layer] of orderedLayers.entries()) {
    const nodes = [...(columns.get(layer) ?? [])].sort((a, b) => a.label.localeCompare(b.label));
    for (const [rowIndex, node] of nodes.entries()) {
      const style = getNodeVisualStyle(node);
      const width = Math.max(154, Math.min(320, style.width ?? DEFAULT_NODE_WIDTH));
      const height = Math.max(84, Math.min(220, style.height ?? DEFAULT_NODE_HEIGHT));
      operations.push({
        nodeId: node.id,
        label: node.label,
        previous: node.positions[stage] ?? { x: baseX, y: baseY },
        next: { x: baseX + columnIndex * colGap, y: baseY + rowIndex * rowGap },
        width,
        height,
        group: `Layer ${layer}`,
      });
    }
  }
  const titles: Record<CanvasLayoutIntent, string> = {
    clean: 'Clean architecture flow',
    c4: 'C4 communication view',
    'event-flow': 'Event and command flow',
    security: 'Security and trust-boundary review',
    deployment: 'Deployment topology',
    portfolio: 'Portfolio dependency view',
    conformance: 'Intended-versus-actual conformance',
  };
  return {
    id: `layout-${intent}-${Date.now()}`,
    intent,
    title: titles[intent],
    summary: `${operations.length} object(s) will be arranged into ${orderedLayers.length} semantic lane(s). The underlying architecture records are unchanged until you apply the layout.`,
    createdAt: new Date().toISOString(),
    operations,
    asNewView,
  };
}

export function applyLayoutPreviewToProject(project: ArchitectureProject, preview: CanvasLayoutPreview, stage: ArchitectureStage): void {
  const byId = new Map(preview.operations.map((operation) => [operation.nodeId, operation]));
  for (const node of project.nodes) {
    const operation = byId.get(node.id);
    if (!operation) continue;
    node.positions[stage] = operation.next;
    setNodeVisualStyle(node, { ...(operation.width ? { width: operation.width } : {}), ...(operation.height ? { height: operation.height } : {}) });
  }
  const visualViews = Array.isArray(project.context.problemShapes) ? project.context.problemShapes : [];
  const viewToken = `visual-view:${preview.intent}:${new Date().toISOString()}`;
  project.context.problemShapes = [...visualViews.filter((item) => !item.startsWith(`visual-view:${preview.intent}:`)), viewToken];
}
