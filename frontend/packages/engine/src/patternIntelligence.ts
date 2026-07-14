import {
  knowledgeRepositoryConnectors,
  sprint78BenchmarkScenarios,
  sprint78PatternCorpus,
  type ArchitectureEdge,
  type ArchitectureInterface,
  type ArchitectureNode,
  type ArchitectureProject,
  type ArchitectureStage,
  type ArchitectureView,
  type FitnessFunctionArtifact,
  type KnowledgeRepositoryConnector,
  type PatternBenchmarkResult,
  type PatternBenchmarkScenario,
  type PatternCompositionPlan,
  type PatternCompositionRequest,
  type PatternConformanceRule,
  type PatternKnowledgeRecord,
  type PatternRecommendationRequest,
  type PatternRecommendationScore,
  type RecommendationEvidencePack,
  type RepositoryGovernanceDecision,
  type RepositoryGovernancePolicy,
  type RepositoryOperation,
} from '@aiw/domain';

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokens(value: string): Set<string> {
  return new Set(normalizeText(value).split(/\s+/).filter((token) => token.length > 2));
}

function recordText(record: PatternKnowledgeRecord): string {
  return [record.name, ...record.aliases, record.category, record.summary, record.problem, ...record.context, ...record.forces, ...record.tags].join(' ');
}

export interface NormalizedPatternCorpus {
  canonical: PatternKnowledgeRecord[];
  aliases: Record<string, string>;
  duplicateGroups: Array<{ canonicalId: string; duplicateIds: string[]; reason: string }>;
  providerRealizations: Array<{ patternId: string; provider: string; name: string }>;
  warnings: string[];
}

export function normalizePatternCorpus(records: PatternKnowledgeRecord[] = sprint78PatternCorpus): NormalizedPatternCorpus {
  const canonical: PatternKnowledgeRecord[] = [];
  const aliases: Record<string, string> = {};
  const duplicateGroups: NormalizedPatternCorpus['duplicateGroups'] = [];
  const seen = new Map<string, PatternKnowledgeRecord>();
  for (const record of records) {
    const key = normalizeText(record.name);
    const existing = seen.get(key);
    if (existing) {
      duplicateGroups.push({ canonicalId: existing.id, duplicateIds: [record.id], reason: 'Normalized name collision.' });
      continue;
    }
    seen.set(key, record);
    canonical.push(record);
    aliases[key] = record.id;
    for (const alias of record.aliases) aliases[normalizeText(alias)] = record.id;
  }
  const providerRealizations = canonical.flatMap((record) => record.providerRealizations.map((realization) => ({ patternId: record.id, provider: realization.provider, name: realization.name })));
  const warnings: string[] = [];
  if (canonical.some((record) => record.lifecycle === 'approved' && !record.evidence.length)) warnings.push('Approved records without evidence were found.');
  if (canonical.some((record) => record.lifecycle === 'approved' && !record.review.releaseId)) warnings.push('Approved records without a release binding were found.');
  return { canonical, aliases, duplicateGroups, providerRealizations, warnings };
}

export function buildRepositoryGovernancePolicies(connectors: KnowledgeRepositoryConnector[] = knowledgeRepositoryConnectors): RepositoryGovernancePolicy[] {
  return connectors.map((connector) => {
    const productionRecommendationAllowed = connector.lifecycleStatus === 'approved' && connector.ingestionMode === 'content-reviewed' && connector.trustTier <= 2;
    const permittedOperations: RepositoryOperation[] = ['monitor'];
    if (connector.lifecycleStatus !== 'deprecated') permittedOperations.push('snapshot');
    if (connector.ingestionMode === 'content-reviewed') permittedOperations.push('extract-claims');
    if (productionRecommendationAllowed) permittedOperations.push('recommend','generate-template');
    if (connector.license.usePolicy === 'ingest-with-attribution' && connector.license.reviewStatus === 'verified') permittedOperations.push('reuse-code');
    const allOperations: RepositoryOperation[] = ['monitor','snapshot','extract-claims','recommend','generate-template','reuse-code'];
    return {
      connectorId: connector.id,
      repository: connector.repository,
      acquisitionMode: connector.categories.includes('implementation-example') || connector.contentUses.includes('architecture-test-generation') ? 'commit-archive' : 'selected-files',
      monitoringMode: 'scheduled-poll',
      immutableSnapshotRequired: true,
      quarantineRequired: true,
      humanApprovalRequired: true,
      productionRecommendationAllowed,
      permittedOperations,
      prohibitedOperations: allOperations.filter((operation) => !permittedOperations.includes(operation)),
      refreshCadenceDays: connector.refreshCadenceDays,
      licenseGate: connector.license.reviewStatus === 'verified' ? 'verified' : connector.license.reviewStatus === 'metadata-only' ? 'metadata-only' : 'legal-review',
      promptInjectionBoundary: 'treat-as-untrusted-data',
      maxFiles: connector.maxFilesPerRefresh,
      maxFileBytes: connector.maxFileBytes,
    };
  });
}

export function governRepositoryOperation(connectorId: string, operation: RepositoryOperation, policies: RepositoryGovernancePolicy[] = buildRepositoryGovernancePolicies()): RepositoryGovernanceDecision {
  const policy = policies.find((item) => item.connectorId === connectorId);
  if (!policy) return { allowed: false, connectorId, operation, reasons: ['Connector is not registered in the governed source registry.'], requiredControls: ['Register and classify the repository before use.'] };
  const allowed = policy.permittedOperations.includes(operation);
  const reasons = allowed
    ? [`${operation} is permitted by the connector policy.`, operation === 'recommend' ? 'Only claims in an approved knowledge release may be retrieved.' : 'The operation remains subject to snapshot and audit controls.']
    : [`${operation} is prohibited for this source classification or licence posture.`];
  const requiredControls = ['Pin the exact repository commit.','Apply allowlisted and denied path policies.','Create an immutable checksum-addressed snapshot.','Quarantine source content and treat it as untrusted data.','Require human approval before publication.'];
  if (operation === 'recommend') requiredControls.push('Retrieve only approved claims from a signed knowledge release.');
  if (policy.licenseGate !== 'verified') requiredControls.push('Complete licence review before expanding permitted use.');
  return { allowed, connectorId, operation, reasons, requiredControls };
}

