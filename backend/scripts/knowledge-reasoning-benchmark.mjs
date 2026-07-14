import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { sampleProject } from '../packages/domain/dist/index.js';
import { assessDesignLibraryIntegrity, detectArchitectureAntiPatterns, nextArchitectureQuestions } from '../packages/engine/dist/index.js';

const library = JSON.parse(fs.readFileSync(new URL('../data/knowledge-library.json', import.meta.url), 'utf8'));

function stats(fn, iterations = 300) {
  const values = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    values.push(performance.now() - start);
  }
  values.sort((a,b)=>a-b);
  const avg = values.reduce((a,b)=>a+b,0)/values.length;
  return {
    iterations,
    averageMs: Number(avg.toFixed(3)),
    p95Ms: Number(values[Math.floor(values.length*0.95)].toFixed(3)),
    maxMs: Number(values.at(-1).toFixed(3)),
  };
}

const project = structuredClone(sampleProject);
project.qualityScenarios = [];
project.context.teamSize = undefined;
const output = {
  generatedAt: new Date().toISOString(),
  libraryRecords: 68,
  sourceRecords: 11,
  antiPatternRecords: 12,
  integrityAssessment: stats(() => assessDesignLibraryIntegrity(library), 100),
  antiPatternDetection: stats(() => detectArchitectureAntiPatterns(project), 500),
  adaptiveInterview: stats(() => nextArchitectureQuestions(project, 8), 500),
};
fs.writeFileSync(new URL('../KNOWLEDGE_REASONING_BENCHMARK.json', import.meta.url), JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
