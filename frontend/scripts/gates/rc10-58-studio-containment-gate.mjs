import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const failures = [];
const checks = [];
function source(path) { return readFileSync(resolve(root, path), 'utf8'); }
function check(name, condition, detail='') {
  checks.push({ name, passed: Boolean(condition), detail });
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}
const pkg = JSON.parse(source('package.json'));
const topbar = source('apps/web/src/components/ShellTopbar.tsx');
const library = source('apps/web/src/components/ArchitectureLibrary.tsx');
const canvas = source('apps/web/src/features/canvas/ProCanvasViewSystem.tsx');
const css = source('apps/web/src/design-system/product-experience.css');

check('rc.10.58 canonical frontend version', pkg.version === '0.10.0-rc.10.58.0');
check('topbar work-mode label is screen-reader-only', topbar.includes('<span className="sr-only">Work modes</span>') && !topbar.includes('topbar-flow-menu__label'));
check('work-mode explanation remains discoverable', topbar.includes('Explain work modes'));
check('object inspector is closed by default', canvas.includes('useState(false)') && canvas.includes('setObjectInspectorOpen'));
check('inspector opens from object selection', canvas.includes('if (selectedNodeId) {') && canvas.includes('setObjectInspectorOpen(true)'));
check('constrained panel drawers are mutually exclusive', canvas.includes('window.innerWidth <= 1700') && canvas.includes('setLibraryOpen(false)'));
check('secondary canvas actions are consolidated', canvas.includes('stage-studio-more') && canvas.includes('MoreHorizontal') && canvas.includes('Brain signals'));
check('compact current-model scope is present', canvas.includes('stage-studio-focus') && canvas.includes('Current model scope'));
check('library context is compact and expandable', library.includes('library-context-card') && library.includes('library-context-disclosure'));
check('library tabs expose selected state', library.includes('aria-selected'));
check('responsive library becomes an overlay drawer', css.includes('.resizable-studio-panel--library') && css.includes('position: absolute !important') && css.includes('@media (max-width: 1700px)'));
check('responsive inspector and brain become overlay drawers', css.includes('.resizable-studio-panel--inspector') && css.includes('.resizable-studio-panel--brain'));
check('canvas containment rules exist', css.includes('grid-template-columns: 54px minmax(0,1fr) !important') && css.includes('max-width: 100% !important'));
check('canvas legend is moved away from primary actions', css.includes('.canvas-legend-strip') && css.includes('bottom: 12px !important'));
check('browser acceptance specification exists', source('tests/e2e/rc10-58-studio-containment.spec.ts').includes('studio containment and canvas-first remediation'));

console.log(JSON.stringify({ release: 'rc.10.58', checks, passed: failures.length === 0 }, null, 2));
if (failures.length) {
  console.error(`\nrc.10.58 Studio Containment gate failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
