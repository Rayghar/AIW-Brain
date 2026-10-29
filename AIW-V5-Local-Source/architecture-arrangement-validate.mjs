// Real graph recommendations and presentation-only geometry, independent of a browser renderer.
import assert from 'node:assert/strict';
import {referenceProject, stressProject} from './notation-fixtures.mjs';
import {notationDiagram, SCENES, LAYERS, architectureArrangement, arrangementsFor, stripToLayers} from './public/notation-model.js';
import {notationLayout, arrangeSelection, canSize, sizeOf, overlaps} from './public/notation-layout.js';
import {layerConnectivity, layersReadingHTML} from './public/layers-view.js';

const checks = [], pass = label => { checks.push(label); console.log('PASS', label); };
const project = referenceProject(), logical = notationDiagram(project, 'logical');
const original = JSON.stringify(project);
for (const scene of SCENES) {
  const D = notationDiagram(project, scene.id), before = JSON.stringify(D), a = architectureArrangement(D);
  assert.ok(arrangementsFor(D).some(x => x.id === a.id));
  assert.deepEqual(a, architectureArrangement({...D, nodes: [...D.nodes].reverse(), edges: [...D.edges].reverse()}));
  assert.equal(a.counts.nodes, D.nodes.length); assert.equal(a.counts.relationships, D.edges.length);
  assert.ok(a.isolatedIds.every(id => D.nodes.some(n => n.id === id)));
  assert.equal(JSON.stringify(D), before);
}
assert.equal(architectureArrangement(notationDiagram(project, 'process')).id, 'lanes');
assert.equal(architectureArrangement(notationDiagram(project, 'sequence')).id, 'sequence');
assert.equal(architectureArrangement(logical).id, 'grouped');
assert.equal(architectureArrangement(notationDiagram(project, 'integration')).id, 'orthogonal');
assert.equal(architectureArrangement(notationDiagram(project, 'connected', {chapter: 4})).id, 'by-layer');
assert.equal(JSON.stringify(project), original);
pass('All reference viewpoints select an offered, explainable arrangement from exact graph facts without mutation');

const base = logical.nodes.find(n => canSize(n));
const make = (count = 4) => ({...logical, scene: SCENES.find(s => s.id === 'integration'), groups: [], nodes: Array.from({length: count}, (_, i) => ({...base, id: 'N' + i, group: null, title: 'Record ' + i, ref: 'N' + i, layer: 'logical'})), edges: [], notes: [], counts: {nodes: count, groups: 0, edges: 0}});
const star = make(5); star.scene = SCENES.find(s => s.id === 'data');
star.edges = star.nodes.slice(1).map((n, i) => ({id: 'E' + i, from: 'N0', to: n.id, kind: 'accesses', label: 'uses'}));
const hub = architectureArrangement(star);
assert.equal(hub.id, 'radial'); assert.equal(hub.hub, 'N0'); assert.match(hub.reason, /4 of the other 4/);
assert.equal(architectureArrangement({...star, nodes: star.nodes.map(n => ({...n, title: 'Redis cache ' + n.id}))}).id, 'radial');
assert.equal(architectureArrangement({...star, edges: []}).id, 'tree');
assert.equal(architectureArrangement({...star, nodes: [], edges: []}).counts.nodes, 0);
pass('Hub selection follows distinct recorded neighbours, never product-name heuristics or missing links');

