import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type {
  ArchitectureProject,
  ArchitectureSynthesisRequest,
  DesignGestureEvent,
  GenerativeOutcomeHistoryItem,
  KnowledgeLibrary,
  RequirementsDistillationProposal,
  StageCoAuthorProposal,
  StageCoAuthorTarget,
  StageDecompositionSession,
} from "@aiw/domain";
import {
  applyArchitectureDesignGraphCanonicalState,
  buildArchitectureDesignGraph,
  getArchitectureDesignGraphStateAuthority,
  materializeArchitectureProjectDesignGraph,
  migrateArchitectureProjectStateToDesignGraph,
  type ArchitectureDesignGraphCanonicalStatePatch,
} from "@aiw/domain";
import {
  analyseArchitectureDrift,
  approvalReadiness,
  assessArchitectureDesignBrief,
  distillRequirementsDeterministically,
  buildSystemContextCandidate,
  orchestrateDeterministicDesignActions,
  evaluateArchitectureEvent,
  evaluateArchitecturePolicyGate,
  evaluateGovernanceRulePacks,
  recommendArchitectureStyles,
  recommendInContext,
  runDeterministicAudit,
  validateProject,
  type ArchitectureEvent,
  type IntelligenceWorkspace,
  type RequirementsSourceInput,
} from "@aiw/engine";
import { runAiAssistedAudit } from "./aiAudit.js";
import { runArchitectureReview } from "@aiw/intelligence";
import { runGovernedArchitectureSynthesis } from "./architectureSynthesisService.js";
import { askCoArchitect, type CoArchitectLifecycleStage } from "./coArchitect.js";
import {
  analyseDesignBrief,
  type DesignBriefProposal,
} from "./designBriefAssistant.js";
import {
  adviseStage,
  explainStyleRanking,
} from "./designAssist.js";
import { enrichLivingCanvasWithGovernedLlm } from "./livingCanvasLlmAssistant.js";
import type { llmRuntimeConfigurations } from "./llmRuntimeStore.js";
import {
  buildDeterministicStageCoAuthorProposal,
  buildGovernedStageCoAuthorProposal,
} from "./stageCoAuthorAssistant.js";

export interface ArchitectureBrainRuntimeDependencies {
  loadLibrary: () => Promise<KnowledgeLibrary>;
  gatewayForTenant: (
    tenantId: string,
  ) => ReturnType<typeof llmRuntimeConfigurations.gateway>;
}

export type BrainModelTrace = {
  providerId?: string;
  model?: string;
  routeId?: string;
  requestFingerprint?: string;
  latencyMs?: number;
  fallbackUsed?: boolean;
};

const KERNEL_OPTIONS = (() => {
  try {
    const experience = JSON.parse(
      readFileSync(
        fileURLToPath(
          new URL("../../../data/experience-config.json", import.meta.url),
        ),
        "utf8",
      ),
    );
    const packs = JSON.parse(
      readFileSync(
        fileURLToPath(new URL("../../../data/policy-packs.json", import.meta.url)),
        "utf8",
      ),
    ).packs;
    const tacticsCatalog = JSON.parse(
      readFileSync(
        fileURLToPath(
          new URL("../../../data/tactics-catalog.json", import.meta.url),
        ),
        "utf8",
      ),
    );
    return { experience, policyPacks: packs, tacticsCatalog };
  } catch {
    return {};
  }
})();

function mergeBriefIntoProject(
  project: ArchitectureProject,
  proposal: DesignBriefProposal,
): ArchitectureProject {
  const qualityScenarios = [...project.qualityScenarios];
  for (const scenario of proposal.qualityScenarios) {
    const duplicate = qualityScenarios.some(
      (item) =>
        item.attributeId === scenario.attributeId &&
        item.stimulus.toLowerCase() === scenario.stimulus.toLowerCase(),
    );
    if (!duplicate) {
      qualityScenarios.push({
        ...scenario,
        id: `qs-brain-${scenario.attributeId}-${qualityScenarios.length + 1}`,
      });
    }
  }
  return {
    ...project,
    description: proposal.problemStatement || project.description,
    objectives: proposal.objectives.length
      ? proposal.objectives
      : project.objectives,
    constraints: proposal.constraints.length
      ? proposal.constraints
      : project.constraints,
    assumptions: proposal.assumptions.length
      ? proposal.assumptions
      : project.assumptions,
    context: { ...project.context, ...proposal.context },
    qualityScenarios,
  };
}

