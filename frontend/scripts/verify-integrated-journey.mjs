import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [app, store, guide, coarchitect, brief, quality, collaboration, patternWorkspace, api, styles, migration, llmStore, compose, dockerfile] = await Promise.all([
  read('apps/web/src/App.tsx'),
  read('apps/web/src/store/workspaceStore.ts'),
  read('apps/web/src/components/DesignGuide.tsx'),
  read('apps/api/src/coArchitect.ts'),
  read('apps/web/src/components/DesignBriefStudio.tsx'),
  read('apps/web/src/components/QualityAttributeStudio.tsx'),
  read('apps/web/src/components/CollaborationRuntime.tsx'),
  read('apps/web/src/components/PatternIntelligenceWorkspace.tsx'),
  read('apps/api/src/app.ts'),
  read('apps/web/src/styles.css'),
  read('database/migrations/009_sprint8_0_2_integrated_architecture_journey.sql'),
  read('apps/api/src/llmRuntimeStore.ts'),
  read('docker-compose.yml'),
  read('Dockerfile'),
]);

const checks = [
  ['Project hub and authenticated project entry are mounted', /<ProjectHub/.test(app) && /development-token/.test(await read('apps/web/src/components/ProjectHub.tsx'))],
  ['Server-authoritative autosave and optimistic concurrency are wired', /saveProjectToServer/.test(store) && /expectedRevision/.test(store) && /persistenceStatus/.test(store)],
  ['Measurable quality scenarios and AI-assisted brief structuring are present', /qualityScenarios/.test(quality) && /design-brief\/analyse/.test(brief)],
  ['Contextual visual guide retrieves approved Pattern DNA', /pattern-intelligence\/recommend/.test(guide) && /knowledgeRelease/.test(guide) && /evidenceConnectorIds/.test(guide)],
  ['Co-architect uses the full governed Pattern DNA corpus', /sprint78PatternCorpus/.test(coarchitect) && /buildRecommendationEvidencePack/.test(coarchitect) && /opposingEvidence/.test(coarchitect)],
  ['Realtime collaboration runtime is mounted', /<CollaborationRuntime/.test(app) && /AiwCollaborationClient/.test(collaboration)],
  ['Tenant model routing is editable and actively testable', /llm-brain\/config/.test(patternWorkspace) && /llm-brain\/active-probe/.test(patternWorkspace) && /UNSAFE_LLM_RETENTION_POLICY/.test(api)],
  ['Tenant model-routing policy is durable in PostgreSQL with safe local fallback', /llm_runtime_policies/.test(llmStore) && /set_config\('aiw.tenant_id'/.test(llmStore) && /filesystem/.test(llmStore)],
  ['Stage gates, undo and redo protect the lifecycle', /stageEntryBlockers/.test(store) && /undoStack/.test(store) && /redoStack/.test(store)],
  ['Responsive foundation no longer requires a 1180px viewport', !/min-width:\s*1180px/.test(styles) && /@media \(max-width: 820px\)/.test(styles) && /\[dir="rtl"\]/.test(styles)],
  ['Tenant RLS covers co-architect, AI review, guidance and model policy data', /ENABLE ROW LEVEL SECURITY/g.test(migration) && /coarchitect_sessions_tenant/.test(migration) && /llm_runtime_policies_tenant/.test(migration)],
  ['Production reference runs both web and API targets', /target: web/.test(compose) && /target: api/.test(compose) && /AS web/.test(dockerfile) && /AS api/.test(dockerfile)],
  ['Integrated release endpoint is exposed', /api\/releases\/8\.0\.2/.test(api) && /AIW-0\.9\.2/.test(api)],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (ok) passed += 1;
}
console.log(`${passed}/${checks.length} integrated-journey checks passed`);
if (passed !== checks.length) process.exit(1);
