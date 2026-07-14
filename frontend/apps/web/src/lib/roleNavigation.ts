import {
  Activity,
  BookOpenCheck,
  Boxes,
  BrainCircuit,
  ClipboardCheck,
  ClipboardList,
  CloudCog,
  DatabaseZap,
  FileText,
  FlaskConical,
  GitBranch,
  GitCompareArrows,
  KeyRound,
  LibraryBig,
  LockKeyhole,
  MessageSquareText,
  Network,
  Radar,
  Scale,
  ScrollText,
  ServerCog,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCog,
  WandSparkles,
  Waypoints,
} from "lucide-react";
import type { ArchitectureStage } from "@aiw/domain";
import type { ExperienceProfileId, WorkspaceModeId } from "./experienceProfiles";
import type { NavigationItem } from "./workspaceNavigation";

export type RoleRailTarget =
  | { kind: "workspace"; id: WorkspaceModeId }
  | { kind: "stage"; id: ArchitectureStage }
  | { kind: "quality" }
  | { kind: "context" }
  | { kind: "sdd" }
  | { kind: "viewbook" }
  | { kind: "admin"; tab: Extract<NavigationItem, { kind: "admin" }>["tab"] }
  | { kind: "knowledge"; tab: Extract<NavigationItem, { kind: "knowledge" }>["tab"] };

export type RoleRailItem = {
  id: string;
  label: string;
  title: string;
  caption: string;
  index?: number;
  icon: typeof Boxes;
  target: RoleRailTarget;
};

export type RoleRailSection = {
  title: string;
  intent: string;
  items: RoleRailItem[];
};

const designLifecycle: RoleRailItem[] = [
  { id: "requirements", label: "Requirements", title: "Requirements & Intent", caption: "Capture goal, scope, stakeholders and constraints.", index: 1, icon: ClipboardList, target: { kind: "stage", id: "designIntent" } },
  { id: "quality", label: "Quality Drivers", title: "Quality Drivers", caption: "Rank quality attributes and measurable scenarios.", index: 2, icon: SlidersHorizontal, target: { kind: "quality" } },
  { id: "context", label: "System Context", title: "System Context & Journeys", caption: "Map the system boundary, actors, external systems and approved interactions.", index: 3, icon: Waypoints, target: { kind: "context" } },
  { id: "logicalApplication", label: "Logical Application", title: "Logical Application", caption: "Model domains, services, APIs and data ownership.", index: 4, icon: Network, target: { kind: "stage", id: "logicalApplication" } },
  { id: "applicationRealization", label: "Application Realization", title: "Application Realization", caption: "Turn logical design into deployable units and ownership.", index: 5, icon: Boxes, target: { kind: "stage", id: "applicationRealization" } },
  { id: "logicalTechnology", label: "Logical Technology", title: "Logical Technology", caption: "Define vendor-neutral platform and technology capabilities.", index: 6, icon: DatabaseZap, target: { kind: "stage", id: "logicalTechnology" } },
  { id: "physicalTechnology", label: "Physical Technology", title: "Physical Technology", caption: "Model topology, zones, runtime and deployment posture.", index: 7, icon: CloudCog, target: { kind: "stage", id: "physicalTechnology" } },
  { id: "review", label: "Review", title: "Review & Assurance", caption: "Run findings, evidence, governance and conformance checks.", index: 8, icon: ShieldCheck, target: { kind: "stage", id: "validationRealization" } },
  { id: "sdd", label: "SDD Pack", title: "SDD Delivery Pack", caption: "Generate the final solution design delivery pack.", index: 9, icon: FileText, target: { kind: "sdd" } },
];

