import { useState } from 'react';
import { BrainCircuit, CheckCircle2, Loader2, Sparkles, X } from 'lucide-react';
import type { ProjectContext } from '@aiw/domain';
import { useWorkspaceStore } from '../store/workspaceStore';
import { DesignGuide } from './DesignGuide';
import { FullJourneyIntelligenceSurface } from './WorkspaceIntelligenceMap';
import { postJson } from '../lib/apiClient';
import { useGuidedDeliveryTask } from '../lib/guidedDeliveryContext';

function toLines(items: string[] = []) { return items.join('\n'); }
function fromLines(value: string) { return value.split('\n').map((item) => item.trim()).filter(Boolean); }

interface BriefProposal {
  mode: 'llm-assisted'|'deterministic-fallback';
  proposal: {
    problemStatement: string;
    objectives: string[];
    constraints: string[];
    assumptions: string[];
    context?: Partial<ProjectContext>;
    qualityScenarios: Array<{ attributeId: string; source: string; stimulus: string; environment: string; artifact: string; response: string; responseMeasure: string; weight: number }>;
    clarificationQuestions: string[];
  };
  modelTrace?: { providerId: string; model: string; routeId: string; fallbackUsed: boolean; requestFingerprint: string };
}

const contextLabels: Array<[keyof ProjectContext, string]> = [
  ['stakeholders', 'Stakeholders'],
  ['inScopeCapabilities', 'In-scope capabilities'],
  ['outOfScopeCapabilities', 'Out-of-scope capabilities'],
  ['dataClassifications', 'Data classifications'],
  ['regulatoryJurisdictions', 'Regulatory jurisdictions'],
  ['existingSystems', 'Existing systems'],
  ['problemShapes', 'Problem-shape signals'],
  ['preferredVendors', 'Preferred vendors'],
  ['prohibitedTechnologies', 'Prohibited technologies'],
  ['sovereigntyRequirements', 'Data sovereignty requirements'],
  ['vendorMandates', 'Vendor or platform mandates'],
  ['legacyConstraints', 'Legacy and transition constraints'],
];

const ratingOptions = [
  [1, '1 — Low'],
  [2, '2 — Emerging'],
  [3, '3 — Established'],
  [4, '4 — Strong'],
  [5, '5 — Advanced'],
] as const;

