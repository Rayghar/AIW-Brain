import {
  sprint78PatternCorpus,
  sprint80DefaultSimulationScenarios,
  type AlternativeComparison,
  type AlternativeQualityProjection,
  type AlternativeRisk,
  type ArchitectureAlternative,
  type ArchitectureAlternativeScorecard,
  type ArchitectureProject,
  type ArchitectureSimulationResult,
  type ArchitectureSimulationScenario,
  type ArchitectureSimulationOutcome,
  type SimulationCalibrationProfile,
  type ArchitectureSynthesisRequest,
  type ArchitectureSynthesisRun,
  type DesignBriefAssessment,
  type DesignBriefContradiction,
  type DesignBriefGap,
  type PatternCompositionPlan,
  type PatternKnowledgeRecord,
  type SynthesisDecisionPackage,
  type SynthesisStrategyId,
} from '@aiw/domain';
import { applyPatternComposition, buildRecommendationEvidencePack, composePatterns, generateArchitectureFitnessFunctions } from './patternIntelligence.js';
import { buildAlternativeCounterfactuals, buildArchitectureBlueprint, evaluateSynthesisEligibility } from './architectureBlueprint.js';

const MODEL_VERSION = 'aiw-simulation-1.0';

function stableHash(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function clamp(value: number, low = 0, high = 100): number {
  return Math.max(low, Math.min(high, value));
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function contextText(project: ArchitectureProject): string {
  return [project.name, project.description, ...project.objectives, ...project.constraints, ...project.assumptions, ...project.qualityScenarios.flatMap((item) => [item.attributeId, item.stimulus, item.response, item.responseMeasure]), ...(project.context.preferredVendors ?? []), ...(project.context.prohibitedTechnologies ?? [])].join(' ').toLowerCase();
}

function contradiction(id: string, severity: DesignBriefContradiction['severity'], statements: string[], explanation: string, clarificationQuestion: string): DesignBriefContradiction {
  return { id, severity, statements, explanation, clarificationQuestion };
}

export function assessArchitectureDesignBrief(project: ArchitectureProject): DesignBriefAssessment {
  const gaps: DesignBriefGap[] = [];
  const contradictions: DesignBriefContradiction[] = [];
  const strengths: string[] = [];
  const text = contextText(project);
  const addGap = (id: string, severity: DesignBriefGap['severity'], category: DesignBriefGap['category'], message: string, remediation: string) => gaps.push({ id, severity, category, message, remediation });

  if (!project.objectives.length) addGap('BRIEF-OBJECTIVES', 'blocking', 'objective', 'No business or architecture objective is recorded.', 'Record at least one outcome that the architecture must enable.');
  else strengths.push(`${project.objectives.length} explicit objective(s) are recorded.`);
  if (!project.constraints.length) addGap('BRIEF-CONSTRAINTS', 'important', 'constraint', 'No hard constraints are recorded.', 'Capture regulatory, technology, time, data-residency and integration constraints.');
  else strengths.push(`${project.constraints.length} constraint(s) are available for eligibility filtering.`);
  if (!project.qualityPriorities.length) addGap('BRIEF-QUALITY-PRIORITIES', 'blocking', 'quality-scenario', 'No quality attributes are prioritized.', 'Prioritize the quality attributes that will distinguish viable alternatives.');
  else strengths.push(`${project.qualityPriorities.length} quality attribute priority or priorities are recorded.`);
  if (!project.qualityScenarios.length) addGap('BRIEF-MEASURABLE-SCENARIOS', 'important', 'quality-scenario', 'Quality priorities are not expressed as measurable scenarios.', 'Add stimulus, environment, response and response measure for the most important attributes.');
  else strengths.push(`${project.qualityScenarios.length} measurable quality scenario(s) can be used for simulation.`);
  if (!project.assumptions.length) addGap('BRIEF-ASSUMPTIONS', 'advisory', 'assumption', 'No assumptions are explicitly recorded.', 'Record uncertain facts so alternatives expose rather than hide them.');
  if (!project.context.teamSize) addGap('BRIEF-TEAM-SIZE', 'important', 'context', 'Team size is unknown.', 'Record the approximate engineering and operations team size.');
  if (!project.context.deliveryHorizonMonths) addGap('BRIEF-HORIZON', 'important', 'context', 'Delivery horizon is unknown.', 'Record the expected first-value and target-state timeline.');
  if (!project.context.operationalMaturity) addGap('BRIEF-OPERATIONS', 'important', 'context', 'Operational maturity is unknown.', 'Assess the team on a one-to-five operational-maturity scale.');
  if (!project.context.regulatoryExposure) addGap('BRIEF-REGULATION', 'advisory', 'context', 'Regulatory exposure is unspecified.', 'Classify regulatory exposure to calibrate control obligations.');

  if ((text.includes('single region') || text.includes('one region')) && (text.includes('zero downtime') || text.includes('regional failure') || text.includes('region outage'))) {
    contradictions.push(contradiction('CONTRA-REGION-AVAILABILITY', 'blocking', ['Single-region deployment', 'Survive regional failure or zero downtime'], 'A single-region deployment cannot independently survive loss of that region.', 'Is regional-failure survival mandatory, or is restoration within an agreed RTO acceptable?'));
  }
  if ((text.includes('strong consistency') || text.includes('immediate consistency')) && (text.includes('offline first') || text.includes('offline-first') || text.includes('eventual consistency'))) {
    contradictions.push(contradiction('CONTRA-CONSISTENCY-OFFLINE', 'important', ['Immediate consistency', 'Offline-first or eventual consistency'], 'Disconnected operation requires a conflict and reconciliation model that cannot guarantee universal immediate consistency.', 'Which data requires immediate consistency, and which data may reconcile asynchronously?'));
  }
  if ((text.includes('no cloud') || text.includes('on premise only') || text.includes('on-premise only')) && (project.context.preferredVendors ?? []).some((item) => ['aws','azure','gcp','cloud'].some((token) => item.toLowerCase().includes(token)))) {
    contradictions.push(contradiction('CONTRA-CLOUD-POLICY', 'blocking', ['Cloud use prohibited', `Preferred vendors: ${(project.context.preferredVendors ?? []).join(', ')}`], 'The preferred-vendor list conflicts with the stated hosting restriction.', 'Should cloud products be removed, or is a limited approved cloud boundary permitted?'));
  }
  if ((text.includes('no vendor lock') || text.includes('vendor neutral')) && text.includes('must use') && (project.context.preferredVendors?.length ?? 0) === 1) {
    contradictions.push(contradiction('CONTRA-VENDOR-NEUTRALITY', 'important', ['Vendor neutrality', `Mandatory provider ${project.context.preferredVendors?.[0]}`], 'A mandatory single provider limits portability; the architecture must clarify whether neutrality applies to capability design or deployment.', 'Should the logical architecture remain provider-neutral while the initial physical realization uses the preferred provider?'));
  }
  if (project.context.deliveryHorizonMonths && project.context.deliveryHorizonMonths <= 3 && project.context.operationalMaturity && project.context.operationalMaturity <= 2 && (text.includes('microservice') || text.includes('multi-region') || text.includes('event driven'))) {
    contradictions.push(contradiction('CONTRA-HORIZON-COMPLEXITY', 'important', ['Short delivery horizon', 'Low operational maturity', 'Complex distributed target'], 'The target architecture may exceed the organization’s delivery and operating capacity.', 'Which capabilities are essential for the first release, and which may be deferred?'));
  }

  const weightedPenalty = gaps.reduce((sum, item) => sum + (item.severity === 'blocking' ? 18 : item.severity === 'important' ? 9 : 3), 0) + contradictions.reduce((sum, item) => sum + (item.severity === 'blocking' ? 20 : 10), 0);
  const completenessScore = clamp(100 - weightedPenalty);
  const clarificationQuestions = [...contradictions.map((item) => item.clarificationQuestion), ...gaps.filter((item) => item.severity !== 'advisory').map((item) => item.remediation)].slice(0, 10);
  return { assessedAt: new Date().toISOString(), completenessScore, synthesisReady: !gaps.some((item) => item.severity === 'blocking') && !contradictions.some((item) => item.severity === 'blocking'), gaps, contradictions, clarificationQuestions, strengths };
}

const strategyProfiles: Record<SynthesisStrategyId, { name: string; query: string; weights: Omit<ArchitectureAlternativeScorecard, 'overall'>; costFactor: number; complexityBias: number }> = {
  balanced: { name: 'Balanced governed architecture', query: 'balanced architecture evidence based tradeoffs maintainability reliability security cost', weights: { contextFit: 1.4, qualityFit: 1.4, resilience: 1, security: 1, simplicity: 1, operability: 1, deliveryFeasibility: 1, costEfficiency: 1, evidenceConfidence: 1.2 }, costFactor: 1, complexityBias: 0 },
  'simplicity-first': { name: 'Simplicity and delivery first', query: 'modular monolith simple maintainable incremental delivery low operational complexity', weights: { contextFit: 1.2, qualityFit: 1, resilience: .7, security: .9, simplicity: 2, operability: 1.3, deliveryFeasibility: 1.8, costEfficiency: 1.5, evidenceConfidence: 1 }, costFactor: .72, complexityBias: -18 },
  'resilience-first': { name: 'Resilience and continuity first', query: 'resilient fault tolerant multi region failure isolation retry circuit breaker recovery continuity', weights: { contextFit: 1.1, qualityFit: 1.4, resilience: 2.2, security: 1, simplicity: .55, operability: 1.5, deliveryFeasibility: .7, costEfficiency: .55, evidenceConfidence: 1.1 }, costFactor: 1.55, complexityBias: 16 },
  'scale-first': { name: 'Elastic scale first', query: 'high scale elastic event driven partitioning caching load leveling asynchronous throughput', weights: { contextFit: 1.2, qualityFit: 1.5, resilience: 1.2, security: .8, simplicity: .55, operability: 1.2, deliveryFeasibility: .7, costEfficiency: .8, evidenceConfidence: 1 }, costFactor: 1.35, complexityBias: 12 },
  'security-first': { name: 'Security and regulatory control first', query: 'zero trust security audit policy enforcement data protection isolation regulatory controls', weights: { contextFit: 1.2, qualityFit: 1.3, resilience: 1, security: 2.2, simplicity: .7, operability: 1.2, deliveryFeasibility: .8, costEfficiency: .6, evidenceConfidence: 1.4 }, costFactor: 1.3, complexityBias: 9 },
  'cost-first': { name: 'Cost-efficient architecture', query: 'cost efficient managed service serverless autoscaling rightsizing simplicity shared platform', weights: { contextFit: 1.1, qualityFit: .9, resilience: .7, security: .8, simplicity: 1.4, operability: 1.2, deliveryFeasibility: 1.4, costEfficiency: 2.3, evidenceConfidence: .9 }, costFactor: .62, complexityBias: -10 },
  'modernization-first': { name: 'Incremental modernization', query: 'legacy modernization strangler anti corruption branch by abstraction incremental migration continuity', weights: { contextFit: 1.6, qualityFit: 1.1, resilience: 1, security: .9, simplicity: 1, operability: 1.1, deliveryFeasibility: 1.6, costEfficiency: 1, evidenceConfidence: 1.1 }, costFactor: 1.05, complexityBias: 2 },
  'sovereign-ai-first': { name: 'Sovereign and portable AI', query: 'governed AI model routing local model privacy retrieval augmented generation guardrails evaluation fallback', weights: { contextFit: 1.5, qualityFit: 1.3, resilience: 1.2, security: 1.8, simplicity: .6, operability: 1.3, deliveryFeasibility: .8, costEfficiency: .8, evidenceConfidence: 1.4 }, costFactor: 1.35, complexityBias: 13 },
};

function defaultStrategies(project: ArchitectureProject): SynthesisStrategyId[] {
  const text = contextText(project);
  const output: SynthesisStrategyId[] = ['balanced','simplicity-first','resilience-first'];
  if (/(scale|volume|throughput|million|elastic|spike)/.test(text)) output.push('scale-first');
  if (/(regulat|security|zero trust|sensitive|bank|payment|health)/.test(text)) output.push('security-first');
  if (/(budget|cost|finops|econom)/.test(text) || (project.context.budgetSensitivity ?? 0) >= 4) output.push('cost-first');
  if (/(legacy|moderniz|migration|monolith)/.test(text)) output.push('modernization-first');
  if (/(\bai\b|llm|model|rag|agent)/.test(text)) output.push('sovereign-ai-first');
  return [...new Set(output)];
}

function safeStage(project: ArchitectureProject): ArchitectureProject['activeStage'] {
  return project.activeStage === 'designIntent' || project.activeStage === 'validationRealization' ? 'applicationRealization' : project.activeStage;
}

function synthesisStage(project: ArchitectureProject, strategyId: SynthesisStrategyId): ArchitectureProject['activeStage'] {
  // Synthesis deliberately explores a realizable target architecture rather than being
  // trapped at the currently selected canvas view. Logical intent remains in the project,
  // while patterns are composed at the stage where their obligations can be implemented.
  if (strategyId === 'cost-first' || strategyId === 'sovereign-ai-first') return 'logicalTechnology';
  if (['logicalApplication','designIntent','validationRealization'].includes(project.activeStage)) return 'applicationRealization';
  return safeStage(project);
}

const strategyCategoryPreferences: Record<SynthesisStrategyId, string[]> = {
  balanced: ['application','integration','domain','resilience','security'],
  'simplicity-first': ['application','domain'],
  'resilience-first': ['resilience','integration'],
  'scale-first': ['resilience','integration','data','platform'],
  'security-first': ['security'],
  'cost-first': ['deployment','platform','application'],
  'modernization-first': ['application','integration','domain'],
  'sovereign-ai-first': ['ai','security','platform'],
};

const strategyAnchorTerms: Record<SynthesisStrategyId, string[]> = {
  balanced: ['service layer','bounded context','outbox','api gateway','observability'],
  'simplicity-first': ['modular monolith','module','service layer','hexagonal','clean architecture'],
  'resilience-first': ['circuit breaker','retry','timeout','bulkhead','fault isolation','failover','disaster recovery','cell based'],
  'scale-first': ['load leveling','autoscaling','partition','cache','publish subscribe','event driven','cell based','load shedding'],
  'security-first': ['zero trust','least privilege','audit','tokenization','policy enforcement','encryption','identity','secure defaults'],
  'cost-first': ['serverless','autoscaling','rightsizing','modular monolith','shared platform','managed service'],
  'modernization-first': ['strangler','anti corruption','branch by abstraction','modular monolith','adapter'],
  'sovereign-ai-first': ['model routing','local model','guardrail','retrieval augmented','human in the loop','evaluation','fallback'],
};

const strategyPreferredPatternIds: Record<SynthesisStrategyId, string[]> = {
  balanced: ['PAT-SERVICE-LAYER','PAT-BOUNDED-CONTEXT','PAT-API-GATEWAY','PAT-TRANSACTIONAL-OUTBOX','TPL-TRANSACTIONAL-OUTBOX-TOPOLOGY'],
  'simplicity-first': ['PAT-MODULAR-MONOLITH','TPL-MODULAR-MONOLITH-STARTER','PAT-CLEAN-ARCHITECTURE','PAT-HEXAGONAL-ARCHITECTURE','PAT-SERVICE-LAYER'],
  'resilience-first': ['PAT-CIRCUIT-BREAKER','PAT-RETRY-WITH-BACKOFF','PAT-FAULT-ISOLATION','PAT-DISASTER-RECOVERY','PAT-CELL-BASED-ARCHITECTURE'],
  'scale-first': ['PAT-QUEUE-BASED-LOAD-LEVELING','PAT-CELL-BASED-ARCHITECTURE','PAT-AUTOSCALING','PAT-PUBLISH-SUBSCRIBE','PAT-CACHE-ASIDE'],
  'security-first': ['TPL-ZERO-TRUST-SERVICE-BOUNDARY','PAT-ZERO-TRUST','PAT-LEAST-PRIVILEGE','PAT-SECURE-DEFAULTS','PAT-AUDIT-TRAIL'],
  'cost-first': ['PAT-SERVERLESS-ARCHITECTURE','PAT-FUNCTION-AS-A-SERVICE','PAT-AUTOSCALING','PAT-RATE-LIMITING','PAT-SERVICE-LAYER'],
  'modernization-first': ['PAT-STRANGLER-FIG','PAT-ANTI-CORRUPTION-LAYER','PAT-BRANCH-BY-ABSTRACTION','PAT-ADAPTER','PAT-MODULAR-MONOLITH'],
  'sovereign-ai-first': ['PAT-MODEL-GATEWAY','PAT-AI-FALLBACK-STRATEGY','PAT-AI-GUARDRAILS','PAT-HUMAN-IN-THE-LOOP-AI','PAT-AI-EVALUATION-HARNESS'],
};

function strategyAffinity(record: PatternKnowledgeRecord | undefined, strategyId: SynthesisStrategyId): number {
  if (!record || record.recordType === 'anti-pattern') return -1000;
  const preferences = strategyCategoryPreferences[strategyId];
  const categoryIndex = preferences.indexOf(record.category);
  const categoryScore = categoryIndex < 0 ? 0 : Math.max(10, 34 - categoryIndex * 6);
  const haystack = `${record.id} ${record.name} ${record.tags.join(' ')}`.toLowerCase().replaceAll('-', ' ');
  const termMatches = strategyAnchorTerms[strategyId].filter((term) => haystack.includes(term)).length;
  const typeScore = record.recordType === 'topology-template' ? 5 : record.recordType === 'style' ? 2 : 0;
  const preferredScore = strategyPreferredPatternIds[strategyId].includes(record.id) ? 90 : 0;
  return categoryScore + Math.min(28, termMatches * 14) + typeScore + preferredScore;
}

function recordById(id: string, records: PatternKnowledgeRecord[]): PatternKnowledgeRecord | undefined {
  return records.find((item) => item.id === id);
}

function selectPatterns(project: ArchitectureProject, strategyId: SynthesisStrategyId, previouslyUsed: Set<string>, requireDiversity: boolean, records: PatternKnowledgeRecord[]): { recommendationScores: ReturnType<typeof buildRecommendationEvidencePack>['recommendations']; patternIds: string[]; plan: PatternCompositionPlan } {
  const profile = strategyProfiles[strategyId];
  const stage = synthesisStage(project, strategyId);
  const query = `${project.description} ${project.objectives.join(' ')} ${project.constraints.join(' ')} ${profile.query}`;
  const packs = [
    buildRecommendationEvidencePack({ query, project, stage, limit: 100 }, records),
    ...strategyAnchorTerms[strategyId].map((term) => buildRecommendationEvidencePack({ query: `${project.description} ${project.objectives.join(' ')} ${term}`, project, stage, limit: 12 }, records)),
  ];
  const recommendationByPattern = new Map<string, (typeof packs)[number]['recommendations'][number]>();
  for (const recommendation of packs.flatMap((item) => item.recommendations)) {
    const existing = recommendationByPattern.get(recommendation.patternId);
    if (!existing || recommendation.totalScore > existing.totalScore) recommendationByPattern.set(recommendation.patternId, recommendation);
  }
  const allRecommendations = [...recommendationByPattern.values()];
  const eligible = allRecommendations.filter((item) => item.eligible && recordById(item.patternId, records)?.recordType !== 'anti-pattern');
  const selected: string[] = [];
  let plan = composePatterns({ project, patternIds: ['__none__'], stage, allowConditionalPrerequisites: true }, records);
  const candidates = [...eligible].sort((a, b) => {
    const aRecord = recordById(a.patternId, records);
    const bRecord = recordById(b.patternId, records);
    const diversityA = requireDiversity && previouslyUsed.has(a.patternId) ? -30 : 0;
    const diversityB = requireDiversity && previouslyUsed.has(b.patternId) ? -30 : 0;
    const topologyA = aRecord?.topology ? 6 : 0;
    const topologyB = bRecord?.topology ? 6 : 0;
    const affinityA = strategyAffinity(aRecord, strategyId);
    const affinityB = strategyAffinity(bRecord, strategyId);
    return (b.totalScore + diversityB + topologyB + affinityB) - (a.totalScore + diversityA + topologyA + affinityA);
  });
  for (const candidate of candidates) {
    if (selected.length >= 5) break;
    const trialIds = [...selected, candidate.patternId];
    const trial = composePatterns({ project, patternIds: trialIds, stage, allowConditionalPrerequisites: true }, records);
    if (!trial.eligible) continue;
    selected.push(candidate.patternId);
    plan = trial;
  }
  if (!selected.length) {
    const fallback = eligible[0];
    if (fallback) {
      selected.push(fallback.patternId);
      plan = composePatterns({ project, patternIds: selected, stage, allowConditionalPrerequisites: true }, records);
    }
  }
  return { recommendationScores: allRecommendations.filter((item) => selected.includes(item.patternId)), patternIds: selected, plan };
}

function patternSignal(patternIds: string[], records: PatternKnowledgeRecord[], terms: string[]): number {
  const selected = patternIds.map((id) => recordById(id, records)).filter((item): item is PatternKnowledgeRecord => Boolean(item));
  const matches = selected.filter((record) => terms.some((term) => `${record.id} ${record.name} ${record.tags.join(' ')}`.toLowerCase().includes(term))).length;
  return clamp(matches * 14, 0, 35);
}

function scoreAlternative(project: ArchitectureProject, strategyId: SynthesisStrategyId, patternIds: string[], recommendations: ArchitectureAlternative['patternRecommendations'], plan: PatternCompositionPlan, records: PatternKnowledgeRecord[]): ArchitectureAlternativeScorecard {
  const profile = strategyProfiles[strategyId];
  const avg = (values: number[], fallback = 55) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
  const contextFit = avg(recommendations.map((item) => item.dimensions.contextFit));
  const qualityFit = avg(recommendations.map((item) => item.dimensions.qualityAlignment));
  const evidenceConfidence = avg(recommendations.map((item) => item.dimensions.evidenceConfidence));
  const operationalMaturity = (project.context.operationalMaturity ?? 3) * 18;
  const teamCapacity = clamp((project.context.teamSize ?? 8) * 4, 30, 100);
  const topologyComplexity = plan.mutation.addNodes.length * 3 + plan.mutation.addEdges.length * 2 + patternIds.length * 3 + profile.complexityBias;
  const resilience = clamp(48 + patternSignal(patternIds, records, ['circuit','retry','bulkhead','failover','cell','queue','replica','resilien']) + (plan.qualityDelta.availability ?? 0) * 5);
  const security = clamp(48 + patternSignal(patternIds, records, ['security','zero-trust','audit','isolation','identity','encryption','guardrail']) + (plan.qualityDelta.security ?? 0) * 5 + ((project.context.regulatoryExposure === 'high') ? 5 : 0));
  const simplicity = clamp(92 - topologyComplexity);
  const operability = clamp(avg(recommendations.map((item) => item.dimensions.operationalReadiness)) * .75 + operationalMaturity * .25 - Math.max(0, topologyComplexity - 35) * .25);
  const deliveryFeasibility = clamp((teamCapacity + (project.context.deliveryHorizonMonths ?? 9) * 5 + simplicity) / 3);
  const costEfficiency = clamp(92 - patternIds.length * 5 - plan.mutation.addNodes.length * 2 - (strategyId === 'cost-first' ? -15 : 0) - (strategyId === 'resilience-first' ? 12 : 0));
  const values = { contextFit, qualityFit, resilience, security, simplicity, operability, deliveryFeasibility, costEfficiency, evidenceConfidence };
  const denominator = Object.values(profile.weights).reduce((sum, value) => sum + value, 0);
  const overall = Object.entries(profile.weights).reduce((sum, [key, weight]) => sum + values[key as keyof typeof values] * weight, 0) / denominator;
  return { overall: round(overall), contextFit: round(contextFit), qualityFit: round(qualityFit), resilience: round(resilience), security: round(security), simplicity: round(simplicity), operability: round(operability), deliveryFeasibility: round(deliveryFeasibility), costEfficiency: round(costEfficiency), evidenceConfidence: round(evidenceConfidence) };
}

function qualityProjections(project: ArchitectureProject, plan: PatternCompositionPlan): AlternativeQualityProjection[] {
  const priorities = project.qualityPriorities.length ? project.qualityPriorities : [{ attributeId: 'availability', weight: 3 }, { attributeId: 'modifiability', weight: 3 }, { attributeId: 'faultTolerance', weight: 3 }, { attributeId: 'performance', weight: 3 }];
  return priorities.map((priority) => {
    const delta = plan.qualityDelta[priority.attributeId] ?? 0;
    const score = clamp(52 + priority.weight * 5 + delta * 5);
    return { attributeId: priority.attributeId, score: round(score), confidence: project.qualityScenarios.some((item) => item.attributeId === priority.attributeId) ? 82 : 58, rationale: delta ? `Pattern composition produces a calibrated ${delta > 0 ? 'positive' : 'negative'} impact of ${delta}.` : 'No direct Pattern DNA impact is recorded; projection uses the design priority and remains provisional.' };
  });
}

function buildRisks(scorecard: ArchitectureAlternativeScorecard, patternIds: string[], plan: PatternCompositionPlan): AlternativeRisk[] {
  const risks: AlternativeRisk[] = [];
  const add = (category: AlternativeRisk['category'], severity: AlternativeRisk['severity'], title: string, description: string, mitigation: string) => risks.push({ id: `RISK-${stableHash(`${category}:${title}:${patternIds.join(':')}`)}`, category, severity, title, description, mitigation });
  if (scorecard.simplicity < 55) add('architecture', scorecard.simplicity < 35 ? 'high' : 'medium', 'Distributed complexity', 'The alternative introduces a comparatively large operational and cognitive surface.', 'Phase adoption, automate platform controls and require explicit service ownership.');
  if (scorecard.operability < 60) add('operations', 'high', 'Operating-model mismatch', 'The current operational maturity may not support the target architecture safely.', 'Add observability, runbooks, SLOs, ownership and a capability-building plan before production.');
  if (scorecard.deliveryFeasibility < 60) add('delivery', 'high', 'Delivery horizon pressure', 'The architecture may exceed the available team capacity or timeline.', 'Create a transition architecture and defer nonessential target-state capabilities.');
  if (scorecard.security < 60) add('security', 'high', 'Control coverage gap', 'The selected patterns do not yet provide strong evidence of required security controls.', 'Add identity, policy enforcement, audit, data-protection and threat-detection patterns.');
  if (scorecard.costEfficiency < 50) add('cost', 'medium', 'High expected run cost', 'Redundancy, managed services or topology breadth may materially increase cost.', 'Model unit economics and introduce autoscaling, rightsizing and explicit cost allocation.');
  if (plan.missingPrerequisites.length) add('governance', 'medium', 'Conditional prerequisites', `${plan.missingPrerequisites.length} prerequisite(s) are not yet evidenced.`, 'Resolve each prerequisite before accepting the architecture decision.');
  return risks;
}

function alternativeName(strategyId: SynthesisStrategyId, patternIds: string[], records: PatternKnowledgeRecord[]): string {
  const profile = strategyProfiles[strategyId];
  const anchor = patternIds.map((id) => recordById(id, records)?.name).find(Boolean);
  return anchor ? `${profile.name} · ${anchor}` : profile.name;
}

function dominates(a: ArchitectureAlternative, b: ArchitectureAlternative): boolean {
  const dimensions: Array<keyof ArchitectureAlternativeScorecard> = ['qualityFit','resilience','security','simplicity','operability','deliveryFeasibility','costEfficiency','evidenceConfidence'];
  const noWorse = dimensions.every((key) => a.scorecard[key] >= b.scorecard[key]);
  const better = dimensions.some((key) => a.scorecard[key] > b.scorecard[key]);
  return noWorse && better;
}

export function compareArchitectureAlternatives(alternatives: ArchitectureAlternative[]): AlternativeComparison {
  const dimensions: Array<keyof ArchitectureAlternativeScorecard> = ['overall','contextFit','qualityFit','resilience','security','simplicity','operability','deliveryFeasibility','costEfficiency','evidenceConfidence'];
  const winnerByDimension = Object.fromEntries(dimensions.map((dimension) => [dimension, [...alternatives].sort((a, b) => b.scorecard[dimension] - a.scorecard[dimension])[0]?.id ?? ''])) as Record<string, string>;
  const dominatedAlternativeIds = alternatives.filter((candidate) => alternatives.some((other) => other.id !== candidate.id && dominates(other, candidate))).map((item) => item.id);
  const paretoAlternativeIds = alternatives.filter((item) => !dominatedAlternativeIds.includes(item.id)).map((item) => item.id);
  const decisionQuestions = [
    'Which quality attributes are truly non-negotiable rather than merely desirable?',
    'How much operating complexity can the organization safely absorb?',
    'Is the delivery horizon compatible with the selected target architecture?',
    'Which cost range is acceptable for the required resilience and control posture?',
    'Which assumptions must be validated through a spike, benchmark or proof of concept?',
  ];
  const counterfactuals = buildAlternativeCounterfactuals(alternatives);
  const materialDifferenceMatrix = Object.fromEntries(alternatives.map((left) => [left.id, Object.fromEntries(alternatives.filter((right) => right.id !== left.id).map((right) => {
    const shared = left.patternIds.filter((id) => right.patternIds.includes(id));
    const union = new Set([...left.patternIds, ...right.patternIds]);
    const overlap = union.size ? Math.round((shared.length / union.size) * 100) : 0;
    const nodeDelta = Math.abs(left.projectedProject.nodes.length - right.projectedProject.nodes.length);
    return [right.id, `${left.strategyId} vs ${right.strategyId}; ${overlap}% Pattern DNA overlap; ${nodeDelta} canonical node delta; cost ${left.costProjection.relativeClass} vs ${right.costProjection.relativeClass}`];
  }))]));
  return { generatedAt: new Date().toISOString(), alternativeIds: alternatives.map((item) => item.id), winnerByDimension, paretoAlternativeIds, dominatedAlternativeIds, decisionQuestions, counterfactuals, materialDifferenceMatrix };
}

export function synthesizeArchitectureAlternatives(request: ArchitectureSynthesisRequest, records: PatternKnowledgeRecord[] = sprint78PatternCorpus): ArchitectureSynthesisRun {
  const assessment = assessArchitectureDesignBrief(request.project);
  const strategies = (request.strategyIds?.length ? request.strategyIds : defaultStrategies(request.project)).slice(0, Math.max(2, Math.min(7, request.maxAlternatives ?? 5)));
  const used = new Set<string>();
  const alternatives: ArchitectureAlternative[] = [];
  for (const strategyId of strategies) {
    const selection = selectPatterns(request.project, strategyId, used, request.requireDiversity !== false, records);
    selection.patternIds.forEach((id) => used.add(id));
    if (!selection.patternIds.length || !selection.plan.eligible) continue;
    const projectedProject = applyPatternComposition(request.project, selection.plan);
    const scorecard = scoreAlternative(request.project, strategyId, selection.patternIds, selection.recommendationScores, selection.plan, records);
    const profile = strategyProfiles[strategyId];
    const topologyUnits = Math.max(1, selection.plan.mutation.addNodes.length + selection.patternIds.length * 2);
    const monthlyBase = 450 * topologyUnits * profile.costFactor;
    const costProjection = {
      currency: 'USD', relativeClass: monthlyBase < 3500 ? 'low' as const : monthlyBase < 8000 ? 'medium' as const : monthlyBase < 18000 ? 'high' as const : 'very-high' as const,
      monthlyLow: Math.round(monthlyBase * .7), monthlyHigh: Math.round(monthlyBase * 1.55),
      deliveryEffortDaysLow: Math.max(10, Math.round(topologyUnits * 3.5 + Math.max(0, profile.complexityBias))), deliveryEffortDaysHigh: Math.max(20, Math.round(topologyUnits * 7 + Math.max(0, profile.complexityBias * 2))),
      assumptions: ['Indicative relative estimate; provider pricing, workload volume, regions and support tiers are not yet bound.', 'Delivery estimate assumes an experienced cross-functional team and excludes procurement lead time.'],
    };
    const evidenceConnectorIds = [...new Set(selection.recommendationScores.flatMap((item) => item.evidenceConnectorIds))];
    const alternativeId = `ALT-${strategyId.toUpperCase().replace(/[^A-Z0-9]+/g,'-')}-${stableHash(`${request.project.id}:${request.project.revision}:${selection.patternIds.join(':')}`)}`;
    const risks = buildRisks(scorecard, selection.patternIds, selection.plan);
    const eligibility = evaluateSynthesisEligibility(request.project, strategyId, selection.patternIds, selection.plan, assessment);
    const baseAlternative: Omit<ArchitectureAlternative, 'blueprint'> = {
      id: alternativeId,
      name: alternativeName(strategyId, selection.patternIds, records),
      strategyId,
      summary: `${profile.name} composed from ${selection.patternIds.length} approved Pattern DNA record(s) and ${evidenceConnectorIds.length} governed source connector(s).`,
      rationale: [`Optimizes the ${strategyId.replaceAll('-',' ')} posture.`, ...selection.recommendationScores.slice(0, 3).flatMap((item) => item.reasons.slice(0, 1))],
      differentiators: [`${selection.plan.mutation.addNodes.length} generated architecture node(s)`, `${selection.plan.obligations.length} governed obligation(s)`, `${selection.plan.qualityDelta ? Object.keys(selection.plan.qualityDelta).length : 0} calibrated quality impact(s)`],
      patternIds: selection.patternIds,
      patternRecommendations: selection.recommendationScores,
      compositionPlan: selection.plan,
      projectedProject,
      scorecard,
      qualityProjections: qualityProjections(request.project, selection.plan),
      costProjection,
      obligations: selection.plan.obligations,
      risks,
      assumptions: [...new Set([...selection.recommendationScores.flatMap((item) => item.assumptions), ...costProjection.assumptions])],
      evidenceConnectorIds,
      governanceWarnings: [...selection.plan.warnings, ...selection.plan.missingPrerequisites.map((item) => `Unverified prerequisite: ${item}`), ...(assessment.synthesisReady ? [] : ['Design brief is not yet governance-ready; this alternative is exploratory.']), ...(!eligibility.eligible ? eligibility.disqualifiers.map((item) => `Eligibility disqualifier: ${item}`) : [])],
      eligibility,
    };
    const blueprint = buildArchitectureBlueprint(baseAlternative);
    alternatives.push({ ...baseAlternative, blueprint });
  }
  const comparison = compareArchitectureAlternatives(alternatives);
  const recommendedAlternativeId = [...alternatives].filter((item) => item.eligibility.eligible && comparison.paretoAlternativeIds.includes(item.id)).sort((a, b) => b.scorecard.overall - a.scorecard.overall)[0]?.id;
  const knowledgeReleaseId = request.knowledgeReleaseId ?? 'AKR-0.10.60';
  return {
    id: `SYN-${stableHash(`${request.project.tenantId}:${request.project.id}:${request.project.branch.id}:${request.project.revision}:${strategies.join(':')}`)}`,
    tenantId: request.project.tenantId,
    projectId: request.project.id,
    branchId: request.project.branch.id,
    projectRevision: request.project.revision,
    knowledgeReleaseId,
    generatedAt: new Date().toISOString(),
    inputFingerprint: `fnv1a-${stableHash({ project: request.project, strategies, knowledgeReleaseId })}`,
    mode: 'deterministic', assessment, alternatives, paretoAlternativeIds: comparison.paretoAlternativeIds,
    ...(recommendedAlternativeId ? { recommendedAlternativeId } : {}),
    warnings: [...(!assessment.synthesisReady ? ['Synthesis is exploratory until blocking brief gaps and contradictions are resolved.'] : []), ...(alternatives.length < 2 ? ['Fewer than two viable alternatives were generated; expand the brief or corpus coverage.'] : [])],
  };
}

function patternCapability(alternative: ArchitectureAlternative, terms: string[]): number {
  const text = `${alternative.patternIds.join(' ')} ${alternative.name} ${alternative.summary}`.toLowerCase();
  return terms.some((term) => text.includes(term)) ? 1 : 0;
}

function simulationOutcome(alternative: ArchitectureAlternative, scenario: ArchitectureSimulationScenario) {
  const resilience = alternative.scorecard.resilience / 100;
  const scale = (alternative.scorecard.qualityFit + alternative.scorecard.operability) / 200;
  const security = alternative.scorecard.security / 100;
  const simplicity = alternative.scorecard.simplicity / 100;
  const traffic = scenario.parameters.trafficMultiplier ?? 1;
  const dependencyAvailability = (scenario.parameters.dependencyAvailabilityPercent ?? 99.9) / 100;
  const networkAvailability = (scenario.parameters.networkAvailabilityPercent ?? 99.9) / 100;
  const regionLoss = (scenario.parameters.regionLossPercent ?? 0) / 100;
  const teamCapacity = (scenario.parameters.teamCapacityPercent ?? 100) / 100;
  const budgetReduction = (scenario.parameters.budgetReductionPercent ?? 0) / 100;
  const malicious = (scenario.parameters.maliciousRequestPercent ?? 0) / 100;
  const providerAvailability = (scenario.parameters.providerAvailabilityPercent ?? 100) / 100;
  const hasFailover = patternCapability(alternative, ['multi-region','cell-based','failover','active-active']);
  const hasAsyncBuffer = patternCapability(alternative, ['queue','publish-subscribe','event-driven','load-leveling']);
  const hasCircuit = patternCapability(alternative, ['circuit-breaker','retry-with-backoff','bulkhead']);
  const hasOffline = patternCapability(alternative, ['low-connectivity','offline','event-carried-state']);
  const hasAiFallback = patternCapability(alternative, ['model-routing','guardrail','local-model','human-in-the-loop']);
  const capacity = Math.max(.4, 1 + scale * 2.8 + hasAsyncBuffer * .8);
  let availability = 98.6 + resilience * 1.35;
  availability *= dependencyAvailability + (1 - dependencyAvailability) * (hasCircuit ? .75 : .2);
  availability *= networkAvailability + (1 - networkAvailability) * (hasOffline ? .8 : .05);
  availability *= 1 - regionLoss * (hasFailover ? .08 : .92);
  if (scenario.type === 'model-provider-outage') availability *= providerAvailability + (1 - providerAvailability) * (hasAiFallback ? .82 : .05);
  const overload = Math.max(0, traffic / capacity - 1);
  availability -= overload * (hasAsyncBuffer ? .25 : 1.6);
  const p95LatencyMs = Math.max(35, 140 * traffic / capacity * (1 + (1 - dependencyAvailability) * (hasCircuit ? 1.2 : 5)) * (1 + malicious * (security > .7 ? .2 : 1.1)));
  const recoveryTimeMinutes = Math.max(1, (95 - alternative.scorecard.resilience) * 2.4 * (regionLoss ? 1.4 : 1) / (hasFailover ? 4 : 1));
  const recoveryPointMinutes = Math.max(0, (95 - alternative.scorecard.resilience) * .8 / (hasAsyncBuffer ? 2.5 : 1));
  const monthlyMid = (alternative.costProjection.monthlyLow + alternative.costProjection.monthlyHigh) / 2;
  const estimatedMonthlyCost = monthlyMid * Math.max(.65, 1 + (traffic - 1) * .35) * (1 - budgetReduction * .15);
  const operationalLoadScore = clamp((1 - simplicity) * 70 + overload * 25 + (1 - teamCapacity) * 55 + regionLoss * 20);
  const securityExposureScore = clamp((1 - security) * 72 + malicious * 55 + (scenario.type === 'model-provider-outage' && !hasAiFallback ? 15 : 0));
  const deliveryRiskScore = clamp((1 - alternative.scorecard.deliveryFeasibility / 100) * 70 + (1 - teamCapacity) * 60 + budgetReduction * 35);
  return { availabilityPercent: round(clamp(availability, 0, 99.999), 3), p95LatencyMs: Math.round(p95LatencyMs), recoveryTimeMinutes: Math.round(recoveryTimeMinutes), recoveryPointMinutes: Math.round(recoveryPointMinutes), throughputCapacityMultiplier: round(capacity), estimatedMonthlyCost: Math.round(estimatedMonthlyCost), operationalLoadScore: round(operationalLoadScore), securityExposureScore: round(securityExposureScore), deliveryRiskScore: round(deliveryRiskScore) };
}


function evidenceAdjustedOutcome(
  defaultOutcome: ArchitectureSimulationOutcome,
  defaultBaseline: ArchitectureSimulationOutcome,
  scenario: ArchitectureSimulationScenario,
  profile?: SimulationCalibrationProfile,
): { outcome: ArchitectureSimulationOutcome; mode: 'default-comparative' | 'evidence-adjusted'; evidenceIds: string[]; confidenceBoost: number; basis: string[] } {
  if (!profile || profile.status !== 'approved') return {
    outcome: defaultOutcome,
    mode: 'default-comparative',
    evidenceIds: [],
    confidenceBoost: 0,
    basis: ['Default comparative coefficients; no approved empirical calibration profile was applied.'],
  };
  const evidence = profile.evidence.filter((item) => item.scenarioType === 'all' || item.scenarioType === scenario.type || (scenario.type === 'baseline' && item.scenarioType === 'baseline'));
  if (!evidence.length) return {
    outcome: defaultOutcome,
    mode: 'default-comparative',
    evidenceIds: [],
    confidenceBoost: 0,
    basis: [`Approved profile ${profile.id} has no evidence for ${scenario.type}; default coefficients remain active.`],
  };
  const keys = Object.keys(defaultOutcome) as Array<keyof ArchitectureSimulationOutcome>;
  const adjusted = { ...defaultOutcome };
  const basis: string[] = [];
  let totalConfidence = 0;
  let appliedMetrics = 0;
  for (const key of keys) {
    const samples = evidence.filter((item) => typeof item.outcome[key] === 'number');
    if (!samples.length) continue;
    const denominator = samples.reduce((sum, item) => sum + Math.max(1, item.confidence), 0);
    const measured = samples.reduce((sum, item) => sum + Number(item.outcome[key]) * Math.max(1, item.confidence), 0) / denominator;
    const baseline = defaultBaseline[key];
    const current = defaultOutcome[key];
    let next: number;
    if (key === 'availabilityPercent' || key.endsWith('Score')) next = current + (measured - baseline);
    else if (Math.abs(baseline) > 0.0001) next = current * (measured / baseline);
    else next = measured;
    if (key === 'availabilityPercent') next = clamp(next, 0, 99.999);
    else if (key.endsWith('Score')) next = clamp(next, 0, 100);
    else next = Math.max(0, next);
    adjusted[key] = (key === 'availabilityPercent' || key === 'throughputCapacityMultiplier' || key.endsWith('Score') ? round(next, 3) : Math.round(next)) as never;
    totalConfidence += samples.reduce((sum, item) => sum + item.confidence, 0) / samples.length;
    appliedMetrics += 1;
    basis.push(`${String(key)} calibrated from ${samples.length} approved evidence item(s).`);
  }
  return {
    outcome: adjusted,
    mode: appliedMetrics ? 'evidence-adjusted' : 'default-comparative',
    evidenceIds: evidence.map((item) => item.id),
    confidenceBoost: appliedMetrics ? Math.min(18, Math.round((totalConfidence / appliedMetrics) * .18)) : 0,
    basis: appliedMetrics ? basis : ['Calibration evidence did not contain measurable outcome fields.'],
  };
}

export function simulateArchitectureAlternative(run: ArchitectureSynthesisRun, alternativeId: string, scenario: ArchitectureSimulationScenario, calibrationProfile?: SimulationCalibrationProfile): ArchitectureSimulationResult {
  const alternative = run.alternatives.find((item) => item.id === alternativeId);
  if (!alternative) throw new Error('SYNTHESIS_ALTERNATIVE_NOT_FOUND');
  const defaultOutcome = simulationOutcome(alternative, scenario);
  const baselineScenario = sprint80DefaultSimulationScenarios.find((item) => item.type === 'baseline')!;
  const defaultBaseline = simulationOutcome(alternative, baselineScenario);
  const calibrated = evidenceAdjustedOutcome(defaultOutcome, defaultBaseline, scenario, calibrationProfile);
  const outcome = calibrated.outcome;
  const calibratedBaseline = evidenceAdjustedOutcome(defaultBaseline, defaultBaseline, baselineScenario, calibrationProfile).outcome;
  const baselineDelta = Object.fromEntries(Object.entries(outcome).map(([key, value]) => [key, round(value - calibratedBaseline[key as keyof typeof calibratedBaseline], 3)]));
  const findings: ArchitectureSimulationResult['findings'] = [];
  const addFinding = (severity: 'info' | 'warning' | 'critical', category: ArchitectureSimulationResult['findings'][number]['category'], message: string, mitigation: string) => findings.push({ id: `SIMF-${stableHash(`${alternativeId}:${scenario.id}:${category}:${message}`)}`, severity, category, message, mitigation, relatedPatternIds: alternative.patternIds });
  if (outcome.availabilityPercent < 99) addFinding(outcome.availabilityPercent < 95 ? 'critical' : 'warning', 'availability', `Projected availability falls to ${outcome.availabilityPercent}%.`, 'Introduce or strengthen isolation, failover, replication, timeout and recovery mechanisms.');
  if (outcome.p95LatencyMs > 1000) addFinding(outcome.p95LatencyMs > 3000 ? 'critical' : 'warning', 'performance', `Projected p95 latency rises to ${outcome.p95LatencyMs} ms.`, 'Use load leveling, caching, back-pressure, asynchronous processing or capacity scaling.');
  if (outcome.securityExposureScore > 55) addFinding(outcome.securityExposureScore > 75 ? 'critical' : 'warning', 'security', `Security exposure score reaches ${outcome.securityExposureScore}.`, 'Strengthen identity, policy enforcement, isolation, audit and threat detection.');
  if (outcome.operationalLoadScore > 65) addFinding('warning', 'operations', `Operational load score reaches ${outcome.operationalLoadScore}.`, 'Reduce topology complexity or invest in platform automation, observability and runbook coverage.');
  if (outcome.deliveryRiskScore > 65) addFinding('warning', 'delivery', `Delivery risk score reaches ${outcome.deliveryRiskScore}.`, 'Adopt a transition architecture and stage the highest-risk capabilities.');
  if (!findings.length) addFinding('info', 'availability', 'No critical threshold was breached in this deterministic scenario.', 'Validate the result through workload tests, chaos experiments and provider-specific cost modelling.');
  const baseConfidence = run.assessment.completenessScore >= 80 ? 76 : run.assessment.completenessScore >= 60 ? 62 : 45;
  return { id: `SIMR-${stableHash(`${run.id}:${alternativeId}:${scenario.id}:${calibrationProfile?.id ?? 'default'}`)}`, runId: run.id, alternativeId, scenario, simulatedAt: new Date().toISOString(), deterministicModelVersion: `${MODEL_VERSION}${calibrated.mode === 'evidence-adjusted' ? '+empirical' : ''}`, outcome, baselineDelta, findings, assumptions: ['This comparative architecture model is not a capacity guarantee and does not replace capacity, chaos, security or disaster-recovery testing.', ...(calibrated.mode === 'evidence-adjusted' ? [`Adjusted with approved profile ${calibrationProfile?.id}.`] : ['Provider topology, workload distributions and empirical benchmarks should replace default coefficients before final approval.'])], confidence: Math.min(95, baseConfidence + calibrated.confidenceBoost), calibrationMode: calibrated.mode, ...(calibrationProfile && calibrated.mode === 'evidence-adjusted' ? { calibrationProfileId: calibrationProfile.id } : {}), calibrationEvidenceIds: calibrated.evidenceIds, confidenceBasis: calibrated.basis };
}

export function runArchitectureSimulationSuite(run: ArchitectureSynthesisRun, alternativeId: string, scenarios: ArchitectureSimulationScenario[] = sprint80DefaultSimulationScenarios, calibrationProfile?: SimulationCalibrationProfile): ArchitectureSimulationResult[] {
  return scenarios.map((scenario) => simulateArchitectureAlternative(run, alternativeId, scenario, calibrationProfile));
}

export function applyArchitectureAlternative(project: ArchitectureProject, alternative: ArchitectureAlternative, status: 'considering' | 'accepted' = 'considering'): ArchitectureProject {
  const updated = applyPatternComposition(project, alternative.compositionPlan);
  for (const selection of updated.patternSelections) if (alternative.patternIds.includes(selection.patternId)) selection.status = status;
  const appliedAt = new Date().toISOString();
  const interfaceById = new Map((updated.interfaces ?? []).map((item) => [item.id, item]));
  for (const contract of alternative.blueprint.interfaceContracts) {
    if (interfaceById.has(contract.id)) continue;
    interfaceById.set(contract.id, {
      id: contract.id, name: contract.name, stage: 'applicationRealization', providerNodeId: contract.providerNodeId, consumerNodeIds: contract.consumerNodeIds,
      interactionStyle: contract.interactionStyle, protocol: contract.protocol, operationOrEvent: contract.operationOrEvent, schemaRef: contract.schemaRef, version: contract.version,
      authentication: contract.authentication, authorization: contract.authorization, encryption: contract.encryption, ...(contract.timeoutMs !== undefined ? { timeoutMs: contract.timeoutMs } : {}),
      retryPolicy: contract.retryPolicy, idempotency: contract.idempotency, ordering: contract.ordering, deliveryGuarantee: contract.deliveryGuarantee, deadLetterPolicy: contract.deadLetterPolicy, replayPolicy: contract.replayPolicy,
      slo: contract.slo, dataClassification: contract.dataClassification, owner: contract.owner, lifecycleStatus: status === 'accepted' ? 'active' : 'proposed', evidenceIds: contract.requirementRefs, contractLocation: contract.schemaRef,
      createdAt: appliedAt, updatedAt: appliedAt,
    });
  }
  updated.interfaces = [...interfaceById.values()];
  const lineageByNode = new Map(alternative.blueprint.componentLineage.map((item) => [item.nodeId, item]));
  updated.nodes = updated.nodes.map((node) => {
    const lineage = lineageByNode.get(node.id);
    if (!lineage) return node;
    return { ...node, lineageFrom: [...new Set([...node.lineageFrom, ...lineage.patternIds, ...lineage.logicalNodeIds])], properties: { ...node.properties, synthesisBlueprintId: alternative.blueprint.id, requirementRefs: lineage.requirementRefs, patternIds: lineage.patternIds, logicalLineageIds: lineage.logicalNodeIds, capabilityIds: lineage.capabilityIds } };
  });
  const existingViewIds = new Set((updated.architectureViews ?? []).map((item) => item.id));
  const kindForView = (viewId: string) => viewId === 'security-trust-boundaries' ? 'security' as const : viewId === 'physical-deployment' ? 'deployment' as const : viewId === 'cross-stage-traceability' ? 'conformance' as const : viewId === 'system-context' ? 'executive' as const : viewId === 'resilience-recovery' ? 'diagnostic' as const : 'model' as const;
  const generatedViews = alternative.blueprint.views.filter((view) => !existingViewIds.has(`SYN-VIEW-${view.id}-${alternative.id}`)).map((view) => ({
    id: `SYN-VIEW-${view.id}-${alternative.id}`, projectId: updated.id, branchId: updated.branch.id, name: view.title, kind: kindForView(view.id), density: view.id === 'system-context' ? 'executive' as const : 'standard' as const,
    description: view.purpose, intent: `Generated from synthesis blueprint ${alternative.blueprint.id}.`, filters: { includeNodeIds: view.nodeIds, showEvidence: true, showFindings: true },
    nodeStates: Object.fromEntries(view.nodeIds.map((nodeId) => [nodeId, { nodeId }])), edgeStates: Object.fromEntries(view.edgeIds.map((edgeId) => [edgeId, { edgeId, labelVisible: true }])),
    presentationMode: false, createdAt: appliedAt, updatedAt: appliedAt, createdBy: 'aiw-synthesis', version: 1,
  }));
  updated.architectureViews = [...(updated.architectureViews ?? []), ...generatedViews];
  updated.decisions.push({
    id: `decision-${stableHash(`${alternative.id}:${project.revision}`)}`,
    title: `Select ${alternative.name}`,
    context: `AIW synthesized ${alternative.strategyId} alternative ${alternative.id} from governed knowledge release evidence.`,
    decision: `${status === 'accepted' ? 'Adopt' : 'Evaluate'} the architecture alternative composed from ${alternative.patternIds.join(', ')}.`,
    drivers: Object.entries(alternative.scorecard).filter(([key]) => key !== 'overall').sort((a, b) => b[1] - a[1]).slice(0, 4).map(([key, value]) => `${key}: ${value}`),
    consideredOptions: [alternative.name, 'Retain current architecture', 'Generate an additional alternative after clarifying the design brief'],
    consequences: [...alternative.obligations.slice(0, 8).map((item) => item.description), ...alternative.risks.slice(0, 5).map((item) => `${item.title}: ${item.mitigation}`)],
    status: status === 'accepted' ? 'accepted' : 'proposed', createdAt: appliedAt, linkedRecordIds: alternative.patternIds,
  });
  // Pattern composition and decision capture are one atomic architecture change.
  // applyPatternComposition has already advanced the project revision.
  updated.updatedAt = new Date().toISOString();
  return updated;
}

export function createSynthesisDecisionPackage(run: ArchitectureSynthesisRun, alternativeId: string, simulationResults: ArchitectureSimulationResult[], rationale: string, accept = false): SynthesisDecisionPackage {
  const alternative = run.alternatives.find((item) => item.id === alternativeId);
  if (!alternative) throw new Error('SYNTHESIS_ALTERNATIVE_NOT_FOUND');
  const architectureDecision = applyArchitectureAlternative(alternative.projectedProject, alternative, accept ? 'accepted' : 'considering').decisions.at(-1)!;
  const fitness = generateArchitectureFitnessFunctions(alternative.patternIds);
  return {
    id: `SYND-${stableHash(`${run.id}:${alternativeId}:${rationale}`)}`,
    runId: run.id, alternativeId, createdAt: new Date().toISOString(), status: accept ? 'accepted' : 'proposed', rationale, architectureDecision,
    selectedPatternIds: alternative.patternIds, openObligationIds: alternative.obligations.map((item) => item.id), requiredApprovalStages: ['logicalApplication','applicationRealization','logicalTechnology','validationRealization'],
    simulationResultIds: simulationResults.filter((item) => item.alternativeId === alternativeId).map((item) => item.id),
    artifactPaths: ['synthesis/decision-package.json','synthesis/alternative-project.json','synthesis/architecture-blueprint.json','docs/adr/synthesis-decision.md','docs/sdd/architecture-synthesis-and-deployment.md','docs/simulation-report.md','architecture/interface-register.csv','architecture/cross-stage-traceability.csv','architecture/calm.json','simulation/results.json', ...alternative.blueprint.views.map((view) => `diagrams/${view.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.svg`)],
    conformanceTargets: [...new Set(fitness.map((item) => item.target))],
    blueprintId: alternative.blueprint.id,
    interfaceContractIds: alternative.blueprint.interfaceContracts.map((item) => item.id),
    providerNeutralFirst: alternative.blueprint.providerNeutralFirst,
    architectureViewIds: alternative.blueprint.views.map((view) => `SYN-VIEW-${view.id}-${alternative.id}`),
  };
}
