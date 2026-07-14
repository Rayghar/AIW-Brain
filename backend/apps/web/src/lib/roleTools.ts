import {
  Activity,
  BookOpenCheck,
  Boxes,
  BrainCircuit,
  ClipboardCheck,
  CloudCog,
  FolderKanban,
  GitBranch,
  GitCompareArrows,
  KeyRound,
  LibraryBig,
  LockKeyhole,
  MessageSquareText,
  Radar,
  Scale,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCog,
  WandSparkles,
} from "lucide-react";
import type { ExperienceProfileId, WorkspaceModeId } from "./experienceProfiles";
import type { NavigationItem } from "./workspaceNavigation";

export type RoleToolTarget =
  | { kind: "workspace"; id: WorkspaceModeId }
  | { kind: "admin"; tab: Extract<NavigationItem, { kind: "admin" }>["tab"] }
  | { kind: "knowledge"; tab: Extract<NavigationItem, { kind: "knowledge" }>["tab"] };

export type RoleToolItem = {
  id: string;
  label: string;
  title: string;
  description: string;
  lifecycleFit: string;
  target: RoleToolTarget;
  icon: typeof Boxes;
};

export const roleToolCatalog: Record<ExperienceProfileId, RoleToolItem[]> = {
  "solution-architect": [
    { id: "projects", label: "Projects", title: "Project Cockpit", description: "Orient the current design, continue from the right stage, and see open architecture risks.", lifecycleFit: "Orient before authoring", icon: FolderKanban, target: { kind: "workspace", id: "cockpit" } },
    { id: "library", label: "Library", title: "Pattern Studio and Architecture Library", description: "Choose governed styles, patterns and component kits that shape the design canvas.", lifecycleFit: "Design: style → pattern → object kit", icon: LibraryBig, target: { kind: "workspace", id: "patterns" } },
    { id: "synthesis", label: "Synthesis", title: "Architecture Synthesis", description: "Compare options and receive design alternatives before committing decisions.", lifecycleFit: "Design: option refinement", icon: WandSparkles, target: { kind: "workspace", id: "synthesis" } },
    { id: "govern", label: "Govern", title: "Governance", description: "Review obligations, approvals and policy posture while the model is being authored.", lifecycleFit: "Review & assurance", icon: ShieldCheck, target: { kind: "workspace", id: "governance" } },
    { id: "collaboration", label: "Review Threads", title: "Collaboration", description: "Capture review comments, assignments and stakeholder decisions without leaving the design journey.", lifecycleFit: "Review & handoff", icon: MessageSquareText, target: { kind: "workspace", id: "collaboration" } },
  ],
  "enterprise-architect": [
    { id: "projects", label: "Projects", title: "Project Cockpit", description: "Read project posture before making portfolio, standard or governance decisions.", lifecycleFit: "Orient", icon: FolderKanban, target: { kind: "workspace", id: "cockpit" } },
    { id: "portfolio", label: "Portfolio", title: "Portfolio Workspace", description: "Assess cross-project risk, duplication, concentration and reuse opportunities.", lifecycleFit: "Orient and enterprise oversight", icon: Boxes, target: { kind: "workspace", id: "portfolio" } },
    { id: "compare", label: "Compare", title: "Comparison Workspace", description: "Compare options, deltas and trade-offs across patterns, solutions and target states.", lifecycleFit: "Decision support", icon: GitCompareArrows, target: { kind: "workspace", id: "comparison" } },
    { id: "govern", label: "Govern", title: "Governance", description: "Inspect standards alignment, waivers, obligations and review disposition.", lifecycleFit: "Assure", icon: Scale, target: { kind: "workspace", id: "governance" } },
    { id: "releases", label: "Releases", title: "Knowledge Releases", description: "Confirm which governed knowledge pack is pinned to architecture recommendations.", lifecycleFit: "Operate the intelligence substrate", icon: ClipboardCheck, target: { kind: "admin", tab: "releases" } },
  ],
  "platform-architect": [
    { id: "logical-tech", label: "Logical Tech", title: "Logical Technology", description: "Model vendor-neutral technology capabilities and platform responsibilities.", lifecycleFit: "Design stage 5", icon: CloudCog, target: { kind: "workspace", id: "design" } },
    { id: "security", label: "Security", title: "Security & Live Ops", description: "Check controls, live risks, identity posture and security obligations.", lifecycleFit: "Assure and operate", icon: LockKeyhole, target: { kind: "workspace", id: "security" } },
    { id: "conformance", label: "Conformance", title: "Continuous Conformance", description: "Run architecture checks and evidence gates against the intended model.", lifecycleFit: "Assure", icon: ClipboardCheck, target: { kind: "workspace", id: "conformance" } },
    { id: "ops", label: "Ops Intel", title: "Operational Intelligence", description: "Relate runtime telemetry, reliability signals and hotspots back to architecture decisions.", lifecycleFit: "Physical technology and operate", icon: Activity, target: { kind: "workspace", id: "operations" } },
    { id: "runtime", label: "Runtime", title: "Enterprise Runtime", description: "Inspect runtime collectors, environments and deployment evidence.", lifecycleFit: "Operate", icon: CloudCog, target: { kind: "workspace", id: "runtime" } },
  ],
  reviewer: [
    { id: "review", label: "Review", title: "Review & Assurance", description: "Inspect findings, decisions and readiness before approval.", lifecycleFit: "Review stage", icon: ShieldCheck, target: { kind: "workspace", id: "design" } },
    { id: "govern", label: "Govern", title: "Governance", description: "Evaluate obligations, policy exceptions and approvals.", lifecycleFit: "Assure", icon: Scale, target: { kind: "workspace", id: "governance" } },
    { id: "compare", label: "Compare", title: "Comparison", description: "Compare current and alternative architecture options before disposition.", lifecycleFit: "Decision review", icon: GitCompareArrows, target: { kind: "workspace", id: "comparison" } },
    { id: "conformance", label: "Conformance", title: "Continuous Conformance", description: "Validate deterministic checks, evidence and policy gate results.", lifecycleFit: "Assure", icon: ClipboardCheck, target: { kind: "workspace", id: "conformance" } },
    { id: "audit", label: "Audit", title: "Audit Trail", description: "Trace who changed what, when, and why before final review.", lifecycleFit: "Final assurance", icon: BookOpenCheck, target: { kind: "admin", tab: "audit" } },
  ],
  "knowledge-curator": [
    { id: "mind", label: "Mind Factory", title: "Mind Factory", description: "Curate source snapshots, candidate claims, workers and signed knowledge activation.", lifecycleFit: "Operate the AIW brain", icon: BrainCircuit, target: { kind: "admin", tab: "mindFactory" } },
    { id: "claims", label: "Claims", title: "Claim Review Queue", description: "Review candidate knowledge before it can influence architecture recommendations.", lifecycleFit: "Knowledge governance", icon: BookOpenCheck, target: { kind: "knowledge", tab: "claims" } },
    { id: "patterns", label: "Pattern DNA", title: "Pattern DNA", description: "Maintain pattern relationships, compatibility, obligations and evidence.", lifecycleFit: "Design intelligence substrate", icon: Sparkles, target: { kind: "admin", tab: "patterns" } },
    { id: "sources", label: "Sources", title: "Knowledge Sources", description: "Assess source posture, trust, cadence and ingestion status.", lifecycleFit: "Knowledge operations", icon: LibraryBig, target: { kind: "admin", tab: "sources" } },
    { id: "releases", label: "Releases", title: "Knowledge Releases", description: "Promote approved knowledge packs and pin releases for deterministic scoring.", lifecycleFit: "Operate", icon: ClipboardCheck, target: { kind: "admin", tab: "releases" } },
  ],
  administrator: [
    { id: "control", label: "Control", title: "Admin Control Plane", description: "Operate tenant, RBAC, model routes, repositories, workers, audit and readiness controls.", lifecycleFit: "Operate", icon: Settings2, target: { kind: "admin", tab: "overview" } },
    { id: "security", label: "Security", title: "Security & RBAC", description: "Configure roles, SSO posture and permission simulation for production readiness.", lifecycleFit: "Operate and assure", icon: ShieldCheck, target: { kind: "admin", tab: "security" } },
    { id: "routes", label: "LLM Routes", title: "LLM Routes & API Keys", description: "Configure model providers, routing policy and safe deterministic fallback.", lifecycleFit: "Operate the co-author layer", icon: KeyRound, target: { kind: "admin", tab: "models" } },
    { id: "repos", label: "Repos", title: "GitHub Repositories", description: "Connect repository evidence and govern read-only source posture.", lifecycleFit: "Operate evidence connectors", icon: GitBranch, target: { kind: "admin", tab: "repositories" } },
    { id: "workers", label: "Workers", title: "Workers and Repo Pilot", description: "Inspect queued jobs, scans and background execution loops.", lifecycleFit: "Operate", icon: BrainCircuit, target: { kind: "admin", tab: "repoPilot" } },
    { id: "tenant", label: "Tenant", title: "Tenant Settings", description: "Set tenant policies, feature flags and production guardrails.", lifecycleFit: "Operate", icon: UserCog, target: { kind: "admin", tab: "tenant" } },
    { id: "readiness", label: "Readiness", title: "Production Readiness", description: "Close launch blockers and check production-control posture.", lifecycleFit: "Operate and release", icon: ClipboardCheck, target: { kind: "admin", tab: "production" } },
  ],
};

export function roleToolKey(item: RoleToolItem): string {
  if (item.target.kind === "workspace") return `workspace:${item.target.id}`;
  if (item.target.kind === "admin") return `admin:${item.target.tab}`;
  return `knowledge:${item.target.tab}`;
}

export function getRoleTools(roleId: ExperienceProfileId, showAll = false): RoleToolItem[] {
  if (!showAll) return roleToolCatalog[roleId] ?? roleToolCatalog["solution-architect"];
  const seen = new Set<string>();
  return Object.values(roleToolCatalog).flat().filter((item) => {
    const key = roleToolKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
