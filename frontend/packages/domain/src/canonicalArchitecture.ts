import type { ArchitectureNode, ArchitectureStage, EntityKind, RelationshipKind } from './types.js';

export const architectureViewpointKinds = [
  'system-context',
  'logical-application',
  'application-realization',
  'interface-event-flow',
  'data-architecture',
  'logical-technology',
  'physical-deployment',
  'security-trust',
  'resilience-recovery',
  'cross-stage-traceability',
] as const;
export type ArchitectureViewpointKind = (typeof architectureViewpointKinds)[number];

export const transitionClassifications = ['inherited','realized','split','merged','added','unresolved','contradicted','orphaned'] as const;
export type TransitionClassification = (typeof transitionClassifications)[number];

export interface ArchitectureViewpointDefinition {
  id: ArchitectureViewpointKind;
  name: string;
  shortName: string;
  description: string;
  intent: string;
  stages: ArchitectureStage[];
  includeKinds: EntityKind[];
  includeTags: string[];
  relationshipKinds: RelationshipKind[];
}

export interface StageTransitionCandidate {
  id: string;
  sourceNodeIds: string[];
  targetStage: ArchitectureStage;
  classification: TransitionClassification;
  proposedNode: ArchitectureNode;
  proposedRelationshipKind: RelationshipKind;
  rationale: string;
  knowledgeRecordIds: string[];
  selected: boolean;
}

export interface StageTransitionCoverage {
  upstreamNodeCount: number;
  realizedUpstreamNodeCount: number;
  unresolvedUpstreamNodeIds: string[];
  orphanedTargetNodeIds: string[];
  coveragePercent: number;
}

export interface StageTransitionProposal {
  id: string;
  projectId: string;
  branchId: string;
  sourceStage: ArchitectureStage;
  targetStage: ArchitectureStage;
  createdAt: string;
  createdBy: string;
  candidates: StageTransitionCandidate[];
  coverage: StageTransitionCoverage;
  warnings: string[];
}
