import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  BookOpenCheck,
  Braces,
  CheckCircle2,
  Download,
  FileArchive,
  FileCheck2,
  FileCode2,
  FileText,
  LockKeyhole,
  Network,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { composeSdd } from "@aiw/engine";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { can } from "../../lib/roleAccess";
import type { DeliveryStageAssessment } from "../../lib/guidedDelivery";
import {
  buildArchitectureSvg,
  type DiagramExportEdge,
  type DiagramExportNode,
} from "../../lib/diagramExport";
import { deliverySlug, downloadDeliveryFile } from "./utils";

export function SddDeliveryWorkspace({
  assessment,
}: {
  assessment: DeliveryStageAssessment;
}) {
  const project = useWorkspaceStore((state) => state.project);
  const library = useWorkspaceStore((state) => state.library);
  const lifecycleArtifacts = useWorkspaceStore(
    (state) => state.lifecycleArtifacts,
  );
  const completeLifecycleStep = useWorkspaceStore(
    (state) => state.completeLifecycleStep,
  );
  const experienceProfile = useWorkspaceStore(
    (state) => state.experienceProfile,
  );
  const canGenerate = can(experienceProfile, "artifact.generate");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "The final pack remains locked until every required delivery check passes.",
  );
  const [exchangeBusy, setExchangeBusy] = useState<string | null>(null);
  const [roundTripMessage, setRoundTripMessage] = useState(
    "Validate lossless exchange before handoff.",
  );
  const markdown = useMemo(
    () => composeSdd(project, library),
    [project, library],
  );
  const deliveryQuality = useMemo(() => {
    const interfaces = project.interfaces?.length ?? 0;
    const decisions = project.decisions?.length ?? 0;
    const findings = project.findings?.length ?? 0;
    const unresolvedFindings = project.findings?.length ?? 0;
    const traceableNodes = project.nodes.filter((node) => {
      const requirementRefs = Array.isArray(node.properties?.requirementRefs)
        ? node.properties.requirementRefs.length
        : 0;
      const objectiveRefs = Array.isArray(node.properties?.objectiveRefs)
        ? node.properties.objectiveRefs.length
        : 0;
      return (
        requirementRefs > 0 ||
        objectiveRefs > 0 ||
        (node.lineageFrom?.length ?? 0) > 0
      );
    }).length;
    const traceabilityPercent = project.nodes.length
      ? Math.round((traceableNodes / project.nodes.length) * 100)
      : 0;
    return {
      nodes: project.nodes.length,
      relationships: project.edges.length,
      interfaces,
      decisions,
      findings,
      unresolvedFindings,
      traceabilityPercent,
      blockers: assessment.blockers.length,
    };
  }, [assessment.blockers.length, project]);
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
        position: node.positions?.[stage] ?? {
          x: 90 + (index % 3) * 270,
          y: 110 + Math.floor(index / 3) * 170,
        },
        width: 230,
        height: 118,
        data: {
          node: { label: node.label, kind: node.kind, stage: node.stage },
        },
      }));
      const edges: DiagramExportEdge[] = project.edges
        .filter((edge) => ids.has(edge.sourceId) && ids.has(edge.targetId))
        .map((edge) => ({
          id: edge.id,
          source: edge.sourceId,
          target: edge.targetId,
          label: edge.label ?? edge.kind,
        }));
      const svg = buildArchitectureSvg(title, nodes, edges);
      return {
        stage,
        title,
        objectCount: nodes.length,
        relationshipCount: edges.length,
        src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      };
    });
  }, [project]);
  const generated = lifecycleArtifacts.filter(
    (item) =>
      item.projectId === project.id &&
      item.branchId === project.branch.id &&
      item.stepId === "sdd",
  );

  function base64Bytes(value: string) {
    const binary = window.atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1)
      bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  async function exportArchitecture(
    format: "structurizr-dsl" | "calm-json" | "likec4",
  ) {
    setExchangeBusy(format);
    try {
      const { exportArchitectureExchange, assessArchitectureRoundTrip } =
        await import("@aiw/modelling");
      const document = exportArchitectureExchange(project, format);
      const report = assessArchitectureRoundTrip(project, format);
      downloadDeliveryFile(
        document.fileName,
        document.content,
        document.mediaType,
      );
      setRoundTripMessage(
        `${format}: ${report.overallFidelityPercent}% canonical round-trip fidelity · ${report.passed ? "passed" : "review required"}.`,
      );
    } catch (error) {
      setRoundTripMessage(
        error instanceof Error
          ? error.message
          : "Architecture exchange failed.",
      );
    } finally {
      setExchangeBusy(null);
    }
  }

  async function validateAllFormats() {
    setExchangeBusy("validate");
    try {
      const { architectureExchangeFormats } = await import("@aiw/domain");
      const { assessArchitectureRoundTrip } = await import("@aiw/modelling");
      const reports = architectureExchangeFormats.map((format) =>
        assessArchitectureRoundTrip(project, format),
      );
      const passed = reports.filter((report) => report.passed).length;
      setRoundTripMessage(
        `${passed}/${reports.length} architecture-as-code formats passed · ${reports.map((report) => `${report.format} ${report.overallFidelityPercent}%`).join(" · ")}.`,
      );
    } catch (error) {
      setRoundTripMessage(
        error instanceof Error
          ? error.message
          : "Round-trip validation failed.",
      );
    } finally {
      setExchangeBusy(null);
    }
  }

  async function downloadProfessionalPdf() {
    setExchangeBusy("pdf");
    try {
      const { renderAccessibleSddPdf } = await import("@aiw/artifacts");
      const result = renderAccessibleSddPdf(project, library);
      downloadDeliveryFile(
        `${deliverySlug(project.name)}-professional-sdd.pdf`,
        base64Bytes(result.base64),
        "application/pdf",
      );
      setRoundTripMessage(
        `Professional SDD generated · ${result.pageCount} pages · ${result.bookmarkCount} bookmarks · tagged structure, table of contents, page furniture and readable architecture views included.`,
      );
    } catch (error) {
      setRoundTripMessage(
        error instanceof Error
          ? error.message
          : "Professional SDD generation failed.",
      );
    } finally {
      setExchangeBusy(null);
    }
  }

  async function generate() {
    if (!canGenerate || assessment.blockers.length) {
      setMessage(
        !canGenerate
          ? "Your role cannot generate the governed delivery pack."
          : `Resolve ${assessment.blockers.length} required delivery item(s) before final generation.`,
      );
      return;
    }
    setBusy(true);
    setMessage("Composing approved architecture delivery pack…");
    try {
      const [
        { compileSolutionDeliveryPack, createArtifactArchive },
        { runArchitectureReview },
      ] = await Promise.all([
        import("@aiw/artifacts"),
        import("@aiw/intelligence"),
      ]);
      const review = runArchitectureReview(project, library);
      const bundle = compileSolutionDeliveryPack(project, library, review);
      const archive = createArtifactArchive(bundle, {
        fileName: `${deliverySlug(project.name)}-solution-delivery-pack.zip`,
      });
      downloadDeliveryFile(archive.fileName, archive.bytes, archive.mediaType);
      downloadDeliveryFile(`${deliverySlug(project.name)}-sdd.md`, markdown);
      completeLifecycleStep({
        stepId: "sdd",
        title: "SDD & Delivery Pack",
        checklist: assessment.checks.map((item) => ({
          label: item.label,
          done: item.done,
          required: item.required,
          ...(item.evidence ? { evidence: item.evidence } : {}),
        })),
        artifactNames: assessment.definition.outputs,
        notes: `Approved delivery pack generated with ${archive.fileCount} file(s).`,
      });
      setMessage(
        `Delivery pack generated: ${archive.fileCount} files · ${(archive.totalUncompressedBytes / 1024).toFixed(1)} KB uncompressed.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Delivery pack generation failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="guided-sdd-room" aria-label="SDD delivery room">
      <div className="guided-sdd-room__summary">
        <span className="guided-kicker">
          <FileArchive size={14} /> Approved architecture delivery
        </span>
        <h3>Generate the final SDD only from a governed baseline</h3>
        <p>
          The package is assembled from the canonical model, persisted
          decisions, review evidence, fitness tests and lifecycle handoffs.
        </p>
        {assessment.blockers.length ? (
          <div className="guided-sdd-lock-reasons" role="status">
            <strong>
              <LockKeyhole size={14} /> Final generation is locked
            </strong>
            <span>
              Complete the approved baseline and the remaining required delivery
              evidence:
            </span>
            <ul>
              {assessment.blockers.map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="guided-sdd-ready">
            <BadgeCheck size={15} />
            <span>
              Approved baseline and required delivery evidence are complete.
            </span>
          </div>
        )}
        <div className="guided-sdd-room__actions">
          <button
            className="button button--primary"
            type="button"
            disabled={busy || !canGenerate || assessment.blockers.length > 0}
            onClick={() => void generate()}
          >
            <FileArchive size={16} />{" "}
            {busy ? "Generating pack…" : "Generate final delivery pack"}
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => setPreview((value) => !value)}
          >
            <BookOpenCheck size={15} />{" "}
            {preview ? "Hide preview" : "Preview SDD"}
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={() =>
              downloadDeliveryFile(
                `${deliverySlug(project.name)}-sdd-draft.md`,
                markdown,
              )
            }
          >
            <Download size={15} /> Download draft
          </button>
        </div>
        <p className="guided-sdd-room__message">{message}</p>
      </div>
      <section
        className="guided-sdd-quality"
        aria-label="Professional SDD readiness"
      >
        <header>
          <span className="guided-kicker">
            <FileCheck2 size={14} /> Professional SDD readiness
          </span>
          <strong>
            {deliveryQuality.blockers
              ? `${deliveryQuality.blockers} delivery blocker(s)`
              : "Ready for governed generation"}
          </strong>
        </header>
        <div className="guided-sdd-quality__metrics">
          <span>
            <Network size={14} />
            <b>{deliveryQuality.nodes}</b> model objects
          </span>
          <span>
            <Workflow size={14} />
            <b>{deliveryQuality.relationships}</b> relationships
          </span>
          <span>
            <Braces size={14} />
            <b>{deliveryQuality.interfaces}</b> governed interfaces
          </span>
          <span>
            <BadgeCheck size={14} />
            <b>{deliveryQuality.decisions}</b> decisions
          </span>
          <span
            className={deliveryQuality.unresolvedFindings ? "is-warning" : ""}
          >
            <AlertTriangle size={14} />
            <b>{deliveryQuality.unresolvedFindings}</b> open findings
          </span>
          <span>
            <CheckCircle2 size={14} />
            <b>{deliveryQuality.traceabilityPercent}%</b> object lineage
          </span>
        </div>
        <p>
          The professional SDD now includes an executive summary, document
          control, structured tables, completeness gaps, ten readable
          architecture views and explicit approval boundaries. Missing evidence
          remains visible rather than being inferred.
        </p>
      </section>

      <div className="guided-sdd-room__manifest">
        <strong>Delivery manifest</strong>
        {assessment.definition.outputs.map((item) => (
          <span key={item}>
            <FileText size={13} /> {item}
          </span>
        ))}
        <small>
          {generated.length} generated artifact record(s) in the lifecycle
          ledger.
        </small>
      </div>

      <section
        className="architecture-exchange-delivery"
        aria-label="Architecture interoperability and accessible delivery"
        data-testid="architecture-exchange-delivery"
      >
        <header>
          <div>
            <span className="guided-kicker">
              <Workflow size={14} /> Architecture exchange &amp; delivery
            </span>
            <h3>One canonical model, portable delivery formats</h3>
            <p>
              Export, validate and hand off the governed model without replacing
              AIW semantic identity or vendor-neutral authority.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void validateAllFormats()}
            disabled={exchangeBusy !== null}
          >
            <CheckCircle2 size={15} />{" "}
            {exchangeBusy === "validate"
              ? "Validating…"
              : "Validate all formats"}
          </button>
        </header>
        <div className="architecture-exchange-delivery__grid">
          <article>
            <FileCode2 size={21} />
            <strong>Structurizr DSL</strong>
            <span>
              C4-oriented workspace, model, relationships and views with
              lossless AIW metadata.
            </span>
            <button
              type="button"
              onClick={() => void exportArchitecture("structurizr-dsl")}
              disabled={exchangeBusy !== null}
            >
              {exchangeBusy === "structurizr-dsl"
                ? "Exporting…"
                : "Export .dsl"}
            </button>
          </article>
          <article>
            <Braces size={21} />
            <strong>CALM JSON</strong>
            <span>
              Architecture nodes, relationships, controls and interfaces in a
              governed CALM-compatible document.
            </span>
            <button
              type="button"
              onClick={() => void exportArchitecture("calm-json")}
              disabled={exchangeBusy !== null}
            >
              {exchangeBusy === "calm-json" ? "Exporting…" : "Export CALM"}
            </button>
          </article>
          <article>
            <Workflow size={21} />
            <strong>LikeC4</strong>
            <span>
              Text-based architecture model and view definitions with canonical
              identity retained for round trip.
            </span>
            <button
              type="button"
              onClick={() => void exportArchitecture("likec4")}
              disabled={exchangeBusy !== null}
            >
              {exchangeBusy === "likec4" ? "Exporting…" : "Export .c4"}
            </button>
          </article>
          <article className="is-accessible">
            <ShieldCheck size={21} />
            <strong>Professional PDF SDD</strong>
            <span>
              Executive-ready, paginated delivery document with a table of
              contents, structured tables, bookmarks, tagged structure, visible
              diagram labels and explicit evidence gaps.
            </span>
            <button
              type="button"
              onClick={() => void downloadProfessionalPdf()}
              disabled={exchangeBusy !== null}
            >
              {exchangeBusy === "pdf"
                ? "Generating…"
                : "Download professional PDF"}
            </button>
          </article>
        </div>
        <p className="architecture-exchange-delivery__status" role="status">
          {roundTripMessage}
        </p>
      </section>

      {preview ? (
        <div className="guided-sdd-preview-shell">
          <section
            className="guided-sdd-diagram-gallery"
            aria-label="Rendered architecture diagrams"
          >
            <header>
              <strong>Rendered architecture diagrams</strong>
              <span>
                Generated from the current canonical project revision.
              </span>
            </header>
            <div>
              {renderedDiagrams.map((diagram) => (
                <figure key={diagram.stage}>
                  <img
                    src={diagram.src}
                    alt={`${diagram.title}: ${diagram.objectCount} objects and ${diagram.relationshipCount} relationships`}
                  />
                  <figcaption>
                    <strong>{diagram.title}</strong>
                    <span>
                      {diagram.objectCount} objects ·{" "}
                      {diagram.relationshipCount} relationships
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
          <pre className="guided-sdd-preview">{markdown}</pre>
        </div>
      ) : null}
    </section>
  );
}
