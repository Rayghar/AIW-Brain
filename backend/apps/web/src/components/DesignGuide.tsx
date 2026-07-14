import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BookOpenCheck, BrainCircuit, CheckCircle2, Compass, Lightbulb, ShieldAlert, Sparkles, X } from 'lucide-react';
import type { ArchitectureStage, DesignGuidanceItem, EntityKind } from '@aiw/domain';
import { deriveDesignGuidance } from '@aiw/engine';
import { useWorkspaceStore } from '../store/workspaceStore';
import { postJson } from '../lib/apiClient';

const icons = { 'next-step': Compass, warning: ShieldAlert, recommendation: Sparkles, 'knowledge-tip': Lightbulb, obligation: BookOpenCheck } as const;

interface EvidencePack {
  knowledgeRelease: string;
  recommendations: Array<{ patternId: string; patternName: string; eligible: boolean; totalScore: number; reasons: string[]; evidenceConnectorIds: string[] }>;
}

interface StageAdviceResponse {
  available: boolean;
  degradedReason?: string;
  result?: {
    stage: string;
    insights: Array<{ title: string; detail: string; kbRef: string }>;
    suggestedElements: Array<{ kind: EntityKind; label: string; reason: string; kbRef: string }>;
    counterfactual: string;
    knowledgeReleaseId: string;
    rejectedCitationCount: number;
  };
  routeId?: string;
  providerId?: string;
  model?: string;
  fallbackUsed?: boolean;
}

