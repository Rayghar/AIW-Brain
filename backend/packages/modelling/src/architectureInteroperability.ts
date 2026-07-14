import type {
  ArchitectureEdge,
  ArchitectureExchangeDocument,
  ArchitectureExchangeFormat,
  ArchitectureExchangeIssue,
  ArchitectureImportConflict,
  ArchitectureImportResult,
  ArchitectureNode,
  ArchitectureProject,
  ArchitectureRoundTripReport,
  ArchitectureStage,
  EntityKind,
  ImportConflictResolution,
  RelationshipKind,
} from '@aiw/domain';

const stageOrder: ArchitectureStage[] = ['designIntent','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','validationRealization'];
const entityKinds = new Set<EntityKind>(['Stakeholder','Objective','Requirement','QualityScenario','Constraint','Assumption','System','Actor','ExternalSystem','Domain','Capability','LogicalService','ApplicationComponent','Module','DeployableUnit','Interface','API','Event','DataDomain','DataEntity','DataStore','LogicalTechnologyCapability','TechnologyProduct','TechnologyComponent','DeploymentNode','Environment','Region','AvailabilityZone','NetworkZone','Runtime','Control','Risk','ArchitectureStyle','Pattern','Tactic']);
const relationshipKinds = new Set<RelationshipKind>(['motivates','constrains','satisfies','realizes','implements','contains','dependsOn','communicatesWith','exposes','consumes','publishes','subscribes','reads','writes','stores','deployedOn','hostedBy','locatedIn','protectedBy','observedBy','derivedFrom','replaces','mapsTo','supports','requires','recommends','mitigates','governedBy','selectedBecauseOf']);

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function stableProjectShape(project: ArchitectureProject): string {
  const shape = {
    id: project.id,
    revision: project.revision,
    nodes: project.nodes.map((node) => ({ id: node.id, semanticId: node.semanticId, kind: node.kind, stage: node.stage, label: node.label, parentId: node.parentId, properties: node.properties, lineageFrom: [...node.lineageFrom].sort(), tags: [...node.tags].sort() })).sort((a,b) => a.id.localeCompare(b.id)),
    edges: project.edges.map((edge) => ({ id: edge.id, sourceId: edge.sourceId, targetId: edge.targetId, kind: edge.kind, stage: edge.stage, label: edge.label, properties: edge.properties })).sort((a,b) => a.id.localeCompare(b.id)),
    interfaces: [...(project.interfaces ?? [])].sort((a,b) => a.id.localeCompare(b.id)),
  };
  return JSON.stringify(shape);
}

export function fingerprintArchitectureProject(project: ArchitectureProject): string {
  return `aiw-${stableHash(stableProjectShape(project))}`;
}

function alias(value: string, prefix = 'e'): string {
  const clean = value.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 44);
  return `${prefix}_${clean || stableHash(value)}`;
}

function quote(value: unknown): string {
  return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ')}"`;
}

function encodeMetadata(value: unknown): string {
  return encodeURIComponent(JSON.stringify(value));
}

function decodeMetadata<T>(value: string): T | null {
  try { return JSON.parse(decodeURIComponent(value)) as T; } catch { return null; }
}

function c4ElementKeyword(node: ArchitectureNode): 'person' | 'softwareSystem' | 'container' | 'component' | 'deploymentNode' | 'infrastructureNode' {
  if (node.kind === 'Actor' || node.kind === 'Stakeholder') return 'person';
  if (node.kind === 'System' || node.kind === 'ExternalSystem' || node.kind === 'Domain') return 'softwareSystem';
  if (node.stage === 'physicalTechnology' && ['DeploymentNode','Region','AvailabilityZone','Environment','NetworkZone'].includes(node.kind)) return 'deploymentNode';
  if (node.stage === 'physicalTechnology' && ['TechnologyProduct','TechnologyComponent','Runtime','DataStore','Control'].includes(node.kind)) return 'infrastructureNode';
  if (node.stage === 'applicationRealization' || ['ApplicationComponent','DeployableUnit','API','Event','DataStore'].includes(node.kind)) return 'container';
  return 'component';
}

function likeC4ElementKeyword(node: ArchitectureNode): 'actor' | 'system' | 'component' | 'deployment' {
  if (node.kind === 'Actor' || node.kind === 'Stakeholder') return 'actor';
  if (node.stage === 'physicalTechnology') return 'deployment';
  if (node.kind === 'System' || node.kind === 'ExternalSystem' || node.kind === 'Domain') return 'system';
  return 'component';
}

function relationshipTechnology(edge: ArchitectureEdge): string {
  const protocol = edge.properties.protocol ?? edge.properties.technology ?? edge.properties.contract;
  return protocol ? String(protocol) : edge.kind;
}

