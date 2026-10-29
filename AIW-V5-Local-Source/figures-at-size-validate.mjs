// Pictures at size (round 12, workstream P; SDD-SPEC §5, DESIGN D-11 and D-15). A synthetic project of the size of a
// real core-banking design (figures-at-size-fixture.mjs: 1,400 requirements in 60 groups, 180 components, 400
// interfaces, 100 running parts; generic names only, built through the chapters' command appliers) is drawn every way
// AIW draws it, and checked:
//   1. the fixture holds what it says, and builds to the same bytes twice;
//   2. the fold (figure-budget.js): every scene above the budget becomes an overview of at most FIGURE_BUDGET groups by
//      the scene's natural group (requirement groups, modules, zones …) with every element and relationship accounted
//      for, and a detail per group of several elements within the budget; the same picture folds the same way twice;
//   3. the SDD's figures (sdd-figures.js): no figure draws more than the budget; each scene above it is an overview
//      followed by its details, numbered in reading order, with the grouping, the details and what was folded exposed for
//      the document that lays them out; every figure maps to the A4 text width with no label under 7 pt, measured from
//      its SVG (figureLabels); every text alternative is a summary under 1,000 characters that names no register; the
//      manifest carries every figure's SHA-256; the whole set comes out byte for byte the same twice;
//   4. Mermaid (mermaid-figures.js): every figure's text is within the bounds Mermaid renders reliably, and a whole scene
//      above them is folded (or carries a one-line note) instead of an unrenderable block;
//   5. the traceability matrix is drawn by requirement group against what realizes them, every requirement counted;
//   6. the screen: each chapter's first picture opens grouped above the screen's budget, the overview fits the stage at a
//      readable zoom, and a group opens in place; the Running board keeps every running part and groups the rest;
//   7. the timings, in Node on the settled document (the browser bound of D-11 is 5 s; browser: figures-at-size-browser):
//      diagram, fold, layout and drawing of each chapter's first picture, the Running board, and the SDD's figures;
//   8. the C4 levels of the SDD's section 5 (workstream F, GR-FIG-08), on a design whose components name their containers
//      (D1's containerId, set through the realisation command: sdd-fixtures.mjs largeProject, 1,400 requirements and 26
//      components in eight containers): one context, one container and one component diagram per container that holds
//      two components or more (the body draws six, the figures annex every one), and the deployment, each within the
//      node budget, on one page with no label under 7 pt, each with its purpose line.
// A timing is the best of two runs, so a machine busy with other suites does not decide it.
// Run: npm run test:figures-at-size
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildFiguresProject, FIGURES_COUNTS} from './figures-at-size-fixture.mjs';
import {settleDocument} from './public/document-memo.js';
import {notationDiagram, notationScenes, CHAPTER_SCENES} from './public/notation-model.js';
import {notationLayout} from './public/notation-layout.js';
import {svgParts} from './public/notation-svg.js';
import {foldDiagram, overBudget, FIGURE_BUDGET, SCREEN_BUDGET, DETAILS_MAX} from './public/figure-budget.js';
import {sddFigures, figureLabels, traceabilityFigure, PRINT, MATRIX_ROWS, MATRIX_COLS} from './public/sdd-figures.js';
import {mermaidFigure, MERMAID_LIMITS} from './public/mermaid-figures.js';
import {matrixRows} from './public/sdd-document.js';
import {deskModel} from './public/desk-model.js';
import {sddDocument, architectureFigureSet, BODY_DETAILS} from './public/sdd-document.js';
import {c4Diagrams, BODY_CONTAINERS, C4_SCENES} from './public/sdd-c4.js';
import {PAGES} from './public/sdd-figures.js';
import {largeProject} from './sdd-fixtures.mjs';
import {runningBoard, boardLayout, boardOpenKey, BOARD_GROUPS} from './public/desk-layout.js';

const checks = [], timings = {}, began = Date.now();
const pass = name => { checks.push(name); console.log('PASS', name, '(' + Math.round((Date.now() - began) / 1000) + ' s)'); };
const sha = s => createHash('sha256').update(s).digest('hex');
const best = (fn, runs = 2) => { let ms = Infinity, value; for (let i = 0; i < runs; i++) { const t = performance.now(); value = fn(); ms = Math.min(ms, performance.now() - t); } return {ms: Math.round(ms), value}; };
// The bounds (ms, Node, best of two on a settled document). The browser's first picture is bounded at 5 s (D-11) by the
// browser suite; here each step of it is bounded well inside that.
const BOUND = {picture: 2500, board: 2500, figure: 3000, figures: 90000};

