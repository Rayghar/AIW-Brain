import type {
  ArchitectureBrainProposalReceipt,
  ArchitectureBrainResponse,
  ArchitectureProject,
  ArchitectureSynthesisRequest,
  ArchitectureDesignGraphCanonicalStatePatch,
  DesignGestureEvent,
  GenerativeOutcomeHistoryItem,
  KnowledgeLibrary,
  RequirementsDistillationProposal,
  StageCoAuthorProposal,
  StageCoAuthorTarget,
  StageDecompositionSession,
} from "@aiw/domain";
import type {
  ArchitectureEvent,
  IntelligenceWorkspace,
  RequirementsSourceInput,
} from "@aiw/engine";
import {
  architectureBrainAuthorityAudit,
  createArchitectureBrainProposalReceipt,
  createArchitectureKnowledgeManifest,
} from "@aiw/intelligence";
import type { CoArchitectLifecycleStage } from "./coArchitect.js";
import { loadKnowledgeLibrary } from "./library.js";
import { llmRuntimeConfigurations } from "./llmRuntimeStore.js";
import {
  createArchitectureBrainRuntime,
  modelTrace,
  type ArchitectureBrainRuntime,
} from "./architectureBrainRuntime.js";

export interface ArchitectureBrainOrchestratorDependencies {
  loadLibrary?: () => Promise<KnowledgeLibrary>;
  gatewayForTenant?: (
    tenantId: string,
  ) => ReturnType<typeof llmRuntimeConfigurations.gateway>;
  runtime?: ArchitectureBrainRuntime;
}

function withReceipt<T extends object>(
  result: T,
  brainReceipt: ArchitectureBrainProposalReceipt,
): ArchitectureBrainResponse<T> {
  return Object.assign(result, { brainReceipt });
}

export class ArchitectureBrainOrchestrator {
  private readonly runtime: ArchitectureBrainRuntime;

  constructor(dependencies: ArchitectureBrainOrchestratorDependencies = {}) {
    const loadLibrary = dependencies.loadLibrary ?? loadKnowledgeLibrary;
    const gatewayForTenant =
      dependencies.gatewayForTenant ??
      ((tenantId: string) => llmRuntimeConfigurations.gateway(tenantId));
    this.runtime =
      dependencies.runtime ??
      createArchitectureBrainRuntime({ loadLibrary, gatewayForTenant });
  }

  manifest(project: ArchitectureProject, knowledgeReleaseId?: string) {
    return createArchitectureKnowledgeManifest({
      project,
      ...(knowledgeReleaseId ? { knowledgeReleaseId } : {}),
    });
  }

  authorityAudit() {
    return architectureBrainAuthorityAudit();
  }

  designGraphPreview(input: { project: ArchitectureProject }) {
    const graph = this.runtime.designGraphPreview(input.project);
    return withReceipt(
      graph,
      createArchitectureBrainProposalReceipt({
        task: "design-graph-projection",
        project: input.project,
        manifest: this.manifest(input.project),
        deterministicRules: [
          "canonical-record-normalization",
          "canonical-relationship-normalization",
          "graph-integrity-validation",
          "revision-and-fingerprint-pinning",
          "legacy-projection-boundary",
        ],
        knowledgeRefs: input.project.activeRulePackIds,
        llmRequested: false,
        warnings: graph.integrity.warnings,
      }),
    );
  }

  materializeDesignGraph(input: {
    project: ArchitectureProject;
    expectedPreviewFingerprint: string;
    materializedAt?: string;
  }) {
    return this.runtime.materializeDesignGraph(input);
  }

  designGraphStateAuthority(project: ArchitectureProject) {
    return this.runtime.designGraphStateAuthority(project);
  }

  migrateDesignGraphState(input: {
    project: ArchitectureProject;
    expectedGraphFingerprint: string;
    actorId: string;
    migratedAt?: string;
  }) {
    return this.runtime.migrateDesignGraphState(input);
  }

  applyDesignGraphCanonicalState(input: {
    project: ArchitectureProject;
    expectedGraphFingerprint: string;
    patch: ArchitectureDesignGraphCanonicalStatePatch;
    actorId: string;
    appliedAt?: string;
  }) {
    return this.runtime.applyDesignGraphCanonicalState(input);
  }

