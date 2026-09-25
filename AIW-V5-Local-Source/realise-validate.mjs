// Chapter 5 Model checks: components carrying what they realise, their slicing and layout, the
// allocation matrix, and the logical flows checked against the interactions.
// Run: npm run test:realise
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {realisationProposal} from './public/realisation-domain.js';
import {anatomyModel} from './public/anatomy-model.js';
import {exchangeModel} from './public/exchange-model.js';
import {realiseSource, realiseModel, foldRealise, realiseScope, allocation, realiseInsights, describeFlow, describeComponent, describeLogical, realiseWalk, defaultDepth, PROPOSED, OUT_L, OUT_R} from './public/realise-model.js';
import {realiseLayout, allocationLayout, cardHeight} from './public/realise-layout.js';
import {syntheticSource} from './anatomy-fixtures.mjs';

const checks = [], pass = name => checks.push(name);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const V = realiseSource(project);
const overlap = (a, b, m = 0) => a.x < b.x + b.w - m && b.x < a.x + a.w - m && a.y < b.y + b.h - m && b.y < a.y + a.h - m;
const comps = V2 => [...V2.elements.values()].filter(e => e.kind === 'component');

// 1. The adapter reads components, what they realise and stand on, and how they talk.
assert.deepEqual(V.lanes, [OUT_L, 'GRP-001', 'GRP-002', 'GRP-003', OUT_R], 'outside, the three modules in the anatomy\'s order, outside');
assert.deepEqual(comps(V).map(c => [c.ref, c.module, c.realises.join()]), [['APP-001', 'GRP-001', 'api'], ['APP-005', 'GRP-001', 'notify'], ['APP-002', 'GRP-002', 'risk'], ['APP-003', 'GRP-002', 'ledger'], ['APP-004', 'GRP-003', 'hub']]);
assert.deepEqual(comps(V).map(c => c.needs.length), [6, 5, 5, 4, 8], 'each stands on the platform capabilities it requires');
assert.deepEqual(V.elements.get('api-pod').data, ['instruction']);
assert.deepEqual(V.flows.filter(f => f.recorded).map(f => [f.ref, f.kind, f.contractRef]), [['INT-001', 'sync', 'IF-004'], ['INT-002', 'sync', 'IF-005'], ['INT-003', 'sync', 'IF-006'], ['INT-004', 'event', 'IF-007']], 'recorded interactions, with the contract that formalises each');
assert.deepEqual(V.flows.filter(f => !f.recorded).map(f => f.ref), ['IF-001', 'IF-002', 'IF-003'], 'the parties outside reach the components through contracts');
assert.deepEqual(V.lflows.map(l => [l.id, l.carriedBy.join()]), [['L:api>risk', 'INT-001'], ['L:risk>ledger', 'INT-002'], ['L:ledger>hub', 'INT-003'], ['L:hub>notify', 'INT-004']], 'every logical flow is carried by an interaction between its realisers');
assert.deepEqual(V.elements.get('risk-engine').why, {reqs: ['REQ-002'], qds: ['QD-003', 'QD-005'], adrs: []}, 'a component inherits the reasons of what it realises');
assert.equal(JSON.stringify(project), before, 'the project is not changed');
pass('the adapter reads 5 components in 3 modules — each with what it realises, owns and stands on — 4 recorded interactions, 3 contracts with the outside, and 4 logical flows each carried by an interaction');

