import type { ApplicationRouteContext } from "./applicationRouteContext.js";
import { registerPlatformKnowledgeApplicationRoutes } from "./platformKnowledgeApplicationRoutes.js";
import { registerSynthesisApplicationRoutes } from "./synthesisApplicationRoutes.js";
import { registerPatternPilotApplicationRoutes } from "./patternPilotApplicationRoutes.js";
import { registerProjectIdentityApplicationRoutes } from "./projectIdentityApplicationRoutes.js";
import { registerLivingCanvasApplicationRoutes } from "./livingCanvasApplicationRoutes.js";
import { registerGovernanceCollaborationApplicationRoutes } from "./governanceCollaborationApplicationRoutes.js";
import { registerRuntimeDeliveryApplicationRoutes } from "./runtimeDeliveryApplicationRoutes.js";
import { registerRequirementsGenesisApplicationRoutes } from "./requirementsGenesisApplicationRoutes.js";
import { registerArchitectureBrainApplicationRoutes } from "./architectureBrainApplicationRoutes.js";
import { registerBrainTransactionApplicationRoutes } from "./brainTransactionApplicationRoutes.js";

export type { ApplicationRouteContext } from "./applicationRouteContext.js";

/**
 * Registers the AIW API by bounded route domain.
 *
 * rc.10.65 removes the monolithic route registry. Each module now owns a coherent
 * API capability family while the coordinator preserves deterministic registration
 * order and shared runtime dependencies.
 */
export async function registerApplicationRoutes(context: ApplicationRouteContext) {
  await registerPlatformKnowledgeApplicationRoutes(context);
  await registerSynthesisApplicationRoutes(context);
  await registerPatternPilotApplicationRoutes(context);
  await registerProjectIdentityApplicationRoutes(context);
  await registerArchitectureBrainApplicationRoutes(context);
  await registerBrainTransactionApplicationRoutes(context);
  await registerRequirementsGenesisApplicationRoutes(context);
  await registerLivingCanvasApplicationRoutes(context);
  await registerGovernanceCollaborationApplicationRoutes(context);
  await registerRuntimeDeliveryApplicationRoutes(context);
}
