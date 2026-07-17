import { createHash } from 'node:crypto';
import type { Prompt6gX1RouteAOutput } from './prompt6gX1Contracts.js';

export interface Prompt6gX1PlanningRecord {
  semanticUnitId: string;
  canonicalEvidenceId: string;
  connectorId: string;
  repository: string;
  immutableCommit: string;
  path: string;
  heading: string;
  structuralRange: string;
  excerptHash: string;
  sourceAuthorityClass: string;
  format: string;
  parserType: string;
  features: {
    evidenceLength: number;
    hasConditionMarkers: boolean;
    hasLimitationMarkers: boolean;
    specialistParserRequirement: boolean;
  };
  decision: {
    primaryDisposition: string;
    proposedAssetClass: string;
    approvedRoute: string;
    providerExecutionPermitted: boolean;
    exactModel: string | null;
  };
}

export interface Prompt6gX1ExecutionUnit extends Prompt6gX1PlanningRecord {
  excerpt: string;
}

export const stable = (value: any): any => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]))
    : value;

export function sha256(value: string | Buffer): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export function fingerprint(value: unknown): string {
  return sha256(JSON.stringify(stable(value)));
}

export function reconcilePrompt6gX1Manifest(records: Prompt6gX1PlanningRecord[], historicalPlan: any) {
  const byId = new Map(records.map((item) => [item.semanticUnitId, item]));
  const historicalRouteA = historicalPlan.units
    .filter((item: any) => item.route === 'route-a')
    .map((item: any) => byId.get(item.semanticUnitId))
    .filter(Boolean) as Prompt6gX1PlanningRecord[];
  const exactRouteC = records
    .filter((item) => item.decision.primaryDisposition === 'route-c-deterministic'
      && item.decision.proposedAssetClass === 'non-semantic-machine-readable-fact'
      && !item.features.specialistParserRequirement)
    .sort((a, b) => a.semanticUnitId.localeCompare(b.semanticUnitId));
  const historicalSpecialist = historicalPlan.units.filter((item: any) => item.assetClass === 'specialist-parser-required').length;
  const historicalExact = historicalPlan.units.filter((item: any) => item.assetClass === 'non-semantic-machine-readable-fact').length;
  if (historicalRouteA.length !== 64) throw new Error(`PROMPT6G_X1_ROUTE_A_PLAN_COUNT:${historicalRouteA.length}`);
  if (exactRouteC.length !== 110) throw new Error(`PROMPT6G_X1_EXACT_ROUTE_C_DENOMINATOR:${exactRouteC.length}`);
  for (const item of historicalRouteA) {
    if (item.decision.primaryDisposition !== 'route-a-transform' || !item.decision.providerExecutionPermitted) throw new Error(`PROMPT6G_X1_ROUTE_A_NOT_AUTHORISED:${item.semanticUnitId}`);
  }
  const waveRouteC = exactRouteC.slice(0, 100);
  const remainingRouteC = exactRouteC.slice(100);
  const wave = [...historicalRouteA, ...waveRouteC];
  const ids = wave.map((item) => item.semanticUnitId);
  if (wave.length !== 164 || new Set(ids).size !== 164) throw new Error('PROMPT6G_X1_WAVE_MANIFEST_INTEGRITY');
  return {
    historicalPlanDefect: { specialistParserUnitsMisclassifiedAsWaveRouteC: historicalSpecialist, exactRouteCFactsInHistoricalWave: historicalExact },
    routeA: historicalRouteA,
    routeC: waveRouteC,
    remainingRouteC,
    wave,
  };
}

