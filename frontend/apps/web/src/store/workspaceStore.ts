import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { current, isDraft } from "immer";
import type { Connection, EdgeChange, NodeChange } from "@xyflow/react";
import {
  architectureProjectSchema,
  createId,
  sampleProject,
  type ArchitectureBranch,
  type ArchitectureDecision,
  type ArchitectureEdge,
  type ArchitectureInterface,
  type ArchitectureNode,
  type ArchitectureView,
  type ArchitectureViewVersion,
  type ArchitectureProject,
  type ArchitectureStage,
  type BranchComparison,
  type BranchMetadata,
  type AuditResult,
  type ChangeProposal,
  type ContextualRecommendationBundle,
  type DecisionSuggestion,
  type Finding,
  type ImpactAnalysis,
  type KnowledgeLibrary,
  type ProjectSnapshot,
  type ProjectMember,
  type RecommendationContext,
  type RecommendationScore,
  type StageApproval,
  type RelationshipKind,
  type DiscussionThread,
  type MergePlan,
  type ReviewAssignment,
  type DriftReport,
  type PolicyGateResult,
  type RuntimeInventorySource,
  type OperationalDriftReport,
  type RemediationPlan,
  type SloEvaluation,
  type LibraryDropPreview,
  type Point,
  type PatternCompositionPlan,
  type StageTransitionProposal,
  type ActivityEvent,
  type CollaborationPresence,
  type ProjectContext,
  type ConformanceEvidenceEnvelope,
  type AutonomyMode,
  type DesignGestureEvent,
  type DesignGestureKind,
  type GenerativeActionOption,
  type GenerativeOutcomeHistoryItem,
  type LivingCanvasActionEnvelope,
  type LlmCoCreationTrace,
  type StageDecompositionSession,
  type StageCoAuthorProposal,
  type StageDraftOperation,
  type ArchitectureBrainProposalReceipt,
} from "@aiw/domain";
import { applyStageTransitionProposal as applyGovernedStageTransitionProposal } from "@aiw/modelling";
import {
  applyOutcomeToPreferences,
  applySelectedProposals,
  analyseImpact,
  approvalReadiness,
  compareBranches,
  validateProposedEdge,
  validateProposedNode,
  addDiscussionComment,
  applyMergePlan,
  assignReview,
  completeReview,
  createDiscussion,
  createMergePlan,
  expireGovernanceItems,
  resolveDiscussion,
  resolveMergeConflict,
  importRuntimeInventory,
  analyseArchitectureDrift,
  evaluateArchitecturePolicyGate,
  evaluateSlo,
  previewLibraryDrop as buildLibraryDropPreview,
  applyLibraryDrop,
  applyPatternComposition as applyGovernedPatternComposition,
  rollbackPatternComposition as rollbackGovernedPatternComposition,
  applyGenerativeAction as applyLivingCanvasAction,
  rollbackGenerativeMutation,
  StaleGenerativeProposalError,
  InvalidGenerativeMutationError,
} from "@aiw/engine";
import { createConformanceOpsActions } from "./actions/conformanceOps";
import { applyScenarioTemplateAction } from "./actions/applyScenarioTemplate";
import { createLifecycleFlowActions } from "./actions/lifecycleFlow";
import type {
  ArchitectureEvent,
  IntelligenceResponse,
  IntelligenceWorkspace,
  ArchitectureConformancePlan,
  ContinuousConformanceAssessment,
  ConformanceRemediationChangeSet,
  ConformanceVisualModel,
} from "@aiw/engine";
import knowledgeJson from "../data/knowledge-library.json";
import { apiSession, getJson, postJson, putJson } from "../lib/apiClient";
import type { ExperienceProfileId } from "../lib/experienceProfiles";
import { REFERENCE_PRINCIPAL_IDS, can } from "../lib/roleAccess";
import type {
  LifecycleArtifactRecord,
  LifecycleChecklistSnapshot,
  LifecycleCompletionInput,
  LifecycleCompletionRecord,
  LifecycleStepId,
  GovernedReviewInput,
} from "./lifecycleTypes";

import {
  applyLayoutPreviewToProject,
  createIntelligentLayoutPreview,
  getNodeVisualStyle,
  resetNodeVisualStyle,
  semanticVisualStyleForNode,
  setNodeVisualStyle,
  type CanvasDensity,
  type CanvasLayoutIntent,
  type CanvasLayoutPreview,
  type CanvasSemanticStyleMode,
  type CanvasToolMode,
  type NodeVisualStyle,
} from "../lib/canvasIntelligence";

const library = knowledgeJson as KnowledgeLibrary;
let deferredSelectionDerivedTimer: ReturnType<typeof setTimeout> | null = null;
let deferredWorkspaceProjectionTimer: ReturnType<typeof setTimeout> | null =
  null;
let deferredLivingCanvasRefreshTimer: ReturnType<typeof setTimeout> | null =
  null;
let livingCanvasRequestSequence = 0;
let projectSaveInFlight: Promise<boolean> | null = null;

interface ArchitectureBrainWorkspaceProjection {
  recommendations: RecommendationScore[];
  contextual: ContextualRecommendationBundle;
  findings: Finding[];
  intelligence: IntelligenceResponse;
  brainReceipt: ArchitectureBrainProposalReceipt;
}

type PaletteTemplate = Pick<
  ArchitectureNode,
  "kind" | "label" | "properties" | "tags"
>;

type RecommendationTrigger = RecommendationContext["trigger"];
type WorkspaceMode =
  | "cockpit"
  | "design"
  | "activation"
  | "admin"
  | "quality"
  | "portfolio"
  | "governance"
  | "comparison"
  | "collaboration"
  | "security"
  | "drift"
  | "conformance"
  | "operations"
  | "knowledge"
  | "patterns"
  | "synthesis"
  | "runtime"
  | "pilot";

interface PendingConnectionReview {
  sourceId: string;
  targetId: string;
  selectedKind: RelationshipKind;
  intelligence: IntelligenceResponse;
}

