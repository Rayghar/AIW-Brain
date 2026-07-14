import {
  createDesignLibrary,
  createId,
  type ArchitectureEdge,
  type ArchitectureNode,
  type ArchitectureProject,
  type ArchitectureStage,
  type CanvasComplianceMetric,
  type DesignLibraryRecord,
  type Finding,
  type KnowledgeLibrary,
  type LibraryDropPreview,
  type Point,
  type RelationshipKind,
  type SemanticConnectionOption,
} from '@aiw/domain';
import { recommendInContext } from './contextualRecommendations.js';
import { validateProject, validateProposedEdge, validateProposedNode } from './validation.js';

function recordById(library: KnowledgeLibrary, recordId: string): DesignLibraryRecord | undefined {
  return createDesignLibrary(library).find((record) => record.id === recordId);
}

function nearestScope(project: ArchitectureProject, stage: ArchitectureStage, position: Point, explicitScope?: string): string | undefined {
  if (explicitScope && project.nodes.some((node) => node.id === explicitScope)) return explicitScope;
  let nearest: { id: string; distance: number } | undefined;
  for (const node of project.nodes.filter((item) => item.stage === stage)) {
    const point = node.positions[stage];
    if (!point) continue;
    const distance = Math.hypot(point.x - position.x, point.y - position.y);
    if (distance <= 220 && (!nearest || distance < nearest.distance)) nearest = { id: node.id, distance };
  }
  return nearest?.id;
}

function instantiateNodes(record: DesignLibraryRecord, stage: ArchitectureStage, position: Point, scopeNodeId?: string): ArchitectureNode[] {
  if (record.recordType === 'component' && record.componentKind) {
    return [{
      id: createId('node'), kind: record.componentKind, stage, label: record.name, description: record.description,
      properties: { ...(record.defaultProperties ?? {}), libraryRecordId: record.id, libraryVersion: record.version },
      lineageFrom: [], parentId: record.depiction.canContainChildren ? undefined : scopeNodeId,
      positions: { [stage]: position }, tags: [...record.tags], status: 'draft',
    }];
  }
  if ((record.recordType === 'pattern' || record.recordType === 'template') && record.nodeTemplate) {
    return record.nodeTemplate.filter((template) => template.stage === stage).map((template) => ({
      id: createId(`node-${template.key}`), kind: template.kind, stage, label: template.label,
      description: template.description, properties: { ...template.properties, libraryRecordId: record.id, patternId: record.id },
      lineageFrom: [], parentId: scopeNodeId, positions: { [stage]: { x: position.x + template.offset.x, y: position.y + template.offset.y } },
      tags: [...template.tags], status: 'draft',
    }));
  }
  return [];
}

function instantiateEdges(record: DesignLibraryRecord, stage: ArchitectureStage, nodes: ArchitectureNode[]): ArchitectureEdge[] {
  if (!record.edgeTemplate?.length || !record.nodeTemplate?.length) return [];
  const byKey = new Map<string, ArchitectureNode>();
  record.nodeTemplate.filter((item) => item.stage === stage).forEach((template, index) => {
    const node = nodes[index]; if (node) byKey.set(template.key, node);
  });
  return record.edgeTemplate.filter((item) => item.stage === stage).flatMap((template) => {
    const source = byKey.get(template.sourceKey); const target = byKey.get(template.targetKey);
    if (!source || !target) return [];
    return [{ id: createId('edge'), sourceId: source.id, targetId: target.id, kind: template.kind, stage, label: template.label, properties: { ...template.properties, patternId: record.id } }];
  });
}