// 2. Gaps become visible: holes, orphans, uncarried flows, missing failure policies, double claims.
const q = structuredClone(project);
q.logical.mappings = q.logical.mappings.filter(m => m.logicalId !== 'hub');
q.realisation.connections = q.realisation.connections.filter(c => c.id !== 'INT-003');
q.realisation.connections.push({id: 'INT-T1', from: 'notify-worker', to: 'risk-engine', label: 'Asks', interaction: 'sync', kind: 'flow', condition: '', failure: '', origin: 'user'});
q.realisation.components.find(c => c.id === 'risk-engine').dataIds.push('instruction');
q.logical.mappings.push({...q.logical.mappings.find(m => m.logicalId === 'risk'), id: 'MAP-T1', physicalId: 'core-adapter'});
const Q = realiseSource(q);
assert.ok(Q.elements.has('HOLE:hub') && Q.elements.get('HOLE:hub').module === 'GRP-003', 'a responsibility nothing realises stands as a hole in its module');
assert.deepEqual(Q.elements.get('worker').realises, [], 'the worker now realises nothing');
assert.equal(Q.lflows.find(l => l.id === 'L:ledger>hub').carried, false);
assert.deepEqual(Q.R.get('risk').shared.sort(), ['core-adapter', 'risk-engine'], 'two components with the same scope');
const qi = realiseInsights(Q).map(i => i.text).join('\n');
assert.match(qi, /1 responsibility is not realised by any component: LR-004 Settlement hub/);
assert.match(qi, /1 component realises no responsibility: APP-004 Settlement worker/);
assert.match(qi, /2 interactions have no logical flow behind them \(INT-004, INT-T1\)/, "without the hub, the worker's event carries no logical flow either");
assert.match(qi, /1 interaction has no failure policy: INT-T1 Notification worker → Risk engine/);
assert.match(qi, /Payment instruction is claimed by Payment service and Risk engine/);
assert.match(qi, /LR-002 is split between components with the same allocation scope/);
const vi = realiseInsights(V).map(i => i.text).join('\n');
assert.match(vi, /Every logical flow is carried/);
assert.match(vi, /3 contracts with the outside have no failure handling recorded in Chapter 8: IF-001 Payment initiation/);
assert.match(vi, /1 component has no architecture decision behind it: APP-002 Risk engine/);
assert.match(vi, /All 5 components stand on Application execution, Identity and access decisions, Correlated operational evidence/);
assert.match(describeComponent(V, 'core-adapter'), /is an adapter in Control & accounting\. It realises LR-003 Core ledger/);
assert.match(describeFlow(V, 'INT-001'), /carries the logical flow LR-001 Payment API → LR-002 Risk screening \(Screen\)/);
assert.match(describeLogical(Q, 'L:ledger>hub'), /Realised by Core connector → nothing yet/);
pass('holes, components that realise nothing, logical flows no interaction carries, interactions without a failure policy or a logical flow behind them, double data claims and shared scopes all surface from recorded facts');

// 3. Slicing.
for (const V2 of [V, Q]) for (const depth of ['components', 'modules']) {
  const F = foldRealise(V2, {kind: 'system'}, depth), members = F.rows.flatMap(r => r.members);
  assert.equal(new Set(members).size, members.length, depth + ': no element twice');
  assert.equal(members.length, V2.elements.size, depth + ': every element is drawn');
  assert.ok(F.links.every(l => l.from !== l.to));
  assert.equal(F.rows.filter(r => r.kind === 'party').length, 3, 'parties outside are never grouped');
  if (depth === 'modules') assert.deepEqual(F.rows.filter(r => r.kind === 'module').map(r => r.id).sort(), V2 === V ? ['MOD:GRP-001', 'MOD:GRP-002', 'MOD:GRP-003'] : ['MOD:GRP-001', 'MOD:GRP-002', 'MOD:GRP-003', 'MOD:NONE'], 'a component that realises nothing belongs to no module');
}
const fm = foldRealise(V, {kind: 'module', id: 'GRP-002'}, 'components');
assert.ok(['risk-engine', 'core-adapter'].every(id => fm.rows.find(r => r.id === id && !r.ctx)) && ['api-pod', 'worker', 'ext-core'].every(id => fm.rows.find(r => r.id === id)?.ctx), 'a module keeps its neighbours as context');
assert.ok(fm.rows.some(r => r.id === 'MOD:GRP-001' && r.members.includes('notify-worker')), 'the rest folds into its module');
assert.deepEqual(realiseScope(V, {kind: 'part', id: 'ledger'}), {kind: 'part', id: 'core-adapter', focus: 'ledger'}, 'a responsibility opens on the component realising it');
assert.deepEqual(realiseScope(Q, {kind: 'part', id: 'hub'}), {kind: 'module', id: 'GRP-003', focus: 'hub'}, 'a hole opens on its module');
assert.equal(defaultDepth(V), 'components');
pass('slicing to modules, one module or one component shows every element once, never groups the parties outside, and keeps neighbours beside the subject as context');

