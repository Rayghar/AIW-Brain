// The standard diagrams' projection: every scene of the reference project, its kickers, the line and
// ends of each relationship family, ArchiMate directions, the Key built from what is drawn, the
// viewpoint catalogue, focus, the baseline diff, and that nothing is drawn the project does not record.
// Run: npm run test:notation
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {createProject} from './shared/projects-domain.js';
import {applyLogicalCommand} from './public/logical-domain.js';
import {notationDiagram, notationScenes, stripToLayers, focusDiagram, describeNode, describeEdge, notationDiff, viewpointOf, arrangementsFor, CHAPTER_SCENES, SCENES, KINDS, STYLES, styleOf, LAYERS, ARRANGEMENTS} from './public/notation-model.js';
import {legendData, svgParts, notationSVG, marksLegend, nodeMarkSVG, SVG_STYLE, FAR, crossingSeparations} from './public/notation-svg.js';
import {notationLayout} from './public/notation-layout.js';
import {setMarks, clearMarks, mergeMarks, mergeSources, marksInfo, MARK_WORDS, MARK_GLYPHS} from './public/model-marks.js';
import {CHECK_WORDS, CHECK_GLYPHS, chapterChecks} from './public/readiness-model.js';
import {traceFrom, matrixModel, TRACE_ORDER} from './public/model-matrix.js';
import {checkMarks, recordPicture, recordPictureHTML} from './public/notation-view.js';
import {STYLE_FAMILIES, PALETTE, paletteOf, FAMILY_FILL, FAMILY_INK, ICONS, MARKERS} from './public/notation-palette.js';

const checks = [], pass = name => checks.push(name);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const kinds = D => [...new Set(D.nodes.map(n => n.kind))].sort();
const node = (D, id) => D.nodes.find(n => n.id === id);

// 1. Every chapter opens on its own picture; the shared viewpoints follow; every scene draws only from records.
const own = {1: 'process', 2: 'drivers', 3: 'decisions', 4: 'logical', 5: 'application', 6: 'solution', 7: 'stack', 8: 'integration', 9: 'security', 10: 'deployment', 11: 'rationale'};
for (let ch = 1; ch <= 11; ch++) { const sc = notationScenes(ch); assert.ok(sc.length >= 1, 'chapter ' + ch + ' has a scene'); assert.equal(sc[0].id, own[ch], 'chapter ' + ch + ' opens on its own picture'); for (const s of sc) assert.ok(s.chapters.includes(ch), s.id + ' is offered in chapter ' + ch); }
for (const s of SCENES) assert.ok(Object.values(CHAPTER_SCENES).some(l => l.includes(s.id)), s.id + ' is offered somewhere');
assert.ok(notationScenes(3).some(s => s.id === 'rationale'), 'the design rationale is reachable from Chapter 3');
for (const s of SCENES) {
  const D = notationDiagram(project, s.id);
  assert.ok(D && D.scene.id === s.id, s.id);
  assert.ok(s.audience && s.purpose && s.standard, s.id + ': the viewpoint says who it is for and what it answers');
  for (const n of D.nodes) { assert.ok(KINDS[n.kind], s.id + ': kind ' + n.kind); assert.ok(LAYERS.includes(n.layer)); assert.ok(n.title); if (n.group) assert.ok(D.groups.some(g => g.id === n.group), s.id + ': group of ' + n.id); }
  for (const e of D.edges) {
    assert.ok(node(D, e.from) && node(D, e.to), s.id + ': edge ends ' + e.id);
    assert.ok(e.label || e.kind === 'sequence', s.id + ': every edge carries its word (a sequence flow may be unlabelled)');
    assert.ok(STYLES[e.kind] && styleOf(e.kind).family === e.family, s.id + ': ' + e.kind + ' has its own style');
  }
  for (const g of D.groups) if (g.parent) assert.ok(D.groups.some(x => x.id === g.parent), s.id + ': parent group');
  assert.ok(ARRANGEMENTS.some(a => a.id === s.arrangement), s.id + ': opens on a known arrangement');
  assert.ok(arrangementsFor(D).some(a => a.id === s.arrangement) || s.arrangement !== 'lanes', s.id + ': its own arrangement is offered');
  assert.equal(D.header.model, 'Bank Payment Journey'); assert.equal(D.header.author, '', 'no author is invented');
  assert.ok(D.nodes.length > 0, s.id + ' draws the reference project');
}
pass(`all ${SCENES.length} scenes draw from the reference project; each chapter opens on its own picture (Chapter 11's rationale also reachable from Chapter 3); every element has a standard kind and layer; every edge joins two drawn elements, carries its word and has its own style; the header says only what the project records`);

// 2. The notation kit: a reader can tell the relationship families apart by line and ends alone.
{
  const sig = st => [st.dash, st.head, st.tail, st.stroke].join('|');
  for (const [k1, a] of Object.entries(STYLES)) for (const [k2, b] of Object.entries(STYLES)) if (a.family !== b.family) assert.notEqual(sig(a), sig(b), `${k1} (${a.family}) and ${k2} (${b.family}) are drawn alike`);
  for (const st of Object.values(STYLES)) assert.ok(STYLE_FAMILIES.some(([f]) => f === st.family), st.family + ' has a reading in the Key');
  assert.equal(STYLES.realizes.dash, '2 2'); assert.equal(STYLES.realizes.head, 'hollow'); assert.equal(STYLES.serves.head, 'open'); assert.equal(STYLES.serves.dash, ''); assert.equal(STYLES.flow.head, 'filled'); assert.ok(STYLES.flow.dash); assert.equal(STYLES.owns.head, 'small'); assert.equal(STYLES.composes.tail, 'diamond');
  const used = new Set(SCENES.flatMap(s => notationDiagram(project, s.id).edges.map(e => e.kind)));
  assert.ok(used.size >= 14, 'the reference project draws ' + used.size + ' relationship kinds');
  pass(`the notation kit: ${Object.keys(STYLES).length} relationship kinds in ${STYLE_FAMILIES.length} families, no two families drawn alike (realization dotted with a hollow head, serving solid with an open head, flow dashed with a filled head, access dotted with a small head, composition with a diamond, …); the reference project draws ${used.size} kinds`);
}

// 3. ArchiMate directions: the whole composes its parts, the realizer points at what it realizes, the server at what it serves.
{
  const A = notationDiagram(project, 'application');
  const sys = A.nodes.find(n => n.type === 'system');
  assert.ok(A.edges.filter(e => e.kind === 'composes').length === 5 && A.edges.filter(e => e.kind === 'composes').every(e => e.from === sys.id && node(A, e.to).kind === 'physicalApp'), 'the application composes its five components');
  assert.ok(!A.edges.some(e => e.kind === 'realizes' && e.from === sys.id), 'the application does not realize its components');
  const re = A.edges.filter(e => e.kind === 'realizes'); assert.equal(re.length, 5); assert.ok(re.every(e => node(A, e.from).kind === 'physicalApp' && node(A, e.to).kind === 'logicalApp'), 'each component realizes its logical component');
  const S = notationDiagram(project, 'solution');
  assert.ok(!SCENES.some(s => notationDiagram(project, s.id).edges.some(e => /is served by|implemented by|fulfilled by/.test(e.label))), 'no word reads against its arrow');
  const sv = S.edges.filter(e => e.kind === 'serves'); assert.ok(sv.length >= 20 && sv.every(e => ['logicalTech', 'techService'].includes(node(S, e.from).kind) && node(S, e.to).kind === 'physicalApp'), 'capabilities serve the components that need them');
  const T = notationDiagram(project, 'stack');
  const rz = T.edges.filter(e => e.kind === 'realizes'); assert.equal(rz.length, 9); assert.ok(rz.every(e => node(T, e.from).kind === 'physicalTech'), 'each product realizes its capability');
  const Dr = notationDiagram(project, 'drivers');
  assert.ok(Dr.edges.filter(e => e.kind === 'fulfils').every(e => node(Dr, e.from).kind === 'quality' && node(Dr, e.to).kind === 'requirement'), 'a quality scenario fulfils the requirement it refines');
  assert.match(describeNode(A, 'api-pod'), /Physical application component APP-001: Payment service[\s\S]*realizes Payment API/);
  pass('ArchiMate directions: the application composes its components, each component realizes its logical component, capabilities serve components, products realize capabilities, quality scenarios fulfil requirements; no word reads against its arrow');
}

