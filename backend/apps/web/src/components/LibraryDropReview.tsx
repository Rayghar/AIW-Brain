import { AlertTriangle, CheckCircle2, Layers3, ShieldX, Sparkles, X } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';

export function LibraryDropReview() {
  const preview = useWorkspaceStore((state) => state.pendingLibraryDrop);
  const commit = useWorkspaceStore((state) => state.commitLibraryDrop);
  const cancel = useWorkspaceStore((state) => state.cancelLibraryDrop);
  if (!preview) return null;
  const Icon = preview.disposition === 'blocked' ? ShieldX : preview.disposition === 'warning' ? AlertTriangle : CheckCircle2;
  return <div className="drop-review-backdrop" role="dialog" aria-modal="true" aria-label="Review architecture placement">
    <section className={`drop-review drop-review--${preview.disposition}`}>
      <header><span><Icon size={20}/></span><div><small>Semantic drop preflight</small><h3>{preview.title}</h3></div><button onClick={cancel}><X size={17}/></button></header>
      <p>{preview.explanation}</p>
      <div className="drop-review-summary">
        <span><Layers3 size={15}/><b>{preview.record.recordType}</b><small>{preview.record.category}</small></span>
        <span><Sparkles size={15}/><b>{preview.nodes.length}</b><small>objects to create</small></span>
        <span><AlertTriangle size={15}/><b>{preview.obligations.length}</b><small>design obligations</small></span>
      </div>
      {preview.nodes.length ? <div className="drop-topology-preview">{preview.nodes.map((node, index) => <div key={node.id} style={{ marginLeft: index ? 22 : 0 }}><strong>{node.label}</strong><small>{node.kind}</small></div>)}</div> : null}
      {preview.findings.length ? <section className="drop-review-findings"><h4>Preflight findings</h4>{preview.findings.map((finding, index) => <article key={`${finding.title}-${index}`} className={finding.severity.toLowerCase()}><strong>{finding.title}</strong><span>{finding.severity}</span><p>{finding.message}</p></article>)}</section> : null}
      {preview.obligations.length ? <section><h4>Obligations created by this choice</h4><ul>{preview.obligations.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
      <footer><button className="button button--secondary" onClick={cancel}>Cancel</button><button className="button" disabled={preview.disposition === 'blocked'} onClick={commit}>{preview.disposition === 'warning' ? 'Accept trade-offs & apply' : 'Apply to architecture'}</button></footer>
    </section>
  </div>;
}
