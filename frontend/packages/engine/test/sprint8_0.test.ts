import { describe, expect, it } from 'vitest';
import { sampleProject, sprint80DefaultSimulationScenarios } from '@aiw/domain';
import {
  applyArchitectureAlternative,
  assessArchitectureDesignBrief,
  compareArchitectureAlternatives,
  createSynthesisDecisionPackage,
  runArchitectureSimulationSuite,
  simulateArchitectureAlternative,
  synthesizeArchitectureAlternatives,
} from '../src/index.js';

describe('Sprint 8.0 architecture synthesis and simulation', () => {
  it('assesses design-brief completeness without hiding missing evidence', () => {
    const incomplete = structuredClone(sampleProject);
    incomplete.objectives = [];
    incomplete.qualityPriorities = [];
    const assessment = assessArchitectureDesignBrief(incomplete);
    expect(assessment.synthesisReady).toBe(false);
    expect(assessment.gaps.some((item) => item.severity === 'blocking')).toBe(true);
    expect(assessment.clarificationQuestions.length).toBeGreaterThan(0);
  });

  it('detects contradictions between regional survivability and single-region constraints', () => {
    const project = structuredClone(sampleProject);
    project.constraints = ['Deploy in a single region only', 'The platform must survive complete regional failure with zero downtime'];
    const assessment = assessArchitectureDesignBrief(project);
    expect(assessment.contradictions.some((item) => item.id === 'CONTRA-REGION-AVAILABILITY')).toBe(true);
    expect(assessment.synthesisReady).toBe(false);
  });

  it('generates diverse governed alternatives and identifies a Pareto frontier', () => {
    const run = synthesizeArchitectureAlternatives({ project: sampleProject, strategyIds: ['balanced','simplicity-first','resilience-first','security-first','cost-first'], maxAlternatives: 5, requireDiversity: true });
    expect(run.alternatives.length).toBeGreaterThanOrEqual(2);
    expect(new Set(run.alternatives.map((item) => item.strategyId)).size).toBe(run.alternatives.length);
    expect(run.alternatives.every((item) => item.patternIds.length > 0)).toBe(true);
    expect(run.alternatives.every((item) => item.compositionPlan.eligible)).toBe(true);
    expect(run.paretoAlternativeIds.length).toBeGreaterThan(0);
    expect(run.recommendedAlternativeId).toBeTruthy();
    const comparison = compareArchitectureAlternatives(run.alternatives);
    expect(comparison.alternativeIds).toHaveLength(run.alternatives.length);
    expect(comparison.winnerByDimension.overall).toBeTruthy();
  });

  it('keeps strategy postures semantically distinct and excludes anti-patterns', () => {
    const run = synthesizeArchitectureAlternatives({ project: sampleProject, strategyIds: ['simplicity-first','resilience-first','security-first','cost-first'], maxAlternatives: 4, requireDiversity: true });
    const byStrategy = Object.fromEntries(run.alternatives.map((item) => [item.strategyId, item.patternIds]));
    expect(byStrategy['simplicity-first']).toContain('PAT-MODULAR-MONOLITH');
    expect(byStrategy['resilience-first']).toContain('PAT-CIRCUIT-BREAKER');
    expect(byStrategy['security-first']).toContain('PAT-ZERO-TRUST');
    expect(byStrategy['cost-first']).toContain('PAT-SERVERLESS-ARCHITECTURE');
    expect(run.alternatives.flatMap((item) => item.patternIds).some((id) => id.startsWith('ANTI-'))).toBe(false);
  });

  it('runs deterministic stress simulations with stable identifiers and explicit limitations', () => {
    const run = synthesizeArchitectureAlternatives({ project: sampleProject, strategyIds: ['balanced','resilience-first','simplicity-first'] });
    const alternative = run.alternatives[0]!;
    const scenario = sprint80DefaultSimulationScenarios.find((item) => item.id === 'SIM-REGION-FAILURE')!;
    const first = simulateArchitectureAlternative(run, alternative.id, scenario);
    const second = simulateArchitectureAlternative(run, alternative.id, scenario);
    expect(first.id).toBe(second.id);
    expect(first.outcome.availabilityPercent).toBe(second.outcome.availabilityPercent);
    expect(first.assumptions.some((item) => item.includes('not a capacity guarantee'))).toBe(true);
    expect(first.findings.length).toBeGreaterThan(0);
  });

  it('applies an alternative to the canonical model and records a reviewable decision', () => {
    const run = synthesizeArchitectureAlternatives({ project: sampleProject, strategyIds: ['balanced','resilience-first'] });
    const alternative = run.alternatives[0]!;
    const applied = applyArchitectureAlternative(sampleProject, alternative, 'accepted');
    expect(applied.revision).toBeGreaterThan(sampleProject.revision);
    expect(applied.patternSelections.some((item) => alternative.patternIds.includes(item.patternId) && item.status === 'accepted')).toBe(true);
    expect(applied.decisions.at(-1)?.linkedRecordIds).toEqual(alternative.patternIds);
  });

  it('creates a complete decision and conformance handoff package', () => {
    const run = synthesizeArchitectureAlternatives({ project: sampleProject, strategyIds: ['balanced','security-first','cost-first'] });
    const alternative = run.alternatives[0]!;
    const simulations = runArchitectureSimulationSuite(run, alternative.id, sprint80DefaultSimulationScenarios.slice(0, 3));
    const decision = createSynthesisDecisionPackage(run, alternative.id, simulations, 'Governed test decision.', false);
    expect(decision.selectedPatternIds).toEqual(alternative.patternIds);
    expect(decision.simulationResultIds).toHaveLength(3);
    expect(decision.artifactPaths).toContain('architecture/calm.json');
    expect(decision.conformanceTargets.length).toBeGreaterThan(0);
  });
});
