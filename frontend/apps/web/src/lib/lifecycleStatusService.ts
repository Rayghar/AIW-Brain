import type { ArchitectureProject, ArchitectureStage } from "@aiw/domain";
import { assessDeliveryStage } from "./guidedDeliveryAssessment";
import { deliveryStages } from "./guidedDeliveryStages";
import { currentDeliveryStageId } from "./guidedDelivery";
import type {
  DeliveryLifecycleState,
  DeliveryStageAssessment,
  DeliveryStageId,
  DeliveryStageStatus,
} from "./guidedDeliveryTypes";

export type LifecycleStageTone = "muted" | "warn" | "good" | "blocked";

export interface AuthoritativeLifecycleStage {
  id: DeliveryStageId;
  index: number;
  label: string;
  caption: string;
  architectureStage?: ArchitectureStage;
  workspace: "design" | "quality";
  status: DeliveryStageStatus;
  progress: number;
  ready: boolean;
  complete: boolean;
  blocked: boolean;
  tone: LifecycleStageTone;
  nextAction: string;
  blockerCount: number;
  warningCount: number;
  assessment: DeliveryStageAssessment;
}

export interface AuthoritativeLifecycleStatus {
  stages: AuthoritativeLifecycleStage[];
  overallProgress: number;
  readyCount: number;
  completedCount: number;
  blockedCount: number;
  current: AuthoritativeLifecycleStage;
  next: AuthoritativeLifecycleStage;
  active: AuthoritativeLifecycleStage;
  modelCoverage: {
    logicalApplication: number;
    applicationRealization: number;
    logicalTechnology: number;
    physicalTechnology: number;
  };
}

const COMPLETE_STATUSES = new Set<DeliveryStageStatus>([
  "validated",
  "submitted",
  "approved",
  "delivered",
]);

const READY_STATUSES = new Set<DeliveryStageStatus>([
  "inputs-complete",
  "validated",
  "submitted",
  "approved",
  "delivered",
]);

function toneFor(status: DeliveryStageStatus): LifecycleStageTone {
  if (status === "blocked") return "blocked";
  if (READY_STATUSES.has(status)) return "good";
  if (status === "in-progress") return "warn";
  return "muted";
}

function activeDeliveryStage(
  project: ArchitectureProject,
  activeLifecycleStep?: DeliveryStageId | "overview",
): DeliveryStageId {
  return currentDeliveryStageId(
    activeLifecycleStep === "quality" ? "quality" : "design",
    project.activeStage,
    activeLifecycleStep === "overview" ? undefined : activeLifecycleStep,
  );
}

export function buildLifecycleState(
  project: ArchitectureProject,
  completions: Record<string, { status?: string; blockerCount?: number }> = {},
  artifacts: Array<{ projectId?: string; branchId?: string; stepId: string; status: string; name: string }> = [],
): DeliveryLifecycleState {
  return {
    projectId: project.id,
    branchId: project.branch.id,
    completions,
    artifacts: artifacts
      .filter((item) => (!item.projectId || item.projectId === project.id) && (!item.branchId || item.branchId === project.branch.id))
      .map(({ stepId, status, name }) => ({ stepId, status, name })),
  };
}

export function resolveLifecycleStatus(
  project: ArchitectureProject,
  lifecycle?: DeliveryLifecycleState,
  activeLifecycleStep?: DeliveryStageId | "overview",
): AuthoritativeLifecycleStatus {
  const stages = deliveryStages.map((definition): AuthoritativeLifecycleStage => {
    const assessment = assessDeliveryStage(project, definition.id, lifecycle);
    const ready = READY_STATUSES.has(assessment.status);
    const complete = COMPLETE_STATUSES.has(assessment.status);
    return {
      id: definition.id,
      index: definition.index,
      label: definition.title,
      caption: definition.purpose,
      ...(definition.architectureStage ? { architectureStage: definition.architectureStage } : {}),
      workspace: definition.workspace,
      status: assessment.status,
      progress: assessment.progress,
      ready,
      complete,
      blocked: assessment.status === "blocked",
      tone: toneFor(assessment.status),
      nextAction: assessment.nextAction,
      blockerCount: assessment.blockers.length,
      warningCount: assessment.warnings.length,
      assessment,
    };
  });

  const activeId = activeDeliveryStage(project, activeLifecycleStep);
  const active = stages.find((stage) => stage.id === activeId) ?? stages[0]!;

  // Do not send an architect backwards merely because an upstream stage still
  // contains a warning. The active lifecycle step and the furthest stage with
  // real evidence establish the working frontier. Earlier gaps remain visible
  // as blockers, but the recommended move stays coherent with the actual work.
  const furthestTouchedIndex = stages.reduce((furthest, stage, index) => {
    const touched = stage.progress > 0 || stage.status !== "not-started" || stage.id === active.id;
    return touched ? Math.max(furthest, index) : furthest;
  }, 0);
  const activeIndex = Math.max(0, stages.findIndex((stage) => stage.id === active.id));
  const frontierIndex = Math.max(activeIndex, furthestTouchedIndex);
  const forwardCandidates = stages.slice(frontierIndex);
  const next = forwardCandidates.find((stage) => !stage.ready && !stage.complete)
    ?? stages.slice(frontierIndex + 1).find((stage) => !stage.complete)
    ?? active;
  const current = active;
  const overallProgress = Math.round(stages.reduce((total, stage) => total + stage.progress, 0) / stages.length);

  return {
    stages,
    overallProgress,
    readyCount: stages.filter((stage) => stage.ready).length,
    completedCount: stages.filter((stage) => stage.complete).length,
    blockedCount: stages.filter((stage) => stage.blocked).length,
    current,
    next,
    active,
    modelCoverage: {
      logicalApplication: project.nodes.filter((node) => node.stage === "logicalApplication").length,
      applicationRealization: project.nodes.filter((node) => node.stage === "applicationRealization").length,
      logicalTechnology: project.nodes.filter((node) => node.stage === "logicalTechnology").length,
      physicalTechnology: project.nodes.filter((node) => node.stage === "physicalTechnology").length,
    },
  };
}

export function lifecycleStatusLabel(status: DeliveryStageStatus): string {
  const labels: Record<DeliveryStageStatus, string> = {
    "not-started": "Not started",
    "in-progress": "In progress",
    "inputs-complete": "Inputs complete",
    validated: "Validated",
    submitted: "Submitted",
    approved: "Approved",
    delivered: "Delivered",
    blocked: "Blocked",
  };
  return labels[status];
}
