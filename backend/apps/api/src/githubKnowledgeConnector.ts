import { createHash } from 'node:crypto';
import { createKnowledgeSnapshot, sourcePathAllowed } from '@aiw/engine';
import { knowledgeRepositoryConnectors, type KnowledgeSourceFile, type KnowledgeSourceSnapshot } from '@aiw/domain';
import { createKnowledgeObjectStore, type KnowledgeObjectStore, type StoredKnowledgeObject } from './knowledgeObjectStore.js';

interface GitHubTreeEntry {
  path?: string;
  mode?: string;
  type?: 'blob' | 'tree' | 'commit';
  sha?: string;
  size?: number;
  url?: string;
}
interface GitHubTreeResponse { sha: string; truncated?: boolean; tree: GitHubTreeEntry[]; }
interface GitHubCommitResponse { sha: string; }
interface GitHubBlobResponse { content?: string; encoding?: string; size?: number; }

export interface GitHubKnowledgeRefreshPreview {
  connectorId: string;
  repository: string;
  revision: string;
  defaultBranch: string;
  snapshot: KnowledgeSourceSnapshot;
  eligibleFiles: number;
  ignoredFiles: number;
  truncated: boolean;
  rateLimitRemaining?: number;
  warnings: string[];
  publicationStatus: 'quarantined-only';
}

export interface GitHubKnowledgeRefreshResult extends GitHubKnowledgeRefreshPreview {
  storedObjects: StoredKnowledgeObject[];
  quarantine: {
    passed: boolean;
    findings: Array<{ path: string; severity: 'warning'|'blocking'; code: string; detail: string }>;
  };
  storageAdapter: string;
}

function mediaType(path: string): string {
  if (/\.mdx?$/i.test(path)) return 'text/markdown';
  if (/\.(ya?ml)$/i.test(path)) return 'application/yaml';
  if (/\.json$/i.test(path)) return 'application/json';
  if (/\.(ts|tsx|js|jsx|java|kt|py|go|cs|rb|tf|bicep)$/i.test(path)) return 'text/plain';
  if (/\.(puml|plantuml|dsl|d2|calm)$/i.test(path)) return 'text/plain';
  return 'application/octet-stream';
}

function headers(token?: string): Record<string,string> {
  const result: Record<string,string> = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': process.env.AIW_GITHUB_API_VERSION || '2026-03-10',
    'user-agent': 'AIW-Knowledge-Fabric/0.10.0-rc.10.73.6',
  };
  if (token) result.authorization = `Bearer ${token}`;
  return result;
}

