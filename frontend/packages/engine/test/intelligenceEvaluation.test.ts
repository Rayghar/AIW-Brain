import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { KnowledgeLibrary } from '@aiw/domain';
import {
  buildGovernedCalibrationProposal,
  createRecommendationOutcome,
  runArchitectureIntelligenceBenchmarkSuite,
} from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const library = JSON.parse(
  readFileSync(resolve(here, '../../../data/knowledge-library.json'), 'utf8'),
) as KnowledgeLibrary;

describe('rc.10.50 architecture-intelligence evaluation', () => {
  it('passes the contextual benchmark suite without claiming production acceptance', () => {
    const report = runArchitectureIntelligenceBenchmarkSuite(library);
    expect(report.total).toBeGreaterThanOrEqual(12);
    expect(report.passed).toBe(report.total);
    expect(report.score).toBe(100);
    expect(report.productionAcceptanceClaimed).toBe(false);
    expect(report.results.every((item) => item.evidence && Object.keys(item.evidence).length > 0)).toBe(true);
  });

  it('captures recommendation outcomes without uncontrolled self-learning', () => {
    const outcome = createRecommendationOutcome({
      projectId: 'project-banking-payments',
      recommendationId: 'rec-style-modular-monolith',
      recommendationType: 'style',
      recordId: 'STYLE-MODULAR-MONOLITH',
      stage: 'logicalApplication',
      decision: 'accepted',
      reason: 'The transition plan and current operational maturity favour a reversible first state.',
      decidedBy: 'architecture-reviewer',
      knowledgeReleaseId: library.version,
    });
    expect(outcome.id).toMatch(/^outcome-/);
    expect(outcome.autoLearningApplied).toBe(false);
  });

  it('generates review-only calibration proposals and never mutates production scoring', () => {
    const outcomes = Array.from({ length: 5 }, (_, index) => createRecommendationOutcome({
      projectId: `project-${index}`,
      recommendationId: `rec-${index}`,
      recommendationType: 'style',
      recordId: 'STYLE-SERVERLESS',
      stage: 'logicalTechnology',
      decision: index < 4 ? 'rejected' : 'deferred',
      reason: 'Sovereignty, portability and vendor concentration were not sufficiently represented.',
      decidedBy: 'independent-reviewer',
      knowledgeReleaseId: library.version,
    }));
    const proposal = buildGovernedCalibrationProposal(outcomes, 'STYLE-SERVERLESS');
    expect(proposal.minimumSampleMet).toBe(true);
    expect(proposal.proposedAdjustments.length).toBeGreaterThan(0);
    expect(proposal.requiresIndependentExpertReview).toBe(true);
    expect(proposal.productionScoringChanged).toBe(false);
    expect(proposal.status).toBe('draft');
  });
});
