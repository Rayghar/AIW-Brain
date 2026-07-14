import { createContext, useContext, type ReactNode } from "react";
import type { DeliveryStageId } from "./guidedDelivery";

export interface GuidedDeliveryTaskContextValue {
  stageId: DeliveryStageId;
  taskId: string | null;
}

const GuidedDeliveryTaskContext = createContext<GuidedDeliveryTaskContextValue | null>(null);

export function GuidedDeliveryTaskProvider({ value, children }: { value: GuidedDeliveryTaskContextValue; children: ReactNode }) {
  return <GuidedDeliveryTaskContext.Provider value={value}>{children}</GuidedDeliveryTaskContext.Provider>;
}

export function useGuidedDeliveryTask() {
  return useContext(GuidedDeliveryTaskContext);
}
