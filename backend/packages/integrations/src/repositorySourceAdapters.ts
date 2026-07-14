import { createPrivateKey, sign } from 'node:crypto';

export interface RepositoryTreeEntry { path: string; type: 'file' | 'directory'; sha?: string; size?: number; }
export interface RepositorySnapshot { provider: 'github' | 'gitlab' | 'azure-devops'; repository: string; ref: string; commitId: string; entries: RepositoryTreeEntry[]; fetchedAt: string; }
export interface RepositorySourceAdapter {
  readonly provider: RepositorySnapshot['provider'];
  snapshot(repository: string, ref?: string, allowedPaths?: string[]): Promise<RepositorySnapshot>;
  readText(repository: string, path: string, ref?: string): Promise<string>;
  health(): Promise<{ ready: boolean; detail: string }>;
}

type FetchLike = typeof fetch;
const textDecoder = new TextDecoder();
function encodeBase64Url(value: string | Uint8Array): string { return Buffer.from(value).toString('base64url'); }
function allowed(path: string, allowedPaths: string[]): boolean { return !allowedPaths.length || allowedPaths.some((prefix) => path === prefix || path.startsWith(`${prefix.replace(/\/$/, '')}/`)); }
async function json<T>(response: Response): Promise<T> { if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}:${(await response.text()).slice(0, 300)}`); return response.json() as Promise<T>; }

export class GitHubAppRepositoryAdapter implements RepositorySourceAdapter {
  readonly provider = 'github' as const;
  private token?: { value: string; expiresAt: number };
  constructor(private readonly config: { appId: string; installationId: string; privateKeyPem: string; apiBase?: string }, private readonly fetcher: FetchLike = fetch) {}
  private appJwt(): string {
    const now = Math.floor(Date.now() / 1000);
    const header = encodeBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = encodeBase64Url(JSON.stringify({ iat: now - 30, exp: now + 540, iss: this.config.appId }));
    const content = `${header}.${payload}`;
    return `${content}.${encodeBase64Url(sign('RSA-SHA256', Buffer.from(content), createPrivateKey(this.config.privateKeyPem)))}`;
  }
  private async installationToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const base = this.config.apiBase ?? 'https://api.github.com';
    const body = await json<{ token: string; expires_at: string }>(await this.fetcher(`${base}/app/installations/${this.config.installationId}/access_tokens`, { method: 'POST', headers: { Authorization: `Bearer ${this.appJwt()}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': process.env.AIW_GITHUB_API_VERSION || '2026-03-10' } }));
    this.token = { value: body.token, expiresAt: Date.parse(body.expires_at) }; return body.token;
  }
  private async request<T>(path: string): Promise<T> { const token = await this.installationToken(); return json<T>(await this.fetcher(`${this.config.apiBase ?? 'https://api.github.com'}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': process.env.AIW_GITHUB_API_VERSION || '2026-03-10' } })); }
  async snapshot(repository: string, ref = 'HEAD', allowedPaths: string[] = []): Promise<RepositorySnapshot> {
    const commit = await this.request<{ object: { sha: string } }>(`/repos/${repository}/git/ref/${ref === 'HEAD' ? 'heads/main' : ref.replace(/^refs\//, '')}`);
    const tree = await this.request<{ tree: Array<{ path: string; type: string; sha: string; size?: number }> }>(`/repos/${repository}/git/trees/${commit.object.sha}?recursive=1`);
    return { provider: this.provider, repository, ref, commitId: commit.object.sha, entries: tree.tree.filter((entry) => allowed(entry.path, allowedPaths)).map((entry) => ({ path: entry.path, type: entry.type === 'tree' ? 'directory' : 'file', sha: entry.sha, ...(entry.size === undefined ? {} : { size: entry.size }) })), fetchedAt: new Date().toISOString() };
  }
  async readText(repository: string, path: string, ref = 'HEAD'): Promise<string> { const body = await this.request<{ content: string; encoding: string }>(`/repos/${repository}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(ref)}`); return body.encoding === 'base64' ? Buffer.from(body.content.replace(/\n/g, ''), 'base64').toString('utf8') : body.content; }
  async health() { try { await this.installationToken(); return { ready: true, detail: 'GitHub App installation token issued' }; } catch (error) { return { ready: false, detail: error instanceof Error ? error.message : String(error) }; } }
}

export class GitLabRepositoryAdapter implements RepositorySourceAdapter {
  readonly provider = 'gitlab' as const;
  constructor(private readonly config: { token: string; apiBase?: string }, private readonly fetcher: FetchLike = fetch) {}
  private async request<T>(path: string): Promise<T> { return json<T>(await this.fetcher(`${this.config.apiBase ?? 'https://gitlab.com/api/v4'}${path}`, { headers: { 'PRIVATE-TOKEN': this.config.token } })); }
  async snapshot(repository: string, ref = 'main', allowedPaths: string[] = []): Promise<RepositorySnapshot> { const project = encodeURIComponent(repository); const commit = await this.request<{ id: string }>(`/projects/${project}/repository/commits/${encodeURIComponent(ref)}`); const tree = await this.request<Array<{ path: string; type: string; id: string }>>(`/projects/${project}/repository/tree?recursive=true&per_page=100&ref=${encodeURIComponent(ref)}`); return { provider: this.provider, repository, ref, commitId: commit.id, entries: tree.filter((entry) => allowed(entry.path, allowedPaths)).map((entry) => ({ path: entry.path, type: entry.type === 'tree' ? 'directory' : 'file', sha: entry.id })), fetchedAt: new Date().toISOString() }; }
  async readText(repository: string, path: string, ref = 'main'): Promise<string> { const body = await this.request<{ content: string; encoding: string }>(`/projects/${encodeURIComponent(repository)}/repository/files/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`); return body.encoding === 'base64' ? Buffer.from(body.content, 'base64').toString('utf8') : body.content; }
  async health() { try { await this.request('/user'); return { ready: true, detail: 'GitLab token accepted' }; } catch (error) { return { ready: false, detail: error instanceof Error ? error.message : String(error) }; } }
}

export class AzureDevOpsRepositoryAdapter implements RepositorySourceAdapter {
  readonly provider = 'azure-devops' as const;
  constructor(private readonly config: { organization: string; project: string; pat: string; apiBase?: string }, private readonly fetcher: FetchLike = fetch) {}
  private auth() { return `Basic ${Buffer.from(`:${this.config.pat}`).toString('base64')}`; }
  private base(repository: string) { return `${this.config.apiBase ?? `https://dev.azure.com/${encodeURIComponent(this.config.organization)}`}/${encodeURIComponent(this.config.project)}/_apis/git/repositories/${encodeURIComponent(repository)}`; }
  async snapshot(repository: string, ref = 'main', allowedPaths: string[] = []): Promise<RepositorySnapshot> { const refs = await json<{ value: Array<{ objectId: string }> }>(await this.fetcher(`${this.base(repository)}/refs?filter=heads/${encodeURIComponent(ref)}&api-version=7.1`, { headers: { Authorization: this.auth() } })); const commitId = refs.value[0]?.objectId; if (!commitId) throw new Error('AZURE_DEVOPS_REF_NOT_FOUND'); const body = await json<{ value: Array<{ path: string; isFolder: boolean; objectId?: string }> }>(await this.fetcher(`${this.base(repository)}/items?recursionLevel=Full&versionDescriptor.version=${encodeURIComponent(ref)}&api-version=7.1`, { headers: { Authorization: this.auth() } })); return { provider: this.provider, repository, ref, commitId, entries: body.value.map((entry): RepositoryTreeEntry => ({ path: entry.path.replace(/^\//, ''), type: entry.isFolder ? 'directory' : 'file', ...(entry.objectId ? { sha: entry.objectId } : {}) })).filter((entry) => allowed(entry.path, allowedPaths)), fetchedAt: new Date().toISOString() }; }
  async readText(repository: string, path: string, ref = 'main'): Promise<string> { const response = await this.fetcher(`${this.base(repository)}/items?path=${encodeURIComponent(path)}&versionDescriptor.version=${encodeURIComponent(ref)}&includeContent=true&api-version=7.1`, { headers: { Authorization: this.auth(), Accept: 'text/plain' } }); if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`); return response.text(); }
  async health() { try { const response = await this.fetcher(`${this.config.apiBase ?? `https://dev.azure.com/${encodeURIComponent(this.config.organization)}`}/_apis/projects?api-version=7.1`, { headers: { Authorization: this.auth() } }); return { ready: response.ok, detail: response.ok ? 'Azure DevOps token accepted' : `HTTP ${response.status}` }; } catch (error) { return { ready: false, detail: error instanceof Error ? error.message : String(error) }; } }
}
