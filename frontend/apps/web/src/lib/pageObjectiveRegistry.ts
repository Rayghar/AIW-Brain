import type { ArchitectureStage } from "@aiw/domain";
import type { ExperienceProfileId, WorkspaceModeId } from "./experienceProfiles";

export type PageObjective = {
  id: string;
  title: string;
  objective: string;
  primaryTasks: string[];
  outputs: string[];
  surfacedCapabilities: string[];
};

export const lifecyclePageObjectives: Record<string, PageObjective> = {
  requirements: {
    id: "requirements",
    title: "Requirements & Intent",
    objective: "Capture the business goal, scope, stakeholders, constraints and assumptions that make architecture recommendations defensible.",
    primaryTasks: ["Define goal and scope", "Capture constraints and assumptions", "Run guided interview", "Extract quality drivers"],
    outputs: ["Design brief", "Assumptions log", "Constraint set", "Driver candidates"],
    surfacedCapabilities: ["Design brief analysis", "Guided interview", "Missing-intent findings", "Co-Architect prompts"],
  },
  quality: {
    id: "quality",
    title: "Quality Drivers",
    objective: "Convert quality attributes into measurable scenarios, trade-offs, tactics and deterministic scoring inputs.",
    primaryTasks: ["Rank quality attributes", "Define scenarios", "Resolve trade-offs", "Export expert review pack"],
    outputs: ["Quality scenario set", "Tactic map", "Conflict list", "Calibration evidence"],
    surfacedCapabilities: ["Quality scoring", "Tactics catalog", "Driver conflict checks", "Expert review export"],
  },
  logicalApplication: {
    id: "logicalApplication",
    title: "Logical Application",
    objective: "Model domains, services, APIs, data ownership and integration boundaries before realization choices are made.",
    primaryTasks: ["Add domains and services", "Define APIs/events/data", "Apply patterns", "Scan missing interfaces"],
    outputs: ["Logical service map", "Interface model", "Pattern obligations", "Boundary risks"],
    surfacedCapabilities: ["Architecture library", "Drop preflight", "Anti-pattern scan", "Brain signals", "Inspector"],
  },
  applicationRealization: {
    id: "applicationRealization",
    title: "Application Realization",
    objective: "Translate the logical architecture into deployable units, contracts, owners and implementation boundaries.",
    primaryTasks: ["Define deployable units", "Map modules and owners", "Record contracts", "Assess implementation risk"],
    outputs: ["Deployable unit map", "Ownership model", "Contract list", "Realization risks"],
    surfacedCapabilities: ["Synthesis", "Contract inspection", "Compliance check", "Decision recording"],
  },
  logicalTechnology: {
    id: "logicalTechnology",
    title: "Logical Technology",
    objective: "Define vendor-neutral platform, data, messaging, identity and observability capabilities required by the design.",
    primaryTasks: ["Select capabilities", "Map platform constraints", "Check security posture", "Prepare topology inputs"],
    outputs: ["Technology capability map", "Platform constraints", "Control obligations", "Topology candidates"],
    surfacedCapabilities: ["Technology library", "Security checks", "Conformance plan", "Runtime readiness"],
  },
  physicalTechnology: {
    id: "physicalTechnology",
    title: "Physical Technology",
    objective: "Model deployment topology, zones, runtime posture, failover and operational evidence.",
    primaryTasks: ["Add zones and nodes", "Model failover", "Import runtime evidence", "Evaluate SLO posture"],
    outputs: ["Topology model", "Runtime evidence", "SLO posture", "Operational risks"],
    surfacedCapabilities: ["Topology from telemetry", "Runtime inventory", "Ops intelligence", "Drift assessment"],
  },
  validationRealization: {
    id: "validationRealization",
    title: "Review & Assurance",
    objective: "Validate decisions, evidence, governance obligations, conformance checks and readiness before handoff.",
    primaryTasks: ["Run review", "Generate ADRs", "Check evidence", "Request changes or approve"],
    outputs: ["Review findings", "ADRs", "Evidence ledger", "Handoff disposition"],
    surfacedCapabilities: ["Review studio", "Governance evaluation", "Conformance assess", "Handoff pack"],
  },
  sdd: {
    id: "sdd",
    title: "SDD Pack",
    objective: "Package the approved architecture into SDD, diagrams, ADRs, fitness tests, manifest and delivery ZIP.",
    primaryTasks: ["Generate SDD", "Preview pack", "Export diagrams", "Download delivery ZIP"],
    outputs: ["SDD", "Delivery manifest", "Diagram exports", "Review pack"],
    surfacedCapabilities: ["Artifact composer", "SDD delivery room", "Diagram export", "Fitness-test delivery"],
  },
};

