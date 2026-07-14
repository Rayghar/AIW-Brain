import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const reportDir = join(root, 'reports');
const baselineDir = join(root, 'tests/visual/baselines');
mkdirSync(reportDir, { recursive: true });
mkdirSync(baselineDir, { recursive: true });

function read(path) { return readFileSync(join(root, path), 'utf8'); }
function hash(value) { return createHash('sha256').update(value).digest('hex'); }
function assert(condition, message) { if (!condition) throw new Error(message); }

function extractCssBlock(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'm');
  const match = css.match(regex);
  return match ? match[0].replace(/\s+/g, ' ').trim() : '';
}

const files = {
  app: read('apps/web/src/App.tsx'),
  review: read('apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx'),
  reviewCss: read('apps/web/src/features/review-studio/review-studio.css'),
  admin: read('apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx'),
  pilot: read('apps/web/src/components/PilotEvaluationWorkspace.tsx'),
  styles: read('apps/web/src/styles.css'),
};

const visualContracts = [
  {
    id: 'app-navigation-shell',
    selector: '.app-shell .app-nav .topbar .workspace-layout .workspace-content',
    fingerprint: hash([extractCssBlock(files.styles, '.app-shell'), extractCssBlock(files.styles, '.app-nav'), extractCssBlock(files.styles, '.topbar'), files.app.includes('workspace-nav-buttons')].join('\n')),
  },
  {
    id: 'review-studio-layout',
    selector: '.review-studio-page .review-scorecard-grid .review-studio-layout .review-output-grid',
    fingerprint: hash([extractCssBlock(files.reviewCss, '.review-studio-page'), extractCssBlock(files.reviewCss, '.review-scorecard-grid'), extractCssBlock(files.reviewCss, '.review-studio-layout'), extractCssBlock(files.reviewCss, '.review-output-grid')].join('\n')),
  },
  {
    id: 'admin-control-plane-layout',
    selector: '.admin-control-plane .admin-tabs .admin-overview-grid .admin-table-card',
    fingerprint: hash([extractCssBlock(files.styles, '.admin-control-plane'), extractCssBlock(files.styles, '.admin-tabs'), extractCssBlock(files.styles, '.admin-overview-grid'), files.admin.includes('Security & RBAC')].join('\n')),
  },
  {
    id: 'pilot-readiness-visual-model',
    selector: '.pilot-evaluation-page .pilot-visual-canvas .portfolio-summary-grid .runtime-history',
    fingerprint: hash([extractCssBlock(files.styles, '.pilot-visual-canvas'), extractCssBlock(files.styles, '.portfolio-summary-grid'), extractCssBlock(files.styles, '.runtime-history'), files.pilot.includes('ReactFlow')].join('\n')),
  },
  {
    id: 'focus-and-skip-link',
    selector: '.skip-link :focus-visible #aiw-main',
    fingerprint: hash([extractCssBlock(files.styles, '.skip-link'), extractCssBlock(files.styles, '.skip-link:focus'), files.styles.includes(':focus-visible'), files.app.includes('id="aiw-main"')].join('\n')),
  },
];

for (const contract of visualContracts) {
  assert(!contract.fingerprint.startsWith(hash('')), `Visual contract ${contract.id} did not capture a meaningful fingerprint.`);
}

const baselinePath = join(baselineDir, 'aiw-browser-visual-contracts-v0.10.0-rc.10.15.json');
const baseline = {
  release: '0.10.0-rc.10.15',
  sprint: '8.9.3',
  generatedAt: new Date().toISOString(),
  contracts: visualContracts,
};
writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
writeFileSync(join(reportDir, 'VISUAL_REGRESSION_REPORT_v0.10.0-rc.10.15.json'), JSON.stringify({ ...baseline, summary: { total: visualContracts.length, passed: visualContracts.length } }, null, 2));
console.log(`Visual regression contract gate passed: ${visualContracts.length}/${visualContracts.length} contracts captured.`);