export function DesignBriefStudio() {
  const guidedTask = useGuidedDeliveryTask();
  const guidedTaskId = guidedTask?.stageId === 'requirements' ? guidedTask.taskId : null;
  const project = useWorkspaceStore((state) => state.project);
  const setProjectText = useWorkspaceStore((state) => state.setProjectText);
  const setListField = useWorkspaceStore((state) => state.setListField);
  const setContextField = useWorkspaceStore((state) => state.setContextField);
  const addQualityScenario = useWorkspaceStore((state) => state.addQualityScenario);
  const [sourceBrief, setSourceBrief] = useState('');
  const [proposal, setProposal] = useState<BriefProposal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyse = async () => {
    const text = sourceBrief.trim() || [project.description, ...project.objectives, ...project.constraints, ...project.assumptions].join('\n');
    if (text.length < 20) { setError('Add a fuller brief before asking the co-architect to structure it.'); return; }
    setLoading(true); setError(null);
    try { setProposal(await postJson<BriefProposal>('/api/design-brief/analyse', { project, briefText: text, dataClassification: 'internal' })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Brief analysis failed.'); }
    finally { setLoading(false); }
  };

  const apply = () => {
    if (!proposal) return;
    setProjectText('description', proposal.proposal.problemStatement);
    setListField('objectives', proposal.proposal.objectives.join('\n'));
    setListField('constraints', proposal.proposal.constraints.join('\n'));
    setListField('assumptions', proposal.proposal.assumptions.join('\n'));
    for (const [key] of contextLabels) {
      const value = proposal.proposal.context?.[key];
      if (Array.isArray(value) && value.length) setContextField(key, value as never);
    }
    const scalarContext = proposal.proposal.context ?? {};
    if (scalarContext.workloadProfile) setContextField('workloadProfile', scalarContext.workloadProfile);
    if (scalarContext.availabilityTarget) setContextField('availabilityTarget', scalarContext.availabilityTarget);
    if (scalarContext.recoveryObjectives) setContextField('recoveryObjectives', scalarContext.recoveryObjectives);
    if (scalarContext.teamTopology) setContextField('teamTopology', scalarContext.teamTopology);
    if (scalarContext.teamSize != null) setContextField('teamSize', scalarContext.teamSize);
    if (scalarContext.deliveryHorizonMonths != null) setContextField('deliveryHorizonMonths', scalarContext.deliveryHorizonMonths);
    if (scalarContext.operationalMaturity != null) setContextField('operationalMaturity', scalarContext.operationalMaturity);
    if (scalarContext.architectureExperience != null) setContextField('architectureExperience', scalarContext.architectureExperience);
    if (scalarContext.organizationalChangeReadiness != null) setContextField('organizationalChangeReadiness', scalarContext.organizationalChangeReadiness);
    if (scalarContext.budgetSensitivity != null) setContextField('budgetSensitivity', scalarContext.budgetSensitivity);
    if (scalarContext.regulatoryExposure) setContextField('regulatoryExposure', scalarContext.regulatoryExposure);
    if (scalarContext.deploymentModel) setContextField('deploymentModel', scalarContext.deploymentModel);
    if (scalarContext.dataSensitivity) setContextField('dataSensitivity', scalarContext.dataSensitivity);
    if (scalarContext.transitionState) setContextField('transitionState', scalarContext.transitionState);
    if (scalarContext.reversibilityPreference != null) setContextField('reversibilityPreference', scalarContext.reversibilityPreference);
    if (scalarContext.supportModel) setContextField('supportModel', scalarContext.supportModel);
    if (scalarContext.changeCadence) setContextField('changeCadence', scalarContext.changeCadence);
    if (scalarContext.peakLoadVariability) setContextField('peakLoadVariability', scalarContext.peakLoadVariability);
    for (const scenario of proposal.proposal.qualityScenarios) addQualityScenario(scenario);
    setSourceBrief(''); setProposal(null);
  };

  return (
    <section className={`studio-page guided-brief ${guidedTaskId ? `guided-brief--${guidedTaskId}` : "guided-brief--advanced"}`}>
      <div className="page-heading"><div><span className="eyebrow">Stage 0</span><h2>Design Brief Studio</h2><p>Capture the intent that will drive recommendations, validation and traceability.</p></div><div className="status-pill">Revision {project.revision}</div></div>

      <DesignGuide placement="brief" />

      <details className="workbench-disclosure workbench-disclosure--visual brief-section brief-section--review" open={!guidedTaskId || guidedTaskId === 'review'}>
        <summary>
          <span>Visual architecture intelligence</span>
          <small>Intent, drivers and current recommendations</small>
        </summary>
        <FullJourneyIntelligenceSurface />
      </details>

      <details className="workbench-disclosure brief-section brief-section--intent" open={!guidedTaskId || guidedTaskId === 'intent'}>
        <summary>
          <span>AI-assisted intake</span>
          <small>Paste a brief and review structured proposals</small>
        </summary>
        <section className="brief-intake-card">
        <div><span className="eyebrow">AI-assisted intake</span><h3>Turn a plain-language brief into reviewable architecture intent</h3><p>Paste meeting notes, requirements or a problem statement. AIW proposes structured fields and measurable scenarios; nothing changes until you approve it.</p></div>
        <textarea rows={5} value={sourceBrief} onChange={(event) => setSourceBrief(event.target.value)} placeholder="Example: Build a pan-African payment platform for merchants. Volumes are highly spiky, no confirmed transaction may be lost, and customer data must remain in-country…"/>
        <div className="brief-intake-actions"><small>{error ?? 'The configured LLM route is used when available; deterministic extraction remains available offline.'}</small><button className="button button--ai" disabled={loading} onClick={() => void analyse()}>{loading ? <Loader2 className="spin" size={16}/> : <BrainCircuit size={16}/>} Analyse with co-architect</button></div>
        </section>
      </details>

      <details className="workbench-disclosure brief-section brief-section--core" open>
        <summary>
          <span>Core design brief</span>
          <small>Project name, problem statement, objectives and constraints</small>
        </summary>
        <div className="form-grid">
        <label className="field field--wide brief-field brief-field--intent"><span>Project name</span><input value={project.name} onChange={(event) => setProjectText('name', event.target.value)} /></label>
        <label className="field field--wide brief-field brief-field--intent"><span>Problem statement</span><textarea rows={4} value={project.description} onChange={(event) => setProjectText('description', event.target.value)} /></label>
        <label className="field brief-field brief-field--intent"><span>Objectives — one per line</span><textarea rows={8} value={toLines(project.objectives)} onChange={(event) => setListField('objectives', event.target.value)} /></label>
        <label className="field brief-field brief-field--constraints"><span>Constraints — one per line</span><textarea rows={8} value={toLines(project.constraints)} onChange={(event) => setListField('constraints', event.target.value)} /></label>
        <label className="field field--wide brief-field brief-field--review"><span>Assumptions — one per line</span><textarea rows={5} value={toLines(project.assumptions)} onChange={(event) => setListField('assumptions', event.target.value)} /></label>
        </div>
      </details>

      <details className="workbench-disclosure brief-section brief-section--enterprise" open={Boolean(guidedTaskId)}>
        <summary>
          <span>Enterprise context</span>
          <small>Stakeholders, scope, regulatory exposure and operating constraints</small>
        </summary>
        <section className="enterprise-context-card">
        <div className="section-heading-row"><div><span className="eyebrow">Structured enterprise context</span><h3>Make applicability and governance explicit</h3><p>These fields drive eligibility gates, regional guidance, evidence retrieval and synthesis readiness.</p></div></div>
        <div className="form-grid">
          {contextLabels.map(([key, label]) => {
            const taskClass = ['stakeholders','inScopeCapabilities','outOfScopeCapabilities'].includes(String(key)) ? 'scope' : 'constraints';
            return <label className={`field brief-field brief-field--${taskClass}`} key={key}><span>{label} — one per line</span><textarea rows={4} value={toLines((project.context[key] as string[] | undefined) ?? [])} onChange={(event) => setContextField(key, fromLines(event.target.value) as never)} /></label>;
          })}
          <label className="field brief-field brief-field--constraints"><span>Workload profile</span><textarea rows={3} value={project.context.workloadProfile ?? ''} onChange={(event) => setContextField('workloadProfile', event.target.value)} placeholder="Steady, seasonal, bursty, globally distributed…"/></label>
          <label className="field brief-field brief-field--constraints"><span>Availability target</span><input value={project.context.availabilityTarget ?? ''} onChange={(event) => setContextField('availabilityTarget', event.target.value)} placeholder="99.95% monthly; zero lost confirmed transactions"/></label>
          <label className="field brief-field brief-field--constraints"><span>Recovery objectives</span><input value={project.context.recoveryObjectives ?? ''} onChange={(event) => setContextField('recoveryObjectives', event.target.value)} placeholder="RTO 30 minutes; RPO 0 for confirmed payments"/></label>
          <label className="field brief-field brief-field--constraints"><span>Team topology</span><input value={project.context.teamTopology ?? ''} onChange={(event) => setContextField('teamTopology', event.target.value)} placeholder="Three stream-aligned teams and one platform team"/></label>
        </div>

        <section className="context-decision-panel brief-field brief-field--constraints" aria-labelledby="decision-context-heading">
          <div className="context-decision-panel__heading">
            <div>
              <span className="eyebrow">Decision feasibility</span>
              <h4 id="decision-context-heading">Tell AIW what the organisation can actually deliver and operate</h4>
              <p>These values temper theoretical pattern fit with team capability, transition cost, sovereignty, operating maturity and reversibility. Missing values reduce context confidence rather than being silently guessed.</p>
            </div>
            <span className="context-confidence-note">Feeds deterministic ranking</span>
          </div>
          <div className="form-grid form-grid--decision-context">
            <label className="field"><span>Team size</span><input type="number" min="1" value={project.context.teamSize ?? ''} onChange={(event) => setContextField('teamSize', event.target.value ? Number(event.target.value) : undefined)} placeholder="12" /></label>
            <label className="field"><span>Delivery horizon (months)</span><input type="number" min="1" value={project.context.deliveryHorizonMonths ?? ''} onChange={(event) => setContextField('deliveryHorizonMonths', event.target.value ? Number(event.target.value) : undefined)} placeholder="9" /></label>
            <label className="field"><span>Operational maturity</span><select value={project.context.operationalMaturity ?? ''} onChange={(event) => setContextField('operationalMaturity', event.target.value ? Number(event.target.value) as 1|2|3|4|5 : undefined)}><option value="">Not assessed</option>{ratingOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="field"><span>Architecture experience</span><select value={project.context.architectureExperience ?? ''} onChange={(event) => setContextField('architectureExperience', event.target.value ? Number(event.target.value) as 1|2|3|4|5 : undefined)}><option value="">Not assessed</option>{ratingOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="field"><span>Change readiness</span><select value={project.context.organizationalChangeReadiness ?? ''} onChange={(event) => setContextField('organizationalChangeReadiness', event.target.value ? Number(event.target.value) as 1|2|3|4|5 : undefined)}><option value="">Not assessed</option>{ratingOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="field"><span>Budget sensitivity</span><select value={project.context.budgetSensitivity ?? ''} onChange={(event) => setContextField('budgetSensitivity', event.target.value ? Number(event.target.value) as 1|2|3|4|5 : undefined)}><option value="">Not assessed</option>{ratingOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="field"><span>Regulatory exposure</span><select value={project.context.regulatoryExposure ?? ''} onChange={(event) => setContextField('regulatoryExposure', (event.target.value || undefined) as ProjectContext['regulatoryExposure'])}><option value="">Not assessed</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            <label className="field"><span>Deployment model</span><select value={project.context.deploymentModel ?? ''} onChange={(event) => setContextField('deploymentModel', (event.target.value || undefined) as ProjectContext['deploymentModel'])}><option value="">Not decided</option><option value="on-premises">On-premises</option><option value="private-cloud">Private cloud</option><option value="public-cloud">Public cloud</option><option value="hybrid">Hybrid</option><option value="edge">Edge</option><option value="multi-cloud">Multi-cloud</option></select></label>
            <label className="field"><span>Data sensitivity</span><select value={project.context.dataSensitivity ?? ''} onChange={(event) => setContextField('dataSensitivity', (event.target.value || undefined) as ProjectContext['dataSensitivity'])}><option value="">Not classified</option><option value="public">Public</option><option value="internal">Internal</option><option value="confidential">Confidential</option><option value="restricted">Restricted</option></select></label>
            <label className="field"><span>Transition state</span><select value={project.context.transitionState ?? ''} onChange={(event) => setContextField('transitionState', (event.target.value || undefined) as ProjectContext['transitionState'])}><option value="">Not decided</option><option value="greenfield">Greenfield</option><option value="incremental-modernization">Incremental modernisation</option><option value="migration">Migration</option><option value="coexistence">Coexistence</option></select></label>
            <label className="field"><span>Reversibility preference</span><select value={project.context.reversibilityPreference ?? ''} onChange={(event) => setContextField('reversibilityPreference', event.target.value ? Number(event.target.value) as 1|2|3|4|5 : undefined)}><option value="">Not assessed</option>{ratingOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="field"><span>Support model</span><select value={project.context.supportModel ?? ''} onChange={(event) => setContextField('supportModel', (event.target.value || undefined) as ProjectContext['supportModel'])}><option value="">Not decided</option><option value="product-team">Product team</option><option value="central-operations">Central operations</option><option value="managed-service">Managed service</option><option value="hybrid">Hybrid</option></select></label>
            <label className="field"><span>Change cadence</span><select value={project.context.changeCadence ?? ''} onChange={(event) => setContextField('changeCadence', (event.target.value || undefined) as ProjectContext['changeCadence'])}><option value="">Not known</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select></label>
            <label className="field"><span>Peak-load variability</span><select value={project.context.peakLoadVariability ?? ''} onChange={(event) => setContextField('peakLoadVariability', (event.target.value || undefined) as ProjectContext['peakLoadVariability'])}><option value="">Not known</option><option value="stable">Stable</option><option value="seasonal">Seasonal</option><option value="bursty">Bursty</option><option value="unpredictable">Unpredictable</option></select></label>
          </div>
        </section>
        </section>
      </details>

      {proposal ? <div className="modal-backdrop" role="presentation" onMouseDown={() => setProposal(null)}><section className="brief-proposal-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span className="eyebrow">{proposal.mode === 'llm-assisted' ? 'LLM-assisted proposal' : 'Governed offline proposal'}</span><h3>Review structured design intent</h3></div><button className="icon-button" onClick={() => setProposal(null)}><X size={17}/></button></header>
        <div className="brief-proposal-grid"><article><strong>Problem statement</strong><p>{proposal.proposal.problemStatement}</p></article><article><strong>Objectives</strong><ul>{proposal.proposal.objectives.map((item) => <li key={item}>{item}</li>)}</ul></article><article><strong>Constraints</strong><ul>{proposal.proposal.constraints.map((item) => <li key={item}>{item}</li>)}</ul></article><article><strong>Assumptions</strong><ul>{proposal.proposal.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></article></div>
        {proposal.proposal.context && Object.values(proposal.proposal.context).some((value) => Array.isArray(value) ? value.length : Boolean(value)) ? <section><h4>Proposed enterprise context</h4><div className="brief-proposal-grid">{contextLabels.map(([key, label]) => { const values = proposal.proposal.context?.[key]; return Array.isArray(values) && values.length ? <article key={key}><strong>{label}</strong><ul>{values.map((item) => <li key={String(item)}>{String(item)}</li>)}</ul></article> : null; })}{(['workloadProfile','availabilityTarget','recoveryObjectives','teamTopology'] as const).map((key) => proposal.proposal.context?.[key] ? <article key={key}><strong>{key.replace(/([A-Z])/g, ' $1')}</strong><p>{String(proposal.proposal.context?.[key])}</p></article> : null)}</div></section> : null}
        {proposal.proposal.qualityScenarios.length ? <section><h4>Proposed measurable scenarios</h4>{proposal.proposal.qualityScenarios.map((scenario) => <div className="proposal-scenario" key={`${scenario.attributeId}-${scenario.stimulus}`}><Sparkles size={14}/><span><strong>{scenario.attributeId}: {scenario.stimulus}</strong><small>{scenario.responseMeasure}</small></span></div>)}</section> : null}
        {proposal.proposal.clarificationQuestions.length ? <section><h4>Questions that still need an architect</h4>{proposal.proposal.clarificationQuestions.map((question) => <div className="clarification-question" key={question}>{question}</div>)}</section> : null}
        <footer><button className="button button--secondary" onClick={() => setProposal(null)}>Discard</button><button className="button button--primary" onClick={apply}><CheckCircle2 size={15}/> Apply reviewed proposal</button></footer>
      </section></div> : null}
    </section>
  );
}
