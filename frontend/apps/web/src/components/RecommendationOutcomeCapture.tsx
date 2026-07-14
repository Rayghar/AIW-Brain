import { useState } from 'react';
import { CheckCircle2, Clock3, MessageSquareText, XCircle } from 'lucide-react';
import type { RecommendationOutcomeDecision, RecommendationScore } from '@aiw/domain';
import { useWorkspaceStore } from '../store/workspaceStore';

interface RecommendationOutcomeCaptureProps {
  recommendation?: RecommendationScore;
  recommendationId?: string;
  recommendationType?: 'style' | 'pattern' | 'tactic' | 'finding' | 'decision' | 'sol-response';
  recordId?: string;
  label?: string;
}

const decisionOptions: Array<{
  id: Extract<RecommendationOutcomeDecision, 'accepted' | 'rejected' | 'deferred'>;
  label: string;
  icon: typeof CheckCircle2;
}> = [
  { id: 'accepted', label: 'Accept', icon: CheckCircle2 },
  { id: 'deferred', label: 'Defer', icon: Clock3 },
  { id: 'rejected', label: 'Reject', icon: XCircle },
];

export function RecommendationOutcomeCapture({
  recommendation,
  recommendationId,
  recommendationType = recommendation ? 'style' : 'decision',
  recordId,
  label,
}: RecommendationOutcomeCaptureProps) {
  const project = useWorkspaceStore((state) => state.project);
  const knowledgeReleaseId = useWorkspaceStore((state) => state.library.knowledgeReleaseId);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [message, setMessage] = useState('');
  const resolvedRecordId = recordId ?? recommendation?.styleId;
  const resolvedRecommendationId = recommendationId ?? (recommendation ? `style:${recommendation.styleId}` : resolvedRecordId ?? 'review-decision');
  const resolvedLabel = label ?? recommendation?.styleName ?? 'architecture recommendation';

  const recordOutcome = async (decision: 'accepted' | 'rejected' | 'deferred') => {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 8) {
      setStatus('failed');
      setMessage('Add a short decision reason so the outcome remains auditable.');
      return;
    }

    setStatus('saving');
    setMessage('');
    try {
      const response = await fetch('/api/intelligence/outcomes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          recommendationId: resolvedRecommendationId,
          recommendationType,
          ...(resolvedRecordId ? { recordId: resolvedRecordId } : {}),
          stage: project.activeStage,
          decision,
          reason: normalizedReason,
          knowledgeReleaseId,
        }),
      });
      if (!response.ok) throw new Error(`Outcome service returned ${response.status}`);
      setStatus('saved');
      setMessage(`Outcome recorded as ${decision}. It will inform a governed calibration proposal, never automatic scoring.`);
    } catch (error) {
      setStatus('failed');
      setMessage(error instanceof Error ? error.message : 'Outcome could not be recorded.');
    }
  };

  return (
    <details className="recommendation-outcome-capture">
      <summary><MessageSquareText size={13} /> Record decision outcome</summary>
      <div className="recommendation-outcome-capture__body">
        <label>
          <span>Decision reason</span>
          <textarea
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              if (status !== 'saving') setStatus('idle');
            }}
            rows={2}
            placeholder="Explain why this recommendation fits, does not fit, or must wait."
          />
        </label>
        <div className="recommendation-outcome-capture__actions" role="group" aria-label={`Record outcome for ${resolvedLabel}`}>
          {decisionOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button key={option.id} type="button" disabled={status === 'saving'} onClick={() => void recordOutcome(option.id)}>
                <Icon size={13} /> {option.label}
              </button>
            );
          })}
        </div>
        {message ? <p role={status === 'failed' ? 'alert' : 'status'} className={`recommendation-outcome-capture__message is-${status}`}>{message}</p> : null}
        <small>Human outcomes are stored as evidence for expert-reviewed calibration. AIW does not self-modify production scoring.</small>
      </div>
    </details>
  );
}
