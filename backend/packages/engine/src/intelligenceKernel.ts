import type {
  ArchitectureProject,
  DesignGuidanceItem,
  Finding,
  KnowledgeLibrary,
  RecommendationContext,
  RelationshipKind,
} from '@aiw/domain';
import { deriveDesignGuidance } from './designGuidance.js';
import { selectRelevantKnowledge } from './knowledgeRetrieval.js';
import { recommendArchitectureStyles } from './recommendation.js';
import { recommendInContext } from './contextualRecommendations.js';
import {
  contextualLibrary,
  computeCanvasCompliance,
  getSemanticConnectionOptions,
} from './designCanvas.js';
import { analyseImpact } from './impact.js';
import { analyseArchitectureGraph } from './graphAnalysis.js';
import { simulateQualityScenarios } from './scenarioSimulation.js';
import { adviseTactics, type Tactic } from './tacticsAdvisor.js';
import { determineIterationPhase, checkStyleDecisionReadiness } from './decisionReadiness.js';
import { runVerificationMethod } from './verificationMethod.js';
import { validateProject } from './validation.js';

// =============================================================================
// EMBEDDED ARCHITECTURE INTELLIGENCE KERNEL — v0.9.9
//
// Every meaningful design interaction is represented as an ArchitectureEvent and
// evaluated against the same canonical project, approved knowledge release and
// deterministic invariants. The Design Studio is a projection of the response;
// intelligence is not a separate chatbot or a swarm of visible agents.
//
// Authority boundary:
//   * invariants, policy, scoring, eligibility and mutation safety are code;
//   * architectural judgment is retrieved from the active governed release;
//   * an LLM may enrich language at the API boundary, never architectural truth;
//   * user outcomes may tune ranking/presentation, never rewrite knowledge.
// =============================================================================

export type ArchitectureEventKind =
  | 'object-added'
  | 'object-removed'
  | 'attribute-changed'
  | 'relationship-created'
  | 'relationship-removed'
  | 'connection-intent'
  | 'pattern-considered'
  | 'pattern-accepted'
  | 'style-accepted'
  | 'requirement-changed'
  | 'quality-scenario-added'
  | 'quality-scenario-changed'
  | 'technology-selected'
  | 'decision-recorded'
  | 'constraint-changed'
  | 'finding-resolved'
  | 'stage-entered'
  | 'workspace-entered'
  | 'selection-changed'
  | 'state-recomputed';

export type IntelligenceWorkspace =
  | 'design-brief'
  | 'quality'
  | 'design-canvas'
  | 'synthesis'
  | 'patterns'
  | 'governance'
  | 'realization'
  | 'portfolio'
  | 'operations'
  | 'knowledge'
  | 'collaboration'
  | 'security'
  | 'drift'
  | 'comparison';

export interface ArchitectureEvent {
  kind: ArchitectureEventKind;
  eventId?: string;
  subjectIds?: string[];
  sourceId?: string;
  targetId?: string;
  relationshipKind?: RelationshipKind;
  field?: string;
  previousValue?: unknown;
  nextValue?: unknown;
  occurredAt?: string;
  workspace?: IntelligenceWorkspace;
}

export interface IntelligenceContext {
  stage: string;
  workspace: IntelligenceWorkspace;
  knowledgeReleaseId: string;
  selectionId: string | null;
  drivers: Array<{ attributeId: string; weight: number }>;
  uncoveredTopDrivers: string[];
  acceptedStyleIds: string[];
  acceptedPatternIds: string[];
  openObligations: number;
  stageNodeCount: number;
  stageEdgeCount: number;
  lineageGaps: number;
  briefGaps: string[];
  regulatoryExposure?: string | undefined;
  operationalMaturity?: number | undefined;
}

export interface RankedAction {
  id: string;
  kind: string;
  title: string;
  detail: string;
  score: number;
  kbRefs: string[];
  why: string;
}

export type IntelligenceOrigin =
  | 'deterministic-invariant'
  | 'enterprise-policy'
  | 'approved-knowledge'
  | 'architecture-inference'
  | 'architect-decision'
  | 'runtime-evidence';

export interface KernelFinding {
  severity: 'SIGNIFICANT' | 'ADVISORY';
  category: 'structural' | 'policy' | 'recommendation' | 'trade-off' | 'assumption' | 'tip';
  title: string;
  detail: string;
  kbRefs: string[];
  affectedIds: string[];
  origin: IntelligenceOrigin;
}

export interface IntelligenceExplanation {
  whyNow: string;
  whyHere: string;
  basedOn: string[];
  ifIgnored: string;
  alternatives: string[];
}

export interface IntelligenceTrace {
  id: string;
  at: string;
  eventKind: ArchitectureEventKind;
  stage: string;
  knowledgeReleaseId: string;
  kbRefs: string[];
  rulesFired: string[];
  excludedKnowledgeIds: string[];
  confidence: 'high' | 'medium';
}

export interface IntelligenceChangeOperation {
  type: 'create-relationship' | 'set-attribute' | 'open-decision' | 'navigate';
  subjectId?: string;
  sourceId?: string;
  targetId?: string;
  relationshipKind?: RelationshipKind;
  field?: string;
  value?: unknown;
  target?: string;
}

export interface IntelligenceChangeSet {
  id: string;
  title: string;
  rationale: string;
  risk: 'low' | 'medium';
  requiresApproval: true;
  kbRefs: string[];
  operations: IntelligenceChangeOperation[];
}

export type IntelligenceVisualNodeKind =
  | 'project'
  | 'objective'
  | 'constraint'
  | 'stakeholder'
  | 'driver'
  | 'scenario'
  | 'style'
  | 'pattern'
  | 'architecture'
  | 'decision'
  | 'approval'
  | 'finding'
  | 'obligation'
  | 'recommendation';

export interface IntelligenceVisualNode {
  id: string;
  label: string;
  summary: string;
  kind: IntelligenceVisualNodeKind;
  x: number;
  y: number;
  objectId?: string;
  stage?: string;
  score?: number;
  severity?: 'SIGNIFICANT' | 'ADVISORY';
}

export interface IntelligenceVisualEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  kind: 'contains' | 'drives' | 'measures' | 'supports' | 'conflicts' | 'recommends' | 'governs' | 'realizes' | 'affects' | 'depends';
}

export interface IntelligenceVisualModel {
  workspace: IntelligenceWorkspace;
  title: string;
  description: string;
  nodes: IntelligenceVisualNode[];
  edges: IntelligenceVisualEdge[];
  focusNodeIds: string[];
  generatedFrom: 'canonical-project-and-intelligence-kernel';
  humanApprovalRequired: true;
}