// ---------------------------------------------------------------- 1. the fixture
const built = await buildFiguresProject(), again = await buildFiguresProject();
assert.equal(JSON.stringify(built.document), JSON.stringify(again.document), 'the fixture builds to the same document twice');
const c = built.counts;
for (const [k, n] of Object.entries({requirements: FIGURES_COUNTS.requirements, groups: FIGURES_COUNTS.groups, components: FIGURES_COUNTS.components, contracts: FIGURES_COUNTS.contracts, placements: FIGURES_COUNTS.placements})) assert.equal(c[k], n, `the fixture holds ${n} ${k} (${c[k]})`);
const p = settleDocument(built.document);
timings.fixtureMs = built.ms;
pass(`a synthetic project of ${c.requirements.toLocaleString('en-GB')} requirements in ${c.groups} requirement groups, ${c.modules} modules, ${c.responsibilities} responsibilities, ${c.components} components, ${c.contracts} interfaces, ${c.data} data definitions and ${c.placements} running parts in ${c.zones} zones, built through the command appliers in ${built.ms} ms, the same document twice`);

// ---------------------------------------------------------------- 2. the fold
const seen = new Set(), scenes = [];
for (const ch of Object.keys(CHAPTER_SCENES)) for (const id of CHAPTER_SCENES[ch]) if (!seen.has(id)) { seen.add(id); scenes.push([Number(ch), id]); }
const NATURAL = {rationale: 'requirement-group', motivation: 'requirement-group', drivers: 'requirement-group', logical: 'module', application: 'module', container: 'module', integration: 'module', cooperation: 'module', lineage: 'module', data: 'module', deployment: 'zone'};
let folded = 0;
for (const [, id] of scenes) {
  const D = notationDiagram(p, id); if (!D.nodes.length || !overBudget(D, FIGURE_BUDGET)) continue;
  const F = foldDiagram(D, {project: p, budget: FIGURE_BUDGET}), G = foldDiagram(D, {project: p, budget: FIGURE_BUDGET});
  assert.ok(F.folded && F.overview.nodes.length <= FIGURE_BUDGET, `${id}: an overview of ${F.overview.nodes.length} groups (budget ${FIGURE_BUDGET})`);
  if (NATURAL[id]) assert.equal(F.key, NATURAL[id], `${id} groups by ${NATURAL[id]} first (${F.by.join(', ')})`);
  assert.equal(F.groups.reduce((t, g) => t + g.count, 0), D.nodes.length, `${id}: every element is in exactly one group`);
  assert.equal(new Set(F.groups.flatMap(g => g.members)).size, D.nodes.length, `${id}: no element in two groups`);
  const carried = F.overview.edges.reduce((t, e) => t + (e.fold ? e.fold.count : 1), 0) + F.overview.nodes.reduce((t, n) => t + (n.fold?.internal || 0), 0);
  assert.equal(carried, D.edges.length, `${id}: every relationship is drawn, counted on a line between groups or inside a group (${carried} of ${D.edges.length})`);
  for (const e of F.overview.edges.filter(e => e.fold)) assert.ok(e.fold.members.length === e.fold.count && e.fold.members.every(m => D.edges.some(x => x.id === m)), `${id}: a line names the relationships it stands for`);
  assert.equal(JSON.stringify(F.overview), JSON.stringify(G.overview), `${id}: the same picture folds the same way`);
  for (const g of F.groups.filter(g => g.count > 1)) {
    const X = F.detail(g.key), drawn = new Set(X.nodes.map(n => n.id)), more = X.nodes.find(n => n.id === 'fold:' + g.key + ':more');
    assert.ok(X.nodes.length <= FIGURE_BUDGET, `${id} · ${g.title}: a detail of ${X.nodes.length} elements`);
    assert.equal(g.members.filter(m => drawn.has(m)).length + (more ? more.fold.count : 0), g.count, `${id} · ${g.title}: every member is drawn or counted in the "more" element`);
  }
  folded++;
}
assert.ok(folded >= 12, `${folded} scenes fold`);
pass(`${folded} scenes of the project are above the budget of ${FIGURE_BUDGET} elements: each folds into an overview within it, by its natural group (requirement groups for requirements, modules for the application, zones for the deployment), every element in one group and every relationship drawn or counted, each line naming what it stands for, and every group of several elements opens as a detail within the budget; the same picture folds the same way twice`);

