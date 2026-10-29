// The round-10 line measures and the bundle integrity checker (notation-metrics.mjs), on hand-built pictures whose
// every number is worked out by hand, and on the reference project's real pictures. A bundle (L.bundles) is a drawing
// of relationships of one line style that share one element and one side of it: one trunk, a join where each leaves,
// a branch per relationship. These checks prove that drawnMetrics counts what is drawn (a trunk once, one mark at the
// shared end, the renderer's own marker rule), that bundleIntegrity finds every way a bundle could misstate the model
// or read as a bus (round-2 finding D2-12), and that diagramMetrics exempts shared runs only inside a valid bundle.
// Run: npm run test:notation-metrics
import assert from 'node:assert/strict';
import {drawnMetrics, bundleIntegrity, diagramMetrics, corridorMetrics, undottedKind, largeStraight, DRAWN} from './notation-metrics.mjs';
import {referenceProject, stressProject} from './notation-fixtures.mjs';
import {notationDiagram, SCENES, arrangementsFor} from './public/notation-model.js';
import {notationLayout, CORRIDOR} from './public/notation-layout.js';
import {svgParts} from './public/notation-svg.js';

const checks = [], pass = name => { checks.push(name); console.log('PASS', name); };
const clone = x => JSON.parse(JSON.stringify(x));
const rules = L => [...new Set(bundleIntegrity(L).map(v => v.rule))].sort();
const node = (id, x, y, w = 60, h = 40) => ({id, x, y, w, h, group: null});
const edge = (id, from, to, pts, extra = {}) => ({id, from, to, kind: 'serves', family: 'serving', label: '', ends: undefined, pts, lx: 0, ly: 0, labelHidden: true, ...extra});
const picture = (nodes, edges, extra = {}) => ({W: 600, H: 400, nodes, groups: [], edges, bands: [], arrangement: 'tree', ...extra});

// A fan-in of three serves relationships into T's bottom side, drawn as one bundle: a 60 px root from T's port, a join
// at (150,100) where A leaves to the left, a run to (150,140) shared by B and C, a join there where C leaves to the
// right and B goes on down. Each join is a T. Runs are stored oriented away from the shared end, branches in the
// relationship's own direction (from the source to the join), so the checker must read both orientations.
function fanIn({kind = 'serves', family = 'serving', extra = {}} = {}) {
  const nodes = [node('T', 100, 0, 100, 40), node('A', 0, 200), node('B', 120, 200), node('C', 240, 200)];
  const id = 'B:i|T|bottom|' + kind, k = {kind, family, bundle: id, bundleEnd: 'to', ...extra};
  const edges = [
    edge('eA', 'A', 'T', [[30, 200], [30, 100], [150, 100], [150, 40]], {...k, branch: [[30, 200], [30, 100], [150, 100]]}),
    edge('eB', 'B', 'T', [[150, 200], [150, 40]], {...k, branch: [[150, 200], [150, 140]]}),
    edge('eC', 'C', 'T', [[270, 200], [270, 140], [150, 140], [150, 40]], {...k, branch: [[270, 200], [270, 140], [150, 140]]})
  ];
  const bundle = {id, end: 'to', node: 'T', face: 'bottom', kind, family, label: '', dotted: !undottedKind(kind), members: ['eA', 'eB', 'eC'],
    runs: [{members: ['eA', 'eB', 'eC'], pts: [[150, 40], [150, 100]], root: true, far: false}, {members: ['eB', 'eC'], pts: [[150, 100], [150, 140]], root: false, far: false}],
    joins: [[150, 100], [150, 140]], root: 60};
  return picture(nodes, edges, {bundles: [bundle], consolidation: {bundles: 1, members: 3, joins: 2, passes: 1, dissolved: 0, fallback: false, why: []}});
}
// The same relationships as the control draws them: no bundle, each with its own port on T (18 px apart).
function fanInControl() {
  const nodes = [node('T', 100, 0, 100, 40), node('A', 0, 200), node('B', 120, 200), node('C', 240, 200)];
  return picture(nodes, [edge('eA', 'A', 'T', [[30, 200], [30, 100], [132, 100], [132, 40]]), edge('eB', 'B', 'T', [[150, 200], [150, 40]]), edge('eC', 'C', 'T', [[270, 200], [270, 140], [168, 140], [168, 40]])]);
}
const strip = L => { const c = clone(L); delete c.bundles; delete c.consolidation; for (const e of c.edges) { delete e.bundle; delete e.bundleEnd; delete e.branch; } return c; };

