#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const workspacePackagePaths = [
  'apps/api/package.json','apps/web/package.json','apps/worker/package.json',
  'packages/domain/package.json','packages/engine/package.json','packages/artifacts/package.json',
  'packages/admin/package.json','packages/knowledge/package.json','packages/modelling/package.json',
  'packages/intelligence/package.json','packages/integrations/package.json','packages/ui/package.json','packages/testing/package.json',
];
const failures = [];
const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const pass = (label) => console.log(`PASS  ${label}`);
const fail = (label) => { console.error(`FAIL  ${label}`); failures.push(label); };
const check = (label, ok) => ok ? pass(label) : fail(label);

for (const p of ['package.json', ...workspacePackagePaths]) {
  check(`${p} exists`, existsSync(p));
  if (!existsSync(p)) continue;
  const pkg = readJson(p);
  check(`${p} version is ${version}`, pkg.version === version);
  for (const section of ['dependencies','devDependencies','peerDependencies']) {
    for (const [name, value] of Object.entries(pkg[section] ?? {})) {
      if (name.startsWith('@aiw/')) check(`${p} ${section}.${name} points to ${version}`, value === version);
    }
  }
}

const lock = readJson('package-lock.json');
check('package-lock root version aligned', lock.version === version);
check('package-lock package root version aligned', lock.packages?.['']?.version === version);
for (const ws of workspacePackagePaths.map((p) => p.replace('/package.json',''))) {
  check(`package-lock ${ws} version aligned`, lock.packages?.[ws]?.version === version);
  for (const [name, value] of Object.entries(lock.packages?.[ws]?.dependencies ?? {})) {
    if (name.startsWith('@aiw/')) check(`package-lock ${ws} dependency ${name} aligned`, value === version);
  }
}

const npmrc = existsSync('.npmrc') ? readFileSync('.npmrc', 'utf8') : '';
check('.npmrc uses public npm registry', /registry=https:\/\/registry\.npmjs\.org\/?/.test(npmrc));
const activeFiles = ['package.json','package-lock.json','README.md','SHIP_NOTES.md'];
for (const p of activeFiles) {
  const text = readFileSync(p, 'utf8');
  check(`${p} has no stale active rc.6 marker`, !/v0\.10\.0-rc\.6|0\.10\.0-rc\.6/.test(text));
  check(`${p} has no stale active rc.10.1 marker`, !/v0\.10\.0-rc\.10\.1(?!\d)|0\.10\.0-rc\.10\.1(?!\d)/.test(text));
  check(`${p} has no stale active rc.10.2 marker`, !/v0\.10\.0-rc\.10\.2(?!\d)|0\.10\.0-rc\.10\.2(?!\d)/.test(text));
  check(`${p} has no stale active rc.10.3 marker`, !/v0\.10\.0-rc\.10\.3(?!\d)|0\.10\.0-rc\.10\.3(?!\d)/.test(text));
  check(`${p} has no stale active rc.10.4 marker`, !/v0\.10\.0-rc\.10\.4(?!\d)|0\.10\.0-rc\.10\.4(?!\d)/.test(text));
  check(`${p} has no stale active rc.10.5 marker`, !/v0\.10\.0-rc\.10\.5(?!\d)|0\.10\.0-rc\.10\.5(?!\d)/.test(text));
  check(`${p} has no stale active rc.10.6 marker`, !/v0\.10\.0-rc\.10\.6(?!\d)|0\.10\.0-rc\.10\.6(?!\d)/.test(text));
  check(`${p} has no stale active rc.10.7 marker`, !/v0\.10\.0-rc\.10\.7(?!\d)|0\.10\.0-rc\.10\.7(?!\d)/.test(text));
  check(`${p} has no stale active rc.10.10 marker`, !/v0\.10\.0-rc\.10\.10|0\.10\.0-rc\.10\.10/.test(text));
  check(`${p} has no internal package registry`, !/applied-caas|internal\.api\.openai\.org/.test(text));
}
for (const p of [`CHANGE_SUMMARY_v${version}.md`,`BUILD_VERIFICATION_v${version}.txt`,'SPRINT8_8_8_ENTERPRISE_SECURITY_RBAC_SCALE.md','SPRINT8_8_9_RELEASE_STABILIZATION_KERNEL_BOUNDARY.md','SPRINT8_9_0_INTELLIGENT_ARCHITECTURE_REVIEW_STUDIO.md','SPRINT8_9_1_SOLUTION_DELIVERY_PACK_HANDOFF.md','SPRINT8_9_2_WEB_PERFORMANCE_EXPORT_UX.md','deploy/security/production-security-profile.md']) {
  check(`${p} exists`, existsSync(p));
}
console.log(failures.length ? `\nPACKAGE INTEGRITY: ${failures.length} violation(s)` : '\nPACKAGE INTEGRITY: PASSED');
process.exit(failures.length ? 1 : 0);
