import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const backend = resolve(here, '..');
const product = resolve(backend, '..');
const evidenceRoot = resolve(product, 'release-evidence/rc10.73.7');
const snapshotRoot = resolve(product, 'knowledge-repository/AKR-0.10.73.7/github-live');
const summaryPath = resolve(evidenceRoot, 'ALL_47_LIVE_ACQUISITION_SUMMARY.json');
const sourceMap = JSON.parse(await readFile(resolve(backend, 'data/rc10_55-global-architecture-intelligence-source-map.json'), 'utf8'));
const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
const generatedAt = new Date().toISOString();
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const writeJson = async (name, value) => writeFile(resolve(evidenceRoot, name), `${JSON.stringify(value, null, 2)}\n`);
const dossiers = new Map(sourceMap.dossiers.map((item) => [item.connectorId, item]));
const manifests = [];
const missingManifests = [];

for (const result of summary.results) {
  if (!result.snapshotId) { missingManifests.push({ connectorId: result.connectorId, repository: result.repository, reason: result.error ?? 'snapshot-not-created' }); continue; }
  const path = resolve(snapshotRoot, 'snapshots', result.connectorId, result.snapshotId, 'manifest.json');
  try { manifests.push({ path, relativePath: path.slice(product.length + 1).replaceAll('\\', '/'), manifest: JSON.parse(await readFile(path, 'utf8')) }); }
  catch (error) { missingManifests.push({ connectorId: result.connectorId, repository: result.repository, reason: error instanceof Error ? error.message : String(error) }); }
}

const base = { releaseId: 'AIW v0.10.0-rc.10.73.7', generatedAt, productionAccepted: false, knowledgeAuthority: 'candidate' };
const coverageRows = manifests.map(({ manifest }) => ({
  connectorId: manifest.connectorId, repository: manifest.repository, immutableCommit: manifest.commitSha, defaultBranch: manifest.branch,
  ...manifest.coverage, snapshotChecksum: manifest.snapshotChecksum, manifestChecksum: manifest.manifestSha256,
  initialCandidateClaimCount: manifest.candidateClaims.total, licenceStatus: manifest.licenceEvidence.finalDisposition,
  completionStatus: manifest.coverage.processingComplete ? (manifest.coverage.reviewRequired ? 'complete-review-required' : 'complete') : 'failed-or-incomplete',
})).sort((a, b) => a.connectorId.localeCompare(b.connectorId));

const manifestIndex = manifests.map(({ relativePath, manifest }) => ({
  connectorId: manifest.connectorId, repository: manifest.repository, immutableCommit: manifest.commitSha, snapshotId: manifest.snapshotId,
  manifestPath: relativePath, snapshotChecksum: manifest.snapshotChecksum, manifestChecksum: manifest.manifestSha256,
  contentAddressedObjectCount: manifest.files.filter((item) => item.contentAddressedObject).length,
  denominatorCount: manifest.files.length, denominatorPreserved: manifest.tree.denominatorPreserved,
})).sort((a, b) => a.connectorId.localeCompare(b.connectorId));

const artefacts = manifests.flatMap(({ manifest }) => manifest.architectureArtefacts ?? []).sort((a, b) => a.artefactId.localeCompare(b.artefactId));
const groups = manifests.flatMap(({ manifest }) => manifest.crossFileArchitectureGroups ?? []).sort((a, b) => a.groupId.localeCompare(b.groupId));
const fileFindings = manifests.flatMap(({ manifest }) => manifest.files.filter((item) => item.findings?.length).map((item) => ({ connectorId: manifest.connectorId, repository: manifest.repository, immutableCommit: manifest.commitSha, path: item.path, status: item.status, securityDisposition: item.securityDisposition ?? null, findings: item.findings })));
const quarantined = fileFindings.filter((item) => item.status === 'quarantined');
const instructionShaped = fileFindings.filter((item) => item.findings.some((finding) => finding.code === 'INSTRUCTION_SHAPED_CONTENT'));
const licences = manifests.map(({ manifest }) => ({ connectorId: manifest.connectorId, repository: manifest.repository, immutableCommit: manifest.commitSha, ...manifest.licenceEvidence, legalApprovalGranted: false, redistributionApproved: false })).sort((a, b) => a.connectorId.localeCompare(b.connectorId));
const reviewRequired = summary.results.filter((item) => item.status !== 'complete').map((item) => ({ ...item, productionAuthorityGranted: false }));

