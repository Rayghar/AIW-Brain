import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const candidateRoots = [...new Set([
  root,
  path.join(root, 'backend'),
  path.join(root, 'frontend'),
  path.dirname(root),
  path.join(path.dirname(root), 'backend'),
  path.join(path.dirname(root), 'frontend'),
  path.dirname(path.dirname(root)),
  path.join(path.dirname(path.dirname(root)), 'backend'),
  path.join(path.dirname(path.dirname(root)), 'frontend'),
].map((entry) => path.resolve(entry)))].filter((entry) => existsSync(entry));
function resolvePath(relativePath) { for (const base of candidateRoots) { const full = path.join(base, relativePath); if (existsSync(full)) return full; } return null; }
function read(relativePath) { const p = resolvePath(relativePath); return p ? readFileSync(p, 'utf8') : ''; }
const failures = [];
function requireToken(relativePath, token) { const text = read(relativePath); if (!text) failures.push(`${relativePath} missing`); else if (!text.includes(token)) failures.push(`${relativePath} missing token: ${token}`); }
function forbidToken(relativePath, token) { const text = read(relativePath); if (text && text.includes(token)) failures.push(`${relativePath} still contains forbidden token: ${token}`); }

const app = read('apps/web/src/App.tsx');
if (!app) failures.push('apps/web/src/App.tsx missing');
const currentUserHook = app.indexOf('const currentUserId = useWorkspaceStore');
const projectHubReturn = app.indexOf('if (showProjectHub)');
if (currentUserHook === -1) failures.push('currentUserId store hook missing');
if (projectHubReturn === -1) failures.push('Project Hub early return missing');
if (currentUserHook !== -1 && projectHubReturn !== -1 && currentUserHook > projectHubReturn) failures.push('currentUserId hook is still declared after the Project Hub early return');

for (const token of [
  'app-nav app-nav--compact',
  'studio-navigation-bar',
  'studio-mode-tabs',
  'design-lifecycle-tabs',
  'workspace-launcher-menu',
  'floating-workspace-launcher',
]) requireToken('apps/web/src/App.tsx', token);

for (const token of [
  'graphOpen',
  'journey-intelligence-static-preview',
  'Open interactive map',
  'Map preview is locked for navigation safety',
]) requireToken('apps/web/src/components/WorkspaceIntelligenceMap.tsx', token);

for (const token of [
  'app-nav--compact',
  'studio-navigation-bar',
  'design-lifecycle-tabs',
  'workspace-launcher-menu__panel',
  'floating-workspace-launcher',
  'journey-intelligence-static-preview',
  'specialist workspace polish sweep',
]) requireToken('apps/web/src/studio-navigation-polish.css', token);

for (const token of [
  'security-page',
  'operational-intelligence-page',
  'drift-page',
]) requireToken('apps/web/src/studio-navigation-polish.css', token);

for (const [file, token] of [
  ['apps/web/src/components/SecurityWorkspace.tsx', 'security-page'],
  ['apps/web/src/components/OperationalIntelligenceWorkspace.tsx', 'operational-intelligence-page'],
  ['apps/web/src/components/DriftWorkspace.tsx', 'drift-page'],
]) requireToken(file, token);

requireToken('CHANGE_SUMMARY_v0.10.0-rc.10.34.md', 'rc.10.34');
requireToken('SPRINT8_9_17_STUDIO_NAVIGATION_VISUAL_POLISH_HOOK_FIX.md', 'Sprint 8.9.17');
requireToken('package.json', 'sprint8_9_17:verify');

if (failures.length) {
  console.error('Sprint 8.9.17 verification failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Sprint 8.9.17 studio navigation, visual polish and hook-order verification passed.');
