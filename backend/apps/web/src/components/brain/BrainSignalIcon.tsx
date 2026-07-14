import type { BrainSignal } from '@aiw/brain-runtime';

export function BrainSignalIcon({ signal }: { signal: BrainSignal }) {
  const icon = signal.severity === 'blocker' ? '⛔'
    : signal.severity === 'warning' ? '⚠'
    : signal.severity === 'recommendation' ? '✦'
    : signal.severity === 'review' ? '◇'
    : signal.severity === 'evidence' ? '◉'
    : '•';

  return <span className={`aiw-brain-icon aiw-brain-icon--${signal.severity}`} title={signal.shortMessage}>{icon}</span>;
}
