import { spawnSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendRoot = path.resolve(workerDir, '..', '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeCommand = process.execPath;

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const workerDist = path.join(workerDir, 'dist', 'worker.js');
const forceBuild = process.env.AIW_WORKER_SKIP_AUTOBUILD !== '1';

if (forceBuild && !existsSync(workerDist)) {
  console.log('[aiw-worker] dist/worker.js was not found. Cleaning stale TypeScript build info, then building backend packages and worker first...');
  run(npmCommand, ['run', 'clean'], backendRoot);
  run(npmCommand, ['run', 'build:packages'], backendRoot);
  run(npmCommand, ['run', 'build', '-w', '@aiw/worker'], backendRoot);
}

if (!existsSync(workerDist)) {
  console.error('[aiw-worker] dist/worker.js is still missing after build. Run npm run build:packages && npm run build -w @aiw/worker from the backend root.');
  process.exit(1);
}

const child = spawn(nodeCommand, [workerDist], { cwd: workerDir, stdio: 'inherit', shell: false });
child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
