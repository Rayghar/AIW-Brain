import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  CloudOff,
  FileText,
  FolderKanban,
  GitBranch,
  Layers3,
  Loader2,
  LogIn,
  Plus,
  RefreshCw,
  Rocket,
  Server,
  Upload,
  UserRound,
} from "lucide-react";
import { sampleProject, type ArchitectureProject, type AuthenticatedPrincipal, type PortfolioEntry } from "@aiw/domain";
import {
  apiSession,
  clearApiSession,
  getJson,
  hasApiToken,
  postJson,
  setApiSession,
  type AuthSessionStatus,
} from "../lib/apiClient";
import { useWorkspaceStore } from "../store/workspaceStore";
import {
  currentLocale,
  formatLocalDate,
  supportedLocales,
  type SupportedLocale,
} from "../lib/locale";
import { useI18n } from "../lib/i18n";

interface ProjectHubProps {
  onEnter: () => void;
}

type StarterTemplateId =
  | "blank"
  | "microservice"
  | "event-driven"
  | "cloud-migration"
  | "review-existing"
  | "sdd-import"
  | "repo-import"
  | "reference";

type ApiProjectTemplate = StarterTemplateId;

interface StarterTemplate {
  id: StarterTemplateId;
  title: string;
  subtitle: string;
  description: string;
  template: ApiProjectTemplate;
  workspaceMode: "cockpit" | "design" | "activation" | "quality" | "knowledge" | "conformance" | "patterns";
  icon: "rocket" | "layers" | "git" | "file" | "upload" | "brain";
  questions: string[];
  output: string;
}


const RECOMMENDED_STARTER_IDS = new Set<StarterTemplateId>(["microservice", "event-driven", "reference", "blank"]);
const ADVANCED_STARTER_IDS = new Set<StarterTemplateId>(["cloud-migration", "review-existing", "sdd-import", "repo-import"]);

const AIW_STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "blank",
    title: "Blank architecture",
    subtitle: "Start lightweight",
    description: "Use when you want a clean model and a guided brief before AIW proposes architecture objects.",
    template: "blank",
    workspaceMode: "cockpit",
    icon: "rocket",
    questions: ["What problem are we solving?", "Who will approve the architecture?", "Which quality attributes matter first?"],
    output: "Empty governed project with guided first-step checklist.",
  },
  {
    id: "microservice",
    title: "Microservice / API platform",
    subtitle: "Service boundary starter",
    description: "Best for API, channel, platform and service decomposition work with clear ownership and contracts.",
    template: "microservice",
    workspaceMode: "design",
    icon: "layers",
    questions: ["What capabilities are being separated?", "What APIs are public/internal?", "What data ownership rules apply?"],
    output: "Brief seeded for service boundaries, API contracts, reliability and security obligations.",
  },
  {
    id: "event-driven",
    title: "Event-driven architecture",
    subtitle: "Messaging and integration",
    description: "Best for asynchronous workflows, integration modernization, event brokers, outbox and idempotency design.",
    template: "event-driven",
    workspaceMode: "patterns",
    icon: "git",
    questions: ["Which business events matter?", "What must be eventually consistent?", "How will failures and replays work?"],
    output: "Brief seeded for messaging, reliability, idempotency and observability review.",
  },
  {
    id: "cloud-migration",
    title: "Cloud / platform migration",
    subtitle: "Technology realization",
    description: "Best for landing-zone, resilience, deployment, environment and runtime platform decisions.",
    template: "cloud-migration",
    workspaceMode: "quality",
    icon: "layers",
    questions: ["Which workloads move first?", "What security/compliance controls are mandatory?", "What deployment posture is target?"],
    output: "Brief seeded for platform, availability, operations and conformance decisions.",
  },
  {
    id: "review-existing",
    title: "Review existing architecture",
    subtitle: "Audit and improve",
    description: "Best when you already have an SDD, diagrams, risks, decisions or a solution needing governance review.",
    template: "review-existing",
    workspaceMode: "activation",
    icon: "file",
    questions: ["What artifact is the source of truth?", "What decision is pending?", "What risk would block delivery?"],
    output: "Review-led project with readiness, risk, evidence and decision prompts.",
  },
  {
    id: "sdd-import",
    title: "Import SDD / requirements",
    subtitle: "Document-first path",
    description: "Prepare a project to ingest requirements, SDDs, notes or meeting packs into a governed architecture model.",
    template: "sdd-import",
    workspaceMode: "activation",
    icon: "upload",
    questions: ["Which document is authoritative?", "Which sections describe scope and constraints?", "What output is expected?"],
    output: "Import-ready project with evidence and extraction checklist.",
  },
  {
    id: "repo-import",
    title: "Import repository evidence",
    subtitle: "Code/repo path",
    description: "Prepare a project for read-only repository evidence, conformance checks and architecture-to-code validation.",
    template: "repo-import",
    workspaceMode: "conformance",
    icon: "git",
    questions: ["Which repo is authoritative?", "Which paths are allowed?", "What conformance rules should be checked?"],
    output: "Repo-evidence project with read-only connector and conformance checklist.",
  },
  {
    id: "reference",
    title: "Sample architecture",
    subtitle: "Explore complete studio",
    description: "Use a populated architecture example to learn the end-to-end design journey.",
    template: "reference",
    workspaceMode: "activation",
    icon: "brain",
    questions: ["Which workspace do you want to inspect?", "Which pattern/review flow matters?", "Which governance proof do you need?"],
    output: "Populated sample with lifecycle stages and SDD-ready artifacts.",
  },
];

