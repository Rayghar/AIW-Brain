import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { sampleProject } from '@aiw/domain';
import { runArchitectureReview } from '@aiw/intelligence';
import knowledgeJson from '../../../apps/web/src/data/knowledge-library.json' with { type: 'json' };

const auth = { 'x-aiw-user-id': 'user-owner', 'x-aiw-roles': 'platform-admin' };

describe('Sprint 8.9.0 Intelligent Architecture Review and Decision Studio', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { process.env.AIW_ALLOW_DEV_AUTH = 'true'; app = await buildApp({ logger: false }); });
  afterEach(async () => { await app.close(); delete process.env.AIW_ALLOW_DEV_AUTH; });

  it('runs the canonical deterministic review engine with ADRs and fitness tests', () => {
    const review = runArchitectureReview(sampleProject, knowledgeJson as never);
    expect(review.pipeline).toContain('Canonical Architecture Model');
    expect(review.scorecard.length).toBe(8);
    expect(review.findings.length).toBeGreaterThan(0);
    expect(review.recommendations.length).toBeGreaterThan(0);
    expect(review.generatedAdrs.length).toBeGreaterThan(0);
    expect(review.fitnessTests.length).toBeGreaterThan(0);
    expect(review.authority.llmMayScore).toBe(false);
    expect(review.authority.llmMayMutateArchitecture).toBe(false);
    expect(review.authority.candidateKnowledgeMayInfluenceProduction).toBe(false);
    expect(review.authority.humanApprovalRequired).toBe(true);
  });

  it('exposes governed Review Studio API routes', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/review-studio/run', headers: auth, payload: { project: sampleProject } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.review.deliveryReadinessScore).toBeGreaterThanOrEqual(0);
    expect(body.review.scorecard.length).toBe(8);
    expect(body.review.pipeline).toContain('Generated ADRs');
  });

  it('generates proposed ADR decisions from review recommendations', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/review-studio/generated-adrs', headers: auth, payload: { project: sampleProject } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.decisions.length).toBeGreaterThan(0);
    expect(body.decisions.every((decision: { status: string }) => decision.status === 'proposed')).toBe(true);
  });
});
