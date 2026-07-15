import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { buildBoundedEvidencePassages, buildCrossFileArchitectureGroups, detectArchitectureArtefact, opaquePreservableExtensions, parserFor, prohibitedExecutableExtensions, sha256Prefixed, stableStringify } from './rc10-73-7-acquisition-foundation.mjs';

export const DEFAULT_GITHUB_API_VERSION = '2026-03-10';
export const ACQUISITION_SCHEMA_VERSION = 'aiw-github-acquisition-v4';

const sleep = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const sha1 = (value) => createHash('sha1').update(value).digest('hex');
const canonicalJson = stableStringify;

export function gitBlobSha(content) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return sha1(Buffer.concat([Buffer.from(`blob ${buffer.length}\0`), buffer]));
}

export function globToRegExp(glob) {
  let pattern = '^';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    const next = glob[index + 1];
    if (char === '*' && next === '*') {
      const after = glob[index + 2];
      if (after === '/') { pattern += '(?:.*/)?'; index += 2; }
      else { pattern += '.*'; index += 1; }
    } else if (char === '*') pattern += '[^/]*';
    else if (char === '?') pattern += '[^/]';
    else if ('\\.^$+()[]{}|'.includes(char)) pattern += `\\${char}`;
    else pattern += char;
  }
  return new RegExp(`${pattern}$`, 'i');
}

export function pathAllowed(path, allowedPaths = [], deniedPaths = []) {
  const normalized = path.replace(/^\/+/, '');
  if (deniedPaths.some((glob) => globToRegExp(glob).test(normalized))) return false;
  return allowedPaths.length === 0 || allowedPaths.some((glob) => globToRegExp(glob).test(normalized));
}

export function mediaType(path) {
  const ext = extname(path).toLowerCase();
  return ({
    '.md': 'text/markdown', '.mdx': 'text/markdown', '.adoc': 'text/asciidoc', '.txt': 'text/plain', '.puml': 'text/plain', '.c4': 'text/plain', '.dsl': 'text/plain',
    '.json': 'application/json', '.yaml': 'application/yaml', '.yml': 'application/yaml', '.xml': 'application/xml', '.tf': 'text/plain', '.bicep': 'text/plain',
    '.java': 'text/x-java-source', '.kt': 'text/x-kotlin', '.ts': 'text/typescript', '.js': 'text/javascript', '.py': 'text/x-python', '.sh': 'text/x-shellscript',
    '.svg': 'image/svg+xml', '.drawio': 'application/vnd.jgraph.mxfile', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf', '.vsdx': 'application/vnd.ms-visio.drawing',
    '.proto': 'text/x-protobuf', '.graphql': 'application/graphql', '.gql': 'application/graphql', '.avsc': 'application/json', '.hcl': 'text/x-hcl',
  })[ext] ?? 'application/octet-stream';
}

