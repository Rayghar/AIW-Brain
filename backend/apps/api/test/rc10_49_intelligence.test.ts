import { afterEach, describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';
import { MemoryKnowledgeOperationsRepository } from '../src/knowledgeOperationsRepository.js';

let app: Awaited<ReturnType<typeof buildApp>> | undefined;
afterEach(async () => { if (app) await app.close(); app = undefined; });

async function authenticated(repository: MemoryKnowledgeOperationsRepository) {
  app = await buildApp({ knowledgeOperationsRepository: repository });
  const tokenResponse = await app.inject({ method: 'POST', url: '/api/auth/development-token', payload: { subject: 'user-owner', email: 'owner@example.com', displayName: 'Owner', tenantId: sampleProject.tenantId } });
  return { authorization: `Bearer ${tokenResponse.json().token}` };
}

describe('rc.10.49 governed architecture-intelligence feedback APIs', () => {
  it('exposes a passing contextual benchmark report without claiming production acceptance', async () => {
    const repository = new MemoryKnowledgeOperationsRepository();
    const headers = await authenticated(repository);
    const response = await app!.inject({ method: 'GET', url: '/api/intelligence/benchmarks', headers });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.total).toBeGreaterThanOrEqual(7);
    expect(body.passed).toBe(body.total);
    expect(body.score).toBe(100);
    expect(body.productionAcceptanceClaimed).toBe(false);
  });

  it('captures tenant-scoped outcomes and keeps auto-learning disabled', async () => {
    const repository = new MemoryKnowledgeOperationsRepository();
    const headers = await authenticated(repository);
    const created = await app!.inject({
      method: 'POST', url: '/api/intelligence/outcomes', headers,
      payload: {
        projectId: sampleProject.id,
        recommendationId: 'rec-modular-monolith',
        recommendationType: 'style',
        recordId: 'STYLE-MODULAR-MONOLITH',
        stage: 'logicalApplication',
        decision: 'accepted',
        reason: 'The context supports a reversible evolutionary first state.',
        knowledgeReleaseId: 'AKR-0.10.60',
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().autoLearningApplied).toBe(false);
    expect(repository.recommendationOutcomes).toHaveLength(1);

    const listed = await app!.inject({ method: 'GET', url: '/api/intelligence/outcomes?recordId=STYLE-MODULAR-MONOLITH', headers });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().outcomes).toHaveLength(1);
    expect(listed.json().autoLearningApplied).toBe(false);
  });

  it('returns a review-only calibration proposal', async () => {
    const repository = new MemoryKnowledgeOperationsRepository();
    const headers = await authenticated(repository);
    for (let index = 0; index < 5; index += 1) {
      const response = await app!.inject({
        method: 'POST', url: '/api/intelligence/outcomes', headers,
        payload: {
          projectId: `${sampleProject.id}-${index}`,
          recommendationId: `rec-serverless-${index}`,
          recommendationType: 'style',
          recordId: 'STYLE-SERVERLESS',
          stage: 'logicalTechnology',
          decision: index < 4 ? 'rejected' : 'deferred',
          reason: 'Sovereignty and portability constraints were not sufficiently represented.',
          knowledgeReleaseId: 'AKR-0.10.60',
        },
      });
      expect(response.statusCode).toBe(201);
    }
    const response = await app!.inject({ method: 'GET', url: '/api/intelligence/calibration-proposal?recordId=STYLE-SERVERLESS', headers });
    expect(response.statusCode).toBe(200);
    const proposal = response.json();
    expect(proposal.minimumSampleMet).toBe(true);
    expect(proposal.requiresIndependentExpertReview).toBe(true);
    expect(proposal.productionScoringChanged).toBe(false);
    expect(proposal.proposedAdjustments.length).toBeGreaterThan(0);
  });
});
