import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const backend = resolve(here, '..');
const product = resolve(backend, '..');
const evidenceRelative = 'release-evidence/rc10.73.7';
const evidenceRoot = resolve(product, evidenceRelative);
const zipName = 'AIW_v0.10.0-rc.10.73.7_All_Source_Governed_Acquisition_and_Sol_Semantic_Transformation_Foundation_FULLDIST.zip';
const hashManifestRelative = `${evidenceRelative}/AIW_RC10_73_7_SHA256_FILE_MANIFEST.txt`;
const contentsRelative = `${evidenceRelative}/FULLDIST_CONTENTS.json`;
const fileListRelative = `${evidenceRelative}/FULLDIST_FILELIST.txt`;
const archiveReceiptRelative = `${evidenceRelative}/FULLDIST_ARCHIVE_SHA256.json`;

if (process.argv.includes('--record-archive')) {
  const archiveRelative = `${evidenceRelative}/${zipName}`;
  const archiveInfo = await stat(resolve(product, archiveRelative));
  const archiveSha256 = await new Promise((resolveHash, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(resolve(product, archiveRelative));
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolveHash(hash.digest('hex')));
  });
  const receipt = {
    schemaVersion: 'aiw-rc10-73-7-fulldist-archive-sha256-v1',
    releaseId: 'AIW v0.10.0-rc.10.73.7',
    generatedAt: new Date().toISOString(),
    archive: archiveRelative,
    archiveBytes: archiveInfo.size,
    sha256: archiveSha256,
    rawRepositoryContentIncluded: false,
    quarantineContentIncluded: false,
    redistributionApproved: false,
    productionAccepted: false,
  };
  await writeFile(resolve(evidenceRoot, 'FULLDIST_ARCHIVE_SHA256.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
  process.exit(0);
}

const listed = execFileSync('git', [
  'ls-files', '-co', '--exclude-standard', '-z', '--', '.',
  ':(exclude)knowledge-repository/AKR-0.10.73.7/github-live/**',
  `:(exclude)${evidenceRelative}/${zipName}`,
  `:(exclude)${hashManifestRelative}`,
  `:(exclude)${contentsRelative}`,
  `:(exclude)${fileListRelative}`,
  `:(exclude)${archiveReceiptRelative}`,
], { cwd: product, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

const candidates = [...new Set(listed.split('\0').filter(Boolean).map((item) => item.replaceAll('\\', '/')))]
  .filter((path) => !/(^|\/)(node_modules|dist|build|coverage|test-results|playwright-report|\.git)(\/|$)/i.test(path))
  .filter((path) => !/(^|\/)\.env$/i.test(path))
  .filter((path) => !/\.(zip|7z|tar|tgz)$/i.test(path))
  .sort((a, b) => a.localeCompare(b));

const hashFile = (path) => new Promise((resolveHash, reject) => {
  const hash = createHash('sha256');
  const stream = createReadStream(resolve(product, path));
  stream.on('error', reject);
  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('end', () => resolveHash(hash.digest('hex')));
});

const present = [];
let totalBytes = 0;
for (const path of candidates) {
  try {
    const info = await stat(resolve(product, path));
    if (!info.isFile()) continue;
    present.push(path);
    totalBytes += info.size;
  } catch { /* A concurrently removed build artefact is not distributable source. */ }
}

const contents = {
  schemaVersion: 'aiw-rc10-73-7-fulldist-contents-v1',
  releaseId: 'AIW v0.10.0-rc.10.73.7',
  generatedAt: new Date().toISOString(),
  archiveName: zipName,
  sourceFileCount: present.length,
  sourceBytes: totalBytes,
  exclusions: [
    'Raw acquired repository files, content-addressed objects and quarantine objects: redistribution not approved.',
    'Acquisition checkpoints: local resumability intermediates, not release payload.',
    'Dependency trees, build outputs, test outputs and Playwright reports: reproducible local intermediates.',
    'Actual .env files and archive files: secret and recursive-archive protection.',
  ],
  packagingAllowlist: [
    'Git-eligible application and verification source files.',
    'Compact manifests, checksums, coverage summaries and release receipts under release-evidence/rc10.73.7.',
    'Small deterministic test fixtures and Playwright acquisition-posture screenshot evidence.',
  ],
  packagingDenylist: [
    'knowledge-repository/AKR-*/github-live/**',
    '**/snapshots/**',
    '**/objects/sha256/**',
    '**/quarantine/sha256/**',
    '**/checkpoints/**',
    '**/*.ndjson',
    '**/.env',
    '**/node_modules/**',
    '**/.npm/**',
    '**/.pnpm-store/**',
    '**/ms-playwright/**',
  ],
  includedEvidence: `${evidenceRelative}/`,
  snapshotVerificationReceipt: `${evidenceRelative}/SNAPSHOT_AND_MANIFEST_VERIFICATION.json`,
  contentSnapshotManifestIndex: `${evidenceRelative}/CONTENT_SNAPSHOT_MANIFEST_INDEX.json`,
  rawRepositoryContentIncluded: false,
  quarantineContentIncluded: false,
  redistributionApproved: false,
  knowledgeAuthority: 'candidate',
  productionAccepted: false,
};
await writeFile(resolve(product, contentsRelative), `${JSON.stringify(contents, null, 2)}\n`);

const payload = [...present, contentsRelative].sort((a, b) => a.localeCompare(b));
const hashes = [];
for (const path of payload) hashes.push(`${await hashFile(path)}  ${path}`);
await writeFile(resolve(product, hashManifestRelative), `${hashes.join('\n')}\n`);

const archivePayload = [...payload, hashManifestRelative].sort((a, b) => a.localeCompare(b));
await writeFile(resolve(product, fileListRelative), `${archivePayload.join('\n')}\n`);
console.log(JSON.stringify({ archiveName: zipName, sourceFiles: present.length, archivePayloadFiles: archivePayload.length, sourceBytes: totalBytes, hashManifest: hashManifestRelative, fileList: fileListRelative, rawRepositoryContentIncluded: false, productionAccepted: false }, null, 2));
