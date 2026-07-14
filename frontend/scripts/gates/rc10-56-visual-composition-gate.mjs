#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const distributionRoot = path.resolve(root, '..');
const RELEASE_VERSION = '0.10.0-rc.10.56.0';
const KNOWLEDGE_RELEASE_ID = 'AKR-0.10.55';
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const readJson = (relative) => JSON.parse(read(relative));
const packageJson = readJson('package.json');
const releaseManifest = JSON.parse(fs.readFileSync(path.join(distributionRoot, 'RELEASE_MANIFEST.json'), 'utf8'));
const webSourceRoot = fs.existsSync(path.join(root, 'apps/web/src')) ? 'apps/web/src' : null;
if (!webSourceRoot) throw new Error('WEB_SOURCE_NOT_FOUND');
const studioSource = read(`${webSourceRoot}/components/VisualCompositionStudio.tsx`);
const patternWorkspaceSource = read(`${webSourceRoot}/components/PatternIntelligenceWorkspace.tsx`);
const storeSource = read(`${webSourceRoot}/store/workspaceStore.ts`);
const cssSource = read(`${webSourceRoot}/styles/rc10_56_composition_studio.css`);
const apiSourcePath = fs.existsSync(path.join(root, 'apps/api/src/app.ts')) ? 'apps/api/src/app.ts' : null;
const apiSource = apiSourcePath ? read(apiSourcePath) : '';
const engineSource = read('packages/engine/src/patternIntelligence.ts');
const domainSource = read('packages/domain/src/patternIntelligence.ts');
const activeLibrary = readJson('data/knowledge-library.json');

const checks = [];
const check = (id, condition, actual, expected) => checks.push({ id, passed: Boolean(condition), actual, expected });
const includesAll = (source, fragments) => fragments.every((fragment) => source.includes(fragment));

