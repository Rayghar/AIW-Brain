import fs from 'node:fs';

const checks = [
  ['apps/web/src/components/WorkspaceIntelligenceMap.tsx', 'useReactFlow', 'map uses ReactFlow instance API'],
  ['apps/web/src/components/WorkspaceIntelligenceMap.tsx', 'reactFlow.fitView', 'fit view uses instance API'],
  ['apps/web/src/components/WorkspaceIntelligenceMap.tsx', 'reactFlow.setCenter', 'center map uses instance API'],
  ['apps/web/src/components/WorkspaceIntelligenceMap.tsx', 'exportSvgMap', 'SVG export exists'],
  ['apps/web/src/components/WorkspaceIntelligenceMap.tsx', 'exportPngMap', 'PNG export exists'],
  ['apps/web/src/features/canvas/ProCanvasViewSystem.tsx', 'resizable-studio-panel__drag-handle', 'direct drag handle exists'],
  ['apps/web/src/features/canvas/ProCanvasViewSystem.tsx', 'onPointerDown={startResize}', 'direct pointer resize wiring exists'],
  ['apps/web/src/features/canvas/ProCanvasViewSystem.tsx', 'aiw:canvas-focus-start', 'canvas focus event exists'],
  ['apps/web/src/components/BottomDock.tsx', 'aiw:canvas-focus-start', 'bottom dock listens for canvas focus'],
  ['apps/web/src/design-system/product-experience.css', 'resizable-studio-panel__drag-handle', 'drag handle styling exists'],
];

const failures = [];
for (const [path, needle, label] of checks) {
  const text = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
  if (!text.includes(needle)) failures.push(`${label}: missing ${needle} in ${path}`);
}
if (failures.length) {
  console.error('rc.10.48.14 gate failed');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('rc.10.48.14 gate passed: ReactFlow instance controls, map SVG/PNG export, direct panel drag handles and canvas dock auto-minimize are present.');