async function json<T>(fetcher: typeof fetch, url: string, token?: string): Promise<{ body: T; response: Response }> {
  const response = await fetcher(url, { headers: headers(token), signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`GITHUB_REQUEST_FAILED_${response.status}`);
  return { body: await response.json() as T, response };
}

function connectorFor(id: string) {
  const connector = knowledgeRepositoryConnectors.find((item) => item.id === id);
  if (!connector) throw new Error('UNKNOWN_KNOWLEDGE_CONNECTOR');
  if (connector.ingestionMode === 'discovery-only') throw new Error('DISCOVERY_SOURCE_CANNOT_BE_INGESTED');
  if (connector.lifecycleStatus === 'frozen' || connector.lifecycleStatus === 'deprecated') throw new Error('KNOWLEDGE_CONNECTOR_NOT_ACTIVE');
  return connector;
}

async function completeTree(fetcher: typeof fetch, base: string, commitSha: string, token: string | undefined, maxTreeCalls = Number(process.env.AIW_GITHUB_MAX_TREE_CALLS || 2000)): Promise<GitHubTreeEntry[]> {
  const root = await json<GitHubTreeResponse>(fetcher, `${base}/git/trees/${encodeURIComponent(commitSha)}`, token);
  const blobs: GitHubTreeEntry[] = [];
  const queue: Array<{ prefix: string; sha: string }> = root.body.tree.filter((entry) => entry.type === 'tree' && entry.sha && entry.path).map((entry) => ({ prefix: entry.path!, sha: entry.sha! }));
  blobs.push(...root.body.tree.filter((entry) => entry.type === 'blob' && typeof entry.path === 'string').map((entry) => ({ ...entry, path: entry.path! })));
  let calls = 1;
  while (queue.length) {
    if (calls >= maxTreeCalls) throw new Error('GITHUB_TREE_TRAVERSAL_LIMIT_REACHED');
    const current = queue.shift()!;
    const result = await json<GitHubTreeResponse>(fetcher, `${base}/git/trees/${encodeURIComponent(current.sha)}`, token);
    calls += 1;
    for (const entry of result.body.tree) {
      if (!entry.path) continue;
      const path = `${current.prefix}/${entry.path}`;
      if (entry.type === 'blob') blobs.push({ ...entry, path });
      if (entry.type === 'tree' && entry.sha) queue.push({ prefix: path, sha: entry.sha });
    }
  }
  return blobs;
}

async function resolveTree(fetcher: typeof fetch, base: string, commitSha: string, token?: string): Promise<{ blobs: GitHubTreeEntry[]; truncated: boolean; etag?: string; remaining?: number }> {
  const recursive = await json<GitHubTreeResponse>(fetcher, `${base}/git/trees/${encodeURIComponent(commitSha)}?recursive=1`, token);
  let blobs = recursive.body.tree.filter((entry) => entry.type === 'blob' && typeof entry.path === 'string' && typeof entry.sha === 'string');
  if (recursive.body.truncated) blobs = await completeTree(fetcher, base, commitSha, token);
  const etag = recursive.response.headers.get('etag') ?? undefined;
  const remainingRaw = recursive.response.headers.get('x-ratelimit-remaining');
  return { blobs, truncated: recursive.body.truncated === true, ...(etag ? { etag } : {}), ...(remainingRaw !== null ? { remaining: Number(remainingRaw) } : {}) };
}

export async function previewGitHubKnowledgeRefresh(input: {
  connectorId: string;
  token?: string;
  fetchImpl?: typeof fetch;
  now?: string;
}): Promise<GitHubKnowledgeRefreshPreview> {
  if (process.env.AIW_ENABLE_GITHUB_KNOWLEDGE !== 'true') throw new Error('GITHUB_KNOWLEDGE_REFRESH_DISABLED');
  const connector = connectorFor(input.connectorId);
  const fetcher = input.fetchImpl ?? fetch;
  const base = `https://api.github.com/repos/${connector.repository}`;
  const commitResult = await json<GitHubCommitResponse>(fetcher, `${base}/commits/${encodeURIComponent(connector.defaultBranch)}`, input.token);
  const tree = await resolveTree(fetcher, base, commitResult.body.sha, input.token);
  const eligible = tree.blobs.filter((entry) => sourcePathAllowed(connector, entry.path!) && (entry.size ?? 0) <= connector.maxFileBytes);
  const files: KnowledgeSourceFile[] = eligible.map((entry) => ({ path: entry.path!, blobSha: entry.sha!, sizeBytes: entry.size ?? 0, mediaType: mediaType(entry.path!) }));
  const warnings: string[] = [];
  if (tree.truncated) warnings.push('GitHub truncated the recursive tree; AIW completed path-safe non-recursive traversal before selecting files.');
  if (eligible.length > connector.maxFilesPerRefresh) warnings.push('Governed scope exceeds one batch; AIW will process every eligible file through resumable batches.');
  if (!input.token) warnings.push('Unauthenticated GitHub API access is rate-limited; production refreshes should use a least-privilege GitHub App or token.');
  if (connector.license.reviewStatus !== 'verified') warnings.push('License review is still required before content can be published or redistributed.');
  const snapshot = createKnowledgeSnapshot({ connectorId: connector.id, repositoryRevision: commitResult.body.sha, fetchedAt: input.now ?? new Date().toISOString(), files, ...(tree.etag ? { etag: tree.etag } : {}) });
  const result: GitHubKnowledgeRefreshPreview = {
    connectorId: connector.id, repository: connector.repository, revision: commitResult.body.sha, defaultBranch: connector.defaultBranch, snapshot,
    eligibleFiles: files.length, ignoredFiles: Math.max(0, tree.blobs.length - files.length), truncated: tree.truncated, warnings, publicationStatus: 'quarantined-only',
    ...(tree.remaining !== undefined ? { rateLimitRemaining: tree.remaining } : {}),
  };
  return result;
}

function decodeBlob(blob: GitHubBlobResponse): string {
  if (blob.encoding !== 'base64' || typeof blob.content !== 'string') throw new Error('GITHUB_BLOB_ENCODING_NOT_SUPPORTED');
  return Buffer.from(blob.content.replace(/\n/g, ''), 'base64').toString('utf8');
}

function quarantineFindings(path: string, content: string): Array<{ path: string; severity: 'warning'|'blocking'; code: string; detail: string }> {
  const findings: Array<{ path: string; severity: 'warning'|'blocking'; code: string; detail: string }> = [];
  if (content.includes('\u0000')) findings.push({ path, severity: 'blocking', code: 'BINARY_CONTENT', detail: 'NUL bytes indicate binary or malformed text content.' });
  const secretPatterns: Array<[RegExp,string]> = [
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'PRIVATE_KEY_MATERIAL'],
    [/\bgh[pousr]_[A-Za-z0-9_]{30,}\b/, 'GITHUB_TOKEN_SHAPE'],
    [/\bAKIA[0-9A-Z]{16}\b/, 'AWS_ACCESS_KEY_SHAPE'],
  ];
  for (const [pattern, code] of secretPatterns) if (pattern.test(content)) findings.push({ path, severity: 'blocking', code, detail: 'Credential-shaped content requires source-owner review and must not be persisted.' });
  const promptPatterns = [/ignore (?:all|any|the) previous instructions/i, /system prompt/i, /you are chatgpt/i, /developer message/i];
  if (promptPatterns.some((pattern) => pattern.test(content))) findings.push({ path, severity: 'warning', code: 'PROMPT_INJECTION_TEXT', detail: 'Instruction-shaped text is retained only as untrusted evidence and cannot control AIW prompts.' });
  return findings;
}

