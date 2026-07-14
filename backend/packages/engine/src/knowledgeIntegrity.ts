import {
  coreAntiPatterns,
  createDesignLibrary,
  trustedArchitectureSources,
  type AntiPatternRecord,
  type ArchitectureProject,
  type DesignLibraryRecord,
  type KnowledgeLibrary,
  type TrustedArchitectureSource,
} from '@aiw/domain';

export interface RecordEvidenceAssessment {
  recordId: string;
  recordName: string;
  evidenceSourceIds: string[];
  resolvedSources: TrustedArchitectureSource[];
  authorityScore: number;
  freshnessScore: number;
  coverageScore: number;
  confidence: number;
  status: 'verified' | 'provisional' | 'insufficient';
  gaps: string[];
}

export interface KnowledgeIntegrityReport {
  generatedAt: string;
  libraryVersion: string;
  records: RecordEvidenceAssessment[];
  summary: {
    totalRecords: number;
    verified: number;
    provisional: number;
    insufficient: number;
    averageConfidence: number;
    staleSources: number;
    unresolvedEvidenceIds: string[];
  };
}

export interface AntiPatternFinding {
  antiPatternId: string;
  name: string;
  severity: 'HARD' | 'INCOMPATIBILITY' | 'ADVISORY';
  confidence: number;
  explanation: string;
  affectedNodeIds: string[];
  affectedEdgeIds: string[];
  signals: string[];
  risks: string[];
  mitigations: string[];
  evidenceSourceIds: string[];
}

const legacyEvidenceMap: Record<string, string> = {
  'EVID-INTERNAL-ARCH-PRINCIPLES': 'SRC-INTERNAL-PRINCIPLES',
  'EVID-C4-MODEL': 'SRC-C4',
  'EVID-ISO-42010': 'SRC-ISO-42010',
};

function normalizeEvidenceId(id: string): string {
  return legacyEvidenceMap[id] ?? id;
}

function daysBetween(a: string, b: string): number {
  return Math.max(0, (new Date(a).getTime() - new Date(b).getTime()) / 86_400_000);
}

function contextualSourceIds(record: DesignLibraryRecord): string[] {
  const ids = new Set(record.evidenceIds.map(normalizeEvidenceId));
  const tags = new Set([...record.tags, record.category, record.name.toLowerCase()]);
  ids.add('SRC-INTERNAL-PRINCIPLES');
  if (record.recordType === 'style' || tags.has('application')) ids.add('SRC-SEI-QAW');
  if (record.recordType === 'component') ids.add('SRC-ISO-42010');
  if (tags.has('api') || tags.has('interface')) ids.add('SRC-OPENAPI');
  if (tags.has('security') || tags.has('identity')) { ids.add('SRC-OWASP-ASVS'); ids.add('SRC-NIST-SSDF'); }
  if (tags.has('observability') || tags.has('telemetry')) ids.add('SRC-OTEL');
  if (['integration','resilience','deployment','data','operations'].some((tag) => tags.has(tag))) {
    ids.add('SRC-AWS-WAF'); ids.add('SRC-AZURE-AAC'); ids.add('SRC-GCP-WAF');
  }
  if (record.applicableViewpoints.includes('application') || record.depiction.notationMappings.c4) ids.add('SRC-C4');
  return [...ids];
}

