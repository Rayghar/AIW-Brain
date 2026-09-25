// Design anatomy checks: model adapter, smart layout invariants, routing, scale and findings.
// Run: npm run test:anatomy
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview, inheritedFindings} from './public/review-domain.js';
import {anatomySource, anatomyModel, anatomyFindings, anatomyInsights, lineage, STRATA, LENSES, TYPE_CHAPTER} from './public/anatomy-model.js';
import {anatomyLayout, resolveScope, moduleOrder, rectsOverlap, GAP} from './public/anatomy-layout.js';
import {coreBankingSource, syntheticSource} from './anatomy-fixtures.mjs';

const checks = [];
const pass = name => checks.push(name);
const project = withFinalReview(seedProject());
const REF = anatomyModel(anatomySource(project));
const CB = anatomyModel(coreBankingSource());
const CARD_KINDS = new Set(['intent', 'count', 'resp', 'comp', 'party', 'lane', 'plate', 'run', 'socket']);
const cards = L => L.items.filter(i => CARD_KINDS.has(i.kind));
const rectOf = i => ({x: Math.round(i.x * 10) / 10, y: Math.round(i.y * 10) / 10, w: Math.round(i.w * 10) / 10, h: Math.round(i.h * 10) / 10});
const layoutOf = (M, over = {}) => anatomyLayout(M, {chapter: 11, scope: {kind: 'system'}, peel: null, order: {}, viewW: 1180, ...over});
const scopesFor = M => [{kind: 'system'}, ...M.modules.slice(0, 3).map(m => ({kind: 'module', id: m.id})), ...M.comp.slice(0, 3).map(c => ({kind: 'part', id: c.id})), ...M.cap.slice(0, 2).map(c => ({kind: 'part', id: c.id}))];

// 1. The adapter reads the connected project without inventing objects.
assert.equal(REF.modules.length, project.logical.groups.length);
assert.equal(REF.resp.length, project.logical.responsibilities.length);
assert.equal(REF.comp.length, project.realisation.components.length);
assert.equal(REF.cap.length, project.technology.capabilities.length);
assert.equal(REF.tech.length, project.technologyRealisation.records.length);
assert.equal(REF.contracts.length, project.interfaces.contracts.length);
assert.ok(REF.flows.length >= 5, 'component interactions are projected');
for (const f of REF.flows) assert.ok(REF.byId.has(f.from) && REF.byId.has(f.to));
pass('adapter reads modules, responsibilities, components, capabilities, products, contracts and flows from the saved project');

// 2. Findings attach to the parts they concern; nothing is lost.
const all = inheritedFindings(project), F = anatomyFindings(project, REF, 11);
assert.equal(F.all.length, all.length);
const hosted = [...F.byHost.values()].flat().length;
assert.equal(hosted + F.system.length, all.length);
assert.ok(hosted / all.length > 0.9, 'most findings sit on a drawn part');
const CARD_TYPES = new Set(['requirement', 'quality', 'decision', 'responsibility', 'component', 'party', 'capability', 'technology', 'runtime']);
for (const id of F.byHost.keys()) assert.ok(REF.byId.has(id) && CARD_TYPES.has(REF.T(id)), 'finding host is a card on the canvas: ' + id);
const drawn = new Set(layoutOf(REF).items.map(i => i.obj || i.gapFor).filter(Boolean));
for (const id of F.byHost.keys()) if (REF.T(id) !== 'requirement' && REF.T(id) !== 'quality' && REF.T(id) !== 'decision') assert.ok(drawn.has(id), 'finding host is drawn at Chapter 11: ' + id);
const early = anatomyFindings(project, REF, 4);
assert.ok(early.all.length < F.all.length && early.all.every(f => f.chapter <= 4));
pass('findings are hosted on drawn parts (' + hosted + ' of ' + all.length + '), system-level ones are kept, and the view only shows chapters reached so far');

