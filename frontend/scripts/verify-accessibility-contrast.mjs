import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const reportDir = join(root, 'reports');
mkdirSync(reportDir, { recursive: true });
function read(path) { return readFileSync(join(root, path), 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }

function hexToRgb(hex) {
  const normalized = hex.replace('#', '').trim();
  const value = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized;
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}
function luminance([r, g, b]) {
  const values = [r, g, b].map((component) => {
    const s = component / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}
function contrast(a, b) {
  const l1 = luminance(hexToRgb(a));
  const l2 = luminance(hexToRgb(b));
  const high = Math.max(l1, l2);
  const low = Math.min(l1, l2);
  return Number(((high + 0.05) / (low + 0.05)).toFixed(2));
}

const tokens = read('apps/web/src/design-system/tokens.css');
const styles = read('apps/web/src/styles.css');
const app = read('apps/web/src/App.tsx');
const review = read('apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx');
const admin = read('apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx');

const palette = {
  surface: /--aiw-surface:\s*(#[0-9a-fA-F]{6})/.exec(tokens)?.[1] ?? '#07131f',
  raised: /--aiw-surface-raised:\s*(#[0-9a-fA-F]{6})/.exec(tokens)?.[1] ?? '#0b1d2b',
  text: /--aiw-text:\s*(#[0-9a-fA-F]{6})/.exec(tokens)?.[1] ?? '#dce8f2',
  accent: /--aiw-accent:\s*(#[0-9a-fA-F]{6})/.exec(tokens)?.[1] ?? '#25b6a6',
  warning: /--aiw-warning:\s*(#[0-9a-fA-F]{6})/.exec(tokens)?.[1] ?? '#d9a552',
};

const checks = [
  { id: 'text-on-surface-aa', label: 'Primary text meets AA contrast on main surface', ratio: contrast(palette.text, palette.surface), pass: contrast(palette.text, palette.surface) >= 4.5 },
  { id: 'text-on-raised-aa', label: 'Primary text meets AA contrast on raised surface', ratio: contrast(palette.text, palette.raised), pass: contrast(palette.text, palette.raised) >= 4.5 },
  { id: 'accent-on-surface-aa-large-ui', label: 'Accent affordances are visible on main surface', ratio: contrast(palette.accent, palette.surface), pass: contrast(palette.accent, palette.surface) >= 3.0 },
  { id: 'warning-on-surface-aa-large-ui', label: 'Warning affordances are visible on main surface', ratio: contrast(palette.warning, palette.surface), pass: contrast(palette.warning, palette.surface) >= 3.0 },
  { id: 'skip-link-present', label: 'Skip link is present for keyboard users', pass: app.includes('className="skip-link"') && styles.includes('.skip-link:focus') },
  { id: 'main-focus-target', label: 'Main content is keyboard-focusable after skip navigation', pass: app.includes('id="aiw-main"') && app.includes('tabIndex={-1}') },
  { id: 'global-focus-visible', label: 'Global focus-visible treatment exists', pass: styles.includes(':focus-visible') },
  { id: 'review-categories-labelled', label: 'Review category rail has an accessible label', pass: review.includes('aria-label="Review categories"') },
  { id: 'admin-controls-labelled', label: 'Admin control plane contains user-facing tab labels', pass: ['Model routes', 'Knowledge sources', 'Security & RBAC'].every((text) => admin.includes(text)) },
];

for (const check of checks) {
  assert(check.pass, `Accessibility/contrast gate failed: ${check.label}${check.ratio ? ` (${check.ratio}:1)` : ''}`);
}

const report = { release: '0.10.0-rc.10.15', sprint: '8.9.3', generatedAt: new Date().toISOString(), palette, checks, summary: { total: checks.length, passed: checks.length, failed: 0 } };
writeFileSync(join(reportDir, 'ACCESSIBILITY_CONTRAST_REPORT_v0.10.0-rc.10.15.json'), JSON.stringify(report, null, 2));
console.log(`Accessibility/contrast gate passed: ${checks.length}/${checks.length} checks.`);
