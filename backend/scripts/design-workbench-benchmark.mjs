import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { createDesignLibrary, sampleProject } from '../packages/domain/dist/index.js';
import { contextualLibrary, previewLibraryDrop, getSemanticConnectionOptions, computeCanvasCompliance } from '../packages/engine/dist/index.js';
import library from '../data/knowledge-library.json' with { type: 'json' };

function stats(values) {
  const sorted=[...values].sort((a,b)=>a-b); const sum=values.reduce((a,b)=>a+b,0);
  return { averageMs:Number((sum/values.length).toFixed(3)), p95Ms:Number(sorted[Math.floor(sorted.length*.95)]?.toFixed(3) ?? 0), maxMs:Number(Math.max(...values).toFixed(3)) };
}
function measure(fn, iterations=200) { const values=[]; for(let i=0;i<iterations;i++){ const start=performance.now(); fn(i); values.push(performance.now()-start); } return stats(values); }
const project=structuredClone(sampleProject);
for(let i=0;i<1480;i++) project.nodes.push({ id:`bench-${i}`, kind:'LogicalService', stage:'logicalApplication', label:`Benchmark service ${i}`, properties:{}, lineageFrom:[], positions:{logicalApplication:{x:(i%50)*220,y:Math.floor(i/50)*130}}, tags:['benchmark'], status:'draft' });
const result={
  generatedAt:new Date().toISOString(),
  projectNodes:project.nodes.length,
  libraryRecords:createDesignLibrary(library).length,
  contextualLibrary:measure(()=>contextualLibrary(project,library,'logical-order-service'),100),
  dropPreflight:measure((i)=>previewLibraryDrop(project,library,'COMP-LOGICAL-SERVICE','logicalApplication',{x:i%1000,y:i%700}),200),
  semanticConnections:measure(()=>getSemanticConnectionOptions(project,'logical-order-service','logical-payment-service'),500),
  complianceCoverage:measure(()=>computeCanvasCompliance(project,library),100),
};
await fs.writeFile(new URL('../DESIGN_WORKBENCH_BENCHMARK.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
