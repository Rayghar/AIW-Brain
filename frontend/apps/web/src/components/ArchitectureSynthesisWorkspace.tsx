import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  CloudLightning,
  Code2,
  Download,
  FlaskConical,
  Gauge,
  GitCompareArrows,
  Network,
  Layers3,
  Route,
  Database,
  Play,
  Scale,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  WandSparkles,
} from "lucide-react";
import {
  sprint80DefaultSimulationScenarios,
  synthesisStrategyIds,
  type ArchitectureAlternative,
  type ArchitectureBrainProposalReceipt,
  type ArchitectureSimulationResult,
  type ArchitectureSynthesisRun,
  type DesignBriefAssessment,
  type SynthesisStrategyId,
  type SimulationCalibrationProfile,
} from "@aiw/domain";
import {
  compareArchitectureAlternatives,
  createSynthesisDecisionPackage,
} from "@aiw/engine";
import { useWorkspaceStore } from "../store/workspaceStore";
import { getJson, postJson } from "../lib/apiClient";
import { DesignGuide } from "./DesignGuide";
import { FullJourneyIntelligenceSurface } from "./WorkspaceIntelligenceMap";

type Tab = "brief" | "alternatives" | "blueprint" | "simulation" | "decision";

const strategyLabels: Record<SynthesisStrategyId, string> = {
  balanced: "Balanced",
  "simplicity-first": "Simplicity",
  "resilience-first": "Resilience",
  "scale-first": "Scale",
  "security-first": "Security",
  "cost-first": "Cost",
  "modernization-first": "Modernization",
  "sovereign-ai-first": "Sovereign AI",
};

