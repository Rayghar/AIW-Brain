#!/usr/bin/env node
// Design Lifecycle gate (product-vision restoration, lesson→law): the stage
// spine must stay complete, computed, governed and reversible. If a stage loses
// its purpose, checklist, artifacts or handoff — or the spine unmounts — CI fails.
import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(process.argv[2] ?? '.');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`); if (!ok) failures.push(name); };

const catalog = read('apps/web/src/lib/designLifecycle.ts');
const stages = ['designIntent','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','validationRealization'];
check('catalog covers all six canonical stages in order', stages.every((s) => catalog.includes(`stage: '${s}'`)));
for (const field of ['purpose:', 'inputs: [', 'aiwHelps: [', 'artifacts: [', 'handoff:']) {
  const count = (catalog.match(new RegExp(field.replace('[', '\\['), 'g')) ?? []).length;
  check(`every stage declares ${field.replace(':','').replace(' [','')}`, count >= 6, `${count}/6`);
}
check('terminal stage yields the SDD pack', /Solution Delivery Document \(SDD\) Pack/.test(catalog));

const engine = read('packages/engine/src/stageReadiness.ts');
check('completion is COMPUTED (assessStageReadiness present, deterministic)', engine.includes('export function assessStageReadiness') && !engine.includes('Math.random'));
check('engine exports readiness', read('packages/engine/src/index.ts').includes('stageReadiness'));

const spine = read('apps/web/src/components/DesignLifecycleSpine.tsx');
check('spine projects readiness, invents no score', spine.includes('assessStageReadiness') && !/percent\s*=\s*\d/.test(spine));
check('handoff = existing governed approval flow', spine.includes('requestStageApproval') && spine.includes('decideStageApproval'));
check('advance only on approval; any stage reopenable', spine.includes('approved && next') && spine.includes('onClick={() => setActiveStage(g.stage)}'));
check('gaps recorded, not silently blocked', spine.includes('gaps will be recorded'));

const app = read('apps/web/src/App.tsx');
check('spine mounted in the design workspace', /workspaceMode === "design" \? <DesignLifecycleSpine \/>/.test(app));

console.log(failures.length ? `\nDESIGN LIFECYCLE GATE: ${failures.length} violation(s)` : '\nDESIGN LIFECYCLE GATE: PASSED — the journey is the product');
process.exit(failures.length ? 1 : 0);
