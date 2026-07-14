import type {
  ArchitectureEdge,
  ArchitectureNode,
  ArchitectureProject,
  ArchitectureStage,
  ArchitectureView,
  ArchitectureViewpointDefinition,
  ArchitectureViewpointKind,
  EntityKind,
  RelationshipKind,
  StageTransitionCandidate,
  StageTransitionCoverage,
  StageTransitionProposal,
} from '@aiw/domain';

const stageSequence: ArchitectureStage[] = [
  'designIntent',
  'logicalApplication',
  'applicationRealization',
  'logicalTechnology',
  'physicalTechnology',
  'validationRealization',
];

const relationshipKindsForFlow: RelationshipKind[] = [
  'communicatesWith', 'exposes', 'consumes', 'publishes', 'subscribes',
  'reads', 'writes', 'stores', 'dependsOn', 'requires',
];

export const architectureViewpointDefinitions: ArchitectureViewpointDefinition[] = [
  {
    id: 'system-context', name: 'System Context', shortName: 'Context',
    description: 'Actors, external systems, the system boundary and principal interactions.',
    intent: 'Explain who uses the system, what surrounds it and the major exchanges across its boundary.',
    stages: ['logicalApplication'],
    includeKinds: ['System','Actor','ExternalSystem','Domain'],
    includeTags: ['context','boundary','channel'],
    relationshipKinds: ['communicatesWith','consumes','exposes','dependsOn'],
  },
  {
    id: 'logical-application', name: 'Logical Application', shortName: 'Logical',
    description: 'Domains, logical services, responsibilities, information ownership and dependencies.',
    intent: 'Show what the solution does without committing to deployment units or products.',
    stages: ['logicalApplication'],
    includeKinds: ['Actor','ExternalSystem','Domain','Capability','LogicalService','API','Event','DataDomain','DataEntity','DataStore'],
    includeTags: ['logical','domain','responsibility'],
    relationshipKinds: relationshipKindsForFlow,
  },
  {
    id: 'application-realization', name: 'Application Realization', shortName: 'Realization',
    description: 'Applications, deployable units, modules, APIs, workers, adapters and owned data.',
    intent: 'Show how logical responsibilities become implementable software units and contracts.',
    stages: ['applicationRealization'],
    includeKinds: ['ApplicationComponent','Module','DeployableUnit','Interface','API','Event','DataDomain','DataEntity','DataStore','Control','ExternalSystem'],
    includeTags: ['realization','application','service','worker','adapter'],
    relationshipKinds: relationshipKindsForFlow,
  },
  {
    id: 'interface-event-flow', name: 'Interface & Event Flow', shortName: 'Interfaces',
    description: 'Providers, consumers, APIs, events, streams, protocols and failure semantics.',
    intent: 'Make every integration contract and asynchronous interaction visible.',
    stages: ['logicalApplication','applicationRealization','logicalTechnology'],
    includeKinds: ['Interface','API','Event','ApplicationComponent','DeployableUnit','LogicalService','ExternalSystem','LogicalTechnologyCapability'],
    includeTags: ['interface','integration','event','stream','api','message'],
    relationshipKinds: ['communicatesWith','exposes','consumes','publishes','subscribes','reads','writes','dependsOn'],
  },
  {
    id: 'data-architecture', name: 'Data Architecture', shortName: 'Data',
    description: 'Data domains, entities, stores, ownership, flows, classification and residency.',
    intent: 'Show who owns data, where it moves, how it is stored and which controls apply.',
    stages: ['logicalApplication','applicationRealization','logicalTechnology','physicalTechnology'],
    includeKinds: ['DataDomain','DataEntity','DataStore','LogicalService','DeployableUnit','LogicalTechnologyCapability','TechnologyProduct','Control'],
    includeTags: ['data','database','storage','cache','analytics','residency'],
    relationshipKinds: ['reads','writes','stores','contains','mapsTo','deployedOn','protectedBy'],
  },
  {
    id: 'logical-technology', name: 'Logical Technology', shortName: 'Technology',
    description: 'Vendor-neutral runtime, integration, data, identity, security and observability capabilities.',
    intent: 'Show the capabilities required to realize the application architecture before provider binding.',
    stages: ['logicalTechnology'],
    includeKinds: ['LogicalTechnologyCapability','TechnologyComponent','Control','NetworkZone','Runtime'],
    includeTags: ['capability','platform','runtime','identity','security','observability','integration'],
    relationshipKinds: ['supports','requires','dependsOn','communicatesWith','protectedBy','observedBy','mapsTo'],
  },
  {
    id: 'physical-deployment', name: 'Physical Deployment', shortName: 'Deployment',
    description: 'Provider products, environments, regions, zones, clusters, runtime nodes and network topology.',
    intent: 'Show how the architecture will run and where each logical capability is realized.',
    stages: ['physicalTechnology'],
    includeKinds: ['TechnologyProduct','TechnologyComponent','DeploymentNode','Environment','Region','AvailabilityZone','NetworkZone','Runtime','Control','DataStore'],
    includeTags: ['deployment','physical','region','cluster','network','product'],
    relationshipKinds: ['deployedOn','hostedBy','locatedIn','contains','dependsOn','communicatesWith','protectedBy','observedBy','mapsTo'],
  },
  {
    id: 'security-trust', name: 'Security & Trust Boundaries', shortName: 'Security',
    description: 'Identity flows, trust zones, sensitive data, enforcement points and cryptographic controls.',
    intent: 'Reveal trust changes and the controls protecting each boundary and sensitive flow.',
    stages: ['logicalApplication','applicationRealization','logicalTechnology','physicalTechnology'],
    includeKinds: ['Actor','ExternalSystem','API','DataStore','Control','NetworkZone','LogicalTechnologyCapability','TechnologyProduct','DeploymentNode'],
    includeTags: ['security','identity','trust','authentication','authorization','encryption','restricted','confidential'],
    relationshipKinds: ['communicatesWith','exposes','consumes','protectedBy','governedBy','reads','writes','locatedIn'],
  },
  {
    id: 'resilience-recovery', name: 'Resilience & Recovery', shortName: 'Resilience',
    description: 'Redundancy, failover, queues, replication, backup, recovery objectives and failure paths.',
    intent: 'Show how the design behaves during faults and how service and data are recovered.',
    stages: ['applicationRealization','logicalTechnology','physicalTechnology'],
    includeKinds: ['DeployableUnit','Event','DataStore','LogicalTechnologyCapability','TechnologyProduct','DeploymentNode','Region','AvailabilityZone','Runtime','Control','Risk'],
    includeTags: ['resilience','availability','recovery','backup','failover','replication','retry','circuit-breaker','queue'],
    relationshipKinds: ['dependsOn','requires','supports','deployedOn','hostedBy','locatedIn','publishes','subscribes','mitigates','observedBy'],
  },
  {
    id: 'cross-stage-traceability', name: 'Cross-Stage Traceability', shortName: 'Traceability',
    description: 'Requirement-to-logical-to-realization-to-technology-to-deployment lineage.',
    intent: 'Prove that every downstream element has an upstream reason and every upstream responsibility is realized.',
    stages: ['designIntent','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','validationRealization'],
    includeKinds: [], includeTags: [],
    relationshipKinds: ['motivates','constrains','satisfies','realizes','implements','mapsTo','supports','deployedOn','derivedFrom','selectedBecauseOf','governedBy'],
  },
];

