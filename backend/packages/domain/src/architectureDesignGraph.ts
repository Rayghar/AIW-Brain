import type {
  ArchitectureProject,
  ArchitectureStage,
} from './types.js';

export const architectureDesignGraphRecordKinds = [
  'project',
  'source',
  'evidence',
  'objective',
  'constraint',
  'assumption',
  'requirement',
  'stakeholder',
  'journey',
  'open-question',
  'quality-priority',
  'quality-scenario',
  'style-decision',
  'pattern-selection',
  'architecture-node',
  'architecture-edge',
  'architecture-interface',
  'decision',
  'finding',
  'policy-gate',
  'stage-approval',
] as const;
export type ArchitectureDesignGraphRecordKind =
  (typeof architectureDesignGraphRecordKinds)[number];

export const architectureDesignGraphRelationshipKinds = [
  'contains',
  'substantiates',
  'motivates',
  'constrains',
  'drives',
  'participates-in',
  'traces-to',
  'applies-to',
  'derived-from',
  'connects-to',
  'provides',
  'consumes',
  'affects',
  'governs',
  'approves',
] as const;
export type ArchitectureDesignGraphRelationshipKind =
  (typeof architectureDesignGraphRelationshipKinds)[number];

export type ArchitectureDesignGraphProjectionMode =
  | 'legacy-project-projection'
  | 'materialized-canonical';

export interface ArchitectureDesignGraphRecord {
  id: string;
  kind: ArchitectureDesignGraphRecordKind;
  sourceRef: string;
  label: string;
  summary: string;
  status: string;
  stageRefs: string[];
  evidenceRefs: string[];
  attributes: Record<string, unknown>;
  fingerprint: string;
}

export interface ArchitectureDesignGraphRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  kind: ArchitectureDesignGraphRelationshipKind;
  sourceRef: string;
  rationale: string;
  evidenceRefs: string[];
  stageRefs: string[];
  fingerprint: string;
}

export interface ArchitectureDesignGraphIntegrity {
  healthy: boolean;
  checkedAt: string;
  recordCount: number;
  relationshipCount: number;
  duplicateRecordIds: string[];
  duplicateRelationshipIds: string[];
  danglingRelationshipIds: string[];
  fingerprintValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ArchitectureDesignGraph {
  schemaVersion: '1.0';
  tenantId: string;
  projectId: string;
  branchId: string;
  projectRevision: number;
  graphRevision: number;
  projectionMode: ArchitectureDesignGraphProjectionMode;
  generatedAt: string;
  fingerprint: string;
  records: ArchitectureDesignGraphRecord[];
  relationships: ArchitectureDesignGraphRelationship[];
  integrity: ArchitectureDesignGraphIntegrity;
}

export interface ArchitectureDesignGraphMaterializationReceipt {
  schemaVersion: '1.0';
  projectId: string;
  branchId: string;
  fromRevision: number;
  toRevision: number;
  previewFingerprint: string;
  materializedFingerprint: string;
  recordCount: number;
  relationshipCount: number;
  materializedAt: string;
  humanApprovalRequired: true;
  sourceAuthority: 'architect';
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, stableValue(record[key])]),
  );
}

