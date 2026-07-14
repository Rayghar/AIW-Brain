import { readFile, stat } from 'node:fs/promises';
const root = new URL('../../', import.meta.url);
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const release = await readFile(new URL('packages/domain/src/release.ts', root), 'utf8');
const app = await readFile(new URL('apps/api/src/app.ts', root), 'utf8');
const routes = await readFile(new URL('apps/api/src/registerApplicationRoutes.ts', root), 'utf8');
const cycle = await readFile(new URL('packages/knowledge/src/governedKnowledgeCycle.ts', root), 'utf8');
const appLines = app.split(/\r?\n/).length;
const checks = [
  ['backend version', pkg.version === '0.10.0-rc.10.65.0'],
  ['canonical release identity', release.includes("version: '0.10.0-rc.10.65.0'") && release.includes('Product Hardening, Deep Workspace Completion and Enterprise Acceptance')],
  ['API composition root below structural target', appLines <= 1300],
  ['route registry extracted', app.includes('registerApplicationRoutes') && routes.includes('export async function registerApplicationRoutes')],
  ['route registry remains explicit', routes.includes("app.get('/health'") || routes.includes('app.get("/health"') || routes.includes("app.get('/api")],
  ['governed knowledge cycle', cycle.includes('assertSeparationOfDuties') && cycle.includes('candidateInfluencesProduction') && cycle.includes('pinKnowledgeRelease')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`INFO api composition root ${appLines} lines`);
if (failed) process.exit(1);
console.log(`rc.10.65 backend gate: ${checks.length}/${checks.length} passed`);