  async workspaceProjection(input: {
    project: ArchitectureProject;
    selectedNodeId?: string;
    trigger:
      | "initial"
      | "intent-change"
      | "quality-change"
      | "style-selection"
      | "pattern-selection"
      | "canvas-change"
      | "scope-change";
    workspace: IntelligenceWorkspace;
    event?: ArchitectureEvent;
    intelligencePreferences?: { demoted: Record<string, number> };
  }) {
    const result = await this.runtime.workspaceProjection(input);
    return withReceipt(
      result,
      createArchitectureBrainProposalReceipt({
        task: "workspace-projection",
        project: input.project,
        manifest: this.manifest(input.project),
        ...(input.selectedNodeId ? { scopeRef: input.selectedNodeId } : {}),
        deterministicRules: [
          "workspace-context-assembly",
          "style-ranking",
          "contextual-recommendation",
          "project-validation",
          "brain-signal-projection",
        ],
        knowledgeRefs: input.project.activeRulePackIds,
        llmRequested: false,
        warnings: result.findings
          .filter((item) => item.severity === "HARD")
          .map((item) => item.title),
      }),
    );
  }

  async analyseBrief(input: {
    tenantId: string;
    project: ArchitectureProject;
    briefText: string;
    dataClassification?: "public" | "internal" | "confidential" | "restricted";
    intelligenceMode?: "deterministic" | "hybrid";
  }) {
    const result = await this.runtime.analyseBrief(input);
    const receipt = createArchitectureBrainProposalReceipt({
      task: "design-brief-analysis",
      project: input.project,
      manifest: this.manifest(input.project),
      stage: "requirements",
      deterministicRules: [
        "design-brief-schema",
        "unsupported-metric-guard",
        "canonical-project-context",
      ],
      knowledgeRefs: input.project.activeRulePackIds,
      llmRequested: input.intelligenceMode !== "deterministic",
      ...(result.modelTrace ? { llmTrace: result.modelTrace } : {}),
      warnings:
        result.mode === "deterministic-fallback"
          ? [
              "The governed LLM route was unavailable; deterministic proposal generation remained active.",
            ]
          : [],
    });
    return withReceipt(result, receipt);
  }

  async distillRequirements(input: {
    tenantId: string;
    project: ArchitectureProject;
    sources: RequirementsSourceInput[];
    intelligenceMode: "deterministic" | "hybrid";
    knowledgeReleaseId: string;
  }): Promise<ArchitectureBrainResponse<RequirementsDistillationProposal>> {
    const proposal = await this.runtime.distillRequirements(input);
    const trace = proposal.trace;
    const receipt = createArchitectureBrainProposalReceipt({
      task: "requirements-distillation",
      project: input.project,
      manifest: this.manifest(input.project, input.knowledgeReleaseId),
      stage: "requirements",
      deterministicRules: [
        "source-evidence-contract",
        "requirements-taxonomy",
        "conflict-detection",
        "journey-grammar",
        "architecture-context-graph",
        "unsupported-metric-guard",
      ],
      knowledgeRefs: [input.knowledgeReleaseId, "CAMBRIDGE-SA-1.0"],
      llmRequested: input.intelligenceMode === "hybrid",
      ...(trace ? { llmTrace: trace } : {}),
      warnings: proposal.conflicts?.length
        ? [
            `${proposal.conflicts.length} conflict candidate(s) require human adjudication.`,
          ]
        : [],
    });
    return withReceipt(proposal, receipt);
  }

  systemContextCandidate(input: { project: ArchitectureProject }) {
    const candidate = this.runtime.systemContextCandidate(input.project);
    return withReceipt(
      candidate,
      createArchitectureBrainProposalReceipt({
        task: "system-context-composition",
        project: input.project,
        manifest: this.manifest(input.project),
        stage: "systemContext",
        deterministicRules: [
          "accepted-journey-selection",
          "context-participant-normalization",
          "system-boundary-opacity",
          "interaction-propagation",
          "requirement-and-journey-lineage",
          "trust-and-data-obligation-projection",
        ],
        knowledgeRefs: [
          input.project.requirementsIntelligence?.knowledgeReleaseId ?? "",
          "CAMBRIDGE-SA-1.0",
        ],
        llmRequested: false,
        warnings: candidate.openCriticalQuestionCount
          ? [
              `${candidate.openCriticalQuestionCount} high-impact context question(s) remain unresolved.`,
            ]
          : [],
      }),
    );
  }

  async stageCoAuthor(input: {
    tenantId: string;
    project: ArchitectureProject;
    targetStage: StageCoAuthorTarget;
    intelligenceMode: "deterministic" | "hybrid";
    dataClassification: "public" | "internal" | "confidential" | "restricted";
  }): Promise<ArchitectureBrainResponse<StageCoAuthorProposal>> {
    const proposal = await this.runtime.stageCoAuthor(input);
    const receipt = createArchitectureBrainProposalReceipt({
      task: "stage-field-drafting",
      project: input.project,
      manifest: this.manifest(input.project),
      stage: input.targetStage,
      deterministicRules: [
        "stage-schema",
        "field-eligibility",
        "unsupported-metric-guard",
        "proposal-sanitization",
        "revision-staleness",
      ],
      knowledgeRefs: [
        ...input.project.activeRulePackIds,
        input.project.requirementsIntelligence?.knowledgeReleaseId ?? "",
      ],
      llmRequested: input.intelligenceMode === "hybrid",
      ...(proposal.trace ? { llmTrace: proposal.trace } : {}),
      warnings: proposal.clarifications
        .filter((item) => item.blocking)
        .map((item) => item.question),
    });
    return withReceipt(proposal, receipt);
  }

