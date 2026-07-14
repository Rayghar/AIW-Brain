import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Activity,
  Link2,
  Route,
  Sparkles,
  Layers3,
  ListTree,
  MousePointer2,
  Hand,
  BoxSelect,
  Group,
  Frame,
  StickyNote,
  Palette,
  Maximize2,
  Minimize2,
  RotateCcw,
  WandSparkles,
  LayoutDashboard,
  ShieldCheck,
  ServerCog,
  Workflow,
  Eye,
  BookOpenCheck,
  Focus,
  PanelRightOpen,
  PanelRightClose,
  CheckCircle2,
  CircleDotDashed,
  GitBranch,
  Keyboard,
  SlidersHorizontal,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  X,
  Cable,
  MoreHorizontal,
} from "lucide-react";
import {
  createDesignLibrary,
  type ArchitectureNode,
  type ArchitectureEdge,
  type ArchitectureStage,
  type ArchitectureView,
  type ArchitectureViewVersion,
  type DesignLibraryRecord,
  type RelationshipKind,
} from "@aiw/domain";
import { getSemanticConnectionOptions } from "@aiw/engine";
import {
  ArchitectureNodeView,
  type ArchitectureFlowNode,
  type ArchitectureNodeData,
} from "./nodes/ArchitectureNodeView";
import {
  ArchitectureLibrary,
  AIW_LIBRARY_MIME,
} from "../../components/ArchitectureLibrary";
import { ComplianceMonitorPanel } from "../../components/ComplianceMonitorPanel";
import { LibraryDropReview } from "../../components/LibraryDropReview";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { EmbeddedIntelligencePanel } from "../../components/EmbeddedIntelligencePanel";
import { useBrainAliveSignals } from "../../brain/useBrainAliveSignals";
import { CanvasBrainBadges } from "../../components/brain/CanvasBrainBadges";
import { StageHealthChips } from "../../components/brain/StageHealthChips";
import { ConnectionIntelligenceReview } from "../../components/ConnectionIntelligenceReview";
import {
  getNodeVisualStyle,
  semanticVisualStyleForNode,
  type CanvasDensity,
  type CanvasLayoutIntent,
  type CanvasSemanticStyleMode,
  type CanvasToolMode,
} from "../../lib/canvasIntelligence";
import {
  getStageDesignProcess,
  type StageDesignProcess,
} from "../../lib/designStudioProcess";
import {
  addViewComment,
  createArchitectureViewVersion,
  createDefaultArchitectureView,
  createNamedArchitectureView,
  createPresentationExportPayload,
  deriveArchitectureLayers,
  projectNodeIntoView,
  resolveViewVisibleEdgeIds,
  resolveViewVisibleNodeIds,
  toggleLayerVisibility,
} from "@aiw/modelling";
import { InterfaceContractStudio } from "./InterfaceContractStudio";
import { buildArchitecturePdf, buildArchitectureSvg, downloadBlob, svgToPngBlob } from "../../lib/diagramExport";
import "./canvas-view-system.css";

const nodeTypes: NodeTypes = { architectureNode: ArchitectureNodeView };
const stageTitles: Partial<
  Record<ArchitectureStage, { title: string; description: string }>
> = {
  logicalApplication: {
    title: "Logical Application Architecture",
    description:
      "Model domains, responsibilities, actors, information exchanges and logical boundaries without selecting products.",
  },
  applicationRealization: {
    title: "Application Realization Architecture",
    description:
      "Map logical responsibilities to deployable applications, services, modules, APIs, workers and controls.",
  },
  logicalTechnology: {
    title: "Logical Technology Architecture",
    description:
      "Select vendor-neutral capabilities required to realize the application design.",
  },
  physicalTechnology: {
    title: "Physical Technology & Deployment",
    description:
      "Bind logical capabilities to products, environments, regions, runtime and deployment topology.",
  },
};
const previousStage: Partial<Record<ArchitectureStage, ArchitectureStage>> = {
  applicationRealization: "logicalApplication",
  logicalTechnology: "applicationRealization",
  physicalTechnology: "logicalTechnology",
};

const stageStudioCopy: Partial<
  Record<
    ArchitectureStage,
    {
      label: string;
      verb: string;
      canvasHint: string;
      libraryHint: string;
      tools: string[];
      brainPrompt: string;
    }
  >
> = {
  logicalApplication: {
    label: "Logical modelling studio",
    verb: "Shape domains, services, data ownership and boundaries.",
    canvasHint:
      "Use the canvas as the primary work surface. Drag governed objects from the library, connect responsibilities, and let AIW flag coupling risks.",
    libraryHint:
      "Recommended: actors, domains, services, APIs, data stores, integration points and boundary objects.",
    tools: ["Domain", "Service", "API", "Data", "Boundary", "Event"],
    brainPrompt:
      "Review this logical application model. Recommend missing domains, service boundaries, relationships and anti-pattern risks.",
  },
  applicationRealization: {
    label: "Realization studio",
    verb: "Map logical responsibilities into deployable units, APIs and ownership lines.",
    canvasHint:
      "Use lineage from the logical stage, define deployable applications/services, and validate contracts before moving to technology choices.",
    libraryHint:
      "Recommended: deployable units, APIs, modules, workers, adapters, controls and integration contracts.",
    tools: ["Service", "API", "Worker", "Adapter", "Contract", "Owner"],
    brainPrompt:
      "Convert this logical architecture into implementation units. Check ownership, APIs, coupling, transaction boundaries and missing contracts.",
  },
  logicalTechnology: {
    label: "Technology capability studio",
    verb: "Select vendor-neutral technology capabilities aligned to quality drivers.",
    canvasHint:
      "Keep choices logical first: data platform, messaging, identity, observability, integration and runtime capabilities before products.",
    libraryHint:
      "Recommended: runtime, data, messaging, identity, observability, policy and integration capabilities.",
    tools: [
      "Runtime",
      "Data",
      "Messaging",
      "Identity",
      "Observability",
      "Policy",
    ],
    brainPrompt:
      "Assess technology capabilities against the active quality drivers and explain trade-offs before any product binding.",
  },
  physicalTechnology: {
    label: "Deployment topology studio",
    verb: "Bind capabilities to products, environments, zones and operational topology.",
    canvasHint:
      "Model zones, clusters, network boundaries, runtime services, failover paths, observability and operational dependencies.",
    libraryHint:
      "Recommended: region, environment, cluster, network zone, product, runtime node and monitoring objects.",
    tools: ["Region", "Zone", "Cluster", "Product", "Failover", "Telemetry"],
    brainPrompt:
      "Review deployment topology for resilience, security zones, failure paths, observability and operational readiness.",
  },
};

function edgeLabel(kind: string, label?: string) {
  return label ?? kind.replace(/([A-Z])/g, " $1").trim();
}

const toolDefinitions: Array<{
  id: CanvasToolMode;
  label: string;
  icon: typeof MousePointer2;
  hint: string;
}> = [
  {
    id: "select",
    label: "Select",
    icon: MousePointer2,
    hint: "Select, inspect and edit objects",
  },
  { id: "pan", label: "Pan", icon: Hand, hint: "Move around the canvas" },
  {
    id: "lasso",
    label: "Lasso",
    icon: BoxSelect,
    hint: "Prepare multi-select modelling",
  },
  {
    id: "relationship",
    label: "Relate",
    icon: Route,
    hint: "Create governed relationships",
  },
  {
    id: "group",
    label: "Group",
    icon: Group,
    hint: "Create a logical group or zone",
  },
  {
    id: "boundary",
    label: "Boundary",
    icon: Frame,
    hint: "Add domain, trust or deployment boundaries",
  },
  {
    id: "annotation",
    label: "Note",
    icon: StickyNote,
    hint: "Add explanatory notes",
  },
];

const densityOptions: Array<{ id: CanvasDensity; label: string }> = [
  { id: "executive", label: "Executive" },
  { id: "standard", label: "Standard" },
  { id: "detailed", label: "Detailed" },
  { id: "diagnostic", label: "Diagnostic" },
];

const styleModes: Array<{ id: CanvasSemanticStyleMode; label: string }> = [
  { id: "manual", label: "Manual" },
  { id: "stage", label: "Lifecycle stage" },
  { id: "domain", label: "Domain" },
  { id: "risk", label: "Risk" },
  { id: "data", label: "Data classification" },
  { id: "conformance", label: "Conformance" },
];

const layoutModes: Array<{
  id: CanvasLayoutIntent;
  label: string;
  icon: typeof LayoutDashboard;
  hint: string;
}> = [
  {
    id: "clean",
    label: "Clean",
    icon: LayoutDashboard,
    hint: "External actors → interfaces → services → data/external systems",
  },
  {
    id: "c4",
    label: "C4",
    icon: Layers3,
    hint: "Context, system, container and component communication",
  },
  {
    id: "event-flow",
    label: "Event flow",
    icon: Workflow,
    hint: "Command sources, producers, broker, consumers and read models",
  },
  {
    id: "security",
    label: "Security",
    icon: ShieldCheck,
    hint: "Trust boundaries, sensitive data and policy enforcement",
  },
  {
    id: "deployment",
    label: "Deployment",
    icon: ServerCog,
    hint: "Regions, clusters, runtime services and backing stores",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    icon: Group,
    hint: "Business units, capabilities, projects, technologies and standards",
  },
  {
    id: "conformance",
    label: "Conformance",
    icon: Eye,
    hint: "Intended objects, controls, runtime evidence and findings",
  },
];

function buildStageView(
  project: ReturnType<typeof useWorkspaceStore.getState>["project"],
  name?: string,
): ArchitectureView {
  const names: Partial<Record<ArchitectureStage, string>> = {
    logicalApplication: "Logical Application Architecture",
    applicationRealization: "Application Realization Architecture",
    logicalTechnology: "Logical Technology Architecture",
    physicalTechnology: "Physical Deployment Architecture",
  };
  const stageNodes = project.nodes.filter((node) => node.stage === project.activeStage && node.status !== "deprecated");
  const stageNodeIds = new Set(stageNodes.map((node) => node.id));
  const stageEdges = project.edges.filter((edge) => stageNodeIds.has(edge.sourceId) && stageNodeIds.has(edge.targetId));
  const view = createDefaultArchitectureView({
    projectId: project.id,
    branchId: project.branch.id,
    name: name ?? names[project.activeStage] ?? "Main architecture view",
    createdBy: "local-architect",
  });
  return {
    ...view,
    intent: `Model-derived ${names[project.activeStage] ?? project.activeStage} view`,
    filters: { ...view.filters, stages: [project.activeStage], showFindings: true, showEvidence: true },
    nodeStates: Object.fromEntries(
      stageNodes.map((node) => [
        node.id,
        projectNodeIntoView(node, project.activeStage),
      ]),
    ),
    edgeStates: Object.fromEntries(
      stageEdges.map((edge) => [
        edge.id,
        { edgeId: edge.id, labelVisible: true, routeHint: "smooth" as const },
      ]),
    ),
    layers: deriveArchitectureLayers(stageNodes, stageEdges),
    comments: [],
  };
}

