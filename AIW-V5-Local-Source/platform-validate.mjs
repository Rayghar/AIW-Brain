// Chapter 6 Model checks: the platform stack, its slicing and layout, dependencies, proposals and
// what fails together. Run: npm run test:platform
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {technologyProposal, simulateTechnology} from './public/technology-domain.js';
import {anatomyModel} from './public/anatomy-model.js';
import {exchangeModel} from './public/exchange-model.js';
import {platformSource, platformModel, foldPlatform, platformScope, platformInsights, failureOf, describeCapability, describeNeed, defaultDepth, FAMILIES, PROPOSED} from './public/platform-model.js';
import {platformLayout, PX} from './public/platform-layout.js';
import {syntheticSource} from './anatomy-fixtures.mjs';

const checks = [], pass = name => checks.push(name);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const P = platformSource(project);
const cap = id => P.capabilities.get(id);

// 1. The adapter reads the platform, and what each capability's loss stops.
assert.equal(P.capabilities.size, 9); assert.equal(P.components.size, 5); assert.equal(P.needs.size, 28); assert.equal(P.deps.length, 4);
assert.deepEqual(P.unsupported, [], 'every need is supported');
assert.deepEqual([...P.capabilities.values()].filter(c => c.single).map(c => c.ref), ['TC-001', 'TC-002', 'TC-003', 'TC-005', 'TC-006', 'TC-008', 'TC-009'], 'essential capabilities with a single path');
assert.ok(cap('tc-004').unused && !cap('tc-007').essential, 'caching is unused; observability is only needed degraded');
assert.deepEqual(['tc-001', 'gateway', 'tc-006', 'postgres', 'queue', 'tc-007', 'tc-009'].map(id => cap(id).blast.stops.length), [5, 5, 5, 3, 2, 0, 1]);
assert.deepEqual(cap('tc-006').blast.caps.map(x => x.id).sort(), ['gateway', 'tc-001', 'tc-006'], 'identity takes connectivity and execution with it');
assert.deepEqual(cap('tc-007').blast.degrades.length, 5, 'losing evidence degrades every component');
const sim = simulateTechnology(project, {capabilityId: 'gateway', mode: 'capability', durationMinutes: 60, measurements: []});
assert.deepEqual(cap('gateway').blast.stops, sim.applications.filter(a => a.state === 'unavailable').map(a => a.id), 'the chapter\'s own simulation');
assert.deepEqual([...P.domains.values()].map(d => [d.title, d.members.length, d.stops.length]), [['Primary operating domain', 9, 5]]);
assert.equal(JSON.stringify(project), before, 'the project is not changed');
pass('the adapter reads 9 capabilities supporting 5 components through 28 needs and 4 dependencies, and — by Chapter 6\'s own simulation — what each capability\'s loss and the one shared failure domain stop');