const D = make(), initialPins = {N0: {x: 80, y: 120}, N1: {x: 390, y: 330}, N2: {x: 900, y: 550}, N3: {x: 1200, y: 850}};
const L = notationLayout(D, {arrangement: 'tree', pins: initialPins}), layoutBefore = JSON.stringify(L);
const by = (layout, id) => layout.nodes.find(n => n.id === id);
const clear = layout => { for (let i = 0; i < layout.nodes.length; i++) for (let j = i + 1; j < layout.nodes.length; j++) assert.ok(!overlaps(layout.nodes[i], layout.nodes[j]), layout.nodes[i].id + ' overlaps ' + layout.nodes[j].id); };
for (const action of ['left', 'center', 'right']) {
  const r = arrangeSelection(D, L, ['N0', 'N1', 'N2'], action, {pins: initialPins});
  assert.ok(r.ok, r.reason); assert.deepEqual(r.pins.N3, initialPins.N3);
  const layout = notationLayout(D, {arrangement: 'tree', pins: r.pins}); clear(layout);
  const values = r.ids.map(id => { const n = by(layout, id); return action === 'left' ? n.x : action === 'right' ? n.x + n.w : n.x + n.w / 2; });
  assert.ok(Math.max(...values) - Math.min(...values) <= 1); assert.equal(layout.droppedPins.length, 0);
}
for (const action of ['top', 'middle', 'bottom']) {
  const r = arrangeSelection(D, L, ['N0', 'N1', 'N2'], action, {pins: initialPins});
  assert.ok(r.ok, r.reason); const layout = notationLayout(D, {arrangement: 'tree', pins: r.pins}); clear(layout);
  const values = r.ids.map(id => { const n = by(layout, id); return action === 'top' ? n.y : action === 'bottom' ? n.y + n.h : n.y + n.h / 2; });
  assert.ok(Math.max(...values) - Math.min(...values) <= 1);
}
assert.equal(JSON.stringify(L), layoutBefore);
pass('Six alignment commands preserve selected geometry, unrelated pins and their inputs');

for (const action of ['distribute-horizontal', 'distribute-vertical']) {
  const r = arrangeSelection(D, L, ['N0', 'N1', 'N2'], action, {pins: initialPins}); assert.ok(r.ok, r.reason);
  const layout = notationLayout(D, {arrangement: 'tree', pins: r.pins}); clear(layout);
  const key = action.endsWith('horizontal') ? 'x' : 'y', extent = key === 'x' ? 'w' : 'h', ns = r.ids.map(id => by(layout, id)).sort((a, b) => a[key] - b[key]);
  assert.ok(Math.abs((ns[1][key] - ns[0][key] - ns[0][extent]) - (ns[2][key] - ns[1][key] - ns[1][extent])) <= 1);
}
assert.equal(arrangeSelection(D, L, ['N0', 'N1'], 'distribute-horizontal').ok, false);
const snapped = arrangeSelection(D, L, ['N0'], 'snap'); assert.ok(snapped.ok); assert.equal(snapped.pins.N0.x % 16, 0);
const moved = arrangeSelection(D, L, ['N0', 'N1'], 'move', {dx: 35, dy: 19, grid: 0}); assert.ok(moved.ok); assert.equal(moved.pins.N1.x - moved.pins.N0.x, by(L, 'N1').x - by(L, 'N0').x);
assert.equal(arrangeSelection(D, L, ['N0'], 'move', {dx: Infinity}).ok, false);
pass('Distribution uses equal edge spacing; snapping and finite group movement preserve relative positions');

const sizePrefs = {N0: {w: 250, h: 100}, N1: {w: 360, h: 160}}, sized = notationLayout(D, {arrangement: 'tree', sizes: sizePrefs});
for (const action of ['same-width', 'same-height', 'same-size']) {
  const r = arrangeSelection(D, sized, ['N0', 'N1', 'N2'], action, {sizes: sizePrefs}); assert.ok(r.ok, r.reason);
  const layout = notationLayout(D, {arrangement: 'tree', sizes: r.sizes, pins: r.pins}); clear(layout);
  if (action !== 'same-height') assert.equal(new Set(r.ids.map(id => by(layout, id).w)).size, 1);
  if (action !== 'same-width') assert.equal(new Set(r.ids.map(id => by(layout, id).h)).size, 1);
}
for (const n of D.nodes) { const natural = sizeOf(n), tiny = sizeOf({...n, layoutSize: {w: -10, h: 1}}); assert.equal(tiny.w, natural.w); assert.equal(tiny.h, natural.h); assert.equal(sizeOf({...n, layoutSize: {w: 99999, h: 99999}}).w, 640); }
for (const kind of ['event', 'gateway', 'lifeline']) { const n = {...base, kind}; assert.equal(canSize(n), false); assert.deepEqual(sizeOf({...n, layoutSize: {w: 600, h: 600}}), sizeOf(n)); }
assert.equal(canSize({...base, fold: {members: ['x']}}), false);
assert.equal(JSON.stringify(sizePrefs), JSON.stringify({N0: {w: 250, h: 100}, N1: {w: 360, h: 160}}));
pass('Matching sizes reflows the drawing, respects content floors and notation proportions, and stays presentation-only');