export interface IntelligenceResponse {
  context: IntelligenceContext;
  visualModel: IntelligenceVisualModel;
  findings: KernelFinding[];
  recommendations: Array<{ styleId: string; styleName: string; score: number; applicable: boolean }>;
  suggestedComponents: Array<{
    id: string;
    name: string;
    recordType: string;
    reason: string;
    score: number;
    kbRefs: string[];
  }>;
  intermediaries?: Array<{ patternId: string; why: string }> | undefined;
  suggestedRelationships: Array<{
    sourceId: string;
    targetId: string;
    relationType: RelationshipKind;
    label: string;
    rationale: string;
    recommended: boolean;
    kbRefs: string[];
  }>;
  missingAttributes: Array<{ subjectId: string; attribute: string; question: string }>;
  questions: string[];
  affectedObjects: string[];
  nextBestActions: RankedAction[];
  proposedChangeSets: IntelligenceChangeSet[];
  health: { score: number; level: 'healthy' | 'attention' | 'at-risk'; topConcerns: string[] };
  evidence: {
    knowledgeReleaseId: string;
    kbRefs: string[];
    origin: 'approved-release';
    candidateKnowledgeUsed: false;
  };
  explanation: IntelligenceExplanation;
  trace: IntelligenceTrace;
  confidence: 'high' | 'medium';
}

export interface KernelPreferences {
  demoted: Record<string, number>;
}

export function applyOutcomeToPreferences(
  preferences: KernelPreferences,
  actionKind: string,
  outcome: 'accepted' | 'dismissed',
): KernelPreferences {
  const demoted = { ...preferences.demoted };
  if (outcome === 'dismissed') demoted[actionKind] = (demoted[actionKind] ?? 0) + 1;
  else if (demoted[actionKind]) demoted[actionKind] = Math.max(0, demoted[actionKind] - 1);
  return { demoted };
}

function defaultWorkspaceForStage(stage: string): IntelligenceWorkspace {
  if (stage === 'designIntent') return 'design-brief';
  if (stage === 'validationRealization') return 'realization';
  return 'design-canvas';
}

export function assembleIntelligenceContext(
  project: ArchitectureProject,
  library: KnowledgeLibrary,
  event: ArchitectureEvent,
): IntelligenceContext {
  const drivers = (project.qualityPriorities ?? []).filter((priority) => priority.weight > 0);
  const scenarios = project.qualityScenarios ?? [];
  const covered = new Set(scenarios.map((scenario) => scenario.attributeId));
  const stageNodes = (project.nodes ?? []).filter((node) => node.stage === project.activeStage);
  const stageEdges = (project.edges ?? []).filter((edge) => edge.stage === project.activeStage);
  const lineageGaps = project.activeStage === 'applicationRealization'
    ? stageNodes.filter((node) => !(node.lineageFrom ?? []).length).length
    : 0;
  const briefGaps: string[] = [];
  if (!(project.description ?? '').trim()) briefGaps.push('problem statement');
  if (!(project.objectives ?? []).length) briefGaps.push('objectives');
  if (!(project.constraints ?? []).length) briefGaps.push('constraints');
  if (!drivers.length) briefGaps.push('quality drivers');
  if (!scenarios.some((scenario) => scenario.responseMeasure.trim())) briefGaps.push('measurable scenarios');

  const openStyleObligations = (project.styleDecisions ?? [])
    .filter((decision) => decision.status === 'accepted')
    .reduce((sum, decision) => {
      const record = library.architectureStyles.find((style) => style.id === decision.styleId);
      const acknowledged = new Set((decision as { obligationsAcknowledged?: string[] }).obligationsAcknowledged ?? []);
      return sum + (record?.obligations ?? []).filter((obligation) => !acknowledged.has(String(obligation))).length;
    }, 0);
  const openPatternObligations = (project.patternSelections ?? [])
    .filter((selection) => selection.status === 'accepted')
    .reduce((sum, selection) => {
      const record = library.patterns.find((pattern) => pattern.id === selection.patternId);
      const acknowledged = new Set(selection.obligationsAcknowledged ?? []);
      return sum + (record?.obligations ?? []).filter((obligation) => !acknowledged.has(String(obligation))).length;
    }, 0);

  return {
    stage: project.activeStage,
    workspace: event.workspace ?? defaultWorkspaceForStage(project.activeStage),
    knowledgeReleaseId: library.knowledgeReleaseId ?? 'AKR-unversioned',
    selectionId: event.subjectIds?.[0] ?? null,
    drivers,
    uncoveredTopDrivers: drivers
      .filter((driver) => driver.weight >= 4 && !covered.has(driver.attributeId))
      .map((driver) => driver.attributeId),
    acceptedStyleIds: (project.styleDecisions ?? [])
      .filter((decision) => decision.status === 'accepted')
      .map((decision) => decision.styleId),
    acceptedPatternIds: (project.patternSelections ?? [])
      .filter((selection) => selection.status === 'accepted')
      .map((selection) => selection.patternId),
    openObligations: openStyleObligations + openPatternObligations,
    stageNodeCount: stageNodes.length,
    stageEdgeCount: stageEdges.length,
    lineageGaps,
    briefGaps,
    regulatoryExposure: project.context.regulatoryExposure,
    operationalMaturity: project.context.operationalMaturity,
  };
}

const STAGE_RANK: Record<string, number> = {
  designIntent: 0,
  logicalApplication: 1,
  applicationRealization: 2,
  logicalTechnology: 3,
  physicalTechnology: 4,
  validationRealization: 5,
};

function triggerFor(event: ArchitectureEvent): RecommendationContext['trigger'] {
  if (event.kind === 'selection-changed') return 'scope-change';
  if (event.kind === 'style-accepted') return 'style-selection';
  if (event.kind === 'pattern-accepted' || event.kind === 'pattern-considered') return 'pattern-selection';
  if (event.kind === 'requirement-changed' || event.kind === 'constraint-changed') return 'intent-change';
  if (event.kind === 'quality-scenario-added' || event.kind === 'quality-scenario-changed') return 'quality-change';
  return 'canvas-change';
}

function guidanceAction(card: DesignGuidanceItem): { kind: string; base: number } {
  if (card.kind === 'warning') return { kind: `guide-warning:${card.id.replace(/-[0-9]+$/, '')}`, base: 72 };
  if (card.kind === 'next-step') return { kind: `guide-next:${card.stage}`, base: 58 };
  if (card.kind === 'recommendation') return { kind: 'guide-recommendation', base: 48 };
  if (card.kind === 'obligation') return { kind: 'guide-obligation', base: 64 };
  return { kind: 'guide-insight', base: 28 };
}

