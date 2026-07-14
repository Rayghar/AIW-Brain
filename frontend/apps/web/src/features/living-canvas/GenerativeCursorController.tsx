import { useEffect, useMemo, useRef, useState } from "react";
import {
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDotDashed,
  Eye,
  Focus,
  GitBranch,
  Layers3,
  Lightbulb,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import type { AutonomyMode, GenerativeActionOption } from "@aiw/domain";
import { useWorkspaceStore } from "../../store/workspaceStore";

const authorityLabels: Record<
  GenerativeActionOption["authorityClass"],
  string
> = {
  "deterministic-required": "Required by model rules",
  "deterministic-eligible": "Canonically eligible",
  "knowledge-recommended": "Knowledge-backed",
  "architecture-inference": "Architecture inference",
  "llm-proposed": "LLM proposal",
  "architect-created": "Architect-created",
};

function modeLabel(mode: AutonomyMode) {
  if (mode === "guide") return "Guide";
  if (mode === "compose") return "Compose";
  return "Draft stage";
}

function modeDescription(mode: AutonomyMode) {
  if (mode === "guide") return "One governed decision at a time";
  if (mode === "compose") return "One coherent topology for the selected scope";
  return "One bounded stage draft across unresolved scopes";
}

function actionCounts(action: GenerativeActionOption) {
  const nodes = action.preview.nodes.length;
  const relationships = action.preview.relationships.length;
  const interfaces = action.preview.interfaces.length;
  return `${nodes} object${nodes === 1 ? "" : "s"} · ${relationships} relationship${relationships === 1 ? "" : "s"} · ${interfaces} interface${interfaces === 1 ? "" : "s"}`;
}

export function GenerativeCursorController({
  collapseSignal = 0,
}: {
  collapseSignal?: number;
}) {
  const enabled = useWorkspaceStore((state) => state.livingCanvasEnabled);
  const mode = useWorkspaceStore((state) => state.livingCanvasAutonomyMode);
  const envelope = useWorkspaceStore((state) => state.livingCanvasEnvelope);
  const previewActionId = useWorkspaceStore(
    (state) => state.livingCanvasPreviewActionId,
  );
  const lastAccepted = useWorkspaceStore(
    (state) => state.livingCanvasLastAcceptedAction,
  );
  const assistStatus = useWorkspaceStore(
    (state) => state.livingCanvasAssistStatus,
  );
  const project = useWorkspaceStore((state) => state.project);
  const workspaceMode = useWorkspaceStore((state) => state.workspaceMode);
  const setEnabled = useWorkspaceStore((state) => state.setLivingCanvasEnabled);
  const setMode = useWorkspaceStore(
    (state) => state.setLivingCanvasAutonomyMode,
  );
  const refresh = useWorkspaceStore((state) => state.refreshLivingCanvas);
  const requestLlmAssist = useWorkspaceStore(
    (state) => state.requestLivingCanvasLlmAssist,
  );
  const preview = useWorkspaceStore((state) => state.previewLivingCanvasAction);
  const accept = useWorkspaceStore((state) => state.acceptLivingCanvasAction);
  const reject = useWorkspaceStore((state) => state.rejectLivingCanvasAction);
  const defer = useWorkspaceStore((state) => state.deferLivingCanvasAction);
  const focusNext = useWorkspaceStore(
    (state) => state.focusNextLivingCanvasScope,
  );
  const undoLast = useWorkspaceStore(
    (state) => state.undoLastLivingCanvasAction,
  );
  const [expanded, setExpanded] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);
  const actionSlotsRef = useRef<string[]>([]);
  const pendingShortcutRef = useRef<number | null>(null);

  const changeAutonomyMode = (nextMode: AutonomyMode) => {
    // Mode changes synchronously replace the governed action envelope, while
    // React effects update keyboard slots after the next render. Clear the old
    // slot IDs first so a fast numeric shortcut cannot preview an action from
    // the preceding mode. The shortcut is then queued against the fresh
    // envelope by the key handler below.
    actionSlotsRef.current = [];
    pendingShortcutRef.current = null;
    preview(null);
    setMode(nextMode);
  };

  const selectedAction = useMemo(
    () =>
      envelope?.actions.find((action) => action.id === previewActionId) ?? null,
    [envelope, previewActionId],
  );

  const acceptSelectedAction = () => {
    if (!selectedAction) return;
    const actionId = selectedAction.id;
    accept(actionId);
    // A governed design change should leave the architect looking at the
    // resulting model, not at a stale proposal panel. The canvas owns the
    // subsequent presentation-only smart arrangement.
    setExpanded(false);
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("aiw:auto-arrange-after-sol-change", {
          detail: { actionId },
        }),
      );
    }, 360);
  };

  useEffect(() => {
    if (collapseSignal > 0) setExpanded(false);
  }, [collapseSignal]);

  useEffect(() => {
    const openSolDesign = () => {
      setEnabled(true);
      setExpanded(true);
      setShowAllActions(false);
      useWorkspaceStore.getState().refreshLivingCanvas("candidate-requested");
    };
    window.addEventListener("aiw:open-sol-design", openSolDesign);
    return () =>
      window.removeEventListener("aiw:open-sol-design", openSolDesign);
  }, [setEnabled]);

  useEffect(() => {
    actionSlotsRef.current = (envelope?.actions ?? [])
      .slice(0, 5)
      .map((action) => action.id);
    const pending = pendingShortcutRef.current;
    if (pending === null) return;
    const actionId = actionSlotsRef.current[pending];
    if (!actionId) return;
    pendingShortcutRef.current = null;
    setExpanded(true);
    preview(actionId);
  }, [envelope?.actions, preview]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const snapshot = useWorkspaceStore.getState();
      if ((event.ctrlKey || event.metaKey) && event.code === "Space") {
        event.preventDefault();
        setExpanded(true);
        snapshot.refreshLivingCanvas("candidate-requested");
      }
      if (event.key === "Escape" && snapshot.livingCanvasPreviewActionId)
        snapshot.previewLivingCanvasAction(null);
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches(
        'input, textarea, select, [contenteditable="true"]',
      );
      if (!isTyping && event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        snapshot.focusNextLivingCanvasScope();
      }
      if (
        !isTyping &&
        !event.ctrlKey &&
        !event.metaKey &&
        /^[1-5]$/.test(event.key)
      ) {
        const slot = Number(event.key) - 1;
        // Read the store directly rather than trusting a render-time slot
        // array. Focus and refresh shortcuts can synchronously replace the
        // governed envelope before React commits the next render.
        const currentEnvelope =
          useWorkspaceStore.getState().livingCanvasEnvelope;
        const actionId =
          currentEnvelope?.actions[slot]?.id ?? actionSlotsRef.current[slot];
        event.preventDefault();
        setExpanded(true);
        if (
          actionId &&
          currentEnvelope?.actions.some((action) => action.id === actionId)
        ) {
          useWorkspaceStore.getState().previewLivingCanvasAction(actionId);
        } else {
          pendingShortcutRef.current = slot;
          useWorkspaceStore
            .getState()
            .refreshLivingCanvas("candidate-requested");
          queueMicrotask(() => {
            const latest = useWorkspaceStore.getState();
            const refreshedAction = latest.livingCanvasEnvelope?.actions[slot];
            if (!refreshedAction) return;
            pendingShortcutRef.current = null;
            setExpanded(true);
            latest.previewLivingCanvasAction(refreshedAction.id);
          });
        }
      }
      if (
        !isTyping &&
        (event.ctrlKey || event.metaKey) &&
        event.key === "Enter"
      ) {
        const latest = useWorkspaceStore.getState();
        const action = latest.livingCanvasEnvelope?.actions.find(
          (candidate) => candidate.id === latest.livingCanvasPreviewActionId,
        );
        if (action?.eligibility.eligible) {
          event.preventDefault();
          latest.acceptLivingCanvasAction(action.id);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const progress = envelope?.session.coveragePercent ?? 0;
  const actionCount = envelope?.actions.length ?? 0;
  const visibleActions = showAllActions
    ? (envelope?.actions ?? [])
    : (envelope?.actions ?? []).slice(0, 3);
  const currentScope = envelope?.session.activeScopeId;
  const currentScopeLabel =
    currentScope === "intent:project"
      ? "Project intent"
      : (project.nodes.find((node) => node.id === currentScope)?.label ??
        currentScope ??
        "Current stage");

  return (
    <aside
      className={`generative-cursor sol-design-panel ${enabled ? "is-active" : "is-paused"} ${expanded ? "is-expanded" : "is-collapsed"}`}
      aria-label="Sol Design governed architecture cursor"
      data-testid="generative-cursor-controller"
      data-workspace-mode={workspaceMode}
      data-project-stage={project.activeStage}
      data-context-source={envelope?.context.stage ?? "none"}
      data-context-target={envelope?.context.targetStage ?? "none"}
      data-project-node-count={project.nodes.length}
      data-action-count={actionCount}
    >
      <header>
        <button
          type="button"
          className="generative-cursor__title"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          <span className="generative-cursor__orb">
            <Sparkles size={16} />
          </span>
          <span>
            <strong>Sol Design</strong>
            <span className="sr-only">Living Canvas</span>
            <small>
              {enabled
                ? `${actionCount} governed action${actionCount === 1 ? "" : "s"}`
                : "Paused"}
            </small>
          </span>
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => setEnabled(!enabled)}
          aria-label={
            enabled ? "Pause Living Canvas" : "Activate Living Canvas"
          }
          title={enabled ? "Pause Living Canvas" : "Activate Living Canvas"}
        >
          {enabled ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </header>

      {expanded ? (
        <>
          <div
            className="generative-cursor__mode"
            role="group"
            aria-label="Living Canvas autonomy mode"
          >
            {(["guide", "compose", "draft-stage"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={mode === item ? "active" : ""}
                aria-pressed={mode === item}
                onClick={() => changeAutonomyMode(item)}
                title={modeDescription(item)}
              >
                {item === "guide" ? (
                  <GitBranch size={12} />
                ) : item === "compose" ? (
                  <Layers3 size={12} />
                ) : (
                  <WandSparkles size={12} />
                )}{" "}
                {modeLabel(item)}
              </button>
            ))}
          </div>
          <p className="generative-cursor__mode-description">
            {modeDescription(mode)}
          </p>

          <details
            className="generative-cursor__authority-strip"
            aria-label="Architecture intelligence authority"
          >
            <summary>
              <ShieldCheck size={13} />
              <span>
                <strong>
                  {envelope?.assistance?.mode === "llm-assisted"
                    ? "LLM-enriched, deterministically governed"
                    : envelope?.assistance?.mode === "deterministic-fallback"
                      ? "Deterministic fallback active"
                      : "Canonical deterministic core"}
                </strong>
                <small>View reasoning authority and enrichment controls</small>
              </span>
            </summary>
            <div>
              <p>
                {envelope?.assistance?.notice ??
                  "Eligibility, policy, mutation and validation remain deterministic."}
              </p>
              <button
                type="button"
                onClick={() => void requestLlmAssist()}
                disabled={!enabled || assistStatus === "requesting"}
                data-testid="living-canvas-ask-sol"
              >
                {assistStatus === "requesting" ? (
                  <LoaderCircle size={13} className="spin" />
                ) : (
                  <BrainCircuit size={13} />
                )}{" "}
                {assistStatus === "requesting"
                  ? "Reasoning"
                  : "Enrich with Sol"}
              </button>
            </div>
          </details>

          {envelope?.assistance?.clarifications.length ? (
            <section
              className="generative-cursor__clarifications"
              aria-label="Clarification questions from governed co-creation"
            >
              <details>
                <summary>
                  {envelope.assistance.clarifications.length} clarification
                  question
                  {envelope.assistance.clarifications.length === 1 ? "" : "s"}{" "}
                  before deeper automation
                </summary>
                {envelope.assistance.clarifications.map((item) => (
                  <p key={item.id}>
                    <strong>
                      {item.blocking ? "Blocking: " : ""}
                      {item.question}
                    </strong>
                    <br />
                    {item.whyItMatters}
                  </p>
                ))}
              </details>
            </section>
          ) : null}

          {envelope?.assistance?.knowledgeGapSignals.length ? (
            <section
              className="generative-cursor__knowledge-gaps"
              aria-label="Knowledge gaps detected by governed co-creation"
            >
              <details>
                <summary>
                  {envelope.assistance.knowledgeGapSignals.length} knowledge gap
                  signal
                  {envelope.assistance.knowledgeGapSignals.length === 1
                    ? ""
                    : "s"}{" "}
                  sent to Mind Factory review
                </summary>
                {envelope.assistance.knowledgeGapSignals.map((item) => (
                  <p key={`${item.topic}:${item.suggestedSourceType}`}>
                    <strong>{item.topic}</strong>
                    <br />
                    {item.reason}
                    <small>Suggested source: {item.suggestedSourceType}</small>
                  </p>
                ))}
              </details>
            </section>
          ) : null}

          <section
            className="generative-cursor__session"
            aria-label="Decomposition session progress"
          >
            <div>
              <span>Scope</span>
              <strong>{currentScopeLabel}</strong>
            </div>
            <div>
              <span>Stage coverage</span>
              <strong>{progress}%</strong>
            </div>
            <div
              className="generative-cursor__progress"
              aria-label={`${progress}% stage coverage`}
            >
              <i style={{ width: `${progress}%` }} />
            </div>
            <button
              type="button"
              onClick={focusNext}
              disabled={!enabled || !envelope?.focusQueue.length}
            >
              <Focus size={13} /> Next unresolved scope
            </button>
          </section>

          <div
            className="generative-cursor__actions"
            role="list"
            aria-label="Governed next modelling actions"
          >
            {enabled && envelope?.actions.length ? (
              visibleActions.map((action, index) => (
                <article
                  key={action.id}
                  role="listitem"
                  className={
                    selectedAction?.id === action.id ? "is-previewing" : ""
                  }
                >
                  <button
                    type="button"
                    className="generative-cursor__action-main"
                    onClick={() =>
                      preview(
                        selectedAction?.id === action.id ? null : action.id,
                      )
                    }
                    aria-expanded={selectedAction?.id === action.id}
                  >
                    <span
                      className={`authority-dot authority-dot--${action.authorityClass}`}
                      aria-hidden="true"
                    />
                    <span>
                      <small>
                        {index + 1}. {authorityLabels[action.authorityClass]}
                      </small>
                      <strong>{action.label}</strong>
                      <em>{action.shortDescription}</em>
                      <small className="generative-cursor__action-counts">
                        {actionCounts(action)}
                      </small>
                    </span>
                    <Eye size={14} />
                  </button>
                </article>
              ))
            ) : (
              <div className="generative-cursor__empty">
                <CircleDotDashed size={18} />
                <strong>
                  {enabled ? "No eligible action yet" : "Intelligence paused"}
                </strong>
                <p>
                  {enabled
                    ? "Select a scope or invoke the cursor on the empty canvas."
                    : "Resume to regenerate context-aware actions."}
                </p>
                {enabled ? (
                  <button
                    type="button"
                    onClick={() => refresh("candidate-requested")}
                  >
                    <WandSparkles size={13} /> Recompute
                  </button>
                ) : null}
              </div>
            )}
            {enabled && actionCount > 3 ? (
              <button
                type="button"
                className="generative-cursor__show-more"
                onClick={() => setShowAllActions((value) => !value)}
              >
                {showAllActions
                  ? "Show recommended actions only"
                  : `Show ${actionCount - 3} more actions`}
              </button>
            ) : null}
          </div>

          {selectedAction ? (
            <section
              className="generative-preview-tray"
              aria-label={`Preview ${selectedAction.label}`}
              data-testid="generative-preview-tray"
            >
              <header>
                <span>
                  <Lightbulb size={14} />
                  <strong>Change preview</strong>
                </span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => preview(null)}
                  aria-label="Close change preview"
                >
                  <X size={13} />
                </button>
              </header>
              <h4>{selectedAction.label}</h4>
              <p>{selectedAction.preview.summary}</p>
              <div className="generative-preview-tray__counts">
                {actionCounts(selectedAction)}
              </div>
              <dl>
                <div>
                  <dt>Why now</dt>
                  <dd>{selectedAction.explanation.whyNow}</dd>
                </div>
                <div>
                  <dt>If omitted</dt>
                  <dd>{selectedAction.explanation.ifOmitted}</dd>
                </div>
              </dl>
              {selectedAction.preview.consequenceSummary.length ? (
                <ul>
                  {selectedAction.preview.consequenceSummary
                    .slice(0, 3)
                    .map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                </ul>
              ) : null}
              {selectedAction.authorityClass === "llm-proposed" ? (
                <div className="generative-preview-tray__model-trace">
                  <span>
                    <BrainCircuit size={11} /> Governed model proposal
                  </span>
                  <strong>
                    {envelope?.assistance?.trace
                      ? `${envelope.assistance.trace.providerId} · ${envelope.assistance.trace.model}`
                      : "LLM-ranked deterministic primitives"}
                  </strong>
                  <small>
                    The language model selected and explained prevalidated
                    operations; it cannot write directly to the canonical model.
                  </small>
                </div>
              ) : null}
              {selectedAction.patternRefs.length ||
              selectedAction.qualityEffects.length ? (
                <div className="generative-preview-tray__trace">
                  {selectedAction.patternRefs.length ? (
                    <div>
                      <span>Pattern DNA</span>
                      <strong>{selectedAction.patternRefs.join(" · ")}</strong>
                    </div>
                  ) : null}
                  {selectedAction.qualityEffects.length ? (
                    <div>
                      <span>Quality chain</span>
                      <strong>
                        {selectedAction.qualityEffects
                          .slice(0, 3)
                          .map((item) => `${item.attribute}: ${item.effect}`)
                          .join(" · ")}
                      </strong>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {selectedAction.obligations.length ? (
                <details className="generative-preview-tray__details">
                  <summary>
                    {selectedAction.obligations.length} obligation(s)
                  </summary>
                  <ul>
                    {selectedAction.obligations.map((item) => (
                      <li key={item.id}>
                        {item.mandatory ? "Required: " : ""}
                        {item.title}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
              {selectedAction.explanation.alternatives.length ? (
                <details className="generative-preview-tray__details">
                  <summary>Alternatives considered</summary>
                  <ul>
                    {selectedAction.explanation.alternatives.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
              <div className="generative-preview-tray__validation">
                {selectedAction.preview.validation.map((item) => (
                  <span
                    key={item.ruleId}
                    className={`validation-${item.result}`}
                  >
                    <Check size={11} />
                    {item.message}
                  </span>
                ))}
              </div>
              <div className="generative-preview-tray__actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={acceptSelectedAction}
                  disabled={!selectedAction.eligibility.eligible}
                >
                  <Check size={14} /> Accept change
                </button>
                <button type="button" onClick={() => defer(selectedAction.id)}>
                  Defer
                </button>
                <button type="button" onClick={() => reject(selectedAction.id)}>
                  Reject
                </button>
              </div>
              <small
                className={`generative-preview-tray__authority ${selectedAction.authorityClass === "llm-proposed" ? "generative-preview-tray__authority--hybrid" : ""}`}
              >
                {selectedAction.authorityClass === "llm-proposed"
                  ? "LLM-selected deterministic primitives"
                  : "Deterministic action"}{" "}
                · preview before mutation · human approval required
              </small>
            </section>
          ) : null}

          <footer>
            <button
              type="button"
              onClick={() => refresh("candidate-requested")}
              disabled={!enabled}
            >
              <ShieldCheck size={13} /> Canonical refresh
            </button>
            <button type="button" onClick={undoLast} disabled={!lastAccepted}>
              <RotateCcw size={13} /> Roll back last
            </button>
            <details className="generative-cursor__shortcuts">
              <summary>Keyboard shortcuts</summary>
              <span>
                ⌘/Ctrl+Space refresh · 1–5 preview · Alt+→ next · ⌘/Ctrl+Enter
                accept
              </span>
            </details>
          </footer>
        </>
      ) : null}
    </aside>
  );
}
