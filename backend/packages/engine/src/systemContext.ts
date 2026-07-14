import type {
  ArchitectureEdge,
  ArchitectureNode,
  ArchitectureProject,
  EntityKind,
  SolutionJourney,
  SystemContextCandidate,
} from '@aiw/domain';
import { buildArchitectureContextGraph } from './architectureContextGraph.js';

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 54) || 'participant';
}

function participantKind(
  kind: SolutionJourney['participants'][number]['kind'],
): EntityKind {
  return kind === 'human' || kind === 'team' ? 'Actor' : 'ExternalSystem';
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

/**
 * Compiles a deterministic System Context proposal from accepted requirements
 * and journeys. The browser never invents or mutates this topology.
 */
export function buildSystemContextCandidate(
  project: ArchitectureProject,
): SystemContextCandidate {
  const intelligence = project.requirementsIntelligence;
  const journeys =
    intelligence?.journeys.filter((item) => item.status === 'accepted') ?? [];
  const systemId = `context-system-${slug(project.name)}`;
  const allJourneyRefs = journeys.map((item) => item.id);
  const nodes: ArchitectureNode[] = [
    {
      id: systemId,
      semanticId: `system:${slug(project.name)}`,
      kind: 'System',
      stage: 'logicalApplication',
      label: project.name,
      description:
        'System of interest derived from the accepted Solution Intent and Journey Atlas.',
      properties: {
        decompositionLevel: 'system-context',
        journeyRefs: allJourneyRefs,
        provenance: 'architecture-brain',
        responsibility:
          'Enable the accepted business outcomes and journeys within the defined solution boundary.',
      },
      lineageFrom: allJourneyRefs,
      positions: { logicalApplication: { x: 520, y: 260 } },
      tags: ['system-context', 'system-of-interest'],
      status: 'draft',
    },
  ];

  const participantNodes = new Map<string, ArchitectureNode>();
  const participantKeyByJourneyId = new Map<string, string>();
  const interactions: Array<{
    journeyId: string;
    fromKey: string;
    toKey: string;
    fromIsSystem: boolean;
    toIsSystem: boolean;
    label: string;
    requirementRefs: string[];
    interactionRefs: string[];
    trustBoundaryCrossing: boolean;
    dataObjects: string[];
  }> = [];

  for (const journey of journeys) {
    for (const participant of journey.participants) {
      if (participant.kind === 'system-of-interest') {
        participantKeyByJourneyId.set(`${journey.id}:${participant.id}`, systemId);
        continue;
      }
      const key = `${participant.kind}:${participant.name.toLowerCase()}`;
      participantKeyByJourneyId.set(`${journey.id}:${participant.id}`, key);
      let node = participantNodes.get(key);
      if (!node) {
        const kind = participantKind(participant.kind);
        const id = `context-${kind.toLowerCase()}-${slug(participant.name)}`;
        node = {
          id,
          semanticId: `${kind.toLowerCase()}:${slug(participant.name)}`,
          kind,
          stage: 'logicalApplication',
          label: participant.name,
          description:
            participant.description || `Context participant in ${project.name}.`,
          properties: {
            decompositionLevel: 'system-context',
            journeyRefs: [journey.id],
            participantKind: participant.kind,
            provenance: 'architecture-brain',
          },
          lineageFrom: participant.stakeholderRef
            ? [participant.stakeholderRef, journey.id]
            : [journey.id],
          positions: {
            logicalApplication: {
              x: participant.kind === 'human' || participant.kind === 'team' ? 100 : 940,
              y: 90 + participantNodes.size * 118,
            },
          },
          tags: [
            'system-context',
            participant.kind === 'human' || participant.kind === 'team'
              ? 'context-actor'
              : 'context-external',
          ],
          status: 'draft',
        };
        participantNodes.set(key, node);
        nodes.push(node);
      } else {
        node.properties = {
          ...node.properties,
          journeyRefs: unique([
            ...((Array.isArray(node.properties.journeyRefs)
              ? node.properties.journeyRefs
              : []) as string[]),
            journey.id,
          ]),
        };
      }
    }

    const participants = new Map(
      journey.participants.map((item) => [item.id, item]),
    );
    for (const path of journey.paths) {
      for (const interaction of path.interactions.filter(
        (item) => item.status !== 'rejected',
      )) {
        const from = participants.get(interaction.fromParticipantId);
        const to = participants.get(interaction.toParticipantId);
        if (!from || !to) continue;
        interactions.push({
          journeyId: journey.id,
          fromKey:
            participantKeyByJourneyId.get(`${journey.id}:${from.id}`) ?? '',
          toKey: participantKeyByJourneyId.get(`${journey.id}:${to.id}`) ?? '',
          fromIsSystem: from.kind === 'system-of-interest',
          toIsSystem: to.kind === 'system-of-interest',
          label: interaction.label,
          requirementRefs: interaction.requirementRefs,
          interactionRefs: [interaction.id],
          trustBoundaryCrossing: interaction.trustBoundaryCrossing,
          dataObjects: interaction.dataObjects,
        });
      }
    }
  }

  const nodeForKey = (key: string): ArchitectureNode | undefined =>
    key === systemId ? nodes[0] : participantNodes.get(key);
  const edgeMap = new Map<string, ArchitectureEdge>();
  for (const item of interactions) {
    const fromNode = nodeForKey(item.fromKey);
    const toNode = nodeForKey(item.toKey);
    // System Context keeps internal processing opaque. External-to-external
    // interactions are represented as two obligations through the boundary.
    const pairs: Array<[
      ArchitectureNode | undefined,
      ArchitectureNode | undefined,
    ]> =
      !item.fromIsSystem && !item.toIsSystem
        ? [
            [fromNode, nodes[0]],
            [nodes[0], toNode],
          ]
        : [[fromNode, toNode]];
    for (const [source, target] of pairs) {
      if (!source || !target || source.id === target.id) continue;
      const key = `${source.id}:${target.id}`;
      const existing = edgeMap.get(key);
      if (existing) {
        existing.properties = {
          ...existing.properties,
          journeyRefs: unique([
            ...((existing.properties.journeyRefs as string[] | undefined) ?? []),
            item.journeyId,
          ]),
          requirementRefs: unique([
            ...((existing.properties.requirementRefs as string[] | undefined) ?? []),
            ...item.requirementRefs,
          ]),
          interactionRefs: unique([
            ...((existing.properties.interactionRefs as string[] | undefined) ?? []),
            ...item.interactionRefs,
          ]),
          interactionLabels: unique([
            ...((existing.properties.interactionLabels as string[] | undefined) ?? []),
            item.label,
          ]),
          dataObjects: unique([
            ...((existing.properties.dataObjects as string[] | undefined) ?? []),
            ...item.dataObjects,
          ]),
          trustBoundaryCrossing: Boolean(
            existing.properties.trustBoundaryCrossing ||
              item.trustBoundaryCrossing,
          ),
        };
      } else {
        edgeMap.set(key, {
          id: `context-edge-${slug(source.id)}-${slug(target.id)}`,
          sourceId: source.id,
          targetId: target.id,
          kind: 'communicatesWith',
          stage: 'logicalApplication',
          label: item.label,
          properties: {
            decompositionLevel: 'system-context',
            journeyRefs: [item.journeyId],
            requirementRefs: item.requirementRefs,
            interactionRefs: item.interactionRefs,
            interactionLabels: [item.label],
            dataObjects: item.dataObjects,
            trustBoundaryCrossing: item.trustBoundaryCrossing,
            provenance: 'architecture-brain',
          },
        });
      }
    }
  }

  return {
    schemaVersion: '1.0',
    projectRevision: project.revision,
    systemNodeRef: systemId,
    nodes,
    edges: [...edgeMap.values()],
    journeyCoverage: journeys.map((journey) => ({
      id: journey.id,
      name: journey.name,
      interactionCount: journey.paths.reduce(
        (count, path) => count + path.interactions.length,
        0,
      ),
    })),
    architectureObligations: unique(
      journeys.flatMap((item) => item.architectureObligations),
    ),
    openCriticalQuestionCount:
      intelligence?.openQuestions.filter(
        (item) =>
          item.status === 'open' &&
          (item.impact === 'critical' || item.impact === 'high'),
      ).length ?? 0,
  };
}

/** Applies the server-recomputed candidate after an explicit human acceptance. */
export function applySystemContextCandidate(
  project: ArchitectureProject,
  candidate: SystemContextCandidate,
): ArchitectureProject {
  const existingContextIds = new Set(
    project.nodes
      .filter((node) => node.tags.includes('system-context'))
      .map((node) => node.id),
  );
  const revision = project.revision + 1;
  let next: ArchitectureProject = {
    ...project,
    nodes: [
      ...project.nodes.filter((node) => !existingContextIds.has(node.id)),
      ...candidate.nodes.map((node) => ({ ...node, status: 'reviewed' as const })),
    ],
    edges: [
      ...project.edges.filter(
        (edge) =>
          !existingContextIds.has(edge.sourceId) &&
          !existingContextIds.has(edge.targetId),
      ),
      ...candidate.edges,
    ],
    activeStage: 'logicalApplication',
    revision,
    updatedAt: new Date().toISOString(),
  };

  const intelligence = next.requirementsIntelligence;
  if (intelligence) {
    const graph = buildArchitectureContextGraph({
      project: next,
      sources: intelligence.sources,
      evidence: intelligence.evidence,
      requirements: intelligence.requirements,
      stakeholders: intelligence.stakeholders,
      journeys: intelligence.journeys,
      openQuestions: intelligence.openQuestions,
      contextPackages: intelligence.contextPackages,
    });
    next = {
      ...next,
      requirementsIntelligence: {
        ...intelligence,
        contextGraph: graph,
        lastCompiledAt: graph.compiledAt,
      },
    };
  }
  return next;
}
