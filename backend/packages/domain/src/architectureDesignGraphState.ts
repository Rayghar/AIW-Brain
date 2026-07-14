import type {
  ArchitectureDecision,
  ArchitectureInterface,
  ArchitectureProject,
  Finding,
} from './types.js';
import type {
  CanonicalRequirementRecord,
  RequirementEvidenceReference,
  RequirementOpenQuestion,
  RequirementSourceRecord,
  RequirementStakeholder,
  RequirementsIntelligenceState,
  SolutionJourney,
} from './requirementsGenesis.js';
import {
  architectureDesignGraphHash,
  buildArchitectureDesignGraph,
  synchronizeArchitectureProjectDesignGraph,
  validateArchitectureDesignGraph,
  type ArchitectureDesignGraph,
  type ArchitectureDesignGraphRecord,
  type ArchitectureDesignGraphRelationship,
} from './architectureDesignGraph.js';

export const architectureDesignGraphCanonicalStateKinds = [
  'requirements',
  'evidence',
  'interfaces',
  'decisions',
  'findings',
  'risks',
] as const;
export type ArchitectureDesignGraphCanonicalStateKind =
  (typeof architectureDesignGraphCanonicalStateKinds)[number];

export type ArchitectureDesignGraphWritePath =
  | 'migration'
  | 'graph-command'
  | 'compatibility-adapter';

export interface ArchitectureDesignGraphStateAuthority {
  schemaVersion: '1.0';
  markerType: 'canonical-state-authority';
  mode: 'graph-primary';
  canonicalStateKinds: ArchitectureDesignGraphCanonicalStateKind[];
  compatibilityProjectionFields: [
    'requirementsIntelligence',
    'interfaces',
    'decisions',
    'findings',
  ];
  migratedAt: string;
  migratedBy: string;
  lastWriteAt: string;
  lastWriteBy: string;
  lastWritePath: ArchitectureDesignGraphWritePath;
  compatibilityWriteCount: number;
  canonicalStateFingerprint: string;
  sourceGraphFingerprint: string;
  riskRecordCount: number;
}

export interface ArchitectureDesignGraphStateMigrationReceipt {
  schemaVersion: '1.0';
  projectId: string;
  branchId: string;
  fromRevision: number;
  toRevision: number;
  sourceGraphFingerprint: string;
  migratedGraphFingerprint: string;
  canonicalStateFingerprint: string;
  canonicalStateKinds: ArchitectureDesignGraphCanonicalStateKind[];
  migratedAt: string;
  migratedBy: string;
  humanApprovalRequired: true;
  sourceAuthority: 'architect';
}

export interface ArchitectureDesignGraphStateCommandReceipt {
  schemaVersion: '1.0';
  projectId: string;
  branchId: string;
  fromRevision: number;
  toRevision: number;
  previousGraphFingerprint: string;
  graphFingerprint: string;
  canonicalStateFingerprint: string;
  changedStateKinds: ArchitectureDesignGraphCanonicalStateKind[];
  appliedAt: string;
  appliedBy: string;
  humanApprovalRequired: true;
  sourceAuthority: 'architect';
}

export interface ArchitectureDesignGraphCanonicalStatePatch {
  requirementsIntelligence?: RequirementsIntelligenceState | null;
  interfaces?: ArchitectureInterface[];
  decisions?: ArchitectureDecision[];
  findings?: Finding[];
}

const AUTHORITY_SOURCE_REF = 'canonical-state-authority';
const AUTHORITY_RECORD_ID = `policy-gate:${AUTHORITY_SOURCE_REF}`;
const AUTHORITY_RELATION_SOURCE_REF = 'canonical-state-authority';

function canonicalStatePayload(project: ArchitectureProject): unknown {
  return {
    requirementsIntelligence: project.requirementsIntelligence ?? null,
    interfaces: project.interfaces ?? [],
    decisions: project.decisions,
    findings: project.findings,
  };
}

export function architectureDesignGraphCanonicalStateFingerprint(
  project: ArchitectureProject,
): string {
  return architectureDesignGraphHash(canonicalStatePayload(project));
}

function canonicalValue<T>(record: ArchitectureDesignGraphRecord): T | undefined {
  const value = record.attributes.canonicalValue;
  return value && typeof value === 'object' ? structuredClone(value as T) : undefined;
}

function recordsOfKind<T>(
  graph: ArchitectureDesignGraph,
  kind: ArchitectureDesignGraphRecord['kind'],
): T[] {
  return graph.records
    .filter((record) => record.kind === kind)
    .map((record) => canonicalValue<T>(record))
    .filter((value): value is T => value !== undefined);
}

