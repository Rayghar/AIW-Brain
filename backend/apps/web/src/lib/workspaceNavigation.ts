// Workspace + navigation section catalog — extracted from App.tsx honoring the 820-line
// shrink-only budget (App decomposition). Pure data/helpers; no behavior change.
import { Blocks, BookOpenCheck, BrainCircuit, Boxes, ClipboardList, ClipboardCheck, CloudCog, DatabaseZap, GitBranch, GitCompareArrows, Scale, Network, MessagesSquare, LockKeyhole, Radar, Waypoints, ShieldCheck, LibraryBig, Shapes, WandSparkles, SlidersHorizontal, ServerCog, FlaskConical, Rocket, Settings2, KeyRound, ScrollText, UserCog } from "lucide-react";
import type { ArchitectureStage } from "@aiw/domain";
import type { WorkspaceModeId } from "./experienceProfiles";
import type { WorkspaceGroup } from "./designStages";

export type NavigationItem =
  | {
      kind: "workspace";
      id: WorkspaceModeId;
      label: string;
      caption: string;
      icon: typeof Boxes;
    }
  | {
      kind: "stage";
      id: ArchitectureStage;
      label: string;
      caption: string;
      icon: typeof Boxes;
    }
  | {
      kind: "admin";
      tab:
        | "overview"
        | "production"
        | "models"
        | "repositories"
        | "repoPilot"
        | "mindFactory"
        | "sources"
        | "patterns"
        | "releases"
        | "security"
        | "tenant"
        | "audit";
      label: string;
      caption: string;
      icon: typeof Boxes;
    }
  | {
      kind: "knowledge";
      tab:
        | "overview"
        | "claims"
        | "contradictions"
        | "sources"
        | "duplicates"
        | "synonyms"
        | "corroboration"
        | "activity";
      label: string;
      caption: string;
      icon: typeof Boxes;
    };

export const workspaceEntries: Array<{
  id: Exclude<WorkspaceModeId, "design">;
  icon: typeof Boxes;
  group: WorkspaceGroup;
}> = [
  { id: "activation", icon: Rocket, group: "Design Studio" },
  { id: "quality", icon: SlidersHorizontal, group: "Design Studio" },
  { id: "patterns", icon: Shapes, group: "Specialist Workspaces" },
  { id: "synthesis", icon: WandSparkles, group: "Specialist Workspaces" },
  { id: "portfolio", icon: GitBranch, group: "Executive / Cockpit" },
  { id: "comparison", icon: GitCompareArrows, group: "Executive / Cockpit" },
  { id: "pilot", icon: FlaskConical, group: "Executive / Cockpit" },
  { id: "governance", icon: Scale, group: "Specialist Workspaces" },
  { id: "collaboration", icon: MessagesSquare, group: "Specialist Workspaces" },
  { id: "security", icon: LockKeyhole, group: "Specialist Workspaces" },
  { id: "drift", icon: Radar, group: "Specialist Workspaces" },
  { id: "conformance", icon: ClipboardCheck, group: "Specialist Workspaces" },
  { id: "operations", icon: Waypoints, group: "Specialist Workspaces" },
  { id: "runtime", icon: ServerCog, group: "Specialist Workspaces" },
  { id: "knowledge", icon: LibraryBig, group: "Admin & Knowledge Ops" },
  { id: "admin", icon: Settings2, group: "Admin & Knowledge Ops" },
];