export function exportStructurizrDsl(project: ArchitectureProject): ArchitectureExchangeDocument {
  const aliases = new Map(project.nodes.map((node, index) => [node.id, alias(node.semanticId ?? node.id, `n${index + 1}`)]));
  const modelLines: string[] = [];
  for (const node of project.nodes.filter((item) => item.status !== 'deprecated')) {
    const keyword = c4ElementKeyword(node);
    const nodeAlias = aliases.get(node.id)!;
    modelLines.push(`        // aiw-node:${encodeMetadata(node)}`);
    modelLines.push(`        ${nodeAlias} = ${keyword} ${quote(node.label)} ${quote(node.description ?? '')} ${quote(String(node.properties.technology ?? node.kind))} {`);
    modelLines.push(`            tags ${quote(['AIW', node.kind, node.stage, ...node.tags].join(','))}`);
    modelLines.push('            properties {');
    modelLines.push(`                "aiw.id" ${quote(node.id)}`);
    modelLines.push(`                "aiw.semanticId" ${quote(node.semanticId ?? '')}`);
    modelLines.push(`                "aiw.kind" ${quote(node.kind)}`);
    modelLines.push(`                "aiw.stage" ${quote(node.stage)}`);
    if (node.parentId) modelLines.push(`                "aiw.parentId" ${quote(node.parentId)}`);
    modelLines.push('            }');
    modelLines.push('        }');
  }
  for (const edge of project.edges) {
    const source = aliases.get(edge.sourceId); const target = aliases.get(edge.targetId);
    if (!source || !target) continue;
    modelLines.push(`        // aiw-edge:${encodeMetadata(edge)}`);
    modelLines.push(`        ${source} -> ${target} ${quote(edge.label ?? edge.kind)} ${quote(relationshipTechnology(edge))} { tags ${quote(['AIW', edge.kind, edge.stage].join(','))} }`);
  }
  const primarySystem = project.nodes.find((node) => node.kind === 'System') ?? project.nodes.find((node) => ['Domain','ApplicationComponent','LogicalService'].includes(node.kind));
  const primaryAlias = primarySystem ? aliases.get(primarySystem.id) : undefined;
  const content = [
    `workspace ${quote(project.name)} ${quote(project.description)} {`,
    '    !identifiers flat',
    `    // aiw-project:${encodeMetadata({ id: project.id, revision: project.revision, branch: project.branch, tenantId: project.tenantId, schemaVersion: project.schemaVersion, activeStage: project.activeStage, interfaces: project.interfaces ?? [], fingerprint: fingerprintArchitectureProject(project) })}`,
    '    model {', ...modelLines, '    }',
    '    views {',
    primaryAlias ? `        systemContext ${primaryAlias} "AIW-System-Context" { include *; autolayout lr }` : '        systemLandscape "AIW-System-Landscape" { include *; autolayout lr }',
    primaryAlias ? `        container ${primaryAlias} "AIW-Application-Realization" { include *; autolayout lr }` : '',
    '        deployment * "AIW-Physical-Deployment" { include *; autolayout lr }',
    '        styles {',
    '            element "AIW" { background #0b2131; color #effcff; stroke #2dd4bf }',
    '            relationship "AIW" { color #2dd4bf; thickness 2 }',
    '        }',
    '    }',
    '}',
  ].filter(Boolean).join('\n');
  return { format: 'structurizr-dsl', formatVersion: 'structurizr-dsl/1', generatedAt: new Date().toISOString(), projectId: project.id, projectRevision: project.revision, mediaType: 'text/vnd.structurizr.dsl', fileName: 'workspace.dsl', content, fingerprint: `structurizr-${stableHash(content)}`, source: 'generated' };
}

function calmNodeType(node: ArchitectureNode): string {
  if (node.kind === 'Actor' || node.kind === 'Stakeholder') return 'actor';
  if (['NetworkZone','Region','AvailabilityZone','Environment'].includes(node.kind)) return 'network';
  if (['DataStore','DataDomain','DataEntity'].includes(node.kind)) return 'database';
  if (node.kind === 'Control') return 'system';
  if (node.stage === 'physicalTechnology') return 'infrastructure';
  return 'service';
}

