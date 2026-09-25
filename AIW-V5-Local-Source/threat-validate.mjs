// Chapter 9 Model checks: the threat model across trust boundaries, its slicing and layout,
// the chapter's coverage rule, and the threats × controls matrix. Run: npm run test:threat
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {securityProposal} from './public/security-domain.js';
import {anatomyModel} from './public/anatomy-model.js';
import {exchangeModel} from './public/exchange-model.js';
import {threatSource, threatModel, foldThreat, threatScope, coverage, crossingsOf, threatInsights, describeFlow, defaultDepth, PROPOSED, OUT_L, OUT_R} from './public/threat-model.js';
import {threatLayout, matrixLayout, TM} from './public/threat-layout.js';
import {syntheticSource} from './anatomy-fixtures.mjs';

const checks = [], pass = name => checks.push(name);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const T = threatSource(project);
const overlap = (a, b, m = 0) => a.x < b.x + b.w - m && b.x < a.x + a.w - m && a.y < b.y + b.h - m && b.y < a.y + a.h - m;

// 1. The adapter reads the recorded parts, parties, stores, boundaries, threats and controls.
assert.deepEqual(T.lanes, [OUT_L, 'tb-001', 'tb-002', 'tb-003', OUT_R], 'outside, the three boundaries in the order flows cross them, outside');
assert.equal(T.elements.size, 16);
assert.deepEqual([...T.elements.values()].filter(e => e.region === 'tb-002' && e.kind === 'component').map(e => e.id), ['api-pod', 'notify-worker', 'risk-engine', 'core-adapter', 'worker'], 'parts follow the anatomy\'s order');
assert.equal(T.elements.get('ext-channel').region, OUT_L, 'a party that only starts work stands on the left');
assert.deepEqual(['ext-core', 'ext-network'].map(id => T.elements.get(id).region), [OUT_R, OUT_R], 'the parties work reaches stand on the right');
assert.equal(T.flows.filter(f => f.kind === 'contract').length, 7); assert.equal(T.flows.filter(f => f.kind === 'uses').length, 28);
assert.deepEqual(T.journey, ['C:rest', 'C:if-004', 'C:if-005', 'C:posting-api', 'C:if-006', 'C:network', 'C:if-007'], 'the journey walk follows the recorded path');
assert.equal(JSON.stringify(project), before, 'the project is not changed');
pass('the adapter reads 16 elements in five trust regions — parties outside, three boundaries — with 7 contracts, 28 uses of platform and stores, and the journey in its recorded order');

// 2. The chapter's coverage rule, per affected object, and the matrix that shows it.
const cov = id => [...T.threats.get(id).coverage].map(([k, v]) => k + ':' + (v ? 'covered' : 'open')).join(' ');
assert.equal(cov('thr-001'), 'rest:covered instruction:open', 'SEC-001 protects the contract but not the instruction');
assert.equal(cov('thr-004'), 'posting-api:covered network:covered');
assert.deepEqual([...T.threats.values()].map(t => t.covered), [false, false, false, true]);
const G = coverage(T);
assert.deepEqual(G.cells.map(c => [c.threat, c.control, c.kind]), [['thr-001', 'oauth', 'covers'], ['thr-002', 'audit', 'overlap'], ['thr-004', 'audit', 'covers'], ['thr-004', 'mtls', 'overlap']]);
assert.deepEqual(G.threats.map(t => t.ref), ['THR-001', 'THR-002', 'THR-003', 'THR-004']);
// A recorded treatment closes a threat without a control.
const Tt = threatModel(T.X, {boundaries: project.technology.boundaries, appBoundaries: project.technology.applicationBoundaries, threats: project.security.threats, controls: project.security.controls, treatment: new Map([['thr-003', 'accept']])});
assert.ok(Tt.threats.get('thr-003').covered && Tt.status('settlement').open.length === 0, 'an accepted risk is treated, not exposed');
// An unsaved proposal is its own column, and says which threats it would close.
const q = securityProposal(project, 'authority', 'thr-001'), GP = coverage(T, {kind: 'system'}, {proposal: q});
assert.equal(GP.controls.at(-1).id, PROPOSED); assert.equal(GP.controls.filter(c => c.proposed).length, 1);
assert.ok(GP.cells.some(c => c.control === PROPOSED && c.threat === 'thr-001' && c.kind === 'covers'));
assert.deepEqual([...GP.closes], ['thr-001'], 'accepting it would bring THR-001 to full coverage');
assert.equal(JSON.stringify(project), before);
const GS = coverage(T, {kind: 'part', id: 'core-adapter'});
assert.deepEqual(GS.threats.map(t => t.ref), ['THR-002', 'THR-004'], 'a part shows only the threats on what it touches');
pass('coverage follows the chapter\'s rule per affected object; the matrix shows covers, links that protect nothing and unlinked overlaps; a treatment closes a threat; an unsaved proposal is its own column and names what it would close');

