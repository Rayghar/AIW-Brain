// Design lifecycle stage definitions — extracted from App.tsx honoring the 820-line
// shrink-only budget (App decomposition). Pure data/helpers; no behavior change.
import { Blocks, Boxes, ClipboardList, CloudCog, DatabaseZap, Network, ShieldCheck } from "lucide-react";
import type { ArchitectureStage } from "@aiw/domain";
import type { WorkspaceModeId } from "./experienceProfiles";

export const stages: Array<{
  id: ArchitectureStage;
  label: string;
  caption: string;
  icon: typeof Boxes;
}> = [
  {
    id: "designIntent",
    label: "Design Brief",
    caption: "Intent & constraints",
    icon: ClipboardList,
  },
  {
    id: "logicalApplication",
    label: "Logical Application",
    caption: "Domains & services",
    icon: Network,
  },
  {
    id: "applicationRealization",
    label: "Application Realization",
    caption: "Deployable units",
    icon: Blocks,
  },
  {
    id: "logicalTechnology",
    label: "Logical Technology",
    caption: "Vendor-neutral capabilities",
    icon: DatabaseZap,
  },
  {
    id: "physicalTechnology",
    label: "Physical Technology",
    caption: "Products & deployment",
    icon: CloudCog,
  },
  {
    id: "validationRealization",
    label: "Review & Realize",
    caption: "Audit, ADRs & exports",
    icon: ShieldCheck,
  },
];

export const stageTranslationKeys: Record<
  ArchitectureStage,
  { label: any; caption: any }
> = {
  designIntent: {
    label: "nav.designBrief",
    caption: "nav.designBrief.caption",
  },
  logicalApplication: {
    label: "nav.logicalApplication",
    caption: "nav.logicalApplication.caption",
  },
  applicationRealization: {
    label: "nav.applicationRealization",
    caption: "nav.applicationRealization.caption",
  },
  logicalTechnology: {
    label: "nav.logicalTechnology",
    caption: "nav.logicalTechnology.caption",
  },
  physicalTechnology: {
    label: "nav.physicalTechnology",
    caption: "nav.physicalTechnology.caption",
  },
  validationRealization: { label: "nav.review", caption: "nav.review.caption" },
};

export const workspaceTranslationKeys: Record<
  Exclude<WorkspaceModeId, "design" | "cockpit">,
  { label: any; caption: any }
> = {
  activation: {
    label: "workspace.activation",
    caption: "workspace.activation.caption",
  },
  admin: { label: "workspace.admin", caption: "workspace.admin.caption" },
  quality: { label: "workspace.quality", caption: "workspace.quality.caption" },
  portfolio: {
    label: "workspace.portfolio",
    caption: "workspace.portfolio.caption",
  },
  comparison: {
    label: "workspace.comparison",
    caption: "workspace.comparison.caption",
  },
  governance: {
    label: "workspace.governance",
    caption: "workspace.governance.caption",
  },
  collaboration: {
    label: "workspace.collaboration",
    caption: "workspace.collaboration.caption",
  },
  security: {
    label: "workspace.security",
    caption: "workspace.security.caption",
  },
  drift: { label: "workspace.drift", caption: "workspace.drift.caption" },
  conformance: {
    label: "workspace.conformance",
    caption: "workspace.conformance.caption",
  },
  operations: {
    label: "workspace.operations",
    caption: "workspace.operations.caption",
  },
  knowledge: {
    label: "workspace.knowledge",
    caption: "workspace.knowledge.caption",
  },
  synthesis: {
    label: "workspace.synthesis",
    caption: "workspace.synthesis.caption",
  },
  patterns: {
    label: "workspace.patterns",
    caption: "workspace.patterns.caption",
  },
  runtime: {
    label: "workspace.runtime",
    caption: "workspace.runtime.caption",
  },
  pilot: {
    label: "workspace.pilot",
    caption: "workspace.pilot.caption",
  },
};

export type WorkspaceGroup =
  | "Executive / Cockpit"
  | "Design Studio"
  | "Specialist Workspaces"
  | "Admin & Knowledge Ops";
