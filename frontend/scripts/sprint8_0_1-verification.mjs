import { writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

execFileSync(process.execPath, ['scripts/verify-intelligence-core.mjs'], { stdio: 'inherit' });
const kb = JSON.parse(await readFile('data/knowledge-library.json','utf8'));
const report = {
  release: 'AIW-0.9.1',
  sprint: '8.0.1',
  generatedAt: new Date().toISOString(),
  calibratedQualityAttributes: kb.qualityAttributes.filter((item) => item.calibrated).map((item) => item.id),
  pendingQualityAttributes: kb.qualityAttributes.filter((item) => !item.calibrated).map((item) => item.id),
  safeguards: {
    stableIdAndTraitScoring: true,
    applicabilityGating: true,
    prohibitedTechnologyRealizationCheck: true,
    pendingDriversExcludedFromScoring: true,
    providerNeutralEmbeddedCoArchitect: true,
    reversibleAuditProposals: true,
    contextualKnowledgeGuidance: true,
    contextualGuidancePlacements: ['brief','quality','canvas','inspector','review','global'],
    semanticGateChecks: 8,
    deterministicFallback: true,
  },
};
await writeFile('INTELLIGENCE_CORE_BENCHMARK.json', JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
