// Chapter 10 Model checks: the deployment grid, slicing, dependency trunks and "what fails
// together". Run: npm run test:deploy
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {anatomyModel} from './public/anatomy-model.js';
import {exchangeModel} from './public/exchange-model.js';
import {deploySource, deployModel, foldDeploy, deployScope, deployInsights, failureOf, describePlan, defaultDepth, STATE_RANK} from './public/deploy-model.js';
import {deployLayout, boxOverlap, DEP} from './public/deploy-layout.js';
import {syntheticSource} from './anatomy-fixtures.mjs';

const checks = [], pass = name => checks.push(name);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const V = deploySource(project);
const replicas = rows => rows.reduce((n, r) => n + [...r.cells.values()].reduce((m, c) => m + c.active + c.standby, 0), 0);

// 1. The adapter reads one environment's recorded runtime design.
assert.equal(V.env.id, 'env-001');
assert.equal(V.plans.size, project.runtime.plans.length);
assert.equal(V.placements.length, project.runtime.placements.length);
assert.deepEqual(V.zones.map(z => z.id), ['zone-a', 'zone-b']);
assert.deepEqual(V.comps, ['run-001', 'run-005', 'run-002', 'run-003', 'run-004'], 'components follow the modules\' smart order');
assert.equal(V.platform.length, 9); assert.deepEqual(V.parties, ['ext-channel', 'ext-core', 'ext-network']);
assert.equal(V.deps.filter(d => !d.party).length, 34); assert.equal(V.deps.filter(d => d.party).length, 3, 'runtime paths reach the parties outside');
assert.equal(JSON.stringify(project), before, 'the project is not changed');
pass('the adapter reads one environment\'s plans, placements, zones, dependencies and runtime paths, ordering components as the anatomy does');

// 2. Slicing: every recorded copy is shown exactly once at every depth and scope.
const total = V.placements.reduce((n, l) => n + l.replicas, 0);
for (const depth of ['all', 'parts', 'modules']) {
  const F = foldDeploy(V, {kind: 'system'}, depth);
  assert.equal(replicas(F.rows), total, depth + ': every copy appears once');
  assert.equal(new Set(F.rows.map(r => r.id)).size, F.rows.length);
  assert.ok(F.links.every(l => l.from !== l.to), 'no dependency folds onto itself');
  if (depth !== 'all') assert.ok(F.rows.some(r => r.id === 'PLATFORM') && !F.rows.some(r => r.kind === 'platform'), 'platform services fold into one row');
  if (depth === 'modules') assert.deepEqual(F.rows.filter(r => r.kind === 'module').map(r => r.module), ['GRP-001', 'GRP-002', 'GRP-003']);
}
const part = foldDeploy(V, {kind: 'part', id: 'worker'}, 'all');
assert.equal(deployScope(V, {kind: 'part', id: 'worker'}).id, 'run-004', 'a component opens on its operating plan');
assert.ok(part.rows.find(r => r.id === 'run-004').subject && part.rows.filter(r => r.id !== 'run-004').every(r => r.ctx), 'the part and its neighbours, marked as context');
assert.ok(part.rows.some(r => r.id === 'ext-network') && part.rows.some(r => r.id === 'run-003'), 'what it needs and what needs it');
const mod = foldDeploy(V, {kind: 'module', id: 'GRP-002'}, 'all');
assert.ok(['run-002', 'run-003'].every(id => mod.rows.some(r => r.id === id && !r.ctx)));
assert.equal(defaultDepth(V), 'all');
pass('slicing to modules, parts or one part shows every recorded copy exactly once, folds platform services, and keeps what a part needs beside it');

