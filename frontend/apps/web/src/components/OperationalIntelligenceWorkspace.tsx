import { Activity, BellRing, CloudDownload, GitPullRequest, Gauge, ShieldCheck, Wrench } from 'lucide-react';
import { useState } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';

type OpsLens = 'evidence' | 'analyse' | 'remediate';

export function OperationalIntelligenceWorkspace() {
  const project = useWorkspaceStore((state) => state.project);
  const runReferenceCollector = useWorkspaceStore((state) => state.runReferenceCollector);
  const deriveReferenceTelemetryTopology = useWorkspaceStore((state) => state.deriveReferenceTelemetryTopology);
  const analyseOperationalPosture = useWorkspaceStore((state) => state.analyseOperationalPosture);
  const createPlan = useWorkspaceStore((state) => state.createOperationalRemediationPlan);
  const submitPlan = useWorkspaceStore((state) => state.submitOperationalRemediationPlan);
  const decidePlan = useWorkspaceStore((state) => state.decideOperationalRemediationPlan);
  const evaluateSlo = useWorkspaceStore((state) => state.evaluateReferenceSlo);
  const [sloResult, setSloResult] = useState('Not evaluated');
  const [lens, setLens] = useState<OpsLens>('evidence');
  const inventory = project.runtimeInventories[0];
  const report = project.operationalDriftReports[0];
  const plan = project.remediationPlans[0];
  const slo = project.serviceLevelObjectives[0];

  return <section className="studio-page operational-intelligence-page operational-intelligence-page--focused">
    <div className="studio-hero operational-intelligence-hero">
      <div><span className="eyebrow">Operational intelligence</span><h1>Operational architecture intelligence</h1><p>Move from observed evidence to drift analysis and a governed remediation decision without leaving the topology workflow.</p></div>
      <div className="hero-metric"><Activity size={22}/><strong>{report ? `${report.findings.length} operational findings` : 'Awaiting evidence'}</strong><small>Current operational posture</small></div>
    </div>

    <nav className="operational-lens-tabs" aria-label="Operational intelligence workflow">
      <button type="button" className={lens === 'evidence' ? 'active' : ''} onClick={() => setLens('evidence')}><CloudDownload size={15}/><span><strong>1. Observe</strong><small>Collectors and topology</small></span></button>
      <button type="button" className={lens === 'analyse' ? 'active' : ''} onClick={() => setLens('analyse')}><Gauge size={15}/><span><strong>2. Analyse</strong><small>Drift and SLOs</small></span></button>
      <button type="button" className={lens === 'remediate' ? 'active' : ''} onClick={() => setLens('remediate')}><Wrench size={15}/><span><strong>3. Remediate</strong><small>Plan and delivery</small></span></button>
    </nav>

    {lens === 'evidence' ? <div className="operational-lens-grid">
      <article className="governance-card operational-action-card">
        <div className="card-title"><CloudDownload size={18}/><div><strong>Scheduled collectors</strong><small>AWS, Azure, GCP and Kubernetes adapters</small></div></div>
        <dl className="detail-list"><div><dt>Configured</dt><dd>{project.inventoryCollectors.length}</dd></div><div><dt>Runs</dt><dd>{project.collectorRuns.length}</dd></div><div><dt>Latest status</dt><dd>{project.collectorRuns[0]?.status ?? 'Never run'}</dd></div></dl>
        <button className="primary-action" onClick={runReferenceCollector}>Run sample collector</button>
      </article>
      <article className="governance-card operational-action-card">
        <div className="card-title"><Activity size={18}/><div><strong>Telemetry topology</strong><small>Derive service dependencies from spans</small></div></div>
        <dl className="detail-list"><div><dt>Inventories</dt><dd>{project.runtimeInventories.length}</dd></div><div><dt>Latest resources</dt><dd>{inventory?.resources.length ?? 0}</dd></div><div><dt>Relationships</dt><dd>{inventory?.relationships.length ?? 0}</dd></div></dl>
        <button className="primary-action" onClick={deriveReferenceTelemetryTopology}>Derive sample topology</button>
      </article>
      <aside className="operational-guidance-card"><ShieldCheck size={20}/><div><strong>Evidence remains non-authoritative</strong><p>Observed resources and inferred relationships are evidence until reviewed against the intended architecture.</p></div></aside>
    </div> : null}

    {lens === 'analyse' ? <div className="operational-lens-grid">
      <article className="governance-card operational-action-card">
        <div className="card-title"><Gauge size={18}/><div><strong>Operational drift</strong><small>Cost, capacity and resilience</small></div></div>
        <dl className="detail-list"><div><dt>Cost</dt><dd>{report?.summary.cost ?? 0}</dd></div><div><dt>Capacity</dt><dd>{report?.summary.capacity ?? 0}</dd></div><div><dt>Resilience</dt><dd>{report?.summary.resilience ?? 0}</dd></div></dl>
        <button className="primary-action" disabled={!inventory} onClick={() => inventory && analyseOperationalPosture(inventory.id)}>Analyse operational posture</button>
      </article>
      <article className="governance-card operational-action-card">
        <div className="card-title"><BellRing size={18}/><div><strong>SLO & alert policy</strong><small>{slo?.name ?? 'No SLO configured'}</small></div></div>
        <dl className="detail-list"><div><dt>Target</dt><dd>{slo?.target ?? '—'}</dd></div><div><dt>Window</dt><dd>{slo?.window ?? '—'}</dd></div><div><dt>Evaluation</dt><dd>{sloResult}</dd></div></dl>
        <button className="primary-action" disabled={!slo} onClick={() => { if (!slo) return; const result=evaluateSlo(slo.id, 99.7); setSloResult(result ? `${result.status} / ${result.errorBudgetRemainingPercent.toFixed(1)}%` : 'Unavailable'); }}>Evaluate sample signal</button>
      </article>
      <section className="panel-card operational-decision-queue">
        <div className="panel-heading"><div><span className="eyebrow">Findings and actions</span><h2>Operational decision queue</h2></div><ShieldCheck size={20}/></div>
        {report?.findings.length ? <div className="finding-stack">{report.findings.slice(0, 8).map((finding) => <div className={`finding-card severity-${finding.severity.toLowerCase()}`} key={finding.id}><div><Activity size={16}/><div><strong>{finding.title}</strong><p>{finding.message}</p><small>{finding.recommendation}</small></div><span>{finding.severity}</span></div></div>)}</div> : <div className="empty-card">Run a collector or derive telemetry topology, then analyse the latest inventory.</div>}
      </section>
    </div> : null}

    {lens === 'remediate' ? <div className="operational-lens-grid">
      <article className="governance-card operational-action-card">
        <div className="card-title"><Wrench size={18}/><div><strong>Controlled remediation</strong><small>Human-approved change plan</small></div></div>
        <dl className="detail-list"><div><dt>Status</dt><dd>{plan?.status ?? 'No plan'}</dd></div><div><dt>Actions</dt><dd>{plan?.actions.length ?? 0}</dd></div><div><dt>High risk</dt><dd>{plan?.actions.filter((item) => item.risk === 'high').length ?? 0}</dd></div></dl>
        {!plan ? <button className="primary-action" disabled={!report} onClick={() => report && createPlan(report.id)}>Create remediation plan</button> : plan.status === 'draft' ? <button className="primary-action" onClick={() => submitPlan(plan.id)}>Submit for approval</button> : plan.status === 'pending-approval' ? <div className="button-row"><button className="primary-action" onClick={() => decidePlan(plan.id, true)}>Approve</button><button onClick={() => decidePlan(plan.id, false)}>Reject</button></div> : null}
      </article>
      <article className="governance-card operational-action-card">
        <div className="card-title"><GitPullRequest size={18}/><div><strong>Repository remediation</strong><small>Provider-backed PR preview</small></div></div>
        <dl className="detail-list"><div><dt>Bindings</dt><dd>{project.repositoryBindings.length}</dd></div><div><dt>PR records</dt><dd>{project.repositoryPullRequests.length}</dd></div><div><dt>Broker</dt><dd>{project.eventBrokerSettings.adapter}</dd></div></dl>
        <p className="card-note">Generated files are prepared for reviewed pull-request workflows. No provider mutation is applied without explicit approval.</p>
      </article>
      <aside className="operational-guidance-card"><GitPullRequest size={20}/><div><strong>Preview before provider change</strong><p>Every remediation remains a reviewable change set. AIW does not mutate repositories or runtime providers without explicit approval.</p></div></aside>
    </div> : null}
  </section>;
}
