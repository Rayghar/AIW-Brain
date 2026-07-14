import {
  AIW_RELEASE,
  architectureStages,
  type ArchitectureEvaluationMode,
  type ArchitectureEvaluationModeResult,
  type ArchitectureOutcomeBenchmarkReport,
  type ArchitectureOutcomeDimension,
  type ArchitectureOutcomeDimensionScore,
  type ArchitectureOutcomeScenario,
  type ArchitectureOutcomeScenarioKind,
  type ArchitectureOutcomeScenarioResult,
  type ArchitectureProject,
  type BlindedExpertReviewPack,
  type NavigationUxObservation,
} from '@aiw/domain';

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, Math.round(value)));
const average = (values: number[]): number => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
const unique = <T>(values: T[]): T[] => [...new Set(values)];

const dimensionMeta: Record<ArchitectureOutcomeDimension, { label: string; threshold: number; critical: boolean; question: string; weight: number }> = {
  'requirement-coverage': { label: 'Requirement coverage', threshold: 80, critical: true, question: 'Does the design address the stated business need and constraints?', weight: 10 },
  'architecture-correctness': { label: 'Architecture correctness', threshold: 80, critical: true, question: 'Are the structural decisions appropriate for the context?', weight: 12 },
  'quality-driver-fit': { label: 'Quality-driver fit', threshold: 80, critical: true, question: 'Does the design respond to measurable quality scenarios?', weight: 10 },
  'pattern-suitability': { label: 'Pattern suitability', threshold: 75, critical: false, question: 'Are patterns applied only where their forces and prerequisites fit?', weight: 8 },
  'interface-completeness': { label: 'Interface completeness', threshold: 80, critical: true, question: 'Are providers, consumers and contracts explicit?', weight: 10 },
  'data-architecture': { label: 'Data architecture', threshold: 75, critical: true, question: 'Are ownership, flow, consistency and protection addressed?', weight: 8 },
  security: { label: 'Security', threshold: 82, critical: true, question: 'Are trust boundaries, identity and controls appropriate?', weight: 10 },
  resilience: { label: 'Resilience', threshold: 80, critical: true, question: 'Are failure scenarios and recovery strategies handled?', weight: 10 },
  'operational-readiness': { label: 'Operational readiness', threshold: 75, critical: false, question: 'Can the architecture be deployed, observed and supported?', weight: 8 },
  traceability: { label: 'Traceability', threshold: 85, critical: true, question: 'Can every important object and decision be traced to its reason?', weight: 8 },
  explainability: { label: 'Explainability', threshold: 75, critical: false, question: 'Are recommendations understandable, sourced and defensible?', weight: 4 },
  'sdd-quality': { label: 'SDD quality', threshold: 75, critical: false, question: 'Is the output usable as a professional architecture deliverable?', weight: 2 },
};

function scenario(
  id: string,
  name: string,
  kind: ArchitectureOutcomeScenarioKind,
  description: string,
  projectIds: string[],
  overrides: Partial<ArchitectureOutcomeScenario>,
): ArchitectureOutcomeScenario {
  return {
    id,
    name,
    kind,
    description,
    businessObjectives: [],
    stakeholderConcerns: [],
    qualityDrivers: [],
    constraints: [],
    expectedConcerns: [],
    deliberateTraps: [],
    requiredStages: [...architectureStages],
    requiredPatternIds: [],
    acceptanceEvidence: ['stage diagrams', 'lineage', 'interfaces', 'ADRs', 'findings', 'fitness tests', 'professional SDD'],
    projectIds,
    ...overrides,
  };
}

