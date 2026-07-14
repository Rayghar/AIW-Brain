import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Crosshair, Layers3, PackageCheck } from "lucide-react";
import type { ArchitectureStage } from "@aiw/domain";
import type { ExperienceProfileId, WorkspaceModeId } from "../lib/experienceProfiles";
import { resolvePageObjective } from "../lib/pageObjectiveRegistry";

type LifecycleStepId = "requirements" | "quality" | "context" | "logical" | "realization" | "logicalTechnology" | "physicalTechnology" | "review" | "sdd";

const OBJECTIVE_PREF_KEY = "aiw.pageObjective.rc10_49.collapsed";

function readCollapsedPreference(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(OBJECTIVE_PREF_KEY) !== "false";
}

function defaultStepFor(workspaceMode: WorkspaceModeId, activeStage: ArchitectureStage): LifecycleStepId | undefined {
  if (workspaceMode === "quality") return "quality";
  if (workspaceMode !== "design") return undefined;
  if (activeStage === "designIntent") return "requirements";
  if (activeStage === "logicalApplication") return "logical";
  if (activeStage === "applicationRealization") return "realization";
  if (activeStage === "logicalTechnology") return "logicalTechnology";
  if (activeStage === "physicalTechnology") return "physicalTechnology";
  if (activeStage === "validationRealization") return "review";
  return undefined;
}

export function PageObjectiveStrip(props: {
  workspaceMode: WorkspaceModeId;
  activeStage: ArchitectureStage;
  roleId: ExperienceProfileId;
}) {
  const derivedStep = defaultStepFor(props.workspaceMode, props.activeStage);
  const [selectedLifecycleStep, setSelectedLifecycleStep] = useState<LifecycleStepId | undefined>(derivedStep);
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);

  useEffect(() => {
    setSelectedLifecycleStep(derivedStep);
  }, [derivedStep]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(OBJECTIVE_PREF_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const listener = (event: Event) => {
      const stepId = (event as CustomEvent<{ stepId?: string }>).detail?.stepId;
      if (!stepId) return;
      const normalized = stepId === "logicalApplication" ? "logical" : stepId === "validationRealization" ? "review" : stepId;
      if (["requirements", "quality", "context", "logical", "realization", "logicalTechnology", "physicalTechnology", "review", "sdd"].includes(normalized)) {
        setSelectedLifecycleStep(normalized as LifecycleStepId);
      }
    };
    window.addEventListener("aiw:open-lifecycle-step", listener);
    return () => window.removeEventListener("aiw:open-lifecycle-step", listener);
  }, []);

  const objective = useMemo(() => resolvePageObjective({
    workspaceMode: props.workspaceMode,
    activeStage: props.activeStage,
    roleId: props.roleId,
    ...(selectedLifecycleStep ? { lifecycleStepId: selectedLifecycleStep } : {}),
  }), [props.workspaceMode, props.activeStage, props.roleId, selectedLifecycleStep]);

  if (collapsed) {
    return (
      <section className="page-objective-strip page-objective-strip--collapsed" aria-label="Page objective and task set">
        <div className="page-objective-strip__collapsed-main">
          <span className="eyebrow"><Crosshair size={13} /> Page objective</span>
          <strong>{objective.title}</strong>
          <span>{objective.primaryTasks.slice(0, 2).join(" · ")}</span>
        </div>
        <button type="button" className="page-objective-strip__toggle" onClick={() => setCollapsed(false)} aria-expanded="false">
          Show task model <ChevronDown size={14} />
        </button>
      </section>
    );
  }

  return (
    <section className="page-objective-strip" aria-label="Page objective and task set">
      <div className="page-objective-strip__main">
        <span className="eyebrow"><Crosshair size={13} /> Page objective</span>
        <h2>{objective.title}</h2>
        <p>{objective.objective}</p>
        <button type="button" className="page-objective-strip__toggle page-objective-strip__toggle--inline" onClick={() => setCollapsed(true)} aria-expanded="true">
          Collapse for expert mode <ChevronUp size={14} />
        </button>
      </div>
      <div className="page-objective-strip__column">
        <span><CheckCircle2 size={13} /> Tasks</span>
        <ul>{objective.primaryTasks.slice(0, 4).map((task) => <li key={task}>{task}</li>)}</ul>
      </div>
      <div className="page-objective-strip__column">
        <span><PackageCheck size={13} /> Outputs</span>
        <ul>{objective.outputs.slice(0, 3).map((output) => <li key={output}>{output}</li>)}</ul>
      </div>
      <div className="page-objective-strip__column page-objective-strip__column--capabilities">
        <span><Layers3 size={13} /> Features surfaced here</span>
        <ul>{objective.surfacedCapabilities.slice(0, 3).map((capability) => <li key={capability}>{capability}</li>)}</ul>
      </div>
    </section>
  );
}
