import type { ArchitectureProject, KnowledgeLibrary } from '@aiw/domain';

// -----------------------------------------------------------------------------
// AI design-assist contracts (Sprint 8.1).
// This module is the deterministic side of the LLM boundary: it BUILDS prompts
// and SANITIZES responses. It never calls a provider — the API layer routes the
// prompt through the multi-provider LlmGateway. Invariants enforced here:
//   * the LLM never sets HARD severity (clamped),
//   * extracted weights are clamped to the studio scale (integers 0..5),
//   * enums are validated against the workbench vocabulary,
//   * output is bounded so a misbehaving provider cannot flood the model.
// Pure and dependency-free so it is unit-testable offline.
// -----------------------------------------------------------------------------

export interface AiPrompt {
  purpose: 'architecture-reasoning';
  system: string;
  user: string;
  schemaName: string;
}

export interface BriefExtraction {
  summary: string;
  weights: Record<string, number>; // attributeId -> 0..5
  context: {
    teamSize?: number;
    operationalMaturity?: 1 | 2 | 3 | 4 | 5;
    regulatoryExposure?: 'low' | 'medium' | 'high';
    problemShapes?: string[];
    prohibitedTechnologies?: string[];
    stakeholders?: string[];
    inScopeCapabilities?: string[];
    outOfScopeCapabilities?: string[];
    dataClassifications?: string[];
    regulatoryJurisdictions?: string[];
    existingSystems?: string[];
    workloadProfile?: string;
    availabilityTarget?: string;
    recoveryObjectives?: string;
    teamTopology?: string;
  };
  clarifyingQuestions: string[];
  proposedQualityScenarios: Array<{
    attributeId: string;
    source: string;
    stimulus: string;
    environment: string;
    artifact: string;
    response: string;
    responseMeasure: string;
  }>;
}

export interface RankingExplanation {
  explanation: string;
  counterfactual: string;
}

const PROBLEM_SHAPES = ['dataPipeline', 'pluginPlatform'];

function calibratedAttributeIds(library: KnowledgeLibrary): string[] {
  return library.qualityAttributes
    .filter((attribute) => attribute.calibrated === true && ['production','approved','benchmark-approved'].includes(attribute.calibrationStatus ?? 'production'))
    .map((attribute) => attribute.id);
}

export function buildBriefExtractionPrompt(
  project: Pick<ArchitectureProject, 'name' | 'description' | 'objectives' | 'constraints' | 'assumptions'>,
  library: KnowledgeLibrary,
): AiPrompt {
  const attributeIds = calibratedAttributeIds(library);
  return {
    purpose: 'architecture-reasoning',
    schemaName: 'design_brief_extraction',
    system: [
      'You are the intake analyst of an architecture design workbench.',
      'You extract structured design drivers from prose. You never decide the architecture;',
      'the deterministic engine scores styles from your extraction, and the architect can edit everything.',
      'Respond with ONLY minified JSON matching the requested schema. No prose, no markdown fences.',
    ].join(' '),
    user: JSON.stringify({
      schema: {
        summary: 'string, <= 40 words, neutral restatement of the problem',
        weights: `object mapping attributeId -> integer 0..5 (5 critical, 4 important, 2 consider, 0 not a driver); allowed ids: ${attributeIds.join(', ')}; only mark what the brief supports`,
        context: {
          teamSize: 'optional integer, total engineers if stated or clearly implied',
          operationalMaturity: 'optional 1..5, only if the brief supports it',
          regulatoryExposure: "optional 'low'|'medium'|'high'",
          problemShapes: `optional subset of ${JSON.stringify(PROBLEM_SHAPES)}`,
          prohibitedTechnologies: 'optional string[], only if the brief names bans',
          stakeholders: 'optional string[] max 8, named user groups and decision makers',
          inScopeCapabilities: 'optional string[] max 8', outOfScopeCapabilities: 'optional string[] max 6',
          dataClassifications: 'optional string[] max 5 (e.g. PII, PCI, PHI, public)',
          regulatoryJurisdictions: 'optional string[] max 6 (e.g. NG NDPR, EU GDPR)',
          existingSystems: 'optional string[] max 8, brownfield systems named in the brief',
          workloadProfile: 'optional string <=25 words, volumes/growth/peaks if stated',
          availabilityTarget: 'optional string <=12 words (e.g. 99.95% monthly)',
          recoveryObjectives: 'optional string <=15 words (RTO/RPO if stated)',
          teamTopology: 'optional string <=20 words',
        },
        clarifyingQuestions: 'string[], max 3, the highest-value missing facts',
        proposedQualityScenarios: `array max 4 of measurable SEI quality scenarios {attributeId: one of ${library.qualityAttributes.map((attribute) => attribute.id).join('|')}, source, stimulus, environment, artifact, response, responseMeasure: string each <=20 words, responseMeasure MUST be numerically measurable}; only scenarios the brief supports`,
      },
      brief: {
        name: project.name,
        description: (project.description || '').slice(0, 1200),
        objectives: project.objectives.slice(0, 12),
        constraints: project.constraints.slice(0, 12),
        assumptions: project.assumptions.slice(0, 12),
      },
    }),
  };
}

