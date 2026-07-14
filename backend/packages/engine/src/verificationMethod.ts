import type { ArchitectureProject } from '@aiw/domain';
import { analyseArchitectureGraph } from './graphAnalysis.js';

// Verification method (Cambridge-logic sprint): deterministic checks derived
// from the playbook's Architecture Verification Method — decisions trace to
// drivers, risky edges carry protections, hotspots declare expectations.

export interface VerificationFinding { checkId: string; title: string; detail: string; affectedIds: string[]; }

export function runVerificationMethod(project: ArchitectureProject): VerificationFinding[] {
  const findings: VerificationFinding[] = [];
  const hot = new Set(project.qualityPriorities.filter((p) => p.weight >= 4).map((p) => p.attributeId));

  // V1: accepted decisions must trace to at least one hot driver
  if (project.styleDecisions.some((d) => d.status === 'accepted') && !hot.size)
    findings.push({ checkId: 'V1', title: 'Decision without a driving force', detail: 'A style is accepted but no driver is weighted ≥ 4 — the decision cannot be verified against anything.', affectedIds: [] });

  // V2: synchronous external edges must carry timeout/breaker protection
  const byId = new Map(project.nodes.map((n) => [n.id, n]));
  for (const edge of project.edges as unknown as Array<Record<string, unknown>>) {
    const target = byId.get(String(edge.targetId ?? edge.to ?? ''));
    const external = target && /external/i.test(String(target.kind));
    const sync = !/async|event|publish/i.test(`${String(edge.kind ?? '')} ${String((edge.properties as Record<string, unknown>)?.syncAsync ?? '')}`);
    const props = JSON.stringify(edge.properties ?? {}).toLowerCase();
    if (external && sync && !/timeout|breaker|circuit/.test(props))
      findings.push({ checkId: 'V2', title: `Unprotected external call to ${target!.label}`, detail: 'Synchronous external dependency without timeout/breaker evidence on the relationship.', affectedIds: [String(edge.id ?? '')] });
  }

  // V3: high fan-in components should declare an availability expectation
  for (const hotspot of analyseArchitectureGraph(project).hotspots.filter((h) => h.fanIn >= 3)) {
    const node = byId.get(hotspot.nodeId);
    const props = JSON.stringify(node?.properties ?? {}).toLowerCase();
    if (!/availab|slo|99/.test(props))
      findings.push({ checkId: 'V3', title: `${hotspot.label} carries ${hotspot.fanIn} dependents silently`, detail: 'High fan-in without a declared availability expectation — its failure budget is everyone\'s failure budget.', affectedIds: [hotspot.nodeId] });
  }
  return findings.slice(0, 4);
}
