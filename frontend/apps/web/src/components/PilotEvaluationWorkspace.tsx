import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  FlaskConical,
  Gauge,
  GitCompareArrows,
  Layers3,
  Navigation,
  PlayCircle,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Workflow,
  XCircle,
} from 'lucide-react';
import { samplePortfolioProjects, type ArchitectureEvaluationMode, type ArchitectureOutcomeDimensionScore } from '@aiw/domain';
import { runArchitectureOutcomeBenchmark } from '@aiw/engine';
import { useWorkspaceStore } from '../store/workspaceStore';

type LabTab = 'overview' | 'compare' | 'lifecycle' | 'expert-review' | 'navigation' | 'pilot-readiness';

const tabLabels: Array<{ id: LabTab; label: string; icon: typeof Gauge }> = [
  { id: 'overview', label: 'Outcome overview', icon: Gauge },
  { id: 'compare', label: 'Mode comparison', icon: GitCompareArrows },
  { id: 'lifecycle', label: 'Lifecycle evidence', icon: Workflow },
  { id: 'expert-review', label: 'Expert review pack', icon: Users },
  { id: 'navigation', label: 'Navigation & UX', icon: Navigation },
  { id: 'pilot-readiness', label: 'Pilot readiness', icon: ShieldCheck },
];

const modeOrder: ArchitectureEvaluationMode[] = ['conventional-baseline', 'deterministic-aiw', 'governed-llm-aiw'];

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function scoreTone(score: number, threshold = 80) {
  if (score >= threshold) return 'good';
  if (score >= threshold - 12) return 'warn';
  return 'bad';
}

function DimensionRow({ item }: { item: ArchitectureOutcomeDimensionScore }) {
  return <div className={`aoe-dimension-row is-${item.status}`}>
    <div>
      <strong>{item.label}{item.critical ? <span className="aoe-critical">Critical</span> : null}</strong>
      <small>{item.rationale}</small>
    </div>
    <div className="aoe-score-bar" aria-label={`${item.label}: ${item.score} of 100`}>
      <i style={{ width: `${item.score}%` }}/>
    </div>
    <b>{item.score}</b>
  </div>;
}

