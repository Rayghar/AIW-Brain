import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquisitionDryRun, formatAcquisitionDryRun } from './rc10-73-7-acquisition-selection.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const backend = resolve(here, '..');
const product = resolve(backend, '..');
const frontend = resolve(product, 'frontend');
const evidenceRoot = resolve(product, 'release-evidence', 'rc10.73.7');
const evidenceGeneratedAt = new Date().toISOString();
const deterministicFixtureTimestamp = '2026-07-15T00:00:00.000Z';

const authoritySets = {
  'official-specification-or-standard': new Set(['GH-FINOS-CALM','GH-ASYNCAPI','GH-OAM-SPEC']),
  'architecture-conformance-implementation': new Set(['GH-ARCHUNIT','GH-JQASSISTANT','GH-JMOLECULES','GH-SPRING-MODULITH','GH-CONTEXT-MAPPER-DSL','GH-CONTEXT-MAP-DISCOVERY']),
  'official-reference-architecture': new Set([
    'GH-MICROSOFT-ARCH-CENTER','GH-AWS-SERVERLESS-PATTERNS','GH-AWS-SOLUTIONS-CONSTRUCTS','GH-AZURE-RESOURCE-MODULES',
    'GH-GCP-CLOUD-FOUNDATION-FABRIC','GH-APACHE-CAMEL','GH-K8S-PATTERNS','GH-BACKSTAGE','GH-FINOS-AI-RA',
    'GH-SAP-ARCH-CENTER','GH-CNCF-TAG-SECURITY','GH-OTEL-DEMO','GH-GCP-MICROSERVICES-DEMO',
    'GH-GCP-SOFTWARE-DELIVERY-BLUEPRINT','GH-AWS-SAAS-EKS','GH-MESHERY','GH-IBM-CLOUD-NATIVE-PATTERNS',
  ]),
  'educational-or-discovery-source': new Set([
    'GH-AWESOME-DESIGN-PATTERNS','GH-AWESOME-SOFTWARE-ARCH','GH-AWESOME-ANTIPATTERN','GH-SYSTEM-DESIGN-PRIMER',
    'GH-DEVELOPER-ROADMAP','GH-SYSTEM-DESIGN-101','GH-AWESOME-SCALABILITY','GH-AWESOME-SYSTEM-DESIGN-RESOURCES',
  ]),
};

function authorityClass(connectorId) {
  for (const [name, ids] of Object.entries(authoritySets)) if (ids.has(connectorId)) return name;
  return 'reviewed-practitioner-or-implementation-source';
}

function sha256(content) { return createHash('sha256').update(content).digest('hex'); }
function stableJson(value) { return `${JSON.stringify(value, null, 2)}\n`; }
async function json(path) { return JSON.parse(await readFile(path, 'utf8')); }

const sourceMapPath = resolve(backend, 'data/rc10_55-global-architecture-intelligence-source-map.json');
const frontendSourceMapPath = resolve(frontend, 'data/rc10_55-global-architecture-intelligence-source-map.json');
const catalogue = await json(resolve(backend, 'data/sprint7_7-github-knowledge-catalog.json'));
const sourceMap = await json(sourceMapPath);
const patternDna = await json(resolve(backend, 'data/rc10_73_5-pattern-dna2.1.json'));
const conversion = await json(resolve(backend, 'data/rc10_73_5-github-conversion-registry.json'));
const priorAcquisition = await json(resolve(product, 'release-evidence/rc10.73.6/LIVE_GITHUB_ACQUISITION_SUMMARY.json'));

const catalogueById = new Map(catalogue.connectors.map((item) => [item.id, item]));
const conversionById = new Map(conversion.repositories.map((item) => [item.connectorId, item]));
const priorAcquisitionById = new Map(priorAcquisition.results.map((item) => [item.connectorId, item]));
const patternRefs = new Map(sourceMap.dossiers.map((item) => [item.connectorId, []]));
for (const record of patternDna.records) {
  for (const evidence of record.evidence ?? []) {
    if (patternRefs.has(evidence.connectorId)) patternRefs.get(evidence.connectorId).push(record.id);
  }
}

