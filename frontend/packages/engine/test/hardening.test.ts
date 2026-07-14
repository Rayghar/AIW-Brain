import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sampleProject, sprint78PatternCorpus, sprint80DefaultSimulationScenarios, type KnowledgeLibrary, type SimulationCalibrationProfile } from '@aiw/domain';
import { assessKnowledgeCorpusDepth, assessKnowledgeRecordDepth, selectRelevantKnowledge, simulateArchitectureAlternative, synthesizeArchitectureAlternatives } from '../src/index.js';

const loadLibrary = (): KnowledgeLibrary => JSON.parse(readFileSync(new URL('../../../data/knowledge-library.json', import.meta.url), 'utf8')) as KnowledgeLibrary;

describe('v0.9.7 hardening and trust controls', () => {
  it('distinguishes deep editorial knowledge from generic normalized boilerplate', () => {
    const deep = sprint78PatternCorpus.find((record) => record.id === 'PAT-TRANSACTIONAL-OUTBOX');
    expect(deep).toBeTruthy();
    const generic = structuredClone(deep!);
    generic.id = 'PAT-GENERIC-TEST';
    generic.name = 'Generic Test Pattern';
    generic.summary = 'Normalized as an AIW pattern record.';
    generic.problem = 'Address architecture forces for a generic concern.';
    generic.context = ['Use when applicable.'];
    generic.forces = ['Delivery speed versus long-term maintainability.'];
    generic.applicabilityRules = ['Evaluate against project constraints.'];
    generic.exclusions = ['Misapplying the pattern creates risk.'];
    generic.prerequisites = ['Use an architecture decision record.'];
    generic.risks = ['Misapplying the pattern.'];
    generic.mitigations = ['Use an architecture decision record.'];
    generic.obligations = [];
    generic.qualityImpacts = [];
    generic.topology = undefined;
    generic.conformanceRules = [];
    const deepAssessment = assessKnowledgeRecordDepth(deep!);
    const genericAssessment = assessKnowledgeRecordDepth(generic);
    expect(deepAssessment.score).toBeGreaterThan(genericAssessment.score);
    expect(genericAssessment.grade).toBe('needs-enrichment');
  });

  it('keeps enrichment-grade records out of unanchored production retrieval', () => {
    const library = loadLibrary();
    const result = selectRelevantKnowledge(sampleProject, library, 30);
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.records.every((record) => record.depthGrade !== 'needs-enrichment')).toBe(true);
  });

  it('publishes corpus depth as an explicit editorial portfolio', () => {
    const portfolio = assessKnowledgeCorpusDepth(sprint78PatternCorpus);
    expect(portfolio.recordCount).toBe(sprint78PatternCorpus.length);
    expect(portfolio.productionDeep + portfolio.productionSupporting + portfolio.needsEnrichment).toBe(portfolio.recordCount);
    expect(portfolio.assessments[0]?.score).toBeLessThanOrEqual(portfolio.assessments.at(-1)?.score ?? 100);
  });

  it('only applies empirical simulation evidence after approval', () => {
    const run = synthesizeArchitectureAlternatives({ project: sampleProject, strategyIds: ['balanced'] });
    const alternative = run.alternatives[0]!;
    const scenario = sprint80DefaultSimulationScenarios.find((item) => item.type === 'baseline')!;
    const profile: SimulationCalibrationProfile = {
      id: 'CAL-TEST-001',
      projectId: sampleProject.id,
      alternativeId: alternative.id,
      createdAt: new Date().toISOString(),
      createdBy: 'test-reviewer',
      status: 'draft',
      evidence: [{
        id: 'EVID-LOAD-001',
        sourceType: 'load-test',
        sourceName: 'Reference workload test',
        measuredAt: new Date().toISOString(),
        environment: 'staging',
        scenarioType: 'baseline',
        confidence: 90,
        outcome: { p95LatencyMs: 800 },
        notes: ['Synthetic test evidence for lifecycle enforcement.'],
      }],
    };
    const defaultResult = simulateArchitectureAlternative(run, alternative.id, scenario);
    const draftResult = simulateArchitectureAlternative(run, alternative.id, scenario, profile);
    expect(draftResult.calibrationMode).toBe('default-comparative');
    expect(draftResult.outcome.p95LatencyMs).toBe(defaultResult.outcome.p95LatencyMs);
    profile.status = 'approved';
    const approvedResult = simulateArchitectureAlternative(run, alternative.id, scenario, profile);
    expect(approvedResult.calibrationMode).toBe('evidence-adjusted');
    expect(approvedResult.calibrationEvidenceIds).toContain('EVID-LOAD-001');
    expect(approvedResult.outcome.p95LatencyMs).not.toBe(defaultResult.outcome.p95LatencyMs);
  });
});
