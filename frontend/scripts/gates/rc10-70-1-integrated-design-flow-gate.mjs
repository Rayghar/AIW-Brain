import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'apps/web/src');
const read = async (path) => readFile(resolve(root, path), 'utf8');
const checks = [];
const check = (name, condition, detail) => {
  if (!condition) throw new Error(`FAIL ${name}: ${detail}`);
  checks.push(name);
};

const shell = await read('components/GuidedDeliveryShell.tsx');
const output = await read('components/guided-delivery/StageOutputEvidence.tsx');
const coauthor = await read('components/StageCoAuthorPanel.tsx');
const brain = await read('components/CoArchitectPanel.tsx');
const nav = await read('components/ShellNavRail.tsx');
const css = await read('styles/rc10_70_1_integrated_design_flow.css');
const main = await read('main.tsx');

check('visible-stage-co-author-entry', /Auto-populate (?:stage draft|missing fields|draft)/.test(shell), 'Sol drafting is not visible in the stage flow');
check('co-author-portal', /createPortal/.test(shell) && /stage-co-author-drawer-layer/.test(shell), 'Stage Co-Author must use a top-level drawer');
check('actual-canonical-output', /actualOutput/.test(output) && /actual-stage-output-/.test(output), 'Outputs must render canonical stage content');
check('rationale-inside-output', /guided-design-rationale/.test(output) && /variant="output"/.test(output), 'Design rationale must be part of Outputs');
check('workspace-output-separation', /variant\?: 'workspace' \| 'output'/.test(coauthor), 'Co-author needs distinct work and explanation modes');
check('structured-proposal-action', /Auto-populate missing fields with Sol/.test(coauthor) && /Accept selected/.test(coauthor), 'Structured draft acceptance controls are missing');
check('brain-layout', /Guidance/.test(brain) && /History/.test(brain) && /Current guidance/.test(brain), 'Architecture Brain hierarchy is incomplete');
check('explicit-rail-only', !/navDensity|role-nav-density|product-nav|studio-nav/.test(nav), 'Legacy density or hover-navigation implementation remains in ShellNavRail');
check('stable-rail-css', /only explicit pin\/collapse changes width/i.test(css) && /guided-delivery formerly hid\/reflowed/i.test(css), 'Stable navigation cascade lock is missing');
check('actual-output-theme', /guided-actual-output/.test(css) && /guided-design-rationale/.test(css), 'Output/rationale theme is missing');
check('brain-minimum-width', /min-width: 420px/.test(css), 'Architecture Brain minimum usable width is missing');
check('final-style-import', main.trimEnd().endsWith("import './styles/rc10_70_1_integrated_design_flow.css';"), 'Integrated release stylesheet must load last');

for (const legacyFile of [
  'components/DesignBriefStudio.tsx',
  'components/QualityAttributeStudio.tsx',
  'features/canvas/ProCanvasViewSystem.tsx',
  'features/review-studio/ArchitectureReviewStudio.tsx',
  'components/ReviewerAssuranceStudio.tsx',
  'components/guided-delivery/SddDeliveryWorkspace.tsx',
]) {
  const source = await read(legacyFile);
  check(`no-grafted-coauthor:${legacyFile}`, !/StageCoAuthorPanel/.test(source), 'Stage Co-Author remains grafted inside a specialist page');
}

console.log(`PASS rc.10.70.1 integrated design-flow gate (${checks.length} checks)`);
