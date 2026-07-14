import {
  BrainCircuit,
  ChevronsLeftRight,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useWorkspaceStore } from "../store/workspaceStore";
import { getRoleRailSections, type RoleRailItem, type RoleRailTarget } from "../lib/roleNavigation";

export function ShellNavRail(props: any) {
  const {
    navPinned,
    setNavPinned,
    navigateToItem,
    isNavigationItemActive,
    setCommandOpen,
    resetDemo,
    activeRoleJourney,
    setCapabilityMapOpen,
  } = props;

  const workspaceMode = useWorkspaceStore((state) => state.workspaceMode);
  const [navDensity, setNavDensity] = useState<"compact" | "detailed">(() => {
    if (typeof window === "undefined") return "compact";
    return window.localStorage.getItem("aiw.navDensity.v10_48_16") === "detailed" ? "detailed" : "compact";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("aiw.navDensity.v10_48_16", navDensity);
  }, [navDensity]);
  const project = useWorkspaceStore((state) => state.project);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage);
  const setActiveLifecycleStep = useWorkspaceStore((state) => state.setActiveLifecycleStep);
  const roleId = activeRoleJourney?.id ?? "solution-architect";
  const railSections = getRoleRailSections(roleId);

  const openLifecycleStep = (stepId: string) => {
    const dispatch = () => window.dispatchEvent(new CustomEvent("aiw:open-lifecycle-step", { detail: { stepId } }));
    window.setTimeout(dispatch, 0);
    window.setTimeout(dispatch, 160);
  };

  const openTarget = (target: RoleRailTarget) => {
    if (target.kind === "quality") {
      setActiveLifecycleStep("quality");
      setWorkspaceMode("quality");
      openLifecycleStep("quality");
      return;
    }
    if (target.kind === "sdd") {
      // SDD is a terminal lifecycle surface inside the persistent journey studio.
      // Do not remount the design workspace first: doing so can drop the lifecycle
      // event and leave the user stranded in Review & Assurance.
      setActiveLifecycleStep("sdd");
      setWorkspaceMode("design");
      setActiveStage("validationRealization");
      openLifecycleStep("sdd");
      window.setTimeout(() => {
        document.querySelector<HTMLElement>(".architecture-journey-studio")?.scrollIntoView({ block: "start", behavior: "smooth" });
      }, 180);
      return;
    }
    if (target.kind === "stage") {
      setWorkspaceMode("design");
      setActiveStage(target.id);
      const stepByStage: Record<string, string> = {
        designIntent: "requirements",
        logicalApplication: "logical",
        applicationRealization: "realization",
        logicalTechnology: "logicalTechnology",
        physicalTechnology: "physicalTechnology",
        validationRealization: "review",
      };
      const lifecycleStep = stepByStage[target.id] ?? target.id;
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
    if (target.kind === "knowledge") {
      navigateToItem?.({ kind: "knowledge", tab: target.tab, label: target.tab, caption: "Knowledge task", icon: Sparkles });
    }
  };

  const isTargetActive = (target: RoleRailTarget) => {
    if (target.kind === "quality") return workspaceMode === "quality";
    if (target.kind === "sdd") return workspaceMode === "design" && project.activeStage === "validationRealization";
    if (target.kind === "stage") return workspaceMode === "design" && project.activeStage === target.id;
    if (target.kind === "workspace") return workspaceMode === target.id;
    if (target.kind === "admin") return Boolean(isNavigationItemActive?.({ kind: "admin", tab: target.tab, label: target.tab, caption: "Admin task", icon: Sparkles }));
    if (target.kind === "knowledge") return Boolean(isNavigationItemActive?.({ kind: "knowledge", tab: target.tab, label: target.tab, caption: "Knowledge task", icon: Sparkles }));
    return false;
  };

  const renderItem = (item: RoleRailItem) => {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        className={isTargetActive(item.target) ? "active" : ""}
        onClick={(event) => {
          const detail = { title: item.title, caption: item.caption, taskId: item.id };
          window.sessionStorage.setItem("aiw.activeRoleTask", item.id);
          window.dispatchEvent(new CustomEvent("aiw:task-lens", { detail }));
          openTarget(item.target);
          window.setTimeout(() => window.dispatchEvent(new CustomEvent("aiw:role-task", { detail })), 0);
          // Pointer users should return immediately to the work surface. Keeping
          // focus inside the expandable rail makes it cover narrow workspaces;
          // keyboard activation (detail === 0) intentionally retains focus.
          if (event.detail > 0) event.currentTarget.blur();
        }}
        title={`${item.title}: ${item.caption}`}
        aria-label={item.title}
      >
        <Icon size={18} />
        <span className="stage-index">{item.index}</span>
        <span className="nav-item-label">
          <strong>{item.label}</strong>
          <small>{item.caption}</small>
        </span>
      </button>
    );
  };

  return (
    <aside className={`app-nav product-nav studio-nav role-based-nav role-nav-density--${navDensity} ${navPinned ? "is-pinned" : ""}`} data-aiw-tour="lifecycle-rail" aria-label="Role-based AIW navigation">
      <div className="brand-block product-brand studio-nav__brand">
        <span className="brand-mark"><BrainCircuit size={23} /></span>
        <div>
          <strong>AIW Studio</strong>
          <small>{activeRoleJourney?.shortLabel ?? "Architecture"} workbench</small>
        </div>
        <button type="button" className="nav-pin-button" onClick={() => setNavPinned((value: boolean) => !value)} title={navPinned ? "Collapse navigation rail" : "Pin navigation open"} aria-pressed={navPinned} aria-label={navPinned ? "Collapse navigation rail" : "Pin navigation open"}>
          <SlidersHorizontal size={15} />
        </button>
      </div>

      <div className="role-nav-intent" aria-label="Navigation model">
        <strong>{activeRoleJourney?.label ?? "Role"}</strong>
        <span>{railSections[0]?.intent ?? "Focused journey for the active role."}</span>
        <button
          type="button"
          className="role-nav-density-toggle"
          onClick={() => setNavDensity((value) => value === "compact" ? "detailed" : "compact")}
          title={navDensity === "compact" ? "Show captions in the role rail" : "Compact the role rail"}
          aria-label={navDensity === "compact" ? "Show detailed role rail" : "Use compact role rail"}
        >
          <ChevronsLeftRight size={13} /> {navDensity === "compact" ? "Detailed" : "Compact"}
        </button>
      </div>

      <div className="product-nav-scroll studio-nav__scroll">
        {railSections.map((section) => (
          <section key={section.title} className="product-nav-section studio-nav__section studio-nav__section--primary role-based-nav__section">
            <p className="nav-section-label">{section.title}</p>
            <nav aria-label={section.title}>
              {section.items.map(renderItem)}
            </nav>
          </section>
        ))}
      </div>

      <div className="nav-footer studio-nav__footer">
        <button onClick={() => setCommandOpen(true)} title="Search commands and all AIW capabilities" aria-label="Search commands and all AIW capabilities"><Search size={17} /><span><strong>Search</strong></span></button>
        <button onClick={() => setCapabilityMapOpen?.(true)} title="Open capability map" aria-label="Open capability map"><Sparkles size={17} /><span><strong>Map</strong></span></button>
        <button onClick={resetDemo} title="Reset sample workspace" aria-label="Reset sample workspace"><RotateCcw size={17} /><span><strong>Reset</strong></span></button>
      </div>
    </aside>
  );
}