// 3. Crossings as drawn, and what the model shows.
const X9 = crossingsOf(T);
assert.deepEqual(X9.map(x => [x.kind, x.id, x.state]), [['contract', 'C:rest', 'guarded'], ['contract', 'C:posting-api', 'exposed'], ['contract', 'C:network', 'guarded'], ['entry', 'E:postgres<tb-002', 'unexamined'], ['entry', 'E:gateway<tb-002', 'unexamined'], ['entry', 'E:tc-006<tb-002', 'unexamined'], ['entry', 'E:tc-008<tb-002', 'unexamined']]);
assert.equal(X9.filter(x => x.kind === 'entry').reduce((n, x) => n + x.flows.length, 0), 15, 'uses of one element from one region are one entry');
const ins = threatInsights(T).map(i => i.text).join('\n');
assert.match(ins, /4 of 4 entries into platform services or stores in another boundary \(15 uses\) have no threat or control/);
assert.match(ins, /3 threats are not fully covered: THR-001 .*DAT-001 Payment instruction uncovered/);
assert.match(ins, /SEC-002 Audit trail protects something THR-002 threatens but is not linked/);
assert.match(ins, /SEC-003 Service trust is not linked to any threat/);
assert.match(describeFlow(T, 'C:rest'), /crosses from outside into Payment services, carrying Payment instruction\. Threats: THR-001\. Controls: SEC-001\./);
assert.match(describeFlow(T, 'C:posting-api'), /Not covered: THR-002/);
pass('seven crossings as drawn: IF-001 and IF-003 guarded, IF-002 exposed, four entries into platform and stores not yet examined; insights and readings come only from recorded facts');

// 4. Slicing: every element appears once at every depth; scopes keep neighbours as context.
for (const depth of ['boundaries', 'parts', 'all']) {
  const F = foldThreat(T, {kind: 'system'}, depth), members = F.rows.flatMap(r => r.members);
  assert.equal(new Set(members).size, members.length, depth + ': no element twice');
  assert.ok(F.links.every(l => l.from !== l.to), 'no flow folds onto itself');
  assert.ok(F.rows.filter(r => r.kind === 'party').length === 3, 'parties outside are never grouped');
  if (depth === 'boundaries') assert.deepEqual(F.rows.filter(r => r.kind === 'region').map(r => r.id), ['REG:tb-001', 'REG:tb-002', 'REG:tb-003']);
  if (depth === 'all') assert.equal(members.length, 16);
}
assert.equal(defaultDepth(T), 'parts');
const part = foldThreat(T, {kind: 'part', id: 'api-pod'}, 'parts');
assert.ok(part.rows.find(r => r.id === 'api-pod').subject && part.rows.filter(r => r.id !== 'api-pod').every(r => r.ctx));
assert.ok(['ext-channel', 'risk-engine', 'postgres', 'gateway'].every(id => part.rows.some(r => r.id === id)), 'what it talks to and reaches');
assert.ok(part.rows.some(r => r.id === 'REG:tb-002' && r.members.length === 3), 'the rest of its boundary folds');
assert.deepEqual(threatScope(T, {kind: 'part', id: 'posting-api'}), {kind: 'part', id: 'core-adapter', focus: 'posting-api'}, 'a contract opens on its caller');
assert.equal(threatScope(T, {kind: 'part', id: 'instruction'}).id, 'api-pod', 'a data record opens on its authority');
pass('slicing to boundaries, parts or one part shows each element once, never groups parties outside, and keeps what a part talks to beside it as context');

