import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, statfs, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateStorageCapacity } from './rc10-73-8-storage-capacity-gate.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = resolve(dirname(SCRIPT_PATH), '../..');
const PARENT_EVIDENCE_ROOT = resolve(REPOSITORY_ROOT, 'release-evidence/rc10.73.7');
const OUTPUT_ROOT = resolve(REPOSITORY_ROOT, 'release-evidence/rc10.73.8');
const BRANCH_START_SHA = '70c6b6677d2fc9732570b9012964da7d1c5b914e';
const SOURCE_RELEASE_SHA = '50d2d93f646f8648d6a81d5467448f95272ba9af';
const PARENT_TAG = 'v0.10.0-rc.10.73.7';
const CURRENT_BRANCH = 'codex/rc-10-73-8-architecture-cognition';
const EXPECTED_REPOSITORIES = 47;
const PROJECTED_TEMPORARY_BYTES = 536_870_912;
const PROJECTED_PERMANENT_BYTES = 268_435_456;

const INPUTS = {
  governance: 'ALL_47_REPOSITORY_GOVERNANCE_MATRIX.json',
  acquisition: 'ALL_47_LIVE_ACQUISITION_SUMMARY.json',
  coverage: 'REPOSITORY_COVERAGE_MATRIX.json',
  manifests: 'CONTENT_SNAPSHOT_MANIFEST_INDEX.json',
  artefacts: 'WHOLE_ARCHITECTURE_ARTEFACT_INDEX.json',
  quarantine: 'QUARANTINE_AND_SECURITY_REPORT.json',
  licences: 'LICENCE_EVIDENCE_REGISTER.json',
  review: 'FAILED_AND_REVIEW_REQUIRED_REPOSITORIES.json',
  semanticFoundation: 'SOL_SEMANTIC_FOUNDATION_ACCEPTANCE.json',
  entryGate: 'RC10_73_8_ENTRY_GATE.json',
};

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function countBy(items, field) {
  return Object.fromEntries(
    [...new Set(items.map((item) => String(item[field])))]
      .sort()
      .map((value) => [value, items.filter((item) => String(item[field]) === value).length]),
  );
}

function sum(items, selector) {
  return items.reduce((total, item) => total + (Number(selector(item)) || 0), 0);
}

function requireCondition(condition, code) {
  if (!condition) throw new Error(code);
}

async function loadInputs() {
  const values = {};
  const fingerprints = [];
  for (const [key, filename] of Object.entries(INPUTS)) {
    const path = resolve(PARENT_EVIDENCE_ROOT, filename);
    const raw = await readFile(path, 'utf8');
    values[key] = JSON.parse(raw);
    fingerprints.push({
      key,
      path: `release-evidence/rc10.73.7/${filename}`,
      bytes: Buffer.byteLength(raw),
      sha256: sha256(raw),
    });
  }
  return { values, fingerprints };
}

