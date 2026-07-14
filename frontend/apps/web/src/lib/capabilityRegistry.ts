// In-app capability registry (feature → lane → status) — extracted from App.tsx honoring the 820-line
// shrink-only budget (App decomposition). Pure data/helpers; no behavior change.
export type CapabilityLane = "Orient" | "Design" | "Assure" | "Operate";
export type CapabilityStatus = "Visible" | "Exposed" | "API-backed" | "Brain hook";

export const capabilityRegistry: Array<{
  id: string;
  lane: CapabilityLane;
  label: string;
  purpose: string;
  surface: string;
  status: CapabilityStatus;
}> = [
  {
    id: "project-cockpit",
    lane: "Orient",
    label: "Project Cockpit",
    purpose: "Understand health, gaps, risks and what should happen next.",
    surface: "Project Cockpit",
    status: "Visible",
  },
  {
    id: "guided-interview",
    lane: "Design",
    label: "Guided design interview",
    purpose: "Let AIW ask only the questions that reduce material architecture uncertainty.",
    surface: "Requirements & Intent stage + stage-aware Co-author",
    status: "Exposed",
  },
  {
    id: "decision-radar",
    lane: "Design",
    label: "Decision Radar",
    purpose: "Inspect styles, patterns, obligations, questions, evidence and anti-patterns in context.",
    surface: "Universal drawer",
    status: "Exposed",
  },
  {
    id: "pattern-studio",
    lane: "Design",
    label: "Pattern Studio",
    purpose: "Explore Pattern DNA, compose patterns, test fitness and manage release readiness.",
    surface: "Specialist Workspaces → Pattern Studio",
    status: "Visible",
  },
  {
    id: "architecture-synthesis",
    lane: "Design",
    label: "Architecture Synthesis",
    purpose: "Review AIW-generated options, rationale, implications and alternatives.",
    surface: "Specialist Workspaces → Architecture Synthesis",
    status: "Visible",
  },
  {
    id: "generate-sdd",
    lane: "Assure",
    label: "Generate SDD / delivery pack",
    purpose: "Produce reviewable ADRs, fitness tests and handoff artifacts from the canonical model.",
    surface: "Generate SDD Pack lifecycle stage",
    status: "Exposed",
  },
  {
    id: "conformance",
    lane: "Assure",
    label: "Continuous Conformance",
    purpose: "Check architecture decisions against gates, controls, evidence and waivers.",
    surface: "Continuous Conformance",
    status: "Visible",
  },
  {
    id: "drift-waivers",
    lane: "Assure",
    label: "Drift and waiver workflow",
    purpose: "Compare expected vs actual architecture and manage remediation or waivers.",
    surface: "Drift Control + Conformance",
    status: "API-backed",
  },
  {
    id: "knowledge-ops",
    lane: "Operate",
    label: "Knowledge Ops queues",
    purpose: "Review claims, contradictions, duplicates, synonyms and corroboration before release.",
    surface: "Admin & Knowledge Ops",
    status: "Exposed",
  },
  {
    id: "pattern-dna-admin",
    lane: "Operate",
    label: "Pattern DNA administration",
    purpose: "Stage pattern edits, obligations, compatibility rules and evidence coverage.",
    surface: "Admin → Pattern DNA",
    status: "Exposed",
  },
  {
    id: "release-manager",
    lane: "Operate",
    label: "Knowledge Release Manager",
    purpose: "Validate candidates, promote signed releases and pin releases to tenant scope.",
    surface: "Admin → Knowledge Releases",
    status: "Exposed",
  },
  {
    id: "github-pr-preview",
    lane: "Operate",
    label: "GitHub PR preview",
    purpose: "Preview repository evidence changes and keep writes approval-gated.",
    surface: "Admin → GitHub Repos / Repo Pilot",
    status: "API-backed",
  },
  {
    id: "durable-events",
    lane: "Operate",
    label: "Durable event queue / workers",
    purpose: "Track jobs, scans, retries and worker loops behind the architecture brain.",
    surface: "Admin → Workers",
    status: "API-backed",
  },
  {
    id: "security-rbac",
    lane: "Operate",
    label: "Security, SSO and RBAC",
    purpose: "Validate role mappings, tenant policies, OIDC posture and authorization boundaries.",
    surface: "Admin → Security & RBAC",
    status: "Exposed",
  },
];