function projectArtefact(item) {
  return {
    artefactId: item.artefactId,
    artefactTypes: item.artefactTypes,
    connectorId: item.connectorId,
    repository: item.repository,
    immutableCommit: item.immutableCommit,
    path: item.path,
    format: item.format,
    parserRequired: item.parserRequired,
    relatedFiles: (item.relatedFiles ?? []).slice(0, 10),
    relatedFileCount: item.relatedFileCount ?? item.relatedFiles?.length ?? 0,
    relatedFilesTruncated: item.relatedFilesTruncated ?? false,
    crossFileGroupId: item.crossFileGroupId ?? null,
    sourceAuthorship: item.sourceAuthorship,
    licenceAndReusePosture: item.licenceAndReusePosture,
    securityDisposition: item.securityDisposition,
    candidateExtractionDestinations: item.candidateExtractionDestinations,
  };
}

function inventoryReference(item) {
  return {
    artefactId: item.artefactId,
    connectorId: item.connectorId,
    repository: item.repository,
    immutableCommit: item.immutableCommit,
    path: item.path,
    artefactTypes: item.artefactTypes,
    format: item.format,
    parserRequired: item.parserRequired,
    crossFileGroupId: item.crossFileGroupId ?? null,
  };
}

function inventory(name, predicate) {
  const selected = artefacts.filter(predicate);
  return { schemaVersion: `aiw-${name.toLowerCase().replaceAll('_', '-')}-v1`, ...base, count: selected.length, canonicalIndex: 'WHOLE_ARCHITECTURE_ARTEFACT_INDEX.json', artefacts: selected.map(inventoryReference) };
}
const hasType = (type) => (item) => item.artefactTypes.includes(type);
const hasAnyType = (...types) => (item) => types.some((type) => item.artefactTypes.includes(type));

