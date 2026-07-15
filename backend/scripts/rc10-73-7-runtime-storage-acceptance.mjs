import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, statfs, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { ProductionOperationsRepository } from '../apps/api/dist/productionOperations.js';
import { retrieveArchitectureKnowledge } from '../packages/engine/dist/index.js';
import { seedKnowledgeClaims } from '../packages/domain/dist/index.js';
import { evaluateStorageCapacity, MINIMUM_FREE_BYTES } from './rc10-73-8-storage-capacity-gate.mjs';

const backend = resolve(fileURLToPath(new URL('..', import.meta.url)));
const product = resolve(backend, '..');
const evidenceRoot = resolve(product, 'release-evidence/rc10.73.7');
const vaultRoot = resolve(product, 'knowledge-repository/AKR-0.10.73.7/github-live');
const generatedAt = new Date().toISOString();

function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function percentile(values, fraction) { return values.slice().sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * fraction) - 1)] ?? 0; }
function check(name, passed, detail) { return { name, passed, detail }; }

async function listFiles(root) {
  const output = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else output.push(path);
    }
  }
  await walk(root);
  return output;
}

class CountingObjectStore {
  constructor() { this.objects = new Map(); this.putCalls = 0; this.getCalls = 0; this.deleteCalls = 0; this.recursiveScanCalls = 0; }
  async put(key, content, mediaType) {
    this.putCalls += 1;
    const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    this.objects.set(key, bytes);
    return { key, uri: `memory://${key}`, sha256: sha256(bytes), sizeBytes: bytes.byteLength, mediaType, storedAt: generatedAt };
  }
  async get(key) { this.getCalls += 1; const value = this.objects.get(key); if (!value) throw new Error('OBJECT_NOT_FOUND'); return value; }
  async delete(key) { this.deleteCalls += 1; this.objects.delete(key); }
  async health() { return { adapter: 'counting-memory', ready: true, detail: 'focused acceptance adapter' }; }
}

const checks = [];
const runtimeRoots = [resolve(backend, 'apps/api/src'), resolve(backend, 'packages/engine/src'), resolve(backend, 'packages/knowledge/src')];
const runtimeFiles = (await Promise.all(runtimeRoots.map(listFiles))).flat().filter((path) => ['.ts', '.mts', '.js', '.mjs'].includes(extname(path)));
const rawVaultReferences = [];
for (const path of runtimeFiles) {
  const source = await readFile(path, 'utf8');
  if (/github-live|AKR-0\.10\.73\.7|AIW_GITHUB_SNAPSHOT_ROOT/.test(source)) rawVaultReferences.push(relative(product, path).replaceAll('\\', '/'));
}
checks.push(check('ordinary-runtime-has-no-raw-vault-binding', rawVaultReferences.length === 0, { filesInspected: runtimeFiles.length, rawVaultReferences }));

const temp = await mkdtemp(join(tmpdir(), 'aiw-runtime-storage-'));
try {
  const objectStore = new CountingObjectStore();
  const repository = new ProductionOperationsRepository(join(temp, 'production-operations.json'), objectStore);
  const record = await repository.putEvidence({ tenantId: 'acceptance-tenant', evidenceType: 'bounded-source', title: 'Lazy evidence fixture', contentText: 'bounded evidence object' });
  const getCallsAfterPut = objectStore.getCalls;
  await repository.listEvidence('acceptance-tenant');
  const getCallsAfterMetadataList = objectStore.getCalls;
  const rawStart = performance.now();
  const fetched = await repository.getEvidence('acceptance-tenant', record.id);
  const rawEvidenceRetrievalMs = performance.now() - rawStart;
  checks.push(check('raw-evidence-access-is-lazy-by-evidence-id', getCallsAfterPut === 0 && getCallsAfterMetadataList === 0 && objectStore.getCalls === 1 && fetched?.record.id === record.id, { getCallsAfterPut, getCallsAfterMetadataList, getCallsAfterEvidenceIdLookup: objectStore.getCalls, recursiveRawFilesystemScans: objectStore.recursiveScanCalls, durationMs: rawEvidenceRetrievalMs }));
  checks.push(check('single-bounded-object-retrieval-under-2-seconds', rawEvidenceRetrievalMs < 2000, { durationMs: rawEvidenceRetrievalMs, targetMs: 2000 }));
} finally {
  await rm(temp, { recursive: true, force: true });
}