export function exportCalmJson(project: ArchitectureProject): ArchitectureExchangeDocument {
  const document = {
    '$schema': 'https://calm.finos.org/release/1.0/meta/calm.json',
    'unique-id': project.id,
    name: project.name,
    description: project.description,
    metadata: [
      { key: 'aiw.project-revision', value: String(project.revision) },
      { key: 'aiw.branch-id', value: project.branch.id },
      { key: 'aiw.canonical-fingerprint', value: fingerprintArchitectureProject(project) },
    ],
    nodes: project.nodes.filter((node) => node.status !== 'deprecated').map((node) => ({
      'unique-id': node.id,
      'node-type': calmNodeType(node),
      name: node.label,
      description: node.description ?? '',
      interfaces: (project.interfaces ?? []).filter((item) => item.providerNodeId === node.id).map((item) => ({
        'unique-id': item.id, name: item.name, 'interface-type': item.interactionStyle, protocol: item.protocol,
        configuration: { operation: item.operationOrEvent, version: item.version, authentication: item.authentication, authorization: item.authorization, encryption: item.encryption, owner: item.owner },
      })),
      controls: node.kind === 'Control' ? { security: { description: node.description ?? node.label, requirements: node.properties } } : undefined,
      metadata: [{ key: 'aiw.kind', value: node.kind }, { key: 'aiw.stage', value: node.stage }, { key: 'aiw.semantic-id', value: node.semanticId ?? '' }, { key: 'aiw.tags', value: node.tags.join(',') }],
      'x-aiw': node,
    })),
    relationships: project.edges.map((edge) => ({
      'unique-id': edge.id,
      description: edge.label ?? edge.kind,
      'relationship-type': { connects: { source: { node: edge.sourceId }, destination: { node: edge.targetId } } },
      protocol: relationshipTechnology(edge),
      metadata: [{ key: 'aiw.kind', value: edge.kind }, { key: 'aiw.stage', value: edge.stage }],
      'x-aiw': edge,
    })),
    controls: {
      architecture: {
        description: 'AIW governed architecture controls and obligations',
        requirements: project.findings.map((finding) => ({ id: finding.id, severity: finding.severity, title: finding.title, statement: finding.message })),
      },
    },
    'x-aiw': { schemaVersion: project.schemaVersion, branch: project.branch, tenantId: project.tenantId, activeStage: project.activeStage, interfaces: project.interfaces ?? [] },
  };
  const content = JSON.stringify(document, null, 2);
  return { format: 'calm-json', formatVersion: 'CALM-1.0-compatible', generatedAt: new Date().toISOString(), projectId: project.id, projectRevision: project.revision, mediaType: 'application/vnd.finos.calm+json', fileName: 'architecture.calm.json', content, fingerprint: `calm-${stableHash(content)}`, source: 'generated' };
}

export function exportLikeC4(project: ArchitectureProject): ArchitectureExchangeDocument {
  const aliases = new Map(project.nodes.map((node, index) => [node.id, alias(node.semanticId ?? node.id, `e${index + 1}`)]));
  const lines: string[] = [
    'specification {',
    '  element actor { style { shape person } }',
    '  element system',
    '  element component',
    '  element deployment { style { shape node } }',
    '  relationship sync',
    '  relationship async { line dashed }',
    '}',
    '',
    `// aiw-project:${encodeMetadata({ id: project.id, revision: project.revision, branch: project.branch, tenantId: project.tenantId, schemaVersion: project.schemaVersion, activeStage: project.activeStage, interfaces: project.interfaces ?? [], fingerprint: fingerprintArchitectureProject(project) })}`,
    'model {',
  ];
  for (const node of project.nodes.filter((item) => item.status !== 'deprecated')) {
    const nodeAlias = aliases.get(node.id)!;
    lines.push(`  // aiw-node:${encodeMetadata(node)}`);
    lines.push(`  ${likeC4ElementKeyword(node)} ${nodeAlias} ${quote(node.label)} {`);
    if (node.description) lines.push(`    description ${quote(node.description)}`);
    lines.push(`    technology ${quote(String(node.properties.technology ?? node.kind))}`);
    lines.push(`    tags ${quote([node.kind,node.stage,...node.tags].join(','))}`);
    lines.push('  }');
  }
  for (const edge of project.edges) {
    const source = aliases.get(edge.sourceId); const target = aliases.get(edge.targetId);
    if (!source || !target) continue;
    const relation = ['publishes','subscribes'].includes(edge.kind) ? 'async' : 'sync';
    lines.push(`  // aiw-edge:${encodeMetadata(edge)}`);
    lines.push(`  ${source} -[${relation}]-> ${target} ${quote(edge.label ?? edge.kind)} { technology ${quote(relationshipTechnology(edge))} }`);
  }
  lines.push('}', '', 'views {', '  view architecture {', '    title "AIW Architecture Viewbook"', '    include *', '    autoLayout LeftRight', '  }', '}');
  const content = lines.join('\n');
  return { format: 'likec4', formatVersion: 'LikeC4-compatible/1', generatedAt: new Date().toISOString(), projectId: project.id, projectRevision: project.revision, mediaType: 'text/vnd.likec4', fileName: 'architecture.c4', content, fingerprint: `likec4-${stableHash(content)}`, source: 'generated' };
}

export function exportArchitectureExchange(project: ArchitectureProject, format: ArchitectureExchangeFormat): ArchitectureExchangeDocument {
  if (format === 'structurizr-dsl') return exportStructurizrDsl(project);
  if (format === 'calm-json') return exportCalmJson(project);
  return exportLikeC4(project);
}

function defaultStageForKind(kind: EntityKind): ArchitectureStage {
  if (['Requirement','QualityScenario','Constraint','Assumption','Objective','Stakeholder'].includes(kind)) return 'designIntent';
  if (['System','Actor','ExternalSystem','Domain','Capability','LogicalService','DataDomain','DataEntity'].includes(kind)) return 'logicalApplication';
  if (['ApplicationComponent','Module','DeployableUnit','Interface','API','Event'].includes(kind)) return 'applicationRealization';
  if (['LogicalTechnologyCapability'].includes(kind)) return 'logicalTechnology';
  if (['TechnologyProduct','TechnologyComponent','DeploymentNode','Environment','Region','AvailabilityZone','NetworkZone','Runtime'].includes(kind)) return 'physicalTechnology';
  return 'logicalApplication';
}

