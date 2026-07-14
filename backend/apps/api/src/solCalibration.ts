import { createHash } from 'node:crypto';
import type {
  ArchitectureProject,
  SolCalibrationExpertReviewPack,
  SolCalibrationLifecycleStage,
  SolCalibrationReport,
  SolCalibrationScenario,
  SolCalibrationStageResult,
  SolCalibrationVariantResult,
} from '@aiw/domain';
import type { ArchitectureBrainOrchestrator } from './architectureBrainOrchestrator.js';
import { llmRuntimeConfigurations } from './llmRuntimeStore.js';

export const SOL_CALIBRATION_RELEASE_ID = 'AIW-0.10.0-rc.10.73.5';

export const SOL_CALIBRATION_SCENARIOS: SolCalibrationScenario[] = [
  {
    id: 'SOL-CAL-REQ-01',
    lifecycleStage: 'requirements',
    name: 'Intent, ambiguity and stakeholder completeness',
    question: 'Identify the most architecturally significant ambiguity or missing stakeholder concern in the accepted requirements. Do not invent targets; cite the records that caused the concern and propose the next clarification.',
    expectedSignals: ['requirement', 'stakeholder', 'scope', 'clarification', 'evidence'],
    critical: true,
  },
  {
    id: 'SOL-CAL-QUA-01',
    lifecycleStage: 'quality',
    name: 'Measurable quality scenario challenge',
    question: 'Which quality scenario currently provides the weakest measurable constraint on the design? Explain the missing stimulus, environment, response or response measure and the architecture consequence.',
    expectedSignals: ['quality scenario', 'measure', 'stimulus', 'response', 'trade-off'],
    critical: true,
  },
  {
    id: 'SOL-CAL-CTX-01',
    lifecycleStage: 'context',
    name: 'Boundary and journey coverage',
    question: 'Challenge the current System Context. Identify one actor, external system, journey interaction or trust-boundary crossing that is missing, weakly evidenced or incorrectly scoped.',
    expectedSignals: ['actor', 'external system', 'journey', 'boundary', 'interaction'],
    critical: true,
  },
  {
    id: 'SOL-CAL-LOG-01',
    lifecycleStage: 'logical',
    name: 'Logical responsibility decomposition',
    question: 'What is the next unresolved logical responsibility or boundary decision? Trace it to a requirement or journey and explain the coupling, ownership and alternative decomposition trade-off.',
    expectedSignals: ['responsibility', 'domain', 'ownership', 'coupling', 'journey'],
    critical: true,
  },
  {
    id: 'SOL-CAL-REA-01',
    lifecycleStage: 'realization',
    name: 'Component and interface completeness',
    question: 'Identify the most important missing component, interface, event, state responsibility or failure-handling obligation in the current application realisation. Explain why it is needed and what alternative was rejected.',
    expectedSignals: ['component', 'interface', 'event', 'state', 'failure'],
    critical: true,
  },
  {
    id: 'SOL-CAL-LTE-01',
    lifecycleStage: 'logicalTechnology',
    name: 'Provider-neutral capability reasoning',
    question: 'Which provider-neutral technology capability is still missing or weakly justified? Relate it to an accepted quality driver and avoid naming a vendor unless the project contains an approved constraint.',
    expectedSignals: ['capability', 'provider-neutral', 'quality', 'resilience', 'observability'],
    critical: true,
  },
  {
    id: 'SOL-CAL-PTE-01',
    lifecycleStage: 'physicalTechnology',
    name: 'Deployment and failure-domain reasoning',
    question: 'Challenge the physical topology for failure domains, region or zone placement, network boundaries and recovery obligations. Identify the highest-impact unresolved deployment decision without inventing RTO or RPO values.',
    expectedSignals: ['deployment', 'zone', 'failure domain', 'network', 'recovery'],
    critical: true,
  },
  {
    id: 'SOL-CAL-REV-01',
    lifecycleStage: 'review',
    name: 'Approval readiness and evidence',
    question: 'What is the strongest evidence-based blocker to architecture approval? Cite the affected finding, decision, interface, quality driver or lineage gap and recommend a concrete disposition.',
    expectedSignals: ['finding', 'evidence', 'decision', 'approval', 'disposition'],
    critical: true,
  },
  {
    id: 'SOL-CAL-SDD-01',
    lifecycleStage: 'sdd',
    name: 'Delivery-pack coherence',
    question: 'Which SDD section, diagram, decision, interface contract or implementation obligation is missing, stale or weakly evidenced? Explain the delivery risk and the next corrective action.',
    expectedSignals: ['sdd', 'section', 'evidence', 'stale', 'delivery'],
    critical: true,
  },
];

