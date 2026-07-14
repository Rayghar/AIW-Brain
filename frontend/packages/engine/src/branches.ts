import { createId, type ArchitectureProject, type BranchComparison, type ModelDifference } from '@aiw/domain';

function diffRecords<T extends { id: string }>(category: ModelDifference['category'], left: T[], right: T[], label: (item: T) => string): ModelDifference[] {
  const a = new Map(left.map((item) => [item.id, item]));
  const b = new Map(right.map((item) => [item.id, item]));
  const result: ModelDifference[] = [];
  for (const [id, item] of b) {
    if (!a.has(id)) result.push({ id: createId('diff'), category, change: 'added', label: label(item), recordId: id, details: 'Present only in target branch.' });
    else if (JSON.stringify(a.get(id)) !== JSON.stringify(item)) result.push({ id: createId('diff'), category, change: 'modified', label: label(item), recordId: id, details: 'Properties or status differ between branches.' });
  }
  for (const [id, item] of a) if (!b.has(id)) result.push({ id: createId('diff'), category, change: 'removed', label: label(item), recordId: id, details: 'Present only in source branch.' });
  return result;
}

export function compareBranches(source: ArchitectureProject, target: ArchitectureProject): BranchComparison {
  const differences = [
    ...diffRecords('node', source.nodes, target.nodes, (item) => item.label),
    ...diffRecords('edge', source.edges, target.edges, (item) => item.label ?? item.kind),
    ...diffRecords('style', source.styleDecisions, target.styleDecisions, (item) => item.styleId),
    ...diffRecords('pattern', source.patternSelections, target.patternSelections, (item) => item.patternId),
    ...diffRecords('decision', source.decisions, target.decisions, (item) => item.title),
  ];
  return {
    sourceBranchId: source.branch.id,
    targetBranchId: target.branch.id,
    generatedAt: new Date().toISOString(),
    summary: {
      added: differences.filter((item) => item.change === 'added').length,
      removed: differences.filter((item) => item.change === 'removed').length,
      modified: differences.filter((item) => item.change === 'modified').length,
      riskDelta: target.findings.length - source.findings.length,
    },
    differences,
  };
}