assert.equal(arrangeSelection(D, L, ['N0', 'absent'], 'left').ok, false);
assert.equal(arrangeSelection(D, {...L, arrangement: 'sequence'}, ['N0'], 'snap').ok, false);
assert.equal(arrangeSelection(D, L, ['N0'], 'move', {dx: initialPins.N3.x - initialPins.N0.x, dy: initialPins.N3.y - initialPins.N0.y, pins: initialPins, grid: 0}).ok, false);
const grouped = notationLayout(logical, {arrangement: 'grouped'}), first = logical.nodes.find(n => n.group), other = logical.nodes.find(n => n.group && n.group !== first.group);
assert.equal(arrangeSelection(logical, grouped, [first.id, other.id], 'left').ok, false);
assert.equal(arrangeSelection(logical, grouped, [first.id], 'move', {dy: -10000, grid: 0}).ok, false);
pass('Stale targets, ambiguous boundaries, sequence meaning and collisions produce a reason without committing changes');

const nested = make();
nested.groups = [{id: 'outer', title: 'System'}, {id: 'A', title: 'Boundary A', parent: 'outer'}, {id: 'B', title: 'Boundary B', parent: 'outer'}];
nested.nodes = nested.nodes.map((n, i) => ({...n, group: i < 2 ? 'A' : 'B'}));
nested.edges = nested.nodes.slice(1).map((n, i) => ({id: 'E' + i, from: nested.nodes[i].id, to: n.id, kind: 'flow'}));
const nestedL = notationLayout(nested, {arrangement: 'grouped'}), top = by(nestedL, 'N0'), below = by(nestedL, 'N1');
assert.match(arrangeSelection(nested, nestedL, ['N0'], 'move', {dx: below.x - top.x, dy: below.y - top.y, grid: 0}).reason, /boundaries overlap/);
const relative = id => { const b = by(nestedL, id), g = nestedL.groups.find(x => x.id === b.group); return {x: b.x, y: b.y, group: g.id, dx: b.x - g.x, dy: b.y - g.y}; };
const nestedPins = {N0: relative('N0'), N2: relative('N2')}, nestedSizes = {N0: {w: 320, h: 110}};
const sizedNested = notationLayout(nested, {arrangement: 'grouped', pins: nestedPins, sizes: nestedSizes});
const matchedNested = arrangeSelection(nested, sizedNested, ['N0', 'N1'], 'same-size', {pins: nestedPins, sizes: nestedSizes});
assert.ok(matchedNested.ok, matchedNested.reason); assert.deepEqual(matchedNested.pins, nestedPins);
const matchedL = notationLayout(nested, {arrangement: 'grouped', pins: matchedNested.pins, sizes: matchedNested.sizes}); clear(matchedL);
for (const id of ['N0', 'N2']) { const b = by(matchedL, id), g = matchedL.groups.find(x => x.id === b.group); assert.equal(b.x - g.x, nestedPins[id].dx); assert.equal(b.y - g.y, nestedPins[id].dy); }
for (const g of matchedL.groups) for (const h of matchedL.groups) if (g.id !== h.id && g.parent === h.parent) assert.ok(!overlaps(g, h));
assert.ok(matchedL.groups.find(g => g.id === 'outer').h > nestedL.groups.find(g => g.id === 'outer').h);
pass('Nested boundaries resize around their members, preserve relative pins and reject collisions caused by neighbour reflow');

