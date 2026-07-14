import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileText,
  GitBranch,
  Layers3,
  Network,
  Route,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import templatesJson from '../../data/scenario-templates.json';
import type { ScenarioTemplate } from '@aiw/engine';
import {
  createArchitecturePackManifest,
  evaluateGuidedArchitectureJourney,
  extractArchitectureDriversFromBrief,
} from '@aiw/intelligence';
import { useWorkspaceStore } from '../../store/workspaceStore';
import './guided-journey.css';

const templates = (templatesJson as { templates: ScenarioTemplate[] }).templates;

type JourneyTab = 'start' | 'brief' | 'model' | 'decisions' | 'pack';

function saveJson(name: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function statusLabel(state: string): string {
  if (state === 'done') return 'Done';
  if (state === 'ready') return 'Ready';
  return 'Needs input';
}

export function GuidedJourneyWorkspace() {
  const project = useWorkspaceStore((state) => state.project);
  const library = useWorkspaceStore((state) => state.library);
  const contextual = useWorkspaceStore((state) => state.contextual);
  const applyScenarioTemplate = useWorkspaceStore((state) => state.applyScenarioTemplate);
  const setProjectText = useWorkspaceStore((state) => state.setProjectText);
  const setListField = useWorkspaceStore((state) => state.setListField);
  const setQualityWeight = useWorkspaceStore((state) => state.setQualityWeight);
  const addQualityScenario = useWorkspaceStore((state) => state.addQualityScenario);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage);
  const previewIntelligentLayout = useWorkspaceStore((state) => state.previewIntelligentLayout);
  const acceptStyleRecommendation = useWorkspaceStore((state) => state.acceptStyleRecommendation);
  const setPatternStatus = useWorkspaceStore((state) => state.setPatternStatus);
  const generateConformancePlan = useWorkspaceStore((state) => state.generateConformancePlan);
  const createSnapshot = useWorkspaceStore((state) => state.createSnapshot);

  const [tab, setTab] = useState<JourneyTab>('start');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [brief, setBrief] = useState(project.description);
  const [extractedAt, setExtractedAt] = useState<string | null>(null);
  const [exportedAt, setExportedAt] = useState<string | null>(null);
  const selectedTemplate = templates.find((template) => template.id === templateId) ?? templates[0];
  const assessment = useMemo(() => evaluateGuidedArchitectureJourney(project), [project]);
  const extracted = useMemo(() => extractArchitectureDriversFromBrief(brief, library), [brief, library]);

  const applyExtractedDrivers = () => {
    const text = brief.trim();
    if (text.length > 0) setProjectText('description', text);
    setListField('objectives', extracted.objectives.join('\n'));
    setListField('constraints', extracted.constraints.join('\n'));
    setListField('assumptions', extracted.assumptions.join('\n'));
    for (const [attributeId, weight] of Object.entries(extracted.drivers)) setQualityWeight(attributeId, weight);
    for (const scenario of extracted.measurableScenarios) addQualityScenario({ ...scenario, source: 'guided-journey', environment: 'production', artifact: 'architecture brief', weight: extracted.drivers[scenario.attributeId] ?? 3 });
    setExtractedAt(new Date().toISOString());
    setTab('model');
  };

  const applyTemplateAndGenerateModel = () => {
    if (selectedTemplate) applyScenarioTemplate(selectedTemplate);
    setWorkspaceMode('design');
    setActiveStage('logicalApplication');
    window.setTimeout(() => previewIntelligentLayout('clean', true), 80);
    setTab('decisions');
  };

  const createDecisionPack = () => {
    const leadingStyle = contextual.styles[0]?.styleId;
    const leadingPattern = contextual.patterns[0]?.patternId;
    if (leadingStyle) acceptStyleRecommendation(leadingStyle);
    if (leadingPattern) setPatternStatus(leadingPattern, 'accepted');
    createSnapshot('Guided journey decision checkpoint', 'reviewed');
    setTab('pack');
  };

  const generateControls = () => {
    generateConformancePlan();
    setWorkspaceMode('conformance');
  };

  const exportPack = () => {
    const manifest = createArchitecturePackManifest(project);
    const payload = { manifest, project, assessment, exportedBy: 'guided-journey-workspace' };
    saveJson(`${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'aiw'}-architecture-pack.json`, payload);
    setExportedAt(manifest.generatedAt);
    createSnapshot('Architecture pack exported', 'reviewed');
  };

  return (
    <section className="guided-journey enterprise-workspace">
      <header className="workspace-hero guided-journey__hero">
        <div>
          <span className="eyebrow"><Route size={14} /> Guided journey</span>
          <h2>First 10-minute architecture journey</h2>
          <p>Move from a pasted brief to drivers, a starter model, pattern-backed decisions, conformance controls and an exportable architecture pack. This replaces the old scattered template/checklist widgets with one governed workflow.</p>
        </div>
        <div className="guided-journey__score">
          <span>Journey completion</span>
          <strong>{assessment.completion}%</strong>
          <small>{assessment.nextStep ? `Next: ${assessment.nextStep.label}` : 'Ready for review pack'}</small>
        </div>
      </header>

      <div className="guided-journey__steps" aria-label="Guided journey progress">
        {assessment.steps.map((step) => (
          <button key={step.id} type="button" className={`guided-step is-${step.state}`} onClick={() => setTab(step.id === 'brief' || step.id === 'drivers' ? 'brief' : step.id === 'model' ? 'model' : step.id === 'patterns' || step.id === 'alternatives' || step.id === 'adrs' ? 'decisions' : 'pack')}>
            <span>{step.state === 'done' ? <CheckCircle2 size={16} /> : <span className="guided-step__dot" />}</span>
            <strong>{step.label}</strong>
            <small>{statusLabel(step.state)} · {step.completion}%</small>
          </button>
        ))}
      </div>

      <nav className="guided-journey__tabs" aria-label="Guided journey sections">
        {([
          ['start', 'Scenario'], ['brief', 'Brief & drivers'], ['model', 'Model'], ['decisions', 'Patterns & ADRs'], ['pack', 'Controls & export'],
        ] as Array<[JourneyTab, string]>).map(([id, label]) => <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </nav>

      {tab === 'start' ? (
        <div className="guided-journey__grid">
          <article className="guided-panel guided-panel--wide">
            <header><div><span className="eyebrow">Scenario templates</span><h3>Choose a serious starting point</h3></div><Sparkles size={20} /></header>
            <p>Templates are advisory seed material. They add editable context, drivers, scenarios and model seeds; they do not become production knowledge unless governed through Knowledge Ops.</p>
            <div className="template-matrix">
              {templates.map((template) => (
                <button key={template.id} type="button" className={template.id === templateId ? 'selected' : ''} onClick={() => { setTemplateId(template.id); setBrief(template.brief); }}>
                  <strong>{template.name}</strong>
                  <small>{template.sector}</small>
                  <span>{template.scenarios.length} scenario(s) · {template.seedNodes.length} seed objects</span>
                </button>
              ))}
            </div>
          </article>
          <aside className="guided-panel">
            <header><div><span className="eyebrow">Selected scenario</span><h3>{selectedTemplate?.name ?? 'No scenario'}</h3></div><ClipboardList size={20} /></header>
            <p>{selectedTemplate?.brief}</p>
            <h4>Suggested patterns</h4>
            <div className="tag-row">{selectedTemplate?.suggestedPatterns.map((item) => <span key={item}>{item}</span>)}</div>
            <button className="button button--primary" type="button" onClick={() => { if (selectedTemplate) { setBrief(selectedTemplate.brief); setTab('brief'); } }}><ArrowRight size={14} /> Use this scenario</button>
          </aside>
        </div>
      ) : null}

      {tab === 'brief' ? (
        <div className="guided-journey__grid">
          <article className="guided-panel guided-panel--wide">
            <header><div><span className="eyebrow">Brief intake</span><h3>Paste or refine the problem statement</h3></div><FileText size={20} /></header>
            <textarea value={brief} onChange={(event) => setBrief(event.target.value)} rows={12} placeholder="Paste the architecture problem statement, goals, constraints, integrations and quality expectations…" />
            <div className="guided-actions">
              <button className="button button--primary" type="button" onClick={applyExtractedDrivers}><BrainCircuit size={14} /> Extract drivers and scenarios</button>
              <button className="button button--secondary" type="button" onClick={() => setWorkspaceMode('quality')}><ClipboardCheck size={14} /> Open quality workspace</button>
            </div>
          </article>
          <aside className="guided-panel">
            <header><div><span className="eyebrow">Deterministic extraction preview</span><h3>What AIW will add</h3></div><BadgeCheck size={20} /></header>
            <h4>Drivers</h4>
            <div className="driver-list">{Object.entries(extracted.drivers).map(([id, weight]) => <span key={id}>{id}: {weight}</span>)}</div>
            <h4>Objectives</h4>
            <ul>{extracted.objectives.map((item) => <li key={item}>{item}</li>)}</ul>
            <h4>Template hints</h4>
            <div className="tag-row">{extracted.recommendedTemplateHints.length ? extracted.recommendedTemplateHints.map((item) => <span key={item}>{item}</span>) : <span>General architecture</span>}</div>
            {extractedAt ? <p className="guided-notice">Extracted at {new Date(extractedAt).toLocaleString()}.</p> : null}
          </aside>
        </div>
      ) : null}

      {tab === 'model' ? (
        <div className="guided-journey__grid">
          <article className="guided-panel guided-panel--wide">
            <header><div><span className="eyebrow">Model generation</span><h3>Generate the first visual architecture model</h3></div><Network size={20} /></header>
            <p>AIW creates editable logical components from the selected scenario and opens the design canvas with an intelligent layout preview. The preview is non-destructive until applied.</p>
            <div className="guided-actions">
              <button className="button button--primary" type="button" onClick={applyTemplateAndGenerateModel}><WandSparkles size={14} /> Generate first model</button>
              <button className="button button--secondary" type="button" onClick={() => { setWorkspaceMode('design'); setActiveStage('logicalApplication'); }}><Layers3 size={14} /> Open canvas</button>
            </div>
          </article>
          <aside className="guided-panel">
            <header><div><span className="eyebrow">Model status</span><h3>{project.nodes.length} objects · {project.edges.length} relationships</h3></div><Layers3 size={20} /></header>
            <ul>{project.nodes.slice(0, 8).map((node) => <li key={node.id}>{node.label} <small>{node.kind}</small></li>)}</ul>
          </aside>
        </div>
      ) : null}

      {tab === 'decisions' ? (
        <div className="guided-journey__grid">
          <article className="guided-panel guided-panel--wide">
            <header><div><span className="eyebrow">Patterns, alternatives and ADRs</span><h3>Create governed decision evidence</h3></div><BookOpenCheck size={20} /></header>
            <p>AIW uses deterministic recommendations from the active model. The LLM may enrich narratives later, but it does not own scores, policy, release approval or architecture mutation.</p>
            <div className="recommendation-grid">
              <section><h4>Leading styles</h4>{contextual.styles.slice(0, 3).map((item) => <div key={item.styleId}><strong>{item.styleName}</strong><small>{Math.round(item.score)} score</small></div>)}</section>
              <section><h4>Leading patterns</h4>{contextual.patterns.slice(0, 3).map((item) => <div key={item.patternId}><strong>{item.patternName}</strong><small>{Math.round(item.score)} score</small></div>)}</section>
            </div>
            <div className="guided-actions">
              <button className="button button--primary" type="button" onClick={createDecisionPack}><ShieldCheck size={14} /> Create ADR checkpoint</button>
              <button className="button button--secondary" type="button" onClick={() => setWorkspaceMode('synthesis')}><GitBranch size={14} /> Generate alternatives</button>
              <button className="button button--secondary" type="button" onClick={() => setWorkspaceMode('patterns')}><Sparkles size={14} /> Open Pattern Intelligence</button>
            </div>
          </article>
          <aside className="guided-panel">
            <header><div><span className="eyebrow">Decision record status</span><h3>{project.decisions.length} ADR(s)</h3></div><ClipboardCheck size={20} /></header>
            <ul>{project.decisions.slice(0, 5).map((decision) => <li key={decision.id}>{decision.title}<small>{decision.status}</small></li>)}</ul>
          </aside>
        </div>
      ) : null}

      {tab === 'pack' ? (
        <div className="guided-journey__grid">
          <article className="guided-panel guided-panel--wide">
            <header><div><span className="eyebrow">Conformance and export</span><h3>Prepare the architecture pack</h3></div><Download size={20} /></header>
            <p>The pack includes the project brief, drivers, architecture model summary, decisions, controls and open findings. It is a review artifact, not a silent production release.</p>
            <div className="guided-actions">
              <button className="button button--primary" type="button" onClick={generateControls}><ClipboardCheck size={14} /> Generate conformance controls</button>
              <button className="button button--secondary" type="button" onClick={exportPack}><Download size={14} /> Export architecture pack</button>
              <button className="button button--secondary" type="button" onClick={() => setWorkspaceMode('governance')}><ShieldCheck size={14} /> Open governance</button>
            </div>
            {exportedAt ? <p className="guided-notice">Architecture pack exported at {new Date(exportedAt).toLocaleString()}.</p> : null}
          </article>
          <aside className="guided-panel">
            <header><div><span className="eyebrow">Pack manifest preview</span><h3>{project.name}</h3></div><BadgeCheck size={20} /></header>
            <dl className="pack-preview">
              <div><dt>Nodes</dt><dd>{project.nodes.length}</dd></div>
              <div><dt>Edges</dt><dd>{project.edges.length}</dd></div>
              <div><dt>Drivers</dt><dd>{project.qualityPriorities.length}</dd></div>
              <div><dt>Scenarios</dt><dd>{project.qualityScenarios.length}</dd></div>
              <div><dt>ADRs</dt><dd>{project.decisions.length}</dd></div>
              <div><dt>Policy gates</dt><dd>{project.policyGates.length}</dd></div>
            </dl>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
