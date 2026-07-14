#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const distributionRoot = path.resolve(root, '..');
const RELEASE_VERSION = '0.10.0-rc.10.57.0';
const KNOWLEDGE_RELEASE_ID = 'AKR-0.10.55';
const REQUIRED_VIEWS = [
  'system-context',
  'logical-application',
  'application-realization',
  'interface-event-flow',
  'data-architecture',
  'logical-technology',
  'physical-deployment',
  'security-trust-boundaries',
  'resilience-recovery',
  'cross-stage-traceability',
];
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const readJson = (relative) => JSON.parse(read(relative));
const packageJson = readJson('package.json');
const releaseManifest = JSON.parse(fs.readFileSync(path.join(distributionRoot, 'RELEASE_MANIFEST.json'), 'utf8'));
const engineSource = read('packages/engine/src/architectureSynthesis.ts');
const blueprintSource = read('packages/engine/src/architectureBlueprint.ts');
const domainSource = read('packages/domain/src/architectureBlueprint.ts');
const artifactSource = read('packages/artifacts/src/index.ts');
const diagramSource = read('packages/artifacts/src/synthesisBlueprintDiagrams.ts');
const webRoot = fs.existsSync(path.join(root, 'apps/web/src')) ? 'apps/web/src' : null;
const workspaceSource = webRoot && fs.existsSync(path.join(root, `${webRoot}/components/ArchitectureSynthesisWorkspace.tsx`))
  ? read(`${webRoot}/components/ArchitectureSynthesisWorkspace.tsx`) : '';
const cssSource = webRoot && fs.existsSync(path.join(root, `${webRoot}/styles/rc10_57_synthesis_blueprint.css`))
  ? read(`${webRoot}/styles/rc10_57_synthesis_blueprint.css`) : '';
const apiSourcePath = fs.existsSync(path.join(root, 'apps/api/src/app.ts')) ? 'apps/api/src/app.ts' : null;
const apiSource = apiSourcePath ? read(apiSourcePath) : '';

const checks = [];
const check = (id, condition, actual, expected) => checks.push({ id, passed: Boolean(condition), actual, expected });
const includesAll = (source, fragments) => fragments.every((fragment) => source.includes(fragment));

