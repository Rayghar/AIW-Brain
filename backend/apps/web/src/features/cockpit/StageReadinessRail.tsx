import { assessStageReadiness, type StageStatus } from '@aiw/engine';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { t } from '../../i18n';

const STAGE_ORDER = ['designIntent','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','validationRealization'] as const;
const STAGE_LABEL: Record<string, string> = {
  designIntent: 'Brief', logicalApplication: 'Logical', applicationRealization: 'Realization',
  logicalTechnology: 'Logical tech', physicalTechnology: 'Physical tech', validationRealization: 'Review',
};
const STATUS_LABEL: Record<StageStatus, string> = {
  'not-started': 'Not started', 'in-progress': 'In progress', 'evidence-missing': 'Evidence missing',
  'review-required': 'Review required', 'ready': 'Ready',
};

// Stage-readiness rail (Gap 13): persistent sense of progress across the six
// lifecycle stages. Projected deterministically from the governed project by
// the engine — the rail renders, it does not judge.
export function StageReadinessRail() {
  const project = useWorkspaceStore((state) => state.project);
  const findings = useWorkspaceStore((state) => state.findings);
  const readiness = assessStageReadiness(project, STAGE_ORDER as unknown as never[], (findings ?? []) as never);

  return (
    <section className="readiness-rail" aria-label={t('readiness.aria', 'Stage readiness')}>
      <h2>{t('readiness.title', 'Stage readiness')}</h2>
      <div className="readiness-rail__track">
        {readiness.map((r) => (
          <div className={`readiness-stage readiness-stage--${r.status}`} key={r.stage} title={r.reason}>
            <div className="readiness-stage__bar"><span style={{ width: `${r.percent}%` }} /></div>
            <strong>{STAGE_LABEL[r.stage] ?? r.stage}</strong>
            <small>{r.percent}% · {STATUS_LABEL[r.status]}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
