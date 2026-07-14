import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, '..');
const releaseRoot = resolve(backendRoot, '..');
const args = process.argv.slice(2);
const baselineIndex = args.indexOf('--baseline');
const baselineRoot = baselineIndex >= 0 && args[baselineIndex + 1] ? resolve(args[baselineIndex + 1]) : null;
const outputJson = resolve(releaseRoot, 'AIW_RC10_71_1_INTELLIGENCE_AUTHORITY_AUDIT.json');
const outputMd = resolve(releaseRoot, 'AIW_RC10_71_1_INTELLIGENCE_AUTHORITY_AUDIT.md');

function walk(root, predicate = () => true) {
  const values = [];
  if (!existsSync(root)) return values;
  const visit = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (['node_modules', 'dist', 'test-results', 'playwright-report', '.git'].includes(entry)) continue;
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) visit(full);
      else if (predicate(full)) values.push(full);
    }
  };
  visit(root);
  return values;
}

function occurrences(text, regex) {
  return [...text.matchAll(regex)].map((match) => ({ index: match.index ?? 0, value: match[0] }));
}

const allowedDirectLlm = [
  { pattern: /apps\/api\/src\/routes\/healthRoutes\.ts$/, category: 'operational-control', reason: 'Provider health and active probe only.' },
  { pattern: /apps\/api\/src\/server\.ts$/, category: 'operational-control', reason: 'Startup/runtime acceptance probe only.' },
  { pattern: /apps\/api\/src\/routes\/knowledgeOpsRoutes\.ts$/, category: 'knowledge-supply-chain', reason: 'Creates candidate knowledge records; no project architecture mutation.' },
  { pattern: /apps\/api\/src\/platformKnowledgeApplicationRoutes\.ts$/, category: 'knowledge-supply-chain', reason: 'Knowledge extraction, review and promotion assistance.' },
  { pattern: /apps\/api\/src\/knowledgeExtraction\.ts$/, category: 'knowledge-supply-chain', reason: 'Mind Factory extraction adapter.' },
  { pattern: /apps\/api\/src\/llmRuntimeStore\.ts$/, category: 'platform-infrastructure', reason: 'Constructs governed provider gateway; does not perform a task.' },
  { pattern: /apps\/api\/src\/architectureBrainOrchestrator\.ts$/, category: 'architecture-runtime', reason: 'The single project Architecture Brain gateway owner.' },
];

const architectureRouteFiles = new Set([
  'backend/apps/api/src/requirementsGenesisApplicationRoutes.ts',
  'backend/apps/api/src/livingCanvasApplicationRoutes.ts',
  'backend/apps/api/src/projectIdentityApplicationRoutes.ts',
  'backend/apps/api/src/synthesisApplicationRoutes.ts',
  'backend/apps/api/src/architectureBrainApplicationRoutes.ts',
]);

const bannedFrontendSymbols = [
  'recommendArchitectureStyles',
  'recommendInContext',
  'evaluateArchitectureEvent',
  'runDeterministicAudit',
  'orchestrateDeterministicDesignActions',
  'distillRequirementsDeterministically',
  'mergeRequirementsProposal',
  'synthesizeArchitectureAlternatives',
  'runArchitectureSimulationSuite',
  'applyArchitectureAlternative',
];

const retiredSignalModules = [
  'frontend/packages/brain-runtime/src/brainSignalEngine.ts',
  'frontend/packages/brain-runtime/src/driverWeightSignals.ts',
  'frontend/packages/brain-runtime/src/interfaceCritiqueSignals.ts',
  'frontend/packages/brain-runtime/src/llmTaskContracts.ts',
  'frontend/packages/brain-runtime/src/mindFactorySignals.ts',
  'frontend/packages/brain-runtime/src/patternObligationSignals.ts',
  'frontend/packages/brain-runtime/src/signalFactory.ts',
  'frontend/packages/brain-runtime/src/styleConstraintSignals.ts',
];

