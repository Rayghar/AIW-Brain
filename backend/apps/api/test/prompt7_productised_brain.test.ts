import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sampleProject, type ArchitectureProject, type KnowledgeLibrary, type StageCoAuthorTarget } from '@aiw/domain';
import { composeSdd } from '@aiw/engine';
import { boundedBrainProjection, stableBrainRuntimeValue } from '../src/boundedBrainProjection.js';
import { buildDeterministicStageCoAuthorProposal } from '../src/stageCoAuthorAssistant.js';
import { recordProjectReviewDecision } from '../src/projectReviewDecisions.js';

const library = JSON.parse(readFileSync(new URL('../../../data/knowledge-library.json', import.meta.url), 'utf8')) as KnowledgeLibrary;
const stages: StageCoAuthorTarget[] = ['logicalApplication', 'applicationRealization', 'logicalTechnology', 'physicalTechnology'];
const scenarios = [
  ['agency-banking', 'Agency Banking', 'Enable banking agents to execute cash deposits and withdrawals through fraud controls and a governed core banking boundary.'],
  ['event-fulfilment', 'Event Fulfilment', 'Coordinate customer order, inventory, payment, fulfilment, delivery, cancellation, duplicate events and reconciliation.'],
  ['sensitive-analytics', 'Sensitive Analytics', 'Process personally identifiable information through masking, tokenisation, lineage, regional controls and analytical consumption.'],
  ['core-modernisation', 'Core Banking Modernisation', 'Modernise a legacy core with coexistence, general ledger integration, migration waves, cutover, rollback and reconciliation.'],
  ['agentic-application', 'Agentic Application', 'Govern specialist agents, tool access, prompt injection, memory, human approval, audit, model failure and data boundaries.'],
] as const;

function scenarioProject(name: string, description: string): ArchitectureProject {
  const project = structuredClone(sampleProject) as ArchitectureProject;
  project.id = `prompt7-${name.toLowerCase().replaceAll(' ', '-')}`;
  project.name = name;
  project.description = description;
  project.objectives = [description];
  project.constraints = ['All generated architecture remains candidate authority and requires review.'];
  project.nodes = [];
  project.edges = [];
  project.interfaces = [];
  project.decisions = [];
  project.findings = [];
  return project;
}

function fingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stableBrainRuntimeValue(value))).digest('hex');
}