// 1. A valid fan-in: no violation, and what it draws, by hand.
{
  const L = fanIn(), before = JSON.stringify(L);
  assert.deepEqual(bundleIntegrity(L), [], 'a clean fan-in tree has no violation');
  const m = drawnMetrics(L);
  assert.equal(m.markers, 1, 'one arrowhead at the shared end (serves draws no tail)');
  assert.equal(m.paths, 5, 'two runs and three branches');
  assert.equal(m.lineEnds, 4, 'one port on T and one on each source');
  assert.equal(m.ink, 60 + 40 + 220 + 60 + 180, 'the trunk inked once');
  assert.equal(m.joins, 2); assert.equal(m.bundles, 1); assert.equal(m.bundled, 3); assert.equal(m.duplicates, 0); assert.equal(m.tabStops, 3, 'a Tab stop per relationship, not per line');
  assert.equal(m.visualCrossings, 0); assert.equal(m.touches, 0, 'a member branch meeting its own trunk is not a touch');
  assert.equal(m.foreignShared, 0); assert.equal(m.sameBundleShared, 3, 'the three members share the trunk by design');
  assert.equal(m.foreignOnTrunk + m.foreignAtJoin + m.tContacts, 0);
  assert.equal(m.bends, 2 + 0 + 2); assert.equal(m.shortSegs, 0); assert.equal(m.fallback, false); assert.equal(m.dissolved, 0);
  assert.equal(JSON.stringify(L), before, 'measuring does not change the picture');
  assert.deepEqual(drawnMetrics(L), m, 'the same numbers twice');
  const c = drawnMetrics(fanInControl());
  assert.equal(c.markers, 3, 'the control draws three arrowheads'); assert.equal(c.lineEnds, 6); assert.equal(c.paths, 3); assert.equal(c.bundles, 0);
  assert.ok(m.markers < c.markers && m.lineEnds < c.lineEnds, 'the bundle draws fewer marks and line ends than its control');
  // A trunk crossing a line is one crossing point, however many relationships run on it; segment pairs count each.
  const X = clone(L); X.nodes.push(node('P', 300, 50, 40, 40), node('Q', -100, 50, 40, 40)); X.edges.push(edge('eF', 'P', 'Q', [[300, 70], [-60, 70]], {kind: 'flow', family: 'flow'}));
  assert.deepEqual(bundleIntegrity(X), [], 'a line crossing a trunk away from its joins is allowed');
  assert.equal(drawnMetrics(X).visualCrossings, 1, 'a trunk counted once');
  assert.equal(diagramMetrics(X).crossings, 3, 'the round-2 segment-pair count sees three relationships cross');
  pass('a valid fan-in tree: integrity [], one arrowhead on the root run, 4 line ends, ink with the trunk once (560 px), 2 joins, a Tab stop per relationship; the control draws 3 heads and 6 line ends; a line across the trunk is one visual crossing point (3 segment pairs); measuring is pure and deterministic');
}

// 2. Each violation class is found, alone where the geometry allows it.
{
  // A foreign line collinear with the trunk for more than 6 px (it ends on the trunk too, as any such line must).
  const F = fanIn(); F.nodes.push(node('X', 300, 60, 40, 40)); F.edges.push(edge('eF', 'X', 'T', [[300, 80], [200, 80], [200, 120], [150, 120], [150, 130]], {kind: 'uses', family: 'dependency'}));
  assert.ok(rules(F).includes('foreign-on-trunk'), 'foreign collinear on a trunk: ' + rules(F));
  assert.ok(drawnMetrics(F).foreignOnTrunk >= 1);
  // A foreign line passing 2 px from a join (it crosses the trunk there).
  const J = fanIn(); J.nodes.push(node('X', 300, 82, 40, 40), node('Y', 60, 140, 40, 40)); J.edges.push(edge('eF', 'X', 'Y', [[300, 102], [120, 102], [120, 140]], {kind: 'uses', family: 'dependency'}));
  assert.deepEqual(rules(J), ['foreign-at-join'], 'a foreign line through a join: ' + rules(J));
  assert.equal(drawnMetrics(J).foreignAtJoin, 1);
  // A foreign line ending on the trunk (a T that reads as a branch), and a foreign corner on the trunk.
  const T = fanIn(); T.nodes.push(node('X', 300, 50, 40, 40)); T.edges.push(edge('eF', 'X', 'T', [[300, 70], [150, 70]], {kind: 'uses', family: 'dependency'}));
  assert.deepEqual(rules(T), ['t-contact'], 'a foreign end on a trunk: ' + rules(T));
  const K = fanIn(); K.nodes.push(node('X', 300, 50, 40, 40), node('Y', -100, 54, 40, 40)); K.edges.push(edge('eF', 'X', 'Y', [[300, 70], [150, 70], [150, 74], [-60, 74]], {kind: 'uses', family: 'dependency'}));
  assert.deepEqual(rules(K), ['t-contact'], 'a foreign corner on a trunk (a 4 px jog along it): ' + rules(K));
  assert.equal(drawnMetrics(K).tContacts, 2); assert.equal(drawnMetrics(K).foreignOnTrunk, 0, '4 px along the trunk is not a run');
  // Branches that part and run together again.
  const R = picture([node('T', 100, 0, 100, 40), node('A', 220, 200), node('C', 120, 200)], [
    edge('eA', 'A', 'T', [[250, 200], [250, 170], [150, 170], [150, 150], [100, 150], [100, 100], [150, 100], [150, 40]], {bundle: 'B:r', bundleEnd: 'to', branch: [[250, 200], [250, 170], [150, 170], [150, 150], [100, 150], [100, 100], [150, 100]]}),
    edge('eC', 'C', 'T', [[150, 200], [150, 40]], {bundle: 'B:r', bundleEnd: 'to', branch: [[150, 200], [150, 100]]})
  ], {bundles: [{id: 'B:r', end: 'to', node: 'T', face: 'bottom', kind: 'serves', members: ['eA', 'eC'], runs: [{members: ['eA', 'eC'], pts: [[150, 40], [150, 100]], root: true, far: false}], joins: [[150, 100]]}]});
  assert.deepEqual(rules(R), ['rejoin'], 'branches that rejoin: ' + rules(R));
  // A member whose runs and branch are not its route.
  const M = fanIn(); M.edges[2].branch = [[270, 200], [270, 150], [150, 150]];
  assert.ok(rules(M).includes('pts'), 'a branch that is not the rest of the route: ' + rules(M));
  const M2 = fanIn(); M2.edges[0].pts = [[30, 200], [30, 90], [150, 90], [150, 40]];
  assert.ok(rules(M2).includes('pts') && rules(M2).includes('join'), 'a route that left the trunk elsewhere: ' + rules(M2));
  // A composition fan from one whole that splits four ways (left, right and straight on at one point): no dot may mark
  // an undotted split, so it must be a T; the same split in a dotted (serves) fan-out is legible and allowed.
  const four = kind => { const id = 'B:o|W|bottom|' + kind, ex = {kind, family: kind === 'composes' ? 'composition' : 'serving', ends: kind === 'composes' ? 'none' : undefined, bundle: id, bundleEnd: 'from'};
    return picture([node('W', 100, 0, 100, 40), node('A', 0, 200), node('B', 120, 200), node('C', 240, 200)], [
      edge('eA', 'W', 'A', [[150, 40], [150, 120], [30, 120], [30, 200]], {...ex, branch: [[150, 120], [30, 120], [30, 200]]}),
      edge('eB', 'W', 'B', [[150, 40], [150, 200]], {...ex, branch: [[150, 120], [150, 200]]}),
      edge('eC', 'W', 'C', [[150, 40], [150, 120], [270, 120], [270, 200]], {...ex, branch: [[150, 120], [270, 120], [270, 200]]})
    ], {bundles: [{id, end: 'from', node: 'W', face: 'bottom', kind, dotted: !undottedKind(kind), members: ['eA', 'eB', 'eC'], runs: [{members: ['eA', 'eB', 'eC'], pts: [[150, 40], [150, 120]], root: true, far: false}], joins: [[150, 120]]}]}); };
  assert.deepEqual(rules(four('composes')), ['four-way'], 'an undotted 4-way split: ' + rules(four('composes')));
  assert.deepEqual(rules(four('serves')), [], 'a dotted 4-way split is legible');
  assert.equal(drawnMetrics(four('composes')).markers, 1, 'one diamond at the whole (composes draws its tail, ends none draws no head)');
  assert.equal(drawnMetrics(strip(four('composes'))).markers, 3, 'three diamonds without the bundle');
  // Kinds that never fan: flow and triggering. One fact recorded twice may still be drawn once in those families.
  assert.deepEqual(rules(fanIn({kind: 'flow', family: 'flow'})), ['excluded'], 'a fan of flows: ' + rules(fanIn({kind: 'flow', family: 'flow'})));
  assert.deepEqual(rules(fanIn({kind: 'transition', family: 'sequence'})), ['excluded']);
  assert.deepEqual(rules(fanIn({kind: 'selects', family: 'sequence'})), ['excluded'], 'selects is excluded by its family');
  pass('each violation class is detected: a foreign line collinear on a trunk, a foreign line within 3 px of a join, a foreign end and a foreign corner on a trunk (T-contacts, 4 px along it is not a run), branches that rejoin, a branch that is not the rest of its route, a 4-way split in an undotted (composition) bundle and not in a dotted one, a fan of flow, transition or selects relationships');
}

