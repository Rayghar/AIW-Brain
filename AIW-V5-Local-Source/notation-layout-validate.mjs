// The arrangements of the standard diagrams. On the reference project every scene in every offered
// arrangement places every node without overlap, keeps it inside its container, routes every
// connector at right angles without passing through an element, puts no word on an element or on
// another word, and gives the same picture twice and at any window width. On the 49-element stress
// project and a 200-element synthetic picture the same holds within page and time bounds, and the
// metrics recorded for the round-2 report are measured. Pins hold, re-validate and never overlap.
// Run: npm run test:notation-layout
import assert from 'node:assert/strict';
import {referenceProject, stressProject} from './notation-fixtures.mjs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {diagramMetrics, drawnMetrics, bundleIntegrity, corridorMetrics, largeStraight} from './notation-metrics.mjs';
import {withFinalReview} from './public/review-domain.js';
import {applyLogicalCommand} from './public/logical-domain.js';
import {notationDiagram, SCENES, arrangementsFor} from './public/notation-model.js';
import {notationLayout, overlaps, NL, wrapText, charW, MAX_DUMMIES, STRAIGHT_EDGES, BUNDLE, CORRIDOR, NO_BUNDLE_SCENES, NO_BUNDLE_ARRANGEMENTS} from './public/notation-layout.js';
import {styleOf} from './public/notation-palette.js';
import {deskModel} from './public/desk-model.js';
import {runningBoard, boardLayout} from './public/desk-layout.js';
import {svgParts, FAR} from './public/notation-svg.js';

const checks = [], pass = name => checks.push(name), metrics = {};
const project = referenceProject();
const axisAligned = e => e.pts.every((p, i) => i === 0 || p[0] === e.pts[i - 1][0] || p[1] === e.pts[i - 1][1]);
const inside = (b, g) => b.x >= g.x && b.y >= g.y && b.x + b.w <= g.x + g.w && b.y + b.h <= g.y + g.h;
// Round 10 (the jog fix): every interior segment of a route (neither its first nor its last) is a real step, never a
// wobble under 4 px, except on a connector the layout records in L.snapReverted (it kept the round-9 snap because the
// whole-run snap would have entered an element or run on another connector); L.snapReverted names drawn connectors, in
// model order.
const snapped = {layouts: 0, interior: 0, under8: 0, reverted: 0};
const segLen = (p, q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]);
const assertSnapped = (L, tag) => {
  assert.ok(Array.isArray(L.snapReverted), tag + ': the layout records the connectors that kept the round-9 snap');
  const rev = new Set(L.snapReverted);
  assert.deepEqual(L.snapReverted, L.edges.map(e => e.id).filter(id => rev.has(id)), tag + ': snapReverted names drawn connectors, in model order');
  for (const e of L.edges) for (let i = 2; i < e.pts.length - 1; i++) {
    const len = segLen(e.pts[i - 1], e.pts[i]); snapped.interior++; if (len < 8) snapped.under8++;
    if (!rev.has(e.id)) assert.ok(len >= 4, `${tag}: ${e.id} wobbles ${len} px in its route ${JSON.stringify(e.pts)}`);
  }
  snapped.layouts++; snapped.reverted += rev.size;
};
// Round 10 (declared bundles): a picture may draw relationships of one line style that share one element and one side
// of it as one line from that element, and one fact recorded twice as one line. What every layout holds: one L.edge per
// relationship, in model order, each with its whole route; the bundles beside them (L.bundles, L.consolidation; each
// member's bundle, bundleEnd and branch, nothing on any other edge); every bundle passes bundleIntegrity
// (notation-metrics.mjs, the independent checker); no foreign line on a trunk, at a join or with a point on a trunk; and
// never more marks, line ends or ink than the same picture laid out without bundles in the same run (the control,
// consolidate:false). A picture that never bundles (sequence, lanes, radial, BPMN process, sequence scene, straight) is
// the control exactly.
const drawn = (L, scene) => drawnMetrics(L, {sequence: scene === 'sequence', scene});
const bundled = {layouts: 0, bundles: 0, members: 0, duplicates: 0, joins: 0, excluded: 0};
const CONSOLIDATION = ['bundles', 'members', 'duplicates', 'joins', 'passes', 'dissolved', 'fallback', 'why'];
const assertBundles = (D, L, Lc, tag, {quiet = null} = {}) => {
  const scene = D.scene?.id || null;
  assert.deepEqual(L.edges.map(e => e.id), D.edges.map(e => e.id), tag + ': one layout edge per relationship, in model order');
  assert.ok(Array.isArray(L.bundles) && CONSOLIDATION.every(k => k in L.consolidation) && L.consolidation.why.length <= BUNDLE.WHY, tag + ': the layout records its bundles');
  assert.deepEqual(bundleIntegrity(L, {scene, control: Lc}), [], tag + ': every bundle passes its checks, its members no detour against the control');
  const m = drawn(L, scene), mc = drawn(Lc, scene);
  assert.equal(m.foreignOnTrunk, 0, tag + ': no foreign line along a trunk'); assert.equal(m.foreignAtJoin, 0, tag + ': no foreign line at a join'); assert.equal(m.tContacts, 0, tag + ': no foreign point on a trunk');
  const members = new Set(L.bundles.flatMap(b => b.members));
  for (const e of L.edges) { if (members.has(e.id)) assert.ok(L.bundles.find(b => b.id === e.bundle)?.members.includes(e.id) && ['to', 'from', 'both'].includes(e.bundleEnd) && Array.isArray(e.branch), tag + ': ' + e.id + ' names its bundle'); else assert.ok(!('bundle' in e) && !('bundleEnd' in e) && !('branch' in e), tag + ': ' + e.id + ' is in no bundle'); }
  const C = L.consolidation;
  assert.equal(C.bundles, L.bundles.length); assert.equal(C.members, members.size); assert.equal(C.duplicates, L.bundles.filter(b => b.end === 'both').length); assert.equal(C.joins, L.bundles.reduce((t, b) => t + b.joins.length, 0));
  assert.ok(!C.fallback || C.why.length, tag + ': a fallback is named');
  if (!L.bundles.length && C.dissolved) { assert.equal(C.fallback, 'none', tag + ': every bundle drawn apart is a fallback to the control'); assert.deepEqual(L.edges.map(e => e.pts), Lc.edges.map(e => e.pts), tag + ': and the picture is the control'); }
  assert.equal(Lc.bundles.length, 0, tag + ': the control draws no bundle');
  assert.ok(m.markers <= mc.markers && m.lineEnds <= mc.lineEnds && m.ink <= mc.ink, `${tag}: no more marks, line ends or ink than the control (${m.markers}/${mc.markers}, ${m.lineEnds}/${mc.lineEnds}, ${m.ink}/${mc.ink})`);
  const never = NO_BUNDLE_ARRANGEMENTS.has(L.arrangement) || NO_BUNDLE_SCENES.has(scene) || largeStraight(L);
  if (never) { assert.equal(JSON.stringify(L), JSON.stringify(Lc), tag + ': a picture that never bundles is its control'); bundled.excluded++; }
  bundled.layouts++; bundled.bundles += L.bundles.length; bundled.members += members.size; bundled.duplicates += C.duplicates; bundled.joins += C.joins;
  assertWords(L, tag, quiet);
  assertCorridors(L, tag);
  return {m, mc};
};
// Round 11 (corridors, D): every layout records its corridors (L.corridors: planned, crossings, slotted, edges), a
// Layers picture's only; wherever they are planned, the independent checker (notation-metrics.mjs corridorMetrics) finds
// no gap holding more corridors than CORRIDOR.SLOTS, no two off their PITCH and none on an element or nearer its side
// than MARGIN; the control plans the same corridors as the picture drawn with bundles.
const corridors = {layouts: 0, planned: 0, slotted: 0, followed: 0};
const assertCorridors = (L, tag) => {
  const C = L.corridors;
  assert.ok(C && Array.isArray(C.edges) && C.planned === C.edges.length && C.slotted <= C.crossings, tag + ': the layout records its corridors');
  if (L.arrangement !== 'by-layer') assert.equal(C.planned + C.crossings, 0, tag + ': only a Layers picture plans corridors');
  const cm = corridorMetrics(L);
  assert.equal(cm.overfull + cm.offPitch + cm.onElement, 0, tag + ': every corridor in a gap, at most ' + CORRIDOR.SLOTS + ' to a gap, ' + CORRIDOR.PITCH + ' px apart, ' + CORRIDOR.MARGIN + ' px clear of the elements: ' + JSON.stringify(cm));
  assert.equal(cm.crossings, C.slotted, tag + ': a way point per slotted row crossing');
  corridors.layouts++; corridors.planned += C.planned; corridors.slotted += C.slotted; corridors.followed += cm.followed;
};
// Round 10 (bundle-aware words, N4): a bundle writes its word once. Every bundle with a word shows exactly one, written by
// its first member in model order, beside one of the bundle's runs or that member's own branch (within WORD_NEAR px of
// it: the placer's farthest spot beside a line is 16 px off); every other member is labelHidden at that word's place and
// has no word box; a bundle without a word shows none. A qualifier stays at its own relationship's source: a member
// with one is in a fan-in (on its own branch, which starts at its source) or is one of two records of one fact, and of
// two records of one fact drawn as one line the later hides its qualifier at the first's place (qualifierHidden, on
// nothing else). No member carries a step, a cardinality or a crossing mark (each is placed as before, outside bundles).
// `quiet`: the one kind a view hides every word of after layout (the Running board's serves, desk-layout.js quiet): a
// bundle of it shows none, every member hidden.
const WORD_NEAR = 16, words = {bundles: 0, labelled: 0, hidden: 0, qualifiers: 0, qualifierHidden: 0, onRoot: 0, onRun: 0, onBranch: 0};
const boxToSeg = (b, [p, q]) => Math.hypot(Math.max(Math.min(p[0], q[0]) - (b.x + b.w), 0, b.x - Math.max(p[0], q[0])), Math.max(Math.min(p[1], q[1]) - (b.y + b.h), 0, b.y - Math.max(p[1], q[1])));
const segsIn = pts => (pts || []).slice(1).map((q, i) => [pts[i], q]);
const assertWords = (L, tag, quiet = null) => {
  const E = new Map(L.edges.map(e => [e.id, e])), seen = new Map();
  for (const b of L.bundles) {
    const ms = b.members.map(id => E.get(id)), shown = ms.filter(e => (e.label || e.step) && !e.labelHidden);
    words.bundles++;
    assert.ok(ms.every(e => !e.step && !e.cardinality && !e.crossing), tag + ': ' + b.id + ' holds no step, cardinality or crossing mark');
    if (!b.label) { assert.equal(shown.length, 0, tag + ': ' + b.id + ' has no word and shows none'); continue; }
    if (b.kind === quiet) { assert.ok(ms.every(e => e.labelHidden), tag + ': ' + b.id + ' is a kind the view writes no word for'); continue; }
    words.labelled++;
    assert.equal(shown.length, 1, `${tag}: ${b.id} shows exactly one word (${shown.length})`);
    const w = shown[0];
    assert.equal(w.id, ms[0].id, tag + ': ' + b.id + ' is written by its first member in model order');
    assert.ok(w.labelBox && w.lx === w.labelBox.x + w.labelBox.w / 2, tag + ': ' + b.id + ' has its word box');
    const near = pts => Math.min(Infinity, ...segsIn(pts).map(s => boxToSeg(w.labelBox, s)));
    const dRoot = Math.min(Infinity, ...b.runs.filter(r => r.root).map(r => near(r.pts))), dRun = Math.min(Infinity, ...b.runs.map(r => near(r.pts))), dBranch = near(w.branch);
    assert.ok(Math.min(dRun, dBranch) <= WORD_NEAR, `${tag}: ${b.id}'s word ${JSON.stringify(w.labelBox)} lies ${Math.min(dRun, dBranch).toFixed(1)} px from its runs and its writer's branch`);
    if (dRoot <= WORD_NEAR) words.onRoot++; else if (dRun <= WORD_NEAR) words.onRun++; else words.onBranch++;
    for (const e of ms.slice(1)) { assert.ok(e.labelHidden && e.lx === w.lx && e.ly === w.ly && !e.labelBox, tag + ': ' + e.id + ' carries ' + b.id + '’s word, hidden, at its place'); words.hidden++; }
  }
  for (const e of L.edges) {
    if (!e.qualifier) { assert.ok(!('qualifierHidden' in e), tag + ': ' + e.id + ' has no qualifier to hide'); continue; }
    const b = e.bundle && L.bundles.find(x => x.id === e.bundle);
    if (!b) { assert.ok(!('qualifierHidden' in e), tag + ': ' + e.id + ' outside a bundle writes its own qualifier'); continue; }
    words.qualifiers++;
    // rc41 (W1): a fan-out of qualified relationships forms when they share one qualifier (was: a qualified relationship is in
    // no fan-out); its members share the source, so the first writes the qualifier at the root and every other hides it there.
    const k = b.id + '\u0001' + e.from + '\u0001' + (b.end === 'from' ? '' : e.to) + '\u0001' + e.qualifier, first = seen.get(k), [x0, y0] = e.pts[0];
    if (b.end === 'from') assert.ok(L.edges.filter(x => x.bundle === b.id).every(x => x.qualifier === e.qualifier), tag + ': ' + e.id + ' is in a fan-out whose members all carry its qualifier');
    assert.ok(Math.abs(e.qx - x0) <= 82 && Math.abs(e.qy - y0) <= 40, `${tag}: ${e.id}'s qualifier stands at its own source (${e.qx},${e.qy} from ${x0},${y0})`);
    if (b.end === 'to' && e.branch.length) assert.deepEqual(e.pts[0], e.branch[0], tag + ': ' + e.id + '’s qualifier is on its own branch, which starts at its source');
    if (!first) { seen.set(k, e); assert.ok(!e.qualifierHidden, tag + ': ' + e.id + ' writes its qualifier'); continue; }
    assert.ok(e.qualifierHidden === true && e.qx === first.qx && e.qy === first.qy && e.qAnchor === first.qAnchor, tag + ': ' + e.id + ', a second record of ' + first.id + ', hides its qualifier at the first’s place');
    words.qualifierHidden++;
  }
};

