// User-visible contracts for relationship exploration and the dense Layers default.
// Mount the native notation renderer and its real controls; no substitute graph or UI is used.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {referenceProject} from './notation-fixtures.mjs';
import {notationScenes, notationDiagram} from './public/notation-model.js';
import {notationLayout, SCREEN_STAGE, charW} from './public/notation-layout.js';
import {viewpointBand, layerCounts, connectionLevelOf, defaultConnectionLevel, levelRank, viewpointProjection, viewpointGroupKeys, layerOverview, VIEW_BANDS} from './public/layers-view.js';
import {foldDiagram} from './public/figure-budget.js';
import {notationSVG} from './public/notation-svg.js';
import {corridorMetrics} from './notation-metrics.mjs';
import {revealOrder} from './notation-reveal-order.mjs';
import {KINDS} from './public/notation-palette.js';

const window = new Window({url: 'http://fixture.local/?chapter=5&tab=model'});
Object.assign(globalThis, {window, document: window.document, location: window.location, localStorage: window.localStorage, CSS: window.CSS, CustomEvent: window.CustomEvent, AbortController: window.AbortController,
  requestAnimationFrame: cb => window.requestAnimationFrame(cb), cancelAnimationFrame: id => window.cancelAnimationFrame(id)});
const {modelStage, toolsHTML} = await import('./public/model-stage.js');
const {createNotation, nodeLinesHTML} = await import('./public/notation-view.js');
const {traceFrom} = await import('./public/model-matrix.js');
const p = referenceProject(), before = JSON.stringify(p); let writes = 0;
window.aiwProjectStore = {value: {document: p}, command: () => writes++};
const captures = process.env.AIW_DIAGRAM_QA_DIR;
if (captures) await mkdir(captures, {recursive: true});
const capture = async (name, notation) => { if (captures) await writeFile(`${captures}/${name}.svg`, notationSVG(notation.diagram(), notation.layout(), {key: false, notes: true})); };