export function modelTrace(value: unknown): BrainModelTrace | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const trace: BrainModelTrace = {};
  if (typeof record.providerId === "string") trace.providerId = record.providerId;
  if (typeof record.model === "string") trace.model = record.model;
  if (typeof record.routeId === "string") trace.routeId = record.routeId;
  if (typeof record.requestFingerprint === "string") {
    trace.requestFingerprint = record.requestFingerprint;
  }
  if (typeof record.latencyMs === "number") trace.latencyMs = record.latencyMs;
  if (typeof record.fallbackUsed === "boolean") {
    trace.fallbackUsed = record.fallbackUsed;
  }
  return Object.keys(trace).length ? trace : undefined;
}

/**
 * Domain execution boundary for the Architecture Brain.
 *
 * The product-facing orchestrator coordinates tasks and emits governance receipts.
 * All architecture judgement, deterministic evaluation and bounded cognitive calls
 * execute here so the orchestrator cannot become a second rules engine.
 */
export class ArchitectureBrainRuntime {
  constructor(private readonly dependencies: ArchitectureBrainRuntimeDependencies) {}

  designGraphPreview(project: ArchitectureProject) {
    return buildArchitectureDesignGraph(
      project,
      project.designGraph?.projectionMode === "materialized-canonical"
        ? "materialized-canonical"
        : "legacy-project-projection",
    );
  }

  materializeDesignGraph(input: {
    project: ArchitectureProject;
    expectedPreviewFingerprint: string;
    materializedAt?: string;
  }) {
    return materializeArchitectureProjectDesignGraph(input);
  }

  designGraphStateAuthority(project: ArchitectureProject) {
    return getArchitectureDesignGraphStateAuthority(project.designGraph);
  }

  migrateDesignGraphState(input: {
    project: ArchitectureProject;
    expectedGraphFingerprint: string;
    actorId: string;
    migratedAt?: string;
  }) {
    return migrateArchitectureProjectStateToDesignGraph(input);
  }

  applyDesignGraphCanonicalState(input: {
    project: ArchitectureProject;
    expectedGraphFingerprint: string;
    patch: ArchitectureDesignGraphCanonicalStatePatch;
    actorId: string;
    appliedAt?: string;
  }) {
    return applyArchitectureDesignGraphCanonicalState(input);
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
    const library = await this.dependencies.loadLibrary();
    const context = {
      stage: input.project.activeStage,
      ...(input.selectedNodeId ? { scopeNodeId: input.selectedNodeId } : {}),
      trigger: input.trigger,
    };
    const baseEvent: ArchitectureEvent = input.event ?? {
      kind: "state-recomputed",
      ...(input.selectedNodeId ? { subjectIds: [input.selectedNodeId] } : {}),
    };
    const event: ArchitectureEvent = {
      ...baseEvent,
      workspace: baseEvent.workspace ?? input.workspace,
    };
    const preferences = input.intelligencePreferences ?? { demoted: {} };
    return {
      recommendations: recommendArchitectureStyles(input.project, library),
      contextual: recommendInContext(input.project, library, context),
      findings: validateProject(input.project, library),
      intelligence: evaluateArchitectureEvent(
        input.project,
        library,
        event,
        preferences,
      ),
    };
  }

  async analyseBrief(input: {
    tenantId: string;
    project: ArchitectureProject;
    briefText: string;
    dataClassification?: "public" | "internal" | "confidential" | "restricted";
    intelligenceMode?: "deterministic" | "hybrid";
  }) {
    return analyseDesignBrief(
      {
        project: input.project,
        briefText: input.briefText,
        ...(input.dataClassification
          ? { dataClassification: input.dataClassification }
          : {}),
        ...(input.intelligenceMode
          ? { intelligenceMode: input.intelligenceMode }
          : {}),
      },
      await this.dependencies.gatewayForTenant(input.tenantId),
    );
  }

