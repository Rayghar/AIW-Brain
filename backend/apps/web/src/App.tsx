import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { BookOpenCheck, BrainCircuit, Cloud, CloudOff, Focus, Minimize2 } from "lucide-react";
import type { ArchitectureStage } from "@aiw/domain";
import { useWorkspaceStore } from "./store/workspaceStore";
import { ProjectHub } from "./components/ProjectHub";
import { RoleEntryGate } from "./components/RoleEntryGate";
import { ShellNavRail } from "./components/ShellNavRail";
import { ShellTopbar } from "./components/ShellTopbar";
import { RoleJourneyCompass } from "./components/RoleJourneyCompass";
import { RoleToolsTray } from "./components/RoleToolsTray";
import { PageObjectiveStrip } from "./components/PageObjectiveStrip";
import { BottomDock } from "./components/BottomDock";
import { FirstRunTour } from "./components/FirstRunTour";
import { GuidedDeliveryShell } from "./components/GuidedDeliveryShell";
import { stages } from "./lib/designStages";
import { workspaceEntries, navigationSections } from "./lib/workspaceNavigation";
import type { NavigationItem } from "./lib/workspaceNavigation";
import { navigationItemKey, roleJourneyCatalog } from "./lib/roleJourneys";
import type { JourneyTarget } from "./lib/roleJourneys";
import type { RoleToolItem } from "./lib/roleTools";
import { workspaceLabel, workspaceCaption, workspaceArchetype, downloadProject } from "./lib/workspaceMeta";
import { StudioInspector } from "./components/StudioInspector";
import { QuietBrainSignalLayer } from "./components/brain/QuietBrainSignalLayer";
import { WorkspaceErrorBoundary } from "./components/PageShell";
import { CollaborationRuntime } from "./components/CollaborationRuntime";
import { applyLocale, currentLocale } from "./lib/locale";
import { useI18n } from "./lib/i18n";
import { useGlobalCommandShortcuts } from "./hooks/useGlobalCommandShortcuts";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { RoleTrustStatus } from "./components/RoleTrustStatus";
const WorkspaceRouter = lazy(() => import("./components/WorkspaceRouter").then((module) => ({ default: module.WorkspaceRouter })));
const ShellOverlays = lazy(() => import("./components/ShellOverlays").then((module) => ({ default: module.ShellOverlays })));
const InfoCenterPanel = lazy(() => import("./components/InfoCenterPanel").then((module) => ({ default: module.InfoCenterPanel })));
const CoArchitectPanel = lazy(() => import("./components/CoArchitectPanel").then((module) => ({ default: module.CoArchitectPanel })));
import {
  experienceProfile as resolveExperienceProfile,
  experienceProfiles,
  type WorkspaceModeId,
} from "./lib/experienceProfiles";
export default function App() {
  const { t } = useI18n();
  const [showProjectHub, setShowProjectHub] = useState(
    () => sessionStorage.getItem("aiw-project-entered") !== "true",
  );
  const isOnline = useOnlineStatus();
  const inputRef = useRef<HTMLInputElement>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [navSubSurface, setNavSubSurface] = useState<string | null>(null);
  const [navPinned, setNavPinned] = useState(false);
  const [showAllNavigation, setShowAllNavigation] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [capabilityMapOpen, setCapabilityMapOpen] = useState(false);
  const [roleJourneyOpen, setRoleJourneyOpen] = useState(false);
  const [decisionRadarOpen, setDecisionRadarOpen] = useState(false);
  const [infoCenterOpen, setInfoCenterOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem("aiw.workspaceFocus.rc10_51") === "true");
  const [taskLens, setTaskLens] = useState<{ title: string; caption: string } | null>(null);
  const workspaceMode = useWorkspaceStore((state) => state.workspaceMode);
  const experienceProfileId = useWorkspaceStore(
    (state) => state.experienceProfile,
  );
  const setExperienceProfile = useWorkspaceStore(
    (state) => state.setExperienceProfile,
  );
  const roleChosen = useWorkspaceStore((state) => state.roleChosen);
  const activeExperience = resolveExperienceProfile(experienceProfileId);
  const activeRoleJourney = roleJourneyCatalog[experienceProfileId];
  const workspaceVisible = (mode: WorkspaceModeId) =>
    activeExperience.visibleWorkspaces.includes(mode);
  const visibleWorkspaceEntries = workspaceEntries.filter((entry) =>
    workspaceVisible(entry.id),
  );
  const project = useWorkspaceStore((state) => state.project);
  const library = useWorkspaceStore((state) => state.library);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const contextual = useWorkspaceStore((state) => state.contextual);
  const intelligence = useWorkspaceStore((state) => state.intelligence);
  const notice = useWorkspaceStore((state) => state.notice);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage);
  const createSnapshot = useWorkspaceStore((state) => state.createSnapshot);
  const importProject = useWorkspaceStore((state) => state.importProject);
  const clearNotice = useWorkspaceStore((state) => state.clearNotice);
  const resetDemo = useWorkspaceStore((state) => state.resetDemo);
  const persistenceStatus = useWorkspaceStore(
    (state) => state.persistenceStatus,
  );
  const undoStack = useWorkspaceStore((state) => state.undoStack);
  const redoStack = useWorkspaceStore((state) => state.redoStack);
  const undo = useWorkspaceStore((state) => state.undo);
  const redo = useWorkspaceStore((state) => state.redo);
  const saveProjectToServer = useWorkspaceStore(
    (state) => state.saveProjectToServer,
  );
  const serverPersistenceEnabled = useWorkspaceStore(
    (state) => state.serverPersistenceEnabled,
  );
  const setServerPersistence = useWorkspaceStore(
    (state) => state.setServerPersistence,
  );
  const currentUserId = useWorkspaceStore((state) => state.currentUserId);
  const knowledgeReleaseId = useWorkspaceStore(
    (state) => state.library.knowledgeReleaseId,
  );
  useEffect(() => {
    applyLocale(currentLocale());
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(clearNotice, 5500);
    return () => window.clearTimeout(timer);
  }, [notice, clearNotice]);

  useGlobalCommandShortcuts(setCommandOpen);

  useEffect(() => {
    localStorage.setItem("aiw.workspaceFocus.rc10_51", String(focusMode));
  }, [focusMode]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ title?: string; caption?: string }>).detail;
      if (detail?.title) setTaskLens({ title: detail.title, caption: detail.caption ?? "Focused role task" });
    };
    window.addEventListener("aiw:task-lens", handler);
    return () => window.removeEventListener("aiw:task-lens", handler);
  }, []);

  useEffect(() => {
    if (activeExperience.visibleWorkspaces.includes(workspaceMode)) return;
    setWorkspaceMode(activeExperience.preferredWorkspaces[0] ?? "design");
  }, [activeExperience, workspaceMode, setWorkspaceMode]);

  const brainWorkspace = useMemo(() => ({
    project,
    library,
    selectedNodeId,
    selectedObjectId: selectedNodeId,
    activeLifecycleStage: project.activeStage,
    intelligence,
  }), [project, library, selectedNodeId, intelligence]);

  if (showProjectHub)
    return (
      <ProjectHub
        onEnter={() => {
          sessionStorage.setItem("aiw-project-entered", "true");
          setShowProjectHub(false);
        }}
      />
    );

  if (!roleChosen)
    return (
      <RoleEntryGate
        currentRole={experienceProfileId}
        onSetRole={setExperienceProfile}
        onOpenDesignIntent={() => { setActiveStage("designIntent"); setWorkspaceMode("design"); }}
        onOpenCockpit={() => setWorkspaceMode("cockpit")}
      />
    );

  const isGuidedDelivery = workspaceMode === "design" || workspaceMode === "quality";
  const mainContent = <Suspense fallback={<div className="lazy-workspace-skeleton" role="status">Loading AIW workspace…</div>}><WorkspaceRouter workspaceMode={workspaceMode} project={project} /></Suspense>;
  const focusStageWorkspace = () => {
    requestAnimationFrame(() => {
      const target = document.getElementById("aiw-stage-workspace");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      target?.focus({ preventScroll: true });
    });
  };
  const openObligations = contextual.obligations.filter(
    (item) => !item.satisfied,
  ).length;
  const unreadNotifications = project.notifications.filter(
    (item) => item.recipientId === currentUserId && !item.readAt,
  ).length;
  const enterStage = (stage: ArchitectureStage) => {
    setActiveStage(stage);
    setWorkspaceMode("design");
    focusStageWorkspace();
  };

  const enterWorkspace = (mode: WorkspaceModeId) => {
    setWorkspaceMode(mode);
    setNavSubSurface(null);
    requestAnimationFrame(() => {
      document.getElementById("aiw-main")?.focus();
      if (["quality", "design", "patterns", "synthesis", "conformance", "governance", "runtime", "operations"].includes(mode)) {
        document.getElementById("aiw-stage-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const openCoArchitect = (prompt?: string) => {
    window.dispatchEvent(
      new CustomEvent("aiw:open-coarchitect", { detail: { prompt } }),
    );
  };

  const enterAdminSurface = (
    tab: Extract<NavigationItem, { kind: "admin" }>["tab"],
  ) => {
    window.sessionStorage.setItem("aiw.activeAdminTab", tab);
    setWorkspaceMode("admin");
    setNavSubSurface(`admin:${tab}`);
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("aiw:admin-tab", { detail: { tab } }),
      );
      document.getElementById("aiw-main")?.focus();
    }, 0);
  };

  const enterKnowledgeSurface = (
    tab: Extract<NavigationItem, { kind: "knowledge" }>["tab"],
  ) => {
    window.sessionStorage.setItem("aiw.activeKnowledgeTab", tab);
    setWorkspaceMode("knowledge");
    setNavSubSurface(`knowledge:${tab}`);
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("aiw:knowledge-tab", { detail: { tab } }),
      );
      document.getElementById("aiw-main")?.focus();
    }, 0);
  };

  const navigateToItem = (item: NavigationItem) => {
    if (item.kind === "stage") {
      setWorkspaceMode("design");
      setNavSubSurface(null);
      enterStage(item.id);
      return;
    }
    if (item.kind === "admin") {
      enterAdminSurface(item.tab);
      return;
    }
    if (item.kind === "knowledge") {
      enterKnowledgeSurface(item.tab);
      return;
    }
    enterWorkspace(item.id);
  };

  const isNavigationItemActive = (item: NavigationItem) => {
    if (item.kind === "stage")
      return workspaceMode === "design" && project.activeStage === item.id;
    if (item.kind === "admin")
      return (
        workspaceMode === "admin" &&
        (navSubSurface === `admin:${item.tab}` ||
          (!navSubSurface && item.tab === "overview"))
      );
    if (item.kind === "knowledge")
      return (
        workspaceMode === "knowledge" &&
        (navSubSurface === `knowledge:${item.tab}` ||
          (!navSubSurface && item.tab === "overview"))
      );
    return workspaceMode === item.id;
  };

  const openCapability = (capabilityId: string) => {
    setCapabilityMapOpen(false);
    switch (capabilityId) {
      case "project-cockpit":
        enterWorkspace("cockpit");
        break;
      case "guided-interview":
        setWorkspaceMode("design");
        enterStage("designIntent");
        openCoArchitect("Interview me for the missing architecture context and convert the answers into a stronger design brief.");
        break;
      case "decision-radar":
        setDecisionRadarOpen(true);
        break;
      case "pattern-studio":
        enterWorkspace("patterns");
        break;
      case "architecture-synthesis":
        enterWorkspace("synthesis");
        break;
      case "generate-sdd":
        setWorkspaceMode("design");
        enterStage("validationRealization");
        openCoArchitect("Help me prepare the SDD, ADRs, fitness tests and solution delivery pack from this review workspace.");
        break;
      case "conformance":
        enterWorkspace("conformance");
        break;
      case "drift-waivers":
        enterWorkspace("drift");
        break;
      case "knowledge-ops":
        enterKnowledgeSurface("overview");
        break;
      case "pattern-dna-admin":
        enterAdminSurface("patterns");
        break;
      case "release-manager":
        enterAdminSurface("releases");
        break;
      case "github-pr-preview":
        enterAdminSurface("repoPilot");
        break;
      case "durable-events":
        enterAdminSurface("repoPilot");
        break;
      case "security-rbac":
        enterAdminSurface("security");
        break;
      default:
        setCommandOpen(true);
    }
  };

  const enterJourneyTarget = (target: JourneyTarget) => {
    if (target.kind === "workspace") {
      enterWorkspace(target.id);
      return;
    }
    if (target.kind === "stage") {
      setWorkspaceMode("design");
      enterStage(target.id);
      return;
    }
    if (target.kind === "admin") {
      enterAdminSurface(target.tab);
      return;
    }
    if (target.kind === "knowledge") {
      enterKnowledgeSurface(target.tab);
      return;
    }
    if (target.kind === "capability") {
      openCapability(target.id);
      return;
    }
    openCoArchitect(target.prompt);
  };

  const openRoleTool = (tool: RoleToolItem) => {
    if (tool.target.kind === "admin") {
      enterAdminSurface(tool.target.tab);
      return;
    }
    if (tool.target.kind === "knowledge") {
      enterKnowledgeSurface(tool.target.tab);
      return;
    }
    if (tool.id === "logical-tech") {
      setWorkspaceMode("design");
      enterStage("logicalTechnology");
      window.dispatchEvent(new CustomEvent("aiw:open-lifecycle-step", { detail: { stepId: "logicalTechnology" } }));
      return;
    }
    if (tool.id === "review") {
      setWorkspaceMode("design");
      enterStage("validationRealization");
      window.dispatchEvent(new CustomEvent("aiw:open-lifecycle-step", { detail: { stepId: "review" } }));
      return;
    }
    enterWorkspace(tool.target.id);
  };

  const isRoleToolActive = (tool: RoleToolItem) => {
    if (tool.target.kind === "workspace") {
      if (tool.id === "logical-tech") return workspaceMode === "design" && project.activeStage === "logicalTechnology";
      if (tool.id === "review") return workspaceMode === "design" && project.activeStage === "validationRealization";
      return workspaceMode === tool.target.id;
    }
    if (tool.target.kind === "admin") return isNavigationItemActive({ kind: "admin", tab: tool.target.tab, label: tool.label, caption: tool.description, icon: tool.icon });
    if (tool.target.kind === "knowledge") return isNavigationItemActive({ kind: "knowledge", tab: tool.target.tab, label: tool.label, caption: tool.description, icon: tool.icon });
    return false;
  };

  const handleExperienceProfileChange = (role: string) => {
    setExperienceProfile(role as any);
    setShowAllNavigation(false);
    const journey = roleJourneyCatalog[role as keyof typeof roleJourneyCatalog] ?? roleJourneyCatalog["solution-architect"];
    const firstTarget = journey.path[0]?.target;
    if (firstTarget) {
      window.setTimeout(() => enterJourneyTarget(firstTarget), 0);
    }
  };

  const enterJourneyStep = (stepId: string) => {
    switch (stepId) {
      case "orient":
        enterWorkspace("cockpit");
        break;
      case "brief":
        setWorkspaceMode("design");
        enterStage("designIntent");
        break;
      case "drivers":
        enterWorkspace("quality");
        break;
      case "model":
        setWorkspaceMode("design");
        enterStage("logicalApplication");
        break;
      case "synthesize":
        enterWorkspace("synthesis");
        break;
      case "assure":
        enterWorkspace("conformance");
        break;
      case "operate":
        enterWorkspace("admin");
        break;
      default:
        enterWorkspace("cockpit");
    }
  };

  const archetype = workspaceArchetype(workspaceMode, project.activeStage);
  const scopedNavigationSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (showAllNavigation) return true;
        const key = navigationItemKey(item);
        return activeRoleJourney.navigationKeys.includes(key) || isNavigationItemActive(item);
      }),
    }))
    .filter((section) => section.items.length > 0);
  const designLifecycleItems =
    navigationSections.find((section) => section.title === "Design Lifecycle")
      ?.items ?? [];
  const roleStageFastPathItems = designLifecycleItems.filter((item) =>
    showAllNavigation || activeRoleJourney.navigationKeys.includes(navigationItemKey(item)) || isNavigationItemActive(item),
  );
  const currentWorkspaceCaption =
    workspaceMode === "design"
      ? (stages.find((stage) => stage.id === project.activeStage)?.caption ??
        "Lifecycle stage")
      : workspaceCaption(
          t,
          workspaceMode as Exclude<WorkspaceModeId, "design">,
        );

  const currentStageIndex = stages.findIndex(
    (stage) => stage.id === project.activeStage,
  );
  const activeStageLabel = stages[currentStageIndex]?.label ?? "Design stage";
  const nextStage =
    stages[Math.min(currentStageIndex + 1, stages.length - 1)] ?? stages[0]!;
  const lifecycleNextLabel = (() => {
    if (workspaceMode === "quality") return "Logical Application";
    if (workspaceMode !== "design") return "Design lifecycle";
    if (project.activeStage === "designIntent") return "Quality Drivers";
    if (project.activeStage === "logicalApplication") return "Application Realization";
    if (project.activeStage === "applicationRealization") return "Logical Technology";
    if (project.activeStage === "logicalTechnology") return "Physical Technology";
    if (project.activeStage === "physicalTechnology") return "Review & Assurance";
    return "SDD Pack";
  })();
  const advanceLifecycle = () => {
    if (workspaceMode !== "design" && workspaceMode !== "quality") {
      setWorkspaceMode("design");
      setActiveStage("designIntent");
      focusStageWorkspace();
      return;
    }
    if (workspaceMode === "quality") {
      setWorkspaceMode("design");
      setActiveStage("logicalApplication");
      focusStageWorkspace();
      return;
    }
    if (project.activeStage === "designIntent") {
      setWorkspaceMode("quality");
      focusStageWorkspace();
      return;
    }
    if (project.activeStage === "logicalApplication") {
      enterStage("applicationRealization");
      return;
    }
    if (project.activeStage === "applicationRealization") {
      enterStage("logicalTechnology");
      return;
    }
    if (project.activeStage === "logicalTechnology") {
      enterStage("physicalTechnology");
      return;
    }
    if (project.activeStage === "physicalTechnology") {
      enterStage("validationRealization");
      return;
    }
    window.dispatchEvent(new CustomEvent("aiw:open-lifecycle-step", { detail: { stepId: "sdd" } }));
    window.setTimeout(() => document.querySelector(".architecture-journey-studio")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const screenPurpose = (() => {
    if (workspaceMode === "cockpit")
      return "Orient the project, see readiness, and choose the next architectural move.";
    if (workspaceMode === "design")
      return `Co-author the ${activeStageLabel.toLowerCase()} model with governed intelligence and traceability.`;
    if (
      ["activation", "quality", "patterns", "synthesis"].includes(workspaceMode)
    )
      return "Explore architecture options, quality drivers, pattern evidence and design recommendations.";
    if (["admin", "knowledge"].includes(workspaceMode))
      return "Operate AIW’s knowledge brain, routes, releases, workers and production controls.";
    return "Validate architecture posture against governance, runtime, security and conformance evidence.";
  })();
  const flowStep = ["cockpit", "portfolio", "comparison", "pilot"].includes(
    workspaceMode,
  )
    ? "orient"
    : workspaceMode === "design" ||
        ["activation", "quality", "patterns", "synthesis"].includes(
          workspaceMode,
        )
      ? "design"
      : ["admin", "knowledge"].includes(workspaceMode)
        ? "operate"
        : "assure";

  const activeJourneyId =
    flowStep === "orient"
      ? "orient"
      : flowStep === "operate"
        ? "operate"
        : flowStep === "assure"
          ? "assure"
          : workspaceMode === "quality"
            ? "drivers"
            : workspaceMode === "synthesis" || workspaceMode === "patterns"
              ? "synthesize"
              : workspaceMode === "design" && project.activeStage === "designIntent"
                ? "brief"
                : "model";
  const journeyTargetActive = (target: JourneyTarget) => {
    if (target.kind === "workspace") return workspaceMode === target.id;
    if (target.kind === "stage") return workspaceMode === "design" && project.activeStage === target.id;
    if (target.kind === "admin") return workspaceMode === "admin" && (navSubSurface === `admin:${target.tab}` || (!navSubSurface && target.tab === "overview"));
    if (target.kind === "knowledge") return workspaceMode === "knowledge" && (navSubSurface === `knowledge:${target.tab}` || (!navSubSurface && target.tab === "overview"));
    return false;
  };
  const activeRoleStepId =
    activeRoleJourney.path.find((step) => journeyTargetActive(step.target))?.id ??
    activeRoleJourney.path[0]?.id;

  const commandItems = [
    {
      id: "project-hub",
      label: "Open Project Hub",
      detail: "Load, create or open an architecture project",
      action: () => {
        sessionStorage.removeItem("aiw-project-entered");
        setShowProjectHub(true);
      },
    },
    {
      id: "cockpit",
      label: "Open Project Cockpit",
      detail: "Project readiness, risks and next actions",
      action: () => enterWorkspace("cockpit"),
    },
    {
      id: "design",
      label: "Open Design Lifecycle",
      detail: "Return to the active design stage",
      action: () => enterWorkspace("design"),
    },
    ...visibleWorkspaceEntries.map((entry) => ({
      id: entry.id,
      label: `Open ${workspaceLabel(t, entry.id)}`,
      detail: workspaceCaption(t, entry.id),
      action: () => enterWorkspace(entry.id),
    })),
    {
      id: "intent",
      label: "Edit Architecture Intent",
      detail: "Return to Design Brief Studio",
      action: () => enterStage("designIntent"),
    },
    {
      id: "snapshot",
      label: "Create Snapshot",
      detail: "Capture the current architecture baseline",
      action: () => createSnapshot(),
    },
    {
      id: "capability-map",
      label: "Open Capability Map",
      detail: "Find every visible, exposed and API-backed AIW capability",
      action: () => setCapabilityMapOpen(true),
    },
    {
      id: "decision-radar",
      label: "Open Decision Radar",
      detail: "Contextual patterns, evidence, questions and anti-pattern scan",
      action: () => setDecisionRadarOpen(true),
    },
    {
      id: "export",
      label: "Export Project",
      detail: "Download the governed project JSON",
      action: () => downloadProject(project, project.name),
    },
  ].filter((item) =>
    `${item.label} ${item.detail}`
      .toLowerCase()
      .includes(commandQuery.toLowerCase()),
  );

  return (
    <>
      <a className="skip-link" href="#aiw-main">
        {t("access.skip")}
      </a>
      {!isOnline ? (
        <div className="offline-banner" role="status" aria-live="polite">
          <CloudOff size={15} />
          <span>
            Offline deterministic mode: local modelling, validation, guidance
            and queued edits remain available. Connected AI, collaboration and
            server persistence will resume when the network returns.
          </span>
        </div>
      ) : null}
      <div className={`app-shell ${navPinned ? "nav-pinned" : ""} ${focusMode ? "focus-mode" : ""} ${isGuidedDelivery ? "guided-delivery-active" : ""}`}>
        <ShellNavRail
          navPinned={navPinned}
          setNavPinned={setNavPinned}
          activeRoleJourney={activeRoleJourney}
          showAllNavigation={showAllNavigation}
          setShowAllNavigation={setShowAllNavigation}
          setCapabilityMapOpen={setCapabilityMapOpen}
          scopedNavigationSections={scopedNavigationSections}
          isNavigationItemActive={isNavigationItemActive}
          navigateToItem={navigateToItem}
          setCommandOpen={setCommandOpen}
          resetDemo={resetDemo}
        />

        <main className="app-main" id="aiw-main" tabIndex={-1}>
          <ShellTopbar
            t={t}
            project={project}
            flowStep={flowStep}
            enterWorkspace={enterWorkspace}
            activeRoleJourney={activeRoleJourney}
            experienceProfileId={experienceProfileId}
            setExperienceProfile={handleExperienceProfileChange}
            setRoleJourneyOpen={setRoleJourneyOpen}
            setCapabilityMapOpen={setCapabilityMapOpen}
            setDecisionRadarOpen={setDecisionRadarOpen}
            openCoArchitect={openCoArchitect}
            workspaceMode={workspaceMode}
            workspaceLabel={workspaceLabel}
            screenPurpose={screenPurpose}
            setInspectorOpen={setInspectorOpen}
            inspectorOpen={inspectorOpen}
            setInfoCenterOpen={setInfoCenterOpen}
            infoCenterOpen={infoCenterOpen}
            setCommandOpen={setCommandOpen}
            setShowProjectHub={setShowProjectHub}
            undo={undo}
            redo={redo}
            undoStack={undoStack}
            redoStack={redoStack}
            saveProjectToServer={saveProjectToServer}
            persistenceStatus={persistenceStatus}
            serverPersistenceEnabled={serverPersistenceEnabled}
            setServerPersistence={setServerPersistence}
            createSnapshot={createSnapshot}
            downloadProject={downloadProject}
            inputRef={inputRef}
            importProject={importProject}
            visibleWorkspaceEntries={visibleWorkspaceEntries}
          />

          {!focusMode && !isGuidedDelivery ? <RoleJourneyCompass
            activeRoleJourney={activeRoleJourney}
            activeRoleStepId={activeRoleStepId}
            enterJourneyTarget={enterJourneyTarget}
            setRoleJourneyOpen={setRoleJourneyOpen}
            workspaceMode={workspaceMode}
            activeStageLabel={activeStageLabel}
            workspaceLabel={workspaceLabel}
            t={t}
            screenPurpose={screenPurpose}
            roleStageFastPathItems={roleStageFastPathItems}
            isNavigationItemActive={isNavigationItemActive}
            navigateToItem={navigateToItem}
          /> : null}

          {!isGuidedDelivery ? <div className="workspace-context-strip workspace-context-strip--quiet" aria-label="Workspace context">
            <span className="workspace-context-strip__label">
              <BookOpenCheck size={14} /> {workspaceLabel(t, workspaceMode)}
            </span>
            <RoleTrustStatus role={experienceProfileId} />
            <button type="button" onClick={() => setFocusMode((value) => !value)} title={focusMode ? "Restore the guided workspace" : "Hide guidance and focus on the current task"}>{focusMode ? <Minimize2 size={14}/> : <Focus size={14}/>} {focusMode ? "Guided view" : "Focus"}</button>
            <button type="button" onClick={() => setInfoCenterOpen(true)} title="Open detailed deterministic, knowledge-backed and LLM-assisted observations"><BrainCircuit size={14} /> Brain details</button>
          </div> : null}
          {taskLens && !focusMode ? <section className="task-lens-banner" aria-label="Active role task"><span>Active task</span><div><strong>{taskLens.title}</strong><small>{taskLens.caption}</small></div><button type="button" onClick={() => setTaskLens(null)}>Clear lens</button></section> : null}
          <div
            className={`workspace-layout ${inspectorOpen ? "with-inspector inspector-visible" : "inspector-hidden"}`}
          >
            <div
              className={`workspace-content product-archetype product-archetype--${archetype}`}
            >
              <WorkspaceErrorBoundary title={workspaceLabel(t, workspaceMode)}>
                {isGuidedDelivery ? (
                  <GuidedDeliveryShell
                    onOpenCoArchitect={openCoArchitect}
                    onOpenDecisionRadar={() => setDecisionRadarOpen(true)}
                    onOpenInfoCenter={() => setInfoCenterOpen(true)}
                  >
                    <section id="aiw-stage-workspace" className="stage-workspace-focus" tabIndex={-1} aria-label="Focused architecture workspace">
                      {mainContent}
                    </section>
                  </GuidedDeliveryShell>
                ) : (
                  <>
                    {!focusMode ? <PageObjectiveStrip workspaceMode={workspaceMode} activeStage={project.activeStage} roleId={experienceProfileId} /> : null}
                    <section id="aiw-stage-workspace" className="stage-workspace-focus" tabIndex={-1} aria-label="Focused architecture workspace">
                      {mainContent}
                    </section>
                    {!focusMode ? <RoleToolsTray
                      activeRoleJourney={activeRoleJourney}
                      showAllNavigation={showAllNavigation}
                      onOpenTool={openRoleTool}
                      isToolActive={isRoleToolActive}
                      onOpenRoleJourney={() => setRoleJourneyOpen(true)}
                      onOpenCapabilityMap={() => setCapabilityMapOpen(true)}
                    /> : null}
                  </>
                )}
              </WorkspaceErrorBoundary>
            </div>
            {inspectorOpen ? (
              <WorkspaceErrorBoundary title="Context details">
                <StudioInspector />
              </WorkspaceErrorBoundary>
            ) : null}
          </div>

          {!focusMode && !isGuidedDelivery ? <BottomDock
            workspaceMode={workspaceMode}
            activeStageLabel={activeStageLabel}
            workspaceLabel={workspaceLabel}
            t={t}
            currentWorkspaceCaption={currentWorkspaceCaption}
            activeRoleJourney={activeRoleJourney}
            contextual={contextual}
            openObligations={openObligations}
            knowledgeReleaseId={knowledgeReleaseId}
            openCoArchitect={openCoArchitect}
            setDecisionRadarOpen={setDecisionRadarOpen}
            setRoleJourneyOpen={setRoleJourneyOpen}
            setCapabilityMapOpen={setCapabilityMapOpen}
            setInspectorOpen={setInspectorOpen}
            inspectorOpen={inspectorOpen}
            setInfoCenterOpen={setInfoCenterOpen}
            infoCenterOpen={infoCenterOpen}
            enterStage={enterStage}
            nextStage={nextStage}
            lifecycleNextLabel={lifecycleNextLabel}
            advanceLifecycle={advanceLifecycle}
          /> : null}
        </main>

        <FirstRunTour workspaceMode={workspaceMode} activeRoleLabel={activeRoleJourney.label} />

        <Suspense fallback={null}>
          <InfoCenterPanel open={infoCenterOpen} onClose={() => setInfoCenterOpen(false)} onOpenCoArchitect={openCoArchitect} onOpenDecisionRadar={() => setDecisionRadarOpen(true)} />
        </Suspense>

        <Suspense fallback={null}>
          <ShellOverlays
          roleJourneyOpen={roleJourneyOpen}
          setRoleJourneyOpen={setRoleJourneyOpen}
          activeRoleJourney={activeRoleJourney}
          activeRoleStepId={activeRoleStepId}
          experienceProfileId={experienceProfileId}
          setExperienceProfile={handleExperienceProfileChange}
          enterJourneyTarget={enterJourneyTarget}
          roleJourneyCatalog={roleJourneyCatalog}
          capabilityMapOpen={capabilityMapOpen}
          setCapabilityMapOpen={setCapabilityMapOpen}
          openCapability={openCapability}
          decisionRadarOpen={decisionRadarOpen}
          setDecisionRadarOpen={setDecisionRadarOpen}
          commandOpen={commandOpen}
          setCommandOpen={setCommandOpen}
          commandQuery={commandQuery}
          setCommandQuery={setCommandQuery}
          commandItems={commandItems}
          />
        </Suspense>

        <CollaborationRuntime />
        <Suspense fallback={null}>
          <CoArchitectPanel />
        </Suspense>
        {notice ? (
          <div
            className="notice-toast"
            role="status"
            aria-live="polite"
            aria-label={t("access.notice")}
          >
            {notice}
          </div>
        ) : null}
      </div>
    </>
  );
}