function analyse(root) {
  const backendFiles = walk(resolve(root, 'backend/apps/api/src'), (file) => file.endsWith('.ts'));
  const frontendFiles = walk(resolve(root, 'frontend/apps/web/src'), (file) => /\.(ts|tsx)$/.test(file));
  const llmUses = [];
  for (const file of backendFiles) {
    const body = readFileSync(file, 'utf8');
    const hits = occurrences(body, /llmRuntimeConfigurations\.gateway\s*\(|new\s+LlmGateway\s*\(/g);
    if (!hits.length) continue;
    const rel = relative(root, file).replaceAll('\\', '/');
    const allowed = allowedDirectLlm.find((item) => item.pattern.test(rel));
    llmUses.push({ file: rel, count: hits.length, category: allowed?.category ?? 'unknown', allowed: Boolean(allowed), reason: allowed?.reason ?? 'Unclassified direct LLM gateway use.' });
  }

  const frontendLocalLogic = [];
  for (const file of frontendFiles) {
    const body = readFileSync(file, 'utf8');
    const symbols = bannedFrontendSymbols.filter((symbol) => new RegExp(`\\b${symbol}\\b`).test(body));
    if (symbols.length) frontendLocalLogic.push({ file: relative(root, file).replaceAll('\\', '/'), symbols });
  }

  const routeDirectLlm = llmUses.filter((item) => architectureRouteFiles.has(item.file));
  const brainOrchestrator = resolve(root, 'backend/apps/api/src/architectureBrainOrchestrator.ts');
  const brainBody = existsSync(brainOrchestrator) ? readFileSync(brainOrchestrator, 'utf8') : '';
  const architectureTaskMethods = [
    'workspaceProjection', 'analyseBrief', 'distillRequirements',
    'systemContextCandidate', 'stageCoAuthor', 'livingCanvasActions',
    'explainRanking', 'stageAdvice', 'askSol', 'synthesize', 'assistedAudit',
  ];
  const orchestratedMethods = architectureTaskMethods.filter((name) =>
    new RegExp(`\\n\\s*(?:async\\s+)?${name}\\s*\\(`).test(brainBody),
  );
  const receiptReferences = [...backendFiles, ...frontendFiles].reduce((sum, file) => sum + occurrences(readFileSync(file, 'utf8'), /brainReceipt/g).length, 0);
  const contextGraphPath = resolve(root, 'backend/packages/engine/src/architectureContextGraph.ts');
  const contextGraphBody = existsSync(contextGraphPath) ? readFileSync(contextGraphPath, 'utf8') : '';
  const domainGraphPath = resolve(root, 'backend/packages/domain/src/architectureContextGraph.ts');
  const domainGraphBody = existsSync(domainGraphPath) ? readFileSync(domainGraphPath, 'utf8') : '';
  const nodeKinds = domainGraphBody.match(/architectureContextGraphNodeKinds\s*=\s*\[([\s\S]*?)\]\s+as const/)?.[1]?.match(/'[^']+'/g)?.length ?? 0;
  const edgeKinds = domainGraphBody.match(/architectureContextGraphEdgeKinds\s*=\s*\[([\s\S]*?)\]\s+as const/)?.[1]?.match(/'[^']+'/g)?.length ?? 0;
  const migrationPath = resolve(root, 'backend/packages/engine/src/requirementsGenesis.ts');
  const migrationBody = existsSync(migrationPath) ? readFileSync(migrationPath, 'utf8') : '';

  return {
    directLlmUses: llmUses,
    unclassifiedDirectLlmUses: llmUses.filter((item) => !item.allowed),
    architectureRouteDirectLlmUses: routeDirectLlm,
    frontendLocalArchitectureLogic: frontendLocalLogic,
    retiredSignalModulesStillPresent: retiredSignalModules.filter((item) => existsSync(resolve(root, item))),
    orchestratorPresent: existsSync(brainOrchestrator),
    orchestratedMethods,
    brainReceiptReferenceCount: receiptReferences,
    contextGraph: {
      present: existsSync(contextGraphPath) && existsSync(domainGraphPath),
      nodeKindCount: nodeKinds,
      edgeKindCount: edgeKinds,
      semanticChangeDetection: contextGraphBody.includes('detectArchitectureSemanticChanges'),
      semanticStaleness: contextGraphBody.includes('applyArchitectureSemanticStaleness'),
      stageSlices: contextGraphBody.includes('stageSlices'),
    },
    legacyMigration: {
      present: migrationBody.includes('migrateLegacyRequirementsProject'),
      canonicalAuthorityReceipt: migrationBody.includes("canonicalAuthority: 'requirements-intelligence'"),
      legacyProjectionExplicit: migrationBody.includes('legacyFieldsRetainedAsProjection: true'),
    },
  };
}

function compareSharedSourceParity(root) {
  // Only compare the rc.10.71.1 contracts intentionally mirrored into the
  // browser workspace. Backend-only adapters and platform types are allowed to
  // differ; broad directory parity previously produced false positives.
  const mirrored = [
    ['backend/packages/domain/src/architectureBrain.ts', 'frontend/packages/domain/src/architectureBrain.ts'],
    ['backend/packages/domain/src/architectureContextGraph.ts', 'frontend/packages/domain/src/architectureContextGraph.ts'],
    ['backend/packages/domain/src/requirementsGenesis.ts', 'frontend/packages/domain/src/requirementsGenesis.ts'],
    ['backend/packages/domain/src/generativeCursor.ts', 'frontend/packages/domain/src/generativeCursor.ts'],
    ['backend/packages/domain/src/release.ts', 'frontend/packages/domain/src/release.ts'],
    ['backend/packages/engine/src/architectureContextGraph.ts', 'frontend/packages/engine/src/architectureContextGraph.ts'],
    ['backend/packages/engine/src/requirementsGenesis.ts', 'frontend/packages/engine/src/requirementsGenesis.ts'],
    ['backend/packages/intelligence/src/orchestrator/index.ts', 'frontend/packages/intelligence/src/orchestrator/index.ts'],
  ];
  const differences = [];
  for (const [leftRel, rightRel] of mirrored) {
    const left = resolve(root, leftRel);
    const right = resolve(root, rightRel);
    if (!existsSync(left)) differences.push({ pair: `${leftRel} ↔ ${rightRel}`, file: leftRel, issue: 'missing-backend-source' });
    else if (!existsSync(right)) differences.push({ pair: `${leftRel} ↔ ${rightRel}`, file: rightRel, issue: 'missing-frontend-copy' });
    else if (readFileSync(left, 'utf8') !== readFileSync(right, 'utf8')) differences.push({ pair: `${leftRel} ↔ ${rightRel}`, file: leftRel, issue: 'content-drift' });
  }
  return { checkedPairs: mirrored.length, differences, exactParity: differences.length === 0 };
}

const current = analyse(releaseRoot);
const baseline = baselineRoot && existsSync(baselineRoot) ? analyse(baselineRoot) : null;
const parity = compareSharedSourceParity(releaseRoot);
const acceptance = {
  oneArchitectureGatewayOwner: current.unclassifiedDirectLlmUses.length === 0 && current.architectureRouteDirectLlmUses.length === 0,
  browserProjectionOnly: current.frontendLocalArchitectureLogic.length === 0,
  legacySignalEnginesRetired: current.retiredSignalModulesStillPresent.length === 0,
  typedContextGraph: current.contextGraph.present && current.contextGraph.nodeKindCount >= 10 && current.contextGraph.edgeKindCount >= 10,
  semanticStaleness: current.contextGraph.semanticChangeDetection && current.contextGraph.semanticStaleness,
  legacyMigrationControlled: current.legacyMigration.present && current.legacyMigration.canonicalAuthorityReceipt,
  sharedPackageParity: parity.exactParity,
};
const passed = Object.values(acceptance).filter(Boolean).length;
const report = {
  schemaVersion: '1.0',
  release: '0.10.0-rc.10.72.0',
  generatedAt: new Date().toISOString(),
  controllingPrinciple: 'One Brain, one canonical model, one governed knowledge manifest, one proposal receipt and many interaction surfaces.',
  current,
  baseline,
  parity,
  acceptance,
  summary: { passed, total: Object.keys(acceptance).length, status: passed === Object.keys(acceptance).length ? 'pass' : 'fail' },
};
writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);

const baselineRows = baseline ? [
  ['Architecture runtime direct gateway uses', baseline.architectureRouteDirectLlmUses.reduce((sum, item) => sum + item.count, 0), current.architectureRouteDirectLlmUses.reduce((sum, item) => sum + item.count, 0)],
  ['Frontend local architecture-logic files', baseline.frontendLocalArchitectureLogic.length, current.frontendLocalArchitectureLogic.length],
  ['Legacy Brain Signal modules present', baseline.retiredSignalModulesStillPresent.length, current.retiredSignalModulesStillPresent.length],
  ['Orchestrated Brain methods', baseline.orchestratedMethods.length, current.orchestratedMethods.length],
  ['Brain receipt references', baseline.brainReceiptReferenceCount, current.brainReceiptReferenceCount],
  ['Context Graph node kinds', baseline.contextGraph.nodeKindCount, current.contextGraph.nodeKindCount],
  ['Context Graph edge kinds', baseline.contextGraph.edgeKindCount, current.contextGraph.edgeKindCount],
] : [];

const md = `# AIW rc.10.71.1 Intelligence Authority Audit\n\nGenerated: ${report.generatedAt}\n\n## Controlling principle\n\n> ${report.controllingPrinciple}\n\n## Acceptance\n\n| Check | Result |\n|---|---|\n${Object.entries(acceptance).map(([name, ok]) => `| ${name} | ${ok ? 'PASS' : 'FAIL'} |`).join('\n')}\n\n**Result: ${passed}/${Object.keys(acceptance).length} passed.**\n\n## Baseline comparison\n\n${baselineRows.length ? `| Measure | rc.10.71.0 | rc.10.71.1 |\n|---|---:|---:|\n${baselineRows.map(([name, before, after]) => `| ${name} | ${before} | ${after} |`).join('\n')}` : 'A baseline path was not supplied for this run.'}\n\n## Direct LLM gateway inventory\n\n| File | Uses | Category | Allowed | Reason |\n|---|---:|---|---|---|\n${current.directLlmUses.map((item) => `| \`${item.file}\` | ${item.count} | ${item.category} | ${item.allowed ? 'Yes' : 'No'} | ${item.reason} |`).join('\n') || '| None | 0 | — | — | — |'}\n\nArchitecture-runtime route files contain **${current.architectureRouteDirectLlmUses.length}** direct gateway path(s). All project design reasoning is required to enter through the AIW Brain Orchestrator. Mind Factory and operational probes remain isolated by design.\n\n## Frontend authority\n\n- Local architecture-logic files: **${current.frontendLocalArchitectureLogic.length}**\n- Retired Brain Signal modules still present: **${current.retiredSignalModulesStillPresent.length}**\n- Shared source parity: **${parity.exactParity ? 'exact' : 'drift detected'}**\n\nThe frontend collects gestures, synchronises the canonical project, requests governed proposals and renders receipts. It does not own a competing architecture recommendation engine.\n\n## Architecture Context Graph\n\n- Typed node kinds: **${current.contextGraph.nodeKindCount}**\n- Typed edge kinds: **${current.contextGraph.edgeKindCount}**\n- Stage slices: **${current.contextGraph.stageSlices ? 'present' : 'missing'}**\n- Semantic change detection: **${current.contextGraph.semanticChangeDetection ? 'present' : 'missing'}**\n- Downstream semantic staleness: **${current.contextGraph.semanticStaleness ? 'present' : 'missing'}**\n\n## Honest boundary\n\nThis audit verifies code-path consolidation, proposal receipts, browser authority removal, typed context lineage and semantic staleness. It does not constitute enterprise KMS signature acceptance, managed identity acceptance, independent expert outcome validation or completion of the full 396-requirement programme matrix.\n`;
writeFileSync(outputMd, md);
console.log(`Authority audit written to ${relative(process.cwd(), outputJson)} and ${relative(process.cwd(), outputMd)}`);
console.log(`Acceptance: ${passed}/${Object.keys(acceptance).length} passed`);
if (report.summary.status !== 'pass') process.exitCode = 1;
