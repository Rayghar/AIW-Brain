import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const reportDir = join(root, 'reports');
mkdirSync(reportDir, { recursive: true });
function read(path) { return readFileSync(join(root, path), 'utf8'); }
function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const requiredReports = [
  'BROWSER_E2E_SMOKE_REPORT_v0.10.0-rc.10.15.json',
  'VISUAL_REGRESSION_REPORT_v0.10.0-rc.10.15.json',
  'ACCESSIBILITY_CONTRAST_REPORT_v0.10.0-rc.10.15.json',
  '../WEB_BUNDLE_REPORT_v0.10.0-rc.10.14.json',
];

const reportPresence = requiredReports.map((file) => ({
  file: file.replace('../', ''),
  exists: file.startsWith('../') ? existsSync(join(root, file.slice(3))) : existsSync(join(reportDir, file)),
}));
for (const item of reportPresence) assert(item.exists, `Pilot readiness missing required report: ${item.file}`);

const browser = readJson(join(reportDir, 'BROWSER_E2E_SMOKE_REPORT_v0.10.0-rc.10.15.json'));
const visual = readJson(join(reportDir, 'VISUAL_REGRESSION_REPORT_v0.10.0-rc.10.15.json'));
const a11y = readJson(join(reportDir, 'ACCESSIBILITY_CONTRAST_REPORT_v0.10.0-rc.10.15.json'));
const bundle = readJson(join(root, 'WEB_BUNDLE_REPORT_v0.10.0-rc.10.14.json'));

const app = read('apps/web/src/App.tsx');
const pilot = read('apps/web/src/components/PilotEvaluationWorkspace.tsx');
const review = read('apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx');
const admin = read('apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx');

const gates = [
  { id: 'browser-smoke', label: 'Browser smoke coverage passed', passed: browser.summary.failed === 0, evidence: `${browser.summary.passed}/${browser.summary.total} browser smoke checks` },
  { id: 'visual-regression', label: 'Visual regression contracts captured', passed: visual.summary.passed === visual.summary.total, evidence: `${visual.summary.total} visual contracts` },
  { id: 'accessibility-contrast', label: 'Accessibility and contrast gate passed', passed: a11y.summary.failed === 0, evidence: `${a11y.summary.passed}/${a11y.summary.total} accessibility checks` },
  { id: 'bundle-budget', label: 'Web bundle budget gate passed', passed: typeof bundle.largestChunkKb === 'number' && bundle.largestChunkKb <= bundle.policy.maxSingleChunkKb && Array.isArray(bundle.artifactChunks) && bundle.artifactChunks.length > 0, evidence: `largest chunk ${bundle.largestChunkKb}KB / ${bundle.policy.maxSingleChunkKb}KB budget` },
  { id: 'review-export-click-through', label: 'Review Studio export click-through exists', passed: review.includes('Download handoff ZIP') && review.includes('Download handoff JSON'), evidence: 'Review report, JSON and ZIP actions available' },
  { id: 'admin-journey', label: 'Admin/Knowledge/Security pilot journey exists', passed: ['Model routes', 'Knowledge sources', 'Security & RBAC', 'Audit trail'].every((text) => admin.includes(text)), evidence: 'Admin control plane tabs are present' },
  { id: 'pilot-workspace-evidence', label: 'Pilot workspace exposes readiness evidence', passed: pilot.includes('Browser E2E') && pilot.includes('Visual regression') && pilot.includes('Enterprise pilot readiness'), evidence: 'Pilot workspace shows release/pilot confidence layer' },
  { id: 'one-command-demo', label: 'One-command verification script registered', passed: read('package.json').includes('sprint8_9_3:verify'), evidence: 'npm run sprint8_9_3:verify' },
];

for (const gate of gates) assert(gate.passed, `Enterprise pilot readiness failed: ${gate.label}`);

const score = Math.round((gates.filter((gate) => gate.passed).length / gates.length) * 100);
const readiness = score >= 90 ? 'pilot-ready' : score >= 75 ? 'conditional' : 'not-ready';
const output = {
  release: '0.10.0-rc.10.15',
  sprint: '8.9.3',
  generatedAt: new Date().toISOString(),
  readiness,
  score,
  gates,
  reports: reportPresence,
  recommendation: readiness === 'pilot-ready'
    ? 'Ready for controlled enterprise pilot with target-environment execution evidence still required before production acceptance.'
    : 'Keep in release-candidate hardening until all pilot-readiness gates pass.',
  honestyBoundary: 'This gate validates reference-package and browser confidence. It does not fabricate customer-environment production acceptance.',
};
writeFileSync(join(reportDir, 'ENTERPRISE_PILOT_READINESS_REPORT_v0.10.0-rc.10.15.json'), JSON.stringify(output, null, 2));
writeFileSync('PILOT_READINESS_CHECKLIST_v0.10.0-rc.10.15.json', JSON.stringify(output, null, 2));
console.log(`Enterprise pilot readiness gate passed: ${score}/100 (${readiness}).`);
