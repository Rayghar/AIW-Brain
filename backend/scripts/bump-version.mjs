#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/bump-version.mjs <version>');
  process.exit(1);
}
const root = path.resolve(process.cwd());
const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
const changed = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    if (entry.isFile() && entry.name === 'package.json') {
      const data = JSON.parse(fs.readFileSync(full, 'utf8'));
      data.version = version;
      for (const section of sections) {
        const deps = data[section];
        if (!deps) continue;
        for (const name of Object.keys(deps)) if (name.startsWith('@aiw/')) deps[name] = '*';
      }
      fs.writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`);
      changed.push(path.relative(root, full));
    }
  }
};
walk(root);
console.log(`Bumped ${changed.length} package manifest(s) to ${version} and preserved @aiw/* workspace dependencies as "*".`);
