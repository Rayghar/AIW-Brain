import { memo, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  AlertTriangle,
  BadgeCheck,
  BookOpenCheck,
  Boxes,
  CheckCircle2,
  CircleGauge,
  ClipboardList,
  Compass,
  Copy,
  ExternalLink,
  Gauge,
  GitBranch,
  Landmark,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Network,
  RefreshCw,
  Route,
  ScanSearch,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
  Zap,
  Workflow,
} from 'lucide-react';
import type { IntelligenceVisualNodeKind } from '@aiw/engine';
import { useWorkspaceStore } from '../store/workspaceStore';
import { EmbeddedIntelligencePanel } from './EmbeddedIntelligencePanel';

interface IntelligenceNodeData extends Record<string, unknown> {
  label: string;
  summary: string;
  kind: IntelligenceVisualNodeKind;
  objectId?: string;
  stage?: string;
  score?: number;
  severity?: 'SIGNIFICANT' | 'ADVISORY';
  focused: boolean;
}

type IntelligenceFlowNode = Node<IntelligenceNodeData, 'intelligenceVisualNode'>;

function iconFor(kind: IntelligenceVisualNodeKind) {
  if (kind === 'project') return Compass;
  if (kind === 'objective') return Target;
  if (kind === 'constraint') return Scale;
  if (kind === 'stakeholder') return UsersRound;
  if (kind === 'driver') return Gauge;
  if (kind === 'scenario') return ClipboardList;
  if (kind === 'style') return Landmark;
  if (kind === 'pattern') return Workflow;
  if (kind === 'architecture') return Boxes;
  if (kind === 'decision') return GitBranch;
  if (kind === 'approval') return BadgeCheck;
  if (kind === 'finding') return AlertTriangle;
  if (kind === 'obligation') return ShieldCheck;
  return Sparkles;
}

