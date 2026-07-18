import { lazy, Suspense, useMemo, useState } from "react";
import {
  BrainCircuit,
  CheckSquare2,
  Eye,
  MessageSquareText,
  Scale,
  Sparkles,
  X,
} from "lucide-react";
import type { StageCoAuthorTarget } from "@aiw/domain";
import { StageCoAuthorPanel } from "./StageCoAuthorPanel";

const CoArchitectPanel = lazy(() =>
  import("./CoArchitectPanel").then((module) => ({ default: module.CoArchitectPanel })),
);

export type SolWorkspaceMode = "understand" | "propose" | "compare" | "decide" | "ask";

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

const modeDetail: Record<SolWorkspaceMode, { label: string; detail: string; icon: typeof Eye }> = {
  understand: { label: "Understand", detail: "Evidence, drivers and open questions", icon: Eye },
  propose: { label: "Propose", detail: "Coherent candidate change sets", icon: Sparkles },
  compare: { label: "Compare", detail: "Alternatives, impact and trade-offs", icon: Scale },
  decide: { label: "Decide", detail: "Accept, edit, defer or reject", icon: CheckSquare2 },
  ask: { label: "Ask Sol", detail: "Explain, challenge or inspect", icon: MessageSquareText },
};

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
  const modes = useMemo<SolWorkspaceMode[]>(() => {
    const available: SolWorkspaceMode[] = ["understand"];
    if (draftAvailable) available.push("propose");
    if (designAvailable) available.push("compare", "decide");
    available.push("ask");
    return available;
  }, [designAvailable, draftAvailable]);
  const [mode, setMode] = useState<SolWorkspaceMode>(initialMode && modes.includes(initialMode) ? initialMode : modes[0]!);
  const [width, setWidth] = useState(() => {
    const stored = typeof window === "undefined" ? NaN : Number(window.localStorage.getItem("aiw.solRailWidth"));
    return Number.isFinite(stored) ? Math.min(760, Math.max(380, stored)) : 560;
  });

  const setRailWidth = (next: number) => {
    setWidth(next);
    window.localStorage.setItem("aiw.solRailWidth", String(next));
  };

  return (
    <aside
      className="sol-workspace sol-workspace--rail"
      role="complementary"
      aria-label={`Sol for ${stageTitle} intelligence rail`}
      style={{ width }}
    >
      <header className="sol-workspace__header">
        <div className="sol-workspace__identity">
          <span><BrainCircuit size={18} /></span>
          <div><strong>Sol intelligence rail</strong><small>{stageTitle}</small></div>
        </div>
        <label className="sol-workspace__resize">
          <span>Width</span>
          <input aria-label="Resize Sol intelligence rail" type="range" min="380" max="760" step="20" value={width} onChange={(event) => setRailWidth(Number(event.target.value))} />
        </label>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close Sol"><X size={17} /></button>
      </header>

      <nav className="sol-workspace__modes" aria-label="Sol intelligence modes">
        {modes.map((item) => {
          const definition = modeDetail[item];
          const Icon = definition.icon;
          return <button key={item} type="button" className={mode === item ? "is-active" : ""} onClick={() => setMode(item)}>
            <Icon size={14} />
            <span><strong>{definition.label}</strong><small>{definition.detail}</small></span>
          </button>;
        })}
      </nav>

      <div className="sol-workspace__body">
        {mode === "understand" ? <StageCoAuthorPanel targetStage={stageTarget} variant="output" defaultOpen /> : null}
        {mode === "propose" || mode === "decide" ? <StageCoAuthorPanel targetStage={stageTarget} variant="workspace" /> : null}
        {mode === "compare" ? <section className="sol-design-launch">
          <span className="sol-design-launch__icon"><Scale size={22} /></span>
          <div>
            <h3>Compare coherent architecture change sets</h3>
            <p>Review evidence-separated and consolidated boundary alternatives, their graph diffs, assumptions, risks and downstream effects before opening the canvas.</p>
            <button type="button" className="button button--primary" onClick={onOpenDesign}><Scale size={15} /> Compare on the canvas</button>
          </div>
        </section> : null}
        {mode === "ask" ? <Suspense fallback={<div className="sol-workspace__loading">Preparing bounded Sol context…</div>}>
          <CoArchitectPanel embedded onClose={onClose} {...(initialAskPrompt ? { initialPrompt: initialAskPrompt } : {})} />
        </Suspense> : null}
      </div>
    </aside>
  );
}
