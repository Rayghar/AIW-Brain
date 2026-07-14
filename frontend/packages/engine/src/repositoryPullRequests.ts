import { createId, type ArtifactBundle, type ArchitectureProject, type RepositoryBinding, type RepositoryPullRequest } from '@aiw/domain';
function hash(text: string): string { let h=2166136261; for (let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);} return `fnv1a-${(h>>>0).toString(16).padStart(8,'0')}`; }
export function createPullRequestPreview(project: ArchitectureProject, binding: RepositoryBinding, bundle: ArtifactBundle): RepositoryPullRequest {
  const sourceBranch = `aiw/architecture-r${project.revision}`;
  return { id: createId('repository-pr'), bindingId: binding.id, provider: binding.provider, title: `AIW architecture revision ${project.revision}: ${project.name}`, sourceBranch, targetBranch: binding.defaultBranch, status: 'preview', files: bundle.files.map((file) => ({ path: `${binding.architecturePath.replace(/\/[^/]+$/, '')}/${file.path}`, operation: 'update' as const, contentHash: hash(file.content) })), createdAt: new Date().toISOString() };
}
