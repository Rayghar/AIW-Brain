import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  knowledgeRepositoryConnectors,
  sampleProject,
  sprint80DefaultSimulationScenarios,
} from '../packages/domain/dist/index.js';
import {
  applyArchitectureAlternative,
  assessArchitectureDesignBrief,
  compareArchitectureAlternatives,
  createSynthesisDecisionPackage,
  runArchitectureSimulationSuite,
  synthesizeArchitectureAlternatives,
} from '../packages/engine/dist/index.js';
import { compileSynthesisArtifacts } from '../packages/artifacts/dist/index.js';

const startedAt = new Date().toISOString();
const checks = [];
const record = (name, passed, detail) => checks.push({ name, passed: Boolean(passed), detail });

const request = {
  project: structuredClone(sampleProject),
  knowledgeReleaseId: 'AKR-0.8.9',
  strategyIds: ['balanced', 'simplicity-first', 'resilience-first', 'security-first', 'cost-first'],
  maxAlternatives: 5,
  requireDiversity: true,
  useLlmEnrichment: false,
  dataClassification: 'internal',
};

const assessment = assessArchitectureDesignBrief(request.project);
record(
  'Design-brief readiness and explicit gaps',
  assessment.completenessScore >= 75 && assessment.synthesisReady && assessment.strengths.length >= 4,
  { completenessScore: assessment.completenessScore, synthesisReady: assessment.synthesisReady, gaps: assessment.gaps.length, contradictions: assessment.contradictions.length },
);

const run = synthesizeArchitectureAlternatives(request);
const distinctPatternSets = new Set(run.alternatives.map((alternative) => [...alternative.patternIds].sort().join('|')));
record(
  'Governed multi-alternative synthesis',
  run.alternatives.length >= 4 && run.mode === 'deterministic' && distinctPatternSets.size >= 3,
  { alternatives: run.alternatives.length, distinctPatternSets: distinctPatternSets.size, mode: run.mode, knowledgeReleaseId: run.knowledgeReleaseId },
);

const discoveryOnlyIds = new Set(knowledgeRepositoryConnectors.filter((item) => item.lifecycleStatus === 'discovery-only').map((item) => item.id));
const evidenceIds = [...new Set(run.alternatives.flatMap((alternative) => alternative.evidenceConnectorIds))];
const discoveryLeakage = evidenceIds.filter((id) => discoveryOnlyIds.has(id));
record(
  'Discovery-only evidence excluded from synthesis authority',
  discoveryLeakage.length === 0,
  { evidenceConnectorIds: evidenceIds.length, discoveryLeakage },
);

const comparison = compareArchitectureAlternatives(run.alternatives);
record(
  'Pareto comparison and decision questions',
  comparison.paretoAlternativeIds.length >= 1 && Object.keys(comparison.winnerByDimension).length >= 8 && comparison.decisionQuestions.length >= 5,
  { pareto: comparison.paretoAlternativeIds, dominated: comparison.dominatedAlternativeIds, dimensions: Object.keys(comparison.winnerByDimension).length },
);

const selectedAlternativeId = run.recommendedAlternativeId ?? run.paretoAlternativeIds[0] ?? run.alternatives[0]?.id;
if (!selectedAlternativeId) throw new Error('Sprint 8.0 verifier could not select an alternative.');
const simulations = runArchitectureSimulationSuite(run, selectedAlternativeId, sprint80DefaultSimulationScenarios);
record(
  'Deterministic scenario simulation coverage',
  simulations.length === sprint80DefaultSimulationScenarios.length && simulations.every((item) => item.deterministicModelVersion === 'aiw-simulation-1.0' && item.confidence > 0),
  { scenarios: simulations.length, modelVersions: [...new Set(simulations.map((item) => item.deterministicModelVersion))], confidenceRange: [Math.min(...simulations.map((item) => item.confidence)), Math.max(...simulations.map((item) => item.confidence))] },
);

const simulationsAgain = runArchitectureSimulationSuite(run, selectedAlternativeId, sprint80DefaultSimulationScenarios);
const outcomeFingerprint = JSON.stringify(simulations.map((item) => item.outcome));
const repeatFingerprint = JSON.stringify(simulationsAgain.map((item) => item.outcome));
record(
  'Simulation repeatability',
  outcomeFingerprint === repeatFingerprint,
  { repeatable: outcomeFingerprint === repeatFingerprint },
);

