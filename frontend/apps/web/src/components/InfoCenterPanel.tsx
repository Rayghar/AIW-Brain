import { useState } from "react";
import { AlertTriangle, BrainCircuit, CheckCircle2, FileText, Maximize2, Minimize2, ShieldCheck, Sparkles, X } from "lucide-react";
import { useWorkspaceStore } from "../store/workspaceStore";

interface InfoCenterPanelProps {
  open: boolean;
  onClose: () => void;
  onOpenCoArchitect: (prompt: string) => void;
  onOpenDecisionRadar: () => void;
}

export function InfoCenterPanel({ open, onClose, onOpenCoArchitect, onOpenDecisionRadar }: InfoCenterPanelProps) {
  const project = useWorkspaceStore((state) => state.project);
  const contextual = useWorkspaceStore((state) => state.contextual);
  const findings = useWorkspaceStore((state) => state.findings);
  const intelligence = useWorkspaceStore((state) => state.intelligence);
  const library = useWorkspaceStore((state) => state.library);
  const [compact, setCompact] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("aiw.infoCenter.mode") !== "full";
  });
  const setInfoCenterCompact = (value: boolean) => {
    setCompact(value);
    if (typeof window !== "undefined") window.localStorage.setItem("aiw.infoCenter.mode", value ? "compact" : "full");
  };
  const openObligations = contextual.obligations.filter((item) => !item.satisfied);
  const highConfidence = contextual.patterns.filter((item) => item.score >= 70);
  const activeFindings = findings.slice(0, compact ? 2 : 3);
  const nextAction = intelligence?.nextBestActions?.[0] as { title?: string; label?: string; description?: string } | undefined;

  return (
    <aside className={`info-center ${open ? "is-open" : ""} ${compact ? "info-center--compact" : "info-center--full"}`} aria-hidden={!open} aria-label="AIW information center">
      <header>
        <div>
          <span className="eyebrow"><BrainCircuit size={13} /> AIW Info Center</span>
          <h2>{compact ? "Priority guidance" : "Guidance, observations and evidence"}</h2>
          <p className="info-center-mode-note">{compact ? "Compact mode shows only what needs action now." : "Full mode shows deterministic, knowledge-backed and assisted reasoning."}</p>
        </div>
        <div className="info-center-header-actions">
          <button type="button" className="icon-button" onClick={() => setInfoCenterCompact(!compact)} aria-label={compact ? "Expand information center" : "Compact information center"} title={compact ? "Expand to full detail" : "Return to compact mode"}>
            {compact ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close information center"><X size={16} /></button>
        </div>
      </header>
      <section className="info-center-summary">
        <article title="Architecture health comes from the deterministic AIW kernel.">
          <ShieldCheck size={17} />
          <span><strong>{intelligence?.health?.score ?? 0}%</strong><small>health</small></span>
        </article>
        <article title="Pattern signals are evidence-backed recommendations for the current stage.">
          <Sparkles size={17} />
          <span><strong>{contextual.patterns.length}</strong><small>signals</small></span>
        </article>
        <article title="Open obligations are policy, pattern or governance items that still need attention.">
          <AlertTriangle size={17} />
          <span><strong>{openObligations.length}</strong><small>obligations</small></span>
        </article>
      </section>

      <section className="info-center-section info-center-section--priority">
        <h3>Recommended next move</h3>
        <p>{nextAction?.title ?? nextAction?.label ?? nextAction?.description ?? "Continue the guided lifecycle and complete the current stage gate."}</p>
        <div className="info-center-actions">
          <button type="button" onClick={() => onOpenCoArchitect(`Guide me through the next best action for ${project.name}. Keep the response practical and stage-specific.`)}><BrainCircuit size={14} /> Ask AIW</button>
          <button type="button" onClick={onOpenDecisionRadar}><Sparkles size={14} /> Decision Radar</button>
        </div>
      </section>

      <section className="info-center-section">
        <h3>Attention items</h3>
        {activeFindings.length ? activeFindings.map((finding) => (
          <article key={finding.id} className="info-center-item">
            <AlertTriangle size={14} />
            <span><strong>{finding.title}</strong><small>{(finding as any).description ?? (finding as any).message ?? (finding as any).rationale ?? "Review this item before handoff."}</small></span>
          </article>
        )) : <p>No open critical finding on this screen.</p>}
      </section>

      {compact ? (
        <button type="button" className="info-center-expand-row" onClick={() => setInfoCenterCompact(false)}>
          <Maximize2 size={14} /> Show observations, evidence and provenance
        </button>
      ) : (
        <>
          <section className="info-center-section">
            <h3>Design observations</h3>
            {highConfidence.length ? highConfidence.slice(0, 4).map((pattern) => (
              <article key={pattern.patternId} className="info-center-item">
                <CheckCircle2 size={14} />
                <span><strong>{pattern.patternName}</strong><small>{pattern.score}% fit · review before applying</small></span>
              </article>
            )) : <p>No high-confidence pattern signal yet. Complete the brief and quality drivers to improve recommendations.</p>}
          </section>

          <section className="info-center-section info-center-section--evidence">
            <h3>Evidence source</h3>
            <article className="info-center-item">
              <FileText size={14} />
              <span><strong>{library.knowledgeReleaseId ?? "Active knowledge release"}</strong><small>Deterministic kernel, approved project model and governed records.</small></span>
            </article>
          </section>
        </>
      )}
    </aside>
  );
}
