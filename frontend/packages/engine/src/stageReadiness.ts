import type { ArchitectureProject, ArchitectureStage } from '@aiw/domain';

export type StageStatus = 'not-started' | 'in-progress' | 'evidence-missing' | 'review-required' | 'ready';
export interface StageReadiness {
  stage: ArchitectureStage;
  status: StageStatus;
  percent: number;
  reason: string;
  checks: Array<{ label: string; done: boolean }>;
}

type FindingLike = { severity?: string; affectedNodeIds?: string[] };
type ProjectLike = ArchitectureProject;

const CHECKS: Partial<Record<ArchitectureStage, (project: ProjectLike) => Array<{ label: string; done: boolean }>>> = {
  designIntent: (project) => [
    { label: 'Objectives or description stated', done: (project.objectives?.length ?? 0) > 0 || Boolean(project.description?.trim()) },
    { label: 'A quality driver ranked Important or Critical', done: (project.qualityPriorities ?? []).some((quality) => quality.weight >= 4) },
    { label: 'A measurable quality scenario recorded', done: (project.qualityScenarios?.length ?? 0) > 0 },
  ],
  logicalApplication: (project) => [
    { label: 'Logical elements modeled', done: project.nodes.some((node) => node.stage === 'logicalApplication') },
    { label: 'An architecture style accepted', done: (project.styleDecisions ?? []).some((decision) => decision.status === 'accepted') },
    { label: 'Relationships drawn between elements', done: (project.edges?.length ?? 0) > 0 },
  ],
  applicationRealization: (project) => [
    { label: 'Realization elements modeled', done: project.nodes.some((node) => node.stage === 'applicationRealization') },
    { label: 'A pattern accepted with its obligations', done: (project.patternSelections ?? []).some((selection) => selection.status === 'accepted') },
  ],
  logicalTechnology: (project) => [
    { label: 'Technology capabilities chosen', done: project.nodes.some((node) => node.stage === 'logicalTechnology') },
  ],
  physicalTechnology: (project) => [
    { label: 'Deployment topology modeled', done: project.nodes.some((node) => node.stage === 'physicalTechnology') },
  ],
  validationRealization: (project) => [
    { label: 'Decisions recorded for review', done: (project.decisions?.length ?? 0) > 0 || (project.styleDecisions ?? []).some((decision) => decision.status === 'accepted') },
  ],
};

export function assessStageReadiness(project: ArchitectureProject, stageOrder: ArchitectureStage[], findings: FindingLike[] = []): StageReadiness[] {
  return stageOrder.map((stage) => {
    const checks = (CHECKS[stage] ?? (() => []))(project);
    const done = checks.filter((check) => check.done).length;
    const total = checks.length || 1;
    const percent = Math.round((done / total) * 100);
    const stageNodeIds = new Set(project.nodes.filter((node) => node.stage === stage).map((node) => node.id));
    const significantHere = findings.filter((finding) => finding.severity === 'SIGNIFICANT' && (finding.affectedNodeIds ?? []).some((id) => stageNodeIds.has(id))).length;
    let status: StageStatus;
    let reason: string;
    if (done === 0) {
      status = 'not-started';
      reason = 'Nothing recorded for this stage yet.';
    } else if (done === checks.length && significantHere > 0) {
      status = 'review-required';
      reason = `${significantHere} significant finding(s) to resolve.`;
    } else if (done === checks.length) {
      status = 'ready';
      reason = 'All completion checks satisfied.';
    } else if (!checks[0]?.done) {
      status = 'evidence-missing';
      reason = `Missing: ${checks.find((check) => !check.done)?.label ?? 'required evidence'}.`;
    } else {
      status = 'in-progress';
      reason = `${done}/${checks.length} done — next: ${checks.find((check) => !check.done)?.label ?? 'review stage evidence'}.`;
    }
    return { stage, status, percent, reason, checks };
  });
}
