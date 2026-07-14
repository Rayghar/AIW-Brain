import type { BrainSignal } from '@aiw/brain-runtime';

export function LibrarySignalChips({ signals }: { signals: BrainSignal[] }) {
  if (!signals.length) return null;

  return (
    <div className="aiw-library-signal-chips" aria-label="AIW library recommendation signals">
      {signals.slice(0, 2).map((signal) => (
        <span key={signal.id} className={`aiw-library-signal-chip aiw-library-signal-chip--${signal.severity}`} title={signal.detail ?? signal.shortMessage}>
          {signal.severity === 'warning' ? 'Risk' : signal.severity === 'recommendation' ? 'Best fit' : 'Hint'}
        </span>
      ))}
    </div>
  );
}
