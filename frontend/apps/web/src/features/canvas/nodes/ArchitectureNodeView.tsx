import knowledgeJson from "../../../data/knowledge-library.json";
import { memo, type CSSProperties } from "react";
import {
  Handle,
  NodeResizer,
  NodeToolbar,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  Puzzle,
  Package,
  Landmark,
  Container,
  Plug,
  Activity,
  Boxes,
  Braces,
  Cloud,
  Component,
  Cpu,
  Database,
  ExternalLink,
  ArrowRight,
  Globe2,
  Layers3,
  MessageSquareText,
  Radio,
  Server,
  ShieldCheck,
  Sparkles,
  UserRound,
  Workflow,
  Minimize2,
  Maximize2,
  Palette,
} from "lucide-react";
import type { DesignPortDefinition } from "@aiw/domain";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import type {
  CanvasDensity,
  NodeVisualStyle,
} from "../../../lib/canvasIntelligence";

export interface ArchitectureNodeData extends Record<string, unknown> {
  label: string;
  kind: string;
  stage: string;
  tags: string[];
  properties?: Record<string, unknown>;
  proposed?: boolean;
  affectedByProposal?: boolean;
  description?: string;
  styleNames?: string[];
  patternNames?: string[];
  findingCount?: number;
  recommendationCount?: number;
  shape?: string;
  ports?: DesignPortDefinition[];
  visualStyle?: NodeVisualStyle;
  density?: CanvasDensity;
  focusDimmed?: boolean;
  livingCanvasFocus?: boolean;
  livingCanvasActiveFocus?: boolean;
  livingCanvasGhost?: boolean;
  livingCanvasActionCount?: number;
  hasChildren?: boolean;
}

export type ArchitectureFlowNode = Node<
  ArchitectureNodeData,
  "architectureNode"
>;

const GOVERNED_PRESENTATION =
  (
    knowledgeJson as {
      presentation?: Record<string, { icon?: string; tint?: string }>;
    }
  ).presentation ?? {};
const LUCIDE_BY_TOKEN: Record<string, typeof UserRound> = {
  "user-round": UserRound,
  radio: Radio,
  database: Database,
  "external-link": ExternalLink,
  "shield-check": ShieldCheck,
  "globe-2": Globe2,
  boxes: Boxes,
  puzzle: Puzzle,
  package: Package,
  landmark: Landmark,
  container: Container,
  plug: Plug,
};
export function presentationTintFor(kind: string): string | undefined {
  return GOVERNED_PRESENTATION[kind]?.tint;
}

function iconFor(kind: string, tags: string[]): typeof UserRound {
  // Governed presentation tokens first (B5): the visual vocabulary is KB data.
  const preset = GOVERNED_PRESENTATION[kind];
  if (preset?.icon && LUCIDE_BY_TOKEN[preset.icon])
    return LUCIDE_BY_TOKEN[preset.icon] ?? UserRound;
  const text = `${kind} ${tags.join(" ")}`;
  if (/actor/i.test(text)) return UserRound;
  if (/event|broker|message/i.test(text)) return Radio;
  if (/data|store|database/i.test(text)) return Database;
  if (/external/i.test(text)) return ExternalLink;
  if (/control|security|identity/i.test(text)) return ShieldCheck;
  if (/region|globe/i.test(text)) return Globe2;
  if (/runtime|cpu|function/i.test(text)) return Cpu;
  if (/deployment|server|node/i.test(text)) return Server;
  if (/api|interface/i.test(text)) return Braces;
  if (/domain|boundary/i.test(text)) return Layers3;
  if (/technology|cloud/i.test(text)) return Cloud;
  if (/component|module/i.test(text)) return Component;
  if (/observability/i.test(text)) return Activity;
  return Boxes;
}

function portPosition(port: DesignPortDefinition) {
  if (port.position === "left") return Position.Left;
  if (port.position === "right") return Position.Right;
  if (port.position === "top") return Position.Top;
  return Position.Bottom;
}

