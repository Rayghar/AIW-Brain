import type {
  ArchitectureProject,
  ContextualRecommendationBundle,
  DecisionSuggestion,
  KnowledgeLibrary,
  PatternRecommendation,
  PatternRecord,
  RecommendationContext,
} from '@aiw/domain';
import { recommendArchitectureStyles } from './recommendation.js';

const stageOrder = [
  'designIntent',
  'logicalApplication',
  'applicationRealization',
  'logicalTechnology',
  'physicalTechnology',
  'validationRealization',
] as const;

function acceptedStyleIds(project: ArchitectureProject, context: RecommendationContext): Set<string> {
  return new Set(project.styleDecisions
    .filter((item) => item.status === 'accepted')
    .filter((item) => !item.scopeNodeId || !context.scopeNodeId || item.scopeNodeId === context.scopeNodeId || context.stage !== 'logicalApplication')
    .map((item) => item.styleId));
}

function selectedPatternIds(project: ArchitectureProject): Set<string> {
  return new Set(project.patternSelections
    .filter((item) => item.status === 'accepted' || item.status === 'considering')
    .map((item) => item.patternId));
}

function hasHighPriority(project: ArchitectureProject, ...attributes: string[]): boolean {
  return project.qualityPriorities.some((item) => attributes.includes(item.attributeId) && item.weight >= 4);
}

function graphSignals(project: ArchitectureProject, context: RecommendationContext): Set<string> {
  const signals = new Set<string>();
  const scopedNode = context.scopeNodeId ? project.nodes.find((node) => node.id === context.scopeNodeId) : undefined;
  const stageNodes = project.nodes.filter((node) => node.stage === context.stage);
  const relevantNodes = scopedNode ? [scopedNode] : stageNodes;
  const text = relevantNodes.flatMap((node) => [node.label, node.kind, ...node.tags]).join(' ').toLowerCase();

  if (project.edges.some((edge) => edge.properties.protocolStyle === 'asynchronous' || edge.kind === 'publishes' || edge.kind === 'subscribes')) signals.add('asynchronous');
  if (project.edges.some((edge) => edge.properties.protocolStyle === 'synchronous' || edge.kind === 'communicatesWith')) signals.add('synchronous');
  if (project.nodes.some((node) => node.kind === 'DeployableUnit' && node.properties.public === true)) signals.add('public-boundary');
  if (/api|gateway|endpoint|web|mobile/.test(text)) signals.add('api');
  if (/database|data|store|postgres|sql|document|cache/.test(text)) signals.add('data');
  if (/legacy|mainframe|existing/.test(text) || project.constraints.some((item) => /legacy|moderni/i.test(item))) signals.add('modernization');
  if (/worker|queue|event|broker|stream/.test(text)) signals.add('messaging');
  if (/external|payment|provider|partner/.test(text)) signals.add('external-dependency');
  if (context.stage === 'physicalTechnology') signals.add('deployment');
  if (hasHighPriority(project, 'availability', 'faultTolerance', 'recoverability')) signals.add('resilience');
  if (hasHighPriority(project, 'security', 'privacy')) signals.add('security');
  if (hasHighPriority(project, 'scalability', 'elasticity')) signals.add('scale');
  if (project.context.regulatoryExposure === 'high') signals.add('regulated');
  return signals;
}