// 3. The rest of the contract: one style, one end, a real root, a join at every split and nowhere else, no element
// crossed, the members listed once, and never in pictures that do not bundle.
{
  const weak = fanIn(); weak.edges[1].weak = true; assert.deepEqual(rules(weak), ['style'], 'a weak member in a plain bundle');
  const word = fanIn(); word.edges[2].label = 'reads'; assert.deepEqual(rules(word), ['style']);
  const change = fanIn(); change.edges[0].change = 'added'; assert.deepEqual(rules(change), ['style'], 'a diff state on one member');
  const kind = fanIn(); kind.bundles[0].kind = 'realizes'; assert.deepEqual(rules(kind), ['style'], 'the bundle record names another kind');
  const dot = fanIn(); dot.bundles[0].dotted = false; assert.deepEqual(rules(dot), ['style'], 'a serves fan is dotted');
  const qf = fanIn(); qf.edges.forEach(e => { e.qualifier = 'x'; }); assert.deepEqual(rules(qf), [], 'a fan-in carries each qualifier at its own source end');
  const port = fanIn(); port.edges[1].pts = [[150, 200], [150, 120], [160, 120], [160, 40]]; port.edges[1].branch = [[150, 200], [150, 120], [160, 120], [160, 40]];
  assert.ok(rules(port).includes('shared-end'), 'a member that leaves by another port: ' + rules(port));
  const face = fanIn(); face.bundles[0].face = 'top'; assert.deepEqual(rules(face), ['shared-end'], 'the port is on the bottom side');
  const short = fanIn(); short.edges = short.edges.map(e => ({...e, pts: e.pts.map(([x, y]) => [x, y === 100 ? 46 : y === 140 ? 86 : y]), branch: e.branch.map(([x, y]) => [x, y === 100 ? 46 : y === 140 ? 86 : y])})); short.bundles[0].runs = [{members: ['eA', 'eB', 'eC'], pts: [[150, 40], [150, 46]], root: true, far: false}, {members: ['eB', 'eC'], pts: [[150, 46], [150, 86]], root: false, far: false}]; short.bundles[0].joins = [[150, 46], [150, 86]];
  assert.deepEqual(rules(short), ['join-near-element', 'root'], 'a 6 px root, whose first join stands at the shared element: ' + rules(short));
  const noJoin = fanIn(); noJoin.bundles[0].joins = [[150, 100]]; assert.deepEqual(rules(noJoin), ['join'], 'a split with no join');
  const extra = fanIn(); extra.bundles[0].joins.push([150, 70]); assert.deepEqual(rules(extra), ['join'], 'a join that is not at a split');
  const thr = fanIn(); thr.nodes.push(node('Z', 60, 90, 40, 20)); assert.deepEqual(rules(thr), ['through'], 'a member through an element');
  const unknown = fanIn(); unknown.edges.push(edge('eX', 'A', 'B', [[60, 220], [120, 220]], {bundle: 'B:none'}));
  assert.ok(bundleIntegrity(unknown).some(v => v.bundle === 'B:none' && v.rule === 'members'), 'an edge naming a bundle the picture does not hold');
  const twice = fanIn(); twice.bundles.push({...clone(twice.bundles[0]), id: 'B:copy'}); assert.ok(rules(twice).includes('members'), 'a relationship in two bundles');
  const order = fanIn(); order.bundles[0].members = ['eB', 'eA', 'eC']; assert.deepEqual(rules(order), ['members'], 'members in the picture order');
  const held = fanIn(); held.bundles[0].runs[1].members = ['eA', 'eC']; assert.deepEqual(rules(held), ['pts'], 'a run that names a member which does not travel it: ' + rules(held));
  const roots = fanIn(); roots.bundles[0].runs[1].root = true; assert.ok(rules(roots).includes('tree'), 'two root runs');
  const nest = fanIn(); nest.bundles[0].runs.push({members: ['eA', 'eB'], pts: [[150, 100], [140, 100]], root: false, far: false}); assert.ok(rules(nest).includes('tree'), 'member sets that overlap without nesting');
  const far = fanIn(); far.bundles[0].runs[1].far = true; assert.ok(rules(far).includes('tree'), 'a far mark drawn at a join');
  for (const arrangement of ['sequence', 'lanes', 'radial']) assert.deepEqual(rules({...fanIn(), arrangement}), ['excluded'], arrangement + ' never bundles');
  assert.ok(bundleIntegrity(fanIn(), {scene: 'process'}).some(v => v.rule === 'excluded'), 'a BPMN process picture never bundles');
  const big = fanIn(); big.arrangement = 'by-layer'; for (let i = 0; i < 160; i++) big.edges.push(edge('z' + i, 'A', 'B', [[1000 + i * 3, 0], [1000 + i * 3, 30]], {kind: 'relation'}));
  assert.deepEqual(rules(big), ['excluded'], 'a by-layer picture above 160 connectors is drawn straight and never bundles');
  for (const [k, v] of [['step', '3'], ['cardinality', {from: '1', to: '*'}], ['crossing', true]]) { const s = fanIn({extra: {[k]: v}}); assert.ok(rules(s).includes('excluded'), k + ' never bundles'); }
  pass('the rest of the contract: one line style (weak, word, diff state, kind, dotted), qualifiers only at their own source end in a fan-in, one port on the named side, a root of at least ' + DRAWN.ROOT + ' px, a join at every split and nowhere else, no element crossed, members listed once and in order, one root run, nested member sets, runs travelled by the members they name, far marks at far ends; never in sequence, lanes, radial, BPMN process or straight pictures, nor on steps, cardinalities or crossing marks');
}