function normalizeKind(value: unknown, fallback: EntityKind = 'ApplicationComponent'): EntityKind {
  const candidate = String(value ?? fallback) as EntityKind;
  return entityKinds.has(candidate) ? candidate : fallback;
}

function normalizeStage(value: unknown, kind: EntityKind): ArchitectureStage {
  const candidate = String(value ?? '') as ArchitectureStage;
  return stageOrder.includes(candidate) ? candidate : defaultStageForKind(kind);
}

function normalizeRelationship(value: unknown): RelationshipKind {
  const candidate = String(value ?? 'communicatesWith') as RelationshipKind;
  return relationshipKinds.has(candidate) ? candidate : 'communicatesWith';
}

function importedProjectFromElements(baseProject: ArchitectureProject, nodes: ArchitectureNode[], edges: ArchitectureEdge[], metadata: Record<string, unknown>): ArchitectureProject {
  const now = new Date().toISOString();
  return { ...structuredClone(baseProject), id: String(metadata.projectId ?? baseProject.id), name: String(metadata.name ?? baseProject.name), description: String(metadata.description ?? baseProject.description), nodes, edges, interfaces: Array.isArray(metadata.interfaces) ? structuredClone(metadata.interfaces) as ArchitectureProject['interfaces'] : [], architectureViews: [], architectureViewVersions: [], revision: Number(metadata.revision ?? baseProject.revision), updatedAt: now };
}

function parseEmbeddedMetadata(content: string): { nodes: ArchitectureNode[]; edges: ArchitectureEdge[]; project: Record<string, unknown> | null } {
  const nodes: ArchitectureNode[] = []; const edges: ArchitectureEdge[] = []; let project: Record<string, unknown> | null = null;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('// aiw-node:')) { const value = decodeMetadata<ArchitectureNode>(trimmed.slice('// aiw-node:'.length)); if (value) nodes.push(value); }
    if (trimmed.startsWith('// aiw-edge:')) { const value = decodeMetadata<ArchitectureEdge>(trimmed.slice('// aiw-edge:'.length)); if (value) edges.push(value); }
    if (trimmed.startsWith('// aiw-project:')) project = decodeMetadata<Record<string, unknown>>(trimmed.slice('// aiw-project:'.length));
  }
  return { nodes, edges, project };
}

function structurizrFallback(content: string): { nodes: ArchitectureNode[]; edges: ArchitectureEdge[]; issues: ArchitectureExchangeIssue[] } {
  const nodes: ArchitectureNode[] = []; const edges: ArchitectureEdge[] = []; const issues: ArchitectureExchangeIssue[] = [];
  const aliasToId = new Map<string,string>();
  const declaration = /^\s*([A-Za-z0-9_.-]+)\s*=\s*(person|softwareSystem|container|component|deploymentNode|infrastructureNode)\s+"([^"]+)"(?:\s+"([^"]*)")?(?:\s+"([^"]*)")?/;
  const relation = /^\s*([A-Za-z0-9_.-]+)\s*->\s*([A-Za-z0-9_.-]+)(?:\s+"([^"]*)")?(?:\s+"([^"]*)")?/;
  for (const line of content.split(/\r?\n/)) {
    const nodeMatch = line.match(declaration);
    if (nodeMatch) {
      const [, identifier, keyword, name, description = '', technology = ''] = nodeMatch;
      const id = `imported-${identifier}`;
      const kind: EntityKind = keyword === 'person' ? 'Actor' : keyword === 'softwareSystem' ? 'System' : keyword === 'container' ? 'DeployableUnit' : keyword === 'component' ? 'ApplicationComponent' : keyword === 'deploymentNode' ? 'DeploymentNode' : 'TechnologyProduct';
      const stage = normalizeStage(undefined, kind);
      nodes.push({ id, semanticId: `structurizr:${identifier}`, kind, stage, label: name!, description, properties: { technology, importedFrom: 'structurizr-dsl' }, lineageFrom: [], positions: { [stage]: { x: 120 + (nodes.length % 4) * 260, y: 120 + Math.floor(nodes.length / 4) * 170 } }, tags: ['imported','structurizr'], status: 'draft' });
      aliasToId.set(identifier!, id);
      continue;
    }
    const edgeMatch = line.match(relation);
    if (edgeMatch) {
      const [, sourceAlias, targetAlias, label = 'communicates with', technology = ''] = edgeMatch;
      const sourceId = aliasToId.get(sourceAlias!); const targetId = aliasToId.get(targetAlias!);
      if (!sourceId || !targetId) { issues.push({ id: `ISSUE-STRUCT-${issues.length + 1}`, severity: 'warning', code: 'UNRESOLVED_RELATIONSHIP', message: `Relationship ${sourceAlias} -> ${targetAlias} references an element that was not parsed.` }); continue; }
      edges.push({ id: `imported-edge-${stableHash(`${sourceId}:${targetId}:${label}`)}`, sourceId, targetId, kind: 'communicatesWith', stage: nodes.find((node) => node.id === sourceId)?.stage ?? 'logicalApplication', label, properties: { technology, importedFrom: 'structurizr-dsl' } });
    }
  }
  return { nodes, edges, issues };
}

