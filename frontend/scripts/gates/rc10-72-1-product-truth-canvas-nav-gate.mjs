import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const read = async (relative) => readFile(resolve(root, relative), 'utf8');
const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, passed: Boolean(condition), detail });
  if (!condition) process.exitCode = 1;
}

const [canvas, layout, nav, navCss, main, lifecycle, brain, cursor, app] = await Promise.all([
  read('apps/web/src/features/canvas/ProCanvasViewSystem.tsx'),
  read('apps/web/src/lib/smartCanvasLayout.ts'),
  read('apps/web/src/components/ShellNavRail.tsx'),
  read('apps/web/src/styles/rc10_72_1_signature_canvas_navigation.css'),
  read('apps/web/src/main.tsx'),
  read('apps/web/src/lib/lifecycleStatusService.ts'),
  read('apps/web/src/components/CoArchitectPanel.tsx'),
  read('apps/web/src/features/living-canvas/GenerativeCursorController.tsx'),
  read('apps/web/src/App.tsx'),
]);

check('Smart layout contract exists', layout.includes('SmartCanvasLayoutMode'));
for (const mode of ['smart', 'tree-horizontal', 'tree-vertical', 'radial', 'grid']) {
  check(`Smart layout includes ${mode}`, layout.includes(`'${mode}'`) || layout.includes(`"${mode}"`));
}
check('Smart mode resolves from graph structure', layout.includes('chooseSmartMode'));
check('Smart mode uses graph density and acyclicity', layout.includes('acyclic') && layout.includes('density'));
check('Radial mode centres a high-degree node', layout.includes('highestDegree') || layout.includes('undirected.get(b.id)?.size'));
check('Child objects are arranged relative to parent boundaries', layout.includes('React Flow child coordinates are relative to the parent'));
check('Visible canvas arrange control exists', canvas.includes('data-testid="smart-arrange-canvas"'));
check('Arrange control is in the stage studio ribbon', canvas.indexOf('data-testid="smart-arrange-canvas"') > canvas.indexOf('stage-studio-actions'));
check('All five smart modes are user-selectable', ['Smart', 'Tree · left to right', 'Tree · top to bottom', 'Radial', 'Grid'].every((label) => canvas.includes(label)));
check('Arrange changes are reversible', canvas.includes('undoCanvasLayout') && canvas.includes('Undo canvas arrangement'));
check('Arrange closes competing panels before fitting', canvas.includes('setLibraryOpen(false)') && canvas.includes('setBrainSignalsOpen(false)') && canvas.includes('setObjectInspectorOpen(false)'));

check('Navigation v2 is the only role rail class', nav.includes('aiw-journey-nav-v2') && !nav.includes('role-based-nav') && !nav.includes('role-journey-rail') && !nav.includes('nav-item-label'));
check('Navigation exposes explicit state', nav.includes('data-state={navPinned ? "expanded" : "collapsed"}'));
check('Navigation labels are left-structured', nav.includes('aiw-journey-nav-v2__label'));
check('Navigation hover cannot resize the rail', navCss.includes('.aiw-journey-nav-v2:hover') && navCss.includes('width: var(--aiw-nav-current) !important'));
check('Navigation labels are explicitly left aligned', navCss.includes('text-align: left !important'));
check('Desktop shell has zero gap', navCss.includes('gap: 0 !important'));
check('Responsive rail is an overlay below 1440px', navCss.includes('@media (max-width: 1439px)') && navCss.includes('transform: translateX(-104%)'));
check('Navigation v2 stylesheet is imported last', main.trim().endsWith("import './styles/rc10_72_1_signature_canvas_navigation.css';"));
check('App shell uses v2 ownership classes', app.includes('aiw-shell-v2') && app.includes('aiw-shell-v2__main'));

const legacyCssFiles = [
  'apps/web/src/styles/rc10_61_role_canvas_os.css',
  'apps/web/src/styles/rc10_63_navigation_decision_flow.css',
  'apps/web/src/styles/rc10_68_llm_nav_polish.css',
  'apps/web/src/styles/rc10_69_outcome_lab.css',
  'apps/web/src/styles/rc10_70_1_integrated_design_flow.css',
  'apps/web/src/design-system/product-experience.css',
  'apps/web/src/design-system/guided-delivery.css',
];
const legacyCss = (await Promise.all(legacyCssFiles.map(read))).join('\n');
for (const selector of ['.role-based-nav', '.role-journey-rail', '.nav-item-label', '.role-nav-density', '.app-shell.nav-pinned']) {
  check(`Legacy navigation selector removed: ${selector}`, !legacyCss.includes(selector));
}

check('Viewbook route uses a durable pending-open handoff', nav.includes('aiw.pendingViewbookOpen') && canvas.includes('aiw.pendingViewbookOpen'));
check('Viewbook route mounts the actual Viewbook', canvas.includes('<ArchitectureViewbook'));
check('Lifecycle truth accepts an explicit active lifecycle step', lifecycle.includes('activeLifecycleStep?: DeliveryStageId | "overview"'));
check('Lifecycle next move does not force backward movement', lifecycle.includes('frontierIndex') && lifecycle.includes('Do not send an architect backwards'));
check('Architecture Brain displays project-stage-scope-revision truth', ['Project', 'Stage', 'Scope', 'Revision'].every((value) => brain.includes(`<dt>${value}</dt>`)));
check('Living Canvas clears stale keyboard slots on autonomy changes', cursor.includes('changeAutonomyMode') && cursor.includes('actionSlotsRef.current = []'));
check('Living Canvas queues numeric shortcuts against fresh actions', cursor.includes('pendingShortcutRef') && cursor.includes("refresh('candidate-requested')"));

console.log(`rc.10.72.1 product truth / signature canvas / navigation gate: ${checks.filter((item) => item.passed).length}/${checks.length} passed`);
for (const item of checks) console.log(`${item.passed ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
if (process.exitCode) process.exit(process.exitCode);
