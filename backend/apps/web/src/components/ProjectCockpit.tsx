import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  GitBranch,
  Layers3,
  Network,
  Radar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ArchitectureStage } from "@aiw/domain";
import { sampleEnterpriseCatalog, samplePortfolioProjects } from "@aiw/domain";
import { buildPortfolioIntelligence } from "@aiw/engine";
import { useMemo } from "react";
import { useWorkspaceStore } from "../store/workspaceStore";

type CockpitJourneyStepId = "requirements" | "quality" | "logical" | "realization" | "logicalTechnology" | "physicalTechnology" | "review" | "sdd";

const cockpitJourney: Array<{ id: CockpitJourneyStepId; label: string; caption: string; stage?: ArchitectureStage; workspace?: "design" | "quality" }> = [
  { id: "requirements", label: "Requirements & Intent", caption: "Problem, scope and constraints", stage: "designIntent", workspace: "design" },
  { id: "quality", label: "Quality Drivers", caption: "Scenarios and trade-offs", workspace: "quality" },
  { id: "logical", label: "Logical Application", caption: "Domains, services and data", stage: "logicalApplication", workspace: "design" },
  { id: "realization", label: "Application Realization", caption: "Deployable units and APIs", stage: "applicationRealization", workspace: "design" },
  { id: "logicalTechnology", label: "Logical Technology", caption: "Platform capabilities", stage: "logicalTechnology", workspace: "design" },
  { id: "physicalTechnology", label: "Physical Technology", caption: "Deployment and runtime", stage: "physicalTechnology", workspace: "design" },
  { id: "review", label: "Review & Assurance", caption: "Findings, ADRs and gates", stage: "validationRealization", workspace: "design" },
  { id: "sdd", label: "SDD Pack", caption: "Final delivery artifacts", stage: "validationRealization", workspace: "design" },
];

function stageReadiness(project: ReturnType<typeof useWorkspaceStore.getState>["project"], stage: ArchitectureStage) {
  const approval = project.stageApprovals.find((item) => item.stage === stage);
  const stageNodes = project.nodes.filter((node) => node.stage === stage).length;
  const stageNodeIds = new Set(project.nodes.filter((node) => node.stage === stage).map((node) => node.id));
  const stageDecisions = stage === "validationRealization"
    ? project.decisions.length
    : project.decisions.filter((decision) => Boolean(decision.scopeNodeId && stageNodeIds.has(decision.scopeNodeId))).length;
  if (approval?.status === "approved") return { score: 100, status: "Approved", tone: "good" as const };
  if (approval?.status === "pending") return { score: Math.max(60, stageNodes * 12 + stageDecisions * 10), status: "Review pending", tone: "warn" as const };
  if (stage === "designIntent") {
    const score = Math.min(95, project.objectives.length * 18 + project.constraints.length * 18 + project.qualityPriorities.length * 8 + (project.description ? 16 : 0));
    return { score, status: score >= 75 ? "Ready" : "Needs brief", tone: score >= 75 ? "good" as const : "warn" as const };
  }
  const score = Math.min(90, stageNodes * 18 + stageDecisions * 12);
  return { score, status: score >= 70 ? "Modelled" : stageNodes ? "In progress" : "Not started", tone: score >= 70 ? "good" as const : score ? "warn" as const : "muted" as const };
}


