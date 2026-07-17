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

export interface StageCoAuthorProposal {
  schemaVersion: '1.0';
  mode: 'deterministic' | 'llm-assisted' | 'deterministic-fallback';
  targetStage: StageCoAuthorTarget;
  architectureStage: ArchitectureStage;
  projectRevision: number;
  generatedAt: string;
  summary: string;
  operations: StageDraftOperation[];
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