const IntelligenceNodeView = memo(({ data, selected }: NodeProps<IntelligenceFlowNode>) => {
  const Icon = iconFor(data.kind);
  return (
    <div
      className={`journey-intelligence-node journey-intelligence-node--${data.kind} ${data.focused ? 'is-focused' : ''} ${selected ? 'is-selected' : ''} ${data.severity === 'SIGNIFICANT' ? 'is-significant' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="journey-intelligence-handle" />
      <div className="journey-intelligence-node__header">
        <span><Icon size={15} /></span>
        <small>{data.kind.replaceAll('-', ' ')}</small>
        {typeof data.score === 'number' ? <b>{Math.round(data.score)}</b> : null}
      </div>
      <strong>{data.label}</strong>
      <p>{data.summary}</p>
      {data.stage ? <em>{data.stage.replace(/([A-Z])/g, ' $1').trim()}</em> : null}
      <Handle type="source" position={Position.Right} className="journey-intelligence-handle" />
    </div>
  );
});
IntelligenceNodeView.displayName = 'IntelligenceNodeView';

const nodeTypes: NodeTypes = { intelligenceVisualNode: IntelligenceNodeView };

function IntelligenceGraph() {
  const [compact, setCompact] = useState(true);
  const [graphOpen, setGraphOpen] = useState(false);
  const [mapInteractive, setMapInteractive] = useState(false);
  const [focusedOnly, setFocusedOnly] = useState(false);
  const [graphResetVersion, setGraphResetVersion] = useState(0);
  const intelligence = useWorkspaceStore((state) => state.intelligence);
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const visual = intelligence?.visualModel;
  const nodes = useMemo<IntelligenceFlowNode[]>(
    () => (visual?.nodes ?? []).map((node) => ({
      id: node.id,
      type: 'intelligenceVisualNode',
      position: { x: node.x, y: node.y },
      data: {
        label: node.label,
        summary: node.summary,
        kind: node.kind,
        ...(node.objectId ? { objectId: node.objectId } : {}),
        ...(node.stage ? { stage: node.stage } : {}),
        ...(typeof node.score === 'number' ? { score: node.score } : {}),
        ...(node.severity ? { severity: node.severity } : {}),
        focused: visual?.focusNodeIds.includes(node.id) ?? false,
      },
      draggable: false,
      selectable: true,
    })),
    [visual],
  );

  const edges = useMemo<Edge[]>(
    () => (visual?.edges ?? []).map((edge) => ({
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      label: edge.label,
      type: 'smoothstep',
      animated: edge.kind === 'drives' || edge.kind === 'recommends' || edge.kind === 'affects',
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      className: `journey-intelligence-edge journey-intelligence-edge--${edge.kind}`,
      labelStyle: { fontSize: 10, fontWeight: 600 },
    })),
    [visual],
  );

  const displayedNodes = useMemo(() => {
    if (!focusedOnly) return nodes;
    const focused = nodes.filter((node) => node.data.focused || node.data.severity === 'SIGNIFICANT');
    return focused.length ? focused : nodes;
  }, [focusedOnly, nodes]);

  const displayedNodeIds = useMemo(() => new Set(displayedNodes.map((node) => node.id)), [displayedNodes]);

  const displayedEdges = useMemo(
    () => edges.filter((edge) => displayedNodeIds.has(edge.source) && displayedNodeIds.has(edge.target)),
    [displayedNodeIds, edges],
  );

  const mapStatus = mapInteractive ? 'Control enabled' : 'Read-only preview';
  const mapSlug = visual?.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'architecture-map';
  const mapFileName = `${mapSlug}.json`;
  const reactFlow = useReactFlow();

  const downloadBlob = (content: BlobPart, type: string, filename: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportMap = () => {
    if (!visual) return;
    const payload = JSON.stringify({
      title: visual.title,
      description: visual.description,
      objects: nodes.map((node) => node.data),
      relationships: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, label: edge.label })),
      exportedAt: new Date().toISOString(),
    }, null, 2);
    downloadBlob(payload, 'application/json', mapFileName);
  };


  const exportSvgMap = () => {
    if (!visual) return;
    const minX = Math.min(...displayedNodes.map((node) => node.position.x), 0);
    const minY = Math.min(...displayedNodes.map((node) => node.position.y), 0);
    const maxX = Math.max(...displayedNodes.map((node) => node.position.x + 220), 900);
    const maxY = Math.max(...displayedNodes.map((node) => node.position.y + 120), 520);
    const pad = 80;
    const width = Math.max(960, maxX - minX + pad * 2);
    const height = Math.max(560, maxY - minY + pad * 2);
    const point = (id: string) => {
      const node = displayedNodes.find((candidate) => candidate.id === id);
      return node ? { x: node.position.x - minX + pad + 110, y: node.position.y - minY + pad + 48 } : { x: pad, y: pad };
    };
    const escape = (value: string) => value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] ?? char));
    const edgeMarkup = displayedEdges.map((edge) => {
      const source = point(edge.source);
      const target = point(edge.target);
      return `<path d="M ${source.x} ${source.y} C ${(source.x + target.x) / 2} ${source.y}, ${(source.x + target.x) / 2} ${target.y}, ${target.x} ${target.y}" fill="none" stroke="#2dd4bf" stroke-opacity="0.42" stroke-width="2"/>`;
    }).join('');
    const nodeMarkup = displayedNodes.map((node) => {
      const x = node.position.x - minX + pad;
      const y = node.position.y - minY + pad;
      return `<g><rect x="${x}" y="${y}" width="220" height="92" rx="18" fill="#0b2232" stroke="#2dd4bf" stroke-opacity="0.38"/><text x="${x + 18}" y="${y + 32}" fill="#ecfeff" font-size="14" font-family="Inter, Arial" font-weight="700">${escape(node.data.label)}</text><text x="${x + 18}" y="${y + 56}" fill="#8fb6c5" font-size="11" font-family="Inter, Arial">${escape(node.data.kind.replaceAll('-', ' '))}</text></g>`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#06121f"/><text x="32" y="42" fill="#99f6e4" font-size="18" font-family="Inter, Arial" font-weight="800">${escape(visual.title)}</text><text x="32" y="66" fill="#8fb6c5" font-size="12" font-family="Inter, Arial">${escape(visual.description)}</text>${edgeMarkup}${nodeMarkup}</svg>`;
    downloadBlob(svg, 'image/svg+xml', `${mapSlug}.svg`);
  };

  const exportPngMap = () => {
    if (!visual) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#06121f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#99f6e4';
    ctx.font = '700 22px Inter, Arial';
    ctx.fillText(visual.title, 32, 42);
    ctx.fillStyle = '#8fb6c5';
    ctx.font = '12px Inter, Arial';
    ctx.fillText(`${nodes.length} objects · ${edges.length} relationships · ${intelligence.health.score}/100 health`, 32, 64);
    const minX = Math.min(...displayedNodes.map((node) => node.position.x), 0);
    const minY = Math.min(...displayedNodes.map((node) => node.position.y), 0);
    const scale = 0.78;
    const point = (id: string) => {
      const node = displayedNodes.find((candidate) => candidate.id === id);
      return node ? { x: 90 + (node.position.x - minX) * scale + 80, y: 120 + (node.position.y - minY) * scale + 36 } : { x: 90, y: 120 };
    };
    ctx.strokeStyle = 'rgba(45,212,191,.38)';
    ctx.lineWidth = 2;
    displayedEdges.forEach((edge) => {
      const source = point(edge.source);
      const target = point(edge.target);
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.bezierCurveTo((source.x + target.x) / 2, source.y, (source.x + target.x) / 2, target.y, target.x, target.y);
      ctx.stroke();
    });
    displayedNodes.forEach((node) => {
      const x = 90 + (node.position.x - minX) * scale;
      const y = 120 + (node.position.y - minY) * scale;
      ctx.fillStyle = '#0b2232';
      ctx.strokeStyle = node.data.severity === 'SIGNIFICANT' ? '#fbbf24' : '#2dd4bf';
      ctx.lineWidth = 1.4;
      const radius = 18;
      ctx.beginPath();
      ctx.roundRect(x, y, 180, 74, radius);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ecfeff';
      ctx.font = '700 13px Inter, Arial';
      ctx.fillText(String(node.data.label).slice(0, 24), x + 14, y + 28);
      ctx.fillStyle = '#8fb6c5';
      ctx.font = '10px Inter, Arial';
      ctx.fillText(node.data.kind.replaceAll('-', ' '), x + 14, y + 50);
    });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${mapSlug}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const fitMap = () => {
    if (!graphOpen) return;
    requestAnimationFrame(() => reactFlow.fitView({ padding: 0.18, maxZoom: 1.1, duration: 420 }));
  };

  const centerMap = () => {
    if (!graphOpen) return;
    const selected = displayedNodes.find((node) => node.data.focused || node.data.severity === 'SIGNIFICANT') ?? displayedNodes[0];
    if (!selected) return;
    reactFlow.setCenter(selected.position.x + 120, selected.position.y + 60, { zoom: 0.9, duration: 420 });
  };

  const copyMapSummary = async () => {
    if (!visual || typeof navigator === 'undefined' || !navigator.clipboard) return;
    const summary = `${visual.title}: ${nodes.length} objects, ${edges.length} relationships, ${intelligence?.health.score ?? 0}/100 health`;
    await navigator.clipboard.writeText(summary).catch(() => undefined);
  };

  const openGraph = (interactive = false) => {
    setGraphOpen(true);
    setMapInteractive(interactive);
  };

  const resetMap = () => { setGraphResetVersion((value) => value + 1); fitMap(); };

  if (!intelligence || !visual) return null;

  return (
    <section className={`journey-intelligence-map journey-intelligence-map--studio ${compact ? "is-compact" : "is-expanded"}`} aria-label={`${visual.title} visual architecture model`}>
      <header className="journey-intelligence-map__toolbar journey-intelligence-map__toolbar--studio">
        <div className="journey-intelligence-map__identity">
          <span className="journey-intelligence-map__kicker"><Sparkles size={13} /> Visual architecture intelligence</span>
          <div className="journey-intelligence-map__title-line">
            <h3>{visual.title}</h3>
            <span className={graphOpen ? 'map-state-pill is-live' : 'map-state-pill'}>{graphOpen ? 'Graph open' : 'Preview'}</span>
          </div>
          <p>{visual.description}</p>
        </div>

        <div className="journey-intelligence-map__command-deck" aria-label="Visual map controls">
          <div className="journey-intelligence-map__metrics" aria-label="Map metrics">
            <span><Network size={14} /><strong>{nodes.length}</strong> objects</span>
            <span><Route size={14} /><strong>{edges.length}</strong> relationships</span>
            <span><CircleGauge size={14} /><strong>{intelligence.health.score}</strong> health</span>
            <small>{mapStatus}</small>
          </div>
          <div className="journey-intelligence-map__actions" role="group" aria-label="Map actions">
            <button type="button" className="map-action map-action--primary" onClick={() => (graphOpen ? setGraphOpen(false) : openGraph(false))}>
              {graphOpen ? <EyeOff size={13} /> : <Eye size={13} />}{graphOpen ? 'Close' : 'Open'}
            </button>
            <button type="button" className="map-action" onClick={() => setCompact((value) => !value)}>
              {compact ? <Maximize2 size={13} /> : <Minimize2 size={13} />}{compact ? 'Expand' : 'Compact'}
            </button>
            <button type="button" className={mapInteractive ? 'map-action is-on' : 'map-action'} aria-pressed={mapInteractive} disabled={!graphOpen} onClick={() => setMapInteractive((value) => !value)}>
              {mapInteractive ? <ShieldCheck size={13} /> : <Crosshair size={13} />}{mapInteractive ? 'Lock' : 'Control'}
            </button>
            <details className="map-tools-menu">
              <summary className="map-action"><ScanSearch size={13} /> Tools</summary>
              <div className="map-tools-menu__panel" role="menu" aria-label="Additional map tools">
                <button type="button" role="menuitem" disabled={!graphOpen} onClick={fitMap}><RefreshCw size={13} /> Fit view</button>
                <button type="button" role="menuitem" disabled={!graphOpen} onClick={centerMap}><Crosshair size={13} /> Center map</button>
                <button type="button" role="menuitem" className={focusedOnly ? 'is-on' : ''} onClick={() => setFocusedOnly((value) => !value)}><Target size={13} /> {focusedOnly ? 'Show all nodes' : 'Focus key nodes'}</button>
                <button type="button" role="menuitem" onClick={copyMapSummary}><Copy size={13} /> Copy summary</button>
                <button type="button" role="menuitem" onClick={exportMap}><Download size={13} /> Export JSON</button>
                <button type="button" role="menuitem" onClick={exportSvgMap}><Download size={13} /> Export SVG</button>
                <button type="button" role="menuitem" onClick={exportPngMap}><Download size={13} /> Export PNG</button>
              </div>
            </details>
          </div>
        </div>
      </header>
      <div className="journey-intelligence-map__utility-strip" aria-label="Canvas intelligence utility summary">
        <span><Zap size={13} /> {focusedOnly ? 'Focused on high-impact nodes' : 'Showing full architecture signal map'}</span>
        <span><BookOpenCheck size={13} /> {intelligence.evidence.knowledgeReleaseId}</span>
        <span><CheckCircle2 size={13} /> Human approval remains required</span>
      </div>
      <div className={`journey-intelligence-map__canvas ${mapInteractive ? "is-interactive" : "is-readonly"} ${graphOpen ? "is-graph-open" : "is-static-preview"}`}>
        {graphOpen ? (
          <ReactFlow
            key={`intelligence-map-${graphResetVersion}-${focusedOnly ? 'focused' : 'all'}`}
            nodes={displayedNodes}
            edges={displayedEdges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => {
              const objectId = (node.data as IntelligenceNodeData).objectId;
              if (objectId) selectNode(objectId);
            }}
            fitView
            fitViewOptions={{ padding: 0.18, maxZoom: 1.1 }}
            minZoom={0.25}
            maxZoom={1.6}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            panOnDrag={mapInteractive}
            zoomOnScroll={mapInteractive}
            zoomOnPinch={mapInteractive}
            zoomOnDoubleClick={false}
            preventScrolling={mapInteractive}
            onlyRenderVisibleElements
          >
            <Background gap={24} size={1} />
            {compact ? null : <MiniMap pannable zoomable />}
            <Controls showInteractive={false} />
          </ReactFlow>
        ) : (
          <div className="journey-intelligence-static-preview journey-intelligence-static-preview--studio">
            <aside className="journey-intelligence-preview-card">
              <strong>Preview mode protects workspace navigation</strong>
              <p>Open the graph only when you need pan, zoom, focus filtering or object-level trace inspection.</p>
              <div className="journey-intelligence-preview-card__actions" role="group" aria-label="Preview actions">
                <button type="button" className="map-action map-action--primary" onClick={() => openGraph(false)}>
                  <Eye size={13} /> Open map
                </button>
                <button type="button" className="map-action" onClick={() => openGraph(true)}>
                  <Crosshair size={13} /> Open with control
                </button>
              </div>
            </aside>
            <div className="journey-intelligence-static-grid" aria-label="Previewed architecture signals">
              {displayedNodes.slice(0, 6).map((node) => {
                const Icon = iconFor(node.data.kind);
                return (
                  <button key={node.id} type="button" onClick={() => { const objectId = node.data.objectId; if (objectId) selectNode(objectId); }}>
                    <Icon size={15} />
                    <span><strong>{node.data.label}</strong><small>{node.data.kind.replaceAll('-', ' ')}</small></span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <footer className="journey-intelligence-map__footer-note">
        <span><Route size={13} /> {intelligence.context.workspace.replaceAll('-', ' ')}</span>
        <button type="button" className="map-action" onClick={exportSvgMap}><ExternalLink size={13} /> Download visual</button>
      </footer>
    </section>
  );
}

export function WorkspaceIntelligenceMap() {
  return (
    <ReactFlowProvider>
      <IntelligenceGraph />
    </ReactFlowProvider>
  );
}

export function FullJourneyIntelligenceSurface() {
  return (
    <section className="full-journey-intelligence-surface full-journey-intelligence-surface--quiet">
      <WorkspaceIntelligenceMap />
      <details className="quiet-brain-disclosure">
        <summary>
          <Sparkles size={14} />
          <span>AIW brain signals</span>
          <small>Open only when you need rationale, critique or evidence trace</small>
        </summary>
        <EmbeddedIntelligencePanel />
      </details>
    </section>
  );
}
