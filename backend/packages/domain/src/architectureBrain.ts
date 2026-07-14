import type { ArchitectureEdge, ArchitectureNode } from "./types.js";

export const architectureBrainTaskKinds = [
  "design-graph-projection",
  "requirements-distillation",
  "system-context-composition",
  "design-brief-analysis",
  "stage-field-drafting",
  "living-canvas-actions",
  "explain-or-challenge",
  "design-ranking-explanation",
  "stage-guidance",
  "architecture-synthesis",
  "architecture-review",
  "assisted-audit",
  "workspace-projection",
] as const;
export type ArchitectureBrainTaskKind =
  (typeof architectureBrainTaskKinds)[number];

export interface ArchitectureKnowledgeManifest {
  schemaVersion: "1.0";
  applicationVersion: string;
  kernelVersion: string;
  lifecycleGrammarVersion: string;
  knowledgeReleaseId: string;
  patternDnaReleaseId: string;
  cambridgeRulesetId: string;
  enterprisePolicyPackIds: string[];
  llmAuthorityPolicyId: string;
  constitutionVersion: string;
  pinnedAt: string;
  fingerprint: string;
  designGraphRevision: number;
  designGraphFingerprint: string;
  designGraphProjectionMode: import('./architectureDesignGraph.js').ArchitectureDesignGraphProjectionMode;
  designGraphIntegrityHealthy: boolean;
  designGraphStateAuthorityMode: 'compatibility-projection' | 'graph-primary';
  designGraphCanonicalStateKinds: string[];
}

export interface SystemContextJourneyCoverage {
  id: string;
  name: string;
  interactionCount: number;
}

export interface SystemContextCandidate {
  schemaVersion: "1.0";
  projectRevision: number;
  systemNodeRef: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  journeyCoverage: SystemContextJourneyCoverage[];
  architectureObligations: string[];
  openCriticalQuestionCount: number;
}

export interface ArchitectureBrainAuthorityContribution {
  authority:
    | "canonical-model"
    | "deterministic-kernel"
    | "approved-knowledge"
    | "governed-llm"
    | "architect";
  responsibility: string;
  mayMutateCanonicalModel: boolean;
}


export const solQualityDimensions = [
  "stage-alignment",
  "evidence-grounding",
  "specificity",
  "clarification-discipline",
  "trade-off-quality",
  "actionability",
  "governance-transparency",
  "lineage-completeness",
] as const;
export type SolQualityDimension = (typeof solQualityDimensions)[number];

export interface SolQualityGateResult {
  dimension: SolQualityDimension;
  score: number;
  threshold: number;
  status: "passed" | "warning" | "failed";
  critical: boolean;
  rationale: string;
  evidence: string[];
}

export interface SolResponseQualityReceipt {
  schemaVersion: "1.0";
  score: number;
  status: "passed" | "conditional" | "failed";
  stageAligned: boolean;
  unsupportedClaimsDetected: string[];
  genericAdviceFlags: string[];
  gates: SolQualityGateResult[];
  issues: string[];
  evaluatedAt: string;
  evaluatorVersion: string;
}

export interface ArchitectureBrainContextReceipt {
  lifecycleStage: string;
  architectureStage: string;
  scopeLabel: string;
  included: {
    requirements: number;
    qualityScenarios: number;
    journeys: number;
    nodes: number;
    relationships: number;
    interfaces: number;
    decisions: number;
    findings: number;
    openQuestions: number;
  };
  projectTotals: {
    requirements: number;
    qualityScenarios: number;
    journeys: number;
    nodes: number;
    relationships: number;
    interfaces: number;
    decisions: number;
    findings: number;
    openQuestions: number;
  };
  excludedAsIrrelevant: Record<string, number>;
  evidenceRefs: string[];
  missingInformation: string[];
  legacyProjectionUsed: boolean;
}

export interface ArchitectureBrainReasoningReceipt {
  deterministic: string[];
  knowledgeDerived: string[];
  llmContribution: string[];
  fallbackReason?: string;
}

export interface ArchitectureBrainLineagePath {
  id: string;
  label: string;
  recordIds: string[];
  complete: boolean;
  missingLinks: string[];
}

export interface ArchitectureBrainProposalReceipt {
  schemaVersion: "1.0";
  proposalId: string;
  task: ArchitectureBrainTaskKind;
  projectId: string;
  branchId: string;
  projectRevision: number;
  stage: string;
  scopeRef?: string;
  contextFingerprint: string;
  graph: {
    revision: number;
    fingerprint: string;
    projectionMode: import('./architectureDesignGraph.js').ArchitectureDesignGraphProjectionMode;
    integrityHealthy: boolean;
    legacyProjectionUsed: boolean;
    stateAuthorityMode: 'compatibility-projection' | 'graph-primary';
    canonicalStateKinds: string[];
    lastWritePath?: import('./architectureDesignGraphState.js').ArchitectureDesignGraphWritePath;
  };
  generatedAt: string;
  manifest: ArchitectureKnowledgeManifest;
  authorityChain: ArchitectureBrainAuthorityContribution[];
  deterministicRules: string[];
  knowledgeRefs: string[];
  llm: {
    requested: boolean;
    used: boolean;
    fallbackUsed: boolean;
    providerId?: string;
    model?: string;
    routeId?: string;
    requestFingerprint?: string;
    latencyMs?: number;
  };
  governance: {
    humanApprovalRequired: true;
    directModelMutationAllowed: false;
    staleIfProjectRevisionChanges: true;
    auditRequired: true;
  };
  warnings: string[];
  context?: ArchitectureBrainContextReceipt;
  reasoning?: ArchitectureBrainReasoningReceipt;
  quality?: SolResponseQualityReceipt;
  lineagePaths?: ArchitectureBrainLineagePath[];
}

export interface ArchitectureBrainAuthorityPath {
  id: string;
  capability: string;
  category:
    "architecture-runtime" | "knowledge-supply-chain" | "operational-control";
  entryPoint: string;
  orchestrated: boolean;
  directLlmAllowed: boolean;
  mutationAuthority:
    "none" | "human-approved-change-set" | "knowledge-governance";
  owner: string;
  status:
    "consolidated" | "isolated-by-design" | "migration-required" | "blocked";
  notes: string;
}

export interface ArchitectureBrainAuthorityAudit {
  schemaVersion: "1.0";
  generatedAt: string;
  applicationVersion: string;
  controllingPrinciple: string;
  paths: ArchitectureBrainAuthorityPath[];
  summary: {
    totalPaths: number;
    consolidatedPaths: number;
    isolatedByDesignPaths: number;
    migrationRequiredPaths: number;
    blockedPaths: number;
  };
}

export type ArchitectureBrainResponse<T> = T & {
  brainReceipt: ArchitectureBrainProposalReceipt;
};
