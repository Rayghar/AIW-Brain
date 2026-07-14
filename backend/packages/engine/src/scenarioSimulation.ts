import type { ArchitectureProject } from '@aiw/domain';
import { analyseArchitectureGraph } from './graphAnalysis.js';

// Scenario simulation (C5, bounded & honest): parses measurable response
// measures and assesses them against topology HEURISTICS. Verdicts are
// explicitly heuristic — 'meets-likely' / 'at-risk' / 'cannot-assess' — never
// certainties; the reasoning names the assumption used.

export interface ScenarioVerdict {
  scenarioId: string;
  attributeId: string;
  measure: string;
  verdict: 'meets-likely' | 'at-risk' | 'cannot-assess';
  reasoning: string;
}

const LATENCY = /(?:p\d{2}\s*[<≤]\s*|under\s*|<\s*)(\d+(?:\.\d+)?)\s*(ms|s)\b/i;
const AVAILABILITY = /(\d{2}(?:\.\d+)?)\s*%/;
const RTO = /rto\s*[:<]?\s*(\d+)\s*(m|min|h)/i;

export function simulateQualityScenarios(project: ArchitectureProject): ScenarioVerdict[] {
  const scenarios = ((project as { qualityScenarios?: Array<{ id: string; attributeId: string; responseMeasure?: string }> }).qualityScenarios ?? []);
  if (!scenarios.length) return [];
  const graph = analyseArchitectureGraph(project);
  const verdicts: ScenarioVerdict[] = [];
  const PER_HOP_MS = 25; // stated heuristic: intra-system synchronous hop budget

  for (const scenario of scenarios) {
    const measure = String(scenario.responseMeasure ?? '');
    const base = { scenarioId: scenario.id, attributeId: scenario.attributeId, measure };
    const lat = LATENCY.exec(measure);
    if (lat && /performance|latency/i.test(scenario.attributeId)) {
      const budgetMs = Number(lat[1] ?? 0) * ((lat[2] ?? 'ms').toLowerCase() === 's' ? 1000 : 1);
      const estimate = Math.max(1, graph.maxSyncChainDepth) * PER_HOP_MS;
      verdicts.push({
        ...base,
        verdict: estimate <= budgetMs * 0.6 ? 'meets-likely' : 'at-risk',
        reasoning: `Longest synchronous chain is ${graph.maxSyncChainDepth} hop(s); at a ${PER_HOP_MS}ms/hop heuristic that is ~${estimate}ms against a ${budgetMs}ms budget. Async boundaries or caching shorten the critical path.`,
      });
      continue;
    }
    const avail = AVAILABILITY.exec(measure);
    if (avail && /availab|reliab|faultTolerance/i.test(scenario.attributeId)) {
      const spofs = graph.hotspots.filter((h) => h.fanIn >= 3).length;
      const externalSyncExposure = graph.failurePaths.length;
      const risky = spofs + externalSyncExposure;
      verdicts.push({
        ...base,
        verdict: risky === 0 ? 'meets-likely' : 'at-risk',
        reasoning: risky === 0
          ? 'No high-fan-in single points and no synchronous exposure to external dependencies detected.'
          : `${spofs} high-fan-in dependency point(s) and ${externalSyncExposure} synchronous external exposure path(s) threaten the ${avail[1]}% target; add redundancy or async isolation.`,
      });
      continue;
    }
    const rto = RTO.exec(measure);
    if (rto && /recover/i.test(scenario.attributeId)) {
      const hasReplaySource = project.nodes.some((n) => /broker|stream|event|outbox|backup/i.test(`${n.kind} ${n.label}`));
      verdicts.push({
        ...base,
        verdict: hasReplaySource ? 'meets-likely' : 'at-risk',
        reasoning: hasReplaySource
          ? 'An event/replay or backup source is modeled; recovery within the objective is plausible if runbooks exist.'
          : 'No replay/backup capability is modeled; the RTO depends entirely on unmodeled operational tooling.',
      });
      continue;
    }
    verdicts.push({ ...base, verdict: 'cannot-assess', reasoning: 'No topology heuristic applies to this measure; assess via the evaluation programme or runtime telemetry.' });
  }
  return verdicts;
}