interface WorkspaceStore {
  workspaceMode: WorkspaceMode;
  experienceProfile: ExperienceProfileId;
  roleChosen: boolean;
  project: ArchitectureProject;
  library: KnowledgeLibrary;
  recommendations: RecommendationScore[];
  contextual: ContextualRecommendationBundle;
  findings: Finding[];
  audit: AuditResult | null;
  snapshots: ProjectSnapshot[];
  branches: ArchitectureBranch[];
  comparison: BranchComparison | null;
  impact: ImpactAnalysis | null;
  mergePlan: MergePlan | null;
  policyGateResult: PolicyGateResult | null;
  conformancePlan: ArchitectureConformancePlan | null;
  conformanceAssessment: ContinuousConformanceAssessment | null;
  conformanceRemediation: ConformanceRemediationChangeSet | null;
  conformanceVisualModel: ConformanceVisualModel | null;
  conformanceEvidence: ConformanceEvidenceEnvelope[];
  currentUserId: string;
  canvasToolMode: CanvasToolMode;
  canvasDensity: CanvasDensity;
  canvasSemanticStyleMode: CanvasSemanticStyleMode;
  canvasFocusMode: boolean;
  canvasLayoutPreview: CanvasLayoutPreview | null;
  selectedNodeIds: string[];
  selectedNodeId: string | null;
  connectionKind: RelationshipKind;
  notice: string | null;
  pendingLibraryDrop: LibraryDropPreview | null;
  compositionHistory: PatternCompositionPlan[];
  dismissedGuidanceIds: string[];
  aiAuditStatus:
    | "idle"
    | "connecting"
    | "llm-assisted"
    | "deterministic-fallback"
    | "failed";
  persistenceStatus:
    "local" | "loading" | "saving" | "saved" | "conflict" | "offline" | "error";
  lastSavedRevision: number | null;
  serverPersistenceEnabled: boolean;
  undoStack: ArchitectureProject[];
  redoStack: ArchitectureProject[];
  collaborationPresence: CollaborationPresence[];
  recentActivity: ActivityEvent[];
  livingCanvasEnabled: boolean;
  livingCanvasAutonomyMode: AutonomyMode;
  livingCanvasEnvelope: LivingCanvasActionEnvelope | null;
  livingCanvasSession: StageDecompositionSession | null;
  livingCanvasPreviewActionId: string | null;
  livingCanvasOutcomeHistory: GenerativeOutcomeHistoryItem[];
  livingCanvasLastAcceptedAction: GenerativeActionOption | null;
  livingCanvasAssistStatus:
    | "deterministic"
    | "requesting"
    | "llm-assisted"
    | "deterministic-fallback"
    | "error";
  setLivingCanvasEnabled: (enabled: boolean) => void;
  setLivingCanvasAutonomyMode: (mode: AutonomyMode) => void;
  refreshLivingCanvas: (kind?: DesignGestureKind, point?: Point) => void;
  requestLivingCanvasLlmAssist: () => Promise<void>;
  previewLivingCanvasAction: (actionId: string | null) => void;
  acceptLivingCanvasAction: (actionId: string) => void;
  rejectLivingCanvasAction: (actionId: string, reason?: string) => void;
  deferLivingCanvasAction: (actionId: string, reason?: string) => void;
  undoLastLivingCanvasAction: () => void;
  focusNextLivingCanvasScope: () => void;
  lifecycleCompletions: Record<string, LifecycleCompletionRecord>;
  lifecycleArtifacts: LifecycleArtifactRecord[];
  activeLifecycleStep: LifecycleStepId | "overview";
  completeLifecycleStep: (
    input: LifecycleCompletionInput,
  ) => LifecycleCompletionRecord | null;
  reopenLifecycleStep: (stepId: LifecycleStepId, reason?: string) => void;
  markLifecycleArtifactDownloaded: (artifactId: string) => void;
  setActiveLifecycleStep: (stepId: LifecycleStepId | "overview") => void;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  setExperienceProfile: (profile: ExperienceProfileId) => void;
  setCurrentUser: (userId: string) => void;
  setActiveStage: (stage: ArchitectureStage) => void;
  setContextField: <K extends keyof ProjectContext>(
    field: K,
    value: ProjectContext[K],
  ) => void;
  intelligence: IntelligenceResponse | null;
  pendingConnectionReview: PendingConnectionReview | null;
  intelligencePreferences: { demoted: Record<string, number> };
  recordIntelligenceOutcome: (
    actionKind: string,
    outcome: "accepted" | "dismissed",
  ) => void;
  setPendingConnectionKind: (kind: RelationshipKind) => void;
  setPendingConnectionSemantics: (patch: Record<string, string>) => void;
  commitPendingConnection: () => void;
  cancelPendingConnection: () => void;
  setCanvasToolMode: (mode: CanvasToolMode) => void;
  setCanvasDensity: (density: CanvasDensity) => void;
  setCanvasSemanticStyleMode: (mode: CanvasSemanticStyleMode) => void;
  setCanvasFocusMode: (enabled: boolean) => void;
  updateNodeVisualStyle: (
    nodeId: string,
    patch: Partial<NodeVisualStyle>,
  ) => void;
  applyCanvasArrangement: (input: {
    positions: Record<string, Point>;
    dimensions?: Record<string, { width: number; height: number }>;
    label: string;
  }) => void;
  resetNodeVisualStyle: (nodeId: string) => void;
  resizeNode: (nodeId: string, size: { width: number; height: number }) => void;
  autoSizeNode: (nodeId: string) => void;
  setNodeLocked: (nodeId: string, locked: boolean) => void;
  resizeSelectedNodes: (size: { width: number; height: number }) => void;
  alignSelectedNodes: (
    axis: "left" | "center" | "right" | "top" | "middle" | "bottom",
  ) => void;
  distributeSelectedNodes: (axis: "horizontal" | "vertical") => void;
  toggleNodeCollapsed: (nodeId: string) => void;
  applySemanticStyleToCanvas: (mode?: CanvasSemanticStyleMode) => void;
  previewIntelligentLayout: (
    intent: CanvasLayoutIntent,
    asNewView?: boolean,
  ) => void;
  applyLayoutPreview: () => void;
  cancelLayoutPreview: () => void;
  selectNode: (nodeId: string | null) => void;
  setProjectText: (field: "name" | "description", value: string) => void;
  setListField: (
    field: "objectives" | "constraints" | "assumptions",
    value: string,
  ) => void;
  setQualityWeight: (attributeId: string, weight: number) => void;
  applyStageCoAuthorOperations: (
    proposal: StageCoAuthorProposal,
    operationIds: string[],
  ) => void;
  setConnectionKind: (kind: RelationshipKind) => void;
  upsertInterface: (contract: ArchitectureInterface) => void;
  removeInterface: (interfaceId: string) => void;
  upsertArchitectureView: (view: ArchitectureView) => void;
  addArchitectureViewVersion: (version: ArchitectureViewVersion) => void;
  applyScenarioTemplate: (
    template: import("@aiw/engine").ScenarioTemplate,
  ) => void;
  addNode: (template: PaletteTemplate) => void;
  previewLibraryDrop: (
    recordId: string,
    position: Point,
    scopeNodeId?: string,
  ) => void;
  commitLibraryDrop: () => void;
  applyPatternCompositionPlan: (plan: PatternCompositionPlan) => void;
  rollbackPatternCompositionPlan: (planId?: string) => void;
  applyStageTransitionProposal: (proposal: StageTransitionProposal) => void;
  cancelLibraryDrop: () => void;
  updateNodeProperty: (nodeId: string, key: string, value: unknown) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  connect: (connection: Connection) => void;
  toggleLineage: (nodeId: string, upstreamNodeId: string) => void;
  acceptStyleRecommendation: (styleId: string) => void;
  setPatternStatus: (
    patternId: string,
    status: "considering" | "accepted" | "rejected",
  ) => void;
  acknowledgeObligation: (patternId: string, obligation: string) => void;
  recordDecisionSuggestion: (suggestionId: string) => void;
  recordReviewOutputs: (
    decisions: ArchitectureDecision[],
    artifactNames: string[],
  ) => void;
  recordArchitectureReview: (review: GovernedReviewInput) => void;
  validate: () => void;
  invokeAudit: () => Promise<void>;
  toggleProposal: (proposalId: string) => void;
  acceptSelectedProposals: () => void;
  discardAudit: () => void;
  createSnapshot: (label?: string, status?: ProjectSnapshot["status"]) => void;
  restoreSnapshot: (snapshotId: string) => void;
  createBranch: (name: string, description?: string) => void;
  switchBranch: (branchId: string) => void;
  compareWithBranch: (branchId: string) => void;
  mergeBranch: (branchId: string) => void;
  resolveMergeConflictChoice: (
    conflictId: string,
    resolution: "source" | "target",
  ) => void;
  applyPreparedMerge: () => void;
  cancelPreparedMerge: () => void;
  analyseSelectedImpact: () => void;
  assignStageReview: (
    stage: ArchitectureStage,
    assignedTo: string,
    instructions?: string,
    priority?: ReviewAssignment["priority"],
  ) => void;
  completeStageReview: (assignmentId: string) => void;
  createDiscussionThread: (
    targetType: DiscussionThread["targetType"],
    targetId: string,
    title: string,
    body: string,
  ) => void;
  addThreadComment: (threadId: string, body: string) => void;
  resolveDiscussionThread: (threadId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  runExpiryCheck: () => void;
  requestStageApproval: (
    stage: ArchitectureStage,
    requestedBy?: string,
  ) => void;
  decideStageApproval: (
    approvalId: string,
    status: "approved" | "changes-requested" | "rejected",
    reviewer: string,
    comment?: string,
  ) => void;
  toggleRulePack: (rulePackId: string) => void;
  importRuntimeInventoryData: (
    name: string,
    sourceType: RuntimeInventorySource,
    raw: unknown,
  ) => string;
  analyseRuntimeDrift: (inventoryId: string) => DriftReport | null;
  evaluatePolicyGateNow: (
    gateId: string,
    reportId?: string,
  ) => PolicyGateResult | null;
  generateConformancePlan: () => ArchitectureConformancePlan;
  loadReferenceConformanceEvidence: () => void;
  assessConformanceNow: () => ContinuousConformanceAssessment;
  previewConformanceRemediation: () => ConformanceRemediationChangeSet | null;
  submitConformanceRemediation: () => void;
  decideConformanceRemediation: (approved: boolean) => void;
  runReferenceCollector: () => string | null;
  deriveReferenceTelemetryTopology: () => string;
  analyseOperationalPosture: (
    inventoryId: string,
  ) => OperationalDriftReport | null;
  createOperationalRemediationPlan: (
    reportId: string,
  ) => RemediationPlan | null;
  submitOperationalRemediationPlan: (planId: string) => void;
  decideOperationalRemediationPlan: (planId: string, approved: boolean) => void;
  evaluateReferenceSlo: (
    sloId: string,
    observedValue: number,
  ) => SloEvaluation | null;
  adoptSynthesizedProject: (project: ArchitectureProject) => void;
  importProject: (text: string) => { success: boolean; error?: string };
  dismissGuidance: (guidanceId: string) => void;
  clearNotice: () => void;
  resetDemo: () => void;
  hydrateProject: (
    project: ArchitectureProject,
    enableServerPersistence?: boolean,
  ) => void;
  loadProjectFromServer: (
    projectId: string,
    branchId?: string,
  ) => Promise<boolean>;
  saveProjectToServer: () => Promise<boolean>;
  setServerPersistence: (enabled: boolean) => void;
  addQualityScenario: (
    input?: Partial<ArchitectureProject["qualityScenarios"][number]>,
  ) => void;
  updateQualityScenario: (
    scenarioId: string,
    patch: Partial<ArchitectureProject["qualityScenarios"][number]>,
  ) => void;
  deleteQualityScenario: (scenarioId: string) => void;
  undo: () => void;
  redo: () => void;
  recordCoArchitectExchange: (
    question: string,
    answer: string,
    citedRecordIds: string[],
    modelTrace?: {
      providerId: string;
      model: string;
      routeId: string;
      fallbackUsed: boolean;
      requestFingerprint: string;
    },
  ) => void;
}

function intelligenceWorkspaceFor(
  mode: WorkspaceMode,
  stage: ArchitectureStage,
): IntelligenceWorkspace {
  if (mode === "cockpit") return "design-brief";
  if (mode === "design") {
    if (stage === "designIntent") return "design-brief";
    if (stage === "validationRealization") return "realization";
    return "design-canvas";
  }
  if (mode === "activation") return "design-brief";
  if (mode === "admin") return "knowledge";
  if (mode === "quality") return "quality";
  if (mode === "synthesis") return "synthesis";
  if (mode === "patterns") return "patterns";
  if (mode === "governance") return "governance";
  if (mode === "portfolio" || mode === "pilot") return "portfolio";
  if (mode === "operations") return "operations";
  if (mode === "knowledge") return "knowledge";
  if (mode === "collaboration") return "collaboration";
  if (mode === "security" || mode === "runtime") return "security";
  if (mode === "drift") return "drift";
  if (mode === "conformance") return "realization";
  return "comparison";
}

function emptyContextualFor(
  project: ArchitectureProject,
  selectedNodeId: string | null,
  trigger: RecommendationTrigger,
): ContextualRecommendationBundle {
  return {
    generatedAt: new Date(0).toISOString(),
    context: {
      stage: project.activeStage,
      ...(selectedNodeId ? { scopeNodeId: selectedNodeId } : {}),
      trigger,
    },
    headline: "Architecture Brain projection is pending.",
    styles: [],
    patterns: [],
    decisions: [],
    obligations: [],
    warnings: [],
  };
}

function derive(
  project: ArchitectureProject,
  selectedNodeId: string | null = null,
  trigger: RecommendationTrigger = "initial",
) {
  return {
    recommendations: [] as RecommendationScore[],
    contextual: emptyContextualFor(project, selectedNodeId, trigger),
    findings: [...project.findings],
  };
}

function stageEntryBlockers(
  project: ArchitectureProject,
  target: ArchitectureStage,
  findings: Finding[],
): string[] {
  const order: ArchitectureStage[] = [
    "designIntent",
    "logicalApplication",
    "applicationRealization",
    "logicalTechnology",
    "physicalTechnology",
    "validationRealization",
  ];
  if (order.indexOf(target) <= order.indexOf(project.activeStage)) return [];
  const blockers: string[] = [];
  if (target !== "designIntent") {
    const acceptedRequirements = project.requirementsIntelligence?.requirements.filter((item) => item.status === "accepted") ?? [];
    const hasProblem = Boolean(project.description.trim()) || acceptedRequirements.some((item) => ["business", "functional"].includes(item.type) && item.statement.trim().length > 0);
    const hasObjective = project.objectives.length > 0 || acceptedRequirements.some((item) => item.type === "business");
    const hasConstraint = project.constraints.length > 0 || acceptedRequirements.some((item) => item.type === "constraint");
    const missingIntent: string[] = [];
    if (!hasProblem) missingIntent.push("problem statement");
    if (!hasObjective) missingIntent.push("objective");
    if (!hasConstraint) missingIntent.push("constraint");
    if (missingIntent.length) blockers.push(`Complete the ${missingIntent.join(", ")} in the governed requirements baseline.`);
  }
  if (
    [
      "applicationRealization",
      "logicalTechnology",
      "physicalTechnology",
      "validationRealization",
    ].includes(target) &&
    !project.qualityScenarios.some((item) => item.responseMeasure.trim())
  )
    blockers.push("Define at least one measurable quality scenario.");
  const requiredStageByTarget: Partial<
    Record<ArchitectureStage, ArchitectureStage>
  > = {
    applicationRealization: "logicalApplication",
    logicalTechnology: "applicationRealization",
    physicalTechnology: "logicalTechnology",
    validationRealization: "physicalTechnology",
  };
  const required = requiredStageByTarget[target];
  if (required && !project.nodes.some((node) => node.stage === required))
    blockers.push(
      `Add at least one ${required} architecture element before progressing.`,
    );
  if (findings.some((item) => item.severity === "HARD"))
    blockers.push("Resolve hard deterministic findings before progressing.");
  return blockers;
}

export function bump(
  project: ArchitectureProject,
  invalidateApprovals = true,
): void {
  project.revision += 1;
  project.updatedAt = new Date().toISOString();
  if (!invalidateApprovals) return;
  const order: ArchitectureStage[] = [
    "designIntent",
    "logicalApplication",
    "applicationRealization",
    "logicalTechnology",
    "physicalTechnology",
    "validationRealization",
  ];
  const changedIndex = order.indexOf(project.activeStage);
  for (const approval of project.stageApprovals) {
    if (
      approval.status === "approved" &&
      order.indexOf(approval.stage) >= changedIndex
    ) {
      approval.status = "changes-requested";
      approval.comments.push(
        `Automatically invalidated by revision ${project.revision} after a change in ${project.activeStage}.`,
      );
      approval.decidedAt = new Date().toISOString();
    }
  }
}

function hashContent(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function migrateProject(input: unknown): ArchitectureProject | null {
  if (!input || typeof input !== "object") return null;
  const candidate = safeStructuredClone(input) as Record<string, unknown> &
    Partial<ArchitectureProject>;
  if (String(candidate.schemaVersion) === "0.1.0") {
    (candidate as Record<string, unknown>).schemaVersion = "0.2.0";
    candidate.patternSelections = [];
    candidate.decisions = (candidate.decisions ?? []).map((decision) => ({
      ...decision,
      linkedRecordIds: [],
      scopeNodeId: undefined,
    }));
  }
  if (String(candidate.schemaVersion) === "0.2.0") {
    (candidate as Record<string, unknown>).schemaVersion = "0.3.0";
    candidate.branch = {
      id: "branch-main",
      name: "Main architecture",
      description: "Migrated primary branch.",
      baseRevision: Number(candidate.revision ?? 0),
      status: "active",
      createdAt: new Date().toISOString(),
    };
    candidate.stageApprovals = [];
    candidate.activeRulePackIds = ["RULEPACK-ENTERPRISE-BASELINE"];
  }
  if (String(candidate.schemaVersion) === "0.3.0") {
    (candidate as Record<string, unknown>).schemaVersion = "0.4.0";
  }
  if (String(candidate.schemaVersion) === "0.4.0") {
    (candidate as Record<string, unknown>).schemaVersion = "0.5.0";
    candidate.tenantId = "tenant-migrated";
  }
  if (String(candidate.schemaVersion) === "0.5.0") {
    (candidate as Record<string, unknown>).schemaVersion = "0.6.0";
  }
  if (String(candidate.schemaVersion) === "0.6.0") {
    (candidate as Record<string, unknown>).schemaVersion = "0.7.0";
  }
  if (String(candidate.schemaVersion) === "0.7.0") {
    (candidate as Record<string, unknown>).schemaVersion = "0.8.0";
  }
  const now = new Date().toISOString();
  candidate.patternSelections ??= [];
  candidate.stageApprovals ??= [];
  candidate.activeRulePackIds ??= ["RULEPACK-ENTERPRISE-BASELINE"];
  candidate.branch ??= {
    id: "branch-main",
    name: "Main architecture",
    description: "Primary branch.",
    baseRevision: Number(candidate.revision ?? 0),
    status: "active",
    createdAt: now,
  };
  candidate.members ??= [
    {
      id: "user-owner",
      displayName: "Architecture Owner",
      email: "owner@example.com",
      role: "owner",
      status: "active",
      joinedAt: now,
    },
    {
      id: "user-architect",
      displayName: "Solution Architect",
      email: "architect@example.com",
      role: "architect",
      status: "active",
      joinedAt: now,
    },
    {
      id: "user-reviewer",
      displayName: "Independent Reviewer",
      email: "reviewer@example.com",
      role: "reviewer",
      status: "active",
      joinedAt: now,
    },
    {
      id: "user-governance",
      displayName: "Architecture Review Board",
      email: "arb@example.com",
      role: "governance",
      status: "active",
      joinedAt: now,
    },
  ];
  const referenceMembers: ProjectMember[] = [
    {
      id: REFERENCE_PRINCIPAL_IDS["solution-architect"],
      displayName: "Reference Solution Architect",
      email: "solution-architect@reference.aiw.invalid",
      role: "architect",
      status: "active",
      joinedAt: now,
    },
    {
      id: REFERENCE_PRINCIPAL_IDS["enterprise-architect"],
      displayName: "Reference Enterprise Architect",
      email: "enterprise-architect@reference.aiw.invalid",
      role: "governance",
      status: "active",
      joinedAt: now,
    },
    {
      id: REFERENCE_PRINCIPAL_IDS["platform-architect"],
      displayName: "Reference Platform Architect",
      email: "platform-architect@reference.aiw.invalid",
      role: "architect",
      status: "active",
      joinedAt: now,
    },
    {
      id: REFERENCE_PRINCIPAL_IDS.reviewer,
      displayName: "Reference Architecture Reviewer",
      email: "reviewer@reference.aiw.invalid",
      role: "reviewer",
      status: "active",
      joinedAt: now,
    },
    {
      id: REFERENCE_PRINCIPAL_IDS["knowledge-curator"],
      displayName: "Reference Knowledge Curator",
      email: "knowledge-curator@reference.aiw.invalid",
      role: "viewer",
      status: "active",
      joinedAt: now,
    },
    {
      id: REFERENCE_PRINCIPAL_IDS.administrator,
      displayName: "Reference Platform Administrator",
      email: "administrator@reference.aiw.invalid",
      role: "owner",
      status: "active",
      joinedAt: now,
    },
  ];
  for (const member of referenceMembers)
    if (
      !candidate.members.some((item: { id?: string }) => item.id === member.id)
    )
      candidate.members.push(member);
  candidate.reviewAssignments ??= [];
  candidate.discussionThreads ??= [];
  candidate.notifications ??= [];
  candidate.coArchitectSessions ??= [];
  candidate.aiReviewHistory ??= [];
  candidate.collaborationSettings ??= {
    approvalValidityDays: 90,
    reviewDueDays: 5,
    requireIndependentReviewer: true,
    maxConcurrentEditors: 12,
    presenceTtlSeconds: 45,
    operationRetryLimit: 3,
  };
  candidate.collaborationSettings.presenceTtlSeconds ??= 45;
  candidate.collaborationSettings.operationRetryLimit ??= 3;
  candidate.tenantId ??= "tenant-migrated";
  candidate.securitySettings ??= {
    requireSso: false,
    allowedIdentityProviderIds: ["idp-migrated-development"],
    allowDevelopmentAuth: true,
    sessionMaxAgeMinutes: 480,
    auditRetentionDays: 365,
    encryptionKeyReference: "env://AIW_DATA_ENCRYPTION_KEY",
  };
  candidate.identityProviders ??= [
    {
      id: "idp-migrated-development",
      tenantId: candidate.tenantId,
      type: "development",
      name: "Migrated development provider",
      issuer: "aiw://development",
      clientId: "aiw-migrated-client",
      scopes: ["openid", "profile", "email"],
      enabled: true,
    },
  ];
  candidate.secretReferences ??= [];
  candidate.observabilitySettings ??= {
    serviceName: "aiw-migrated-workbench",
    tracesEnabled: true,
    metricsEnabled: true,
    logsEnabled: true,
    samplingRatio: 0.2,
    targetAvailabilityPercent: 99.9,
    targetP95LatencyMs: 500,
  };
  candidate.repositoryBindings ??= [];
  candidate.runtimeInventories ??= [];
  candidate.driftReports ??= [];
  candidate.policyGates ??= [
    {
      id: "gate-migrated",
      name: "Migrated architecture gate",
      enabled: true,
      hardFindingThreshold: 0,
      significantFindingThreshold: 5,
      advisoryFindingThreshold: 25,
      maxMissingResources: 0,
      maxUnmanagedResources: 3,
      requiredApprovedStages: [
        "logicalApplication",
        "applicationRealization",
        "logicalTechnology",
      ],
    },
  ];
  candidate.inventoryCollectors ??= [];
  candidate.collectorRuns ??= [];
  candidate.operationalDriftReports ??= [];
  candidate.driftWaivers ??= [];
  candidate.remediationPlans ??= [];
  candidate.serviceLevelObjectives ??= [];
  candidate.alertPolicies ??= [];
  candidate.repositoryPullRequests ??= [];
  candidate.eventBrokerSettings ??= {
    adapter: "memory",
    topic: "aiw.architecture.events",
    maxAttempts: 5,
    retryDelayMs: 1000,
    deadLetterEnabled: true,
  };
  candidate.deploymentProfiles ??= [];
  candidate.portfolio ??= {
    portfolioId: "portfolio-migrated",
    businessUnit: "Unassigned",
    owner: "Architecture Owner",
    criticality: "medium",
    lifecycle: "maintain",
    annualChangeBudget: 0,
    currency: "USD",
  };
  candidate.projectDependencies ??= [];
  candidate.technologyStandardExceptions ??= [];
  candidate.technicalDebtItems ??= [];
  candidate.buildingBlockUsages ??= [];
  candidate.referenceArchitectureAssignments ??= [];
  candidate.interfaces ??= [];
  candidate.architectureViews ??= [];
  candidate.architectureViewVersions ??= [];
  const legacyQualityIds: Record<string, string> = {
    "QA-01": "availability",
    "QA-02": "performance",
    "QA-03": "scalability",
    "QA-04": "elasticity",
    "QA-05": "reliability",
    "QA-06": "faultTolerance",
    "QA-07": "consistency",
    "QA-08": "security",
    "QA-09": "privacy",
    "QA-10": "modifiability",
    "QA-11": "deployability",
    "QA-12": "testability",
    "QA-13": "observability",
    "QA-14": "interoperability",
    "QA-15": "portability",
    "QA-16": "recoverability",
    "QA-17": "costEfficiency",
    "QA-18": "simplicity",
    "QA-19": "deliverySpeed",
    "QA-20": "sustainability",
  };
  candidate.qualityPriorities = (candidate.qualityPriorities ?? []).map(
    (item) => ({
      ...item,
      attributeId: legacyQualityIds[item.attributeId] ?? item.attributeId,
    }),
  );
  candidate.qualityScenarios = (candidate.qualityScenarios ?? []).map(
    (item) => ({
      ...item,
      attributeId: legacyQualityIds[item.attributeId] ?? item.attributeId,
    }),
  );
  const parsed = architectureProjectSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function toSerializableCloneInput(
  value: unknown,
  seen = new WeakSet<object>(),
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "function" || typeof value === "symbol")
    return undefined;
  if (typeof value !== "object") return value;
  if (seen.has(value as object)) return undefined;
  seen.add(value as object);
  if (typeof Window !== "undefined" && value instanceof Window)
    return undefined;
  if (typeof Node !== "undefined" && value instanceof Node) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value
      .map((item) => toSerializableCloneInput(item, seen))
      .filter((item) => item !== undefined);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype && prototype !== Object.prototype && prototype !== null)
    return undefined;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(
        ([key, item]) => [key, toSerializableCloneInput(item, seen)] as const,
      )
      .filter(([, item]) => item !== undefined),
  );
}

const initialProject = migrateProject(sampleProject) ?? sampleProject;

function safeStructuredClone<T>(value: T): T {
  const plain = (isDraft(value) ? current(value as never) : value) as T;
  try {
    return structuredClone(plain);
  } catch {
    return toSerializableCloneInput(plain) as T;
  }
}
function cloneProject(project: ArchitectureProject): ArchitectureProject {
  return safeStructuredClone(project);
}
function cloneBranchMetadata(branch: BranchMetadata): BranchMetadata {
  return safeStructuredClone(branch);
}

function lifecycleKey(
  project: ArchitectureProject,
  stepId: LifecycleStepId,
): string {
  return `${project.id}:${project.branch.id}:${stepId}`;
}

function projectLifecycleCompletions(
  records: Record<string, LifecycleCompletionRecord> | undefined,
  project: ArchitectureProject,
): Record<string, LifecycleCompletionRecord> {
  const result: Record<string, LifecycleCompletionRecord> = {};
  for (const [key, record] of Object.entries(records ?? {})) {
    if (
      record.projectId === project.id &&
      record.branchId === project.branch.id
    )
      result[key] = record;
  }
  return result;
}

function projectLifecycleArtifacts(
  records: LifecycleArtifactRecord[] | undefined,
  project: ArchitectureProject,
): LifecycleArtifactRecord[] {
  return (records ?? []).filter(
    (record) =>
      record.projectId === project.id && record.branchId === project.branch.id,
  );
}

function livingCanvasStagePair(project: ArchitectureProject): {
  source: DesignGestureEvent["stage"];
  target: NonNullable<DesignGestureEvent["targetStage"]>;
} {
  if (project.activeStage === "logicalApplication")
    return { source: "qualityDrivers", target: "logicalApplication" };
  if (project.activeStage === "applicationRealization")
    return { source: "logicalApplication", target: "applicationRealization" };
  if (project.activeStage === "logicalTechnology")
    return { source: "applicationRealization", target: "logicalTechnology" };
  if (project.activeStage === "physicalTechnology")
    return { source: "logicalTechnology", target: "physicalTechnology" };
  return { source: "requirements", target: "qualityDrivers" };
}

