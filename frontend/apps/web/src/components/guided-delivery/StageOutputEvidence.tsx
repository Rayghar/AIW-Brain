import {
  CheckCircle2,
  CircleAlert,
  Download,
  FileJson,
  FileText,
  GitBranch,
  Layers3,
  Network,
  Target,
} from "lucide-react";
import type { ArchitectureProject } from "@aiw/domain";
import { useWorkspaceStore } from "../../store/workspaceStore";
import type {
  DeliveryStageAssessment,
  DeliveryStageId,
} from "../../lib/guidedDelivery";
import { JourneySequenceDiagram } from "../requirements/JourneySequenceDiagram";
import { deliverySlug, downloadDeliveryFile } from "./utils";

interface OutputCard {
  label: string;
  value: string;
  detail: string;
}

const modelStageMap: Partial<Record<DeliveryStageId, string>> = {
  logical: "logicalApplication",
  realization: "applicationRealization",
  logicalTechnology: "logicalTechnology",
  physicalTechnology: "physicalTechnology",
};

function stageNodes(project: ArchitectureProject, stage: string) {
  return project.nodes.filter(
    (node) => node.stage === stage && node.status !== "deprecated",
  );
}

function text(value: unknown, fallback = "Not recorded") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return fallback;
}

interface RationalePoint {
  title: string;
  evidence: string;
  consequence: string;
}

function designRationaleEvidence(
  stageId: DeliveryStageId,
  project: ArchitectureProject,
): RationalePoint[] {
  const acceptedRequirements =
    project.requirementsIntelligence?.requirements.filter(
      (item) => item.status === "accepted",
    ) ?? [];
  const acceptedJourneys =
    project.requirementsIntelligence?.journeys.filter(
      (item) => item.status === "accepted",
    ) ?? [];
  const stageFor = modelStageMap[stageId];
  const modelNodes = stageFor
    ? stageNodes(project, stageFor).filter(
        (node) =>
          !(stageId === "logical" && node.tags.includes("system-context")),
      )
    : [];
  const modelNodeIds = new Set(modelNodes.map((node) => node.id));
  const modelEdges = stageFor
    ? project.edges.filter(
        (edge) =>
          edge.stage === stageFor &&
          modelNodeIds.has(edge.sourceId) &&
          modelNodeIds.has(edge.targetId),
      )
    : [];
  const acceptedStyles = stageFor
    ? project.styleDecisions.filter(
        (item) => item.stage === stageFor && item.status === "accepted",
      )
    : [];
  const acceptedPatterns = stageFor
    ? project.patternSelections.filter(
        (item) => item.stage === stageFor && item.status === "accepted",
      )
    : [];

  if (stageId === "requirements")
    return [
      {
        title: "Intent is explicit",
        evidence: `${project.objectives.length} objective(s), ${project.constraints.length} constraint(s) and ${project.context.stakeholders?.length ?? 0} stakeholder(s) are recorded.`,
        consequence:
          "Later recommendations can be tested against the stated outcome and boundaries rather than generic architecture preferences.",
      },
      {
        title: "Evidence is governed",
        evidence: `${acceptedRequirements.length} accepted requirement(s) are linked to ${project.requirementsIntelligence?.sources.length ?? 0} source(s).`,
        consequence:
          "Inferred content remains distinguishable from architect-confirmed project truth.",
      },
      {
        title: "Journeys connect intent to design",
        evidence: `${acceptedJourneys.length} accepted journey(s) expose actors, interactions, failure paths and architecture obligations.`,
        consequence:
          "System Context and logical responsibilities can be generated from actual solution behaviour.",
      },
    ];
  if (stageId === "quality") {
    const priorities = project.qualityPriorities.filter(
      (item) => item.weight >= 3,
    );
    return [
      {
        title: "Drivers are prioritised",
        evidence: `${priorities.length} quality attribute(s) carry a material priority.`,
        consequence:
          "Architecture choices are ranked by measurable business importance rather than fashion or vendor preference.",
      },
      {
        title: "Scenarios make quality testable",
        evidence: `${project.qualityScenarios.length} quality scenario(s) define stimulus, response and expected measure.`,
        consequence:
          "Tactics, patterns and fitness tests can be justified and verified.",
      },
      {
        title: "Authority remains gated",
        evidence:
          project.qualityScenarios.length && priorities.length
            ? "The minimum calibration evidence is present."
            : "The recommendation remains provisional until priorities and measurable scenarios are accepted.",
        consequence:
          "AIW does not present an uncalibrated style score as an authoritative architecture decision.",
      },
    ];
  }
  if (stageId === "context") {
    const contextNodes = project.nodes.filter(
      (node) =>
        node.stage === "logicalApplication" &&
        node.tags.includes("system-context") &&
        node.status !== "deprecated",
    );
    const contextIds = new Set(contextNodes.map((node) => node.id));
    const interactions = project.edges.filter(
      (edge) => contextIds.has(edge.sourceId) && contextIds.has(edge.targetId),
    );
    return [
      {
        title: "The system boundary is explicit",
        evidence: `${contextNodes.filter((node) => node.tags.includes("system-of-interest")).length} system-of-interest boundary and ${contextNodes.filter((node) => !node.tags.includes("system-of-interest")).length} external participant(s) are modelled.`,
        consequence:
          "Internal decomposition begins from a controlled scope rather than absorbing external responsibilities.",
      },
      {
        title: "Interactions preserve journey intent",
        evidence: `${interactions.length} context interaction(s) are derived from ${acceptedJourneys.length} approved journey(s).`,
        consequence:
          "Logical design must disposition every meaningful external exchange.",
      },
      {
        title: "Obligations travel downstream",
        evidence: `${project.requirementsIntelligence?.contextPackages.find((item) => item.target === "systemContext")?.architectureObligations.length ?? 0} architecture obligation(s) are carried by the context package.`,
        consequence:
          "Security, data, resilience and interface needs cannot disappear during decomposition.",
      },
    ];
  }
  if (stageFor)
    return [
      {
        title: "The model is scope-specific",
        evidence: `${modelNodes.length} primary object(s) and ${modelEdges.length} relationship(s) express the ${assessmentLabel(stageId)} concern.`,
        consequence:
          "Upstream context remains traceable without cluttering the active design canvas.",
      },
      {
        title: "Decisions constrain the design",
        evidence: `${acceptedStyles.length} accepted style decision(s) and ${acceptedPatterns.length} accepted pattern selection(s) apply to this stage.`,
        consequence:
          "Components and relationships are evaluated against explicit architecture choices and obligations.",
      },
      {
        title: "Lineage remains visible",
        evidence: `${modelNodes.filter((node) => node.lineageFrom.length).length} object(s) retain upstream lineage.`,
        consequence:
          "Reviewers can explain which requirement, journey or earlier-stage responsibility caused each design element.",
      },
    ];
  if (stageId === "review") {
    const openFindings = project.findings;
    return [
      {
        title: "Risk is explicit",
        evidence: `${openFindings.length} open finding(s) remain visible with severity, affected scope and disposition state.`,
        consequence:
          "Approval cannot be inferred from a polished diagram while material gaps remain unresolved.",
      },
      {
        title: "Decisions are durable",
        evidence: `${project.decisions.length} architecture decision(s) record rationale, alternatives or consequences.`,
        consequence:
          "The implementation handoff preserves why the design was chosen, not only what was drawn.",
      },
      {
        title: "Evidence controls approval",
        evidence: `${project.stageApprovals.length} stage disposition record(s) are persisted.`,
        consequence:
          "Governance actions operate on a reviewable baseline rather than transient page calculations.",
      },
    ];
  }
  const approved = project.stageApprovals.some(
    (item) =>
      item.stage === "validationRealization" && item.status === "approved",
  );
  return [
    {
      title: "The pack reflects canonical truth",
      evidence: `${project.nodes.length} object(s), ${project.interfaces?.length ?? 0} interface(s), ${project.decisions.length} decision(s) and ${project.findings.length} finding(s) are available to the composer.`,
      consequence:
        "The SDD is generated from the governed model rather than manually reconstructed prose.",
    },
    {
      title: "Approval is not fabricated",
      evidence: approved
        ? "An approved architecture baseline is available."
        : "The review baseline is not yet approved.",
      consequence: approved
        ? "Final generation may proceed when the remaining delivery evidence is complete."
        : "Final generation stays locked until accountable review is complete.",
    },
    {
      title: "Gaps remain visible",
      evidence: `${project.findings.length} unresolved finding(s) remain in the delivery context.`,
      consequence:
        "The document cannot silently transform missing evidence into confident implementation claims.",
    },
  ];
}

