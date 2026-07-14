import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

const auth = { 'x-aiw-user-id': 'user-owner', 'x-aiw-roles': 'platform-admin' };

describe('Sprint 8.9.5 Mind Administration and Knowledge Ingestion Factory', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { process.env.AIW_ALLOW_DEV_AUTH = 'true'; app = await buildApp({ logger: false }); });
  afterEach(async () => { await app.close(); delete process.env.AIW_ALLOW_DEV_AUTH; });

  it('captures a quarantined source snapshot and extracts non-scoring candidate claims', async () => {
    const snapshotResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/mind-factory/sources/cambridge-sdd/snapshot',
      headers: auth,
      payload: { sourceTitle: 'Cambridge SDD Reasoning Grammar', sourceType: 'document', license: 'approved-internal-reference', provenanceUrl: 'file://cambridge', content: 'Adapter Facade modifiability performance SDD driver decision trade-off' },
    });
    expect(snapshotResponse.statusCode).toBe(200);
    const snapshotBody = snapshotResponse.json();
    expect(snapshotBody.snapshot.status).toBe('quarantined');
    const extractResponse = await app.inject({ method: 'POST', url: `/api/admin/mind-factory/snapshots/${snapshotBody.snapshot.snapshotId}/extract-claims`, headers: auth, payload: { content: 'Adapter Facade modifiability performance SDD driver decision trade-off' } });
    expect(extractResponse.statusCode).toBe(200);
    const extractBody = extractResponse.json();
    expect(extractBody.claims.length).toBeGreaterThan(3);
    expect(extractBody.claims.every((claim: { nonScoring: boolean; reviewerRequired: boolean }) => claim.nonScoring === true && claim.reviewerRequired === true)).toBe(true);
  });

  it('normalizes candidate claims and generates release impact preview before promotion', async () => {
    const snapshotResponse = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/sources/pattern-source/snapshot', headers: auth, payload: { sourceTitle: 'Adapter Pattern and Performance Tactics', sourceType: 'document', license: 'approved-internal-reference', provenanceUrl: 'file://patterns', content: 'Adapter pattern performance tactics' } });
    const snapshot = snapshotResponse.json().snapshot;
    await app.inject({ method: 'POST', url: `/api/admin/mind-factory/snapshots/${snapshot.snapshotId}/extract-claims`, headers: auth, payload: { content: 'Adapter pattern performance tactics' } });
    const normalize = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/claims/normalize', headers: auth, payload: {} });
    expect(normalize.statusCode).toBe(200);
    expect(normalize.json().result.normalizedClaims.length).toBeGreaterThan(0);
    const preview = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/release-impact-preview', headers: auth, payload: { baseReleaseId: 'akr-1', candidateReleaseId: 'akr-2' } });
    expect(preview.statusCode).toBe(200);
    const body = preview.json();
    expect(body.preview.affectedStages.length).toBeGreaterThan(0);
    expect(body.authority).toContain('preview-only');
  });

  it('exports and validates a signed reference knowledge pack manifest', async () => {
    const exported = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/knowledge-pack/export', headers: auth, payload: { releaseId: 'akr-released' } });
    expect(exported.statusCode).toBe(200);
    const manifest = exported.json().manifest;
    expect(manifest.signature.value).toBeTruthy();
    expect(manifest.provenance.candidateKnowledgeInfluence).toBe('blocked-until-promotion');
    const imported = await app.inject({ method: 'POST', url: '/api/admin/mind-factory/knowledge-pack/import', headers: auth, payload: { manifest } });
    expect(imported.statusCode).toBe(200);
    expect(imported.json().result.status).toBe('accepted');
  });

  it('surfaces stage-to-knowledge traceability for the admin panel', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/admin/mind-factory/stage-traceability', headers: auth });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.traceability.some((stage: { stageId: string; knowledgeInputs: string[] }) => stage.stageId === 'review-studio' && stage.knowledgeInputs.length > 0)).toBe(true);
    expect(body.traceability.some((stage: { stageId: string; offlineAvailable: boolean }) => stage.stageId === 'repository-conformance' && stage.offlineAvailable === false)).toBe(true);
  });
});
