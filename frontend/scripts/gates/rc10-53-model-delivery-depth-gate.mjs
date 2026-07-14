import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const lines = (file) => read(file).split(/\r?\n/).length;
const assertions = [
  ['guided shell decomposed', lines('apps/web/src/components/GuidedDeliveryShell.tsx') <= 380],
  ['guided delivery facade decomposed', lines('apps/web/src/lib/guidedDelivery.ts') <= 60],
  ['assessment module exists', fs.existsSync(path.join(root, 'apps/web/src/lib/guidedDeliveryAssessment.ts'))],
  ['stage definitions module exists', fs.existsSync(path.join(root, 'apps/web/src/lib/guidedDeliveryStages.ts'))],
  ['stage evidence module exists', fs.existsSync(path.join(root, 'apps/web/src/components/guided-delivery/StageOutputEvidence.tsx'))],
  ['sdd delivery module exists', fs.existsSync(path.join(root, 'apps/web/src/components/guided-delivery/SddDeliveryWorkspace.tsx'))],
  ['stage evidence export', read('apps/web/src/components/guided-delivery/StageOutputEvidence.tsx').includes('Export stage evidence')],
  ['task evidence matrix', read('apps/web/src/components/guided-delivery/StageOutputEvidence.tsx').includes('Task-to-evidence matrix')],
  ['active task contract', read('apps/web/src/components/GuidedDeliveryShell.tsx').includes('guided-active-task-contract')],
  ['full SDD sections', read('packages/engine/src/sddSections.ts').includes('18. Model lineage, conformance and handoff traceability')],
  ['interface register artifact', read('packages/artifacts/src/index.ts').includes('handoff/interface-register.csv')],
  ['lineage diagram artifact', read('packages/artifacts/src/index.ts').includes('handoff/diagrams/cross-stage-lineage.mmd')],
];
const failed = assertions.filter(([, ok]) => !ok);
for (const [name, ok] of assertions) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) process.exit(1);
console.log(`rc.10.53 model-to-delivery depth gate passed (${assertions.length}/${assertions.length}).`);
