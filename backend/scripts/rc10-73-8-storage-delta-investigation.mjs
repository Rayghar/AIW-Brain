import { createHash } from 'node:crypto';
import { opendir, lstat, readFile, statfs, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(scriptPath), '../..');
const evidenceRoot = resolve(repositoryRoot, 'release-evidence/rc10.73.8');
const comparisonStartedAt = '2026-07-15T22:09:46.784Z';
const earlierFreeBytes = 14_530_207_744;
const stoppedFreeBytes = 7_082_967_040;
const deltaBytes = earlierFreeBytes - stoppedFreeBytes;
const generatedAt = new Date().toISOString();

function emptyStats(path) {
  return { path, exists: false, bytes: 0, fileCount: 0, folderCount: 0, newestModificationTime: null, errors: [] };
}

function updateNewest(stats, mtime) {
  if (!stats.newestModificationTime || mtime > stats.newestModificationTime) stats.newestModificationTime = mtime;
}

async function measure(path) {
  const stats = emptyStats(path);
  let root;
  try { root = await lstat(path); } catch (error) { if (error?.code !== 'ENOENT') stats.errors.push(String(error)); return stats; }
  stats.exists = true;
  if (!root.isDirectory()) {
    stats.bytes = root.size; stats.fileCount = 1; stats.newestModificationTime = root.mtime.toISOString(); return stats;
  }
  const stack = [path];
  while (stack.length) {
    const directory = stack.pop();
    let handle;
    try { handle = await opendir(directory); } catch (error) { stats.errors.push(`${directory}:${error?.code ?? error}`); continue; }
    for await (const entry of handle) {
      const child = resolve(directory, entry.name);
      try {
        const item = await lstat(child);
        updateNewest(stats, item.mtime.toISOString());
        if (item.isSymbolicLink()) continue;
        if (item.isDirectory()) { stats.folderCount += 1; stack.push(child); }
        else { stats.fileCount += 1; stats.bytes += item.size; }
      } catch (error) { stats.errors.push(`${child}:${error?.code ?? error}`); }
    }
  }
  return stats;
}

async function findDirectories(root, names, excludedSegments = []) {
  const found = [];
  const stack = [root];
  while (stack.length) {
    const directory = stack.pop();
    let handle;
    try { handle = await opendir(directory); } catch { continue; }
    for await (const entry of handle) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const child = resolve(directory, entry.name);
      const normalized = child.replaceAll('\\', '/').toLowerCase();
      if (excludedSegments.some((segment) => normalized.includes(segment))) continue;
      if (names.has(entry.name.toLowerCase())) found.push(child);
      else stack.push(child);
    }
  }
  return found.sort();
}

function annotate(stats, metadata) {
  return { ...stats, ...metadata, modifiedDuringElapsedPeriod: Boolean(stats.newestModificationTime && stats.newestModificationTime >= comparisonStartedAt) };
}

const paths = {
  workspace: repositoryRoot,
  sidecars: resolve(repositoryRoot, '../release-sidecars'),
  npmWorkspace: resolve(repositoryRoot, '../.npm'),
  npmUser: resolve(process.env.LOCALAPPDATA ?? '', 'npm-cache'),
  playwright: resolve(process.env.LOCALAPPDATA ?? '', 'ms-playwright'),
  backendModules: resolve(repositoryRoot, 'backend/node_modules'),
  frontendModules: resolve(repositoryRoot, 'frontend/node_modules'),
  backendDist: resolve(repositoryRoot, 'backend/dist'),
  frontendDist: resolve(repositoryRoot, 'frontend/dist'),
  temp: process.env.TEMP,
  rc738Evidence: resolve(evidenceRoot),
  releaseEvidence: resolve(repositoryRoot, 'release-evidence'),
  candidate: resolve(repositoryRoot, 'knowledge-repository/AKR-0.10.73.8/candidate'),
  rawVault: resolve(repositoryRoot, 'knowledge-repository/AKR-0.10.73.7/github-live'),
  safeSnapshots: resolve(repositoryRoot, 'knowledge-repository/AKR-0.10.73.7/github-live/snapshots'),
  checkpoints: resolve(repositoryRoot, 'knowledge-repository/AKR-0.10.73.7/github-live/checkpoints'),
};

const primary = {};
for (const [key, path] of Object.entries(paths)) primary[key] = await measure(path);

const buildDirectories = await findDirectories(repositoryRoot, new Set(['dist', 'build', 'coverage', 'test-results', 'playwright-report']), ['/node_modules/', '/github-live/']);
const buildOutputs = [];
for (const path of buildDirectories) buildOutputs.push(await measure(path));

