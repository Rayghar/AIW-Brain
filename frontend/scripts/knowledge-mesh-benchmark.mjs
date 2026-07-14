import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedKnowledgeClaims } from '../packages/domain/dist/index.js';
import {
  assessKnowledgeMeshCoverage,
  detectClaimContradictions,
  retrieveArchitectureKnowledge,
  validateExtractedClaim,
  extractionPromptContract,
} from '../packages/engine/dist/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function stats(values) {
  const sorted = [...values].sort((a,b)=>a-b);
  const average = sorted.reduce((sum,value)=>sum+value,0) / sorted.length;
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  return { iterations: sorted.length, averageMs: Number(average.toFixed(4)), p95Ms: Number(p95.toFixed(4)), maxMs: Number(sorted.at(-1).toFixed(4)) };
}
function benchmark(iterations, operation) {
  const values=[];
  for (let i=0;i<iterations;i+=1) {
    const start=performance.now(); operation(i); values.push(performance.now()-start);
  }
  return stats(values);
}
const contract = extractionPromptContract();
const result = {
  generatedAt: new Date().toISOString(),
  dataset: { connectors: assessKnowledgeMeshCoverage().connectors, seedClaims: seedKnowledgeClaims.length },
  operations: {
    evidenceRetrieval: benchmark(2500, (i)=>retrieveArchitectureKnowledge({ query: i % 2 ? 'modular monolith architecture tests' : 'bounded context event reliability', contextTags: i % 3 ? ['architecture-tests'] : ['ddd'], limit: 10 })),
    contradictionDetection: benchmark(2500, ()=>detectClaimContradictions(seedKnowledgeClaims)),
    coverageAssessment: benchmark(1500, ()=>assessKnowledgeMeshCoverage()),
    candidateValidation: benchmark(2500, (i)=>validateExtractedClaim({ connectorId: 'GH-MICROSOFT-ARCH-CENTER', repositoryRevision: 'benchmark', sourcePath: 'docs/patterns/circuit-breaker.md', extractor: { provider: 'benchmark', model: 'deterministic-fixture', promptVersion: contract.version }, candidates: [] }, { subjectId: `PAT-CB-${i%5}`, subjectName: 'Circuit Breaker', claimType: 'benefit', predicate: 'mitigates', object: 'cascading failures', statement: 'A circuit breaker can reduce cascading failure risk when a remote dependency repeatedly fails.', polarity: 'supports', conditions: ['remote failures are detectable'], limitations: ['does not repair the dependency'], contextTags: ['resilience'], confidence: 85 }, '2026-07-02T00:00:00.000Z')),
  },
};
await writeFile(resolve(root, 'KNOWLEDGE_MESH_BENCHMARK.json'), `${JSON.stringify(result,null,2)}\n`, 'utf8');
console.log(JSON.stringify(result,null,2));
