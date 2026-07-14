#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
const required = ['packages/domain/src/architectureView.ts','packages/modelling/src/index.ts','packages/knowledge/src/index.ts','packages/admin/src/index.ts','packages/intelligence/src/index.ts','packages/integrations/src/index.ts','apps/worker/src/worker.ts','apps/web/src/design-system/tokens.css','docs/architecture/CLINICAL_REFACTOR_FOUNDATION_v0.10.0-rc.10.2.md'];
const failures = [];
for (const p of required) { const ok = existsSync(p); console.log(`${ok ? 'PASS' : 'FAIL'}  ${p}`); if (!ok) failures.push(p); }
const appLines = readFileSync('apps/api/src/app.ts','utf8').split('\n').length;
const ok = appLines <= 1300; console.log(`${ok ? 'PASS' : 'FAIL'}  app.ts reduced to ${appLines} lines`); if (!ok) failures.push('app.ts');
console.log(failures.length ? `\nSPRINT 8.8.0B: ${failures.length} violation(s)` : '\nSPRINT 8.8.0B: PASSED');
process.exit(failures.length ? 1 : 0);
