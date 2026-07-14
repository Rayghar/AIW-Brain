export function RoleJourneyCompass(props: any) {
  const {
    activeRoleJourney,
    activeRoleStepId,
    enterJourneyTarget,
    setRoleJourneyOpen,
    workspaceMode,
    activeStageLabel,
    workspaceLabel,
    t,
    screenPurpose,
    roleStageFastPathItems,
    isNavigationItemActive,
    navigateToItem,
  } = props;

  return (
    <section className="product-experience-bar workbench-compass role-journey-compass" aria-label="AIW role journey map">
      <div className="experience-state-card role-mission-card">
        <span className="eyebrow">Role mission</span>
        <strong>{activeRoleJourney.label}</strong>
        <small>{activeRoleJourney.mission}</small>
        <button type="button" onClick={() => setRoleJourneyOpen(true)}>View all role journeys</button>
      </div>
      <nav className="journey-pathway role-pathway" aria-label={`${activeRoleJourney.label} journey`}>
        {activeRoleJourney.path.map((step: any, index: number) => (
          <button key={step.id} className={activeRoleStepId === step.id ? "active" : ""} onClick={() => { const detail = { title: step.label, caption: step.detail, taskId: step.id }; window.sessionStorage.setItem("aiw.activeRoleTask", step.id); window.dispatchEvent(new CustomEvent("aiw:task-lens", { detail })); enterJourneyTarget(step.target); window.setTimeout(() => window.dispatchEvent(new CustomEvent("aiw:role-task", { detail })), 0); }} title={`${step.label}: ${step.detail}`}>
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
            <small>{step.detail}</small>
          </button>
        ))}
      </nav>
      <div className="journey-support-card">
        <span className="eyebrow">This screen</span>
        <strong>{workspaceMode === "design" ? activeStageLabel : workspaceLabel(t, workspaceMode)}</strong>
        <small>{screenPurpose}</small>
        <nav className="experience-stage-tabs compact-stage-tabs" aria-label="Relevant fast path">
          {roleStageFastPathItems.slice(0, 6).map((item: any) => {
            const Icon = item.icon;
            return (
              <button key={`role-flow-${"id" in item ? item.id : item.tab}`} className={isNavigationItemActive(item) ? "active" : ""} onClick={() => navigateToItem(item)} title={`${item.label} — ${item.caption}`}>
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
