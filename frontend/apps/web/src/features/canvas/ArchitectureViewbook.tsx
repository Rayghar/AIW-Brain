import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Box,
  Boxes,
  Braces,
  Waypoints,
  ChevronRight,
  Download,
  Eye,
  Focus,
  GitBranch,
  Home,
  Layers3,
  Maximize2,
  Minimize2,
  Network,
  PanelRightOpen,
  Server,
  Undo2,
  WandSparkles,
  X,
} from 'lucide-react';
import type {
  ArchitectureDecompositionLevel,
  ArchitectureNode,
  ArchitectureProject,
  ArchitectureView,
  ArchitectureViewpointKind,
} from '@aiw/domain';
import {
  applyAdvancedViewLayout,
  architectureBreadcrumb,
  architectureChildren,
  architectureScopesForLevel,
  architectureViewpointDefinitions,
  createArchitectureViewbook,
  inferArchitectureDecompositionLevel,
  nextDecompositionLevel,
  previousDecompositionLevel,
  resolveArchitectureParentId,
  resolveDecompositionVisibleNodeIds,
  resolveViewVisibleEdgeIds,
  resolveViewVisibleNodeIds,
  validateArchitectureDecomposition,
} from '@aiw/modelling';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ArchitectureNodeView, type ArchitectureFlowNode, type ArchitectureNodeData } from './nodes/ArchitectureNodeView';
import { buildArchitectureSvg, downloadBlob } from '../../lib/diagramExport';

const nodeTypes: NodeTypes = { architectureNode: ArchitectureNodeView };
const decompositionLevels: ArchitectureDecompositionLevel[] = ['landscape','system','container','component','code','deployment'];
const levelLabels: Record<ArchitectureDecompositionLevel, string> = {
  landscape: 'Landscape', system: 'System', container: 'Container', component: 'Component', code: 'Code', deployment: 'Deployment',
};
const levelIcons = { landscape: Network, system: Boxes, container: Box, component: Layers3, code: Braces, deployment: Server } as const;

