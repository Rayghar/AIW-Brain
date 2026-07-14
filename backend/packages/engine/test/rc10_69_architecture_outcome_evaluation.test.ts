import { describe, expect, it } from 'vitest';
import { samplePortfolioProjects } from '@aiw/domain';
import { buildArchitectureOutcomeScenarios, runArchitectureOutcomeBenchmark } from '../src/architectureOutcomeEvaluation.js';

describe('rc.10.69 architecture outcome evaluation', () => {
  it('builds seven reproducible scenarios and three explicitly classified comparison modes', () => {
    const scenarios = buildArchitectureOutcomeScenarios(samplePortfolioProjects);
    expect(scenarios).toHaveLength(7);
    expect(new Set(scenarios.map((scenario) => scenario.kind)).size).toBe(7);

    const report = runArchitectureOutcomeBenchmark({
      projects: samplePortfolioProjects,
      knowledgeReleaseId: 'AKR-0.10.69-REFERENCE',
      grammarVersion: 'living-canvas-grammar-0.10.69',
      patternDnaVersion: 'pattern-dna-2.0-pilot-core',
      providerPolicyVersion: 'governed-co-creation-0.10.69',
    });

    expect(report.scenarios).toHaveLength(7);
    for (const scenario of report.scenarios) {
      expect(scenario.modeResults.map((mode) => mode.mode)).toEqual([
        'conventional-baseline',
        'deterministic-aiw',
        'governed-llm-aiw',
      ]);
      expect(scenario.modeResults[0]?.evidenceClass).toBe('reference-estimate');
      expect(scenario.modeResults[1]?.evidenceClass).toBe('system-evaluated');
      expect(scenario.modeResults[2]?.evidenceClass).toBe('system-evaluated');
      expect(scenario.lifecycleCoverage.length).toBeGreaterThan(0);
    }
    expect(report.expertReviewPack.anonymizedVariantIds).toHaveLength(21);
    expect(report.expertReviewPack.rubric).toHaveLength(12);
  });

  it('does not let governed LLM explanation claim a correctness uplift beyond deterministic authority', () => {
    const report = runArchitectureOutcomeBenchmark({ projects: samplePortfolioProjects });
    for (const scenario of report.scenarios) {
      const deterministic = scenario.modeResults.find((mode) => mode.mode === 'deterministic-aiw')!;
      const governed = scenario.modeResults.find((mode) => mode.mode === 'governed-llm-aiw')!;
      for (const dimension of ['architecture-correctness', 'security', 'resilience'] as const) {
        const deterministicScore = deterministic.dimensionScores.find((item) => item.dimension === dimension)!.score;
        const governedScore = governed.dimensionScores.find((item) => item.dimension === dimension)!.score;
        expect(governedScore).toBeLessThanOrEqual(deterministicScore);
      }
    }
  });

  it('preserves the honesty and governance boundary required before expert and enterprise pilot claims', () => {
    const report = runArchitectureOutcomeBenchmark({ projects: samplePortfolioProjects });
    expect(report.governance).toMatchObject({
      productionAcceptanceClaimed: false,
      humanExpertValidationCompleted: false,
      conventionalBaselineMeasuredWithHumanParticipants: false,
      llmHasCanonicalMutationAuthority: false,
      candidateKnowledgeCanScore: false,
      deterministicFallbackRequired: true,
    });
    expect(report.governance.boundary).toMatch(/independent expert scoring/i);
    expect(report.navigationUx.unresolvedBlockers).toBe(0);
    expect(report.navigationUx.testedViewports).toEqual(expect.arrayContaining(['1600x900', '1366x768', '1100x760']));
  });
});
