// Role journey catalog: steps, targets, per-role journeys — extracted from App.tsx honoring the 820-line
// shrink-only budget (App decomposition). Pure data/helpers; no behavior change.
import type { ArchitectureStage } from "@aiw/domain";
import type { ExperienceProfileId, WorkspaceModeId } from "./experienceProfiles";
import type { NavigationItem } from "./workspaceNavigation";
import type { CapabilityLane } from "./capabilityRegistry";

export const journeySteps: Array<{
  id: string;
  label: string;
  detail: string;
  lane: CapabilityLane;
}> = [
  { id: "orient", label: "Orient", detail: "Choose project and see what matters now", lane: "Orient" },
  { id: "brief", label: "Brief", detail: "Capture mission, scope and constraints", lane: "Design" },
  { id: "drivers", label: "Drivers", detail: "Prioritize quality scenarios and tactics", lane: "Design" },
  { id: "model", label: "Model", detail: "Create logical and physical architecture views", lane: "Design" },
  { id: "synthesize", label: "Synthesize", detail: "Compare recommendations and design options", lane: "Design" },
  { id: "assure", label: "Assure", detail: "Review decisions, conformance and runtime posture", lane: "Assure" },
  { id: "operate", label: "Operate", detail: "Govern knowledge, providers, repos and workers", lane: "Operate" },
];


export type JourneyTarget =
  | { kind: "workspace"; id: WorkspaceModeId }
  | { kind: "stage"; id: ArchitectureStage }
  | { kind: "admin"; tab: Extract<NavigationItem, { kind: "admin" }>["tab"] }
  | { kind: "knowledge"; tab: Extract<NavigationItem, { kind: "knowledge" }>["tab"] }
  | { kind: "capability"; id: string }
  | { kind: "coauthor"; prompt: string };

export type RoleJourneyStep = {
  id: string;
  label: string;
  detail: string;
  target: JourneyTarget;
};

export type RoleJourneyDefinition = {
  id: ExperienceProfileId;
  label: string;
  shortLabel: string;
  roleFamily: string;
  mission: string;
  success: string;
  watchFor: string;
  navigationKeys: string[];
  path: RoleJourneyStep[];
  coAuthorPrompt: string;
};

export type ProjectRoleJourneyDefinition = {
  role: string;
  label: string;
  primaryNeed: string;
  bestStart: JourneyTarget;
  uxRisk: string;
};

export function navigationItemKey(item: NavigationItem): string {
  if (item.kind === "stage") return `stage:${item.id}`;
  if (item.kind === "admin") return `admin:${item.tab}`;
  if (item.kind === "knowledge") return `knowledge:${item.tab}`;
  return `workspace:${item.id}`;
}