function titleCaseStage(stage: ArchitectureStage): string {
  return stage.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

function stableViewId(project: ArchitectureProject, viewpointId: ArchitectureViewpointKind): string {
  return `viewbook-${project.id}-${project.branch.id}-${viewpointId}`;
}

function matchingNodeIds(project: ArchitectureProject, definition: ArchitectureViewpointDefinition): string[] {
  const kindSet = new Set<EntityKind>(definition.includeKinds);
  const stageSet = new Set(definition.stages);
  const tagSet = new Set(definition.includeTags.map((tag) => tag.toLowerCase()));
  const direct = project.nodes.filter((node) => {
    if (definition.id === 'cross-stage-traceability') return true;
    const stageMatch = stageSet.has(node.stage);
    const kindMatch = kindSet.has(node.kind);
    const tagMatch = node.tags.some((tag) => tagSet.has(tag.toLowerCase())) ||
      Object.values(node.properties).some((value) => typeof value === 'string' && [...tagSet].some((tag) => value.toLowerCase().includes(tag)));
    return stageMatch && (kindMatch || tagMatch);
  });
  const ids = new Set(direct.map((node) => node.id));

  if (['interface-event-flow','data-architecture','security-trust','resilience-recovery','cross-stage-traceability'].includes(definition.id)) {
    const relationshipSet = new Set(definition.relationshipKinds);
    for (const edge of project.edges) {
      if (!relationshipSet.has(edge.kind)) continue;
      if (ids.has(edge.sourceId) || ids.has(edge.targetId) || definition.id === 'cross-stage-traceability') {
        ids.add(edge.sourceId); ids.add(edge.targetId);
      }
    }
    for (const contract of project.interfaces ?? []) {
      if (definition.id === 'interface-event-flow' || definition.id === 'security-trust' || definition.id === 'cross-stage-traceability') {
        ids.add(contract.providerNodeId);
        contract.consumerNodeIds.forEach((id) => ids.add(id));
      }
    }
  }
  return [...ids];
}


export function materializeArchitectureViewpoint(
  project: ArchitectureProject,
  definition: ArchitectureViewpointDefinition,
  createdBy = 'system',
): ArchitectureView {
  const now = new Date().toISOString();
  const nodeIds = matchingNodeIds(project, definition);
  const nodeIdSet = new Set(nodeIds);
  const edgeIds = project.edges
    .filter((edge) => nodeIdSet.has(edge.sourceId) && nodeIdSet.has(edge.targetId) &&
      (definition.id === 'cross-stage-traceability' || definition.relationshipKinds.includes(edge.kind)))
    .map((edge) => edge.id);
  return {
    id: stableViewId(project, definition.id),
    projectId: project.id,
    branchId: project.branch.id,
    name: definition.name,
    viewpointId: definition.id,
    kind: definition.id === 'security-trust' ? 'security' : definition.id === 'physical-deployment' ? 'deployment' : 'model',
    density: definition.id === 'system-context' ? 'executive' : definition.id === 'cross-stage-traceability' ? 'detailed' : 'standard',
    description: definition.description,
    intent: definition.intent,
    filters: { stages: definition.stages, includeNodeIds: nodeIds, showFindings: true, showEvidence: true },
    nodeStates: {}, edgeStates: {},
    layers: [
      { id: `layer-viewpoint-${definition.id}`, name: definition.name, kind: 'stage', visible: true, locked: true, nodeIds, edgeIds, order: 0 },
      { id: `layer-relationships-${definition.id}`, name: 'Relevant relationships', kind: 'relationship', visible: true, locked: false, nodeIds: [], edgeIds, order: 1 },
    ],
    comments: [], createdAt: now, updatedAt: now, createdBy, version: 1,
  };
}

export function createArchitectureViewbook(project: ArchitectureProject, createdBy = 'system'): ArchitectureView[] {
  return architectureViewpointDefinitions.map((definition) => materializeArchitectureViewpoint(project, definition, createdBy));
}

export function mergeArchitectureViewbook(project: ArchitectureProject, createdBy = 'system'): ArchitectureProject {
  const generated = createArchitectureViewbook(project, createdBy);
  const generatedIds = new Set(generated.map((view) => view.id));
  return {
    ...project,
    architectureViews: [
      ...(project.architectureViews ?? []).filter((view) => !generatedIds.has(view.id)),
      ...generated,
    ],
  };
}

function priorStage(targetStage: ArchitectureStage): ArchitectureStage | null {
  const index = stageSequence.indexOf(targetStage);
  return index > 0 ? stageSequence[index - 1]! : null;
}

const targetKindMappings: Partial<Record<ArchitectureStage, Partial<Record<EntityKind, EntityKind[]>>>> = {
  applicationRealization: {
    Domain: ['ApplicationComponent'], Capability: ['ApplicationComponent'], LogicalService: ['DeployableUnit'],
    API: ['API'], Event: ['Event'], DataDomain: ['DataDomain'], DataEntity: ['DataEntity'], DataStore: ['DataStore'], ExternalSystem: ['ExternalSystem'],
  },
  logicalTechnology: {
    ApplicationComponent: ['LogicalTechnologyCapability'], DeployableUnit: ['LogicalTechnologyCapability'], Module: ['LogicalTechnologyCapability'],
    API: ['LogicalTechnologyCapability'], Event: ['LogicalTechnologyCapability'], DataStore: ['LogicalTechnologyCapability'], Control: ['LogicalTechnologyCapability'],
  },
  physicalTechnology: {
    LogicalTechnologyCapability: ['TechnologyProduct'], TechnologyComponent: ['TechnologyProduct'], Runtime: ['DeploymentNode'],
    NetworkZone: ['NetworkZone'], DataStore: ['TechnologyProduct'], Control: ['TechnologyProduct'],
  },
};

function proposedLabel(source: ArchitectureNode, targetKind: EntityKind): string {
  const suffix: Partial<Record<EntityKind,string>> = {
    ApplicationComponent: 'Application', DeployableUnit: 'Service', LogicalTechnologyCapability: 'Capability',
    TechnologyProduct: 'Product Binding', DeploymentNode: 'Runtime Node',
  };
  return `${source.label} ${suffix[targetKind] ?? ''}`.trim();
}

function transitionRelationship(targetStage: ArchitectureStage): RelationshipKind {
  return targetStage === 'applicationRealization' ? 'realizes' : targetStage === 'logicalTechnology' ? 'implements' : 'mapsTo';
}

function candidatePosition(index: number, targetStage: ArchitectureStage) {
  return { x: 140 + (index % 4) * 260, y: 120 + Math.floor(index / 4) * 170 };
}

export function analyseStageTransitionCoverage(project: ArchitectureProject, targetStage: ArchitectureStage): StageTransitionCoverage {
  const sourceStage = priorStage(targetStage);
  if (!sourceStage) return { upstreamNodeCount: 0, realizedUpstreamNodeCount: 0, unresolvedUpstreamNodeIds: [], orphanedTargetNodeIds: [], coveragePercent: 100 };
  const upstream = project.nodes.filter((node) => node.stage === sourceStage);
  const downstream = project.nodes.filter((node) => node.stage === targetStage);
  const realized = new Set(downstream.flatMap((node) => node.lineageFrom));
  const unresolved = upstream.filter((node) => !realized.has(node.id)).map((node) => node.id);
  const upstreamIds = new Set(upstream.map((node) => node.id));
  const orphaned = downstream.filter((node) => !node.lineageFrom.some((id) => upstreamIds.has(id)) && !node.properties.requirementId && !node.properties.patternId).map((node) => node.id);
  return {
    upstreamNodeCount: upstream.length,
    realizedUpstreamNodeCount: upstream.length - unresolved.length,
    unresolvedUpstreamNodeIds: unresolved,
    orphanedTargetNodeIds: orphaned,
    coveragePercent: upstream.length ? Math.round(((upstream.length - unresolved.length) / upstream.length) * 100) : 100,
  };
}

export function createStageTransitionProposal(project: ArchitectureProject, targetStage: ArchitectureStage, createdBy = 'system'): StageTransitionProposal {
  const sourceStage = priorStage(targetStage);
  if (!sourceStage || !targetKindMappings[targetStage]) {
    return { id: `transition-${project.id}-${targetStage}-${Date.now()}`, projectId: project.id, branchId: project.branch.id, sourceStage: targetStage, targetStage, createdAt: new Date().toISOString(), createdBy, candidates: [], coverage: analyseStageTransitionCoverage(project, targetStage), warnings: ['This stage does not have an automatic downstream transformation contract.'] };
  }
  const existingSemanticKeys = new Set(project.nodes.filter((node) => node.stage === targetStage).map((node) => `${node.kind}:${node.lineageFrom.slice().sort().join('|')}`));
  const mappings = targetKindMappings[targetStage]!;
  const candidates: StageTransitionCandidate[] = [];
  let index = 0;
  for (const source of project.nodes.filter((node) => node.stage === sourceStage)) {
    const targetKinds = mappings[source.kind] ?? [];
    for (const targetKind of targetKinds) {
      const semanticKey = `${targetKind}:${source.id}`;
      if (existingSemanticKeys.has(semanticKey)) continue;
      const knowledgeRecordIds = [source.properties.libraryRecordId, source.properties.patternId].filter((value): value is string => typeof value === 'string');
      const proposedNode: ArchitectureNode = {
        id: `transition-node-${targetStage}-${source.id}-${targetKind.toLowerCase()}`,
        semanticId: `${project.id}:${source.semanticId ?? source.id}:${targetStage}:${targetKind}`,
        kind: targetKind,
        stage: targetStage,
        label: proposedLabel(source, targetKind),
        description: `Proposed ${titleCaseStage(targetStage)} realization of ${source.label}.`,
        properties: {
          transitionSourceStage: sourceStage,
          transitionTargetStage: targetStage,
          transitionClassification: 'realized',
          generatedBy: 'AIW governed stage-transition contract',
          knowledgeRecordIds,
          ...(source.properties.owner ? { owner: source.properties.owner } : {}),
        },
        lineageFrom: [source.id],
        positions: { [targetStage]: candidatePosition(index++, targetStage) },
        tags: [...new Set([...source.tags, 'transition-proposal', targetStage])],
        status: 'draft',
      };
      candidates.push({
        id: `candidate-${targetStage}-${source.id}-${targetKind.toLowerCase()}`,
        sourceNodeIds: [source.id], targetStage, classification: 'realized', proposedNode,
        proposedRelationshipKind: transitionRelationship(targetStage),
        rationale: `${source.kind} “${source.label}” requires an explicit ${targetKind} projection in ${titleCaseStage(targetStage)}.`,
        knowledgeRecordIds, selected: true,
      });
    }
  }
  const coverage = analyseStageTransitionCoverage(project, targetStage);
  const warnings: string[] = [];
  if (coverage.unresolvedUpstreamNodeIds.length) warnings.push(`${coverage.unresolvedUpstreamNodeIds.length} upstream element(s) are not yet realized.`);
  if (coverage.orphanedTargetNodeIds.length) warnings.push(`${coverage.orphanedTargetNodeIds.length} downstream element(s) have no upstream lineage.`);
  if (!candidates.length) warnings.push('No new deterministic candidates are required; review existing lineage and unresolved obligations.');
  return { id: `transition-${project.id}-${targetStage}-${Date.now()}`, projectId: project.id, branchId: project.branch.id, sourceStage, targetStage, createdAt: new Date().toISOString(), createdBy, candidates, coverage, warnings };
}

export function applyStageTransitionProposal(project: ArchitectureProject, proposal: StageTransitionProposal): ArchitectureProject {
  if (proposal.projectId !== project.id || proposal.branchId !== project.branch.id) throw new Error('Stage transition proposal does not belong to this project branch.');
  const selected = proposal.candidates.filter((candidate) => candidate.selected);
  const nodeIds = new Set(project.nodes.map((node) => node.id));
  const nodes = [...project.nodes];
  const edges = [...project.edges];
  for (const candidate of selected) {
    if (nodeIds.has(candidate.proposedNode.id)) continue;
    nodes.push(structuredClone(candidate.proposedNode)); nodeIds.add(candidate.proposedNode.id);
    for (const sourceId of candidate.sourceNodeIds) {
      const edgeId = `transition-edge-${sourceId}-${candidate.proposedNode.id}`;
      if (edges.some((edge) => edge.id === edgeId)) continue;
      const edge: ArchitectureEdge = {
        id: edgeId, sourceId, targetId: candidate.proposedNode.id,
        kind: candidate.proposedRelationshipKind, stage: proposal.targetStage,
        label: candidate.proposedRelationshipKind,
        properties: { generatedBy: proposal.id, transitionClassification: candidate.classification, knowledgeRecordIds: candidate.knowledgeRecordIds },
      };
      edges.push(edge);
    }
  }
  const next = { ...project, nodes, edges, activeStage: proposal.targetStage, revision: project.revision + 1, updatedAt: new Date().toISOString() };
  return mergeArchitectureViewbook(next, proposal.createdBy);
}
