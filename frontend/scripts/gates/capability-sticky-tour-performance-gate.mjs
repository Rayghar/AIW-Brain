#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [
  ['apps/web/src/components/ShellOverlays.tsx', 'capability-map-sticky-nav', 'sticky capability map navigation'],
  ['apps/web/src/components/ShellOverlays.tsx', 'capability-lane-${lane.toLowerCase()}', 'capability lane anchors'],
  ['apps/web/src/components/ShellOverlays.tsx', 'feature-ui-registry', 'feature registry anchor'],
  ['apps/web/src/components/FirstRunTour.tsx', 'anchorSelector', 'anchored tour selectors'],
  ['apps/web/src/components/FirstRunTour.tsx', 'first-run-tour-anchor-ring', 'tour target highlight ring'],
  ['apps/web/src/components/ShellTopbar.tsx', 'data-aiw-tour="work-modes"', 'work-mode tour anchor'],
  ['apps/web/src/components/ShellTopbar.tsx', 'data-aiw-tour="brain-menu"', 'brain menu tour anchor'],
  ['apps/web/src/components/ShellNavRail.tsx', 'data-aiw-tour="lifecycle-rail"', 'role rail tour anchor'],
  ['apps/web/src/components/RoleToolsTray.tsx', 'data-aiw-tour="role-tools"', 'role tools tour anchor'],
  ['apps/web/src/App.tsx', 'lazy(() => import("./components/WorkspaceRouter")', 'workspace router lazy split'],
  ['apps/web/src/App.tsx', 'lazy(() => import("./components/ShellOverlays")', 'overlay lazy split'],
  ['apps/web/src/App.tsx', 'Suspense fallback={<div className="lazy-workspace-skeleton"', 'lazy workspace fallback'],
  ['apps/web/src/design-system/product-experience.css', '.capability-map-sticky-nav', 'sticky map nav styles'],
  ['apps/web/src/design-system/product-experience.css', '.first-run-tour--anchored', 'anchored tour styles'],
  ['apps/web/src/design-system/product-experience.css', '.lazy-workspace-skeleton', 'lazy split fallback styles'],
];

let failures = 0;
for (const [file, needle, label] of checks) {
  const full = path.join(root, file);
  const text = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  if (!text.includes(needle)) {
    console.error(`✗ Missing ${label}: ${file} must include ${needle}`);
    failures += 1;
  } else {
    console.log(`✓ ${label}`);
  }
}
if (failures) process.exit(1);
console.log('rc.10.48.17 capability sticky navigation, anchored tour and performance split gate passed.');
