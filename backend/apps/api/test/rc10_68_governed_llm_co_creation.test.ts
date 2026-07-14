import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { sampleProject, type ArchitectureProject, type DesignGestureEvent, type KnowledgeLibrary, type LlmCoCreationProposal } from '@aiw/domain';
import { orchestrateDeterministicDesignActions } from '@aiw/engine';
import { enrichLivingCanvasWithGovernedLlm } from '../src/livingCanvasLlmAssistant.js';
import { LivingCanvasFeedbackStore, livingCanvasFeedbackStore } from '../src/livingCanvasFeedbackStore.js';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

const library = JSON.parse(readFileSync(new URL('../../../data/knowledge-library.json', import.meta.url), 'utf8')) as KnowledgeLibrary;
const tempPath = resolve('data/local/rc10-68-feedback-test.json');

afterEach(() => {
  delete process.env.AIW_LIVING_CANVAS_FEEDBACK_PATH;
  rmSync(tempPath, { force: true });
});

function projectAndEnvelope() {
  const project = structuredClone(sampleProject) as ArchitectureProject;
  project.activeStage = 'applicationRealization';
  project.description ||= 'A secure digital service with external actors and governed integrations.';
  project.objectives = project.objectives.length ? project.objectives : ['Deliver a secure digital service'];
  const source = project.nodes.find((node) => node.stage === 'logicalApplication') ?? project.nodes[0]!;
  const event: DesignGestureEvent = {
    id: 'rc10-68-test-event', kind: 'candidate-requested', occurredAt: '2026-07-12T15:00:00.000Z',
    tenantId: project.tenantId, projectId: project.id, branchId: project.branch.id,
    revision: project.revision, actorId: 'user-owner', actorRole: 'solution-architect',
    stage: 'logicalApplication', targetStage: 'applicationRealization',
    selectedScopeId: source.id, subjectIds: [source.id], decompositionLevel: 'container', autonomyMode: 'guide',
  };
  return { project, envelope: orchestrateDeterministicDesignActions({ project, library, event }) };
}

function responseFor(allowedKey: string): LlmCoCreationProposal {
  return {
    schemaVersion: '1.0', taskKind: 'compose-local-alternatives',
    clarifications: [{ id: 'clarify-1', question: 'Which interaction needs the strongest latency objective?', whyItMatters: 'This changes the preferred interface posture.', relatedRequirementRefs: [], blocking: false }],
    alternatives: [{ id: 'alt-1', title: 'Governed local composition', summary: 'Bundle the highest-fit eligible design action.', selectedActionSemanticKeys: [allowedKey, 'malicious-invented-action'], rationale: 'Uses only canonically eligible operations.', tradeOffs: ['Adds an explicit review step'], omittedConsequences: ['The architect can continue deterministically'], citedRecordIds: ['invented-evidence'], confidence: 0.82 }],
    rankAdjustments: [{ actionSemanticKey: allowedKey, delta: 8, reason: 'Matches the stated quality posture.' }, { actionSemanticKey: 'malicious-invented-action', delta: 20, reason: 'Must be rejected.' }],
    knowledgeGapSignals: [{ topic: 'Sector-specific latency benchmark', reason: 'No approved benchmark is present for this exact scenario.', suggestedSourceType: 'benchmark' }],
  };
}

function fakeGateway(providerId: 'openai' | 'local-openai', proposal: LlmCoCreationProposal) {
  return {
    async generateJson<T>() {
      return { value: proposal as T, providerId, model: providerId === 'local-openai' ? 'private-architecture-model' : 'governed-cloud-model', routeId: `architecture-reasoning:${providerId}`, protocol: 'chat-completions' as const, latencyMs: 12, usage: {}, requestFingerprint: 'fp-rc1068', fallbackUsed: false };
    },
  };
}

describe('rc.10.68 governed LLM co-creation', () => {
  it('allows the model to rank and bundle only prevalidated deterministic actions', async () => {
    const { project, envelope } = projectAndEnvelope();
    const allowed = envelope.actions.find((action) => action.eligibility.eligible)!;
    expect(allowed).toBeTruthy();
    const result = await enrichLivingCanvasWithGovernedLlm({ project, envelope, gateway: fakeGateway('openai', responseFor(allowed.semanticKey)) });
    expect(result.assistance?.mode).toBe('llm-assisted');
    const proposal = result.actions.find((action) => action.authorityClass === 'llm-proposed')!;
    expect(proposal).toBeTruthy();
    expect(proposal.mutationSet.operations).toEqual(allowed.mutationSet.operations);
    expect(JSON.stringify(result.actions)).not.toContain('malicious-invented-action');
    expect(proposal.knowledgeClaimRefs).not.toContain('invented-evidence');
    expect(result.assistance?.knowledgeGapSignals).toHaveLength(1);
  });

  it('produces equivalent governed semantics for cloud and private/offline routes', async () => {
    const { project, envelope } = projectAndEnvelope();
    const allowed = envelope.actions.find((action) => action.eligibility.eligible)!;
    const proposal = responseFor(allowed.semanticKey);
    const cloud = await enrichLivingCanvasWithGovernedLlm({ project, envelope, gateway: fakeGateway('openai', proposal) });
    const privateModel = await enrichLivingCanvasWithGovernedLlm({ project, envelope, gateway: fakeGateway('local-openai', proposal) });
    const semantic = (value: typeof cloud) => value.actions.map((action) => ({ semanticKey: action.semanticKey, operations: action.mutationSet.operations }));
    expect(semantic(privateModel)).toEqual(semantic(cloud));
    expect(privateModel.assistance?.trace?.providerId).toBe('local-openai');
  });

  it('falls back to deterministic guidance without losing the action envelope', async () => {
    const { project, envelope } = projectAndEnvelope();
    const gateway = { async generateJson() { throw new Error('MODEL_UNAVAILABLE'); } };
    const result = await enrichLivingCanvasWithGovernedLlm({ project, envelope, gateway });
    expect(result.assistance?.mode).toBe('deterministic-fallback');
    expect(result.actions.map((action) => action.semanticKey)).toEqual(envelope.actions.map((action) => action.semanticKey));
    expect(result.deterministicOnly).toBe(true);
  });
});