export function previewLibraryDrop(
  project: ArchitectureProject,
  library: KnowledgeLibrary,
  recordId: string,
  stage: ArchitectureStage,
  position: Point,
  explicitScopeNodeId?: string,
): LibraryDropPreview {
  const record = recordById(library, recordId);
  if (!record) throw new Error(`Unknown library record ${recordId}.`);
  const scopeNodeId = nearestScope(project, stage, position, explicitScopeNodeId);
  const applicable = record.applicableStages.includes(stage);
  const findings: LibraryDropPreview['findings'] = [];
  if (!applicable) findings.push({ severity: 'HARD', title: 'Wrong architecture view', message: `${record.name} applies to ${record.applicableStages.join(', ')}, not ${stage}.` });

  if (record.approvalStatus === 'deprecated') findings.push({ severity: 'SIGNIFICANT', title: 'Deprecated library record', message: `${record.name} is deprecated and should only be used with a documented migration rationale.` });
  for (const requiredId of record.requires) {
    const selected = project.patternSelections.some((item) => item.patternId === requiredId && ['considering','accepted'].includes(item.status));
    const nodeExists = project.nodes.some((item) => String(item.properties.libraryRecordId ?? '') === requiredId);
    if (!selected && !nodeExists) findings.push({ severity: 'SIGNIFICANT', title: 'Missing prerequisite', message: `${record.name} requires ${requiredId}. It can be considered, but the prerequisite becomes an open obligation.` });
  }
  for (const conflictId of record.conflictsWith) {
    const selected = project.patternSelections.some((item) => item.patternId === conflictId && item.status === 'accepted') || project.styleDecisions.some((item) => item.styleId === conflictId && item.status === 'accepted');
    if (selected) findings.push({ severity: 'SIGNIFICANT', title: 'Conflicting selection', message: `${record.name} is in tension with the accepted ${conflictId} selection.` });
  }
  const prohibited = project.context.prohibitedTechnologies ?? [];
  if (record.recordType === 'component' && prohibited.some((term) => record.name.toLowerCase().includes(term.toLowerCase()))) {
    findings.push({ severity: 'HARD', title: 'Prohibited technology', message: `${record.name} conflicts with an approved project technology prohibition.` });
  }

  const nodes = applicable ? instantiateNodes(record, stage, position, scopeNodeId) : [];
  const edges = applicable ? instantiateEdges(record, stage, nodes) : [];
  for (const node of nodes) {
    const validation = validateProposedNode(project, node);
    for (const finding of validation.findings) findings.push({ severity: finding.severity, title: finding.title, message: finding.message });
  }
  for (const edge of edges) {
    const validation = validateProposedEdge({ ...project, nodes: [...project.nodes, ...nodes] }, edge);
    for (const finding of validation.findings) findings.push({ severity: finding.severity, title: finding.title, message: finding.message });
  }

  const blocked = findings.some((finding) => finding.severity === 'HARD');
  const warning = findings.some((finding) => finding.severity === 'SIGNIFICANT' || finding.severity === 'ADVISORY');
  return {
    recordId, record, disposition: blocked ? 'blocked' : warning ? 'warning' : 'allowed',
    title: blocked ? `Cannot place ${record.name}` : warning ? `Place ${record.name} with review` : `Place ${record.name}`,
    explanation: blocked ? 'The proposed placement violates a structural or approved policy constraint.' : warning ? 'The placement is valid but creates trade-offs, prerequisites or decision obligations.' : 'The placement is valid and coherent with the current design context.',
    findings, obligations: record.obligations, scopeNodeId, position, nodes, edges,
    styleDecision: record.recordType === 'style' ? { id: createId('style-decision'), styleId: record.id, scopeNodeId, stage, rationale: `Applied from the visual architecture library at ${stage}.`, status: 'accepted' } : undefined,
    patternSelection: record.recordType === 'pattern' ? { id: createId('pattern-selection'), patternId: record.id, scopeNodeId, stage, rationale: `Applied from the visual architecture library at ${stage}.`, status: 'accepted', obligationsAcknowledged: [] } : undefined,
  };
}

export function applyLibraryDrop(project: ArchitectureProject, preview: LibraryDropPreview): ArchitectureProject {
  if (preview.disposition === 'blocked') throw new Error(preview.explanation);
  const next = structuredClone(project);
  next.nodes.push(...preview.nodes);
  next.edges.push(...preview.edges);
  if (preview.styleDecision) {
    next.styleDecisions.filter((item) => item.stage === preview.styleDecision?.stage && item.scopeNodeId === preview.styleDecision?.scopeNodeId && item.status === 'accepted').forEach((item) => { item.status = 'superseded'; });
    next.styleDecisions.push(preview.styleDecision);
  }
  if (preview.patternSelection) {
    const existing = next.patternSelections.find((item) => item.patternId === preview.patternSelection?.patternId && item.scopeNodeId === preview.patternSelection?.scopeNodeId && item.stage === preview.patternSelection?.stage && item.status !== 'superseded');
    if (existing) existing.status = 'accepted'; else next.patternSelections.push(preview.patternSelection);
  }
  if (preview.record.recordType === 'template') {
    next.decisions.push({
      id: createId('adr'),
      title: `Apply ${preview.record.name} topology`,
      context: `The ${preview.record.name} governed model fragment was selected for ${preview.record.applicableStages.join(', ')}.`,
      decision: `Apply the ${preview.record.name} topology template to the selected architecture scope.`,
      drivers: preview.record.whenToUse,
      consideredOptions: preview.record.conflictsWith,
      consequences: [...preview.record.obligations, ...preview.record.risks],
      status: 'proposed',
      createdAt: new Date().toISOString(),
      linkedRecordIds: [preview.record.sourceRecordId ?? preview.record.id, ...(preview.record.evidenceIds ?? [])],
      ...(preview.scopeNodeId ? { scopeNodeId: preview.scopeNodeId } : {}),
    });
  }
  next.revision += 1;
  next.updatedAt = new Date().toISOString();
  return next;
}

