import { describe, expect, it } from 'vitest';
import { sampleProject, type ArchitectureBrainContextReceipt, type ArchitectureProject, type ArchitectureStyleRecord } from '@aiw/domain';
import { evaluateSolResponseQuality } from '../src/index.js';
import { recommendationCalibrationRules } from '../src/recommendationCalibration.js';

function context(stage = 'requirements'): ArchitectureBrainContextReceipt {
  return {
    lifecycleStage: stage,
    architectureStage: stage === 'requirements' ? 'designIntent' : 'logicalApplication',
    scopeLabel: `Whole ${stage} stage`,
    included: { requirements: 3, qualityScenarios: 2, journeys: 2, nodes: 1, relationships: 1, interfaces: 1, decisions: 1, findings: 0, openQuestions: 1 },
    projectTotals: { requirements: 3, qualityScenarios: 2, journeys: 2, nodes: 1, relationships: 1, interfaces: 1, decisions: 1, findings: 0, openQuestions: 1 },
    excludedAsIrrelevant: {},
    evidenceRefs: ['REQ-1', 'JRN-1'],
    missingInformation: ['Peak response measure is not confirmed.'],
    legacyProjectionUsed: false,
  };
}

describe('rc.10.72.3 Sol quality calibration', () => {
  it('passes a stage-correct, evidence-grounded and governed response', () => {
    const result = evaluateSolResponseQuality({
      expectedLifecycleStage: 'requirements',
      actualLifecycleStage: 'requirements',
      question: 'Which requirement should be clarified first?',
      answer: 'REQ-1 is the highest-impact ambiguity because its actor and acceptance measure are incomplete.',
      recommendation: 'Clarify the stakeholder outcome and measurable acceptance condition for REQ-1 before promoting the journey baseline.',
      observations: ['REQ-1 is linked to JRN-1 but does not define an observable completion condition.'],
      tradeOffs: ['Progressing now is faster, but it allows downstream responsibilities to be generated from an untestable requirement.'],
      clarifyingQuestions: ['What observable outcome confirms that REQ-1 has been satisfied?'],
      suggestedActionCount: 1,
      confidence: 'high',
      citedRecordIds: ['REQ-1', 'JRN-1'],
      context: context(),
      receipt: {
        governance: { humanApprovalRequired: true, directModelMutationAllowed: false, staleIfProjectRevisionChanges: true, auditRequired: true },
        deterministicRules: ['exact-lifecycle-stage', 'unsupported-claim-guard'],
        knowledgeRefs: ['CAMBRIDGE-SA-1.0'],
        llm: { requested: true, used: true, fallbackUsed: false },
      },
      lineagePaths: [{ id: 'L1', label: 'REQ-1 → JRN-1', recordIds: ['REQ-1','JRN-1'], complete: true, missingLinks: [] }],
      allowedEvidenceText: 'REQ-1 JRN-1 observable completion condition stakeholder outcome',
    });
    expect(result.stageAligned).toBe(true);
    expect(result.unsupportedClaimsDetected).toEqual([]);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.status).toBe('passed');
  });

  it('rejects invented numeric or legal claims and stage drift', () => {
    const result = evaluateSolResponseQuality({
      expectedLifecycleStage: 'quality',
      actualLifecycleStage: 'logical',
      question: 'What quality measure is missing?',
      answer: 'Use microservices. The system must achieve 99.999% availability and an RTO of 5 minutes because the regulator mandates ISO 9999.',
      recommendation: 'Use microservices and the cloud.',
      observations: ['Consider scalability.'],
      tradeOffs: [],
      clarifyingQuestions: [],
      suggestedActionCount: 0,
      confidence: 'high',
      citedRecordIds: [],
      context: context('quality'),
      receipt: {
        governance: { humanApprovalRequired: true, directModelMutationAllowed: false, staleIfProjectRevisionChanges: true, auditRequired: true },
        deterministicRules: ['unsupported-claim-guard'],
        knowledgeRefs: [],
        llm: { requested: true, used: true, fallbackUsed: false },
      },
      lineagePaths: [],
      allowedEvidenceText: '',
    });
    expect(result.status).toBe('failed');
    expect(result.stageAligned).toBe(false);
    expect(result.unsupportedClaimsDetected.length).toBeGreaterThan(0);
    expect(result.genericAdviceFlags.length).toBeGreaterThan(0);
  });

  it('uses domain evidence to penalize provider dependence and ungrounded Data Mesh', () => {
    const project = structuredClone(sampleProject) as ArchitectureProject;
    project.description = 'Regulated agency banking payment and settlement platform.';
    project.context.regulatoryExposure = 'high';
    project.context.dataSensitivity = 'restricted';
    project.objectives = ['Process financial transactions with auditability.'];
    project.constraints = ['Preserve portability and regulatory evidence.'];
    project.requirementsIntelligence = undefined;
    const providerRule = recommendationCalibrationRules.find((item) => item.id === 'CAL-REGULATED-FINANCE-PROVIDER-DEPENDENCE')!;
    const dataMeshRule = recommendationCalibrationRules.find((item) => item.id === 'CAL-DATA-MESH-REQUIRES-DOMAIN-GOVERNANCE')!;
    const providerStyle = { id: 'STYLE-SERVERLESS', name: 'Serverless', traits: ['provider-dependent'] } as ArchitectureStyleRecord;
    const dataMeshStyle = { id: 'STYLE-DATA-MESH', name: 'Data Mesh', traits: ['data-mesh'] } as ArchitectureStyleRecord;
    expect(providerRule.applies(providerStyle, project)).toBe(true);
    expect(dataMeshRule.applies(dataMeshStyle, project)).toBe(true);
  });
});
