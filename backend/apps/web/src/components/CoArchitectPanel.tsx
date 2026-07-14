import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUp,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  CircleOff,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { ArchitectureStage } from "@aiw/domain";
import { useWorkspaceStore } from "../store/workspaceStore";
import { postJson } from "../lib/apiClient";

interface Answer {
  answer: string;
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
  };
  mode: "llm-assisted" | "deterministic-fallback";
}

const prompts = [
  "What is the most important next design decision?",
  "What is missing from the selected scope?",
  "Explain why the leading architecture style fits.",
  "Which obligations could block approval?",
];

const stages: ArchitectureStage[] = [
  "designIntent",
  "logicalApplication",
  "applicationRealization",
  "logicalTechnology",
  "physicalTechnology",
  "validationRealization",
];

export function CoArchitectPanel() {
  const project = useWorkspaceStore((state) => state.project);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const recordExchange = useWorkspaceStore(
    (state) => state.recordCoArchitectExchange,
  );
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const session = useMemo(
    () =>
      project.coArchitectSessions.find(
        (item) =>
          item.stage === project.activeStage &&
          item.scopeNodeId === (selectedNodeId ?? undefined),
      ),
    [project.coArchitectSessions, project.activeStage, selectedNodeId],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt;
      setOpen(true);
      if (prompt) setQuestion(prompt);
    };
    window.addEventListener("aiw:open-coarchitect", handler);
    return () => window.removeEventListener("aiw:open-coarchitect", handler);
  }, []);

  const ask = async (text = question) => {
    const value = text.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    setQuestion(value);
    try {
      const result = await postJson<Answer>("/api/co-architect/ask", {
        project,
        question: value,
        selectedNodeId: selectedNodeId ?? undefined,
        dataClassification: "internal",
      });
      setAnswer(result);
      recordExchange(
        value,
        result.answer,
        result.citedRecordIds,
        result.modelTrace,
      );
      setQuestion("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Co-architect request failed.",
      );
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
      if (
        project.activeStage === "designIntent" ||
        project.activeStage === "validationRealization"
      )
        setActiveStage("logicalApplication");
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
    if (
      [
        "synthesis",
        "knowledge",
        "governance",
        "collaboration",
        "drift",
        "operations",
      ].includes(target)
    )
      setWorkspaceMode(target as any);
  };

  return (
    <aside className={`coarchitect-panel ${open ? "is-open" : ""}`}>
      <button
        className="coarchitect-toggle"
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          <BrainCircuit size={18} />
          <strong>AI Co-Architect</strong>
          <small>
            {answer?.mode === "llm-assisted"
              ? `${answer.modelTrace?.providerId} · ${answer.modelTrace?.model}`
              : answer
                ? "Governed offline mode"
                : `${session?.messages.length ?? 0} saved messages`}
          </small>
        </span>
        {open ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
      </button>
      {open ? (
        <div className="coarchitect-body">
          <div className="coarchitect-context">
            <Sparkles size={14} />
            <span>
              {project.activeStage}
              {selectedNodeId
                ? ` · selected scope ${selectedNodeId}`
                : " · whole view"}
            </span>
          </div>
          <div className="coarchitect-prompts">
            {prompts.map((item) => (
              <button key={item} onClick={() => void ask(item)}>
                {item}
              </button>
            ))}
          </div>
          {session?.messages.length ? (
            <div
              className="coarchitect-history"
              aria-label="Saved co-architect conversation"
            >
              {session.messages.slice(-8).map((message) => (
                <article
                  key={message.id}
                  className={`coarchitect-message ${message.role}`}
                >
                  <strong>
                    {message.role === "user" ? "You" : "Co-Architect"}
                  </strong>
                  <p>{message.content}</p>
                  {message.citedRecordIds.length ? (
                    <div className="coarchitect-citations">
                      {message.citedRecordIds.slice(0, 5).map((id) => (
                        <span key={id}>{id}</span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
          {answer?.suggestedNextActions.length ? (
            <div className="coarchitect-actions">
              {answer.suggestedNextActions.map((item) => (
                <button
                  key={`${item.title}-${item.target}`}
                  onClick={() => executeAction(item.target)}
                >
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.rationale}</small>
                  </span>
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>
          ) : null}
          {error ? (
            <div className="coarchitect-error">
              <CircleOff size={14} />
              {error}
            </div>
          ) : null}
          <div className="coarchitect-input">
            <textarea
              rows={2}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about the current phase, selected component, recommendation or trade-off…"
            />
            <button
              disabled={loading || !question.trim()}
              onClick={() => void ask()}
            >
              {loading ? (
                <Loader2 className="spin" size={17} />
              ) : (
                <ArrowUp size={17} />
              )}
            </button>
          </div>
          <small className="coarchitect-boundary">
            The conversation and model trace are stored with the governed
            project. The model explains and proposes; deterministic controls and
            your approval remain authoritative.
          </small>
        </div>
      ) : null}
    </aside>
  );
}
