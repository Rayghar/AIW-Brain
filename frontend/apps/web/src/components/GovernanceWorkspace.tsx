import { AlertTriangle, CheckCircle2, GitPullRequestArrow, Network, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import { architectureStages } from '@aiw/domain';
import { useWorkspaceStore } from '../store/workspaceStore';
import { FullJourneyIntelligenceSurface } from './WorkspaceIntelligenceMap';

export function GovernanceWorkspace() {
  const project = useWorkspaceStore((state) => state.project);
  const library = useWorkspaceStore((state) => state.library);
  const findings = useWorkspaceStore((state) => state.findings);
  const impact = useWorkspaceStore((state) => state.impact);
  const requestStageApproval = useWorkspaceStore((state) => state.requestStageApproval);
  const decideStageApproval = useWorkspaceStore((state) => state.decideStageApproval);
  const toggleRulePack = useWorkspaceStore((state) => state.toggleRulePack);

  return (
    <section className="studio-page governance-page">
      <div className="page-heading"><div><span className="eyebrow">Collaborative architecture governance</span><h2>Approvals, policies & impact</h2><p>Bind stage decisions to immutable baselines and evaluate enterprise architecture guardrails.</p></div><div className="health-score"><span>Rules</span><strong>{library.rulePacks.flatMap((pack) => pack.rules).filter((rule) => rule.enabled).length}</strong></div></div>

      <FullJourneyIntelligenceSurface />

      <section className="governance-section governance-section--primary">
        <div className="governance-heading"><ShieldCheck size={18}/><div><h3>Enterprise rule packs</h3><p>Enabled packs contribute deterministic findings to every validation and recommendation cycle.</p></div></div>
        <div className="rulepack-grid">
          {library.rulePacks.map((pack) => {
            const active = project.activeRulePackIds.includes(pack.id);
            return <article key={pack.id}><div><strong>{pack.name}</strong><span>v{pack.version}</span></div><p>{pack.description}</p><small>{pack.rules.length} rules · {pack.status}</small><button onClick={() => toggleRulePack(pack.id)}>{active ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>} {active ? 'Enabled' : 'Disabled'}</button></article>;
          })}
        </div>
      </section>

      <details className="governance-disclosure governance-section">
        <summary><span><GitPullRequestArrow size={18}/><strong>Stage approval gates</strong><small>{project.stageApprovals.filter((item) => item.status === 'pending').length} pending · {project.stageApprovals.filter((item) => item.status === 'approved').length} approved</small></span><em>Open gates</em></summary>
        <p className="governance-disclosure__intro">Approval requests create immutable snapshots. Earlier-stage changes invalidate downstream approvals through impact analysis.</p>
        <div className="approval-list">
          {architectureStages.map((stage) => {
            const approval = [...project.stageApprovals].reverse().find((item) => item.stage === stage);
            return <article key={stage}><div><strong>{stage}</strong><span className={`status-pill ${approval?.status ?? 'not-requested'}`}>{approval?.status ?? 'not requested'}</span></div>{approval?.snapshotId ? <small>Snapshot: {approval.snapshotId}</small> : <small>No governed baseline created.</small>}<div className="approval-actions">{!approval || !['pending','approved'].includes(approval.status) ? <button onClick={() => requestStageApproval(stage)}>Request approval</button> : null}{approval?.status === 'pending' ? <><button onClick={() => decideStageApproval(approval.id, 'approved', 'Architecture Review Board', 'Approved against the submitted baseline.')}>Approve</button><button onClick={() => decideStageApproval(approval.id, 'changes-requested', 'Architecture Review Board', 'Address review findings and resubmit.')}>Request changes</button></> : null}</div></article>;
          })}
        </div>
      </details>

      <details className="governance-disclosure governance-section">
        <summary><span><Network size={18}/><strong>Change impact analysis</strong><small>{impact ? `${impact.affectedNodes.length} affected components` : 'Run from a selected canvas object'}</small></span><em>Inspect impact</em></summary>
        <p className="governance-disclosure__intro">Trace dependent components, decisions and approvals from a selected model object.</p>
        {!impact ? <div className="empty-card">No impact analysis has been run in this session.</div> : <><div className="impact-summary"><span><strong>{impact.affectedNodes.length}</strong> affected components</span><span><strong>{impact.affectedDecisionIds.length}</strong> ADRs</span><span><strong>{impact.affectedApprovalStages.length}</strong> approval stages</span></div><div className="impact-list">{impact.affectedNodes.slice(0,12).map((node) => <article key={node.nodeId}><span><strong>{node.label}</strong><small>{node.stage} · distance {node.distance} · {node.reasons.join(', ')}</small></span></article>)}</div></>}
      </details>

      <section className="governance-section governance-findings-section">
        <div className="governance-heading"><AlertTriangle size={18}/><div><h3>Priority governance findings</h3><p>Highest-severity policy and structural findings requiring disposition.</p></div><span className="governance-count">{findings.length}</span></div>
        <div className="finding-stack governance-finding-stack">{findings.length ? findings.slice(0, 8).map((finding) => <article key={finding.id} className={`finding-card severity-${finding.severity.toLowerCase()}`}><div><AlertTriangle size={15}/><strong>{finding.title}</strong><span>{finding.severity}</span></div><p>{finding.message}</p></article>) : <div className="empty-card"><CheckCircle2 size={17}/> No governance findings.</div>}</div>
        {findings.length > 8 ? <details className="governance-more-findings"><summary>Show {findings.length - 8} additional findings</summary><div className="finding-stack">{findings.slice(8).map((finding) => <article key={finding.id} className={`finding-card severity-${finding.severity.toLowerCase()}`}><div><AlertTriangle size={15}/><strong>{finding.title}</strong><span>{finding.severity}</span></div><p>{finding.message}</p></article>)}</div></details> : null}
      </section>
    </section>
  );
}
