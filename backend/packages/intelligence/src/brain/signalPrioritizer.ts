import type { BrainSignal, BrainSignalSurface, SignalBudget, SignalContext } from './types.js';
import { DEFAULT_SIGNAL_BUDGET } from './types.js';

const severityWeight: Record<BrainSignal['severity'], number> = {
  blocker: 100,
  warning: 80,
  handoff: 75,
  review: 65,
  recommendation: 55,
  evidence: 35,
  hint: 25,
  silent: 5,
};

export function scoreSignal(signal: BrainSignal, context: SignalContext): number {
  let score = severityWeight[signal.severity] ?? 0;

  if (signal.stage === context.stage) score += 30;
  if (signal.objectId && signal.objectId === context.selectedObjectId) score += 25;
  if (!signal.dismissed) score += 10;
  if (context.dismissedSignalIds?.includes(signal.id)) score -= 100;
  score += Math.round(signal.confidence * 15);

  if (context.userMode === 'quiet' && signal.severity === 'hint') score -= 10;
  if (context.userMode === 'detailed') score += 5;

  return score;
}

export function prioritizeSignals(signals: BrainSignal[], context: SignalContext): BrainSignal[] {
  return [...signals]
    .filter((signal) => !context.dismissedSignalIds?.includes(signal.id))
    .sort((a, b) => scoreSignal(b, context) - scoreSignal(a, context));
}

export function signalsForSurface(
  signals: BrainSignal[],
  surface: BrainSignalSurface,
  context: SignalContext,
  budget: SignalBudget = DEFAULT_SIGNAL_BUDGET,
): BrainSignal[] {
  const candidates = prioritizeSignals(signals, context).filter((signal) => {
    const surfaces = [signal.surfacePolicy.primary, ...(signal.surfacePolicy.secondary ?? [])];
    return surfaces.includes(surface);
  });

  const limit = surfaceLimit(surface, budget);
  return candidates.slice(0, limit);
}

function surfaceLimit(surface: BrainSignalSurface, budget: SignalBudget): number {
  switch (surface) {
    case 'canvas-badge': return budget.canvasBadges;
    case 'library-chip': return budget.libraryChipsPerItem;
    case 'stage-health-chip': return budget.stageHealthChips;
    case 'bottom-dock': return budget.bottomDock;
    case 'info-center': return budget.infoCenter;
    case 'decision-radar': return budget.decisionRadar;
    case 'co-architect': return 10;
    case 'stage-gate': return 10;
    case 'drop-preflight': return 10;
    case 'admin-only': return 20;
    case 'silent-ranking': return 100;
    default: return 5;
  }
}
