import { useMemo } from 'react';
import { deriveBrainSignals, prioritizeBrainSignals, selectSignalsForSurface, type BrainSignal, type BrainSignalSurface } from '@aiw/brain-runtime';
import { adaptWorkspaceToBrainContext } from './adaptWorkspaceToBrainContext';
import { adaptKernelIntelligenceToSignals, mergeKernelAndPresentationSignals } from './adaptKernelIntelligenceToSignals';

export function useBrainAliveSignals(workspace: any) {
  const context = useMemo(() => adaptWorkspaceToBrainContext(workspace), [workspace]);
  const presentationSignals = useMemo(() => deriveBrainSignals(context), [context]);
  const kernelSignals = useMemo(() => adaptKernelIntelligenceToSignals(workspace?.intelligence), [workspace?.intelligence]);
  const signals = useMemo(
    () => prioritizeBrainSignals(mergeKernelAndPresentationSignals(kernelSignals, presentationSignals), context),
    [kernelSignals, presentationSignals, context],
  );

  const forSurface = (surface: BrainSignalSurface, limit?: number): BrainSignal[] =>
    selectSignalsForSurface(signals, context, surface, limit);

  return {
    context,
    signals,
    kernelSignals,
    presentationSignals,
    canvasSignals: forSurface('canvas-badge'),
    librarySignals: forSurface('library-chip'),
    stageSignals: forSurface('stage-health-chip'),
    bottomSignals: forSurface('bottom-brain-signal'),
    infoSignals: forSurface('info-center'),
    radarSignals: forSurface('decision-radar'),
    coArchitectSignals: forSurface('co-architect'),
    forSurface,
  };
}