function findRecord(idOrAlias: string, records: PatternKnowledgeRecord[]): PatternKnowledgeRecord | undefined {
  const normalized = normalizeText(idOrAlias);
  return records.find((record) => record.id === idOrAlias || normalizeText(record.name) === normalized || record.aliases.some((alias) => normalizeText(alias) === normalized));
}

function projectAcceptedPatterns(project: ArchitectureProject): Set<string> {
  return new Set(project.patternSelections.filter((selection) => selection.status === 'accepted' || selection.status === 'considering').map((selection) => selection.patternId));
}

function compositionSuggestions(record: PatternKnowledgeRecord): string[] {
  const suggestions = new Set(record.complements);
  const name = record.name.toLowerCase();
  if (name.includes('event-driven') || name.includes('publish-subscribe')) ['PAT-IDEMPOTENT-CONSUMER','PAT-DEAD-LETTER-CHANNEL','PAT-SCHEMA-REGISTRY','PAT-DISTRIBUTED-TRACING'].forEach((id) => suggestions.add(id));
  if (name.includes('microservices')) ['PAT-API-GATEWAY','PAT-DATABASE-PER-SERVICE','PAT-DISTRIBUTED-TRACING','PAT-CIRCUIT-BREAKER'].forEach((id) => suggestions.add(id));
  if (name.includes('retrieval-augmented') || name.includes('rag')) ['PAT-AI-GUARDRAILS','PAT-AI-EVALUATION-HARNESS','PAT-PII-REDACTION-PIPELINE'].forEach((id) => suggestions.add(id));
  if (name.includes('multi-tenancy')) ['PAT-TENANT-ISOLATION','PAT-RESOURCE-QUOTA','PAT-AUDIT-TRAIL'].forEach((id) => suggestions.add(id));
  return [...suggestions];
}

function projectHasPrerequisite(project: ArchitectureProject, prerequisite: string): boolean {
  const text = prerequisite.toLowerCase();
  if (text.includes('quality scenario')) return project.qualityScenarios.length > 0 || project.qualityPriorities.length > 0;
  if (text.includes('owner')) return project.members.some((member) => member.status === 'active');
  return true;
}

function stageLabel(stage: ArchitectureStage): string {
  return stage.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (value) => value.toUpperCase());
}

function interfaceStyle(value: NonNullable<PatternKnowledgeRecord['interfaceKit']>[number]['interaction'] | undefined): ArchitectureInterface['interactionStyle'] {
  if (value === 'event') return 'event';
  if (value === 'stream') return 'stream';
  if (value === 'batch') return 'batch';
  return 'request-response';
}