export const workspacePageObjectives: Partial<Record<WorkspaceModeId, PageObjective>> = {
  cockpit: {
    id: "cockpit",
    title: "Project Cockpit",
    objective: "Orient the project, show readiness, surface blockers and route the user to the next architectural move.",
    primaryTasks: ["Continue where you left off", "Review blockers", "Check SDD readiness", "Open latest outputs"],
    outputs: ["Next action", "Readiness summary", "Risk list", "Project status"],
    surfacedCapabilities: ["Project snapshots", "Storage status", "Lifecycle progress", "Brain recommendations"],
  },
  portfolio: {
    id: "portfolio",
    title: "Portfolio Oversight",
    objective: "Find duplication, reuse opportunities, risk concentration and standards impact across architecture work.",
    primaryTasks: ["Assess portfolio risk", "Find reuse", "Compare standards impact", "Prioritize interventions"],
    outputs: ["Portfolio risk view", "Reuse candidates", "Standards exceptions", "Intervention list"],
    surfacedCapabilities: ["Portfolio catalog", "Standards impact", "Dependency view", "Cost/risk posture"],
  },
  governance: {
    id: "governance",
    title: "Governance",
    objective: "Check obligations, approvals, waivers and policy posture as executable tasks rather than policy text.",
    primaryTasks: ["Evaluate obligations", "Request approval", "Create waiver", "Review remediation"],
    outputs: ["Governance posture", "Waiver list", "Approval state", "Policy gaps"],
    surfacedCapabilities: ["Rule packs", "Approval readiness", "Waivers", "Remediation preview"],
  },
  synthesis: {
    id: "synthesis",
    title: "Architecture Synthesis",
    objective: "Compare and apply architecture options with rationale, trade-offs and decision recording.",
    primaryTasks: ["Generate options", "Compare trade-offs", "Apply preview", "Record decision"],
    outputs: ["Option set", "Trade-off matrix", "Decision record", "Artifact draft"],
    surfacedCapabilities: ["Synthesis runs", "Simulations", "Apply preview", "Decision recording"],
  },
  patterns: {
    id: "patterns",
    title: "Pattern Studio",
    objective: "Choose, compare and apply governed patterns; avoid treating the pattern library like a textbook.",
    primaryTasks: ["Choose pattern", "Compare pattern", "Apply obligations", "Generate fitness tests"],
    outputs: ["Accepted patterns", "Obligations", "Fitness tests", "Pattern evidence"],
    surfacedCapabilities: ["Pattern DNA", "Composition preview", "Benchmarks", "Fitness function generation"],
  },
  conformance: {
    id: "conformance",
    title: "Continuous Conformance",
    objective: "Validate checks, evidence, gates and remediation plans against the intended architecture.",
    primaryTasks: ["Run checks", "Inspect evidence", "Preview remediation", "Export conformance plan"],
    outputs: ["Conformance report", "Evidence gaps", "Remediation plan", "Fitness loop"],
    surfacedCapabilities: ["Conformance assess", "Evidence gates", "Repo scan", "Remediation plans"],
  },
  admin: {
    id: "admin",
    title: "Admin Control Plane",
    objective: "Operate AIW: model routes, repos, workers, tenant controls, security and production readiness.",
    primaryTasks: ["Configure route", "Test provider", "Connect repo", "Check readiness"],
    outputs: ["Control-plane posture", "Route health", "Connector status", "Audit trail"],
    surfacedCapabilities: ["LLM routes", "Repository connectors", "Worker queues", "Tenant policies", "Security RBAC"],
  },
  knowledge: {
    id: "knowledge",
    title: "Knowledge Operations",
    objective: "Govern the knowledge substrate through claims, contradictions, normalization, releases and provenance.",
    primaryTasks: ["Review claims", "Resolve conflicts", "Normalize duplicates", "Promote release"],
    outputs: ["Reviewed records", "Contradiction decisions", "Release candidate", "Provenance trail"],
    surfacedCapabilities: ["Claims", "Contradictions", "Synonyms", "Corroboration", "Knowledge releases"],
  },
  runtime: {
    id: "runtime",
    title: "Enterprise Runtime",
    objective: "Inspect runtime collectors, inventory, deployment evidence and live architecture posture.",
    primaryTasks: ["Import inventory", "Check collectors", "Generate topology", "Export runtime evidence"],
    outputs: ["Runtime inventory", "Collector posture", "Topology evidence", "Operational summary"],
    surfacedCapabilities: ["Runtime collectors", "Topology from telemetry", "SLO evaluation", "Observability export"],
  },
};