function likeC4Fallback(content: string): { nodes: ArchitectureNode[]; edges: ArchitectureEdge[]; issues: ArchitectureExchangeIssue[] } {
  const nodes: ArchitectureNode[] = []; const edges: ArchitectureEdge[] = []; const issues: ArchitectureExchangeIssue[] = [];
  const aliasToId = new Map<string,string>();
  const declaration = /^\s*(actor|system|component|deployment)\s+([A-Za-z0-9_.-]+)\s+"([^"]+)"/;
  const relation = /^\s*([A-Za-z0-9_.-]+)\s+-\[(?:sync|async)\]->\s+([A-Za-z0-9_.-]+)(?:\s+"([^"]*)")?/;
  for (const line of content.split(/\r?\n/)) {
    const nodeMatch = line.match(declaration);
    if (nodeMatch) {
      const [, keyword, identifier, name] = nodeMatch;
      const kind: EntityKind = keyword === 'actor' ? 'Actor' : keyword === 'system' ? 'System' : keyword === 'deployment' ? 'DeploymentNode' : 'ApplicationComponent';
      const stage = normalizeStage(undefined, kind); const id = `imported-${identifier}`;
      nodes.push({ id, semanticId: `likec4:${identifier}`, kind, stage, label: name!, description: '', properties: { importedFrom: 'likec4' }, lineageFrom: [], positions: { [stage]: { x: 120 + (nodes.length % 4) * 260, y: 120 + Math.floor(nodes.length / 4) * 170 } }, tags: ['imported','likec4'], status: 'draft' });
      aliasToId.set(identifier!, id); continue;
    }
    const edgeMatch = line.match(relation);
    if (edgeMatch) {
      const [, sourceAlias, targetAlias, label = 'communicates with'] = edgeMatch; const sourceId = aliasToId.get(sourceAlias!); const targetId = aliasToId.get(targetAlias!);
      if (!sourceId || !targetId) { issues.push({ id: `ISSUE-LIKEC4-${issues.length + 1}`, severity: 'warning', code: 'UNRESOLVED_RELATIONSHIP', message: `Relationship ${sourceAlias} -> ${targetAlias} references an element that was not parsed.` }); continue; }
      edges.push({ id: `imported-edge-${stableHash(`${sourceId}:${targetId}:${label}`)}`, sourceId, targetId, kind: 'communicatesWith', stage: nodes.find((node) => node.id === sourceId)?.stage ?? 'logicalApplication', label, properties: { importedFrom: 'likec4' } });
    }
  }
  return { nodes, edges, issues };
}

function metadataValue(list: unknown, key: string): string | undefined {
  if (!Array.isArray(list)) return undefined;
  const item = list.find((entry) => entry && typeof entry === 'object' && String((entry as Record<string,unknown>).key) === key) as Record<string,unknown> | undefined;
  return item ? String(item.value ?? '') : undefined;
}