  async livingCanvasActions(input: {
    tenantId: string;
    project: ArchitectureProject;
    event: DesignGestureEvent;
    session?: StageDecompositionSession;
    outcomeHistory: GenerativeOutcomeHistoryItem[];
    permissions: string[];
    intelligenceMode: "deterministic" | "hybrid";
    dataClassification?: "public" | "internal" | "confidential" | "restricted";
  }) {
    const { envelope, result } = await this.runtime.livingCanvasActions(input);
    const assistance = "assistance" in result ? result.assistance : undefined;
    const receipt = createArchitectureBrainProposalReceipt({
      task: "living-canvas-actions",
      project: input.project,
      manifest: this.manifest(
        input.project,
        envelope.context.activeKnowledgeReleaseId,
      ),
      stage: input.event.targetStage ?? input.event.stage,
      ...(input.event.selectedScopeId
        ? { scopeRef: input.event.selectedScopeId }
        : {}),
      deterministicRules: [
        "gesture-contract",
        "stage-transformation-grammar",
        "pattern-dna-eligibility",
        "relationship-propagation",
        "mutation-validation",
        "noise-budget",
      ],
      knowledgeRefs: envelope.actions.flatMap((item) => [
        ...item.patternRefs,
        ...item.styleRefs,
        ...item.tacticRefs,
        ...item.knowledgeClaimRefs,
        ...item.evidenceRefs,
      ]),
      llmRequested: input.intelligenceMode === "hybrid",
      ...(assistance?.trace ? { llmTrace: assistance.trace } : {}),
      warnings: envelope.session.finalizationBlockers,
    });
    return withReceipt(result, receipt);
  }

  async explainRanking(input: {
    tenantId: string;
    project: ArchitectureProject;
  }) {
    const result = await this.runtime.explainRanking(input);
    const trace = result.available ? modelTrace(result) : undefined;
    return withReceipt(
      result,
      createArchitectureBrainProposalReceipt({
        task: "design-ranking-explanation",
        project: input.project,
        manifest: this.manifest(input.project),
        deterministicRules: [
          "style-ranking-is-deterministic",
          "llm-explanation-only",
        ],
        knowledgeRefs: input.project.styleDecisions.map((item) => item.styleId),
        llmRequested: true,
        ...(trace ? { llmTrace: trace } : {}),
        warnings: result.available
          ? []
          : [result.degradedReason ?? "Ranking explanation unavailable."],
      }),
    );
  }

  async stageAdvice(input: {
    tenantId: string;
    project: ArchitectureProject;
    selectedNodeId?: string;
    selectedEdgeId?: string;
  }) {
    const result = await this.runtime.stageAdvice(input);
    const trace = result.available ? modelTrace(result) : undefined;
    return withReceipt(
      result,
      createArchitectureBrainProposalReceipt({
        task: "stage-guidance",
        project: input.project,
        manifest: this.manifest(input.project),
        ...(input.selectedNodeId ? { scopeRef: input.selectedNodeId } : {}),
        deterministicRules: [
          "contextual-recommendation",
          "project-validation",
          "design-guidance-ranking",
        ],
        knowledgeRefs: input.project.activeRulePackIds,
        llmRequested: true,
        ...(trace ? { llmTrace: trace } : {}),
        warnings: result.available
          ? []
          : [result.degradedReason ?? "Stage guidance unavailable."],
      }),
    );
  }

  async askSol(input: {
    tenantId: string;
    project: ArchitectureProject;
    question: string;
    selectedNodeId?: string;
    lifecycleStage?: CoArchitectLifecycleStage;
    scopeLabel?: string;
    dataClassification?: "public" | "internal" | "confidential" | "restricted";
    intelligenceMode?: "deterministic" | "hybrid";
  }) {
    const result = await this.runtime.askSol(input);
    return withReceipt(
      result,
      createArchitectureBrainProposalReceipt({
        task: "explain-or-challenge",
        project: input.project,
        manifest: this.manifest(input.project),
        stage: input.lifecycleStage ?? input.project.activeStage,
        ...(input.selectedNodeId ? { scopeRef: input.selectedNodeId } : {}),
        deterministicRules: [
          "approved-evidence-only",
          "contextual-recommendation",
          "deterministic-audit-grounding",
        ],
        knowledgeRefs: result.citedRecordIds,
        llmRequested: input.intelligenceMode !== "deterministic",
        ...(result.modelTrace ? { llmTrace: result.modelTrace } : {}),
        warnings: [
          ...(result.mode === "deterministic-fallback"
            ? [
                "No governed LLM answer was used.",
                ...(result.reasoningReceipt.fallbackReason &&
                result.reasoningReceipt.fallbackReason !==
                  "No governed LLM answer was used."
                  ? [result.reasoningReceipt.fallbackReason]
                  : []),
              ]
            : []),
          ...result.qualityReceipt.issues,
        ],
        context: result.contextReceipt,
        reasoning: result.reasoningReceipt,
        quality: result.qualityReceipt,
        lineagePaths: result.lineagePaths,
      }),
    );
  }