const patternSignalMap: Record<string, string[]> = {
  'PAT-API-GATEWAY': ['api', 'public-boundary'],
  'PAT-BFF': ['api'],
  'PAT-HEXAGONAL': ['external-dependency', 'modularity'],
  'PAT-CLEAN': ['modularity'],
  'PAT-STRANGLER': ['modernization'],
  'PAT-ANTI-CORRUPTION': ['modernization', 'external-dependency'],
  'PAT-SAGA': ['asynchronous', 'data'],
  'PAT-OUTBOX': ['asynchronous', 'data', 'messaging'],
  'PAT-CQRS': ['asynchronous', 'scale', 'data'],
  'PAT-EVENT-SOURCING': ['asynchronous', 'data'],
  'PAT-IDEMPOTENT': ['asynchronous', 'messaging'],
  'PAT-DLQ': ['asynchronous', 'messaging', 'resilience'],
  'PAT-CIRCUIT-BREAKER': ['external-dependency', 'resilience', 'synchronous'],
  'PAT-RETRY': ['external-dependency', 'resilience'],
  'PAT-BULKHEAD': ['resilience', 'scale'],
  'PAT-RATE-LIMITER': ['public-boundary', 'api', 'resilience'],
  'PAT-CACHE-ASIDE': ['data', 'scale'],
  'PAT-DB-PER-SERVICE': ['data', 'scale'],
  'PAT-SHARED-DB': ['data'],
  'PAT-SIDECAR': ['deployment'],
  'PAT-AMBASSADOR': ['deployment', 'external-dependency'],
  'PAT-SERVICE-MESH': ['deployment', 'scale'],
  'PAT-BLUE-GREEN': ['deployment', 'resilience'],
  'PAT-CANARY': ['deployment', 'resilience'],
  'PAT-CELL-BASED': ['deployment', 'resilience', 'scale'],
  'PAT-ACTIVE-ACTIVE': ['deployment', 'resilience'],
  'PAT-ACTIVE-PASSIVE': ['deployment', 'resilience'],
  'PAT-ZERO-TRUST': ['security', 'regulated', 'public-boundary'],
  'PAT-SECRETS': ['security', 'regulated', 'deployment'],
  'PAT-OBSERVABILITY': ['deployment', 'resilience', 'regulated'],
};

function recommendationStatus(project: ArchitectureProject, patternId: string): PatternRecommendation['status'] {
  const selection = project.patternSelections.find((item) => item.patternId === patternId && item.status !== 'superseded');
  if (!selection) return 'not-selected';
  if (selection.status === 'accepted') return 'accepted';
  if (selection.status === 'considering') return 'considering';
  return 'not-selected';
}

function patternRecommendation(
  pattern: PatternRecord,
  project: ArchitectureProject,
  context: RecommendationContext,
  styles: Set<string>,
  patterns: Set<string>,
  signals: Set<string>,
): PatternRecommendation {
  let score = pattern.applicableStages.includes(context.stage) ? 35 : 5;
  const reasons: string[] = [];
  const tradeoffs: string[] = [...pattern.risks];
  const conflicts = pattern.conflictsWith.filter((id) => patterns.has(id));
  const unmetPrerequisites = pattern.requires.filter((id) => !patterns.has(id) && !styles.has(id));

  const pairedStyles = pattern.pairsWellWith.filter((id) => styles.has(id));
  const pairedPatterns = pattern.pairsWellWith.filter((id) => patterns.has(id));
  if (pairedStyles.length) {
    score += 28;
    reasons.push(`Complements the selected style ${pairedStyles.join(', ')}.`);
  }
  if (pairedPatterns.length) {
    score += 14;
    reasons.push(`Combines well with ${pairedPatterns.join(', ')}.`);
  }

  const matchedSignals = (patternSignalMap[pattern.id] ?? []).filter((signal) => signals.has(signal));
  if (matchedSignals.length) {
    score += Math.min(30, matchedSignals.length * 10);
    reasons.push(`Relevant to current design signals: ${matchedSignals.join(', ')}.`);
  }

  const selectionStatus = recommendationStatus(project, pattern.id);
  if (selectionStatus === 'accepted') {
    score = 100;
    reasons.unshift('Already accepted in the current architecture baseline.');
  } else if (selectionStatus === 'considering') {
    score = Math.max(score, 88);
    reasons.unshift('Currently being considered by the architect.');
  }

  if (unmetPrerequisites.length) {
    score -= unmetPrerequisites.length * 12;
    tradeoffs.push(`Unmet prerequisites: ${unmetPrerequisites.join(', ')}.`);
  }
  if (conflicts.length) score -= 55;

  if (reasons.length === 0) reasons.push('Applicable to this architecture stage, but no strong contextual signal has been detected yet.');

  return {
    patternId: pattern.id,
    patternName: pattern.name,
    category: pattern.category,
    score: Math.max(0, Math.min(100, Math.round(score))),
    eligible: conflicts.length === 0,
    status: conflicts.length ? 'conflicting' : selectionStatus,
    reasons,
    tradeoffs: tradeoffs.slice(0, 4),
    obligations: pattern.obligations,
    unmetPrerequisites,
    conflicts,
    scopeNodeId: context.scopeNodeId,
  };
}