// 4. Qualifiers, ends, weak and crossing marks are carried on the edge.
{
  const Sx = notationDiagram(project, 'security'), Dd = notationDiagram(project, 'data'), A = notationDiagram(project, 'application'), S = notationDiagram(project, 'solution');
  assert.ok(Sx.edges.some(e => e.kind === 'threatens' && e.qualifier === 'High'), 'a threat carries its priority');
  assert.ok(Dd.edges.filter(e => e.kind === 'exchanges').every(e => e.ends === 'both'), 'an exchange reads both ways');
  assert.ok(A.edges.filter(e => e.kind === 'composes').every(e => e.ends === 'none'), 'composition has no arrowhead, only the diamond at the whole');
  assert.ok(S.edges.some(e => e.weak && e.qualifier), 'a capability that is not essential is attenuated and says why');
  assert.ok(A.edges.some(e => e.kind === 'implements' && e.qualifier), 'an implemented service carries its kind');
  assert.match(describeEdge(S, S.edges.find(e => e.weak).id), /serves[\s\S]*Serving relationship, attenuated/);
  pass('qualifiers (priority, kind, criticality), ends (both, none) and attenuation travel on the edge and read in the companion');
}

// 5. The Key is built from what is drawn: element kinds, relationship families with their words, containers, marks.
{
  const keyMarks = {bundle: 0, tree: 0};
  for (const s of SCENES) {
    const D = notationDiagram(project, s.id), K = legendData(D);
    assert.deepEqual(K.elements.map(e => e.kind).sort(), kinds(D), s.id + ': the Key lists exactly the element kinds drawn');
    assert.deepEqual(K.relationships.map(r => r.family).sort(), [...new Set(D.edges.map(e => e.family))].sort(), s.id + ': the Key lists exactly the relationship families drawn');
    assert.ok(K.relationships.every(r => r.kinds.every(k => !/^IF-|^RP-/.test(k.label))), s.id + ': contract references are not relationship kinds');
    assert.equal(K.groups.length, new Set(D.groups.map(g => g.kind)).size, s.id + ': the Key names the containers drawn');
    // Round 10 (N5): the marks of lines drawn together appear if and only if the picture draws them (in every offered
    // arrangement); without the layout the Key names none of them.
    assert.ok(!K.marks.some(m => ['bundle', 'tree', 'duplicate'].includes(m.id)), s.id + ': without its layout the Key claims no line drawn together');
    for (const a of arrangementsFor(D)) {
      const L = notationLayout(D, {arrangement: a.id}), KL = legendData(D, L), has = id => KL.marks.some(m => m.id === id), fans = L.bundles.filter(b => b.end !== 'both');
      assert.equal(has('bundle'), fans.some(b => b.dotted), s.id + ':' + a.id + ': the join dot is explained if and only if a dotted fan is drawn');
      assert.equal(has('tree'), fans.some(b => !b.dotted), s.id + ':' + a.id + ': the plain T is explained if and only if an undotted fan is drawn');
      assert.equal(has('duplicate'), L.bundles.some(b => b.end === 'both' || b.runs.some(r => r.far && r.members.length > 1)), s.id + ':' + a.id + ': one line for several records is explained if and only if one is drawn');
      assert.equal(has('separation'), crossingSeparations(L).length > 0, s.id + ':' + a.id + ': crossing separation is explained only when drawn');
      assert.deepEqual(KL.marks.filter(m => !['bundle', 'tree', 'duplicate', 'separation'].includes(m.id)), legendData(D).marks, s.id + ':' + a.id + ': every other mark is as before');
      keyMarks.bundle += has('bundle'); keyMarks.tree += has('tree');
    }
  }
  const BK = legendData(notationDiagram(project, 'solution'), notationLayout(notationDiagram(project, 'solution'), {arrangement: 'layered'})).marks.find(m => m.id === 'bundle');
  assert.ok(BK && /each branch is one recorded relationship/.test(BK.text) && /does not claim it as an ArchiMate junction/.test(BK.text), 'the join dot is a drawing join, each branch one recorded relationship, no ArchiMate junction claimed: ' + BK?.text);
  assert.ok(keyMarks.bundle > 0 && keyMarks.tree > 0, 'the reference pictures draw dotted (' + keyMarks.bundle + ') and plain-T (' + keyMarks.tree + ') fans');
  const P = legendData(notationDiagram(project, 'process'));
  assert.deepEqual(P.elements.map(e => e.kind).sort(), ['event', 'gateway', 'task'], 'the process Key shows its BPMN symbols, not “Nothing drawn”');
  assert.ok(P.elements.every(e => e.bpmn));
  const A = legendData(notationDiagram(project, 'application')), flow = A.relationships.find(r => r.family === 'flow');
  assert.deepEqual(flow.kinds.map(k => k.label), ['flows to'], 'the flow family is named once'); assert.deepEqual(flow.flowWords, ['Check', 'Allow', 'Handoff', 'Event'], 'the flow words are listed apart');
  const T = legendData(notationDiagram(project, 'stack'));
  assert.ok(T.marks.some(m => m.id === 'hatched') && T.marks.some(m => m.id === 'weak'), 'hatched and attenuated marks are explained when drawn');
  const Dp = legendData(notationDiagram(project, 'deployment'));
  assert.ok(Dp.marks.some(m => m.id === 'step') && Dp.relationships.some(r => r.family === 'path'), 'the numbered runtime path is explained');
  pass('the Key, for every scene, lists exactly the element kinds, relationship families and containers drawn; BPMN symbols for the process; flow words apart from relationship kinds; contract references never as relationships; the marks drawn (hatched, attenuated, numbered); and (round 10) the join dot, the plain T and the line drawn once for several records if and only if the picture in that arrangement draws one, with no ArchiMate junction claimed');
}