export const roleJourneyCatalog: Record<ExperienceProfileId, RoleJourneyDefinition> = {
  "solution-architect": {
    id: "solution-architect",
    label: "Solution Architect",
    shortLabel: "Solution",
    roleFamily: "Design author",
    mission: "Convert intent into a complete, defensible architecture model with decisions, trade-offs and review evidence.",
    success: "A reviewable solution pack: brief, drivers, model, decisions, fitness tests and handoff artifacts.",
    watchFor: "Avoid jumping into synthesis before constraints, quality scenarios and boundaries are clear.",
    navigationKeys: [
      "workspace:cockpit", "workspace:activation", "stage:designIntent", "workspace:quality", "stage:logicalApplication",
      "stage:applicationRealization", "stage:logicalTechnology", "stage:physicalTechnology", "workspace:patterns", "workspace:synthesis",
      "stage:validationRealization", "workspace:governance", "workspace:collaboration", "workspace:conformance"
    ],
    path: [
      { id: "sa-orient", label: "Orient", detail: "Read project health and missing work", target: { kind: "workspace", id: "cockpit" } },
      { id: "sa-activate", label: "Activate", detail: "Seed the architecture journey", target: { kind: "workspace", id: "activation" } },
      { id: "sa-brief", label: "Brief", detail: "Capture mission, constraints and assumptions", target: { kind: "stage", id: "designIntent" } },
      { id: "sa-drivers", label: "Drivers", detail: "Rank scenarios and tactics", target: { kind: "workspace", id: "quality" } },
      { id: "sa-model", label: "Model", detail: "Create logical/application views", target: { kind: "stage", id: "logicalApplication" } },
      { id: "sa-patterns", label: "Patterns", detail: "Choose Pattern DNA with evidence", target: { kind: "workspace", id: "patterns" } },
      { id: "sa-synth", label: "Synthesize", detail: "Compare options and implications", target: { kind: "workspace", id: "synthesis" } },
      { id: "sa-review", label: "Realize", detail: "Generate review pack and ADRs", target: { kind: "stage", id: "validationRealization" } },
    ],
    coAuthorPrompt: "Act as my architecture co-author. Identify the next missing design input, ask only material questions, and propose the safest next modelling action.",
  },
  "enterprise-architect": {
    id: "enterprise-architect",
    label: "Enterprise Architect",
    shortLabel: "Enterprise",
    roleFamily: "Portfolio and standards",
    mission: "Assess fit to enterprise standards, reuse opportunities, governance posture and strategic risk across projects.",
    success: "A portfolio-grade decision view showing risk, duplicates, standards impact, exceptions and investment implications.",
    watchFor: "Avoid burying portfolio and governance questions inside project-level canvas work.",
    navigationKeys: [
      "workspace:cockpit", "workspace:portfolio", "workspace:comparison", "workspace:pilot", "workspace:governance",
      "workspace:collaboration", "stage:validationRealization", "workspace:patterns", "workspace:conformance", "workspace:knowledge",
      "knowledge:overview", "admin:releases", "admin:patterns", "admin:audit"
    ],
    path: [
      { id: "ea-orient", label: "Orient", detail: "See portfolio/project posture", target: { kind: "workspace", id: "cockpit" } },
      { id: "ea-portfolio", label: "Portfolio", detail: "Find concentration and reuse risk", target: { kind: "workspace", id: "portfolio" } },
      { id: "ea-compare", label: "Compare", detail: "Review option deltas", target: { kind: "workspace", id: "comparison" } },
      { id: "ea-govern", label: "Govern", detail: "Check obligations and approvals", target: { kind: "workspace", id: "governance" } },
      { id: "ea-standards", label: "Patterns", detail: "Validate standard pattern fit", target: { kind: "workspace", id: "patterns" } },
      { id: "ea-pilot", label: "Pilot", detail: "Evaluate readiness evidence", target: { kind: "workspace", id: "pilot" } },
      { id: "ea-release", label: "Release", detail: "Review knowledge release pinning", target: { kind: "admin", tab: "releases" } },
    ],
    coAuthorPrompt: "Act as an enterprise architecture reviewer. Summarize portfolio risk, standard exceptions, duplicated capabilities and the decision needed next.",
  },
  "platform-architect": {
    id: "platform-architect",
    label: "Platform Architect",
    shortLabel: "Platform",
    roleFamily: "Runtime and technology",
    mission: "Connect technology choices, topology, runtime evidence, security, drift and conformance into an operable architecture.",
    success: "A deployment-ready architecture with runtime posture, drift/remediation plan, controls and operational evidence.",
    watchFor: "Avoid treating physical topology, operations and conformance as separate disconnected reports.",
    navigationKeys: [
      "workspace:cockpit", "stage:logicalTechnology", "stage:physicalTechnology", "workspace:security", "workspace:drift",
      "workspace:conformance", "workspace:operations", "workspace:runtime", "workspace:synthesis", "workspace:governance",
      "admin:repositories", "admin:repoPilot", "admin:production"
    ],
    path: [
      { id: "pa-orient", label: "Orient", detail: "See technical readiness", target: { kind: "workspace", id: "cockpit" } },
      { id: "pa-logical-tech", label: "Capabilities", detail: "Model vendor-neutral capabilities", target: { kind: "stage", id: "logicalTechnology" } },
      { id: "pa-physical", label: "Topology", detail: "Model products and deployment", target: { kind: "stage", id: "physicalTechnology" } },
      { id: "pa-security", label: "Secure", detail: "Check controls and live risk", target: { kind: "workspace", id: "security" } },
      { id: "pa-drift", label: "Drift", detail: "Compare intended vs actual", target: { kind: "workspace", id: "drift" } },
      { id: "pa-conform", label: "Conform", detail: "Run checks and evidence gates", target: { kind: "workspace", id: "conformance" } },
      { id: "pa-ops", label: "Operate", detail: "View telemetry and hotspots", target: { kind: "workspace", id: "operations" } },
      { id: "pa-runtime", label: "Runtime", detail: "Inspect runtime collectors", target: { kind: "workspace", id: "runtime" } },
    ],
    coAuthorPrompt: "Act as a platform architect. Connect current architecture choices to runtime risk, drift, conformance and operational readiness.",
  },
  reviewer: {
    id: "reviewer",
    label: "Architecture Reviewer",
    shortLabel: "Reviewer",
    roleFamily: "Independent assurance",
    mission: "Inspect evidence, validate decisions, record findings and approve only when risk and traceability are acceptable.",
    success: "A clear review disposition: approved, changes requested or rejected with evidence and next actions.",
    watchFor: "Avoid forcing reviewers through authoring screens before they can see findings, decisions and evidence.",
    navigationKeys: [
      "workspace:cockpit", "stage:validationRealization", "workspace:governance", "workspace:comparison", "workspace:collaboration",
      "workspace:security", "workspace:conformance", "workspace:drift", "workspace:runtime", "admin:audit", "workspace:patterns"
    ],
    path: [
      { id: "rv-orient", label: "Orient", detail: "Read review posture", target: { kind: "workspace", id: "cockpit" } },
      { id: "rv-review", label: "Review", detail: "Inspect findings and ADR quality", target: { kind: "stage", id: "validationRealization" } },
      { id: "rv-govern", label: "Governance", detail: "Check approvals and obligations", target: { kind: "workspace", id: "governance" } },
      { id: "rv-compare", label: "Compare", detail: "Test decisions against options", target: { kind: "workspace", id: "comparison" } },
      { id: "rv-evidence", label: "Evidence", detail: "Check conformance evidence", target: { kind: "workspace", id: "conformance" } },
      { id: "rv-collab", label: "Threads", detail: "Resolve review conversations", target: { kind: "workspace", id: "collaboration" } },
      { id: "rv-audit", label: "Audit", detail: "Inspect traceability events", target: { kind: "admin", tab: "audit" } },
    ],
    coAuthorPrompt: "Act as an independent architecture reviewer. Give me the review decision path, blockers, evidence gaps and questions to raise.",
  },
  "knowledge-curator": {
    id: "knowledge-curator",
    label: "Knowledge Curator",
    shortLabel: "Curator",
    roleFamily: "Architecture brain operations",
    mission: "Operate the governed knowledge mesh: claims, contradictions, normalization, Pattern DNA and signed releases.",
    success: "A trustworthy knowledge release with reviewed records, resolved contradictions and auditable provenance.",
    watchFor: "Avoid hiding curation queues behind generic admin labels; curators need queue-first navigation.",
    navigationKeys: [
      "workspace:cockpit", "admin:mindFactory", "knowledge:overview", "knowledge:claims", "knowledge:contradictions", "knowledge:duplicates",
      "knowledge:synonyms", "knowledge:corroboration", "knowledge:sources", "knowledge:activity", "admin:sources", "admin:patterns",
      "admin:releases", "workspace:patterns", "admin:models", "admin:audit"
    ],
    path: [
      { id: "kc-orient", label: "Orient", detail: "See brain readiness", target: { kind: "workspace", id: "cockpit" } },
      { id: "kc-mind", label: "Mind Factory", detail: "Inspect ingest to activation", target: { kind: "admin", tab: "mindFactory" } },
      { id: "kc-claims", label: "Claims", detail: "Review candidate knowledge", target: { kind: "knowledge", tab: "claims" } },
      { id: "kc-conflicts", label: "Conflicts", detail: "Triage contradictions", target: { kind: "knowledge", tab: "contradictions" } },
      { id: "kc-normalize", label: "Normalize", detail: "Deduplicate and map synonyms", target: { kind: "knowledge", tab: "duplicates" } },
      { id: "kc-dna", label: "Pattern DNA", detail: "Curate pattern evidence", target: { kind: "admin", tab: "patterns" } },
      { id: "kc-release", label: "Release", detail: "Promote and pin release", target: { kind: "admin", tab: "releases" } },
    ],
    coAuthorPrompt: "Act as a knowledge curator. Prioritize claim review, contradiction handling, duplicate normalization and release readiness.",
  },
  administrator: {
    id: "administrator",
    label: "Administrator",
    shortLabel: "Admin",
    roleFamily: "Platform control plane",
    mission: "Configure secure operations for AIW: tenants, RBAC, model routes, repos, workers, audit and production readiness.",
    success: "A production-ready tenant with secure roles, healthy routes, configured connectors, running workers and no launch blockers.",
    watchFor: "Avoid mixing system administration with architecture design unless the user explicitly opens all capabilities.",
    navigationKeys: [
      "workspace:cockpit", "admin:overview", "admin:production", "admin:security", "admin:models", "admin:repositories", "admin:repoPilot",
      "admin:sources", "admin:tenant", "admin:audit", "admin:mindFactory", "workspace:runtime", "workspace:operations", "workspace:security", "workspace:knowledge"
    ],
    path: [
      { id: "ad-control", label: "Control", detail: "Open platform posture", target: { kind: "admin", tab: "overview" } },
      { id: "ad-security", label: "Security", detail: "Set RBAC and SSO posture", target: { kind: "admin", tab: "security" } },
      { id: "ad-routes", label: "Routes", detail: "Configure LLM providers", target: { kind: "admin", tab: "models" } },
      { id: "ad-repos", label: "Repos", detail: "Connect GitHub evidence", target: { kind: "admin", tab: "repositories" } },
      { id: "ad-workers", label: "Workers", detail: "Check jobs and queues", target: { kind: "admin", tab: "repoPilot" } },
      { id: "ad-tenant", label: "Tenant", detail: "Set policies and flags", target: { kind: "admin", tab: "tenant" } },
      { id: "ad-ready", label: "Readiness", detail: "Close launch blockers", target: { kind: "admin", tab: "production" } },
    ],
    coAuthorPrompt: "Act as AIW platform administrator. Tell me the production readiness blockers and the safest order to configure this tenant.",
  },
};

