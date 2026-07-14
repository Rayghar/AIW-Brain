import type { ArchitectureStage } from './types.js';

export const architectureOutcomeScenarioKinds = [
  'regulated-payments',
  'digital-banking-channel',
  'event-driven-order-fulfilment',
  'high-volume-api-platform',
  'data-sensitive-analytics',
  'multi-region-resilient-service',
  'legacy-modernisation',
] as const;
export type ArchitectureOutcomeScenarioKind = (typeof architectureOutcomeScenarioKinds)[number];

export const architectureEvaluationModes = [
  'conventional-baseline',
  'deterministic-aiw',
  'governed-llm-aiw',
] as const;
export type ArchitectureEvaluationMode = (typeof architectureEvaluationModes)[number];

export const architectureOutcomeDimensions = [
  'requirement-coverage',
  'architecture-correctness',
  'quality-driver-fit',
  'pattern-suitability',
  'interface-completeness',
  'data-architecture',
  'security',
  'resilience',
  'operational-readiness',
  'traceability',
  'explainability',
  'sdd-quality',
] as const;
export type ArchitectureOutcomeDimension = (typeof architectureOutcomeDimensions)[number];

export interface ArchitectureOutcomeScenario {
  id: string;
  name: string;
  kind: ArchitectureOutcomeScenarioKind;
  description: string;
  businessObjectives: string[];
  stakeholderConcerns: string[];
  qualityDrivers: string[];
  constraints: string[];
  expectedConcerns: string[];
  deliberateTraps: string[];
  requiredStages: ArchitectureStage[];
  requiredPatternIds: string[];
  acceptanceEvidence: string[];
  projectIds: string[];
}

export interface ArchitectureOutcomeDimensionScore {
  dimension: ArchitectureOutcomeDimension;
  label: string;
  score: number;
  threshold: number;
  status: 'passed' | 'warning' | 'failed';
  rationale: string;
  evidence: string[];
  critical: boolean;
}

export interface ArchitectureEvaluationModeResult {
  mode: ArchitectureEvaluationMode;
  label: string;
  score: number;
  correctnessScore: number;
  governanceScore: number;
  estimatedMinutes: number;
  evidenceClass: 'reference-estimate' | 'system-evaluated' | 'expert-reviewed';
  dimensionScores: ArchitectureOutcomeDimensionScore[];
  strengths: string[];
  gaps: string[];
  recommendationAcceptanceRate?: number;
  editDistancePercent?: number;
}

export interface ArchitectureOutcomeScenarioResult {
  scenarioId: string;
  name: string;
  kind: ArchitectureOutcomeScenarioKind;
  readiness: 'ready-for-expert-review' | 'conditional' | 'not-ready';
  modeResults: ArchitectureEvaluationModeResult[];
  bestMode: ArchitectureEvaluationMode;
  criticalFailures: string[];
  expertReviewQuestions: string[];
  lifecycleCoverage: Array<{ stage: ArchitectureStage; objectCount: number; relationshipCount: number; lineageCoverage: number }>;
}

export interface BlindedExpertReviewPack {
  id: string;
  generatedAt: string;
  scenarioIds: string[];
  anonymizedVariantIds: string[];
  rubric: Array<{
    dimension: ArchitectureOutcomeDimension;
    label: string;
    question: string;
    weight: number;
    critical: boolean;
  }>;
  recommendationClassifications: Array<'correct' | 'reasonable-alternative' | 'incomplete' | 'unnecessary' | 'contextually-wrong' | 'potentially-harmful'>;
  disclosure: string;
}

export interface NavigationUxObservation {
  id: string;
  viewport: 'wide-desktop' | 'desktop' | 'laptop' | 'mobile';
  roleId: string;
  destination: string;
  severity: 'blocker' | 'significant' | 'advisory';
  category: 'orientation' | 'overflow' | 'focus' | 'active-state' | 'density' | 'dead-path' | 'responsive-behaviour';
  message: string;
  remediation: string;
  resolved: boolean;
}

export interface ArchitectureOutcomeBenchmarkReport {
  id: string;
  releaseId: string;
  applicationVersion: string;
  knowledgeReleaseId: string;
  grammarVersion: string;
  patternDnaVersion: string;
  providerPolicyVersion: string;
  generatedAt: string;
  scenarios: ArchitectureOutcomeScenarioResult[];
  summary: {
    scenarioCount: number;
    readyForExpertReview: number;
    conditional: number;
    notReady: number;
    deterministicAverage: number;
    governedLlmAverage: number;
    estimatedTimeReductionPercent: number;
    criticalFailureCount: number;
  };
  expertReviewPack: BlindedExpertReviewPack;
  navigationUx: {
    observations: NavigationUxObservation[];
    unresolvedBlockers: number;
    resolvedCount: number;
    testedViewports: string[];
  };
  governance: {
    productionAcceptanceClaimed: false;
    humanExpertValidationCompleted: boolean;
    conventionalBaselineMeasuredWithHumanParticipants: boolean;
    llmHasCanonicalMutationAuthority: false;
    candidateKnowledgeCanScore: false;
    deterministicFallbackRequired: true;
    boundary: string;
  };
}