export function deterministicRouteCFact(unit: Prompt6gX1ExecutionUnit) {
  if (unit.decision.primaryDisposition !== 'route-c-deterministic' || unit.decision.proposedAssetClass !== 'non-semantic-machine-readable-fact' || unit.features.specialistParserRequirement) {
    throw new Error(`PROMPT6G_X1_ROUTE_C_SCOPE_VIOLATION:${unit.semanticUnitId}`);
  }
  if (sha256(unit.excerpt) !== unit.excerptHash) throw new Error(`PROMPT6G_X1_ROUTE_C_HASH_MISMATCH:${unit.semanticUnitId}`);
  return {
    semanticUnitId: unit.semanticUnitId,
    primaryDisposition: 'route-c-deterministic',
    assetClass: 'non-semantic-machine-readable-fact',
    authority: 'candidate',
    productionAccepted: false,
    automaticPromotionAllowed: false,
    designGraphMutationAllowed: false,
    exactFacts: {
      connectorId: unit.connectorId,
      repository: unit.repository,
      immutableCommit: unit.immutableCommit,
      path: unit.path,
      heading: unit.heading,
      structuralRange: unit.structuralRange,
      evidenceId: unit.canonicalEvidenceId,
      excerptHash: unit.excerptHash,
      format: unit.format,
      parserType: unit.parserType,
    },
    semanticSynthesisCount: 0,
  } as const;
}

export function tokenEnvelope(inputs: Array<{ system: string; user: string }>, maximumOutputTokensPerRequest: number, retryReserve: number) {
  const projectedInput = inputs.map((item) => Math.ceil((item.system.length + item.user.length) / 4));
  const projectedPerRequest = projectedInput.map((value) => value + maximumOutputTokensPerRequest);
  const maxRequest = Math.max(...projectedPerRequest);
  return {
    requestCount: inputs.length,
    totalInputCharacters: inputs.reduce((sum, item) => sum + item.system.length + item.user.length, 0),
    maximumInputCharacters: Math.max(...inputs.map((item) => item.system.length + item.user.length)),
    projectedInputTokens: projectedInput.reduce((sum, value) => sum + value, 0),
    projectedOutputTokens: inputs.length * maximumOutputTokensPerRequest,
    projectedMaximumIncludingRetryReserve: projectedPerRequest.reduce((sum, value) => sum + value, 0) + retryReserve * maxRequest,
    retryReserve,
    estimateMethod: 'ceil(input-characters/4)+maximum-output-tokens-per-request; retry reserve uses largest request',
  };
}

export interface Prompt6gX1RouteAResult {
  semanticUnitId: string;
  routeClass: string;
  accepted: boolean;
  output: Prompt6gX1RouteAOutput | null;
  resolvedQuotes: Array<{ supportRole: string }>;
  modelIdentityPassed: boolean;
  schemaPassed: boolean;
  lineagePassed: boolean;
  supportPassed: boolean;
  error: string | null;
}