export function PilotEvaluationWorkspace() {
  const project = useWorkspaceStore((state) => state.project);
  const knowledgeReleaseId = useWorkspaceStore((state) => state.library.knowledgeReleaseId ?? 'AKR-0.10.60');
  const [tab, setTab] = useState<LabTab>('overview');
  const [runSequence, setRunSequence] = useState(1);
  const projects = useMemo(() => {
    const portfolio = samplePortfolioProjects.map((candidate) => candidate.id === project.id ? project : candidate);
    return portfolio.some((candidate) => candidate.id === project.id) ? portfolio : [project, ...portfolio];
  }, [project]);
  const report = useMemo(() => runArchitectureOutcomeBenchmark({
    projects,
    knowledgeReleaseId,
    grammarVersion: 'living-canvas-grammar-0.10.67',
    patternDnaVersion: 'pattern-dna-2.0-executable-core',
    providerPolicyVersion: 'governed-co-creation-0.10.68',
  }), [projects, knowledgeReleaseId, runSequence]);
  const [selectedScenarioId, setSelectedScenarioId] = useState(report.scenarios[0]?.scenarioId ?? '');
  const selected = report.scenarios.find((scenario) => scenario.scenarioId === selectedScenarioId) ?? report.scenarios[0];
  const [selectedMode, setSelectedMode] = useState<ArchitectureEvaluationMode>('governed-llm-aiw');
  const selectedModeResult = selected?.modeResults.find((mode) => mode.mode === selectedMode) ?? selected?.modeResults[0];

  const runAgain = () => setRunSequence((value) => value + 1);
  const exportReport = () => downloadJson(`AIW_${report.applicationVersion}_architecture-outcome-report.json`, report);
  const exportExpertPack = () => downloadJson(`AIW_${report.applicationVersion}_blinded-expert-review-pack.json`, report.expertReviewPack);

  return <section className="studio-page architecture-outcome-lab" data-testid="architecture-outcome-lab">
    <header className="aoe-hero">
      <div>
        <span className="eyebrow">Pinned reference calibration</span>
        <h2>Seven scenarios. Three modes. One independent review protocol.</h2>
        <p>Compare conventional reference, deterministic AIW and governed-LLM outcomes without confusing system-generated scores with completed expert validation.</p>
      </div>
      <div className="aoe-hero-actions">
        <button type="button" className="secondary-button" onClick={exportExpertPack}><Download size={15}/> Expert review pack</button>
        <button type="button" className="primary-button" onClick={runAgain}><RefreshCw size={15}/> Run benchmark</button>
      </div>
    </header>

    <section className="aoe-release-pin" aria-label="Pinned evaluation baseline">
      <div><span>Application</span><strong>{report.applicationVersion}</strong></div>
      <div><span>Knowledge</span><strong>{report.knowledgeReleaseId}</strong></div>
      <div><span>Grammar</span><strong>{report.grammarVersion}</strong></div>
      <div><span>Pattern DNA</span><strong>{report.patternDnaVersion}</strong></div>
      <div><span>Provider policy</span><strong>{report.providerPolicyVersion}</strong></div>
    </section>

    <nav className="aoe-tabs" aria-label="Architecture outcome evaluation sections">
      {tabLabels.map((item) => {
        const Icon = item.icon;
        return <button key={item.id} type="button" className={tab === item.id ? 'active' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}><Icon size={14}/>{item.label}</button>;
      })}
    </nav>

    {tab === 'overview' ? <>
      <section className="aoe-metric-grid">
        <article><Target size={18}/><div><strong>{report.summary.scenarioCount}</strong><span>Benchmark scenarios</span></div></article>
        <article><BadgeCheck size={18}/><div><strong>{report.summary.readyForExpertReview}</strong><span>Ready for expert review</span></div></article>
        <article><BrainCircuit size={18}/><div><strong>{report.summary.deterministicAverage}</strong><span>Deterministic average</span></div></article>
        <article><Sparkles size={18}/><div><strong>{report.summary.governedLlmAverage}</strong><span>Governed-LLM average</span></div></article>
        <article><Clock3 size={18}/><div><strong>{report.summary.estimatedTimeReductionPercent}%</strong><span>Estimated time reduction</span></div></article>
        <article className={report.summary.criticalFailureCount ? 'is-warning' : 'is-good'}>{report.summary.criticalFailureCount ? <AlertTriangle size={18}/> : <CheckCircle2 size={18}/>}<div><strong>{report.summary.criticalFailureCount}</strong><span>Critical benchmark gaps</span></div></article>
      </section>

      <div className="aoe-two-column">
        <section className="aoe-panel aoe-scenario-list">
          <header><div><span className="eyebrow">Scenario set</span><h2>Seven controlled architecture challenges</h2></div><small>{report.generatedAt.slice(0, 19).replace('T', ' ')} UTC</small></header>
          <div className="aoe-list">
            {report.scenarios.map((scenario) => <button key={scenario.scenarioId} type="button" className={selected?.scenarioId === scenario.scenarioId ? 'active' : ''} onClick={() => setSelectedScenarioId(scenario.scenarioId)}>
              <span className={`aoe-readiness-dot is-${scenario.readiness}`}/>
              <div><strong>{scenario.name}</strong><small>{scenario.kind.replaceAll('-', ' ')} · {scenario.criticalFailures.length} critical gap{scenario.criticalFailures.length === 1 ? '' : 's'}</small></div>
              <ChevronRight size={14}/>
            </button>)}
          </div>
        </section>

        <section className="aoe-panel aoe-selected-summary">
          <header><div><span className="eyebrow">Selected scenario</span><h2>{selected?.name}</h2></div><span className={`status-pill status-pill--${selected?.readiness === 'ready-for-expert-review' ? 'ready' : selected?.readiness}`}>{selected?.readiness.replaceAll('-', ' ')}</span></header>
          <div className="aoe-mode-summary">
            {selected?.modeResults.map((mode) => <article key={mode.mode} className={`is-${scoreTone(mode.score)} ${mode.mode === selected.bestMode ? 'is-best' : ''}`}>
              <span>{mode.label}</span><strong>{mode.score}</strong><small>{mode.estimatedMinutes} min estimate · {mode.evidenceClass.replaceAll('-', ' ')}</small>
              {mode.mode === selected.bestMode ? <b>Best reference outcome</b> : null}
            </article>)}
          </div>
          <div className="aoe-honesty-boundary"><ShieldCheck size={16}/><p><strong>Honesty boundary</strong>{report.governance.boundary}</p></div>
          <button type="button" className="text-button" onClick={() => setTab('compare')}>Inspect the comparison <ChevronRight size={13}/></button>
        </section>
      </div>
    </> : null}

    {tab === 'compare' && selected && selectedModeResult ? <div className="aoe-two-column aoe-compare-layout">
      <section className="aoe-panel">
        <header><div><span className="eyebrow">Comparison mode</span><h2>{selected.name}</h2></div><button type="button" className="icon-button" onClick={exportReport} title="Export evaluation report" aria-label="Export evaluation report"><Download size={15}/></button></header>
        <div className="aoe-mode-selector" role="group" aria-label="Evaluation mode">
          {modeOrder.map((modeId) => {
            const mode = selected.modeResults.find((item) => item.mode === modeId)!;
            return <button key={modeId} type="button" className={selectedMode === modeId ? 'active' : ''} aria-pressed={selectedMode === modeId} onClick={() => setSelectedMode(modeId)}><span>{mode.label}</span><strong>{mode.score}</strong><small>{mode.estimatedMinutes} min</small></button>;
          })}
        </div>
        <div className="aoe-mode-kpis">
          <div><span>Overall</span><strong>{selectedModeResult.score}</strong></div>
          <div><span>Correctness</span><strong>{selectedModeResult.correctnessScore}</strong></div>
          <div><span>Governance</span><strong>{selectedModeResult.governanceScore}</strong></div>
          <div><span>Edit distance</span><strong>{selectedModeResult.editDistancePercent ?? '—'}{selectedModeResult.editDistancePercent ? '%' : ''}</strong></div>
        </div>
        <div className="aoe-dimension-list">{selectedModeResult.dimensionScores.map((item) => <DimensionRow key={item.dimension} item={item}/>)}</div>
      </section>
      <aside className="aoe-panel aoe-review-questions">
        <header><div><span className="eyebrow">Expert challenge</span><h2>What must be independently judged</h2></div></header>
        <ol>{selected.expertReviewQuestions.map((question) => <li key={question}>{question}</li>)}</ol>
        {selected.criticalFailures.length ? <div className="aoe-critical-box"><AlertTriangle size={16}/><div><strong>Critical failures</strong>{selected.criticalFailures.map((item) => <p key={item}>{item}</p>)}</div></div> : <div className="aoe-pass-box"><CheckCircle2 size={16}/><div><strong>No critical reference failure</strong><p>The scenario can enter blinded expert review. This is not an approval decision.</p></div></div>}
      </aside>
    </div> : null}

    {tab === 'lifecycle' && selected ? <section className="aoe-panel">
      <header><div><span className="eyebrow">Progressive model evidence</span><h2>{selected.name}: stage-by-stage concreteness</h2><p>Every downstream stage should become more concrete while preserving upstream lineage.</p></div></header>
      <div className="aoe-lifecycle-grid">
        {selected.lifecycleCoverage.map((stage, index) => <article key={stage.stage}>
          <span>{index + 1}</span><div><strong>{stage.stage.replace(/([A-Z])/g, ' $1')}</strong><small>{stage.objectCount} objects · {stage.relationshipCount} relationships</small></div><b>{stage.lineageCoverage}%<small>lineage</small></b>
        </article>)}
      </div>
      <div className="aoe-lifecycle-boundary"><Layers3 size={17}/><p>Zero-object or low-lineage stages remain visible as evaluation gaps. The lab does not inflate scores merely because a stage page exists.</p></div>
    </section> : null}

    {tab === 'expert-review' ? <div className="aoe-two-column">
      <section className="aoe-panel">
        <header><div><span className="eyebrow">Blinded panel pack</span><h2>Independent expert scoring rubric</h2></div><button type="button" className="secondary-button" onClick={exportExpertPack}><Download size={14}/> Export JSON</button></header>
        <div className="aoe-rubric-list">{report.expertReviewPack.rubric.map((item) => <article key={item.dimension}><div><strong>{item.label}{item.critical ? <span className="aoe-critical">Critical</span> : null}</strong><p>{item.question}</p></div><b>{item.weight}</b></article>)}</div>
      </section>
      <aside className="aoe-panel">
        <header><div><span className="eyebrow">Panel protocol</span><h2>Review without mode bias</h2></div></header>
        <div className="aoe-protocol-steps">
          <p><span>1</span>Anonymize all three variants for every scenario.</p>
          <p><span>2</span>Score architecture quality before revealing generation mode.</p>
          <p><span>3</span>Classify each major recommendation as correct, reasonable, incomplete, unnecessary, wrong or potentially harmful.</p>
          <p><span>4</span>Resolve material reviewer disagreement before release acceptance.</p>
        </div>
        <div className="aoe-honesty-boundary"><Users size={16}/><p><strong>Human review status</strong>{report.expertReviewPack.disclosure}</p></div>
      </aside>
    </div> : null}

    {tab === 'navigation' ? <section className="aoe-panel">
      <header><div><span className="eyebrow">Navigation release gate</span><h2>Role rail and page-orientation evidence</h2><p>Navigation is tested as part of architecture-product usability, not treated as decorative chrome.</p></div><span className={`status-pill ${report.navigationUx.unresolvedBlockers ? 'status-pill--blocked' : 'status-pill--ready'}`}>{report.navigationUx.unresolvedBlockers ? `${report.navigationUx.unresolvedBlockers} blocker` : 'No blocker'}</span></header>
      <div className="aoe-viewport-strip">{report.navigationUx.testedViewports.map((viewport) => <span key={viewport}>{viewport}</span>)}</div>
      <div className="aoe-nav-observations">{report.navigationUx.observations.map((item) => <article key={item.id}>
        <div>{item.resolved ? <CheckCircle2 size={17}/> : item.severity === 'blocker' ? <XCircle size={17}/> : <AlertTriangle size={17}/>}</div>
        <div><strong>{item.message}</strong><small>{item.viewport} · {item.roleId} · {item.category}</small><p>{item.remediation}</p></div>
        <span className={`status-pill ${item.resolved ? 'status-pill--ready' : 'status-pill--blocked'}`}>{item.resolved ? 'resolved' : 'open'}</span>
      </article>)}</div>
    </section> : null}

    {tab === 'pilot-readiness' ? <div className="aoe-two-column">
      <section className="aoe-panel">
        <header><div><span className="eyebrow">Controlled pilot gate</span><h2>What is ready now</h2></div></header>
        <div className="aoe-readiness-list">
          <article><CheckCircle2 size={17}/><div><strong>Seven scenario definitions</strong><small>Requirements, quality drivers, expected concerns and deliberate traps</small></div></article>
          <article><CheckCircle2 size={17}/><div><strong>Three-mode comparison</strong><small>Conventional reference, deterministic AIW and governed LLM</small></div></article>
          <article><CheckCircle2 size={17}/><div><strong>Pinned reproducibility baseline</strong><small>Application, knowledge, grammar, Pattern DNA and provider policy</small></div></article>
          <article><CheckCircle2 size={17}/><div><strong>Blinded expert pack</strong><small>Rubric, anonymized variants and recommendation classifications</small></div></article>
          <article><CheckCircle2 size={17}/><div><strong>Navigation and UX gate</strong><small>Responsive role rail, exact active state and focus restoration</small></div></article>
        </div>
      </section>
      <aside className="aoe-panel">
        <header><div><span className="eyebrow">External evidence still required</span><h2>No fabricated pilot acceptance</h2></div></header>
        <div className="aoe-readiness-list is-open">
          <article><AlertTriangle size={17}/><div><strong>Independent expert panel</strong><small>At least three experienced architects must score blinded variants.</small></div></article>
          <article><AlertTriangle size={17}/><div><strong>Measured human baseline</strong><small>Conventional-tool time and quality must be observed, not estimated.</small></div></article>
          <article><AlertTriangle size={17}/><div><strong>Authorised enterprise initiative</strong><small>Run at least one genuine project with real architects and reviewers.</small></div></article>
          <article><AlertTriangle size={17}/><div><strong>Managed infrastructure evidence</strong><small>OIDC, tenant RLS, queues, storage, signing, telemetry and recovery.</small></div></article>
        </div>
        <div className="aoe-honesty-boundary"><Scale size={16}/><p><strong>Release boundary</strong>{report.governance.boundary}</p></div>
      </aside>
    </div> : null}
  </section>;
}
