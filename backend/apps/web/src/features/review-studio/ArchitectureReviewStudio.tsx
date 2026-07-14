import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  Gauge,
  GitPullRequestArrow,
  ShieldCheck,
  Sparkles,
  TestTube2,
} from "lucide-react";
import {
  reviewToArchitectureDecisions,
  runArchitectureReview,
  type ArchitectureReview,
  type ReviewCategory,
} from "@aiw/intelligence";
import type { ArtifactBundle } from "@aiw/domain";
import type { ArtifactArchive } from "@aiw/artifacts";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { DesignGuide } from "../../components/DesignGuide";
import { FullJourneyIntelligenceSurface } from "../../components/WorkspaceIntelligenceMap";
import {
  StudioOperatorChecklist,
  StudioPipelineBoard,
  type StudioPipelineStep,
} from "../../components/StudioSpecialistSurfaces";
import { RecommendationOutcomeCapture } from "../../components/RecommendationOutcomeCapture";
import { can } from "../../lib/roleAccess";
import { deliveryStages } from "../../lib/guidedDelivery";
import "./review-studio.css";

const categories: Array<{ id: ReviewCategory | "all"; label: string }> = [
  { id: "all", label: "All findings" },
  { id: "architecture-completeness", label: "Completeness" },
  { id: "pattern-fit", label: "Pattern fit" },
  { id: "anti-pattern", label: "Anti-patterns" },
  { id: "security", label: "Security" },
  { id: "resilience", label: "Resilience" },
  { id: "integration", label: "Integration" },
  { id: "data-flow", label: "Data flow" },
  { id: "deployment", label: "Deployment" },
  { id: "operations", label: "Operations" },
  { id: "decision-quality", label: "Decision quality" },
];

function downloadBlob(path: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = path.split("/").pop() ?? "aiw-review-artifact";
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadText(path: string, content: string, mediaType = "text/plain") {
  downloadBlob(path, new Blob([content], { type: mediaType }));
}

function downloadBytes(
  path: string,
  bytes: Uint8Array,
  mediaType = "application/octet-stream",
) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  downloadBlob(path, new Blob([buffer], { type: mediaType }));
}

function reviewMarkdown(review: ArchitectureReview): string {
  return [
    `# ${review.projectName} — Intelligent Architecture Review`,
    "",
    `Generated: ${review.generatedAt}`,
    `Knowledge release: ${review.knowledgeReleaseId}`,
    "",
    `## Executive summary`,
    review.executiveSummary,
    "",
    "## Scorecard",
    "| Dimension | Score | Status | Rationale |",
    "|---|---:|---|---|",
    ...review.scorecard.map(
      (item) =>
        `| ${item.label} | ${item.score} | ${item.status} | ${item.rationale.replaceAll("|", "/")} |`,
    ),
    "",
    "## Findings",
    ...review.findings.map((item) =>
      [
        `### ${item.severity.toUpperCase()}: ${item.title}`,
        `- Category: ${item.category}`,
        `- Issue: ${item.issue}`,
        `- Why it matters: ${item.whyItMatters}`,
        `- Recommended fix: ${item.recommendedFix}`,
        `- Generated action: ${item.generatedAction}`,
        `- Affected nodes: ${item.affectedNodeIds.join(", ") || "—"}`,
        `- Evidence: ${item.supportingEvidenceIds.join(", ") || "—"}`,
        "",
      ].join("\n"),
    ),
    "## Recommendations",
    ...review.recommendations.map((item) =>
      [
        `### ${item.title}`,
        item.recommendedDecision,
        "",
        `Risk impact: ${item.riskImpact}`,
        `Implementation: ${item.implementationImplication}`,
        `Evidence: ${item.evidenceIds.join(", ") || "—"}`,
        "",
      ].join("\n"),
    ),
    "## Generated ADRs",
    ...review.generatedAdrs.map((item) =>
      [
        `### ${item.title}`,
        `Context: ${item.context}`,
        `Decision: ${item.decision}`,
        `Alternatives: ${item.alternatives.join("; ")}`,
        `Consequences: ${item.consequences.join("; ")}`,
        "",
      ].join("\n"),
    ),
    "## Fitness tests",
    ...review.fitnessTests.map(
      (item) =>
        `- **${item.title}** (${item.scope}, ${item.severity}) — ${item.assertion}`,
    ),
    "",
    "## Authority boundary",
    `Deterministic kernel: ${review.authority.deterministicKernel}`,
    `LLM may score: ${review.authority.llmMayScore}`,
    `LLM may mutate architecture: ${review.authority.llmMayMutateArchitecture}`,
    `Candidate knowledge may influence production: ${review.authority.candidateKnowledgeMayInfluenceProduction}`,
    `Human approval required: ${review.authority.humanApprovalRequired}`,
  ].join("\n");
}

