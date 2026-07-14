import type { BrainContext, BrainSignal, BrainSignalSurface, NoiseBudget } from './types';
import { DEFAULT_NOISE_BUDGET } from './noiseBudget';

const severityWeight: Record<BrainSignal['severity'], number> = {
  blocker: 100,
  warning: 80,
  recommendation: 65,
  review: 60,
  handoff: 55,
  hint: 40,
  evidence: 30,
  silent: 10,
};

export function scoreBrainSignal(signal: BrainSignal, context: BrainContext): number {
  let score = severityWeight[signal.severity] + signal.confidence * 20;
  if (signal.stage === context.activeStage) score += 20;
  if (signal.objectId && signal.objectId === context.selectedObjectId) score += 25;
  if (signal.styleId && signal.styleId === context.selectedStyleId) score += 10;
  if (signal.dismissed || context.dismissedSignalIds?.includes(signal.id)) score -= 1000;
  return score;
}

export function prioritizeBrainSignals(signals: BrainSignal[], context: BrainContext): BrainSignal[] {
  return [...signals]
    .filter((signal) => !signal.dismissed && !context.dismissedSignalIds?.includes(signal.id))
    .sort((a, b) => scoreBrainSignal(b, context) - scoreBrainSignal(a, context));
}

export function selectSignalsForSurface(
  signals: BrainSignal[],
  context: BrainContext,
  surface: BrainSignalSurface,
  limit?: number,
): BrainSignal[] {
  const surfaceLimit = limit ?? defaultLimitForSurface(surface);
  return prioritizeBrainSignals(
    signals.filter((signal) => signal.surfaces.includes(surface)),
    context,
  ).slice(0, surfaceLimit);
}

export function defaultLimitForSurface(surface: BrainSignalSurface, budget: NoiseBudget = DEFAULT_NOISE_BUDGET): number {
  switch (surface) {
    case 'canvas-badge':
      return budget.canvasBadges;
    case 'library-chip':
      return budget.libraryChipsPerItem;
    case 'stage-health-chip':
      return budget.stageHealthChips;
    case 'bottom-brain-signal':
      return budget.bottomBrainSignals;
    case 'info-center':
      return budget.infoCenterItems;
    default:
      return 8;
  }
}

export function groupSignalsByObject(signals: BrainSignal[]): Map<string, BrainSignal[]> {
  const grouped = new Map<string, BrainSignal[]>();
  for (const signal of signals) {
    if (!signal.objectId) continue;
    const current = grouped.get(signal.objectId) ?? [];
    current.push(signal);
    grouped.set(signal.objectId, current);
  }
  return grouped;
}

export function groupSignalsByPattern(signals: BrainSignal[]): Map<string, BrainSignal[]> {
  const grouped = new Map<string, BrainSignal[]>();
  for (const signal of signals) {
    if (!signal.patternId) continue;
    const current = grouped.get(signal.patternId) ?? [];
    current.push(signal);
    grouped.set(signal.patternId, current);
  }
  return grouped;
}