function stageLabel(stage: string) {
  return stage.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

function viewbookPosition(node: ArchitectureNode, index: number, view: ArchitectureView) {
  const explicit = view.nodeStates[node.id]?.position;
  if (explicit) return explicit;
  const viewpointPosition = view.viewpointId ? node.positions[view.viewpointId] : undefined;
  const viewPosition = view.id ? node.positions[view.id] : undefined;
  const stagePosition = viewpointPosition ?? viewPosition ?? node.positions[node.stage] ?? node.positions.default;
  if (stagePosition && view.viewpointId !== 'cross-stage-traceability') return stagePosition;
  if (view.viewpointId === 'cross-stage-traceability') {
    const stages = ['designIntent','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','validationRealization'];
    const column = Math.max(0, stages.indexOf(node.stage));
    return { x: 120 + column * 300, y: 110 + index * 145 };
  }
  return { x: 120 + (index % 4) * 270, y: 100 + Math.floor(index / 4) * 160 };
}

function flowNode(node: ArchitectureNode, index: number, view: ArchitectureView, selected: boolean): ArchitectureFlowNode {
  const data: ArchitectureNodeData = {
    label: node.label,
    kind: node.kind,
    stage: node.stage,
    tags: node.tags,
    properties: node.properties,
    ...(node.description ? { description: node.description } : {}),
    density: view.density === 'executive' ? 'executive' : view.density === 'diagnostic' ? 'diagnostic' : 'standard',
    styleNames: [], patternNames: [], findingCount: 0, recommendationCount: 0, focusDimmed: false,
  };
  return { id: node.id, type: 'architectureNode', position: viewbookPosition(node, index, view), data, selected, draggable: false, connectable: false };
}

export interface ArchitectureViewbookProps { onClose: () => void; }

export function ArchitectureViewbook({ onClose }: ArchitectureViewbookProps) {
  const project = useWorkspaceStore((state) => state.project);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const [viewpointId, setViewpointId] = useState<ArchitectureViewpointKind>('system-context');
  const [decompositionLevel, setDecompositionLevel] = useState<ArchitectureDecompositionLevel>('landscape');
  const [scopeNodeId, setScopeNodeId] = useState<string | null>(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [showRelatedContext, setShowRelatedContext] = useState(false);
  const [automaticLayout, setAutomaticLayout] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const generatedViews = useMemo(() => createArchitectureViewbook(project, 'viewbook'), [project.id, project.branch.id, project.revision, project.nodes, project.edges, project.interfaces]);
  const activeView = generatedViews.find((view) => view.viewpointId === viewpointId) ?? generatedViews[0]!;
  const definition = architectureViewpointDefinitions.find((item) => item.id === activeView.viewpointId)!;
  const decompositionReport = useMemo(() => validateArchitectureDecomposition(project), [project]);
  const selectedNode = selectedNodeId ? project.nodes.find((node) => node.id === selectedNodeId) : undefined;
  const selectedChildren = selectedNode ? architectureChildren(project, selectedNode.id) : [];
  const selectedParentId = selectedNode ? resolveArchitectureParentId(project, selectedNode) : undefined;
  const selectedParent = selectedParentId ? project.nodes.find((node) => node.id === selectedParentId) : undefined;
  const breadcrumbs = architectureBreadcrumb(project, scopeNodeId ?? selectedNodeId);
  const availableScopes = useMemo(() => {
    const scopeLevel: ArchitectureDecompositionLevel = decompositionLevel === 'container'
      ? 'system'
      : decompositionLevel === 'component'
        ? 'container'
        : decompositionLevel === 'code'
          ? 'component'
          : decompositionLevel === 'deployment'
            ? 'system'
            : decompositionLevel;
    return architectureScopesForLevel(project, scopeLevel);
  }, [project, decompositionLevel]);

  const baseVisibleNodeIds = useMemo(() => resolveViewVisibleNodeIds(activeView, project.nodes), [activeView, project.nodes]);
  const decompositionVisibleIds = useMemo(() => resolveDecompositionVisibleNodeIds(project, decompositionLevel, scopeNodeId), [project, decompositionLevel, scopeNodeId]);
  const visibleNodeIds = useMemo(() => {
    const result = new Set([...baseVisibleNodeIds].filter((id) => decompositionVisibleIds.has(id)));
    if (!result.size && decompositionLevel !== 'deployment') decompositionVisibleIds.forEach((id) => result.add(id));
    if (showRelatedContext) {
      for (const edge of project.edges) if (result.has(edge.sourceId) || result.has(edge.targetId)) { result.add(edge.sourceId); result.add(edge.targetId); }
    }
    return result;
  }, [baseVisibleNodeIds, decompositionVisibleIds, project.edges, showRelatedContext, decompositionLevel]);
  const visibleEdgeIds = useMemo(() => resolveViewVisibleEdgeIds(activeView, project.edges), [activeView, project.edges]);
  const projectedProject = useMemo<ArchitectureProject>(() => ({
    ...project,
    nodes: project.nodes.filter((node) => visibleNodeIds.has(node.id)),
    edges: project.edges.filter((edge) => visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId)),
  }), [project, visibleNodeIds]);
  const displayedProject = useMemo(() => automaticLayout
    ? applyAdvancedViewLayout(projectedProject, viewpointId, {
        direction: ['physical-deployment','security-trust-boundaries','resilience-recovery'].includes(viewpointId) ? 'top-to-bottom' : 'left-to-right',
        nodeWidth: 210,
        nodeHeight: 92,
        horizontalGap: 72,
        verticalGap: 58,
        clusterGap: 84,
      }).project
    : projectedProject, [automaticLayout, projectedProject, viewpointId]);
  const visibleNodes = displayedProject.nodes;
  const nodes = useMemo<Node[]>(() => {
    const stageCounters = new Map<string, number>();
    return visibleNodes.map((node, index) => {
      const count = stageCounters.get(node.stage) ?? 0; stageCounters.set(node.stage, count + 1);
      return flowNode(node, activeView.viewpointId === 'cross-stage-traceability' ? count : index, activeView, selectedNodeId === node.id);
    });
  }, [visibleNodes, activeView, selectedNodeId]);
  const edges = useMemo<Edge[]>(() => displayedProject.edges
    .filter((edge) => visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId) && (visibleEdgeIds.has(edge.id) || showRelatedContext))
    .map((edge) => ({ id: edge.id, source: edge.sourceId, target: edge.targetId, label: edge.label ?? edge.kind.replace(/([A-Z])/g, ' $1').trim(), type: edge.properties.routeStyle === 'orthogonal' || edge.properties.routeHint === 'orthogonal' ? 'step' : 'smoothstep', animated: edge.kind === 'publishes' || edge.kind === 'subscribes', className: `semantic-edge semantic-edge--${edge.kind}` })), [displayedProject.edges, visibleNodeIds, visibleEdgeIds, showRelatedContext]);

  const currentIndex = architectureViewpointDefinitions.findIndex((item) => item.id === viewpointId);
  function move(delta: number) { const next = (currentIndex + delta + architectureViewpointDefinitions.length) % architectureViewpointDefinitions.length; setViewpointId(architectureViewpointDefinitions[next]!.id); selectNode(null); }
  function exportView() { const svg = buildArchitectureSvg(`${activeView.name} — ${levelLabels[decompositionLevel]}`, nodes, edges); const slug = `${activeView.name}-${levelLabels[decompositionLevel]}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); downloadBlob(`${slug}.svg`, new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })); }
  function chooseLevel(level: ArchitectureDecompositionLevel) { setDecompositionLevel(level); setScopeNodeId(null); selectNode(null); }
  function drillInto(node: ArchitectureNode) {
    const children = architectureChildren(project, node.id);
    const next = nextDecompositionLevel(inferArchitectureDecompositionLevel(node));
    if (!children.length || !next) return;
    setScopeNodeId(node.id); setDecompositionLevel(next); selectNode(null);
    if (next === 'container') setViewpointId('application-realization');
    if (next === 'component' || next === 'code') setViewpointId('application-realization');
  }
  function goUp() {
    if (scopeNodeId) {
      const scope = project.nodes.find((node) => node.id === scopeNodeId);
      const parentId = scope ? resolveArchitectureParentId(project, scope) : undefined;
      const previous = previousDecompositionLevel(decompositionLevel);
      setScopeNodeId(parentId ?? null); if (previous) setDecompositionLevel(previous); selectNode(null); return;
    }
    const previous = previousDecompositionLevel(decompositionLevel); if (previous) chooseLevel(previous);
  }
  function openInModel(node: ArchitectureNode) { setWorkspaceMode('design'); setActiveStage(node.stage); selectNode(node.id); onClose(); }

  return createPortal(
    <section className={`architecture-viewbook architecture-viewbook--decomposition ${presentationMode ? 'is-presentation' : ''} ${inspectorOpen && selectedNode ? 'has-inspector' : ''}`} aria-label="Architecture Viewbook" data-testid="architecture-viewbook">
      <header className="architecture-viewbook__header">
        <div><span className="eyebrow"><BookOpenCheck size={14}/> Interactive Architecture Viewbook</span><h2>{activeView.name}</h2><p>{activeView.description}</p></div>
        <div className="architecture-viewbook__actions">
          <button type="button" className={automaticLayout ? 'active' : ''} onClick={() => setAutomaticLayout((value) => !value)}><WandSparkles size={15}/> Auto layout</button>
          <button type="button" className={showRelatedContext ? 'active' : ''} onClick={() => setShowRelatedContext((value) => !value)}><Network size={15}/> Related</button>
          <button type="button" onClick={() => setPresentationMode((value) => !value)}>{presentationMode ? <Minimize2 size={15}/> : <Maximize2 size={15}/>} {presentationMode ? 'Exit' : 'Present'}</button>
          <button type="button" onClick={exportView}><Download size={15}/> Export</button>
          <button type="button" onClick={onClose} aria-label="Close Architecture Viewbook"><X size={17}/></button>
        </div>
      </header>

      <nav className="architecture-viewbook__strip" aria-label="Architecture viewpoints">
        {architectureViewpointDefinitions.map((item, index) => { const generated = generatedViews.find((view) => view.viewpointId === item.id)!; const count = generated.filters.includeNodeIds?.length ?? 0; return <button key={item.id} type="button" className={item.id === viewpointId ? 'active' : ''} aria-current={item.id === viewpointId ? 'page' : undefined} onClick={() => { setViewpointId(item.id); selectNode(null); }}><span>{index + 1}</span><strong>{item.shortName}</strong><small>{count}</small></button>; })}
      </nav>

      <section className="decomposition-navigator" aria-label="Architecture decomposition levels" data-testid="decomposition-navigator">
        <div className="decomposition-navigator__levels">
          {decompositionLevels.map((level) => { const Icon = levelIcons[level]; const count = decompositionReport.countsByLevel[level]; return <button type="button" key={level} className={decompositionLevel === level ? 'active' : ''} onClick={() => chooseLevel(level)}><Icon size={14}/><span>{levelLabels[level]}</span><small>{count}</small></button>; })}
        </div>
        <div className="decomposition-navigator__scope">
          <button type="button" onClick={() => { setScopeNodeId(null); selectNode(null); }} title="Return to the root of this level"><Home size={14}/></button>
          <button type="button" onClick={goUp} disabled={!scopeNodeId && decompositionLevel === 'landscape'}><Undo2 size={14}/> Up</button>
          <label><span>Scope</span><select value={scopeNodeId ?? ''} onChange={(event) => { setScopeNodeId(event.target.value || null); selectNode(null); }}><option value="">All {levelLabels[decompositionLevel].toLowerCase()} scopes</option>{availableScopes.map((scope) => <option value={scope.id} key={scope.id}>{scope.label}</option>)}</select></label>
        </div>
      </section>

      <nav className="architecture-viewbook__breadcrumbs" aria-label="Architecture scope breadcrumb">
        <Waypoints size={14}/><button type="button" onClick={() => { setScopeNodeId(null); chooseLevel('landscape'); }}>Landscape</button>
        {breadcrumbs.map((node) => <span key={node.id}><ChevronRight size={12}/><button type="button" onClick={() => { setScopeNodeId(node.id); setDecompositionLevel(inferArchitectureDecompositionLevel(node)); selectNode(node.id); }}>{node.label}</button></span>)}
      </nav>

      <div className="architecture-viewbook__meta">
        <div><Focus size={14}/><span><strong>View intent</strong>{definition.intent}</span></div>
        <div><Layers3 size={14}/><span><strong>Lifecycle scope</strong>{definition.stages.map(stageLabel).join(' · ')}</span></div>
        <div><GitBranch size={14}/><span><strong>Projection</strong>{nodes.length} elements · {edges.length} relationships · {decompositionReport.issues.length} hierarchy findings</span></div>
      </div>

      <div className="architecture-viewbook__body">
        <div className="architecture-viewbook__canvas">
          {nodes.length ? <ReactFlow key={`${viewpointId}-${decompositionLevel}-${scopeNodeId}-${automaticLayout}-${showRelatedContext}`} nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.2, maxZoom: 1.05 }} minZoom={0.2} maxZoom={2.2} nodesDraggable={false} nodesConnectable={false} elementsSelectable onNodeClick={(_, node) => { selectNode(node.id); setInspectorOpen(true); }} onNodeDoubleClick={(_, node) => { const source = project.nodes.find((candidate) => candidate.id === node.id); if (source) drillInto(source); }} onPaneClick={() => selectNode(null)} panOnDrag zoomOnScroll zoomOnPinch><Background gap={28} size={1}/><MiniMap pannable zoomable/><Controls showInteractive={false}/></ReactFlow> : <div className="architecture-viewbook__empty"><Eye size={30}/><strong>No elements satisfy this viewpoint and scope.</strong><p>Choose a broader decomposition level, move up one scope, or enable Related context.</p></div>}
        </div>
        {inspectorOpen && selectedNode ? <aside className="architecture-viewbook__inspector" data-testid="decomposition-inspector">
          <header><div><span>{levelLabels[inferArchitectureDecompositionLevel(selectedNode)]}</span><h3>{selectedNode.label}</h3><p>{selectedNode.description ?? selectedNode.kind}</p></div><button type="button" onClick={() => setInspectorOpen(false)} aria-label="Close view inspector"><X size={15}/></button></header>
          <dl><div><dt>Stage</dt><dd>{stageLabel(selectedNode.stage)}</dd></div><div><dt>Kind</dt><dd>{selectedNode.kind}</dd></div><div><dt>Parent</dt><dd>{selectedParent?.label ?? 'Not assigned'}</dd></div><div><dt>Children</dt><dd>{selectedChildren.length}</dd></div><div><dt>Lineage</dt><dd>{selectedNode.lineageFrom.length}</dd></div></dl>
          <div className="architecture-viewbook__inspector-actions">
            <button type="button" onClick={() => drillInto(selectedNode)} disabled={!selectedChildren.length || !nextDecompositionLevel(inferArchitectureDecompositionLevel(selectedNode))}><ChevronRight size={14}/> Drill into {selectedChildren.length || ''}</button>
            <button type="button" onClick={() => openInModel(selectedNode)}><PanelRightOpen size={14}/> Open in modelling canvas</button>
            {selectedParent ? <button type="button" onClick={() => { setScopeNodeId(selectedParent.id); setDecompositionLevel(inferArchitectureDecompositionLevel(selectedParent)); selectNode(selectedParent.id); }}><Undo2 size={14}/> Open parent</button> : null}
          </div>
          {selectedChildren.length ? <section><strong>Contained elements</strong>{selectedChildren.slice(0, 8).map((child) => <button type="button" key={child.id} onClick={() => selectNode(child.id)}>{child.label}<small>{levelLabels[inferArchitectureDecompositionLevel(child)]}</small></button>)}</section> : null}
          <section><strong>Implementation</strong><p>{String(selectedNode.properties.sourceRepository ?? 'No repository linked')}</p><code>{String(selectedNode.properties.implementationPath ?? 'No implementation path')}</code></section>
        </aside> : null}
      </div>

      <footer className="architecture-viewbook__footer"><button type="button" onClick={() => move(-1)}><ArrowLeft size={15}/> Previous view</button><span>{currentIndex + 1} of {architectureViewpointDefinitions.length} · {levelLabels[decompositionLevel]} · {project.name} · revision {project.revision}</span><button type="button" onClick={() => move(1)}>Next view <ArrowRight size={15}/></button></footer>
    </section>, document.body,
  );
}
