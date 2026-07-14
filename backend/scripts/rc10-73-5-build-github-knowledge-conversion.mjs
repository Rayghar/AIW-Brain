import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(here, '..');
const productRoot = resolve(backendRoot, '..');
const releaseId = 'AKR-0.10.73.5';
const builtAt = '2026-07-14T20:30:00.000Z';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k, stable(v)]));
  return value;
};
const stringify = (value) => `${JSON.stringify(stable(value), null, 2)}\n`;
const sha = (value) => createHash('sha256').update(typeof value === 'string' ? value : stringify(value)).digest('hex');
const writeJson = async (path, value) => { await mkdir(dirname(path), { recursive: true }); await writeFile(path, stringify(value)); };
const countBy = (items, key) => Object.fromEntries([...new Set(items.map(key))].sort().map((k) => [k, items.filter((item) => key(item) === k).length]));

const sourceMapPath = join(backendRoot, 'data', 'rc10_55-global-architecture-intelligence-source-map.json');
const patternPath = join(backendRoot, 'data', 'rc10_55-pattern-dna2.json');
const approvedClaimsPath = join(productRoot, 'knowledge-repository', 'AKR-0.10.72.0', 'APPROVED-CLAIMS.json');
const patternClaimsPath = join(productRoot, 'knowledge-repository', 'AKR-0.10.72.0', 'PATTERN-ATOMIC-CLAIMS.json');

const sourceMap = await readJson(sourceMapPath);
const patternCorpus = await readJson(patternPath);
const approvedClaimsFile = await readJson(approvedClaimsPath);
const patternClaimsFile = await readJson(patternClaimsPath);
const approvedDossiers = sourceMap.dossiers.filter((d) => d.sourceAuthority?.lifecycleStatus === 'approved');
const approvedClaims = approvedClaimsFile.claims ?? [];
const patternClaims = patternClaimsFile.receipts ?? [];

const sourceClaimsByConnector = new Map();
for (const claim of approvedClaims) {
  for (const loc of claim.sourceLocations ?? []) {
    const list = sourceClaimsByConnector.get(loc.connectorId) ?? [];
    list.push(claim);
    sourceClaimsByConnector.set(loc.connectorId, list);
  }
}
const patternClaimsByConnector = new Map();
const patternClaimsByRecordConnector = new Map();
for (const claim of patternClaims) {
  const list = patternClaimsByConnector.get(claim.connectorId) ?? [];
  list.push(claim);
  patternClaimsByConnector.set(claim.connectorId, list);
  const key = `${claim.patternRecordId}|${claim.connectorId}`;
  const pair = patternClaimsByRecordConnector.get(key) ?? [];
  pair.push(claim);
  patternClaimsByRecordConnector.set(key, pair);
}

const recordRefsByConnector = new Map();
for (const record of patternCorpus.records) {
  for (const evidence of record.evidence ?? []) {
    const list = recordRefsByConnector.get(evidence.connectorId) ?? [];
    list.push(record.id);
    recordRefsByConnector.set(evidence.connectorId, list);
  }
}