function anonymousId(projectId: string, scenarioId: string, mode: string): string {
  return `VAR-${createHash('sha256').update(`${projectId}:${scenarioId}:${mode}`).digest('hex').slice(0, 12).toUpperCase()}`;
}

function roundedAverage(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function gateScore(result: SolCalibrationVariantResult, dimension: string): number {
  return result.quality.gates.find((gate) => gate.dimension === dimension)?.score ?? 0;
}

function criticalCorrectnessIsEqualOrBetter(
  deterministic: SolCalibrationVariantResult,
  hybrid: SolCalibrationVariantResult,
): boolean {
  const criticalDimensions = [
    'stage-alignment',
    'evidence-grounding',
    'clarification-discipline',
    'governance-transparency',
  ];
  return criticalDimensions.every((dimension) => gateScore(hybrid, dimension) >= gateScore(deterministic, dimension));
}

async function runVariant(input: {
  architectureBrain: ArchitectureBrainOrchestrator;
  tenantId: string;
  project: ArchitectureProject;
  scenario: SolCalibrationScenario;
  mode: 'deterministic' | 'governed-llm';
}): Promise<SolCalibrationVariantResult> {
  const started = performance.now();
  const response = await input.architectureBrain.askSol({
    tenantId: input.tenantId,
    project: input.project,
    question: input.scenario.question,
    lifecycleStage: input.scenario.lifecycleStage,
    scopeLabel: `Whole ${input.scenario.lifecycleStage} stage`,
    dataClassification: 'internal',
    intelligenceMode: input.mode === 'deterministic' ? 'deterministic' : 'hybrid',
  });
  return {
    anonymousVariantId: anonymousId(input.project.id, input.scenario.id, input.mode),
    mode: input.mode,
    effectiveMode: response.mode,
    score: response.qualityReceipt.score,
    status: response.qualityReceipt.status,
    durationMs: Math.max(0, Math.round(performance.now() - started)),
    recommendation: response.recommendation,
    observations: response.observations,
    tradeOffs: response.tradeOffs,
    clarifyingQuestions: response.clarifyingQuestions,
    citedRecordIds: response.citedRecordIds,
    quality: response.qualityReceipt,
    receipt: response.brainReceipt,
  };
}

function buildExpertReviewPack(
  project: ArchitectureProject,
  stages: SolCalibrationStageResult[],
): SolCalibrationExpertReviewPack {
  const variants = stages.flatMap((stage) => stage.variants).map((variant) => {
    const scenario = stages.find((stage) => stage.variants.some((item) => item.anonymousVariantId === variant.anonymousVariantId))!.scenario;
    return {
      anonymousVariantId: variant.anonymousVariantId,
      scenarioId: scenario.id,
      lifecycleStage: scenario.lifecycleStage,
      recommendation: variant.recommendation,
      observations: variant.observations,
      tradeOffs: variant.tradeOffs,
      clarifyingQuestions: variant.clarifyingQuestions,
    };
  });
  return {
    id: `SOL-EXPERT-PACK-${project.id}-${project.revision}`,
    generatedAt: new Date().toISOString(),
    blindedVariants: variants.sort((a, b) => a.anonymousVariantId.localeCompare(b.anonymousVariantId)),
    rubric: [
      { dimension: 'correctness', question: 'Is the reasoning architecturally correct and free of unsupported claims?', weight: 20, critical: true },
      { dimension: 'stage-relevance', question: 'Does the answer address the exact lifecycle stage and selected scope?', weight: 15, critical: true },
      { dimension: 'evidence', question: 'Is the answer grounded in traceable project or governed-knowledge evidence?', weight: 15, critical: true },
      { dimension: 'specificity', question: 'Is the response specific enough to guide this project rather than any project?', weight: 10, critical: false },
      { dimension: 'trade-offs', question: 'Are alternatives and material consequences explained?', weight: 10, critical: false },
      { dimension: 'actionability', question: 'Can the architect take a concrete, reviewable next step?', weight: 10, critical: false },
      { dimension: 'governance', question: 'Are authority, uncertainty, evidence and human-decision boundaries clear?', weight: 10, critical: true },
      { dimension: 'trust', question: 'Would an experienced architect trust this answer after reviewing its receipt?', weight: 10, critical: false },
    ],
    disclosure: 'Variant identities are blinded. This pack does not reveal deterministic or governed-LLM mode and does not claim human expert validation until reviewers submit scores independently.',
  };
}

export async function runSolCalibration(input: {
  architectureBrain: ArchitectureBrainOrchestrator;
  tenantId: string;
  project: ArchitectureProject;
}): Promise<SolCalibrationReport> {
  const gateway = await llmRuntimeConfigurations.gateway(input.tenantId);
  const health = await gateway.health('architecture-reasoning');
  const providerConfigured = health.some((route) => route.configured && route.circuit === 'closed');
  const stageResults: SolCalibrationStageResult[] = [];

  for (const scenario of SOL_CALIBRATION_SCENARIOS) {
    const deterministic = await runVariant({ ...input, scenario, mode: 'deterministic' });
    const hybrid = await runVariant({ ...input, scenario, mode: 'governed-llm' });
    const actualLlm = hybrid.effectiveMode === 'llm-assisted';
    const llmEqualOrBetter = actualLlm ? criticalCorrectnessIsEqualOrBetter(deterministic, hybrid) : null;
    const failures: string[] = [];
    if (!deterministic.quality.stageAligned) failures.push('deterministic-stage-misalignment');
    if (deterministic.status === 'failed') failures.push('deterministic-quality-gate-failed');
    if (deterministic.quality.unsupportedClaimsDetected.length) failures.push('deterministic-unsupported-claim');
    if (actualLlm && hybrid.status === 'failed') failures.push('governed-llm-quality-gate-failed');
    if (actualLlm && !llmEqualOrBetter) failures.push('governed-llm-regressed-critical-dimension');
    stageResults.push({
      scenario,
      variants: [deterministic, hybrid],
      passed: failures.length === 0,
      failures,
      llmEqualOrBetter,
    });
  }

  const variants = stageResults.flatMap((stage) => stage.variants);
  const deterministicVariants = variants.filter((variant) => variant.mode === 'deterministic');
  const liveLlmVariants = variants.filter((variant) => variant.mode === 'governed-llm' && variant.effectiveMode === 'llm-assisted');
  const qualityGatePasses = variants.filter((variant) => variant.status !== 'failed').length;
  const liveProviderUsed = liveLlmVariants.length > 0;
  const manifest = input.architectureBrain.manifest(input.project);

  return {
    schemaVersion: '1.0',
    releaseId: SOL_CALIBRATION_RELEASE_ID,
    generatedAt: new Date().toISOString(),
    projectId: input.project.id,
    projectRevision: input.project.revision,
    knowledgeReleaseId: manifest.knowledgeReleaseId,
    providerConfigured,
    liveProviderUsed,
    stages: stageResults,
    summary: {
      scenarioCount: stageResults.length,
      passedScenarios: stageResults.filter((stage) => stage.passed).length,
      deterministicAverage: roundedAverage(deterministicVariants.map((variant) => variant.score)) ?? 0,
      governedLlmAverage: roundedAverage(liveLlmVariants.map((variant) => variant.score)),
      stageAlignmentRate: Math.round((variants.filter((variant) => variant.quality.stageAligned).length / variants.length) * 1000) / 10,
      unsupportedClaimCount: variants.reduce((sum, variant) => sum + variant.quality.unsupportedClaimsDetected.length, 0),
      llmRegressionCount: stageResults.filter((stage) => stage.llmEqualOrBetter === false).length,
      qualityGatePassRate: Math.round((qualityGatePasses / variants.length) * 1000) / 10,
    },
    expertReviewPack: buildExpertReviewPack(input.project, stageResults),
    governance: {
      productionAcceptanceClaimed: false,
      humanExpertValidationCompleted: false,
      liveProviderAcceptanceCompleted: liveProviderUsed && stageResults.every((stage) => stage.llmEqualOrBetter !== false),
      directModelMutationAllowed: false,
      boundary: liveProviderUsed
        ? 'Governed LLM variants were quality-gated and compared with deterministic variants. Human expert scoring remains mandatory before production acceptance.'
        : 'No live governed LLM route was used. Hybrid variants resolved through deterministic fallback; provider acceptance and human expert scoring remain blocked.',
    },
  };
}
