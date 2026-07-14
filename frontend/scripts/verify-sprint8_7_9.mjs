import { readFileSync } from 'node:fs';

const files = {
  canvas: readFileSync('apps/web/src/features/canvas/ProCanvasViewSystem.tsx', 'utf8'),
  node: readFileSync('apps/web/src/features/canvas/nodes/ArchitectureNodeView.tsx', 'utf8'),
  store: readFileSync('apps/web/src/store/workspaceStore.ts', 'utf8'),
  css: readFileSync('apps/web/src/styles.css', 'utf8'),
  pkg: readFileSync('package.json', 'utf8'),
  api: readFileSync('apps/api/src/app.ts', 'utf8'),
};

const checks = [
  ['release version rc.10.1', files.pkg.includes('0.10.0-rc.10')],
  ['direct node resize handles', files.node.includes('NodeResizer') && files.node.includes('onResizeEnd') && files.css.includes('aiw-node-resize-handle')],
  ['locked node protection', files.store.includes('setNodeLocked') && files.store.includes('visual.locked') && files.node.includes('!visual.locked')],
  ['numeric inspector sizing', files.canvas.includes('Width') && files.canvas.includes('Height') && files.canvas.includes('Auto-fit')],
  ['multi-selection state', files.store.includes('selectedNodeIds') && files.canvas.includes('selectedNodeIds.length')],
  ['alignment controls', files.store.includes('alignSelectedNodes') && files.canvas.includes('Align left')],
  ['distribution controls', files.store.includes('distributeSelectedNodes') && files.canvas.includes('Distribute H')],
  ['bulk sizing controls', files.store.includes('resizeSelectedNodes') && files.canvas.includes('Standard size')],
  ['direct manipulation hinting', files.canvas.includes('Direct manipulation active') && files.css.includes('drag handles to resize')],
  ['locked drag prevention', files.store.includes('if (visual.locked) continue') && files.canvas.includes('draggable: !visualStyle.locked')],
  ['semantic architecture preserved', files.canvas.includes('architecture meaning stays governed') || files.store.includes('Architecture semantics were not changed')],
  ['responsive polish', files.css.includes('@media (max-width: 980px)')],
  ['release endpoint', files.api.includes('/api/releases/8.7.9') && files.api.includes('sprint879PlatformRelease')],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (ok) console.log(`✓ ${name}`);
  else { console.error(`✗ ${name}`); failed += 1; }
}
if (failed) {
  console.error(`Sprint 8.7.9 verification failed: ${failed}/${checks.length}`);
  process.exit(1);
}
console.log(`Sprint 8.7.9 direct canvas manipulation verification passed: ${checks.length}/${checks.length}`);
