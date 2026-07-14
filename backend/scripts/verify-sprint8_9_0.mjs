import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'packages/intelligence/src/review-studio/index.ts',
  'apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx',
  'apps/web/src/features/review-studio/review-studio.css',
  'apps/api/src/routes/reviewStudioRoutes.ts',
  'SPRINT8_9_0_INTELLIGENT_ARCHITECTURE_REVIEW_STUDIO.md',
];
const missing = requiredFiles.filter((file) => !existsSync(join(root, file)));
if (missing.length) throw new Error(`Sprint 8.9.0 missing files: ${missing.join(', ')}`);

const intelligence = readFileSync(join(root, 'packages/intelligence/src/review-studio/index.ts'), 'utf8');
const web = readFileSync(join(root, 'apps/web/src/App.tsx'), 'utf8');
const studio = readFileSync(join(root, 'apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx'), 'utf8');
const api = readFileSync(join(root, 'apps/api/src/app.ts'), 'utf8');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const requirements = [
  [/^0\.10\.0-rc\.10\.(1[2-9]|[2-9][0-9])$/.test(pkg.version), 'root package version must be at least 0.10.0-rc.10.12'],
  [intelligence.includes('export function runArchitectureReview'), 'runArchitectureReview must be implemented'],
  [intelligence.includes('ReviewFinding'), 'ReviewFinding model must exist'],
  [intelligence.includes('ReviewRecommendation'), 'ReviewRecommendation model must exist'],
  [intelligence.includes('GeneratedReviewAdr'), 'GeneratedReviewAdr model must exist'],
  [intelligence.includes('GeneratedFitnessTest'), 'GeneratedFitnessTest model must exist'],
  [intelligence.includes('Canonical Architecture Model'), 'canonical review pipeline must be declared'],
  [intelligence.includes('llmMayScore: defaultAuthorityBoundary.llmMayScore'), 'review must enforce intelligence authority boundary'],
  [studio.includes('runArchitectureReview'), 'Review Studio UI must execute the canonical review engine'],
  [studio.includes('Generated ADRs') && studio.includes('Fitness tests'), 'Review Studio UI must surface ADRs and fitness tests'],
  [web.includes('ArchitectureReviewStudio'), 'App must route validation stage to ArchitectureReviewStudio'],
  [!web.includes('ReviewWorkspace'), 'App must not route to the retired ReviewWorkspace side path'],
  [api.includes('reviewStudioRoutes'), 'API must register Review Studio routes'],
];
const failed = requirements.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) throw new Error(`Sprint 8.9.0 verification failed:\n- ${failed.join('\n- ')}`);

// Release-hygiene is executed before build in sprint8_9_0:verify;
// this gate focuses on Review Studio feature integration after generated build caches may exist.
console.log('Sprint 8.9.0 Intelligent Architecture Review & Decision Studio verification passed.');
