import fs from 'node:fs';

const checks = [
  ['apps/web/src/components/ProjectHub.tsx', 'createReadiness', 'create flow has explicit readiness model'],
  ['apps/web/src/components/ProjectHub.tsx', 'Add ${createReadiness.missing', 'disabled create button explains missing required fields'],
  ['apps/web/src/components/ProjectHub.tsx', 'starter-validation-panel', 'project creation uses readable validation panel'],
  ['apps/web/src/components/InfoCenterPanel.tsx', 'info-center--compact', 'Info Center has compact default mode'],
  ['apps/web/src/components/InfoCenterPanel.tsx', 'Show observations, evidence and provenance', 'Info Center supports progressive detail'],
  ['apps/web/src/features/canvas/ProCanvasViewSystem.tsx', 'toggleCanvasEditing', 'canvas editing has controlled enable/lock flow'],
  ['apps/web/src/features/canvas/ProCanvasViewSystem.tsx', 'canvas-edit-primer', 'canvas edit mode has visible guidance'],
  ['apps/web/src/features/canvas/ProCanvasViewSystem.tsx', 'useState(false);\n  const [toolDockOpen', 'guided flow is collapsed by default so the canvas appears sooner'],
  ['apps/web/src/design-system/product-experience.css', 'rc.10.48.3', 'rc.10.48.3 CSS refinement marker exists'],
  ['apps/web/src/design-system/product-experience.css', '.architecture-stage-rail {\n  position: sticky;', 'lifecycle stage rail remains visible while working'],
];

let failed = false;
for (const [file, needle, label] of checks) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(needle)) {
    console.error(`✗ ${label}: missing ${needle} in ${file}`);
    failed = true;
  } else {
    console.log(`✓ ${label}`);
  }
}
if (failed) process.exit(1);
