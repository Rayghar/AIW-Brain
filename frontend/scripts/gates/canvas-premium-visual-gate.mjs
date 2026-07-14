#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const jsx = readFileSync('apps/web/src/features/canvas/ProCanvasViewSystem.tsx', 'utf8');
const css = readFileSync('apps/web/src/features/canvas/canvas-view-system.css', 'utf8');
const requiredJsx = ['canvas-visual-lens-bar', 'canvas-atmosphere', 'canvas-legend-strip', 'visualLensSummary'];
const requiredCss = ['premium architecture canvas visual refinement', '.canvas-visual-lens-bar', '.canvas-atmosphere', '.canvas-legend-strip', '.legend-dot--signal'];
const missing = [
  ...requiredJsx.filter((needle) => !jsx.includes(needle)).map((needle) => `ProCanvasViewSystem.tsx missing ${needle}`),
  ...requiredCss.filter((needle) => !css.includes(needle)).map((needle) => `canvas-view-system.css missing ${needle}`),
];
if (missing.length) {
  console.error('Canvas premium visual gate failed:');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}
console.log('Canvas premium visual gate passed.');
