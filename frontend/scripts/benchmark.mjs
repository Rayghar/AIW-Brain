import { performance } from 'node:perf_hooks';
import { sampleEnterpriseCatalog, samplePortfolioProjects, sampleProject } from '../packages/domain/dist/index.js';
import { analyseArchitectureDrift, analyseImpact, analyseOperationalDrift, buildPortfolioIntelligence, compareBranches, createMergePlan, createRemediationPlan, deriveTopologyFromTelemetry, evaluateArchitecturePolicyGate, importRuntimeInventory, recommendInContext, validateProject } from '../packages/engine/dist/index.js';
import fs from 'node:fs';

const library = JSON.parse(fs.readFileSync(new URL('../data/knowledge-library.json', import.meta.url), 'utf8'));
const stages = ['logicalApplication', 'applicationRealization', 'logicalTechnology', 'physicalTechnology'];
const nodes = [];
const edges = [];
for (let i = 0; i < 1500; i += 1) {
  const stage = stages[i % stages.length];
  const id = `benchmark-node-${i}`;
  nodes.push({
    id,
    kind: stage === 'logicalApplication' ? 'LogicalService' : stage === 'applicationRealization' ? 'DeployableUnit' : stage === 'logicalTechnology' ? 'LogicalTechnologyCapability' : 'TechnologyProduct',
    stage,
    label: `Benchmark ${stage} ${i}`,
    properties: stage === 'physicalTechnology' ? { replicas: 2, availabilityZones: 2 } : {},
    lineageFrom: i >= 4 ? [`benchmark-node-${i - 1}`] : [],
    positions: { [stage]: { x: (i % 30) * 180, y: Math.floor(i / 30) * 90 } },
    tags: i % 5 === 0 ? ['event', 'messaging'] : [],
    status: 'draft',
  });
  if (i >= 4) {
    edges.push({
      id: `benchmark-edge-${i}`,
      sourceId: `benchmark-node-${i - 4}`, 
      targetId: id,
      kind: i % 4 === 0 ? 'publishes' : 'communicatesWith',
      stage,
      properties: { protocolStyle: i % 4 === 0 ? 'asynchronous' : 'synchronous' },
    });
  }
}
const project = { ...structuredClone(sampleProject), id: 'benchmark-project', nodes, edges, findings: [], patternSelections: [] };
const runs = 20;
const validation = [];
const recommendations = [];
const impacts = [];
const comparisons = [];
const mergePlans = [];
const driftAnalyses = [];
const policyGates = [];
const operationalDrift = [];
const topologyDerivation = [];
const remediationPlanning = [];
const portfolioIntelligence = [];
const runtimeInventory = importRuntimeInventory(project, 'benchmark runtime', 'manual', { resources: nodes.filter((node) => node.stage === 'applicationRealization' || node.stage === 'physicalTechnology').map((node) => ({ id: `actual-${node.id}`, externalId: `actual:${node.id}`, resourceType: node.kind, name: node.label, labels: { 'aiw.node-id': node.id }, properties: node.properties })), relationships: [] });
for (let i = 0; i < runs; i += 1) {
  let start = performance.now();
  validateProject(project, library);
  validation.push(performance.now() - start);
  start = performance.now();
  recommendInContext(project, library, { stage: 'applicationRealization', trigger: 'canvas-change' });
  recommendations.push(performance.now() - start);
  start = performance.now();
  analyseImpact(project, ['benchmark-node-0']);
  impacts.push(performance.now() - start);
  const alternative = structuredClone(project);
  alternative.branch = { ...alternative.branch, id: 'benchmark-alt' };
  alternative.nodes = alternative.nodes.slice(0, 1490);
  for (let index = 0; index < 10; index += 1) alternative.nodes[index].label = `Alternative conflict ${index}`;
  start = performance.now();
  compareBranches(project, alternative);
  comparisons.push(performance.now() - start);
  const target = structuredClone(project);
  for (let index = 0; index < 10; index += 1) target.nodes[index].label = `Target conflict ${index}`;
  start = performance.now();
  createMergePlan(alternative, target);
  mergePlans.push(performance.now() - start);
  start = performance.now();
  const drift = analyseArchitectureDrift(project, runtimeInventory);
  driftAnalyses.push(performance.now() - start);
  start = performance.now();
  evaluateArchitecturePolicyGate(project, project.policyGates[0], [], drift);
  policyGates.push(performance.now() - start);
  start = performance.now();
  const operational = analyseOperationalDrift(project, runtimeInventory);
  operationalDrift.push(performance.now() - start);
  start = performance.now();
  deriveTopologyFromTelemetry(project, 'benchmark telemetry', Array.from({ length: 1500 }, (_, index) => ({ traceId: `trace-${index}`, spanId: `span-${index}`, serviceName: `service-${index % 100}`, peerService: `service-${(index + 1) % 100}`, operation: 'call', status: index % 50 === 0 ? 'error' : 'ok', durationMs: 10 + (index % 200), observedAt: new Date().toISOString(), attributes: {} })));
  topologyDerivation.push(performance.now() - start);
  start = performance.now();
  createRemediationPlan(operational, 'benchmark-user');
  remediationPlanning.push(performance.now() - start);
  start = performance.now();
  buildPortfolioIntelligence(samplePortfolioProjects, sampleEnterpriseCatalog);
  portfolioIntelligence.push(performance.now() - start);
}
const stats = (values) => ({
  averageMs: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)),
  p95Ms: Number(values.slice().sort((a, b) => a - b)[Math.floor(values.length * 0.95) - 1].toFixed(2)),
  maxMs: Number(Math.max(...values).toFixed(2)),
});
const report = { nodes: nodes.length, edges: edges.length, runs, validation: stats(validation), contextualRecommendation: stats(recommendations), impactAnalysis: stats(impacts), branchComparison: stats(comparisons), mergePlan: stats(mergePlans), driftAnalysis: stats(driftAnalyses), policyGate: stats(policyGates), operationalDrift: stats(operationalDrift), telemetryTopology: stats(topologyDerivation), remediationPlan: stats(remediationPlanning), portfolioIntelligence: stats(portfolioIntelligence) };
fs.writeFileSync(new URL('../ENGINE_BENCHMARK.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
