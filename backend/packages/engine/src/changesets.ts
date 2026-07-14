import type { ArchitectureProject, ChangeOperation, ChangeProposal } from '@aiw/domain';

function mergeNodePatch<T extends { properties: Record<string, unknown> }>(current: T, patch: Partial<T>): T {
  return {
    ...current,
    ...patch,
    properties: patch.properties ? { ...current.properties, ...patch.properties } : current.properties,
  };
}

function applyOperation(project: ArchitectureProject, operation: ChangeOperation): ArchitectureProject {
  switch (operation.type) {
    case 'ADD_NODE':
      if (project.nodes.some((node) => node.id === operation.node.id)) return project;
      return { ...project, nodes: [...project.nodes, operation.node] };
    case 'UPDATE_NODE':
      return {
        ...project,
        nodes: project.nodes.map((node) => node.id === operation.nodeId ? mergeNodePatch(node, operation.patch) : node),
      };
    case 'DELETE_NODE':
      return {
        ...project,
        nodes: project.nodes.filter((node) => node.id !== operation.nodeId),
        edges: project.edges.filter((edge) => edge.sourceId !== operation.nodeId && edge.targetId !== operation.nodeId),
      };
    case 'ADD_EDGE':
      if (project.edges.some((edge) => edge.id === operation.edge.id)) return project;
      return { ...project, edges: [...project.edges, operation.edge] };
    case 'UPDATE_EDGE':
      return { ...project, edges: project.edges.map((edge) => edge.id === operation.edgeId ? { ...edge, ...operation.patch, properties: operation.patch.properties ? { ...edge.properties, ...operation.patch.properties } : edge.properties } : edge) };
    case 'DELETE_EDGE':
      return { ...project, edges: project.edges.filter((edge) => edge.id !== operation.edgeId) };
  }
}

export function applySelectedProposals(project: ArchitectureProject, proposals: ChangeProposal[]): ArchitectureProject {
  const next = proposals.filter((proposal) => proposal.selected).reduce((current, proposal) => {
    return proposal.operations.reduce(applyOperation, current);
  }, project);
  return { ...next, revision: project.revision + 1, updatedAt: new Date().toISOString() };
}
