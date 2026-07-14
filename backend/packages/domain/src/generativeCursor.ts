import type {
  ArchitectureEdge,
  ArchitectureInterface,
  ArchitectureNode,
  ArchitectureProject,
  ArchitectureStage,
  FindingSeverity,
  Point,
  RelationshipKind,
} from './types.js';

/**
 * Living Canvas / Generative Architecture Cursor contracts.
 *
 * These contracts intentionally sit beside the canonical architecture model rather
 * than replacing it. They describe a reviewable proposal session whose accepted
 * mutation set is the only path into the canonical project.
 */
export const generativeLifecycleStages = [
  'requirements',
  'qualityDrivers',
  'systemContext',
  'logicalApplication',
  'applicationRealization',
  'logicalTechnology',
  'physicalTechnology',
  'reviewAssurance',
  'sddPack',
] as const;
export type GenerativeLifecycleStage = (typeof generativeLifecycleStages)[number];

export const decompositionLevels = [
  'landscape',
  'system',
  'container',
  'component',
  'code',
  'deployment',
] as const;
export type DecompositionLevel = (typeof decompositionLevels)[number];

export const generativeAuthorityClasses = [
  'deterministic-required',
  'deterministic-eligible',
  'knowledge-recommended',
  'architecture-inference',
  'llm-proposed',
  'architect-created',
] as const;
export type GenerativeAuthorityClass = (typeof generativeAuthorityClasses)[number];

export const autonomyModes = ['guide', 'compose', 'draft-stage'] as const;
export type AutonomyMode = (typeof autonomyModes)[number];

export const designGestureKinds = [
  'scope-hovered',
  'scope-selected',
  'scope-opened',
  'empty-canvas-invoked',
  'decompose-requested',
  'candidate-requested',
  'candidate-previewed',
  'candidate-edited',
  'candidate-accepted',
  'candidate-rejected',
  'candidate-deferred',
  'scope-finalized',
  'stage-finalization-requested',
  'stage-handoff-accepted',
] as const;
export type DesignGestureKind = (typeof designGestureKinds)[number];

export interface DesignGestureEvent {
  id: string;
  kind: DesignGestureKind;
  occurredAt: string;
  tenantId: string;
  projectId: string;
  branchId: string;
  revision: number;
  actorId: string;
  actorRole: string;
  stage: GenerativeLifecycleStage;
  targetStage?: GenerativeLifecycleStage;
  viewpointId?: string;
  decompositionLevel?: DecompositionLevel;
  selectedScopeId?: string;
  subjectIds?: string[];
  canvasPoint?: Point;
  autonomyMode: AutonomyMode;
  payload?: Record<string, unknown>;
}

export interface RequirementRef {
  id: string;
  kind: 'objective' | 'requirement' | 'constraint' | 'assumption' | 'stakeholder-concern';
  statement: string;
  authority: 'fact' | 'assumption' | 'target' | 'proposal' | 'question' | 'verified-evidence';
}

export interface QualityScenarioRef {
  id: string;
  attribute: string;
  weight: number;
  scenario: string;
  measurable: boolean;
  calibrationState: 'approved-scoring' | 'advisory' | 'unreviewed';
}

export interface ArchitectureScopeSnapshot {
  scopeId: string;
  semanticId: string;
  kind: string;
  label: string;
  stage: ArchitectureStage;
  parentId?: string;
  childIds: string[];
  inboundRelationshipIds: string[];
  outboundRelationshipIds: string[];
  interfaceIds: string[];
  lineageFrom: string[];
  properties: Record<string, unknown>;
}

export interface GenerativeOutcomeHistoryItem {
  actionSemanticKey: string;
  outcome: 'accepted' | 'edited' | 'rejected' | 'deferred';
  reason?: string;
  at?: string;
}