function requirementsMetadata(
  graph: ArchitectureDesignGraph,
): Partial<RequirementsIntelligenceState> | null {
  const projectRecord = graph.records.find(
    (record) => record.kind === 'project' && record.sourceRef === graph.projectId,
  );
  const value = projectRecord?.attributes.requirementsIntelligenceMetadata;
  return value && typeof value === 'object'
    ? structuredClone(value as Partial<RequirementsIntelligenceState>)
    : null;
}

export function projectArchitectureStateFromDesignGraph(
  project: ArchitectureProject,
  graph: ArchitectureDesignGraph,
): ArchitectureProject {
  const metadata = requirementsMetadata(graph);
  const sources = recordsOfKind<RequirementSourceRecord>(graph, 'source');
  const evidence = recordsOfKind<RequirementEvidenceReference>(graph, 'evidence');
  const requirements = recordsOfKind<CanonicalRequirementRecord>(graph, 'requirement');
  const stakeholders = recordsOfKind<RequirementStakeholder>(graph, 'stakeholder');
  const journeys = recordsOfKind<SolutionJourney>(graph, 'journey');
  const openQuestions = recordsOfKind<RequirementOpenQuestion>(graph, 'open-question');
  const hasRequirementsState = Boolean(metadata)
    || sources.length > 0
    || evidence.length > 0
    || requirements.length > 0
    || stakeholders.length > 0
    || journeys.length > 0
    || openQuestions.length > 0;
  const fallback = project.requirementsIntelligence;
  const requirementsIntelligence = hasRequirementsState
    ? ({
        ...(fallback ?? {}),
        ...(metadata ?? {}),
        schemaVersion: '1.0',
        knowledgeReleaseId:
          metadata?.knowledgeReleaseId
          ?? fallback?.knowledgeReleaseId
          ?? 'CAMBRIDGE-SA-1.0',
        sources,
        evidence,
        requirements,
        stakeholders,
        journeys,
        openQuestions,
        health: metadata?.health
          ?? fallback?.health
          ?? {
            completeness: 0,
            clarity: 0,
            testability: 0,
            traceability: 0,
            journeyCoverage: 0,
            stakeholderCoverage: 0,
            contradictionCount: 0,
            openCriticalQuestions: 0,
            assessedAt: new Date(0).toISOString(),
            gaps: [],
          },
        contextPackages: metadata?.contextPackages ?? fallback?.contextPackages ?? [],
      } satisfies RequirementsIntelligenceState)
    : undefined;

  return {
    ...project,
    ...(requirementsIntelligence ? { requirementsIntelligence } : { requirementsIntelligence: undefined }),
    interfaces: recordsOfKind<ArchitectureInterface>(graph, 'architecture-interface'),
    decisions: recordsOfKind<ArchitectureDecision>(graph, 'decision'),
    findings: recordsOfKind<Finding>(graph, 'finding'),
    designGraph: graph,
  };
}

