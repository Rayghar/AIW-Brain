#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const invocationRoot = path.resolve(process.argv[2] ?? '.');
const failures = [];
const pass = (label) => console.log(`PASS  ${label}`);
const fail = (label) => { console.log(`FAIL  ${label}`); failures.push(label); };
const check = (label, ok) => ok ? pass(label) : fail(label);

const uniqueExistingDirs = (dirs) => [...new Set(dirs.map((dir) => path.resolve(dir)))].filter((dir) => fs.existsSync(dir) && fs.statSync(dir).isDirectory());
const candidateRoots = uniqueExistingDirs([
  invocationRoot,
  path.join(invocationRoot, 'backend'),
  path.join(invocationRoot, 'frontend'),
  path.dirname(invocationRoot),
  path.join(path.dirname(invocationRoot), 'backend'),
  path.join(path.dirname(invocationRoot), 'frontend'),
  path.dirname(path.dirname(invocationRoot)),
  path.join(path.dirname(path.dirname(invocationRoot)), 'backend'),
  path.join(path.dirname(path.dirname(invocationRoot)), 'frontend'),
]);

const displayRoot = (absolutePath) => {
  const owner = candidateRoots.find((root) => absolutePath.startsWith(root + path.sep) || absolutePath === root);
  return owner ? path.relative(owner, absolutePath).replaceAll(path.sep, '/') : absolutePath;
};
const resolvePath = (relativePath) => {
  for (const root of candidateRoots) {
    const absolutePath = path.join(root, relativePath);
    if (fs.existsSync(absolutePath)) return absolutePath;
  }
  return null;
};
const exists = (relativePath) => Boolean(resolvePath(relativePath));
const readText = (relativePath) => {
  const absolutePath = resolvePath(relativePath);
  if (!absolutePath) return null;
  return fs.readFileSync(absolutePath, 'utf8');
};
const lineCount = (relativePath) => {
  const text = readText(relativePath);
  return text ? text.split('\n').length : null;
};
const ratchet = (relativePath, budget) => {
  const count = lineCount(relativePath);
  if (count === null) return fail(`${relativePath}: missing for structure ratchet`);
  check(`${relativePath}: ${count} lines (budget ${budget}, split-aware ratchet)`, count <= budget);
};
const readRequired = (relativePath, label = relativePath) => {
  const text = readText(relativePath);
  if (text === null) fail(`${label}: missing`);
  return text ?? '';
};

console.log(`STRUCTURE GATE ROOT: ${invocationRoot}`);
console.log(`STRUCTURE GATE CANDIDATES: ${candidateRoots.map((dir) => path.basename(dir)).join(', ')}`);

ratchet('apps/api/src/app.ts', 1300);
ratchet('apps/web/src/store/workspaceStore.ts', 1780);
ratchet('apps/web/src/styles.css', 3300);
ratchet('apps/web/src/App.tsx', 820);

for (const relativePath of [
  'packages/admin/src/index.ts',
  'apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx',
  'packages/knowledge/src/index.ts',
  'packages/modelling/src/index.ts',
  'packages/intelligence/src/index.ts',
  'packages/integrations/src/index.ts',
  'packages/ui/src/index.ts',
  'packages/testing/src/index.ts',
  'apps/worker/src/worker.ts',
  'packages/domain/src/architectureView.ts',
  'database/migrations/002_architecture_views.sql',
]) check(`${relativePath} exists`, exists(relativePath));

for (const relativePath of [
  'apps/web/src/features/admin',
  'apps/web/src/features/canvas',
  'apps/web/src/app',
  'apps/web/src/layouts',
  'apps/web/src/api',
  'apps/web/src/design-system',
  'tests/e2e',
  'tests/contract',
  'tests/security',
  'database/rls',
  'database/views',
  'deploy/docker',
  'deploy/helm',
]) check(`${relativePath}/ exists`, exists(relativePath));

