import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, GitCompareArrows, Layers3, Search, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react';
import { sprint78PatternCorpus, type PatternKnowledgeRecord } from '@aiw/domain';
import { buildRecommendationEvidencePack } from '@aiw/engine';
import { useWorkspaceStore } from '../store/workspaceStore';
import { VisualCompositionStudio } from './VisualCompositionStudio';

type Tab = 'candidates' | 'compose' | 'catalogue';
const typeLabel: Record<PatternKnowledgeRecord['recordType'],string> = { style:'Style', pattern:'Pattern', 'anti-pattern':'Anti-pattern', 'topology-template':'Template', 'component-archetype':'Component', 'reference-architecture':'Reference' };
const COMPOSITION_TYPES = new Set<PatternKnowledgeRecord['recordType']>(['style','pattern','topology-template','component-archetype','reference-architecture']);

function isCompositionCandidate(record: PatternKnowledgeRecord) {
  if (record.lifecycle !== 'approved' || record.recordType === 'anti-pattern' || !COMPOSITION_TYPES.has(record.recordType)) return false;
  if (record.category === 'governance') return false;
  // The default architect journey should only recommend records that can change
  // the design or create a concrete obligation. Governance vocabulary remains
  // searchable in Knowledge Studio, but is not presented as an adoptable pattern.
  return Boolean(record.topology?.nodes.length || record.componentKit?.length || record.interfaceKit?.length || record.obligations.length || record.generationContract);
}

