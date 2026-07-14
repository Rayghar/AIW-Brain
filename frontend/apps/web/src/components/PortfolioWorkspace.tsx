import { memo, useEffect, useMemo, useState } from 'react';
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
  AlertTriangle,
  BadgeDollarSign,
  Boxes,
  Building2,
  CheckCircle2,
  CircleGauge,
  ClipboardCheck,
  Factory,
  GitBranch,
  GitCompareArrows,
  GitPullRequestArrow,
  Landmark,
  Layers3,
  Network,
  Plus,
  RefreshCw,
  Route,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Waypoints,
  Workflow,
} from 'lucide-react';
import { sampleEnterpriseCatalog, samplePortfolioProjects } from '@aiw/domain';
import {
  analyseEnterpriseStandardsImpact,
  buildPortfolioIntelligence,
  buildPortfolioVisualModel,
  type PortfolioVisualNode,
} from '@aiw/engine';
import { useWorkspaceStore } from '../store/workspaceStore';

type View = 'intelligence' | 'standards-impact' | 'release-impact' | 'branches';
type PortfolioTask = 'portfolio' | 'reuse' | 'risks' | 'standards' | 'releases';

const money = (value: number, currency: string) => new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);

interface PortfolioFlowData extends Record<string, unknown> {
  label: string;
  summary: string;
  kind: PortfolioVisualNode['kind'];
  score?: number;
  severity?: 'HARD' | 'SIGNIFICANT' | 'ADVISORY';
  focused: boolean;
}
type PortfolioFlowNode = Node<PortfolioFlowData, 'portfolioNode'>;

function iconFor(kind: PortfolioVisualNode['kind']) {
  if (kind === 'portfolio') return Landmark;
  if (kind === 'business-unit') return Building2;
  if (kind === 'project') return Boxes;
  if (kind === 'dependency') return Route;
  if (kind === 'standard') return ShieldCheck;
  if (kind === 'technology') return Factory;
  if (kind === 'risk') return AlertTriangle;
  if (kind === 'reuse') return Sparkles;
  return Workflow;
}

const PortfolioNodeView = memo(({ data, selected }: NodeProps<PortfolioFlowNode>) => {
  const Icon = iconFor(data.kind);
  return <div className={`portfolio-visual-node portfolio-visual-node--${data.kind} ${data.focused ? 'is-focused' : ''} ${selected ? 'is-selected' : ''} ${data.severity ? `severity-${data.severity.toLowerCase()}` : ''}`}>
    <Handle type="target" position={Position.Left}/>
    <div className="portfolio-visual-node__head"><span><Icon size={15}/></span><small>{data.kind.replaceAll('-', ' ')}</small>{typeof data.score === 'number' ? <b>{Math.round(data.score)}</b> : null}</div>
    <strong>{data.label}</strong><p>{data.summary}</p><Handle type="source" position={Position.Right}/>
  </div>;
});
PortfolioNodeView.displayName = 'PortfolioNodeView';
const nodeTypes: NodeTypes = { portfolioNode: PortfolioNodeView };

function PortfolioVisualGraph({ visual }: { visual: ReturnType<typeof buildPortfolioVisualModel> }) {
  const nodes = useMemo<PortfolioFlowNode[]>(() => visual.nodes.map((node) => ({
    id: node.id,
    type: 'portfolioNode',
    position: { x: node.x, y: node.y },
    data: { label: node.label, summary: node.summary, kind: node.kind, ...(typeof node.score === 'number' ? { score: node.score } : {}), ...(node.severity ? { severity: node.severity } : {}), focused: visual.focusNodeIds.includes(node.id) },
    draggable: false,
  })), [visual]);
  const edges = useMemo<Edge[]>(() => visual.edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    label: edge.label,
    type: 'smoothstep',
    animated: edge.kind === 'depends-on' || edge.kind === 'affected-by' || edge.kind === 'prioritizes',
    markerEnd: { type: MarkerType.ArrowClosed, width: 13, height: 13 },
    className: `portfolio-visual-edge portfolio-visual-edge--${edge.kind}`,
    labelStyle: { fontSize: 10, fontWeight: 600 },
  })), [visual]);
  return <div className="portfolio-visual-canvas" aria-label="Interactive portfolio architecture visual model"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.16, maxZoom: 0.95 }} minZoom={0.15} maxZoom={1.4} nodesDraggable={false} nodesConnectable={false} onlyRenderVisibleElements><Background gap={28} size={1}/><MiniMap pannable zoomable/><Controls showInteractive={false}/></ReactFlow></div>;
}