// 4. Layout.
function checkLayout(F, L, tag) {
  L.lanes.forEach((l, i) => { if (i) assert.ok(l.x >= L.lanes[i - 1].x + L.lanes[i - 1].w, tag + ': lanes never overlap'); });
  for (const c of L.cards) { const ln = L.lanes.find(l => l.id === c.row.region); assert.ok(ln && c.x >= ln.x && c.x + c.w <= ln.x + ln.w, tag + ': a card stays in its lane'); assert.ok(c.h >= cardHeight(c.row), tag + ': a card is tall enough for what it carries'); }
  for (let i = 0; i < L.cards.length; i++) for (let j = i + 1; j < L.cards.length; j++) assert.ok(!overlap(L.cards[i], L.cards[j]), tag + ': cards never overlap');
  const C = new Map(L.cards.map(c => [c.id, c]));
  for (const r of L.routes) {
    for (let i = 1; i < r.pts.length; i++) {
      const [a, b] = [r.pts[i - 1], r.pts[i]];
      assert.ok(Math.abs(a[0] - b[0]) < 0.01 || Math.abs(a[1] - b[1]) < 0.01, tag + ': routes are orthogonal');
      const seg = {x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(a[0] - b[0]) + 0.01, h: Math.abs(a[1] - b[1]) + 0.01};
      for (const c of L.cards) if (c.id !== r.link.from && c.id !== r.link.to) assert.ok(!overlap(seg, c, 0.5), `${tag}: ${r.id} passes through ${c.id}`);
    }
    const from = C.get(r.link.from), to = C.get(r.link.to);
    assert.ok(r.ya >= from.y && r.ya <= from.y + from.h && r.yb >= to.y && r.yb <= to.y + to.h, tag + ': ports sit on their cards');
  }
  for (let i = 0; i < L.routes.length; i++) for (let j = i + 1; j < L.routes.length; j++) {
    const p = L.routes[i], o = L.routes[j];
    if (Math.abs(p.xt - o.xt) > 0.5 || (p.entry && p.entry === o.entry)) continue;
    assert.ok(Math.max(p.ya, p.yb) < Math.min(o.ya, o.yb) || Math.max(o.ya, o.yb) < Math.min(p.ya, p.yb), `${tag}: ${p.id} and ${o.id} share a track`);
  }
  L.labels.forEach((l, i) => { assert.ok(!L.cards.some(b => overlap(l, b, 0.5)), tag + ': labels avoid cards'); assert.ok(!L.labels.slice(i + 1).some(o => overlap(l, o, 0.5)), tag + ': labels never collide'); });
  assert.equal(JSON.stringify(realiseLayout(F)), JSON.stringify(L), tag + ': layout is deterministic');
}
let layouts = 0;
const proposal = realisationProposal(project, 'review');
for (const V2 of [V, Q]) for (const sc of [{kind: 'system'}, {kind: 'module', id: 'GRP-002'}, {kind: 'module', id: 'GRP-003'}, {kind: 'part', id: 'core-adapter'}, {kind: 'part', id: 'api-pod'}]) for (const depth of ['components', 'modules']) for (const prop of [null, proposal]) {
  const F = foldRealise(V2, sc, depth, {proposal: prop}); checkLayout(F, realiseLayout(F), `${sc.kind}:${sc.id || ''}:${depth}:${prop ? 'proposal' : ''}`); layouts++;
}
const L0 = realiseLayout(foldRealise(V, {kind: 'system'}, 'components'));
assert.equal(L0.slots, 3, 'eight elements share three rows'); assert.equal(L0.labels.length, 7, 'every interaction is labelled');
assert.ok(L0.H < 560, 'the whole realisation fits one screen');
assert.equal(realiseLayout.length, 1); assert.ok(!/\blens\b|structure|reasoning/.test(realiseLayout.toString()) && !/\blens\b/.test(cardHeight.toString()), 'layout never reads the lens');
pass(`${layouts} component layouts, with and without a proposal: lanes and cards never overlap, each card is tall enough for what it realises, every route is orthogonal and passes through no other card, gutter tracks never share, labels avoid cards and each other, and the lens cannot move anything`);

