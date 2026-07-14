import type { ArchitectureProject } from '@aiw/domain';

// Golden path (B3): the guided first journey, evaluated live from the model.
export interface GoldenPathStep { id: string; label: string; done: boolean; hint: string; }

export function evaluateGoldenPath(project: ArchitectureProject): { steps: GoldenPathStep[]; completed: number } {
  const scenarios = ((project as { qualityScenarios?: unknown[] }).qualityScenarios ?? []);
  const steps: GoldenPathStep[] = [
    { id: 'brief', label: 'Describe the system', done: Boolean(project.description?.trim() && project.qualityPriorities.length > 0) || project.objectives.length > 0, hint: 'Write the brief or paste it and use Analyze with AI.' },
    { id: 'drivers', label: 'Rank quality drivers', done: project.qualityPriorities.some((p) => p.weight >= 4), hint: 'Mark at least one driver Important (4) or Critical (5).' },
    { id: 'scenario', label: 'Make one driver measurable', done: scenarios.length > 0, hint: 'Add a quality scenario with a numeric response measure.' },
    { id: 'style', label: 'Accept an architecture style', done: project.styleDecisions.some((d) => d.status === 'accepted'), hint: 'Review the Decision Radar and accept the leading style for a scope.' },
    { id: 'model', label: 'Model the logical view', done: project.nodes.filter((n) => n.stage === 'logicalApplication').length >= 2, hint: 'Place at least two logical elements from the palette.' },
    { id: 'connect', label: 'Create a reviewed connection', done: project.edges.length >= 1, hint: 'Connect two elements — the review captures the semantics before it commits.' },
    { id: 'patterns', label: 'Accept a supporting pattern', done: (project.patternSelections ?? []).some((p) => p.status === 'accepted'), hint: 'Review pattern recommendations and accept one that serves your drivers.' },
    { id: 'decide', label: 'Record the decision', done: project.decisions.length > 0, hint: 'Generate the ADR from Review & Realize while the rationale is fresh.' },
  ];
  return { steps, completed: steps.filter((s) => s.done).length };
}