function stableJson(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

export function architectureDesignGraphHash(value: unknown): string {
  const text = typeof value === 'string' ? value : stableJson(value);
  let result = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    result ^= text.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return `fnv1a-${(result >>> 0).toString(16).padStart(8, '0')}`;
}

function recordId(kind: ArchitectureDesignGraphRecordKind, sourceRef: string): string {
  return `${kind}:${sourceRef}`;
}

function relationId(
  kind: ArchitectureDesignGraphRelationshipKind,
  sourceId: string,
  targetId: string,
  sourceRef: string,
): string {
  return `rel:${kind}:${architectureDesignGraphHash(`${sourceId}|${targetId}|${sourceRef}`)}`;
}

function textSummary(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

function inferStageRefs(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  const stages = new Set<string>();
  if (typeof record.stage === 'string') stages.add(record.stage);
  if (Array.isArray(record.stageRefs)) {
    for (const stage of record.stageRefs) if (typeof stage === 'string') stages.add(stage);
  }
  return [...stages].sort();
}

function graphPayload(graph: Pick<ArchitectureDesignGraph,
  'schemaVersion' | 'tenantId' | 'projectId' | 'branchId' | 'projectRevision' |
  'graphRevision' | 'projectionMode' | 'records' | 'relationships'
>): unknown {
  return {
    schemaVersion: graph.schemaVersion,
    tenantId: graph.tenantId,
    projectId: graph.projectId,
    branchId: graph.branchId,
    projectionMode: graph.projectionMode,
    records: graph.records,
    relationships: graph.relationships,
  };
}

export function validateArchitectureDesignGraph(
  graph: Omit<ArchitectureDesignGraph, 'integrity'> & { integrity?: ArchitectureDesignGraphIntegrity },
): ArchitectureDesignGraphIntegrity {
  const recordCounts = new Map<string, number>();
  const relationshipCounts = new Map<string, number>();
  for (const record of graph.records) recordCounts.set(record.id, (recordCounts.get(record.id) ?? 0) + 1);
  for (const relationship of graph.relationships) relationshipCounts.set(relationship.id, (relationshipCounts.get(relationship.id) ?? 0) + 1);
  const duplicateRecordIds = [...recordCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id).sort();
  const duplicateRelationshipIds = [...relationshipCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id).sort();
  const recordIds = new Set(graph.records.map((record) => record.id));
  const danglingRelationshipIds = graph.relationships
    .filter((relationship) => !recordIds.has(relationship.sourceId) || !recordIds.has(relationship.targetId))
    .map((relationship) => relationship.id)
    .sort();
  const expectedFingerprint = architectureDesignGraphHash(graphPayload(graph));
  const fingerprintValid = graph.fingerprint === expectedFingerprint;
  const errors: string[] = [];
  if (duplicateRecordIds.length) errors.push(`${duplicateRecordIds.length} duplicate record identifier(s)`);
  if (duplicateRelationshipIds.length) errors.push(`${duplicateRelationshipIds.length} duplicate relationship identifier(s)`);
  if (danglingRelationshipIds.length) errors.push(`${danglingRelationshipIds.length} dangling relationship(s)`);
  if (!fingerprintValid) errors.push('Graph fingerprint does not match the canonical payload');
  const warnings: string[] = [];
  if (graph.projectionMode === 'legacy-project-projection') {
    warnings.push('The graph is a compatibility projection from ArchitectureProject; materialization requires explicit architect acceptance.');
  }
  if (!graph.records.some((record) => record.kind === 'requirement')) {
    warnings.push('No canonical requirement records are present in the graph.');
  }
  return {
    healthy: errors.length === 0,
    checkedAt: graph.generatedAt,
    recordCount: graph.records.length,
    relationshipCount: graph.relationships.length,
    duplicateRecordIds,
    duplicateRelationshipIds,
    danglingRelationshipIds,
    fingerprintValid,
    errors,
    warnings,
  };
}

export function buildArchitectureDesignGraph(
  project: ArchitectureProject,
  projectionMode: ArchitectureDesignGraphProjectionMode =
    project.designGraph?.projectionMode === 'materialized-canonical'
      ? 'materialized-canonical'
      : 'legacy-project-projection',
): ArchitectureDesignGraph {
  const records: ArchitectureDesignGraphRecord[] = [];
  const relationships: ArchitectureDesignGraphRelationship[] = [];
  const aliases = new Map<string, string>();
  const projectRecordId = recordId('project', project.id);

  const addRecord = (input: {
    kind: ArchitectureDesignGraphRecordKind;
    sourceRef: string;
    label: string;
    summary?: string;
    status?: string;
    stageRefs?: string[];
    evidenceRefs?: string[];
    attributes?: Record<string, unknown>;
    aliases?: string[];
  }): string => {
    const id = recordId(input.kind, input.sourceRef);
    const payload = {
      id,
      kind: input.kind,
      sourceRef: input.sourceRef,
      label: input.label,
      summary: input.summary ?? input.label,
      status: input.status ?? 'informational',
      stageRefs: [...new Set(input.stageRefs ?? [])].sort(),
      evidenceRefs: [...new Set(input.evidenceRefs ?? [])].sort(),
      attributes: input.attributes ?? {},
    };
    records.push({ ...payload, fingerprint: architectureDesignGraphHash(payload) });
    if (!aliases.has(input.sourceRef)) aliases.set(input.sourceRef, id);
    aliases.set(id, id);
    for (const alias of input.aliases ?? []) if (!aliases.has(alias)) aliases.set(alias, id);
    if (input.kind !== 'project') addRelationship({
      kind: 'contains',
      sourceId: projectRecordId,
      targetId: id,
      sourceRef: `project:${project.id}`,
      rationale: 'The record belongs to the canonical project graph.',
      stageRefs: payload.stageRefs,
    });
    return id;
  };

  const addRelationship = (input: {
    kind: ArchitectureDesignGraphRelationshipKind;
    sourceId: string;
    targetId: string;
    sourceRef: string;
    rationale: string;
    evidenceRefs?: string[];
    stageRefs?: string[];
  }): void => {
    const id = relationId(input.kind, input.sourceId, input.targetId, input.sourceRef);
    const payload = {
      id,
      sourceId: input.sourceId,
      targetId: input.targetId,
      kind: input.kind,
      sourceRef: input.sourceRef,
      rationale: input.rationale,
      evidenceRefs: [...new Set(input.evidenceRefs ?? [])].sort(),
      stageRefs: [...new Set(input.stageRefs ?? [])].sort(),
    };
    relationships.push({ ...payload, fingerprint: architectureDesignGraphHash(payload) });
  };

  const resolve = (ref: string): string | undefined => aliases.get(ref);
  const linkResolved = (input: {
    kind: ArchitectureDesignGraphRelationshipKind;
    sourceRef: string;
    targetRef: string;
    relationSourceRef: string;
    rationale: string;
    evidenceRefs?: string[];
    stageRefs?: string[];
  }): void => {
    const sourceId = resolve(input.sourceRef);
    const targetId = resolve(input.targetRef);
    if (!sourceId || !targetId) return;
    addRelationship({
      kind: input.kind,
      sourceId,
      targetId,
      sourceRef: input.relationSourceRef,
      rationale: input.rationale,
      ...(input.evidenceRefs ? { evidenceRefs: input.evidenceRefs } : {}),
      ...(input.stageRefs ? { stageRefs: input.stageRefs } : {}),
    });
  };

  addRecord({
    kind: 'project',
    sourceRef: project.id,
    label: project.name,
    summary: project.description,
    status: 'accepted',
    stageRefs: [project.activeStage],
    attributes: {
      tenantId: project.tenantId,
      branchId: project.branch.id,
      schemaVersion: project.schemaVersion,
      requirementsIntelligenceMetadata: project.requirementsIntelligence ? {
        ...project.requirementsIntelligence,
        sources: undefined,
        evidence: undefined,
        requirements: undefined,
        stakeholders: undefined,
        journeys: undefined,
        openQuestions: undefined,
      } : null,
    },
    aliases: [`project:${project.id}`],
  });

  project.objectives.forEach((objective, index) => addRecord({
    kind: 'objective', sourceRef: `objective-${index + 1}`, label: objective,
    summary: objective, status: 'accepted', stageRefs: ['designIntent'],
    aliases: [`OBJ-${String(index + 1).padStart(3, '0')}`],
  }));
  project.constraints.forEach((constraint, index) => addRecord({
    kind: 'constraint', sourceRef: `constraint-${index + 1}`, label: constraint,
    summary: constraint, status: 'accepted', stageRefs: ['designIntent'],
    aliases: [`CON-${String(index + 1).padStart(3, '0')}`],
  }));
  project.assumptions.forEach((assumption, index) => addRecord({
    kind: 'assumption', sourceRef: `assumption-${index + 1}`, label: assumption,
    summary: assumption, status: 'accepted', stageRefs: ['designIntent'],
    aliases: [`ASM-${String(index + 1).padStart(3, '0')}`],
  }));

  const requirements = project.requirementsIntelligence;
  for (const source of requirements?.sources ?? []) addRecord({
    kind: 'source', sourceRef: source.id, label: source.name, summary: source.excerpt,
    status: source.status, stageRefs: ['designIntent'], attributes: { kind: source.kind, classification: source.classification, contentHash: source.contentHash, canonicalValue: source },
  });
  for (const evidence of requirements?.evidence ?? []) addRecord({
    kind: 'evidence', sourceRef: evidence.id, label: evidence.locator, summary: evidence.excerpt,
    status: 'accepted', stageRefs: ['designIntent'], attributes: { sourceId: evidence.sourceId, sectionId: evidence.sectionId ?? '', canonicalValue: evidence },
  });
  for (const requirement of requirements?.requirements ?? []) addRecord({
    kind: 'requirement', sourceRef: requirement.id, label: requirement.title, summary: requirement.statement,
    status: requirement.status, stageRefs: ['designIntent'], evidenceRefs: requirement.evidenceRefs,
    attributes: { type: requirement.type, priority: requirement.priority, confidence: requirement.confidence, acceptanceCriteria: requirement.acceptanceCriteria, tags: requirement.tags, canonicalValue: requirement },
  });
  for (const stakeholder of requirements?.stakeholders ?? []) addRecord({
    kind: 'stakeholder', sourceRef: stakeholder.id, label: stakeholder.name, summary: stakeholder.role,
    status: stakeholder.status, stageRefs: ['designIntent'], evidenceRefs: stakeholder.evidenceRefs,
    attributes: { concerns: stakeholder.concerns, decisionRights: stakeholder.decisionRights, canonicalValue: stakeholder },
  });
  for (const journey of requirements?.journeys ?? []) addRecord({
    kind: 'journey', sourceRef: journey.id, label: journey.name, summary: journey.goal,
    status: journey.status, stageRefs: ['designIntent', 'logicalApplication'],
    attributes: { priority: journey.priority, actorRefs: journey.actorRefs, architectureObligations: journey.architectureObligations, canonicalValue: journey },
  });
  for (const question of requirements?.openQuestions ?? []) addRecord({
    kind: 'open-question', sourceRef: question.id, label: question.question, summary: question.whyItMatters,
    status: question.status, stageRefs: ['designIntent'], attributes: { impact: question.impact, answer: question.answer ?? '', canonicalValue: question },
  });

  for (const priority of project.qualityPriorities) addRecord({
    kind: 'quality-priority', sourceRef: priority.attributeId, label: priority.attributeId,
    summary: priority.rationale ?? `Quality priority weight ${priority.weight}`,
    status: 'accepted', stageRefs: ['designIntent'], attributes: { weight: priority.weight },
    aliases: [`quality:${priority.attributeId}`],
  });
  for (const scenario of project.qualityScenarios) addRecord({
    kind: 'quality-scenario', sourceRef: scenario.id, label: `${scenario.attributeId}: ${scenario.stimulus}`,
    summary: `${scenario.response}; ${scenario.responseMeasure}`, status: 'accepted', stageRefs: ['designIntent'],
    attributes: { ...scenario }, aliases: [scenario.attributeId],
  });
  for (const decision of project.styleDecisions) addRecord({
    kind: 'style-decision', sourceRef: decision.id, label: decision.styleId, summary: decision.rationale,
    status: decision.status, stageRefs: [decision.stage], attributes: { styleId: decision.styleId, scopeNodeId: decision.scopeNodeId ?? '' },
    aliases: [decision.styleId],
  });
  for (const selection of project.patternSelections) addRecord({
    kind: 'pattern-selection', sourceRef: selection.id, label: selection.patternId, summary: selection.rationale,
    status: selection.status, stageRefs: [selection.stage], attributes: { patternId: selection.patternId, scopeNodeId: selection.scopeNodeId ?? '', obligationsAcknowledged: selection.obligationsAcknowledged },
    aliases: [selection.patternId],
  });
  for (const node of project.nodes) addRecord({
    kind: 'architecture-node', sourceRef: node.id, label: node.label, summary: node.description ?? node.label,
    status: node.status, stageRefs: [node.stage], attributes: { kind: node.kind, properties: node.properties, parentId: node.parentId ?? '', tags: node.tags },
    aliases: [node.semanticId ?? ''].filter(Boolean),
  });
  for (const edge of project.edges) addRecord({
    kind: 'architecture-edge', sourceRef: edge.id, label: edge.label ?? `${edge.sourceId} ${edge.kind} ${edge.targetId}`,
    summary: edge.label ?? edge.kind, status: 'accepted', stageRefs: [edge.stage], attributes: { ...edge },
  });
  for (const architectureInterface of project.interfaces ?? []) addRecord({
    kind: 'architecture-interface', sourceRef: architectureInterface.id, label: architectureInterface.name,
    summary: `${architectureInterface.interactionStyle} ${architectureInterface.protocol} ${architectureInterface.operationOrEvent}`,
    status: architectureInterface.lifecycleStatus, stageRefs: [architectureInterface.stage], evidenceRefs: architectureInterface.evidenceIds,
    attributes: { ...architectureInterface, canonicalValue: architectureInterface },
  });
  for (const decision of project.decisions) addRecord({
    kind: 'decision', sourceRef: decision.id, label: decision.title, summary: decision.decision,
    status: decision.status, stageRefs: inferStageRefs(decision), attributes: { context: decision.context, drivers: decision.drivers, consideredOptions: decision.consideredOptions, consequences: decision.consequences, linkedRecordIds: decision.linkedRecordIds ?? [], scopeNodeId: decision.scopeNodeId ?? '', canonicalValue: decision },
  });
  for (const finding of project.findings) addRecord({
    kind: 'finding', sourceRef: finding.id, label: finding.title, summary: finding.message,
    status: finding.canOverride ? 'waivable' : 'open', stageRefs: [], attributes: { severity: finding.severity, ruleId: finding.ruleId, rationale: finding.rationale, mitigations: finding.mitigations, canOverride: finding.canOverride, canonicalValue: finding },
    aliases: [finding.ruleId],
  });
  for (const gate of project.policyGates) addRecord({
    kind: 'policy-gate', sourceRef: gate.id, label: gate.name, summary: `Hard <= ${gate.hardFindingThreshold}; significant <= ${gate.significantFindingThreshold}; advisory <= ${gate.advisoryFindingThreshold}`,
    status: gate.enabled ? 'active' : 'disabled', stageRefs: gate.requiredApprovedStages, attributes: { ...gate },
  });
  for (const approval of project.stageApprovals) addRecord({
    kind: 'stage-approval', sourceRef: approval.id, label: `${approval.stage} ${approval.status}`,
    summary: approval.comments.join(' | ') || approval.status, status: approval.status, stageRefs: [approval.stage], attributes: { ...approval },
  });

  for (const evidence of requirements?.evidence ?? []) {
    linkResolved({ kind: 'substantiates', sourceRef: evidence.sourceId, targetRef: evidence.id, relationSourceRef: evidence.id, rationale: 'Source evidence supports the extracted evidence record.' });
  }
  for (const requirement of requirements?.requirements ?? []) {
    for (const evidenceRef of requirement.evidenceRefs) linkResolved({ kind: 'substantiates', sourceRef: evidenceRef, targetRef: requirement.id, relationSourceRef: requirement.id, rationale: 'Evidence substantiates the canonical requirement.', evidenceRefs: [evidenceRef] });
    for (const stakeholderRef of requirement.stakeholderRefs) linkResolved({ kind: 'motivates', sourceRef: stakeholderRef, targetRef: requirement.id, relationSourceRef: requirement.id, rationale: 'Stakeholder concern motivates the requirement.' });
    for (const journeyRef of requirement.journeyRefs) linkResolved({ kind: 'traces-to', sourceRef: requirement.id, targetRef: journeyRef, relationSourceRef: requirement.id, rationale: 'Requirement is exercised by the solution journey.' });
  }
  for (const journey of requirements?.journeys ?? []) {
    for (const requirementRef of journey.requirementRefs) linkResolved({ kind: 'traces-to', sourceRef: requirementRef, targetRef: journey.id, relationSourceRef: journey.id, rationale: 'Journey traces to the accepted requirement.' });
    for (const actorRef of journey.actorRefs) linkResolved({ kind: 'participates-in', sourceRef: actorRef, targetRef: journey.id, relationSourceRef: journey.id, rationale: 'Actor participates in the solution journey.' });
  }
  for (const question of requirements?.openQuestions ?? []) {
    for (const requirementRef of question.relatedRequirementRefs) linkResolved({ kind: 'affects', sourceRef: question.id, targetRef: requirementRef, relationSourceRef: question.id, rationale: 'Open question affects the requirement.' });
    for (const journeyRef of question.relatedJourneyRefs) linkResolved({ kind: 'affects', sourceRef: question.id, targetRef: journeyRef, relationSourceRef: question.id, rationale: 'Open question affects the journey.' });
  }
  for (const style of project.styleDecisions) if (style.scopeNodeId) linkResolved({ kind: 'applies-to', sourceRef: style.id, targetRef: style.scopeNodeId, relationSourceRef: style.id, rationale: 'Architecture style decision applies to the selected scope.', stageRefs: [style.stage] });
  for (const pattern of project.patternSelections) if (pattern.scopeNodeId) linkResolved({ kind: 'applies-to', sourceRef: pattern.id, targetRef: pattern.scopeNodeId, relationSourceRef: pattern.id, rationale: 'Pattern selection applies to the selected scope.', stageRefs: [pattern.stage] });
  for (const node of project.nodes) {
    if (node.parentId) linkResolved({ kind: 'contains', sourceRef: node.parentId, targetRef: node.id, relationSourceRef: node.id, rationale: 'Architecture object is contained by its parent scope.', stageRefs: [node.stage] });
    for (const lineageRef of node.lineageFrom) linkResolved({ kind: 'derived-from', sourceRef: node.id, targetRef: lineageRef, relationSourceRef: node.id, rationale: 'Architecture object preserves cross-stage lineage.', stageRefs: [node.stage] });
  }
  for (const edge of project.edges) linkResolved({ kind: 'connects-to', sourceRef: edge.sourceId, targetRef: edge.targetId, relationSourceRef: edge.id, rationale: edge.label ?? `Canonical ${edge.kind} relationship.`, stageRefs: [edge.stage] });
  for (const architectureInterface of project.interfaces ?? []) {
    linkResolved({ kind: 'provides', sourceRef: architectureInterface.providerNodeId, targetRef: architectureInterface.id, relationSourceRef: architectureInterface.id, rationale: 'Provider exposes the governed architecture interface.', stageRefs: [architectureInterface.stage], evidenceRefs: architectureInterface.evidenceIds });
    for (const consumerNodeId of architectureInterface.consumerNodeIds) linkResolved({ kind: 'consumes', sourceRef: consumerNodeId, targetRef: architectureInterface.id, relationSourceRef: architectureInterface.id, rationale: 'Consumer uses the governed architecture interface.', stageRefs: [architectureInterface.stage], evidenceRefs: architectureInterface.evidenceIds });
  }
  for (const decision of project.decisions) {
    for (const driver of decision.drivers) linkResolved({ kind: 'drives', sourceRef: driver, targetRef: decision.id, relationSourceRef: decision.id, rationale: 'Driver informs the architecture decision.' });
    for (const linkedRef of decision.linkedRecordIds ?? []) linkResolved({ kind: 'traces-to', sourceRef: decision.id, targetRef: linkedRef, relationSourceRef: decision.id, rationale: 'Decision traces to the linked architecture record.' });
    if (decision.scopeNodeId) linkResolved({ kind: 'applies-to', sourceRef: decision.id, targetRef: decision.scopeNodeId, relationSourceRef: decision.id, rationale: 'Decision applies to the selected architecture scope.' });
  }
  for (const finding of project.findings) {
    for (const nodeId of finding.affectedNodeIds) linkResolved({ kind: 'affects', sourceRef: finding.id, targetRef: nodeId, relationSourceRef: finding.id, rationale: 'Finding affects the architecture object.' });
    for (const edgeId of finding.affectedEdgeIds) linkResolved({ kind: 'affects', sourceRef: finding.id, targetRef: edgeId, relationSourceRef: finding.id, rationale: 'Finding affects the architecture relationship.' });
  }
  for (const approval of project.stageApprovals) linkResolved({ kind: 'approves', sourceRef: approval.id, targetRef: project.id, relationSourceRef: approval.id, rationale: 'Stage approval records human governance of the project.', stageRefs: [approval.stage] });

  if (projectionMode === 'materialized-canonical') {
    const authorityRecord = project.designGraph?.records.find((record) =>
      record.kind === 'policy-gate'
      && record.sourceRef === 'canonical-state-authority'
      && record.attributes.markerType === 'canonical-state-authority'
    );
    if (authorityRecord && !records.some((record) => record.id === authorityRecord.id)) {
      records.push(structuredClone(authorityRecord));
      for (const relationship of project.designGraph?.relationships ?? []) {
        if (relationship.sourceId === authorityRecord.id || relationship.targetId === authorityRecord.id) {
          if (!relationships.some((item) => item.id === relationship.id)) relationships.push(structuredClone(relationship));
        }
      }
    }
  }

  const sortedRecords = records.sort((left, right) => left.id.localeCompare(right.id));
  const sortedRelationships = relationships.sort((left, right) => left.id.localeCompare(right.id));
  const partial = {
    schemaVersion: '1.0' as const,
    tenantId: project.tenantId,
    projectId: project.id,
    branchId: project.branch.id,
    projectRevision: project.revision,
    graphRevision: project.revision,
    projectionMode,
    generatedAt: project.updatedAt,
    fingerprint: '',
    records: sortedRecords,
    relationships: sortedRelationships,
  };
  partial.fingerprint = architectureDesignGraphHash(graphPayload(partial));
  const integrity = validateArchitectureDesignGraph(partial);
  return { ...partial, integrity };
}

export function isArchitectureDesignGraphFresh(
  project: ArchitectureProject,
  graph = project.designGraph,
): boolean {
  if (!graph) return false;
  if (graph.projectId !== project.id || graph.branchId !== project.branch.id || graph.projectRevision !== project.revision) return false;
  const expected = buildArchitectureDesignGraph(project, graph.projectionMode);
  return expected.fingerprint === graph.fingerprint && graph.integrity.healthy;
}

export function synchronizeArchitectureProjectDesignGraph(
  project: ArchitectureProject,
): ArchitectureProject {
  const projectionMode: ArchitectureDesignGraphProjectionMode =
    project.designGraph?.projectionMode === 'materialized-canonical'
      ? 'materialized-canonical'
      : 'legacy-project-projection';
  const designGraph = buildArchitectureDesignGraph(project, projectionMode);
  return { ...project, designGraph };
}

export function materializeArchitectureProjectDesignGraph(input: {
  project: ArchitectureProject;
  expectedPreviewFingerprint: string;
  materializedAt?: string;
}): { project: ArchitectureProject; receipt: ArchitectureDesignGraphMaterializationReceipt } {
  const previewMode: ArchitectureDesignGraphProjectionMode =
    input.project.designGraph?.projectionMode === 'materialized-canonical'
      ? 'materialized-canonical'
      : 'legacy-project-projection';
  const preview = buildArchitectureDesignGraph(input.project, previewMode);
  if (preview.fingerprint !== input.expectedPreviewFingerprint) throw new Error('STALE_DESIGN_GRAPH_PREVIEW');
  if (!preview.integrity.healthy) throw new Error('DESIGN_GRAPH_INTEGRITY_FAILED');
  const materializedAt = input.materializedAt ?? new Date().toISOString();
  const nextBase: ArchitectureProject = {
    ...input.project,
    revision: input.project.revision + 1,
    updatedAt: materializedAt,
  };
  const designGraph = buildArchitectureDesignGraph(nextBase, 'materialized-canonical');
  const project: ArchitectureProject = { ...nextBase, designGraph };
  return {
    project,
    receipt: {
      schemaVersion: '1.0',
      projectId: project.id,
      branchId: project.branch.id,
      fromRevision: input.project.revision,
      toRevision: project.revision,
      previewFingerprint: preview.fingerprint,
      materializedFingerprint: designGraph.fingerprint,
      recordCount: designGraph.records.length,
      relationshipCount: designGraph.relationships.length,
      materializedAt,
      humanApprovalRequired: true,
      sourceAuthority: 'architect',
    },
  };
}
