// Figure integrity (round 24, F1 and D-24-07). Every figure the SDD draws is read the way a tool outside AIW reads an SVG
// file, and held to what it says it draws:
//   1. one SVG root: exactly one <svg in the figure, so a reader that takes a figure up to its first </svg> (the lazy
//      /<svg[\s\S]*?<\/svg>/) gets all of it; clipping is drawn with clipPath, never a nested <svg>, and the HTML
//      edition's stylesheet sizes the figure's own root (.model-figure > svg), never what is inside it;
//   2. the elements: as many g.nt-node as the figure says it draws, each with a title of its own and a visible name;
//   3. the relationships: as many g.nt-edge as the figure says it draws, each naming its two ends, both drawn;
//   4. the print: no label under 7 pt at the A4 text width (figureLabels);
//   5. the folded groups: a group drawn as one element is a list box that names up to six of its members, the most
//      connected first, then "and N more", every name one of the group's own (the C4 figures six a box, or three where a
//      level fits no page with six, which the footer says; the chapter figures, like the screen, fewer a box the more
//      groups an overview holds: figure-budget.js listFor); the overview's caption names every grouping family it uses;
//      every C4 figure stands on one page;
//   6. the labels (round 24 part 3): no drawn word of a line, qualifier or cardinality over another (each read at its
//      anchor with the layout's own width rule, notation-layout.js labelWidth and tagBoxes); where one had no clear place
//      the print leaves it out and the footer counts it.
// On two designs, generic names only: (a) sdd-fixtures.mjs largeProject (1,400 requirements, components that name their
// containers, three environments), and (b) a design shaped like the one AIW drafts from a large register
// (figures-at-size-fixture.mjs buildDraftedShapeProject: every component in the one container its compute need derives,
// no container named, one zone holding every placement, parties of several kinds), drawn with no module (as a drafted
// design is today) and with Chapter 4 responsibility groups. On (b) the folds read as designed: the context groups its
// parties by party kind with the actors as one group, the components by module (or by component kind where no module
// holds them) and the deployment's one zone by the same, never one box for the whole.
// Run: npm run test:figures-integrity
import assert from 'node:assert/strict';
import {largeProject, syntheticImport, blankProject, modularProject, FIXTURE_AT} from './sdd-fixtures.mjs';
import {buildDraftedShapeProject, DRAFTED_COUNTS, buildModuleDesignProject, buildModuleRegister} from './figures-at-size-fixture.mjs';
import {settleDocument, handOver} from './public/document-memo.js';
import {architectureFigureSet, sddDocument, legacyFigureSet} from './public/sdd-document.js';
import {c4Diagrams, modulesInBody, BODY_MODULES, moduleHomes, CONTAINER_LINKS} from './public/sdd-c4.js';
import {figureLabels, PRINT, PAGES, moduleMapFigures, MAP_MODULES} from './public/sdd-figures.js';
import {moduleTree} from './public/module-model.js';
import {recordModules, recordAttachments} from './public/module-scope.js';
import {PARTY_KINDS} from './public/interfaces-domain.js';
import {applyRealisationCommand} from './public/realisation-domain.js';
import {applyRequirementsCommand} from './public/requirement-commands.js';
import {foldDiagram, LIST_MAX, LIST_FEWER, listFor} from './public/figure-budget.js';
import {renderSDD} from './public/sdd-renderer.js';
import {notationDiagram, notationScenes} from './public/notation-model.js';
import {notationLayout, labelWidth, charW, overlaps} from './public/notation-layout.js';
import {svgParts, PRINT_FLOOR} from './public/notation-svg.js';

const checks = [], measured = {}, began = Date.now();
const pass = name => { checks.push(name); console.log('PASS', name, '(' + Math.round((Date.now() - began) / 1000) + ' s)'); };
const unesc = s => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attr = (tag, name) => { const m = new RegExp('\\s' + name + '="([^"]*)"').exec(tag); return m ? unesc(m[1]) : null; };

// The figure as a tool reads it: its tags in order, each element (g.nt-node) with its own titles (the <title> children of
// the g itself), its visible name (the text of its nt-title or nt-cap) and its list lines, and each relationship (g.nt-edge)
// with its ends.
function readFigure(svg) {
  const nodes = [], edges = [], stack = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|[^>"])*?)(\/?)>|([^<]+)/g)) {
    if (m[5] != null) { for (const x of stack) if (x.collect) x.collect(m[5], stack); continue; }
    const [whole, close, tag, , self] = m;
    if (close) { const top = stack.pop(); if (top?.done) top.done(); continue; }
    const at = {tag, whole};
    if (tag === 'g' && /\sclass="nt-node[\s"]/.test(whole)) {
      const n = {id: attr(whole, 'data-nt-node'), fold: /\sclass="[^"]*\bnt-fold\b/.test(whole), titles: [], name: '', lines: [], depth: stack.length};
      nodes.push(n); at.node = n;
    }
    if (tag === 'g' && /\sclass="nt-edge[\s"]/.test(whole)) edges.push({id: attr(whole, 'data-nt-edge'), from: attr(whole, 'data-nt-from'), to: attr(whole, 'data-nt-to')});
    const owner = [...stack].reverse().find(x => x.node)?.node;
    if (owner && tag === 'title' && stack.length === owner.depth + 1) { let text = ''; at.collect = (t, st) => { if (st[st.length - 1] === at) text += t; }; at.done = () => owner.titles.push(unesc(text).trim()); }
    if (owner && tag === 'text' && /\sclass="(?:nt-title|nt-cap)(?:\s[^"]*)?"/.test(whole)) { at.collect = t => { owner.name += unesc(t); }; }
    if (owner && tag === 'text' && /\sclass="nt-sub nt-li[\s"]/.test(whole)) { let text = ''; at.collect = t => { text += t; }; at.done = () => owner.lines.push({text: unesc(text).trim(), more: /nt-li-more/.test(whole)}); }
    if (!self) stack.push(at);
  }
  return {nodes, edges};
}

