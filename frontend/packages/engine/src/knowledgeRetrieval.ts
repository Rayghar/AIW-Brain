import { sprint78PatternCorpus, type ArchitectureProject, type KnowledgeLibrary, type PatternKnowledgeRecord, type KnowledgeDepthGrade } from '@aiw/domain';
import { assessKnowledgeRecordDepth } from './knowledgeQuality.js';

/**
 * Production-safe knowledge retrieval for design-time AI.
 *
 * Invariants:
 * - only records in the active approved knowledge release are eligible;
 * - candidate/discovery records never enter an advisor or audit evidence pack;
 * - record identifiers returned here form the deterministic citation whitelist;
 * - lexical retrieval is the offline fallback and can be replaced by a release-
 *   filtered pgvector query without changing the consumer contract.
 */

export interface RelevantRecordRef {
  id: string;
  name: string;
  recordType: string;
  score: number;
  snippet: string;
  releaseId: string;
  lifecycle: 'approved';
  depthScore: number;
  depthGrade: KnowledgeDepthGrade;
  primaryRecommendationEligible: boolean;
}

export interface RelevantKnowledge {
  knowledgeReleaseId: string;
  ids: string[];
  records: RelevantRecordRef[];
  digestLines: string[];
}

export interface KnowledgeRetrievalContext {
  selectedNodeId?: string;
  selectedEdgeId?: string;
}

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'with', 'on', 'is', 'are', 'be', 'by', 'as', 'at', 'that', 'this', 'it', 'from', 'must', 'should']);

function tokens(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2 && !STOP.has(token));
}