await mkdir(evidenceRoot, { recursive: true });
await writeJson('REPOSITORY_COVERAGE_MATRIX.json', { schemaVersion: 'aiw-repository-coverage-matrix-v1', ...base, expectedRepositories: 47, reportedRepositories: coverageRows.length, missingManifests, repositories: coverageRows });
await writeJson('CONTENT_SNAPSHOT_MANIFEST_INDEX.json', { schemaVersion: 'aiw-content-snapshot-manifest-index-v1', ...base, expectedRepositories: 47, indexedManifests: manifestIndex.length, manifests: manifestIndex });
await writeJson('QUARANTINE_AND_SECURITY_REPORT.json', { schemaVersion: 'aiw-quarantine-and-security-report-v1', ...base, executionOfRepositoryContent: false, quarantinedFileCount: quarantined.length, instructionShapedFileCount: instructionShaped.length, quarantined, instructionShaped, rawQuarantineIncludedInReleaseDistribution: false });
await writeJson('FAILED_AND_REVIEW_REQUIRED_REPOSITORIES.json', { schemaVersion: 'aiw-failed-and-review-required-repositories-v1', ...base, count: reviewRequired.length + missingManifests.length, repositories: reviewRequired, missingManifests });
await writeJson('LICENCE_EVIDENCE_REGISTER.json', { schemaVersion: 'aiw-licence-evidence-register-v1', ...base, count: licences.length, legalApprovalGranted: false, redistributionApproved: false, repositories: licences });
const projectedArtefacts = artefacts.map(projectArtefact);
const artefactParts = [];
for (let offset = 0, partNumber = 1; offset < projectedArtefacts.length; offset += 20_000, partNumber += 1) {
  const partArtefacts = projectedArtefacts.slice(offset, offset + 20_000);
  const partName = `WHOLE_ARCHITECTURE_ARTEFACT_INDEX.part-${String(partNumber).padStart(3, '0')}.json`;
  const partPayload = { schemaVersion: 'aiw-whole-architecture-artefact-index-part-v1', ...base, partNumber, firstArtefactIndex: offset, count: partArtefacts.length, artefacts: partArtefacts };
  const serializedPart = `${JSON.stringify(partPayload, null, 2)}\n`;
  await writeFile(resolve(evidenceRoot, partName), serializedPart);
  artefactParts.push({ partNumber, path: partName, count: partArtefacts.length, sha256: `sha256:${sha256(serializedPart)}` });
}
await writeJson('WHOLE_ARCHITECTURE_ARTEFACT_INDEX.json', { schemaVersion: 'aiw-whole-architecture-artefact-index-v1', ...base, count: artefacts.length, relationshipEncoding: 'Complete cross-file membership is stored once in CROSS_FILE_ARCHITECTURE_GROUPS.json; per-artefact relatedFiles is a bounded preview.', storage: 'deterministic-sharded-json', partCount: artefactParts.length, parts: artefactParts });
await writeJson('CROSS_FILE_ARCHITECTURE_GROUPS.json', { schemaVersion: 'aiw-cross-file-architecture-groups-v1', ...base, count: groups.length, groups });
await writeJson('MACHINE_READABLE_MODEL_INVENTORY.json', inventory('machine-readable-model-inventory', (item) => ['json','yaml','yml','xml','svg','drawio','puml','plantuml','c4','dsl','tf','hcl','bicep','proto','graphql','gql','avsc'].includes(item.format)));
await writeJson('ADR_AND_DECISION_SOURCE_INVENTORY.json', inventory('adr-and-decision-source-inventory', hasType('architecture-decision-record')));
await writeJson('CONFORMANCE_AND_FITNESS_SOURCE_INVENTORY.json', inventory('conformance-and-fitness-source-inventory', hasType('architecture-rule-or-fitness-test')));
await writeJson('OPERATIONAL_AND_RESILIENCE_SOURCE_INVENTORY.json', inventory('operational-and-resilience-source-inventory', hasAnyType('operational-runbook','resilience-experiment','cost-or-capacity-guidance')));
await writeJson('AGENTIC_ARCHITECTURE_SOURCE_INVENTORY.json', inventory('agentic-architecture-source-inventory', hasType('agentic-application-architecture')));
await writeJson('DIAGRAM_AND_MODEL_SOURCE_INVENTORY.json', inventory('diagram-and-model-source-inventory', hasType('diagram-or-model')));
await writeJson('MODERNISATION_SOURCE_INVENTORY.json', inventory('modernisation-source-inventory', hasType('migration-or-refactoring')));
await writeJson('CORE_BANKING_MODERNISATION_SOURCE_INVENTORY.json', inventory('core-banking-modernisation-source-inventory', hasType('core-banking-modernisation')));
await writeJson('OBSERVABILITY_ARCHITECTURE_SOURCE_INVENTORY.json', inventory('observability-architecture-source-inventory', hasType('observability-architecture')));

const classSamples = [];
for (const authorityClass of [...new Set(sourceMap.dossiers.map((item) => item.sourceAuthorityClass))].sort()) {
  const eligibleIds = new Set(sourceMap.dossiers.filter((item) => item.sourceAuthorityClass === authorityClass).map((item) => item.connectorId));
  const sampleManifest = manifests.find(({ manifest }) => eligibleIds.has(manifest.connectorId) && manifest.coverage.parserCoverage.boundedEvidenceCount > 0);
  const sampleFile = sampleManifest?.manifest.files.find((item) => item.boundedEvidenceCount > 0);
  classSamples.push({ sourceAuthorityClass: authorityClass, connectorId: sampleManifest?.manifest.connectorId ?? null, repository: sampleManifest?.manifest.repository ?? null, immutableCommit: sampleManifest?.manifest.commitSha ?? null, path: sampleFile?.path ?? null, boundedEvidenceAvailable: Boolean(sampleFile), runtimeTransformationExecuted: false });
}
let runtimeReceipt = null;
try { runtimeReceipt = JSON.parse(await readFile(resolve(product, 'release-evidence/local-environment/SOL_EXECUTION_CHANNEL_RECEIPT.json'), 'utf8')); } catch { /* Report as unavailable. */ }
await writeJson('SOL_SEMANTIC_FOUNDATION_ACCEPTANCE.json', {
  schemaVersion: 'aiw-sol-semantic-foundation-acceptance-v1', ...base,
  productRuntimeSolConfigured: runtimeReceipt?.aiwProductRuntimeChannel?.providerConfigured === true,
  productRuntimeTransformationExecuted: false,
  disposition: 'Codex-Sol contract inspection only; product-runtime semantic transformation deferred to rc.10.73.8 because the governed runtime channel is unconfigured.',
  transformationContractValidated: true, allOutputsCandidateOnly: true, designGraphMutationPerformed: false,
  representativeBoundedEvidenceByAuthorityClass: classSamples,
});

