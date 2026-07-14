import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const app = await readFile(resolve(root, 'apps/api/src/app.ts'), 'utf8');
const referenceProject = await readFile(resolve(root, 'apps/api/src/referenceProject.ts'), 'utf8');
const tests = await readFile(resolve(root, 'apps/api/test/rc10_51_role_truth.test.ts'), 'utf8');
const checks = [
  ['reference project is seeded with role-specific members', app.includes('withReferenceMembers(sampleProject)') && referenceProject.includes('REFERENCE_PROJECT_MEMBERS')],
  ['demo project is loaded from the repository', app.includes('app.get("/api/projects/demo"') && app.includes('repository.getProject(\n        referenceSampleProject.tenantId')],
  ['project writes authorize against stored membership', app.includes('canPerform(existing, principal.subject, "project.edit")')],
  ['client membership changes require member-manage authority', app.includes('memberSetsMatch(existing.members, project.members)') && app.includes('"member.manage"')],
  ['self-grant attack has a negative regression test', tests.includes('prevents a client from granting itself project access')],
  ['demo freshness has a regression test', tests.includes('returns the latest stored demo project revision')],
];
let failed = 0;
for (const [label, ok] of checks) { if (ok) console.log(`PASS ${label}`); else { console.error(`FAIL ${label}`); failed += 1; } }
if (failed) process.exit(1);
console.log(`rc.10.52 project truth gate passed (${checks.length}/${checks.length}).`);