// 2. Gaps and changes surface.
const q = structuredClone(project), t = q.technology;
t.needs.push({id: 'TN-X1', applicationId: 'api-pod', category: 'caching', description: 'Accelerate repeat reads.', criticality: 'degraded', confirmed: false});
t.needs.push({id: 'TN-X2', applicationId: 'worker', category: 'caching', description: 'Accelerate status reads.', criticality: 'degraded', confirmed: false});
t.mappings = t.mappings.filter(m => m.needId !== 'TN-001');
const qa = t.capabilities.find(c => c.id === 'postgres'); Object.assign(qa, {continuity: 'redundant', alternateDomain: 'Recovery site', continuityPlan: 'Continue on the standby after consistency checks.', failureDomain: 'Data domain'});
const Q = platformSource(q);
assert.deepEqual(Q.unsupported.map(n => n.id), ['TN-001', 'TN-X1', 'TN-X2']);
assert.ok(!Q.capabilities.get('postgres').single && Q.domains.size === 2, 'a redundant store is no longer a single path; two domains now');
const qi = platformInsights(Q).map(i => i.text).join('\n');
assert.match(qi, /3 application needs have no capability: Payment service · Compute; Payment service · Caching; Settlement worker · Caching/);
assert.match(qi, /Service connectivity \(5 of 5, through Application execution\)/);
assert.match(qi, /6 essential capabilities have a single support path/);
const pi = platformInsights(P).map(i => i.text).join('\n');
assert.match(pi, /All 9 capabilities share one failure domain, Primary operating domain\. Losing it stops 5 of 5 components/);
assert.match(pi, /Critical chain: Application execution → Service connectivity \(requires service reachability\); Service connectivity → Identity and access decisions/);
assert.match(pi, /Transactional persistence and Durable work handoff have no recovery plan or recovery dependency/);
assert.match(pi, /TC-004 Disposable read acceleration is not used/);
assert.match(pi, /15 needs reach a capability in another trust boundary: TB-003 · Restricted state/);
assert.match(describeCapability(P, 'gateway'), /serves 4 components through 4 needs\. It sits in Primary operating domain with a single path\. If it fails, 5 of 5 components stop/);
assert.match(describeNeed(Q, 'TN-001'), /Payment service needs compute \(essential\): .* No capability fulfils it yet\./);
pass('unsupported needs, single paths, missing recovery, an unused capability, trust crossings, the critical chain and a shared failure domain all surface; a redundant arrangement in its own domain clears the single path');

// 3. Slicing: every need lands in exactly one cell.
const totalNeeds = F => F.cells.reduce((n, c) => n + c.needs.length, 0);
for (const P2 of [P, Q]) for (const depth of ['components', 'modules']) {
  const F = foldPlatform(P2, {kind: 'system'}, depth);
  assert.equal(totalNeeds(F), P2.needs.size, depth + ': every need is drawn once');
  assert.equal(new Set(F.cells.map(c => c.row + '|' + c.col)).size, F.cells.length);
  assert.deepEqual([...new Set(F.rows.map(r => r.family))], FAMILIES.map(f => f.id).filter(f => F.rows.some(r => r.family === f)), 'rows follow the platform families');
}
const FQ = foldPlatform(Q, {kind: 'system'}, 'components');
assert.ok(FQ.cells.some(c => c.row === 'tc-004' && c.unsupported === 1 && c.col === 'api-pod'), 'an unsupported need waits in the row of its category');
const q2 = structuredClone(q); q2.technology.capabilities = q2.technology.capabilities.filter(c => c.id !== 'tc-004'); q2.technology.mappings = q2.technology.mappings.filter(m => m.capabilityId !== 'tc-004');
const F2 = foldPlatform(platformSource(q2), {kind: 'system'}, 'components');
assert.ok(F2.rows.some(r => r.id === 'MISSING:caching') && F2.cells.filter(c => c.row === 'MISSING:caching').length === 2, 'with no caching capability, the needs wait in a missing row');
const FM = foldPlatform(P, {kind: 'module', id: 'GRP-002'});
assert.deepEqual(FM.cols.map(c => c.id), ['risk-engine', 'core-adapter']);
const FC = foldPlatform(P, {kind: 'capability', id: 'gateway'});
assert.deepEqual(FC.rows.map(r => r.id).sort(), ['gateway', 'tc-001', 'tc-006'], 'a capability with what it depends on and what depends on it');
assert.deepEqual(platformScope(P, {kind: 'x', id: 'TN-002'}).id, 'postgres', 'a need opens on its capability');
assert.equal(defaultDepth(P), 'components');
pass('slicing to modules, one module or one capability draws every need exactly once, keeps rows in platform families, and puts an unsupported need where its capability would be');

