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

      <section className="governance-section">
        <div className="governance-heading"><ShieldCheck size={18}/><div><h3>Enterprise rule packs</h3><p>Enabled packs contribute deterministic findings to every validation and recommendation cycle.</p></div></div>
        <div className="rulepack-grid">
          {library.rulePacks.map((pack) => {
            const active = project.activeRulePackIds.includes(pack.id);
            return <article key={pack.id}><div><strong>{pack.name}</strong><span>v{pack.version}</span></div><p>{pack.description}</p><small>{pack.rules.length} rules · {pack.status}</small><button onClick={() => toggleRulePack(pack.id)}>{active ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>} {active ? 'Enabled' : 'Disabled'}</button></article>;
          })}
        </div>
      </section>

      <section className="governance-section">
        <div className="governance-heading"><GitPullRequestArrow size={18}/><div><h3>Stage approval gates</h3><p>Approval requests create immutable snapshots. Earlier-stage changes can invalidate downstream approvals through impact analysis.</p></div></div>
        <div className="approval-list">
          {architectureStages.map((stage) => {
            const approval = [...project.stageApprovals].reverse().find((item) => item.stage === stage);
            return <article key={stage}><div><strong>{stage}</strong><span className={`status-pill ${approval?.status ?? 'not-requested'}`}>{approval?.status ?? 'not requested'}</span></div>{approval?.snapshotId ? <small>Snapshot: {approval.snapshotId}</small> : <small>No governed baseline created.</small>}<div className="approval-actions">{!approval || !['pending','approved'].includes(approval.status) ? <button onClick={() => requestStageApproval(stage)}>Request approval</button> : null}{approval?.status === 'pending' ? <><button onClick={() => decideStageApproval(approval.id, 'approved', 'Architecture Review Board', 'Approved against the submitted baseline.')}>Approve</button><button onClick={() => decideStageApproval(approval.id, 'changes-requested', 'Architecture Review Board', 'Address review findings and resubmit.')}>Request changes</button></> : null}</div></article>;
          })}
        </div>
      </section>

      <section className="governance-section">
        <div className="governance-heading"><Network size={18}/><div><h3>Change impact analysis</h3><p>Select a canvas component and invoke impact analysis from the canvas toolbar to trace dependent components, decisions and approvals.</p></div></div>
        {!impact ? <div className="empty-card">No impact analysis has been run in this session.</div> : <><div className="impact-summary"><span><strong>{impact.affectedNodes.length}</strong> affected components</span><span><strong>{impact.affectedDecisionIds.length}</strong> ADRs</span><span><strong>{impact.affectedApprovalStages.length}</strong> approval stages</span></div><div className="impact-list">{impact.affectedNodes.slice(0,20).map((node) => <article key={node.nodeId}><span><strong>{node.label}</strong><small>{node.stage} · distance {node.distance} · {node.reasons.join(', ')}</small></span></article>)}</div></>}
      </section>

      <section className="governance-section">
        <div className="governance-heading"><AlertTriangle size={18}/><div><h3>Governance findings</h3><p>Rule-pack findings are shown alongside structural validation findings.</p></div></div>
        <div className="finding-stack">{findings.length ? findings.map((finding) => <article key={finding.id} className={`finding-card severity-${finding.severity.toLowerCase()}`}><div><AlertTriangle size={15}/><strong>{finding.title}</strong><span>{finding.severity}</span></div><p>{finding.message}</p></article>) : <div className="empty-card"><CheckCircle2 size={17}/> No governance findings.</div>}</div>
      </section>
    </section>
  );
}
