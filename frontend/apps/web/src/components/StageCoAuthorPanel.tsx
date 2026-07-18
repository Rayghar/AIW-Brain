import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleHelp,
  GitBranch,
  Loader2,
  Pencil,
  PauseCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
  X,
} from 'lucide-react';
import type { ArchitectureBrainProposalReceipt, StageCandidateState, StageCoAuthorProposal, StageCoAuthorTarget } from '@aiw/domain';
import { postJson } from '../lib/apiClient';
import { createPendingStageCoAuthorProposal, evidenceLabel, stageCoAuthorTitles } from '../lib/stageCoAuthor';
import { useWorkspaceStore } from '../store/workspaceStore';
import './stage-co-author.css';

interface StageCoAuthorPanelProps {
  targetStage: StageCoAuthorTarget;
  defaultOpen?: boolean;
  compact?: boolean;
  variant?: 'workspace' | 'output';
}

function proposalValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function editedProposalValue(original: unknown, edited: string | undefined): unknown {
  if (edited === undefined) return original;
  if (typeof original === 'string') return edited.trim();
  try { return JSON.parse(edited); } catch { return original; }
}

function ListSection({ title, items, icon }: { title: string; items: string[]; icon?: ReactNode }) {
  if (!items.length) return null;
  return <section className="stage-explanation__list-section">
    <h4>{icon}{title}</h4>
    <ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul>
  </section>;
}