// 4. Layout.
function checkLayout(F, L, tag) {
  L.rows.forEach((r, i) => { if (i) assert.ok(r.y >= L.rows[i - 1].y + L.rows[i - 1].h - 0.01, tag + ': rows never overlap'); });
  for (const g of L.groups) assert.ok(!L.rows.some(r => r.y < g.y + g.h && g.y < r.y + r.h), tag + ': family bands have their own space');
  L.cols.forEach((c, i) => { assert.ok(c.x >= L.x0); if (i) assert.ok(c.x >= L.cols[i - 1].x + L.cols[i - 1].w - 0.01, tag + ': columns never overlap'); });
  for (const c of L.cells) { const r = L.rows.find(x => x.id === c.row), k = L.cols.find(x => x.id === c.col); assert.ok(c.x === k.cx && c.y === r.cy, tag + ': a cell sits where its row and column meet'); }
  for (const p of L.plates) { const r = L.rows.find(x => x.id === p.row); assert.ok(p.y >= r.y && p.y + p.h <= r.y + r.h && p.x >= L.x0 && p.x + p.w <= L.failX, tag + ': a plate stays in its row'); assert.ok(L.cells.filter(c => c.row === p.row && c.x > p.x && c.x < p.x + p.w).length >= 1); }
  for (const p of L.plates) for (const o of L.plates) if (p !== o && p.row === o.row) assert.ok(p.x + p.w <= o.x || o.x + o.w <= p.x, tag + ': plates in a row never overlap');
  for (const a of L.arcs) assert.ok(a.x > L.rail && a.x < L.x0 && a.xa >= L.rail, tag + ': dependencies run in their own gutter');
  for (const a of L.arcs) for (const b of L.arcs) if (a !== b && a.level === b.level) assert.ok(Math.max(a.ya, a.yb) < Math.min(b.ya, b.yb) || Math.max(b.ya, b.yb) < Math.min(a.ya, a.yb), tag + ': brackets on one level never overlap');
  assert.ok(L.failX >= L.x0 + L.cols.length * L.colW);
  assert.equal(JSON.stringify(platformLayout(F)), JSON.stringify(L), tag + ': layout is deterministic');
}
let layouts = 0;
const proposals = [technologyProposal(project, 'restore', 'postgres'), technologyProposal(project, 'isolate', 'gateway')];
for (const P2 of [P, Q]) for (const sc of [{kind: 'system'}, {kind: 'module', id: 'GRP-001'}, {kind: 'capability', id: 'tc-001'}, {kind: 'capability', id: 'postgres'}]) for (const depth of ['components', 'modules']) for (const prop of [null, ...proposals]) {
  const F = foldPlatform(P2, sc, depth, {proposal: prop}); checkLayout(F, platformLayout(F), `${sc.kind}:${sc.id || ''}:${depth}:${prop?.key || ''}`); layouts++;
}
assert.equal(platformLayout.length, 1); assert.ok(!/\blens\b|fail\w*\(|state/.test(platformLayout.toString()), 'layout never reads the lens or the failure explored');
const L0 = platformLayout(foldPlatform(P, {kind: 'system'}, 'components'));
assert.equal(L0.levels, 3); assert.equal(L0.plates.length, 14);
pass(`${layouts} platform layouts, with and without a proposal: rows, family bands and columns never collide, cells sit where rows and columns meet, plates stay in their rows, dependency brackets keep to their gutter on non-overlapping levels, and neither the lens nor the failure can move anything`);

// 5. Proposals are drawn in place.
const Fr = foldPlatform(P, {kind: 'system'}, 'components', {proposal: proposals[0]});
assert.deepEqual(Fr.deps.filter(d => d.proposed).map(d => d.to).sort(), ['tc-008', 'tc-009'], 'a recovery path to the backup and recovery capabilities');
const miss = technologyProposal(q, 'missing', 'api-pod', 'TN-001'), Fm = foldPlatform(Q, {kind: 'system'}, 'components', {proposal: miss});
assert.ok(Fm.cells.some(c => c.row === 'tc-001' && c.col === 'api-pod' && c.proposed), 'the missing support is proposed on the compute capability');
assert.equal(JSON.stringify(project), before);
pass('a recovery proposal draws its two dependencies, and a missing-support proposal draws the mapping on the capability that would fulfil it');

// 6. What fails together.
const fg = failureOf(P, {id: 'gateway', mode: 'capability'}), fd = failureOf(P, {id: 'postgres', mode: 'domain'});
assert.deepEqual([fg.first, fg.stops.length, fg.caps.length], [['gateway'], 5, 2]);
assert.deepEqual([fd.caps.length, fd.stops.length, fd.first.length], [9, 5, 9], 'losing the shared domain loses every capability');
const FF = foldPlatform(P, {kind: 'system'}, 'components');
assert.equal(JSON.stringify(platformLayout(FF)), JSON.stringify(L0), 'the failure explored moves nothing');
pass('losing Service connectivity takes Application execution with it and stops all five components; losing the shared domain loses all nine capabilities — and the stack keeps every position');

// 7. Scale: a synthetic 160-component system on twelve capabilities.
{
  const X = exchangeModel(anatomyModel(syntheticSource({modules: 40, comps: 4, caps: 12, seed: 5})));
  const cats = ['compute', 'transactional', 'messaging', 'caching', 'connectivity', 'identity', 'observability', 'backup', 'recovery'];
  const capabilities = Array.from({length: 12}, (_, i) => ({id: 'K' + i, ref: 'TC-' + i, category: cats[i % cats.length], title: 'Capability ' + i, boundaryId: 'B' + (i % 3), failureDomain: 'Domain ' + (i % 2), continuity: i % 4 ? 'single' : 'redundant', alternateDomain: 'Other', continuityPlan: i % 4 ? '' : 'plan'}));
  const comps = X.M.comp.map(c => c.id), needs = [], mappings = [];
  comps.forEach((c, i) => { for (const k of [0, 1 + (i % 5), 6 + (i % 6)]) { const id = 'N' + i + '-' + k; needs.push({id, applicationId: c, category: capabilities[k].category, criticality: k === 0 || i % 3 ? 'essential' : 'degraded', description: 'need'}); if ((i + k) % 17) mappings.push({id: 'M' + id, needId: id, capabilityId: 'K' + k}); } });
  const dependencies = [{id: 'D1', from: 'K0', to: 'K4', type: 'dependency', critical: true}, {id: 'D2', from: 'K4', to: 'K5', type: 'trust', critical: true}, {id: 'D3', from: 'K1', to: 'K7', type: 'resilience'}, {id: 'D4', from: 'K0', to: 'K6', type: 'data'}];
  const t0 = performance.now();
  const SP = platformModel(X, {capabilities, needs, mappings, dependencies, boundaries: [{id: 'B0'}, {id: 'B1'}, {id: 'B2'}], appBoundaries: {}});
  const F = foldPlatform(SP, {kind: 'system'}, defaultDepth(SP)), L = platformLayout(F);
  const FC2 = foldPlatform(SP, {kind: 'system'}, 'components'), LC = platformLayout(FC2), FM2 = foldPlatform(SP, {kind: 'module', id: 'M7'}), LM = platformLayout(FM2);
  const ms = performance.now() - t0;
  assert.equal(defaultDepth(SP), 'modules'); assert.equal(F.cols.length, 40);
  checkLayout(F, L, 'synthetic:modules'); checkLayout(FC2, LC, 'synthetic:components'); checkLayout(FM2, LM, 'synthetic:M7');
  assert.equal(totalNeeds(FC2), needs.length); assert.ok(SP.unsupported.length > 0 && FC2.cells.some(c => c.unsupported));
  assert.ok(ms < 3000, 'model, fold and three layouts in ' + Math.round(ms) + ' ms');
  pass(`a synthetic 160-component system on twelve capabilities folds to 40 module columns (${L.W} × ${L.H}), opens every component (${FC2.cols.length} columns) or one module, and draws all ${needs.length} needs without a collision in ${Math.round(ms)} ms`);
}

console.log(JSON.stringify({suite: 'chapter 6 model (logical technology)', passed: checks.length, checks, limits: ['What fails together is Chapter 6\'s design simulation of declared support and dependencies. It is not a failover test.', 'The synthetic system is generated only for structure and scale.']}, null, 2));