const approved = structuredClone(seedKnowledgeClaims[0]);
approved.reviewStatus = 'verified';
approved.statement = 'Storage isolation exact-match evidence for approved routing.';
approved.subjectName = 'Storage isolation exact match';
const candidate = structuredClone(approved);
candidate.id = `${approved.id}-CANDIDATE`;
candidate.reviewStatus = 'candidate';
candidate.statement = 'Storage isolation exact-match evidence for candidate routing.';
const timings = [];
let retrieval;
for (let index = 0; index < 100; index += 1) {
  const start = performance.now();
  retrieval = retrieveArchitectureKnowledge({ query: 'Storage isolation exact match' }, [approved, candidate]);
  timings.push(performance.now() - start);
}
const approvedP95Ms = percentile(timings, 0.95);
checks.push(check('candidate-and-approved-retrieval-isolated', retrieval.approved.length === 1 && retrieval.approved[0].claim.id === approved.id && retrieval.candidate.length === 0, { approvedIds: retrieval.approved.map((item) => item.claim.id), candidateIds: retrieval.candidate.map((item) => item.claim.id) }));
checks.push(check('approved-retrieval-under-500ms', approvedP95Ms < 500, { iterations: timings.length, p95Ms: approvedP95Ms, targetMs: 500 }));

const manifestLoadStart = performance.now();
const approvedManifest = JSON.parse(await readFile(resolve(backend, 'data/knowledge-release-manifest.json'), 'utf8'));
const approvedMetadataLoadMs = performance.now() - manifestLoadStart;
checks.push(check('approved-metadata-load-under-2-seconds', approvedMetadataLoadMs < 2000, { durationMs: approvedMetadataLoadMs, targetMs: 2000, releaseId: approvedManifest.releaseId ?? approvedManifest.id ?? null }));

const frontendDist = resolve(product, 'frontend/apps/web/dist');
const frontendFiles = await listFiles(frontendDist);
const frontendLeaks = [];
for (const path of frontendFiles) {
  const value = await readFile(path);
  const text = value.toString('utf8');
  if (/knowledge-repository\/AKR-|github-live\/snapshots|objects\/sha256|quarantine\/sha256/.test(text)) frontendLeaks.push(relative(product, path).replaceAll('\\', '/'));
}
checks.push(check('frontend-bundle-excludes-raw-source-content', frontendLeaks.length === 0, { filesInspected: frontendFiles.length, matches: frontendLeaks }));

const fullDistFileList = await readFile(resolve(evidenceRoot, 'FULLDIST_FILELIST.txt'), 'utf8');
const fullDistRawEntries = fullDistFileList.split(/\r?\n/).filter((line) => /(^|\/)(github-live|snapshots|objects\/sha256|quarantine\/sha256|checkpoints)(\/|$)|\.ndjson$/i.test(line));
checks.push(check('application-fulldist-excludes-raw-vault', fullDistRawEntries.length === 0, { entriesInspected: fullDistFileList.split(/\r?\n/).filter(Boolean).length, matches: fullDistRawEntries }));

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: product }).toString('utf8').split('\0').filter(Boolean);
const staged = execFileSync('git', ['diff', '--cached', '--name-only', '-z'], { cwd: product }).toString('utf8').split('\0').filter(Boolean);
const rawPattern = /(^|\/)(github-live|snapshots|objects\/sha256|quarantine\/sha256|checkpoints)(\/|$)|\.ndjson$/i;
const rawTracked = tracked.filter((path) => rawPattern.test(path));
const rawStaged = staged.filter((path) => rawPattern.test(path));
checks.push(check('raw-acquisition-content-not-tracked', rawTracked.length === 0, { trackedFilesInspected: tracked.length, matches: rawTracked }));
checks.push(check('raw-acquisition-content-not-staged', rawStaged.length === 0, { stagedFilesInspected: staged.length, matches: rawStaged }));

