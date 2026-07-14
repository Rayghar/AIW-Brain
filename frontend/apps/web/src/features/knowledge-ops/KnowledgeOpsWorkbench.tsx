import { useEffect, useMemo, useState } from 'react';
import './knowledge-ops.css';
import {
  AlertTriangle,
  BrainCircuit,
  BookOpenCheck,
  CheckCircle2,
  GitMerge,
  MessageSquarePlus,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Split,
  UserCheck,
} from 'lucide-react';
import type { CorroborationAnalysis, KnowledgeOpsQueueSummary } from '@aiw/knowledge';
import type { MindFactoryFeedbackReceipt } from '@aiw/domain';
import { StudioActionStrip, StudioDataTable, StudioEmptyState, StudioOperatorChecklist, StudioPipelineBoard, StudioPreviewDrawer, StudioWorkflowPanel, type StudioPipelineStep } from '../../components/StudioSpecialistSurfaces';

type Tab = 'overview' | 'canvasFeedback' | 'claims' | 'contradictions' | 'sources' | 'duplicates' | 'synonyms' | 'corroboration' | 'activity';
const KNOWLEDGE_TAB_IDS: Tab[] = ['overview', 'canvasFeedback', 'claims', 'contradictions', 'sources', 'duplicates', 'synonyms', 'corroboration', 'activity'];

type ClaimItem = { claimId: string; subjectId: string; subjectName: string; claimType: string; predicate: string; summary: string; suggestedReviewerRole?: string; evidence?: string[] };
type ContradictionItem = { subjectId: string; predicate: string; claimsA?: Array<{ claimId?: string; object?: string }>; claimsB?: Array<{ claimId?: string; object?: string }>; polarityA?: string; polarityB?: string };
type SourceRefreshItem = { sourceId: string; title: string; status: string; lastReviewedAt: string | null; cadenceDays: number; overdueDays: number };
type DuplicateGroup = { groupId: string; canonicalId: string; duplicateIds: string[]; reason?: string };
type SynonymGroup = { groupId: string; canonicalTerm: string; synonyms: string[]; scope: string };
type Assignment = { itemType: string; itemId: string; reviewer: string; reviewerRole: string; status: string; assignedAt: string; dueAt?: string };
type Activity = { actor?: string; action?: string; subject?: string; detail?: string; at?: string; claimId?: string; decision?: string; reviewer?: string; rationale?: string; sourceId?: string; requestedAt?: string; requestedBy?: string; reason?: string };

type WorkbenchPayload = {
  summary: KnowledgeOpsQueueSummary;
  claimReview: ClaimItem[];
  contradictions: ContradictionItem[];
  sourceRefresh: SourceRefreshItem[];
  duplicateGroups: DuplicateGroup[];
  synonymGroups: SynonymGroup[];
  assignments: Assignment[];
  comments: Activity[];
  claimDecisions: Activity[];
  triageDecisions: Activity[];
  sourceRefreshRequests: Activity[];
  duplicateResolutions: Activity[];
  synonymResolutions: Activity[];
  corroborationAnalyses: CorroborationAnalysis[];
  livingCanvasFeedback: MindFactoryFeedbackReceipt[];
};

const roles = ['knowledge-curator', 'architecture-reviewer', 'security-reviewer', 'compliance-reviewer', 'enterprise-architect', 'knowledge-admin'];
const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'canvasFeedback', label: 'Canvas feedback' },
  { id: 'claims', label: 'Claims' },
  { id: 'contradictions', label: 'Contradictions' },
  { id: 'sources', label: 'Refresh' },
  { id: 'duplicates', label: 'Duplicates' },
  { id: 'synonyms', label: 'Synonyms' },
  { id: 'corroboration', label: 'Corroboration' },
  { id: 'activity', label: 'Activity' },
];

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}
async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}
function safeDate(value?: string | null) { return value ? value.slice(0, 19).replace('T', ' ') : '—'; }
function list(value?: string[]) { return value?.length ? value.join(', ') : '—'; }
function defaultDueDate() { const date = new Date(); date.setDate(date.getDate() + 7); return date.toISOString().slice(0, 10); }

