import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { GitHubAppRepositoryAdapter, GitLabRepositoryAdapter, AzureDevOpsRepositoryAdapter } from '../src/repositorySourceAdapters.js';

describe('rc.10.58 repository source adapters', () => {
  it('uses GitHub App authentication and applies allowed paths', async () => {
    const key = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    const calls: Array<{ url: string; method: string }> = [];
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input); calls.push({ url, method: init?.method ?? 'GET' });
      if (url.includes('/access_tokens')) return new Response(JSON.stringify({ token: 'installation-token', expires_at: new Date(Date.now() + 3600_000).toISOString() }), { status: 201 });
      if (url.includes('/git/ref/')) return Response.json({ object: { sha: 'abc123' } });
      return Response.json({ tree: [{ path: 'docs/architecture.md', type: 'blob', sha: '1', size: 10 }, { path: 'src/index.ts', type: 'blob', sha: '2', size: 12 }] });
    }) as typeof fetch;
    const adapter = new GitHubAppRepositoryAdapter({ appId: '1', installationId: '2', privateKeyPem: key, apiBase: 'https://github.test' }, fetcher);
    const snapshot = await adapter.snapshot('org/repo', 'HEAD', ['docs']);
    expect(snapshot.commitId).toBe('abc123');
    expect(snapshot.entries.map((entry) => entry.path)).toEqual(['docs/architecture.md']);
    expect(calls[0]).toMatchObject({ method: 'POST' });
  });

  it('normalises GitLab and Azure DevOps trees', async () => {
    const gitlabFetch = (async (input: string | URL | Request) => String(input).includes('/commits/') ? Response.json({ id: 'gitlab-sha' }) : Response.json([{ path: 'architecture/adr.md', type: 'blob', id: 'x' }])) as typeof fetch;
    const gitlab = await new GitLabRepositoryAdapter({ token: 'token', apiBase: 'https://gitlab.test' }, gitlabFetch).snapshot('group/repo', 'main', ['architecture']);
    expect(gitlab.entries[0]?.type).toBe('file');

    const azureFetch = (async (input: string | URL | Request) => String(input).includes('/refs?') ? Response.json({ value: [{ objectId: 'azure-sha' }] }) : Response.json({ value: [{ path: '/docs', isFolder: true }, { path: '/docs/model.yaml', isFolder: false, objectId: 'blob' }] })) as typeof fetch;
    const azure = await new AzureDevOpsRepositoryAdapter({ organization: 'org', project: 'project', pat: 'pat', apiBase: 'https://azure.test' }, azureFetch).snapshot('repo', 'main', ['docs']);
    expect(azure.commitId).toBe('azure-sha');
    expect(azure.entries).toHaveLength(2);
  });
});
