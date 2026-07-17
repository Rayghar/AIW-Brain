import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  CircleDotDashed,
  Clock3,
  FileCheck2,
  FileSearch,
  GitCompareArrows,
  Link2,
  MessageSquareWarning,
  ScrollText,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { createArchitectureViewbook, resolveViewVisibleEdgeIds, resolveViewVisibleNodeIds } from '@aiw/modelling';
import { useWorkspaceStore } from '../store/workspaceStore';
import { ArchitectureViewbook } from '../features/canvas/ArchitectureViewbook';
import type { ProjectReviewAction } from '@aiw/domain';

type ReviewTaskFocus = 'review' | 'findings' | 'evidence' | 'audit' | 'disposition';

function severityTone(severity: string) {
  if (severity === 'HARD' || severity === 'critical' || severity === 'high') return 'risk';
  if (severity === 'warning' || severity === 'medium' || severity === 'SIGNIFICANT') return 'warn';
  return 'neutral';
}

function readableDate(value?: string) {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function ReviewerAssuranceStudio() {
  const project = useWorkspaceStore((state) => state.project) as any;
  const findings = useWorkspaceStore((state) => state.findings) as any[];
  const conformanceEvidence = useWorkspaceStore((state) => state.conformanceEvidence);
  const recentActivity = useWorkspaceStore((state) => state.recentActivity);
  const lifecycleArtifacts = useWorkspaceStore((state) => state.lifecycleArtifacts);
  const decideStageApproval = useWorkspaceStore((state) => state.decideStageApproval);
  const recordProjectReviewDecision = useWorkspaceStore((state) => state.recordProjectReviewDecision);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(() => {
    const approval = [...(project.stageApprovals ?? [])].reverse().find((item: any) => item.stage === 'validationRealization');
    return approval?.id ?? null;
  });
  const [comment, setComment] = useState('');
  const candidateNodes = useMemo(() => (project.nodes ?? []).filter((node: any) => node.properties?.candidateAuthority === 'candidate'), [project.nodes]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(() => candidateNodes[0]?.id ?? '');
  const [decisionPending, setDecisionPending] = useState(false);
  const [viewbookOpen, setViewbookOpen] = useState(false);
  const [taskFocus, setTaskFocus] = useState<ReviewTaskFocus>(() => {
    if (typeof window === 'undefined') return 'review';
    const saved = window.sessionStorage.getItem('aiw.activeRoleTask');
    return saved === 'findings' || saved === 'evidence' || saved === 'audit' || saved === 'disposition' ? saved : 'review';
  });

  useEffect(() => {
    const listener = (event: Event) => {
      const taskId = (event as CustomEvent<{ taskId?: string }>).detail?.taskId;
      if (taskId === 'review' || taskId === 'findings' || taskId === 'evidence' || taskId === 'audit' || taskId === 'disposition') setTaskFocus(taskId);
    };
    window.addEventListener('aiw:role-task', listener);
    return () => window.removeEventListener('aiw:role-task', listener);
  }, []);

  const approvals = useMemo(() => [...(project.stageApprovals ?? [])].reverse(), [project.stageApprovals]);
  const selectedApproval = approvals.find((item: any) => item.id === selectedApprovalId) ?? approvals[0] ?? null;
  const views = useMemo(() => createArchitectureViewbook(project, 'reviewer-assurance'), [project]);
  const evidenceRows = useMemo(() => {
    const modelRows = [
      { id: 'canonical-model', type: 'Canonical model', source: 'AIW canonical graph', collectedAt: project.updatedAt ?? project.createdAt, detail: `${project.nodes?.length ?? 0} objects · ${project.edges?.length ?? 0} relationships`, status: project.nodes?.length ? 'available' : 'missing' },
      { id: 'interfaces', type: 'Interface register', source: 'Governed interface contracts', collectedAt: project.updatedAt ?? project.createdAt, detail: `${project.interfaces?.length ?? 0} contract(s)`, status: project.interfaces?.length ? 'available' : 'attention' },
      { id: 'viewbook', type: 'Architecture Viewbook', source: 'Canonical projections', collectedAt: project.updatedAt ?? project.createdAt, detail: `${views.length} semantic view(s)`, status: views.length === 10 ? 'available' : 'attention' },
      ...lifecycleArtifacts.map((artifact) => ({ id: artifact.id, type: artifact.name, source: `${artifact.source} · ${artifact.type}`, collectedAt: artifact.generatedAt, detail: `Revision ${artifact.revision} · ${artifact.status}`, status: artifact.status === 'planned' ? 'attention' : 'available' })),
      ...conformanceEvidence.map((evidence) => ({ id: evidence.id, type: evidence.sourceType.replaceAll('-', ' '), source: evidence.repositoryUrl ?? evidence.environment ?? 'Conformance evidence', collectedAt: evidence.collectedAt, detail: [evidence.commitSha, evidence.workflowRunId].filter(Boolean).join(' · ') || 'Tenant-scoped evidence envelope', status: 'available' })),
    ];
    return modelRows;
  }, [conformanceEvidence, lifecycleArtifacts, project, views.length]);

  const auditRows = useMemo(() => {
    const approvalEvents = approvals.flatMap((approval: any) => {
      const rows: Array<{ id: string; at: string; actor: string; action: string; detail: string; outcome: string }> = [];
      if (approval.requestedAt) rows.push({ id: `${approval.id}-requested`, at: approval.requestedAt, actor: approval.requestedBy ?? 'Architecture owner', action: 'Baseline submitted', detail: approval.stage, outcome: 'pending' });
      if (approval.decidedAt) rows.push({ id: `${approval.id}-decided`, at: approval.decidedAt, actor: approval.reviewer ?? 'Reviewer', action: 'Disposition recorded', detail: approval.comments?.at(-1) ?? approval.stage, outcome: approval.status });
      return rows;
    });
    const activityRows = recentActivity.map((item) => ({ id: item.id, at: item.createdAt, actor: item.actorId, action: item.type.replaceAll('-', ' '), detail: item.summary, outcome: `revision ${item.revision}` }));
    return [...approvalEvents, ...activityRows].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 40);
  }, [approvals, recentActivity]);

  const decide = (status: 'approved' | 'changes-requested' | 'rejected') => {
    if (!selectedApproval) return;
    decideStageApproval(selectedApproval.id, status, 'Architecture Reviewer', comment || undefined);
    setComment('');
  };

  const recordCandidateDecision = async (action: ProjectReviewAction) => {
    const candidateAction = ['approve-project-candidate', 'return-with-comments', 'reject-candidate', 'request-evidence', 'request-regeneration'].includes(action);
    const targetType = candidateAction && selectedCandidateId ? 'candidate' : 'project';
    const targetId = targetType === 'candidate' ? selectedCandidateId : project.id;
    setDecisionPending(true);
    const saved = await recordProjectReviewDecision(targetType, targetId, action, comment);
    setDecisionPending(false);
    if (saved) setComment('');
  };

  const selectedTaskLabel = taskFocus === 'evidence' ? 'Evidence Ledger' : taskFocus === 'audit' ? 'Review Audit' : taskFocus === 'disposition' ? 'Disposition' : taskFocus === 'findings' ? 'Findings' : 'Review Queue';

  return (
    <section className="assurance-studio" data-testid="assurance-studio" data-review-focus={taskFocus} aria-label="Architecture Assurance Studio">
      <header className="assurance-studio__header">
        <div>
          <span className="eyebrow"><ShieldCheck size={14}/> Independent assurance · {selectedTaskLabel}</span>
          <h1>Architecture Assurance Studio</h1>
          <p>Inspect the submitted baseline, findings, evidence and audit trail before recording an independent disposition. Producer actions are intentionally absent.</p>
        </div>
        <div className="assurance-studio__header-actions">
          <button type="button" onClick={() => setViewbookOpen(true)}><BookOpenCheck size={15}/> Open Viewbook</button>
          <button type="button" onClick={() => setWorkspaceMode('comparison')}><GitCompareArrows size={15}/> Compare baseline</button>
        </div>
      </header>

      <div className="assurance-studio__status-strip">
        <div><span>Assigned baselines</span><strong>{approvals.length}</strong><small>{approvals.filter((item: any) => item.status === 'pending').length} pending</small></div>
        <div><span>Open findings</span><strong>{findings.length}</strong><small>{findings.filter((item) => severityTone(item.severity) === 'risk').length} hard or high</small></div>
        <div><span>Evidence records</span><strong>{evidenceRows.length}</strong><small>{evidenceRows.filter((item) => item.status !== 'available').length} need attention</small></div>
        <div><span>Current disposition</span><strong>{selectedApproval?.status ?? 'not submitted'}</strong><small>{selectedApproval?.stage ?? 'Review baseline'}</small></div>
      </div>

      {taskFocus === 'evidence' ? (
        <main className="assurance-focus-panel assurance-evidence-ledger" aria-label="Reviewer evidence ledger">
          <div className="assurance-pane-heading"><span>Evidence ledger</span><strong>{evidenceRows.length} records</strong></div>
          <p className="assurance-focus-intro">Evidence is presented with source, freshness and revision context. A record being present does not imply that it is sufficient for approval.</p>
          <div className="assurance-ledger-table" role="table" aria-label="Architecture review evidence">
            <div className="assurance-ledger-row assurance-ledger-row--head" role="row"><span>Evidence</span><span>Source</span><span>Freshness</span><span>Posture</span></div>
            {evidenceRows.map((row) => <div key={row.id} className="assurance-ledger-row" role="row">
              <span><FileSearch size={15}/><span><strong>{row.type}</strong><small>{row.detail}</small></span></span>
              <span><Link2 size={14}/>{row.source}</span>
              <span><Clock3 size={14}/>{readableDate(row.collectedAt)}</span>
              <b className={`evidence-status evidence-status--${row.status}`}>{row.status}</b>
            </div>)}
          </div>
        </main>
      ) : taskFocus === 'audit' ? (
        <main className="assurance-focus-panel assurance-audit-timeline" aria-label="Review audit trail">
          <div className="assurance-pane-heading"><span>Review audit trail</span><strong>{auditRows.length} events</strong></div>
          <p className="assurance-focus-intro">The timeline combines project activity and governed approval events so reviewers can establish who changed what, when and against which revision.</p>
          <div className="assurance-audit-list">
            {auditRows.length ? auditRows.map((row) => <article key={row.id}>
              <span className="assurance-audit-icon"><ScrollText size={15}/></span>
              <div><strong>{row.action}</strong><p>{row.detail}</p><small>{row.actor} · {readableDate(row.at)}</small></div>
              <b>{row.outcome}</b>
            </article>) : <div className="assurance-empty"><Activity size={24}/><strong>No review activity has been retained yet.</strong><p>Submitting a baseline or recording a governed disposition will create auditable events.</p></div>}
          </div>
        </main>
      ) : (
        <div className={`assurance-studio__layout assurance-studio__layout--${taskFocus}`}>
          {taskFocus !== 'findings' ? <aside className="assurance-queue" aria-label="Assigned review queue">
            <div className="assurance-pane-heading"><span>Review queue</span><strong>{approvals.length || 0}</strong></div>
            {approvals.length ? approvals.map((approval: any) => (
              <button key={approval.id} type="button" className={approval.id === selectedApproval?.id ? 'is-active' : ''} onClick={() => setSelectedApprovalId(approval.id)}>
                <span className={`status-${approval.status}`}>{approval.status === 'approved' ? <BadgeCheck size={14}/> : approval.status === 'pending' ? <CircleDotDashed size={14}/> : <MessageSquareWarning size={14}/>}</span>
                <span><strong>{approval.stage.replace(/([A-Z])/g, ' $1')}</strong><small>Requested by {approval.requestedBy ?? 'Architecture owner'}</small><b>{approval.status}</b></span>
                <ArrowRight size={13}/>
              </button>
            )) : <div className="assurance-empty"><FileCheck2 size={24}/><strong>No baseline has been submitted.</strong><p>The reviewer remains read-only until an architecture owner submits an immutable baseline.</p></div>}
          </aside> : null}

          {taskFocus !== 'disposition' ? <main className="assurance-model" aria-label="Model and findings">
            <div className="assurance-pane-heading"><span>Model and findings</span><button type="button" onClick={() => setViewbookOpen(true)}>View all 10 projections</button></div>
            <div className="assurance-view-grid">
              {views.slice(0, 6).map((view) => {
                const nodeCount = resolveViewVisibleNodeIds(view, project.nodes ?? []).size;
                const edgeCount = resolveViewVisibleEdgeIds(view, project.edges ?? []).size;
                return <button key={view.id} type="button" onClick={() => setViewbookOpen(true)}>
                  <span>{view.name}</span><strong>{nodeCount}</strong><small>{edgeCount} relationships</small>
                </button>;
              })}
            </div>
            <section className="assurance-findings" aria-label="Architecture findings">
              <div className="assurance-findings__heading"><strong>Findings requiring judgement</strong><small>Deterministic findings remain visible even when a disposition is recorded.</small></div>
              {findings.length ? findings.slice(0, taskFocus === 'findings' ? 16 : 6).map((finding: any) => (
                <article key={finding.id} className={`tone-${severityTone(finding.severity)}`}>
                  <span>{severityTone(finding.severity) === 'risk' ? <AlertTriangle size={15}/> : <CircleDotDashed size={15}/>}</span>
                  <div><strong>{finding.title ?? finding.message ?? finding.ruleId ?? 'Architecture finding'}</strong><p>{finding.message ?? finding.description ?? finding.whyItMatters ?? 'Review the affected model element and evidence.'}</p><small>{finding.severity ?? 'advisory'} · {(finding.affectedNodeIds ?? finding.nodeIds ?? []).length} affected object(s)</small></div>
                </article>
              )) : <div className="assurance-empty assurance-empty--good"><CheckCircle2 size={25}/><strong>No deterministic findings are open.</strong><p>Continue to evidence review before approving the baseline.</p></div>}
              {findings.length > (taskFocus === 'findings' ? 16 : 6) ? <button type="button" className="assurance-findings__more" onClick={() => { window.sessionStorage.setItem('aiw.activeRoleTask', 'findings'); window.dispatchEvent(new CustomEvent('aiw:role-task', { detail: { taskId: 'findings', title: 'Findings' } })); }}>Open the complete Findings task ({findings.length})</button> : null}
            </section>
          </main> : null}

          {taskFocus !== 'findings' ? <aside className="assurance-disposition" aria-label="Evidence and disposition">
            <div className="assurance-pane-heading"><span>Evidence and disposition</span><strong>{selectedApproval?.status ?? 'open'}</strong></div>
            <div className="assurance-evidence-list">
              <div><BadgeCheck size={15}/><span><strong>Canonical model</strong><small>{project.nodes?.length ?? 0} objects · {project.edges?.length ?? 0} relationships</small></span></div>
              <div><FileCheck2 size={15}/><span><strong>Interface contracts</strong><small>{project.interfaces?.length ?? 0} governed contracts</small></span></div>
              <div><ShieldCheck size={15}/><span><strong>Knowledge release</strong><small>{project.knowledgeReleaseId ?? 'Pinned through project evidence'}</small></span></div>
              <div><BookOpenCheck size={15}/><span><strong>Viewbook</strong><small>{views.length} semantic projections available</small></span></div>
            </div>
            <label className="assurance-comment">
              <span>Disposition rationale</span>
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Record evidence, concerns, conditions or required changes." rows={6}/>
            </label>
            <div className="assurance-disposition__actions">
              <button type="button" className="is-approve" disabled={!selectedApproval || selectedApproval.status !== 'pending'} onClick={() => decide('approved')}><CheckCircle2 size={15}/> Approve baseline</button>
              <button type="button" className="is-change" disabled={!selectedApproval || selectedApproval.status !== 'pending'} onClick={() => decide('changes-requested')}><MessageSquareWarning size={15}/> Request changes</button>
              <button type="button" className="is-reject" disabled={!selectedApproval || selectedApproval.status !== 'pending'} onClick={() => decide('rejected')}><XCircle size={15}/> Reject</button>
            </div>
            <section className="assurance-project-decisions" aria-label="Persistent project candidate decisions">
              <h3>Project candidate decisions</h3>
              <p>These actions persist with project-candidate authority only. They never promote knowledge or confer production approval.</p>
              <label>
                <span>Candidate</span>
                <select aria-label="Review candidate" value={selectedCandidateId} onChange={(event) => setSelectedCandidateId(event.target.value)}>
                  {candidateNodes.map((node: any) => <option key={node.id} value={node.id}>{node.label}</option>)}
                </select>
              </label>
              <div className="assurance-project-decisions__actions">
                <button disabled={decisionPending || !selectedCandidateId} onClick={() => void recordCandidateDecision('approve-project-candidate')}>Approve project candidate</button>
                <button disabled={decisionPending || !selectedCandidateId} onClick={() => void recordCandidateDecision('return-with-comments')}>Return with comments</button>
                <button disabled={decisionPending || !selectedCandidateId} onClick={() => void recordCandidateDecision('reject-candidate')}>Reject candidate</button>
                <button disabled={decisionPending || !selectedCandidateId} onClick={() => void recordCandidateDecision('request-evidence')}>Request evidence</button>
                <button disabled={decisionPending || !selectedCandidateId} onClick={() => void recordCandidateDecision('request-regeneration')}>Request regeneration</button>
                <button disabled={decisionPending} onClick={() => void recordCandidateDecision('mark-risk-accepted')}>Mark risk accepted</button>
                <button disabled={decisionPending} onClick={() => void recordCandidateDecision('record-exception')}>Record exception</button>
              </div>
              <div className="assurance-project-decisions__ledger" data-testid="review-decision-ledger">
                {(project.reviewDecisionLedger ?? []).slice().reverse().slice(0, 12).map((decision: any) => <article key={decision.id}>
                  <strong>{decision.action.replaceAll('-', ' ')}</strong>
                  <span>{decision.resultingState}</span>
                  <small>{decision.actorId} · {readableDate(decision.timestamp)} · {decision.authority}</small>
                </article>)}
              </div>
            </section>
            <p className="assurance-boundary">Reviewers can inspect, compare and disposition the submitted baseline. Model mutation, pattern application and artifact generation remain producer responsibilities.</p>
          </aside> : null}
        </div>
      )}

      {viewbookOpen ? <ArchitectureViewbook onClose={() => setViewbookOpen(false)} /> : null}
    </section>
  );
}
