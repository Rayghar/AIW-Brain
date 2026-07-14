// Canonical intelligence kernel facade.
//
// The deterministic embedded kernel still executes in @aiw/engine, but the
// product-facing ownership boundary is @aiw/intelligence. This facade prevents
// a second side-by-side kernel while giving API/UI packages a stable import path
// for architecture-event evaluation, visual intelligence and approval-gated
// change sets.

export type {
  ArchitectureEvent,
  ArchitectureEventKind,
  IntelligenceWorkspace,
  IntelligenceContext,
  RankedAction,
  IntelligenceOrigin,
  KernelFinding,
  IntelligenceExplanation,
  IntelligenceTrace,
  IntelligenceChangeOperation,
  IntelligenceChangeSet,
  IntelligenceVisualModel,
  IntelligenceVisualNode,
  IntelligenceVisualEdge,
  IntelligenceResponse,
  KernelPreferences,
} from '@aiw/engine';

export {
  applyOutcomeToPreferences,
  assembleIntelligenceContext,
  buildVisualIntelligenceModel,
  assessArchitectureHealth,
  evaluateArchitectureEvent,
  buildWorkspaceIntelligence,
} from '@aiw/engine';