const appSource = readRequired('apps/web/src/App.tsx');
const adminWorkspace = readRequired('apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx', 'Admin feature workspace');
check('cleanup: App does not import retired admin components', !/components\/admin|AdminConsoleWorkspace|AdminControlCenter/.test(appSource));
check('cleanup: old AdminConsoleWorkspace removed', !exists('apps/web/src/components/AdminConsoleWorkspace.tsx'));
check('cleanup: old AdminControlCenter removed', !exists('apps/web/src/components/AdminControlCenter.tsx'));
check('cleanup: old components/admin folder removed', !exists('apps/web/src/components/admin'));
check('cleanup: Admin feature has no window.prompt workflows', !/window\.prompt/.test(adminWorkspace));
check('cleanup: old CanvasWorkbench removed', !exists('apps/web/src/components/CanvasWorkbench.tsx'));
check('cleanup: old ArchitectureNodeView removed', !exists('apps/web/src/components/ArchitectureNodeView.tsx'));
check('cleanup: App does not import retired canvas components', !/components\/CanvasWorkbench|components\/ArchitectureNodeView|CanvasWorkbench/.test(appSource));
check('canvas feature: ProCanvasViewSystem exists', exists('apps/web/src/features/canvas/ProCanvasViewSystem.tsx'));
check('canvas feature: feature-owned node view exists', exists('apps/web/src/features/canvas/nodes/ArchitectureNodeView.tsx'));

const routesDir = resolvePath('apps/api/src/routes');
if (!routesDir) {
  fail('apps/api/src/routes exists for route ownership checks');
} else {
  for (const fileName of fs.readdirSync(routesDir)) {
    if (!fileName.endsWith('.ts')) continue;
    const n = lineCount(`apps/api/src/routes/${fileName}`);
    check(`routes/${fileName}: ${n} lines (budget 320)`, n !== null && n <= 320);
  }
}

const endpointOwners = new Map();
const collect = (relativePath, owner) => {
  const source = readText(relativePath);
  if (!source) return;
  for (const match of source.matchAll(/\b(?:app|scope)\.(get|post|put|delete)\(\s*['"`]([^'"`]+)['"`]/g)) {
    const key = `${match[1].toUpperCase()} ${match[2]}`;
    (endpointOwners.get(key) ?? endpointOwners.set(key, []).get(key)).push(owner);
  }
};
collect('apps/api/src/app.ts', 'app.ts');
if (routesDir) {
  for (const fileName of fs.readdirSync(routesDir)) collect(`apps/api/src/routes/${fileName}`, `routes/${fileName}`);
}
const collisions = [...endpointOwners.entries()].filter(([, owners]) => owners.length > 1);
if (collisions.length) {
  for (const [endpoint, owners] of collisions) console.log(`FAIL  route collision: ${endpoint} owned by ${owners.join(', ')}`);
  failures.push(`route collisions: ${collisions.length}`);
} else {
  pass(`route collisions: none across ${endpointOwners.size} endpoints`);
}

let visualRefs = 0;
const webSrcDir = resolvePath('apps/web/src');
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolutePath);
    else if (/\.(ts|tsx)$/.test(entry.name)) visualRefs += (fs.readFileSync(absolutePath, 'utf8').match(/__visualStyle/g) ?? []).length;
  }
};
if (webSrcDir) walk(webSrcDir); else fail('apps/web/src exists for visual-style ratchet');
check(`__visualStyle references: ${visualRefs} (ratchet 2)`, visualRefs <= 2);

let netHits = 0;
const engineDir = resolvePath('packages/engine/src');
if (!engineDir) {
  fail('packages/engine/src exists for engine purity check');
} else {
  for (const fileName of fs.readdirSync(engineDir)) {
    if (!fileName.endsWith('.ts')) continue;
    if (/\bfetch\s*\(|XMLHttpRequest|node:https?\b/.test(fs.readFileSync(path.join(engineDir, fileName), 'utf8'))) {
      netHits++;
      console.log(`FAIL  engine purity: ${displayRoot(path.join(engineDir, fileName))} contains network primitives`);
    }
  }
}
check('engine purity: no network primitives in packages/engine', netHits === 0);
check('split-aware structure gate: resolves backend apps/api and frontend apps/web from one invocation', exists('apps/api/src/app.ts') && exists('apps/web/src/App.tsx') && exists('apps/worker/src/worker.ts'));

console.log(failures.length ? `\nSTRUCTURE GATE: ${failures.length} violation(s)` : '\nSTRUCTURE GATE: PASSED (split-aware clinical refactor foundation and route-collision ratchets active)');
process.exit(failures.length ? 1 : 0);
