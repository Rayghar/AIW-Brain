import { readFileSync } from 'node:fs';

const checks = [
  ['package version is at least rc.10.14', () => /^0\.10\.0-rc\.10\.(1[4-9]|[2-9][0-9])$/.test(JSON.parse(readFileSync('package.json', 'utf8')).version)],
  ['artifact ZIP archive builder exists', () => readFileSync('packages/artifacts/src/index.ts', 'utf8').includes('export function createArtifactArchive')],
  ['artifact ZIP test exists', () => readFileSync('packages/artifacts/test/sprint8_9_1.test.ts', 'utf8').includes('browser-safe zip archive')],
  ['API ZIP route exists', () => readFileSync('apps/api/src/routes/reviewStudioRoutes.ts', 'utf8').includes('/api/review-studio/handoff-pack.zip')],
  ['API ZIP test exists', () => readFileSync('apps/api/test/sprint8_9_1.test.ts', 'utf8').includes('streams a governed ZIP handoff pack')],
  ['Review Studio uses dynamic artifact import', () => readFileSync('apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx', 'utf8').includes("import('@aiw/artifacts')")],
  ['Review Studio has no static artifact import', () => !/^import\s+(?!type\b)[^;]+from ['"]@aiw\/artifacts['"]/m.test(readFileSync('apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx', 'utf8'))],
  ['Review Studio is lazy-loaded in App', () => readFileSync('apps/web/src/App.tsx', 'utf8').includes('const ArchitectureReviewStudio = lazy')],
  ['web bundle budget script exists in package scripts', () => JSON.parse(readFileSync('package.json', 'utf8')).scripts['web:bundle:budget'] === 'node scripts/verify-web-export-performance.mjs'],
  ['sprint documentation exists', () => readFileSync('SPRINT8_9_2_WEB_PERFORMANCE_EXPORT_UX.md', 'utf8').includes('Sprint 8.9.2')],
];

const failures = checks.filter(([, check]) => !check()).map(([name]) => name);
if (failures.length) {
  console.error('Sprint 8.9.2 verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 8.9.2 Web Performance, Code-Splitting and Export UX verification passed.');
