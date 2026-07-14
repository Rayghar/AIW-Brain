#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

function text(path) { return readFileSync(path, 'utf8'); }
function check(name, ok) {
  if (!ok) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${name}`);
  }
}

const app = text('apps/api/src/app.ts');
const route = text('apps/api/src/routes/repositoryConformancePilotRoutes.ts');
const repo = text('apps/api/src/repositories/repositoryConformancePilotRepository.ts');
const integrations = text('packages/integrations/src/index.ts');
const adminUi = text('apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx');
const rbac = text('packages/engine/src/rbac.ts');
const migration = text('database/migrations/014_sprint8_8_7_repository_conformance_pilot.sql');

check('repository conformance route registered', app.includes('repositoryConformancePilotRoutes'));
check('dedicated repository conformance route exists', existsSync('apps/api/src/routes/repositoryConformancePilotRoutes.ts'));
check('durable repository conformance store exists', existsSync('apps/api/src/repositories/repositoryConformancePilotRepository.ts'));
check('route uses durable repository', /repositoryConformancePilotRepository/.test(route));
check('route is under admin API for permission coverage', /\/api\/admin\/repository-conformance/.test(route));
for (const token of ['connector.scan','conformance.generate','fitness-loop.generate','runtime-evidence.plan']) check(`RBAC includes ${token}`, rbac.includes(`'${token}'`));
for (const token of ['detectRepositoryArchitectureAssets','buildRepositoryEvidenceCoverage','generateConformanceControlsFromCoverage','createCiFitnessLoopPlan','createRuntimeEvidenceIngestionPlan','assertRepositoryWriteSafety']) check(`integrations exposes ${token}`, integrations.includes(token));
check('repository writes disabled doctrine encoded', integrations.includes('Repository writes must remain disabled') && integrations.includes('disabled-by-default'));
check('PR creation requires approval doctrine encoded', integrations.includes('preview-only-requires-approval') && route.includes('PR creation preview only'));
check('runtime evidence cannot mutate architecture', integrations.includes('evidence-only-no-architecture-mutation'));
check('Admin UI exposes Repo pilot tab', adminUi.includes("'repoPilot'") && adminUi.includes('Repository and Conformance Pilot'));
check('Admin UI has no window.prompt in repository pilot', !/window\.prompt/.test(adminUi));
check('Admin UI can scan connectors', adminUi.includes('scanConnector') && adminUi.includes('/api/admin/repository-conformance/connectors/'));
check('migration exists with tenant-aware RLS', migration.includes('repository_conformance_scans_v2') && migration.includes('ENABLE ROW LEVEL SECURITY') && migration.includes("current_setting('aiw.tenant_id'"));
check('old repository scan side-path not introduced in admin repository', !/repositoryScans|fitnessLoops|runtimePlans/.test(text('apps/api/src/repositories/adminRepositories.ts')));

if (process.exitCode) process.exit(process.exitCode);
console.log('Sprint 8.8.7 Repository and Conformance Pilot verification passed.');
