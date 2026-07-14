import type {
  ArchitectureProject,
  LlmCoCreationAlternative,
  LlmCoCreationClarification,
  LlmCoCreationProposal,
  LivingCanvasActionEnvelope,
  LivingCanvasAssistance,
} from '@aiw/domain';
import { compileGovernedLlmAlternatives } from '@aiw/engine';
import type { JsonGenerationRequest, LlmExecutionResult } from './llmGateway.js';

interface LlmJsonGateway {
  generateJson<T>(request: JsonGenerationRequest): Promise<LlmExecutionResult<T>>;
}

function boundedText(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

function boundedList(value: unknown, maxItems: number, maxLength = 260): string[] {
  return [...new Set((Array.isArray(value) ? value : []).map((item) => boundedText(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function boundedConfidence(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0.5;
}

function sanitizeProposal(raw: unknown, envelope: LivingCanvasActionEnvelope): LlmCoCreationProposal {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const allowedKeys = new Set(envelope.actions.filter((action) => action.eligibility.eligible).map((action) => action.semanticKey));
  const allowedRecordIds = new Set(envelope.actions.flatMap((action) => [
    ...action.patternRefs,
    ...action.knowledgeClaimRefs,
    ...action.evidenceRefs,
    ...action.explanation.basedOn,
  ]));

  const clarifications: LlmCoCreationClarification[] = (Array.isArray(source.clarifications) ? source.clarifications : [])
    .slice(0, 5)
    .map((item, index) => {
      const entry = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      return {
        id: boundedText(entry.id, 80) || `llm-clarification-${index + 1}`,
        question: boundedText(entry.question, 320),
        whyItMatters: boundedText(entry.whyItMatters, 420),
        relatedRequirementRefs: boundedList(entry.relatedRequirementRefs, 8, 100).filter((id) => envelope.context.requirements.some((requirement) => requirement.id === id)),
        blocking: Boolean(entry.blocking),
      };
    })
    .filter((item) => item.question && item.whyItMatters);

  const alternatives: LlmCoCreationAlternative[] = (Array.isArray(source.alternatives) ? source.alternatives : [])
    .slice(0, 3)
    .map((item, index) => {
      const entry = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      return {
        id: boundedText(entry.id, 80) || `llm-alternative-${index + 1}`,
        title: boundedText(entry.title, 140),
        summary: boundedText(entry.summary, 420),
        selectedActionSemanticKeys: boundedList(entry.selectedActionSemanticKeys, 5, 180).filter((key) => allowedKeys.has(key)),
        rationale: boundedText(entry.rationale, 700),
        tradeOffs: boundedList(entry.tradeOffs, 6, 260),
        omittedConsequences: boundedList(entry.omittedConsequences, 4, 260),
        citedRecordIds: boundedList(entry.citedRecordIds, 10, 160).filter((id) => allowedRecordIds.has(id)),
        confidence: boundedConfidence(entry.confidence),
      };
    })
    .filter((item) => item.title && item.summary && item.rationale && item.selectedActionSemanticKeys.length > 0);

  const rankAdjustments = (Array.isArray(source.rankAdjustments) ? source.rankAdjustments : [])
    .slice(0, 8)
    .map((item) => {
      const entry = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      return {
        actionSemanticKey: boundedText(entry.actionSemanticKey, 180),
        delta: Math.max(-20, Math.min(20, Math.round(Number(entry.delta) || 0))),
        reason: boundedText(entry.reason, 320),
      };
    })
    .filter((item) => allowedKeys.has(item.actionSemanticKey) && item.reason);

  const knowledgeGapSignals = (Array.isArray(source.knowledgeGapSignals) ? source.knowledgeGapSignals : [])
    .slice(0, 5)
    .map((item) => {
      const entry = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      return {
        topic: boundedText(entry.topic, 160),
        reason: boundedText(entry.reason, 420),
        suggestedSourceType: boundedText(entry.suggestedSourceType, 120),
      };
    })
    .filter((item) => item.topic && item.reason);

  return {
    schemaVersion: '1.0',
    taskKind: alternatives.length ? 'compose-local-alternatives' : clarifications.length ? 'clarify-intent' : 'rank-next-actions',
    clarifications,
    alternatives,
    rankAdjustments,
    knowledgeGapSignals,
  };
}

function compactContext(project: ArchitectureProject, envelope: LivingCanvasActionEnvelope) {
  return {
    project: {
      name: project.name,
      description: project.description,
      objectives: project.objectives.slice(0, 12),
      constraints: project.constraints.slice(0, 12),
      assumptions: project.assumptions.slice(0, 8),
      activeStage: project.activeStage,
      revision: project.revision,
    },
    context: {
      sourceStage: envelope.context.stage,
      targetStage: envelope.context.targetStage,
      selectedScope: envelope.context.selectedScope ? {
        id: envelope.context.selectedScope.scopeId,
        kind: envelope.context.selectedScope.kind,
        label: envelope.context.selectedScope.label,
        properties: envelope.context.selectedScope.properties,
      } : null,
      requirements: envelope.context.requirements.slice(0, 12),
      qualityScenarios: envelope.context.qualityScenarios.slice(0, 10),
      designForces: envelope.context.designForces.slice(0, 10),
      acceptedStyles: envelope.context.acceptedStyleIds,
      acceptedPatterns: envelope.context.acceptedPatternIds,
      unresolvedScopes: envelope.context.unresolvedUpstreamScopeIds.slice(0, 15),
      recentOutcomes: envelope.context.recentOutcomeHistory.slice(-20),
      activeKnowledgeReleaseId: envelope.context.activeKnowledgeReleaseId,
    },
    deterministicActions: envelope.actions.map((action) => ({
      semanticKey: action.semanticKey,
      label: action.label,
      description: action.shortDescription,
      targetScopeId: action.targetScopeId,
      authorityClass: action.authorityClass,
      eligible: action.eligibility.eligible,
      prerequisites: action.eligibility.prerequisites,
      whyNow: action.explanation.whyNow,
      whyHere: action.explanation.whyHere,
      basedOn: action.explanation.basedOn,
      patterns: action.patternRefs,
      qualityEffects: action.qualityEffects,
      obligations: action.obligations,
      risks: action.risks,
      operationTypes: action.mutationSet.operations.map((operation) => operation.type),
    })),
  };
}

const proposalSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['taskKind', 'clarifications', 'alternatives', 'rankAdjustments', 'knowledgeGapSignals'],
  properties: {
    taskKind: { type: 'string', enum: ['clarify-intent', 'rank-next-actions', 'compose-local-alternatives', 'explain-trade-offs', 'identify-knowledge-gap'] },
    clarifications: { type: 'array', maxItems: 5, items: { type: 'object', additionalProperties: false, required: ['id', 'question', 'whyItMatters', 'relatedRequirementRefs', 'blocking'], properties: { id: { type: 'string' }, question: { type: 'string' }, whyItMatters: { type: 'string' }, relatedRequirementRefs: { type: 'array', maxItems: 8, items: { type: 'string' } }, blocking: { type: 'boolean' } } } },
    alternatives: { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['id', 'title', 'summary', 'selectedActionSemanticKeys', 'rationale', 'tradeOffs', 'omittedConsequences', 'citedRecordIds', 'confidence'], properties: { id: { type: 'string' }, title: { type: 'string' }, summary: { type: 'string' }, selectedActionSemanticKeys: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string' } }, rationale: { type: 'string' }, tradeOffs: { type: 'array', maxItems: 6, items: { type: 'string' } }, omittedConsequences: { type: 'array', maxItems: 4, items: { type: 'string' } }, citedRecordIds: { type: 'array', maxItems: 10, items: { type: 'string' } }, confidence: { type: 'number', minimum: 0, maximum: 1 } } } },
    rankAdjustments: { type: 'array', maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['actionSemanticKey', 'delta', 'reason'], properties: { actionSemanticKey: { type: 'string' }, delta: { type: 'number', minimum: -20, maximum: 20 }, reason: { type: 'string' } } } },
    knowledgeGapSignals: { type: 'array', maxItems: 5, items: { type: 'object', additionalProperties: false, required: ['topic', 'reason', 'suggestedSourceType'], properties: { topic: { type: 'string' }, reason: { type: 'string' }, suggestedSourceType: { type: 'string' } } } },
  },
} as const;

export async function enrichLivingCanvasWithGovernedLlm(input: {
  project: ArchitectureProject;
  envelope: LivingCanvasActionEnvelope;
  gateway: LlmJsonGateway;
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
}): Promise<LivingCanvasActionEnvelope> {
  if (!input.envelope.actions.some((action) => action.eligibility.eligible)) return {
    ...input.envelope,
    assistance: { mode: 'deterministic', clarifications: [], knowledgeGapSignals: [], notice: 'No eligible canonical action is available for LLM ranking or composition.' },
  };

  try {
    const result = await input.gateway.generateJson<LlmCoCreationProposal>({
      purpose: 'architecture-reasoning',
      schemaName: 'aiw_governed_living_canvas_co_creation_v1',
      dataClassification: input.dataClassification ?? 'internal',
      system: [
        'You are Sol, the governed AIW architecture co-creation reasoner.',
        'You may clarify, rank, and bundle ONLY the deterministic action semantic keys supplied in the request.',
        'Never invent canonical objects, identifiers, mutation operations, pattern IDs, evidence IDs or source claims.',
        'A proposed alternative must reference one or more supplied eligible action semantic keys.',
        'Preserve uncertainty as clarification questions. Explain trade-offs concisely.',
        'Return only valid JSON matching the schema.',
      ].join(' '),
      user: JSON.stringify(compactContext(input.project, input.envelope)),
      jsonSchema: proposalSchema as unknown as Record<string, unknown>,
    });
    const proposal = sanitizeProposal(result.value, input.envelope);
    const actions = compileGovernedLlmAlternatives({ project: input.project, envelope: input.envelope, proposal });
    const assistance: LivingCanvasAssistance = {
      mode: 'llm-assisted',
      clarifications: proposal.clarifications,
      knowledgeGapSignals: proposal.knowledgeGapSignals,
      trace: {
        providerId: result.providerId,
        model: result.model,
        routeId: result.routeId,
        requestFingerprint: result.requestFingerprint,
        latencyMs: result.latencyMs,
        fallbackUsed: result.fallbackUsed,
        activeKnowledgeReleaseId: input.envelope.context.activeKnowledgeReleaseId,
      },
      notice: actions.some((action) => action.authorityClass === 'llm-proposed')
        ? 'Sol assembled reviewable alternatives from canonically eligible actions. The model authored no canonical mutations.'
        : 'Sol refined the deterministic ranking and identified clarification or knowledge gaps.',
    };
    return { ...input.envelope, actions, deterministicOnly: false, assistance };
  } catch (error) {
    return {
      ...input.envelope,
      deterministicOnly: true,
      assistance: {
        mode: 'deterministic-fallback',
        clarifications: [],
        knowledgeGapSignals: [],
        notice: `Governed LLM assistance was unavailable. Deterministic design guidance remains active${error instanceof Error ? ` (${error.message.split(':')[0]})` : ''}.`,
      },
    };
  }
}
