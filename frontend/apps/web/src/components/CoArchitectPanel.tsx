import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUp,
  BrainCircuit,
  CircleOff,
  Compass,
  History,
  Loader2,
  MessageSquareText,
  Sparkles,
  X,
} from "lucide-react";
import type {
  ArchitectureBrainContextReceipt,
  ArchitectureBrainLineagePath,
  ArchitectureBrainProposalReceipt,
  ArchitectureBrainReasoningReceipt,
  ArchitectureProject,
  ArchitectureStage,
  SolResponseQualityReceipt,
} from "@aiw/domain";
import { useWorkspaceStore } from "../store/workspaceStore";
import { postJson } from "../lib/apiClient";
import { currentDeliveryStageId, deliveryStages } from "../lib/guidedDelivery";
import { RecommendationOutcomeCapture } from "./RecommendationOutcomeCapture";

interface Answer {
  answer: string;
  observations: string[];
  recommendation: string;
  tradeOffs: string[];
  clarifyingQuestions: string[];
  confidence: "high" | "medium" | "low";
  contextSummary: {
    lifecycleStage: string;
    architectureStage: ArchitectureStage;
    scopeLabel: string;
    requirementCount: number;
    qualityScenarioCount: number;
    journeyCount: number;
    stageObjectCount: number;
    interfaceCount: number;
    openQuestionCount: number;
    findingCount: number;
  };
  citedRecordIds: string[];
  suggestedNextActions: Array<{
    title: string;
    rationale: string;
    target: string;
    citedRecordIds: string[];
  }>;
  modelTrace?: {
    providerId: string;
    model: string;
    routeId: string;
    fallbackUsed: boolean;
    requestFingerprint: string;
    latencyMs?: number;
    qualityGateRejected?: boolean;
    rejectedCandidateScore?: number;
    fallbackReason?: string;
  };
  contextReceipt: ArchitectureBrainContextReceipt;
  reasoningReceipt: ArchitectureBrainReasoningReceipt;
  qualityReceipt: SolResponseQualityReceipt;
  lineagePaths: ArchitectureBrainLineagePath[];
  mode: "llm-assisted" | "deterministic-fallback";
  brainReceipt: ArchitectureBrainProposalReceipt;
}

function promptsForStage(stageId: string, hasSelection: boolean) {
  const common = hasSelection
    ? ["What is missing from this selected scope?", "What requirement or quality driver justifies this element?"]
    : ["What is the most important next design decision?", "What evidence is missing before I progress?"];
  const stagePrompts: Record<string, string[]> = {
    requirements: ["Which requirement is most ambiguous or architecturally significant?", "Which stakeholder concern is not represented?"],
    quality: ["Which quality scenario needs a measurable response target?", "What trade-off will most constrain the architecture?"],
    context: ["Which actor, external system or interaction is missing from the boundary?", "Which journey is not represented in the System Context?"],
    logical: ["Which responsibility should be decomposed next?", "Where is coupling or ownership unclear?"],
    realization: ["Which interface or state responsibility is missing?", "Which component boundary creates the greatest delivery risk?"],
    logicalTechnology: ["Which provider-neutral capability is still unsupported?", "What resilience or security capability is missing?"],
    physicalTechnology: ["Which failure domain or deployment obligation is missing?", "What topology decision blocks production readiness?"],
    review: ["What is the highest-priority approval blocker?", "Which finding has the largest downstream impact?"],
    sdd: ["Which SDD section is weakest or stale?", "What evidence is missing from the delivery pack?"],
  };
  return [...(stagePrompts[stageId] ?? []), ...common].slice(0, 4);
}

const stages: ArchitectureStage[] = [
  "designIntent",
  "logicalApplication",
  "applicationRealization",
  "logicalTechnology",
  "physicalTechnology",
  "validationRealization",
];

type BrainView = "guidance" | "history";

interface CoArchitectPanelProps {
  /** Render the Architecture Brain as content inside another governed surface. */
  embedded?: boolean;
  /** Called when the host drawer asks the embedded panel to close. */
  onClose?: () => void;
  /** Optional prompt supplied by the host stage. */
  initialPrompt?: string;
}


