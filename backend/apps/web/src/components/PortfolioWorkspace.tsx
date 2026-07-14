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
  AlertTriangle, BadgeDollarSign, Boxes, Building2, CheckCircle2, CircleGauge, GitBranch,
  GitCompareArrows, Layers3, Network, Plus, RefreshCw, Route, ShieldAlert, Workflow,
  Landmark, Factory, Waypoints, Sparkles, GitPullRequestArrow, ShieldCheck,
} from 'lucide-react';
import { sampleEnterpriseCatalog, samplePortfolioProjects } from '@aiw/domain';
import {
  analyseEnterpriseStandardsImpact,
  buildPortfolioIntelligence,
  buildPortfolioVisualModel,
  type PortfolioVisualNode,
} from '@aiw/engine';
import { useWorkspaceStore } from '../store/workspaceStore';

type View = 'intelligence' | 'standards-impact' | 'branches';

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
  return (
    <div className={`portfolio-visual-node portfolio-visual-node--${data.kind} ${data.focused ? 'is-focused' : ''} ${selected ? 'is-selected' : ''} ${data.severity ? `severity-${data.severity.toLowerCase()}` : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="portfolio-visual-node__head"><span><Icon size={15}/></span><small>{data.kind.replaceAll('-', ' ')}</small>{typeof data.score === 'number' ? <b>{Math.round(data.score)}</b> : null}</div>
      <strong>{data.label}</strong>
      <p>{data.summary}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
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

  return (
    <div className="portfolio-visual-canvas" aria-label="Interactive portfolio architecture visual model">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.16, maxZoom: 0.95 }} minZoom={0.15} maxZoom={1.4} nodesDraggable={false} nodesConnectable={false} onlyRenderVisibleElements>
        <Background gap={28} size={1}/>
        <MiniMap pannable zoomable/>
        <Controls showInteractive={false}/>
      </ReactFlow>
    </div>
  );
}

export function PortfolioWorkspace() {
  const [name, setName] = useState('');
  const [view, setView] = useState<View>('intelligence');
  const [standardId, setStandardId] = useState('STD-RDBMS-MYSQL-LEGACY');
  const [taskFocus, setTaskFocus] = useState<'all' | 'reuse' | 'risks'>(() => {
    const saved = typeof window === 'undefined' ? null : window.sessionStorage.getItem('aiw.activeRoleTask');
    return saved === 'reuse' || saved === 'risks' ? saved : 'all';
  });
  useEffect(() => {
    const listener = (event: Event) => {
      const taskId = (event as CustomEvent<{ taskId?: string }>).detail?.taskId;
      if (taskId === 'reuse') { setView('intelligence'); setTaskFocus('reuse'); }
      else if (taskId === 'risks') { setView('intelligence'); setTaskFocus('risks'); }
      else if (taskId === 'portfolio') { setView('intelligence'); setTaskFocus('all'); }
      else if (taskId === 'standards') { setView('standards-impact'); setTaskFocus('all'); }
    };
    window.addEventListener('aiw:role-task', listener);
    return () => window.removeEventListener('aiw:role-task', listener);
  }, []);
  const project = useWorkspaceStore((state) => state.project);
  const branches = useWorkspaceStore((state) => state.branches);
  const createBranch = useWorkspaceStore((state) => state.createBranch);
  const switchBranch = useWorkspaceStore((state) => state.switchBranch);
  const compareWithBranch = useWorkspaceStore((state) => state.compareWithBranch);

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

  return (
    <section className="studio-page governance-page portfolio-intelligence-page">
      <div className="page-heading">
        <div><span className="eyebrow">Enterprise architecture portfolio</span><h2>Portfolio intelligence & standards impact</h2><p>Explore cross-project dependencies, enterprise standards, technology fragmentation, reuse opportunities, risk concentration and migration waves as an interactive architecture model.</p></div>
        <div className="health-score"><span>Portfolio score</span><strong>{Math.round((report.summary.standardizationScore + report.summary.complianceScore + (100 - report.riskHeatmap.reduce((sum, item) => sum + item.riskScore, 0) / Math.max(1, report.riskHeatmap.length))) / 3)}</strong></div>
      </div>

      <div className="workspace-tabs portfolio-tabs">
        {taskFocus !== 'all' ? <span className="task-filter-chip">Focused lens: {taskFocus === 'reuse' ? 'Reuse opportunities' : 'Portfolio risks'} <button type="button" onClick={() => setTaskFocus('all')}>Clear</button></span> : null}
        <button className={view === 'intelligence' ? 'active' : ''} onClick={() => setView('intelligence')}><CircleGauge size={15}/> Intelligence</button>
        <button className={view === 'standards-impact' ? 'active' : ''} onClick={() => setView('standards-impact')}><Waypoints size={15}/> Standards impact</button>
        <button className={view === 'branches' ? 'active' : ''} onClick={() => setView('branches')}><GitBranch size={15}/> Branches & alternatives</button>
      </div>

      {view === 'branches' ? (
        <>
          <div className="branch-create-card">
            <div><GitBranch size={18}/><span><strong>Create an alternative</strong><small>Fork the current revision into a separately governed design branch.</small></span></div>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Event-driven alternative" />
            <button className="button button--primary" onClick={() => { createBranch(name); setName(''); }}><Plus size={15}/> Create branch</button>
          </div>
          <div className="branch-grid">
            {branches.map((branch) => {
              const active = branch.metadata.id === project.branch.id;
              const approved = branch.project.stageApprovals.filter((item) => item.status === 'approved').length;
              return (
                <article key={branch.metadata.id} className={active ? 'branch-card active' : 'branch-card'}>
                  <div className="branch-card__head"><Workflow size={18}/><span><strong>{branch.metadata.name}</strong><small>{branch.metadata.status} · base revision {branch.metadata.baseRevision}</small></span>{active ? <b>ACTIVE</b> : null}</div>
                  <p>{branch.metadata.description || 'Alternative architecture branch.'}</p>
                  <div className="branch-metrics"><span><strong>{branch.project.nodes.length}</strong> entities</span><span><strong>{branch.project.decisions.length}</strong> ADRs</span><span><strong>{approved}/6</strong> stages approved</span></div>
                  <div className="branch-actions">
                    <button disabled={active} onClick={() => switchBranch(branch.metadata.id)}><Layers3 size={14}/> Open</button>
                    <button disabled={active} onClick={() => compareWithBranch(branch.metadata.id)}><GitCompareArrows size={14}/> Compare with active</button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : view === 'standards-impact' ? (
        <div className="portfolio-intelligence-content">
          <section className="panel-card standards-impact-panel">
            <div className="panel-heading"><div><span className="eyebrow">Enterprise standards impact analysis</span><h2>Change blast radius before approval</h2><p>Simulate a standard lifecycle change and see affected projects, technologies, dependencies and migration waves. No standards, projects or repositories are changed automatically.</p></div><select value={standardId} onChange={(event) => setStandardId(event.target.value)}>{sampleEnterpriseCatalog.technologyStandards.map((standard) => <option key={standard.id} value={standard.id}>{standard.technologyName} · {standard.status}</option>)}</select></div>
            <div className="portfolio-summary-grid">
              <article><Boxes/><span>Affected projects<strong>{standardsImpact.summary.affectedProjects}</strong><small>{standardsImpact.summary.criticalImpacts} critical</small></span></article>
              <article><Network/><span>Dependency links<strong>{standardsImpact.affectedDependencyIds.length}</strong><small>consumer coordination needed</small></span></article>
              <article><Factory/><span>Technologies<strong>{standardsImpact.summary.affectedTechnologies}</strong><small>direct usage instances</small></span></article>
              <article><Workflow/><span>Migration effort<strong>{standardsImpact.summary.estimatedEffortDays}</strong><small>estimated days</small></span></article>
              <article><ShieldCheck/><span>Governance<strong>Required</strong><small>human approval only</small></span></article>
              <article><GitPullRequestArrow/><span>Mutation<strong>Disabled</strong><small>analysis only</small></span></article>
            </div>
          </section>

          {taskFocus === 'all' ? <section className="panel-card portfolio-map-panel">
            <div className="panel-heading"><div><span className="eyebrow">Visual standards blast radius</span><h2>Affected portfolio graph</h2></div><div className="conformance-legend"><span>Focused</span><span>Project</span><span>Standard</span><span>Risk</span></div></div>
            <ReactFlowProvider><PortfolioVisualGraph visual={standardsImpact.visualModel}/></ReactFlowProvider>
          </section> : null}

          <div className="portfolio-two-column">
            <article className={`portfolio-panel ${taskFocus === 'reuse' ? 'task-lens-hidden' : ''}`}>
              <div className="panel-heading"><span><AlertTriangle size={17}/><strong>Affected projects</strong></span><small>Ranked by standard exposure, criticality and dependency fan-in.</small></div>
              <div className="risk-heatmap-list">
                {standardsImpact.affectedProjects.map((entry) => (
                  <div key={entry.projectId} className={`risk-row risk-${entry.impactLevel}`}>
                    <span className="risk-score">{entry.riskScore}</span>
                    <span className="risk-main"><strong>{entry.projectName}</strong><small>{entry.businessUnit} · {entry.affectedTechnologies.join(', ')}</small></span>
                    <span className="risk-bars"><i style={{ width: `${Math.min(100, entry.dependencyFanIn * 25)}%` }}/><i style={{ width: `${Math.min(100, entry.affectedNodeIds.length * 35)}%` }}/></span>
                    <b>{entry.impactLevel}</b>
                  </div>
                ))}
              </div>
            </article>
            <article className="portfolio-panel">
              <div className="panel-heading"><span><Workflow size={17}/><strong>Migration waves</strong></span><small>Reviewable sequencing plan. Human approval required.</small></div>
              <div className="roadmap-list compact-roadmap">
                {standardsImpact.migrationWaves.map((wave, index) => <div key={wave.id} className="roadmap-item priority-now"><span className="roadmap-index">{index + 1}</span><span><strong>{wave.title}</strong><small>{wave.projectIds.length} project(s) · {wave.estimatedEffortDays} days</small><p>{wave.sequencingRationale}</p></span><span className="roadmap-benefit">Approval<small>required</small></span></div>)}
              </div>
            </article>
          </div>
        </div>
      ) : (
        <div className="portfolio-intelligence-content">
          <div className="portfolio-summary-grid">
            <article><Building2/><span>Projects<strong>{report.summary.projects}</strong><small>{report.summary.highRiskProjects} high-risk</small></span></article>
            <article><Network/><span>Dependencies<strong>{report.summary.totalDependencies}</strong><small>{report.dependencyGraph.singlePointsOfDependency.length} concentration risk(s)</small></span></article>
            <article><CheckCircle2/><span>Standards score<strong>{report.summary.standardizationScore}%</strong><small>{report.standardization.findings.length} action(s)</small></span></article>
            <article><ShieldAlert/><span>Reference compliance<strong>{report.summary.complianceScore}%</strong><small>{report.compliance.filter((item) => !item.compliant).length} gaps</small></span></article>
            <article><BadgeDollarSign/><span>Monthly variance<strong>{money(report.costs.monthlyVariance, report.costs.currency)}</strong><small>{money(report.costs.annualTechnicalDebtImpact, report.costs.currency)} annual debt impact</small></span></article>
            <article><Boxes/><span>Reusable blocks<strong>{report.reuse.usages.reduce((sum, item) => sum + item.adoptionCount, 0)}</strong><small>{report.reuse.duplicateCandidates.length} reuse candidates</small></span></article>
          </div>

          <section className="panel-card portfolio-map-panel">
            <div className="panel-heading"><div><span className="eyebrow">Visual portfolio model</span><h2>Projects, standards, risks, reuse and investment priorities</h2></div><div className="conformance-legend"><span>BU</span><span>Project</span><span>Technology</span><span>Standard</span></div></div>
            <ReactFlowProvider><PortfolioVisualGraph visual={visual}/></ReactFlowProvider>
          </section>

          <div className="portfolio-two-column">
            <article className="portfolio-panel">
              <div className="panel-heading"><span><AlertTriangle size={17}/><strong>Risk and technical-debt heatmap</strong></span><small>Highest combined architecture, governance, operational and dependency exposure first.</small></div>
              <div className="risk-heatmap-list">
                {report.riskHeatmap.map((entry) => (
                  <div key={entry.projectId} className={`risk-row risk-${entry.riskBand}`}>
                    <span className="risk-score">{entry.riskScore}</span>
                    <span className="risk-main"><strong>{entry.projectName}</strong><small>{entry.criticality} · {entry.drivers.join(' · ') || 'No material drivers'}</small></span>
                    <span className="risk-bars"><i style={{ width: `${entry.technicalDebtScore}%` }}/><i style={{ width: `${entry.governanceScore}%` }}/><i style={{ width: `${entry.dependencyScore}%` }}/></span>
                    <b>{entry.riskBand}</b>
                  </div>
                ))}
              </div>
            </article>

            <article className="portfolio-panel">
              <div className="panel-heading"><span><Route size={17}/><strong>Cross-project dependency map</strong></span><small>Inbound concentration identifies portfolio-wide failure and change impact.</small></div>
              <div className="dependency-list">
                {report.dependencyGraph.dependencies.map((dependency) => {
                  const source = report.dependencyGraph.projects.find((item) => item.id === dependency.sourceProjectId)?.name ?? dependency.sourceProjectId;
                  const target = report.dependencyGraph.projects.find((item) => item.id === dependency.targetProjectId)?.name ?? dependency.targetProjectId;
                  return <div key={dependency.id}><span><strong>{source}</strong><small>{dependency.interfaceName} · {dependency.kind}</small></span><b>→</b><span><strong>{target}</strong><small>{dependency.criticality} criticality · {dependency.dataClassification}</small></span></div>;
                })}
              </div>
            </article>
          </div>

          <div className="portfolio-two-column">
            <article className="portfolio-panel">
              <div className="panel-heading"><span><RefreshCw size={17}/><strong>Technology standardization</strong></span><small>Preferred, restricted, deprecated and unclassified technologies.</small></div>
              <div className="standardization-metrics"><span>Preferred <b>{report.standardization.preferred}</b></span><span>Restricted <b>{report.standardization.restricted}</b></span><span>Deprecated <b>{report.standardization.deprecated}</b></span><span>Unclassified <b>{report.standardization.unclassified}</b></span></div>
              <div className="finding-list compact">
                {report.standardization.findings.slice(0, 8).map((finding) => <div key={finding.id} className={`finding-${finding.severity.toLowerCase()}`}><span><strong>{finding.technology}</strong><small>{finding.projectId} · {finding.status}</small></span><p>{finding.recommendation}</p></div>)}
              </div>
            </article>

            <article className="portfolio-panel">
              <div className="panel-heading"><span><BadgeDollarSign size={17}/><strong>Portfolio cost intelligence</strong></span><small>Architecture baseline, discovered runtime cost and technical-debt impact.</small></div>
              <div className="cost-total"><span>Expected monthly<strong>{money(report.costs.expectedMonthlyCost, report.costs.currency)}</strong></span><span>Actual monthly<strong>{money(report.costs.actualMonthlyCost, report.costs.currency)}</strong></span><span>Variance<strong>{money(report.costs.monthlyVariance, report.costs.currency)}</strong></span></div>
              <table className="portfolio-table"><thead><tr><th>Project</th><th>Expected</th><th>Actual</th><th>Variance</th></tr></thead><tbody>{report.costs.byProject.map((item) => <tr key={item.projectId}><td>{report.dependencyGraph.projects.find((projectItem) => projectItem.id === item.projectId)?.name}</td><td>{money(item.expectedMonthlyCost, report.costs.currency)}</td><td>{money(item.actualMonthlyCost, report.costs.currency)}</td><td>{money(item.variance, report.costs.currency)}</td></tr>)}</tbody></table>
            </article>
          </div>

          <article className="portfolio-panel roadmap-panel">
            <div className="panel-heading"><span><Workflow size={17}/><strong>Recommended investment roadmap</strong></span><small>Prioritized from architecture risk, standards, cost, compliance and reuse evidence.</small></div>
            <div className="roadmap-list">
              {report.roadmap.map((item, index) => (
                <div key={item.id} className={`roadmap-item priority-${item.priority}`}>
                  <span className="roadmap-index">{index + 1}</span>
                  <span><b>{item.priority.toUpperCase()}</b><strong>{item.title}</strong><small>{item.category} · {item.projectIds.length} project(s) · {item.estimatedEffortDays} estimated days</small><p>{item.rationale}</p></span>
                  <span className="roadmap-benefit">{money(item.estimatedAnnualBenefit, report.costs.currency)}<small>estimated annual benefit</small></span>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
