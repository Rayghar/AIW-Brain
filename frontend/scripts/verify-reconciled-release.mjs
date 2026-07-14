import { readFile, access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const exists = async (path) => access(new URL(path, root)).then(() => true).catch(() => false);
const packageJson = JSON.parse(await read('package.json'));
const library = JSON.parse(await read('data/knowledge-library.json'));
const retrieval = await read('packages/engine/src/knowledgeRetrieval.ts');
const advisor = await read('packages/engine/src/stageAdvisor.ts');
const guide = await read('apps/web/src/components/DesignGuide.tsx');
const brief = await read('apps/web/src/components/DesignBriefStudio.tsx');
const api = await read('apps/api/src/app.ts');
const compose = await read('docker-compose.yml');
const knowledgeOperations = await read('apps/api/src/knowledgeOperationsRepository.ts');
const checks = [
  ['release descends from reconciled v0.9.6 baseline', ['0.9.6','0.9.7','0.9.9','0.10.0-alpha.1','0.10.0-alpha.2','0.10.0-alpha.3','0.10.0-alpha.4','0.10.0-rc.1','0.10.0-rc.2'].includes(packageJson.version)],
  ['v0.9.2 Project Hub retained', await exists('apps/web/src/components/ProjectHub.tsx')],
  ['v0.9.2 persistent Co-Architect retained', await exists('apps/web/src/components/CoArchitectPanel.tsx')],
  ['v0.9.2 collaboration runtime retained', await exists('apps/web/src/components/CollaborationRuntime.tsx')],
  ['v0.9.2 authenticated API client retained', await exists('apps/web/src/lib/apiClient.ts')],
  ['v0.9.2 tenant model policy store retained', await exists('apps/api/src/llmRuntimeStore.ts')],
  ['v0.9.2 PostgreSQL integrated journey migration retained', await exists('database/migrations/009_sprint8_0_2_integrated_architecture_journey.sql')],
  ['production web deployment retained', /target:\s*web/.test(compose) && await exists('deploy/nginx.conf')],
  ['structured enterprise brief merged', /regulatoryJurisdictions/.test(brief) && /recoveryObjectives/.test(brief)],
  ['release-bound retrieval merged', /approvedPatternRecords/.test(retrieval) && /review\?\.releaseId === releaseId/.test(retrieval)],
  ['deterministic citation resolver merged', /resolveApprovedCitationIds/.test(advisor) && /rejectedCitationCount/.test(advisor)],
  ['stage advisor is mounted in contextual guide', /design\/stage-advice/.test(guide) && /selectedNodeId/.test(guide) && /Add to canvas/.test(guide)],
  ['knowledge drafting and human promotion endpoints are exposed', /knowledge\/draft-record/.test(api) && /knowledge\/promote/.test(api)],
  ['pending calibration remains honest', (library.qualityAttributes ?? []).filter((item) => item.calibrated !== true).length === 12],
  ['active knowledge release is explicit', library.knowledgeReleaseId === 'AKR-0.8.8'],
  ['knowledge curation is durably persisted with tenant RLS', await exists('database/migrations/010_sprint8_0_3_reconciled_knowledge_curation.sql') && /saveKnowledgeRecordDraft/.test(knowledgeOperations)],
];
let passed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (ok) passed += 1; }
console.log(`${passed}/${checks.length} reconciled release checks passed`);
if (passed !== checks.length) process.exit(1);