// 5. Layout invariants.
function checkLayout(F, L, tag) {
  L.lanes.forEach((l, i) => { if (i) assert.ok(l.x >= L.lanes[i - 1].x + L.lanes[i - 1].w, tag + ': lanes never overlap'); });
  for (const c of L.cards) { const ln = L.lanes.find(l => l.id === c.row.region); assert.ok(c.x >= ln.x && c.x + c.w <= ln.x + ln.w, tag + ': a card stays in its region'); }
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
  // Tracks in one gutter never overlap unless they share an entry's trunk.
  for (let i = 0; i < L.routes.length; i++) for (let j = i + 1; j < L.routes.length; j++) {
    const p = L.routes[i], q = L.routes[j];
    if (Math.abs(p.xt - q.xt) > 0.5 || (p.entry && p.entry === q.entry)) continue;
    const [a1, b1] = [Math.min(p.ya, p.yb), Math.max(p.ya, p.yb)], [a2, b2] = [Math.min(q.ya, q.yb), Math.max(q.ya, q.yb)];
    assert.ok(b1 < a2 || b2 < a1, `${tag}: ${p.id} and ${q.id} share a track`);
  }
  const boxes = [...L.cards, ...L.markers.map(m => ({x: m.x - 10, y: m.y - 10, w: 20, h: 20}))];
  L.labels.forEach((l, i) => { assert.ok(!boxes.some(b => overlap(l, b, 0.5)), tag + ': labels avoid cards and markers'); assert.ok(!L.labels.slice(i + 1).some(o => overlap(l, o, 0.5)), tag + ': labels never collide'); });
  assert.ok(L.markers.every(m => m.x >= 0 && m.x <= L.W && m.y >= L.top && m.y <= L.H));
  assert.equal(new Set(L.markers.map(m => m.id)).size, L.markers.length);
  assert.equal(JSON.stringify(threatLayout(F)), JSON.stringify(L), tag + ': layout is deterministic');
}
let layouts = 0;
const scopes = [{kind: 'system'}, {kind: 'boundary', id: 'tb-002'}, {kind: 'boundary', id: 'tb-003'}, {kind: 'part', id: 'api-pod'}, {kind: 'part', id: 'postgres'}, {kind: 'part', id: 'ext-core'}];
for (const sc of scopes) for (const depth of ['boundaries', 'parts', 'all']) { const F = foldThreat(T, sc, depth), L = threatLayout(F); checkLayout(F, L, `${sc.kind}:${sc.id || ''}:${depth}`); layouts++; }
const Lp = threatLayout(foldThreat(T, {kind: 'system'}, 'parts'));
assert.equal(Lp.slots, 5, 'twelve elements share five rows'); assert.ok(Lp.H < 620, 'the whole design fits one screen');
assert.equal(Lp.markers.length, 7); assert.equal(Lp.markers.filter(m => m.entry).length, 4);
assert.equal(Lp.labels.length, 7, 'every contract is labelled');
const row = id => Lp.cards.find(c => c.id === id).slot;
assert.equal(row('ext-core'), row('core-adapter'), 'a party is drawn level with its caller, so the flow reads straight across');
assert.equal(threatLayout.length, 1); assert.ok(!/\blens\b|protection|information/.test(threatLayout.toString()), 'layout never reads the lens');
pass(`${layouts} threat model layouts: regions and cards never overlap, every route is orthogonal and passes through no other card, gutter tracks are shared only by an entry's trunk, labels avoid cards, markers and each other, and the lens cannot move anything`);

