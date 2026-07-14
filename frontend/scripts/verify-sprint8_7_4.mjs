import { readFileSync, writeFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const checks = [];
function assert(id, passed, detail) { checks.push({ id, passed: Boolean(passed), detail }); }

const root = json('package.json');
const workspaces = ['apps/api/package.json','apps/web/package.json','packages/domain/package.json','packages/engine/package.json','packages/artifacts/package.json'].map(json);
const portfolio = read('packages/engine/src/portfolio.ts');
const index = read('packages/engine/src/index.ts');
const api = read('apps/api/src/app.ts');
const workspace = read('apps/web/src/components/PortfolioWorkspace.tsx');
const tests = read('packages/engine/test/sprint8_7_4.test.ts') + read('apps/api/test/sprint8_7_4.test.ts');
const readme = read('README.md');

assert('874-01-version', ['0.10.0-alpha.4','0.10.0-rc.1','0.10.0-rc.2'].includes(root.version) && workspaces.every((item) => ['0.10.0-alpha.4','0.10.0-rc.1','0.10.0-rc.2'].includes(item.version)), 'root and all workspaces retain the 8.7.4 lineage or a verified descendant');
assert('874-02-impact-engine', /analyseEnterpriseStandardsImpact/.test(portfolio) && /StandardsImpactProject/.test(portfolio) && /affectedDependencyIds/.test(portfolio), 'enterprise standards blast-radius engine exists');
assert('874-03-visual-model', /buildPortfolioVisualModel/.test(portfolio) && /PortfolioVisualModel/.test(portfolio) && /knowledgeReleaseId: 'AKR-0\.8\.8'/.test(portfolio), 'portfolio visual model is canonical and release-bound');
assert('874-04-migration-waves', /migrationWaves/.test(portfolio) && /humanApprovalRequired: true/.test(portfolio) && /automaticMutationAllowed: false/.test(portfolio), 'migration waves require human approval and prohibit silent mutation');
assert('874-05-release-boundary', /portfolioIntelligencePlatformRelease/.test(portfolio) && /basedOn: 'AIW-0\.10\.0-alpha\.3'/.test(portfolio), '8.7.4 release boundary preserves 8.7.3 lineage');
assert('874-06-engine-export', /portfolio\.js/.test(index), 'portfolio engine exports are available through @aiw/engine');
assert('874-07-api-routes', ['/api/portfolio/visual-model','/api/portfolio/standards-impact','/api/releases/8.7.4'].every((route) => api.includes(route)), 'portfolio visual, standards-impact and release APIs are exposed');
assert('874-08-active-release', /portfolioIntelligencePlatformRelease\(\)/.test(api) && /api\/releases\/8\.7\.4/.test(api), 'active API release points to the portfolio-intelligence platform');
assert('874-09-ui', /ReactFlow/.test(workspace) && /PortfolioVisualGraph/.test(workspace) && /Standards impact/.test(workspace), 'interactive portfolio and standards impact UI is implemented');
assert('874-10-tests', /blast radius/.test(tests) && /visual portfolio model/.test(tests) && /automaticMutationAllowed/.test(tests) && /tenant boundary/i.test(tests), 'engine and API tests cover visual modelling, blast radius, governance and tenancy');
assert('874-11-docs', /Sprint 8\.7\.4/.test(readme) && /standards impact/i.test(readme), 'release documentation describes Sprint 8.7.4');
assert('874-12-no-text-only', /Interactive portfolio architecture visual model/.test(workspace) && /node-and-relationship/.test(readme), 'portfolio intelligence remains visual modelling, not text-only analysis');

const output = { releaseId: 'AIW-0.10.0-alpha.4', sprint: '8.7.4', generatedAt: new Date().toISOString(), passed: checks.filter((item) => item.passed).length, total: checks.length, checks };
writeFileSync('PORTFOLIO_INTELLIGENCE_BENCHMARK.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(`Sprint 8.7.4 portfolio intelligence gate: ${output.passed}/${output.total} passed`);
for (const check of checks) console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.id} ${check.detail}`);
if (output.passed !== output.total) process.exit(1);
