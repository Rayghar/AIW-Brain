import { CheckCircle2, CircleAlert, Download, FileJson, FileText, Layers3 } from "lucide-react";
import type { ArchitectureProject } from "@aiw/domain";
import { useWorkspaceStore } from "../../store/workspaceStore";
import type { DeliveryStageAssessment, DeliveryStageId } from "../../lib/guidedDelivery";
import { deliverySlug, downloadDeliveryFile } from "./utils";

interface OutputCard {
  label: string;
  value: string;
  detail: string;
}

function stageNodes(project: ArchitectureProject, stage: string) {
  return project.nodes.filter((node) => node.stage === stage && node.status !== "deprecated");
}

function outputEvidence(stageId: DeliveryStageId, project: ArchitectureProject): OutputCard[] {
  const nodes = (stage: string) => stageNodes(project, stage);
  if (stageId === "requirements") return [
    { label: "Problem statement", value: project.description.trim() ? "Captured" : "Missing", detail: project.description.trim().slice(0, 180) || "No problem statement yet." },
    { label: "Business objectives", value: String(project.objectives.length), detail: project.objectives.slice(0, 3).join(" · ") || "No objectives yet." },
    { label: "Constraints", value: String(project.constraints.length), detail: project.constraints.slice(0, 3).join(" · ") || "No constraints yet." },
    { label: "Stakeholders", value: String(project.context.stakeholders?.length ?? 0), detail: project.context.stakeholders?.join(" · ") || "No stakeholders yet." },
  ];
  if (stageId === "quality") {
    const priorities = project.qualityPriorities.filter((item) => item.weight >= 3).sort((a, b) => b.weight - a.weight);
    return [
      { label: "Priority drivers", value: String(priorities.length), detail: priorities.slice(0, 5).map((item) => `${item.attributeId} ${item.weight}/5`).join(" · ") || "No priority drivers yet." },
      { label: "Quality scenarios", value: String(project.qualityScenarios.length), detail: project.qualityScenarios.slice(0, 3).map((item) => item.responseMeasure || item.stimulus || item.attributeId).join(" · ") || "No scenarios yet." },
      { label: "Calibrated decisions", value: String(project.qualityPriorities.filter((item) => item.weight > 0).length), detail: "Only approved calibration influences deterministic ranking." },
    ];
  }
  if (stageId === "logical") {
    const items = nodes("logicalApplication");
    return [
      { label: "Logical objects", value: String(items.length), detail: items.map((item) => item.label).slice(0, 6).join(" · ") || "No logical objects yet." },
      { label: "Relationships", value: String(project.edges.filter((item) => item.stage === "logicalApplication").length), detail: "Primary responsibilities and interactions." },
      { label: "Accepted styles", value: String(project.styleDecisions.filter((item) => item.status === "accepted").length), detail: project.styleDecisions.filter((item) => item.status === "accepted").map((item) => item.styleId).join(" · ") || "No accepted style." },
      { label: "Accepted patterns", value: String(project.patternSelections.filter((item) => item.status === "accepted").length), detail: project.patternSelections.filter((item) => item.status === "accepted").map((item) => item.patternId).join(" · ") || "No accepted pattern." },
    ];
  }
  if (stageId === "realization") {
    const items = nodes("applicationRealization");
    return [
      { label: "Realization objects", value: String(items.length), detail: items.map((item) => item.label).slice(0, 6).join(" · ") || "No realization objects yet." },
      { label: "With upstream lineage", value: String(items.filter((item) => item.lineageFrom.length > 0).length), detail: `${items.filter((item) => item.lineageFrom.length > 0).length}/${items.length} trace to logical components.` },
      { label: "Implementation decisions", value: String(project.decisions.length), detail: project.decisions.slice(-3).map((item) => item.title).join(" · ") || "No implementation decisions yet." },
    ];
  }
  if (stageId === "logicalTechnology") {
    const items = nodes("logicalTechnology");
    return [
      { label: "Technology capabilities", value: String(items.length), detail: items.map((item) => item.label).slice(0, 7).join(" · ") || "No technology capabilities yet." },
      { label: "With upstream lineage", value: String(items.filter((item) => item.lineageFrom.length > 0).length), detail: `${items.filter((item) => item.lineageFrom.length > 0).length}/${items.length} trace to application needs.` },
      { label: "Open obligations", value: String(project.patternSelections.filter((item) => item.status === "accepted" && item.obligationsAcknowledged.length === 0).length), detail: "Accepted patterns must create acknowledged obligations." },
    ];
  }
  if (stageId === "physicalTechnology") {
    const items = nodes("physicalTechnology");
    return [
      { label: "Deployment objects", value: String(items.length), detail: items.map((item) => item.label).slice(0, 7).join(" · ") || "No deployment objects yet." },
      { label: "Runtime inventories", value: String(project.runtimeInventories.length), detail: "Runtime evidence strengthens production acceptance." },
      { label: "Deployment profiles", value: String(project.deploymentProfiles.length), detail: "Profiles connect intended topology to deployable configuration." },
    ];
  }
  if (stageId === "review") {
    const approval = [...project.stageApprovals].reverse().find((item) => item.stage === "validationRealization");
    return [
      { label: "Persisted review runs", value: String(project.aiReviewHistory.length), detail: project.aiReviewHistory.at(-1)?.summary ?? "No governed review run recorded." },
      { label: "Persisted findings", value: String(project.findings.length), detail: `${project.findings.filter((item) => item.severity === "HARD").length} hard blocker(s).` },
      { label: "Architecture decisions", value: String(project.decisions.length), detail: project.decisions.slice(-4).map((item) => item.title).join(" · ") || "No decisions recorded." },
      { label: "Review disposition", value: approval?.status ?? "Not submitted", detail: approval?.reviewer ? `Reviewer: ${approval.reviewer}` : "Submit an immutable baseline for disposition." },
    ];
  }
  return [
    { label: "Approved baseline", value: project.stageApprovals.some((item) => item.stage === "validationRealization" && item.status === "approved") ? "Available" : "Missing", detail: "Final generation is permitted only from an approved review baseline." },
    { label: "Architecture objects", value: String(project.nodes.length), detail: "Objects across the complete architecture lifecycle." },
    { label: "Decisions", value: String(project.decisions.length), detail: "Governed ADRs available to the delivery pack." },
    { label: "Findings", value: String(project.findings.length), detail: `${project.findings.filter((item) => item.severity === "HARD").length} hard blocker(s).` },
  ];
}

