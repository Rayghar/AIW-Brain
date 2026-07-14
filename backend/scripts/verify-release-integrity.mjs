import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const runtimeRoot = path.resolve(here, '..');
const distRoot = path.resolve(runtimeRoot, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(distRoot, 'RELEASE_MANIFEST.json'), 'utf8'));
const expected = manifest.version;
const failures = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules','dist','.git'].includes(entry.name)) continue;
    const full=path.join(dir,entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === 'package.json') {
      const pkg=JSON.parse(fs.readFileSync(full,'utf8'));
      if (pkg.version !== expected) failures.push(`${path.relative(runtimeRoot,full)} version ${pkg.version} != ${expected}`);
      for (const section of ['dependencies','devDependencies','peerDependencies','optionalDependencies']) {
        for (const [name,value] of Object.entries(pkg[section] ?? {})) {
          if (name.startsWith('@aiw/') && value !== expected) failures.push(`${path.relative(runtimeRoot,full)} ${section} ${name}=${value} != ${expected}`);
        }
      }
    }
  }
}
walk(runtimeRoot);
if (failures.length) {
  console.error('Release integrity gate failed\n' + failures.join('\n'));
  process.exit(1);
}
console.log(`Release integrity verified: ${expected} across ${path.basename(runtimeRoot)}.`);
