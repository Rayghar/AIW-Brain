/**
 * AIW Living Canvas / Generative Architecture Cursor contracts.
 * Target contract only; not yet wired into rc.10.65.
 */

export type LifecycleStage =
  | 'requirements'
  | 'qualityDrivers'
  | 'logicalApplication'
  | 'applicationRealization'
  | 'logicalTechnology'
  | 'physicalTechnology'
  | 'reviewAssurance'
  | 'sddPack';

export type DecompositionLevel =
  | 'landscape'
  | 'system'
  | 'container'
  | 'component'
  | 'code'
  | 'deployment';

export type GenerativeAuthorityClass =
  | 'deterministic-required'
  | 'deterministic-eligible'
  | 'knowledge-recommended'
  | 'architecture-inference'
  | 'llm-proposed'
  | 'architect-created';

export type AutonomyMode = 'guide' | 'compose' | 'draft-stage';

export type DesignGestureKind =
  | 'scope-hovered'
  | 'scope-selected'
  | 'scope-opened'
  | 'empty-canvas-invoked'
  | 'decompose-requested'
  | 'candidate-requested'
  | 'candidate-previewed'
  | 'candidate-edited'
  | 'candidate-accepted'
  | 'candidate-rejected'
  | 'candidate-deferred'
  | 'scope-finalized'
  | 'stage-finalization-requested'
  | 'stage-handoff-accepted';

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
  stage: LifecycleStage;
  targetStage?: LifecycleStage;
  viewpointId?: string;
  decompositionLevel?: DecompositionLevel;
  selectedScopeId?: string;
  subjectIds?: string[];
  canvasPoint?: { x: number; y: number };
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
  parentId?: string;
  childIds: string[];
  inboundRelationshipIds: string[];
  outboundRelationshipIds: string[];
  interfaceIds: string[];
  lineageFrom: string[];
  properties: Record<string, unknown>;
}

export interface GenerativeDesignContext {
  schemaVersion: '1.0';
  tenantId: string;
  projectId: string;
  branchId: string;
  revision: number;
  stage: LifecycleStage;
  targetStage: LifecycleStage;
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
  designForces: Array<{ id: string; statement: string; weight: number }>;
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
  recentOutcomeHistory: Array<{
    actionSemanticKey: string;
    outcome: 'accepted' | 'edited' | 'rejected' | 'deferred';
    reason?: string;
  }>;
}

export type MutationOperation =
  | { type: 'create-node'; node: Record<string, unknown> }
  | { type: 'update-node'; nodeId: string; patch: Record<string, unknown> }
  | { type: 'remove-node'; nodeId: string }
  | { type: 'create-relationship'; relationship: Record<string, unknown> }
  | { type: 'update-relationship'; relationshipId: string; patch: Record<string, unknown> }
  | { type: 'remove-relationship'; relationshipId: string }
  | { type: 'create-interface'; interface: Record<string, unknown> }
  | { type: 'update-interface'; interfaceId: string; patch: Record<string, unknown> }
  | { type: 'remove-interface'; interfaceId: string }
  | { type: 'create-port'; port: Record<string, unknown> }
  | { type: 'bind-interface'; interfaceId: string; providerId: string; consumerIds: string[] }
  | { type: 'create-boundary'; boundary: Record<string, unknown> }
  | { type: 'assign-parent'; nodeId: string; parentId: string }
  | { type: 'create-lineage'; sourceId: string; targetId: string; relationship: string }
  | { type: 'accept-style'; styleId: string; scopeId?: string }
  | { type: 'accept-pattern'; patternId: string; scopeId?: string }
  | { type: 'accept-tactic'; tacticId: string; scopeId?: string }
  | { type: 'create-obligation'; obligation: Record<string, unknown> }
  | { type: 'create-risk'; risk: Record<string, unknown> }
  | { type: 'create-finding'; finding: Record<string, unknown> }
  | { type: 'create-fitness-test'; fitnessTest: Record<string, unknown> }
  | { type: 'create-decision'; decision: Record<string, unknown> }
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
  title: string;
  rationale: string;
  risk: 'low' | 'medium' | 'high';
  preconditions: Array<{ code: string; description: string; satisfied: boolean }>;
  operations: MutationOperation[];
  inverseOperations: MutationOperation[];
  affectedSemanticIds: string[];
  validation: Array<{
    ruleId: string;
    result: 'pass' | 'warn' | 'fail';
    message: string;
  }>;
  requiresHumanApproval: true;
}

export interface GenerativeActionOption {
  id: string;
  semanticKey: string;
  actionType:
    | 'decompose-scope'
    | 'compose-local-topology'
    | 'create-element'
    | 'create-interface'
    | 'map-relationship'
    | 'apply-pattern'
    | 'apply-tactic'
    | 'resolve-obligation'
    | 'compare-alternatives'
    | 'clarify-intent'
    | 'finalize-scope'
    | 'finalize-stage';
  label: string;
  shortDescription: string;
  targetStage: LifecycleStage;
  targetScopeId?: string;
  authorityClass: GenerativeAuthorityClass;
  rank: number;
  confidence: number;
  eligibility: { eligible: boolean; reasons: string[]; prerequisites: string[] };
  explanation: {
    whyNow: string;
    whyHere: string;
    basedOn: string[];
    ifOmitted: string;
    alternatives: string[];
  };
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
}

export interface StageDecompositionSession {
  id: string;
  tenantId: string;
  projectId: string;
  branchId: string;
  basedOnRevision: number;
  sourceStage: LifecycleStage;
  targetStage: LifecycleStage;
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
  createdAt: string;
  updatedAt: string;
}

export interface StageTransformationGrammar {
  id: string;
  version: string;
  sourceStage: LifecycleStage;
  targetStage: LifecycleStage;
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