const commonProhibitedUses = [
  'production-scoring', 'candidate-elimination', 'hard-constraint-activation', 'conformance-authority',
  'automatic-knowledge-promotion', 'legal-or-licence-approval', 'production-authority', 'canonical-design-graph-mutation',
];
const commonPermittedUses = [
  'live-acquisition', 'immutable-snapshotting', 'security-quarantine', 'deterministic-parsing',
  'sol-semantic-analysis', 'candidate-knowledge-extraction', 'ontology-mapping',
  'duplicate-and-contradiction-analysis', 'pattern-dna-evidence-reconstruction',
];
const archivedAcquisitionApprovals = new Set(['GH-CNCF-TAG-SECURITY', 'GH-STRUCTURIZR-JAVA']);

sourceMap.governanceMigration = {
  schemaVersion: 'aiw-source-governance-v2', migrationEffectiveAt: deterministicFixtureTimestamp,
  timestampClassification: 'deterministic-governance-effective-time-not-command-execution-time',
  acquisitionAuthoritySeparated: true, productionAccepted: false,
};
sourceMap.dossiers = sourceMap.dossiers.map((dossier) => {
  const catalog = catalogueById.get(dossier.connectorId);
  if (!catalog || catalog.repository !== dossier.repository) throw new Error(`SOURCE_MAP_CATALOGUE_DRIFT:${dossier.connectorId}`);
  const previousLifecycleStatus = dossier.sourceAuthority.lifecycleStatus;
  const priorResult = priorAcquisitionById.get(dossier.connectorId);
  const archivedAcquisitionApproved = archivedAcquisitionApprovals.has(dossier.connectorId);
  return {
    ...dossier,
    acquisitionStatus: 'approved',
    sourceAuthorityClass: authorityClass(dossier.connectorId),
    previousLifecycleStatus,
    semanticReviewStatus: archivedAcquisitionApproved ? 'requires-freshness-and-successor-review' : 'not-reviewed-from-live-immutable-evidence',
    knowledgePromotionStatus: 'candidate-only-pending-independent-review',
    permittedUses: [...new Set([...commonPermittedUses, ...(dossier.permittedAiwUses ?? catalog.contentUses ?? [])])].sort(),
    prohibitedUses: [...new Set([...commonProhibitedUses, ...(dossier.prohibitedAiwUses ?? catalog.limitations ?? [])])].sort(),
    licenceDisposition: dossier.licence.reviewStatus === 'verified'
      ? 'catalogue-recorded-verified-revalidation-required-at-immutable-revision'
      : 'requires-independent-licence-review-before-redistribution-or-promotion',
    securityDisposition: 'quarantine-required-before-semantic-analysis',
    lastImmutableRevision: conversionById.get(dossier.connectorId)?.conversion?.currentRevision ?? null,
    lastAcquisitionStatus: priorResult?.status ?? 'not-attempted',
    ...(archivedAcquisitionApproved ? {
      archivedSourceDisposition: 'approved-for-immutable-acquisition',
      sourceFreshnessStatus: 'archived',
      currentGuidanceEligible: false,
      automaticPromotionAllowed: false,
      successorRepository: null,
      successorMigrationRequired: true,
    } : {}),
  };
});

const previousDistribution = Object.fromEntries(['approved','candidate','discovery-only'].map((status) => [status, sourceMap.dossiers.filter((d) => d.previousLifecycleStatus === status).length]));
if (sourceMap.dossiers.length !== 47 || previousDistribution.approved !== 30 || previousDistribution.candidate !== 9 || previousDistribution['discovery-only'] !== 8) throw new Error('GOVERNED_ESTATE_COUNT_MISMATCH');

await writeFile(sourceMapPath, stableJson(sourceMap));
await writeFile(frontendSourceMapPath, stableJson(sourceMap));
await mkdir(evidenceRoot, { recursive: true });

