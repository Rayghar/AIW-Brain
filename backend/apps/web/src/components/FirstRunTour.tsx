import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, BrainCircuit, CheckCircle2, Compass, Layers3, ServerCog, X } from "lucide-react";

const TOUR_STORAGE_KEY = "aiw.firstRunTour.rc10_49.dismissed";
const TOUR_PENDING_KEY = "aiw.firstRunTour.rc10_49.pending";

type TourStep = {
  id: string;
  title: string;
  detail: string;
  anchor: string;
  anchorSelector: string;
  icon: ReactNode;
  action?: string;
  actionLabel: string;
};

type AnchorPosition = {
  top: number;
  left: number;
  width: number;
  height: number;
  placement: "right" | "bottom" | "floating";
};

function resolveAnchor(selector: string): AnchorPosition | null {
  if (typeof document === "undefined") return null;
  const element = document.querySelector(selector) as HTMLElement | null;
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth || 1280;
  const viewportHeight = window.innerHeight || 800;
  const placement = rect.right + 460 < viewportWidth ? "right" : rect.bottom + 260 < viewportHeight ? "bottom" : "floating";
  return {
    top: Math.max(16, Math.round(rect.top)),
    left: Math.max(16, Math.round(rect.left)),
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
    placement,
  };
}

export function FirstRunTour({ workspaceMode, activeRoleLabel }: { workspaceMode: string; activeRoleLabel: string }) {
  const [open, setOpen] = useState(() => localStorage.getItem(TOUR_PENDING_KEY) === "true" && localStorage.getItem(TOUR_STORAGE_KEY) !== "true");
  const [stepIndex, setStepIndex] = useState(0);
  const [anchorPosition, setAnchorPosition] = useState<AnchorPosition | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const steps = useMemo<TourStep[]>(() => [
    {
      id: "modes",
      title: "Start with the work mode",
      detail: "Orient, Design, Assure and Operate describe the kind of work being done. They are not roles and they are not lifecycle stages.",
      anchor: "Top work mode bar",
      anchorSelector: "[data-aiw-tour='work-modes']",
      icon: <Compass size={16} />,
      action: "Use Design for architecture authoring; use Operate for admin/control-plane work.",
      actionLabel: "Highlight work modes",
    },
    {
      id: "lifecycle",
      title: "Follow the active role journey",
      detail: "The left rail is now the primary journey for the active role. For Solution Architect it is the design lifecycle; for Admin it becomes the control plane.",
      anchor: "Role-based left rail",
      anchorSelector: "[data-aiw-tour='lifecycle-rail']",
      icon: <Layers3 size={16} />,
      action: "Choose a stage or control-plane step, then focus the workspace to do the actual work.",
      actionLabel: "Show the rail",
    },
    {
      id: "tools",
      title: "Use role tools as task launchers",
      detail: `${activeRoleLabel} tools are now inside the workspace. They support the current role and stage instead of becoming another left menu.`,
      anchor: "Workspace role tools tray",
      anchorSelector: "[data-aiw-tour='role-tools']",
      icon: <ServerCog size={16} />,
      action: "Open a tool when you need a specialist surface such as Library, Govern, Security, Repos or Synthesis.",
      actionLabel: "Find role tools",
    },
    {
      id: "brain",
      title: "Let AIW assist quietly",
      detail: "Brain signals stay compact by default. Open Brain or Info Center only when you need evidence, critique, recommendations or co-authoring help.",
      anchor: "Brain menu + bottom status dock",
      anchorSelector: "[data-aiw-tour='brain-menu']",
      icon: <BrainCircuit size={16} />,
      action: "Use Ask AIW for drafting and critique; trust deterministic gates for official readiness.",
      actionLabel: "Open Brain menu",
    },
  ], [activeRoleLabel]);

  useEffect(() => {
    if (open) localStorage.removeItem(TOUR_PENDING_KEY);
  }, [open]);

  useEffect(() => {
    const handler = () => {
      setStepIndex(0);
      setOpen(true);
    };
    window.addEventListener("aiw:start-first-run-tour", handler);
    return () => window.removeEventListener("aiw:start-first-run-tour", handler);
  }, []);

  const step = steps[stepIndex] ?? steps[0]!;

  useEffect(() => {
    setActionMessage(null);
  }, [step.id]);

  const runStepAction = () => {
    const element = document.querySelector(step.anchorSelector) as HTMLElement | null;
    if (element) {
      element.scrollIntoView({ block: "center", behavior: "smooth" });
      element.classList.add("first-run-tour-action-pulse");
      window.setTimeout(() => element.classList.remove("first-run-tour-action-pulse"), 1200);
    }
    if (step.id === "brain") {
      const brainMenu = document.querySelector("[data-aiw-tour='brain-menu']") as HTMLElement | null;
      const details = brainMenu?.tagName.toLowerCase() === "details" ? (brainMenu as HTMLDetailsElement) : null;
      if (details) details.open = true;
    }
    if (step.id === "tools") {
      window.dispatchEvent(new CustomEvent("aiw:show-role-tools"));
    }
    setActionMessage(`${step.anchor} highlighted`);
    setAnchorPosition(resolveAnchor(step.anchorSelector));
  };

  useEffect(() => {
    if (!open) return;
    const update = () => setAnchorPosition(resolveAnchor(step.anchorSelector));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, step.anchorSelector]);

  if (!open) return null;

  const last = stepIndex >= steps.length - 1;
  const dismiss = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    localStorage.setItem("aiw.firstRunTour.v10_48_10.dismissed", "true");
    localStorage.removeItem(TOUR_PENDING_KEY);
    setOpen(false);
  };
  const tourStyle = anchorPosition ? ({
    "--tour-anchor-top": `${anchorPosition.top}px`,
    "--tour-anchor-left": `${anchorPosition.left}px`,
    "--tour-anchor-width": `${anchorPosition.width}px`,
    "--tour-anchor-height": `${anchorPosition.height}px`,
  } as CSSProperties) : undefined;

  return (
    <>
      {anchorPosition ? <div className="first-run-tour-anchor-ring" style={tourStyle} aria-hidden="true" /> : null}
      <aside
        className={`first-run-tour first-run-tour--anchored first-run-tour--${anchorPosition?.placement ?? "floating"}`}
        style={tourStyle}
        role="dialog"
        aria-label="AIW anchored first-run guided tour"
        aria-live="polite"
      >
        <header>
          <span><CheckCircle2 size={15} /> Guided product tour</span>
          <button type="button" aria-label="Close guided tour" onClick={dismiss}><X size={14} /></button>
        </header>
        <div className="first-run-tour__body">
          <div className="first-run-tour__icon">{step.icon}</div>
          <div>
            <small>Step {stepIndex + 1} of {steps.length} · {workspaceMode}</small>
            <h3>{step.title}</h3>
            <p>{step.detail}</p>
            <b>{step.anchor}</b>
            <em>{step.action}</em>
            {actionMessage ? <span className="first-run-tour__action-message">{actionMessage}</span> : null}
          </div>
        </div>
        <footer>
          <button type="button" onClick={dismiss}>Skip tour</button>
          <button type="button" className="tour-action" onClick={runStepAction}>{step.actionLabel}</button>
          <div className="first-run-tour__dots" aria-label="Tour progress">
            {steps.map((item, index) => <span key={item.id} className={index === stepIndex ? "active" : ""} />)}
          </div>
          <button type="button" className="primary" onClick={() => last ? dismiss() : setStepIndex((value) => Math.min(steps.length - 1, value + 1))}>
            {last ? "Finish" : "Next"} {!last ? <ArrowRight size={14} /> : null}
          </button>
        </footer>
      </aside>
    </>
  );
}
