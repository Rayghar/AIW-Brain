import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { sampleProject } from '@aiw/domain';

const auth = { 'x-aiw-user-id': 'user-owner', 'x-aiw-roles': 'platform-admin' };

describe('Sprint 8.9.1 Solution Delivery Pack and Architecture Handoff API', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { process.env.AIW_ALLOW_DEV_AUTH = 'true'; app = await buildApp({ logger: false }); });
  afterEach(async () => { await app.close(); delete process.env.AIW_ALLOW_DEV_AUTH; });

  it('generates the governed solution delivery handoff pack from Review Studio output', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/review-studio/handoff-pack', headers: auth, payload: { project: sampleProject } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.reviewId).toBeTruthy();
    expect(body.bundle.files.some((file: { path: string }) => file.path === 'handoff/manifest.json')).toBe(true);
    expect(body.bundle.files.some((file: { path: string }) => file.path === 'handoff/solution-architecture-document.md')).toBe(true);
    expect(body.bundle.files.some((file: { path: string }) => file.path === 'handoff/adr-pack.md')).toBe(true);
    expect(body.bundle.files.some((file: { path: string }) => file.path === 'handoff/fitness-tests.json')).toBe(true);
  });

  it('streams a governed ZIP handoff pack with export metadata', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/review-studio/handoff-pack.zip', headers: auth, payload: { project: sampleProject } });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/zip');
    expect(response.headers['content-disposition']).toContain('aiw-solution-delivery-pack');
    expect(Number(response.headers['x-aiw-artifact-count'])).toBeGreaterThan(10);
    const body = response.rawPayload;
    expect(body[0]).toBe(0x50);
    expect(body[1]).toBe(0x4b);
  });
});