export function composePatterns(request: PatternCompositionRequest, records: PatternKnowledgeRecord[] = sprint78PatternCorpus): PatternCompositionPlan {
  const selected = request.patternIds.map((id) => findRecord(id, records)).filter((record): record is PatternKnowledgeRecord => Boolean(record));
  const unknown = request.patternIds.filter((id) => !findRecord(id, records));
  const accepted = projectAcceptedPatterns(request.project);
  const selectedIds = new Set(selected.map((record) => record.id));
  const stage = request.stage ?? request.project.activeStage;
  const scopeKey = request.scopeNodeId ?? 'stage';
  const contractKeys = selected.map((record) => record.generationContract?.idempotentApplicationKey ?? record.id).sort();
  const applicationKey = `PCAPP-${stableHash(`${request.project.id}:${stage}:${scopeKey}:${contractKeys.join(':')}`)}`;
  const planId = `PCOMP-${stableHash(`${applicationKey}:${request.project.revision}`)}`;
  const conflicts: PatternCompositionPlan['conflicts'] = [];
  const duplicateSkips: PatternCompositionPlan['duplicateSkips'] = [];

  for (const record of selected) {
    for (const conflictId of record.conflicts) {
      if (selectedIds.has(conflictId) || accepted.has(conflictId)) conflicts.push({ patternId: record.id, conflictingPatternId: conflictId, explanation: `${record.name} declares an explicit conflict with ${conflictId}.` });
    }
    if (record.recordType === 'anti-pattern') conflicts.push({ patternId: record.id, conflictingPatternId: record.id, explanation: `${record.name} is an anti-pattern and cannot be applied as a target architecture pattern.` });
  }

  const prerequisites = selected.flatMap((record) => record.prerequisites.map((item) => ({ record, item })));
  const missingPrerequisites = prerequisites.filter(({ item }) => !projectHasPrerequisite(request.project, item)).map(({ record, item }) => `${record.name}: ${item}`);
  const prerequisitesSatisfied = prerequisites.filter(({ item }) => projectHasPrerequisite(request.project, item)).map(({ record, item }) => `${record.name}: ${item}`);
  const obligations = [...new Map(selected.flatMap((record) => record.obligations).map((obligation) => [obligation.id, obligation])).values()];
  const qualityDelta: Record<string, number> = {};
  for (const impact of selected.flatMap((record) => record.qualityImpacts)) {
    const sign = impact.direction === 'improves' ? 1 : impact.direction === 'degrades' ? -1 : 0.35;
    qualityDelta[impact.attributeId] = Math.round(((qualityDelta[impact.attributeId] ?? 0) + sign * impact.magnitude) * 10) / 10;
  }

  const anchor = request.anchor ?? { x: 180, y: 140 };
  const addNodes: ArchitectureNode[] = [];
  const addEdges: ArchitectureEdge[] = [];
  const addInterfaces: ArchitectureInterface[] = [];
  const existingNodeIds = new Set(request.project.nodes.map((node) => node.id));
  const existingEdgeIds = new Set(request.project.edges.map((edge) => edge.id));
  const existingInterfaceIds = new Set((request.project.interfaces ?? []).map((item) => item.id));
  const nodeIdsByRecord = new Map<string, string[]>();

  selected.forEach((record, recordIndex) => {
    const nodeIds = new Map<string, string>();
    const generatedIds: string[] = [];
    let boundaryId: string | undefined;
    if (record.generationContract?.trustBoundaries && record.topology?.boundaryRules.length) {
      boundaryId = `node-${stableHash(`${applicationKey}:${record.id}:trust-boundary`)}`;
      const boundary: ArchitectureNode = {
        id: boundaryId,
        kind: 'NetworkZone',
        stage,
        label: `${record.name} Trust Boundary`,
        description: `Governed trust boundary generated from ${record.name}.`,
        properties: { patternId: record.id, sourceRecordId: record.id, knowledgeReleaseId: record.review.releaseId, compositionPlanId: planId, compositionApplicationKey: applicationKey, trustBoundary: true, boundaryRules: record.topology.boundaryRules },
        lineageFrom: request.scopeNodeId ? [request.scopeNodeId] : [],
        parentId: request.scopeNodeId,
        positions: { [`stage:${stage}`]: { x: anchor.x + recordIndex * 70 - 28, y: anchor.y + recordIndex * 40 - 32 } },
        tags: ['pattern-composition', 'trust-boundary'],
        status: 'draft',
      };
      if (existingNodeIds.has(boundary.id)) duplicateSkips.push({ kind: 'node', id: boundary.id, reason: 'The trust boundary already exists for this pattern, stage and scope.' });
      else addNodes.push(boundary);
      generatedIds.push(boundary.id);
    }

    if (record.topology) {
      record.topology.nodes.forEach((node, nodeIndex) => {
        const id = `node-${stableHash(`${applicationKey}:${record.id}:${node.key}`)}`;
        nodeIds.set(node.key, id);
        const generated: ArchitectureNode = {
          id,
          kind: node.kind,
          stage: node.stage ?? stage,
          label: node.label,
          description: `Generated from ${record.name} by ${planId}.`,
          properties: { ...node.properties, patternId: record.id, compositionPlanId: planId, compositionApplicationKey: applicationKey, sourceRecordId: record.id, knowledgeReleaseId: record.review.releaseId },
          lineageFrom: request.scopeNodeId ? [request.scopeNodeId] : [],
          parentId: boundaryId ?? request.scopeNodeId,
          positions: { [`stage:${node.stage ?? stage}`]: { x: anchor.x + recordIndex * 72 + node.offset.x, y: anchor.y + recordIndex * 46 + node.offset.y + nodeIndex * 8 } },
          tags: [...node.tags, 'pattern-composition', `pattern:${record.id}`],
          status: 'draft',
        };
        if (existingNodeIds.has(id)) duplicateSkips.push({ kind: 'node', id, reason: 'Idempotent application skipped an existing canonical node.' });
        else addNodes.push(generated);
        generatedIds.push(id);
      });
      record.topology.edges.forEach((edge) => {
        const sourceId = nodeIds.get(edge.sourceKey);
        const targetId = nodeIds.get(edge.targetKey);
        if (!sourceId || !targetId) return;
        const id = `edge-${stableHash(`${applicationKey}:${record.id}:${edge.sourceKey}:${edge.targetKey}:${edge.kind}`)}`;
        const generated: ArchitectureEdge = { id, sourceId, targetId, kind: edge.kind, stage: edge.stage ?? stage, label: edge.label, properties: { ...edge.properties, patternId: record.id, compositionPlanId: planId, compositionApplicationKey: applicationKey } };
        if (existingEdgeIds.has(id)) duplicateSkips.push({ kind: 'edge', id, reason: 'Idempotent application skipped an existing canonical relationship.' });
        else addEdges.push(generated);
      });
      if (boundaryId) {
        for (const childId of [...nodeIds.values()]) {
          const id = `edge-${stableHash(`${applicationKey}:${record.id}:contains:${childId}`)}`;
          const generated: ArchitectureEdge = { id, sourceId: boundaryId, targetId: childId, kind: 'contains', stage, label: 'trust boundary contains', properties: { patternId: record.id, compositionPlanId: planId, trustBoundary: true } };
          if (existingEdgeIds.has(id)) duplicateSkips.push({ kind: 'edge', id, reason: 'The boundary containment relationship already exists.' });
          else addEdges.push(generated);
        }
      }
    }
    nodeIdsByRecord.set(record.id, generatedIds.filter((id) => id !== boundaryId));
  });

  const projectedNodeIds = new Set([...existingNodeIds, ...addNodes.map((node) => node.id)]);
  selected.forEach((record) => {
    if (!record.generationContract?.interfaces) return;
    const candidates = nodeIdsByRecord.get(record.id) ?? [];
    const fallback = [request.scopeNodeId, ...request.project.nodes.filter((node) => node.stage === stage).map((node) => node.id)].filter((id): id is string => Boolean(id));
    const endpoints = [...new Set([...candidates, ...fallback])].filter((id) => projectedNodeIds.has(id));
    for (const [index, kit] of (record.interfaceKit ?? []).entries()) {
      if (endpoints.length < 2) continue;
      const providerNodeId = endpoints[index % endpoints.length]!;
      const consumerNodeId = endpoints[(index + 1) % endpoints.length]!;
      if (providerNodeId === consumerNodeId) continue;
      const id = `interface-${stableHash(`${applicationKey}:${record.id}:${kit.key}:${providerNodeId}:${consumerNodeId}`)}`;
      const generated: ArchitectureInterface = {
        id,
        name: kit.name,
        stage,
        providerNodeId,
        consumerNodeIds: [consumerNodeId],
        interactionStyle: interfaceStyle(kit.interaction),
        protocol: kit.protocol,
        operationOrEvent: kit.contractType,
        schemaRef: `pattern://${record.id}/interfaces/${kit.key}`,
        version: '1.0.0',
        authentication: record.category === 'security' ? 'Pattern-defined identity assertion required' : 'To be confirmed before review',
        authorization: 'Least-privilege policy required',
        encryption: 'Encrypted in transit',
        timeoutMs: kit.interaction === 'request-response' ? 3000 : undefined,
        retryPolicy: kit.interaction === 'event' || kit.interaction === 'stream' ? 'Bounded retry with backoff' : 'Retry only idempotent operations',
        idempotency: kit.interaction === 'event' ? 'Required for consumers' : 'Required for mutation operations',
        ordering: kit.interaction === 'event' ? 'Explicit per aggregate or partition' : 'Not assumed',
        deliveryGuarantee: kit.interaction === 'event' ? 'At-least-once unless the accepted contract states otherwise' : 'Request outcome recorded',
        deadLetterPolicy: kit.interaction === 'event' ? 'Required' : 'Not applicable unless asynchronous',
        replayPolicy: kit.interaction === 'event' ? 'Controlled replay with audit evidence' : 'Not applicable',
        slo: 'Define latency, availability and error-budget target before handoff',
        dataClassification: record.category === 'security' || record.category === 'data' ? 'confidential' : 'internal',
        owner: record.owner,
        lifecycleStatus: 'proposed',
        evidenceIds: record.evidence.flatMap((item) => item.claimIds),
        contractLocation: `pattern://${record.id}/interfaces/${kit.key}`,
        deprecationPolicy: 'Backward-compatible change or governed version transition',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (existingInterfaceIds.has(id)) duplicateSkips.push({ kind: 'interface', id, reason: 'Idempotent application skipped an existing interface contract.' });
      else addInterfaces.push(generated);
    }
  });

  const addPatternSelections = selected.flatMap((record) => {
    const id = `selection-${stableHash(`${applicationKey}:${record.id}`)}`;
    const exists = request.project.patternSelections.some((item) => item.id === id || (item.patternId === record.id && item.scopeNodeId === request.scopeNodeId && item.stage === stage && item.status !== 'superseded'));
    if (exists) {
      duplicateSkips.push({ kind: 'pattern-selection', id, reason: 'This pattern is already active for the selected scope and stage.' });
      return [];
    }
    return [{ id, patternId: record.id, ...(request.scopeNodeId ? { scopeNodeId: request.scopeNodeId } : {}), stage: record.applicableStages.includes(stage) ? stage : record.applicableStages[0]!, obligations: record.obligations.map((item) => item.description) }];
  });

  const viewNodeIds = addNodes.map((node) => node.id);
  const viewEdgeIds = addEdges.map((edge) => edge.id);
  const viewId = `view-${stableHash(`${applicationKey}:stage-view`)}`;
  const viewExists = (request.project.architectureViews ?? []).some((view) => view.id === viewId);
  const addArchitectureViews: ArchitectureView[] = viewExists || (!viewNodeIds.length && !viewEdgeIds.length) ? [] : [{
    id: viewId,
    projectId: request.project.id,
    branchId: request.project.branch.id,
    name: `${stageLabel(stage)} · ${selected.map((record) => record.name).join(' + ')}`,
    kind: stage === 'physicalTechnology' ? 'deployment' : stage === 'validationRealization' ? 'conformance' : 'model',
    density: 'standard',
    description: `Named stage view generated by governed composition plan ${planId}.`,
    intent: `Review the topology, interfaces, trust boundaries and obligations introduced by ${selected.map((record) => record.name).join(', ')}.`,
    filters: { stages: [stage], includeNodeIds: viewNodeIds, showFindings: true, showEvidence: true },
    nodeStates: Object.fromEntries(addNodes.map((node) => [node.id, { nodeId: node.id, position: node.positions[`stage:${node.stage}`] ?? node.positions[node.stage], layerIds: node.tags.includes('trust-boundary') ? ['layer-boundaries'] : ['layer-composition'] }])),
    edgeStates: Object.fromEntries(addEdges.map((edge) => [edge.id, { edgeId: edge.id, labelVisible: true, routeHint: 'orthogonal', layerIds: edge.properties.trustBoundary ? ['layer-boundaries'] : ['layer-relationships'] }])),
    layers: [
      { id: 'layer-composition', name: 'Pattern composition', kind: 'stage', visible: true, locked: false, nodeIds: addNodes.filter((node) => !node.tags.includes('trust-boundary')).map((node) => node.id), edgeIds: [], order: 1 },
      { id: 'layer-boundaries', name: 'Trust boundaries', kind: 'boundary', visible: true, locked: false, nodeIds: addNodes.filter((node) => node.tags.includes('trust-boundary')).map((node) => node.id), edgeIds: addEdges.filter((edge) => edge.properties.trustBoundary === true).map((edge) => edge.id), order: 2 },
      { id: 'layer-relationships', name: 'Generated relationships', kind: 'relationship', visible: true, locked: false, nodeIds: [], edgeIds: addEdges.filter((edge) => edge.properties.trustBoundary !== true).map((edge) => edge.id), order: 3 },
    ],
    comments: [],
    presentationMode: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'AIW governed composition engine',
    version: 1,
  }];
  if (viewExists) duplicateSkips.push({ kind: 'view', id: viewId, reason: 'The named stage view already exists.' });

  const completionSuggestions = [...new Set(selected.flatMap(compositionSuggestions))].filter((id) => !selectedIds.has(id) && !accepted.has(id));
  const authorityAllowed = selected.every((record) => record.lifecycle === 'approved' && Boolean(record.review.releaseId) && record.evidence.length > 0);
  const canonicalChecks: PatternCompositionPlan['canonicalChecks'] = [
    { id: 'approved-authority', label: 'Approved knowledge authority', passed: authorityAllowed, detail: authorityAllowed ? 'Every selected record is approved, release-bound and evidence-backed.' : 'Candidate, unbound or evidence-free knowledge cannot modify the canonical model.' },
    { id: 'relationship-endpoints', label: 'Relationship endpoints resolve', passed: addEdges.every((edge) => projectedNodeIds.has(edge.sourceId) && projectedNodeIds.has(edge.targetId)), detail: 'Every generated relationship must resolve to canonical node identifiers.' },
    { id: 'interface-endpoints', label: 'Interface providers and consumers resolve', passed: addInterfaces.every((contract) => projectedNodeIds.has(contract.providerNodeId) && contract.consumerNodeIds.every((id) => projectedNodeIds.has(id))), detail: 'Every generated interface contract must name a provider and at least one canonical consumer.' },
    { id: 'lineage', label: 'Pattern and release lineage retained', passed: addNodes.every((node) => Boolean(node.properties.patternId) && Boolean(node.properties.knowledgeReleaseId)), detail: 'Generated objects retain Pattern DNA and knowledge-release lineage.' },
    { id: 'named-stage-view', label: 'Visible named stage view', passed: addArchitectureViews.length > 0 || viewExists || addNodes.length === 0, detail: 'Topology-generating compositions produce a persistent named view.' },
    { id: 'idempotent-application', label: 'Idempotent re-application', passed: Boolean(applicationKey), detail: `Stable application key ${applicationKey} prevents uncontrolled duplicate objects.` },
  ];
  const eligible = unknown.length === 0 && selected.length > 0 && conflicts.length === 0 && authorityAllowed && canonicalChecks.every((check) => check.passed) && (request.allowConditionalPrerequisites || missingPrerequisites.length === 0);
  const warnings = unknown.map((id) => `Unknown pattern record: ${id}`);
  if (selected.some((record) => !record.topology)) warnings.push('One or more selected records do not define a topology; they will add decisions, interfaces or obligations without topology nodes where possible.');
  if (!request.project.qualityScenarios.length) warnings.push('Quality impacts are indicative because the project has no measurable quality scenarios.');
  if (duplicateSkips.length) warnings.push(`${duplicateSkips.length} duplicate item(s) will be skipped by the idempotent application contract.`);
  if (!authorityAllowed) warnings.push('Only approved, release-bound and evidence-backed Pattern DNA may mutate the model.');
  return {
    id: planId,
    applicationKey,
    createdAt: new Date().toISOString(),
    patternIds: selected.map((record) => record.id),
    eligible,
    summary: eligible
      ? `Composition is eligible and will add ${addNodes.length} nodes, ${addEdges.length} relationships, ${addInterfaces.length} interfaces, ${obligations.length} governed obligations and ${addArchitectureViews.length} named view(s).`
      : 'Composition is blocked until authority, conflicts, canonical validation, unknown records or prerequisites are resolved.',
    prerequisitesSatisfied,
    missingPrerequisites,
    conflicts,
    completionSuggestions,
    obligations,
    qualityDelta,
    mutation: { addNodes, addEdges, addInterfaces, addArchitectureViews, addPatternSelections },
    rollback: {
      removeNodeIds: addNodes.map((node) => node.id),
      removeEdgeIds: addEdges.map((edge) => edge.id),
      removeInterfaceIds: addInterfaces.map((item) => item.id),
      removeArchitectureViewIds: addArchitectureViews.map((item) => item.id),
      removePatternSelectionIds: addPatternSelections.map((item) => item.id),
      removePatternIds: selected.map((record) => record.id),
    },
    duplicateSkips,
    canonicalChecks,
    warnings,
  };
}

export function applyPatternComposition(project: ArchitectureProject, plan: PatternCompositionPlan): ArchitectureProject {
  if (!plan.eligible) throw new Error('PATTERN_COMPOSITION_NOT_ELIGIBLE');
  const clone = structuredClone(project);
  const existingNodes = new Set(clone.nodes.map((node) => node.id));
  const existingEdges = new Set(clone.edges.map((edge) => edge.id));
  const existingInterfaces = new Set((clone.interfaces ?? []).map((item) => item.id));
  const existingViews = new Set((clone.architectureViews ?? []).map((item) => item.id));
  clone.nodes.push(...plan.mutation.addNodes.filter((node) => !existingNodes.has(node.id)));
  clone.edges.push(...plan.mutation.addEdges.filter((edge) => !existingEdges.has(edge.id)));
  clone.interfaces = [...(clone.interfaces ?? []), ...plan.mutation.addInterfaces.filter((item) => !existingInterfaces.has(item.id))];
  clone.architectureViews = [...(clone.architectureViews ?? []), ...plan.mutation.addArchitectureViews.filter((item) => !existingViews.has(item.id))];
  for (const selection of plan.mutation.addPatternSelections) {
    const existing = clone.patternSelections.find((item) => item.id === selection.id || (item.patternId === selection.patternId && item.scopeNodeId === selection.scopeNodeId && item.stage === selection.stage && item.status !== 'superseded'));
    if (existing) continue;
    clone.patternSelections.push({ id: selection.id, patternId: selection.patternId, scopeNodeId: selection.scopeNodeId, stage: selection.stage, rationale: `Accepted through governed composition plan ${plan.id} (${plan.applicationKey}).`, status: 'accepted', obligationsAcknowledged: [] });
  }
  clone.revision += 1;
  clone.updatedAt = new Date().toISOString();
  return clone;
}

export function rollbackPatternComposition(project: ArchitectureProject, plan: PatternCompositionPlan): ArchitectureProject {
  const clone = structuredClone(project);
  const removeNodes = new Set(plan.rollback.removeNodeIds);
  const removeEdges = new Set(plan.rollback.removeEdgeIds);
  const removeInterfaces = new Set(plan.rollback.removeInterfaceIds);
  const removeViews = new Set(plan.rollback.removeArchitectureViewIds);
  const removeSelections = new Set(plan.rollback.removePatternSelectionIds);
  clone.nodes = clone.nodes.filter((node) => !removeNodes.has(node.id));
  clone.edges = clone.edges.filter((edge) => !removeEdges.has(edge.id) && !removeNodes.has(edge.sourceId) && !removeNodes.has(edge.targetId));
  clone.interfaces = (clone.interfaces ?? []).filter((item) => !removeInterfaces.has(item.id) && !removeNodes.has(item.providerNodeId) && item.consumerNodeIds.every((id) => !removeNodes.has(id)));
  clone.architectureViews = (clone.architectureViews ?? []).filter((view) => !removeViews.has(view.id));
  clone.patternSelections = clone.patternSelections.filter((selection) => !removeSelections.has(selection.id));
  clone.revision += 1;
  clone.updatedAt = new Date().toISOString();
  return clone;
}

interface ContextualPatternRule {
  patternId: string;
  signalGroups: string[][];
}

// These rules are deterministic semantic calibration, not hidden LLM judgement. They
// capture architecture vocabulary that is commonly implied rather than literally named
// in a design brief (for example, "no duplicate financial posting" implies idempotency).
const contextualPatternRules: ContextualPatternRule[] = [
  { patternId: 'PAT-TRANSACTIONAL-OUTBOX', signalGroups: [['payment','financial posting','transaction'], ['duplicate','audit','auditable'], ['event','message']] },
  { patternId: 'PAT-IDEMPOTENT-CONSUMER', signalGroups: [['duplicate','idempotent','replay'], ['payment','event','message','telemetry']] },
  { patternId: 'PAT-CELL-BASED-ARCHITECTURE', signalGroups: [['high volume','scale','scalable'], ['isolation','blast radius','resilient']] },
  { patternId: 'PAT-MULTI-TENANCY', signalGroups: [['multi tenant','saas','tenant growth']] },
  { patternId: 'PAT-TENANT-ISOLATION', signalGroups: [['tenant isolation','tenant data','strict tenant']] },
  { patternId: 'PAT-INTERNAL-DEVELOPER-PLATFORM', signalGroups: [['self service','developer platform','delivery platform'], ['delivery','deployability']] },
  { patternId: 'PAT-RETRIEVAL-AUGMENTED-GENERATION', signalGroups: [['retrieval augmented','rag','grounded generation'], ['approved evidence','citations']] },
  { patternId: 'PAT-AI-GUARDRAILS', signalGroups: [['guardrail','sensitive source','restricted model'], ['governed','security']] },
  { patternId: 'PAT-HUMAN-IN-THE-LOOP-AI', signalGroups: [['human approval','human in the loop','manual approval']] },
  { patternId: 'PAT-EVENT-CARRIED-STATE-TRANSFER', signalGroups: [['offline','low connectivity','intermittent network'], ['eventual consistency','synchronization']] },
  { patternId: 'PAT-RETRY-WITH-BACKOFF', signalGroups: [['intermittent','reconnect','outage','retry'], ['network','connectivity']] },
  { patternId: 'TPL-LOW-CONNECTIVITY-SYNC', signalGroups: [['offline capable','low connectivity','field service'], ['synchronization','eventual consistency']] },
  { patternId: 'PAT-STRANGLER-FIG', signalGroups: [['legacy modernization','incremental modernization','legacy'], ['no big bang','service continuity']] },
  { patternId: 'PAT-ANTI-CORRUPTION-LAYER', signalGroups: [['legacy coupling','legacy integration','legacy modernization'], ['preserving service','continuity']] },
  { patternId: 'PAT-BRANCH-BY-ABSTRACTION', signalGroups: [['incremental','no big bang','gradual replacement'], ['legacy','modernization']] },
  { patternId: 'PAT-QUEUE-BASED-LOAD-LEVELING', signalGroups: [['buffering','bursty','high volume'], ['telemetry','ingestion','device']] },
  { patternId: 'PAT-TIME-SERIES-STORE', signalGroups: [['time series','telemetry','metrics'], ['analysis','device']] },
  { patternId: 'PAT-PUBLISH-SUBSCRIBE', signalGroups: [['telemetry','event stream','device event'], ['high volume','fan out','ingestion']] },
];

function requestContextText(request: PatternRecommendationRequest): string {
  return normalizeText([
    request.query,
    ...request.project.objectives,
    ...request.project.constraints,
    ...request.project.qualityPriorities.map((item) => item.attributeId),
    request.project.context.operationalMaturity?.toString() ?? '',
    request.project.context.regulatoryExposure ?? '',
    ...(request.project.context.preferredVendors ?? []),
  ].join(' '));
}

function normalizedWordStems(value: string): Set<string> {
  return new Set(normalizeText(value).split(/\s+/).filter((item) => item.length > 2).map((item) => item.replace(/(ization|isation|ments|ment|ing|ies|ed|s)$/,'').slice(0, 12)));
}

function contextualPatternBoost(patternId: string, contextText: string): { score: number; matchedGroups: number } {
  const rule = contextualPatternRules.find((item) => item.patternId === patternId);
  if (!rule) return { score: 0, matchedGroups: 0 };
  const matchedGroups = rule.signalGroups.filter((group) => group.some((signal) => contextText.includes(normalizeText(signal)))).length;
  if (!matchedGroups) return { score: 0, matchedGroups: 0 };
  return { score: Math.min(60, Math.round((matchedGroups / rule.signalGroups.length) * 60)), matchedGroups };
}

function scorePattern(record: PatternKnowledgeRecord, request: PatternRecommendationRequest): PatternRecommendationScore {
  const contextText = requestContextText(request);
  const query = tokens(contextText);
  const recordTokens = tokens(recordText(record));
  const overlap = [...query].filter((token) => recordTokens.has(token));
  const contextStems = normalizedWordStems(contextText);
  const nameStems = normalizedWordStems([record.name, ...record.aliases].join(' '));
  const nameOverlap = [...nameStems].filter((stem) => contextStems.has(stem));
  const normalizedName = normalizeText(record.name);
  const phraseMatch = contextText.includes(normalizedName) || record.aliases.some((alias) => contextText.includes(normalizeText(alias)));
  const semanticCalibration = contextualPatternBoost(record.id, contextText);
  const stage = request.stage ?? request.project.activeStage;
  const stageMatch = record.applicableStages.includes(stage);
  const categoryMatch = !request.category || record.category === request.category;
  const qualityIds = new Set(request.project.qualityPriorities.filter((item) => item.weight >= 3).map((item) => item.attributeId));
  const qualityMatches = record.qualityImpacts.filter((impact) => qualityIds.has(impact.attributeId) && impact.direction !== 'degrades');
  const accepted = projectAcceptedPatterns(request.project);
  const conflict = record.conflicts.find((id) => accepted.has(id));
  const evidenceConfidence = Math.min(100, record.evidence.reduce((sum, evidence) => sum + (evidence.sourceTrustTier === 1 ? 34 : evidence.sourceTrustTier === 2 ? 25 : 12), 0));
  const dimensions = {
    contextFit: Math.min(100, overlap.length * 7 + nameOverlap.length * 11 + (phraseMatch ? 24 : 0) + semanticCalibration.score + (stageMatch ? 14 : 0) + (categoryMatch ? 6 : 0)),
    qualityAlignment: Math.min(100, qualityMatches.reduce((sum, item) => sum + item.magnitude * 14, 0) + (qualityIds.size ? 0 : 35)),
    compatibility: conflict || record.recordType === 'anti-pattern' ? 0 : 90,
    evidenceConfidence,
    operationalReadiness: record.obligations.length && record.conformanceRules.length ? 88 : 55,
    enterpriseReuse: record.topology || record.recordType === 'component-archetype' ? 85 : 65,
  };
  const weighted = dimensions.contextFit * .30 + dimensions.qualityAlignment * .25 + dimensions.compatibility * .15 + dimensions.evidenceConfidence * .15 + dimensions.operationalReadiness * .10 + dimensions.enterpriseReuse * .05;
  const penalties: string[] = [];
  if (!stageMatch) penalties.push(`Not calibrated for active stage ${stage}.`);
  if (conflict) penalties.push(`Conflicts with accepted pattern ${conflict}.`);
  if (record.recordType === 'anti-pattern') penalties.push('Anti-pattern records are detection and remediation guidance, not adoption candidates.');
  const eligible = stageMatch && !conflict && record.recordType !== 'anti-pattern' && record.lifecycle === 'approved';
  const totalScore = Math.max(0, Math.min(100, Math.round(weighted - penalties.length * 12)));
  const reasons = [
    `Matched ${overlap.length} architecture-context term(s) and ${nameOverlap.length} pattern-name term(s).`,
    semanticCalibration.matchedGroups ? `Matched ${semanticCalibration.matchedGroups} deterministic architecture-intent signal group(s).` : 'No deterministic architecture-intent calibration rule was required.',
    `${qualityMatches.length} priority quality attribute(s) align.`,
    `${record.evidence.length} approved source reference(s) support the record.`,
  ];
  const assumptions = request.project.qualityScenarios.length ? [] : ['No measurable quality scenarios are recorded; quality alignment uses priority weights only.'];
  const counterfactuals = [!stageMatch ? `Move the analysis to ${record.applicableStages.join(' or ')} for this record to become stage-eligible.` : 'A newly accepted conflicting pattern could make this candidate ineligible.', qualityMatches.length === 0 ? 'Add a quality scenario aligned to this pattern before increasing confidence.' : 'Reducing the aligned quality priorities would lower this pattern ranking.'];
  return { patternId: record.id, patternName: record.name, eligible, totalScore, dimensions, penalties, assumptions, evidenceConnectorIds: [...new Set(record.evidence.map((item) => item.connectorId))], reasons, counterfactuals };
}

function productionRecommendationRecords(records: PatternKnowledgeRecord[]): { releaseId: string; records: PatternKnowledgeRecord[] } {
  const approved = records.filter((record) => record.lifecycle === 'approved' && Boolean(record.review?.releaseId) && record.evidence.length > 0);
  const counts = new Map<string, number>();
  for (const record of approved) counts.set(record.review.releaseId, (counts.get(record.review.releaseId) ?? 0) + 1);
  const releaseId = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? 'UNPUBLISHED';
  return { releaseId, records: approved.filter((record) => record.review.releaseId === releaseId) };
}

export function buildRecommendationEvidencePack(request: PatternRecommendationRequest, records: PatternKnowledgeRecord[] = sprint78PatternCorpus): RecommendationEvidencePack {
  const governed = productionRecommendationRecords(records);
  const eligibleRecords = governed.records;
  const limit = Math.max(1, Math.min(100, request.limit ?? 8));
  const recommendations = eligibleRecords.map((record) => scorePattern(record, request)).filter((score) => score.totalScore > 5).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.totalScore - a.totalScore || a.patternId.localeCompare(b.patternId)).slice(0, limit);
  const selected = recommendations.map((score) => eligibleRecords.find((record) => record.id === score.patternId)!).filter(Boolean);
  const approvedEvidence = selected.flatMap((record) => record.evidence.filter((item) => item.evidenceRole !== 'limiting'));
  const opposingEvidence = selected.flatMap((record) => record.evidence.filter((item) => item.evidenceRole === 'limiting'));
  const obligations = [...new Map(selected.flatMap((record) => record.obligations).map((item) => [item.id, item])).values()];
  const conflicts = recommendations.flatMap((score) => score.penalties.filter((item) => item.toLowerCase().includes('conflict')));
  const openQuestions: string[] = [];
  if (!request.project.qualityScenarios.length) openQuestions.push('What measurable quality scenarios should govern this recommendation?');
  if (!request.project.context.operationalMaturity) openQuestions.push('What is the team and operational maturity for running the proposed architecture?');
  if (!request.scopeNodeId) openQuestions.push('Which domain, service or platform scope should the recommendation apply to?');
  const warnings = recommendations.some((item) => !item.eligible && item.totalScore >= 60) ? ['Some high-scoring candidates are ineligible; the UI must preserve their exclusion reasons.'] : [];
  return { knowledgeRelease: governed.releaseId, generatedAt: new Date().toISOString(), request, recommendations, approvedRecordIds: selected.map((record) => record.id), approvedEvidence, opposingEvidence, obligations, conflicts, openQuestions, warnings };
}

