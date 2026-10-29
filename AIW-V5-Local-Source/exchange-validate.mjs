// Chapter 8 Model checks: scenarios derived from recorded facts (the readings and insights are built on them),
// slicing, and layout invariants for the Data flow view. The chapter's own Sequence view is retired since round 11
// (the Diagram's Sequence picture draws the messages; notation-validate.mjs checks it), with its fold and layout.
// Run: npm run test:exchange
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {anatomySource, anatomyModel} from './public/anatomy-model.js';
import * as XM from './public/exchange-model.js';
import * as XL from './public/exchange-layout.js';
import {exchangeSource, exchangeModel, foldData, exchangeScope, exchangeInsights, describeEvent, laneFn, defaultDepth, outcomeOf} from './public/exchange-model.js';
import {dataLayout} from './public/exchange-layout.js';
import {notationDiagram} from './public/notation-model.js';
import {resolveView, TRAY} from './public/instrument-tray.js';
import {coreBankingSource, syntheticSource} from './anatomy-fixtures.mjs';

const checks = [], pass = name => checks.push(name);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const X = exchangeSource(project);
const CB = exchangeModel(anatomyModel(coreBankingSource()));
const calls = s => s.events.filter(e => e.t === 'call');
const scopesFor = X => [{kind: 'system'}, ...X.M.modules.slice(0, 3).map(m => ({kind: 'module', id: m.id})), ...X.M.comp.slice(0, 3).map(c => ({kind: 'part', id: c.id})), ...X.M.parties.slice(0, 1).map(p => ({kind: 'part', id: p.id}))];
const subsequence = (ids, order) => { const pos = ids.map(id => order.indexOf(id)); return pos.every((p, i) => i === 0 || p > pos[i - 1]); };

// 1. The adapter reads contracts, data and interactions without inventing anything.
assert.equal(X.C.size, project.interfaces.contracts.length);
assert.equal(X.D.size, project.interfaces.data.length);
for (const c of X.C.values()) { assert.ok(X.M.byId.has(c.from) && X.M.byId.has(c.to), c.id + ' ends are recorded objects'); for (const d of [...c.req, ...c.res]) assert.ok(X.D.has(d)); }
for (const l of X.links) assert.ok(X.M.byId.has(l.from) && X.M.byId.has(l.to));
assert.equal(new Set(X.order).size, X.order.length, 'every actor once');
assert.equal(X.order.length, X.M.comp.length + X.M.parties.length);
assert.equal(X.order[0], 'ext-channel', 'the party that starts work reads first');
assert.deepEqual(X.order.slice(-2), ['ext-core', 'ext-network'], 'the parties work reaches read last');
const versioned = structuredClone(project);
const contract = versioned.interfaces.contracts.find(c => c.id === 'rest');
contract.contractVersion = 'v2'; contract.compatibility = 'v1 consumers supported during migration'; contract.evidence = 'Consumer review CR-42';
const projected = exchangeSource(versioned).C.get('rest');
assert.deepEqual([projected.version, projected.compatibility, projected.evidence], ['v2', 'v1 consumers supported during migration', 'Consumer review CR-42'], 'version, compatibility and evidence stay attached to the selected contract');
assert.equal(JSON.stringify(project), before, 'the project is not changed');
pass('the adapter reads contracts, data and interactions from the saved project and orders lifelines from where work enters to where it leaves');

