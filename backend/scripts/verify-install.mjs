#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lockText = fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8');
const failures = [];

if (lockText.includes('applied-caas-gateway') || lockText.includes('internal.api.openai.org')) {
  failures.push('package-lock.json contains a non-public build-environment registry URL.');
}
const major = Number(process.versions.node.split('.')[0]);
if (!Number.isFinite(major) || major < 22 || major >= 25) {
  failures.push(`Node ${process.versions.node} is outside the supported local-evaluation range >=22 <25.`);
}
const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
if (!fs.existsSync(tsc)) {
  failures.push('TypeScript is not installed. Run npm ci in this workspace root.');
}

if (failures.length) {
  console.error(`AIW ${pkg.version} installation check failed:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`AIW ${pkg.version} installation check passed.`);
console.log(`Node ${process.versions.node}; public registry lockfile; TypeScript available.`);
