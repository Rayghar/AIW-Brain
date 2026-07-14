import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const app = read('apps/web/src/App.tsx');
const router = read('apps/web/src/components/WorkspaceRouter.tsx');
const guided = read('apps/web/src/components/GuidedDeliveryShell.tsx');
const roleBar = read('apps/web/src/components/RoleProductBar.tsx');
const roleSurface = read('apps/web/src/components/RoleCommandSurface.tsx');
const reviewer = read('apps/web/src/components/ReviewerAssuranceStudio.tsx');
const shell = read('apps/web/src/lib/roleProductShell.ts');
const css = read('apps/web/src/styles/rc10_61_role_canvas_os.css');
const sample = read('packages/domain/src/sample.ts');
const pkg = JSON.parse(read('package.json'));
const release = read('packages/domain/src/release.ts');

const results = [];
function check(name, pass, actual = undefined) { results.push({ name, pass: Boolean(pass), actual }); }
check('release.version', pkg.version === '0.10.0-rc.10.61.0', pkg.version);
check('release.constant', release.includes("version: '0.10.0-rc.10.61.0'") && release.includes("releaseLine: 'rc.10.61'"));
check('role.product-bar-rendered', app.includes('<RoleProductBar'));
check('legacy.role-journey-removed', !app.includes('<RoleJourneyCompass'));
check('legacy.role-tools-removed', !app.includes('<RoleToolsTray'));
check('legacy.bottom-dock-removed', !app.includes('<BottomDock'));
check('reviewer.not-guided-producer-shell', /experienceProfileId\s*!==\s*[\"']reviewer[\"']/.test(app));
check('role.shells.six-defined', ['Architecture Studio','Portfolio Intelligence Studio','Platform Architecture Command Surface','Architecture Assurance Studio','Knowledge Studio','AIW Control Plane'].every((value) => shell.includes(value)));
check('role.bar.six-lenses', roleBar.includes('definition.lenses.map'));
check('command.surface.backend-capabilities', ['Observed architecture','Drift and remediation','Evidence ledger','Worker operations','Source connectors'].every((value) => roleSurface.includes(value)));
check('reviewer.assurance-route', router.includes('<ReviewerAssuranceStudio'));
check('reviewer.three-pane', ['Assigned review queue','Model and findings','Evidence and disposition'].every((value) => reviewer.includes(value)));
check('reviewer.producer-boundary', reviewer.includes('They cannot generate or silently modify'));
check('canvas.stage-detection', guided.includes('const isCanvasStage'));
check('canvas.defaults-to-compose', guided.includes('setPane(isCanvasStage ? \"work\" : \"plan\")') || guided.includes("setPane(isCanvasStage ? 'work' : 'plan')"));
check('canvas.compact-stagebar', guided.includes('canvas-os-stagebar'));
check('canvas.collapsible-lifecycle-rail', guided.includes('railCollapsed'));
check('canvas.minimum-height-budget', css.includes('calc(100vh - 340px)') && css.includes('min-height'));
check('universal-left-rail-removed', css.includes('.app-shell.role-centred-experience') && css.includes('.role-based-nav'));
check('reference-model.progressive-realisation', ['realization-api-gateway','module-order-outbox','event-order-submitted','module-payment-adapter','store-order-state'].every((value) => sample.includes(value)));
check('reference-model.progressive-technology', ['logical-api-management','logical-container-runtime','logical-event-streaming','logical-identity','logical-observability','logical-secrets'].every((value) => sample.includes(value)));
check('reference-model.progressive-deployment', ['physical-production','physical-region-primary','physical-api-gateway','physical-container-platform','physical-event-stream','physical-observability-stack'].every((value) => sample.includes(value)));
check('reference-model.interface-contracts', ['if-customer-order-api','if-order-submitted-event','if-payment-provider'].every((value) => sample.includes(value)));

for (const result of results) console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.name}${result.actual === undefined ? '' : ` :: ${result.actual}`}`);
const failed = results.filter((result) => !result.pass);
console.log(`\nAIW rc.10.61 frontend role-and-canvas gate: ${results.length - failed.length}/${results.length} passed.`);
if (failed.length) process.exit(1);
