import type { BrainSignal } from '@aiw/brain-runtime';
import { BrainSignalIcon } from './BrainSignalIcon';

export function BottomBrainSignal({ signals, onOpenInfo }: { signals: BrainSignal[]; onOpenInfo?: () => void }) {
  const signal = signals[0];
  if (!signal) return null;

  return (
    <button className={`aiw-bottom-brain-signal aiw-bottom-brain-signal--${signal.severity}`} onClick={onOpenInfo} title={signal.detail ?? signal.shortMessage}>
      <BrainSignalIcon signal={signal} />
      <span>{signal.shortMessage}</span>
    </button>
  );
}