const matrix = {
  schemaVersion: 'aiw-all-47-repository-governance-matrix-v1', generatedAt: evidenceGeneratedAt, deterministicFixtureTimestamp, baseline: 'AIW v0.10.0-rc.10.73.6',
  productionAccepted: false,
  counts: { total: 47, previousApproved: 30, previousCandidate: 9, previousDiscoveryOnly: 8, acquisitionApproved: 47 },
  authorityIsolation: {
    acquisitionApprovalGrantsScoringAuthority: false,
    acquisitionApprovalGrantsHardConstraintAuthority: false,
    acquisitionApprovalGrantsConformanceAuthority: false,
    acquisitionApprovalGrantsKnowledgePromotionAuthority: false,
    generatedKnowledgeAuthority: 'candidate',
  },
  repositories: sourceMap.dossiers.map((dossier) => {
    const catalogueEntry = catalogueById.get(dossier.connectorId);
    const conversionEntry = conversionById.get(dossier.connectorId);
    const refs = [...new Set(patternRefs.get(dossier.connectorId))].sort();
    return {
      connectorId: dossier.connectorId,
      ownerRepository: dossier.repository,
      displayName: dossier.identity.name,
      previousLifecycleStatus: dossier.previousLifecycleStatus,
      trustTier: dossier.sourceAuthority.trustTier,
      sourceAuthorityClass: dossier.sourceAuthorityClass,
      acquisitionStatus: dossier.acquisitionStatus,
      intendedAiwUse: dossier.permittedUses,
      allowedPaths: catalogueEntry.allowedPaths,
      deniedPaths: catalogueEntry.deniedPaths,
      licenceStatus: { catalogue: catalogueEntry.license, disposition: dossier.licenceDisposition },
      currentEvidenceCoverage: {
        conversionRegistryPresent: Boolean(conversionEntry),
        liveImmutableRevisionPresent: Boolean(dossier.lastImmutableRevision),
        lastAcquisitionStatus: dossier.lastAcquisitionStatus,
        patternDnaRecordCount: refs.length,
      },
      patternDnaReferences: refs,
      semanticReviewStatus: dossier.semanticReviewStatus,
      knowledgePromotionStatus: dossier.knowledgePromotionStatus,
      securityDisposition: dossier.securityDisposition,
      ...(dossier.archivedSourceDisposition ? {
        archivedSourceDisposition: dossier.archivedSourceDisposition,
        sourceFreshnessStatus: dossier.sourceFreshnessStatus,
        currentGuidanceEligible: dossier.currentGuidanceEligible,
        automaticPromotionAllowed: dossier.automaticPromotionAllowed,
        successorRepository: dossier.successorRepository,
        successorMigrationRequired: dossier.successorMigrationRequired,
      } : {}),
      prohibitedUses: dossier.prohibitedUses,
    };
  }).sort((a, b) => a.connectorId.localeCompare(b.connectorId)),
};
await writeFile(resolve(evidenceRoot, 'ALL_47_REPOSITORY_GOVERNANCE_MATRIX.json'), stableJson(matrix));

const dryRun = acquisitionDryRun(sourceMap.dossiers);
const statusRows = matrix.repositories.map((item) => `| ${item.connectorId} | ${item.ownerRepository} | ${item.previousLifecycleStatus} | ${item.sourceAuthorityClass} | ${item.acquisitionStatus} | ${item.currentEvidenceCoverage.patternDnaRecordCount} |`);
const selectionReport = `# All 47 Acquisition Selection Report\n\n` +
  `Baseline: AIW v0.10.0-rc.10.73.6  \nGenerated by command: ${evidenceGeneratedAt}  \nDeterministic governance fixture time: ${deterministicFixtureTimestamp}  \nNetwork access: **none**  \nProduction accepted: **false**\n\n` +
  `## Result\n\nThe empty connector filter selects **${dryRun.selectedCount}** acquisition-approved repositories in deterministic connector-ID order. Previous authority remains 30 approved, 9 candidate, and 8 discovery-only. All generated knowledge remains candidate-only.\n\n` +
  `| Connector ID | Repository | Previous lifecycle | Source authority class | Acquisition | Pattern DNA records |\n|---|---|---:|---|---|---:|\n${statusRows.join('\n')}\n\n` +
  `## No-network dry-run output\n\n\`\`\`text\n${formatAcquisitionDryRun(dryRun)}\n\`\`\`\n`;
