import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const invocationRoot = path.resolve('.');
const candidateRoots = [...new Set([
  invocationRoot,
  path.join(invocationRoot, 'backend'),
  path.join(invocationRoot, 'frontend'),
  path.dirname(invocationRoot),
  path.join(path.dirname(invocationRoot), 'backend'),
  path.join(path.dirname(invocationRoot), 'frontend'),
  path.dirname(path.dirname(invocationRoot)),
  path.join(path.dirname(path.dirname(invocationRoot)), 'backend'),
  path.join(path.dirname(path.dirname(invocationRoot)), 'frontend'),
].map((entry) => path.resolve(entry)))].filter((entry) => existsSync(entry));
const resolvePath = (relativePath) => {
  for (const root of candidateRoots) {
    const absolutePath = path.join(root, relativePath);
    if (existsSync(absolutePath)) return absolutePath;
  }
  return null;
};
const read = (relativePath) => {
  const absolutePath = resolvePath(relativePath);
  if (!absolutePath) return null;
  return readFileSync(absolutePath, 'utf8');
};
const failures = [];
const requireToken = (relativePath, token) => {
  const text = read(relativePath);
  if (!text) failures.push(`${relativePath} is missing`);
  else if (!text.includes(token)) failures.push(`${relativePath} does not contain ${token}`);
};

for (const token of ['candidateRoots', 'split-aware structure gate', 'resolvePath', 'apps/api/src/app.ts', 'apps/web/src/App.tsx', 'route collisions']) {
  requireToken('scripts/verify-structure.mjs', token);
}
for (const token of ['AIW_STARTER_TEMPLATES', 'Guided project start', 'Preview before create', 'Create guided project', 'Import SDD / requirements', 'Import repository evidence']) {
  requireToken('apps/web/src/components/ProjectHub.tsx', token);
}
for (const token of ['starter-template-grid', 'starter-preview-panel', 'starter-validation-strip']) {
  requireToken('apps/web/src/styles.css', token);
}
for (const token of ['microservice', 'event-driven', 'cloud-migration', 'sdd-import', 'repo-import']) {
  requireToken('apps/api/src/app.ts', token);
}
requireToken('SPRINT8_9_15_GUIDED_ONBOARDING_SPLIT_STRUCTURE_GATE.md', 'Sprint 8.9.15');
requireToken('CHANGE_SUMMARY_v0.10.0-rc.10.33.md', 'v0.10.0-rc.10.33');

const packageJson = read('package.json') ?? '';
if (!packageJson.includes('0.10.0-rc.10.33')) failures.push('package version not bumped to rc.10.32');
if (!packageJson.includes('structure:gate')) failures.push('structure:gate script is not registered');
if (!packageJson.includes('sprint8_9_15:verify')) failures.push('sprint8_9_15 verify script is not registered');

if (failures.length) {
  console.error('Sprint 8.9.15 verification failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('Sprint 8.9.15 guided onboarding and split-aware structure gate verification passed.');
