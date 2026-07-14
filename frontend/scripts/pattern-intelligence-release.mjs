import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { patternCorpusMetrics, sampleProject, sprint78BenchmarkScenarios, sprint78PatternCorpus } from '../packages/domain/dist/index.js';
import { buildRepositoryGovernancePolicies, normalizePatternCorpus, runSprint78BenchmarkSuite, sprint78KnowledgeReleaseManifest } from '../packages/engine/dist/index.js';

const root = resolve(import.meta.dirname, '..');
const dataDir = resolve(root, 'data');
const generatedDir = resolve(root, 'generated');
await mkdir(dataDir, { recursive: true });
await mkdir(generatedDir, { recursive: true });

const metrics = patternCorpusMetrics();
const normalization = normalizePatternCorpus();
const policies = buildRepositoryGovernancePolicies();
const release = sprint78KnowledgeReleaseManifest();
const benchmarkResults = runSprint78BenchmarkSuite(sampleProject);

await writeFile(resolve(dataDir, 'sprint7_8-pattern-intelligence.json'), JSON.stringify({ version: '0.8.8', releaseId: release.releaseId, metrics, records: sprint78PatternCorpus }, null, 2));
await writeFile(resolve(dataDir, 'sprint7_8-repository-governance-policies.json'), JSON.stringify({ version: '0.8.8', policies }, null, 2));
await writeFile(resolve(dataDir, 'sprint7_8-benchmark-scenarios.json'), JSON.stringify({ version: '0.8.8', scenarios: sprint78BenchmarkScenarios }, null, 2));
await writeFile(resolve(dataDir, 'sprint7_8-knowledge-release.json'), JSON.stringify(release, null, 2));
await writeFile(resolve(dataDir, 'sprint7_8-pattern-intelligence.schema.json'), JSON.stringify({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://aiw.local/schemas/sprint7_8-pattern-intelligence.schema.json',
  title: 'AIW Sprint 7.8 Pattern DNA Corpus', type: 'object', required: ['version','releaseId','metrics','records'],
  properties: {
    version: { const: '0.8.8' }, releaseId: { type: 'string', pattern: '^AKR-' }, metrics: { type: 'object' },
    records: { type: 'array', minItems: 200, items: { type: 'object', required: ['id','name','recordType','category','problem','context','forces','applicabilityRules','qualityImpacts','obligations','evidence','lifecycle','review'], properties: { id: { type: 'string' }, name: { type: 'string' }, recordType: { enum: ['style','pattern','anti-pattern','topology-template','component-archetype','reference-architecture'] }, lifecycle: { enum: ['candidate','approved','deprecated','retired'] }, evidence: { type: 'array', minItems: 1 }, obligations: { type: 'array', minItems: 1 }, review: { type: 'object', required: ['reviewedBy','reviewedAt','releaseId','reviewMethod'] } } } },
  },
}, null, 2));
await writeFile(resolve(generatedDir, 'sprint7_8-pattern-intelligence-report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), metrics, normalization: { canonicalRecords: normalization.canonical.length, duplicateGroups: normalization.duplicateGroups, providerRealizations: normalization.providerRealizations.length, warnings: normalization.warnings }, governance: { policies: policies.length, productionRecommendationSources: policies.filter((item) => item.productionRecommendationAllowed).length, immutableSnapshotPolicies: policies.filter((item) => item.immutableSnapshotRequired).length }, release, benchmarks: { total: benchmarkResults.length, passed: benchmarkResults.filter((item) => item.passed).length, results: benchmarkResults } }, null, 2));

console.log(JSON.stringify({ metrics, release: release.releaseId, benchmarkPassed: benchmarkResults.filter((item) => item.passed).length, benchmarkTotal: benchmarkResults.length }, null, 2));