function downloadTextArtifact(
  filename: string,
  content: string,
  mime = "application/json",
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

type StudioPanelKey = "library" | "brain" | "inspector";
type StudioPanelWidths = Record<StudioPanelKey, number>;

const STUDIO_PANEL_DEFAULTS: StudioPanelWidths = {
  library: 360,
  brain: 320,
  inspector: 340,
};
const STUDIO_PANEL_LIMITS: Record<
  StudioPanelKey,
  { min: number; max: number }
> = {
  library: { min: 280, max: 460 },
  brain: { min: 280, max: 420 },
  inspector: { min: 300, max: 460 },
};

function clampPanelWidth(key: StudioPanelKey, value: number) {
  const limit = STUDIO_PANEL_LIMITS[key];
  return Math.max(limit.min, Math.min(limit.max, Math.round(value)));
}

function readStudioPanelWidths(): StudioPanelWidths {
  if (typeof window === "undefined") return STUDIO_PANEL_DEFAULTS;
  try {
    const raw = window.localStorage.getItem("aiw.studio.panelWidths");
    if (!raw) return STUDIO_PANEL_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Record<StudioPanelKey, number>>;
    return {
      library: clampPanelWidth(
        "library",
        Number(parsed.library ?? STUDIO_PANEL_DEFAULTS.library),
      ),
      brain: clampPanelWidth(
        "brain",
        Number(parsed.brain ?? STUDIO_PANEL_DEFAULTS.brain),
      ),
      inspector: clampPanelWidth(
        "inspector",
        Number(parsed.inspector ?? STUDIO_PANEL_DEFAULTS.inspector),
      ),
    };
  } catch {
    return STUDIO_PANEL_DEFAULTS;
  }
}

function StudioPanelFrame({
  panelKey,
  title,
  subtitle,
  width,
  onWidthChange,
  onClose,
  children,
}: {
  panelKey: StudioPanelKey;
  title: string;
  subtitle: string;
  width: number;
  onWidthChange: (key: StudioPanelKey, width: number) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const limits = STUDIO_PANEL_LIMITS[panelKey];
  const dragSide = panelKey === "library" ? "right" : "left";
  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const direction = panelKey === "library" ? 1 : -1;
    const move = (moveEvent: PointerEvent) => {
      onWidthChange(
        panelKey,
        startWidth + (moveEvent.clientX - startX) * direction,
      );
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      document.body.classList.remove("aiw-panel-resizing");
    };
    document.body.classList.add("aiw-panel-resizing");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  };
  return (
    <aside
      className={`resizable-studio-panel resizable-studio-panel--${panelKey} resizable-studio-panel--handle-${dragSide}`}
      style={{ width: `${width}px` }}
      aria-label={`${title} panel`}
    >
      <button
        type="button"
        className={`resizable-studio-panel__drag-handle resizable-studio-panel__drag-handle--${dragSide}`}
        onPointerDown={startResize}
        aria-label={`Drag to resize ${title}`}
        title="Drag to resize panel"
      />
      <header className="resizable-studio-panel__header">
        <div>
          <span className="eyebrow">
            <SlidersHorizontal size={12} /> Resizable panel
          </span>
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </div>
        <button type="button" onClick={onClose} aria-label={`Close ${title}`}>
          ×
        </button>
      </header>
      <label className="resizable-studio-panel__slider">
        <span>Width</span>
        <input
          type="range"
          min={limits.min}
          max={limits.max}
          step={10}
          value={width}
          onChange={(event) =>
            onWidthChange(panelKey, Number(event.target.value))
          }
          aria-label={`Resize ${title}`}
        />
        <b>{width}px</b>
      </label>
      <div className="resizable-studio-panel__body">{children}</div>
    </aside>
  );
}

function StageDesignFlowPanel({
  process,
  onOpenLibrary,
  onOpenBrain,
}: {
  process: StageDesignProcess;
  onOpenLibrary: () => void;
  onOpenBrain: () => void;
}) {
  return (
    <section
      className="stage-design-flow-panel"
      aria-label="Guided architecture design process"
    >
      <header>
        <div>
          <span className="eyebrow">Guided design flow</span>
          <strong>{process.title}</strong>
          <small>{process.principle}</small>
        </div>
        <div className="stage-design-flow-panel__actions">
          <button
            type="button"
            onClick={onOpenLibrary}
            title="Open the curated style, pattern and component library for this stage"
          >
            <BookOpenCheck size={14} /> Library
          </button>
          <button
            type="button"
            onClick={onOpenBrain}
            title="Open deterministic and knowledge-backed critique for this stage"
          >
            <Sparkles size={14} /> Brain
          </button>
        </div>
      </header>
      <div
        className="design-flow-order"
        aria-label="Architecture decision order"
      >
        {process.decisionOrder.map((item, index) => (
          <span key={item}>
            <b>{index + 1}</b>
            {item}
          </span>
        ))}
      </div>
      <div className="design-flow-steps">
        {process.sequence.map((step) => (
          <article
            key={step.id}
            className={`design-flow-step is-${step.status}`}
            title={step.description}
          >
            <span>
              {step.status === "done" ? (
                <CheckCircle2 size={14} />
              ) : (
                <CircleDotDashed size={14} />
              )}
            </span>
            <strong>{step.label}</strong>
            <small>{step.action}</small>
          </article>
        ))}
      </div>
      <div className="design-flow-kits design-flow-kits--refined">
        <article>
          <span>
            <Sparkles size={13} /> Forces
          </span>
          <div>
            {process.forceQuestions.slice(0, 3).map((item) => (
              <b key={item} title={item}>
                {item}
              </b>
            ))}
          </div>
        </article>
        <article>
          <span>
            <GitBranch size={13} /> Component kits
          </span>
          <div>
            {process.objectFamilies.slice(0, 3).map((family) => (
              <b key={family.label} title={family.purpose}>
                {family.label}
              </b>
            ))}
          </div>
        </article>
        <article>
          <span>
            <Route size={13} /> Interfaces
          </span>
          <div>
            {process.interfaceFocus.slice(0, 5).map((item) => (
              <b key={item}>{item}</b>
            ))}
          </div>
        </article>
        <article>
          <span>
            <ShieldCheck size={13} /> Handoff evidence
          </span>
          <div>
            {process.completionEvidence.slice(0, 4).map((item) => (
              <b key={item}>{item}</b>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function CanvasToolRail() {
  const toolMode = useWorkspaceStore((state) => state.canvasToolMode);
  const setToolMode = useWorkspaceStore((state) => state.setCanvasToolMode);
  return (
    <div className="canvas-tool-rail" aria-label="Canvas modelling tools">
      {toolDefinitions.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            className={toolMode === tool.id ? "active" : ""}
            onClick={() => setToolMode(tool.id)}
            title={tool.hint}
          >
            <Icon size={16} />
            <span>{tool.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function CanvasControlDock({
  selectedNode,
}: {
  selectedNode: ArchitectureNode | undefined;
}) {
  const density = useWorkspaceStore((state) => state.canvasDensity);
  const semanticMode = useWorkspaceStore(
    (state) => state.canvasSemanticStyleMode,
  );
  const focusMode = useWorkspaceStore((state) => state.canvasFocusMode);
  const layoutPreview = useWorkspaceStore((state) => state.canvasLayoutPreview);
  const setDensity = useWorkspaceStore((state) => state.setCanvasDensity);
  const setSemanticMode = useWorkspaceStore(
    (state) => state.setCanvasSemanticStyleMode,
  );
  const setFocusMode = useWorkspaceStore((state) => state.setCanvasFocusMode);
  const selectedNodeIds = useWorkspaceStore((state) => state.selectedNodeIds);
  const alignSelectedNodes = useWorkspaceStore(
    (state) => state.alignSelectedNodes,
  );
  const distributeSelectedNodes = useWorkspaceStore(
    (state) => state.distributeSelectedNodes,
  );
  const resizeSelectedNodes = useWorkspaceStore(
    (state) => state.resizeSelectedNodes,
  );
  const applySemanticStyle = useWorkspaceStore(
    (state) => state.applySemanticStyleToCanvas,
  );
  const previewLayout = useWorkspaceStore(
    (state) => state.previewIntelligentLayout,
  );
  const applyLayoutPreview = useWorkspaceStore(
    (state) => state.applyLayoutPreview,
  );
  const cancelLayoutPreview = useWorkspaceStore(
    (state) => state.cancelLayoutPreview,
  );
  const [layoutIntent, setLayoutIntent] = useState<CanvasLayoutIntent>("clean");
  return (
    <section
      className="canvas-control-dock"
      aria-label="Visual modelling controls"
    >
      <header>
        <div>
          <span className="eyebrow">Visual modelling studio</span>
          <strong>Layout, density and semantic styling</strong>
        </div>
        {selectedNode ? (
          <small>Selected: {selectedNode.label}</small>
        ) : (
          <small>No object selected</small>
        )}
      </header>
      <div className="canvas-control-grid">
        <label>
          <span>View density</span>
          <select
            value={density}
            onChange={(event) =>
              setDensity(event.target.value as CanvasDensity)
            }
          >
            {densityOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Style by</span>
          <select
            value={semanticMode}
            onChange={(event) =>
              setSemanticMode(event.target.value as CanvasSemanticStyleMode)
            }
          >
            {styleModes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button button--secondary"
          onClick={() => applySemanticStyle()}
        >
          <Palette size={14} /> Apply semantic palette
        </button>
        <button
          className="button button--secondary"
          aria-pressed={focusMode}
          onClick={() => setFocusMode(!focusMode)}
        >
          <Focus size={14} /> {focusMode ? "Focus on" : "Focus off"}
        </button>
      </div>
      <div className="layout-mode-strip">
        {layoutModes.map((layout) => {
          const Icon = layout.icon;
          return (
            <button
              key={layout.id}
              className={layoutIntent === layout.id ? "active" : ""}
              onClick={() => setLayoutIntent(layout.id)}
              title={layout.hint}
            >
              <Icon size={14} />
              {layout.label}
            </button>
          );
        })}
      </div>
      <div className="layout-preview-actions">
        <button
          className="button button--ai"
          onClick={() => previewLayout(layoutIntent, true)}
        >
          <WandSparkles size={14} /> Preview intelligent layout
        </button>
        {layoutPreview ? (
          <>
            <button
              className="button button--secondary"
              onClick={applyLayoutPreview}
            >
              Apply preview
            </button>
            <button
              className="button button--ghost"
              onClick={cancelLayoutPreview}
            >
              Cancel
            </button>
          </>
        ) : null}
      </div>
      {layoutPreview ? (
        <p className="layout-preview-summary">
          <strong>{layoutPreview.title}</strong> · {layoutPreview.summary}
        </p>
      ) : null}
      <div
        className="canvas-selection-tools"
        aria-label="Selection alignment and sizing"
      >
        <span>{selectedNodeIds.length || 0} selected</span>
        <button
          onClick={() => alignSelectedNodes("left")}
          disabled={selectedNodeIds.length < 2}
        >
          Align left
        </button>
        <button
          onClick={() => alignSelectedNodes("center")}
          disabled={selectedNodeIds.length < 2}
        >
          Center
        </button>
        <button
          onClick={() => alignSelectedNodes("top")}
          disabled={selectedNodeIds.length < 2}
        >
          Align top
        </button>
        <button
          onClick={() => distributeSelectedNodes("horizontal")}
          disabled={selectedNodeIds.length < 3}
        >
          Distribute H
        </button>
        <button
          onClick={() => distributeSelectedNodes("vertical")}
          disabled={selectedNodeIds.length < 3}
        >
          Distribute V
        </button>
        <button
          onClick={() => resizeSelectedNodes({ width: 220, height: 128 })}
          disabled={!selectedNodeIds.length}
        >
          Standard size
        </button>
      </div>
    </section>
  );
}

function CanvasObjectInspector({
  selectedNode,
}: {
  selectedNode: ArchitectureNode | undefined;
}) {
  const updateNodeLabel = useWorkspaceStore((state) => state.updateNodeLabel);
  const updateNodeProperty = useWorkspaceStore(
    (state) => state.updateNodeProperty,
  );
  const updateVisualStyle = useWorkspaceStore(
    (state) => state.updateNodeVisualStyle,
  );
  const resetVisualStyle = useWorkspaceStore(
    (state) => state.resetNodeVisualStyle,
  );
  const resizeNode = useWorkspaceStore((state) => state.resizeNode);
  const autoSizeNode = useWorkspaceStore((state) => state.autoSizeNode);
  const setNodeLocked = useWorkspaceStore((state) => state.setNodeLocked);
  const toggleCollapsed = useWorkspaceStore(
    (state) => state.toggleNodeCollapsed,
  );
  const contextual = useWorkspaceStore((state) => state.contextual);
  const findings = useWorkspaceStore((state) => state.findings);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  if (!selectedNode) {
    return (
      <aside
        className="canvas-inspector canvas-inspector--empty"
        aria-label="Object inspector"
      >
        <button
          className="canvas-inspector-toggle"
          onClick={() => setInspectorOpen(!inspectorOpen)}
        >
          {inspectorOpen ? (
            <PanelRightClose size={14} />
          ) : (
            <PanelRightOpen size={14} />
          )}
        </button>
        {inspectorOpen ? (
          <>
            <span className="eyebrow">Inspector</span>
            <strong>Select an object</strong>
            <p>
              Choose a canvas object to edit design properties, style,
              relationships, patterns, evidence and conformance posture.
            </p>
          </>
        ) : null}
      </aside>
    );
  }
  const visual = getNodeVisualStyle(selectedNode);
  const width = visual.width ?? 188;
  const height = visual.height ?? 108;
  const nodeFindings = findings.filter((finding) =>
    finding.affectedNodeIds.includes(selectedNode.id),
  );
  const localPatterns = contextual.patterns
    .filter(
      (pattern) =>
        !pattern.scopeNodeId || pattern.scopeNodeId === selectedNode.id,
    )
    .slice(0, 4);
  return (
    <aside className="canvas-inspector" aria-label="Object inspector">
      <button
        className="canvas-inspector-toggle"
        onClick={() => setInspectorOpen(!inspectorOpen)}
      >
        {inspectorOpen ? (
          <PanelRightClose size={14} />
        ) : (
          <PanelRightOpen size={14} />
        )}
      </button>
      {inspectorOpen ? (
        <>
          <header>
            <span className="eyebrow">Object inspector</span>
            <input
              value={selectedNode.label}
              onChange={(event) =>
                updateNodeLabel(selectedNode.id, event.target.value)
              }
              aria-label="Object label"
            />
            <small>
              {selectedNode.kind} · {selectedNode.stage}
            </small>
          </header>
          <details open>
            <summary>Overview</summary>
            <label>
              <span>Description</span>
              <textarea
                value={String(
                  selectedNode.properties.description ??
                    selectedNode.description ??
                    "",
                )}
                onChange={(event) =>
                  updateNodeProperty(
                    selectedNode.id,
                    "description",
                    event.target.value,
                  )
                }
                placeholder="What responsibility does this object own?"
              />
            </label>
            <div className="inspector-metrics">
              <span>{nodeFindings.length} finding(s)</span>
              <span>{localPatterns.length} pattern signal(s)</span>
              <span>{selectedNode.tags.length} tag(s)</span>
            </div>
          </details>
          <details open>
            <summary>Style and size</summary>
            <div className="style-grid">
              <label>
                <span>Fill</span>
                <input
                  type="color"
                  value={visual.fill?.startsWith("#") ? visual.fill : "#102331"}
                  onChange={(event) =>
                    updateVisualStyle(selectedNode.id, {
                      fill: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                <span>Border</span>
                <input
                  type="color"
                  value={
                    visual.border?.startsWith("#") ? visual.border : "#2de6bf"
                  }
                  onChange={(event) =>
                    updateVisualStyle(selectedNode.id, {
                      border: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                <span>Text</span>
                <input
                  type="color"
                  value={visual.text?.startsWith("#") ? visual.text : "#edf7ff"}
                  onChange={(event) =>
                    updateVisualStyle(selectedNode.id, {
                      text: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                <span>Shape</span>
                <select
                  value={visual.shape ?? "card"}
                  onChange={(event) =>
                    updateVisualStyle(selectedNode.id, {
                      shape: event.target.value as never,
                    })
                  }
                >
                  <option value="card">Card</option>
                  <option value="rounded">Rounded</option>
                  <option value="container">Container</option>
                  <option value="capsule">Capsule</option>
                  <option value="hex">Hex</option>
                </select>
              </label>
            </div>
            <div className="size-field-grid">
              <label>
                <span>Width</span>
                <input
                  type="number"
                  min={128}
                  max={640}
                  value={width}
                  onChange={(event) =>
                    resizeNode(selectedNode.id, {
                      width: Number(event.target.value),
                      height,
                    })
                  }
                />
              </label>
              <label>
                <span>Height</span>
                <input
                  type="number"
                  min={72}
                  max={460}
                  value={height}
                  onChange={(event) =>
                    resizeNode(selectedNode.id, {
                      width,
                      height: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="inspector-toggle-row">
                <input
                  type="checkbox"
                  checked={Boolean(visual.locked)}
                  onChange={(event) =>
                    setNodeLocked(selectedNode.id, event.target.checked)
                  }
                />
                <span>Lock size and position</span>
              </label>
            </div>
            <div className="resize-controls">
              <button
                onClick={() =>
                  resizeNode(selectedNode.id, { width: width - 32, height })
                }
                disabled={Boolean(visual.locked)}
              >
                <Minimize2 size={13} /> Narrow
              </button>
              <button
                onClick={() =>
                  resizeNode(selectedNode.id, { width: width + 32, height })
                }
                disabled={Boolean(visual.locked)}
              >
                <Maximize2 size={13} /> Wider
              </button>
              <button
                onClick={() =>
                  resizeNode(selectedNode.id, { width, height: height + 28 })
                }
                disabled={Boolean(visual.locked)}
              >
                Taller
              </button>
              <button
                onClick={() => autoSizeNode(selectedNode.id)}
                disabled={Boolean(visual.locked)}
              >
                Auto-fit
              </button>
              <button
                onClick={() =>
                  resizeNode(selectedNode.id, { width: 188, height: 108 })
                }
                disabled={Boolean(visual.locked)}
              >
                <RotateCcw size={13} /> Reset size
              </button>
              <button
                onClick={() => toggleCollapsed(selectedNode.id)}
                disabled={Boolean(visual.locked)}
              >
                {visual.collapsed ? "Expand" : "Collapse"}
              </button>
              <button onClick={() => resetVisualStyle(selectedNode.id)}>
                Reset style
              </button>
            </div>
            <p className="inspector-hint">
              Tip: drag the teal handles around a selected object to resize
              directly on the canvas. Inspector changes affect presentation
              only; architecture meaning stays governed.
            </p>
          </details>
          <details>
            <summary>Architecture intelligence</summary>
            {localPatterns.length ? (
              localPatterns.map((pattern) => (
                <article key={pattern.patternId} className="inspector-card">
                  <strong>{pattern.patternName}</strong>
                  <small>{Math.round(pattern.score)} relevance</small>
                  <p>{pattern.reasons[0]}</p>
                </article>
              ))
            ) : (
              <p>No local pattern recommendations yet.</p>
            )}
          </details>
          <details>
            <summary>Evidence and findings</summary>
            {nodeFindings.length ? (
              nodeFindings.map((finding) => (
                <article key={finding.id} className="inspector-card">
                  <strong>{finding.title}</strong>
                  <small>{finding.severity}</small>
                  <p>{finding.message}</p>
                </article>
              ))
            ) : (
              <p>No deterministic findings currently affect this object.</p>
            )}
          </details>
        </>
      ) : null}
    </aside>
  );
}

interface AccessibleModelWorkbenchProps {
  stage: ArchitectureStage;
  records: DesignLibraryRecord[];
  onClose: () => void;
}

function AccessibleModelWorkbench({
  stage,
  records,
  onClose,
}: AccessibleModelWorkbenchProps) {
  const project = useWorkspaceStore((state) => state.project);
  const findings = useWorkspaceStore((state) => state.findings);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const previewLibraryDrop = useWorkspaceStore(
    (state) => state.previewLibraryDrop,
  );
  const updateNodeLabel = useWorkspaceStore((state) => state.updateNodeLabel);
  const onNodesChange = useWorkspaceStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkspaceStore((state) => state.onEdgesChange);
  const connect = useWorkspaceStore((state) => state.connect);
  const setConnectionKind = useWorkspaceStore(
    (state) => state.setConnectionKind,
  );
  const [recordId, setRecordId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [relationshipKind, setRelationshipKind] =
    useState<RelationshipKind>("communicatesWith");
  const [announcement, setAnnouncement] = useState(
    "Accessible architecture model workbench opened.",
  );

  const nodes = useMemo(
    () => project.nodes.filter((node) => node.stage === stage),
    [project.nodes, stage],
  );
  const nodeIds = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes]);
  const edges = useMemo(
    () =>
      project.edges.filter(
        (edge) => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId),
      ),
    [nodeIds, project.edges],
  );
  const selectedNode = selectedNodeId
    ? nodes.find((node) => node.id === selectedNodeId)
    : undefined;
  const addableRecords = useMemo(
    () => records.filter((record) => record.applicableStages.includes(stage)),
    [records, stage],
  );
  const stageFindings = useMemo(
    () =>
      findings.filter(
        (finding) =>
          finding.affectedNodeIds.some((id) => nodeIds.has(id)) ||
          finding.affectedEdgeIds.some((id) =>
            edges.some((edge) => edge.id === id),
          ),
      ),
    [edges, findings, nodeIds],
  );
  const semanticOptions = useMemo(
    () =>
      sourceId && targetId && sourceId !== targetId
        ? getSemanticConnectionOptions(project, sourceId, targetId)
        : [],
    [project, sourceId, targetId],
  );

  useEffect(() => {
    if (!recordId && addableRecords.length) setRecordId(addableRecords[0]!.id);
  }, [addableRecords, recordId]);

  useEffect(() => {
    if (!nodes.length) {
      setSourceId("");
      setTargetId("");
      return;
    }
    if (!sourceId || !nodeIds.has(sourceId)) setSourceId(nodes[0]!.id);
    if (!targetId || !nodeIds.has(targetId) || targetId === sourceId) {
      setTargetId(nodes.find((node) => node.id !== sourceId)?.id ?? "");
    }
  }, [nodeIds, nodes, sourceId, targetId]);

  useEffect(() => {
    const recommended =
      semanticOptions.find((option) => option.recommended) ??
      semanticOptions[0];
    if (recommended) {
      setRelationshipKind(recommended.kind);
      setConnectionKind(recommended.kind);
    }
  }, [semanticOptions, setConnectionKind]);

  function nextPlacement() {
    const index = nodes.length;
    return {
      x: 160 + (index % 4) * 230,
      y: 120 + Math.floor(index / 4) * 150,
    };
  }

  function reviewPlacement() {
    if (!recordId) return;
    const record = addableRecords.find((item) => item.id === recordId);
    if (!record) return;
    previewLibraryDrop(record.id, nextPlacement(), selectedNodeId ?? undefined);
    setAnnouncement(
      `${record.name} placement review opened. Confirm the semantic preflight before applying it.`,
    );
  }

  function nudgeSelected(deltaX: number, deltaY: number) {
    if (!selectedNode) return;
    const currentPosition = selectedNode.positions[stage] ?? { x: 160, y: 120 };
    const changes: NodeChange[] = [
      {
        id: selectedNode.id,
        type: "position",
        position: {
          x: currentPosition.x + deltaX,
          y: currentPosition.y + deltaY,
        },
      },
    ];
    onNodesChange(changes);
    setAnnouncement(
      `${selectedNode.label} moved ${Math.abs(deltaX || deltaY)} pixels ${deltaX < 0 ? "left" : deltaX > 0 ? "right" : deltaY < 0 ? "up" : "down"}.`,
    );
  }

  function removeNode(node: ArchitectureNode) {
    const confirmed = window.confirm(
      `Remove “${node.label}” from ${project.name}, revision ${project.revision}? Its connected relationships will also be removed.`,
    );
    if (!confirmed) return;
    const changes: NodeChange[] = [{ id: node.id, type: "remove" }];
    onNodesChange(changes);
    setAnnouncement(
      `${node.label} and its connected relationships were removed.`,
    );
  }

  function reviewRelationship() {
    if (!sourceId || !targetId || sourceId === targetId) return;
    setConnectionKind(relationshipKind);
    const connection: Connection = {
      source: sourceId,
      target: targetId,
      sourceHandle: null,
      targetHandle: null,
    };
    connect(connection);
    const source =
      nodes.find((node) => node.id === sourceId)?.label ?? "Source";
    const target =
      nodes.find((node) => node.id === targetId)?.label ?? "target";
    setAnnouncement(
      `Relationship review opened for ${source} to ${target}. Confirm the semantic contract before applying it.`,
    );
  }

  function removeEdge(edge: ArchitectureEdge) {
    const source =
      project.nodes.find((node) => node.id === edge.sourceId)?.label ??
      edge.sourceId;
    const target =
      project.nodes.find((node) => node.id === edge.targetId)?.label ??
      edge.targetId;
    const confirmed = window.confirm(
      `Remove the ${edge.kind} relationship from “${source}” to “${target}” in ${project.name}, revision ${project.revision}?`,
    );
    if (!confirmed) return;
    const changes: EdgeChange[] = [{ id: edge.id, type: "remove" }];
    onEdgesChange(changes);
    setAnnouncement(`Relationship from ${source} to ${target} was removed.`);
  }

  return (
    <section
      className="accessible-model-workbench"
      aria-labelledby="accessible-model-workbench-title"
      data-testid="accessible-model-workbench"
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <header className="accessible-model-workbench__header">
        <div>
          <span className="eyebrow">Accessible architecture workbench</span>
          <h3 id="accessible-model-workbench-title">
            Operate the model without drag and drop
          </h3>
          <p>
            Add, edit, position, connect and remove governed model elements
            using standard controls and a keyboard.
          </p>
        </div>
        <div className="accessible-model-workbench__summary">
          <strong>{nodes.length} objects</strong>
          <span>
            {edges.length} relationships · {stageFindings.length} findings
          </span>
          <button
            type="button"
            className="button button--ghost"
            onClick={onClose}
            aria-label="Close accessible model workbench"
          >
            <X size={14} /> Close
          </button>
        </div>
      </header>

      <div className="accessible-model-workbench__grid">
        <article className="accessible-model-panel accessible-model-panel--add">
          <header>
            <Plus size={16} />
            <div>
              <strong>Add governed content</strong>
              <small>No drag gesture required</small>
            </div>
          </header>
          <label>
            <span>Library record</span>
            <select
              data-testid="accessible-record-select"
              value={recordId}
              onChange={(event) => setRecordId(event.target.value)}
            >
              {addableRecords.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.name} · {record.recordType}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="button button--ai"
            onClick={reviewPlacement}
            disabled={!recordId}
            data-testid="review-accessible-placement"
          >
            <Plus size={14} /> Review placement
          </button>
          <p className="accessible-model-help">
            AIW opens the same semantic preflight used by canvas drag and drop,
            including fit, obligations and blockers.
          </p>
        </article>

        <article className="accessible-model-panel accessible-model-panel--objects">
          <header>
            <ListTree size={16} />
            <div>
              <strong>Architecture objects</strong>
              <small>Select an object to edit or move it</small>
            </div>
          </header>
          {nodes.length ? (
            <div
              className="accessible-model-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Architecture objects table"
            >
              <table className="accessible-model-table">
                <thead>
                  <tr>
                    <th scope="col">Object</th>
                    <th scope="col">Type</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map((node) => (
                    <tr
                      key={node.id}
                      className={
                        selectedNodeId === node.id ? "is-selected" : ""
                      }
                    >
                      <th scope="row">
                        <button
                          type="button"
                          className="accessible-model-link"
                          onClick={() => {
                            selectNode(node.id);
                            setAnnouncement(`${node.label} selected.`);
                          }}
                          aria-current={
                            selectedNodeId === node.id ? "true" : undefined
                          }
                        >
                          {node.label}
                        </button>
                      </th>
                      <td>{node.kind}</td>
                      <td>{node.status}</td>
                      <td>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => removeNode(node)}
                          aria-label={`Remove ${node.label}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state-inline">
              No objects exist in this stage. Add a governed record above.
            </p>
          )}

          {selectedNode ? (
            <div
              className="accessible-model-editor"
              data-testid="accessible-object-editor"
            >
              <label>
                <span>Selected object label</span>
                <input
                  value={selectedNode.label}
                  onChange={(event) =>
                    updateNodeLabel(selectedNode.id, event.target.value)
                  }
                />
              </label>
              <fieldset>
                <legend>Move selected object by 12 pixels</legend>
                <button
                  type="button"
                  onClick={() => nudgeSelected(0, -12)}
                  aria-label={`Move ${selectedNode.label} up`}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => nudgeSelected(-12, 0)}
                  aria-label={`Move ${selectedNode.label} left`}
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => nudgeSelected(12, 0)}
                  aria-label={`Move ${selectedNode.label} right`}
                >
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => nudgeSelected(0, 12)}
                  aria-label={`Move ${selectedNode.label} down`}
                >
                  <ArrowDown size={14} />
                </button>
              </fieldset>
              <small>
                Position:{" "}
                {Math.round(
                  (selectedNode.positions[stage] ?? { x: 0, y: 0 }).x,
                )}
                ,{" "}
                {Math.round(
                  (selectedNode.positions[stage] ?? { x: 0, y: 0 }).y,
                )}
              </small>
            </div>
          ) : null}
        </article>

        <article className="accessible-model-panel accessible-model-panel--relationships">
          <header>
            <Link2 size={16} />
            <div>
              <strong>Relationship composer</strong>
              <small>Create typed connections without handles</small>
            </div>
          </header>
          <div className="accessible-relationship-form">
            <label>
              <span>Source</span>
              <select
                value={sourceId}
                onChange={(event) => setSourceId(event.target.value)}
              >
                <option value="">Choose source</option>
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Target</span>
              <select
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
              >
                <option value="">Choose target</option>
                {nodes
                  .filter((node) => node.id !== sourceId)
                  .map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.label}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>Semantic relationship</span>
              <select
                value={relationshipKind}
                onChange={(event) => {
                  const kind = event.target.value as RelationshipKind;
                  setRelationshipKind(kind);
                  setConnectionKind(kind);
                }}
              >
                {semanticOptions.length ? (
                  semanticOptions.map((option) => (
                    <option key={option.kind} value={option.kind}>
                      {option.label}
                      {option.recommended ? " · recommended" : ""}
                    </option>
                  ))
                ) : (
                  <option value="communicatesWith">Communicates with</option>
                )}
              </select>
            </label>
            {semanticOptions.find(
              (option) => option.kind === relationshipKind,
            ) ? (
              <p className="accessible-model-help">
                {
                  semanticOptions.find(
                    (option) => option.kind === relationshipKind,
                  )!.explanation
                }
              </p>
            ) : null}
            <button
              type="button"
              className="button button--ai"
              onClick={reviewRelationship}
              disabled={!sourceId || !targetId || sourceId === targetId}
              data-testid="review-accessible-relationship"
            >
              <Link2 size={14} /> Review relationship
            </button>
          </div>
          {edges.length ? (
            <ul className="accessible-relationship-list">
              {edges.map((edge) => {
                const source =
                  project.nodes.find((node) => node.id === edge.sourceId)
                    ?.label ?? edge.sourceId;
                const target =
                  project.nodes.find((node) => node.id === edge.targetId)
                    ?.label ?? edge.targetId;
                return (
                  <li key={edge.id}>
                    <span>
                      <strong>{source}</strong>
                      <small>{edgeLabel(edge.kind, edge.label)}</small>
                      <strong>{target}</strong>
                    </span>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => removeEdge(edge)}
                      aria-label={`Remove relationship from ${source} to ${target}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty-state-inline">
              No relationships exist between objects in this stage.
            </p>
          )}
        </article>

        <article className="accessible-model-panel accessible-model-panel--findings">
          <header>
            <ShieldCheck size={16} />
            <div>
              <strong>Contextual findings</strong>
              <small>Navigate directly to affected model elements</small>
            </div>
          </header>
          {stageFindings.length ? (
            <ul className="accessible-finding-list">
              {stageFindings.slice(0, 12).map((finding) => (
                <li key={finding.id}>
                  <div>
                    <span
                      className={`severity severity--${finding.severity.toLowerCase()}`}
                    >
                      {finding.severity}
                    </span>
                    <strong>{finding.title}</strong>
                    <p>{finding.message}</p>
                  </div>
                  {finding.affectedNodeIds.find((id) => nodeIds.has(id)) ? (
                    <button
                      type="button"
                      onClick={() => {
                        const nodeId = finding.affectedNodeIds.find((id) =>
                          nodeIds.has(id),
                        )!;
                        selectNode(nodeId);
                        setAnnouncement(
                          `${finding.title}: affected object selected.`,
                        );
                      }}
                    >
                      Open object
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state-inline">
              No active deterministic findings affect this stage.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}

function IntelligentCanvasInner() {
  const { screenToFlowPosition } = useReactFlow();
  const [dragDisposition, setDragDisposition] = useState<
    "idle" | "allowed" | "blocked"
  >("idle");
  const [showOutline, setShowOutline] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [processOpen, setProcessOpen] = useState(false);
  const [toolDockOpen, setToolDockOpen] = useState(false);
  const [objectInspectorOpen, setObjectInspectorOpen] = useState(false);
  const [brainSignalsOpen, setBrainSignalsOpen] = useState(false);
  const [interfaceStudioOpen, setInterfaceStudioOpen] = useState(false);
  const [viewOptionsOpen, setViewOptionsOpen] = useState(false);
  const [panelWidths, setPanelWidths] = useState<StudioPanelWidths>(() =>
    readStudioPanelWidths(),
  );
  const project = useWorkspaceStore((state) => state.project);
  const upsertArchitectureView = useWorkspaceStore((state) => state.upsertArchitectureView);
  const addArchitectureViewVersion = useWorkspaceStore((state) => state.addArchitectureViewVersion);
  const [architectureViews, setArchitectureViews] = useState<ArchitectureView[]>(() => {
    const initial = useWorkspaceStore.getState().project;
    const stored = (initial.architectureViews ?? []).filter((view) => view.filters.stages?.includes(initial.activeStage));
    return stored.length ? stored : [buildStageView(initial)];
  });
  const [activeViewId, setActiveViewId] = useState(() => architectureViews[0]?.id ?? "main");
  const [viewVersions, setViewVersions] = useState<ArchitectureViewVersion[]>(() => [...(useWorkspaceStore.getState().project.architectureViewVersions ?? [])]);
  const [presentationMode, setPresentationMode] = useState(false);
  const [edgeBundling, setEdgeBundling] = useState(false);
  const [canvasInteractionEnabled, setCanvasInteractionEnabled] =
    useState(true);
  const [newViewName, setNewViewName] = useState("");
  const [newComment, setNewComment] = useState("");
  const library = useWorkspaceStore((state) => state.library);
  const audit = useWorkspaceStore((state) => state.audit);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const selectedNodeIds = useWorkspaceStore((state) => state.selectedNodeIds);
  const connectionKind = useWorkspaceStore((state) => state.connectionKind);
  const setConnectionKind = useWorkspaceStore(
    (state) => state.setConnectionKind,
  );
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const toggleLineage = useWorkspaceStore((state) => state.toggleLineage);
  const previewLibraryDrop = useWorkspaceStore(
    (state) => state.previewLibraryDrop,
  );
  const onNodesChange = useWorkspaceStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkspaceStore((state) => state.onEdgesChange);
  const connect = useWorkspaceStore((state) => state.connect);
  const analyseSelectedImpact = useWorkspaceStore(
    (state) => state.analyseSelectedImpact,
  );
  const invokeAudit = useWorkspaceStore((state) => state.invokeAudit);
  const intelligence = useWorkspaceStore((state) => state.intelligence);
  const canvasToolMode = useWorkspaceStore((state) => state.canvasToolMode);
  const canvasDensity = useWorkspaceStore((state) => state.canvasDensity);
  const canvasSemanticStyleMode = useWorkspaceStore(
    (state) => state.canvasSemanticStyleMode,
  );
  const canvasFocusMode = useWorkspaceStore((state) => state.canvasFocusMode);
  const canvasLayoutPreview = useWorkspaceStore(
    (state) => state.canvasLayoutPreview,
  );

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("aiw:canvas-focus-start", {
        detail: { reason: "canvas-stage-mounted" },
      }),
    );
  }, []);

  const stage = project.activeStage;
  useEffect(() => {
    const stored = (project.architectureViews ?? []).filter((view) => view.filters.stages?.includes(project.activeStage));
    const next = stored.length ? stored : [buildStageView(project)];
    if (!stored.length && next[0]) upsertArchitectureView(next[0]);
    setArchitectureViews(next);
    setActiveViewId((current) => next.some((view) => view.id === current) ? current : next[0]?.id ?? 'main');
    setViewVersions([...(project.architectureViewVersions ?? [])]);
  }, [project.id, project.branch.id, project.activeStage]);

  const brain = useBrainAliveSignals({
    project,
    library,
    selectedNodeId,
    selectedObjectId: selectedNodeId,
    activeLifecycleStage: stage,
  });
  const meta = stageTitles[stage];
  const studioCopy = stageStudioCopy[stage];
  const stageProcess = useMemo(
    () => getStageDesignProcess(project, library, stage),
    [project, library, stage],
  );
  const records = useMemo(() => createDesignLibrary(library), [library]);
  const recordById = useMemo(
    () => new Map(records.map((record) => [record.id, record])),
    [records],
  );
  const selectedNode = selectedNodeId
    ? project.nodes.find((node) => node.id === selectedNodeId)
    : undefined;
  const upstreamStage = previousStage[stage];
  const upstreamCandidates = upstreamStage
    ? project.nodes.filter((node) => node.stage === upstreamStage)
    : [];

  const activeArchitectureView =
    architectureViews.find((view) => view.id === activeViewId) ??
    architectureViews[0] ??
    buildStageView(project);
  const visibleNodeIds = useMemo(
    () => resolveViewVisibleNodeIds(activeArchitectureView, project.nodes),
    [activeArchitectureView, project.nodes],
  );
  const visibleEdgeIds = useMemo(
    () => resolveViewVisibleEdgeIds(activeArchitectureView, project.edges),
    [activeArchitectureView, project.edges],
  );
  const openViewComments = (activeArchitectureView.comments ?? []).filter(
    (comment) => comment.status === "open",
  );
  const stageNodes = project.nodes.filter((node) => node.stage === stage);
  const stageNodeIds = new Set(stageNodes.map((node) => node.id));
  const stageEdges = project.edges.filter(
    (edge) =>
      stageNodeIds.has(edge.sourceId) || stageNodeIds.has(edge.targetId),
  );
  const visualLensSummary = [
    `${stageNodes.length} objects`,
    `${stageEdges.length} relationships`,
    `${brain.canvasSignals.length} signal${brain.canvasSignals.length === 1 ? "" : "s"}`,
  ];

  function updateActiveView(updater: (view: ArchitectureView) => ArchitectureView) {
    const next = { ...updater(activeArchitectureView), updatedAt: new Date().toISOString() };
    setArchitectureViews((views) => views.map((view) => view.id === next.id ? next : view));
    upsertArchitectureView(next);
  }

  function createNewView(kind: ArchitectureView["kind"] = "model") {
    const name =
      newViewName.trim() ||
      `${meta?.title ?? "Architecture"} view ${architectureViews.length + 1}`;
    const view = createNamedArchitectureView({
      projectId: project.id,
      branchId: project.branch.id,
      name,
      kind,
      intent: "Named view created from the pro canvas view system.",
      createdBy: "local-architect",
      base: activeArchitectureView,
    });
    const persistedView = { ...view, layers: deriveArchitectureLayers(project.nodes, project.edges) };
    setArchitectureViews((views) => [...views, persistedView]);
    upsertArchitectureView(persistedView);
    setActiveViewId(view.id);
    setNewViewName("");
  }

  function saveViewVersion() {
    const version = createArchitectureViewVersion(
      activeArchitectureView,
      `${activeArchitectureView.name} v${activeArchitectureView.version + 1}`,
      "local-architect",
    );
    setViewVersions((versions) => [version, ...versions]);
    addArchitectureViewVersion(version);
  }

  function toggleViewLayer(layerId: string) {
    updateActiveView((view) => toggleLayerVisibility(view, layerId));
  }

  function addCanvasComment() {
    const message = newComment.trim();
    if (!message) return;
    updateActiveView((view) =>
      addViewComment(view, {
        targetType: selectedNodeId ? "node" : "view",
        targetId: selectedNodeId ?? view.id,
        author: "local-architect",
        message,
      }),
    );
    setNewComment("");
  }

  async function exportActiveView(format: "json" | "svg" | "png" | "pdf") {
    const slug = activeArchitectureView.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    if (format === "json") {
      downloadTextArtifact(`${slug}.architecture-view.json`, createPresentationExportPayload(activeArchitectureView, "json"));
      return;
    }
    const svg = buildArchitectureSvg(activeArchitectureView.name, nodes, edges);
    if (format === "svg") {
      downloadBlob(`${slug}.svg`, new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      return;
    }
    if (format === "png") {
      downloadBlob(`${slug}.png`, await svgToPngBlob(svg));
      return;
    }
    const pdfBytes = Uint8Array.from(buildArchitecturePdf(activeArchitectureView.name, nodes, edges));
    downloadBlob(`${slug}.pdf`, new Blob([pdfBytes.buffer], { type: "application/pdf" }));
  }

  function toggleCanvasEditing() {
    setCanvasInteractionEnabled((current) => {
      const next = !current;
      if (next) {
        setLibraryOpen(true);
        if (selectedNodeId) {
          setObjectInspectorOpen(true);
          if (typeof window !== "undefined" && window.innerWidth <= 1700) setLibraryOpen(false);
        }
      }
      return next;
    });
  }

  const proposedNodes = useMemo(
    () =>
      audit?.proposals.flatMap((proposal) =>
        proposal.selected
          ? proposal.operations
              .filter((operation) => operation.type === "ADD_NODE")
              .map((operation) => operation.node)
          : [],
      ) ?? [],
    [audit],
  );
  const updatedNodeIds = useMemo(
    () =>
      new Set(
        audit?.proposals.flatMap((proposal) =>
          proposal.selected
            ? proposal.operations
                .filter((operation) => operation.type === "UPDATE_NODE")
                .map((operation) => operation.nodeId)
            : [],
        ) ?? [],
      ),
    [audit],
  );

  function toFlowNode(
    node: ArchitectureNode,
    proposed = false,
    affectedByProposal = false,
  ): ArchitectureFlowNode {
    const sourceRecord =
      recordById.get(String(node.properties.libraryRecordId ?? "")) ??
      records.find(
        (record) =>
          record.componentKind === node.kind &&
          record.applicableStages.includes(node.stage),
      );
    const styleNames = project.styleDecisions
      .filter(
        (item) =>
          item.status === "accepted" &&
          item.stage === stage &&
          (!item.scopeNodeId ||
            item.scopeNodeId === node.id ||
            item.scopeNodeId === node.parentId),
      )
      .map(
        (item) =>
          library.architectureStyles.find((style) => style.id === item.styleId)
            ?.name,
      )
      .filter(Boolean) as string[];
    const patternNames = project.patternSelections
      .filter(
        (item) =>
          item.status === "accepted" &&
          item.stage === stage &&
          (!item.scopeNodeId ||
            item.scopeNodeId === node.id ||
            item.scopeNodeId === node.parentId),
      )
      .map(
        (item) =>
          library.patterns.find((pattern) => pattern.id === item.patternId)
            ?.name,
      )
      .filter(Boolean) as string[];
    const deterministicNodeFindings = project.findings.filter((item) =>
      item.affectedNodeIds.includes(node.id),
    ).length;
    const kernelNodeFindings =
      intelligence?.findings.filter((item) =>
        item.affectedIds.includes(node.id),
      ).length ?? 0;
    const nodeFindings = deterministicNodeFindings + kernelNodeFindings;
    const savedVisualStyle = getNodeVisualStyle(node);
    const semanticVisualStyle = semanticVisualStyleForNode(
      node,
      project.findings,
      canvasSemanticStyleMode,
    );
    const visualStyle =
      canvasSemanticStyleMode === "manual"
        ? savedVisualStyle
        : { ...semanticVisualStyle, ...savedVisualStyle };
    const focusDimmed = Boolean(
      canvasFocusMode &&
      selectedNodeId &&
      selectedNodeId !== node.id &&
      !project.edges.some(
        (edge) =>
          edge.stage === stage &&
          ((edge.sourceId === selectedNodeId && edge.targetId === node.id) ||
            (edge.targetId === selectedNodeId && edge.sourceId === node.id)),
      ),
    );
    const previewOperation = canvasLayoutPreview?.operations.find(
      (operation) => operation.nodeId === node.id,
    );
    const data: ArchitectureNodeData = {
      label: node.label,
      kind: node.kind,
      stage: node.stage,
      tags: node.tags,
      properties: node.properties,
      proposed,
      affectedByProposal:
        affectedByProposal ||
        Boolean(intelligence?.affectedObjects.includes(node.id)),
      styleNames,
      patternNames,
      findingCount: nodeFindings,
      recommendationCount:
        selectedNodeId === node.id
          ? (intelligence?.suggestedComponents.filter(
              (item) => item.score >= 65,
            ).length ?? 0)
          : 0,
      shape: sourceRecord?.depiction.shape ?? "card",
      ports: sourceRecord?.depiction.ports ?? [],
      visualStyle,
      density: canvasDensity,
      focusDimmed,
    };
    if (node.description || node.properties.description)
      data.description = String(
        node.properties.description ?? node.description,
      );
    const flowNode: ArchitectureFlowNode = {
      id: node.id,
      type: "architectureNode",
      position: previewOperation?.next ??
        node.positions[stage] ?? { x: 120, y: 120 },
      data,
      selected: selectedNodeIds.includes(node.id) || selectedNodeId === node.id,
      draggable: !visualStyle.locked,
    };
    const nodeWidth = previewOperation?.width ?? visualStyle.width;
    const nodeHeight = previewOperation?.height ?? visualStyle.height;
    if (nodeWidth || nodeHeight)
      flowNode.style = {
        ...(nodeWidth ? { width: nodeWidth } : {}),
        ...(nodeHeight ? { height: nodeHeight } : {}),
      };
    if (previewOperation) flowNode.className = "is-layout-preview";
    if (
      node.parentId &&
      project.nodes.some(
        (candidate) =>
          candidate.id === node.parentId && candidate.stage === stage,
      )
    ) {
      flowNode.parentId = node.parentId;
      flowNode.extent = "parent";
    }
    return flowNode;
  }

  const nodes = useMemo<Node[]>(
    () => [
      ...project.nodes
        .filter((node) => node.stage === stage && visibleNodeIds.has(node.id))
        .map((node) => toFlowNode(node, false, updatedNodeIds.has(node.id))),
      ...proposedNodes
        .filter((node) => node.stage === stage && visibleNodeIds.has(node.id))
        .map((node) => toFlowNode(node, true)),
    ],
    [
      project.nodes,
      project.styleDecisions,
      project.patternSelections,
      project.findings,
      proposedNodes,
      stage,
      updatedNodeIds,
      selectedNodeId,
      selectedNodeIds,
      records,
      intelligence,
      canvasDensity,
      canvasSemanticStyleMode,
      canvasFocusMode,
      canvasLayoutPreview,
      visibleNodeIds,
    ],
  );

  const edges = useMemo<Edge[]>(
    () =>
      project.edges
        .filter(
          (edge) =>
            edge.stage === stage &&
            visibleEdgeIds.has(edge.id) &&
            visibleNodeIds.has(edge.sourceId) &&
            visibleNodeIds.has(edge.targetId),
        )
        .map((edge) => ({
          id: edge.id,
          source: edge.sourceId,
          target: edge.targetId,
          label: edgeBundling
            ? `${edge.kind} bundle`
            : edgeLabel(edge.kind, edge.label),
          animated: edge.kind === "publishes" || edge.kind === "subscribes",
          type: "smoothstep",
          className: `semantic-edge semantic-edge--${edge.kind} ${edgeBundling ? "is-bundled" : ""} ${intelligence?.affectedObjects.includes(edge.id) || intelligence?.affectedObjects.includes(edge.sourceId) || intelligence?.affectedObjects.includes(edge.targetId) ? "is-intelligence-affected" : ""}`,
        })),
    [
      project.edges,
      stage,
      intelligence,
      edgeBundling,
      visibleEdgeIds,
      visibleNodeIds,
    ],
  );

  if (!meta) return null;

  function getPayload(event: React.DragEvent) {
    try {
      return JSON.parse(event.dataTransfer.getData(AIW_LIBRARY_MIME)) as {
        recordId: string;
      };
    } catch {
      return null;
    }
  }
  function onDragOver(event: React.DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    const hasArchitectureRecord = Array.from(event.dataTransfer.types).includes(
      AIW_LIBRARY_MIME,
    );
    setDragDisposition(hasArchitectureRecord ? "allowed" : "blocked");
  }
  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragDisposition("idle");
    const payload = getPayload(event);
    if (!payload) return;
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    previewLibraryDrop(payload.recordId, position, selectedNodeId ?? undefined);
  }
  function validConnection(connection: Connection | Edge) {
    if (!connection.source || !connection.target) return false;
    return (
      getSemanticConnectionOptions(
        project,
        connection.source,
        connection.target,
      ).length > 0
    );
  }

  const acceptedStyles = project.styleDecisions
    .filter((item) => item.stage === stage && item.status === "accepted")
    .map((item) => ({
      ...item,
      name:
        library.architectureStyles.find((style) => style.id === item.styleId)
          ?.name ?? item.styleId,
    }));

  const updatePanelWidth = (key: StudioPanelKey, width: number) => {
    setPanelWidths((current) => {
      const next = { ...current, [key]: clampPanelWidth(key, width) };
      if (typeof window !== "undefined")
        window.localStorage.setItem(
          "aiw.studio.panelWidths",
          JSON.stringify(next),
        );
      return next;
    });
  };

  const panelGridStyle = {
    "--aiw-library-panel-w": `${panelWidths.library}px`,
    "--aiw-brain-panel-w": `${panelWidths.brain}px`,
    "--aiw-inspector-panel-w": `${panelWidths.inspector}px`,
  } as CSSProperties;

  const [coachmarksDismissed, setCoachmarksDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.localStorage.getItem("aiw.canvasCoachmarks.dismissed") === "true"
    );
  });

  const dismissCanvasCoachmarks = () => {
    setCoachmarksDismissed(true);
    if (typeof window !== "undefined")
      window.localStorage.setItem("aiw.canvasCoachmarks.dismissed", "true");
  };

  const reopenCanvasCoachmarks = () => {
    setCoachmarksDismissed(false);
    if (typeof window !== "undefined")
      window.localStorage.removeItem("aiw.canvasCoachmarks.dismissed");
  };

  return (
    <section
      className={`canvas-page intelligent-canvas-page pro-canvas-view-system canvas-page--canvas-first canvas-mode-${canvasToolMode} canvas-density-${canvasDensity} ${presentationMode ? "is-presentation-mode" : ""}`}
    >
      <div className="canvas-toolbar">
        <div>
          <span className="eyebrow">Intelligent architecture view</span>
          <h2>{meta.title}</h2>
          <p>{meta.description}</p>
        </div>
        <div className="canvas-toolbar-actions">
          <button
            className="button button--secondary"
            disabled={!selectedNodeId}
            onClick={analyseSelectedImpact}
          >
            <Activity size={15} /> Analyse impact
          </button>
          <button
            className="button button--secondary"
            aria-pressed={showOutline}
            onClick={() => setShowOutline((value) => !value)}
          >
            <ListTree size={15} /> Architecture outline
          </button>
          <button className="button button--ai" onClick={invokeAudit}>
            <Sparkles size={15} /> Run evidence-grounded review
          </button>
          <div className="connection-control">
            <Route size={16} />
            <label>
              Default semantic
              <select
                value={connectionKind}
                onChange={(event) =>
                  setConnectionKind(event.target.value as typeof connectionKind)
                }
              >
                <option value="communicatesWith">Communicates with</option>
                <option value="publishes">Publishes</option>
                <option value="subscribes">Subscribes</option>
                <option value="dependsOn">Depends on</option>
                <option value="reads">Reads</option>
                <option value="writes">Writes</option>
                <option value="realizes">Realizes</option>
                <option value="mapsTo">Maps to</option>
                <option value="deployedOn">Deployed on</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <section
        className="stage-studio-ribbon"
        aria-label="Stage-specific design studio controls"
      >
        <div className="stage-studio-ribbon__summary">
          <span className="stage-studio-ribbon__badge">
            {studioCopy?.label ?? "Architecture studio"}
          </span>
          <strong>
            {studioCopy?.verb ??
              "Model, validate and prepare this design view."}
          </strong>
          <small>
            {studioCopy?.canvasHint ??
              "Keep the canvas central; open tools only when needed."}
          </small>
        </div>
        <div className="stage-studio-focus" aria-label="Current model scope">
          <span><Layers3 size={13} /> {project.nodes.filter((node) => node.stage === stage).length} objects</span>
          <span><Route size={13} /> {project.edges.filter((edge) => {
            const source = project.nodes.find((node) => node.id === edge.sourceId);
            const target = project.nodes.find((node) => node.id === edge.targetId);
            return source?.stage === stage || target?.stage === stage;
          }).length} relationships</span>
          <span><ShieldCheck size={13} /> {acceptedStyles.length ? `${acceptedStyles.length} style decision${acceptedStyles.length === 1 ? "" : "s"}` : "Style not selected"}</span>
        </div>
        <StageHealthChips
          signals={brain.stageSignals}
          onOpenInfo={() => setBrainSignalsOpen(true)}
        />
        <div className="stage-studio-actions" aria-label="Workbench panels">
          <button
            type="button"
            className={libraryOpen ? "active" : ""}
            onClick={() => setLibraryOpen((value) => {
              const next = !value;
              if (next && typeof window !== "undefined" && window.innerWidth <= 1700) {
                setObjectInspectorOpen(false);
                setBrainSignalsOpen(false);
              }
              return next;
            })}
            title={studioCopy?.libraryHint ?? "Open stage library"}
          >
            <BookOpenCheck size={15} />
            <span>Library</span>
          </button>
          <button
            type="button"
            className={interfaceStudioOpen ? "active" : ""}
            onClick={() => setInterfaceStudioOpen((value) => !value)}
            title="Define canonical interface and event contracts"
          >
            <Cable size={15} />
            <span>Interfaces</span>
          </button>
          <button
            type="button"
            className={objectInspectorOpen ? "active" : ""}
            onClick={() => setObjectInspectorOpen((value) => {
              const next = !value;
              if (next) {
                setBrainSignalsOpen(false);
                if (typeof window !== "undefined" && window.innerWidth <= 1700) setLibraryOpen(false);
              }
              return next;
            })}
            title="Show selected object inspector"
          >
            <PanelRightOpen size={15} />
            <span>Inspect</span>
          </button>
          <details className="stage-studio-more">
            <summary title="More canvas tools"><MoreHorizontal size={16} /><span>More</span></summary>
            <div>
              <button type="button" className={processOpen ? "active" : ""} onClick={() => setProcessOpen((value) => !value)}><GitBranch size={15} /> Design flow</button>
              <button type="button" className={toolDockOpen ? "active" : ""} onClick={() => setToolDockOpen((value) => !value)}><Palette size={15} /> Canvas tools</button>
              <button type="button" className={brainSignalsOpen ? "active" : ""} onClick={() => setBrainSignalsOpen((value) => {
                const next = !value;
                if (next) {
                  setObjectInspectorOpen(false);
                  if (typeof window !== "undefined" && window.innerWidth <= 1700) setLibraryOpen(false);
                }
                return next;
              })}><Sparkles size={15} /> Brain signals</button>
              <button type="button" className={showOutline ? "active" : ""} onClick={() => setShowOutline((value) => !value)}><ListTree size={15} /> Model outline</button>
              <button type="button" className={viewOptionsOpen ? "active" : ""} onClick={() => setViewOptionsOpen((value) => !value)}><LayoutDashboard size={15} /> Views & export</button>
            </div>
          </details>
        </div>
      </section>

      {processOpen ? (
        <StageDesignFlowPanel
          process={stageProcess}
          onOpenLibrary={() => setLibraryOpen(true)}
          onOpenBrain={() => setBrainSignalsOpen(true)}
        />
      ) : null}

      {viewOptionsOpen ? (
        <section
          className="pro-view-system-panel"
          aria-label="Pro canvas view system"
        >
          <div className="pro-view-system-panel__main">
            <label>
              <span>Named architecture view</span>
              <select
                value={activeArchitectureView.id}
                onChange={(event) => setActiveViewId(event.target.value)}
              >
                {architectureViews.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.name} · {view.kind}
                  </option>
                ))}
              </select>
            </label>
            <input
              value={newViewName}
              onChange={(event) => setNewViewName(event.target.value)}
              placeholder="New named view, e.g. Security board view"
            />
            <button
              className="button button--secondary"
              onClick={() => createNewView("model")}
            >
              Create view
            </button>
            <button
              className="button button--secondary"
              onClick={() => createNewView("executive")}
            >
              Duplicate executive view
            </button>
            <button
              className="button button--secondary"
              onClick={saveViewVersion}
            >
              Save version
            </button>
            <button
              className="button button--secondary"
              aria-pressed={edgeBundling}
              onClick={() => setEdgeBundling((value) => !value)}
            >
              {edgeBundling ? "Unbundle edges" : "Bundle edges"}
            </button>
            <button
              className="button button--secondary"
              aria-pressed={presentationMode}
              onClick={() => setPresentationMode((value) => !value)}
            >
              {presentationMode ? "Exit presentation" : "Presentation mode"}
            </button>
          </div>
          <div className="pro-view-system-panel__exports">
            <button onClick={() => void exportActiveView("json")}>
              Export JSON
            </button>
            <button onClick={() => void exportActiveView("svg")}>Export SVG</button>
            <button onClick={() => void exportActiveView("png")}>Export PNG</button>
            <button onClick={() => void exportActiveView("pdf")}>Export PDF</button>
          </div>
        </section>
      ) : null}

      {viewOptionsOpen ? (
        <section
          className="canvas-layer-comment-system"
          aria-label="Layers, comments and view versions"
        >
          <article>
            <header>
              <span className="eyebrow">Layers</span>
              <strong>
                {activeArchitectureView.layers?.length ?? 0} governed layers
              </strong>
            </header>
            <div className="canvas-layer-list">
              {(activeArchitectureView.layers ?? []).map((layer) => (
                <button
                  key={layer.id}
                  className={layer.visible ? "visible" : "hidden"}
                  onClick={() => toggleViewLayer(layer.id)}
                >
                  <span>{layer.visible ? "Shown" : "Hidden"}</span>
                  <strong>{layer.name}</strong>
                  <small>
                    {layer.nodeIds.length} objects · {layer.edgeIds.length}{" "}
                    edges
                  </small>
                </button>
              ))}
            </div>
          </article>
          <article>
            <header>
              <span className="eyebrow">Comments</span>
              <strong>{openViewComments.length} open</strong>
            </header>
            <div className="canvas-comment-composer">
              <input
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                placeholder={
                  selectedNode
                    ? `Comment on ${selectedNode.label}`
                    : "Comment on this view"
                }
              />
              <button onClick={addCanvasComment}>Add</button>
            </div>
            <div className="canvas-comment-list">
              {openViewComments.slice(0, 4).map((comment) => (
                <p key={comment.id}>
                  <strong>{comment.targetType}</strong> {comment.message}
                </p>
              ))}
              {!openViewComments.length ? (
                <p>No open comments for this view.</p>
              ) : null}
            </div>
          </article>
          <article>
            <header>
              <span className="eyebrow">Versions</span>
              <strong>{viewVersions.length} saved</strong>
            </header>
            <div className="canvas-version-list">
              {viewVersions.slice(0, 4).map((version) => (
                <p key={version.id}>
                  <strong>{version.label}</strong>
                  <small>
                    v{version.version} ·{" "}
                    {new Date(version.createdAt).toLocaleString()}
                  </small>
                </p>
              ))}
              {!viewVersions.length ? (
                <p>Save a view version before board review or export.</p>
              ) : null}
            </div>
          </article>
        </section>
      ) : null}

      {interfaceStudioOpen ? <InterfaceContractStudio onClose={() => setInterfaceStudioOpen(false)} /> : null}
      {toolDockOpen ? <CanvasControlDock selectedNode={selectedNode} /> : null}
      <div className="canvas-mode-banner">
        <span>
          <strong>
            {canvasInteractionEnabled
              ? "Direct manipulation active"
              : "Navigation-safe canvas"}
          </strong>{" "}
          ·{" "}
          {canvasInteractionEnabled
            ? "select a node and drag handles, pan or lasso as needed."
            : "canvas pan/zoom is locked so the global navigation remains responsive. Enable interaction when you need to edit the diagram."}
        </span>
        <button
          type="button"
          className={
            canvasInteractionEnabled
              ? "canvas-interaction-toggle is-on"
              : "canvas-interaction-toggle"
          }
          aria-pressed={canvasInteractionEnabled}
          onClick={toggleCanvasEditing}
        >
          {canvasInteractionEnabled ? "Lock canvas" : "Enable canvas editing"}
        </button>
        <small>
          {selectedNodeIds.length
            ? `${selectedNodeIds.length} selected`
            : "No selection"}{" "}
          · {canvasToolMode} tool · {canvasDensity} density
        </small>
      </div>

      {!coachmarksDismissed ? (
        <section
          className="canvas-coachmark-strip"
          aria-label="Guided canvas editing coachmarks"
        >
          <div className="canvas-coachmark-strip__title">
            <Keyboard size={15} />
            <span>
              <strong>Guided editing path</strong>
              <small>
                Use this once, then hide it when the studio feels familiar.
              </small>
            </span>
          </div>
          <ol>
            <li>
              <b>1</b>
              <span>Open Library and drag a governed object or pattern.</span>
            </li>
            <li>
              <b>2</b>
              <span>Drop to preview semantic fit, obligations and risks.</span>
            </li>
            <li>
              <b>3</b>
              <span>
                Inspect ports, attributes and evidence before handoff.
              </span>
            </li>
          </ol>
          <div className="canvas-coachmark-actions">
            <button type="button" onClick={() => setLibraryOpen(true)}>
              <BookOpenCheck size={13} /> Library
            </button>
            <button
              type="button"
              onClick={() => {
                if (!canvasInteractionEnabled) toggleCanvasEditing();
              }}
            >
              <MousePointer2 size={13} /> Edit mode
            </button>
            <button
              type="button"
              onClick={dismissCanvasCoachmarks}
              aria-label="Hide canvas editing guide"
            >
              <X size={13} /> Hide
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          className="canvas-coachmark-reopen"
          onClick={reopenCanvasCoachmarks}
          title="Show one-time editing coachmarks again"
        >
          <Keyboard size={13} /> Editing guide
        </button>
      )}

      <section
        className={
          canvasInteractionEnabled
            ? "canvas-edit-primer canvas-edit-primer--active"
            : "canvas-edit-primer"
        }
        aria-label="Canvas edit guidance"
      >
        <div>
          <strong>
            {canvasInteractionEnabled
              ? "Edit mode is active"
              : "Browse mode keeps the studio stable"}
          </strong>
          <small>
            {canvasInteractionEnabled
              ? "Drag, connect, resize and inspect objects. Lock the canvas when you return to navigation."
              : "Enable edit mode only when you want to manipulate the diagram. Library, tools and inspection stay one click away."}
          </small>
        </div>
        <button type="button" onClick={() => setLibraryOpen(true)}>
          <BookOpenCheck size={14} /> Library
        </button>
        <button type="button" onClick={() => setToolDockOpen(true)}>
          <Palette size={14} /> Tools
        </button>
        <button type="button" onClick={() => setObjectInspectorOpen(true)}>
          <PanelRightOpen size={14} /> Inspector
        </button>
      </section>

      <section
        className="canvas-visual-lens-bar"
        aria-label="Canvas visual lens and status"
      >
        <div>
          <span className="canvas-visual-lens-bar__kicker">
            <Sparkles size={14} /> AIW design canvas
          </span>
          <strong>{meta.title}</strong>
          <small>{visualLensSummary.join(" · ")}</small>
        </div>
        <div
          className="canvas-visual-lens-bar__chips"
          aria-label="Canvas lens controls"
        >
          <span>
            <Focus size={13} /> {String(canvasFocusMode).replace(/-/g, " ")}
          </span>
          <span>
            <Palette size={13} /> {canvasSemanticStyleMode}
          </span>
          <span>
            <SlidersHorizontal size={13} /> {canvasDensity}
          </span>
          <span
            className={canvasInteractionEnabled ? "is-editing" : "is-browse"}
          >
            {canvasInteractionEnabled ? "Edit mode" : "Browse safe"}
          </span>
        </div>
      </section>

      {showOutline ? (
        <section
          className="canvas-model-tree-board"
          aria-label="Model tree and selection guidance"
        >
          <article>
            <span className="eyebrow">Model tree</span>
            <strong>
              {project.nodes.filter((node) => node.stage === stage).length}{" "}
              objects in this stage
            </strong>
            <div className="canvas-model-tree-board__list">
              {project.nodes
                .filter((node) => node.stage === stage)
                .slice(0, 10)
                .map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    className={selectedNodeId === node.id ? "active" : ""}
                    onClick={() => selectNode(node.id)}
                  >
                    <span>{node.kind}</span>
                    <b>{node.label}</b>
                  </button>
                ))}
              {!project.nodes.some((node) => node.stage === stage) ? (
                <p>
                  No objects yet. Drag a governed library item onto the canvas
                  to start modelling.
                </p>
              ) : null}
            </div>
          </article>
          <article>
            <span className="eyebrow">Selection inspector depth</span>
            <strong>
              {selectedNode ? selectedNode.label : "No object selected"}
            </strong>
            <p>
              {selectedNode
                ? `${selectedNode.kind} · ${selectedNode.tags.join(", ") || "untagged"} · ${project.edges.filter((edge) => edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id).length} relationship(s)`
                : "Select a component, relationship or view to reveal properties, evidence, recommendations and review obligations in the inspector."}
            </p>
          </article>
          <article>
            <span className="eyebrow">Safe canvas mode</span>
            <strong>
              {canvasInteractionEnabled ? "Editing unlocked" : "Browse mode"}
            </strong>
            <p>
              {canvasInteractionEnabled
                ? "Pan, drag and lasso are active. Lock the canvas when navigating between workspaces."
                : "Navigation remains responsive. Unlock only when intentionally editing the diagram."}
            </p>
          </article>
        </section>
      ) : null}

      <div
        className={`canvas-shell canvas-shell--intelligent resizable-studio-layout ${libraryOpen ? "library-open" : "library-closed"} ${objectInspectorOpen ? "inspector-open" : "inspector-closed"} ${brainSignalsOpen ? "brain-open" : "brain-closed"}`}
        style={panelGridStyle}
      >
        <CanvasToolRail />
        {libraryOpen ? (
          <StudioPanelFrame
            panelKey="library"
            title="Architecture Library"
            subtitle="Drag governed styles, patterns and objects into the canvas."
            width={panelWidths.library}
            onWidthChange={updatePanelWidth}
            onClose={() => setLibraryOpen(false)}
          >
            <ArchitectureLibrary />
          </StudioPanelFrame>
        ) : null}
        <div
          className={`flow-container intelligent-flow drop-${dragDisposition}`}
          onDragOver={onDragOver}
          onDragLeave={() => setDragDisposition("idle")}
          onDrop={onDrop}
        >
          <div className="canvas-atmosphere" aria-hidden="true">
            <span>{meta.title}</span>
            <b>
              {canvasInteractionEnabled
                ? "Editable modelling board"
                : "Navigation-safe preview"}
            </b>
          </div>
          <div className="canvas-legend-strip" aria-label="Canvas legend">
            <span>
              <span className="legend-dot legend-dot--object" /> Governed object
            </span>
            <span>
              <span className="legend-dot legend-dot--signal" /> AIW signal
            </span>
            <span>
              <span className="legend-dot legend-dot--port" /> Semantic port
            </span>
          </div>
          <CanvasBrainBadges
            signals={brain.canvasSignals}
            onOpenInfo={() => setBrainSignalsOpen(true)}
          />
          <ReactFlow
            aria-label="Visual architecture canvas"
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={connect}
            isValidConnection={validConnection}
            onNodeClick={(_, node) => {
              selectNode(node.id);
              setBrainSignalsOpen(false);
              setObjectInspectorOpen(true);
            }}
            onPaneClick={() => selectNode(null)}
            fitView
            fitViewOptions={{ padding: 0.14, maxZoom: 1.05 }}
            deleteKeyCode={["Backspace", "Delete"]}
            minZoom={0.36}
            maxZoom={2.4}
            onlyRenderVisibleElements
            nodesDraggable={canvasInteractionEnabled}
            nodesConnectable={canvasInteractionEnabled}
            snapToGrid
            snapGrid={[12, 12]}
            panOnDrag={canvasInteractionEnabled && canvasToolMode === "pan"}
            selectionOnDrag={
              canvasInteractionEnabled && canvasToolMode === "lasso"
            }
            zoomOnScroll={canvasInteractionEnabled}
            zoomOnPinch={canvasInteractionEnabled}
            zoomOnDoubleClick={false}
            preventScrolling={canvasInteractionEnabled}
          >
            <Background gap={24} size={1} />
            <MiniMap pannable zoomable />
            <Controls />
            <div className="style-scope-strip">
              {acceptedStyles.length ? (
                acceptedStyles.map((style) => (
                  <span key={style.id}>
                    <Layers3 size={12} />
                    {style.name}
                    <small>
                      {style.scopeNodeId ? "selected scope" : "view scope"}
                    </small>
                  </span>
                ))
              ) : (
                <span className="empty-style">
                  <Sparkles size={12} />
                  No scoped style accepted yet
                </span>
              )}
            </div>
            <ComplianceMonitorPanel />
            {dragDisposition !== "idle" ? (
              <div className={`drop-state-banner ${dragDisposition}`}>
                {dragDisposition === "allowed"
                  ? "Drop to preview this typed architecture object"
                  : "This object belongs to another architecture view"}
              </div>
            ) : null}
          </ReactFlow>
        </div>
        {brainSignalsOpen ? (
          <StudioPanelFrame
            panelKey="brain"
            title="AIW Brain Signals"
            subtitle="Quiet recommendations, risks and evidence for this stage."
            width={panelWidths.brain}
            onWidthChange={updatePanelWidth}
            onClose={() => setBrainSignalsOpen(false)}
          >
            <EmbeddedIntelligencePanel />
          </StudioPanelFrame>
        ) : null}
        {objectInspectorOpen ? (
          <StudioPanelFrame
            panelKey="inspector"
            title="Object Inspector"
            subtitle={
              selectedNode
                ? `Inspecting ${selectedNode.label}`
                : "Select an object to edit attributes, ports and evidence."
            }
            width={panelWidths.inspector}
            onWidthChange={updatePanelWidth}
            onClose={() => setObjectInspectorOpen(false)}
          >
            <CanvasObjectInspector selectedNode={selectedNode} />
          </StudioPanelFrame>
        ) : null}
      </div>

      {showOutline ? (
        <AccessibleModelWorkbench
          stage={stage}
          records={records}
          onClose={() => setShowOutline(false)}
        />
      ) : null}

      {selectedNode && upstreamStage ? (
        <section className="canvas-lineage-drawer">
          <div>
            <Link2 size={16} />
            <span>
              <strong>Realization lineage for {selectedNode.label}</strong>
              <small>
                Map this element to one or more upstream responsibilities.
              </small>
            </span>
          </div>
          <div>
            {upstreamCandidates.map((candidate) => {
              const linked = selectedNode.lineageFrom.includes(candidate.id);
              return (
                <button
                  className={linked ? "linked" : ""}
                  key={candidate.id}
                  onClick={() => toggleLineage(selectedNode.id, candidate.id)}
                >
                  {candidate.label}
                  <small>{candidate.kind}</small>
                  <b>{linked ? "Mapped" : "Map"}</b>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
      <LibraryDropReview />
      <ConnectionIntelligenceReview />
    </section>
  );
}

export function ProCanvasViewSystem() {
  return (
    <ReactFlowProvider>
      <IntelligentCanvasInner />
    </ReactFlowProvider>
  );
}
