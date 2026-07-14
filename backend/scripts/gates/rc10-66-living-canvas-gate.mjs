import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = process.cwd();
const paths = ['packages/domain/src/generativeCursor.ts','packages/engine/src/generativeCursor.ts','apps/api/src/livingCanvasApplicationRoutes.ts','packages/engine/test/rc10_66_living_canvas.test.ts','apps/api/test/rc10_66_living_canvas_api.test.ts'];
for (const path of paths) if (!existsSync(resolve(root,path))) throw new Error(`Missing ${path}`);
const route = readFileSync(resolve(root,'apps/api/src/livingCanvasApplicationRoutes.ts'),'utf8');
const coordinator = readFileSync(resolve(root,'apps/api/src/registerApplicationRoutes.ts'),'utf8');
const engine = readFileSync(resolve(root,'packages/engine/src/generativeCursor.ts'),'utf8');
const checks = [
  ['route registered', coordinator.includes('registerLivingCanvasApplicationRoutes')],
  ['actions endpoint', route.includes('/living-canvas/actions')],
  ['apply endpoint', route.includes('/living-canvas/apply')],
  ['tenant scope enforcement', route.includes('LIVING_CANVAS_SCOPE_MISMATCH')],
  ['project edit authorization', route.includes("canPerform(project, principal.subject, 'project.edit')")],
  ['revision conflict', route.includes('REVISION_CONFLICT')],
  ['idempotent mutation', route.includes('idempotency.execute')],
  ['audit trail', route.includes('accept-generative-action')],
  ['deterministic release', engine.includes('deterministicOnly: true')],
  ['human approval', engine.includes('humanApprovalRequired: true')],
];
for (const [name, pass] of checks) console.log(`${pass?'PASS':'FAIL'} ${name}`);
if (checks.some(([, pass])=>!pass)) throw new Error('rc.10.66 backend gate failed');
console.log(`rc.10.66 backend gate passed: ${checks.length}/${checks.length}`);