describe('rc.10.68 Mind Factory feedback loop', () => {
  it('persists, deduplicates and triages knowledge-gap feedback with tenant isolation', () => {
    process.env.AIW_LIVING_CANVAS_FEEDBACK_PATH = tempPath;
    const store = new LivingCanvasFeedbackStore();
    const input = { tenantId: 'tenant-a', projectId: 'project-a', branchId: 'branch-main', stage: 'applicationRealization' as const, feedbackKind: 'knowledge-gap' as const, actionSemanticKey: 'gap:latency-benchmark', authorityClass: 'llm-proposed' as const, outcome: 'deferred' as const, reason: 'Approved evidence is missing.', topic: 'Latency benchmark', suggestedSourceType: 'benchmark', citedRecordIds: [], knowledgeReleaseId: 'AKR-0.10.67-REFERENCE' };
    const first = store.record(input);
    const duplicate = store.record(input);
    expect(duplicate.id).toBe(first.id);
    expect(store.list('tenant-a')).toHaveLength(1);
    expect(store.list('tenant-b')).toHaveLength(0);
    const triaged = store.triage({ tenantId: 'tenant-a', receiptId: first.id, status: 'converted-to-candidate', curator: 'knowledge-curator', curationNote: 'Create a non-scoring candidate and assign independent review.' });
    expect(triaged).toMatchObject({ status: 'converted-to-candidate', curator: 'knowledge-curator' });
    expect(JSON.parse(readFileSync(tempPath, 'utf8')).receipts).toHaveLength(1);
  });
});


describe('rc.10.68 governed feedback API and curator workbench', () => {
  it('records architect feedback, isolates it by tenant and stages it as a non-scoring curator candidate', async () => {
    livingCanvasFeedbackStore.clearForTests();
    const app = await buildApp({ repository: new InMemoryProjectRepository(), logger: false });
    try {
      const architectHeaders = {
        'x-aiw-tenant-id': sampleProject.tenantId,
        'x-aiw-user-id': 'reference-solution-architect',
        'x-aiw-roles': 'solution-architect',
      };
      const curatorHeaders = {
        'x-aiw-tenant-id': sampleProject.tenantId,
        'x-aiw-user-id': 'reference-knowledge-curator',
        'x-aiw-roles': 'knowledge-curator',
      };
      const recorded = await app.inject({
        method: 'POST',
        url: `/api/projects/${sampleProject.id}/branches/${sampleProject.branch.id}/living-canvas/feedback`,
        headers: architectHeaders,
        payload: {
          stage: 'applicationRealization',
          actionSemanticKey: 'llm-governed:acceptance-signal',
          actionLabel: 'Governed co-creation acceptance signal',
          authorityClass: 'llm-proposed',
          outcome: 'deferred',
          reason: 'Requires curator review before it can influence future recommendations.',
          citedRecordIds: [],
          knowledgeReleaseId: 'AKR-0.10.64-REFERENCE',
          modelTrace: {
            providerId: 'local-openai',
            model: 'acceptance-private-model',
            routeId: 'architecture-reasoning:local-openai',
            requestFingerprint: 'rc1068-api-test',
            latencyMs: 4,
            fallbackUsed: false,
            activeKnowledgeReleaseId: 'AKR-0.10.64-REFERENCE',
          },
        },
      });
      expect(recorded.statusCode).toBe(201);
      expect(recorded.json()).toMatchObject({
        actionSemanticKey: 'llm-governed:acceptance-signal',
        status: 'queued-for-curation',
        authorityClass: 'llm-proposed',
      });

      const workbench = await app.inject({ method: 'GET', url: '/api/knowledge-ops/workbench', headers: curatorHeaders });
      expect(workbench.statusCode).toBe(200);
      expect(workbench.json().livingCanvasFeedback).toEqual(expect.arrayContaining([
        expect.objectContaining({ actionSemanticKey: 'llm-governed:acceptance-signal', status: 'queued-for-curation' }),
      ]));

      const receiptId = recorded.json().id as string;
      const triaged = await app.inject({
        method: 'POST',
        url: `/api/knowledge-ops/living-canvas-feedback/${receiptId}/triage`,
        headers: curatorHeaders,
        payload: {
          status: 'converted-to-candidate',
          rationale: 'Stage this as a non-scoring candidate for independent evidence review.',
        },
      });
      expect(triaged.statusCode).toBe(200);
      expect(triaged.json()).toMatchObject({
        triaged: true,
        feedback: { id: receiptId, status: 'converted-to-candidate', curator: 'reference-knowledge-curator' },
      });
      expect(triaged.json().note).toMatch(/remains non-scoring/i);

      const otherTenant = await app.inject({
        method: 'GET',
        url: '/api/knowledge-ops/living-canvas-feedback',
        headers: { ...curatorHeaders, 'x-aiw-tenant-id': 'tenant-other' },
      });
      expect(otherTenant.statusCode).toBe(200);
      expect(otherTenant.json().feedback).toEqual([]);
    } finally {
      await app.close();
      livingCanvasFeedbackStore.clearForTests();
    }
  });
});
