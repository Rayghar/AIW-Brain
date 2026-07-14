import type { ArchitectureProject, KnowledgeLibrary } from '@aiw/domain';
import {
  buildRankingExplanationPrompt,
  sanitizeRankingExplanation,
  recommendArchitectureStyles,
  buildStageAdvisorPrompt,
  sanitizeStageAdvice,
  stageSupportsAdvice,
  deriveDesignGuidance,
  recommendInContext,
  validateProject,
  type RankingExplanation,
  type StageAdvice,
  type StageAdvisorContext,
} from '@aiw/engine';
import type { LlmGateway } from './llmGateway.js';
import { buildApprovedKnowledgeGroundingPack } from './approvedKnowledgeGrounding.js';

export interface DesignAssistResult<T> {
  available: boolean;
  degradedReason?: string;
  result?: T;
  routeId?: string;
  providerId?: string;
  model?: string;
  fallbackUsed?: boolean;
  requestFingerprint?: string;
}

export async function explainStyleRanking(
  gateway: LlmGateway,
  project: ArchitectureProject,
  library: KnowledgeLibrary,
): Promise<DesignAssistResult<RankingExplanation & { rankingTop3: Array<{ styleId: string; styleName: string; score: number }> }>> {
  const ranking = recommendArchitectureStyles(project, library)
    .filter((item) => item.eligible)
    .slice(0, 3)
    .map((item) => ({ styleId: item.styleId, styleName: item.styleName, score: item.score, tradeoffs: item.tradeoffs }));
  const prompt = buildRankingExplanationPrompt({ drivers: project.qualityPriorities.filter((priority) => priority.weight > 0), ranking });
  try {
    const execution = await gateway.generateJson<unknown>({
      purpose: prompt.purpose, system: prompt.system, user: prompt.user, schemaName: prompt.schemaName, dataClassification: 'internal',
      jsonSchema: { type: 'object', additionalProperties: false, required: ['explanation','counterfactual'], properties: { explanation: { type: 'string', minLength: 1, maxLength: 900 }, counterfactual: { type: 'string', maxLength: 300 } } },
    });
    const sanitized = sanitizeRankingExplanation(execution.value);
    return {
      available: true,
      result: { ...sanitized, rankingTop3: ranking.map(({ styleId, styleName, score }) => ({ styleId, styleName, score })) },
      routeId: execution.routeId,
      providerId: execution.providerId,
      model: execution.model,
      fallbackUsed: execution.fallbackUsed,
      requestFingerprint: execution.requestFingerprint,
    };
  } catch (error) {
    return { available: false, degradedReason: error instanceof Error ? error.message : 'LLM_UNAVAILABLE' };
  }
}

export async function adviseStage(
  gateway: LlmGateway,
  project: ArchitectureProject,
  library: KnowledgeLibrary,
  context: StageAdvisorContext = {},
): Promise<DesignAssistResult<StageAdvice & { stage: string }>> {
  if (!stageSupportsAdvice(project.activeStage)) return { available: false, degradedReason: 'STAGE_NOT_ADVISABLE' };
  const contextual = recommendInContext(project, library, { stage: project.activeStage, scopeNodeId: context.selectedNodeId, trigger: 'scope-change' });
  const findings = validateProject(project, library);
  const deterministicTitles = deriveDesignGuidance(project, library, contextual, findings, context.selectedNodeId)
    .map((item) => item.title);
  const bundle = buildStageAdvisorPrompt(project, library, deterministicTitles, context);
  const grounding = buildApprovedKnowledgeGroundingPack({ activeKnowledgeReleaseId: bundle.grounding.knowledgeReleaseId, recordIds: bundle.grounding.ids });
  try {
    const execution = await gateway.generateJson<unknown>({
      purpose: bundle.prompt.purpose, system: bundle.prompt.system,
      user: JSON.stringify({ prompt: JSON.parse(bundle.prompt.user), approvedClaimGrounding: grounding.sources }),
      schemaName: bundle.prompt.schemaName, dataClassification: 'internal',
      grounding: { allowedReferenceIds: bundle.grounding.ids, sources: grounding.sources, requireCitations: true, minimumSupportScore: 0.05 },
      jsonSchema: {
        type: 'object', additionalProperties: false, required: ['insights','suggestedElements','counterfactual'],
        properties: {
          insights: { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['title','detail','kbRef'], properties: { title: { type: 'string', minLength: 1, maxLength: 90 }, detail: { type: 'string', minLength: 1, maxLength: 360 }, kbRef: { type: 'string', enum: bundle.grounding.ids } } } },
          suggestedElements: { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['kind','label','reason','kbRef'], properties: { kind: { type: 'string' }, label: { type: 'string', minLength: 1, maxLength: 60 }, reason: { type: 'string', minLength: 1, maxLength: 240 }, kbRef: { type: 'string', enum: bundle.grounding.ids } } } },
          counterfactual: { type: 'string', maxLength: 360 },
        },
      },
    });
    return {
      available: true,
      result: { ...sanitizeStageAdvice(execution.value, bundle.grounding), stage: project.activeStage },
      routeId: execution.routeId,
      providerId: execution.providerId,
      model: execution.model,
      fallbackUsed: execution.fallbackUsed,
      requestFingerprint: execution.requestFingerprint,
    };
  } catch (error) {
    return { available: false, degradedReason: error instanceof Error ? error.message : 'LLM_UNAVAILABLE' };
  }
}
