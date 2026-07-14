import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const pkg = JSON.parse(read('package.json'));
check(pkg.version === '0.10.0-rc.10.42', 'root package version must be 0.10.0-rc.10.42');

if (exists('apps/web/package.json')) {
  const webPkg = JSON.parse(read('apps/web/package.json'));
  check(webPkg.version === '0.10.0-rc.10.42', 'web package version must be 0.10.0-rc.10.42');
}

const app = read('apps/web/src/App.tsx');
const adminNav = read('apps/web/src/app/adminNavigation.ts');
const admin = read('apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx');
const surfaces = read('apps/web/src/components/StudioSpecialistSurfaces.tsx');
const main = read('apps/web/src/main.tsx');

check(!app.includes('{ id: "quality", icon: SlidersHorizontal, group: "Specialist Workspaces" }'), 'Quality Drivers must not be duplicated in Specialist Workspaces');
check(app.includes('<option value="quality">Quality Drivers</option>'), 'Workspace jump must still expose Quality Drivers in lifecycle flow');
check(adminNav.includes("adminTab: 'workers'"), 'Workers must route to a dedicated workers admin tab');
check(!adminNav.includes("id: 'workers'") || !adminNav.includes("id: 'workers', label: 'Workers', caption: 'Heartbeats, queues and jobs', icon: Activity, workspace: 'admin', adminTab: 'production'"), 'Workers must not share the production admin tab');
check(adminNav.includes("adminTab: 'knowledgeGovernance'"), 'Knowledge Governance must route to dedicated governance admin tab');
check(admin.includes("type Tab = 'overview' | 'production'"), 'Admin tab union must remain explicit');
check(admin.includes("'knowledgeGovernance'"), 'Admin control plane must implement knowledge governance tab');
check(admin.includes("'workers'"), 'Admin control plane must implement workers tab');
check(admin.includes('Knowledge Governance — reviewer queue'), 'Knowledge Governance page must expose reviewer queue and release gates');
check(admin.includes('Workers — heartbeats, queues'), 'Workers page must expose heartbeat/queue/operator posture');
check(surfaces.includes('statusFilter'), 'StudioDataTable must include status filtering');
check(surfaces.includes('toggleSort'), 'StudioDataTable must include sort support');
check(surfaces.includes('Export CSV'), 'StudioDataTable must include CSV export');
check(main.includes("import './rc10_42_acceptance_hardening.css';"), 'rc.10.42 hardening CSS must be imported');
check(exists('apps/web/tests/aiw-browser-acceptance.spec.ts'), 'Browser acceptance Playwright spec must exist');

const reportDir = path.join(root, 'reports');
fs.mkdirSync(reportDir, { recursive: true });
const manifest = {
  version: '0.10.0-rc.10.42',
  generatedAt: new Date().toISOString(),
  checks: {
    qualityDriversDeduplicated: !app.includes('{ id: "quality", icon: SlidersHorizontal, group: "Specialist Workspaces" }'),
    dedicatedWorkersTab: adminNav.includes("adminTab: 'workers'"),
    dedicatedKnowledgeGovernanceTab: adminNav.includes("adminTab: 'knowledgeGovernance'"),
    tableSearchFilterSortExport: surfaces.includes('statusFilter') && surfaces.includes('toggleSort') && surfaces.includes('Export CSV'),
    browserAcceptanceSpec: exists('apps/web/tests/aiw-browser-acceptance.spec.ts'),
  },
  browserAcceptance: {
    runnableFrom: 'frontend/apps/web',
    command: 'npx playwright test tests/aiw-browser-acceptance.spec.ts',
    prerequisite: 'Run npm install -D @playwright/test && npx playwright install chromium if Playwright is not already installed in your local environment.'
  }
};
fs.writeFileSync(path.join(reportDir, 'BROWSER_ACCEPTANCE_MANIFEST_v0.10.0-rc.10.42.json'), JSON.stringify(manifest, null, 2));

if (failures.length) {
  console.error('Sprint 8.9.25 verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 8.9.25 verification passed.');
console.log(`Manifest written to ${path.relative(root, path.join(reportDir, 'BROWSER_ACCEPTANCE_MANIFEST_v0.10.0-rc.10.42.json'))}`);
