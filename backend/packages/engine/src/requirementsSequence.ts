import type {
  ArchitectureProject,
  JourneyInteraction,
  JourneyPath,
  RequirementsSequenceDiagram,
  RequirementsSequenceFragment,
  RequirementsSequenceMessage,
  RequirementsSequenceParticipant,
  SolutionJourney,
} from '@aiw/domain';

function hash(value: unknown): string {
  const text = JSON.stringify(value);
  let forward = 2166136261;
  let reverse = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    forward ^= text.charCodeAt(index);
    forward = Math.imul(forward, 16777619);
    reverse ^= text.charCodeAt(text.length - index - 1);
    reverse = Math.imul(reverse, 16777619);
  }
  return `${(forward >>> 0).toString(16).padStart(8, '0')}${(reverse >>> 0).toString(16).padStart(8, '0')}`;
}

function participantType(kind: string): RequirementsSequenceParticipant['type'] {
  if (kind === 'human') return 'actor';
  if (kind === 'external-system') return 'external-system';
  if (kind === 'data-store') return 'data-store';
  return 'system';
}

function sequenceKind(path: JourneyPath): RequirementsSequenceFragment['kind'] | null {
  if (path.kind === 'alternate') return 'alternate';
  if (path.kind === 'failure') return 'failure';
  if (path.kind === 'recovery') return 'recovery';
  return null;
}

function message(project: ArchitectureProject, interaction: JourneyInteraction): RequirementsSequenceMessage {
  const existingInterface = (project.interfaces ?? []).find((item) =>
    item.evidenceIds.some((ref) => interaction.requirementRefs.includes(ref))
    || item.operationOrEvent.toLowerCase() === interaction.label.toLowerCase(),
  );
  return {
    id: interaction.id,
    order: interaction.sequence,
    fromParticipantId: interaction.fromParticipantId,
    toParticipantId: interaction.toParticipantId,
    label: interaction.label,
    semantics: interaction.interactionKind === 'event' || interaction.interactionKind === 'notification' ? 'asynchronous' : interaction.interactionKind === 'manual-task' ? 'manual' : 'synchronous',
    classification: interaction.interactionKind,
    ...(existingInterface?.protocol ? { protocol: existingInterface.protocol } : {}),
    dataClassifications: interaction.dataObjects.flatMap((data) => project.context.dataClassifications?.filter((classification) => data.toLowerCase().includes(classification.toLowerCase())) ?? []),
    trustBoundaryCrossing: interaction.trustBoundaryCrossing,
    authenticationPoint: /authenticat|sign[ -]?in|token/i.test(interaction.label),
    authorisationPoint: /authori[sz]|permission|policy/i.test(interaction.label),
    ...(interaction.timingExpectation ? { timeout: interaction.timingExpectation } : {}),
    ...(interaction.failureBehaviour ? { retry: interaction.failureBehaviour } : {}),
    requirementRefs: [...interaction.requirementRefs],
    journeyStepRefs: [interaction.id],
    interfaceRefs: existingInterface ? [existingInterface.id] : [],
    assumptionRefs: [],
  };
}

