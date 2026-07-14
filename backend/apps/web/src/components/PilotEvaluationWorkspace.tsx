import { memo, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertTriangle, BadgeCheck, CheckCircle2, ClipboardCheck, FlaskConical, Gauge, PlayCircle, ShieldCheck, Sparkles, Target, Workflow } from 'lucide-react';
import { sampleEnterpriseCatalog, samplePortfolioProjects } from '@aiw/domain';
import { buildReferencePilotScenarios, buildV10ReleaseReadiness, runPilotEvaluationSuite, type PilotVisualNode } from '@aiw/engine';
import { useWorkspaceStore } from '../store/workspaceStore';

interface PilotFlowData extends Record<string, unknown> {
  label: string;
  summary: string;
  kind: PilotVisualNode['kind'];
  score?: number;
  readiness?: 'ready' | 'conditional' | 'not-ready';
}
type PilotFlowNode = Node<PilotFlowData, 'pilotNode'>;

function iconFor(kind: PilotVisualNode['kind']) {
  if (kind === 'pilot') return FlaskConical;
  if (kind === 'scenario') return Target;
  if (kind === 'project') return Workflow;
  if (kind === 'metric') return Gauge;
  if (kind === 'blocker') return AlertTriangle;
  if (kind === 'action') return PlayCircle;
  if (kind === 'release-gate') return BadgeCheck;
  return Sparkles;
}

const PilotNodeView = memo(({ data, selected }: NodeProps<PilotFlowNode>) => {
  const Icon = iconFor(data.kind);
  return (
    <div className={`portfolio-visual-node portfolio-visual-node--${data.kind} ${selected ? 'is-selected' : ''} ${data.readiness ? `readiness-${data.readiness}` : ''}`}>
      <Handle type="target" position={Position.Left}/>
      <div className="portfolio-visual-node__head"><span><Icon size={15}/></span><small>{data.kind.replaceAll('-', ' ')}</small>{typeof data.score === 'number' ? <b>{Math.round(data.score)}</b> : null}</div>
      <strong>{data.label}</strong>
      <p>{data.summary}</p>
      <Handle type="source" position={Position.Right}/>
    </div>
  );
});
PilotNodeView.displayName = 'PilotNodeView';
const nodeTypes: NodeTypes = { pilotNode: PilotNodeView };

function PilotVisualGraph({ visual }: { visual: ReturnType<typeof runPilotEvaluationSuite>['visualModel'] }) {
  const nodes = useMemo<PilotFlowNode[]>(() => visual.nodes.map((node) => ({
    id: node.id,
    type: 'pilotNode',
    position: { x: node.x, y: node.y },
    data: { label: node.label, summary: node.summary, kind: node.kind, ...(typeof node.score === 'number' ? { score: node.score } : {}), ...(node.readiness ? { readiness: node.readiness } : {}) },
    draggable: false,
  })), [visual]);
  const edges = useMemo<Edge[]>(() => visual.edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    label: edge.label,
    type: 'smoothstep',
    animated: edge.kind === 'blocked-by' || edge.kind === 'requires-action' || edge.kind === 'rolls-up-to',
    markerEnd: { type: MarkerType.ArrowClosed, width: 13, height: 13 },
    className: `portfolio-visual-edge portfolio-visual-edge--${edge.kind}`,
    labelStyle: { fontSize: 10, fontWeight: 600 },
  })), [visual]);
  return <div className="portfolio-visual-canvas pilot-visual-canvas" aria-label="Interactive pilot evaluation visual model">
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.18, maxZoom: 0.9 }} minZoom={0.12} maxZoom={1.4} nodesDraggable={false} nodesConnectable={false} onlyRenderVisibleElements>
      <Background gap={28} size={1}/>
      <MiniMap pannable zoomable/>
      <Controls showInteractive={false}/>
    </ReactFlow>
  </div>;
}

