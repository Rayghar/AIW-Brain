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
import { RecommendationOutcomeCapture } from "../../components/RecommendationOutcomeCapture";
import { can } from "../../lib/roleAccess";
import { deliveryStages } from "../../lib/guidedDelivery";
import "./review-studio.css";

const categories: Array<{ id: ReviewCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "architecture-completeness", label: "Completeness" },
  { id: "pattern-fit", label: "Pattern fit" },
  { id: "anti-pattern", label: "Anti-patterns" },
  { id: "security", label: "Security" },
  { id: "resilience", label: "Resilience" },
  { id: "integration", label: "Integration" },
  { id: "data-flow", label: "Data" },
  { id: "deployment", label: "Deployment" },
  { id: "operations", label: "Operations" },
  { id: "decision-quality", label: "Decisions" },
];

type ReviewLens = "summary" | "findings" | "decisions" | "evidence" | "governance";

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

function downloadBytes(path: string, bytes: Uint8Array, mediaType = "application/octet-stream") {
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
    "## Executive summary",
    review.executiveSummary,
    "",
    "## Findings",
    ...review.findings.map((item) => [
      `### ${item.severity.toUpperCase()}: ${item.title}`,
      `- Category: ${item.category}`,
      `- Issue: ${item.issue}`,
      `- Why it matters: ${item.whyItMatters}`,
      `- Recommended fix: ${item.recommendedFix}`,
      `- Evidence: ${item.supportingEvidenceIds.join(", ") || "—"}`,
      "",
    ].join("\n")),
    "## Recommendations",
    ...review.recommendations.map((item) => [
      `### ${item.title}`,
      item.recommendedDecision,
      "",
      `Risk impact: ${item.riskImpact}`,
      `Implementation: ${item.implementationImplication}`,
      `Evidence: ${item.evidenceIds.join(", ") || "—"}`,
      "",
    ].join("\n")),
    "## Generated ADRs",
    ...review.generatedAdrs.map((item) => [
      `### ${item.title}`,
      `Context: ${item.context}`,
      `Decision: ${item.decision}`,
      `Alternatives: ${item.alternatives.join("; ")}`,
      `Consequences: ${item.consequences.join("; ")}`,
      "",
    ].join("\n")),
    "## Fitness tests",
    ...review.fitnessTests.map((item) => `- **${item.title}** (${item.scope}, ${item.severity}) — ${item.assertion}`),
  ].join("\n");
}

