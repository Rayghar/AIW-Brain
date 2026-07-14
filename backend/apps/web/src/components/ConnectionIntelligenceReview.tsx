import { AlertTriangle, ArrowRight, CheckCircle2, Link2, ShieldCheck, X } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';

export function ConnectionIntelligenceReview() {
  const pending = useWorkspaceStore((state) => state.pendingConnectionReview);
  const project = useWorkspaceStore((state) => state.project);
  const setKind = useWorkspaceStore((state) => state.setPendingConnectionKind);
  const setSemantics = useWorkspaceStore((state) => state.setPendingConnectionSemantics);
  const semantics = ((pending ?? {}) as { semantics?: Record<string, string> }).semantics ?? {};
  const classifications = (project.context as { dataClassifications?: string[] }).dataClassifications ?? [];
  const intermediaries = ((pending?.intelligence ?? {}) as { intermediaries?: Array<{ patternId: string; why: string }> }).intermediaries ?? [];
  const commit = useWorkspaceStore((state) => state.commitPendingConnection);
  const cancel = useWorkspaceStore((state) => state.cancelPendingConnection);
  if (!pending) return null;

  const source = project.nodes.find((node) => node.id === pending.sourceId);
  const target = project.nodes.find((node) => node.id === pending.targetId);
  const response = pending.intelligence;

  return (
    <div className="connection-review-backdrop" role="presentation" onClick={cancel}>
      <section className="connection-review" role="dialog" aria-modal="true" aria-labelledby="connection-review-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">Intelligent connection review</span>
            <h3 id="connection-review-title">Define interaction semantics before connecting</h3>
          </div>
          <button onClick={cancel} aria-label="Cancel connection review"><X size={18}/></button>
        </header>

        <div className="connection-review__route">
          <span><strong>{source?.label ?? pending.sourceId}</strong><small>{source?.kind}</small></span>
          <ArrowRight size={20}/>
          <span><strong>{target?.label ?? pending.targetId}</strong><small>{target?.kind}</small></span>
        </div>

        <section>
          <h4><Link2 size={14}/> Recommended relationship semantics</h4>
          <div className="connection-option-grid">
            {response.suggestedRelationships.map((option) => (
              <label key={`${option.relationType}-${option.label}`} className={pending.selectedKind === option.relationType ? 'selected' : ''}>
                <input type="radio" name="relationship-kind" checked={pending.selectedKind === option.relationType} onChange={() => setKind(option.relationType)}/>
                <span>
                  <strong>{option.label}{option.recommended ? <em>Recommended</em> : null}</strong>
                  <small>{option.rationale}</small>
                  {option.kbRefs.length ? <code>{option.kbRefs.join(' · ')}</code> : null}
                </span>
              </label>
            ))}
          </div>
        </section>

        <details className="workbench-disclosure connection-semantics" open>
          <summary>Interaction semantics — captured onto the relationship</summary>
          <div className="connection-semantics__grid">
            <label><span>Interaction</span>
              <select value={semantics.interaction ?? ''} onChange={(e) => setSemantics({ interaction: e.target.value })}>
                <option value="">—</option><option value="command">Command</option><option value="query">Query</option><option value="event">Event</option>
              </select></label>
            <label><span>Delivery</span>
              <select value={semantics.syncAsync ?? ''} onChange={(e) => setSemantics({ syncAsync: e.target.value })}>
                <option value="">—</option><option value="synchronous">Synchronous</option><option value="asynchronous">Asynchronous</option>
              </select></label>
            <label><span>Protocol</span>
              <input value={semantics.protocol ?? ''} placeholder="e.g. HTTPS/REST, gRPC, AMQP" onChange={(e) => setSemantics({ protocol: e.target.value })} /></label>
            <label><span>Latency expectation</span>
              <input value={semantics.latencyExpectation ?? ''} placeholder="e.g. p99 < 300ms" onChange={(e) => setSemantics({ latencyExpectation: e.target.value })} /></label>
            <label><span>Availability expectation</span>
              <input value={semantics.availabilityExpectation ?? ''} placeholder="e.g. 99.9%" onChange={(e) => setSemantics({ availabilityExpectation: e.target.value })} /></label>
            <label><span>Data classification</span>
              <select value={semantics.dataClassification ?? ''} onChange={(e) => setSemantics({ dataClassification: e.target.value })}>
                <option value="">—</option>{classifications.map((c) => <option key={c} value={c}>{c}</option>)}<option value="public">public</option>
              </select></label>
          </div>
        </details>

        {intermediaries.length ? (
          <details className="workbench-disclosure connection-intermediaries" open>
            <summary>Recommended intermediaries for this route</summary>
            <ul className="connection-intermediaries__list">
              {intermediaries.map((item) => <li key={item.patternId}><code>{item.patternId}</code><span>{item.why}</span></li>)}
            </ul>
          </details>
        ) : null}

        <div className="connection-review__analysis">
          <section>
            <h4><AlertTriangle size={14}/> Critique</h4>
            {response.findings.length ? response.findings.map((finding, index) => (
              <article key={`${finding.title}-${index}`}>
                <strong>{finding.title}</strong>
                <p>{finding.detail}</p>
                <small>{finding.origin.replaceAll('-', ' ')}</small>
              </article>
            )) : <p className="connection-review__empty"><ShieldCheck size={14}/> No structural concern detected.</p>}
          </section>
          <section>
            <h4><CheckCircle2 size={14}/> Attributes to complete</h4>
            <ul>{response.missingAttributes.map((item) => <li key={`${item.attribute}-${item.subjectId}`}><b>{item.attribute}</b><span>{item.question}</span></li>)}</ul>
          </section>
        </div>

        <section className="connection-review__evidence">
          <strong>Grounded in {response.evidence.knowledgeReleaseId}</strong>
          <span>{response.evidence.kbRefs.slice(0, 10).join(' · ') || 'Deterministic semantic rules'}</span>
          <small>{response.explanation.ifIgnored}</small>
        </section>

        <footer>
          <button className="button button--secondary" onClick={cancel}>Cancel</button>
          <button className="button" onClick={commit}>Apply reviewed connection</button>
        </footer>
      </section>
    </div>
  );
}
