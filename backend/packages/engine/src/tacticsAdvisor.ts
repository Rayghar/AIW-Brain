import type { ArchitectureProject } from '@aiw/domain';

// =============================================================================
// TACTICS ADVISOR (Cambridge-logic sprint) — the third reasoning granularity.
// Styles shape the system; patterns package solutions; TACTICS are the atomic
// design moves that serve one quality attribute. Given the weighted drivers
// and the topology, this module reasons about which tactics the model already
// EMBODIES and which are MISSING for the drivers that matter.
// Advisory, cited, deterministic — authority stays with the kernel.
// =============================================================================

export interface Tactic {
  id: string; attribute: string; name: string; move: string;
  detect: string[]; appliesWhen: string; conditional?: string | undefined;
}

export interface TacticAdvice {
  tacticId: string; name: string; attribute: string;
  status: 'embodied' | 'missing';
  why: string;
  evidence: string[]; // node/edge labels that satisfied detection, when embodied
  conditional?: string | undefined;
}

const corpus = (project: ArchitectureProject): string[] => [
  ...project.nodes.map((node) => `${node.kind} ${node.label} ${(node.tags ?? []).join(' ')} ${JSON.stringify(node.properties ?? {})}`),
  ...(project.edges as unknown as Array<Record<string, unknown>>).map((edge) => `${String(edge.kind ?? '')} ${JSON.stringify(edge.properties ?? {})}`),
];

export function adviseTactics(
  project: ArchitectureProject,
  catalog: { tactics: Tactic[] },
  minDriverWeight = 4,
): TacticAdvice[] {
  const hotDrivers = new Set(project.qualityPriorities.filter((p) => p.weight >= minDriverWeight).map((p) => p.attributeId));
  if (!hotDrivers.size || !project.nodes.length) return [];
  const haystacks = corpus(project).map((text) => text.toLowerCase());
  const advice: TacticAdvice[] = [];
  for (const tactic of catalog.tactics) {
    if (!hotDrivers.has(tactic.attribute)) continue;
    const hits: string[] = [];
    for (const needle of tactic.detect) {
      const index = haystacks.findIndex((hay) => hay.includes(needle.toLowerCase()));
      if (index >= 0) hits.push(project.nodes[index]?.label ?? 'relationship');
    }
    if (hits.length) {
      advice.push({ tacticId: tactic.id, name: tactic.name, attribute: tactic.attribute, status: 'embodied', why: `${tactic.move}`, evidence: [...new Set(hits)].slice(0, 3), conditional: tactic.conditional });
    } else {
      advice.push({ tacticId: tactic.id, name: tactic.name, attribute: tactic.attribute, status: 'missing', why: `${tactic.appliesWhen} — ${tactic.move}`, evidence: [], conditional: tactic.conditional });
    }
  }
  // missing tactics for the hottest drivers first
  return advice.sort((a, b) => (a.status === b.status ? 0 : a.status === 'missing' ? -1 : 1)).slice(0, 10);
}
