import fs from 'node:fs';

const checks = [];
function check(name, ok) { checks.push({ name, ok: Boolean(ok) }); if (!ok) console.error(`FAIL ${name}`); else console.log(`PASS ${name}`); }
function text(path) { return fs.readFileSync(path, 'utf8'); }

const pkg = JSON.parse(text('package.json'));
check('root version is rc.10.19', pkg.version === '0.10.0-rc.10.19');
check('sprint8_9_6 script registered', Boolean(pkg.scripts?.['sprint8_9_6:verify']));

const domain = text('packages/domain/src/mindFactory.ts');
for (const token of ['MindFactoryWorkerJobPlan', 'KnowledgePackActivationPolicy', 'MindFactoryAuditTimelineEvent']) check(`domain contract ${token}`, domain.includes(token));

const knowledge = text('packages/knowledge/src/mindFactory.ts');
for (const token of ['createMindFactoryWorkerJobPlan', 'activateSignedKnowledgePack', 'buildMindFactoryAuditTimeline']) check(`knowledge helper ${token}`, knowledge.includes(token));
check('knowledge index exports mindFactory', text('packages/knowledge/src/index.ts').includes("./mindFactory.js"));

const routes = text('apps/api/src/routes/mindFactoryRoutes.ts');
for (const endpoint of ['/jobs/source-refresh', '/jobs/claim-extraction', '/knowledge-pack/activate', '/activation', '/audit-timeline']) check(`route includes ${endpoint}`, routes.includes(endpoint));
for (const permission of ['mind-factory.worker', 'knowledge-pack.activate']) check(`route checks ${permission}`, routes.includes(permission));

const rbac = text('packages/engine/src/rbac.ts');
for (const permission of ['mind-factory.worker', 'knowledge-pack.activate']) check(`RBAC has ${permission}`, rbac.includes(`'${permission}'`));

const ui = text('apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx');
for (const token of ['Mind factory', 'captureMindSnapshot', 'queueMindWorker', 'activateLatestMindPack', 'Knowledge-pack activations', 'Mind Factory audit timeline']) check(`admin UI includes ${token}`, ui.includes(token));

const workerQueue = text('apps/worker/src/queues/queueTypes.ts');
check('worker queue includes mind-factory-orchestration', workerQueue.includes('mind-factory-orchestration'));
check('worker job descriptor exists', fs.existsSync('apps/worker/src/jobs/mindFactoryOrchestrationJob.ts'));
check('worker readiness references mind factory job', text('apps/worker/src/worker.ts').includes('mindFactory'));

check('API sprint 8.9.6 test exists', fs.existsSync('apps/api/test/sprint8_9_6.test.ts'));

const failed = checks.filter((c) => !c.ok);
if (failed.length) {
  console.error(`Sprint 8.9.6 verification failed: ${failed.length} failing check(s).`);
  process.exit(1);
}
console.log(`Sprint 8.9.6 verification passed: ${checks.length}/${checks.length} checks.`);
