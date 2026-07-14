#!/usr/bin/env node
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
function check(name, ok) {
  if (ok) console.log(`PASS ${name}`);
  else { console.error(`FAIL ${name}`); failures.push(name); }
}
function walk(dir, predicate, out = []) {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', '.git'].includes(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, predicate, out);
    else if (predicate(full)) out.push(full);
  }
  return out;
}
const tsbuildinfo = walk(root, (file) => file.endsWith('.tsbuildinfo'));
check('release archive contains no stale TypeScript build cache files', tsbuildinfo.length === 0);
const rootPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
check('release version matches active package version', /^0\.10\.0-rc\.10\.(1[1-9]|[2-9][0-9])$/.test(rootPkg.version));
check('package-lock version matches active package version', lock.version === rootPkg.version);
check('clean script removes tsbuildinfo files', /tsbuildinfo/.test(rootPkg.scripts?.clean ?? ''));
check('package integrity calls release hygiene gate', /release:hygiene/.test(rootPkg.scripts?.sprint8_8_9?.replace(':verify','') ?? '') || rootPkg.scripts?.['sprint8_8_9:verify']?.includes('release:hygiene'));
check('Sprint 8.8.9 verification script exists', existsSync(join(root, 'scripts/verify-sprint8_8_9.mjs')));
check('Sprint 8.8.9 release notes exist', existsSync(join(root, 'SPRINT8_8_9_RELEASE_STABILIZATION_KERNEL_BOUNDARY.md')));
if (failures.length) {
  console.error(`Release hygiene verification failed with ${failures.length} issue(s).`);
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}
console.log('Release hygiene verification passed.');
