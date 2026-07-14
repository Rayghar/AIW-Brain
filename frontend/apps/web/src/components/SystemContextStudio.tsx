import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Network,
  ShieldCheck,
  Sparkles,
  UserRound,
  Workflow,
} from "lucide-react";
import type {
  ArchitectureBrainProposalReceipt,
  ArchitectureBrainResponse,
  ArchitectureEdge,
  ArchitectureNode,
  ArchitectureProject,
  SystemContextCandidate,
} from "@aiw/domain";
import { postJson } from "../lib/apiClient";
import { useWorkspaceStore } from "../store/workspaceStore";
import { JourneySequenceDiagram } from "./requirements/JourneySequenceDiagram";
import "./system-context-studio.css";

type ContextPreview = ArchitectureBrainResponse<SystemContextCandidate>;
interface ContextApplyResponse {
  project: ArchitectureProject;
  brainReceipt: ArchitectureBrainProposalReceipt;
}

export function SystemContextStudio() {
  const project = useWorkspaceStore((state) => state.project);
  const hydrateProject = useWorkspaceStore((state) => state.hydrateProject);
  const serverPersistenceEnabled = useWorkspaceStore(
    (state) => state.serverPersistenceEnabled,
  );
  const intelligence = project.requirementsIntelligence;
  const journeys =
    intelligence?.journeys.filter((item) => item.status === "accepted") ?? [];
  const existingContextNodes = project.nodes.filter((node) =>
    node.tags.includes("system-context"),
  );
  const [candidate, setCandidate] = useState<ContextPreview | null>(null);
  const [preview, setPreview] = useState(existingContextNodes.length === 0);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeJourneyId, setActiveJourneyId] = useState(
    journeys[0]?.id ?? null,
  );
  const activeJourney =
    journeys.find((item) => item.id === activeJourneyId) ?? journeys[0] ?? null;
  const openQuestions =
    intelligence?.openQuestions.filter(
      (item) =>
        item.status === "open" &&
        ["critical", "high"].includes(item.impact),
    ) ?? [];

  const compilePreview = useCallback(async () => {
    if (!journeys.length) {
      setCandidate(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const value = await postJson<ContextPreview>(
        `/api/projects/${encodeURIComponent(project.id)}/branches/${encodeURIComponent(project.branch.id)}/system-context/preview`,
        { expectedRevision: project.revision },
      );
      setCandidate(value);
      setPreview(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "System Context preview is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [journeys.length, project.id, project.branch.id, project.revision]);

  useEffect(() => {
    if (!journeys.length) {
      setCandidate(null);
      return;
    }
    // Once a canonical context exists, keep it authoritative. A project revision
    // must not silently return the architect to candidate-preview state.
    if (existingContextNodes.length > 0) {
      setCandidate(null);
      setPreview(false);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void postJson<ContextPreview>(
      `/api/projects/${encodeURIComponent(project.id)}/branches/${encodeURIComponent(project.branch.id)}/system-context/preview`,
      { expectedRevision: project.revision },
    )
      .then((value) => {
        if (!active) return;
        setCandidate(value);
        setPreview(true);
      })
      .catch((reason) => {
        if (!active) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "System Context preview is unavailable.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    project.id,
    project.branch.id,
    project.revision,
    journeys.length,
    existingContextNodes.length,
  ]);

  async function applyContext() {
    if (!candidate || applying) return;
    setApplying(true);
    setError(null);
    try {
      const response = await postJson<ContextApplyResponse>(
        `/api/projects/${encodeURIComponent(project.id)}/branches/${encodeURIComponent(project.branch.id)}/system-context/apply`,
        {
          expectedRevision: project.revision,
          contextFingerprint: candidate.brainReceipt.contextFingerprint,
        },
      );
      hydrateProject(response.project, serverPersistenceEnabled);
      setPreview(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "System Context acceptance failed.",
      );
    } finally {
      setApplying(false);
    }
  }

  if (!intelligence || !journeys.length)
    return (
      <section className="system-context-empty">
        <Network size={28} />
        <h2>System Context needs approved project understanding</h2>
        <p>
          Return to Requirements, distil the source material and accept at least
          one major journey. AIW will then build a traceable context proposal
          rather than inventing a generic diagram.
        </p>
        <div>
          <AlertTriangle size={14} /> No canonical Journey Atlas is available
          yet.
        </div>
      </section>
    );

  if (loading && !candidate)
    return (
      <section className="system-context-empty">
        <Network size={28} />
        <h2>Architecture Brain is compiling System Context</h2>
        <p>
          Accepted journeys, participants, interactions, evidence and
          obligations are being reconciled against the canonical project
          revision.
        </p>
      </section>
    );

  const candidateNodes = candidate?.nodes ?? [];
  const candidateEdges = candidate?.edges ?? [];
  const displayNodes = preview ? candidateNodes : existingContextNodes;
  const displayEdges: ArchitectureEdge[] = preview
    ? candidateEdges
    : project.edges.filter((edge) =>
        displayNodes.some(
          (node) => node.id === edge.sourceId || node.id === edge.targetId,
        ),
      );
  const system = displayNodes.find((node) =>
    node.tags.includes("system-of-interest"),
  );
  const actors = displayNodes.filter((node) =>
    node.tags.includes("context-actor"),
  );
  const externals = displayNodes.filter((node) =>
    node.tags.includes("context-external"),
  );
  const obligations =
    candidate?.architectureObligations ??
    [...new Set(journeys.flatMap((item) => item.architectureObligations))];
  const journeyCoverage =
    candidate?.journeyCoverage ??
    journeys.map((journey) => ({
      id: journey.id,
      name: journey.name,
      interactionCount: journey.paths.reduce(
        (count, path) => count + path.interactions.length,
        0,
      ),
    }));

  return (
    <section className="system-context-studio" data-testid="system-context-studio">
      <header className="system-context-hero">
        <div>
          <span className="eyebrow">
            <Network size={14} /> First-class lifecycle stage
          </span>
          <h2>System Context &amp; Interaction Boundaries</h2>
          <p>
            Promote accepted requirements and business journeys into a clear
            system boundary. Internal components remain deliberately hidden
            until Logical Application decomposition.
          </p>
        </div>
        <div className="system-context-hero__status">
          <span>{preview ? "Candidate preview" : "Canonical context"}</span>
          <strong>
            {displayNodes.length} participants · {displayEdges.length}{" "}
            interactions
          </strong>
          <small>{journeys.length} approved journey(s) supply lineage</small>
        </div>
      </header>

      <section className="context-provenance-strip">
        <ShieldCheck size={17} />
        <div>
          <strong>Compiled by CAMBRIDGE-SA-1.0 through the AIW Architecture Brain</strong>
          <span>
            {intelligence.requirements.filter((item) => item.status === "accepted")
              .length} accepted requirements ·{" "}
            {intelligence.stakeholders.filter((item) => item.status === "accepted")
              .length} stakeholders · CAMBRIDGE-SA-1.0 · source evidence
            preserved
          </span>
          {candidate?.brainReceipt ? (
            <small>
              {candidate.brainReceipt.manifest.kernelVersion} ·{" "}
              {candidate.brainReceipt.contextFingerprint} · human acceptance
              required
            </small>
          ) : null}
        </div>
        {openQuestions.length ? (
          <b>
            <AlertTriangle size={13} /> {openQuestions.length} high-impact
            question(s)
          </b>
        ) : (
          <b className="is-ready">
            <CheckCircle2 size={13} /> No critical context question
          </b>
        )}
      </section>

      {error ? (
        <div className="system-context-error" role="alert">
          <AlertTriangle size={15} /> {error}
        </div>
      ) : null}

      <div className="system-context-layout">
        <section className="context-canvas-preview" aria-label="System context preview">
          <div className="context-actors-column">
            <span>People &amp; organisations</span>
            {actors.map((node: ArchitectureNode) => (
              <article key={node.id}>
                <UserRound size={16} />
                <div>
                  <strong>{node.label}</strong>
                  <small>{String(node.description ?? "Context actor")}</small>
                </div>
              </article>
            ))}
          </div>
          <div className="context-system-boundary">
            <span>System of interest</span>
            <article>
              <Sparkles size={20} />
              <strong>{system?.label ?? project.name}</strong>
              <p>{system?.description ?? "Solution boundary"}</p>
              <small>Internal decomposition begins in Logical Application</small>
            </article>
            <div className="context-flow-lines">
              {displayEdges.slice(0, 6).map((edge) => (
                <span key={edge.id}>
                  <ArrowRight size={12} /> {edge.label ?? "interacts"}
                </span>
              ))}
            </div>
          </div>
          <div className="context-external-column">
            <span>External systems</span>
            {externals.map((node: ArchitectureNode) => (
              <article key={node.id}>
                <ExternalLink size={16} />
                <div>
                  <strong>{node.label}</strong>
                  <small>
                    {String(node.description ?? "External dependency")}
                  </small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="context-obligations">
          <header>
            <div>
              <span>Context obligations</span>
              <strong>What deeper design must preserve</strong>
            </div>
            <Workflow size={18} />
          </header>
          {obligations.slice(0, 9).map((item) => (
            <div key={item}>
              <CheckCircle2 size={14} />
              <span>{item}</span>
            </div>
          ))}
          <footer>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                if (preview) setPreview(false);
                else void compilePreview();
              }}
              disabled={loading || (preview && !existingContextNodes.length)}
            >
              {loading
                ? "Compiling preview…"
                : preview
                  ? "Compare existing context"
                  : "Regenerate preview"}
            </button>
            {preview ? (
              <button
                type="button"
                className="button button--primary"
                onClick={() => void applyContext()}
                disabled={!candidate || applying}
              >
                <CheckCircle2 size={15} />
                {applying ? "Accepting…" : "Accept context model"}
              </button>
            ) : null}
          </footer>
        </aside>
      </div>

      <section className="context-journey-coverage">
        <header>
          <div>
            <span className="eyebrow">Journey coverage</span>
            <h3>Prove how the context enables the major flows</h3>
          </div>
          <div>
            {journeyCoverage.map((item) => (
              <button
                type="button"
                key={item.id}
                className={activeJourney?.id === item.id ? "is-active" : ""}
                onClick={() => setActiveJourneyId(item.id)}
              >
                {item.name}
                <small>{item.interactionCount} steps</small>
              </button>
            ))}
          </div>
        </header>
        {activeJourney ? (
          <JourneySequenceDiagram journey={activeJourney} compact />
        ) : null}
      </section>
    </section>
  );
}
