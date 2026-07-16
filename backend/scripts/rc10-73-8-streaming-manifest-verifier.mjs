import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat, statfs, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { getHeapStatistics } from 'node:v8';
import { fileURLToPath } from 'node:url';

import { gitBlobSha } from './rc10-73-6-github-acquisition-core.mjs';
import { stableStringify } from './rc10-73-7-acquisition-foundation.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(scriptPath), '../..');
const evidenceRoot = resolve(repositoryRoot, 'release-evidence/rc10.73.8');
const outputArgumentIndex = process.argv.indexOf('--output');
const outputPath = outputArgumentIndex >= 0
  ? resolve(repositoryRoot, process.argv[outputArgumentIndex + 1])
  : resolve(evidenceRoot, 'STREAMING_SNAPSHOT_AND_MANIFEST_VERIFICATION.json');
if (outputArgumentIndex >= 0 && !process.argv[outputArgumentIndex + 1]) throw new Error('OUTPUT_PATH_REQUIRED');
const index = JSON.parse(await readFile(resolve(repositoryRoot, 'release-evidence/rc10.73.7/CONTENT_SNAPSHOT_MANIFEST_INDEX.json'), 'utf8'));
const priorReceiptPath = resolve(evidenceRoot, 'SNAPSHOT_AND_MANIFEST_VERIFICATION.json');
const priorReceiptRaw = await readFile(priorReceiptPath, 'utf8');
const priorReceipt = JSON.parse(priorReceiptRaw);
const generatedAt = new Date().toISOString();
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const prefixedSha256 = (value) => `sha256:${sha256(value)}`;

function updatePeak(peak) {
  const memory = process.memoryUsage();
  peak.heapUsedBytes = Math.max(peak.heapUsedBytes, memory.heapUsed);
  peak.residentSetBytes = Math.max(peak.residentSetBytes, memory.rss);
  peak.externalBytes = Math.max(peak.externalBytes, memory.external);
}

async function freeBytes() {
  const disk = await statfs(repositoryRoot, { bigint: true });
  return Number(disk.bavail * disk.bsize);
}

async function rawFingerprintAndTail(path) {
  const hash = createHash('sha256');
  let tail = '';
  for await (const chunk of createReadStream(path, { highWaterMark: 1024 * 1024 })) {
    hash.update(chunk);
    tail = `${tail}${chunk.toString('utf8')}`.slice(-4096);
  }
  return { rawSha256: `sha256:${hash.digest('hex')}`, tail };
}

async function* streamManifestFiles(manifestPath) {
  let search = '';
  let arrayStarted = false;
  let current = '';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for await (const chunk of createReadStream(manifestPath, { encoding: 'utf8', highWaterMark: 1024 * 1024 })) {
    let text = `${search}${chunk}`;
    let start = 0;
    search = '';
    if (!arrayStarted) {
      const keyIndex = text.indexOf('"files"');
      if (keyIndex < 0) { search = text.slice(-32); continue; }
      const bracketIndex = text.indexOf('[', keyIndex + 7);
      if (bracketIndex < 0) { search = text.slice(keyIndex); continue; }
      arrayStarted = true;
      start = bracketIndex + 1;
    }
    for (let indexInChunk = start; indexInChunk < text.length; indexInChunk += 1) {
      const character = text[indexInChunk];
      if (depth === 0) {
        if (character === ']') return;
        if (character !== '{') continue;
        current = '{'; depth = 1; inString = false; escaped = false; continue;
      }
      current += character;
      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') { inString = true; continue; }
      if (character === '{' || character === '[') depth += 1;
      else if (character === '}' || character === ']') depth -= 1;
      if (depth === 0) { yield JSON.parse(current); current = ''; }
    }
  }
  throw new Error(`FILES_ARRAY_NOT_TERMINATED:${manifestPath}`);
}

async function verifyObject(manifestDirectory, file) {
  if (!['accepted', 'accepted-opaque', 'quarantined'].includes(file.status)) return null;
  const objectPath = resolve(manifestDirectory, ...String(file.contentAddressedObject).split('/'));
  const content = await readFile(objectPath);
  const failures = [];
  if (prefixedSha256(content) !== file.contentSha256) failures.push({ path: file.path, code: 'CONTENT_SHA256_MISMATCH' });
  if (gitBlobSha(content) !== file.sha) failures.push({ path: file.path, code: 'GIT_BLOB_SHA_MISMATCH' });
  return failures;
}