// 1. Every scene in every offered arrangement.
let layouts = 0; const drawnDefaults = {};
for (const s of SCENES) {
  const D = notationDiagram(project, s.id);
  for (const a of arrangementsFor(D)) {
    const L = notationLayout(D, {arrangement: a.id}), tag = s.id + ':' + a.id, m = diagramMetrics(L, {scene: s.id});
    assert.equal(L.nodes.length, D.nodes.length, tag + ': every node is placed');
    for (const n of L.nodes) assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y) && n.w > 0 && n.h > 0 && n.x >= 0 && n.y >= 0, tag + ': ' + n.id + ' has a place');
    for (let i = 0; i < L.nodes.length; i++) for (let j = i + 1; j < L.nodes.length; j++) assert.ok(!overlaps(L.nodes[i], L.nodes[j], 1), tag + ': ' + L.nodes[i].id + ' and ' + L.nodes[j].id + ' overlap');
    for (const g of L.groups) { for (const n of D.nodes.filter(n => n.group === g.id)) assert.ok(inside(L.nodes.find(x => x.id === n.id), g), tag + ': ' + n.id + ' inside ' + g.id); const parent = D.groups.find(x => x.id === g.id)?.parent; if (parent) { const pg = L.groups.find(x => x.id === parent); if (pg) assert.ok(inside(g, pg), tag + ': ' + g.id + ' inside ' + parent); } }
    if (['grouped', 'lanes'].includes(a.id)) assert.equal(L.groups.length, D.groups.length, tag + ': every container is drawn'); else assert.equal(L.groups.length, 0, tag + ': no containers in this arrangement');
    for (const e of L.edges) { assert.ok(e.pts.length >= 2 && e.pts.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), tag + ': edge ' + e.id + ' is routed'); assert.ok(Number.isFinite(e.lx) && Number.isFinite(e.ly)); if (a.id !== 'radial') assert.ok(axisAligned(e), tag + ': ' + e.id + ' runs at right angles'); }
    assert.equal(L.through, 0, tag + ': no connector passes through an element'); assert.equal(m.through, 0, tag + ': measured through-passes');
    assert.equal(m.labelOnLabel, 0, tag + ': no word on another word'); assert.ok(m.labelOnNode <= 2, tag + ': at most two words touch an element (' + m.labelOnNode + ')');
    assert.equal(m.nodeOverlaps, 0); assert.equal(m.outside, 0);
    const labelRight = Math.max(0, ...L.edges.filter(e => e.labelBox).map(e => e.labelBox.x + e.labelBox.w)), labelBottom = Math.max(0, ...L.edges.filter(e => e.labelBox).map(e => e.labelBox.y + e.labelBox.h));
    assert.ok(L.W >= Math.max(...L.nodes.map(n => n.x + n.w), labelRight) && L.H >= Math.max(...L.nodes.map(n => n.y + n.h), labelBottom), tag + ': the world holds every element and word');
    assert.ok(L.nodes.every(n => n.y >= L.header.y + L.header.h) && L.groups.every(g => g.y >= L.header.y + L.header.h), tag + ': nothing under the header strip');
    assert.equal(JSON.stringify(notationLayout(D, {arrangement: a.id})), JSON.stringify(L), tag + ': the same picture twice');
    assert.equal(JSON.stringify(notationLayout(D, {arrangement: a.id, viewW: 640})), JSON.stringify(L), tag + ': the same picture at any window width');
    assertSnapped(L, tag);
    const dm = assertBundles(D, L, notationLayout(D, {arrangement: a.id, consolidate: false}), tag);
    if (a.id === s.arrangement) { metrics['reference ' + tag] = m; drawnDefaults[s.id] = dm; }
    layouts++;
  }
}
pass(`${layouts} layouts (${SCENES.length} scenes × the arrangements each offers): every node placed, no two overlap, nodes and subgroups inside their containers, every connector routed at right angles (radial may run straight) and never through an element, no word on another word, at most two touching an element, the world holds every element and word, nothing under the header, and each is the same twice and at any window width; round 10: one layout edge per relationship in model order, every bundle passing bundleIntegrity, no foreign line on a trunk or at a join and no foreign point on a trunk, never more marks, line ends or ink than its in-run control, and the control exactly where a picture never bundles (${bundled.bundles} bundles, ${bundled.duplicates} of one fact recorded twice, ${bundled.joins} joins; ${bundled.excluded} layouts that never bundle)`);

// 2. Default pictures of the reference project: no shared runs (bundled buses), no words on elements. Round 10: the round-2
// guard (audit/round2/03_DIAGRAMS.md:59, finding D2-12) counts every pair of connectors on one line except two members of
// one declared bundle that passes bundleIntegrity (diagramMetrics with the integrity-gated exemption; owner decision 1,
// owner acceptance pending); foreign lines on a trunk, at a join or with a point on a trunk are 0 in every routed
// picture (section 1).
{
  for (const [tag, m] of Object.entries(metrics)) { assert.ok(m.sharedRuns <= 3, tag + ': shared runs ' + m.sharedRuns); assert.equal(m.labelOnNode, 0, tag + ': a word on an element'); }
  for (const [sc, {m}] of Object.entries(drawnDefaults)) assert.ok(m.foreignOnTrunk === 0 && m.foreignAtJoin === 0 && m.tContacts === 0 && m.foreignShared <= 3, sc + ': foreign shared runs ' + m.foreignShared);
  pass('every scene’s default picture of the reference project: no word on an element, at most three connectors sharing a run outside a valid bundle, none along a trunk, at a join or with a point on a trunk');
}

// 3. Ranks, hubs, bands, nesting and lanes read as the standard draws them.
{
  const D = notationDiagram(project, 'application'), T = notationLayout(D, {arrangement: 'tree'});
  const y = id => T.nodes.find(n => n.id === id).y, sys = D.nodes.find(n => n.type === 'system').id;
  assert.ok(y(sys) < y('api-pod') && y('api-pod') < y('api'), 'the application above its components, a component above the logical component it realizes');
  const R = notationLayout(notationDiagram(project, 'data'), {arrangement: 'radial'});
  const hubBox = R.nodes.find(n => n.id === 'tr-002'); assert.ok(hubBox, 'the shared transactional store is the hub');
  const cx = hubBox.x + hubBox.w / 2, cy = hubBox.y + hubBox.h / 2;
  assert.ok(R.nodes.filter(n => n.id !== 'tr-002').every(n => Math.hypot(n.x + n.w / 2 - cx, n.y + n.h / 2 - cy) >= 150), 'the others stand on rings around it');
  const Lyr = notationLayout(notationDiagram(project, 'solution'), {arrangement: 'layered'});
  assert.ok(Lyr.bands.length >= 2 && Lyr.bands[0].title === 'Application' && Lyr.bands.at(-1).title.startsWith('Technology'), 'bands: application above technology');
  for (let i = 1; i < Lyr.bands.length; i++) assert.ok(Lyr.bands[i].y >= Lyr.bands[i - 1].y + Lyr.bands[i - 1].h - 1, 'bands do not overlap');
  const Gp = notationLayout(notationDiagram(project, 'deployment'), {arrangement: 'grouped'});
  const env = Gp.groups.find(g => g.id === 'env-001'); assert.ok(env && Gp.groups.filter(g => g.id.startsWith('zone')).every(g => inside(g, env)), 'zones inside the environment');
  assert.ok(Gp.groups.some(g => g.kind === 'boundary' && inside(g, env) && Gp.groups.filter(z => z.kind === 'zone').some(z => inside(z, g))), 'a zone inside its trust boundary inside the environment');
  const Pr = notationDiagram(project, 'process'), Ln = notationLayout(Pr, {arrangement: 'lanes'});
  const lanes = Ln.groups.filter(g => g.kind === 'lane'), pools = Ln.groups.filter(g => g.kind === 'pool');
  assert.ok(lanes.length >= 2 && lanes.every(g => g.w > 400), 'swimlanes span the diagram');
  for (let i = 0; i < lanes.length; i++) for (let j = i + 1; j < lanes.length; j++) assert.ok(!overlaps(lanes[i], lanes[j], 1), 'two lanes overlap');
  assert.ok(pools.length === 2 && !overlaps(pools[0], pools[1], 0), 'two pools never touch');
  const x = id => Ln.nodes.find(n => n.id === id).x;
  assert.ok(x('JRN-001') < x('JRN-002') && x('JRN-002') < x('JRN-003'), 'steps follow the sequence across the lanes');
  assert.ok(Ln.edges.some(e => e.kind === 'message'), 'the external participant’s message flow is routed between the pools');
  pass('tree ranks the application above its components; radial rings the data around the shared store; layered bands run application over technology without overlapping; grouped nests a zone in its trust boundary in its environment; swimlanes span, never overlap, keep two pools apart and carry the steps in sequence');
}