// 6. The viewpoint catalogue: context, containers, cooperation, usage, lineage and motivation are projections of the one model.
{
  const C = notationDiagram(project, 'context');
  assert.ok(C.nodes.some(n => n.type === 'system') && C.nodes.filter(n => n.kind === 'actor').length >= 1 && C.nodes.some(n => n.type === 'party'), 'context: the system, the people who take part and the external systems');
  const Ct = notationDiagram(project, 'container');
  assert.ok(Ct.groups.some(g => g.kind === 'system') && Ct.nodes.some(n => n.kind === 'physicalData') && Ct.edges.some(e => /^IF-/.test(e.label)), 'containers: inside the system boundary, the stores, and contracts as arrows');
  const Co = notationDiagram(project, 'cooperation');
  assert.deepEqual(kinds(Co), ['appService', 'physicalApp']); assert.ok(Co.edges.some(e => e.kind === 'implements') && Co.edges.some(e => e.kind === 'uses'));
  const U = notationDiagram(project, 'usage'); assert.ok(U.edges.length && U.edges.every(e => e.kind === 'realizes' || e.kind === 'hosts'), 'technology usage: product realizes capability, placed as copies');
  const Li = notationDiagram(project, 'lineage'); assert.ok(Li.nodes.some(n => n.kind === 'logicalData') && Li.edges.some(e => e.kind === 'owns') && Li.notes.some(t => /lineage/.test(t)), 'lineage: owners and carriers, and says when no lineage is recorded');
  const Mo = notationDiagram(project, 'motivation'); assert.ok(['actor', 'outcome', 'requirement', 'quality', 'decision'].every(k => Mo.nodes.some(n => n.kind === k)), 'motivation: actors, outcomes, requirements, quality scenarios, decisions');
  for (const s of SCENES) { const v = viewpointOf(notationDiagram(project, s.id)); assert.ok(['drawn', 'partial', 'empty'].includes(v.readiness) && v.audience && v.purpose, s.id + ': readiness'); }
  assert.equal(viewpointOf(notationDiagram(project, 'stack')).readiness, 'partial', 'a picture with open choices is partly drawn and says so');
  // An external participant is drawn once.
  const A = notationDiagram(project, 'application');
  for (const g of A.groups.filter(g => g.kind === 'external')) assert.ok(!A.nodes.some(n => n.group === g.id && n.title === g.title && !A.edges.some(e => e.to !== n.id && e.from === n.id)), 'a participant that only provides services is not drawn twice');
  assert.equal(A.nodes.filter(n => n.type === 'party').length, 1); assert.equal(A.nodes.find(n => n.type === 'party').group, null, 'a caller is one element, not a box with a box of the same name');
  pass('the viewpoint catalogue (context, containers, cooperation, technology usage, lineage, motivation) draws from the same model, each with audience, purpose and readiness; an external participant is drawn once');
}

// 7. Layers strip a diagram; focus reduces it; a blank project draws nothing and says so.
{
  const D = notationDiagram(project, 'application'), S = stripToLayers(D, ['physical']);
  assert.ok(S.nodes.every(n => n.layer === 'physical') && S.edges.every(e => ['composes', 'flow'].includes(e.kind)), 'only the physical components and what joins them');
  assert.equal(S.counts.hidden, D.nodes.length - S.nodes.length);
  const S2 = stripToLayers(D, ['physical', 'interface']);
  assert.ok(S2.nodes.some(n => n.kind === 'appService') && S2.groups.some(g => g.kind === 'external') && !S2.groups.some(g => g.kind === 'module'), 'the modules open up; the external systems stay');
  const F1 = focusDiagram(D, {id: 'risk-engine', hops: 1});
  const nb = new Set(['risk-engine', ...D.edges.filter(e => e.from === 'risk-engine').map(e => e.to), ...D.edges.filter(e => e.to === 'risk-engine').map(e => e.from)]);
  assert.ok(F1.nodes.length < D.nodes.length && F1.nodes.length === nb.size && F1.nodes.every(n => nb.has(n.id)), 'focus ± 1 keeps the element and exactly its neighbours');
  const F2 = focusDiagram(D, {id: 'risk-engine', hops: 2}); assert.ok(F2.nodes.length > F1.nodes.length);
  const Fg = focusDiagram(D, {groupId: 'GRP-001'}); assert.ok(Fg.nodes.length && Fg.nodes.every(n => n.group === 'GRP-001'), 'focus on a container');
  const blank = createProject({name: 'Blank', template: 'blank'}, 'blank-notation');
  for (const s of SCENES) { const B = notationDiagram(blank, s.id); assert.equal(B.nodes.length, 0, s.id + ' draws nothing for a blank project'); assert.ok(B.notes.length >= 1 || ['drivers', 'decisions', 'rationale', 'integration', 'data', 'security', 'motivation', 'cooperation', 'usage', 'lineage'].includes(s.id), s.id + ' says why'); assert.equal(viewpointOf(B).readiness, 'empty'); assert.ok(!arrangementsFor(B).some(a => a.id === 'lanes'), s.id + ': no swimlanes without lanes'); }
  assert.ok(arrangementsFor(notationDiagram(project, 'process')).some(a => a.id === 'lanes') && !arrangementsFor(notationDiagram(project, 'drivers')).some(a => a.id === 'lanes'), 'swimlanes are offered only where the picture has lanes or containers');
  pass('the model layers strip a diagram, focus reduces it to an element’s neighbourhood or a container, swimlanes are offered only where there are lanes, and a blank project draws nothing and says so');
}

// 8. The baseline diff: two pictures of the same scene as one, every element and relationship classed.
{
  const A = notationDiagram(project, 'logical');
  let changed = applyLogicalCommand(project, {type: 'logical.responsibility', payload: {title: 'Reconcile returns', purpose: 'Diff fixture.', boundary: 'Fixture', owner: 'Fixture', source: 'Fixture', groupId: project.logical.groups[0].id, requirementIds: []}}, '2026-09-30T00:00:00.000Z').document;
  const r0 = changed.logical.responsibilities[0];
  changed = applyLogicalCommand(changed, {type: 'logical.responsibility', payload: {...r0, title: r0.title + ' (renamed)'}}, '2026-09-30T00:00:01.000Z').document;
  const B = notationDiagram(withFinalReview(changed), 'logical'), X = notationDiff(A, B);
  assert.equal(X.counts.added, 1, 'one element added'); assert.ok(X.counts.changed >= 1, 'the renamed element is changed'); assert.equal(X.counts.removed, 0);
  assert.ok(X.nodes.find(n => n.title === 'Reconcile returns').change === 'added' && X.nodes.find(n => n.id === r0.id).change === 'changed');
  assert.ok(legendData(X).marks.some(m => m.id === 'added'), 'the diff Key explains added, removed and changed');
  const Y = notationDiff(B, A); assert.equal(Y.counts.removed, 1); assert.equal(Y.nodes.find(n => n.title === 'Reconcile returns').hatched, true, 'a removed element is drawn hatched');
  pass('the baseline diff draws two pictures of a scene as one, classing elements and relationships as added, removed or changed, with its own Key marks');
}

// 9. One palette: every renderer reads the same table for a record type.
{
  for (const [type, t] of Object.entries(PALETTE)) { const fam = paletteOf(type).family; assert.ok(FAMILY_FILL[fam] && FAMILY_INK[fam], type + ' has a fill and an ink'); assert.ok(ICONS[fam] || ICONS.group, type + ' has an icon'); if (t.kind) assert.ok(KINDS[t.kind], type + ' maps to a notation kind'); }
  assert.equal(paletteOf('responsibility').kind, 'logicalApp'); assert.equal(paletteOf('component').kind, 'physicalApp'); assert.equal(KINDS.logicalApp.archimate, 'ApplicationComponent');
  pass('one palette: every record type has one notation kind, short name, fill, ink, icon, ArchiMate type and C4 type, read by the Diagram, the export, the code exports, the explorer and the anatomy');
}