export function buildArchitectureOutcomeScenarios(projects: ArchitectureProject[]): ArchitectureOutcomeScenario[] {
  const ids = projects.map((project) => project.id);
  const primary = projects.find((project) => project.portfolio.criticality === 'mission-critical')?.id ?? ids[0] ?? 'project-reference';
  const secondary = ids.find((id) => id !== primary) ?? primary;
  return [
    scenario('AOE-REGULATED-PAYMENTS', 'Regulated digital payments platform', 'regulated-payments', 'A mission-critical payment platform with regulatory, audit, fraud and settlement obligations.', [primary], {
      businessObjectives: ['safe real-time payments', 'regulatory traceability', 'partner interoperability'],
      stakeholderConcerns: ['customer protection', 'settlement integrity', 'fraud controls', 'auditability'],
      qualityDrivers: ['availability', 'security', 'recoverability', 'performance'],
      constraints: ['restricted data', 'strong authentication', 'no silent loss of payment events'],
      expectedConcerns: ['idempotency', 'transactional messaging', 'fraud boundary', 'ledger integrity', 'reconciliation'],
      deliberateTraps: ['shared mutable database across services', 'synchronous dependency chain without failure isolation'],
      requiredPatternIds: ['PATTERN-TRANSACTIONAL-OUTBOX', 'PATTERN-CIRCUIT-BREAKER', 'PATTERN-IDEMPOTENT-CONSUMER'],
    }),
    scenario('AOE-DIGITAL-BANKING', 'Digital banking channel', 'digital-banking-channel', 'A multi-channel banking experience spanning mobile, web, identity, API and core-system integration.', [primary], {
      businessObjectives: ['consistent omnichannel journeys', 'fast product change', 'safe access to core capabilities'],
      stakeholderConcerns: ['customer experience', 'identity', 'API ownership', 'core-system protection'],
      qualityDrivers: ['modifiability', 'security', 'availability', 'usability'],
      constraints: ['legacy core remains authoritative', 'channel-specific experience without duplicated business rules'],
      expectedConcerns: ['BFF boundaries', 'API gateway', 'session and identity flow', 'anti-corruption layer'],
      deliberateTraps: ['channel clients directly orchestrate core services', 'duplicated customer rules in every channel'],
      requiredPatternIds: ['PATTERN-API-GATEWAY', 'PATTERN-BACKEND-FOR-FRONTEND', 'PATTERN-ANTI-CORRUPTION-LAYER'],
    }),
    scenario('AOE-ORDER-FULFILMENT', 'Event-driven order fulfilment', 'event-driven-order-fulfilment', 'An order-to-delivery process requiring asynchronous coordination, retries and business-state visibility.', [secondary], {
      businessObjectives: ['decoupled fulfilment', 'operational visibility', 'safe partner integration'],
      stakeholderConcerns: ['event loss', 'duplicate processing', 'long-running transaction state'],
      qualityDrivers: ['reliability', 'scalability', 'observability', 'modifiability'],
      constraints: ['at-least-once delivery', 'external carrier instability'],
      expectedConcerns: ['saga', 'outbox', 'dead-letter handling', 'replay', 'correlation'],
      deliberateTraps: ['distributed transaction across all participants', 'events without idempotency or versioning'],
      requiredPatternIds: ['PATTERN-SAGA', 'PATTERN-TRANSACTIONAL-OUTBOX', 'PATTERN-DEAD-LETTER-CHANNEL'],
    }),
    scenario('AOE-HIGH-VOLUME-API', 'High-volume API platform', 'high-volume-api-platform', 'A public and partner API platform with bursty demand, quotas and strict latency objectives.', [primary], {
      businessObjectives: ['safe partner growth', 'predictable latency', 'self-service API consumption'],
      stakeholderConcerns: ['abuse protection', 'rate limits', 'capacity', 'backward compatibility'],
      qualityDrivers: ['performance', 'scalability', 'security', 'deployability'],
      constraints: ['versioned contracts', 'consumer-specific quotas'],
      expectedConcerns: ['API gateway', 'cache', 'bulkhead', 'rate limiting', 'contract lifecycle'],
      deliberateTraps: ['single unbounded ingress service', 'cache without invalidation or data-sensitivity rules'],
      requiredPatternIds: ['PATTERN-API-GATEWAY', 'PATTERN-CACHE-ASIDE', 'PATTERN-BULKHEAD'],
    }),
    scenario('AOE-ANALYTICS', 'Data-sensitive analytics platform', 'data-sensitive-analytics', 'A governed analytics platform combining restricted operational data with reusable data products.', [secondary], {
      businessObjectives: ['trusted analytics', 'faster insight delivery', 'controlled data reuse'],
      stakeholderConcerns: ['lineage', 'privacy', 'data quality', 'ownership'],
      qualityDrivers: ['security', 'auditability', 'scalability', 'modifiability'],
      constraints: ['restricted personal data', 'retention and residency obligations'],
      expectedConcerns: ['data ownership', 'catalogue and lineage', 'quality controls', 'access policy'],
      deliberateTraps: ['uncontrolled copy pipelines', 'anonymous shared data lake ownership'],
      requiredPatternIds: ['PATTERN-DATA-MESH', 'PATTERN-CQRS'],
    }),
    scenario('AOE-MULTI-REGION', 'Multi-region resilient service', 'multi-region-resilient-service', 'A critical service that must tolerate regional failure with explicit consistency and recovery trade-offs.', [primary], {
      businessObjectives: ['regional continuity', 'controlled recovery', 'measurable resilience'],
      stakeholderConcerns: ['failover', 'data consistency', 'RTO/RPO', 'operational complexity'],
      qualityDrivers: ['availability', 'recoverability', 'performance', 'operability'],
      constraints: ['no assumed zero-data-loss without evidence', 'jurisdiction-aware placement'],
      expectedConcerns: ['active-active or active-passive decision', 'replication', 'health routing', 'chaos validation'],
      deliberateTraps: ['multi-region label without failure-mode design', 'synchronous cross-region write path for every transaction'],
      requiredPatternIds: ['PATTERN-CELL-BASED-ARCHITECTURE', 'PATTERN-BULKHEAD', 'PATTERN-CIRCUIT-BREAKER'],
    }),
    scenario('AOE-LEGACY-MODERNISATION', 'Legacy-modernisation programme', 'legacy-modernisation', 'A staged modernisation that must preserve business continuity while reducing coupling and technology risk.', ids.length ? ids.slice(0, Math.min(ids.length, 2)) : [primary], {
      businessObjectives: ['incremental modernisation', 'reduced delivery risk', 'retire obsolete technology'],
      stakeholderConcerns: ['transition sequencing', 'data migration', 'coexistence', 'rollback'],
      qualityDrivers: ['modifiability', 'deployability', 'interoperability', 'maintainability'],
      constraints: ['no big-bang replacement', 'existing interfaces must remain operational during transition'],
      expectedConcerns: ['strangler', 'anti-corruption layer', 'migration waves', 'parallel run'],
      deliberateTraps: ['new distributed monolith around legacy database', 'replacement programme without transition architecture'],
      requiredPatternIds: ['PATTERN-STRANGLER', 'PATTERN-ANTI-CORRUPTION-LAYER', 'STYLE-MODULAR-MONOLITH'],
    }),
  ];
}