function mount(chapter, scene, preservePreferences = false) {
  if (!preservePreferences) localStorage.clear();
  const root = document.createElement('section'); root.className = 'cm nt-active';
  root.innerHTML = `<div class="cm-top"><div class="cm-views"></div></div><div class="cm-bar"><div class="cm-lenses"></div></div><div class="cm-stage" tabindex="0"><div class="cm-world"><svg class="cm-svg"></svg><div class="cm-html"></div></div><div class="cm-heads"><div class="cm-heads-in"></div></div><div class="cm-rail"><div class="cm-rail-in"></div></div><div class="cm-corner"></div></div><div class="cm-walk"><p class="cm-state"></p>${toolsHTML('test')}</div>`;
  document.body.append(root);
  const svg = root.querySelector('.cm-svg'), viewport = root.querySelector('.cm-stage');
  Object.defineProperties(viewport, {clientWidth: {value: 1200}, clientHeight: {value: 720}});
  // Happy DOM's HTML parser loses SVG content after <style>; preserve the browser's SVG namespace.
  Object.defineProperty(svg, 'innerHTML', {get() {return [...this.childNodes].map(n => new window.XMLSerializer().serializeToString(n)).join('');}, set(markup) {const xml = new window.DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + markup + '</svg>', 'image/svg+xml'); this.replaceChildren(...[...xml.documentElement.childNodes].map(n => document.importNode(n, true)));}});
  const stage = modelStage(root, {headHeight: () => 0, railWidth: () => 0}); stage.bind();
  let primary = null;
  const notation = createNotation({chapter, root, stage, project: () => p, onSelect: id => {primary = id; render();}});
  if (scene) notation.state.scene = scene;
  function render(view = null) {const layout = notation.render({sel: primary, view}); root.querySelector('.cm-lenses').innerHTML = notation.barHTML(); stage.use(layout, notation.state.view + '|' + notation.arrangement()); stage.apply();}
  notation.onChange = () => render(); notation.bindDrag();
  root.addEventListener('click', e => {if (notation.handle(e)) return; const node = e.target.closest('.nt-node'); if (node) {primary = node.dataset.ntNode; render();}});
  root.addEventListener('change', e => notation.change(e)); root.addEventListener('keydown', e => notation.keydown(e));
  render();
  return {root, svg, stage, notation, render, select(id) {primary = id; render();}, mode(id) {const button = root.querySelector(`[data-nt="connections"][data-id="${id}"]`); assert.ok(button && !button.disabled, id + ' is available'); button.click();}, close() {stage.dispose(); root.remove();}};
}
const visible = fixture => [...fixture.svg.querySelectorAll('.nt-edge[data-nt-edge]:not(.nt-connection-hidden)')].map(e => e.dataset.ntEdge).sort();
// Connection controls must preserve the complete projection, layout and camera: a reader is
// progressively revealing evidence, not requesting a different graph or a new arrangement.
const geometry = F => JSON.stringify({nodes: F.notation.layout().nodes, groups: F.notation.layout().groups, bands: F.notation.layout().bands, edges: F.notation.layout().edges});
const camera = F => JSON.stringify(F.stage.cam);
const frame = () => new Promise(resolve => window.requestAnimationFrame(resolve));
// rc41 (W1): `levelIds` (a stepped level's own paths) — Reveal next fills the level before it adds a path beyond it.
// rc41 close (C33): `order` (the level's own paths, then the paths beyond it, in the round-robin order over the relation
// roles: notation-reveal-order.mjs) — the paths shown at every step are exactly the first ones of that order.
const revealAll = async (F, levelIds = null, order = null) => {
  const initial = geometry(F), cam = camera(F); let previous = visible(F), steps = 0;
  const packet = F.notation.explain(); assert.deepEqual(packet.nodes.map(n => n.id).sort(), F.notation.diagram().nodes.map(n => n.id).sort(), 'assistant reads exactly the current projection'); assert.deepEqual(packet.connectionVisibility.visiblePathIds.sort(), previous, 'assistant knows exactly which paths the user sees');
  if (order) assert.deepEqual(previous, order.slice(0, previous.length).sort(), 'the level opens with the first paths of its round-robin order');
  while (F.root.querySelector('[data-nt="connections-more"]')) {
    const previousIds = new Set(previous), before = previous.length, total = F.notation.diagram().edges.length;
    F.root.querySelector('[data-nt="connections-more"]').click();
    previous = visible(F);
    assert.ok([...previousIds].every(id => previous.includes(id)), 'incremental reveal is monotonic');
    assert.equal(previous.length, Math.min(total, before + 6), 'Reveal next adds six paths, or the exact remaining amount');
    if (levelIds) { const inLevel = previous.filter(id => levelIds.has(id)).length; assert.ok(inLevel === levelIds.size || inLevel === previous.length, `Reveal next fills the level before it goes beyond it (${inLevel} of ${levelIds.size} level paths, ${previous.length} shown)`); }
    if (order) assert.deepEqual(previous, order.slice(0, previous.length).sort(), `Reveal next adds the next paths of the round-robin order (${previous.length} shown)`);
    assert.equal(geometry(F), initial, 'incremental reveal preserves every object and route');
    assert.equal(camera(F), cam, 'incremental reveal preserves the camera');
    assert.ok(++steps < 100, 'incremental reveal terminates');
    await frame();
  }
  assert.deepEqual(previous, F.notation.diagram().edges.map(e => e.id).sort(), 'progressive reveal reaches every path of the same projection');
};
const assertPending = F => {
  const shown = new Set(visible(F)), D = F.notation.diagram();
  for (const n of D.nodes) {
    // rc41 (W1; PLAN §2 W1.6): the badge stands only on an element with hidden neighbours and counts them — the elements
    // it is related to by a hidden path and by no shown one (was: every hidden path counted at both its ends).
    const touching = D.edges.filter(e => e.from === n.id || e.to === n.id), other = e => (e.from === n.id ? e.to : e.from);
    const linked = new Set(touching.filter(e => shown.has(e.id)).map(other)), pending = new Set(touching.filter(e => !shown.has(e.id)).map(other).filter(o => !linked.has(o))).size;
    const node = [...F.svg.querySelectorAll('.nt-node')].find(g => g.dataset.ntNode === n.id);
    assert.equal(node.querySelector('.nt-pending text')?.textContent || '', pending ? '+' + pending : '', 'each element with hidden neighbours says exactly how many');
    if (pending) {
      assert.match(node.getAttribute('aria-label'), new RegExp(`${pending} connected elements? not yet shown connected`));
      const mark = node.querySelector(':scope > .nt-mk-badge'), bx = F.notation.layout().nodes.find(b => b.id === n.id), [px, py] = node.querySelector('.nt-pending').getAttribute('transform').match(/-?[\d.]+/g).map(Number);
      if (mark) assert.ok(px >= 84 - 9 || py + 15 <= bx.h - 9 || py >= bx.h + 9, n.id + ': the "+N" badge keeps clear of the state mark at the bottom-left corner');
      const box = F.notation.layout().nodes.find(b => b.id === n.id), badge = node.querySelector('.nt-pending');
      const [x, y] = badge.getAttribute('transform').match(/-?[\d.]+/g).map(Number), bounds = {x: box.x + x, y: box.y + y, w: 34, h: 15};
      for (const edge of F.notation.layout().edges) if (edge.labelBox && !edge.labelHidden) { const a = edge.labelBox; assert.ok(bounds.x + bounds.w <= a.x || a.x + a.w <= bounds.x || bounds.y + bounds.h <= a.y || a.y + a.h <= bounds.y, 'pending counts cannot cover current or later-revealed relationship labels'); }
    }
  }
};
const cases = [];
for (let chapter = 1; chapter <= 11; chapter++) {
  const F = mount(chapter);
  for (const scene of notationScenes(chapter)) {
    F.notation.state.scene = scene.id; F.render();
    // rc40 (W1): the control steps None · Structure · Adjacent · All, with Selected beside them (was Overview · Selected · All · None).
    assert.deepEqual([...F.root.querySelectorAll('[data-nt="connections"]')].map(b => b.textContent), ['None', 'Structure', 'Adjacent', 'All', 'Selected'], `Chapter ${chapter}/${scene.id}: consistent controls`);
    const gaps = F.svg.querySelectorAll('[data-nt-gap-members]');
    const shownPaths = new Set(visible(F));
    for (const gap of gaps) assert.equal(gap.getAttribute('fill'), JSON.parse(gap.dataset.ntGapMembers).some(id => shownPaths.has(id)) ? '#000' : '#fff', 'hidden crossings cannot punch holes in a visible route');
    const initial = geometry(F), cam = camera(F), ordered = ['process', 'sequence', 'lifecycle'].includes(F.notation.diagram().scene.id);
    if (ordered) assert.equal(visible(F).length, F.notation.diagram().edges.length, 'ordered notation retains the complete sequence by default');
    else {
      // rc40 (W1): the picture opens at its default level (Adjacent when it spans role levels, else All) and shows exactly
      // that level's paths (was: at most six paths); under a stepped level every hidden degree is counted on its element.
      // rc41 (W1): a stepped level whose own paths exceed the budget of 12 opens with exactly 12 of them (was: all of them),
      // the caption, the Key and Sol's packet saying how many more the level holds; a level within the budget shows every one.
      const D0 = F.notation.diagram(), level = defaultConnectionLevel(D0), levels = connectionLevelOf(D0), expected = D0.edges.filter(e => levelRank(levels.get(e.id)) <= levelRank(level)).map(e => e.id).sort();
      assert.equal(F.root.querySelector('[data-nt="connections"][aria-pressed="true"]')?.dataset.id, level, `Chapter ${chapter}/${scene.id}: opens at its default level`);
      const shown = visible(F), budget = level === 'all' ? expected.length : Math.min(12, expected.length), levelSet = new Set(expected);
      assert.ok(shown.length === budget && shown.every(id => levelSet.has(id)), `Chapter ${chapter}/${scene.id}: the ${level} level opens with ${budget} of its ${expected.length} paths, all its own (${shown.length} shown)`);
      if (level === 'all' || expected.length <= 12) assert.deepEqual(shown, expected, `Chapter ${chapter}/${scene.id}: the ${level} level shows exactly its paths`);
      // rc41 close (C33): which paths a budgeted level opens with is pinned exactly (was: 12 of its paths, any 12, since the
      // exact set above holds only within the budget): the first 12 of the level's own paths in the round-robin order over
      // its relation roles, in the scene's preferred families (notation-reveal-order.mjs restates the W1 rule), so every
      // role the level holds opens with a path while the budget reaches.
      if (level !== 'all') {
        const R = revealOrder(D0, {scene: scene.id, level});
        assert.deepEqual([...R.inLevel].sort(), expected, `Chapter ${chapter}/${scene.id}: the reveal order holds exactly the level's paths`);
        assert.equal(R.levelRoles.reduce((n, g) => n + g.ids.length, 0), expected.length, `Chapter ${chapter}/${scene.id}: each relation role is wholly inside the level or wholly beyond it`);
        const opened = new Set(shown), unopened = R.levelRoles.slice(0, budget).filter(g => !g.ids.some(id => opened.has(id))).map(g => g.key);
        assert.deepEqual(unopened, [], `Chapter ${chapter}/${scene.id}: the ${level} level opens with a path of each of its first ${Math.min(budget, R.levelRoles.length)} relation roles`);
        assert.deepEqual(shown, R.inLevel.slice(0, budget).sort(), `Chapter ${chapter}/${scene.id}: the ${level} level opens with the first ${budget} of its ${expected.length} paths in the round-robin order over its relation roles`);
      }
      if (level !== 'all') {
        const cv = F.notation.explain().connectionVisibility, more = expected.length - budget, beyond = D0.edges.length - expected.length;
        const caption = F.root.querySelector('.nt-connection-caption').textContent, words = more ? ` · ${more} more at this level` : beyond ? ` · ${beyond} beyond` : '';
        assert.equal(caption, `${budget} of ${D0.edges.length} links shown · ${level === 'adjacent' ? 'Adjacent' : 'Structure'}${words}`, `Chapter ${chapter}/${scene.id}: the caption counts the level`);
        assert.ok(cv.levelPaths === expected.length && cv.levelShown === budget && cv.moreAtLevel === more && cv.beyondLevel === beyond && cv.levelBudget === 12 && cv.caption === caption, `Chapter ${chapter}/${scene.id}: Sol's packet reads the same count: ${JSON.stringify(cv)}`);
        assert.ok(F.notation.legendHTML().includes(`<small>${budget} of ${D0.edges.length}${words}</small>`), `Chapter ${chapter}/${scene.id}: the Key reads the same count`);
        assertPending(F);
      }
    }
    F.mode('all');
    assert.deepEqual(visible(F), F.notation.diagram().edges.map(e => e.id).sort(), `Chapter ${chapter}/${scene.id}: All exposes every exact current path`);
    assert.equal(geometry(F), initial); assert.equal(camera(F), cam);
    F.mode('none'); assert.equal(visible(F).length, 0);
    assert.equal(F.svg.querySelectorAll('.nt-hit:not(.nt-connection-hidden)').length, 0, 'hidden paths cannot intercept pointers');
    assert.equal(F.svg.querySelectorAll('.nt-hit[tabindex="0"]').length, 0, 'hidden paths are not keyboard stops');
    assert.equal(geometry(F), initial); assert.equal(camera(F), cam);
    { const D1 = F.notation.diagram(), lv = connectionLevelOf(D1), R1 = ordered ? null : revealOrder(D1, {scene: scene.id, level: 'adjacent'}); F.mode('adjacent'); await revealAll(F, ordered ? null : new Set(D1.edges.filter(e => levelRank(lv.get(e.id)) <= levelRank('adjacent')).map(e => e.id)), R1 && [...R1.inLevel, ...R1.beyond]); }
    assert.equal(F.svg.querySelectorAll('.nt-hit[tabindex="0"]').length, F.notation.layout().edges.length, 'all restored paths are accessible');
    await frame();
  }
  F.close();
}
cases.push('Every offered viewpoint in all 11 chapters has stable None/Structure/Adjacent/All/Selected controls and opens at its default level showing that level’s paths, at most 12 of them at first (the caption, the Key and Sol’s packet counting the rest); Reveal next (six at a time, inside the level first, then beyond it) preserves objects, routes and camera, with exact hidden-degree counts. Ordered notations retain their sequence.');