function graphPayload(graph: ArchitectureDesignGraph): unknown {
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

function authorityRecord(authority: ArchitectureDesignGraphStateAuthority): ArchitectureDesignGraphRecord {
  const payload = {
    id: AUTHORITY_RECORD_ID,
    kind: 'policy-gate' as const,
    sourceRef: AUTHORITY_SOURCE_REF,
    label: 'Canonical graph-primary state authority',
    summary:
      'Requirements, evidence, interfaces, decisions, findings and risk-bearing requirements are canonical Design Graph state. Legacy project fields are compatibility projections.',
    status: 'active',
    stageRefs: [],
    evidenceRefs: [],
    attributes: { ...authority },
  };
  return { ...payload, fingerprint: architectureDesignGraphHash(payload) };
}

function authorityRelationship(projectId: string): ArchitectureDesignGraphRelationship {
  const sourceId = AUTHORITY_RECORD_ID;
  const targetId = `project:${projectId}`;
  const id = `rel:governs:${architectureDesignGraphHash(`${sourceId}|${targetId}|${AUTHORITY_RELATION_SOURCE_REF}`)}`;
  const payload = {
    id,
    sourceId,
    targetId,
    kind: 'governs' as const,
    sourceRef: AUTHORITY_RELATION_SOURCE_REF,
    rationale: 'The graph-primary authority marker governs canonical architecture state persistence and compatibility projection.',
    evidenceRefs: [],
    stageRefs: [],
  };
  return { ...payload, fingerprint: architectureDesignGraphHash(payload) };
}

function withAuthority(
  graph: ArchitectureDesignGraph,
  authority: ArchitectureDesignGraphStateAuthority,
): ArchitectureDesignGraph {
  const record = authorityRecord(authority);
  const relationship = authorityRelationship(graph.projectId);
  const records = [
    ...graph.records.filter((item) => item.id !== AUTHORITY_RECORD_ID),
    record,
  ].sort((left, right) => left.id.localeCompare(right.id));
  const relationships = [
    ...graph.relationships.filter(
      (item) => item.sourceRef !== AUTHORITY_RELATION_SOURCE_REF,
    ),
    relationship,
  ].sort((left, right) => left.id.localeCompare(right.id));
  const candidate = { ...graph, records, relationships, fingerprint: '' };
  candidate.fingerprint = architectureDesignGraphHash(graphPayload(candidate));
  const integrity = validateArchitectureDesignGraph(candidate);
  return { ...candidate, integrity };
}

export function getArchitectureDesignGraphStateAuthority(
  graph: ArchitectureDesignGraph | undefined,
): ArchitectureDesignGraphStateAuthority | null {
  const record = graph?.records.find(
    (item) =>
      item.id === AUTHORITY_RECORD_ID
      && item.attributes.markerType === 'canonical-state-authority'
      && item.attributes.mode === 'graph-primary',
  );
  return record
    ? structuredClone(record.attributes as unknown as ArchitectureDesignGraphStateAuthority)
    : null;
}

export function buildGraphPrimaryArchitectureDesignGraph(
  project: ArchitectureProject,
  authority: ArchitectureDesignGraphStateAuthority,
): ArchitectureDesignGraph {
  const stateFingerprint = architectureDesignGraphCanonicalStateFingerprint(project);
  const riskRecordCount = project.requirementsIntelligence?.requirements.filter(
    (record) => record.type === 'risk',
  ).length ?? 0;
  const graph = buildArchitectureDesignGraph(project, 'materialized-canonical');
  return withAuthority(graph, {
    ...authority,
    canonicalStateFingerprint: stateFingerprint,
    riskRecordCount,
  });
}

export function migrateArchitectureProjectStateToDesignGraph(input: {
  project: ArchitectureProject;
  expectedGraphFingerprint: string;
  actorId: string;
  migratedAt?: string;
}): {
  project: ArchitectureProject;
  receipt: ArchitectureDesignGraphStateMigrationReceipt;
} {
  const preview = buildArchitectureDesignGraph(
    input.project,
    input.project.designGraph?.projectionMode === 'materialized-canonical'
      ? 'materialized-canonical'
      : 'legacy-project-projection',
  );
  if (preview.fingerprint !== input.expectedGraphFingerprint) {
    throw new Error('STALE_DESIGN_GRAPH_STATE_MIGRATION');
  }
  if (!preview.integrity.healthy) throw new Error('DESIGN_GRAPH_INTEGRITY_FAILED');
  const migratedAt = input.migratedAt ?? new Date().toISOString();
  const nextBase: ArchitectureProject = {
    ...input.project,
    revision: input.project.revision + 1,
    updatedAt: migratedAt,
  };
  const authority: ArchitectureDesignGraphStateAuthority = {
    schemaVersion: '1.0',
    markerType: 'canonical-state-authority',
    mode: 'graph-primary',
    canonicalStateKinds: [...architectureDesignGraphCanonicalStateKinds],
    compatibilityProjectionFields: [
      'requirementsIntelligence',
      'interfaces',
      'decisions',
      'findings',
    ],
    migratedAt,
    migratedBy: input.actorId,
    lastWriteAt: migratedAt,
    lastWriteBy: input.actorId,
    lastWritePath: 'migration',
    compatibilityWriteCount: 0,
    canonicalStateFingerprint: architectureDesignGraphCanonicalStateFingerprint(nextBase),
    sourceGraphFingerprint: preview.fingerprint,
    riskRecordCount:
      nextBase.requirementsIntelligence?.requirements.filter(
        (record) => record.type === 'risk',
      ).length ?? 0,
  };
  const graph = buildGraphPrimaryArchitectureDesignGraph(nextBase, authority);
  const project = projectArchitectureStateFromDesignGraph(nextBase, graph);
  return {
    project,
    receipt: {
      schemaVersion: '1.0',
      projectId: project.id,
      branchId: project.branch.id,
      fromRevision: input.project.revision,
      toRevision: project.revision,
      sourceGraphFingerprint: preview.fingerprint,
      migratedGraphFingerprint: graph.fingerprint,
      canonicalStateFingerprint: authority.canonicalStateFingerprint,
      canonicalStateKinds: [...authority.canonicalStateKinds],
      migratedAt,
      migratedBy: input.actorId,
      humanApprovalRequired: true,
      sourceAuthority: 'architect',
    },
  };
}

function changedStateKinds(
  before: ArchitectureProject,
  after: ArchitectureProject,
): ArchitectureDesignGraphCanonicalStateKind[] {
  const changed: ArchitectureDesignGraphCanonicalStateKind[] = [];
  if (
    architectureDesignGraphHash(before.requirementsIntelligence ?? null)
    !== architectureDesignGraphHash(after.requirementsIntelligence ?? null)
  ) {
    changed.push('requirements', 'evidence');
    const beforeRisks = before.requirementsIntelligence?.requirements.filter((item) => item.type === 'risk') ?? [];
    const afterRisks = after.requirementsIntelligence?.requirements.filter((item) => item.type === 'risk') ?? [];
    if (architectureDesignGraphHash(beforeRisks) !== architectureDesignGraphHash(afterRisks)) changed.push('risks');
  }
  if (architectureDesignGraphHash(before.interfaces ?? []) !== architectureDesignGraphHash(after.interfaces ?? [])) changed.push('interfaces');
  if (architectureDesignGraphHash(before.decisions) !== architectureDesignGraphHash(after.decisions)) changed.push('decisions');
  if (architectureDesignGraphHash(before.findings) !== architectureDesignGraphHash(after.findings)) changed.push('findings');
  return [...new Set(changed)];
}

export function applyArchitectureDesignGraphCanonicalState(input: {
  project: ArchitectureProject;
  expectedGraphFingerprint: string;
  patch: ArchitectureDesignGraphCanonicalStatePatch;
  actorId: string;
  appliedAt?: string;
}): {
  project: ArchitectureProject;
  receipt: ArchitectureDesignGraphStateCommandReceipt;
} {
  const authority = getArchitectureDesignGraphStateAuthority(input.project.designGraph);
  if (!authority) throw new Error('DESIGN_GRAPH_STATE_MIGRATION_REQUIRED');
  if (input.project.designGraph?.fingerprint !== input.expectedGraphFingerprint) {
    throw new Error('STALE_DESIGN_GRAPH_STATE_COMMAND');
  }
  const appliedAt = input.appliedAt ?? new Date().toISOString();
  const nextBase: ArchitectureProject = {
    ...input.project,
    ...(input.patch.requirementsIntelligence !== undefined
      ? input.patch.requirementsIntelligence
        ? { requirementsIntelligence: input.patch.requirementsIntelligence }
        : { requirementsIntelligence: undefined }
      : {}),
    ...(input.patch.interfaces !== undefined ? { interfaces: input.patch.interfaces } : {}),
    ...(input.patch.decisions !== undefined ? { decisions: input.patch.decisions } : {}),
    ...(input.patch.findings !== undefined ? { findings: input.patch.findings } : {}),
    revision: input.project.revision + 1,
    updatedAt: appliedAt,
  };
  const changed = changedStateKinds(input.project, nextBase);
  if (!changed.length) throw new Error('EMPTY_DESIGN_GRAPH_STATE_COMMAND');
  const nextAuthority: ArchitectureDesignGraphStateAuthority = {
    ...authority,
    lastWriteAt: appliedAt,
    lastWriteBy: input.actorId,
    lastWritePath: 'graph-command',
  };
  const graph = buildGraphPrimaryArchitectureDesignGraph(nextBase, nextAuthority);
  const project = projectArchitectureStateFromDesignGraph(nextBase, graph);
  return {
    project,
    receipt: {
      schemaVersion: '1.0',
      projectId: project.id,
      branchId: project.branch.id,
      fromRevision: input.project.revision,
      toRevision: project.revision,
      previousGraphFingerprint: input.expectedGraphFingerprint,
      graphFingerprint: graph.fingerprint,
      canonicalStateFingerprint:
        getArchitectureDesignGraphStateAuthority(graph)?.canonicalStateFingerprint
        ?? architectureDesignGraphCanonicalStateFingerprint(project),
      changedStateKinds: changed,
      appliedAt,
      appliedBy: input.actorId,
      humanApprovalRequired: true,
      sourceAuthority: 'architect',
    },
  };
}

export function synchronizeArchitectureProjectDesignGraphState(
  project: ArchitectureProject,
): ArchitectureProject {
  const authority = getArchitectureDesignGraphStateAuthority(project.designGraph);
  if (!authority || !project.designGraph) {
    return synchronizeArchitectureProjectDesignGraph(project);
  }
  const projected = projectArchitectureStateFromDesignGraph(project, project.designGraph);
  const submittedFingerprint = architectureDesignGraphCanonicalStateFingerprint(project);
  const graphFingerprint = architectureDesignGraphCanonicalStateFingerprint(projected);
  const compatibilityWrite = submittedFingerprint !== graphFingerprint;
  const writeAt = project.updatedAt || new Date().toISOString();
  const nextAuthority: ArchitectureDesignGraphStateAuthority = compatibilityWrite
    ? {
        ...authority,
        lastWriteAt: writeAt,
        lastWriteBy: 'compatibility-adapter',
        lastWritePath: 'compatibility-adapter',
        compatibilityWriteCount: authority.compatibilityWriteCount + 1,
      }
    : authority;
  const source = compatibilityWrite ? project : projected;
  const graph = buildGraphPrimaryArchitectureDesignGraph(source, nextAuthority);
  return projectArchitectureStateFromDesignGraph(source, graph);
}