function StarterIcon({ icon }: { icon: StarterTemplate["icon"] }) {
  if (icon === "layers") return <Layers3 size={18} />;
  if (icon === "git") return <GitBranch size={18} />;
  if (icon === "file") return <FileText size={18} />;
  if (icon === "upload") return <Upload size={18} />;
  if (icon === "brain") return <BrainCircuit size={18} />;
  return <Rocket size={18} />;
}

export function ProjectHub({ onEnter }: ProjectHubProps) {
  const { t, setLocale: setAppLocale } = useI18n();
  const hydrateProject = useWorkspaceStore((state) => state.hydrateProject);
  const setExperienceProfile = useWorkspaceStore((state) => state.setExperienceProfile);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage);
  const setActiveLifecycleStep = useWorkspaceStore((state) => state.setActiveLifecycleStep);
  const currentProject = useWorkspaceStore((state) => state.project);
  const [principal, setPrincipal] = useState<AuthenticatedPrincipal | null>(
    null,
  );
  const [accessStatus, setAccessStatus] = useState<"checking" | "development-token" | "development" | "enterprise" | "offline">("checking");
  const [accessMessage, setAccessMessage] = useState("Checking workspace sync…");
  const [storage, setStorage] = useState<{ provider: "memory"|"postgresql"|"mongodb-atlas"; durable: boolean; postgresConfigured: boolean } | null>(null);
  const [projects, setProjects] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [businessGoal, setBusinessGoal] = useState("");
  const [qualityFocus, setQualityFocus] = useState("Security, resilience, modifiability");
  const [constraints, setConstraints] = useState("");
  const [starterId, setStarterId] = useState<StarterTemplateId>("microservice");
  const [locale, setLocale] = useState<SupportedLocale>(() => currentLocale());

  const selectedStarter = useMemo(
    () => AIW_STARTER_TEMPLATES.find((starter) => starter.id === starterId) ?? AIW_STARTER_TEMPLATES[0]!,
    [starterId],
  );

  const createReadiness = useMemo(() => {
    const required = [
      { id: "name", label: "Project name", done: Boolean(name.trim()), hint: "Give this architecture a clear project name." },
      { id: "businessGoal", label: "Business goal", done: Boolean(businessGoal.trim()), hint: "State the outcome the architecture must enable." },
    ];
    const recommended = [
      { id: "qualityFocus", label: "Quality focus", done: Boolean(qualityFocus.trim()), hint: "Prioritize security, resilience, modifiability or other drivers." },
      { id: "constraints", label: "Known constraints", done: Boolean(constraints.trim()), hint: "Capture dependencies, policies, platforms or delivery constraints." },
    ];
    const missing = required.filter((item) => !item.done);
    return { required, recommended, missing, ready: missing.length === 0 };
  }, [name, businessGoal, qualityFocus, constraints]);

  const onboardingReady = createReadiness.ready;
  const createBlockedMessage = onboardingReady
    ? "Ready to create a guided architecture project."
    : `Add ${createReadiness.missing.map((item) => item.label.toLowerCase()).join(" and ")} to continue.`;

  const applyAccessStatus = (status: AuthSessionStatus) => {
    setPrincipal(status.principal as AuthenticatedPrincipal);
    const mode = status.accessMode === "development-token"
      ? "development-token"
      : status.accessMode === "development"
        ? "development"
        : "enterprise";
    setAccessStatus(mode);
    setAccessMessage(status.guidance);
  };

  const refreshSession = async () => {
    const status = await getJson<AuthSessionStatus>("/api/auth/session");
    applyAccessStatus(status);
    return status;
  };

  const refresh = async () => {
    setLoading(true);
    setError(null);
    let observedStorage = storage;
    try {
      await refreshSession();
      const storageStatus = await getJson<{ provider: "memory"|"postgresql"|"mongodb-atlas"; durable: boolean; postgresConfigured: boolean }>("/api/storage/status");
      setStorage(storageStatus);
      observedStorage = storageStatus;
      setProjects(await getJson<PortfolioEntry[]>("/api/projects"));
    } catch (cause) {
      setAccessStatus("offline");
      setAccessMessage(observedStorage?.durable ? "The configured durable project store is unavailable. AIW will not fall back to local project persistence." : "Cloud project sync is unavailable. Local development mode remains available because no durable store is configured.");
      setError(
        cause instanceof Error ? cause.message : "Project sync unavailable.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);
  const enterWorkbench = () => {
    setEntering(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => onEnter());
    });
  };

  const openFullReference = async () => {
    setLoading(true);
    setError(null);
    try {
      let project: ArchitectureProject;
      try {
        project = await getJson<ArchitectureProject>("/api/projects/demo");
        hydrateProject(project, true);
      } catch {
        if (storage?.durable || storage?.postgresConfigured) {
          throw new Error("The reference project is unavailable from the configured durable store. No local substitute was opened.");
        }
        project = structuredClone(sampleProject);
        hydrateProject(project, false);
      }
      setExperienceProfile("solution-architect");
      setActiveStage("designIntent");
      setWorkspaceMode("design");
      enterWorkbench();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sample architecture could not be opened.");
    } finally {
      setLoading(false);
    }
  };


  const signIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await postJson<{
        token: string;
        principal: AuthenticatedPrincipal;
      }>("/api/auth/development-token", {
        subject: "user-owner",
        email: "architect@example.com",
        displayName: "Architecture Owner",
        tenantId: "tenant-reference",
        ttlMinutes: 480,
      });
      setApiSession({
        token: result.token,
        tenantId: result.principal.tenantId,
        userId: result.principal.subject,
      });
      setPrincipal(result.principal);
      setAccessStatus("development-token");
      setAccessMessage("Workspace access enabled for this session.");
      setProjects(await getJson<PortfolioEntry[]>("/api/projects"));
    } catch (cause) {
      setAccessStatus("offline");
      setAccessMessage(storage?.durable ? "Workspace access could not be enabled. Durable project access remains fail-closed." : "Workspace access could not be enabled. Local development mode remains available.");
      setError(cause instanceof Error ? cause.message : "Access setup failed.");
    } finally {
      setLoading(false);
    }
  };

  const openProject = async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const project = await getJson<ArchitectureProject>(
        `/api/projects/${encodeURIComponent(projectId)}/branches/branch-main`,
      );
      hydrateProject(project, true);
      sessionStorage.removeItem("aiw.newProjectPending");
      setWorkspaceMode("cockpit");
      enterWorkbench();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Project could not be opened.",
      );
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (starter: StarterTemplate = selectedStarter) => {
    if (!onboardingReady) return;
    setLoading(true);
    setError(null);
    const guidedDescription = [
        description.trim(),
        `Starter: ${starter.title}.`,
        businessGoal.trim() ? `Goal: ${businessGoal.trim()}.` : "",
        qualityFocus.trim() ? `Quality focus: ${qualityFocus.trim()}.` : "",
        constraints.trim() ? `Constraints: ${constraints.trim()}.` : "",
        `Expected output: ${starter.output}`,
      ].filter(Boolean).join("\n");
    try {
      const project = await postJson<ArchitectureProject>("/api/projects", {
        name: name.trim(),
        description: guidedDescription,
        template: starter.template,
      });
      hydrateProject(project, true);
      setName("");
      setDescription("");
      setBusinessGoal("");
      setConstraints("");
      setShowCreate(false);
      if (starter.template === "reference") setExperienceProfile("solution-architect");
      sessionStorage.setItem("aiw.newProjectPending", "true");
      setActiveStage("designIntent");
      setActiveLifecycleStep("requirements");
      setWorkspaceMode("design");
      enterWorkbench();
    } catch (cause) {
      if (storage?.durable || storage?.postgresConfigured) {
        setError(cause instanceof Error ? cause.message : "Durable project creation failed.");
        return;
      }
      const localProject = structuredClone(sampleProject);
      localProject.id = `local-${Date.now()}`;
      localProject.name = name.trim();
      localProject.description = guidedDescription;
      localProject.context = {
        ...localProject.context,
        stakeholders: localProject.context?.stakeholders ?? [],
        existingSystems: constraints.trim() ? [constraints.trim()] : localProject.context?.existingSystems,
        workloadProfile: businessGoal.trim() || localProject.context?.workloadProfile,
        recoveryObjectives: qualityFocus.trim() || localProject.context?.recoveryObjectives,
      };
      hydrateProject(localProject, false);
      setName("");
      setDescription("");
      setBusinessGoal("");
      setConstraints("");
      setShowCreate(false);
      sessionStorage.setItem("aiw.newProjectPending", "true");
      setActiveStage("designIntent");
      setActiveLifecycleStep("requirements");
      setWorkspaceMode("design");
      setError(null);
      enterWorkbench();
    } finally {
      setLoading(false);
    }
  };

  const useLocal = () => {
    hydrateProject(currentProject, false);
    setWorkspaceMode("cockpit");
    enterWorkbench();
  };
  const session = apiSession();
  const tokenPresent = hasApiToken();

  return (
    <main className="project-hub-shell">
      {entering ? <div className="route-handoff-overlay"><Loader2 className="spin" size={24}/><strong>Opening visual architecture workbench…</strong><small>Hydrating model, workspace navigation and intelligence projections.</small></div> : null}
      <section className="project-hub-hero">
        <div className="project-hub-brand">
          <span>
            <BrainCircuit size={28} />
          </span>
          <div>
            <strong>AIW</strong>
            <small>{t("app.name")}</small>
          </div>
        </div>
        <div className="project-hub-copy">
          <span className="eyebrow">Architecture Intelligence Workbench</span>
          <h1>Start with intent.<br/>Design with evidence.<br/>Validate what gets built.</h1>
          <p>AIW is a governed architecture co-authoring environment for solution and enterprise architects—not a chatbot or drawing tool. Turn requirements into traceable models, decisions and an accepted project SDD.</p>
        </div>
        <div className="project-hub-security">
          <Server size={17} />
          <span>
            <strong>Evidence-governed lifecycle</strong>
            <small>Intent → requirements → journeys → architecture → assurance → SDD.</small>
          </span>
        </div>
        <div className="project-hub-reference-cta">
          <strong>Explore the governed workbench</strong>
          <p>Use a reference project to inspect candidate changes, traceability, reviewer governance and SDD assembly. This development release is not production accepted.</p>
          <button className="button button--primary" onClick={() => void openFullReference()} disabled={loading || entering}>
            {loading || entering ? <Loader2 className="spin" size={16} /> : <BrainCircuit size={16} />} Open sample architecture
          </button>
        </div>
      </section>

      <section className="project-hub-panel">
        <header>
          <div>
            <span className="eyebrow">{t("hub.projectHub")}</span>
            <h2>{t("hub.yourWork")}</h2>
          </div>
          <button
            className="icon-button"
            onClick={() => void refresh()}
            disabled={loading}
            title="Refresh projects"
          >
            <RefreshCw size={17} />
          </button>
        </header>
        <div className="hub-locale-row">
          <label>
            <span>{t("hub.language")}</span>
            <select
              value={locale}
              onChange={(event) => {
                const next = event.target.value as SupportedLocale;
                setLocale(next);
                setAppLocale(next);
              }}
            >
              {supportedLocales.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <small>{t("hub.localeNote")}</small>
        </div>
        <details className="hub-sync-details">
          <summary>
            <span>
              <Server size={16} />
              <strong>Enterprise access and persistence</strong>
            </span>
            <small>{principal ? "Connected" : accessStatus === "checking" ? "Checking" : "Local design mode"}</small>
          </summary>
          <div className="hub-session-row">
            <div>
              <UserRound size={17} />
              <span>
                <strong>{principal?.displayName ?? "Local architect"}</strong>
                <small>
                  {accessStatus === "checking"
                    ? "Checking access…"
                    : principal
                      ? `${principal.tenantId} · ${accessStatus.replace("-", " ")}`
                      : "Projects can be created and explored locally."}
                </small>
              </span>
            </div>
            {accessStatus !== "development-token" ? (
              <button
                className="button button--secondary"
                onClick={() => void signIn()}
                disabled={loading}
              >
                <LogIn size={15} /> Enable sync
              </button>
            ) : (
              <button
                className="text-button"
                onClick={() => {
                  clearApiSession();
                  setAccessStatus("development");
                  setAccessMessage("Workspace sync cleared. AIW will continue locally until sync is enabled again.");
                  setPrincipal(null);
                  void refresh();
                }}
              >
                {t("hub.signOut")}
              </button>
            )}
          </div>
          <div className={`hub-access-card hub-access-card--${accessStatus}`}>
            <div>
              <strong>{accessStatus === "development-token" ? "Workspace sync active" : accessStatus === "enterprise" ? "Enterprise identity active" : accessStatus === "checking" ? "Checking workspace sync" : "Local design mode"}</strong>
              <small>{error ? "Cloud project sync is unavailable. Your guided design workspace still works locally." : accessMessage} {tokenPresent ? "A browser token is present." : "No sync token is present."}</small>
            </div>
            <button className="text-button" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw size={14}/> Re-check
            </button>
          </div>
        </details>
        <div className="project-list">
          {loading && !projects.length ? (
            <div className="hub-loading">
              <Loader2 className="spin" size={22} /> Loading projects…
            </div>
          ) : (
            projects.map((project) => (
              <button
                key={project.id}
                className="project-card"
                onClick={() => void openProject(project.id)}
              >
                <FolderKanban size={20} />
                <span>
                  <strong>{project.name}</strong>
                  <small>
                    {project.description || "No project description yet."}
                  </small>
                  <em>
                    {project.status} · health {project.healthScore} · updated{" "}
                    {formatLocalDate(project.updatedAt, locale)}
                  </em>
                </span>
                <ArrowRight size={18} />
              </button>
            ))
          )}
          {!loading && !projects.length && !error ? (
            <div className="empty-card">{t("hub.noProjects")}</div>
          ) : null}
        </div>
        {showCreate ? (
          <div className="hub-create-form hub-create-form--guided">
            <div className="starter-guide-heading">
              <span className="eyebrow">Guided project start</span>
              <h3>Choose how AIW should begin this architecture</h3>
              <p>Pick a starter, capture the intent, preview what AIW will prepare, then enter the studio from the right workspace.</p>
            </div>
            <div className="starter-template-groups" aria-label="Architecture starter templates">
              <section className="starter-template-section starter-template-section--recommended">
                <div className="starter-template-section-heading">
                  <strong>Recommended starters</strong>
                  <small>Use these for the fastest path into the architecture studio.</small>
                </div>
                <div className="starter-template-grid starter-template-grid--recommended">
                  {AIW_STARTER_TEMPLATES.filter((starter) => RECOMMENDED_STARTER_IDS.has(starter.id)).map((starter) => (
                    <button
                      type="button"
                      key={starter.id}
                      className={`starter-template-card ${starter.id === starterId ? "is-selected" : ""}`}
                      onClick={() => setStarterId(starter.id)}
                    >
                      <span className="starter-template-icon"><StarterIcon icon={starter.icon} /></span>
                      <span>
                        <strong>{starter.title}</strong>
                        <small>{starter.subtitle}</small>
                        <em>{starter.description}</em>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              <details className="starter-template-section starter-template-section--advanced">
                <summary>
                  <span>Advanced imports and assessment starters</span>
                  <small>Cloud migration, existing architecture review, SDD import and repo evidence.</small>
                </summary>
                <div className="starter-template-grid starter-template-grid--advanced">
                  {AIW_STARTER_TEMPLATES.filter((starter) => ADVANCED_STARTER_IDS.has(starter.id)).map((starter) => (
                    <button
                      type="button"
                      key={starter.id}
                      className={`starter-template-card ${starter.id === starterId ? "is-selected" : ""}`}
                      onClick={() => setStarterId(starter.id)}
                    >
                      <span className="starter-template-icon"><StarterIcon icon={starter.icon} /></span>
                      <span>
                        <strong>{starter.title}</strong>
                        <small>{starter.subtitle}</small>
                        <em>{starter.description}</em>
                      </span>
                    </button>
                  ))}
                </div>
              </details>
            </div>
            <div className="starter-form-grid">
              <label>
                <span>{t("hub.projectName")}</span>
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Payments modernization"
                />
              </label>
              <label>
                <span>Business goal</span>
                <input
                  value={businessGoal}
                  onChange={(event) => setBusinessGoal(event.target.value)}
                  placeholder="Reduce settlement risk while improving channel speed"
                />
              </label>
              <label>
                <span>Quality focus</span>
                <input
                  value={qualityFocus}
                  onChange={(event) => setQualityFocus(event.target.value)}
                  placeholder="Security, resilience, observability"
                />
              </label>
              <label>
                <span>Known constraints</span>
                <input
                  value={constraints}
                  onChange={(event) => setConstraints(event.target.value)}
                  placeholder="Existing core banking dependency, regulatory audit trail"
                />
              </label>
            </div>
            <label>
              <span>{t("hub.problem")}</span>
              <textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("hub.problem.placeholder")}
              />
            </label>
            <section className="starter-preview-panel">
              <div>
                <span className="eyebrow">Preview before create</span>
                <h4>{selectedStarter.title}</h4>
                <p>{selectedStarter.output}</p>
              </div>
              <ul>
                {selectedStarter.questions.map((question) => <li key={question}><CheckCircle2 size={14} /> {question}</li>)}
              </ul>
            </section>
            <div className="starter-validation-panel" aria-live="polite">
              <div className="starter-validation-panel__message">
                <strong>{onboardingReady ? "Ready to enter the studio" : "Create project readiness"}</strong>
                <small>{createBlockedMessage}</small>
              </div>
              <div className="starter-validation-strip" id="create-project-readiness">
                {createReadiness.required.map((item) => (
                  <span key={item.id} className={item.done ? "is-done" : "is-missing"} title={item.hint}>
                    {item.done ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />} {item.label}
                  </span>
                ))}
                {createReadiness.recommended.map((item) => (
                  <span key={item.id} className={item.done ? "is-done" : "is-recommended"} title={item.hint}>
                    {item.done ? <CheckCircle2 size={13} /> : <FileText size={13} />} {item.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="starter-form-actions">
              <button
                className="text-button"
                onClick={() => setShowCreate(false)}
              >
                {t("hub.cancel")}
              </button>
              <button
                className="button button--primary"
                onClick={() => void createProject(selectedStarter)}
                disabled={loading || !onboardingReady}
                aria-describedby="create-project-readiness"
                title={createBlockedMessage}
              >
                {loading ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <Plus size={16} />
                )} {" "}
                Create guided project
              </button>
            </div>
          </div>
        ) : (
          <div className="hub-actions">
            <button
              className="button button--primary"
              onClick={() => setShowCreate(true)}
              disabled={Boolean(storage?.durable && accessStatus === "offline")}
            >
              <Plus size={16} /> New guided architecture project
            </button>
            <button className="button button--secondary" onClick={useLocal}>
              <CloudOff size={16} /> Continue locally
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