// 4. One fact recorded twice, drawn once: one line with one set of marks; allowed in every family (no fork implied).
{
  const dup = (kind = 'fulfils', family = 'realization') => { const id = 'B:d|X|Y|' + kind, pts = [[60, 220], [200, 220]], k = {kind, family, bundle: id, bundleEnd: 'both', branch: []};
    return picture([node('X', 0, 200), node('Y', 200, 200)], [edge('d1', 'X', 'Y', pts, k), edge('d2', 'X', 'Y', pts.map(p => p.slice()), k)], {bundles: [{id, end: 'both', node: null, kind, family, dotted: false, members: ['d1', 'd2'], runs: [{members: ['d1', 'd2'], pts, root: true, far: true}], joins: []}]}); };
  assert.deepEqual(bundleIntegrity(dup()), [], 'a duplicate pair drawn once is valid');
  assert.equal(drawnMetrics(dup()).markers, 1, 'one hollow head for the two records'); assert.equal(drawnMetrics(strip(dup())).markers, 2);
  assert.equal(drawnMetrics(dup()).duplicates, 1); assert.equal(drawnMetrics(dup()).tabStops, 2, 'both records keep their Tab stop');
  assert.deepEqual(bundleIntegrity(dup('flow', 'flow')), [], 'one flow recorded twice may be drawn once');
  const qual = dup(); qual.edges[1].qualifier = 'other'; assert.deepEqual(rules(qual), ['style'], 'records with different qualifiers are not one fact');
  const apart = dup(); apart.edges[1].pts = [[60, 230], [200, 230]]; assert.ok(rules(apart).includes('shared-end'), 'two records not drawn on one route');
  const both = dup('exchanges', 'access'); for (const e of both.edges) e.ends = 'both';
  assert.equal(drawnMetrics(both).markers, 2, 'ends both: the head and the tail once on the single run'); assert.equal(drawnMetrics(strip(both)).markers, 4);
  pass('one fact recorded twice: valid, one set of marks (1 head, or head and tail for ends both), both records keep their Tab stop, allowed for flows, refused when the qualifiers differ or the routes are apart');
}

