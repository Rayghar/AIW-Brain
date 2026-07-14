import type { ArchitectureDecision, ArchitectureProject, ArchitectureStage } from './types.js';
import type { ArchitectureBlueprint, AlternativeCounterfactual, SynthesisEligibilityDecision } from './architectureBlueprint.js';
import type { PatternCompositionPlan, PatternObligation, PatternRecommendationScore } from './patternIntelligence.js';

export const synthesisStrategyIds = [
  'balanced',
  'simplicity-first',
  'resilience-first',
  'scale-first',
  'security-first',
  'cost-first',
  'modernization-first',
  'sovereign-ai-first',
] as const;
export type SynthesisStrategyId = (typeof synthesisStrategyIds)[number];

export const simulationScenarioTypes = [
  'baseline',
  'load-spike',
  'dependency-failure',
  'region-failure',
  'connectivity-loss',
  'security-incident',
  'team-capacity-reduction',
  'cost-pressure',
  'model-provider-outage',
] as const;
export type SimulationScenarioType = (typeof simulationScenarioTypes)[number];

export interface DesignBriefGap {
  id: string;
  severity: 'blocking' | 'important' | 'advisory';
  category: 'objective' | 'constraint' | 'quality-scenario' | 'assumption' | 'context' | 'governance';
  message: string;
  remediation: string;
}

export interface DesignBriefContradiction {
  id: string;
  severity: 'blocking' | 'important';
  statements: string[];
  explanation: string;
  clarificationQuestion: string;
}

export interface DesignBriefAssessment {
  assessedAt: string;
  completenessScore: number;
  synthesisReady: boolean;
  gaps: DesignBriefGap[];
  contradictions: DesignBriefContradiction[];
  clarificationQuestions: string[];
  strengths: string[];
}

export interface ArchitectureSynthesisRequest {
  project: ArchitectureProject;
  knowledgeReleaseId?: string;
  strategyIds?: SynthesisStrategyId[];
  maxAlternatives?: number;
  requireDiversity?: boolean;
  useLlmEnrichment?: boolean;
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
}

export interface AlternativeQualityProjection {
  attributeId: string;
  score: number;
  confidence: number;
  rationale: string;
}

export interface AlternativeCostProjection {
  currency: string;
  relativeClass: 'low' | 'medium' | 'high' | 'very-high';
  monthlyLow: number;
  monthlyHigh: number;
  deliveryEffortDaysLow: number;
  deliveryEffortDaysHigh: number;
  assumptions: string[];
}

export interface AlternativeRisk {
  id: string;
  category: 'architecture' | 'security' | 'reliability' | 'delivery' | 'operations' | 'cost' | 'governance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  mitigation: string;
}

export interface ArchitectureAlternativeScorecard {
  overall: number;
  contextFit: number;
  qualityFit: number;
  resilience: number;
  security: number;
  simplicity: number;
  operability: number;
  deliveryFeasibility: number;
  costEfficiency: number;
  evidenceConfidence: number;
}

export interface ArchitectureAlternative {
  id: string;
  name: string;
  strategyId: SynthesisStrategyId;
  summary: string;
  rationale: string[];
  differentiators: string[];
  patternIds: string[];
  patternRecommendations: PatternRecommendationScore[];
  compositionPlan: PatternCompositionPlan;
  projectedProject: ArchitectureProject;
  scorecard: ArchitectureAlternativeScorecard;
  qualityProjections: AlternativeQualityProjection[];
  costProjection: AlternativeCostProjection;
  obligations: PatternObligation[];
  risks: AlternativeRisk[];
  assumptions: string[];
  evidenceConnectorIds: string[];
  governanceWarnings: string[];
  eligibility: SynthesisEligibilityDecision;
  blueprint: ArchitectureBlueprint;
  llmNarrative?: {
    providerId: string;
    model: string;
    routeId: string;
    summary: string;
    tradeoffNarrative: string;
  };
}