export function quarantineScan(path, content, { opaque = false } = {}) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const text = opaque ? '' : buffer.toString('utf8');
  const findings = [];
  const add = (severity, code, detail) => findings.push({ severity, code, detail });
  if (!opaque && text.includes('\u0000')) add('blocking', 'BINARY_OR_MALFORMED_TEXT', 'NUL bytes are not accepted as text evidence.');
  if (buffer.length === 0) add('warning', 'EMPTY_FILE', 'The file contains no extractable content.');
  if (opaque) add('warning', 'OPAQUE_ARCHITECTURE_ARTEFACT', 'The source format is preserved without text flattening and requires a specialist parser and security review.');
  if (prohibitedExecutableExtensions.has(extname(path).toLowerCase())) add('blocking', 'EXECUTABLE_CONTENT_PROHIBITED', 'Executable or compiled repository content cannot enter the safe acquisition snapshot.');
  const secrets = [
    [/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/i, 'PRIVATE_KEY_MATERIAL'],
    [/\bgh[pousr]_[A-Za-z0-9_]{30,}\b/g, 'GITHUB_TOKEN_SHAPE'],
    [/\bgithub_pat_[A-Za-z0-9_]{30,}\b/g, 'GITHUB_PAT_SHAPE'],
    [/\bAKIA[0-9A-Z]{16}\b/g, 'AWS_ACCESS_KEY_SHAPE'],
    [/\bAIza[0-9A-Za-z\-_]{30,}\b/g, 'GOOGLE_API_KEY_SHAPE'],
    [/\b(?:sk|rk)-(?:live|test)-[0-9A-Za-z]{16,}\b/g, 'SECRET_KEY_SHAPE'],
    [/\bBearer\s+[A-Za-z0-9._~+\/-]{20,}=*\b/gi, 'BEARER_TOKEN_SHAPE'],
    [/\b(?:password|passwd|secret|api[_-]?key)\s*[:=]\s*["']?[^\s"']{12,}/gi, 'INLINE_CREDENTIAL_SHAPE'],
    [/(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:@/]+:[^\s@/]+@/gi, 'CREDENTIAL_BEARING_DATABASE_URL'],
  ];
  for (const [pattern, code] of secrets) {
    pattern.lastIndex = 0;
    if (!opaque && pattern.test(text)) add('blocking', code, 'Credential-shaped source content cannot enter the safe knowledge snapshot.');
  }
  const promptInjection = [
    /ignore\s+(?:all|any|the)\s+previous\s+instructions/i,
    /reveal\s+(?:the\s+)?system\s+prompt/i,
    /you\s+are\s+chatgpt/i,
    /developer\s+message/i,
    /override\s+(?:the\s+)?(?:system|policy|guardrail)/i,
  ];
  if (!opaque && promptInjection.some((pattern) => pattern.test(text))) add('warning', 'INSTRUCTION_SHAPED_CONTENT', 'Instruction-shaped text is treated only as untrusted evidence.');
  if (!opaque && /<script\b[^>]*>[\s\S]*?<\/script>/i.test(text)) add('warning', 'EMBEDDED_SCRIPT', 'Embedded scripts are retained as inert text and never executed.');
  const longestLine = opaque ? 0 : text.split(/\r?\n/).reduce((maximum, line) => Math.max(maximum, line.length), 0);
  if (longestLine > 100_000) add('warning', 'POSSIBLE_GENERATED_OR_MINIFIED_CONTENT', 'Very long lines reduce extraction quality and require review.');
  if (/\.(?:zip|gz|tgz|7z|rar)$/i.test(path)) add('blocking', 'ARCHIVE_CONTAINER_REQUIRES_REVIEW', 'Nested archive content is quarantined and is never expanded or executed automatically.');
  return findings;
}

function splitSentences(text) {
  return text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map((value) => value.trim()).filter(Boolean);
}

function claimTypeFor(statement) {
  const value = statement.toLowerCase();
  if (/must not|shall not|prohibit|forbid|avoid\b/.test(value)) return 'constraint';
  if (/must|shall|required|requires|need to/.test(value)) return 'obligation';
  if (/risk|failure|drawback|trade-?off|limitation/.test(value)) return 'risk';
  if (/security|authentication|authorization|encrypt|threat/.test(value)) return 'security-control';
  if (/deploy|runtime|cluster|node|region|zone/.test(value)) return 'deployment';
  if (/interface|api|event|message|protocol|schema/.test(value)) return 'interface';
  if (/test|verify|validate|assert|fitness/.test(value)) return 'fitness-test';
  if (/pattern|architecture style|tactic/.test(value)) return 'pattern';
  return 'guidance';
}

export function parseArchitectureKnowledge({ connectorId, repository, revision, path, content }) {
  const lines = content.split(/\r?\n/);
  let heading = '';
  const sections = [];
  let current = { heading: '', lineStart: 1, lines: [] };
  const flush = (lineEnd) => {
    if (current.lines.some((line) => line.trim())) sections.push({ heading: current.heading, lineStart: current.lineStart, lineEnd, text: current.lines.join('\n').trim() });
  };
  lines.forEach((line, index) => {
    const markdown = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    const asciidoc = line.match(/^={1,6}\s+(.+?)\s*$/);
    if (markdown || asciidoc) {
      flush(index);
      heading = (markdown?.[1] ?? asciidoc?.[1] ?? '').trim();
      current = { heading, lineStart: index + 2, lines: [] };
    } else current.lines.push(line);
  });
  flush(lines.length);

  const candidates = [];
  for (const section of sections.length ? sections : [{ heading: '', lineStart: 1, lineEnd: lines.length, text: content }]) {
    for (const sentence of splitSentences(section.text)) {
      if (sentence.length < 25 || sentence.length > 900) continue;
      if (!/\b(?:must|shall|should|requires?|recommended|avoid|supports?|enables?|prevents?|ensures?|risk|limitation|trade-?off|pattern|architecture|interface|event|deployment|security|reliability|scalability|availability|latency|consistency|test|validate)\b/i.test(sentence)) continue;
      const excerptHash = `sha256:${sha256(sentence)}`;
      candidates.push({
        id: `KCLM-${sha256(`${connectorId}|${revision}|${path}|${section.heading}|${sentence}`).slice(0, 24)}`,
        connectorId, repository, repositoryRevision: revision, sourcePath: path, heading: section.heading || undefined,
        lineStart: section.lineStart, lineEnd: section.lineEnd, excerptHash, boundedExcerpt: sentence,
        claimType: claimTypeFor(sentence), statement: sentence, status: 'candidate', extractor: 'aiw-deterministic-document-parser-1.0',
      });
      if (candidates.length >= 200) break;
    }
    if (candidates.length >= 200) break;
  }
  const sectionIndex = sections.map(({ text, ...section }) => ({ ...section, contentHash: `sha256:${sha256(text)}` }));
  const evidencePassages = buildBoundedEvidencePassages({ connectorId, repository, commitSha: revision, path, content, sections: sectionIndex });
  return { parserVersion: parserFor(path), sections: sectionIndex, evidencePassages, candidates };
}

function headersToObject(headers) {
  const output = {};
  for (const key of ['etag', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'x-ratelimit-resource', 'x-github-request-id', 'location', 'retry-after', 'deprecation', 'sunset']) {
    const value = headers.get(key); if (value !== null) output[key] = value;
  }
  return output;
}

export class GitHubRestClient {
  constructor({ token, apiBase = 'https://api.github.com', apiVersion = DEFAULT_GITHUB_API_VERSION, fetchImpl = fetch, userAgent = 'AIW-Knowledge-Fabric/0.10.0-rc.10.73.6', maxRetries = 5, requestTimeoutMs = 60_000 } = {}) {
    this.token = token; this.apiBase = apiBase.replace(/\/$/, ''); this.apiVersion = apiVersion; this.fetchImpl = fetchImpl; this.userAgent = userAgent; this.maxRetries = maxRetries; this.requestTimeoutMs = requestTimeoutMs;
  }
  headers(extra = {}) {
    return { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': this.apiVersion, 'User-Agent': this.userAgent, ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}), ...extra };
  }
  async request(path, { method = 'GET', etag, expected = [200], body } = {}) {
    const url = `${this.apiBase}${path}`;
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await this.fetchImpl(url, { method, headers: this.headers(etag ? { 'If-None-Match': etag } : {}), ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(this.requestTimeoutMs) });
        const metadata = headersToObject(response.headers);
        const responseMetadata = { url, requestedUrl: url, resolvedUrl: response.url || url, redirected: response.redirected === true };
        if (response.status === 304) return { status: 304, body: undefined, headers: metadata, ...responseMetadata };
        if (expected.includes(response.status)) return { status: response.status, body: await response.json(), headers: metadata, ...responseMetadata };
        const detail = (await response.text()).slice(0, 1000);
        const retryable = response.status === 429 || response.status >= 500 || (response.status === 403 && (metadata['x-ratelimit-remaining'] === '0' || /secondary rate limit/i.test(detail)));
        if (!retryable || attempt === this.maxRetries) throw new Error(`GITHUB_HTTP_${response.status}:${detail}`);
        const retryAfter = Number(metadata['retry-after'] || 0) * 1000;
        const resetAt = Number(metadata['x-ratelimit-reset'] || 0) * 1000;
        const wait = Math.max(retryAfter, resetAt > Date.now() ? resetAt - Date.now() + 1_000 : 0, 1_000 * (2 ** attempt));
        if (metadata['x-ratelimit-remaining'] === '0' && wait > 120_000) throw new Error(`GITHUB_RATE_LIMIT_CONTROLLED_STOP:resetAt=${new Date(resetAt).toISOString()}`);
        await sleep(Math.min(wait, 120_000));
      } catch (error) {
        lastError = error;
        if (attempt === this.maxRetries || (error instanceof Error && /^GITHUB_HTTP_4(?!29)/.test(error.message))) throw error;
        await sleep(Math.min(1_000 * (2 ** attempt), 30_000));
      }
    }
    throw lastError ?? new Error('GITHUB_REQUEST_FAILED');
  }
  repository(repository) { return this.request(`/repos/${repository}`); }
  commit(repository, ref) { return this.request(`/repos/${repository}/commits/${encodeURIComponent(ref)}`); }
  license(repository) { return this.request(`/repos/${repository}/license`, { expected: [200, 404] }); }
  tree(repository, sha, recursive = true) { return this.request(`/repos/${repository}/git/trees/${encodeURIComponent(sha)}${recursive ? '?recursive=1' : ''}`); }
  blob(repository, sha) { return this.request(`/repos/${repository}/git/blobs/${encodeURIComponent(sha)}`); }
  async rawBlob(repository, revision, path) {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const url = `https://raw.githubusercontent.com/${repository}/${encodeURIComponent(revision)}/${encodedPath}`;
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await fetch(url, { headers: { 'User-Agent': this.userAgent, Accept: 'application/octet-stream' }, signal: AbortSignal.timeout(this.requestTimeoutMs) });
        if (response.ok) return { buffer: Buffer.from(await response.arrayBuffer()), status: response.status, url: response.url || url };
        if (response.status < 500 && response.status !== 429) throw new Error(`GITHUB_RAW_HTTP_${response.status}:${repository}:${path}`);
        lastError = new Error(`GITHUB_RAW_HTTP_${response.status}:${repository}:${path}`);
      } catch (error) { lastError = error; }
      if (attempt < this.maxRetries) await sleep(Math.min(1_000 * (2 ** attempt), 30_000));
    }
    throw lastError ?? new Error(`GITHUB_RAW_FETCH_FAILED:${repository}:${path}`);
  }
}