// 4b. The rules the review of round 10 added: a member round its shared element, a detour against the control, a join at
// an element (a dot in a branch's head, or at a foreign element), two joins that touch, a bend within JOIN_GAP of a join,
// and a word on a qualifier tag counted as a word on a word.
{
  // eA leaves A below T, runs along T's bottom and up its right side to the shared port's run above T: two sides of T.
  const E = fanIn(), eid = E.bundles[0].id, ek = {kind: 'serves', family: 'serving', bundle: eid, bundleEnd: 'to'};
  E.nodes = [node('T', 100, 60, 100, 40), node('A', 0, 200), node('S', 0, 0, 40, 30)];
  E.edges = [edge('eA', 'A', 'T', [[30, 200], [30, 106], [208, 106], [208, 40], [150, 40], [150, 60]], {...ek, branch: [[30, 200], [30, 106], [208, 106], [208, 40], [150, 40]]}), edge('eS', 'S', 'T', [[20, 30], [20, 40], [150, 40], [150, 60]], {...ek, branch: [[20, 30], [20, 40], [150, 40]]})];
  E.bundles[0] = {...E.bundles[0], end: 'to', node: 'T', face: 'top', members: ['eA', 'eS'], runs: [{members: ['eA', 'eS'], pts: [[150, 60], [150, 40]], root: true, far: false}], joins: [[150, 40]], root: 20};
  assert.deepEqual(rules(E), ['encircle'], 'a member along two sides of its shared element: ' + rules(E));
  // A detour: measured only against a control the caller gives.
  const D1 = fanIn(), ctl = fanInControl(); ctl.edges[0].pts = [[30, 200], [30, 150], [132, 150], [132, 40]];
  D1.edges[0].pts = [[30, 200], [30, 100], [-200, 100], [-200, 20], [150, 20], [150, 40]]; D1.edges[0].branch = [[30, 200], [30, 100], [-200, 100], [-200, 20], [150, 20]];
  D1.bundles[0].runs = [{members: ['eA', 'eB', 'eC'], pts: [[150, 40], [150, 100]], root: true, far: false}, {members: ['eB', 'eC'], pts: [[150, 100], [150, 140]], root: false, far: false}];
  const withControl = bundleIntegrity(D1, {control: ctl}).map(v => v.rule);
  assert.ok(withControl.includes('detour'), 'a member ' + DRAWN.DETOUR + ' times its control route plus ' + DRAWN.DETOUR_PAD + ' px: ' + withControl);
  assert.ok(!bundleIntegrity(D1).some(v => v.rule === 'detour'), 'without a control no detour is measured');
  // A join within JOIN_ELEMENT px of a foreign element; and of a branch's own target when the bundle draws dots.
  const N = fanIn(); N.nodes.push(node('Z', 160, 95, 40, 20)); assert.ok(rules(N).includes('join-near-element'), 'a join 10 px from a foreign element: ' + rules(N));
  const own = fanIn(); own.nodes[1] = node('A', 160, 80, 40, 40); own.edges[0].pts = [[160, 100], [150, 100], [150, 40]]; own.edges[0].branch = [[160, 100], [150, 100]];
  assert.ok(rules(own).includes('join-near-element'), 'a join dot 4 px from the element its own branch enters sits in the branch\'s head: ' + rules(own));
  const ownT = clone(own); ownT.edges.forEach(e => { e.kind = 'composes'; e.family = 'composition'; e.ends = 'none'; }); ownT.bundles[0].kind = 'composes'; ownT.bundles[0].family = 'composition'; ownT.bundles[0].dotted = false;
  assert.ok(!rules(ownT).includes('join-near-element'), 'a plain T (composition) may stand where the trunk drops into the element a party enters: ' + rules(ownT));
  // Two joins closer than JOIN_GAP px, and a bend within JOIN_GAP px after a join.
  const G = fanIn(); G.edges[2].pts = [[270, 200], [270, 106], [150, 106], [150, 40]]; G.edges[2].branch = [[270, 200], [270, 106], [150, 106]];
  G.bundles[0].runs = [{members: ['eA', 'eB', 'eC'], pts: [[150, 40], [150, 100]], root: true, far: false}, {members: ['eB', 'eC'], pts: [[150, 100], [150, 106]], root: false, far: false}]; G.bundles[0].joins = [[150, 100], [150, 106]];
  assert.ok(rules(G).includes('join-gap'), 'two joins 6 px apart: ' + rules(G));
  const S = fanIn(); S.edges[0].pts = [[30, 200], [30, 94], [150, 94], [150, 100], [150, 40]]; S.edges[0].branch = [[30, 200], [30, 94], [150, 94], [150, 100]];
  assert.ok(rules(S).includes('join-gap'), 'a bend 6 px after the join on a branch: ' + rules(S));
  // A word on a qualifier tag is a word on a word.
  const Wq = fanIn(); Wq.edges[0].label = 'serves'; Wq.edges[0].labelHidden = false; Wq.edges[0].lx = 80; Wq.edges[0].ly = 110;
  Wq.edges[1].qualifier = 'REST'; Wq.edges[1].qx = 70; Wq.edges[1].qy = 108; Wq.edges[1].qAnchor = 'start';
  assert.equal(diagramMetrics(Wq).labelOnLabel, 1, 'a word over a qualifier tag counts as a word on a word');
  Wq.edges[1].qualifierHidden = true; assert.equal(diagramMetrics(Wq).labelOnLabel, 0, 'a hidden qualifier (the second record of one fact) is no tag');
  pass('the round-10 review rules: encircle, detour (against a control), join-near-element (a foreign element; a dotted branch\'s own target; not a plain T), join-gap (joins that touch; a bend after a join), and a word on a tag counted');
}

