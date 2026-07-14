import { readFileSync } from 'node:fs';

const files = {
  canvas: readFileSync('apps/web/src/features/canvas/ProCanvasViewSystem.tsx', 'utf8'),
  node: readFileSync('apps/web/src/features/canvas/nodes/ArchitectureNodeView.tsx', 'utf8'),
  store: readFileSync('apps/web/src/store/workspaceStore.ts', 'utf8'),
  style: readFileSync('apps/web/src/styles.css', 'utf8'),
  app: readFileSync('apps/web/src/App.tsx', 'utf8'),
  helper: readFileSync('apps/web/src/lib/canvasIntelligence.ts', 'utf8'),
};
const checks = [
  ['tool rail', files.canvas.includes('CanvasToolRail') && files.canvas.includes('canvasToolMode')],
  ['object inspector', files.canvas.includes('CanvasObjectInspector') && files.canvas.includes('Style and size')],
  ['semantic palettes', files.helper.includes('semanticVisualStyleForNode') && files.store.includes('applySemanticStyleToCanvas')],
  ['node resize persistence', files.store.includes('resizeNode') && files.helper.includes('__visualStyle')],
  ['intelligent layout preview', files.helper.includes('createIntelligentLayoutPreview') && files.store.includes('applyLayoutPreview')],
  ['layout modes', ['event-flow','security','deployment','portfolio','conformance','c4'].every((x) => files.canvas.includes(x))],
  ['progressive disclosure', files.canvas.includes('canvasDensity') && files.node.includes('architecture-node--density')],
  ['focus mode', files.canvas.includes('canvasFocusMode') && files.node.includes('is-focus-dimmed')],
  ['command palette', files.app.includes('command-palette') && files.app.includes('Ctrl K')],
  ['premium styling', files.style.includes('Sprint 8.7.7') && files.style.includes('canvas-control-dock')],
  ['build metadata', readFileSync('package.json', 'utf8').includes('0.10.0-rc.10')],
  ['public npm registry', !readFileSync('package-lock.json', 'utf8').includes('applied-caas-gateway')],
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Sprint 8.7.7 verification failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}
console.log(`Sprint 8.7.7 visual modelling studio gate passed: ${checks.length}/${checks.length}.`);
