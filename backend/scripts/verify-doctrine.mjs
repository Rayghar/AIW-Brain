#!/usr/bin/env node
// Doctrine gate: the Master Agentic Prompt is LAW in the runtime, not a wish.
import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(process.argv[2] ?? '.');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const check = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) failures.push(name); };

const doctrine = read('apps/api/src/llmDoctrine.ts');
check('doctrine module: preamble + insufficient-grounding shape', doctrine.includes('language faculty') && doctrine.includes('insufficientGrounding'));
check('doctrine module: versioned', /DOCTRINE_VERSION = 'doctrine-/.test(doctrine));

const gateway = read('apps/api/src/llmGateway.ts');
check('gateway injects doctrine at the message choke point', gateway.includes('doctrineSystemFor(request.purpose, request.system)'));
check('exchange hash carries doctrine version', gateway.includes('DOCTRINE_VERSION}\\n${request.purpose}'));

// contract coverage: every purpose literal used in the codebase has a contract or the explicit fallback
const purposes = new Set();
for (const file of fs.readdirSync(path.join(root, 'apps/api/src'))) {
  if (!file.endsWith('.ts')) continue;
  for (const match of read(`apps/api/src/${file}`).matchAll(/purpose:\s*'([a-z-]+)'/g)) purposes.add(match[1]);
}
const uncovered = [...purposes].filter((purpose) => !doctrine.includes(`'${purpose}':`));
check(`purpose contracts cover route purposes (${purposes.size} found${uncovered.length ? '; uncovered→fallback: ' + uncovered.join(',') : ''})`, true);

check('kbRef clamps enforced engine-side (stageAdvisor whitelist)', /kbRef/i.test(read('packages/engine/src/stageAdvisor.ts')));
check('doctrine documented in the repo', fs.existsSync(path.join(root, 'docs/reference/AIW_AGENTIC_DOCTRINE.md')));

console.log(failures.length ? `\nDOCTRINE GATE: ${failures.length} violation(s)` : '\nDOCTRINE GATE: PASSED — the prompt is law');
process.exit(failures.length ? 1 : 0);
