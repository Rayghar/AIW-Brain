import { ArrowLeftRight, CheckCircle2, GitMerge, Plus, Minus, Pencil, ShieldAlert, X, GitBranch, Camera, Play } from 'lucide-react';
import { useState } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';

export function ComparisonWorkspace() {
  const comparison = useWorkspaceStore((state) => state.comparison);
  const mergePlan = useWorkspaceStore((state) => state.mergePlan);
  const branches = useWorkspaceStore((state) => state.branches);
  const project = useWorkspaceStore((state) => state.project);
  const mergeBranch = useWorkspaceStore((state) => state.mergeBranch);
  const resolveChoice = useWorkspaceStore((state) => state.resolveMergeConflictChoice);
  const applyPreparedMerge = useWorkspaceStore((state) => state.applyPreparedMerge);
  const cancelPreparedMerge = useWorkspaceStore((state) => state.cancelPreparedMerge);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const createBranch = useWorkspaceStore((state) => state.createBranch);
  const compareWithBranch = useWorkspaceStore((state) => state.compareWithBranch);
  const createSnapshot = useWorkspaceStore((state) => state.createSnapshot);
  const [branchName, setBranchName] = useState('Alternative architecture');
  const candidates = branches.filter((item) => item.metadata.id !== project.branch.id);
  if (!comparison && !mergePlan) return <section className="studio-page comparison-empty-workflow">
    <div className="page-heading"><div><span className="eyebrow">Architecture alternative analysis</span><h2>Compare a governed baseline with an alternative</h2><p>Create or select an alternative branch, then inspect structural, decision, pattern and finding deltas without leaving this page.</p></div><ArrowLeftRight size={32}/></div>
    <div className="comparison-start-grid">
      <article><GitBranch size={22}/><h3>Create an alternative</h3><p>Branch from the active architecture, make a deliberate change, then return here to compare.</p><label>Alternative name<input value={branchName} onChange={(event) => setBranchName(event.target.value)} /></label><button className="button button--primary" onClick={() => createBranch(branchName, 'Created from Comparison workspace')}>Create and open alternative</button></article>
      <article><Play size={22}/><h3>Compare an existing branch</h3><p>Select another branch and generate the deterministic difference set.</p>{candidates.length ? <div className="comparison-candidate-list">{candidates.map((item) => <button key={item.metadata.id} onClick={() => compareWithBranch(item.metadata.id)}><strong>{item.metadata.name}</strong><small>{item.metadata.status} · base revision {item.metadata.baseRevision}</small></button>)}</div> : <div className="empty-card">No alternative branches exist yet.</div>}</article>
      <article><Camera size={22}/><h3>Capture the current baseline</h3><p>Create an immutable reviewed snapshot before exploring alternatives.</p><button className="button button--secondary" onClick={() => createSnapshot('Comparison baseline', 'reviewed')}>Create reviewed snapshot</button><small>{project.branch.name} · revision {project.revision}</small></article>
    </div>
  </section>;
  const sourceBranchId = mergePlan?.sourceBranchId ?? comparison?.sourceBranchId;
  const source = branches.find((item) => item.metadata.id === sourceBranchId);
  const unresolved = mergePlan?.conflicts.filter((item) => item.resolution === 'unresolved').length ?? 0;
  return (
    <section className="studio-page governance-page">
      <div className="page-heading"><div><span className="eyebrow">Architecture alternative analysis</span><h2>{source?.metadata.name} versus {project.branch.name}</h2><p>Review structural, decision and pattern differences, then resolve conflicting records explicitly before merging.</p></div><ArrowLeftRight size={32}/></div>
      {comparison ? <>
        <div className="selection-summary-grid comparison-summary">
          <article><strong>{comparison.summary.added}</strong><span>Added</span></article>
          <article><strong>{comparison.summary.removed}</strong><span>Removed</span></article>
          <article><strong>{comparison.summary.modified}</strong><span>Modified</span></article>
          <article><strong>{comparison.summary.riskDelta >= 0 ? '+' : ''}{comparison.summary.riskDelta}</strong><span>Finding delta</span></article>
        </div>
        <div className="comparison-list">
          {comparison.differences.map((difference) => <article key={difference.id} className={`diff-${difference.change}`}>{difference.change === 'added' ? <Plus size={15}/> : difference.change === 'removed' ? <Minus size={15}/> : <Pencil size={15}/>}<span><strong>{difference.label}</strong><small>{difference.category} · {difference.details}</small></span><b>{difference.change}</b></article>)}
          {comparison.differences.length === 0 ? <div className="empty-card"><CheckCircle2 size={17}/> The branches are structurally equivalent.</div> : null}
        </div>
      </> : null}

      {mergePlan ? <section className="merge-plan-panel">
        <div className="governance-heading"><ShieldAlert size={18}/><div><h3>Merge conflict resolution</h3><p>{unresolved} unresolved conflict{unresolved === 1 ? '' : 's'}. Choose the alternative or active value for every conflicting record.</p></div></div>
        <div className="merge-conflict-list">
          {mergePlan.conflicts.map((conflict) => <article key={conflict.id}><div><strong>{conflict.label}</strong><span>{conflict.category}</span></div><small>Record: {conflict.recordId}</small><div className="merge-choice-buttons"><button className={conflict.resolution === 'source' ? 'selected' : ''} onClick={() => resolveChoice(conflict.id, 'source')}>Use alternative</button><button className={conflict.resolution === 'target' ? 'selected' : ''} onClick={() => resolveChoice(conflict.id, 'target')}>Keep active</button></div></article>)}
          {mergePlan.conflicts.length === 0 ? <div className="empty-card"><CheckCircle2 size={17}/> No conflicting records. The plan is ready to apply.</div> : null}
        </div>
      </section> : null}

      <div className="review-actions">
        <button className="button button--secondary" onClick={() => mergePlan ? cancelPreparedMerge() : setWorkspaceMode('portfolio')}>{mergePlan ? <X size={15}/> : null}{mergePlan ? 'Cancel merge' : 'Return to portfolio'}</button>
        {!mergePlan && source ? <button className="button button--primary" onClick={() => mergeBranch(source.metadata.id)}><GitMerge size={16}/> Prepare governed merge</button> : null}
        {mergePlan ? <button className="button button--primary" disabled={unresolved > 0} onClick={applyPreparedMerge}><GitMerge size={16}/> Apply resolved merge</button> : null}
      </div>
    </section>
  );
}