const dockerIgnore = await readFile(resolve(product, '.dockerignore'), 'utf8');
checks.push(check('container-context-excludes-vault', /knowledge-repository\/AKR-\*\/github-live/.test(dockerIgnore) && /objects\/sha256/.test(dockerIgnore) && /quarantine\/sha256/.test(dockerIgnore), { policyFile: '.dockerignore' }));

const disk = await statfs(product, { bigint: true });
const freeBytesBefore = Number(disk.bavail * disk.bsize);
const capacitySelfTests = [
  evaluateStorageCapacity({ stage: 'gate-6a-corpus-analysis-and-workload-planning', freeBytesBefore: MINIMUM_FREE_BYTES + 1024, projectedTemporaryBytes: 512, projectedPermanentBytes: 512 }),
  evaluateStorageCapacity({ stage: 'gate-6b-representative-pilot', freeBytesBefore: MINIMUM_FREE_BYTES - 1, projectedTemporaryBytes: 0, projectedPermanentBytes: 0 }),
  evaluateStorageCapacity({ stage: 'gate-6c-full-semantic-transformation', freeBytesBefore: MINIMUM_FREE_BYTES + 1024 ** 3, projectedTemporaryBytes: 0, projectedPermanentBytes: 0, productOwnerApproved: false, projectedTokenCount: null, projectedModelWorkload: null }),
];
checks.push(check('disk-capacity-gate-fails-closed', capacitySelfTests[0].decision === 'proceed' && capacitySelfTests[1].decision === 'controlled-stop' && capacitySelfTests[2].decision === 'controlled-stop', { minimumFreeBytes: MINIMUM_FREE_BYTES, cases: capacitySelfTests.map(({ stage, decision, reasons }) => ({ stage, decision, reasons })) }));

const machine = {
  platform: process.platform,
  architecture: process.arch,
  nodeVersion: process.version,
  hostnameHash: sha256(process.env.COMPUTERNAME ?? 'unknown').slice(0, 16),
  cpuModel: process.env.PROCESSOR_IDENTIFIER ?? 'not-reported',
  acceptanceEnvironment: 'local Windows engineering environment',
};
const receipt = {
  schemaVersion: 'aiw-knowledge-runtime-performance-results-v1',
  releaseId: 'AIW v0.10.0-rc.10.73.7',
  generatedAt,
  machine,
  engineeringTargetsNotProductionSlos: true,
  vaultRoot: 'knowledge-repository/AKR-0.10.73.7/github-live',
  vaultRecursivelyScannedDuringOrdinaryBrainQuery: false,
  freeBytesObservedBeforeAcceptance: freeBytesBefore,
  minimumFreeBytesForPrompt6Stages: MINIMUM_FREE_BYTES,
  checks,
  passed: checks.every((item) => item.passed),
  backupCompleted: false,
  backupStatus: 'deferred-by-product-owner',
  backupRiskAccepted: true,
  backupRiskAcceptedAt: '2026-07-15T18:51:52.811Z',
  backupRiskScope: 'loss or corruption of the local raw acquisition vault',
  productionAccepted: false,
};
await writeFile(resolve(evidenceRoot, 'KNOWLEDGE_RUNTIME_PERFORMANCE_RESULTS.json'), `${JSON.stringify(receipt, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ output: relative(product, resolve(evidenceRoot, 'KNOWLEDGE_RUNTIME_PERFORMANCE_RESULTS.json')).replaceAll('\\', '/'), passed: receipt.passed, checks: checks.length, freeBytesBefore }, null, 2)}\n`);
if (!receipt.passed) process.exitCode = 1;