export interface GenerativeDesignContext {
  schemaVersion: '1.0';
  tenantId: string;
  projectId: string;
  branchId: string;
  revision: number;
  stage: GenerativeLifecycleStage;
  targetStage: GenerativeLifecycleStage;
  architectureStage: ArchitectureStage;
  targetArchitectureStage: ArchitectureStage;
  viewpointId?: string;
  decompositionLevel?: DecompositionLevel;
  activeKnowledgeReleaseId: string;
  selectedScope?: ArchitectureScopeSnapshot;
  semanticNeighbourhood: ArchitectureScopeSnapshot[];
  unresolvedUpstreamScopeIds: string[];
  completedUpstreamScopeIds: string[];
  currentStageObjectIds: string[];
  currentStageRelationshipIds: string[];
  requirements: RequirementRef[];
  qualityScenarios: QualityScenarioRef[];
  designForces: Array<{ id: string; statement: string; weight: number; source: string }>;
  acceptedStyleIds: string[];
  acceptedPatternIds: string[];
  acceptedTacticIds: string[];
  decisionIds: string[];
  obligationIds: string[];
  findingIds: string[];
  evidenceIds: string[];
  policyIds: string[];
  openQuestionIds: string[];
  actor: { id: string; role: string; permissions: string[] };
  autonomyMode: AutonomyMode;
  recentOutcomeHistory: GenerativeOutcomeHistoryItem[];
  contextFingerprint: string;
}

export type MutationOperation =
  | { type: 'create-node'; node: ArchitectureNode }
  | { type: 'update-node'; nodeId: string; patch: Partial<ArchitectureNode> }
  | { type: 'remove-node'; nodeId: string }
  | { type: 'create-relationship'; relationship: ArchitectureEdge }
  | { type: 'update-relationship'; relationshipId: string; patch: Partial<ArchitectureEdge> }
  | { type: 'remove-relationship'; relationshipId: string }
  | { type: 'create-interface'; interface: ArchitectureInterface }
  | { type: 'update-interface'; interfaceId: string; patch: Partial<ArchitectureInterface> }
  | { type: 'remove-interface'; interfaceId: string }
  | { type: 'create-port'; nodeId: string; port: Record<string, unknown> }
  | { type: 'bind-interface'; interfaceId: string; providerId: string; consumerIds: string[] }
  | { type: 'create-boundary'; boundary: ArchitectureNode }
  | { type: 'assign-parent'; nodeId: string; parentId: string }
  | { type: 'create-lineage'; sourceId: string; targetId: string; relationship: RelationshipKind | 'decomposesTo' }
  | { type: 'accept-style'; styleId: string; scopeId?: string }
  | { type: 'accept-pattern'; patternId: string; scopeId?: string }
  | { type: 'accept-tactic'; tacticId: string; scopeId?: string }
  | { type: 'create-obligation'; obligation: { id: string; title: string; description: string; scopeId?: string; mandatory: boolean; sourceRefs: string[] } }
  | { type: 'create-risk'; risk: { id: string; title: string; description: string; severity: 'low' | 'medium' | 'high'; scopeId?: string; sourceRefs: string[] } }
  | { type: 'create-finding'; finding: { id: string; ruleId: string; severity: FindingSeverity; title: string; message: string; rationale: string; affectedNodeIds: string[]; affectedEdgeIds: string[]; mitigations: string[]; canOverride: boolean } }
  | { type: 'remove-finding'; findingId: string }
  | { type: 'create-fitness-test'; fitnessTest: { id: string; title: string; statement: string; scopeId?: string; sourceRefs: string[] } }
  | { type: 'create-decision'; decision: { id: string; title: string; context: string; decision: string; drivers: string[]; consideredOptions: string[]; consequences: string[]; status: 'proposed' | 'accepted'; createdAt: string; linkedRecordIds?: string[]; scopeNodeId?: string } }
  | { type: 'create-view'; view: Record<string, unknown> }
  | { type: 'mark-scope-state'; scopeId: string; state: 'complete' | 'deferred' | 'skipped' | 'blocked' }
  | { type: 'focus'; scopeId?: string; viewId?: string };