function commentForRule(rule: PatternConformanceRule): string {
  return `${rule.title}: ${rule.rationale}`.replaceAll('*/','* /');
}

function artifactForRule(record: PatternKnowledgeRecord, rule: PatternConformanceRule): FitnessFunctionArtifact {
  const base = `${record.id.toLowerCase()}-${rule.id.toLowerCase()}`.replace(/[^a-z0-9-]+/g, '-');
  let path = `fitness/${base}.txt`;
  let mediaType = 'text/plain';
  let content = `# ${commentForRule(rule)}\n# Parameters: ${JSON.stringify(rule.parameters)}`;
  if (rule.target === 'archunit') {
    path = `fitness/archunit/${base}.java`; mediaType = 'text/x-java-source';
    content = `// Generated by AIW. Review before enforcement.\n// ${commentForRule(rule)}\n@ArchTest\nstatic final ArchRule ${base.replaceAll('-','_')} = classes()\n  .that().areAnnotatedWith(ArchitectureIntent.class)\n  .should().resideInAPackage("..${record.category}..");\n`;
  } else if (rule.target === 'jqassistant') {
    path = `fitness/jqassistant/${base}.adoc`; mediaType = 'text/asciidoc';
    content = `[[constraint:${base}]]\n[source,cypher,role=constraint]\n.${commentForRule(rule)}\n----\nMATCH (n) WHERE n.architectureIntent = '${record.id}'\nRETURN n\n----\n`;
  } else if (rule.target === 'spring-modulith') {
    path = `fitness/spring-modulith/${base}.java`; mediaType = 'text/x-java-source';
    content = `// ${commentForRule(rule)}\nApplicationModules.of(Application.class).verify();\n`;
  } else if (rule.target === 'asyncapi' || rule.target === 'openapi') {
    path = `fitness/contracts/${base}.yaml`; mediaType = 'application/yaml';
    content = `# ${commentForRule(rule)}\nkind: ${rule.target}\npattern: ${record.id}\nchecks:\n  - require-versioned-contract\n  - require-owner\n  - require-observability\n`;
  } else if (rule.target === 'kubernetes') {
    path = `fitness/kubernetes/${base}.rego`; mediaType = 'text/plain';
    content = `package aiw.architecture\n\n# ${commentForRule(rule)}\ndeny[msg] {\n  input.metadata.annotations["aiw.io/pattern"] != "${record.id}"\n  msg := "Missing governed AIW pattern annotation"\n}\n`;
  } else if (rule.target === 'terraform') {
    path = `fitness/terraform/${base}.rego`; mediaType = 'text/plain';
    content = `package aiw.terraform\n\n# ${commentForRule(rule)}\ndeny[msg] {\n  not input.resource_changes\n  msg := "Terraform plan contains no architecture evidence"\n}\n`;
  }
  return { id: `FIT-${stableHash(`${record.id}:${rule.id}`)}`, patternId: record.id, target: rule.target, path, mediaType, content, reviewRequired: true, sourceRuleIds: [rule.id] };
}

