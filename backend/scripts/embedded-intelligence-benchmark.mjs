import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { sampleProject } from '../packages/domain/dist/index.js';
import { evaluateArchitectureEvent } from '../packages/engine/dist/index.js';

const library = JSON.parse(await readFile(new URL('../data/knowledge-library.json', import.meta.url), 'utf8'));
const events = [
  { kind: 'state-recomputed' },
  { kind: 'selection-changed', subjectIds: ['logical-payment-service'] },
  { kind: 'connection-intent', sourceId: 'logical-order-service', targetId: 'logical-payment-service', relationshipKind: 'communicatesWith' },
  { kind: 'attribute-changed', subjectIds: ['logical-payment-service'], field: 'consistency', previousValue: 'eventual', nextValue: 'strong' },
];
const samples = [];
for (let i = 0; i < 120; i += 1) {
  const event = { ...events[i % events.length], eventId: `bench-${i}` };
  const start = performance.now();
  const result = evaluateArchitectureEvent(structuredClone(sampleProject), library, event);
  samples.push({ event: event.kind, durationMs: performance.now() - start, findings: result.findings.length, suggestions: result.suggestedComponents.length, actions: result.nextBestActions.length });
}
const durations = samples.map((item) => item.durationMs).sort((a, b) => a - b);
const percentile = (p) => durations[Math.min(durations.length - 1, Math.floor((durations.length - 1) * p))];
const output = {
  releaseId: 'AIW-0.9.9',
  knowledgeReleaseId: library.knowledgeReleaseId,
  generatedAt: new Date().toISOString(),
  environment: { node: process.version, mode: 'deterministic-offline', externalNetwork: false, externalLlm: false },
  iterations: samples.length,
  averageMs: Number((durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(3)),
  p50Ms: Number(percentile(0.5).toFixed(3)),
  p95Ms: Number(percentile(0.95).toFixed(3)),
  maxMs: Number(durations.at(-1).toFixed(3)),
  byEvent: Object.fromEntries(events.map(({ kind }) => {
    const subset = samples.filter((item) => item.event === kind).map((item) => item.durationMs).sort((a, b) => a - b);
    return [kind, { count: subset.length, averageMs: Number((subset.reduce((sum, value) => sum + value, 0) / subset.length).toFixed(3)), p95Ms: Number(subset[Math.min(subset.length - 1, Math.floor((subset.length - 1) * 0.95))].toFixed(3)) }];
  })),
  boundary: 'These timings measure local deterministic kernel execution only. They exclude browser rendering, network, PostgreSQL, vector retrieval and external model latency.',
};
await writeFile(new URL('../EMBEDDED_INTELLIGENCE_BENCHMARK.json', import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