export function ProjectCockpit() {
  const project = useWorkspaceStore((state) => state.project);
  const contextual = useWorkspaceStore((state) => state.contextual);
  const findings = useWorkspaceStore((state) => state.findings);
  const snapshots = useWorkspaceStore((state) => state.snapshots);
  const lifecycleCompletions = useWorkspaceStore((state) => state.lifecycleCompletions);
  const lifecycleArtifacts = useWorkspaceStore((state) => state.lifecycleArtifacts);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage);
  const createSnapshot = useWorkspaceStore((state) => state.createSnapshot);

  const projects = useMemo(() => samplePortfolioProjects.map((candidate) => candidate.id === project.id ? project : candidate), [project]);
  const portfolio = useMemo(() => buildPortfolioIntelligence(projects, sampleEnterpriseCatalog), [projects]);
  const openFindings = findings.length;
  const openObligations = contextual.obligations.filter((item) => !item.satisfied).length;
  const activeReadiness = stageReadiness(project, project.activeStage);
  const latestSnapshot = snapshots[0];
  const completionPrefix = `${project.id}:${project.branch.id}:`;
  const lifecycleArtifactsForProject = lifecycleArtifacts.filter((artifact) => artifact.projectId === project.id && artifact.branchId === project.branch.id);
  const readinessForStep = (step: (typeof cockpitJourney)[number]) => {
    const completion = lifecycleCompletions[`${completionPrefix}${step.id}`];
    if (completion?.status === "completed") return { score: 100, status: "Handoff done", tone: "good" as const };
    if (step.id === "quality") {
      const high = project.qualityPriorities.filter((priority) => priority.weight >= 3).length;
      const score = Math.min(95, high * 18 + project.qualityScenarios.length * 24);
      return { score, status: score >= 70 ? "Ready" : high ? "In progress" : "Needs drivers", tone: score >= 70 ? "good" as const : score ? "warn" as const : "muted" as const };
    }
    if (step.id === "sdd") {
      const score = Math.min(95, lifecycleArtifactsForProject.filter((artifact) => artifact.stepId === "sdd" || artifact.type === "sdd-pack").length * 45 + (project.stageApprovals.some((approval) => approval.stage === "validationRealization") ? 35 : 0));
      return { score, status: score >= 70 ? "Pack ready" : "Not generated", tone: score >= 70 ? "good" as const : "muted" as const };
    }
    return stageReadiness(project, step.stage ?? "designIntent");
  };
  const goToStep = (step: (typeof cockpitJourney)[number]) => {
    if (step.workspace === "quality") { setWorkspaceMode("quality"); return; }
    setWorkspaceMode("design");
    setActiveStage(step.stage ?? "designIntent");
  };
  const nextStep = cockpitJourney.find((step) => readinessForStep(step).score < 70) ?? cockpitJourney[cockpitJourney.length - 1]!;

  return (
    <section className="studio-page project-cockpit project-cockpit--product" aria-label="Project cockpit">
      <header className="studio-hero cockpit-hero cockpit-hero--focused">
        <div>
          <span className="eyebrow">Project cockpit</span>
          <h1>Continue where you left off</h1>
          <p>The cockpit is the current project command center: see readiness, attention items, design insights, and the next governed move toward the SDD pack.</p>
        </div>
        <div className="studio-hero__actions">
          <button className="button button--primary" onClick={() => goToStep(nextStep)}>
            Continue: {nextStep.label} <ArrowRight size={15} />
          </button>
          <button className="button button--secondary" onClick={() => createSnapshot("Cockpit checkpoint", "draft")}>Capture checkpoint</button>
        </div>
      </header>

      <section className="cockpit-metric-grid cockpit-metric-grid--clean" aria-label="Architecture summary">
        <article title="Readiness of the currently active lifecycle stage."><BrainCircuit size={20}/><span>Current stage</span><strong>{activeReadiness.score}%</strong><small>{activeReadiness.status}</small></article>
        <article title="The next lifecycle action based on incomplete readiness."><ArrowRight size={20}/><span>Next move</span><strong>{nextStep.label}</strong><small>{nextStep.caption}</small></article>
        <article title="Project model size across lifecycle stages."><Network size={20}/><span>Model</span><strong>{project.nodes.length}</strong><small>{project.edges.length} relationships</small></article>
        <article title="Findings requiring review."><AlertTriangle size={20}/><span>Attention</span><strong>{openFindings}</strong><small>{openObligations} obligations</small></article>
      </section>

      <div className="cockpit-workbench-grid cockpit-workbench-grid--command">
        <section className="studio-card cockpit-current-project-card">
          <div className="studio-card__heading">
            <div><span className="eyebrow"><FolderKanban size={13}/> Current project</span><h2>{project.name}</h2></div>
            <button className="button button--ghost" onClick={() => setWorkspaceMode("design")}>Open lifecycle</button>
          </div>
          <p className="studio-muted">{project.description || "No project description captured yet. Start with Requirements & Intent to strengthen the design brief."}</p>
          <div className="cockpit-delivery-row cockpit-delivery-row--clean">
            <span><GitBranch size={16}/> {project.branch.name}</span>
            <span><BadgeCheck size={16}/> Revision {project.revision}</span>
            <span><BookOpenCheck size={16}/> {latestSnapshot ? latestSnapshot.label : "No checkpoint yet"}</span>
            <span><ClipboardList size={16}/> {lifecycleArtifactsForProject.length} tracked artifact(s)</span>
          </div>
          <div className="cockpit-primary-path">
            <button className="button button--primary" onClick={() => goToStep(nextStep)}>Continue design journey</button>
            <button className="button button--secondary" onClick={() => setWorkspaceMode("portfolio")}>View all projects</button>
          </div>
        </section>

        <section className="studio-card cockpit-lifecycle-card">
          <div className="studio-card__heading">
            <div><span className="eyebrow"><Layers3 size={13}/> Design lifecycle</span><h2>Stage progress</h2></div>
            <button className="button button--ghost" onClick={() => goToStep(nextStep)}>Open next stage</button>
          </div>
          <div className="stage-readiness-list stage-readiness-list--compact">
            {cockpitJourney.map((stage) => {
              const readiness = readinessForStep(stage);
              const active = (stage.workspace === "quality" && project.activeStage === "designIntent") || (stage.stage ? project.activeStage === stage.stage : false);
              const done = readiness.score >= 70;
              return (
                <button key={stage.id} className={active ? "active" : ""} onClick={() => goToStep(stage)} title={stage.caption}>
                  <span className={`stage-readiness-score is-${readiness.tone}`}>{done ? <CheckCircle2 size={14}/> : readiness.score}</span>
                  <span><strong>{stage.label}</strong><small>{stage.caption}</small></span>
                  <em>{readiness.status}</em>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <section className="cockpit-workbench-grid cockpit-workbench-grid--lower cockpit-workbench-grid--insights">
        <article className="studio-card cockpit-insight-card">
          <span className="eyebrow"><Radar size={13}/> Design insights</span>
          <h2>{contextual.headline}</h2>
          <div className="cockpit-chip-row cockpit-chip-row--clean">
            {contextual.patterns.slice(0, 5).map((pattern) => <button key={pattern.patternId} onClick={() => setWorkspaceMode("patterns")}>{pattern.patternName}<b>{pattern.score}%</b></button>)}
            {!contextual.patterns.length ? <span>No pattern signal yet. Complete requirements and quality drivers.</span> : null}
          </div>
        </article>
        <article className="studio-card cockpit-projects-card cockpit-projects-card--secondary">
          <div className="studio-card__heading">
            <div><span className="eyebrow"><ShieldCheck size={13}/> All projects</span><h2>{portfolio.summary.projects} projects · {portfolio.summary.highRiskProjects} high-risk</h2></div>
            <button className="button button--ghost" onClick={() => setWorkspaceMode("portfolio")}>Portfolio view</button>
          </div>
          <div className="cockpit-project-list cockpit-project-list--secondary">
            {projects.slice(0, 4).map((item) => {
              const readiness = item.id === project.id ? activeReadiness.score : Math.min(95, Math.max(35, item.nodes.length * 5));
              const active = item.id === project.id;
              return (
                <button key={item.id} className={active ? "is-active" : ""} onClick={() => active ? setWorkspaceMode("design") : setWorkspaceMode("portfolio")}>
                  <FolderKanban size={17}/>
                  <span><strong>{item.name}</strong><small>{item.description || "No description captured yet."}</small></span>
                  <b>{readiness}%</b>
                </button>
              );
            })}
          </div>
        </article>
      </section>
    </section>
  );
}