async function completeTree(client, repository, rootSha, maxCalls = 10_000) {
  const root = await client.tree(repository, rootSha, false);
  const queue = [];
  const blobs = [];
  for (const entry of root.body.tree ?? []) {
    if (entry.type === 'tree') queue.push({ prefix: entry.path, sha: entry.sha });
    if (entry.type === 'blob') blobs.push(entry);
  }
  let calls = 1;
  while (queue.length) {
    if (calls >= maxCalls) throw new Error('GITHUB_TREE_TRAVERSAL_LIMIT_REACHED');
    const current = queue.shift();
    const recursive = await client.tree(repository, current.sha, true); calls += 1;
    if (recursive.body.truncated !== true) {
      for (const entry of recursive.body.tree ?? []) if (entry.type === 'blob') blobs.push({ ...entry, path: `${current.prefix}/${entry.path}` });
      continue;
    }
    if (calls >= maxCalls) throw new Error('GITHUB_TREE_TRAVERSAL_LIMIT_REACHED');
    const partition = await client.tree(repository, current.sha, false); calls += 1;
    for (const entry of partition.body.tree ?? []) {
      const path = `${current.prefix}/${entry.path}`;
      if (entry.type === 'tree') queue.push({ prefix: path, sha: entry.sha });
      if (entry.type === 'blob') blobs.push({ ...entry, path });
    }
  }
  return { blobs, calls };
}