export interface ArchitectureSynthesisRun {
  id: string;
  tenantId: string;
  projectId: string;
  branchId: string;
  projectRevision: number;
  knowledgeReleaseId: string;
  generatedAt: string;
  inputFingerprint: string;
  mode: 'deterministic' | 'llm-enriched';
  assessment: DesignBriefAssessment;
  alternatives: ArchitectureAlternative[];
  paretoAlternativeIds: string[];
  recommendedAlternativeId?: string;
  warnings: string[];
  modelTrace?: {
    providerId: string;
    model: string;
    routeId: string;
    fallbackUsed: boolean;
    requestFingerprint: string;
  };
}

export interface ArchitectureSimulationScenario {
  id: string;
  name: string;
  type: SimulationScenarioType;
  description: string;
  parameters: {
    trafficMultiplier?: number;
    dependencyAvailabilityPercent?: number;
    regionLossPercent?: number;
    networkAvailabilityPercent?: number;
    teamCapacityPercent?: number;
    budgetReductionPercent?: number;
    maliciousRequestPercent?: number;
    providerAvailabilityPercent?: number;
  };
  requiredCapabilities: string[];
}

export interface ArchitectureSimulationOutcome {
  availabilityPercent: number;
  p95LatencyMs: number;
  recoveryTimeMinutes: number;
  recoveryPointMinutes: number;
  throughputCapacityMultiplier: number;
  estimatedMonthlyCost: number;
  operationalLoadScore: number;
  securityExposureScore: number;
  deliveryRiskScore: number;
}


export type SimulationEvidenceSourceType = 'load-test' | 'runtime-telemetry' | 'chaos-test' | 'cloud-pricing' | 'incident' | 'dr-exercise' | 'expert-baseline';

export interface SimulationCalibrationEvidence {
  id: string;
  sourceType: SimulationEvidenceSourceType;
  sourceName: string;
  measuredAt: string;
  environment: string;
  scenarioType: SimulationScenarioType | 'all';
  confidence: number;
  outcome: Partial<ArchitectureSimulationOutcome>;
  notes: string[];
  evidenceUri?: string;
}

export interface SimulationCalibrationProfile {
  id: string;
  projectId: string;
  alternativeId?: string;
  createdAt: string;
  createdBy: string;
  status: 'draft' | 'reviewed' | 'approved';
  evidence: SimulationCalibrationEvidence[];
}

export interface ArchitectureSimulationFinding {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'availability' | 'performance' | 'security' | 'cost' | 'operations' | 'delivery';
  message: string;
  mitigation: string;
  relatedPatternIds: string[];
}

export interface ArchitectureSimulationResult {
  id: string;
  runId: string;
  alternativeId: string;
  scenario: ArchitectureSimulationScenario;
  simulatedAt: string;
  deterministicModelVersion: string;
  outcome: ArchitectureSimulationOutcome;
  baselineDelta: Partial<Record<keyof ArchitectureSimulationOutcome, number>>;
  findings: ArchitectureSimulationFinding[];
  assumptions: string[];
  confidence: number;
  calibrationMode?: 'default-comparative' | 'evidence-adjusted';
  calibrationProfileId?: string;
  calibrationEvidenceIds?: string[];
  confidenceBasis?: string[];
}

export interface AlternativeComparison {
  generatedAt: string;
  alternativeIds: string[];
  winnerByDimension: Record<string, string>;
  paretoAlternativeIds: string[];
  dominatedAlternativeIds: string[];
  decisionQuestions: string[];
  counterfactuals: AlternativeCounterfactual[];
  materialDifferenceMatrix: Record<string, Record<string, string>>;
}

export interface SynthesisDecisionPackage {
  id: string;
  runId: string;
  alternativeId: string;
  createdAt: string;
  status: 'proposed' | 'accepted' | 'rejected';
  rationale: string;
  architectureDecision: ArchitectureDecision;
  selectedPatternIds: string[];
  openObligationIds: string[];
  requiredApprovalStages: ArchitectureStage[];
  simulationResultIds: string[];
  artifactPaths: string[];
  conformanceTargets: string[];
  blueprintId: string;
  interfaceContractIds: string[];
  providerNeutralFirst: boolean;
  architectureViewIds: string[];
}