export function generateArchitectureFitnessFunctions(patternIds: string[], records: PatternKnowledgeRecord[] = sprint78PatternCorpus): FitnessFunctionArtifact[] {
  const selected = patternIds.map((id) => findRecord(id, records)).filter((record): record is PatternKnowledgeRecord => Boolean(record));
  return selected.flatMap((record) => record.conformanceRules.map((rule) => artifactForRule(record, rule)));
}

export function runPatternBenchmark(scenario: PatternBenchmarkScenario, project: ArchitectureProject, records: PatternKnowledgeRecord[] = sprint78PatternCorpus): PatternBenchmarkResult {
  const benchmarkProject = structuredClone(project);
  benchmarkProject.objectives = [...scenario.objectives];
  benchmarkProject.constraints = [...scenario.constraints];
  benchmarkProject.qualityPriorities = scenario.qualityPriorities;
  const stageByDomain: Partial<Record<PatternBenchmarkScenario['domain'], ArchitectureProject['activeStage']>> = { payments: 'applicationRealization', banking: 'applicationRealization', 'e-commerce': 'applicationRealization', saas: 'logicalTechnology', healthcare: 'applicationRealization', 'public-sector': 'applicationRealization', logistics: 'applicationRealization', 'data-platform': 'logicalTechnology', iot: 'logicalTechnology', 'ai-system': 'applicationRealization', 'legacy-modernization': 'applicationRealization', 'low-connectivity': 'logicalTechnology' };
  const pack = buildRecommendationEvidencePack({ query: scenario.query, project: benchmarkProject, stage: stageByDomain[scenario.domain] ?? 'applicationRealization', limit: 25 }, records);
  const recommendedIds = pack.recommendations.filter((item) => item.eligible).map((item) => item.patternId);
  const excludedIds = pack.recommendations.filter((item) => !item.eligible).map((item) => item.patternId);
  const missingExpectedCandidates = scenario.expectedCandidateIds.filter((id) => !recommendedIds.includes(id));
  const unexpectedCandidates = recommendedIds.filter((id) => scenario.expectedExcludedIds.includes(id));
  const obligationCategories = [...new Set(pack.obligations.map((item) => item.category))];
  const missingObligations = scenario.requiredObligationCategories.filter((category) => !obligationCategories.includes(category));
  const passed = missingExpectedCandidates.length === 0 && unexpectedCandidates.length === 0 && missingObligations.length === 0;
  return { scenarioId: scenario.id, passed, recommendedIds, excludedIds, missingExpectedCandidates, unexpectedCandidates, obligationCategories, notes: missingObligations.length ? [`Missing obligation categories: ${missingObligations.join(', ')}`] : [] };
}