export const navigationSections: Array<{ title: string; items: NavigationItem[] }> = [
  {
    title: "Project Cockpit",
    items: [
      {
        kind: "workspace",
        id: "cockpit",
        label: "Project Cockpit",
        caption: "Readiness, risks and next actions",
        icon: BrainCircuit,
      },
      {
        kind: "workspace",
        id: "portfolio",
        label: "Portfolio",
        caption: "Cross-project health and reuse",
        icon: GitBranch,
      },
      {
        kind: "workspace",
        id: "comparison",
        label: "Comparison",
        caption: "Options, deltas and trade-offs",
        icon: GitCompareArrows,
      },
      {
        kind: "workspace",
        id: "pilot",
        label: "Pilot Evaluation",
        caption: "Pilot readiness and browser evidence",
        icon: FlaskConical,
      },
    ],
  },
  {
    title: "Design Lifecycle",
    items: [
      {
        kind: "stage",
        id: "designIntent",
        label: "Brief",
        caption: "Mission, scope and constraints",
        icon: ClipboardList,
      },
      {
        kind: "workspace",
        id: "quality",
        label: "Quality Drivers",
        caption: "Scenarios, tactics and priorities",
        icon: SlidersHorizontal,
      },
      {
        kind: "stage",
        id: "logicalApplication",
        label: "Logical Application",
        caption: "Domains, services and data",
        icon: Network,
      },
      {
        kind: "stage",
        id: "applicationRealization",
        label: "Application Realization",
        caption: "Units, contracts and ownership",
        icon: Blocks,
      },
      {
        kind: "stage",
        id: "logicalTechnology",
        label: "Logical Technology",
        caption: "Capabilities and platforms",
        icon: DatabaseZap,
      },
      {
        kind: "stage",
        id: "physicalTechnology",
        label: "Physical Technology",
        caption: "Topology and deployment",
        icon: CloudCog,
      },
      {
        kind: "stage",
        id: "validationRealization",
        label: "Review & Realize",
        caption: "Findings, ADRs and handoff",
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: "Specialist Workspaces",
    items: [
      {
        kind: "workspace",
        id: "activation",
        label: "Guided Journey",
        caption: "Activation and workspace seed",
        icon: Rocket,
      },
      {
        kind: "workspace",
        id: "patterns",
        label: "Pattern Studio",
        caption: "Pattern DNA, composition and fitness",
        icon: Shapes,
      },
      {
        kind: "workspace",
        id: "synthesis",
        label: "Architecture Synthesis",
        caption: "Options, rationale and implications",
        icon: WandSparkles,
      },
      {
        kind: "workspace",
        id: "governance",
        label: "Governance",
        caption: "Approvals, obligations and policy",
        icon: Scale,
      },
      {
        kind: "workspace",
        id: "collaboration",
        label: "Collaboration",
        caption: "Reviews, mentions and activity",
        icon: MessagesSquare,
      },
      {
        kind: "workspace",
        id: "security",
        label: "Security & Live Ops",
        caption: "Controls, risks and posture",
        icon: LockKeyhole,
      },
      {
        kind: "workspace",
        id: "drift",
        label: "Drift Control",
        caption: "Expected vs actual architecture",
        icon: Radar,
      },
      {
        kind: "workspace",
        id: "conformance",
        label: "Continuous Conformance",
        caption: "Checks, evidence and gates",
        icon: ClipboardCheck,
      },
      {
        kind: "workspace",
        id: "operations",
        label: "Operational Intelligence",
        caption: "Telemetry, impact and hotspots",
        icon: Waypoints,
      },
      {
        kind: "workspace",
        id: "runtime",
        label: "Enterprise Runtime",
        caption: "Runtime probes and evidence",
        icon: ServerCog,
      },
    ],
  },
  {
    title: "Admin & Knowledge Ops",
    items: [
      {
        kind: "admin",
        tab: "mindFactory",
        label: "Mind Factory",
        caption: "Ingest, curate and activate knowledge",
        icon: BrainCircuit,
      },
      {
        kind: "knowledge",
        tab: "overview",
        label: "Knowledge Governance",
        caption: "Claims, review queues and gates",
        icon: BookOpenCheck,
      },
      {
        kind: "knowledge",
        tab: "claims",
        label: "Claim Review Queue",
        caption: "Human review for candidate claims",
        icon: ClipboardCheck,
      },
      {
        kind: "knowledge",
        tab: "contradictions",
        label: "Contradictions",
        caption: "Context-split or escalate conflicts",
        icon: GitCompareArrows,
      },
      {
        kind: "knowledge",
        tab: "duplicates",
        label: "Normalize Knowledge",
        caption: "Duplicates, synonyms and canonical terms",
        icon: Boxes,
      },
      {
        kind: "knowledge",
        tab: "corroboration",
        label: "Corroboration",
        caption: "Evidence confidence and source agreement",
        icon: ShieldCheck,
      },
      {
        kind: "admin",
        tab: "sources",
        label: "Knowledge Sources",
        caption: "Source health, trust and cadence",
        icon: LibraryBig,
      },
      {
        kind: "admin",
        tab: "patterns",
        label: "Pattern DNA",
        caption: "Pattern edits, evidence and compatibility",
        icon: Shapes,
      },
      {
        kind: "admin",
        tab: "releases",
        label: "Knowledge Releases",
        caption: "Release candidates, manifests and pins",
        icon: ClipboardCheck,
      },
      {
        kind: "admin",
        tab: "models",
        label: "LLM Routes & API Keys",
        caption: "Routes, providers and policy",
        icon: KeyRound,
      },
      {
        kind: "admin",
        tab: "repositories",
        label: "GitHub Repos",
        caption: "Repository evidence connectors",
        icon: GitBranch,
      },
      {
        kind: "admin",
        tab: "repoPilot",
        label: "Workers",
        caption: "Jobs, scans and execution loops",
        icon: ServerCog,
      },
      {
        kind: "admin",
        tab: "audit",
        label: "Audit",
        caption: "Events, traceability and evidence",
        icon: ScrollText,
      },
      {
        kind: "admin",
        tab: "security",
        label: "Security & RBAC",
        caption: "Roles, SSO posture and policy simulation",
        icon: LockKeyhole,
      },
      {
        kind: "admin",
        tab: "tenant",
        label: "Tenant Settings",
        caption: "Policies, flags and tenancy",
        icon: UserCog,
      },
      {
        kind: "admin",
        tab: "production",
        label: "Production Readiness",
        caption: "Launch controls and blockers",
        icon: ClipboardCheck,
      },
      {
        kind: "admin",
        tab: "overview",
        label: "Admin Control Plane",
        caption: "Control-plane posture",
        icon: Settings2,
      },
    ],
  },
];
