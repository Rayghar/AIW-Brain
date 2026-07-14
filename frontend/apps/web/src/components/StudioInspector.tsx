import {
  AlertTriangle,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  GitBranch,
  MousePointer2,
  PlugZap,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { createDesignLibrary, type DesignPropertyDefinition } from "@aiw/domain";
import { useWorkspaceStore } from "../store/workspaceStore";

function formatValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === undefined || value === null || value === "") return "Not set";
  return String(value);
}

function defaultFor(property: DesignPropertyDefinition) {
  if (property.defaultValue !== undefined) return property.defaultValue;
  if (property.type === "boolean") return false;
  if (property.type === "number") return property.min ?? 0;
  return "";
}

export function StudioInspector() {
  const project = useWorkspaceStore((state) => state.project);
  const library = useWorkspaceStore((state) => state.library);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const contextual = useWorkspaceStore((state) => state.contextual);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const updateNodeLabel = useWorkspaceStore((state) => state.updateNodeLabel);
  const updateNodeProperty = useWorkspaceStore((state) => state.updateNodeProperty);
  const nodes = project?.nodes ?? [];
  const edges = project?.edges ?? [];
  const decisions = project?.decisions ?? [];
  const stageApprovals = project?.stageApprovals ?? [];
  const obligations = contextual?.obligations ?? [];
  const patterns = contextual?.patterns ?? [];
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const designLibrary = createDesignLibrary(library);
  const selectedRecord = selectedNode
    ? designLibrary.find((record) => record.id === selectedNode.properties.libraryRecordId)
    : null;
  const selectedEdges = selectedNode
    ? edges.filter((edge) => edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id)
    : [];
  const openObligations = obligations.filter((item) => !item.satisfied);
  const leadingPattern = patterns.find((item) => item?.patternName) ?? null;
  const requiredProperties = selectedRecord?.properties.filter((property) => property.required) ?? [];
  const missingRequired = selectedNode
    ? requiredProperties.filter((property) => {
        const value = selectedNode.properties[property.key];
        return value === undefined || value === null || String(value).trim() === "";
      })
    : [];

  const renderPropertyControl = (property: DesignPropertyDefinition) => {
    if (!selectedNode) return null;
    const value = selectedNode.properties[property.key] ?? defaultFor(property);
    if (property.type === "boolean") {
      return (
        <label className="inspector-switch" key={property.key}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => updateNodeProperty(selectedNode.id, property.key, event.target.checked)}
          />
          <span>{property.label}</span>
          <small>{property.description}</small>
        </label>
      );
    }
    if (property.type === "enum") {
      return (
        <label className="inspector-field" key={property.key}>
          <span>
            {property.label}
            {property.required ? <b>*</b> : null}
          </span>
          <select
            value={String(value)}
            onChange={(event) => updateNodeProperty(selectedNode.id, property.key, event.target.value)}
          >
            {(property.options ?? []).map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
          <small>{property.description}</small>
        </label>
      );
    }
    if (property.type === "multiline") {
      return (
        <label className="inspector-field" key={property.key}>
          <span>
            {property.label}
            {property.required ? <b>*</b> : null}
          </span>
          <textarea
            value={String(value)}
            rows={3}
            onChange={(event) => updateNodeProperty(selectedNode.id, property.key, event.target.value)}
          />
          <small>{property.description}</small>
        </label>
      );
    }
    return (
      <label className="inspector-field" key={property.key}>
        <span>
          {property.label}
          {property.required ? <b>*</b> : null}
        </span>
        <input
          type={property.type === "number" ? "number" : "text"}
          value={String(value)}
          min={property.min}
          max={property.max}
          onChange={(event) => updateNodeProperty(selectedNode.id, property.key, property.type === "number" ? Number(event.target.value) : event.target.value)}
        />
        <small>{property.description}</small>
      </label>
    );
  };

  return (
    <aside className="studio-inspector studio-inspector--properties" aria-label="Object details, properties and AIW guidance">
      <header>
        <span className="eyebrow">Inspect</span>
        <h2>{selectedNode ? selectedNode.label : "Select an object"}</h2>
        <p>
          {selectedNode
            ? `${selectedNode.kind} · ${selectedNode.stage}`
            : "Select a canvas object to edit attributes, define interfaces and see AIW guidance. Keep this panel closed when you need more canvas space."}
        </p>
      </header>

      <section className="inspector-card inspector-card--accent">
        <BrainCircuit size={18} />
        <div>
          <strong>{contextual?.headline ?? "AIW guidance ready"}</strong>
          <small>Deterministic kernel · governed knowledge release · human approval required</small>
        </div>
      </section>

      {selectedNode ? (
        <>
          <section className="inspector-card">
            <span className="eyebrow">Selected object</span>
            <label className="inspector-field inspector-field--title">
              <span>Name</span>
              <input value={selectedNode.label} onChange={(event) => updateNodeLabel(selectedNode.id, event.target.value)} />
            </label>
            <dl className="inspector-properties">
              <div>
                <dt>Kind</dt>
                <dd>{selectedNode.kind}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{selectedNode.status}</dd>
              </div>
              <div>
                <dt>Library record</dt>
                <dd>{String(selectedNode.properties.libraryRecordId ?? "Manual")}</dd>
              </div>
              <div>
                <dt>Lineage</dt>
                <dd>{selectedNode.lineageFrom?.length || 0} sources</dd>
              </div>
            </dl>
          </section>

          <section className="inspector-card">
            <span className="eyebrow">Attributes</span>
            {selectedRecord?.properties.length ? (
              <div className="inspector-property-editor">
                {selectedRecord.properties.map(renderPropertyControl)}
              </div>
            ) : (
              <div className="inspector-empty-inline">
                <SlidersHorizontal size={16} />
                <span>
                  <strong>No formal attributes yet</strong>
                  <small>This object can still be connected and reviewed. Prefer governed library objects for richer attributes.</small>
                </span>
              </div>
            )}
            {missingRequired.length ? (
              <div className="inspector-warning-inline">
                <AlertTriangle size={15} />
                <span>{missingRequired.length} required attribute(s) still need values before handoff.</span>
              </div>
            ) : selectedRecord?.properties.length ? (
              <div className="inspector-success-inline">
                <CheckCircle2 size={15} />
                <span>Required attributes complete for this object.</span>
              </div>
            ) : null}
          </section>

          <section className="inspector-card">
            <span className="eyebrow">Ports & interfaces</span>
            {selectedRecord?.depiction.ports.length ? (
              <div className="inspector-port-list">
                {selectedRecord.depiction.ports.map((port) => (
                  <article key={port.id}>
                    <PlugZap size={15} />
                    <span>
                      <strong>{port.label}</strong>
                      <small>{port.direction} · {port.relationshipKinds.join(", ")} · {port.semanticTypes.join(", ")}</small>
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="studio-muted">This object does not expose explicit ports. Use semantic relationships from the canvas connect tool.</p>
            )}
            <div className="inspector-interface-summary">
              <GitBranch size={15} />
              <span>
                <strong>{selectedEdges.length} connected relationship(s)</strong>
                <small>Use canvas connect mode to add reads, writes, publishes, subscribes, depends-on and communicates-with relationships.</small>
              </span>
            </div>
          </section>
        </>
      ) : (
        <section className="inspector-card inspector-empty">
          <MousePointer2 size={18} />
          <div>
            <strong>Canvas stays clean by default</strong>
            <small>Open Library to drag objects, then Inspect to edit properties and interfaces.</small>
          </div>
        </section>
      )}

      <section className="inspector-card">
        <span className="eyebrow">AIW recommendation</span>
        {leadingPattern ? (
          <div className="inspector-recommendation">
            <strong>{leadingPattern.patternName ?? "Pattern evidence available"}</strong>
            <p>{leadingPattern.reasons?.[0] ?? "Open the pattern workspace to review evidence and applicability."}</p>
            <span>{leadingPattern.score ?? 0}% fit</span>
            <button onClick={() => setWorkspaceMode("patterns")}>Open pattern evidence</button>
          </div>
        ) : (
          <p className="studio-muted">No high-confidence recommendation for this context yet.</p>
        )}
      </section>

      <section className="inspector-card">
        <span className="eyebrow">Approval posture</span>
        <div className="inspector-signal-list">
          <span>
            <ClipboardList size={15} /> {decisions.length} decisions recorded
          </span>
          <span>
            <ShieldCheck size={15} /> {stageApprovals.filter((item) => item.status === "approved").length} stages approved
          </span>
          {openObligations.length ? (
            <span className="is-warning">
              <AlertTriangle size={15} /> {openObligations.length} obligations open
            </span>
          ) : (
            <span>
              <CheckCircle2 size={15} /> No open obligations in current context
            </span>
          )}
          {selectedRecord ? (
            <span>
              <BookOpenCheck size={15} /> {selectedRecord.evidenceIds.slice(0, 2).join(", ") || "Governed record"}
            </span>
          ) : null}
        </div>
      </section>
    </aside>
  );
}
