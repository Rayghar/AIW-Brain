import { afterEach, describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';

let app: Awaited<ReturnType<typeof buildApp>> | undefined;
afterEach(async () => { if (app) await app.close(); app = undefined; });

async function authenticated() {
  app = await buildApp();
  const tokenResponse = await app.inject({ method: 'POST', url: '/api/auth/development-token', payload: { subject: 'user-owner', email: 'owner@example.com', displayName: 'Owner', tenantId: sampleProject.tenantId } });
  return { authorization: `Bearer ${tokenResponse.json().token}` };
}

describe('v0.9.1 intelligence core API', () => {
  it('exposes the corrective platform release', async () => {
    const headers = await authenticated();
    const response = await app!.inject({ method: 'GET', url: '/api/releases/8.0.1', headers });
    expect(response.statusCode).toBe(200);
    expect(response.json().releaseId).toBe('AIW-0.9.1');
    expect(response.json().capabilities.contextualVisualKnowledgeGuide).toBe(true);
    expect(response.json().capabilities.providerNeutralEmbeddedCoArchitect).toBe(true);
  });

  it('keeps assisted audit safe when no external model is configured', async () => {
    const headers = await authenticated();
    const response = await app!.inject({ method: 'POST', url: '/api/audits/assisted', headers, payload: { projectId: sampleProject.id, branchId: sampleProject.branch.id, expectedRevision: sampleProject.revision } });
    expect(response.statusCode).toBe(200);
    expect(['deterministic','llm-assisted']).toContain(response.json().source);
    for (const proposal of response.json().proposals) {
      expect(proposal.severity).not.toBe('HARD');
      expect(proposal.operations.every((operation: { type: string }) => !['DELETE_NODE','DELETE_EDGE'].includes(operation.type))).toBe(true);
      if (response.json().source === 'llm-assisted') {
        expect(proposal.evidenceRecordIds.length).toBeGreaterThan(0);
      }
    }
  });

  it('answers co-architect questions through the governed route or deterministic fallback', async () => {
    const headers = await authenticated();
    const response = await app!.inject({ method: 'POST', url: '/api/co-architect/ask', headers, payload: { ...{ projectId: sampleProject.id, branchId: sampleProject.branch.id, expectedRevision: sampleProject.revision }, question: 'What should I decide next?' } });
    expect(response.statusCode).toBe(200);
    expect(['llm-assisted','deterministic-fallback']).toContain(response.json().mode);
    expect(response.json().answer.length).toBeGreaterThan(20);
    expect(Array.isArray(response.json().suggestedNextActions)).toBe(true);
    expect(response.json().brainReceipt.task).toBe('explain-or-challenge');
    expect(response.json().brainReceipt.governance.directModelMutationAllowed).toBe(false);
  });
});