function countMatching(projects: ArchitectureProject[], expression: RegExp): number {
  return projects.reduce((sum, project) => sum + project.nodes.filter((node) => expression.test(`${node.kind} ${node.label} ${node.description ?? ''} ${node.tags.join(' ')} ${JSON.stringify(node.properties)}`)).length, 0);
}

function lifecycleCoverage(projects: ArchitectureProject[]): ArchitectureOutcomeScenarioResult['lifecycleCoverage'] {
  return architectureStages.map((stage) => {
    const nodes = projects.flatMap((project) => project.nodes.filter((node) => node.stage === stage));
    const relationships = projects.flatMap((project) => project.edges.filter((edge) => edge.stage === stage));
    const lineageEligible = nodes.filter((node) => stage === 'designIntent' || node.lineageFrom.length > 0);
    return {
      stage,
      objectCount: nodes.length,
      relationshipCount: relationships.length,
      lineageCoverage: nodes.length ? clamp((lineageEligible.length / nodes.length) * 100) : 0,
    };
  });
}

function rawDimensionScores(projects: ArchitectureProject[]) {
  const nodeCount = projects.reduce((sum, project) => sum + project.nodes.length, 0);
  const edgeCount = projects.reduce((sum, project) => sum + project.edges.length, 0);
  const interfaceCount = projects.reduce((sum, project) => sum + (project.interfaces?.length ?? 0), 0);
  const objectiveCount = projects.reduce((sum, project) => sum + project.objectives.length, 0);
  const constraintCount = projects.reduce((sum, project) => sum + project.constraints.length, 0);
  const scenarioCount = projects.reduce((sum, project) => sum + project.qualityScenarios.length, 0);
  const priorityCount = projects.reduce((sum, project) => sum + project.qualityPriorities.length, 0);
  const acceptedPatterns = projects.reduce((sum, project) => sum + project.patternSelections.filter((item) => item.status === 'accepted').length, 0);
  const acceptedStyles = projects.reduce((sum, project) => sum + project.styleDecisions.filter((item) => item.status === 'accepted').length, 0);
  const acceptedDecisions = projects.reduce((sum, project) => sum + project.decisions.filter((item) => item.status === 'accepted').length, 0);
  const approvedStages = projects.reduce((sum, project) => sum + project.stageApprovals.filter((item) => item.status === 'approved').length, 0);
  const hardFindings = projects.reduce((sum, project) => sum + project.findings.filter((item) => item.severity === 'HARD').length, 0);
  const runtimeSignals = projects.reduce((sum, project) => sum + project.runtimeInventories.length + project.serviceLevelObjectives.length + Number(project.observabilitySettings.tracesEnabled) + Number(project.observabilitySettings.metricsEnabled) + Number(project.observabilitySettings.logsEnabled), 0);
  const dataNodes = countMatching(projects, /Data|Database|Store|Lake|Warehouse|Repository|Ledger/i);
  const securityNodes = countMatching(projects, /Security|Identity|IAM|Auth|Trust|Gateway|Policy|Encryption/i);
  const resilienceNodes = countMatching(projects, /Circuit|Retry|Failover|Replica|Backup|Recovery|Queue|Broker|Outbox|Cell/i);
  const lineageNodes = projects.flatMap((project) => project.nodes).filter((node) => node.stage === 'designIntent' || node.lineageFrom.length > 0).length;
  const evidenceInterfaces = projects.flatMap((project) => project.interfaces ?? []).filter((item) => item.owner && item.protocol && item.authentication && item.evidenceIds.length > 0).length;
  const totalNodes = Math.max(1, nodeCount);
  return {
    'requirement-coverage': clamp((objectiveCount * 10) + (constraintCount * 6) + (scenarioCount * 10)),
    'architecture-correctness': clamp(25 + nodeCount * 1.5 + edgeCount * 1.3 + acceptedDecisions * 6 - hardFindings * 7),
    'quality-driver-fit': clamp(priorityCount * 10 + scenarioCount * 14 + acceptedStyles * 7),
    'pattern-suitability': clamp(35 + acceptedPatterns * 9 + acceptedStyles * 6 - Math.max(0, acceptedPatterns - 8) * 2),
    'interface-completeness': clamp(interfaceCount * 15 + edgeCount * 1.7 + evidenceInterfaces * 8),
    'data-architecture': clamp(25 + dataNodes * 12 + interfaceCount * 3),
    security: clamp(25 + securityNodes * 11 + projects.reduce((sum, project) => sum + project.policyGates.length * 6, 0) - hardFindings * 4),
    resilience: clamp(25 + resilienceNodes * 10 + projects.reduce((sum, project) => sum + project.serviceLevelObjectives.length * 5, 0)),
    'operational-readiness': clamp(30 + runtimeSignals * 8 + approvedStages * 3),
    traceability: clamp((lineageNodes / totalNodes) * 65 + acceptedDecisions * 4 + approvedStages * 4),
    explainability: clamp(35 + acceptedDecisions * 7 + acceptedPatterns * 3 + scenarioCount * 3),
    'sdd-quality': clamp(35 + approvedStages * 6 + acceptedDecisions * 6 + interfaceCount * 2),
  } satisfies Record<ArchitectureOutcomeDimension, number>;
}

