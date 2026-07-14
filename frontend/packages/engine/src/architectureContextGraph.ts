import type {
  ArchitectureContextGraph,
  ArchitectureContextGraphEdge,
  ArchitectureContextGraphEdgeKind,
  ArchitectureContextGraphNode,
  ArchitectureContextGraphNodeKind,
  ArchitectureGraphSupplementalRecord,
  ArchitectureLineageInference,
  ArchitectureContextPackage,
  ArchitectureProject,
  ArchitectureSemanticChange,
  CanonicalRequirementRecord,
  RequirementEvidenceReference,
  RequirementOpenQuestion,
  RequirementSourceRecord,
  RequirementStakeholder,
  SolutionJourney,
} from '@aiw/domain';

export interface ArchitectureContextGraphInput {
  project: ArchitectureProject;
  sources: RequirementSourceRecord[];
  evidence: RequirementEvidenceReference[];
  requirements: CanonicalRequirementRecord[];
  stakeholders: RequirementStakeholder[];
  journeys: SolutionJourney[];
  openQuestions: RequirementOpenQuestion[];
  contextPackages: ArchitectureContextPackage[];
  supplementalRecords?: ArchitectureGraphSupplementalRecord[];
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return `fnv1a-${(result >>> 0).toString(16).padStart(8, '0')}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
}

function graphStatus(value: string | undefined): ArchitectureContextGraphNode['status'] {
  if (value === 'accepted' || value === 'reviewed') return 'accepted';
  if (value === 'approved') return 'approved';
  if (value === 'rejected' || value === 'deprecated') return 'rejected';
  if (value === 'open' || value === 'needs-clarification') return 'open';
  return 'candidate';
}

function node(input: {
  id: string;
  kind: ArchitectureContextGraphNodeKind;
  label: string;
  summary?: string;
  status?: ArchitectureContextGraphNode['status'];
  stageRefs?: string[];
  sourceObjectRef?: string;
  metadata?: ArchitectureContextGraphNode['metadata'];
}): ArchitectureContextGraphNode {
  const metadata = input.metadata ?? {};
  const stageRefs = unique(input.stageRefs ?? []);
  const summary = input.summary ?? input.label;
  return {
    id: input.id,
    kind: input.kind,
    label: input.label,
    summary,
    status: input.status ?? 'informational',
    stageRefs,
    sourceObjectRef: input.sourceObjectRef ?? input.id,
    fingerprint: hash(JSON.stringify({ kind: input.kind, label: input.label, summary, stageRefs, metadata, status: input.status })),
    metadata,
  };
}

function edge(input: {
  sourceId: string;
  targetId: string;
  kind: ArchitectureContextGraphEdgeKind;
  rationale: string;
  evidenceRefs?: string[];
  stageRefs?: string[];
  inference?: ArchitectureLineageInference;
}): ArchitectureContextGraphEdge {
  const stageRefs = unique(input.stageRefs ?? []);
  const evidenceRefs = unique(input.evidenceRefs ?? []);
  return {
    id: `ACGE-${hash(`${input.sourceId}|${input.targetId}|${input.kind}|${input.rationale}`)}`,
    sourceId: input.sourceId,
    targetId: input.targetId,
    kind: input.kind,
    rationale: input.rationale,
    evidenceRefs,
    stageRefs,
    ...(input.inference ? { inference: input.inference } : {}),
  };
}

function stageForContextTarget(target: string): string[] {
  if (target === 'qualityDrivers') return ['qualityDrivers'];
  if (target === 'systemContext') return ['systemContext'];
  if (target === 'logicalApplication') return ['logicalApplication'];
  if (target === 'applicationRealization') return ['applicationRealization'];
  if (target === 'logicalTechnology') return ['logicalTechnology'];
  if (target === 'physicalTechnology') return ['physicalTechnology'];
  if (target === 'reviewAssurance') return ['reviewAssurance'];
  if (target === 'sddPack') return ['sddPack'];
  return [];
}

function addNode(map: Map<string, ArchitectureContextGraphNode>, value: ArchitectureContextGraphNode): void {
  const existing = map.get(value.id);
  if (!existing) map.set(value.id, value);
  else map.set(value.id, {
    ...existing,
    stageRefs: unique([...existing.stageRefs, ...value.stageRefs]),
    metadata: { ...existing.metadata, ...value.metadata },
  });
}


function semanticTokens(value: string): string[] {
  const stop = new Set(['the','and','for','with','from','into','shall','should','must','this','that','system','architecture','solution']);
  return unique(value.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((item) => item.length > 3 && !stop.has(item)));
}

function semanticSimilarity(left: string, right: string): number {
  const a = new Set(semanticTokens(left));
  const b = new Set(semanticTokens(right));
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / Math.max(1, Math.min(a.size, b.size));
}

function inferLegacyLineage(nodes: Map<string, ArchitectureContextGraphNode>, edges: ArchitectureContextGraphEdge[]): ArchitectureContextGraphEdge[] {
  const explicitTargets = new Set(edges.filter((item) => item.kind === 'realizes' || item.kind === 'derived-from').map((item) => item.targetId));
  const requirements = [...nodes.values()].filter((item) => item.kind === 'requirement' && (item.status === 'accepted' || item.status === 'approved'));
  const inferred: ArchitectureContextGraphEdge[] = [];
  for (const candidate of [...nodes.values()].filter((item) => ['architecture-object','architecture-interface','decision','finding'].includes(item.kind) && !explicitTargets.has(item.id))) {
    const candidateText = `${candidate.label} ${candidate.summary} ${(Array.isArray(candidate.metadata.tags) ? candidate.metadata.tags.join(' ') : '')}`;
    const ranked = requirements.map((requirement) => ({ requirement, score: semanticSimilarity(candidateText, `${requirement.label} ${requirement.summary}`) })).sort((a,b) => b.score-a.score);
    const best = ranked[0];
    if (!best || best.score < 0.58) continue;
    const confidence = Math.min(0.96, Number((0.55 + best.score * 0.42).toFixed(3)));
    const requiresReview = confidence < 0.85;
    inferred.push(edge({
      sourceId: best.requirement.id,
      targetId: candidate.id,
      kind: 'inferred-lineage',
      rationale: `Legacy lineage inferred from normalized semantic overlap between requirement and ${candidate.kind}.`,
      stageRefs: candidate.stageRefs,
      inference: { method: 'semantic-label', confidence, requiresReview, reasons: [`semantic-overlap:${best.score.toFixed(3)}`, `legacy-target:${candidate.id}`] },
    }));
  }
  return inferred;
}

function calculateCoverage(nodes: ArchitectureContextGraphNode[], edges: ArchitectureContextGraphEdge[]) {
  const byNodeKind: Record<string, number> = {};
  const byEdgeKind: Record<string, number> = {};
  for (const item of nodes) byNodeKind[item.kind] = (byNodeKind[item.kind] ?? 0) + 1;
  for (const item of edges) byEdgeKind[item.kind] = (byEdgeKind[item.kind] ?? 0) + 1;
  const ratio = (kind: ArchitectureContextGraphNodeKind, edgeKinds: ArchitectureContextGraphEdgeKind[]) => {
    const relevant = nodes.filter((item) => item.kind === kind);
    if (!relevant.length) return 1;
    const linked = new Set(edges.filter((item) => edgeKinds.includes(item.kind)).flatMap((item) => [item.sourceId,item.targetId]));
    return Number((relevant.filter((item) => linked.has(item.id)).length / relevant.length).toFixed(4));
  };
  const legacy = nodes.filter((item) => ['architecture-object','architecture-interface','decision','finding'].includes(item.kind));
  const explicitTargets = new Set(edges.filter((item) => ['realizes','derived-from','governs','substantiates'].includes(item.kind) && !item.inference).map((item) => item.targetId));
  const inferredTargets = new Set(edges.filter((item) => item.kind === 'inferred-lineage').map((item) => item.targetId));
  return {
    byNodeKind,
    byEdgeKind,
    atomicClaimCoverage: ratio('atomic-claim',['derived-from','substantiates','interprets','contradicts']),
    policyCoverage: ratio('policy-clause',['governs','applies-to','contradicts']),
    runtimeObservationCoverage: ratio('runtime-observation',['observed-by','substantiates','validates']),
    sddParagraphCoverage: ratio('sdd-paragraph',['rendered-in','derived-from','substantiates']),
    explicitLineageCoverage: legacy.length ? Number((legacy.filter((item) => explicitTargets.has(item.id)).length / legacy.length).toFixed(4)) : 1,
    inferredLineageCoverage: legacy.length ? Number((legacy.filter((item) => inferredTargets.has(item.id)).length / legacy.length).toFixed(4)) : 0,
    unresolvedLegacyRefs: legacy.filter((item) => !explicitTargets.has(item.id) && !inferredTargets.has(item.id)).map((item) => item.id),
  };
}

export function buildArchitectureContextGraph(input: ArchitectureContextGraphInput): ArchitectureContextGraph {
  const nodes = new Map<string, ArchitectureContextGraphNode>();
  const edges: ArchitectureContextGraphEdge[] = [];
  const addEdge = (value: ArchitectureContextGraphEdge): void => {
    if (!edges.some((item) => item.sourceId === value.sourceId && item.targetId === value.targetId && item.kind === value.kind)) edges.push(value);
  };

  for (const source of input.sources) addNode(nodes, node({
    id: source.id,
    kind: 'source',
    label: source.name,
    summary: source.excerpt,
    status: source.status === 'needs-attention' ? 'open' : source.status === 'replaced' ? 'rejected' : 'accepted',
    sourceObjectRef: source.id,
    metadata: { mediaType: source.mediaType, classification: source.classification, version: source.version, contentHash: source.contentHash },
  }));

  for (const evidence of input.evidence) {
    addNode(nodes, node({ id: evidence.id, kind: 'evidence', label: evidence.locator, summary: evidence.excerpt, status: 'accepted', sourceObjectRef: evidence.id, metadata: { sourceId: evidence.sourceId } }));
    addEdge(edge({ sourceId: evidence.sourceId, targetId: evidence.id, kind: 'contains', rationale: 'The governed source contains this evidence excerpt.', evidenceRefs: [evidence.id] }));
  }

  for (const stakeholder of input.stakeholders) {
    addNode(nodes, node({ id: stakeholder.id, kind: 'stakeholder', label: stakeholder.name, summary: `${stakeholder.role}: ${stakeholder.concerns.join('; ')}`, status: graphStatus(stakeholder.status), stageRefs: ['requirements','systemContext'], sourceObjectRef: stakeholder.id, metadata: { role: stakeholder.role, concerns: stakeholder.concerns, decisionRights: stakeholder.decisionRights } }));
    for (const evidenceRef of stakeholder.evidenceRefs) addEdge(edge({ sourceId: evidenceRef, targetId: stakeholder.id, kind: 'substantiates', rationale: 'Evidence supports the stakeholder or concern record.', evidenceRefs: [evidenceRef], stageRefs: ['requirements'] }));
  }

  for (const requirement of input.requirements) {
    addNode(nodes, node({ id: requirement.id, kind: 'requirement', label: requirement.title, summary: requirement.statement, status: graphStatus(requirement.status), stageRefs: ['requirements', ...(requirement.qualityAttributeHints.length ? ['qualityDrivers'] : [])], sourceObjectRef: requirement.id, metadata: { type: requirement.type, priority: requirement.priority, origin: requirement.origin, confidence: requirement.confidence, qualityAttributeHints: requirement.qualityAttributeHints } }));
    for (const evidenceRef of requirement.evidenceRefs) addEdge(edge({ sourceId: evidenceRef, targetId: requirement.id, kind: 'substantiates', rationale: 'Evidence supports the canonical requirement.', evidenceRefs: [evidenceRef], stageRefs: ['requirements'] }));
    for (const stakeholderRef of requirement.stakeholderRefs) addEdge(edge({ sourceId: stakeholderRef, targetId: requirement.id, kind: 'concerns', rationale: 'The stakeholder has an accountable concern in this requirement.', evidenceRefs: requirement.evidenceRefs, stageRefs: ['requirements'] }));
    for (const attribute of requirement.qualityAttributeHints) {
      const qualityId = `quality-driver:${attribute}`;
      addNode(nodes, node({ id: qualityId, kind: 'quality-driver', label: attribute, summary: `Quality driver inferred or confirmed from accepted requirements: ${attribute}.`, status: 'candidate', stageRefs: ['qualityDrivers'], sourceObjectRef: attribute, metadata: { attributeId: attribute } }));
      addEdge(edge({ sourceId: requirement.id, targetId: qualityId, kind: 'drives', rationale: 'The requirement creates or influences this quality driver.', evidenceRefs: requirement.evidenceRefs, stageRefs: ['qualityDrivers'] }));
    }
  }

  for (const journey of input.journeys) {
    addNode(nodes, node({ id: journey.id, kind: 'journey', label: journey.name, summary: journey.goal || journey.description, status: graphStatus(journey.status), stageRefs: ['requirements','systemContext','logicalApplication'], sourceObjectRef: journey.id, metadata: { priority: journey.priority, origin: journey.origin, qualityHotspots: journey.qualityHotspots, architectureObligations: journey.architectureObligations } }));
    for (const requirementRef of journey.requirementRefs) addEdge(edge({ sourceId: requirementRef, targetId: journey.id, kind: 'represented-by', rationale: 'The journey demonstrates behavioural fulfilment of the requirement.', stageRefs: ['requirements','systemContext'] }));
    for (const participant of journey.participants) {
      const participantId = `participant:${journey.id}:${participant.id}`;
      addNode(nodes, node({ id: participantId, kind: 'participant', label: participant.name, summary: participant.description, status: 'candidate', stageRefs: ['systemContext'], sourceObjectRef: participant.id, metadata: { participantKind: participant.kind, journeyId: journey.id } }));
      addEdge(edge({ sourceId: participantId, targetId: journey.id, kind: 'participates-in', rationale: 'The participant takes part in the solution journey.', stageRefs: ['systemContext'] }));
      if (participant.stakeholderRef) addEdge(edge({ sourceId: participant.stakeholderRef, targetId: participantId, kind: 'derived-from', rationale: 'The journey participant derives from an identified stakeholder.', stageRefs: ['requirements','systemContext'] }));
    }
    for (const path of journey.paths) {
      for (const interaction of path.interactions) {
        const interactionId = `interaction:${journey.id}:${path.id}:${interaction.id}`;
        addNode(nodes, node({ id: interactionId, kind: 'interaction', label: interaction.label, summary: `${path.kind} path · ${interaction.interactionKind}`, status: graphStatus(interaction.status), stageRefs: ['systemContext','logicalApplication','applicationRealization'], sourceObjectRef: interaction.id, metadata: { journeyId: journey.id, pathId: path.id, pathKind: path.kind, sequence: interaction.sequence, dataObjects: interaction.dataObjects, trustBoundaryCrossing: interaction.trustBoundaryCrossing } }));
        addEdge(edge({ sourceId: journey.id, targetId: interactionId, kind: 'contains', rationale: `The ${path.kind} journey path contains this interaction.`, stageRefs: ['systemContext','logicalApplication'] }));
        const fromParticipantRef = `participant:${journey.id}:${interaction.fromParticipantId}`;
        const toParticipantRef = `participant:${journey.id}:${interaction.toParticipantId}`;
        addEdge(edge({ sourceId: fromParticipantRef, targetId: interactionId, kind: 'participates-in', rationale: 'The source participant initiates this governed journey interaction.', stageRefs: ['systemContext','logicalApplication'] }));
        addEdge(edge({ sourceId: interactionId, targetId: toParticipantRef, kind: 'communicates-with', rationale: 'The governed journey interaction reaches the target participant.', stageRefs: ['systemContext','logicalApplication'] }));
        for (const requirementRef of interaction.requirementRefs) addEdge(edge({ sourceId: requirementRef, targetId: interactionId, kind: 'drives', rationale: 'The interaction exists to satisfy a requirement.', stageRefs: ['systemContext','logicalApplication'] }));
        for (const qualityRef of interaction.qualityRefs) {
          const qualityId = qualityRef.startsWith('quality-driver:') ? qualityRef : `quality-driver:${qualityRef}`;
          addNode(nodes, node({ id: qualityId, kind: 'quality-driver', label: qualityRef.replace(/^quality-driver:/, ''), summary: `Quality driver constraining the ${interaction.label} interaction.`, status: 'candidate', stageRefs: ['qualityDrivers','systemContext','logicalApplication'], sourceObjectRef: qualityRef, metadata: { attributeId: qualityRef.replace(/^quality-driver:/, ''), journeyId: journey.id, interactionId: interaction.id } }));
          addEdge(edge({ sourceId: qualityId, targetId: interactionId, kind: 'constrains', rationale: 'The quality driver constrains the journey interaction and its downstream design.', stageRefs: ['qualityDrivers','systemContext','logicalApplication'] }));
        }
      }
    }
    for (const [index, obligation] of journey.architectureObligations.entries()) {
      const obligationId = `obligation:${journey.id}:${index + 1}`;
      addNode(nodes, node({ id: obligationId, kind: 'obligation', label: obligation, summary: obligation, status: 'open', stageRefs: ['logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','reviewAssurance'], sourceObjectRef: obligationId, metadata: { journeyId: journey.id } }));
      addEdge(edge({ sourceId: journey.id, targetId: obligationId, kind: 'drives', rationale: 'The approved journey creates an architecture obligation.', stageRefs: ['logicalApplication','applicationRealization'] }));
    }
  }

  for (const question of input.openQuestions) {
    addNode(nodes, node({ id: question.id, kind: 'open-question', label: question.question, summary: question.whyItMatters, status: question.status === 'open' ? 'open' : 'accepted', stageRefs: ['requirements','qualityDrivers','systemContext'], sourceObjectRef: question.id, metadata: { impact: question.impact, relatedRequirementRefs: question.relatedRequirementRefs, relatedJourneyRefs: question.relatedJourneyRefs } }));
    for (const ref of [...question.relatedRequirementRefs, ...question.relatedJourneyRefs]) addEdge(edge({ sourceId: ref, targetId: question.id, kind: 'affects', rationale: 'The unresolved question affects this requirement or journey.', stageRefs: ['requirements','qualityDrivers','systemContext'] }));
  }

  for (const contextPackage of input.contextPackages) {
    const stageRefs = stageForContextTarget(contextPackage.target);
    addNode(nodes, node({ id: contextPackage.id, kind: 'context-package', label: contextPackage.target, summary: contextPackage.summary, status: 'accepted', stageRefs, sourceObjectRef: contextPackage.id, metadata: { target: contextPackage.target, version: contextPackage.version, fingerprint: contextPackage.contextFingerprint } }));
    for (const ref of [...contextPackage.requirementRefs, ...contextPackage.journeyRefs, ...contextPackage.stakeholderRefs]) addEdge(edge({ sourceId: ref, targetId: contextPackage.id, kind: 'derived-from', rationale: `The ${contextPackage.target} context package is compiled from this canonical record.`, stageRefs }));
  }

  for (const quality of input.project.qualityPriorities) {
    const qualityId = `quality-driver:${quality.attributeId}`;
    addNode(nodes, node({ id: qualityId, kind: 'quality-driver', label: quality.attributeId, summary: quality.rationale ?? `Quality priority weight ${quality.weight}.`, status: 'accepted', stageRefs: ['qualityDrivers'], sourceObjectRef: quality.attributeId, metadata: { weight: quality.weight } }));
  }

  for (const architectureNode of input.project.nodes) {
    const requirementRefs = strings(architectureNode.properties.requirementRefs);
    const journeyRefs = strings(architectureNode.properties.journeyRefs);
    const evidenceRefs = strings(architectureNode.properties.evidenceRefs);
    addNode(nodes, node({ id: architectureNode.id, kind: 'architecture-object', label: architectureNode.label, summary: architectureNode.description ?? String(architectureNode.properties.responsibility ?? architectureNode.kind), status: graphStatus(architectureNode.status), stageRefs: [architectureNode.stage], sourceObjectRef: architectureNode.id, metadata: { entityKind: architectureNode.kind, tags: architectureNode.tags, requirementRefs, journeyRefs, evidenceRefs } }));
    for (const upstreamRef of architectureNode.lineageFrom) addEdge(edge({ sourceId: upstreamRef, targetId: architectureNode.id, kind: 'realizes', rationale: 'Canonical model lineage identifies this architecture object as a refinement or realization.', stageRefs: [architectureNode.stage] }));
    for (const requirementRef of requirementRefs) addEdge(edge({ sourceId: requirementRef, targetId: architectureNode.id, kind: 'realizes', rationale: 'The architecture object explicitly realizes a requirement.', evidenceRefs, stageRefs: [architectureNode.stage] }));
    for (const journeyRef of journeyRefs) addEdge(edge({ sourceId: journeyRef, targetId: architectureNode.id, kind: 'derived-from', rationale: 'The architecture object derives from an approved journey responsibility.', evidenceRefs, stageRefs: [architectureNode.stage] }));
  }

  for (const architectureEdge of input.project.edges) addEdge(edge({ sourceId: architectureEdge.sourceId, targetId: architectureEdge.targetId, kind: architectureEdge.kind === 'communicatesWith' ? 'communicates-with' : architectureEdge.kind === 'dependsOn' ? 'depends-on' : architectureEdge.kind === 'constrains' ? 'constrains' : architectureEdge.kind === 'derivedFrom' ? 'derived-from' : 'realizes', rationale: architectureEdge.label ?? `Canonical ${architectureEdge.kind} relationship.`, stageRefs: [architectureEdge.stage] }));

  for (const item of input.project.interfaces ?? []) {
    addNode(nodes, node({ id: item.id, kind: 'architecture-interface', label: item.name, summary: `${item.operationOrEvent} · ${item.interactionStyle} · ${item.protocol}`, status: item.lifecycleStatus === 'active' ? 'approved' : item.lifecycleStatus === 'proposed' ? 'candidate' : 'rejected', stageRefs: [item.stage], sourceObjectRef: item.id, metadata: { providerNodeId: item.providerNodeId, consumerNodeIds: item.consumerNodeIds, dataClassification: item.dataClassification, evidenceIds: item.evidenceIds } }));
    addEdge(edge({ sourceId: item.providerNodeId, targetId: item.id, kind: 'realizes', rationale: 'The provider owns this interface contract.', evidenceRefs: item.evidenceIds, stageRefs: [item.stage] }));
    for (const consumerId of item.consumerNodeIds) addEdge(edge({ sourceId: item.id, targetId: consumerId, kind: 'communicates-with', rationale: 'The consumer uses the governed interface contract.', evidenceRefs: item.evidenceIds, stageRefs: [item.stage] }));
    for (const evidenceId of item.evidenceIds) addEdge(edge({ sourceId: evidenceId, targetId: item.id, kind: 'substantiates', rationale: 'Governed evidence supports the interface contract and its obligations.', evidenceRefs: [evidenceId], stageRefs: [item.stage] }));
  }

  for (const decision of input.project.decisions) {
    addNode(nodes, node({ id: decision.id, kind: 'decision', label: decision.title, summary: decision.decision, status: graphStatus(decision.status), stageRefs: [input.project.activeStage], sourceObjectRef: decision.id, metadata: { drivers: decision.drivers, consideredOptions: decision.consideredOptions, linkedRecordIds: decision.linkedRecordIds ?? [] } }));
    for (const ref of decision.linkedRecordIds ?? []) addEdge(edge({ sourceId: ref, targetId: decision.id, kind: 'governs', rationale: 'The decision governs or dispositions the linked architecture record.', stageRefs: [input.project.activeStage] }));
  }

  for (const finding of input.project.findings) {
    addNode(nodes, node({ id: finding.id, kind: 'finding', label: finding.title, summary: finding.message, status: finding.severity === 'HARD' ? 'open' : 'candidate', stageRefs: ['reviewAssurance'], sourceObjectRef: finding.id, metadata: { severity: finding.severity, ruleId: finding.ruleId } }));
    for (const ref of [...finding.affectedNodeIds, ...finding.affectedEdgeIds]) addEdge(edge({ sourceId: ref, targetId: finding.id, kind: 'validates', rationale: 'The assurance finding evaluates this architecture record.', stageRefs: ['reviewAssurance'] }));
  }

  for (const record of input.supplementalRecords ?? []) {
    addNode(nodes, node({ id: record.id, kind: record.kind, label: record.label, summary: record.summary, status: record.status ?? 'accepted', stageRefs: record.stageRefs ?? [], sourceObjectRef: record.sourceObjectRef ?? record.id, metadata: record.metadata ?? {} }));
  }
  for (const record of input.supplementalRecords ?? []) for (const link of record.links ?? []) addEdge(edge({ sourceId: record.id, targetId: link.targetId, kind: link.kind, rationale: link.rationale, evidenceRefs: link.evidenceRefs ?? [], stageRefs: link.stageRefs ?? record.stageRefs ?? [] }));
  for (const inferred of inferLegacyLineage(nodes, edges)) addEdge(inferred);

  const nodeList = [...nodes.values()].sort((left, right) => left.id.localeCompare(right.id));
  const edgeList = edges.filter((item) => nodes.has(item.sourceId) && nodes.has(item.targetId)).sort((left, right) => left.id.localeCompare(right.id));
  const stageNames = unique(nodeList.flatMap((item) => item.stageRefs));
  const stageSlices = stageNames.map((stage) => {
    const nodeRefs = nodeList.filter((item) => item.stageRefs.includes(stage)).map((item) => item.id);
    const nodeSet = new Set(nodeRefs);
    const edgeRefs = edgeList.filter((item) => item.stageRefs.includes(stage) || (nodeSet.has(item.sourceId) && nodeSet.has(item.targetId))).map((item) => item.id);
    const unresolvedRefs = nodeList.filter((item) => nodeSet.has(item.id) && item.status === 'open').map((item) => item.id);
    const staleRefs = nodeList.filter((item) => nodeSet.has(item.id) && item.status === 'stale').map((item) => item.id);
    return { stage, nodeRefs, edgeRefs, unresolvedRefs, staleRefs, fingerprint: hash(JSON.stringify({ stage, nodeRefs, edgeRefs, unresolvedRefs, staleRefs })) };
  });
  return {
    schemaVersion: '1.1', projectId: input.project.id, branchId: input.project.branch.id, projectRevision: input.project.revision,
    compiledAt: new Date().toISOString(), fingerprint: hash(JSON.stringify({ projectRevision: input.project.revision, nodes: nodeList.map((item) => [item.id, item.fingerprint]), edges: edgeList.map((item) => item.id) })),
    nodes: nodeList, edges: edgeList, stageSlices, coverage: calculateCoverage(nodeList, edgeList),
  };
}

function traversal(graph: ArchitectureContextGraph, startRef: string, maxDepth = 8): { refs: string[]; stages: string[] } {
  const outgoing = new Map<string, string[]>();
  for (const item of graph.edges) {
    if (item.inference && (item.inference.requiresReview || item.inference.confidence < 0.85)) continue;
    outgoing.set(item.sourceId, [...(outgoing.get(item.sourceId) ?? []), item.targetId]);
  }
  const visited = new Set<string>([startRef]);
  let frontier = [startRef];
  for (let depth = 0; depth < maxDepth && frontier.length; depth += 1) {
    const next: string[] = [];
    for (const current of frontier) for (const target of outgoing.get(current) ?? []) if (!visited.has(target)) { visited.add(target); next.push(target); }
    frontier = next;
  }
  const refs = [...visited].filter((item) => item !== startRef);
  const stages = unique(refs.flatMap((ref) => graph.nodes.find((item) => item.id === ref)?.stageRefs ?? []));
  return { refs, stages };
}

export function detectArchitectureSemanticChanges(input: {
  previousRequirements: CanonicalRequirementRecord[];
  nextRequirements: CanonicalRequirementRecord[];
  nextGraph: ArchitectureContextGraph;
  previousGraph?: ArchitectureContextGraph;
}): ArchitectureSemanticChange[] {
  const previous = new Map(input.previousRequirements.map((item) => [item.id, item]));
  const next = new Map(input.nextRequirements.map((item) => [item.id, item]));
  const changes: ArchitectureSemanticChange[] = [];
  const now = new Date().toISOString();
  const record = (ref: string, kind: ArchitectureSemanticChange['changeKind'], summary: string, priority: CanonicalRequirementRecord['priority'] | undefined): void => {
    const primaryGraph = kind === 'removed' && input.previousGraph ? input.previousGraph : input.nextGraph;
    const primary = traversal(primaryGraph, ref);
    const secondary = kind === 'modified' && input.previousGraph ? traversal(input.previousGraph, ref) : { refs: [], stages: [] };
    const affectedRefs = unique([...primary.refs, ...secondary.refs]);
    const affectedStages = unique([...primary.stages, ...secondary.stages]);
    changes.push({ id: `SEM-${hash(`${ref}|${kind}|${summary}`)}`, changedRef: ref, changeKind: kind, summary, affectedRefs, affectedStages, impact: priority === 'critical' ? 'critical' : priority === 'high' ? 'high' : affectedStages.includes('physicalTechnology') || affectedStages.includes('reviewAssurance') ? 'high' : 'medium', detectedAt: now, requiresReassessment: affectedRefs.length > 0 || affectedStages.length > 0, lineageBasis: primaryGraph.edges.some((edge) => edge.inference && edge.sourceId === ref && edge.inference.confidence >= 0.85) ? 'mixed' : 'explicit', unresolvedLegacyRefs: primaryGraph.coverage.unresolvedLegacyRefs });
  };
  for (const [id, item] of next) {
    const prior = previous.get(id);
    if (!prior) record(id, 'added', `Requirement added: ${item.title}`, item.priority);
    else {
      const priorFingerprint = hash(JSON.stringify({ title: prior.title, statement: prior.statement, priority: prior.priority, status: prior.status, acceptanceCriteria: prior.acceptanceCriteria, qualityAttributeHints: prior.qualityAttributeHints }));
      const nextFingerprint = hash(JSON.stringify({ title: item.title, statement: item.statement, priority: item.priority, status: item.status, acceptanceCriteria: item.acceptanceCriteria, qualityAttributeHints: item.qualityAttributeHints }));
      if (priorFingerprint !== nextFingerprint) record(id, prior.status !== 'accepted' && item.status === 'accepted' ? 'accepted' : item.status === 'rejected' ? 'rejected' : 'modified', `Requirement changed: ${item.title}`, item.priority);
    }
  }
  for (const [id, item] of previous) if (!next.has(id)) record(id, 'removed', `Requirement removed: ${item.title}`, item.priority);
  return changes;
}


/** Marks only downstream architecture projections as stale; source evidence and the
 * newly accepted requirement remain authoritative. This makes staleness semantic
 * rather than a whole-project revision flag. */
export function applyArchitectureSemanticStaleness(
  graph: ArchitectureContextGraph,
  changes: ArchitectureSemanticChange[],
): ArchitectureContextGraph {
  const directlyChanged = new Set(changes.map((item) => item.changedRef));
  const affectedRefs = new Set(changes.flatMap((item) => item.affectedRefs));
  // Sources, requirements, journeys, questions and context packages are rebuilt by
  // the current requirements compilation and are therefore current by construction.
  // Only durable downstream design/assurance records that pre-date this compilation
  // can become semantically stale.
  const staleEligibleKinds = new Set<ArchitectureContextGraphNodeKind>([
    'architecture-object',
    'architecture-interface',
    'decision',
    'finding',
    'data-entity',
    'deployment-node',
    'threat',
    'security-control',
    'fitness-test',
    'sdd-section',
    'sdd-paragraph',
  ]);
  const staleRefs = new Set(
    graph.nodes
      .filter((item) => affectedRefs.has(item.id) && staleEligibleKinds.has(item.kind))
      .map((item) => item.id),
  );
  const nodes = graph.nodes.map((item) => staleRefs.has(item.id) && !directlyChanged.has(item.id)
    ? { ...item, status: 'stale' as const, metadata: { ...item.metadata, staleReason: 'Upstream requirement semantics changed; reassessment is required.' } }
    : item);
  const stages = unique(nodes.flatMap((item) => item.stageRefs));
  const stageSlices = stages.map((stage) => {
    const nodeRefs = nodes.filter((item) => item.stageRefs.includes(stage)).map((item) => item.id);
    const nodeSet = new Set(nodeRefs);
    const edgeRefs = graph.edges.filter((item) => item.stageRefs.includes(stage) || (nodeSet.has(item.sourceId) && nodeSet.has(item.targetId))).map((item) => item.id);
    const unresolvedRefs = nodes.filter((item) => nodeSet.has(item.id) && item.status === 'open').map((item) => item.id);
    const sliceStaleRefs = nodes.filter((item) => nodeSet.has(item.id) && item.status === 'stale').map((item) => item.id);
    return { stage, nodeRefs, edgeRefs, unresolvedRefs, staleRefs: sliceStaleRefs, fingerprint: hash(JSON.stringify({ stage, nodeRefs, edgeRefs, unresolvedRefs, staleRefs: sliceStaleRefs })) };
  });
  return {
    ...graph,
    nodes,
    stageSlices,
    coverage: calculateCoverage(nodes, graph.edges),
    fingerprint: hash(JSON.stringify({ projectRevision: graph.projectRevision, nodes: nodes.map((item) => [item.id, item.fingerprint, item.status]), edges: graph.edges.map((item) => item.id) })),
  };
}