export function KnowledgeOpsWorkbench() {
  const [tab, setTab] = useState<Tab>(() => {
    const saved = typeof window === 'undefined' ? null : window.sessionStorage.getItem('aiw.activeKnowledgeTab');
    return saved && KNOWLEDGE_TAB_IDS.includes(saved as Tab) ? saved as Tab : 'overview';
  });
  const [data, setData] = useState<WorkbenchPayload | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<ClaimItem | null>(null);
  const [selectedContradiction, setSelectedContradiction] = useState<ContradictionItem | null>(null);
  const [selectedSource, setSelectedSource] = useState<SourceRefreshItem | null>(null);
  const [reviewer, setReviewer] = useState('Architecture Knowledge Council');
  const [reviewerRole, setReviewerRole] = useState('knowledge-curator');
  const [rationale, setRationale] = useState('Reviewed by Knowledge Ops; staged for release candidate rather than direct production mutation.');
  const [conditions, setConditions] = useState('applies when operational maturity and evidence posture match the target architecture context');
  const [dueAt, setDueAt] = useState(defaultDueDate());
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<{ tab?: string }>).detail?.tab;
      if (next && KNOWLEDGE_TAB_IDS.includes(next as Tab)) { window.sessionStorage.setItem('aiw.activeKnowledgeTab', next); setTab(next as Tab); }
    };
    window.addEventListener('aiw:knowledge-tab', handler);
    return () => window.removeEventListener('aiw:knowledge-tab', handler);
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const payload = await getJson<WorkbenchPayload>('/api/knowledge-ops/workbench');
      setData(payload);
      setSelectedClaim((current) => current ? payload.claimReview.find((item) => item.claimId === current.claimId) ?? null : null);
      setSelectedContradiction((current) => current ? payload.contradictions.find((item) => item.subjectId === current.subjectId && item.predicate === current.predicate) ?? null : null);
      setSelectedSource((current) => current ? payload.sourceRefresh.find((item) => item.sourceId === current.sourceId) ?? null : null);
    } catch (error) {
      setNotice(`Knowledge Ops API unavailable or refused: ${String((error as { message?: string }).message ?? error)}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);

  const summary = data?.summary;
  const cards = useMemo(() => [
    { label: 'Canvas feedback', value: data?.livingCanvasFeedback.filter((item) => item.status === 'queued-for-curation' || item.status === 'under-review').length ?? 0, icon: <BrainCircuit /> },
    { label: 'Pending claims', value: summary?.pendingClaims ?? 0, icon: <BookOpenCheck /> },
    { label: 'Contradictions', value: summary?.openContradictions ?? 0, icon: <AlertTriangle /> },
    { label: 'Stale sources', value: summary?.staleSources ?? 0, icon: <RefreshCw /> },
    { label: 'Assigned items', value: summary?.assignedItems ?? 0, icon: <UserCheck /> },
    { label: 'Duplicate groups', value: summary?.duplicateGroups ?? 0, icon: <GitMerge /> },
    { label: 'Synonym groups', value: summary?.synonymGroups ?? 0, icon: <Split /> },
  ], [summary, data?.livingCanvasFeedback]);

  const pipelineSteps = useMemo<StudioPipelineStep[]>(() => [
    { id: 'feedback', label: 'Design feedback', detail: 'Architect outcomes and LLM-detected gaps enter a non-scoring curator queue.', status: (data?.livingCanvasFeedback.filter((item) => item.status === 'queued-for-curation').length ?? 0) > 0 ? 'active' : 'done', metric: data?.livingCanvasFeedback.filter((item) => item.status === 'queued-for-curation').length ?? 0 },
    { id: 'sources', label: 'Sources', detail: 'Registered knowledge sources refresh into quarantine only.', status: (summary?.staleSources ?? 0) > 0 ? 'watch' : 'done', metric: summary?.staleSources ?? 0 },
    { id: 'claims', label: 'Candidate claims', detail: 'Claims remain non-scoring until a human review decision is recorded.', status: (summary?.pendingClaims ?? 0) > 0 ? 'active' : 'done', metric: summary?.pendingClaims ?? 0 },
    { id: 'normalize', label: 'Normalize', detail: 'Synonyms, duplicates and vendor realizations are collapsed into canonical records.', status: ((summary?.duplicateGroups ?? 0) + (summary?.synonymGroups ?? 0)) > 0 ? 'watch' : 'ready', metric: (summary?.duplicateGroups ?? 0) + (summary?.synonymGroups ?? 0) },
    { id: 'contradictions', label: 'Contradictions', detail: 'Conflicts are context-split or escalated; they are not silently deleted.', status: (summary?.openContradictions ?? 0) > 0 ? 'blocked' : 'done', metric: summary?.openContradictions ?? 0 },
    { id: 'release', label: 'Release candidate', detail: 'Reviewed changes move into a signed release candidate before activation.', status: (summary?.assignedItems ?? 0) > 0 ? 'active' : 'ready', metric: summary?.assignedItems ?? 0 },
  ], [summary, data?.livingCanvasFeedback]);

  const triageCanvasFeedback = async (receipt: MindFactoryFeedbackReceipt, status: 'under-review' | 'converted-to-candidate' | 'dismissed') => {
    await postJson(`/api/knowledge-ops/living-canvas-feedback/${encodeURIComponent(receipt.id)}/triage`, { status, rationale });
    setNotice(status === 'converted-to-candidate'
      ? `Feedback ${receipt.id} staged as a non-scoring knowledge candidate.`
      : status === 'dismissed'
        ? `Feedback ${receipt.id} dismissed with an audit rationale.`
        : `Feedback ${receipt.id} is now under curator review.`);
    await refresh();
  };

  const assignClaim = async (claim = selectedClaim) => {
    if (!claim) return;
    await postJson(`/api/knowledge-ops/claims/${encodeURIComponent(claim.claimId)}/assign`, { reviewer, reviewerRole, dueAt });
    setNotice(`Claim ${claim.claimId} assigned to ${reviewer}.`);
    await refresh();
  };
  const decideClaim = async (decision: 'approve' | 'reject' | 'request-changes', claim = selectedClaim) => {
    if (!claim) return;
    await postJson('/api/knowledge-ops/claims/decide', { claimId: claim.claimId, decision, rationale, conditionsAdded: conditions.split(';').map((item) => item.trim()).filter(Boolean) });
    setNotice(`Claim ${claim.claimId} decision recorded as ${decision}.`);
    await refresh();
  };
  const commentOn = async (itemType: string, itemId: string) => {
    await postJson(`/api/knowledge-ops/items/${encodeURIComponent(itemType)}/${encodeURIComponent(itemId)}/comment`, { body: rationale, visibility: 'reviewer' });
    setNotice(`Comment recorded for ${itemType}:${itemId}.`);
    await refresh();
  };
  const escalate = async (itemType: string, itemId: string) => {
    await postJson(`/api/knowledge-ops/items/${encodeURIComponent(itemType)}/${encodeURIComponent(itemId)}/escalate`, { reason: rationale, targetRole: reviewerRole });
    setNotice(`${itemType}:${itemId} escalated to ${reviewerRole}.`);
    await refresh();
  };
  const triageContradiction = async (resolution: 'context-split' | 'source-conflict' | 'outdated-claim' | 'escalate-expert') => {
    if (!selectedContradiction) return;
    await postJson('/api/knowledge-ops/contradictions/triage', { subjectId: selectedContradiction.subjectId, predicate: selectedContradiction.predicate, resolution, conditionsA: [conditions], conditionsB: ['counterclaim remains valid only under explicitly documented alternative context'], rationale });
    setNotice(`Contradiction triaged as ${resolution}.`);
    await refresh();
  };
  const requestRefresh = async (source = selectedSource) => {
    if (!source) return;
    await postJson(`/api/knowledge-ops/sources/${encodeURIComponent(source.sourceId)}/refresh/request`, { reason: rationale });
    setNotice(`Refresh requested for ${source.sourceId}.`);
    await refresh();
  };
  const resolveDuplicate = async (group: DuplicateGroup) => {
    await postJson('/api/knowledge-ops/duplicates/resolve', { ...group, resolution: 'merge', rationale });
    setNotice(`Duplicate group ${group.groupId} resolved as staged merge.`);
    await refresh();
  };
  const resolveSynonym = async (group: SynonymGroup) => {
    await postJson('/api/knowledge-ops/synonyms/resolve', { ...group, rationale });
    setNotice(`Synonym group ${group.groupId} resolved.`);
    await refresh();
  };
  const analyseCorroboration = async (itemId = selectedClaim?.claimId ?? selectedContradiction?.subjectId ?? 'knowledge-item') => {
    const analysis = await postJson<{ analysis: CorroborationAnalysis }>('/api/knowledge-ops/corroboration/analyse', { itemId, contradictionCount: selectedContradiction ? 1 : 0, evidence: [{ sourceId: 'SRC-APPROVED-ARCHITECTURE-MESH', trustTier: 'approved', posture: 'approved-advisory', independent: true, note: 'Reference approved source' }, { sourceId: 'SRC-INTERNAL-ARCHITECTURE-BOARD', trustTier: 'tier-1', posture: 'approved-production', independent: true, note: 'Named internal board evidence placeholder' }] });
    setNotice(`Corroboration for ${analysis.analysis.itemId}: ${analysis.analysis.confidence}.`);
    await refresh();
  };

  return (
    <section className="enterprise-workspace knowledge-ops-workbench">
      <header className="workspace-hero knowledge-ops-hero">
        <div>
          <span className="eyebrow"><ShieldCheck size={14}/> Knowledge Operations Workbench</span>
          <h2>Review, triage and release architecture intelligence with evidence discipline</h2>
          <p>Claims, contradictions, stale sources, duplicates and synonyms are governed work items. Decisions are recorded as events and must flow into a knowledge-release candidate before production scoring changes.</p>
        </div>
        <div className="activation-score-card knowledge-backlog-card">
          <span>Release readiness</span><strong>{(summary?.pendingClaims ?? 0) || (summary?.openContradictions ?? 0) || (summary?.staleSources ?? 0) || (data?.livingCanvasFeedback.some((item) => item.status === 'queued-for-curation') ?? false) ? 'Review required' : 'Ready to stage'}</strong><small>{data?.livingCanvasFeedback.filter((item) => item.status === 'queued-for-curation').length ?? 0} canvas signals · {summary?.pendingClaims ?? 0} claims · {summary?.openContradictions ?? 0} contradictions</small>
        </div>
      </header>

      <div className="admin-command-strip">
        <button type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} size={15}/> Refresh workbench</button>
        <span className="admin-pill admin-pill--ok"><CheckCircle2 size={12}/> Candidate knowledge cannot score production</span>
        <span className="admin-pill"><SearchCheck size={12}/> Release candidate required after review</span>
      </div>
      {notice ? <p className="admin-cc__notice">{notice}</p> : null}

      <StudioPreviewDrawer
        open={Boolean(selectedClaim || selectedContradiction || selectedSource)}
        eyebrow="Selection inspector"
        title={selectedClaim?.subjectName ?? selectedContradiction?.subjectId ?? selectedSource?.title ?? 'Knowledge Ops item'}
        detail={selectedClaim?.summary ?? selectedContradiction?.predicate ?? selectedSource?.status}
        onClose={() => { setSelectedClaim(null); setSelectedContradiction(null); setSelectedSource(null); }}
        actions={selectedClaim ? <button type="button" onClick={() => void assignClaim(selectedClaim)}>Assign selected claim</button> : selectedSource ? <button type="button" onClick={() => void requestRefresh(selectedSource)}>Request source refresh</button> : null}
      >
        <dl className="studio-preview-facts">
          {selectedClaim ? <>
            <dt>Claim id</dt><dd>{selectedClaim.claimId}</dd>
            <dt>Predicate</dt><dd>{selectedClaim.predicate}</dd>
            <dt>Evidence</dt><dd>{list(selectedClaim.evidence)}</dd>
            <dt>Reviewer</dt><dd>{selectedClaim.suggestedReviewerRole ?? 'knowledge-curator'}</dd>
          </> : null}
          {selectedContradiction ? <>
            <dt>Predicate</dt><dd>{selectedContradiction.predicate}</dd>
            <dt>Side A</dt><dd>{selectedContradiction.claimsA?.map((claim) => claim.object ?? claim.claimId).join(' · ') || selectedContradiction.polarityA || '—'}</dd>
            <dt>Side B</dt><dd>{selectedContradiction.claimsB?.map((claim) => claim.object ?? claim.claimId).join(' · ') || selectedContradiction.polarityB || '—'}</dd>
          </> : null}
          {selectedSource ? <>
            <dt>Source id</dt><dd>{selectedSource.sourceId}</dd>
            <dt>Cadence</dt><dd>{selectedSource.cadenceDays} days</dd>
            <dt>Overdue</dt><dd>{selectedSource.overdueDays} days</dd>
            <dt>Last reviewed</dt><dd>{safeDate(selectedSource.lastReviewedAt)}</dd>
          </> : null}
        </dl>
      </StudioPreviewDrawer>

      <StudioPipelineBoard
        eyebrow="Governed knowledge factory"
        title="Source → quarantine → review → release activation"
        description="Knowledge Ops now presents the operating pipeline directly so reviewers understand where every item sits before it can affect production recommendations."
        steps={pipelineSteps}
      />

      <StudioOperatorChecklist
        title="Today’s knowledge reviewer path"
        description="This keeps the workbench natural for global users: review the highest-risk queue first, resolve blocking contradictions, then package only approved changes."
        items={[
          { id: 'review-feedback', title: 'Review canvas intelligence feedback', detail: `${data?.livingCanvasFeedback.filter((item) => item.status === 'queued-for-curation').length ?? 0} architect outcome or knowledge-gap signal(s) waiting for curation.`, tone: (data?.livingCanvasFeedback.filter((item) => item.status === 'queued-for-curation').length ?? 0) > 0 ? 'watch' : 'ok' },
          { id: 'review-claims', title: 'Review pending claims', detail: `${summary?.pendingClaims ?? 0} claim(s) waiting for human judgement.`, tone: (summary?.pendingClaims ?? 0) > 0 ? 'watch' : 'ok' },
          { id: 'triage-contradictions', title: 'Triage contradictions', detail: `${summary?.openContradictions ?? 0} contradiction(s) must be context-split or escalated.`, tone: (summary?.openContradictions ?? 0) > 0 ? 'blocked' : 'ok' },
          { id: 'refresh-sources', title: 'Refresh stale sources', detail: `${summary?.staleSources ?? 0} source(s) need refresh requests before release confidence improves.`, tone: (summary?.staleSources ?? 0) > 0 ? 'watch' : 'ok' },
          { id: 'stage-release', title: 'Stage release candidate', detail: 'Only reviewed records move to signed release activation; candidate knowledge remains non-scoring.', tone: 'neutral' },
        ]}
      />

      <nav className="admin-tabs" role="tablist" aria-label="Knowledge Ops sections">
        {tabs.map((item) => <button key={item.id} type="button" className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </nav>

      {tab !== 'activity' ? <StudioActionStrip
        title="Guided knowledge operations"
        detail="Reviewer actions now expose selection, evidence validation, preview and audit consequences before the operation is submitted."
        actions={[
          { label: 'Select item', detail: 'Pick a claim, contradiction, source or normalization group.', tone: 'neutral' },
          { label: 'Review evidence', detail: 'Confirm supporting facts, ownership and context before action.', tone: 'watch' },
          { label: 'Preview decision', detail: 'See what will be recorded in audit and release workflow.', tone: 'ok' },
          { label: 'Submit safely', detail: 'Record decisions without mutating production knowledge directly.', tone: 'ok' },
        ]}
      /> : null}

      <aside className="knowledge-review-drawer">
        <h3>Reviewer controls</h3>
        <label><span>Reviewer</span><input value={reviewer} onChange={(event) => setReviewer(event.target.value)} /></label>
        <label><span>Role</span><select value={reviewerRole} onChange={(event) => setReviewerRole(event.target.value)}>{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
        <label><span>Due date</span><input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
        <label><span>Rationale / comment</span><textarea value={rationale} onChange={(event) => setRationale(event.target.value)} /></label>
        <label><span>Applicability conditions</span><textarea value={conditions} onChange={(event) => setConditions(event.target.value)} /></label>
      </aside>

      {tab === 'overview' ? <div className="admin-overview-grid knowledge-ops-grid">
        {cards.map((card) => <article className="admin-metric-card" key={card.label}>{card.icon}<span>{card.label}</span><strong>{card.value}</strong></article>)}
        <article className="admin-wide-card"><h3>Operating doctrine</h3><ul className="admin-check-list"><li><CheckCircle2 size={14}/> Review decisions are event records, not direct production mutations.</li><li><CheckCircle2 size={14}/> Contradictions are context-split or escalated; AIW does not delete uncomfortable claims.</li><li><CheckCircle2 size={14}/> Duplicate/synonym resolutions are staged into release candidates.</li><li><CheckCircle2 size={14}/> Source refreshes run via worker in target environments.</li></ul></article>
      </div> : null}

      {tab === 'canvasFeedback' ? <Table
        title="Living Canvas intelligence feedback"
        empty="No architect outcomes or knowledge-gap signals are waiting for curation."
        rows={(data?.livingCanvasFeedback ?? []).map((item) => ({
          key: item.id,
          cells: [
            item.feedbackKind === 'knowledge-gap' ? item.topic ?? item.actionLabel ?? 'Knowledge gap' : item.actionLabel ?? item.actionSemanticKey,
            `${item.stage} · ${item.feedbackKind}`,
            item.status,
            item.outcome,
            item.reason ?? 'No rationale recorded',
            item.modelTrace ? `${item.modelTrace.providerId} · ${item.modelTrace.model}` : 'deterministic / trace unavailable',
            safeDate(item.createdAt),
          ],
          actions: item.status === 'converted-to-candidate' || item.status === 'dismissed' ? null : <div className="admin-row-actions">
            <button type="button" onClick={() => void triageCanvasFeedback(item, 'under-review')}>Review</button>
            <button type="button" onClick={() => void triageCanvasFeedback(item, 'converted-to-candidate')}>Stage candidate</button>
            <button type="button" onClick={() => void triageCanvasFeedback(item, 'dismissed')}>Dismiss</button>
          </div>,
        }))}
      /> : null}

      {tab === 'claims' ? <div className="knowledge-two-pane"><ListPanel title="Claim review queue" items={data?.claimReview ?? []} activeId={selectedClaim?.claimId} idOf={(item) => item.claimId} titleOf={(item) => item.subjectName} detailOf={(item) => `${item.claimType} · ${item.predicate}`} onSelect={setSelectedClaim}/>{selectedClaim ? <StudioWorkflowPanel
        eyebrow="Claim review workflow"
        title={selectedClaim.subjectName}
        description={selectedClaim.summary}
        steps={[
          { id: 'select', title: 'Select claim', detail: 'A reviewer must select the exact claim before action.', status: 'complete' },
          { id: 'evidence', title: 'Review evidence', detail: 'Evidence and reviewer role are visible before any decision is recorded.', status: selectedClaim.evidence?.length ? 'complete' : 'current' },
          { id: 'decision', title: 'Preview decision', detail: 'Decisions are audit events and do not directly promote production knowledge.', status: 'current' },
        ]}
        validation={[
          'Claim id, predicate and subject are visible before action.',
          'Conditions and rationale are prompted by the reviewer workflow.',
          'Candidate claim remains non-scoring until release promotion.',
        ]}
        previewFacts={[
          { label: 'Claim', value: selectedClaim.claimId, tone: 'neutral' },
          { label: 'Predicate', value: selectedClaim.predicate, tone: 'neutral' },
          { label: 'Suggested reviewer', value: selectedClaim.suggestedReviewerRole ?? 'knowledge-curator', tone: 'watch' },
          { label: 'Evidence', value: list(selectedClaim.evidence), tone: selectedClaim.evidence?.length ? 'ok' : 'watch' },
        ]}
        submitLabel="Assign selected claim"
        onSubmit={() => void assignClaim()}
        secondaryAction={<><button type="button" onClick={() => void decideClaim('approve')}>Approve</button><button type="button" onClick={() => void decideClaim('request-changes')}>Request changes</button><button type="button" onClick={() => void decideClaim('reject')}>Reject</button></>}
      >
        <dl className="studio-preview-facts"><dt>Claim</dt><dd>{selectedClaim.claimId}</dd><dt>Predicate</dt><dd>{selectedClaim.predicate}</dd><dt>Evidence</dt><dd>{list(selectedClaim.evidence)}</dd></dl>
        <div className="admin-row-actions"><button type="button" onClick={() => void commentOn('claim', selectedClaim.claimId)}><MessageSquarePlus size={13}/> Comment</button><button type="button" onClick={() => void escalate('claim', selectedClaim.claimId)}>Escalate</button><button type="button" onClick={() => void analyseCorroboration(selectedClaim.claimId)}>Analyse corroboration</button></div>
      </StudioWorkflowPanel> : <Empty text="No claim selected."/>}</div> : null}

      {tab === 'contradictions' ? <div className="knowledge-two-pane"><ListPanel title="Contradiction triage" items={data?.contradictions ?? []} activeId={selectedContradiction ? `${selectedContradiction.subjectId}:${selectedContradiction.predicate}` : undefined} idOf={(item) => `${item.subjectId}:${item.predicate}`} titleOf={(item) => item.subjectId} detailOf={(item) => item.predicate} onSelect={setSelectedContradiction}/>{selectedContradiction ? <StudioWorkflowPanel
        eyebrow="Contradiction triage workflow"
        title={selectedContradiction.subjectId}
        description={selectedContradiction.predicate}
        steps={[
          { id: 'select', title: 'Select contradiction', detail: 'Reviewer confirms the exact subject and predicate in dispute.', status: 'complete' },
          { id: 'compare', title: 'Compare claims', detail: 'Both sides remain visible so AIW does not silently discard claims.', status: 'complete' },
          { id: 'resolution', title: 'Preview resolution', detail: 'The triage decision is captured as context split, source conflict, outdated claim or expert escalation.', status: 'current' },
        ]}
        validation={[
          'Both sides are shown before resolution.',
          'Context split is preferred over deleting claims.',
          'Resolution is an audit event and can feed release governance.',
        ]}
        previewFacts={[
          { label: 'Subject', value: selectedContradiction.subjectId, tone: 'neutral' },
          { label: 'Predicate', value: selectedContradiction.predicate, tone: 'neutral' },
          { label: 'Side A', value: selectedContradiction.claimsA?.map((claim) => claim.object ?? claim.claimId).join(' · ') || selectedContradiction.polarityA || '—', tone: 'watch' },
          { label: 'Side B', value: selectedContradiction.claimsB?.map((claim) => claim.object ?? claim.claimId).join(' · ') || selectedContradiction.polarityB || '—', tone: 'watch' },
        ]}
        submitLabel="Context split"
        onSubmit={() => void triageContradiction('context-split')}
        secondaryAction={<><button type="button" onClick={() => void triageContradiction('source-conflict')}>Source conflict</button><button type="button" onClick={() => void triageContradiction('outdated-claim')}>Outdated</button><button type="button" onClick={() => void triageContradiction('escalate-expert')}>Escalate expert</button></>}
      >
        <dl className="studio-preview-facts"><dt>Side A</dt><dd>{selectedContradiction.claimsA?.map((claim) => claim.object ?? claim.claimId).join(' · ') || selectedContradiction.polarityA || '—'}</dd><dt>Side B</dt><dd>{selectedContradiction.claimsB?.map((claim) => claim.object ?? claim.claimId).join(' · ') || selectedContradiction.polarityB || '—'}</dd></dl>
        <div className="admin-row-actions"><button type="button" onClick={() => void analyseCorroboration(selectedContradiction.subjectId)}>Analyse corroboration</button></div>
      </StudioWorkflowPanel> : <Empty text="No contradiction selected."/>}</div> : null}

      {tab === 'sources' ? <Table title="Source refresh queue" empty="No stale sources." rows={(data?.sourceRefresh ?? []).map((source) => ({ key: source.sourceId, cells: [source.sourceId, source.title, source.status, `${source.overdueDays} days overdue`, safeDate(source.lastReviewedAt)], actions: <button type="button" onClick={() => { setSelectedSource(source); void requestRefresh(source); }}>Request refresh</button> }))}/> : null}
      {tab === 'duplicates' ? <Table title="Duplicate / near-duplicate resolution" empty="No duplicate groups currently staged." rows={(data?.duplicateGroups ?? []).map((group) => ({ key: group.groupId, cells: [group.groupId, group.canonicalId, group.duplicateIds.join(', '), group.reason ?? 'curator review'], actions: <button type="button" onClick={() => void resolveDuplicate(group)}>Stage merge</button> }))}/> : null}
      {tab === 'synonyms' ? <Table title="Synonym normalization" empty="No synonym groups currently staged." rows={(data?.synonymGroups ?? []).map((group) => ({ key: group.groupId, cells: [group.groupId, group.canonicalTerm, group.synonyms.join(', '), group.scope], actions: <button type="button" onClick={() => void resolveSynonym(group)}>Resolve synonyms</button> }))}/> : null}
      {tab === 'corroboration' ? <Table title="Corroboration analyses" empty="No corroboration analyses yet. Analyse a claim or contradiction first." rows={(data?.corroborationAnalyses ?? []).map((item) => ({ key: `${item.itemId}-${item.generatedAt}`, cells: [item.itemId, item.confidence, `${item.independentSupportCount}/${item.supportCount} independent`, String(item.contradictionCount), item.recommendation], actions: null }))}/> : null}
      {tab === 'activity' ? <ActivityFeed data={data}/> : null}
    </section>
  );
}

function Empty({ text }: { text: string }) { return <StudioEmptyState title="No item selected" detail={text} />; }
function ListPanel<T>({ title, items, activeId, idOf, titleOf, detailOf, onSelect }: { title: string; items: T[]; activeId: string | undefined; idOf: (item: T) => string; titleOf: (item: T) => string; detailOf: (item: T) => string; onSelect: (item: T) => void }) {
  return <article className="admin-table-card knowledge-list"><h3>{title}</h3>{items.length ? items.slice(0, 30).map((item) => <button type="button" key={idOf(item)} className={activeId === idOf(item) ? 'active' : ''} onClick={() => onSelect(item)}><strong>{titleOf(item)}</strong><span>{detailOf(item)}</span></button>) : <p className="empty">No work items.</p>}</article>;
}
function Table({ title, empty, rows }: { title: string; empty: string; rows: Array<{ key: string; cells: React.ReactNode[]; actions: React.ReactNode }> }) {
  const maxCells = Math.max(1, ...rows.map((row) => row.cells.length));
  const columns = Array.from({ length: maxCells }, (_, index) => ({
    key: `c${index}`,
    title: index === 0 ? 'Item' : index === 1 ? 'Context' : index === 2 ? 'Status' : `Detail ${index + 1}`,
  }));
  return (
    <StudioDataTable
      title={title}
      description="Searchable table with row preview so operators can inspect records without losing context."
      columns={columns}
      emptyTitle={empty}
      emptyDetail="There is no work to show for this section. AIW keeps the table state explicit instead of rendering a blank panel."
      rows={rows.map((row) => ({
        id: row.key,
        cells: Object.fromEntries(row.cells.map((cell, index) => [`c${index}`, cell])),
        summary: row.cells.map((cell) => String(cell ?? '')).join(' · '),
        preview: <dl className="studio-preview-facts">{row.cells.map((cell, index) => <><dt key={`dt-${index}`}>{columns[index]?.title ?? `Field ${index + 1}`}</dt><dd key={`dd-${index}`}>{cell}</dd></>)}</dl>,
        actions: row.actions,
      }))}
    />
  );
}
function ActivityFeed({ data }: { data: WorkbenchPayload | null }) {
  const rows = [...(data?.claimDecisions ?? []), ...(data?.triageDecisions ?? []), ...(data?.sourceRefreshRequests ?? []), ...(data?.duplicateResolutions ?? []), ...(data?.synonymResolutions ?? []), ...(data?.comments ?? [])];
  return <Table title="Knowledge Ops activity" empty="No Knowledge Ops events yet." rows={rows.map((item, index) => ({ key: `${index}-${item.at ?? item.requestedAt ?? item.claimId ?? item.sourceId}`, cells: [safeDate(item.at ?? item.requestedAt), item.actor ?? item.reviewer ?? item.requestedBy ?? 'reviewer', item.action ?? item.decision ?? 'activity', item.subject ?? item.claimId ?? item.sourceId ?? 'knowledge item', item.detail ?? item.rationale ?? item.reason ?? '—'], actions: null }))}/>;
}