// 2. Business journeys become sequences through responsibilities, components and contracts.
const byId = id => X.scenarios.find(s => s.id === id);
assert.deepEqual(X.scenarios.map(s => s.id), ['journey:confirmed', 'journey:held', 'journey:uncertain', 'catalog']);
const confirmed = byId('journey:confirmed');
assert.deepEqual(calls(confirmed).map(e => e.contract), ['rest', 'if-004', 'if-005', 'posting-api', 'if-006', 'network', 'if-007']);
assert.deepEqual(confirmed.events.filter(e => e.t === 'step').map(e => [e.ref, e.actor]), [['JRN-001', 'api-pod'], ['JRN-002', 'risk-engine'], ['JRN-003', 'core-adapter'], ['JRN-004', 'worker'], ['JRN-005', 'notify-worker']]);
assert.deepEqual(confirmed.events.filter(e => e.t === 'guard').map(e => e.label), ['Allow', 'Confirmed']);
assert.equal(confirmed.outcome, 'done');
for (const s of X.scenarios) {
  const stack = [];
  for (const e of s.events) {
    if (e.t === 'call' && !e.async) stack.push(e.id);
    if (e.t === 'return') assert.equal(e.of, stack.pop(), s.id + ': answers return in reverse order of the requests');
  }
  assert.equal(stack.length, 0, s.id + ': every request is answered');
  assert.ok(calls(s).filter(e => e.async).every(c => !s.events.some(r => r.t === 'return' && r.of === c.id)), 'events are not answered');
}
const held = byId('journey:held');
assert.deepEqual(calls(held).map(e => e.contract), ['rest', 'if-004']);
assert.equal(held.outcome, 'stopped');
assert.equal(held.events.find(e => e.t === 'end').actor, 'risk-engine');
const uncertain = byId('journey:uncertain'), lost = uncertain.events.filter(e => e.lost);
assert.equal(lost.length, 1); assert.equal(lost[0].contract, 'network');
assert.equal(uncertain.events[uncertain.events.indexOf(lost[0]) + 1].t, 'recover', 'what the contract says follows the lost answer');
assert.equal(uncertain.outcome, 'uncertain');
assert.deepEqual([outcomeOf('Pending enquiry and reconciliation'), outcomeOf('Instruction held for review'), outcomeOf('Customer sees confirmed outcome')], ['uncertain', 'stopped', 'done']);
pass('the three recorded payment journeys become sequences: requests nest and are answered in reverse order, the held path stops at screening, and the uncertain path loses the settlement answer');

// 3. Where no journey is recorded, the call tree from where work enters is used.
assert.deepEqual(CB.scenarios.map(s => s.kind), ['entry', 'catalog']);
const tree = CB.scenarios[0], ifo3 = tree.events.find(e => e.contract === 'IF-03'), ret3 = tree.events.findIndex(e => e.t === 'return' && e.of === ifo3.id);
const inside = tree.events.slice(tree.events.indexOf(ifo3) + 1, ret3).filter(e => e.t === 'call' && e.from === 'APP-09').map(e => e.contract);
assert.deepEqual(inside, ['IF-04', 'IF-05', 'IF-06', 'IF-07'], 'the payments hub calls screening, funds, posting and clearing inside the transfer request');
assert.equal(calls(CB.scenarios[1]).length, CB.links.length, 'the catalogue shows every interaction once');
pass('without a recorded journey, the sequence follows the call tree from where work enters, and a catalogue shows every interaction once');

// 4. Slicing: the lanes a scope folds to keep the global order and open a module into its components; the data view
//    (the one own view since round 11) folds to the same lanes.
for (const M of [X, CB]) for (const scope of scopesFor(M)) for (const depth of ['components', 'modules']) {
  const lane = laneFn(M, scope, depth), G = foldData(M, scope, depth);
  const ids = G.lanes.map(l => l.id), global = [...new Set(M.order.map(lane))];
  assert.ok(subsequence(ids, global), 'lanes keep the global order');
  for (const m of G.rows.flatMap(r => r.moves)) { assert.equal(m.a, lane(m.from)); assert.equal(m.b, lane(m.to)); }
  if (scope.kind === 'part') assert.ok(ids.includes(scope.id) || !G.rows.length, 'the part keeps its lane');
  if (scope.kind === 'module') for (const c of M.M.comp.filter(c => M.M.mod.get(c.id) === scope.id)) assert.equal(lane(c.id), c.id, 'the module opens into its components');
}
assert.deepEqual([...new Set(X.order.map(laneFn(X, {kind: 'system'}, 'modules')))], ['ext-channel', 'GRP-001', 'GRP-002', 'GRP-003', 'ext-core', 'ext-network']);
assert.equal(exchangeScope(X, {kind: 'part', id: 'if-004'}).id, 'risk-engine', 'a contract opens on the component that provides it');
assert.equal(exchangeScope(X, {kind: 'part', id: 'network'}).id, 'worker', '…or on its caller when the provider is outside the system');
assert.equal(exchangeScope(X, {kind: 'part', id: 'instruction'}).id, 'api-pod', 'data opens on its authority');
assert.equal(defaultDepth(X), 'components'); assert.equal(defaultDepth(CB), 'modules');
pass('slicing to modules, one module or one part folds the lanes of the Data flow without losing a movement, keeps their order, and opens a module into its components');