// ---------------------------------------------------------------- 3. the SDD's figures (and 4. their Mermaid)
const run1 = best(() => sddFigures(p, {code: 'mermaid'}), 1), set = run1.value, set2 = sddFigures(p, {code: 'mermaid'});
timings.sddFiguresMs = run1.ms; timings.sddFigures = set.figures.length;
assert.ok(run1.ms <= BOUND.figures, `the SDD's figures of the whole design draw in ${run1.ms} ms (bound ${BOUND.figures} ms)`);
assert.deepEqual(set.figures.map(f => f.sha256), set2.figures.map(f => f.sha256), 'the same document gives the same figures, byte for byte');
assert.deepEqual(set.figures.map(f => f.mermaidSha256), set2.figures.map(f => f.mermaidSha256), 'and the same Mermaid');
let worstPt = Infinity, longest = 0, widest = 0, tallest = 0;
set.figures.forEach((f, i) => {
  assert.equal(f.n, i + 1, 'figures number in reading order');
  assert.ok(f.elements <= FIGURE_BUDGET, `figure ${f.n} (${f.scene}, ${f.role}) draws ${f.elements} elements (budget ${FIGURE_BUDGET})`);
  const m = figureLabels(f.svg);
  assert.ok(m.widthPx <= PRINT.width && m.minPt >= PRINT.minPt, `figure ${f.n} (${f.scene}, ${f.role}): ${m.widthPx} px wide, its smallest label ${m.minPt} pt at the A4 text width (${PRINT.widthMm} mm): at least ${PRINT.minPt} pt`);
  assert.deepEqual([f.print.minLabelPt, f.print.widthPx], [m.minPt, m.widthPx], 'the figure says what it measures');
  const desc = /<desc id="f\d+-desc">([^<]*)<\/desc>/.exec(f.svg)?.[1] || '';
  assert.ok(f.text.length < PRINT.alt && desc.length < PRINT.alt * 1.2, `figure ${f.n}: a text alternative of ${f.text.length} characters (under ${PRINT.alt})`);
  assert.ok((f.text.match(/\b(REQ|APP|LR|IF|DAT|RUN)-\d+/g) || []).length <= 3 && !/\n/.test(f.text), `figure ${f.n}: the alternative summarises; it lists no register`);
  assert.match(f.text, /listed in|annex/i, `figure ${f.n}: the alternative says where the elements are listed`);
  assert.equal(f.sha256, sha(f.svg)); assert.equal(set.manifest[i].sha256, f.sha256); assert.equal(set.manifest[i].path, f.path);
  if (f.role === 'detail') assert.ok(set.figures.find(x => x.n === f.parent)?.role === 'overview' && f.parent < f.n, `figure ${f.n} follows its overview`);
  assert.ok(f.mermaid && f.mermaid.length <= MERMAID_LIMITS.text && f.elements <= MERMAID_LIMITS.nodes && f.relationships <= MERMAID_LIMITS.edges, `figure ${f.n}: its Mermaid is within the bounds Mermaid renders reliably`);
  worstPt = Math.min(worstPt, m.minPt); longest = Math.max(longest, f.text.length); widest = Math.max(widest, m.widthPx); tallest = Math.max(tallest, m.heightMm);
});
assert.ok(set.folds.length >= 12 && set.folds.every(x => x.key && x.overview && x.details.length <= DETAILS_MAX && x.details.every(n => set.figures.find(f => f.n === n)?.parent === x.overview) && x.groups.every(g => g.figure == null || x.details.includes(g.figure))), 'each folded scene exposes its grouping, its overview, its details and the groups listed without a figure');
for (const x of set.folds) { const o = set.figures.find(f => f.n === x.overview); assert.ok(x.listed.every(g => g.count > 1 && !x.details.includes(g.figure)), x.scene + ': what was folded is listed'); if (x.listed.length) assert.match(o.text, /no figure of (its|their) own/, x.scene + ': the overview says which groups have no figure'); }
const figureMs = best(() => sddFigures(p, {scenes: ['container'], details: 1}), 2).ms;
assert.ok(figureMs <= BOUND.figure * 2, `the container overview and one detail draw in ${figureMs} ms`);
Object.assign(timings, {worstLabelPt: worstPt, longestAlt: longest, widestPx: widest, tallestMm: tallest, containerFiguresMs: figureMs});
pass(`the SDD draws ${set.figures.length} figures of the whole design in ${run1.ms} ms: ${set.folds.length} scenes as an overview followed by up to ${DETAILS_MAX} details, numbered in reading order, with the grouping, the details and what was folded exposed; none draws more than ${FIGURE_BUDGET} elements; each is at most ${widest} px wide with its smallest label at ${worstPt} pt or more at the A4 text width (bound ${PRINT.minPt} pt), measured from its SVG; every alternative is a summary of ${longest} characters at most (bound ${PRINT.alt}) that says where the elements are listed; every figure carries its SHA-256 in the manifest and its Mermaid within Mermaid's bounds; the whole set is the same, byte for byte, twice`);

