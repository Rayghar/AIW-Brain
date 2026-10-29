// The connected Layers overview (rc39, W2): a picture drawn by the shared renderer — one list box per type group in its
// concern band's lane, a group of one as its record, the relationships between groups as counted lines between the
// lanes — over the same exact relationship index (`layerSummary`) the companion, the Key and Sol read. These checks use
// the same projection, layout, screen parts and SVG export as the chapter views; they do not depend on Chromium.
import assert from 'node:assert/strict';
import {referenceProject} from './notation-fixtures.mjs';
import {notationDiagram, stripToLayers} from './public/notation-model.js';
import {foldDiagram} from './public/figure-budget.js';
import {layerOverview, layerCounts, layerRelationshipIndex, viewpointProjection, viewpointGroupKeys, viewpointBand} from './public/layers-view.js';
import {notationLayout, overlaps, isListBox} from './public/notation-layout.js';
import {svgParts, notationSVG, diagramText, explainDiagram} from './public/notation-svg.js';
import {esc} from './public/html-escape.js';

const project = referenceProject(), checks = [];
const picture = source => {
  const D = viewpointProjection(source);
  const F = foldDiagram(D, {project, budget: 60, keys: viewpointGroupKeys(D, project, {layers: true}), force: true});
  const O = layerOverview(F, D);
  const L = notationLayout(O, {arrangement: 'by-layer', page: {width: 1320, min: 820}});
  return {F, O, L};
};
const inside = (b, band) => b.y >= band.y && b.y + b.h <= band.y + band.h;
for (let chapter = 1; chapter <= 11; chapter++) {
  const D = notationDiagram(project, 'connected', {chapter});
  if (D.nodes.length < 2) continue;
  const {F, O, L} = picture(D);
  assert.equal(F.folded, true, `Chapter ${chapter}: exact type groups even below the generic screen budget`);
  // The exact index: every recorded relationship in one directional band-to-band entry, with its families.
  assert.equal(O.layerSummary.total, D.edges.length);
  assert.deepEqual(O.layerSummary.pairs.flatMap(p => p.members).sort(), D.edges.map(e => e.id).sort(), `Chapter ${chapter}: every exact relationship has one index entry`);
  assert.equal(O.layerSummary.pairs.reduce((n, p) => n + p.count, 0), D.edges.length);
  for (const p of O.layerSummary.pairs) assert.equal(p.families.reduce((n, f) => n + f.count, 0), p.count);
  for (const group of F.groups) { const members = D.nodes.filter(n => group.members.includes(n.id)); assert.equal(new Set(members.map(n => n.type)).size, 1); assert.equal(new Set(members.map(viewpointBand)).size, 1); }
  // The drawn scene: every exact relationship is carried once, on a drawn line between two groups or inside one group.
  assert.equal(L.edges.length, O.edges.length, `Chapter ${chapter}: every grouped path is routed`);
  const carried = O.edges.flatMap(e => (e.fold ? e.fold.members : [e.id])), within = O.nodes.reduce((n, x) => n + (x.fold?.internal || 0), 0);
  assert.equal(new Set(carried).size, carried.length, `Chapter ${chapter}: no relationship is drawn on two lines`);
  assert.ok(carried.every(id => D.edges.some(e => e.id === id)), `Chapter ${chapter}: every drawn line stands for recorded relationships`);
  assert.equal(carried.length + within, D.edges.length, `Chapter ${chapter}: the lines between the groups and the relationships inside them account for every recorded relationship`);
  // Each line between two groups carries its count, in its words and in its reading; each has a route and a keyboard target.
  for (const e of O.edges) {
    const n = e.fold?.count || 1;
    if (n > 1) assert.match(e.label, new RegExp(`(×${n}|^${n} relationships)`), `Chapter ${chapter}: a line for ${n} relationships says so: ${e.label}`);
    const r = L.edges.find(x => x.id === e.id); assert.ok(r && r.pts.length >= 2, `Chapter ${chapter}: ${e.id} is routed`);
  }
  const screen = svgParts(O, L, {interactive: true});
  assert.equal((screen.hits.match(/class="nt-hit" /g) || []).length, L.edges.length, `Chapter ${chapter}: every drawn line is keyboard reachable`);
  const readings = new Map([...screen.hits.matchAll(/data-nt-edge="([^"]*)" role="button" tabindex="0" aria-label="([^"]*)"/g)].map(m => [m[1], m[2]]));
  for (const e of O.edges.filter(e => e.fold && e.fold.count > 1)) { const said = readings.get(esc(e.id)) || ''; assert.ok(said.includes(`×${e.fold.count}`) || said.includes(`${e.fold.count} relationships`), `Chapter ${chapter}: the line's reading carries its count: ${said}`); }
  // Every group stands in its own concern lane, as a list box or as its record; no two overlap; no line runs through a box.
  const bandOf = new Map(L.bands.filter(b => !b.collapsed && !b.none).map(b => [b.viewBand || b.layer, b]));
  for (const b of L.nodes) {
    const n = O.nodes.find(x => x.id === b.id), band = bandOf.get(n.viewBand);
    assert.ok(band && inside(b, band), `Chapter ${chapter}: ${n.title} stands inside the ${n.viewBand} lane`);
    assert.equal(!!n.fold, isListBox(n), `Chapter ${chapter}: a group of several is a list box, a group of one its record`);
  }
  for (let i = 0; i < L.nodes.length; i++) for (let j = i + 1; j < L.nodes.length; j++) assert.ok(!overlaps(L.nodes[i], L.nodes[j]), `Chapter ${chapter}: no two boxes overlap`);
  assert.equal(L.through, 0, `Chapter ${chapter}: no line passes through a box`);
  for (const edge of L.edges) { if (!edge.labelBox || edge.labelHidden) continue; const a = edge.labelBox; assert.ok(L.nodes.every(b => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y), 'a visible route label never sits beneath a card'); }
  assert.ok(L.bands.every(b => /· \d+/.test(b.title)), `Chapter ${chapter}: every lane's header carries its count`);
  // The export draws the same lines and names the index in its Key; the text and the packet keep the exact index.
  const svg = notationSVG(O, L, {key: true, notes: true});
  assert.equal((svg.match(/<g class="nt-edge /g) || []).length, L.edges.length, `Chapter ${chapter}: every drawn line is exported`);
  assert.match(svg, /Between the lanes/, `Chapter ${chapter}: the exported Key explains the counted lines`);
  if (O.nodes.some(n => n.kind === 'outcome')) assert.doesNotMatch(screen.nodes, /fill="#3d6fb0"/, 'Outcomes use the light Motivation tint with dark readable text');
  assert.match(diagramText(O, L), new RegExp(`${D.edges.length} recorded relationships`));
  const packet = explainDiagram(O, L, {chapter});
  assert.equal(packet.counts.underlyingRelationships, D.edges.length);
  assert.deepEqual(packet.relationIndex.flatMap(p => p.relationshipIds).sort(), D.edges.map(e => e.id).sort(), `Chapter ${chapter}: assistant reading retains exact ids`);
  checks.push(`Chapter ${chapter}: ${D.nodes.length} records, ${D.edges.length} exact relationships → ${O.nodes.length} type groups/records in ${bandOf.size} lanes, ${L.edges.length} counted lines (${within} relationships inside groups), ${O.layerSummary.pairs.length} index entries`);
}

const C7 = notationDiagram(project, 'connected', {chapter: 7}), {O: tech, L: tl} = picture(C7);
assert.equal(C7.edges.length, 36, 'reference Chapter 7 demonstrates the reported 36-line weave');
const options = tech.nodes.find(n => n.fold?.composition.some(t => t.type === 'option'));
assert.ok(options && options.fold.list.length >= 2 && isListBox(options), 'the candidate options are one list box');
assert.ok(options.fold.list.every(x => C7.nodes.some(n => n.type === 'option' && n.id === x.id && n.title === x.title)), 'the members it lists are exact recorded options');
assert.equal(options.title, 'Candidate options', 'an option is not claimed as a selected realization');
assert.doesNotMatch(options.sub + ' ' + options.fullTitle, /selected|chosen/i);
assert.equal(tl.edges.length, tech.edges.length);
assert.equal(tl.through, 0, 'no line through a box in the 36-link weave');
const e = C7.edges[0], source = stripToLayers(C7, ['technology']);
assert.deepEqual(layerRelationshipIndex(source).flatMap(p => p.members).sort(), source.edges.map(x => x.id).sort(), 'filters recompute the index from what is visible');
const exact = {...C7, nodes: C7.nodes.filter(n => [e.from, e.to].includes(n.id)), groups: [], edges: C7.edges.filter(x => [e.from, e.to].includes(x.from) && [e.from, e.to].includes(x.to))};
const focus = notationLayout(exact, {arrangement: 'by-layer'});
assert.ok(focus.edges.some(x => x.id === e.id), 'opening an exact index member restores its recorded line between its real endpoints');
// A chapter's layer counts are the lanes' (the sidebar reads the same numbers).
assert.deepEqual(Object.values(layerCounts(C7)).reduce((a, b) => a + b, 0), C7.nodes.length);
checks.push('Chapter 7: the 36-link source has exact counted lines, no line through a box, truthful candidate options, filter fidelity and exact relationship focus');
console.log(JSON.stringify({suite: 'semantic Layers overview', passed: checks.length, checks}, null, 2));
