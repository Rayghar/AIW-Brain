import { describe, expect, it } from 'vitest';
import { sampleProject, type ArchitectureNode, type ArchitectureProject, type StageDraftOperation } from '@aiw/domain';
import { applyStageDraftOperation, markGeneratedDownstreamCandidatesStale } from '../workspaceStore';

function operation(node: ArchitectureNode): StageDraftOperation {
  return {
    id: `add-${node.id}`,
    kind: 'add-node',
    label: `Add ${node.label}`,
    targetPath: `nodes.${node.id}`,
    targetId: node.id,
    proposedValue: node,
    rationale: 'Scenario-specific governed candidate.',
    evidenceRefs: ['objective:0'],
    requirementRefs: [],
    qualityDriverRefs: [],
    riskRefs: [],
    decisionRefs: [],
    confidence: 0.8,
    validationStatus: 'ready',
    missingInformation: [],
    tradeOffs: [],
    downstreamEffects: [],
    candidateState: 'proposed',
    reviewRequired: true,
    authority: 'candidate',
  };
}

describe('Prompt 7 candidate lifecycle', () => {
  it('materialises accepted proposals only into project candidate state', () => {
    const project = structuredClone(sampleProject) as ArchitectureProject;
    const node: ArchitectureNode = {
      id: 'prompt7-logical-service', kind: 'LogicalService', stage: 'logicalApplication', label: 'Scenario Service',
      description: 'Owns a scenario-specific responsibility.', properties: { candidateLifecycleState: 'proposed', candidateAuthority: 'candidate', upstreamStageRefs: ['designIntent'] },
      lineageFrom: [], positions: {}, tags: ['aiw-brain-candidate'], status: 'draft',
    };
    expect(applyStageDraftOperation(project, operation(node))).toBe(true);
    expect(project.nodes.find((item) => item.id === node.id)?.properties).toMatchObject({
      candidateLifecycleState: 'accepted-for-project',
      candidateAuthority: 'candidate',
      reviewRequired: true,
    });
    expect(project.nodes.find((item) => item.id === node.id)?.status).toBe('draft');
  });

  it('marks only dependent downstream generated candidates stale', () => {
    const project = structuredClone(sampleProject) as ArchitectureProject;
    project.nodes = [
      { id: 'dependent', kind: 'DeployableUnit', stage: 'applicationRealization', label: 'Dependent', properties: { candidateAuthority: 'candidate', candidateLifecycleState: 'accepted-for-project', upstreamStageRefs: ['logicalApplication'] }, lineageFrom: [], positions: {}, tags: [], status: 'draft' },
      { id: 'unaffected', kind: 'DeployableUnit', stage: 'applicationRealization', label: 'Unaffected', properties: { candidateAuthority: 'candidate', candidateLifecycleState: 'accepted-for-project', upstreamStageRefs: ['designIntent'] }, lineageFrom: [], positions: {}, tags: [], status: 'draft' },
      { id: 'approved', kind: 'DeployableUnit', stage: 'applicationRealization', label: 'Approved knowledge view', properties: { candidateAuthority: 'approved', upstreamStageRefs: ['logicalApplication'] }, lineageFrom: [], positions: {}, tags: [], status: 'approved' },
    ];
    expect(markGeneratedDownstreamCandidatesStale(project, 'logicalApplication', ['operation-1'])).toEqual(['dependent']);
    expect(project.nodes[0]?.properties.candidateLifecycleState).toBe('stale');
    expect(project.nodes[1]?.properties.candidateLifecycleState).toBe('accepted-for-project');
    expect(project.nodes[2]?.properties.candidateLifecycleState).toBeUndefined();
  });

  it('marks every generated downstream candidate stale when accepted intent changes', () => {
    const project = structuredClone(sampleProject) as ArchitectureProject;
    project.nodes = [
      { id: 'logical', kind: 'LogicalService', stage: 'logicalApplication', label: 'Logical', properties: { candidateAuthority: 'candidate', candidateLifecycleState: 'accepted-for-project', upstreamStageRefs: ['designIntent'] }, lineageFrom: [], positions: {}, tags: [], status: 'draft' },
      { id: 'physical', kind: 'DeploymentNode', stage: 'physicalTechnology', label: 'Physical', properties: { candidateAuthority: 'candidate', candidateLifecycleState: 'accepted-for-project', upstreamStageRefs: ['logicalTechnology'] }, lineageFrom: [], positions: {}, tags: [], status: 'draft' },
      { id: 'approved', kind: 'System', stage: 'logicalApplication', label: 'Approved', properties: { candidateAuthority: 'approved' }, lineageFrom: [], positions: {}, tags: [], status: 'approved' },
    ];
    expect(markGeneratedDownstreamCandidatesStale(project, 'designIntent', ['project:description'])).toEqual(['logical', 'physical']);
    expect(project.nodes[0]?.properties.candidateLifecycleState).toBe('stale');
    expect(project.nodes[1]?.properties.candidateLifecycleState).toBe('stale');
    expect(project.nodes[2]?.status).toBe('approved');
  });

  it('regenerates a stale candidate in place without creating a duplicate', () => {
    const project = structuredClone(sampleProject) as ArchitectureProject;
    const node: ArchitectureNode = {
      id: 'prompt7-logical-service', kind: 'LogicalService', stage: 'logicalApplication', label: 'Updated Service',
      description: 'Updated responsibility.', properties: { candidateLifecycleState: 'proposed', candidateAuthority: 'candidate', upstreamStageRefs: ['designIntent'] },
      lineageFrom: [], positions: { default: { x: 20, y: 20 } }, tags: [], status: 'draft',
    };
    project.nodes = [{ ...structuredClone(node), label: 'Old Service', properties: { ...node.properties, candidateLifecycleState: 'stale' }, positions: { default: { x: 7, y: 9 } } }];
    expect(applyStageDraftOperation(project, operation(node))).toBe(true);
    expect(project.nodes).toHaveLength(1);
    expect(project.nodes[0]?.label).toBe('Updated Service');
    expect(project.nodes[0]?.properties.candidateLifecycleState).toBe('accepted-for-project');
    expect(project.nodes[0]?.positions.default).toEqual({ x: 7, y: 9 });
  });
});