async function verifyConnector(item, priorGeneratedAt, peak) {
  const started = performance.now();
  const manifestPath = resolve(repositoryRoot, item.manifestPath);
  const manifestStats = await stat(manifestPath);
  const largeManifest = manifestStats.size >= 64 * 1024 * 1024;
  const concurrency = largeManifest ? 1 : 4;
  const { rawSha256, tail } = await rawFingerprintAndTail(manifestPath);
  const embeddedManifestChecksum = tail.match(/"manifestSha256"\s*:\s*"([^"]+)"/)?.[1] ?? null;
  const failures = [];
  if (embeddedManifestChecksum !== item.manifestChecksum) failures.push({ path: 'manifest.json', code: 'EMBEDDED_MANIFEST_CHECKSUM_MISMATCH' });
  if (manifestStats.mtime.toISOString() > priorGeneratedAt) failures.push({ path: 'manifest.json', code: 'MANIFEST_MODIFIED_AFTER_CANONICAL_VERIFICATION' });
  const snapshotHash = createHash('sha256');
  snapshotHash.update('[');
  let first = true;
  let denominator = 0;
  let checked = 0;
  const statuses = {};
  const pending = [];
  for await (const file of streamManifestFiles(manifestPath)) {
    const projection = { path: file.path, sha: file.sha, status: file.status, contentSha256: file.contentSha256 ?? null };
    snapshotHash.update(`${first ? '' : ','}${stableStringify(projection)}`);
    first = false; denominator += 1; statuses[file.status] = (statuses[file.status] ?? 0) + 1;
    if (['accepted', 'accepted-opaque', 'quarantined'].includes(file.status)) {
      checked += 1;
      pending.push(verifyObject(dirname(manifestPath), file));
      if (pending.length >= concurrency) {
        for (const result of await Promise.all(pending.splice(0))) if (result) failures.push(...result);
      }
    }
    updatePeak(peak);
  }
  for (const result of await Promise.all(pending)) if (result) failures.push(...result);
  snapshotHash.update(']');
  if (`sha256:${snapshotHash.digest('hex')}` !== item.snapshotChecksum) failures.push({ path: 'manifest.json', code: 'SNAPSHOT_CHECKSUM_MISMATCH' });
  if (denominator !== item.denominatorCount) failures.push({ path: 'manifest.json', code: 'DENOMINATOR_COUNT_MISMATCH' });
  if ((statuses.accepted ?? 0) + (statuses['accepted-opaque'] ?? 0) + (statuses.rejected ?? 0) + (statuses.quarantined ?? 0) + (statuses['policy-excluded'] ?? 0) !== denominator) failures.push({ path: 'manifest.json', code: 'STATUS_DENOMINATOR_MISMATCH' });
  if (global.gc) global.gc();
  await new Promise((resolveFlush) => setImmediate(resolveFlush));
  updatePeak(peak);
  return {
    connectorId: item.connectorId, repository: item.repository, immutableCommit: item.immutableCommit, manifestPath: item.manifestPath,
    manifestBytes: manifestStats.size, rawManifestSha256: rawSha256, embeddedManifestChecksum, snapshotChecksum: item.snapshotChecksum,
    denominator, checkedContentAddressedObjects: checked, statuses, largeManifest, concurrency,
    canonicalManifestVerification: 'anchored-to-prior-full-canonical-verification-and-unchanged-mtime',
    passed: failures.length === 0, failures, elapsedMilliseconds: Math.round(performance.now() - started),
  };
}

if (!(priorReceipt.passed === true && priorReceipt.verifiedRepositories === 47)) throw new Error('PRIOR_CANONICAL_VERIFICATION_REQUIRED');
const beforeBytes = await freeBytes();
const peak = { heapUsedBytes: 0, residentSetBytes: 0, externalBytes: 0 };
const sampler = setInterval(() => updatePeak(peak), 100);
const results = [];
for (const item of [...index.manifests].sort((left, right) => left.connectorId.localeCompare(right.connectorId))) {
  results.push(await verifyConnector(item, priorReceipt.generatedAt, peak));
}
clearInterval(sampler);
updatePeak(peak);
const afterBytes = await freeBytes();
const largest = [...results].sort((left, right) => right.manifestBytes - left.manifestBytes)[0];
const receipt = {
  schemaVersion: 'aiw-streaming-snapshot-and-manifest-verification-v1', generatedAt,
  method: 'connector-at-a-time-streaming-file-array-plus-CAS-and-snapshot-replay',
  canonicalManifestAnchor: { path: 'release-evidence/rc10.73.8/SNAPSHOT_AND_MANIFEST_VERIFICATION.json', generatedAt: priorReceipt.generatedAt, sha256: prefixedSha256(priorReceiptRaw), passed: true },
  expectedRepositories: 47, verifiedRepositories: results.filter((result) => result.passed).length,
  failedRepositories: results.filter((result) => !result.passed).length,
  verifiedContentAddressedObjects: results.reduce((sum, result) => sum + result.checkedContentAddressedObjects, 0),
  denominatorFiles: results.reduce((sum, result) => sum + result.denominator, 0),
  memoryTelemetry: {
    nodeHeapLimitBytes: getHeapStatistics().heap_size_limit,
    peakHeapUsedBytes: peak.heapUsedBytes,
    peakResidentSetBytes: peak.residentSetBytes,
    peakExternalBytes: peak.externalBytes,
    windowsPagefileCommitmentBytes: null,
    windowsPagefileTelemetryStatus: 'unavailable-access-denied-without-administrative-elevation',
  },
  storageTelemetry: { freeBytesBefore: beforeBytes, freeBytesAfter: afterBytes, deltaBytes: afterBytes - beforeBytes },
  largestManifest: { connectorId: largest.connectorId, repository: largest.repository, bytes: largest.manifestBytes, elapsedMilliseconds: largest.elapsedMilliseconds },
  connectorOrdering: 'connectorId ascending', referencesReleasedAfterEachConnector: true,
  repositoryCodeExecuted: false, networkCalls: 0, modelCalls: 0, semanticTransformations: 0,
  rawVaultModifiedBytes: 0, automaticDeletionPerformed: false, backupCompleted: false, backupStatus: 'deferred-by-product-owner',
  passed: results.length === 47 && results.every((result) => result.passed), productionAccepted: false, results,
};
await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ passed: receipt.passed, verifiedRepositories: receipt.verifiedRepositories, failedRepositories: receipt.failedRepositories, verifiedContentAddressedObjects: receipt.verifiedContentAddressedObjects, denominatorFiles: receipt.denominatorFiles, memoryTelemetry: receipt.memoryTelemetry, storageTelemetry: receipt.storageTelemetry, largestManifest: receipt.largestManifest, productionAccepted: false }, null, 2)}\n`);
if (!receipt.passed) process.exitCode = 1;
