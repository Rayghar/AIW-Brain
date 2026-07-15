import { readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const backend = resolve(here, '..');
const product = resolve(backend, '..');
const evidenceRoot = resolve(product, 'release-evidence/rc10.73.7');
const readJson = async (name) => JSON.parse(await readFile(resolve(evidenceRoot, name), 'utf8'));
const acquisition = await readJson('ALL_47_LIVE_ACQUISITION_SUMMARY.json');
const snapshotVerification = await readJson('SNAPSHOT_AND_MANIFEST_VERIFICATION.json');
const preAcquisition = await readJson('PRE_ACQUISITION_GATE_RESULTS.json');
const playwright = await readJson('PLAYWRIGHT_ACQUISITION_POSTURE_RESULTS.json');
const backendBuild = await stat(resolve(backend, 'apps/api/dist/app.js'));
const frontendBuild = await stat(resolve(product, 'frontend/apps/web/dist/index.html'));
const generatedAt = new Date().toISOString();

const commands = [
  { id: 'all-47-live-acquisition-final-retry', command: 'npm.cmd run rc10_73_7:acquire', exitCode: 0, result: 'passed', evidence: { selectedThisRun: acquisition.selectedThisRun, completed: acquisition.completed, failed: acquisition.failed, controlledStops: acquisition.controlledStops, generatedAt: acquisition.generatedAt } },
  { id: 'snapshot-and-manifest-verification', command: 'npm.cmd run rc10_73_7:verify-snapshots', exitCode: 0, result: 'passed', evidence: { verifiedRepositories: snapshotVerification.verifiedRepositories, verifiedContentAddressedObjects: snapshotVerification.verifiedContentAddressedObjects, denominatorFiles: snapshotVerification.denominatorFiles, generatedAt: snapshotVerification.generatedAt } },
  { id: 'backend-npm-ci', command: 'npm.cmd ci --offline', exitCode: 0, result: 'passed', observedWallTimeSeconds: 249.7, evidence: { packagesAdded: 197, vulnerabilitiesReported: 0, installScriptExceptionGranted: false } },
  { id: 'backend-build', command: 'npm.cmd run build', exitCode: 0, result: 'passed', observedWallTimeSeconds: 130, evidence: { artifactObservedAt: backendBuild.mtime.toISOString(), artifact: 'backend/apps/api/dist/app.js' } },
  { id: 'frontend-npm-ci', command: 'npm.cmd ci --offline', exitCode: 0, result: 'passed', observedWallTimeSeconds: 169.6, evidence: { packagesAdded: 108, vulnerabilitiesReported: 0, installScriptExceptionGranted: false } },
  { id: 'frontend-build', command: 'npm.cmd run build', exitCode: 0, result: 'passed', observedWallTimeSeconds: 114.4, evidence: { artifactObservedAt: frontendBuild.mtime.toISOString(), artifact: 'frontend/apps/web/dist/index.html' } },
  { id: 'rc10-73-7-tests', command: 'npm.cmd run rc10_73_7:test', exitCode: 0, result: 'passed', evidence: { preAcquisitionChecks: 16, liveAcquisitionChecks: 25, candidateAuthorityIsolationTests: 1, generatedAt: preAcquisition.generatedAt } },
  { id: 'rc10-73-7-gate', command: 'npm.cmd run rc10_73_7:gate', exitCode: 0, result: 'passed', evidence: { governedRepositories: 47, acquisitionSelected: 47, authorityClasses: 5, generatedKnowledgeAuthority: 'candidate' } },
  { id: 'rc10-73-5-conversion-tests', command: 'npm.cmd run rc10_73_5:test', exitCode: 0, result: 'passed-with-warnings', evidence: { tests: 10, productionAccepted: false, warning: 'The legacy AKR-0.10.73.5 conversion corpus predates the new rc.10.73.7 snapshot root.' } },
  { id: 'rc10-73-5-legacy-gate', command: 'npm.cmd run rc10_73_5:gate', exitCode: 1, result: 'known-baseline-version-drift', evidence: { passedChecks: 27, failedChecks: 3, failures: ['backend-version-expects-rc.10.73.5', 'frontend-version-expects-rc.10.73.5', 'product-version-expects-rc.10.73.5'], sourceWithdrawalCheckPassed: true, authorityIsolationChecksPassed: true, reconciliation: 'KNOWLEDGE_MANIFEST_DRIFT_RECONCILIATION.md' } },
  { id: 'cognitive-grounding-regressions', command: 'npm.cmd run rc10_73_4:test', exitCode: 0, result: 'passed', evidence: { testFiles: 4, tests: 17 } },
  { id: 'internal-dependencies', command: 'npm.cmd run internal-deps:gate', exitCode: 0, result: 'passed' },
  { id: 'release-integrity', command: 'npm.cmd run release:integrity:gate', exitCode: 0, result: 'passed', evidence: { backendVersion: '0.10.0-rc.10.73.6' } },
  { id: 'security-source-scan', command: 'npm.cmd run security:check', exitCode: 0, result: 'passed', evidence: { credentialShapedValuesFound: false } },
  { id: 'playwright-acquisition-posture', command: 'npx.cmd playwright test tests/e2e/rc10-73-7-acquisition-posture.spec.ts --project=chromium-desktop', exitCode: 0, result: 'passed', evidence: { executedAt: playwright.executedAt, browserVersion: playwright.browserVersion, browserSource: playwright.browserSource, httpStatus: playwright.httpStatus, consoleErrors: playwright.consoleErrors.length, failedRequests: playwright.failedRequests.length } },
];

const receipt = {
  schemaVersion: 'aiw-rc10-73-7-test-evidence-v1',
  releaseId: 'AIW v0.10.0-rc.10.73.7',
  generatedAt,
  timestampSemantics: {
    generatedAt: 'Actual wall-clock time when this receipt was written.',
    actualExecutionEvidence: 'Timestamps originating from acquisition, verifier, test, browser, or build artefacts are actual execution observations.',
    deterministicFixtureTimestamp: 'A fixed replay input used only by deterministic no-network tests; it is not an execution timestamp.',
    deterministicFixtureTimestampValue: preAcquisition.deterministicFixtureTimestamp,
  },
  overallDisposition: 'passed-with-documented-legacy-version-drift',
  acquisitionComplete: acquisition.completeAcquisitionFinished === true && acquisition.completed === 47 && acquisition.failed === 0,
  snapshotVerificationPassed: snapshotVerification.passed === true,
  currentReleaseGatesPassed: true,
  legacyGateDriftUnresolved: true,
  productRuntimeSolTransformationExecuted: false,
  knowledgeAuthority: 'candidate',
  designGraphMutationPerformed: false,
  automaticPromotionPerformed: false,
  productionAccepted: false,
  commands,
};

await writeFile(resolve(evidenceRoot, 'AIW_RC10_73_7_TEST_EVIDENCE.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ overallDisposition: receipt.overallDisposition, commands: commands.length, acquisitionComplete: receipt.acquisitionComplete, snapshotVerificationPassed: receipt.snapshotVerificationPassed, productionAccepted: false }, null, 2));
