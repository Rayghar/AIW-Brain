import { useMemo, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, Download, GitMerge, History, ScanSearch, XCircle } from 'lucide-react';
import type { ArtifactBundle } from '@aiw/domain';
import { useWorkspaceStore } from '../store/workspaceStore';
import { DesignGuide } from './DesignGuide';
import { FullJourneyIntelligenceSurface } from './WorkspaceIntelligenceMap';
import { RecommendationConfidenceDisclosure } from './RecommendationConfidenceDisclosure';
import { RecommendationOutcomeCapture } from './RecommendationOutcomeCapture';

function downloadText(path: string, content: string, mediaType: string) {
  const blob = new Blob([content], { type: mediaType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = path.split('/').pop() ?? 'artifact.txt';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReviewWorkspace() {
  const project = useWorkspaceStore((state) => state.project);
  const library = useWorkspaceStore((state) => state.library);
  const recommendations = useWorkspaceStore((state) => state.recommendations);
  const contextual = useWorkspaceStore((state) => state.contextual);
  const findings = useWorkspaceStore((state) => state.findings);
  const audit = useWorkspaceStore((state) => state.audit);
  const validate = useWorkspaceStore((state) => state.validate);
  const invokeAudit = useWorkspaceStore((state) => state.invokeAudit);
  const aiAuditStatus = useWorkspaceStore((state) => state.aiAuditStatus);
  const toggleProposal = useWorkspaceStore((state) => state.toggleProposal);
  const acceptSelected = useWorkspaceStore((state) => state.acceptSelectedProposals);
  const discardAudit = useWorkspaceStore((state) => state.discardAudit);
  const snapshots = useWorkspaceStore((state) => state.snapshots);
  const createSnapshot = useWorkspaceStore((state) => state.createSnapshot);
  const restoreSnapshot = useWorkspaceStore((state) => state.restoreSnapshot);
  const [artifactBundle, setArtifactBundle] = useState<ArtifactBundle | null>(null);
  const [artifactBusy, setArtifactBusy] = useState(false);

  const generateReviewOutputs = async () => {
    setArtifactBusy(true);
    try {
      const { compileArtifacts } = await import('@aiw/artifacts');
      setArtifactBundle(compileArtifacts({ ...project, findings }, library, recommendations));
    } finally {
      setArtifactBusy(false);
    }
  };

  return (
    <section className="studio-page review-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Stage 5</span>
          <h2>Validation, Decisions & Realization</h2>
          <p>Review deterministic findings, invoke a checkpoint audit, selectively merge proposals and export the architecture package.</p>
        </div>
        <div className={`health-score ${audit && audit.healthScore < 70 ? 'is-risk' : ''}`}>
          <span>Health</span><strong>{audit?.healthScore ?? Math.max(0, 100 - findings.length * 8)}</strong>
        </div>
      </div>

      <DesignGuide placement="review" />

      <FullJourneyIntelligenceSurface />

      <div className="review-actions">
        <button className="button button--secondary" onClick={validate}><ScanSearch size={16} /> Run deterministic validation</button>
        <button className="button button--primary" disabled={aiAuditStatus === 'connecting'} onClick={() => void invokeAudit()}><GitMerge size={16} /> {aiAuditStatus === 'connecting' ? 'Connecting to co-architect…' : 'Invoke AI co-architect audit'}</button>
      </div>

      <div className="review-grid">
        <div className="review-column">
          <h3>Style recommendations</h3>
          {recommendations.slice(0, 5).map((item, index) => (
            <article className="recommendation-card" key={item.styleId}>
              <div className="recommendation-card__head"><span>#{index + 1}</span><strong>{item.styleName}</strong><b>{item.score.toFixed(1)}</b></div>
              <div className="recommendation-bars"><i style={{ width: `${item.score}%` }} /></div>
              <p>{item.strengths.join(' ') || item.assumptions[0]}</p>
              {item.tradeoffs.length ? <small>Trade-offs: {item.tradeoffs.join(' ')}</small> : null}
              <RecommendationConfidenceDisclosure recommendation={item} compact />
              <RecommendationOutcomeCapture recommendation={item} />
            </article>
          ))}
        </div>

        <div className="review-column">
          <h3>Architecture findings</h3>
          {findings.length === 0 ? <div className="empty-card"><CheckCircle2 size={18} /> No deterministic findings.</div> : findings.map((finding) => (
            <article className={`finding-card severity-${finding.severity.toLowerCase()}`} key={finding.id}>
              <div><AlertTriangle size={17} /><strong>{finding.title}</strong><span>{finding.severity}</span></div>
              <p>{finding.message}</p>
              <small>{finding.rationale}</small>
            </article>
          ))}
        </div>
      </div>

      {audit ? (
        <section className="audit-section">
          <div className="audit-header">
            <div><span className="eyebrow">Reversible change set</span><h3>{audit.summary}</h3></div>
            <span className="status-pill">{audit.source}{audit.modelTrace ? ` · ${audit.modelTrace.providerId}/${audit.modelTrace.model}` : ''}</span>
          </div>
          <div className="proposal-list">
            {audit.proposals.map((proposal) => (
              <label className="proposal-card" key={proposal.id}>
                <input type="checkbox" checked={proposal.selected} onChange={() => toggleProposal(proposal.id)} />
                <div>
                  <div><strong>{proposal.title}</strong><span>{proposal.severity}</span></div>
                  <p>{proposal.rationale}</p>
                  <small>{proposal.operations.map((operation) => operation.type).join(', ')}</small>
                </div>
              </label>
            ))}
          </div>
          <div className="audit-actions">
            <button className="button button--danger" onClick={discardAudit}><XCircle size={16} /> Discard proposals</button>
            <button className="button button--primary" onClick={acceptSelected}><CheckCircle2 size={16} /> Accept selected & merge</button>
          </div>
        </section>
      ) : null}

      <section className="artifact-section artifact-section--deferred">
        <div>
          <span className="eyebrow">On-demand package</span>
          <h3>Reviewable outputs</h3>
          <p>Artifact generation is loaded only when needed so normal review remains fast. The package still comes from one canonical graph.</p>
          <button className="button button--primary" disabled={artifactBusy} onClick={() => void generateReviewOutputs()}>
            <Download size={15} /> {artifactBusy ? 'Generating outputs…' : artifactBundle ? 'Refresh review outputs' : 'Generate review outputs'}
          </button>
        </div>
        <div className="artifact-list">
          {artifactBundle ? artifactBundle.files.map((file) => (
            <button key={file.path} onClick={() => downloadText(file.path, file.content, file.mediaType)}>
              <Download size={15} /><span>{file.path}</span><small>{file.mediaType}</small>
            </button>
          )) : <div className="empty-card"><Download size={16} /> Outputs are generated on demand to keep the review workspace light.</div>}
        </div>
      </section>

      <section className="snapshot-section">
        <div className="snapshot-heading">
          <div><span className="eyebrow">Immutable local history</span><h3>Architecture snapshots</h3><p>Capture a reviewed point-in-time baseline before accepting major recommendations or revisiting upstream decisions.</p></div>
          <button className="button button--secondary" onClick={() => createSnapshot(`Review revision ${project.revision}`, 'reviewed')}><Camera size={16} /> Create reviewed snapshot</button>
        </div>
        <div className="snapshot-list">
          {snapshots.length === 0 ? <div className="empty-card"><History size={17} /> No snapshots have been created.</div> : snapshots.map((snapshot) => (
            <article key={snapshot.id}>
              <div><strong>{snapshot.label}</strong><span>{snapshot.status}</span></div>
              <p>Revision {snapshot.revision} · {new Date(snapshot.createdAt).toLocaleString()}</p>
              <small>{snapshot.contentHash}</small>
              <button onClick={() => restoreSnapshot(snapshot.id)}>Restore as new revision</button>
            </article>
          ))}
        </div>
      </section>

      <section className="selection-summary-section">
        <div><span className="eyebrow">Continuous recommendations</span><h3>Current selection posture</h3></div>
        <div className="selection-summary-grid">
          <article><strong>{project.styleDecisions.filter((item) => item.status === 'accepted').length}</strong><span>Accepted styles</span></article>
          <article><strong>{project.patternSelections.filter((item) => item.status === 'accepted').length}</strong><span>Accepted patterns</span></article>
          <article><strong>{project.decisions.filter((item) => item.status === 'accepted').length}</strong><span>Recorded ADRs</span></article>
          <article><strong>{contextual.obligations.filter((item) => !item.satisfied).length}</strong><span>Open obligations</span></article>
        </div>
      </section>
    </section>
  );
}
