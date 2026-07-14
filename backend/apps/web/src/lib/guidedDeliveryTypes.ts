import type { ArchitectureStage } from "@aiw/domain";

export type DeliveryStageId =
  | "requirements"
  | "quality"
  | "logical"
  | "realization"
  | "logicalTechnology"
  | "physicalTechnology"
  | "review"
  | "sdd";

export type DeliveryStageStatus =
  | "not-started"
  | "in-progress"
  | "inputs-complete"
  | "validated"
  | "submitted"
  | "approved"
  | "delivered"
  | "blocked";

export interface DeliveryTask {
  id: string;
  title: string;
  description: string;
  success: string;
  checkIds: string[];
}

export interface DeliveryCheck {
  id: string;
  label: string;
  description: string;
  done: boolean;
  required: boolean;
  evidence?: string;
  actionLabel?: string;
}

export interface DeliveryStageDefinition {
  id: DeliveryStageId;
  index: number;
  title: string;
  shortTitle: string;
  purpose: string;
  outcome: string;
  architectureStage?: ArchitectureStage;
  workspace: "design" | "quality";
  tasks: DeliveryTask[];
  outputs: string[];
}

export interface DeliveryStageAssessment {
  definition: DeliveryStageDefinition;
  status: DeliveryStageStatus;
  progress: number;
  requiredPassed: number;
  requiredTotal: number;
  checks: DeliveryCheck[];
  blockers: DeliveryCheck[];
  warnings: DeliveryCheck[];
  evidence: string[];
  nextAction: string;
}

export interface DeliveryLifecycleState {
  completions?: Record<string, { status?: string; blockerCount?: number }>;
  artifacts?: Array<{ stepId: string; status: string; name: string }>;
  projectId: string;
  branchId: string;
}