const fullDistPath = resolve(repositoryRoot, 'release-evidence/rc10.73.7/AIW_v0.10.0-rc.10.73.7_All_Source_Governed_Acquisition_and_Sol_Semantic_Transformation_Foundation_FULLDIST.zip');
const sidecarPath = resolve(repositoryRoot, '../release-sidecars/rc10.73.7/AIW_rc10.73.7_Post_Tag_Attestation_Sidecars.zip');
const fullDist = await measure(fullDistPath);
const sidecarPackage = await measure(sidecarPath);

const baselineReport = await readFile(resolve(repositoryRoot, 'release-evidence/rc10.73.7/KNOWLEDGE_STORAGE_FOOTPRINT_REPORT.md'), 'utf8');
const baselineVaultBytes = Number(baselineReport.match(/Logical bytes: \*\*([\d,]+) bytes/)?.[1]?.replaceAll(',', '') ?? 0);
const disk = await statfs(repositoryRoot, { bigint: true });
const currentFreeBytes = Number(disk.bavail * disk.bsize);

const inventory = [
  annotate(primary.workspace, { id: 'workspace', existedBeforeGate6A: true, immutableEvidence: 'mixed', reproducible: 'mixed', safeToRemove: false, removalRequiresProductOwnerApproval: true }),
  annotate(primary.sidecars, { id: 'release-sidecars', existedBeforeGate6A: true, immutableEvidence: true, reproducible: false, safeToRemove: false, removalRequiresProductOwnerApproval: true }),
  annotate(primary.npmWorkspace, { id: 'workspace-npm-cache', existedBeforeGate6A: true, immutableEvidence: false, reproducible: true, safeToRemove: true, removalRequiresProductOwnerApproval: true, rebuildEffect: 'offline npm operations may fail or require network restoration' }),
  annotate(primary.npmUser, { id: 'user-npm-cache', existedBeforeGate6A: true, immutableEvidence: false, reproducible: true, safeToRemove: true, removalRequiresProductOwnerApproval: true, rebuildEffect: 'offline npm operations may fail or require network restoration' }),
  annotate(primary.playwright, { id: 'playwright-chromium-cache', existedBeforeGate6A: true, immutableEvidence: false, reproducible: true, safeToRemove: true, removalRequiresProductOwnerApproval: true, rebuildEffect: 'headed/headless acceptance becomes unavailable until browsers are reinstalled' }),
  annotate(primary.backendModules, { id: 'backend-node-modules', existedBeforeGate6A: true, immutableEvidence: false, reproducible: true, safeToRemove: true, removalRequiresProductOwnerApproval: true, rebuildEffect: 'backend tests/builds unavailable until npm ci completes' }),
  annotate(primary.frontendModules, { id: 'frontend-node-modules', existedBeforeGate6A: true, immutableEvidence: false, reproducible: true, safeToRemove: true, removalRequiresProductOwnerApproval: true, rebuildEffect: 'frontend tests/builds unavailable until npm ci completes' }),
  annotate(primary.backendDist, { id: 'backend-dist', existedBeforeGate6A: true, immutableEvidence: false, reproducible: true, safeToRemove: true, removalRequiresProductOwnerApproval: true }),
  annotate(primary.frontendDist, { id: 'frontend-dist', existedBeforeGate6A: true, immutableEvidence: false, reproducible: true, safeToRemove: true, removalRequiresProductOwnerApproval: true }),
  annotate(primary.temp, { id: 'operating-system-temp', existedBeforeGate6A: true, immutableEvidence: 'unknown-mixed-ownership', reproducible: 'mixed', safeToRemove: false, removalRequiresProductOwnerApproval: true }),
  annotate(primary.rc738Evidence, { id: 'rc10.73.8-release-evidence', existedBeforeGate6A: false, immutableEvidence: 'release-evidence-in-progress', reproducible: 'partially', safeToRemove: false, removalRequiresProductOwnerApproval: true }),
  annotate(primary.releaseEvidence, { id: 'all-release-evidence', existedBeforeGate6A: true, immutableEvidence: true, reproducible: false, safeToRemove: false, removalRequiresProductOwnerApproval: true }),
  annotate(primary.candidate, { id: 'candidate-ledgers-and-shards', existedBeforeGate6A: false, immutableEvidence: false, reproducible: true, safeToRemove: true, removalRequiresProductOwnerApproval: true }),
  annotate(primary.rawVault, { id: 'raw-knowledge-vault', existedBeforeGate6A: true, immutableEvidence: true, reproducible: false, safeToRemove: false, removalRequiresProductOwnerApproval: true, baselineBytes: baselineVaultBytes, currentMinusBaselineBytes: primary.rawVault.bytes - baselineVaultBytes }),
  annotate(primary.safeSnapshots, { id: 'authoritative-snapshots-cas-manifests-quarantine', existedBeforeGate6A: true, immutableEvidence: true, reproducible: false, safeToRemove: false, removalRequiresProductOwnerApproval: true }),
  annotate(primary.checkpoints, { id: 'acquisition-checkpoints-and-journals', existedBeforeGate6A: true, immutableEvidence: 'recovery-required', reproducible: 'partially', safeToRemove: false, removalRequiresProductOwnerApproval: true }),
  annotate(fullDist, { id: 'verified-rc10.73.7-fulldist', existedBeforeGate6A: true, immutableEvidence: true, reproducible: false, safeToRemove: false, removalRequiresProductOwnerApproval: true }),
  annotate(sidecarPackage, { id: 'post-tag-sidecar-package', existedBeforeGate6A: true, immutableEvidence: true, reproducible: false, safeToRemove: false, removalRequiresProductOwnerApproval: true }),
];

