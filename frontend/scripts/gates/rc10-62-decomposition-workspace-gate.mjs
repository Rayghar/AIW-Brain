import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const checks = [
  ['domain decomposition contract', 'packages/domain/src/architectureDecomposition.ts', 'ArchitectureDecompositionReport'],
  ['decomposition engine', 'packages/modelling/src/interactiveDecomposition.ts', 'validateArchitectureDecomposition'],
  ['viewbook hierarchy navigator', 'apps/web/src/features/canvas/ArchitectureViewbook.tsx', 'decomposition-navigator'],
  ['viewbook drill-down', 'apps/web/src/features/canvas/ArchitectureViewbook.tsx', 'Drill into'],
  ['view-to-canvas continuity', 'apps/web/src/features/canvas/ArchitectureViewbook.tsx', 'Open in modelling canvas'],
  ['workspace experience registry', 'apps/web/src/lib/workspaceExperienceRegistry.ts', 'workspaceExperienceRegistry'],
  ['task workspace frame', 'apps/web/src/components/TaskWorkspaceFrame.tsx', 'Outcome contract'],
  ['differentiating capability surface', 'apps/web/src/components/RoleCommandSurface.tsx', 'Architecture Exchange Centre'],
];
let passed=0;
for (const [label, relative, needle] of checks) {
  const file=path.join(root,relative);
  const ok=fs.existsSync(file) && fs.readFileSync(file,'utf8').includes(needle);
  console.log(`${ok?'PASS':'FAIL'} ${label}`);
  if (!ok) process.exitCode=1; else passed++;
}
console.log(`${passed}/${checks.length} rc.10.62 gates passed`);
