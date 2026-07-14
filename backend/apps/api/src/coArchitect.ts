import {
  sprint78PatternCorpus,
  type ArchitectureBrainContextReceipt,
  type ArchitectureBrainLineagePath,
  type ArchitectureBrainReasoningReceipt,
  type ArchitectureProject,
  type ArchitectureStage,
  type KnowledgeLibrary,
  type SolResponseQualityReceipt,
} from "@aiw/domain";
import {
  buildRecommendationEvidencePack,
  evaluateSolResponseQuality,
  recommendInContext,
  runDeterministicAudit,
} from "@aiw/engine";
import type { LlmGateway } from "./llmGateway.js";
import { buildApprovedKnowledgeGroundingPack, type ApprovedGroundingSource } from "./approvedKnowledgeGrounding.js";

export type CoArchitectLifecycleStage =
  | "requirements"
  | "quality"
  | "context"
  | "logical"
  | "realization"
  | "logicalTechnology"
  | "physicalTechnology"
  | "review"
  | "sdd";

export interface CoArchitectAnswer {
  answer: string;
  observations: string[];
  recommendation: string;
  tradeOffs: string[];
  clarifyingQuestions: string[];
  confidence: "high" | "medium" | "low";
  contextSummary: {
    lifecycleStage: CoArchitectLifecycleStage;
    architectureStage: ArchitectureStage;
    scopeLabel: string;
    requirementCount: number;
    qualityScenarioCount: number;
    journeyCount: number;
    stageObjectCount: number;
    interfaceCount: number;
    openQuestionCount: number;
    findingCount: number;
  };
  citedRecordIds: string[];
  suggestedNextActions: Array<{
    title: string;
    rationale: string;
    target: "brief" | "quality" | "canvas" | "patterns" | "review";
    citedRecordIds: string[];
  }>;
  modelTrace?: {
    providerId: string;
    model: string;
    routeId: string;
    fallbackUsed: boolean;
    requestFingerprint: string;
    latencyMs?: number;
    qualityGateRejected?: boolean;
    rejectedCandidateScore?: number;
    fallbackReason?: string;
  };
  contextReceipt: ArchitectureBrainContextReceipt;
  reasoningReceipt: ArchitectureBrainReasoningReceipt;
  qualityReceipt: SolResponseQualityReceipt;
  lineagePaths: ArchitectureBrainLineagePath[];
  mode: "llm-assisted" | "deterministic-fallback";
}

interface CoArchitectInput {
  project: ArchitectureProject;
  question: string;
  selectedNodeId?: string;
  lifecycleStage?: CoArchitectLifecycleStage;
  scopeLabel?: string;
  dataClassification?: "public" | "internal" | "confidential" | "restricted";
  intelligenceMode?: "deterministic" | "hybrid";
}

function architectureStageFor(
  lifecycleStage: CoArchitectLifecycleStage,
  project: ArchitectureProject,
): ArchitectureStage {
  const stages: Record<CoArchitectLifecycleStage, ArchitectureStage> = {
    requirements: "designIntent",
    quality: "designIntent",
    context: "logicalApplication",
    logical: "logicalApplication",
    realization: "applicationRealization",
    logicalTechnology: "logicalTechnology",
    physicalTechnology: "physicalTechnology",
    review: "validationRealization",
    sdd: "validationRealization",
  };
  return stages[lifecycleStage] ?? project.activeStage;
}

function inferLifecycleStage(
  project: ArchitectureProject,
): CoArchitectLifecycleStage {
  const stage: Record<ArchitectureStage, CoArchitectLifecycleStage> = {
    designIntent: "requirements",
    logicalApplication: "logical",
    applicationRealization: "realization",
    logicalTechnology: "logicalTechnology",
    physicalTechnology: "physicalTechnology",
    validationRealization: "review",
  };
  return stage[project.activeStage];
}

function tokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((item) => item.length > 2),
  );
}

function scoreText(value: string, queryTokens: Set<string>): number {
  const valueTokens = tokens(value);
  let score = 0;
  for (const token of queryTokens) if (valueTokens.has(token)) score += 1;
  return score;
}