function downloadJson(name: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function scoreClass(value: number) {
  return value >= 80
    ? "excellent"
    : value >= 65
      ? "good"
      : value >= 50
        ? "watch"
        : "poor";
}

export function ArchitectureSynthesisWorkspace() {
  const project = useWorkspaceStore((state) => state.project);
  const adoptSynthesizedProject = useWorkspaceStore(
    (state) => state.adoptSynthesizedProject,
  );
  const saveProjectToServer = useWorkspaceStore((state) => state.saveProjectToServer);
  const [tab, setTab] = useState<Tab>("brief");
  const [selectedStrategies, setSelectedStrategies] = useState<
    SynthesisStrategyId[]
  >([
    "balanced",
    "simplicity-first",
    "resilience-first",
    "security-first",
    "cost-first",
  ]);
  const [run, setRun] = useState<ArchitectureSynthesisRun | null>(null);
  const [selectedAlternativeId, setSelectedAlternativeId] =
    useState<string>("");
  const [simulationResults, setSimulationResults] = useState<
    ArchitectureSimulationResult[]
  >([]);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([
    "SIM-BASELINE",
    "SIM-LOAD-SPIKE",
    "SIM-DEPENDENCY-FAILURE",
    "SIM-REGION-FAILURE",
    "SIM-SECURITY-INCIDENT",
  ]);
  const [decisionRationale, setDecisionRationale] = useState(
    "Selected after governed alternative comparison, obligation review and deterministic simulation.",
  );
  const [generating, setGenerating] = useState(false);
  const [knowledgeReleaseId, setKnowledgeReleaseId] = useState("AKR-0.8.9");
  const [synthesisMode, setSynthesisMode] = useState<
    "idle" | "llm-enriched" | "deterministic-fallback"
  >("idle");
  const [calibrationProfile, setCalibrationProfile] =
    useState<SimulationCalibrationProfile | null>(null);
  const [calibrationText, setCalibrationText] = useState("");
  const [calibrationError, setCalibrationError] = useState<string | null>(null);
  const [artifactPackageBusy, setArtifactPackageBusy] = useState(false);
  const [assessment, setAssessment] = useState<DesignBriefAssessment | null>(null);
  const [brainReceipt, setBrainReceipt] = useState<ArchitectureBrainProposalReceipt | null>(null);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);

  useEffect(() => {
    void getJson<{ release: { releaseId: string } }>(
      "/api/knowledge/releases/active",
    )
      .then((result) => setKnowledgeReleaseId(result.release.releaseId))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    setSynthesisError(null);
    void getJson<{ runs: ArchitectureSynthesisRun[] }>(
      `/api/synthesis/projects/${encodeURIComponent(project.id)}/runs`,
    )
      .then(({ runs }) => {
        if (!active || !runs.length) return;
        const latest = [...runs].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
        if (!latest) return;
        setRun(latest);
        setSelectedAlternativeId(latest.recommendedAlternativeId ?? latest.alternatives[0]?.id ?? "");
        setSynthesisMode(latest.mode === "llm-enriched" ? "llm-enriched" : "deterministic-fallback");
        return getJson<{ results: ArchitectureSimulationResult[] }>(
          `/api/synthesis/runs/${encodeURIComponent(latest.id)}/simulations`,
        );
      })
      .then((response) => {
        if (active && response) setSimulationResults(response.results);
      })
      .catch((cause) => {
        if (active) setSynthesisError(cause instanceof Error ? cause.message : "Synthesis history is unavailable.");
      });
    return () => { active = false; };
  }, [project.id]);

  useEffect(() => {
    let active = true;
    setAssessment(null);
    void (async () => {
      await saveProjectToServer();
      const response = await postJson<DesignBriefAssessment>("/api/synthesis/assess", {
        projectId: project.id,
        branchId: project.branch.id,
        expectedRevision: project.revision,
      });
      if (active) setAssessment(response);
    })().catch((cause) => {
      if (active) setSynthesisError(cause instanceof Error ? cause.message : "Synthesis readiness assessment failed.");
    });
    return () => { active = false; };
  }, [project.id, project.branch.id, project.revision, saveProjectToServer]);

  const assessmentView: DesignBriefAssessment = assessment ?? {
    assessedAt: "",
    completenessScore: 0,
    synthesisReady: false,
    gaps: [],
    contradictions: [],
    clarificationQuestions: [],
    strengths: [],
  };

  const modelBaseline = useMemo(() => {
    const stages = new Set(project.nodes.map((node) => node.stage));
    const hasCanonicalModel = project.nodes.length > 0;
    const hasRelationships = project.edges.length > 0;
    const hasProgressiveCoverage = [
      "logicalApplication",
      "applicationRealization",
      "logicalTechnology",
      "physicalTechnology",
    ].filter((stage) => stages.has(stage as (typeof project.nodes)[number]["stage"])).length;
    return {
      hasCanonicalModel,
      hasRelationships,
      stageCoverage: hasProgressiveCoverage,
      selectionReady:
        assessmentView.synthesisReady &&
        hasCanonicalModel &&
        hasRelationships &&
        hasProgressiveCoverage >= 2,
      exploratoryOnly:
        !hasCanonicalModel || !hasRelationships || hasProgressiveCoverage < 2,
    };
  }, [assessmentView.synthesisReady, project.edges.length, project.nodes]);
  const comparison = useMemo(
    () => (run ? compareArchitectureAlternatives(run.alternatives) : null),
    [run],
  );
  const selectedAlternative =
    run?.alternatives.find((item) => item.id === selectedAlternativeId) ??
    run?.alternatives[0] ??
    null;
  const selectedSimulations = selectedAlternative
    ? simulationResults.filter(
        (item) => item.alternativeId === selectedAlternative.id,
      )
    : [];

  const toggleStrategy = (strategy: SynthesisStrategyId) =>
    setSelectedStrategies((current) =>
      current.includes(strategy)
        ? current.filter((item) => item !== strategy)
        : [...current, strategy],
    );
  const toggleScenario = (scenarioId: string) =>
    setSelectedScenarioIds((current) =>
      current.includes(scenarioId)
        ? current.filter((item) => item !== scenarioId)
        : [...current, scenarioId],
    );

  const generate = async () => {
    const strategyIds = selectedStrategies.length >= 2
      ? selectedStrategies
      : (["balanced", "simplicity-first"] as SynthesisStrategyId[]);
    setGenerating(true);
    setSynthesisError(null);
    try {
      await saveProjectToServer();
      const next = await postJson<ArchitectureSynthesisRun & { brainReceipt: ArchitectureBrainProposalReceipt }>(
        "/api/synthesis/runs",
        {
          projectId: project.id,
          branchId: project.branch.id,
          expectedRevision: project.revision,
          knowledgeReleaseId,
          strategyIds,
          maxAlternatives: Math.max(2, Math.min(7, selectedStrategies.length)),
          requireDiversity: true,
          useLlmEnrichment: true,
          dataClassification: "internal" as const,
        },
      );
      setRun(next);
      setBrainReceipt(next.brainReceipt);
      setSynthesisMode(next.mode === "llm-enriched" ? "llm-enriched" : "deterministic-fallback");
      setSelectedAlternativeId(next.recommendedAlternativeId ?? next.alternatives[0]?.id ?? "");
      setSimulationResults([]);
      setTab("alternatives");
    } catch (cause) {
      setSynthesisError(cause instanceof Error ? cause.message : "The Architecture Brain could not generate alternatives.");
    } finally {
      setGenerating(false);
    }
  };

  const loadCalibration = () => {
    setCalibrationError(null);
    if (!calibrationText.trim()) {
      setCalibrationProfile(null);
      return;
    }
    try {
      const parsed = JSON.parse(
        calibrationText,
      ) as SimulationCalibrationProfile;
      if (!parsed.id || !parsed.projectId || !Array.isArray(parsed.evidence))
        throw new Error("Profile requires id, projectId and evidence.");
      if (parsed.projectId !== project.id)
        throw new Error("Profile projectId does not match the active project.");
      if (parsed.status !== "approved")
        throw new Error(
          "Only approved calibration profiles can influence simulation results.",
        );
      setCalibrationProfile(parsed);
    } catch (error) {
      setCalibrationError(
        error instanceof Error ? error.message : "Invalid calibration profile.",
      );
    }
  };

  const downloadCalibrationTemplate = () => {
    const template: SimulationCalibrationProfile = {
      id: `CAL-${project.id}`,
      projectId: project.id,
      createdAt: new Date().toISOString(),
      createdBy: "Architecture performance reviewer",
      status: "draft",
      evidence: [
        {
          id: "EVID-BASELINE-LOAD-TEST",
          sourceType: "load-test",
          sourceName: "Approved baseline load test",
          measuredAt: new Date().toISOString(),
          environment: "performance-test",
          scenarioType: "baseline",
          confidence: 80,
          outcome: {
            p95LatencyMs: 250,
            throughputCapacityMultiplier: 1,
            availabilityPercent: 99.9,
          },
          notes: [
            "Replace sample values, attach evidence and approve before use.",
          ],
        },
      ],
    };
    downloadJson(`simulation-calibration-${project.id}.json`, template);
  };

  const simulate = async () => {
    if (!run || !selectedAlternative) return;
    const scenarios = sprint80DefaultSimulationScenarios.filter((item) =>
      selectedScenarioIds.includes(item.id),
    );
    try {
      const response = await postJson<{
        results: ArchitectureSimulationResult[];
      }>(`/api/synthesis/runs/${encodeURIComponent(run.id)}/simulate`, {
        alternativeId: selectedAlternative.id,
        scenarioIds: scenarios.map((item) => item.id),
        ...(calibrationProfile ? { calibrationProfile } : {}),
      });
      setSimulationResults((current) => [
        ...current.filter(
          (item) => item.alternativeId !== selectedAlternative.id,
        ),
        ...response.results,
      ]);
    } catch (cause) {
      setSynthesisError(cause instanceof Error ? cause.message : "Governed simulation failed.");
      return;
    }
    setTab("simulation");
  };

  const apply = async (status: "considering" | "accepted") => {
    if (!selectedAlternative || !run) return;
    setSynthesisError(null);
    try {
      await saveProjectToServer();
      const preview = await postJson<{ project: typeof project }>(
        `/api/synthesis/runs/${encodeURIComponent(run.id)}/apply-preview`,
        {
          projectId: project.id,
          branchId: project.branch.id,
          expectedRevision: project.revision,
          alternativeId: selectedAlternative.id,
          status,
        },
      );
      await postJson(
        `/api/synthesis/runs/${encodeURIComponent(run.id)}/decision`,
        {
          alternativeId: selectedAlternative.id,
          rationale: decisionRationale,
          accept: status === "accepted",
        },
      );
      adoptSynthesizedProject(preview.project);
    } catch (cause) {
      setSynthesisError(cause instanceof Error ? cause.message : "The governed synthesis change set could not be applied.");
    }
  };

  const downloadPackage = async () => {
    if (!run || !selectedAlternative) return;
    setArtifactPackageBusy(true);
    try {
      const { compileSynthesisArtifacts } = await import("@aiw/artifacts");
      const bundle = compileSynthesisArtifacts(
        run,
        selectedAlternative.id,
        selectedSimulations,
        decisionRationale,
      );
      const decision = createSynthesisDecisionPackage(
        run,
        selectedAlternative.id,
        selectedSimulations,
        decisionRationale,
        false,
      );
      downloadJson(
        `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-synthesis-package.json`,
        { bundle, decision, run, simulations: selectedSimulations },
      );
    } finally {
      setArtifactPackageBusy(false);
    }
  };

  return (
    <section className="synthesis-workspace">
      <header className="workspace-hero synthesis-hero">
        <div>
          <span className="eyebrow">Architecture options</span>
          <h1>Generate and compare architecture alternatives</h1>
          <p>Confirm readiness, choose generation postures, create materially different options, compare trade-offs and apply the selected blueprint through a governed change set.</p>
        </div>
        <div className="hero-badge">
          <WandSparkles size={18} />
          <span>
            {synthesisMode === "llm-enriched"
              ? "LLM-enriched · governed"
              : synthesisMode === "deterministic-fallback"
                ? "Governed offline mode"
                : "Knowledge release"}
          </span>
          <strong>{knowledgeReleaseId}</strong>
        </div>
      </header>

      <DesignGuide placement="global" compact />

      {synthesisError ? <div className="synthesis-authority-error"><TriangleAlert size={16}/><span>{synthesisError}</span></div> : null}
      {brainReceipt ? (
        <details className="synthesis-brain-receipt">
          <summary>Architecture Brain governance receipt</summary>
          <div><span>Kernel <strong>{brainReceipt.manifest.kernelVersion}</strong></span><span>Knowledge <strong>{brainReceipt.manifest.knowledgeReleaseId}</strong></span><span>Cambridge <strong>{brainReceipt.manifest.cambridgeRulesetId}</strong></span><span>LLM policy <strong>{brainReceipt.manifest.llmAuthorityPolicyId}</strong></span></div>
          <p>No direct model mutation · human approval required · project revision {brainReceipt.projectRevision}</p>
        </details>
      ) : null}

      {run ? <FullJourneyIntelligenceSurface /> : (
        <section className={`synthesis-start-card ${modelBaseline.selectionReady ? "is-ready" : "is-exploratory"}`} aria-label="Generate architecture alternatives">
          <div>
            <span className="eyebrow">{modelBaseline.selectionReady ? "Ready for governed selection" : "Exploratory generation"}</span>
            <h2>
              {modelBaseline.selectionReady
                ? "Inputs and the canonical model are sufficient for governed alternatives"
                : !modelBaseline.hasCanonicalModel
                  ? "Create or import a canonical model before treating an alternative as selectable"
                  : "Strengthen relationships and stage coverage before final selection"}
            </h2>
            <p>
              {assessmentView.gaps.length
                ? `${assessmentView.gaps.length} design-brief gap(s) remain. AIW can generate exploratory options, but acceptance stays blocked until evidence is complete.`
                : modelBaseline.exploratoryOnly
                  ? `${project.nodes.length} model object(s), ${project.edges.length} relationship(s) and ${modelBaseline.stageCoverage}/4 modelling stages are present. Generation remains useful for exploration; selection and handoff are not yet represented as ready.`
                  : "The brief, drivers, pattern decisions and progressive model are ready for deterministic synthesis."}
            </p>
          </div>
          <button className="button button--primary" onClick={() => void generate()} disabled={generating}><WandSparkles size={16}/>{generating ? 'Generating…' : 'Generate alternatives'}</button>
        </section>
      )}

      <div className={`metric-grid metric-grid--six ${run ? "" : "metric-grid--compact"}`}>
        <article>
          <ClipboardCheck size={18} />
          <strong>{assessmentView.completenessScore}%</strong>
          <span>Brief completeness</span>
        </article>
        <article>
          <Sparkles size={18} />
          <strong>{run?.alternatives.length ?? 0}</strong>
          <span>Generated alternatives</span>
        </article>
        <article>
          <GitCompareArrows size={18} />
          <strong>{run?.paretoAlternativeIds.length ?? 0}</strong>
          <span>Pareto candidates</span>
        </article>
        <article>
          <FlaskConical size={18} />
          <strong>{simulationResults.length}</strong>
          <span>Simulation results</span>
        </article>
        <article>
          <ShieldCheck size={18} />
          <strong>{selectedAlternative?.obligations.length ?? 0}</strong>
          <span>Open obligations</span>
        </article>
        <article>
          <Code2 size={18} />
          <strong>{selectedAlternative?.patternIds.length ?? 0}</strong>
          <span>Selected Pattern DNA</span>
        </article>
      </div>

      <div className="pattern-tabs synthesis-tabs" aria-label="Architecture options workflow">
        <button
          className={tab === "brief" ? "active" : ""}
          onClick={() => setTab("brief")}
        >
          <ClipboardCheck size={16} /> 1. Readiness
        </button>
        <button
          className={tab === "alternatives" ? "active" : ""}
          onClick={() => setTab("alternatives")}
        >
          <Network size={16} /> 2. Alternatives
        </button>
        <button
          className={tab === "blueprint" ? "active" : ""}
          onClick={() => setTab("blueprint")}
        >
          <Layers3 size={16} /> 3. Blueprint
        </button>
        <button
          className={tab === "simulation" ? "active" : ""}
          onClick={() => setTab("simulation")}
        >
          <FlaskConical size={16} /> 4. Simulate
        </button>
        <button
          className={tab === "decision" ? "active" : ""}
          onClick={() => setTab("decision")}
        >
          <Scale size={16} /> 5. Select & handoff
        </button>
      </div>

      {tab === "brief" ? (
        <div className="synthesis-brief-grid">
          <article className="panel-card">
            <header>
              <div>
                <span className="eyebrow">Readiness</span>
                <h2>Design brief assessment</h2>
              </div>
              <strong
                className={`readiness-score ${modelBaseline.selectionReady ? "ready" : "blocked"}`}
                title={modelBaseline.selectionReady ? "Ready for governed alternative selection" : "Exploratory only until model and evidence gates are satisfied"}
              >
                {modelBaseline.selectionReady ? `${assessmentView.completenessScore}%` : "Explore"}
              </strong>
            </header>
            <p className="panel-intro">
              Synthesis remains exploratory until blocking gaps and
              contradictions are resolved. AIW never hides missing design
              evidence behind a confident model response.
            </p>
            <div className="brief-strengths">
              {assessmentView.strengths.map((item) => (
                <span key={item}>
                  <CheckCircle2 size={14} />
                  {item}
                </span>
              ))}
              <span className={modelBaseline.hasCanonicalModel ? "" : "is-gap"}>
                {modelBaseline.hasCanonicalModel ? <CheckCircle2 size={14} /> : <TriangleAlert size={14} />}
                {project.nodes.length} canonical object(s)
              </span>
              <span className={modelBaseline.hasRelationships ? "" : "is-gap"}>
                {modelBaseline.hasRelationships ? <CheckCircle2 size={14} /> : <TriangleAlert size={14} />}
                {project.edges.length} model relationship(s)
              </span>
              <span className={modelBaseline.stageCoverage >= 2 ? "" : "is-gap"}>
                {modelBaseline.stageCoverage >= 2 ? <CheckCircle2 size={14} /> : <TriangleAlert size={14} />}
                {modelBaseline.stageCoverage}/4 modelling stages represented
              </span>
            </div>
            <div className="brief-gap-list">
              {!modelBaseline.hasCanonicalModel ? (
                <div className="brief-gap brief-gap--blocker">
                  <TriangleAlert size={17} />
                  <div><strong>No canonical architecture model exists</strong><p>Create the logical model or import a governed architecture before selecting and applying an alternative.</p><small>model · blocker</small></div>
                </div>
              ) : null}
              {modelBaseline.hasCanonicalModel && !modelBaseline.hasRelationships ? (
                <div className="brief-gap brief-gap--major">
                  <TriangleAlert size={17} />
                  <div><strong>The model has no relationships</strong><p>Connect responsibilities and interfaces so alternatives can preserve actual system behaviour rather than only object inventory.</p><small>model · major</small></div>
                </div>
              ) : null}
              {modelBaseline.hasCanonicalModel && modelBaseline.stageCoverage < 2 ? (
                <div className="brief-gap brief-gap--major">
                  <TriangleAlert size={17} />
                  <div><strong>Progressive model coverage is incomplete</strong><p>Complete at least two modelling stages before treating synthesis output as a handoff-ready architecture decision.</p><small>lineage · major</small></div>
                </div>
              ) : null}
              {assessmentView.gaps.map((gap) => (
                <div
                  className={`brief-gap brief-gap--${gap.severity}`}
                  key={gap.id}
                >
                  <TriangleAlert size={17} />
                  <div>
                    <strong>{gap.message}</strong>
                    <p>{gap.remediation}</p>
                    <small>
                      {gap.category} · {gap.severity}
                    </small>
                  </div>
                </div>
              ))}
              {!assessmentView.gaps.length && modelBaseline.selectionReady ? (
                <div className="empty-positive">
                  <CheckCircle2 />
                  No material synthesis-readiness gaps detected.
                </div>
              ) : null}
            </div>
          </article>
          <article className="panel-card">
            <span className="eyebrow">Alternative policy</span>
            <h2>Choose synthesis postures</h2>
            <p className="panel-intro">
              Each posture changes deterministic weighting; the LLM may explain
              the result but cannot alter Pattern DNA eligibility, scores or
              topology.
            </p>
            <div className="strategy-grid">
              {synthesisStrategyIds.map((strategy) => (
                <button
                  className={
                    selectedStrategies.includes(strategy) ? "selected" : ""
                  }
                  key={strategy}
                  onClick={() => toggleStrategy(strategy)}
                >
                  <BrainCircuit size={17} />
                  <strong>{strategyLabels[strategy]}</strong>
                  <small>{strategy.replaceAll("-", " ")}</small>
                </button>
              ))}
            </div>
            <button
              className="primary-action"
              onClick={() => void generate()}
              disabled={selectedStrategies.length < 2 || generating}
            >
              <WandSparkles size={17} />{" "}
              {generating
                ? "Generating through configured brain…"
                : "Generate governed alternatives"}
            </button>
            <div className="synthesis-boundary">
              <ShieldCheck size={17} />
              <p>
                <strong>Governance boundary</strong> Only approved records in{" "}
                {knowledgeReleaseId} may shape the alternatives.
                Provider-specific realizations remain overlays and human
                approval remains mandatory.
              </p>
            </div>
          </article>
        </div>
      ) : null}

      {tab === "alternatives" ? (
        run?.alternatives.length ? (
          <div className="synthesis-alternative-layout">
            <div className="alternative-list">
              {run.alternatives.map((alternative) => (
                <button
                  key={alternative.id}
                  className={`alternative-card ${selectedAlternative?.id === alternative.id ? "selected" : ""}`}
                  onClick={() => setSelectedAlternativeId(alternative.id)}
                >
                  <header>
                    <div>
                      <span>{strategyLabels[alternative.strategyId]}</span>
                      <strong>{alternative.name}</strong>
                    </div>
                    <b className={scoreClass(alternative.scorecard.overall)}>
                      {alternative.scorecard.overall}
                    </b>
                  </header>
                  <p>{alternative.summary}</p>
                  <div className="alternative-patterns">
                    {alternative.patternRecommendations
                      .slice(0, 4)
                      .map((item) => (
                        <span key={item.patternId}>{item.patternName}</span>
                      ))}
                  </div>
                  <footer>
                    <span>
                      {alternative.compositionPlan.mutation.addNodes.length}{" "}
                      nodes
                    </span>
                    <span>{alternative.obligations.length} obligations</span>
                    <span>{alternative.costProjection.relativeClass} cost</span>
                  </footer>
                </button>
              ))}
            </div>
            {selectedAlternative ? (
              <AlternativeDetail
                alternative={selectedAlternative}
                pareto={run.paretoAlternativeIds.includes(
                  selectedAlternative.id,
                )}
                onSimulate={() => void simulate()}
              />
            ) : null}
          </div>
        ) : (
          <EmptySynthesis onGenerate={() => void generate()} />
        )
      ) : null}

      {tab === "blueprint" ? (
        run && selectedAlternative ? (
          <div className="synthesis-blueprint-layout">
            <article className="panel-card">
              <header>
                <div>
                  <span className="eyebrow">Provider-neutral architecture blueprint</span>
                  <h2>{selectedAlternative.name}</h2>
                </div>
                <strong className={`readiness-score ${selectedAlternative.eligibility.eligible ? "ready" : "blocked"}`}>
                  {selectedAlternative.eligibility.eligible ? "Eligible" : "Explore"}
                </strong>
              </header>
              <p className="panel-intro">
                The canonical architecture is composed first. Provider products remain separate overlays and cannot replace the neutral capability, interface, security or resilience contracts.
              </p>
              <div className="metric-grid metric-grid--six">
                <article><Network size={17} /><strong>{selectedAlternative.blueprint.componentLineage.length}</strong><span>Traced components</span></article>
                <article><Route size={17} /><strong>{selectedAlternative.blueprint.interfaceContracts.length}</strong><span>Interface contracts</span></article>
                <article><CloudLightning size={17} /><strong>{selectedAlternative.blueprint.deploymentTopology.length}</strong><span>Deployment elements</span></article>
                <article><ShieldCheck size={17} /><strong>{selectedAlternative.blueprint.trustZones.length}</strong><span>Trust zones</span></article>
                <article><Activity size={17} /><strong>{selectedAlternative.blueprint.failurePaths.length}</strong><span>Failure paths</span></article>
                <article><Layers3 size={17} /><strong>{selectedAlternative.blueprint.views.length}/10</strong><span>Required views</span></article>
              </div>
              <div className="scorecard-grid">
                {Object.entries(selectedAlternative.blueprint.completeness).map(([key, value]) => (
                  <div key={key}>
                    <span>{key.replace(/([A-Z])/g, " $1")}</span>
                    <div><i style={{ width: `${key.includes("Views") ? Math.round((Number(value) / 10) * 100) : Number(value)}%` }} /></div>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-card">
              <span className="eyebrow">Required architecture views</span>
              <h2>Ten model-derived diagrams</h2>
              <div className="handoff-steps">
                {selectedAlternative.blueprint.views.map((view, index) => (
                  <div key={view.id}>
                    <span>{index + 1}</span>
                    <p><strong>{view.title}</strong>{view.purpose}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-card">
              <span className="eyebrow">Interface and event contracts</span>
              <h2>Provider, consumer and executable semantics</h2>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Contract</th><th>Provider</th><th>Consumer</th><th>Style</th><th>Protocol</th><th>Schema</th><th>Status</th></tr></thead>
                  <tbody>
                    {selectedAlternative.blueprint.interfaceContracts.slice(0, 20).map((contract) => (
                      <tr key={contract.id}>
                        <td><strong>{contract.name}</strong><small>{contract.operationOrEvent}</small></td>
                        <td>{contract.providerNodeId}</td>
                        <td>{contract.consumerNodeIds.join(", ")}</td>
                        <td>{contract.interactionStyle}</td>
                        <td>{contract.protocol}</td>
                        <td>{contract.schemaRef}</td>
                        <td>{contract.contractStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel-card">
              <span className="eyebrow">Capability-to-product mapping</span>
              <h2>Neutral first, provider overlay second</h2>
              <div className="alternative-detail-columns">
                <div>
                  <h3>Neutral capabilities</h3>
                  {selectedAlternative.blueprint.capabilityProductMappings.slice(0, 10).map((mapping) => (
                    <p key={mapping.capabilityId}>
                      <Database size={13} />
                      <span><strong>{mapping.capabilityName}</strong>{mapping.neutralDefinition}</span>
                    </p>
                  ))}
                </div>
                <div>
                  <h3>Available overlays</h3>
                  {selectedAlternative.blueprint.providerOverlays.map((overlay) => (
                    <p key={overlay.id}>
                      <CloudLightning size={13} />
                      <span><strong>{overlay.provider.toUpperCase()}</strong>{overlay.mappings.length} mapped capability proposal(s) · {overlay.status}</span>
                    </p>
                  ))}
                </div>
              </div>
            </article>

            <article className="panel-card">
              <span className="eyebrow">Security, resilience and recovery</span>
              <h2>Trust boundaries and failure-path analysis</h2>
              <div className="alternative-detail-columns">
                <div>
                  <h3>Trust zones</h3>
                  {selectedAlternative.blueprint.trustZones.slice(0, 8).map((zone) => (
                    <p key={zone.id}><ShieldCheck size={13} /><span><strong>{zone.name}</strong>{zone.requiredControls.slice(0, 4).join(" · ")}</span></p>
                  ))}
                </div>
                <div>
                  <h3>Failure paths</h3>
                  {selectedAlternative.blueprint.failurePaths.slice(0, 8).map((path) => (
                    <p key={path.id}><TriangleAlert size={13} /><span><strong>{path.name}</strong>{path.containmentMechanisms.join(" · ")}</span></p>
                  ))}
                </div>
              </div>
            </article>
          </div>
        ) : (
          <EmptySynthesis onGenerate={() => void generate()} />
        )
      ) : null}

      {tab === "simulation" ? (
        run && selectedAlternative ? (
          <div className="simulation-layout">
            <article className="panel-card simulation-config">
              <span className="eyebrow">Scenario suite</span>
              <h2>{selectedAlternative.name}</h2>
              <p className="panel-intro">
                Select stress conditions. Results are deterministic comparative
                projections, not service guarantees.
              </p>
              <div className="simulation-calibration">
                <div>
                  <strong>Empirical calibration</strong>
                  <small>
                    {calibrationProfile
                      ? `Approved profile ${calibrationProfile.id} is active.`
                      : "Default comparative coefficients are active."}
                  </small>
                </div>
                <textarea
                  rows={4}
                  value={calibrationText}
                  onChange={(event) => setCalibrationText(event.target.value)}
                  placeholder="Paste an approved simulation calibration profile JSON."
                />
                <div className="simulation-calibration-actions">
                  <button onClick={downloadCalibrationTemplate}>
                    Download template
                  </button>
                  <button onClick={loadCalibration}>Validate and apply</button>
                  <button
                    onClick={() => {
                      setCalibrationProfile(null);
                      setCalibrationText("");
                      setCalibrationError(null);
                    }}
                  >
                    Use defaults
                  </button>
                </div>
                {calibrationError ? (
                  <p className="field-error">{calibrationError}</p>
                ) : null}
                <small>
                  Draft or reviewed evidence is never used for scoring. Approval
                  remains a human governance action.
                </small>
              </div>
              <div className="scenario-grid">
                {sprint80DefaultSimulationScenarios.map((scenario) => (
                  <button
                    className={
                      selectedScenarioIds.includes(scenario.id)
                        ? "selected"
                        : ""
                    }
                    key={scenario.id}
                    onClick={() => toggleScenario(scenario.id)}
                  >
                    <CloudLightning size={16} />
                    <strong>{scenario.name}</strong>
                    <small>{scenario.description}</small>
                  </button>
                ))}
              </div>
              <button
                className="primary-action"
                onClick={() => void simulate()}
                disabled={!selectedScenarioIds.length}
              >
                <Play size={16} /> Run selected simulations
              </button>
            </article>
            <article className="panel-card simulation-results">
              <header>
                <div>
                  <span className="eyebrow">Outcomes</span>
                  <h2>Scenario comparison</h2>
                </div>
                <strong>{selectedSimulations.length} results</strong>
              </header>
              {selectedSimulations.length ? (
                <div className="simulation-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Scenario</th>
                        <th>Availability</th>
                        <th>p95</th>
                        <th>RTO</th>
                        <th>Cost</th>
                        <th>Ops</th>
                        <th>Security</th>
                        <th>Delivery</th>
                        <th>Model</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSimulations.map((result) => (
                        <tr key={result.id}>
                          <td>
                            <strong>{result.scenario.name}</strong>
                            <small>{result.confidence}% confidence</small>
                          </td>
                          <td>{result.outcome.availabilityPercent}%</td>
                          <td>{result.outcome.p95LatencyMs}ms</td>
                          <td>{result.outcome.recoveryTimeMinutes}m</td>
                          <td>${result.outcome.estimatedMonthlyCost}</td>
                          <td>{result.outcome.operationalLoadScore}</td>
                          <td>{result.outcome.securityExposureScore}</td>
                          <td>{result.outcome.deliveryRiskScore}</td>
                          <td>
                            <strong>
                              {result.calibrationMode === "evidence-adjusted"
                                ? "Evidence-adjusted"
                                : "Comparative"}
                            </strong>
                            <small>
                              {result.calibrationEvidenceIds?.length ?? 0}{" "}
                              evidence items
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty-message">
                  Run the selected scenarios to compare failure, load, security,
                  cost and operating outcomes.
                </p>
              )}
              <div className="simulation-findings">
                {selectedSimulations.flatMap((item) =>
                  item.findings
                    .filter((finding) => finding.severity !== "info")
                    .map((finding) => (
                      <div
                        key={finding.id}
                        className={`sim-finding sim-finding--${finding.severity}`}
                      >
                        <TriangleAlert size={15} />
                        <div>
                          <strong>{finding.message}</strong>
                          <small>{finding.mitigation}</small>
                        </div>
                      </div>
                    )),
                )}
              </div>
            </article>
          </div>
        ) : (
          <EmptySynthesis onGenerate={() => void generate()} />
        )
      ) : null}

      {tab === "decision" ? (
        run && selectedAlternative ? (
          <div className="decision-layout">
            <article className="panel-card">
              <span className="eyebrow">Decision package</span>
              <h2>{selectedAlternative.name}</h2>
              <textarea
                value={decisionRationale}
                onChange={(event) => setDecisionRationale(event.target.value)}
                rows={4}
              />
              <div className="decision-readiness-grid">
                <div>
                  <strong>{selectedAlternative.scorecard.overall}</strong>
                  <span>Overall score</span>
                </div>
                <div>
                  <strong>
                    {
                      selectedAlternative.risks.filter(
                        (item) =>
                          item.severity === "high" ||
                          item.severity === "critical",
                      ).length
                    }
                  </strong>
                  <span>High risks</span>
                </div>
                <div>
                  <strong>{selectedSimulations.length}</strong>
                  <span>Simulations</span>
                </div>
                <div>
                  <strong>
                    {selectedAlternative.evidenceConnectorIds.length}
                  </strong>
                  <span>Evidence sources</span>
                </div>
              </div>
              <div className="decision-actions">
                <button onClick={() => void apply("considering")}>
                  <ArrowRight size={16} /> Apply as considering
                </button>
                <button
                  className="primary-action"
                  onClick={() => void apply("accepted")}
                >
                  <CheckCircle2 size={16} /> Accept into project
                </button>
              </div>
            </article>
            <article className="panel-card">
              <span className="eyebrow">Artifacts and conformance</span>
              <h2>Governed delivery handoff</h2>
              <div className="handoff-steps">
                <div>
                  <span>1</span>
                  <p>
                    <strong>Canonical model</strong>Apply typed nodes,
                    relationships and Pattern DNA selections.
                  </p>
                </div>
                <div>
                  <span>2</span>
                  <p>
                    <strong>Decision evidence</strong>Generate ADR, scorecard,
                    assumptions and simulation trace.
                  </p>
                </div>
                <div>
                  <span>3</span>
                  <p>
                    <strong>Architecture-as-code</strong>Export CALM-compatible
                    JSON and Mermaid projection.
                  </p>
                </div>
                <div>
                  <span>4</span>
                  <p>
                    <strong>Fitness functions</strong>Generate ArchUnit,
                    contract, IaC and runtime checks.
                  </p>
                </div>
                <div>
                  <span>5</span>
                  <p>
                    <strong>Conformance loop</strong>Deliver to CI and return
                    evidence to AIW.
                  </p>
                </div>
              </div>
              <button className="primary-action" disabled={artifactPackageBusy} onClick={() => void downloadPackage()}>
                <Download size={16} /> {artifactPackageBusy ? 'Preparing package…' : 'Download synthesis package'}
              </button>
              {comparison ? (
                <div className="pareto-note">
                  <Gauge size={16} />
                  <p>
                    <strong>
                      {comparison.paretoAlternativeIds.length} non-dominated
                      option(s)
                    </strong>
                    The selected alternative is{" "}
                    {comparison.paretoAlternativeIds.includes(
                      selectedAlternative.id,
                    )
                      ? ""
                      : "not "}
                    on the current Pareto frontier.
                  </p>
                </div>
              ) : null}
            </article>
          </div>
        ) : (
          <EmptySynthesis onGenerate={() => void generate()} />
        )
      ) : null}
    </section>
  );
}

function AlternativeDetail({
  alternative,
  pareto,
  onSimulate,
}: {
  alternative: ArchitectureAlternative;
  pareto: boolean;
  onSimulate: () => void;
}) {
  const dimensions = Object.entries(alternative.scorecard).filter(
    ([key]) => key !== "overall",
  );
  return (
    <article className="panel-card alternative-detail-card">
      <header>
        <div>
          <span className="eyebrow">
            {pareto ? "Pareto candidate" : "Dominated candidate"}
          </span>
          <h2>{alternative.name}</h2>
        </div>
        <strong
          className={`alternative-total ${scoreClass(alternative.scorecard.overall)}`}
        >
          {alternative.scorecard.overall}
        </strong>
      </header>
      <p className="panel-intro">{alternative.summary}</p>
      <div className="scorecard-grid">
        {dimensions.map(([key, value]) => (
          <div key={key}>
            <span>{key.replace(/([A-Z])/g, " $1")}</span>
            <div>
              <i style={{ width: `${value}%` }} />
            </div>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <h3>Pattern composition</h3>
      <div className="pattern-pill-list">
        {alternative.patternRecommendations.map((item) => (
          <span key={item.patternId}>
            {item.patternName}
            <small>{item.totalScore}</small>
          </span>
        ))}
      </div>
      <div className="alternative-detail-columns">
        <div>
          <h3>Obligations</h3>
          {alternative.obligations.slice(0, 6).map((item) => (
            <p key={item.id}>
              <ShieldCheck size={13} />
              <span>
                <strong>{item.title}</strong>
                {item.description}
              </span>
            </p>
          ))}
        </div>
        <div>
          <h3>Risks</h3>
          {alternative.risks.slice(0, 6).map((item) => (
            <p key={item.id}>
              <TriangleAlert size={13} />
              <span>
                <strong>{item.title}</strong>
                {item.mitigation}
              </span>
            </p>
          ))}
        </div>
      </div>
      <footer className="alternative-detail-footer">
        <span>
          Estimated ${alternative.costProjection.monthlyLow.toLocaleString()}–$
          {alternative.costProjection.monthlyHigh.toLocaleString()}/month
        </span>
        <span>
          {alternative.costProjection.deliveryEffortDaysLow}–
          {alternative.costProjection.deliveryEffortDaysHigh} delivery days
        </span>
        <button onClick={onSimulate}>
          <Activity size={15} /> Simulate
        </button>
      </footer>
    </article>
  );
}

function EmptySynthesis({ onGenerate }: { onGenerate: () => void }) {
  return (
    <article className="panel-card empty-synthesis">
      <WandSparkles size={34} />
      <h2>No synthesis run yet</h2>
      <p>
        Generate at least two governed alternatives from the current design
        brief.
      </p>
      <button className="primary-action" onClick={onGenerate}>
        Generate alternatives
      </button>
    </article>
  );
}
