import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { emptyRequirementsIntelligenceState, sampleProject, type ArchitectureProject, type KnowledgeLibrary, type RequirementsSequenceDiagram } from '@aiw/domain';
import { buildDeterministicStageCoAuthorProposal } from '../src/stageCoAuthorAssistant.js';

const library = JSON.parse(readFileSync(new URL('../../../data/knowledge-library.json', import.meta.url), 'utf8')) as KnowledgeLibrary;

function acceptedSequence(): RequirementsSequenceDiagram {
  return {
    id: 'sequence-accepted', projectId: sampleProject.id, revision: 1, title: 'Authenticated exchange', scenario: 'A user sends an authenticated request.', trigger: 'Accepted journey starts', preconditions: ['User is authenticated'],
    participants: [
      { id: 'actor', name: 'User', type: 'actor', boundary: 'user', sourceRefs: ['journey:accepted'] },
      { id: 'service', name: 'Service', type: 'system', boundary: 'aiw-system', sourceRefs: ['journey:accepted'] },
    ],
    messages: [{ id: 'message-1', order: 1, fromParticipantId: 'actor', toParticipantId: 'service', label: 'Submit authenticated request', semantics: 'synchronous', classification: 'command', dataClassifications: [], trustBoundaryCrossing: true, authenticationPoint: true, authorisationPoint: false, requirementRefs: ['requirement:accepted'], journeyStepRefs: ['step:accepted'], interfaceRefs: [], assumptionRefs: [] }],
    fragments: [], compensatingActions: [], requirementRefs: ['requirement:accepted'], journeyRefs: ['journey:accepted'], interfaceRefs: [], unresolvedAssumptions: [], status: 'accepted', fingerprint: 'sequence-fingerprint', createdAt: '2026-07-18T00:00:00.000Z', updatedAt: '2026-07-18T00:00:00.000Z',
  };
}

describe('rc.10.78.2 Living Canvas accepted context', () => {
  it('carries accepted sequences into the canonical co-author context without mutating the project', () => {
    const project = structuredClone(sampleProject) as ArchitectureProject;
    project.requirementsIntelligence = emptyRequirementsIntelligenceState();
    project.requirementsIntelligence.sequenceDiagrams = [acceptedSequence(), { ...acceptedSequence(), id: 'sequence-stale', status: 'stale' }];
    const before = JSON.stringify(project);
    const proposal = buildDeterministicStageCoAuthorProposal({ project, library, targetStage: 'logicalApplication' });
    expect(proposal.contextSummary).toMatchObject({ acceptedSequenceCount: 1, staleSequenceCount: 1, sequenceRefs: ['sequence:sequence-accepted'] });
    expect(proposal.obligations?.some((item) => item.sourceRefs.includes('sequence:sequence-accepted'))).toBe(true);
    expect(proposal.contextSummary?.upstreamEvidenceRefs).toContain('sequence:sequence-accepted');
    expect(JSON.stringify(project)).toBe(before);
  });
});
