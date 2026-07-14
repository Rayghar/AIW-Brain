import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const root = process.cwd();
const read = (p) => readFileSync(join(root, p), 'utf8');
const checks = [
  {
    name: 'Canvas panels are genuinely size-aware and persisted',
    file: 'apps/web/src/features/canvas/ProCanvasViewSystem.tsx',
    patterns: ['StudioPanelFrame', 'aiw.studio.panelWidths', 'resizable-studio-panel__slider', '--aiw-library-panel-w', 'updatePanelWidth'],
  },
  {
    name: 'Resizable panel CSS overrides fixed grid templates',
    file: 'apps/web/src/design-system/product-experience.css',
    patterns: ['resizable-studio-layout.library-open.brain-open.inspector-open', 'var(--aiw-library-panel-w)', 'var(--aiw-brain-panel-w)', 'var(--aiw-inspector-panel-w)'],
  },
  {
    name: 'SDD Pack is a terminal delivery room, not a normal stage card',
    file: 'apps/web/src/components/ArchitectureLifecycleJourney.tsx',
    patterns: ['sdd-delivery-room', 'Terminal architecture delivery', 'Generate delivery pack', 'delivery readiness', 'Pack contents'],
  },
  {
    name: 'SDD terminal experience has dedicated visual treatment',
    file: 'apps/web/src/design-system/product-experience.css',
    patterns: ['.sdd-delivery-room', '.sdd-delivery-room__hero', '.sdd-delivery-room__readiness', '.sdd-delivery-room__checklist'],
  },
  {
    name: 'Golden path test and Playwright config are present',
    file: 'tests/e2e/aiw-golden-journey.spec.ts',
    patterns: ['AIW golden architecture journey', 'focus workspace', 'sdd pack'],
  },
];
const failures = [];
for (const check of checks) {
  const content = read(check.file);
  for (const pattern of check.patterns) if (!content.includes(pattern)) failures.push(`${check.name}: missing ${pattern} in ${check.file}`);
}
if (!existsSync(join(root, 'playwright.config.ts'))) failures.push('Playwright config missing at frontend/playwright.config.ts');
const pkg = JSON.parse(read('package.json'));
if (!pkg.scripts?.['rc10_48_6:verify']) failures.push('package.json missing rc10_48_6:verify script');
if (failures.length) {
  console.error('Resizable SDD golden gate failed:');
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}
console.log('Resizable SDD golden gate passed.');