function calmFallback(content: string): { nodes: ArchitectureNode[]; edges: ArchitectureEdge[]; metadata: Record<string, unknown>; issues: ArchitectureExchangeIssue[] } {
  const issues: ArchitectureExchangeIssue[] = [];
  let parsed: Record<string,unknown>;
  try { parsed = JSON.parse(content) as Record<string,unknown>; } catch (error) { return { nodes: [], edges: [], metadata: {}, issues: [{ id: 'ISSUE-CALM-PARSE', severity: 'error', code: 'INVALID_JSON', message: error instanceof Error ? error.message : 'CALM document is not valid JSON.' }] }; }
  const rawNodes = Array.isArray(parsed.nodes) ? parsed.nodes as Record<string,unknown>[] : [];
  const nodes = rawNodes.map((raw, index): ArchitectureNode => {
    const embedded = raw['x-aiw']; if (embedded && typeof embedded === 'object') return structuredClone(embedded) as ArchitectureNode;
    const metadata = raw.metadata;
    const nodeType = String(raw['node-type'] ?? 'service');
    const kind = normalizeKind(metadataValue(metadata,'aiw.kind'), nodeType === 'actor' ? 'Actor' : nodeType === 'database' ? 'DataStore' : nodeType === 'network' ? 'NetworkZone' : nodeType === 'infrastructure' ? 'TechnologyProduct' : 'ApplicationComponent');
    const stage = normalizeStage(metadataValue(metadata,'aiw.stage'), kind);
    const id = String(raw['unique-id'] ?? `calm-node-${index + 1}`);
    return { id, semanticId: metadataValue(metadata,'aiw.semantic-id') || `calm:${id}`, kind, stage, label: String(raw.name ?? id), description: String(raw.description ?? ''), properties: { importedFrom: 'calm-json', calmNodeType: nodeType }, lineageFrom: [], positions: { [stage]: { x: 120 + (index % 4) * 260, y: 120 + Math.floor(index / 4) * 170 } }, tags: (metadataValue(metadata,'aiw.tags') ?? 'imported,calm').split(',').filter(Boolean), status: 'draft' };
  });
  const rawRelationships = Array.isArray(parsed.relationships) ? parsed.relationships as Record<string,unknown>[] : [];
  const edges = rawRelationships.flatMap((raw,index): ArchitectureEdge[] => {
    const embedded = raw['x-aiw']; if (embedded && typeof embedded === 'object') return [structuredClone(embedded) as ArchitectureEdge];
    const relationType = raw['relationship-type'] as Record<string,unknown> | undefined; const connects = relationType?.connects as Record<string,unknown> | undefined;
    const source = (connects?.source as Record<string,unknown> | undefined)?.node; const target = (connects?.destination as Record<string,unknown> | undefined)?.node;
    if (!source || !target) { issues.push({ id: `ISSUE-CALM-REL-${index + 1}`, severity: 'warning', code: 'UNSUPPORTED_RELATIONSHIP', message: `CALM relationship ${String(raw['unique-id'] ?? index + 1)} is not a simple connects relationship.` }); return []; }
    const sourceNode = nodes.find((node) => node.id === String(source));
    return [{ id: String(raw['unique-id'] ?? `calm-edge-${index + 1}`), sourceId: String(source), targetId: String(target), kind: normalizeRelationship(metadataValue(raw.metadata,'aiw.kind')), stage: normalizeStage(metadataValue(raw.metadata,'aiw.stage'), sourceNode?.kind ?? 'ApplicationComponent'), label: String(raw.description ?? 'connects'), properties: { protocol: raw.protocol ?? '', importedFrom: 'calm-json' } }];
  });
  const extension = parsed['x-aiw'] && typeof parsed['x-aiw'] === 'object' ? parsed['x-aiw'] as Record<string,unknown> : {};
  return { nodes, edges, metadata: { projectId: parsed['unique-id'], name: parsed.name, description: parsed.description, revision: metadataValue(parsed.metadata,'aiw.project-revision'), interfaces: extension.interfaces, ...extension }, issues };
}

