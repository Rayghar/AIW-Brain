import type { ArchitectureBrainProposalReceipt, SolResponseQualityReceipt } from './architectureBrain.js';

export const solCalibrationLifecycleStages = [
  'requirements',
  'quality',
  'context',
  'logical',
  'realization',
  'logicalTechnology',
  'physicalTechnology',
  'review',
  'sdd',
] as const;
export type SolCalibrationLifecycleStage = (typeof solCalibrationLifecycleStages)[number];

export interface SolCalibrationScenario {
  id: string;
  lifecycleStage: SolCalibrationLifecycleStage;
  name: string;
  question: string;
  expectedSignals: string[];
  critical: boolean;
}

export interface SolCalibrationVariantResult {
  anonymousVariantId: string;
  mode: 'deterministic' | 'governed-llm';
  effectiveMode: 'deterministic-fallback' | 'llm-assisted';
  score: number;
  status: SolResponseQualityReceipt['status'];
  durationMs: number;
  recommendation: string;
  observations: string[];
  tradeOffs: string[];
  clarifyingQuestions: string[];
  citedRecordIds: string[];
  quality: SolResponseQualityReceipt;
  receipt: ArchitectureBrainProposalReceipt;
}

export interface SolCalibrationStageResult {
  scenario: SolCalibrationScenario;
  variants: SolCalibrationVariantResult[];
  passed: boolean;
  failures: string[];
  llmEqualOrBetter: boolean | null;
}

export interface SolCalibrationExpertReviewPack {
  id: string;
  generatedAt: string;
  blindedVariants: Array<{
    anonymousVariantId: string;
    scenarioId: string;
    lifecycleStage: SolCalibrationLifecycleStage;
    recommendation: string;
    observations: string[];
    tradeOffs: string[];
    clarifyingQuestions: string[];
  }>;
  rubric: Array<{
    dimension: string;
    question: string;
    weight: number;
    critical: boolean;
  }>;
  disclosure: string;
}

export interface SolCalibrationReport {
  schemaVersion: '1.0';
  releaseId: string;
  generatedAt: string;
  projectId: string;
  projectRevision: number;
  knowledgeReleaseId: string;
  providerConfigured: boolean;
  liveProviderUsed: boolean;
  stages: SolCalibrationStageResult[];
  summary: {
    scenarioCount: number;
    passedScenarios: number;
    deterministicAverage: number;
    governedLlmAverage: number | null;
    stageAlignmentRate: number;
    unsupportedClaimCount: number;
    llmRegressionCount: number;
    qualityGatePassRate: number;
  };
  expertReviewPack: SolCalibrationExpertReviewPack;
  governance: {
    productionAcceptanceClaimed: false;
    humanExpertValidationCompleted: false;
    liveProviderAcceptanceCompleted: boolean;
    directModelMutationAllowed: false;
    boundary: string;
  };
}