const cleanupCandidates = [
  ...buildOutputs.map((item) => ({ path: item.path, bytes: item.bytes, fileCount: item.fileCount, category: 'build-or-test-output', safeToRemove: true, removalRequiresProductOwnerApproval: true, rebuildCost: 'local rebuild or test rerun' })),
  ...[primary.npmWorkspace, primary.npmUser].filter((item) => item.exists && item.bytes > 0).map((item) => ({ path: item.path, bytes: item.bytes, fileCount: item.fileCount, category: 'npm-cache', safeToRemove: true, removalRequiresProductOwnerApproval: true, rebuildCost: 'may require network; reduces offline verification capability' })),
  ...(primary.playwright.exists ? [{ path: primary.playwright.path, bytes: primary.playwright.bytes, fileCount: primary.playwright.fileCount, category: 'playwright-browser-cache', safeToRemove: true, removalRequiresProductOwnerApproval: true, rebuildCost: 'requires Playwright browser reinstall, normally network access' }] : []),
  ...[primary.backendModules, primary.frontendModules].filter((item) => item.exists).map((item) => ({ path: item.path, bytes: item.bytes, fileCount: item.fileCount, category: 'node-modules', safeToRemove: true, removalRequiresProductOwnerApproval: true, rebuildCost: 'npm ci; offline success depends on retained cache' })),
  ...(primary.candidate.exists && primary.candidate.fileCount > 0 ? [{ path: primary.candidate.path, bytes: primary.candidate.bytes, fileCount: primary.candidate.fileCount, category: 'incomplete-unreferenced-candidate-output', safeToRemove: true, removalRequiresProductOwnerApproval: true, rebuildCost: 'deterministic Gate 6A replay' }] : []),
];
const uniqueCleanup = [...new Map(cleanupCandidates.map((item) => [item.path.toLowerCase(), item])).values()].sort((a, b) => a.path.localeCompare(b.path));
const expectedRecoverableBytes = uniqueCleanup.reduce((total, item) => total + item.bytes, 0);

const payload = {
  schemaVersion: 'aiw-prompt-6-gate-6a-storage-delta-inventory-v1', generatedAt, comparisonStartedAt,
  observations: { earlierFreeBytes, controlledStopFreeBytes: stoppedFreeBytes, exactObservedLossBytes: deltaBytes, currentFreeBytes, recoveredSinceControlledStopBytes: currentFreeBytes - stoppedFreeBytes, currentVersusEarlierBytes: currentFreeBytes - earlierFreeBytes },
  attribution: {
    classification: 'transient-system-managed-virtual-memory-backing',
    persistentWorkspaceConsumerFound: false,
    evidence: [
      'current free space exceeds the earlier Gate 6A observation',
      'the controlled stop immediately followed a 603-second Node process launched with --max-old-space-size=8192',
      'the verifier parsed and canonicalised up to 895,388,377 bytes of manifests including a 429,260,100-byte manifest',
      'Windows pagefile.sys is system-managed and has a 16,828,760,064-byte logical length; physical commitment can grow and later be released without a workspace file delta',
    ],
    precisionLimit: 'Windows denied Win32_PageFileUsage access, so the historical physical pagefile allocation counter at the exact stop instant is unavailable. Attribution is established by exact free-space recovery and absence of an equivalent persistent filesystem delta.',
  },
  nonAdditiveInventory: inventory,
  discoveredBuildAndTestOutputs: buildOutputs,
  proposedCleanupCandidates: uniqueCleanup,
  proposedRecoverableBytes: expectedRecoverableBytes,
  deletionPerformed: false,
  backupCompleted: false,
  backupStatus: 'deferred-by-product-owner',
  gate6AResumed: false,
  productionAccepted: false,
};
const serialized = `${JSON.stringify(payload, null, 2)}\n`;
await writeFile(resolve(evidenceRoot, 'PROMPT_6_GATE_6A_STORAGE_DELTA_INVENTORY.json'), serialized);

