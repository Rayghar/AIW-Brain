import type { BrainSignal } from '@aiw/brain-runtime';

export function DecisionRadarSignalPanel({ signals }: { signals: BrainSignal[] }) {
  return (
    <section className="aiw-decision-radar-signals" aria-label="AIW Decision Radar signals">
      <header>
        <strong>Decision Radar</strong>
        <span>{signals.length} signal(s)</span>
      </header>
      {signals.length === 0 ? (
        <p>No decision-quality findings are currently active.</p>
      ) : (
        <ul>
          {signals.map((signal) => (
            <li key={signal.id}>
              <strong>{signal.title}</strong>
              <span>{signal.shortMessage}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
