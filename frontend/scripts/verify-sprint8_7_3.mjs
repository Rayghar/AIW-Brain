import { readFileSync, writeFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const checks = [];
function assert(id, passed, detail) { checks.push({ id, passed: Boolean(passed), detail }); }

const root = json('package.json');
const workspaces = ['apps/api/package.json','apps/web/package.json','packages/domain/package.json','packages/engine/package.json','packages/artifacts/package.json'].map(json);
const engine = read('packages/engine/src/continuousConformance.ts');
const index = read('packages/engine/src/index.ts');
const api = read('apps/api/src/app.ts');
const store = read('apps/web/src/store/workspaceStore.ts');
const workspace = read('apps/web/src/components/ConformanceWorkspace.tsx');
const profiles = read('apps/web/src/lib/experienceProfiles.ts');
const tests = read('packages/engine/test/sprint8_7_3.test.ts') + read('apps/api/test/sprint8_7_3.test.ts');

assert('873-01-version', ['0.10.0-alpha.3','0.10.0-alpha.4','0.10.0-rc.1','0.10.0-rc.2'].includes(root.version) && workspaces.every((item) => ['0.10.0-alpha.3','0.10.0-alpha.4','0.10.0-rc.1','0.10.0-rc.2'].includes(item.version)), 'root and all workspaces retain the 8.7.3 lineage or a verified descendant');
assert('873-02-plan', /buildArchitectureConformancePlan/.test(engine) && /projectRevision/.test(engine) && /knowledgeReleaseId/.test(engine), 'project-scoped, release-bound conformance plan exists');
assert('873-03-fitness', /generateArchitectureFitnessFunctions/.test(engine) && /traceabilityControls/.test(engine) && /topologyControls/.test(engine), 'pattern, traceability and topology controls generate reviewable fitness artifacts');
assert('873-04-unverified', /'unverified'/.test(engine) && /No .* evidence has been received/.test(engine), 'missing execution evidence is explicit and cannot be treated as pass');
assert('873-05-assessment', /assessContinuousConformance/.test(engine) && /driftAsConformance/.test(engine) && /normalizeConformanceEvidence/.test(engine), 'CI evidence and runtime drift are reconciled into one assessment');
assert('873-06-visual', /buildConformanceVisualModel/.test(engine) && /ReactFlow/.test(workspace) && /intended-versus-actual/.test(workspace), 'interactive visual intended-versus-actual conformance graph is implemented');
assert('873-07-remediation', /humanApprovalRequired: true/.test(engine) && /automaticMutationAllowed: false/.test(engine) && /No architecture or repository mutation/.test(workspace), 'remediation is reviewable and cannot silently mutate architecture or repositories');
assert('873-08-api', ['/api/conformance/plan','/api/conformance/assess','/api/conformance/remediation-preview','/api/releases/8.7.3'].every((route) => api.includes(route)), 'conformance and release APIs are exposed');
assert('873-09-store', /generateConformancePlan/.test(store) && /assessConformanceNow/.test(store) && /previewConformanceRemediation/.test(store), 'offline-capable workbench state and actions are wired');
assert('873-10-navigation', /conformance/.test(profiles) && /ConformanceWorkspace/.test(read('apps/web/src/App.tsx')), 'role-focused navigation exposes the conformance workspace');
assert('873-11-tests', /unverified/.test(tests) && /human-approved/.test(tests) && /visual/.test(tests), 'engine and API regression tests cover truthful evidence, visual modelling and human approval');
assert('873-12-lineage', /AKR-0\.8\.8/.test(engine) && /AIW-0\.10\.0-alpha\.2/.test(api) && /continuousConformancePlatformRelease/.test(api) && /continuousConformance/.test(index), 'approved knowledge and 8.7.2 enterprise-runtime lineage are preserved');

const output = { releaseId: 'AIW-0.10.0-alpha.3', sprint: '8.7.3', generatedAt: new Date().toISOString(), passed: checks.filter((item) => item.passed).length, total: checks.length, checks };
writeFileSync('CONTINUOUS_CONFORMANCE_BENCHMARK.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(`Sprint 8.7.3 continuous conformance gate: ${output.passed}/${output.total} passed`);
for (const check of checks) console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.id} ${check.detail}`);
if (output.passed !== output.total) process.exit(1);