// 10. Marks on the picture (round 5, Contract M): one store, Contract M's precedence, one painting, the shared words.
{
  for (const k of ['pass', 'fix', 'confirm']) { assert.equal(MARK_WORDS[k], CHECK_WORDS[k], 'the check words are readiness-model’s'); assert.equal(MARK_GLYPHS[k], CHECK_GLYPHS[k], 'and so are its glyphs'); }
  assert.deepEqual(Object.keys(MARK_GLYPHS).sort(), ['confirm', 'fix', 'pass'], 'no other glyph is defined');
  setMarks('checks', [{id: 'a', state: 'pass'}, {id: 'b', state: 'confirm', note: 'Confirm the owner'}, {id: 'c', state: 'fix', note: 'Missing owner'}, {id: 'd', state: 'fix'}, {id: 'e', state: 'pass'}]);
  setMarks('impact', [{id: 'b', state: 'changed', note: 'Changed by this alternative'}, {id: 'c', state: 'changed'}]);
  setMarks('trace', [{id: 'c', state: 'traced'}, {id: 'd', state: 'dimmed'}, {id: 'e', state: 'dimmed'}], {from: 'c', ref: 'C'});
  setMarks('proposals', [{id: 'p1', state: 'ghost', note: 'Fraud scoring', anchor: 'a'}, {id: 'a', state: 'ghost', note: 'Proposed edit'}]);
  let M = mergeMarks();
  assert.equal(M.get('c').state, 'traced', 'traced wins over changed and fix'); assert.equal(M.get('b').state, 'changed', 'changed wins over confirm');
  assert.equal(M.get('d').state, 'fix', 'dimmed is no state: the check stays'); assert.equal(M.get('d').dimmed, true, 'it only lowers the opacity');
  assert.equal(M.get('c').dimmed, false, 'a traced element is never dimmed'); assert.equal(M.get('a').state, 'pass'); assert.equal(M.get('a').ghost, true, 'a ghost is drawn as its own mark beside the state');
  assert.equal(M.get('p1').state, null); assert.equal(M.get('p1').anchor, 'a', 'a proposal the picture does not hold keeps its anchor');
  assert.deepEqual(M.get('b').notes.map(n => n.source), ['checks', 'impact'], 'every source’s note is kept');
  assert.equal(M.get('a').glyph, CHECK_GLYPHS.pass); assert.equal(M.get('d').word, CHECK_WORDS.fix);
  assert.deepEqual([...mergeMarks(['checks']).keys()].sort(), ['b', 'c', 'd', 'e', 'p1', 'a'].sort(), 'a source can be left out (the Checks switch)');
  assert.equal(mergeMarks(['checks']).get('d').state, null, 'without the checks, d is only dimmed');
  for (const x of ['checks', 'impact', 'trace', 'proposals']) clearMarks(x);
  assert.equal(mergeMarks().size, 0, 'clearing withdraws a source'); assert.equal(marksInfo('trace'), null);
  // One painting, on screen and in the export: glyph and word, a ring, a hatched ghost; the Key lists every state drawn.
  const D = notationDiagram(project, 'logical'), L = notationLayout(D), [r0, r1, r2] = D.nodes;
  const marks = mergeSources([['checks', [{id: r0.id, state: 'fix', note: 'Missing owner'}, {id: r1.id, state: 'confirm'}]], ['impact', [{id: r2.id, state: 'changed'}]], ['proposals', [{id: 'P-1', state: 'ghost', note: 'Reconcile returns', anchor: r0.id}]]]);
  const parts = svgParts(D, L, {marks, interactive: true});
  assert.match(parts.nodes, new RegExp(`data-nt-node="${r0.id}"[^>]*class|class="[^"]*nt-mk-fix[^"]*" data-nt-node="${r0.id}"`), 'the element carries its state');
  assert.ok(parts.nodes.includes(`>${CHECK_GLYPHS.fix}</text>`) && parts.nodes.includes(`>${CHECK_WORDS.fix}</text>`), 'with the shared glyph and word');
  assert.ok(parts.nodes.includes('nt-mk-ring changed'), 'changed is a ring'); assert.ok(parts.ghosts.includes('data-nt-ghost="P-1"') && parts.ghosts.includes('Reconcile returns'), 'a proposal not in the picture is its own hatched element');
  assert.deepEqual(marksLegend(marks, D, {changed: 'Changed by this alternative'}).map(m => m.text), ['Changed by this alternative', CHECK_WORDS.fix, CHECK_WORDS.confirm, 'Proposed, not saved'], 'the Key lists every state drawn, in order');
  const svg = notationSVG(D, L, {marks, markWords: {changed: 'Changed by this alternative'}});
  assert.ok(svg.includes('On the picture') && svg.includes('Changed by this alternative'), 'and so does the exported picture’s Key');
  // Semantic zoom's far names: drawn for the screen, never shown by an export.
  assert.ok(parts.nodes.includes('class="nt-ftitle"') && SVG_STYLE.includes('.nt-ftitle{display:none'), 'every element has its far name, hidden outside the screen');
  assert.ok(FAR * 0.5 >= 9, 'a far name reads at 9 px or more at the first fit (zoom 0.5)');
  assert.equal(nodeMarkSVG(null, 10, 10).badge, '');
  pass('marks on the picture: one store with Contract M’s precedence (traced > changed > fix > confirm > pass), dimmed lowers the opacity only, a ghost is its own element, the shared glyphs and words of readiness-model.js are the only ones, the screen and the export paint them alike, the Key lists every state drawn, and every element has a far name only the screen shows');
}