await writeFile(resolve(evidenceRoot, 'ALL_47_ACQUISITION_SELECTION_REPORT.md'), selectionReport);

const duplicates = [];
for (const field of ['connectorId','repository']) {
  const groups = new Map();
  for (const item of sourceMap.dossiers) groups.set(item[field], [...(groups.get(item[field]) ?? []), item.connectorId]);
  for (const [value, ids] of groups) if (ids.length > 1) duplicates.push({ field, value, connectorIds: ids });
}
const patternReferenced = [...patternRefs.entries()].filter(([, refs]) => refs.length).map(([id]) => id).sort();
const patternUnreferenced = [...patternRefs.entries()].filter(([, refs]) => !refs.length).map(([id]) => id).sort();
const inventoryPaths = [
  'backend/data/rc10_55-global-architecture-intelligence-source-map.json','frontend/data/rc10_55-global-architecture-intelligence-source-map.json',
  'backend/data/sprint7_7-github-knowledge-catalog.json','frontend/data/sprint7_7-github-knowledge-catalog.json',
  'knowledge-repository/AKR-0.10.72.0/GITHUB-KNOWLEDGE-CATALOG.json','backend/data/rc10_73_5-github-conversion-registry.json',
  'knowledge-repository/AKR-0.10.73.5/GITHUB-CONVERSION-REGISTRY.json','backend/data/rc10_73_5-pattern-dna2.1.json',
  'backend/data/rc10_73_5-pattern-dna-2-1.json','knowledge-repository/AKR-0.10.73.5/PATTERN-DNA-2.1.json',
  'backend/data/knowledge-release-manifest.json','frontend/data/knowledge-release-manifest.json',
  'knowledge-repository/AKR-0.10.73.5/knowledge-release-manifest.json','knowledge-repository/AKR-0.10.72.0/knowledge-release-manifest.json',
  'release-evidence/rc10.73.6/LIVE_GITHUB_ACQUISITION_SUMMARY.json','release-evidence/rc10.73.6/GITHUB_CONNECTIVITY_PREFLIGHT.json',
];
const inventory = [];
for (const path of inventoryPaths) {
  try { const content = await readFile(resolve(product, path)); inventory.push({ path, sha256: sha256(content), bytes: content.length }); }
  catch { inventory.push({ path, missing: true }); }
}
const migration = {
  schemaVersion: 'aiw-source-authority-migration-report-v1', generatedAt: evidenceGeneratedAt, deterministicFixtureTimestamp, productionAccepted: false,
  reconciledCounts: matrix.counts,
  inventory,
  findings: {
    missingSourcesFromPriorGovernedEstate: [],
    duplicates,
    renamedOrMovedRepositories: [],
    archivedRepositoryMetadata: [{ currentConnectorId: 'GH-STRUCTURIZR-JAVA', currentRepository: 'structurizr/java', archivedRelatedRepository: 'structurizr/dsl', disposition: 'recorded historical ingestion risk; no substitution performed' }],
    inconsistentConnectorIds: [],
    sourceMapDrift: [
      'AKR-0.10.73.5 conversion registry covers the 30 previously approved repositories, not the 47 acquisition-approved repositories.',
      'rc10.73.6 connectivity and acquisition evidence covers the 30 previously approved repositories only.',
      'The frontend AKR-0.10.72.0 manifest is a legacy static verifier input and is not imported by the product runtime; backend AKR-0.10.73.5 is the canonical governed runtime manifest. The versions must not be merged by relabelling either artifact.',
      'Pattern DNA 2.1 references 23 connectors; 24 governed connectors currently have no Pattern DNA record reference.',
    ],
    patternDnaConnectorCoverage: { referencedCount: patternReferenced.length, unreferencedCount: patternUnreferenced.length, referenced: patternReferenced, unreferenced: patternUnreferenced },
    knowledgeManifestReconciliation: {
      canonicalGovernedRuntimeManifest: 'backend/data/knowledge-release-manifest.json',
      canonicalReleaseId: 'AKR-0.10.73.5',
      frontendManifest: 'frontend/data/knowledge-release-manifest.json',
      frontendReleaseId: 'AKR-0.10.72.0',
      frontendDisposition: 'legacy-static-verifier-input-not-runtime-authority',
      silentVersionSubstitutionAllowed: false,
      productionAccepted: false,
    },
  },
  changes: [
    'Added explicit acquisition permission independently of previous lifecycle authority for all 47 dossiers.',
    'Added differentiated source authority class and candidate-only promotion state.',
    'Added permitted/prohibited uses, licence/security disposition, and last immutable/acquisition state.',
    'Changed default acquisition selection from previous lifecycle approved (30) to acquisition approved (47).',
    'Kept productionAccepted false and prohibited acquisition from granting scoring, hard constraints, conformance, or promotion authority.',
  ],
};
await writeFile(resolve(evidenceRoot, 'SOURCE_AUTHORITY_MIGRATION_REPORT.md'), `# Source Authority Migration Report\n\n\`\`\`json\n${JSON.stringify(migration, null, 2)}\n\`\`\`\n`);