describe('Prompt 7 productised bounded Brain', () => {
  it('produces actionable governed candidates in every design stage', () => {
    for (const [, name, description] of scenarios) {
      const project = scenarioProject(name, description);
      for (const targetStage of stages) {
        const before = JSON.stringify(project);
        const proposal = buildDeterministicStageCoAuthorProposal({ project, library, targetStage });
        expect(proposal.operations.filter((item) => item.kind === 'add-node').length).toBeGreaterThan(0);
        expect(proposal.operations.some((item) => item.kind === 'add-edge')).toBe(true);
        expect(proposal.operations.some((item) => item.kind === 'add-interface')).toBe(true);
        expect(proposal.operations.every((item) => item.authority === 'candidate' && item.reviewRequired === true)).toBe(true);
        expect(proposal.operations.every((item) => item.candidateState === 'proposed')).toBe(true);
        expect(JSON.stringify(project)).toBe(before);
      }
    }
  });

  it('keeps materially different scenarios semantically distinct', () => {
    for (const targetStage of stages) {
      const payloads = scenarios.map(([, name, description]) => buildDeterministicStageCoAuthorProposal({ project: scenarioProject(name, description), library, targetStage }).operations.map((item) => item.proposedValue));
      const fingerprints = payloads.map(fingerprint);
      expect(new Set(fingerprints).size).toBe(scenarios.length);
      expect(new Set(payloads.map((payload) => JSON.stringify(payload))).size).toBe(scenarios.length);
    }
  });

  it('uses one deterministic bounded projection for benchmark and workbench orchestration', () => {
    const projected = boundedBrainProjection({
      projectId: 'project-123',
      generatedAt: '2026-07-17T00:00:00Z',
      secretLikeNoise: 'safe non-secret content',
      nested: { values: Array.from({ length: 40 }, (_, index) => ({ index, value: `value-${index}` })) },
    });
    expect(projected).toEqual(boundedBrainProjection(projected));
    expect(JSON.stringify(projected)).not.toContain('2026-07-17T00:00:00Z');
    expect(JSON.stringify(projected).length).toBeLessThan(10_000);
  });

  it('assembles scenario-specific SDD content from accepted project candidate state', () => {
    const documents = scenarios.slice(0, 3).map(([, name, description]) => {
      const project = scenarioProject(name, description);
      for (const targetStage of stages) {
        const proposal = buildDeterministicStageCoAuthorProposal({ project, library, targetStage });
        for (const operation of proposal.operations) {
          if (operation.kind === 'add-node') project.nodes.push(structuredClone(operation.proposedValue) as ArchitectureProject['nodes'][number]);
          if (operation.kind === 'add-edge') project.edges.push(structuredClone(operation.proposedValue) as ArchitectureProject['edges'][number]);
          if (operation.kind === 'add-interface') project.interfaces.push(structuredClone(operation.proposedValue) as ArchitectureProject['interfaces'][number]);
        }
      }
      return composeSdd(project, library);
    });
    expect(new Set(documents.map(fingerprint)).size).toBe(documents.length);
    expect(documents[0]).toContain('Agency Banking');
    expect(documents[1]).toContain('Event Fulfilment');
    expect(documents[2]).toContain('Sensitive Analytics');
    for (const document of documents) {
      expect(document).toContain('candidateAuthority=candidate');
      expect(document).toContain('obligationRefs=');
    }
  });

  it('persists project-candidate reviewer decisions without production authority', () => {
    const project = scenarioProject('Review persistence', 'Review a candidate architecture.');
    const proposal = buildDeterministicStageCoAuthorProposal({ project, library, targetStage: 'logicalApplication' });
    const node = structuredClone(proposal.operations.find((item) => item.kind === 'add-node')!.proposedValue) as ArchitectureProject['nodes'][number];
    node.properties.candidateLifecycleState = 'accepted-for-project';
    project.nodes.push(node);
    const recorded = recordProjectReviewDecision(project, {
      targetType: 'candidate', targetId: node.id, action: 'reject-candidate', actorId: 'reference-reviewer',
      comment: 'Responsibility overlaps an existing boundary.', now: '2026-07-17T12:00:00.000Z',
    });
    expect(recorded.decision.authority).toBe('project-candidate-review');
    expect(recorded.decision.resultingState).toBe('rejected');
    expect(recorded.project.nodes[0]?.status).not.toBe('approved');
    expect(recorded.project.reviewDecisionLedger).toHaveLength(1);
    expect(project.reviewDecisionLedger).toBeUndefined();
  });

  it('excludes rejected project candidates from the governed SDD', () => {
    const project = scenarioProject('SDD rejection', 'Exclude rejected candidates.');
    project.nodes.push({
      id: 'accepted-service', kind: 'LogicalService', stage: 'logicalApplication', label: 'Accepted Service',
      properties: { candidateAuthority: 'candidate', candidateLifecycleState: 'accepted-for-project' }, lineageFrom: [], positions: {}, tags: [], status: 'draft',
    }, {
      id: 'rejected-service', kind: 'LogicalService', stage: 'logicalApplication', label: 'Rejected Service Must Not Appear',
      properties: { candidateAuthority: 'candidate', candidateLifecycleState: 'rejected' }, lineageFrom: [], positions: {}, tags: [], status: 'draft',
    });
    const markdown = composeSdd(project, library);
    expect(markdown).toContain('Accepted Service');
    expect(markdown).not.toContain('Rejected Service Must Not Appear');
  });
});
