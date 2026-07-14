import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { sampleProject, type ArchitectureProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

const headers = { 'x-aiw-tenant-id': 'tenant-reference', 'x-aiw-user-id': 'user-owner' };
const brief = 'The agency banking solution must enable agents to onboard customers, verify identity, complete cash deposits, withdrawals and transfers, integrate with core banking and the payment switch, reconcile transactions, support reversals, protect customer data and remain available during failures.';

describe('rc.10.71 requirements intelligence API', () => {
  it('extracts text sources, distils a non-mutating proposal and accepts it only through the governed apply endpoint', async () => {
    const repository = new InMemoryProjectRepository();
    const app = await buildApp({ repository, logger: false });
    try {
      const extraction = await app.inject({
        method: 'POST',
        url: '/api/requirements-intelligence/extract-source',
        headers,
        payload: { filename: 'agency-brief.txt', mediaType: 'text/plain', classification: 'confidential', base64: Buffer.from(brief).toString('base64') },
      });
      expect(extraction.statusCode).toBe(200);
      expect(extraction.json()).toMatchObject({ name: 'agency-brief.txt', kind: 'text', classification: 'confidential' });
      expect(extraction.json().text).toContain('agency banking');

      const docxBytes = readFileSync(fileURLToPath(new URL('./fixtures/agency-brief.docx', import.meta.url)));
      const docxExtraction = await app.inject({
        method: 'POST',
        url: '/api/requirements-intelligence/extract-source',
        headers,
        payload: { filename: 'agency-brief.docx', mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', classification: 'confidential', base64: docxBytes.toString('base64') },
      });
      expect(docxExtraction.statusCode).toBe(200);
      expect(docxExtraction.json()).toMatchObject({ name: 'agency-brief.docx', kind: 'docx', classification: 'confidential' });
      expect(docxExtraction.json().text).toContain('onboard customers');

      const baseline = await repository.getProject('tenant-reference', sampleProject.id, sampleProject.branch.id);
      expect(baseline).toBeTruthy();
      const project = structuredClone(baseline) as ArchitectureProject;
      project.description = 'Agency banking project';
      project.objectives = [];
      project.requirementsIntelligence = undefined;
      const persistedProject = await repository.saveProject(project, baseline!.revision);

      const distillation = await app.inject({
        method: 'POST',
        url: '/api/requirements-intelligence/distill',
        headers,
        payload: { projectId: project.id, branchId: project.branch.id, expectedRevision: persistedProject.revision, intelligenceMode: 'deterministic', knowledgeReleaseId: 'CAMBRIDGE-SA-1.0', sources: [{ name: 'agency-brief.txt', kind: 'paste', classification: 'confidential', text: brief }] },
      });
      expect(distillation.statusCode).toBe(200);
      const proposal = distillation.json();
      expect(proposal.requirements.length).toBeGreaterThan(0);
      expect(proposal.journeys.length).toBeGreaterThan(0);
      expect(proposal.contextPackages.some((item: { target: string }) => item.target === 'systemContext')).toBe(true);
      const unchanged = await repository.getProject('tenant-reference', sampleProject.id, sampleProject.branch.id);
      expect(unchanged?.revision).toBe(persistedProject.revision);
      expect(unchanged?.requirementsIntelligence).toBeUndefined();

      const apply = await app.inject({
        method: 'POST',
        url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}/requirements-intelligence/apply`,
        headers,
        payload: { expectedRevision: persistedProject.revision, proposal, knowledgeReleaseId: 'CAMBRIDGE-SA-1.0' },
      });
      expect(apply.statusCode).toBe(200);
      const accepted = apply.json();
      expect(accepted.revision).toBe(persistedProject.revision + 1);
      expect(accepted.requirementsIntelligence.requirements.some((item: { status: string }) => item.status === 'accepted')).toBe(true);
      expect(accepted.requirementsIntelligence.requirements.some((item: { status: string }) => item.status === 'candidate')).toBe(false);

      const read = await app.inject({ method: 'GET', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}/requirements-intelligence`, headers });
      expect(read.statusCode).toBe(200);
      expect(read.json().state.knowledgeReleaseId).toBe('CAMBRIDGE-SA-1.0');
    } finally {
      await app.close();
    }
  });

  it('rejects stale apply operations and oversized or empty extraction requests', async () => {
    const repository = new InMemoryProjectRepository();
    const app = await buildApp({ repository, logger: false });
    try {
      const baseline = await repository.getProject('tenant-reference', sampleProject.id, sampleProject.branch.id);
      const distillation = await app.inject({ method: 'POST', url: '/api/requirements-intelligence/distill', headers, payload: { projectId: baseline!.id, branchId: baseline!.branch.id, expectedRevision: baseline!.revision, intelligenceMode: 'deterministic', sources: [{ name: 'brief.txt', text: brief }] } });
      const proposal = distillation.json();
      const stale = await app.inject({ method: 'POST', url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}/requirements-intelligence/apply`, headers, payload: { expectedRevision: baseline!.revision + 99, proposal } });
      expect(stale.statusCode).toBe(409);
      expect(stale.json().error).toBe('REVISION_CONFLICT');

      const empty = await app.inject({ method: 'POST', url: '/api/requirements-intelligence/extract-source', headers, payload: { filename: 'empty.txt', mediaType: 'text/plain', base64: '' } });
      expect(empty.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});
