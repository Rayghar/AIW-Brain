import { useEffect, useState } from "react";
import {
  Boxes,
  BrainCircuit,
  Camera,
  ClipboardList,
  Cloud,
  CloudOff,
  Compass,
  Download,
  FolderKanban,
  Info,
  LibraryBig,
  Map,
  Radar,
  Redo2,
  ServerCog,
  ShieldCheck,
  SlidersHorizontal,
  Undo2,
  Upload,
  UserCog,
  WandSparkles,
} from "lucide-react";
import { experienceProfiles } from "../lib/experienceProfiles";

export function ShellTopbar(props: any) {
  const {
    t,
    project,
    flowStep,
    enterWorkspace,
    activeRoleJourney,
    experienceProfileId,
    setExperienceProfile,
    setRoleJourneyOpen,
    setCapabilityMapOpen,
    setDecisionRadarOpen,
    openCoArchitect,
    workspaceMode,
    workspaceLabel,
    screenPurpose,
    setInspectorOpen,
    inspectorOpen,
    setInfoCenterOpen,
    infoCenterOpen,
    setCommandOpen,
    setShowProjectHub,
    undo,
    redo,
    undoStack,
    redoStack,
    saveProjectToServer,
    persistenceStatus,
    serverPersistenceEnabled,
    setServerPersistence,
    createSnapshot,
    downloadProject,
    inputRef,
    importProject,
    visibleWorkspaceEntries,
  } = props;

  const currentWorkspaceLabel = workspaceLabel(t, workspaceMode);
  const [workModeCoachmarkOpen, setWorkModeCoachmarkOpen] = useState(() => localStorage.getItem("aiw.firstRunTour.v10_48_10.dismissed") === "true" && localStorage.getItem("aiw.workModeCoachmark.dismissed") !== "true");
  const dismissWorkModeCoachmark = () => {
    localStorage.setItem("aiw.workModeCoachmark.dismissed", "true");
    setWorkModeCoachmarkOpen(false);
  };
  const showWorkModeCoachmark = () => setWorkModeCoachmarkOpen(true);

  useEffect(() => {
    const handler = () => showWorkModeCoachmark();
    window.addEventListener("aiw:show-work-mode-coachmark", handler);
    return () => window.removeEventListener("aiw:show-work-mode-coachmark", handler);
  }, []);

  return (
    <header className="topbar aiw-command-header topbar--grouped-actions">
      <div className="topbar-project-card">
        <span className="eyebrow">{t("top.activeProject")}</span>
        <strong>{project.name}</strong>
        <small>{project.branch.name} · Revision {project.revision}</small>
      </div>

      <nav className="topbar-flow-menu" data-aiw-tour="work-modes" aria-label="AIW work mode switcher">
        <span className="sr-only">Work modes</span>
        <button className={flowStep === "orient" ? "active" : ""} onClick={() => enterWorkspace("cockpit")} title="Orient: project status, portfolio context and where to continue.">
          <BrainCircuit size={15} />
          <span><strong>Orient</strong><small>Cockpit & portfolio</small></span>
        </button>
        <button className={flowStep === "design" ? "active" : ""} onClick={() => enterWorkspace("design")} title="Design: author the architecture from brief through SDD.">
          <WandSparkles size={15} />
          <span><strong>Design</strong><small>Brief to topology</small></span>
        </button>
        <button className={flowStep === "assure" ? "active" : ""} onClick={() => enterWorkspace("conformance")} title="Assure: review governance, evidence, conformance and runtime posture.">
          <ShieldCheck size={15} />
          <span><strong>Assure</strong><small>Evidence & review</small></span>
        </button>
        <button className={flowStep === "operate" ? "active" : ""} onClick={() => enterWorkspace("admin")} title="Operate: administer AIW brain, routes, repositories, workers and tenant controls.">
          <ServerCog size={15} />
          <span><strong>Operate</strong><small>Brain & admin</small></span>
        </button>
      </nav>

      {workModeCoachmarkOpen ? (
        <aside className="work-mode-coachmark" role="note" aria-label="Work mode explanation">
          <div>
            <strong>Work modes organize intent, not permissions.</strong>
            <p><b>Orient</b> finds the right starting point, <b>Design</b> authors the architecture, <b>Assure</b> validates evidence and risk, and <b>Operate</b> runs the AIW control plane.</p>
            <small>Roles decide which tools are emphasized. Lifecycle stages decide what architecture work is being completed.</small>
          </div>
          <button type="button" onClick={dismissWorkModeCoachmark}>Got it</button>
        </aside>
      ) : null}

      <div className="topbar-actions-compact topbar-actions-compact--menus">
        <label className="experience-select role-journey-select" title={activeRoleJourney.mission}>
          <span>Role journey</span>
          <select value={experienceProfileId} onChange={(event) => setExperienceProfile(event.target.value)}>
            {experienceProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.label}</option>
            ))}
          </select>
        </label>

        <details className="action-menu topbar-menu topbar-menu--journey">
          <summary><Compass size={14} /><span className="action-label">Journey</span></summary>
          <div className="action-menu__panel topbar-menu__panel topbar-menu__panel--compact">
            <div className="action-menu__section">
              <strong>Role and capability map</strong>
              <button onClick={() => setRoleJourneyOpen(true)} title="Open the role and customer journey map"><UserCog size={14} /> Role journey map</button>
              <button onClick={() => setCapabilityMapOpen(true)} title="Open the AIW capability map"><Map size={14} /> Capability map</button>
              <button onClick={() => setCommandOpen(true)} title="Open command search"><SlidersHorizontal size={14} /> Command search</button>
              <button onClick={showWorkModeCoachmark} title="Explain Orient, Design, Assure and Operate"><Info size={14} /> Explain work modes</button>
              <button onClick={() => window.dispatchEvent(new Event("aiw:start-first-run-tour"))} title="Restart the first-run guided tour"><Compass size={14} /> Guided tour</button>
            </div>
            <div className="action-menu__section action-menu__section--grid">
              <strong>Current role</strong>
              <p className="topbar-menu__help"><b>{activeRoleJourney.label}</b><br />{activeRoleJourney.mission}</p>
            </div>
          </div>
        </details>

        <details className="action-menu topbar-menu topbar-menu--brain" data-aiw-tour="brain-menu">
          <summary><BrainCircuit size={14} /><span className="action-label">Brain</span></summary>
          <div className="action-menu__panel topbar-menu__panel topbar-menu__panel--compact">
            <div className="action-menu__section">
              <strong>AIW intelligence</strong>
              <button className="topbar-ai-action" title="Ask AIW to co-author this step" onClick={() => openCoArchitect(`${activeRoleJourney.coAuthorPrompt} Current workspace: ${currentWorkspaceLabel}. Purpose: ${screenPurpose}`)}>
                <BrainCircuit size={14} /> Ask AIW
              </button>
              <button onClick={() => setDecisionRadarOpen(true)} title="Open contextual Decision Radar"><Radar size={14} /> Decision Radar</button>
              <button onClick={() => setInfoCenterOpen((value: boolean) => !value)} className={infoCenterOpen ? "active" : ""} title="Open AIW information center"><Info size={14} /> {infoCenterOpen ? "Hide Info Center" : "Info Center"}</button>
              <button onClick={() => setInspectorOpen((value: boolean) => !value)} className={inspectorOpen ? "active" : ""} title="Show or hide technical details"><ClipboardList size={14} /> {inspectorOpen ? "Hide Details" : "Details"}</button>
            </div>
          </div>
        </details>

        <details className="action-menu topbar-menu topbar-menu--project">
          <summary><FolderKanban size={14} /><span className="action-label">Project</span></summary>
          <div className="action-menu__panel topbar-menu__panel">
            <div className="action-menu__section">
              <strong>Project actions</strong>
              <button onClick={() => { sessionStorage.removeItem("aiw-project-entered"); setShowProjectHub(true); }} title="Open the project hub"><FolderKanban size={14} /> {t("top.projects")}</button>
              <button onClick={undo} disabled={!undoStack.length} title="Undo the last architecture change"><Undo2 size={14} /> {t("top.undo")}</button>
              <button onClick={redo} disabled={!redoStack.length} title="Redo the last undone change"><Redo2 size={14} /> {t("top.redo")}</button>
              <button onClick={() => void saveProjectToServer()} title="Save to the governed project repository">
                {persistenceStatus === "saved" || persistenceStatus === "saving" ? <Cloud size={14} /> : <CloudOff size={14} />} {persistenceStatus}
              </button>
              <button onClick={() => setServerPersistence(!serverPersistenceEnabled)} title="Toggle local-safe versus server-backed persistence">
                {serverPersistenceEnabled ? <Cloud size={14} /> : <CloudOff size={14} />} {serverPersistenceEnabled ? "Server-backed" : "Local-safe"}
              </button>
              <button onClick={() => createSnapshot()} title="Create a local immutable snapshot"><Camera size={14} /> {t("top.snapshot")}</button>
              <button onClick={() => downloadProject(project, project.name)} title="Export validated project JSON"><Download size={14} /> {t("top.export")}</button>
              <button onClick={() => inputRef.current?.click()} title="Import an AIW project JSON"><Upload size={14} /> {t("top.import")}</button>
            </div>
            <div className="action-menu__section action-menu__section--grid">
              <strong>Workspace launchpad</strong>
              <button onClick={() => enterWorkspace("cockpit")} className={workspaceMode === "cockpit" ? "active" : ""}><BrainCircuit size={14} /> Project Cockpit</button>
              <button onClick={() => enterWorkspace("design")} className={workspaceMode === "design" ? "active" : ""}><Boxes size={14} /> Design Lifecycle</button>
              {visibleWorkspaceEntries.map((entry: any) => {
                const Icon = entry.icon;
                return (
                  <button key={entry.id} onClick={() => enterWorkspace(entry.id)} className={workspaceMode === entry.id ? "active" : ""}>
                    <Icon size={14} /> {workspaceLabel(t, entry.id)}
                  </button>
                );
              })}
            </div>
          </div>
        </details>

        <button className="command-palette-button" onClick={() => setCommandOpen(true)} title="Open command palette (Command K on macOS, Control Shift K on Windows and Linux, or slash)" aria-keyshortcuts="Meta+K Control+Shift+K /">Command</button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const result = importProject(await file.text());
            if (!result.success) window.alert(result.error);
            event.target.value = "";
          }}
        />
      </div>
    </header>
  );
}