const connected = notationDiagram(project, 'connected', {chapter: 4}), lanes = notationLayout(connected, {arrangement: 'by-layer'}), item = connected.nodes[0], box = by(lanes, item.id), own = lanes.bands.find(b => b.layer === item.layer);
const acrossLane = arrangeSelection(connected, lanes, [item.id], 'move', {dy: own.h + 100, grid: 0}); assert.equal(acrossLane.ok, false);
const stale = notationLayout(connected, {arrangement: 'by-layer', pins: {[item.id]: {x: box.x, y: own.y + own.h + 50}}}); assert.deepEqual(stale.droppedPins, [item.id]);
const movedAside = notationLayout(connected, {arrangement: 'by-layer', pins: {[item.id]: {x: box.x + 30, y: box.y}}}); clear(movedAside);
for (const n of connected.nodes) { const b = by(movedAside, n.id), lane = movedAside.bands.find(x => x.layer === n.layer); assert.ok(b.y >= lane.y + 20 && b.y + b.h <= lane.y + lane.h - 8, n.id + ' must remain inside its own architecture lane'); }
assert.equal(movedAside.corridors.planned, 0, 'manual geometry cannot retain obsolete planned corridors');
const singleLane = make(2), scope = {arrangement: 'by-layer', collapsed: [{layer: 'process', count: 3}], every: {counts: {process: 3, logical: 2}}};
const scopedSizes = {N0: {w: 320, h: 70}}, scoped = notationLayout(singleLane, {...scope, sizes: scopedSizes}), scopedBox = by(scoped, 'N0'), scopedPins = {N0: {x: scopedBox.x, y: scopedBox.y}};
const scopedMatch = arrangeSelection(singleLane, scoped, ['N0', 'N1'], 'same-width', {pins: scopedPins, sizes: scopedSizes, layout: scope});
assert.ok(scopedMatch.ok, scopedMatch.reason);
const scopedResult = notationLayout(singleLane, {...scope, pins: scopedMatch.pins, sizes: scopedMatch.sizes});
assert.equal(scopedResult.droppedPins.length, 0); assert.ok(scopedResult.bands.some(b => b.collapsed && b.layer === 'process'));
pass('Pins cannot move records into another architecture layer; neighbours move aside and routes are recalculated');

for (let chapter = 1; chapter <= 11; chapter++) {
  const full = notationDiagram(project, 'connected', {chapter}), visible = stripToLayers(full, LAYERS.slice(0, 4)), read = layerConnectivity(visible, full);
  assert.equal(read.across + read.within, visible.edges.length);
  assert.ok(read.isolatedIds.every(id => visible.nodes.some(n => n.id === id)));
  assert.equal(read.outside, full.edges.filter(e => visible.nodes.some(n => n.id === e.from) !== visible.nodes.some(n => n.id === e.to)).length);
  assert.match(layersReadingHTML(visible, full, LAYERS.slice(0, 4), chapter), /Why these groups/);
}
const malicious = make(1); malicious.nodes[0].ref = '<script>bad</script>';
assert.ok(!layersReadingHTML(malicious, malicious, LAYERS, 4).includes('<script>'));
pass('Layer explanations count exact visible, hidden and isolated relationships without inventing missing design facts');

const dense = notationDiagram(stressProject({extra: 60}), 'logical'), denseBefore = JSON.stringify(dense), sizedDense = notationLayout(dense, {arrangement: 'grouped', sizes: Object.fromEntries(dense.nodes.filter(canSize).slice(0, 8).map(n => [n.id, {w: 300, h: 110}]))});
clear(sizedDense);
for (const b of sizedDense.nodes) { const g = sizedDense.groups.find(x => x.id === b.group); if (g) assert.ok(b.x >= g.x && b.y >= g.y && b.x + b.w <= g.x + g.w && b.y + b.h <= g.y + g.h); }
assert.equal(sizedDense.edges.length, dense.edges.length); assert.ok(sizedDense.edges.every(e => e.pts.every(p => p.every(Number.isFinite))));
assert.equal(JSON.stringify(dense), denseBefore); assert.equal(JSON.stringify(project), original);
pass('A dense cyclic graph with unequal resized records retains exact edges, non-overlapping nodes and enclosing boundaries');
console.log(JSON.stringify({suite: 'Architecture-aware arrangement', passed: checks.length, checks}, null, 2));
