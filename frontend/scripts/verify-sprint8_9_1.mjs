import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'packages/artifacts/src/index.ts',
  'packages/artifacts/test/sprint8_9_1.test.ts',
  'apps/api/test/sprint8_9_1.test.ts',
  'apps/api/src/routes/reviewStudioRoutes.ts',
  'apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx',
  'SPRINT8_9_1_SOLUTION_DELIVERY_PACK_HANDOFF.md',
  'CHANGE_SUMMARY_v0.10.0-rc.10.13.md',
];
const missing = requiredFiles.filter((file) => !existsSync(join(root, file)));
if (missing.length) throw new Error(`Sprint 8.9.1 missing files: ${missing.join(', ')}`);

const artifacts = readFileSync(join(root, 'packages/artifacts/src/index.ts'), 'utf8');
const api = readFileSync(join(root, 'apps/api/src/routes/reviewStudioRoutes.ts'), 'utf8');
const studio = readFileSync(join(root, 'apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx'), 'utf8');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const checks = [
  [/^0\.10\.0-rc\.10\.(1[3-9]|[2-9][0-9])$/.test(pkg.version), 'root package version must be at least 0.10.0-rc.10.13'],
  [artifacts.includes('export function compileSolutionDeliveryPack'), 'compileSolutionDeliveryPack must be exported'],
  [artifacts.includes('solution-architecture-document.md'), 'Solution Architecture Document must be generated'],
  [artifacts.includes('adr-pack.md'), 'ADR pack must be generated'],
  [artifacts.includes('integration-catalogue.md'), 'integration catalogue must be generated'],
  [artifacts.includes('risk-register.md'), 'risk register must be generated'],
  [artifacts.includes('fitness-tests.json'), 'fitness-test JSON pack must be generated'],
  [artifacts.includes('implementation-backlog.json'), 'implementation backlog JSON must be generated'],
  [artifacts.includes('evidence-traceability.md'), 'evidence traceability report must be generated'],
  [artifacts.includes('handoff/manifest.json'), 'handoff manifest must be generated'],
  [api.includes('/api/review-studio/handoff-pack'), 'handoff pack API route must be registered'],
  [api.includes('compileSolutionDeliveryPack'), 'API route must call the canonical handoff pack generator'],
  [studio.includes("import('@aiw/artifacts')") && studio.includes('compileSolutionDeliveryPack'), 'Review Studio UI must dynamically use the handoff pack generator'],
  [studio.includes('aiw-solution-delivery-pack.json'), 'Review Studio UI must expose handoff pack download'],
];
const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) throw new Error(`Sprint 8.9.1 verification failed:\n- ${failed.join('\n- ')}`);
console.log('Sprint 8.9.1 Solution Delivery Pack & Architecture Handoff verification passed.');
