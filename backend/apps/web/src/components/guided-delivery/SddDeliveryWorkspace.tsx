import { useMemo, useState } from "react";
import { BadgeCheck, BookOpenCheck, Download, FileArchive, FileText, LockKeyhole } from "lucide-react";
import { composeSdd } from "@aiw/engine";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { can } from "../../lib/roleAccess";
import type { DeliveryStageAssessment } from "../../lib/guidedDelivery";
import { buildArchitectureSvg, type DiagramExportEdge, type DiagramExportNode } from "../../lib/diagramExport";
import { deliverySlug, downloadDeliveryFile } from "./utils";

export function SddDeliveryWorkspace({ assessment }: { assessment: DeliveryStageAssessment }) {
  const project = useWorkspaceStore((state) => state.project);
  const library = useWorkspaceStore((state) => state.library);
  const lifecycleArtifacts = useWorkspaceStore((state) => state.lifecycleArtifacts);
  const completeLifecycleStep = useWorkspaceStore((state) => state.completeLifecycleStep);
  const experienceProfile = useWorkspaceStore((state) => state.experienceProfile);
  const canGenerate = can(experienceProfile, "artifact.generate");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("The final pack remains locked until every required delivery check passes.");
  const markdown = useMemo(() => composeSdd(project, library), [project, library]);
  const renderedDiagrams = useMemo(() => {
    const stages = [
      ["logicalApplication", "Logical application architecture"],
      ["applicationRealization", "Application realization architecture"],
      ["logicalTechnology", "Logical technology architecture"],
      ["physicalTechnology", "Physical deployment architecture"],
    ] as const;
    return stages.map(([stage, title]) => {
      const stageNodes = project.nodes.filter((node) => node.stage === stage);
      const ids = new Set(stageNodes.map((node) => node.id));
      const nodes: DiagramExportNode[] = stageNodes.map((node, index) => ({
        id: node.id,
        position: node.positions?.[stage] ?? { x: 90 + (index % 3) * 270, y: 110 + Math.floor(index / 3) * 170 },
        width: 230,
        height: 118,
        data: { node: { label: node.label, kind: node.kind, stage: node.stage } },
      }));
      const edges: DiagramExportEdge[] = project.edges
        .filter((edge) => ids.has(edge.sourceId) && ids.has(edge.targetId))
        .map((edge) => ({ id: edge.id, source: edge.sourceId, target: edge.targetId, label: edge.label ?? edge.kind }));
      const svg = buildArchitectureSvg(title, nodes, edges);
      return { stage, title, objectCount: nodes.length, relationshipCount: edges.length, src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` };
    });
  }, [project]);
  const generated = lifecycleArtifacts.filter((item) => item.projectId === project.id && item.branchId === project.branch.id && item.stepId === "sdd");

  async function generate() {
    if (!canGenerate || assessment.blockers.length) {
      setMessage(!canGenerate ? "Your role cannot generate the governed delivery pack." : `Resolve ${assessment.blockers.length} required delivery item(s) before final generation.`);
      return;
    }
    setBusy(true);
    setMessage("Composing approved architecture delivery pack…");
    try {
      const [{ compileSolutionDeliveryPack, createArtifactArchive }, { runArchitectureReview }] = await Promise.all([
        import("@aiw/artifacts"),
        import("@aiw/intelligence"),
      ]);
      const review = runArchitectureReview(project, library);
      const bundle = compileSolutionDeliveryPack(project, library, review);
      const archive = createArtifactArchive(bundle, { fileName: `${deliverySlug(project.name)}-solution-delivery-pack.zip` });
      downloadDeliveryFile(archive.fileName, archive.bytes, archive.mediaType);
      downloadDeliveryFile(`${deliverySlug(project.name)}-sdd.md`, markdown);
      completeLifecycleStep({
        stepId: "sdd",
        title: "SDD & Delivery Pack",
        checklist: assessment.checks.map((item) => ({ label: item.label, done: item.done, required: item.required, ...(item.evidence ? { evidence: item.evidence } : {}) })),
        artifactNames: assessment.definition.outputs,
        notes: `Approved delivery pack generated with ${archive.fileCount} file(s).`,
      });
      setMessage(`Delivery pack generated: ${archive.fileCount} files · ${(archive.totalUncompressedBytes / 1024).toFixed(1)} KB uncompressed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delivery pack generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="guided-sdd-room" aria-label="SDD delivery room">
      <div className="guided-sdd-room__summary">
        <span className="guided-kicker"><FileArchive size={14} /> Approved architecture delivery</span>
        <h3>Generate the final SDD only from a governed baseline</h3>
        <p>The package is assembled from the canonical model, persisted decisions, review evidence, fitness tests and lifecycle handoffs.</p>
        {assessment.blockers.length ? <div className="guided-sdd-lock-reasons" role="status">
          <strong><LockKeyhole size={14} /> Final generation is locked</strong>
          <span>Complete the approved baseline and the remaining required delivery evidence:</span>
          <ul>{assessment.blockers.map((item) => <li key={item.id}>{item.label}</li>)}</ul>
        </div> : <div className="guided-sdd-ready"><BadgeCheck size={15} /><span>Approved baseline and required delivery evidence are complete.</span></div>}
        <div className="guided-sdd-room__actions">
          <button className="button button--primary" type="button" disabled={busy || !canGenerate || assessment.blockers.length > 0} onClick={() => void generate()}>
            <FileArchive size={16} /> {busy ? "Generating pack…" : "Generate final delivery pack"}
          </button>
          <button type="button" onClick={() => setPreview((value) => !value)}><BookOpenCheck size={15} /> {preview ? "Hide preview" : "Preview SDD"}</button>
          <button type="button" onClick={() => downloadDeliveryFile(`${deliverySlug(project.name)}-sdd-draft.md`, markdown)}><Download size={15} /> Download draft</button>
        </div>
        <p className="guided-sdd-room__message">{message}</p>
      </div>
      <div className="guided-sdd-room__manifest">
        <strong>Delivery manifest</strong>
        {assessment.definition.outputs.map((item) => <span key={item}><FileText size={13} /> {item}</span>)}
        <small>{generated.length} generated artifact record(s) in the lifecycle ledger.</small>
      </div>
      {preview ? <div className="guided-sdd-preview-shell">
        <section className="guided-sdd-diagram-gallery" aria-label="Rendered architecture diagrams">
          <header><strong>Rendered architecture diagrams</strong><span>Generated from the current canonical project revision.</span></header>
          <div>{renderedDiagrams.map((diagram) => <figure key={diagram.stage}>
            <img src={diagram.src} alt={`${diagram.title}: ${diagram.objectCount} objects and ${diagram.relationshipCount} relationships`} />
            <figcaption><strong>{diagram.title}</strong><span>{diagram.objectCount} objects · {diagram.relationshipCount} relationships</span></figcaption>
          </figure>)}</div>
        </section>
        <pre className="guided-sdd-preview">{markdown}</pre>
      </div> : null}
    </section>
  );
}