// 11. The checks as marks, the trace through the Matrix's own cells, and the record picture.
{
  for (const ch of [4, 8]) {
    const C = chapterChecks(project, ch), marks = checkMarks(project, ch), records = C.passages.filter(x => x.id !== 'project');
    assert.deepEqual(marks.map(m => m.id + ':' + m.state), records.map(x => x.id + ':' + x.status), 'Chapter ' + ch + ': the checks source is the chapter’s passages, one mark per record');
  }
  assert.ok(checkMarks(project, 4).every(m => m.state === 'confirm') && checkMarks(project, 8).every(m => m.state === 'fix'), 'Chapter 4’s five to confirm, Chapter 8’s eleven to fix');
  const T = traceFrom(project, 'REQ-001');
  assert.equal(T.steps.length, TRACE_ORDER.length, 'one step for each layer of the chain');
  assert.match(T.chain, /^REQ-001 → QD-002, QD-003 \+2 → ADR-001, ADR-002 \+1 → LR-001 → APP-001 → TC-001, TC-002 \+4 → TR-001, TR-002 \+4 → DAT-001, IF-001 → SEC-001 → PL-001 → RUN-001$/, 'REQ-001’s chain: ' + T.chain);
  for (const id of ['REQ-001', 'api', 'api-pod', 'rest', 'instruction', 'oauth', 'run-001']) assert.ok(T.ids.has(id), id + ' is on REQ-001’s trace');
  assert.ok(!T.ids.has('risk') && !T.ids.has('ledger'), 'what REQ-001 does not reach stays off it');
  for (const st of T.steps) for (const r of st.records) if (r.id !== 'REQ-001') { const X = matrixModel(project, {rows: 'requirement', cols: r.type}); assert.ok(X.cells.has('REQ-001|' + r.id), r.ref + ' is a cell the Matrix shows for REQ-001'); }
  const X = matrixModel(project, {rows: 'requirement', cols: 'runtime'}), cell = X.cells.get('REQ-001|run-001');
  assert.equal(cell.kind, 'chain'); assert.ok(cell.items[0].via.every(v => T.ids.has(v)), 'the Matrix’s chain through the design is on the trace: they agree');
  const G = traceFrom(project, 'risk'); assert.ok(G.gaps.includes('no control') && G.chain.includes('[no control]'), 'a gap is named: ' + G.chain);
  assert.equal(traceFrom(project, 'nothing-here'), null);
  const R = recordPicture(project, 4, 'risk');
  assert.ok(R && R.node.id === 'risk' && R.shown >= 3 && R.shown <= 12, 'Chapter 4 draws LR-002’s neighbourhood');
  assert.ok(R.svg.includes('nt-node') && /class="nt-node[^"]* sel/.test(R.svg) && R.svg.includes('nt-mk-confirm'), 'with the record marked and its checks painted');
  assert.ok(R.z * Math.max(...[...R.svg.matchAll(/class="nt-ftitle"[^>]*font-size="([\d.]+)"/g)].map(m => Number(m[1]))) >= 9, 'its references read at 9 px or more at its size');
  assert.equal(R.view, 'diagram'); assert.match(recordPictureHTML(R), /data-rp="risk"[\s\S]*Its neighbourhood/);
  assert.equal(recordPicture(project, 1, 'api'), null, 'a record of another chapter draws nothing'); assert.equal(recordPicture(project, 4, 'nothing'), null);
  pass('the chapter checks become marks one for one (Chapters 4 and 8), the trace from REQ-001 runs requirement → driver → decision → responsibility → component → capability → realization → contract or data → control → placement → part through the Matrix’s own cells (so the two agree) with its gaps named, and a chapter record has a small picture of its neighbourhood with its checks painted');
}

// 12. Round 6 (Contract T): the sequence and lifecycle pictures, the BPMN glyphs, the ArchiMate type words in the Key, and
//     a technology icon drawn from D.icons when a node names one.
{
  assert.deepEqual(CHAPTER_SCENES[8], ['integration', 'data', 'lineage', 'cooperation', 'sequence', 'lifecycle'], 'Chapter 8 offers the sequence and the lifecycle');
  assert.deepEqual(CHAPTER_SCENES[1], ['process', 'context', 'motivation', 'sequence', 'module-map'], 'Chapter 1 offers the sequence of its journey (and, round 24, the module map)');
  const S = notationDiagram(project, 'sequence');
  assert.ok(S.nodes.length >= 6 && S.nodes.every(n => n.kind === 'lifeline' && ['component', 'party', 'data'].includes(n.type)), 'lifelines for components, parties and the data exchanged');
  assert.ok(S.edges.length >= 10 && S.edges.every((e, i) => e.kind === 'message' && e.step === i + 1), 'messages numbered 1..n in order');
  assert.ok(S.edges.some(e => e.reply) && S.edges.some(e => !e.reply), 'requests and responses');
  assert.ok(S.edges.some(e => /^JRN-00\d · /.test(e.label)), 'the journey order names each step once: ' + S.edges.map(e => e.label).slice(0, 4).join(' | '));
  assert.deepEqual(arrangementsFor(S).map(a => a.id), ['sequence'], 'the sequence picture has one arrangement: lifelines as columns, messages as rows');
  assert.ok(!arrangementsFor(notationDiagram(project, 'process')).some(a => a.id === 'sequence'), 'offered for no other picture');
  const one = notationDiagram(project, 'sequence', {objectId: 'network'});
  assert.deepEqual(one.nodes.map(n => n.id), ['worker', 'ext-network', 'instruction', 'settlement']); assert.equal(one.edges.length, 4);
  const step = notationDiagram(project, 'sequence', {objectId: 'JRN-003'}); assert.ok(step.edges.length >= 1 && step.edges.every(e => e.record), 'a journey step draws the contracts of the components that implement it');
  const Lc = notationDiagram(project, 'lifecycle');
  assert.deepEqual(Lc.nodes.map(n => n.kind), Array(6).fill('state')); assert.equal(Lc.groups.length, 2); assert.ok(Lc.edges.every(e => e.kind === 'transition' && /^IF-00\d$/.test(e.label)), 'transitions labelled by their contract');
  assert.ok(Lc.nodes.filter(n => /Initial/.test(n.sub)).length === 2, 'the first state of each is the initial one');
  assert.equal(notationDiagram(project, 'lifecycle', {objectId: 'settlement'}).nodes.length, 3); assert.equal(notationDiagram(project, 'lifecycle', {objectId: 'settlement'}).groups.length, 0, 'one data definition: no container');
  assert.match(describeNode(Lc, 'state:settlement:PENDING'), /State: PENDING \(Initial · status\)[\s\S]*moves to SETTLED|IF-003 SETTLED/);
  // The Key names the ArchiMate type word of every relationship kind, the glyphs and the icons drawn.
  const P = notationDiagram(project, 'process'), K = legendData(P);
  assert.ok(K.relationships.every(r => r.kinds.every(k => typeof k.archimate === 'string' && k.archimate)), 'every relationship kind has its type word');
  assert.equal(K.relationships.find(r => r.family === 'sequence').kinds[0].archimate, 'Triggering'); assert.equal(K.relationships.find(r => r.family === 'message').kinds[0].archimate, 'Flow');
  assert.deepEqual(K.glyphs.map(g => g.id).sort(), ['event:end:none', 'event:start:none', 'gateway:exclusive'], 'the bank process draws a start, three ends and two exclusive gateways');
  for (const sc of SCENES) { const KK = legendData(notationDiagram(project, sc.id)); assert.ok(Array.isArray(KK.glyphs) && Array.isArray(KK.icons), sc.id + ': glyphs and icons in the Key'); }
  // node.icon: a 24 × 24 path from D.icons[node.icon].path, drawn in the glyph slot and listed in the Key (Contract F's set is
  // another workstream's; a test icon stands in for it).
  const A = notationDiagram(project, 'stack'), tech = A.nodes.find(n => n.kind === 'physicalTech');
  const withIcon = {...A, nodes: A.nodes.map(n => (n.id === tech.id ? {...n, icon: 'database'} : {...n, icon: null})), icons: {database: {title: 'Database', path: 'M12 3c-4.4 0-8 1.3-8 3v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6c0-1.7-3.6-3-8-3'}}};
  const LA = notationLayout(withIcon, {arrangement: 'tree'}), parts = svgParts(withIcon, LA), svg = notationSVG(withIcon, LA);
  assert.ok(new RegExp(`data-nt-node="${tech.id}"[\\s\\S]*?<g class="nt-icon"[^>]*><path d="M12 3c-4.4`).test(parts.nodes), 'the icon path is drawn in the element\'s glyph slot');
  assert.deepEqual(legendData(withIcon).icons, [{id: 'database', title: 'Database', path: withIcon.icons.database.path, count: 1}], 'the Key lists the icon drawn');
  assert.ok(svg.includes('>Icons<') && svg.includes('>Database<'), 'and the exported Key has an Icons section');
  const noIcons = {...A, nodes: A.nodes.map(n => ({...n, icon: null}))}, partsNoIcons = svgParts(noIcons, notationLayout(noIcons, {arrangement: 'tree'}));
  assert.ok(!partsNoIcons.nodes.includes('nt-icon'), 'without node.icon the family icon is drawn as before');
  pass('round 6: the sequence picture (lifelines for components, parties and the data exchanged; messages 1..n, requests and responses; a contract or a journey step alone; one arrangement) and the lifecycle picture (states per data definition, the initial one named, transitions labelled by their contract) join Chapters 8 and 1; the Key names the ArchiMate type word of every relationship kind, the BPMN glyphs drawn and the technology icons drawn from D.icons when a node names one');
}

