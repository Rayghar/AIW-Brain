import { memo, useMemo } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  FileCode2,
  GitCompareArrows,
  GitPullRequestArrow,
  Network,
  PlayCircle,
  RefreshCcw,
  ShieldCheck,
  Workflow,
  XCircle,
} from 'lucide-react';
import type { ConformanceVisualNode } from '@aiw/engine';
import { useWorkspaceStore } from '../store/workspaceStore';

interface FlowData extends Record<string, unknown> {
  label: string;
  kind: ConformanceVisualNode['kind'];
  status: ConformanceVisualNode['status'];
  metadata: Record<string, unknown>;
}

type FlowNode = Node<FlowData, 'conformanceNode'>;

function iconFor(kind: ConformanceVisualNode['kind']) {
  if (kind === 'intended') return Boxes;
  if (kind === 'actual') return Network;
  if (kind === 'control') return ShieldCheck;
  return AlertTriangle;
}

const ConformanceNodeView = memo(({ data, selected }: NodeProps<FlowNode>) => {
  const Icon = iconFor(data.kind);
  return (
    <div className={`conformance-node conformance-node--${data.kind} status-${data.status} ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div><Icon size={15}/><small>{data.kind}</small></div>
      <strong>{data.label}</strong>
      <span>{data.status.replace('-', ' ')}</span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});
ConformanceNodeView.displayName = 'ConformanceNodeView';

const nodeTypes: NodeTypes = { conformanceNode: ConformanceNodeView };

function ConformanceGraph() {
  const visual = useWorkspaceStore((state) => state.conformanceVisualModel);
  const nodes = useMemo<FlowNode[]>(() => (visual?.nodes ?? []).map((node) => ({
    id: node.id,
    type: 'conformanceNode',
    position: { x: node.x, y: node.y },
    data: { label: node.label, kind: node.kind, status: node.status, metadata: node.metadata },
    draggable: false,
  })), [visual]);
  const edges = useMemo<Edge[]>(() => (visual?.edges ?? []).map((edge) => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    label: edge.label,
    type: 'smoothstep',
    animated: edge.kind === 'violates',
    markerEnd: { type: MarkerType.ArrowClosed, width: 13, height: 13 },
    className: `conformance-edge conformance-edge--${edge.kind}`,
    labelStyle: { fontSize: 10, fontWeight: 600 },
  })), [visual]);

  if (!visual) return <div className="empty-card">Generate a control plan and run an assessment to create the visual intended-versus-actual conformance model.</div>;
  return (
    <div className="conformance-canvas" aria-label="Visual architecture conformance model">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.2, maxZoom: 1 }} minZoom={0.2} maxZoom={1.5} nodesDraggable={false} nodesConnectable={false} onlyRenderVisibleElements>
        <Background gap={24} size={1}/>
        <MiniMap pannable zoomable/>
        <Controls showInteractive={false}/>
      </ReactFlow>
    </div>
  );
}

export function ConformanceWorkspace() {
  const project = useWorkspaceStore((state) => state.project);
  const plan = useWorkspaceStore((state) => state.conformancePlan);
  const assessment = useWorkspaceStore((state) => state.conformanceAssessment);
  const evidence = useWorkspaceStore((state) => state.conformanceEvidence);
  const remediation = useWorkspaceStore((state) => state.conformanceRemediation);
  const generatePlan = useWorkspaceStore((state) => state.generateConformancePlan);
  const loadEvidence = useWorkspaceStore((state) => state.loadReferenceConformanceEvidence);
  const assess = useWorkspaceStore((state) => state.assessConformanceNow);
  const previewRemediation = useWorkspaceStore((state) => state.previewConformanceRemediation);
  const submitRemediation = useWorkspaceStore((state) => state.submitConformanceRemediation);
  const decideRemediation = useWorkspaceStore((state) => state.decideConformanceRemediation);

  const gateClass = assessment?.gate.passed ? 'healthy' : assessment ? 'at-risk' : 'unknown';
  return (
    <section className="studio-page conformance-workspace">
      <div className="studio-hero">
        <div>
          <span className="eyebrow">Continuous conformance</span>
          <h1>Realization & continuous architecture conformance</h1>
          <p>Generate conformance controls from the governed architecture, execute them in CI and runtime environments, compare intended and actual structures visually, and prepare human-approved remediation.</p>
        </div>
        <div className={`hero-metric conformance-gate-${gateClass}`}>
          {assessment?.gate.passed ? <CheckCircle2 size={22}/> : assessment ? <XCircle size={22}/> : <Activity size={22}/>} 
          <strong>{assessment ? (assessment.gate.passed ? 'Gate passed' : 'Attention required') : 'Not assessed'}</strong>
          <small>{assessment ? `${assessment.summary.coveragePercent}% control execution coverage` : 'No conformance assessment yet'}</small>
        </div>
      </div>

      <div className="conformance-action-strip">
        <button className="primary-action" onClick={generatePlan}><FileCode2 size={16}/> Generate control plan</button>
        <button className="secondary-action" disabled={!plan} onClick={loadEvidence}><PlayCircle size={16}/> Load sample evidence</button>
        <button className="secondary-action" disabled={!plan} onClick={assess}><RefreshCcw size={16}/> Assess conformance</button>
        <button className="secondary-action" disabled={!assessment || assessment.findings.length === 0} onClick={previewRemediation}><GitPullRequestArrow size={16}/> Preview remediation</button>
      </div>

      <div className="governance-grid conformance-summary-grid">
        <article className="governance-card">
          <div className="card-title"><ClipboardCheck size={18}/><div><strong>Control plan</strong><small>Project revision {project.revision}</small></div></div>
          <dl className="detail-list"><div><dt>Controls</dt><dd>{plan?.summary.total ?? 0}</dd></div><div><dt>Executable</dt><dd>{plan?.summary.executable ?? 0}</dd></div><div><dt>Artifacts</dt><dd>{plan?.artifacts.length ?? 0}</dd></div></dl>
        </article>
        <article className="governance-card">
          <div className="card-title"><Workflow size={18}/><div><strong>Evidence</strong><small>CI, infrastructure and runtime</small></div></div>
          <dl className="detail-list"><div><dt>Envelopes</dt><dd>{evidence.length}</dd></div><div><dt>Sources</dt><dd>{new Set(evidence.map((item) => item.sourceType)).size}</dd></div><div><dt>Unverified</dt><dd>{assessment?.summary.unverified ?? plan?.summary.executable ?? 0}</dd></div></dl>
        </article>
        <article className="governance-card">
          <div className="card-title"><GitCompareArrows size={18}/><div><strong>Assessment</strong><small>Intended versus actual</small></div></div>
          <dl className="detail-list"><div><dt>Passed</dt><dd>{assessment?.summary.passed ?? 0}</dd></div><div><dt>Failed</dt><dd>{assessment?.summary.failed ?? 0}</dd></div><div><dt>Health</dt><dd>{assessment?.summary.healthScore ?? '—'}</dd></div></dl>
        </article>
        <article className="governance-card">
          <div className="card-title"><ShieldCheck size={18}/><div><strong>Governance</strong><small>No silent mutation</small></div></div>
          <dl className="detail-list"><div><dt>Remediation</dt><dd>{remediation?.status ?? 'Not prepared'}</dd></div><div><dt>Actions</dt><dd>{remediation?.actions.length ?? 0}</dd></div><div><dt>Approval</dt><dd>Required</dd></div></dl>
        </article>
      </div>

      <section className="panel-card conformance-map-panel">
        <div className="panel-heading"><div><span className="eyebrow">Visual conformance model</span><h2>Architecture intent, controls, runtime and violations</h2></div><div className="conformance-legend"><span>Intent</span><span>Control</span><span>Actual</span><span>Finding</span></div></div>
        <ReactFlowProvider><ConformanceGraph/></ReactFlowProvider>
      </section>

      <div className="conformance-detail-grid">
        <section className="panel-card">
          <div className="panel-heading"><div><span className="eyebrow">Control execution</span><h2>Fitness and policy controls</h2></div></div>
          {assessment?.controls.length ? <div className="stack-list">{assessment.controls.slice(0, 30).map((control) => (
            <div className={`finding-card conformance-control-${control.status}`} key={control.id}>
              <div>{control.status === 'passed' ? <BadgeCheck size={16}/> : control.status === 'failed' ? <AlertTriangle size={16}/> : <Activity size={16}/>}<div><strong>{control.title}</strong><p>{control.explanation}</p><small>{control.target} · {control.source}</small></div><span>{control.status.toUpperCase()}</span></div>
            </div>
          ))}</div> : <div className="empty-card">Run an assessment to see which controls passed, failed or remain unverified.</div>}
        </section>

        <section className="panel-card">
          <div className="panel-heading"><div><span className="eyebrow">Findings</span><h2>Explainable conformance gaps</h2></div></div>
          {assessment?.findings.length ? <div className="stack-list">{assessment.findings.slice(0, 30).map((finding) => (
            <div className={`finding-card severity-${finding.severity}`} key={finding.id}><div><AlertTriangle size={16}/><div><strong>{finding.title}</strong><p>{finding.description}</p><small>{finding.remediation}</small></div><span>{finding.severity.toUpperCase()}</span></div></div>
          ))}</div> : <div className="empty-card">No conformance findings have been generated.</div>}
        </section>
      </div>

      {remediation ? <section className="panel-card conformance-remediation-panel">
        <div className="panel-heading"><div><span className="eyebrow">Governed remediation</span><h2>Reviewable implementation change set</h2><p>No architecture or repository mutation is automatically applied.</p></div><span className={`status-pill status-${remediation.status}`}>{remediation.status}</span></div>
        <div className="stack-list">{remediation.actions.map((action) => <div className="finding-card" key={action.id}><div><GitPullRequestArrow size={16}/><div><strong>{action.title}</strong><p>{action.description}</p><small>{action.actionType} · risk {action.risk} · automatic mutation disabled</small></div><span>{action.status}</span></div></div>)}</div>
        <div className="conformance-remediation-actions">
          <button className="secondary-action" disabled={remediation.status !== 'draft'} onClick={submitRemediation}>Submit for approval</button>
          <button className="primary-action" disabled={!['draft','pending-approval'].includes(remediation.status)} onClick={() => decideRemediation(true)}>Approve controlled change set</button>
          <button className="secondary-action" disabled={!['draft','pending-approval'].includes(remediation.status)} onClick={() => decideRemediation(false)}>Reject</button>
        </div>
      </section> : null}
    </section>
  );
}
