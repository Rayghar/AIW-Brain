import { readFileSync, existsSync } from 'node:fs';

const checks = [];
function check(label, condition) { checks.push({ label, condition: Boolean(condition) }); }
function text(path) { return readFileSync(path, 'utf8'); }

const pkg = JSON.parse(text('package.json'));
check('root version is rc.10.21', pkg.version === '0.10.0-rc.10.21');
check('sprint8_9_8 verify script registered', Boolean(pkg.scripts?.['sprint8_9_8:verify']?.includes('verify-sprint8_9_8.mjs')));
check('live provider bindings module exists', existsSync('packages/integrations/src/liveProviderBindings.ts'));
check('provider fetch plan helper exists', text('packages/integrations/src/liveProviderBindings.ts').includes('createReadOnlyProviderFetchPlan'));
check('KMS binding guide helper exists', text('packages/integrations/src/liveProviderBindings.ts').includes('createKmsProviderBindingGuide'));
check('provider deployment smoke plan exists', text('packages/integrations/src/liveProviderBindings.ts').includes('createProviderBoundDeploymentSmokePlan'));
check('aiw-kpack helper exists', existsSync('packages/knowledge/src/aiwKpack.ts'));
check('aiw-kpack envelope export exists', text('packages/knowledge/src/aiwKpack.ts').includes('createAiwKpackEnvelope'));
check('aiw-kpack verification exists', text('packages/knowledge/src/aiwKpack.ts').includes('verifyAiwKpackEnvelope'));
check('release activation screen model exists', text('packages/knowledge/src/aiwKpack.ts').includes('buildReleaseActivationScreen'));
check('knowledge package exports aiwKpack', text('packages/knowledge/src/index.ts').includes("./aiwKpack.js"));
check('API imports integration binding helpers', text('apps/api/src/routes/mindFactoryRoutes.ts').includes('@aiw/integrations'));
check('provider binding summary route exists', text('apps/api/src/routes/mindFactoryRoutes.ts').includes('/api/admin/mind-factory/provider-bindings'));
check('repository fetch-plan route exists', text('apps/api/src/routes/mindFactoryRoutes.ts').includes('/api/admin/mind-factory/provider-bindings/repository/fetch-plan'));
check('KMS guide route exists', text('apps/api/src/routes/mindFactoryRoutes.ts').includes('/api/admin/mind-factory/provider-bindings/kms/guide'));
check('aiw-kpack export route exists', text('apps/api/src/routes/mindFactoryRoutes.ts').includes('/api/admin/mind-factory/aiw-kpack/export'));
check('aiw-kpack import route exists', text('apps/api/src/routes/mindFactoryRoutes.ts').includes('/api/admin/mind-factory/aiw-kpack/import'));
check('release activation screen route exists', text('apps/api/src/routes/mindFactoryRoutes.ts').includes('/api/admin/mind-factory/release-activation-screen'));
check('RBAC has repository-source.bind', text('packages/engine/src/rbac.ts').includes("'repository-source.bind'"));
check('RBAC has knowledge-pack.kpack', text('packages/engine/src/rbac.ts').includes("'knowledge-pack.kpack'"));
check('RBAC has knowledge-pack.kms-guide', text('packages/engine/src/rbac.ts').includes("'knowledge-pack.kms-guide'"));
check('Admin UI has provider binding card', text('apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx').includes('Live provider binding and .aiw-kpack UX'));
check('API tests added', existsSync('apps/api/test/sprint8_9_8.test.ts'));
check('sprint doc exists', existsSync('SPRINT8_9_8_LIVE_PROVIDER_KMS_RUNBOOKS_KPACK_UX.md'));
check('change summary exists', existsSync('CHANGE_SUMMARY_v0.10.0-rc.10.21.md'));

const failed = checks.filter((item) => !item.condition);
for (const item of checks) console.log(`${item.condition ? '✅' : '❌'} ${item.label}`);
if (failed.length) {
  console.error(`Sprint 8.9.8 verification failed: ${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`Sprint 8.9.8 verification passed: ${checks.length}/${checks.length} checks passed.`);