// 6. The matrix layout.
const M = matrixLayout(GP);
M.rows.forEach((r, i) => { if (i) assert.ok(r.y >= M.rows[i - 1].y + M.rows[i - 1].h); });
for (const g of M.groups) assert.ok(!M.rows.some(r => overlap({x: 0, y: g.y, w: 1, h: g.h}, {x: 0, y: r.y, w: 1, h: r.h})), 'priority groups have their own band');
assert.ok(M.cols.every((c, i) => c.x >= M.rail && (!i || c.x >= M.cols[i - 1].x + M.cols[i - 1].w)));
assert.ok(M.coverX >= M.cols.at(-1).x + M.cols.at(-1).w && M.evidX > M.coverX);
for (const c of M.cells) { const r = M.rows.find(x => x.id === c.threat), k = M.cols.find(x => x.id === c.control); assert.ok(c.x === k.x + k.w / 2 && c.y === r.y + r.h / 2); }
assert.equal(M.cols.at(-1).id, PROPOSED, 'the proposal sits beside the coverage column');
pass('the threats × controls layout keeps rows, priority bands and columns apart, places each cell at its intersection, and puts the proposal beside Coverage');

// 7. Scale: a synthetic 160-part system in six boundaries.
{
  const X = exchangeModel(anatomyModel(syntheticSource({modules: 40, comps: 4, caps: 12, seed: 5})));
  const boundaries = Array.from({length: 6}, (_, i) => ({id: 'B' + i, ref: 'TB-' + i, title: 'Boundary ' + i, policy: 'Policy ' + i}));
  const app = {}; X.M.comp.forEach((c, i) => { app[c.id] = 'B' + Math.floor(i / 28); }); X.M.cap.forEach((c, i) => { app[c.id] = 'B' + (i % 6); });
  const links = X.links.filter(l => l.contract || l.id).slice(0, 60);
  const threats = links.filter((l, i) => i % 5 === 0).map((l, i) => ({id: 'T' + i, ref: 'THR-' + i, title: 'Threat ' + i, category: 'Unauthorised action', priority: ['High', 'Moderate'][i % 2], targetIds: [l.contract || l.id]}));
  const controls = threats.filter((t, i) => i % 2 === 0).map((t, i) => ({id: 'K' + i, ref: 'SEC-' + i, title: 'Control ' + i, category: 'Identity & access', threatIds: [t.id], targetIds: t.targetIds}));
  const t0 = performance.now();
  const ST = threatModel(X, {boundaries, appBoundaries: app, threats, controls});
  const F = foldThreat(ST, {kind: 'system'}, defaultDepth(ST)), L = threatLayout(F);
  const FB = foldThreat(ST, {kind: 'boundary', id: 'B2'}, 'parts'), LB = threatLayout(FB);
  const FP = foldThreat(ST, {kind: 'system'}, 'parts'), LP = threatLayout(FP);
  const ms = performance.now() - t0;
  assert.equal(defaultDepth(ST), 'boundaries');
  assert.equal(F.lanes.filter(l => l.kind === 'boundary').length, 6);
  checkLayout(F, L, 'synthetic:boundaries'); checkLayout(FB, LB, 'synthetic:B2'); checkLayout(FP, LP, 'synthetic:parts');
  assert.ok(FB.rows.some(r => r.subject === false && !r.ctx) && FB.rows.some(r => r.kind === 'region'), 'one boundary opens, the rest folds');
  assert.ok(ms < 4000, 'model, fold and three layouts in ' + Math.round(ms) + ' ms');
  pass(`a synthetic 160-part system in six boundaries folds to ${F.rows.length} rows, opens one boundary (${FB.rows.length} rows) and lays out all ${FP.rows.length} elements without a single collision in ${Math.round(ms)} ms`);
}

console.log(JSON.stringify({suite: 'chapter 9 model (security)', passed: checks.length, checks, limits: ['Coverage is the chapter\'s own design rule on recorded links and affected objects. It is not a security assessment or proof of implemented controls.', 'The synthetic system is generated only for structure and scale.']}, null, 2));