function makeDecisionSuggestions(
  project: ArchitectureProject,
  library: KnowledgeLibrary,
  context: RecommendationContext,
  topPatterns: PatternRecommendation[],
): DecisionSuggestion[] {
  const decisions: DecisionSuggestion[] = [];
  const acceptedStyles = project.styleDecisions.filter((item) => item.status === 'accepted' && item.stage === context.stage);
  const styleRanking = recommendArchitectureStyles(project, library).filter((item) => item.eligible);
  const topStyle = styleRanking[0];

  if (context.stage === 'logicalApplication' && acceptedStyles.length === 0 && topStyle) {
    decisions.push({
      id: `decision-style-${topStyle.styleId}-${context.scopeNodeId ?? 'view'}`,
      title: `Select the architecture style for ${context.scopeNodeId ? 'the selected scope' : 'this logical application view'}`,
      stage: context.stage,
      scopeNodeId: context.scopeNodeId,
      context: 'Quality attributes and delivery constraints have been captured, but the architecture style is not yet recorded for this scope.',
      recommendedDecision: `Adopt ${topStyle.styleName} as the current leading style, subject to the stated trade-offs and obligations.`,
      drivers: [...topStyle.strengths, ...project.objectives.slice(0, 2)],
      consideredOptions: styleRanking.slice(0, 4).map((item) => item.styleName),
      consequences: [...topStyle.tradeoffs, ...topStyle.obligations.slice(0, 3)],
      linkedRecordIds: [topStyle.styleId],
      priority: 'high',
    });
  }

  const hasAsync = project.edges.some((edge) => edge.kind === 'publishes' || edge.kind === 'subscribes' || edge.properties.protocolStyle === 'asynchronous');
  if (hasAsync && !project.decisions.some((item) => item.linkedRecordIds?.includes('DECISION-ASYNC-DELIVERY'))) {
    decisions.push({
      id: 'decision-async-delivery-semantics',
      title: 'Define asynchronous delivery and failure semantics',
      stage: context.stage,
      scopeNodeId: context.scopeNodeId,
      context: 'The model contains asynchronous interactions whose delivery, duplicate-handling and failure semantics must be explicit.',
      recommendedDecision: 'Use at-least-once delivery with idempotent consumers, schema versioning, retry policy and dead-letter handling unless a stricter requirement is documented.',
      drivers: ['Reliability', 'Recoverability', 'Auditability'],
      consideredOptions: ['At-most-once', 'At-least-once', 'Effectively-once through application controls'],
      consequences: ['Consumers must be idempotent.', 'Duplicate events remain possible.', 'Operational monitoring and replay procedures are required.'],
      linkedRecordIds: ['DECISION-ASYNC-DELIVERY', 'PAT-IDEMPOTENT', 'PAT-DLQ'],
      priority: 'high',
    });
  }

  if (context.stage === 'applicationRealization' && project.nodes.some((node) => node.stage === 'applicationRealization')) {
    decisions.push({
      id: `decision-realization-boundary-${context.scopeNodeId ?? 'view'}`,
      title: 'Confirm deployable boundaries and ownership',
      stage: context.stage,
      scopeNodeId: context.scopeNodeId,
      context: 'Logical responsibilities are being allocated into deployable units. The allocation affects release independence, data ownership and operating cost.',
      recommendedDecision: 'Document why each logical service is grouped into or separated across deployable units and identify the owning team.',
      drivers: ['Deployability', 'Modifiability', 'Team autonomy', 'Operational simplicity'],
      consideredOptions: ['Single deployable', 'Module within a modular monolith', 'Independent service', 'Worker or function'],
      consequences: ['More deployables increase operational overhead.', 'Fewer deployables reduce independent release flexibility.'],
      linkedRecordIds: topPatterns.slice(0, 3).map((item) => item.patternId),
      priority: 'medium',
    });
  }

  if (context.stage === 'logicalTechnology') {
    decisions.push({
      id: `decision-logical-tech-${context.scopeNodeId ?? 'view'}`,
      title: 'Select logical technology capabilities without premature vendor binding',
      stage: context.stage,
      scopeNodeId: context.scopeNodeId,
      context: 'Application interactions must now be supported by vendor-neutral data, integration, identity, observability and runtime capabilities.',
      recommendedDecision: 'Record the required capability, service-level expectations and failure responsibilities before choosing a product.',
      drivers: ['Portability', 'Interoperability', 'Availability', 'Cost efficiency'],
      consideredOptions: ['Managed capability', 'Self-hosted capability', 'Shared enterprise platform', 'Application-owned platform'],
      consequences: ['Logical requirements become the acceptance criteria for later product selection.'],
      linkedRecordIds: topPatterns.slice(0, 4).map((item) => item.patternId),
      priority: 'medium',
    });
  }

  if (context.stage === 'physicalTechnology' && hasHighPriority(project, 'availability', 'recoverability')) {
    decisions.push({
      id: `decision-failure-domain-${context.scopeNodeId ?? 'view'}`,
      title: 'Record deployment failure-domain and recovery strategy',
      stage: context.stage,
      scopeNodeId: context.scopeNodeId,
      context: 'High availability or recoverability is a priority and must be realized through explicit deployment topology.',
      recommendedDecision: 'Choose the number of replicas, zones or sites, recovery mode, backup policy and failover ownership for each critical component.',
      drivers: ['Availability', 'Recoverability', 'Operational readiness'],
      consideredOptions: ['Single-zone with restore', 'Active-passive', 'Active-active', 'Cell-based isolation'],
      consequences: ['Higher resilience increases cost and operational complexity.', 'Recovery procedures require regular testing.'],
      linkedRecordIds: ['PAT-ACTIVE-PASSIVE', 'PAT-ACTIVE-ACTIVE', 'PAT-CELL-BASED'],
      priority: 'high',
    });
  }

  return decisions.filter((suggestion) => !project.decisions.some((decision) => decision.title === suggestion.title && decision.status === 'accepted'));
}