  async distillRequirements(input: {
    tenantId: string;
    project: ArchitectureProject;
    sources: RequirementsSourceInput[];
    intelligenceMode: "deterministic" | "hybrid";
    knowledgeReleaseId: string;
  }): Promise<RequirementsDistillationProposal> {
    const combinedText = input.sources
      .map((item) => `# ${item.name}\n${item.text}`)
      .join("\n\n");
    let project = input.project;
    let mode: RequirementsDistillationProposal["mode"] = "deterministic";
    let trace: RequirementsDistillationProposal["trace"];
    if (input.intelligenceMode === "hybrid") {
      const classification = input.sources.some(
        (item) => item.classification === "restricted",
      )
        ? "restricted"
        : input.sources.some((item) => item.classification === "confidential")
          ? "confidential"
          : "internal";
      const result = await analyseDesignBrief(
        {
          project,
          briefText: combinedText.slice(0, 40000),
          dataClassification: classification,
        },
        await this.dependencies.gatewayForTenant(input.tenantId),
      );
      project = mergeBriefIntoProject(project, result.proposal);
      mode =
        result.mode === "llm-assisted"
          ? "llm-assisted"
          : "deterministic-fallback";
      if (result.modelTrace) trace = { ...result.modelTrace, latencyMs: 0 };
    }
    const deterministic = distillRequirementsDeterministically({
      project,
      sources: input.sources,
      knowledgeReleaseId: input.knowledgeReleaseId,
    });
    return {
      ...deterministic,
      mode,
      ...(trace ? { trace } : {}),
      notice:
        `${deterministic.notice} ${mode === "llm-assisted" ? "The governed LLM improved the solution intent before deterministic reconciliation, journey compilation and context-graph construction." : mode === "deterministic-fallback" ? "The configured LLM route was unavailable; deterministic Cambridge-style distillation remained active." : ""}`.trim(),
    };
  }

  systemContextCandidate(project: ArchitectureProject) {
    return buildSystemContextCandidate(project);
  }

  async stageCoAuthor(input: {
    tenantId: string;
    project: ArchitectureProject;
    targetStage: StageCoAuthorTarget;
    intelligenceMode: "deterministic" | "hybrid";
    dataClassification: "public" | "internal" | "confidential" | "restricted";
  }): Promise<StageCoAuthorProposal> {
    const library = await this.dependencies.loadLibrary();
    return input.intelligenceMode === "hybrid"
      ? buildGovernedStageCoAuthorProposal({
          project: input.project,
          library,
          targetStage: input.targetStage,
          gateway: await this.dependencies.gatewayForTenant(input.tenantId),
          dataClassification: input.dataClassification,
        })
      : buildDeterministicStageCoAuthorProposal({
          project: input.project,
          library,
          targetStage: input.targetStage,
        });
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
    const envelope = orchestrateDeterministicDesignActions({
      project: input.project,
      library: await this.dependencies.loadLibrary(),
      event: input.event,
      ...(input.session ? { session: input.session } : {}),
      outcomeHistory: input.outcomeHistory,
      permissions: input.permissions,
    });
    const result =
      input.intelligenceMode === "hybrid"
        ? await enrichLivingCanvasWithGovernedLlm({
            project: input.project,
            envelope,
            gateway: await this.dependencies.gatewayForTenant(input.tenantId),
            dataClassification: input.dataClassification ?? "internal",
          })
        : envelope;
    return { envelope, result };
  }

  async explainRanking(input: {
    tenantId: string;
    project: ArchitectureProject;
  }) {
    return explainStyleRanking(
      await this.dependencies.gatewayForTenant(input.tenantId),
      input.project,
      await this.dependencies.loadLibrary(),
    );
  }