export const roleRailSections: Record<ExperienceProfileId, RoleRailSection[]> = {
  "solution-architect": [
    {
      title: "Project",
      intent: "Orient the active initiative before entering the design lifecycle.",
      items: [
        { id: "cockpit", label: "Project Cockpit", title: "Project Cockpit", caption: "Readiness, next move, model health and checkpoints.", icon: BrainCircuit, target: { kind: "workspace", id: "cockpit" } },
      ],
    },
    {
      title: "Design lifecycle",
      intent: "Author the architecture from intent to SDD. Decisions and tools stay attached to this journey.",
      items: designLifecycle,
    },
    {
      title: "Architecture decisions",
      intent: "Compose governed patterns and compare architecture alternatives without leaving the lifecycle context.",
      items: [
        { id: "compose", label: "Compose", title: "Architecture Composition", caption: "Compare patterns, preview topology and apply governed changes.", icon: Sparkles, target: { kind: "workspace", id: "patterns" } },
        { id: "options", label: "Options", title: "Architecture Options", caption: "Generate, compare, simulate and select architecture alternatives.", icon: WandSparkles, target: { kind: "workspace", id: "synthesis" } },
        { id: "viewbook", label: "Viewbook", title: "Architecture Viewbook", caption: "Open the interactive multi-view architecture model.", icon: Waypoints, target: { kind: "viewbook" } },
      ],
    },
  ],
  administrator: [
    {
      title: "Admin control plane",
      intent: "Operate AIW safely: tenant, RBAC, routes, repos, workers, readiness and audit.",
      items: [
        { id: "control", label: "Control Center", title: "Admin Control Plane", caption: "System posture, readiness and control-plane overview.", index: 1, icon: Settings2, target: { kind: "admin", tab: "overview" } },
        { id: "security", label: "Security & RBAC", title: "Security & RBAC", caption: "Roles, SSO posture and permission simulation.", index: 2, icon: ShieldCheck, target: { kind: "admin", tab: "security" } },
        { id: "routes", label: "LLM Routes", title: "LLM Routes & API Keys", caption: "Provider routes, fallback and cost-safe model policy.", index: 3, icon: KeyRound, target: { kind: "admin", tab: "models" } },
        { id: "repos", label: "Repositories", title: "Repository Evidence", caption: "Connect and govern repo evidence connectors.", index: 4, icon: GitBranch, target: { kind: "admin", tab: "repositories" } },
        { id: "workers", label: "Workers", title: "Workers & Jobs", caption: "Worker queues, scans, repo pilot and execution loops.", index: 5, icon: ServerCog, target: { kind: "admin", tab: "repoPilot" } },
        { id: "tenant", label: "Tenant Settings", title: "Tenant Settings", caption: "Policies, feature flags and tenant guardrails.", index: 6, icon: UserCog, target: { kind: "admin", tab: "tenant" } },
        { id: "readiness", label: "Readiness", title: "Production Readiness", caption: "Launch blockers, checks and production posture.", index: 7, icon: ClipboardCheck, target: { kind: "admin", tab: "production" } },
        { id: "audit", label: "Audit", title: "Audit Trail", caption: "Traceability, event history and governance evidence.", index: 8, icon: ScrollText, target: { kind: "admin", tab: "audit" } },
      ],
    },
  ],
  "knowledge-curator": [
    {
      title: "Knowledge operations",
      intent: "Curate governed architecture knowledge before it can influence AIW recommendations.",
      items: [
        { id: "mindFactory", label: "Mind Factory", title: "Mind Factory Pipeline", caption: "Triage source intake, claim extraction and curation readiness without operating infrastructure.", index: 1, icon: BrainCircuit, target: { kind: "knowledge", tab: "overview" } },
        { id: "claims", label: "Claims", title: "Claim Review Queue", caption: "Review candidate knowledge before promotion.", index: 2, icon: BookOpenCheck, target: { kind: "knowledge", tab: "claims" } },
        { id: "contradictions", label: "Contradictions", title: "Contradictions", caption: "Resolve conflicting claims and context splits.", index: 3, icon: GitCompareArrows, target: { kind: "knowledge", tab: "contradictions" } },
        { id: "sources", label: "Sources", title: "Knowledge Sources", caption: "Review source trust, licence, freshness and coverage queues.", index: 4, icon: LibraryBig, target: { kind: "knowledge", tab: "sources" } },
        { id: "normalize", label: "Normalize", title: "Duplicates & Synonyms", caption: "Deduplicate records and map synonyms to canonical terms.", index: 5, icon: Boxes, target: { kind: "knowledge", tab: "duplicates" } },
        { id: "patternDna", label: "Pattern DNA", title: "Pattern DNA", caption: "Pattern relationships, obligations and evidence.", index: 6, icon: Sparkles, target: { kind: "admin", tab: "patterns" } },
        { id: "releases", label: "Releases", title: "Knowledge Releases", caption: "Promote, pin and roll back governed knowledge packs.", index: 7, icon: ClipboardCheck, target: { kind: "admin", tab: "releases" } },
        { id: "activity", label: "Activity", title: "Knowledge Activity", caption: "Curator activity, corroboration and knowledge event trail.", index: 8, icon: Activity, target: { kind: "knowledge", tab: "activity" } },
        { id: "evaluationLab", label: "Evaluation Lab", title: "Architecture Brain Evaluation Lab", caption: "Inspect benchmark evidence, pattern gaps and expert-review readiness.", index: 9, icon: FlaskConical, target: { kind: "workspace", id: "pilot" } },
      ],
    },
  ],
  reviewer: [
    {
      title: "Review & assurance",
      intent: "Inspect evidence, record findings and decide whether the architecture is fit for approval.",
      items: [
        { id: "review", label: "Review Queue", title: "Review Queue", caption: "Findings, ADR quality, readiness and blockers.", index: 1, icon: ShieldCheck, target: { kind: "stage", id: "validationRealization" } },
        { id: "findings", label: "Findings", title: "Findings", caption: "Open issues, missing evidence and disposition items.", index: 2, icon: ClipboardCheck, target: { kind: "stage", id: "validationRealization" } },
        { id: "governance", label: "Governance", title: "Governance", caption: "Policies, approvals, waivers and obligations.", index: 3, icon: Scale, target: { kind: "workspace", id: "governance" } },
        { id: "conformance", label: "Conformance", title: "Conformance", caption: "Checks, evidence gates and remediation posture.", index: 4, icon: BookOpenCheck, target: { kind: "workspace", id: "conformance" } },
        { id: "evidence", label: "Evidence", title: "Evidence Ledger", caption: "Traceability, artifacts, provenance, freshness and verification evidence.", index: 5, icon: FileText, target: { kind: "stage", id: "validationRealization" } },
        { id: "compare", label: "Compare", title: "Compare", caption: "Compare alternatives, trade-offs and standard impact.", index: 6, icon: GitCompareArrows, target: { kind: "workspace", id: "comparison" } },
        { id: "audit", label: "Audit", title: "Review Audit", caption: "Inspect who changed what, when, why and against which baseline.", index: 7, icon: ScrollText, target: { kind: "stage", id: "validationRealization" } },
        { id: "disposition", label: "Disposition", title: "Review Disposition", caption: "Approve, request changes or reject the submitted review baseline.", index: 8, icon: ClipboardCheck, target: { kind: "stage", id: "validationRealization" } },
      ],
    },
  ],
  "enterprise-architect": [
    {
      title: "Enterprise oversight",
      intent: "Assess portfolio risk, standards alignment, reuse and governance impact across initiatives.",
      items: [
        { id: "portfolio", label: "Portfolio", title: "Portfolio", caption: "Cross-project health, duplication and reuse.", index: 1, icon: Boxes, target: { kind: "workspace", id: "portfolio" } },
        { id: "cockpit", label: "Portfolio Home", title: "Portfolio Home", caption: "Role home, current project context and accountable enterprise tasks.", index: 2, icon: BrainCircuit, target: { kind: "workspace", id: "cockpit" } },
        { id: "compare", label: "Compare", title: "Compare", caption: "Compare solution options and target-state deltas.", index: 3, icon: GitCompareArrows, target: { kind: "workspace", id: "comparison" } },
        { id: "standards", label: "Standards", title: "Standards Impact", caption: "Assess change blast radius, exceptions and migration sequencing.", index: 4, icon: LibraryBig, target: { kind: "workspace", id: "portfolio" } },
        { id: "governance", label: "Governance", title: "Governance", caption: "Policy posture, obligations and approval readiness.", index: 5, icon: Scale, target: { kind: "workspace", id: "governance" } },
        { id: "reuse", label: "Reuse", title: "Reuse", caption: "Reusable capabilities, duplicated work and shared patterns.", index: 6, icon: GitBranch, target: { kind: "workspace", id: "portfolio" } },
        { id: "risks", label: "Risks", title: "Risks", caption: "Concentration risk, delivery risk and portfolio heat.", index: 7, icon: Radar, target: { kind: "workspace", id: "portfolio" } },
        { id: "releases", label: "Release Impact", title: "Release Impact", caption: "Assess how a knowledge or standards release changes portfolio decisions.", index: 8, icon: ClipboardCheck, target: { kind: "workspace", id: "portfolio" } },
        { id: "evaluationLab", label: "Evaluation Lab", title: "Architecture Brain Evaluation Lab", caption: "Compare deterministic, governed-LLM and conventional reference outcomes.", index: 9, icon: FlaskConical, target: { kind: "workspace", id: "pilot" } },
      ],
    },
  ],
  "platform-architect": [
    {
      title: "Platform & runtime",
      intent: "Connect logical technology, physical topology, security, conformance and runtime evidence.",
      items: [
        { id: "logicalTech", label: "Logical Tech", title: "Logical Technology", caption: "Vendor-neutral platform capability model.", index: 1, icon: DatabaseZap, target: { kind: "stage", id: "logicalTechnology" } },
        { id: "physicalTech", label: "Physical Tech", title: "Physical Technology", caption: "Topology, deployment zones and runtime posture.", index: 2, icon: CloudCog, target: { kind: "stage", id: "physicalTechnology" } },
        { id: "security", label: "Security", title: "Security", caption: "Identity, controls, live risks and security obligations.", index: 3, icon: LockKeyhole, target: { kind: "workspace", id: "security" } },
        { id: "conformance", label: "Conformance", title: "Conformance", caption: "Architecture checks, evidence and remediation gates.", index: 4, icon: ClipboardCheck, target: { kind: "workspace", id: "conformance" } },
        { id: "drift", label: "Drift", title: "Drift", caption: "Compare intended vs actual runtime architecture.", index: 5, icon: Radar, target: { kind: "workspace", id: "drift" } },
        { id: "ops", label: "Ops Intel", title: "Operational Intelligence", caption: "Telemetry, hotspots and reliability signals.", index: 6, icon: Waypoints, target: { kind: "workspace", id: "operations" } },
        { id: "runtime", label: "Runtime", title: "Runtime", caption: "Collectors, inventory and deployment evidence.", index: 7, icon: ServerCog, target: { kind: "workspace", id: "runtime" } },
        { id: "topology", label: "Topology", title: "Topology", caption: "Generate topology from telemetry and deployment evidence.", index: 8, icon: CloudCog, target: { kind: "stage", id: "physicalTechnology" } },
      ],
    },
  ],
};

export function getRoleRailSections(roleId: ExperienceProfileId): RoleRailSection[] {
  return roleRailSections[roleId] ?? roleRailSections["solution-architect"];
}

export function roleRailTargetKey(target: RoleRailTarget): string {
  if (target.kind === "quality") return "workspace:quality";
  if (target.kind === "sdd") return "lifecycle:sdd";
  if (target.kind === "viewbook") return "workspace:viewbook";
  if (target.kind === "stage") return `stage:${target.id}`;
  if (target.kind === "context") return "lifecycle:context";
  if (target.kind === "workspace") return `workspace:${target.id}`;
  if (target.kind === "admin") return `admin:${target.tab}`;
  return `knowledge:${target.tab}`;
}
