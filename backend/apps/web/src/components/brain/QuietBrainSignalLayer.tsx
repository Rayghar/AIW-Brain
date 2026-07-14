import { useEffect, useMemo, useRef, useState } from 'react';
import type { BrainSignal } from '@aiw/brain-runtime';
import { useBrainAliveSignals } from '../../brain/useBrainAliveSignals';
import { StageHealthChips } from './StageHealthChips';
import { BottomBrainSignal } from './BottomBrainSignal';
import { BrainInfoCenter } from './BrainInfoCenter';
import { BrainSignalIcon } from './BrainSignalIcon';

/**
 * Render this once inside the design workspace shell.
 * It intentionally keeps the brain quiet: small chips and badges by default, full detail only behind Info Center.
 */
export function QuietBrainSignalLayer({
  workspace,
  renderStageChips = true,
  renderBottomSignal = true,
  onSelectedSignal,
}: {
  workspace: any;
  renderStageChips?: boolean;
  renderBottomSignal?: boolean;
  onSelectedSignal?: (signal: BrainSignal) => void;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [pulseSignal, setPulseSignal] = useState<BrainSignal | null>(null);
  const lastSignatureRef = useRef<string>('');
  const brain = useBrainAliveSignals(workspace);
  const topVisibleSignal = brain.stageSignals[0] ?? brain.bottomSignals[0] ?? brain.infoSignals[0];

  const signature = useMemo(() => {
    const stage = brain.context.activeStage;
    const signalIds = brain.signals.slice(0, 5).map((signal) => signal.id).join('|');
    return `${stage}:${signalIds}`;
  }, [brain.context.activeStage, brain.signals]);

  useEffect(() => {
    if (!topVisibleSignal || !signature) return;
    if (!lastSignatureRef.current) {
      lastSignatureRef.current = signature;
      return;
    }
    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;
    setPulseSignal(topVisibleSignal);
    const timer = window.setTimeout(() => setPulseSignal(null), 4200);
    return () => window.clearTimeout(timer);
  }, [signature, topVisibleSignal]);

  const openInfo = (signal?: BrainSignal) => {
    if (signal) onSelectedSignal?.(signal);
    setInfoOpen(true);
  };

  return (
    <>
      {pulseSignal ? (
        <button
          type="button"
          className={`aiw-causal-pulse aiw-causal-pulse--${pulseSignal.severity}`}
          onClick={() => openInfo(pulseSignal)}
          title={pulseSignal.detail ?? pulseSignal.shortMessage}
          aria-label={`AIW recalculated: ${pulseSignal.shortMessage}`}
        >
          <BrainSignalIcon signal={pulseSignal} />
          <span>AIW recalculated</span>
          <small>{pulseSignal.shortMessage}</small>
        </button>
      ) : null}
      {renderStageChips && <StageHealthChips signals={brain.stageSignals} onOpenInfo={() => openInfo()} />}
      {renderBottomSignal && <BottomBrainSignal signals={brain.bottomSignals} onOpenInfo={() => openInfo()} />}
      <BrainInfoCenter open={infoOpen} signals={brain.infoSignals} onClose={() => setInfoOpen(false)} />
    </>
  );
}
