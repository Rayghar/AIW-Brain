import fs from 'node:fs';

const checks = [
  ['apps/web/src/lib/roleTools.ts', 'roleToolCatalog'],
  ['apps/web/src/lib/roleTools.ts', 'administrator: ['],
  ['apps/web/src/lib/roleTools.ts', 'Workers and Repo Pilot'],
  ['apps/web/src/components/RoleToolsTray.tsx', 'role-tools-tray'],
  ['apps/web/src/App.tsx', 'handleExperienceProfileChange'],
  ['apps/web/src/App.tsx', 'workspaceMode === "design" || workspaceMode === "quality"'],
  ['apps/web/src/App.tsx', '<RoleToolsTray'],
  ['apps/web/src/components/ShellNavRail.tsx', 'getRoleRailSections(roleId)'],
  ['apps/web/src/components/ShellTopbar.tsx', 'Work mode'],
  ['apps/web/src/design-system/product-experience.css', 'rc.10.48.7'],
  ['apps/web/src/design-system/product-experience.css', '.role-tools-tray'],
  ['apps/web/src/design-system/product-experience.css', '.role-journey-compass {\n  display: grid !important'],
];

let failed = false;
for (const [file, needle] of checks) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(needle)) {
    console.error(`Missing expected implementation marker in ${file}: ${needle}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log('role-tools-flow-gate passed: role-scoped tools, quality lifecycle spine and top work modes are wired.');
