import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sampleProject, type DesignGestureEvent, type KnowledgeLibrary } from '@aiw/domain';
import {
  applyGenerativeAction,
  orchestrateDeterministicDesignActions,
  rollbackGenerativeMutation,
  StaleGenerativeProposalError,
} from '../src/index.js';

const library = JSON.parse(readFileSync(new URL('../../../data/knowledge-library.json', import.meta.url), 'utf8')) as KnowledgeLibrary;

function gesture(project = sampleProject, overrides: Partial<DesignGestureEvent> = {}): DesignGestureEvent {
  return {
    id: `gesture-${project.revision}`,
    kind: 'candidate-requested',
    occurredAt: '2026-07-12T10:00:00.000Z',
    tenantId: project.tenantId,
    projectId: project.id,
    branchId: project.branch.id,
    revision: project.revision,
    actorId: 'user-owner',
    actorRole: 'solution-architect',
    stage: 'qualityDrivers',
    targetStage: 'logicalApplication',
    decompositionLevel: 'system',
    autonomyMode: 'guide',
    ...overrides,
  };
}

function blankIntentProject() {
  const project = structuredClone(sampleProject);
  project.activeStage = 'logicalApplication';
  project.nodes = [];
  project.edges = [];
  project.interfaces = [];
  project.revision = 1;
  project.description = 'Create a regulated digital payments platform for customers and partner channels.';
  project.objectives = ['Let customers initiate and track payments', 'Integrate safely with payment partners'];
  project.constraints = ['Payment data must remain auditable'];
  return project;
}

describe('rc.10.66 Living Canvas deterministic cursor', () => {
  it('creates a bounded deterministic next-action envelope from intent', () => {
    const project = blankIntentProject();
    const envelope = orchestrateDeterministicDesignActions({ project, library, event: gesture(project), permissions: ['project.read', 'architecture.write'] });
    expect(envelope.deterministicOnly).toBe(true);
    expect(envelope.actions.length).toBeGreaterThan(0);
    expect(envelope.actions.length).toBeLessThanOrEqual(5);
    expect(envelope.actions[0]?.authorityClass).toBe('deterministic-required');
    expect(envelope.actions[0]?.preview.nodes.some((node) => node.kind === 'System')).toBe(true);
    expect(envelope.actions.every((action) => action.authorityClass !== 'llm-proposed')).toBe(true);
    expect(envelope.session.targetStage).toBe('logicalApplication');
  });

  it('changes candidate actions when the requirements change', () => {
    const payments = blankIntentProject();
    const reporting = blankIntentProject();
    reporting.description = 'Create a reporting and analytics platform for finance analysts.';
    reporting.objectives = ['Publish trusted operational reports', 'Support analytical queries'];
    const left = orchestrateDeterministicDesignActions({ project: payments, library, event: gesture(payments) });
    const right = orchestrateDeterministicDesignActions({ project: reporting, library, event: gesture(reporting) });
    expect(left.context.contextFingerprint).not.toBe(right.context.contextFingerprint);
    expect(left.actions.map((item) => item.semanticKey)).not.toEqual(right.actions.map((item) => item.semanticKey));
  });

  it('previews, applies and rolls back an atomic canonical mutation', () => {
    const project = blankIntentProject();
    const envelope = orchestrateDeterministicDesignActions({ project, library, event: gesture(project) });
    const action = envelope.actions.find((item) => item.preview.nodes.some((node) => node.kind === 'System'))!;
    const applied = applyGenerativeAction({ project, action, actorId: 'user-owner', actorRole: 'solution-architect' });
    expect(applied.project.revision).toBe(project.revision + 1);
    expect(applied.createdNodeIds.length).toBeGreaterThan(0);
    expect(applied.project.nodes.some((node) => node.kind === 'System')).toBe(true);
    const rolledBack = rollbackGenerativeMutation(applied.project, action);
    expect(rolledBack.revision).toBe(applied.project.revision + 1);
    expect(rolledBack.nodes.some((node) => node.id === applied.createdNodeIds[0])).toBe(false);
  });

  it('realizes an unresolved logical responsibility with lineage and interface-aware actions', () => {
    const project = structuredClone(sampleProject);
    project.activeStage = 'applicationRealization';
    project.nodes = project.nodes.filter((node) => node.stage === 'logicalApplication');
    project.edges = project.edges.filter((edge) => edge.stage === 'logicalApplication');
    project.interfaces = [];
    project.revision = 7;
    const scope = project.nodes.find((node) => node.kind === 'LogicalService')!;
    const event = gesture(project, { stage: 'logicalApplication', targetStage: 'applicationRealization', decompositionLevel: 'container', selectedScopeId: scope.id, subjectIds: [scope.id] });
    const envelope = orchestrateDeterministicDesignActions({ project, library, event });
    const action = envelope.actions.find((item) => item.actionType === 'decompose-scope')!;
    expect(action).toBeTruthy();
    expect(action.preview.nodes.some((node) => node.stage === 'applicationRealization' && node.lineageFrom.includes(scope.id))).toBe(true);
    const result = applyGenerativeAction({ project, action, actorId: 'user-owner', actorRole: 'solution-architect' });
    expect(result.project.nodes.some((node) => node.stage === 'applicationRealization' && node.lineageFrom.includes(scope.id))).toBe(true);
  });

  it('rejects stale proposals after the project revision changes', () => {
    const project = blankIntentProject();
    const action = orchestrateDeterministicDesignActions({ project, library, event: gesture(project) }).actions[0]!;
    const changed = structuredClone(project);
    changed.revision += 1;
    expect(() => applyGenerativeAction({ project: changed, action, actorId: 'user-owner', actorRole: 'solution-architect' })).toThrow(StaleGenerativeProposalError);
  });

  it('uses accepted, rejected and deferred outcomes only to tune ranking', () => {
    const project = blankIntentProject();
    const first = orchestrateDeterministicDesignActions({ project, library, event: gesture(project) });
    const rejected = first.actions[0]!;
    const second = orchestrateDeterministicDesignActions({
      project,
      library,
      event: gesture(project),
      outcomeHistory: [{ actionSemanticKey: rejected.semanticKey, outcome: 'rejected', reason: 'Not the chosen boundary' }],
    });
    const reranked = second.actions.find((item) => item.semanticKey === rejected.semanticKey);
    expect(reranked?.rank).toBeLessThan(rejected.rank);
    expect(second.context.recentOutcomeHistory[0]?.outcome).toBe('rejected');
  });
});