function assessmentLabel(stageId: DeliveryStageId) {
  if (stageId === "logical") return "logical responsibility";
  if (stageId === "realization") return "application realisation";
  if (stageId === "logicalTechnology") return "technology capability";
  if (stageId === "physicalTechnology") return "deployment topology";
  return "architecture";
}

function outputEvidence(
  stageId: DeliveryStageId,
  project: ArchitectureProject,
): OutputCard[] {
  const nodes = (stage: string) => stageNodes(project, stage);
  if (stageId === "requirements")
    return [
      {
        label: "Problem statement",
        value: project.description.trim() ? "Captured" : "Missing",
        detail:
          project.description.trim().slice(0, 180) ||
          "No problem statement yet.",
      },
      {
        label: "Business objectives",
        value: String(project.objectives.length),
        detail:
          project.objectives.slice(0, 3).join(" · ") || "No objectives yet.",
      },
      {
        label: "Constraints",
        value: String(project.constraints.length),
        detail:
          project.constraints.slice(0, 3).join(" · ") || "No constraints yet.",
      },
      {
        label: "Stakeholders",
        value: String(project.context.stakeholders?.length ?? 0),
        detail:
          project.context.stakeholders?.slice(0, 4).join(" · ") ||
          "No stakeholders yet.",
      },
    ];
  if (stageId === "quality") {
    const priorities = project.qualityPriorities
      .filter((item) => item.weight >= 3)
      .sort((a, b) => b.weight - a.weight);
    return [
      {
        label: "Priority drivers",
        value: String(priorities.length),
        detail:
          priorities
            .slice(0, 5)
            .map((item) => `${item.attributeId} ${item.weight}/5`)
            .join(" · ") || "No priority drivers yet.",
      },
      {
        label: "Quality scenarios",
        value: String(project.qualityScenarios.length),
        detail:
          project.qualityScenarios
            .slice(0, 3)
            .map(
              (item) =>
                item.responseMeasure || item.stimulus || item.attributeId,
            )
            .join(" · ") || "No scenarios yet.",
      },
      {
        label: "Calibrated decisions",
        value: String(
          project.qualityPriorities.filter((item) => item.weight > 0).length,
        ),
        detail: "Only approved calibration influences deterministic ranking.",
      },
    ];
  }
  if (stageId === "context") {
    const intelligence = project.requirementsIntelligence;
    const contextNodes = project.nodes.filter(
      (item) =>
        item.stage === "logicalApplication" &&
        item.tags.includes("system-context") &&
        item.status !== "deprecated",
    );
    const ids = new Set(contextNodes.map((item) => item.id));
    return [
      {
        label: "System boundary",
        value: contextNodes.some((item) =>
          item.tags.includes("system-of-interest"),
        )
          ? "Defined"
          : "Missing",
        detail:
          contextNodes.find((item) => item.tags.includes("system-of-interest"))
            ?.label ?? "No canonical system of interest yet.",
      },
      {
        label: "Context participants",
        value: String(contextNodes.length),
        detail:
          contextNodes
            .filter((item) => !item.tags.includes("system-of-interest"))
            .slice(0, 6)
            .map((item) => item.label)
            .join(" · ") || "No actors or external systems yet.",
      },
      {
        label: "Context interactions",
        value: String(
          project.edges.filter(
            (item) =>
              item.stage === "logicalApplication" &&
              ids.has(item.sourceId) &&
              ids.has(item.targetId),
          ).length,
        ),
        detail:
          "Requirement- and journey-linked exchanges across the system boundary.",
      },
      {
        label: "Journey coverage",
        value: String(
          intelligence?.journeys.filter((item) => item.status === "accepted")
            .length ?? 0,
        ),
        detail:
          intelligence?.journeys
            .filter((item) => item.status === "accepted")
            .slice(0, 4)
            .map((item) => item.name)
            .join(" · ") || "No approved journeys.",
      },
    ];
  }
  if (stageId === "logical") {
    const items = nodes("logicalApplication");
    return [
      {
        label: "Logical objects",
        value: String(items.length),
        detail:
          items
            .map((item) => item.label)
            .slice(0, 6)
            .join(" · ") || "No logical objects yet.",
      },
      {
        label: "Relationships",
        value: String(
          project.edges.filter((item) => item.stage === "logicalApplication")
            .length,
        ),
        detail: "Primary responsibilities and interactions.",
      },
      {
        label: "Accepted styles",
        value: String(
          project.styleDecisions.filter((item) => item.status === "accepted")
            .length,
        ),
        detail:
          project.styleDecisions
            .filter((item) => item.status === "accepted")
            .map((item) => item.styleId)
            .join(" · ") || "No accepted style.",
      },
      {
        label: "Accepted patterns",
        value: String(
          project.patternSelections.filter((item) => item.status === "accepted")
            .length,
        ),
        detail:
          project.patternSelections
            .filter((item) => item.status === "accepted")
            .map((item) => item.patternId)
            .join(" · ") || "No accepted pattern.",
      },
    ];
  }
  if (stageId === "realization") {
    const items = nodes("applicationRealization");
    return [
      {
        label: "Realization objects",
        value: String(items.length),
        detail:
          items
            .map((item) => item.label)
            .slice(0, 6)
            .join(" · ") || "No realization objects yet.",
      },
      {
        label: "With upstream lineage",
        value: String(
          items.filter((item) => item.lineageFrom.length > 0).length,
        ),
        detail: `${items.filter((item) => item.lineageFrom.length > 0).length}/${items.length} trace to logical components.`,
      },
      {
        label: "Implementation decisions",
        value: String(project.decisions.length),
        detail:
          project.decisions
            .slice(-3)
            .map((item) => item.title)
            .join(" · ") || "No implementation decisions yet.",
      },
    ];
  }
  if (stageId === "logicalTechnology") {
    const items = nodes("logicalTechnology");
    return [
      {
        label: "Technology capabilities",
        value: String(items.length),
        detail:
          items
            .map((item) => item.label)
            .slice(0, 7)
            .join(" · ") || "No technology capabilities yet.",
      },
      {
        label: "With upstream lineage",
        value: String(
          items.filter((item) => item.lineageFrom.length > 0).length,
        ),
        detail: `${items.filter((item) => item.lineageFrom.length > 0).length}/${items.length} trace to application needs.`,
      },
      {
        label: "Open obligations",
        value: String(
          project.patternSelections.filter(
            (item) =>
              item.status === "accepted" &&
              item.obligationsAcknowledged.length === 0,
          ).length,
        ),
        detail: "Accepted patterns must create acknowledged obligations.",
      },
    ];
  }
  if (stageId === "physicalTechnology") {
    const items = nodes("physicalTechnology");
    return [
      {
        label: "Deployment objects",
        value: String(items.length),
        detail:
          items
            .map((item) => item.label)
            .slice(0, 7)
            .join(" · ") || "No deployment objects yet.",
      },
      {
        label: "Runtime inventories",
        value: String(project.runtimeInventories.length),
        detail: "Runtime evidence strengthens production acceptance.",
      },
      {
        label: "Deployment profiles",
        value: String(project.deploymentProfiles.length),
        detail:
          "Profiles connect intended topology to deployable configuration.",
      },
    ];
  }
  if (stageId === "review") {
    const approval = [...project.stageApprovals]
      .reverse()
      .find((item) => item.stage === "validationRealization");
    return [
      {
        label: "Persisted review runs",
        value: String(project.aiReviewHistory.length),
        detail:
          project.aiReviewHistory.at(-1)?.summary ??
          "No governed review run recorded.",
      },
      {
        label: "Persisted findings",
        value: String(project.findings.length),
        detail: `${project.findings.filter((item) => item.severity === "HARD").length} hard blocker(s).`,
      },
      {
        label: "Architecture decisions",
        value: String(project.decisions.length),
        detail:
          project.decisions
            .slice(-4)
            .map((item) => item.title)
            .join(" · ") || "No decisions recorded.",
      },
      {
        label: "Review disposition",
        value: approval?.status ?? "Not submitted",
        detail: approval?.reviewer
          ? `Reviewer: ${approval.reviewer}`
          : "Submit an immutable baseline for disposition.",
      },
    ];
  }
  return [
    {
      label: "Approved baseline",
      value: project.stageApprovals.some(
        (item) =>
          item.stage === "validationRealization" && item.status === "approved",
      )
        ? "Available"
        : "Missing",
      detail:
        "Final generation is permitted only from an approved review baseline.",
    },
    {
      label: "Architecture objects",
      value: String(project.nodes.length),
      detail: "Objects across the complete architecture lifecycle.",
    },
    {
      label: "Decisions",
      value: String(project.decisions.length),
      detail: "Governed ADRs available to the delivery pack.",
    },
    {
      label: "Findings",
      value: String(project.findings.length),
      detail: `${project.findings.filter((item) => item.severity === "HARD").length} hard blocker(s).`,
    },
  ];
}