check('release.package-version', packageJson.version === RELEASE_VERSION, packageJson.version, RELEASE_VERSION);
check('release.manifest-version', releaseManifest.version === RELEASE_VERSION, releaseManifest.version, RELEASE_VERSION);
check('release.line', releaseManifest.releaseLine === 'rc.10.57', releaseManifest.releaseLine, 'rc.10.57');
check('release.knowledge-pin', releaseManifest.knowledgeReleaseId === KNOWLEDGE_RELEASE_ID, releaseManifest.knowledgeReleaseId, KNOWLEDGE_RELEASE_ID);
check('domain.required-views', REQUIRED_VIEWS.every((id) => domainSource.includes(`'${id}'`)), 'ten required view identifiers', REQUIRED_VIEWS);
check('domain.interface-contract', includesAll(domainSource, ['providerNodeId', 'consumerNodeIds', 'protocol', 'schemaRef', 'authentication', 'authorization', 'deliveryGuarantee', 'slo']), 'provider/consumer and contract semantics', 'present');
check('domain.provider-neutral-overlays', includesAll(domainSource, ['providerNeutralFirst', 'capabilityProductMappings', 'providerOverlays', 'canonicalModelFingerprint']), 'neutral baseline plus overlays', 'present');
check('engine.deterministic-eligibility', includesAll(blueprintSource, ['aiw-synthesis-eligibility-2.0', 'evaluateSynthesisEligibility']), 'deterministic eligibility', 'present');
check('engine.pattern-dna-composition', engineSource.includes('selectPatterns') && engineSource.includes('applyPatternComposition'), 'Pattern DNA composition', 'present');
check('engine.counterfactuals', includesAll(engineSource, ['buildAlternativeCounterfactuals', 'materialDifferenceMatrix']), 'counterfactual and material difference analysis', 'present');
check('engine.interface-generation', includesAll(blueprintSource, ['interfaceFromCanonical', 'inferredInteraction', 'interfaceContracts']), 'canonical and inferred contracts', 'present');
check('engine.physical-lineage', includesAll(blueprintSource, ['deploymentTopology', 'logicalCapabilityIds', 'physicalToLogicalTraceabilityPercent']), 'physical-to-logical traceability', 'present');
check('engine.security-resilience', includesAll(blueprintSource, ['trustZones', 'failurePaths', 'requiredControls', 'recoveryMechanisms']), 'trust zones and failure paths', 'present');
check('artifact.view-svg-renderer', includesAll(diagramSource, ['renderBlueprintViewSvg', 'alternative.blueprint.views.map', 'image/svg+xml']), 'model-derived SVG renderer over blueprint views', 'present');
check('artifact.sdd-embedding', includesAll(artifactSource, ['docs/sdd/architecture-synthesis-and-deployment.md', '## Architecture views', 'overlays are proposals']), 'SDD synthesis/deployment section', 'present');
check('artifact.interface-register', artifactSource.includes('architecture/interface-register.csv'), 'interface register', 'present');
check('artifact.traceability-register', artifactSource.includes('architecture/cross-stage-traceability.csv'), 'cross-stage traceability', 'present');
check('test.engine', fs.existsSync(path.join(root, 'packages/engine/test/rc10_57_synthesis_blueprint.test.ts')), 'engine acceptance test', 'present');
check('test.artifacts', fs.existsSync(path.join(root, 'packages/artifacts/test/rc10_57_synthesis_artifacts.test.ts')), 'artifact acceptance test', 'present');
if (apiSourcePath) {
  check('api.synthesis-run', apiSource.includes('/api/synthesis/runs'), 'synthesis run endpoint', 'present');
  check('api.comparison', apiSource.includes('/api/synthesis/runs/:runId/comparison'), 'comparison endpoint', 'present');
  check('api.artifacts', apiSource.includes('/api/synthesis/runs/:runId/artifacts'), 'artifact endpoint', 'present');
  check('test.api', fs.existsSync(path.join(root, 'apps/api/test/rc10_57_synthesisBlueprint.test.ts')), 'API acceptance test', 'present');
}
if (workspaceSource) {
  check('ui.release-surface', workspaceSource.includes('rc.10.57 · Architecture Synthesis, Interfaces and Deployment'), 'rc.10.57 hero', 'present');
  check('ui.blueprint-tab', workspaceSource.includes('Blueprint & interfaces'), 'blueprint and interfaces tab', 'present');
  check('ui.blueprint-analysis', includesAll(workspaceSource, ['Interface contracts', 'Capability-to-product mapping', 'Trust boundaries and failure-path analysis']), 'contracts, mappings, trust and failures', 'present');
  if (cssSource) check('ui.responsive', cssSource.includes('@media (max-width:') && cssSource.includes('.synthesis-blueprint-layout'), 'responsive synthesis blueprint layout', 'present');
}

const runtime = { alternatives: [], comparison: null, selected: null, artifactPackage: null };
try {
  const domain = await import(pathToFileURL(path.join(root, 'packages/domain/dist/index.js')).href);
  const engine = await import(pathToFileURL(path.join(root, 'packages/engine/dist/index.js')).href);
  const artifacts = await import(pathToFileURL(path.join(root, 'packages/artifacts/dist/index.js')).href);
  const request = {
    project: structuredClone(domain.sampleProject),
    knowledgeReleaseId: KNOWLEDGE_RELEASE_ID,
    strategyIds: ['balanced','simplicity-first','resilience-first','security-first','cost-first'],
    maxAlternatives: 5,
    requireDiversity: true,
  };
  const run = engine.synthesizeArchitectureAlternatives(request);
  const comparison = engine.compareArchitectureAlternatives(run.alternatives);
  const selected = run.alternatives.find((item) => item.id === run.recommendedAlternativeId) ?? run.alternatives[0];
  const bundle = artifacts.compileSynthesisArtifacts(run, selected.id, [], 'rc.10.57 release-gate selection rationale.');
  runtime.alternatives = run.alternatives.map((item) => ({
    id: item.id,
    strategyId: item.strategyId,
    eligible: item.eligibility.eligible,
    patterns: item.patternIds.length,
    nodes: item.projectedProject.nodes.length,
    interfaces: item.blueprint.interfaceContracts.length,
    views: item.blueprint.views.map((view) => view.id),
    providerOverlays: item.blueprint.providerOverlays.length,
    deploymentElements: item.blueprint.deploymentTopology.length,
    trustZones: item.blueprint.trustZones.length,
    failurePaths: item.blueprint.failurePaths.length,
    completeness: item.blueprint.completeness,
    fingerprint: item.blueprint.canonicalModelFingerprint,
  }));
  runtime.comparison = {
    paretoAlternativeIds: comparison.paretoAlternativeIds,
    counterfactuals: comparison.counterfactuals.length,
    matrixRows: Object.keys(comparison.materialDifferenceMatrix).length,
  };
  runtime.selected = { id: selected.id, name: selected.name, strategyId: selected.strategyId };
  runtime.artifactPackage = {
    files: bundle.files.length,
    svgFiles: bundle.files.filter((file) => file.path.endsWith('.svg')).map((file) => file.path),
    sddPresent: bundle.files.some((file) => file.path === 'docs/sdd/architecture-synthesis-and-deployment.md'),
    interfaceRegisterPresent: bundle.files.some((file) => file.path === 'architecture/interface-register.csv'),
    traceabilityPresent: bundle.files.some((file) => file.path === 'architecture/cross-stage-traceability.csv'),
  };
  const sampleOut = path.join(root, 'generated/rc10-57/sample-synthesis');
  fs.rmSync(sampleOut, { recursive: true, force: true });
  fs.mkdirSync(sampleOut, { recursive: true });
  for (const file of bundle.files) {
    const target = path.join(sampleOut, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content);
  }
  fs.writeFileSync(path.join(sampleOut, 'comparison.json'), `${JSON.stringify(comparison, null, 2)}\n`);
} catch (error) {
  runtime.error = error instanceof Error ? error.stack ?? error.message : String(error);
}

