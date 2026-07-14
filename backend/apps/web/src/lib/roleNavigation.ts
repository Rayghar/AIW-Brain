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
  | { kind: "sdd" }
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
  { id: "logicalApplication", label: "Logical Application", title: "Logical Application", caption: "Model domains, services, APIs and data ownership.", index: 3, icon: Network, target: { kind: "stage", id: "logicalApplication" } },
  { id: "applicationRealization", label: "Application Realization", title: "Application Realization", caption: "Turn logical design into deployable units and ownership.", index: 4, icon: Boxes, target: { kind: "stage", id: "applicationRealization" } },
  { id: "logicalTechnology", label: "Logical Technology", title: "Logical Technology", caption: "Define vendor-neutral platform and technology capabilities.", index: 5, icon: DatabaseZap, target: { kind: "stage", id: "logicalTechnology" } },
  { id: "physicalTechnology", label: "Physical Technology", title: "Physical Technology", caption: "Model topology, zones, runtime and deployment posture.", index: 6, icon: CloudCog, target: { kind: "stage", id: "physicalTechnology" } },
  { id: "review", label: "Review", title: "Review & Assurance", caption: "Run findings, evidence, governance and conformance checks.", index: 7, icon: ShieldCheck, target: { kind: "stage", id: "validationRealization" } },
  { id: "sdd", label: "SDD Pack", title: "SDD Delivery Pack", caption: "Generate the final solution design delivery pack.", index: 8, icon: FileText, target: { kind: "sdd" } },
];

export const roleRailSections: Record<ExperienceProfileId, RoleRailSection[]> = {
  "solution-architect": [
    {
      title: "Design lifecycle",
      intent: "Author the architecture from intent to SDD. Tools appear in the workspace when relevant.",
      items: designLifecycle,
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
        { id: "mindFactory", label: "Mind Factory", title: "Mind Factory", caption: "Source quarantine, claim extraction, workers and activation.", index: 1, icon: BrainCircuit, target: { kind: "admin", tab: "mindFactory" } },
        { id: "claims", label: "Claims", title: "Claim Review Queue", caption: "Review candidate knowledge before promotion.", index: 2, icon: BookOpenCheck, target: { kind: "knowledge", tab: "claims" } },
        { id: "contradictions", label: "Contradictions", title: "Contradictions", caption: "Resolve conflicting claims and context splits.", index: 3, icon: GitCompareArrows, target: { kind: "knowledge", tab: "contradictions" } },
        { id: "sources", label: "Sources", title: "Knowledge Sources", caption: "Source trust, license, freshness and coverage.", index: 4, icon: LibraryBig, target: { kind: "admin", tab: "sources" } },
        { id: "normalize", label: "Normalize", title: "Duplicates & Synonyms", caption: "Deduplicate records and map synonyms to canonical terms.", index: 5, icon: Boxes, target: { kind: "knowledge", tab: "duplicates" } },
        { id: "patternDna", label: "Pattern DNA", title: "Pattern DNA", caption: "Pattern relationships, obligations and evidence.", index: 6, icon: Sparkles, target: { kind: "admin", tab: "patterns" } },
        { id: "releases", label: "Releases", title: "Knowledge Releases", caption: "Promote, pin and roll back governed knowledge packs.", index: 7, icon: ClipboardCheck, target: { kind: "admin", tab: "releases" } },
        { id: "activity", label: "Activity", title: "Knowledge Activity", caption: "Curator activity, corroboration and knowledge event trail.", index: 8, icon: Activity, target: { kind: "knowledge", tab: "activity" } },
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
        { id: "evidence", label: "Evidence", title: "Evidence", caption: "Traceability, artifacts and verification evidence.", index: 5, icon: FileText, target: { kind: "workspace", id: "conformance" } },
        { id: "compare", label: "Compare", title: "Compare", caption: "Compare alternatives, trade-offs and standard impact.", index: 6, icon: GitCompareArrows, target: { kind: "workspace", id: "comparison" } },
        { id: "audit", label: "Audit", title: "Audit", caption: "Who changed what, when, and why.", index: 7, icon: ScrollText, target: { kind: "admin", tab: "audit" } },
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
        { id: "cockpit", label: "Project Cockpit", title: "Project Cockpit", caption: "Current project posture and decision context.", index: 2, icon: BrainCircuit, target: { kind: "workspace", id: "cockpit" } },
        { id: "compare", label: "Compare", title: "Compare", caption: "Compare solution options and target-state deltas.", index: 3, icon: GitCompareArrows, target: { kind: "workspace", id: "comparison" } },
        { id: "standards", label: "Standards", title: "Standards", caption: "Standards impact, exceptions and reuse decisions.", index: 4, icon: LibraryBig, target: { kind: "workspace", id: "governance" } },
        { id: "governance", label: "Governance", title: "Governance", caption: "Policy posture, obligations and approval readiness.", index: 5, icon: Scale, target: { kind: "workspace", id: "governance" } },
        { id: "reuse", label: "Reuse", title: "Reuse", caption: "Reusable capabilities, duplicated work and shared patterns.", index: 6, icon: GitBranch, target: { kind: "workspace", id: "portfolio" } },
        { id: "risks", label: "Risks", title: "Risks", caption: "Concentration risk, delivery risk and portfolio heat.", index: 7, icon: Radar, target: { kind: "workspace", id: "portfolio" } },
        { id: "releases", label: "Releases", title: "Releases", caption: "Knowledge release impact and scoring pinning.", index: 8, icon: ClipboardCheck, target: { kind: "admin", tab: "releases" } },
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
  if (target.kind === "stage") return `stage:${target.id}`;
  if (target.kind === "workspace") return `workspace:${target.id}`;
  if (target.kind === "admin") return `admin:${target.tab}`;
  return `knowledge:${target.tab}`;
}
