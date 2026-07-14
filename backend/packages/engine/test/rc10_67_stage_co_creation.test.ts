import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sampleProject, type ArchitectureProject, type DesignGestureEvent, type KnowledgeLibrary } from '@aiw/domain';
import {
  applyGenerativeAction,
  livingCanvasReleaseDescriptor,
  orchestrateDeterministicDesignActions,
  rollbackGenerativeMutation,
  stageTransformationGrammars,
} from '../src/index.js';

const library = JSON.parse(readFileSync(new URL('../../../data/knowledge-library.json', import.meta.url), 'utf8')) as KnowledgeLibrary;

function event(project: ArchitectureProject, overrides: Partial<DesignGestureEvent>): DesignGestureEvent {
  return {
    id: `rc1067-${project.revision}-${Math.random()}`,
    kind: 'candidate-requested',
    occurredAt: '2026-07-12T13:30:00.000Z',
    tenantId: project.tenantId,
    projectId: project.id,
    branchId: project.branch.id,
    revision: project.revision,
    actorId: 'user-owner',
    actorRole: 'solution-architect',
    stage: 'logicalApplication',
    targetStage: 'applicationRealization',
    decompositionLevel: 'container',
    autonomyMode: 'guide',
    ...overrides,
  };
}

function minimalProject(): ArchitectureProject {
  const project = structuredClone(sampleProject);
  project.nodes = [];
  project.edges = [];
  project.interfaces = [];
  project.findings = [];
  project.patternSelections = [];
  project.styleDecisions = [];
  project.qualityPriorities = [
    { attributeId: 'availability', weight: 5 },
    { attributeId: 'security', weight: 5 },
    { attributeId: 'scalability', weight: 4 },
  ];
  project.description = 'Customers use a secure payment platform that coordinates orders, payments and external settlement partners.';
  project.objectives = ['Process and track payments', 'Integrate safely with settlement partners'];
  project.constraints = ['Payment data must remain auditable'];
  project.revision = 10;
  return project;
}

function logicalAndRealizationProject(): ArchitectureProject {
  const project = minimalProject();
  const system = { id: 'sys', semanticId: 'semantic:sys', kind: 'System' as const, stage: 'logicalApplication' as const, label: 'Payments Platform', description: 'System of interest', properties: { systemOfInterest: true }, lineageFrom: [], positions: { logicalApplication: { x: 100, y: 100 } }, tags: ['system-of-interest'], status: 'draft' as const };
  const order = { id: 'logical-order', semanticId: 'semantic:logical-order', kind: 'LogicalService' as const, stage: 'logicalApplication' as const, label: 'Order Service', description: 'Own order processing', properties: {}, lineageFrom: [], parentId: system.id, positions: { logicalApplication: { x: 300, y: 100 } }, tags: [], status: 'draft' as const };
  const payment = { id: 'logical-payment', semanticId: 'semantic:logical-payment', kind: 'LogicalService' as const, stage: 'logicalApplication' as const, label: 'Payment Service', description: 'Own payment processing and events', properties: {}, lineageFrom: [], parentId: system.id, positions: { logicalApplication: { x: 500, y: 100 } }, tags: ['event'], status: 'draft' as const };
  const orderApi = { id: 'container-order', semanticId: 'semantic:container-order', kind: 'DeployableUnit' as const, stage: 'applicationRealization' as const, label: 'Order API', description: 'Order container', properties: { public: true }, lineageFrom: [order.id], parentId: system.id, positions: { applicationRealization: { x: 300, y: 250 } }, tags: ['api'], status: 'draft' as const };
  const paymentWorker = { id: 'container-payment', semanticId: 'semantic:container-payment', kind: 'DeployableUnit' as const, stage: 'applicationRealization' as const, label: 'Payment Worker', description: 'Payment event worker', properties: {}, lineageFrom: [payment.id], parentId: system.id, positions: { applicationRealization: { x: 550, y: 250 } }, tags: ['worker', 'event'], status: 'draft' as const };
  project.nodes = [system, order, payment, orderApi, paymentWorker];
  project.edges = [{ id: 'logical-flow', sourceId: order.id, targetId: payment.id, kind: 'publishes', stage: 'logicalApplication', label: 'Order accepted', properties: { protocolStyle: 'asynchronous' } }];
  project.activeStage = 'applicationRealization';
  return project;
}

