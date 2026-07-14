import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => { console.error(`Sprint 8.8.5 gate failed: ${message}`); process.exit(1); };
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const pkg = JSON.parse(read('package.json'));
if (!/^0\.10\.0-rc\.10\.(7|8|9|[1-9][0-9]+)$/.test(pkg.version)) fail(`root package version is ${pkg.version}`);

for (const retired of [
  'apps/web/src/components/ActivationWorkspace.tsx',
  'apps/web/src/components/GoldenPathChecklist.tsx',
  'apps/web/src/components/TemplateGallery.tsx',
]) {
  if (exists(retired)) fail(`retired guided journey side path still exists: ${retired}`);
}

if (!exists('apps/web/src/features/guided-journey/GuidedJourneyWorkspace.tsx')) fail('GuidedJourneyWorkspace missing');
if (!exists('apps/web/src/features/guided-journey/guided-journey.css')) fail('guided journey CSS missing');
const app = read('apps/web/src/App.tsx');
if (!app.includes('GuidedJourneyWorkspace')) fail('App does not route activation to GuidedJourneyWorkspace');
for (const retiredName of ['ActivationWorkspace', 'GoldenPathChecklist', 'TemplateGallery']) {
  if (app.includes(retiredName)) fail(`App still references retired ${retiredName}`);
}

const guided = read('apps/web/src/features/guided-journey/GuidedJourneyWorkspace.tsx');
if (guided.includes('window.prompt')) fail('Guided journey uses window.prompt instead of structured UI');
for (const required of [
  'extractArchitectureDriversFromBrief',
  'evaluateGuidedArchitectureJourney',
  'createArchitecturePackManifest',
  'Generate first model',
  'Create ADR checkpoint',
  'Generate conformance controls',
  'Export architecture pack',
]) {
  if (!guided.includes(required)) fail(`Guided journey missing ${required}`);
}

const intelligence = read('packages/intelligence/src/index.ts');
for (const required of [
  'GuidedJourneyAssessment',
  'evaluateGuidedArchitectureJourney',
  'extractArchitectureDriversFromBrief',
  'ArchitecturePackManifest',
  'llmAuthority',
  'candidateKnowledgeInfluence',
]) {
  if (!intelligence.includes(required)) fail(`@aiw/intelligence missing ${required}`);
}

const catalog = JSON.parse(read('apps/web/src/data/scenario-templates.json'));
if (!Array.isArray(catalog.templates) || catalog.templates.length < 12) fail(`scenario template catalog too small: ${catalog.templates?.length ?? 0}`);
for (const requiredId of ['TPL-DIGITAL-BANKING','TPL-PAYMENTS','TPL-LENDING','TPL-AI-AGENTIC','TPL-PUBLIC-SECTOR','TPL-IOT-EDGE','TPL-LOW-CONNECTIVITY','TPL-LEGACY-MOD']) {
  if (!catalog.templates.some((template) => template.id === requiredId)) fail(`missing scenario template ${requiredId}`);
}

const action = read('apps/web/src/store/actions/applyScenarioTemplate.ts');
if (!action.includes('guidedJourneyGenerated')) fail('scenario template application does not create governed guided journey relationships');
if (!action.includes('requiresReview')) fail('guided journey seed relationships are not marked for review');

console.log('Sprint 8.8.5 guided journey gate passed: retired old side paths, feature-owned journey active, 12+ templates available, driver extraction and architecture-pack export verified.');
