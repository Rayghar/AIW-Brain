import { useEffect, useState } from "react";
import { ArrowRight, BrainCircuit, CheckCircle2, ChevronDown, ChevronUp, ListChecks, Maximize2, Minimize2, UserCog } from "lucide-react";

const DOCK_MINIMIZED_KEY = "aiw.bottomDock.rc10_49.minimized";

export function BottomDock(props: any) {
  const {
    workspaceMode,
    activeStageLabel,
    workspaceLabel,
    t,
    currentWorkspaceCaption,
    activeRoleJourney,
    contextual,
    openObligations,
    setInfoCenterOpen,
    enterStage,
    nextStage,
    lifecycleNextLabel,
    advanceLifecycle,
  } = props;

  const [minimized, setMinimized] = useState(() => localStorage.getItem(DOCK_MINIMIZED_KEY) !== "false");

  useEffect(() => {
    const autoMinimizeForCanvas = () => {
      localStorage.setItem(DOCK_MINIMIZED_KEY, "true");
      setMinimized(true);
    };
    window.addEventListener("aiw:canvas-focus-start", autoMinimizeForCanvas);
    return () => window.removeEventListener("aiw:canvas-focus-start", autoMinimizeForCanvas);
  }, []);

  const setDockMinimized = (value: boolean) => {
    localStorage.setItem(DOCK_MINIMIZED_KEY, String(value));
    setMinimized(value);
  };

  const signalCount = contextual?.patterns?.length ?? 0;
  const currentStepLabel = workspaceMode === "design" ? activeStageLabel : workspaceLabel(t, workspaceMode);
  const nextLabel = lifecycleNextLabel ?? nextStage?.label ?? "Next";
  const statusTone = openObligations > 0 ? "Needs review" : signalCount > 0 ? "Guided" : "Stable";

  if (minimized) {
    return (
      <footer className="workbench-bottom-dock workbench-bottom-dock--status workbench-bottom-dock--minimized" aria-label="AIW minimized status dock">
        <button type="button" className="dock-mini-toggle" onClick={() => setDockMinimized(false)} title="Expand status dock">
          <Maximize2 size={14} />
          <span>{currentStepLabel}</span>
        </button>
        <button type="button" className={`dock-mini-signal ${openObligations > 0 ? "attention" : ""}`} onClick={() => setInfoCenterOpen(true)} title="Open AIW Info Center">
          {openObligations > 0 ? <ListChecks size={14} /> : <CheckCircle2 size={14} />}
          <span>{statusTone}</span>
        </button>
        <button
          title={`Advance to ${nextLabel}`}
          onClick={() => advanceLifecycle ? advanceLifecycle() : enterStage(nextStage.id)}
          className="dock-primary dock-next-button dock-next-button--mini"
        >
          <span>{nextLabel}</span>
          <ArrowRight size={14} />
        </button>
      </footer>
    );
  }

  return (
    <footer className="workbench-bottom-dock workbench-bottom-dock--status workbench-bottom-dock--expanded" aria-label="AIW status dock">
      <button type="button" className="dock-collapse-button" onClick={() => setDockMinimized(true)} title="Minimize bottom dock for more canvas space">
        <Minimize2 size={14} />
        <span>Minimize</span>
      </button>

      <div className="dock-now dock-now--compact" title={currentWorkspaceCaption}>
        <span className="eyebrow">Current step</span>
        <strong>{currentStepLabel}</strong>
        <small>{currentWorkspaceCaption}</small>
      </div>

      <div className="dock-role-status" title={activeRoleJourney?.mission}>
        <UserCog size={15} />
        <span>
          <strong>{activeRoleJourney?.shortLabel ?? activeRoleJourney?.label ?? "Role"}</strong>
          <small>{activeRoleJourney?.success ?? "Role-scoped tools available"}</small>
        </span>
      </div>

      <button
        type="button"
        className={`dock-brain-summary ${openObligations > 0 ? "attention" : ""}`}
        onClick={() => setInfoCenterOpen(true)}
        title="Open the AIW Info Center for deterministic, knowledge-backed and LLM-assisted observations"
      >
        {openObligations > 0 ? <ListChecks size={15} /> : <CheckCircle2 size={15} />}
        <span>
          <strong>{statusTone}</strong>
          <small>{openObligations > 0 ? `${openObligations} obligation(s) need attention` : `${signalCount} contextual signal(s)`}</small>
        </span>
      </button>

      <button type="button" className="dock-tour-button" onClick={() => window.dispatchEvent(new Event("aiw:start-first-run-tour"))} title="Restart the first-run guided tour">
        <ChevronUp size={14} />
        <span>Guide</span>
      </button>

      <div className="dock-next-action" aria-label="Next architecture action">
        <button
          title={`Advance to ${nextLabel}`}
          onClick={() => advanceLifecycle ? advanceLifecycle() : enterStage(nextStage.id)}
          className="dock-primary dock-next-button"
        >
          <BrainCircuit size={15} />
          <span>Next: {nextLabel}</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </footer>
  );
}
