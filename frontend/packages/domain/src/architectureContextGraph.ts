export const architectureContextGraphNodeKinds = [
  'source','source-section','atomic-claim','evidence','requirement','stakeholder','journey','participant','interaction','quality-driver',
  'quality-tactic','architecture-style','pattern-dna-rule','knowledge-release','policy-clause','context-package','architecture-object',
  'architecture-interface','data-entity','deployment-node','threat','security-control','decision','finding','obligation','open-question',
  'runtime-observation','fitness-test','fitness-test-result','sdd-section','sdd-paragraph',
] as const;
export type ArchitectureContextGraphNodeKind = (typeof architectureContextGraphNodeKinds)[number];

export const architectureContextGraphEdgeKinds = [
  'contains','substantiates','concerns','represented-by','participates-in','drives','constrains','derived-from','realizes',
  'communicates-with','satisfies','validates','affects','governs','depends-on','supersedes','contradicts','interprets',
  'applies-to','mitigates','observed-by','verified-by','tests','rendered-in','allocated-to','owns','implements','inferred-lineage',
] as const;
export type ArchitectureContextGraphEdgeKind = (typeof architectureContextGraphEdgeKinds)[number];

export interface ArchitectureContextGraphNode {
  id: string;
  kind: ArchitectureContextGraphNodeKind;
  label: string;
  summary: string;
  status: 'candidate'|'accepted'|'open'|'stale'|'rejected'|'approved'|'informational';
  stageRefs: string[];
  sourceObjectRef: string;
  fingerprint: string;
  metadata: Record<string, string|number|boolean|string[]>;
}

export interface ArchitectureLineageInference {
  method: 'explicit'|'semantic-label'|'tag-match'|'relationship-neighbour'|'decision-reference'|'source-evidence';
  confidence: number;
  requiresReview: boolean;
  reasons: string[];
}

export interface ArchitectureContextGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  kind: ArchitectureContextGraphEdgeKind;
  rationale: string;
  evidenceRefs: string[];
  stageRefs: string[];
  inference?: ArchitectureLineageInference;
}

export interface ArchitectureContextStageSlice {
  stage: string;
  nodeRefs: string[];
  edgeRefs: string[];
  unresolvedRefs: string[];
  staleRefs: string[];
  fingerprint: string;
}

export interface ArchitectureContextGraphCoverage {
  byNodeKind: Record<string, number>;
  byEdgeKind: Record<string, number>;
  atomicClaimCoverage: number;
  policyCoverage: number;
  runtimeObservationCoverage: number;
  sddParagraphCoverage: number;
  explicitLineageCoverage: number;
  inferredLineageCoverage: number;
  unresolvedLegacyRefs: string[];
}

export interface ArchitectureContextGraph {
  schemaVersion: '1.1';
  projectId: string;
  branchId: string;
  projectRevision: number;
  compiledAt: string;
  fingerprint: string;
  nodes: ArchitectureContextGraphNode[];
  edges: ArchitectureContextGraphEdge[];
  stageSlices: ArchitectureContextStageSlice[];
  coverage: ArchitectureContextGraphCoverage;
}

export interface ArchitectureSemanticChange {
  id: string;
  changedRef: string;
  changeKind: 'added'|'modified'|'removed'|'accepted'|'rejected';
  summary: string;
  affectedRefs: string[];
  affectedStages: string[];
  impact: 'critical'|'high'|'medium'|'low';
  detectedAt: string;
  requiresReassessment: boolean;
  lineageBasis?: 'explicit'|'high-confidence-inferred'|'mixed';
  unresolvedLegacyRefs?: string[];
}

export interface ArchitectureGraphSupplementalRecord {
  id: string;
  kind: Extract<ArchitectureContextGraphNodeKind,
    'source-section'|'atomic-claim'|'quality-tactic'|'architecture-style'|'pattern-dna-rule'|'knowledge-release'|
    'policy-clause'|'data-entity'|'deployment-node'|'threat'|'security-control'|'runtime-observation'|'fitness-test'|
    'fitness-test-result'|'sdd-section'|'sdd-paragraph'>;
  label: string;
  summary: string;
  status?: ArchitectureContextGraphNode['status'];
  stageRefs?: string[];
  sourceObjectRef?: string;
  metadata?: ArchitectureContextGraphNode['metadata'];
  links?: Array<{
    targetId: string;
    kind: ArchitectureContextGraphEdgeKind;
    rationale: string;
    evidenceRefs?: string[];
    stageRefs?: string[];
  }>;
}
