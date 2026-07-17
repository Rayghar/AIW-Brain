import { lazy, Suspense, useMemo, useState } from "react";
import {
  BrainCircuit,
  MessageSquareText,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import type { StageCoAuthorTarget } from "@aiw/domain";
import { StageCoAuthorPanel } from "./StageCoAuthorPanel";
const CoArchitectPanel = lazy(() =>
  import("./CoArchitectPanel").then((module) => ({
    default: module.CoArchitectPanel,
  })),
);

export type SolWorkspaceMode = "draft" | "design" | "ask";

interface SolWorkspaceDrawerProps {
  stageTitle: string;
  stageTarget: StageCoAuthorTarget;
  initialMode?: SolWorkspaceMode;
  designAvailable: boolean;
  draftAvailable?: boolean;
  initialAskPrompt?: string;
  onOpenDesign: () => void;
  onClose: () => void;
}

export function SolWorkspaceDrawer({
  stageTitle,
  stageTarget,
  initialMode,
  designAvailable,
  draftAvailable = true,
  initialAskPrompt,
  onOpenDesign,
  onClose,
}: SolWorkspaceDrawerProps) {
  const modes = useMemo(() => {
    const next: SolWorkspaceMode[] = [];
    if (draftAvailable) next.push("draft");
    if (designAvailable) next.push("design");
    next.push("ask");
    return next;
  }, [designAvailable, draftAvailable]);
  const [mode, setMode] = useState<SolWorkspaceMode>(
    initialMode && modes.includes(initialMode)
      ? initialMode
      : (modes[0] ?? "ask"),
  );

  return (
    <div className="sol-workspace-layer" role="presentation">
      <button
        type="button"
        className="sol-workspace-backdrop"
        aria-label="Close Sol"
        onClick={onClose}
      />
      <aside
        className="sol-workspace"
        role="dialog"
        aria-modal="true"
        aria-label={`Sol for ${stageTitle}`}
      >
        <header className="sol-workspace__header">
          <div className="sol-workspace__identity">
            <span>
              <BrainCircuit size={18} />
            </span>
            <div>
              <strong>Sol</strong>
              <small>{stageTitle}</small>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close Sol"
          >
            <X size={17} />
          </button>
        </header>

        <nav className="sol-workspace__modes" aria-label="Sol modes">
          {modes.includes("draft") ? (
            <button
              type="button"
              className={mode === "draft" ? "is-active" : ""}
              onClick={() => setMode("draft")}
            >
              <Sparkles size={14} />
              <span>
                <strong>Draft</strong>
                <small>Fill or improve structured stage information</small>
              </span>
            </button>
          ) : null}
          {modes.includes("design") ? (
            <button
              type="button"
              className={mode === "design" ? "is-active" : ""}
              onClick={() => setMode("design")}
            >
              <WandSparkles size={14} />
              <span>
                <strong>Design</strong>
                <small>Propose the next governed model change</small>
              </span>
            </button>
          ) : null}
          <button
            type="button"
            className={mode === "ask" ? "is-active" : ""}
            onClick={() => setMode("ask")}
          >
            <MessageSquareText size={14} />
            <span>
              <strong>Ask</strong>
              <small>Explain, challenge or compare</small>
            </span>
          </button>
        </nav>

        <div className="sol-workspace__body">
          {mode === "draft" ? (
            <StageCoAuthorPanel targetStage={stageTarget} variant="workspace" />
          ) : null}
          {mode === "design" ? (
            <section className="sol-design-launch">
              <span className="sol-design-launch__icon">
                <WandSparkles size={22} />
              </span>
              <div>
                <h3>Continue with Sol directly on the canvas</h3>
                <p>
                  Sol Design uses the selected scope, accepted requirements,
                  quality drivers, journeys, Pattern DNA and current model
                  revision to propose a reviewable topology. No change is
                  written until you accept it.
                </p>
                <ul>
                  <li>
                    Preview objects, relationships and interfaces in place.
                  </li>
                  <li>Inspect the requirement, tactic and pattern evidence.</li>
                  <li>
                    Accept, defer or reject the proposal as one reversible
                    change.
                  </li>
                </ul>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => {
                    onOpenDesign();
                    onClose();
                  }}
                >
                  <WandSparkles size={15} /> Open Sol Design on canvas
                </button>
              </div>
            </section>
          ) : null}
          {mode === "ask" ? (
            <Suspense
              fallback={
                <div className="sol-workspace__loading">
                  Preparing Sol context…
                </div>
              }
            >
              <CoArchitectPanel
                embedded
                onClose={onClose}
                {...(initialAskPrompt ? { initialPrompt: initialAskPrompt } : {})}
              />
            </Suspense>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
