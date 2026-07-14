import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

const auth = { 'x-aiw-user-id': 'user-owner', 'x-aiw-roles': 'platform-admin' };

describe('Sprint 8.9.7 Production Mind Factory persistence, KMS signing and repository execution', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { process.env.AIW_ALLOW_DEV_AUTH = 'true'; app = await buildApp({ logger: false }); });
  afterEach(async () => { await app.close(); delete process.env.AIW_ALLOW_DEV_AUTH; });

  it('surfaces a Postgres/RLS persistence plan and persists tenant-scoped activation records', async () => {
    const plan = await app.inject({ method: 'GET', url: '/api/admin/mind-factory/persistence', headers: auth });
    expect(plan.statusCode).toBe(200);
    expect(plan.json().plan.backend).toBe('postgres');
    expect(plan.json().plan.tables.every((table: { rlsRequired: boolean }) => table.rlsRequired)).toBe(true);

    const exported = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/knowledge-pack/export', headers: auth, payload: { releaseId: 'akr-prod-released' } });
    const manifest = exported.json().manifest;
    const activation = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/knowledge-pack/activate', headers: auth, payload: { manifest, tenantId: 'tenant-reference', projectId: 'project-a' } });
    expect(activation.statusCode).toBe(200);
    const persisted = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/persistence/pin-activation', headers: auth, payload: { backend: 'postgres' } });
    expect(persisted.statusCode).toBe(200);
    expect(persisted.json().record.tenantId).toBe('tenant-reference');
    expect(persisted.json().record.rlsPartitionKey).toBe('tenant-reference:project-a');
  });

  it('KMS-signs a knowledge pack with an attested key reference before activation', async () => {
    const exported = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/knowledge-pack/export', headers: auth, payload: { releaseId: 'akr-kms-released' } });
    const signed = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/kms/sign', headers: auth, payload: { manifest: exported.json().manifest, provider: 'reference-local', keyRef: 'aiw/reference/key-1' } });
    expect(signed.statusCode).toBe(200);
    expect(signed.json().manifest.signature.algorithm).toBe('kms-attested-sha256-manifest');
    expect(signed.json().signature.verification.humanPromotionRequired).toBe(true);
    const activation = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/knowledge-pack/activate', headers: auth, payload: { manifest: signed.json().manifest, tenantId: 'tenant-reference' } });
    expect(activation.statusCode).toBe(200);
    expect(activation.json().result.releaseId).toBe('akr-kms-released');
  });

  it('executes repository source refresh only through read-only connector policy and quarantines the snapshot', async () => {
    const connector = await app.inject({ method: 'POST', url: '/api/admin/repository-connectors', headers: auth, payload: { id: 'repo-aiw-docs', provider: 'github', repositoryUrl: 'https://github.com/example/aiw-docs', allowedPaths: ['docs/architecture', 'adr', 'openapi'], evidenceKinds: ['docs', 'adr', 'openapi'] } });
    expect(connector.statusCode).toBe(200);
    const refresh = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/repository-sources/repo-aiw-docs/execute-refresh', headers: auth, payload: { commitSha: 'abc1234', licence: 'approved-reference' } });
    expect(refresh.statusCode).toBe(200);
    expect(refresh.json().execution.status).toBe('completed');
    expect(refresh.json().execution.doctrine.repositoryWritesDisabled).toBe(true);
    expect(refresh.json().execution.snapshot.status).toBe('quarantined');
    const summary = await app.inject({ method: 'GET', url: '/api/admin/mind-factory', headers: auth });
    expect(summary.json().counts.repositoryExecutions).toBeGreaterThan(0);
    expect(summary.json().counts.snapshots).toBeGreaterThan(0);
  });

  it('executes the next queued Mind Factory job as a governed dry-run without unsafe side effects', async () => {
    const queued = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/jobs/source-refresh', headers: auth, payload: { sourceId: 'source-reference' } });
    expect(queued.statusCode).toBe(200);
    const executed = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/jobs/execute-next', headers: auth });
    expect(executed.statusCode).toBe(200);
    expect(executed.json().execution.unsafeSideEffects).toBe(false);
    expect(executed.json().job.status).toBe('completed');
  });
});
