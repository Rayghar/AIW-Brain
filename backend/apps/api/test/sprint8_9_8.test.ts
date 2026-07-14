import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

const auth = { 'x-aiw-user-id': 'user-owner', 'x-aiw-roles': 'platform-admin' };

describe('Sprint 8.9.8 Live provider binding, KMS runbooks and .aiw-kpack UX', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { process.env.AIW_ALLOW_DEV_AUTH = 'true'; app = await buildApp({ logger: false }); });
  afterEach(async () => { await app.close(); delete process.env.AIW_ALLOW_DEV_AUTH; });

  it('creates a read-only provider fetch plan behind connector policy', async () => {
    const connector = await app.inject({ method: 'POST', url: '/api/admin/repository-connectors', headers: auth, payload: { id: 'repo-provider-bound', provider: 'github', repositoryUrl: 'https://github.com/example/aiw-docs', allowedPaths: ['docs/architecture', 'adr', 'openapi'], evidenceKinds: ['docs', 'adr', 'openapi'] } });
    expect(connector.statusCode).toBe(200);
    const plan = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/provider-bindings/repository/fetch-plan', headers: auth, payload: { connectorId: 'repo-provider-bound', tokenRef: 'AIW_GITHUB_TOKEN', allowLiveNetwork: true } });
    expect(plan.statusCode).toBe(200);
    expect(plan.json().plan.safety.readOnly).toBe(true);
    expect(plan.json().plan.safety.outputGoesToQuarantine).toBe(true);
    expect(plan.json().plan.mode).toBe('read-only-live');
  });

  it('creates a KMS provider guide that never stores key material', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/provider-bindings/kms/guide', headers: auth, payload: { provider: 'hashicorp-vault', keyRef: 'vault/transit/aiw-kpack' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().guide.safety.keyMaterialNeverStored).toBe(true);
    expect(response.json().guide.zeroEgressPosture).toBe('supported');
  });

  it('exports and verifies a portable .aiw-kpack envelope', async () => {
    const exported = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/knowledge-pack/export', headers: auth, payload: { releaseId: 'akr-kpack-released' } });
    const kpack = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/aiw-kpack/export', headers: auth, payload: { manifest: exported.json().manifest, tenantId: 'tenant-reference' } });
    expect(kpack.statusCode).toBe(200);
    expect(kpack.headers['content-type']).toContain('application/vnd.aiw.knowledge-pack+json');
    expect(kpack.json().fileName).toContain('.aiw-kpack');
    const imported = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/aiw-kpack/import', headers: auth, payload: { envelope: kpack.json(), tenantId: 'tenant-reference' } });
    expect(imported.statusCode).toBe(200);
    expect(imported.json().result.status).toBe('accepted');
    expect(imported.json().result.activationPreview.checks.every((check: { ok: boolean }) => check.ok)).toBe(true);
  });

  it('surfaces a tenant/project release activation screen model', async () => {
    const exported = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/knowledge-pack/export', headers: auth, payload: { releaseId: 'akr-screen-released' } });
    const activation = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/knowledge-pack/activate', headers: auth, payload: { manifest: exported.json().manifest, tenantId: 'tenant-reference', projectId: 'project-screen' } });
    expect(activation.statusCode).toBe(200);
    await app.inject({ method: 'POST', url: '/api/admin/mind-factory/persistence/pin-activation', headers: auth, payload: { backend: 'postgres' } });
    const screen = await app.inject({ method: 'GET', url: '/api/admin/mind-factory/release-activation-screen', headers: auth });
    expect(screen.statusCode).toBe(200);
    expect(screen.json().screen.actions).toContain('export-aiw-kpack');
    expect(screen.json().screen.safeguards).toContain('unsigned packs cannot activate');
  });
});
