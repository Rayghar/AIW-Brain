export const PROMPT6G_ROUTE_A_MODEL = 'gpt-4.1-mini-2025-04-14' as const;

export const prompt6gPrimaryDispositions = [
  'route-a-transform', 'route-c-deterministic', 'insufficient-evidence',
  'specialist-parser-required', 'deferred-unproven-semantic-class',
  'explicit-processing-failure',
] as const;
export type Prompt6gPrimaryDisposition = typeof prompt6gPrimaryDispositions[number];

export const prompt6gAssetClasses = [
  'source-example-with-explicit-conditions-and-limitations',
  'direct-implementation-observation', 'non-semantic-machine-readable-fact',
  'contradiction-and-scoped-distinction', 'security-obligation',
  'performance-tactic', 'pattern-dna', 'architecture-genome',
  'modernisation-knowledge', 'low-authority-product-description',
  'complex-epistemic-synthesis', 'complex-condition-and-limitation-synthesis',
  'whole-reference-architecture-assembly', 'untested-semantic-asset-class',
  'insufficient-evidence', 'specialist-parser-required', 'processing-failure',
] as const;
export type Prompt6gAssetClass = typeof prompt6gAssetClasses[number];

export interface Prompt6gRoutingFeatures {
  semanticUnitId: string;
  evidenceId: string;
  sourceAuthorityClass: string;
  repository: string;
  path: string;
  format: string;
  parserType: string;
  heading: string;
  evidenceLength: number;
  tokenCount: number;
  hasNormativeLanguage: boolean;
  hasConditionMarkers: boolean;
  hasLimitationMarkers: boolean;
  hasSourceExampleIndicators: boolean;
  hasImplementationObservationIndicators: boolean;
  metadataOnly: boolean;
  machineReadableStructural: boolean;
  noEvidence: boolean;
  exactDuplicateOccurrenceCount: number;
  normalizedVariantCount: number;
  nearDuplicateCluster: boolean;
  crossFileGroupIds: string[];
  ambiguity: boolean;
  risk: 'low' | 'medium' | 'high';
  specialistParserRequirement: boolean;
  processingFailure?: string | null;
  semanticSignals: {
    contradiction: boolean;
    security: boolean;
    performance: boolean;
    causalPattern: boolean;
    architectureGenome: boolean;
    modernisation: boolean;
    productDescription: boolean;
    complexEpistemic: boolean;
  };
}

export interface Prompt6gRoutingDecision {
  semanticUnitId: string;
  primaryDisposition: Prompt6gPrimaryDisposition;
  proposedAssetClass: Prompt6gAssetClass;
  approvedRoute: 'route-a' | 'route-c' | 'deferred' | 'failure';
  routeConfidence: number;
  confidenceBand: 'high' | 'medium' | 'low';
  reasonCodes: string[];
  governingGate6b3EvidenceCases: string[];
  fallbackDisposition: 'deferred-unproven-semantic-class' | 'explicit-processing-failure';
  providerExecutionPermitted: boolean;
  exactModel: typeof PROMPT6G_ROUTE_A_MODEL | null;
  delegatedReviewRequired: boolean;
  productionAccepted: false;
}

const supportedAuthority = new Set([
  'official-reference-architecture',
  'architecture-conformance-implementation',
  'reviewed-practitioner-or-implementation-source',
]);

function confidence(value: number): Pick<Prompt6gRoutingDecision, 'routeConfidence' | 'confidenceBand'> {
  return { routeConfidence: value, confidenceBand: value >= 0.9 ? 'high' : value >= 0.75 ? 'medium' : 'low' };
}

function deferredClass(features: Prompt6gRoutingFeatures): Prompt6gAssetClass {
  const signal = features.semanticSignals;
  if (features.crossFileGroupIds.length > 0) return signal.architectureGenome ? 'architecture-genome' : 'whole-reference-architecture-assembly';
  if (signal.contradiction) return 'contradiction-and-scoped-distinction';
  if (signal.security) return 'security-obligation';
  if (signal.performance) return 'performance-tactic';
  if (signal.causalPattern) return 'pattern-dna';
  if (signal.architectureGenome) return 'architecture-genome';
  if (signal.modernisation) return 'modernisation-knowledge';
  if (signal.productDescription) return 'low-authority-product-description';
  if (signal.complexEpistemic) return 'complex-epistemic-synthesis';
  if (features.hasConditionMarkers || features.hasLimitationMarkers) return 'complex-condition-and-limitation-synthesis';
  return 'untested-semantic-asset-class';
}

function isComplex(features: Prompt6gRoutingFeatures): boolean {
  return features.crossFileGroupIds.length > 0 || Object.values(features.semanticSignals).some(Boolean) || features.ambiguity || features.risk === 'high';
}

