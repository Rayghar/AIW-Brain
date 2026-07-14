import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Boxes,
  Check,
  CheckCircle2,
  CircleSlash2,
  Eye,
  GitCompareArrows,
  Layers3,
  Link2,
  Network,
  PanelRightOpen,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Waypoints,
  X,
} from 'lucide-react';
import {
  architectureStages,
  sprint78PatternCorpus,
  type ArchitectureNode,
  type ArchitectureStage,
  type PatternKnowledgeRecord,
} from '@aiw/domain';
import { composePatterns } from '@aiw/engine';
import { useWorkspaceStore } from '../store/workspaceStore';

const stageNames: Record<ArchitectureStage, string> = {
  designIntent: 'Requirements & intent',
  logicalApplication: 'Logical application',
  applicationRealization: 'Application realisation',
  logicalTechnology: 'Logical technology',
  physicalTechnology: 'Physical technology',
  validationRealization: 'Review & assurance',
};

type RecordTypeFilter = 'all' | PatternKnowledgeRecord['recordType'];

type PreviewNode = ArchitectureNode & { previewX: number; previewY: number };

function compactText(value: string, limit = 112) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function TopologyPreview({ nodes, edges }: { nodes: ArchitectureNode[]; edges: Array<{ id: string; sourceId: string; targetId: string; label?: string | undefined }> }) {
  const plotted = useMemo<PreviewNode[]>(() => {
    if (!nodes.length) return [];
    const source = nodes.map((node, index) => {
      const position = Object.values(node.positions)[0] ?? { x: 100 + (index % 4) * 220, y: 90 + Math.floor(index / 4) * 150 };
      return { ...node, previewX: position.x, previewY: position.y };
    });
    const minX = Math.min(...source.map((node) => node.previewX));
    const minY = Math.min(...source.map((node) => node.previewY));
    return source.map((node) => ({ ...node, previewX: node.previewX - minX + 72, previewY: node.previewY - minY + 68 }));
  }, [nodes]);
  const byId = useMemo(() => new Map(plotted.map((node) => [node.id, node])), [plotted]);
  const width = Math.max(760, ...plotted.map((node) => node.previewX + 190));
  const height = Math.max(360, ...plotted.map((node) => node.previewY + 100));

  if (!plotted.length) {
    return <div className="rc56-empty-preview"><Waypoints size={22}/><strong>No topology objects in this composition</strong><span>The selected Pattern DNA can still create decisions, interfaces, obligations or fitness tests.</span></div>;
  }

  return (
    <div className="rc56-topology-viewport" aria-label="Pattern topology preview">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Generated topology preview">
        <defs>
          <marker id="rc56-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto"><path d="M0,0 L0,7 L7,3.5 z" /></marker>
          <pattern id="rc56-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" /></pattern>
        </defs>
        <rect width="100%" height="100%" className="rc56-grid" fill="url(#rc56-grid)" />
        {edges.map((edge) => {
          const source = byId.get(edge.sourceId);
          const target = byId.get(edge.targetId);
          if (!source || !target) return null;
          const x1 = source.previewX + 82;
          const y1 = source.previewY + 31;
          const x2 = target.previewX + 82;
          const y2 = target.previewY + 31;
          const mid = (x1 + x2) / 2;
          return <g key={edge.id}><path className="rc56-edge" d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`} markerEnd="url(#rc56-arrow)" />{edge.label ? <text x={mid} y={(y1 + y2) / 2 - 7} className="rc56-edge-label">{compactText(edge.label, 30)}</text> : null}</g>;
        })}
        {plotted.map((node) => {
          const boundary = node.tags.includes('trust-boundary');
          return <g key={node.id} transform={`translate(${node.previewX},${node.previewY})`} className={boundary ? 'rc56-node rc56-node--boundary' : 'rc56-node'}>
            <rect width="164" height="62" rx={boundary ? 18 : 12} />
            <text x="12" y="23" className="rc56-node-kind">{node.kind}</text>
            <text x="12" y="44" className="rc56-node-label">{compactText(node.label, 25)}</text>
          </g>;
        })}
      </svg>
    </div>
  );
}

function PatternCompare({ records }: { records: PatternKnowledgeRecord[] }) {
  if (records.length < 2) return <div className="rc56-compare-empty"><GitCompareArrows size={18}/><span>Select at least two patterns to compare their forces, impacts and obligations.</span></div>;
  return <div className="rc56-compare-grid">{records.slice(0, 3).map((record) => <article key={record.id}>
    <header><span>{record.category}</span><strong>{record.name}</strong></header>
    <p>{record.summary}</p>
    <dl>
      <div><dt>Use when</dt><dd>{record.applicabilityRules.slice(0, 2).join(' ')}</dd></div>
      <div><dt>Question when</dt><dd>{record.exclusions.slice(0, 2).join(' ')}</dd></div>
      <div><dt>Quality</dt><dd>{record.qualityImpacts.slice(0, 4).map((item) => `${item.attributeId} ${item.direction}`).join(' · ')}</dd></div>
      <div><dt>Obligations</dt><dd>{record.obligations.length}</dd></div>
      <div><dt>Interfaces</dt><dd>{record.interfaceKit?.length ?? 0}</dd></div>
      <div><dt>Evidence</dt><dd>{record.evidence.length} source(s)</dd></div>
    </dl>
  </article>)}</div>;
}

export function VisualCompositionStudio({ initialPatternIds = [] }: { initialPatternIds?: string[] }) {
  const project = useWorkspaceStore((state) => state.project);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const applyPlan = useWorkspaceStore((state) => state.applyPatternCompositionPlan);
  const rollbackPlan = useWorkspaceStore((state) => state.rollbackPatternCompositionPlan);
  const compositionHistory = useWorkspaceStore((state) => state.compositionHistory);
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [recordType, setRecordType] = useState<RecordTypeFilter>('all');
  const [stageAlignedOnly, setStageAlignedOnly] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => initialPatternIds.slice(0, 4));
  const [scopeNodeId, setScopeNodeId] = useState<string>(selectedNodeId ?? '');
  const [detailId, setDetailId] = useState(initialPatternIds[0] ?? '');
  const [showEvidence, setShowEvidence] = useState(false);
  const [mode, setMode] = useState<'preview' | 'compare'>('preview');

  const categories = useMemo(() => ['all', ...new Set(sprint78PatternCorpus.map((record) => record.category))].sort(), []);
  const eligibleCorpus = useMemo(() => sprint78PatternCorpus.filter((record) => record.lifecycle === 'approved' && record.recordType !== 'anti-pattern' && ['style','pattern','topology-template','component-archetype','reference-architecture'].includes(record.recordType) && Boolean(record.topology?.nodes.length || record.componentKit?.length || record.interfaceKit?.length || record.obligations.length || record.generationContract)), []);
  useEffect(() => {
    const valid = initialPatternIds.filter((id) => eligibleCorpus.some((record) => record.id === id)).slice(0, 4);
    if (!valid.length) return;
    setSelectedIds(valid);
    setDetailId(valid[0]!);
  }, [initialPatternIds.join('|'), eligibleCorpus]);

  useEffect(() => {
    if (selectedIds.length) return;
    const stageKit = eligibleCorpus.filter((record) => record.applicableStages.includes(project.activeStage) && Boolean(record.topology?.nodes.length || record.componentKit?.length)).slice(0, 2);
    if (stageKit.length) {
      setSelectedIds(stageKit.map((record) => record.id));
      setDetailId(stageKit[0]!.id);
    }
  }, [eligibleCorpus, project.activeStage, selectedIds.length]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return eligibleCorpus.filter((record) => {
      if (category !== 'all' && record.category !== category) return false;
      if (recordType !== 'all' && record.recordType !== recordType) return false;
      if (stageAlignedOnly && !record.applicableStages.includes(project.activeStage)) return false;
      if (!term) return true;
      return [record.id, record.name, ...record.aliases, record.summary, record.problem, ...record.tags, ...record.componentKit?.map((item) => item.name) ?? [], ...record.interfaceKit?.map((item) => item.name) ?? []].join(' ').toLowerCase().includes(term);
    }).slice(0, 120);
  }, [category, eligibleCorpus, project.activeStage, query, recordType, stageAlignedOnly]);
  const selected = selectedIds.map((id) => sprint78PatternCorpus.find((record) => record.id === id)).filter((record): record is PatternKnowledgeRecord => Boolean(record));
  const detail = eligibleCorpus.find((record) => record.id === detailId) ?? selected[0] ?? eligibleCorpus.find((record) => record.applicableStages.includes(project.activeStage)) ?? eligibleCorpus[0]!;
  const plan = useMemo(() => composePatterns({ project, patternIds: selectedIds, stage: project.activeStage, allowConditionalPrerequisites: true, ...(scopeNodeId ? { scopeNodeId } : {}) }), [project, scopeNodeId, selectedIds]);
  const projectedNodes = project.nodes.length + plan.mutation.addNodes.length;
  const projectedEdges = project.edges.length + plan.mutation.addEdges.length;
  const projectedInterfaces = (project.interfaces?.length ?? 0) + plan.mutation.addInterfaces.length;

  function togglePattern(id: string) {
    setDetailId(id);
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(-4));
  }

  function changeDesignStage(stage: ArchitectureStage) {
    setActiveStage(stage);
    setWorkspaceMode('patterns');
    setScopeNodeId('');
    const retained = selected.filter((record) => record.applicableStages.includes(stage) && (record.topology?.nodes.length ?? 0) > 0);
    if (retained.length) {
      setSelectedIds(retained.map((record) => record.id).slice(0, 4));
      setDetailId(retained[0]!.id);
      return;
    }
    const stageKit = eligibleCorpus
      .filter((record) => record.applicableStages.includes(stage) && (record.topology?.nodes.length ?? 0) > 0 && (record.interfaceKit?.length ?? 0) > 0)
      .slice(0, 2);
    if (stageKit.length) {
      setSelectedIds(stageKit.map((record) => record.id));
      setDetailId(stageKit[0]!.id);
    }
  }

  return <section className="rc56-composition-studio">
    <header className="rc56-studio-header">
      <div>
        <span className="eyebrow">Visual Architecture Composition Studio</span>
        <h2>Search → compare → inspect → preview topology → apply to scope</h2>
        <p>Compose approved Pattern DNA into canonical objects, relationships, interface contracts, trust boundaries and obligations. AIW previews the exact change before explicit acceptance.</p>
      </div>
      <div className="rc56-header-actions">
        <button type="button" className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}><Eye size={15}/> Preview</button>
        <button type="button" className={mode === 'compare' ? 'active' : ''} onClick={() => setMode('compare')}><GitCompareArrows size={15}/> Compare</button>
        <button type="button" onClick={() => setShowEvidence(true)}><PanelRightOpen size={15}/> Evidence</button>
      </div>
    </header>

    <nav className="rc56-workflow" aria-label="Governed composition workflow">
      {['Search', 'Compare', 'Inspect', 'Preview topology', 'Apply to scope', 'Review changes', 'Accept', 'Validate obligations'].map((step, index) => (
        <span key={step} className={index <= (compositionHistory.length ? 7 : plan.eligible ? 5 : selected.length ? 3 : 0) ? 'active' : ''}>
          <b>{index + 1}</b>{step}
        </span>
      ))}
    </nav>

    <div className="rc56-stage-strip">
      <label>Design stage<select value={project.activeStage} onChange={(event) => changeDesignStage(event.target.value as ArchitectureStage)}>{architectureStages.map((stage) => <option key={stage} value={stage}>{stageNames[stage]}</option>)}</select></label>
      <label>Apply to scope<select value={scopeNodeId} onChange={(event) => setScopeNodeId(event.target.value)}><option value="">Whole stage</option>{project.nodes.filter((node) => node.stage === project.activeStage).map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}</select></label>
      <div><span>Selected</span><strong>{selected.length}/4 patterns</strong></div>
      <button type="button" onClick={() => { setWorkspaceMode('design'); setActiveStage(project.activeStage); }}><Layers3 size={15}/> Open canvas</button>
    </div>

    <div className="rc56-workbench">
      <aside className="rc56-catalogue">
        <div className="rc56-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search styles, patterns, components, interfaces and aliases"/></div>
        <div className="rc56-facets">
          <select value={recordType} onChange={(event) => setRecordType(event.target.value as RecordTypeFilter)}><option value="all">All record types</option><option value="style">Styles</option><option value="pattern">Patterns</option><option value="topology-template">Templates</option><option value="component-archetype">Components</option><option value="reference-architecture">References</option></select>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item === 'all' ? 'All categories' : item}</option>)}</select>
          <label className="rc56-check"><input type="checkbox" checked={stageAlignedOnly} onChange={(event) => setStageAlignedOnly(event.target.checked)}/><span>Current-stage kit</span></label>
        </div>
        <div className="rc56-record-list">
          {filtered.map((record) => {
            const active = selectedIds.includes(record.id);
            return <button type="button" key={record.id} className={active ? 'selected' : ''} onClick={() => togglePattern(record.id)}>
              <span className="rc56-record-check">{active ? <Check size={12}/> : null}</span>
              <span><strong>{record.name}</strong><small>{record.recordType} · {record.category} · {record.review.releaseId}</small><em>{compactText(record.summary)}</em></span>
              <b>{record.topology?.nodes.length ?? 0}</b>
            </button>;
          })}
          {!filtered.length ? <div className="rc56-no-results"><CircleSlash2 size={18}/><span>No approved records match these filters.</span></div> : null}
        </div>
      </aside>

      <main className="rc56-preview-panel">
        <div className="rc56-plan-status">
          <div><span className="eyebrow">Governed composition plan</span><strong>{plan.id}</strong><small>{plan.applicationKey}</small></div>
          <span className={plan.eligible ? 'rc56-pill rc56-pill--ok' : 'rc56-pill rc56-pill--blocked'}>{plan.eligible ? 'Eligible to apply' : 'Blocked'}</span>
        </div>
        {mode === 'compare' ? <PatternCompare records={selected}/> : <TopologyPreview nodes={plan.mutation.addNodes} edges={plan.mutation.addEdges}/>} 
        <div className="rc56-before-after">
          <article><span>Current model</span><strong>{project.nodes.length}</strong><small>objects</small><b>{project.edges.length} relationships · {project.interfaces?.length ?? 0} interfaces</b></article>
          <ArrowRight size={20}/>
          <article><span>After acceptance</span><strong>{projectedNodes}</strong><small>objects</small><b>{projectedEdges} relationships · {projectedInterfaces} interfaces</b></article>
        </div>
        <div className="rc56-generation-grid">
          <article><Boxes size={16}/><strong>{plan.mutation.addNodes.length}</strong><span>Objects</span></article>
          <article><Network size={16}/><strong>{plan.mutation.addEdges.length}</strong><span>Relationships</span></article>
          <article><Link2 size={16}/><strong>{plan.mutation.addInterfaces.length}</strong><span>Interfaces</span></article>
          <article><ShieldCheck size={16}/><strong>{plan.mutation.addNodes.filter((node) => node.tags.includes('trust-boundary')).length}</strong><span>Trust boundaries</span></article>
          <article><Sparkles size={16}/><strong>{plan.obligations.length}</strong><span>Obligations</span></article>
          <article><Layers3 size={16}/><strong>{plan.mutation.addArchitectureViews.length}</strong><span>Named views</span></article>
        </div>
        <div className="rc56-apply-bar">
          <div><strong>{plan.summary}</strong><small>{plan.duplicateSkips.length ? `${plan.duplicateSkips.length} duplicate item(s) will be safely skipped.` : 'No duplicate model content detected.'}</small></div>
          <button type="button" className="button button--primary" disabled={!plan.eligible || !selected.length} onClick={() => applyPlan(plan)}><CheckCircle2 size={16}/> Accept and apply</button>
        </div>
      </main>

      <aside className="rc56-inspector">
        <header><span className="eyebrow">Pattern DNA inspector</span><h3>{detail.name}</h3><small>{detail.id} · {detail.lifecycle} · {detail.review.releaseId}</small></header>
        <p>{detail.problem}</p>
        <section><h4>Applicability</h4>{detail.applicabilityRules.slice(0, 3).map((item) => <span key={item}><Check size={12}/>{item}</span>)}</section>
        <section><h4>Exclusions</h4>{detail.exclusions.slice(0, 3).map((item) => <span key={item}><X size={12}/>{item}</span>)}</section>
        <section><h4>Component kit</h4>{detail.componentKit?.slice(0, 5).map((item) => <span key={item.key}><Boxes size={12}/>{item.name}<small>{item.required ? 'required' : 'optional'}</small></span>)}</section>
        <section><h4>Interface kit</h4>{detail.interfaceKit?.slice(0, 5).map((item) => <span key={item.key}><Link2 size={12}/>{item.name}<small>{item.protocol}</small></span>)}</section>
        <section className="rc56-checks"><h4>Canonical validation</h4>{plan.canonicalChecks.map((check) => <div key={check.id} className={check.passed ? 'passed' : 'failed'}>{check.passed ? <CheckCircle2 size={14}/> : <CircleSlash2 size={14}/>}<span><strong>{check.label}</strong><small>{check.detail}</small></span></div>)}</section>
        {plan.warnings.length ? <section><h4>Warnings</h4>{plan.warnings.map((item) => <span key={item}><CircleSlash2 size={12}/>{item}</span>)}</section> : null}
        {compositionHistory.length ? <button type="button" className="rc56-rollback" onClick={() => rollbackPlan(compositionHistory[0]?.id)}><RotateCcw size={14}/> Roll back last composition</button> : null}
      </aside>
    </div>

    {showEvidence ? <div className="rc56-evidence-backdrop" role="dialog" aria-modal="true" aria-label="Pattern evidence and provenance"><aside className="rc56-evidence-drawer">
      <header><div><span className="eyebrow">Source and evidence</span><h3>{detail.name}</h3></div><button type="button" onClick={() => setShowEvidence(false)}><X size={17}/></button></header>
      <section><h4>Authority</h4><dl><div><dt>Lifecycle</dt><dd>{detail.lifecycle}</dd></div><div><dt>Knowledge release</dt><dd>{detail.review.releaseId}</dd></div><div><dt>Reviewed by</dt><dd>{detail.review.reviewedBy}</dd></div><div><dt>Review method</dt><dd>{detail.review.reviewMethod}</dd></div></dl></section>
      <section><h4>Evidence references</h4>{detail.evidence.map((item) => <article key={`${item.connectorId}-${item.evidenceRole}`}><strong>{item.connectorId}</strong><span>{item.evidenceRole} · trust tier {item.sourceTrustTier}</span><small>{item.claimIds.join(', ')}</small></article>)}</section>
      <section><h4>Counterfactual explanation</h4><p>{detail.counterfactualExplanation}</p></section>
      <section><h4>Fitness tests</h4>{detail.fitnessTests?.slice(0, 8).map((item) => <span key={item}>{item}</span>)}</section>
    </aside></div> : null}
  </section>;
}