export async function resolveRepositoryTree(client, repository, commitSha) {
  const recursive = await client.tree(repository, commitSha, true);
  if (recursive.body.truncated !== true) return { blobs: (recursive.body.tree ?? []).filter((entry) => entry.type === 'blob'), truncated: false, treeCalls: 1, headers: recursive.headers };
  const complete = await completeTree(client, repository, commitSha);
  return { blobs: complete.blobs, truncated: true, treeCalls: complete.calls, headers: recursive.headers };
}

async function readJsonIfExists(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function mapLimit(items, limit, worker) {
  const output = new Array(items.length); let cursor = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, async () => {
    while (true) {
      const index = cursor; cursor += 1; if (index >= items.length) return;
      output[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners); return output;
}

function decodeBlob(body) {
  if (body.encoding !== 'base64' || typeof body.content !== 'string') throw new Error('UNSUPPORTED_GITHUB_BLOB_ENCODING');
  return Buffer.from(body.content.replace(/\s/g, ''), 'base64');
}

export async function acquireRepository({ dossier, outputRoot, token, apiBase, apiVersion, fetchImpl, contentTransport = fetchImpl ? 'api' : 'raw-immutable', concurrency = 4, resume = true, now = new Date().toISOString() }) {
  const connectorId = dossier.connectorId;
  const repository = dossier.repository;
  const policy = dossier.exactIngestionConfiguration ?? {};
  const allowedPaths = policy.allowedPaths ?? dossier.usefulPaths ?? [];
  const deniedPaths = policy.deniedPaths ?? dossier.deniedPaths ?? [];
  const maxFileBytes = Number(policy.maxFileBytes || 750_000);
  const batchSize = Math.max(1, Number(policy.maxFilesPerRefresh || 100));
  const client = new GitHubRestClient({ token, apiBase, apiVersion, fetchImpl });
  const repoResult = await client.repository(repository);
  const resolvedRepository = String(repoResult.body.full_name ?? repository);
  if (resolvedRepository.toLowerCase() !== repository.toLowerCase()) throw new Error(`GITHUB_REPOSITORY_IDENTITY_CHANGED:${repository}:${resolvedRepository}`);
  const branch = String(repoResult.body.default_branch || dossier.identity?.defaultBranch || 'main');
  const commitResult = await client.commit(repository, branch);
  const commitSha = commitResult.body.sha;
  if (typeof commitSha !== 'string' || !/^[0-9a-f]{40}$/i.test(commitSha)) throw new Error(`INVALID_IMMUTABLE_COMMIT_SHA:${repository}:${String(commitSha)}`);
  const licenseResult = await client.license(repository);
  const tree = await resolveRepositoryTree(client, repository, commitSha);
  const allBlobs = tree.blobs.filter((entry) => typeof entry.path === 'string' && typeof entry.sha === 'string');
  const policyEligible = allBlobs.filter((entry) => pathAllowed(entry.path, allowedPaths, deniedPaths));
  const policyExcluded = allBlobs.filter((entry) => !pathAllowed(entry.path, allowedPaths, deniedPaths));
  const eligible = policyEligible.filter((entry) => Number(entry.size ?? 0) <= maxFileBytes);
  const oversized = policyEligible.filter((entry) => Number(entry.size ?? 0) > maxFileBytes);
  const snapshotId = `KSNAP-${connectorId}-${commitSha.slice(0, 12)}`;
  const snapshotRoot = resolve(outputRoot, 'snapshots', connectorId, snapshotId);
  const checkpointPath = resolve(outputRoot, 'checkpoints', `${connectorId}.json`);
  const checkpointJournalPath = resolve(outputRoot, 'checkpoints', `${connectorId}-${commitSha}.ndjson`);
  const previous = resume ? await readJsonIfExists(checkpointPath, { processed: {} }) : { processed: {} };
  const processed = previous.commitSha === commitSha ? { ...(previous.processed ?? {}) } : {};
  let journalExists = false;
  if (resume) {
    try {
      const journal = await readFile(checkpointJournalPath, 'utf8'); journalExists = true;
      for (const line of journal.split(/\r?\n/).filter(Boolean)) {
        const result = JSON.parse(line);
        processed[result.path] = { sha: result.sha, result };
      }
    } catch { /* First v4 journal write or migration from a v3 checkpoint. */ }
  }
  const migratedResults = Object.values(processed).map((item) => item.result).filter(Boolean);
  if (!journalExists && migratedResults.length) {
    await mkdir(dirname(checkpointJournalPath), { recursive: true });
    await appendFile(checkpointJournalPath, `${migratedResults.map((item) => JSON.stringify(item)).join('\n')}\n`);
  }
  const terminalStatuses = new Set(['accepted', 'accepted-opaque', 'quarantined']);
  const pending = eligible.filter((entry) => processed[entry.path]?.sha !== entry.sha || !terminalStatuses.has(processed[entry.path]?.result?.status));
  const fileResults = [];

  for (let offset = 0; offset < pending.length; offset += batchSize) {
    const batch = pending.slice(offset, offset + batchSize);
    const results = await mapLimit(batch, concurrency, async (entry) => {
      try {
        const response = contentTransport === 'raw-immutable' ? await client.rawBlob(repository, commitSha, entry.path) : await client.blob(repository, entry.sha);
        const buffer = response.buffer ?? decodeBlob(response.body);
        if (buffer.length > maxFileBytes) return { path: entry.path, sha: entry.sha, sizeBytes: buffer.length, status: 'rejected', findings: [{ severity: 'blocking', code: 'FILE_SIZE_CHANGED', detail: 'Hydrated blob exceeds governed maximum.' }] };
        const calculated = gitBlobSha(buffer);
        if (calculated !== entry.sha) return { path: entry.path, sha: entry.sha, sizeBytes: buffer.length, status: 'rejected', findings: [{ severity: 'blocking', code: 'GIT_BLOB_SHA_MISMATCH', detail: `Expected ${entry.sha}; calculated ${calculated}.` }] };
        const opaque = opaquePreservableExtensions.has(extname(entry.path).toLowerCase());
        const content = opaque ? '' : buffer.toString('utf8');
        const findings = quarantineScan(entry.path, buffer, { opaque });
        const blocking = findings.some((finding) => finding.severity === 'blocking');
        const contentSha256 = sha256Prefixed(buffer);
        const objectRelativePath = blocking
          ? `quarantine/sha256/${contentSha256.slice(7, 9)}/${contentSha256.slice(7)}`
          : `objects/sha256/${contentSha256.slice(7, 9)}/${contentSha256.slice(7)}`;
        const objectPath = resolve(snapshotRoot, ...objectRelativePath.split('/'));
        await mkdir(dirname(objectPath), { recursive: true }); await writeFile(objectPath, buffer);
        const securityDisposition = blocking ? 'quarantined-blocking-findings' : opaque ? 'opaque-preserved-restricted-parser-review' : 'safe-bounded-parser-input';
        const result = { path: entry.path, sha: entry.sha, sizeBytes: buffer.length, mediaType: mediaType(entry.path), sourceFormat: extname(entry.path).toLowerCase().replace(/^\./, '') || 'extensionless', parserRequired: parserFor(entry.path), status: blocking ? 'quarantined' : opaque ? 'accepted-opaque' : 'accepted', findings, contentSha256, contentAddressedObject: objectRelativePath, securityDisposition };
        const artefact = detectArchitectureArtefact({ connectorId, repository, commitSha, path: entry.path, contentPreview: content, licenceDisposition: dossier.licenceDisposition ?? dossier.licence?.reviewStatus ?? 'unknown', securityDisposition });
        if (artefact) result.architectureArtefact = artefact;
        if (!blocking && !opaque) {
          const objectPath = join(snapshotRoot, 'files', entry.path);
          await mkdir(dirname(objectPath), { recursive: true }); await writeFile(objectPath, buffer);
          const parsed = parseArchitectureKnowledge({ connectorId, repository, revision: commitSha, path: entry.path, content });
          await writeJson(`${objectPath}.aiw.json`, parsed);
          result.claimCandidateCount = parsed.candidates.length;
          result.sectionCount = parsed.sections.length;
          result.boundedEvidenceCount = parsed.evidencePassages.length;
          result.parserStatus = 'parsed';
        } else {
          result.claimCandidateCount = 0;
          result.sectionCount = 0;
          result.boundedEvidenceCount = 0;
          result.parserStatus = opaque && !blocking ? 'preserved-awaiting-specialist-parser' : 'not-parsed-quarantined';
        }
        return result;
      } catch (error) {
        return { path: entry.path, sha: entry.sha, sizeBytes: Number(entry.size ?? 0), status: 'failed', findings: [{ severity: 'blocking', code: 'FETCH_FAILED', detail: error instanceof Error ? error.message : String(error) }] };
      }
    });
    for (const result of results) {
      processed[result.path] = { sha: result.sha, result, updatedAt: new Date().toISOString() };
      fileResults.push(result);
    }
    await mkdir(dirname(checkpointJournalPath), { recursive: true });
    await appendFile(checkpointJournalPath, `${results.map((item) => JSON.stringify(item)).join('\n')}\n`);
    await writeJson(checkpointPath, { schemaVersion: ACQUISITION_SCHEMA_VERSION, connectorId, repository, branch, commitSha, journal: checkpointJournalPath.slice(outputRoot.length + 1).replaceAll('\\', '/'), processedCount: Object.keys(processed).length, updatedAt: new Date().toISOString() });
  }

  const attemptedResults = eligible.map((entry) => {
    const current = fileResults.find((result) => result.path === entry.path);
    if (current) return current;
    const checkpointed = processed[entry.path]?.result;
    return checkpointed ? { ...checkpointed, resumed: true } : { path: entry.path, sha: entry.sha, sizeBytes: Number(entry.size ?? 0), status: 'unprocessed', resumed: true };
  });
  const policyExcludedResults = policyExcluded.map((entry) => ({ path: entry.path, sha: entry.sha, sizeBytes: Number(entry.size ?? 0), status: 'policy-excluded', dispositionReason: 'outside-allowed-paths-or-denied-by-precedence' }));
  const oversizedResults = oversized.map((entry) => ({ path: entry.path, sha: entry.sha, sizeBytes: Number(entry.size ?? 0), status: 'rejected', dispositionReason: 'governed-file-size-limit' }));
  const persistedResults = [...attemptedResults, ...policyExcludedResults, ...oversizedResults].sort((a, b) => a.path.localeCompare(b.path));
  const accepted = persistedResults.filter((item) => item.status === 'accepted' || item.status === 'accepted-opaque');
  const quarantined = persistedResults.filter((item) => item.status === 'quarantined');
  const rejected = persistedResults.filter((item) => item.status === 'rejected');
  const failed = persistedResults.filter((item) => item.status === 'failed');
  const unprocessed = persistedResults.filter((item) => item.status === 'unprocessed');
  const exactCoverage = eligible.length === 0 ? 100 : Number(((accepted.length / eligible.length) * 100).toFixed(2));
  const license = licenseResult.status === 200 ? {
    detected: true,
    spdxId: licenseResult.body.license?.spdx_id ?? null,
    name: licenseResult.body.license?.name ?? null,
    path: licenseResult.body.path ?? null,
    sha: licenseResult.body.sha ?? null,
    htmlUrl: licenseResult.body.html_url ?? null,
  } : { detected: false, spdxId: null, name: null, path: null, sha: null, htmlUrl: null };
  const architectureArtefacts = attemptedResults.map((item) => item.architectureArtefact).filter(Boolean).sort((a, b) => a.artefactId.localeCompare(b.artefactId));
  const crossFileArchitectureGroups = buildCrossFileArchitectureGroups(architectureArtefacts);
  const snapshotChecksum = sha256Prefixed(stableStringify(persistedResults.map((item) => ({ path: item.path, sha: item.sha, status: item.status, contentSha256: item.contentSha256 ?? null }))));
  const manifest = {
    schemaVersion: ACQUISITION_SCHEMA_VERSION,
    connectorId, repository, branch, commitSha, snapshotId, acquiredAt: now,
    repositoryMetadata: { id: repoResult.body.id, nodeId: repoResult.body.node_id, htmlUrl: repoResult.body.html_url, defaultBranch: repoResult.body.default_branch, archived: repoResult.body.archived, disabled: repoResult.body.disabled, visibility: repoResult.body.visibility, pushedAt: repoResult.body.pushed_at },
    api: { version: client.apiVersion, base: client.apiBase, authenticated: Boolean(token), contentTransport, responseHeaders: { repository: repoResult.headers, commit: commitResult.headers, tree: tree.headers } },
    tree: { totalBlobs: allBlobs.length, policyEligible: policyEligible.length, policyExcluded: policyExcluded.length, eligibleWithinSizeLimit: eligible.length, oversized: oversized.length, truncatedRecoveryUsed: tree.truncated, treeCalls: tree.treeCalls, denominatorPreserved: persistedResults.length === allBlobs.length },
    policy: { allowedPaths, deniedPaths, maxFileBytes, batchSize, immutableRevisionRequired: true, executionPolicy: 'source-content-is-untrusted-and-never-executed' },
    licenceEvidence: { repositoryApi: license, dossierReviewStatus: dossier.licence?.reviewStatus ?? 'unknown', dossierUsePolicy: dossier.licence?.usePolicy ?? 'unknown', finalDisposition: dossier.licence?.reviewStatus === 'verified' && license.detected ? 'technically-verified-pending-release-approval' : 'requires-human-licence-review' },
    files: persistedResults,
    snapshotChecksum,
    architectureArtefacts,
    crossFileArchitectureGroups,
    coverage: {
      totalTreeFiles: allBlobs.length, governedEligibleFiles: policyEligible.length, acceptedFiles: accepted.length,
      rejectedFiles: rejected.length, policyExclusions: policyExcluded.length, securityQuarantinedFiles: quarantined.length,
      processingFailures: failed.length, unprocessedFiles: unprocessed.length, oversizedFiles: oversized.length,
      exactGovernedContentCoveragePercent: exactCoverage,
      parserCoverage: {
        parsedFiles: attemptedResults.filter((item) => item.parserStatus === 'parsed').length,
        preservedAwaitingSpecialistParser: attemptedResults.filter((item) => item.parserStatus === 'preserved-awaiting-specialist-parser').length,
        boundedEvidenceCount: attemptedResults.reduce((sum, item) => sum + Number(item.boundedEvidenceCount ?? 0), 0),
      },
      processingComplete: failed.length === 0 && unprocessed.length === 0,
      reviewRequired: quarantined.length > 0 || rejected.length > 0 || architectureArtefacts.some((item) => item.sourceAuthorship !== 'source-authored-candidate'),
    },
    candidateClaims: { total: accepted.reduce((sum, item) => sum + Number(item.claimCandidateCount ?? 0), 0), authority: 'candidate-only-until-independent-review-and-promotion' },
  };
  manifest.manifestSha256 = sha256Prefixed(canonicalJson(manifest));
  await writeJson(join(snapshotRoot, 'manifest.json'), manifest);
  return manifest;
}

export async function verifyAcquisitionManifest(manifestPath) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const failures = [];
  const { manifestSha256, ...withoutManifestHash } = manifest;
  if (sha256Prefixed(canonicalJson(withoutManifestHash)) !== manifestSha256) failures.push({ path: 'manifest.json', code: 'MANIFEST_SHA256_MISMATCH' });
  if (manifest.files.length !== manifest.tree.totalBlobs || manifest.tree.denominatorPreserved !== true) failures.push({ path: 'manifest.json', code: 'TREE_DENOMINATOR_MISMATCH' });
  for (const file of manifest.files.filter((item) => ['accepted', 'accepted-opaque', 'quarantined'].includes(item.status))) {
    const fullPath = resolve(dirname(manifestPath), ...String(file.contentAddressedObject).split('/'));
    try {
      const content = await readFile(fullPath);
      if (sha256Prefixed(content) !== file.contentSha256) failures.push({ path: file.path, code: 'CONTENT_SHA256_MISMATCH' });
      if (gitBlobSha(content) !== file.sha) failures.push({ path: file.path, code: 'GIT_BLOB_SHA_MISMATCH' });
    } catch (error) { failures.push({ path: file.path, code: 'OBJECT_MISSING', detail: error instanceof Error ? error.message : String(error) }); }
  }
  const snapshotChecksum = sha256Prefixed(stableStringify(manifest.files.map((item) => ({ path: item.path, sha: item.sha, status: item.status, contentSha256: item.contentSha256 ?? null }))));
  if (snapshotChecksum !== manifest.snapshotChecksum) failures.push({ path: 'manifest.json', code: 'SNAPSHOT_CHECKSUM_MISMATCH' });
  return { passed: failures.length === 0, checked: manifest.files.filter((item) => ['accepted', 'accepted-opaque', 'quarantined'].includes(item.status)).length, denominator: manifest.files.length, failures };
}
