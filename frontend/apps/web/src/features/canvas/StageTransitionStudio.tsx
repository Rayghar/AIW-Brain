import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  Check,
  Combine,
  CopyPlus,
  GitBranch,
  Link2,
  ShieldAlert,
  Sparkles,
  Split,
  X,
} from 'lucide-react';
import type { ArchitectureStage, StageTransitionCandidate, StageTransitionProposal } from '@aiw/domain';
import { createStageTransitionProposal } from '@aiw/modelling';
import { useWorkspaceStore } from '../../store/workspaceStore';

function label(stage: ArchitectureStage) {
  return stage.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

export interface StageTransitionStudioProps {
  targetStage: ArchitectureStage;
  onClose: () => void;
}

export function StageTransitionStudio({ targetStage, onClose }: StageTransitionStudioProps) {
  const project = useWorkspaceStore((state) => state.project);
  const currentUserId = useWorkspaceStore((state) => state.currentUserId);
  const applyProposal = useWorkspaceStore((state) => state.applyStageTransitionProposal);
  const baseline = useMemo(() => createStageTransitionProposal(project, targetStage, currentUserId), [project.id, project.branch.id, project.revision, targetStage, currentUserId]);
  const [candidates, setCandidates] = useState<StageTransitionCandidate[]>(baseline.candidates);
  const selected = candidates.filter((candidate) => candidate.selected);
  const sourceNodes = new Map(project.nodes.map((node) => [node.id, node]));

  function toggle(candidateId: string) {
    setCandidates((items) => items.map((item) => item.id === candidateId ? { ...item, selected: !item.selected } : item));
  }
  function splitCandidate(candidateId: string) {
    setCandidates((items) => {
      const source = items.find((item) => item.id === candidateId);
      if (!source) return items;
      const splitIndex = items.filter((item) => item.id.startsWith(`${candidateId}-split-`)).length + 2;
      const split: StageTransitionCandidate = {
        ...structuredClone(source),
        id: `${candidateId}-split-${splitIndex}`,
        classification: 'split',
        rationale: `${source.rationale} This is an additional independently deployable projection created by the architect.`,
        proposedNode: {
          ...structuredClone(source.proposedNode),
          id: `${source.proposedNode.id}-split-${splitIndex}`,
          semanticId: `${source.proposedNode.semanticId ?? source.proposedNode.id}:split:${splitIndex}`,
          label: `${source.proposedNode.label} ${splitIndex}`,
          positions: Object.fromEntries(Object.entries(source.proposedNode.positions).map(([stage, point]) => [stage, { x: point.x + 42 * splitIndex, y: point.y + 34 * splitIndex }])),
          properties: { ...source.proposedNode.properties, transitionClassification: 'split' },
        },
        selected: true,
      };
      return [...items, split];
    });
  }

  function mergeSelected() {
    setCandidates((items) => {
      const mergeable = items.filter((item) => item.selected);
      if (mergeable.length < 2) return items;
      const first = mergeable[0]!;
      const sourceNodeIds = [...new Set(mergeable.flatMap((item) => item.sourceNodeIds))];
      const mergedId = `candidate-${targetStage}-merged-${sourceNodeIds.slice().sort().join('-')}`;
      const merged: StageTransitionCandidate = {
        ...structuredClone(first),
        id: mergedId,
        sourceNodeIds,
        classification: 'merged',
        knowledgeRecordIds: [...new Set(mergeable.flatMap((item) => item.knowledgeRecordIds))],
        rationale: `${sourceNodeIds.length} upstream responsibilities are intentionally merged into one accountable ${first.proposedNode.kind} projection.`,
        proposedNode: {
          ...structuredClone(first.proposedNode),
          id: `transition-node-${targetStage}-merged-${sourceNodeIds.slice().sort().join('-')}`,
          semanticId: `${project.id}:${targetStage}:merged:${sourceNodeIds.slice().sort().join('|')}`,
          label: `${mergeable.map((item) => item.proposedNode.label).join(' + ')} Consolidated`,
          lineageFrom: sourceNodeIds,
          properties: { ...first.proposedNode.properties, transitionClassification: 'merged' },
        },
        selected: true,
      };
      return [...items.map((item) => mergeable.some((candidate) => candidate.id === item.id) ? { ...item, selected: false } : item), merged];
    });
  }

  function apply() {
    const proposal: StageTransitionProposal = { ...baseline, candidates };
    applyProposal(proposal);
    onClose();
  }

  return createPortal(
    <section className="stage-transition-studio" aria-label="Governed stage transition studio" data-testid="stage-transition-studio">
      <header>
        <div>
          <span className="eyebrow"><GitBranch size={14}/> Governed stage transition</span>
          <h2>{label(baseline.sourceStage)} <ArrowRight size={18}/> {label(targetStage)}</h2>
          <p>Review how approved upstream responsibilities become downstream architecture elements. Nothing is changed until you apply the selected proposal.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close stage transition studio"><X size={18}/></button>
      </header>

      <div className="stage-transition-studio__coverage">
        <article><strong>{baseline.coverage.coveragePercent}%</strong><span>current realization coverage</span></article>
        <article><strong>{baseline.coverage.unresolvedUpstreamNodeIds.length}</strong><span>unresolved upstream elements</span></article>
        <article><strong>{baseline.coverage.orphanedTargetNodeIds.length}</strong><span>orphaned downstream elements</span></article>
        <article><strong>{selected.length}</strong><span>selected proposals</span></article>
      </div>

      {baseline.warnings.length ? <div className="stage-transition-studio__warnings"><ShieldAlert size={16}/><ul>{baseline.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}

      <div className="stage-transition-studio__body">
        <aside>
          <h3>Transition contract</h3>
          <ol>
            <li><b>1</b><span>Inspect approved upstream responsibilities.</span></li>
            <li><b>2</b><span>Review deterministic projections and lineage.</span></li>
            <li><b>3</b><span>Select, split, merge or defer proposals.</span></li>
            <li><b>4</b><span>Apply a reviewable change set.</span></li>
            <li><b>5</b><span>Validate the refreshed Architecture Viewbook.</span></li>
          </ol>
          <p><Sparkles size={14}/> Recommendations are deterministic and evidence-bound. They do not silently rewrite the model.</p>
        </aside>

        <div className="stage-transition-studio__list">
          {candidates.map((candidate) => {
            const sources = candidate.sourceNodeIds.map((id) => sourceNodes.get(id)).filter(Boolean);
            return <article key={candidate.id} className={candidate.selected ? 'selected' : ''}>
              <button type="button" className="stage-transition-studio__select" onClick={() => toggle(candidate.id)} aria-pressed={candidate.selected}>
                {candidate.selected ? <Check size={14}/> : <span/>}
              </button>
              <div className="stage-transition-studio__mapping">
                <div>{sources.map((source) => <span key={source!.id}><small>{source!.kind}</small><strong>{source!.label}</strong></span>)}</div>
                <ArrowRight size={18}/>
                <div><span><small>{candidate.proposedNode.kind}</small><strong>{candidate.proposedNode.label}</strong></span></div>
              </div>
              <div className="stage-transition-studio__candidate-meta">
                <span><Link2 size={12}/> {candidate.proposedRelationshipKind}</span>
                <span><Split size={12}/> {candidate.classification}</span>
                <span>{candidate.knowledgeRecordIds.length} knowledge links</span>
                <button type="button" className="stage-transition-inline-action" onClick={() => splitCandidate(candidate.id)} title="Split this upstream responsibility into another downstream element"><CopyPlus size={12}/> Split projection</button>
              </div>
              <p>{candidate.rationale}</p>
            </article>;
          })}
          {!candidates.length ? <div className="stage-transition-studio__empty"><Check size={28}/><strong>No new deterministic projections are required.</strong><p>Existing downstream elements already cover the supported mappings. Review unresolved and orphaned items before approval.</p></div> : null}
        </div>
      </div>

      <footer>
        <button type="button" className="button button--secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="button button--secondary" onClick={mergeSelected} disabled={selected.length < 2} title="Merge selected proposals into one downstream architecture element"><Combine size={15}/> Merge selected</button>
        <button type="button" className="button button--ai" onClick={apply} disabled={!selected.length}><GitBranch size={15}/> Apply {selected.length} governed projection{selected.length === 1 ? '' : 's'}</button>
      </footer>
    </section>
   , document.body);
}
