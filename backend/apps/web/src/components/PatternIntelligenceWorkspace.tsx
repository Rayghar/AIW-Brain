import { useEffect, useMemo, useState } from 'react';
import { Activity, Boxes, BrainCircuit, CheckCircle2, Code2, GitCommitHorizontal, LibraryBig, Network, RotateCcw, Search, ShieldCheck, Sparkles, TriangleAlert, Workflow } from 'lucide-react';
import { llmProviderCatalog, patternCorpusMetrics, sprint78PatternCorpus, type LlmProviderId, type LlmPurpose, type LlmRuntimePolicy, type PatternKnowledgeRecord, type RepositoryOperation } from '@aiw/domain';
import { buildRecommendationEvidencePack, buildRepositoryGovernancePolicies, composePatterns, generateArchitectureFitnessFunctions, governRepositoryOperation, normalizePatternCorpus, sprint78KnowledgeReleaseManifest } from '@aiw/engine';
import { useWorkspaceStore } from '../store/workspaceStore';
import { getJson, postJson, putJson } from '../lib/apiClient';
import { FullJourneyIntelligenceSurface } from './WorkspaceIntelligenceMap';
import { StudioMarketplacePanel, StudioOperatorChecklist } from './StudioSpecialistSurfaces';
import { VisualCompositionStudio } from './VisualCompositionStudio';

type Tab = 'library' | 'compose' | 'recommend' | 'governance' | 'brain' | 'fitness' | 'release';

const recordTypeLabels: Record<PatternKnowledgeRecord['recordType'], string> = {
  style: 'Style', pattern: 'Pattern', 'anti-pattern': 'Anti-pattern', 'topology-template': 'Topology', 'component-archetype': 'Archetype', 'reference-architecture': 'Reference',
};

