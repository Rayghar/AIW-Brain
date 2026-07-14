import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { sampleProject } from '@aiw/domain';

const auth = { authorization: 'Bearer dev:user-owner:owner:tenant-reference' };

describe('Sprint 8.7.3 realization and continuous conformance API', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { app = await buildApp({ logger: false }); });
  afterEach(async () => { await app.close(); });

  it('publishes the 8.7.3 release boundary', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/releases/8.7.3', headers: auth });
    expect(response.statusCode).toBe(200);
    expect(response.json().version).toBe('0.10.0-alpha.3');
    expect(response.json().capabilities.visualConformanceGraph).toBe(true);
  });

  it('generates a project-scoped conformance plan', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/conformance/plan', headers: auth, payload: { project: sampleProject, patternIds: ['PAT-BOUNDED-CONTEXT'] } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.plan.controls.length).toBeGreaterThan(0);
    expect(body.plan.artifacts.every((item: { reviewRequired: boolean }) => item.reviewRequired)).toBe(true);
  });

  it('keeps controls unverified until matching evidence is supplied', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/conformance/assess', headers: auth, payload: { project: sampleProject, patternIds: ['PAT-BOUNDED-CONTEXT'], evidence: [] } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.assessment.summary.unverified).toBeGreaterThan(0);
    expect(body.assessment.gate.passed).toBe(false);
    expect(body.visualModel.nodes.some((item: { kind: string }) => item.kind === 'control')).toBe(true);
  });

  it('returns remediation only as a human-approved preview', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/conformance/remediation-preview', headers: auth, payload: { project: sampleProject, patternIds: ['PAT-BOUNDED-CONTEXT'] } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.reviewRequired).toBe(true);
    expect(body.automaticMutationApplied).toBe(false);
    expect(body.changeSet.humanApprovalRequired).toBe(true);
  });
});