function actualStageEvidence(
  stageId: DeliveryStageId,
  project: ArchitectureProject,
) {
  if (stageId === "requirements")
    return {
      problemStatement: project.description,
      objectives: project.objectives,
      stakeholders: project.context.stakeholders ?? [],
      inScopeCapabilities: project.context.inScopeCapabilities ?? [],
      outOfScopeCapabilities: project.context.outOfScopeCapabilities ?? [],
      constraints: project.constraints,
      assumptions: project.assumptions,
      existingSystems: project.context.existingSystems ?? [],
      dataClassifications: project.context.dataClassifications ?? [],
      regulatoryJurisdictions: project.context.regulatoryJurisdictions ?? [],
    };
  if (stageId === "quality")
    return {
      priorities: project.qualityPriorities,
      scenarios: project.qualityScenarios,
      availabilityTarget: project.context.availabilityTarget ?? null,
      recoveryObjectives: project.context.recoveryObjectives ?? null,
      workloadProfile: project.context.workloadProfile ?? null,
    };
  if (stageId === "context") {
    const contextNodes = project.nodes.filter(
      (node) =>
        node.stage === "logicalApplication" &&
        node.tags.includes("system-context"),
    );
    const ids = new Set(contextNodes.map((node) => node.id));
    return {
      contextPackage:
        project.requirementsIntelligence?.contextPackages.find(
          (item) => item.target === "systemContext",
        ) ?? null,
      nodes: contextNodes,
      interactions: project.edges.filter(
        (edge) =>
          edge.stage === "logicalApplication" &&
          ids.has(edge.sourceId) &&
          ids.has(edge.targetId),
      ),
      journeys:
        project.requirementsIntelligence?.journeys.filter(
          (item) => item.status === "accepted",
        ) ?? [],
      openQuestions:
        project.requirementsIntelligence?.openQuestions.filter(
          (item) => item.status === "open",
        ) ?? [],
    };
  }
  const modelStage = modelStageMap[stageId];
  if (modelStage) {
    return {
      nodes: project.nodes.filter(
        (node) => node.stage === modelStage && node.status !== "deprecated",
      ),
      edges: project.edges.filter((edge) => edge.stage === modelStage),
      interfaces: (project.interfaces ?? []).filter(
        (item) => item.stage === modelStage,
      ),
      acceptedStyles: project.styleDecisions.filter(
        (item) => item.status === "accepted",
      ),
      acceptedPatterns: project.patternSelections.filter(
        (item) => item.status === "accepted",
      ),
      decisions: project.decisions,
    };
  }
  if (stageId === "review")
    return {
      findings: project.findings,
      decisions: project.decisions,
      reviewHistory: project.aiReviewHistory,
      approvals: project.stageApprovals,
    };
  return {
    approvedBaseline: project.stageApprovals.filter(
      (item) => item.stage === "validationRealization",
    ),
    objects: project.nodes,
    relationships: project.edges,
    interfaces: project.interfaces ?? [],
    decisions: project.decisions,
    findings: project.findings,
    deploymentProfiles: project.deploymentProfiles,
  };
}

