import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [pkgRaw, kernel, store, visualMap, api, brief, quality, synthesis, patterns, governance, review] = await Promise.all([
  read('package.json'),
  read('packages/engine/src/intelligenceKernel.ts'),
  read('apps/web/src/store/workspaceStore.ts'),
  read('apps/web/src/components/WorkspaceIntelligenceMap.tsx'),
  read('apps/api/src/app.ts'),
  read('apps/web/src/components/DesignBriefStudio.tsx'),
  read('apps/web/src/components/QualityAttributeStudio.tsx'),
  read('apps/web/src/components/ArchitectureSynthesisWorkspace.tsx'),
  read('apps/web/src/components/PatternIntelligenceWorkspace.tsx'),
  read('apps/web/src/components/GovernanceWorkspace.tsx'),
  read('apps/web/src/components/ReviewWorkspace.tsx'),
]);
const pkg = JSON.parse(pkgRaw);
const migrated = [brief, quality, synthesis, patterns, governance, review];

const checks = [
  ['Sprint version is normalized', ['0.10.0-alpha.1', '0.10.0-alpha.2','0.10.0-alpha.3','0.10.0-alpha.4','0.10.0-rc.1','0.10.0-rc.2'].includes(pkg.version)],
  ['One kernel contract carries a visual model', /visualModel: IntelligenceVisualModel/.test(kernel) && /buildVisualIntelligenceModel/.test(kernel)],
  ['Visual projection is a node-and-relationship graph', /nodes: IntelligenceVisualNode\[\]/.test(kernel) && /edges: IntelligenceVisualEdge\[\]/.test(kernel)],
  ['Workspace entry is a semantic architecture event', /'workspace-entered'/.test(kernel) && /kind: 'workspace-entered'/.test(store)],
  ['Workspace context is explicit across the journey', /workspace: IntelligenceWorkspace/.test(kernel) && /intelligenceWorkspaceFor/.test(store)],
  ['Visual model is rendered with React Flow', /<ReactFlow/.test(visualMap) && /nodeTypes/.test(visualMap) && /MiniMap/.test(visualMap)],
  ['Visual maps expose objects, relationships, health and evidence', /<strong>\{nodes\.length\}<\/strong> objects/.test(visualMap) && /<strong>\{edges\.length\}<\/strong> relationships/.test(visualMap) && /Architecture health/.test(visualMap) && /knowledgeReleaseId/.test(visualMap)],
  ['Brief, quality, synthesis, patterns, governance and realization use the shared surface', migrated.every((source) => /FullJourneyIntelligenceSurface/.test(source))],
  ['Human approval remains mandatory', /Human approval remains required/.test(visualMap) && /humanApprovalRequired: true/.test(kernel)],
  ['Candidate knowledge stays outside production intelligence', /candidateKnowledgeUsed: false/.test(kernel)],
  ['API exposes the Sprint 8.7.1 release boundary', /api\/releases\/8\.7\.1/.test(api) && /AIW-0\.10\.0-alpha\.1/.test(api)],
  ['API declares visual modelling as primary', /interactive node-and-relationship graph/.test(api) && /Text is supporting metadata/.test(api)],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (ok) passed += 1;
}
console.log(`${passed}/${checks.length} Sprint 8.7.1 checks passed`);
if (passed !== checks.length) process.exit(1);