check('release.package-version', packageJson.version === RELEASE_VERSION, packageJson.version, RELEASE_VERSION);
check('release.manifest-version', releaseManifest.version === RELEASE_VERSION, releaseManifest.version, RELEASE_VERSION);
check('release.line', releaseManifest.releaseLine === 'rc.10.56', releaseManifest.releaseLine, 'rc.10.56');
check('knowledge.pinned-approved-release', activeLibrary.knowledgeReleaseId === KNOWLEDGE_RELEASE_ID, activeLibrary.knowledgeReleaseId, KNOWLEDGE_RELEASE_ID);
check('ui.studio-surface', studioSource.includes('Visual Architecture Composition Studio'), 'Visual Architecture Composition Studio', 'present');
check('ui.core-workflow', includesAll(studioSource, ['Search', 'Compare', 'Inspect', 'Preview topology', 'Apply to scope', 'Review changes', 'Accept', 'Validate obligations']), 'workflow labels', 'all eight workflow stages');
check('ui.search-across-dna', includesAll(studioSource, ['record.aliases', 'record.componentKit', 'record.interfaceKit', 'record.tags']), 'aliases + component kit + interface kit + tags', 'all searchable');
check('ui.facets', includesAll(studioSource, ['recordType', 'category', 'stageAlignedOnly', 'project.activeStage']), 'record type + category + stage', 'faceted filters');
check('ui.compare', studioSource.includes('PatternCompare') && studioSource.includes("mode === 'compare'"), 'comparison state', 'side-by-side comparison');
check('ui.topology-preview', studioSource.includes('<svg') && studioSource.includes('Pattern topology preview'), 'SVG preview', 'rendered topology before apply');
check('ui.before-after', includesAll(studioSource, ['rc56-before-after', 'Current model', 'After acceptance']), 'before/after metrics', 'present');
check('ui.evidence-drawer', includesAll(studioSource, ['rc56-evidence-drawer', 'Source and evidence', 'evidence']), 'evidence drawer', 'present');
check('ui.canonical-validation', studioSource.includes('canonicalChecks'), 'canonical checks', 'visible');
check('ui.apply-and-rollback', includesAll(studioSource, ['applyPatternCompositionPlan', 'rollbackPatternCompositionPlan']), 'apply + rollback', 'both present');
check('ui.canvas-entry', studioSource.includes('Open canvas'), 'Open canvas', 'present');
check('ui.responsive', cssSource.includes('@media (max-width:') && cssSource.includes('.rc56-composition-studio'), '@media responsive rules', 'present');
check('ui.pattern-studio-default', patternWorkspaceSource.includes("useState<Tab>('compose')") && patternWorkspaceSource.includes('<VisualCompositionStudio'), 'compose is default', 'true');
check('store.composition-history', storeSource.includes('compositionHistory: PatternCompositionPlan[]'), 'composition history', 'present');
check('store.safe-apply', storeSource.includes('applyGovernedPatternComposition'), 'governed apply', 'present');
check('store.safe-rollback', storeSource.includes('rollbackGovernedPatternComposition'), 'governed rollback', 'present');
check('domain.mutation-completeness', includesAll(domainSource, ['addNodes', 'addEdges', 'addInterfaces', 'addArchitectureViews']), 'objects + relationships + interfaces + views', 'all model mutation types');
check('domain.rollback-completeness', includesAll(domainSource, ['removeNodeIds', 'removeEdgeIds', 'removeInterfaceIds', 'removeArchitectureViewIds', 'removePatternSelectionIds']), 'rollback identifiers', 'all generated model items');
check('domain.idempotency-contract', includesAll(domainSource, ['applicationKey', 'duplicateSkips', 'canonicalChecks']), 'application key + duplicate skips + canonical checks', 'present');
check('engine.trust-boundaries', engineSource.includes("kind: 'NetworkZone'") && engineSource.includes("kind: 'contains'"), 'network zone + containment', 'generated trust boundary');
check('engine.interface-generation', engineSource.includes('addInterfaces') && engineSource.includes('interfaceKit'), 'Pattern DNA interface generation', 'present');
check('engine.named-stage-view', engineSource.includes('addArchitectureViews') && engineSource.includes('nodeIds'), 'persistent named architecture view', 'present');
check('engine.obligation-generation', engineSource.includes('obligations'), 'pattern obligations', 'generated');
check('engine.duplicate-protection', engineSource.includes('duplicateSkips') && engineSource.includes('existingNodes') && engineSource.includes('existingInterfaces'), 'duplicate checks', 'present');
check('engine.authority-boundary', engineSource.includes("record.lifecycle === 'approved'"), 'approved-only eligibility', 'present');
check('test.targeted-engine', fs.existsSync(path.join(root, 'packages/engine/test/rc10_56_visual_composition.test.ts')), 'targeted engine test', 'present');
if (apiSourcePath) {
  check('api.catalogue', apiSource.includes('/api/visual-composition/catalogue'), 'catalogue endpoint', 'present');
  check('api.preview', apiSource.includes('/api/pattern-composition/preview'), 'preview endpoint', 'present');
  check('api.apply-preview', apiSource.includes('/api/pattern-composition/apply-preview'), 'apply endpoint', 'present');
  check('api.search-depth', includesAll(apiSource, ['record.aliases', 'record.componentKit', 'record.interfaceKit', 'record.qualityImpacts']), 'deep search fields', 'present');
  check('test.targeted-api', fs.existsSync(path.join(root, 'apps/api/test/rc10_56_visualComposition.test.ts')), 'targeted API test', 'present');
}

