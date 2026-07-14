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

const app = read('apps/web/src/App.tsx');
if (!app) failures.push('apps/web/src/App.tsx missing');
const earlyReturn = app.indexOf('if (showProjectHub)');
const appAfterEarlyReturn = earlyReturn >= 0 ? app.slice(earlyReturn) : '';
if (earlyReturn < 0) failures.push('Project Hub early return missing');
if (appAfterEarlyReturn.includes('useWorkspaceStore((state)')) failures.push('store hook call exists after Project Hub early return');
if (appAfterEarlyReturn.match(/\buse[A-Z][A-Za-z0-9_]*\s*\(/)) failures.push('React-style hook call exists after Project Hub early return');
requireToken('apps/web/src/App.tsx', 'const knowledgeReleaseId = useWorkspaceStore((state) => state.library.knowledgeReleaseId);');
if (app.includes('useWorkspaceStore.getState().library.knowledgeReleaseId')) failures.push('knowledge release is still read with getState inside render');

const store = read('apps/web/src/store/workspaceStore.ts');
if (!store) failures.push('apps/web/src/store/workspaceStore.ts missing');
requireToken('apps/web/src/store/workspaceStore.ts', 'function toSerializableCloneInput');
requireToken('apps/web/src/store/workspaceStore.ts', 'function safeStructuredClone');
requireToken('apps/web/src/store/workspaceStore.ts', 'isDraft(value) ? current(value as never) : value');
for (const token of [
  'const preview = safeStructuredClone(state.pendingLibraryDrop);',
  'const preview = safeStructuredClone(state.canvasLayoutPreview);',
  'safeStructuredClone(previous.project)',
]) requireToken('apps/web/src/store/workspaceStore.ts', token);
const directStructuredClone = [...store.matchAll(/structuredClone\(/g)].map((match) => match.index ?? 0);
if (directStructuredClone.length !== 1) failures.push(`workspaceStore should have exactly one direct structuredClone call inside safeStructuredClone; found ${directStructuredClone.length}`);

requireToken('CHANGE_SUMMARY_v0.10.0-rc.10.35.md', 'rc.10.35');
requireToken('SPRINT8_9_18_RESIDUAL_RUNTIME_HARDENING.md', 'Sprint 8.9.18');
requireToken('package.json', 'sprint8_9_18:verify');

if (failures.length) {
  console.error('Sprint 8.9.18 verification failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Sprint 8.9.18 residual runtime hardening verification passed.');
