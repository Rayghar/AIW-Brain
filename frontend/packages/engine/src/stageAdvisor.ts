import { entityKinds, type ArchitectureProject, type ArchitectureStage, type KnowledgeLibrary } from '@aiw/domain';
import { resolveApprovedCitationIds, selectRelevantKnowledge, type RelevantKnowledge } from './knowledgeRetrieval.js';
import type { AiPrompt } from './aiContracts.js';

/**
 * LLM stage advisor. Deterministic guidance remains authoritative; this layer
 * adds bounded, release-grounded reasoning for the active stage and selected
 * node/edge. Every actionable item must cite a record from the supplied,
 * approved knowledge-release evidence pack.
 */

export interface StageAdviceInsight {
  title: string;
  detail: string;
  kbRef: string;
}

export interface SuggestedElement {
  kind: string;
  label: string;
  reason: string;
  kbRef: string;
}

export interface StageAdvice {
  insights: StageAdviceInsight[];
  suggestedElements: SuggestedElement[];
  counterfactual: string;
  knowledgeReleaseId: string;
  rejectedCitationCount: number;
}

export interface StageAdvisorContext {
  selectedNodeId?: string;
  selectedEdgeId?: string;
}

const ADVISABLE_STAGES: ArchitectureStage[] = [
  'logicalApplication',
  'applicationRealization',
  'logicalTechnology',
  'physicalTechnology',
];

export function stageSupportsAdvice(stage: ArchitectureStage): boolean {
  return ADVISABLE_STAGES.includes(stage);
}

const STAGE_FOCUS: Record<string, string> = {
  logicalApplication:
    'Critique domain and service boundaries, missing actors/events, unclear responsibility ownership and style-pattern fit. Provide one counterfactual that could change the leading style.',
  applicationRealization:
    'Review deployable granularity, team ownership, lineage to logical responsibilities, contract boundaries and data ownership. Counterfactual must be empty.',
  logicalTechnology:
    'Identify missing vendor-neutral capabilities and unresolved delivery semantics: ordering, retries, dead letters, consistency, observability, identity, secrets and recovery. Counterfactual must be empty.',
  physicalTechnology:
    'Review product bindings against residency, prohibited technology, vendor concentration, version lifecycle, regional availability and recovery obligations. Counterfactual must be empty.',
};

function modelDigest(project: ArchitectureProject, library: KnowledgeLibrary, context: StageAdvisorContext) {
  const stage = project.activeStage;
  const selectedNode = context.selectedNodeId ? project.nodes.find((node) => node.id === context.selectedNodeId) : undefined;
  const selectedEdge = context.selectedEdgeId ? project.edges.find((edge) => edge.id === context.selectedEdgeId) : undefined;
  const acceptedStyles = project.styleDecisions
    .filter((decision) => decision.status === 'accepted')
    .map((decision) => ({
      id: decision.styleId,
      name: library.architectureStyles.find((style) => style.id === decision.styleId)?.name ?? decision.styleId,
      scopeNodeId: decision.scopeNodeId,
    }));
  const acceptedPatterns = project.patternSelections
    .filter((selection) => selection.status === 'accepted' || selection.status === 'considering')
    .map((selection) => ({ id: selection.patternId, status: selection.status, scopeNodeId: selection.scopeNodeId }));
  const edgeCounts: Record<string, number> = {};
  for (const edge of project.edges) edgeCounts[edge.kind] = (edgeCounts[edge.kind] ?? 0) + 1;
  return {
    stage,
    drivers: project.qualityPriorities.filter((priority) => priority.weight > 0),
    measurableScenarios: project.qualityScenarios.slice(0, 10),
    context: project.context,
    acceptedStyles,
    acceptedPatterns,
    selectedNode: selectedNode ? { id: selectedNode.id, kind: selectedNode.kind, label: selectedNode.label, description: selectedNode.description, tags: selectedNode.tags, properties: selectedNode.properties } : null,
    selectedEdge: selectedEdge ? { id: selectedEdge.id, kind: selectedEdge.kind, label: selectedEdge.label, sourceId: selectedEdge.sourceId, targetId: selectedEdge.targetId, properties: selectedEdge.properties } : null,
    nodesInStage: project.nodes
      .filter((node) => node.stage === stage)
      .slice(0, 35)
      .map((node) => ({ id: node.id, kind: node.kind, label: node.label, lineage: (node.lineageFrom ?? []).length })),
    edgeCounts,
  };
}