export function CoArchitectPanel({ embedded = false, onClose, initialPrompt = "" }: CoArchitectPanelProps = {}) {
  const project = useWorkspaceStore((state) => state.project);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const recordExchange = useWorkspaceStore((state) => state.recordCoArchitectExchange);
  const hydrateProject = useWorkspaceStore((state) => state.hydrateProject);
  const serverPersistenceEnabled = useWorkspaceStore((state) => state.serverPersistenceEnabled);
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const workspaceMode = useWorkspaceStore((state) => state.workspaceMode);
  const activeLifecycleStep = useWorkspaceStore((state) => state.activeLifecycleStep);
  const lifecycleArtifacts = useWorkspaceStore((state) => state.lifecycleArtifacts);
  const [open, setOpen] = useState(embedded);
  const [view, setView] = useState<BrainView>("guidance");
  const [question, setQuestion] = useState(initialPrompt);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graphBusy, setGraphBusy] = useState(false);
  const [graphNotice, setGraphNotice] = useState<string | null>(null);

  const deliveryStageId = currentDeliveryStageId(workspaceMode, project.activeStage, activeLifecycleStep);
  const deliveryStage = deliveryStages.find((item) => item.id === deliveryStageId) ?? deliveryStages[0]!;
  const effectiveArchitectureStage = deliveryStage.architectureStage ?? project.activeStage;
  const scopeLabel = selectedNodeId ? (project.nodes.find((node) => node.id === selectedNodeId)?.label ?? selectedNodeId) : "Whole stage";

  const session = useMemo(
    () => project.coArchitectSessions.find((item) => item.stage === effectiveArchitectureStage && item.scopeNodeId === (selectedNodeId ?? undefined)),
    [project.coArchitectSessions, effectiveArchitectureStage, selectedNodeId],
  );

  const suggestedPrompts = useMemo(() => promptsForStage(deliveryStageId, Boolean(selectedNodeId)), [deliveryStageId, selectedNodeId]);

  const stageSnapshot = useMemo(() => {
    const stageNodes = project.nodes.filter((node) => node.stage === effectiveArchitectureStage && node.status !== 'deprecated');
    const stageEdges = project.edges.filter((edge) => edge.stage === effectiveArchitectureStage);
    const stageInterfaces = (project.interfaces ?? []).filter((item) => item.stage === effectiveArchitectureStage);
    if (deliveryStageId === 'requirements') {
      return {
        headline: project.objectives.length && project.qualityScenarios.length
          ? 'The design intent is grounded enough to guide downstream modelling.'
          : 'The design intent still has gaps that should be resolved before deeper modelling.',
        metrics: [
          ['Objectives', project.objectives.length],
          ['Quality scenarios', project.qualityScenarios.length],
          ['Constraints', project.constraints.length],
          ['Stakeholders', project.context.stakeholders?.length ?? 0],
        ] as Array<[string, number]>,
        guidance: project.objectives.length
          ? 'Use Sol Draft to propose missing structured fields, or Sol Ask to challenge ambiguity and unsupported assumptions.'
          : 'Start by defining the measurable business outcome. Sol can draft candidates, but the architect must approve them.',
      };
    }
    if (deliveryStageId === 'quality') {
      const acceptedDrivers = project.qualityScenarios;
      return {
        headline: acceptedDrivers.length ? 'Quality drivers are available to constrain architecture choices.' : 'Measurable quality scenarios are still required before style and pattern ranking is authoritative.',
        metrics: [
          ['Quality scenarios', acceptedDrivers.length],
          ['Driver weights', project.qualityPriorities.filter((value) => value.weight > 0).length],
          ['Constraints', project.constraints.length],
          ['Open findings', project.findings.length],
        ] as Array<[string, number]>,
        guidance: acceptedDrivers.length ? 'Ask Sol to expose trade-offs, missing response measures or tactics that must be carried into design.' : 'Use Sol Draft to propose scenarios, then confirm the response measures before accepting downstream recommendations.',
      };
    }
    if (deliveryStageId === 'context') {
      const intelligence = project.requirementsIntelligence;
      const contextNodes = project.nodes.filter((node) => node.tags.includes('system-context') && node.status !== 'deprecated');
      return {
        headline: contextNodes.length ? 'The accepted System Context can now be challenged for boundary, participant and interaction completeness.' : 'The Journey Atlas has not yet been promoted into a canonical System Context.',
        metrics: [
          ['Context participants', contextNodes.length],
          ['Accepted journeys', intelligence?.journeys.filter((item) => item.status === 'accepted').length ?? 0],
          ['Accepted requirements', intelligence?.requirements.filter((item) => item.status === 'accepted').length ?? 0],
          ['Open questions', intelligence?.openQuestions.filter((item) => item.status === 'open').length ?? 0],
        ] as Array<[string, number]>,
        guidance: contextNodes.length ? 'Ask Sol which journey, actor, external system or trust-boundary interaction is not represented.' : 'Compile a System Context candidate from accepted requirements and journeys, then review it before acceptance.',
      };
    }
    if (deliveryStageId === 'review') {
      return {
        headline: project.findings.length ? 'The current priority is finding disposition and approval evidence.' : 'No persisted finding currently blocks the review surface.',
        metrics: [
          ['Findings', project.findings.length],
          ['Decisions', project.decisions.length],
          ['Approvals', project.stageApprovals.length],
          ['Interfaces', project.interfaces?.length ?? 0],
        ] as Array<[string, number]>,
        guidance: 'Ask Sol to explain approval blockers, missing traceability or the consequences of an unresolved decision.',
      };
    }
    if (deliveryStageId === 'sdd') {
      const projectArtifacts = lifecycleArtifacts.filter((item) => item.projectId === project.id && item.branchId === project.branch.id);
      return {
        headline: project.stageApprovals.length ? 'The delivery pack can be assessed against its approved model, decisions and evidence.' : 'The SDD remains gated until the architecture baseline has an accountable approval state.',
        metrics: [
          ['Approved stages', project.stageApprovals.length],
          ['Decisions', project.decisions.length],
          ['Interfaces', project.interfaces?.length ?? 0],
          ['Delivery artifacts', projectArtifacts.length],
        ] as Array<[string, number]>,
        guidance: 'Ask Sol to identify missing sections, stale evidence, weak traceability or implementation obligations before final generation.',
      };
    }
    return {
      headline: stageNodes.length ? 'The current stage has model content that Sol can explain and challenge.' : 'This stage has no canonical architecture objects yet.',
      metrics: [
        ['Objects', stageNodes.length],
        ['Relationships', stageEdges.length],
        ['Interfaces', stageInterfaces.length],
        ['Findings', project.findings.length],
      ] as Array<[string, number]>,
      guidance: stageNodes.length
        ? 'Select an object for scope-specific reasoning, or ask which obligation, interface or quality tactic is missing.'
        : 'Use Sol Draft or Sol Design to create a reviewable proposal before requesting detailed critique.',
    };
  }, [project, effectiveArchitectureStage, deliveryStageId, lifecycleArtifacts]);

  useEffect(() => {
    if (embedded) setOpen(true);
  }, [embedded]);

  useEffect(() => {
    if (initialPrompt) setQuestion(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    const handler = (event: Event) => {
      if (embedded) return;
      const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt;
      setOpen(true);
      setView("guidance");
      if (prompt) setQuestion(prompt);
    };
    window.addEventListener("aiw:open-coarchitect", handler);
    return () => window.removeEventListener("aiw:open-coarchitect", handler);
  }, [embedded]);

  const ask = async (text = question) => {
    const value = text.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    setQuestion(value);
    setView("guidance");
    try {
      const result = await postJson<Answer>("/api/co-architect/ask", {
        projectId: project.id,
        branchId: project.branch.id,
        expectedRevision: project.revision,
        question: value,
        lifecycleStage: deliveryStageId,
        scopeLabel,
        selectedNodeId: selectedNodeId ?? undefined,
        dataClassification: "internal",
      });
      setAnswer(result);
      recordExchange(value, result.answer, result.citedRecordIds, result.modelTrace);
      setQuestion("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Architecture Brain request failed.");
    } finally {
      setLoading(false);
    }
  };

  const executeAction = (target: string) => {
    if (target === "brief") {
      setWorkspaceMode("design");
      setActiveStage("designIntent");
      return;
    }
    if (target === "quality") {
      setWorkspaceMode("quality");
      return;
    }
    if (target === "canvas") {
      setWorkspaceMode("design");
      if (project.activeStage === "designIntent" || project.activeStage === "validationRealization") setActiveStage("logicalApplication");
      return;
    }
    if (target === "review") {
      setWorkspaceMode("design");
      setActiveStage("validationRealization");
      return;
    }
    if (target === "patterns") {
      setWorkspaceMode("patterns");
      return;
    }
    if (stages.includes(target as ArchitectureStage)) {
      setWorkspaceMode("design");
      setActiveStage(target as ArchitectureStage);
      return;
    }
    if (target.startsWith("PAT-")) {
      sessionStorage.setItem("aiw-pattern-focus", target);
      setWorkspaceMode("patterns");
      return;
    }
    if (["synthesis", "knowledge", "governance", "collaboration", "drift", "operations"].includes(target)) setWorkspaceMode(target as any);
  };

  const latestAssistant = session?.messages.filter((message) => message.role === "assistant").at(-1);
  const displayAnswer = answer?.answer ?? latestAssistant?.content ?? null;
  const modelLabel = answer?.mode === "llm-assisted"
    ? `${answer.modelTrace?.providerId ?? "LLM"} · ${answer.modelTrace?.model ?? "governed route"}`
    : answer
      ? "Governed deterministic fallback"
      : `${session?.messages.length ?? 0} saved messages`;

  const close = () => {
    if (embedded) onClose?.();
    else setOpen(false);
  };

  const materializeDesignGraph = async () => {
    const receipt = answer?.brainReceipt;
    if (!receipt || graphBusy) return;
    if (!serverPersistenceEnabled) {
      setGraphNotice("Connect this project to the server before materializing the canonical Design Graph.");
      return;
    }
    setGraphBusy(true);
    setGraphNotice(null);
    try {
      const response = await postJson<{
        project: ArchitectureProject;
        materializationReceipt: { recordCount: number; relationshipCount: number };
      }>(
        `/api/projects/${project.id}/branches/${project.branch.id}/design-graph/materialize`,
        {
          expectedRevision: project.revision,
          previewFingerprint: receipt.graph.fingerprint,
        },
      );
      hydrateProject(response.project, true);
      setAnswer(null);
      setGraphNotice(`Canonical Design Graph materialized with ${response.materializationReceipt.recordCount} records and ${response.materializationReceipt.relationshipCount} relationships. Ask Sol again to reason over the new revision.`);
    } catch (cause) {
      setGraphNotice(cause instanceof Error ? cause.message : "The canonical Design Graph could not be materialized.");
    } finally {
      setGraphBusy(false);
    }
  };


  const migrateDesignGraphState = async () => {
    const receipt = answer?.brainReceipt;
    if (!receipt || graphBusy) return;
    if (!serverPersistenceEnabled) {
      setGraphNotice("Connect this project to the server before promoting architecture state to graph-primary authority.");
      return;
    }
    setGraphBusy(true);
    setGraphNotice(null);
    try {
      const response = await postJson<{
        project: ArchitectureProject;
        migrationReceipt: { canonicalStateKinds: string[] };
      }>(
        `/api/projects/${project.id}/branches/${project.branch.id}/design-graph/migrate-state`,
        {
          expectedRevision: project.revision,
          graphFingerprint: receipt.graph.fingerprint,
        },
      );
      hydrateProject(response.project, true);
      setAnswer(null);
      setGraphNotice(`Architecture state promoted to graph-primary authority for ${response.migrationReceipt.canonicalStateKinds.join(", ")}. Legacy fields are now compatibility projections. Ask Sol again to reason over the new revision.`);
    } catch (cause) {
      setGraphNotice(cause instanceof Error ? cause.message : "Architecture state could not be promoted to graph-primary authority.");
    } finally {
      setGraphBusy(false);
    }
  };

  return (
    <aside className={`coarchitect-panel sol-brain-panel ${open ? "is-open" : ""} ${embedded ? "is-embedded" : ""}`} aria-label="Sol Architecture Brain">
      {!open ? (
        <button className="coarchitect-toggle sol-brain-launcher" onClick={() => setOpen(true)} aria-label="Open Sol Architecture Brain" title="Open Sol Architecture Brain">
          <BrainCircuit size={20} />
          <span className="sr-only">Open Sol Architecture Brain</span>
        </button>
      ) : (
        <div className="sol-brain-shell">
          <header className="sol-brain-header">
            <div className="sol-brain-title">
              <span><BrainCircuit size={19} /></span>
              <div><strong>Sol · Architecture Brain</strong><small>{modelLabel}</small></div>
            </div>
            {embedded || onClose ? <button type="button" className="sol-brain-close" onClick={close} aria-label="Close Architecture Brain"><X size={17} /></button> : null}
          </header>

          <div className="sol-brain-context sol-brain-context--truth" aria-label="Current architecture context">
            <Compass size={14} />
            <dl>
              <div><dt>Project</dt><dd>{project.name}</dd></div>
              <div><dt>Stage</dt><dd>{deliveryStage.title}</dd></div>
              <div><dt>Scope</dt><dd>{scopeLabel}</dd></div>
              <div><dt>Revision</dt><dd>{project.revision}</dd></div>
            </dl>
          </div>

          <nav className="sol-brain-tabs" aria-label="Architecture Brain views">
            <button type="button" className={view === "guidance" ? "is-active" : ""} onClick={() => setView("guidance")}><Sparkles size={14} /> Guidance</button>
            <button type="button" className={view === "history" ? "is-active" : ""} onClick={() => setView("history")}><History size={14} /> History <span>{session?.messages.length ?? 0}</span></button>
          </nav>

          <div className="sol-brain-body">
            {view === "guidance" ? (
              <>
                <section className="sol-brain-prompt-grid" aria-label="Suggested architecture questions">
                  {suggestedPrompts.map((item) => <button key={item} onClick={() => void ask(item)}>{item}</button>)}
                </section>

                <section className="sol-brain-response" aria-live="polite">
                  <header><MessageSquareText size={15} /><strong>Current guidance</strong></header>
                  {loading ? <div className="sol-brain-loading"><Loader2 className="spin" size={17} /> Sol is reasoning over the governed project context…</div> : null}
                  {!loading && answer ? (
                    <div className="sol-brain-answer">
                      <div className="sol-brain-answer__recommendation">
                        <div className="sol-brain-answer__heading">
                          <span>Primary recommendation</span>
                          <span className={`sol-quality-badge is-${answer.qualityReceipt.status}`} title="Sol response quality gate">
                            {answer.qualityReceipt.score}/100 · {answer.qualityReceipt.status}
                          </span>
                        </div>
                        <strong>{answer.recommendation}</strong>
                        <small>Confidence: {answer.confidence} · {answer.mode === "llm-assisted" ? "Governed LLM + deterministic controls" : "Deterministic guidance"}</small>
                        {answer.modelTrace?.qualityGateRejected ? <small className="sol-quality-rejection">A governed LLM candidate scored {answer.modelTrace.rejectedCandidateScore ?? "below threshold"} and was rejected. Deterministic guidance is shown.</small> : null}
                      </div>
                      {answer.observations.length ? <div className="sol-brain-answer__section"><strong>What Sol sees</strong><ul>{answer.observations.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
                      {answer.tradeOffs.length ? <details className="sol-brain-answer__section"><summary>Trade-offs and limits</summary><ul>{answer.tradeOffs.map((item) => <li key={item}>{item}</li>)}</ul></details> : null}
                      {answer.clarifyingQuestions.length ? <div className="sol-brain-answer__section"><strong>Questions that change the decision</strong>{answer.clarifyingQuestions.map((item) => <button type="button" key={item} onClick={() => setQuestion(item)}>{item}</button>)}</div> : null}
                      <dl className="sol-brain-context-receipt" aria-label="Context used by Sol">
                        <div><dt>Requirements</dt><dd>{answer.contextSummary.requirementCount}</dd></div>
                        <div><dt>Journeys</dt><dd>{answer.contextSummary.journeyCount}</dd></div>
                        <div><dt>Objects</dt><dd>{answer.contextSummary.stageObjectCount}</dd></div>
                        <div><dt>Interfaces</dt><dd>{answer.contextSummary.interfaceCount}</dd></div>
                        <div><dt>Open questions</dt><dd>{answer.contextSummary.openQuestionCount}</dd></div>
                      </dl>
                      <details className="sol-quality-detail">
                        <summary>Why this answer passed its quality gate</summary>
                        <div className="sol-quality-gates">
                          {answer.qualityReceipt.gates.map((gate) => (
                            <article key={gate.dimension} className={`is-${gate.status}`}>
                              <div><strong>{gate.dimension.replaceAll("-", " ")}</strong><span>{gate.score}/{gate.threshold}</span></div>
                              <p>{gate.rationale}</p>
                            </article>
                          ))}
                        </div>
                        {answer.qualityReceipt.issues.length ? <div className="sol-quality-issues"><strong>Quality warnings</strong><ul>{answer.qualityReceipt.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : null}
                      </details>
                      <details className="sol-quality-detail">
                        <summary>Context, reasoning and lineage</summary>
                        <div className="sol-reasoning-grid">
                          <section><strong>Context included</strong><p>{answer.contextReceipt.included.requirements} requirements · {answer.contextReceipt.included.qualityScenarios} quality scenarios · {answer.contextReceipt.included.journeys} journeys · {answer.contextReceipt.included.nodes} objects · {answer.contextReceipt.included.interfaces} interfaces</p></section>
                          <section><strong>Deterministic controls</strong><p>{answer.reasoningReceipt.deterministic.join(" · ")}</p></section>
                          <section><strong>Knowledge used</strong><p>{answer.reasoningReceipt.knowledgeDerived.length ? answer.reasoningReceipt.knowledgeDerived.join(" · ") : "No approved knowledge record was required."}</p></section>
                          <section><strong>LLM contribution</strong><p>{answer.reasoningReceipt.llmContribution.length ? answer.reasoningReceipt.llmContribution.join(" · ") : answer.reasoningReceipt.fallbackReason ?? "No LLM contribution was used."}</p></section>
                        </div>
                        {answer.contextReceipt.missingInformation.length ? <div className="sol-context-missing"><strong>Missing information</strong><ul>{answer.contextReceipt.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
                        {answer.lineagePaths.length ? <div className="sol-lineage-list"><strong>Lineage paths</strong>{answer.lineagePaths.slice(0, 6).map((path) => <div key={path.id} className={path.complete ? "is-complete" : "is-incomplete"}><span>{path.label}</span><small>{path.complete ? "Complete" : `Missing: ${path.missingLinks.join(", ")}`}</small></div>)}</div> : null}
                      </details>
                      <RecommendationOutcomeCapture
                        recommendationId={answer.brainReceipt.proposalId}
                        recommendationType="sol-response"
                        recordId={answer.brainReceipt.contextFingerprint}
                        label="Sol response"
                      />
                    </div>
                  ) : null}
                  {!loading && !answer && displayAnswer ? <p>{displayAnswer}</p> : null}
                  {!loading && !displayAnswer ? <div className="sol-brain-empty sol-brain-stage-snapshot">
                    <strong>{stageSnapshot.headline}</strong>
                    <dl>{stageSnapshot.metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                    <p>{stageSnapshot.guidance}</p>
                  </div> : null}
                  {answer?.citedRecordIds.length ? <div className="coarchitect-citations">{answer.citedRecordIds.slice(0, 8).map((id) => <span key={id}>{id}</span>)}</div> : null}
                  {answer?.brainReceipt ? (
                    <details className="sol-brain-receipt">
                      <summary>Governance receipt</summary>
                      <dl>
                        <div><dt>Task</dt><dd>{answer.brainReceipt.task}</dd></div>
                        <div><dt>Project revision</dt><dd>{answer.brainReceipt.projectRevision}</dd></div>
                        <div><dt>Design Graph</dt><dd>r{answer.brainReceipt.graph.revision} · {answer.brainReceipt.graph.projectionMode === "materialized-canonical" ? "canonical" : "compatibility projection"}</dd></div>
                        <div><dt>Graph integrity</dt><dd>{answer.brainReceipt.graph.integrityHealthy ? "verified" : "failed"}</dd></div>
                        <div><dt>State authority</dt><dd>{answer.brainReceipt.graph.stateAuthorityMode === "graph-primary" ? "graph-primary" : "compatibility projection"}</dd></div>
                        <div><dt>Canonical state</dt><dd>{answer.brainReceipt.graph.canonicalStateKinds.length ? answer.brainReceipt.graph.canonicalStateKinds.join(", ") : "migration pending"}</dd></div>
                        <div><dt>Graph fingerprint</dt><dd title={answer.brainReceipt.graph.fingerprint}>{answer.brainReceipt.graph.fingerprint}</dd></div>
                        <div><dt>Knowledge</dt><dd>{answer.brainReceipt.manifest.knowledgeReleaseId}</dd></div>
                        <div><dt>Kernel</dt><dd>{answer.brainReceipt.manifest.kernelVersion}</dd></div>
                        <div><dt>Cambridge</dt><dd>{answer.brainReceipt.manifest.cambridgeRulesetId}</dd></div>
                        <div><dt>LLM authority</dt><dd>{answer.brainReceipt.manifest.llmAuthorityPolicyId}</dd></div>
                        <div><dt>Reasoning mode</dt><dd>{answer.brainReceipt.llm.used ? `${answer.brainReceipt.llm.providerId ?? "provider"} · ${answer.brainReceipt.llm.model ?? "model"}` : answer.brainReceipt.llm.fallbackUsed ? "Deterministic fallback" : "Deterministic"}</dd></div>
                        <div><dt>Quality evaluator</dt><dd>{answer.qualityReceipt.evaluatorVersion}</dd></div>
                      </dl>
                      <p>{answer.brainReceipt.governance.directModelMutationAllowed ? "Direct mutation enabled" : "No direct model mutation"} · Human approval required · Receipt {answer.brainReceipt.contextFingerprint}</p>
                      {answer.brainReceipt.graph.legacyProjectionUsed ? (
                        <button type="button" className="sol-graph-materialize" disabled={graphBusy} onClick={() => void materializeDesignGraph()}>
                          {graphBusy ? "Materializing canonical graph…" : "Materialize canonical Design Graph"}
                        </button>
                      ) : answer.brainReceipt.graph.stateAuthorityMode !== "graph-primary" ? (
                        <button type="button" className="sol-graph-materialize" disabled={graphBusy} onClick={() => void migrateDesignGraphState()}>
                          {graphBusy ? "Promoting canonical state…" : "Promote architecture state to graph-primary"}
                        </button>
                      ) : <p className="sol-graph-canonical">Canonical Design Graph is graph-primary, revision-pinned and compatibility-projected.</p>}
                    </details>
                  ) : null}
                </section>

                {answer?.suggestedNextActions.length ? (
                  <section className="coarchitect-actions sol-brain-actions" aria-label="Suggested next actions">
                    <header><strong>Recommended next actions</strong></header>
                    {answer.suggestedNextActions.map((item) => (
                      <button key={`${item.title}-${item.target}`} onClick={() => executeAction(item.target)}>
                        <span><strong>{item.title}</strong><small>{item.rationale}</small></span><ArrowRight size={14} />
                      </button>
                    ))}
                  </section>
                ) : null}
              </>
            ) : (
              <section className="coarchitect-history sol-brain-history" aria-label="Saved Architecture Brain conversation">
                {session?.messages.length ? session.messages.slice(-10).map((message) => (
                  <article key={message.id} className={`coarchitect-message ${message.role}`}>
                    <strong>{message.role === "user" ? "You" : "Sol"}</strong>
                    <p>{message.content}</p>
                    {message.citedRecordIds.length ? <div className="coarchitect-citations">{message.citedRecordIds.slice(0, 5).map((id) => <span key={id}>{id}</span>)}</div> : null}
                  </article>
                )) : <div className="sol-brain-empty">No saved Architecture Brain exchanges exist for this stage and scope.</div>}
              </section>
            )}
          </div>

          {graphNotice ? <div className="sol-graph-notice">{graphNotice}</div> : null}
          {error ? <div className="coarchitect-error sol-brain-error"><CircleOff size={14} />{error}</div> : null}

          <footer className="sol-brain-composer">
            <div className="coarchitect-input">
              <textarea rows={3} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about the current stage, selected component, recommendation or trade-off…" />
              <button disabled={loading || !question.trim()} onClick={() => void ask()} aria-label="Send question">{loading ? <Loader2 className="spin" size={17} /> : <ArrowUp size={17} />}</button>
            </div>
            <small className="coarchitect-boundary">Sol explains and proposes. Deterministic controls and explicit human acceptance remain authoritative.</small>
          </footer>
        </div>
      )}
    </aside>
  );
}
