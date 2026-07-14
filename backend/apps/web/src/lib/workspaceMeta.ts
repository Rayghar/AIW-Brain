// Workspace label/caption/archetype helpers — extracted from App.tsx honoring the shrink-only budget.
import type { ArchitectureStage } from "@aiw/domain";
import type { WorkspaceModeId } from "./experienceProfiles";
import { workspaceTranslationKeys } from "./designStages";

type Translator = (key: any, variables?: any) => string;

export function workspaceLabel(t: Translator, mode: WorkspaceModeId): string {
  if (mode === "cockpit") return "Project Cockpit";
  if (mode === "design") return "Design Lifecycle";
  return t(workspaceTranslationKeys[mode].label);
}

export function workspaceCaption(
  t: Translator,
  mode: Exclude<WorkspaceModeId, "design">,
): string {
  if (mode === "cockpit") return "Project health, next actions and readiness";
  return t(workspaceTranslationKeys[mode].caption);
}

export function workspaceArchetype(mode: WorkspaceModeId, stage: ArchitectureStage) {
  if (["cockpit", "portfolio", "comparison", "pilot"].includes(mode)) return "cockpit";
  if (mode === "design" || ["activation", "quality", "patterns", "synthesis"].includes(mode)) return "studio";
  if (stage === "validationRealization") return "assurance";
  return "control";
}

export function workspaceFlowLabel(mode: WorkspaceModeId, stage: ArchitectureStage) {
  if (["cockpit", "portfolio", "comparison", "pilot"].includes(mode)) return "Executive decision layer";
  if (mode === "design") return stage === "validationRealization" ? "Review and realization" : "Architecture design studio";
  if (["activation", "quality", "patterns", "synthesis"].includes(mode)) return "Architecture reasoning studio";
  if (["admin", "knowledge"].includes(mode)) return "Knowledge operations control plane";
  return "Governance and runtime intelligence";
}

export function downloadProject(project: unknown, name: string) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "aiw-project"}.aiw.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