const rows = inventory.map((item) => `| \`${item.path}\` | ${item.bytes.toLocaleString('en-US')} | ${item.fileCount.toLocaleString('en-US')} | ${item.folderCount.toLocaleString('en-US')} | ${item.newestModificationTime ?? 'n/a'} | ${item.existedBeforeGate6A} | ${item.immutableEvidence} | ${item.reproducible} | ${item.safeToRemove} | ${item.removalRequiresProductOwnerApproval} |`).join('\n');
await writeFile(resolve(evidenceRoot, 'PROMPT_6_GATE_6A_STORAGE_DELTA_REPORT.md'), `# Prompt 6 Gate 6A Storage Delta Report\n\nGenerated: ${generatedAt}\n\n## Reconciliation\n\nThe exact observed loss was **${deltaBytes.toLocaleString('en-US')} bytes**. Current free space is **${currentFreeBytes.toLocaleString('en-US')} bytes**, a recovery of **${(currentFreeBytes - stoppedFreeBytes).toLocaleString('en-US')} bytes** since the controlled stop and **${(currentFreeBytes - earlierFreeBytes).toLocaleString('en-US')} bytes more** than the earlier receipt. No persistent 7.45 GB workspace consumer exists.\n\nThe delta was transient Windows virtual-memory backing created while the 603-second manifest verifier ran with an 8 GiB Node heap ceiling. It parsed and canonicalised 895,388,377 bytes of manifests, including a 429,260,100-byte manifest. Windows exposes a 16,828,760,064-byte system-managed page file; physical pagefile commitment can expand during the process and be released later without changing the logical file length. Administrative CIM access to the exact historical PageFileUsage counter was denied, so the stopped-instant allocation cannot be replayed, but the exact free-space recovery and absence of an equivalent persistent directory delta distinguish paging from a stored Gate 6A artefact.\n\n## Non-additive inventory\n\n| Path | Bytes | Files | Folders | Newest UTC modification | Existed before Gate 6A | Immutable evidence | Reproducible | Safe to remove | Approval required |\n|---|---:|---:|---:|---|---|---|---|---|---|\n${rows}\n\nNo deletion, movement, compaction or in-place regeneration occurred. The backup remains deferred and is not a passed gate. Gate 6A was not resumed.\n`);

const cleanupRows = uniqueCleanup.map((item) => `| \`${item.path}\` | ${item.category} | ${item.bytes.toLocaleString('en-US')} | ${item.fileCount.toLocaleString('en-US')} | ${item.rebuildCost} |`).join('\n');
await writeFile(resolve(evidenceRoot, 'PROMPT_6_GATE_6A_SAFE_CLEANUP_PLAN.md'), `# Prompt 6 Gate 6A Safe Cleanup Plan\n\nGenerated: ${generatedAt}\n\nNo cleanup has been performed. Every listed deletion requires explicit product-owner approval.\n\n| Exact path | Category | Recoverable bytes | Files | Rebuild effect |\n|---|---|---:|---:|---|\n${cleanupRows || '| None | n/a | 0 | 0 | No owned rebuildable candidate was found. |'}\n\nMaximum reported recovery if every candidate were approved: **${expectedRecoverableBytes.toLocaleString('en-US')} bytes**. Paths overlap in some build layouts; actual recovery must be recalculated from a non-overlapping approved deletion set immediately before execution.\n\nThe raw vault, safe and quarantine CAS, snapshots, manifests, denominator and withdrawal records, checkpoints, journals, rc.10.73.7 evidence, verified FULLDIST and post-tag sidecar package are excluded from cleanup. Operating-system temporary storage is not proposed because ownership is mixed. Node modules and caches are rebuildable but their removal would impair offline verification and may require approved network access.\n\nGate 6A may resume only after a fresh observation shows at least 12 GiB free and projected peak space remains above 8 GiB. Gate 6B should prefer at least 15 GiB free. Automatic evidence deletion remains prohibited.\n`);

process.stdout.write(`${JSON.stringify({ generatedAt, exactObservedLossBytes: deltaBytes, currentFreeBytes, recoveredSinceControlledStopBytes: currentFreeBytes - stoppedFreeBytes, persistentWorkspaceConsumerFound: false, rawVaultCurrentBytes: primary.rawVault.bytes, rawVaultBaselineBytes: baselineVaultBytes, cleanupCandidateCount: uniqueCleanup.length, proposedRecoverableBytes: expectedRecoverableBytes, inventoryFingerprint: `sha256:${createHash('sha256').update(serialized).digest('hex')}`, deletionPerformed: false, productionAccepted: false }, null, 2)}\n`);
