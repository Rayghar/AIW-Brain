import { describe, expect, it } from 'vitest';
import {
  getArchitectureDesignGraphStateAuthority,
  sampleProject,
  type ArchitectureProject,
} from '@aiw/domain';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

const headers = {
  'x-aiw-tenant-id': 'tenant-reference',
  'x-aiw-user-id': 'user-owner',
};

describe('rc.10.73.1 canonical graph-primary state migration', () => {
  it('migrates requirements, evidence, interfaces, decisions, findings and risks into graph-primary authority', async () => {
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

      const migrationResponse = await app.inject({
        method: 'POST',
        url: `/api/projects/${before.id}/branches/${before.branch.id}/design-graph/migrate-state`,
        headers,
        payload: {
          expectedRevision: materialized.project.revision,
          graphFingerprint: materialized.designGraph.fingerprint,
        },
      });
      expect(migrationResponse.statusCode).toBe(200);
      const migrated = migrationResponse.json();
      expect(migrated.project.revision).toBe(materialized.project.revision + 1);
      expect(migrated.stateAuthority.mode).toBe('graph-primary');
      expect(migrated.stateAuthority.lastWritePath).toBe('migration');
      expect(migrated.stateAuthority.canonicalStateKinds).toEqual(
        expect.arrayContaining(['requirements', 'evidence', 'interfaces', 'decisions', 'findings', 'risks']),
      );
      expect(migrated.migrationReceipt.humanApprovalRequired).toBe(true);
      expect(migrated.migrationReceipt.sourceAuthority).toBe('architect');
      expect(migrated.designGraph.projectionMode).toBe('materialized-canonical');
      expect(migrated.designGraph.integrity.healthy).toBe(true);
      const canonicalDecision = migrated.designGraph.records.find(
        (record: { kind: string }) => record.kind === 'decision',
      );
      expect(canonicalDecision?.attributes.canonicalValue).toBeDefined();
      expect(migrated.project.decisions).toEqual(
        migrated.designGraph.records
          .filter((record: { kind: string }) => record.kind === 'decision')
          .map((record: { attributes: { canonicalValue: unknown } }) => record.attributes.canonicalValue),
      );
    } finally {
      await app.close();
    }
  });

  it('accepts fingerprint-pinned graph-native state commands and rejects stale commands', async () => {
    const repository = new InMemoryProjectRepository();
    const app = await buildApp({ repository, logger: false });
    try {
      const before = (await repository.getProject(
        sampleProject.tenantId,
        sampleProject.id,
        sampleProject.branch.id,
      )) as ArchitectureProject;
      const preview = (await app.inject({
        method: 'POST',
        url: `/api/projects/${before.id}/branches/${before.branch.id}/design-graph/preview`,
        headers,
        payload: { expectedRevision: before.revision },
      })).json();
      const materialized = (await app.inject({
        method: 'POST',
        url: `/api/projects/${before.id}/branches/${before.branch.id}/design-graph/materialize`,
        headers,
        payload: { expectedRevision: before.revision, previewFingerprint: preview.fingerprint },
      })).json();
      const migrated = (await app.inject({
        method: 'POST',
        url: `/api/projects/${before.id}/branches/${before.branch.id}/design-graph/migrate-state`,
        headers,
        payload: {
          expectedRevision: materialized.project.revision,
          graphFingerprint: materialized.designGraph.fingerprint,
        },
      })).json();

      const decision = {
        id: 'ADR-RC10731-001',
        title: 'Keep canonical state in the Design Graph',
        context: 'Parallel project fields previously acted as independent state authorities.',
        decision: 'Persist governed architecture state in the canonical Design Graph and project legacy fields from it.',
        drivers: ['traceability', 'reproducibility'],
        consideredOptions: ['Parallel ledgers', 'Canonical graph-primary state'],
        consequences: ['Legacy writes pass through a compatibility adapter'],
        status: 'accepted',
        createdAt: '2026-07-14T15:00:00.000Z',
      };
      const decisions = [...migrated.project.decisions, decision];
      const commandResponse = await app.inject({
        method: 'PUT',
        url: `/api/projects/${before.id}/branches/${before.branch.id}/design-graph/state`,
        headers,
        payload: {
          expectedRevision: migrated.project.revision,
          graphFingerprint: migrated.designGraph.fingerprint,
          canonicalState: { decisions },
        },
      });
      expect(commandResponse.statusCode).toBe(200);
      const applied = commandResponse.json();
      expect(applied.commandReceipt.changedStateKinds).toContain('decisions');
      expect(applied.stateAuthority.lastWritePath).toBe('graph-command');
      expect(applied.project.decisions.some((item: { id: string }) => item.id === decision.id)).toBe(true);
      expect(applied.designGraph.records.some(
        (record: { id: string; attributes: { canonicalValue?: { id?: string } } }) =>
          record.id === `decision:${decision.id}` && record.attributes.canonicalValue?.id === decision.id,
      )).toBe(true);

      const staleResponse = await app.inject({
        method: 'PUT',
        url: `/api/projects/${before.id}/branches/${before.branch.id}/design-graph/state`,
        headers,
        payload: {
          expectedRevision: applied.project.revision,
          graphFingerprint: migrated.designGraph.fingerprint,
          canonicalState: { decisions: applied.project.decisions.slice(0, -1) },
        },
      });
      expect(staleResponse.statusCode).toBe(409);
      expect(staleResponse.json().error).toBe('STALE_DESIGN_GRAPH_STATE_COMMAND');

      const clearResponse = await app.inject({
        method: 'PUT',
        url: `/api/projects/${before.id}/branches/${before.branch.id}/design-graph/state`,
        headers,
        payload: {
          expectedRevision: applied.project.revision,
          graphFingerprint: applied.designGraph.fingerprint,
          canonicalState: { decisions: [] },
        },
      });
      expect(clearResponse.statusCode).toBe(200);
      const cleared = clearResponse.json();
      expect(cleared.project.decisions).toEqual([]);
      expect(cleared.designGraph.records.filter(
        (record: { kind: string }) => record.kind === 'decision',
      )).toEqual([]);
    } finally {
      await app.close();
    }
  });

  it('translates legacy canonical-field writes through the compatibility adapter instead of persisting a second authority', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.saveProject(structuredClone(sampleProject));
    const initial = (await repository.getProject(
      sampleProject.tenantId,
      sampleProject.id,
      sampleProject.branch.id,
    )) as ArchitectureProject;
    const { migrateArchitectureProjectStateToDesignGraph } = await import('@aiw/domain');
    const migrated = migrateArchitectureProjectStateToDesignGraph({
      project: initial,
      expectedGraphFingerprint: initial.designGraph!.fingerprint,
      actorId: 'user-owner',
      migratedAt: '2026-07-14T15:10:00.000Z',
    });
    const saved = await repository.saveProject(migrated.project, initial.revision);
    const compatibilityWrite = structuredClone(saved);
    compatibilityWrite.revision += 1;
    compatibilityWrite.updatedAt = '2026-07-14T15:11:00.000Z';
    compatibilityWrite.findings = [
      ...compatibilityWrite.findings,
      {
        id: 'F-RC10731-001',
        ruleId: 'RC10731-GRAPH-PRIMARY',
        severity: 'SIGNIFICANT',
        title: 'Compatibility write translated',
        message: 'A legacy field update must become a canonical graph record.',
        rationale: 'Parallel authority is prohibited.',
        affectedNodeIds: [],
        affectedEdgeIds: [],
        mitigations: ['Use the graph-native state endpoint'],
        canOverride: false,
      },
    ];
    const translated = await repository.saveProject(compatibilityWrite, saved.revision);
    const authority = getArchitectureDesignGraphStateAuthority(translated.designGraph);
    expect(authority?.lastWritePath).toBe('compatibility-adapter');
    expect(authority?.compatibilityWriteCount).toBe(1);
    expect(translated.designGraph?.records.some(
      (record) => record.id === 'finding:F-RC10731-001'
        && (record.attributes.canonicalValue as { id?: string } | undefined)?.id === 'F-RC10731-001',
    )).toBe(true);
  });
});