export function PatternIntelligenceWorkspace() {
  const project = useWorkspaceStore((state) => state.project);
  const [tab,setTab] = useState<Tab>('candidates');
  const [query,setQuery] = useState('');
  const [selectedId,setSelectedId] = useState('');
  const modellingStages = ['logicalApplication','applicationRealization','logicalTechnology','physicalTechnology'] as const;
  const effectiveStage = modellingStages.includes(project.activeStage as (typeof modellingStages)[number])
    ? project.activeStage
    : modellingStages.find((stage) => !project.nodes.some((node) => node.stage === stage)) ?? 'logicalApplication';
  const activeNodes = project.nodes.filter(n=>n.stage===effectiveStage);
  const scopedContext = [
    effectiveStage,
    ...project.objectives,
    ...project.constraints,
    ...project.qualityPriorities.map(q=>q.attributeId),
    ...project.styleDecisions.filter(d=>d.status==='accepted').map(d=>d.styleId),
    ...activeNodes.flatMap(node=>[node.label,node.kind,...node.tags]),
  ].join(' ');
  const designCorpus = useMemo(() => sprint78PatternCorpus.filter(isCompositionCandidate), []);
  const stageCorpus = useMemo(
    () => designCorpus.filter((record) => !record.applicableStages.length || record.applicableStages.includes(effectiveStage)),
    [designCorpus, effectiveStage],
  );
  const recommendation = useMemo(() => buildRecommendationEvidencePack({ query: query || scopedContext, project, stage: effectiveStage, limit: 6 }, stageCorpus), [project,query,scopedContext,effectiveStage,stageCorpus]);
  const recommendedIds = recommendation.recommendations.map((item)=>item.patternId);

  useEffect(() => {
    if (!recommendedIds.length) { setSelectedId(''); return; }
    setSelectedId((current) => recommendedIds.includes(current) ? current : recommendedIds[0]!);
  }, [recommendedIds.join('|')]);

  const selected = stageCorpus.find(r=>r.id===selectedId);
  const catalogue = useMemo(() => stageCorpus.filter(r => !query || `${r.name} ${r.summary} ${r.problem} ${r.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())).slice(0,48), [query,stageCorpus]);
  const acceptedStyle = project.styleDecisions.find(d=>d.status==='accepted')?.styleId ?? 'No style accepted yet';

  return <section className="composition-workspace rc1063-composition">
    <header className="decision-flow-hero">
      <div><span className="eyebrow">Architecture composition</span><h1>Choose patterns that fit this model scope</h1><p>AIW ranks only design-capable, approved Pattern DNA for the active stage. Inspect evidence, preview the canonical change and accept its obligations before the model changes.</p></div>
      <div className="decision-flow-context"><span>Active stage</span><strong>{effectiveStage.replace(/([A-Z])/g,' $1')}</strong><small>{activeNodes.length} scoped object(s) · {acceptedStyle}</small></div>
    </header>
    <section className="decision-input-strip" aria-label="Composition inputs">
      <div><span>Scope</span><strong>{activeNodes.length ? `${activeNodes.length} model object(s)` : 'Stage scope not modelled'}</strong></div>
      <div><span>Top drivers</span><strong>{project.qualityPriorities.slice(0,3).map(q=>q.attributeId).join(' · ') || 'Capture quality drivers'}</strong></div>
      <div><span>Knowledge release</span><strong>{recommendation.knowledgeRelease}</strong></div>
      <button className="button button--primary" disabled={!selectedId} onClick={()=>setTab('compose')}><Layers3 size={15}/> Preview model change</button>
    </section>
    <nav className="decision-flow-tabs" aria-label="Architecture composition steps">
      <button className={tab==='candidates'?'active':''} onClick={()=>setTab('candidates')}>1. Candidate fit</button>
      <button className={tab==='compose'?'active':''} onClick={()=>setTab('compose')} disabled={!selectedId}>2. Preview & apply</button>
      <button className={tab==='catalogue'?'active':''} onClick={()=>setTab('catalogue')}>3. Explore design catalogue</button>
    </nav>
    {tab==='candidates' ? <div className="candidate-layout">
      <section className="candidate-list panel-card"><header><div><span className="eyebrow">Context-qualified candidates</span><h2>Recommended for this stage and scope</h2></div><label className="compact-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Refine by force, risk or quality attribute"/></label></header>
        <div className="candidate-cards">{recommendation.recommendations.map((item,index)=><button key={item.patternId} className={selectedId===item.patternId?'selected':''} onClick={()=>setSelectedId(item.patternId)}><span>{index+1}</span><div><strong>{item.patternName}</strong><small>{item.eligible?'Eligible':'Excluded'} · score {item.totalScore} · {item.evidenceConnectorIds.length} source(s)</small><p>{item.reasons.slice(0,2).join(' ')}</p></div><b>{item.totalScore}</b></button>)}</div>
        {!recommendation.recommendations.length ? <div className="composition-empty-state"><Sparkles size={22}/><strong>No governed design candidate fits this stage yet</strong><p>Add quality drivers or model at least one object, then refresh the search. AIW will not substitute governance vocabulary for a real architecture pattern.</p></div> : null}
      </section>
      <aside className="candidate-inspector panel-card">{selected ? <><span className="eyebrow">Pattern DNA</span><h2>{selected.name}</h2><p>{selected.problem}</p><h3>Why it fits</h3><ul>{selected.context.slice(0,3).map(x=><li key={x}><CheckCircle2 size={14}/>{x}</li>)}</ul><h3>Trade-offs and risks</h3><ul>{[...selected.forces,...selected.risks].slice(0,4).map(x=><li key={x}><TriangleAlert size={14}/>{x}</li>)}</ul><h3>Generated design contract</h3><div className="pattern-generation-facts"><span>{selected.topology?.nodes.length ?? 0}<small>objects</small></span><span>{selected.interfaceKit?.length ?? 0}<small>interfaces</small></span><span>{selected.obligations.length}<small>obligations</small></span></div><div className="obligation-summary"><ShieldCheck size={16}/><strong>{selected.obligations.length}</strong><span>will be reviewed before apply</span></div><button className="button button--primary" onClick={()=>setTab('compose')}><GitCompareArrows size={15}/> Compare and preview</button></> : <div className="composition-empty-state"><Sparkles size={22}/><strong>Select a candidate</strong><p>Pattern DNA evidence and consequences will appear here.</p></div>}</aside>
    </div> : null}
    {tab==='compose' ? <VisualCompositionStudio initialPatternIds={selectedId ? [selectedId] : recommendedIds.slice(0,2)}/> : null}
    {tab==='catalogue' ? <section className="catalogue-panel panel-card"><header><div><span className="eyebrow">Governed design catalogue</span><h2>Search approved styles, patterns, components and templates</h2></div><label className="compact-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search design-capable Pattern DNA"/></label></header><div className="catalogue-grid">{catalogue.map(r=><button key={r.id} onClick={()=>{setSelectedId(r.id);setTab('candidates')}}><span>{typeLabel[r.recordType]}</span><strong>{r.name}</strong><small>{r.category} · {r.applicableStages.join(', ')}</small><p>{r.summary}</p></button>)}</div></section> : null}
  </section>;
}