function stageModelEvidence(
  stageId: DeliveryStageId,
  project: ArchitectureProject,
) {
  const stage = modelStageMap[stageId];
  return {
    nodes: stage
      ? project.nodes
          .filter((node) => node.stage === stage)
          .map((node) => ({
            id: node.id,
            label: node.label,
            kind: node.kind,
            status: node.status,
            lineageFrom: node.lineageFrom,
            owner: node.properties.owner ?? node.properties.team ?? null,
          }))
      : [],
    edges: stage
      ? project.edges
          .filter((edge) => edge.stage === stage)
          .map((edge) => ({
            id: edge.id,
            sourceId: edge.sourceId,
            targetId: edge.targetId,
            kind: edge.kind,
            label: edge.label ?? null,
          }))
      : [],
    decisions: project.decisions.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
    })),
    findings: project.findings.map((item) => ({
      id: item.id,
      severity: item.severity,
      title: item.title,
    })),
  };
}

export function buildStageEvidenceSnapshot(
  stageId: DeliveryStageId,
  assessment: DeliveryStageAssessment,
  project: ArchitectureProject,
) {
  return {
    schemaVersion: "1.1",
    generatedAt: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      branchId: project.branch.id,
      branch: project.branch.name,
      revision: project.revision,
    },
    stage: {
      id: stageId,
      title: assessment.definition.title,
      status: assessment.status,
      progress: assessment.progress,
      nextAction: assessment.nextAction,
    },
    tasks: assessment.definition.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      success: task.success,
      checks: task.checkIds
        .map((id) => assessment.checks.find((check) => check.id === id))
        .filter(Boolean),
    })),
    expectedArtifacts: assessment.definition.outputs,
    summary: outputEvidence(stageId, project),
    actualOutput: actualStageEvidence(stageId, project),
    modelEvidence: stageModelEvidence(stageId, project),
  };
}