const selected = run.alternatives.find((alternative) => alternative.id === selectedAlternativeId);
if (!selected) throw new Error('Selected alternative not found.');
const applied = applyArchitectureAlternative(request.project, selected, 'accepted');
record(
  'Canonical-model application and lineage',
  applied.revision === request.project.revision + 1 && applied.patternSelections.some((item) => selected.patternIds.includes(item.patternId) && item.status === 'accepted') && applied.decisions.length > request.project.decisions.length,
  { originalRevision: request.project.revision, appliedRevision: applied.revision, selectedPatterns: selected.patternIds.length, decisions: applied.decisions.length },
);

const decision = createSynthesisDecisionPackage(run, selectedAlternativeId, simulations, 'Selected after governed comparison, stress simulation and architecture review.', true);
record(
  'Governed decision and conformance handoff',
  decision.status === 'accepted' && decision.simulationResultIds.length === simulations.length && decision.conformanceTargets.length > 0 && decision.artifactPaths.includes('architecture/calm.json'),
  { status: decision.status, simulations: decision.simulationResultIds.length, conformanceTargets: decision.conformanceTargets, artifactPaths: decision.artifactPaths },
);

const artifacts = compileSynthesisArtifacts(run, selectedAlternativeId, simulations, decision.rationale);
const paths = new Set(artifacts.files.map((file) => file.path));
const requiredArtifacts = ['synthesis/run.json', 'synthesis/alternative-project.json', 'synthesis/decision-package.json', 'docs/adr/synthesis-decision.md', 'docs/simulation-report.md', 'diagrams/synthesis-alternative.mmd', 'architecture/calm.json', 'simulation/results.json'];
record(
  'Complete synthesis artifact package',
  requiredArtifacts.every((path) => paths.has(path)) && artifacts.files.every((file) => artifacts.manifest.checksums[file.path]),
  { files: artifacts.files.length, requiredArtifacts, missing: requiredArtifacts.filter((path) => !paths.has(path)), checksums: Object.keys(artifacts.manifest.checksums).length },
);

const migration = await readFile(resolve('database/migrations/008_sprint8_0_architecture_synthesis_and_simulation.sql'), 'utf8');
const synthesisTables = ['architecture_synthesis_runs', 'architecture_synthesis_alternatives', 'architecture_simulation_results', 'architecture_synthesis_decisions', 'synthesis_artifact_manifests'];
record(
  'PostgreSQL persistence and tenant RLS contract',
  synthesisTables.every((table) => migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`) && migration.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`)),
  { tables: synthesisTables.length, rowLevelSecurity: true },
);

const serviceSource = await readFile(resolve('apps/api/src/architectureSynthesisService.ts'), 'utf8');
record(
  'Configurable LLM remains an explanation boundary',
  serviceSource.includes('Do not add technologies, patterns, facts or scores') && serviceSource.includes('synthesizeArchitectureAlternatives') && serviceSource.includes("purpose: 'architecture-reasoning'"),
  { providerNeutralGateway: serviceSource.includes('LlmGateway'), structuralAuthority: 'deterministic engine' },
);

const releaseEndpointSource = await readFile(resolve('apps/api/src/app.ts'), 'utf8');
record(
  'Sprint 8.0 API and conformance handoff surface',
  ['/api/synthesis/runs', '/api/synthesis/runs/:runId/simulate', '/api/synthesis/runs/:runId/artifacts', '/api/synthesis/runs/:runId/conformance-handoff', '/api/releases/8.0'].every((route) => releaseEndpointSource.includes(route)),
  { routes: 5 },
);

const report = {
  version: '0.9.0',
  releaseId: 'AIW-8.0',
  knowledgeReleaseId: run.knowledgeReleaseId,
  startedAt,
  completedAt: new Date().toISOString(),
  total: checks.length,
  passed: checks.filter((item) => item.passed).length,
  failed: checks.filter((item) => !item.passed).length,
  selectedAlternativeId,
  alternatives: run.alternatives.map((alternative) => ({ id: alternative.id, name: alternative.name, strategyId: alternative.strategyId, scorecard: alternative.scorecard, patternIds: alternative.patternIds })),
  simulations: simulations.map((item) => ({ id: item.id, scenario: item.scenario.name, type: item.scenario.type, outcome: item.outcome, confidence: item.confidence, findingCount: item.findings.length })),
  artifactCount: artifacts.files.length,
  checks,
};
await writeFile(resolve('ARCHITECTURE_SYNTHESIS_BENCHMARK.json'), JSON.stringify(report, null, 2) + '\n');
await writeFile(resolve('generated/sprint8_0-architecture-synthesis-report.json'), JSON.stringify(report, null, 2) + '\n');
await writeFile(resolve('data/sprint8_0-example-synthesis-run.json'), JSON.stringify(run, null, 2) + '\n');
await writeFile(resolve('data/sprint8_0-example-simulation-results.json'), JSON.stringify(simulations, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.failed) process.exitCode = 1;