export function activeKnowledgeReleaseId(library: KnowledgeLibrary): string {
  if (library.knowledgeReleaseId) return library.knowledgeReleaseId;
  const counts = new Map<string, number>();
  for (const record of sprint78PatternCorpus) {
    if (record.lifecycle !== 'approved' || !record.review?.releaseId) continue;
    counts.set(record.review.releaseId, (counts.get(record.review.releaseId) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? 'UNPUBLISHED';
}

export function approvedPatternRecords(library: KnowledgeLibrary): PatternKnowledgeRecord[] {
  const releaseId = activeKnowledgeReleaseId(library);
  return sprint78PatternCorpus.filter((record) =>
    record.lifecycle === 'approved'
    && record.review?.releaseId === releaseId
    && record.evidence.length > 0
  );
}

export function buildDesignQueryTerms(project: ArchitectureProject, library: KnowledgeLibrary, context: KnowledgeRetrievalContext = {}): string[] {
  const attributeName = (id: string) => library.qualityAttributes.find((attribute) => attribute.id === id)?.name ?? id;
  const parts: string[] = [];
  for (const priority of project.qualityPriorities.filter((item) => item.weight >= 4)) parts.push(attributeName(priority.attributeId));
  for (const decision of project.styleDecisions.filter((item) => item.status === 'accepted')) {
    const record = library.architectureStyles.find((style) => style.id === decision.styleId);
    parts.push(record?.name ?? decision.styleId);
  }
  parts.push(project.activeStage);
  for (const node of project.nodes.filter((item) => item.stage === project.activeStage).slice(0, 25)) parts.push(node.kind, node.label, node.description ?? '', ...(node.tags ?? []));
  const selectedNode = context.selectedNodeId ? project.nodes.find((node) => node.id === context.selectedNodeId) : undefined;
  if (selectedNode) parts.push(selectedNode.kind, selectedNode.label, selectedNode.description ?? '', ...(selectedNode.tags ?? []));
  const selectedEdge = context.selectedEdgeId ? project.edges.find((edge) => edge.id === context.selectedEdgeId) : undefined;
  if (selectedEdge) {
    parts.push(selectedEdge.kind, selectedEdge.label ?? '');
    const source = project.nodes.find((node) => node.id === selectedEdge.sourceId);
    const target = project.nodes.find((node) => node.id === selectedEdge.targetId);
    if (source) parts.push(source.kind, source.label);
    if (target) parts.push(target.kind, target.label);
  }
  parts.push(...project.objectives.slice(0, 8), ...project.constraints.slice(0, 8), ...project.assumptions.slice(0, 5));
  parts.push(...(project.context.problemShapes ?? []), ...(project.context.dataClassifications ?? []), ...(project.context.regulatoryJurisdictions ?? []));
  if (project.context.workloadProfile) parts.push(project.context.workloadProfile);
  if (project.context.recoveryObjectives) parts.push(project.context.recoveryObjectives);
  return [...new Set(parts.flatMap(tokens))];
}

function recordText(record: PatternKnowledgeRecord): { primary: string; secondary: string } {
  return {
    primary: [record.name, ...record.aliases, record.category, ...record.tags].join(' '),
    secondary: [record.summary, record.problem, ...record.context, ...record.forces, ...record.applicabilityRules, ...record.exclusions, ...record.prerequisites, ...record.risks, ...record.mitigations].join(' '),
  };
}

export function scoreRecordRelevance(record: PatternKnowledgeRecord, terms: string[]): number {
  if (!terms.length) return 0;
  const { primary, secondary } = recordText(record);
  const primaryTokens = new Set(tokens(primary));
  const secondaryTokens = new Set(tokens(secondary));
  let score = 0;
  for (const term of terms) {
    if (primaryTokens.has(term)) score += 4;
    else if (secondaryTokens.has(term)) score += 1;
  }
  return score;
}

export function selectRelevantKnowledge(
  project: ArchitectureProject,
  library: KnowledgeLibrary,
  limit = 12,
  context: KnowledgeRetrievalContext = {},
): RelevantKnowledge {
  const releaseId = activeKnowledgeReleaseId(library);
  const terms = buildDesignQueryTerms(project, library, context);
  const approved = approvedPatternRecords(library);
  const acceptedIds = new Set([
    ...project.styleDecisions.filter((item) => item.status === 'accepted').map((item) => item.styleId),
    ...project.patternSelections.filter((item) => item.status === 'accepted' || item.status === 'considering').map((item) => item.patternId),
  ]);

  const scored = approved.map((record) => {
    const depth = assessKnowledgeRecordDepth(record);
    const relevance = scoreRecordRelevance(record, terms);
    const depthAdjustment = depth.grade === 'production-deep' ? 6 : depth.grade === 'production-supporting' ? 0 : -12;
    return { record, depth, anchored: acceptedIds.has(record.id), score: relevance + depthAdjustment };
  });

  const chosen = [
    ...scored.filter((item) => item.anchored && item.depth.grade !== 'needs-enrichment'),
    ...scored.filter((item) => !item.anchored && item.score > 0 && item.depth.grade !== 'needs-enrichment').sort((a, b) => Number(b.depth.primaryRecommendationEligible) - Number(a.depth.primaryRecommendationEligible) || b.score - a.score || a.record.id.localeCompare(b.record.id)),
  ].slice(0, Math.max(1, Math.min(limit, 50)));

  const records: RelevantRecordRef[] = chosen.map(({ record, score, anchored, depth }) => ({
    id: record.id,
    name: record.name,
    recordType: record.recordType,
    score: anchored ? score + 100 : score,
    snippet: String(record.summary || record.problem || record.category).slice(0, 180),
    releaseId,
    lifecycle: 'approved',
    depthScore: depth.score,
    depthGrade: depth.grade,
    primaryRecommendationEligible: depth.primaryRecommendationEligible,
  }));

  return {
    knowledgeReleaseId: releaseId,
    ids: records.map((item) => item.id),
    records,
    digestLines: records.map((item) => `${item.id} (${item.name}, approved ${item.releaseId}, depth ${item.depthScore}/${item.depthGrade}): ${item.snippet}`),
  };
}

export function resolveApprovedCitationIds(ids: string[], grounding: RelevantKnowledge): string[] {
  const allowed = new Set(grounding.ids);
  return [...new Set(ids.filter((id) => allowed.has(id)))];
}