const rationaleCopy: Record<DeliveryStageId, string> = {
  requirements:
    "Explain how the captured outcomes, scope, stakeholders, constraints and assumptions form a defensible design contract.",
  quality:
    "Explain how priorities and measurable scenarios constrain architecture decisions and expose trade-offs.",
  context:
    "Explain how the system boundary, actors, external systems and major interactions preserve the approved requirements and journey intent before internal decomposition.",
  logical:
    "Explain how responsibilities, boundaries, relationships and quality tactics realise the requirements.",
  realization:
    "Explain how deployable components and interfaces realise the logical design.",
  logicalTechnology:
    "Explain why provider-neutral capabilities satisfy application and quality obligations.",
  physicalTechnology:
    "Explain why products, topology, zones and recovery choices satisfy the approved design.",
  review:
    "Explain findings, evidence, decisions, traceability and approval blockers.",
  sdd: "Explain how the approved model and its evidence form a coherent implementation and governance handoff.",
};

function ListBlock({
  title,
  items,
  empty = "Nothing recorded yet.",
}: {
  title: string;
  items: string[];
  empty?: string;
}) {
  return (
    <section className="guided-actual-output__block">
      <h4>{title}</h4>
      {items.length ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="guided-actual-output__empty">{empty}</p>
      )}
    </section>
  );
}

function RequirementsOutput({ project }: { project: ArchitectureProject }) {
  const intelligence = project.requirementsIntelligence;
  const requirements =
    intelligence?.requirements.filter((item) => item.status === "accepted") ??
    [];
  const journeys =
    intelligence?.journeys.filter((item) => item.status === "accepted") ?? [];
  return (
    <div className="guided-actual-output__requirements">
      <section className="guided-actual-output__statement">
        <span>Problem statement</span>
        <p>
          {text(project.description, "No problem statement has been captured.")}
        </p>
      </section>
      {intelligence ? (
        <div className="guided-output-grid guided-output-grid--summary">
          <article>
            <span>Governed sources</span>
            <strong>{intelligence.sources.length}</strong>
            <p>
              {intelligence.sources
                .slice(0, 3)
                .map((item) => item.name)
                .join(" · ")}
            </p>
          </article>
          <article>
            <span>Accepted requirements</span>
            <strong>{requirements.length}</strong>
            <p>
              {
                requirements.filter(
                  (item) =>
                    item.priority === "critical" || item.priority === "high",
                ).length
              }{" "}
              critical/high priority
            </p>
          </article>
          <article>
            <span>Major journeys</span>
            <strong>{journeys.length}</strong>
            <p>
              {journeys
                .slice(0, 3)
                .map((item) => item.name)
                .join(" · ")}
            </p>
          </article>
          <article>
            <span>Traceability health</span>
            <strong>{intelligence.health.traceability}%</strong>
            <p>
              {intelligence.health.openCriticalQuestions} critical question(s)
              open
            </p>
          </article>
        </div>
      ) : null}
      <div className="guided-actual-output__columns">
        <ListBlock title="Business objectives" items={project.objectives} />
        <ListBlock
          title="Stakeholders and concerns"
          items={
            intelligence?.stakeholders
              .filter((item) => item.status === "accepted")
              .map(
                (item) =>
                  `${item.name} — ${item.role}: ${item.concerns.join(", ")}`,
              ) ??
            project.context.stakeholders ??
            []
          }
        />
        <ListBlock
          title="In scope"
          items={project.context.inScopeCapabilities ?? []}
        />
        <ListBlock
          title="Out of scope"
          items={project.context.outOfScopeCapabilities ?? []}
        />
        <ListBlock
          title="Requirements catalogue"
          items={requirements
            .slice(0, 12)
            .map(
              (item) => `[${item.type} · ${item.priority}] ${item.statement}`,
            )}
        />
        <ListBlock
          title="Constraints and assumptions"
          items={[
            ...project.constraints.map((item) => `Constraint: ${item}`),
            ...project.assumptions.map((item) => `Assumption: ${item}`),
          ]}
        />
        <ListBlock
          title="Existing systems"
          items={project.context.existingSystems ?? []}
        />
        <ListBlock
          title="Open architecture questions"
          items={
            intelligence?.openQuestions
              .filter((item) => item.status === "open")
              .slice(0, 8)
              .map((item) => `${item.impact}: ${item.question}`) ?? []
          }
        />
      </div>
      {journeys[0] ? (
        <div className="guided-actual-output__catalog">
          <header>
            <div>
              <Network size={15} />
              <h4>Major Journey Atlas preview</h4>
            </div>
            <span>{journeys.length}</span>
          </header>
          <JourneySequenceDiagram journey={journeys[0]} compact />
        </div>
      ) : null}
    </div>
  );
}

