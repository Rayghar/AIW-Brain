#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const web = path.join(root, 'apps', 'web');
const env = { ...process.env };
for (const key of Object.keys(env)) if (/^npm_/i.test(key)) delete env[key];
const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { cwd: web, stdio: 'inherit', env, shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
run(path.join(root, 'node_modules', '.bin', 'tsc'), ['-p', 'tsconfig.app.json', '--noEmit']);
run(path.join(root, 'node_modules', '.bin', 'tsc'), ['-p', 'tsconfig.node.json', '--noEmit']);
run(path.join(root, 'node_modules', '.bin', 'vite'), ['build']);