export interface StageAdvisorPromptBundle {
  prompt: AiPrompt;
  grounding: RelevantKnowledge;
}

export function buildStageAdvisorPrompt(
  project: ArchitectureProject,
  library: KnowledgeLibrary,
  deterministicCardTitles: string[],
  context: StageAdvisorContext = {},
): StageAdvisorPromptBundle {
  const stage = project.activeStage;
  const model = modelDigest(project, library, context);
  const grounding = selectRelevantKnowledge(project, library, 16, context);
  const kbIds = grounding.ids;
  const prompt: AiPrompt = {
    purpose: 'architecture-reasoning',
    schemaName: 'stage_advice',
    system: [
      'You are the embedded stage advisor of an architecture design workbench.',
      'The deterministic rules engine and guide are authoritative; you add contextual reasoning only.',
      'Never repeat the deterministic guidance titles supplied. Never claim the design is complete or approved.',
      'Use only supplied canonical entity kinds and approved knowledge identifiers.',
      `Stage focus: ${STAGE_FOCUS[stage] ?? 'General architecture review.'}`,
      'Respond with ONLY minified JSON matching this structure:',
      '{"insights":[{"title":string,"detail":string,"kbRef":string}],"suggestedElements":[{"kind":string,"label":string,"reason":string,"kbRef":string}],"counterfactual":string}.',
      'Maximum 3 insights and 3 suggested elements. Every insight and every suggested element MUST cite exactly one allowed kbRef.',
      `Allowed kbRef values: ${JSON.stringify(kbIds)}.`,
      `Allowed entity kinds: ${JSON.stringify(entityKinds)}.`,
    ].join(' '),
    user: JSON.stringify({
      knowledgeReleaseId: grounding.knowledgeReleaseId,
      model,
      groundingRecords: grounding.digestLines,
      deterministicGuidanceAlreadyShown: deterministicCardTitles,
    }),
  };
  return { prompt, grounding };
}

export function sanitizeStageAdvice(raw: unknown, grounding: RelevantKnowledge): StageAdvice {
  const value = (raw ?? {}) as Record<string, unknown>;
  const kinds = new Set<string>(entityKinds as readonly string[]);
  let rejectedCitationCount = 0;

  const insights = (Array.isArray(value.insights) ? value.insights : [])
    .slice(0, 3)
    .map((item) => {
      const insight = (item ?? {}) as Record<string, unknown>;
      const requested = String(insight.kbRef ?? '').slice(0, 100);
      const valid = resolveApprovedCitationIds([requested], grounding)[0];
      if (!valid) rejectedCitationCount += 1;
      return {
        title: String(insight.title ?? '').slice(0, 90),
        detail: String(insight.detail ?? '').slice(0, 360),
        kbRef: valid ?? '',
      };
    })
    .filter((insight) => insight.title && insight.detail && insight.kbRef);

  const suggestedElements = (Array.isArray(value.suggestedElements) ? value.suggestedElements : [])
    .slice(0, 3)
    .map((item) => {
      const element = (item ?? {}) as Record<string, unknown>;
      const requested = String(element.kbRef ?? '').slice(0, 100);
      const valid = resolveApprovedCitationIds([requested], grounding)[0];
      if (!valid) rejectedCitationCount += 1;
      return {
        kind: String(element.kind ?? ''),
        label: String(element.label ?? '').slice(0, 60),
        reason: String(element.reason ?? '').slice(0, 240),
        kbRef: valid ?? '',
      };
    })
    .filter((element) => kinds.has(element.kind) && element.label.length > 0 && element.kbRef);

  return {
    insights,
    suggestedElements,
    counterfactual: String(value.counterfactual ?? '').slice(0, 360),
    knowledgeReleaseId: grounding.knowledgeReleaseId,
    rejectedCitationCount,
  };
}