function mapDeterministicFinding(finding: Finding): KernelFinding {
  return {
    severity: finding.severity === 'HARD' || finding.severity === 'SIGNIFICANT' ? 'SIGNIFICANT' : 'ADVISORY',
    category: finding.severity === 'HARD' ? 'policy' : 'structural',
    title: finding.title,
    detail: `${finding.message} ${finding.rationale}`.trim(),
    kbRefs: finding.ruleId ? [finding.ruleId] : [],
    affectedIds: finding.affectedNodeIds ?? [],
    origin: finding.severity === 'HARD' ? 'deterministic-invariant' : 'enterprise-policy',
  };
}

function evaluateConnectionSemantics(
  project: ArchitectureProject,
  library: KnowledgeLibrary,
  sourceId: string,
  targetId: string,
): {
  missing: IntelligenceResponse['missingAttributes'];
  questions: string[];
  findings: KernelFinding[];
  suggestions: IntelligenceResponse['suggestedRelationships'];
  kbRefs: string[];
  changeSets: IntelligenceChangeSet[];
} {
  const options = getSemanticConnectionOptions(project, sourceId, targetId);
  const source = project.nodes.find((node) => node.id === sourceId);
  const target = project.nodes.find((node) => node.id === targetId);
  const missing: IntelligenceResponse['missingAttributes'] = [];
  const questions: string[] = [];
  const findings: KernelFinding[] = [];
  const kbRefs = new Set<string>();
  if (!source || !target) return { missing, questions, findings, suggestions: [], kbRefs: [], changeSets: [] };

  const edgeSubject = `connection:${sourceId}:${targetId}`;
  const sourceExternal = /external|actor/i.test(source.kind) || source.tags.some((tag) => /external|partner/i.test(tag));
  const targetExternal = /external|actor/i.test(target.kind) || target.tags.some((tag) => /external|partner/i.test(tag));
  const crossesExternal = sourceExternal !== targetExternal;
  const classifications = project.context.dataClassifications ?? [];

  questions.push('Is this interaction a command, query or event, and does the caller require an immediate response?');
  missing.push({
    subjectId: edgeSubject,
    attribute: 'failureSemantics',
    question: `What happens when ${target.label} is slow or unavailable: timeout, retry, fallback, compensation or queueing?`,
  });
  missing.push({
    subjectId: edgeSubject,
    attribute: 'idempotency',
    question: 'Can this operation be repeated safely, and what identifier prevents duplicate effects?',
  });

  if (crossesExternal) {
    const breaker = library.patterns.find((pattern) => /circuit breaker/i.test(pattern.name));
    if (breaker) kbRefs.add(breaker.id);
    missing.push({
      subjectId: edgeSubject,
      attribute: 'trustBoundary',
      question: 'Which authentication, authorization, rate-limit and audit controls protect this trust-boundary crossing?',
    });
    findings.push({
      severity: 'SIGNIFICANT',
      category: 'recommendation',
      title: 'External trust-boundary semantics are incomplete',
      detail: `${source.label} → ${target.label} crosses organizational control. Define security, timeout, fallback and dependency-isolation behaviour before approval.`,
      kbRefs: breaker ? [breaker.id] : [],
      affectedIds: [sourceId, targetId],
      origin: 'approved-knowledge',
    });
  }

  if (classifications.length) {
    missing.push({
      subjectId: edgeSubject,
      attribute: 'dataClassification',
      question: `Which classification flows on this edge (${classifications.join(', ')}) and what retention or audit evidence is required?`,
    });
  }

  const idempotent = library.patterns.find((pattern) => /idempotent/i.test(pattern.name));
  if (idempotent) kbRefs.add(idempotent.id);
  for (const option of options) option.intermediaryRecordIds.forEach((id) => kbRefs.add(id));

  const suggestions = options.map((option) => ({
    sourceId,
    targetId,
    relationType: option.kind,
    label: option.label,
    rationale: option.explanation,
    recommended: option.recommended,
    kbRefs: option.intermediaryRecordIds,
  }));
  const changeSets = suggestions.slice(0, 4).map((suggestion, index) => ({
    id: `change-connection-${sourceId}-${targetId}-${index}`,
    title: `${suggestion.label}: ${source.label} → ${target.label}`,
    rationale: suggestion.rationale,
    risk: suggestion.recommended ? 'low' as const : 'medium' as const,
    requiresApproval: true as const,
    kbRefs: suggestion.kbRefs,
    operations: [{
      type: 'create-relationship' as const,
      sourceId,
      targetId,
      relationshipKind: suggestion.relationType,
    }],
  }));

  return { missing, questions, findings, suggestions, kbRefs: [...kbRefs], changeSets };
}

function evaluateAttributeConsequence(
  project: ArchitectureProject,
  library: KnowledgeLibrary,
  event: ArchitectureEvent,
): { findings: KernelFinding[]; affected: string[] } {
  const findings: KernelFinding[] = [];
  const affected = new Set<string>();
  const changed = String(event.field ?? '');
  if (event.kind === 'requirement-changed' || event.kind === 'attribute-changed' || event.kind === 'constraint-changed' || event.kind === 'quality-scenario-changed') {
    for (const decision of project.styleDecisions.filter((item) => item.status === 'accepted')) {
      const record = library.architectureStyles.find((style) => style.id === decision.styleId);
      const rating = record?.qualityAttributeRatings?.[changed];
      if (record && rating !== undefined && rating <= 2) {
        affected.add(decision.scopeNodeId ?? decision.styleId);
        findings.push({
          severity: 'SIGNIFICANT',
          category: 'trade-off',
          title: `Accepted style is weak on ${changed}`,
          detail: `${record.name} rates ${rating}/5 on ${changed}. Revisit the decision or add compensating patterns before relying on the changed requirement.`,
          kbRefs: [record.id],
          affectedIds: [decision.scopeNodeId ?? decision.styleId],
          origin: 'approved-knowledge',
        });
      }
    }
  }
  if (event.subjectIds?.length) {
    try {
      const impact = analyseImpact(project, event.subjectIds);
      for (const item of impact.affectedNodes ?? []) affected.add(item.nodeId);
    } catch {
      // Impact analysis is advisory; failure must never block a model mutation.
    }
  }
  return { findings, affected: [...affected] };
}

