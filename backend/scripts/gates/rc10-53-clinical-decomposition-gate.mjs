import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const lines = (file) => read(file).split(/\r?\n/).length;
const app = read('apps/api/src/app.ts');
const assertions = [
  ['api composition root below 4000 lines', lines('apps/api/src/app.ts') < 4000],
  ['release registry routes extracted', fs.existsSync(path.join(root, 'apps/api/src/routes/releaseRegistryRoutes.ts'))],
  ['reference project helpers extracted', fs.existsSync(path.join(root, 'apps/api/src/referenceProject.ts'))],
  ['portfolio routes extracted', fs.existsSync(path.join(root, 'apps/api/src/routes/portfolioRoutes.ts')) && lines('apps/api/src/routes/portfolioRoutes.ts') < 320],
  ['composition root registers release routes', app.includes('releaseRegistryRoutes(app, { knowledgeOperations })')],
  ['composition root registers portfolio routes', app.includes('portfolioRoutes(app)')],
  ['composition root no longer defines release 7.9 route', !app.includes('app.get("/api/knowledge-releases/7.9"')],
  ['full SDD sections available', read('packages/engine/src/sddSections.ts').includes('Security, privacy and trust architecture')],
  ['deep delivery artifacts available', read('packages/artifacts/src/index.ts').includes('handoff/migration-and-transition.md')],
];
const failed = assertions.filter(([, ok]) => !ok);
for (const [name, ok] of assertions) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) process.exit(1);
console.log(`rc.10.53 clinical-decomposition gate passed (${assertions.length}/${assertions.length}).`);