export function getSemanticConnectionOptions(project: ArchitectureProject, sourceId: string, targetId: string): SemanticConnectionOption[] {
  const source = project.nodes.find((node) => node.id === sourceId);
  const target = project.nodes.find((node) => node.id === targetId);
  if (!source || !target) return [];
  const options: SemanticConnectionOption[] = [];
  const add = (kind: RelationshipKind, label: string, recommended: boolean, explanation: string, intermediaryRecordIds: string[] = []) => options.push({ kind, label, recommended, explanation, intermediaryRecordIds });
  if (source.stage !== target.stage) {
    add(source.stage === 'logicalApplication' ? 'realizes' : 'mapsTo', 'Create lineage mapping', true, 'Cross-view objects should be connected through an explicit realization or mapping relationship.');
    return options;
  }
  if (source.kind === 'Event' || target.kind === 'Event' || source.tags.includes('messaging') || target.tags.includes('messaging')) {
    add('publishes','Publish event',source.kind !== 'Event','Use for a producer-to-event or producer-to-broker flow.',['PAT-IDEMPOTENT','PAT-DLQ']);
    add('subscribes','Subscribe to event',target.kind !== 'Event','Use for event or broker consumption.',['PAT-IDEMPOTENT','PAT-DLQ']);
  }
  if (/DataStore|TechnologyProduct|LogicalTechnologyCapability/.test(target.kind) && target.tags.some((tag) => ['data','database','relational','document'].includes(tag))) {
    add('reads','Read data',true,'Models a query dependency on the selected data capability.');
    add('writes','Write data',true,'Models a state-changing dependency on the selected data capability.');
  }
  add('communicatesWith','Synchronous interaction',options.length === 0,'Models direct request-response communication.',['PAT-CIRCUIT-BREAKER','PAT-RETRY']);
  add('dependsOn','Dependency',false,'Models a general dependency when the interaction protocol is not yet defined.');
  return options;
}

export function computeCanvasCompliance(project: ArchitectureProject, library: KnowledgeLibrary, findings?: Finding[]): CanvasComplianceMetric[] {
  const activeFindings = findings ?? validateProject(project, library);
  const hard = activeFindings.filter((item) => item.severity === 'HARD').length;
  const significant = activeFindings.filter((item) => item.severity === 'SIGNIFICANT').length;
  const acceptedPatterns = project.patternSelections.filter((item) => item.status === 'accepted');
  const openObligations = acceptedPatterns.flatMap((selection) => {
    const pattern = library.patterns.find((item) => item.id === selection.patternId);
    return (pattern?.obligations ?? []).filter((item) => !selection.obligationsAcknowledged.includes(item));
  }).length;
  const securityNodes = project.nodes.filter((node) => node.kind === 'Control' || node.tags.includes('security')).length;
  const approvedStages = project.stageApprovals.filter((item) => item.status === 'approved').length;
  return [
    { id: 'design-integrity', name: 'Architecture integrity', applicableControls: Math.max(1, project.nodes.length + project.edges.length), satisfiedControls: Math.max(0, project.nodes.length + project.edges.length - hard - significant), evidenceGaps: openObligations, activeExceptions: 0, hardViolations: hard },
    { id: 'security-design', name: 'Security design controls', applicableControls: 4, satisfiedControls: Math.min(4, securityNodes + (project.secretReferences.length ? 1 : 0) + (project.securitySettings.requireSso ? 1 : 0)), evidenceGaps: securityNodes ? 0 : 1, activeExceptions: project.technologyStandardExceptions.filter((item) => item.status === 'active').length, hardViolations: activeFindings.filter((item) => /security|identity|encrypt/i.test(`${item.title} ${item.message}`) && item.severity === 'HARD').length },
    { id: 'governance', name: 'Decision & governance coverage', applicableControls: 6, satisfiedControls: Math.min(6, approvedStages + Math.min(2, project.decisions.filter((item) => item.status === 'accepted').length)), evidenceGaps: Math.max(0, 3 - project.decisions.length), activeExceptions: project.driftWaivers.filter((item) => item.status === 'active').length, hardViolations: 0 },
  ];
}

export function contextualLibrary(project: ArchitectureProject, library: KnowledgeLibrary, scopeNodeId?: string): Array<DesignLibraryRecord & { recommendationScore: number; recommendationReason: string }> {
  const recommendations = recommendInContext(project, library, { stage: project.activeStage, scopeNodeId, trigger: 'scope-change' });
  const scoreById = new Map<string, { score: number; reason: string }>();
  for (const item of recommendations.styles) scoreById.set(item.styleId, { score: Math.max(0, Math.min(100, item.score * 20)), reason: item.strengths[0] ?? item.assumptions[0] ?? 'Relevant to current quality drivers.' });
  for (const item of recommendations.patterns) scoreById.set(item.patternId, { score: item.score, reason: item.reasons[0] ?? 'Relevant to the current architecture context.' });
  return createDesignLibrary(library).filter((record) => record.applicableStages.includes(project.activeStage)).map((record) => ({ ...record, recommendationScore: scoreById.get(record.id)?.score ?? (record.recordType === 'component' ? 55 : 25), recommendationReason: scoreById.get(record.id)?.reason ?? `Available in the ${project.activeStage} view.` })).sort((a,b) => b.recommendationScore - a.recommendationScore);
}
