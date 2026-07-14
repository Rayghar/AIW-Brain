import { describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import {
  analyseStageTransitionCoverage,
  applyStageTransitionProposal,
  architectureViewpointDefinitions,
  createArchitectureViewbook,
  createStageTransitionProposal,
  resolveViewVisibleEdgeIds,
  resolveViewVisibleNodeIds,
} from '../src/index.js';

describe('rc.10.59 canonical architecture graph and Viewbook', () => {
  it('creates ten query-driven views from one canonical project model', () => {
    const project = structuredClone(sampleProject);
    const views = createArchitectureViewbook(project, 'tester');
    expect(architectureViewpointDefinitions).toHaveLength(10);
    expect(views).toHaveLength(10);
    expect(new Set(views.map((view) => view.viewpointId)).size).toBe(10);
    const context = views.find((view) => view.viewpointId === 'system-context')!;
    const deployment = views.find((view) => view.viewpointId === 'physical-deployment')!;
    expect(resolveViewVisibleNodeIds(context, project.nodes)).toContain('actor-customer');
    expect(resolveViewVisibleNodeIds(deployment, project.nodes)).toContain('physical-postgres');
    expect(resolveViewVisibleNodeIds(deployment, project.nodes)).not.toContain('actor-customer');
  });

  it('honours include/exclude node and tag filters for named views', () => {
    const project = structuredClone(sampleProject);
    const [view] = createArchitectureViewbook(project);
    const filtered = { ...view, filters: { ...view.filters, includeNodeIds: ['actor-customer','logical-order-service'], excludeNodeIds: ['actor-customer'] } };
    expect([...resolveViewVisibleNodeIds(filtered, project.nodes)]).toEqual(['logical-order-service']);
    expect(resolveViewVisibleEdgeIds(filtered, project.edges)).toBeInstanceOf(Set);
  });

  it('proposes and applies deterministic lineage-preserving downstream elements', () => {
    const project = structuredClone(sampleProject);
    project.nodes = project.nodes.filter((node) => node.stage === 'logicalApplication');
    project.edges = project.edges.filter((edge) => edge.stage === 'logicalApplication');
    project.architectureViews = [];
    const proposal = createStageTransitionProposal(project, 'applicationRealization', 'architect');
    expect(proposal.candidates.length).toBeGreaterThan(0);
    expect(proposal.candidates.every((item) => item.proposedNode.lineageFrom.length > 0)).toBe(true);
    const applied = applyStageTransitionProposal(project, proposal);
    expect(applied.activeStage).toBe('applicationRealization');
    expect(applied.nodes.some((node) => node.stage === 'applicationRealization')).toBe(true);
    expect(applied.edges.some((edge) => edge.stage === 'applicationRealization' && edge.kind === 'realizes')).toBe(true);
    expect(applied.architectureViews?.filter((view) => view.viewpointId).length).toBe(10);
    const coverage = analyseStageTransitionCoverage(applied, 'applicationRealization');
    expect(coverage.realizedUpstreamNodeCount).toBeGreaterThan(0);
  });

  it('is idempotent when the same governed proposal is applied twice', () => {
    const project = structuredClone(sampleProject);
    project.nodes = project.nodes.filter((node) => node.stage === 'logicalApplication');
    project.edges = project.edges.filter((edge) => edge.stage === 'logicalApplication');
    project.architectureViews = [];
    const proposal = createStageTransitionProposal(project, 'applicationRealization', 'architect');
    const once = applyStageTransitionProposal(project, proposal);
    const twice = applyStageTransitionProposal(once, proposal);
    expect(twice.nodes).toHaveLength(once.nodes.length);
    expect(twice.edges).toHaveLength(once.edges.length);
  });
});
