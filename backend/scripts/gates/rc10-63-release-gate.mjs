import { readFile } from 'node:fs/promises';
const root = new URL('../../', import.meta.url);
const release = await readFile(new URL('packages/domain/src/release.ts', root), 'utf8');
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const routeRoot = await readFile(new URL('apps/api/src/app.ts', root), 'utf8');
const checks = [
  ['backend package version', pkg.version === '0.10.0-rc.10.63.0'],
  ['canonical release version', release.includes("version: '0.10.0-rc.10.63.0'")],
  ['canonical release name', release.includes('Navigation Spine and Architecture Decision Flow Reconstruction')],
  ['API composition root preserved', routeRoot.includes('Fastify') || routeRoot.includes('fastify')],
];
let failed=0; for(const [name,ok] of checks){ console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++; }
if(failed) process.exit(1); console.log(`rc.10.63 backend gate: ${checks.length}/${checks.length} passed`);