export function ArchitectureReviewStudio() {
  const project = useWorkspaceStore((state) => state.project);
  const library = useWorkspaceStore((state) => state.library);
  const createSnapshot = useWorkspaceStore((state) => state.createSnapshot);
  const recordReviewOutputs = useWorkspaceStore(
    (state) => state.recordReviewOutputs,
  );
  const recordArchitectureReview = useWorkspaceStore((state) => state.recordArchitectureReview);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage);
  const setActiveLifecycleStep = useWorkspaceStore((state) => state.setActiveLifecycleStep);
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const requestStageApproval = useWorkspaceStore(
    (state) => state.requestStageApproval,
  );
  const decideStageApproval = useWorkspaceStore((state) => state.decideStageApproval);
  const assignStageReview = useWorkspaceStore((state) => state.assignStageReview);
  const completeStageReview = useWorkspaceStore((state) => state.completeStageReview);
  const currentUserId = useWorkspaceStore((state) => state.currentUserId);
  const experienceProfile = useWorkspaceStore((state) => state.experienceProfile);
  const isReviewer = experienceProfile === "reviewer";
  const canGenerateArtifacts = can(experienceProfile, "artifact.generate");
  const canDisposition = can(experienceProfile, "review.disposition");
  const pendingValidationApproval = [...project.stageApprovals].reverse().find((item) => item.stage === "validationRealization" && item.status === "pending");
  const reviewAssignments = project.reviewAssignments.filter((item) => item.stage === "validationRealization" && item.branchId === project.branch.id && item.status !== "cancelled");
  const latestReviewAssignment = [...reviewAssignments].reverse()[0];
  const reviewerMembers = project.members.filter((member) => member.status === "active" && member.role === "reviewer");
  const [selectedReviewerId, setSelectedReviewerId] = useState(reviewerMembers[0]?.id ?? "");
  const [reviewComment, setReviewComment] = useState("Architecture review completed against the submitted baseline and evidence.");
  const [activeCategory, setActiveCategory] = useState<ReviewCategory | "all">(
    "all",
  );
  const [handoffPack, setHandoffPack] = useState<ArtifactBundle | null>(null);
  const [handoffArchive, setHandoffArchive] = useState<ArtifactArchive | null>(
    null,
  );
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [handoffMessage, setHandoffMessage] = useState(
    "Generate the evidence-backed handoff pack only when you need it.",
  );

  const review = useMemo(
    () => runArchitectureReview(project, library),
    [project, library],
  );
  const reviewDecisions = useMemo(
    () => reviewToArchitectureDecisions(review),
    [review],
  );
  const recordedReviewDecisionCount = useMemo(
    () =>
      reviewDecisions.filter((candidate) =>
        project.decisions.some(
          (decision) =>
            decision.id === candidate.id ||
            (decision.title.trim().toLowerCase() ===
              candidate.title.trim().toLowerCase() &&
              decision.decision.trim() === candidate.decision.trim()),
        ),
      ).length,
    [project.decisions, reviewDecisions],
  );

  useEffect(() => {
    setHandoffPack(null);
    setHandoffArchive(null);
    setHandoffMessage(
      "Generate the evidence-backed handoff pack only when you need it.",
    );
  }, [project.id, project.revision, review.id]);

  useEffect(() => {
    if (!selectedReviewerId && reviewerMembers[0]?.id) setSelectedReviewerId(reviewerMembers[0].id);
  }, [selectedReviewerId, reviewerMembers]);

  function assignIndependentReviewer() {
    if (!selectedReviewerId) return;
    assignStageReview(
      "validationRealization",
      selectedReviewerId,
      "Review the persisted architecture findings, decisions, fitness evidence and immutable validation baseline.",
      review.findings.some((item) => item.severity === "critical" || item.severity === "high") ? "high" : "normal",
    );
  }

  async function buildHandoffPack(): Promise<ArtifactBundle> {
    if (handoffPack) return handoffPack;
    setHandoffBusy(true);
    setHandoffMessage(
      "Building handoff pack from deterministic Review Studio output…",
    );
    try {
      const { compileSolutionDeliveryPack } = await import("@aiw/artifacts");
      const pack = compileSolutionDeliveryPack(project, library, review);
      setHandoffPack(pack);
      setHandoffArchive(null);
      setHandoffMessage(
        `Handoff pack ready: ${pack.files.length} artifacts generated.`,
      );
      return pack;
    } finally {
      setHandoffBusy(false);
    }
  }

  async function downloadHandoffJson() {
    const pack = await buildHandoffPack();
    downloadText(
      "aiw-solution-delivery-pack.json",
      JSON.stringify(pack, null, 2),
      "application/json",
    );
  }

  async function downloadHandoffZip() {
    setHandoffBusy(true);
    setHandoffMessage(
      "Packaging handoff artifacts into a browser-generated ZIP…",
    );
    try {
      const pack = await buildHandoffPack();
      const { createArtifactArchive } = await import("@aiw/artifacts");
      const archive = createArtifactArchive(pack, {
        fileName: `aiw-solution-delivery-pack-${project.id}.zip`,
      });
      setHandoffArchive(archive);
      setHandoffMessage(
        `ZIP ready: ${archive.fileCount} artifacts, ${(archive.bytes.length / 1024).toFixed(1)} KB.`,
      );
      downloadBytes(archive.fileName, archive.bytes, archive.mediaType);
    } finally {
      setHandoffBusy(false);
    }
  }

  function recordGovernedReviewOutputs() {
    recordArchitectureReview({
      id: review.id,
      generatedAt: review.generatedAt,
      executiveSummary: review.executiveSummary,
      deliveryReadinessScore: review.deliveryReadinessScore,
      recommendationCount: review.recommendations.length,
      findings: review.findings.map((item) => ({
        id: item.id,
        category: item.category,
        severity: item.severity,
        title: item.title,
        issue: item.issue,
        whyItMatters: item.whyItMatters,
        recommendedFix: item.recommendedFix,
        affectedNodeIds: item.affectedNodeIds,
        supportingEvidenceIds: item.supportingEvidenceIds,
      })),
    });
    recordReviewOutputs(reviewDecisions, [
      `Architecture Review Report · ${review.id}`,
      `Generated ADR Set · ${review.generatedAdrs.length} record(s)`,
      `Architecture Fitness Test Specification · ${review.fitnessTests.length} test(s)`,
      `Review Scorecard · delivery readiness ${review.deliveryReadinessScore}%`,
    ]);
  }

  function fixFinding(finding: ArchitectureReview["findings"][number]) {
    const nodeId = finding.affectedNodeIds[0];
    const node = nodeId ? project.nodes.find((item) => item.id === nodeId) : undefined;
    if (!node) return;
    const lifecycle = deliveryStages.find((item) => item.architectureStage === node.stage);
    setWorkspaceMode("design");
    setActiveStage(node.stage);
    if (lifecycle) setActiveLifecycleStep(lifecycle.id);
    selectNode(node.id);
    window.setTimeout(() => document.getElementById("guided-stage-top")?.focus(), 0);
  }

  const filteredFindings =
    activeCategory === "all"
      ? review.findings
      : review.findings.filter(
          (finding) => finding.category === activeCategory,
        );
  const blockers = review.findings.filter(
    (finding) => finding.severity === "critical" || finding.severity === "high",
  ).length;
  const highConfidenceRecommendations = review.recommendations.filter(
    (item) => item.confidence === "high",
  ).length;
  const reviewPipelineSteps = useMemo<StudioPipelineStep[]>(
    () => [
      {
        id: "readiness",
        label: "Readiness",
        detail:
          "Measure whether the model has enough evidence for delivery decisions.",
        status: review.deliveryReadinessScore >= 70 ? "done" : "watch",
        metric: `${review.deliveryReadinessScore}%`,
      },
      {
        id: "risks",
        label: "Risks",
        detail: "Surface blocker findings, quality gaps and operational risks.",
        status: blockers > 0 ? "blocked" : "done",
        metric: blockers,
      },
      {
        id: "decisions",
        label: "Decisions",
        detail:
          "Convert recommendations into ADRs with trade-offs and alternatives.",
        status: review.generatedAdrs.length > 0 ? "active" : "ready",
        metric: review.generatedAdrs.length,
      },
      {
        id: "fitness",
        label: "Fitness tests",
        detail:
          "Generate executable checks that protect the architecture intent.",
        status: review.fitnessTests.length > 0 ? "done" : "ready",
        metric: review.fitnessTests.length,
      },
      {
        id: "handoff",
        label: "Handoff pack",
        detail:
          "Export reviewed artifacts for technology teams and governance bodies.",
        status: handoffPack ? "done" : "ready",
        metric: handoffPack?.files.length ?? 0,
      },
    ],
    [
      blockers,
      handoffPack,
      review.deliveryReadinessScore,
      review.fitnessTests.length,
      review.generatedAdrs.length,
    ],
  );

  return (
    <section className="studio-page review-studio-page">
      <div className="page-heading review-studio-hero">
        <div>
          <span className="eyebrow">Architecture review</span>
          <h2>Intelligent Architecture Review &amp; Decision Studio</h2>
          <p>{review.executiveSummary}</p>
          <div
            className="review-pipeline"
            aria-label="Canonical review pipeline"
          >
            {review.pipeline.map((step, index) => (
              <span key={step}>
                {index + 1}. {step}
              </span>
            ))}
          </div>
        </div>
        <div
          className={`health-score ${review.deliveryReadinessScore < 70 ? "is-risk" : ""}`}
        >
          <span>Delivery ready</span>
          <strong>{review.deliveryReadinessScore}%</strong>
          <small>{blockers} blocker(s)</small>
        </div>
      </div>

      <DesignGuide placement="review" />
      <FullJourneyIntelligenceSurface />

      <StudioPipelineBoard
        eyebrow="Review operating model"
        title="Evidence → risks → decisions → fitness tests → handoff"
        description="Review Studio now guides architects through the same path every time: summarize readiness, resolve blockers, record decisions, generate fitness checks and export delivery evidence."
        steps={reviewPipelineSteps}
      />

      <StudioOperatorChecklist
        title="Executive review summary"
        description="Use this board before presenting the architecture to governance, engineering leadership or a delivery team."
        items={[
          {
            id: "delivery",
            title: "Delivery readiness",
            detail: `${review.deliveryReadinessScore}% readiness with ${blockers} blocker(s).`,
            tone: blockers > 0 ? "blocked" : "ok",
          },
          {
            id: "confidence",
            title: "Decision confidence",
            detail: `${highConfidenceRecommendations}/${review.recommendations.length} recommendation(s) are high confidence.`,
            tone: highConfidenceRecommendations ? "ok" : "watch",
          },
          {
            id: "adrs",
            title: "ADR coverage",
            detail: `${review.generatedAdrs.length} generated ADR(s) available for review and approval.`,
            tone: review.generatedAdrs.length ? "ok" : "watch",
          },
          {
            id: "handoff",
            title: "Handoff status",
            detail: handoffPack
              ? `${handoffPack.files.length} handoff artifact(s) generated.`
              : "Generate handoff artifacts after blocker review.",
            tone: handoffPack ? "ok" : "neutral",
          },
        ]}
      />

      <section className="review-authority-card">
        <ShieldCheck size={21} />
        <div>
          <strong>Governed intelligence boundary</strong>
          <p>
            The review runs from the canonical architecture model and approved
            knowledge release. LLM scoring, candidate-knowledge production
            influence and silent architecture mutation remain disabled.
          </p>
        </div>
        <span>Human approval required</span>
      </section>

      <section className="review-scorecard-grid">
        {review.scorecard.map((dimension) => (
          <article
            className={`review-scorecard-card status-${dimension.status}`}
            key={dimension.id}
          >
            <div>
              <Gauge size={17} />
              <strong>{dimension.label}</strong>
            </div>
            <b>{dimension.score}</b>
            <p>{dimension.rationale}</p>
            <small>
              {dimension.evidence.slice(0, 3).join(" · ") ||
                "Canonical model evidence"}
            </small>
          </article>
        ))}
      </section>

      <div className="review-studio-layout">
        <aside className="review-category-rail" aria-label="Review categories">
          {categories.map((category) => {
            const count =
              category.id === "all"
                ? review.findings.length
                : review.findings.filter(
                    (finding) => finding.category === category.id,
                  ).length;
            return (
              <button
                className={activeCategory === category.id ? "active" : ""}
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
              >
                <span>{category.label}</span>
                <b>{count}</b>
              </button>
            );
          })}
        </aside>

        <section className="review-findings-column">
          <div className="section-heading-row">
            <div>
              <span className="eyebrow">Findings</span>
              <h3>What needs attention</h3>
            </div>
            <span className="status-pill">
              {filteredFindings.length} visible
            </span>
          </div>
          {filteredFindings.length === 0 ? (
            <div className="empty-card">
              <CheckCircle2 size={18} /> No findings in this category.
            </div>
          ) : (
            filteredFindings.map((finding) => (
              <article
                className={`review-finding-card severity-${finding.severity}`}
                key={finding.id}
              >
                <header>
                  <AlertTriangle size={17} />
                  <strong>{finding.title}</strong>
                  <span>{finding.severity}</span>
                </header>
                <p>{finding.issue}</p>
                <small>
                  <b>Why it matters:</b> {finding.whyItMatters}
                </small>
                <small>
                  <b>Fix:</b> {finding.recommendedFix}
                </small>
                <div className="review-evidence-row">
                  {finding.supportingEvidenceIds.slice(0, 4).map((id) => (
                    <span key={id}>{id}</span>
                  ))}
                </div>
                {finding.affectedNodeIds.length ? <button type="button" className="review-fix-action" onClick={() => fixFinding(finding)}>Fix in architecture model <GitPullRequestArrow size={14} /></button> : null}
              </article>
            ))
          )}
        </section>

        <section className="review-decision-column">
          <div className="section-heading-row">
            <div>
              <span className="eyebrow">Recommendations</span>
              <h3>Decision actions</h3>
            </div>
            <Sparkles size={18} />
          </div>
          {review.recommendations.map((item) => (
            <article className="review-recommendation-card" key={item.id}>
              <header>
                <GitPullRequestArrow size={17} />
                <strong>{item.title}</strong>
                <span>{item.confidence}</span>
              </header>
              <p>{item.recommendedDecision}</p>
              <small>{item.riskImpact}</small>
              <ul>
                {item.tradeoffs.map((tradeoff) => (
                  <li key={tradeoff}>{tradeoff}</li>
                ))}
              </ul>
              <RecommendationOutcomeCapture
                recommendationId={item.id}
                recommendationType="decision"
                recordId={item.id}
                label={item.title}
              />
            </article>
          ))}
        </section>
      </div>

      <section className="review-output-grid">
        <article>
          <div>
            <FileText size={18} />
            <strong>Generated ADRs</strong>
            <span>{review.generatedAdrs.length}</span>
          </div>
          {review.generatedAdrs.slice(0, 5).map((adr) => (
            <p key={adr.id}>
              <b>{adr.title}</b>
              <small>{adr.decision}</small>
            </p>
          ))}
          <button
            type="button"
            onClick={recordGovernedReviewOutputs}
            data-testid="record-review-outputs"
          >
            <ClipboardCheck size={15} /> Record ADRs &amp; fitness evidence
          </button>
          <small>
            {recordedReviewDecisionCount}/{reviewDecisions.length} generated
            ADR(s) already recorded as governed proposals.
          </small>
        </article>
        <article>
          <div>
            <TestTube2 size={18} />
            <strong>Fitness tests</strong>
            <span>{review.fitnessTests.length}</span>
          </div>
          {review.fitnessTests.slice(0, 6).map((test) => (
            <p key={test.id}>
              <b>{test.title}</b>
              <small>{test.assertion}</small>
            </p>
          ))}
        </article>
        <article>
          <div>
            <ClipboardCheck size={18} />
            <strong>Handoff artifacts</strong>
            <span>{handoffPack?.files.length ?? 0}</span>
          </div>
          <p className="handoff-export-status">
            {handoffMessage}
            {handoffArchive
              ? ` Last ZIP: ${(handoffArchive.bytes.length / 1024).toFixed(1)} KB.`
              : ""}
          </p>
          <button
            onClick={() =>
              downloadText(
                "aiw-intelligent-architecture-review.md",
                reviewMarkdown(review),
                "text/markdown",
              )
            }
          >
            <Download size={15} /> Download review report
          </button>
          <button
            onClick={() =>
              downloadText(
                "aiw-review.json",
                JSON.stringify(review, null, 2),
                "application/json",
              )
            }
          >
            <Download size={15} /> Download review JSON
          </button>
          {canGenerateArtifacts ? <button
            disabled={handoffBusy}
            onClick={() => void buildHandoffPack()}
          >
            <Download size={15} />{" "}
            {handoffBusy ? "Preparing handoff…" : "Generate handoff artifacts"}
          </button> : null}
          {canGenerateArtifacts ? <button
            disabled={handoffBusy}
            onClick={() => void downloadHandoffZip()}
          >
            <Download size={15} /> Download handoff ZIP
          </button> : null}
          {canGenerateArtifacts ? <button
            disabled={handoffBusy || !handoffPack}
            onClick={() => void downloadHandoffJson()}
          >
            <Download size={15} /> Download handoff JSON
          </button> : null}
          {canGenerateArtifacts ? handoffPack?.files.slice(0, 5).map((file) => (
            <button
              key={file.path}
              onClick={() =>
                downloadText(file.path, file.content, file.mediaType)
              }
            >
              <Download size={15} />
              {file.path}
            </button>
          )) : null}
        </article>
      </section>

      <section className="review-snapshot-strip">
        <BookOpenCheck size={18} />
        <div>
          <strong>Govern the reviewed baseline</strong>
          <p>
            Record generated decisions and fitness evidence, capture an
            immutable snapshot, then submit the validation stage for independent
            approval.
          </p>
        </div>
        {canDisposition ? <div className="review-disposition-panel" data-testid="reviewer-disposition">
          <div className="review-assignment-status">
            <strong>Independent review assignment</strong>
            <span>{latestReviewAssignment ? `${latestReviewAssignment.status.replaceAll("-", " ")} · assigned to ${project.members.find((member) => member.id === latestReviewAssignment.assignedTo)?.displayName ?? latestReviewAssignment.assignedTo}` : "No review assignment exists."}</span>
            {latestReviewAssignment && latestReviewAssignment.assignedTo === currentUserId && latestReviewAssignment.status !== "completed" ? <button className="button button--secondary" type="button" onClick={() => completeStageReview(latestReviewAssignment.id)}>Complete assigned review</button> : null}
          </div>
          <label>Reviewer rationale<textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} /></label>
          {pendingValidationApproval ? <div className="review-baseline-actions">
            <button className="button button--primary" onClick={() => decideStageApproval(pendingValidationApproval.id, "approved", "Architecture Reviewer", reviewComment)}>Approve baseline</button>
            <button className="button button--secondary" onClick={() => decideStageApproval(pendingValidationApproval.id, "changes-requested", "Architecture Reviewer", reviewComment)}>Request changes</button>
            <button className="button button--danger" onClick={() => decideStageApproval(pendingValidationApproval.id, "rejected", "Architecture Reviewer", reviewComment)}>Reject baseline</button>
          </div> : <p className="empty-card">Complete the assigned review, then ask the solution owner to submit the immutable baseline for disposition.</p>}
          <small>Reviewer mode can inspect, complete an assignment, disposition and download review evidence. It cannot generate or modify the delivery pack.</small>
        </div> : <div className="review-owner-governance">
          <div className="review-owner-governance__steps">
            <span className={project.aiReviewHistory.length && project.findings.length ? "is-done" : ""}>1. Persist review</span>
            <span className={latestReviewAssignment ? "is-done" : ""}>2. Assign reviewer</span>
            <span className={latestReviewAssignment?.status === "completed" ? "is-done" : ""}>3. Independent review</span>
            <span className={pendingValidationApproval ? "is-done" : ""}>4. Submit baseline</span>
          </div>
          <div className="review-baseline-actions">
            <button className="button button--secondary" onClick={recordGovernedReviewOutputs}>Record review outputs</button>
            <button className="button button--secondary" onClick={() => createSnapshot(`Architecture Review Studio ${project.revision}`, "reviewed")}>Create reviewed snapshot</button>
          </div>
          <div className="review-assignment-controls">
            <label>Independent reviewer
              <select value={selectedReviewerId} onChange={(event) => setSelectedReviewerId(event.target.value)}>
                <option value="">Select reviewer</option>
                {reviewerMembers.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
              </select>
            </label>
            <button className="button button--secondary" type="button" disabled={!selectedReviewerId || (latestReviewAssignment && latestReviewAssignment.status !== "completed")} onClick={assignIndependentReviewer}>{latestReviewAssignment ? `Review ${latestReviewAssignment.status.replaceAll("-", " ")}` : "Assign independent review"}</button>
          </div>
          <button className="button button--ai" disabled={project.collaborationSettings.requireIndependentReviewer && latestReviewAssignment?.status !== "completed"} onClick={() => requestStageApproval("validationRealization", "Solution Architect")} data-testid="request-review-approval">Submit immutable baseline for approval</button>
        </div>}
      </section>
    </section>
  );
}
