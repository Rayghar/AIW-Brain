import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyAcquisitionManifest } from './rc10-73-6-github-acquisition-core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const backend = resolve(here, '..');
const product = resolve(backend, '..');
const evidenceRoot = resolve(product, 'release-evidence/rc10.73.7');
const snapshotRoot = resolve(product, 'knowledge-repository/AKR-0.10.73.7/github-live');
const summary = JSON.parse(await readFile(resolve(evidenceRoot, 'ALL_47_LIVE_ACQUISITION_SUMMARY.json'), 'utf8'));
const results = [];
const outputArgumentIndex = process.argv.indexOf('--output');
const outputPath = outputArgumentIndex >= 0
  ? resolve(product, process.argv[outputArgumentIndex + 1])
  : resolve(evidenceRoot, 'SNAPSHOT_AND_MANIFEST_VERIFICATION.json');

for (const item of [...summary.results].sort((a, b) => a.connectorId.localeCompare(b.connectorId))) {
  const manifestPath = resolve(snapshotRoot, 'snapshots', item.connectorId, item.snapshotId, 'manifest.json');
  try {
    const verification = await verifyAcquisitionManifest(manifestPath);
    results.push({
      connectorId: item.connectorId,
      repository: item.repository,
      immutableCommit: item.commitSha,
      snapshotId: item.snapshotId,
      manifestPath: manifestPath.slice(product.length + 1).replaceAll('\\', '/'),
      ...verification,
    });
  } catch (error) {
    results.push({
      connectorId: item.connectorId,
      repository: item.repository,
      immutableCommit: item.commitSha,
      snapshotId: item.snapshotId,
      passed: false,
      checked: 0,
      denominator: item.coverage?.totalTreeFiles ?? null,
      failures: [{ path: 'manifest.json', code: 'VERIFICATION_EXCEPTION', detail: error instanceof Error ? error.message : String(error) }],
    });
  }
}

const receipt = {
  schemaVersion: 'aiw-snapshot-and-manifest-verification-v1',
  releaseId: 'AIW v0.10.0-rc.10.73.7',
  generatedAt: new Date().toISOString(),
  expectedRepositories: 47,
  verifiedRepositories: results.filter((item) => item.passed).length,
  failedRepositories: results.filter((item) => !item.passed).length,
  verifiedContentAddressedObjects: results.reduce((sum, item) => sum + item.checked, 0),
  denominatorFiles: results.reduce((sum, item) => sum + (item.denominator ?? 0), 0),
  productionAccepted: false,
  passed: results.length === 47 && results.every((item) => item.passed),
  results,
};

await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ passed: receipt.passed, expectedRepositories: 47, verifiedRepositories: receipt.verifiedRepositories, failedRepositories: receipt.failedRepositories, verifiedContentAddressedObjects: receipt.verifiedContentAddressedObjects, denominatorFiles: receipt.denominatorFiles, productionAccepted: false }, null, 2));
if (!receipt.passed) process.exitCode = 1;
