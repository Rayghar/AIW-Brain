import type {
  ArchitectureBrainContextReceipt,
  ArchitectureBrainLineagePath,
  ArchitectureBrainProposalReceipt,
  SolQualityGateResult,
  SolResponseQualityReceipt,
} from '@aiw/domain';

export const SOL_QUALITY_EVALUATOR_VERSION = 'SOL-QUALITY-1.1-rc10.72.3';

export interface SolQualityEvaluationInput {
  expectedLifecycleStage: string;
  actualLifecycleStage: string;
  question: string;
  answer: string;
  recommendation: string;
  observations: string[];
  tradeOffs: string[];
  clarifyingQuestions: string[];
  suggestedActionCount: number;
  confidence: 'high' | 'medium' | 'low';
  citedRecordIds: string[];
  context: ArchitectureBrainContextReceipt;
  receipt?: Pick<ArchitectureBrainProposalReceipt, 'governance' | 'deterministicRules' | 'knowledgeRefs' | 'llm'>;
  lineagePaths?: ArchitectureBrainLineagePath[];
  allowedEvidenceText?: string;
}

const genericPhrases = [
  'consider scalability',
  'consider security',
  'follow best practices',
  'ensure reliability',
  'use microservices',
  'use the cloud',
  'it depends',
  'consider performance',
];

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function gate(
  dimension: SolQualityGateResult['dimension'],
  score: number,
  threshold: number,
  critical: boolean,
  rationale: string,
  evidence: string[],
): SolQualityGateResult {
  const normalized = clamp(score);
  return {
    dimension,
    score: normalized,
    threshold,
    status: normalized >= threshold ? 'passed' : normalized >= threshold - 15 ? 'warning' : 'failed',
    critical,
    rationale,
    evidence,
  };
}

function substantive(items: string[]): string[] {
  return items.map((item) => item.trim()).filter((item) => item.length >= 18);
}

function unsupportedClaims(value: string, allowedEvidenceText: string): string[] {
  const text = value.toLowerCase();
  const evidence = allowedEvidenceText.toLowerCase();
  const patterns = [
    /\b\d+(?:\.\d+)?\s*(?:ms|milliseconds?|seconds?|minutes?|hours?)\b/gi,
    /\b\d+(?:\.\d+)?\s*(?:tps|rps|requests?\/s|transactions?\/s)\b/gi,
    /\b\d+(?:\.\d+)?\s*%\s*(?:availability|uptime|sla)?\b/gi,
    /\b(?:rto|rpo)\s*(?:of|=|:)?\s*\d+(?:\.\d+)?\s*(?:minutes?|hours?|days?)\b/gi,
    /\b(?:must comply with|is required by|mandated by)\s+[A-Z][A-Za-z0-9 .()/-]{3,80}/g,
  ];
  const found = new Set<string>();
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const claim = match[0].trim();
      if (claim && !evidence.includes(claim)) found.add(claim);
    }
  }
  return [...found];
}

function stageVocabulary(stage: string): string[] {
  const vocabulary: Record<string, string[]> = {
    requirements: ['requirement', 'stakeholder', 'scope', 'outcome', 'assumption', 'journey'],
    quality: ['quality', 'scenario', 'stimulus', 'response', 'measure', 'trade-off'],
    context: ['actor', 'external system', 'boundary', 'interaction', 'journey', 'trust'],
    logical: ['responsibility', 'domain', 'logical', 'boundary', 'coupling', 'ownership'],
    realization: ['component', 'interface', 'api', 'event', 'state', 'deployable'],
    logicalTechnology: ['capability', 'provider-neutral', 'runtime', 'identity', 'observability', 'resilience'],
    physicalTechnology: ['deployment', 'region', 'zone', 'cluster', 'network', 'failure domain'],
    review: ['finding', 'evidence', 'decision', 'approval', 'risk', 'disposition'],
    sdd: ['sdd', 'section', 'delivery', 'baseline', 'evidence', 'stale'],
  };
  return vocabulary[stage] ?? [];
}


function stageIncompatibleSignals(stage: string, value: string): string[] {
  const patterns: Record<string, Array<[RegExp, string]>> = {
    requirements: [
      [/responsibility-bearing object|deployable|provider-neutral capability|physical topology/i, 'downstream-design-action'],
    ],
    quality: [
      [/create the first responsibility-bearing object|add (?:a )?component|bind .* product/i, 'premature-design-action'],
    ],
    context: [
      [/component decomposition|technology product|database product/i, 'inside-boundary-design-drift'],
    ],
    logical: [
      [/kubernetes|postgresql|aws|azure|gcp|vendor product/i, 'technology-binding-in-logical-stage'],
    ],
    realization: [
      [/region placement|availability zone product|cloud vendor/i, 'deployment-drift'],
    ],
    logicalTechnology: [
      [/managed (?:kubernetes|postgresql|kafka)|aws|azure|gcp/i, 'provider-binding-before-physical-stage'],
    ],
    review: [
      [/create the first responsibility-bearing object|add a component before/i, 'design-generation-in-review'],
    ],
    sdd: [
      [/create the first responsibility-bearing object|add a component before/i, 'design-generation-in-delivery'],
    ],
  };
  return (patterns[stage] ?? []).filter(([pattern]) => pattern.test(value)).map(([, label]) => label);
}