export async function refreshGitHubKnowledge(input: {
  connectorId: string;
  token?: string;
  fetchImpl?: typeof fetch;
  now?: string;
  store?: KnowledgeObjectStore;
}): Promise<GitHubKnowledgeRefreshResult> {
  const connector = connectorFor(input.connectorId);
  const fetcher = input.fetchImpl ?? fetch;
  const store = input.store ?? createKnowledgeObjectStore();
  const preview = await previewGitHubKnowledgeRefresh(input);
  const base = `https://api.github.com/repos/${connector.repository}`;
  const findings: Array<{ path: string; severity: 'warning'|'blocking'; code: string; detail: string }> = [];
  const storedObjects: StoredKnowledgeObject[] = [];
  const hydratedFiles: KnowledgeSourceFile[] = [];
  for (const file of preview.snapshot.files) {
    const result = await json<GitHubBlobResponse>(fetcher, `${base}/git/blobs/${encodeURIComponent(file.blobSha)}`, input.token);
    const content = decodeBlob(result.body);
    if (Buffer.byteLength(content, 'utf8') > connector.maxFileBytes) {
      findings.push({ path: file.path, severity: 'blocking', code: 'FILE_SIZE_CHANGED', detail: 'Fetched content exceeds the governed file-size limit.' });
      continue;
    }
    const fileFindings = quarantineFindings(file.path, content); findings.push(...fileFindings);
    if (fileFindings.some((finding) => finding.severity === 'blocking')) continue;
    const key = `snapshots/${connector.id}/${preview.snapshot.id}/files/${file.path}`;
    storedObjects.push(await store.put(key, content, file.mediaType));
    hydratedFiles.push({ ...file, content });
  }
  const passed = !findings.some((finding) => finding.severity === 'blocking') && hydratedFiles.length === preview.snapshot.files.length;
  const hydratedSnapshot: KnowledgeSourceSnapshot = { ...preview.snapshot, files: hydratedFiles, status: passed ? 'quarantined' : 'rejected' };
  const manifest = {
    schemaVersion: 'aiw-knowledge-snapshot-v2', connectorId: connector.id, repository: connector.repository, revision: preview.revision,
    snapshot: { ...hydratedSnapshot, files: hydratedFiles.map(({ content: _content, ...file }) => file) }, quarantine: { passed, findings },
    objectHashes: storedObjects.map((item) => ({ key: item.key, sha256: item.sha256, sizeBytes: item.sizeBytes })),
    manifestSha256: createHash('sha256').update(JSON.stringify({ connectorId: connector.id, revision: preview.revision, files: storedObjects.map((item) => [item.key, item.sha256]) })).digest('hex'),
  };
  storedObjects.push(await store.put(`snapshots/${connector.id}/${preview.snapshot.id}/manifest.json`, JSON.stringify(manifest, null, 2), 'application/json'));
  const health = await store.health();
  return { ...preview, snapshot: hydratedSnapshot, storedObjects, quarantine: { passed, findings }, storageAdapter: health.adapter };
}
