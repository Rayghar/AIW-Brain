import { describe, expect, it } from 'vitest';
import { sampleProject, type ArchitectureProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

const headers = {
  'x-aiw-tenant-id': 'tenant-reference',
  'x-aiw-user-id': 'user-owner',
};

describe('rc.10.72.3 Sol intelligence calibration', () => {
  it('returns an inspectable quality, context, reasoning and lineage receipt without mutating the project', async () => {
    const repository = new InMemoryProjectRepository();
    const app = await buildApp({ repository, logger: false });
    try {
      const before = (await repository.getProject('tenant-reference', sampleProject.id, sampleProject.branch.id)) as ArchitectureProject;
      const response = await app.inject({
        method: 'POST',
        url: '/api/co-architect/ask',
        headers,
        payload: {
          projectId: before.id,
          branchId: before.branch.id,
          expectedRevision: before.revision,
          lifecycleStage: 'quality',
          scopeLabel: 'Quality scenarios and response measures',
          intelligenceMode: 'deterministic',
          question: 'Which quality scenario has the weakest measurable response and what should be clarified?',
        },
      });
      expect(response.statusCode).toBe(200);
      const answer = response.json();
      expect(answer.contextSummary.lifecycleStage).toBe('quality');
      expect(answer.contextReceipt.lifecycleStage).toBe('quality');
      expect(answer.reasoningReceipt.deterministic).toContain('exact-lifecycle-stage');
      expect(answer.qualityReceipt.evaluatorVersion).toContain('10.72.3');
      expect(answer.qualityReceipt.gates).toHaveLength(8);
      expect(answer.qualityReceipt.stageAligned).toBe(true);
      expect(answer.brainReceipt.quality.score).toBe(answer.qualityReceipt.score);
      expect(answer.brainReceipt.context.lifecycleStage).toBe('quality');
      expect(answer.brainReceipt.llm.requested).toBe(false);
      expect(answer.brainReceipt.governance.directModelMutationAllowed).toBe(false);
      const after = (await repository.getProject('tenant-reference', before.id, before.branch.id)) as ArchitectureProject;
      expect(after.revision).toBe(before.revision);
      expect(after.nodes).toHaveLength(before.nodes.length);
    } finally {
      await app.close();
    }
  });

  it('runs the nine-stage deterministic versus governed-LLM calibration without claiming external expert acceptance', async () => {
    const repository = new InMemoryProjectRepository();
    const app = await buildApp({ repository, logger: false });
    try {
      const project = (await repository.getProject('tenant-reference', sampleProject.id, sampleProject.branch.id)) as ArchitectureProject;
      const scenarios = await app.inject({ method: 'GET', url: '/api/architecture-brain/sol-calibration/scenarios', headers });
      expect(scenarios.statusCode).toBe(200);
      expect(scenarios.json().scenarios).toHaveLength(9);

      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/branches/${project.branch.id}/sol-calibration`,
        headers,
        payload: { expectedRevision: project.revision },
      });
      expect(response.statusCode).toBe(200);
      const report = response.json();
      expect(report.releaseId).toBe('AIW-0.10.0-rc.10.73.1');
      expect(report.stages).toHaveLength(9);
      expect(report.stages.every((stage: any) => stage.variants.length === 2)).toBe(true);
      expect(report.stages.map((stage: any) => stage.scenario.lifecycleStage)).toEqual([
        'requirements','quality','context','logical','realization','logicalTechnology','physicalTechnology','review','sdd',
      ]);
      expect(report.summary.scenarioCount).toBe(9);
      expect(report.summary.stageAlignmentRate).toBe(100);
      const deterministicByStage = Object.fromEntries(
        report.stages.map((stage: any) => [
          stage.scenario.lifecycleStage,
          stage.variants.find((variant: any) => variant.mode === 'deterministic'),
        ]),
      );
      expect(deterministicByStage.requirements.recommendation).toMatch(/stakeholder|acceptance criterion/i);
      expect(deterministicByStage.requirements.citedRecordIds).toContain('legacy-objective-3');
      expect(deterministicByStage.quality.recommendation).toMatch(/response measure|verification source|test owner/i);
      expect(deterministicByStage.context.recommendation).toMatch(/system context|system boundary|external systems/i);
      expect(deterministicByStage.logical.recommendation).toMatch(/order service|payment service|ownership/i);
      expect(deterministicByStage.realization.recommendation).toMatch(/reconciliation|compensation|uncertain outcomes/i);
      expect(deterministicByStage.logicalTechnology.recommendation).toMatch(/provider-neutral resilience|recovery capability/i);
      expect(deterministicByStage.physicalTechnology.recommendation).toMatch(/single-zone|failure-domain/i);
      expect(deterministicByStage.review.recommendation).toMatch(/development authentication|approval should remain blocked/i);
      expect(deterministicByStage.sdd.recommendation).toMatch(/not implementation-ready|changes-requested/i);
      expect(report.expertReviewPack.blindedVariants).toHaveLength(18);
      expect(report.governance.humanExpertValidationCompleted).toBe(false);
      expect(report.governance.productionAcceptanceClaimed).toBe(false);
      expect(report.governance.directModelMutationAllowed).toBe(false);
      if (!report.liveProviderUsed) {
        expect(report.summary.governedLlmAverage).toBeNull();
        expect(report.governance.liveProviderAcceptanceCompleted).toBe(false);
      }
    } finally {
      await app.close();
    }
  }, 120_000);
});