export function assessDesignLibraryIntegrity(
  library: KnowledgeLibrary,
  sources: TrustedArchitectureSource[] = trustedArchitectureSources,
  now = new Date().toISOString(),
): KnowledgeIntegrityReport {
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const unresolved = new Set<string>();
  let staleSources = 0;
  const staleSet = new Set<string>();

  const records = createDesignLibrary(library).map((record): RecordEvidenceAssessment => {
    const evidenceSourceIds = contextualSourceIds(record);
    const resolvedSources = evidenceSourceIds.flatMap((id) => {
      const source = sourceMap.get(id);
      if (!source) { unresolved.add(id); return []; }
      const stale = daysBetween(now, source.reviewedAt) > source.refreshCadenceDays;
      if (stale && !staleSet.has(id)) { staleSet.add(id); staleSources += 1; }
      return [source];
    });
    const authorityScore = resolvedSources.length
      ? Math.round((resolvedSources.reduce((sum, source) => sum + source.authorityLevel, 0) / (resolvedSources.length * 5)) * 100)
      : 0;
    const freshnessScore = resolvedSources.length
      ? Math.round((resolvedSources.reduce((sum, source) => sum + Math.max(0, 1 - daysBetween(now, source.reviewedAt) / Math.max(1, source.refreshCadenceDays)), 0) / resolvedSources.length) * 100)
      : 0;
    const expectedCoverage = record.recordType === 'component' ? 2 : 3;
    const coverageScore = Math.min(100, Math.round((resolvedSources.length / expectedCoverage) * 100));
    const confidence = Math.round(authorityScore * 0.45 + freshnessScore * 0.2 + coverageScore * 0.35);
    const gaps: string[] = [];
    if (!resolvedSources.length) gaps.push('No approved evidence source resolves for this record.');
    if (coverageScore < 67) gaps.push('Evidence coverage is too narrow for a production recommendation.');
    if (freshnessScore < 50) gaps.push('One or more sources require review.');
    if (!record.whenToUse.length || !record.whenToQuestion.length) gaps.push('Context guidance is incomplete.');
    const status = confidence >= 80 && gaps.length === 0 ? 'verified' : confidence >= 55 ? 'provisional' : 'insufficient';
    return { recordId: record.id, recordName: record.name, evidenceSourceIds, resolvedSources, authorityScore, freshnessScore, coverageScore, confidence, status, gaps };
  });

  const verified = records.filter((record) => record.status === 'verified').length;
  const provisional = records.filter((record) => record.status === 'provisional').length;
  const insufficient = records.length - verified - provisional;
  const averageConfidence = records.length ? Math.round(records.reduce((sum, record) => sum + record.confidence, 0) / records.length) : 0;
  return {
    generatedAt: now,
    libraryVersion: library.version,
    records,
    summary: { totalRecords: records.length, verified, provisional, insufficient, averageConfidence, staleSources, unresolvedEvidenceIds: [...unresolved].sort() },
  };
}

function nodeOwner(node: ArchitectureProject['nodes'][number]): string | undefined {
  const owner = node.properties.owner ?? node.properties.owningTeam;
  return typeof owner === 'string' && owner.trim() ? owner.trim() : undefined;
}

function syncEdge(edge: ArchitectureProject['edges'][number]): boolean {
  return edge.kind === 'communicatesWith' && edge.properties.protocolStyle !== 'asynchronous';
}

function pathDepth(project: ArchitectureProject): number {
  const adjacency = new Map<string, string[]>();
  for (const edge of project.edges.filter(syncEdge)) adjacency.set(edge.sourceId, [...(adjacency.get(edge.sourceId) ?? []), edge.targetId]);
  let max = 0;
  const visit = (id: string, seen: Set<string>): number => {
    if (seen.has(id)) return 0;
    const nextSeen = new Set(seen).add(id);
    const children = adjacency.get(id) ?? [];
    if (!children.length) return 1;
    return 1 + Math.max(...children.map((child) => visit(child, nextSeen)));
  };
  for (const id of adjacency.keys()) max = Math.max(max, visit(id, new Set()));
  return max;
}

function anti(id: string): AntiPatternRecord {
  const record = coreAntiPatterns.find((item) => item.id === id);
  if (!record) throw new Error(`Unknown anti-pattern ${id}`);
  return record;
}

function finding(record: AntiPatternRecord, severity: AntiPatternFinding['severity'], confidence: number, explanation: string, nodeIds: string[] = [], edgeIds: string[] = [], signals: string[] = []): AntiPatternFinding {
  return { antiPatternId: record.id, name: record.name, severity, confidence, explanation, affectedNodeIds: nodeIds, affectedEdgeIds: edgeIds, signals, risks: record.risks, mitigations: record.mitigations, evidenceSourceIds: record.evidenceSourceIds };
}

