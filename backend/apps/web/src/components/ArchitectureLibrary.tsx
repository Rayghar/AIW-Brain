import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Blocks,
  BookOpen,
  CheckCircle2,
  Component,
  Eye,
  GitBranch,
  GripVertical,
  Layers3,
  Search,
  ShieldQuestion,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { contextualLibrary } from "@aiw/engine";
import { evaluateKnowledgeAuthority, type DesignLibraryRecord, type Point } from "@aiw/domain";
import {
  getStageDesignProcess,
  stagePatternIdsForStyle,
  styleAlignedRecordIds,
} from "../lib/designStudioProcess";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useBrainAliveSignals } from "../brain/useBrainAliveSignals";
import { LibrarySignalChips } from "./brain/LibrarySignalChips";

export const AIW_LIBRARY_MIME = "application/x-aiw-library-record";

type LibraryTab = "style" | "pattern" | "component" | "anti-pattern" | "template";
type LibraryRecordWithScore = DesignLibraryRecord & {
  recommendationScore: number;
  recommendationReason: string;
};

function previewGlyph(record: DesignLibraryRecord) {
  if (record.recordType === "anti-pattern")
    return <div className="library-mini-risk"><AlertTriangle size={17} /></div>;
  if (record.recordType === "style")
    return (
      <div className="library-mini-style">
        <span />
        <span />
        <span />
      </div>
    );
  if (record.depiction.shape === "cylinder")
    return <div className="library-mini-cylinder" />;
  if (record.depiction.shape === "boundary")
    return (
      <div className="library-mini-boundary">
        <span />
        <span />
      </div>
    );
  if (record.depiction.previewKind.includes("gateway"))
    return (
      <div className="library-mini-topology">
        <span />
        <b />
        <i />
        <i />
      </div>
    );
  if (record.depiction.previewKind.includes("outbox"))
    return (
      <div className="library-mini-topology">
        <span />
        <b />
        <i />
      </div>
    );
  if (record.depiction.shape === "event")
    return <div className="library-mini-event">◆</div>;
  return (
    <div className="library-mini-card">
      <span />
      <small />
    </div>
  );
}

function QualityProfile({ impacts }: { impacts: Record<string, number> }) {
  const entries = Object.entries(impacts)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 6);
  if (!entries.length)
    return (
      <div className="library-empty-detail">
        Contextual impact is calculated after placement.
      </div>
    );
  return (
    <div className="quality-profile">
      {entries.map(([name, value]) => (
        <div key={name}>
          <span>{name}</span>
          <div>
            <i
              className={value < 0 ? "negative" : ""}
              style={{
                width: `${Math.min(100, Math.max(8, Math.abs(value) * 20))}%`,
              }}
            />
          </div>
          <b>
            {value > 0 ? "+" : ""}
            {value}
          </b>
        </div>
      ))}
    </div>
  );
}

function tabIcon(tab: LibraryTab) {
  if (tab === "style") return <Layers3 size={13} />;
  if (tab === "pattern") return <BookOpen size={13} />;
  if (tab === "component") return <Blocks size={13} />;
  if (tab === "anti-pattern") return <AlertTriangle size={13} />;
  return <Component size={13} />;
}