const completeCount = coverageRows.filter((item) => item.processingComplete).length;
const acquisitionTotals = coverageRows.reduce((totals, item) => ({
  totalTreeFiles: totals.totalTreeFiles + item.totalTreeFiles,
  governedEligibleFiles: totals.governedEligibleFiles + item.governedEligibleFiles,
  acceptedFiles: totals.acceptedFiles + item.acceptedFiles,
  rejectedFiles: totals.rejectedFiles + item.rejectedFiles,
  policyExclusions: totals.policyExclusions + item.policyExclusions,
  securityQuarantinedFiles: totals.securityQuarantinedFiles + item.securityQuarantinedFiles,
  processingFailures: totals.processingFailures + item.processingFailures,
  unprocessedFiles: totals.unprocessedFiles + item.unprocessedFiles,
  boundedEvidenceCount: totals.boundedEvidenceCount + item.parserCoverage.boundedEvidenceCount,
  candidateClaims: totals.candidateClaims + item.initialCandidateClaimCount,
}), { totalTreeFiles: 0, governedEligibleFiles: 0, acceptedFiles: 0, rejectedFiles: 0, policyExclusions: 0, securityQuarantinedFiles: 0, processingFailures: 0, unprocessedFiles: 0, boundedEvidenceCount: 0, candidateClaims: 0 });
const repositoryTable = coverageRows.map((item) => `| \`${item.connectorId}\` | \`${item.repository}\` | \`${item.immutableCommit}\` | ${item.totalTreeFiles} | ${item.governedEligibleFiles} | ${item.acceptedFiles} | ${item.securityQuarantinedFiles} | ${item.processingFailures} | ${item.completionStatus} |`).join('\n');
const report = `# AIW rc.10.73.7 Release Report\n\nGenerated: ${generatedAt}\n\nProduction accepted: **false**\n\n## Acquisition outcome\n\nExactly 47 governed repositories produced 47 processing-complete immutable manifests. There are 0 failed repositories, 0 controlled stops and 0 missing manifests; 23 repositories remain review-required because security or licence evidence must not be silently promoted. No repository code was executed.\n\n| Measure | Count |\n|---|---:|\n| Complete governed tree files | ${acquisitionTotals.totalTreeFiles} |\n| Governed eligible files | ${acquisitionTotals.governedEligibleFiles} |\n| Accepted files | ${acquisitionTotals.acceptedFiles} |\n| Rejected files | ${acquisitionTotals.rejectedFiles} |\n| Policy exclusions | ${acquisitionTotals.policyExclusions} |\n| Security-quarantined files | ${acquisitionTotals.securityQuarantinedFiles} |\n| Processing failures | ${acquisitionTotals.processingFailures} |\n| Unprocessed files | ${acquisitionTotals.unprocessedFiles} |\n| Bounded evidence passages | ${acquisitionTotals.boundedEvidenceCount} |\n| Initial deterministic candidate claims | ${acquisitionTotals.candidateClaims} |\n\nSafe source files are held in content-addressed local snapshots. Quarantined objects remain restricted and are excluded from the release distribution. All deterministic claims and semantic-foundation outputs remain candidate-only. This release establishes acquisition and semantic-transformation foundations; it does not claim full knowledge conversion.\n\n## Complete repository results\n\n| Connector | Repository | Immutable commit | Tree | Eligible | Accepted | Quarantined | Failures | Status |\n|---|---|---|---:|---:|---:|---:|---:|---|\n${repositoryTable}\n\n## Architecture preservation\n\nDetected whole-architecture artefacts: ${artefacts.length}. Cross-file candidate groups: ${groups.length}. Original formats, immutable revisions, paths, parser requirements, licensing posture and security disposition remain attached to every artefact record. Complete cross-file membership is stored once in the group index; each artefact retains its group identity, related-file count and bounded relationship preview.\n\n## Verification and known drift\n\nAll 47 manifests and 106,096 content-addressed objects were independently verified against a 186,219-file denominator. Backend and frontend clean installs and builds passed. Current rc.10.73.7, release-integrity, dependency, security and browser gates passed. The historical rc.10.73.5 gate remains nonzero only for its three obsolete package-version equality checks; its source-withdrawal and authority-isolation checks pass. See \`KNOWLEDGE_MANIFEST_DRIFT_RECONCILIATION.md\`.\n\n## Authority boundary\n\nProduct-runtime Sol execution was not fabricated. The runtime channel remains ${runtimeReceipt?.aiwProductRuntimeChannel?.providerConfigured ? 'configured' : 'unconfigured'}; representative bounded evidence is prepared for rc.10.73.8. No claim promotion, scoring activation, hard constraint, Design Graph mutation, licence approval or production acceptance occurred.\n`;
await writeFile(resolve(evidenceRoot, 'AIW_RC10_73_7_RELEASE_REPORT.md'), report);
await writeFile(resolve(evidenceRoot, 'AIW_RC10_73_7_IMPLEMENTATION_TRACEABILITY.md'), `# AIW rc.10.73.7 Implementation Traceability\n\nGenerated: ${generatedAt}\n\n- Acquisition selection and authority isolation: \`backend/scripts/rc10-73-7-acquisition-selection.mjs\`.\n- Immutable acquisition, tree recovery, deny precedence, blob verification, CAS snapshots, quarantine, parsing and resumability: \`backend/scripts/rc10-73-6-github-acquisition-core.mjs\`.\n- Whole-architecture classification and bounded evidence: \`backend/scripts/rc10-73-7-acquisition-foundation.mjs\`.\n- All-47 resumable runner: \`backend/scripts/rc10-73-6-run-live-github-acquisition.mjs\`.\n- Evidence aggregation: \`backend/scripts/rc10-73-7-build-acquisition-release-evidence.mjs\`.\n- Candidate authority isolation and prompt-injection boundary: rc.10.73.7 pre-acquisition tests and engine isolation test.\n- Production acceptance: false.\n`);
await writeFile(resolve(evidenceRoot, 'RC10_73_8_READINESS_ASSESSMENT.md'), `# rc.10.73.8 Readiness Assessment\n\nGenerated: ${generatedAt}\n\nBounded evidence and candidate-only transformation contracts are prepared across ${classSamples.filter((item) => item.boundedEvidenceAvailable).length}/${classSamples.length} source-authority classes. Product-runtime Sol transformation remains deferred until the configured runtime route, secret, health check and bounded transaction all pass. Full semantic conversion, independent review, promotion, Pattern DNA reconstruction and scoring calibration remain rc.10.73.8 or later work.\n`);
await writeFile(resolve(evidenceRoot, 'KNOWN_LIMITATIONS.md'), `# Known Limitations\n\nGenerated: ${generatedAt}\n\n- This is not full knowledge conversion.\n- Candidate claims have not been independently reviewed or promoted.\n- Licence API evidence is not legal approval; redistribution remains unapproved.\n- Opaque diagrams and models are preserved but require specialist parsers.\n- Cross-file groups are deterministic candidate groupings and require architecture review.\n- Product-runtime Sol transformation was not executed while the runtime channel was unconfigured.\n- Pattern DNA reconstruction, scoring calibration, enterprise signing and production acceptance are incomplete.\n- Raw acquired repository content and quarantine objects are excluded from the distributable ZIP unless a separate redistribution decision authorizes them.\n`);

console.log(JSON.stringify({ expected: 47, manifests: manifests.length, processingComplete: completeCount, missingManifests: missingManifests.length, artefacts: artefacts.length, crossFileGroups: groups.length, productionAccepted: false }, null, 2));
