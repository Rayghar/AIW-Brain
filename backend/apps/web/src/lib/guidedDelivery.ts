import type { ArchitectureStage } from "@aiw/domain";
import { deliveryStages } from "./guidedDeliveryStages";
import type { DeliveryStageId } from "./guidedDeliveryTypes";

export * from "./guidedDeliveryTypes";
export * from "./guidedDeliveryStages";
export * from "./guidedDeliveryAssessment";

export function currentDeliveryStageId(workspaceMode: string, activeStage: ArchitectureStage, activeLifecycleStep?: string): DeliveryStageId {
  if (activeLifecycleStep === "sdd") return "sdd";
  if (workspaceMode === "quality") return "quality";
  if (activeStage === "designIntent") return "requirements";
  if (activeStage === "logicalApplication") return "logical";
  if (activeStage === "applicationRealization") return "realization";
  if (activeStage === "logicalTechnology") return "logicalTechnology";
  if (activeStage === "physicalTechnology") return "physicalTechnology";
  return "review";
}

export function nextDeliveryStageId(stageId: DeliveryStageId): DeliveryStageId | null {
  const index = deliveryStages.findIndex((item) => item.id === stageId);
  return deliveryStages[index + 1]?.id ?? null;
}

export function previousDeliveryStageId(stageId: DeliveryStageId): DeliveryStageId | null {
  const index = deliveryStages.findIndex((item) => item.id === stageId);
  return deliveryStages[index - 1]?.id ?? null;
}