function topRelevant<T>(
  items: T[],
  query: string,
  text: (item: T) => string,
  limit: number,
): T[] {
  const queryTokens = tokens(query);
  return [...items]
    .map((item, index) => ({
      item,
      index,
      score: scoreText(text(item), queryTokens),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit)
    .map(({ item }) => item);
}

function buildKnowledgeQuery(
  input: CoArchitectInput,
  architectureStage: ArchitectureStage,
): string {
  const selected = input.selectedNodeId
    ? input.project.nodes.find((node) => node.id === input.selectedNodeId)
    : undefined;
  const intelligence = input.project.requirementsIntelligence;
  return [
    input.question,
    input.lifecycleStage,
    architectureStage,
    input.project.name,
    input.project.description,
    ...input.project.objectives,
    ...input.project.constraints,
    ...(intelligence?.requirements
      .slice(0, 20)
      .map((item) => `${item.title} ${item.statement}`) ?? []),
    selected?.label,
    selected?.description,
    selected?.kind,
    ...(selected?.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function compileProjectContext(
  input: CoArchitectInput,
  architectureStage: ArchitectureStage,
) {
  const { project } = input;
  const lifecycleStage = input.lifecycleStage ?? inferLifecycleStage(project);
  const intelligence = project.requirementsIntelligence;
  const selected = input.selectedNodeId
    ? project.nodes.find((node) => node.id === input.selectedNodeId)
    : undefined;
  const relatedEdgeIds = selected
    ? project.edges.filter(
        (edge) =>
          edge.sourceId === selected.id || edge.targetId === selected.id,
      )
    : [];
  const relatedNodeIds = new Set(
    relatedEdgeIds.flatMap((edge) => [edge.sourceId, edge.targetId]),
  );
  const stageNodes = project.nodes.filter(
    (node) =>
      node.status !== "deprecated" &&
      (lifecycleStage === "context"
        ? node.tags.includes("system-context")
        : node.stage === architectureStage),
  );
  const stageNodeIds = new Set(stageNodes.map((node) => node.id));
  const stageEdges = project.edges.filter((edge) =>
    lifecycleStage === "context"
      ? stageNodeIds.has(edge.sourceId) && stageNodeIds.has(edge.targetId)
      : edge.stage === architectureStage,
  );
  const stageInterfaces = (project.interfaces ?? []).filter(
    (item) =>
      item.stage === architectureStage &&
      (lifecycleStage !== "context" ||
        stageNodeIds.has(item.providerNodeId) ||
        item.consumerNodeIds.some((id) => stageNodeIds.has(id))),
  );
  const canonicalRequirements = (intelligence?.requirements ?? []).filter(
    (item) => item.status === "accepted",
  );
  const canonicalJourneys = (intelligence?.journeys ?? []).filter(
    (item) => item.status === "accepted",
  );
  // Projects created before Requirements Intelligence became canonical still
  // contain valuable, architect-confirmed intent in the original project
  // fields. Treat these records as an explicit compatibility projection rather
  // than pretending that Sol has no context. The projection is read-only and
  // is never promoted into canonical Requirements Intelligence implicitly.
  const legacyRequirements = canonicalRequirements.length
    ? []
    : [
        ...project.objectives.map((statement, index) => ({
          id: `legacy-objective-${index + 1}`,
          title: `Business objective ${index + 1}`,
          statement,
          type: "business" as const,
          priority: index === 0 ? ("critical" as const) : ("high" as const),
          origin: "user-entered" as const,
          status: "accepted" as const,
          confidence: 0.82,
          stakeholderRefs: [] as string[],
          journeyRefs: [] as string[],
          acceptanceCriteria: [] as string[],
          qualityAttributeHints: [] as string[],
          tags: ["legacy-compatibility-projection"],
          ambiguityFlags: [
            "Compatibility projection from the legacy project objective field.",
          ],
          evidenceRefs: [] as string[],
          rationale:
            "Preserved from the architect-confirmed legacy project objective field.",
          createdAt: project.updatedAt,
          updatedAt: project.updatedAt,
        })),
        ...project.constraints.map((statement, index) => ({
          id: `legacy-constraint-${index + 1}`,
          title: `Architecture constraint ${index + 1}`,
          statement,
          type: "constraint" as const,
          priority: "high" as const,
          origin: "user-entered" as const,
          status: "accepted" as const,
          confidence: 0.82,
          stakeholderRefs: [] as string[],
          journeyRefs: [] as string[],
          acceptanceCriteria: [] as string[],
          qualityAttributeHints: [] as string[],
          tags: ["legacy-compatibility-projection"],
          ambiguityFlags: [
            "Compatibility projection from the legacy project constraint field.",
          ],
          evidenceRefs: [] as string[],
          rationale:
            "Preserved from the architect-confirmed legacy project constraint field.",
          createdAt: project.updatedAt,
          updatedAt: project.updatedAt,
        })),
      ];
  const legacyJourneys = canonicalJourneys.length
    ? []
    : project.objectives.slice(0, 8).map((objective, index) => ({
        id: `legacy-journey-${index + 1}`,
        name: objective,
        goal: objective,
        description:
          "Compatibility projection from an architect-confirmed project objective.",
        priority: index === 0 ? ("critical" as const) : ("high" as const),
        origin: "user-entered" as const,
        status: "accepted" as const,
        actorRefs: [] as string[],
        requirementRefs: legacyRequirements.length
          ? [
              legacyRequirements[
                Math.min(index, legacyRequirements.length - 1)
              ]!.id,
            ]
          : [],
        participants: [] as Array<never>,
        qualityHotspots: project.qualityScenarios
          .slice(0, 3)
          .map((item) => item.attributeId),
        architectureObligations: project.constraints.slice(0, 4),
        paths: [] as Array<never>,
        createdAt: project.updatedAt,
        updatedAt: project.updatedAt,
      }));
  const acceptedRequirements = canonicalRequirements.length
    ? canonicalRequirements
    : legacyRequirements;
  const acceptedJourneys = canonicalJourneys.length
    ? canonicalJourneys
    : legacyJourneys;
  const legacyProjectionUsed =
    !canonicalRequirements.length || !canonicalJourneys.length;
  const openQuestions = (intelligence?.openQuestions ?? []).filter(
    (item) => item.status === "open",
  );
  const query = `${input.question} ${selected?.label ?? ""} ${selected?.description ?? ""}`;
  const relevantRequirements = topRelevant(
    acceptedRequirements,
    query,
    (item) => `${item.title} ${item.statement} ${item.tags.join(" ")}`,
    12,
  );
  const relevantJourneys = topRelevant(
    acceptedJourneys,
    query,
    (item) =>
      `${item.name} ${item.goal} ${item.description} ${item.architectureObligations.join(" ")}`,
    8,
  );
  const relevantQuestions = topRelevant(
    openQuestions,
    query,
    (item) => `${item.question} ${item.whyItMatters}`,
    6,
  );
  const contextPackageTarget: Record<CoArchitectLifecycleStage, string> = {
    requirements: "qualityDrivers",
    quality: "qualityDrivers",
    context: "systemContext",
    logical: "logicalApplication",
    realization: "applicationRealization",
    logicalTechnology: "logicalTechnology",
    physicalTechnology: "physicalTechnology",
    review: "reviewAssurance",
    sdd: "sddPack",
  };
  const contextPackage = intelligence?.contextPackages.find(
    (item) => item.target === contextPackageTarget[lifecycleStage],
  );
  const session = project.coArchitectSessions.find(
    (item) =>
      item.stage === architectureStage &&
      item.scopeNodeId === input.selectedNodeId,
  );

  return {
    lifecycleStage,
    architectureStage,
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      revision: project.revision,
      objectives: project.objectives.slice(0, 12),
      constraints: project.constraints.slice(0, 12),
      assumptions: project.assumptions.slice(0, 10),
      stakeholders: (project.context.stakeholders ?? []).slice(0, 16),
      inScopeCapabilities: (project.context.inScopeCapabilities ?? []).slice(0, 16),
      outOfScopeCapabilities: (project.context.outOfScopeCapabilities ?? []).slice(0, 16),
      existingSystems: (project.context.existingSystems ?? []).slice(0, 16),
      regulatoryExposure: project.context.regulatoryExposure,
      dataSensitivity: project.context.dataSensitivity,
      availabilityTarget: project.context.availabilityTarget,
      recoveryObjectives: project.context.recoveryObjectives,
    },
    scope: selected
      ? {
          id: selected.id,
          label: selected.label,
          kind: selected.kind,
          description: selected.description ?? "",
          properties: selected.properties,
          tags: selected.tags,
          lineageFrom: selected.lineageFrom,
          neighbours: project.nodes
            .filter(
              (node) => relatedNodeIds.has(node.id) && node.id !== selected.id,
            )
            .slice(0, 12)
            .map((node) => ({
              id: node.id,
              label: node.label,
              kind: node.kind,
            })),
          relationships: relatedEdgeIds.slice(0, 16).map((edge) => ({
            id: edge.id,
            sourceId: edge.sourceId,
            targetId: edge.targetId,
            kind: edge.kind,
            label: edge.label ?? "",
          })),
        }
      : {
          id: "stage",
          label: input.scopeLabel ?? "Whole stage",
          kind: "stage",
        },
    requirements: relevantRequirements.map((item) => ({
      id: item.id,
      title: item.title,
      statement: item.statement,
      priority: item.priority,
      origin: item.origin,
      confidence: item.confidence,
      acceptanceCriteria: item.acceptanceCriteria,
      stakeholderRefs: item.stakeholderRefs,
      journeyRefs: item.journeyRefs,
      ambiguityFlags: item.ambiguityFlags,
      evidenceRefs: item.evidenceRefs,
    })),
    qualityScenarios: project.qualityScenarios.slice(0, 12).map((item) => ({
      id: item.id,
      attributeId: item.attributeId,
      source: item.source,
      stimulus: item.stimulus,
      environment: item.environment,
      artifact: item.artifact,
      response: item.response,
      responseMeasure: item.responseMeasure,
      weight: item.weight,
    })),
    journeys: relevantJourneys.map((item) => ({
      id: item.id,
      name: item.name,
      goal: item.goal,
      priority: item.priority,
      requirementRefs: item.requirementRefs,
      qualityHotspots: item.qualityHotspots,
      architectureObligations: item.architectureObligations,
      paths: item.paths.map((path) => ({
        kind: path.kind,
        name: path.name,
        interactions: path.interactions.slice(0, 12).map((interaction) => ({
          label: interaction.label,
          interactionKind: interaction.interactionKind,
          requirementRefs: interaction.requirementRefs,
          dataObjects: interaction.dataObjects,
          trustBoundaryCrossing: interaction.trustBoundaryCrossing,
          failureBehaviour: interaction.failureBehaviour,
        })),
      })),
    })),
    currentStageModel: {
      nodes: (selected
        ? stageNodes.filter(
            (node) => node.id === selected.id || relatedNodeIds.has(node.id),
          )
        : stageNodes
      )
        .slice(0, 24)
        .map((node) => ({
          id: node.id,
          label: node.label,
          kind: node.kind,
          description: node.description ?? "",
          parentId: node.parentId,
          tags: node.tags,
          status: node.status,
          lineageFrom: node.lineageFrom,
        })),
      edges: (selected
        ? relatedEdgeIds.filter(
            (edge) =>
              stageNodeIds.has(edge.sourceId) &&
              stageNodeIds.has(edge.targetId),
          )
        : stageEdges
      )
        .slice(0, 30)
        .map((edge) => ({
          id: edge.id,
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          kind: edge.kind,
          label: edge.label ?? "",
        })),
      interfaces: stageInterfaces.slice(0, 16).map((item) => ({
        id: item.id,
        name: item.name,
        providerNodeId: item.providerNodeId,
        consumerNodeIds: item.consumerNodeIds,
        interactionStyle: item.interactionStyle,
        protocol: item.protocol,
        operationOrEvent: item.operationOrEvent,
        authentication: item.authentication,
        authorization: item.authorization,
        retryPolicy: item.retryPolicy,
        deadLetterPolicy: item.deadLetterPolicy,
        idempotency: item.idempotency,
        timeoutMs: item.timeoutMs,
        dataClassification: item.dataClassification,
        owner: item.owner,
        evidenceIds: item.evidenceIds,
      })),
    },
    acceptedDecisions: project.decisions
      .filter((item) => item.status === "accepted")
      .slice(-10)
      .map((item) => ({
        id: item.id,
        title: item.title,
        context: item.context,
        decision: item.decision,
        consequences: item.consequences,
      })),
    acceptedStyles: project.styleDecisions
      .filter((item) => item.status === "accepted")
      .map((item) => ({
        id: item.id,
        styleId: item.styleId,
        scopeNodeId: item.scopeNodeId,
        rationale: item.rationale,
      })),
    acceptedPatterns: project.patternSelections
      .filter((item) => item.status === "accepted")
      .map((item) => ({
        id: item.id,
        patternId: item.patternId,
        scopeNodeId: item.scopeNodeId,
        rationale: item.rationale,
      })),
    findings: project.findings.slice(0, 12).map((item) => ({
      id: item.id,
      severity: item.severity,
      title: item.title,
      message: item.message,
      rationale: item.rationale,
      affectedNodeIds: item.affectedNodeIds,
      affectedEdgeIds: item.affectedEdgeIds,
      mitigations: item.mitigations,
    })),
    stageApprovals: project.stageApprovals.slice(-12).map((item) => ({
      id: item.id,
      stage: item.stage,
      status: item.status,
      reviewer: item.reviewer,
      comments: item.comments,
    })),
    unresolvedQuestions: relevantQuestions.map((item) => ({
      id: item.id,
      question: item.question,
      whyItMatters: item.whyItMatters,
      impact: item.impact,
      relatedRequirementRefs: item.relatedRequirementRefs,
    })),
    stageContext: contextPackage
      ? {
          summary: contextPackage.summary,
          architectureObligations: contextPackage.architectureObligations,
          unresolvedQuestionRefs: contextPackage.unresolvedQuestionRefs,
          contextFingerprint: contextPackage.contextFingerprint,
        }
      : null,
    recentConversation: (session?.messages ?? []).slice(-6).map((item) => ({
      role: item.role,
      content: item.content,
      citedRecordIds: item.citedRecordIds,
    })),
    legacyProjectionUsed,
  };
}


function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];
}

function buildContextReceipt(
  project: ArchitectureProject,
  context: ReturnType<typeof compileProjectContext>,
): ArchitectureBrainContextReceipt {
  const intelligence = project.requirementsIntelligence;
  const totals = {
    requirements: (intelligence?.requirements ?? []).filter((item) => item.status === "accepted").length || project.objectives.length + project.constraints.length,
    qualityScenarios: project.qualityScenarios.length,
    journeys: (intelligence?.journeys ?? []).filter((item) => item.status === "accepted").length || project.objectives.length,
    nodes: project.nodes.filter((item) => item.status !== "deprecated").length,
    relationships: project.edges.length,
    interfaces: project.interfaces?.length ?? 0,
    decisions: project.decisions.filter((item) => item.status === "accepted").length,
    findings: project.findings.length,
    openQuestions: (intelligence?.openQuestions ?? []).filter((item) => item.status === "open").length,
  };
  const included = {
    requirements: context.requirements.length,
    qualityScenarios: context.qualityScenarios.length,
    journeys: context.journeys.length,
    nodes: context.currentStageModel.nodes.length,
    relationships: context.currentStageModel.edges.length,
    interfaces: context.currentStageModel.interfaces.length,
    decisions: context.acceptedDecisions.length,
    findings: context.findings.length,
    openQuestions: context.unresolvedQuestions.length,
  };
  const evidenceRefs = unique([
    ...context.requirements.flatMap((item) => item.evidenceRefs ?? []),
    ...context.currentStageModel.interfaces.flatMap((item) => item.evidenceIds ?? []),
    ...context.requirements.map((item) => item.id),
    ...context.journeys.map((item) => item.id),
    context.stageContext?.contextFingerprint,
  ]).slice(0, 30);
  const missingInformation = unique([
    ...context.unresolvedQuestions.map((item) => item.question),
    ...(context.lifecycleStage === "quality" && !context.qualityScenarios.length
      ? ["No measurable quality scenario is accepted for this stage."]
      : []),
    ...(context.lifecycleStage === "context" && !context.currentStageModel.nodes.length
      ? ["No canonical System Context has been accepted."]
      : []),
    ...(["logical", "realization", "logicalTechnology", "physicalTechnology"].includes(context.lifecycleStage) && !context.currentStageModel.nodes.length
      ? ["No accepted architecture object exists in the current stage scope."]
      : []),
  ]).slice(0, 12);
  return {
    lifecycleStage: context.lifecycleStage,
    architectureStage: context.architectureStage,
    scopeLabel: context.scope.label,
    included,
    projectTotals: totals,
    excludedAsIrrelevant: Object.fromEntries(
      Object.entries(totals).map(([key, value]) => [key, Math.max(0, value - included[key as keyof typeof included])]),
    ),
    evidenceRefs,
    missingInformation,
    legacyProjectionUsed: context.legacyProjectionUsed,
  };
}

function buildLineagePaths(
  context: ReturnType<typeof compileProjectContext>,
): ArchitectureBrainLineagePath[] {
  const paths: ArchitectureBrainLineagePath[] = [];
  const requirements = context.requirements.slice(0, 6);
  const journeys = context.journeys.slice(0, 6);
  const nodes = context.currentStageModel.nodes.slice(0, 8);
  for (const node of nodes) {
    const explicit = unique(node.lineageFrom ?? []);
    const requirement = requirements.find((item) => explicit.includes(item.id)) ?? requirements[0];
    const journey = journeys.find((item) => explicit.includes(item.id) || item.requirementRefs.includes(requirement?.id ?? ""));
    const recordIds = unique([requirement?.id, journey?.id, ...explicit, node.id]);
    const missingLinks: string[] = [];
    if (!requirement) missingLinks.push("requirement");
    if (!journey && ["context", "logical", "realization"].includes(context.lifecycleStage)) missingLinks.push("journey");
    if (!node.id) missingLinks.push("architecture-object");
    paths.push({
      id: `LINEAGE-${node.id}`,
      label: `${requirement?.title ?? "Unlinked intent"} → ${journey?.name ?? context.lifecycleStage} → ${node.label}`,
      recordIds,
      complete: missingLinks.length === 0,
      missingLinks,
    });
  }
  if (!paths.length) {
    for (const requirement of requirements.slice(0, 4)) {
      const journey = journeys.find((item) => item.requirementRefs.includes(requirement.id));
      const missingLinks = journey ? [] : ["journey-or-stage-output"];
      paths.push({
        id: `LINEAGE-${requirement.id}`,
        label: `${requirement.title} → ${journey?.name ?? "unresolved downstream output"}`,
        recordIds: unique([requirement.id, journey?.id]),
        complete: missingLinks.length === 0,
        missingLinks,
      });
    }
  }
  return paths.slice(0, 8);
}

function finalizeAnswer(
  answer: Omit<CoArchitectAnswer, "contextReceipt" | "reasoningReceipt" | "qualityReceipt" | "lineagePaths">,
  input: CoArchitectInput,
  context: ReturnType<typeof compileProjectContext>,
  knowledgeRecordIds: string[],
  options: { fallbackReason?: string; llmContribution?: string[] } = {},
): CoArchitectAnswer {
  const contextReceipt = buildContextReceipt(input.project, context);
  const lineagePaths = buildLineagePaths(context);
  const reasoningReceipt: ArchitectureBrainReasoningReceipt = {
    deterministic: [
      "exact-lifecycle-stage",
      "stage-specific-context-selection",
      "unsupported-claim-guard",
      "deterministic-audit-grounding",
      "human-approval-boundary",
    ],
    knowledgeDerived: unique(knowledgeRecordIds).slice(0, 16),
    llmContribution: options.llmContribution ?? (answer.mode === "llm-assisted" ? ["structured-explanation", "alternative-and-trade-off-drafting"] : []),
    ...(options.fallbackReason ? { fallbackReason: options.fallbackReason } : {}),
  };
  const governanceReceipt = {
    governance: {
      humanApprovalRequired: true as const,
      directModelMutationAllowed: false as const,
      staleIfProjectRevisionChanges: true as const,
      auditRequired: true as const,
    },
    deterministicRules: reasoningReceipt.deterministic,
    knowledgeRefs: reasoningReceipt.knowledgeDerived,
    llm: {
      requested: input.intelligenceMode !== "deterministic",
      used: answer.mode === "llm-assisted",
      fallbackUsed: answer.mode === "deterministic-fallback",
    },
  };
  const qualityReceipt = evaluateSolResponseQuality({
    expectedLifecycleStage: input.lifecycleStage ?? context.lifecycleStage,
    actualLifecycleStage: answer.contextSummary.lifecycleStage,
    question: input.question,
    answer: answer.answer,
    recommendation: answer.recommendation,
    observations: answer.observations,
    tradeOffs: answer.tradeOffs,
    clarifyingQuestions: answer.clarifyingQuestions,
    suggestedActionCount: answer.suggestedNextActions.length,
    confidence: answer.confidence,
    citedRecordIds: answer.citedRecordIds,
    context: contextReceipt,
    receipt: governanceReceipt,
    lineagePaths,
    allowedEvidenceText: JSON.stringify({ context, knowledgeRecordIds }),
  });
  return { ...answer, contextReceipt, reasoningReceipt, qualityReceipt, lineagePaths };
}

function classifyQuestion(
  question: string,
):
  | "next-decision"
  | "missing-scope"
  | "explain-fit"
  | "approval-blockers"
  | "general" {
  const text = question.toLowerCase();
  if (/next|most important|priority|decision/.test(text))
    return "next-decision";
  if (/missing|gap|omit|incomplete/.test(text)) return "missing-scope";
  if (/why|fit|trade.?off|style|pattern/.test(text)) return "explain-fit";
  if (/approval|block|review|ready/.test(text)) return "approval-blockers";
  return "general";
}


interface StageDiagnosis {
  recommendation: string;
  observations: string[];
  clarifyingQuestions: string[];
  citedRecordIds: string[];
  actionTitle: string;
}

function severityRank(value: string): number {
  const normalized = value.toUpperCase();
  if (normalized === "HARD" || normalized === "CRITICAL") return 5;
  if (normalized === "SIGNIFICANT" || normalized === "HIGH") return 4;
  if (normalized === "MEDIUM") return 3;
  if (normalized === "LOW") return 2;
  return 1;
}

function stageSpecificDiagnosis(
  context: ReturnType<typeof compileProjectContext>,
): StageDiagnosis {
  const requirement = context.requirements[0];
  const journey = context.journeys[0];
  const stageNodes = context.currentStageModel.nodes;
  const interfaces = context.currentStageModel.interfaces;
  const acceptedDecision = context.acceptedDecisions[0];
  const findings = [...context.findings].sort(
    (left, right) => severityRank(right.severity) - severityRank(left.severity),
  );

  if (context.lifecycleStage === "requirements") {
    const weak = context.requirements.find(
      (item) =>
        (item.ambiguityFlags?.length ?? 0) > 0 ||
        !(item.stakeholderRefs?.length ?? 0) ||
        !(item.acceptanceCriteria?.length ?? 0),
    ) ?? requirement;
    if (!weak) {
      return {
        recommendation:
          "No accepted requirement is available to assess. Capture the intended outcome, accountable stakeholder, scope boundary and acceptance evidence before beginning architecture design.",
        observations: [
          "The requirements baseline contains no accepted requirement record.",
        ],
        clarifyingQuestions: [
          "Which business outcome must the solution achieve, who is accountable for it, and what observable evidence would demonstrate success?",
        ],
        citedRecordIds: [],
        actionTitle: "Establish the requirements baseline",
      };
    }
    const gaps = unique([
      ...(weak.stakeholderRefs?.length ? [] : ["no accountable stakeholder is linked"]),
      ...(weak.acceptanceCriteria?.length ? [] : ["no observable acceptance criterion is recorded"]),
      ...((weak.ambiguityFlags ?? []).filter((item) => !/^compatibility projection/i.test(item)).slice(0, 1)),
    ]);
    return {
      recommendation: `Requirement ${weak.id} (“${weak.title}”) is the most architecture-significant ambiguity because ${gaps.map((item) => item.replace(/[.]+$/, "")).join(" and ")}. Resolve this before treating the requirements baseline as architecture-ready.`,
      observations: [
        `The accepted statement is: “${weak.statement}”`,
        `${context.project.stakeholders.length} project stakeholder(s) exist, but this requirement has ${weak.stakeholderRefs?.length ?? 0} explicit stakeholder link(s).`,
        `${weak.acceptanceCriteria?.length ?? 0} acceptance criterion/criteria are attached to the requirement.`,
      ],
      clarifyingQuestions: [
        `Who is accountable for approving “${weak.title}”, and what observable acceptance evidence will show that the outcome has been achieved?`,
      ],
      citedRecordIds: [weak.id],
      actionTitle: "Resolve the requirement ambiguity",
    };
  }

  if (context.lifecycleStage === "quality") {
    const scenario = context.qualityScenarios
      .map((item) => ({
        item,
        missing: [
          !item.source ? "source" : "",
          !item.stimulus ? "stimulus" : "",
          !item.environment ? "environment" : "",
          !item.artifact ? "artifact" : "",
          !item.response ? "response" : "",
          !item.responseMeasure ? "response measure" : "",
        ].filter(Boolean),
      }))
      .sort((left, right) => right.missing.length - left.missing.length)[0];
    if (!scenario) {
      return {
        recommendation:
          "No measurable quality scenario is accepted. Architecture style, pattern and technology recommendations must remain provisional until source, stimulus, environment, response and response measure are defined.",
        observations: ["The current quality stage contains zero accepted quality scenarios."],
        clarifyingQuestions: [
          "Which failure, load or security condition matters most, and what measurable response would stakeholders accept?",
        ],
        citedRecordIds: requirement ? [requirement.id] : [],
        actionTitle: "Define the first measurable quality scenario",
      };
    }
    const { item, missing } = scenario;
    const weakness = missing.length
      ? `it is missing ${missing.join(", ")}`
      : `its response measure (“${item.responseMeasure}”) has no recorded observation window, verification source or accountable test owner`;
    return {
      recommendation: `Quality scenario ${item.id} is the weakest measurable constraint because ${weakness}. Until that evidence is supplied, tactics derived from this scenario must remain provisional.`,
      observations: [
        `Stimulus: ${item.stimulus || "not supplied"}.`,
        `Environment: ${item.environment || "not supplied"}.`,
        `Response: ${item.response || "not supplied"}.`,
        `Response measure: ${item.responseMeasure || "not supplied"}.`,
      ],
      clarifyingQuestions: [
        missing.length
          ? `What should be recorded for the missing ${missing.join(", ")} field(s) in ${item.id}?`
          : `Over what measurement window, using which evidence source and test owner, will “${item.responseMeasure}” be verified?`,
      ],
      citedRecordIds: [item.id],
      actionTitle: "Make the quality scenario testable",
    };
  }

  if (context.lifecycleStage === "context") {
    if (!stageNodes.length) {
      const externalSystems = context.project.existingSystems.slice(0, 3);
      return {
        recommendation: journey
          ? `No canonical System Context is accepted. Use journey ${journey.id} (“${journey.name}”) to establish the system boundary, then explicitly disposition its actors, ${externalSystems.length ? `the known external systems (${externalSystems.join(", ")})` : "external dependencies"}, trust-boundary crossings and interactions.`
          : "No canonical System Context is accepted. Establish the system of interest, human actors, external systems and boundary interactions before logical decomposition.",
        observations: [
          `${context.journeys.length} accepted or compatibility-projected journey(s) are available.`,
          `${context.project.existingSystems.length} known existing system(s) may create external dependency obligations.`,
          "Zero canonical System Context participants and interactions are currently accepted.",
        ],
        clarifyingQuestions: [
          journey
            ? `For journey “${journey.name}”, which participants are inside the system of interest and which must remain external?`
            : "Which approved journey should define the first System Context boundary?",
        ],
        citedRecordIds: unique([journey?.id, ...(journey?.requirementRefs ?? [])]),
        actionTitle: "Establish the System Context boundary",
      };
    }
    const external = stageNodes.find((node) => node.tags.includes("external") || /external|actor/i.test(node.kind));
    return {
      recommendation: `Review ${external?.id ?? stageNodes[0]!.id} (“${external?.label ?? stageNodes[0]!.label}”) against the accepted journeys and explicitly confirm whether it is inside or outside the system boundary and which interactions cross a trust boundary.`,
      observations: [
        `${stageNodes.length} context participant(s) and ${context.currentStageModel.edges.length} interaction(s) are accepted.`,
        `${context.journeys.length} journey(s) must be represented or explicitly dispositioned.`,
      ],
      clarifyingQuestions: [
        `Which accepted journey interaction proves the boundary placement and trust classification of “${external?.label ?? stageNodes[0]!.label}”?`,
      ],
      citedRecordIds: unique([external?.id ?? stageNodes[0]?.id, journey?.id, ...(journey?.requirementRefs ?? [])]),
      actionTitle: "Validate the context boundary",
    };
  }

  if (context.lifecycleStage === "logical") {
    const services = stageNodes
      .filter((node) => /service|domain|capability/i.test(`${node.kind} ${node.label}`))
      .sort((left, right) => {
        const leftService = /service/i.test(`${left.kind} ${left.label}`) ? 0 : 1;
        const rightService = /service/i.test(`${right.kind} ${right.label}`) ? 0 : 1;
        return leftService - rightService;
      });
    const left = services[0] ?? stageNodes[0];
    const right = services[1] ?? stageNodes[1];
    if (!left) {
      return {
        recommendation:
          "No logical responsibility is accepted. Derive the first responsibility from an approved journey step and give it an accountable owner before selecting an architecture style.",
        observations: ["The logical stage contains zero accepted responsibility-bearing objects."],
        clarifyingQuestions: [
          journey ? `Which responsibility in journey “${journey.name}” must the system own?` : "Which approved journey should drive the first logical responsibility?",
        ],
        citedRecordIds: unique([journey?.id, ...(journey?.requirementRefs ?? [])]),
        actionTitle: "Create the first logical responsibility",
      };
    }
    return {
      recommendation: right
        ? `The next boundary decision is ownership between ${left.id} (“${left.label}”) and ${right.id} (“${right.label}”). Assign one owner for the journey state and failure/compensation policy; otherwise their coupling remains ambiguous before further decomposition.`
        : `Clarify the full responsibility, owner and collaboration boundary of ${left.id} (“${left.label}”) before decomposing it further.`,
      observations: [
        `${left.label} currently represents ${left.description || "an accepted logical responsibility"}.`,
        ...(right ? [`${right.label} is the nearest competing or collaborating responsibility in the current logical scope.`] : []),
        ...(acceptedDecision ? [`Accepted decision ${acceptedDecision.id} constrains this boundary: ${acceptedDecision.decision}`] : []),
      ],
      clarifyingQuestions: [
        right
          ? `Which responsibility owns the authoritative state and compensation outcome when “${left.label}” and “${right.label}” collaborate?`
          : `Which team owns “${left.label}”, and which state and policy decisions belong inside its boundary?`,
      ],
      citedRecordIds: unique([left.id, right?.id, acceptedDecision?.id, journey?.id, ...(journey?.requirementRefs ?? [])]),
      actionTitle: "Resolve the logical ownership boundary",
    };
  }

  if (context.lifecycleStage === "realization") {
    const worker = stageNodes.find((node) => /worker|processor|consumer/i.test(`${node.kind} ${node.label}`));
    const externalInterface = interfaces.find((item) => /provider|external|payment/i.test(item.name)) ?? interfaces[0];
    const recoveryComponent = stageNodes.find((node) => /reconcil|compensat|exception|recovery/i.test(node.label));
    if (worker && externalInterface && !recoveryComponent) {
      return {
        recommendation: `Add an explicit reconciliation or compensation responsibility around ${worker.id} (“${worker.label}”) for exhausted retries and uncertain outcomes on interface ${externalInterface.id} (“${externalInterface.name}”). The accepted asynchronous boundary otherwise has no visible owner for exception resolution.`,
        observations: [
          `${externalInterface.name} uses ${externalInterface.interactionStyle} with retry policy “${externalInterface.retryPolicy || "not recorded"}” and dead-letter/exception policy “${externalInterface.deadLetterPolicy || "not recorded"}”.`,
          `${worker.label} is the current deployable consumer/processor in this scope.`,
          ...(acceptedDecision ? [`Decision ${acceptedDecision.id} records the accepted alternative and consequences.`] : []),
        ],
        clarifyingQuestions: [
          `Which component and team own reconciliation, compensation and manual disposition after retries on “${externalInterface.name}” are exhausted?`,
        ],
        citedRecordIds: unique([worker.id, externalInterface.id, acceptedDecision?.id]),
        actionTitle: "Assign failure-recovery responsibility",
      };
    }
    const incomplete = interfaces.find((item) => !item.owner || !item.authentication || !item.operationOrEvent);
    if (incomplete) {
      const missing = unique([
        ...(incomplete.owner ? [] : ["owner"]),
        ...(incomplete.authentication ? [] : ["authentication"]),
        ...(incomplete.operationOrEvent ? [] : ["operation or event contract"]),
      ]);
      return {
        recommendation: `Interface ${incomplete.id} (“${incomplete.name}”) is not implementation-ready because ${missing.join(", ")} is missing. Complete the contract before adding more components.`,
        observations: [`The interface currently uses ${incomplete.protocol || "an unspecified protocol"} and ${incomplete.interactionStyle}.`],
        clarifyingQuestions: [`Who owns “${incomplete.name}”, and what are its missing ${missing.join(", ")} details?`],
        citedRecordIds: [incomplete.id],
        actionTitle: "Complete the critical interface contract",
      };
    }
    return {
      recommendation: "The current component and interface set has no dominant deterministic omission. Select the highest-risk external interaction and verify state ownership, timeout, retry, idempotency and failure disposition before further decomposition.",
      observations: [`${stageNodes.length} realization object(s) and ${interfaces.length} interface contract(s) are currently in scope.`],
      clarifyingQuestions: ["Which external interaction has the highest business impact if its outcome is uncertain or duplicated?"],
      citedRecordIds: unique([interfaces[0]?.id, stageNodes[0]?.id]),
      actionTitle: "Verify failure handling for the highest-risk interface",
    };
  }

  if (context.lifecycleStage === "logicalTechnology") {
    const recoveryCapability = stageNodes.find((node) => /backup|recovery|continuity|resilien|failover/i.test(`${node.label} ${node.tags.join(" ")}`));
    const quality = context.qualityScenarios.find((item) => /availability|recovery|resilien|fault/i.test(item.attributeId)) ?? context.qualityScenarios[0];
    if (!recoveryCapability && quality) {
      return {
        recommendation: `Add a provider-neutral resilience and recovery capability. Quality scenario ${quality.id} requires “${quality.response}”, but the logical technology model has no explicit backup, recovery, failover or continuity capability to own that obligation.`,
        observations: [
          `The accepted response measure is: “${quality.responseMeasure}”.`,
          `${stageNodes.length} provider-neutral capability object(s) exist, but none is classified for recovery or continuity.`,
        ],
        clarifyingQuestions: [
          `Which provider-neutral recovery capabilities and accountable operational owner will verify scenario ${quality.id} before product selection?`,
        ],
        citedRecordIds: [quality.id],
        actionTitle: "Add the missing recovery capability",
      };
    }
    const unlinked = stageNodes.find((node) => !(node.lineageFrom?.length ?? 0));
    return {
      recommendation: unlinked
        ? `Capability ${unlinked.id} (“${unlinked.label}”) is weakly justified because it has no explicit lineage to an application responsibility or quality tactic. Establish that lineage or remove it.`
        : "All current capabilities have at least one lineage reference. Review the capability with the broadest reuse scope for ownership, blast radius and evidence before binding products.",
      observations: [`${stageNodes.length} provider-neutral technology capabilities are currently in scope.`],
      clarifyingQuestions: [unlinked ? `Which accepted responsibility or quality tactic requires “${unlinked.label}”?` : "Which capability has the highest shared blast radius and who owns it?"],
      citedRecordIds: unique([unlinked?.id, quality?.id]),
      actionTitle: "Validate capability justification",
    };
  }

  if (context.lifecycleStage === "physicalTechnology") {
    const deploymentFinding = findings.find((item) => /zone|region|replica|deployment|network|recovery|failover/i.test(`${item.title} ${item.message} ${item.rationale}`)) ?? findings[0];
    if (deploymentFinding) {
      const affected = stageNodes.find((node) => deploymentFinding.affectedNodeIds?.includes(node.id));
      return {
        recommendation: `The highest-impact deployment decision is ${deploymentFinding.id} (“${deploymentFinding.title}”). ${deploymentFinding.message} Keep the physical stage unapproved until the failure-domain choice is corrected or an accountable risk disposition is recorded.`,
        observations: [
          deploymentFinding.rationale,
          ...(affected ? [`Affected topology object: ${affected.id} (“${affected.label}”).`] : []),
          ...(deploymentFinding.mitigations?.slice(0, 2) ?? []),
        ],
        clarifyingQuestions: [
          affected
            ? `Which zone/region failover design and verification evidence will replace the current configuration of “${affected.label}”?`
            : "Which failure domain is accepted, and what recovery evidence will verify the decision?",
        ],
        citedRecordIds: unique([deploymentFinding.id, affected?.id]),
        actionTitle: "Resolve the deployment failure-domain blocker",
      };
    }
    return {
      recommendation: "No evidence-backed physical-topology blocker is dominant. Verify region, zone, network, identity, observability and recovery ownership before approving the deployment view.",
      observations: [`${stageNodes.length} physical technology objects are currently in scope.`],
      clarifyingQuestions: ["Which physical failure domain creates the largest unverified business impact?"],
      citedRecordIds: unique([stageNodes[0]?.id]),
      actionTitle: "Verify the physical failure domains",
    };
  }

  if (context.lifecycleStage === "review") {
    const blocker = findings[0];
    if (blocker) {
      return {
        recommendation: `Architecture approval should remain blocked by ${blocker.id} (“${blocker.title}”, severity ${blocker.severity}). Disposition it as changes required, attach the mitigation evidence, and only then request re-review.`,
        observations: [
          blocker.message,
          blocker.rationale,
          ...(blocker.mitigations?.slice(0, 2) ?? []),
        ],
        clarifyingQuestions: [
          `Who owns remediation of “${blocker.title}”, what evidence will prove closure, and which reviewer must accept it?`,
        ],
        citedRecordIds: unique([blocker.id, ...blocker.affectedNodeIds]),
        actionTitle: "Disposition the strongest approval blocker",
      };
    }
    return {
      recommendation: "No finding currently dominates approval. Verify traceability, interface completeness, accepted decisions and independent-review evidence before approving the baseline.",
      observations: ["The review model contains no recorded finding."],
      clarifyingQuestions: ["Which independent reviewer is accountable for the final evidence-based approval decision?"],
      citedRecordIds: unique([acceptedDecision?.id]),
      actionTitle: "Complete the approval evidence review",
    };
  }

  const blocker = findings[0];
  const changesRequested = context.stageApprovals.find((item) => item.status === "changes-requested");
  if (blocker || changesRequested) {
    return {
      recommendation: `The SDD is not implementation-ready because ${blocker ? `${blocker.id} (“${blocker.title}”) remains unresolved` : "a stage remains changes-requested"}${changesRequested ? ` and approval ${changesRequested.id} is still changes-requested` : ""}. Mark the affected security/deployment and assurance sections as blocked or stale, attach corrective evidence, and regenerate only after reapproval.`,
      observations: [
        ...(blocker ? [blocker.message, blocker.rationale] : []),
        ...(changesRequested ? [`Approval ${changesRequested.id} for ${changesRequested.stage} has status ${changesRequested.status}.`] : []),
      ],
      clarifyingQuestions: [
        "Which SDD section owns the unresolved finding, and what evidence and approval will make that section implementation-ready?",
      ],
      citedRecordIds: unique([blocker?.id, changesRequested?.id, acceptedDecision?.id]),
      actionTitle: "Close the SDD evidence gap",
    };
  }
  return {
    recommendation: "No single stale SDD element is dominant. Verify that every diagram, interface contract, ADR and implementation obligation is generated from the current approved revision before freezing the delivery pack.",
    observations: [`${context.acceptedDecisions.length} accepted decision(s) and ${interfaces.length} interface contract(s) are in the current evidence context.`],
    clarifyingQuestions: ["Which implementation consumer will sign off the delivery pack and its remaining assumptions?"],
    citedRecordIds: unique([acceptedDecision?.id, interfaces[0]?.id]),
    actionTitle: "Verify SDD section freshness",
  };
}

function deterministicFallback(
  input: CoArchitectInput,
  context: ReturnType<typeof compileProjectContext>,
  contextual: ReturnType<typeof recommendInContext>,
  deterministic: ReturnType<typeof runDeterministicAudit>,
  patternPack: ReturnType<typeof buildRecommendationEvidencePack>,
): Omit<CoArchitectAnswer, "contextReceipt" | "reasoningReceipt" | "qualityReceipt" | "lineagePaths"> {
  const intent = classifyQuestion(input.question);
  const diagnosis = stageSpecificDiagnosis(context);
  const architectureRecommendationStage = [
    "logical",
    "realization",
    "logicalTechnology",
    "physicalTechnology",
  ].includes(context.lifecycleStage);
  const topStyle = architectureRecommendationStage
    ? contextual.styles.find((item) => item.eligible)
    : undefined;
  const topPattern = architectureRecommendationStage
    ? patternPack.recommendations.find((item) => item.eligible)
    : undefined;
  const fallbackPattern = architectureRecommendationStage
    ? contextual.patterns.find((item) => item.eligible)
    : undefined;
  const topPatternId = topPattern?.patternId ?? fallbackPattern?.patternId;
  const topPatternName =
    topPattern?.patternName ?? fallbackPattern?.patternName;
  const stageFindingPattern: Partial<
    Record<CoArchitectLifecycleStage, RegExp>
  > = {
    requirements:
      /requirement|stakeholder|business outcome|acceptance criteria|journey coverage|ambigu|contradiction/i,
    quality:
      /quality scenario|response measure|availability|performance|security|recovery|resilience/i,
    context:
      /system context|system boundary|actor|external system|participant|journey interaction|trust boundary/i,
    logical: /domain|responsibility|logical|coupling|boundary|service/i,
    realization: /component|interface|api|event|state|realization/i,
    logicalTechnology:
      /capability|runtime|integration|identity|observability|technology/i,
    physicalTechnology:
      /deployment|region|zone|cluster|network|runtime|physical/i,
  };
  const stageFinding = deterministic.findings.find((item) => {
    const pattern = stageFindingPattern[context.lifecycleStage];
    return (
      !pattern ||
      pattern.test(
        `${item.title ?? ""} ${item.message ?? ""} ${item.rationale ?? ""}`,
      )
    );
  });
  const highestFinding =
    stageFinding ??
    (["review", "sdd"].includes(context.lifecycleStage)
      ? deterministic.findings[0]
      : undefined);
  const criticalQuestion = context.unresolvedQuestions.find(
    (item) => item.impact === "critical" || item.impact === "high",
  );
  const observations: string[] = [...diagnosis.observations];
  if (context.legacyProjectionUsed)
    observations.push(
      "Sol is using an explicit read-only compatibility projection from architect-confirmed objectives and constraints because canonical Requirements Intelligence records are not yet available.",
    );
  if (context.requirements.length)
    observations.push(
      `${context.requirements.length} relevant accepted requirement(s) ground this question.`,
    );
  else
    observations.push(
      "No accepted requirement matched the question strongly enough; the answer remains provisional.",
    );
  if (context.lifecycleStage === "requirements") {
    observations.push(
      `${context.journeys.length} relevant journey(s) connect the intended outcome to observable user and operational behaviour.`,
    );
  } else if (context.lifecycleStage === "quality") {
    observations.push(
      `${context.qualityScenarios.length} measurable quality scenario(s) currently constrain design choices.`,
    );
  } else if (context.lifecycleStage === "context") {
    observations.push(
      `${context.currentStageModel.nodes.length} accepted context participant(s) and ${context.currentStageModel.edges.length} interaction(s) define the current boundary.`,
    );
  } else if (context.currentStageModel.nodes.length) {
    observations.push(
      `${context.currentStageModel.nodes.length} current-stage architecture object(s) are in scope.`,
    );
  } else if (!["review", "sdd"].includes(context.lifecycleStage)) {
    observations.push(
      "The current design stage has no accepted architecture object in scope yet.",
    );
  }
  if (criticalQuestion)
    observations.push(
      `An unresolved ${criticalQuestion.impact}-impact question remains: ${criticalQuestion.question}`,
    );
  if (highestFinding)
    observations.push(
      `The most relevant deterministic concern is: ${highestFinding.message}`,
    );

  let recommendation = diagnosis.recommendation;
  if (intent === "explain-fit") {
    recommendation = topStyle
      ? `${topStyle.styleName} is currently the leading eligible style (${topStyle.score.toFixed(1)}), but it should remain provisional until its obligations and alternatives are dispositioned.`
      : topPatternName
        ? `${topPatternName} is the strongest approved Pattern DNA candidate, subject to its prerequisites, exclusions and trade-offs.`
        : "No style or pattern has enough approved evidence to be presented as the preferred choice for this scope.";
  } else if (intent === "approval-blockers" && !["review", "sdd"].includes(context.lifecycleStage)) {
    recommendation = highestFinding
      ? `The first approval blocker to resolve is ${highestFinding.id}: ${highestFinding.message}`
      : criticalQuestion
        ? `Approval should remain gated until this question is answered: ${criticalQuestion.question}`
        : diagnosis.recommendation;
  }

  const stageTradeOffs: Record<CoArchitectLifecycleStage, string[]> = {
    requirements: [
      "Adding inferred scope can make the specification appear complete while hiding unconfirmed business assumptions.",
      "Deferring clarification preserves speed now but increases the chance of rework in every downstream model.",
    ],
    quality: [
      "Increasing one quality priority usually raises cost or constrains another; preserve the measurable scenario and accepted trade-off.",
      "A quality label without a response measure cannot authoritatively select tactics, patterns or technology.",
    ],
    context: [
      "Including a participant inside the system boundary assigns responsibility; leaving it external creates an interface and dependency obligation.",
      "Collapsing multiple journeys into one interaction simplifies the view but may hide different trust, data or failure semantics.",
    ],
    logical: [
      topStyle
        ? `Choosing ${topStyle.styleName} constrains later decomposition and operational obligations; compare at least one credible alternative.`
        : "No eligible style is authoritative yet.",
      topPatternName
        ? `${topPatternName} may improve fit only when its prerequisites and failure obligations are accepted.`
        : "No approved pattern candidate currently dominates.",
    ],
    realization: [
      topStyle
        ? `Choosing ${topStyle.styleName} constrains deployable boundaries, ownership and operational coupling.`
        : "No eligible style is authoritative yet.",
      topPatternName
        ? `${topPatternName} is useful only when interface, state and failure obligations are accepted.`
        : "No approved pattern candidate currently dominates.",
    ],
    logicalTechnology: [
      "A broader shared capability may improve reuse but can increase coupling, blast radius and governance overhead.",
      "A provider-neutral capability should remain separate from product selection until constraints and quality tactics justify the binding.",
    ],
    physicalTechnology: [
      "Higher redundancy improves resilience but increases cost, operational complexity and consistency concerns.",
      "A product mapping that ignores regions, zones, identity and observability creates a deployable diagram without an operable system.",
    ],
    review: [
      "Waiving a finding accelerates approval but transfers an explicit risk and evidence obligation to an accountable owner.",
      "Adding more documentation cannot compensate for an unresolved critical security, resilience or interface omission.",
    ],
    sdd: [
      "Generating a draft early supports review, but it must remain visibly unapproved and preserve evidence gaps.",
      "Freezing the delivery pack improves control but requires downstream change-impact and reapproval when canonical design changes.",
    ],
  };
  const tradeOffs = stageTradeOffs[context.lifecycleStage];
  const clarifyingQuestions = unique([
    ...diagnosis.clarifyingQuestions,
    ...context.unresolvedQuestions.slice(0, 3).map((item) => item.question),
  ]).slice(0, 4);
  const citedRecordIds = unique([
    ...diagnosis.citedRecordIds,
    ...(topStyle?.styleId && patternPack.approvedRecordIds.includes(topStyle.styleId)
      ? [topStyle.styleId]
      : []),
    ...(topPatternId && patternPack.approvedRecordIds.includes(topPatternId)
      ? [topPatternId]
      : []),
  ]);
  const target: CoArchitectAnswer["suggestedNextActions"][number]["target"] =
    context.lifecycleStage === "review" || context.lifecycleStage === "sdd"
      ? "review"
      : context.lifecycleStage === "requirements"
        ? "brief"
        : context.lifecycleStage === "quality"
          ? "quality"
          : "canvas";

  return {
    answer: `${recommendation} ${observations[0] ?? ""}`.trim(),
    observations: observations.slice(0, 5),
    recommendation,
    tradeOffs: tradeOffs.slice(0, 4),
    clarifyingQuestions,
    confidence:
      context.requirements.length &&
      (context.currentStageModel.nodes.length ||
        ["requirements", "quality"].includes(context.lifecycleStage))
        ? "medium"
        : "low",
    contextSummary: {
      lifecycleStage: context.lifecycleStage,
      architectureStage: context.architectureStage,
      scopeLabel: context.scope.label,
      requirementCount: context.requirements.length,
      qualityScenarioCount: context.qualityScenarios.length,
      journeyCount: context.journeys.length,
      stageObjectCount: context.currentStageModel.nodes.length,
      interfaceCount: context.currentStageModel.interfaces.length,
      openQuestionCount: context.unresolvedQuestions.length,
      findingCount: context.findings.length,
    },
    citedRecordIds,
    suggestedNextActions: [
      {
        title:
          intent === "explain-fit"
            ? "Review the evidence-backed fit"
            : diagnosis.actionTitle,
        rationale: `${recommendation} AIW remains pinned to ${patternPack.knowledgeRelease} and will not mutate the model without acceptance.`,
        target,
        citedRecordIds,
      },
    ],
    mode: "deterministic-fallback",
  };
}

function projectRecordIds(
  context: ReturnType<typeof compileProjectContext>,
): string[] {
  return unique([
    ...context.requirements.map((item) => item.id),
    ...context.qualityScenarios.map((item) => item.id),
    ...context.journeys.map((item) => item.id),
    ...context.currentStageModel.nodes.map((item) => item.id),
    ...context.currentStageModel.edges.map((item) => item.id),
    ...context.currentStageModel.interfaces.map((item) => item.id),
    ...context.acceptedDecisions.map((item) => item.id),
    ...context.findings.map((item) => item.id),
    ...context.unresolvedQuestions.map((item) => item.id),
    ...context.stageApprovals.map((item) => item.id),
  ]);
}

export async function askCoArchitect(
  input: CoArchitectInput,
  library: KnowledgeLibrary,
  gateway: LlmGateway,
): Promise<CoArchitectAnswer> {
  const lifecycleStage =
    input.lifecycleStage ?? inferLifecycleStage(input.project);
  const architectureStage = architectureStageFor(lifecycleStage, input.project);
  const reasoningProject: ArchitectureProject =
    input.project.activeStage === architectureStage
      ? input.project
      : { ...input.project, activeStage: architectureStage };
  const normalizedInput = { ...input, lifecycleStage };
  const contextual = recommendInContext(reasoningProject, library, {
    stage: architectureStage,
    scopeNodeId: input.selectedNodeId,
    trigger: "scope-change",
  });
  const deterministic = runDeterministicAudit(reasoningProject, library);
  const patternPack = buildRecommendationEvidencePack(
    {
      query: buildKnowledgeQuery(normalizedInput, architectureStage),
      project: reasoningProject,
      stage: architectureStage,
      ...(input.selectedNodeId ? { scopeNodeId: input.selectedNodeId } : {}),
      limit: 12,
    },
    sprint78PatternCorpus,
  );
  const context = compileProjectContext(normalizedInput, architectureStage);
  const approvedRecordIds = new Set(patternPack.approvedRecordIds);
  const knowledgeGrounding = buildApprovedKnowledgeGroundingPack({
    activeKnowledgeReleaseId: patternPack.knowledgeRelease,
    recordIds: approvedRecordIds,
  });
  const projectCitationIds = new Set(projectRecordIds(context));
  const projectGroundingSources: ApprovedGroundingSource[] = [...projectCitationIds].map((id) => ({
    id,
    recordId: id,
    title: `Canonical project record ${id}`,
    statement: JSON.stringify(context),
    sourceReleaseId: `project-revision-${reasoningProject.revision}`,
    activeKnowledgeReleaseId: patternPack.knowledgeRelease,
    reviewStatus: "verified",
  }));
  const groundingSources = [...knowledgeGrounding.sources, ...projectGroundingSources];
  const allowedCitationIds = new Set([...knowledgeGrounding.allowedReferenceIds, ...projectCitationIds]);
  const fallback = deterministicFallback(
    normalizedInput,
    context,
    contextual,
    deterministic,
    patternPack,
  );
  const finalizedFallback = (fallbackReason?: string, trace?: CoArchitectAnswer["modelTrace"]) =>
    finalizeAnswer(
      { ...fallback, ...(trace ? { modelTrace: trace } : {}) },
      normalizedInput,
      context,
      patternPack.approvedRecordIds,
      fallbackReason ? { fallbackReason } : {},
    );

  if (!approvedRecordIds.size) {
    const noKnowledgeFallback = {
      ...fallback,
      observations: [
        ...fallback.observations,
        `No approved knowledge record in ${patternPack.knowledgeRelease} matched strongly enough; the response is based only on canonical project evidence and deterministic validation.`,
      ].slice(0, 5),
      citedRecordIds: fallback.citedRecordIds.filter((id) => projectCitationIds.has(id)),
      suggestedNextActions: fallback.suggestedNextActions.map((item) => ({
        ...item,
        citedRecordIds: item.citedRecordIds.filter((id) => projectCitationIds.has(id)),
      })),
    };
    return finalizeAnswer(
      noKnowledgeFallback,
      normalizedInput,
      context,
      [],
      { fallbackReason: "No approved knowledge record matched the question strongly enough." },
    );
  }

  if (input.intelligenceMode === "deterministic") {
    return finalizedFallback("Deterministic-only mode was requested for calibration or private execution.");
  }

  const patternDnaRecords = sprint78PatternCorpus
    .filter((item) => patternPack.approvedRecordIds.includes(item.id))
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      name: item.name,
      recordType: item.recordType,
      category: item.category,
      summary: item.summary,
      problem: item.problem,
      context: item.context,
      forces: item.forces,
      applicabilityRules: item.applicabilityRules,
      exclusions: item.exclusions,
      prerequisites: item.prerequisites,
      alternatives: item.alternatives,
      qualityImpacts: item.qualityImpacts,
      obligations: item.obligations,
      risks: item.risks,
      mitigations: item.mitigations,
      evidence: item.evidence,
    }));
  const evidence = {
    knowledgeRelease: patternPack.knowledgeRelease,
    styles: library.architectureStyles
      .filter((item) => approvedRecordIds.has(item.id))
      .slice(0, 6)
      .map((item) => ({
        id: item.id,
        name: item.name,
        traits: item.traits ?? [],
        obligations: item.obligations,
        whenToConsider: item.whenToConsider,
        whenToAvoidOrQuestion: item.whenToAvoidOrQuestion,
      })),
    corePatterns: library.patterns
      .filter((item) => approvedRecordIds.has(item.id))
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        obligations: item.obligations,
        risks: item.risks,
        mitigations: item.mitigations,
        conflictsWith: item.conflictsWith,
      })),
    patternDnaRecords,
    recommendations: patternPack.recommendations.slice(0, 8),
    approvedEvidence: patternPack.approvedEvidence.slice(0, 12),
    opposingEvidence: patternPack.opposingEvidence.slice(0, 8),
    obligations: patternPack.obligations.slice(0, 12),
    conflicts: patternPack.conflicts.slice(0, 8),
    openQuestions: patternPack.openQuestions.slice(0, 8),
    approvedClaimGrounding: {
      activeKnowledgeReleaseId: knowledgeGrounding.activeKnowledgeReleaseId,
      sourceFingerprint: knowledgeGrounding.sourceFingerprint,
      sources: knowledgeGrounding.sources,
      excluded: knowledgeGrounding.excluded,
    },
  };

  try {
    const execution = await gateway.generateJson<{
      answer: string;
      observations: string[];
      recommendation: string;
      tradeOffs: string[];
      clarifyingQuestions: string[];
      confidence: "high" | "medium" | "low";
      citedRecordIds: string[];
      suggestedNextActions: CoArchitectAnswer["suggestedNextActions"];
    }>({
      purpose: "recommendation-explanation",
      schemaName: "aiw_co_architect_answer_v2",
      dataClassification: input.dataClassification ?? "internal",
      system: [
        "You are Sol, the embedded AIW senior architecture co-author.",
        "Answer the architect's exact question for the supplied lifecycle stage and selected scope; do not drift to generic software-architecture advice.",
        "The compact project context is authoritative. Separate accepted facts, deterministic inference, knowledge-derived guidance and missing evidence.",
        "Name one primary recommendation. Explain why it follows from requirements, journeys, quality scenarios, current model and approved knowledge.",
        "Expose material trade-offs and ask clarification questions when evidence is insufficient. Never invent targets, interfaces, approvals, production facts or technologies.",
        "Cite supplied project record IDs for project-specific facts and approved knowledge record IDs for external architectural claims.",
        "Suggested actions must be reviewable navigation or design activities, never silent model mutations.",
        "Be direct and specific. Avoid generic phrases such as 'consider scalability' unless tied to a supplied scenario, force or omission.",
      ].join(" "),
      user: JSON.stringify({
        question: input.question,
        questionIntent: classifyQuestion(input.question),
        context,
        deterministicFindings: deterministic.findings.slice(0, 10),
        contextualCandidates: {
          styles: contextual.styles.slice(0, 6),
          patterns: contextual.patterns.slice(0, 8),
          obligations: contextual.obligations.slice(0, 12),
        },
        approvedKnowledge: evidence,
      }),
      grounding: {
        allowedReferenceIds: [...allowedCitationIds],
        sources: groundingSources,
        requireCitations: true,
        minimumSupportScore: 0.06,
      },
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        required: [
          "answer",
          "observations",
          "recommendation",
          "tradeOffs",
          "clarifyingQuestions",
          "confidence",
          "citedRecordIds",
          "suggestedNextActions",
        ],
        properties: {
          answer: { type: "string" },
          observations: {
            type: "array",
            maxItems: 5,
            items: { type: "string" },
          },
          recommendation: { type: "string" },
          tradeOffs: { type: "array", maxItems: 4, items: { type: "string" } },
          clarifyingQuestions: {
            type: "array",
            maxItems: 4,
            items: { type: "string" },
          },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          citedRecordIds: {
            type: "array",
            items: { type: "string", enum: [...allowedCitationIds] },
          },
          suggestedNextActions: {
            type: "array",
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "rationale", "target", "citedRecordIds"],
              properties: {
                title: { type: "string" },
                rationale: { type: "string" },
                target: {
                  type: "string",
                  enum: ["brief", "quality", "canvas", "patterns", "review"],
                },
                citedRecordIds: {
                  type: "array",
                  items: { type: "string", enum: [...allowedCitationIds] },
                },
              },
            },
          },
        },
      },
    });
    const allowed = allowedCitationIds;
    const llmCandidate = finalizeAnswer(
      {
        answer: execution.value.answer,
        observations: execution.value.observations,
        recommendation: execution.value.recommendation,
        tradeOffs: execution.value.tradeOffs,
        clarifyingQuestions: execution.value.clarifyingQuestions,
        confidence: execution.value.confidence,
        contextSummary: fallback.contextSummary,
        citedRecordIds: execution.value.citedRecordIds.filter((id) =>
          allowed.has(id),
        ),
        suggestedNextActions: execution.value.suggestedNextActions.map(
          (item) => ({
            ...item,
            citedRecordIds: item.citedRecordIds.filter((id) => allowed.has(id)),
          }),
        ),
        modelTrace: {
          providerId: execution.providerId,
          model: execution.model,
          routeId: execution.routeId,
          fallbackUsed: execution.fallbackUsed,
          requestFingerprint: execution.requestFingerprint,
          ...(typeof execution.latencyMs === "number" ? { latencyMs: execution.latencyMs } : {}),
        },
        mode: "llm-assisted",
      },
      normalizedInput,
      context,
      knowledgeGrounding.allowedReferenceIds,
      { llmContribution: ["stage-specific interpretation", "alternative and trade-off drafting", "natural-language explanation"] },
    );
    if (llmCandidate.qualityReceipt.status === "failed" || llmCandidate.qualityReceipt.score < 72) {
      return finalizedFallback(
        `The governed LLM candidate was rejected by the Sol quality gate (${llmCandidate.qualityReceipt.score}/100).`,
        {
          providerId: execution.providerId,
          model: execution.model,
          routeId: execution.routeId,
          fallbackUsed: true,
          requestFingerprint: execution.requestFingerprint,
          ...(typeof execution.latencyMs === "number" ? { latencyMs: execution.latencyMs } : {}),
          qualityGateRejected: true,
          rejectedCandidateScore: llmCandidate.qualityReceipt.score,
          fallbackReason: llmCandidate.qualityReceipt.issues.join("; "),
        },
      );
    }
    return llmCandidate;
  } catch (error) {
    return finalizedFallback(
      error instanceof Error
        ? `Governed LLM route unavailable: ${error.message}`
        : "Governed LLM route unavailable.",
    );
  }
}