// 5. The Sequence view is retired (round 11, A): its fold and layout are gone with it, the Diagram's Sequence picture
//    draws the same contracts as messages on the same lifelines, and an old deep link lands there and says so.
assert.ok(!('foldScenario' in XM) && !('sequenceLayout' in XL), 'the retired view\'s fold and layout are gone');
const SP = notationDiagram(project, 'sequence');
assert.deepEqual([...new Set(SP.edges.map(e => e.record?.id))].sort(), [...X.C.keys()].sort(), 'every contract of the chapter is a message of the Sequence picture');
for (const c of X.C.values()) { const msgs = SP.edges.filter(e => e.record?.id === c.id); assert.ok(msgs.some(e => !e.reply) && (c.async || msgs.some(e => e.reply)), c.id + ': a request, and an answer unless it is an event'); assert.ok(msgs.every(e => SP.nodes.some(n => n.id === e.from) && SP.nodes.some(n => n.id === e.to)), 'on lifelines the picture draws'); }
assert.deepEqual(resolveView(project, 8, 'sequence'), {view: 'diagram', scene: 'sequence', note: TRAY[8].retired.sequence.note}, 'model=sequence opens the Diagram on the Sequence picture and says why');
assert.ok([...X.C.values()].every(c => ['timeout', 'retry', 'failure', 'correlation'].every(k => k in c) && Array.isArray(c.gaps)), 'the promises a selected message reads (timeout, retry, failure, repeats, correlation) are each contract\'s own fields, with its gaps named');
pass('the Sequence view is retired with its fold and layout; the Diagram\'s Sequence picture draws every contract as messages on the lifelines it reads, an old deep link lands on it and says so, and the promises its companion reads are the contract\'s own fields');

// 6. The lens is not an input of the layout, so switching lens never moves anything.
assert.equal(dataLayout.length, 1);
assert.ok(!/lens/.test(dataLayout.toString()), 'layout never reads the lens');
pass('the layout does not read the lens: switching Flow, Signals and Information never moves an object');

// 7. Data flow: each definition's authority, movements and copies; tracks never collide.
let dataLayouts = 0;
for (const M of [X, CB]) for (const scope of scopesFor(M)) for (const depth of ['components', 'modules']) for (const viewW of [640, 1180]) {
  const G = foldData(M, scope, depth), L = dataLayout(G, {viewW});
  dataLayouts++;
  L.rows.forEach((r, i) => { if (i) assert.ok(r.y >= L.rows[i - 1].y + L.rows[i - 1].h - 0.01); });
  for (const r of L.rows) {
    const mv = L.moves.filter(m => m.data === r.id);
    for (let i = 0; i < mv.length; i++) for (let j = i + 1; j < mv.length; j++) if (Math.abs(mv[i].y - mv[j].y) < 1) assert.ok(Math.max(mv[i].x1, mv[i].x2) < Math.min(mv[j].x1, mv[j].x2) || Math.max(mv[j].x1, mv[j].x2) < Math.min(mv[i].x1, mv[i].x2), 'movements on one track never overlap');
    for (const m of mv) assert.ok(m.y > r.y && m.y < r.y + r.h);
    if (r.row.authority) assert.ok(L.marks.some(k => k.kind === 'authority' && k.data === r.id && k.lane === r.row.authority));
  }
}
const G = foldData(X, {kind: 'system'}, 'components'), inst = G.rows.find(r => r.id === 'instruction');
assert.equal(inst.authority, 'api-pod');
assert.deepEqual(inst.moves.map(m => m.contract).sort(), ['if-004', 'network', 'posting-api', 'rest']);
assert.deepEqual(X.moves.filter(m => m.unsourced).map(m => m.from + ':' + m.data).sort(), ['core-adapter:instruction', 'worker:instruction'], 'parts that send data nobody gave them are found');
pass(`${dataLayouts} data-flow layouts: each definition shows its authority and every movement, tracks never collide, and sends without a recorded source are found`);