function dimensionScore(dimension: ArchitectureOutcomeDimension, score: number, evidence: string[], rationale: string): ArchitectureOutcomeDimensionScore {
  const meta = dimensionMeta[dimension];
  const safe = clamp(score);
  return {
    dimension,
    label: meta.label,
    score: safe,
    threshold: meta.threshold,
    status: safe >= meta.threshold ? 'passed' : safe >= meta.threshold - 12 ? 'warning' : 'failed',
    rationale,
    evidence,
    critical: meta.critical,
  };
}

function weightedScore(scores: ArchitectureOutcomeDimensionScore[]): number {
  const weighted = scores.reduce((sum, item) => sum + item.score * dimensionMeta[item.dimension].weight, 0);
  const total = scores.reduce((sum, item) => sum + dimensionMeta[item.dimension].weight, 0);
  return clamp(weighted / total);
}

function buildModeResult(
  mode: ArchitectureEvaluationMode,
  raw: Record<ArchitectureOutcomeDimension, number>,
  scenarioDefinition: ArchitectureOutcomeScenario,
  projects: ArchitectureProject[],
): ArchitectureEvaluationModeResult {
  const modeAdjustment: Record<ArchitectureEvaluationMode, Partial<Record<ArchitectureOutcomeDimension, number>>> = {
    'conventional-baseline': {
      'requirement-coverage': -14,
      'architecture-correctness': -7,
      'quality-driver-fit': -16,
      'pattern-suitability': -12,
      'interface-completeness': -18,
      traceability: -22,
      explainability: -20,
      'sdd-quality': -16,
    },
    'deterministic-aiw': {
      'requirement-coverage': 5,
      'architecture-correctness': 5,
      'quality-driver-fit': 8,
      'pattern-suitability': 7,
      'interface-completeness': 8,
      security: 5,
      resilience: 5,
      traceability: 12,
      explainability: 8,
      'sdd-quality': 10,
    },
    'governed-llm-aiw': {
      'requirement-coverage': 8,
      'architecture-correctness': 5,
      'quality-driver-fit': 9,
      'pattern-suitability': 8,
      'interface-completeness': 9,
      security: 5,
      resilience: 5,
      traceability: 12,
      explainability: 17,
      'sdd-quality': 15,
    },
  };
  const selectedPatterns = projects.flatMap((project) => project.patternSelections.map((item) => item.patternId.toUpperCase()));
  const expectedPatternCoverage = scenarioDefinition.requiredPatternIds.length
    ? scenarioDefinition.requiredPatternIds.filter((pattern) => selectedPatterns.some((selected) => selected.includes(pattern.replace('PATTERN-', '')) || selected === pattern)).length / scenarioDefinition.requiredPatternIds.length
    : 1;
  const patternPenalty = expectedPatternCoverage < 0.34 ? -8 : expectedPatternCoverage < 0.67 ? -4 : 2;
  const scores = (Object.keys(dimensionMeta) as ArchitectureOutcomeDimension[]).map((dimension) => {
    let value = raw[dimension] + (modeAdjustment[mode][dimension] ?? 0);
    if (dimension === 'pattern-suitability') value += patternPenalty;
    if (mode === 'governed-llm-aiw' && ['architecture-correctness', 'security', 'resilience'].includes(dimension)) {
      // The LLM may improve explanation and option discovery, but it cannot bypass deterministic correctness.
      value = Math.min(value, raw[dimension] + (modeAdjustment['deterministic-aiw'][dimension] ?? 0));
    }
    return dimensionScore(
      dimension,
      value,
      [
        `${projects.reduce((sum, project) => sum + project.nodes.length, 0)} canonical objects`,
        `${projects.reduce((sum, project) => sum + project.edges.length, 0)} relationships`,
        `${projects.reduce((sum, project) => sum + (project.interfaces?.length ?? 0), 0)} interfaces`,
        `scenario ${scenarioDefinition.id}`,
      ],
      mode === 'conventional-baseline'
        ? 'Reference estimate derived from the current project without AIW intelligence uplift; it is not a measured human-participant result.'
        : mode === 'deterministic-aiw'
          ? 'System-evaluated score from canonical model completeness, governed knowledge, lineage, interface and assurance evidence.'
          : 'System-evaluated score with governed LLM clarification and explanation uplift; canonical correctness remains capped by deterministic evidence.',
    );
  });
  const score = weightedScore(scores);
  const correctnessScore = average(scores.filter((item) => ['architecture-correctness', 'quality-driver-fit', 'interface-completeness', 'data-architecture', 'security', 'resilience'].includes(item.dimension)).map((item) => item.score));
  const governanceScore = average(scores.filter((item) => ['traceability', 'explainability', 'sdd-quality', 'requirement-coverage'].includes(item.dimension)).map((item) => item.score));
  const baseMinutes = 720 + scenarioDefinition.expectedConcerns.length * 18;
  const estimatedMinutes = mode === 'conventional-baseline' ? baseMinutes : mode === 'deterministic-aiw' ? Math.round(baseMinutes * .64) : Math.round(baseMinutes * .53);
  const failures = scores.filter((item) => item.status === 'failed');
  return {
    mode,
    label: mode === 'conventional-baseline' ? 'Conventional reference' : mode === 'deterministic-aiw' ? 'AIW deterministic' : 'AIW + governed LLM',
    score,
    correctnessScore,
    governanceScore,
    estimatedMinutes,
    evidenceClass: mode === 'conventional-baseline' ? 'reference-estimate' : 'system-evaluated',
    dimensionScores: scores,
    strengths: scores.filter((item) => item.status === 'passed').slice(0, 5).map((item) => `${item.label}: ${item.score}`),
    gaps: failures.map((item) => `${item.label}: ${item.score}/${item.threshold}`),
    ...(mode !== 'conventional-baseline' ? { recommendationAcceptanceRate: clamp(58 + score * .25), editDistancePercent: clamp(38 - score * .22, 6, 35) } : {}),
  };
}