export function DesignGuide({ placement, compact = false }: { placement: DesignGuidanceItem['placement']; compact?: boolean }) {
  const project = useWorkspaceStore((state) => state.project);
  const library = useWorkspaceStore((state) => state.library);
  const contextual = useWorkspaceStore((state) => state.contextual);
  const findings = useWorkspaceStore((state) => state.findings);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const acceptStyle = useWorkspaceStore((state) => state.acceptStyleRecommendation);
  const invokeAudit = useWorkspaceStore((state) => state.invokeAudit);
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const addNode = useWorkspaceStore((state) => state.addNode);
  const dismissed = useWorkspaceStore((state) => state.dismissedGuidanceIds);
  const dismiss = useWorkspaceStore((state) => state.dismissGuidance);
  const [pack, setPack] = useState<EvidencePack | null>(null);
  const [pending, setPending] = useState<DesignGuidanceItem | null>(null);
  const [advisor, setAdvisor] = useState<StageAdviceResponse | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorError, setAdvisorError] = useState<string | null>(null);

  useEffect(() => {
    if (!['canvas','inspector','global'].includes(placement)) return;
    const selected = project.nodes.find((node) => node.id === selectedNodeId);
    const query = [project.description, ...project.objectives, ...project.constraints, selected?.label, selected?.kind, ...(selected?.tags ?? [])].filter(Boolean).join(' ');
    if (query.trim().length < 3) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void postJson<EvidencePack>('/api/pattern-intelligence/recommend', { query, project, stage: project.activeStage, ...(selectedNodeId ? { scopeNodeId: selectedNodeId } : {}), limit: 4 })
        .then((value) => { if (!controller.signal.aborted) setPack(value); })
        .catch(() => { if (!controller.signal.aborted) setPack(null); });
    }, 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [project.id, project.revision, project.activeStage, selectedNodeId, placement]);

  const items = useMemo(() => {
    const base = deriveDesignGuidance(project, library, contextual, findings, selectedNodeId)
      .filter((item) => item.placement === placement || (placement === 'global' && item.placement === 'global'))
      .filter((item) => !dismissed.includes(item.id));
    const top = pack?.recommendations.find((item) => item.eligible && item.totalScore >= 45);
    if (top && ['canvas','inspector'].includes(placement) && !dismissed.includes(`guide-release-${top.patternId}-${placement}`)) {
      base.unshift({
        id: `guide-release-${top.patternId}-${placement}`,
        stage: project.activeStage,
        placement,
        priority: top.totalScore >= 75 ? 'high' : 'medium',
        kind: 'recommendation',
        title: `${top.patternName} may strengthen this design`,
        message: top.reasons[0] ?? `This pattern scored ${top.totalScore} for the current architecture context.`,
        rationale: `Retrieved from approved knowledge release ${pack?.knowledgeRelease ?? 'active release'} with ${top.evidenceConnectorIds.length} governed source reference(s).`,
        linkedRecordIds: [top.patternId, ...top.evidenceConnectorIds.slice(0, 2)],
        source: 'deterministic-knowledge',
        action: { type: 'review-pattern', label: 'Review before applying', target: top.patternId },
        dismissible: true,
      });
    }
    return base.slice(0, compact ? 1 : 4);
  }, [project, library, contextual, findings, selectedNodeId, placement, compact, dismissed, pack]);


  const requestStageAdvice = async () => {
    setAdvisorLoading(true); setAdvisorError(null);
    try {
      const response = await postJson<StageAdviceResponse>('/api/design/stage-advice', {
        project,
        ...(selectedNodeId ? { selectedNodeId } : {}),
      });
      setAdvisor(response);
      if (!response.available) setAdvisorError(response.degradedReason ?? 'The configured architecture-reasoning route is unavailable.');
    } catch (cause) {
      setAdvisor(null);
      setAdvisorError(cause instanceof Error ? cause.message : 'Stage advice failed.');
    } finally { setAdvisorLoading(false); }
  };

  const addSuggestedElement = (element: NonNullable<StageAdviceResponse['result']>['suggestedElements'][number]) => {
    addNode({
      kind: element.kind,
      label: element.label,
      properties: { aiwSuggestionReason: element.reason, knowledgeRecordId: element.kbRef, proposalOrigin: 'llm-stage-advisor' },
      tags: ['ai-proposed', `knowledge:${element.kbRef}`],
    });
  };

  if (!items.length && !['canvas','inspector'].includes(placement)) return null;

  const execute = async (item: DesignGuidanceItem) => {
    if (item.action.type === 'navigate') {
      const target = item.action.target;
      if (target && ['designIntent','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','validationRealization'].includes(target)) setActiveStage(target as ArchitectureStage);
      else if (target) setWorkspaceMode(target as any);
    } else if (item.action.type === 'accept-style' && item.action.target) acceptStyle(item.action.target);
    else if (item.action.type === 'review-pattern') {
      if (item.action.target) sessionStorage.setItem('aiw-pattern-focus', item.action.target);
      setWorkspaceMode('patterns');
    } else if (item.action.type === 'select-node' && item.action.target) selectNode(item.action.target);
    else if (item.action.type === 'open-knowledge') setWorkspaceMode('knowledge');
    else if (item.action.type === 'run-audit') await invokeAudit();
    setPending(null);
  };

  const act = (item: DesignGuidanceItem) => {
    if (['accept-style','review-pattern','run-audit'].includes(item.action.type)) setPending(item);
    else void execute(item);
  };

  return <>
    <section className={`design-guide ${compact ? 'design-guide--compact' : ''}`} aria-label="Contextual architecture guidance">
      <header><BrainCircuit size={17}/><div><span>Knowledge guide</span><strong>Suggestions for this point in the design</strong></div>{['canvas','inspector'].includes(placement) ? <button className="guide-advisor-button" disabled={advisorLoading} onClick={() => void requestStageAdvice()}>{advisorLoading ? 'Thinking…' : 'Ask AI stage advisor'}</button> : null}</header>
      <div className="design-guide__items">{items.map((item) => {
        const Icon = icons[item.kind];
        return <article key={item.id} className={`design-guide-card priority-${item.priority}`}>
          <Icon size={17}/>
          <div><div className="design-guide-card__title"><strong>{item.title}</strong><span>{item.priority}</span></div><p>{item.message}</p>{!compact ? <small>{item.rationale}</small> : null}
            <footer>{item.linkedRecordIds.length ? <span><BookOpenCheck size={12}/>{item.linkedRecordIds.slice(0,3).join(', ')}</span> : <span><CheckCircle2 size={12}/>Governed workflow</span>}{item.action.type !== 'none' ? <button onClick={() => act(item)}>{item.action.label}<ArrowRight size={13}/></button> : null}</footer>
          </div>
          {item.dismissible ? <button className="guide-dismiss" aria-label="Dismiss suggestion" onClick={() => dismiss(item.id)}><X size={13}/></button> : <AlertTriangle size={14}/>} 
        </article>;
      })}</div>
      {advisorError ? <div className="advisor-degraded"><AlertTriangle size={14}/><span>{advisorError} Deterministic guidance remains active.</span></div> : null}
      {advisor?.available && advisor.result ? <section className="stage-advisor-results" aria-label="AI stage advisor results">
        <header><Sparkles size={15}/><div><strong>AI stage advisor</strong><small>{advisor.providerId ?? 'configured provider'} · {advisor.model ?? 'model'} · {advisor.result.knowledgeReleaseId}</small></div></header>
        {advisor.result.insights.map((insight) => <article className="stage-advisor-insight" key={`${insight.kbRef}-${insight.title}`}><strong>{insight.title}</strong><p>{insight.detail}</p><span><BookOpenCheck size={12}/>{insight.kbRef}</span></article>)}
        {advisor.result.suggestedElements.length ? <div className="stage-advisor-elements"><strong>Reviewable canvas suggestions</strong>{advisor.result.suggestedElements.map((element) => <article key={`${element.kind}-${element.label}`}><div><b>{element.label}</b><small>{element.kind} · {element.kbRef}</small><p>{element.reason}</p></div><button onClick={() => addSuggestedElement(element)}>Add to canvas<ArrowRight size={13}/></button></article>)}</div> : null}
        {advisor.result.counterfactual ? <div className="stage-advisor-counterfactual"><strong>What could change the recommendation?</strong><p>{advisor.result.counterfactual}</p></div> : null}
        {advisor.result.rejectedCitationCount ? <small>{advisor.result.rejectedCitationCount} unsupported model citation(s) were rejected.</small> : null}
      </section> : null}
    </section>
    {pending ? <div className="modal-backdrop" role="presentation" onMouseDown={() => setPending(null)}><section className="guide-review-modal" role="dialog" aria-modal="true" aria-label="Review knowledge-guided action" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span className="eyebrow">Human-controlled action</span><h3>{pending.title}</h3></div><button className="icon-button" onClick={() => setPending(null)}><X size={17}/></button></header>
      <p>{pending.message}</p><div className="guide-review-rationale"><BookOpenCheck size={17}/><span><strong>Why AIW is suggesting this</strong><small>{pending.rationale}</small></span></div>
      {pending.linkedRecordIds.length ? <div className="coarchitect-citations">{pending.linkedRecordIds.map((id) => <span key={id}>{id}</span>)}</div> : null}
      <footer><button className="button button--secondary" onClick={() => setPending(null)}>Not now</button><button className="button button--primary" onClick={() => void execute(pending)}>{pending.action.label}<ArrowRight size={15}/></button></footer>
    </section></div> : null}
  </>;
}