export const projectRoleJourneys: ProjectRoleJourneyDefinition[] = [
  { role: "owner", label: "Architecture Owner / Sponsor", primaryNeed: "Know health, risks, approvals and what decision is needed next.", bestStart: { kind: "workspace", id: "cockpit" }, uxRisk: "Do not force sponsors into detailed modelling before showing readiness and decisions." },
  { role: "architect", label: "Solution Architect", primaryNeed: "Model the architecture, choose patterns and produce reviewable artifacts.", bestStart: { kind: "stage", id: "designIntent" }, uxRisk: "Do not scatter design actions across admin or runtime screens." },
  { role: "reviewer", label: "Independent Reviewer", primaryNeed: "Validate evidence, findings, decisions and stage readiness.", bestStart: { kind: "stage", id: "validationRealization" }, uxRisk: "Do not hide review work queues inside collaboration only." },
  { role: "governance", label: "ARB / Governance", primaryNeed: "Approve, request changes and monitor policy obligations.", bestStart: { kind: "workspace", id: "governance" }, uxRisk: "Do not make obligations look like optional recommendations." },
  { role: "contributor", label: "Contributor", primaryNeed: "Add evidence, comments and scoped architecture details without changing governed decisions silently.", bestStart: { kind: "workspace", id: "collaboration" }, uxRisk: "Do not expose destructive admin actions as routine contribution controls." },
  { role: "viewer", label: "Viewer / Executive Reader", primaryNeed: "Understand status, risk, decisions and outcomes quickly.", bestStart: { kind: "workspace", id: "cockpit" }, uxRisk: "Do not overload read-only users with authoring tools and technical switches." },
];
