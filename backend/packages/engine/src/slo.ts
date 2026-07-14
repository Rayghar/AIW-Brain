import type { AlertPolicy, ServiceLevelObjective, SloEvaluation } from '@aiw/domain';
export function evaluateSlo(slo: ServiceLevelObjective, observedValue: number): SloEvaluation {
  const higherIsBetter = slo.indicator === 'availability' || slo.indicator === 'throughput' || slo.indicator === 'freshness';
  const healthy = higherIsBetter ? observedValue >= slo.warningThreshold : observedValue <= slo.warningThreshold;
  const critical = higherIsBetter ? observedValue < slo.criticalThreshold : observedValue > slo.criticalThreshold;
  const status = critical ? 'critical' : healthy ? 'healthy' : 'warning';
  const errorBudgetRemainingPercent = higherIsBetter ? Math.max(0, Math.min(100, ((observedValue - (100 - slo.target)) / Math.max(0.0001, 100 - slo.target)) * 100)) : Math.max(0, Math.min(100, (1 - observedValue / Math.max(0.0001, slo.target)) * 100));
  return { sloId: slo.id, observedValue, status, errorBudgetRemainingPercent, evaluatedAt: new Date().toISOString() };
}
export function triggeredAlertPolicies(evaluation: SloEvaluation, policies: AlertPolicy[]): AlertPolicy[] { return policies.filter((p) => p.enabled && p.sloId === evaluation.sloId && ((p.severity === 'critical' && evaluation.status === 'critical') || (p.severity === 'warning' && evaluation.status !== 'healthy'))); }
