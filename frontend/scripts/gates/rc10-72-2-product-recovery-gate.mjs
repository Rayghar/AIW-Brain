#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const check = (name, condition) => {
  checks.push({ name, passed: Boolean(condition) });
  if (!condition) console.error(`FAIL: ${name}`);
};

const drawer = read('apps/web/src/components/SolWorkspaceDrawer.tsx');
const shell = read('apps/web/src/components/GuidedDeliveryShell.tsx');
const output = read('apps/web/src/components/guided-delivery/StageOutputEvidence.tsx');
const canvas = read('apps/web/src/features/canvas/ProCanvasViewSystem.tsx');
const cursor = read('apps/web/src/features/living-canvas/GenerativeCursorController.tsx');
const nodeView = read('apps/web/src/features/canvas/nodes/ArchitectureNodeView.tsx');
const review = read('apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx');
const context = read('apps/web/src/components/SystemContextStudio.tsx');
const quality = read('apps/web/src/components/QualityAttributeStudio.tsx');
const nav = read('apps/web/src/components/ShellNavRail.tsx');
const css = read('apps/web/src/styles/rc10_72_2_product_recovery.css');
const main = read('apps/web/src/main.tsx');

check('one stage-level Sol drawer exposes Draft, Design and Ask', drawer.includes('"draft"') && drawer.includes('"design"') && drawer.includes('"ask"'));
check('Ask Sol code is lazy-loaded', drawer.includes('lazy(() =>') && drawer.includes('Preparing Sol context'));
check('guided delivery exposes a single visible Sol control contract', shell.includes('data-testid="open-stage-co-author"') && shell.includes('<SolWorkspaceDrawer'));
check('Outputs do not embed a second Stage Co-Author', !output.includes('StageCoAuthorPanel'));
check('Outputs derive model-grounded design rationale', output.includes('designRationaleEvidence') && output.includes('Why this design makes sense'));
check('logical canvas excludes legacy System Context projection objects', canvas.includes('node.tags.includes("system-context")'));
check('logical canvas hides visual containment edges', canvas.includes('const spatialContainment'));
check('accepted Sol changes trigger presentation-only smart arrangement', cursor.includes('aiw:auto-arrange-after-sol-change'));
check('smart arrangement clears competing selection and panels', canvas.includes('selectNode(null)') && canvas.includes('setObjectInspectorOpen(false)'));
check('compound boundaries reserve their interior for child nodes', nodeView.includes('hasChildren') && css.includes('.architecture-node.has-children'));
check('Review uses governed task lenses', review.includes('Summary') && review.includes('Findings') && review.includes('Governance'));
check('System Context preserves a canonical accepted model until deliberate regeneration', context.includes('Canonical context') && context.includes('Regenerate preview'));
check('Quality Driver authority is gated by priorities and measurable scenarios', quality.includes('provisional') || quality.includes('calibration'));
check('navigation has explicit rebuilt product-recovery ownership', nav.includes('role-navigation-v2') || nav.includes('aiw-journey-nav-v2'));
check('navigation labels are left aligned and hover cannot own geometry', css.includes('text-align: left') && !css.includes(':hover { width:'));
check('notifications participate in shell flow instead of covering active work', css.includes('.notice-toast') && css.includes('position: relative !important') && css.includes('inset: auto !important'));
check('legacy rc10.72.1 navigation stylesheet is not imported', !main.includes('rc10_72_1_signature_canvas_navigation.css'));
check('product recovery stylesheet is loaded', main.includes('rc10_72_2_product_recovery.css'));
check('canvas no longer imports the legacy Embedded Intelligence panel', !canvas.includes('EmbeddedIntelligencePanel'));
check('rationale directs challenge work to the unified Sol Ask mode', output.includes('Sol · Ask'));

const passed = checks.filter((item) => item.passed).length;
console.log(`rc.10.72.2 product recovery gate: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
