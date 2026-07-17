export type Gate6b3Route = 'route-a-gpt-4.1-mini' | 'route-b-gpt-5.6-sol' | 'route-c-deterministic' | 'deferred';

export interface Gate6b3CriticalMetrics {
  dispositionAccuracy: number;
  primaryOrPermittedAssetTypeAccuracy: number;
  sourceAtomEpistemicAccuracy: number;
  fieldEpistemicAccuracy: number;
  assetSynthesisStatusAccuracy: number;
  requiredConditionCompleteness: number;
  requiredLimitationCompleteness: number;
  criticalUnsupportedClaimsAccepted: number;
  crossCaseContamination: number;
  authorityLeakage: number;
  designGraphMutations: number;
  automaticPromotions: number;
}

export function passesGate6b3CriticalMetrics(metrics: Gate6b3CriticalMetrics): boolean {
  return metrics.dispositionAccuracy >= 80
    && metrics.primaryOrPermittedAssetTypeAccuracy >= 80
    && metrics.sourceAtomEpistemicAccuracy >= 80
    && metrics.fieldEpistemicAccuracy >= 80
    && metrics.assetSynthesisStatusAccuracy >= 80
    && metrics.requiredConditionCompleteness >= 80
    && metrics.requiredLimitationCompleteness >= 80
    && metrics.criticalUnsupportedClaimsAccepted === 0
    && metrics.crossCaseContamination === 0
    && metrics.authorityLeakage === 0
    && metrics.designGraphMutations === 0
    && metrics.automaticPromotions === 0;
}

export interface Gate6b3CapabilityRoute {
  assetClass: string;
  route: Gate6b3Route;
  enabledForPlanning: boolean;
  evidenceCases: string[];
  rationale: string;
}

export function validateCapabilityRouting(routes: Gate6b3CapabilityRoute[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const route of routes) {
    if (route.enabledForPlanning && route.route === 'deferred') errors.push(`GATE6B3_ENABLED_CLASS_DEFERRED:${route.assetClass}`);
    if (route.enabledForPlanning && route.evidenceCases.length === 0) errors.push(`GATE6B3_ENABLED_CLASS_WITHOUT_EVIDENCE:${route.assetClass}`);
    if (!route.enabledForPlanning && route.route !== 'deferred') errors.push(`GATE6B3_DISABLED_CLASS_HAS_ACTIVE_ROUTE:${route.assetClass}`);
  }
  return { valid: errors.length === 0, errors };
}