export function recommendInContext(
  project: ArchitectureProject,
  library: KnowledgeLibrary,
  context: RecommendationContext,
): ContextualRecommendationBundle {
  const styles = recommendArchitectureStyles(project, library);
  const acceptedStyles = acceptedStyleIds(project, context);
  const selectedPatterns = selectedPatternIds(project);
  const signals = graphSignals(project, context);

  const patterns = library.patterns
    .filter((pattern) => pattern.applicableStages.includes(context.stage) || selectedPatterns.has(pattern.id))
    .map((pattern) => patternRecommendation(pattern, project, context, acceptedStyles, selectedPatterns, signals))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.patternName.localeCompare(b.patternName));

  const obligations = [
    ...project.styleDecisions.filter((item) => item.status === 'accepted').flatMap((selection) => {
      const record = library.architectureStyles.find((item) => item.id === selection.styleId);
      return (record?.obligations ?? []).map((obligation) => ({
        sourceRecordId: selection.styleId,
        sourceName: record?.name ?? selection.styleId,
        obligation,
        satisfied: project.decisions.some((decision) => decision.linkedRecordIds?.includes(selection.styleId) && decision.consequences.includes(obligation)),
      }));
    }),
    ...project.patternSelections.filter((item) => item.status === 'accepted' || item.status === 'considering').flatMap((selection) => {
      const record = library.patterns.find((item) => item.id === selection.patternId);
      return (record?.obligations ?? []).map((obligation) => ({
        sourceRecordId: selection.patternId,
        sourceName: record?.name ?? selection.patternId,
        obligation,
        satisfied: selection.obligationsAcknowledged.includes(obligation),
      }));
    }),
  ];

  const decisions = makeDecisionSuggestions(project, library, context, patterns.slice(0, 6));
  const scopeName = context.scopeNodeId ? project.nodes.find((node) => node.id === context.scopeNodeId)?.label : undefined;
  const warnings = patterns.filter((item) => item.conflicts.length > 0).map((item) => `${item.patternName} conflicts with ${item.conflicts.join(', ')}.`);

  return {
    generatedAt: new Date().toISOString(),
    context,
    headline: scopeName
      ? `Recommendations updated for ${scopeName} in ${context.stage}.`
      : `Recommendations updated for the ${context.stage} view.`,
    styles,
    patterns,
    decisions,
    obligations,
    warnings,
  };
}

export function previousDesignStage(stage: RecommendationContext['stage']): RecommendationContext['stage'] | null {
  const index = stageOrder.indexOf(stage);
  if (index <= 1) return index === 1 ? 'designIntent' : null;
  return stageOrder[index - 1] ?? null;
}