export interface ArchitectureMutationSet {
  id: string;
  semanticKey: string;
  idempotencyKey: string;
  projectId: string;
  branchId: string;
  basedOnRevision: number;
  basedOnKnowledgeReleaseId: string;
  contextFingerprint: string;
  title: string;
  rationale: string;
  risk: 'low' | 'medium' | 'high';
  preconditions: Array<{ code: string; description: string; satisfied: boolean }>;
  operations: MutationOperation[];
  inverseOperations: MutationOperation[];
  affectedSemanticIds: string[];
  validation: Array<{ ruleId: string; result: 'pass' | 'warn' | 'fail'; message: string }>;
  requiresHumanApproval: true;
  createdAt: string;
  expiresAt?: string;
}

export const generativeActionTypes = [
  'decompose-scope',
  'compose-local-topology',
  'create-element',
  'create-interface',
  'map-relationship',
  'apply-pattern',
  'apply-tactic',
  'resolve-obligation',
  'compare-alternatives',
  'clarify-intent',
  'finalize-scope',
  'finalize-stage',
] as const;
export type GenerativeActionType = (typeof generativeActionTypes)[number];

export interface GenerativeActionOption {
  id: string;
  semanticKey: string;
  actionType: GenerativeActionType;
  label: string;
  shortDescription: string;
  targetStage: GenerativeLifecycleStage;
  targetScopeId?: string;
  authorityClass: GenerativeAuthorityClass;
  rank: number;
  confidence: number;
  eligibility: { eligible: boolean; reasons: string[]; prerequisites: string[] };
  explanation: { whyNow: string; whyHere: string; basedOn: string[]; ifOmitted: string; alternatives: string[] };
  requirementRefs: string[];
  qualityScenarioRefs: string[];
  styleRefs: string[];
  patternRefs: string[];
  tacticRefs: string[];
  evidenceRefs: string[];
  knowledgeClaimRefs: string[];
  qualityEffects: Array<{ attribute: string; effect: 'positive' | 'negative' | 'mixed'; explanation: string }>;
  obligations: Array<{ id: string; title: string; mandatory: boolean }>;
  risks: Array<{ id: string; title: string; severity: 'low' | 'medium' | 'high' }>;
  mutationSet: ArchitectureMutationSet;
  projectedCoverageDelta?: number;
  preview: GenerativePreview;
}

export interface GenerativePreview {
  actionId: string;
  basedOnRevision: number;
  contextFingerprint: string;
  nodes: ArchitectureNode[];
  relationships: ArchitectureEdge[];
  interfaces: ArchitectureInterface[];
  removedNodeIds: string[];
  removedRelationshipIds: string[];
  summary: string;
  accessibleDescription: string;
  consequenceSummary: string[];
  validation: ArchitectureMutationSet['validation'];
}

export interface StageDecompositionSession {
  id: string;
  tenantId: string;
  projectId: string;
  branchId: string;
  basedOnRevision: number;
  sourceStage: GenerativeLifecycleStage;
  targetStage: GenerativeLifecycleStage;
  autonomyMode: AutonomyMode;
  eligibleScopeIds: string[];
  activeScopeId?: string;
  completedScopeIds: string[];
  deferredScopeIds: string[];
  skippedScopeIds: string[];
  blockedScopeIds: string[];
  unresolvedScopeIds: string[];
  unresolvedRelationshipIds: string[];
  unresolvedInterfaceIds: string[];
  acceptedActionIds: string[];
  rejectedActionIds: string[];
  pendingProposalIds: string[];
  coveragePercent: number;
  readyToFinalize: boolean;
  finalizationBlockers: string[];
  contextFingerprint: string;
  createdAt: string;
  updatedAt: string;
}

export interface StageTransformationGrammar {
  id: string;
  version: string;
  sourceStage: GenerativeLifecycleStage;
  targetStage: GenerativeLifecycleStage;
  sourceArchitectureStage: ArchitectureStage;
  targetArchitectureStage: ArchitectureStage;
  permittedSourceKinds: string[];
  permittedTargetKinds: string[];
  decompositionRules: Array<Record<string, unknown>>;
  consolidationRules: Array<Record<string, unknown>>;
  preservationRules: Array<Record<string, unknown>>;
  relationshipPropagationRules: Array<Record<string, unknown>>;
  interfaceDerivationRules: Array<Record<string, unknown>>;
  boundaryDerivationRules: Array<Record<string, unknown>>;
  qualityTacticRules: Array<Record<string, unknown>>;
  patternKitRefs: string[];
  completionRules: Array<Record<string, unknown>>;
  knowledgeReleaseId: string;
  status: 'draft' | 'approved' | 'released' | 'retired';
}

