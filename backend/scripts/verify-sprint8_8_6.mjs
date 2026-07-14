import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => { console.error(`Sprint 8.8.6 gate failed: ${message}`); process.exit(1); };
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const pkg = JSON.parse(read('package.json'));
if (!/^0\.10\.0-rc\.10\.(8|9|[1-9][0-9]+)$/.test(pkg.version)) fail(`root package version is ${pkg.version}`);

for (const retired of [
  'apps/web/src/components/CanvasWorkbench.tsx',
  'apps/web/src/components/ArchitectureNodeView.tsx',
]) {
  if (exists(retired)) fail(`retired canvas side path still exists: ${retired}`);
}

if (!exists('apps/web/src/features/canvas/ProCanvasViewSystem.tsx')) fail('ProCanvasViewSystem missing');
if (!exists('apps/web/src/features/canvas/nodes/ArchitectureNodeView.tsx')) fail('feature-owned ArchitectureNodeView missing');
if (!exists('apps/web/src/features/canvas/canvas-view-system.css')) fail('pro canvas CSS missing');

const app = read('apps/web/src/App.tsx');
if (!app.includes('ProCanvasViewSystem')) fail('App does not route design canvas to ProCanvasViewSystem');
if (/components\/CanvasWorkbench|components\/ArchitectureNodeView|CanvasWorkbench/.test(app)) fail('App still references retired canvas implementation');

const canvas = read('apps/web/src/features/canvas/ProCanvasViewSystem.tsx');
if (canvas.includes('window.prompt')) fail('Pro canvas uses window.prompt instead of structured UI');
for (const required of [
  'Named architecture view',
  'Create view',
  'Duplicate executive view',
  'Save version',
  'Bundle edges',
  'Presentation mode',
  'Export JSON',
  'Export SVG',
  'Export PDF manifest',
  'canvas-layer-comment-system',
  'addViewComment',
  'createArchitectureViewVersion',
  'deriveArchitectureLayers',
]) {
  if (!canvas.includes(required)) fail(`Pro canvas missing ${required}`);
}

const domain = read('packages/domain/src/architectureView.ts');
for (const required of [
  'ArchitectureViewLayer',
  'ArchitectureViewComment',
  'ArchitecturePresentationExport',
  'presentationMode',
  'visibleLayerIds',
]) {
  if (!domain.includes(required)) fail(`ArchitectureView domain missing ${required}`);
}

const modelling = read('packages/modelling/src/index.ts');
for (const required of [
  'createNamedArchitectureView',
  'createArchitectureViewVersion',
  'deriveArchitectureLayers',
  'toggleLayerVisibility',
  'addViewComment',
  'resolveViewVisibleNodeIds',
  'resolveViewVisibleEdgeIds',
  'createPresentationExportPayload',
]) {
  if (!modelling.includes(required)) fail(`@aiw/modelling missing ${required}`);
}

const css = read('apps/web/src/features/canvas/canvas-view-system.css');
for (const required of ['pro-view-system-panel','canvas-layer-list','canvas-comment-composer','is-presentation-mode','is-bundled']) {
  if (!css.includes(required)) fail(`Pro canvas CSS missing ${required}`);
}

console.log('Sprint 8.8.6 pro canvas gate passed: old canvas side paths removed, feature-owned ArchitectureView system active, named views/layers/comments/versions/presentation/export verified.');
