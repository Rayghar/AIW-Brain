import { describe, expect, it } from 'vitest';
import { sampleProject, type ConformanceEvidenceEnvelope } from '@aiw/domain';
import {
  assessContinuousConformance,
  buildArchitectureConformancePlan,
  buildConformanceRemediationChangeSet,
  buildConformanceVisualModel,
} from '../src/index.js';

function evidence(sourceType: ConformanceEvidenceEnvelope['sourceType'], payload: unknown): ConformanceEvidenceEnvelope {
  return { id: `CEV-${sourceType}`, projectId: sampleProject.id, branchId: sampleProject.branch.id, sourceType, collectedAt: '2026-07-03T18:00:00.000Z', payload };
}

describe('Sprint 8.7.3 continuous architecture conformance', () => {
  it('builds project-scoped controls and reviewable fitness artifacts', () => {
    const project = structuredClone(sampleProject);
    project.patternSelections.push({ id: 'sel-outbox', patternId: 'PAT-TRANSACTIONAL-OUTBOX', stage: 'applicationRealization', rationale: 'test', status: 'accepted', obligationsAcknowledged: [] });
    const plan = buildArchitectureConformancePlan(project);
    expect(plan.patternIds).toContain('PAT-TRANSACTIONAL-OUTBOX');
    expect(plan.controls.some((control) => control.source === 'traceability')).toBe(true);
    expect(plan.controls.some((control) => control.source === 'topology')).toBe(true);
    expect(plan.artifacts.every((artifact) => artifact.reviewRequired)).toBe(true);
    expect(plan.reviewRequired).toBe(true);
  });

  it('assesses evidence without treating missing execution as a pass', () => {
    const plan = buildArchitectureConformancePlan(sampleProject, ['PAT-BOUNDED-CONTEXT']);
    const assessment = assessContinuousConformance({ project: sampleProject, plan, evidence: [] });
    expect(assessment.summary.unverified).toBeGreaterThan(0);
    expect(assessment.gate.passed).toBe(false);
  });

  it('maps test failures and drift into explainable findings', () => {
    const plan = buildArchitectureConformancePlan(sampleProject, ['PAT-BOUNDED-CONTEXT']);
    const assessment = assessContinuousConformance({
      project: sampleProject,
      plan,
      evidence: [evidence('archunit', { violations: [{ ruleId: plan.controls.find((control) => control.target === 'archunit')?.ruleId ?? 'layering', status: 'failed', severity: 'error', message: 'Layer boundary breached.' }] })],
    });
    expect(assessment.summary.critical).toBeGreaterThan(0);
    expect(assessment.controls.some((control) => control.status === 'failed')).toBe(true);
    expect(assessment.gate.reasons.length).toBeGreaterThan(0);
  });

  it('creates human-approved remediation and a visual intended-versus-actual model', () => {
    const project = structuredClone(sampleProject);
    const plan = buildArchitectureConformancePlan(project, ['PAT-BOUNDED-CONTEXT']);
    const assessment = assessContinuousConformance({ project, plan });
    const remediation = buildConformanceRemediationChangeSet(assessment);
    const visual = buildConformanceVisualModel(project, assessment);
    expect(remediation.humanApprovalRequired).toBe(true);
    expect(remediation.actions.every((action) => action.automaticMutationAllowed === false)).toBe(true);
    expect(visual.nodes.some((node) => node.kind === 'intended')).toBe(true);
    expect(visual.nodes.some((node) => node.kind === 'control')).toBe(true);
  });
});