export function generateRequirementsSequences(project: ArchitectureProject, now = new Date().toISOString()): RequirementsSequenceDiagram[] {
  const requirements = project.requirementsIntelligence;
  if (!requirements) return [];
  const acceptedRequirements = new Set(requirements.requirements.filter((item) => item.status === 'accepted').map((item) => item.id));
  const acceptedJourneys = requirements.journeys.filter((journey) => journey.status === 'accepted');
  return acceptedJourneys.flatMap((journey: SolutionJourney) => journey.paths.map((path, pathIndex) => {
    const participants: RequirementsSequenceParticipant[] = journey.participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      type: participantType(participant.kind),
      boundary: participant.kind === 'human' ? 'user' : participant.kind === 'external-system' ? 'external' : 'aiw-system',
      sourceRefs: [journey.id, ...journey.requirementRefs.filter((ref) => acceptedRequirements.has(ref))],
    }));
    const messages = path.interactions
      .filter((interaction) => interaction.status !== 'rejected')
      .map((interaction) => message(project, interaction))
      .sort((left, right) => left.order - right.order);
    const fragmentKind = sequenceKind(path);
    const fragments: RequirementsSequenceFragment[] = fragmentKind ? [{ id: `${path.id}-fragment`, kind: fragmentKind, label: path.name, messageRefs: messages.map((item) => item.id) }] : [];
    const requirementRefs = [...new Set(messages.flatMap((item) => item.requirementRefs).filter((ref) => acceptedRequirements.has(ref)))];
    const draft = {
      projectId: project.id,
      title: `${journey.name} — ${path.name}`,
      scenario: path.description || journey.description,
      participants,
      messages,
      fragments,
      requirementRefs,
      journeyRefs: [journey.id],
    };
    const fingerprint = hash(draft);
    return {
      id: `sequence-${journey.id}-${path.id}`,
      projectId: project.id,
      revision: 1,
      title: draft.title,
      scenario: draft.scenario,
      trigger: journey.goal,
      preconditions: project.constraints.filter((item) => /before|must|require|available|authenticated/i.test(item)).slice(0, 6),
      participants,
      messages,
      fragments,
      compensatingActions: path.kind === 'recovery' ? path.interactions.map((item) => item.failureBehaviour).filter((item): item is string => Boolean(item)) : [],
      requirementRefs,
      journeyRefs: [journey.id],
      interfaceRefs: [...new Set(messages.flatMap((item) => item.interfaceRefs))],
      unresolvedAssumptions: messages.length ? [] : [`No accepted interaction evidence is available for ${path.name}.`],
      status: 'candidate',
      fingerprint,
      createdAt: now,
      updatedAt: now,
    } satisfies RequirementsSequenceDiagram;
  }));
}

export function applyGeneratedSequences(project: ArchitectureProject, generated: RequirementsSequenceDiagram[]): ArchitectureProject {
  if (!project.requirementsIntelligence) throw new Error('REQUIREMENTS_INTELLIGENCE_NOT_INITIALIZED');
  const previous = project.requirementsIntelligence.sequenceDiagrams ?? [];
  const byId = new Map(previous.map((item) => [item.id, item]));
  const nextSequences = generated.map((item) => {
    const existing = byId.get(item.id);
    if (!existing) return item;
    if (existing.fingerprint === item.fingerprint) return existing;
    return { ...item, id: `${item.id}-r${existing.revision + 1}`, revision: existing.revision + 1, supersedesId: existing.id };
  });
  const superseded = previous.filter((item) => nextSequences.some((next) => next.supersedesId === item.id)).map((item) => ({ ...item, status: 'superseded' as const, updatedAt: new Date().toISOString() }));
  return {
    ...project,
    requirementsIntelligence: { ...project.requirementsIntelligence, sequenceDiagrams: [...nextSequences, ...superseded] },
    revision: project.revision + 1,
    updatedAt: new Date().toISOString(),
  };
}

export function markAffectedSequencesStale(project: ArchitectureProject, changedRequirementIds: string[]): ArchitectureProject {
  if (!project.requirementsIntelligence?.sequenceDiagrams?.length) return project;
  const changed = new Set(changedRequirementIds);
  return {
    ...project,
    requirementsIntelligence: {
      ...project.requirementsIntelligence,
      sequenceDiagrams: project.requirementsIntelligence.sequenceDiagrams.map((item) => item.requirementRefs.some((ref) => changed.has(ref))
        ? { ...item, status: 'stale', staleReason: `Accepted requirement changed: ${item.requirementRefs.filter((ref) => changed.has(ref)).join(', ')}`, updatedAt: new Date().toISOString() }
        : item),
    },
  };
}