function livingCanvasGesture(
  state: WorkspaceStore,
  kind: DesignGestureKind = "candidate-requested",
  point?: Point,
): DesignGestureEvent {
  const pair = livingCanvasStagePair(state.project);
  const selectedNode = state.selectedNodeId
    ? state.project.nodes.find((node) => node.id === state.selectedNodeId)
    : undefined;
  // A decomposition session's active scope is guidance state, not an explicit user
  // selection. Reusing it as selectedScopeId over-constrains a subsequent
  // recomputation (for example, re-entering Application Realization can pin the
  // engine to a System scope that has no eligible local action). Only an actual
  // canvas selection should narrow the deterministic candidate set.
  const selectedScopeId = selectedNode?.id;
  return {
    id: createId("design-gesture"),
    kind,
    occurredAt: new Date().toISOString(),
    tenantId: state.project.tenantId,
    projectId: state.project.id,
    branchId: state.project.branch.id,
    revision: state.project.revision,
    actorId: state.currentUserId,
    actorRole: state.experienceProfile,
    stage: pair.source,
    targetStage: pair.target,
    decompositionLevel:
      pair.target === "applicationRealization"
        ? selectedNode &&
          selectedNode.stage === "applicationRealization" &&
          ["DeployableUnit", "ApplicationComponent"].includes(selectedNode.kind)
          ? "component"
          : "container"
        : pair.target === "logicalTechnology" ||
            pair.target === "physicalTechnology"
          ? "deployment"
          : "system",
    ...(selectedScopeId
      ? { selectedScopeId, subjectIds: [selectedScopeId] }
      : {}),
    ...(point ? { canvasPoint: point } : {}),
    autonomyMode: state.livingCanvasAutonomyMode,
  };
}

function queueLivingCanvasFeedback(
  project: ArchitectureProject,
  action: GenerativeActionOption,
  outcome: "accepted" | "rejected" | "deferred" | "edited",
  reason?: string,
  modelTrace?: LlmCoCreationTrace,
): void {
  if (action.authorityClass !== "llm-proposed") return;
  void postJson(
    `/api/projects/${encodeURIComponent(project.id)}/branches/${encodeURIComponent(project.branch.id)}/living-canvas/feedback`,
    {
      stage: project.activeStage,
      actionSemanticKey: action.semanticKey,
      actionLabel: action.label,
      authorityClass: action.authorityClass,
      outcome,
      ...(reason ? { reason } : {}),
      citedRecordIds: [
        ...new Set([
          ...action.knowledgeClaimRefs,
          ...action.patternRefs,
          ...action.evidenceRefs,
        ]),
      ],
      knowledgeReleaseId: action.mutationSet.basedOnKnowledgeReleaseId,
      ...(modelTrace ? { modelTrace } : {}),
    },
  ).catch(() => undefined);
}

async function refreshWorkspaceProjectionFromBrain(
  trigger: RecommendationTrigger,
  event?: ArchitectureEvent,
): Promise<void> {
  let snapshot = useWorkspaceStore.getState();
  if (
    snapshot.serverPersistenceEnabled &&
    can(snapshot.experienceProfile, "architecture.write") &&
    snapshot.lastSavedRevision !== snapshot.project.revision
  ) {
    const synchronized = await snapshot.saveProjectToServer();
    if (!synchronized) {
      useWorkspaceStore.setState((state) => {
        state.notice =
          "The Architecture Brain is waiting for the canonical project revision to synchronize. No browser-side recommendation substitute was used.";
      });
      return;
    }
    snapshot = useWorkspaceStore.getState();
  }
  const selectedNodeId =
    snapshot.selectedNodeId &&
    snapshot.project.nodes.some((node) => node.id === snapshot.selectedNodeId)
      ? snapshot.selectedNodeId
      : undefined;
  const projectId = snapshot.project.id;
  const branchId = snapshot.project.branch.id;
  const revision = snapshot.project.revision;
  try {
    const projection = await postJson<ArchitectureBrainWorkspaceProjection>(
      "/api/architecture-brain/workspace-projection",
      {
        projectId,
        branchId,
        expectedRevision: revision,
        ...(selectedNodeId ? { selectedNodeId } : {}),
        trigger,
        workspace: intelligenceWorkspaceFor(
          snapshot.workspaceMode,
          snapshot.project.activeStage,
        ),
        ...(event ? { event } : {}),
        intelligencePreferences: snapshot.intelligencePreferences,
      },
    );
    useWorkspaceStore.setState((state) => {
      if (
        state.project.id !== projectId ||
        state.project.branch.id !== branchId ||
        state.project.revision !== revision
      )
        return;
      state.recommendations = safeStructuredClone(projection.recommendations);
      state.contextual = safeStructuredClone(projection.contextual);
      state.findings = safeStructuredClone(projection.findings);
      state.project.findings = safeStructuredClone(projection.findings);
      state.intelligence = safeStructuredClone(projection.intelligence);
    });
  } catch (error) {
    useWorkspaceStore.setState((state) => {
      if (
        state.project.id !== projectId ||
        state.project.branch.id !== branchId ||
        state.project.revision !== revision
      )
        return;
      state.notice = `Architecture Brain projection is unavailable${error instanceof Error ? ` (${error.message})` : ""}. No browser-side recommendation substitute was used.`;
    });
  }
}

function scheduleWorkspaceProjection(
  trigger: RecommendationTrigger,
  event?: ArchitectureEvent,
  delayMs?: number,
): void {
  if (deferredWorkspaceProjectionTimer)
    clearTimeout(deferredWorkspaceProjectionTimer);
  const mutatingTrigger = [
    "intent-change",
    "quality-change",
    "style-selection",
    "pattern-selection",
    "canvas-change",
  ].includes(trigger);
  deferredWorkspaceProjectionTimer = setTimeout(() => {
    deferredWorkspaceProjectionTimer = null;
    void refreshWorkspaceProjectionFromBrain(trigger, event);
  }, delayMs ?? (mutatingTrigger ? 350 : 60));
}

async function refreshLivingCanvasFromBrain(
  kind: DesignGestureKind,
  point?: Point,
  intelligenceMode: "deterministic" | "hybrid" = "deterministic",
): Promise<void> {
  const requestSequence = ++livingCanvasRequestSequence;
  const snapshot = useWorkspaceStore.getState();
  if (
    !snapshot.livingCanvasEnabled ||
    snapshot.workspaceMode !== "design" ||
    ![
      "logicalApplication",
      "applicationRealization",
      "logicalTechnology",
      "physicalTechnology",
    ].includes(snapshot.project.activeStage)
  ) {
    useWorkspaceStore.setState((state) => {
      if (requestSequence !== livingCanvasRequestSequence) return;
      state.livingCanvasEnvelope = null;
      state.livingCanvasPreviewActionId = null;
      state.livingCanvasAssistStatus = "deterministic";
    });
    return;
  }
  useWorkspaceStore.setState((state) => {
    state.livingCanvasAssistStatus = "requesting";
  });
  let requestIdentity:
    | { projectId: string; branchId: string; revision: number }
    | null = null;
  try {
    if (
      snapshot.serverPersistenceEnabled &&
      can(snapshot.experienceProfile, "architecture.write") &&
      snapshot.lastSavedRevision !== snapshot.project.revision
    ) {
      const synchronized = await snapshot.saveProjectToServer();
      if (!synchronized) throw new Error("PROJECT_SYNC_REQUIRED");
    }
    const currentSnapshot = useWorkspaceStore.getState();
    const projectId = currentSnapshot.project.id;
    const branchId = currentSnapshot.project.branch.id;
    const revision = currentSnapshot.project.revision;
    requestIdentity = { projectId, branchId, revision };
    const envelope = await postJson<LivingCanvasActionEnvelope>(
      `/api/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branchId)}/living-canvas/actions`,
      {
        event: livingCanvasGesture(currentSnapshot, kind, point),
        ...(currentSnapshot.livingCanvasSession
          ? { session: currentSnapshot.livingCanvasSession }
          : {}),
        outcomeHistory: currentSnapshot.livingCanvasOutcomeHistory,
        intelligenceMode,
      },
    );
    useWorkspaceStore.setState((state) => {
      if (requestSequence !== livingCanvasRequestSequence) return;
      if (
        state.project.id !== projectId ||
        state.project.branch.id !== branchId ||
        state.project.revision !== revision
      ) {
        state.livingCanvasAssistStatus = "error";
        state.notice =
          "The architecture changed while the Architecture Brain was reasoning. Refresh the Living Canvas before applying a proposal.";
        return;
      }
      const activePreview = state.livingCanvasEnvelope?.actions.find(
        (action) => action.id === state.livingCanvasPreviewActionId,
      );
      // A preview is a governed review lock. Background refreshes must not
      // replace its ghost topology or explanation while the architect is
      // deciding. The user can close, accept, defer or reject the preview and
      // then request a fresh envelope.
      if (activePreview) {
        state.livingCanvasAssistStatus =
          envelope.assistance?.mode === "llm-assisted"
            ? "llm-assisted"
            : envelope.assistance?.mode === "deterministic-fallback"
              ? "deterministic-fallback"
              : "deterministic";
        state.notice = `Preview locked for ${activePreview.label}. Updated guidance can be requested after this decision is dispositioned.`;
        return;
      }
      state.livingCanvasEnvelope = safeStructuredClone(envelope);
      state.livingCanvasSession = safeStructuredClone(envelope.session);
      state.livingCanvasPreviewActionId = null;
      state.livingCanvasAssistStatus =
        envelope.assistance?.mode === "llm-assisted"
          ? "llm-assisted"
          : envelope.assistance?.mode === "deterministic-fallback"
            ? "deterministic-fallback"
            : "deterministic";
      state.notice =
        envelope.assistance?.notice ??
        (envelope.actions.length
          ? `${envelope.actions.length} governed next action(s) generated by the Architecture Brain.`
          : "No eligible Living Canvas action is available for the current context.");
    });
  } catch (error) {
    useWorkspaceStore.setState((state) => {
      if (requestSequence !== livingCanvasRequestSequence) return;
      if (
        requestIdentity &&
        (state.project.id !== requestIdentity.projectId ||
          state.project.branch.id !== requestIdentity.branchId ||
          state.project.revision !== requestIdentity.revision)
      )
        return;
      state.livingCanvasAssistStatus = "error";
      state.livingCanvasEnvelope = null;
      state.livingCanvasPreviewActionId = null;
      state.notice = `Architecture Brain guidance is unavailable${error instanceof Error ? ` (${error.message})` : ""}. No browser-side proposal was generated.`;
    });
  }
}

function scheduleLivingCanvasBrainRefresh(
  kind: DesignGestureKind,
  point?: Point,
  delayMs = 60,
): void {
  if (deferredLivingCanvasRefreshTimer)
    clearTimeout(deferredLivingCanvasRefreshTimer);
  deferredLivingCanvasRefreshTimer = setTimeout(() => {
    deferredLivingCanvasRefreshTimer = null;
    void refreshLivingCanvasFromBrain(kind, point, "deterministic");
  }, delayMs);
}

function recomputeLivingCanvas(
  state: WorkspaceStore,
  kind: DesignGestureKind = "candidate-requested",
  point?: Point,
): void {
  if (
    !state.livingCanvasEnabled ||
    state.workspaceMode !== "design" ||
    ![
      "logicalApplication",
      "applicationRealization",
      "logicalTechnology",
      "physicalTechnology",
    ].includes(state.project.activeStage)
  ) {
    state.livingCanvasEnvelope = null;
    state.livingCanvasPreviewActionId = null;
    return;
  }
  state.livingCanvasPreviewActionId = null;
  state.livingCanvasAssistStatus = "requesting";
  scheduleLivingCanvasBrainRefresh(kind, point);
}

function updateDerived(
  state: WorkspaceStore,
  trigger: RecommendationTrigger,
  event?: ArchitectureEvent,
): void {
  const selected =
    state.selectedNodeId &&
    state.project.nodes.some((node) => node.id === state.selectedNodeId)
      ? state.selectedNodeId
      : null;
  state.selectedNodeId = selected;
  const branchRecord = state.branches?.find(
    (item) => item.metadata.id === state.project.branch.id,
  );
  if (branchRecord) {
    branchRecord.metadata = cloneBranchMetadata(state.project.branch);
    branchRecord.project = cloneProject(state.project);
  }
  scheduleWorkspaceProjection(trigger, event);
  const livingKind: DesignGestureKind =
    event?.kind === "selection-changed"
      ? "scope-selected"
      : event?.kind === "stage-entered"
        ? "scope-opened"
        : "candidate-requested";
  recomputeLivingCanvas(state, livingKind);
}

const stageDraftNodePropertyFields = new Set([
  "description",
  "owner",
  "responsibility",
  "dataOwnership",
  "consistency",
  "availability",
  "securityBoundary",
  "operationalOwner",
  "scalingModel",
  "deploymentModel",
  "failureMode",
  "recoveryApproach",
]);

const stageDraftInterfaceFields = new Set([
  "protocol",
  "operationOrEvent",
  "version",
  "authentication",
  "authorization",
  "encryption",
  "retryPolicy",
  "idempotency",
  "ordering",
  "deliveryGuarantee",
  "deadLetterPolicy",
  "replayPolicy",
  "slo",
  "dataClassification",
  "owner",
  "deprecationPolicy",
]);

