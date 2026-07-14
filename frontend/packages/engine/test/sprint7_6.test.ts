import { describe, expect, it } from 'vitest';
import { sampleProject, type KnowledgeLibrary } from '@aiw/domain';
import { assessDesignLibraryIntegrity, detectArchitectureAntiPatterns, nextArchitectureQuestions } from '../src/index.js';

const library: KnowledgeLibrary = {
  libraryId: 'integrity-test', version: '0.8.6', status: 'draft', generatedAt: '2026-07-02', disclaimer: '',
  qualityAttributes: [], viewpoints: [], rulePacks: [], evidence: [],
  architectureStyles: [{
    id: 'STYLE-MODULAR-MONOLITH', name: 'Modular Monolith', recordType: 'architectureStyle', status: 'draft', applicableStages: ['logicalApplication'],
    qualityAttributeRatings: { simplicity: 5, modifiability: 4 }, whenToConsider: ['Small teams and cohesive domain boundaries.'], whenToAvoidOrQuestion: ['Independent scaling is already proven.'],
    requires: [], recommends: [], tensions: [], obligations: ['Maintain module boundaries'], evidence: ['EVID-INTERNAL-ARCH-PRINCIPLES'], owner: 'Council', version: '1.0.0', calibrationNote: '',
  }],
  patterns: [{
    id: 'PAT-CIRCUIT-BREAKER', name: 'Circuit Breaker', recordType: 'pattern', category: 'resilience', status: 'draft', applicableStages: ['applicationRealization'],
    pairsWellWith: [], conflictsWith: [], obligations: ['Define fallback'], requires: [], qualityAttributeImpact: { availability: 3 }, risks: ['Incorrect thresholds'], mitigations: ['Monitor dependency health'], evidence: ['EVID-INTERNAL-ARCH-PRINCIPLES'], owner: 'Council', version: '1.0.0', calibrationNote: '',
  }],
};

describe('Sprint 7.6 knowledge integrity', () => {
  it('resolves authoritative contextual evidence and reports confidence', () => {
    const report = assessDesignLibraryIntegrity(library);
    expect(report.summary.totalRecords).toBeGreaterThanOrEqual(2);
    expect(report.summary.averageConfidence).toBeGreaterThan(50);
    expect(report.summary.unresolvedEvidenceIds).toEqual([]);
    expect(report.records.find((record) => record.recordId === 'PAT-CIRCUIT-BREAKER')?.evidenceSourceIds).toContain('SRC-AWS-WAF');
  });

  it('asks adaptive questions only for meaningful design uncertainty', () => {
    const project = structuredClone(sampleProject);
    project.qualityScenarios = [];
    project.context.teamSize = undefined;
    const result = nextArchitectureQuestions(project, 10);
    expect(result.questions.some((question) => question.id.startsWith('Q-SCENARIO-'))).toBe(true);
    expect(result.questions.some((question) => question.id === 'Q-TEAM-SIZE')).toBe(true);
  });

  it('detects security bolt-on and unversioned contracts', () => {
    const project = structuredClone(sampleProject);
    project.nodes = project.nodes.filter((node) => !(node.kind === 'Control' && /auth|identity/i.test(node.label)));
    const api = project.nodes.find((node) => node.kind === 'API');
    if (api) { api.properties.public = true; delete api.properties.versioningStrategy; }
    const findings = detectArchitectureAntiPatterns(project);
    expect(findings.some((finding) => finding.antiPatternId === 'ANTI-SECURITY-BOLTON')).toBe(true);
    expect(findings.some((finding) => finding.antiPatternId === 'ANTI-UNVERSIONED-CONTRACT')).toBe(true);
  });
});