export function ArchitectureLibrary() {
  const project = useWorkspaceStore((state) => state.project);
  const library = useWorkspaceStore((state) => state.library);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const previewDrop = useWorkspaceStore((state) => state.previewLibraryDrop);
  const acceptStyle = useWorkspaceStore(
    (state) => state.acceptStyleRecommendation,
  );
  const setPatternStatus = useWorkspaceStore((state) => state.setPatternStatus);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const intelligence = useWorkspaceStore((state) => state.intelligence);
  const stage = project.activeStage;
  const stageProcess = useMemo(
    () => getStageDesignProcess(project, library, stage),
    [project, library, stage],
  );
  const activeStyleIds = project.styleDecisions
    .filter(
      (item) =>
        item.status === "accepted" &&
        (item.stage === stage ||
          item.stage === "logicalApplication" ||
          item.stage === "applicationRealization"),
    )
    .map((item) => item.styleId);
  const stageAlignedPatternIds = useMemo(
    () => new Set(stagePatternIdsForStyle(library, stage, activeStyleIds)),
    [library, stage, activeStyleIds.join("|")],
  );
  const styleAlignedIds = useMemo(
    () => new Set(styleAlignedRecordIds(project, stage)),
    [project, stage],
  );
  const [tab, setTab] = useState<LibraryTab>(
    activeStyleIds.length ? "pattern" : "style",
  );
  const [query, setQuery] = useState("");
  const [recommendedOnly, setRecommendedOnly] = useState(false);
  const [styleAlignedOnly, setStyleAlignedOnly] = useState(true);
  const [inspected, setInspected] = useState<DesignLibraryRecord | null>(null);
  const [authorityNotice, setAuthorityNotice] = useState("");
  const brain = useBrainAliveSignals({
    project,
    library,
    selectedNodeId,
    selectedObjectId: selectedNodeId,
    activeLifecycleStage: project.activeStage,
  });

  const records = useMemo<LibraryRecordWithScore[]>(() => {
    const kernelScores = new Map(
      (intelligence?.suggestedComponents ?? []).map((item) => [item.id, item]),
    );
    return contextualLibrary(project, library, selectedNodeId ?? undefined)
      .map((record) => {
        const kernel = kernelScores.get(record.id);
        const activeStyleBoost =
          record.recordType === "pattern" &&
          stageAlignedPatternIds.has(record.id)
            ? 12
            : 0;
        const componentBoost =
          record.recordType === "component" && styleAlignedIds.has(record.id)
            ? 10
            : 0;
        const styleBoost =
          record.recordType === "style" &&
          stageProcess.preferredStyleIds.includes(record.id)
            ? 10
            : 0;
        return kernel
          ? {
              ...record,
              recommendationScore: Math.min(
                100,
                kernel.score + activeStyleBoost + componentBoost + styleBoost,
              ),
              recommendationReason: kernel.reason,
            }
          : {
              ...record,
              recommendationScore: Math.min(
                100,
                record.recommendationScore +
                  activeStyleBoost +
                  componentBoost +
                  styleBoost,
              ),
              recommendationReason: record.recommendationReason,
            };
      })
      .sort(
        (a, b) =>
          b.recommendationScore - a.recommendationScore ||
          a.name.localeCompare(b.name),
      );
  }, [
    project,
    library,
    selectedNodeId,
    intelligence,
    stageAlignedPatternIds,
    styleAlignedIds,
    stageProcess.preferredStyleIds,
  ]);

  const visible = records.filter((record) => {
    if (record.recordType !== tab) return false;
    if (
      query &&
      !`${record.name} ${record.category} ${record.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )
      return false;
    if (recommendedOnly && record.recommendationScore < 65) return false;
    if (!styleAlignedOnly) return true;
    if (record.recordType === "style")
      return (
        !stageProcess.preferredStyleIds.length ||
        stageProcess.preferredStyleIds.includes(record.id)
      );
    if (record.recordType === "pattern")
      return (
        activeStyleIds.length === 0 || stageAlignedPatternIds.has(record.id)
      );
    if (record.recordType === "component")
      return styleAlignedIds.size === 0 || styleAlignedIds.has(record.id);
    return true;
  });

  function beginDrag(event: React.DragEvent, record: DesignLibraryRecord) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      AIW_LIBRARY_MIME,
      JSON.stringify({
        recordId: record.id,
        libraryVersion: record.version,
        requestedStage: project.activeStage,
      }),
    );
    event.dataTransfer.setData("text/plain", record.name);
  }

  function quickPlace(record: DesignLibraryRecord) {
    if (record.recordType === "anti-pattern") {
      setInspected(record);
      setAuthorityNotice("Detection-only knowledge: anti-patterns can identify risk and recommend remediation, but cannot mutate the target architecture.");
      return;
    }
    const authority = evaluateKnowledgeAuthority({
      sourceId: record.sourceRecordId ?? record.id,
      state: record.authorityState ?? 'reviewed-advisory',
      requestedUse: 'mutate-model',
      knowledgeReleaseId: record.knowledgeReleaseId,
      evidenceIds: record.evidenceIds,
      approvedBy: record.owner,
      approvedAt: record.approvalStatus === 'approved' ? 'release-bound' : undefined,
    });
    if (!authority.allowed) {
      setAuthorityNotice(authority.reason);
      return;
    }
    setAuthorityNotice(`Applied under ${authority.constitutionVersion} · ${authority.knowledgeReleaseId ?? 'unversioned release'}.`);
    if (record.recordType === "style") {
      acceptStyle(record.id);
      return;
    }
    if (record.recordType === "pattern" && !record.nodeTemplate?.length) {
      setPatternStatus(record.id, "accepted");
      return;
    }
    const stageIndex = project.nodes.filter((node) => node.stage === project.activeStage).length;
    const point: Point = {
      x: 160 + (stageIndex % 4) * 250,
      y: 120 + Math.floor(stageIndex / 4) * 170,
    };
    previewDrop(record.id, point, selectedNodeId ?? undefined);
  }

  function primaryActionLabel(record: DesignLibraryRecord) {
    if (record.recordType === "style") return "Adopt style";
    if (record.recordType === "anti-pattern") return "Inspect detection";
    if (record.recordType === "pattern")
      return record.nodeTemplate?.length
        ? "Preview topology"
        : "Accept pattern";
    if (record.recordType === "template") return "Preview template";
    return "Preview object";
  }

  function recordRelationshipNote(record: DesignLibraryRecord) {
    const notes: string[] = [];
    if (record.requires.length)
      notes.push(`requires ${record.requires.slice(0, 2).join(", ")}`);
    if (record.pairsWellWith.length)
      notes.push(`pairs ${record.pairsWellWith.slice(0, 2).join(", ")}`);
    if (record.conflictsWith.length)
      notes.push(`conflicts ${record.conflictsWith.slice(0, 1).join(", ")}`);
    return notes.join(" · ");
  }

  const currentStyleNames = activeStyleIds
    .map(
      (id) =>
        library.architectureStyles.find((style) => style.id === id)?.name ?? id,
    )
    .slice(0, 3);

  return (
    <aside
      className="architecture-library architecture-library--guided"
      aria-label="Architecture design library"
    >
      <div className="library-header">
        <div>
          <span className="eyebrow">Stage library</span>
          <h3>Architecture Kit</h3>
        </div>
        <div className="library-header-actions">
          <button type="button" className="library-compose-launch" onClick={() => setWorkspaceMode('patterns')} title="Open the Visual Architecture Composition Studio for this stage">
            <GitBranch size={13} /> Compose kit
          </button>
          <span className="library-count">{visible.length}</span>
        </div>
      </div>

      <section className="library-context-card" aria-label="Current design context">
        <div className="library-context-card__primary">
          <span>Current decision</span>
          <strong>
            {currentStyleNames.length
              ? currentStyleNames.join(", ")
              : "Select an architecture style"}
          </strong>
          <small>
            {currentStyleNames.length
              ? "Patterns, objects and interfaces are ranked against the accepted style."
              : "Start with a style after the important drivers and forces are understood."}
          </small>
        </div>
        <details className="library-context-disclosure">
          <summary>
            <SlidersHorizontal size={14} />
            <span>Design context</span>
            <small>{stageProcess.forceQuestions.length} forces</small>
          </summary>
          <div>
            <p><GitBranch size={13} /> Drivers → forces → style → patterns → objects → interfaces → validation</p>
            <ul>
              {stageProcess.forceQuestions.slice(0, 4).map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
        </details>
      </section>

      {authorityNotice ? <div className="library-authority-notice" role="status"><ShieldQuestion size={13} /><span>{authorityNotice}</span></div> : null}

      {intelligence ? (
        <div className="library-kernel-status">
          <Sparkles size={13} />
          <span>Ranked by {intelligence.evidence.knowledgeReleaseId}</span>
          <b>
            {intelligence.context.selectionId ? "Selected scope" : "View scope"}
          </b>
        </div>
      ) : null}
      <label className="library-search">
        <Search size={14} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search stage library…"
        />
      </label>

      <div
        className="library-tabs library-tabs--process"
        role="tablist"
        aria-label="Design library sequence"
      >
        {(["style", "pattern", "component", "anti-pattern", "template"] as LibraryTab[]).map(
          (item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              aria-selected={tab === item}
              aria-label={item === "style" ? "Style decision" : item === "pattern" ? "Patterns" : item === "component" ? "Objects" : item === "anti-pattern" ? "Risks and anti-patterns" : "Templates"}
              onClick={() => setTab(item)}
              title={
                item === "style"
                  ? "Scoped style decisions"
                  : item === "pattern"
                    ? "Pattern DNA and governed composition"
                    : item === "component"
                      ? "Directly placeable stage objects"
                      : item === "anti-pattern"
                        ? "Detection signatures and governed remediation guidance"
                        : "Starter topology templates"
              }
            >
              {tabIcon(item)}
              <span>
                {item === "style"
                  ? "Style decision"
                  : item === "component"
                    ? "Objects"
                    : item === "anti-pattern"
                      ? "Risks"
                      : item.charAt(0).toUpperCase() + item.slice(1)}
              </span>
            </button>
          ),
        )}
      </div>

      <div className={`library-mode-explainer library-mode-explainer--${tab}`}>
        {tab === "style" ? <><SlidersHorizontal size={14}/><span><strong>Styles shape a scope.</strong> Compare forces and trade-offs, then adopt a governed decision. Styles are never dropped as diagram shapes.</span></> : null}
        {tab === "pattern" ? <><GitBranch size={14}/><span><strong>Patterns transform the model.</strong> Inspect Pattern DNA, preview generated topology and obligations, then apply to a selected scope.</span></> : null}
        {tab === "component" ? <><Blocks size={14}/><span><strong>Objects are direct modelling primitives.</strong> Drag or preview specialist components with stage-specific attributes and semantic ports.</span></> : null}
        {tab === "anti-pattern" ? <><AlertTriangle size={14}/><span><strong>Anti-patterns are detection and remediation tools.</strong> Inspect signatures, affected stages, risks and corrective patterns. They cannot be applied as target architecture.</span></> : null}
        {tab === "template" ? <><Component size={14}/><span><strong>Templates are governed starting architectures.</strong> Preview assumptions and generated changes before applying the complete topology.</span></> : null}
      </div>

      <div className="library-filter-row">
        <label>
          <input
            type="checkbox"
            checked={styleAlignedOnly}
            onChange={(event) => setStyleAlignedOnly(event.target.checked)}
          />
          <Sparkles size={13} /> Style-aligned
        </label>
        <label>
          <input
            type="checkbox"
            checked={recommendedOnly}
            onChange={(event) => setRecommendedOnly(event.target.checked)}
          />
          <Sparkles size={13} /> High fit
        </label>
      </div>

      {tab === "component" ? (
        <div className="component-family-strip">
          {stageProcess.objectFamilies.map((family) => (
            <span key={family.label} title={family.purpose}>
              {family.label}
            </span>
          ))}
          {!stageProcess.objectFamilies.length ? (
            <span>Stage artifacts</span>
          ) : null}
        </div>
      ) : null}

      <div className="library-record-list">
        {visible.map((record) => {
          const aligned =
            styleAlignedIds.has(record.id) ||
            stageAlignedPatternIds.has(record.id) ||
            stageProcess.preferredStyleIds.includes(record.id);
          const relationshipNote = recordRelationshipNote(record);
          return (
            <article
              key={record.id}
              className={`library-record library-record--${record.recordType} ${aligned ? "is-aligned" : ""}`}
              draggable={record.recordType !== "style" && record.recordType !== "anti-pattern"}
              onDragStart={(event) => beginDrag(event, record)}
            >
              {record.recordType === "style" ? (
                <span className="library-decision-marker" title="Scoped architecture decision" aria-label={`Style decision ${record.name}`}>
                  <SlidersHorizontal size={14}/>
                </span>
              ) : record.recordType === "anti-pattern" ? (
                <span className="library-risk-marker" title="Detection-only anti-pattern" aria-label={`Anti-pattern ${record.name}`}>
                  <AlertTriangle size={14}/>
                </span>
              ) : (
                <button
                  className="library-drag-handle"
                  title="Drag to the canvas"
                  aria-label={`Drag ${record.name}`}
                >
                  <GripVertical size={15} />
                </button>
              )}
              <button
                className="library-record-main"
                onClick={() => setInspected(record)}
                title={`Inspect ${record.name}`}
              >
                <div className="library-preview">{previewGlyph(record)}</div>
                <div className="library-record-copy">
                  <strong>{record.name}</strong>
                  <small>
                    {record.category} · {record.recordType}
                    {aligned ? " · aligned" : ""}
                  </small>
                  <p>{record.recommendationReason}</p>
                  {relationshipNote ? <em>{relationshipNote}</em> : null}
                </div>
                <span
                  className={
                    record.recommendationScore >= 70 ? "score high" : "score"
                  }
                >
                  {Math.round(record.recommendationScore)}
                </span>
              </button>
              <LibrarySignalChips
                signals={brain.librarySignals.filter((signal) =>
                  signal.patternId === record.id ||
                  signal.styleId === record.id ||
                  signal.objectId === record.id ||
                  signal.sourceId === record.id
                )}
              />
              <div className="library-record-actions">
                <button
                  className="library-record-action-primary"
                  onClick={() => quickPlace(record)}
                  title={primaryActionLabel(record)}
                >
                  {primaryActionLabel(record)}
                </button>
                {record.recordType === "pattern" ? (
                  <button
                    onClick={() => setPatternStatus(record.id, "considering")}
                    title="Mark as a candidate pattern"
                  >
                    Consider
                  </button>
                ) : null}
                <button
                  className="library-inspect"
                  onClick={() => setInspected(record)}
                  title="Inspect attributes, interfaces and obligations"
                >
                  <Eye size={14} />
                </button>
              </div>
            </article>
          );
        })}
        {visible.length === 0 ? (
          <div className="empty-card">
            No {tab} records match this stage. Disable filters or return to the
            previous design step.
          </div>
        ) : null}
      </div>

      <div className="library-legend">
        <span>
          <CheckCircle2 size={12} />
          Valid
        </span>
        <span>
          <AlertTriangle size={12} />
          Trade-off
        </span>
        <span>
          <ShieldQuestion size={12} />
          Policy check
        </span>
      </div>

      {inspected ? (
        <div
          className="library-detail-backdrop"
          onClick={() => setInspected(null)}
        >
          <section
            className="library-detail"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                {previewGlyph(inspected)}
                <span>
                  <small>
                    {inspected.recordType} · {inspected.category}
                  </small>
                  <h3>{inspected.name}</h3>
                </span>
              </div>
              <button onClick={() => setInspected(null)}>
                <X size={17} />
              </button>
            </header>
            <p>{inspected.description}</p>
            <div className="library-detail-meta">
              <span>
                Version <b>{inspected.version}</b>
              </span>
              <span>
                Maturity <b>{inspected.maturity}</b>
              </span>
              <span>
                Owner <b>{inspected.owner}</b>
              </span>
            </div>
            <h4>Attributes and interfaces</h4>
            <div className="library-attribute-grid">
              <section>
                <strong>Attributes</strong>
                {inspected.properties.length ? (
                  <ul>
                    {inspected.properties.slice(0, 6).map((item) => (
                      <li key={item.key}>
                        <b>{item.label}</b>
                        <small>
                          {item.type}
                          {item.required ? " · required" : ""}
                        </small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <small>
                    No editable attributes defined until contextual placement.
                  </small>
                )}
              </section>
              <section>
                <strong>Ports</strong>
                {inspected.depiction.ports.length ? (
                  <ul>
                    {inspected.depiction.ports.map((port) => (
                      <li key={port.id}>
                        <b>{port.label}</b>
                        <small>
                          {port.direction} · {port.semanticTypes.join(", ")}
                        </small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <small>This record has no explicit interface ports.</small>
                )}
              </section>
            </div>
            <h4>Quality-attribute profile</h4>
            <QualityProfile impacts={inspected.qualityAttributeImpact} />
            <div className="library-detail-grid">
              <section>
                <h4>When to use</h4>
                {inspected.whenToUse.length ? (
                  <ul>
                    {inspected.whenToUse.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <small>Evaluated from the active design context.</small>
                )}
              </section>
              <section>
                <h4>When to question</h4>
                {inspected.whenToQuestion.length ? (
                  <ul>
                    {inspected.whenToQuestion.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <small>
                    No universal exclusion; use contextual validation.
                  </small>
                )}
              </section>
              <section>
                <h4>Obligations</h4>
                {inspected.obligations.length ? (
                  <ul>
                    {inspected.obligations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <small>None until contextual properties are selected.</small>
                )}
              </section>
              <section>
                <h4>Relationships</h4>
                <p>
                  <b>Requires:</b> {inspected.requires.join(", ") || "None"}
                </p>
                <p>
                  <b>Pairs with:</b>{" "}
                  {inspected.pairsWellWith.join(", ") || "Contextual"}
                </p>
                <p>
                  <b>Conflicts:</b>{" "}
                  {inspected.conflictsWith.join(", ") ||
                    "No absolute conflicts"}
                </p>
              </section>
            </div>
            <footer>
              <button
                className="button button--secondary"
                onClick={() => setInspected(null)}
              >
                Close
              </button>
              <button
                className="button"
                onClick={() => {
                  quickPlace(inspected);
                  setInspected(null);
                }}
              >
                {primaryActionLabel(inspected)}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </aside>
  );
}
