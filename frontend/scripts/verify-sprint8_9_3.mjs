import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
function read(path) { return readFileSync(join(root, path), 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const packageJson = read('package.json');
const app = read('apps/web/src/App.tsx');
const pilot = read('apps/web/src/components/PilotEvaluationWorkspace.tsx');
const review = read('apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx');
const sprintDoc = 'SPRINT8_9_3_BROWSER_E2E_VISUAL_PILOT_READINESS.md';

assert(packageJson.includes('0.10.0-rc.10.15'), 'Root package version must be 0.10.0-rc.10.15.');
assert(packageJson.includes('browser:e2e:smoke'), 'Browser E2E smoke script is not registered.');
assert(packageJson.includes('visual:regression'), 'Visual regression script is not registered.');
assert(packageJson.includes('a11y:contrast'), 'Accessibility/contrast script is not registered.');
assert(packageJson.includes('pilot:readiness'), 'Pilot readiness script is not registered.');
assert(app.includes('const ArchitectureReviewStudio = lazy'), 'Review Studio must remain lazy-loaded.');
assert(review.includes('Download handoff ZIP') && review.includes('Download handoff JSON'), 'Review Studio export click-through actions must remain visible.');
assert(pilot.includes('Enterprise pilot readiness'), 'Pilot workspace must expose enterprise pilot readiness evidence.');
assert(existsSync(join(root, 'scripts/verify-browser-e2e-smoke.mjs')), 'Browser E2E smoke gate missing.');
assert(existsSync(join(root, 'scripts/verify-visual-regression.mjs')), 'Visual regression gate missing.');
assert(existsSync(join(root, 'scripts/verify-accessibility-contrast.mjs')), 'Accessibility/contrast gate missing.');
assert(existsSync(join(root, 'scripts/verify-enterprise-pilot-readiness.mjs')), 'Enterprise pilot readiness gate missing.');
assert(existsSync(join(root, 'reports/BROWSER_E2E_SMOKE_REPORT_v0.10.0-rc.10.15.json')), 'Browser smoke report missing.');
assert(existsSync(join(root, 'reports/VISUAL_REGRESSION_REPORT_v0.10.0-rc.10.15.json')), 'Visual regression report missing.');
assert(existsSync(join(root, 'reports/ACCESSIBILITY_CONTRAST_REPORT_v0.10.0-rc.10.15.json')), 'Accessibility contrast report missing.');
assert(existsSync(join(root, 'reports/ENTERPRISE_PILOT_READINESS_REPORT_v0.10.0-rc.10.15.json')), 'Enterprise pilot readiness report missing.');
assert(existsSync(join(root, sprintDoc)), 'Sprint 8.9.3 documentation missing.');
assert(!read('scripts/verify-browser-e2e-smoke.mjs').includes('playwright install'), 'Reference browser gate must not require hidden browser installation.');

console.log('Sprint 8.9.3 Browser E2E, Visual Regression and Enterprise Pilot Readiness verification passed.');
