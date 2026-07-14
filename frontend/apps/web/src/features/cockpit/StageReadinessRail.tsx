import { useMemo } from "react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { t } from "../../i18n";
import {
  buildLifecycleState,
  lifecycleStatusLabel,
  resolveLifecycleStatus,
} from "../../lib/lifecycleStatusService";

// One authoritative lifecycle projection is shared with the Cockpit and the
// guided delivery journey. The rail renders status; it does not invent a
// second readiness model.
export function StageReadinessRail() {
  const project = useWorkspaceStore((state) => state.project);
  const lifecycleCompletions = useWorkspaceStore((state) => state.lifecycleCompletions);
  const lifecycleArtifacts = useWorkspaceStore((state) => state.lifecycleArtifacts);
  const activeLifecycleStep = useWorkspaceStore((state) => state.activeLifecycleStep);
  const lifecycle = useMemo(
    () => resolveLifecycleStatus(
      project,
      buildLifecycleState(project, lifecycleCompletions, lifecycleArtifacts),
      activeLifecycleStep,
    ),
    [project, lifecycleCompletions, lifecycleArtifacts, activeLifecycleStep],
  );

  return (
    <section className="readiness-rail" aria-label={t("readiness.aria", "Stage readiness")}>
      <div className="readiness-rail__heading">
        <h2>{t("readiness.title", "Stage readiness")}</h2>
        <span>{lifecycle.overallProgress}% journey progress</span>
      </div>
      <div className="readiness-rail__track">
        {lifecycle.stages.map((stage) => (
          <div
            className={`readiness-stage readiness-stage--${stage.tone}`}
            key={stage.id}
            title={`${stage.label}: ${stage.nextAction}`}
            aria-current={stage.id === lifecycle.active.id ? "step" : undefined}
          >
            <div className="readiness-stage__bar"><span style={{ width: `${stage.progress}%` }} /></div>
            <strong>{stage.label}</strong>
            <small>{stage.progress}% · {lifecycleStatusLabel(stage.status)}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