// 3. Layout never overlaps cards — every chapter, scope and opened layer, on both fixtures.
let layouts = 0;
for (const M of [REF, CB]) for (let chapter = 1; chapter <= 11; chapter++) for (const scope of scopesFor(M)) for (const peel of [null, ...STRATA.map(s => s.id)]) {
  const L = layoutOf(M, {chapter, scope, peel}); layouts++;
  const cs = cards(L);
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) assert.ok(!rectsOverlap(cs[i], cs[j], 0.5), `overlap ${cs[i].id} × ${cs[j].id} (chapter ${chapter}, ${JSON.stringify(scope)}, ${peel})`);
  for (const c of cs) assert.ok(c.x >= L.labelW && c.x + c.w <= L.W + 0.5 && c.y >= 0 && c.y + c.h <= L.H, 'card inside the world: ' + c.id);
}
pass(layouts + ' layouts (11 chapters × scopes × opened layers × 2 models) have no overlapping cards');

// 4. Switching lenses never moves an object: the layout does not read the lens.
for (const M of [REF, CB]) for (const scope of scopesFor(M)) {
  const base = JSON.stringify(cards(layoutOf(M, {scope})).map(rectOf));
  for (const l of LENSES) assert.equal(JSON.stringify(cards(layoutOf(M, {scope, lens: l.id})).map(rectOf)), base, 'lens ' + l.id + ' moved objects');
}
pass('every lens reuses the identical layout in every scope');

// 5. Columns keep their place while the design grows chapter by chapter.
for (const M of [REF, CB]) {
  const cols = ch => JSON.stringify(layoutOf(M, {chapter: ch}).cols.map(c => [c.id, Math.round(c.x), Math.round(c.w)]));
  for (let ch = 5; ch <= 11; ch++) assert.equal(cols(ch), cols(4), 'columns moved at chapter ' + ch);
  const resp = ch => JSON.stringify(layoutOf(M, {chapter: ch}).items.filter(i => i.kind === 'resp').map(i => [i.obj, rectOf(i)]));
  for (let ch = 6; ch <= 11; ch++) assert.equal(resp(ch), resp(5), 'responsibilities moved at chapter ' + ch);
}
pass('module columns are identical from Chapter 4 to 11 and responsibilities keep their position as deeper layers are added');

// 6. Each layer appears in its chapter; the next layer is an empty socket; later ones are future.
for (let ch = 1; ch <= 11; ch++) {
  const L = layoutOf(CB, {chapter: ch});
  for (const b of L.bands.filter(b => !b.corridor)) {
    const s = STRATA.find(x => x.id === b.id);
    if (ch < s.ch) assert.ok(['next', 'future'].includes(b.mode), b.id + ' should not be designed yet at chapter ' + ch);
    else assert.ok(!['next', 'future'].includes(b.mode));
  }
  const kinds = new Set(L.items.map(i => i.kind));
  if (ch < 5) assert.ok(!kinds.has('comp')); else assert.ok(kinds.has('comp'));
  if (ch < 6) assert.ok(!kinds.has('lane')); else assert.ok(kinds.has('lane'));
  if (ch < 7) assert.ok(!kinds.has('plate'));
  if (ch < 10) assert.ok(!L.items.some(i => i.kind === 'run'));
  const next = L.bands.find(b => b.mode === 'next');
  if (next) assert.ok(L.items.some(i => i.kind === 'socket' && i.next), 'next layer shows design questions at chapter ' + ch);
}
pass('layers appear in their own chapter; the next layer is drawn as dashed design questions');

// 7. Realization reads top to bottom, and shared platform parts are one lane.
for (const M of [REF, CB]) {
  const L = layoutOf(M), at = id => L.byObj.get(id);
  for (const c of M.comp) { const cc = at(c.id); if (!cc) continue; for (const r of M.realizes.get(c.id) || []) { const rr = at(r); if (rr) assert.ok(rr.y + rr.h <= cc.y, r + ' sits above ' + c.id); } }
  for (const cap of M.cap) {
    const lanes = L.items.filter(i => i.kind === 'lane' && i.obj === cap.id);
    assert.equal(lanes.length, 1, cap.id + ' drawn once');
    const lane = lanes[0], users = (M.capUsers.get(cap.id) || []).map(at).filter(Boolean);
    for (const u of users) { assert.ok(lane.x <= u.x + 1 && lane.x + lane.w >= u.x + u.w - 1, cap.id + ' spans ' + u.obj); assert.ok(lane.y > u.y + u.h, cap.id + ' lies beneath ' + u.obj); }
    const t = M.techOf.get(cap.id), plate = t && at(t);
    if (plate) { assert.ok(Math.abs(plate.x - lane.x) < 1 && Math.abs(plate.w - lane.w) < 1 && plate.y > lane.y, 'product sits under its capability'); }
  }
}
pass('responsibilities sit above the components that realize them; each capability is one lane spanning its users; products sit under their capability');