// 8. Gaps stay visible where the design is missing.
const src2 = anatomySource(project);
const cut = {...src2, rels: src2.rels.filter(r => !(r.type === 'interaction' && r.from === 'core-adapter' && r.to === 'worker') && !(['uses', 'provides'].includes(r.type) && r.to === 'if-006'))};
const XG = exchangeModel(anatomyModel(cut), {contracts: project.interfaces.contracts.filter(c => c.id !== 'if-006'), data: project.interfaces.data, paths: X.journeys});
const gap = XG.scenarios[0].events.find(e => e.t === 'gap');
assert.ok(gap && gap.from === 'core-adapter' && gap.to === 'worker', 'a step with no recorded interaction shows as a gap');
assert.ok(exchangeInsights(XG).some(i => i.kind === 'gap' && /no recorded interaction/.test(i.text)));
const orphanP = structuredClone(project); orphanP.interfaces.data[0].authorityId = ''; for (const c of orphanP.realisation.components) c.dataIds = (c.dataIds || []).filter(id => id !== orphanP.interfaces.data[0].id);
const XO = exchangeSource(orphanP), LO = dataLayout(foldData(XO), {viewW: 1100});
assert.ok(LO.marks.some(k => k.kind === 'orphan' && k.data === orphanP.interfaces.data[0].id), 'data without an authority shows a socket');
pass('a journey step with no recorded interaction and data without an authority stay visible as gaps, with a way to close them');

// 9. What the model shows: derived only from recorded facts.
const ins = exchangeInsights(X);
assert.ok(ins.some(i => i.kind === 'risk' && /IF-001/.test(i.text) && /5 further requests/.test(i.text)), 'the long waiting chain behind IF-001 is shown');
assert.ok(ins.some(i => /no timeout policy \(IF-002, IF-003\)/.test(i.text)));
assert.ok(ins.some(i => /Core connector sends Payment instruction/.test(i.text)));
assert.ok(ins.some(i => /Confidential data DAT-001/.test(i.text)));
const partIns = exchangeInsights(X, {kind: 'part', id: 'notify-worker'});
assert.ok(partIns.length < ins.length, 'a part sees only what concerns it');
for (const s of [...X.scenarios, ...CB.scenarios]) for (const e of s.events) { const t = describeEvent(s === CB.scenarios[0] || s === CB.scenarios[1] ? CB : X, e); assert.ok(!/undefined|null|\[object/.test(t), 'plain reading: ' + t); }
pass('the companion reading and insights come from recorded facts: the waiting chain behind IF-001, external calls without timeouts, data sent without a source, and confidential data leaving the system');

// 10. Scale.
{
  const SX = exchangeModel(anatomyModel(syntheticSource({modules: 40, comps: 4, caps: 14, seed: 11})));
  let t = performance.now();
  const G = foldData(SX, {kind: 'system'}, defaultDepth(SX)), L = dataLayout(G, {viewW: 1180});
  const GM = foldData(SX, {kind: 'module', id: 'M3'}, 'components'), LM = dataLayout(GM, {viewW: 1180});
  const ms = performance.now() - t;
  assert.equal(defaultDepth(SX), 'modules');
  assert.ok(G.lanes.length <= 42, 'a large system folds into module columns');
  const c3 = SX.M.comp.find(c => SX.M.mod.get(c.id) === 'M3'); assert.ok(c3 && laneFn(SX, {kind: 'module', id: 'M3'}, 'components')(c3.id) === c3.id && LM.lanes.length <= G.lanes.length + 4, 'one module opens into its components');
  assert.ok(ms < 400, 'fold and layout in ' + Math.round(ms) + ' ms');
  pass(`a synthetic 40-module, 160-component system folds into ${G.lanes.length} module columns and lays out ${L.rows.length} data rows in ${Math.round(ms)} ms`);
}

console.log(JSON.stringify({suite: 'chapter 8 model (interfaces & data)', passed: checks.length, checks, limits: ['Nesting follows the recorded contract kinds: a request waits for its answer. Where a real system answers early, the contract should say so (an event).', 'The core-banking and synthetic fixtures are hypothetical and used only for structure and scale.']}, null, 2));
