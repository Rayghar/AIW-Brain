import fs from 'node:fs';

const checks = [
  ['apps/web/src/components/FirstRunTour.tsx', 'aiw.firstRunTour.v10_48_10.dismissed', 'first-run tour persistence'],
  ['apps/web/src/components/FirstRunTour.tsx', 'aiw:start-first-run-tour', 'restartable first-run tour event'],
  ['apps/web/src/components/BottomDock.tsx', 'aiw.bottomDock.v10_48_10.minimized', 'bottom dock minimized persistence'],
  ['apps/web/src/components/BottomDock.tsx', 'workbench-bottom-dock--minimized', 'minimized bottom dock layout'],
  ['apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx', 'ADMIN_DEMO_SEED', 'admin demo seed model'],
  ['apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx', 'Load demo seed', 'admin demo seed action'],
  ['apps/web/src/design-system/product-experience.css', '.first-run-tour', 'first-run tour styling'],
  ['apps/web/src/design-system/product-experience.css', '.workbench-bottom-dock--minimized', 'minimized dock styling'],
];

let failed = false;
for (const [file, needle, label] of checks) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (!text.includes(needle)) {
    console.error(`FAIL: missing ${label} (${needle}) in ${file}`);
    failed = true;
  } else {
    console.log(`OK: ${label}`);
  }
}
if (failed) process.exit(1);
console.log('First-run tour, minimized dock and admin seed gate passed.');
