import {
  AIW_RELEASE,
  sampleProject,
  type ArchitectureIntelligenceBenchmarkReport,
  type ArchitectureIntelligenceBenchmarkResult,
  type ArchitectureProject,
  type CalibrationProposal,
  type KnowledgeLibrary,
  type RecommendationOutcomeRecord,
} from '@aiw/domain';
import { recommendArchitectureStyles } from './recommendation.js';

function cloneProject(): ArchitectureProject { return structuredClone(sampleProject); }
function scoreOf(project: ArchitectureProject, library: KnowledgeLibrary, styleId: string): number {
  return recommendArchitectureStyles(project, library).find((item) => item.styleId === styleId)?.score ?? -1;
}
function result(id: string, name: string, passed: boolean, detail: string, evidence: Record<string, unknown>): ArchitectureIntelligenceBenchmarkResult {
  return { id, name, passed, detail, evidence };
}

export function runArchitectureIntelligenceBenchmarkSuite(library: KnowledgeLibrary): ArchitectureIntelligenceBenchmarkReport {
  const results: ArchitectureIntelligenceBenchmarkResult[] = [];
  const small = cloneProject();
  small.context = { ...small.context, teamSize: 6, operationalMaturity: 1, architectureExperience: 1, deliveryHorizonMonths: 4, budgetSensitivity: 5, transitionState: 'incremental-modernization', reversibilityPreference: 5, changeCadence: 'monthly' };
  small.qualityPriorities = [{ attributeId: 'scalability', weight: 4 }, { attributeId: 'modifiability', weight: 5 }];
  const smallRanking = recommendArchitectureStyles(small, library);
  const modular = smallRanking.find((item) => item.styleId === 'STYLE-MODULAR-MONOLITH');
  const microSmall = smallRanking.find((item) => item.styleId === 'STYLE-MICROSERVICES');
  results.push(result('BENCH-CONTEXT-SMALL-TEAM', 'Small low-maturity team avoids distributed overreach', Boolean(modular && microSmall && modular.score > microSmall.score), 'A cohesive evolutionary style should outrank microservices under a small, low-maturity and cost-sensitive context.', { modularMonolith: modular?.score, microservices: microSmall?.score, microFeasibility: microSmall?.feasibility }));

  const mature = cloneProject();
  mature.context = { ...mature.context, teamSize: 45, operationalMaturity: 5, architectureExperience: 5, budgetSensitivity: 2, deliveryHorizonMonths: 18, changeCadence: 'daily', peakLoadVariability: 'bursty', supportModel: 'product-team', transitionState: 'greenfield' };
  mature.qualityPriorities = [{ attributeId: 'scalability', weight: 5 }, { attributeId: 'deployability', weight: 5 }, { attributeId: 'availability', weight: 4 }];
  const microMature = recommendArchitectureStyles(mature, library).find((item) => item.styleId === 'STYLE-MICROSERVICES');
  results.push(result('BENCH-CONTEXT-RESPONSIVENESS', 'Context changes materially alter distributed-style suitability', Boolean(microSmall && microMature && microMature.score > microSmall.score), 'Microservices suitability should improve when team scale, experience, maturity and release cadence improve.', { smallTeamScore: microSmall?.score, matureTeamScore: microMature?.score }));

  const portable = cloneProject();
  portable.context = { ...portable.context, sovereigntyRequirements: [], architectureExperience: 4, operationalMaturity: 4 };
  const sovereign = structuredClone(portable);
  sovereign.context.sovereigntyRequirements = ['Workloads and data must remain portable across approved jurisdictions.'];
  const serverlessPortable = scoreOf(portable, library, 'STYLE-SERVERLESS');
  const serverlessSovereign = scoreOf(sovereign, library, 'STYLE-SERVERLESS');
  results.push(result('BENCH-SOVEREIGNTY', 'Sovereignty reduces provider-dependent suitability', serverlessSovereign < serverlessPortable, 'Provider-dependent styles should be penalized when sovereignty and portability constraints exist.', { portable: serverlessPortable, sovereign: serverlessSovereign }));

  const stable = cloneProject(); stable.context.peakLoadVariability = 'stable';
  const bursty = structuredClone(stable); bursty.context.peakLoadVariability = 'bursty';
  const spaceStable = scoreOf(stable, library, 'STYLE-SPACE-BASED');
  const spaceBursty = scoreOf(bursty, library, 'STYLE-SPACE-BASED');
  results.push(result('BENCH-ELASTICITY', 'Validated burstiness changes elastic-style ranking', spaceBursty > spaceStable, 'Elastic styles should improve when the workload is explicitly bursty.', { stable: spaceStable, bursty: spaceBursty }));

  const incomplete = cloneProject(); incomplete.context = { teamSize: 8 };
  const complete = cloneProject(); complete.context = { ...complete.context, teamSize: 8, architectureExperience: 4, organizationalChangeReadiness: 4, deploymentModel: 'hybrid', dataSensitivity: 'confidential', transitionState: 'greenfield', reversibilityPreference: 3, supportModel: 'hybrid', changeCadence: 'weekly', peakLoadVariability: 'seasonal', teamTopology: 'product-aligned teams' };
  const incompleteTop = recommendArchitectureStyles(incomplete, library)[0];
  const completeTop = recommendArchitectureStyles(complete, library)[0];
  results.push(result('BENCH-CONFIDENCE-DECOMPOSITION', 'Context completeness changes confidence without fabricating certainty', Boolean(incompleteTop && completeTop && completeTop.confidence.contextCompleteness > incompleteTop.confidence.contextCompleteness && completeTop.confidence.modelInterpretation === null), 'Confidence must expose context completeness and show that deterministic ranking did not use an LLM.', { incomplete: incompleteTop?.confidence, complete: completeTop?.confidence }));

  const baseline = cloneProject();
  baseline.qualityPriorities = [{ attributeId: 'availability', weight: 5 }];
  const withDraft = structuredClone(baseline);
  withDraft.qualityPriorities.push({ attributeId: 'security', weight: 5 });
  const baseOrder = recommendArchitectureStyles(baseline, library).map((item) => item.styleId).join('>');
  const draftOrder = recommendArchitectureStyles(withDraft, library).map((item) => item.styleId).join('>');
  const securityRecord = library.qualityAttributes.find((item) => item.id === 'security');
  results.push(result('BENCH-CALIBRATION-GATE', 'Unapproved quality calibration cannot silently influence ranking', securityRecord?.calibrated === true || baseOrder === draftOrder, 'A non-calibrated driver must be disclosed and excluded from deterministic scoring.', { securityCalibrated: securityRecord?.calibrated, orderUnchanged: baseOrder === draftOrder }));


  const lowRegulation = cloneProject();
  lowRegulation.context = { ...lowRegulation.context, teamSize: 30, operationalMaturity: 5, architectureExperience: 5, regulatoryExposure: 'low', dataSensitivity: 'internal', supportModel: 'product-team', organizationalChangeReadiness: 5 };
  const highRegulation = structuredClone(lowRegulation);
  highRegulation.context.regulatoryExposure = 'high';
  highRegulation.context.dataSensitivity = 'restricted';
  const microLowRegulation = scoreOf(lowRegulation, library, 'STYLE-MICROSERVICES');
  const microHighRegulation = scoreOf(highRegulation, library, 'STYLE-MICROSERVICES');
  results.push(result('BENCH-REGULATED-DISTRIBUTION', 'Regulatory and restricted-data burden changes distributed-style suitability', microHighRegulation < microLowRegulation, 'A distributed style must not retain the same suitability when regulatory evidence, restricted-data lineage and control burdens materially increase.', { lowRegulation: microLowRegulation, highRegulation: microHighRegulation }));

  const changeReady = cloneProject();
  changeReady.context = { ...changeReady.context, teamSize: 32, operationalMaturity: 4, architectureExperience: 4, organizationalChangeReadiness: 5, supportModel: 'product-team', changeCadence: 'daily' };
  const changeUnready = structuredClone(changeReady);
  changeUnready.context.organizationalChangeReadiness = 1;
  const microChangeReady = scoreOf(changeReady, library, 'STYLE-MICROSERVICES');
  const microChangeUnready = scoreOf(changeUnready, library, 'STYLE-MICROSERVICES');
  results.push(result('BENCH-ORGANISATIONAL-FEASIBILITY', 'Organisational change readiness affects independently deployable styles', microChangeUnready < microChangeReady, 'Independent deployment should not be recommended as though organisational ownership and change readiness were irrelevant.', { changeReady: microChangeReady, changeUnready: microChangeUnready }));

  const productSupport = cloneProject();
  productSupport.context = { ...productSupport.context, teamSize: 28, operationalMaturity: 4, architectureExperience: 4, supportModel: 'product-team', organizationalChangeReadiness: 4 };
  const centralSupport = structuredClone(productSupport);
  centralSupport.context.supportModel = 'central-operations';
  const microProductSupport = scoreOf(productSupport, library, 'STYLE-MICROSERVICES');
  const microCentralSupport = scoreOf(centralSupport, library, 'STYLE-MICROSERVICES');
  results.push(result('BENCH-OPERATING-MODEL', 'Support ownership changes high-overhead style feasibility', microCentralSupport < microProductSupport, 'A central operations bottleneck should reduce the suitability of styles that multiply operational ownership and deployables.', { productTeam: microProductSupport, centralOperations: microCentralSupport }));

  const greenfieldTransition = cloneProject();
  greenfieldTransition.context = { ...greenfieldTransition.context, transitionState: 'greenfield', teamSize: 12, operationalMaturity: 3, architectureExperience: 3, reversibilityPreference: 4 };
  const coexistenceTransition = structuredClone(greenfieldTransition);
  coexistenceTransition.context.transitionState = 'coexistence';
  coexistenceTransition.context.legacyConstraints = ['Mainframe ledger remains authoritative during staged migration.'];
  const modularGreenfield = scoreOf(greenfieldTransition, library, 'STYLE-MODULAR-MONOLITH');
  const modularCoexistence = scoreOf(coexistenceTransition, library, 'STYLE-MODULAR-MONOLITH');
  const serviceGreenfield = scoreOf(greenfieldTransition, library, 'STYLE-SERVICE-BASED');
  const serviceCoexistence = scoreOf(coexistenceTransition, library, 'STYLE-SERVICE-BASED');
  results.push(result('BENCH-TRANSITION-ARCHITECTURE', 'Legacy coexistence rewards evolutionary and coarse-grained transition boundaries', modularCoexistence > modularGreenfield && serviceCoexistence > serviceGreenfield, 'A transition architecture should react to coexistence and legacy constraints rather than ranking only a hypothetical clean end state.', { modularGreenfield, modularCoexistence, serviceGreenfield, serviceCoexistence }));

  const providerFlexible = cloneProject();
  providerFlexible.context = { ...providerFlexible.context, problemShapes: ['event-trigger','bursty'], peakLoadVariability: 'bursty', operationalMaturity: 4, architectureExperience: 4, supportModel: 'managed-service', reversibilityPreference: 2 };
  const providerReversible = structuredClone(providerFlexible);
  providerReversible.context.reversibilityPreference = 5;
  const serverlessFlexible = scoreOf(providerFlexible, library, 'STYLE-SERVERLESS');
  const serverlessReversible = scoreOf(providerReversible, library, 'STYLE-SERVERLESS');
  results.push(result('BENCH-REVERSIBILITY', 'Reversibility preference changes provider-dependent suitability', serverlessReversible < serverlessFlexible, 'A high reversibility requirement should reduce suitability for provider-dependent runtime semantics even where elasticity is attractive.', { flexibleCommitment: serverlessFlexible, highReversibility: serverlessReversible }));

  const top = recommendArchitectureStyles(complete, library)[0];
  results.push(result('BENCH-DEFENSIBILITY', 'Recommendations expose alternatives, triggers and conservative outcome confidence', Boolean(top && top.alternativesConsidered.length && top.changeTriggers.length && top.confidence.outcome < 70), 'A recommendation should explain alternatives, what could change it and the limited empirical basis.', { topStyle: top?.styleId, alternatives: top?.alternativesConsidered.length, triggers: top?.changeTriggers, outcomeConfidence: top?.confidence.outcome }));

  const passed = results.filter((item) => item.passed).length;
  return { releaseId: AIW_RELEASE.version, runAt: new Date().toISOString(), passed, total: results.length, score: Math.round(passed / Math.max(1, results.length) * 100), results, productionAcceptanceClaimed: false };
}

