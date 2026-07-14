import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mapSource = fs.readFileSync(path.join(root, 'apps/web/src/components/WorkspaceIntelligenceMap.tsx'), 'utf8');
const styles = [
  'apps/web/src/styles.css',
  'apps/web/src/styles/rc10_48_12_canvas_map_toolbar.css',
  'apps/web/src/styles/rc10_48_13_canvas_studio_controls.css',
].map((file) => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '').join('\n');
const main = fs.readFileSync(path.join(root, 'apps/web/src/main.tsx'), 'utf8');

const checks = [
  ['compact studio toolbar class', mapSource.includes('journey-intelligence-map__toolbar--studio')],
  ['identity and command deck split', mapSource.includes('journey-intelligence-map__identity') && mapSource.includes('journey-intelligence-map__command-deck')],
  ['tool menu exists for secondary controls', mapSource.includes('map-tools-menu') && mapSource.includes('Fit view') && mapSource.includes('Center map')],
  ['additional map controls exist', mapSource.includes('Copy summary') && mapSource.includes('Export JSON') && mapSource.includes('Focus key nodes')],
  ['preview card replaces cut off full-width CTA', mapSource.includes('journey-intelligence-preview-card') && !mapSource.includes('Open interactive map')],
  ['utility strip replaces heavy right control card', mapSource.includes('journey-intelligence-map__utility-strip')],
  ['rc10.48.13 stylesheet imported', main.includes('rc10_48_13_canvas_studio_controls.css')],
  ['non-stretch actions protected', styles.includes('max-width: max-content') && styles.includes('width: auto !important')],
  ['menu panel styling exists', styles.includes('.map-tools-menu__panel')],
  ['responsive toolbar exists', styles.includes('@media (max-width: 1280px)')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('canvas map toolbar gate failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}
console.log(`canvas map toolbar gate passed (${checks.length} checks)`);