// 3. Layout: rows, cells, columns and dependency trunks never collide.
let layouts = 0;
for (const scope of [{kind: 'system'}, {kind: 'module', id: 'GRP-002'}, {kind: 'part', id: 'run-004'}, {kind: 'part', id: 'ext-network'}]) for (const depth of ['all', 'parts', 'modules']) for (const viewW of [640, 1000, 1500]) {
  const F = foldDeploy(V, scope, depth), L = deployLayout(F, {viewW});
  layouts++;
  L.rows.forEach((r, i) => { if (i) assert.ok(r.y >= L.rows[i - 1].y + L.rows[i - 1].h - 0.01, 'rows never overlap'); });
  for (const g of L.groups) assert.ok(!L.rows.some(r => r.y < g.y + g.h && g.y < r.y + r.h), 'group headings have their own band');
  L.zones.forEach((z, i) => { if (i) assert.ok(z.x >= L.zones[i - 1].x + L.zones[i - 1].w - 0.01, 'zone columns never overlap'); });
  for (const c of L.cells) { const z = L.zones.find(x => x.id === c.zone), r = L.rows.find(x => x.id === c.row); assert.ok(c.x >= z.x && c.x + c.w <= z.x + z.w && c.y >= r.y && c.y + c.h <= r.y + r.h, 'a cell stays in its zone and row'); }
  for (let i = 0; i < L.cells.length; i++) for (let j = i + 1; j < L.cells.length; j++) assert.ok(!boxOverlap(L.cells[i], L.cells[j]), 'cells never overlap');
  assert.ok(L.trayX >= L.zones.at(-1).x + L.zones.at(-1).w && L.outX >= L.trayX + DEP.TRAY, 'not-placed and outcome columns follow the zones');
  for (const a of L.arcs) assert.ok(a.x > L.rail && a.x < L.x0 && a.xb <= L.x0, 'dependencies run in their own gutter');
  const byLevel = new Map(); for (const t of L.trunks) { if (!byLevel.has(t.level)) byLevel.set(t.level, []); byLevel.get(t.level).push(t); }
  for (const ts of byLevel.values()) for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) assert.ok(ts[i].y2 < ts[j].y1 || ts[j].y2 < ts[i].y1, 'trunks on one level never overlap');
  assert.equal(JSON.stringify(deployLayout(F, {viewW})), JSON.stringify(L), 'layout is deterministic');
}
assert.equal(deployLayout.length, 1); assert.ok(!/\blens\b|scenario|\bfailed\b|\.state\b|simulat/.test(deployLayout.toString()), 'layout never reads the lens or the failure');
pass(`${layouts} deployment layouts: rows, cells and zone columns never collide, dependency trunks share no level, and neither the lens nor the failure explored can move anything`);

// 4. What fails together uses the chapter's own simulation.
assert.deepEqual(V.scenarios.map(s => s.id), ['zone:zone-a', 'zone:zone-b']);
const fa = failureOf(V, 'zone:zone-a');
assert.deepEqual(['run-001', 'run-002', 'run-004'].map(id => fa.state.get(id).initial.state), ['unavailable', 'unavailable', 'unavailable']);
assert.deepEqual([...fa.direct].sort(), ['run-001', 'run-002', 'run-004'], 'parts that lose their own copies');
assert.equal(failureOf(V, 'zone:zone-b').state.get('run-001').initial.state === 'unavailable', false, 'nothing runs in the recovery zone to lose');
// Place the core connector in the recovery zone: it would survive on its own copy but stops
// because what it requires has stopped — the dependency carries the failure.
const q = structuredClone(project); q.runtime.placements.push({id: 'PL-T1', revision: 1, planId: 'run-003', zoneId: 'zone-b', role: 'active', replicas: 1, basis: 'test', confirmed: false});
const V2 = deploySource(q), f2 = failureOf(V2, 'zone:zone-a');
assert.ok(!f2.direct.has('run-003') && STATE_RANK[f2.state.get('run-003').initial.state] > 0, 'the core connector stops through a dependency');
assert.ok([...f2.carries].some(id => id.startsWith('D:run-003>')), 'the dependency that carries the failure is identified');
const LF = deployLayout(foldDeploy(V2, {kind: 'system'}, 'all'), {viewW: 1100});
assert.ok(LF.cells.some(c => c.row === 'run-003' && c.zone === 'zone-b'));
pass('removing the Application zone stops the three parts placed there; a part placed elsewhere still stops through what it requires, and that dependency is identified');

