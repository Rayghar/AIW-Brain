import type {
  ArchitectureProject,
  ArchitectureStage,
  ArchitectureStyleRecord,
  KnowledgeLibrary,
  RecommendationContribution,
  RecommendationConfidenceBreakdown,
  RecommendationFeasibility,
  RecommendationScore,
} from '@aiw/domain';
import { recommendationCalibrationRules } from './recommendationCalibration.js';

const lowerIsBetter = new Set(['operationalComplexity']);

function normalizeRating(attribute: string, rating: number): number {
  const bounded = Math.max(1, Math.min(5, rating));
  return lowerIsBetter.has(attribute) ? 6 - bounded : bounded;
}

function targetRecommendationStage(stage: ArchitectureStage): ArchitectureStage {
  return stage === 'designIntent' ? 'logicalApplication' : stage;
}

function normalizedText(project: ArchitectureProject): string {
  return [project.name, project.description, ...project.objectives, ...project.constraints, ...project.assumptions].join(' ').toLowerCase();
}

function contextSignals(project: ArchitectureProject): Set<string> {
  const text = normalizedText(project);
  const signals = new Set<string>(project.context.problemShapes ?? []);
  const patterns: Array<[string, RegExp]> = [
    ['batch', /\bbatch\b/], ['stream', /stream|pipeline/], ['transformation', /transform|etl|processing stages/],
    ['plugin', /plugin|extension/], ['extension', /extensib|custom module/], ['product-line', /product line|platform product/],
    ['extreme-scale', /extreme scale|internet scale|massive scale/], ['high-volume', /high volume|millions|billion/],
    ['spiky-load', /spiky|bursty|variable load|traffic spike/], ['bursty', /bursty|spiky/], ['event-trigger', /event trigger|event-driven/],
    ['variable-load', /variable load|seasonal demand/], ['enterprise-integration', /enterprise integration|shared service bus|soa/],
    ['heterogeneous', /heterogeneous|multiple platforms|many systems/], ['legacy', /legacy|mainframe|moderni/],
  ];
  for (const [signal, pattern] of patterns) if (pattern.test(text)) signals.add(signal);
  if (project.context.transitionState && project.context.transitionState !== 'greenfield') signals.add('legacy');
  if (['bursty','unpredictable'].includes(project.context.peakLoadVariability ?? '')) signals.add('variable-load');
  return signals;
}

function applicabilityDisqualifiers(style: ArchitectureStyleRecord, project: ArchitectureProject): string[] {
  const reasons: string[] = [];
  const targetStage = targetRecommendationStage(project.activeStage);
  if (!style.applicableStages.includes(targetStage)) reasons.push(`Not applicable to the ${targetStage} architecture stage.`);
  const rule = style.applicability ?? {};
  const teamSize = project.context.teamSize;
  const maturity = project.context.operationalMaturity;
  if (teamSize !== undefined && rule.minTeamSize !== undefined && teamSize < rule.minTeamSize) reasons.push(`Requires a team size of at least ${rule.minTeamSize}; the current context records ${teamSize}.`);
  if (teamSize !== undefined && rule.maxTeamSize !== undefined && teamSize > rule.maxTeamSize) reasons.push(`Calibrated for teams of at most ${rule.maxTeamSize}; the current context records ${teamSize}.`);
  if (maturity !== undefined && rule.minOperationalMaturity !== undefined && maturity < rule.minOperationalMaturity) reasons.push(`Requires operational maturity ${rule.minOperationalMaturity}/5 or higher; the current context records ${maturity}/5.`);
  if (project.context.deliveryHorizonMonths !== undefined && rule.maxDeliveryHorizonMonths !== undefined && project.context.deliveryHorizonMonths > rule.maxDeliveryHorizonMonths) reasons.push(`Designed for a delivery horizon no longer than ${rule.maxDeliveryHorizonMonths} months.`);
  const signals = contextSignals(project);
  const required = rule.requiredContextSignals ?? [];
  if (required.length && !required.some((signal) => signals.has(signal))) reasons.push(`No required context signal was detected (${required.join(', ')}).`);
  const excluded = (rule.excludedContextSignals ?? []).filter((signal) => signals.has(signal));
  if (excluded.length) reasons.push(`The context contains excluded signal(s): ${excluded.join(', ')}.`);
  return reasons;
}

function technologyPolicy(style: ArchitectureStyleRecord, project: ArchitectureProject): { disqualifiers: string[]; notes: string[] } {
  const prohibited = new Set((project.context.prohibitedTechnologies ?? []).map((item) => item.toLowerCase()));
  const requiredBlocked = (style.requiredTechnologies ?? []).filter((item) => prohibited.has(item.toLowerCase()));
  const optionalBlocked = (style.technologyRealizations ?? []).filter((item) => prohibited.has(item.toLowerCase()));
  return {
    disqualifiers: requiredBlocked.map((item) => `A mandatory realization technology (${item}) is prohibited by policy.`),
    notes: optionalBlocked.length ? [`The following optional realization mappings are prohibited and will be excluded: ${optionalBlocked.join(', ')}.`] : [],
  };
}

