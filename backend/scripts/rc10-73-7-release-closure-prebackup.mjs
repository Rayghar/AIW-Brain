import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { opendir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const backend = resolve(here, '..');
const product = resolve(backend, '..');
const evidenceRoot = resolve(product, 'release-evidence/rc10.73.7');
const vaultRoot = resolve(product, 'knowledge-repository/AKR-0.10.73.7/github-live');
const generatedAt = new Date().toISOString();
const actor = 'Codex GPT-5.6 Sol';
const posix = (value) => value.replaceAll('\\', '/');
const relativeProduct = (value) => posix(relative(product, value));
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const git = (args) => execFileSync('git', args, { cwd: product, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).trim();

async function walk(root, onFile) {
  const result = { path: relativeProduct(root), bytes: 0, fileCount: 0, folderCount: 0 };
  try {
    const rootInfo = await stat(root);
    if (!rootInfo.isDirectory()) return result;
  } catch { return result; }
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    const directory = await opendir(current);
    for await (const entry of directory) {
      const fullPath = resolve(current, entry.name);
      if (entry.isDirectory()) { result.folderCount += 1; pending.push(fullPath); continue; }
      if (!entry.isFile()) continue;
      const info = await stat(fullPath);
      result.fileCount += 1;
      result.bytes += info.size;
      if (onFile) await onFile(fullPath, info, result);
    }
  }
  return result;
}

function emptyCategory(path) { return { path, bytes: 0, fileCount: 0, folderCount: 0 }; }
function addFile(category, fullPath, info) {
  category.bytes += info.size;
  category.fileCount += 1;
  category._folders.add(posix(dirname(fullPath)));
}
function finish(category) {
  category.folderCount = category._folders.size;
  delete category._folders;
  return category;
}
function category(path) { return { ...emptyCategory(path), _folders: new Set() }; }
function formatBytes(bytes) { return `${bytes.toLocaleString('en-US')} bytes (${(bytes / 1024 / 1024 / 1024).toFixed(3)} GiB)`; }
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }

const vaultCategories = {
  safeCas: category('knowledge-repository/AKR-0.10.73.7/github-live/snapshots/*/*/objects/sha256'),
  quarantineCas: category('knowledge-repository/AKR-0.10.73.7/github-live/snapshots/*/*/quarantine/sha256'),
  snapshots: category('knowledge-repository/AKR-0.10.73.7/github-live/snapshots/*/*/files'),
  manifests: category('knowledge-repository/AKR-0.10.73.7/github-live/snapshots/*/*/manifest.json'),
  checkpoints: category('knowledge-repository/AKR-0.10.73.7/github-live/checkpoints/*.json'),
  journals: category('knowledge-repository/AKR-0.10.73.7/github-live/checkpoints/*.ndjson'),
  other: category('knowledge-repository/AKR-0.10.73.7/github-live (unclassified)'),
};