export function PatternIntelligenceWorkspace() {
  const project = useWorkspaceStore((state) => state.project);
  const [tab, setTab] = useState<Tab>('compose');
  const [query, setQuery] = useState('event driven resilient integration');
  const [category, setCategory] = useState('all');
  const [selectedId, setSelectedId] = useState('PAT-EVENT-DRIVEN-ARCHITECTURE');
  const [secondaryId, setSecondaryId] = useState('PAT-TRANSACTIONAL-OUTBOX');
  const [connectorId, setConnectorId] = useState('GH-FINOS-CALM');
  const [operation, setOperation] = useState<RepositoryOperation>('recommend');
  const [brainProvider, setBrainProvider] = useState<LlmProviderId>('openai');
  const [brainModel, setBrainModel] = useState('gpt-5.5');
  const [brainPurpose, setBrainPurpose] = useState<LlmPurpose>('architecture-reasoning');
  const [runtimePolicy, setRuntimePolicy] = useState<LlmRuntimePolicy | null>(null);
  const [brainStatus, setBrainStatus] = useState<string>('Loading runtime policy…');


  useEffect(() => {
    const focus = sessionStorage.getItem('aiw-pattern-focus');
    if (focus && sprint78PatternCorpus.some((record) => record.id === focus)) { setSelectedId(focus); setTab('library'); sessionStorage.removeItem('aiw-pattern-focus'); }
    void getJson<{ policy: LlmRuntimePolicy }>('/api/llm-brain/config').then(({ policy }) => {
      setRuntimePolicy(policy);
      const route = policy.routes.find((item) => item.purpose === 'architecture-reasoning') ?? policy.routes[0];
      if (route) { setBrainProvider(route.providerId); setBrainModel(route.model); setBrainPurpose(route.purpose); }
      setBrainStatus('Runtime policy loaded.');
    }).catch((error) => setBrainStatus(error instanceof Error ? `Runtime policy unavailable: ${error.message}` : 'Runtime policy unavailable.'));
  }, []);

  const saveBrainRoute = async () => {
    if (!runtimePolicy) return;
    const provider = llmProviderCatalog.find((item) => item.id === brainProvider)!;
    const current = runtimePolicy.routes.find((item) => item.purpose === brainPurpose);
    const route = { ...(current ?? { id: `${brainPurpose}:${brainProvider}:${brainModel}`, purpose: brainPurpose, enabled: true, fallbackRouteIds: [], dataClassificationAllowlist: ['public','internal','confidential'] as Array<'public'|'internal'|'confidential'|'restricted'> }), providerId: brainProvider, model: brainModel, baseUrl: current?.baseUrl ?? provider.defaultBaseUrl, apiKeyEnvironmentVariable: current?.apiKeyEnvironmentVariable ?? provider.apiKeyEnvironmentVariable, protocol: current?.protocol ?? (brainPurpose === 'embedding' ? 'embeddings' : provider.protocols[0]), id: `${brainPurpose}:${brainProvider}:${brainModel}` };
    const policy = { ...runtimePolicy, routes: [...runtimePolicy.routes.filter((item) => item.purpose !== brainPurpose), route] } as LlmRuntimePolicy;
    setBrainStatus('Saving runtime policy…');
    try { const response = await putJson<{ policy: LlmRuntimePolicy }>('/api/llm-brain/config', { policy }); setRuntimePolicy(response.policy); setBrainStatus('Runtime route saved and activated for new requests.'); }
    catch (error) { setBrainStatus(error instanceof Error ? error.message : 'Runtime policy save failed.'); }
  };

  const probeBrainRoute = async () => {
    setBrainStatus('Running provider probe…');
    try { const result = await postJson<{ providerId: string; model: string; latencyMs: number }>('/api/llm-brain/active-probe', { purpose: brainPurpose }); setBrainStatus(`Connected to ${result.providerId}/${result.model} in ${result.latencyMs} ms.`); }
    catch (error) { setBrainStatus(error instanceof Error ? `Probe failed: ${error.message}` : 'Provider probe failed.'); }
  };

  const metrics = useMemo(() => patternCorpusMetrics(), []);
  const normalization = useMemo(() => normalizePatternCorpus(), []);
  const release = useMemo(() => sprint78KnowledgeReleaseManifest(), []);
  const policies = useMemo(() => buildRepositoryGovernancePolicies(), []);
  const categories = useMemo(() => ['all', ...Object.keys(metrics.categories).sort()], [metrics]);
  const filtered = useMemo(() => {
    const text = query.toLowerCase().trim();
    return sprint78PatternCorpus.filter((record) => (category === 'all' || record.category === category) && (!text || `${record.name} ${record.summary} ${record.tags.join(' ')}`.toLowerCase().includes(text))).slice(0, 80);
  }, [category, query]);
  const selected = sprint78PatternCorpus.find((record) => record.id === selectedId) ?? sprint78PatternCorpus[0]!;
  const composition = useMemo(() => composePatterns({ project, patternIds: [selectedId, secondaryId], allowConditionalPrerequisites: true }), [project, selectedId, secondaryId]);
  const recommendation = useMemo(() => buildRecommendationEvidencePack({ query, project, limit: 8 }), [project, query]);
  const fitness = useMemo(() => generateArchitectureFitnessFunctions([selectedId, secondaryId]), [selectedId, secondaryId]);
  const governance = useMemo(() => governRepositoryOperation(connectorId, operation, policies), [connectorId, operation, policies]);

  return (
    <section className="pattern-intelligence-workspace">
      <header className="workspace-hero pattern-hero">
        <div>
          <span className="eyebrow">Pattern Studio</span>
          <h1>Operate governed architecture knowledge with a configurable AI brain</h1>
          <p>AIW now separates the governed knowledge plane from the model provider. OpenAI, xAI, Gemini, Qwen, DeepSeek, private or local OpenAI-compatible models can be assigned by purpose without changing the canonical architecture or evidence controls.</p>
        </div>
        <div className="hero-badge"><Sparkles size={18}/><span>Knowledge release</span><strong>{release.releaseId}</strong></div>
      </header>

      <FullJourneyIntelligenceSurface />

      <StudioMarketplacePanel
        title="Pattern marketplace and applicability board"
        description="Patterns now read like a governed architecture catalogue: each record must explain when it helps, when to avoid it, what quality attributes it changes and what obligations follow if accepted."
      >
        <div className="studio-marketplace-metrics">
          <span><strong>{metrics.totalRecords}</strong> records</span>
          <span><strong>{metrics.approvedRecords}</strong> approved</span>
          <span><strong>{metrics.antiPatterns}</strong> anti-patterns</span>
          <span><strong>{metrics.conformanceCoverage}%</strong> fitness coverage</span>
        </div>
        <StudioOperatorChecklist
          title="Pattern selection path"
          description="Use this flow before accepting a pattern into the model. It makes AIW feel like an expert design studio rather than a static library."
          items={[
            { id: 'fit', title: 'Check applicability', detail: `Selected: ${selected.name}. Confirm context, constraints and quality driver fit.`, tone: 'neutral' },
            { id: 'tradeoffs', title: 'Read trade-offs', detail: `${selected.risks.length + selected.forces.length} force/risk signal(s) documented for the selected pattern.`, tone: selected.risks.length || selected.forces.length ? 'watch' : 'ok' },
            { id: 'obligations', title: 'Accept obligations', detail: `${selected.obligations.length} obligation(s) follow if accepted into the architecture.`, tone: selected.obligations.length ? 'watch' : 'ok' },
            { id: 'fitness', title: 'Generate fitness tests', detail: 'Use the Fitness tab to convert accepted patterns into executable architecture checks.', tone: 'neutral' },
          ]}
        />
      </StudioMarketplacePanel>

      <div className="metric-grid metric-grid--six">
        <article><LibraryBig size={18}/><strong>{metrics.totalRecords}</strong><span>Pattern DNA records</span></article>
        <article><ShieldCheck size={18}/><strong>{metrics.approvedRecords}</strong><span>Approved records</span></article>
        <article><TriangleAlert size={18}/><strong>{metrics.antiPatterns}</strong><span>Anti-patterns</span></article>
        <article><Network size={18}/><strong>{metrics.topologyTemplates}</strong><span>Topology templates</span></article>
        <article><Code2 size={18}/><strong>{metrics.conformanceCoverage}%</strong><span>Fitness coverage</span></article>
        <article><GitCommitHorizontal size={18}/><strong>{policies.filter((item) => item.productionRecommendationAllowed).length}</strong><span>Production sources</span></article>
      </div>

      <nav className="pattern-tabs" aria-label="Pattern intelligence sections">
        {([
          ['library','Library',LibraryBig], ['compose','Compose',Workflow], ['recommend','Decision Radar',Sparkles], ['governance','Repository governance',ShieldCheck], ['brain','LLM Brain',BrainCircuit], ['fitness','Fitness tests',Code2], ['release','Release',GitCommitHorizontal],
        ] as const).map(([id, label, Icon]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={15}/>{label}</button>)}
      </nav>

      {tab === 'library' ? (
        <div className="pattern-studio-grid">
          <section className="panel-card pattern-browser">
            <div className="panel-heading"><div><span className="eyebrow">Visual Pattern Studio</span><h2>Reviewed architecture knowledge</h2></div><span className="status-chip success">{normalization.canonical.length} normalized</span></div>
            <div className="pattern-filters"><label><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Pattern DNA"/></label><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="pattern-card-grid">
              {filtered.map((record) => <button key={record.id} className={`pattern-dna-card ${selected.id === record.id ? 'selected' : ''}`} onClick={() => setSelectedId(record.id)}><span>{recordTypeLabels[record.recordType]}</span><strong>{record.name}</strong><small>{record.category} · {record.maturity}</small><p>{record.summary}</p><footer><b>{record.evidence.length} sources</b><b>{record.obligations.length} obligations</b></footer></button>)}
            </div>
          </section>
          <aside className="panel-card pattern-detail">
            <div className="panel-heading"><div><span className="eyebrow">Pattern DNA</span><h2>{selected.name}</h2></div><span className="status-chip success">{selected.lifecycle}</span></div>
            <p>{selected.problem}</p>
            <h3>Context and forces</h3><ul>{selected.context.slice(0,2).map((item) => <li key={item}>{item}</li>)}{selected.forces.slice(0,2).map((item) => <li key={item}>{item}</li>)}</ul>
            <h3>Quality impacts</h3><div className="quality-impact-list">{selected.qualityImpacts.map((impact) => <div key={impact.attributeId}><span>{impact.attributeId}</span><b className={impact.direction}>{impact.direction} {impact.magnitude}/5</b></div>)}</div>
            <h3>Obligations</h3>{selected.obligations.map((item) => <article className="obligation-card" key={item.id}><CheckCircle2 size={14}/><div><strong>{item.title}</strong><small>{item.description}</small></div></article>)}
            <h3>Evidence and review</h3><div className="evidence-chip-list">{selected.evidence.map((item) => <span key={item.connectorId}>{item.connectorId} · Tier {item.sourceTrustTier}</span>)}</div><small>Reviewed by {selected.review.reviewedBy} · {selected.review.releaseId}</small>
          </aside>
        </div>
      ) : null}

      {tab === 'compose' ? <VisualCompositionStudio /> : null}

      {tab === 'recommend' ? (
        <section className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Evidence-backed Decision Radar</span><h2>Context-qualified recommendations</h2></div><span className="status-chip success">{recommendation.knowledgeRelease}</span></div><label className="recommend-query"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)}/></label><div className="recommendation-grid">{recommendation.recommendations.map((item) => <article key={item.patternId} className={!item.eligible ? 'ineligible' : ''}><header><div><strong>{item.patternName}</strong><small>{item.patternId}</small></div><b>{item.totalScore}</b></header><div className="score-bar"><i style={{width:`${item.totalScore}%`}}/></div><p>{item.reasons.join(' ')}</p><footer>{item.eligible ? <span className="status-chip success">Eligible</span> : <span className="status-chip danger">Excluded</span>}<span>{item.evidenceConnectorIds.length} sources</span></footer>{item.penalties.map((penalty) => <small className="penalty" key={penalty}>{penalty}</small>)}</article>)}</div></section>
      ) : null}

      {tab === 'governance' ? (
        <div className="pattern-compose-grid"><section className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Repository source registry</span><h2>Connect to monitor; download to govern</h2></div></div><div className="governance-selectors"><select value={connectorId} onChange={(event) => setConnectorId(event.target.value)}>{policies.map((policy) => <option key={policy.connectorId} value={policy.connectorId}>{policy.repository}</option>)}</select><select value={operation} onChange={(event) => setOperation(event.target.value as RepositoryOperation)}>{['monitor','snapshot','extract-claims','recommend','generate-template','reuse-code'].map((item) => <option key={item}>{item}</option>)}</select></div><div className={`governance-decision ${governance.allowed ? 'allowed' : 'blocked'}`}>{governance.allowed ? <CheckCircle2/> : <TriangleAlert/>}<div><strong>{governance.allowed ? 'Operation permitted' : 'Operation blocked'}</strong><p>{governance.reasons.join(' ')}</p></div></div><h3>Required controls</h3><ol>{governance.requiredControls.map((item) => <li key={item}>{item}</li>)}</ol></section><aside className="panel-card repository-policy"><h2>Effective policy</h2>{policies.filter((item) => item.connectorId === connectorId).map((policy) => <div key={policy.connectorId}><dl><div><dt>Acquisition</dt><dd>{policy.acquisitionMode}</dd></div><div><dt>Monitoring</dt><dd>{policy.monitoringMode}</dd></div><div><dt>Snapshot</dt><dd>Immutable + quarantined</dd></div><div><dt>Licence</dt><dd>{policy.licenseGate}</dd></div><div><dt>Production advice</dt><dd>{policy.productionRecommendationAllowed ? 'Allowed after release' : 'Not allowed'}</dd></div></dl><p>Repository text is untrusted data. It cannot instruct the LLM, mutate a design or enter a production recommendation without a reviewed knowledge release.</p></div>)}</aside></div>
      ) : null}

      {tab === 'brain' ? (
        <div className="pattern-compose-grid">
          <section className="panel-card">
            <div className="panel-heading"><div><span className="eyebrow">Provider-neutral intelligence gateway</span><h2>Configure the LLM by purpose</h2></div><span className="status-chip success">Secrets externalized</span></div>
            <p>The model explains, extracts and drafts. Deterministic AIW services retain authority over eligibility, scoring, canonical-model mutation, evidence release status and policy gates.</p>
            <div className="brain-config-grid">
              <label>Provider<select value={brainProvider} onChange={(event) => setBrainProvider(event.target.value as LlmProviderId)}>{llmProviderCatalog.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>
              <label>Model<input value={brainModel} onChange={(event) => setBrainModel(event.target.value)} /></label>
              <label>Purpose<select value={brainPurpose} onChange={(event) => { const purpose = event.target.value as LlmPurpose; setBrainPurpose(purpose); const route = runtimePolicy?.routes.find((item) => item.purpose === purpose); if (route) { setBrainProvider(route.providerId); setBrainModel(route.model); } }}><option>knowledge-extraction</option><option>architecture-reasoning</option><option>recommendation-explanation</option><option>artifact-drafting</option><option>embedding</option></select></label>
            </div>
            <div className="brain-runtime-actions"><span>{brainStatus}</span><button className="button button--secondary" onClick={() => void saveBrainRoute()}>Save route</button><button className="button button--primary" onClick={() => void probeBrainRoute()}>Test connection</button></div>
            <h3>Runtime configuration preview</h3>
            <code className="brain-config-code">{`AIW_LLM_PROVIDER=${brainProvider}
AIW_LLM_MODEL=${brainModel}
${llmProviderCatalog.find((item) => item.id === brainProvider)?.apiKeyEnvironmentVariable}=<secret reference>`}</code>
            <h3>Governance controls</h3>
            <div className="brain-guardrails">
              {['Per-purpose provider routes and safe alternatives','Data-classification allowlists','Structured-output validation','Circuit breakers and retry limits','Prompt-injection isolation','No prompt or secret persistence','Provider/model audit metadata','Deterministic post-validation'].map((item) => <span key={item}><CheckCircle2 size={14}/>{item}</span>)}
            </div>
          </section>
          <aside className="panel-card repository-policy">
            <BrainCircuit size={22}/><h2>{llmProviderCatalog.find((item) => item.id === brainProvider)?.name}</h2>
            <p>{llmProviderCatalog.find((item) => item.id === brainProvider)?.configurationNote}</p>
            <h3>Data boundary</h3><p>{llmProviderCatalog.find((item) => item.id === brainProvider)?.dataBoundaryNote}</p>
            <dl><div><dt>Protocols</dt><dd>{llmProviderCatalog.find((item) => item.id === brainProvider)?.protocols.join(', ')}</dd></div><div><dt>JSON schema</dt><dd>{llmProviderCatalog.find((item) => item.id === brainProvider)?.supportsJsonSchema ? 'Native' : 'Validated alternative'}</dd></div><div><dt>Embeddings</dt><dd>{llmProviderCatalog.find((item) => item.id === brainProvider)?.supportsEmbeddings ? 'Supported' : 'Separate route required'}</dd></div></dl>
          </aside>
        </div>
      ) : null}

      {tab === 'fitness' ? (
        <section className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Architecture fitness functions</span><h2>Generate reviewable conformance controls</h2></div><span className="status-chip warning">Human review required</span></div><div className="fitness-grid">{fitness.map((artifact) => <article key={artifact.id}><Code2 size={18}/><div><strong>{artifact.target}</strong><small>{artifact.path}</small><p>{artifact.content.slice(0,220)}</p></div></article>)}</div></section>
      ) : null}

      {tab === 'release' ? (
        <div className="pattern-compose-grid"><section className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Signed knowledge release</span><h2>{release.releaseId}</h2></div><span className="status-chip success">{release.status}</span></div><div className="release-summary"><article><strong>{release.recordIds.length}</strong><span>records</span></article><article><strong>{release.approvedConnectorIds.length}</strong><span>approved connectors</span></article><article><strong>{release.productionConnectorIds.length}</strong><span>production sources</span></article></div><code>{release.checksum}</code><h3>Release guarantees</h3><ul><li>Production recommendations never query GitHub live.</li><li>Every source is pinned to an approved revision and immutable snapshot.</li><li>Discovery-only repositories cannot affect recommendation scores.</li><li>Provider realizations remain separate from vendor-neutral Pattern DNA.</li></ul></section><aside className="panel-card"><Activity size={20}/><h2>Knowledge lifecycle</h2>{['Monitor approved repositories','Download commit-pinned snapshot','Quarantine and scan','Extract candidate claims','Normalize and detect contradictions','Expert review and regression','Publish immutable release','Retrieve internally for recommendations'].map((item,index) => <div className="release-step" key={item}><span>{index+1}</span><strong>{item}</strong></div>)}</aside></div>
      ) : null}
    </section>
  );
}
