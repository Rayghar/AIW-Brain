import { describe, expect, it } from 'vitest';
import { emptyRequirementsIntelligenceState, sampleProject, type SolutionJourney } from '@aiw/domain';
import { applyGeneratedSequences, generateRequirementsSequences, markAffectedSequencesStale } from '../src/requirementsSequence.js';

const journey: SolutionJourney = {
  id: 'journey-payment', name: 'Submit regulated payment', goal: 'Complete a regulated payment safely', description: 'Customer submits and receives an outcome', priority: 'critical', origin: 'source-derived', status: 'accepted', actorRefs: ['actor-customer'], requirementRefs: ['REQ-001','REQ-002'],
  participants: [
    { id: 'customer', name: 'Customer', kind: 'human', description: 'Payment initiator' },
    { id: 'payments', name: 'Payments Service', kind: 'system-of-interest', description: 'Processes payments' },
    { id: 'rail', name: 'External Rail', kind: 'external-system', description: 'Clearing network' },
  ],
  paths: [
    { id: 'happy', kind: 'happy', name: 'Happy path', description: 'Payment accepted', interactions: [
      { id: 'submit', sequence: 1, fromParticipantId: 'customer', toParticipantId: 'payments', label: 'Submit payment', interactionKind: 'command', requirementRefs: ['REQ-001'], qualityRefs: [], dataObjects: ['restricted payment data'], trustBoundaryCrossing: true, status: 'accepted' },
      { id: 'settle', sequence: 2, fromParticipantId: 'payments', toParticipantId: 'rail', label: 'Publish settlement instruction', interactionKind: 'event', requirementRefs: ['REQ-002'], qualityRefs: [], dataObjects: [], trustBoundaryCrossing: true, failureBehaviour: 'Retry idempotently', status: 'accepted' },
    ] },
    { id: 'recovery', kind: 'recovery', name: 'Recovery path', description: 'Rail timeout recovery', interactions: [
      { id: 'retry', sequence: 1, fromParticipantId: 'payments', toParticipantId: 'rail', label: 'Retry settlement', interactionKind: 'command', requirementRefs: ['REQ-002'], qualityRefs: [], dataObjects: [], trustBoundaryCrossing: true, failureBehaviour: 'Reconcile before retry', status: 'accepted' },
    ] },
  ], qualityHotspots: ['availability'], architectureObligations: ['idempotent settlement'], createdAt: '2026-07-18T00:00:00.000Z', updatedAt: '2026-07-18T00:00:00.000Z',
};

function project() {
  const value = structuredClone(sampleProject);
  const requirements = emptyRequirementsIntelligenceState();
  requirements.requirements = [
    { id:'REQ-001', title:'Submit payment', statement:'The customer shall submit a payment.', type:'functional', priority:'must', origin:'source-derived', status:'accepted', confidence:1, evidenceRefs:[], stakeholderRefs:[], journeyRefs:[journey.id], acceptanceCriteria:[], tags:[], createdAt:'2026-07-18T00:00:00.000Z', updatedAt:'2026-07-18T00:00:00.000Z' },
    { id:'REQ-002', title:'Recover settlement', statement:'Settlement shall recover idempotently.', type:'quality', priority:'must', origin:'source-derived', status:'accepted', confidence:1, evidenceRefs:[], stakeholderRefs:[], journeyRefs:[journey.id], acceptanceCriteria:[], tags:[], createdAt:'2026-07-18T00:00:00.000Z', updatedAt:'2026-07-18T00:00:00.000Z' },
  ];
  requirements.journeys = [journey]; value.requirementsIntelligence = requirements; value.context.dataClassifications = ['restricted']; return value;
}

describe('rc.10.78.2 requirements-derived sequence intelligence', () => {
  it('generates scenario-specific candidate sequences with exact lineage and deterministic replay', () => {
    const input = project(); const first = generateRequirementsSequences(input, '2026-07-18T00:00:00.000Z'); const replay = generateRequirementsSequences(input, '2026-07-18T00:00:00.000Z');
    expect(first).toHaveLength(2); expect(replay.map((item) => item.fingerprint)).toEqual(first.map((item) => item.fingerprint));
    expect(first[0]).toMatchObject({ status:'candidate', requirementRefs:['REQ-001','REQ-002'] });
    expect(first[0]?.messages[1]).toMatchObject({ semantics:'asynchronous', retry:'Retry idempotently' });
    expect(first[1]?.fragments[0]?.kind).toBe('recovery');
  });
  it('persists candidate versions and marks only affected sequences stale', () => {
    const input = project(); const saved = applyGeneratedSequences(input, generateRequirementsSequences(input)); const changed = markAffectedSequencesStale(saved, ['REQ-001']);
    expect(changed.requirementsIntelligence?.sequenceDiagrams?.find((item) => item.requirementRefs.includes('REQ-001'))?.status).toBe('stale');
    expect(changed.requirementsIntelligence?.sequenceDiagrams?.find((item) => !item.requirementRefs.includes('REQ-001'))?.status).toBe('candidate');
  });
});