export interface SynthesisArtifact {
  path: string;
  mediaType: string;
  content: string;
  sourceAlternativeId: string;
  reviewRequired: boolean;
}

export interface SynthesisArtifactBundle {
  runId: string;
  alternativeId: string;
  generatedAt: string;
  files: SynthesisArtifact[];
  manifest: {
    knowledgeReleaseId: string;
    projectRevision: number;
    patternIds: string[];
    simulationResultIds: string[];
    checksums: Record<string, string>;
  };
}

export const sprint80DefaultSimulationScenarios: ArchitectureSimulationScenario[] = [
  { id: 'SIM-BASELINE', name: 'Nominal operating load', type: 'baseline', description: 'Expected production demand and normal dependency health.', parameters: { trafficMultiplier: 1, dependencyAvailabilityPercent: 99.9, networkAvailabilityPercent: 99.9, teamCapacityPercent: 100 }, requiredCapabilities: ['observability','capacity-management'] },
  { id: 'SIM-LOAD-SPIKE', name: 'Five-times demand spike', type: 'load-spike', description: 'A sudden demand increase tests elasticity, buffering and back-pressure.', parameters: { trafficMultiplier: 5, dependencyAvailabilityPercent: 99.5 }, requiredCapabilities: ['autoscaling','load-leveling','rate-limiting'] },
  { id: 'SIM-DEPENDENCY-FAILURE', name: 'Critical dependency degradation', type: 'dependency-failure', description: 'A downstream dependency becomes slow and intermittently unavailable.', parameters: { trafficMultiplier: 1.5, dependencyAvailabilityPercent: 70 }, requiredCapabilities: ['circuit-breaker','timeout','retry','fallback'] },
  { id: 'SIM-REGION-FAILURE', name: 'Primary-region outage', type: 'region-failure', description: 'The primary hosting region is unavailable.', parameters: { regionLossPercent: 100, dependencyAvailabilityPercent: 92 }, requiredCapabilities: ['multi-region','replication','failover'] },
  { id: 'SIM-CONNECTIVITY-LOSS', name: 'Intermittent connectivity', type: 'connectivity-loss', description: 'Network availability drops for mobile, edge or field users.', parameters: { networkAvailabilityPercent: 55, trafficMultiplier: 0.8 }, requiredCapabilities: ['offline-first','synchronization','idempotency'] },
  { id: 'SIM-SECURITY-INCIDENT', name: 'Elevated hostile traffic', type: 'security-incident', description: 'Hostile requests and credential abuse increase sharply.', parameters: { maliciousRequestPercent: 25, trafficMultiplier: 2 }, requiredCapabilities: ['zero-trust','rate-limiting','audit','threat-detection'] },
  { id: 'SIM-TEAM-REDUCTION', name: 'Reduced engineering capacity', type: 'team-capacity-reduction', description: 'Delivery and operations capacity falls during a critical change period.', parameters: { teamCapacityPercent: 55 }, requiredCapabilities: ['automation','platform-engineering','simplicity'] },
  { id: 'SIM-COST-PRESSURE', name: 'Thirty-percent budget reduction', type: 'cost-pressure', description: 'The run-cost envelope is reduced while service targets remain unchanged.', parameters: { budgetReductionPercent: 30 }, requiredCapabilities: ['cost-allocation','autoscaling','rightsizing'] },
  { id: 'SIM-MODEL-OUTAGE', name: 'Primary AI model provider outage', type: 'model-provider-outage', description: 'The primary model provider is unavailable or prohibited for the workload.', parameters: { providerAvailabilityPercent: 0 }, requiredCapabilities: ['model-routing','fallback','local-model','data-classification'] },
];
