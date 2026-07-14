import type { ArchitectureProject, ArchitectureStage, ImpactAnalysis, ImpactNode } from '@aiw/domain';

export function analyseImpact(project: ArchitectureProject, sourceIds: string[]): ImpactAnalysis {
  const nodes = new Map(project.nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, Array<{ id: string; reason: string }>>();
  const add = (from: string, to: string, reason: string) => adjacency.set(from, [...(adjacency.get(from) ?? []), { id: to, reason }]);
  for (const edge of project.edges) {
    add(edge.sourceId, edge.targetId, `${edge.kind} relationship`);
    add(edge.targetId, edge.sourceId, `${edge.kind} relationship`);
  }
  for (const node of project.nodes) for (const upstream of node.lineageFrom) add(upstream, node.id, 'downstream lineage');

  const queue = sourceIds.map((id) => ({ id, distance: 0, reason: 'selected source' }));
  const seen = new Map<string, ImpactNode>();
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current.id) ?? []) {
      if (sourceIds.includes(next.id)) continue;
      const node = nodes.get(next.id);
      if (!node) continue;
      const existing = seen.get(next.id);
      if (!existing || current.distance + 1 < existing.distance) {
        seen.set(next.id, { nodeId: node.id, label: node.label, stage: node.stage, distance: current.distance + 1, reasons: [next.reason] });
        queue.push({ id: next.id, distance: current.distance + 1, reason: next.reason });
      } else if (!existing.reasons.includes(next.reason)) existing.reasons.push(next.reason);
    }
  }
  const allIds = new Set([...sourceIds, ...seen.keys()]);
  const affectedApprovalStages = [...new Set([...seen.values()].map((item) => item.stage))] as ArchitectureStage[];
  return {
    sourceIds,
    generatedAt: new Date().toISOString(),
    affectedNodes: [...seen.values()].sort((a, b) => a.distance - b.distance || a.label.localeCompare(b.label)),
    affectedDecisionIds: project.decisions.filter((item) => item.scopeNodeId && allIds.has(item.scopeNodeId)).map((item) => item.id),
    affectedStyleDecisionIds: project.styleDecisions.filter((item) => item.scopeNodeId && allIds.has(item.scopeNodeId)).map((item) => item.id),
    affectedPatternSelectionIds: project.patternSelections.filter((item) => item.scopeNodeId && allIds.has(item.scopeNodeId)).map((item) => item.id),
    affectedApprovalStages,
  };
}