export function validateArchitectureExchange(document: ArchitectureExchangeDocument): ArchitectureExchangeIssue[] {
  const issues: ArchitectureExchangeIssue[] = [];
  if (!document.content.trim()) issues.push({ id: 'EXCHANGE-EMPTY', severity: 'error', code: 'EMPTY_DOCUMENT', message: 'Architecture exchange document is empty.' });
  if (document.format === 'calm-json') {
    try {
      const parsed = JSON.parse(document.content) as Record<string,unknown>;
      if (!Array.isArray(parsed.nodes)) issues.push({ id: 'CALM-NODES', severity: 'error', code: 'MISSING_NODES', message: 'CALM document must contain a nodes array.', path: '/nodes' });
      if (!Array.isArray(parsed.relationships)) issues.push({ id: 'CALM-RELATIONSHIPS', severity: 'error', code: 'MISSING_RELATIONSHIPS', message: 'CALM document must contain a relationships array.', path: '/relationships' });
      const ids = new Set((Array.isArray(parsed.nodes) ? parsed.nodes : []).map((item) => String((item as Record<string,unknown>)['unique-id'])));
      for (const relationship of Array.isArray(parsed.relationships) ? parsed.relationships as Record<string,unknown>[] : []) {
        const connects = ((relationship['relationship-type'] as Record<string,unknown> | undefined)?.connects ?? {}) as Record<string,unknown>;
        const source = ((connects.source as Record<string,unknown> | undefined)?.node); const target = ((connects.destination as Record<string,unknown> | undefined)?.node);
        if (source && !ids.has(String(source))) issues.push({ id: `CALM-SOURCE-${String(relationship['unique-id'])}`, severity: 'error', code: 'DANGLING_SOURCE', message: `Relationship references unknown source node ${String(source)}.` });
        if (target && !ids.has(String(target))) issues.push({ id: `CALM-TARGET-${String(relationship['unique-id'])}`, severity: 'error', code: 'DANGLING_TARGET', message: `Relationship references unknown target node ${String(target)}.` });
      }
    } catch (error) { issues.push({ id: 'CALM-JSON', severity: 'error', code: 'INVALID_JSON', message: error instanceof Error ? error.message : 'CALM JSON is invalid.' }); }
  } else {
    const opening = (document.content.match(/\{/g) ?? []).length; const closing = (document.content.match(/\}/g) ?? []).length;
    if (opening !== closing) issues.push({ id: 'DSL-BRACES', severity: 'error', code: 'UNBALANCED_BLOCKS', message: `DSL contains ${opening} opening and ${closing} closing braces.` });
    if (document.format === 'structurizr-dsl' && !/\bworkspace\b/.test(document.content)) issues.push({ id: 'STRUCT-WORKSPACE', severity: 'error', code: 'MISSING_WORKSPACE', message: 'Structurizr DSL must define a workspace.' });
    if (document.format === 'likec4' && !/\bmodel\s*\{/.test(document.content)) issues.push({ id: 'LIKEC4-MODEL', severity: 'error', code: 'MISSING_MODEL', message: 'LikeC4 document must define a model block.' });
  }
  return issues;
}

export function analyseImportConflicts(local: ArchitectureProject, imported: ArchitectureProject): ArchitectureImportConflict[] {
  const conflicts: ArchitectureImportConflict[] = [];
  const localById = new Map(local.nodes.map((node) => [node.id,node]));
  const localBySemantic = new Map(local.nodes.filter((node) => node.semanticId).map((node) => [node.semanticId!,node]));
  for (const node of imported.nodes) {
    const sameId = localById.get(node.id);
    if (sameId && JSON.stringify({ kind: sameId.kind, stage: sameId.stage, label: sameId.label, properties: sameId.properties }) !== JSON.stringify({ kind: node.kind, stage: node.stage, label: node.label, properties: node.properties })) {
      conflicts.push({ id: `CONFLICT-NODE-ID-${stableHash(node.id)}`, type: 'id-collision', elementType: 'node', localId: sameId.id, importedId: node.id, message: `Node ${node.id} has the same ID but different content.`, localValue: sameId, importedValue: node, suggestedResolution: 'merge-properties' });
    }
    if (!sameId && node.semanticId) {
      const semantic = localBySemantic.get(node.semanticId);
      if (semantic) conflicts.push({ id: `CONFLICT-NODE-SEM-${stableHash(node.semanticId)}`, type: 'semantic-identity', elementType: 'node', localId: semantic.id, importedId: node.id, message: `Imported node ${node.id} shares semantic identity ${node.semanticId} with local node ${semantic.id}.`, localValue: semantic, importedValue: node, suggestedResolution: 'merge-properties' });
    }
  }
  const localEdges = new Map(local.edges.map((edge) => [edge.id,edge]));
  for (const edge of imported.edges) {
    const same = localEdges.get(edge.id);
    if (same && JSON.stringify(same) !== JSON.stringify(edge)) conflicts.push({ id: `CONFLICT-EDGE-${stableHash(edge.id)}`, type: 'relationship-divergence', elementType: 'edge', localId: same.id, importedId: edge.id, message: `Relationship ${edge.id} differs from the local relationship.`, localValue: same, importedValue: edge, suggestedResolution: 'use-imported' });
  }
  return conflicts;
}

export function importArchitectureExchange(baseProject: ArchitectureProject, document: ArchitectureExchangeDocument): ArchitectureImportResult {
  const issues = validateArchitectureExchange(document);
  let nodes: ArchitectureNode[] = []; let edges: ArchitectureEdge[] = []; let metadata: Record<string,unknown> = { projectId: baseProject.id, name: baseProject.name, description: baseProject.description, revision: baseProject.revision };
  if (!issues.some((issue) => issue.severity === 'error')) {
    if (document.format === 'calm-json') {
      const result = calmFallback(document.content); nodes = result.nodes; edges = result.edges; metadata = { ...metadata, ...result.metadata }; issues.push(...result.issues);
    } else {
      const embedded = parseEmbeddedMetadata(document.content);
      if (embedded.nodes.length) { nodes = embedded.nodes; edges = embedded.edges; metadata = { ...metadata, ...(embedded.project ?? {}) }; }
      else if (document.format === 'structurizr-dsl') { const result = structurizrFallback(document.content); nodes = result.nodes; edges = result.edges; issues.push(...result.issues); }
      else { const result = likeC4Fallback(document.content); nodes = result.nodes; edges = result.edges; issues.push(...result.issues); }
    }
  }
  const nodeIds = new Set(nodes.map((node) => node.id));
  for (const edge of edges) if (!nodeIds.has(edge.sourceId) || !nodeIds.has(edge.targetId)) issues.push({ id: `IMPORT-DANGLING-${edge.id}`, severity: 'error', code: 'DANGLING_RELATIONSHIP', message: `Imported relationship ${edge.id} references a missing node.`, elementId: edge.id });
  const project = importedProjectFromElements(baseProject, nodes, edges, metadata);
  const conflicts = analyseImportConflicts(baseProject, project);
  return { format: document.format, formatVersion: document.formatVersion, project, importedNodeIds: nodes.map((node) => node.id), importedEdgeIds: edges.map((edge) => edge.id), issues, conflicts, metadata };
}

export function mergeImportedArchitecture(local: ArchitectureProject, result: ArchitectureImportResult, resolutions: Record<string,ImportConflictResolution> = {}): ArchitectureProject {
  const conflictByImported = new Map(result.conflicts.map((conflict) => [conflict.importedId, conflict]));
  const nodes = structuredClone(local.nodes); const edges = structuredClone(local.edges); const nodeIds = new Set(nodes.map((node) => node.id));
  for (const imported of result.project.nodes) {
    const conflict = conflictByImported.get(imported.id); const resolution = conflict ? (resolutions[conflict.id] ?? conflict.suggestedResolution) : undefined;
    if (!conflict) { if (!nodeIds.has(imported.id)) { nodes.push(structuredClone(imported)); nodeIds.add(imported.id); } continue; }
    const localIndex = nodes.findIndex((node) => node.id === conflict.localId || node.semanticId && node.semanticId === imported.semanticId);
    if (resolution === 'keep-local' || resolution === 'skip') continue;
    if (resolution === 'use-imported' && localIndex >= 0) { const previousId = nodes[localIndex]!.id; nodes[localIndex] = structuredClone(imported); nodeIds.delete(previousId); nodeIds.add(imported.id); continue; }
    if (resolution === 'merge-properties' && localIndex >= 0) { const current = nodes[localIndex]!; nodes[localIndex] = { ...current, description: imported.description || current.description, properties: { ...current.properties, ...imported.properties }, lineageFrom: [...new Set([...current.lineageFrom,...imported.lineageFrom])], tags: [...new Set([...current.tags,...imported.tags])] }; continue; }
    if (resolution === 'create-copy') { const copy = { ...structuredClone(imported), id: `${imported.id}-import-${stableHash(result.format)}`, semanticId: imported.semanticId ? `${imported.semanticId}:imported` : undefined, label: `${imported.label} (imported)` }; nodes.push(copy); nodeIds.add(copy.id); }
  }
  const edgeIds = new Set(edges.map((edge) => edge.id));
  for (const imported of result.project.edges) {
    const conflict = result.conflicts.find((item) => item.importedId === imported.id && item.elementType === 'edge'); const resolution = conflict ? (resolutions[conflict.id] ?? conflict.suggestedResolution) : undefined;
    if (!conflict) { if (!edgeIds.has(imported.id) && nodeIds.has(imported.sourceId) && nodeIds.has(imported.targetId)) { edges.push(structuredClone(imported)); edgeIds.add(imported.id); } continue; }
    if (resolution === 'use-imported') { const index = edges.findIndex((edge) => edge.id === conflict.localId); if (index >= 0) edges[index] = structuredClone(imported); }
  }
  return { ...local, nodes, edges, revision: local.revision + 1, updatedAt: new Date().toISOString() };
}

function percent(matched: number, total: number): number { return total ? Math.round((matched / total) * 100) : 100; }

export function assessArchitectureRoundTrip(project: ArchitectureProject, format: ArchitectureExchangeFormat): ArchitectureRoundTripReport {
  const document = exportArchitectureExchange(project, format); const imported = importArchitectureExchange(project, document); const importedProject = imported.project;
  const importedNodeIds = new Set(importedProject.nodes.map((node) => node.id)); const importedEdgeIds = new Set(importedProject.edges.map((edge) => edge.id)); const importedInterfaceIds = new Set((importedProject.interfaces ?? []).map((item) => item.id));
  const nodeMatches = project.nodes.filter((node) => importedNodeIds.has(node.id)).length; const edgeMatches = project.edges.filter((edge) => importedEdgeIds.has(edge.id)).length; const interfaceMatches = (project.interfaces ?? []).filter((item) => importedInterfaceIds.has(item.id)).length;
  const propertyMatches = project.nodes.filter((node) => { const candidate = importedProject.nodes.find((item) => item.id === node.id); return candidate && JSON.stringify({ semanticId: candidate.semanticId, kind: candidate.kind, stage: candidate.stage, label: candidate.label, description: candidate.description, properties: candidate.properties, lineageFrom: candidate.lineageFrom, parentId: candidate.parentId, tags: candidate.tags, status: candidate.status }) === JSON.stringify({ semanticId: node.semanticId, kind: node.kind, stage: node.stage, label: node.label, description: node.description, properties: node.properties, lineageFrom: node.lineageFrom, parentId: node.parentId, tags: node.tags, status: node.status }); }).length;
  const nodeIdentityPercent = percent(nodeMatches, project.nodes.length); const edgeIdentityPercent = percent(edgeMatches, project.edges.length); const interfaceIdentityPercent = percent(interfaceMatches, (project.interfaces ?? []).length); const propertyFidelityPercent = percent(propertyMatches, project.nodes.length);
  const overallFidelityPercent = Math.round((nodeIdentityPercent + edgeIdentityPercent + interfaceIdentityPercent + propertyFidelityPercent) / 4);
  const issues = [...validateArchitectureExchange(document), ...imported.issues];
  return { format, exportedFingerprint: document.fingerprint, importedFingerprint: fingerprintArchitectureProject(importedProject), nodeIdentityPercent, edgeIdentityPercent, interfaceIdentityPercent, propertyFidelityPercent, overallFidelityPercent, lostNodeIds: project.nodes.filter((node) => !importedNodeIds.has(node.id)).map((node) => node.id), lostEdgeIds: project.edges.filter((edge) => !importedEdgeIds.has(edge.id)).map((edge) => edge.id), issues, passed: overallFidelityPercent === 100 && !issues.some((issue) => issue.severity === 'error') };
}