// 5. What the model shows.
const ins = deployInsights(V).map(i => i.text).join('\n');
assert.match(ins, /2 components are not placed/); assert.match(ins, /one failure domain/); assert.match(ins, /no response for when the provider is down \(IF-002, IF-003\)/);
assert.match(ins, /If Application zone fails, 4 of 5 components/);
assert.match(describePlan(V, 'run-004'), /runs 1 active in Application zone/);
const empty = structuredClone(project); empty.runtime.zones = []; empty.runtime.placements = [];
assert.ok(deployInsights(deploySource(empty)).some(i => /has no zones/.test(i.text)), 'an environment without zones asks for them');
const Vs = deploySource(empty), Fs = foldDeploy(Vs, {kind: 'system'}, 'all');
assert.ok(Fs.rows.filter(r => r.kind === 'component').every(r => r.unplaced.length === 1), 'every part then waits in Not placed');
pass('insights come from recorded facts: unplaced components, one shared failure domain, provider paths without a failure response, and what one zone failure stops');

// 6. Scale: a synthetic 40-module system in six zones across three failure domains.
{
  const X = exchangeModel(anatomyModel(syntheticSource({modules: 40, comps: 4, caps: 12, seed: 5})));
  const zones = Array.from({length: 6}, (_, i) => ({id: 'Z' + i, ref: 'ZON-' + i, title: 'Zone ' + i, failureDomain: 'Site ' + Math.floor(i / 2), boundaryId: ''}));
  const comps = X.M.comp.map(c => c.id), plans = [...comps.map((id, i) => ({id: 'R' + i, ref: 'RUN-' + i, title: 'Plan ' + id, assetId: id, minReady: 2, maxReplicas: 4, stateMode: 'Stateless process', recoveryStrategy: 'Restart'})),
    ...X.M.tech.slice(0, 12).map((t, i) => ({id: 'T' + i, ref: 'RUN-T' + i, title: 'Platform ' + i, assetId: t.id, minReady: 1, maxReplicas: 2}))];
  const placements = plans.flatMap((r, i) => i % 7 === 3 ? [] : [{id: 'L' + i + 'a', planId: r.id, zoneId: 'Z' + (i % 6), role: 'active', replicas: 1}, ...(i % 3 ? [{id: 'L' + i + 'b', planId: r.id, zoneId: 'Z' + ((i + 3) % 6), role: 'active', replicas: 1}] : [])]);
  const idx = new Map(comps.map((c, i) => [c, 'R' + i]));
  const deps = [...X.links.filter(l => idx.has(l.from) && idx.has(l.to)).map(l => ({from: idx.get(l.from), to: idx.get(l.to), mode: 'required'})), ...comps.map((c, i) => ({from: 'R' + i, to: 'T' + (i % 12), mode: i % 4 ? 'required' : 'buffered'}))];
  const t0 = performance.now();
  const SV = deployModel(X, {env: {id: 'E', title: 'Synthetic'}, zones, plans, placements, deps});
  const F = foldDeploy(SV, {kind: 'system'}, defaultDepth(SV)), L = deployLayout(F, {viewW: 1200});
  const FP = foldDeploy(SV, {kind: 'module', id: 'M7'}, 'all'), LP = deployLayout(FP, {viewW: 1200}), f = failureOf(SV, SV.scenarios.find(s => s.mode === 'domain').id);
  const ms = performance.now() - t0;
  assert.equal(defaultDepth(SV), 'modules');
  assert.equal(L.zones.length, 6); assert.equal(L.domains.length, 3, 'zones stand together by failure domain');
  assert.ok(F.rows.filter(r => r.kind === 'module').length === 40 && LP.rows.some(r => r.id.startsWith('R')), 'modules fold, one module opens');
  assert.equal(f.failed.size, 2, 'a shared failure domain removes both of its zones');
  assert.ok(ms < 1500, 'model, fold, layout and simulation in ' + Math.round(ms) + ' ms');
  pass(`a synthetic 160-part system in six zones and three failure domains folds to ${F.rows.length} rows with ${L.levels} trunk levels, opens one module, and simulates a domain failure in ${Math.round(ms)} ms`);
}

console.log(JSON.stringify({suite: 'chapter 10 model (deployment & runtime)', passed: checks.length, checks, limits: ['What fails together reuses the chapter\'s own design simulation of declared copies and dependencies. It does not establish live failover.', 'The synthetic system is generated only for structure and scale.']}, null, 2));
