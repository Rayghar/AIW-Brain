import type { ArchitectureProject } from '@aiw/domain';

// Semantic graph analyzer (C3): coupling, cycles, failure propagation —
// deterministic, offline, composed by the kernel into findings.

export interface GraphHotspot { nodeId: string; label: string; fanIn: number; fanOut: number; }
export interface GraphCycle { nodeIds: string[]; labels: string[]; }
export interface FailurePath { originId: string; originLabel: string; path: string[]; depth: number; }
export interface GraphAnalysis {
  hotspots: GraphHotspot[];
  cycles: GraphCycle[];
  failurePaths: FailurePath[];
  maxSyncChainDepth: number;
  couplingIndex: number; // edges per node, rounded
}

export function analyseArchitectureGraph(project: ArchitectureProject): GraphAnalysis {
  const nodes = project.nodes;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const out = new Map<string, string[]>();
  const fanIn = new Map<string, number>();
  const fanOut = new Map<string, number>();
  const syncOut = new Map<string, string[]>();
  for (const edge of project.edges) {
    if (!byId.has(edge.sourceId ?? (edge as { from?: string }).from!) && !byId.has((edge as { source?: string }).source!)) { /* tolerate shapes */ }
  }
  const src = (edge: Record<string, unknown>) => String(edge.sourceId ?? edge.from ?? edge.source ?? '');
  const dst = (edge: Record<string, unknown>) => String(edge.targetId ?? edge.to ?? edge.target ?? '');
  const kind = (edge: Record<string, unknown>) => String(edge.kind ?? edge.type ?? 'relates');
  for (const raw of project.edges as unknown as Array<Record<string, unknown>>) {
    const a = src(raw); const b = dst(raw);
    if (!byId.has(a) || !byId.has(b)) continue;
    out.set(a, [...(out.get(a) ?? []), b]);
    fanOut.set(a, (fanOut.get(a) ?? 0) + 1);
    fanIn.set(b, (fanIn.get(b) ?? 0) + 1);
    if (!/async|publish|subscribe|event/i.test(kind(raw))) syncOut.set(a, [...(syncOut.get(a) ?? []), b]);
  }

  const hotspots: GraphHotspot[] = nodes
    .map((node) => ({ nodeId: node.id, label: node.label, fanIn: fanIn.get(node.id) ?? 0, fanOut: fanOut.get(node.id) ?? 0 }))
    .filter((h) => h.fanIn >= 3 || h.fanOut >= 4)
    .sort((a, b) => (b.fanIn + b.fanOut) - (a.fanIn + a.fanOut))
    .slice(0, 5);

  // Cycle detection (iterative DFS, first few distinct cycles)
  const cycles: GraphCycle[] = [];
  const seenCycleKeys = new Set<string>();
  const color = new Map<string, 0 | 1 | 2>();
  for (const start of nodes) {
    if (color.get(start.id)) continue;
    const stack: Array<{ id: string; path: string[] }> = [{ id: start.id, path: [start.id] }];
    while (stack.length && cycles.length < 4) {
      const { id, path } = stack.pop()!;
      color.set(id, 1);
      for (const next of out.get(id) ?? []) {
        const at = path.indexOf(next);
        if (at >= 0) {
          const cycle = path.slice(at);
          const key = [...cycle].sort().join('|');
          if (!seenCycleKeys.has(key)) {
            seenCycleKeys.add(key);
            cycles.push({ nodeIds: cycle, labels: cycle.map((n) => byId.get(n)?.label ?? n) });
          }
        } else if (color.get(next) !== 2 && path.length < 24) {
          stack.push({ id: next, path: [...path, next] });
        }
      }
      color.set(id, 2);
    }
  }

  // Failure propagation from External/dependency origins along synchronous edges
  const failurePaths: FailurePath[] = [];
  const origins = nodes.filter((node) => /external/i.test(node.kind) || (node.tags ?? []).some((t) => /external|dependency|third/i.test(String(t))));
  const reverseSync = new Map<string, string[]>();
  for (const [a, list] of syncOut) for (const b of list) reverseSync.set(b, [...(reverseSync.get(b) ?? []), a]);
  for (const origin of origins.slice(0, 4)) {
    // who synchronously depends (transitively) on this origin
    const visited = new Set<string>([origin.id]);
    let frontier = [origin.id]; const path: string[] = [origin.label]; let depth = 0;
    while (frontier.length && depth < 6) {
      const next: string[] = [];
      for (const f of frontier) for (const dep of reverseSync.get(f) ?? []) if (!visited.has(dep)) { visited.add(dep); next.push(dep); }
      if (!next.length) break;
      depth += 1; path.push(...next.slice(0, 3).map((n) => byId.get(n)?.label ?? n));
      frontier = next;
    }
    if (depth >= 1) failurePaths.push({ originId: origin.id, originLabel: origin.label, path: path.slice(0, 8), depth });
  }

  // Longest synchronous chain (bounded)
  let maxSyncChainDepth = 0;
  const depthMemo = new Map<string, number>();
  const chain = (id: string, guard: Set<string>): number => {
    if (depthMemo.has(id)) return depthMemo.get(id)!;
    if (guard.has(id)) return 0;
    guard.add(id);
    let best = 0;
    for (const next of syncOut.get(id) ?? []) best = Math.max(best, 1 + chain(next, guard));
    guard.delete(id);
    depthMemo.set(id, best);
    return best;
  };
  for (const node of nodes) maxSyncChainDepth = Math.max(maxSyncChainDepth, chain(node.id, new Set()));

  const couplingIndex = nodes.length ? Math.round(((project.edges.length / nodes.length) + Number.EPSILON) * 10) / 10 : 0;
  return { hotspots, cycles, failurePaths, maxSyncChainDepth, couplingIndex };
}