export function runSprint78BenchmarkSuite(project: ArchitectureProject, scenarios: PatternBenchmarkScenario[] = sprint78BenchmarkScenarios, records: PatternKnowledgeRecord[] = sprint78PatternCorpus): PatternBenchmarkResult[] {
  return scenarios.map((scenario) => runPatternBenchmark(scenario, project, records));
}

export function sprint78KnowledgeReleaseManifest(records: PatternKnowledgeRecord[] = sprint78PatternCorpus, connectors: KnowledgeRepositoryConnector[] = knowledgeRepositoryConnectors) {
  const normalized = normalizePatternCorpus(records);
  const policies = buildRepositoryGovernancePolicies(connectors);
  const payload = {
    version: '0.10.59', releaseId: 'AKR-0.10.60', ontologyVersion: 'pattern-dna-2.0',
    recordIds: normalized.canonical.map((record) => record.id).sort(),
    approvedConnectorIds: connectors.filter((connector) => connector.lifecycleStatus === 'approved').map((connector) => connector.id).sort(),
    productionConnectorIds: policies.filter((policy) => policy.productionRecommendationAllowed).map((policy) => policy.connectorId).sort(),
  };
  return { ...payload, checksum: `SHA-${stableHash(JSON.stringify(payload))}`, status: 'approved' as const, governance: { liveGitHubRecommendations: false, immutableSnapshots: true, quarantineRequired: true, expertApprovalRequired: true, discoverySourcesCanScore: false } };
}