// 5. Shared runs: exempt only inside a valid bundle. Without bundles every number is as before.
{
  const L = fanIn();
  assert.equal(diagramMetrics(strip(L)).sharedRuns, 3, 'three members on one trunk are three shared runs to the round-2 guard');
  assert.equal(diagramMetrics(L).sharedRuns, 0, 'inside a valid bundle they are one line by design');
  const bad = fanIn(); bad.nodes.push(node('X', 300, 82, 40, 40), node('Y', 60, 140, 40, 40)); bad.edges.push(edge('eF', 'X', 'Y', [[300, 102], [120, 102], [120, 140]], {kind: 'uses', family: 'dependency'}));
  assert.equal(diagramMetrics(bad).sharedRuns, 3, 'a bundle that fails integrity is counted as before');
  assert.equal(drawnMetrics(bad).foreignShared, 3); assert.equal(drawnMetrics(bad).sameBundleShared, 0);
  const branch = fanIn(); branch.nodes.push(node('X', -80, 150, 40, 40), node('Y', 100, 60, 30, 30)); branch.edges.push(edge('eF', 'X', 'Y', [[-40, 150], [-40, 100], [100, 100], [100, 90]], {kind: 'uses', family: 'dependency'}));
  assert.deepEqual(bundleIntegrity(branch), [], 'a line along a branch, away from the trunk and its joins, does not invalidate the bundle');
  assert.equal(diagramMetrics(branch).sharedRuns, 1, 'but its shared run with the branch is foreign and counted');
  assert.equal(drawnMetrics(branch).foreignShared, 1);
  const forged = fanIn(); forged.edges.push(edge('eG', 'A', 'C', [[30, 240], [30, 260], [270, 260], [270, 240]], {bundle: forged.bundles[0].id, bundleEnd: 'to'}));
  assert.ok(rules(forged).includes('members'), 'a relationship cannot join a bundle by naming it');
  pass('shared runs: three members on one trunk count 3 to the round-2 guard without the bundle and 0 inside it; a bundle that fails integrity (a foreign line at a join) counts 3 again; a foreign line along a branch is counted (1) while the bundle stays valid; a relationship cannot join a bundle by naming it');
}

// 6. Simple measures by hand: bends, short interior segments, touches, ink.
{
  const L = picture([node('A', 0, 0), node('B', 0, 200), node('C', 200, 0), node('D', 200, 200)], [
    edge('j', 'A', 'B', [[30, 40], [30, 100], [33, 100], [33, 200]]),
    edge('t', 'C', 'B', [[230, 40], [230, 150], [33, 150]]),
    edge('o', 'C', 'D', [[240, 40], [240, 200]])
  ]);
  const m = drawnMetrics(L);
  assert.equal(m.bends, 2 + 1 + 0); assert.equal(m.shortSegs, 1, 'the 3 px jog is a short interior segment');
  assert.equal(m.touches, 1, 'a line ending on another is a touch, not a crossing'); assert.equal(m.visualCrossings, 0);
  assert.equal(m.ink, 60 + 3 + 100 + 110 + 197 + 160);
  assert.equal(m.markers, 3); assert.equal(m.lineEnds, 6); assert.equal(m.words, 0);
  const W = clone(L); W.edges[0].label = 'uses'; W.edges[0].labelHidden = false; W.edges[1].step = '2'; W.edges[1].labelHidden = false; assert.equal(drawnMetrics(W).words, 2);
  pass('by hand: bends 3, one 3 px jog, one T touch, 630 px of ink, 3 marks, 6 line ends, words only where drawn');
}

