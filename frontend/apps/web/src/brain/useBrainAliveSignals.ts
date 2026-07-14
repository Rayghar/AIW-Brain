import { useMemo } from 'react';
import { prioritizeBrainSignals, selectSignalsForSurface, type BrainSignal, type BrainSignalSurface } from '@aiw/brain-runtime';
import { adaptWorkspaceToBrainContext } from './adaptWorkspaceToBrainContext';
import { adaptKernelIntelligenceToSignals } from './adaptKernelIntelligenceToSignals';

/**
 * Presentation-only projection of the server-authoritative Architecture Brain response.
 *
 * This hook deliberately does not derive architecture recommendations, obligations,
 * critiques or readiness rules in the browser. The backend Brain Orchestrator and
 * deterministic kernel own that work. The browser maps the returned canonical
 * IntelligenceResponse into surfaces and applies only a visual noise budget.
 */
export function useBrainAliveSignals(workspace: any) {
  const context = useMemo(() => adaptWorkspaceToBrainContext(workspace), [workspace]);
  const kernelSignals = useMemo(
    () => adaptKernelIntelligenceToSignals(workspace?.intelligence),
    [workspace?.intelligence],
  );
  const signals = useMemo(
    () => prioritizeBrainSignals(kernelSignals, context),
    [kernelSignals, context],
  );

  const forSurface = (surface: BrainSignalSurface, limit?: number): BrainSignal[] =>
    selectSignalsForSurface(signals, context, surface, limit);

  return {
    context,
    signals,
    kernelSignals,
    // Retained as a read-only compatibility field for existing surfaces. Local
    // architecture signal generation was removed in rc.10.71.1.
    presentationSignals: [] as BrainSignal[],
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
