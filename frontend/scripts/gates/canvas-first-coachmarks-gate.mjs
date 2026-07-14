import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (relative) => readFileSync(join(root, relative), 'utf8');
const checks = [
  {
    name: 'Lifecycle uses a micro stage focus bar',
    file: 'apps/web/src/components/ArchitectureLifecycleJourney.tsx',
    patterns: ['micro-stage-focus-bar', 'Focus workspace', 'Show guide'],
  },
  {
    name: 'Collapsed lifecycle hides detailed stage card until requested',
    file: 'apps/web/src/components/ArchitectureLifecycleJourney.tsx',
    patterns: ['hidden={!detailOpen && selectedStep.id !== "sdd"}', 'is-guidance-collapsed'],
  },
  {
    name: 'Project Hub groups starters into recommended and advanced paths',
    file: 'apps/web/src/components/ProjectHub.tsx',
    patterns: ['RECOMMENDED_STARTER_IDS', 'ADVANCED_STARTER_IDS', 'starter-template-section--recommended', 'starter-template-section--advanced'],
  },
  {
    name: 'Info Center remembers compact/full preference locally',
    file: 'apps/web/src/components/InfoCenterPanel.tsx',
    patterns: ['aiw.infoCenter.mode', 'setInfoCenterCompact'],
  },
  {
    name: 'Canvas coachmarks are dismissible and restorable',
    file: 'apps/web/src/features/canvas/ProCanvasViewSystem.tsx',
    patterns: ['aiw.canvasCoachmarks.dismissed', 'canvas-coachmark-strip', 'dismissCanvasCoachmarks', 'reopenCanvasCoachmarks'],
  },
  {
    name: 'Canvas-first styling gives priority to the work surface',
    file: 'apps/web/src/design-system/product-experience.css',
    patterns: ['canvas-page--canvas-first', 'micro-stage-focus-bar', 'canvas-coachmark-strip', 'starter-template-groups'],
  },
];

const failures = [];
for (const check of checks) {
  const content = read(check.file);
  for (const pattern of check.patterns) {
    if (!content.includes(pattern)) failures.push(`${check.name}: missing ${pattern} in ${check.file}`);
  }
}

if (failures.length) {
  console.error('Canvas-first coachmarks gate failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('Canvas-first coachmarks gate passed.');