// 4. The 49-element stress project: every arrangement within page and time bounds, nothing through an element.
{
  const S = stressProject(), D = notationDiagram(S, 'logical');
  assert.equal(D.nodes.length, 49);
  for (const a of arrangementsFor(D)) {
    const t0 = performance.now(), L = notationLayout(D, {arrangement: a.id}), ms = performance.now() - t0, m = diagramMetrics(L, {scene: 'logical'});
    metrics['stress logical:' + a.id] = {...m, ms: Math.round(ms), bundles: L.bundles.length};
    assertSnapped(L, 'stress ' + a.id);
    assertBundles(D, L, notationLayout(D, {arrangement: a.id, consolidate: false}), 'stress ' + a.id);
    assert.equal(m.through, 0, 'stress ' + a.id + ': no connector through an element'); assert.equal(m.nodeOverlaps, 0); assert.equal(m.labelOnLabel, 0, 'stress ' + a.id + ': no word on another word'); assert.ok(m.labelOnNode <= 5, 'stress ' + a.id + ': words on elements ' + m.labelOnNode);
    if (a.id !== 'lanes') assert.ok(L.W <= 6000 && L.H <= 4000, `stress ${a.id}: ${L.W}×${L.H} stays within 6000×4000`);
    else assert.ok(L.H <= 1200, 'stress lanes: three real bands, not one squashed column');
    assert.ok(ms < 3000, `stress ${a.id}: ${Math.round(ms)} ms`);
  }
  const A = notationDiagram(S, 'application'), T = notationLayout(A, {arrangement: 'tree'});
  assert.ok(T.W <= 4000, 'the 63-element application tree folds its wide ranks: ' + T.W + ' px wide');
  pass(`the 49-element, 81-flow stress project: every arrangement draws without a through-pass, an overlap or a word on a word, within 6000×4000 px (lanes: three real bands), each under 3 s; the 63-element application tree is ${T.W} px wide`);
}

// 5. A 200-element synthetic picture (four modules, a chain, fan-outs and cross links) within time and page bounds.
{
  const scene = {id: 'logical', title: 'Synthetic', standard: 'test', arrangement: 'tree', purpose: '', audience: ''};
  const nodes = Array.from({length: 200}, (_, i) => ({id: 'n' + i, kind: 'logicalApp', kicker: 'Logical application component', family: 'application-logical', layer: 'logical', level: 2, title: 'Responsibility number ' + i, fullTitle: '', sub: 'Module ' + (i % 4), ref: 'LR-' + i, group: 'g' + (i % 4), hatched: false}));
  const edges = []; for (let i = 1; i < 200; i++) if (i % 5) edges.push({id: 'c' + i, from: 'n' + (i - 1), to: 'n' + i, label: 'hands on', kind: 'flow', family: 'flow', up: false});
  for (let i = 0; i < 200; i += 7) edges.push({id: 'f' + i, from: 'n' + i, to: 'n' + ((i * 13 + 5) % 200), label: 'notifies', kind: 'flow', family: 'flow', up: false});
  const D = {scene, nodes, groups: [0, 1, 2, 3].map(g => ({id: 'g' + g, kind: 'module', layer: 'logical', title: 'Module ' + g, sub: '', parent: null})), edges: edges.filter(e => e.from !== e.to), notes: [], header: {model: 'Synthetic'}, counts: {}};
  for (const a of ['tree', 'grouped', 'layered']) {
    const t0 = performance.now(), L = notationLayout(D, {arrangement: a}), ms = performance.now() - t0, m = diagramMetrics(L, {scene: 'logical'});
    metrics['synthetic-200 ' + a] = {...m, ms: Math.round(ms), bundles: L.bundles.length};
    assertSnapped(L, 'synthetic ' + a);
    assertBundles(D, L, notationLayout(D, {arrangement: a, consolidate: false}), 'synthetic ' + a);
    assert.equal(m.through, 0, 'synthetic ' + a + ': no connector through an element'); assert.equal(m.nodeOverlaps, 0);
    assert.ok(L.W <= 9000 && L.H <= 9000, `synthetic ${a}: ${L.W}×${L.H}`);
    assert.ok(ms < 8000, `synthetic ${a}: ${Math.round(ms)} ms`);
  }
  pass('a 200-element synthetic picture (four modules, a broken chain, fan-outs) lays out in tree, grouped and layered without a through-pass or an overlap, within 9000×9000 px and 8 s');
}

// 5b. Scale (round 5): a 1,500-element tree of five ranks of 300 with 1,350 connectors (realizations rank to rank and
// long uses from the first rank to the last). Cut into rows, its ranks would ask for far more than MAX_DUMMIES dummies,
// so each crowded rank stands as a grid (no longer 271 ranks and a page 140,039 px wide); above STRAIGHT_EDGES
// connectors every one is drawn straight, and one that has to cross an element is marked and counted.
{
  const scene = {id: 'application', title: 'Synthetic', standard: 'test', arrangement: 'tree', purpose: '', audience: ''};
  const N = 1500, R = N / 5;
  const nodes = Array.from({length: N}, (_, i) => ({id: 'n' + i, kind: 'appComponent', kicker: 'Application component', family: 'application', layer: 'physical', level: 2, title: 'Component number ' + i, fullTitle: '', sub: '', ref: 'C-' + i, group: null, hatched: false}));
  const edges = [];
  for (let i = 0; i < N - R; i++) edges.push({id: 'r' + i, from: 'n' + i, to: 'n' + (R * (Math.floor(i / R) + 1) + (i * 7) % R), label: 'realizes', kind: 'realization', family: 'realization', up: false});
  for (let i = 0; i < R; i += 2) edges.push({id: 'u' + i, from: 'n' + i, to: 'n' + (N - R + (i * 11) % R), label: 'uses', kind: 'serving', family: 'serving', up: false});
  assert.ok(edges.length > STRAIGHT_EDGES && MAX_DUMMIES < 10000);
  const D = {scene, nodes, groups: [], edges, notes: [], header: {model: 'Synthetic'}, counts: {}};
  for (const a of ['tree', 'orthogonal']) {
    const t0 = performance.now(), L = notationLayout(D, {arrangement: a}), ms = performance.now() - t0;
    assert.equal(L.nodes.length, N, a + ': every node is placed');
    const byX = L.nodes.slice().sort((p, q) => p.x - q.x);
    for (let i = 0; i < byX.length; i++) for (let j = i + 1; j < byX.length && byX[j].x < byX[i].x + byX[i].w; j++) assert.ok(!overlaps(byX[i], byX[j], 1), a + ': ' + byX[i].id + ' and ' + byX[j].id + ' overlap');
    assert.ok(L.W <= 9000 && L.H <= 9000, `scale ${a}: ${L.W}×${L.H}`);
    assert.ok(L.edges.every(e => e.pts.length === 2), a + ': above ' + STRAIGHT_EDGES + ' connectors each is drawn straight');
    assert.ok(!L.bundles.length && L.consolidation.passes === 0 && L.edges.every(e => !('bundle' in e)), a + ': a picture drawn straight draws no bundle');
    assert.equal(L.through, L.edges.filter(e => e.through).length, a + ': a straight line across an element is marked and counted');
    assert.ok(ms < 3000, `scale ${a}: ${Math.round(ms)} ms`);
    metrics['synthetic-1500 ' + a] = {W: L.W, H: L.H, through: L.through, ms: Math.round(ms)};
  }
  pass(`a 1,500-element tree with 1,350 connectors: its crowded ranks stand as grids rather than ${MAX_DUMMIES}+ dummies (within 9000×9000 px, in tree and orthogonal), every connector straight above ${STRAIGHT_EDGES}, each line across an element marked, under 3 s`);
}

// 6. Pins: a pin holds and its container grows; a pin re-validates after the model changes; nothing overlaps a pin.
{
  const D = notationDiagram(project, 'security'), L0 = notationLayout(D, {arrangement: 'grouped'});
  const target = L0.nodes.find(n => D.nodes.find(x => x.id === n.id)?.group), g0 = L0.groups.find(g => g.id === target.group), moved = {x: target.x + 400, y: target.y + 300};
  const L1 = notationLayout(D, {arrangement: 'grouped', pins: {[target.id]: {...moved, group: target.group, dx: moved.x - g0.x, dy: moved.y - g0.y}}});
  const p = L1.nodes.find(n => n.id === target.id); assert.equal(p.x, moved.x); assert.equal(p.y, moved.y); assert.equal(p.pinned, true);
  assert.ok(inside(p, L1.groups.find(g => g.id === target.group)), 'its trust zone grows around it');
  for (let i = 0; i < L1.nodes.length; i++) for (let j = i + 1; j < L1.nodes.length; j++) assert.ok(!overlaps(L1.nodes[i], L1.nodes[j], 1), 'nothing overlaps after a pin');
  // Two pins on one place: the second is released and said.
  const other = L0.nodes.find(n => n.id !== target.id);
  const L2 = notationLayout(D, {arrangement: 'grouped', pins: {[target.id]: moved, [other.id]: {x: moved.x + 10, y: moved.y + 10}}});
  assert.deepEqual(L2.droppedPins, [other.id], 'a pin that would cover another pin is released');
  // A pin whose element moved to another container is released.
  const L3 = notationLayout(D, {arrangement: 'grouped', pins: {[target.id]: {...moved, group: 'somewhere-else', dx: 10, dy: 10}}});
  assert.deepEqual(L3.droppedPins, [target.id], 'a pin whose element changed container is released');
  // The stress picture pinned, then the model grows: the pin holds and nothing overlaps it.
  const S = stressProject(), DS = notationDiagram(S, 'logical'), LS = notationLayout(DS, {arrangement: 'tree'}), pinned = LS.nodes[10];
  const pins = {[pinned.id]: {x: pinned.x + 60, y: pinned.y + 40}};
  const grown = withFinalReview(applyLogicalCommand(S, {type: 'logical.responsibility', payload: {title: 'Added after the pin', purpose: 'Pin fixture.', boundary: 'Fixture', owner: 'Fixture', source: 'Fixture', groupId: S.logical.groups[0].id, requirementIds: []}}, '2026-09-30T01:00:00.000Z').document);
  const LG = notationLayout(notationDiagram(grown, 'logical'), {arrangement: 'tree', pins}), mG = diagramMetrics(LG);
  assert.equal(LG.nodes.find(n => n.id === pinned.id).x, pinned.x + 60); assert.equal(mG.nodeOverlaps, 0, 'after the model changed, no element overlaps the pin or another');
  pass('a pin holds and its container grows around it; a pin that would cover another pin, or whose element moved to another container, is released and reported; after the model grows, the pin holds and no two elements overlap');
}

