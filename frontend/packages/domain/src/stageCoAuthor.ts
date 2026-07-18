import type { ArchitectureStage } from './types.js';

export const stageCoAuthorTargets = [
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
export type StageCoAuthorTarget = (typeof stageCoAuthorTargets)[number];

export const stageDraftOperationKinds = [
  'replace-project-description',
  'append-objective',
  'append-constraint',
  'append-assumption',
  'upsert-quality-priority',
  'append-quality-scenario',
  'update-node-description',
  'update-node-property',
  'update-interface-field',
  'append-decision',
  'add-node',
  'add-edge',
  'add-interface',
] as const;
export type StageDraftOperationKind = (typeof stageDraftOperationKinds)[number];

export type StageDraftValidationStatus = 'ready' | 'requires-clarification' | 'blocked';
export type StageCandidateState = 'proposed' | 'under-review' | 'accepted-for-project' | 'rejected' | 'deferred' | 'stale' | 'superseded';

export type ArchitectureEvidenceStrength = 'weak' | 'moderate' | 'strong';
export type ArchitectureValidationPosture = 'fallback-seed' | 'assumption-heavy' | 'supported' | 'blocked';
export type ArchitectureObligationConcern =
  | 'business-responsibility' | 'state-ownership' | 'authority-boundary' | 'journey-coordination'
  | 'interface-contract' | 'data-ownership-lineage' | 'identity-security-trust' | 'privacy-governance'
  | 'consistency-transaction-semantics' | 'failure-compensation' | 'resilience-recovery'
  | 'observability-operations' | 'migration-coexistence' | 'human-approval-governance'
  | 'deployment-isolation';

export interface ArchitectureObligation {
  id: string;
  title: string;
  statement: string;
  concern: ArchitectureObligationConcern;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  evidenceStrength: ArchitectureEvidenceStrength;
  sourceRefs: string[];
  requirementRefs: string[];
  journeyRefs: string[];
  qualityDriverRefs: string[];
  unresolvedAssumptions: string[];
  targetStages: StageCoAuthorTarget[];
  satisfactionState: 'unaddressed' | 'proposed' | 'accepted' | 'deferred';
  subjectKey: string;
}

export interface ArchitectureCanvasDiff {
  addedNodeIds: string[];
  modifiedNodeIds: string[];
  removedNodeIds: string[];
  addedEdgeIds: string[];
  addedInterfaceIds: string[];
  affectedAcceptedObjectIds: string[];
}

export interface ArchitectureChangeAlternative {
  id: string;
  title: string;
  summary: string;
  boundaryStrategy: string;
  benefits: string[];
  tradeOffs: string[];
  risks: string[];
  hardConstraintFailures: string[];
  evidenceStrength: ArchitectureEvidenceStrength;
  operationIds: string[];
}

export interface ArchitectureChangeSet {
  id: string;
  title: string;
  architectureHypothesis: string;
  stage: StageCoAuthorTarget;
  problemAddressed: string;
  requirementRefs: string[];
  qualityDriverRefs: string[];
  obligationRefs: string[];
  operationIds: string[];
  canvasDiff: ArchitectureCanvasDiff;
  interfaceImpact: string[];
  dataSecurityImpact: string[];
  alternatives: ArchitectureChangeAlternative[];
  tradeOffs: string[];
  risks: string[];
  assumptions: string[];
  fitnessTests: string[];
  downstreamImpact: string[];
  evidenceStrength: ArchitectureEvidenceStrength;
  assumptionBurden: number;
  unresolvedCriticalQuestions: string[];
  validationPosture: ArchitectureValidationPosture;
  authority: 'candidate';
  reviewState: StageCandidateState;
}

export interface ArchitectureAttentionItem {
  id: string;
  kind: 'clarification' | 'contradiction' | 'interface-gap' | 'security-gap' | 'failure-gap' | 'evidence-gap';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  detail: string;
  relatedRefs: string[];
  actionLabel: string;
  navigationTarget: string;
}

export interface StageDraftOperation {
  id: string;
  kind: StageDraftOperationKind;
  label: string;
  targetPath: string;
  targetId?: string | undefined;
  field?: string | undefined;
  currentValue?: unknown;
  proposedValue: unknown;
  rationale: string;
  evidenceRefs: string[];
  requirementRefs: string[];
  confidence: number;
  validationStatus: StageDraftValidationStatus;
  missingInformation: string[];
  tradeOffs: string[];
  downstreamEffects: string[];
  candidateState?: StageCandidateState | undefined;
  affectedObjectIds?: string[] | undefined;
  qualityDriverRefs?: string[] | undefined;
  riskRefs?: string[] | undefined;
  decisionRefs?: string[] | undefined;
  alternatives?: string[] | undefined;
  assumptions?: string[] | undefined;
  reviewRequired?: true | undefined;
  authority?: 'candidate' | undefined;
  obligationRefs?: string[] | undefined;
  changeSetId?: string | undefined;
  evidenceStrength?: ArchitectureEvidenceStrength | undefined;
  assumptionBurden?: number | undefined;
  validationPosture?: ArchitectureValidationPosture | undefined;
}

export interface StageClarificationQuestion {
  id: string;
  question: string;
  whyItMatters: string;
  relatedFieldPaths: string[];
  blocking: boolean;
}

export interface StageExplanationComponent {
  id: string;
  label: string;
  kind: string;
  role: string;
  whySelected: string;
  enables: string[];
  driverRefs: string[];
  qualityRefs: string[];
  styleRefs: string[];
  patternRefs: string[];
  tradeOffs: string[];
  risks: string[];
  alternatives: string[];
}

export interface StageArchitectureExplanation {
  title: string;
  stagePurpose: string;
  businessOutcomeNarrative: string;
  requirementEnablement: string[];
  designLogic: string[];
  selectedComponents: StageExplanationComponent[];
  interfacesAndFlow: string[];
  qualityAttributeImpact: string[];
  tradeOffSummary: string[];
  risksAndOpenQuestions: string[];
  downstreamConsequences: string[];
  completionEvidence: string[];
}

export interface StageCoAuthorModelTrace {
  providerId: string;
  model: string;
  routeId: string;
  requestFingerprint: string;
  latencyMs: number;
  fallbackUsed: boolean;
}

export interface StageContextSummary {
  acceptedRequirementCount: number;
  acceptedJourneyCount: number;
  acceptedSequenceCount: number;
  acceptedDecisionCount: number;
  unresolvedQuestionCount: number;
  staleSequenceCount: number;
  sequenceRefs: string[];
  upstreamEvidenceRefs: string[];
}

export interface StageCoAuthorProposal {
  schemaVersion: '1.0';
  mode: 'deterministic' | 'llm-assisted' | 'deterministic-fallback';
  targetStage: StageCoAuthorTarget;
  architectureStage: ArchitectureStage;
  projectRevision: number;
  generatedAt: string;
  summary: string;
  contextSummary?: StageContextSummary | undefined;
  operations: StageDraftOperation[];
  obligations?: ArchitectureObligation[] | undefined;
  changeSets?: ArchitectureChangeSet[] | undefined;
  attentionQueue?: ArchitectureAttentionItem[] | undefined;
  clarifications: StageClarificationQuestion[];
  explanation: StageArchitectureExplanation;
  notice: string;
  trace?: StageCoAuthorModelTrace | undefined;
}

export interface ApplyStageDraftRequest {
  expectedRevision: number;
  operationIds: string[];
  proposal: StageCoAuthorProposal;
}