const conversionRegistry = approvedDossiers.map((dossier) => {
  const sourceClaims = sourceClaimsByConnector.get(dossier.connectorId) ?? [];
  const editorialClaims = patternClaimsByConnector.get(dossier.connectorId) ?? [];
  const patternRecordIds = [...new Set(recordRefsByConnector.get(dossier.connectorId) ?? [])].sort();
  const liveRefresh = dossier.catalogueSnapshot?.liveRefreshPerformed === true;
  const licenceVerified = dossier.licence?.reviewStatus === 'verified';
  const exactSourceLocations = sourceClaims.filter((claim) => (claim.sourceLocations ?? []).every((loc) => loc.connectorId && loc.repository && loc.revision && loc.path && loc.excerptHash));
  const immutableLiveLocations = sourceClaims.filter((claim) => (claim.sourceLocations ?? []).every((loc) => loc.revision && !String(loc.revision).startsWith('seed-')));
  const conversionStatus = liveRefresh
    ? 'live-snapshot-available'
    : sourceClaims.length || editorialClaims.length || patternRecordIds.length
      ? 'catalogue-and-seed-knowledge-linked-live-refresh-required'
      : 'catalogued-live-refresh-required';
  const permittedAuthority = liveRefresh && licenceVerified && exactSourceLocations.length === sourceClaims.length
    ? ['descriptive','reasoning-ready']
    : ['descriptive','controlled-pilot-reasoning'];
  const registryEntry = {
    connectorId: dossier.connectorId,
    repository: dossier.repository,
    name: dossier.identity.name,
    lifecycleStatus: dossier.sourceAuthority.lifecycleStatus,
    trustTier: dossier.sourceAuthority.trustTier,
    recommendedPosture: dossier.recommendedPosture,
    licence: {
      reviewStatus: dossier.licence.reviewStatus,
      usePolicy: dossier.licence.usePolicy,
      redistributionPermitted: dossier.licence.reviewStatus === 'verified' && dossier.licence.usePolicy !== 'reference-only',
    },
    ingestion: {
      defaultBranch: dossier.identity.defaultBranch,
      allowedPaths: dossier.exactIngestionConfiguration.allowedPaths ?? dossier.usefulPaths,
      deniedPaths: dossier.exactIngestionConfiguration.deniedPaths ?? dossier.deniedPaths,
      maxFilesPerRefresh: dossier.exactIngestionConfiguration.maxFilesPerRefresh,
      maxFileBytes: dossier.exactIngestionConfiguration.maxFileBytes,
      immutableRevisionRequired: dossier.exactIngestionConfiguration.immutableRevisionRequired !== false,
      quarantineRequired: dossier.exactIngestionConfiguration.quarantineRequired !== false,
      executionPolicy: 'source-content-is-untrusted-and-never-executed',
    },
    conversion: {
      status: conversionStatus,
      liveRefreshPerformed: liveRefresh,
      currentRevision: liveRefresh ? dossier.catalogueSnapshot.revision ?? null : null,
      sourceClaimCount: sourceClaims.length,
      exactSourceLocationCount: exactSourceLocations.length,
      immutableLiveSourceLocationCount: immutableLiveLocations.length,
      editorialSynthesisClaimCount: editorialClaims.length,
      linkedPatternRecordCount: patternRecordIds.length,
      targetKnowledgeObjectClasses: [...new Set((dossier.canonicalMapping ?? []).flatMap((m) => m.aiwEntities ?? []))].sort(),
      patternRecordIds,
    },
    activation: {
      permittedAuthority,
      productionScoringEligible: Boolean(liveRefresh && licenceVerified && sourceClaims.length && immutableLiveLocations.length === sourceClaims.length),
      discoveryOnlyInfluenceBlocked: true,
      candidateInfluenceBlocked: true,
      requiresIndependentPromotion: true,
      reason: liveRefresh
        ? 'Live snapshot exists; claim-level review and licence posture still govern authority.'
        : 'Repository has not been live-refreshed in this distribution. Seed and editorial knowledge is controlled-pilot only and cannot become a scoring rule.',
    },
    refreshBlocker: liveRefresh ? null : 'NETWORK_AND_CREDENTIALLED_GITHUB_REFRESH_NOT_EXECUTED_IN_BUILD_ENVIRONMENT',
  };
  return { ...registryEntry, fingerprint: `sha256:${sha(registryEntry)}` };
});