const contextFields: Array<{ key: keyof ArchitectureProject['context']; label: string }> = [
  { key: 'teamSize', label: 'team size' }, { key: 'deliveryHorizonMonths', label: 'delivery horizon' },
  { key: 'operationalMaturity', label: 'operational maturity' }, { key: 'architectureExperience', label: 'architecture experience' },
  { key: 'budgetSensitivity', label: 'budget sensitivity' }, { key: 'regulatoryExposure', label: 'regulatory exposure' },
  { key: 'deploymentModel', label: 'deployment model' }, { key: 'dataSensitivity', label: 'data sensitivity' },
  { key: 'transitionState', label: 'transition state' }, { key: 'reversibilityPreference', label: 'reversibility preference' },
  { key: 'supportModel', label: 'support model' }, { key: 'changeCadence', label: 'change cadence' },
  { key: 'peakLoadVariability', label: 'load variability' }, { key: 'teamTopology', label: 'team topology' },
];

function present(value: unknown): boolean {
  return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '';
}

function assessContext(project: ArchitectureProject): { completeness: number; gaps: string[] } {
  const gaps = contextFields.filter((field) => !present(project.context[field.key])).map((field) => field.label);
  return { completeness: Math.round(((contextFields.length - gaps.length) / contextFields.length) * 100), gaps };
}

function evidenceCount(style: ArchitectureStyleRecord): number { return Array.isArray(style.evidence) ? style.evidence.length : 0; }
function clamp(value: number): number { return Math.max(0, Math.min(100, Math.round(value))); }

function initialConfidence(style: ArchitectureStyleRecord, contextCompleteness: number, calibratedWeight: number, priorityWeight: number, rules: number): RecommendationConfidenceBreakdown {
  const evidence = clamp(42 + Math.min(35, evidenceCount(style) * 9) + (style.status === 'approved' ? 12 : 0));
  const deterministicRule = clamp(58 + (calibratedWeight > 0 ? 22 : 0) + Math.min(15, rules * 3) + (priorityWeight > 0 && calibratedWeight >= priorityWeight * .7 ? 5 : 0));
  const outcome = clamp(25 + Math.min(20, evidenceCount(style) * 4));
  const stability = clamp(45 + contextCompleteness * .25 + deterministicRule * .15);
  const overall = clamp(evidence * .24 + contextCompleteness * .22 + deterministicRule * .30 + outcome * .14 + stability * .10);
  return {
    evidence, contextCompleteness, deterministicRule, outcome, modelInterpretation: null, stability, overall,
    basis: [
      `${evidenceCount(style)} approved evidence reference(s) are attached to the style record.`,
      `${calibratedWeight} calibrated driver weight is represented in the score.`,
      `Project context is ${contextCompleteness}% complete.`,
      'Outcome confidence remains conservative until comparable implementation telemetry is approved.',
      'No LLM output is used to determine the deterministic style rank.',
    ],
  };
}

function feasibilityFor(eligible: boolean, score: number, delta: number, completeness: number): RecommendationFeasibility {
  if (!eligible) return 'infeasible';
  if (score < 42 || delta <= -14) return 'weak';
  if (score < 70 || completeness < 70 || delta <= -7) return 'conditional';
  return 'strong';
}

function triggerList(style: ArchitectureStyleRecord, project: ArchitectureProject, contextGaps: string[]): string[] {
  const traits = new Set(style.traits ?? []);
  const triggers = contextGaps.slice(0, 3).map((gap) => `Provide ${gap}; incomplete context can change the ranking.`);
  if (traits.has('distributed')) triggers.push('A material change in team size, operating maturity or ownership model can change this recommendation.');
  if (traits.has('elastic')) triggers.push('Validate the peak-load distribution and scaling evidence; stable demand can remove the elastic-style advantage.');
  if (traits.has('provider-dependent')) triggers.push('Sovereignty, portability or vendor-policy changes can materially reduce suitability.');
  if (traits.has('cohesive-deployment')) triggers.push('Sustained independent release or selective-scaling pressure can favor a more distributed style.');
  if ((project.context.legacyConstraints?.length ?? 0) > 0) triggers.push('Resolve or change the recorded legacy constraints and recalculate the transition recommendation.');
  return [...new Set(triggers)].slice(0, 6);
}

