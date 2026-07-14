#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let removed = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'dist') {
        fs.rmSync(full, { recursive: true, force: true });
        removed += 1;
      } else {
        walk(full);
      }
    } else if (entry.name.endsWith('.tsbuildinfo')) {
      fs.rmSync(full, { force: true });
      removed += 1;
    }
  }
}

for (const base of ['apps', 'packages']) walk(path.join(root, base));
console.log(`Removed ${removed} generated path(s).`);
