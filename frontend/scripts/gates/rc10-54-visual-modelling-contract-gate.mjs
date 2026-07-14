import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const catalog = JSON.parse(read('data/sprint7_7-github-knowledge-catalog.json'));
const designLibrary = read('packages/domain/src/designLibrary.ts');
const governance = JSON.parse(read('data/sprint7_8-repository-governance-policies.json'));
const bridge = read('packages/domain/src/patternDnaVisualBridge.ts');
const canvas = read('apps/web/src/features/canvas/ProCanvasViewSystem.tsx');
const library = read('apps/web/src/components/ArchitectureLibrary.tsx');
const exportCode = read('apps/web/src/lib/diagramExport.ts');
const artifacts = read('packages/artifacts/src/index.ts');
const sections = read('packages/engine/src/sddSections.ts');
const scenario = read('apps/web/src/store/actions/applyScenarioTemplate.ts');
const interfaces = read('apps/web/src/features/canvas/InterfaceContractStudio.tsx');
const packageJson = JSON.parse(read('package.json'));
const discoveryRepos = new Set([
  'nilbuild/developer-roadmap',
  'ByteByteGoHq/system-design-101',
  'binhnguyennus/awesome-scalability',
  'ashishps1/awesome-system-design-resources',
]);
const connectors = catalog.connectors ?? [];
const connectorMap = new Map(connectors.map((connector) => [connector.repository, connector]));
const policyMap = new Map((governance.policies ?? []).map((policy) => [policy.repository, policy]));
const componentCount = (designLibrary.match(/^\s*component\(/gm) ?? []).length;
const topologyCount = (bridge.match(/"recordType": "template"/g) ?? []).length;
const discoveryCorrect = [...discoveryRepos].every((repository) => {
  const connector = connectorMap.get(repository);
  const policy = policyMap.get(repository);
  return connector && connector.lifecycleStatus === 'discovery-only' && connector.ingestionMode === 'discovery-only' && policy?.productionRecommendationAllowed === false;
});

const assertions = [
  ['release version is rc.10.54.0', packageJson.version === '0.10.0-rc.10.54.0'],
  ['source catalog contains 47 connectors', connectors.length === 47],
  ['four supplied learning repositories are discovery-only and non-scoring', discoveryCorrect],
  ['intelligence constitution exists', exists('packages/domain/src/intelligenceConstitution.ts')],
  ['visual catalogue exposes at least 80 governed component types', componentCount >= 80],
  ['Pattern DNA bridge exposes at least 20 topology templates', topologyCount >= 20],
  ['visual records carry knowledge-release provenance', designLibrary.includes("knowledgeReleaseId: record.knowledgeReleaseId ?? 'AKR-0.8.8'")],
  ['Pattern DNA visual bridge is consumed by design library', designLibrary.includes("import { patternDnaTopologyTemplates") && designLibrary.includes('...bridgedTemplates')],
  ['architecture library enforces mutation authority', library.includes('evaluateKnowledgeAuthority') && library.includes("requestedUse: 'mutate-model'")],
  ['architecture library is visible by default', canvas.includes('const [libraryOpen, setLibraryOpen] = useState(true)')],
  ['canvas editing is enabled by default', canvas.includes('useState(true);') && canvas.includes('canvasInteractionEnabled')],
  ['first-class interface studio exists', interfaces.includes('Interfaces and contracts') && interfaces.includes('upsertInterface')],
  ['architecture views persist through the store', canvas.includes('upsertArchitectureView') && canvas.includes('addArchitectureViewVersion')],
  ['real SVG, PNG and PDF diagram renderers exist', exportCode.includes('buildArchitectureSvg') && exportCode.includes('svgToPngBlob') && exportCode.includes('buildArchitecturePdf') && exportCode.includes('%PDF-1.4')],
  ['delivery pack includes model-derived SVG diagrams', artifacts.includes('architectureDiagramArtifacts(project)')],
  ['SDD embeds rendered architecture diagrams', sections.includes('logical-application-architecture.svg') && sections.includes('physical-deployment-architecture.svg')],
  ['scenario templates use deterministic placement', !scenario.includes('Math.random')],
  ['placeholder PDF manifest export is absent from active sources', !canvas.includes('.pdf-manifest.json') && !exportCode.includes('.pdf-manifest.json')],
];

const failed = assertions.filter(([, ok]) => !ok);
for (const [name, ok] of assertions) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) process.exit(1);
console.log(`rc.10.54 visual-modelling contract gate passed (${assertions.length}/${assertions.length}).`);
