import type { ArchitectureProject, KnowledgeLibrary } from '@aiw/domain';
import { renderSddMarkdown } from './sddSections.js';

/**
 * Compose the governed System Design Description from the canonical model.
 * The composer deliberately renders missing evidence as missing; it never fills
 * gaps with model-authored prose or treats a generated narrative as approval.
 */
export function composeSdd(project: ArchitectureProject, library: KnowledgeLibrary): string {
  const rejectedNodeIds = new Set(project.nodes
    .filter((node) => node.properties.candidateLifecycleState === 'rejected' || node.properties.reviewDisposition === 'rejected')
    .map((node) => node.id));
  const governedProject: ArchitectureProject = {
    ...project,
    nodes: project.nodes.filter((node) => !rejectedNodeIds.has(node.id)),
    edges: project.edges.filter((edge) => !rejectedNodeIds.has(edge.sourceId) && !rejectedNodeIds.has(edge.targetId) && edge.properties.candidateLifecycleState !== 'rejected'),
    interfaces: (project.interfaces ?? []).filter((item) => !rejectedNodeIds.has(item.providerNodeId) && item.consumerNodeIds.every((id) => !rejectedNodeIds.has(id))),
    decisions: project.decisions.filter((decision) => decision.status !== 'rejected'),
  };
  return renderSddMarkdown(governedProject, library);
}
