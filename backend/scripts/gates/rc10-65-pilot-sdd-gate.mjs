import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const distributionRoot = path.resolve(backendRoot, '..');
const read = (relative) => readFile(path.join(backendRoot, relative), 'utf8');
const pkg = JSON.parse(await read('package.json'));
const release = await read('packages/domain/src/release.ts');
const app = await read('apps/api/src/app.ts');
const coordinator = await read('apps/api/src/registerApplicationRoutes.ts');
const pdf = await read('packages/artifacts/src/accessiblePdf.ts');
const sdd = await read('packages/engine/src/sddSections.ts');
const sample = await read('packages/domain/src/sample.ts');
const compose = await readFile(path.join(distributionRoot, 'deploy/docker-compose.pilot-reference.yml'), 'utf8');
const routeFiles = (await readdir(path.join(backendRoot, 'apps/api/src')))
  .filter((name) => name.endsWith('ApplicationRoutes.ts') && name !== 'registerApplicationRoutes.ts');
const routeLines = await Promise.all(routeFiles.map(async (name) => ({
  name,
  lines: (await read(`apps/api/src/${name}`)).split(/\r?\n/).length,
})));
const checks = [
  ['backend version', pkg.version === '0.10.0-rc.10.65.1'],
  ['canonical release identity', release.includes("version: '0.10.0-rc.10.65.1'") && release.includes('User Journey, Canvas and Intelligence Studio Remediation')],
  ['API composition root below target', app.split(/\r?\n/).length <= 1300],
  ['route coordinator is thin', coordinator.split(/\r?\n/).length <= 100 && coordinator.includes('registerSynthesisApplicationRoutes')],
  ['bounded route modules', routeFiles.length >= 6 && routeLines.every((item) => item.lines <= 1300)],
  ['professional PDF cover and TOC', pdf.includes('System Design Description') && pdf.includes("sectionTitle: 'Contents'") && pdf.includes('Professional Delivery Engine')],
  ['readable diagram renderer', pdf.includes('diagramCommands') && pdf.includes('LANDSCAPE') && pdf.includes('edge.label')],
  ['structured tables and pagination', pdf.includes('renderTable') && pdf.includes('paginateBody') && pdf.includes('headersAndFooters: true')],
  ['executive and completeness sections', sdd.includes('Executive architecture summary') && sdd.includes('Architecture completeness, evidence gaps and next actions')],
  ['progressive reference model', sample.includes("id: 'adr-event-driven-order-progression'") && sample.includes("id: 'finding-single-zone-postgres'")],
  ['pilot reference profile', compose.includes('keycloak:') && compose.includes('otel-collector:') && compose.includes('worker:') && compose.includes('AIW_ALLOW_DEV_AUTH: "false"')],
  ['no stale production compose identity', !compose.includes('rc.10.58') && compose.includes('aiw-rc1065-pilot')],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed += 1;
}
for (const item of routeLines.sort((a,b) => a.lines-b.lines)) console.log(`INFO ${item.name}: ${item.lines} lines`);
if (failed) process.exit(1);
console.log(`rc.10.65 backend gate: ${checks.length}/${checks.length} passed`);