// 7. By layer (round 3, D): the chapter's connected model in one lane per layer, in the sidebar's order; every element
// in its lane; a hidden layer's lane collapsed to a strip that says what it holds; a 305-responsibility chapter drawn
// within a second, its most connected records first and the rest said.
{
  const lanesOf = L => L.bands.filter(b => b.layer);
  for (const ch of [4, 8, 11]) {
    const D = notationDiagram(project, 'connected', {chapter: ch}), L = notationLayout(D, {arrangement: 'by-layer'}), lanes = lanesOf(L);
    const order = ['process', 'logical', 'physical', 'data', 'technology', 'interface', 'security', 'deployment'];
    assert.deepEqual(lanes.map(b => b.layer), order.filter(l => D.nodes.some(n => n.layer === l)), 'chapter ' + ch + ': one lane per layer present, in the sidebar’s order');
    for (const n of D.nodes) { const b = L.nodes.find(x => x.id === n.id), lane = lanes.find(x => x.layer === n.layer); assert.ok(b.y >= lane.y && b.y + b.h <= lane.y + lane.h, 'chapter ' + ch + ': ' + n.id + ' stands in its lane'); }
    for (let i = 1; i < lanes.length; i++) assert.ok(lanes[i].y >= lanes[i - 1].y + lanes[i - 1].h, 'chapter ' + ch + ': lanes never overlap');
    assert.ok(L.edges.some(e => D.nodes.find(n => n.id === e.from).layer !== D.nodes.find(n => n.id === e.to).layer), 'chapter ' + ch + ': relationships cross between lanes');
  }
  const D = notationDiagram(project, 'connected', {chapter: 4}), hiddenN = D.nodes.filter(n => n.layer === 'process').length;
  const S = {...D, nodes: D.nodes.filter(n => n.layer !== 'process'), edges: D.edges.filter(e => ![e.from, e.to].some(id => D.nodes.find(n => n.id === id).layer === 'process'))};
  const LC = notationLayout(S, {arrangement: 'by-layer', collapsed: [{layer: 'process', count: hiddenN}]}), strip = LC.bands.find(b => b.collapsed);
  assert.ok(strip && strip.layer === 'process' && strip.title === `Process · ${hiddenN} hidden by layers` && strip.y < Math.min(...LC.nodes.map(n => n.y)), 'a hidden layer’s lane collapses in its place, saying what it holds');
  const none = notationLayout({...D, nodes: [], edges: []}, {arrangement: 'by-layer', collapsed: [{layer: 'logical', count: 5}, {layer: 'process', count: 24}]});
  assert.deepEqual(none.bands.map(b => b.layer), ['process', 'logical'], 'every layer hidden: the collapsed lanes still say what they hold');
  const big = structuredClone(project); const base = big.logical.responsibilities;
  for (let i = 0; i < 300; i++) { const r = structuredClone(base[i % base.length]); r.id = 'XR-' + i; r.ref = 'XR-' + i; r.title += ' ' + i; big.logical.responsibilities.push(r); }
  const t0 = Date.now(), DB = notationDiagram(big, 'connected', {chapter: 4}), LB = notationLayout(DB, {arrangement: 'by-layer'}), ms = Date.now() - t0;
  assert.ok(ms < 1500, 'a 305-responsibility chapter lays out by layer in ' + ms + ' ms');
  assert.ok(DB.nodes.filter(n => n.layer === 'logical').length <= 110 && DB.notes.some(t => /195 of Chapter 4's 305 records are not drawn/.test(t)), 'it draws its most connected records and says how many wait: ' + DB.notes.join(' '));
  for (let i = 0; i < LB.nodes.length; i++) for (let j = i + 1; j < LB.nodes.length; j++) assert.ok(!overlaps(LB.nodes[i], LB.nodes[j], 1), 'no overlap at scale');
  assert.ok(largeStraight(LB) && LB.corridors.planned === 0 && LB.corridors.crossings === 0, 'round 11: a Layers picture drawn straight plans no corridor');
  pass('by layer: the chapter’s connected model in one lane per layer, in the sidebar’s order, every element in its lane, relationships crossing between lanes; a hidden layer collapses to a strip that says what it holds (all of them when every layer is hidden); a 305-responsibility chapter lays out in ' + ms + ' ms with its most connected records, the rest said');
}

// 8. Eight lanes (round 4, R4-B): the Layers view draws a lane for every layer in the sidebar's order. A layer the
// chapter's model does not hold is a thin labelled strip ("Data · none in this chapter", not a collapsed lane: there
// is nothing to open); a hidden layer collapses in its place ("Security · 1 hidden by layers"); the lanes present keep
// every element and the relationships between them; nothing overlaps; a model with nothing drawn still lists all eight.
{
  const order = ['process', 'logical', 'physical', 'data', 'technology', 'interface', 'security', 'deployment'];
  const titles = {process: 'Process', logical: 'Logical application', physical: 'Physical application', data: 'Data', technology: 'Technology', interface: 'Interface', security: 'Security', deployment: 'Deployment'};
  const countsOf = D => Object.fromEntries(order.map(l => [l, D.nodes.filter(n => n.layer === l).length]));
  const seen = [];
  for (const ch of [4, 8, 10]) {
    const full = notationDiagram(project, 'connected', {chapter: ch}), counts = countsOf(full), every = {counts, none: 'none in this chapter'};
    const L = notationLayout(full, {arrangement: 'by-layer', every}), lanes = L.bands.filter(b => b.layer);
    assert.deepEqual(lanes.map(b => b.layer), order, 'chapter ' + ch + ': a lane for each of the eight layers, in the sidebar’s order');
    for (const b of lanes) {
      if (counts[b.layer]) { assert.equal(b.title, `${titles[b.layer]} · ${counts[b.layer]}`, 'chapter ' + ch + ': a lane it holds names its count'); assert.ok(!b.collapsed && !b.none); }
      else { assert.equal(b.title, `${titles[b.layer]} · none in this chapter`, 'chapter ' + ch + ': a lane it does not hold says so'); assert.ok(b.none && !b.collapsed && b.h <= 24, 'chapter ' + ch + ': as a thin strip, not a collapsed lane: ' + JSON.stringify(b)); }
    }
    for (const n of full.nodes) { const b = L.nodes.find(x => x.id === n.id), lane = lanes.find(x => x.layer === n.layer); assert.ok(b && b.y >= lane.y && b.y + b.h <= lane.y + lane.h, 'chapter ' + ch + ': ' + n.id + ' stands in its lane'); }
    for (let i = 1; i < lanes.length; i++) assert.ok(lanes[i].y >= lanes[i - 1].y + lanes[i - 1].h, 'chapter ' + ch + ': lanes and strips never overlap');
    assert.equal(L.edges.length, full.edges.length, 'chapter ' + ch + ': every relationship is drawn');
    assert.ok(L.edges.some(e => full.nodes.find(n => n.id === e.from).layer !== full.nodes.find(n => n.id === e.to).layer), 'chapter ' + ch + ': relationships cross between lanes');
    // Hide the smallest layer it holds: its lane collapses in place and says how many it hides.
    const hide = order.filter(l => counts[l]).sort((a, b) => counts[a] - counts[b])[0], S = {...full, nodes: full.nodes.filter(n => n.layer !== hide), edges: full.edges.filter(e => ![e.from, e.to].some(id => full.nodes.find(n => n.id === id).layer === hide))};
    const LH = notationLayout(S, {arrangement: 'by-layer', every, collapsed: [{layer: hide, count: counts[hide]}]}), strip = LH.bands.find(b => b.layer === hide);
    assert.deepEqual(LH.bands.filter(b => b.layer).map(b => b.layer), order, 'chapter ' + ch + ': still eight lanes with one hidden');
    assert.ok(strip.collapsed && strip.title === `${titles[hide]} · ${counts[hide]} hidden by layers`, 'chapter ' + ch + ': the hidden lane collapses and says what it holds: ' + strip.title);
    seen.push(`Ch ${ch}: ${order.filter(l => counts[l]).length} drawn, ${order.filter(l => !counts[l]).length} none, ${titles[hide]} hidden → “${strip.title}”`);
  }
  const blank = notationLayout({...notationDiagram(project, 'connected', {chapter: 4}), nodes: [], edges: []}, {arrangement: 'by-layer', every: {counts: {logical: 5}, none: 'none in this chapter'}, collapsed: [{layer: 'logical', count: 5}]});
  assert.deepEqual(blank.bands.map(b => b.title), ['Process · none in this chapter', 'Logical application · 5 hidden by layers', 'Physical application · none in this chapter', 'Data · none in this chapter', 'Technology · none in this chapter', 'Interface · none in this chapter', 'Security · none in this chapter', 'Deployment · none in this chapter'], 'nothing drawn: all eight still say what they hold');
  for (let i = 1; i < blank.bands.length; i++) assert.ok(blank.bands[i].y >= blank.bands[i - 1].y + blank.bands[i - 1].h, 'and the strips never overlap');
  const plain = notationLayout(notationDiagram(project, 'connected', {chapter: 4}), {arrangement: 'by-layer'});
  assert.ok(plain.bands.every(b => !b.none), 'without `every` (a diagram arranged by layer) only the lanes present are drawn, as before');
  pass('eight lanes: the Layers view draws a lane for each of the eight layers in the sidebar’s order — the ones the chapter does not hold as thin “none in this chapter” strips, a hidden one collapsed in place with its count — every element in its lane, every relationship drawn, nothing overlapping; with nothing drawn all eight still say what they hold (' + seen.join('; ') + ')');
}

// Round 11 · corridors for the Layers view (D). A connector that spans more than one lane (CORRIDOR.SPAN lanes apart or
// more) is given a corridor through each row it crosses: the rows are the ranks of a layered ordering in which such a
// connector is a chain of dummies ordered with the elements by the same barycentre sweeps, and in each row its dummy
// takes a slot in the gap it stands in (CORRIDOR.SLOTS a gap, PITCH px apart, MARGIN px from either element; the outer
// gaps outward from the end elements); the slot's point at the row's middle is `way` for the router. A gap beyond its
// slots leaves the rest to the router; no element moves for a corridor; the Layers views of the reference project cross
// less. Checked on hand-built pictures whose every number is known and on the reference project.
{
  const lanesOf = L => L.bands.filter(b => b.layer), mid = n => Math.round(n.y + n.h / 2);
  const picture = (nodes, edges) => ({scene: {id: 'connected', title: 'Connected', standard: 'test', arrangement: 'by-layer', purpose: '', audience: ''}, nodes, groups: [], edges, notes: [], header: {model: 'Corridors'}, counts: {}});
  const el = (id, layer) => ({id, kind: 'logicalApp', kicker: 'Element', family: 'application-logical', layer, level: 2, title: id, fullTitle: '', sub: '', ref: id, group: null, hatched: false});
  const link = (id, from, to, kind = 'uses') => ({id, from, to, label: '', kind, family: 'dependency', up: false});
  // Five process elements, one logical element under the middle one, five physical elements: each process element uses
  // the physical element below it (five connectors that span two lanes and cross the logical row); the logical element
  // is used by the middle process element and uses the middle physical one (two connectors that span one lane, no corridor).
  const five = n => Array.from({length: 5}, (_, i) => el(n + (i + 1), n === 'P' ? 'process' : 'physical'));
  const D1 = picture([...five('P'), el('L1', 'logical'), ...five('Q')], [...Array.from({length: 5}, (_, i) => link('long' + (i + 1), 'P' + (i + 1), 'Q' + (i + 1))), link('inL', 'P3', 'L1'), link('outL', 'L1', 'Q3')]);
  const L1 = notationLayout(D1, {arrangement: 'by-layer'}), N1 = new Map(L1.nodes.map(n => [n.id, n])), logical = lanesOf(L1).find(b => b.layer === 'logical'), l1 = N1.get('L1');
  assert.deepEqual(L1.corridors.edges.map(([id]) => id).sort(), ['long1', 'long2', 'long3', 'long4', 'long5'], 'a corridor for each connector that spans two lanes, none for one that spans one');
  assert.equal(L1.corridors.planned, 5); assert.equal(L1.corridors.crossings, 5, 'each crosses one row'); assert.equal(L1.corridors.slotted, 5, 'each is slotted');
  const at1 = new Map(L1.corridors.edges.map(([id, pts]) => [id, pts]));
  for (const [id, pts] of at1) {
    assert.equal(pts.length, 1, id + ': one way point, for the one row it crosses');
    const [x, y] = pts[0];
    assert.equal(y, mid(l1), id + ': at the middle of the logical row'); assert.ok(y > logical.y && y < logical.y + logical.h, id + ': inside the logical lane');
    assert.ok(x <= l1.x - CORRIDOR.MARGIN || x >= l1.x + l1.w + CORRIDOR.MARGIN, id + ': in a gap, ' + CORRIDOR.MARGIN + ' px clear of the element (' + x + ' against ' + l1.x + '–' + (l1.x + l1.w) + ')');
    assert.ok(!L1.nodes.some(n => n.x <= x && x <= n.x + n.w && n.y <= y && y <= n.y + n.h), id + ': on no element');
  }
  const xs1 = [1, 2, 3, 4, 5].map(i => at1.get('long' + i)[0][0]);
  assert.ok(xs1.every((x, i) => !i || x > xs1[i - 1]), 'ordered by the barycentre of their ends: the corridors stand in the order of the elements they join: ' + xs1.join(', '));
  for (const side of [xs1.filter(x => x < l1.x), xs1.filter(x => x > l1.x + l1.w)]) { assert.ok(side.length <= CORRIDOR.SLOTS); for (let i = 1; i < side.length; i++) assert.ok(side[i] - side[i - 1] >= CORRIDOR.PITCH, 'neighbouring corridors of an outer gap at least ' + CORRIDOR.PITCH + ' px apart'); }
  assert.ok(xs1.some(x => x < l1.x) && xs1.some(x => x > l1.x + l1.w), 'the corridors take both gaps round the logical element: ' + xs1.join(', '));
  // In an outer gap a corridor stands under its own place above: under the process element it leaves, where the gap allows.
  for (const i of [1, 2, 4, 5]) { const p = N1.get('P' + i), x = at1.get('long' + i)[0][0]; if (p.x + p.w / 2 <= l1.x - CORRIDOR.MARGIN || p.x + p.w / 2 >= l1.x + l1.w + CORRIDOR.MARGIN) assert.equal(x, p.x + p.w / 2, 'long' + i + ' runs under P' + i); }
  assert.equal(corridorMetrics(L1).crossings, 5); assert.deepEqual([corridorMetrics(L1).overfull, corridorMetrics(L1).offPitch, corridorMetrics(L1).onElement], [0, 0, 0]);
  // No element moves for a corridor: with and without corridors every row holds the same places (each element stands
  // GAP_X from the next; only the order within a row may differ), and the lanes are the same.
  const L0 = notationLayout(D1, {arrangement: 'by-layer', corridors: false});
  assert.equal(L0.corridors.planned + L0.corridors.crossings, 0, 'corridors:false plans none');
  const places = L => [...new Set(L.nodes.map(n => mid(n)))].sort((a, b) => a - b).map(y => L.nodes.filter(n => mid(n) === y).map(n => n.x).sort((a, b) => a - b).join(','));
  assert.deepEqual(places(L1), places(L0), 'every row holds the same places with and without corridors');
  assert.deepEqual(L1.bands.map(b => [b.layer, b.y, b.h]), L0.bands.map(b => [b.layer, b.y, b.h]), 'the lanes are the same');
  // The cap: ten process and ten physical elements (two rows each), one logical element: ten connectors span two lanes
  // and cross the logical row, whose two outer gaps hold four slots each; eight take them, eight px apart, the two
  // others are left to the router in that row.
  const ten = n => Array.from({length: 10}, (_, i) => el(n + (i + 1), n === 'P' ? 'process' : 'physical'));
  const D2 = picture([...ten('P'), el('L1', 'logical'), ...ten('Q')], [...Array.from({length: 10}, (_, i) => link('long' + (i + 1), 'P' + (i + 1), 'Q' + (i + 1))), link('inL', 'P5', 'L1'), link('outL', 'L1', 'Q5')]);
  const L2 = notationLayout(D2, {arrangement: 'by-layer'}), l2 = L2.nodes.find(n => n.id === 'L1'), row2 = L2.corridors.edges.flatMap(([, pts]) => pts.filter(([, y]) => y === mid(l2)).map(([x]) => x)).sort((a, b) => a - b);
  assert.equal(row2.length, 2 * CORRIDOR.SLOTS, 'the logical row holds eight corridors of the ten that cross it: ' + row2.join(', '));
  const left2 = row2.filter(x => x < l2.x), right2 = row2.filter(x => x > l2.x + l2.w);
  assert.deepEqual([left2.length, right2.length], [CORRIDOR.SLOTS, CORRIDOR.SLOTS], 'four to a gap');
  for (const side of [left2, right2]) for (let i = 1; i < side.length; i++) assert.ok(side[i] - side[i - 1] >= CORRIDOR.PITCH, 'at least ' + CORRIDOR.PITCH + ' px apart in an outer gap: ' + side.join(', '));
  assert.ok(left2[left2.length - 1] <= l2.x - CORRIDOR.MARGIN && right2[0] >= l2.x + l2.w + CORRIDOR.MARGIN, 'clear of the element');
  assert.ok(L2.corridors.crossings > L2.corridors.slotted, 'the two left to the router are counted as demand, not as slotted: ' + L2.corridors.crossings + ' / ' + L2.corridors.slotted);
  assert.deepEqual([corridorMetrics(L2).overfull, corridorMetrics(L2).offPitch, corridorMetrics(L2).onElement], [0, 0, 0]);
  assertBundles(D2, L2, notationLayout(D2, {arrangement: 'by-layer', consolidate: false}), 'corridors cap');
  // The reference project's Layers views cross less with corridors than without, in all and in Chapters 4, 5 and 6.
  const ref = {before: 0, after: 0, chapters: {}};
  for (let ch = 1; ch <= 11; ch++) {
    const D = notationDiagram(project, 'connected', {chapter: ch}); if (!D?.nodes.length) continue;
    const L = notationLayout(D, {arrangement: 'by-layer'}); if (largeStraight(L)) continue;
    const a = drawnMetrics(L, {scene: 'connected'}).visualCrossings, b = drawnMetrics(notationLayout(D, {arrangement: 'by-layer', corridors: false}), {scene: 'connected'}).visualCrossings;
    ref.before += b; ref.after += a; ref.chapters[ch] = [b, a];
  }
  for (const ch of [4, 5, 6]) assert.ok(ref.chapters[ch][1] < ref.chapters[ch][0], `Chapter ${ch} by layer crosses less: ${ref.chapters[ch].join(' → ')}`);
  assert.ok(ref.after <= 0.85 * ref.before, `the reference project's Layers views cross at least 15% less: ${ref.before} → ${ref.after}`);
  metrics.corridors = {...corridors, reference: ref};
  pass(`corridors: a connector that spans two lanes gets one way point per row it crosses, at the row's middle, in a gap ${CORRIDOR.MARGIN} px clear of the elements, the corridors in the order of the elements they join, at least ${CORRIDOR.PITCH} px apart (exactly so between two elements), at most ${CORRIDOR.SLOTS} to a gap (ten across a one-element row: eight slotted, two left to the router), in an outer gap under the element each leaves; a connector that spans one lane gets none; no element moves for a corridor; a Layers picture drawn straight plans none; the reference project's Layers views cross ${ref.before} → ${ref.after} (${Math.round((ref.after - ref.before) / ref.before * 100)}%; Chapters 4, 5, 6: ${[4, 5, 6].map(c => ref.chapters[c].join('→')).join(', ')}); across the layouts checked so far, ${corridors.planned} corridors with ${corridors.slotted} way points, ${corridors.followed} followed by the drawn route, every one in a gap at its pitch`);
}

// Semantic zoom (round 5): far out, the screen writes each element's name at FAR px, so that it reads at 9 px or more at
// the first fit (zoom 0.5). In every scene of the reference project each far name fits its box: its lines, wrapped at
// FAR px, are no wider than the box and no more than its height holds; the box itself does not move (no new layout).
{
  let names = 0, cut = 0;
  for (const sc of SCENES) {
    const D = notationDiagram(project, sc.id), L = notationLayout(D), html = svgParts(D, L, {interactive: true}).nodes;
    for (const b of L.nodes) {
      const n = D.nodes.find(x => x.id === b.id); if (!n || n.kind === 'event' || n.kind === 'gateway') continue;
      const w = b.w - 12, max = Math.max(1, Math.min(3, Math.floor((b.h - 8) / (FAR * 1.08)))), lines = wrapText(n.title, n.kind === 'task' ? b.w - 10 : w, FAR, max);
      assert.ok(lines.length <= max && lines.every(l => charW(l, FAR) <= w + 1 || l.length <= 2), sc.id + ': the far name of ' + n.id + ' fits its box');
      names++; if (lines.at(-1).endsWith('…')) cut++;
    }
    assert.equal((html.match(/class="nt-ftitle"/g) || []).length >= D.nodes.filter(n => n.kind !== 'event' && n.kind !== 'gateway').length, true, sc.id + ': every element has its far name');
  }
  assert.ok(FAR * 0.5 >= 9, 'far names read at 9 px or more at zoom 0.5');
  metrics.farNames = {names, shortened: cut, px: FAR};
  pass(`semantic zoom: far out each element’s name is written at ${FAR} px (${FAR * 0.5} px on screen at the first fit), wrapped inside its own box in every scene of the reference project (${names} names, ${cut} shortened with an ellipsis; the companion carries the full text), without moving any element`);
}

// Round 6 (Contract T): the sequence arrangement and the boundary event's place.
{
  const D = notationDiagram(project, 'sequence'), L = notationLayout(D, {arrangement: 'sequence'});
  assert.equal(L.lifelines.length, D.nodes.length, 'a lifeline per head');
  const xs = L.nodes.map(n => n.x); assert.ok(xs.every((x, i) => i === 0 || x > xs[i - 1]), 'lifelines stand in columns left to right');
  assert.ok(L.nodes.every(n => n.y === L.nodes[0].y), 'the heads share one row');
  for (const l of L.lifelines) { const b = L.nodes.find(n => n.id === l.id); assert.equal(l.x, b.x + b.w / 2); assert.ok(l.y1 === b.y + b.h && l.y2 > l.y1, 'the dashed line runs from the head to the last message'); }
  const rows = L.edges.map(e => e.pts[0][1]); assert.ok(rows.every((y, i) => i === 0 || y > rows[i - 1]), 'messages are rows, top-down in step order');
  assert.ok(L.edges.every(e => e.pts.length === 2 && e.pts[0][1] === e.pts[1][1] && Number.isFinite(e.lx) && e.labelBox), 'each a horizontal connector with its word placed');
  assert.ok(L.W >= Math.max(...L.edges.map(e => e.labelBox.x + e.labelBox.w)) && L.H > L.lifelines[0].y2, 'the page holds every word and the lines');
  assert.equal(JSON.stringify(notationLayout(D, {arrangement: 'sequence'})), JSON.stringify(L), 'the same picture twice');
  const t0 = performance.now(); for (let i = 0; i < 20; i++) notationLayout(D, {arrangement: 'sequence'}); const ms = (performance.now() - t0) / 20;
  metrics['sequence reference'] = {lifelines: L.lifelines.length, messages: L.edges.length, W: L.W, H: L.H, ms: Math.round(ms * 10) / 10};
  // A boundary event (a hint to the swimlanes): it hangs on the lower right edge of its task.
  const scene = {id: 'process', title: 'Synthetic', standard: 'test', arrangement: 'lanes', purpose: '', audience: ''};
  const task = {id: 't1', kind: 'task', kicker: '', family: 'bpmn-task', layer: 'process', level: 1, title: 'Hold the slot', fullTitle: '', sub: '', ref: '', group: 'lane:a', hatched: false};
  const ev = {id: 'e1', kind: 'event', kicker: '', family: 'bpmn-event', layer: 'process', level: 1, title: 'Timed out', fullTitle: '', sub: '', ref: '', group: 'lane:a', hatched: false, attachedTo: 't1', glyph: {position: 'boundary', eventType: 'timer'}};
  const next = {id: 't2', kind: 'task', kicker: '', family: 'bpmn-task', layer: 'process', level: 1, title: 'Tell the patient', fullTitle: '', sub: '', ref: '', group: 'lane:a', hatched: false};
  const DB = {scene, nodes: [task, ev, next], groups: [{id: 'pool:x', kind: 'pool', layer: 'process', title: 'Pool', sub: '', parent: null}, {id: 'lane:a', kind: 'lane', layer: 'process', title: 'A', sub: '', parent: 'pool:x'}], edges: [{id: 'f1', from: 'e1', to: 't2', label: 'Timed out', kind: 'sequence', family: 'sequence', up: false}], notes: [], header: {model: 'Synthetic'}, counts: {}};
  const LB = notationLayout(DB, {arrangement: 'lanes'}), T = LB.nodes.find(n => n.id === 't1'), B = LB.nodes.find(n => n.id === 'e1'), N = LB.nodes.find(n => n.id === 't2');
  assert.ok(B.x > T.x + T.w / 2 && B.x < T.x + T.w && B.y > T.y + T.h / 2 && B.y < T.y + T.h, 'the boundary event sits on the edge of its task');
  assert.ok(N.x > T.x + T.w, 'what follows the boundary event stands downstream of the task');
  pass(`the sequence arrangement: lifelines as evenly spaced columns with a dashed line, messages as rows top-down with their step and word, the same twice (${L.lifelines.length} lifelines, ${L.edges.length} messages, ${L.W}×${L.H} px in ${metrics['sequence reference'].ms} ms); a boundary event hangs on the lower right edge of its task and what follows it stands downstream`);
}

// Round 10 · the jog fix. A route is searched on cell centres; the whole run that leaves a port and the whole run that
// enters one lie on the port's line, so a straight drop is one segment and every corner a real turn. Pinned pictures
// put the ports where each rule shows.
{
  const scene = {id: 'logical', title: 'Synthetic', standard: 'test', arrangement: 'tree', purpose: '', audience: ''};
  const part = id => ({id, kind: 'logicalApp', kicker: 'Logical application component', family: 'application-logical', layer: 'logical', level: 2, title: 'Part ' + id, fullTitle: '', sub: '', ref: id, group: null, hatched: false});
  const component = id => ({...part(id), kind: 'appComponent', kicker: 'Application component', family: 'application'}); // 175 px wide: its ports stand on half pixels
  const link = (id, from, to) => ({id, from, to, label: '', kind: 'flow', family: 'flow', up: false});
  const draw = (nodes, edges, pins) => { const L = notationLayout({scene, nodes, groups: [], edges, notes: [], header: {model: 'Synthetic'}, counts: {}}, {arrangement: 'tree', pins}), m = diagramMetrics(L); assert.equal(m.through, 0); assert.equal(L.through, 0); return {L, m, pts: id => L.edges.find(e => e.id === id).pts}; };
  const box = (L, id) => L.nodes.find(n => n.id === id);
  // A straight drop between two ports on one line: one segment.
  let P = draw([part('a'), part('b')], [link('e', 'a', 'b')], {a: {x: 100, y: 100}, b: {x: 100, y: 400}});
  assert.deepEqual(P.pts('e'), [[214, 162], [214, 400]], 'a straight drop is one segment');
  // Ports 2 px apart across the line (a wobble, which the round-9 snap drew as two 2 px jogs): the far port slides along
  // its face onto the near port's line, and the line is one segment.
  P = draw([part('a'), part('b')], [link('e', 'a', 'b')], {a: {x: 100, y: 100}, b: {x: 102, y: 400}});
  assert.deepEqual(P.pts('e'), [[214, 162], [214, 400]], 'a 2 px wobble straightens: the far port slides onto the line');
  assert.ok(P.pts('e')[1][0] > box(P.L, 'b').x + 6, 'the slid port stays on its face');
  // The far face holds two ports and the near face one: the near port slides, and the far ports keep their places.
  P = draw([part('a'), part('b'), part('c')], [link('e', 'a', 'b'), link('f', 'c', 'b')], {a: {x: 100, y: 100}, b: {x: 111, y: 400}, c: {x: 600, y: 100}});
  assert.deepEqual(P.pts('e'), [[216, 162], [216, 400]], 'the end whose face holds fewer ports slides');
  assert.equal(P.pts('f').at(-1)[0], 234, 'the other port on the busy face keeps its place, 18 px along');
  // Ports 6 px apart in one column of cells: one step, half way down the run, not a stair at each end.
  P = draw([part('a'), part('b')], [link('e', 'a', 'b')], {a: {x: 95, y: 100}, b: {x: 101, y: 400}});
  const j = P.pts('e');
  assert.equal(j.length, 4, 'offset ports in one column: one step ' + JSON.stringify(j));
  assert.ok(j[0][0] === 209 && j[1][0] === 209 && j[2][0] === 215 && j[3][0] === 215 && j[1][1] === j[2][1], 'the step is the 6 px between the ports');
  assert.ok(j[1][1] > 162 + (400 - 162) / 3 && j[1][1] < 400 - (400 - 162) / 3, 'the step stands in the middle third of the run: ' + j[1][1]);
  // A route with a corner: the run out of the port and the run into the far port each stay on their port's line, so it
  // has exactly its two real turns (the round-9 snap left a 2 px jog beside the first port).
  P = draw([part('a'), part('b')], [link('e', 'a', 'b')], {a: {x: 100, y: 100}, b: {x: 400, y: 300}});
  const k = P.pts('e');
  assert.equal(k.length, 4, 'two turns, no stair: ' + JSON.stringify(k)); assert.ok(k[0][0] === k[1][0] && k[1][1] === k[2][1] && k[2][0] === k[3][0], 'down, across, down');
  assert.deepEqual(P.L.snapReverted, []);
  // A half-pixel port (a 175 px box) beside an element 2 px from the cell line: the whole-run snap would enter the element
  // by 2 px, so this connector alone keeps the round-9 snap (clear of it) and is recorded.
  P = draw([component('a'), component('b'), part('c')], [link('e', 'a', 'b')], {a: {x: 232, y: 100}, b: {x: 232, y: 400}, c: {x: 318, y: 200}});
  assert.deepEqual(P.L.snapReverted, ['e'], 'the connector that would enter an element keeps the round-9 snap and is recorded');
  const beside = P.pts('e').slice(1).map((q, i) => [P.pts('e')[i], q]).filter(([p, q]) => Math.max(p[1], q[1]) > 200 && Math.min(p[1], q[1]) < 262);
  assert.ok(beside.length && beside.every(([p, q]) => Math.max(p[0], q[0]) <= box(P.L, 'c').x - 1), 'and passes the element clear: ' + JSON.stringify(P.pts('e')));
  // Two stacked boxes whose ports share a column of cells: the whole-run snap would lay the lower connector's run on the
  // upper connector's for 8 px (they were 2 px apart), so the lower one keeps the round-9 snap and is recorded, whichever
  // was routed first.
  P = draw([part('x'), part('y'), part('w'), part('z')], [link('e1', 'x', 'w'), link('e2', 'y', 'z')], {x: {x: 1000, y: 100}, y: {x: 1000, y: 222}, w: {x: 100, y: 500}, z: {x: 100, y: 100}});
  assert.deepEqual(P.L.snapReverted, ['e2'], 'the connector that would run on another keeps the round-9 snap and is recorded');
  assert.equal(P.m.sharedRuns, 0, 'no two connectors share a run');
  pass(`the jog fix: a straight drop is one segment; ports 2 px apart straighten by sliding the port on the quieter face; ports 6 px apart in one column take one step in the middle third; a cornered route keeps its two real turns; a connector whose snapped run would enter an element by 2 px, or run on another connector, keeps the round-9 snap and is named in L.snapReverted. Across ${snapped.layouts} reference, stress and synthetic layouts, ${snapped.interior} interior segments: none under 4 px outside the ${snapped.reverted} recorded connectors, ${snapped.under8} under 8 px`);
  metrics.jogFix = snapped;
}

// Round 10 · declared bundles (N3). Small pictures laid out by the engine show the shape of a bundle: one port at the
// shared end, a trunk from it with a root of at least BUNDLE.ROOT px, a join where each branch leaves, every member's
// whole route kept, one mark at the shared end where the control draws one per relationship.
const synth = (() => {
  const scene = {id: 'logical', title: 'Synthetic', standard: 'test', arrangement: 'tree', purpose: '', audience: ''};
  const el = id => ({id, kind: 'appComponent', kicker: 'Application component', family: 'application', layer: 'physical', level: 2, title: 'Part ' + id, fullTitle: '', sub: '', ref: id, group: null, hatched: false});
  const rel = (id, from, to, kind = 'serves', extra = {}) => ({id, from, to, label: '', kind, family: styleOf(kind).family, up: !!styleOf(kind).up, ...extra});
  const lay = (nodes, edges, opts = {}) => { const D = {scene: opts.scene || scene, nodes: nodes.map(el), groups: [], edges, notes: [], header: {model: 'Synthetic'}, counts: {}}; const L = notationLayout(D, {arrangement: 'tree', ...opts}), Lc = notationLayout(D, {arrangement: 'tree', ...opts, consolidate: false}); assertBundles(D, L, Lc, 'synthetic ' + edges.map(e => e.kind).join(',')); return {D, L, Lc, m: drawn(L, D.scene.id), mc: drawn(Lc, D.scene.id)}; };
  // A hub and n leaves, the relationships from each leaf to the hub (in) or from the hub to each leaf (out).
  const fan = (kind, n, dir = 'in', extra = () => ({})) => lay(['hub', ...Array.from({length: n}, (_, i) => 'leaf' + i)], Array.from({length: n}, (_, i) => rel('r' + i, dir === 'in' ? 'leaf' + i : 'hub', dir === 'in' ? 'hub' : 'leaf' + i, kind, extra(i))));
  return {scene, el, rel, lay, fan};
})();
{
  const {fan, lay, rel} = synth;
  // A component served by four parts: one bundle at its side, one head, a join where each branch leaves.
  const S = fan('serves', 4), b = S.L.bundles[0];
  assert.equal(S.L.bundles.length, 1, 'four serves to one component: one bundle');
  assert.ok(b.end === 'to' && b.node === 'hub' && ['top', 'bottom', 'left', 'right'].includes(b.face) && b.kind === 'serves' && b.dotted === true && b.label === '', 'the bundle names its shared end, side, kind and a join dot: ' + JSON.stringify({...b, runs: b.runs.length}));
  assert.deepEqual(b.members, S.D.edges.map(e => e.id), 'its members, in model order');
  assert.ok(b.root >= BUNDLE.ROOT && b.joins.length >= 1, 'a root of at least ' + BUNDLE.ROOT + ' px (' + b.root + ') and joins where branches leave');
  const port = S.L.edges[0].pts.at(-1), roots = b.runs.filter(r => r.root);
  assert.ok(S.L.edges.every(e => e.pts.at(-1)[0] === port[0] && e.pts.at(-1)[1] === port[1]), 'one port at the shared end');
  assert.ok(roots.length === 1 && roots[0].members.length === 4 && roots[0].pts[0][0] === port[0] && roots[0].pts[0][1] === port[1] && roots[0].offset === 0, 'one root run from the port, holding every member');
  assert.ok(b.runs.every(r => r.root || b.joins.some(j => j[0] === r.pts[0][0] && j[1] === r.pts[0][1])), 'every other run leaves a join, away from the shared end');
  const leaf = id => S.L.nodes.find(n => n.id === id);
  assert.ok(S.L.edges.every(e => { const n = leaf(e.from), [x, y] = e.pts[0]; return x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h; }), 'every member keeps its whole route, from its own element');
  assert.ok(S.m.markers === 1 && S.mc.markers === 4 && S.m.lineEnds === 5 && S.mc.lineEnds === 8, 'one head instead of four, five line ends instead of eight: ' + [S.m.markers, S.mc.markers, S.m.lineEnds, S.mc.lineEnds]);
  // Composition: one diamond at the whole, a plain T (no join dot), never a four-way split (bundleIntegrity).
  const Cm = fan('composes', 3, 'out');
  assert.ok(Cm.L.bundles.length === 1 && Cm.L.bundles[0].end === 'from' && Cm.L.bundles[0].dotted === false, 'a whole composed of three parts: one bundle from the whole, undotted');
  assert.ok(Cm.m.markers === 1 && Cm.mc.markers === 3, 'one diamond instead of three');
  // Different styles stay apart: weak and plain serves to one component never share a line.
  const W = fan('serves', 4, 'in', i => ({weak: i % 2 === 1}));
  assert.ok(W.L.bundles.every(x => new Set(x.members.map(id => !!W.L.edges.find(e => e.id === id).weak)).size === 1) && W.m.markers >= 2, 'a weak and a plain serves never share a line (' + W.L.bundles.length + ' bundles, ' + W.m.markers + ' heads)');
  // One fact recorded twice: one line, both records kept, one head.
  const T = lay(['a', 'b'], [rel('f1', 'a', 'b', 'serves'), rel('f2', 'a', 'b', 'serves')]);
  assert.ok(T.L.bundles.length === 1 && T.L.bundles[0].end === 'both' && T.L.bundles[0].joins.length === 0 && T.L.bundles[0].runs.length === 1, 'one fact recorded twice: one bundle of both ends');
  assert.ok(JSON.stringify(T.L.edges[0].pts) === JSON.stringify(T.L.edges[1].pts) && T.L.edges.length === 2 && T.m.markers === 1 && T.mc.markers === 2, 'drawn on one route with one head; both records keep their own edge');
  pass(`a bundle as the engine lays it: four serves to one component leave one port by one root run (root ${b.root} px, ${b.joins.length} joins), each member keeps its whole route, one head instead of four; a composition fan draws one diamond with a plain T; weak and plain never share a line; one fact recorded twice is one line with one head and both records`);
}

// Round 10 · exclusions (N3): no join where it would imply a fork, a merge or a gateway, and no bundle in the arrangements
// and pictures that never bundle. Each is tested on its own.
{
  const {fan, lay, rel, scene} = synth, none = (X, why) => assert.equal(X.L.bundles.length, 0, why + ': ' + JSON.stringify(X.L.bundles.map(b => b.id)));
  assert.ok(fan('serves', 3, 'out').L.bundles.length === 1, 'the same fan of serves does bundle');
  for (const kind of ['flow', 'transforms', 'sequence', 'transition', 'message', 'path', 'selects']) { none(fan(kind, 3, 'out'), 'a fan of ' + kind); none(fan(kind, 3, 'in'), 'a fan into one element of ' + kind); }
  for (const [mark, extra] of [['a numbered step', i => (i ? {} : {step: '1'})], ['a cardinality', i => (i ? {} : {cardinality: '1 : n'})], ['a crossing mark', i => (i ? {} : {crossing: true})]]) {
    const X = fan('serves', 3, 'in', extra);
    assert.ok(X.L.bundles.every(b => !b.members.includes('r0')) && !('bundle' in X.L.edges[0]), mark + ' never joins a bundle');
  }
  const self = lay(['a', 'b', 'c'], [rel('s', 'a', 'a', 'serves'), rel('t', 'a', 'a', 'serves'), rel('u', 'b', 'c', 'serves')]);
  assert.ok(self.L.edges.every(e => !('bundle' in e)), 'a relationship to itself never joins a bundle');
  // rc41 (W1; PLAN §2 W1.5): a fan-out whose relationships carry one qualifier is one bundle with the qualifier written once
  // at its root, the others hidden at its place (was: no fan-out of qualified relationships); with different qualifiers
  // there is still none.
  { const R = fan('serves', 3, 'out', () => ({qualifier: 'REST'})), written = R.L.edges.filter(e => !e.qualifierHidden);
    assert.ok(R.L.bundles.length === 1 && R.L.bundles[0].end === 'from' && R.L.edges.every(e => e.bundle === R.L.bundles[0].id) && written.length === 1 && R.L.edges.filter(e => e.qualifierHidden).every(e => e.qx === written[0].qx && e.qy === written[0].qy), 'a fan-out of one qualifier is one bundle, its qualifier written once at the root: ' + JSON.stringify(R.L.edges.map(e => [e.id, e.bundle, !!e.qualifierHidden, e.qx, e.qy]))); }
  none(fan('serves', 3, 'out', i => ({qualifier: 'q' + i})), 'a fan-out whose relationships carry different qualifiers');
  const Q = fan('serves', 3, 'in', i => ({qualifier: 'q' + i}));
  assert.ok(Q.L.bundles.length === 1 && Q.L.edges.every(e => e.qualifier), 'a fan-in keeps its qualifiers, each at its own source');
  const F = lay(['a', 'b'], [rel('f1', 'a', 'b', 'flow'), rel('f2', 'a', 'b', 'flow')]);
  assert.ok(F.L.bundles.length === 1 && F.L.bundles[0].end === 'both', 'two records of one flow may be one line (no fork implied)');
  // Arrangements and pictures that never bundle (each the control exactly, section 1).
  const seq = notationLayout(notationDiagram(project, 'sequence'), {arrangement: 'sequence'});
  assert.ok(!seq.bundles.length && seq.consolidation.passes === 0, 'the sequence arrangement');
  const app = notationDiagram(project, 'application'), sol = notationDiagram(project, 'solution');
  assert.ok(notationLayout(app, {arrangement: 'tree'}).bundles.length > 0 && notationLayout(app, {arrangement: 'lanes'}).bundles.length === 0, 'the lanes arrangement (the same picture bundles in a tree)');
  assert.ok(notationLayout(sol, {arrangement: 'tree'}).bundles.length > 0 && notationLayout(sol, {arrangement: 'radial'}).bundles.length === 0, 'radial straight lines (the same picture bundles in a tree)');
  assert.equal(notationLayout(notationDiagram(project, 'process'), {arrangement: 'tree'}).bundles.length, 0, 'a BPMN process picture, in any arrangement');
  const seqScene = lay(['a', 'b', 'c', 'd'], [rel('m1', 'b', 'a', 'serves'), rel('m2', 'c', 'a', 'serves'), rel('m3', 'd', 'a', 'serves')], {scene: {...scene, id: 'sequence'}});
  none(seqScene, 'a sequence picture, in any arrangement');
  pass('exclusions, each on its own: no fan of flow, transforms, sequence, transition, message, path or selects relationships; a numbered step, a cardinality, a crossing mark and a relationship to itself never join a bundle; no fan-out of relationships with different qualifiers, one of a shared qualifier writing it once (a fan-in keeps its qualifiers); two records of one flow may be one line; none in the sequence or lanes arrangement, radial straight lines, a BPMN process or a sequence picture, nor a picture drawn straight (section 5b)');
}

// Round 10 · against the control (N3): every default picture of the reference project draws no more marks, line ends or
// ink than its control in the same run (section 1); together they draw at least 15% fewer distinct crossing points, and
// the five fan-heavy pictures at least 40% fewer marks.
{
  const tot = (side, k) => Object.values(drawnDefaults).reduce((t, x) => t + x[side][k], 0);
  const vc = tot('m', 'visualCrossings'), vcc = tot('mc', 'visualCrossings'), mk = tot('m', 'markers'), mkc = tot('mc', 'markers'), ink = tot('m', 'ink'), inkc = tot('mc', 'ink');
  assert.ok(vc <= 0.85 * vcc, `distinct crossing points ${vc} against ${vcc} in the control (at least 15% fewer)`);
  const named = {};
  for (const sc of ['solution', 'stack', 'motivation', 'rationale', 'drivers']) { const {m, mc} = drawnDefaults[sc]; named[sc] = [mc.markers, m.markers]; assert.ok(m.markers <= 0.6 * mc.markers, `${sc}: marks ${m.markers} against ${mc.markers} in the control (at least 40% fewer)`); }
  metrics.againstControl = {markers: [mkc, mk], visualCrossings: [vcc, vc], ink: [inkc, ink], named};
  pass(`against the in-run control, the reference defaults draw ${mk} marks for ${mkc}, ${vc} distinct crossing points for ${vcc} and ${ink} px of ink for ${inkc}; marks fall by at least 40% on ${Object.entries(named).map(([k, [a, b]]) => `${k} ${a}→${b}`).join(', ')}`);
}

// Round 10 · bundle-aware words (N4): one word per drawn line. A fan-in writes its word once beside the run where its
// lines arrive; a fan-out once beside its root at the source; two records of one fact once, and one qualifier. A fan-in
// keeps each member's qualifier at its own source. The source-side fold still writes a fan of lines outside a bundle
// once, and never hides a bundle's word. On the reference project the defaults write fewer words than their control;
// the lifecycle's IF-00x words are unchanged; the Running board hides every serving word and its other bundles write one.
{
  const {fan, lay, rel} = synth, shown = L => L.edges.filter(e => (e.label || e.step) && !e.labelHidden);
  const beside = (w, pts) => segsIn(pts).some(sg => boxToSeg(w.labelBox, sg) <= WORD_NEAR);
  // Four serves into one component, each with its word: one word beside the root run, three carrying its place.
  const S = fan('serves', 4, 'in', () => ({label: 'serves'})), sb = S.L.bundles[0], sw = shown(S.L);
  assert.ok(S.L.bundles.length === 1 && sw.length === 1 && sw[0].id === 'r0' && shown(S.Lc).length === 4 && S.m.words === 1 && S.mc.words === 4, 'four serves into one component write one word (the control four): ' + sw.map(e => e.id));
  assert.ok(beside(sw[0], sb.runs.find(r => r.root).pts), 'the word stands beside the root run, where the lines arrive: ' + JSON.stringify(sw[0].labelBox));
  assert.ok(S.L.edges.slice(1).every(e => e.labelHidden && e.lx === sw[0].lx && e.ly === sw[0].ly), 'the other three carry its place, hidden');
  // A fan-out: one word beside its root at the source (the control already folds it to one).
  const O = fan('serves', 3, 'out', () => ({label: 'serves'})), ow = shown(O.L);
  assert.ok(O.L.bundles.length === 1 && ow.length === 1 && beside(ow[0], O.L.bundles[0].runs.find(r => r.root).pts), 'a fan-out writes one word beside its root: ' + JSON.stringify(ow.map(e => e.labelBox)));
  // A fan-in whose members carry qualifiers, two of them records of one fact: each qualifier at its own source, the
  // second record hiding its own at the first's place; one word.
  const Q = lay(['hub', 'a', 'b', 'c'], [rel('t1', 'a', 'hub', 'serves', {label: 'serves', qualifier: 'x'}), rel('t2', 'a', 'hub', 'serves', {label: 'serves', qualifier: 'x'}), rel('t3', 'b', 'hub', 'serves', {label: 'serves', qualifier: 'y'}), rel('t4', 'c', 'hub', 'serves', {label: 'serves', qualifier: 'z'})]);
  const q = id => Q.L.edges.find(e => e.id === id);
  assert.ok(Q.L.bundles.length === 1 && Q.L.bundles[0].end === 'to' && Q.L.bundles[0].members.length === 4 && shown(Q.L).length === 1, 'a fan-in of four qualified serves (two records of one fact): one bundle, one word');
  assert.ok(q('t2').qualifierHidden === true && q('t2').qx === q('t1').qx && q('t2').qy === q('t1').qy && !q('t1').qualifierHidden && !q('t3').qualifierHidden && !q('t4').qualifierHidden, 'the second record hides its qualifier at the first’s place; the others write theirs');
  // Its own line at its source: its branch starts there, or, for the two records riding one branch, the far end of the
  // run they share (runs run away from the shared end).
  const ownStart = e => { const p = e.pts[0], far = Q.L.bundles[0].runs.find(r => r.far && r.members.includes(e.id)); return e.branch.length ? e.branch[0][0] === p[0] && e.branch[0][1] === p[1] : !!far && far.members.every(id => ['t1', 't2'].includes(id)) && far.pts.at(-1)[0] === p[0] && far.pts.at(-1)[1] === p[1]; };
  assert.ok(new Set(['t1', 't3', 't4'].map(id => q(id).qx + ',' + q(id).qy)).size === 3 && ['t1', 't2', 't3', 't4'].every(id => ownStart(q(id))), 'each member’s qualifier at its own source, on its own line: ' + JSON.stringify(Q.L.edges.map(e => [e.id, e.branch])));
  // Two records of one flow with a word and a qualifier: one line, one word, one qualifier.
  const F = lay(['a', 'b'], [rel('f1', 'a', 'b', 'flow', {label: 'Check', qualifier: 'REST'}), rel('f2', 'a', 'b', 'flow', {label: 'Check', qualifier: 'REST'})]);
  assert.ok(F.L.bundles[0]?.end === 'both' && shown(F.L).map(e => e.id).join() === 'f1' && F.L.edges[1].qualifierHidden === true && !F.L.edges[0].qualifierHidden, 'two records of one flow: one word and one qualifier, both from the first record');
  // The source-side fold: a fan of flows from one element (never bundled) writes its word once, as before.
  const FL = fan('flow', 3, 'out', () => ({label: 'Event'}));
  assert.ok(FL.L.bundles.length === 0 && shown(FL.L).length === 1 && JSON.stringify(FL.L) === JSON.stringify(FL.Lc), 'a fan of flows from one element still writes its word once, exactly as without bundles');
  // The fold never hides a bundle's word: a line from a to x and a fan-in at hub that a joins with the same word.
  const U = lay(['hub', 'a', 'b', 'x'], [rel('u', 'a', 'x', 'serves', {label: 'serves'}), rel('s1', 'a', 'hub', 'serves', {label: 'serves'}), rel('s2', 'b', 'hub', 'serves', {label: 'serves'})]);
  assert.ok(U.L.bundles.length === 1 && U.L.bundles[0].members.join() === 's1,s2' && shown(U.L).map(e => e.id).join() === 'u,s1' && shown(U.Lc).map(e => e.id).join() === 'u,s2', 'a line outside the bundle writes its word, and the bundle writes its own (the fold no longer hides s1): ' + shown(U.L).map(e => e.id));
  // The reference project's defaults (section 1): fewer words than the control; one 'delivers' at OUT-001.
  const tot = side => Object.values(drawnDefaults).reduce((t, x) => t + x[side].words, 0), wd = tot('m'), wc = tot('mc'), named = {};
  assert.ok(wd <= 0.92 * wc, `the reference defaults write ${wd} words against ${wc} in the control (at least 8% fewer)`);
  for (const [sc, most] of [['motivation', 10], ['rationale', 9], ['solution', 14]]) { const {m, mc} = drawnDefaults[sc]; named[sc] = [mc.words, m.words]; assert.ok(m.words <= most && m.words < mc.words, `${sc}: ${m.words} words (control ${mc.words}, at most ${most})`); }
  const Dm = notationDiagram(project, 'motivation'), at = L => shown(L).filter(e => e.label === 'delivers' && e.to === 'OUT-001').length;
  const dl = at(notationLayout(Dm, {arrangement: 'tree'})), dlc = at(notationLayout(Dm, {arrangement: 'tree', consolidate: false}));
  assert.ok(dl === 1 && dlc >= 3, `'delivers' at OUT-001 is written once (${dl}; the control ${dlc} times)`);
  // The lifecycle: its IF-00x words unchanged, in the same places as the control.
  const Dl = notationDiagram(project, 'lifecycle'), said = L => shown(L).map(e => e.label + '@' + e.lx + ',' + e.ly).join(' '), lcw = said(notationLayout(Dl, {arrangement: Dl.scene.arrangement}));
  assert.ok(lcw === said(notationLayout(Dl, {arrangement: Dl.scene.arrangement, consolidate: false})) && /^IF-00\d@/.test(lcw) && lcw.split(' ').every(w => /^IF-00\d@/.test(w)), 'the lifecycle’s IF-00x words are unchanged: ' + lcw);
  // The Running board: every serving word hidden (desk-layout.js quiet), every other labelled bundle writes one.
  const B = boardLayout(runningBoard(deskModel(project))), raw = notationLayout(B.D, {arrangement: 'grouped'});
  assert.deepEqual(notationLayout(B.D, {arrangement: 'grouped', positionsOnly: true}).nodes, raw.nodes, 'the board ordering pass uses exactly the boxes of the full layout');
  assertWords(raw, 'running board before quiet');
  assert.ok(B.L.edges.filter(e => e.kind === 'serves').every(e => e.labelHidden) && raw.bundles.some(b => b.kind === 'serves'), 'the Running board hides every serving word, its serves bundles included');
  metrics.words = {defaults: [wc, wd], named, delivers: [dlc, dl], bundles: {...words}};
  pass(`bundle-aware words: a fan-in writes one word beside the run where its lines arrive, a fan-out one beside its root, two records of one fact one word and one qualifier; a fan-in keeps each member's qualifier at its own source on its own branch; the fold still writes a fan of flows once and never hides a bundle's word; the reference defaults write ${wd} words for ${wc} (${Object.entries(named).map(([k, [a, b]]) => `${k} ${a}→${b}`).join(', ')}; 'delivers' at OUT-001 ${dlc}→${dl}); the lifecycle's words are unchanged; the Running board hides every serving word. Across the layouts checked so far: ${words.labelled} labelled bundles each write one word (${words.onRoot} beside the root run, ${words.onRun} beside another run, ${words.onBranch} beside the writer's branch), ${words.hidden} members carry it hidden, ${words.qualifierHidden} of ${words.qualifiers} bundled qualifiers hidden as second records`);
}

// Round 10 · the Running board (N3): its 28 serving lines meet five components; bundled at the component end they draw at
// most 18 heads (38 without bundles) and at least 25% fewer crossing points, with the relationship counts unchanged.
{
  const {D, L} = boardLayout(runningBoard(deskModel(project))), Lc = notationLayout(D, {arrangement: 'grouped', consolidate: false});
  const {m, mc} = assertBundles(D, L, Lc, 'running board', {quiet: 'serves'}), kinds = {}; for (const e of L.edges) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
  assert.deepEqual(kinds, {realizes: 5, fulfils: 5, serves: 28}, 'every relationship drawn');
  assert.ok(m.markers <= 18 && mc.markers === 38, 'heads ' + m.markers + ' (control ' + mc.markers + ')');
  assert.ok(m.visualCrossings <= 0.75 * mc.visualCrossings, 'crossing points ' + m.visualCrossings + ' (control ' + mc.visualCrossings + ')');
  metrics.runningBoard = {markers: [mc.markers, m.markers], visualCrossings: [mc.visualCrossings, m.visualCrossings], bundles: L.bundles.length};
  pass(`the Running board: ${m.markers} heads for ${mc.markers}, ${m.visualCrossings} crossing points for ${mc.visualCrossings}, realizes 5, serves 28, fulfils 5`);
}

// Round 10 · the Layers view (N3): every chapter's connected model by layer, bundled under the same checks within the
// Layers budget (under 900 ms, and at most three times its own control plus 100 ms: each timed as the quickest of three
// rounds, the control and the picture in turn, so a slow moment on a shared machine slows both); a picture that falls
// back says why; at most three fall back.
{
  const timed = f => { const t = performance.now(), out = f(); return [out, performance.now() - t]; };
  const rows = [];
  for (let ch = 1; ch <= 11; ch++) {
    const full = notationDiagram(project, 'connected', {chapter: ch}); if (!full?.nodes.length) continue;
    const counts = Object.fromEntries(['process', 'logical', 'physical', 'data', 'technology', 'interface', 'security', 'deployment'].map(l => [l, full.nodes.filter(n => n.layer === l).length])), every = {counts, none: 'none in this chapter'};
    let Lc, L, tc = Infinity, ta = Infinity;
    for (let i = 0; i < 3; i++) { const [c, t1] = timed(() => notationLayout(full, {arrangement: 'by-layer', every, consolidate: false})), [a, t2] = timed(() => notationLayout(full, {arrangement: 'by-layer', every})); Lc = c; L = a; tc = Math.min(tc, t1); ta = Math.min(ta, t2); }
    assertBundles(full, L, Lc, 'Layers chapter ' + ch);
    assert.ok(ta < 900, `Layers chapter ${ch}: ${Math.round(ta)} ms`);
    // (plus 100 ms: a small picture is timed in tens of milliseconds, where the ratio alone is noise on a shared machine)
    assert.ok(ta <= 3 * tc + 100, `Layers chapter ${ch}: ${Math.round(ta)} ms, more than three times its control (${Math.round(tc)} ms) plus 100 ms`);
    if (L.consolidation.fallback) assert.ok(L.consolidation.why.length && ['duplicates', 'none'].includes(L.consolidation.fallback), 'Layers chapter ' + ch + ': the fallback says why');
    rows.push({ch, ms: Math.round(ta), control: Math.round(tc), bundles: L.bundles.length, fallback: L.consolidation.fallback, why: L.consolidation.why.at(-1) || ''});
  }
  const fallbacks = rows.filter(r => r.fallback);
  assert.ok(fallbacks.length <= 3, 'at most three Layers pictures fall back: ' + JSON.stringify(fallbacks));
  metrics.layers = rows;
  pass(`the Layers view, chapters ${rows[0].ch}–${rows.at(-1).ch}: every bundle valid, each under 900 ms and within three times its control (slowest ${Math.max(...rows.map(r => r.ms))} ms), ${fallbacks.length} fall back and say why (${fallbacks.map(r => 'chapter ' + r.ch + ': ' + r.fallback).join('; ') || 'none'})`);
}

// Round 10 · one fact recorded twice (N3): Chapter 4's connected model records 12 facts twice (fulfils 5, flow 4, owns 3).
// Each is drawn once, both records on one route in one bundle, each record keeping its own edge; the flows, which never
// fan, are bundles of both ends.
{
  const D = notationDiagram(project, 'connected', {chapter: 4}), L = notationLayout(D, {arrangement: 'by-layer'});
  const key = e => [e.from, e.to, e.kind, e.label || '', e.ends || '', e.weak ? 1 : 0, e.reply ? 1 : 0, e.change || '', e.qualifier || ''].join('|'), groups = new Map();
  for (const e of L.edges) { if (!groups.has(key(e))) groups.set(key(e), []); groups.get(key(e)).push(e); }
  const pairs = [...groups.values()].filter(g => g.length > 1), kinds = {}; for (const g of pairs) kinds[g[0].kind] = (kinds[g[0].kind] || 0) + 1;
  assert.deepEqual(kinds, {fulfils: 5, flow: 4, owns: 3}, 'Chapter 4 records 12 facts twice');
  for (const g of pairs) {
    assert.ok(g.every(e => JSON.stringify(e.pts) === JSON.stringify(g[0].pts) && e.bundle && e.bundle === g[0].bundle) && new Set(g.map(e => e.id)).size === g.length, g[0].kind + ' ' + g[0].from + '→' + g[0].to + ': drawn once, in one bundle, each record its own edge');
    if (g[0].kind === 'flow') assert.equal(L.bundles.find(b => b.id === g[0].bundle).end, 'both', 'a flow recorded twice is a bundle of both ends');
  }
  const both = L.bundles.filter(b => b.end === 'both').length;
  metrics.duplicatesChapter4 = {pairs: pairs.length, both, inFans: pairs.length - both};
  pass(`one fact recorded twice: Chapter 4's 12 (fulfils 5, flow 4, owns 3) are each drawn once on one route in one bundle (${both} bundles of both ends, ${pairs.length - both} as two records riding one branch of a fan), every record keeping its own edge`);
}

// Round 10 · determinism (N3): the bundled layouts are the same in a second Node process, and the engine reads no
// environment (no process.env, no globalThis tuning; its tuning is the frozen BUNDLE).
{
  const digest = () => { const h = createHash('sha256'); for (const s of SCENES) { const D = notationDiagram(project, s.id); h.update(JSON.stringify(notationLayout(D, {arrangement: D.scene.arrangement}))); } h.update(JSON.stringify(notationLayout(notationDiagram(project, 'connected', {chapter: 4}), {arrangement: 'by-layer'}))); return h.digest('hex'); };
  const mine = digest();
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `import {createHash} from 'node:crypto'; import {referenceProject} from './notation-fixtures.mjs'; import {notationDiagram, SCENES} from './public/notation-model.js'; import {notationLayout} from './public/notation-layout.js'; const project = referenceProject(); const h = createHash('sha256'); for (const s of SCENES) { const D = notationDiagram(project, s.id); h.update(JSON.stringify(notationLayout(D, {arrangement: D.scene.arrangement}))); } h.update(JSON.stringify(notationLayout(notationDiagram(project, 'connected', {chapter: 4}), {arrangement: 'by-layer'}))); console.log(h.digest('hex'));`], {cwd: import.meta.dirname, encoding: 'utf8'});
  assert.equal(child.status, 0, child.stderr); assert.equal(child.stdout.trim(), mine, 'the same layouts in a second process');
  const source = readFileSync(new URL('./public/notation-layout.js', import.meta.url), 'utf8');
  assert.ok(!/process\.env/.test(source) && !/globalThis/.test(source) && Object.isFrozen(BUNDLE), 'no environment read and frozen tuning');
  pass(`determinism: every default picture and Chapter 4 by layer are byte-identical in a second Node process (sha256 ${mine.slice(0, 12)}…); the engine reads no environment and its tuning (BUNDLE) is frozen`);
}

console.log(JSON.stringify({suite: 'standard diagrams (arrangement)', passed: checks.length, checks, metrics, bundled, constants: NL, bundle: BUNDLE}, null, 2));
