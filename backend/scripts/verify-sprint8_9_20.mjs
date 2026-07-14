import { readFileSync, existsSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const checks = [
  ['backend package bumped to rc.10.37', pkg.version === '0.10.0-rc.10.37'],
  ['production readiness runbook retained', existsSync('../ADMIN_PRODUCTION_READINESS_RUNBOOK_v0.10.0-rc.10.36.md') || existsSync('docs/runbooks')],
  ['backend remains separated runtime without frontend shell dependency', !existsSync('apps/web/src/App.tsx')],
];
const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? '✓' : '✗'} ${name}`);
if (failed.length) {
  console.error(`\nSprint 8.9.20 backend verification failed: ${failed.map(([name]) => name).join(', ')}`);
  process.exit(1);
}
console.log('\nSprint 8.9.20 backend verification passed.');
