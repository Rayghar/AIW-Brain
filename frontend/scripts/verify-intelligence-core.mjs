import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [recommendation, qualityUi, auditSource, canvas, store, libraryUi, kernel, retrieval, api, libraryRaw] = await Promise.all([
  read('packages/engine/src/recommendation.ts'),
  read('apps/web/src/components/QualityAttributeStudio.tsx'),
  read('apps/api/src/aiAudit.ts'),
  read('apps/web/src/features/canvas/ProCanvasViewSystem.tsx'),
  read('apps/web/src/store/workspaceStore.ts'),
  read('apps/web/src/components/ArchitectureLibrary.tsx'),
  read('packages/engine/src/intelligenceKernel.ts'),
  read('packages/engine/src/knowledgeRetrieval.ts'),
  read('apps/api/src/app.ts'),
  read('data/knowledge-library.json'),
]);
const library = JSON.parse(libraryRaw);

const checks = [
  ['No style-name substring recommendation logic', !/styleName\.includes|style\.name\.toLowerCase\(\)\.includes/.test(recommendation)],
  ['Canonical quality IDs and explicit calibration lifecycle', library.qualityAttributes.every((item) => !/^QA-/.test(item.id) && typeof item.calibrated === 'boolean' && typeof item.calibrationStatus === 'string')],
  ['Exactly eight production calibrations and twelve governed drafts', library.qualityAttributes.filter((item) => item.calibrated === true).length === 8 && library.qualityAttributes.filter((item) => item.calibrated !== true).length === 12],
  ['Pending attributes cannot affect production scoring', /requested\.filter\(\(priority\) => isCalibrated/.test(recommendation) && /Pending calibration and excluded from scoring/.test(recommendation) && /disabled=\{!calibrated\}/.test(qualityUi)],
  ['Applicability gating is deterministic', /applicabilityDisqualifiers/.test(recommendation) && /minOperationalMaturity/.test(recommendation)],
  ['Provider-neutral co-architect uses the LLM gateway', /new LlmGateway|gateway = new LlmGateway/.test(auditSource) && !/from 'openai'/.test(auditSource)],
  ['One semantic event/context/response kernel exists', /export type ArchitectureEventKind/.test(kernel) && /assembleIntelligenceContext/.test(kernel) && /export interface IntelligenceResponse/.test(kernel) && /evaluateArchitectureEvent/.test(kernel)],
  ['Kernel is bound to approved release retrieval', /selectRelevantKnowledge/.test(kernel) && /candidateKnowledgeUsed: false/.test(kernel) && /review\?\.releaseId === releaseId/.test(retrieval)],
  ['Design Studio consumes embedded intelligence rather than a chat-only surface', /EmbeddedIntelligencePanel/.test(canvas) && /ConnectionIntelligenceReview/.test(canvas) && /pendingConnectionReview/.test(store)],
  ['Connection creation is reviewed before model mutation', /kind: 'connection-intent'/.test(store) && /commitPendingConnection/.test(store) && /create-relationship/.test(kernel)],
  ['Adaptive library ranking consumes kernel suggestions', /intelligence\?\.suggestedComponents/.test(libraryUi)],
  ['API evaluation enforces schema and tenant boundary', /INVALID_INTELLIGENCE_EVALUATION/.test(api) && /tenantProject\(parsed\.data\.project, principal\)/.test(api)],
  ['Full-journey kernel emits an interactive visual model', /visualModel: IntelligenceVisualModel/.test(kernel) && /buildVisualIntelligenceModel/.test(kernel) && /humanApprovalRequired: true/.test(kernel)],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (ok) passed += 1;
}
console.log(`${passed}/${checks.length} intelligence-core checks passed`);
if (passed !== checks.length) process.exit(1);