let runtime = { stagePlans: [], idempotency: null, rollback: null };
try {
  const domain = await import(pathToFileURL(path.join(root, 'packages/domain/dist/index.js')).href);
  const engine = await import(pathToFileURL(path.join(root, 'packages/engine/dist/index.js')).href);
  for (const stage of domain.architectureStages) {
    const record = domain.sprint78PatternCorpus.find((item) => item.lifecycle === 'approved' && item.topology?.nodes?.length && item.applicableStages.includes(stage) && (item.interfaceKit?.length ?? 0) > 0);
    if (!record) continue;
    const projectForStage = structuredClone(domain.sampleProject);
    projectForStage.activeStage = stage;
    const plan = engine.composePatterns({ project: projectForStage, patternIds: [record.id], stage, allowConditionalPrerequisites: true });
    runtime.stagePlans.push({
      stage,
      patternId: record.id,
      eligible: plan.eligible,
      nodes: plan.mutation.addNodes.length,
      edges: plan.mutation.addEdges.length,
      interfaces: plan.mutation.addInterfaces.length,
      views: plan.mutation.addArchitectureViews.length,
      obligations: plan.obligations.length,
      canonicalChecksPassed: plan.canonicalChecks.every((item) => item.passed),
    });
  }
  const project = structuredClone(domain.sampleProject);
  const plan = engine.composePatterns({ project, patternIds: ['PAT-TRANSACTIONAL-OUTBOX'], stage: 'applicationRealization', allowConditionalPrerequisites: true });
  const applied = engine.applyPatternComposition(project, plan);
  const secondPlan = engine.composePatterns({ project: applied, patternIds: ['PAT-TRANSACTIONAL-OUTBOX'], stage: 'applicationRealization', allowConditionalPrerequisites: true });
  const reapplied = engine.applyPatternComposition(applied, secondPlan);
  const rolledBack = engine.rollbackPatternComposition(applied, plan);
  runtime.idempotency = {
    duplicateSkips: secondPlan.duplicateSkips.length,
    nodeCountStable: reapplied.nodes.length === applied.nodes.length,
    edgeCountStable: reapplied.edges.length === applied.edges.length,
    interfaceCountStable: (reapplied.interfaces ?? []).length === (applied.interfaces ?? []).length,
  };
  runtime.rollback = {
    baselineNodesRestored: rolledBack.nodes.length === project.nodes.length,
    baselineEdgesRestored: rolledBack.edges.length === project.edges.length,
    generatedInterfacesRemoved: (rolledBack.interfaces ?? []).length === (project.interfaces ?? []).length,
    generatedViewsRemoved: (rolledBack.architectureViews ?? []).length === (project.architectureViews ?? []).length,
  };
} catch (error) {
  runtime.error = error instanceof Error ? error.message : String(error);
}

check('runtime.all-modelling-stages-preview', runtime.stagePlans.length === 4 && runtime.stagePlans.every((item) => item.eligible && item.nodes > 0 && item.edges > 0 && item.interfaces > 0 && item.views === 1 && item.obligations > 0 && item.canonicalChecksPassed), runtime.stagePlans, '4 eligible canvas-stage previews with canonical topology, interfaces, obligations and named view');
check('runtime.idempotent-application', runtime.idempotency && runtime.idempotency.duplicateSkips > 0 && runtime.idempotency.nodeCountStable && runtime.idempotency.edgeCountStable && runtime.idempotency.interfaceCountStable, runtime.idempotency, 'duplicate-safe repeated application');
check('runtime.safe-rollback', runtime.rollback && Object.values(runtime.rollback).every(Boolean), runtime.rollback, 'baseline restored');

const failures = checks.filter((item) => !item.passed);
const evidence = {
  releaseVersion: RELEASE_VERSION,
  knowledgeReleaseId: KNOWLEDGE_RELEASE_ID,
  runtime: path.basename(root),
  generatedAt: new Date().toISOString(),
  summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length },
  runtimeAcceptance: runtime,
  checks,
  limitations: [
    'The studio consumes the approved rc.10.55 knowledge release; it does not perform live repository refresh.',
    'External identity, durable queues, KMS signing, object storage and production connector acceptance remain rc.10.58 scope.',
    'Provider-specific deployment products remain overlays and cannot override the provider-neutral composition model.'
  ]
};
const outDir = path.join(root, 'generated/rc10-56');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'rc10_56-visual-composition-gate.json'), `${JSON.stringify(evidence, null, 2)}\n`);

if (failures.length > 0) {
  console.error(`FAIL rc.10.56 visual-composition gate (${failures.length}/${checks.length} failed)`);
  for (const failure of failures) console.error(`- ${failure.id}: expected ${JSON.stringify(failure.expected)}, got ${JSON.stringify(failure.actual)}`);
  process.exit(1);
}
console.log(`PASS rc.10.56 visual-composition gate (${checks.length}/${checks.length})`);
console.log(`Validated ${runtime.stagePlans.length} modelling-stage previews, duplicate-safe apply and exact rollback.`);