export function ArchitectureReviewStudio() {
  const project = useWorkspaceStore((state) => state.project);
  const library = useWorkspaceStore((state) => state.library);
  const createSnapshot = useWorkspaceStore((state) => state.createSnapshot);
  const recordReviewOutputs = useWorkspaceStore((state) => state.recordReviewOutputs);
  const recordArchitectureReview = useWorkspaceStore((state) => state.recordArchitectureReview);
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage);
  const setActiveLifecycleStep = useWorkspaceStore((state) => state.setActiveLifecycleStep);
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const requestStageApproval = useWorkspaceStore((state) => state.requestStageApproval);
  const decideStageApproval = useWorkspaceStore((state) => state.decideStageApproval);
  const assignStageReview = useWorkspaceStore((state) => state.assignStageReview);
  const completeStageReview = useWorkspaceStore((state) => state.completeStageReview);
  const currentUserId = useWorkspaceStore((state) => state.currentUserId);
  const experienceProfile = useWorkspaceStore((state) => state.experienceProfile);
  const canGenerateArtifacts = can(experienceProfile, "artifact.generate");
  const canDisposition = can(experienceProfile, "review.disposition");

  const review = useMemo(() => runArchitectureReview(project, library), [project, library]);
  const reviewDecisions = useMemo(() => reviewToArchitectureDecisions(review), [review]);
  const blockers = review.findings.filter((finding) => finding.severity === "critical" || finding.severity === "high").length;
  const pendingValidationApproval = [...project.stageApprovals].reverse().find((item) => item.stage === "validationRealization" && item.status === "pending");
  const reviewAssignments = project.reviewAssignments.filter((item) => item.stage === "validationRealization" && item.branchId === project.branch.id && item.status !== "cancelled");
  const latestReviewAssignment = [...reviewAssignments].reverse()[0];
  const reviewerMembers = project.members.filter((member) => member.status === "active" && member.role === "reviewer");

  const [lens, setLens] = useState<ReviewLens>(blockers ? "findings" : "summary");
  const [activeCategory, setActiveCategory] = useState<ReviewCategory | "all">("all");
  const [selectedFindingId, setSelectedFindingId] = useState(review.findings[0]?.id ?? "");
  const [selectedRecommendationId, setSelectedRecommendationId] = useState(review.recommendations[0]?.id ?? "");
  const [selectedReviewerId, setSelectedReviewerId] = useState(reviewerMembers[0]?.id ?? "");
  const [reviewComment, setReviewComment] = useState("Architecture review completed against the submitted baseline and evidence.");
  const [handoffPack, setHandoffPack] = useState<ArtifactBundle | null>(null);
  const [handoffArchive, setHandoffArchive] = useState<ArtifactArchive | null>(null);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [handoffMessage, setHandoffMessage] = useState("Generate the evidence-backed handoff pack only when you need it.");

  const filteredFindings = activeCategory === "all" ? review.findings : review.findings.filter((finding) => finding.category === activeCategory);
  const selectedFinding = filteredFindings.find((finding) => finding.id === selectedFindingId) ?? filteredFindings[0];
  const selectedRecommendation = review.recommendations.find((item) => item.id === selectedRecommendationId) ?? review.recommendations[0];
  const recordedReviewDecisionCount = reviewDecisions.filter((candidate) => project.decisions.some((decision) => decision.id === candidate.id || (decision.title.trim().toLowerCase() === candidate.title.trim().toLowerCase() && decision.decision.trim() === candidate.decision.trim()))).length;

  useEffect(() => {
    setHandoffPack(null);
    setHandoffArchive(null);
    setHandoffMessage("Generate the evidence-backed handoff pack only when you need it.");
  }, [project.id, project.revision, review.id]);

  useEffect(() => {
    if (!selectedReviewerId && reviewerMembers[0]?.id) setSelectedReviewerId(reviewerMembers[0].id);
  }, [selectedReviewerId, reviewerMembers]);

  useEffect(() => {
    if (!selectedFinding || !filteredFindings.some((item) => item.id === selectedFindingId)) setSelectedFindingId(filteredFindings[0]?.id ?? "");
  }, [activeCategory, filteredFindings, selectedFinding, selectedFindingId]);

  function assignIndependentReviewer() {
    if (!selectedReviewerId) return;
    assignStageReview(
      "validationRealization",
      selectedReviewerId,
      "Review the persisted architecture findings, decisions, fitness evidence and immutable validation baseline.",
      blockers > 0 ? "high" : "normal",
    );
  }

  async function buildHandoffPack(): Promise<ArtifactBundle> {
    if (handoffPack) return handoffPack;
    setHandoffBusy(true);
    setHandoffMessage("Building handoff pack from the governed review output…");
    try {
      const { compileSolutionDeliveryPack } = await import("@aiw/artifacts");
      const pack = compileSolutionDeliveryPack(project, library, review);
      setHandoffPack(pack);
      setHandoffArchive(null);
      setHandoffMessage(`Handoff pack ready: ${pack.files.length} artifacts generated.`);
      return pack;
    } finally {
      setHandoffBusy(false);
    }
  }

  async function downloadHandoffJson() {
    const pack = await buildHandoffPack();
    downloadText("aiw-solution-delivery-pack.json", JSON.stringify(pack, null, 2), "application/json");
  }

  async function downloadHandoffZip() {
    setHandoffBusy(true);
    setHandoffMessage("Packaging handoff artifacts into a browser-generated ZIP…");
    try {
      const pack = await buildHandoffPack();
      const { createArtifactArchive } = await import("@aiw/artifacts");
      const archive = createArtifactArchive(pack, { fileName: `aiw-solution-delivery-pack-${project.id}.zip` });
      setHandoffArchive(archive);
      setHandoffMessage(`ZIP ready: ${archive.fileCount} artifacts, ${(archive.bytes.length / 1024).toFixed(1)} KB.`);
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

  const lensItems: Array<{ id: ReviewLens; label: string; count?: number }> = [
    { id: "summary", label: "Summary" },
    { id: "findings", label: "Findings", count: review.findings.length },
    { id: "decisions", label: "Decisions", count: review.recommendations.length },
    { id: "evidence", label: "Evidence" },
    { id: "governance", label: "Governance" },
  ];

  return (
    <section className="studio-page review-studio-page review-workbench-v2">
      <header className="review-workbench-v2__hero">
        <div>
          <span className="eyebrow">Review &amp; assurance</span>
          <h2>Resolve risk, record decisions and govern the delivery baseline</h2>
          <p>{review.executiveSummary}</p>
        </div>
        <div className={`review-workbench-v2__readiness ${review.deliveryReadinessScore < 70 ? "is-risk" : ""}`}>
          <span>Delivery readiness</span><strong>{review.deliveryReadinessScore}%</strong><small>{blockers} critical/high blocker{blockers === 1 ? "" : "s"}</small>
        </div>
      </header>

      <nav className="review-workbench-v2__lenses" aria-label="Review task lenses">
        {lensItems.map((item) => <button type="button" key={item.id} className={lens === item.id ? "is-active" : ""} onClick={() => setLens(item.id)}><span>{item.label}</span>{typeof item.count === "number" ? <b>{item.count}</b> : null}</button>)}
      </nav>

      {lens === "summary" ? (
        <section className="review-summary-v2">
          <div className="review-summary-v2__metrics">
            <article><Gauge size={18}/><span>Readiness</span><strong>{review.deliveryReadinessScore}%</strong></article>
            <article><AlertTriangle size={18}/><span>Blockers</span><strong>{blockers}</strong></article>
            <article><GitPullRequestArrow size={18}/><span>Decision proposals</span><strong>{review.recommendations.length}</strong></article>
            <article><TestTube2 size={18}/><span>Fitness tests</span><strong>{review.fitnessTests.length}</strong></article>
          </div>
          <article className="review-summary-v2__next">
            <span>Recommended next action</span>
            <strong>{blockers ? `Disposition the highest-impact finding: ${review.findings.find((item) => item.severity === "critical" || item.severity === "high")?.title ?? "review blockers"}` : "Record the governed review outputs and assign the independent reviewer."}</strong>
            <p>{blockers ? "Do not submit the immutable baseline until every critical or high finding has an accountable resolution path." : "The model has no critical/high deterministic blocker, but approval still requires evidence and an accountable reviewer."}</p>
            <button type="button" className="button button--primary" onClick={() => setLens(blockers ? "findings" : "governance")}>{blockers ? "Open findings" : "Open governance"}</button>
          </article>
          <div className="review-summary-v2__priority">
            <header><strong>Priority findings</strong><button type="button" onClick={() => setLens("findings")}>View all</button></header>
            {review.findings.slice(0, 4).map((finding) => <button type="button" key={finding.id} onClick={() => { setSelectedFindingId(finding.id); setActiveCategory("all"); setLens("findings"); }}><span className={`severity-${finding.severity}`}>{finding.severity}</span><strong>{finding.title}</strong><small>{finding.issue}</small></button>)}
            {!review.findings.length ? <div className="empty-card"><CheckCircle2 size={18}/> No deterministic finding currently blocks the baseline.</div> : null}
          </div>
          <details className="review-authority-v2"><summary><ShieldCheck size={16}/> How review authority works</summary><p>The review is generated from the canonical model and the approved knowledge release. Sol may explain and challenge, but cannot approve, mutate or declare production readiness. Human disposition and immutable evidence remain authoritative.</p></details>
        </section>
      ) : null}

      {lens === "findings" ? (
        <section className="review-findings-v2">
          <aside className="review-findings-v2__categories" aria-label="Finding categories">
            {categories.map((category) => {
              const count = category.id === "all" ? review.findings.length : review.findings.filter((finding) => finding.category === category.id).length;
              return <button type="button" className={activeCategory === category.id ? "is-active" : ""} key={category.id} onClick={() => setActiveCategory(category.id)}><span>{category.label}</span><b>{count}</b></button>;
            })}
          </aside>
          <div className="review-findings-v2__queue">
            <header><div><span>Finding queue</span><strong>{filteredFindings.length} visible</strong></div></header>
            {filteredFindings.map((finding) => <button type="button" key={finding.id} className={selectedFinding?.id === finding.id ? "is-selected" : ""} onClick={() => setSelectedFindingId(finding.id)}><span className={`severity-${finding.severity}`}>{finding.severity}</span><strong>{finding.title}</strong><small>{finding.issue}</small></button>)}
            {!filteredFindings.length ? <div className="empty-card"><CheckCircle2 size={18}/> No findings in this category.</div> : null}
          </div>
          <article className="review-findings-v2__detail">
            {selectedFinding ? <>
              <header><span className={`severity-${selectedFinding.severity}`}>{selectedFinding.severity}</span><div><small>{selectedFinding.category.replaceAll("-", " ")}</small><h3>{selectedFinding.title}</h3></div></header>
              <section><strong>Issue</strong><p>{selectedFinding.issue}</p></section>
              <section><strong>Why it matters</strong><p>{selectedFinding.whyItMatters}</p></section>
              <section><strong>Recommended resolution</strong><p>{selectedFinding.recommendedFix}</p></section>
              <section><strong>Evidence</strong><div className="review-evidence-row">{selectedFinding.supportingEvidenceIds.length ? selectedFinding.supportingEvidenceIds.map((id) => <span key={id}>{id}</span>) : <small>No evidence reference was attached.</small>}</div></section>
              {selectedFinding.affectedNodeIds.length ? <button type="button" className="button button--primary" onClick={() => fixFinding(selectedFinding)}>Fix in architecture model <GitPullRequestArrow size={14}/></button> : <p className="review-findings-v2__notice">This finding is project-wide. Resolve it through the relevant decision or evidence lens.</p>}
            </> : <div className="empty-card">Select a finding to inspect its evidence and resolution path.</div>}
          </article>
        </section>
      ) : null}

      {lens === "decisions" ? (
        <section className="review-decisions-v2">
          <div className="review-decisions-v2__queue">
            <header><span>Decision proposals</span><strong>{review.recommendations.length}</strong></header>
            {review.recommendations.map((item) => <button type="button" key={item.id} className={selectedRecommendation?.id === item.id ? "is-selected" : ""} onClick={() => setSelectedRecommendationId(item.id)}><span>{item.confidence}</span><strong>{item.title}</strong><small>{item.riskImpact}</small></button>)}
          </div>
          <article className="review-decisions-v2__detail">
            {selectedRecommendation ? <>
              <header><Sparkles size={18}/><div><small>{selectedRecommendation.confidence} confidence</small><h3>{selectedRecommendation.title}</h3></div></header>
              <section><strong>Recommended decision</strong><p>{selectedRecommendation.recommendedDecision}</p></section>
              <section><strong>Implementation implication</strong><p>{selectedRecommendation.implementationImplication}</p></section>
              <section><strong>Risk impact</strong><p>{selectedRecommendation.riskImpact}</p></section>
              <section><strong>Trade-offs</strong><ul>{selectedRecommendation.tradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}</ul></section>
              <RecommendationOutcomeCapture recommendationId={selectedRecommendation.id} recommendationType="decision" recordId={selectedRecommendation.id} label={selectedRecommendation.title}/>
            </> : <div className="empty-card">No decision proposal is currently available.</div>}
          </article>
        </section>
      ) : null}

      {lens === "evidence" ? (
        <section className="review-evidence-v2">
          <div className="review-evidence-v2__scorecards">{review.scorecard.map((dimension) => <article className={`status-${dimension.status}`} key={dimension.id}><span>{dimension.label}</span><strong>{dimension.score}</strong><p>{dimension.rationale}</p></article>)}</div>
          <div className="review-evidence-v2__outputs">
            <article><header><FileText size={18}/><strong>Generated ADRs</strong><span>{review.generatedAdrs.length}</span></header>{review.generatedAdrs.slice(0, 5).map((adr) => <p key={adr.id}><b>{adr.title}</b><small>{adr.decision}</small></p>)}</article>
            <article><header><TestTube2 size={18}/><strong>Fitness tests</strong><span>{review.fitnessTests.length}</span></header>{review.fitnessTests.slice(0, 6).map((test) => <p key={test.id}><b>{test.title}</b><small>{test.assertion}</small></p>)}</article>
          </div>
          <article className="review-evidence-v2__downloads">
            <header><Download size={18}/><div><strong>Review and handoff evidence</strong><small>{handoffMessage}{handoffArchive ? ` Last ZIP: ${(handoffArchive.bytes.length / 1024).toFixed(1)} KB.` : ""}</small></div></header>
            <div>
              <button type="button" onClick={() => downloadText("aiw-intelligent-architecture-review.md", reviewMarkdown(review), "text/markdown")}><Download size={15}/> Review report</button>
              <button type="button" onClick={() => downloadText("aiw-review.json", JSON.stringify(review, null, 2), "application/json")}><Download size={15}/> Review JSON</button>
              {canGenerateArtifacts ? <button type="button" disabled={handoffBusy} onClick={() => void buildHandoffPack()}><Download size={15}/>{handoffBusy ? "Preparing…" : "Generate handoff"}</button> : null}
              {canGenerateArtifacts ? <button type="button" disabled={handoffBusy} onClick={() => void downloadHandoffZip()}><Download size={15}/> Handoff ZIP</button> : null}
              {canGenerateArtifacts ? <button type="button" disabled={handoffBusy || !handoffPack} onClick={() => void downloadHandoffJson()}><Download size={15}/> Handoff JSON</button> : null}
            </div>
          </article>
        </section>
      ) : null}

      {lens === "governance" ? (
        <section className="review-governance-v2">
          <article className="review-governance-v2__progress">
            <header><BookOpenCheck size={18}/><div><strong>Govern the reviewed baseline</strong><p>Persist the review, capture an immutable snapshot, complete independent review and only then submit for disposition.</p></div></header>
            <ol>
              <li className={project.aiReviewHistory.length && project.findings.length ? "is-done" : ""}>Persist review evidence</li>
              <li className={latestReviewAssignment ? "is-done" : ""}>Assign independent reviewer</li>
              <li className={latestReviewAssignment?.status === "completed" ? "is-done" : ""}>Complete independent review</li>
              <li className={pendingValidationApproval ? "is-done" : ""}>Submit immutable baseline</li>
            </ol>
            <div className="review-governance-v2__actions">
              <button type="button" className="button button--secondary" onClick={recordGovernedReviewOutputs} data-testid="record-review-outputs"><ClipboardCheck size={15}/> Record review outputs</button>
              <button type="button" className="button button--secondary" onClick={() => createSnapshot(`Architecture Review Studio ${project.revision}`, "reviewed")}><BookOpenCheck size={15}/> Create reviewed snapshot</button>
            </div>
            <small>{recordedReviewDecisionCount}/{reviewDecisions.length} generated decision proposal(s) already recorded.</small>
          </article>

          {canDisposition ? <article className="review-governance-v2__disposition" data-testid="reviewer-disposition">
            <header><ShieldCheck size={18}/><div><strong>Independent reviewer disposition</strong><small>{latestReviewAssignment ? `${latestReviewAssignment.status.replaceAll("-", " ")} · ${project.members.find((member) => member.id === latestReviewAssignment.assignedTo)?.displayName ?? latestReviewAssignment.assignedTo}` : "No review assignment exists."}</small></div></header>
            {latestReviewAssignment && latestReviewAssignment.assignedTo === currentUserId && latestReviewAssignment.status !== "completed" ? <button className="button button--secondary" type="button" onClick={() => completeStageReview(latestReviewAssignment.id)}>Complete assigned review</button> : null}
            <label>Reviewer rationale<textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)}/></label>
            {pendingValidationApproval ? <div className="review-baseline-actions"><button className="button button--primary" onClick={() => decideStageApproval(pendingValidationApproval.id, "approved", "Architecture Reviewer", reviewComment)}>Approve baseline</button><button className="button button--secondary" onClick={() => decideStageApproval(pendingValidationApproval.id, "changes-requested", "Architecture Reviewer", reviewComment)}>Request changes</button><button className="button button--danger" onClick={() => decideStageApproval(pendingValidationApproval.id, "rejected", "Architecture Reviewer", reviewComment)}>Reject baseline</button></div> : <p className="empty-card">The solution owner must submit the immutable baseline before disposition.</p>}
          </article> : <article className="review-governance-v2__assignment">
            <header><ShieldCheck size={18}/><div><strong>Independent review assignment</strong><small>{latestReviewAssignment ? `Current status: ${latestReviewAssignment.status.replaceAll("-", " ")}` : "Assign an accountable reviewer before submission."}</small></div></header>
            <label>Independent reviewer<select value={selectedReviewerId} onChange={(event) => setSelectedReviewerId(event.target.value)}><option value="">Select reviewer</option>{reviewerMembers.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select></label>
            <button className="button button--secondary" type="button" disabled={!selectedReviewerId || Boolean(latestReviewAssignment && latestReviewAssignment.status !== "completed")} onClick={assignIndependentReviewer}>{latestReviewAssignment ? `Review ${latestReviewAssignment.status.replaceAll("-", " ")}` : "Assign independent review"}</button>
            <button className="button button--ai" disabled={project.collaborationSettings.requireIndependentReviewer && latestReviewAssignment?.status !== "completed"} onClick={() => requestStageApproval("validationRealization", "Solution Architect")} data-testid="request-review-approval">Submit immutable baseline for approval</button>
            {project.collaborationSettings.requireIndependentReviewer && latestReviewAssignment?.status !== "completed" ? <small>Submission is gated until the assigned independent review is completed.</small> : null}
          </article>}
        </section>
      ) : null}
    </section>
  );
}
