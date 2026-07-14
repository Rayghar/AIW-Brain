import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const reviewStudioPath = 'apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx';
const appPath = 'apps/web/src/App.tsx';
const vitePath = 'apps/web/vite.config.ts';
const reviewStudio = readFileSync(reviewStudioPath, 'utf8');
const app = readFileSync(appPath, 'utf8');
const vite = readFileSync(vitePath, 'utf8');

const failures = [];
if (/^import\s+(?!type\b)[^;]+from ['"]@aiw\/artifacts['"]/m.test(reviewStudio)) failures.push('Review Studio must not statically import @aiw/artifacts. Use dynamic import for export generation.');
if (!reviewStudio.includes("import('@aiw/artifacts')")) failures.push('Review Studio must dynamically import @aiw/artifacts for handoff pack generation.');
if (!reviewStudio.includes('Download handoff ZIP')) failures.push('Review Studio must expose a ZIP export action.');
if (!reviewStudio.includes('buildHandoffPack')) failures.push('Review Studio must build the handoff pack on demand, not during render.');
if (!app.includes('const ArchitectureReviewStudio = lazy')) failures.push('Architecture Review Studio should be lazy-loaded from App.tsx.');
if (!vite.includes("return 'aiw-artifacts'")) failures.push('Vite manual chunks must keep @aiw/artifacts in a separate chunk.');
if (!vite.includes('chunkSizeWarningLimit')) failures.push('Vite config must declare an explicit chunk-size warning policy.');

const distDir = 'apps/web/dist/assets';
const assets = [];
if (existsSync(distDir)) {
  for (const entry of readdirSync(distDir)) {
    const path = join(distDir, entry);
    const stat = statSync(path);
    if (entry.endsWith('.js')) assets.push({ file: entry, bytes: stat.size, kb: Number((stat.size / 1024).toFixed(1)) });
  }
}
assets.sort((a, b) => b.bytes - a.bytes);
const report = {
  generatedAt: new Date().toISOString(),
  policy: {
    reviewStudioLazyLoaded: true,
    artifactsChunkLazyLoaded: true,
    maxSingleChunkKb: 650,
    note: 'The artifact generator may remain a large lazy chunk, but it must not be loaded on the initial Review Studio render path.',
  },
  jsAssets: assets,
  largestChunkKb: assets[0]?.kb ?? 0,
  artifactChunks: assets.filter((asset) => asset.file.includes('aiw-artifacts')),
};
writeFileSync('WEB_BUNDLE_REPORT_v0.10.0-rc.10.14.json', JSON.stringify(report, null, 2));

const oversize = assets.filter((asset) => asset.kb > report.policy.maxSingleChunkKb);
if (oversize.length) failures.push(`Web bundle budget exceeded: ${oversize.map((asset) => `${asset.file} ${asset.kb}KB`).join(', ')}`);

if (failures.length) {
  console.error('Web export/performance verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Web export/performance verification passed. Largest JS chunk: ${report.largestChunkKb}KB.`);
