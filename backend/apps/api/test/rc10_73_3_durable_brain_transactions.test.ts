import { describe, expect, it } from 'vitest';
import { sampleProject, type ArchitectureProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';
import { InMemoryBrainTransactionRepository } from '../src/brainTransactionRepository.js';

const ownerHeaders = {
  'x-aiw-tenant-id': sampleProject.tenantId,
  'x-aiw-user-id': 'user-owner',
  'x-aiw-roles': 'platform-admin,solution-architect',
};
const reviewerHeaders = {
  'x-aiw-tenant-id': sampleProject.tenantId,
  'x-aiw-user-id': 'user-reviewer',
  'x-aiw-roles': 'architecture-reviewer',
};

describe('rc.10.73.3 durable Brain transactions and independent review authority', () => {
  it('automatically records every governed Brain receipt as a hash-chained durable proposal transaction', async () => {
    const repository = new InMemoryProjectRepository();
    const brainTransactions = new InMemoryBrainTransactionRepository();
    const app = await buildApp({ repository, brainTransactionRepository: brainTransactions, logger: false });
    try {
      const project = await repository.getProject(sampleProject.tenantId, sampleProject.id, sampleProject.branch.id);
      expect(project).toBeDefined();
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${project!.id}/branches/${project!.branch.id}/design-graph/preview`,
        headers: ownerHeaders,
        payload: { expectedRevision: project!.revision },
      });
      expect(response.statusCode).toBe(200);
      const transactionId = String(response.headers['x-aiw-brain-transaction-id']);
      expect(transactionId).toMatch(/^BRAIN-design-graph-projection-/);
      expect(response.headers['x-aiw-brain-transaction-version']).toBe('1');
      const transaction = await brainTransactions.getTransaction(sampleProject.tenantId, transactionId);
      expect(transaction).toMatchObject({
        id: transactionId,
        projectId: project!.id,
        branchId: project!.branch.id,
        task: 'design-graph-projection',
        status: 'proposed',
        version: 1,
        createdBy: 'user-owner',
      });
      const events = await brainTransactions.listEvents(sampleProject.tenantId, transactionId);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ sequence: 1, type: 'proposal-recorded', previousHash: '' });
      expect(events[0]!.eventHash).toHaveLength(64);

      const repeated = await brainTransactions.recordProposal({
        tenantId: sampleProject.tenantId,
        actorId: 'user-owner',
        actorRoles: ['solution-architect'],
        correlationId: 'replay',
        receipt: response.json().brainReceipt,
        summary: transaction!.summary,
      });
      expect(repeated.id).toBe(transactionId);
      expect((await brainTransactions.listEvents(sampleProject.tenantId, transactionId))).toHaveLength(1);
    } finally {
      await app.close();
    }
  });

  it('requires an independent named reviewer, records rationale, and keeps review events append-only', async () => {
    const repository = new InMemoryProjectRepository();
    const brainTransactions = new InMemoryBrainTransactionRepository();
    const app = await buildApp({ repository, brainTransactionRepository: brainTransactions, logger: false });
    try {
      const project = await repository.getProject(sampleProject.tenantId, sampleProject.id, sampleProject.branch.id);
      const proposalResponse = await app.inject({
        method: 'POST',
        url: `/api/projects/${project!.id}/branches/${project!.branch.id}/design-graph/preview`,
        headers: ownerHeaders,
        payload: { expectedRevision: project!.revision },
      });
      const transactionId = String(proposalResponse.headers['x-aiw-brain-transaction-id']);

      const selfAssignment = await app.inject({
        method: 'POST',
        url: `/api/projects/${project!.id}/branches/${project!.branch.id}/brain-transactions/${transactionId}/review/assign`,
        headers: ownerHeaders,
        payload: { expectedVersion: 1, assignedReviewerId: 'user-owner', instructions: 'Independently review the canonical graph proposal.', priority: 'high' },
      });
      expect(selfAssignment.statusCode).toBeGreaterThanOrEqual(400);
      expect(selfAssignment.json().error).toBe('INDEPENDENT_REVIEWER_REQUIRED');

      const assigned = await app.inject({
        method: 'POST',
        url: `/api/projects/${project!.id}/branches/${project!.branch.id}/brain-transactions/${transactionId}/review/assign`,
        headers: ownerHeaders,
        payload: { expectedVersion: 1, assignedReviewerId: 'user-reviewer', instructions: 'Independently review graph integrity, evidence and authority boundaries.', priority: 'high' },
      });
      expect(assigned.statusCode).toBe(200);
      const assignedBody = assigned.json();
      expect(assignedBody.transaction).toMatchObject({ status: 'review-pending', version: 2, assignedReviewerId: 'user-reviewer' });
      const assignmentId = assignedBody.reviewAssignment.id as string;

      const ownerDisposition = await app.inject({
        method: 'POST',
        url: `/api/projects/${project!.id}/branches/${project!.branch.id}/brain-transactions/${transactionId}/review/disposition`,
        headers: ownerHeaders,
        payload: { expectedVersion: 2, assignmentId, disposition: 'approved', rationale: 'The proposal is acceptable and may proceed.', evidenceRefs: [] },
      });
      expect(ownerDisposition.statusCode).toBe(403);

      const disposition = await app.inject({
        method: 'POST',
        url: `/api/projects/${project!.id}/branches/${project!.branch.id}/brain-transactions/${transactionId}/review/disposition`,
        headers: reviewerHeaders,
        payload: {
          expectedVersion: 2,
          assignmentId,
          disposition: 'approved',
          rationale: 'Graph integrity is healthy, the authority chain is explicit, and no direct model mutation is permitted.',
          evidenceRefs: ['review-evidence:graph-integrity', 'review-evidence:authority-boundary'],
        },
      });
      expect(disposition.statusCode).toBe(200);
      const dispositionBody = disposition.json();
      expect(dispositionBody.transaction).toMatchObject({ status: 'approved', version: 3 });

      const committed = await app.inject({
        method: 'POST',
        url: `/api/projects/${project!.id}/branches/${project!.branch.id}/brain-transactions/${transactionId}/commit`,
        headers: ownerHeaders,
        payload: {
          expectedVersion: 3,
          expectedProjectRevision: dispositionBody.project.revision,
          expectedGraphFingerprint: dispositionBody.transaction.graphFingerprint,
          rationale: 'Commit the independently approved proposal while its canonical Design Graph fingerprint remains current.',
        },
      });
      expect(committed.statusCode).toBe(200);
      expect(committed.json().transaction).toMatchObject({ status: 'committed', version: 4 });

      const events = await brainTransactions.listEvents(sampleProject.tenantId, transactionId);
      expect(events.map((item) => item.type)).toEqual(['proposal-recorded', 'review-assigned', 'review-approved', 'committed']);
      for (let index = 1; index < events.length; index += 1) {
        expect(events[index]!.previousHash).toBe(events[index - 1]!.eventHash);
      }
      expect(events[2]!.rationale).toContain('Graph integrity is healthy');
    } finally {
      await app.close();
    }
  });

  it('uses first-class architecture-rule waivers rather than reusing operational drift waivers', async () => {
    const repository = new InMemoryProjectRepository();
    const project: ArchitectureProject = structuredClone(sampleProject);
    project.findings[0] = { ...project.findings[0]!, canOverride: true };
    await repository.saveProject(project);
    const brainTransactions = new InMemoryBrainTransactionRepository();
    const app = await buildApp({ repository, brainTransactionRepository: brainTransactions, logger: false });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/branches/${project.branch.id}/architecture-waivers`,
        headers: reviewerHeaders,
        payload: {
          findingId: project.findings[0]!.id,
          reason: 'A short migration window is required while the managed multi-zone database is provisioned and recovery evidence is completed.',
          compensatingControls: ['Daily restore verification', 'Escalated database availability monitoring'],
          evidenceRefs: ['change:DB-204', 'runbook:temporary-recovery-control'],
          ownerId: 'user-owner',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().waiver).toMatchObject({
        status: 'active',
        findingId: project.findings[0]!.id,
        approvedBy: 'user-reviewer',
        ownerId: 'user-owner',
      });
      const stored = await brainTransactions.listWaivers(project.tenantId, project.id, project.branch.id);
      expect(stored).toHaveLength(1);
      expect(project.driftWaivers).toHaveLength(0);
    } finally {
      await app.close();
    }
  });
});
