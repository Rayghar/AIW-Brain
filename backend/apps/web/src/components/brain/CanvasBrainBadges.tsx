import type { BrainSignal } from '@aiw/brain-runtime';
import { BrainSignalIcon } from './BrainSignalIcon';

export function CanvasBrainBadges({ signals, onOpenInfo }: { signals: BrainSignal[]; onOpenInfo?: (signal: BrainSignal) => void }) {
  if (!signals.length) return null;

  return (
    <div className="aiw-canvas-brain-badges" aria-label="AIW canvas signals">
      {signals.slice(0, 5).map((signal) => (
        <button key={signal.id} className={`aiw-canvas-brain-badge aiw-canvas-brain-badge--${signal.severity}`} onClick={() => onOpenInfo?.(signal)} title={signal.detail ?? signal.shortMessage}>
          <BrainSignalIcon signal={signal} />
        </button>
      ))}
    </div>
  );
}
