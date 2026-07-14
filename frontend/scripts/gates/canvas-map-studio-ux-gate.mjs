import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const component = fs.readFileSync(path.join(root, 'apps/web/src/components/WorkspaceIntelligenceMap.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'apps/web/src/styles/rc10_48_13_canvas_studio_controls.css'), 'utf8');
const checks = [
  ['studio map modifier', component.includes('journey-intelligence-map--studio')],
  ['state pill', component.includes('map-state-pill')],
  ['command deck', component.includes('journey-intelligence-map__command-deck')],
  ['preview card actions', component.includes('journey-intelligence-preview-card__actions')],
  ['tool menu', component.includes('map-tools-menu__panel')],
  ['copy/export functions', component.includes('copyMapSummary') && component.includes('exportMap')],
  ['no full-width Open interactive map', !component.includes('Open interactive map')],
  ['premium background', css.includes('radial-gradient') && css.includes('box-shadow')],
  ['non stretch action CSS', css.includes('.journey-intelligence-map .map-action') && css.includes('max-width: max-content')],
  ['preview grid not full-width CTA', css.includes('journey-intelligence-preview-card') && css.includes('journey-intelligence-static-preview--studio')],
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('canvas map studio ux gate failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}
console.log(`canvas map studio ux gate passed (${checks.length} checks)`);