export function PilotEvaluationWorkspace() {
  const project = useWorkspaceStore((state) => state.project);
  const projects = useMemo(() => samplePortfolioProjects.map((candidate) => candidate.id === project.id ? project : candidate), [project]);
  const scenarios = useMemo(() => buildReferencePilotScenarios(projects), [projects]);
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0]?.id ?? '');
  const report = useMemo(() => runPilotEvaluationSuite(scenarios, projects, sampleEnterpriseCatalog), [scenarios, projects]);
  const readiness = useMemo(() => buildV10ReleaseReadiness(report), [report]);
  const selected = report.scenarios.find((scenario) => scenario.scenarioId === selectedScenarioId) ?? report.scenarios[0];

  return <section className="studio-page governance-page portfolio-intelligence-page pilot-evaluation-page">
    <div className="page-heading">
      <div><span className="eyebrow">Pilot evaluation</span><h2>Pilot readiness</h2><p>Evaluate representative architecture scenarios, inspect blockers visually, and collect the evidence needed before a broader rollout.</p></div>
      <div className="health-score"><span>Readiness</span><strong>{readiness.score}</strong><small>{readiness.status.replace('-', ' ')}</small></div>
    </div>

    <div className="portfolio-summary-grid">
      <article><CheckCircle2 size={18}/><strong>{report.summary.ready}</strong><span>Ready scenarios</span></article>
      <article><ShieldCheck size={18}/><strong>{report.summary.conditional}</strong><span>Conditional scenarios</span></article>
      <article><AlertTriangle size={18}/><strong>{report.summary.blockers}</strong><span>Open blockers</span></article>
      <article><BadgeCheck size={18}/><strong>{report.releaseGate.status}</strong><span>Release gate</span></article>
    </div>

    <section className="panel-card pilot-browser-readiness" aria-label="Enterprise pilot readiness browser evidence">
      <div className="panel-heading"><div><span className="eyebrow">Pilot evidence</span><h2>Enterprise pilot readiness evidence</h2></div><small>environment readiness evidence</small></div>
      <div className="portfolio-summary-grid pilot-readiness-grid">
        <article><CheckCircle2 size={18}/><strong>Browser E2E</strong><span>Review export, Admin/RBAC and pilot navigation smoke-gated</span></article>
        <article><BadgeCheck size={18}/><strong>Visual regression</strong><span>App shell, Review Studio, Admin, Pilot and focus contracts captured</span></article>
        <article><ShieldCheck size={18}/><strong>Accessibility</strong><span>Contrast, skip link, main landmark and focus visibility verified</span></article>
        <article><ClipboardCheck size={18}/><strong>One command</strong><span>Generate a repeatable pilot evidence pack from the readiness workflow</span></article>
      </div>
      <p className="runtime-boundary">Enterprise pilot readiness remains evidence-backed: the browser bundle, export click-through path, visual contracts and accessibility checks are verified in the pilot evidence. Final go-live still requires target-environment acceptance.</p>
    </section>

    <section className="panel-card portfolio-map-panel">
      <div className="panel-heading"><div><span className="eyebrow">Visual pilot readiness graph</span><h2>Scenarios, metrics, blockers and release gate</h2></div><div className="conformance-legend"><span>Scenario</span><span>Metric</span><span>Blocker</span><span>Action</span></div></div>
      <PilotVisualGraph visual={report.visualModel}/>
    </section>

    <div className="portfolio-two-column">
      <article className="portfolio-panel">
        <div className="panel-heading"><span><FlaskConical size={17}/><strong>Pilot scenarios</strong></span><small>{report.summary.averageScore} average score</small></div>
        <div className="stack-list">
          {report.scenarios.map((scenario) => <button key={scenario.scenarioId} className={`list-row ${selected?.scenarioId === scenario.scenarioId ? 'active' : ''}`} onClick={() => setSelectedScenarioId(scenario.scenarioId)}>
            <div><strong>{scenario.name}</strong><small>{scenario.kind} · {scenario.score}/{scenario.threshold}</small></div><span className={`status-pill status-pill--${scenario.readiness}`}>{scenario.readiness}</span>
          </button>)}
        </div>
      </article>
      <article className="portfolio-panel">
        <div className="panel-heading"><span><ClipboardCheck size={17}/><strong>Selected scenario evidence</strong></span><small>review before production pilot</small></div>
        {selected ? <>
          <p className="panel-intro">{selected.name} is <strong>{selected.readiness}</strong> with score <strong>{selected.score}</strong>. Target-environment evidence is still required before production acceptance.</p>
          <div className="portfolio-standards-list">{selected.metricScores.map((metric) => <div key={metric.id} className={`standard-row status-${metric.status}`}><div><strong>{metric.label}</strong><small>{metric.rationale}</small></div><span>{metric.score}/{metric.threshold}</span></div>)}</div>
          {selected.followUpActions.length ? <div className="pilot-actions"><strong>Hardening actions</strong>{selected.followUpActions.slice(0, 5).map((action) => <p key={action}>{action}</p>)}</div> : null}
        </> : <div className="empty-card">No scenario selected.</div>}
      </article>
    </div>

    <section className="panel-card runtime-history">
      <div className="panel-heading"><div><span className="eyebrow">Release honesty boundary</span><h2>Reference candidate, not fabricated production acceptance</h2></div></div>
      <div className="portfolio-summary-grid">
        {readiness.gates.map((gate) => <article key={gate.id}><>{gate.passed ? <CheckCircle2 size={18}/> : <AlertTriangle size={18}/>}</><strong>{gate.passed ? 'Pass' : 'Open'}</strong><span>{gate.label}</span></article>)}
      </div>
      <p className="runtime-boundary">{readiness.productionAcceptance.reason}</p>
    </section>
  </section>;
}
