#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
function text(path) { return readFileSync(path, 'utf8'); }
function check(name, ok) {
  if (ok) console.log(`PASS ${name}`);
  else { console.error(`FAIL ${name}`); failures.push(name); }
}

const kernel = text('packages/engine/src/intelligenceKernel.ts');
const intelligenceIndex = text('packages/intelligence/src/index.ts');
const intelligenceKernelFacade = text('packages/intelligence/src/kernel/index.ts');
const authority = text('packages/intelligence/src/authority-boundary/index.ts');
const rbac = text('packages/engine/src/rbac.ts');
const test = text('packages/engine/test/knowledgeOps.test.ts');

check('embedded kernel source exists', existsSync('packages/engine/src/intelligenceKernel.ts'));
check('intelligence package exposes canonical kernel facade', intelligenceIndex.includes("export * from './kernel/index.js'") && intelligenceKernelFacade.includes("from '@aiw/engine'"));
check('kernel evaluates architecture events from canonical project and library', kernel.includes('evaluateArchitectureEvent') && kernel.includes('ArchitectureProject') && kernel.includes('KnowledgeLibrary'));
check('candidate knowledge cannot influence production evidence', kernel.includes('candidateKnowledgeUsed: false'));
check('proposed change sets require approval', kernel.includes('requiresApproval: true'));
check('visual intelligence model remains generated from canonical project and kernel', kernel.includes("generatedFrom: 'canonical-project-and-intelligence-kernel'"));
check('LLM cannot score or mutate through intelligence authority boundary', authority.includes('llmMayScore: false') && authority.includes('llmMayMutateArchitecture: false'));
check('candidate knowledge production influence disabled in boundary', authority.includes('candidateKnowledgeMayInfluenceProduction: false'));
check('RBAC unknown permission denies even for platform-admin', test.includes("hasPermission({ roles: ['platform-admin'] }, 'not.a.permission').ok).toBe(false)") && !rbac.includes("roles.includes('platform-admin')) return { ok: true"));
check('no-role principal denied by RBAC kernel', test.includes("hasPermission({}, 'release.promote').ok).toBe(false)"));

if (failures.length) {
  console.error(`Embedded intelligence regression gate failed with ${failures.length} issue(s).`);
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}
console.log('Embedded intelligence regression gate passed.');