function ContextOutput({ project }: { project: ArchitectureProject }) {
  const nodes = project.nodes.filter(
    (node) =>
      node.stage === "logicalApplication" &&
      node.tags.includes("system-context") &&
      node.status !== "deprecated",
  );
  const ids = new Set(nodes.map((node) => node.id));
  const edges = project.edges.filter(
    (edge) =>
      edge.stage === "logicalApplication" &&
      ids.has(edge.sourceId) &&
      ids.has(edge.targetId),
  );
  const byId = new Map(nodes.map((node) => [node.id, node.label]));
  const journeys =
    project.requirementsIntelligence?.journeys.filter(
      (item) => item.status === "accepted",
    ) ?? [];
  return (
    <div className="guided-actual-output__model">
      <section className="guided-actual-output__catalog">
        <header>
          <div>
            <Network size={15} />
            <h4>System Context participants</h4>
          </div>
          <span>{nodes.length}</span>
        </header>
        {nodes.length ? (
          <div className="guided-actual-output__table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Context role</th>
                  <th>Description</th>
                  <th>Journey lineage</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node) => (
                  <tr key={node.id}>
                    <td>
                      <strong>{node.label}</strong>
                    </td>
                    <td>
                      {node.tags.includes("system-of-interest")
                        ? "System of interest"
                        : node.tags.includes("context-actor")
                          ? "Actor"
                          : "External system"}
                    </td>
                    <td>{text(node.description)}</td>
                    <td>
                      {Array.isArray(node.properties.journeyRefs)
                        ? (node.properties.journeyRefs as string[]).join(", ")
                        : "Not linked"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="guided-actual-output__empty">
            No accepted System Context model yet.
          </p>
        )}
      </section>
      <section className="guided-actual-output__catalog">
        <header>
          <div>
            <GitBranch size={15} />
            <h4>Boundary interactions</h4>
          </div>
          <span>{edges.length}</span>
        </header>
        {edges.length ? (
          <div className="guided-actual-output__table-wrap">
            <table>
              <thead>
                <tr>
                  <th>From</th>
                  <th>Interaction</th>
                  <th>To</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {edges.map((edge) => (
                  <tr key={edge.id}>
                    <td>{byId.get(edge.sourceId) ?? edge.sourceId}</td>
                    <td>{edge.label ?? edge.kind}</td>
                    <td>{byId.get(edge.targetId) ?? edge.targetId}</td>
                    <td>
                      {Array.isArray(edge.properties.requirementRefs)
                        ? `${(edge.properties.requirementRefs as string[]).length} requirement(s)`
                        : "Not linked"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="guided-actual-output__empty">
            No context interactions yet.
          </p>
        )}
      </section>
      {journeys[0] ? (
        <JourneySequenceDiagram journey={journeys[0]} compact />
      ) : null}
    </div>
  );
}

function QualityOutput({ project }: { project: ArchitectureProject }) {
  const priorities = [...project.qualityPriorities]
    .filter((item) => item.weight > 0)
    .sort((a, b) => b.weight - a.weight);
  return (
    <div className="guided-actual-output__quality">
      <section className="guided-actual-output__priority-list">
        <h4>Prioritised quality drivers</h4>
        {priorities.length ? (
          priorities.map((item) => (
            <article key={item.attributeId}>
              <div>
                <strong>{item.attributeId}</strong>
                <span>{item.weight}/5</span>
              </div>
              <p>{item.rationale || "Rationale not yet recorded."}</p>
            </article>
          ))
        ) : (
          <p className="guided-actual-output__empty">
            No quality priorities have been calibrated.
          </p>
        )}
      </section>
      <section className="guided-actual-output__scenario-list">
        <h4>Measurable quality scenarios</h4>
        {project.qualityScenarios.length ? (
          project.qualityScenarios.map((item) => (
            <article key={item.id}>
              <header>
                <strong>{item.attributeId}</strong>
                <span>Weight {item.weight}/5</span>
              </header>
              <dl>
                <div>
                  <dt>Source</dt>
                  <dd>{text(item.source)}</dd>
                </div>
                <div>
                  <dt>Stimulus</dt>
                  <dd>{text(item.stimulus)}</dd>
                </div>
                <div>
                  <dt>Environment</dt>
                  <dd>{text(item.environment)}</dd>
                </div>
                <div>
                  <dt>Artifact</dt>
                  <dd>{text(item.artifact)}</dd>
                </div>
                <div>
                  <dt>Response</dt>
                  <dd>{text(item.response)}</dd>
                </div>
                <div>
                  <dt>Measure</dt>
                  <dd>
                    {text(item.responseMeasure, "Clarification required")}
                  </dd>
                </div>
              </dl>
            </article>
          ))
        ) : (
          <p className="guided-actual-output__empty">
            No measurable quality scenarios have been recorded.
          </p>
        )}
      </section>
    </div>
  );
}

function ModelOutput({
  stageId,
  project,
}: {
  stageId: DeliveryStageId;
  project: ArchitectureProject;
}) {
  const stage = modelStageMap[stageId];
  if (!stage) return null;
  const nodes = project.nodes.filter(
    (node) => node.stage === stage && node.status !== "deprecated",
  );
  const edges = project.edges.filter((edge) => edge.stage === stage);
  const interfaces = (project.interfaces ?? []).filter(
    (item) => item.stage === stage,
  );
  const byId = new Map(project.nodes.map((node) => [node.id, node.label]));
  return (
    <div className="guided-actual-output__model">
      <section className="guided-actual-output__catalog">
        <header>
          <div>
            <Network size={15} />
            <h4>Architecture objects</h4>
          </div>
          <span>{nodes.length}</span>
        </header>
        {nodes.length ? (
          <div className="guided-actual-output__table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Object</th>
                  <th>Type</th>
                  <th>Responsibility / description</th>
                  <th>Owner</th>
                  <th>Lineage</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node) => (
                  <tr key={node.id}>
                    <td>
                      <strong>{node.label}</strong>
                      <small>{node.id}</small>
                    </td>
                    <td>{node.kind}</td>
                    <td>
                      {text(
                        node.description ?? node.properties.responsibility,
                        "Not described",
                      )}
                    </td>
                    <td>
                      {text(
                        node.properties.owner ?? node.properties.team,
                        "Unassigned",
                      )}
                    </td>
                    <td>
                      {node.lineageFrom.length
                        ? node.lineageFrom
                            .map((id) => byId.get(id) ?? id)
                            .join(", ")
                        : "Not linked"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="guided-actual-output__empty">
            No architecture objects exist for this stage.
          </p>
        )}
      </section>
      <section className="guided-actual-output__catalog">
        <header>
          <div>
            <GitBranch size={15} />
            <h4>Relationships and interfaces</h4>
          </div>
          <span>{edges.length + interfaces.length}</span>
        </header>
        {edges.length || interfaces.length ? (
          <div className="guided-actual-output__table-wrap">
            <table>
              <thead>
                <tr>
                  <th>From / provider</th>
                  <th>Interaction</th>
                  <th>To / consumers</th>
                  <th>Contract detail</th>
                </tr>
              </thead>
              <tbody>
                {edges.map((edge) => (
                  <tr key={edge.id}>
                    <td>{byId.get(edge.sourceId) ?? edge.sourceId}</td>
                    <td>{edge.label || edge.kind}</td>
                    <td>{byId.get(edge.targetId) ?? edge.targetId}</td>
                    <td>{edge.kind}</td>
                  </tr>
                ))}
                {interfaces.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {byId.get(item.providerNodeId) ?? item.providerNodeId}
                    </td>
                    <td>{item.name}</td>
                    <td>
                      {item.consumerNodeIds
                        .map((id) => byId.get(id) ?? id)
                        .join(", ") || "No consumer"}
                    </td>
                    <td>
                      {item.protocol} · {item.operationOrEvent} ·{" "}
                      {item.lifecycleStatus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="guided-actual-output__empty">
            No relationships or interface contracts exist for this stage.
          </p>
        )}
      </section>
      <div className="guided-actual-output__columns guided-actual-output__columns--compact">
        <ListBlock
          title="Accepted architecture styles"
          items={project.styleDecisions
            .filter((item) => item.status === "accepted")
            .map((item) => `${item.styleId}: ${item.rationale}`)}
        />
        <ListBlock
          title="Accepted patterns"
          items={project.patternSelections
            .filter((item) => item.status === "accepted")
            .map((item) => `${item.patternId}: ${item.rationale}`)}
        />
        <ListBlock
          title="Architecture decisions"
          items={project.decisions.map(
            (item) => `${item.title} — ${item.status}`,
          )}
        />
      </div>
    </div>
  );
}

function ReviewOutput({ project }: { project: ArchitectureProject }) {
  return (
    <div className="guided-actual-output__review">
      <section className="guided-actual-output__catalog">
        <header>
          <div>
            <CircleAlert size={15} />
            <h4>Findings</h4>
          </div>
          <span>{project.findings.length}</span>
        </header>
        {project.findings.length ? (
          <div className="guided-actual-output__review-grid">
            {project.findings.map((item) => (
              <article
                key={item.id}
                className={`severity-${item.severity.toLowerCase()}`}
              >
                <header>
                  <strong>{item.title}</strong>
                  <span>{item.severity}</span>
                </header>
                <p>{item.message}</p>
                <small>{item.rationale}</small>
              </article>
            ))}
          </div>
        ) : (
          <p className="guided-actual-output__empty">
            No persisted findings exist.
          </p>
        )}
      </section>
      <section className="guided-actual-output__catalog">
        <header>
          <div>
            <Target size={15} />
            <h4>Decisions and disposition</h4>
          </div>
          <span>{project.decisions.length}</span>
        </header>
        <div className="guided-actual-output__columns guided-actual-output__columns--compact">
          <ListBlock
            title="Architecture decisions"
            items={project.decisions.map(
              (item) => `${item.title} — ${item.status}: ${item.decision}`,
            )}
          />
          <ListBlock
            title="Stage approvals"
            items={project.stageApprovals.map(
              (item) =>
                `${item.stage}: ${item.status}${item.reviewer ? ` by ${item.reviewer}` : ""}`,
            )}
          />
        </div>
      </section>
    </div>
  );
}

function SddOutput({
  project,
  artifacts,
}: {
  project: ArchitectureProject;
  artifacts: string[];
}) {
  const approved = project.stageApprovals.some(
    (item) =>
      item.stage === "validationRealization" && item.status === "approved",
  );
  return (
    <div className="guided-actual-output__sdd">
      <section
        className={`guided-actual-output__baseline ${approved ? "is-approved" : "is-blocked"}`}
      >
        <span>
          {approved ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}
        </span>
        <div>
          <strong>
            {approved
              ? "Approved architecture baseline available"
              : "Approved baseline is still required"}
          </strong>
          <p>
            {approved
              ? "The delivery pack can be generated from the immutable reviewed model."
              : "SDD generation must not present an unapproved model as an approval-ready design."}
          </p>
        </div>
      </section>
      <div className="guided-actual-output__columns">
        <ListBlock
          title="Available document content"
          items={[
            `${project.nodes.length} architecture objects`,
            `${project.edges.length} relationships`,
            `${project.interfaces?.length ?? 0} interface contracts`,
            `${project.decisions.length} architecture decisions`,
            `${project.findings.length} review findings`,
            `${project.deploymentProfiles.length} deployment profiles`,
          ]}
        />
        <ListBlock title="Expected delivery artifacts" items={artifacts} />
      </div>
    </div>
  );
}

function ActualOutput({
  stageId,
  project,
  artifacts,
}: {
  stageId: DeliveryStageId;
  project: ArchitectureProject;
  artifacts: string[];
}) {
  if (stageId === "requirements")
    return <RequirementsOutput project={project} />;
  if (stageId === "quality") return <QualityOutput project={project} />;
  if (stageId === "context") return <ContextOutput project={project} />;
  if (modelStageMap[stageId])
    return <ModelOutput stageId={stageId} project={project} />;
  if (stageId === "review") return <ReviewOutput project={project} />;
  return <SddOutput project={project} artifacts={artifacts} />;
}

export function StageOutputEvidence({
  stageId,
  assessment,
  onFixCheck,
}: {
  stageId: DeliveryStageId;
  assessment: DeliveryStageAssessment;
  onFixCheck: (checkId: string) => void;
}) {
  const project = useWorkspaceStore((state) => state.project);
  const cards = outputEvidence(stageId, project);
  const snapshot = buildStageEvidenceSnapshot(stageId, assessment, project);
  const stageName = `${deliverySlug(project.name)}-${deliverySlug(assessment.definition.shortTitle)}-evidence.json`;

  return (
    <section className="guided-output-view">
      <div className="guided-task-plan__intro guided-output-heading">
        <div>
          <span className="guided-kicker">
            <Layers3 size={14} /> Actual stage output
          </span>
          <h2>Review the model and evidence this stage has produced</h2>
          <p>
            This is a projection of the canonical project state—not a list of
            expected artifacts or a page-visit metric.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            downloadDeliveryFile(
              stageName,
              JSON.stringify(snapshot, null, 2),
              "application/json",
            )
          }
        >
          <Download size={15} /> Export actual output
        </button>
      </div>

      <div
        className="guided-output-grid guided-output-grid--summary"
        aria-label="Stage output summary"
      >
        {cards.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>

      <section
        className="guided-actual-output"
        data-testid={`actual-stage-output-${stageId}`}
      >
        <header className="guided-actual-output__heading">
          <div>
            <span className="guided-kicker">
              <FileText size={14} /> Canonical content
            </span>
            <h3>{assessment.definition.shortTitle} output</h3>
          </div>
          <span>Project revision {project.revision}</span>
        </header>
        <ActualOutput
          stageId={stageId}
          project={project}
          artifacts={assessment.definition.outputs}
        />
      </section>

      <section
        className="guided-design-rationale"
        aria-label="Design rationale and consequences"
      >
        <div className="guided-design-rationale__intro">
          <span className="guided-kicker">
            <Target size={14} /> Design rationale
          </span>
          <h3>Why this design makes sense</h3>
          <p>{rationaleCopy[stageId]}</p>
        </div>
        <div className="guided-design-rationale__evidence">
          {designRationaleEvidence(stageId, project).map((item) => (
            <article key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.evidence}</p>
              <small>{item.consequence}</small>
            </article>
          ))}
        </div>
        <p className="guided-design-rationale__sol-note">
          Use <strong>Sol · Ask</strong> from the stage header to challenge this
          rationale, compare alternatives or inspect its evidence receipt.
        </p>
      </section>

      <div className="guided-evidence-matrix">
        <div className="guided-evidence-matrix__heading">
          <div>
            <span className="guided-kicker">
              <FileJson size={14} /> Task-to-evidence matrix
            </span>
            <h3>What each task produced and what remains</h3>
          </div>
          <span>
            {assessment.requiredPassed}/{assessment.requiredTotal} required
            checks
          </span>
        </div>
        <div className="guided-evidence-matrix__rows">
          {assessment.definition.tasks.map((task, index) => {
            const checks = task.checkIds
              .map((id) => assessment.checks.find((check) => check.id === id))
              .filter((check): check is NonNullable<typeof check> =>
                Boolean(check),
              );
            const done =
              checks.length > 0 && checks.every((check) => check.done);
            return (
              <article
                key={task.id}
                className={done ? "is-complete" : "is-open"}
              >
                <span className="guided-evidence-matrix__number">
                  {done ? <CheckCircle2 size={17} /> : index + 1}
                </span>
                <div className="guided-evidence-matrix__task">
                  <strong>{task.title}</strong>
                  <p>{task.success}</p>
                </div>
                <div className="guided-evidence-matrix__checks">
                  {checks.map((check) => (
                    <button
                      type="button"
                      key={check.id}
                      className={
                        check.done
                          ? "is-done"
                          : check.required
                            ? "is-required"
                            : "is-recommended"
                      }
                      onClick={() => !check.done && onFixCheck(check.id)}
                    >
                      {check.done ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        <CircleAlert size={13} />
                      )}
                      <span>
                        <b>{check.label}</b>
                        <small>{check.evidence ?? check.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="guided-artifact-list">
        <strong>Expected handoff artifacts</strong>
        {assessment.definition.outputs.map((item) => (
          <span key={item}>
            <FileText size={14} /> {item}
          </span>
        ))}
      </div>
    </section>
  );
}