const allAlternativesComplete = runtime.alternatives.length === 5 && runtime.alternatives.every((item) =>
  item.eligible && item.patterns > 0 && item.interfaces > 0 && item.views.length === 10 &&
  REQUIRED_VIEWS.every((id) => item.views.includes(id)) && item.providerOverlays === 5 &&
  item.deploymentElements > 0 && item.trustZones > 0 && item.failurePaths > 0 &&
  item.completeness.componentTraceabilityPercent === 100 &&
  item.completeness.interfaceContractPercent === 100 &&
  item.completeness.physicalToLogicalTraceabilityPercent === 100 &&
  item.completeness.requiredViewsPresent === 10
);
const uniqueStrategies = new Set(runtime.alternatives.map((item) => item.strategyId)).size;
const materiallyDifferent = new Set(runtime.alternatives.map((item) => `${item.strategyId}:${item.fingerprint}:${item.interfaces}:${item.failurePaths}`)).size === runtime.alternatives.length;
check('runtime.five-complete-alternatives', allAlternativesComplete, runtime.alternatives, 'five eligible alternatives with complete lineage, contracts, deployment and ten views');
check('runtime.material-difference', uniqueStrategies === 5 && materiallyDifferent, { uniqueStrategies, materiallyDifferent }, 'five materially different strategy postures');
check('runtime.counterfactual-comparison', runtime.comparison && runtime.comparison.counterfactuals >= 5 && runtime.comparison.matrixRows === 5, runtime.comparison, 'counterfactuals and 5-row material difference matrix');
check('runtime.artifact-package', runtime.artifactPackage && runtime.artifactPackage.svgFiles.length === 10 && runtime.artifactPackage.sddPresent && runtime.artifactPackage.interfaceRegisterPresent && runtime.artifactPackage.traceabilityPresent, runtime.artifactPackage, 'ten SVGs, SDD, interface and traceability registers');

const failures = checks.filter((item) => !item.passed);
const evidence = {
  releaseVersion: RELEASE_VERSION,
  releaseLine: 'rc.10.57',
  knowledgeReleaseId: KNOWLEDGE_RELEASE_ID,
  generatedAt: new Date().toISOString(),
  summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length },
  runtimeAcceptance: runtime,
  checks,
  limitations: [
    'Cost and operational-complexity values are comparative planning assumptions, not provider quotations or capacity guarantees.',
    'Provider overlays are non-authoritative proposals and do not mutate the provider-neutral canonical architecture.',
    'Production queues, identity, signing, object storage, observability, backup/restore and external connector acceptance remain rc.10.58 scope.',
  ],
};
const outDir = path.join(root, 'generated/rc10-57');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'rc10_57-synthesis-blueprint-gate.json'), `${JSON.stringify(evidence, null, 2)}\n`);

if (failures.length) {
  console.error(`FAIL rc.10.57 synthesis-blueprint gate (${failures.length}/${checks.length} failed)`);
  for (const failure of failures) console.error(`- ${failure.id}: expected ${JSON.stringify(failure.expected)}, got ${JSON.stringify(failure.actual)}`);
  process.exit(1);
}
console.log(`PASS rc.10.57 synthesis-blueprint gate (${checks.length}/${checks.length})`);
console.log(`Validated ${runtime.alternatives.length} materially different alternatives, ${runtime.artifactPackage.svgFiles.length} rendered views and a complete blueprint handoff package.`);
