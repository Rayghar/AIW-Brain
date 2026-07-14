#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.');
const failures = [];
const canonicalVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    if (entry.isFile() && entry.name === 'package.json') {
      const data = JSON.parse(fs.readFileSync(full, 'utf8'));
      for (const section of sections) {
        const deps = data[section] ?? {};
        for (const [name, spec] of Object.entries(deps)) {
          if (name.startsWith('@aiw/') && !['*', 'workspace:*', canonicalVersion].includes(spec)) {
            failures.push(`${path.relative(root, full)} ${section}.${name}=${spec}`);
          }
        }
      }
    }
  }
};
walk(root);
if (failures.length) {
  console.error('Internal @aiw/* dependencies must use workspace resolution or the canonical release version:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('PASS internal-deps: all @aiw/* dependencies resolve to the canonical workspace release');