  async synthesize(input: {
    tenantId: string;
    request: ArchitectureSynthesisRequest;
  }) {
    const result = await this.runtime.synthesize(input);
    const receipt = createArchitectureBrainProposalReceipt({
      task: "architecture-synthesis",
      project: input.request.project,
      manifest: this.manifest(
        input.request.project,
        result.run.knowledgeReleaseId,
      ),
      deterministicRules: [
        "alternative-generation",
        "diversity-gate",
        "scorecard",
        "obligation-and-risk-derivation",
        "llm-narrative-no-ranking-authority",
      ],
      knowledgeRefs: result.run.alternatives.flatMap((item) => item.patternIds),
      llmRequested: Boolean(input.request.useLlmEnrichment),
      ...(result.llmExecution ? { llmTrace: result.llmExecution } : {}),
      warnings: result.run.warnings,
    });
    return withReceipt(result, receipt);
  }

  async assistedAudit(input: {
    tenantId: string;
    project: ArchitectureProject;
  }) {
    const result = await this.runtime.assistedAudit(input);
    const trace = modelTrace(
      (result as unknown as Record<string, unknown>).modelTrace,
    );
    return withReceipt(
      result,
      createArchitectureBrainProposalReceipt({
        task: "assisted-audit",
        project: input.project,
        manifest: this.manifest(input.project),
        stage: "reviewAssurance",
        deterministicRules: [
          "deterministic-audit-baseline",
          "finding-sanitization",
          "reviewer-disposition-required",
        ],
        knowledgeRefs: input.project.activeRulePackIds,
        llmRequested: true,
        ...(trace ? { llmTrace: trace } : {}),
      }),
    );
  }

  recommendations(project: ArchitectureProject) {
    return this.runtime.recommendations(project);
  }

  contextualRecommendations(input: {
    project: ArchitectureProject;
    context: Parameters<ArchitectureBrainRuntime["contextualRecommendations"]>[0]["context"];
  }) {
    return this.runtime.contextualRecommendations(input);
  }

  validate(project: ArchitectureProject) {
    return this.runtime.validate(project);
  }

  deterministicAudit(project: ArchitectureProject) {
    return this.runtime.deterministicAudit(project);
  }

  async review(project: ArchitectureProject) {
    const review = await this.runtime.review(project);
    return withReceipt(
      review,
      createArchitectureBrainProposalReceipt({
        task: "architecture-review",
        project,
        manifest: this.manifest(project),
        stage: "reviewAssurance",
        deterministicRules: [
          "architecture-completeness-review",
          "pattern-and-anti-pattern-fit",
          "security-resilience-and-interface-obligations",
          "reviewer-disposition-required",
        ],
        knowledgeRefs: project.activeRulePackIds,
        llmRequested: false,
        warnings: review.findings
          .filter((item) => item.severity === "critical" || item.severity === "high")
          .map((item) => item.title),
      }),
    );
  }

  evaluateEvent(input: Parameters<ArchitectureBrainRuntime["evaluateEvent"]>[0]) {
    return this.runtime.evaluateEvent(input);
  }

  evaluateGovernance(project: ArchitectureProject) {
    return this.runtime.evaluateGovernance(project);
  }

  governanceApprovalReadiness(
    input: Parameters<ArchitectureBrainRuntime["governanceApprovalReadiness"]>[0],
  ) {
    return this.runtime.governanceApprovalReadiness(input);
  }

  evaluatePolicyGate(
    input: Parameters<ArchitectureBrainRuntime["evaluatePolicyGate"]>[0],
  ) {
    return this.runtime.evaluatePolicyGate(input);
  }

  synthesisAssessment(project: ArchitectureProject) {
    return this.runtime.synthesisAssessment(project);
  }

}

export function createArchitectureBrainOrchestrator(
  dependencies: ArchitectureBrainOrchestratorDependencies = {},
) {
  return new ArchitectureBrainOrchestrator(dependencies);
}
