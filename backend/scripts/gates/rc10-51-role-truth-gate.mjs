import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const identity = read('apps/api/src/identity.ts');
const routes = read('apps/api/src/routes/reviewStudioRoutes.ts');
const engine = read('packages/engine/src/rbac.ts');
const adminRoutes = read('apps/api/src/routes/adminControlPlaneRoutes.ts');
const knowledgeRoutes = read('apps/api/src/routes/knowledgeOpsRoutes.ts');
const releaseRoutes = read('apps/api/src/routes/knowledgeReleaseRoutes.ts');
const checks = [
  ['Architecture role identities are recognised', identity.includes("'solution-architect'") && identity.includes("'platform-architect'")],
  ['Review execution is permission-gated', routes.includes("hasPermission(principal, 'review.run')")],
  ['Handoff generation is permission-gated', routes.includes("hasPermission(principal, 'artifact.generate')")],
  ['Reviewer can disposition but not generate artefacts', engine.includes("'review.disposition'") && !/architecture-reviewer[^\n]*artifact\.generate/.test(engine)],
  ['Solution architect can generate artefacts', engine.includes("'artifact.generate'") && engine.includes("'solution-architect'")],
  ['Admin and knowledge reads have distinct permissions', engine.includes("'admin.control-plane.read'") && engine.includes("'knowledge.read'") && engine.includes("'model-route.read'")],
  ['Admin read routes enforce backend permission checks', adminRoutes.includes("denyRead(reply, principal, 'admin.control-plane.read')") && adminRoutes.includes("denyRead(reply, principal, 'tenant.read')")],
  ['Knowledge and release reads enforce backend permission checks', knowledgeRoutes.includes("requireRead(reply, principal, 'audit.read')") && releaseRoutes.includes("deny(reply, principal, 'release.read')")],
];
const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
if (failed.length) process.exit(1);
console.log(`rc.10.51 backend gate passed (${checks.length}/${checks.length}).`);