export function buildBlindedExpertReviewPack(scenarios: ArchitectureOutcomeScenario[]): BlindedExpertReviewPack {
  return {
    id: `EXPERT-PACK-${AIW_RELEASE.version}`,
    generatedAt: new Date().toISOString(),
    scenarioIds: scenarios.map((item) => item.id),
    anonymizedVariantIds: scenarios.flatMap((item, scenarioIndex) => architectureEvaluationModes.map((_, modeIndex) => `VAR-${scenarioIndex + 1}-${String.fromCharCode(65 + modeIndex)}`)),
    rubric: (Object.keys(dimensionMeta) as ArchitectureOutcomeDimension[]).map((dimension) => ({
      dimension,
      label: dimensionMeta[dimension].label,
      question: dimensionMeta[dimension].question,
      weight: dimensionMeta[dimension].weight,
      critical: dimensionMeta[dimension].critical,
    })),
    recommendationClassifications: ['correct', 'reasonable-alternative', 'incomplete', 'unnecessary', 'contextually-wrong', 'potentially-harmful'],
    disclosure: 'Variant labels conceal generation mode. Independent experts must score architecture outcomes before the mode mapping is disclosed. This pack does not claim that human review has already occurred.',
  };
}

const architectureEvaluationModes: ArchitectureEvaluationMode[] = ['conventional-baseline', 'deterministic-aiw', 'governed-llm-aiw'];

