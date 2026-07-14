import fs from 'node:fs';
const checks = [];
function check(name, ok) { checks.push({ name, ok: Boolean(ok) }); if (!ok) console.error(`FAIL ${name}`); else console.log(`PASS ${name}`); }
function text(path) { return fs.readFileSync(path, 'utf8'); }
const pkg = JSON.parse(text('package.json'));
check('root version is rc.10.20', pkg.version === '0.10.0-rc.10.20');
check('sprint8_9_7 script registered', Boolean(pkg.scripts?.['sprint8_9_7:verify']));

const domain = text('packages/domain/src/mindFactory.ts');
for (const token of ['MindFactoryPersistencePlan','KmsSigningRequest','KmsSigningResult','RepositorySourceExecutionPolicy','RepositorySourceExecutionResult','MindFactoryActivationPersistenceRecord']) check(`domain contract ${token}`, domain.includes(token));

const knowledge = text('packages/knowledge/src/mindFactory.ts');
for (const token of ['createMindFactoryPersistencePlan','signKnowledgePackWithKms','executeRepositorySourceRefresh','persistKnowledgePackActivation']) check(`knowledge helper ${token}`, knowledge.includes(token));

const routes = text('apps/api/src/routes/mindFactoryRoutes.ts');
for (const endpoint of ['/persistence','/persistence/pin-activation','/kms/sign','/repository-sources/:connectorId/execute-refresh','/jobs/execute-next']) check(`route includes ${endpoint}`, routes.includes(endpoint));
for (const permission of ['mind-factory.persistence','knowledge-pack.sign','repository-source.execute','mind-factory.execute']) check(`route checks ${permission}`, routes.includes(permission));

const rbac = text('packages/engine/src/rbac.ts');
for (const permission of ['mind-factory.persistence','knowledge-pack.sign','repository-source.execute','mind-factory.execute']) check(`RBAC has ${permission}`, rbac.includes(`'${permission}'`));

check('Postgres persistence repository port exists', fs.existsSync('apps/api/src/repositories/mindFactoryPostgresRepository.ts'));
check('Production persistence migration exists', fs.existsSync('database/migrations/016_sprint8_9_7_mind_factory_production.sql'));
const migration = text('database/migrations/016_sprint8_9_7_mind_factory_production.sql');
for (const table of ['mind_factory_source_snapshots','mind_factory_candidate_claims','mind_factory_worker_jobs','mind_factory_repository_executions','mind_factory_kms_signatures','mind_factory_pack_activations','mind_factory_audit_timeline']) check(`migration contains ${table}`, migration.includes(table));
check('migration enables RLS', (migration.match(/ENABLE ROW LEVEL SECURITY/g) ?? []).length >= 7);

const worker = text('apps/worker/src/worker.ts');
check('worker readiness references productionMindFactory', worker.includes('productionMindFactory'));
check('production execution job descriptor exists', fs.existsSync('apps/worker/src/jobs/mindFactoryProductionExecutionJob.ts'));

const integrations = text('packages/integrations/src/index.ts');
for (const token of ['KmsSigningAdapterContract','kmsSigningAdapterContracts','ReadOnlyRepositoryExecutionContract']) check(`integrations contract ${token}`, integrations.includes(token));

check('API sprint 8.9.7 test exists', fs.existsSync('apps/api/test/sprint8_9_7.test.ts'));
check('Sprint 8.9.7 documentation exists', fs.existsSync('SPRINT8_9_7_PRODUCTION_MIND_FACTORY_PERSISTENCE_KMS_REPO_EXECUTION.md'));
check('Change summary exists', fs.existsSync('CHANGE_SUMMARY_v0.10.0-rc.10.20.md'));

const failed = checks.filter(c => !c.ok);
if (failed.length) { console.error(`Sprint 8.9.7 verification failed: ${failed.length} failing check(s).`); process.exit(1); }
console.log(`Sprint 8.9.7 verification passed: ${checks.length}/${checks.length} checks.`);