const sourceClaimObjects = approvedClaims.flatMap((claim) => (claim.sourceLocations ?? []).map((loc) => {
  const dossier = approvedDossiers.find((d) => d.connectorId === loc.connectorId);
  const liveRevision = Boolean(loc.revision && !String(loc.revision).startsWith('seed-'));
  const exactLocation = Boolean(loc.connectorId && loc.repository && loc.revision && loc.path && loc.excerptHash);
  const licenceVerified = dossier?.licence?.reviewStatus === 'verified';
  const object = {
    objectId: `KOBJ-${claim.id}`,
    objectClass: 'atomic-source-claim',
    subjectId: claim.subjectId,
    subjectName: claim.subjectName,
    claimId: claim.id,
    claimType: claim.claimType,
    statement: claim.statement,
    polarity: claim.polarity,
    conditions: claim.conditions ?? [],
    limitations: claim.limitations ?? [],
    contextTags: claim.contextTags ?? [],
    provenance: {
      connectorId: loc.connectorId,
      repository: loc.repository,
      revision: loc.revision,
      path: loc.path,
      heading: loc.heading ?? null,
      excerptHash: loc.excerptHash,
      exactLocation,
      liveImmutableRevision: liveRevision,
      derivation: claim.extraction?.mode ?? 'human',
    },
    review: {
      status: claim.reviewStatus,
      reviewedBy: claim.reviewedBy,
      reviewedAt: claim.reviewedAt,
      sourceConfidence: claim.sourceConfidence,
      corroborationScore: claim.corroborationScore,
    },
    authority: {
      descriptiveEligible: claim.reviewStatus === 'verified',
      reasoningEligible: claim.reviewStatus === 'verified' && exactLocation,
      compositionEligible: false,
      scoringEligible: Boolean(claim.reviewStatus === 'verified' && exactLocation && liveRevision && licenceVerified),
      conformanceEligible: false,
      environment: liveRevision ? 'controlled-pilot' : 'controlled-pilot-seed',
    },
  };
  return { ...object, fingerprint: `sha256:${sha(object)}` };
}));

const editorialClaimObjects = patternClaims.map((claim) => {
  const object = {
    objectId: `KOBJ-${claim.id}`,
    objectClass: 'editorial-pattern-claim',
    subjectId: claim.patternRecordId,
    claimId: claim.id,
    claimType: claim.claimType,
    statement: claim.statement,
    provenance: {
      connectorId: claim.connectorId,
      derivation: claim.derivation,
      exactSourceLocation: false,
      sourcePassageAvailable: false,
    },
    review: {
      status: claim.reviewStatus,
      reviewedBy: claim.reviewedBy,
      reviewedAt: claim.reviewedAt,
      releaseId: claim.releaseId,
    },
    authority: {
      descriptiveEligible: claim.reviewStatus === 'verified',
      reasoningEligible: false,
      compositionEligible: false,
      scoringEligible: false,
      conformanceEligible: false,
      environment: 'editorial-synthesis-non-scoring',
    },
  };
  return { ...object, fingerprint: `sha256:${sha(object)}` };
});

const sourceClaimIdsBySubject = new Map();
for (const obj of sourceClaimObjects) {
  const list = sourceClaimIdsBySubject.get(obj.subjectId) ?? [];
  list.push(obj.claimId);
  sourceClaimIdsBySubject.set(obj.subjectId, list);
}

const upgradedRecords = patternCorpus.records.map((record) => {
  const evidence = (record.evidence ?? []).map((entry) => {
    const editorialIds = (patternClaimsByRecordConnector.get(`${record.id}|${entry.connectorId}`) ?? []).map((c) => c.id);
    const directSourceIds = sourceClaimObjects.filter((obj) => obj.subjectId === record.id && obj.provenance.connectorId === entry.connectorId).map((obj) => obj.claimId);
    return {
      ...entry,
      claimIds: [...new Set([...(entry.claimIds ?? []), ...directSourceIds, ...editorialIds])].sort(),
      lineage: {
        directSourceClaimIds: directSourceIds.sort(),
        editorialSynthesisClaimIds: editorialIds.sort(),
        exactSourcePassageAvailable: directSourceIds.some((id) => sourceClaimObjects.find((obj) => obj.claimId === id)?.provenance.exactLocation),
        liveImmutableSourcePassageAvailable: directSourceIds.some((id) => sourceClaimObjects.find((obj) => obj.claimId === id)?.provenance.liveImmutableRevision),
      },
    };
  });
  const directSourceClaimIds = [...new Set(evidence.flatMap((e) => e.lineage.directSourceClaimIds))];
  const editorialClaimIds = [...new Set(evidence.flatMap((e) => e.lineage.editorialSynthesisClaimIds))];
  const hasLiveSource = evidence.some((e) => e.lineage.liveImmutableSourcePassageAvailable);
  const hasExactSource = evidence.some((e) => e.lineage.exactSourcePassageAvailable);
  const compositionReady = Boolean(record.generationContract && ((record.componentKit?.length ?? 0) || (record.interfaceKit?.length ?? 0)) && (record.obligations?.length ?? 0));
  const conformanceReady = Boolean((record.conformanceRules?.length ?? 0) && hasExactSource);
  const scoringCalibrated = Boolean(hasLiveSource && record.review?.reviewMethod === 'expert-reviewed');
  return {
    ...record,
    evidence,
    knowledgeAuthority: {
      descriptive: true,
      reasoningReady: hasExactSource,
      compositionReady,
      scoringCalibrated,
      conformanceReady,
      activeUse: scoringCalibrated ? 'production-scoring' : hasExactSource ? 'controlled-pilot-reasoning' : 'descriptive-and-editorial-composition-only',
      candidateKnowledgeInfluence: 'blocked',
      discoveryKnowledgeInfluence: 'blocked',
      unsupportedNumericalQualityScoresInfluence: 'blocked-unless-expert-calibrated-with-live-claim-lineage',
    },
    lineageSummary: {
      directSourceClaimCount: directSourceClaimIds.length,
      editorialSynthesisClaimCount: editorialClaimIds.length,
      claimIds: [...directSourceClaimIds, ...editorialClaimIds].sort(),
      liveImmutableSourceClaimCount: sourceClaimObjects.filter((obj) => directSourceClaimIds.includes(obj.claimId) && obj.provenance.liveImmutableRevision).length,
    },
  };
});

