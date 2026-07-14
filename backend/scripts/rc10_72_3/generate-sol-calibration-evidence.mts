import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { sampleProject, type ArchitectureProject } from '@aiw/domain';
import { buildApp } from '../../apps/api/src/app.js';
import { InMemoryProjectRepository } from '../../apps/api/src/repository.js';


async function main() {
  const outputPath = resolve(process.argv[2] ?? '../release-evidence/rc10.72.3/SOL_INTELLIGENCE_CALIBRATION_REPORT.json');
  const repository = new InMemoryProjectRepository();
  const app = await buildApp({ repository, logger: false });
  try {
    const project = (await repository.getProject('tenant-reference', sampleProject.id, sampleProject.branch.id)) as ArchitectureProject;
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/branches/${project.branch.id}/sol-calibration`,
      headers: { 'x-aiw-tenant-id': 'tenant-reference', 'x-aiw-user-id': 'user-owner' },
      payload: { expectedRevision: project.revision },
    });
    if (response.statusCode !== 200) throw new Error(`CALIBRATION_HTTP_${response.statusCode}:${response.body}`);
    const report = response.json();
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    const expertPath = resolve(dirname(outputPath), 'SOL_BLINDED_EXPERT_REVIEW_PACK.json');
    await writeFile(expertPath, `${JSON.stringify(report.expertReviewPack, null, 2)}\n`, 'utf8');
    const summary = {
      releaseId: report.releaseId,
      projectId: report.projectId,
      projectRevision: report.projectRevision,
      providerConfigured: report.providerConfigured,
      liveProviderUsed: report.liveProviderUsed,
      summary: report.summary,
      governance: report.governance,
      scenarioStatus: report.stages.map((stage: any) => ({
        scenarioId: stage.scenario.id,
        lifecycleStage: stage.scenario.lifecycleStage,
        passed: stage.passed,
        failures: stage.failures,
        deterministicScore: stage.variants.find((item: any) => item.mode === 'deterministic')?.score,
        governedLlmScore: stage.variants.find((item: any) => item.mode === 'governed-llm' && item.effectiveMode === 'llm-assisted')?.score ?? null,
        hybridEffectiveMode: stage.variants.find((item: any) => item.mode === 'governed-llm')?.effectiveMode,
      })),
    };
    await writeFile(resolve(dirname(outputPath), 'SOL_INTELLIGENCE_CALIBRATION_SUMMARY.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
