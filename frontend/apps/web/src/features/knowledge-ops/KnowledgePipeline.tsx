import { ChevronRight, ShieldCheck } from 'lucide-react';
import type { KnowledgeOpsQueueSummary } from '@aiw/knowledge';

// Knowledge-Ops pipeline view (Studio UX audit, Gap 9) — the governance story
// as a flow, not a scatter of cards: sources → snapshots → candidate claims →
// normalization → contradictions → review → release candidate → activation.
// Front stages project LIVE queue counts from the summary; terminal stages show
// the governed promotion gate (no invented downstream numbers). Each queue stage
// navigates to its tab.

type Stage = { id: string; label: string; count?: number; tab?: string; governed?: boolean; hint: string };

export function KnowledgePipeline({
  summary,
  onNavigate,
}: {
  summary?: KnowledgeOpsQueueSummary;
  onNavigate: (tab: string) => void;
}) {
  const s = summary;
  const stages: Stage[] = [
    { id: 'sources', label: 'Sources', count: s?.staleSources ?? 0, tab: 'sources', hint: 'Registered sources; stale ones need refresh' },
    { id: 'snapshots', label: 'Snapshots', tab: 'sources', hint: 'Commit-pinned into quarantine' },
    { id: 'claims', label: 'Candidate claims', count: s?.pendingClaims ?? 0, tab: 'claims', hint: 'Atomic claims awaiting review' },
    { id: 'normalize', label: 'Normalization', count: (s?.duplicateGroups ?? 0) + (s?.synonymGroups ?? 0), tab: 'duplicates', hint: 'Duplicate and synonym groups to resolve' },
    { id: 'contradictions', label: 'Contradictions', count: s?.openContradictions ?? 0, tab: 'contradictions', hint: 'Open contradictions — context-split, never delete' },
    { id: 'review', label: 'Review', count: s?.assignedItems ?? 0, tab: 'claims', hint: 'Assigned to a named reviewer' },
    { id: 'release', label: 'Release candidate', governed: true, hint: 'Staged, diffed, gate-validated — never direct mutation' },
    { id: 'activation', label: 'Signed & active', governed: true, hint: 'Promoted by a named human; pinned per tenant' },
  ];

  return (
    <section className="kb-pipeline" aria-label="Knowledge pipeline">
      <div className="kb-pipeline__track">
        {stages.map((stage, i) => (
          <div className="kb-pipeline__stage-wrap" key={stage.id}>
            <button
              type="button"
              className={`kb-pipeline__stage${stage.governed ? ' kb-pipeline__stage--governed' : ''}${(stage.count ?? 0) > 0 ? ' kb-pipeline__stage--active' : ''}`}
              onClick={() => stage.tab && onNavigate(stage.tab)}
              disabled={!stage.tab}
              title={stage.hint}
            >
              {stage.governed ? <ShieldCheck size={13} aria-hidden /> : null}
              <span className="kb-pipeline__label">{stage.label}</span>
              {stage.count !== undefined ? (
                <span className={`kb-pipeline__count${stage.count > 0 ? ' kb-pipeline__count--nonzero' : ''}`}>{stage.count}</span>
              ) : stage.governed ? (
                <span className="kb-pipeline__gate">gate</span>
              ) : (
                <span className="kb-pipeline__flow">flow</span>
              )}
            </button>
            {i < stages.length - 1 ? <ChevronRight className="kb-pipeline__arrow" size={15} aria-hidden /> : null}
          </div>
        ))}
      </div>
      <p className="kb-pipeline__doctrine">Candidate knowledge cannot influence production recommendations until a named human promotes a validated release.</p>
    </section>
  );
}