const patternObjects = upgradedRecords.map((record) => {
  const object = {
    objectId: `KOBJ-${record.id}`,
    objectClass: record.recordType === 'style' ? 'architecture-style' : record.recordType === 'anti-pattern' ? 'anti-pattern' : 'pattern-dna-record',
    recordId: record.id,
    name: record.name,
    aliases: record.aliases ?? [],
    category: record.category,
    summary: record.summary,
    applicableStages: record.applicableStages ?? [],
    prerequisites: record.prerequisites ?? [],
    exclusions: record.exclusions ?? [],
    obligations: record.obligations ?? [],
    risks: record.risks ?? [],
    mitigations: record.mitigations ?? [],
    componentKit: record.componentKit ?? [],
    interfaceKit: record.interfaceKit ?? [],
    conformanceRules: record.conformanceRules ?? [],
    claimIds: record.lineageSummary.claimIds,
    authority: record.knowledgeAuthority,
  };
  return { ...object, fingerprint: `sha256:${sha(object)}` };
});

const claimsForContradictions = sourceClaimObjects.filter((c) => c.review.status === 'verified');
const contradictionGroups = new Map();
for (const claim of claimsForContradictions) {
  const key = `${claim.subjectId}|${claim.claimType}`;
  const list = contradictionGroups.get(key) ?? [];
  list.push(claim);
  contradictionGroups.set(key, list);
}
const contradictions = [...contradictionGroups.entries()].flatMap(([key, claims]) => {
  const polarities = new Set(claims.map((c) => c.polarity));
  if (polarities.size < 2) return [];
  return [{
    contradictionId: `KCON-${sha(key).slice(0,16)}`,
    subjectId: claims[0].subjectId,
    claimType: claims[0].claimType,
    claimIds: claims.map((c) => c.claimId).sort(),
    status: 'requires-human-context-resolution',
    productionInfluence: 'blocked-until-resolved',
  }];
});

const claimLineage = upgradedRecords.map((record) => ({
  recordId: record.id,
  recordName: record.name,
  authority: record.knowledgeAuthority,
  evidence: record.evidence.map((e) => ({ connectorId: e.connectorId, evidenceRole: e.evidenceRole, claimIds: e.claimIds, lineage: e.lineage })),
  summary: record.lineageSummary,
}));

const withdrawalImpact = conversionRegistry.map((connector) => {
  const affected = claimLineage.filter((item) => item.evidence.some((e) => e.connectorId === connector.connectorId));
  return {
    connectorId: connector.connectorId,
    repository: connector.repository,
    affectedRecordCount: affected.length,
    affectedRecordIds: affected.map((item) => item.recordId).sort(),
    directSourceClaimCount: sourceClaimObjects.filter((obj) => obj.provenance.connectorId === connector.connectorId).length,
    editorialSynthesisClaimCount: editorialClaimObjects.filter((obj) => obj.provenance.connectorId === connector.connectorId).length,
    withdrawalPolicy: 'remove-source-claims-invalidate-dependent-recommendations-recalculate-authority-preserve-audit-history',
    rollbackRequired: true,
  };
});