export const ArchitectureNodeView = memo(
  ({ id, data, selected }: NodeProps<ArchitectureFlowNode>) => {
    const contextual = useWorkspaceStore((state) => state.contextual);
    const setWorkspaceMode = useWorkspaceStore(
      (state) => state.setWorkspaceMode,
    );
    const resizeNode = useWorkspaceStore((state) => state.resizeNode);
    const recommendation = contextual.patterns.find(
      (item) => item.eligible && item.score >= 60,
    );
    const Icon = iconFor(data.kind, data.tags);
    const ports = data.ports?.length
      ? data.ports
      : [
          {
            id: "in",
            label: "Input",
            direction: "input" as const,
            relationshipKinds: [],
            semanticTypes: [],
            position: "left" as const,
          },
          {
            id: "out",
            label: "Output",
            direction: "output" as const,
            relationshipKinds: [],
            semanticTypes: [],
            position: "right" as const,
          },
        ];
    const visual = data.visualStyle ?? {};
    const density = visual.labelDensity ?? data.density ?? "standard";
    const showDiagnosticDetail = Boolean(selected || density === "diagnostic");
    const propertySummary = showDiagnosticDetail
      ? Object.entries(data.properties ?? {})
          .filter(
            ([key, value]) =>
              ![
                "libraryRecordId",
                "libraryVersion",
                "patternId",
                "__visualStyle",
              ].includes(key) &&
              ["string", "number", "boolean"].includes(typeof value),
          )
          .slice(0, density === "diagnostic" ? 4 : 2)
      : [];
    const nodeStyle = {
      "--node-fill": visual.fill,
      "--node-border": visual.border,
      "--node-text": visual.text,
      "--node-accent": visual.accent,
      opacity: visual.opacity,
      zIndex: visual.zIndex,
    } as CSSProperties;
    return (
      <>
        {selected && !visual.locked && !data.livingCanvasGhost ? (
          <NodeResizer
            isVisible
            minWidth={128}
            minHeight={72}
            maxWidth={640}
            maxHeight={460}
            handleClassName="aiw-node-resize-handle"
            lineClassName="aiw-node-resize-line"
            onResizeEnd={(_, params) =>
              resizeNode(id, { width: params.width, height: params.height })
            }
          />
        ) : null}
        <div
          style={nodeStyle}
          className={`architecture-node architecture-node--${visual.shape ?? data.shape ?? "card"} architecture-node--density-${density} ${selected ? "is-selected" : ""} ${data.proposed ? "is-proposed" : ""} ${data.affectedByProposal ? "is-affected" : ""} ${data.focusDimmed ? "is-focus-dimmed" : ""} ${data.livingCanvasFocus ? "is-living-canvas-focus" : ""} ${data.livingCanvasActiveFocus ? "is-living-canvas-active-focus" : ""} ${data.livingCanvasGhost ? "is-living-canvas-ghost" : ""} ${visual.collapsed ? "is-collapsed" : ""} ${data.hasChildren ? "has-children" : ""}`}
        >
          <NodeToolbar
            isVisible={Boolean(
              selected && (recommendation || data.findingCount),
            )}
            position={Position.Top}
            offset={12}
          >
            <div className="node-guidance-popover">
              <Sparkles size={14} />
              <span>
                <strong>
                  {recommendation
                    ? recommendation.patternName
                    : "Review this element"}
                </strong>
                <small>
                  {recommendation?.reasons[0] ??
                    `${data.findingCount ?? 0} finding(s) need attention for this component.`}
                </small>
              </span>
              {recommendation ? (
                <button
                  onClick={() => {
                    sessionStorage.setItem(
                      "aiw-pattern-focus",
                      recommendation.patternId,
                    );
                    setWorkspaceMode("patterns");
                  }}
                >
                  Review
                  <ArrowRight size={12} />
                </button>
              ) : null}
            </div>
          </NodeToolbar>
          {ports.map((port) => (
            <Handle
              key={port.id}
              id={port.id}
              type={port.direction === "input" ? "target" : "source"}
              position={portPosition(port)}
              className={`semantic-handle semantic-handle--${port.direction}`}
              title={`${port.label}: ${port.relationshipKinds.join(", ")}`}
            />
          ))}
          <div className="architecture-node__header">
            <span className="architecture-node__icon">
              <Icon size={16} />
            </span>
            <span className="architecture-node__kind">{data.kind}</span>
            {visual.themeRole ? (
              <span
                className="architecture-node__theme"
                title={visual.themeRole}
              >
                <Palette size={10} />
              </span>
            ) : null}
            {visual.collapsed ? (
              <span className="architecture-node__theme">
                <Minimize2 size={10} />
              </span>
            ) : null}
            <span className="architecture-node__signals">
              {data.recommendationCount ? (
                <b title="Contextual recommendations">
                  <MessageSquareText size={11} />
                  {data.recommendationCount}
                </b>
              ) : null}
              {data.findingCount ? (
                <b className="warning" title="Architecture findings">
                  !{data.findingCount}
                </b>
              ) : null}
            </span>
          </div>
          <strong>{data.label}</strong>
          {data.description &&
          !data.hasChildren &&
          !visual.collapsed &&
          density !== "executive" ? (
            <p className="architecture-node__description">{data.description}</p>
          ) : null}
          {propertySummary.length && !data.hasChildren ? (
            <div className="architecture-node__properties">
              {propertySummary.map(([key, value]) => (
                <span key={key}>
                  <small>{key}</small>
                  {String(value)}
                </span>
              ))}
            </div>
          ) : null}
          {!data.hasChildren && !visual.collapsed && showDiagnosticDetail ? (
            <div className="architecture-node__tags">
              {data.styleNames
                ?.slice(0, density === "diagnostic" ? 2 : 1)
                .map((name) => (
                  <span className="style-chip" key={name}>
                    {name}
                  </span>
                ))}
              {data.patternNames
                ?.slice(0, density === "diagnostic" ? 3 : 2)
                .map((name) => (
                  <span className="pattern-chip" key={name}>
                    {name}
                  </span>
                ))}
              {!data.styleNames?.length && !data.patternNames?.length
                ? data.tags
                    .slice(0, density === "diagnostic" ? 5 : 3)
                    .map((tag) => <span key={tag}>{tag}</span>)
                : null}
              {data.proposed ? (
                <span className="proposal-chip">Proposed</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </>
    );
  },
);
ArchitectureNodeView.displayName = "ArchitectureNodeView";
