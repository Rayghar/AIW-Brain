import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleGauge,
  Eye,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useWorkspaceStore } from "../store/workspaceStore";

export function EmbeddedIntelligencePanel() {
  const [expanded, setExpanded] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const intelligence = useWorkspaceStore((state) => state.intelligence);
  const recordOutcome = useWorkspaceStore(
    (state) => state.recordIntelligenceOutcome,
  );
  if (!intelligence) return null;

  const significant = intelligence.findings.filter(
    (finding) => finding.severity === "SIGNIFICANT",
  );
  const scoped = intelligence.context.selectionId
    ? `Selected scope · ${intelligence.context.selectionId}`
    : `View scope · ${intelligence.context.stage}`;
  const firstAction = intelligence.nextBestActions[0];

  return (
    <aside
      className={`embedded-intelligence ${expanded ? "is-expanded" : "is-compact"}`}
      aria-label="AIW contextual intelligence"
    >
      <button
        className="embedded-intelligence__compact-toggle"
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className="embedded-intelligence__pulse">
          <Sparkles size={15} />
        </span>
        <span className="embedded-intelligence__summary">
          <strong>AIW brain is watching this workspace</strong>
          <small>
            {firstAction?.title ?? "No immediate intervention"} ·{" "}
            {intelligence.findings.length} critique signals · {scoped}
          </small>
        </span>
        <span
          className={`intelligence-health intelligence-health--${intelligence.health.level}`}
        >
          <CircleGauge size={14} />
          <strong>{intelligence.health.score}</strong>
          <span>{intelligence.health.level}</span>
        </span>
        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {expanded ? (
        <div className="embedded-intelligence__body">
          <header className="embedded-intelligence__header">
            <div>
              <span className="eyebrow">AIW brain</span>
              <h3>Quiet co-authoring signals</h3>
              <small>{scoped}</small>
            </div>
          </header>

          <section className="intelligence-section">
            <div className="intelligence-section__title">
              <Sparkles size={14} />
              <strong>Next best actions</strong>
              <span>{intelligence.nextBestActions.length}</span>
            </div>
            <div className="intelligence-action-list">
              {intelligence.nextBestActions.slice(0, 3).map((action, index) => (
                <article
                  key={action.id}
                  className={index === 0 ? "is-primary" : ""}
                >
                  <div className="intelligence-action-rank">{index + 1}</div>
                  <div>
                    <strong>{action.title}</strong>
                    <p>{action.detail}</p>
                    <small>{action.why}</small>
                    <div className="intelligence-action-controls">
                      <button
                        onClick={() => recordOutcome(action.kind, "accepted")}
                        title="Keep this action prominent"
                      >
                        <CheckCircle2 size={12} /> Useful
                      </button>
                      <button
                        onClick={() => recordOutcome(action.kind, "dismissed")}
                        title="Demote similar guidance"
                      >
                        <X size={12} /> Dismiss
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="intelligence-section">
            <div className="intelligence-section__title">
              <AlertTriangle size={14} />
              <strong>Continuous critique</strong>
              <span>{intelligence.findings.length}</span>
            </div>
            {intelligence.findings.length ? (
              <div className="intelligence-finding-list">
                {intelligence.findings.slice(0, 3).map((finding, index) => (
                  <article
                    key={`${finding.title}-${index}`}
                    className={
                      finding.severity === "SIGNIFICANT" ? "significant" : ""
                    }
                  >
                    <header>
                      <span>{finding.severity}</span>
                      <small>{finding.origin.replaceAll("-", " ")}</small>
                    </header>
                    <strong>{finding.title}</strong>
                    <p>{finding.detail}</p>
                    {finding.affectedIds.length ? (
                      <small>Affects: {finding.affectedIds.join(", ")}</small>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="intelligence-empty">
                <ShieldCheck size={15} /> No active critique for this scope.
              </div>
            )}
          </section>

          {intelligence.missingAttributes.length ? (
            <section className="intelligence-section">
              <div className="intelligence-section__title">
                <Lightbulb size={14} />
                <strong>Missing semantics</strong>
                <span>{intelligence.missingAttributes.length}</span>
              </div>
              <ul className="intelligence-question-list">
                {intelligence.missingAttributes.slice(0, 3).map((item) => (
                  <li key={`${item.subjectId}-${item.attribute}`}>
                    <b>{item.attribute}</b>
                    <span>{item.question}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="intelligence-evidence">
            <button
              onClick={() => setShowTrace((value) => !value)}
              aria-expanded={showTrace}
            >
              <Eye size={14} />
              <span>
                <strong>Evidence & intelligence trace</strong>
                <small>
                  {intelligence.evidence.knowledgeReleaseId} ·{" "}
                  {intelligence.evidence.kbRefs.length} references
                </small>
              </span>
              {showTrace ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showTrace ? (
              <div className="intelligence-trace">
                <p>
                  <b>Why now:</b> {intelligence.explanation.whyNow}
                </p>
                <p>
                  <b>Why here:</b> {intelligence.explanation.whyHere}
                </p>
                <p>
                  <b>If ignored:</b> {intelligence.explanation.ifIgnored}
                </p>
                <div>
                  <b>Rules:</b>
                  {intelligence.trace.rulesFired.map((rule) => (
                    <code key={rule}>{rule}</code>
                  ))}
                </div>
                <div>
                  <b>Knowledge:</b>
                  {intelligence.evidence.kbRefs.slice(0, 8).map((ref) => (
                    <code key={ref}>{ref}</code>
                  ))}
                </div>
                <small>
                  Candidate knowledge used: no · Confidence:{" "}
                  {intelligence.confidence} · Trace {intelligence.trace.id}
                </small>
              </div>
            ) : null}
          </section>

          {significant.length ? (
            <div className="intelligence-alert">
              <AlertTriangle size={14} />
              {significant.length} significant concern(s) should be resolved
              before approval.
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