function stageModelEvidence(stageId: DeliveryStageId, project: ArchitectureProject) {
  const stageMap: Partial<Record<DeliveryStageId, string>> = {
    logical: "logicalApplication",
    realization: "applicationRealization",
    logicalTechnology: "logicalTechnology",
    physicalTechnology: "physicalTechnology",
  };
  const stage = stageMap[stageId];
  return {
    nodes: stage ? project.nodes.filter((node) => node.stage === stage).map((node) => ({ id: node.id, label: node.label, kind: node.kind, status: node.status, lineageFrom: node.lineageFrom, owner: node.properties.owner ?? node.properties.team ?? null })) : [],
    edges: stage ? project.edges.filter((edge) => edge.stage === stage).map((edge) => ({ id: edge.id, sourceId: edge.sourceId, targetId: edge.targetId, kind: edge.kind, label: edge.label ?? null })) : [],
    decisions: project.decisions.map((item) => ({ id: item.id, title: item.title, status: item.status })),
    findings: project.findings.map((item) => ({ id: item.id, severity: item.severity, title: item.title })),
  };
}

export function buildStageEvidenceSnapshot(stageId: DeliveryStageId, assessment: DeliveryStageAssessment, project: ArchitectureProject) {
  return {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    project: { id: project.id, name: project.name, branchId: project.branch.id, branch: project.branch.name, revision: project.revision },
    stage: { id: stageId, title: assessment.definition.title, status: assessment.status, progress: assessment.progress, nextAction: assessment.nextAction },
    tasks: assessment.definition.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      success: task.success,
      checks: task.checkIds.map((id) => assessment.checks.find((check) => check.id === id)).filter(Boolean),
    })),
    expectedArtifacts: assessment.definition.outputs,
    summary: outputEvidence(stageId, project),
    modelEvidence: stageModelEvidence(stageId, project),
  };
}

export function StageOutputEvidence({ stageId, assessment, onFixCheck }: { stageId: DeliveryStageId; assessment: DeliveryStageAssessment; onFixCheck: (checkId: string) => void }) {
  const project = useWorkspaceStore((state) => state.project);
  const cards = outputEvidence(stageId, project);
  const snapshot = buildStageEvidenceSnapshot(stageId, assessment, project);
  const stageName = `${deliverySlug(project.name)}-${deliverySlug(assessment.definition.shortTitle)}-evidence.json`;

  return (
    <section className="guided-output-view">
      <div className="guided-task-plan__intro guided-output-heading">
        <div><span className="guided-kicker"><Layers3 size={14} /> Generated stage output</span><h2>Review what this stage has actually produced</h2><p>Evidence is projected from the canonical project model. Visiting a page never counts as completion.</p></div>
        <button type="button" onClick={() => downloadDeliveryFile(stageName, JSON.stringify(snapshot, null, 2), "application/json")}><Download size={15} /> Export stage evidence</button>
      </div>
      <div className="guided-output-grid">
        {cards.map((item) => <article key={item.label}><span>{item.label}</span><strong>{item.value}</strong><p>{item.detail}</p></article>)}
      </div>

      <div className="guided-evidence-matrix">
        <div className="guided-evidence-matrix__heading"><div><span className="guided-kicker"><FileJson size={14} /> Task-to-evidence matrix</span><h3>What each task produced and what remains</h3></div><span>{assessment.requiredPassed}/{assessment.requiredTotal} required checks</span></div>
        <div className="guided-evidence-matrix__rows">
          {assessment.definition.tasks.map((task, index) => {
            const checks = task.checkIds.map((id) => assessment.checks.find((check) => check.id === id)).filter((check): check is NonNullable<typeof check> => Boolean(check));
            const done = checks.length > 0 && checks.every((check) => check.done);
            return <article key={task.id} className={done ? "is-complete" : "is-open"}>
              <span className="guided-evidence-matrix__number">{done ? <CheckCircle2 size={17} /> : index + 1}</span>
              <div className="guided-evidence-matrix__task"><strong>{task.title}</strong><p>{task.success}</p></div>
              <div className="guided-evidence-matrix__checks">
                {checks.map((check) => <button type="button" key={check.id} className={check.done ? "is-done" : check.required ? "is-required" : "is-recommended"} onClick={() => !check.done && onFixCheck(check.id)}>
                  {check.done ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}<span><b>{check.label}</b><small>{check.evidence ?? check.description}</small></span>
                </button>)}
              </div>
            </article>;
          })}
        </div>
      </div>

      <div className="guided-artifact-list">
        <strong>Expected handoff artifacts</strong>
        {assessment.definition.outputs.map((item) => <span key={item}><FileText size={14} /> {item}</span>)}
      </div>
    </section>
  );
}