for (const [chapter, scene] of [[5, 'application'], [6, 'solution'], [7, 'stack']]) {
  const F = mount(chapter, scene), D = F.notation.diagram(), full = F.notation.full();
  assert.equal(F.notation.folded(), null, 'a moderate structural viewpoint keeps its individually named records');
  assert.deepEqual(D.nodes.map(n => n.id).sort(), full.nodes.map(n => n.id).sort());
  assert.ok(D.viewLevels.length > 1); assert.equal(F.notation.arrangement(), 'layered');
  const levels = types => new Set(D.nodes.filter(n => types.includes(n.type)).map(n => n.level));
  if (scene === 'application') assert.equal([...levels(['responsibility'])].some(x => levels(['component']).has(x)), false, 'responsibility and realizing component never share a role band');
  if (scene === 'stack') assert.equal([...levels(['capability'])].some(x => levels(['technology']).has(x)), false, 'capability and its technology realization remain distinct');
  assertPending(F); await capture('diagram-' + scene, F.notation); F.close();
}
cases.push('Application, Solution and Technology defaults retain exact individually named source records and separate responsibilities/components and capabilities/realizations in meaningful role bands.');

const P = mount(5, 'application'); P.notation.state.arrangement = 'tree'; P.render();
const held = P.notation.layout().nodes[0]; P.select(held.id);
P.root.querySelector('[data-nt="menu"][data-id="arrange"]').click(); P.root.querySelector('[data-nt="pin-selection"]').click();
const box = P.notation.layout().nodes.find(n => n.id === held.id), pinned = JSON.stringify(P.notation.state.pins);
const preference = Object.keys(localStorage).find(k => k.includes('aiw-notation-v2-ch5'));
assert.ok(preference); const legacy = JSON.parse(localStorage.getItem(preference)); delete legacy.legacyPins; legacy.arrangement = null; localStorage.setItem(preference, JSON.stringify(legacy)); P.close();
const restored = mount(5, 'application', true);
assert.equal(restored.notation.arrangement(), 'tree', 'saved legacy positions retain their original arrangement');
restored.mode('adjacent'); restored.mode('structure'); restored.mode('all'); restored.mode('none');
assert.equal(JSON.stringify(restored.notation.state.pins), pinned);
const kept = restored.notation.layout().nodes.find(n => n.id === held.id);
assert.deepEqual([kept.x, kept.y], [box.x, box.y], 'legacy saved coordinates survive all visibility modes'); restored.close();
// A previous repository-layer arrangement remains at its exact coordinates until the user resets it.
const fullLayers = notationDiagram(p, 'connected', {chapter: 5}), oldLayout = notationLayout(fullLayers, {arrangement: 'by-layer', every: {counts: layerCounts(fullLayers), none: 'none in this chapter'}}), old = oldLayout.nodes[0];
localStorage.setItem(preference, JSON.stringify({pins: {'connected|by-layer': {[old.id]: {x: old.x, y: old.y}}}}));
const oldLayers = mount(5, 'application', true); oldLayers.render('layers');
assert.equal(oldLayers.notation.diagram().viewBands, undefined, 'legacy layer pins retain the compatible repository-band projection');
assert.deepEqual(oldLayers.notation.layout().pinned, [old.id]);
const oldRestored = oldLayers.notation.layout().nodes.find(n => n.id === old.id);
assert.deepEqual([oldRestored.x, oldRestored.y], [old.x, old.y]); oldLayers.close();
cases.push('Saved legacy scene and repository-layer positions retain their exact coordinates, arrangement and compatible projection; line visibility does not rewrite pins.');

const F = mount(5, 'application'); F.mode('all');
const D = F.notation.diagram(), leaf = D.nodes.map(n => ({id: n.id, degree: D.edges.filter(e => e.from === n.id || e.to === n.id).length})).filter(n => n.degree > 0 && n.degree < D.edges.length).sort((a, b) => a.degree - b.degree)[0];
const all = visible(F), prior = geometry(F); F.select(leaf.id);
assert.deepEqual(visible(F), all, 'holding an object does not quietly change All');
F.mode('neighbourhood');
assert.deepEqual(visible(F), D.edges.filter(e => e.from === leaf.id || e.to === leaf.id).map(e => e.id).sort());
assert.equal(geometry(F), prior, 'Selected changes connections only');
F.mode('all'); F.notation.state.edgeOff = ['realization']; F.render(); F.mode('all');
assert.deepEqual(F.notation.state.edgeOff, []); assert.deepEqual(visible(F), all); assert.equal(geometry(F), prior);
F.render('layers');
assert.ok(F.svg.querySelector(`.nt-node.sel[data-nt-node="${leaf.id}"]`), 'Layers retains a held architecture identity');
assert.equal(F.notation.state.focus.id, leaf.id);
const neighbourhood = geometry(F); F.mode('adjacent'); F.mode('all');
assert.equal(geometry(F), neighbourhood, 'line controls do not silently exit a focused scope');
F.root.querySelector('[data-nt="fold-group"]').click();
assert.ok(F.notation.diagram().layerSummary, 'the explicit scope breadcrumb returns to the concern overview');
const layers = F.notation.diagram(), source = F.notation.full();
assert.equal(layers.layerSummary.pairs.reduce((n, pair) => n + pair.count, 0), source.edges.length);
assert.deepEqual([...new Set(layers.fold.groups.flatMap(g => g.members))].sort(), source.nodes.map(n => n.id).sort(), 'every source record remains in a known type group');
for (const group of layers.fold.groups) {
  const members = source.nodes.filter(n => group.members.includes(n.id));
  assert.equal(new Set(members.map(n => n.type)).size, 1, 'no majority-kind aggregate merges different record roles');
  assert.equal(new Set(members.map(viewpointBand)).size, 1, 'each type group belongs to one explicit concern');
}
assert.ok(F.notation.layout().edges.length > 0, 'the initial Layers overview supports progressive paths immediately');
const overviewGeometry = geometry(F); assertPending(F); await revealAll(F); assert.equal(geometry(F), overviewGeometry);
F.mode('none'); F.mode('adjacent'); assert.equal(geometry(F), overviewGeometry);
assert.equal(F.notation.layout().bands.some(b => b.none), false);
await capture('layers-ch5', F.notation);
const group = F.notation.folded().groups.find(g => g.count > 1); assert.ok(F.notation.openGroup(group.key));
const picker = F.root.querySelector('[data-nt-field="lane-member"]'), memberIds = layers.fold.groups.find(g => g.key === group.key).members;
assert.deepEqual([...picker.options].map(o => o.value).filter(Boolean).sort(), [...memberIds].sort(), 'every individual record in the group is directly reachable');
const member = memberIds.at(-1); picker.value = member; picker.dispatchEvent(new window.Event('change', {bubbles: true}));
assert.equal(F.notation.state.focus.id, member);
assert.deepEqual(visible(F), source.edges.filter(e => e.from === member || e.to === member).map(e => e.id).sort());
F.root.querySelector('[data-nt="fold-group"]').click();
F.root.querySelector('[data-nt="fold-all"]').click(); F.mode('all');
assert.deepEqual(F.notation.diagram().nodes.map(n => n.id).sort(), source.nodes.map(n => n.id).sort());
assert.deepEqual(visible(F), source.edges.map(e => e.id).sort(), 'Show every element explicitly expands the source graph; All reveals its exact links');
F.close();
cases.push('Layers separates exact type groups by concern, preserves all source membership/index counts, reveals connections immediately on stable groups, offers explicit group/member/scope exploration, and expands source records only on request.');

for (const chapter of [1, 7]) {
  const A = mount(chapter); A.render('layers');
  const source = A.notation.full(), byId = new Map(source.nodes.map(n => [n.id, n]));
  for (const n of A.notation.diagram().nodes) {
    const types = (n.fold?.members || [n.id]).map(id => byId.get(id)?.type);
    if (types.some(t => ['requirement', 'decision', 'quality', 'constraint', 'assumption'].includes(t))) assert.equal(n.viewBand, 'motivation');
    if (types.some(t => ['actor', 'journey', 'event', 'gateway'].includes(t))) assert.equal(n.viewBand, 'business');
  }
  // rc39 (W2): a type group is a list box drawn by the shared renderer (its kind band, name, counts and members), never an
  // oversized process event or gateway glyph; a group of one is the record itself.
  const groupsDrawn = [...A.svg.querySelectorAll('.nt-node.nt-fold')];
  assert.ok(groupsDrawn.length > 0 && groupsDrawn.every(g => g.querySelector('.nt-li') && !g.querySelector('.nt-ev,.nt-gw')), 'type groups are list boxes with their members, never oversized process event/gateway glyphs');
  assert.equal(A.svg.querySelectorAll('.nt-node[data-nt-node^="fold:"]').length, A.notation.folded().groups.filter(g => g.count > 1).length, 'one list box per group of several; a group of one is its record');
  assert.match(A.notation.legendHTML(), /not additional ArchiMate core layers/);
  await capture('layers-ch' + chapter, A.notation); A.close();
}
cases.push('Motivation records and business behavior never share a misleading Process band; grouped events/gateways are list boxes of their type, and the Key distinguishes TOGAF, notation conventions and AIW concern extensions.');