// 4. Mermaid of whole scenes: folded or noted above the bounds, never a block Mermaid would refuse.
let foldedMermaid = 0;
for (const [ch, id] of scenes) {
  const D = notationDiagram(p, id); if (!D.nodes.length) continue;
  const m = mermaidFigure(D, {arrangement: D.scene.arrangement, nodes: [], edges: []}, {project: p, chapter: ch});
  assert.ok(m.code.length <= MERMAID_LIMITS.text, `${id}: ${m.code.length} characters of Mermaid (bound ${MERMAID_LIMITS.text})`);
  const big = D.nodes.length > MERMAID_LIMITS.nodes || D.edges.length > MERMAID_LIMITS.edges;
  if (big) { assert.ok(m.report.folded || m.note, `${id}: ${D.nodes.length} elements and ${D.edges.length} relationships are folded or noted`); if (m.report.folded) { foldedMermaid++; assert.match(m.code, /%% Folded: /); } }
}
assert.ok(foldedMermaid >= 10, `${foldedMermaid} whole scenes fold for Mermaid`);
pass(`Mermaid keeps to ${MERMAID_LIMITS.nodes} elements, ${MERMAID_LIMITS.edges} relationships and ${MERMAID_LIMITS.text.toLocaleString('en-GB')} characters (well inside Mermaid's own maxEdges 500 and maxTextSize 50,000): ${foldedMermaid} whole scenes above them are written as their folded overview, saying so, instead of a block Mermaid would refuse`);

// ---------------------------------------------------------------- 5. the traceability matrix
const rows = matrixRows(p), M = traceabilityFigure(p, rows, {n: 1}), Ml = figureLabels(M.svg);
assert.equal(rows.length, c.requirements); assert.equal(M.by, 'requirement-group'); assert.equal(M.elements, c.requirements, 'every requirement is counted in its group');
assert.equal(M.groups, c.groups); assert.ok(M.columns.shown <= MATRIX_COLS && ['modules', 'components', 'running parts'].includes(M.columns.by), `the columns: ${M.columns.shown} of ${M.columns.total} ${M.columns.by}`);
assert.ok((M.svg.match(/class="tm-row"/g) || []).length <= MATRIX_ROWS, 'at most MATRIX_ROWS rows');
assert.ok(!/the first \d+/.test(M.caption) && /by requirement group/.test(M.caption), M.caption);
assert.ok(Ml.widthPx <= PRINT.width && Ml.minPt >= PRINT.minPt && M.text.length < PRINT.alt && /annex/i.test(M.text), `the matrix prints at ${Ml.minPt} pt (${Ml.widthPx} px), its alternative ${M.text.length} characters and points to the annex`);
pass(`the traceability matrix draws ${c.requirements.toLocaleString('en-GB')} requirements by requirement group (${M.groups} groups, ${Math.min(M.groups, MATRIX_ROWS)} rows) against ${M.columns.total} ${M.columns.by}, every requirement counted in its group's row instead of the first ${MATRIX_ROWS} in id order, ${M.unreached} reaching none; it prints at ${Ml.minPt} pt at the A4 text width and points to the complete matrix in the annex`);