// Each figure held to what it says (1 to 4). `D` is the diagram the figure's level draws (for its members' names).
function holds(f, tag) {
  const svg = f.svg, where = `${tag} · figure ${f.n} (${f.key || f.scene}, ${f.role})`;
  assert.equal((svg.match(/<svg/g) || []).length, 1, where + ': exactly one <svg (no nested svg)');
  assert.equal(/<svg[\s\S]*?<\/svg>/.exec(svg)?.[0], svg, where + ': a lazy read to the first </svg> returns the whole figure');
  assert.ok(svg.startsWith('<svg ') && svg.endsWith('</svg>'), where + ': the figure is its root');
  const R = readFigure(svg);
  assert.equal((svg.match(/class="nt-node/g) || []).length, f.elements, where + `: ${f.elements} elements said, as many g.nt-node drawn`);
  assert.equal(R.nodes.length, f.elements, where + ': every element read');
  for (const n of R.nodes) {
    assert.ok(n.titles.some(t => t.length > 0), where + ': element ' + n.id + ' has a title of its own');
    assert.ok(n.name.replace(/\s+/g, ' ').trim().length > 0, where + ': element ' + n.id + ' shows its name');
  }
  const drawn = new Set(R.nodes.map(n => n.id));
  assert.equal(R.edges.length, f.relationships, where + `: ${f.relationships} relationships said, as many g.nt-edge drawn`);
  for (const e of R.edges) assert.ok(drawn.has(e.from) && drawn.has(e.to), where + ': relationship ' + e.id + ' joins two drawn elements (' + e.from + ' → ' + e.to + ')');
  const m = figureLabels(svg, {widthMm: f.print.widthMm});
  assert.ok(m.minPt >= PRINT.minPt, where + `: smallest label ${m.minPt} pt at ${f.print.widthMm} mm (bound ${PRINT.minPt} pt)`);
  labelsClear(svg, where);
  return {R, minPt: m.minPt};
}
// 6. The drawn labels of a figure, each clear of every other by more than a pixel: a line's word (notation-svg.js draws
// it at its middle, 4 px above the line its box stands on: placeLabels' box is labelWidth wide and 11 px high, 13 px above
// that line), a qualifier and a cardinality (tagBoxes: at the print floor, 12 px high).
function labelsClear(svg, where) {
  const boxes = [];
  for (const m of svg.matchAll(/<text x="([-\d.]+)" y="([-\d.]+)" class="nt-elabel" text-anchor="middle">([\s\S]*?)<\/text>/g)) { const t = unesc(m[3].replace(/<[^>]*>/g, '')), w = labelWidth(t); boxes.push({t, x: Number(m[1]) - w / 2, y: Number(m[2]) + 4 - 13, w, h: 11}); }
  for (const m of svg.matchAll(/<text x="([-\d.]+)" y="([-\d.]+)" class="(?:nt-qual|nt-card)"(?: text-anchor="(start|end|middle)")?>([\s\S]*?)<\/text>/g)) { const t = unesc(m[4]), w = Math.round(charW(t, PRINT_FLOOR) + 2), x = Number(m[1]); boxes.push({t, x: m[3] === 'end' ? x - w : x, y: Number(m[2]) - 10, w, h: 12}); }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) assert.ok(!overlaps(boxes[i], boxes[j], 1), where + `: the labels "${boxes[i].t}" and "${boxes[j].t}" are clear of each other`);
  return boxes.length;
}
const nameOf = n => (n.ref && n.ref !== n.title ? n.ref + ' ' : '') + n.title;
// A list line names a member when it is the member's reference and title, or their start cut with an ellipsis.
const names = (line, n) => { const full = nameOf(n); return line === full || (line.endsWith('…') && full.startsWith(line.slice(0, -1).trimEnd())); };

// 5. The folded groups of a level: every aggregate a list box of its own members, an overview's caption naming every
// family it groups by. `D` is the level's diagram, `p` the project.
function listsHold(f, D, p, R, tag) {
  const where = `${tag} · figure ${f.n} (${f.key}, ${f.role})`, byId = new Map(D.nodes.map(n => [n.id, n]));
  const F = f.role === 'overview' || f.role === 'detail' ? foldDiagram(D, {project: p, budget: f.print.budget}) : null;
  let boxes = 0;
  for (const n of R.nodes.filter(x => x.fold)) {
    boxes++;
    const listed = n.lines.filter(l => !l.more), more = n.lines.find(l => l.more);
    assert.ok(listed.length >= 1 && listed.length <= LIST_MAX, where + ': ' + n.id + ' names 1 to ' + LIST_MAX + ' members (' + listed.length + ')');
    for (const l of listed) assert.ok([...byId.values()].some(x => names(l.text, x)), where + ': ' + n.id + ' names an element of the picture: ' + l.text);
    // In an overview the group is the fold's own: its lines name its members, and "and N more" counts the rest.
    const g = f.role === 'overview' ? F.groups.find(x => 'fold:' + x.key === n.id) : null, most = f.print.list ?? LIST_MAX;
    if (g) {
      const members = g.members.map(id => byId.get(id));
      for (const l of listed) assert.ok(members.some(x => names(l.text, x)), where + ': ' + n.id + ' names its own members: ' + l.text);
      assert.equal(listed.length, Math.min(most, g.count), where + ': ' + n.id + ' names ' + Math.min(most, g.count) + ' of its ' + g.count + ' members');
      assert.equal(more?.text || '', g.count > most ? `and ${(g.count - most).toLocaleString('en-GB')} more` : '', where + ': ' + n.id + ' counts the rest');
      const degree = id => D.edges.filter(e => e.from === id || e.to === id).length, first = members.find(x => names(listed[0].text, x));
      assert.ok(members.every(x => degree(x.id) <= degree(first.id)), where + ': ' + n.id + ' names the most connected first');
    }
  }
  if (f.role === 'overview') {
    const used = [...new Set(F.groups.filter(g => g.count > 1).map(g => g.family))];
    assert.ok(boxes >= 1 && boxes === F.groups.filter(g => g.count > 1).length, where + ': every group of several elements is a list box (' + boxes + ')');
    for (const fam of used) assert.ok(new RegExp('overview by [^:]*\\b' + ({kind: 'element kind', 'requirement-group': 'requirement group', 'component-kind': 'component kind', 'party-kind': 'party kind', external: 'external system', boundary: 'trust boundary', lane: 'swimlane', family: 'capability family', record: 'data definition'}[fam] || fam)).test(f.caption), where + ': the caption names the ' + fam + ' family: ' + f.caption);
  }
  return boxes;
}
// The diagram a C4 figure's level draws.
// (round 24: the module map is a scene of its own, drawn from the project)
const levelOf = (C, key, p) => (key.startsWith('chapter:') ? notationDiagram(p, key.slice(8)) : key === 'module-map' ? notationDiagram(p, 'module-map') : key === 'context' ? C.context : key === 'container' ? C.container : key === 'deployment' ? C.deployment : C.components.find(x => 'component:' + (x.container.ref || x.container.id) === key)?.D);

// The SDD's figures of one design, body and annex, held to (1) to (5); and its HTML edition, each figure one root.
function design(p, tag) {
  const C = c4Diagrams(p), body = architectureFigureSet(p), annex = architectureFigureSet(p, {annex: true}), seen = new Map();
  for (const f of [...body.figures, ...annex.figures]) if (!seen.has(f.sha256)) seen.set(f.sha256, f);
  let worst = Infinity, boxes = 0;
  for (const f of seen.values()) {
    const {R, minPt} = holds(f, tag); worst = Math.min(worst, minPt); boxes += listsHold(f, levelOf(C, f.key, p), p, R, tag);
    // Each stands on one page, portrait or landscape, list boxes and all (the fit rule names fewer members, then folds again).
    assert.ok(f.print.fits && f.print.heightMm <= PAGES[f.print.orientation].heightMm, `${tag} · figure ${f.n} (${f.key}, ${f.role}): on one ${f.print.orientation} page (${f.print.heightMm} mm)`);
    const footer = [...f.svg.matchAll(/<text[^>]*class="nt-foot"[^>]*>([^<]*)<\/text>/g)].map(m => unesc(m[1])).join(' ');
    if (f.print.list != null) assert.ok((f.key.startsWith('chapter:') ? [LIST_FEWER, 2, 1] : [LIST_MAX, LIST_FEWER]).includes(f.print.list) && (f.print.list === LIST_MAX || footer.includes(`each folded group names up to ${f.print.list} of its members`)), `${tag} · figure ${f.n}: fewer names a group are said in its footer: ${footer}`);
  }
  // The HTML edition: every figure it draws is one root, sized by the figure's own rule.
  const doc = sddDocument(p), html = renderSDD(doc.markdown, null, {figures: doc.figures}), drawn = [...html.matchAll(/<figure class="model-figure notation-figure"[\s\S]*?<\/figure>/g)].map(m => m[0]);
  assert.ok(drawn.length === doc.figures.figures.length && drawn.every(x => (x.match(/<svg/g) || []).length === 1), tag + ': the HTML edition draws ' + drawn.length + ' figures, each one <svg>');
  assert.ok(!/\.model-figure svg\{/.test(html) && /\.model-figure > svg\{width:100%;height:auto;display:block/.test(html), tag + ': the stylesheet sizes each figure\'s own root (.model-figure > svg), never an svg inside it');
  return {C, body, annex, figures: seen.size, worst, boxes};
}
const overviewOf = (set, key) => set.figures.find(f => f.key === key && f.role === 'overview');

// ---------------------------------------------------------------- (a) the large project
{
  const t0 = Date.now(), q = settleDocument((await largeProject()).document);
  const r = design(q, 'large'), legacy = legacyFigureSet(q);
  // The chapter figures a baseline frozen before round 12 carries are drawn by the same renderer: each one root too. They
  // set no number of names, so an overview names as the screen's does: fewer a box the more groups it holds (listFor).
  for (const f of legacy.figures.filter(x => x.scene !== 'traceability')) {
    const over = f.role === 'overview' ? f : f.role === 'detail' ? legacy.figures.find(x => x.n === f.parent) : null;
    const {R} = holds(f, 'large (chapter figures)'), most = over ? listFor(over.fold.groups.length) : LIST_MAX;
    for (const n of R.nodes.filter(x => x.fold)) assert.ok(n.lines.filter(l => !l.more).length <= most, `large (chapter figures) · figure ${f.n} (${f.scene}, ${f.role}): ${n.id} names at most ${most} members`);
  }
  assert.ok(legacy.figures.every(f => (f.svg.match(/<svg/g) || []).length === 1), 'large: the traceability matrix is one root as well');
  Object.assign(measured, {largeFigures: r.figures, largeChapterFigures: legacy.figures.length, largeWorstPt: r.worst, largeListBoxes: r.boxes, largeMs: Date.now() - t0});
  pass(`the large project: all ${r.figures} SDD figures (body and annex) and its ${legacy.figures.length} chapter figures are each one SVG root that a lazy read returns whole, draw as many elements and relationships as they say, every element titled and named, every relationship's two ends drawn, no label under ${PRINT.minPt} pt (smallest ${r.worst} pt); ${r.boxes} folded groups are list boxes naming their own members, the most connected first, and every overview's caption names the families it groups by; the chapter figures name as the screen does, fewer a box the more groups an overview holds; the HTML edition draws each figure as one root sized by .model-figure > svg`);
}

// ---------------------------------------------------------------- (b) a design shaped like a drafted one
for (const modules of [0, 12]) {
  const tag = modules ? `drafted shape with ${modules} modules` : 'drafted shape';
  const built = await buildDraftedShapeProject({counts: {modules}}), p = settleDocument(built.document), c = built.counts;
  assert.ok(c.components === DRAFTED_COUNTS.components && c.parties === DRAFTED_COUNTS.parties && c.zones === 1 && c.placements === DRAFTED_COUNTS.components && c.modules === modules, tag + ': the fixture holds what it says ' + JSON.stringify(c));
  const r = design(p, tag), {C, body} = r;
  // The shape: one container every component derives, none named; one zone holding every placement; parties of several kinds.
  assert.ok(C.reading.containers.length === 1 && C.reading.containers[0].derived && C.reading.containers[0].components.length === c.components && !p.realisation.components.some(x => x.containerId), tag + ': every component in the one container its compute need derives, none named');
  assert.ok(new Set(p.interfaces.parties.map(x => x.kind || '')).size >= 4, tag + ': parties of several kinds');
  // The context: the system, the parties by their kind, the actors as one group (E).
  const ctx = overviewOf(body, 'context'), cf = foldDiagram(C.context, {project: p, budget: ctx.print.budget});
  const kinds = cf.groups.filter(g => g.family === 'party-kind'), actors = cf.groups.filter(g => g.key === 'kind:actor');
  assert.ok(kinds.length >= 4 && actors.length === 1 && actors[0].count === C.context.nodes.filter(n => n.type === 'actor').length && cf.groups.some(g => g.count === 1 && g.members[0] === C.context.nodes.find(n => n.type === 'system')?.id), tag + ': the context overview draws the system, ' + kinds.length + ' kinds of party and the actors as one group');
  assert.match(ctx.caption, /overview by party kind and element kind: /, tag + ': the context caption names both families');
  // The components: by module where the responsibilities stand in one, else by component kind; parties by their kind, as
  // wherever parties fold (B; round 24 part 2, D-24-07: party kinds at the container and component levels too).
  for (const x of C.components) {
    const o = overviewOf(body, 'component:' + x.container.ref); if (!o) continue;
    const cf2 = foldDiagram(x.D, {project: p, budget: o.print.budget}), want = modules ? 'module' : 'component-kind';
    assert.ok(cf2.groups.filter(g => g.count > 1 && g.family === want).length >= 3 && cf2.groups.some(g => g.family === 'party-kind') && !cf2.groups.some(g => g.family === 'external'), tag + ': the component overview groups the components by ' + want + ' and the parties by their kind (' + cf2.by.join(', ') + ')');
    assert.match(o.caption, new RegExp('overview by ' + (modules ? 'module' : 'component kind') + ' and party kind: '), tag + ': its caption names both families');
    assert.ok(cf2.groups.filter(g => g.family === want).reduce((t, g) => t + g.count, 0) === x.container.components.length, tag + ': every component of the container is in one of them');
  }
  // The deployment: its one zone subdivided by module or component kind, never one box (E).
  const dep = overviewOf(body, 'deployment'), df = foldDiagram(C.deployment, {project: p, budget: dep.print.budget});
  assert.ok(df.groups.length >= 3 && df.within === 'Production zone' && df.groups.every(g => g.family === (modules ? 'module' : 'component-kind') || g.family === 'other'), tag + ': the deployment overview subdivides the one zone into ' + df.groups.length + ' groups (' + df.by.join(', ') + ')');
  assert.match(dep.caption, new RegExp('overview by ' + (modules ? 'module' : 'component kind') + ' within Production zone: '), tag + ': its caption names the family and the zone');
  // On screen (the same renderer): the chapters' first pictures of this design nest no svg either.
  for (const ch of [1, 5, 10]) { const sc = notationScenes(ch)[0], D = notationDiagram(p, sc.id), L = notationLayout(D, {arrangement: sc.arrangement}), P = svgParts(D, L, {interactive: true}); assert.ok(!/<svg/.test(Object.values(P).join('')), tag + ': Chapter ' + ch + ' on screen draws no nested svg'); }
  measured[modules ? 'draftedModules' : 'drafted'] = {figures: r.figures, worstPt: r.worst, listBoxes: r.boxes, levels: body.levels.map(l => ({key: l.key, budget: l.budget, groups: l.fold?.groups ?? null, by: l.fold?.by ?? null}))};
  pass(`${tag} (${c.components} components in one derived container, ${c.parties} parties of several kinds, ${c.placements} placements in one zone): all ${r.figures} figures hold as (a) (smallest label ${r.worst} pt, ${r.boxes} list boxes); the context overview draws the system, ${kinds.length} kinds of party and the actors as one group; the components group by ${modules ? 'module' : 'component kind'} and the parties by their kind; the deployment subdivides its one zone into ${df.groups.length} groups; each caption names every family it uses`);
}

// ---------------------------------------------------------------- (c) figures by module (round 24 part 2, D-24-07)
// A design drafted by module (figures-at-size-fixture.mjs buildModuleDesignProject: the synthetic register imported, its
// module structure proposed and accepted, one Chapter 4 group per module realising it, the components in them, every
// component on the one shared compute, two zones of which the first holds all but six placements).
// A module is shown when a box's name is its title (its lines, as the box wraps them, read together) or the start of it
// cut with an ellipsis, or when a box of others lists it.
// A record is placed in the modules module-scope.js places it in, as every reader that lays the design out by module
// places it (the SDD's Section 4 among them): by recordModules, else by what it touches (recordAttachments). Where no
// component is in two modules (each module is then home to every component placed in it), a module's component figure
// draws inside its boundary the components placed in the module, and the external systems placed there (round 24 part 3:
// listed in one box per kind).
const placement = P => { const RM = recordModules(P), RA = recordAttachments(P); return id => (RM.get(id)?.modules?.length ? RM.get(id).modules : RA.get(id)?.modules || []); };
const listedIn = (D, type) => D.nodes.filter(n => n.type === type).flatMap(n => n.members || []).sort();
function placedAsScoped(P, K, tag) {
  const at = placement(P), ids = ns => ns.map(n => n.id).sort();
  for (const x of K.components) {
    const u = x.module;
    assert.deepEqual(ids(x.D.nodes.filter(n => n.group === u.id)), P.realisation.components.filter(k => at(k.id).includes(u.id)).map(k => k.id).sort(), tag + ': the figure of ' + u.ref + ' draws inside its boundary the components placed in the module');
    assert.deepEqual(listedIn(x.D, 'party-kind'), P.interfaces.parties.filter(k => at(k.id).includes(u.id)).map(k => k.id).sort(), tag + ': the figure of ' + u.ref + ' lists the external systems placed in the module, in one box per kind');
  }
}
// Round 24 part 3: a module's component figure draws in full the components it is home to (moduleHomes: a platform
// service in its platform module, else its first module; section 4 prints each in full there), and only the lines that
// touch them: everything else stands outside as one box per end they reach (the module home to another component, the
// components in no module, a kind of external system, a store), with one line per own component and box. The external
// systems listed are those its own components exchange with.
function homesDrawn(P, K, tag) {
  const H = moduleHomes(P), ids = ns => ns.map(n => n.id).sort(), isParty = new Set(P.interfaces.parties.map(x => x.id));
  for (const x of K.components) {
    const u = x.module, own = ids(x.D.nodes.filter(n => n.group === u.id)), mine = new Set(own), where = tag + ': the figure of ' + u.ref;
    assert.deepEqual(own, P.realisation.components.filter(k => H.homeOf(k.id) === u.id).map(k => k.id).sort(), where + ' draws inside its boundary the components it is home to');
    assert.ok(x.D.edges.every(e => mine.has(e.from) || mine.has(e.to)), where + ': every line touches one of its own components');
    assert.ok(x.D.nodes.every(n => mine.has(n.id) || n.type !== 'component'), where + ': every other component stands in the box of its home module');
    const pairs = x.D.edges.map(e => e.kind + ':' + [e.from, e.to].sort().join('|'));
    assert.equal(new Set(pairs).size, pairs.length, where + ': one line per own component and box (of each kind)');
    const reached = [...new Set(P.interfaces.contracts.flatMap(c => (mine.has(c.from) ? [c.to] : mine.has(c.to) ? [c.from] : [])).filter(id => isParty.has(id)))].sort();
    assert.deepEqual(listedIn(x.D, 'party-kind'), reached, where + ' lists the external systems its own components exchange with, in one box per kind');
  }
}
const bare = s => String(s).replace(/\s+/g, '');
const shown = (R, title) => R.nodes.some(n => { const name = bare(n.name); return name === bare(title) || (name.endsWith('…') && bare(title).startsWith(name.slice(0, -1))); }) || R.nodes.some(n => n.lines.some(l => names(l.text, {title, ref: ''})));
{
  const built = await buildModuleDesignProject(), p = settleDocument(built.document), c = built.counts, T = moduleTree(p);
  const business = T.modules.filter(m => m.group.role !== 'platform'), platform = T.modules.filter(m => m.group.role === 'platform');
  assert.ok(T.modules.length === c.modules && c.modules >= 20 && platform.length >= 3 && T.state === 'accepted' && p.logical.groups.length === c.modules && p.logical.groups.every(g => g.requirementGroupIds?.length === 1), 'by module: the fixture holds what it says ' + JSON.stringify(c));
  const r = design(p, 'by module'), {C, body, annex} = r;
  // The module map opens section 5: figure 1, Chapter 1, one page; every business module named, in a box of its own or
  // in the box of the smallest; the platform band.
  const map = body.figures[0], M = readFigure(map.svg);
  assert.ok(map.key === 'module-map' && map.n === 1 && map.chapter === 1 && map.role === 'figure' && map.print.fits, 'by module: the module map is the first figure, on one page (' + map.print.heightMm + ' mm)');
  for (const m of business) assert.ok(shown(M, m.group.title), 'by module: the map names the business module ' + m.group.title);
  assert.ok(/data-nt-group="map:platform"/.test(map.svg) && />Platform modules</.test(map.svg) && platform.every(m => shown(M, m.group.title)), 'by module: the platform modules stand in their band');
  // The container level: the modules stand for the containers, and the figure says why.
  assert.ok(C.byModule && C.containerBy === 'module' && !C.reading.containers.some(k => k.components.length < c.components), 'by module: the one derived container holds every component, so the modules stand for the containers');
  const cont = body.figures.filter(f => f.key === 'container');
  assert.ok(cont.length && cont.every(f => /Containers by module/.test(f.caption)) && cont[0].text.includes(C.containerWhy) && C.container.nodes.filter(n => n.type === 'module').length === C.modules.modules.filter(u => u.components.length).length, 'by module: the container level draws every module that holds a component, and says why: ' + C.containerWhy);
  assert.ok(C.container.nodes.some(n => n.type === 'party-kind') && !C.container.nodes.some(n => n.type === 'party'), 'by module: the container level draws the external systems by their kind');
  // Level 3: one figure per module of two components or more, the BODY_MODULES largest in the body, every one in the annex.
  const many = C.modules.modules.filter(u => u.components.length > 1), keys = set => [...new Set(set.figures.filter(f => f.key.startsWith('component:')).map(f => f.key))].sort();
  assert.deepEqual(keys(annex), many.map(u => 'component:' + u.ref).sort(), 'by module: the annex draws one component figure per module of two components or more');
  assert.deepEqual(keys(body), [...modulesInBody(C.components)].map(x => 'component:' + x.container.ref).sort(), 'by module: the body draws the ' + Math.min(BODY_MODULES, many.length) + ' that hold the most');
  assert.equal(keys(body).length, Math.min(BODY_MODULES, many.length));
  for (const x of C.components) {
    const mine = x.D.nodes.filter(n => n.group === x.module.id);
    assert.ok(mine.length === x.module.components.length && mine.every(n => n.type === 'component') && x.D.groups.find(g => g.id === x.module.id)?.focus, 'by module: the figure of ' + x.module.title + ' draws its own components inside its boundary');
    for (const n of x.D.nodes.filter(n => n.id.startsWith('ctx:'))) assert.ok(n.listing?.list.length && n.listing.list.every(s => C.modules.moduleOf.get(s.id) === n.id.slice(4)), 'by module: a platform module stands as one box naming the services ' + x.module.title + ' uses');
  }
  // Placed as module-scope.js places records; the map draws a line from a module to the kind of every external system
  // its components exchange with (each box keeping every line here).
  placedAsScoped(p, C, 'by module');
  homesDrawn(p, C, 'by module');
  {
    const at = placement(p), rank = new Map(T.modules.map((m, i) => [m.group.id, i])), first = id => at(id).slice().sort((a, b) => rank.get(a) - rank.get(b))[0];
    const kindBox = id => { const pt = p.interfaces.parties.find(x => x.id === id); return pt ? 'map:parties:' + (PARTY_KINDS.includes(pt.kind) ? pt.kind : 'none') : null; };
    const want = new Set();
    for (const k of p.interfaces.contracts) { const a = kindBox(k.from), b = kindBox(k.to); if (a && !b && first(k.to)) want.add(a + '>' + first(k.to)); if (b && !a && first(k.from)) want.add(first(k.from) + '>' + b); }
    const D = notationDiagram(p, 'module-map', {map: {links: Infinity}}), got = [...new Set(D.edges.filter(e => e.from.startsWith('map:parties:') || e.to.startsWith('map:parties:')).map(e => e.from + '>' + e.to))].sort();
    assert.ok(want.size >= 3, 'by module: the fixture\'s components exchange with external systems (' + want.size + ' module and kind pairs)');
    assert.deepEqual(got, [...want].sort(), 'by module: the map draws a line from each module to the kind of each external system its components exchange with');
  }
  // A component in two modules (linked to a second module in Chapter 5) is in each, and has one home, its first module
  // (round 24 part 3): its home's figure draws it in full, saying which module shares it; the other module's figure names
  // it only in its home's box, and only where its own components use it; the container level counts it in its home, the
  // other module's box counts it as shared, and the notes say so. (The command runs on a copy: the design's own document
  // is settled, its derived values remembered.)
  {
    const isParty = new Set(p.interfaces.parties.map(x => x.id)), biz = C.components.filter(x => !x.module.platform), A = biz[0].module, B = biz.at(-1).module;
    const k = A.components.find(k => p.interfaces.contracts.some(c => (c.from === k.id && isParty.has(c.to)) || (c.to === k.id && isParty.has(c.from)))) || A.components[0];
    const P = settleDocument(applyRealisationCommand(structuredClone(p), {type: 'realisation.component', payload: {id: k.id, requirementGroupIds: [B.id]}}, FIXTURE_AT).document), K = c4Diagrams(P);
    const KA = K.components.find(x => x.module.id === A.id), KB = K.components.find(x => x.module.id === B.id), inA = KA.D.nodes.find(n => n.id === k.id), inB = KB.D.nodes.find(n => n.id === k.id);
    assert.ok(K.modules.shared === 1 && K.modules.moduleOf.get(k.id) === A.id && K.modules.modulesOf.get(k.id).join() === [A.id, B.id].join(), 'shared: the component is in both modules, the first in the tree\'s order first');
    const usesK = P.interfaces.contracts.some(c => (c.from === k.id && KB.module.home.some(o => o.id === c.to)) || (c.to === k.id && KB.module.home.some(o => o.id === c.from))), boxA = KB.D.nodes.find(n => n.id === 'ctx:' + A.id);
    assert.ok(moduleHomes(P).homeOf(k.id) === A.id && inA?.group === A.id && inA.sub.includes('shared with ' + B.ref) && !inB && (usesK ? boxA?.members.includes(k.id) : !boxA?.members.includes(k.id)), 'shared: drawn in full once, in its home\'s figure, saying which module shares it (' + inA?.sub + '); the other module\'s figure names it only in its home\'s box, where its own components use it');
    const box = id => K.container.nodes.find(n => n.id === id);
    assert.ok(box(A.id)?.listing.count === A.components.length && box(B.id)?.listing.count === B.components.length && /\b1 shared\b/.test(box(B.id)?.sub || '') && K.container.notes.some(t => t.startsWith('1 component is in more than one module')), 'shared: the container level counts it in its home, the other module\'s box counts it as shared, and the notes say so');
    homesDrawn(P, K, 'shared');
  }
  pass('by module, placed as module-scope.js places records (recordModules, then recordAttachments): each module figure draws the components and external systems placed in the module; the map draws a line from each module to the kind of each external system it exchanges with; a component in two modules is drawn in full once, in its home module\'s figure, named in the other only in its home\'s box, counted in its home at the container level, which says so');
  // The deployment: the zone over the budget split by module, the other zone kept whole.
  const dep = overviewOf(body, 'deployment'), df = foldDiagram(C.deployment, {project: p, budget: dep.print.budget});
  assert.ok(df.groups.filter(g => g.family === 'module' && g.title.startsWith('Zone A · ')).length >= 3 && df.groups.some(g => g.family === 'zone' && g.title === 'Zone B'), 'by module: the deployment splits Zone A by module and keeps Zone B (' + df.groups.map(g => g.title).slice(0, 4).join(', ') + ' …)');
  assert.match(dep.caption, /overview by module and zone: /, 'by module: the deployment caption names both families');
  // Section 5, by module: what the SDD's text prints, in reading order, with each level's figure numbers.
  const S = body.section5, levels = S.map(x => x.level);
  assert.deepEqual([...new Set(levels)], ['module-map', 'context', 'container', 'component', 'deployment', 'chapter-model'], 'by module: C4/deployment views retain their order, followed by complementary chapter models');
  for (const x of S) assert.deepEqual(x.figures, body.figures.filter(f => f.key === x.key).map(f => f.n), 'by module: section 5 entry ' + x.key + ' carries its figure numbers');
  const level3 = S.filter(x => x.level === 'component');
  assert.deepEqual(level3.map(x => x.module.id), T.modules.map(m => m.group.id), 'by module: level 3 lists every module once, in the tree\'s order');
  assert.ok(level3.every(x => x.by === 'module' && (x.figures.length ? x.body : x.annex || x.reason)), 'by module: each module is drawn in the body, left to the annex, or says why it has no figure');
  assert.ok(S.find(x => x.level === 'container').why === C.containerWhy, 'by module: the container entry says why the modules stand for the containers');
  // On screen: the map of this design nests no svg.
  { const D = notationDiagram(p, 'module-map'), L = notationLayout(D, {arrangement: 'grouped'}); assert.ok(!/<svg/.test(Object.values(svgParts(D, L, {interactive: true})).join('')), 'by module: the module map on screen draws no nested svg'); }
  measured.byModule = {figures: r.figures, worstPt: r.worst, map: body.levels.find(l => l.key === 'module-map')?.map, levels: body.levels.map(l => ({key: l.key, budget: l.budget, lines: l.lines ?? null, by: l.fold?.by ?? null}))};
  pass(`by module (${c.modules} modules, ${platform.length} of them platform, ${c.components} components on one shared compute, two zones): all ${r.figures} figures hold as (a) (smallest label ${r.worst} pt); the module map is figure 1 on one page, naming every business module and the platform band; the container level draws the ${C.container.nodes.filter(n => n.type === 'module').length} modules as its containers and says why; one component figure per module of two components or more (${many.length}: ${keys(body).length} in the body, all in the annex), each platform module one box naming the services used; the deployment splits its full zone by module; section 5 lists every level and module with its figure numbers`);
  // The same design where each module runs in a container of its own: the containers decide the levels again.
  const withContainers = settleDocument((await buildModuleDesignProject({containers: true})).document), K = c4Diagrams(withContainers), set = architectureFigureSet(withContainers);
  assert.ok(!K.byModule && K.containerBy === 'container' && K.reading.containers.length === c.modules && set.figures[0].key === 'module-map', 'with containers: the containers partition the components, so the levels read the containers (the module map still opens the section)');
  assert.ok(set.figures.filter(f => f.key.startsWith('component:')).every(f => K.components.some(x => 'component:' + x.container.ref === f.key && !x.module)) && set.section5.filter(x => x.level === 'component').every(x => x.by === 'container'), 'with containers: one component figure per container, as before');
  pass('with a container per module: the containers partition the components, so the container and component levels draw the containers as before; the module map still opens section 5');
}
// Straight after an import with modules, nothing designed: the map is drawn, its lines what the platform modules serve.
{
  const {document: imported} = await syntheticImport(blankProject('Synthetic modules imported'), {rows: 1400, choice: {domain: true, capabilityTheme: true}});
  const p = settleDocument(applyRequirementsCommand(handOver(imported), {type: 'requirements.modules-propose', payload: {}}, FIXTURE_AT, 'architect-a').document), T = moduleTree(p);
  const set = architectureFigureSet(p), D = notationDiagram(p, 'module-map');
  assert.ok(T.modules.length >= 20 && set.figures[0].key === 'module-map' && set.figures[0].print.fits && set.figures.slice(1).every(f => f.key === 'chapter:rationale' && f.print.fits), 'imported: the module map remains first and fits; only the actual requirement trace may follow');
  holds(set.figures[0], 'imported');
  assert.ok(D.edges.length && D.edges.every(e => e.kind === 'serves') && D.notes.some(t => /Nothing is drafted yet/.test(t)) && D.notes.some(t => /proposed by AIW, not yet accepted/.test(t)), 'imported: its lines are what the platform modules serve, and its notes say the structure is proposed');
  pass(`straight after an import (${T.modules.length} modules proposed, nothing designed): the module map leads section 5, on one page, with the saved requirement trace, its lines what the platform modules serve, its notes saying the structure is proposed`);
}
// ---------------------------------------------------------------- (d) at the register's scale (round 24 part 3)
// The synthetic register of the owner's shape (sdd-fixtures.mjs modularProject: the synthetic workbook imported with its
// module structure and drafted by the rules drafter, which drafts by module, with the shared services it drafts: a
// reporting service and an approval workflow realise requirements in every business module, so module-scope.js places
// them in all of them), its figures read as a tool reads them: (1) a module's component figure draws in full only the
// components it is home to, and every line touches one of them, so a shared service is drawn in full in one figure; (2)
// the container level draws one line per pair of boxes, its count for its word, each box keeping CONTAINER_LINKS lines at
// most and the notes counting the rest; (3) no drawn label over another (holds: labelsClear), on every figure; and the
// homes agree with section 4, which prints a shared component in full under its home and names it elsewhere.
{
  const {document} = await modularProject(), p = settleDocument(document), r = design(p, 'register'), {C} = r, Mo = C.modules, H = moduleHomes(p);
  const shared = [...Mo.modulesOf].filter(([, ms]) => ms.length > 1).map(([id]) => p.realisation.components.find(c => c.id === id));
  assert.ok(C.byModule && shared.length >= 2 && shared.some(c => Mo.modulesOf.get(c.id).length >= 8), 'register: the drafter\'s shared services stand in most modules (' + shared.map(c => c.title + ' ' + Mo.modulesOf.get(c.id).length).join(', ') + ')');
  homesDrawn(p, C, 'register');
  for (const c of shared) {
    const full = C.components.filter(x => x.D.nodes.some(n => n.id === c.id && n.group === x.module.id)).map(x => x.module.id);
    assert.deepEqual(full, [H.homeOf(c.id)], 'register: ' + c.title + ' is drawn in full in exactly one module\'s figure, its home\'s');
  }
  // The container level: one line per pair of boxes, at most CONTAINER_LINKS a box, a count for its word, the rest counted.
  const per = new Map(), pairs = new Set();
  for (const e of C.container.edges) { const k = [e.from, e.to].sort().join('|'); assert.ok(!pairs.has(k), 'register: the container level draws one line per pair of boxes (' + k + ')'); pairs.add(k); for (const id of [e.from, e.to]) per.set(id, (per.get(id) || 0) + 1); }
  assert.ok(C.container.edges.length && Math.max(...per.values()) <= CONTAINER_LINKS, 'register: each box of the container level keeps ' + CONTAINER_LINKS + ' lines at most (' + Math.max(...per.values()) + ')');
  assert.ok(C.container.edges.every(e => /^(?:[\d,]+ contracts?|uses(?:: [\d,]+)?)$/.test(e.label)), 'register: the container level\'s lines say their counts, never a contract\'s reference: ' + [...new Set(C.container.edges.map(e => e.label))].join(' | '));
  assert.ok(C.container.notes.some(t => /^[\d,]+ lighter lines? (?:is|are) not drawn: each box keeps 3 at most/.test(t)), 'register: the notes count the lines left out');
  // Section 4 prints each shared component in full under the same home.
  const md = sddDocument(p).markdown;
  for (const c of shared) assert.ok(md.includes(c.ref + ' · ' + c.title + ' (in full under ' + H.homeOf(c.id) + ' · '), 'register: section 4 prints ' + c.title + ' in full under ' + H.homeOf(c.id) + ', the module whose figure draws it');
  const comp = r.annex.figures.filter(f => f.key.startsWith('component:'));
  measured.register = {figures: r.figures, worstPt: r.worst, container: {boxes: C.container.nodes.length, lines: C.container.edges.length}, components: C.components.map(x => ({module: x.module.ref, own: x.module.home.length, boxes: x.D.nodes.length, lines: x.D.edges.length}))};
  pass(`at the register's scale (${p.realisation.components.length} components, ${Mo.modules.length} modules, ${shared.length} components shared, the most by ${Math.max(...shared.map(c => Mo.modulesOf.get(c.id).length))} modules): all ${r.figures} figures hold as (a), every drawn label clear of the others (smallest ${r.worst} pt); each of the ${C.components.length} module figures draws in full only the components it is home to, every line touching one (the largest ${Math.max(...C.components.map(x => x.D.nodes.length))} boxes, ${Math.max(...C.components.map(x => x.D.edges.length))} lines), so each shared service is drawn in full once, under the home section 4 prints it under; the container level draws ${C.container.edges.length} counted lines, ${CONTAINER_LINKS} a box at most (${comp.length} component figures in the annex)`);
}
// Twenty-five modules stand on one page each in a box of its own, naming at least one sub-module; forty fold their smallest.
for (const modules of [25, 40]) {
  const {document} = await buildModuleRegister({modules, requirements: modules * 24}), p = settleDocument(document), T = moduleTree(p);
  const M = moduleMapFigures(p, {stem: 'figures/map', where: 'Listed in section 4.'}), f = M.figures[0], R = holds({...f, key: 'module-map'}, modules + ' modules');
  assert.ok(T.modules.length === modules && f.print.fits && f.print.minLabelPt >= PRINT.minPt, modules + ' modules: the map stands on one page (' + f.print.heightMm + ' mm, ' + f.print.minLabelPt + ' pt)');
  if (modules <= MAP_MODULES) assert.ok(M.map.modules === modules && M.map.lines >= 1 && T.modules.every(m => shown(R.R, m.group.title)), modules + ' modules: every module in a box of its own, naming up to ' + (M.map.lines === 1 ? 'one sub-module' : M.map.lines + ' sub-modules'));
  else assert.ok(M.map.modules === MAP_MODULES && R.R.nodes.some(n => /^Otherbusinessmodules\(\d+\)/.test(bare(n.name))) && M.D.notes.some(t => /smallest modules stand together/.test(t)), modules + ' modules: the smallest stand together in one box, and the note says so');
  measured['map' + modules] = {lines: M.map.lines, drawn: M.map.modules, heightMm: f.print.heightMm, minPt: f.print.minLabelPt};
  pass(`${modules} modules, nothing designed: the module map stands on one page at ${f.print.minLabelPt} pt (${f.print.heightMm} mm), ${modules <= MAP_MODULES ? 'every module a box of its own naming up to ' + (M.map.lines === 1 ? 'one sub-module' : M.map.lines + ' sub-modules') : 'the smallest modules together in one box'}`);
}

console.log(JSON.stringify({suite: 'figure integrity', passed: checks.length, measured, checks}, null, 2));