function validateLineage() {
  const branch = execFileSync('git', ['branch', '--show-current'], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
  }).trim();
  const head = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
  }).trim();
  const branchStart = execFileSync('git', ['rev-parse', CURRENT_BRANCH], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
  }).trim();
  execFileSync('git', ['merge-base', '--is-ancestor', BRANCH_START_SHA, 'HEAD'], {
    cwd: REPOSITORY_ROOT,
    stdio: 'ignore',
  });
  requireCondition(branch === CURRENT_BRANCH, 'GATE_6A_WRONG_BRANCH');
  requireCondition(branchStart === BRANCH_START_SHA, 'RC10_73_8_BRANCH_POINTER_MOVED');
  requireCondition(head === BRANCH_START_SHA, 'GATE_6A_MUST_START_FROM_ATTESTATION_COMMIT');
  return { branch, head, branchStart, ancestryExitCode: 0 };
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main() {
  const generatedAt = new Date().toISOString();
  const lineage = validateLineage();
  const { values, fingerprints } = await loadInputs();
  const disk = await statfs(REPOSITORY_ROOT, { bigint: true });
  const capacity = {
    ...evaluateStorageCapacity({
      stage: 'gate-6a-corpus-analysis-and-workload-planning',
      freeBytesBefore: Number(disk.bavail * disk.bsize),
      projectedTemporaryBytes: PROJECTED_TEMPORARY_BYTES,
      projectedPermanentBytes: PROJECTED_PERMANENT_BYTES,
    }),
    observedAt: generatedAt,
    observedPath: REPOSITORY_ROOT,
  };
  requireCondition(capacity.decision === 'proceed', 'GATE_6A_STORAGE_CONTROLLED_STOP');

  const repositories = values.governance.repositories;
  const results = values.acquisition.results;
  const coverage = values.coverage.repositories;
  const manifests = values.manifests.manifests;

  requireCondition(repositories.length === EXPECTED_REPOSITORIES, 'GOVERNANCE_COUNT_NOT_47');
  requireCondition(results.length === EXPECTED_REPOSITORIES, 'ACQUISITION_COUNT_NOT_47');
  requireCondition(coverage.length === EXPECTED_REPOSITORIES, 'COVERAGE_COUNT_NOT_47');
  requireCondition(manifests.length === EXPECTED_REPOSITORIES, 'MANIFEST_COUNT_NOT_47');
  requireCondition(values.acquisition.completed === EXPECTED_REPOSITORIES, 'ACQUISITION_NOT_47_COMPLETE');
  requireCondition(values.acquisition.failed === 0, 'ACQUISITION_FAILURES_PRESENT');
  requireCondition(values.coverage.missingManifests.length === 0, 'MISSING_MANIFESTS_PRESENT');
  requireCondition(manifests.every((manifest) => manifest.denominatorPreserved === true), 'DENOMINATOR_NOT_PRESERVED');
  requireCondition(repositories.every((repository) => repository.acquisitionStatus === 'approved'), 'ACQUISITION_NOT_APPROVED');
  requireCondition(repositories.every((repository) => repository.knowledgePromotionStatus === 'candidate-only-pending-independent-review'), 'NON_CANDIDATE_AUTHORITY_PRESENT');
  requireCondition(values.semanticFoundation.productRuntimeTransformationExecuted === false, 'UNEXPECTED_RUNTIME_TRANSFORMATION');

  const parserTotals = {
    parsedFiles: sum(coverage, (item) => item.parserCoverage.parsedFiles),
    preservedAwaitingSpecialistParser: sum(coverage, (item) => item.parserCoverage.preservedAwaitingSpecialistParser),
    boundedEvidenceCount: sum(coverage, (item) => item.parserCoverage.boundedEvidenceCount),
  };
  const fileTotals = {
    totalTreeFiles: sum(coverage, (item) => item.totalTreeFiles),
    governedEligibleFiles: sum(coverage, (item) => item.governedEligibleFiles),
    acceptedFiles: sum(coverage, (item) => item.acceptedFiles),
    rejectedFiles: sum(coverage, (item) => item.rejectedFiles),
    policyExclusions: sum(coverage, (item) => item.policyExclusions),
    securityQuarantinedFiles: sum(coverage, (item) => item.securityQuarantinedFiles),
    processingFailures: sum(coverage, (item) => item.processingFailures),
    unprocessedFiles: sum(coverage, (item) => item.unprocessedFiles),
    oversizedFiles: sum(coverage, (item) => item.oversizedFiles),
  };
  const candidateClaims = sum(coverage, (item) => item.initialCandidateClaimCount);
  const architectureArtefacts = sum(results, (item) => item.architectureArtefactCount);
  const crossFileArchitectureGroups = sum(results, (item) => item.crossFileArchitectureGroupCount);
  const authorityClasses = countBy(repositories, 'sourceAuthorityClass');
  const previousLifecycleStatuses = countBy(repositories, 'previousLifecycleStatus');
  const completionStatuses = countBy(coverage, 'completionStatus');
  const authorityClassCount = Object.keys(authorityClasses).length;
  const pilotTransformations = authorityClassCount * 2;
  const estimatedPilotTokens = {
    transformations: pilotTransformations,
    lowerBound: pilotTransformations * (1_250 + 200),
    upperBound: pilotTransformations * (1_800 + 500),
    assumptions: {
      inputTokensPerTransformation: { lowerBound: 1_250, upperBound: 1_800 },
      outputTokensPerTransformation: { lowerBound: 200, upperBound: 500 },
    },
  };
  const preliminaryGate6CTokens = {
    transformations: parserTotals.boundedEvidenceCount,
    lowerBound: parserTotals.boundedEvidenceCount * (1_250 + 200),
    upperBound: parserTotals.boundedEvidenceCount * (1_800 + 500),
    status: 'preliminary-planning-estimate-only',
    refreshRequiredBeforeExecution: true,
  };
  const preliminaryGate6COutputBytes = {
    candidateClaimCountBasis: candidateClaims,
    lowerBound: candidateClaims * 2_048,
    upperBound: candidateClaims * 8_192,
    status: 'preliminary-uncompressed-planning-estimate-only',
    refreshRequiredBeforeExecution: true,
  };

  const lineageReceipt = {
    schemaVersion: 'aiw-rc10-73-8-initial-release-lineage-v1',
    generatedAt,
    parentRelease: 'AIW v0.10.0-rc.10.73.7',
    parentTag: PARENT_TAG,
    parentAttestationCommit: BRANCH_START_SHA,
    sourceReleaseCommit: SOURCE_RELEASE_SHA,
    currentBranch: lineage.branch,
    branchStartSha: lineage.branchStart,
    observedHead: lineage.head,
    ancestryCheckExitCode: lineage.ancestryExitCode,
    carriedForward: {
      schemas: 31,
      migrations: 42,
      tests: 194,
      knownLimitationsPaths: 12,
    },
    backupCompleted: false,
    backupStatus: 'deferred-by-product-owner',
    gate6CStatus: 'blocked',
    productionAccepted: false,
  };

  const corpusAnalysis = {
    schemaVersion: 'aiw-prompt-6-gate-6a-corpus-analysis-v1',
    generatedAt,
    releaseLine: 'AIW v0.10.0-rc.10.73.8',
    stage: 'Gate 6A corpus analysis and workload planning',
    status: 'completed',
    inputs: fingerprints,
    inputAccessBoundary: {
      accessMode: 'explicit-compact-release-evidence-files-only',
      recursiveFilesystemScans: 0,
      rawVaultObjectsRead: 0,
      repositoryPayloadFilesRead: 0,
      quarantineObjectsRead: 0,
      networkRequests: 0,
      modelCalls: 0,
      repositoryCodeExecutions: 0,
    },
    corpus: {
      governedRepositories: repositories.length,
      completedRepositories: values.acquisition.completed,
      reviewRequiredRepositories: values.acquisition.reviewRequired,
      failedRepositories: values.acquisition.failed,
      authorityClasses,
      previousLifecycleStatuses,
      completionStatuses,
      fileTotals,
      parserTotals,
      architectureArtefacts,
      crossFileArchitectureGroups,
      initialCandidateClaims: candidateClaims,
      verifiedManifests: manifests.length,
      denominatorPreserved: manifests.every((manifest) => manifest.denominatorPreserved === true),
      quarantinedFiles: values.quarantine.quarantinedFileCount,
      instructionShapedFiles: values.quarantine.instructionShapedFileCount,
      repositoriesWithReviewRequirements: values.review.count,
      licenceRepositories: values.licences.count,
      legalApprovalGranted: values.licences.legalApprovalGranted,
      redistributionApproved: values.licences.redistributionApproved,
      knowledgeAuthority: 'candidate',
    },
    gates: {
      gate6A: 'completed',
      gate6B: 'not-started-requires-explicit-product-owner-approval',
      gate6C: 'blocked',
    },
    productionAccepted: false,
  };

  const gateResults = {
    schemaVersion: 'aiw-prompt-6-gate-6a-results-v1',
    generatedAt,
    stage: 'gate-6a-corpus-analysis-and-workload-planning',
    decision: 'pass-with-downstream-gates-closed',
    checks: [
      { id: 'lineage', passed: true, detail: `branch starts at ${BRANCH_START_SHA}` },
      { id: 'storage-capacity', passed: true, detail: `${capacity.projectedFreeBytesAtPeak} bytes projected free at peak` },
      { id: 'governed-corpus', passed: true, detail: '47 governed repositories reconciled' },
      { id: 'manifest-denominator', passed: true, detail: '47 manifests verified and denominators preserved' },
      { id: 'candidate-authority', passed: true, detail: 'all semantic outputs remain candidate-only' },
      { id: 'raw-vault-boundary', passed: true, detail: 'zero raw-vault reads and zero recursive filesystem scans' },
      { id: 'semantic-execution', passed: true, detail: 'zero model calls; no semantic transformation executed' },
      { id: 'gate-6b-boundary', passed: true, detail: 'Gate 6B not started' },
      { id: 'gate-6c-boundary', passed: true, detail: 'Gate 6C remains blocked' },
    ],
    capacityReceipt: 'release-evidence/rc10.73.8/PROMPT_6_GATE_6A_STORAGE_CAPACITY_RECEIPT.json',
    corpusAnalysis: 'release-evidence/rc10.73.8/PROMPT_6_GATE_6A_CORPUS_ANALYSIS.json',
    workloadPlan: 'release-evidence/rc10.73.8/PROMPT_6_GATE_6A_WORKLOAD_PLAN.md',
    backupCompleted: false,
    backupStatus: 'deferred-by-product-owner',
    productionAccepted: false,
  };

  const workloadPlan = `# Prompt 6 Gate 6A corpus analysis and workload plan

Generated: ${generatedAt}
Release line: AIW v0.10.0-rc.10.73.8
Disposition: **Gate 6A completed; Gate 6B not started; Gate 6C blocked**

## Execution boundary

This run read only the ten compact rc.10.73.7 release-evidence files fingerprinted in the machine-readable corpus analysis. It performed zero recursive filesystem scans, zero raw-vault object reads, zero network requests, zero model calls and zero semantic transformations. Repository content was not executed. All carried knowledge remains candidate-only and productionAccepted remains false.

## Reconciled corpus

| Measure | Count |
|---|---:|
| Governed repositories | ${repositories.length} |
| Completed repositories | ${values.acquisition.completed} |
| Review-required repositories | ${values.acquisition.reviewRequired} |
| Verified manifests | ${manifests.length} |
| Total tree files | ${fileTotals.totalTreeFiles} |
| Governed eligible files | ${fileTotals.governedEligibleFiles} |
| Accepted files | ${fileTotals.acceptedFiles} |
| Quarantined files | ${fileTotals.securityQuarantinedFiles} |
| Parsed files | ${parserTotals.parsedFiles} |
| Awaiting specialist parser | ${parserTotals.preservedAwaitingSpecialistParser} |
| Bounded evidence passages | ${parserTotals.boundedEvidenceCount} |
| Initial candidate claims | ${candidateClaims} |
| Whole-architecture artefacts | ${architectureArtefacts} |
| Cross-file architecture groups | ${crossFileArchitectureGroups} |

The five differentiated source-authority classes remain intact: ${Object.entries(authorityClasses).map(([name, count]) => `${name} (${count})`).join(', ')}.

## Gate 6B representative-pilot proposal

Gate 6B is not approved or executed by this plan. The proposed pilot is ten transformations: two bounded evidence passages from each of the five source-authority classes. Selection should cover one normal and, where available, one review-sensitive passage per class; preserve immutable provenance; include instruction-shaped evidence as inert data; and emit strict-schema candidate proposals only.

The preliminary pilot workload is ${estimatedPilotTokens.lowerBound.toLocaleString('en-US')} to ${estimatedPilotTokens.upperBound.toLocaleString('en-US')} combined input/output tokens across ${estimatedPilotTokens.transformations} transformations. Before Gate 6B, rerun the storage-capacity gate, resolve the actual configured runtime model, freeze the sample manifest and prompt/schema versions, and obtain explicit product-owner approval.

## Gate 6C planning boundary

Gate 6C remains blocked. A deliberately conservative first-pass estimate treats each of the ${parserTotals.boundedEvidenceCount.toLocaleString('en-US')} bounded evidence passages as one potential transformation. That implies approximately ${preliminaryGate6CTokens.lowerBound.toLocaleString('en-US')} to ${preliminaryGate6CTokens.upperBound.toLocaleString('en-US')} combined tokens before batching, deduplication or review-driven elimination. Candidate output storage based on ${candidateClaims.toLocaleString('en-US')} initial claims is approximately ${preliminaryGate6COutputBytes.lowerBound.toLocaleString('en-US')} to ${preliminaryGate6COutputBytes.upperBound.toLocaleString('en-US')} uncompressed bytes.

These are planning bounds, not authorization or a quotation. Before Gate 6C, AIW requires a new capacity assessment, a frozen projected output size, a projected token count and model workload based on the approved transformation schema, and explicit product-owner approval. The deferred independent vault backup remains a visible risk and is not a passed gate.
`;

  await mkdir(OUTPUT_ROOT, { recursive: true });
  await writeJson(resolve(OUTPUT_ROOT, 'RC10_73_8_INITIAL_RELEASE_LINEAGE_RECEIPT.json'), lineageReceipt);
  await writeJson(resolve(OUTPUT_ROOT, 'PROMPT_6_GATE_6A_STORAGE_CAPACITY_RECEIPT.json'), capacity);
  await writeJson(resolve(OUTPUT_ROOT, 'PROMPT_6_GATE_6A_CORPUS_ANALYSIS.json'), corpusAnalysis);
  await writeFile(resolve(OUTPUT_ROOT, 'PROMPT_6_GATE_6A_WORKLOAD_PLAN.md'), workloadPlan, 'utf8');
  await writeJson(resolve(OUTPUT_ROOT, 'PROMPT_6_GATE_6A_RESULTS.json'), gateResults);
  process.stdout.write(`${JSON.stringify(gateResults, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