export interface GenerativeActionResult {
  project: ArchitectureProject;
  appliedActionId: string;
  appliedMutationSetId: string;
  previousRevision: number;
  nextRevision: number;
  createdNodeIds: string[];
  createdRelationshipIds: string[];
  createdInterfaceIds: string[];
  nextFocusScopeId?: string;
  audit: {
    actorId: string;
    actorRole: string;
    acceptedAt: string;
    rationale?: string;
    authorityClass: GenerativeAuthorityClass;
    contextFingerprint: string;
  };
}


export const llmCoCreationTaskKinds = [
  'clarify-intent',
  'rank-next-actions',
  'compose-local-alternatives',
  'explain-trade-offs',
  'identify-knowledge-gap',
] as const;
export type LlmCoCreationTaskKind = (typeof llmCoCreationTaskKinds)[number];

export interface LlmCoCreationClarification {
  id: string;
  question: string;
  whyItMatters: string;
  relatedRequirementRefs: string[];
  blocking: boolean;
}

export interface LlmCoCreationAlternative {
  id: string;
  title: string;
  summary: string;
  selectedActionSemanticKeys: string[];
  rationale: string;
  tradeOffs: string[];
  omittedConsequences: string[];
  citedRecordIds: string[];
  confidence: number;
}

export interface LlmCoCreationProposal {
  schemaVersion: '1.0';
  taskKind: LlmCoCreationTaskKind;
  clarifications: LlmCoCreationClarification[];
  alternatives: LlmCoCreationAlternative[];
  rankAdjustments: Array<{ actionSemanticKey: string; delta: number; reason: string }>;
  knowledgeGapSignals: Array<{ topic: string; reason: string; suggestedSourceType: string }>;
}

export interface LlmCoCreationTrace {
  providerId: string;
  model: string;
  routeId: string;
  requestFingerprint: string;
  latencyMs: number;
  fallbackUsed: boolean;
  activeKnowledgeReleaseId: string;
  doctrineVersion?: string;
}

export const mindFactoryFeedbackKinds = ['proposal-outcome', 'knowledge-gap'] as const;
export type MindFactoryFeedbackKind = (typeof mindFactoryFeedbackKinds)[number];

export const mindFactoryFeedbackStatuses = [
  'queued-for-curation',
  'recorded',
  'under-review',
  'converted-to-candidate',
  'dismissed',
] as const;
export type MindFactoryFeedbackStatus = (typeof mindFactoryFeedbackStatuses)[number];

export interface MindFactoryFeedbackReceipt {
  id: string;
  tenantId: string;
  projectId: string;
  branchId: string;
  stage: GenerativeLifecycleStage;
  feedbackKind: MindFactoryFeedbackKind;
  actionSemanticKey: string;
  actionLabel?: string;
  authorityClass: GenerativeAuthorityClass;
  outcome: 'accepted' | 'rejected' | 'deferred' | 'edited';
  reason?: string;
  topic?: string;
  suggestedSourceType?: string;
  citedRecordIds: string[];
  knowledgeReleaseId: string;
  modelTrace?: LlmCoCreationTrace;
  status: MindFactoryFeedbackStatus;
  curator?: string;
  curationNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface LivingCanvasAssistance {
  mode: 'deterministic' | 'llm-assisted' | 'deterministic-fallback';
  clarifications: LlmCoCreationClarification[];
  knowledgeGapSignals: LlmCoCreationProposal['knowledgeGapSignals'];
  trace?: LlmCoCreationTrace;
  notice: string;
}

export interface LivingCanvasActionEnvelope {
  context: GenerativeDesignContext;
  session: StageDecompositionSession;
  actions: GenerativeActionOption[];
  focusQueue: string[];
  generatedAt: string;
  deterministicOnly: boolean;
  assistance?: LivingCanvasAssistance;
  noiseBudget: number;
}