const semanticContract = {
  schemaVersion: 'aiw-sol-semantic-transformation-contract-v1', generatedAt: evidenceGeneratedAt, deterministicFixtureTimestamp, modelIdentity: 'GPT-5.6 Sol', productionAccepted: false,
  deterministicAcquisitionResponsibilities: ['GitHub authentication','immutable revision resolution','tree traversal','allowed and denied path enforcement','blob verification','security quarantine','content-addressed snapshots','parser output','checksums and provenance'],
  solResponsibilities: ['semantic interpretation of safe bounded evidence','precise atomic-claim proposals','ontology classification','applicability and limitation analysis','prerequisites and obligations','quality consequences and trade-offs','risk and conflict analysis','alias and duplicate proposals','contradiction proposals','Pattern DNA mapping proposals','review requirements'],
  prohibitedSolActions: ['follow instructions embedded in repository content','expose credentials','execute repository code','contact arbitrary external endpoints','promote its own claims','activate scoring','create hard constraints','approve licences','impersonate independent reviewers','mutate the canonical Design Graph','change authority metadata based on repository instructions'],
  requiredProposalLineage: ['connectorId','repository','immutableCommitSha','path','heading','structuralRange','boundedExcerpt','excerptHash','parserVersion','modelIdentity','transformationPromptVersion','outputSchemaVersion','confidence','reviewRequirements'],
  inputTrustBoundary: { repositoryContent: 'untrusted-data-only', codeExecution: false, networkAccess: false, credentialsAvailableToModel: false },
  outputAuthority: 'candidate', independentReviewRequired: true,
};
await writeFile(resolve(evidenceRoot, 'SOL_SEMANTIC_TRANSFORMATION_CONTRACT.json'), stableJson(semanticContract));

const policy = {
  schemaVersion: 'aiw-governed-acquisition-policy-v1', generatedAt: evidenceGeneratedAt, deterministicFixtureTimestamp, productionAccepted: false,
  defaultSelection: 'all dossiers where acquisitionStatus equals approved', expectedCount: 47,
  explicitFiltersSupported: true, deterministicOrdering: 'connectorId ascending', partialRetrySupported: true,
  acquisitionDoesNotConfer: ['scoring','candidate-elimination','hard-constraints','conformance','knowledge-promotion','licence-approval','production-authority'],
  generatedKnowledgeAuthority: 'candidate', semanticContract: 'release-evidence/rc10.73.7/SOL_SEMANTIC_TRANSFORMATION_CONTRACT.json',
};
await writeFile(resolve(backend, 'data/rc10_73_7-governed-acquisition-policy.json'), stableJson(policy));

console.log(JSON.stringify({ selectedCount: dryRun.selectedCount, previousDistribution, authorityClasses: [...new Set(sourceMap.dossiers.map((item) => item.sourceAuthorityClass))].sort(), productionAccepted: false }, null, 2));