const knowledgeObjects = [...sourceClaimObjects, ...editorialClaimObjects, ...patternObjects];
const metrics = {
  approvedRepositoryCount: approvedDossiers.length,
  conversionRegistryCount: conversionRegistry.length,
  liveRefreshCompletedCount: conversionRegistry.filter((r) => r.conversion.liveRefreshPerformed).length,
  liveRefreshBlockedCount: conversionRegistry.filter((r) => !r.conversion.liveRefreshPerformed).length,
  sourceClaimObjectCount: sourceClaimObjects.length,
  editorialClaimObjectCount: editorialClaimObjects.length,
  patternObjectCount: patternObjects.length,
  totalKnowledgeObjectCount: knowledgeObjects.length,
  patternClaimLineageCoveragePercent: Number((100 * upgradedRecords.filter((r) => r.lineageSummary.claimIds.length > 0).length / upgradedRecords.length).toFixed(1)),
  directSourceClaimCoveragePercent: Number((100 * upgradedRecords.filter((r) => r.lineageSummary.directSourceClaimCount > 0).length / upgradedRecords.length).toFixed(1)),
  reasoningReadyPatternCount: upgradedRecords.filter((r) => r.knowledgeAuthority.reasoningReady).length,
  compositionReadyPatternCount: upgradedRecords.filter((r) => r.knowledgeAuthority.compositionReady).length,
  scoringCalibratedPatternCount: upgradedRecords.filter((r) => r.knowledgeAuthority.scoringCalibrated).length,
  conformanceReadyPatternCount: upgradedRecords.filter((r) => r.knowledgeAuthority.conformanceReady).length,
  unresolvedContradictionCount: contradictions.length,
  sourceLifecycleDistribution: countBy(sourceMap.dossiers, (d) => d.sourceAuthority.lifecycleStatus),
  licenceReviewDistribution: countBy(approvedDossiers, (d) => d.licence.reviewStatus),
};

const activationPosture = {
  releaseId,
  generatedAt: builtAt,
  activeKnowledgeRelease: releaseId,
  brainUse: {
    descriptiveKnowledge: 'enabled',
    controlledPilotReasoning: 'enabled-for-verified-seed-claims-with-citation-receipts',
    composition: 'enabled-with-human-preview-and-approval',
    scoring: 'blocked-for-repository-derived-claims-until-live-immutable-refresh-licence-clearance-and-expert-calibration',
    conformance: 'blocked-unless-a-rule-has-direct-source-lineage-and-independent-approval',
    candidateKnowledge: 'discovery-only',
    discoveryKnowledge: 'discovery-only',
  },
  releaseBoundary: {
    liveGithubRefreshCompleted: false,
    reason: 'The build environment has no outbound GitHub network access or enterprise GitHub credentials. The release implements and executes deterministic conversion of the governed catalogue and existing approved claims, repairs claim lineage, and blocks false scoring authority. Live source snapshots remain a production-acceptance action.',
    productionAccepted: false,
  },
  metrics,
};

const outputBackend = join(backendRoot, 'data');
const outputRepo = join(productRoot, 'knowledge-repository', releaseId);
await mkdir(outputRepo, { recursive: true });

const artifacts = {
  'GITHUB-CONVERSION-REGISTRY.json': { schemaVersion: '1.0', releaseId, generatedAt: builtAt, metrics, repositories: conversionRegistry },
  'KNOWLEDGE-OBJECTS.json': { schemaVersion: '1.0', releaseId, generatedAt: builtAt, metrics, objects: knowledgeObjects },
  'PATTERN-DNA-2.1.json': { ...patternCorpus, version: '2.1', releaseId, generatedAt: builtAt, metrics: { ...patternCorpus.metrics, ...metrics }, authority: { ...(patternCorpus.authority ?? {}), releaseBoundary: activationPosture.brainUse }, records: upgradedRecords },
  'CLAIM-LINEAGE-INDEX.json': { schemaVersion: '1.0', releaseId, generatedAt: builtAt, recordCount: claimLineage.length, records: claimLineage },
  'CONTRADICTION-REGISTER.json': { schemaVersion: '1.0', releaseId, generatedAt: builtAt, unresolvedCount: contradictions.length, contradictions },
  'SOURCE-WITHDRAWAL-IMPACT.json': { schemaVersion: '1.0', releaseId, generatedAt: builtAt, connectors: withdrawalImpact },
  'BRAIN-KNOWLEDGE-ACTIVATION.json': activationPosture,
};

