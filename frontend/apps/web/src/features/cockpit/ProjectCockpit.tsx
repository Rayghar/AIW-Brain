import {
  LayoutDashboard, HeartPulse, ClipboardList, AlertTriangle,
  ArrowRight, ShieldCheck, Compass,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { StageReadinessRail } from './StageReadinessRail';
import { t } from '../../i18n';

// Project Cockpit (Studio UX audit, Gap 16) — the post-project home answering
// "where am I, what's incomplete, what does AIW recommend next". Every number
// here is PROJECTED from the kernel's IntelligenceResponse (state.intelligence);
// the cockpit computes no score of its own — the kernel remains the authority.
export function ProjectCockpit() {
  const project = useWorkspaceStore((state) => state.project);
  const intelligence = useWorkspaceStore((state) => state.intelligence);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);

  const health = intelligence?.health;
  const nextActions = (intelligence?.nextBestActions ?? []).slice(0, 5);
  const missing = (intelligence?.missingAttributes ?? []).slice(0, 5);
  const risks = (intelligence?.findings ?? []).filter((f) => f.severity === 'SIGNIFICANT').slice(0, 5);
  const evidence = intelligence?.evidence;
  const levelClass = health ? `cockpit-health--${health.level}` : '';

  const actionText = (action: unknown): string => {
    const a = action as { title?: string; label?: string; description?: string; kind?: string };
    return a.title ?? a.label ?? a.description ?? a.kind ?? 'Recommended action';
  };

  return (
    <section className="cockpit" aria-label={t('cockpit.aria', 'Project cockpit')}>
      <header className="cockpit__head">
        <div>
          <span className="cockpit__eyebrow"><LayoutDashboard size={13} aria-hidden /> {t('cockpit.home', 'Project home')}</span>
          <h1>{project.name}</h1>
          <p>{t('cockpit.stage', 'Current stage')}: <strong>{project.activeStage}</strong></p>
        </div>
        {health ? (
          <div className={`cockpit-health ${levelClass}`} role="status">
            <HeartPulse size={16} aria-hidden />
            <span className="cockpit-health__score">{health.score}</span>
            <span className="cockpit-health__level">{health.level}</span>
          </div>
        ) : null}
      </header>

      <StageReadinessRail />

      <div className="cockpit__grid">
        <article className="cockpit-card">
          <h2><Compass size={14} aria-hidden /> {t('cockpit.next', 'Recommended next actions')}</h2>
          {nextActions.length ? (
            <ul>
              {nextActions.map((action, i) => (
                <li key={i}><button type="button" onClick={() => setWorkspaceMode('activation')}>{actionText(action)} <ArrowRight size={12} aria-hidden /></button></li>
              ))}
            </ul>
          ) : <p className="cockpit-empty">{t('cockpit.noNext', 'No pending actions — the model is progressing well.')}</p>}
        </article>

        <article className="cockpit-card">
          <h2><ClipboardList size={14} aria-hidden /> {t('cockpit.missing', 'Missing evidence')}</h2>
          {missing.length ? (
            <ul>
              {missing.map((m, i) => (
                <li key={i}><button type="button" onClick={() => setWorkspaceMode('quality')}><strong>{m.attribute}</strong> — {m.question}</button></li>
              ))}
            </ul>
          ) : <p className="cockpit-empty">{t('cockpit.noMissing', 'No critical evidence gaps for the current stage.')}</p>}
        </article>

        <article className="cockpit-card">
          <h2><AlertTriangle size={14} aria-hidden /> {t('cockpit.risks', 'Top risks')}</h2>
          {risks.length ? (
            <ul>{risks.map((r, i) => <li key={i} className="cockpit-risk"><strong>{r.title}</strong><span>{r.detail}</span></li>)}</ul>
          ) : <p className="cockpit-empty">{t('cockpit.noRisks', 'No significant findings outstanding.')}</p>}
        </article>
      </div>

      <footer className="cockpit__evidence">
        <ShieldCheck size={12} aria-hidden />
        <span>
          {evidence
            ? `${t('cockpit.evidence', 'Grounded in approved knowledge release')} ${evidence.knowledgeReleaseId} · ${t('cockpit.confidence', 'confidence')} ${intelligence?.confidence ?? 'medium'}`
            : t('cockpit.deterministic', 'Deterministic guidance active.')}
        </span>
      </footer>
    </section>
  );
}