export function createRecommendationOutcome(input: Omit<RecommendationOutcomeRecord, 'id' | 'decidedAt' | 'autoLearningApplied'> & { decidedAt?: string }): RecommendationOutcomeRecord {
  return { ...input, id: `outcome-${crypto.randomUUID()}`, decidedAt: input.decidedAt ?? new Date().toISOString(), autoLearningApplied: false };
}

export function buildGovernedCalibrationProposal(outcomes: RecommendationOutcomeRecord[], targetRecordId?: string): CalibrationProposal {
  const relevant = targetRecordId ? outcomes.filter((item) => item.recordId === targetRecordId) : outcomes;
  const accepted = relevant.filter((item) => ['accepted','implemented'].includes(item.decision));
  const rejected = relevant.filter((item) => item.decision === 'rejected');
  const minimumSampleMet = relevant.length >= 5;
  const observations = [
    `${relevant.length} reviewed outcome(s) are included.`,
    `${accepted.length} accepted or implemented; ${rejected.length} rejected.`,
    'No production scoring has been changed. Independent expert review and a signed knowledge release remain mandatory.',
  ];
  const rejectionRate = relevant.length ? rejected.length / relevant.length : 0;
  return {
    id: `calibration-proposal-${crypto.randomUUID()}`,
    status: 'draft', generatedAt: new Date().toISOString(), generatedFromOutcomeIds: relevant.map((item) => item.id),
    ...(targetRecordId ? { targetRecordId } : {}), observations,
    proposedAdjustments: minimumSampleMet && rejectionRate >= .6 ? [{ dimension: 'context-fit', proposedDelta: -5, rationale: `The recommendation was rejected in ${Math.round(rejectionRate * 100)}% of reviewed outcomes; investigate missing context rules before any scoring change.` }] : [],
    minimumSampleMet, requiresIndependentExpertReview: true, productionScoringChanged: false,
  };
}
