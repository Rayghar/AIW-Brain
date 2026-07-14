import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardCheck,
  Compass,
  Layers3,
  ListChecks,
  SlidersHorizontal,
  Bot,
  DatabaseZap,
  MessageCircleQuestion,
  ShieldAlert,
} from 'lucide-react';
import { createDesignLibrary, trustedArchitectureSources } from '@aiw/domain';
import { assessDesignLibraryIntegrity, detectArchitectureAntiPatterns, nextArchitectureQuestions } from '@aiw/engine';
import { useWorkspaceStore } from '../store/workspaceStore';
import { DesignGuide } from './DesignGuide';
import { RecommendationConfidenceDisclosure } from './RecommendationConfidenceDisclosure';

type Tab = 'now' | 'inspect' | 'styles' | 'patterns' | 'decisions' | 'evidence' | 'interview' | 'risks';

export function PatternExplorer() {
  const [tab, setTab] = useState<Tab>('now');
  const project = useWorkspaceStore((state) => state.project);
  const contextual = useWorkspaceStore((state) => state.contextual);
  const recommendations = useWorkspaceStore((state) => state.recommendations);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const acceptStyle = useWorkspaceStore((state) => state.acceptStyleRecommendation);
  const setPatternStatus = useWorkspaceStore((state) => state.setPatternStatus);
  const recordDecision = useWorkspaceStore((state) => state.recordDecisionSuggestion);
  const acknowledgeObligation = useWorkspaceStore((state) => state.acknowledgeObligation);
  const updateNodeProperty = useWorkspaceStore((state) => state.updateNodeProperty);
  const updateNodeLabel = useWorkspaceStore((state) => state.updateNodeLabel);
  const invokeAudit = useWorkspaceStore((state) => state.invokeAudit);
  const library = useWorkspaceStore((state) => state.library);
  const selectedNode = selectedNodeId ? project.nodes.find((node) => node.id === selectedNodeId) : undefined;
  const designRecords = createDesignLibrary(library);
  const selectedRecord = selectedNode ? designRecords.find((record) => record.id === String(selectedNode.properties.libraryRecordId ?? '')) ?? designRecords.find((record) => record.componentKind === selectedNode.kind && record.applicableStages.includes(selectedNode.stage)) : undefined;

  const topStyle = contextual.styles.find((item) => item.eligible);
  const topStyleConfidence = topStyle ? recommendations.find((item) => item.styleId === topStyle.styleId) : undefined;
  const topPatterns = contextual.patterns.filter((item) => item.eligible).slice(0, 5);
  const openObligations = contextual.obligations.filter((item) => !item.satisfied);
  const integrity = useMemo(() => assessDesignLibraryIntegrity(library), [library]);
  const interview = useMemo(() => nextArchitectureQuestions(project), [project]);
  const antiPatterns = useMemo(() => detectArchitectureAntiPatterns(project), [project]);
  const selectedEvidence = selectedRecord ? integrity.records.find((record) => record.recordId === selectedRecord.id) : undefined;
  const sourceMap = useMemo(() => new Map(trustedArchitectureSources.map((source) => [source.id, source])), []);

  return (
    <aside className="pattern-explorer recommendation-radar">
      <div className="panel-heading"><Compass size={17} /><strong>Decision Radar</strong></div>
      <p>{contextual.headline}</p>
      <div className="scope-chip">Scope: <strong>{selectedNode?.label ?? 'Active view'}</strong></div>

      <div className="radar-tabs" role="tablist" aria-label="Recommendation categories">
        <button className={tab === 'now' ? 'active' : ''} onClick={() => setTab('now')}><Compass size={14} /> Now</button>
        <button className={tab === 'inspect' ? 'active' : ''} onClick={() => setTab('inspect')}><SlidersHorizontal size={14} /> Inspect</button>
        <button className={tab === 'styles' ? 'active' : ''} onClick={() => setTab('styles')}><Layers3 size={14} /> Styles</button>
        <button className={tab === 'patterns' ? 'active' : ''} onClick={() => setTab('patterns')}><BookOpen size={14} /> Patterns</button>
        <button className={tab === 'decisions' ? 'active' : ''} onClick={() => setTab('decisions')}><ClipboardCheck size={14} /> Decisions</button>
        <button className={tab === 'evidence' ? 'active' : ''} onClick={() => setTab('evidence')}><DatabaseZap size={14} /> Evidence</button>
        <button className={tab === 'interview' ? 'active' : ''} onClick={() => setTab('interview')}><MessageCircleQuestion size={14} /> Questions</button>
        <button className={tab === 'risks' ? 'active' : ''} onClick={() => setTab('risks')}><ShieldAlert size={14} /> Anti-patterns</button>
      </div>

      {tab === 'now' ? (
        <div className="radar-section-stack">
          {topStyle ? (
            <article className="radar-feature-card">
              <span className="eyebrow">Leading style · {topStyle.score.toFixed(1)}</span>
              <h4>{topStyle.styleName}</h4>
              <p>{topStyle.strengths[0] ?? topStyle.assumptions[0]}</p>
              {topStyle.tradeoffs[0] ? <small>Trade-off: {topStyle.tradeoffs[0]}</small> : null}
              {topStyleConfidence ? <RecommendationConfidenceDisclosure recommendation={topStyleConfidence} compact /> : null}
              <button onClick={() => acceptStyle(topStyle.styleId)}>Accept style <ChevronRight size={14} /></button>
            </article>
          ) : null}

          <div className="radar-mini-list">
            <div className="radar-subhead"><BookOpen size={15} /><strong>Recommended patterns</strong></div>
            {topPatterns.slice(0, 3).map((pattern) => (
              <button key={pattern.patternId} onClick={() => setPatternStatus(pattern.patternId, pattern.status === 'accepted' ? 'accepted' : 'considering')}>
                <span><strong>{pattern.patternName}</strong><small>{pattern.reasons[0]}</small></span>
                <b>{pattern.score}</b>
              </button>
            ))}
          </div>

          <div className="radar-mini-list">
            <div className="radar-subhead"><ClipboardCheck size={15} /><strong>Decisions due</strong></div>
            {contextual.decisions.length === 0 ? <div className="empty-card"><Check size={16} /> No unrecorded decision suggestions.</div> : contextual.decisions.slice(0, 3).map((decision) => (
              <button key={decision.id} onClick={() => recordDecision(decision.id)}>
                <span><strong>{decision.title}</strong><small>{decision.recommendedDecision}</small></span>
                <em>{decision.priority}</em>
              </button>
            ))}
          </div>

          {openObligations.length ? (
            <div className="obligation-summary">
              <AlertTriangle size={16} />
              <span><strong>{openObligations.length} open obligation(s)</strong><small>Accepting styles and patterns creates design work that must be acknowledged or satisfied.</small></span>
            </div>
          ) : null}
        </div>
      ) : null}


      {tab === 'inspect' ? (
        <div className="inspector-panel">
          {selectedNode ? <>
            <DesignGuide placement="inspector" compact />
            <div className="inspector-identity"><span className="eyebrow">{selectedNode.kind}</span><input value={selectedNode.label} onChange={(event) => updateNodeLabel(selectedNode.id, event.target.value)}/><p>{selectedRecord?.description ?? selectedNode.description ?? 'Typed architecture component.'}</p></div>
            <div className="inspector-meta"><span>Stage <b>{selectedNode.stage}</b></span><span>Lineage <b>{selectedNode.lineageFrom.length}</b></span><span>Library <b>{String(selectedNode.properties.libraryRecordId ?? 'derived')}</b></span></div>
            <section className="inspector-properties"><h4>Design properties</h4>
              {(selectedRecord?.properties ?? []).map((property) => {
                const value = selectedNode.properties[property.key] ?? property.defaultValue ?? '';
                if (property.type === 'boolean') return <label key={property.key} className="property-toggle"><input type="checkbox" checked={Boolean(value)} onChange={(event) => updateNodeProperty(selectedNode.id, property.key, event.target.checked)}/><span><strong>{property.label}</strong><small>{property.description}</small></span></label>;
                if (property.type === 'enum') return <label key={property.key}><span>{property.label}<small>{property.description}</small></span><select value={String(value)} onChange={(event) => updateNodeProperty(selectedNode.id, property.key, event.target.value)}>{property.options?.map((option) => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}</select></label>;
                if (property.type === 'number') return <label key={property.key}><span>{property.label}<small>{property.description}</small></span><input type="number" min={property.min} max={property.max} value={Number(value)} onChange={(event) => updateNodeProperty(selectedNode.id, property.key, Number(event.target.value))}/></label>;
                if (property.type === 'multiline') return <label key={property.key}><span>{property.label}<small>{property.description}</small></span><textarea value={String(value)} onChange={(event) => updateNodeProperty(selectedNode.id, property.key, event.target.value)}/></label>;
                return <label key={property.key}><span>{property.label}<small>{property.description}</small></span><input value={String(value)} onChange={(event) => updateNodeProperty(selectedNode.id, property.key, event.target.value)}/></label>;
              })}
              {!selectedRecord?.properties.length ? <div className="empty-card">This object has no required typed properties. Add project-specific metadata through its canonical model record.</div> : null}
            </section>
            <button className="ai-review-button" onClick={invokeAudit}><Bot size={15}/><span><strong>Review selected scope</strong><small>Run deterministic checks and prepare human-approved AI change proposals.</small></span></button>
          </> : <div className="empty-card"><SlidersHorizontal size={17}/>Select a canvas object to inspect its attributes, accepted styles, patterns and contextual recommendations.</div>}
        </div>
      ) : null}

      {tab === 'styles' ? (
        <div className="pattern-list recommendation-list">
          {contextual.styles.slice(0, 8).map((style, index) => {
            const accepted = project.styleDecisions.some((item) => item.styleId === style.styleId && item.status === 'accepted' && (!item.scopeNodeId || item.scopeNodeId === selectedNodeId));
            return (
              <article key={style.styleId} className={!style.eligible ? 'is-ineligible' : accepted ? 'is-accepted' : ''}>
                <div><strong>#{index + 1} {style.styleName}</strong><span>{style.score.toFixed(1)}</span></div>
                <p>{style.strengths.join(' ') || style.assumptions[0]}</p>
                {style.tradeoffs.length ? <small>Trade-offs: {style.tradeoffs.join(' ')}</small> : null}
                <button disabled={!style.eligible || accepted} onClick={() => acceptStyle(style.styleId)}>
                  {accepted ? 'Accepted' : style.eligible ? 'Accept for scope' : 'Ineligible'} <ChevronRight size={14} />
                </button>
              </article>
            );
          })}
        </div>
      ) : null}

      {tab === 'patterns' ? (
        <div className="pattern-list recommendation-list">
          {contextual.patterns.slice(0, 12).map((pattern) => (
            <article key={pattern.patternId} className={`${pattern.eligible ? '' : 'is-ineligible'} ${pattern.status === 'accepted' ? 'is-accepted' : ''}`}>
              <div><strong>{pattern.patternName}</strong><span>{pattern.score}</span></div>
              <p>{pattern.reasons.join(' ')}</p>
              {pattern.tradeoffs.length ? <small>Consider: {pattern.tradeoffs.join(' ')}</small> : null}
              {pattern.unmetPrerequisites.length ? <small>Requires: {pattern.unmetPrerequisites.join(', ')}</small> : null}
              <div className="recommendation-actions">
                <button disabled={!pattern.eligible} onClick={() => setPatternStatus(pattern.patternId, 'considering')}>Consider</button>
                <button disabled={!pattern.eligible || pattern.status === 'accepted'} onClick={() => setPatternStatus(pattern.patternId, 'accepted')}>{pattern.status === 'accepted' ? 'Accepted' : 'Accept'}</button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === 'decisions' ? (
        <div className="decision-radar-list">
          {contextual.decisions.map((decision) => (
            <article key={decision.id}>
              <div><strong>{decision.title}</strong><span>{decision.priority}</span></div>
              <p>{decision.context}</p>
              <blockquote>{decision.recommendedDecision}</blockquote>
              <small>Options: {decision.consideredOptions.join(' · ')}</small>
              <button onClick={() => recordDecision(decision.id)}>Record as ADR <ChevronRight size={14} /></button>
            </article>
          ))}
          {contextual.decisions.length === 0 ? <div className="empty-card"><Check size={17} /> No new ADR suggestions for this scope.</div> : null}

          {contextual.obligations.length ? (
            <section className="obligation-list">
              <div className="radar-subhead"><ListChecks size={15} /><strong>Selection obligations</strong></div>
              {contextual.obligations.map((item) => (
                <label key={`${item.sourceRecordId}-${item.obligation}`}>
                  <input
                    type="checkbox"
                    checked={item.satisfied}
                    disabled={!project.patternSelections.some((selection) => selection.patternId === item.sourceRecordId)}
                    onChange={() => acknowledgeObligation(item.sourceRecordId, item.obligation)}
                  />
                  <span><strong>{item.sourceName}</strong><small>{item.obligation}</small></span>
                </label>
              ))}
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === 'evidence' ? (
        <div className="pattern-list recommendation-list">
          <article className="is-accepted">
            <div><strong>Knowledge integrity</strong><span>{integrity.summary.averageConfidence}%</span></div>
            <p>{integrity.summary.verified} verified · {integrity.summary.provisional} provisional · {integrity.summary.insufficient} insufficient records.</p>
            <small>Recommendations are deterministic. Evidence confidence describes source coverage and freshness; it is not a guarantee that a design is correct for every context.</small>
          </article>
          {selectedEvidence ? <article>
            <div><strong>{selectedEvidence.recordName}</strong><span>{selectedEvidence.confidence}%</span></div>
            <p>Status: {selectedEvidence.status}. Authority {selectedEvidence.authorityScore}% · freshness {selectedEvidence.freshnessScore}% · coverage {selectedEvidence.coverageScore}%.</p>
            {selectedEvidence.gaps.map((gap) => <small key={gap}>Gap: {gap}</small>)}
            {selectedEvidence.evidenceSourceIds.map((id) => { const source = sourceMap.get(id); return source ? <small key={id}><b>{source.publisher}</b> — {source.title} · authority {source.authorityLevel}/5</small> : <small key={id}>Unresolved source: {id}</small>; })}
          </article> : <div className="empty-card"><DatabaseZap size={17}/>Select a canvas or library object to see its evidence, authority, review date and knowledge gaps.</div>}
        </div>
      ) : null}

      {tab === 'interview' ? (
        <div className="decision-radar-list">
          <article>
            <div><strong>Adaptive design interview</strong><span>{interview.completeness}% complete</span></div>
            <p>AIW asks only questions that reduce material uncertainty in the active design stage.</p>
            {interview.uncertaintyAreas.length ? <small>Uncertainty: {interview.uncertaintyAreas.join(' · ')}</small> : <small>No material unanswered design questions detected.</small>}
          </article>
          {interview.questions.map((question) => <article key={question.id}>
            <div><strong>{question.question}</strong><span>{question.priority}</span></div>
            <p>{question.whyItMatters}</p>
            <small>Creates: {question.creates.join(', ')} · Attributes: {question.linkedQualityAttributes.join(', ') || 'contextual'}</small>
          </article>)}
        </div>
      ) : null}

      {tab === 'risks' ? (
        <div className="pattern-list recommendation-list">
          {antiPatterns.map((finding) => <article key={finding.antiPatternId} className={finding.severity === 'HARD' ? 'is-ineligible' : ''}>
            <div><strong>{finding.name}</strong><span>{finding.confidence}%</span></div>
            <p>{finding.explanation}</p>
            <small>Severity: {finding.severity} · Signals: {finding.signals.join(', ')}</small>
            <small>Mitigate: {finding.mitigations.join(' · ')}</small>
          </article>)}
          {!antiPatterns.length ? <div className="empty-card"><Check size={17}/>No seeded anti-pattern signal is currently above the deterministic detection threshold.</div> : null}
        </div>
      ) : null}
    </aside>
  );
}
