import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [
  ['apps/web/src/components/ShellTopbar.tsx', 'topbar-actions-compact--menus', 'topbar groups actions into menus'],
  ['apps/web/src/components/ShellTopbar.tsx', 'topbar-menu--journey', 'journey menu exists'],
  ['apps/web/src/components/ShellTopbar.tsx', 'topbar-menu--brain', 'brain menu exists'],
  ['apps/web/src/components/ShellTopbar.tsx', 'topbar-menu--project', 'project menu exists'],
  ['apps/web/src/components/ShellOverlays.tsx', 'role-switch-table', 'compact role switch table exists'],
  ['apps/web/src/components/ShellOverlays.tsx', 'role-journey-definition-list', 'active journey definition list exists'],
  ['apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx', 'degradedReason', 'admin degraded/offline state is tracked'],
  ['apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx', 'admin-offline-state', 'friendly admin offline state is rendered'],
  ['apps/web/src/design-system/product-experience.css', 'rc.10.48.8', 'release-specific CSS marker exists'],
  ['apps/web/src/design-system/product-experience.css', '.role-switch-table', 'role overlay is styled as compact table'],
  ['apps/web/src/design-system/product-experience.css', '.admin-offline-state', 'admin offline state styling exists'],
];
let failed = false;
for (const [file, needle, label] of checks) {
  const content = read(file);
  if (!content.includes(needle)) {
    console.error(`FAIL ${label}: missing ${needle} in ${file}`);
    failed = true;
  } else {
    console.log(`PASS ${label}`);
  }
}
const topbar = read('apps/web/src/components/ShellTopbar.tsx');
const rawTopButtons = (topbar.match(/setCapabilityMapOpen\(true\)|setDecisionRadarOpen\(true\)|setRoleJourneyOpen\(true\)/g) ?? []).length;
if (rawTopButtons > 5) {
  console.error(`FAIL top action consolidation: too many direct top action calls (${rawTopButtons})`);
  failed = true;
} else {
  console.log('PASS top action consolidation is grouped');
}
if (failed) process.exit(1);
console.log('role-journey-topbar-admin-gate passed.');
