import { readFileSync } from 'node:fs';

const checks = [
  {
    file: 'apps/web/src/components/BottomDock.tsx',
    tokens: ['workbench-bottom-dock--status', 'dock-role-status', 'dock-brain-summary', 'Next: {nextLabel}'],
  },
  {
    file: 'apps/web/src/components/ShellTopbar.tsx',
    tokens: ['work-mode-coachmark', 'aiw.workModeCoachmark.dismissed', 'Work modes organize intent', 'Roles decide which tools are emphasized'],
  },
  {
    file: 'apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx',
    tokens: ['ADMIN_LOCAL_GUIDES', 'AdminLocalModePanel', 'admin-local-tab-guide', 'Model route local mode', 'Audit trail local mode'],
  },
  {
    file: 'apps/web/src/design-system/product-experience.css',
    tokens: ['rc.10.48.9', '.workbench-bottom-dock--status', '.work-mode-coachmark', '.admin-local-tab-guide'],
  },
];

let failed = false;
for (const check of checks) {
  const text = readFileSync(check.file, 'utf8');
  for (const token of check.tokens) {
    if (!text.includes(token)) {
      console.error(`[bottom-dock-workmode-admin-gate] Missing token ${JSON.stringify(token)} in ${check.file}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('[bottom-dock-workmode-admin-gate] Bottom dock, work mode coachmark and admin empty-state contracts verified.');
