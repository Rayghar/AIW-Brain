import type { BrainSignal } from '@aiw/brain-runtime';
import { BrainSignalIcon } from './BrainSignalIcon';

export function StageHealthChips({ signals, onOpenInfo }: { signals: BrainSignal[]; onOpenInfo?: () => void }) {
  if (!signals.length) return null;

  return (
    <div className="aiw-stage-health-chips" aria-label="AIW stage health signals">
      {signals.slice(0, 4).map((signal) => (
        <button key={signal.id} className={`aiw-stage-health-chip aiw-stage-health-chip--${signal.severity}`} onClick={onOpenInfo} title={signal.detail ?? signal.shortMessage}>
          <BrainSignalIcon signal={signal} />
          <span>{signal.title}</span>
        </button>
      ))}
    </div>
  );
}