const A = mount(5, 'application'); A.root.querySelector('[data-nt="menu"][data-id="arrange"]').click();
const arrange = A.root.querySelector('.nt-arrange-panel');
assert.equal(arrange.getAttribute('role'), 'dialog'); assert.ok(arrange.querySelector('[data-nt="smart-arrange"]'));
assert.equal(arrange.querySelectorAll('[data-nt="manual"]').length, 12);
// rc40 W2: the tools stand in the open in the docked panel; with nothing selected every one is disabled and says what to select.
assert.ok([...arrange.querySelectorAll('[data-nt="manual"]')].every(b => b.disabled && /Select (at least \d elements|an element)/.test(b.title)), 'unselected alignment, distribution and size tools are disabled, each saying what to select');
assert.match(arrange.querySelector('[data-nt="manual"][data-id="left"]').title, /Select at least 2/);
assert.ok(arrange.querySelector('[data-nt="arrange"][aria-pressed="true"]'));
assert.ok([...arrange.querySelectorAll('[data-nt="arrange"]')].every(b => b.querySelector('svg.nt-arr-pv') && b.querySelector('b') && b.querySelector('small')), 'every layout card carries a schematic preview, a name and a one-line use');
if (captures) await writeFile(`${captures}/arrange-panel.html`, arrange.outerHTML); A.close();
// rc41 (W1; PLAN §2 W1.5): the Arrange limits lifted. (a) On a Layered picture Direction offers Left to right: the role bands
// stand as columns left to right, every element inside its band's column, nothing over another, no line through an
// element, the same elements and relationships; Top to bottom brings the rows back exactly; Undo returns the direction.
// (b) On Layers, Spacing moves the Concern bands: Compact draws the lanes closer and Spacious further apart than
// Comfortable, the corridor rules held at each. Nothing is written.
{
  const X = mount(5, 'application'); X.root.querySelector('[data-nt="menu"][data-id="arrange"]').click();
  const panel = () => X.root.querySelector('.nt-arrange-panel'), dir = id => panel().querySelector(`[data-nt="arrange-direction"][data-id="${id}"]`);
  if (X.notation.arrangement() !== 'layered') panel().querySelector('[data-nt="arrange"][data-id="layered"]').click();
  assert.equal(X.notation.arrangement(), 'layered', 'Chapter 5 is drawn Layered');
  const rows = X.notation.layout(), D = X.notation.diagram(), rowsJSON = JSON.stringify(rows.nodes);
  assert.ok(!dir('down').disabled && !dir('right').disabled && dir('down').getAttribute('aria-pressed') === 'true' && dir('right').getAttribute('aria-pressed') === 'false', 'a Layered picture offers both directions, Top to bottom pressed');
  dir('right').click();
  const cols = X.notation.layout(), levelOf = new Map(D.nodes.map(n => [n.id, n.level]));
  assert.ok(dir('right').getAttribute('aria-pressed') === 'true' && X.notation.arrangement() === 'layered', 'Left to right keeps the Layered layout, pressed');
  assert.ok(cols.bands.length === rows.bands.length && cols.bands.every(b => b.across) && cols.bands.every((b, i) => !i || b.x > cols.bands[i - 1].x + cols.bands[i - 1].w), 'the role bands stand as columns, left to right: ' + JSON.stringify(cols.bands.map(b => [b.title, b.x, b.w])));
  for (const n of cols.nodes) { const b = cols.bands.find(x => x.level === levelOf.get(n.id)); assert.ok(n.x >= b.x && n.x + n.w <= b.x + b.w && n.y >= b.y + 24 && n.y + n.h <= b.y + b.h, n.id + ' stands inside its band’s column'); }
  assert.ok(cols.nodes.every((a, i) => cols.nodes.every((b, j) => j <= i || a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y)) && cols.through === 0, 'no element over another and no line through an element');
  assert.deepEqual([cols.nodes.map(n => n.id).sort(), cols.edges.map(e => e.id).sort()], [rows.nodes.map(n => n.id).sort(), rows.edges.map(e => e.id).sort()], 'the same elements and relationships');
  assert.ok(cols.bands.every(b => !b.columns || (b.columns[0].x >= b.x && b.columns[0].y >= b.y + 20)), 'each column carries its aspect under its title');
  panel().querySelector('[data-nt="undo"]').click();
  assert.equal(JSON.stringify(X.notation.layout().nodes), rowsJSON, 'Undo returns the rows exactly');
  dir('right').click(); dir('down').click();
  assert.equal(JSON.stringify(X.notation.layout().nodes), rowsJSON, 'Top to bottom returns the rows exactly');
  // rc41 close (C23): each direction keeps its own pinned positions. A pin made under Top to bottom is not dropped when the
  // picture turns Left to right, a pin made there does not overwrite it, and each direction finds its own pin where it was
  // put, with no "could not be applied" note (was: one key for both, so every switch dropped the other direction's pins).
  {
    const at = id => { const b = X.notation.layout().nodes.find(n => n.id === id); return [b.x, b.y]; }, warned = () => /could not be applied/.test(X.root.querySelector('.cm-html')?.textContent || '');
    const id = rows.nodes[0].id, [x0, y0] = at(id);
    assert.ok(X.notation.pin(id, x0 + 48, y0), 'an element is pinned under Top to bottom'); const down = at(id);
    assert.ok(down[0] !== x0 && X.notation.layout().pinned.includes(id) && X.notation.layout().droppedPins.length === 0, 'it stands where it was pinned: ' + JSON.stringify({from: [x0, y0], down}));
    dir('right').click();
    assert.ok(X.notation.layout().droppedPins.length === 0 && !warned(), 'Left to right drops no pin made under Top to bottom: ' + JSON.stringify(X.notation.layout().droppedPins));
    const [cx, cy] = at(id);
    assert.ok(X.notation.pin(id, cx, cy + 32), 'the same element is pinned under Left to right'); const right = at(id);
    assert.ok(right[1] !== cy && X.notation.layout().pinned.includes(id) && X.notation.layout().droppedPins.length === 0, 'it stands where it was pinned there: ' + JSON.stringify({from: [cx, cy], right}));
    dir('down').click();
    assert.ok(JSON.stringify(at(id)) === JSON.stringify(down) && X.notation.layout().droppedPins.length === 0 && !warned(), 'back at Top to bottom the element stands where it was pinned in that direction, nothing dropped: ' + JSON.stringify({at: at(id), down, dropped: X.notation.layout().droppedPins}));
    dir('right').click();
    assert.ok(JSON.stringify(at(id)) === JSON.stringify(right) && X.notation.layout().droppedPins.length === 0 && !warned(), 'and at Left to right where it was pinned there: ' + JSON.stringify({at: at(id), right}));
    dir('down').click();
  }
  X.close();
  const Y = mount(5); Y.render('layers'); Y.root.querySelector('[data-nt="menu"][data-id="arrange"]').click();
  const sp = id => Y.root.querySelector(`.nt-arrange-panel [data-nt="arrange-spacing"][data-id="${id}"]`), lanes = () => Y.notation.layout().bands.filter(b => !b.collapsed && !b.none).map(b => b.y);
  assert.ok(['compact', 'comfortable', 'spacious'].every(id => !sp(id).disabled) && Y.root.querySelector('.nt-arrange-panel [data-nt="arrange-direction"][data-id="right"]').disabled === true, 'on Layers Spacing is offered and Direction keeps the bands top to bottom');
  const gaps = () => { const y = lanes(); return y.slice(1).map((v, i) => v - y[i]); }, at1 = gaps();
  sp('compact').click(); const at075 = gaps(), cm = corridorMetrics(Y.notation.layout());
  assert.ok(at075.length === at1.length && at075.every((g, i) => g < at1[i]) && cm.overfull + cm.offPitch + cm.onElement === 0, 'Compact draws the Concern bands closer, the corridor rules held: ' + JSON.stringify({at1, at075, cm}));
  sp('spacious').click(); const at135 = gaps(), cs = corridorMetrics(Y.notation.layout());
  assert.ok(at135.every((g, i) => g > at1[i]) && cs.overfull + cs.offPitch + cs.onElement === 0, 'Spacious draws them further apart: ' + JSON.stringify(at135));
  sp('comfortable').click(); assert.deepEqual(gaps(), at1, 'Comfortable returns them');
  // rc41 close (C22): at every spacing no line runs over a lane title or an aspect column's header (the boxes notationLayout
  // closes to the router), on the overview and on Show every element, in Chapters 4 to 7 (was: Chapter 5's overview at
  // Compact drew "owns ×6" through the Passive structure header, its every element at Spacious four relationships through
  // the Information & data title and header — the scaled gaps moved the rows between the routing grid's cells).
  const overHeads = L => {
    const heads = L.bands.flatMap(b => (b.collapsed || b.none ? [] : [{what: b.title, x: b.x, y: b.y, w: Math.round(charW(b.title || '', 14) * 1.15 + 18), h: 24}, ...(b.columns || []).map(c => ({what: c.title, x: c.x - 2, y: c.y, w: c.hw ?? Math.round(charW(c.title || '', 11.5) * 1.2 + 8), h: 14}))]));
    const out = []; for (const e of L.edges) for (let i = 1; i < (e.pts || []).length; i++) { const [x1, y1] = e.pts[i - 1], [x2, y2] = e.pts[i]; for (const h of heads) if (Math.min(x1, x2) < h.x + h.w && Math.max(x1, x2) > h.x && Math.min(y1, y2) < h.y + h.h && Math.max(y1, y2) > h.y) out.push(`${e.id} through ${h.what}`); }
    return out;
  };
  Y.close();
  // (fix-up) Every chapter, 1 to 11 (was: 4 to 7 only; the base also crossed on Chapter 2's and Chapter 3's overviews at
  // Spacious and Chapter 8's at Compact), its overview and then, on the same mount, its every element — except Chapter
  // 11's: its 238 relationships are drawn straight (the `large` rule) and cross titles at every spacing, in the base too
  // (157 segments at each; the package note's Open).
  for (const ch of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
    const Z = mount(ch); Z.render('layers');
    const spz = id => { const at = () => Z.root.querySelector(`.nt-arrange-panel [data-nt="arrange-spacing"][data-id="${id}"]`); if (!at()) Z.root.querySelector('[data-nt="menu"][data-id="arrange"]').click(); return at(); };
    for (const every of ch === 11 ? [false] : [false, true]) {
      const name = `Chapter ${ch} Layers ${every ? 'every element' : 'overview'}`;
      if (every) { const folds = Z.notation.diagram().nodes.filter(n => n.fold).length; Z.root.querySelector('[data-nt="fold-all"]').click(); assert.ok(folds > 0 && Z.notation.diagram().nodes.every(n => !n.fold), `${name}: the overview's ${folds} groups open into their elements`); }
      const opened = Z.notation.layout(), first = overHeads(opened);
      assert.ok(opened.edges.length > 0 && first.length === 0, `${name} at comfortable, as it opens: no line over a lane title or an aspect header: ` + JSON.stringify(first.slice(0, 6)));
      for (const id of ['compact', 'spacious', 'comfortable']) {
        spz(id).click(); const L = Z.notation.layout(), over = overHeads(L);
        assert.ok(L.edges.length > 0 && over.length === 0, `${name} at ${id}: no line over a lane title or an aspect header: ` + JSON.stringify(over.slice(0, 6)));
      }
    }
    Z.close();
  }
  // (c) A bundle per line style: Chapter 7's "serves (degraded)" servings from one capability share one qualifier, so they
  // form a fan-out of their own (was: drawn one line each, the qualifier five times), the qualifier written once at its root.
  { const D7 = viewpointProjection(notationDiagram(p, 'stack', {chapter: 7})), L7 = notationLayout(D7, {arrangement: 'layered', stage: SCREEN_STAGE, page: {width: 1320, min: 820}});
    const deg = L7.edges.filter(e => e.qualifier === 'degraded'), b = L7.bundles.find(x => x.end === 'from' && deg.some(e => e.bundle === x.id)), inB = deg.filter(e => e.bundle === b?.id);
    assert.ok(deg.length === 5 && b && inB.length >= 2 && L7.edges.filter(e => e.bundle === b.id).every(e => e.qualifier === 'degraded' && e.kind === 'serves' && e.from === b.node) && deg.filter(e => !e.qualifierHidden).length === deg.length - inB.length + 1, 'Chapter 7: the degraded servings join a trunk of their own, the qualifier written once there: ' + JSON.stringify({bundle: b?.id, members: inB.length, written: deg.filter(e => !e.qualifierHidden).length})); }
  cases.push('Arrange limits lifted: a Layered picture turns Left to right (role bands as columns, every element in its column, no overlap or through-pass, Undo and Top to bottom return the rows exactly; each direction keeps its own pinned positions, none dropped by a switch); on Layers, Spacing moves the Concern bands closer or apart with the corridor rules held and no line over a lane title or an aspect header at any spacing, overview and every element, Chapters 1 to 11 (Chapter 11’s every element, drawn straight, excepted); Chapter 7’s degraded servings join a trunk of their own (a bundle per line style and qualifier).');
}
const chain = {notes: [], scene: {id: 'direction-test', arrangement: 'tree'}, groups: [], nodes: Array.from({length: 8}, (_, i) => ({id: 'n' + i, type: 'responsibility', kind: 'logicalApp', title: 'Responsibility ' + i, layer: 'logical', level: 1})), edges: Array.from({length: 7}, (_, i) => ({id: 'e' + i, from: 'n' + i, to: 'n' + (i + 1), kind: 'uses', label: 'uses'}))};
for (const [arrangement, axis] of [['tree', 'y'], ['orthogonal', 'x']]) {
  const layout = notationLayout(chain, {arrangement, direction: 'strict'}), positions = new Map(layout.nodes.map(n => [n.id, n]));
  for (const e of chain.edges) assert.ok(positions.get(e.to)[axis] > positions.get(e.from)[axis], arrangement + ' keeps the chosen reading direction through a long chain');
}
cases.push('Arrange has a primary explainable recommendation, conventional layout names, collapsed selection tools, and verified top-to-bottom/left-to-right direction without automatic folding.');
// rc41 (W1; PLAN §2 W1.3): the standard on every view. (a) The layered Diagram writes each role band's aspect beside its
// title where the role maps to one (services = behaviour, components and participants = active structure), closed to the
// router; the bands keep their height. (b) The Strategy and Implementation & Migration bands exist and are drawn only when
// records stand in them: the reference project draws neither; a project with plateaus, a delivery action and a migration
// draws Chapter 11's Implementation & Migration lane with its Work packages and Plateaus columns, the action realizing its
// plateau and delivering its records, the migration as the transition between the plateaus; an outcome recorded as
// strategy stands in the Strategy lane. The project is never written.
{
  // (within rc41, W1 step 5: a header no longer widens the picture — that cost Chapter 7 its whole arrival — so a band whose
  // title line has no place clear of the title and of its related first-row elements' top ports carries none: Chapter 5's
  // components and services, Chapter 6's capabilities, Chapter 7's realizations; was: every band named, the picture widened by up to 201 px)
  // (rc41 close, C14: the aspect is the element's ArchiMate type's — a responsibility is an application component, a
  // capability a node or a technology service by its category, an operating plan a node — and a band names one only where
  // every element in it stands in that aspect; was {5: ['Behaviour', …], 7: ['Active structure', 'Behaviour', null]}:
  // responsibilities and capabilities headed Behaviour by their record type)
  const expect = {5: ['Active structure', null, null, 'Active structure', 'Active structure'], 6: ['Active structure', null], 7: ['Active structure', null, null], 10: [null, null]};
  const ASPECT = {ApplicationComponent: 'Active structure', Node: 'Active structure', SystemSoftware: 'Active structure', BusinessActor: 'Active structure', ApplicationService: 'Behaviour', TechnologyService: 'Behaviour', BusinessProcess: 'Behaviour', DataObject: 'Passive structure', BusinessObject: 'Passive structure', Artifact: 'Passive structure'};
  for (const [ch, scene] of [[5, 'application'], [6, 'solution'], [7, 'stack'], [10, 'usage']]) {
    const D = viewpointProjection(notationDiagram(p, scene, {chapter: ch})), L = notationLayout(D, {arrangement: 'layered', stage: SCREEN_STAGE, page: {width: 1320, min: 820}}), L0 = notationLayout(D, {arrangement: 'layered', stage: SCREEN_STAGE, page: {width: 1320, min: 820}});
    const Lplain = notationLayout({...D, nodes: D.nodes.map(n => ({...n, aspectKnown: false}))}, {arrangement: 'layered', stage: SCREEN_STAGE, page: {width: 1320, min: 820}});
    assert.deepEqual(L.bands.map(b => b.columns?.[0]?.title ?? null), expect[ch], `Chapter ${ch}: each role band names its aspect on its title line where it has room`);
    for (const b of L.bands.filter(b => b.columns)) for (const n of D.nodes.filter(n => n.level === b.level)) assert.equal(ASPECT[KINDS[n.kind].archimate] ?? b.columns[0].title, b.columns[0].title, `Chapter ${ch}: the header of ${b.title} names the aspect of ${n.ref || n.id}, drawn and exported as ${KINDS[n.kind].archimate}`);
    for (const n of D.nodes.filter(n => ASPECT[KINDS[n.kind].archimate])) assert.equal(n.aspectTitle, ASPECT[KINDS[n.kind].archimate], `Chapter ${ch}: ${n.ref || n.id} (${KINDS[n.kind].archimate}) stands in ${ASPECT[KINDS[n.kind].archimate]}`);
    assert.ok(L.W === Lplain.W && L.H === Lplain.H, `Chapter ${ch}: the aspect headers never widen the picture (${L.W} × ${L.H} against ${Lplain.W} × ${Lplain.H})`);
    for (const b of L.bands.filter(b => b.columns)) { const c = b.columns[0]; assert.ok(c.y >= b.y && c.y + 14 <= b.y + 24 && c.x + c.w <= b.x + b.w, `Chapter ${ch}: the aspect header stands on the band's title line, inside the band`); for (const e of L.edges) for (let i = 1; i < e.pts.length; i++) { const [x1, y1] = e.pts[i - 1], [x2, y2] = e.pts[i]; assert.ok(!(Math.min(x1, x2) < c.x + c.w && Math.max(x1, x2) > c.x && Math.min(y1, y2) < c.y + 14 && Math.max(y1, y2) > c.y), `Chapter ${ch}: no line runs over the aspect header of ${b.title}`); } }
    assert.deepEqual(L.bands.map(b => [b.y, b.h]), L0.bands.map(b => [b.y, b.h]), `Chapter ${ch}: the layout is deterministic`);
  }
  assert.deepEqual(VIEW_BANDS.map(b => b.id), ['motivation', 'strategy', 'business', 'application', 'information', 'technology', 'security', 'deployment', 'implementation'], 'the concern bands in the standard’s order, Strategy and Implementation & Migration among them');
  const lanesOf = (project, chapter) => { const D = viewpointProjection(notationDiagram(project, 'connected', {chapter})); const F = foldDiagram(D, {project, budget: 60, keys: viewpointGroupKeys(D, project, {layers: true}), force: true}); const O = layerOverview(F, D); return {D, O, L: notationLayout(O, {arrangement: 'by-layer', stage: SCREEN_STAGE, page: {width: 1320, min: 820}, collapsed: []})}; };
  for (const ch of [1, 5, 11]) { const {L} = lanesOf(p, ch); assert.ok(!L.bands.some(b => ['strategy', 'implementation'].includes(b.layer)), `Chapter ${ch}: without such records neither band is drawn`); }
  // (rc41 close, C14) In the Layers lanes too: an element of a core band stands in the column of its ArchiMate type's aspect.
  let laned = 0;
  for (const ch of [4, 5, 6, 7, 10]) { const {D} = lanesOf(p, ch); for (const n of D.nodes.filter(n => ASPECT[KINDS[n.kind]?.archimate] && !['motivation', 'security', 'strategy', 'implementation'].includes(viewpointBand(n)))) { assert.equal(n.aspectTitle, ASPECT[KINDS[n.kind].archimate], `Chapter ${ch} Layers: ${n.ref || n.id} (${n.type}, ${KINDS[n.kind].archimate}) stands in ${ASPECT[KINDS[n.kind].archimate]}`); laned++; } }
  assert.ok(laned >= 200, `${laned} elements checked in the Layers lanes`);
  // (rc41 close, C14 fix-up) The Layers view opens folded (notation-view LAYERS_OVERVIEW: one box per type group, the
  // overview drawn above), so the check reads that overview too: each group box stands in one aspect column, so every
  // member of a group stands in the group's column, and the box is drawn inside that column of its lane. Capabilities
  // typed as nodes and as technology services are two groups, one in Active structure and one in Behaviour; was one
  // "Technology capabilities" group under the column of whichever member came first (Behaviour in Chapters 5, 7, 11).
  let grouped = 0, capabilityGroups = 0;
  for (const ch of [1, 4, 5, 6, 7, 10, 11]) {
    const {D, O, L} = lanesOf(p, ch), byId = new Map(D.nodes.map(n => [n.id, n]));
    for (const g of O.nodes.filter(n => n.fold)) {
      assert.deepEqual([...new Set(g.fold.members.map(id => byId.get(id).aspect))], [g.aspect], `Chapter ${ch} Layers overview: every member of “${g.title}” stands in its column, ${g.aspectTitle}`);
      const col = L.bands.find(b => b.layer === g.viewBand)?.columns?.find(c => c.id === g.aspect), box = L.nodes.find(n => n.id === g.id);
      assert.ok(col && box && box.x >= col.x - 0.5 && box.x + box.w <= col.x + col.w + 0.5, `Chapter ${ch} Layers overview: “${g.title}” is drawn inside its lane's ${g.aspectTitle} column`);
      grouped++;
    }
    const caps = O.nodes.filter(n => n.fold && D.nodes.find(x => x.id === n.fold.members[0])?.type === 'capability');
    if (caps.length) {
      assert.deepEqual(caps.map(n => [n.title, n.aspectTitle, [...new Set(n.fold.members.map(id => KINDS[byId.get(id).kind].archimate))]]).sort(), [['Technology capabilities · nodes', 'Active structure', ['Node']], ['Technology capabilities · technology services', 'Behaviour', ['TechnologyService']]], `Chapter ${ch} Layers overview: the capabilities as two groups, by the element type each is drawn and exported as`);
      capabilityGroups += caps.length;
    }
  }
  assert.ok(grouped >= 30 && capabilityGroups >= 8, `${grouped} groups of the Layers overviews checked, ${capabilityGroups} of them capability groups`);
  const p2 = JSON.parse(before);
  p2.roadmap = {schemaVersion: 1, counters: {plateau: 2}, plateaus: [{id: 'PLT-001', revision: 1, title: 'Current platform', kind: 'current', order: 1, purpose: 'Today'}, {id: 'PLT-002', revision: 1, title: 'Target platform', kind: 'target', order: 2, purpose: 'The target'}], assignments: {}, history: [], migrations: [{id: 'MIG-001', title: 'Move the ledger', plateauIds: ['PLT-001', 'PLT-002'], actionIds: ['RA-001']}]};
  const objIds = notationDiagram(p, 'connected', {chapter: 11}).nodes.slice(0, 2).map(n => n.id);
  p2.finalReview = {...(p2.finalReview || {}), actions: [{id: 'RA-001', revision: 1, title: 'Close the ledger gaps', owner: 'Lead', due: '', acceptance: 'Done', objectIds: objIds, findingId: '', plateauId: 'PLT-002', status: 'Planned'}]};
  // (rc41 close, C34: the Strategy band holds the elements the standard types as strategy elements — a course of action
  // here — while an outcome stays a motivation element and a technology capability a technology element, whatever their
  // record's `strategy` flag says; was: an outcome flagged as strategy stood in Strategy under "Courses of action")
  p2.artefacts.find(a => a.type === 'outcome').strategy = true;
  p2.technology.capabilities[0].strategy = true;
  p2.modelContext = {...(p2.modelContext || {}), objects: [...(p2.modelContext?.objects || []), {id: 'COA-001', type: 'course', title: 'Consolidate the payment channels', attributes: {}}], relationships: [...(p2.modelContext?.relationships || []), {id: 'R-COA-001', type: 'realizes', from: 'COA-001', to: 'OUT-001'}]};
  const D11 = notationDiagram(p2, 'connected', {chapter: 11});
  assert.deepEqual(D11.nodes.filter(n => ['plateau', 'workPackage'].includes(n.kind)).map(n => [n.id, n.kind, n.type]).sort(), [['PLT-001', 'plateau', 'plateau'], ['PLT-002', 'plateau', 'plateau'], ['RA-001', 'workPackage', 'action']], 'Chapter 11 draws its plateaus and delivery actions');
  assert.deepEqual(D11.edges.filter(e => /^c:(RA|MIG)/.test(e.id)).map(e => [e.from, e.to, e.kind, e.label]).sort(), [['PLT-001', 'PLT-002', 'transition', 'Move the ledger'], ['RA-001', 'PLT-002', 'realizes', 'realizes'], ...objIds.map(id => ['RA-001', id, 'realizes', 'delivers'])].sort(), 'the action realizes its plateau and delivers its records; the migration is the transition between the plateaus');
  const S = lanesOf(p2, 11), lane = S.L.bands.find(b => b.layer === 'implementation');
  assert.ok(lane && lane.title.startsWith('Implementation & Migration · 3') && lane.columns.map(c => c.title).join('/') === 'Work packages/Plateaus', 'with records the Implementation & Migration lane is drawn with its columns: ' + lane?.title);
  assert.deepEqual(S.D.nodes.filter(n => viewpointBand(n) === 'implementation').map(n => n.id + ':' + n.aspect).sort(), ['PLT-001:plateaus', 'PLT-002:plateaus', 'RA-001:work']);
  assert.equal(S.L.bands.map(b => b.layer).at(-1), 'implementation', 'Implementation & Migration is the last lane');
  const S1 = lanesOf(p2, 1), strategy = S1.L.bands.find(b => b.layer === 'strategy');
  assert.ok(strategy && S1.L.bands.map(b => b.layer).indexOf('strategy') === 1 && strategy.columns.map(c => c.title).join('/') === 'Courses of action', 'a course of action stands in the Strategy lane, under Motivation, in Courses of action');
  assert.deepEqual(S1.D.nodes.filter(n => viewpointBand(n) === 'strategy').map(n => [n.id, KINDS[n.kind].archimate, n.aspect]), [['COA-001', 'CourseOfAction', 'courses']]);
  const out = S1.D.nodes.find(n => n.id === 'OUT-001');
  assert.deepEqual([viewpointBand(out), out.aspect, out.aspectTitle, KINDS[out.kind].archimate], ['motivation', 'goals', 'Assessments & outcomes', 'Outcome'], 'an outcome flagged as strategy stays a motivation element, under Assessments & outcomes');
  const S6 = viewpointProjection(notationDiagram(p2, 'connected', {chapter: 6})), cap = S6.nodes.find(n => n.id === p2.technology.capabilities[0].id);
  assert.ok(cap && viewpointBand(cap) === 'technology' && ['Node', 'TechnologyService'].includes(KINDS[cap.kind].archimate), 'a technology capability flagged as strategy stays in Technology, typed by its category');
  assert.ok(!S6.nodes.some(n => viewpointBand(n) === 'strategy'), 'nothing of Chapter 6 stands in Strategy');
  for (const [L, name] of [[S.L, 'Chapter 11'], [S1.L, 'Chapter 1']]) { const cm = L.bands.filter(b => b.columns); assert.ok(cm.every(b => b.columns.every(c => c.x >= b.x ?? 0)), name + ': every column stands in its lane'); }
  cases.push('The standard on every view: the layered Diagram names each role band’s aspect beside its title (lines keep off it); the Strategy and Implementation & Migration bands are drawn only when records stand in them — Chapter 11’s plateaus, delivery actions (realizing their plateau, delivering their records) and migrations (the transition between plateaus); a course of action in Strategy, while an outcome or a technology capability flagged as strategy keeps its own band; every header names the aspect of each element of its band by its ArchiMate type.');
}
// rc41 close (C6): the reader's focus is drawn whatever a stepped level's budget keeps back, and counted. Chapter 7's
// Diagram opens with 12 of its 41 Adjacent paths: an element whose level paths are all parked, selected, has every one of
// them drawn and a Tab stop, the 12 kept; Reveal next still adds six paths not yet drawn; a parked relationship picked
// from the element's "Lines drawn together" is drawn, lifted, a Tab stop and the keyboard's; a trace lights its chain on
// the Diagram and on the Layers view (Chapter 5, from `ledger`: 22 relationships) with every lit relationship drawn, and a
// build-up's steps say in place what they draw. The caption, the Key and Sol's packet count exactly what is drawn
// (was: the budget drew none of them — 0 of the element's 8 paths, the picked line display:none with tabindex −1, 0 of the
// 22 traced relationships).
{
  const counted = (F, what) => {
    const D = F.notation.diagram(), shown = visible(F), cv = F.notation.explain().connectionVisibility, lv = connectionLevelOf(D);
    const inLevel = D.edges.filter(e => levelRank(lv.get(e.id)) <= levelRank(cv.mode)).map(e => e.id), levelShown = inLevel.filter(id => shown.includes(id)).length, more = inLevel.length - levelShown, beyond = D.edges.length - inLevel.length - (shown.length - levelShown);
    const words = more ? ` · ${more} more at this level` : beyond ? ` · ${beyond} beyond` : '', caption = `${shown.length} of ${D.edges.length} links shown · ${cv.mode === 'adjacent' ? 'Adjacent' : 'Structure'}${words}`;
    assert.equal(F.root.querySelector('.nt-connection-caption').textContent, caption, what + ': the caption counts what is drawn');
    assert.ok(cv.shown === shown.length && cv.levelShown === levelShown && cv.moreAtLevel === more && cv.beyondLevel === beyond && cv.caption === caption && JSON.stringify([...cv.visiblePathIds].sort()) === JSON.stringify(shown), what + ': Sol’s packet reads the same: ' + JSON.stringify({...cv, visiblePathIds: cv.visiblePathIds.length}));
    assert.ok(F.notation.legendHTML().includes(`<small>${shown.length} of ${D.edges.length}${words}</small>`), what + ': the Key reads the same');
    for (const hit of F.svg.querySelectorAll('.nt-hit[data-nt-edge]')) { const on = shown.includes(hit.dataset.ntEdge); assert.ok(hit.classList.contains('nt-connection-hidden') !== on && hit.getAttribute('tabindex') === (on ? '0' : '-1'), what + ': a drawn relationship is a Tab stop, a parked one is not: ' + hit.dataset.ntEdge); }
    // (fix-up) Reveal next says what it adds to what is drawn now, also after a marks change that redraws no picture.
    const next = Math.min(6, more + beyond), btn = F.root.querySelector('[data-nt="connections-more"]');
    assert.ok(next ? !!btn && btn.textContent === `Reveal next ${next}` && btn.title.includes(more ? `(${more} not yet shown)` : 'beyond the') : !btn, what + ': Reveal next says what it adds to what is drawn: ' + JSON.stringify({next, more, text: btn?.textContent ?? null, title: btn?.title ?? null}));
    assertPending(F);
  };
  const S = mount(7), D = S.notation.diagram(), lv = connectionLevelOf(D), opening = visible(S);
  const inLevel = new Set(D.edges.filter(e => levelRank(lv.get(e.id)) <= levelRank('adjacent')).map(e => e.id)), mineOf = id => D.edges.filter(e => (e.from === id || e.to === id) && inLevel.has(e.id)).map(e => e.id);
  const picksOf = id => { const box = document.createElement('div'); box.innerHTML = nodeLinesHTML(D, S.notation.layout(), id); return [...box.querySelectorAll('[data-nt="edge-pick"]')].map(b => b.dataset.id); };
  const held = D.nodes.map(n => n.id).find(id => mineOf(id).length >= 2 && mineOf(id).every(e => !opening.includes(e)) && picksOf(id).some(e => !opening.includes(e)));
  assert.ok(opening.length === 12 && held, 'Chapter 7 opens with 12 paths and has an element whose level paths are all parked: ' + held);
  S.select(held); let shown = visible(S);
  assert.ok(mineOf(held).every(id => shown.includes(id)) && opening.every(id => shown.includes(id)) && shown.length === opening.length + mineOf(held).length, `selecting ${held} draws every one of its ${mineOf(held).length} level paths beside the 12 (${shown.length} drawn)`);
  counted(S, 'Chapter 7 with ' + held + ' selected');
  S.root.querySelector('[data-nt="connections-more"]').click(); const revealed = visible(S);
  assert.ok(shown.every(id => revealed.includes(id)) && revealed.length === shown.length + 6, 'Reveal next adds six paths not yet drawn: ' + (revealed.length - shown.length));
  counted(S, 'Chapter 7 revealed with ' + held + ' selected');
  S.mode('adjacent'); shown = visible(S);
  assert.equal(shown.length, opening.length + mineOf(held).length, 'choosing the level again opens it afresh, the selection still drawn');
  const lines = document.createElement('div'); lines.innerHTML = nodeLinesHTML(D, S.notation.layout(), held); S.root.append(lines);
  const pick = picksOf(held).find(id => !opening.includes(id));
  lines.querySelector(`[data-nt="edge-pick"][data-id="${CSS.escape(pick)}"]`).click(); await frame(); await frame();
  const hit = S.svg.querySelector(`.nt-hit[data-nt-edge="${CSS.escape(pick)}"]`), lift = S.svg.querySelector(`[data-nt-lift="${CSS.escape(pick)}"]`);
  assert.equal(S.notation.state.selEdge, pick, 'the button selects its relationship');
  assert.ok(visible(S).includes(pick) && visible(S).length === opening.length + 1 && !hit.classList.contains('nt-connection-hidden') && hit.getAttribute('tabindex') === '0' && hit.getAttribute('aria-hidden') === 'false' && lift && !lift.classList.contains('nt-connection-hidden') && [...S.svg.querySelectorAll('.nt-lift .nt-end')].every(r => !r.classList.contains('nt-connection-hidden')), `the picked parked relationship ${pick} is drawn, lifted and ringed, and a Tab stop`);
  assert.equal(document.activeElement, hit, 'the keyboard is on its hit');
  counted(S, 'Chapter 7 with ' + pick + ' picked');
  lines.remove(); S.close();
  const traced = (F, from) => {
    const TD = F.notation.diagram(), ids = traceFrom(p, from).ids, lit = TD.edges.filter(e => ids.has(e.from) && ids.has(e.to)).map(e => e.id).sort(), drawn = visible(F);
    const litDrawn = [...F.svg.querySelectorAll('.nt-edge.nt-mk-lit')].map(e => e.dataset.ntEdge).sort();
    assert.ok(lit.length > 0 && JSON.stringify(litDrawn) === JSON.stringify(lit) && lit.every(id => drawn.includes(id)), `the trace from ${from} draws every one of its ${lit.length} lit relationships (${lit.filter(id => drawn.includes(id)).length} drawn)`);
    return lit.length;
  };
  const R = mount(7); R.notation.trace(held); traced(R, held); counted(R, 'Chapter 7 traced from ' + held); R.notation.clearTrace(); R.close();
  const T = mount(5); T.render('layers'); T.notation.trace('ledger');
  assert.ok(traced(T, 'ledger') >= 20 && T.notation.diagram().nodes.length > 60, 'Chapter 5 Layers opens every element for the trace, its chain drawn');
  counted(T, 'Chapter 5 Layers traced from ledger');
  // (fix-up) The build-up along the trace keeps the chain drawn at every one of its steps, to the last: the trace's own marks
  // step aside while it runs, its lines do not (was: 0 of the 22 drawn from step 1, the budget's 12 back in their place).
  const chainIds = traceFrom(p, 'ledger').ids, chain = T.notation.diagram().edges.filter(e => chainIds.has(e.from) && chainIds.has(e.to)).map(e => e.id);
  assert.ok(T.notation.startBuild('trace'), 'the build-up steps along the trace'); let steps = 0; const total = T.notation.building().total;
  do {
    const lit = [...T.svg.querySelectorAll('.nt-edge.nt-mk-lit')].map(e => e.dataset.ntEdge), drawn = visible(T);
    assert.ok(lit.every(id => drawn.includes(id)), `build-up step ${steps + 1}: every relationship it lights is drawn`);
    assert.ok(chain.length >= 20 && chain.every(id => drawn.includes(id)), `build-up step ${steps + 1} of ${total}: the trace's chain stays drawn (${chain.filter(id => drawn.includes(id)).length} of its ${chain.length} relationships, ${drawn.length} drawn)`);
    counted(T, `Chapter 5 Layers build-up step ${steps + 1}`);
  } while (++steps < 40 && T.notation.buildStep(1));
  assert.ok(total >= 4 && steps === total, `the build-up was stepped to its last step (${steps} of ${total})`);
  T.notation.clearBuild(); T.notation.clearTrace(); T.close();
  // (fix-up) A build-up's own lit relationships are drawn and counted, whatever the budget parks: Chapter 7 by layer, no trace
  // lit — its steps light relationships inside one role band, some of them beyond the 12 — and the caption, the Key, the
  // packet and Reveal next say so at every step, in place (a step redraws no picture). Cleared, the picture is its 12 again.
  const B = mount(7), bOpening = visible(B); let parkedLit = 0, bSteps = 0;
  assert.ok(B.notation.startBuild('layer'), 'the build-up steps by layer');
  do {
    const lit = [...B.svg.querySelectorAll('.nt-edge.nt-mk-lit')].map(e => e.dataset.ntEdge), drawn = visible(B);
    parkedLit += lit.filter(id => !bOpening.includes(id)).length;
    assert.ok(lit.every(id => drawn.includes(id)) && bOpening.every(id => drawn.includes(id)) && drawn.length === new Set([...bOpening, ...lit]).size, `by layer, step ${bSteps + 1}: every relationship it lights is drawn beside the 12 (${lit.length} lit, ${drawn.length} drawn)`);
    counted(B, `Chapter 7 by layer, step ${bSteps + 1}`);
  } while (++bSteps < 40 && B.notation.buildStep(1));
  assert.ok(parkedLit > 0 && bSteps === B.notation.building().total, `a step of the build-up lit relationships the budget alone parks (${parkedLit}), every step read (${bSteps})`);
  B.notation.clearBuild(); assert.deepEqual(visible(B), bOpening, 'the build-up cleared, the picture draws its 12 again'); counted(B, 'Chapter 7 after the build-up');
  B.close();
  // (fix-up) Under None no line is drawn and no hit takes the keyboard: a relationship picked by name brings the lines back
  // at the picture's own level, where it is drawn, a Tab stop and the keyboard's (was: nothing drawn, its hit hidden with
  // tabindex −1, focus() on it lost to the page).
  const N = mount(7); N.mode('none'); assert.ok(visible(N).length === 0 && N.svg.classList.contains('nt-connections-none'), 'None draws no line');
  const nLines = document.createElement('div'); nLines.innerHTML = nodeLinesHTML(N.notation.diagram(), N.notation.layout(), held); N.root.append(nLines);
  nLines.querySelector(`[data-nt="edge-pick"][data-id="${CSS.escape(pick)}"]`).click(); await frame(); await frame();
  const nHit = N.svg.querySelector(`.nt-hit[data-nt-edge="${CSS.escape(pick)}"]`), nPressed = N.root.querySelector('[data-nt="connections"][aria-pressed="true"]')?.dataset.id;
  assert.ok(N.notation.state.selEdge === pick && nPressed === 'adjacent' && !N.svg.classList.contains('nt-connections-none') && visible(N).includes(pick) && !nHit.classList.contains('nt-connection-hidden') && nHit.getAttribute('tabindex') === '0', 'under None, the picked relationship brings the lines back at Adjacent, drawn and a Tab stop: ' + JSON.stringify({pick, level: nPressed, drawn: visible(N).length, stop: nHit.getAttribute('tabindex')}));
  assert.equal(document.activeElement, nHit, 'the keyboard is on its hit');
  counted(N, 'Chapter 7 with ' + pick + ' picked under None');
  nLines.remove(); N.close();
  cases.push('The reader’s focus is drawn whatever a stepped level’s budget keeps back, and counted exactly in the caption, the Key, Sol’s packet and Reveal next: the selected element’s level paths (the 12 kept, Reveal next still six not yet drawn), a parked relationship picked from its lines drawn together (drawn, lifted, a Tab stop with the keyboard on it; under None it brings the lines back at the picture’s own level), every lit relationship of a trace on the Diagram and the Layers view, the trace’s chain at every step of the build-up along it, and every relationship a build-up step lights.');
}
assert.equal(JSON.stringify(p), before); assert.equal(writes, 0, 'viewpoint exploration never authors model facts');
await window.happyDOM.close();
console.log(JSON.stringify({suite: 'Diagram and Layers readability', passed: cases.length, cases}, null, 2));