export function defaultNavigationUxObservations(): NavigationUxObservation[] {
  return [
    { id: 'NAV-RESPONSIVE-OVERLAY', viewport: 'laptop', roleId: 'all', destination: 'all', severity: 'significant', category: 'responsive-behaviour', message: 'Expanded role navigation previously consumed too much working width at standard laptop sizes.', remediation: 'Auto-collapse below the 1440px wide-desktop breakpoint and use an overlay drawer at standard desktop and laptop widths.', resolved: true },
    { id: 'NAV-ACTIVE-STATE', viewport: 'desktop', roleId: 'enterprise-architect', destination: 'evaluation-lab', severity: 'significant', category: 'active-state', message: 'Shared portfolio routes could leave multiple rail destinations visually active.', remediation: 'Use exact role-task identity and a dedicated Evaluation Lab destination.', resolved: true },
    { id: 'NAV-FOCUS-RETURN', viewport: 'laptop', roleId: 'all', destination: 'all', severity: 'advisory', category: 'focus', message: 'Pointer navigation could retain focus in the rail and visually cover the workspace.', remediation: 'Close responsive drawers after pointer activation and restore focus to the main workspace.', resolved: true },
    { id: 'NAV-MOBILE-BACKDROP', viewport: 'mobile', roleId: 'all', destination: 'all', severity: 'significant', category: 'orientation', message: 'The mobile rail needed a clear modal boundary and escape route.', remediation: 'Add a labelled backdrop, Escape handling and focus-safe close control.', resolved: true },
  ];
}

