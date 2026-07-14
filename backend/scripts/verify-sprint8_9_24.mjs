import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const packageJson = JSON.parse(read('package.json'));
const app = read('apps/web/src/App.tsx');
const main = read('apps/web/src/main.tsx');
const inspector = read('apps/web/src/components/StudioInspector.tsx');
const harmonization = read('apps/web/src/rc10_41_harmonization.css');
const adminNavigation = read('apps/web/src/app/adminNavigation.ts');
const lifecycleRegistry = read('apps/web/src/app/lifecycleNavigation.ts');

assert(packageJson.version === '0.10.0-rc.10.42', `package.json version must be rc.10.42, found ${packageJson.version}`);
assert(main.includes("import './rc10_41_harmonization.css';"), 'main.tsx must import rc10_41_harmonization.css after the Concept 3 layer.');
assert(exists('apps/web/src/rc10_41_harmonization.css'), 'rc10_41_harmonization.css must exist.');

const requiredNavLabels = [
  'Project Cockpit',
  'Guided Journey',
  'Design lifecycle stages',
  'Quality Drivers',
  'Specialist Workspaces',
  'Admin & Knowledge Ops',
  'Mind Factory',
  'Knowledge Governance',
  'LLM Routes & API Keys',
  'GitHub Repos',
  'Workers',
  'Production Readiness',
];
for (const label of requiredNavLabels) assert(app.includes(label) || adminNavigation.includes(label) || lifecycleRegistry.includes(label), `Navigation/product flow missing: ${label}`);

for (const mode of ['cockpit','activation','admin','quality','portfolio','comparison','governance','collaboration','security','drift','conformance','operations','runtime','pilot','synthesis','patterns','knowledge']) {
  assert(app.includes(`workspaceMode === "${mode}"`) || app.includes(`workspaceMode === '${mode}'`) || app.includes(`value="${mode}"`) || app.includes(`'${mode}'`), `Workspace mode not represented in shell/router: ${mode}`);
}

assert(app.includes('activeAdminSection'), 'Admin navigation active-state must be state-driven, not inferred from non-reactive window.hash reads.');
assert(!app.includes('window.location.hash === `#admin'), 'App navigation must not use non-reactive direct hash comparison for active state.');
assert(app.includes('...adminNavigationEntries.map'), 'Command palette must expose admin/knowledge operations entries.');
assert(app.includes('Open Quality Drivers'), 'Command palette must expose Quality Drivers as part of the design journey.');
assert(app.includes('<WorkspaceErrorBoundary title={workspaceLabel(t, workspaceMode)}>'), 'Main workspace must be protected by a route-level error boundary.');
assert(app.includes('<WorkspaceErrorBoundary title="Studio Inspector">'), 'Studio Inspector must be protected by an error boundary.');
assert(app.includes('lifecycleNavigation.map'), 'Design lifecycle nav and top stepper must be generated from the canonical lifecycle navigation registry.');
assert(app.includes('entry.kind === \"workspace\" ? workspaceMode === entry.id'), 'Quality Drivers workspace must participate in lifecycle active-state logic.');

assert(inspector.includes('project?.nodes ?? []'), 'StudioInspector must safely default project nodes.');
assert(inspector.includes('contextual?.obligations ?? []'), 'StudioInspector must safely default obligations.');
assert(inspector.includes('leadingPattern.record?.name'), 'StudioInspector recommendation must guard missing record/name.');
assert(!/\.name\b/.test(inspector.replace(/record\?\.name/g, '')), 'StudioInspector should not contain unsafe .name reads.');

const requiredCssTokens = [
  '--aiw-shell-nav-width',
  '.app-nav',
  '.nav-stage-fragment',
  '.lifecycle-step-fragment',
  '.workspace-layout.with-inspector',
  '.studio-inspector',
  '.workspace-content table',
  '.aiw-bottom-status-rail',
  '@media (max-width: 1180px)',
];
for (const token of requiredCssTokens) assert(harmonization.includes(token), `Harmonization CSS missing ${token}`);
assert(!/font-size:\s*(?:[0-9](?:\.[0-9]+)?px|10(?:\.[0-9]+)?px)/.test(harmonization), 'rc10_41 harmonization layer must not introduce font sizes below 11px.');
assert(harmonization.includes('grid-template-columns: var(--aiw-shell-nav-width) minmax(0, 1fr) !important;'), 'Shell must force full logical navigation width.');

const acceptanceManifest = {
  release: '0.10.0-rc.10.42',
  sprint: '8.9.24',
  generatedAt: new Date().toISOString(),
  navigationModel: [
    'Project Cockpit',
    'Guided Journey',
    'Design Lifecycle: Brief → Quality Drivers → Logical Application → Application Realization → Logical Technology → Physical Technology → Review & Realize',
    'Specialist Workspaces',
    'Admin & Knowledge Ops',
  ],
  browserAcceptanceChecklist: [
    'Every left-nav item opens a workspace without a blank screen.',
    'The browser console contains no uncaught TypeError, hook-order warning, or DataCloneError during click-through.',
    'Quality Drivers appears as part of the lifecycle journey, not only as an advanced/specialist page.',
    'Admin deep links activate only the selected Admin & Knowledge Ops item.',
    'Studio Inspector has safe no-selection, missing-data and recommendation fallbacks.',
    'Tables, cards, inspector and bottom rail use the same readability and spacing rules.',
  ],
};
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'BROWSER_ACCEPTANCE_MANIFEST_v0.10.0-rc.10.42.json'), JSON.stringify(acceptanceManifest, null, 2));

if (failures.length) {
  console.error('Sprint 8.9.24 UX harmonization/browser-acceptance gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 8.9.24 UX harmonization/browser-acceptance static gate passed.');
console.log(`Acceptance manifest written to reports/BROWSER_ACCEPTANCE_MANIFEST_v0.10.0-rc.10.42.json`);
