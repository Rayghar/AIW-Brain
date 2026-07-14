import { readFile, writeFile } from 'node:fs/promises';

const text = async (path) => readFile(path, 'utf8');
const json = async (path) => JSON.parse(await text(path));
const checks = [];
function assert(id, condition, detail) {
  checks.push({ id, passed: Boolean(condition), detail });
  if (!condition) throw new Error(`${id}: ${detail}`);
}

const root = await json('package.json');
const workspacePaths = ['apps/api/package.json','apps/web/package.json','packages/domain/package.json','packages/engine/package.json','packages/artifacts/package.json'];
const workspaces = await Promise.all(workspacePaths.map(json));
const acceptance = await text('apps/api/src/platformAcceptance.ts');
const app = await text('apps/api/src/app.ts');
const repository = await text('apps/api/src/platformAcceptanceRepository.ts');
const migration = await text('database/migrations/011_sprint8_7_2_enterprise_runtime_acceptance.sql');
const runtimeUi = await text('apps/web/src/components/EnterpriseRuntimeWorkspace.tsx');
const profiles = await text('apps/web/src/lib/experienceProfiles.ts');
const server = await text('apps/api/src/server.ts');
const objectStore = await text('apps/api/src/knowledgeObjectStore.ts');
const compose = await text('docker-compose.yml');
const env = await text('.env.example');
const operations = await text('operations/SPRINT8_7_2_ENTERPRISE_RUNTIME_ACCEPTANCE.md');

assert('872-01-version', ['0.10.0-alpha.2','0.10.0-alpha.3','0.10.0-alpha.4','0.10.0-rc.1','0.10.0-rc.2'].includes(root.version) && workspaces.every((item) => ['0.10.0-alpha.2','0.10.0-alpha.3','0.10.0-alpha.4','0.10.0-rc.1','0.10.0-rc.2'].includes(item.version)), 'root and all workspaces retain the 8.7.2 lineage or a verified descendant');
assert('872-02-active-probes', ['ACC-POSTGRES','ACC-OBJECT-STORE','ACC-VECTOR','ACC-LLM','ACC-GITHUB','ACC-CI','ACC-OIDC','ACC-OTEL','ACC-SIGNING'].every((id) => acceptance.includes(id)), 'all enterprise boundaries have explicit acceptance checks');
assert('872-03-no-config-placebo', acceptance.includes("productionAccepted = requiredChecks.every") && acceptance.includes("status === 'verified'"), 'production acceptance requires verified required checks rather than configured flags');
assert('872-04-evidence-api', app.includes('/api/platform/acceptance/probe') && app.includes('/api/platform/acceptance/history') && app.includes('ENTERPRISE_ACCEPTANCE_OPERATOR_REQUIRED'), 'active probes are authorized and evidence is retrievable');
assert('872-05-evidence-persistence', repository.includes('platform_acceptance_runs') && repository.includes("set_config('aiw.tenant_id'"), 'acceptance evidence is tenant-scoped in PostgreSQL with memory fallback');
assert('872-06-rls-migration', migration.includes('ENABLE ROW LEVEL SECURITY') && migration.includes('platform_acceptance_runs_tenant'), 'acceptance evidence migration enforces RLS');
assert('872-07-object-roundtrip', objectStore.includes('delete(key: string)') && acceptance.includes('OBJECT_STORE_ROUNDTRIP_DIGEST_MISMATCH'), 'object-store acceptance proves write/read/digest/delete');
assert('872-08-startup-enforcement', server.includes("acceptanceMode === 'enforce'") && server.includes('enforcePlatformAcceptance'), 'startup can fail closed on required runtime controls');
assert('872-09-runtime-workspace', runtimeUi.includes('Run {selected.size} probe') && runtimeUi.includes('Retained evidence') && profiles.includes("'runtime'"), 'operators have a dedicated runtime acceptance workspace');
assert('872-10-local-enterprise-profile', compose.includes('keycloak:') && compose.includes('otel-collector:') && compose.includes('profiles: ["enterprise"]'), 'local enterprise profile includes OIDC and OTLP infrastructure');
assert('872-11-runtime-policy', env.includes('AIW_RUNTIME_ACCEPTANCE_MODE') && env.includes('AIW_RUNTIME_REQUIRED_CHECKS') && env.includes('AIW_RUNTIME_ACCEPTANCE_OPERATORS'), 'environment contract exposes enforcement, requirements and operators');
assert('872-12-operational-guide', operations.includes('Configured') && operations.includes('Verified') && operations.includes('docker compose --profile enterprise'), 'operational guide documents truthful acceptance semantics and execution');

const output = { releaseId: 'AIW-0.10.0-alpha.2', sprint: '8.7.2', generatedAt: new Date().toISOString(), passed: checks.filter((item) => item.passed).length, total: checks.length, checks };
await writeFile('ENTERPRISE_RUNTIME_BENCHMARK.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(`Sprint 8.7.2 enterprise runtime gate: ${output.passed}/${output.total} passed`);