for (const [name, data] of Object.entries(artifacts)) {
  await writeJson(join(outputRepo, name), data);
  const backendName = `rc10_73_5-${name.toLowerCase().replace(/\.json$/, '').replace(/[^a-z0-9]+/g, '-')}.json`;
  await writeJson(join(outputBackend, backendName), data);
}

const artifactEntries = [];
for (const name of Object.keys(artifacts)) {
  const body = await readFile(join(outputRepo, name));
  artifactEntries.push({ name, sha256: createHash('sha256').update(body).digest('hex'), bytes: body.length });
}
const sourceCatalogueHash = sha(sourceMap);
const manifest = {
  schemaVersion: '2.1',
  releaseId,
  title: 'AIW Governed GitHub Knowledge Conversion and Brain Activation',
  generatedAt: builtAt,
  status: 'approved-for-controlled-pilot',
  authority: {
    runtimeUse: 'governed descriptive knowledge, controlled-pilot reasoning and human-approved composition',
    mutationAuthority: 'none; human approval required',
    productionScoring: 'blocked for repository-derived knowledge pending immutable live refresh, licence clearance and expert calibration',
    candidateAndDiscoveryInfluence: 'blocked from scoring, constraints and conformance',
  },
  pins: {
    kernel: 'AIW-KERNEL-2.0',
    lifecycleGrammar: 'LIFECYCLE-GRAMMAR-1.1',
    patternDna: 'PDNA-2.1',
    cambridge: 'CAMBRIDGE-SA-1.0',
    previousKnowledgeRelease: 'AKR-0.10.72.0',
    githubCatalogueSha256: sourceCatalogueHash,
    knowledgeObjectCorpusSha256: artifactEntries.find((a) => a.name === 'KNOWLEDGE-OBJECTS.json').sha256,
    claimLineageSha256: artifactEntries.find((a) => a.name === 'CLAIM-LINEAGE-INDEX.json').sha256,
    llmAuthorityPolicy: 'LLM-AUTHORITY-1.0',
  },
  artifacts: artifactEntries,
  promotion: {
    approvedRepositories: approvedDossiers.length,
    liveRepositorySnapshots: metrics.liveRefreshCompletedCount,
    sourceClaimObjects: sourceClaimObjects.length,
    editorialClaimObjects: editorialClaimObjects.length,
    patternRecords: upgradedRecords.length,
    patternRecordsWithClaimLineage: upgradedRecords.filter((r) => r.lineageSummary.claimIds.length).length,
    directSourceClaimCoveragePercent: metrics.directSourceClaimCoveragePercent,
    scoringCalibratedPatternRecords: metrics.scoringCalibratedPatternCount,
    sponsorApproved: true,
    independentAIReview: true,
    externalHumanPanel: false,
  },
  activation: {
    requiresStepUpAuthorization: true,
    requiresImpactPreview: true,
    requiresRollback: true,
    permittedEnvironment: ['local','controlled-pilot'],
    productionAccepted: false,
    liveGithubRefreshAccepted: false,
  },
  limitations: [
    'Outbound GitHub access and enterprise credentials were unavailable in the build environment; 30 immutable live snapshots remain unexecuted.',
    'Seed claims preserve exact catalogue locations but use seed revisions and therefore cannot become production scoring rules.',
    'Editorial Pattern DNA claim receipts now have explicit lineage but remain editorial synthesis unless backed by a direct source passage.',
    'Licence review is still open for repositories marked requires-review.',
  ],
};
await writeJson(join(outputRepo, 'RELEASE-MANIFEST.json'), manifest);
await writeJson(join(outputBackend, 'knowledge-release-manifest.json'), manifest);
await cp(join(outputRepo, 'PATTERN-DNA-2.1.json'), join(outputBackend, 'rc10_73_5-pattern-dna2.1.json'));

console.log(JSON.stringify({ releaseId, metrics, artifacts: artifactEntries.length, outputRepo }, null, 2));
