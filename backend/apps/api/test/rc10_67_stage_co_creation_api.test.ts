import { describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

async function headers(app: Awaited<ReturnType<typeof buildApp>>) {
  const response = await app.inject({ method: 'POST', url: '/api/auth/development-token', payload: { subject: 'user-owner', email: 'owner@example.com', displayName: 'Owner', tenantId: sampleProject.tenantId } });
  return { authorization: `Bearer ${response.json().token}` };
}

describe('rc.10.67 stage co-creation API', () => {
  it('publishes four released grammars and the generative cursor descriptor', async () => {
    const app = await buildApp({ repository: new InMemoryProjectRepository(), logger: false });
    try {
      const release = await app.inject({ method: 'GET', url: '/api/living-canvas/release' });
      expect(release.statusCode).toBe(200);
      expect(release.json()).toMatchObject({ version: '0.10.0-rc.10.68.0', relationshipPropagation: true, qualityDriverTacticChain: true });
      expect(release.json().releasedGrammars).toHaveLength(4);
      const grammars = await app.inject({ method: 'GET', url: '/api/living-canvas/grammars' });
      expect(grammars.statusCode).toBe(200);
      expect(grammars.json().grammars).toHaveLength(4);
    } finally { await app.close(); }
  });

  it('generates logical-technology actions through the same governed endpoint', async () => {
    const repository = new InMemoryProjectRepository();
    const project = structuredClone(sampleProject);
    project.activeStage = 'logicalTechnology';
    await repository.saveProject(project);
    const app = await buildApp({ repository, logger: false });
    try {
      const auth = await headers(app);
      const source = project.nodes.find((node) => node.stage === 'applicationRealization')!;
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/branches/${project.branch.id}/living-canvas/actions`,
        headers: auth,
        payload: { event: { id: 'rc1067-api', kind: 'candidate-requested', occurredAt: new Date().toISOString(), tenantId: project.tenantId, projectId: project.id, branchId: project.branch.id, revision: project.revision, actorId: 'spoofed', actorRole: 'spoofed', stage: 'applicationRealization', targetStage: 'logicalTechnology', selectedScopeId: source.id, subjectIds: [source.id], decompositionLevel: 'deployment', autonomyMode: 'guide' } },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().actions.some((action: { targetStage: string }) => action.targetStage === 'logicalTechnology')).toBe(true);
    } finally { await app.close(); }
  });
});
