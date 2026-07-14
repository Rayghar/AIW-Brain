import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquireRepository, DEFAULT_GITHUB_API_VERSION } from './rc10-73-6-github-acquisition-core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const backend = resolve(here, '..');
const product = resolve(backend, '..');
const sourceMap = JSON.parse(await readFile(resolve(backend, 'data/rc10_55-global-architecture-intelligence-source-map.json'), 'utf8'));
const approved = sourceMap.dossiers.filter((item) => item.sourceAuthority?.lifecycleStatus === 'approved');
const requestedIds = (process.env.AIW_REFRESH_CONNECTORS || '').split(',').map((value) => value.trim()).filter(Boolean);
const selected = requestedIds.length ? approved.filter((item) => requestedIds.includes(item.connectorId)) : approved;
const outputRoot = resolve(process.env.AIW_GITHUB_SNAPSHOT_ROOT || resolve(product, 'knowledge-repository', 'AKR-0.10.73.6', 'github-live'));
const summaryPath = resolve(process.env.AIW_GITHUB_ACQUISITION_SUMMARY || resolve(product, 'release-evidence', 'rc10.73.6', 'LIVE_GITHUB_ACQUISITION_SUMMARY.json'));
const token = process.env.AIW_GITHUB_TOKEN?.trim() || undefined;
const apiVersion = process.env.AIW_GITHUB_API_VERSION || DEFAULT_GITHUB_API_VERSION;
const concurrency = Math.max(1, Math.min(12, Number(process.env.AIW_GITHUB_FETCH_CONCURRENCY || 4)));
const results = [];

for (const dossier of selected) {
  const startedAt = new Date().toISOString();
  try {
    const manifest = await acquireRepository({ dossier, outputRoot, token, apiBase: process.env.AIW_GITHUB_API_BASE, apiVersion, concurrency, resume: process.env.AIW_GITHUB_RESUME !== 'false' });
    results.push({ connectorId: dossier.connectorId, repository: dossier.repository, status: manifest.coverage.complete ? 'complete' : 'review-required', commitSha: manifest.commitSha, snapshotId: manifest.snapshotId, coverage: manifest.coverage, licenceDisposition: manifest.licenceEvidence.finalDisposition, candidateClaims: manifest.candidateClaims.total, startedAt, completedAt: new Date().toISOString() });
  } catch (error) {
    results.push({ connectorId: dossier.connectorId, repository: dossier.repository, status: 'failed', error: error instanceof Error ? error.stack ?? error.message : String(error), startedAt, completedAt: new Date().toISOString() });
    if (process.env.AIW_GITHUB_FAIL_FAST === 'true') break;
  }
}
const completed = results.filter((item) => item.status === 'complete').length;
const failed = results.filter((item) => item.status === 'failed').length;
const summary = {
  schemaVersion: 'aiw-github-acquisition-summary-v1', generatedAt: new Date().toISOString(), apiVersion, authenticated: Boolean(token), requested: selected.length,
  completed, reviewRequired: results.filter((item) => item.status === 'review-required').length, failed,
  allApprovedRepositoriesSelected: selected.length === approved.length,
  productionAccepted: completed === approved.length && failed === 0 && results.every((item) => item.licenceDisposition === 'technically-verified-pending-release-approval'),
  results,
};
await mkdir(dirname(summaryPath), { recursive: true }); await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
if (failed || completed !== selected.length) process.exitCode = 2;
