import { ChevronDown, CircleHelp, ShieldCheck } from 'lucide-react';
import type { RecommendationScore } from '@aiw/domain';

const dimensions: Array<{ key: keyof RecommendationScore['confidence']; label: string }> = [
  { key: 'evidence', label: 'Evidence' },
  { key: 'contextCompleteness', label: 'Context' },
  { key: 'deterministicRule', label: 'Rules' },
  { key: 'outcome', label: 'Outcomes' },
  { key: 'stability', label: 'Stability' },
];

export function RecommendationConfidenceDisclosure({ recommendation, compact = false }: { recommendation: RecommendationScore; compact?: boolean }) {
  return (
    <details className={`recommendation-confidence ${compact ? 'recommendation-confidence--compact' : ''}`}>
      <summary>
        <span className={`feasibility-badge feasibility-${recommendation.feasibility}`}>{recommendation.feasibility}</span>
        <span><ShieldCheck size={14} /> {recommendation.confidence.overall}% confidence</span>
        <small>{recommendation.confidence.modelInterpretation === null ? 'Deterministic rank · no LLM' : `Model interpretation ${recommendation.confidence.modelInterpretation}%`}</small>
        <ChevronDown className="recommendation-confidence__chevron" size={14} aria-hidden="true" />
      </summary>
      <div className="recommendation-confidence__body">
        <div className="confidence-dimensions" aria-label="Recommendation confidence dimensions">
          {dimensions.map(({ key, label }) => {
            const value = recommendation.confidence[key];
            if (typeof value !== 'number') return null;
            return <div key={key}><span>{label}</span><div><i style={{ width: `${value}%` }} /></div><b>{value}%</b></div>;
          })}
        </div>
        <div className="confidence-explanation-grid">
          <section>
            <strong>Why it ranks here</strong>
            <ul>{recommendation.whyRankedHere.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <section>
            <strong>What could change it</strong>
            <ul>{recommendation.changeTriggers.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        </div>
        {recommendation.contextGaps.length ? (
          <p className="confidence-context-gap"><CircleHelp size={14} /><span><strong>Context still needed:</strong> {recommendation.contextGaps.join(', ')}. AIW lowers certainty instead of inventing an answer.</span></p>
        ) : null}
        {recommendation.alternativesConsidered.length ? (
          <section className="confidence-alternatives">
            <strong>Alternatives considered</strong>
            {recommendation.alternativesConsidered.slice(0, 3).map((alternative) => (
              <div key={alternative.styleId}><span>{alternative.styleName}</span><b>{alternative.score.toFixed(1)}</b><small>{alternative.reasonRankedLower}</small></div>
            ))}
          </section>
        ) : null}
        <p className="confidence-boundary">Outcome confidence is intentionally conservative until comparable implementation evidence is reviewed and promoted through a signed knowledge release.</p>
      </div>
    </details>
  );
}
