import { describe, expect, it } from 'vitest';
import { sampleProject, type ArchitectureProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

const headers = { 'x-aiw-tenant-id': 'tenant-reference', 'x-aiw-user-id': 'user-owner' };

const brief = `
The agency platform must let agents onboard customers and process deposits.
The agency platform must not let agents onboard customers without identity verification.
The platform must integrate with core banking and remain highly available during failures.
`;

describe('rc.10.71.1 Architecture Brain authority API', () => {
  it('reports one consolidated architecture runtime and keeps Mind Factory paths isolated by design', async () => {
    const app = await buildApp({ repository: new InMemoryProjectRepository(), logger: false });
    try {
      const response = await app.inject({ method: 'GET', url: '/api/architecture-brain/authority-audit', headers });
      expect(response.statusCode).toBe(200);
      const audit = response.json();
      expect(audit.controllingPrinciple).toContain('One Brain');
      expect(audit.summary.migrationRequiredPaths).toBe(0);
      expect(audit.paths.filter((item: { category: string }) => item.category === 'architecture-runtime').every((item: { orchestrated: boolean; owner: string }) => item.orchestrated && item.owner === 'AIW Brain Orchestrator')).toBe(true);
      expect(audit.paths.filter((item: { category: string }) => item.category === 'knowledge-supply-chain').every((item: { status: string }) => item.status === 'isolated-by-design')).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('returns one governed receipt for requirements, workspace projection and stage co-author requests', async () => {
    const repository = new InMemoryProjectRepository();
    const app = await buildApp({ repository, logger: false });
    try {
      const baseline = await repository.getProject('tenant-reference', sampleProject.id, sampleProject.branch.id);
      const project = structuredClone(baseline) as ArchitectureProject;

      const distillation = await app.inject({
        method: 'POST',
        url: '/api/requirements-intelligence/distill',
        headers,
        payload: { projectId: project.id, branchId: project.branch.id, expectedRevision: project.revision, intelligenceMode: 'deterministic', knowledgeReleaseId: 'CAMBRIDGE-SA-1.0', sources: [{ name: 'brief.txt', kind: 'paste', text: brief }] },
      });
      expect(distillation.statusCode).toBe(200);
      const proposal = distillation.json();
      expect(proposal.brainReceipt.task).toBe('requirements-distillation');
      expect(proposal.brainReceipt.governance.directModelMutationAllowed).toBe(false);
      expect(proposal.brainReceipt.manifest.cambridgeRulesetId).toBe('CAMBRIDGE-SA-1.0');
      expect(proposal.contextGraph.nodes.length).toBeGreaterThan(0);
      expect(proposal.conflicts.length).toBeGreaterThan(0);

      const projection = await app.inject({
        method: 'POST',
        url: '/api/architecture-brain/workspace-projection',
        headers,
        payload: { projectId: project.id, branchId: project.branch.id, expectedRevision: project.revision, trigger: 'initial', workspace: 'design-canvas', intelligencePreferences: { demoted: {} } },
      });
      expect(projection.statusCode).toBe(200);
      const projected = projection.json();
      expect(projected.brainReceipt.task).toBe('workspace-projection');
      expect(projected.brainReceipt.llm.requested).toBe(false);
      expect(Array.isArray(projected.recommendations)).toBe(true);
      expect(Array.isArray(projected.findings)).toBe(true);
      expect(projected.intelligence).toBeTruthy();

      const staleProjection = await app.inject({
        method: 'POST',
        url: '/api/architecture-brain/workspace-projection',
        headers,
        payload: { projectId: project.id, branchId: project.branch.id, expectedRevision: project.revision + 99, trigger: 'initial', workspace: 'design-canvas' },
      });
      expect(staleProjection.statusCode).toBe(409);
      expect(staleProjection.json().error).toBe('REVISION_CONFLICT');

      const stage = await app.inject({
        method: 'POST',
        url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}/stage-co-author`,
        headers,
        payload: { targetStage: 'requirements', intelligenceMode: 'deterministic', dataClassification: 'internal' },
      });
      expect(stage.statusCode).toBe(200);
      const stageProposal = stage.json();
      expect(stageProposal.brainReceipt.task).toBe('stage-field-drafting');
      expect(stageProposal.brainReceipt.authorityChain.at(-1).authority).toBe('architect');
      expect(stageProposal.brainReceipt.authorityChain.at(-1).mayMutateCanonicalModel).toBe(true);

      const sol = await app.inject({
        method: 'POST',
        url: '/api/co-architect/ask',
        headers,
        payload: { projectId: project.id, branchId: project.branch.id, expectedRevision: project.revision, question: 'What is the most important next design decision?' },
      });
      expect(sol.statusCode).toBe(200);
      expect(sol.json().brainReceipt.task).toBe('explain-or-challenge');
      expect(sol.json().brainReceipt.projectRevision).toBe(project.revision);
      expect(sol.json().brainReceipt.governance.directModelMutationAllowed).toBe(false);

      const staleSol = await app.inject({
        method: 'POST',
        url: '/api/co-architect/ask',
        headers,
        payload: { projectId: project.id, branchId: project.branch.id, expectedRevision: project.revision + 1, question: 'What changed?' },
      });
      expect(staleSol.statusCode).toBe(409);
      expect(staleSol.json().error).toBe('STALE_ARCHITECTURE_BRAIN_CONTEXT');

      const synthesis = await app.inject({
        method: 'POST',
        url: '/api/synthesis/runs',
        headers,
        payload: { projectId: project.id, branchId: project.branch.id, expectedRevision: project.revision, strategyIds: ['balanced','simplicity-first'], useLlmEnrichment: false },
      });
      expect(synthesis.statusCode).toBe(201);
      expect(synthesis.json().brainReceipt.task).toBe('architecture-synthesis');
      expect(synthesis.json().brainReceipt.projectRevision).toBe(project.revision);
    } finally {
      await app.close();
    }
  });

  it('server-compiles System Context and applies only the current human-approved proposal', async () => {
    const repository = new InMemoryProjectRepository();
    const app = await buildApp({ repository, logger: false });
    try {
      const baseline = await repository.getProject('tenant-reference', sampleProject.id, sampleProject.branch.id);
      const distillation = await app.inject({
        method: 'POST',
        url: '/api/requirements-intelligence/distill',
        headers,
        payload: {
          projectId: baseline!.id,
          branchId: baseline!.branch.id,
          expectedRevision: baseline!.revision,
          intelligenceMode: 'deterministic',
          knowledgeReleaseId: 'CAMBRIDGE-SA-1.0',
          sources: [{
            name: 'agency-idea.txt',
            kind: 'idea',
            text: 'Build an agency banking platform that enables agents to onboard customers, verify identity, process deposits and withdrawals, and integrate with core banking.',
          }],
        },
      });
      expect(distillation.statusCode).toBe(200);
      const proposal = distillation.json();
      proposal.conflicts = (proposal.conflicts ?? []).map((item: { status: string }) => ({ ...item, status: 'accepted-variance', resolution: 'Reviewed during test setup.' }));
      const accepted = await app.inject({
        method: 'POST',
        url: `/api/projects/${baseline!.id}/branches/${baseline!.branch.id}/requirements-intelligence/apply`,
        headers,
        payload: { expectedRevision: baseline!.revision, proposal },
      });
      expect(accepted.statusCode).toBe(200);
      const acceptedProject = accepted.json() as ArchitectureProject;
      expect(acceptedProject.requirementsIntelligence!.journeys.some((item) => item.status === 'accepted')).toBe(true);

      const preview = await app.inject({
        method: 'POST',
        url: `/api/projects/${acceptedProject.id}/branches/${acceptedProject.branch.id}/system-context/preview`,
        headers,
        payload: { expectedRevision: acceptedProject.revision },
      });
      expect(preview.statusCode).toBe(200);
      const candidate = preview.json();
      expect(candidate.brainReceipt.task).toBe('system-context-composition');
      expect(candidate.nodes.some((item: { tags: string[] }) => item.tags.includes('system-of-interest'))).toBe(true);
      expect(candidate.journeyCoverage.length).toBeGreaterThan(0);

      const staleApply = await app.inject({
        method: 'POST',
        url: `/api/projects/${acceptedProject.id}/branches/${acceptedProject.branch.id}/system-context/apply`,
        headers,
        payload: { expectedRevision: acceptedProject.revision, contextFingerprint: 'stale-fingerprint' },
      });
      expect(staleApply.statusCode).toBe(409);
      expect(staleApply.json().error).toBe('STALE_SYSTEM_CONTEXT_PROPOSAL');

      const applied = await app.inject({
        method: 'POST',
        url: `/api/projects/${acceptedProject.id}/branches/${acceptedProject.branch.id}/system-context/apply`,
        headers,
        payload: {
          expectedRevision: acceptedProject.revision,
          contextFingerprint: candidate.brainReceipt.contextFingerprint,
        },
      });
      expect(applied.statusCode).toBe(200);
      expect(applied.json().project.revision).toBe(acceptedProject.revision + 1);
      expect(applied.json().project.nodes.some((item: { tags: string[]; status: string }) => item.tags.includes('system-context') && item.status === 'reviewed')).toBe(true);
      expect(applied.json().project.requirementsIntelligence.contextGraph.nodes.some((item: { kind: string }) => item.kind === 'architecture-object')).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('requires explicit conflict adjudication and persists a later governed disposition', async () => {
    const repository = new InMemoryProjectRepository();
    const app = await buildApp({ repository, logger: false });
    try {
      const baseline = await repository.getProject('tenant-reference', sampleProject.id, sampleProject.branch.id);
      const distillation = await app.inject({ method: 'POST', url: '/api/requirements-intelligence/distill', headers, payload: { projectId: baseline!.id, branchId: baseline!.branch.id, expectedRevision: baseline!.revision, intelligenceMode: 'deterministic', sources: [{ name: 'conflicting.txt', kind: 'paste', text: brief }] } });
      expect(distillation.statusCode).toBe(200);
      const proposal = distillation.json();
      expect(proposal.conflicts.length).toBeGreaterThan(0);

      const blocked = await app.inject({ method: 'POST', url: `/api/projects/${baseline!.id}/branches/${baseline!.branch.id}/requirements-intelligence/apply`, headers, payload: { expectedRevision: baseline!.revision, proposal } });
      expect(blocked.statusCode).toBe(422);
      expect(blocked.json().error).toBe('UNRESOLVED_REQUIREMENTS_CONFLICTS');

      proposal.conflicts = proposal.conflicts.map((item: { status: string }) => ({ ...item, status: 'accepted-variance', resolution: 'Identity verification is a mandatory precondition; the apparently conflicting wording applies to a different operating state.' }));
      const applied = await app.inject({ method: 'POST', url: `/api/projects/${baseline!.id}/branches/${baseline!.branch.id}/requirements-intelligence/apply`, headers, payload: { expectedRevision: baseline!.revision, proposal } });
      expect(applied.statusCode).toBe(200);
      const accepted = applied.json() as ArchitectureProject;
      const first = accepted.requirementsIntelligence!.conflicts![0]!;

      const reopened = structuredClone(accepted) as ArchitectureProject;
      reopened.revision += 1;
      reopened.requirementsIntelligence!.conflicts = reopened.requirementsIntelligence!.conflicts!.map((item) => item.id === first.id ? { ...item, status: 'open', resolution: undefined } : item);
      await repository.saveProject(reopened, accepted.revision);
      const resolved = await app.inject({ method: 'POST', url: `/api/projects/${reopened.id}/branches/${reopened.branch.id}/requirements-intelligence/conflicts/${encodeURIComponent(first.id)}/resolve`, headers, payload: { expectedRevision: reopened.revision, status: 'resolved', resolution: 'The canonical requirement requires identity verification before onboarding is completed.' } });
      expect(resolved.statusCode).toBe(200);
      expect(resolved.json().requirementsIntelligence.conflicts.find((item: { id: string }) => item.id === first.id).status).toBe('resolved');
      expect(resolved.json().revision).toBe(reopened.revision + 1);
    } finally {
      await app.close();
    }
  });

  it('migrates a legacy project once and exposes its typed context graph', async () => {
    const repository = new InMemoryProjectRepository();
    const app = await buildApp({ repository, logger: false });
    try {
      const baseline = await repository.getProject('tenant-reference', sampleProject.id, sampleProject.branch.id);
      expect(baseline).toBeTruthy();
      const migrate = await app.inject({
        method: 'POST',
        url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}/requirements-intelligence/migrate-legacy`,
        headers,
        payload: { expectedRevision: baseline!.revision, knowledgeReleaseId: 'CAMBRIDGE-SA-1.0' },
      });
      expect(migrate.statusCode).toBe(200);
      expect(migrate.json().requirementsIntelligence.migrationReceipt.canonicalAuthority).toBe('requirements-intelligence');

      const graph = await app.inject({ method: 'GET', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}/architecture-context-graph`, headers });
      expect(graph.statusCode).toBe(200);
      expect(graph.json().graph.nodes.some((item: { kind: string }) => item.kind === 'requirement')).toBe(true);
      expect(graph.json().manifest.kernelVersion).toBeTruthy();
    } finally {
      await app.close();
    }
  });
});