// 8. Structural gaps become sockets where the missing design belongs.
{
  const L = layoutOf(CB);
  const sockets = new Set(L.items.filter(i => i.kind === 'socket' && !i.next).map(i => i.id));
  for (const r of CB.resp) if (!(CB.realizedBy.get(r.id) || []).length) assert.ok(sockets.has('G:realize:' + r.id), 'socket for unrealized ' + r.id);
  for (const c of CB.cap) if (!CB.techOf.get(c.id)) assert.ok(sockets.has('G:tech:' + c.id), 'socket for unrealized capability ' + c.id);
  for (const c of CB.comp) if (!(CB.runsOf.get(c.id) || []).length) assert.ok(sockets.has('G:run:' + c.id));
  assert.ok(sockets.has('G:realize:LR-19') && sockets.has('G:tech:TC-10'));
  const ins = anatomyInsights(CB, 11);
  assert.ok(ins.some(i => i.id === 'LR-19') && ins.some(i => i.id === 'TC-10') && ins.some(i => i.kind === 'risk'));
}
pass('missing realizations, products and runtime plans are sockets in their own layer, and the companion lists them');

// 9. Interactions are orthogonal and never pass through a card.
const segHitsRect = (a, b, r) => {
  const x1 = Math.min(a[0], b[0]), x2 = Math.max(a[0], b[0]), y1 = Math.min(a[1], b[1]), y2 = Math.max(a[1], b[1]);
  return x1 < r.x + r.w - 1 && x2 > r.x + 1 && y1 < r.y + r.h - 1 && y2 > r.y + 1;
};
let routed = 0;
for (const M of [REF, CB]) for (let chapter = 4; chapter <= 11; chapter++) for (const scope of scopesFor(M)) {
  const L = layoutOf(M, {chapter, scope}), cs = cards(L);
  for (const r of L.routes) {
    routed++;
    for (let i = 1; i < r.points.length; i++) {
      const a = r.points[i - 1], b = r.points[i];
      assert.ok(Math.abs(a[0] - b[0]) < 0.01 || Math.abs(a[1] - b[1]) < 0.01, 'orthogonal segment in ' + r.id);
      for (const c of cs) { if (c.obj === r.from || c.obj === r.to) continue; assert.ok(!segHitsRect(a, b, c), `${r.id} crosses ${c.id} (chapter ${chapter}, ${JSON.stringify(scope)})`); }
    }
  }
}
pass(routed + ' interaction routes are orthogonal and avoid every card');

// 10. Smart arrangement: work reads left to right, results are deterministic, manual order is kept.
{
  const order = moduleOrder(REF);
  assert.equal(order[0], 'GRP-001', 'the module the customer channel calls comes first');
  assert.deepEqual(moduleOrder(REF), order);
  const cbOrder = moduleOrder(CB);
  assert.equal(cbOrder[0], 'M-CH', 'digital channels come first in core banking');
  const cost = ord => { const pos = new Map(ord.map((id, i) => [id, i])); let c = 0; for (const f of CB.flows) { const a = pos.get(CB.mod.get(f.from)), b = pos.get(CB.mod.get(f.to)); if (a !== undefined && b !== undefined) c += Math.abs(a - b); } return c; };
  assert.ok(cost(cbOrder) < cost(CB.modules.map(m => m.id)), 'smart order shortens interactions: ' + cost(cbOrder) + ' < ' + cost(CB.modules.map(m => m.id)));
  const manual = [...CB.modules.map(m => m.id)].reverse().slice(1);
  const L = layoutOf(CB, {order: {system: manual}});
  const drawn = L.cols.filter(c => c.kind === 'module').map(c => c.moduleId);
  assert.deepEqual(drawn.filter(id => manual.includes(id)), manual, 'manual order respected');
  assert.equal(drawn.length, CB.modules.length, 'a module missing from the saved order is placed, not dropped');
}
pass('smart arrangement reads work left to right, shortens interaction distance, is deterministic, and keeps a saved manual order');

