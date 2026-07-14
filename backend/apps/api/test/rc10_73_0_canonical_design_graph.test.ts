import { describe, expect, it } from 'vitest';
import {
  buildArchitectureDesignGraph,
  isArchitectureDesignGraphFresh,
  sampleProject,
  validateArchitectureDesignGraph,
  type ArchitectureDesignGraph,
  type ArchitectureProject,
} from '@aiw/domain';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

const headers = {
  'x-aiw-tenant-id': 'tenant-reference',
  'x-aiw-user-id': 'user-owner',
};

describe('rc.10.73.1 canonical Architecture Design Graph foundation', () => {
  it('normalizes the accepted project into a deterministic, integrity-checked graph at the persistence boundary', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.saveProject(structuredClone(sampleProject));
    const project = (await repository.getProject(
      sampleProject.tenantId,
      sampleProject.id,
      sampleProject.branch.id,
    )) as ArchitectureProject;

    expect(project.designGraph).toBeDefined();
    expect(project.designGraph?.projectionMode).toBe('legacy-project-projection');
    expect(project.designGraph?.integrity.healthy).toBe(true);
    expect(project.designGraph?.records.some((record) => record.kind === 'project')).toBe(true);
    expect(project.designGraph?.records.some((record) => record.kind === 'architecture-node')).toBe(true);
    expect(project.designGraph?.records.some((record) => record.kind === 'decision')).toBe(true);
    expect(isArchitectureDesignGraphFresh(project)).toBe(true);

    const repeated = buildArchitectureDesignGraph(project);
    expect(repeated.fingerprint).toBe(project.designGraph?.fingerprint);
    expect(repeated.records.map((record) => record.id)).toEqual(
      [...repeated.records.map((record) => record.id)].sort(),
    );
  });

  it('pins Brain proposals to the graph fingerprint and materializes only the architect-approved fresh preview', async () => {
    const repository = new InMemoryProjectRepository();
    const app = await buildApp({ repository, logger: false });
    try {
      const before = (await repository.getProject(
        sampleProject.tenantId,
        sampleProject.id,
        sampleProject.branch.id,
      )) as ArchitectureProject;

      const previewResponse = await app.inject({
        method: 'POST',
        url: `/api/projects/${before.id}/branches/${before.branch.id}/design-graph/preview`,
        headers,
        payload: { expectedRevision: before.revision },
      });
      expect(previewResponse.statusCode).toBe(200);
      const preview = previewResponse.json();
      expect(preview.projectionMode).toBe('legacy-project-projection');
      expect(preview.integrity.healthy).toBe(true);
      expect(preview.brainReceipt.task).toBe('design-graph-projection');
      expect(preview.brainReceipt.graph.fingerprint).toBe(preview.fingerprint);
      expect(preview.brainReceipt.graph.legacyProjectionUsed).toBe(true);
      expect(preview.brainReceipt.governance.directModelMutationAllowed).toBe(false);

      const materializeResponse = await app.inject({
        method: 'POST',
        url: `/api/projects/${before.id}/branches/${before.branch.id}/design-graph/materialize`,
        headers,
        payload: {
          expectedRevision: before.revision,
          previewFingerprint: preview.fingerprint,
        },
      });
      expect(materializeResponse.statusCode).toBe(200);
      const materialized = materializeResponse.json();
      expect(materialized.project.revision).toBe(before.revision + 1);
      expect(materialized.designGraph.projectionMode).toBe('materialized-canonical');
      expect(materialized.designGraph.projectRevision).toBe(materialized.project.revision);
      expect(materialized.designGraph.integrity.healthy).toBe(true);
      expect(materialized.materializationReceipt.humanApprovalRequired).toBe(true);
      expect(materialized.materializationReceipt.sourceAuthority).toBe('architect');

      const staleResponse = await app.inject({
        method: 'POST',
        url: `/api/projects/${before.id}/branches/${before.branch.id}/design-graph/materialize`,
        headers,
        payload: {
          expectedRevision: materialized.project.revision,
          previewFingerprint: preview.fingerprint,
        },
      });
      expect(staleResponse.statusCode).toBe(409);
      expect(staleResponse.json().error).toBe('STALE_DESIGN_GRAPH_PREVIEW');
    } finally {
      await app.close();
    }
  });

  it('changes the graph fingerprint when accepted project meaning changes and rejects dangling lineage', () => {
    const baseline = buildArchitectureDesignGraph(structuredClone(sampleProject));
    const changedProject = structuredClone(sampleProject);
    changedProject.objectives = [...changedProject.objectives, 'Support explicit reconciliation ownership'];
    const changed = buildArchitectureDesignGraph(changedProject);
    expect(changed.fingerprint).not.toBe(baseline.fingerprint);

    const broken = structuredClone(baseline) as ArchitectureDesignGraph;
    broken.relationships.push({
      id: 'rel:test:dangling',
      sourceId: 'architecture-node:does-not-exist',
      targetId: `project:${sampleProject.id}`,
      kind: 'affects',
      sourceRef: 'test',
      rationale: 'Deliberate integrity test',
      evidenceRefs: [],
      stageRefs: [],
      fingerprint: 'fnv1a-00000000',
    });
    const integrity = validateArchitectureDesignGraph(broken);
    expect(integrity.healthy).toBe(false);
    expect(integrity.danglingRelationshipIds).toContain('rel:test:dangling');
  });
});