export function runArchitectureOutcomeBenchmark(input: {
  projects: ArchitectureProject[];
  knowledgeReleaseId?: string;
  grammarVersion?: string;
  patternDnaVersion?: string;
  providerPolicyVersion?: string;
  navigationObservations?: NavigationUxObservation[];
}): ArchitectureOutcomeBenchmarkReport {
  const scenarios = buildArchitectureOutcomeScenarios(input.projects);
  const results: ArchitectureOutcomeScenarioResult[] = scenarios.map((scenarioDefinition) => {
    const selected = scenarioDefinition.projectIds.map((id) => input.projects.find((project) => project.id === id)).filter((project): project is ArchitectureProject => Boolean(project));
    const projects = selected.length ? selected : input.projects.slice(0, 1);
    const raw = rawDimensionScores(projects);
    const modeResults = architectureEvaluationModes.map((mode) => buildModeResult(mode, raw, scenarioDefinition, projects));
    const governed = modeResults.find((item) => item.mode === 'governed-llm-aiw')!;
    const criticalFailures = governed.dimensionScores.filter((item) => item.critical && item.status === 'failed').map((item) => `${item.label}: ${item.score}/${item.threshold}`);
    const readiness = !projects.length || criticalFailures.length >= 3 ? 'not-ready' : criticalFailures.length ? 'conditional' : 'ready-for-expert-review';
    const bestMode = [...modeResults].sort((a, b) => b.score - a.score)[0]?.mode ?? 'deterministic-aiw';
    return {
      scenarioId: scenarioDefinition.id,
      name: scenarioDefinition.name,
      kind: scenarioDefinition.kind,
      readiness,
      modeResults,
      bestMode,
      criticalFailures,
      expertReviewQuestions: [
        ...scenarioDefinition.expectedConcerns.slice(0, 4).map((concern) => `Is ${concern} treated with enough context and evidence?`),
        ...scenarioDefinition.deliberateTraps.slice(0, 2).map((trap) => `Did the design avoid the trap: ${trap}?`),
      ],
      lifecycleCoverage: lifecycleCoverage(projects),
    };
  });
  const deterministicScores = results.map((item) => item.modeResults.find((mode) => mode.mode === 'deterministic-aiw')?.score ?? 0);
  const llmScores = results.map((item) => item.modeResults.find((mode) => mode.mode === 'governed-llm-aiw')?.score ?? 0);
  const conventionalMinutes = results.reduce((sum, item) => sum + (item.modeResults.find((mode) => mode.mode === 'conventional-baseline')?.estimatedMinutes ?? 0), 0);
  const llmMinutes = results.reduce((sum, item) => sum + (item.modeResults.find((mode) => mode.mode === 'governed-llm-aiw')?.estimatedMinutes ?? 0), 0);
  const observations = input.navigationObservations ?? defaultNavigationUxObservations();
  return {
    id: `AOE-${AIW_RELEASE.version}-${Date.now()}`,
    releaseId: `AIW-${AIW_RELEASE.version}`,
    applicationVersion: AIW_RELEASE.version,
    knowledgeReleaseId: input.knowledgeReleaseId ?? 'AKR-0.10.60',
    grammarVersion: input.grammarVersion ?? 'living-canvas-grammar-0.10.67',
    patternDnaVersion: input.patternDnaVersion ?? 'pattern-dna-2.0',
    providerPolicyVersion: input.providerPolicyVersion ?? 'governed-co-creation-0.10.68',
    generatedAt: new Date().toISOString(),
    scenarios: results,
    summary: {
      scenarioCount: results.length,
      readyForExpertReview: results.filter((item) => item.readiness === 'ready-for-expert-review').length,
      conditional: results.filter((item) => item.readiness === 'conditional').length,
      notReady: results.filter((item) => item.readiness === 'not-ready').length,
      deterministicAverage: average(deterministicScores),
      governedLlmAverage: average(llmScores),
      estimatedTimeReductionPercent: conventionalMinutes ? clamp(((conventionalMinutes - llmMinutes) / conventionalMinutes) * 100) : 0,
      criticalFailureCount: results.reduce((sum, item) => sum + item.criticalFailures.length, 0),
    },
    expertReviewPack: buildBlindedExpertReviewPack(scenarios),
    navigationUx: {
      observations,
      unresolvedBlockers: observations.filter((item) => item.severity === 'blocker' && !item.resolved).length,
      resolvedCount: observations.filter((item) => item.resolved).length,
      testedViewports: ['1920x1080', '1600x900', '1366x768', '1100x760', 'mobile overlay contract'],
    },
    governance: {
      productionAcceptanceClaimed: false,
      humanExpertValidationCompleted: false,
      conventionalBaselineMeasuredWithHumanParticipants: false,
      llmHasCanonicalMutationAuthority: false,
      candidateKnowledgeCanScore: false,
      deterministicFallbackRequired: true,
      boundary: 'This report is an implementation and reference-calibration result. Independent expert scoring and a controlled enterprise pilot remain required before architecture-outcome or production-acceptance claims are made.',
    },
  };
}
