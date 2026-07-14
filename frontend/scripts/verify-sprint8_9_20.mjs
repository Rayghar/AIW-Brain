import { readFileSync, existsSync } from 'node:fs';

const app = readFileSync('apps/web/src/App.tsx', 'utf8');
const css = readFileSync('apps/web/src/rc10_37_redesign.css', 'utf8');
const admin = readFileSync('apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx', 'utf8');
const archetypes = existsSync('apps/web/src/components/archetypes/AiwPageArchetypes.tsx');

const checks = [
  ['legacy Project Cockpit nav section', app.includes('nav-section-label">Project Cockpit')],
  ['legacy Design Lifecycle nav section', app.includes('nav-section-label">Design Lifecycle')],
  ['legacy Specialist Workspaces nav section', app.includes('nav-section-label">Specialist Workspaces')],
  ['Admin & Knowledge Ops nav section', app.includes('nav-section-label">Admin & Knowledge Ops')],
  ['no compact nav shell class in App', !app.includes('app-nav--compact') && !app.includes('compact-nav')],
  ['design lifecycle top stepper present', app.includes('design-lifecycle-topstepper')],
  ['bottom status rail present', app.includes('aiw-bottom-status-rail')],
  ['admin deep links from nav', app.includes('window.location.hash = `admin:${entry.adminTab}`')],
  ['admin hash-to-tab support', admin.includes('adminHashToTab') && admin.includes('hashchange')],
  ['archetype components exist', archetypes],
  ['rc10.37 css marker present', css.includes('Sprint 8.9.20 / rc.10.37')],
  ['rc10.37 css imported after base styles', readFileSync('apps/web/src/main.tsx', 'utf8').includes("./rc10_37_redesign.css")],
  ['expanded shell width is restored', css.includes('--aiw-rc37-nav-width: 312px')],
  ['three archetype css sections exist', css.includes('Concept 1: cockpit/executive') && css.includes('Concept 2: design studio') && css.includes('Concept 3: governance/admin')],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
}
if (failed.length) {
  console.error(`\nSprint 8.9.20 verification failed: ${failed.map(([name]) => name).join(', ')}`);
  process.exit(1);
}
console.log('\nSprint 8.9.20 verification passed.');
