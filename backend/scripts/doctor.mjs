import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

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

function resolvePath(relativePath) {
  for (const base of candidateRoots) {
    const full = path.join(base, relativePath);
    if (existsSync(full)) return full;
  }
  return null;
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function run(command) {
  try {
    const out = execSync(command, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 });
    return { ok: true, output: out.trim().slice(0, 1200) };
  } catch (error) {
    return { ok: false, output: String(error.stderr || error.message).trim().slice(0, 1200) };
  }
}

const checks = [];
function check(id, ok, detail, remediation = '') {
  checks.push({ id, ok: Boolean(ok), detail, remediation });
}

const nodeMajor = Number(process.versions.node.split('.')[0]);
check('node-version', nodeMajor >= 22, `Node ${process.versions.node}`, 'Install Node.js 22 LTS or newer.');

const packageJsonPath = resolvePath('package.json');
check('package-json', Boolean(packageJsonPath), packageJsonPath ? `Found ${packageJsonPath}` : 'No package.json found.', 'Run doctor from the project root, backend root, or frontend root.');
if (packageJsonPath) {
  const pkg = readJson(packageJsonPath);
  check('package-version', String(pkg.version ?? '').includes('0.10.0-rc.10.34'), `Package version ${pkg.version ?? 'unknown'}`, 'Use the latest rc.10.34 package.');
  check('structure-gate-script', Boolean(pkg.scripts?.['structure:gate']), 'structure:gate script present', 'Restore structure:gate script.');
}

const api = resolvePath('apps/api/src/app.ts');
const web = resolvePath('apps/web/src/App.tsx');
const worker = resolvePath('apps/worker/src/worker.ts');
check('api-source', Boolean(api), api ? `API source found at ${api}` : 'API source missing.', 'Use backend root or flat source package.');
check('web-source', Boolean(web), web ? `Web source found at ${web}` : 'Web source missing.', 'Use frontend root or flat source package.');
check('worker-source', Boolean(worker), worker ? `Worker source found at ${worker}` : 'Worker source missing.', 'Use backend root or flat source package.');

const envExample = resolvePath('.env.example');
const env = resolvePath('.env');
check('env-example', Boolean(envExample), envExample ? `.env.example found at ${envExample}` : '.env.example missing.', 'Restore .env.example.');
check('env-file', true, env ? `.env found at ${env}` : '.env not found; dev defaults will run, but create one before production-like testing.', 'Run: copy .env.example .env');

const structure = run('npm run structure:gate');
check('structure-gate', structure.ok, structure.ok ? 'structure:gate passed.' : structure.output, 'Run npm run structure:gate from backend and frontend after installing dependencies.');

mkdirSync(resolvePath('reports') ?? path.join(root, 'reports'), { recursive: true });
const reportPath = path.join(resolvePath('reports') ?? path.join(root, 'reports'), 'AIW_RUNTIME_DOCTOR_v0.10.0-rc.10.34.json');
const summary = { release: '0.10.0-rc.10.34', generatedAt: new Date().toISOString(), invocationRoot: root, candidateRoots, checks, passed: checks.filter((c) => c.ok).length, failed: checks.filter((c) => !c.ok).length };
writeFileSync(reportPath, JSON.stringify(summary, null, 2));
for (const item of checks) console.log(`${item.ok ? '✓' : '✕'} ${item.id}: ${item.detail}`);
console.log(`Doctor report: ${reportPath}`);
if (summary.failed) process.exit(1);