describe('rc.10.67 generative architecture cursor and stage co-creation', () => {
  it('releases four deterministic lifecycle grammars and the C4 co-creation posture', () => {
    expect(stageTransformationGrammars()).toHaveLength(4);
    expect(stageTransformationGrammars().map((grammar) => grammar.targetStage)).toEqual([
      'logicalApplication', 'applicationRealization', 'logicalTechnology', 'physicalTechnology',
    ]);
    expect(livingCanvasReleaseDescriptor()).toMatchObject({
      version: '0.10.0-rc.10.68.0',
      deterministicOnly: false,
      relationshipPropagation: true,
      qualityDriverTacticChain: true,
      c4Journey: ['system-context', 'container', 'component'],
    });
  });

  it('decomposes a selected C4 container into internal components', () => {
    const project = logicalAndRealizationProject();
    const scope = project.nodes.find((node) => node.id === 'container-order')!;
    const envelope = orchestrateDeterministicDesignActions({ project, library, event: event(project, { selectedScopeId: scope.id, subjectIds: [scope.id], decompositionLevel: 'component' }) });
    const action = envelope.actions.find((item) => item.semanticKey.startsWith('c4-component-decomposition:'))!;
    expect(action).toBeTruthy();
    expect(action.preview.nodes.filter((node) => node.parentId === scope.id)).toHaveLength(3);
    expect(action.preview.nodes.every((node) => node.properties.c4Level === 'component')).toBe(true);
    expect(action.preview.relationships.length).toBeGreaterThanOrEqual(2);
  });

  it('propagates upstream relationships and derives an event interface', () => {
    const project = logicalAndRealizationProject();
    const envelope = orchestrateDeterministicDesignActions({ project, library, event: event(project, {}) });
    const action = envelope.actions.find((item) => item.semanticKey.startsWith('propagate-relationship:'))!;
    expect(action).toBeTruthy();
    expect(action.preview.relationships[0]).toMatchObject({ sourceId: 'container-order', targetId: 'container-payment', kind: 'publishes' });
    expect(action.preview.interfaces[0]).toMatchObject({ interactionStyle: 'event', providerNodeId: 'container-order', consumerNodeIds: ['container-payment'] });
  });

  it('maps application realizations into provider-neutral logical technology capabilities', () => {
    const project = logicalAndRealizationProject();
    project.activeStage = 'logicalTechnology';
    const scope = project.nodes.find((node) => node.id === 'container-order')!;
    const envelope = orchestrateDeterministicDesignActions({ project, library, event: event(project, { stage: 'applicationRealization', targetStage: 'logicalTechnology', selectedScopeId: scope.id, subjectIds: [scope.id], decompositionLevel: 'deployment' }) });
    const action = envelope.actions.find((item) => item.semanticKey.startsWith('logical-technology:'))!;
    expect(action).toBeTruthy();
    expect(action.preview.nodes[0]).toMatchObject({ kind: 'LogicalTechnologyCapability', stage: 'logicalTechnology' });
    expect(action.preview.nodes[0]?.properties.providerNeutral).toBe(true);
    const applied = applyGenerativeAction({ project, action, actorId: 'user-owner', actorRole: 'solution-architect' });
    expect(applied.project.nodes.some((node) => node.stage === 'logicalTechnology' && node.lineageFrom.includes(scope.id))).toBe(true);
  });

  it('creates provider-neutral physical products and multi-zone deployment defaults from quality drivers', () => {
    const project = logicalAndRealizationProject();
    project.activeStage = 'physicalTechnology';
    project.nodes.push({ id: 'tech-api', semanticId: 'semantic:tech-api', kind: 'LogicalTechnologyCapability', stage: 'logicalTechnology', label: 'API Management Capability', description: 'Provider-neutral API capability', properties: { providerNeutral: true }, lineageFrom: ['container-order'], positions: { logicalTechnology: { x: 300, y: 350 } }, tags: ['api-management'], status: 'draft' });
    const envelope = orchestrateDeterministicDesignActions({ project, library, event: event(project, { stage: 'logicalTechnology', targetStage: 'physicalTechnology', selectedScopeId: 'tech-api', subjectIds: ['tech-api'], decompositionLevel: 'deployment' }) });
    const action = envelope.actions.find((item) => item.semanticKey.startsWith('physical-realization:'))!;
    expect(action).toBeTruthy();
    expect(action.preview.nodes.some((node) => node.kind === 'TechnologyProduct' && node.properties.providerNeutral === true)).toBe(true);
    const deployment = action.preview.nodes.find((node) => node.kind === 'DeploymentNode')!;
    expect(deployment.properties).toMatchObject({ replicas: 2, availabilityZones: 2, networkSegmentation: true });
  });

  it('makes Guide, Compose and Draft Stage materially different autonomy modes', () => {
    const project = logicalAndRealizationProject();
    const selected = 'container-order';
    const guide = orchestrateDeterministicDesignActions({ project, library, event: event(project, { selectedScopeId: selected, subjectIds: [selected], autonomyMode: 'guide', decompositionLevel: 'component' }) });
    const compose = orchestrateDeterministicDesignActions({ project, library, event: event(project, { selectedScopeId: selected, subjectIds: [selected], autonomyMode: 'compose', decompositionLevel: 'component' }) });
    const draft = orchestrateDeterministicDesignActions({ project, library, event: event(project, { autonomyMode: 'draft-stage' }) });
    expect(guide.actions[0]?.semanticKey).not.toBe(compose.actions[0]?.semanticKey);
    expect(compose.actions[0]?.semanticKey).toContain('compose-scope:');
    expect(compose.actions[0]?.actionType).toBe('compose-local-topology');
    expect(compose.actions[0]?.label).toMatch(/^Compose /);
    expect(draft.actions[0]?.semanticKey).toContain('draft-stage:');
    expect(draft.actions[0]?.mutationSet.operations.length).toBeGreaterThan(1);
  });

  it('executes an accepted Pattern DNA kit with obligations and reversible fitness evidence', () => {
    const project = logicalAndRealizationProject();
    project.patternSelections.push({ id: 'sel-outbox', patternId: 'PAT-OUTBOX', scopeNodeId: 'container-payment', stage: 'applicationRealization', rationale: 'Reliable event publishing', status: 'accepted', obligationsAcknowledged: [] });
    const envelope = orchestrateDeterministicDesignActions({ project, library, event: event(project, { selectedScopeId: 'container-payment', subjectIds: ['container-payment'], decompositionLevel: 'component' }) });
    const action = envelope.actions.find((item) => item.semanticKey === 'apply-pattern-kit:PAT-OUTBOX:container-payment')!;
    expect(action).toBeTruthy();
    expect(action.preview.nodes.length).toBeGreaterThanOrEqual(3);
    expect(action.mutationSet.operations.some((operation) => operation.type === 'create-obligation')).toBe(true);
    expect(action.mutationSet.operations.some((operation) => operation.type === 'create-fitness-test')).toBe(true);
    const applied = applyGenerativeAction({ project, action, actorId: 'user-owner', actorRole: 'solution-architect' });
    expect(applied.project.findings.some((finding) => finding.ruleId === 'GAC-OBLIGATION')).toBe(true);
    expect(applied.project.findings.some((finding) => finding.ruleId === 'GAC-FITNESS-TEST')).toBe(true);
    const rolledBack = rollbackGenerativeMutation(applied.project, action);
    expect(rolledBack.nodes.some((node) => node.tags.includes('pattern-dna-generated'))).toBe(false);
    expect(rolledBack.findings.some((finding) => finding.ruleId === 'GAC-OBLIGATION' || finding.ruleId === 'GAC-FITNESS-TEST')).toBe(false);
  });
});