function rankNextBestActions(
  cards: DesignGuidanceItem[],
  context: IntelligenceContext,
  extra: RankedAction[],
  preferences: KernelPreferences,
  options?: KernelOptions,
): RankedAction[] {
  const stageRank = STAGE_RANK[context.stage] ?? 0;
  const actions: RankedAction[] = cards.map((card) => {
    const { kind, base } = guidanceAction(card);
    const cardRank = STAGE_RANK[card.stage] ?? stageRank;
    const stageMatch = card.stage === context.stage ? 10 : 0;
    const unblock = card.kind === 'next-step' && cardRank <= stageRank ? 8 : 0;
    return {
      id: `nba-${card.id}`,
      kind,
      title: card.title,
      detail: card.message,
      score: base + stageMatch + unblock,
      kbRefs: card.linkedRecordIds,
      why: `${card.kind} for the ${card.stage} stage: ${card.rationale}`,
    };
  });
  if (context.uncoveredTopDrivers.length) {
    actions.push({
      id: 'nba-scenarios',
      kind: 'define-scenarios',
      title: `Make ${context.uncoveredTopDrivers.length} critical driver(s) measurable`,
      detail: `${context.uncoveredTopDrivers.join(', ')} are weighted 4+ but have no measurable scenario; decisions against them are currently opinions.`,
      score: 82,
      kbRefs: [],
      why: 'Highest information gain: critical drivers lack measurable success criteria.',
    });
  }
  if (context.openObligations > 0) {
    actions.push({
      id: 'nba-obligations',
      kind: 'acknowledge-obligations',
      title: `${context.openObligations} obligation(s) await acknowledgement`,
      detail: 'Accepted styles and patterns created design work that must be satisfied or explicitly accepted before review.',
      score: 64 + Math.min(15, context.openObligations * 3),
      kbRefs: [...context.acceptedStyleIds, ...context.acceptedPatternIds],
      why: 'Accepted architecture choices carry unresolved operational or governance consequences.',
    });
  }
  actions.push(...extra);
  const roleAdj = options?.experience?.roleAdjustments?.[options?.role ?? ''];
  const maturity = context.operationalMaturity ?? 3;
  for (const action of actions) {
  if (roleAdj?.warningBoost && action.kind.startsWith('resolve')) action.score += roleAdj.warningBoost;
  if (roleAdj?.insightBoost && action.kind.includes('insight')) action.score += roleAdj.insightBoost;
  if (maturity <= 2 && /operational|observab|obligation/i.test(action.title)) action.score += 8;
}

  return actions
    .map((action) => ({ ...action, score: action.score - 12 * (preferences.demoted[action.kind] ?? 0) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, Math.max(1, options?.experience?.maxNextBestActions ?? 6));
}

function concise(value: string, maximum = 96): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1)}…`;
}

export function buildVisualIntelligenceModel(
  project: ArchitectureProject,
  library: KnowledgeLibrary,
  context: IntelligenceContext,
  ranking: IntelligenceResponse['recommendations'],
  suggestedComponents: IntelligenceResponse['suggestedComponents'],
  findings: KernelFinding[],
): IntelligenceVisualModel {
  const nodes: IntelligenceVisualNode[] = [];
  const edges: IntelligenceVisualEdge[] = [];
  const focus = new Set<string>();
  const ids = new Set<string>();
  const addNode = (node: IntelligenceVisualNode) => {
    if (ids.has(node.id)) return;
    ids.add(node.id);
    nodes.push(node);
  };
  const addEdge = (sourceId: string, targetId: string, label: string, kind: IntelligenceVisualEdge['kind']) => {
    if (!ids.has(sourceId) || !ids.has(targetId)) return;
    edges.push({ id: `visual-edge-${edges.length}-${sourceId}-${targetId}`, sourceId, targetId, label, kind });
  };
  const rootId = `visual-project-${project.id}`;
  addNode({
    id: rootId,
    label: project.name,
    summary: concise(project.description || 'Architecture project'),
    kind: 'project',
    x: 360,
    y: 24,
    objectId: project.id,
    stage: project.activeStage,
  });

  const qualityName = (id: string) => library.qualityAttributes.find((item) => item.id === id)?.name ?? id;
  const acceptedPatterns = (project.patternSelections ?? []).filter((item) => item.status === 'accepted' || item.status === 'considering');
  const acceptedStyles = (project.styleDecisions ?? []).filter((item) => item.status === 'accepted');

  if (context.workspace === 'design-brief') {
    project.objectives.slice(0, 5).forEach((objective, index) => {
      const id = `visual-objective-${index}`;
      addNode({ id, label: `Objective ${index + 1}`, summary: concise(objective), kind: 'objective', x: 20, y: 140 + index * 112 });
      addEdge(rootId, id, 'seeks', 'contains');
    });
    project.constraints.slice(0, 5).forEach((constraint, index) => {
      const id = `visual-constraint-${index}`;
      addNode({ id, label: `Constraint ${index + 1}`, summary: concise(constraint), kind: 'constraint', x: 700, y: 140 + index * 112 });
      addEdge(id, rootId, 'bounds', 'governs');
    });
    (project.context.stakeholders ?? []).slice(0, 4).forEach((stakeholder, index) => {
      const id = `visual-stakeholder-${index}`;
      addNode({ id, label: stakeholder, summary: 'Stakeholder or decision participant', kind: 'stakeholder', x: 360, y: 150 + index * 92 });
      addEdge(id, rootId, 'needs', 'drives');
    });
    context.drivers.slice(0, 5).forEach((driver, index) => {
      const id = `visual-driver-${driver.attributeId}`;
      addNode({ id, label: qualityName(driver.attributeId), summary: `Priority ${driver.weight}/5`, kind: 'driver', x: 260 + (index % 2) * 220, y: 520 + Math.floor(index / 2) * 104, score: driver.weight * 20 });
      addEdge(rootId, id, 'must achieve', 'drives');
    });
    context.briefGaps.slice(0, 4).forEach((gap, index) => {
      const id = `visual-gap-${index}`;
      addNode({ id, label: 'Missing intent', summary: concise(gap), kind: 'finding', x: 510 + (index % 2) * 190, y: 510 + Math.floor(index / 2) * 100, severity: 'SIGNIFICANT' });
      addEdge(id, rootId, 'weakens', 'affects');
      focus.add(id);
    });
  } else if (context.workspace === 'quality') {
    const drivers = [...context.drivers].sort((a, b) => b.weight - a.weight).slice(0, 7);
    drivers.forEach((driver, index) => {
      const id = `visual-driver-${driver.attributeId}`;
      addNode({ id, label: qualityName(driver.attributeId), summary: `Priority ${driver.weight}/5`, kind: 'driver', x: 24, y: 120 + index * 94, score: driver.weight * 20 });
      addEdge(rootId, id, 'prioritizes', 'drives');
    });
    (project.qualityScenarios ?? []).slice(0, 7).forEach((scenario, index) => {
      const id = `visual-scenario-${scenario.id}`;
      addNode({ id, label: `${qualityName(scenario.attributeId)} scenario`, summary: concise(scenario.responseMeasure || scenario.response || 'Measure not yet defined'), kind: 'scenario', x: 350, y: 120 + index * 94, objectId: scenario.id, score: scenario.weight * 20 });
      const driverId = `visual-driver-${scenario.attributeId}`;
      if (ids.has(driverId)) addEdge(driverId, id, 'measured by', 'measures');
      else addEdge(rootId, id, 'tests', 'measures');
    });
    ranking.slice(0, 5).forEach((style, index) => {
      const id = `visual-style-${style.styleId}`;
      const record = library.architectureStyles.find((item) => item.id === style.styleId);
      addNode({ id, label: style.styleName, summary: `Eligible style · score ${style.score.toFixed(1)}`, kind: 'style', x: 700, y: 145 + index * 112, objectId: style.styleId, score: style.score });
      addEdge(rootId, id, 'ranks', 'recommends');
      for (const driver of drivers.slice(0, 4)) {
        const rating = record?.qualityAttributeRatings?.[driver.attributeId];
        if (rating !== undefined && rating >= 3) addEdge(`visual-driver-${driver.attributeId}`, id, `supports ${rating}/5`, 'supports');
        if (rating !== undefined && rating <= 2) addEdge(`visual-driver-${driver.attributeId}`, id, `trade-off ${rating}/5`, 'conflicts');
      }
    });
  } else if (context.workspace === 'synthesis') {
    project.constraints.slice(0, 4).forEach((constraint, index) => {
      const id = `visual-constraint-${index}`;
      addNode({ id, label: `Constraint ${index + 1}`, summary: concise(constraint), kind: 'constraint', x: 20, y: 150 + index * 120 });
      addEdge(id, rootId, 'filters', 'governs');
    });
    context.drivers.slice(0, 5).forEach((driver, index) => {
      const id = `visual-driver-${driver.attributeId}`;
      addNode({ id, label: qualityName(driver.attributeId), summary: `Weight ${driver.weight}/5`, kind: 'driver', x: 240, y: 130 + index * 105, score: driver.weight * 20 });
      addEdge(id, rootId, 'drives', 'drives');
    });
    ranking.slice(0, 5).forEach((style, index) => {
      const id = `visual-style-${style.styleId}`;
      addNode({ id, label: style.styleName, summary: `Alternative foundation · ${style.score.toFixed(1)}/100`, kind: 'style', x: 520, y: 130 + index * 105, objectId: style.styleId, score: style.score });
      addEdge(rootId, id, 'synthesizes', 'recommends');
    });
    acceptedPatterns.slice(0, 4).forEach((selection, index) => {
      const record = library.patterns.find((item) => item.id === selection.patternId);
      const id = `visual-pattern-${selection.patternId}`;
      addNode({ id, label: record?.name ?? selection.patternId, summary: `${selection.status} pattern`, kind: 'pattern', x: 790, y: 150 + index * 120, objectId: selection.patternId });
      for (const style of ranking.slice(0, 2)) addEdge(`visual-style-${style.styleId}`, id, 'composes with', 'supports');
    });
  } else if (context.workspace === 'patterns') {
    acceptedStyles.slice(0, 4).forEach((decision, index) => {
      const record = library.architectureStyles.find((item) => item.id === decision.styleId);
      const id = `visual-style-${decision.styleId}-${index}`;
      addNode({ id, label: record?.name ?? decision.styleId, summary: 'Accepted architecture style', kind: 'style', x: 20, y: 140 + index * 120, objectId: decision.styleId });
      addEdge(rootId, id, 'sets context', 'drives');
    });
    acceptedPatterns.slice(0, 6).forEach((selection, index) => {
      const record = library.patterns.find((item) => item.id === selection.patternId);
      const id = `visual-pattern-${selection.patternId}-${index}`;
      addNode({ id, label: record?.name ?? selection.patternId, summary: `${selection.status} · ${(record?.obligations ?? []).length} obligation(s)`, kind: 'pattern', x: 350, y: 120 + index * 100, objectId: selection.patternId });
      addEdge(rootId, id, selection.status, selection.status === 'accepted' ? 'supports' : 'recommends');
    });
    suggestedComponents.filter((item) => item.recordType === 'pattern').slice(0, 5).forEach((item, index) => {
      const id = `visual-recommendation-${item.id}`;
      addNode({ id, label: item.name, summary: concise(item.reason), kind: 'recommendation', x: 720, y: 130 + index * 112, objectId: item.id, score: item.score });
      addEdge(rootId, id, 'recommends', 'recommends');
    });
    if (context.openObligations) {
      const id = 'visual-open-obligations';
      addNode({ id, label: `${context.openObligations} open obligations`, summary: 'Implementation and governance work created by accepted styles and patterns', kind: 'obligation', x: 365, y: 740, severity: 'SIGNIFICANT' });
      addEdge(id, rootId, 'must satisfy', 'governs');
      focus.add(id);
    }
  } else if (context.workspace === 'governance' || context.workspace === 'realization') {
    (project.decisions ?? []).slice(-6).forEach((decision, index) => {
      const id = `visual-decision-${decision.id}`;
      addNode({ id, label: decision.title, summary: concise(decision.decision || decision.context), kind: 'decision', x: 20, y: 125 + index * 104, objectId: decision.id });
      addEdge(rootId, id, 'records', 'governs');
    });
    (project.stageApprovals ?? []).slice(-5).forEach((approval, index) => {
      const id = `visual-approval-${approval.id}`;
      addNode({ id, label: `${approval.stage} · ${approval.status}`, summary: approval.reviewer ? `Reviewer: ${approval.reviewer}` : 'Awaiting governed review', kind: 'approval', x: 365, y: 135 + index * 116, objectId: approval.id });
      addEdge(rootId, id, 'requires', 'governs');
    });
    findings.slice(0, 7).forEach((finding, index) => {
      const id = `visual-finding-${index}`;
      addNode({ id, label: finding.title, summary: concise(finding.detail), kind: 'finding', x: 710, y: 115 + index * 100, severity: finding.severity });
      addEdge(id, rootId, 'affects', 'affects');
      if (finding.severity === 'SIGNIFICANT') focus.add(id);
    });
    if (context.openObligations) {
      const id = 'visual-open-obligations';
      addNode({ id, label: `${context.openObligations} open obligations`, summary: 'Must be acknowledged or satisfied before approval', kind: 'obligation', x: 365, y: 735, severity: 'SIGNIFICANT' });
      addEdge(id, rootId, 'blocks readiness', 'governs');
      focus.add(id);
    }
  } else {
    const stageNodes = (project.nodes ?? []).filter((node) => node.stage === project.activeStage).slice(0, 18);
    stageNodes.forEach((node, index) => {
      const position = node.positions?.[project.activeStage];
      const id = `visual-architecture-${node.id}`;
      addNode({ id, label: node.label, summary: `${node.kind} · ${node.status}`, kind: 'architecture', x: position?.x ?? 30 + (index % 4) * 230, y: position?.y ?? 130 + Math.floor(index / 4) * 135, objectId: node.id, stage: node.stage });
      addEdge(rootId, id, 'contains', 'contains');
      if (context.selectionId === node.id) focus.add(id);
    });
    (project.edges ?? []).filter((edge) => edge.stage === project.activeStage).slice(0, 30).forEach((edge) => {
      const sourceId = `visual-architecture-${edge.sourceId}`;
      const targetId = `visual-architecture-${edge.targetId}`;
      if (ids.has(sourceId) && ids.has(targetId)) addEdge(sourceId, targetId, edge.label ?? edge.kind, edge.kind === 'realizes' || edge.kind === 'mapsTo' ? 'realizes' : 'depends');
    });
    findings.slice(0, 5).forEach((finding, index) => {
      const id = `visual-finding-${index}`;
      addNode({ id, label: finding.title, summary: concise(finding.detail), kind: 'finding', x: 760, y: 120 + index * 110, severity: finding.severity });
      for (const affected of finding.affectedIds.slice(0, 3)) addEdge(id, `visual-architecture-${affected}`, 'affects', 'affects');
      if (finding.severity === 'SIGNIFICANT') focus.add(id);
    });
  }

  if (nodes.length === 1) {
    const id = 'visual-empty-guidance';
    addNode({ id, label: 'Start the visual model', summary: 'Add intent, quality scenarios or architecture elements to grow this governed graph.', kind: 'recommendation', x: 360, y: 210 });
    addEdge(rootId, id, 'next', 'recommends');
    focus.add(id);
  }

  const titles: Record<IntelligenceWorkspace, [string, string]> = {
    'design-brief': ['Intent and driver map', 'Objectives, constraints, stakeholders and quality drivers shown as a traceable visual model.'],
    quality: ['Quality trade-off map', 'Quality drivers, measurable scenarios and eligible style consequences in one visual view.'],
    'design-canvas': ['Architecture intelligence map', 'Canonical architecture objects and relationships with intelligence overlays.'],
    synthesis: ['Alternative synthesis map', 'Constraints and drivers connected to candidate styles and composed patterns.'],
    patterns: ['Pattern composition map', 'Accepted and recommended patterns connected to styles, obligations and implementation context.'],
    governance: ['Decision and assurance map', 'Decisions, approvals, findings and obligations visualized as one governance graph.'],
    realization: ['Realization readiness map', 'Architecture decisions, findings, approvals and obligations that control delivery readiness.'],
    portfolio: ['Portfolio intelligence map', 'Cross-project architecture dependencies and recommendations.'],
    operations: ['Operational intelligence map', 'Runtime evidence, risks and remediation relationships.'],
    knowledge: ['Knowledge provenance map', 'Approved records and evidence relationships.'],
    collaboration: ['Collaboration decision map', 'Reviews, participants and decision flow.'],
    security: ['Security architecture map', 'Trust boundaries, controls and findings.'],
    drift: ['Architecture drift map', 'Intended and observed architecture relationships.'],
    comparison: ['Architecture comparison map', 'Branch and alternative differences.'],
  };
  const [title, description] = titles[context.workspace];
  return {
    workspace: context.workspace,
    title,
    description,
    nodes: nodes.slice(0, 28),
    edges: edges.filter((edge) => nodes.some((node) => node.id === edge.sourceId) && nodes.some((node) => node.id === edge.targetId)).slice(0, 60),
    focusNodeIds: [...focus],
    generatedFrom: 'canonical-project-and-intelligence-kernel',
    humanApprovalRequired: true,
  };
}

export function assessArchitectureHealth(
  cards: DesignGuidanceItem[],
  context: IntelligenceContext,
  findings: KernelFinding[],
): IntelligenceResponse['health'] {
  let score = 100;
  const concerns: string[] = [];
  score -= cards.filter((card) => card.kind === 'warning').length * 8;
  score -= findings.filter((finding) => finding.severity === 'SIGNIFICANT').length * 8;
  score -= findings.filter((finding) => finding.severity === 'ADVISORY').length * 3;
  score -= Math.min(20, context.openObligations * 4);
  score -= Math.min(18, context.uncoveredTopDrivers.length * 6);
  score -= Math.min(12, context.lineageGaps * 3);
  score -= Math.min(15, context.briefGaps.length * 5);
  score = Math.max(5, Math.min(100, Math.round(score)));

  for (const finding of findings.filter((item) => item.severity === 'SIGNIFICANT').slice(0, 2)) concerns.push(finding.title);
  if (context.uncoveredTopDrivers.length) concerns.push(`Unmeasured critical drivers: ${context.uncoveredTopDrivers.join(', ')}`);
  if (context.openObligations) concerns.push(`${context.openObligations} open obligation(s)`);
  if (!concerns.length && context.briefGaps.length) concerns.push(`Brief gaps: ${context.briefGaps.join(', ')}`);
  return { score, level: score >= 75 ? 'healthy' : score >= 50 ? 'attention' : 'at-risk', topConcerns: concerns.slice(0, 3) };
}

export interface KernelOptions {
  policyPacks?: Array<{ id: string; match: string[]; obligations: string[]; evidence: string[] }>;
  tacticsCatalog?: { tactics: Tactic[] } | undefined;
  experience?: { maxNextBestActions?: number; roleAdjustments?: Record<string, { insightBoost?: number; warningBoost?: number }> };
  role?: string;
}

export function evaluateArchitectureEvent(
  project: ArchitectureProject,
  library: KnowledgeLibrary,
  event: ArchitectureEvent,
  preferences: KernelPreferences = { demoted: {} },
  options?: KernelOptions,
): IntelligenceResponse {
  const rulesFired: string[] = [];
  const context = assembleIntelligenceContext(project, library, event);
  rulesFired.push('context-assembled');

  const grounding = selectRelevantKnowledge(project, library, 12);
  rulesFired.push('approved-knowledge-retrieved');

  const recommendationContext: RecommendationContext = {
    stage: project.activeStage,
    trigger: triggerFor(event),
    ...(context.selectionId ? { scopeNodeId: context.selectionId } : {}),
  };
  const contextual = recommendInContext(project, library, recommendationContext);
  let deterministicFindings: Finding[] = [];
  try {
    deterministicFindings = validateProject(project, library);
    rulesFired.push('deterministic-validation-evaluated');
  } catch {
    rulesFired.push('deterministic-validation-unavailable-for-partial-model');
  }
  const cards = deriveDesignGuidance(project, library, contextual, deterministicFindings, context.selectionId);
  rulesFired.push('guidance-evaluated');

  const ranking = recommendArchitectureStyles(project, library)
    .filter((item) => item.eligible)
    .slice(0, 5)
    .map((item) => ({
      styleId: item.styleId,
      styleName: item.styleName,
      score: item.score,
      applicable: item.eligible,
    }));
  rulesFired.push('styles-ranked');

  let suggestedComponents: IntelligenceResponse['suggestedComponents'] = [];
  try {
    suggestedComponents = contextualLibrary(project, library, context.selectionId ?? undefined)
      .slice(0, 8)
      .map((record) => ({
        id: record.id,
        name: record.name,
        recordType: record.recordType,
        reason: record.recommendationReason,
        score: record.recommendationScore,
        kbRefs: record.recordType === 'component' ? [] : [record.id],
      }));
    rulesFired.push('palette-ranked');
  } catch {
    rulesFired.push('palette-ranking-unavailable');
  }

  const findings: KernelFinding[] = deterministicFindings.slice(0, 12).map(mapDeterministicFinding);
  const missingAttributes: IntelligenceResponse['missingAttributes'] = [];
  const questions: string[] = [];
  let suggestedRelationships: IntelligenceResponse['suggestedRelationships'] = [];
  let intermediariesOut: Array<{ patternId: string; why: string }> = [];
  const proposedChangeSets: IntelligenceChangeSet[] = [];
  const affectedObjects = new Set<string>();
  let confidence: 'high' | 'medium' = 'high';
  const kbRefs = new Set<string>(grounding.ids);

  if ((event.kind === 'connection-intent' || event.kind === 'relationship-created') && event.sourceId && event.targetId) {
    const semantics = evaluateConnectionSemantics(project, library, event.sourceId, event.targetId);
    // Intermediary recommendations (B1): topology-aware, KB-cited
    try {
      const srcNode = project.nodes.find((n) => n.id === event.sourceId);
      const dstNode = project.nodes.find((n) => n.id === event.targetId);
      const crossesExternal = /external|actor/i.test(String(srcNode?.kind)) !== /external|actor/i.test(String(dstNode?.kind));
      const wantAsync = /event|publish|queue|broker/i.test(`${srcNode?.label} ${dstNode?.label}`);
      const cite = (re2: RegExp) => library.patterns.find((p) => re2.test(p.name))?.id;
      const intermediaries: Array<{ patternId: string; why: string }> = [];
      if (crossesExternal) {
        const gw = cite(/gateway/i); const cb = cite(/circuit/i);
        if (gw) intermediaries.push({ patternId: gw, why: 'Terminate the trust boundary at a gateway: auth, rate limits, observability in one place.' });
        if (cb) intermediaries.push({ patternId: cb, why: 'A breaker plus fallback contains the external dependency\'s failures.' });
      }
      if (wantAsync) {
        for (const [re3, why] of [[/outbox/i, 'Publish reliably on local state change — no dual writes.'], [/idempotent/i, 'Consumers must survive redelivery.'], [/dead.?letter|dlq/i, 'Poison messages need a parking lane with alerts.']] as Array<[RegExp, string]>) {
          const id = cite(re3); if (id) intermediaries.push({ patternId: id, why });
        }
      }
      if (intermediaries.length) intermediariesOut = intermediaries.slice(0, 4);
    } catch { /* advisory only */ }
    missingAttributes.push(...semantics.missing);
    questions.push(...semantics.questions);
    findings.push(...semantics.findings);
    suggestedRelationships = semantics.suggestions;
    proposedChangeSets.push(...semantics.changeSets);
    semantics.kbRefs.forEach((id) => kbRefs.add(id));
    affectedObjects.add(event.sourceId);
    affectedObjects.add(event.targetId);
    rulesFired.push('connection-semantics-evaluated');
    confidence = 'medium';
  }

  if (['attribute-changed', 'requirement-changed', 'constraint-changed', 'quality-scenario-added', 'quality-scenario-changed'].includes(event.kind)) {
    const consequence = evaluateAttributeConsequence(project, library, event);
    findings.push(...consequence.findings);
    consequence.affected.forEach((id) => affectedObjects.add(id));
    rulesFired.push('attribute-consequence-evaluated');
  }

  for (const id of event.subjectIds ?? []) affectedObjects.add(id);
  try {
    computeCanvasCompliance(project, library, deterministicFindings);
    rulesFired.push('compliance-computed');
  } catch {
    rulesFired.push('compliance-unavailable');
  }

  findings.forEach((finding) => finding.kbRefs.forEach((id) => kbRefs.add(id)));
  // --- Cambridge-logic composition: tactics, iteration phase, decision readiness, verification ---
  try {
    if (options?.tacticsCatalog) {
      for (const tip of adviseTactics(project, options.tacticsCatalog).filter((t) => t.status === 'missing').slice(0, 3)) {
        findings.push({ severity: 'ADVISORY', category: 'tactic', origin: 'tactics-advisor' as never, title: `Tactic missing for ${tip.attribute}: ${tip.name}`, detail: `${tip.why}${tip.conditional ? ` (trade-off: ${tip.conditional})` : ''}`, kbRefs: ['SRC-INTERNAL-CAMBRIDGE-PLAYBOOK'], affectedIds: [] } as never);
      }
      for (const tip of adviseTactics(project, options.tacticsCatalog).filter((t) => t.status === 'embodied').slice(0, 2)) {
        findings.push({ severity: 'ADVISORY', category: 'insight', origin: 'tactics-advisor' as never, title: `Tactic embodied: ${tip.name}`, detail: `Detected via ${tip.evidence.join(', ')} — serving ${tip.attribute}.`, kbRefs: ['SRC-INTERNAL-CAMBRIDGE-PLAYBOOK'], affectedIds: [] } as never);
      }
    }
    const phase = determineIterationPhase(project);
    findings.push({ severity: 'ADVISORY', category: 'next-step', origin: 'iteration-method' as never, title: `Design phase: ${phase.phase}`, detail: phase.focus, kbRefs: [], affectedIds: [] } as never);
    if (!project.styleDecisions.some((d) => d.status === 'accepted')) {
      for (const gap of checkStyleDecisionReadiness(project).slice(0, 2)) {
        findings.push({ severity: 'ADVISORY', category: 'readiness', origin: 'decision-readiness' as never, title: `Before deciding: ${gap.requirement}`, detail: gap.hint, kbRefs: [], affectedIds: [] } as never);
      }
    }
    for (const verification of runVerificationMethod(project)) {
      findings.push({ severity: 'SIGNIFICANT', category: 'verification', origin: 'verification-method' as never, title: verification.title, detail: verification.detail, kbRefs: [], affectedIds: verification.affectedIds } as never);
    }
  } catch { /* additive; never blocks the kernel */ }
  // --- Sprint 8.7.7 composition: semantic graph, scenario heuristics, policy packs ---
  try {
    const graph = analyseArchitectureGraph(project);
    for (const cycle of graph.cycles.slice(0, 2)) findings.push({ severity: 'SIGNIFICANT', category: 'structural', origin: 'graph-analysis' as never, title: 'Dependency cycle detected', detail: `Cycle: ${cycle.labels.join(' → ')}. Cycles couple change and failure; break with an interface or event.`, kbRefs: [], affectedIds: cycle.nodeIds } as never);
    for (const hs of graph.hotspots.slice(0, 2)) findings.push({ severity: 'ADVISORY', category: 'trade-off', origin: 'graph-analysis' as never, title: `High coupling at ${hs.label}`, detail: `fan-in ${hs.fanIn}, fan-out ${hs.fanOut} — a change/failure hotspot; consider splitting responsibilities or buffering with events.`, kbRefs: [], affectedIds: [hs.nodeId] } as never);
    for (const fp of graph.failurePaths.slice(0, 2)) findings.push({ severity: 'ADVISORY', category: 'recommendation', origin: 'graph-analysis' as never, title: `Synchronous exposure to ${fp.originLabel}`, detail: `${fp.depth} hop(s) depend synchronously on this external origin (${fp.path.slice(0,4).join(' ← ')}). Isolate with a breaker or async boundary.`, kbRefs: [], affectedIds: [fp.originId] } as never);
    for (const verdict of simulateQualityScenarios(project).filter((v) => v.verdict === 'at-risk').slice(0, 2)) findings.push({ severity: 'SIGNIFICANT', category: 'trade-off', origin: 'scenario-simulation' as never, title: `Scenario at risk: ${verdict.measure}`, detail: verdict.reasoning, kbRefs: [], affectedIds: [] } as never);
    const jurisdictions = ((project.context as { regulatoryJurisdictions?: string[] }).regulatoryJurisdictions ?? []).map((j) => j.toLowerCase());
    for (const pack of (options?.policyPacks ?? []).filter((p) => p.match.some((m2) => jurisdictions.some((j) => j.includes(m2))))) {
      for (const obligation of pack.obligations.slice(0, 3)) findings.push({ severity: 'ADVISORY', category: 'policy', origin: 'policy-pack' as never, title: `${pack.id} obligation`, detail: obligation, kbRefs: pack.evidence, affectedIds: [] } as never);
    }
  } catch { /* composition is additive; never blocks the kernel */ }
  const health = assessArchitectureHealth(cards, context, findings);
  const extraActions: RankedAction[] = findings
    .filter((finding) => finding.severity === 'SIGNIFICANT')
    .slice(0, 3)
    .map((finding, index) => ({
      id: `nba-finding-${index}`,
      kind: `resolve:${finding.category}`,
      title: finding.title,
      detail: finding.detail,
      score: 76 - index,
      kbRefs: finding.kbRefs,
      why: `Significant ${finding.category} concern raised by ${event.kind}.`,
    }));
  const nextBestActions = rankNextBestActions(cards, context, extraActions, preferences, options);
  rulesFired.push('actions-ranked');

  const visualModel = buildVisualIntelligenceModel(project, library, context, ranking, suggestedComponents, findings);
  rulesFired.push('visual-model-projected');

  const top = nextBestActions[0];
  const explanation: IntelligenceExplanation = {
    whyNow: `Triggered by ${event.kind} during the ${context.stage} stage.`,
    whyHere: context.selectionId ? `Scoped to ${context.selectionId} and its architecture neighbourhood.` : 'Scoped to the whole active architecture view.',
    basedOn: [`approved knowledge release ${context.knowledgeReleaseId}`, ...[...kbRefs].slice(0, 6)],
    ifIgnored: findings[0]?.detail ?? (top ? `The highest-value step (“${top.title}”) remains open and downstream decisions inherit the uncertainty.` : 'No material consequence was identified.'),
    alternatives: ranking.slice(1, 3).map((item) => `${item.styleName} (${item.score.toFixed(0)}/100)`),
  };

  return {
    context,
    visualModel,
    findings,
    recommendations: ranking,
    suggestedComponents,
    suggestedRelationships,
    intermediaries: intermediariesOut,
    missingAttributes,
    questions,
    affectedObjects: [...affectedObjects],
    nextBestActions,
    proposedChangeSets,
    health,
    evidence: {
      knowledgeReleaseId: context.knowledgeReleaseId,
      kbRefs: [...kbRefs].slice(0, 20),
      origin: 'approved-release',
      candidateKnowledgeUsed: false,
    },
    explanation,
    confidence,
    trace: {
      id: event.eventId ?? `trace-${Date.now().toString(36)}`,
      at: event.occurredAt ?? new Date().toISOString(),
      eventKind: event.kind,
      stage: context.stage,
      knowledgeReleaseId: context.knowledgeReleaseId,
      kbRefs: [...kbRefs].slice(0, 20),
      rulesFired,
      excludedKnowledgeIds: [],
      confidence,
    },
  };
}

/** Continuous design-state evaluation used by the store and Design Studio. */
export function buildWorkspaceIntelligence(
  project: ArchitectureProject,
  library: KnowledgeLibrary,
  preferences: KernelPreferences = { demoted: {} },
  selectionId?: string | null,
  workspace?: IntelligenceWorkspace,
  options?: KernelOptions,
): IntelligenceResponse {
  return evaluateArchitectureEvent(
    project,
    library,
    { kind: 'state-recomputed', ...(selectionId ? { subjectIds: [selectionId] } : {}), ...(workspace ? { workspace } : {}) },
    preferences,
    options,
  );
}
