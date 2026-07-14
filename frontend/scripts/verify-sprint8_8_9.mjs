#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const read = (path) => readFileSync(path, 'utf8');
function check(name, ok) {
  if (ok) console.log(`PASS ${name}`);
  else { console.error(`FAIL ${name}`); failures.push(name); }
}
const pkg = JSON.parse(read('package.json'));
const rbac = read('packages/engine/src/rbac.ts');
const knowledgeOpsTest = read('packages/engine/test/knowledgeOps.test.ts');
const intelligencePkg = JSON.parse(read('packages/intelligence/package.json'));
const intelligenceIndex = read('packages/intelligence/src/index.ts');
const kernelFacade = read('packages/intelligence/src/kernel/index.ts');
const authority = read('packages/intelligence/src/authority-boundary/index.ts');
const packageIntegrity = read('scripts/verify-package-integrity.mjs');
const releaseHygiene = read('scripts/verify-release-hygiene.mjs');
const embeddedGate = read('scripts/verify-embedded-intelligence-regression.mjs');

check('package version is at least rc.10.11', /^0\.10\.0-rc\.10\.(1[1-9]|[2-9][0-9])$/.test(pkg.version));
check('sprint verify script registered', pkg.scripts?.['sprint8_8_9:verify']?.includes('verify-sprint8_8_9.mjs'));
check('release hygiene gate registered', pkg.scripts?.['release:hygiene'] === 'node scripts/verify-release-hygiene.mjs');
check('embedded intelligence regression gate registered', pkg.scripts?.['embedded-intelligence:regression'] === 'node scripts/verify-embedded-intelligence-regression.mjs');
check('package integrity verifies active root version', packageIntegrity.includes('JSON.parse(readFileSync(join(root, \'package.json\')'));
check('release hygiene explicitly checks tsbuildinfo', releaseHygiene.includes('.tsbuildinfo'));
check('RBAC denies unknown permissions before any role shortcut', rbac.includes('if (!allowed) return { ok: false') && !rbac.includes("roles.includes('platform-admin')) return { ok: true"));
check('RBAC tests assert platform-admin unknown permission denial', knowledgeOpsTest.includes("hasPermission({ roles: ['platform-admin'] }, 'not.a.permission').ok).toBe(false)"));
check('RBAC tests assert missing roles deny', knowledgeOpsTest.includes("hasPermission({}, 'release.promote').ok).toBe(false)"));
check('intelligence package depends on engine for canonical kernel ownership', intelligencePkg.dependencies?.['@aiw/engine'] === pkg.version);
check('intelligence index exposes kernel and authority boundary', intelligenceIndex.includes("export * from './kernel/index.js'") && intelligenceIndex.includes("export * from './authority-boundary/index.js'"));
check('kernel facade re-exports engine kernel without duplication', kernelFacade.includes("from '@aiw/engine'") && kernelFacade.includes('evaluateArchitectureEvent') && kernelFacade.includes('buildWorkspaceIntelligence'));
check('authority boundary blocks LLM scoring and mutation', authority.includes('llmMayScore: false') && authority.includes('llmMayMutateArchitecture: false'));
check('authority boundary blocks candidate knowledge in production', authority.includes('candidateKnowledgeMayInfluenceProduction: false'));
check('embedded regression gate checks approval-gated changes', embeddedGate.includes('requiresApproval: true'));
check('sprint documentation exists', existsSync('SPRINT8_8_9_RELEASE_STABILIZATION_KERNEL_BOUNDARY.md'));
check('build verification evidence exists', existsSync('BUILD_VERIFICATION_v0.10.0-rc.10.11.txt'));
check('change summary exists', existsSync('CHANGE_SUMMARY_v0.10.0-rc.10.11.md'));

if (failures.length) {
  console.error(`Sprint 8.8.9 verification failed with ${failures.length} issue(s).`);
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}
console.log('Sprint 8.8.9 Release Stabilization, Kernel Boundary and Build Hygiene verification passed.');