export function routePrompt6gUnit(features: Prompt6gRoutingFeatures): Prompt6gRoutingDecision {
  const base = { semanticUnitId: features.semanticUnitId, fallbackDisposition: 'deferred-unproven-semantic-class' as const, productionAccepted: false as const };
  if (features.processingFailure) return { ...base, primaryDisposition: 'explicit-processing-failure', proposedAssetClass: 'processing-failure', approvedRoute: 'failure', ...confidence(1), reasonCodes: ['RC-PROCESSING-FAILURE'], governingGate6b3EvidenceCases: [], fallbackDisposition: 'explicit-processing-failure', providerExecutionPermitted: false, exactModel: null, delegatedReviewRequired: true };
  if (features.noEvidence || features.evidenceLength === 0) return { ...base, primaryDisposition: 'insufficient-evidence', proposedAssetClass: 'insufficient-evidence', approvedRoute: 'route-c', ...confidence(1), reasonCodes: ['RC-NO-EVIDENCE'], governingGate6b3EvidenceCases: ['G6B1-24'], providerExecutionPermitted: false, exactModel: null, delegatedReviewRequired: false };
  if (features.specialistParserRequirement) return { ...base, primaryDisposition: 'specialist-parser-required', proposedAssetClass: 'specialist-parser-required', approvedRoute: 'route-c', ...confidence(1), reasonCodes: ['RC-SPECIALIST-PARSER-REQUIRED'], governingGate6b3EvidenceCases: ['deterministic-gate-6a-and-6b-tests'], providerExecutionPermitted: false, exactModel: null, delegatedReviewRequired: true };
  if (features.machineReadableStructural && features.metadataOnly && !isComplex(features)) return { ...base, primaryDisposition: 'route-c-deterministic', proposedAssetClass: 'non-semantic-machine-readable-fact', approvedRoute: 'route-c', ...confidence(0.99), reasonCodes: ['RC-EXACT-MACHINE-FACT','RC-NO-SEMANTIC-INFERENCE'], governingGate6b3EvidenceCases: ['deterministic-gate-6a-and-6b-tests'], providerExecutionPermitted: false, exactModel: null, delegatedReviewRequired: false };

  const authorityEligible = supportedAuthority.has(features.sourceAuthorityClass);
  const routeACommon = authorityEligible && !features.metadataOnly && !features.specialistParserRequirement
    && features.crossFileGroupIds.length === 0 && !features.ambiguity && features.risk !== 'high';
  const routeAExample = routeACommon && features.hasSourceExampleIndicators && features.hasConditionMarkers
    && features.hasLimitationMarkers && !features.semanticSignals.contradiction && !features.semanticSignals.security
    && !features.semanticSignals.performance && !features.semanticSignals.causalPattern
    && !features.semanticSignals.architectureGenome && !features.semanticSignals.modernisation;
  if (routeAExample) return { ...base, primaryDisposition: 'route-a-transform', proposedAssetClass: 'source-example-with-explicit-conditions-and-limitations', approvedRoute: 'route-a', ...confidence(0.97), reasonCodes: ['RA-SOURCE-EXAMPLE','RA-EXPLICIT-CONDITION','RA-EXPLICIT-LIMITATION','RA-APPROVED-AUTHORITY-CLASS'], governingGate6b3EvidenceCases: ['G6B1-01'], providerExecutionPermitted: true, exactModel: PROMPT6G_ROUTE_A_MODEL, delegatedReviewRequired: true };

  const routeAObservation = routeACommon && features.hasImplementationObservationIndicators
    && !features.hasNormativeLanguage && !features.hasSourceExampleIndicators && !isComplex(features);
  if (routeAObservation) return { ...base, primaryDisposition: 'route-a-transform', proposedAssetClass: 'direct-implementation-observation', approvedRoute: 'route-a', ...confidence(0.96), reasonCodes: ['RA-DIRECT-IMPLEMENTATION-OBSERVATION','RA-NO-NORMATIVE-UNIVERSALISATION','RA-APPROVED-AUTHORITY-CLASS'], governingGate6b3EvidenceCases: ['G6B1-15'], providerExecutionPermitted: true, exactModel: PROMPT6G_ROUTE_A_MODEL, delegatedReviewRequired: true };

  const proposedAssetClass = deferredClass(features);
  return { ...base, primaryDisposition: 'deferred-unproven-semantic-class', proposedAssetClass, approvedRoute: 'deferred', ...confidence(features.ambiguity ? 0.65 : 0.9), reasonCodes: ['RD-UNPROVEN-SEMANTIC-CLASS', ...(authorityEligible ? [] : ['RD-AUTHORITY-CLASS-NOT-ROUTE-A-VALIDATED']), ...(features.crossFileGroupIds.length ? ['RD-CROSS-FILE-CONTEXT'] : []), ...(features.ambiguity ? ['RD-AMBIGUOUS'] : [])], governingGate6b3EvidenceCases: [], providerExecutionPermitted: false, exactModel: null, delegatedReviewRequired: true };
}

export function validatePrompt6gRoutingIntegrity(decisions: Prompt6gRoutingDecision[], expectedUnits: number) {
  const ids = decisions.map((item) => item.semanticUnitId);
  const duplicateAssignments = ids.length - new Set(ids).size;
  const providerOutsideEnabledClasses = decisions.filter((item) => item.providerExecutionPermitted && !['source-example-with-explicit-conditions-and-limitations','direct-implementation-observation'].includes(item.proposedAssetClass)).length;
  const gpt56Assignments = decisions.filter((item) => item.exactModel?.includes('gpt-5.6')).length;
  const deferredLeakageToRouteA = decisions.filter((item) => item.approvedRoute === 'route-a' && !item.providerExecutionPermitted).length;
  const semanticRouteC = decisions.filter((item) => item.approvedRoute === 'route-c' && !['non-semantic-machine-readable-fact','insufficient-evidence','specialist-parser-required'].includes(item.proposedAssetClass)).length;
  return { expectedUnits, classifiedUnits: decisions.length, silentOmissions: Math.max(0, expectedUnits - decisions.length), duplicateAssignments, providerOutsideEnabledClasses, gpt56Assignments, deferredLeakageToRouteA, semanticRouteC, passed: decisions.length === expectedUnits && duplicateAssignments === 0 && providerOutsideEnabledClasses === 0 && gpt56Assignments === 0 && deferredLeakageToRouteA === 0 && semanticRouteC === 0 };
}
