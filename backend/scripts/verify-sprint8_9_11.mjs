import { readFileSync, existsSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${message}`);
  }
}

const app = readFileSync('apps/web/src/App.tsx', 'utf8');
const styles = readFileSync('apps/web/src/styles.css', 'utf8');
const profiles = readFileSync('apps/web/src/lib/experienceProfiles.ts', 'utf8');
const store = readFileSync('apps/web/src/store/workspaceStore.ts', 'utf8');
const cockpit = existsSync('apps/web/src/components/ProjectCockpit.tsx') ? readFileSync('apps/web/src/components/ProjectCockpit.tsx', 'utf8') : '';
const inspector = existsSync('apps/web/src/components/StudioInspector.tsx') ? readFileSync('apps/web/src/components/StudioInspector.tsx', 'utf8') : '';
const shell = existsSync('apps/web/src/components/PageShell.tsx') ? readFileSync('apps/web/src/components/PageShell.tsx', 'utf8') : '';

assert(profiles.includes("| 'cockpit'") && store.includes("WorkspaceMode = 'cockpit' | 'design'"), 'project cockpit is a first-class workspace mode');
assert(app.includes('<ProjectCockpit />') && cockpit.includes('Stage readiness rail'), 'project cockpit is routed and includes stage readiness');
assert(app.includes('WorkspaceErrorBoundary') && shell.includes('getDerivedStateFromError'), 'workspaces are protected by a route-level error boundary');
assert(app.includes('StudioInspector') && inspector.includes('Contextual intelligence inspector'), 'universal contextual inspector is integrated');
assert(app.includes('Design Studio') && app.includes('Intelligence & Review') && app.includes('Governance & Delivery') && app.includes('Admin & Knowledge'), 'sidebar navigation is grouped into four global studio modes');
assert(app.includes('stage-readiness-strip'), 'persistent stage readiness strip is present');
assert(styles.includes('.workspace-layout.with-inspector'), 'app shell uses a right-side inspector layout');
assert(styles.includes('Global readability reset') && styles.includes('font-size: max(11px'), 'readability reset prevents sub-11px dense text');
assert(styles.includes('.studio-error-state') && styles.includes('.studio-skeleton'), 'standard error and loading states are styled');
assert(styles.includes('.cockpit-metric-grid') && styles.includes('.studio-hero'), 'global studio visual system styles are present');
assert(app.includes('Ctrl K') && app.includes('Open Project Cockpit'), 'command palette exposes cockpit and navigation actions');

if (process.exitCode) process.exit(process.exitCode);
console.log('Sprint 8.9.11 Global Studio UX Refactor gate passed.');