export function recommendArchitectureStyles(project: ArchitectureProject, library: KnowledgeLibrary): RecommendationScore[] {
  const attributes = new Map(library.qualityAttributes.map((attribute) => [attribute.id, attribute]));
  const requested = project.qualityPriorities.filter((priority) => priority.weight > 0);
  const isCalibrated = (attributeId: string) => attributes.size === 0 ? true : attributes.get(attributeId)?.calibrated === true;
  const priorities = requested.filter((priority) => isCalibrated(priority.attributeId));
  const ignoredPriorityIds = requested.filter((priority) => !isCalibrated(priority.attributeId)).map((priority) => priority.attributeId);
  const totalWeight = priorities.reduce((sum, priority) => sum + priority.weight, 0);
  const context = assessContext(project);

  const scored = library.architectureStyles.map((style) => {
    const disqualifiers = applicabilityDisqualifiers(style, project);
    const strengths: string[] = [];
    const tradeoffs: string[] = [];
    const assumptions: string[] = [];
    const contributions: RecommendationContribution[] = [];
    let weighted = 0;

    for (const priority of priorities) {
      const raw = style.qualityAttributeRatings[priority.attributeId];
      if (raw === undefined) {
        assumptions.push(`The approved calibration has no ${priority.attributeId} rating for ${style.id}; its weight was excluded rather than replaced with a neutral value.`);
        continue;
      }
      const normalized = normalizeRating(priority.attributeId, raw);
      const points = normalized * priority.weight;
      weighted += points;
      contributions.push({ attributeId: priority.attributeId, weight: priority.weight, rating: raw, normalizedRating: normalized, points, calibrated: true });
      if (normalized >= 4 && priority.weight >= 4) strengths.push(`${priority.attributeId} is a strong calibrated fit.`);
      if (normalized <= 2 && priority.weight >= 4) tradeoffs.push(`${priority.attributeId} is a material calibrated trade-off.`);
    }

    if (ignoredPriorityIds.length) assumptions.push(`Pending calibration and excluded from scoring: ${ignoredPriorityIds.join(', ')}.`);
    if (!totalWeight) assumptions.push('No calibrated quality driver is currently weighted; the base score is neutral and context rules only are applied.');
    if (context.gaps.length) assumptions.push(`Context completeness is ${context.completeness}%; missing: ${context.gaps.join(', ')}.`);

    const technology = technologyPolicy(style, project);
    disqualifiers.push(...technology.disqualifiers);
    assumptions.push(...technology.notes);

    const contextAdjustments = recommendationCalibrationRules.filter((rule) => rule.applies(style, project)).map((rule) => ({ ruleId: rule.id, delta: rule.delta, explanation: rule.explanation }));
    assumptions.push(...contextAdjustments.map((item) => item.explanation));

    const baseScore = totalWeight > 0 && contributions.length > 0 ? (weighted / (contributions.reduce((sum, item) => sum + item.weight, 0) * 5)) * 100 : 50;
    const delta = contextAdjustments.reduce((sum, item) => sum + item.delta, 0);
    const score = Math.max(0, Math.min(100, Math.round((baseScore + delta) * 10) / 10));
    const calibratedWeight = contributions.reduce((sum, item) => sum + item.weight, 0);
    const confidence = initialConfidence(style, context.completeness, calibratedWeight, totalWeight, contextAdjustments.length);
    const eligible = disqualifiers.length === 0;
    const whyRankedHere = [
      ...(strengths.length ? strengths.slice(0, 2) : [`The calibrated driver score contributes ${baseScore.toFixed(1)} before context adjustments.`]),
      ...(contextAdjustments.length ? [`Context changes the score by ${delta >= 0 ? '+' : ''}${delta} points.`] : ['No material context adjustment was triggered.']),
      `Feasibility is ${feasibilityFor(eligible, score, delta, context.completeness)} with ${context.completeness}% context completeness.`,
    ];

    return {
      styleId: style.id, styleName: style.name, score, eligible,
      feasibility: feasibilityFor(eligible, score, delta, context.completeness),
      disqualifiers, strengths: strengths.slice(0, 4), tradeoffs: tradeoffs.slice(0, 4), assumptions,
      obligations: style.obligations, contributions, calibratedWeight, ignoredPriorityIds, contextAdjustments,
      confidence, contextGaps: context.gaps, changeTriggers: triggerList(style, project, context.gaps), whyRankedHere,
      alternativesConsidered: [],
    } satisfies RecommendationScore;
  }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.styleId.localeCompare(b.styleId));

  return scored.map((item, index) => {
    const nearest = scored.filter((candidate) => candidate.styleId !== item.styleId && candidate.eligible).sort((a,b) => Math.abs(a.score-item.score)-Math.abs(b.score-item.score))[0];
    const margin = nearest ? Math.abs(item.score - nearest.score) : 25;
    const stability = clamp(38 + margin * 2.2 + item.confidence.contextCompleteness * .2 + item.confidence.deterministicRule * .15);
    const overall = clamp(item.confidence.evidence * .24 + item.confidence.contextCompleteness * .22 + item.confidence.deterministicRule * .30 + item.confidence.outcome * .14 + stability * .10);
    const alternativesConsidered = scored.filter((candidate) => candidate.styleId !== item.styleId).slice(0,4).map((candidate) => ({
      styleId: candidate.styleId, styleName: candidate.styleName, score: candidate.score,
      reasonRankedLower: candidate.disqualifiers[0] ?? candidate.tradeoffs[0] ?? (candidate.score < item.score ? `Its weighted and contextual score is ${Math.round(item.score-candidate.score)} point(s) lower.` : `It is a competing option ranked ${index + 1 === 1 ? 'below the leading option' : 'differently for the current context'}.`),
    }));
    return { ...item, confidence: { ...item.confidence, stability, overall }, alternativesConsidered };
  });
}
