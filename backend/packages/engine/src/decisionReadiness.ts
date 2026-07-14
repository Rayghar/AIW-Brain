import type { ArchitectureProject } from '@aiw/domain';

// =============================================================================
// DECISION READINESS + ITERATION PHASE (Cambridge-logic sprint).
// Grounded in the SA Playbook's decision schema (Rationale | Assumptions &
// Risks | Scaling Factors columns) and the ADD-style iteration the playbook's
// Iteration Algo embodies: choose element → establish its drivers → select
// concepts → instantiate → verify. The kernel uses PHASE to focus guidance
// and READINESS to warn when a decision is being made on missing knowledge.
// =============================================================================

export type IterationPhase = 'establish-drivers' | 'make-measurable' | 'choose-concepts' | 'instantiate' | 'verify';

export function determineIterationPhase(project: ArchitectureProject): { phase: IterationPhase; focus: string } {
  const hot = project.qualityPriorities.filter((p) => p.weight >= 4);
  const scenarios = ((project as { qualityScenarios?: Array<{ attributeId: string }> }).qualityScenarios ?? []);
  const accepted = project.styleDecisions.some((d) => d.status === 'accepted');
  const modeled = project.nodes.filter((n) => n.stage === 'logicalApplication').length >= 2 && project.edges.length >= 1;
  if (!hot.length) return { phase: 'establish-drivers', focus: 'Rank what matters: no driver is Important or Critical yet.' };
  if (!scenarios.length) return { phase: 'make-measurable', focus: 'Make the top driver testable with a quantified scenario.' };
  if (!accepted) return { phase: 'choose-concepts', focus: 'Choose the architecture style; the ranking is calibrated and waiting.' };
  if (!modeled) return { phase: 'instantiate', focus: 'Instantiate the decision: model the elements and their relationships.' };
  return { phase: 'verify', focus: 'Verify: obligations, scenario assessment, and the audit before realization.' };
}

export interface ReadinessGap { requirement: string; hint: string; }

/** Preconditions before a STYLE decision is sound (playbook decision schema). */
export function checkStyleDecisionReadiness(project: ArchitectureProject): ReadinessGap[] {
  const gaps: ReadinessGap[] = [];
  const hot = project.qualityPriorities.filter((p) => p.weight >= 4);
  const scenarios = ((project as { qualityScenarios?: Array<{ attributeId: string }> }).qualityScenarios ?? []);
  const context = project.context as Record<string, unknown>;
  if (!hot.length) gaps.push({ requirement: 'At least one driver at weight ≥ 4', hint: 'A style decision without a dominant driver is a coin flip with diagrams.' });
  if (hot.length && !scenarios.some((s) => hot.some((h) => h.attributeId === s.attributeId)))
    gaps.push({ requirement: 'A measurable scenario for a top driver', hint: 'Decisions get verified against numbers; record the number first.' });
  if (!String(context.workloadProfile ?? '').trim()) gaps.push({ requirement: 'Workload profile established', hint: 'Scale and burst shape eliminate half the candidates before scoring.' });
  if (!project.objectives.length && !project.description?.trim()) gaps.push({ requirement: 'Stated objective or description', hint: 'The rationale column of your decision record needs a sentence to point at.' });
  return gaps;
}

/** Post-decision hygiene per the playbook schema: rationale, assumptions/risks. */
export function checkDecisionRecordHygiene(project: ArchitectureProject): ReadinessGap[] {
  const gaps: ReadinessGap[] = [];
  for (const decision of project.styleDecisions.filter((d) => d.status === 'accepted')) {
    const record = decision as unknown as { rationale?: string; assumptions?: unknown[]; risks?: unknown[] };
    if (!String(record.rationale ?? '').trim()) gaps.push({ requirement: `Rationale recorded for ${decision.styleId}`, hint: 'The playbook decision schema: Decision | Rationale | Assumptions & Risks | Scaling Factors.' });
  }
  return gaps.slice(0, 2);
}