function requestedSignals(question: string, stage: string): string[] {
  const candidates = [
    ...stageVocabulary(stage),
    'ambiguity', 'stakeholder', 'clarification', 'evidence', 'cite',
    'stimulus', 'environment', 'response measure', 'actor', 'external system',
    'trust boundary', 'responsibility', 'ownership', 'coupling', 'alternative',
    'component', 'interface', 'event', 'state', 'failure', 'provider-neutral',
    'quality driver', 'zone', 'failure domain', 'network', 'recovery',
    'finding', 'decision', 'approval', 'disposition', 'section', 'diagram', 'stale',
  ];
  const lower = question.toLowerCase();
  return [...new Set(candidates.filter((item) => lower.includes(item.toLowerCase())))];
}

export function evaluateSolResponseQuality(input: SolQualityEvaluationInput): SolResponseQualityReceipt {
  const combined = [input.answer, input.recommendation, ...input.observations, ...input.tradeOffs, ...input.clarifyingQuestions].join(' ').toLowerCase();
  const primary = [input.answer, input.recommendation, ...input.clarifyingQuestions].join(' ').toLowerCase();
  const stageWords = stageVocabulary(input.expectedLifecycleStage);
  const stageWordHits = stageWords.filter((item) => primary.includes(item.toLowerCase()));
  const requested = requestedSignals(input.question, input.expectedLifecycleStage);
  const requestedHits = requested.filter((item) => primary.includes(item.toLowerCase()));
  const incompatibleSignals = stageIncompatibleSignals(input.expectedLifecycleStage, primary);
  const stageAligned = input.actualLifecycleStage === input.expectedLifecycleStage;
  const stageAlignmentScore = stageAligned
    ? clamp(60 + Math.min(28, stageWordHits.length * 7) + Math.min(21, requestedHits.length * 7) - incompatibleSignals.length * 45)
    : 0;

  const includedEvidence =
    input.context.included.requirements +
    input.context.included.qualityScenarios +
    input.context.included.journeys +
    input.context.included.nodes +
    input.context.included.interfaces +
    input.context.included.decisions +
    input.context.included.findings;
  const citationRequested = /\bcite|evidence|trace(?:ability)?|record id/i.test(input.question);
  let evidenceGroundingScore = Math.min(
    100,
    35 + Math.min(45, input.citedRecordIds.length * 18) + (input.context.evidenceRefs.length ? 10 : 0) + (includedEvidence ? 10 : 0),
  );
  if (citationRequested && !input.citedRecordIds.length) evidenceGroundingScore = Math.min(evidenceGroundingScore, 35);

  const genericAdviceFlags = [
    ...genericPhrases.filter((item) => combined.includes(item)),
    ...incompatibleSignals.map((item) => `stage-drift:${item}`),
  ];
  const concreteSignals = [
    input.context.scopeLabel,
    ...input.citedRecordIds,
    ...input.context.evidenceRefs,
  ].filter(Boolean).filter((item) => combined.includes(String(item).toLowerCase())).length;
  const specificityScore = clamp(
    54 + Math.min(24, concreteSignals * 6) + Math.min(24, input.citedRecordIds.length * 8)
      - genericAdviceFlags.length * 22 + (input.recommendation.length >= 55 ? 8 : 0),
  );

  const missingCount = input.context.missingInformation.length;
  const clarifications = substantive(input.clarifyingQuestions);
  const clarificationExplicitlyRequested = /clarif|ambigu|do not invent|missing (?:stimulus|environment|response|measure)|weakly evidenced/i.test(input.question);
  const clarificationScore = missingCount || clarificationExplicitlyRequested
    ? clamp(40 + Math.min(60, clarifications.length * 35))
    : clarifications.length
      ? 92
      : 82;

  const tradeOffScore = clamp(35 + substantive(input.tradeOffs).length * 24);
  const actionabilityScore = clamp(
    42 + (input.suggestedActionCount ? 35 : 0) + (input.recommendation.length >= 40 ? 15 : 0) + (input.question.length >= 12 ? 8 : 0),
  );
  const governanceScore = input.receipt
    ? clamp(
        35 +
          (input.receipt.governance.humanApprovalRequired ? 25 : 0) +
          (!input.receipt.governance.directModelMutationAllowed ? 25 : 0) +
          (input.receipt.deterministicRules.length ? 8 : 0) +
          (input.receipt.knowledgeRefs.length ? 7 : 0),
      )
    : 35;
  const lineageComplete = (input.lineagePaths ?? []).filter((item) => item.complete).length;
  const lineageTotal = input.lineagePaths?.length ?? 0;
  const lineageScore = lineageTotal
    ? clamp((lineageComplete / lineageTotal) * 100)
    : includedEvidence
      ? 65
      : 25;

  const claims = unsupportedClaims(
    [input.answer, input.recommendation, ...input.observations, ...input.tradeOffs].join(' '),
    input.allowedEvidenceText ?? '',
  );

  const gates: SolQualityGateResult[] = [
    gate('stage-alignment', stageAlignmentScore, 80, true, stageAligned && !incompatibleSignals.length ? 'The response uses the exact lifecycle stage and answers the stage-specific request.' : stageAligned ? 'The lifecycle label is correct, but the primary recommendation drifts into an incompatible stage action.' : `Expected ${input.expectedLifecycleStage}, received ${input.actualLifecycleStage}.`, [
      ...stageWordHits.map((item) => `stage:${item}`),
      ...requestedHits.map((item) => `question:${item}`),
      ...incompatibleSignals.map((item) => `incompatible:${item}`),
    ]),
    gate('evidence-grounding', evidenceGroundingScore, 70, true, citationRequested && !input.citedRecordIds.length ? 'The question requested evidence or citations, but the answer cited no project or knowledge record.' : 'The response is grounded in accepted project records or approved knowledge.', [`included-records:${includedEvidence}`, `citations:${input.citedRecordIds.length}`, `evidence-refs:${input.context.evidenceRefs.length}`, `citation-requested:${citationRequested}`]),
    gate('specificity', specificityScore, 70, false, genericAdviceFlags.length ? 'Generic advice was detected and must be replaced with project-specific reasoning.' : 'The response is tied to the current stage, scope or evidence.', genericAdviceFlags.length ? genericAdviceFlags : [`scope:${input.context.scopeLabel}`]),
    gate('clarification-discipline', clarificationScore, 75, true, missingCount ? 'Missing information must become explicit clarification rather than invented fact.' : 'No critical missing information required a new clarification.', [`missing:${missingCount}`, `questions:${clarifications.length}`]),
    gate('trade-off-quality', tradeOffScore, 70, false, 'Material architecture recommendations should expose consequences and alternatives.', [`trade-offs:${substantive(input.tradeOffs).length}`]),
    gate('actionability', actionabilityScore, 70, false, 'The response should identify a concrete reviewable next move.', [`actions:${input.suggestedActionCount}`]),
    gate('governance-transparency', governanceScore, 90, true, 'Human approval, deterministic authority and non-mutation boundaries must be visible.', input.receipt ? [`rules:${input.receipt.deterministicRules.length}`, `knowledge:${input.receipt.knowledgeRefs.length}`, `llm-used:${input.receipt.llm.used}`] : ['receipt:missing']),
    gate('lineage-completeness', lineageScore, 65, false, 'The recommendation should retain an inspectable path from intent and evidence to the proposed decision.', [`complete:${lineageComplete}`, `total:${lineageTotal}`]),
  ];

  if (claims.length) {
    const clarificationGate = gates.find((item) => item.dimension === 'clarification-discipline');
    if (clarificationGate) {
      clarificationGate.score = 0;
      clarificationGate.status = 'failed';
      clarificationGate.rationale = 'Unsupported numeric or legal claims were detected.';
      clarificationGate.evidence = claims;
    }
  }

  const weighted = gates.reduce((sum, item) => sum + item.score * (item.critical ? 1.5 : 1), 0);
  const weight = gates.reduce((sum, item) => sum + (item.critical ? 1.5 : 1), 0);
  const score = clamp(weighted / weight);
  const criticalFailures = gates.filter((item) => item.critical && item.status === 'failed');
  const failed = gates.filter((item) => item.status === 'failed');
  const issues = [
    ...failed.map((item) => `${item.dimension}: ${item.rationale}`),
    ...claims.map((item) => `unsupported-claim:${item}`),
  ];
  return {
    schemaVersion: '1.0',
    score,
    status: criticalFailures.length ? 'failed' : failed.length || score < 80 ? 'conditional' : 'passed',
    stageAligned,
    unsupportedClaimsDetected: claims,
    genericAdviceFlags,
    gates,
    issues,
    evaluatedAt: new Date().toISOString(),
    evaluatorVersion: SOL_QUALITY_EVALUATOR_VERSION,
  };
}