export function StageCoAuthorPanel({ targetStage, defaultOpen = false, compact = false, variant = 'workspace' }: StageCoAuthorPanelProps) {
  const project = useWorkspaceStore((state) => state.project);
  const serverPersistenceEnabled = useWorkspaceStore((state) => state.serverPersistenceEnabled);
  const saveProjectToServer = useWorkspaceStore((state) => state.saveProjectToServer);
  const applyStageCoAuthorOperations = useWorkspaceStore((state) => state.applyStageCoAuthorOperations);
  const undo = useWorkspaceStore((state) => state.undo);
  type BrainStageProposal = StageCoAuthorProposal & { brainReceipt?: ArchitectureBrainProposalReceipt };
  const pendingProposal = createPendingStageCoAuthorProposal(project, targetStage);
  const [proposal, setProposal] = useState<BrainStageProposal>(pendingProposal);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [candidateStates, setCandidateStates] = useState<Record<string, StageCandidateState>>({});
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const automaticRequestKey = useRef<string | null>(null);

  useEffect(() => {
    const next = createPendingStageCoAuthorProposal(project, targetStage);
    setProposal(next);
    setSelected(new Set());
    setCandidateStates({});
    setEditedValues({});
    setError(null);
  }, [project.id, project.branch.id, targetStage]);

  const askSol = async () => {
    setLoading(true);
    setError(null);
    try {
      if (serverPersistenceEnabled) await saveProjectToServer();
      const result = await postJson<BrainStageProposal>(`/api/projects/${encodeURIComponent(project.id)}/branches/${encodeURIComponent(project.branch.id)}/stage-co-author`, {
        targetStage,
        intelligenceMode: 'hybrid',
        dataClassification: project.context.dataSensitivity === 'restricted' ? 'restricted' : project.context.dataSensitivity === 'confidential' ? 'confidential' : 'internal',
      });
      setProposal(result);
      setSelected(new Set(result.operations.filter((item) => item.validationStatus === 'ready').map((item) => item.id)));
      setCandidateStates(Object.fromEntries(result.operations.map((item) => [item.id, 'proposed'])));
      setEditedValues({});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The Architecture Brain is unavailable. No browser-generated architecture substitute was used.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!serverPersistenceEnabled) return;
    const key = `${project.id}:${project.branch.id}:${targetStage}:${variant}`;
    if (automaticRequestKey.current === key) return;
    automaticRequestKey.current = key;
    void askSol();
  // A mounted co-author surface requests one server-authoritative proposal. Project
  // revisions do not reset or refire the request; stale receipts remain visible and
  // are explicitly blocked from acceptance until the user regenerates them.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, project.branch.id, targetStage, variant, serverPersistenceEnabled]);

  const acceptSelected = () => {
    const governedProposal: BrainStageProposal = {
      ...proposal,
      operations: proposal.operations.map((operation) => ({
        ...operation,
        proposedValue: editedProposalValue(operation.proposedValue, editedValues[operation.id]),
        candidateState: selected.has(operation.id) ? 'accepted-for-project' : candidateStates[operation.id] ?? 'proposed',
      })),
    };
    applyStageCoAuthorOperations(governedProposal, [...selected]);
    setCandidateStates((current) => ({ ...current, ...Object.fromEntries([...selected].map((id) => [id, 'accepted-for-project'])) }));
    setSelected(new Set());
  };
  const explanation = proposal.explanation;
  const readyCount = proposal.operations.filter((item) => item.validationStatus === 'ready').length;
  const clarificationCount = proposal.operations.filter((item) => item.validationStatus === 'requires-clarification').length + proposal.clarifications.length;
  const stale = proposal.projectRevision !== project.revision;
  const staleStageCandidates = project.nodes.filter((node) => node.stage === targetStage && node.properties.candidateAuthority === 'candidate' && node.properties.candidateLifecycleState === 'stale');
  const modeLabel = proposal.mode === 'llm-assisted' ? 'Sol enriched' : proposal.mode === 'deterministic-fallback' ? 'Deterministic fallback' : 'Deterministic';
  const showComponentRationale = targetStage !== 'requirements' && targetStage !== 'qualityDrivers';
  const rationaleFocus: Record<StageCoAuthorTarget, string> = {
    requirements: 'outcomes, scope, stakeholders, constraints and assumptions',
    qualityDrivers: 'quality priorities, measurable scenarios and trade-offs',
    systemContext: 'system boundary, actors, external systems, journeys and context interactions',
    logicalApplication: 'responsibilities, boundaries, relationships and quality tactics',
    applicationRealization: 'deployable components, interfaces and implementation consequences',
    logicalTechnology: 'provider-neutral capabilities, constraints and quality obligations',
    physicalTechnology: 'products, topology, zones, resilience and recovery choices',
    reviewAssurance: 'findings, evidence, decisions, traceability and approval blockers',
    sddPack: 'approved model content, evidence, document coherence and handoff readiness',
  };

  const explanationContent = <>
    <section className="stage-explanation__outcome">
      <span><Target size={16}/></span>
      <div><h4>How this stage enables the business outcome</h4><p>{explanation.businessOutcomeNarrative}</p></div>
    </section>

    <div className="stage-explanation__grid">
      <ListSection title="Requirements and business drivers enabled" items={explanation.requirementEnablement} icon={<Target size={14}/>}/>
      <ListSection title="Design logic" items={explanation.designLogic} icon={<Workflow size={14}/>}/>
      <ListSection title="Interfaces and information flow" items={explanation.interfacesAndFlow} icon={<GitBranch size={14}/>}/>
      <ListSection title="Quality-attribute impact" items={explanation.qualityAttributeImpact} icon={<ShieldCheck size={14}/>}/>
      <ListSection title="Trade-offs accepted" items={explanation.tradeOffSummary} icon={<CircleHelp size={14}/>}/>
      <ListSection title="Risks and open questions" items={explanation.risksAndOpenQuestions} icon={<AlertTriangle size={14}/>}/>
      <ListSection title="Downstream consequences" items={explanation.downstreamConsequences}/>
      <ListSection title="Evidence required to complete this stage" items={explanation.completionEvidence}/>
    </div>

    {showComponentRationale ? <>
    <section className="stage-components" aria-label="Selected component explanations">
      <div className="stage-components__heading">
        <div><span className="eyebrow">Selected components</span><h4>What each component does and why it exists</h4></div>
        <small>{explanation.selectedComponents.length} explained</small>
      </div>
      {explanation.selectedComponents.length ? <div className="stage-components__grid">{explanation.selectedComponents.map((component) => <article key={component.id} className="stage-component-card">
        <header><div><span>{component.kind}</span><h5>{component.label}</h5></div><small>{component.id}</small></header>
        <dl>
          <div><dt>Role</dt><dd>{component.role}</dd></div>
          <div><dt>Why selected</dt><dd>{component.whySelected}</dd></div>
          <div><dt>What it enables</dt><dd><ul>{component.enables.map((item, index) => <li key={index}>{item}</li>)}</ul></dd></div>
          <div><dt>Trade-offs</dt><dd><ul>{component.tradeOffs.map((item, index) => <li key={index}>{item}</li>)}</ul></dd></div>
          {component.risks.length ? <div><dt>Risks</dt><dd><ul>{component.risks.map((item, index) => <li key={index}>{item}</li>)}</ul></dd></div> : null}
          {component.alternatives.length ? <div><dt>Alternatives considered</dt><dd><ul>{component.alternatives.map((item, index) => <li key={index}>{item}</li>)}</ul></dd></div> : null}
        </dl>
        <footer>
          {component.driverRefs.slice(0, 4).map((ref) => <span key={ref} title={evidenceLabel(project, ref)}>{evidenceLabel(project, ref)}</span>)}
          {component.qualityRefs.slice(0, 3).map((ref) => <span key={ref} title={evidenceLabel(project, ref)}>{evidenceLabel(project, ref)}</span>)}
        </footer>
      </article>)}</div> : <div className="stage-components__empty">No stage components exist yet. Use Sol Draft for structured fields or Sol Design for a reviewable model proposal.</div>}
    </section>
    </> : null}
  </>;

  const brainReceipt = proposal.brainReceipt ? <section className="stage-co-author__receipt" aria-label="Architecture Brain authority receipt">
    <span><strong>Brain receipt</strong> {proposal.brainReceipt.proposalId}</span>
    <span>Kernel {proposal.brainReceipt.manifest.kernelVersion}</span>
    <span>Knowledge {proposal.brainReceipt.manifest.knowledgeReleaseId}</span>
    <span>Cambridge {proposal.brainReceipt.manifest.cambridgeRulesetId}</span>
    <span>{proposal.brainReceipt.llm.used ? `LLM ${proposal.brainReceipt.llm.model ?? 'governed route'}` : proposal.brainReceipt.llm.requested ? 'Deterministic fallback' : 'Deterministic only'}</span>
  </section> : null;

  const trace = proposal.trace ? <footer className="stage-co-author__trace"><span>Provider {proposal.trace.providerId}</span><span>Model {proposal.trace.model}</span><span>{proposal.trace.latencyMs} ms</span><span>{proposal.trace.fallbackUsed ? 'Fallback used' : 'Live route'}</span></footer> : null;

  if (variant === 'output') {
    return <details className={`stage-co-author stage-co-author--output ${compact ? 'stage-co-author--compact' : ''}`} open={defaultOpen} data-testid={`stage-co-author-${targetStage}`}>
      <summary>
        <span className="stage-co-author__summary-icon"><BrainCircuit size={17}/></span>
        <span><strong>Open design rationale</strong><small>{stageCoAuthorTitles[targetStage]} · {rationaleFocus[targetStage]}</small></span>
        <span className={`stage-co-author__mode stage-co-author__mode--${proposal.mode}`}>{modeLabel}</span>
        <ChevronDown className="stage-co-author__chevron" size={16}/>
      </summary>
      <div className="stage-co-author__body">
        <header className="stage-co-author__header stage-co-author__header--output">
          <div><span className="eyebrow"><Sparkles size={12}/> Explainable design</span><h3>{explanation.title}</h3><p>{explanation.stagePurpose}</p></div>
          <button type="button" className="button button--ai" disabled={loading} onClick={() => void askSol()}>{loading ? <Loader2 className="spin" size={15}/> : <BrainCircuit size={15}/>} Refresh rationale with Sol</button>
        </header>
        <div className="stage-co-author__governance-note"><ShieldCheck size={15}/><span><strong>Model-grounded explanation.</strong> The canonical stage output remains authoritative; this narrative never silently changes it.</span></div>
        {error ? <div className="stage-co-author__error"><AlertTriangle size={15}/>{error}</div> : null}
        {explanationContent}
        {brainReceipt}
        {trace}
      </div>
    </details>;
  }

  return <section className={`stage-co-author stage-co-author--workspace ${compact ? 'stage-co-author--compact' : ''}`} data-testid={`stage-co-author-${targetStage}`}>
    <header className="stage-co-author__header stage-co-author__header--workspace">
      <div>
        <span className="eyebrow"><Sparkles size={12}/> Sol Draft</span>
        <h3>Draft the missing information for {stageCoAuthorTitles[targetStage]}</h3>
        <p>Generate structured, evidence-linked proposals. Review, edit or reject them before anything enters the canonical model.</p>
      </div>
      <span className={`stage-co-author__mode stage-co-author__mode--${proposal.mode}`}>{modeLabel}</span>
    </header>

    <div className="stage-co-author__primary-actions">
      <button type="button" className="button button--ai" disabled={loading} onClick={() => void askSol()}>{loading ? <Loader2 className="spin" size={15}/> : <BrainCircuit size={15}/>} Generate governed draft</button>
      <button type="button" className="button button--primary" disabled={!selected.size || stale} onClick={acceptSelected}><Check size={15}/> Accept selected ({selected.size})</button>
      <button type="button" className="button--quiet" onClick={undo}><RotateCcw size={14}/> Undo last accepted batch</button>
    </div>

    <div className="stage-co-author__governance-note"><ShieldCheck size={15}/><span><strong>Human-controlled draft layer.</strong> {proposal.notice}</span></div>
    {proposal.changeSets?.length ? <section className="stage-change-sets" aria-label="Coherent architecture change sets">
      <div className="stage-drafts__heading"><div><span className="eyebrow">Architecture change sets</span><h4>Choose a coherent boundary strategy before deciding individual changes</h4></div><span>{proposal.changeSets.length} alternative{proposal.changeSets.length === 1 ? '' : 's'}</span></div>
      <div className="stage-change-sets__grid">{proposal.changeSets.map((changeSet) => <article key={changeSet.id}>
        <header><div><small>{changeSet.validationPosture} · {changeSet.evidenceStrength} evidence</small><h5>{changeSet.title}</h5></div><span>{changeSet.operationIds.length} changes</span></header>
        <p>{changeSet.architectureHypothesis}</p>
        <dl>
          <div><dt>Graph diff</dt><dd>{changeSet.canvasDiff.addedNodeIds.length} nodes · {changeSet.canvasDiff.addedEdgeIds.length} relationships · {changeSet.canvasDiff.addedInterfaceIds.length} interfaces</dd></div>
          <div><dt>Problem</dt><dd>{changeSet.problemAddressed}</dd></div>
          <div><dt>Trade-offs</dt><dd>{changeSet.tradeOffs.join(' ') || 'No trade-off recorded.'}</dd></div>
          <div><dt>Assumptions</dt><dd>{changeSet.assumptions.join(' ') || 'No additional assumption recorded.'}</dd></div>
        </dl>
      </article>)}</div>
    </section> : null}
    {staleStageCandidates.length ? <div className="stage-co-author__error" data-testid="stale-stage-candidates"><AlertTriangle size={15}/>{staleStageCandidates.length} accepted candidate(s) are stale because upstream project intent changed. Regenerate this stage to replace only the affected candidate content.</div> : null}
    {stale ? <div className="stage-co-author__error"><AlertTriangle size={15}/>The project changed after this proposal was generated. Regenerate before accepting it.</div> : null}
    {error ? <div className="stage-co-author__error"><AlertTriangle size={15}/>{error}</div> : null}

    <section className="stage-drafts" aria-label="Sol field drafts">
      <div className="stage-drafts__heading">
        <div><span className="eyebrow">What AIW proposes</span><h4>Review actionable, traceable candidate changes for this stage</h4></div>
        <span>{readyCount} ready · {clarificationCount} need clarification</span>
      </div>
      {proposal.operations.length ? <div className="stage-drafts__list">{proposal.operations.map((operation) => {
        const isReady = operation.validationStatus === 'ready';
        const isSelected = selected.has(operation.id);
        const candidateState = candidateStates[operation.id] ?? operation.candidateState ?? 'proposed';
        return <article key={operation.id} className={`stage-draft stage-draft--${operation.validationStatus}`}>
          <label className="stage-draft__select">
            <input type="checkbox" disabled={!isReady} checked={isSelected} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(operation.id); else next.delete(operation.id); return next; })}/>
            <span>{candidateState} · {isReady ? 'ready to review' : operation.validationStatus === 'blocked' ? 'blocked' : 'clarification required'}</span>
          </label>
          <div className="stage-draft__content">
            <header><div><small>{operation.targetPath}</small><h5>{operation.label}</h5></div><span>{Math.round(operation.confidence * 100)}% confidence</span></header>
            <textarea aria-label={`Edit ${operation.label}`} value={editedValues[operation.id] ?? proposalValue(operation.proposedValue)} onChange={(event) => setEditedValues((current) => ({ ...current, [operation.id]: event.target.value }))}/>
            <p><strong>Why:</strong> {operation.rationale || 'No rationale supplied.'}</p>
            {operation.tradeOffs.length ? <p><strong>Trade-off:</strong> {operation.tradeOffs.join(' ')}</p> : null}
            {operation.downstreamEffects.length ? <p><strong>Downstream effect:</strong> {operation.downstreamEffects.join(' ')}</p> : null}
            {operation.missingInformation.length ? <div className="stage-draft__missing"><CircleHelp size={13}/>{operation.missingInformation.join(' ')}</div> : null}
            <details className="stage-draft__traceability">
              <summary>Traceability, alternatives and impact</summary>
              <dl>
                <div><dt>Authority</dt><dd>{operation.authority ?? 'candidate'} · review required</dd></div>
                <div><dt>Requirements</dt><dd>{operation.requirementRefs.length ? operation.requirementRefs.map((ref) => evidenceLabel(project, ref)).join(', ') : 'No requirement reference supplied'}</dd></div>
                <div><dt>Quality drivers</dt><dd>{operation.qualityDriverRefs?.length ? operation.qualityDriverRefs.map((ref) => evidenceLabel(project, ref)).join(', ') : 'None explicitly linked'}</dd></div>
                <div><dt>Risks</dt><dd>{operation.riskRefs?.length ? operation.riskRefs.map((ref) => evidenceLabel(project, ref)).join(', ') : 'None explicitly linked'}</dd></div>
                <div><dt>Decisions</dt><dd>{operation.decisionRefs?.length ? operation.decisionRefs.map((ref) => evidenceLabel(project, ref)).join(', ') : 'Candidate decision not yet accepted'}</dd></div>
                <div><dt>Evidence</dt><dd>{operation.evidenceRefs.length ? operation.evidenceRefs.map((ref) => evidenceLabel(project, ref)).join(', ') : 'Unavailable — abstention remains visible'}</dd></div>
                <div><dt>Affected objects</dt><dd>{operation.affectedObjectIds?.length ? operation.affectedObjectIds.join(', ') : operation.targetId ?? operation.targetPath}</dd></div>
                <div><dt>Alternatives</dt><dd>{operation.alternatives?.length ? operation.alternatives.join(' ') : 'No alternative supplied'}</dd></div>
                <div><dt>Assumptions</dt><dd>{operation.assumptions?.length ? operation.assumptions.join(' ') : 'No additional assumption supplied'}</dd></div>
              </dl>
            </details>
            {operation.evidenceRefs.length ? <footer>{operation.evidenceRefs.map((ref) => <span key={ref}>{evidenceLabel(project, ref)}</span>)}</footer> : null}
            <div className="stage-draft__actions" aria-label={`Decide ${operation.label}`}>
              <button type="button" className="button--quiet" onClick={() => { setCandidateStates((current) => ({ ...current, [operation.id]: 'under-review' })); setSelected((current) => new Set(current).add(operation.id)); }}><Pencil size={13}/> Modify / review</button>
              <button type="button" className="button--quiet" onClick={() => { setCandidateStates((current) => ({ ...current, [operation.id]: 'deferred' })); setSelected((current) => { const next = new Set(current); next.delete(operation.id); return next; }); }}><PauseCircle size={13}/> Defer</button>
              <button type="button" className="button--quiet" onClick={() => { setCandidateStates((current) => ({ ...current, [operation.id]: 'rejected' })); setSelected((current) => { const next = new Set(current); next.delete(operation.id); return next; }); }}><X size={13}/> Reject</button>
            </div>
          </div>
        </article>;
      })}</div> : <div className="stage-drafts__empty">No safe field draft is available from the current evidence. Supply the missing facts rather than allowing Sol to invent them.</div>}
    </section>

    {proposal.clarifications.length ? <section className="stage-clarifications">
      <div className="stage-drafts__heading"><div><span className="eyebrow">Clarifications</span><h4>Questions that must be answered before stronger recommendations</h4></div></div>
      <div>{proposal.clarifications.map((item) => <article key={item.id}><CircleHelp size={15}/><div><strong>{item.question}</strong><p>{item.whyItMatters}</p></div>{item.blocking ? <span>Blocking</span> : null}</article>)}</div>
    </section> : null}

    <details className="stage-co-author__explanation-disclosure">
      <summary><span><Target size={15}/><strong>Preview the reasoning behind these proposals</strong></span><ChevronDown size={15}/></summary>
      <div>{explanationContent}</div>
    </details>
    {brainReceipt}
    {trace}
  </section>;
}
