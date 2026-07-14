import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  CloudCog,
  DatabaseZap,
  Download,
  FileArchive,
  FileCheck2,
  FileText,
  HelpCircle,
  Layers3,
  Network,
  Route,
  ShieldCheck,
  Sparkles,
  Rocket,
  WandSparkles,
} from "lucide-react";
import type { ArchitectureStage } from "@aiw/domain";
import { composeSdd } from "@aiw/engine";
import { useWorkspaceStore } from "../store/workspaceStore";
import { can } from "../lib/roleAccess";

type JourneyStepId =
  | "requirements"
  | "quality"
  | "context"
  | "logical"
  | "realization"
  | "logicalTechnology"
  | "physicalTechnology"
  | "review"
  | "sdd";

type JourneyStatus = "complete" | "ready" | "needs-work" | "not-started";

type WorkspaceTarget =
  | { kind: "stage"; stage: ArchitectureStage }
  | { kind: "workspace"; mode: "activation" | "quality" | "patterns" | "synthesis" | "conformance" | "governance" | "collaboration" | "runtime" | "operations" | "cockpit" }
  | { kind: "sdd" };

interface JourneyCheck {
  label: string;
  done: boolean;
  evidence?: string | undefined;
}

interface JourneyStep {
  id: JourneyStepId;
  index: number;
  title: string;
  shortTitle: string;
  purpose: string;
  target: WorkspaceTarget;
  outputs: string[];
  tools: string[];
  aiHooks: string[];
  checks: JourneyCheck[];
  coAuthorPrompt: string;
}

interface ArchitectureLifecycleJourneyProps {
  onOpenDecisionRadar: () => void;
  onOpenCoArchitect: (prompt: string) => void;
  onShowDetails?: () => void;
}

const statusLabel: Record<JourneyStatus, string> = {
  complete: "Complete",
  ready: "Ready for handoff",
  "needs-work": "Needs work",
  "not-started": "Not started",
};

const statusIcon: Record<JourneyStatus, typeof CheckCircle2> = {
  complete: BadgeCheck,
  ready: CheckCircle2,
  "needs-work": AlertTriangle,
  "not-started": HelpCircle,
};

function downloadText(filename: string, content: string, type = "text/markdown") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "architecture";
}

function stepStatus(checks: JourneyCheck[], approved: boolean, handoffRecorded: boolean): JourneyStatus {
  const done = checks.filter((check) => check.done).length;
  if (approved || handoffRecorded) return "complete";
  if (done === checks.length && checks.length > 0) return "ready";
  if (done > 0) return "needs-work";
  return "not-started";
}

function approvalStatusFor(stage: ArchitectureStage, project: ReturnType<typeof useWorkspaceStore.getState>["project"]) {
  return [...project.stageApprovals]
    .reverse()
    .find((approval) => approval.stage === stage)?.status;
}

function stageNodeCount(project: ReturnType<typeof useWorkspaceStore.getState>["project"], stage: ArchitectureStage) {
  return project.nodes.filter((node) => node.stage === stage).length;
}

function projectValue(value?: string | string[]) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return value?.trim() ?? "";
}

