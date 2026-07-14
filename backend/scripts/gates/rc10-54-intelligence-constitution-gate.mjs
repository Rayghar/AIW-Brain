import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const packageJson = JSON.parse(read('package.json'));
const constitution = read('packages/domain/src/intelligenceConstitution.ts');
const designLibrary = read('packages/domain/src/designLibrary.ts');
const bridge = read('packages/domain/src/patternDnaVisualBridge.ts');
const artifacts = read('packages/artifacts/src/index.ts');
const sections = read('packages/engine/src/sddSections.ts');
const catalog = JSON.parse(read('data/sprint7_7-github-knowledge-catalog.json'));
const governance = JSON.parse(read('data/sprint7_8-repository-governance-policies.json'));
const connectors = catalog.connectors ?? [];
const requiredRepos = [
  'nilbuild/developer-roadmap',
  'ByteByteGoHq/system-design-101',
  'binhnguyennus/awesome-scalability',
  'ashishps1/awesome-system-design-resources',
];
const authorityRulesPresent =
  constitution.includes('discovery: {') &&
  constitution.includes("'approved-production': {") &&
  constitution.includes("'mutate-model'") &&
  constitution.includes('approvedBy');
const suppliedSourcesGoverned = requiredRepos.every((repository) => {
  const connector = connectors.find((entry) => entry.repository === repository);
  const policy = (governance.policies ?? []).find((entry) => entry.repository === repository);
  return connector?.lifecycleStatus === 'discovery-only' && connector?.ingestionMode === 'discovery-only' && policy?.productionRecommendationAllowed === false;
});

const assertions = [
  ['release version is rc.10.54.0', packageJson.version === '0.10.0-rc.10.54.0'],
  ['intelligence constitution module exists', exists('packages/domain/src/intelligenceConstitution.ts')],
  ['constitution defines discovery and production authority', authorityRulesPresent],
  ['production knowledge requires release, evidence and named approver', constitution.includes('requires a pinned immutable knowledge release') && constitution.includes('require claim-level evidence') && constitution.includes('requires a named independent human approver')],
  ['all four supplied learning repositories are non-scoring discovery sources', suppliedSourcesGoverned],
  ['Pattern DNA visual bridge exists and contains topology records', exists('packages/domain/src/patternDnaVisualBridge.ts') && (bridge.match(/"recordType": "template"/g) ?? []).length >= 20],
  ['design library consumes the Pattern DNA bridge', designLibrary.includes('patternDnaTopologyTemplates')],
  ['visual records include production authority and provenance', designLibrary.includes("authorityState: record.approvalStatus === 'deprecated' ? 'deprecated' : 'approved-production'") && designLibrary.includes("knowledgeReleaseId: record.knowledgeReleaseId ?? 'AKR-0.8.8'")],
  ['delivery pack emits model-derived architecture diagrams', artifacts.includes('architectureDiagramArtifacts(project)')],
  ['SDD embeds logical-to-deployment diagrams', sections.includes('logical-application-architecture.svg') && sections.includes('physical-deployment-architecture.svg')],
  ['first-class interface register is included', artifacts.includes('interfaceRegisterCsv(project)')],
];

const failed = assertions.filter(([, ok]) => !ok);
for (const [name, ok] of assertions) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) process.exit(1);
console.log(`rc.10.54 intelligence-constitution gate passed (${assertions.length}/${assertions.length}).`);