// 11. Dissection: any part resolves to a scope with the same layers, one level deeper.
{
  assert.deepEqual(resolveScope(REF, {kind: 'part', id: 'api'}), {kind: 'part', id: 'api-pod', partType: 'component', focus: 'api'});
  assert.equal(resolveScope(REF, {kind: 'part', id: 'tr-001'}).id, 'tc-001');
  assert.equal(resolveScope(REF, {kind: 'part', id: 'run-001'}).id, 'api-pod');
  assert.equal(resolveScope(REF, {kind: 'part', id: 'instruction'}).id, 'api-pod');
  const mod = layoutOf(CB, {scope: {kind: 'module', id: 'M-PY'}});
  const compCols = mod.cols.filter(c => c.kind === 'component').map(c => c.compId);
  assert.deepEqual(new Set(compCols), new Set(CB.comp.filter(c => CB.mod.get(c.id) === 'M-PY').map(c => c.id)));
  const partners = new Set(CB.flows.filter(f => compCols.includes(f.from) !== compCols.includes(f.to)).map(f => (compCols.includes(f.from) ? f.to : f.from)));
  const ctx = new Set(mod.cols.filter(c => c.kind === 'ctx').flatMap(c => c.partners));
  assert.deepEqual(ctx, partners, 'every partner of the module appears as context');
  const part = layoutOf(CB, {scope: {kind: 'part', id: 'APP-09'}});
  const subject = part.items.find(i => i.kind === 'comp' && i.obj === 'APP-09');
  assert.equal(subject.detail, 'full');
  assert.deepEqual(new Set(part.lanes.map(l => l.cap)), new Set(CB.needs.get('APP-09')));
  const cap = layoutOf(CB, {scope: {kind: 'part', id: 'TC-03'}});
  assert.deepEqual(new Set(cap.cols.map(c => c.compId)), new Set(CB.capUsers.get('TC-03')));
  assert.equal(cap.lanes.length, 1);
}
pass('system → module → part dissection keeps the same layers: module view shows its components with context partners; part views show one component or one platform capability in full');

// 12. Lineage: selecting a part lights its reasons above and its realization below.
{
  const set = lineage(REF, 'api');
  for (const id of ['api-pod', ...(REF.needs.get('api-pod') || []), ...(REF.runsOf.get('api-pod') || [])]) assert.ok(set.has(id), 'lineage includes ' + id);
  const w = REF.why('api'); for (const id of [...w.reqs, ...w.qds, ...w.adrs]) assert.ok(set.has(id));
  const cap = lineage(CB, 'TC-03');
  for (const u of CB.capUsers.get('TC-03')) assert.ok(cap.has(u) && (CB.realizes.get(u) || []).every(r => cap.has(r)));
}
pass('lineage runs from requirements, qualities and decisions through responsibilities, components, platform, products and runtime');

// 13. Scale: a 40-module system lays out quickly without overlaps.
{
  const M = anatomyModel(syntheticSource({modules: 40, comps: 4, caps: 14}));
  const t0 = performance.now(), L = layoutOf(M, {viewW: 1400}), ms = performance.now() - t0;
  const cs = cards(L);
  const grid = new Map(); let overlaps = 0;
  for (const c of cs) { const k = Math.floor(c.x / 400); for (const o of grid.get(k) || []) if (rectsOverlap(c, o, 0.5)) overlaps++; for (const kk of [k, k + 1]) { if (!grid.has(kk)) grid.set(kk, []); grid.get(kk).push(c); } }
  assert.equal(overlaps, 0);
  assert.ok(ms < 1500, 'layout time ' + Math.round(ms) + ' ms');
  assert.equal(L.cols.filter(c => c.kind === 'module').length, 40);
  assert.ok(L.cols.every((c, i, a) => i === 0 || c.x >= a[i - 1].x + a[i - 1].w + GAP - 0.5), 'columns never overlap');
  pass('a synthetic 40-module, 160-component system lays out in ' + Math.round(ms) + ' ms with no overlaps');
}

console.log(JSON.stringify({suite: 'design anatomy', passed: checks.length, checks, limits: ['Layout and routing are checked geometrically; readability for novices still needs recorded walkthroughs.', 'The core-banking fixture is hypothetical and is not the recorded SEABaaS architecture.']}, null, 2));
