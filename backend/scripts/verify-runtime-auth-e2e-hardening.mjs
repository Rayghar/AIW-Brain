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

for (const token of ['safeStructuredClone', 'isDraft', 'current(', 'cloneProject(state.project)', 'cloneBranch(state.project.branch)']) requireToken('apps/web/src/store/workspaceStore.ts', token);
for (const token of ['/api/auth/session', 'developmentAuthEnabled', 'guidance', 'development-token']) requireToken('apps/api/src/app.ts', token);
for (const token of ['AuthSessionStatus', 'hasApiToken', 'hub-access-card', 'Use development access', 'Re-check access']) requireToken('apps/web/src/components/ProjectHub.tsx', token);
for (const token of ['hub-access-card--development-token', 'hub-access-card--offline']) requireToken('apps/web/src/styles.css', token);
for (const token of ['AIW_RUNTIME_DOCTOR_v0.10.0-rc.10.34', 'candidateRoots', 'structure:gate']) requireToken('scripts/doctor.mjs', token);
requireToken('package.json', 'doctor');
requireToken('package.json', 'sprint8_9_16:verify');
requireToken('CHANGE_SUMMARY_v0.10.0-rc.10.34.md', 'rc.10.34');
requireToken('SPRINT8_9_16_RUNTIME_DOCTOR_AUTH_ACCESS_E2E_HARDENING.md', 'Sprint 8.9.16');

if (failures.length) {
  console.error('Sprint 8.9.16 verification failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Sprint 8.9.16 runtime doctor, auth/access and DataClone hardening verification passed.');