export function ArchitectureLifecycleJourney({
  onOpenDecisionRadar,
  onOpenCoArchitect,
  onShowDetails,
}: ArchitectureLifecycleJourneyProps) {
  const project = useWorkspaceStore((state) => state.project);
  const library = useWorkspaceStore((state) => state.library);
  const workspaceMode = useWorkspaceStore((state) => state.workspaceMode);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage);
  const createSnapshot = useWorkspaceStore((state) => state.createSnapshot);
  const requestStageApproval = useWorkspaceStore((state) => state.requestStageApproval);
  const experienceProfile = useWorkspaceStore((state) => state.experienceProfile);
  const canGenerateArtifacts = can(experienceProfile, "artifact.generate");
  const findings = useWorkspaceStore((state) => state.findings);
  const conformanceAssessment = useWorkspaceStore((state) => state.conformanceAssessment);
  const contextual = useWorkspaceStore((state) => state.contextual);
  const lifecycleCompletions = useWorkspaceStore((state) => state.lifecycleCompletions);
  const lifecycleArtifacts = useWorkspaceStore((state) => state.lifecycleArtifacts);
  const completeLifecycleStep = useWorkspaceStore((state) => state.completeLifecycleStep);
  const reopenLifecycleStep = useWorkspaceStore((state) => state.reopenLifecycleStep);
  const markLifecycleArtifactDownloaded = useWorkspaceStore((state) => state.markLifecycleArtifactDownloaded);
  const activeLifecycleStep = useWorkspaceStore((state) => state.activeLifecycleStep);
  const setActiveLifecycleStep = useWorkspaceStore((state) => state.setActiveLifecycleStep);
  const [expanded, setExpanded] = useState<JourneyStepId | "overview">(activeLifecycleStep);
  const selectExpanded = (stepId: JourneyStepId | "overview") => {
    setExpanded(stepId);
    setActiveLifecycleStep(stepId);
  };
  const [sddPreviewOpen, setSddPreviewOpen] = useState(false);
  const [sddPackBusy, setSddPackBusy] = useState(false);
  const [sddPackMessage, setSddPackMessage] = useState("Generate the delivery pack when the review stage is ready.");

  useEffect(() => {
    const listener = (event: Event) => {
      const stepId = (event as CustomEvent<{ stepId?: JourneyStepId | string }>).detail?.stepId;
      if (!stepId) return;
      if (["requirements", "quality", "context", "logical", "realization", "logicalTechnology", "physicalTechnology", "review", "sdd"].includes(stepId)) {
        selectExpanded(stepId as JourneyStepId);
        setSddPreviewOpen(stepId === "sdd");
      }
    };
    window.addEventListener("aiw:open-lifecycle-step", listener);
    return () => window.removeEventListener("aiw:open-lifecycle-step", listener);
  }, []);

  const steps = useMemo<JourneyStep[]>(() => {
    const context = project.context ?? {};
    const highPriorityDrivers = project.qualityPriorities.filter((priority) => priority.weight >= 3).length;
    const acceptedStyles = project.styleDecisions.filter((decision) => decision.status === "accepted").length;
    const acceptedPatterns = project.patternSelections?.filter((pattern) => pattern.status === "accepted").length ?? 0;
    const reviewApproval = approvalStatusFor("validationRealization", project);
    const approvedStages = new Set(project.stageApprovals.filter((approval) => approval.status === "approved").map((approval) => approval.stage));

    return [
      {
        id: "requirements",
        index: 1,
        title: "Requirements & Intent",
        shortTitle: "Requirements",
        purpose: "Capture the business problem, scope, stakeholders, constraints and success outcomes before AIW recommends architecture moves.",
        target: { kind: "stage", stage: "designIntent" },
        outputs: ["Architecture Design Brief", "Scope and assumptions register", "Initial risk and evidence questions"],
        tools: ["Design Brief Studio", "AI-assisted intake", "Project context fields", "Stakeholder and constraint capture"],
        aiHooks: ["Ask missing context questions", "Extract constraints", "Propose assumptions", "Identify early risks"],
        coAuthorPrompt: "Interview me like a senior software architect. Help me convert raw requirements into a complete architecture design brief with scope, constraints, assumptions, stakeholders and missing questions.",
        checks: [
          { label: "Problem statement captured", done: Boolean(project.description.trim()), evidence: project.description.slice(0, 90) },
          { label: "At least one business objective recorded", done: project.objectives.length > 0, evidence: project.objectives[0] },
          { label: "Architecture constraints recorded", done: project.constraints.length > 0, evidence: project.constraints[0] },
          { label: "Stakeholders or actors identified", done: Boolean(projectValue(context.stakeholders).length), evidence: projectValue(context.stakeholders) },
          { label: "Known systems or integration context captured", done: Boolean(projectValue(context.existingSystems).length || project.nodes.length > 0), evidence: projectValue(context.existingSystems) || `${project.nodes.length} model object(s)` },
        ],
      },
      {
        id: "quality",
        index: 2,
        title: "Quality Drivers",
        shortTitle: "Drivers",
        purpose: "Turn requirements into measurable architecture drivers, prioritized scenarios and trade-off tactics.",
        target: { kind: "workspace", mode: "quality" },
        outputs: ["Quality Attribute Scenario Pack", "Architecture Drivers Matrix", "Tactics and trade-off shortlist"],
        tools: ["Quality Attribute Studio", "Scenario templates", "Tactics catalog", "Priority weighting"],
        aiHooks: ["Generate measurable scenarios", "Detect conflicting drivers", "Recommend tactics", "Highlight trade-offs"],
        coAuthorPrompt: "Help me define measurable quality attribute scenarios from the current brief. Prioritize drivers and explain trade-offs for this software architecture.",
        checks: [
          { label: "At least three prioritized drivers", done: highPriorityDrivers >= 3, evidence: `${highPriorityDrivers} high-priority driver(s)` },
          { label: "Measurable quality scenarios recorded", done: project.qualityScenarios.length > 0, evidence: `${project.qualityScenarios.length} scenario(s)` },
          { label: "Security/resilience/operability considered", done: project.qualityPriorities.some((priority) => priority.weight >= 3), evidence: `${project.qualityPriorities.length} weighted attribute(s)` },
          { label: "Driver decisions trace to brief", done: Boolean(project.description.trim() && project.objectives.length), evidence: "Brief context available" },
        ],
      },
      {
        id: "context",
        index: 3,
        title: "System Context & Journeys",
        shortTitle: "System Context",
        purpose: "Establish the system of interest, actors, external systems and approved interaction journeys before internal decomposition.",
        target: { kind: "stage", stage: "logicalApplication" },
        outputs: ["System Context View", "Solution Journey Atlas", "Context interaction and boundary obligations"],
        tools: ["System Context Studio", "Interactive Journey Atlas", "Context lineage", "Boundary review"],
        aiHooks: ["Promote approved actors", "Map external interactions", "Expose trust crossings", "Identify unresolved context obligations"],
        coAuthorPrompt: "Use the approved requirements and journeys to draft a system context with the system of interest, actors, external systems, interactions and unresolved boundary questions.",
        checks: [
          { label: "Approved requirements intelligence exists", done: Boolean(project.requirementsIntelligence?.requirements.some((item) => item.status === "accepted")), evidence: `${project.requirementsIntelligence?.requirements.filter((item) => item.status === "accepted").length ?? 0} accepted requirement(s)` },
          { label: "Major solution journeys are approved", done: Boolean(project.requirementsIntelligence?.journeys.some((item) => item.status === "accepted")), evidence: `${project.requirementsIntelligence?.journeys.filter((item) => item.status === "accepted").length ?? 0} approved journey(s)` },
          { label: "System of interest is represented", done: project.nodes.some((node) => node.tags.includes("system-of-interest")), evidence: project.nodes.some((node) => node.tags.includes("system-of-interest")) ? "System boundary present" : "System boundary missing" },
          { label: "Actors and external systems are connected", done: project.edges.some((edge) => edge.stage === "logicalApplication"), evidence: `${project.edges.filter((edge) => edge.stage === "logicalApplication").length} context/logical relationship(s)` },
        ],
      },
      {
        id: "logical",
        index: 4,
        title: "Logical Application Architecture",
        shortTitle: "Logical App",
        purpose: "Model domains, capabilities, services, data ownership and key interactions at a technology-neutral level.",
        target: { kind: "stage", stage: "logicalApplication" },
        outputs: ["Logical Application View", "Component Responsibility Matrix", "Initial ADR candidates"],
        tools: ["Visual canvas", "Pattern Studio", "Decision Radar", "Service boundary modelling"],
        aiHooks: ["Suggest service boundaries", "Find anti-patterns", "Explain coupling risks", "Recommend architecture styles"],
        coAuthorPrompt: "Review my logical application architecture. Suggest domains, service boundaries, data ownership gaps, anti-patterns and decisions I should record.",
        checks: [
          { label: "Logical application objects exist", done: stageNodeCount(project, "logicalApplication") > 0, evidence: `${stageNodeCount(project, "logicalApplication")} logical object(s)` },
          { label: "Architecture style or pattern selected", done: acceptedStyles + acceptedPatterns > 0, evidence: `${acceptedStyles} style(s), ${acceptedPatterns} pattern(s)` },
          { label: "Relationships/dependencies modelled", done: project.edges.length > 0, evidence: `${project.edges.length} relationship(s)` },
          { label: "Quality drivers available for validation", done: project.qualityPriorities.some((priority) => priority.weight > 0), evidence: `${project.qualityPriorities.length} driver(s)` },
        ],
      },
      {
        id: "realization",
        index: 5,
        title: "Application Realization",
        shortTitle: "Realization",
        purpose: "Translate the logical model into implementable units, APIs, contracts, ownership boundaries and integration responsibilities.",
        target: { kind: "stage", stage: "applicationRealization" },
        outputs: ["Application Realization View", "API and integration contract outline", "Service ownership map"],
        tools: ["Application realization canvas", "Contract and ownership inspector", "Impact analysis", "Change proposal review"],
        aiHooks: ["Validate coupling", "Check transaction boundaries", "Spot missing interfaces", "Recommend API/event responsibilities"],
        coAuthorPrompt: "Convert this logical architecture into implementable application units. Check APIs, ownership, data responsibilities, coupling and transaction boundaries.",
        checks: [
          { label: "Realization objects exist", done: stageNodeCount(project, "applicationRealization") > 0, evidence: `${stageNodeCount(project, "applicationRealization")} realization object(s)` },
          { label: "Logical model exists upstream", done: stageNodeCount(project, "logicalApplication") > 0, evidence: `${stageNodeCount(project, "logicalApplication")} logical object(s)` },
          { label: "Dependencies or contracts mapped", done: project.edges.length > 1, evidence: `${project.edges.length} relationship(s)` },
          { label: "Open findings manageable", done: findings.filter((finding) => finding.severity === "HARD").length === 0, evidence: `${findings.length} finding(s)` },
        ],
      },
      {
        id: "logicalTechnology",
        index: 6,
        title: "Logical Technology Architecture",
        shortTitle: "Logical Tech",
        purpose: "Choose vendor-neutral platform capabilities, runtime services, data platforms, integration middleware and observability approach.",
        target: { kind: "stage", stage: "logicalTechnology" },
        outputs: ["Logical Technology View", "Technology Decision Matrix", "Platform fit assessment"],
        tools: ["Technology capability canvas", "Pattern compatibility", "Tactics advisor", "Governance constraints"],
        aiHooks: ["Compare technology options", "Check fit to quality drivers", "Flag prohibited technologies", "Explain operational burden"],
        coAuthorPrompt: "Help me select logical technology capabilities that fit the quality drivers, integration needs, security constraints and operating model.",
        checks: [
          { label: "Logical technology objects exist", done: stageNodeCount(project, "logicalTechnology") > 0, evidence: `${stageNodeCount(project, "logicalTechnology")} technology object(s)` },
          { label: "Application realization exists upstream", done: stageNodeCount(project, "applicationRealization") > 0, evidence: `${stageNodeCount(project, "applicationRealization")} realization object(s)` },
          { label: "Technology choices trace to drivers", done: project.qualityPriorities.some((priority) => priority.weight > 0), evidence: `${project.qualityPriorities.length} driver(s)` },
          { label: "Pattern obligations reviewed", done: contextual.obligations.length === 0 || contextual.obligations.some((obligation) => obligation.satisfied), evidence: `${contextual.obligations.length} obligation(s)` },
        ],
      },
      {
        id: "physicalTechnology",
        index: 7,
        title: "Physical Technology & Deployment",
        shortTitle: "Physical Tech",
        purpose: "Define deployment topology, environments, network/security zones, scaling posture, resilience and operations placement.",
        target: { kind: "stage", stage: "physicalTechnology" },
        outputs: ["Physical Deployment View", "Runtime topology", "Operational readiness checklist"],
        tools: ["Deployment canvas", "Enterprise Runtime", "Operational Intelligence", "Drift Control"],
        aiHooks: ["Validate resilience", "Check security zones", "Trace runtime evidence", "Find failure paths"],
        coAuthorPrompt: "Review the physical deployment architecture. Check resilience, zones, failover, scaling, observability and runtime-operational assumptions.",
        checks: [
          { label: "Physical deployment objects exist", done: stageNodeCount(project, "physicalTechnology") > 0, evidence: `${stageNodeCount(project, "physicalTechnology")} deployment object(s)` },
          { label: "Logical technology exists upstream", done: stageNodeCount(project, "logicalTechnology") > 0, evidence: `${stageNodeCount(project, "logicalTechnology")} logical technology object(s)` },
          { label: "Runtime or deployment evidence available", done: project.runtimeInventories.length > 0 || project.deploymentProfiles.length > 0 || project.inventoryCollectors.length > 0, evidence: `${project.runtimeInventories.length} runtime inventory source(s), ${project.inventoryCollectors.length} collector(s)` },
          { label: "Security or conformance posture considered", done: project.policyGates.length > 0 || project.activeRulePackIds.length > 0, evidence: `${project.policyGates.length} policy gate(s)` },
        ],
      },
      {
        id: "review",
        index: 8,
        title: "Review & Assurance",
        shortTitle: "Review",
        purpose: "Run the architecture critique, validate against governance and conformance rules, resolve blockers and prepare the handoff pack.",
        target: { kind: "stage", stage: "validationRealization" },
        outputs: ["Architecture Review Report", "ADR pack", "Risk and controls register", "Fitness test pack"],
        tools: ["Review Studio", "Continuous Conformance", "Governance Workspace", "Collaboration review threads"],
        aiHooks: ["Run critique", "Generate findings", "Draft ADRs", "Create fitness tests", "Prepare review questions"],
        coAuthorPrompt: "Act as an architecture review board. Review this design for blockers, evidence gaps, quality-driver alignment, policy obligations and SDD readiness.",
        checks: [
          { label: "All core model stages have content", done: ["logicalApplication", "applicationRealization", "logicalTechnology", "physicalTechnology"].every((stage) => stageNodeCount(project, stage as ArchitectureStage) > 0), evidence: `${project.nodes.length} total model object(s)` },
          { label: "Audit findings available", done: project.findings.length > 0 || findings.length > 0 || project.aiReviewHistory.length > 0, evidence: `${project.findings.length + findings.length} finding signal(s)` },
          { label: "Conformance assessment or policy gate available", done: Boolean(conformanceAssessment || project.policyGates.length > 0), evidence: conformanceAssessment ? `${conformanceAssessment.summary.healthScore} health · ${conformanceAssessment.summary.failed} failed` : `${project.policyGates.length} gate(s)` },
          { label: "Review approval path visible", done: Boolean(reviewApproval || project.reviewAssignments.length > 0), evidence: reviewApproval ?? `${project.reviewAssignments.length} review assignment(s)` },
        ],
      },
      {
        id: "sdd",
        index: 9,
        title: "Generate SDD Pack",
        shortTitle: "SDD Pack",
        purpose: "Assemble the final System/Solution Design Document and supporting architecture pack from the governed model and evidence trail.",
        target: { kind: "sdd" },
        outputs: ["Final SDD Markdown", "Artifact manifest", "Traceability index", "Board handoff pack"],
        tools: ["SDD composer", "Artifact export", "Traceability summary", "Release checkpoint"],
        aiHooks: ["Draft final narrative", "Identify missing sections", "Summarize decisions", "Prepare executive review notes"],
        coAuthorPrompt: "Prepare the final SDD pack from this architecture. Identify missing sections, summarize decisions, risks, diagrams, quality drivers and handoff artifacts.",
        checks: [
          { label: "Brief and drivers exist", done: Boolean(project.description.trim() && project.qualityPriorities.some((priority) => priority.weight > 0)), evidence: `${project.qualityPriorities.length} driver(s)` },
          { label: "Architecture model has stage coverage", done: ["logicalApplication", "applicationRealization", "logicalTechnology", "physicalTechnology"].filter((stage) => stageNodeCount(project, stage as ArchitectureStage) > 0).length >= 3, evidence: `${project.nodes.length} model object(s)` },
          { label: "Decisions or patterns recorded", done: project.decisions.length > 0 || acceptedStyles + acceptedPatterns > 0, evidence: `${project.decisions.length} ADR(s), ${acceptedStyles + acceptedPatterns} style/pattern choice(s)` },
          { label: "Review/assurance has been visited", done: approvedStages.has("validationRealization") || Boolean(reviewApproval) || project.aiReviewHistory.length > 0, evidence: reviewApproval ?? `${project.aiReviewHistory.length} AI review record(s)` },
        ],
      },
    ];
  }, [project, findings, conformanceAssessment, contextual.obligations]);

  const currentLifecyclePrefix = `${project.id}:${project.branch.id}:`;
  const completionFor = (stepId: JourneyStepId) => lifecycleCompletions[`${currentLifecyclePrefix}${stepId}`];
  const artifactsFor = (stepId: JourneyStepId) => lifecycleArtifacts.filter((artifact) => artifact.projectId === project.id && artifact.branchId === project.branch.id && artifact.stepId === stepId);

  const statuses = steps.map((step) => {
    const stage = step.target.kind === "stage" ? step.target.stage : null;
    const approval = stage ? approvalStatusFor(stage, project) : undefined;
    const completion = completionFor(step.id);
    const handoffRecorded = completion?.status === "completed";
    return { id: step.id, status: stepStatus(step.checks, approval === "approved", handoffRecorded), readyCount: step.checks.filter((check) => check.done).length, total: step.checks.length, completion };
  });
  const completed = statuses.filter((item) => item.status === "complete" || item.status === "ready").length;
  const activeStep = (() => {
    if (workspaceMode === "quality") return steps.find((step) => step.id === "quality")!;
    if (workspaceMode === "conformance" || workspaceMode === "governance" || workspaceMode === "collaboration") return steps.find((step) => step.id === "review")!;
    if (workspaceMode === "runtime" || workspaceMode === "operations") return steps.find((step) => step.id === "physicalTechnology")!;
    if (workspaceMode === "synthesis" || workspaceMode === "patterns") return steps.find((step) => step.id === "logical")!;
    if (project.activeStage === "designIntent") return steps.find((step) => step.id === "requirements")!;
    if (project.activeStage === "logicalApplication") return steps.find((step) => step.id === "logical")!;
    if (project.activeStage === "applicationRealization") return steps.find((step) => step.id === "realization")!;
    if (project.activeStage === "logicalTechnology") return steps.find((step) => step.id === "logicalTechnology")!;
    if (project.activeStage === "physicalTechnology") return steps.find((step) => step.id === "physicalTechnology")!;
    if (project.activeStage === "validationRealization") return steps.find((step) => step.id === "review")!;
    return steps[0]!;
  })();

  const selectedStep = expanded === "overview" ? activeStep : (steps.find((step) => step.id === expanded) ?? activeStep);
  const selectedStatus = statuses.find((status) => status.id === selectedStep.id)!;
  const selectedIcon = statusIcon[selectedStatus.status];
  const SelectedStatusIcon = selectedIcon;
  const nextStep = steps[Math.min(selectedStep.index, steps.length - 1)]!;
  const detailOpen = expanded === selectedStep.id;
  const sddMarkdown = useMemo(() => composeSdd(project, library), [project, library]);
  const sddStep = steps.find((step) => step.id === "sdd")!;
  const sddStatus = statuses.find((status) => status.id === "sdd")!;
  const sddReadinessPercent = Math.round((sddStatus.readyCount / Math.max(1, sddStatus.total)) * 100);
  const sddOpenIssues = sddStep.checks.filter((check) => !check.done).length;
  const sddArtifacts = artifactsFor("sdd");

  const focusWorkspace = () => {
    const focus = () => {
      const target = document.getElementById("aiw-stage-workspace");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      target?.focus({ preventScroll: true });
    };
    window.setTimeout(focus, 0);
    window.setTimeout(focus, 180);
  };

  const goToTarget = (target: WorkspaceTarget) => {
    if (target.kind !== "sdd") setSddPreviewOpen(false);
    if (target.kind === "stage") {
      setWorkspaceMode("design");
      setActiveStage(target.stage);
      focusWorkspace();
      return;
    }
    if (target.kind === "workspace") {
      setWorkspaceMode(target.mode);
      focusWorkspace();
      return;
    }
    selectExpanded("sdd");
    setSddPreviewOpen(true);
    focusWorkspace();
  };

  const completeAndMove = (step: JourneyStep) => {
    const openChecks = step.checks.filter((check) => !check.done);
    if (openChecks.length) {
      setSddPackMessage(`${step.title} cannot be completed: ${openChecks.length} required check(s) remain open.`);
      return;
    }
    const targetNext = step.id === "sdd" ? undefined : nextStep.shortTitle;
    completeLifecycleStep({
      stepId: step.id,
      title: step.title,
      handoffTo: targetNext,
      checklist: step.checks.map((check) => ({ label: check.label, done: check.done, ...(check.evidence ? { evidence: check.evidence } : {}) })),
      artifactNames: step.outputs,
      notes: step.checks.every((check) => check.done) ? "All visible completion checks passed at handoff." : "Handoff recorded with open completion checks for follow-up.",
    });
    if (step.target.kind === "stage") {
      try {
        requestStageApproval(step.target.stage, "Architecture author");
      } catch {
        // Stage handoff is an author workflow; formal governance approval remains separate.
      }
    }
    if (step.id === "sdd") {
      if (!canGenerateArtifacts) { setSddPackMessage("Delivery-pack generation requires the Solution Architect or Administrator capability."); return; }
      void downloadFinalSddPack();
      return;
    }
    goToTarget(nextStep.target);
    selectExpanded(nextStep.id);
  };

  const artifactManifest = {
    projectId: project.id,
    projectName: project.name,
    generatedAt: new Date().toISOString(),
    lifecycle: steps.map((step) => ({
      stage: step.title,
      status: statuses.find((item) => item.id === step.id)?.status,
      handoff: completionFor(step.id),
      outputs: step.outputs,
      completeChecks: step.checks.filter((check) => check.done).map((check) => check.label),
      openChecks: step.checks.filter((check) => !check.done).map((check) => check.label),
      artifactLedger: artifactsFor(step.id).map((artifact) => ({ name: artifact.name, status: artifact.status, generatedAt: artifact.generatedAt })),
    })),
  };

  async function downloadFinalSddPack() {
    if (!canGenerateArtifacts) { setSddPackMessage("Delivery-pack generation is blocked for this role. A Solution Architect or Administrator must generate the governed pack."); return; }
    const reviewApproved = project.stageApprovals.some((item) => item.stage === "validationRealization" && item.status === "approved");
    if (!reviewApproved || sddOpenIssues > 0) {
      setSddPackMessage(`Final generation is locked. ${reviewApproved ? "" : "The review baseline is not approved. "}${sddOpenIssues} delivery check(s) remain open.`);
      return;
    }
    setSddPackBusy(true);
    setSddPackMessage("Composing deterministic SDD delivery pack…");
    try {
      const [{ compileSolutionDeliveryPack, createArtifactArchive }, { runArchitectureReview }] = await Promise.all([
        import("@aiw/artifacts"),
        import("@aiw/intelligence"),
      ]);
      const review = runArchitectureReview(project, library);
      const bundle = compileSolutionDeliveryPack(project, library, review);
      const archive = createArtifactArchive(bundle, { fileName: `${slug(project.name)}-sdd-delivery-pack.zip` });
      const buffer = new ArrayBuffer(archive.bytes.byteLength);
      new Uint8Array(buffer).set(archive.bytes);
      downloadText(`${slug(project.name)}-sdd.md`, sddMarkdown);
      const zipBlob = new Blob([buffer], { type: archive.mediaType });
      const url = URL.createObjectURL(zipBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = archive.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      for (const artifact of artifactsFor("sdd")) markLifecycleArtifactDownloaded(artifact.id);
      setSddPackMessage(`Delivery pack generated: ${archive.fileCount} files · ${(archive.totalUncompressedBytes / 1024).toFixed(1)} KB uncompressed.`);
    } catch (error) {
      downloadText(`${slug(project.name)}-sdd.md`, sddMarkdown);
      setSddPackMessage(error instanceof Error ? `ZIP pack failed; Markdown SDD downloaded. ${error.message}` : "ZIP pack failed; Markdown SDD downloaded.");
    } finally {
      setSddPackBusy(false);
    }
  }

  return (
    <section className={`architecture-journey-studio ${detailOpen ? "is-guidance-open" : "is-guidance-collapsed"}`} aria-label="Guided software architecture lifecycle">
      <header className="architecture-journey-hero">
        <div>
          <span className="eyebrow"><Route size={13} /> Guided architecture lifecycle</span>
          <h2>Architecture lifecycle</h2>
          {detailOpen ? (
            <p>Complete the current stage, hand off with evidence, and keep the final SDD traceable.</p>
          ) : (
            <p className="journey-compact-copy">Choose a stage, then focus its workspace. Details stay collapsed until needed.</p>
          )}
        </div>
        <div className="journey-progress-card">
          <strong>{completed}/{steps.length}</strong>
          <small>stages ready or completed</small>
          <div className="journey-progress-meter"><span style={{ width: `${Math.round((completed / steps.length) * 100)}%` }} /></div>
          <button type="button" className="journey-guide-toggle" onClick={() => selectExpanded(detailOpen ? "overview" : selectedStep.id)}>
            {detailOpen ? "Hide guidance" : "Show guidance"}
          </button>
        </div>
      </header>

      <nav className="architecture-stage-rail" aria-label="Software architecture design lifecycle">
        {steps.map((step) => {
          const status = statuses.find((item) => item.id === step.id)!;
          const Icon = statusIcon[status.status];
          return (
            <button
              key={step.id}
              type="button"
              className={`${activeStep.id === step.id ? "is-current" : ""} ${selectedStep.id === step.id ? "is-selected" : ""}`}
              onClick={() => {
                selectExpanded(step.target.kind === "sdd" ? "sdd" : "overview");
                goToTarget(step.target);
              }}
              title={`${step.title}: ${step.purpose}`}
            >
              <b>{step.index}</b>
              <span>
                <strong>{step.shortTitle}</strong>
                <small>{statusLabel[status.status]}</small>
              </span>
              <Icon size={15} />
            </button>
          );
        })}
      </nav>

      {!detailOpen ? (
        <div className="micro-stage-focus-bar" aria-label="Current lifecycle stage focus">
          <span className={`micro-stage-status micro-stage-status--${selectedStatus.status}`}>
            <SelectedStatusIcon size={14} /> {selectedStatus.readyCount}/{selectedStatus.total} checks · {statusLabel[selectedStatus.status]}
          </span>
          <strong>{selectedStep.title}</strong>
          <small>{selectedStep.outputs.length} output(s) · guidance collapsed</small>
          <div className="micro-stage-actions">
            <button type="button" className="button button--primary" onClick={() => goToTarget(selectedStep.target)} title="Jump to the active studio surface for this lifecycle stage.">
              Focus workspace <ArrowRight size={14} />
            </button>
            <button type="button" onClick={() => selectExpanded(selectedStep.id)} title="Open completion checks, tools, evidence and outputs for this stage.">
              Show guide <ChevronDown size={14} />
            </button>
          </div>
        </div>
      ) : null}

      {selectedStep.id === "sdd" ? (
        <section className="sdd-delivery-room" aria-label="SDD terminal delivery room">
          <article className="sdd-delivery-room__hero">
            <span className="eyebrow"><Rocket size={13} /> Terminal architecture delivery</span>
            <h3>SDD delivery room</h3>
            <p>Package the governed architecture model, decisions, evidence and handoff trail into a defensible delivery pack.</p>
            <div className="sdd-delivery-room__actions">
              <button type="button" className="button button--primary" disabled={sddPackBusy || !canGenerateArtifacts} onClick={() => void downloadFinalSddPack()}>
                <FileArchive size={15} /> {sddPackBusy ? "Packaging delivery…" : "Generate delivery pack"}
              </button>
              <button type="button" onClick={() => setSddPreviewOpen((value) => !value)}>
                <BookOpenCheck size={15} /> {sddPreviewOpen ? "Hide SDD preview" : "Preview SDD"}
              </button>
              <button type="button" onClick={() => downloadText(`${slug(project.name)}-artifact-manifest.json`, JSON.stringify(artifactManifest, null, 2), "application/json")}>
                <Download size={15} /> Manifest
              </button>
            </div>
          </article>
          <article className="sdd-delivery-room__readiness">
            <strong>{sddReadinessPercent}%</strong>
            <span>delivery readiness</span>
            <div className="journey-progress-meter"><span style={{ width: `${sddReadinessPercent}%` }} /></div>
            <small>{sddStatus.readyCount}/{sddStatus.total} checks · {sddOpenIssues} open issue(s)</small>
          </article>
          <article className="sdd-delivery-room__checklist">
            <span className="eyebrow"><FileCheck2 size={13} /> Delivery checklist</span>
            {sddStep.checks.map((check) => (
              <div key={check.label} className={check.done ? "is-done" : "is-open"}>
                {check.done ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                <span><strong>{check.label}</strong>{check.evidence ? <small>{check.evidence}</small> : null}</span>
              </div>
            ))}
          </article>
          <article className="sdd-delivery-room__contents">
            <span className="eyebrow">Pack contents</span>
            {sddStep.outputs.map((output) => <span key={output}><FileText size={13} /> {output}</span>)}
            {sddArtifacts.length ? <small>{sddArtifacts.length} tracked SDD artifact(s) in ledger.</small> : <small>Artifact ledger will update after the delivery pack is generated.</small>}
            <p className="sdd-pack-message">{sddPackMessage}</p>
          </article>
        </section>
      ) : null}

      <div className={`architecture-stage-detail ${selectedStep.id === "sdd" ? "is-sdd" : ""}`} hidden={!detailOpen && selectedStep.id !== "sdd"}>
        <article className="stage-purpose-card">
          <div className={`stage-status-pill stage-status-pill--${selectedStatus.status}`}>
            <SelectedStatusIcon size={15} />
            {statusLabel[selectedStatus.status]} · {selectedStatus.readyCount}/{selectedStatus.total} checks
          </div>
          <h3>{selectedStep.title}</h3>
          <p>{selectedStep.purpose}</p>
          {selectedStatus.completion?.status === "completed" ? (
            <div className="stage-handoff-ledger">
              <CheckCircle2 size={15} />
              <span>Handoff recorded {new Date(selectedStatus.completion.completedAt).toLocaleString()} · {selectedStatus.completion.artifactNames.length} artifact(s) tracked</span>
              <button type="button" onClick={() => reopenLifecycleStep(selectedStep.id, "Architect reopened the stage from the lifecycle studio.")}>Reopen</button>
            </div>
          ) : null}
          <div className="stage-primary-actions">
            <button className="button button--primary" type="button" onClick={() => goToTarget(selectedStep.target)} title="Move directly to the work surface for this stage.">
              Focus workspace <ArrowRight size={15} />
            </button>
            <button type="button" onClick={() => onOpenCoArchitect(selectedStep.coAuthorPrompt)}>
              <BrainCircuit size={15} /> Ask AIW to co-author this stage
            </button>
            <button type="button" onClick={onOpenDecisionRadar}>
              <Sparkles size={15} /> Decision Radar
            </button>
            {onShowDetails ? <button type="button" onClick={onShowDetails}><ClipboardList size={15} /> Details</button> : null}
          </div>
        </article>

        {detailOpen ? (
          <article className="stage-checklist-card">
          <header>
            <span className="eyebrow">Completion gate</span>
            <button type="button" onClick={() => selectExpanded(detailOpen ? "overview" : selectedStep.id)}>
              <ChevronDown size={14} /> {detailOpen ? "Collapse guide" : "Show guide"}
            </button>
          </header>
          <ul>
            {selectedStep.checks.map((check) => (
              <li key={check.label} className={check.done ? "is-done" : "is-open"}>
                {check.done ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                <span>
                  <strong>{check.label}</strong>
                  {check.evidence ? <small>{check.evidence}</small> : null}
                </span>
              </li>
            ))}
          </ul>
          </article>
        ) : null}

        {detailOpen ? (
          <article className="stage-tools-card">
            <span className="eyebrow">Tools and AIW assistance</span>
            <div className="stage-tool-grid">
              {selectedStep.tools.map((tool) => <span key={tool} title={tool}><Layers3 size={13} /> {tool}</span>)}
            </div>
            <div className="stage-ai-hook-grid stage-ai-hook-grid--compact">
              {selectedStep.aiHooks.map((hook) => <button key={hook} type="button" title={hook} onClick={() => onOpenCoArchitect(`${selectedStep.coAuthorPrompt}\nFocus: ${hook}.`)}><WandSparkles size={13} /><span>{hook}</span></button>)}
            </div>
          </article>
        ) : null}

        {detailOpen || selectedStep.id === "sdd" ? (
          <article className="stage-artifacts-card">
          <span className="eyebrow">Stage outputs</span>
          {detailOpen || selectedStep.id === "sdd" ? (
            <ul>
              {selectedStep.outputs.map((output) => <li key={output}><FileText size={14} /> {output}</li>)}
            </ul>
          ) : (
            <p className="stage-compact-hint">{selectedStep.outputs.length} expected output(s). Open the guide to view the full artifact list.</p>
          )}
          {artifactsFor(selectedStep.id).length ? (
            <div className="stage-artifact-ledger">
              {artifactsFor(selectedStep.id).map((artifact) => (
                <span key={artifact.id} title={`${artifact.status} · revision ${artifact.revision}`}>
                  <FileText size={13} /> {artifact.name} <b>{artifact.status}</b>
                </span>
              ))}
            </div>
          ) : null}
          <div className="stage-handoff-actions">
            <button type="button" className="button button--primary" disabled={selectedStep.id === "sdd" && !canGenerateArtifacts} onClick={() => completeAndMove(selectedStep)}>
              {selectedStep.id === "sdd" ? (canGenerateArtifacts ? "Generate final SDD" : "Owner generation required") : `Complete stage → ${nextStep.shortTitle}`}
            </button>
            <button type="button" onClick={() => downloadText(`${slug(project.name)}-artifact-manifest.json`, JSON.stringify(artifactManifest, null, 2), "application/json")}>
              <Download size={14} /> Artifact manifest
            </button>
            {selectedStep.id === "sdd" ? <button type="button" onClick={() => setSddPreviewOpen((value) => !value)}><BookOpenCheck size={14} /> Preview SDD</button> : null}
          </div>
          </article>
        ) : null}
      </div>

      {sddPreviewOpen ? (
        <section className="sdd-preview-panel" aria-label="SDD preview">
          <header>
            <div>
              <span className="eyebrow"><ShieldCheck size={13} /> SDD composer</span>
              <h3>Generated Software/System Design Description</h3>
            </div>
            <div className="sdd-preview-actions">
              <button type="button" onClick={() => downloadText(`${slug(project.name)}-sdd.md`, sddMarkdown)}><Download size={14} /> Markdown</button>
              <button type="button" disabled={sddPackBusy || !canGenerateArtifacts} onClick={() => void downloadFinalSddPack()}><Download size={14} /> {!canGenerateArtifacts ? "Owner generation required" : sddPackBusy ? "Packaging…" : "Delivery ZIP"}</button>
            </div>
          </header>
          <p className="sdd-pack-message">{sddPackMessage}</p>
          <pre>{sddMarkdown}</pre>
        </section>
      ) : null}
    </section>
  );
}
