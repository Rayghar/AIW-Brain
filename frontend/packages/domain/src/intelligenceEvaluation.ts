import type { ArchitectureStage } from './types.js';

export type RecommendationOutcomeDecision = 'accepted' | 'rejected' | 'deferred' | 'implemented' | 'superseded';

export interface RecommendationOutcomeRecord {
  id: string;
  projectId: string;
  recommendationId: string;
  recommendationType: 'style' | 'pattern' | 'tactic' | 'finding' | 'decision' | 'sol-response';
  recordId?: string | undefined;
  stage: ArchitectureStage;
  decision: RecommendationOutcomeDecision;
  reason: string;
  decidedBy: string;
  decidedAt: string;
  implementedAt?: string | undefined;
  reviewResult?: 'passed' | 'conditional' | 'failed' | undefined;
  conformanceResult?: 'conformant' | 'partial' | 'non-conformant' | undefined;
  observedOutcomes?: Record<string, number | string | boolean> | undefined;
  expectedOutcomes?: Record<string, number | string | boolean> | undefined;
  knowledgeReleaseId: string;
  /** Outcomes never modify production scoring directly. They feed reviewed proposals. */
  autoLearningApplied: false;
}

export interface CalibrationProposal {
  id: string;
  status: 'draft' | 'under-review' | 'approved' | 'rejected';
  generatedAt: string;
  generatedFromOutcomeIds: string[];
  targetRecordId?: string | undefined;
  observations: string[];
  proposedAdjustments: Array<{ dimension: string; currentValue?: number | undefined; proposedDelta: number; rationale: string }>;
  minimumSampleMet: boolean;
  requiresIndependentExpertReview: true;
  productionScoringChanged: false;
}

export interface ArchitectureIntelligenceBenchmarkResult {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
  evidence: Record<string, unknown>;
}

export interface ArchitectureIntelligenceBenchmarkReport {
  releaseId: string;
  runAt: string;
  passed: number;
  total: number;
  score: number;
  results: ArchitectureIntelligenceBenchmarkResult[];
  productionAcceptanceClaimed: false;
}