// 5. Proposals and the allocation matrix.
const FP = foldRealise(V, {kind: 'system'}, 'components', {proposal});
const ghost = FP.rows.find(r => r.id === PROPOSED);
assert.ok(ghost && ghost.region === 'GRP-002' && ghost.realises[0] === 'risk', 'the proposed queue stands in the module of what it would realise');
assert.ok(FP.links.some(l => l.from === 'risk-engine' && l.to === PROPOSED && l.proposed), 'with its relationship to the component it works with');
const GA = allocation(V), MA = allocationLayout(GA);
assert.deepEqual(GA.rows.map(r => r.ref), ['LR-001', 'LR-005', 'LR-002', 'LR-003', 'LR-004'], 'responsibilities grouped by module');
assert.deepEqual(GA.cells.map(c => c.kind), ['allocated', 'allocated', 'allocated', 'allocated', 'allocated']);
const GQ = allocation(Q), GPq = allocation(V, {kind: 'system'}, {proposal});
assert.deepEqual(GQ.unrealised, ['hub']); assert.ok(GQ.cols.find(c => c.id === 'worker').orphan);
assert.deepEqual(GQ.cells.filter(c => c.resp === 'risk').map(c => c.kind), ['shared', 'shared']);
assert.deepEqual(GPq.cols.map(c => c.id), ['api-pod', 'notify-worker', 'risk-engine', 'core-adapter', PROPOSED, 'worker'], 'the proposal column stands with its module');
const MP = allocationLayout(GPq);
MP.rows.forEach((r, i) => { if (i) assert.ok(r.y >= MP.rows[i - 1].y + MP.rows[i - 1].h); });
for (const c of MP.cells) { const r = MP.rows.find(x => x.id === c.resp), k = MP.cols.find(x => x.id === c.comp); assert.ok(c.x === k.x + k.w / 2 && c.y === r.y + r.h / 2); }
assert.deepEqual(MP.colGroups.map(g => g.module), ['GRP-001', 'GRP-002', 'GRP-003'], 'one band per module');
assert.ok(MA.realX >= MA.cols.at(-1).x + MA.cols.at(-1).w && MA.whyX > MA.realX);
assert.equal(JSON.stringify(project), before);
pass('a component proposal stands in its module with its relationship drawn; the allocation matrix groups responsibilities and components by module, shows holes, orphans and shared scopes, and keeps the proposal with its module');

// 6. The walk follows the logical flows of Chapter 4.
assert.deepEqual(realiseWalk(V).map(l => l.label), ['Screen', 'Allow', 'Submit', 'Outcome']);
assert.match(describeLogical(V, 'L:hub>notify'), /Realised by Settlement worker → Notification worker\. Carried by INT-004 \(event\)/);
pass('the walk follows the four Chapter 4 flows and reads, at each one, which components realise its ends and which interaction carries it');

// 7. Scale: a synthetic 160-component system in 40 modules, with no Chapter 5 records at all.
{
  const X = exchangeModel(anatomyModel(syntheticSource({modules: 40, comps: 4, caps: 12, seed: 5})));
  const t0 = performance.now();
  const SV = realiseModel(X, {});
  const F = foldRealise(SV, {kind: 'system'}, defaultDepth(SV)), L = realiseLayout(F);
  const FM = foldRealise(SV, {kind: 'module', id: 'M7'}, 'components'), LM = realiseLayout(FM);
  const FC = foldRealise(SV, {kind: 'system'}, 'components'), LC = realiseLayout(FC);
  const ms = performance.now() - t0;
  assert.equal(defaultDepth(SV), 'modules');
  assert.ok(F.lanes.every(l => l.kind === 'stage' || l.kind === 'outside'), 'forty modules stand in columns in flow order');
  assert.ok(F.lanes.filter(l => l.kind === 'stage').length <= 7, 'forty modules read as a page, not a strip');
  checkLayout(F, L, 'synthetic:modules'); checkLayout(FM, LM, 'synthetic:M7'); checkLayout(FC, LC, 'synthetic:components');
  assert.equal(FC.rows.filter(r => r.kind === 'component').length, 160);
  assert.ok(ms < 5000, 'model, fold and three layouts in ' + Math.round(ms) + ' ms');
  pass(`a synthetic 160-component system in 40 modules, with no Chapter 5 records, folds to ${F.rows.length} module cards in ${F.lanes.filter(l => l.kind === 'stage').length} columns in flow order (${L.W} × ${L.H}), opens one module (${FM.rows.length} rows), and lays out all 160 components without a single collision in ${Math.round(ms)} ms`);
}

console.log(JSON.stringify({suite: 'chapter 5 model (application realisation)', passed: checks.length, checks, limits: ['The model shows recorded allocations and interactions. It does not judge whether a component boundary is well chosen.', 'The synthetic system is generated only for structure and scale.']}, null, 2));