export function detectArchitectureAntiPatterns(project: ArchitectureProject): AntiPatternFinding[] {
  const findings: AntiPatternFinding[] = [];
  const deployables = project.nodes.filter((node) => node.stage === 'applicationRealization' && (node.kind === 'DeployableUnit' || node.kind === 'ApplicationComponent'));
  const syncEdges = project.edges.filter(syncEdge);
  const dataStores = project.nodes.filter((node) => ['DataStore','LogicalTechnologyCapability','TechnologyProduct'].includes(node.kind) && /data|database|store/i.test(`${node.label} ${node.tags.join(' ')}`));

  if ((project.context.teamSize ?? 0) > 0 && (project.context.teamSize ?? 0) < 10 && deployables.length >= 6 && (project.context.operationalMaturity ?? 3) <= 2) {
    const record = anti('ANTI-PREMATURE-DISTRIBUTION');
    findings.push(finding(record, 'INCOMPATIBILITY', 90, `${deployables.length} deployable units are planned for a team of ${project.context.teamSize} with low operational maturity.`, deployables.map((node) => node.id), [], record.signals));
  }

  const depth = pathDepth(project);
  if (depth >= 5) {
    const record = anti('ANTI-CHATTER');
    findings.push(finding(record, 'INCOMPATIBILITY', Math.min(98, 65 + depth * 5), `The synchronous dependency graph has a longest path of ${depth} components.`, [], syncEdges.map((edge) => edge.id), record.signals));
  }

  if (deployables.length >= 4 && syncEdges.length >= deployables.length * 2) {
    const record = anti('ANTI-DISTRIBUTED-MONOLITH');
    findings.push(finding(record, 'INCOMPATIBILITY', 82, `The realization contains ${deployables.length} deployable units and ${syncEdges.length} synchronous relationships, indicating possible temporal coupling.`, deployables.map((node) => node.id), syncEdges.map((edge) => edge.id), record.signals));
  }

  for (const node of project.nodes.filter((item) => item.kind === 'DeploymentNode')) {
    const critical = node.properties.criticality === 'high' || node.properties.criticality === 'mission-critical' || node.tags.includes('critical');
    const replicas = Number(node.properties.replicas ?? 1);
    const zones = Number(node.properties.availabilityZones ?? 1);
    if (critical && (replicas < 2 || zones < 2)) {
      const record = anti('ANTI-SINGLE-FAILURE-DOMAIN');
      findings.push(finding(record, 'HARD', 95, `${node.label} is critical but declares ${replicas} replica(s) across ${zones} failure domain(s).`, [node.id], [], record.signals));
    }
  }

  for (const node of project.nodes.filter((item) => item.kind === 'API' || item.properties.public === true || /\bapi\b/i.test(item.label))) {
    if (!node.properties.versioningStrategy) {
      const record = anti('ANTI-UNVERSIONED-CONTRACT');
      findings.push(finding(record, 'ADVISORY', 80, `${node.label} has no interface versioning or compatibility strategy.`, [node.id], [], record.signals));
    }
  }

  const hasObservability = project.nodes.some((node) => /observability|telemetry|tracing|metrics|logging/i.test(`${node.label} ${node.tags.join(' ')}`));
  if (deployables.length >= 3 && !hasObservability) {
    const record = anti('ANTI-OBSERVABILITY-AFTERTHOUGHT');
    findings.push(finding(record, 'INCOMPATIBILITY', 88, 'The architecture contains several deployables but no explicit observability capability.', deployables.map((node) => node.id), [], record.signals));
  }

  const publicApis = project.nodes.filter((node) => node.properties.public === true && (node.kind === 'API' || node.kind === 'DeployableUnit' || /\bapi\b/i.test(node.label)));
  const hasIdentityControl = project.nodes.some((node) => node.kind === 'Control' && /identity|auth/i.test(`${node.label} ${node.tags.join(' ')}`));
  if (publicApis.length && !hasIdentityControl) {
    const record = anti('ANTI-SECURITY-BOLTON');
    findings.push(finding(record, 'HARD', 96, `${publicApis.length} public API(s) exist without an explicit identity and access-control responsibility.`, publicApis.map((node) => node.id), [], record.signals));
  }

  const physicalInLogical = project.nodes.filter((node) => node.stage === 'logicalApplication' && ['TechnologyProduct','DeploymentNode','Runtime'].includes(node.kind));
  if (physicalInLogical.length) {
    const record = anti('ANTI-TECHNOLOGY-FIRST');
    findings.push(finding(record, 'INCOMPATIBILITY', 92, 'Vendor or deployment products appear in the logical application view before logical requirements are complete.', physicalInLogical.map((node) => node.id), [], record.signals));
  }

  const ownerless = project.nodes.filter((node) => ['LogicalService','DeployableUnit','DataStore','API'].includes(node.kind) && !nodeOwner(node));
  if (ownerless.length >= 3) {
    const record = anti('ANTI-IMPLICIT-OWNERSHIP');
    findings.push(finding(record, 'ADVISORY', 75, `${ownerless.length} important architecture elements have no explicit owner.`, ownerless.map((node) => node.id), [], record.signals));
  }

  const sharedWrites = dataStores.flatMap((store) => {
    const writers = project.edges.filter((edge) => edge.targetId === store.id && (edge.kind === 'writes' || edge.kind === 'stores')).map((edge) => edge.sourceId);
    return new Set(writers).size >= 3 ? [store] : [];
  });
  if (sharedWrites.length) {
    const record = anti('ANTI-SHARED-DATABASE-COUPLING');
    findings.push(finding(record, 'INCOMPATIBILITY', 86, `${sharedWrites.length} data store(s) are directly written by three or more application elements.`, sharedWrites.map((node) => node.id), [], record.signals));
  }

  const severityWeight = { HARD: 3, INCOMPATIBILITY: 2, ADVISORY: 1 } as const;
  return findings.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity] || b.confidence - a.confidence);
}
