import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const failures = [];
const checks = [];
function check(name, condition, detail='') {
  checks.push({ name, passed: Boolean(condition), detail });
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}
function text(path) { return readFileSync(resolve(root, path), 'utf8'); }
function has(path, fragments) {
  if (!existsSync(resolve(root, path))) return false;
  const source = text(path);
  return fragments.every((fragment) => source.includes(fragment));
}

check('rc.10.58 canonical backend version', JSON.parse(text('package.json')).version === '0.10.0-rc.10.58.0');
check('durable queue adapter exists', has('packages/integrations/src/durableJobQueue.ts', ['FileDurableJobQueue', 'PostgresJobQueue', 'requeueExpiredLeases', "'dead-letter'"]));
check('repository provider adapters exist', has('packages/integrations/src/repositorySourceAdapters.ts', ['GitHubAppRepositoryAdapter', 'GitLabRepositoryAdapter', 'AzureDevOpsRepositoryAdapter']));
check('container secret-file conventions are consumed', has('apps/worker/src/productionWorker.ts', ['GITHUB_APP_PRIVATE_KEY', '_FILE', 'readFileSync']) && has('apps/api/src/knowledgeObjectStore.ts', ['AWS_ACCESS_KEY_ID', '_FILE', 'readFileSync']));
check('real production worker exists', has('apps/worker/src/productionWorker.ts', ['ProductionMindFactoryWorker', 'heartbeat', 'reserve', 'writeHeartbeat']));
check('scheduled source refresh is durable and idempotent', has('apps/worker/src/productionWorker.ts', ['AIW_SCHEDULED_JOBS_JSON', 'enqueueDueSchedules', 'schedule:', 'correlationId']));
check('production operations routes registered', has('apps/api/src/app.ts', ['productionMindFactoryRoutes']) && has('apps/api/src/routes/productionMindFactoryRoutes.ts', ['/production-mind-factory/status', '/environment-promotions']));
check('production acceptance blocks mandatory gaps', has('apps/api/src/productionBrainAcceptance.ts', ['productionAccepted', 'mandatoryBlockers', 'deterministicDesignAvailable']));
check('production promotion requires acceptance', has('apps/api/src/productionOperations.ts', ['productionAccepted', 'mandatoryBlockers', 'pinnedKnowledgeReleaseId']));
check('evidence lifecycle implemented', has('apps/api/src/productionOperations.ts', ['expiresAt', 'deleteEvidence', 'listEvidence']));
check('enterprise secret adapters implemented', has('apps/api/src/secrets.ts', ['Vault', 'AWS', 'Azure', 'GCP']));
check('managed release signers implemented', has('apps/api/src/enterpriseReleaseSigning.ts', ['VaultTransitReleaseSigner', 'AwsKmsReleaseSigner', 'AzureKeyVaultReleaseSigner', 'GcpKmsReleaseSigner']));
check('production schema and RLS migration exists', has('database/migrations/018_rc10_58_production_mind_factory.sql', ['production_jobs', 'ENABLE ROW LEVEL SECURITY', 'FORCE ROW LEVEL SECURITY', 'tenant_id']));
check('backup and restore acceptance script exists', has('scripts/rc10-58-backup-restore-acceptance.mjs', ['pg_dump', 'pg_restore', 'rowCounts']));
check('production deployment includes worker/database/object storage/telemetry', has('deploy/docker-compose.production.example.yml', ['worker:', 'postgres:', 'minio:', 'otel-collector:']));

console.log(JSON.stringify({ release: 'rc.10.58', checks, passed: failures.length === 0 }, null, 2));
if (failures.length) {
  console.error(`\nrc.10.58 Production Mind Factory gate failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