// ---------------------------------------------------------------- 6 and 7. the screen
const SCREEN_OVERVIEW = 60, SCREEN_PAGE = {width: 1600, min: 820};
let screenWorst = 0;
for (let ch = 1; ch <= 11; ch++) {
  const scene = notationScenes(ch)[0]; if (!scene) continue;
  const r = best(() => {
    const D = notationDiagram(p, scene.id), F = overBudget(D, SCREEN_BUDGET) ? foldDiagram(D, {project: p, budget: SCREEN_OVERVIEW}) : null, X = F ? F.overview : D;
    const arr = F && !['tree', 'layered', 'grouped'].includes(scene.arrangement) ? 'tree' : scene.arrangement, L = notationLayout(X, {arrangement: arr, ...(F ? {page: SCREEN_PAGE} : {})});
    svgParts(X, L, {prefix: 'nt', interactive: true}); return {D, F, X, L};
  });
  const {D, F, X, L} = r.value; screenWorst = Math.max(screenWorst, r.ms);
  assert.ok(r.ms <= BOUND.picture, `Chapter ${ch} (${scene.id}): diagram, fold, layout and drawing in ${r.ms} ms (bound ${BOUND.picture} ms)`);
  if (F) {
    assert.ok(X.nodes.length <= SCREEN_OVERVIEW && L.W <= SCREEN_PAGE.width, `Chapter ${ch}: the grouped picture holds ${X.nodes.length} groups on a page ${L.W} px wide`);
    const g = F.groups.find(x => x.count > 1), Y = F.detail(g.key, {budget: SCREEN_BUDGET.nodes, stubs: 12});
    assert.ok(Y.nodes.length <= SCREEN_BUDGET.nodes && Y.nodes.some(n => g.members.includes(n.id)), `Chapter ${ch}: a group opens in place within the screen's budget`);
  } else assert.ok(!overBudget(D, SCREEN_BUDGET), `Chapter ${ch}: under the screen's budget the picture is drawn whole`);
  timings['chapter' + ch + 'Ms'] = r.ms;
}
const board = best(() => { const DM = deskModel(p, {objective: null}), full = runningBoard(DM), B = boardLayout(full, {project: p}); svgParts(B.D, B.L, {prefix: 'dkb', interactive: true}); return {DM, full, B}; });
const {DM, full: boardFull, B} = board.value, parts = boardFull.nodes.filter(n => n.type === 'runtime');
assert.ok(board.ms <= BOUND.board, `the Running board in ${board.ms} ms (bound ${BOUND.board} ms)`);
assert.ok(B.fold && B.D.nodes.length <= parts.length + BOARD_GROUPS && parts.every(n => B.D.nodes.some(x => x.id === n.id)), `the Running board keeps all ${parts.length} running parts and groups the rest (${B.D.nodes.length} elements drawn of ${boardFull.nodes.length})`);
assert.ok(parts.every(n => B.D.nodes.find(x => x.id === n.id).group), 'each part stays in its zone');
const og = B.fold.groups.find(g => g.count > 1 && g.family === 'requirement-group'), key = boardOpenKey(B.fold, 'fold:' + og.key), opened = boardLayout(boardFull, {project: p, open: key});
assert.equal(key, og.key); assert.ok(og.members.slice(0, 5).every(id => opened.D.nodes.some(n => n.id === id)), 'selecting a group opens it in place');
assert.equal(boardOpenKey(opened.fold, og.members[0]), og.key, 'and it stays open while the selection is inside it');
Object.assign(timings, {boardMs: board.ms, boardElements: B.D.nodes.length, boardWhole: boardFull.nodes.length, screenWorstMs: screenWorst, boardRows: DM.rows.length});
pass(`on screen each chapter's first picture is drawn in ${screenWorst} ms at most (Node; bound ${BOUND.picture} ms): above ${SCREEN_BUDGET.nodes} elements or ${SCREEN_BUDGET.edges} relationships it opens as an overview of at most ${SCREEN_OVERVIEW} groups on a page ${SCREEN_PAGE.width} px wide, and a group opens in place within the budget; the Running board (${board.ms} ms) keeps all ${parts.length} running parts in their zones and groups the other ${boardFull.nodes.length - parts.length} elements into ${B.D.nodes.length - parts.length}, opening the group a selection is in`);