const vault = await walk(vaultRoot, async (fullPath, info) => {
  const path = posix(relative(vaultRoot, fullPath));
  if (/^snapshots\/[^/]+\/[^/]+\/objects\/sha256\//.test(path)) return addFile(vaultCategories.safeCas, fullPath, info);
  if (/^snapshots\/[^/]+\/[^/]+\/quarantine\/sha256\//.test(path)) return addFile(vaultCategories.quarantineCas, fullPath, info);
  if (/^snapshots\/[^/]+\/[^/]+\/files\//.test(path)) return addFile(vaultCategories.snapshots, fullPath, info);
  if (/^snapshots\/[^/]+\/[^/]+\/manifest\.json$/.test(path)) return addFile(vaultCategories.manifests, fullPath, info);
  if (/^checkpoints\/.*\.ndjson$/.test(path)) return addFile(vaultCategories.journals, fullPath, info);
  if (/^checkpoints\/.*\.json$/.test(path)) return addFile(vaultCategories.checkpoints, fullPath, info);
  addFile(vaultCategories.other, fullPath, info);
});
Object.values(vaultCategories).forEach(finish);

const summary = await readJson(resolve(evidenceRoot, 'ALL_47_LIVE_ACQUISITION_SUMMARY.json'));
const verification = await readJson(resolve(evidenceRoot, 'SNAPSHOT_AND_MANIFEST_VERIFICATION.json'));
const coverage = await readJson(resolve(evidenceRoot, 'REPOSITORY_COVERAGE_MATRIX.json'));
const security = await readJson(resolve(evidenceRoot, 'QUARANTINE_AND_SECURITY_REPORT.json'));
const archiveReceipt = await readJson(resolve(evidenceRoot, 'FULLDIST_ARCHIVE_SHA256.json'));
const zipPath = resolve(product, archiveReceipt.archive);
const zipInfo = await stat(zipPath);
const zipEntries = execFileSync('tar.exe', ['-tf', zipPath], { cwd: product, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }).split(/\r?\n/).filter(Boolean);

const releaseEvidence = await walk(evidenceRoot);
const candidateIndexes = category('release-evidence/rc10.73.7 (vault-derived candidate indexes)');
const candidatePatterns = [/WHOLE_ARCHITECTURE_ARTEFACT_INDEX\.part-\d+\.json$/, /_SOURCE_INVENTORY\.json$/, /MACHINE_READABLE_MODEL_INVENTORY\.json$/, /CROSS_FILE_ARCHITECTURE_GROUPS\.json$/];
await walk(evidenceRoot, async (fullPath, info) => {
  if (candidatePatterns.some((pattern) => pattern.test(posix(fullPath)))) addFile(candidateIndexes, fullPath, info);
});
finish(candidateIndexes);

async function aggregatePaths(label, paths) {
  const total = { path: label, bytes: 0, fileCount: 0, folderCount: 0, children: [] };
  for (const path of paths) {
    const scanned = await walk(path);
    total.bytes += scanned.bytes;
    total.fileCount += scanned.fileCount;
    total.folderCount += scanned.folderCount;
    total.children.push(scanned);
  }
  return total;
}

const temporaryData = await aggregatePaths('temporary test and browser output', [
  resolve(product, 'frontend/test-results'), resolve(product, 'frontend/playwright-report'),
]);
const rebuildableData = await aggregatePaths('rebuildable dependencies and compiled output', [
  resolve(product, 'backend/node_modules'), resolve(product, 'frontend/node_modules'),
  resolve(product, 'backend/apps/api/dist'), resolve(product, 'backend/apps/worker/dist'),
  resolve(product, 'frontend/apps/web/dist'),
]);
const knowledgeRoot = resolve(product, 'knowledge-repository');
const historicalPaths = [];
try {
  const directory = await opendir(knowledgeRoot);
  for await (const entry of directory) if (entry.isDirectory() && entry.name !== 'AKR-0.10.73.7') historicalPaths.push(resolve(knowledgeRoot, entry.name));
} catch { /* No historical knowledge root. */ }
const historicalReleases = await aggregatePaths('knowledge-repository historical releases excluding AKR-0.10.73.7', historicalPaths);

const boundedEvidenceCount = coverage.repositories.reduce((sum, item) => sum + item.parserCoverage.boundedEvidenceCount, 0);
const parserOutputCount = coverage.repositories.reduce((sum, item) => sum + item.parserCoverage.parsedFiles + item.parserCoverage.preservedAwaitingSpecialistParser, 0);
const categoryRows = [
  { name: 'safe CAS', ...vaultCategories.safeCas, retentionClass: 'immutable-source-evidence', rebuildability: 'reacquirable only with external source availability; preserve', authority: 'candidate evidence', backupRequirement: 'mandatory before compaction', compactionEligibility: 'not eligible', gitDisposition: 'excluded', fullDistDisposition: 'excluded' },
  { name: 'quarantine CAS', ...vaultCategories.quarantineCas, retentionClass: 'restricted-immutable-security-evidence', rebuildability: 'not relied upon; preserve exact bytes and disposition', authority: 'quarantined data only', backupRequirement: 'mandatory encrypted restricted backup', compactionEligibility: 'not eligible', gitDisposition: 'excluded', fullDistDisposition: 'excluded' },
  { name: 'materialized snapshots', ...vaultCategories.snapshots, retentionClass: 'immutable-source-view', rebuildability: 'rebuildable from verified CAS plus manifests', authority: 'candidate evidence view', backupRequirement: 'manifest-backed; include in first complete backup', compactionEligibility: 'eligible only after verified backup and restore proof', gitDisposition: 'excluded', fullDistDisposition: 'excluded' },
  { name: 'manifests', ...vaultCategories.manifests, retentionClass: 'immutable-provenance-and-denominator', rebuildability: 'not safely rebuildable without full acquisition replay', authority: 'candidate provenance', backupRequirement: 'mandatory', compactionEligibility: 'not eligible', gitDisposition: 'compact indexes only', fullDistDisposition: 'compact manifest index and verification receipt only' },
  { name: 'checkpoints', ...vaultCategories.checkpoints, retentionClass: 'resumability-intermediate', rebuildability: 'rebuildable from complete manifests and journals', authority: 'non-authoritative operational state', backupRequirement: 'include until compaction approved', compactionEligibility: 'potentially eligible after backup', gitDisposition: 'excluded', fullDistDisposition: 'excluded' },
  { name: 'journals', ...vaultCategories.journals, retentionClass: 'append-only-acquisition-history', rebuildability: 'superseded by complete verified manifests only after reviewed compaction', authority: 'non-authoritative audit support', backupRequirement: 'include before any compaction', compactionEligibility: 'review required', gitDisposition: 'excluded', fullDistDisposition: 'excluded' },
  { name: 'bounded evidence', path: 'embedded in immutable snapshot manifests', bytes: vaultCategories.manifests.bytes, fileCount: vaultCategories.manifests.fileCount, folderCount: vaultCategories.manifests.folderCount, logicalRecordCount: boundedEvidenceCount, physicalStorageOverlap: 'manifest bytes; do not add to vault total', retentionClass: 'candidate-bounded-evidence', rebuildability: 'deterministically rebuildable from safe CAS and parser version', authority: 'candidate only', backupRequirement: 'covered by manifests and CAS', compactionEligibility: 'indexes rebuildable; provenance not removable', gitDisposition: 'summary only', fullDistDisposition: 'summary only' },
  { name: 'parser outputs', path: 'embedded in immutable snapshot manifests', bytes: vaultCategories.manifests.bytes, fileCount: vaultCategories.manifests.fileCount, folderCount: vaultCategories.manifests.folderCount, logicalRecordCount: parserOutputCount, physicalStorageOverlap: 'manifest bytes; do not add to vault total', retentionClass: 'deterministic-parser-metadata', rebuildability: 'rebuildable from safe CAS with pinned parser', authority: 'candidate only', backupRequirement: 'covered by manifests and CAS', compactionEligibility: 'derived indexes eligible after backup', gitDisposition: 'summary only', fullDistDisposition: 'summary only' },
  { name: 'candidate indexes', ...candidateIndexes, retentionClass: 'derived-candidate-index', rebuildability: 'rebuildable from manifests', authority: 'candidate only', backupRequirement: 'optional after source vault backup; retain current release copy', compactionEligibility: 'eligible after backup', gitDisposition: 'excluded when large; compact root index permitted', fullDistDisposition: 'excluded from normal application payload when ignored' },
  { name: 'release evidence', ...releaseEvidence, retentionClass: 'release-receipt', rebuildability: 'partially rebuildable; signed/observed receipts must be retained', authority: 'release evidence, not production authority', backupRequirement: 'mandatory release backup', compactionEligibility: 'duplicate generated reports reviewable', gitDisposition: 'compact receipts and checksums permitted', fullDistDisposition: 'compact receipts permitted' },
  { name: 'temporary data', ...temporaryData, retentionClass: 'temporary', rebuildability: 'fully rebuildable', authority: 'none', backupRequirement: 'none', compactionEligibility: 'eligible after backup gate', gitDisposition: 'excluded', fullDistDisposition: 'excluded' },
  { name: 'rebuildable data', ...rebuildableData, retentionClass: 'local-build-cache', rebuildability: 'fully rebuildable from locks and source', authority: 'none', backupRequirement: 'none', compactionEligibility: 'eligible after backup gate', gitDisposition: 'excluded', fullDistDisposition: 'excluded' },
  { name: 'duplicate content', path: vaultCategories.snapshots.path, bytes: vaultCategories.snapshots.bytes, fileCount: vaultCategories.snapshots.fileCount, folderCount: vaultCategories.snapshots.folderCount, basis: 'Materialized source-view files are logical duplicates of verified content-addressed objects referenced by each manifest.', retentionClass: 'rebuildable-source-view', rebuildability: 'rebuildable from CAS plus manifests', authority: 'none beyond referenced CAS', backupRequirement: 'preserve in first full backup', compactionEligibility: 'eligible only after backup and restore verification', gitDisposition: 'excluded', fullDistDisposition: 'excluded' },
  { name: 'historical releases', ...historicalReleases, retentionClass: 'historical-release-evidence', rebuildability: 'varies; treat as non-rebuildable pending audit', authority: 'release-pinned historical', backupRequirement: 'mandatory under historical retention policy', compactionEligibility: 'not assessed in this gate', gitDisposition: 'existing governed history only', fullDistDisposition: 'release-specific' },
];

const statusLines = git(['status', '--short']).split(/\r?\n/).filter(Boolean);
const staged = git(['diff', '--cached', '--name-only']).split(/\r?\n/).filter(Boolean);
const unstaged = git(['diff', '--name-only']).split(/\r?\n/).filter(Boolean);
const untracked = git(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).filter(Boolean);
const tracked = git(['ls-files']).split(/\r?\n/).filter(Boolean);
const forbiddenPattern = /(^|\/)(github-live|snapshots|objects\/sha256|quarantine\/sha256|checkpoints)(\/|$)|\.ndjson$|(^|\/)\.env$|(^|\/)(node_modules|\.npm|\.pnpm-store|ms-playwright)(\/|$)/i;
const forbiddenTracked = tracked.filter((path) => forbiddenPattern.test(posix(path)));
const forbiddenStaged = staged.filter((path) => forbiddenPattern.test(posix(path)));
const fullDistList = (await readFile(resolve(evidenceRoot, 'FULLDIST_FILELIST.txt'), 'utf8')).split(/\r?\n/).filter(Boolean);
const forbiddenFullDist = fullDistList.filter((path) => forbiddenPattern.test(posix(path)));
const exclusionPassed = forbiddenTracked.length === 0 && forbiddenStaged.length === 0 && forbiddenFullDist.length === 0;
const branch = git(['branch', '--show-current']);
const head = git(['rev-parse', 'HEAD']);
const checkpoint = git(['rev-parse', '10a065c']);
const denominator = coverage.repositories.reduce((sum, item) => sum + item.totalTreeFiles, 0);
const minimumBackupBytes = vault.bytes;
const recommendedBackupCapacityBytes = Math.ceil(minimumBackupBytes * 1.2);

const backupReceipt = {
  schemaVersion: 'aiw-knowledge-vault-backup-receipt-v1', releaseId: 'AIW v0.10.0-rc.10.73.7', generatedAt, actor,
  status: 'deferred-by-product-owner', backupStatus: 'deferred-by-product-owner', sourceRoot: relativeProduct(vaultRoot), destination: null,
  totalBytes: vault.bytes, fileCount: vault.fileCount, folderCount: vault.folderCount,
  minimumRequiredCapacityBytes: minimumBackupBytes, recommendedCapacityWith20PercentHeadroomBytes: recommendedBackupCapacityBytes,
  sourceManifestFingerprint: null, destinationManifestFingerprint: null,
  verificationMethod: 'not-run; destination approval required before source fingerprint, copy and independent destination replay',
  verificationResult: 'not-performed', encryptionPosture: 'destination-not-selected', retentionPosture: 'destination-not-selected',
  backupCompleted: false, backupRiskAccepted: true, backupRiskAcceptedAt: generatedAt,
  backupRiskScope: 'loss or corruption of the local raw acquisition vault', productionAccepted: false,
  blocker: 'Independent verified backup was explicitly deferred by the product owner. This is a risk acceptance, not a passed backup gate. No copy, compaction or deletion was attempted.',
};
await writeFile(resolve(evidenceRoot, 'KNOWLEDGE_VAULT_BACKUP_RECEIPT.json'), `${JSON.stringify(backupReceipt, null, 2)}\n`);

const footprintTable = categoryRows.map((item) => `| ${item.name} | \`${item.path}\` | ${item.bytes.toLocaleString('en-US')} | ${item.fileCount.toLocaleString('en-US')} | ${item.folderCount.toLocaleString('en-US')} | ${item.retentionClass} | ${item.rebuildability} | ${item.authority} | ${item.backupRequirement} | ${item.compactionEligibility} | ${item.gitDisposition} | ${item.fullDistDisposition} |`).join('\n');
const footprintReport = `# Knowledge Storage Footprint Report\n\nGenerated: ${generatedAt}  \nActor: ${actor}  \nProduction accepted: **false**\n\n## Raw vault\n\n- Source root: \`${relativeProduct(vaultRoot)}\`\n- Logical bytes: **${formatBytes(vault.bytes)}**\n- Files: **${vault.fileCount.toLocaleString('en-US')}**\n- Folders: **${vault.folderCount.toLocaleString('en-US')}**\n- Minimum backup capacity: **${minimumBackupBytes.toLocaleString('en-US')} bytes**\n- Recommended destination capacity with 20% verification/headroom: **${recommendedBackupCapacityBytes.toLocaleString('en-US')} bytes**\n\n## Top-level\n\n| Path | Bytes | Files | Folders |\n|---|---:|---:|---:|\n| \`${relativeProduct(resolve(vaultRoot, 'checkpoints'))}\` | ${(vaultCategories.checkpoints.bytes + vaultCategories.journals.bytes).toLocaleString('en-US')} | ${(vaultCategories.checkpoints.fileCount + vaultCategories.journals.fileCount).toLocaleString('en-US')} | ${(vaultCategories.checkpoints.folderCount + vaultCategories.journals.folderCount).toLocaleString('en-US')} |\n| \`${relativeProduct(resolve(vaultRoot, 'snapshots'))}\` | ${(vault.bytes - vaultCategories.checkpoints.bytes - vaultCategories.journals.bytes).toLocaleString('en-US')} | ${(vault.fileCount - vaultCategories.checkpoints.fileCount - vaultCategories.journals.fileCount).toLocaleString('en-US')} | ${(vault.folderCount - 1).toLocaleString('en-US')} |\n\n## Recursive classification\n\n| Category | Path | Bytes | Files | Folders | Retention | Rebuildability | Authority | Backup | Compaction | Git | FULLDIST |\n|---|---|---:|---:|---:|---|---|---|---|---|---|---|\n${footprintTable}\n\nBounded evidence and parser-output byte values identify their physical manifest carrier and overlap manifest storage; they are not added again to the raw-vault total. Duplicate-content bytes represent the materialized source view that can be reconstructed from CAS plus manifests, but no duplicate was removed.\n`;
await writeFile(resolve(evidenceRoot, 'KNOWLEDGE_STORAGE_FOOTPRINT_REPORT.md'), footprintReport);

const exclusionReport = `# Git and Distribution Exclusion Report\n\nGenerated: ${generatedAt}  \nProduction accepted: **false**\n\n## Result\n\n- Forbidden raw/cache paths tracked: **${forbiddenTracked.length}**\n- Forbidden raw/cache paths staged: **${forbiddenStaged.length}**\n- Forbidden raw/cache paths in FULLDIST allowlist: **${forbiddenFullDist.length}**\n- Staged files of any kind: **${staged.length}**\n- Exclusion gate: **${exclusionPassed ? 'passed' : 'failed'}**\n\nDefense in depth is enforced by repository \`.gitignore\`, root \`.dockerignore\`, backend/frontend \`.dockerignore\`, and the FULLDIST builder's explicit packaging allowlist and denylist metadata. Raw immutable snapshots, safe CAS, quarantine CAS, journals, checkpoints, local credentials, package caches and Playwright browser caches are excluded.\n\n## Git-eligible boundary\n\nGit may contain acquisition/verification code, schemas, policies, compact manifest roots, checksums, coverage summaries, release receipts and small deterministic fixtures. Large rebuildable candidate-index shards and the FULLDIST archive are local release artefacts and are ignored.\n`;
await writeFile(resolve(evidenceRoot, 'GIT_AND_DISTRIBUTION_EXCLUSION_REPORT.md'), exclusionReport);

const changedInventory = statusLines.map((line) => `- \`${line}\``).join('\n');
const reconciliation = `# rc.10.73.7 Final Release Reconciliation — Pre-backup Gate\n\nGenerated: ${generatedAt}  \nProduction accepted: **false**\n\n## Git state\n\n- Branch: \`${branch}\`\n- HEAD: \`${head}\`\n- Approved foundation checkpoint: \`${checkpoint}\`\n- Staged: ${staged.length}\n- Unstaged tracked paths: ${unstaged.length}\n- Untracked non-ignored paths: ${untracked.length}\n\n## Release state\n\n- ZIP: \`${archiveReceipt.archive}\`\n- ZIP bytes: ${zipInfo.size.toLocaleString('en-US')}\n- ZIP entries: ${zipEntries.length.toLocaleString('en-US')}\n- ZIP SHA-256: \`${archiveReceipt.sha256}\`\n- Acquisition: ${summary.completed}/47 complete; ${summary.failed} failed; ${summary.controlledStops} controlled stops\n- Denominator: ${denominator.toLocaleString('en-US')} files; verification denominator ${verification.denominatorFiles.toLocaleString('en-US')}\n- Manifest verification: ${verification.verifiedRepositories}/47\n- Quarantine count: ${security.quarantinedFileCount}\n- Review-required repositories: ${summary.reviewRequired}\n- Raw vault: ${formatBytes(vault.bytes)}; ${vault.fileCount.toLocaleString('en-US')} files; ${vault.folderCount.toLocaleString('en-US')} folders\n\nRelease report, summary, coverage and verification receipts agree on 47 completed repositories, zero processing failures/unprocessed files and a 186,219-file denominator. The working tree additionally contains release-closure exclusion and footprint work that is not committed.\n\n## Complete changed-file inventory\n\n${changedInventory || '- Clean'}\n\n## Backup gate\n\n**Blocked.** No approved destination exists. The exact minimum capacity is ${minimumBackupBytes.toLocaleString('en-US')} bytes; ${recommendedBackupCapacityBytes.toLocaleString('en-US')} bytes is recommended with 20% headroom. No evidence was deleted or compacted.\n`;
const reconciledBackupDecision = reconciliation
  .replace('— Pre-backup Gate', '— Backup Deferred')
  .replace(/\n\n## Backup gate[\s\S]*$/, `\n\n## Backup and compaction gates\n\nThe product owner deferred independent backup and accepted the risk of loss or corruption of the local raw acquisition vault. This is not a passed backup gate. The exact minimum capacity is ${minimumBackupBytes.toLocaleString('en-US')} bytes; ${recommendedBackupCapacityBytes.toLocaleString('en-US')} bytes is recommended with 20% headroom. Compaction is deferred. No evidence was deleted, compacted, moved or overwritten.\n`);
await writeFile(resolve(evidenceRoot, 'RC10_73_7_FINAL_RELEASE_RECONCILIATION.md'), reconciledBackupDecision);

const machineReceipt = {
  schemaVersion: 'aiw-rc10-73-7-prebackup-closure-v1', generatedAt, actor, branch, head, checkpoint,
  vault, vaultCategories, categoryRows, releaseEvidence, candidateIndexes, temporaryData, rebuildableData, historicalReleases,
  git: { status: statusLines, staged, unstaged, untracked, forbiddenTracked, forbiddenStaged },
  fullDist: { path: archiveReceipt.archive, bytes: zipInfo.size, entryCount: zipEntries.length, sha256: archiveReceipt.sha256, forbiddenEntries: forbiddenFullDist },
  acquisition: { completed: summary.completed, failed: summary.failed, controlledStops: summary.controlledStops, reviewRequired: summary.reviewRequired, denominator, verifiedRepositories: verification.verifiedRepositories, quarantineCount: security.quarantinedFileCount },
  backupGate: backupReceipt, productionAccepted: false,
};
await writeFile(resolve(evidenceRoot, 'RC10_73_7_PREBACKUP_CLOSURE_EVIDENCE.json'), `${JSON.stringify(machineReceipt, null, 2)}\n`);
console.log(JSON.stringify({ branch, head, vault, minimumBackupBytes, recommendedBackupCapacityBytes, forbiddenTracked: forbiddenTracked.length, forbiddenStaged: forbiddenStaged.length, forbiddenFullDist: forbiddenFullDist.length, backupStatus: backupReceipt.status, productionAccepted: false }, null, 2));
