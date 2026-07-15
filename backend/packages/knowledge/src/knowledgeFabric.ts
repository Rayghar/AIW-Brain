export type RepositoryUsePosture = 'Adopt' | 'Adapt' | 'Adapter' | 'Reference' | 'Benchmark' | 'Discovery' | 'Exclude';

export interface RepositoryDossier {
  connectorId: string;
  repository: string;
  identity: { name: string; owner: string; url: string; defaultBranch: string };
  catalogueSnapshot: { asOf: string; liveRefreshPerformed: boolean; activityStatus: string; communityAdoption: string };
  licence: Record<string, unknown>;
  sourceAuthority: { trustTier: number; lifecycleStatus: string; rationale: string };
  technicalScope: string[];
  usefulPaths: string[];
  deniedPaths: string[];
  knowledgeEntitiesAvailable: string[];
  canonicalMapping: Array<{ sourceUse: string; aiwEntities: string[] }>;
  lifecycleStagesAffected: string[];
  ingestionRisks: string[];
  duplicateControl: string;
  recommendedPosture: RepositoryUsePosture;
  exactIngestionConfiguration: Record<string, unknown>;
  requiredHumanReviewer: string;
  permittedAiwUses: string[];
  prohibitedAiwUses: string[];
  acquisitionStatus: 'approved' | 'denied' | 'suspended';
  sourceAuthorityClass: 'official-specification-or-standard' | 'official-reference-architecture' | 'architecture-conformance-implementation' | 'reviewed-practitioner-or-implementation-source' | 'educational-or-discovery-source';
  previousLifecycleStatus: string;
  semanticReviewStatus: string;
  knowledgePromotionStatus: 'candidate-only-pending-independent-review';
  permittedUses: string[];
  prohibitedUses: string[];
  licenceDisposition: string;
  securityDisposition: string;
  lastImmutableRevision: string | null;
  lastAcquisitionStatus: string;
  archivedSourceDisposition?: 'approved-for-immutable-acquisition';
  sourceFreshnessStatus?: 'archived';
  currentGuidanceEligible?: false;
  automaticPromotionAllowed?: false;
  successorRepository?: null;
  successorMigrationRequired?: true;
}

export interface PatternDna2RecordLike {
  id: string;
  name: string;
  aliases?: string[];
  category?: string;
  tags?: string[];
  applicableStages?: string[];
  lifecycle?: string;
  dnaVersion?: string;
  evidence?: unknown[];
  componentKit?: unknown[];
  interfaceKit?: unknown[];
  obligations?: unknown[];
  conflicts?: unknown[];
  counterfactualExplanation?: string;
  generationContract?: Record<string, unknown>;
  editorialReview?: { depth?: string; reviewedBy?: string; releaseId?: string };
}

export interface KnowledgeFabricAssessment {
  allowed: boolean;
  releaseId: string;
  checkedAt: string;
  checks: Array<{ id: string; ok: boolean; severity: 'blocker' | 'warning'; detail: string }>;
  metrics: {
    repositories: number;
    patterns: number;
    deepEditorialPatterns: number;
    dna2Coverage: number;
    provenanceCoverage: number;
    generationCoverage: number;
    stageKitCount: number;
  };
}

function percent(count: number, total: number): number {
  return total ? Math.round((count / total) * 1000) / 10 : 0;
}

