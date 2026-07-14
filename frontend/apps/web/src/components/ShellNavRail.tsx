import { BrainCircuit, PanelLeftClose, PanelLeftOpen, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useWorkspaceStore } from "../store/workspaceStore";
import { getRoleRailSections, type RoleRailItem, type RoleRailTarget } from "../lib/roleNavigation";

export function ShellNavRail(props: any) {
  const { navPinned, setNavPinned, navigateToItem, isNavigationItemActive, setCommandOpen, activeRoleJourney } = props;
  const workspaceMode = useWorkspaceStore((state) => state.workspaceMode);
  const project = useWorkspaceStore((state) => state.project);
  const activeLifecycleStep = useWorkspaceStore((state) => state.activeLifecycleStep);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage);
  const setActiveLifecycleStep = useWorkspaceStore((state) => state.setActiveLifecycleStep);
  const roleId = activeRoleJourney?.id ?? "solution-architect";
  const railSections = useMemo(() => getRoleRailSections(roleId), [roleId]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => setActiveTaskId((event as CustomEvent<{ taskId?: string }>).detail?.taskId ?? null);
    window.addEventListener("aiw:role-task", handler);
    return () => window.removeEventListener("aiw:role-task", handler);
  }, []);

  useEffect(() => {
    if (!activeTaskId || !railSections.some((section) => section.items.some((item) => item.id === activeTaskId))) setActiveTaskId(null);
  }, [activeTaskId, railSections]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && navPinned && window.innerWidth < 1440) setNavPinned(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [navPinned, setNavPinned]);

  const openLifecycleStep = (stepId: string) => {
    window.dispatchEvent(new CustomEvent("aiw:open-lifecycle-step", { detail: { stepId } }));
  };

  const openTarget = (target: RoleRailTarget) => {
    if (target.kind === "context") {
      setWorkspaceMode("design");
      setActiveLifecycleStep("context");
      setActiveStage("logicalApplication");
      openLifecycleStep("context");
      return;
    }
    if (target.kind === "quality") {
      setWorkspaceMode("quality");
      setActiveLifecycleStep("quality");
      openLifecycleStep("quality");
      return;
    }
    if (target.kind === "viewbook") {
      window.sessionStorage.setItem("aiw.pendingViewbookOpen", "true");
      setWorkspaceMode("design");
      if (project.activeStage === "designIntent" || project.activeStage === "validationRealization") setActiveStage("logicalApplication");
      window.dispatchEvent(new CustomEvent("aiw:open-viewbook"));
      return;
    }
    if (target.kind === "sdd") {
      setWorkspaceMode("design");
      setActiveStage("validationRealization");
      setActiveLifecycleStep("sdd");
      openLifecycleStep("sdd");
      return;
    }
    if (target.kind === "stage") {
      const stepByStage: Record<string, string> = {
        designIntent: "requirements",
        logicalApplication: "logical",
        applicationRealization: "realization",
        logicalTechnology: "logicalTechnology",
        physicalTechnology: "physicalTechnology",
        validationRealization: "review",
      };
      const lifecycleStep = stepByStage[target.id] ?? target.id;
      setWorkspaceMode("design");
      setActiveStage(target.id);
      setActiveLifecycleStep(lifecycleStep as Parameters<typeof setActiveLifecycleStep>[0]);
      openLifecycleStep(lifecycleStep);
      return;
    }
    if (target.kind === "workspace") {
      setWorkspaceMode(target.id);
      return;
    }
    if (target.kind === "admin") {
      navigateToItem?.({ kind: "admin", tab: target.tab, label: target.tab, caption: "Admin task", icon: Sparkles });
      return;
    }
    if (target.kind === "knowledge") navigateToItem?.({ kind: "knowledge", tab: target.tab, label: target.tab, caption: "Knowledge task", icon: Sparkles });
  };

  const isTargetActive = (target: RoleRailTarget) => {
    if (target.kind === "context") return workspaceMode === "design" && activeLifecycleStep === "context";
    if (target.kind === "quality") return workspaceMode === "quality";
    if (target.kind === "viewbook") return false;
    if (target.kind === "sdd") return workspaceMode === "design" && activeLifecycleStep === "sdd";
    if (target.kind === "stage") {
      if (target.id === "logicalApplication" && activeLifecycleStep === "context") return false;
      return workspaceMode === "design" && project.activeStage === target.id && activeLifecycleStep !== "sdd";
    }
    if (target.kind === "workspace") return workspaceMode === target.id;
    if (target.kind === "admin") return Boolean(isNavigationItemActive?.({ kind: "admin", tab: target.tab, label: target.tab, caption: "Admin task", icon: Sparkles }));
    if (target.kind === "knowledge") return Boolean(isNavigationItemActive?.({ kind: "knowledge", tab: target.tab, label: target.tab, caption: "Knowledge task", icon: Sparkles }));
    return false;
  };

  const targetActiveItems = railSections.flatMap((section) => section.items).filter((item) => isTargetActive(item.target));
  const activeTaskStillRelevant = Boolean(activeTaskId && targetActiveItems.some((item) => item.id === activeTaskId));
  const isItemActive = (item: RoleRailItem) => activeTaskStillRelevant ? item.id === activeTaskId : targetActiveItems[0]?.id === item.id;

  const activate = (item: RoleRailItem, event: MouseEvent<HTMLButtonElement>) => {
    const detail = { title: item.title, caption: item.caption, taskId: item.id };
    setActiveTaskId(item.id);
    window.dispatchEvent(new CustomEvent("aiw:task-lens", { detail }));
    openTarget(item.target);
    window.dispatchEvent(new CustomEvent("aiw:role-task", { detail }));
    if (event.detail > 0) event.currentTarget.blur();
    if (window.innerWidth < 1440) {
      setNavPinned(false);
      window.setTimeout(() => document.getElementById("aiw-main")?.focus({ preventScroll: true }), 80);
    }
  };

  return (
    <aside className={`aiw-primary-nav ${navPinned ? "is-expanded" : "is-collapsed"}`} data-testid="role-navigation-v2" data-state={navPinned ? "expanded" : "collapsed"} aria-label="Primary role journey">
      <header className="aiw-primary-nav__brand">
        <span className="aiw-primary-nav__mark"><BrainCircuit size={21} /></span>
        <div className="aiw-primary-nav__identity"><strong>AIW Studio</strong><small>{activeRoleJourney?.shortLabel ?? "Architecture"}</small></div>
        <button type="button" className="aiw-primary-nav__toggle" data-testid="role-rail-toggle" onClick={() => setNavPinned((value: boolean) => !value)} aria-label={navPinned ? "Collapse navigation" : "Expand navigation"} aria-pressed={navPinned}>{navPinned ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}</button>
      </header>

      <div className="aiw-primary-nav__role"><span>{activeRoleJourney?.label ?? "Role journey"}</span></div>

      <div className="aiw-primary-nav__scroll">
        {railSections.map((section) => (
          <section key={section.title} className="aiw-primary-nav__section">
            <p>{section.title}</p>
            <nav aria-label={section.title}>
              {section.items.map((item) => {
                const Icon = item.icon;
                return <button key={item.id} type="button" className={isItemActive(item) ? "is-active" : ""} onClick={(event) => activate(item, event)} title={item.title} aria-label={item.title} aria-current={isItemActive(item) ? "page" : undefined}><Icon size={18} /><span className="aiw-primary-nav__index" aria-hidden="true">{item.index}</span><span className="aiw-primary-nav__label">{item.label}</span></button>;
              })}
            </nav>
          </section>
        ))}
      </div>

      <footer className="aiw-primary-nav__footer">
        <button onClick={() => setCommandOpen(true)} title="Search and open any capability" aria-label="Search and open any capability"><Search size={17} /><span>Search AIW</span></button>
      </footer>
    </aside>
  );
}
