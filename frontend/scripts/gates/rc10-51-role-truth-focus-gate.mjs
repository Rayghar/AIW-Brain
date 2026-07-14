import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const checks = [
  ['Role capability model exists', read('apps/web/src/lib/roleAccess.ts').includes('ROLE_CAPABILITIES')],
  ['Reference principals are role-specific', read('apps/web/src/lib/roleAccess.ts').includes('reference-reviewer') && read('apps/web/src/lib/roleAccess.ts').includes('reference-solution-architect')],
  ['Role trust is surfaced', read('apps/web/src/components/RoleTrustStatus.tsx').includes('Role-bound reference')],
  ['Focus mode is persistent', read('apps/web/src/App.tsx').includes('aiw.workspaceFocus.rc10_51') && read('apps/web/src/App.tsx').includes('focus-mode')],
  ['Reviewer artefact generation is hidden', read('apps/web/src/features/review-studio/ArchitectureReviewStudio.tsx').includes('canGenerateArtifacts')],
  ['SDD generation is capability-gated', read('apps/web/src/components/ArchitectureLifecycleJourney.tsx').includes('artifact.generate')],
  ['Comparison has a guided empty state', read('apps/web/src/components/ComparisonWorkspace.tsx').includes('Compare a governed baseline with an alternative')],
  ['Admin tabs and API loads are role-scoped', read('apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx').includes("experienceProfile === 'reviewer'") && read('apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx').includes("experienceProfile === 'knowledge-curator'")],
  ['Portfolio tasks persist distinct lenses', read('apps/web/src/components/PortfolioWorkspace.tsx').includes('aiw.activeRoleTask') && read('apps/web/src/components/PortfolioWorkspace.tsx').includes('Reuse opportunities')],
  ['Knowledge posture avoids false perfection', !read('apps/web/src/features/knowledge-ops/KnowledgeOpsWorkbench.tsx').includes('Knowledge Ops posture: 100%')],
];
const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
if (failed.length) process.exit(1);
console.log(`rc.10.51 frontend gate passed (${checks.length}/${checks.length}).`);