// 13. Round 10 (N5): lines drawn together are drawn once, and every relationship keeps its own. Each bundle (L.bundles)
//     is one g.nt-bundle placed before its first member, with a g.nt-trunk per run (the run's route, its members, its
//     dash phased by its length from the shared port, the shared end's mark once on the root run, the far end's on a run
//     two records share to the end, a join dot where a branch leaves a dotted fan); every member keeps its g.nt-edge
//     with its own branch and only its far end's mark, and its own full-route hit, Tab stop and reading, which says the
//     line it is drawn on; a fan adds one pointer-only hit after every relationship's. State on a run is derived from the
//     relationships that travel it; the lift (screen only) carries the whole route of what is selected, lit or traced.
{
  const pathD = pts => pts.map(([x, y], i) => (i ? 'L' : 'M') + (Math.round(x * 10) / 10) + ' ' + (Math.round(y * 10) / 10)).join('');
  const r1 = v => Math.round(v * 10) / 10, len = P => P.reduce((t, p, i) => (i ? t + Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]) : 0), 0);
  const unesc = x => x.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const escA = x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const attr = (tag, a) => { const m = new RegExp(' ' + a + '="([^"]*)"').exec(tag); return m ? unesc(m[1]) : null; };
  // Whether a dashed path drawn from `o` into its pattern inks the point `s` px along it.
  const inked = (dash, o, s) => { const [a, g] = dash.split(' ').map(Number), P = a + g; return (((s + o) % P) + P) % P < a; };
  // The dash of a member's own branch keeps the trunk's phase: sampled along the branch, it inks where a path drawn from
  // the shared port would (a fan-out's branch runs on from the join, a fan-in's runs towards it).
  const inStep = (e, b, dash, o) => { const br = e.branch, bl = len(br), whole = len(e.pts); for (let s = 0.5; s < bl; s += 0.5) { const d = b.end === 'from' ? whole - bl + s : whole - s, [a, g] = dash.split(' ').map(Number), ph = d % (a + g); if (Math.min(Math.abs(ph), Math.abs(ph - a), Math.abs(ph - a - g)) < 0.3) continue; if (inked(dash, o, s) !== inked(dash, 0, d)) return false; } return true; };
  const tally = {pictures: 0, bundles: 0, runs: 0, dots: 0, bhits: 0, phased: 0, empty: 0};
  const check = (D, L, tag) => {
    const P = svgParts(D, L, {interactive: true}), X = svgParts(D, L), E = new Map(L.edges.map(e => [e.id, e]));
    // Round 24 (D-24-07): each g.nt-edge also names its two ends (data-nt-from, data-nt-to), so a reader of the file
    // finds both among the elements drawn.
    const groups = [...P.edges.matchAll(/<g class="nt-edge[^"]*" data-nt-edge="([^"]*)" data-nt-from="[^"]*" data-nt-to="[^"]*"(?: data-nt-bundle="([^"]*)")?><path class="nt-line"([^>]*)\/>/g)];
    assert.deepEqual(groups.map(g => unesc(g[1])), L.edges.map(e => e.id), tag + ': one g.nt-edge per relationship, in model order');
    const ends = [...P.edges.matchAll(/<g class="nt-edge[^"]*" data-nt-edge="[^"]*" data-nt-from="([^"]*)" data-nt-to="([^"]*)"/g)];
    assert.deepEqual(ends.map(x => [unesc(x[1]), unesc(x[2])]), L.edges.map(e => [e.from, e.to]), tag + ': each g.nt-edge names its two ends');
    assert.equal(L.edges.length, D.edges.length);
    const hits = [...P.hits.matchAll(/<path class="nt-hit" d="([^"]*)" data-nt-edge="([^"]*)" role="button" tabindex="0" aria-label="([^"]*)">/g)];
    assert.deepEqual(hits.map(h => unesc(h[2])), L.edges.map(e => e.id), tag + ': one hit and Tab stop per relationship, in model order');
    assert.ok(hits.every(h => h[1] === pathD(E.get(unesc(h[2])).pts)), tag + ': every hit follows its relationship’s whole route');
    assert.ok(!P.hits || P.hits.startsWith('<g class="nt-hits"><path class="nt-hit"'), tag + ': the first hit is a relationship’s');
    assert.equal((P.hits.match(/tabindex=/g) || []).length, D.edges.length, tag + ': no other Tab stop among the hits');
    for (const t of P.edges.match(/<g class="nt-(?:trunk|bundle)[^>]*>/g) || []) assert.ok(!/nt-edge|data-nt-edge/.test(t), tag + ': shared ink is never a relationship: ' + t);
    assert.equal((P.edges.match(/<g class="nt-bundle"/g) || []).length, L.bundles.length, tag + ': one g.nt-bundle per bundle');
    assert.equal(P.lift, '', tag + ': nothing selected, nothing lifted'); assert.ok(!/nt-bhit|nt-lift|tabindex/.test(X.edges + X.hits), tag + ': the export has no hit, lift or Tab stop');
    const bhits = [...P.hits.matchAll(/<path class="nt-bhit" d="([^"]*)" data-nt-bundle="([^"]*)" data-nt-select="([^"]*)" aria-hidden="true"><title>([^<]*)<\/title><\/path>/g)];
    assert.equal(bhits.length, L.bundles.filter(b => b.end !== 'both').length, tag + ': one pointer-only hit per fan, none for one fact');
    if (bhits.length) assert.ok(P.hits.indexOf('<path class="nt-bhit"') > P.hits.lastIndexOf('<path class="nt-hit"'), tag + ': after every relationship’s hit');
    for (const b of L.bundles) {
      const rep = E.get(b.members[0]), st = styleOf(rep.kind), at = P.edges.indexOf(`<g class="nt-bundle" data-nt-bundle="${escA(b.id)}">`), first = P.edges.indexOf(`data-nt-edge="${escA(b.members[0])}"`);
      assert.ok(at >= 0 && at < first, tag + ': ' + b.id + ' is drawn just before its first member');
      const body = P.edges.slice(at, P.edges.indexOf('<g class="nt-edge', at)), runs = [...body.matchAll(/<g class="(nt-trunk[^"]*)" data-nt-members="([^"]*)"><path class="nt-line"([^>]*)\/>/g)];
      assert.equal(runs.length, b.runs.length, tag + ': ' + b.id + ' draws each run once');
      runs.forEach((r, i) => {
        const run = b.runs[i];
        assert.deepEqual(JSON.parse(unesc(r[2])), run.members, tag + ': a run names the relationships that travel it');
        assert.ok(r[1].startsWith(`nt-trunk nt-e-${rep.kind} nt-f-${st.family}`), tag + ': a run is drawn in its members’ line style');
        assert.equal(attr(r[3], 'd'), pathD(run.pts)); assert.equal(attr(r[3], 'stroke-dasharray'), st.dash || null);
        assert.equal(attr(r[3], 'stroke-dashoffset'), st.dash && run.offset ? String(r1(run.offset)) : null, tag + ': a dashed run starts its dash at its length from the shared port');
        if (st.dash && run.offset) tally.phased++;
      });
      const dots = (body.match(/<circle class="nt-join"/g) || []).length;
      assert.equal(dots, b.dotted && b.end !== 'both' ? b.joins.length : 0, tag + ': ' + b.id + ' draws ' + (b.dotted ? 'a dot at each join' : 'no dot (a plain T or one fact)'));
      for (const id of b.members) {
        const e = E.get(id), g = groups.find(x => unesc(x[1]) === id), own = b.end !== 'both' && e.branch.length > 1;
        assert.equal(unesc(g[2] || ''), b.id, tag + ': ' + id + ' names its line');
        assert.equal(attr(g[3], 'd'), own ? pathD(e.branch) : '', tag + ': ' + id + ' draws its own branch' + (own ? '' : ' (none: it ends on a run)'));
        assert.equal(attr(g[3], 'stroke-dasharray'), st.dash || null, tag + ': ' + id + ' keeps its family’s dash');
        if (!own) tally.empty++;
        if (own && st.dash) assert.ok(inStep(e, b, st.dash, Number(attr(g[3], 'stroke-dashoffset') || 0)), tag + ': ' + id + '’s dash keeps the trunk’s phase');
        const said = unesc(hits.find(h => unesc(h[2]) === id)[3]);
        assert.ok(b.end === 'both' ? /Recorded more than once; this record: /.test(said) : said.includes(`Drawn on one line with ${b.members.length - 1} other`), tag + ': ' + id + '’s reading says the line it is drawn on: ' + said);
      }
      if (b.end !== 'both') { const h = bhits.find(x => unesc(x[2]) === b.id); assert.ok(h && unesc(h[3]) === b.node && h[1] === b.runs.map(r => pathD(r.pts)).join(''), tag + ': ' + b.id + '’s pointer hit follows its runs and selects its shared element'); tally.bhits++; }
      const xb = X.edges.slice(X.edges.indexOf(`<g class="nt-bundle" data-nt-bundle="${escA(b.id)}">`)), xr = xb.slice(0, xb.indexOf('</g>', xb.indexOf('<g class="nt-trunk')));
      assert.ok(/<title>One line for \d+ /.test(xr), tag + ': in an export the root run names its members');
      tally.bundles++; tally.runs += b.runs.length; tally.dots += dots;
    }
    tally.pictures++;
  };
  for (const s of SCENES) { const D = notationDiagram(project, s.id); if (!D.nodes.length) continue; for (const a of arrangementsFor(D)) check(D, notationLayout(D, {arrangement: a.id}), s.id + ':' + a.id); }
  assert.ok(tally.bundles > 20 && tally.dots > 0 && tally.phased > 0 && tally.empty >= 0, 'the reference pictures draw bundles: ' + JSON.stringify(tally));
  // Without bundles nothing of this is drawn.
  { const D = notationDiagram(project, 'solution'), L = notationLayout(D, {arrangement: 'layered', consolidate: false}), P = svgParts(D, L, {interactive: true}); assert.ok(!/nt-bundle|nt-trunk|nt-join|nt-bhit|stroke-dashoffset/.test(P.edges + P.hits), 'without bundles the picture draws every relationship on its own, as before'); }
  // State on shared ink: a selected member lights exactly the runs it travels, the others dim; selecting the shared
  // element lights every run; a traced pair of elements lights the runs its relationship travels. The lift carries the
  // whole route of what is selected, ringed at both ends, and never reaches an export.
  const D = notationDiagram(project, 'solution'), L = notationLayout(D, {arrangement: 'layered'}), b = L.bundles.find(x => x.end !== 'both' && x.runs.length >= 3), m = b.members[b.members.length - 1], E = new Map(L.edges.map(e => [e.id, e]));
  const runsOf = parts => { const at = parts.edges.indexOf(`<g class="nt-bundle" data-nt-bundle="${escA(b.id)}">`), body = parts.edges.slice(at, parts.edges.indexOf('<g class="nt-edge', at)); return [...body.matchAll(/<g class="(nt-trunk[^"]*)" data-nt-members="([^"]*)">/g)].map(r => ({cls: r[1].split(' '), members: JSON.parse(unesc(r[2]))})); };
  const S = svgParts(D, L, {interactive: true, selEdge: m}), R = runsOf(S);
  assert.ok(R.every(r => r.members.includes(m) ? r.cls.includes('sel') && !r.cls.includes('dim') : r.cls.includes('dim') && !r.cls.includes('sel')), 'a selected member lights the runs it travels and only those: ' + JSON.stringify(R));
  assert.ok(R.some(r => r.cls.includes('dim')), 'and a run it does not travel dims');
  const lift = [...S.lift.matchAll(/<path class="([^"]*)" d="([^"]*)" data-nt-lift="([^"]*)"/g)];
  assert.ok(lift.length === 1 && lift[0][1] === 'sel' && lift[0][2] === pathD(E.get(m).pts) && unesc(lift[0][3]) === m && (S.lift.match(/<circle class="nt-end"/g) || []).length === 2 && /^<g class="nt-lift" aria-hidden="true" pointer-events="none">/.test(S.lift), 'the lift draws the selected relationship’s whole route, ringed at both ends, pointer-free and silent');
  assert.ok(runsOf(svgParts(D, L, {interactive: true, sel: b.node})).every(r => r.cls.includes('lit')), 'selecting the shared element lights every run');
  const far = E.get(m)[b.end === 'to' ? 'from' : 'to'], TR = runsOf(svgParts(D, L, {interactive: true, marks: new Map([[b.node, {id: b.node, state: 'traced', notes: []}], [far, {id: far, state: 'traced', notes: []}]])}));
  assert.ok(TR.every(r => r.members.includes(m) === r.cls.includes('nt-mk-lit')), 'a trace through the member lights exactly the runs it travels');
  assert.ok(!/nt-lift|nt-end/.test(notationSVG(D, L).replace(/<style>[\s\S]*?<\/style>/, '')), 'the lift never reaches an export');
  assert.equal(notationSVG(D, L), notationSVG(D, notationLayout(D, {arrangement: 'layered'})), 'the export is the same every time');
  // Two records of one fact: one line with its mark once, two relationships each with its own hit, Tab stop and record;
  // the second's qualifier is not drawn again; the Key explains it. A composition fan splits as a plain T.
  const el = id => ({id, kind: 'physicalApp', kicker: 'Physical application component', family: 'application', layer: 'physical', level: 2, title: 'Part ' + id, fullTitle: '', sub: '', ref: id, group: null, hatched: false});
  const rel = (id, from, to, kind, extra = {}) => ({id, from, to, label: '', kind, family: styleOf(kind).family, up: !!styleOf(kind).up, ...extra});
  const lay = (nodes, edges) => { const X2 = {scene: {id: 'logical', title: 'Synthetic', standard: 'test', arrangement: 'tree', purpose: '', audience: ''}, nodes: nodes.map(el), groups: [], edges, notes: [], header: {model: 'Synthetic'}, counts: {}}; return [X2, notationLayout(X2, {arrangement: 'tree'})]; };
  const [F, FL] = lay(['a', 'b'], [rel('f1', 'a', 'b', 'flow', {label: 'Check', qualifier: 'REST', record: {id: 'INT-9'}}), rel('c:f2', 'a', 'b', 'flow', {label: 'Check', qualifier: 'REST'})]);
  assert.equal(FL.bundles[0]?.end, 'both', 'two records of one flow are one line');
  check(F, FL, 'two records of one flow');
  const FP = svgParts(F, FL, {interactive: true}), saidF = id => unesc(new RegExp(`data-nt-edge="${id}" role="button" tabindex="0" aria-label="([^"]*)"`).exec(FP.hits)[1]);
  assert.ok(saidF('f1').endsWith('this record: INT-9.') && saidF('c:f2').endsWith('this record: f2.'), 'each record reads as its own: ' + saidF('f1') + ' | ' + saidF('c:f2'));
  assert.equal((FP.edges.match(/ marker-(?:start|end)="/g) || []).length, 1, 'the flow’s head is drawn once'); assert.equal((FP.edges.match(/class="nt-qual"/g) || []).length, 1, 'and its qualifier once');
  assert.ok(legendData(F, FL).marks.some(m2 => m2.id === 'duplicate' && /recorded more than once/.test(m2.text)) && !/class="nt-qual">×2</.test(notationSVG(F, FL)), 'the Key explains one line for several records; its sample is a plain line, since no line carries a ×2 mark (the review of round 10)');
  // One fact is decided on the full word and qualifier: two relationships whose words shorten alike stay two lines.
  const long = n => 'Check the identity and integrity of the request before it reaches the ledger ' + n;
  const [Q, QL] = lay(['a', 'b'], [rel('q1', 'a', 'b', 'flow', {label: long(1), fullLabel: long(1), qualifier: 'REST over mutual TLS 1', fullQualifier: 'REST over mutual TLS 1'}), rel('q2', 'a', 'b', 'flow', {label: long(1), fullLabel: long(2), qualifier: 'REST over mutual TLS 1', fullQualifier: 'REST over mutual TLS 2'})]);
  assert.equal(QL.bundles.length, 0, 'two relationships that differ only beyond the shortened word and qualifier are two lines, not one fact');
  assert.equal((svgParts(Q, QL).edges.match(/<g class="nt-edge/g) || []).length, 2, 'and both are drawn');
  // Every marker's shape lies at or before its refX, so a start mark (orient auto-start-reverse) stands outside the box.
  for (const [m, body, refX] of MARKERS) { const far = Math.max(...[...body.matchAll(/(?:M|L| )(\d+(?:\.\d+)?) /g)].map(x => +x[1]), ...[...body.matchAll(/cx="(\d+)"[^>]*r="(\d+)"/g)].map(x => +x[1] + +x[2])); assert.ok(far <= refX, `the ${m} marker's shape reaches x=${far}, beyond its refX ${refX}: it would be drawn inside the element`); }
  const [C, CL] = lay(['w', 'p1', 'p2', 'p3'], ['p1', 'p2', 'p3'].map(p2 => rel('c-' + p2, 'w', p2, 'composes', {label: 'composes', ends: 'none'})));
  assert.ok(CL.bundles.length === 1 && !CL.bundles[0].dotted, 'a composition fan is one undotted bundle');
  check(C, CL, 'a composition fan');
  const CP = svgParts(C, CL);
  assert.equal((CP.edges.match(/<circle class="nt-join"/g) || []).length, 0, 'a composition fan splits as a plain T, without a dot');
  assert.equal((CP.edges.match(/ marker-start="url\(#nt-diamond-/g) || []).length, 1, 'under one diamond');
  assert.ok(legendData(C, CL).marks.some(m2 => m2.id === 'tree') && !legendData(C, CL).marks.some(m2 => m2.id === 'bundle'), 'the Key explains the plain T and claims no join dot');
  // The reading packet says which line a relationship is drawn on, and the measures what was drawn together.
  pass(`round 10: lines drawn together are drawn once, every relationship keeps its own (${tally.pictures} pictures, ${tally.bundles} bundles, ${tally.runs} runs, ${tally.dots} join dots, ${tally.phased} dashed runs phased from the shared port, ${tally.empty} members ending on a run): one g.nt-edge, one full-route hit and Tab stop and a reading naming its line per relationship, in model order; one g.nt-bundle per bundle before its first member; a run per run with its members, its dash in phase and the shared end's mark once; only the far end's mark on a member's branch, its dash in step with the trunk; ${tally.bhits} pointer-only fan hits after every relationship's; state on a run derived from the relationships that travel it; the lift (screen only) with the selected route ringed; two records of one fact one line with one head and one qualifier, each record its own reading; a composition fan a plain T under one diamond`);
}

// Crossing separations are an ink convention, not a change to the model's path or the reader's hit target.
{
  const h = {id: 'h', pts: [[0, 50], [100, 50]]}, v = {id: 'v', pts: [[50, 0], [50, 100]]};
  const X = {edges: [h, v], bundles: []}, gaps = crossingSeparations(X);
  assert.equal(gaps.length, 1); assert.equal(gaps[0].owner, h); assert.deepEqual(gaps[0].points.map(({x, y}) => [x, y]), [[50, 50]], 'only the horizontal line has a visible gap');
  assert.equal(crossingSeparations({edges: [h, {...v, pts: [[50, 45], [50, 100]]}], bundles: []}).length, 0, 'an intersection near an endpoint is left alone');
  assert.equal(crossingSeparations({edges: [h, v, {id: 'v2', pts: [[55, 0], [55, 100]]}], bundles: []}).length, 0, 'close crossings never merge into a long visual break');
  const same = {edges: [{...h, bundle: 'b'}, {...v, bundle: 'b'}], bundles: [{id: 'b', members: ['h', 'v'], runs: [{pts: h.pts, members: ['h']}, {pts: v.pts, members: ['v']}]}]};
  assert.equal(crossingSeparations(same).length, 0, 'runs of one joined line are never split by a separation');
  assert.equal(crossingSeparations({edges: Array.from({length: 97}, (_, i) => ({id: String(i), pts: [[0, i], [100, i]]})), bundles: []}).length, 0, 'a very large diagram skips crossing masks');
  const D = notationDiagram(project, 'application'), L = notationLayout(D, {arrangement: 'tree'}), screen = svgParts(D, L, {interactive: true}), exported = notationSVG(D, L);
  assert.ok(crossingSeparations(L).length > 0 && screen.defs.includes('mask-type="luminance"') && screen.edges.includes('mask="url(#nt-separation-'), 'screen lines use the bounded mask');
  assert.ok(exported.includes('mask-type="luminance"') && /mask="url\(#[^)]*-separation-/.test(exported) && exported.includes('A small gap separates'), 'the export draws and explains exactly the same crossing convention');
  assert.equal((screen.hits.match(/class="nt-hit"/g) || []).length, D.edges.length, 'every relationship still has its full-route keyboard hit');
  pass('independent orthogonal crossings get bounded line separations in screen and export; near ends, clusters and joins stay intact; large scenes skip masks; every relationship retains its full-route hit');
}

assert.equal(JSON.stringify(project), before, 'the project is not changed');
console.log(JSON.stringify({suite: 'standard diagrams (projection)', passed: checks.length, checks}, null, 2));
