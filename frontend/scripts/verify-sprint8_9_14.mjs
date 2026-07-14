import { readFileSync, existsSync } from 'node:fs';

const required = [
  ['apps/web/src/components/StudioSpecialistSurfaces.tsx', 'StudioWorkflowPanel'],
  ['apps/web/src/components/StudioSpecialistSurfaces.tsx', 'StudioActionStrip'],
  ['apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx', 'Register governed model route'],
  ['apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx', 'Register read-only repository connector'],
  ['apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx', 'Register governed knowledge source'],
  ['apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx', 'Guided admin workflows'],
  ['apps/web/src/features/knowledge-ops/KnowledgeOpsWorkbench.tsx', 'Claim review workflow'],
  ['apps/web/src/features/knowledge-ops/KnowledgeOpsWorkbench.tsx', 'Contradiction triage workflow'],
  ['apps/web/src/features/knowledge-ops/KnowledgeOpsWorkbench.tsx', 'Guided knowledge operations'],
  ['apps/web/src/styles.css', 'studio-workflow-panel'],
  ['apps/web/src/styles.css', 'studio-action-strip'],
  ['SPRINT8_9_14_FORM_WORKFLOW_SIMPLIFICATION.md', 'Sprint 8.9.14'],
  ['CHANGE_SUMMARY_v0.10.0-rc.10.33.md', 'v0.10.0-rc.10.33'],
];

const failures = [];
for (const [file, token] of required) {
  if (!existsSync(file)) {
    failures.push(`${file} is missing`);
    continue;
  }
  const text = readFileSync(file, 'utf8');
  if (!text.includes(token)) failures.push(`${file} does not contain ${token}`);
}

const packageJson = readFileSync('package.json', 'utf8');
if (!packageJson.includes('0.10.0-rc.10.33')) failures.push('package version not bumped to rc.10.31');
if (!packageJson.includes('sprint8_9_14:verify')) failures.push('sprint8_9_14 verify script not registered');

if (failures.length) {
  console.error('Sprint 8.9.14 verification failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('Sprint 8.9.14 form/workflow simplification verification passed.');