  async stageAdvice(input: {
    tenantId: string;
    project: ArchitectureProject;
    selectedNodeId?: string;
    selectedEdgeId?: string;
  }) {
    return adviseStage(
      await this.dependencies.gatewayForTenant(input.tenantId),
      input.project,
      await this.dependencies.loadLibrary(),
      {
        ...(input.selectedNodeId ? { selectedNodeId: input.selectedNodeId } : {}),
        ...(input.selectedEdgeId ? { selectedEdgeId: input.selectedEdgeId } : {}),
      },
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
    return askCoArchitect(
      {
        project: input.project,
        question: input.question,
        ...(input.selectedNodeId ? { selectedNodeId: input.selectedNodeId } : {}),
        ...(input.lifecycleStage ? { lifecycleStage: input.lifecycleStage } : {}),
        ...(input.scopeLabel ? { scopeLabel: input.scopeLabel } : {}),
        ...(input.dataClassification
          ? { dataClassification: input.dataClassification }
          : {}),
        ...(input.intelligenceMode
          ? { intelligenceMode: input.intelligenceMode }
          : {}),
      },
      await this.dependencies.loadLibrary(),
      await this.dependencies.gatewayForTenant(input.tenantId),
    );
  }

  async synthesize(input: {
    tenantId: string;
    request: ArchitectureSynthesisRequest;
  }) {
    return runGovernedArchitectureSynthesis(
      input.request,
      await this.dependencies.gatewayForTenant(input.tenantId),
    );
  }

  async assistedAudit(input: {
    tenantId: string;
    project: ArchitectureProject;
  }) {
    return runAiAssistedAudit(
      input.project,
      await this.dependencies.loadLibrary(),
      await this.dependencies.gatewayForTenant(input.tenantId),
    );
  }

  async recommendations(project: ArchitectureProject) {
    return recommendArchitectureStyles(project, await this.dependencies.loadLibrary());
  }

  async contextualRecommendations(input: {
    project: ArchitectureProject;
    context: Parameters<typeof recommendInContext>[2];
  }) {
    return recommendInContext(
      input.project,
      await this.dependencies.loadLibrary(),
      input.context,
    );
  }

  async validate(project: ArchitectureProject) {
    return validateProject(project, await this.dependencies.loadLibrary());
  }

  async deterministicAudit(project: ArchitectureProject) {
    return runDeterministicAudit(project, await this.dependencies.loadLibrary());
  }

  async review(project: ArchitectureProject) {
    return runArchitectureReview(project, await this.dependencies.loadLibrary());
  }

  async evaluateEvent(input: {
    project: ArchitectureProject;
    event: ArchitectureEvent;
    preferences?: Parameters<typeof evaluateArchitectureEvent>[3];
  }) {
    return evaluateArchitectureEvent(
      input.project,
      await this.dependencies.loadLibrary(),
      input.event,
      input.preferences,
      KERNEL_OPTIONS as never,
    );
  }

  async evaluateGovernance(project: ArchitectureProject) {
    return evaluateGovernanceRulePacks(
      project,
      await this.dependencies.loadLibrary(),
    );
  }

  async governanceApprovalReadiness(input: {
    project: ArchitectureProject;
    stage: Parameters<typeof approvalReadiness>[1];
    openObligations: number;
  }) {
    return approvalReadiness(
      input.project,
      input.stage,
      await this.validate(input.project),
      input.openObligations,
    );
  }

  async evaluatePolicyGate(input: {
    project: ArchitectureProject;
    gate: Parameters<typeof evaluateArchitecturePolicyGate>[1];
    inventory?: Parameters<typeof analyseArchitectureDrift>[1];
  }) {
    const findings = await this.validate(input.project);
    const drift = input.inventory
      ? analyseArchitectureDrift(input.project, input.inventory)
      : undefined;
    return evaluateArchitecturePolicyGate(
      input.project,
      input.gate,
      findings,
      drift,
    );
  }

  synthesisAssessment(project: ArchitectureProject) {
    return assessArchitectureDesignBrief(project);
  }
}

export function createArchitectureBrainRuntime(
  dependencies: ArchitectureBrainRuntimeDependencies,
) {
  return new ArchitectureBrainRuntime(dependencies);
}