// 7. On the real pictures. Without bundles (the control, consolidate:false): markers equal the marks the renderer draws,
// the two shared-run counts agree, and there is no bundle and no violation. As drawn (round-10 N3, bundles in the layout):
// no violation, the two shared-run counts agree with the integrity-gated exemption, one Tab stop per relationship, and the
// marks are the renderer's marks of every relationship drawn on its own less exactly the marks each bundle draws once
// (a fan's shared-end mark, the far mark of two records of one fact on one run, both marks of a fact recorded twice).
// Since the renderer draws bundles (round-10 N5: each run once, each member its own branch), markers are compared with
// the renderer on the picture as drawn again, mark by mark: each bundle's runs carry exactly the marks it draws once,
// each member's own path only its far end's mark (none when it ends on a run), every other relationship its marks as
// drawn without bundles, and the total is drawnMetrics' markers.
{
  let pictures = 0, marks = 0, bundled = 0, merged = 0;
  const unesc = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  // The marks the renderer draws for each relationship: [head (marker-end), tail (marker-start)].
  const marksOf = (D, L) => { const out = new Map(); for (const g of svgParts(D, L).edges.split('<g class="nt-edge').slice(1)) { const id = /data-nt-edge="([^"]*)"/.exec(g); const line = /<path class="nt-line"[^>]*>/.exec(g)?.[0] || ''; if (id) out.set(unesc(id[1]), [/ marker-end="/.test(line) ? 1 : 0, / marker-start="/.test(line) ? 1 : 0]); } return out; };
  const projects = [['reference', referenceProject()], ['stress', stressProject()]];
  for (const [name, project] of projects) for (const s of SCENES) {
    const D = notationDiagram(project, s.id); if (!D?.nodes.length) continue;
    for (const a of arrangementsFor(D)) {
      if (name === 'stress' && a.id !== s.arrangement) continue;
      const tag = name + ' ' + s.id + ':' + a.id;
      const L = notationLayout(D, {arrangement: a.id, consolidate: false}), m = drawnMetrics(L, {sequence: s.id === 'sequence', scene: s.id}), d = diagramMetrics(L);
      const drawn = (svgParts(D, L).edges.match(/ marker-(?:start|end)="/g) || []).length;
      assert.equal(m.markers, drawn, tag + ': markers ' + m.markers + ' and the renderer draws ' + drawn);
      assert.equal(m.foreignShared, d.sharedRuns, tag + ': the bucketed and the pairwise shared-run counts agree');
      assert.ok(m.visualCrossingsDisjoint <= d.crossings, tag + ': distinct points never exceed segment pairs');
      assert.deepEqual(bundleIntegrity(L, {scene: s.id}), [], tag); assert.equal(m.bundles, 0); assert.equal(m.paths, L.edges.length); assert.equal(m.tabStops, D.edges.length);
      const B = notationLayout(D, {arrangement: a.id}), mb = drawnMetrics(B, {sequence: s.id === 'sequence', scene: s.id}), db = diagramMetrics(B, {scene: s.id});
      assert.deepEqual(bundleIntegrity(B, {scene: s.id}), [], tag + ' as drawn: no violation');
      assert.equal(mb.foreignShared, db.sharedRuns, tag + ' as drawn: the bucketed and the pairwise shared-run counts agree');
      assert.ok(mb.visualCrossingsDisjoint <= db.crossings, tag + ' as drawn: distinct points never exceed segment pairs');
      assert.equal(mb.tabStops, D.edges.length, tag + ' as drawn: a Tab stop per relationship');
      // The marks each relationship carries drawn on its own (the control's renderer), the marks the renderer draws on the
      // picture as drawn: on each member's or other relationship's own path, and on each bundle's runs (g.nt-bundle).
      const ctl = marksOf(D, L), Pb = svgParts(D, B), own = marksOf(D, B), E = new Map(B.edges.map(e => [e.id, e])), onRuns = new Map(); let once = 0;
      for (const g of Pb.edges.split('<g class="nt-bundle"').slice(1)) { const body = g.split('<g class="nt-edge')[0]; onRuns.set(unesc(/data-nt-bundle="([^"]*)"/.exec(body)[1]), (body.match(/ marker-(?:start|end)="/g) || []).length); }
      assert.equal(onRuns.size, B.bundles.length, tag + ' as drawn: one g.nt-bundle per bundle');
      const inBundle = new Set();
      for (const b of B.bundles) {
        assert.ok(b.members.every(id => E.get(id).bundle === b.id), tag + ': ' + b.id + ' names its members');
        const [h, t] = ctl.get(b.members[0]), shared = b.end === 'to' ? h : t, far = b.end === 'to' ? t : h;
        const runs = b.end === 'both' ? h + t : shared + far * b.runs.filter(r => r.far).length;
        assert.equal(onRuns.get(b.id), runs, tag + ': ' + b.id + ' draws its shared end\'s mark once on its root run and its far end\'s once on each far run');
        for (const id of b.members) {
          inBundle.add(id);
          const br = E.get(id).branch || [], mine = b.end !== 'both' && br.length > 1 ? far : 0, [mh, mt] = own.get(id);
          assert.equal(mh + mt, mine, tag + ': ' + id + ' draws only its far end\'s mark, on its own branch');
          assert.equal(b.end === 'to' ? mh : b.end === 'from' ? mt : mh + mt, 0, tag + ': ' + id + ' never draws the shared end\'s mark');
        }
        once += b.members.reduce((s, id) => s + ctl.get(id)[0] + ctl.get(id)[1], 0) - runs - b.members.reduce((s, id) => s + own.get(id)[0] + own.get(id)[1], 0);
      }
      for (const [id, [h, t]] of own) if (!inBundle.has(id)) assert.deepEqual([h, t], ctl.get(id), tag + ': ' + id + ' outside every bundle draws its marks as without bundles');
      const drawnB = (Pb.edges.match(/ marker-(?:start|end)="/g) || []).length;
      assert.equal(mb.markers, drawnB, tag + ' as drawn: markers ' + mb.markers + ' and the renderer draws ' + drawnB);
      assert.ok(mb.markers <= m.markers && mb.lineEnds <= m.lineEnds, tag + ' as drawn: no more marks or line ends than without bundles');
      pictures++; marks += drawn; bundled += mb.bundles; merged += once;
    }
  }
  pass(`${pictures} real pictures (the reference project in every offered arrangement, the stress project's defaults): without bundles, drawnMetrics markers equal the ${marks} marks the renderer draws (a sequence message carries no tail), the bucketed foreign shared runs equal diagramMetrics.sharedRuns, distinct crossing points never exceed segment pairs, no bundle and no violation; as drawn, ${bundled} bundles with no violation, the shared-run counts agree with the integrity-gated exemption, a Tab stop per relationship, and markers equal the marks the renderer draws (each bundle's marks once on its runs, each member only its far end's on its branch: ${merged} fewer marks than drawn apart)`);
}

// 8. Round 11 · the Layers corridors (corridorMetrics). The thresholds mirror the layout's CORRIDOR, so the metrics stay
// an independent check of what is drawn; on a hand-built picture every number is worked out by hand; on the real
// pictures every corridor keeps its rules, and a picture without corridors measures zero.
{
  for (const k of ['SPAN', 'SLOTS', 'PITCH', 'MARGIN']) assert.equal(DRAWN['CORRIDOR_' + k], CORRIDOR[k], 'DRAWN.CORRIDOR_' + k + ' mirrors CORRIDOR.' + k);
  assert.equal(2 * DRAWN.CORRIDOR_MARGIN + (DRAWN.CORRIDOR_SLOTS - 1) * DRAWN.CORRIDOR_PITCH, 72, 'four slots eight px apart, 24 px from either element, fill the 72 px between two elements of a lane');
  // Two rows: A1 (100–160), A2 (300–360) and A3 (500–560) at y 100–140; B1 (100–160) at y 300–340. Corridors: in the gap
  // A1–A2 three at 230, 238 and 250 (one pair off its pitch); 90 stands 10 px from A1's left side; 330 stands on A2; the
  // gap A2–A3 holds five, eight px apart (one too many); in row B's outer gap after B1, e1, e2 and e3 stand at 230, 244
  // and 250 (14 px apart is fine there, 6 px is too close); e1's route runs down x = 230 through both rows (followed
  // twice); every other route runs at least 6 px from its corridor (e2 steps onto 250 above row A), so none is followed.
  const n = (id, x, y) => ({id, x, y, w: 60, h: 40, group: null}), r = (id, pts) => ({id, from: 'a', to: 'b', kind: 'uses', pts, lx: 0, ly: 0, labelHidden: true});
  const hand = {W: 700, H: 500, arrangement: 'by-layer', nodes: [n('A1', 100, 100), n('A2', 300, 100), n('A3', 500, 100), n('B1', 100, 300)], groups: [], bands: [], bundles: [], consolidation: {},
    edges: [r('e1', [[230, 0], [230, 400]]), r('e2', [[238, 0], [238, 90], [250, 90], [250, 400]]), r('e3', [[262, 0], [262, 400]]), r('e4', [[70, 0], [70, 400]]), r('e5', [[345, 0], [345, 400]]), ...[0, 1, 2, 3, 4].map(i => r('f' + i, [[396 + 8 * i, 0], [396 + 8 * i, 400]]))],
    corridors: {planned: 10, crossings: 13, slotted: 13, edges: [['e1', [[230, 120], [230, 320]]], ['e2', [[238, 120], [244, 320]]], ['e3', [[250, 120], [250, 320]]], ['e4', [[90, 120]]], ['e5', [[330, 120]]], ...[0, 1, 2, 3, 4].map(i => ['f' + i, [[390 + 8 * i, 120]]])]}};
  const before = JSON.stringify(hand), m = corridorMetrics(hand);
  assert.deepEqual(m, {planned: 10, crossings: 13, followed: 2, overfull: 1, offPitch: 2, onElement: 2, rows: 2}, JSON.stringify(m));
  assert.equal(JSON.stringify(hand), before, 'measuring does not change the picture');
  assert.deepEqual(corridorMetrics({...hand, corridors: {planned: 0, crossings: 0, slotted: 0, edges: []}}), {planned: 0, crossings: 0, followed: 0, overfull: 0, offPitch: 0, onElement: 0, rows: 0}, 'no corridors: zero');
  assert.deepEqual(corridorMetrics({...hand, corridors: undefined}), {planned: 0, crossings: 0, followed: 0, overfull: 0, offPitch: 0, onElement: 0, rows: 0}, 'a picture without the field: zero');
  // The real pictures: the reference project's Layers views keep every rule and count what the layout planned; its other
  // arrangements and a Layers view without corridors plan none.
  let planned = 0, points = 0, followed = 0, layers = 0;
  for (let ch = 1; ch <= 11; ch++) {
    const D = notationDiagram(referenceProject(), 'connected', {chapter: ch}); if (!D?.nodes.length) continue;
    const L = notationLayout(D, {arrangement: 'by-layer'}), c = corridorMetrics(L);
    assert.deepEqual([c.overfull, c.offPitch, c.onElement], [0, 0, 0], 'chapter ' + ch + ' by layer: every corridor in a gap, at its pitch, clear of the elements: ' + JSON.stringify(c));
    assert.equal(c.planned, L.corridors.planned); assert.equal(c.crossings, L.corridors.slotted); assert.ok(c.followed <= c.crossings);
    if (largeStraight(L)) assert.equal(c.planned, 0, 'chapter ' + ch + ': drawn straight, no corridor');
    assert.equal(corridorMetrics(notationLayout(D, {arrangement: 'by-layer', corridors: false})).planned, 0, 'chapter ' + ch + ' without corridors: none');
    planned += c.planned; points += c.crossings; followed += c.followed; layers++;
  }
  for (const s of SCENES) { const D = notationDiagram(referenceProject(), s.id); if (!D?.nodes.length) continue; assert.equal(corridorMetrics(notationLayout(D, {arrangement: s.arrangement})).planned, 0, s.id + ': only a Layers picture plans corridors'); }
  pass(`the Layers corridors: DRAWN mirrors CORRIDOR (span ${DRAWN.CORRIDOR_SPAN}, ${DRAWN.CORRIDOR_SLOTS} slots ${DRAWN.CORRIDOR_PITCH} px apart, ${DRAWN.CORRIDOR_MARGIN} px from an element); by hand: 10 corridors, 13 way points, 2 followed, 1 gap over its slots, 2 pairs off their pitch (one in an outer gap, too close), 2 on or against an element, in 2 rows; the reference project's ${layers} Layers views plan ${planned} corridors with ${points} way points (${followed} followed), every one in a gap at its pitch and clear of the elements; its other arrangements and a Layers view without corridors plan none`);
}

console.log(JSON.stringify({suite: 'notation metrics (round 10: drawn measures and bundle integrity; round 11: corridors)', passed: checks.length, checks, thresholds: DRAWN}, null, 2));
