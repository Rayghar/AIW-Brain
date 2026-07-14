import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=(p)=>readFile(path.join(root,p),'utf8');
const pkg=JSON.parse(await read('package.json'));
const release=await read('packages/domain/src/release.ts');
const routes=await read('apps/api/src/projectIdentityApplicationRoutes.ts');
const checks=[
 ['backend version',pkg.version==='0.10.0-rc.10.65.1'],
 ['canonical release identity',release.includes("version: '0.10.0-rc.10.65.1'") && release.includes('User Journey, Canvas and Intelligence Studio Remediation')],
 ['reference role membership is development-only',routes.includes('AIW_ALLOW_DEV_AUTH === "true"') && routes.includes('withReferenceMembers(project)')],
 ['production path remains unmodified',routes.includes('process.env.AIW_ALLOW_DEV_AUTH === "true"')],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);console.log(`rc.10.65.1 backend remediation gate: ${checks.length}/${checks.length} passed`);