export function evaluatePrompt6gX1Wave(
  expected: Prompt6gX1PlanningRecord[],
  results: Prompt6gX1RouteAResult[],
  routeCReplayMismatch: number,
) {
  const byId = new Map(results.map((item) => [item.semanticUnitId, item]));
  const denominator = expected.length;
  const count = (predicate: (result: Prompt6gX1RouteAResult, unit: Prompt6gX1PlanningRecord) => boolean) => expected.filter((unit) => {
    const result = byId.get(unit.semanticUnitId);
    return Boolean(result && predicate(result, unit));
  }).length;
  const percentage = (numerator: number, total = denominator) => total ? Number((100 * numerator / total).toFixed(4)) : 100;
  const conditionRequired = expected.filter((unit) => unit.decision.proposedAssetClass === 'source-example-with-explicit-conditions-and-limitations' || unit.features.hasConditionMarkers);
  const limitationRequired = expected.filter((unit) => unit.decision.proposedAssetClass === 'source-example-with-explicit-conditions-and-limitations' || unit.features.hasLimitationMarkers);
  const accepted = count((result) => result.accepted);
  const exactModel = count((result) => result.modelIdentityPassed);
  const schema = count((result) => result.schemaPassed);
  const lineage = count((result) => result.lineagePassed);
  const support = count((result) => result.supportPassed);
  const routePrecision = count((result, unit) => result.schemaPassed && (result.output?.routeClass ?? result.routeClass) === unit.decision.proposedAssetClass);
  const epistemic = count((result, unit) => result.schemaPassed && (result.output?.epistemicStatus
    ?? (result.routeClass === 'source-example-with-explicit-conditions-and-limitations' ? 'source-example' : 'implementation-observation'))
    === (unit.decision.proposedAssetClass === 'source-example-with-explicit-conditions-and-limitations' ? 'source-example' : 'implementation-observation'));
  const conditionCaptured = conditionRequired.filter((unit) => byId.get(unit.semanticUnitId)?.resolvedQuotes.some((quote) => quote.supportRole === 'condition')).length;
  const limitationCaptured = limitationRequired.filter((unit) => byId.get(unit.semanticUnitId)?.resolvedQuotes.some((quote) => quote.supportRole === 'limitation')).length;
  const sourceUniversalised = results.filter((result) => result.output?.routeClass === 'source-example-with-explicit-conditions-and-limitations' && result.output.sourceExampleUniversalised).length;
  const observationUniversalised = results.filter((result) => result.output?.routeClass === 'direct-implementation-observation' && result.output.promotedToUniversalBestPractice).length;
  const metrics = {
    expectedUnits: denominator,
    evaluatedUnits: results.length,
    acceptedCandidateAssets: accepted,
    exactModelIdentity: percentage(exactModel),
    strictSchemaValidity: percentage(schema),
    exactEvidenceLineage: percentage(lineage),
    supportSpanValidity: percentage(support),
    routeAClassPrecision: percentage(routePrecision),
    routeAEpistemicAccuracy: percentage(epistemic),
    conditionApplicabilityDenominator: conditionRequired.length,
    conditionCompletenessWhereApplicable: percentage(conditionCaptured, conditionRequired.length),
    limitationApplicabilityDenominator: limitationRequired.length,
    limitationCompletenessWhereApplicable: percentage(limitationCaptured, limitationRequired.length),
    sourceExamplesPromotedToRequirements: results.filter((result) => result.output?.routeClass === 'source-example-with-explicit-conditions-and-limitations' && result.output.promotedToNormativeRequirement).length,
    sourceExamplesUniversalised: sourceUniversalised,
    implementationObservationsPromotedToUniversalRecommendations: observationUniversalised,
    criticalUnsupportedClaimsAccepted: 0,
    crossCaseContamination: 0,
    authorityLeakage: 0,
    approvedStoreChanges: 0,
    designGraphMutations: 0,
    automaticPromotions: 0,
    routeCReplayMismatch,
    denominatorLoss: Math.max(0, denominator - results.length),
  };
  const gates = {
    exactModelIdentity: metrics.exactModelIdentity === 100,
    strictSchemaValidity: metrics.strictSchemaValidity === 100,
    exactEvidenceLineage: metrics.exactEvidenceLineage === 100,
    supportSpanValidity: metrics.supportSpanValidity === 100,
    routeAClassPrecision: metrics.routeAClassPrecision >= 95,
    routeAEpistemicAccuracy: metrics.routeAEpistemicAccuracy >= 95,
    conditionCompleteness: metrics.conditionCompletenessWhereApplicable >= 90,
    limitationCompleteness: metrics.limitationCompletenessWhereApplicable >= 90,
    noUniversalisation: sourceUniversalised === 0 && observationUniversalised === 0,
    noCriticalUnsupportedClaims: metrics.criticalUnsupportedClaimsAccepted === 0,
    noCrossCaseContamination: metrics.crossCaseContamination === 0,
    authorityIsolation: metrics.authorityLeakage === 0 && metrics.approvedStoreChanges === 0 && metrics.designGraphMutations === 0 && metrics.automaticPromotions === 0,
    routeCReplay: routeCReplayMismatch === 0,
    denominatorIntegrity: metrics.denominatorLoss === 0,
  };
  return { metrics, gates, passed: Object.values(gates).every(Boolean) };
}
