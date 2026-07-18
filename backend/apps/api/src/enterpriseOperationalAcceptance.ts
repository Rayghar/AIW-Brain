import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createAdminControlPlaneStore,
  type BackupRestoreDrill,
  type OperationalAcceptanceCheck,
  type OperationalAcceptanceRun,
  type TenantPolicy,
} from '@aiw/admin';
import { FileDurableJobQueue } from '@aiw/integrations';
import { BillingBoundary, type BillingEventEnvelope } from './billingBoundary.js';
import { runEnterpriseIdentityAcceptance } from './enterpriseIdentityAcceptance.js';
import { FileSystemKnowledgeObjectStore } from './knowledgeObjectStore.js';
import { TelemetryRuntime } from './observability.js';
import { MemorySaasAdminPersistence, type SaasAdminPersistence } from './saasAdminPersistence.js';

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function check(
  id: string,
  category: OperationalAcceptanceCheck['category'],
  status: OperationalAcceptanceCheck['status'],
  detail: string,
  productionProof = false,
  evidence: string[] = [],
): OperationalAcceptanceCheck {
  return { id, category, status, detail, productionProof, ...(evidence.length ? { evidence } : {}) };
}

async function runBackupRestoreDrill(input: {
  tenantId: string;
  actor: string;
  persistence: SaasAdminPersistence;
  workDir: string;
}): Promise<{ drill: BackupRestoreDrill; check: OperationalAcceptanceCheck }> {
  const startedAt = new Date().toISOString();
  const snapshot = await input.persistence.exportTenantSnapshot(input.tenantId);
  const canonical = stable(snapshot);
  const backupSha256 = sha256(canonical);
  const backupPath = join(input.workDir, `${input.tenantId}-admin-backup.json`);
  await writeFile(backupPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  const fileSha256 = sha256(await readFile(backupPath));

  const restoreStore = createAdminControlPlaneStore();
  const restore = new MemorySaasAdminPersistence(restoreStore);
  if (snapshot.organisation) await restore.saveOrganisation(snapshot.organisation);
  if (snapshot.subscription) await restore.saveSubscription(snapshot.subscription);
  for (const usage of snapshot.usageEvents) await restore.appendUsageEvent(usage);
  if (snapshot.budget) await restore.saveBudget(snapshot.budget);
  for (const provider of snapshot.identityProviders) await restore.saveIdentityProvider(provider);
  for (const mapping of snapshot.roleMappingRules) await restore.saveRoleMappingRule(mapping);
  const restored = await restore.exportTenantSnapshot(input.tenantId);
  const restoredSha256 = sha256(stable(restored));
  const matched = backupSha256 === restoredSha256 && fileSha256 === sha256(`${JSON.stringify(snapshot, null, 2)}\n`);
  const completedAt = new Date().toISOString();
  const drill: BackupRestoreDrill = {
    drillId: `backup-${randomUUID()}`,
    tenantId: input.tenantId,
    startedAt,
    completedAt,
    sourceAdapter: (await input.persistence.health()).adapter,
    backupUri: `ephemeral://tenant-admin-snapshot/${input.tenantId}/${backupSha256}`,
    backupSha256,
    restoreTarget: 'isolated-memory-validation-store',
    restoredSha256,
    matched,
    productionProof: false,
    executedBy: input.actor,
  };
  await input.persistence.recordBackupRestoreDrill(drill);
  return {
    drill,
    check: check(
      'backup-restore-roundtrip',
      'backup-restore',
      matched ? 'passed' : 'failed',
      matched
        ? 'Tenant administration, identity-provider and role-mapping state was backed up, restored into an isolated store, and matched canonically.'
        : 'Restored tenant administration state did not match the backup.',
      false,
      [backupSha256, restoredSha256],
    ),
  };
}

async function runQueueDrill(tenantId: string, workDir: string): Promise<OperationalAcceptanceCheck> {
  const file = join(workDir, 'queue', 'jobs.json');
  const queue = new FileDurableJobQueue(file);
  const job = await queue.enqueue({ tenantId, queue: 'operational-acceptance', payload: { acceptance: true }, maxAttempts: 2 });
  const reserved = await queue.reserve('rc10.78.1-acceptance-worker', ['operational-acceptance'], 5_000);
  if (!reserved || reserved.id !== job.id) return check('durable-queue-roundtrip', 'queue', 'failed', 'The acceptance job could not be reserved from the durable queue.');
  await queue.complete('rc10.78.1-acceptance-worker', reserved.id);
  const reloaded = new FileDurableJobQueue(file);
  const persisted = await reloaded.get(tenantId, job.id);
  const health = await reloaded.health();
  const ok = persisted?.status === 'completed' && health.ready && health.durable;
  return check(
    'durable-queue-roundtrip',
    'queue',
    ok ? 'passed' : 'failed',
    ok ? 'A queued job was leased, completed, reloaded from disk, and remained completed.' : 'The durable queue reload did not preserve the completed job.',
    false,
    [health.adapter, health.detail, job.id],
  );
}

async function runObjectStoreDrill(tenantId: string, workDir: string): Promise<OperationalAcceptanceCheck> {
  const store = new FileSystemKnowledgeObjectStore(join(workDir, 'objects'));
  const key = `${tenantId}/operational-acceptance/${randomUUID()}.json`;
  const payload = JSON.stringify({ tenantId, acceptance: true, generatedAt: new Date().toISOString() });
  const stored = await store.put(key, payload, 'application/json');
  const read = await store.get(key);
  const matched = sha256(read) === stored.sha256 && new TextDecoder().decode(read) === payload;
  await store.delete(key);
  const health = await store.health();
  return check(
    'object-store-roundtrip',
    'object-storage',
    matched && health.ready ? 'passed' : 'failed',
    matched && health.ready
      ? 'An object was written, hash-verified, read, and deleted from the configured local acceptance store.'
      : 'The object-store roundtrip or hash verification failed.',
    false,
    [health.adapter, stored.sha256, stored.uri],
  );
}

function runTelemetryDrill(telemetry: TelemetryRuntime): OperationalAcceptanceCheck {
  const requestId = `acceptance-${randomUUID()}`;
  telemetry.beginRequest(requestId, 'POST', '/internal/rc10.78.1/acceptance');
  telemetry.endRequest(requestId, 204);
  const summary = telemetry.summary();
  const localOk = summary.requests > 0 && summary.queuedSpans > 0;
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  if (!localOk) return check('telemetry-capture', 'telemetry', 'failed', 'The telemetry runtime did not record the acceptance span.');
  return check(
    'telemetry-capture',
    'telemetry',
    'partial',
    endpoint
      ? 'Local telemetry capture passed. An external OTLP endpoint is configured but was not called by this bounded acceptance run.'
      : 'Local telemetry capture passed; external OTLP export is not configured.',
    false,
    [summary.serviceName, `queuedSpans=${summary.queuedSpans}`, endpoint ? 'otlp-configured-not-exercised' : 'otlp-not-configured'],
  );
}

async function runBillingDrill(tenantId: string): Promise<OperationalAcceptanceCheck> {
  const configuredSecret = process.env.AIW_BILLING_WEBHOOK_SECRET?.trim();
  const secret = configuredSecret || randomBytes(32).toString('hex');
  const boundary = new BillingBoundary(secret);
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()));
  const envelope: BillingEventEnvelope = {
    provider: 'acceptance-provider',
    eventId: `event-${randomUUID()}`,
    tenantId,
    eventType: 'subscription.updated',
    planId: 'architect',
    subscriptionStatus: 'active',
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: end.toISOString(),
    externalCustomerReference: 'customer-redacted-reference',
    externalSubscriptionReference: 'subscription-redacted-reference',
  };
  const signature = boundary.signatureFor(envelope);
  const first = boundary.process(envelope, signature, 'operational-acceptance');
  const replay = boundary.process(envelope, signature, 'operational-acceptance');
  const ok = first.receipt.signatureVerified && first.receipt.disposition === 'accepted' && replay.replayed;
  return check(
    'billing-boundary-signature-idempotency',
    'billing',
    ok ? (configuredSecret ? 'passed' : 'partial') : 'failed',
    ok
      ? configuredSecret
        ? 'Signed subscription-state event processing and idempotent replay passed with the configured webhook secret.'
        : 'Signed subscription-state event processing and idempotent replay passed with an ephemeral acceptance secret; deployment billing is not configured.'
      : 'Billing boundary signature or idempotency verification failed.',
    false,
    [first.receipt.payloadSha256, configuredSecret ? 'deployment-secret-present' : 'ephemeral-self-test-secret'],
  );
}

