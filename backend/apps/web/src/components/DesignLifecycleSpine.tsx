import { useMemo, useState } from "react";
import { CheckCircle2, Circle, AlertTriangle, ArrowRight, FileCheck2, ChevronDown } from "lucide-react";
import { assessStageReadiness } from "@aiw/engine";
import { useWorkspaceStore } from "../store/workspaceStore";
import { DESIGN_LIFECYCLE, STAGE_ORDER, nextStageOf } from "../lib/designLifecycle";

// =============================================================================
// DESIGN LIFECYCLE SPINE — the product vision, rendered. For the active stage:
// what it's for, what to complete (COMPUTED, not vibes), how AIW helps, what
// artifacts it yields, and the handoff: request approval → (governed decision)
// → push to the next stage. Completion comes from assessStageReadiness;
// approval from the EXISTING requestStageApproval/decideStageApproval flow.
// The spine projects and orchestrates; it judges nothing itself.
// =============================================================================

export function DesignLifecycleSpine() {
  const project = useWorkspaceStore((s) => s.project);
  const findings = useWorkspaceStore((s) => s.findings);
  const setActiveStage = useWorkspaceStore((s) => s.setActiveStage);
  const requestStageApproval = useWorkspaceStore((s) => s.requestStageApproval);
  const decideStageApproval = useWorkspaceStore((s) => s.decideStageApproval);
  const [expanded, setExpanded] = useState(true);

  const readiness = useMemo(
    () => assessStageReadiness(project, STAGE_ORDER, (findings ?? []) as never),
    [project, findings],
  );
  const guide = DESIGN_LIFECYCLE.find((g) => g.stage === project.activeStage);
  if (!guide) return null;

  const stageReadiness = readiness.find((r) => r.stage === guide.stage);
  const approvals = project.stageApprovals ?? [];
  const latestApproval = [...approvals].reverse().find((a) => a.stage === guide.stage);
  const approved = latestApproval?.status === "approved";
  const pending = latestApproval?.status === "pending";
  const next = nextStageOf(guide.stage);
  const nextGuide = next ? DESIGN_LIFECYCLE.find((g) => g.stage === next) : null;
  const isTerminal = !next;

  return (
    <section className="dl-spine" aria-label="Design lifecycle">
      {/* The journey strip: all six steps, statuses computed */}
      <div className="dl-spine__strip" role="list">
        {DESIGN_LIFECYCLE.map((g) => {
          const r = readiness.find((x) => x.stage === g.stage);
          const gApproved = [...approvals].reverse().find((a) => a.stage === g.stage)?.status === "approved";
          const active = g.stage === project.activeStage;
          return (
            <button
              key={g.stage} role="listitem" type="button"
              className={`dl-step${active ? " dl-step--active" : ""}${gApproved ? " dl-step--approved" : ""}`}
              onClick={() => setActiveStage(g.stage)}
              title={`${g.title} — ${r?.percent ?? 0}% · ${r?.status ?? "not-started"}${gApproved ? " · approved" : ""}`}
            >
              {gApproved ? <CheckCircle2 size={13} aria-hidden /> : <Circle size={13} aria-hidden />}
              <span>{g.step}. {g.title}</span>
              <i className="dl-step__bar"><b style={{ width: `${r?.percent ?? 0}%` }} /></i>
            </button>
          );
        })}
      </div>

      {/* The active stage card: purpose, checklist, artifacts, handoff */}
      <div className="dl-card">
        <button type="button" className="dl-card__head" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          <div>
            <span className="dl-card__eyebrow">Stage {guide.step} of {DESIGN_LIFECYCLE.length}</span>
            <strong>{guide.title}</strong>
            <p>{guide.purpose}</p>
          </div>
          <ChevronDown size={15} className={expanded ? "dl-chev--open" : ""} aria-hidden />
        </button>

        {expanded ? (
          <div className="dl-card__body">
            <div className="dl-col">
              <h4>Complete this stage</h4>
              <ul className="dl-checks">
                {(stageReadiness?.checks ?? []).map((c) => (
                  <li key={c.label} className={c.done ? "done" : ""}>
                    {c.done ? <CheckCircle2 size={13} aria-hidden /> : <Circle size={13} aria-hidden />}
                    {c.label}
                  </li>
                ))}
              </ul>
              {stageReadiness?.status === "review-required" ? (
                <p className="dl-warn"><AlertTriangle size={12} aria-hidden /> {stageReadiness.reason}</p>
              ) : null}
            </div>
            <div className="dl-col">
              <h4>AIW helps here</h4>
              <ul className="dl-plain">{guide.aiwHelps.map((h) => <li key={h}>{h}</li>)}</ul>
            </div>
            <div className="dl-col">
              <h4>This stage produces</h4>
              <ul className="dl-plain">{guide.artifacts.map((a) => <li key={a}>{a}</li>)}</ul>
            </div>
          </div>
        ) : null}

        <footer className="dl-card__foot">
          {approved && next ? (
            <button type="button" className="dl-cta dl-cta--advance" onClick={() => setActiveStage(next)}>
              Approved — push to {nextGuide?.title} <ArrowRight size={14} aria-hidden />
            </button>
          ) : pending ? (
            <div className="dl-pending">
              <span>Approval requested{latestApproval?.requestedBy ? ` by ${latestApproval.requestedBy}` : ""} — decide in Governance, or</span>
              <button type="button" onClick={() => latestApproval && decideStageApproval(latestApproval.id, "approved", "Architecture author", "Self-approved at stage handoff (recorded)")}>
                record approval yourself
              </button>
            </div>
          ) : isTerminal ? (
            <button type="button" className="dl-cta dl-cta--sdd" onClick={() => requestStageApproval(guide.stage)}>
              <FileCheck2 size={14} aria-hidden /> Complete review → approve architecture &amp; generate the SDD pack (in this stage's Review Studio)
            </button>
          ) : (
            <button type="button" className="dl-cta" onClick={() => requestStageApproval(guide.stage)}>
              {guide.handoff} {stageReadiness?.status !== "ready" ? " (gaps will be recorded)" : ""}
            </button>
          )}
          <span className="dl-foot-note">
            Handoffs are governed approvals, not one-way doors — any stage can be reopened from the strip; every approval and gap is recorded.
          </span>
        </footer>
      </div>
    </section>
  );
}