function draftString(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function applyStageDraftOperation(
  project: ArchitectureProject,
  operation: StageDraftOperation,
): boolean {
  if (operation.validationStatus !== "ready") return false;
  switch (operation.kind) {
    case "replace-project-description": {
      const value = draftString(operation.proposedValue);
      if (!value || value === project.description) return false;
      project.description = value;
      return true;
    }
    case "append-objective":
    case "append-constraint":
    case "append-assumption": {
      const value = draftString(operation.proposedValue, 1400);
      if (!value) return false;
      const target =
        operation.kind === "append-objective"
          ? project.objectives
          : operation.kind === "append-constraint"
            ? project.constraints
            : project.assumptions;
      if (target.some((item) => item.toLowerCase() === value.toLowerCase()))
        return false;
      target.push(value);
      return true;
    }
    case "upsert-quality-priority": {
      const value =
        operation.proposedValue && typeof operation.proposedValue === "object"
          ? (operation.proposedValue as Record<string, unknown>)
          : {};
      const attributeId = draftString(value.attributeId, 120);
      const weight = Math.max(
        1,
        Math.min(5, Math.round(Number(value.weight ?? 3))),
      );
      if (!attributeId) return false;
      const existing = project.qualityPriorities.find(
        (item) => item.attributeId === attributeId,
      );
      const rationale = draftString(value.rationale, 1200);
      if (existing) {
        if (
          existing.weight === weight &&
          (existing.rationale ?? "") === rationale
        )
          return false;
        existing.weight = weight;
        if (rationale) existing.rationale = rationale;
      } else
        project.qualityPriorities.push({
          attributeId,
          weight,
          ...(rationale ? { rationale } : {}),
        });
      return true;
    }
    case "append-quality-scenario": {
      const value =
        operation.proposedValue && typeof operation.proposedValue === "object"
          ? (operation.proposedValue as Record<string, unknown>)
          : {};
      const attributeId = draftString(value.attributeId, 120);
      const stimulus = draftString(value.stimulus, 800);
      const response = draftString(value.response, 800);
      if (!attributeId || !stimulus || !response) return false;
      const duplicate = project.qualityScenarios.some(
        (item) =>
          item.attributeId === attributeId &&
          item.stimulus.toLowerCase() === stimulus.toLowerCase() &&
          item.response.toLowerCase() === response.toLowerCase(),
      );
      if (duplicate) return false;
      project.qualityScenarios.push({
        id: createId("quality-scenario"),
        attributeId,
        source: draftString(value.source, 500),
        stimulus,
        environment: draftString(value.environment, 500) || "Normal operation",
        artifact: draftString(value.artifact, 500),
        response,
        responseMeasure: draftString(value.responseMeasure, 800),
        weight: Math.max(1, Math.min(5, Math.round(Number(value.weight ?? 3)))),
      });
      return true;
    }
    case "update-node-description": {
      if (!operation.targetId) return false;
      const node = project.nodes.find((item) => item.id === operation.targetId);
      const value = draftString(operation.proposedValue, 2000);
      if (!node || !value || node.description === value) return false;
      node.description = value;
      return true;
    }
    case "update-node-property": {
      if (
        !operation.targetId ||
        !operation.field ||
        !stageDraftNodePropertyFields.has(operation.field)
      )
        return false;
      const node = project.nodes.find((item) => item.id === operation.targetId);
      if (
        !node ||
        JSON.stringify(node.properties[operation.field]) ===
          JSON.stringify(operation.proposedValue)
      )
        return false;
      node.properties[operation.field] = safeStructuredClone(
        operation.proposedValue,
      );
      return true;
    }
    case "update-interface-field": {
      if (
        !operation.targetId ||
        !operation.field ||
        !stageDraftInterfaceFields.has(operation.field)
      )
        return false;
      const contract = (project.interfaces ?? []).find(
        (item) => item.id === operation.targetId,
      );
      if (
        !contract ||
        JSON.stringify(
          (contract as unknown as Record<string, unknown>)[operation.field],
        ) === JSON.stringify(operation.proposedValue)
      )
        return false;
      (contract as unknown as Record<string, unknown>)[operation.field] =
        safeStructuredClone(operation.proposedValue);
      contract.updatedAt = new Date().toISOString();
      return true;
    }
    case "append-decision": {
      const value =
        operation.proposedValue && typeof operation.proposedValue === "object"
          ? (operation.proposedValue as Record<string, unknown>)
          : {};
      const title = draftString(value.title, 240);
      const decision = draftString(value.decision, 1800);
      if (
        !title ||
        !decision ||
        project.decisions.some(
          (item) =>
            item.title.toLowerCase() === title.toLowerCase() &&
            item.status !== "superseded",
        )
      )
        return false;
      const strings = (input: unknown, max = 10) =>
        (Array.isArray(input) ? input : [])
          .map((item) => draftString(item, 500))
          .filter(Boolean)
          .slice(0, max);
      project.decisions.push({
        id: createId("decision"),
        title,
        context: draftString(value.context, 1800),
        decision,
        drivers: strings(value.drivers),
        consideredOptions: strings(value.consideredOptions),
        consequences: strings(value.consequences),
        status: "proposed",
        createdAt: new Date().toISOString(),
        ...(operation.targetId &&
        project.nodes.some((node) => node.id === operation.targetId)
          ? { scopeNodeId: operation.targetId }
          : {}),
        linkedRecordIds: [
          ...new Set([...operation.evidenceRefs, ...operation.requirementRefs]),
        ],
      });
      return true;
    }
    default:
      return false;
  }
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    immer((set, get) => ({
      workspaceMode: "cockpit",
      experienceProfile: "solution-architect",
      roleChosen: false,
      project: safeStructuredClone(initialProject),
      library,
      ...derive(initialProject),
      audit: null,
      snapshots: [],
      branches: [
        {
          metadata: safeStructuredClone(sampleProject.branch),
          project: safeStructuredClone(initialProject),
        },
      ],
      comparison: null,
      impact: null,
      mergePlan: null,
      policyGateResult: null,
      conformancePlan: null,
      conformanceAssessment: null,
      conformanceRemediation: null,
      conformanceVisualModel: null,
      conformanceEvidence: [],
      currentUserId: "user-owner",
      canvasToolMode: "select",
      canvasDensity: "standard",
      canvasSemanticStyleMode: "stage",
      canvasFocusMode: true,
      canvasLayoutPreview: null,
      selectedNodeIds: [],
      selectedNodeId: null,
      connectionKind: "communicatesWith",
      notice: null,
      pendingLibraryDrop: null,
      compositionHistory: [],
      dismissedGuidanceIds: [],
      aiAuditStatus: "idle",
      persistenceStatus: "local",
      lastSavedRevision: null,
      serverPersistenceEnabled: false,
      undoStack: [],
      redoStack: [],
      collaborationPresence: [],
      recentActivity: [],
      livingCanvasEnabled: true,
      livingCanvasAutonomyMode: "guide",
      livingCanvasEnvelope: null,
      livingCanvasSession: null,
      livingCanvasPreviewActionId: null,
      livingCanvasOutcomeHistory: [],
      livingCanvasLastAcceptedAction: null,
      livingCanvasAssistStatus: "deterministic",
      lifecycleCompletions: {},
      lifecycleArtifacts: [],
      activeLifecycleStep: "overview",
      ...createLifecycleFlowActions(set, get, {
        createId,
        hashContent,
        cloneProject,
        lifecycleKey,
        projectLifecycleArtifacts,
        bump,
        updateDerived,
      }),

      hydrateProject: (project, enableServerPersistence = true) =>
        set((state) => {
          const migrated = migrateProject(project);
          const parsed = architectureProjectSchema.safeParse(migrated);
          if (!parsed.success) {
            state.notice =
              "The server returned an invalid architecture project.";
            state.persistenceStatus = "error";
            return;
          }
          state.project = cloneProject(parsed.data);
          const referencePrincipalId =
            REFERENCE_PRINCIPAL_IDS[state.experienceProfile];
          if (
            parsed.data.members.some(
              (member) =>
                member.id === referencePrincipalId &&
                member.status === "active",
            )
          )
            state.currentUserId = referencePrincipalId;
          state.branches = [
            {
              metadata: cloneBranchMetadata(parsed.data.branch),
              project: cloneProject(parsed.data),
            },
          ];
          state.lifecycleCompletions = projectLifecycleCompletions(
            state.lifecycleCompletions,
            parsed.data,
          );
          state.lifecycleArtifacts = projectLifecycleArtifacts(
            state.lifecycleArtifacts,
            parsed.data,
          );
          state.selectedNodeId = null;
          state.selectedNodeIds = [];
          state.canvasLayoutPreview = null;
          state.livingCanvasEnvelope = null;
          state.livingCanvasSession = null;
          state.livingCanvasPreviewActionId = null;
          state.livingCanvasOutcomeHistory = [];
          state.livingCanvasLastAcceptedAction = null;
          state.livingCanvasAssistStatus = "deterministic";
          state.audit = null;
          state.pendingConnectionReview = null;
          state.compositionHistory = [];
          state.conformancePlan = null;
          state.conformanceAssessment = null;
          state.conformanceRemediation = null;
          state.conformanceVisualModel = null;
          state.conformanceEvidence = [];
          state.undoStack = [];
          state.redoStack = [];
          state.serverPersistenceEnabled = enableServerPersistence;
          state.lastSavedRevision = parsed.data.revision;
          state.persistenceStatus = enableServerPersistence ? "saved" : "local";
          updateDerived(state, "initial");
          state.notice = enableServerPersistence
            ? "Project loaded from the governed server repository."
            : "Project loaded in local mode.";
        }),

      loadProjectFromServer: async (projectId, branchId = "branch-main") => {
        set((state) => {
          state.persistenceStatus = "loading";
        });
        try {
          const project = await getJson<ArchitectureProject>(
            `/api/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branchId)}`,
          );
          get().hydrateProject(project, true);
          return true;
        } catch (error) {
          set((state) => {
            state.persistenceStatus = "offline";
            state.notice =
              error instanceof Error
                ? `Server load failed: ${error.message}. Local work remains available.`
                : "Server load failed.";
          });
          return false;
        }
      },

      saveProjectToServer: async () => {
        if (projectSaveInFlight) {
          const completed = await projectSaveInFlight;
          if (!completed) return false;
          const latest = get();
          if (latest.lastSavedRevision === latest.project.revision) return true;
        }
        const task = (async (): Promise<boolean> => {
          const state = get();
          if (!state.serverPersistenceEnabled) return false;
          if (!can(state.experienceProfile, "architecture.write")) return false;
          if (state.lastSavedRevision === state.project.revision) return true;
          set((draft) => {
            draft.persistenceStatus = "saving";
          });
          try {
            const savePayload = {
              project: state.project,
              expectedRevision: state.lastSavedRevision ?? undefined,
            };
            const requestFingerprint = hashContent(savePayload);
            const saved = await putJson<ArchitectureProject>(
              `/api/projects/${encodeURIComponent(state.project.id)}/branches/${encodeURIComponent(state.project.branch.id)}`,
              savePayload,
              {
                "idempotency-key": `web-save-${state.project.id}-${state.project.branch.id}-${state.project.revision}-${requestFingerprint}`,
              },
            );
            set((draft) => {
              draft.persistenceStatus = "saved";
              draft.lastSavedRevision = saved.revision;
            });
            return true;
          } catch (error) {
            const status = (error as Error & { status?: number }).status;
            set((draft) => {
              draft.persistenceStatus = status === 409 ? "conflict" : "offline";
              draft.notice =
                status === 409
                  ? "This project changed on the server. Reload or compare before overwriting."
                  : "Server save is unavailable. Changes remain safely cached locally.";
            });
            return false;
          }
        })();
        const tracked = task.finally(() => {
          if (projectSaveInFlight === tracked) projectSaveInFlight = null;
        });
        projectSaveInFlight = tracked;
        return tracked;
      },

      setServerPersistence: (enabled) =>
        set((state) => {
          state.serverPersistenceEnabled = enabled;
          state.persistenceStatus = enabled ? "saved" : "local";
        }),

      addQualityScenario: (input = {}) =>
        set((state) => {
          const attributeId =
            input.attributeId ??
            state.library.qualityAttributes.find((item) => item.calibrated)
              ?.id ??
            "availability";
          state.project.qualityScenarios.push({
            id: input.id ?? createId("quality-scenario"),
            attributeId,
            source: input.source ?? "",
            stimulus: input.stimulus ?? "",
            environment: input.environment ?? "Normal operation",
            artifact: input.artifact ?? "",
            response: input.response ?? "",
            responseMeasure: input.responseMeasure ?? "",
            weight: input.weight ?? 3,
          });
          bump(state.project);
          updateDerived(state, "quality-change", {
            kind: "quality-scenario-added",
            subjectIds: [state.project.qualityScenarios.at(-1)!.id],
            field: attributeId,
          });
          state.notice = "Measurable quality scenario added.";
        }),

      updateQualityScenario: (scenarioId, patch) =>
        set((state) => {
          const scenario = state.project.qualityScenarios.find(
            (item) => item.id === scenarioId,
          );
          if (!scenario) return;
          Object.assign(scenario, patch);
          bump(state.project);
          updateDerived(state, "quality-change", {
            kind: "quality-scenario-changed",
            subjectIds: [scenarioId],
            field: patch.attributeId ?? scenario.attributeId,
            nextValue: patch,
          });
        }),

      deleteQualityScenario: (scenarioId) =>
        set((state) => {
          const before = state.project.qualityScenarios.length;
          state.project.qualityScenarios =
            state.project.qualityScenarios.filter(
              (item) => item.id !== scenarioId,
            );
          if (state.project.qualityScenarios.length !== before) {
            bump(state.project);
            updateDerived(state, "quality-change");
            state.notice = "Quality scenario removed.";
          }
        }),

      undo: () =>
        set((state) => {
          const previous = state.undoStack.pop();
          if (!previous) {
            state.notice = "Nothing to undo.";
            return;
          }
          state.redoStack.push(cloneProject(state.project));
          state.project = cloneProject(previous);
          state.audit = null;
          updateDerived(state, "canvas-change");
          state.notice = "Last architecture change undone.";
        }),

      redo: () =>
        set((state) => {
          const next = state.redoStack.pop();
          if (!next) {
            state.notice = "Nothing to redo.";
            return;
          }
          state.undoStack.push(cloneProject(state.project));
          state.project = cloneProject(next);
          state.audit = null;
          updateDerived(state, "canvas-change");
          state.notice = "Architecture change restored.";
        }),

      recordCoArchitectExchange: (
        question,
        answer,
        citedRecordIds,
        modelTrace,
      ) =>
        set((state) => {
          const now = new Date().toISOString();
          let session = state.project.coArchitectSessions.find(
            (item) =>
              item.stage === state.project.activeStage &&
              item.scopeNodeId === (state.selectedNodeId ?? undefined),
          );
          if (!session) {
            session = {
              id: createId("coarchitect-session"),
              title: `Co-Architect · ${state.project.activeStage}`,
              stage: state.project.activeStage,
              ...(state.selectedNodeId
                ? { scopeNodeId: state.selectedNodeId }
                : {}),
              createdAt: now,
              updatedAt: now,
              messages: [],
            };
            state.project.coArchitectSessions.unshift(session);
          }
          session.messages.push({
            id: createId("coarchitect-message"),
            role: "user",
            content: question,
            createdAt: now,
            citedRecordIds: [],
          });
          session.messages.push({
            id: createId("coarchitect-message"),
            role: "assistant",
            content: answer,
            createdAt: now,
            citedRecordIds,
            ...(modelTrace ? { modelTrace } : {}),
          });
          session.updatedAt = now;
          bump(state.project, false);
        }),

      setLivingCanvasEnabled: (enabled) =>
        set((state) => {
          state.livingCanvasEnabled = enabled;
          state.livingCanvasPreviewActionId = null;
          state.livingCanvasAssistStatus = "deterministic";
          if (enabled) {
            recomputeLivingCanvas(
              state,
              state.selectedNodeId ? "scope-selected" : "empty-canvas-invoked",
            );
            state.notice =
              "Living Canvas active. Deterministic next actions are now grounded in the current project, stage and scope.";
          } else {
            state.livingCanvasEnvelope = null;
            state.notice =
              "Living Canvas paused. The canonical model remains available for direct editing.";
          }
        }),

      setLivingCanvasAutonomyMode: (mode) =>
        set((state) => {
          state.livingCanvasAutonomyMode = mode;
          state.livingCanvasAssistStatus = "deterministic";
          if (state.livingCanvasSession)
            state.livingCanvasSession.autonomyMode = mode;
          recomputeLivingCanvas(state, "candidate-requested");
          state.notice =
            mode === "guide"
              ? "Guide mode: AIW presents one bounded next decision at a time."
              : mode === "compose"
                ? "Compose mode: AIW presents coherent local topology changes for explicit review."
                : "Draft Stage mode: AIW assembles one bounded, reviewable stage proposal from the released deterministic grammars. Every mutation remains previewed and human-approved.";
        }),

      refreshLivingCanvas: (kind = "candidate-requested", point) =>
        set((state) => {
          recomputeLivingCanvas(state, kind, point);
          state.livingCanvasAssistStatus = "deterministic";
          state.notice = state.livingCanvasEnvelope?.actions.length
            ? `${state.livingCanvasEnvelope.actions.length} governed next action(s) generated from the current architecture context.`
            : "No eligible Living Canvas action is available for the current context.";
        }),

      requestLivingCanvasLlmAssist: async () => {
        const snapshot = get();
        if (
          !snapshot.livingCanvasEnabled ||
          snapshot.workspaceMode !== "design"
        ) {
          set((state) => {
            state.notice =
              "Activate the Living Canvas in a modelling stage before requesting governed AI assistance.";
          });
          return;
        }
        set((state) => {
          state.livingCanvasAssistStatus = "requesting";
          state.notice =
            "Sol is enriching the canonically eligible actions. No model mutation is permitted during reasoning.";
        });
        await refreshLivingCanvasFromBrain(
          "candidate-requested",
          undefined,
          "hybrid",
        );
      },

      previewLivingCanvasAction: (actionId) =>
        set((state) => {
          state.livingCanvasPreviewActionId = actionId;
          const action = actionId
            ? state.livingCanvasEnvelope?.actions.find(
                (item) => item.id === actionId,
              )
            : undefined;
          if (action)
            state.notice = `Previewing ${action.label}. The canonical model has not changed.`;
        }),

      acceptLivingCanvasAction: (actionId) =>
        set((state) => {
          const action = state.livingCanvasEnvelope?.actions.find(
            (item) => item.id === actionId,
          );
          if (!action) {
            state.notice =
              "That proposal is no longer current. Recompute the Living Canvas actions.";
            recomputeLivingCanvas(state);
            return;
          }
          if (!can(state.experienceProfile, "architecture.write")) {
            state.notice =
              "Your current role can inspect this proposal but cannot mutate the architecture.";
            return;
          }
          try {
            const actionSnapshot = safeStructuredClone(action);
            const result = applyLivingCanvasAction({
              project: cloneProject(state.project),
              action: actionSnapshot,
              actorId: state.currentUserId,
              actorRole: state.experienceProfile,
              rationale: "Accepted through the deterministic Living Canvas.",
            });
            state.project = result.project;
            state.livingCanvasLastAcceptedAction = actionSnapshot;
            state.livingCanvasPreviewActionId = null;
            state.livingCanvasOutcomeHistory = [
              ...state.livingCanvasOutcomeHistory,
              {
                actionSemanticKey: action.semanticKey,
                outcome: "accepted",
                at: new Date().toISOString(),
              } satisfies GenerativeOutcomeHistoryItem,
            ].slice(-100);
            queueLivingCanvasFeedback(
              cloneProject(state.project),
              actionSnapshot,
              "accepted",
              "Accepted through the Living Canvas preview.",
              state.livingCanvasEnvelope?.assistance?.trace
                ? safeStructuredClone(
                    state.livingCanvasEnvelope.assistance.trace,
                  )
                : undefined,
            );
            state.selectedNodeId =
              result.nextFocusScopeId ?? action.targetScopeId ?? null;
            state.selectedNodeIds = state.selectedNodeId
              ? [state.selectedNodeId]
              : [];
            updateDerived(state, "canvas-change", {
              kind: "object-added",
              subjectIds: [
                ...result.createdNodeIds,
                ...result.createdRelationshipIds,
                ...result.createdInterfaceIds,
              ],
            });
            state.notice = `${action.label} accepted as revision ${result.nextRevision}. ${result.createdNodeIds.length} object(s), ${result.createdRelationshipIds.length} relationship(s) and ${result.createdInterfaceIds.length} interface(s) were created.`;
          } catch (error) {
            if (error instanceof StaleGenerativeProposalError) {
              recomputeLivingCanvas(state);
              state.notice =
                "The architecture changed after this proposal was generated. AIW recomputed the available actions.";
            } else if (error instanceof InvalidGenerativeMutationError)
              state.notice = error.message;
            else
              state.notice =
                "The Living Canvas proposal could not be applied. The canonical model was not changed.";
          }
        }),

      rejectLivingCanvasAction: (actionId, reason) =>
        set((state) => {
          const action = state.livingCanvasEnvelope?.actions.find(
            (item) => item.id === actionId,
          );
          if (!action) return;
          state.livingCanvasOutcomeHistory = [
            ...state.livingCanvasOutcomeHistory,
            {
              actionSemanticKey: action.semanticKey,
              outcome: "rejected",
              ...(reason ? { reason } : {}),
              at: new Date().toISOString(),
            } satisfies GenerativeOutcomeHistoryItem,
          ].slice(-100);
          queueLivingCanvasFeedback(
            cloneProject(state.project),
            safeStructuredClone(action),
            "rejected",
            reason,
            state.livingCanvasEnvelope?.assistance?.trace
              ? safeStructuredClone(state.livingCanvasEnvelope.assistance.trace)
              : undefined,
          );
          if (state.livingCanvasSession)
            state.livingCanvasSession.rejectedActionIds = [
              ...new Set([
                ...state.livingCanvasSession.rejectedActionIds,
                action.id,
              ]),
            ];
          state.livingCanvasPreviewActionId = null;
          recomputeLivingCanvas(state, "candidate-rejected");
          state.notice = `${action.label} rejected. AIW has adjusted the next-action ranking without changing the model.`;
        }),

      deferLivingCanvasAction: (actionId, reason) =>
        set((state) => {
          const action = state.livingCanvasEnvelope?.actions.find(
            (item) => item.id === actionId,
          );
          if (!action) return;
          state.livingCanvasOutcomeHistory = [
            ...state.livingCanvasOutcomeHistory,
            {
              actionSemanticKey: action.semanticKey,
              outcome: "deferred",
              ...(reason ? { reason } : {}),
              at: new Date().toISOString(),
            } satisfies GenerativeOutcomeHistoryItem,
          ].slice(-100);
          queueLivingCanvasFeedback(
            cloneProject(state.project),
            safeStructuredClone(action),
            "deferred",
            reason,
            state.livingCanvasEnvelope?.assistance?.trace
              ? safeStructuredClone(state.livingCanvasEnvelope.assistance.trace)
              : undefined,
          );
          if (state.livingCanvasSession && action.targetScopeId) {
            state.livingCanvasSession.deferredScopeIds = [
              ...new Set([
                ...state.livingCanvasSession.deferredScopeIds,
                action.targetScopeId,
              ]),
            ];
            state.livingCanvasSession.unresolvedScopeIds =
              state.livingCanvasSession.unresolvedScopeIds.filter(
                (id) => id !== action.targetScopeId,
              );
            const nextActiveScope =
              state.livingCanvasSession.unresolvedScopeIds[0];
            if (nextActiveScope)
              state.livingCanvasSession.activeScopeId = nextActiveScope;
            else delete state.livingCanvasSession.activeScopeId;
          }
          state.livingCanvasPreviewActionId = null;
          recomputeLivingCanvas(state, "candidate-deferred");
          state.notice = `${action.label} deferred. The scope remains traceable in the decomposition session.`;
        }),

      undoLastLivingCanvasAction: () =>
        set((state) => {
          const action = state.livingCanvasLastAcceptedAction;
          if (!action) {
            state.notice =
              "No accepted Living Canvas action is available to roll back.";
            return;
          }
          state.project = rollbackGenerativeMutation(
            cloneProject(state.project),
            safeStructuredClone(action),
          );
          state.livingCanvasOutcomeHistory = [
            ...state.livingCanvasOutcomeHistory,
            {
              actionSemanticKey: action.semanticKey,
              outcome: "edited",
              reason: "Rolled back by the architect.",
              at: new Date().toISOString(),
            } satisfies GenerativeOutcomeHistoryItem,
          ].slice(-100);
          queueLivingCanvasFeedback(
            cloneProject(state.project),
            safeStructuredClone(action),
            "edited",
            "Rolled back by the architect.",
          );
          state.livingCanvasLastAcceptedAction = null;
          state.livingCanvasAssistStatus = "deterministic";
          state.selectedNodeId = null;
          state.selectedNodeIds = [];
          updateDerived(state, "canvas-change", {
            kind: "state-recomputed",
            subjectIds: action.mutationSet.affectedSemanticIds,
          });
          state.notice = `${action.label} rolled back as a new governed revision.`;
        }),

      focusNextLivingCanvasScope: () =>
        set((state) => {
          const nextActionScope = state.livingCanvasEnvelope?.actions.find(
            (action) => action.targetScopeId,
          )?.targetScopeId;
          const nextScope =
            nextActionScope ??
            state.livingCanvasEnvelope?.focusQueue[0] ??
            state.livingCanvasSession?.unresolvedScopeIds[0];
          if (!nextScope || nextScope === "intent:project") {
            state.selectedNodeId = null;
            state.selectedNodeIds = [];
            recomputeLivingCanvas(state, "empty-canvas-invoked");
            state.notice = "Living Canvas focus returned to project intent.";
            return;
          }
          const node = state.project.nodes.find(
            (item) => item.id === nextScope,
          );
          if (node?.stage === state.project.activeStage) {
            state.selectedNodeId = nextScope;
            state.selectedNodeIds = [nextScope];
          }
          if (state.livingCanvasSession)
            state.livingCanvasSession.activeScopeId = nextScope;
          recomputeLivingCanvas(state, "scope-opened");
          state.notice = `Living Canvas focused ${node?.label ?? nextScope}.`;
        }),

      setActiveLifecycleStep: (stepId) =>
        set((state) => {
          state.activeLifecycleStep = stepId;
        }),

      setWorkspaceMode: (mode) =>
        set((state) => {
          state.workspaceMode = mode;
          updateDerived(state, "scope-change", {
            kind: "workspace-entered",
            workspace: intelligenceWorkspaceFor(
              mode,
              state.project.activeStage,
            ),
          });
        }),
      setExperienceProfile: (experienceProfile) =>
        set((state) => {
          state.experienceProfile = experienceProfile;
          state.roleChosen = true;
          const referencePrincipalId =
            REFERENCE_PRINCIPAL_IDS[experienceProfile];
          if (
            state.project.members.some(
              (member) =>
                member.id === referencePrincipalId &&
                member.status === "active",
            )
          )
            state.currentUserId = referencePrincipalId;
          state.notice = `Experience changed to ${experienceProfile.replaceAll("-", " ")}. Reference API requests now use the matching least-privilege development principal; production still requires OIDC/SAML role claims.`;
        }),

      setCurrentUser: (userId) =>
        set((state) => {
          if (
            state.project.members.some(
              (member) => member.id === userId && member.status === "active",
            )
          )
            state.currentUserId = userId;
        }),

      setActiveStage: (stage) =>
        set((state) => {
          const readinessBlockers = stageEntryBlockers(
            state.project,
            stage,
            state.findings,
          );
          // Navigation is exploratory and must remain deterministic across the lifecycle.
          // Readiness gates constrain completion/handoff, not a user's ability to inspect,
          // prepare or understand a downstream stage.
          state.workspaceMode = "design";
          state.project.activeStage = stage;
          state.selectedNodeId = null;
          state.selectedNodeIds = [];
          state.canvasLayoutPreview = null;
          state.notice = readinessBlockers.length
            ? `Stage readiness: ${readinessBlockers.join(" ")} You can prepare this stage now; completion remains gated.`
            : `Opened ${stage.replace(/([A-Z])/g, " $1").toLowerCase()}.`;
          updateDerived(state, "scope-change", {
            kind: "stage-entered",
            field: "activeStage",
            nextValue: stage,
          });
        }),

      intelligence: null,
      pendingConnectionReview: null,
      intelligencePreferences: { demoted: {} },

      recordIntelligenceOutcome: (actionKind, outcome) =>
        set((state) => {
          state.intelligencePreferences = applyOutcomeToPreferences(
            state.intelligencePreferences,
            actionKind,
            outcome,
          );
          scheduleWorkspaceProjection("scope-change");
        }),

      setContextField: (field, value) =>
        set((state) => {
          state.project.context[field] = value as never;
          bump(state.project);
          updateDerived(state, "intent-change", {
            kind: "attribute-changed",
            field: String(field),
            previousValue: undefined,
            nextValue: value,
          });
        }),

      selectNode: (nodeId) => {
        set((state) => {
          state.selectedNodeId = nodeId;
          state.selectedNodeIds = nodeId ? [nodeId] : [];
        });
        if (deferredSelectionDerivedTimer)
          clearTimeout(deferredSelectionDerivedTimer);
        deferredSelectionDerivedTimer = setTimeout(() => {
          deferredSelectionDerivedTimer = null;
          set((state) => {
            if (state.selectedNodeId !== nodeId) return;
            updateDerived(state, "scope-change", {
              kind: "selection-changed",
              ...(nodeId ? { subjectIds: [nodeId] } : {}),
            });
          });
        }, 24);
      },

      setProjectText: (field, value) =>
        set((state) => {
          state.project[field] = value;
          bump(state.project);
          updateDerived(state, "intent-change", {
            kind: "requirement-changed",
            field,
            nextValue: value,
          });
        }),

      setListField: (field, value) =>
        set((state) => {
          state.project[field] = value
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean);
          bump(state.project);
          updateDerived(state, "intent-change", {
            kind:
              field === "constraints"
                ? "constraint-changed"
                : "requirement-changed",
            field,
            nextValue: value,
          });
        }),

      setQualityWeight: (attributeId, weight) =>
        set((state) => {
          const existing = state.project.qualityPriorities.find(
            (item) => item.attributeId === attributeId,
          );
          if (existing) existing.weight = weight;
          else state.project.qualityPriorities.push({ attributeId, weight });
          bump(state.project);
          updateDerived(state, "quality-change", {
            kind: "attribute-changed",
            field: attributeId,
            nextValue: weight,
          });
        }),

      applyStageCoAuthorOperations: (proposal, operationIds) =>
        set((state) => {
          if (proposal.projectRevision !== state.project.revision) {
            state.notice =
              "This Sol draft is stale because the architecture changed. Refresh the stage explanation before accepting fields.";
            return;
          }
          const selected = new Set(operationIds);
          const operations = proposal.operations.filter((item) =>
            selected.has(item.id),
          );
          if (!operations.length) {
            state.notice =
              "Select at least one validated draft field to accept.";
            return;
          }
          const snapshot = cloneProject(state.project);
          let applied = 0;
          for (const operation of operations)
            if (applyStageDraftOperation(state.project, operation))
              applied += 1;
          if (!applied) {
            state.notice =
              "No selected draft could be applied. Resolve clarifications or refresh the proposal.";
            return;
          }
          state.undoStack.push(snapshot);
          state.undoStack = state.undoStack.slice(-50);
          state.redoStack = [];
          bump(state.project);
          updateDerived(
            state,
            proposal.targetStage === "qualityDrivers"
              ? "quality-change"
              : proposal.targetStage === "requirements"
                ? "intent-change"
                : "canvas-change",
            {
              kind:
                proposal.targetStage === "qualityDrivers"
                  ? "quality-scenario-changed"
                  : proposal.targetStage === "requirements"
                    ? "requirement-changed"
                    : "attribute-changed",
              field: `stage-co-author:${proposal.targetStage}`,
              nextValue: operations.map((item) => item.id),
            },
          );
          state.notice = `${applied} reviewed Sol draft${applied === 1 ? "" : "s"} accepted. The change is audited locally and can be undone.`;
        }),

      setConnectionKind: (kind) =>
        set((state) => {
          state.connectionKind = kind;
        }),

      upsertInterface: (contract) =>
        set((state) => {
          state.project.interfaces ??= [];
          const normalized = safeStructuredClone(contract);
          const index = state.project.interfaces.findIndex(
            (item) => item.id === normalized.id,
          );
          if (index >= 0) state.project.interfaces[index] = normalized;
          else state.project.interfaces.push(normalized);
          bump(state.project);
          updateDerived(state, "canvas-change");
          state.notice = `${normalized.name} interface contract saved.`;
        }),

      removeInterface: (interfaceId) =>
        set((state) => {
          state.project.interfaces ??= [];
          const item = state.project.interfaces.find(
            (contract) => contract.id === interfaceId,
          );
          const next = state.project.interfaces.filter(
            (contract) => contract.id !== interfaceId,
          );
          if (next.length === state.project.interfaces.length) return;
          state.project.interfaces = next;
          bump(state.project);
          updateDerived(state, "canvas-change");
          state.notice = `${item?.name ?? "Interface"} removed.`;
        }),

      upsertArchitectureView: (view) =>
        set((state) => {
          state.project.architectureViews ??= [];
          const normalized = safeStructuredClone(view);
          const index = state.project.architectureViews.findIndex(
            (item) => item.id === normalized.id,
          );
          if (index >= 0) state.project.architectureViews[index] = normalized;
          else state.project.architectureViews.push(normalized);
          bump(state.project);
          updateDerived(state, "canvas-change");
          state.notice = `${normalized.name} view saved.`;
        }),

      addArchitectureViewVersion: (version) =>
        set((state) => {
          state.project.architectureViewVersions ??= [];
          const normalized = safeStructuredClone(version);
          const index = state.project.architectureViewVersions.findIndex(
            (item) => item.id === normalized.id,
          );
          if (index >= 0)
            state.project.architectureViewVersions[index] = normalized;
          else state.project.architectureViewVersions.push(normalized);
          bump(state.project);
          updateDerived(state, "canvas-change");
          state.notice = `${normalized.label} captured.`;
        }),

      applyScenarioTemplate: (template) =>
        applyScenarioTemplateAction(
          {
            get,
            set: set as never,
            createId,
            bump,
            updateDerived: updateDerived as never,
            validateProposedNode,
          },
          template,
        ),

      addNode: (template) => {
        const currentProject = get().project;
        const stage = currentProject.activeStage;
        if (stage === "designIntent" || stage === "validationRealization")
          return;
        const stageNodeCount = currentProject.nodes.filter(
          (item) => item.stage === stage,
        ).length;
        const node: ArchitectureNode = {
          id: createId("node"),
          kind: template.kind,
          stage,
          label: template.label,
          properties: { ...template.properties },
          lineageFrom: [],
          positions: {
            [stage]: {
              x: 160 + (stageNodeCount % 4) * 230,
              y: 120 + Math.floor(stageNodeCount / 4) * 150,
            },
          },
          tags: [...template.tags],
          status: "draft",
        };
        const validation = validateProposedNode(get().project, node);
        if (!validation.allowed) {
          set((state) => {
            state.notice =
              validation.findings[0]?.message ??
              "Selection blocked by a hard constraint.";
          });
          return;
        }
        set((state) => {
          state.project.nodes.push(node);
          state.selectedNodeId = node.id;
          state.selectedNodeIds = [node.id];
          bump(state.project);
          updateDerived(state, "canvas-change", {
            kind: "object-added",
            subjectIds: [node.id],
          });
          state.notice = `${node.label} added. Embedded intelligence recalculated the palette, critique and next actions.`;
        });
      },

      previewLibraryDrop: (recordId, position, scopeNodeId) => {
        try {
          const preview = buildLibraryDropPreview(
            get().project,
            get().library,
            recordId,
            get().project.activeStage,
            position,
            scopeNodeId,
          );
          set((state) => {
            state.pendingLibraryDrop = preview;
            state.notice =
              preview.disposition === "blocked"
                ? preview.explanation
                : `${preview.record.name} is ready for review before placement.`;
          });
        } catch (error) {
          set((state) => {
            state.notice =
              error instanceof Error
                ? error.message
                : "The library object could not be previewed.";
          });
        }
      },

      commitLibraryDrop: () =>
        set((state) => {
          if (!state.pendingLibraryDrop) return;
          try {
            const preview = safeStructuredClone(state.pendingLibraryDrop);
            state.project = applyLibraryDrop(
              safeStructuredClone(state.project),
              preview,
            );
            state.selectedNodeId =
              preview.nodes[0]?.id ?? preview.scopeNodeId ?? null;
            state.selectedNodeIds = preview.nodes.length
              ? preview.nodes.map((node) => node.id)
              : state.selectedNodeId
                ? [state.selectedNodeId]
                : [];
            state.pendingLibraryDrop = null;
            updateDerived(
              state,
              preview.record.recordType === "style"
                ? "style-selection"
                : preview.record.recordType === "pattern"
                  ? "pattern-selection"
                  : "canvas-change",
              {
                kind:
                  preview.record.recordType === "style"
                    ? "style-accepted"
                    : preview.record.recordType === "pattern"
                      ? "pattern-accepted"
                      : "object-added",
                subjectIds: preview.nodes.map((node) => node.id).length
                  ? preview.nodes.map((node) => node.id)
                  : [preview.record.id],
              },
            );
            state.notice = `${preview.record.name} applied. Recommendations, obligations and decisions were recalculated.`;
          } catch (error) {
            state.notice =
              error instanceof Error
                ? error.message
                : "The library object could not be applied.";
          }
        }),

      cancelLibraryDrop: () =>
        set((state) => {
          state.pendingLibraryDrop = null;
          state.notice =
            "Library placement cancelled; the architecture baseline was not changed.";
        }),

      applyPatternCompositionPlan: (plan) =>
        set((state) => {
          if (!plan.eligible) {
            state.notice =
              "This composition cannot be applied until the blocking authority, prerequisite or canonical-model checks are resolved.";
            return;
          }
          try {
            const safePlan = safeStructuredClone(plan);
            state.project = applyGovernedPatternComposition(
              safeStructuredClone(state.project),
              safePlan,
            );
            state.compositionHistory = [
              safePlan,
              ...state.compositionHistory.filter(
                (item) => item.id !== safePlan.id,
              ),
            ].slice(0, 20);
            state.selectedNodeIds = safePlan.mutation.addNodes.map(
              (node) => node.id,
            );
            state.selectedNodeId =
              state.selectedNodeIds[0] ?? state.selectedNodeId;
            state.canvasFocusMode = true;
            updateDerived(state, "pattern-selection", {
              kind: "pattern-accepted",
              subjectIds: safePlan.patternIds,
            });
            state.notice = `Composition applied: ${safePlan.mutation.addNodes.length} object(s), ${safePlan.mutation.addEdges.length} relationship(s), ${safePlan.mutation.addInterfaces.length} interface(s), ${safePlan.obligations.length} obligation(s) and ${safePlan.mutation.addArchitectureViews.length} named view(s).`;
          } catch (error) {
            state.notice =
              error instanceof Error
                ? error.message
                : "The governed composition could not be applied.";
          }
        }),

      applyStageTransitionProposal: (proposal) =>
        set((state) => {
          const safeProposal = safeStructuredClone(proposal);
          const selectedCount = safeProposal.candidates.filter(
            (candidate) => candidate.selected,
          ).length;
          if (!selectedCount) {
            state.notice =
              "Select at least one governed transition candidate before applying the stage transformation.";
            return;
          }
          state.undoStack.push(safeStructuredClone(current(state.project)));
          state.redoStack = [];
          state.project = applyGovernedStageTransitionProposal(
            safeStructuredClone(current(state.project)),
            safeProposal,
          );
          state.selectedNodeIds = safeProposal.candidates
            .filter((candidate) => candidate.selected)
            .map((candidate) => candidate.proposedNode.id);
          state.selectedNodeId = state.selectedNodeIds[0] ?? null;
          state.canvasFocusMode = true;
          updateDerived(state, "canvas-change", {
            kind: "object-added",
            subjectIds: state.selectedNodeIds,
          });
          state.notice = `${selectedCount} governed stage projection${selectedCount === 1 ? "" : "s"} applied. Upstream lineage and Viewbook projections were refreshed.`;
        }),

      rollbackPatternCompositionPlan: (planId) =>
        set((state) => {
          const plan = planId
            ? state.compositionHistory.find((item) => item.id === planId)
            : state.compositionHistory[0];
          if (!plan) {
            state.notice =
              "No applied pattern composition is available to roll back.";
            return;
          }
          state.project = rollbackGovernedPatternComposition(
            safeStructuredClone(state.project),
            safeStructuredClone(plan),
          );
          state.compositionHistory = state.compositionHistory.filter(
            (item) => item.id !== plan.id,
          );
          state.selectedNodeIds = [];
          state.selectedNodeId = null;
          updateDerived(state, "canvas-change", {
            kind: "selection-changed",
            subjectIds: plan.patternIds,
          });
          state.notice = `Composition ${plan.id} rolled back without changing unrelated model content.`;
        }),

      updateNodeProperty: (nodeId, key, value) =>
        set((state) => {
          const node = state.project.nodes.find((item) => item.id === nodeId);
          if (!node) return;
          const previousValue = node.properties[key];
          node.properties[key] = value;
          bump(state.project);
          updateDerived(state, "canvas-change", {
            kind: "attribute-changed",
            subjectIds: [nodeId],
            field: key,
            previousValue,
            nextValue: value,
          });
          state.notice = `${node.label} updated. Contextual recommendations were recalculated.`;
        }),

      updateNodeLabel: (nodeId, label) =>
        set((state) => {
          const node = state.project.nodes.find((item) => item.id === nodeId);
          if (!node || !label.trim()) return;
          const previousValue = node.label;
          node.label = label.trim();
          bump(state.project);
          updateDerived(state, "canvas-change", {
            kind: "attribute-changed",
            subjectIds: [nodeId],
            field: "label",
            previousValue,
            nextValue: node.label,
          });
        }),

      applyCanvasArrangement: ({ positions, dimensions = {}, label }) =>
        set((state) => {
          const stage = state.project.activeStage;
          const affectedIds = new Set<string>();
          for (const [nodeId, position] of Object.entries(positions)) {
            const node = state.project.nodes.find((item) => item.id === nodeId);
            if (!node || node.stage !== stage || getNodeVisualStyle(node).locked) continue;
            node.positions[stage] = position;
            affectedIds.add(nodeId);
          }
          for (const [nodeId, size] of Object.entries(dimensions)) {
            const node = state.project.nodes.find((item) => item.id === nodeId);
            if (!node || node.stage !== stage || getNodeVisualStyle(node).locked) continue;
            setNodeVisualStyle(node, {
              width: Math.max(128, Math.min(1180, Math.round(size.width))),
              height: Math.max(72, Math.min(880, Math.round(size.height))),
              collapsed: false,
            });
            affectedIds.add(nodeId);
          }
          if (!affectedIds.size) return;
          bump(state.project);
          updateDerived(state, "canvas-change", {
            kind: "attribute-changed",
            subjectIds: [...affectedIds],
            field: "canvasArrangement",
            nextValue: label,
          });
          state.notice = label;
        }),

      onNodesChange: (changes) =>
        set((state) => {
          const stage = state.project.activeStage;
          const removedIds: string[] = [];
          let positionCommitted = false;
          for (const change of changes) {
            if (change.type === "position" && change.position) {
              const node = state.project.nodes.find(
                (item) => item.id === change.id,
              );
              if (node) {
                const visual = getNodeVisualStyle(node);
                if (visual.locked) continue;
                node.positions[stage] = change.position;
                if ((change as { dragging?: boolean }).dragging === false)
                  positionCommitted = true;
              }
            }
            if (change.type === "select") {
              const selected = Boolean(
                (change as { selected?: boolean }).selected,
              );
              const ids = new Set(state.selectedNodeIds);
              if (selected) ids.add(change.id);
              else ids.delete(change.id);
              state.selectedNodeIds = [...ids].filter((id) =>
                state.project.nodes.some((node) => node.id === id),
              );
              state.selectedNodeId = selected
                ? change.id
                : (state.selectedNodeIds[0] ?? null);
            }
            if (change.type === "remove") {
              state.project.nodes = state.project.nodes.filter(
                (item) => item.id !== change.id,
              );
              state.project.edges = state.project.edges.filter(
                (edge) =>
                  edge.sourceId !== change.id && edge.targetId !== change.id,
              );
              if (state.selectedNodeId === change.id)
                state.selectedNodeId = null;
              state.selectedNodeIds = state.selectedNodeIds.filter(
                (id) => id !== change.id,
              );
              removedIds.push(change.id);
            }
          }
          if (removedIds.length || positionCommitted) bump(state.project);
          if (removedIds.length)
            updateDerived(state, "canvas-change", {
              kind: "object-removed",
              subjectIds: removedIds,
            });
        }),

      onEdgesChange: (changes) =>
        set((state) => {
          let changed = false;
          for (const change of changes) {
            if (change.type === "remove") {
              state.project.edges = state.project.edges.filter(
                (edge) => edge.id !== change.id,
              );
              changed = true;
            }
          }
          if (changed) {
            bump(state.project);
            updateDerived(state, "canvas-change", {
              kind: "relationship-removed",
            });
          }
        }),

      connect: (connection) => {
        const source = connection.source;
        const target = connection.target;
        if (!source || !target) return;
        void (async () => {
          const snapshot = get();
          const revision = snapshot.project.revision;
          const event: ArchitectureEvent = {
            kind: "connection-intent",
            sourceId: source,
            targetId: target,
            relationshipKind: snapshot.connectionKind,
            subjectIds: [source, target],
          };
          set((state) => {
            state.notice =
              "The Architecture Brain is validating the connection intent…";
          });
          try {
            const projection =
              await postJson<ArchitectureBrainWorkspaceProjection>(
                "/api/architecture-brain/workspace-projection",
                {
                  projectId: snapshot.project.id,
                  branchId: snapshot.project.branch.id,
                  expectedRevision: snapshot.project.revision,
                  ...(snapshot.selectedNodeId
                    ? { selectedNodeId: snapshot.selectedNodeId }
                    : {}),
                  trigger: "canvas-change",
                  workspace: intelligenceWorkspaceFor(
                    snapshot.workspaceMode,
                    snapshot.project.activeStage,
                  ),
                  event,
                  intelligencePreferences: snapshot.intelligencePreferences,
                },
              );
            set((state) => {
              if (state.project.revision !== revision) {
                state.notice =
                  "The architecture changed while the connection was being evaluated. Recreate the connection intent.";
                return;
              }
              const intelligence = projection.intelligence;
              const preferred =
                intelligence.suggestedRelationships.find(
                  (item) => item.recommended,
                )?.relationType ??
                intelligence.suggestedRelationships[0]?.relationType ??
                state.connectionKind;
              state.pendingConnectionReview = {
                sourceId: source,
                targetId: target,
                selectedKind: preferred,
                intelligence,
              };
              state.intelligence = safeStructuredClone(intelligence);
              state.recommendations = safeStructuredClone(
                projection.recommendations,
              );
              state.contextual = safeStructuredClone(projection.contextual);
              state.findings = safeStructuredClone(projection.findings);
              state.notice =
                "Connection intent analysed by the Architecture Brain. Review semantics, missing attributes and governed evidence before applying it.";
            });
          } catch (error) {
            set((state) => {
              state.pendingConnectionReview = null;
              state.notice = `Connection intelligence is unavailable${error instanceof Error ? ` (${error.message})` : ""}. No browser-side relationship recommendation was substituted.`;
            });
          }
        })();
      },

      setPendingConnectionKind: (kind) =>
        set((state) => {
          if (state.pendingConnectionReview)
            state.pendingConnectionReview.selectedKind = kind;
        }),

      setPendingConnectionSemantics: (patch) =>
        set((state) => {
          if (!state.pendingConnectionReview) return;
          state.pendingConnectionReview = {
            ...state.pendingConnectionReview,
            semantics: {
              ...((
                state.pendingConnectionReview as {
                  semantics?: Record<string, string>;
                }
              ).semantics ?? {}),
              ...patch,
            },
          } as never;
        }),

      commitPendingConnection: () => {
        const current = get();
        const pending = current.pendingConnectionReview;
        if (!pending) return;
        const kind = pending.selectedKind;
        const edge: ArchitectureEdge = {
          id: createId("edge"),
          sourceId: pending.sourceId,
          targetId: pending.targetId,
          kind,
          stage: current.project.activeStage,
          label:
            kind === "publishes"
              ? "Publishes event"
              : kind === "subscribes"
                ? "Subscribes"
                : undefined,
          properties: {
            protocolStyle:
              kind === "publishes" || kind === "subscribes"
                ? "asynchronous"
                : "synchronous",
            intelligenceReviewed: true,
            intelligenceTraceId: pending.intelligence.trace.id,
            knowledgeReleaseId:
              pending.intelligence.evidence.knowledgeReleaseId,
            ...((pending as { semantics?: Record<string, string> }).semantics ??
              {}),
          },
        };
        const result = validateProposedEdge(current.project, edge);
        if (!result.allowed) {
          set((draft) => {
            draft.notice =
              result.findings[0]?.message ??
              "Connection blocked by a hard constraint.";
          });
          return;
        }
        set((draft) => {
          draft.project.edges.push(edge);
          draft.pendingConnectionReview = null;
          bump(draft.project);
          updateDerived(draft, "canvas-change", {
            kind: "relationship-created",
            subjectIds: [edge.id, edge.sourceId, edge.targetId],
            sourceId: edge.sourceId,
            targetId: edge.targetId,
            relationshipKind: edge.kind,
          });
          draft.notice =
            result.findings.length > 0
              ? `Connection added after intelligence review with ${result.findings.length} deterministic advisory finding(s).`
              : "Connection added after intelligence review.";
        });
      },

      cancelPendingConnection: () =>
        set((state) => {
          state.pendingConnectionReview = null;
          state.notice =
            "Connection proposal cancelled; the architecture baseline was not changed.";
        }),

      setCanvasToolMode: (mode) =>
        set((state) => {
          state.canvasToolMode = mode;
          state.notice = `Canvas tool changed to ${mode.replaceAll("-", " ")}.`;
        }),

      setCanvasDensity: (density) =>
        set((state) => {
          state.canvasDensity = density;
          state.notice = `Canvas density changed to ${density}.`;
        }),

      setCanvasSemanticStyleMode: (mode) =>
        set((state) => {
          state.canvasSemanticStyleMode = mode;
          state.notice =
            mode === "manual"
              ? "Manual styling active; architecture meaning remains unchanged."
              : `Semantic styling set to ${mode}.`;
        }),

      setCanvasFocusMode: (enabled) =>
        set((state) => {
          state.canvasFocusMode = enabled;
          state.notice = enabled
            ? "Focus mode enabled: selected-object context will be emphasized."
            : "Focus mode disabled.";
        }),

      updateNodeVisualStyle: (nodeId, patch) =>
        set((state) => {
          const node = state.project.nodes.find((item) => item.id === nodeId);
          if (!node) return;
          setNodeVisualStyle(node, patch);
          bump(state.project);
          updateDerived(state, "canvas-change", {
            kind: "attribute-changed",
            subjectIds: [nodeId],
            field: "visualStyle",
            nextValue: patch,
          });
          state.notice = `${node.label} presentation updated. Architecture semantics were not changed.`;
        }),

      resetNodeVisualStyle: (nodeId) =>
        set((state) => {
          const node = state.project.nodes.find((item) => item.id === nodeId);
          if (!node) return;
          resetNodeVisualStyle(node);
          bump(state.project);
          updateDerived(state, "canvas-change", {
            kind: "attribute-changed",
            subjectIds: [nodeId],
            field: "visualStyle",
            nextValue: "reset",
          });
          state.notice = `${node.label} style reset to governed defaults.`;
        }),

      resizeNode: (nodeId, size) =>
        set((state) => {
          const node = state.project.nodes.find((item) => item.id === nodeId);
          if (!node) return;
          const width = Math.max(128, Math.min(640, Math.round(size.width)));
          const height = Math.max(72, Math.min(460, Math.round(size.height)));
          setNodeVisualStyle(node, { width, height });
          bump(state.project);
          updateDerived(state, "canvas-change", {
            kind: "attribute-changed",
            subjectIds: [nodeId],
            field: "dimensions",
            nextValue: { width, height },
          });
          state.notice = `${node.label} resized to ${width}×${height}.`;
        }),

      autoSizeNode: (nodeId) =>
        set((state) => {
          const node = state.project.nodes.find((item) => item.id === nodeId);
          if (!node) return;
          const descriptorLength =
            `${node.label} ${node.description ?? ""} ${Object.values(node.properties).join(" ")}`
              .length;
          const width = Math.max(
            176,
            Math.min(420, 136 + node.label.length * 5),
          );
          const height = Math.max(
            92,
            Math.min(
              260,
              82 +
                Math.ceil(descriptorLength / 120) * 28 +
                node.tags.length * 4,
            ),
          );
          setNodeVisualStyle(node, { width, height, collapsed: false });
          bump(state.project);
          updateDerived(state, "canvas-change", {
            kind: "attribute-changed",
            subjectIds: [nodeId],
            field: "dimensions",
            nextValue: { width, height, mode: "auto-fit" },
          });
          state.notice = `${node.label} auto-sized to fit its current content.`;
        }),

      setNodeLocked: (nodeId, locked) =>
        set((state) => {
          const node = state.project.nodes.find((item) => item.id === nodeId);
          if (!node) return;
          setNodeVisualStyle(node, { locked });
          bump(state.project);
          updateDerived(state, "canvas-change", {
            kind: "attribute-changed",
            subjectIds: [nodeId],
            field: "locked",
            nextValue: locked,
          });
          state.notice = locked
            ? `${node.label} locked for presentation.`
            : `${node.label} unlocked for editing.`;
        }),

      resizeSelectedNodes: (size) =>
        set((state) => {
          const ids = state.selectedNodeIds.length
            ? state.selectedNodeIds
            : state.selectedNodeId
              ? [state.selectedNodeId]
              : [];
          let count = 0;
          for (const id of ids) {
            const node = state.project.nodes.find((item) => item.id === id);
            if (!node) continue;
            const visual = getNodeVisualStyle(node);
            if (visual.locked) continue;
            setNodeVisualStyle(node, {
              width: Math.max(128, Math.min(640, Math.round(size.width))),
              height: Math.max(72, Math.min(460, Math.round(size.height))),
            });
            count += 1;
          }
          if (!count) return;
          bump(state.project);
          updateDerived(state, "canvas-change", {
            kind: "attribute-changed",
            subjectIds: ids,
            field: "bulk-dimensions",
            nextValue: size,
          });
          state.notice = `Applied size to ${count} selected object(s).`;
        }),

      alignSelectedNodes: (axis) =>
        set((state) => {
          const stage = state.project.activeStage;
          const nodes = state.selectedNodeIds
            .map((id) => state.project.nodes.find((node) => node.id === id))
            .filter(Boolean) as ArchitectureNode[];
          if (nodes.length < 2) {
            state.notice = "Select at least two objects to align.";
            return;
          }
          const measurements = nodes.map((node) => ({
            node,
            pos: node.positions[stage] ?? { x: 0, y: 0 },
            visual: getNodeVisualStyle(node),
          }));
          const left = Math.min(...measurements.map((item) => item.pos.x));
          const right = Math.max(
            ...measurements.map(
              (item) => item.pos.x + (item.visual.width ?? 188),
            ),
          );
          const top = Math.min(...measurements.map((item) => item.pos.y));
          const bottom = Math.max(
            ...measurements.map(
              (item) => item.pos.y + (item.visual.height ?? 108),
            ),
          );
          const center = (left + right) / 2;
          const middle = (top + bottom) / 2;
          let moved = 0;
          for (const item of measurements) {
            if (item.visual.locked) continue;
            const width = item.visual.width ?? 188;
            const height = item.visual.height ?? 108;
            const next = { ...item.pos };
            if (axis === "left") next.x = left;
            if (axis === "center") next.x = center - width / 2;
            if (axis === "right") next.x = right - width;
            if (axis === "top") next.y = top;
            if (axis === "middle") next.y = middle - height / 2;
            if (axis === "bottom") next.y = bottom - height;
            item.node.positions[stage] = next;
            moved += 1;
          }
          if (!moved) return;
          bump(state.project);
          updateDerived(state, "canvas-change", {
            kind: "attribute-changed",
            subjectIds: nodes.map((node) => node.id),
            field: "alignment",
            nextValue: axis,
          });
          state.notice = `Aligned ${moved} selected object(s) to ${axis}.`;
        }),

      distributeSelectedNodes: (axis) =>
        set((state) => {
          const stage = state.project.activeStage;
          const nodes = state.selectedNodeIds
            .map((id) => state.project.nodes.find((node) => node.id === id))
            .filter(Boolean) as ArchitectureNode[];
          if (nodes.length < 3) {
            state.notice = "Select at least three objects to distribute.";
            return;
          }
          const sorted = [...nodes].sort((a, b) =>
            axis === "horizontal"
              ? (a.positions[stage]?.x ?? 0) - (b.positions[stage]?.x ?? 0)
              : (a.positions[stage]?.y ?? 0) - (b.positions[stage]?.y ?? 0),
          );
          const first = sorted[0]?.positions[stage] ?? { x: 0, y: 0 };
          const last = sorted.at(-1)?.positions[stage] ?? first;
          const span =
            axis === "horizontal" ? last.x - first.x : last.y - first.y;
          const step = span / Math.max(1, sorted.length - 1);
          let moved = 0;
          sorted.forEach((node, index) => {
            const visual = getNodeVisualStyle(node);
            if (visual.locked) return;
            const pos = node.positions[stage] ?? { x: 0, y: 0 };
            node.positions[stage] =
              axis === "horizontal"
                ? { ...pos, x: first.x + step * index }
                : { ...pos, y: first.y + step * index };
            moved += 1;
          });
          if (!moved) return;
          bump(state.project);
          updateDerived(state, "canvas-change", {
            kind: "attribute-changed",
            subjectIds: nodes.map((node) => node.id),
            field: "distribution",
            nextValue: axis,
          });
          state.notice = `Distributed ${moved} selected object(s) ${axis}.`;
        }),

      toggleNodeCollapsed: (nodeId) =>
        set((state) => {
          const node = state.project.nodes.find((item) => item.id === nodeId);
          if (!node) return;
          const visual = getNodeVisualStyle(node);
          setNodeVisualStyle(node, {
            collapsed: !visual.collapsed,
            height: visual.collapsed ? Math.max(96, visual.height ?? 112) : 64,
          });
          bump(state.project);
          updateDerived(state, "canvas-change", {
            kind: "attribute-changed",
            subjectIds: [nodeId],
            field: "collapsed",
            nextValue: !visual.collapsed,
          });
          state.notice = `${node.label} ${visual.collapsed ? "expanded" : "collapsed"}.`;
        }),

      applySemanticStyleToCanvas: (mode) =>
        set((state) => {
          const semanticMode = mode ?? state.canvasSemanticStyleMode;
          if (semanticMode === "manual") {
            state.notice =
              "Manual mode selected; no semantic styling was applied.";
            return;
          }
          let count = 0;
          for (const node of state.project.nodes.filter(
            (item) => item.stage === state.project.activeStage,
          )) {
            setNodeVisualStyle(node, {
              ...semanticVisualStyleForNode(node, state.findings, semanticMode),
              badgesVisible: true,
            });
            count += 1;
          }
          bump(state.project);
          updateDerived(state, "canvas-change", {
            kind: "attribute-changed",
            field: "semanticStyle",
            nextValue: semanticMode,
          });
          state.notice = `Semantic ${semanticMode} styling applied to ${count} object(s).`;
        }),

      previewIntelligentLayout: (intent, asNewView = true) =>
        set((state) => {
          const preview = createIntelligentLayoutPreview(
            state.project,
            intent,
            state.project.activeStage,
            asNewView,
          );
          state.canvasLayoutPreview = preview;
          state.notice = `${preview.title} preview ready: ${preview.summary}`;
        }),

      applyLayoutPreview: () =>
        set((state) => {
          if (!state.canvasLayoutPreview) {
            state.notice = "No intelligent layout preview is active.";
            return;
          }
          const preview = safeStructuredClone(state.canvasLayoutPreview);
          applyLayoutPreviewToProject(
            state.project,
            preview,
            state.project.activeStage,
          );
          state.canvasLayoutPreview = null;
          bump(state.project);
          updateDerived(state, "canvas-change", {
            kind: "attribute-changed",
            field: "layout",
            nextValue: preview.intent,
          });
          state.notice = `${preview.title} applied as a governed visual view. Architecture semantics were preserved.`;
        }),

      cancelLayoutPreview: () =>
        set((state) => {
          state.canvasLayoutPreview = null;
          state.notice =
            "Layout preview cancelled; object positions were not changed.";
        }),

      toggleLineage: (nodeId, upstreamNodeId) =>
        set((state) => {
          const node = state.project.nodes.find((item) => item.id === nodeId);
          if (!node) return;
          const index = node.lineageFrom.indexOf(upstreamNodeId);
          if (index >= 0) node.lineageFrom.splice(index, 1);
          else node.lineageFrom.push(upstreamNodeId);
          bump(state.project);
          updateDerived(state, "canvas-change", {
            kind: "attribute-changed",
            subjectIds: [nodeId],
            field: "lineageFrom",
            nextValue: [...node.lineageFrom],
          });
          state.notice =
            index >= 0 ? "Lineage mapping removed." : "Lineage mapping added.";
        }),

      acceptStyleRecommendation: (styleId) =>
        set((state) => {
          const recommendation = state.contextual.styles.find(
            (item) => item.styleId === styleId,
          );
          const style = state.library.architectureStyles.find(
            (item) => item.id === styleId,
          );
          if (!recommendation || !style) return;
          const scopeNodeId = state.selectedNodeId ?? undefined;
          for (const item of state.project.styleDecisions) {
            if (
              item.stage === state.project.activeStage &&
              item.scopeNodeId === scopeNodeId &&
              item.status === "accepted"
            )
              item.status = "superseded";
          }
          const rationale = [
            `Selected from the live recommendation engine with a score of ${recommendation.score.toFixed(1)}.`,
            ...recommendation.strengths,
            ...recommendation.tradeoffs.map(
              (item) => `Accepted trade-off: ${item}`,
            ),
          ].join(" ");
          state.project.styleDecisions.push({
            id: createId("style-decision"),
            styleId,
            scopeNodeId,
            stage: state.project.activeStage,
            rationale,
            status: "accepted",
          });
          state.project.decisions.push({
            id: createId("adr"),
            title: `Adopt ${style.name}${scopeNodeId ? " for the selected scope" : ""}`,
            context: state.contextual.headline,
            decision: `Adopt ${style.name} as the architecture style for this scope.`,
            drivers: recommendation.strengths,
            consideredOptions: state.contextual.styles
              .slice(0, 4)
              .map((item) => item.styleName),
            consequences: [
              ...recommendation.tradeoffs,
              ...recommendation.obligations,
            ],
            status: "accepted",
            createdAt: new Date().toISOString(),
            linkedRecordIds: [styleId],
            scopeNodeId,
          });
          bump(state.project);
          updateDerived(state, "style-selection", {
            kind: "style-accepted",
            subjectIds: [styleId],
          });
          state.notice = `${style.name} accepted. Associated patterns, obligations and consequences were recalculated.`;
        }),

      setPatternStatus: (patternId, status) =>
        set((state) => {
          const pattern = state.library.patterns.find(
            (item) => item.id === patternId,
          );
          if (!pattern) return;
          const scopeNodeId = state.selectedNodeId ?? undefined;
          let selection = state.project.patternSelections.find(
            (item) =>
              item.patternId === patternId &&
              item.scopeNodeId === scopeNodeId &&
              item.stage === state.project.activeStage &&
              item.status !== "superseded",
          );
          if (!selection) {
            selection = {
              id: createId("pattern-selection"),
              patternId,
              scopeNodeId,
              stage: state.project.activeStage,
              rationale: `Selected from live recommendations for ${state.contextual.headline.toLowerCase()}`,
              status,
              obligationsAcknowledged: [],
            };
            state.project.patternSelections.push(selection);
          } else selection.status = status;

          if (status === "accepted") {
            const recommendation = state.contextual.patterns.find(
              (item) => item.patternId === patternId,
            );
            state.project.decisions.push({
              id: createId("adr"),
              title: `Apply ${pattern.name}`,
              context:
                recommendation?.reasons.join(" ") ?? state.contextual.headline,
              decision: `Apply ${pattern.name} within the current scope.`,
              drivers: recommendation?.reasons ?? [],
              consideredOptions: [
                "Apply pattern",
                "Use an alternative pattern",
                "Accept the risk without this pattern",
              ],
              consequences: [...pattern.obligations, ...pattern.risks],
              status: "accepted",
              createdAt: new Date().toISOString(),
              linkedRecordIds: [patternId],
              scopeNodeId,
            });
          }
          bump(state.project);
          updateDerived(state, "pattern-selection", {
            kind:
              status === "accepted" ? "pattern-accepted" : "pattern-considered",
            subjectIds: [patternId],
          });
          state.notice = `${pattern.name} marked as ${status}. Recommendations and obligations were updated.`;
        }),

      acknowledgeObligation: (patternId, obligation) =>
        set((state) => {
          const selection = state.project.patternSelections.find(
            (item) =>
              item.patternId === patternId &&
              (item.status === "accepted" || item.status === "considering"),
          );
          if (!selection) return;
          const index = selection.obligationsAcknowledged.indexOf(obligation);
          if (index >= 0) selection.obligationsAcknowledged.splice(index, 1);
          else selection.obligationsAcknowledged.push(obligation);
          bump(state.project);
          updateDerived(state, "pattern-selection");
        }),

      recordDecisionSuggestion: (suggestionId) =>
        set((state) => {
          const suggestion = state.contextual.decisions.find(
            (item) => item.id === suggestionId,
          );
          if (!suggestion) return;
          const decision: ArchitectureDecision = {
            id: createId("adr"),
            title: suggestion.title,
            context: suggestion.context,
            decision: suggestion.recommendedDecision,
            drivers: suggestion.drivers,
            consideredOptions: suggestion.consideredOptions,
            consequences: suggestion.consequences,
            status: "accepted",
            createdAt: new Date().toISOString(),
            linkedRecordIds: suggestion.linkedRecordIds,
            scopeNodeId: suggestion.scopeNodeId,
          };
          state.project.decisions.push(decision);
          bump(state.project);
          updateDerived(state, "canvas-change", {
            kind: "decision-recorded",
            subjectIds: [decision.id],
          });
          state.notice = "Architecture decision recorded as an accepted ADR.";
        }),

      validate: () => {
        const snapshot = get();
        set((state) => {
          state.notice =
            "The Architecture Brain is validating the canonical model…";
        });
        void refreshWorkspaceProjectionFromBrain("canvas-change", {
          kind: "state-recomputed",
          workspace: intelligenceWorkspaceFor(
            snapshot.workspaceMode,
            snapshot.project.activeStage,
          ),
        }).then(() => {
          const current = get();
          set((state) => {
            state.notice =
              current.findings.length === 0
                ? "No deterministic findings."
                : `${current.findings.length} finding(s) identified by the Architecture Brain.`;
          });
        });
      },

      invokeAudit: async () => {
        const current = get();
        set((state) => {
          state.aiAuditStatus = "connecting";
          state.notice =
            "The Architecture Brain is running the governed assurance workflow…";
        });
        try {
          const audit = await postJson<AuditResult>(
            "/api/audits/assisted",
            {
              projectId: current.project.id,
              branchId: current.project.branch.id,
              expectedRevision: current.project.revision,
            },
          );
          set((state) => {
            state.audit = audit;
            state.findings = audit.findings;
            state.aiAuditStatus =
              audit.source === "llm-assisted"
                ? "llm-assisted"
                : "deterministic-fallback";
            state.notice =
              audit.source === "llm-assisted"
                ? `${audit.summary} Model proposals are reviewable and reversible.`
                : `${audit.summary} The Architecture Brain used its deterministic assurance path.`;
          });
        } catch (error) {
          set((state) => {
            state.audit = null;
            state.aiAuditStatus = "failed";
            state.notice = `The governed assurance workflow is unavailable${error instanceof Error ? ` (${error.message})` : ""}. No browser-side audit substitute was executed.`;
          });
        }
      },

      toggleProposal: (proposalId) =>
        set((state) => {
          const proposal = state.audit?.proposals.find(
            (item) => item.id === proposalId,
          );
          if (proposal) proposal.selected = !proposal.selected;
        }),

      acceptSelectedProposals: () =>
        set((state) => {
          if (!state.audit) return;
          state.project = applySelectedProposals(
            state.project,
            state.audit.proposals,
          );
          updateDerived(state, "canvas-change");
          state.audit = null;
          state.notice =
            "Selected architecture proposals merged into a new project revision.";
        }),

      discardAudit: () =>
        set((state) => {
          state.audit = null;
          state.notice =
            "Audit proposals discarded; the baseline was not changed.";
        }),

      createSnapshot: (label, status = "draft") => {
        let created: ProjectSnapshot | null = null;
        let persistToServer = false;
        set((state) => {
          const snapshot: ProjectSnapshot = {
            id: createId("snapshot"),
            projectId: state.project.id,
            revision: state.project.revision,
            label: label?.trim() || `Revision ${state.project.revision}`,
            status,
            createdAt: new Date().toISOString(),
            contentHash: hashContent(state.project),
            project: cloneProject(state.project),
          };
          created = snapshot;
          persistToServer = state.serverPersistenceEnabled;
          state.snapshots.unshift(snapshot);
          state.notice = `Snapshot “${snapshot.label}” created${persistToServer ? " and queued for governed persistence" : " locally"}.`;
        });
        if (created && persistToServer) {
          const snapshot = created as ProjectSnapshot;
          void postJson<ProjectSnapshot>(
            `/api/projects/${encodeURIComponent(snapshot.projectId)}/snapshots`,
            {
              project: snapshot.project,
              label: snapshot.label,
              status: snapshot.status,
              createdBy: get().currentUserId,
            },
          )
            .then((serverSnapshot) =>
              set((state) => {
                const index = state.snapshots.findIndex(
                  (item) => item.id === snapshot.id,
                );
                if (index >= 0) state.snapshots[index] = serverSnapshot;
                state.notice = `Snapshot “${serverSnapshot.label}” persisted to the governed repository.`;
              }),
            )
            .catch((error) =>
              set((state) => {
                state.notice =
                  error instanceof Error
                    ? `Snapshot remains local: ${error.message}`
                    : "Snapshot remains local because server persistence failed.";
              }),
            );
        }
      },

      restoreSnapshot: (snapshotId) =>
        set((state) => {
          const snapshot = state.snapshots.find(
            (item) => item.id === snapshotId,
          );
          if (!snapshot) return;
          state.project = cloneProject(snapshot.project);
          state.project.revision += 1;
          state.project.updatedAt = new Date().toISOString();
          state.selectedNodeId = null;
          state.selectedNodeIds = [];
          state.canvasLayoutPreview = null;
          state.audit = null;
          updateDerived(state, "initial");
          state.notice = `Snapshot “${snapshot.label}” restored as a new revision.`;
        }),

      createBranch: (name, description = "") =>
        set((state) => {
          const activeRecord = state.branches.find(
            (item) => item.metadata.id === state.project.branch.id,
          );
          if (activeRecord) activeRecord.project = cloneProject(state.project);
          const now = new Date().toISOString();
          const branchId = createId("branch");
          const project = cloneProject(state.project);
          project.branch = {
            id: branchId,
            name: name.trim() || `Alternative ${state.branches.length}`,
            description,
            parentBranchId: state.project.branch.id,
            baseRevision: state.project.revision,
            status: "candidate",
            createdAt: now,
          };
          project.revision += 1;
          project.updatedAt = now;
          state.branches.push({
            metadata: cloneBranchMetadata(project.branch),
            project: cloneProject(project),
          });
          state.project = project;
          state.workspaceMode = "design";
          updateDerived(state, "initial");
          state.notice = `Created and switched to branch “${project.branch.name}”.`;
        }),

      switchBranch: (branchId) =>
        set((state) => {
          const active = state.branches.find(
            (item) => item.metadata.id === state.project.branch.id,
          );
          if (active) active.project = cloneProject(state.project);
          const target = state.branches.find(
            (item) => item.metadata.id === branchId,
          );
          if (!target) return;
          state.project = cloneProject(target.project);
          state.selectedNodeId = null;
          state.selectedNodeIds = [];
          state.comparison = null;
          state.impact = null;
          updateDerived(state, "initial");
          state.notice = `Switched to branch “${target.metadata.name}”.`;
        }),

      compareWithBranch: (branchId) =>
        set((state) => {
          const target = state.branches.find(
            (item) => item.metadata.id === branchId,
          );
          if (!target) return;
          state.comparison = compareBranches(target.project, state.project);
          state.workspaceMode = "comparison";
        }),

      mergeBranch: (branchId) =>
        set((state) => {
          const source = state.branches.find(
            (item) => item.metadata.id === branchId,
          );
          if (!source) return;
          state.mergePlan = createMergePlan(source.project, state.project);
          state.workspaceMode = "comparison";
          state.notice = state.mergePlan.conflicts.length
            ? `Merge plan created with ${state.mergePlan.conflicts.length} conflict(s) requiring explicit resolution.`
            : "Merge plan is ready; no conflicting records were detected.";
        }),

      resolveMergeConflictChoice: (conflictId, resolution) =>
        set((state) => {
          if (!state.mergePlan) return;
          state.mergePlan = resolveMergeConflict(
            state.mergePlan,
            conflictId,
            resolution,
          );
          state.notice = `Conflict resolution set to ${resolution}.`;
        }),

      applyPreparedMerge: () =>
        set((state) => {
          if (!state.mergePlan) return;
          const source = state.branches.find(
            (item) => item.metadata.id === state.mergePlan?.sourceBranchId,
          );
          if (!source) return;
          try {
            state.project = applyMergePlan(
              source.project,
              state.project,
              state.mergePlan,
            );
            const targetRecord = state.branches.find(
              (item) => item.metadata.id === state.project.branch.id,
            );
            if (targetRecord)
              targetRecord.project = cloneProject(state.project);
            source.metadata.status = "merged";
            state.mergePlan.status = "applied";
            state.comparison = null;
            state.workspaceMode = "design";
            updateDerived(state, "initial");
            state.notice = `Merged “${source.metadata.name}” after explicit conflict resolution.`;
          } catch (error) {
            state.notice =
              error instanceof Error ? error.message : "Merge failed.";
          }
        }),

      cancelPreparedMerge: () =>
        set((state) => {
          if (state.mergePlan) state.mergePlan.status = "cancelled";
          state.mergePlan = null;
          state.workspaceMode = "portfolio";
          state.notice =
            "Merge plan cancelled; no architecture records were changed.";
        }),

      analyseSelectedImpact: () =>
        set((state) => {
          if (!state.selectedNodeId) {
            state.notice =
              "Select a canvas component before running impact analysis.";
            return;
          }
          state.impact = analyseImpact(state.project, [state.selectedNodeId]);
          state.workspaceMode = "governance";
        }),

      assignStageReview: (
        stage,
        assignedTo,
        instructions,
        priority = "normal",
      ) =>
        set((state) => {
          try {
            state.project = assignReview(state.project, {
              stage,
              assignedTo,
              assignedBy: state.currentUserId,
              instructions,
              priority,
              snapshotId: [...state.snapshots].find(
                (item) => item.project.branch.id === state.project.branch.id,
              )?.id,
            });
            updateDerived(state, "canvas-change");
            state.notice = `Review assigned for ${stage}.`;
          } catch (error) {
            state.notice =
              error instanceof Error
                ? error.message
                : "Review assignment failed.";
          }
        }),

      completeStageReview: (assignmentId) =>
        set((state) => {
          try {
            state.project = completeReview(
              state.project,
              assignmentId,
              state.currentUserId,
            );
            updateDerived(state, "canvas-change");
            state.notice = "Review assignment completed.";
          } catch (error) {
            state.notice =
              error instanceof Error
                ? error.message
                : "Review completion failed.";
          }
        }),

      createDiscussionThread: (targetType, targetId, title, body) =>
        set((state) => {
          try {
            state.project = createDiscussion(state.project, {
              actorId: state.currentUserId,
              targetType,
              targetId,
              title,
              body,
            });
            updateDerived(state, "canvas-change");
            state.notice = "Discussion thread created.";
          } catch (error) {
            state.notice =
              error instanceof Error
                ? error.message
                : "Discussion could not be created.";
          }
        }),

      addThreadComment: (threadId, body) =>
        set((state) => {
          try {
            state.project = addDiscussionComment(
              state.project,
              threadId,
              state.currentUserId,
              body,
            );
            updateDerived(state, "canvas-change");
            state.notice = "Comment added.";
          } catch (error) {
            state.notice =
              error instanceof Error
                ? error.message
                : "Comment could not be added.";
          }
        }),

      resolveDiscussionThread: (threadId) =>
        set((state) => {
          try {
            state.project = resolveDiscussion(
              state.project,
              threadId,
              state.currentUserId,
            );
            updateDerived(state, "canvas-change");
            state.notice = "Discussion resolved.";
          } catch (error) {
            state.notice =
              error instanceof Error
                ? error.message
                : "Discussion could not be resolved.";
          }
        }),

      markNotificationRead: (notificationId) =>
        set((state) => {
          const item = state.project.notifications.find(
            (notification) =>
              notification.id === notificationId &&
              notification.recipientId === state.currentUserId,
          );
          if (item && !item.readAt) item.readAt = new Date().toISOString();
        }),

      runExpiryCheck: () =>
        set((state) => {
          const previousRevision = state.project.revision;
          state.project = expireGovernanceItems(state.project);
          if (state.project.revision !== previousRevision) {
            updateDerived(state, "canvas-change");
            state.notice =
              "Expired approvals and overdue reviews were updated.";
          } else state.notice = "No approvals or reviews have expired.";
        }),

      requestStageApproval: (stage, requestedBy = "Architecture author") =>
        set((state) => {
          const openObligations = state.contextual.obligations.filter(
            (item) => !item.satisfied,
          ).length;
          const readiness = approvalReadiness(
            state.project,
            stage,
            state.findings,
            openObligations,
          );
          if (!readiness.ready) {
            state.notice = `Approval not ready: ${readiness.blockers.join(" ")}`;
            return;
          }
          const completedReview = [...state.project.reviewAssignments]
            .reverse()
            .find(
              (item) =>
                item.stage === stage &&
                item.branchId === state.project.branch.id &&
                item.status === "completed",
            );
          if (
            state.project.collaborationSettings.requireIndependentReviewer &&
            !completedReview
          ) {
            state.notice =
              "Approval not ready: an independent review assignment must be completed first.";
            return;
          }
          const now = new Date();
          const snapshot: ProjectSnapshot = {
            id: createId("snapshot"),
            projectId: state.project.id,
            revision: state.project.revision,
            label: `${stage} approval baseline`,
            status: "reviewed",
            createdAt: now.toISOString(),
            contentHash: hashContent(state.project),
            project: cloneProject(state.project),
          };
          state.snapshots.unshift(snapshot);
          const approval: StageApproval = {
            id: createId("approval"),
            stage,
            status: "pending",
            requestedAt: now.toISOString(),
            requestedBy,
            assignedReviewerId: completedReview?.assignedTo,
            dueAt: completedReview?.dueAt,
            comments: [],
            snapshotId: snapshot.id,
          };
          state.project.stageApprovals = state.project.stageApprovals.filter(
            (item) => item.stage !== stage || item.status === "approved",
          );
          state.project.stageApprovals.push(approval);
          if (approval.assignedReviewerId)
            state.project.notifications.unshift({
              id: createId("notification"),
              recipientId: approval.assignedReviewerId,
              type: "approval-requested",
              title: `Approval requested: ${stage}`,
              message: `Review the immutable baseline ${snapshot.label}.`,
              targetType: "approval",
              targetId: approval.id,
              createdAt: now.toISOString(),
            });
          bump(state.project, false);
          state.notice = `${stage} submitted for approval against immutable snapshot ${snapshot.label}.`;
        }),

      decideStageApproval: (approvalId, status, reviewer, comment) =>
        set((state) => {
          const approval = state.project.stageApprovals.find(
            (item) => item.id === approvalId,
          );
          if (!approval) return;
          const now = new Date();
          approval.status = status;
          approval.reviewer = reviewer;
          approval.decidedAt = now.toISOString();
          if (comment?.trim()) approval.comments.push(comment.trim());
          if (status === "approved") {
            const expires = new Date(now);
            expires.setUTCDate(
              expires.getUTCDate() +
                state.project.collaborationSettings.approvalValidityDays,
            );
            approval.expiresAt = expires.toISOString();
            state.project.nodes
              .filter((node) => node.stage === approval.stage)
              .forEach((node) => {
                node.status = "approved";
              });
          }
          const recipientId =
            state.project.members.find(
              (member) => member.displayName === approval.requestedBy,
            )?.id ??
            state.project.members.find((member) => member.role === "owner")?.id;
          if (recipientId)
            state.project.notifications.unshift({
              id: createId("notification"),
              recipientId,
              type: "approval-decided",
              title: `Approval ${status}: ${approval.stage}`,
              message:
                comment?.trim() || `The approval request was marked ${status}.`,
              targetType: "approval",
              targetId: approval.id,
              createdAt: now.toISOString(),
            });
          bump(state.project, false);
          state.notice = `${approval.stage} approval marked ${status}.`;
        }),

      toggleRulePack: (rulePackId) =>
        set((state) => {
          const index = state.project.activeRulePackIds.indexOf(rulePackId);
          if (index >= 0) state.project.activeRulePackIds.splice(index, 1);
          else state.project.activeRulePackIds.push(rulePackId);
          bump(state.project);
          updateDerived(state, "canvas-change");
          state.notice =
            index >= 0
              ? "Governance rule pack disabled."
              : "Governance rule pack enabled and validation recalculated.";
        }),

      importRuntimeInventoryData: (name, sourceType, raw) => {
        const inventory = importRuntimeInventory(
          get().project,
          name,
          sourceType,
          raw,
        );
        set((state) => {
          state.project.runtimeInventories.unshift(inventory);
          bump(state.project, false);
          state.workspaceMode = "drift";
          state.notice = `${inventory.resources.length} runtime resource(s) imported from ${sourceType}.`;
        });
        return inventory.id;
      },

      analyseRuntimeDrift: (inventoryId) => {
        const inventory = get().project.runtimeInventories.find(
          (item) => item.id === inventoryId,
        );
        if (!inventory) return null;
        const report = analyseArchitectureDrift(get().project, inventory);
        set((state) => {
          state.project.driftReports.unshift(report);
          bump(state.project, false);
          state.policyGateResult = null;
          state.conformancePlan = null;
          state.conformanceAssessment = null;
          state.conformanceRemediation = null;
          state.conformanceVisualModel = null;
          state.conformanceEvidence = [];
          state.notice = `Drift analysis completed with ${report.findings.length} finding(s).`;
        });
        return report;
      },

      evaluatePolicyGateNow: (gateId, reportId) => {
        const gate = get().project.policyGates.find(
          (item) => item.id === gateId,
        );
        if (!gate) return null;
        const report = reportId
          ? get().project.driftReports.find((item) => item.id === reportId)
          : get().project.driftReports[0];
        const result = evaluateArchitecturePolicyGate(
          get().project,
          gate,
          get().findings,
          report,
        );
        set((state) => {
          state.policyGateResult = result;
          state.notice = result.passed
            ? "Architecture policy gate passed."
            : `Architecture policy gate failed with ${result.reasons.length} reason(s).`;
        });
        return result;
      },

      ...createConformanceOpsActions(set, get, bump),

      evaluateReferenceSlo: (sloId, observedValue) => {
        const slo = get().project.serviceLevelObjectives.find(
          (item) => item.id === sloId,
        );
        if (!slo) return null;
        const evaluation = evaluateSlo(slo, observedValue);
        set((state) => {
          state.notice = `${slo.name}: ${evaluation.status}; error budget ${evaluation.errorBudgetRemainingPercent.toFixed(1)}%.`;
        });
        return evaluation;
      },

      adoptSynthesizedProject: (project) =>
        set((state) => {
          const validated = architectureProjectSchema.safeParse(project);
          if (
            !validated.success ||
            validated.data.tenantId !== state.project.tenantId
          ) {
            state.notice =
              "Synthesized project failed schema or tenant validation.";
            return;
          }
          state.project = safeStructuredClone(validated.data);
          const branchIndex = state.branches.findIndex(
            (item) => item.metadata.id === validated.data.branch.id,
          );
          if (branchIndex >= 0)
            state.branches[branchIndex] = {
              metadata: safeStructuredClone(validated.data.branch),
              project: safeStructuredClone(validated.data),
            };
          else
            state.branches.push({
              metadata: safeStructuredClone(validated.data.branch),
              project: safeStructuredClone(validated.data),
            });
          state.workspaceMode = "design";
          state.selectedNodeId = null;
          state.selectedNodeIds = [];
          state.canvasLayoutPreview = null;
          state.audit = null;
          updateDerived(state, "canvas-change");
          state.notice =
            "Synthesized architecture applied as a governed project revision.";
        }),

      importProject: (text) => {
        try {
          const parsedText = JSON.parse(text) as unknown;
          const project = migrateProject(parsedText);
          if (!project)
            return {
              success: false,
              error: "The file is not a valid AIW 0.7 project model.",
            };
          set((state) => {
            state.project = project;
            state.branches = [
              {
                metadata: cloneBranchMetadata(project.branch),
                project: cloneProject(project),
              },
            ];
            state.workspaceMode = "design";
            state.selectedNodeId = null;
            state.audit = null;
            updateDerived(state, "initial");
            state.notice = "Project imported and validated.";
          });
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error ? error.message : "Invalid JSON file.",
          };
        }
      },

      dismissGuidance: (guidanceId) =>
        set((state) => {
          if (!state.dismissedGuidanceIds.includes(guidanceId))
            state.dismissedGuidanceIds.push(guidanceId);
        }),

      clearNotice: () =>
        set((state) => {
          state.notice = null;
        }),

      resetDemo: () =>
        set((state) => {
          state.project = safeStructuredClone(initialProject);
          state.branches = [
            {
              metadata: safeStructuredClone(sampleProject.branch),
              project: safeStructuredClone(initialProject),
            },
          ];
          state.workspaceMode = "design";
          state.comparison = null;
          state.impact = null;
          state.mergePlan = null;
          state.policyGateResult = null;
          state.conformancePlan = null;
          state.conformanceAssessment = null;
          state.conformanceRemediation = null;
          state.conformanceVisualModel = null;
          state.conformanceEvidence = [];
          state.currentUserId = "user-owner";
          state.selectedNodeId = null;
          state.selectedNodeIds = [];
          state.pendingConnectionReview = null;
          state.compositionHistory = [];
          state.livingCanvasEnvelope = null;
          state.livingCanvasSession = null;
          state.livingCanvasPreviewActionId = null;
          state.livingCanvasOutcomeHistory = [];
          state.livingCanvasLastAcceptedAction = null;
          state.livingCanvasAssistStatus = "deterministic";
          updateDerived(state, "initial");
          state.audit = null;
          state.snapshots = [];
          state.lifecycleCompletions = {};
          state.lifecycleArtifacts = [];
          state.activeLifecycleStep = "overview";
          state.notice = "Demo workspace reset.";
        }),
    })),
    {
      name: "aiw-sprint8-workspace",
      partialize: (state) => ({
        project: state.project,
        snapshots: state.snapshots,
        branches: state.branches,
        currentUserId: state.currentUserId,
        experienceProfile: state.experienceProfile,
        roleChosen: state.roleChosen,
        dismissedGuidanceIds: state.dismissedGuidanceIds,
        serverPersistenceEnabled: state.serverPersistenceEnabled,
        lastSavedRevision: state.lastSavedRevision,
        intelligencePreferences: state.intelligencePreferences,
        lifecycleCompletions: state.lifecycleCompletions,
        lifecycleArtifacts: state.lifecycleArtifacts,
        activeLifecycleStep: state.activeLifecycleStep,
        compositionHistory: state.compositionHistory,
        livingCanvasEnabled: state.livingCanvasEnabled,
        livingCanvasAutonomyMode: state.livingCanvasAutonomyMode,
        livingCanvasSession: state.livingCanvasSession,
        livingCanvasOutcomeHistory: state.livingCanvasOutcomeHistory,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<WorkspaceStore>;
        const project = migrateProject(saved.project) ?? current.project;
        const branches = (saved.branches ?? []).map((branch) => ({
          metadata: branch.metadata,
          project: migrateProject(branch.project) ?? project,
        }));
        const intelligencePreferences = saved.intelligencePreferences ?? {
          demoted: {},
        };
        return {
          ...current,
          project,
          snapshots: saved.snapshots ?? [],
          branches: branches.length
            ? branches
            : [{ metadata: project.branch, project }],
          currentUserId: saved.currentUserId ?? "user-owner",
          experienceProfile: saved.experienceProfile ?? "solution-architect",
          roleChosen: saved.roleChosen ?? false,
          dismissedGuidanceIds: saved.dismissedGuidanceIds ?? [],
          serverPersistenceEnabled: saved.serverPersistenceEnabled ?? false,
          lastSavedRevision: saved.lastSavedRevision ?? null,
          lifecycleCompletions: projectLifecycleCompletions(
            saved.lifecycleCompletions,
            project,
          ),
          lifecycleArtifacts: projectLifecycleArtifacts(
            saved.lifecycleArtifacts,
            project,
          ),
          activeLifecycleStep: saved.activeLifecycleStep ?? "overview",
          compositionHistory: saved.compositionHistory ?? [],
          livingCanvasEnabled: saved.livingCanvasEnabled ?? true,
          livingCanvasAutonomyMode: saved.livingCanvasAutonomyMode ?? "guide",
          livingCanvasSession: saved.livingCanvasSession ?? null,
          livingCanvasOutcomeHistory: saved.livingCanvasOutcomeHistory ?? [],
          livingCanvasEnvelope: null,
          livingCanvasPreviewActionId: null,
          livingCanvasLastAcceptedAction: null,
          persistenceStatus: saved.serverPersistenceEnabled ? "saved" : "local",
          undoStack: [],
          redoStack: [],
          collaborationPresence: [],
          recentActivity: [],
          pendingConnectionReview: null,
          intelligencePreferences,
          intelligence: null,
          ...derive(project),
        };
      },
    },
  ),
);

export type { PaletteTemplate, ChangeProposal, DecisionSuggestion };

let historyMutation = false;
let autosaveTimer: number | undefined;
useWorkspaceStore.subscribe((state, previous) => {
  if (
    !historyMutation &&
    state.project.id === previous.project.id &&
    state.project.revision !== previous.project.revision
  ) {
    historyMutation = true;
    useWorkspaceStore.setState({
      undoStack: [
        ...previous.undoStack,
        safeStructuredClone(previous.project),
      ].slice(-50),
      redoStack: [],
    });
    historyMutation = false;
  }
  if (
    state.experienceProfile !== previous.experienceProfile &&
    !can(state.experienceProfile, "architecture.write") &&
    autosaveTimer !== undefined
  ) {
    window.clearTimeout(autosaveTimer);
    autosaveTimer = undefined;
  }
  if (
    state.serverPersistenceEnabled &&
    can(state.experienceProfile, "architecture.write") &&
    state.project.revision !== previous.project.revision
  ) {
    if (autosaveTimer !== undefined) window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => {
      void useWorkspaceStore.getState().saveProjectToServer();
    }, 900);
  }
});