export function resolvePageObjective(params: {
  workspaceMode: WorkspaceModeId;
  activeStage: ArchitectureStage;
  lifecycleStepId?: string;
  roleId?: ExperienceProfileId;
}): PageObjective {
  if (params.lifecycleStepId === "sdd") return lifecyclePageObjectives.sdd!;
  if (params.workspaceMode === "quality") return lifecyclePageObjectives.quality!;
  if (params.workspaceMode === "design") {
    const stageKey = params.activeStage === "designIntent" ? "requirements" : params.activeStage;
    return lifecyclePageObjectives[stageKey] ?? lifecyclePageObjectives.logicalApplication!;
  }
  return workspacePageObjectives[params.workspaceMode] ?? {
    id: params.workspaceMode,
    title: "Task Workspace",
    objective: "Complete the task set for the current role using the relevant AIW capabilities.",
    primaryTasks: ["Review posture", "Run task", "Inspect output", "Record next action"],
    outputs: ["Task result", "Evidence", "Decision", "Next action"],
    surfacedCapabilities: ["Command search", "Capability map", "Brain details"],
  };
}

export const featureUiRegistry = [
  { feature: "MongoDB Atlas persistence", ui: "Admin Control Plane > Storage status and Project Hub persistence badge" },
  { feature: "Guided design interview", ui: "Requirements > Interview task and Co-Architect prompt" },
  { feature: "Drop preview / semantic preflight", ui: "Logical Application canvas > Library and Inspector" },
  { feature: "Anti-pattern scan", ui: "Logical Application and Review > Brain/Decision Radar task" },
  { feature: "Pattern DNA / composition", ui: "Pattern Studio, Library, Synthesis and Knowledge Curator > Pattern DNA" },
  { feature: "Fitness-test generation", ui: "Review and SDD Pack outputs" },
  { feature: "Governance evaluation / waivers", ui: "Governance workspace and Review task launcher" },
  { feature: "Runtime topology import", ui: "Platform & Runtime rail > Physical Tech, Runtime and Ops Intel" },
  { feature: "LLM routes / provider tests", ui: "Administrator > LLM Routes" },
  { feature: "Repository connectors / PR preview", ui: "Administrator > Repositories and Workers; Reviewer > Evidence" },
  { feature: "Knowledge releases / pins", ui: "Knowledge Curator > Releases and Enterprise Architect > Releases" },
  { feature: "Audit trail", ui: "Administrator > Audit and Reviewer > Audit" },
];
