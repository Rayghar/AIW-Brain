import type { BrainSignal } from '@aiw/brain-runtime';

export function BrainInfoCenter({ open, signals, onClose }: { open: boolean; signals: BrainSignal[]; onClose: () => void }) {
  if (!open) return null;

  return (
    <aside className="aiw-info-center" aria-label="AIW Info Center">
      <header className="aiw-info-center__header">
        <div>
          <strong>AIW Info Center</strong>
          <p>Deterministic, knowledge-backed, and LLM-assisted observations for the current stage.</p>
        </div>
        <button onClick={onClose} aria-label="Close AIW Info Center">×</button>
      </header>
      <div className="aiw-info-center__list">
        {signals.length === 0 ? (
          <div className="aiw-info-center__empty">No priority signals for this stage.</div>
        ) : signals.map((signal) => (
          <article key={signal.id} className={`aiw-info-card aiw-info-card--${signal.severity}`}>
            <div className="aiw-info-card__meta">
              <span>{signal.sourceType}</span>
              <span>{Math.round(signal.confidence * 100)}% confidence</span>
            </div>
            <h4>{signal.title}</h4>
            <p>{signal.detail ?? signal.shortMessage}</p>
            {signal.recommendedAction && <strong className="aiw-info-card__action">{signal.recommendedAction}</strong>}
          </article>
        ))}
      </div>
    </aside>
  );
}
