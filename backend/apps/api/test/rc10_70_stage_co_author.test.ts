import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sampleProject, type ArchitectureProject, type KnowledgeLibrary } from '@aiw/domain';
import { buildDeterministicStageCoAuthorProposal, buildGovernedStageCoAuthorProposal } from '../src/stageCoAuthorAssistant.js';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

const library = JSON.parse(readFileSync(new URL('../../../data/knowledge-library.json', import.meta.url), 'utf8')) as KnowledgeLibrary;

function project(): ArchitectureProject {
  const value = structuredClone(sampleProject) as ArchitectureProject;
  value.description = 'Enable secure, resilient payment settlement. The service must continue when a processing dependency fails and must support peak transaction volumes.';
  value.objectives = ['Enable reliable payment settlement for customers and operations teams'];
  value.constraints = ['Customer information must remain within the approved jurisdiction'];
  value.qualityScenarios = [];
  value.activeStage = 'applicationRealization';
  return value;
}

function gateway(value: Record<string, unknown>) {
  return {
    async generateJson<T>() {
      return {
        value: value as T,
        providerId: 'openai',
        model: 'gpt-4.1-mini',
        routeId: 'architecture-reasoning:openai:gpt-4.1-mini',
        protocol: 'responses' as const,
        latencyMs: 17,
        usage: {},
        requestFingerprint: 'stage-co-author-test',
        fallbackUsed: false,
      };
    },
  };
}

describe('rc.10.70 stage co-author', () => {
  it('explains the stage, components, requirement enablement and trade-offs without mutating the project', () => {
    const input = project();
    const before = JSON.stringify(input);
    const result = buildDeterministicStageCoAuthorProposal({ project: input, library, targetStage: 'applicationRealization' });
    expect(result.mode).toBe('deterministic');
    expect(result.explanation.stagePurpose.length).toBeGreaterThan(30);
    expect(result.explanation.requirementEnablement.length).toBeGreaterThan(0);
    expect(result.explanation.selectedComponents.length).toBeGreaterThan(0);
    expect(result.explanation.selectedComponents.every((item) => item.role && item.whySelected && item.tradeOffs.length)).toBe(true);
    expect(result.notice).toMatch(/Nothing enters the canonical model/i);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('drafts missing quality scenarios as clarification-bound rather than inventing measurable targets', () => {
    const input = project();
    const result = buildDeterministicStageCoAuthorProposal({ project: input, library, targetStage: 'qualityDrivers' });
    expect(result.operations.length).toBeGreaterThan(0);
    expect(result.operations.some((item) => item.kind === 'append-quality-scenario' && item.validationStatus === 'requires-clarification')).toBe(true);
    expect(result.clarifications.some((item) => /measurable|latency|availability|recovery/i.test(item.question))).toBe(true);
  });

  it('sanitizes governed LLM drafts, rejects invented targets and preserves the deterministic explanation', async () => {
    const input = project();
    const node = input.nodes.find((item) => item.stage === 'applicationRealization')!;
    const result = await buildGovernedStageCoAuthorProposal({
      project: input,
      library,
      targetStage: 'applicationRealization',
      gateway: gateway({
        summary: 'Explain and improve the current realization.',
        operations: [
          { id: 'valid-node', kind: 'update-node-description', label: 'Clarify component responsibility', targetPath: `nodes.${node.id}.description`, targetId: node.id, field: null, proposedValue: 'Own the payment-processing responsibility and expose failure handling explicitly.', rationale: 'Clarifies the responsibility.', evidenceRefs: ['objective:0'], requirementRefs: ['objective:0'], confidence: 0.8, validationStatus: 'ready', missingInformation: [], tradeOffs: ['A more explicit boundary requires clear ownership.'], downstreamEffects: ['Improves implementation handoff.'] },
          { id: 'invented-node', kind: 'update-node-description', label: 'Invented', targetPath: 'nodes.not-real.description', targetId: 'not-real', field: null, proposedValue: 'Must not survive', rationale: 'Invalid.', evidenceRefs: ['invented-evidence'], requirementRefs: [], confidence: 1, validationStatus: 'ready', missingInformation: [], tradeOffs: [], downstreamEffects: [] },
          { id: 'invented-number', kind: 'append-decision', label: 'Unsupported SLA', targetPath: 'decisions', targetId: null, field: null, proposedValue: { title: 'Set 99.999% availability', context: 'Missing evidence', decision: 'Guarantee 99.999% availability', drivers: [], consideredOptions: [], consequences: [] }, rationale: 'Unsupported numeric target.', evidenceRefs: ['objective:0'], requirementRefs: [], confidence: 0.9, validationStatus: 'ready', missingInformation: [], tradeOffs: [], downstreamEffects: [] },
        ],
        clarifications: [{ id: 'clarify-sla', question: 'What availability and recovery targets are approved?', whyItMatters: 'The architecture must not invent them.', relatedFieldPaths: ['qualityScenarios'], blocking: true }],
        explanation: { title: 'Enriched explanation', stagePurpose: 'Explain realization.', businessOutcomeNarrative: 'The design enables settlement.', requirementEnablement: ['objective'], designLogic: ['logic'], selectedComponents: [{ id: node.id, role: 'Payment responsibility', whySelected: 'Realizes the logical payment boundary.', enables: ['settlement'], driverRefs: ['objective:0'], qualityRefs: [], styleRefs: [], patternRefs: [], tradeOffs: ['boundary overhead'], risks: [], alternatives: ['modular monolith'] }], interfacesAndFlow: [], qualityAttributeImpact: [], tradeOffSummary: [], risksAndOpenQuestions: [], downstreamConsequences: [], completionEvidence: [] },
      }),
    });
    expect(result.mode).toBe('llm-assisted');
    expect(result.operations.some((item) => item.id === 'valid-node')).toBe(true);
    expect(result.operations.some((item) => item.id === 'invented-node')).toBe(false);
    expect(result.operations.find((item) => item.id === 'invented-number')?.validationStatus).toBe('requires-clarification');
    expect(result.explanation.selectedComponents.find((item) => item.id === node.id)?.alternatives).toContain('modular monolith');
    expect(JSON.stringify(result)).not.toContain('invented-evidence');
  });

  it('exposes deterministic stage co-authoring through the project API without mutation', async () => {
    const repository = new InMemoryProjectRepository();
    const app = await buildApp({ repository, logger: false });
    try {
      const baseline = await repository.getProject('tenant-reference', sampleProject.id, sampleProject.branch.id);
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}/stage-co-author`,
        headers: { 'x-aiw-tenant-id': 'tenant-reference', 'x-aiw-user-id': 'user-owner' },
        payload: { targetStage: 'requirements', intelligenceMode: 'deterministic' },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ mode: 'deterministic', targetStage: 'requirements', projectRevision: baseline?.revision });
      const after = await repository.getProject('tenant-reference', sampleProject.id, sampleProject.branch.id);
      expect(after?.revision).toBe(baseline?.revision);
    } finally {
      await app.close();
    }
  });
});