export async function runEnterpriseOperationalAcceptance(input: {
  tenantId: string;
  actor: string;
  persistence: SaasAdminPersistence;
  policy: TenantPolicy | null;
  telemetry?: TelemetryRuntime;
  environment?: string;
}): Promise<{ run: OperationalAcceptanceRun; backupRestore: BackupRestoreDrill }> {
  const startedAt = new Date().toISOString();
  const runId = `ops-${randomUUID()}`;
  const root = await mkdtemp(join(tmpdir(), 'aiw-rc10-78-1-'));
  const checks: OperationalAcceptanceCheck[] = [];
  try {
    const persistenceHealth = await input.persistence.health();
    checks.push(check(
      'saas-persistence-health',
      'database',
      persistenceHealth.ready ? (persistenceHealth.durable ? 'passed' : 'partial') : 'failed',
      persistenceHealth.detail,
      false,
      [persistenceHealth.adapter, `durable=${persistenceHealth.durable}`, `rlsCapable=${persistenceHealth.rlsCapable}`],
    ));

    const rls = await input.persistence.runRlsIsolationAcceptance();
    checks.push(check(
      'tenant-rls-isolation',
      'database',
      rls.passed ? (rls.productionProof ? 'passed' : 'partial') : 'failed',
      rls.passed
        ? `${rls.checks.length} tenant-isolation checks passed on the ${rls.adapter} adapter.`
        : `Tenant isolation acceptance failed on the ${rls.adapter} adapter.`,
      rls.productionProof,
      rls.checks.map((item) => `${item.id}:${item.ok}`),
    ));

    const providers = await input.persistence.listIdentityProviders({ tenantId: input.tenantId, platformAdmin: false });
    const mappings = await input.persistence.listRoleMappingRules({ tenantId: input.tenantId, platformAdmin: false });
    const identity = runEnterpriseIdentityAcceptance({ tenantId: input.tenantId, policy: input.policy, providers, mappingRules: mappings });
    const identityConfigured = providers.length > 0;
    checks.push(check(
      'enterprise-identity-contract',
      'identity',
      identityConfigured ? (identity.passed ? 'partial' : 'failed') : 'not-configured',
      identityConfigured
        ? identity.passed
          ? 'OIDC/SAML configuration, tenant policy, and role mappings passed local contract validation; no live IdP login was performed.'
          : 'Configured enterprise identity failed one or more contract checks.'
        : 'No tenant OIDC or SAML provider is configured.',
      false,
      identity.providers.flatMap((provider) => provider.checks.map((item) => `${provider.providerId}:${item.id}:${item.ok}`)),
    ));

    checks.push(await runQueueDrill(input.tenantId, root));
    checks.push(await runObjectStoreDrill(input.tenantId, root));
    checks.push(runTelemetryDrill(input.telemetry ?? new TelemetryRuntime('aiw-operational-acceptance')));
    const backup = await runBackupRestoreDrill({ tenantId: input.tenantId, actor: input.actor, persistence: input.persistence, workDir: root });
    checks.push(backup.check);
    checks.push(await runBillingDrill(input.tenantId));

    const completedAt = new Date().toISOString();
    const status: OperationalAcceptanceRun['status'] = checks.some((item) => item.status === 'failed')
      ? 'failed'
      : checks.some((item) => item.status === 'partial' || item.status === 'not-configured')
        ? 'partial'
        : 'passed';
    const evidenceSha256 = sha256(stable({ runId, tenantId: input.tenantId, startedAt, completedAt, status, checks }));
    const run: OperationalAcceptanceRun = {
      runId,
      tenantId: input.tenantId,
      environment: input.environment ?? process.env.AIW_DEPLOYMENT_MODE ?? 'reference',
      startedAt,
      completedAt,
      status,
      checks,
      evidenceSha256,
      productionProof: false,
      executedBy: input.actor,
    };
    await input.persistence.recordOperationalAcceptanceRun(run);
    return { run, backupRestore: backup.drill };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
