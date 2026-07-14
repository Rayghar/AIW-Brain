import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFile(path.join(root,p),'utf8');
const pkg = JSON.parse(await read('package.json'));
const release = await read('packages/domain/src/release.ts');
const routes = await read('apps/api/src/projectIdentityApplicationRoutes.ts');
const checks = [
  ['backend version', pkg.version === '0.10.0-rc.10.65.2'],
  ['canonical release identity', release.includes("version: '0.10.0-rc.10.65.2'") && release.includes('Non-Admin Role Journey and UI/UX Hardening')],
  ['reference role membership remains development-only', routes.includes('AIW_ALLOW_DEV_AUTH === "true"') && routes.includes('withReferenceMembers(project)')],
  ['production authorization path is not weakened', routes.includes('process.env.AIW_ALLOW_DEV_AUTH === "true"')],
  ['no role-switch authorization shortcut introduced', !routes.includes('ALLOW_ROLE_SWITCH_WITHOUT_AUTH')],
];
let failed=0;
for (const [name,ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++; }
console.log(`rc.10.65.2 backend role-journey hardening gate: ${checks.length-failed}/${checks.length} passed`);
if(failed) process.exit(1);
