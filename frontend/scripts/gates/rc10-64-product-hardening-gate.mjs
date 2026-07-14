import { readFile, readdir, stat } from 'node:fs/promises';
const root = new URL('../../', import.meta.url);
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const release = await readFile(new URL('packages/domain/src/release.ts', root), 'utf8');
const lifecycle = await readFile(new URL('apps/web/src/lib/lifecycleStatusService.ts', root), 'utf8');
const cockpit = await readFile(new URL('apps/web/src/components/ProjectCockpit.tsx', root), 'utf8');
const stageRail = await readFile(new URL('apps/web/src/features/cockpit/StageReadinessRail.tsx', root), 'utf8');
const taskContracts = await readFile(new URL('apps/web/src/lib/roleTaskContracts.ts', root), 'utf8');
const frame = await readFile(new URL('apps/web/src/components/TaskWorkspaceFrame.tsx', root), 'utf8');
const conformance = await readFile(new URL('apps/web/src/components/ConformanceWorkspace.tsx', root), 'utf8');
const vite = await readFile(new URL('apps/web/vite.config.ts', root), 'utf8');
const dist = new URL('apps/web/dist/assets/', root);
const assets = await readdir(dist);
const js = await Promise.all(assets.filter((name) => name.endsWith('.js')).map(async (name) => ({ name, size: (await stat(new URL(name, dist))).size })));
const indexAsset = js.find((item) => item.name.startsWith('index-'));
const checks = [
  ['frontend version', pkg.version === '0.10.0-rc.10.65.0'],
  ['canonical release identity', release.includes("version: '0.10.0-rc.10.65.0'")],
  ['authoritative lifecycle service', lifecycle.includes('buildLifecycleState') && lifecycle.includes('assessDeliveryStage')],
  ['cockpit consumes lifecycle service', cockpit.includes('buildLifecycleState')],
  ['stage rail consumes lifecycle service', stageRail.includes('buildLifecycleState')],
  ['task-specific deep workspace contracts', taskContracts.includes('risk-concentration') && taskContracts.includes('reuse-candidates') && taskContracts.includes('evidence-ledger')],
  ['workspace frame exposes task intent', frame.includes('data-task-intent') && frame.includes('roleTaskContract')],
  ['evidence ledger lens', conformance.includes('evidence-ledger-lens')],
  ['fine-grained bundle splitting', vite.includes('workspace-foundation') && vite.includes('product-shell') && vite.includes('aiw-artifacts-core')],
  ['initial index bundle below 150 KB', Boolean(indexAsset && indexAsset.size < 150 * 1024)],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
if (indexAsset) console.log(`INFO initial index bundle ${(indexAsset.size / 1024).toFixed(2)} KB`);
const largest = [...js].sort((a,b)=>b.size-a.size)[0]; if (largest) console.log(`INFO largest lazy JS bundle ${largest.name} ${(largest.size/1024).toFixed(2)} KB`);
if (failed) process.exit(1);
console.log(`rc.10.65 frontend gate: ${checks.length}/${checks.length} passed`);