function initialTask(): PortfolioTask {
  if (typeof window === 'undefined') return 'portfolio';
  const saved = window.sessionStorage.getItem('aiw.activeRoleTask');
  return saved === 'reuse' || saved === 'risks' || saved === 'standards' || saved === 'releases' ? saved : 'portfolio';
}

export function PortfolioWorkspace() {
  const [name, setName] = useState('');
  const [task, setTask] = useState<PortfolioTask>(initialTask);
  const [view, setView] = useState<View>(() => task === 'standards' ? 'standards-impact' : task === 'releases' ? 'release-impact' : 'intelligence');
  const [standardId, setStandardId] = useState('STD-RDBMS-MYSQL-LEGACY');
  const [selectedReuseSignature, setSelectedReuseSignature] = useState<string | null>(null);
  const [selectedRiskProjectId, setSelectedRiskProjectId] = useState<string | null>(null);
  const project = useWorkspaceStore((state) => state.project);
  const branches = useWorkspaceStore((state) => state.branches);
  const createBranch = useWorkspaceStore((state) => state.createBranch);
  const switchBranch = useWorkspaceStore((state) => state.switchBranch);
  const compareWithBranch = useWorkspaceStore((state) => state.compareWithBranch);

  useEffect(() => {
    const listener = (event: Event) => {
      const taskId = (event as CustomEvent<{ taskId?: string }>).detail?.taskId;
      if (taskId === 'reuse' || taskId === 'risks' || taskId === 'portfolio' || taskId === 'standards' || taskId === 'releases') {
        setTask(taskId);
        setView(taskId === 'standards' ? 'standards-impact' : taskId === 'releases' ? 'release-impact' : 'intelligence');
      }
    };
    window.addEventListener('aiw:role-task', listener);
    return () => window.removeEventListener('aiw:role-task', listener);
  }, []);

  const projects = useMemo(() => samplePortfolioProjects.map((candidate) => candidate.id === project.id ? project : candidate), [project]);
  const report = useMemo(() => buildPortfolioIntelligence(projects, sampleEnterpriseCatalog), [projects]);
  const visual = useMemo(() => buildPortfolioVisualModel(projects, sampleEnterpriseCatalog, report), [projects, report]);
  const standardsImpact = useMemo(() => analyseEnterpriseStandardsImpact(projects, sampleEnterpriseCatalog, {
    id: `change-${standardId}-impact`,
    standardId,
    changeType: standardId.includes('MYSQL') ? 'prohibit' : 'restrict',
    targetStatus: standardId.includes('MYSQL') ? 'prohibited' : 'restricted',
    replacementTechnology: sampleEnterpriseCatalog.technologyStandards.find((item) => item.id === standardId)?.preferredReplacement ?? 'preferred enterprise standard',
    effectiveFrom: '2026-10-01',
    rationale: 'Assess enterprise blast radius before approving a standard lifecycle change.',
  }), [projects, standardId]);
  const selectedReuse = report.reuse.duplicateCandidates.find((item) => item.signature === selectedReuseSignature) ?? null;
  const selectedRisk = report.riskHeatmap.find((item) => item.projectId === selectedRiskProjectId) ?? null;
  const releaseId = project.requirementsIntelligence?.knowledgeReleaseId ?? 'Unpinned project release';
  const releaseImpacts = useMemo(() => projects.map((candidate) => {
    const linkedPatterns = candidate.patternSelections.filter((item) => item.status === 'accepted').length;
    const openApprovals = candidate.stageApprovals.filter((item) => item.status === 'pending' || item.status === 'changes-requested').length;
    const standardsGaps = report.standardization.findings.filter((item) => item.projectId === candidate.id).length;
    const impact = linkedPatterns + standardsGaps + openApprovals;
    return { id: candidate.id, name: candidate.name, linkedPatterns, standardsGaps, openApprovals, impact, action: standardsGaps ? 'Re-evaluate technology choices and migration obligations.' : linkedPatterns ? 'Re-run pattern fit and recommendation confidence.' : 'No direct pattern or standard dependency detected.' };
  }).sort((a, b) => b.impact - a.impact), [projects, report.standardization.findings]);

  const portfolioScore = Math.round((report.summary.standardizationScore + report.summary.complianceScore + (100 - report.riskHeatmap.reduce((sum, item) => sum + item.riskScore, 0) / Math.max(1, report.riskHeatmap.length))) / 3);
  const heading = task === 'reuse' ? 'Reusable architecture candidates' : task === 'risks' ? 'Portfolio risk concentration' : task === 'standards' ? 'Enterprise standards impact' : task === 'releases' ? 'Knowledge and standards release impact' : 'Portfolio intelligence';
  const caption = task === 'reuse' ? 'Evaluate repeated capabilities, ownership and shared-building-block opportunities.' : task === 'risks' ? 'Prioritise concentrated architecture, dependency and technical-debt exposure.' : task === 'standards' ? 'Simulate standards changes before approval or migration planning.' : task === 'releases' ? 'Assess which projects and decisions must be re-evaluated when governed knowledge changes.' : 'Explore cross-project dependencies, standards, cost, reuse and risk through one enterprise architecture surface.';

  return <section className={`studio-page portfolio-intelligence-page portfolio-task--${task}`} data-testid="portfolio-intelligence-workspace" data-portfolio-task={task}>
    <header className="portfolio-workspace__hero"><div><span className="eyebrow">Enterprise architecture portfolio</span><h1>{heading}</h1><p>{caption}</p></div><div className="health-score"><span>Portfolio score</span><strong>{portfolioScore}</strong><small>{report.summary.projects} initiatives</small></div></header>

    <div className="workspace-tabs portfolio-tabs" role="tablist" aria-label="Portfolio views">
      <button type="button" className={view === 'intelligence' ? 'active' : ''} onClick={() => { setView('intelligence'); setTask('portfolio'); }}><CircleGauge size={15}/> Intelligence</button>
      <button type="button" className={view === 'standards-impact' ? 'active' : ''} onClick={() => { setView('standards-impact'); setTask('standards'); }}><Waypoints size={15}/> Standards impact</button>
      <button type="button" className={view === 'release-impact' ? 'active' : ''} onClick={() => { setView('release-impact'); setTask('releases'); }}><ClipboardCheck size={15}/> Release impact</button>
      <button type="button" className={view === 'branches' ? 'active' : ''} onClick={() => setView('branches')}><GitBranch size={15}/> Branches & alternatives</button>
    </div>

    {view === 'branches' ? <div className="portfolio-focused-surface">
      <div className="branch-create-card"><div><GitBranch size={18}/><span><strong>Create an architecture alternative</strong><small>Fork the current revision into a governed branch.</small></span></div><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Event-driven alternative"/><button className="button button--primary" disabled={!name.trim()} onClick={() => { createBranch(name.trim()); setName(''); }}><Plus size={15}/> Create branch</button></div>
      <div className="branch-grid">{branches.map((branch) => { const active = branch.metadata.id === project.branch.id; const approved = branch.project.stageApprovals.filter((item) => item.status === 'approved').length; return <article key={branch.metadata.id} className={active ? 'branch-card active' : 'branch-card'}><div className="branch-card__head"><Workflow size={18}/><span><strong>{branch.metadata.name}</strong><small>{branch.metadata.status} · base revision {branch.metadata.baseRevision}</small></span>{active ? <b>ACTIVE</b> : null}</div><p>{branch.metadata.description || 'Alternative architecture branch.'}</p><div className="branch-metrics"><span><strong>{branch.project.nodes.length}</strong> entities</span><span><strong>{branch.project.decisions.length}</strong> ADRs</span><span><strong>{approved}/6</strong> approved</span></div><div className="branch-actions"><button disabled={active} onClick={() => switchBranch(branch.metadata.id)}><Layers3 size={14}/> Open</button><button disabled={active} onClick={() => compareWithBranch(branch.metadata.id)}><GitCompareArrows size={14}/> Compare</button></div></article>; })}</div>
    </div> : null}

    {view === 'standards-impact' ? <div className="portfolio-focused-surface standards-impact-surface">
      <section className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Standards blast radius</span><h2>Analyse before changing enterprise policy</h2><p>No standards, projects or repositories are mutated by this simulation.</p></div><select aria-label="Enterprise standard" value={standardId} onChange={(event) => setStandardId(event.target.value)}>{sampleEnterpriseCatalog.technologyStandards.map((standard) => <option key={standard.id} value={standard.id}>{standard.technologyName} · {standard.status}</option>)}</select></div><div className="portfolio-summary-grid"><article><Boxes/><span>Affected projects<strong>{standardsImpact.summary.affectedProjects}</strong><small>{standardsImpact.summary.criticalImpacts} critical</small></span></article><article><Network/><span>Dependencies<strong>{standardsImpact.affectedDependencyIds.length}</strong><small>coordination links</small></span></article><article><Factory/><span>Technology uses<strong>{standardsImpact.summary.affectedTechnologies}</strong><small>direct instances</small></span></article><article><Workflow/><span>Migration effort<strong>{standardsImpact.summary.estimatedEffortDays}</strong><small>estimated days</small></span></article></div></section>
      <section className="panel-card portfolio-map-panel"><div className="panel-heading"><span><Waypoints size={17}/><strong>Affected portfolio graph</strong></span><small>Focused change impact</small></div><ReactFlowProvider><PortfolioVisualGraph visual={standardsImpact.visualModel}/></ReactFlowProvider></section>
      <div className="portfolio-two-column"><article className="portfolio-panel"><div className="panel-heading"><span><AlertTriangle size={17}/><strong>Affected initiatives</strong></span><small>Ranked by exposure</small></div><div className="risk-heatmap-list">{standardsImpact.affectedProjects.map((entry) => <div key={entry.projectId} className={`risk-row risk-${entry.impactLevel}`}><span className="risk-score">{entry.riskScore}</span><span className="risk-main"><strong>{entry.projectName}</strong><small>{entry.businessUnit} · {entry.affectedTechnologies.join(', ')}</small></span><b>{entry.impactLevel}</b></div>)}</div></article><article className="portfolio-panel"><div className="panel-heading"><span><GitPullRequestArrow size={17}/><strong>Migration waves</strong></span><small>Human approval required</small></div><div className="roadmap-list compact-roadmap">{standardsImpact.migrationWaves.map((wave, index) => <div key={wave.id} className="roadmap-item priority-now"><span className="roadmap-index">{index + 1}</span><span><strong>{wave.title}</strong><small>{wave.projectIds.length} project(s) · {wave.estimatedEffortDays} days</small><p>{wave.sequencingRationale}</p></span></div>)}</div></article></div>
    </div> : null}

    {view === 'release-impact' ? <div className="portfolio-focused-surface release-impact-surface">
      <section className="release-impact__summary"><div><span className="eyebrow">Active governed knowledge</span><h2>{releaseId}</h2><p>Read-only impact assessment. Promotion, pinning and rollback remain Knowledge Curator or Administrator responsibilities.</p></div><div><strong>{releaseImpacts.filter((item) => item.impact > 0).length}</strong><small>projects need re-evaluation</small></div></section>
      <div className="release-impact__grid">{releaseImpacts.map((item) => <article key={item.id} className={item.impact > 2 ? 'is-high' : item.impact ? 'is-medium' : 'is-low'}><header><Boxes size={16}/><div><strong>{item.name}</strong><small>{item.id}</small></div><b>{item.impact}</b></header><dl><div><dt>Accepted patterns</dt><dd>{item.linkedPatterns}</dd></div><div><dt>Standards gaps</dt><dd>{item.standardsGaps}</dd></div><div><dt>Open approvals</dt><dd>{item.openApprovals}</dd></div></dl><p>{item.action}</p></article>)}</div>
    </div> : null}

    {view === 'intelligence' ? <div className={`portfolio-focused-surface portfolio-intelligence-content task-focus-${task}`}>
      <div className="portfolio-summary-grid"><article><Building2/><span>Projects<strong>{report.summary.projects}</strong><small>{report.summary.highRiskProjects} high-risk</small></span></article><article><Network/><span>Dependencies<strong>{report.summary.totalDependencies}</strong><small>{report.dependencyGraph.singlePointsOfDependency.length} concentration risk(s)</small></span></article><article><CheckCircle2/><span>Standards score<strong>{report.summary.standardizationScore}%</strong><small>{report.standardization.findings.length} action(s)</small></span></article><article><ShieldAlert/><span>Compliance<strong>{report.summary.complianceScore}%</strong><small>{report.compliance.filter((item) => !item.compliant).length} gaps</small></span></article><article><BadgeDollarSign/><span>Monthly variance<strong>{money(report.costs.monthlyVariance, report.costs.currency)}</strong><small>architecture cost signal</small></span></article><article><Sparkles/><span>Reuse candidates<strong>{report.reuse.duplicateCandidates.length}</strong><small>{report.reuse.usages.length} governed blocks</small></span></article></div>

      {task === 'reuse' ? <section className="panel-card portfolio-decision-workflow"><div className="panel-heading"><div><span className="eyebrow">Reuse decision</span><h2>Repeated capabilities requiring enterprise ownership</h2></div><div className="health-score"><span>Reuse score</span><strong>{report.reuse.reuseScore}</strong></div></div><div className="portfolio-decision-layout"><div className="reuse-candidate-list">{report.reuse.duplicateCandidates.length ? report.reuse.duplicateCandidates.map((candidate, index) => <div key={candidate.signature} className={selectedReuse?.signature === candidate.signature ? 'is-selected' : ''}><span className="risk-score">{index + 1}</span><span><strong>{candidate.labels.join(' · ') || candidate.signature}</strong><small>{candidate.projectIds.join(' · ')}</small><p>{candidate.recommendation}</p></span><button type="button" onClick={() => setSelectedReuseSignature(candidate.signature)}>Evaluate</button></div>) : <div className="empty-card">No duplicate component signatures were detected.</div>}</div><aside className="portfolio-decision-detail">{selectedReuse ? <><span className="eyebrow">Candidate assessment</span><h3>{selectedReuse.labels.join(' · ') || selectedReuse.signature}</h3><p>{selectedReuse.recommendation}</p><dl><div><dt>Projects</dt><dd>{selectedReuse.projectIds.length}</dd></div><div><dt>Signature</dt><dd>{selectedReuse.signature}</dd></div></dl><small>Next governance action: confirm product ownership, lifecycle funding, interface compatibility and adoption criteria.</small></> : <><Sparkles size={28}/><strong>Select a candidate to evaluate.</strong><p>The decision panel will show evidence and required governance questions.</p></>}</aside></div></section> : null}

      {task === 'risks' ? <section className="panel-card portfolio-decision-workflow"><div className="panel-heading"><div><span className="eyebrow">Risk concentration</span><h2>Portfolio exposure requiring enterprise disposition</h2></div><small>Highest risk first</small></div><div className="portfolio-decision-layout"><div className="risk-heatmap-list">{report.riskHeatmap.map((entry) => <button type="button" key={entry.projectId} className={`risk-row risk-${entry.riskBand} ${selectedRisk?.projectId === entry.projectId ? 'is-selected' : ''}`} onClick={() => setSelectedRiskProjectId(entry.projectId)}><span className="risk-score">{entry.riskScore}</span><span className="risk-main"><strong>{entry.projectName}</strong><small>{entry.criticality} · {entry.drivers.join(' · ') || 'No material drivers'}</small></span><b>{entry.riskBand}</b></button>)}</div><aside className="portfolio-decision-detail">{selectedRisk ? <><AlertTriangle size={27}/><span className="eyebrow">Selected risk</span><h3>{selectedRisk.projectName}</h3><dl><div><dt>Technical debt</dt><dd>{selectedRisk.technicalDebtScore}</dd></div><div><dt>Governance</dt><dd>{selectedRisk.governanceScore}</dd></div><div><dt>Dependency</dt><dd>{selectedRisk.dependencyScore}</dd></div></dl><p>{selectedRisk.drivers.join(' · ') || 'No material risk drivers were recorded.'}</p><small>Disposition requires an accountable owner, target date and accepted residual risk.</small></> : <><AlertTriangle size={28}/><strong>Select a project risk.</strong><p>The detail panel separates risk judgement from the portfolio heatmap.</p></>}</aside></div></section> : null}

      {task === 'portfolio' ? <><section className="panel-card portfolio-map-panel portfolio-overview-map"><div className="panel-heading"><div><span className="eyebrow">Visual portfolio model</span><h2>Projects, standards, risks, reuse and investments</h2></div><div className="conformance-legend"><span>BU</span><span>Project</span><span>Technology</span><span>Standard</span></div></div><ReactFlowProvider><PortfolioVisualGraph visual={visual}/></ReactFlowProvider></section><div className="portfolio-two-column"><article className="portfolio-panel"><div className="panel-heading"><span><AlertTriangle size={17}/><strong>Top risk exposure</strong></span><small>Concentrated architecture and delivery risk</small></div><div className="risk-heatmap-list">{report.riskHeatmap.slice(0, 6).map((entry) => <div key={entry.projectId} className={`risk-row risk-${entry.riskBand}`}><span className="risk-score">{entry.riskScore}</span><span className="risk-main"><strong>{entry.projectName}</strong><small>{entry.drivers.join(' · ')}</small></span><b>{entry.riskBand}</b></div>)}</div></article><article className="portfolio-panel"><div className="panel-heading"><span><RefreshCw size={17}/><strong>Technology standardisation</strong></span><small>Lifecycle posture</small></div><div className="standardization-metrics"><span>Preferred <b>{report.standardization.preferred}</b></span><span>Restricted <b>{report.standardization.restricted}</b></span><span>Deprecated <b>{report.standardization.deprecated}</b></span><span>Unclassified <b>{report.standardization.unclassified}</b></span></div></article></div></> : null}
    </div> : null}
  </section>;
}