export function sanitizeBriefExtraction(raw: unknown, library: KnowledgeLibrary): BriefExtraction {
  const value = (raw ?? {}) as Record<string, unknown>;
  const allowed = new Set(calibratedAttributeIds(library));
  const weights: Record<string, number> = {};
  const rawWeights = (value.weights ?? {}) as Record<string, unknown>;
  for (const [key, weight] of Object.entries(rawWeights)) {
    if (!allowed.has(key)) continue;
    const bounded = Math.round(Number(weight));
    if (Number.isFinite(bounded) && bounded > 0) weights[key] = Math.max(0, Math.min(5, bounded));
  }
  const rawContext = (value.context ?? {}) as Record<string, unknown>;
  const context: BriefExtraction['context'] = {};
  const teamSize = Math.round(Number(rawContext.teamSize));
  if (Number.isFinite(teamSize) && teamSize > 0 && teamSize < 100000) context.teamSize = teamSize;
  const maturity = Math.round(Number(rawContext.operationalMaturity));
  if (maturity >= 1 && maturity <= 5) context.operationalMaturity = maturity as 1 | 2 | 3 | 4 | 5;
  if (['low', 'medium', 'high'].includes(String(rawContext.regulatoryExposure))) {
    context.regulatoryExposure = rawContext.regulatoryExposure as 'low' | 'medium' | 'high';
  }
  const shapes = Array.isArray(rawContext.problemShapes)
    ? rawContext.problemShapes.map(String).filter((shape) => PROBLEM_SHAPES.includes(shape))
    : [];
  if (shapes.length) context.problemShapes = [...new Set(shapes)];
  const bans = Array.isArray(rawContext.prohibitedTechnologies)
    ? rawContext.prohibitedTechnologies.map(String).map((item) => item.slice(0, 60)).slice(0, 10)
    : [];
  if (bans.length) context.prohibitedTechnologies = bans;
  const stringList = (key: string, max: number) => {
    const value = rawContext[key];
    const list = Array.isArray(value) ? value.map(String).map((item) => item.slice(0, 90)).filter(Boolean).slice(0, max) : [];
    return list.length ? list : undefined;
  };
  const shortText = (key: string, max: number) => {
    const value = String(rawContext[key] ?? '').slice(0, max).trim();
    return value ? value : undefined;
  };
  const structured: Array<[keyof BriefExtraction['context'], string[] | string | undefined]> = [
    ['stakeholders', stringList('stakeholders', 8)],
    ['inScopeCapabilities', stringList('inScopeCapabilities', 8)],
    ['outOfScopeCapabilities', stringList('outOfScopeCapabilities', 6)],
    ['dataClassifications', stringList('dataClassifications', 5)],
    ['regulatoryJurisdictions', stringList('regulatoryJurisdictions', 6)],
    ['existingSystems', stringList('existingSystems', 8)],
    ['workloadProfile', shortText('workloadProfile', 200)],
    ['availabilityTarget', shortText('availabilityTarget', 80)],
    ['recoveryObjectives', shortText('recoveryObjectives', 120)],
    ['teamTopology', shortText('teamTopology', 160)],
  ];
  for (const [key, value] of structured) if (value !== undefined) (context as Record<string, unknown>)[key] = value;
  const catalogIds = new Set(library.qualityAttributes.map((attribute) => attribute.id));
  const proposedQualityScenarios = (Array.isArray(value.proposedQualityScenarios) ? value.proposedQualityScenarios : [])
    .slice(0, 4)
    .map((item) => {
      const scenario = (item ?? {}) as Record<string, unknown>;
      const field = (key: string) => String(scenario[key] ?? '').slice(0, 200);
      return {
        attributeId: String(scenario.attributeId ?? ''),
        source: field('source'), stimulus: field('stimulus'), environment: field('environment'),
        artifact: field('artifact'), response: field('response'), responseMeasure: field('responseMeasure'),
      };
    })
    .filter((scenario) => catalogIds.has(scenario.attributeId) && scenario.stimulus && scenario.responseMeasure);
  return {
    summary: String(value.summary ?? '').slice(0, 400),
    weights,
    context,
    clarifyingQuestions: (Array.isArray(value.clarifyingQuestions) ? value.clarifyingQuestions : [])
      .map(String).map((question) => question.slice(0, 200)).slice(0, 3),
    proposedQualityScenarios,
  };
}

export function buildRankingExplanationPrompt(input: {
  drivers: Array<{ attributeId: string; weight: number }>;
  ranking: Array<{ styleId: string; styleName: string; score: number; tradeoffs: string[] }>;
  audienceNote?: string;
}): AiPrompt {
  return {
    purpose: 'architecture-reasoning',
    schemaName: 'ranking_explanation',
    system: [
      'You explain deterministic architecture-style rankings to junior architects.',
      'The scores are computed by an inspectable engine and are authoritative; you interpret, you do not re-rank.',
      'Respond with ONLY minified JSON: {"explanation": string <=110 words plain prose, "counterfactual": string <=35 words describing one contextual change that would make a different style lead}.',
    ].join(' '),
    user: JSON.stringify({
      drivers: input.drivers.slice(0, 8),
      rankingTop3: input.ranking.slice(0, 3),
      audienceNote: input.audienceNote ?? 'junior architect, first architecture decision',
    }),
  };
}

export function sanitizeRankingExplanation(raw: unknown): RankingExplanation {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    explanation: String(value.explanation ?? '').slice(0, 900),
    counterfactual: String(value.counterfactual ?? '').slice(0, 300),
  };
}

/** The LLM may never introduce or escalate to HARD severity. */
export function clampAiSeverity(severity: unknown): 'SIGNIFICANT' | 'ADVISORY' {
  return severity === 'SIGNIFICANT' ? 'SIGNIFICANT' : 'ADVISORY';
}
