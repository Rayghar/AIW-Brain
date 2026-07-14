import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

const auth = { 'x-aiw-user-id': 'user-owner', 'x-aiw-roles': 'platform-admin' };

describe('Sprint 8.9.6 Mind Factory UI, Worker Orchestration and Signed-Pack Activation', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { process.env.AIW_ALLOW_DEV_AUTH = 'true'; app = await buildApp({ logger: false }); });
  afterEach(async () => { await app.close(); delete process.env.AIW_ALLOW_DEV_AUTH; });

  it('queues governed Mind Factory worker plans without executing unsafe side effects', async () => {
    const sourceJob = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/jobs/source-refresh', headers: auth, payload: { sourceId: 'cambridge-reference' } });
    expect(sourceJob.statusCode).toBe(200);
    expect(sourceJob.json().job.operation).toBe('source-refresh');
    expect(sourceJob.json().job.doctrine.candidateKnowledgeNonScoring).toBe(true);

    const claimJob = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/jobs/claim-extraction', headers: auth, payload: { snapshotId: 'snap-reference' } });
    expect(claimJob.statusCode).toBe(200);
    expect(claimJob.json().job.operation).toBe('claim-extraction');
    expect(claimJob.json().authority.humanReviewRequired).toBe(true);
  });

  it('activates a signed knowledge pack only after manifest verification', async () => {
    const exported = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/knowledge-pack/export', headers: auth, payload: { releaseId: 'akr-pilot-released' } });
    expect(exported.statusCode).toBe(200);
    const manifest = exported.json().manifest;
    const activation = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/knowledge-pack/activate', headers: auth, payload: { manifest, tenantId: 'tenant-reference', activationMode: 'enterprise-tenant' } });
    expect(activation.statusCode).toBe(200);
    const body = activation.json();
    expect(body.result.releaseId).toBe('akr-pilot-released');
    expect(body.result.pinned).toBe(true);
    expect(body.result.checks.every((check: { ok: boolean }) => check.ok)).toBe(true);
  });

  it('rejects malformed knowledge-pack activation attempts', async () => {
    const activation = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/knowledge-pack/activate', headers: auth, payload: { manifest: { releaseId: 'akr-bad' }, tenantId: 'tenant-reference' } });
    expect(activation.statusCode).toBe(400);
    expect(activation.json().result.status).toBe('rejected');
  });

  it('surfaces the Mind Factory summary and audit timeline for the Admin UI', async () => {
    await app.inject({ method: 'POST', url: '/api/admin/mind-factory/jobs/source-refresh', headers: auth, payload: { sourceId: 'source-a' } });
    const summary = await app.inject({ method: 'GET', url: '/api/admin/mind-factory', headers: auth });
    expect(summary.statusCode).toBe(200);
    expect(summary.json().counts.workerJobs).toBeGreaterThan(0);
    expect(summary.json().timeline.some((event: { phase: string }) => event.phase === 'worker')).toBe(true);
    const timeline = await app.inject({ method: 'GET', url: '/api/admin/mind-factory/audit-timeline', headers: auth });
    expect(timeline.statusCode).toBe(200);
    expect(timeline.json().timeline.length).toBeGreaterThan(0);
  });
});
