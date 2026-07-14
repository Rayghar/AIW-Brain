import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const read = (relative) => {
  const path = join(root, relative);
  if (!existsSync(path)) {
    failures.push(`missing ${relative}`);
    return '';
  }
  return readFileSync(path, 'utf8');
};

const rootPackage = JSON.parse(read('package.json') || '{}');
const webPackage = JSON.parse(read('apps/web/package.json') || '{}');
const runtimePackage = JSON.parse(read('packages/brain-runtime/package.json') || '{}');
const runtimeIndex = read('packages/brain-runtime/src/index.ts');
const vite = read('apps/web/vite.config.ts');
const tsconfig = read('apps/web/tsconfig.app.json');

if (runtimePackage.name !== '@aiw/brain-runtime') failures.push('brain runtime package name is not canonical');
if (runtimePackage.main !== 'dist/index.js' || runtimePackage.types !== 'dist/index.d.ts') failures.push('brain runtime package build entry points are incomplete');
if (!runtimeIndex.includes("export * from './types'")) failures.push('browser runtime does not export presentation contracts');
if (!runtimeIndex.includes("export * from './noiseBudget'")) failures.push('browser runtime does not export noise-budget helpers');
if (!runtimeIndex.includes("export * from './signalPrioritizer'")) failures.push('browser runtime does not export prioritisation helpers');
if (/brainSignalEngine|evaluateArchitectureEvent|recommendArchitectureStyle/.test(runtimeIndex)) failures.push('browser runtime contains retired architecture-authority logic');
const dependency = webPackage.dependencies?.['@aiw/brain-runtime'];
if (!dependency) failures.push('web package does not depend on @aiw/brain-runtime');
else if (![rootPackage.version, '*', 'workspace:*'].includes(dependency)) failures.push(`web brain-runtime dependency ${dependency} does not match workspace release ${rootPackage.version}`);
if (!String(rootPackage.scripts?.['build:brain-runtime'] ?? '').includes('@aiw/brain-runtime')) failures.push('root build does not compile @aiw/brain-runtime');
if (!vite.includes('@aiw/brain-runtime') || !vite.includes('packages/brain-runtime/src/index.ts')) failures.push('Vite alias does not resolve the canonical browser runtime source');
if (!tsconfig.includes('@aiw/brain-runtime') || !tsconfig.includes('packages/brain-runtime/src/index.ts')) failures.push('TypeScript path does not resolve the canonical browser runtime source');

if (failures.length) {
  console.error('Brain runtime resolution gate failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('Brain runtime resolution gate passed: server-authoritative reasoning, projection-only browser runtime.');