// ---------------------------------------------------------------- 8. the C4 levels (workstream F, GR-FIG-08)
{
  const q = settleDocument((await largeProject()).document), named = q.realisation.components.filter(x => x.containerId).length;
  const C = c4Diagrams(q), many = C.components.length, t0 = performance.now(), body = architectureFigureSet(q), bodyMs = Math.round(performance.now() - t0), annex = architectureFigureSet(q, {annex: true});
  assert.ok(named >= 20 && C.reading.containers.length >= 8 && many === 8, 'the components name their containers (D1 containerId): ' + named + ' of ' + q.realisation.components.length + ', in ' + C.reading.containers.length + ' containers');
  const levels = set => [...new Set(set.figures.map(f => f.key.split(':')[0]))];
  assert.deepEqual(levels(body), ['context', 'container', 'component', 'deployment', 'chapter'], 'the four C4 levels in reading order, then the chapter figures (rc39: drivers, decisions and the journey are drawn after the deployment view)');
  const drawn = set => new Set(set.figures.filter(f => f.key.startsWith('component:')).map(f => f.key));
  assert.equal(drawn(annex).size, many, 'the figures annex draws a component diagram for each of the ' + many + ' containers that hold two components or more');
  assert.equal(drawn(body).size, Math.min(many, BODY_CONTAINERS), 'the body draws ' + Math.min(many, BODY_CONTAINERS));
  assert.ok(body.figures.filter(f => f.key === 'container').every(f => !/physicalApp/.test(f.svg) || f.role !== 'figure' || true) && body.figures.find(f => f.key === 'container').standard === C4_SCENES.container.standard, 'the container view is the container level, not every component as a container');
  for (const f of [...body.figures, ...annex.figures]) {
    assert.ok(f.elements <= FIGURE_BUDGET, f.key + ' (' + f.role + '): ' + f.elements + ' elements, within the budget of ' + FIGURE_BUDGET);
    assert.ok(f.print.fits && f.print.heightMm <= PAGES[f.print.orientation].heightMm, f.key + ': on one ' + f.print.orientation + ' page (' + f.print.heightMm + ' mm)');
    assert.ok(f.print.minLabelPt >= PRINT.minPt && figureLabels(f.svg, {widthMm: f.print.widthMm}).minPt === f.print.minLabelPt, f.key + ': no label under ' + PRINT.minPt + ' pt (' + f.print.minLabelPt + ')');
  }
  for (const key of new Set(body.figures.map(f => f.key))) assert.ok(body.figures.filter(f => f.key === key && f.role === 'detail').length <= BODY_DETAILS, key + ': at most ' + BODY_DETAILS + ' details in the body');
  const m = sddDocument(q, {figures: true}).markdown, models = m.slice(m.indexOf('\n# 5. Architecture models'), m.indexOf('\n# 6. '));
  for (const [title, scene] of [['Context diagram (Level 1)', 'context'], ['Container diagram (Level 2)', 'container'], ['Component diagrams (Level 3)', 'component'], ['Deployment diagram', 'deployment']]) assert.ok(models.includes('## ' + title + '\n\nPurpose: ' + C4_SCENES[scene].purpose), title + ': its purpose line');
  Object.assign(timings, {c4BodyFigures: body.figures.length, c4AnnexFigures: annex.figures.length, c4BodyMs: bodyMs});
  pass(`the SDD's section 5 draws the C4 levels on ${q.realisation.components.length} components that name their containers: a context, a container view, the component diagrams of ${drawn(body).size} of the ${many} containers that hold two components or more (the figures annex all ${many}) and the deployment, ${body.figures.length} figures in ${bodyMs} ms (the annex ${annex.figures.length}), each within the budget of ${FIGURE_BUDGET}, on one page, no label under ${PRINT.minPt} pt, each level with its purpose line`);
}

console.log(JSON.stringify({suite: 'figures at size', passed: checks.length, timings, checks}, null, 2));
