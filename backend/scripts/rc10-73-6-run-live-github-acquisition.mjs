import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquireRepository, DEFAULT_GITHUB_API_VERSION } from './rc10-73-6-github-acquisition-core.mjs';
import { selectAcquisitionDossiers } from './rc10-73-7-acquisition-selection.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const backend = resolve(here, '..');
const product = resolve(backend, '..');
const sourceMap = JSON.parse(await readFile(resolve(backend, 'data/rc10_55-global-architecture-intelligence-source-map.json'), 'utf8'));
const requestedIds = (process.env.AIW_REFRESH_CONNECTORS || '').split(',').map((value) => value.trim()).filter(Boolean);
const selected = selectAcquisitionDossiers(sourceMap.dossiers, requestedIds);
const acquisitionApproved = selectAcquisitionDossiers(sourceMap.dossiers);
const outputRoot = resolve(process.env.AIW_GITHUB_SNAPSHOT_ROOT || resolve(product, 'knowledge-repository', 'AKR-0.10.73.7', 'github-live'));
const summaryPath = resolve(process.env.AIW_GITHUB_ACQUISITION_SUMMARY || resolve(product, 'release-evidence', 'rc10.73.7', 'ALL_47_LIVE_ACQUISITION_SUMMARY.json'));
const token = process.env.AIW_GITHUB_TOKEN?.trim() || undefined;
const apiVersion = process.env.AIW_GITHUB_API_VERSION || DEFAULT_GITHUB_API_VERSION;
const concurrency = Math.max(1, Math.min(12, Number(process.env.AIW_GITHUB_FETCH_CONCURRENCY || 4)));
if (!token) throw new Error('AUTHENTICATED_GITHUB_ACQUISITION_REQUIRES_AIW_GITHUB_TOKEN');
let priorResults = [];
try { priorResults = JSON.parse(await readFile(summaryPath, 'utf8')).results ?? []; } catch { /* First execution has no summary. */ }
const resultsById = new Map(priorResults.map((item) => [item.connectorId, item]));

async function persistSummary(runStatus) {
  const results = [...resultsById.values()].sort((a, b) => a.connectorId.localeCompare(b.connectorId));
  const completed = results.filter((item) => ['complete', 'complete-review-required'].includes(item.status)).length;
  const failed = results.filter((item) => item.status === 'failed').length;
  const controlledStops = results.filter((item) => item.status === 'controlled-stop-retry-required').length;
  const summary = {
    schemaVersion: 'aiw-all-47-live-acquisition-summary-v2', releaseId: 'AIW v0.10.0-rc.10.73.7', generatedAt: new Date().toISOString(),
    apiVersion, authenticated: true, runStatus, selectedThisRun: selected.length, expectedGovernedRepositories: acquisitionApproved.length,
    completed, reviewRequired: results.filter((item) => item.status === 'complete-review-required').length, failed, controlledStops,
    allApprovedRepositoriesSelected: selected.length === acquisitionApproved.length,
    allExpectedResultsPresent: results.length === acquisitionApproved.length,
    completeAcquisitionFinished: results.length === acquisitionApproved.length && completed === acquisitionApproved.length && failed === 0,
    productionAccepted: false, results,
  };
  await mkdir(dirname(summaryPath), { recursive: true }); await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

for (const dossier of selected) {
  const prior = resultsById.get(dossier.connectorId);
  if (process.env.AIW_GITHUB_RESUME !== 'false' && prior && ['complete', 'complete-review-required'].includes(prior.status) && prior.snapshotId && prior.commitSha) continue;
  const startedAt = new Date().toISOString();
  let stopAfterCheckpoint = false;
  try {
    const manifest = await acquireRepository({ dossier, outputRoot, token, apiBase: process.env.AIW_GITHUB_API_BASE, apiVersion, concurrency, resume: process.env.AIW_GITHUB_RESUME !== 'false' });
    const status = manifest.coverage.processingComplete ? (manifest.coverage.reviewRequired ? 'complete-review-required' : 'complete') : 'failed';
    resultsById.set(dossier.connectorId, { connectorId: dossier.connectorId, repository: dossier.repository, status, commitSha: manifest.commitSha, snapshotId: manifest.snapshotId, snapshotChecksum: manifest.snapshotChecksum, manifestSha256: manifest.manifestSha256, coverage: manifest.coverage, architectureArtefactCount: manifest.architectureArtefacts.length, crossFileArchitectureGroupCount: manifest.crossFileArchitectureGroups.length, licenceDisposition: manifest.licenceEvidence.finalDisposition, candidateClaims: manifest.candidateClaims.total, startedAt, completedAt: new Date().toISOString() });
  } catch (error) {
    const detail = error instanceof Error ? error.stack ?? error.message : String(error);
    const controlledStop = /GITHUB_RATE_LIMIT_CONTROLLED_STOP/.test(detail);
    resultsById.set(dossier.connectorId, { connectorId: dossier.connectorId, repository: dossier.repository, status: controlledStop ? 'controlled-stop-retry-required' : 'failed', error: detail, startedAt, completedAt: new Date().toISOString() });
    stopAfterCheckpoint = controlledStop || process.env.AIW_GITHUB_FAIL_FAST === 'true';
  }
  await persistSummary('running-resumable');
  if (stopAfterCheckpoint) break;
}
const summary = await persistSummary('finished-or-controlled-stop');
console.log(JSON.stringify(summary, null, 2));
const selectedResults = selected.map((item) => resultsById.get(item.connectorId)).filter(Boolean);
if (selectedResults.some((item) => !['complete', 'complete-review-required'].includes(item.status)) || selectedResults.length !== selected.length) process.exitCode = 2;