export function assessKnowledgeFabricRelease(input: {
  releaseId: string;
  dossiers: RepositoryDossier[];
  patterns: PatternDna2RecordLike[];
  stageKits: Array<{ stage?: string; patternEmphasis?: unknown[]; requiredEvidence?: unknown[] }>;
  cambridgePack: { reasoningQuestions?: Record<string, unknown>; reviewRules?: unknown[]; sddGrammar?: unknown[] };
  now?: Date;
}): KnowledgeFabricAssessment {
  const total = input.patterns.length;
  const deep = input.patterns.filter((item) => item.editorialReview?.depth === 'deep').length;
  const dna2 = input.patterns.filter((item) => item.dnaVersion === '2.0').length;
  const provenance = input.patterns.filter((item) => (item.evidence?.length ?? 0) > 0).length;
  const generative = input.patterns.filter((item) =>
    Boolean(item.generationContract) &&
    ((item.componentKit?.length ?? 0) > 0 || (item.interfaceKit?.length ?? 0) > 0) &&
    (item.obligations?.length ?? 0) > 0,
  ).length;
  const checks = [
    { id: 'source-map-complete', ok: input.dossiers.length >= 40 && input.dossiers.every((item) => item.requiredHumanReviewer && item.lifecycleStagesAffected.length), severity: 'blocker' as const, detail: `${input.dossiers.length} repository dossier(s)` },
    { id: 'top-50-deep-editorial-review', ok: deep >= 50, severity: 'blocker' as const, detail: `${deep} deeply reviewed Pattern DNA record(s)` },
    { id: 'pattern-dna-2-coverage', ok: dna2 === total && total >= 200, severity: 'blocker' as const, detail: `${dna2}/${total} records use Pattern DNA 2.0` },
    { id: 'provenance-coverage', ok: provenance === total, severity: 'blocker' as const, detail: `${provenance}/${total} records have provenance` },
    { id: 'generation-coverage', ok: generative === total, severity: 'blocker' as const, detail: `${generative}/${total} records can generate components, interfaces or obligations` },
    { id: 'cambridge-pack-structured', ok: Object.keys(input.cambridgePack.reasoningQuestions ?? {}).length >= 8 && (input.cambridgePack.reviewRules?.length ?? 0) >= 5 && (input.cambridgePack.sddGrammar?.length ?? 0) >= 10, severity: 'blocker' as const, detail: 'Reasoning questions, review rules and SDD grammar are structured.' },
    { id: 'stage-kits-complete', ok: input.stageKits.length >= 8 && input.stageKits.every((item) => (item.patternEmphasis?.length ?? 0) > 0 && (item.requiredEvidence?.length ?? 0) > 0), severity: 'blocker' as const, detail: `${input.stageKits.length} stage kit(s)` },
    { id: 'live-source-refresh', ok: input.dossiers.every((item) => item.catalogueSnapshot.liveRefreshPerformed), severity: 'warning' as const, detail: 'Live repository refresh remains an rc.10.58 production acceptance activity; rc.10.55 uses the governed catalogue snapshot.' },
  ];
  return {
    allowed: checks.filter((check) => check.severity === 'blocker').every((check) => check.ok),
    releaseId: input.releaseId,
    checkedAt: (input.now ?? new Date()).toISOString(),
    checks,
    metrics: { repositories: input.dossiers.length, patterns: total, deepEditorialPatterns: deep, dna2Coverage: percent(dna2,total), provenanceCoverage: percent(provenance,total), generationCoverage: percent(generative,total), stageKitCount: input.stageKits.length },
  };
}

export function searchPatternDna2(records: PatternDna2RecordLike[], input: { query?: string; category?: string; stage?: string; deepOnly?: boolean; limit?: number } = {}): PatternDna2RecordLike[] {
  const query = input.query?.trim().toLowerCase() ?? '';
  const limit = Math.max(1, Math.min(200, input.limit ?? 50));
  return records.filter((record) => {
    if (input.category && record.category !== input.category) return false;
    if (input.stage && !(record.applicableStages ?? []).includes(input.stage)) return false;
    if (input.deepOnly && record.editorialReview?.depth !== 'deep') return false;
    if (!query) return true;
    const haystack = [record.id,record.name,...(record.aliases ?? []),...(record.tags ?? [])].join(' ').toLowerCase();
    return haystack.includes(query);
  }).slice(0,limit);
}

export function repositoryDossierByConnector(dossiers: RepositoryDossier[], connectorId: string): RepositoryDossier | undefined {
  return dossiers.find((item) => item.connectorId === connectorId);
}
