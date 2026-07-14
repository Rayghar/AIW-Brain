import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const checks = [
  ['apps/web/src/features/canvas/ProCanvasViewSystem.tsx', ['AccessibleModelWorkbench', 'accessible-model-workbench', 'review-accessible-placement', 'review-accessible-relationship']],
  ['apps/web/src/store/workspaceStore.ts', ['activeLifecycleStep', 'setActiveLifecycleStep', 'safeStructuredClone(state.project)']],
  ['apps/web/src/store/actions/lifecycleFlow.ts', ['recordReviewOutputs', 'review artifact(s) recorded against the governed baseline']],
  ['apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx', ['record-review-outputs', 'request-review-approval', 'Record ADRs &amp; fitness evidence']],
  ['apps/web/src/components/ArchitectureLifecycleJourney.tsx', ['SDD delivery room', 'Generate final SDD', 'architecture-stage-detail ${selectedStep.id === "sdd" ? "is-sdd" : ""}']],
  ['apps/web/src/design-system/product-experience.css', ['.architecture-stage-detail.is-sdd .stage-artifacts-card']],
  ['apps/web/src/features/canvas/canvas-view-system.css', ['.accessible-model-workbench', '.accessible-relationship-form']],
  ['tests/e2e/rc10-50-journey-closure.spec.ts', ['operate the model without drag and drop', 'governed ADR and fitness evidence', 'final SDD can be previewed']],
];
const failures=[];
for (const [file,patterns] of checks) {
  const full=path.join(root,file);
  if (!fs.existsSync(full)) { failures.push(`missing ${file}`); continue; }
  const content=fs.readFileSync(full,'utf8');
  for (const pattern of patterns) if (!content.includes(pattern)) failures.push(`${file} missing ${pattern}`);
}
if (failures.length) { console.error('rc.10.50 journey closure gate failed:\n'+failures.map(x=>` - ${x}`).join('\n')); process.exit(1); }
console.log(`rc.10.50 journey closure gate passed (${checks.length} surfaces).`);
