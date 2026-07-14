import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [
  ['apps/web/src/components/ShellNavRail.tsx', 'aiw.navDensity.v10_48_16', 'nav density preference'],
  ['apps/web/src/components/ShellNavRail.tsx', 'role-nav-density-toggle', 'role rail density toggle'],
  ['apps/web/src/components/PageObjectiveStrip.tsx', 'aiw.pageObjective.v10_48_16.collapsed', 'objective collapse preference'],
  ['apps/web/src/components/PageObjectiveStrip.tsx', 'page-objective-strip--collapsed', 'collapsed objective strip'],
  ['apps/web/src/components/ShellOverlays.tsx', 'capability-map-toolbar', 'capability map toolbar'],
  ['apps/web/src/components/ShellOverlays.tsx', 'featureUiRegistry', 'feature to UI registry surfaced'],
  ['apps/web/src/components/ShellOverlays.tsx', 'capabilityStatus', 'capability status filter'],
  ['apps/web/src/design-system/product-experience.css', 'rc.10.48.16', 'rc10.48.16 styling marker'],
  ['apps/web/src/design-system/product-experience.css', '.feature-ui-registry-surface', 'feature UI registry styling'],
  ['apps/web/src/design-system/product-experience.css', '.capability-map-grid--strengthened', 'strengthened capability map grid'],
];

let failed = false;
for (const [rel, needle, label] of checks) {
  const file = path.join(root, rel);
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (!text.includes(needle)) {
    console.error(`[navigation-density-capability-gate] Missing ${label}: ${rel} should include ${needle}`);
    failed = true;
  } else {
    console.log(`[navigation-density-capability-gate] OK ${label}`);
  }
}

if (failed) process.exit(1);
