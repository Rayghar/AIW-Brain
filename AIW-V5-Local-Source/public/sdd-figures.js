// The SDD's figures: the same standard diagrams the architect reviewed on screen, drawn by the same
// model (notation-model.js), arrangement (notation-layout.js) and renderer (notation-svg.js), at the
// scene's own arrangement and a fixed page width, so the document carries the reviewed picture and
// the same input always gives the same bytes. Each figure carries its text alternative and its
// SHA-256, and the set carries a manifest a recipient can verify. DOM-free: runs in the browser, in
// Node and under the Worker. Reader pins and notes are never part of a figure.
// Round 6 (Contract F): with {code: 'mermaid'} each figure also carries its Mermaid text (mermaid-figures.js), drawn from
// the same D and L, so the Markdown edition can carry figures that render where Markdown is rendered.
// Round 12 (P, pictures at size; SDD-SPEC §5): a figure keeps to a node budget (FIGURE_BUDGET, about 40 elements).
// Above it the scene is drawn as an overview of its groups (figure-budget.js: requirement groups, modules, zones …, with
// the relationships between groups counted), followed by a detail figure per group of several elements (at most
// `details`, the largest), each numbered in reading order after its overview; the groups without a figure of their own
// are listed once with where their elements are. Every figure is drawn for print (PRINT): its width maps to the A4 text
// width and no word on it prints under 7 pt (figureLabels measures it from the SVG); its text alternative is a short
// summary of what it shows, its counts and groups, and where the elements are listed, never the register itself.
import {notationDiagram, CHAPTER_SCENES, SCENES, ARRANGEMENTS} from './notation-model.js';
import {notationLayout} from './notation-layout.js';
import {notationSVG, PRINT_FLOOR} from './notation-svg.js';
import {mermaidFigure} from './mermaid-figures.js';
import {foldDiagram, FIGURE_BUDGET, DETAILS_MAX, LIST_MAX, familyWord, familiesPhrase, countWords, wordKind} from './figure-budget.js';
import {groupIndex, requirementGroups} from './requirement-groups.js';
import {sha256, digest} from './brain-integrity.js';
import {fileSafe as safe} from './util.js';
import {passValue} from './document-memo.js';

export const FIGURE_SCHEMA = 'aiw.sdd-figures/1';
export const FIGURE_CODES = ['mermaid'];
export {FIGURE_BUDGET, DETAILS_MAX};
// The printed page (SDD-SPEC §5): a figure's width maps to the A4 text width, 160 mm, and no label may print under 7 pt
// there. With every word at least PRINT_FLOOR px (notation-svg.js PRINT_STYLE) a figure may be at most `width` px wide:
// 10.5 px × 160 mm / (7 pt × 0.3528 mm) = 680 px. `gap` is the space between the rows of a printed figure (72 px on
// screen), `edges` bounds the relationships an overview or a detail draws (the heaviest; the others stay in the details
// and the annexes), `notes` the notes a figure prints (the rest are counted), `alt` the length of a text alternative.
const MM_PER_PT = 25.4 / 72;
export const PRINT = Object.freeze({widthMm: 160, minPt: 7, floorPx: PRINT_FLOOR, width: Math.floor(PRINT_FLOOR * 160 / (7 * MM_PER_PT)), gap: 56, edges: 60, notes: 3, alt: 1000});
// The A4 pages a printed figure may stand on (round 12, workstream F, the lead's decision on figure heights): portrait,
// the text 160 mm wide and about 247 mm high; landscape, 247 mm wide and about 160 mm high. `width` is the most px a
// figure laid out for the page may be wide with every word at 7 pt or more; it fits the page when its height at the
// page's width is within the page's height.
export const PAGES = Object.freeze({portrait: Object.freeze({widthMm: 160, heightMm: 247, width: PRINT.width}), landscape: Object.freeze({widthMm: 247, heightMm: 160, width: Math.floor(PRINT_FLOOR * 247 / (7 * MM_PER_PT))})});

// The smallest word a figure prints when its width is set to `widthMm` (the A4 text width): every font size its own style
// gives a class or element the figure uses (the last rule for a selector wins) and every size written on an element,
// against the figure's width (its viewBox). {widthPx, heightPx, heightMm, minPx, minPt, smallest: [[where, px]]}.
const sizeIn = decl => { const m = /font-size:\s*([\d.]+)px/.exec(decl) || /font:[^;]*?([\d.]+)px/.exec(decl); return m ? Number(m[1]) : null; };
export function figureLabels(svg, {widthMm = PRINT.widthMm} = {}) {
  const s = String(svg || ''), box = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(s), W = Number(box?.[1] || /<svg[^>]*\swidth="([\d.]+)"/.exec(s)?.[1] || 0), H = Number(box?.[2] || /<svg[^>]*\sheight="([\d.]+)"/.exec(s)?.[1] || 0);
  const classes = new Set(), tags = new Set(), rules = new Map(), sizes = [];
  for (const m of s.matchAll(/class="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) if (c) classes.add(c);
  for (const m of s.matchAll(/<([a-zA-Z][\w-]*)[\s>/]/g)) tags.add(m[1]);
  for (const css of s.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) for (const m of css[1].matchAll(/([^{}]+)\{([^}]*)\}/g)) { const px = sizeIn(m[2]); if (px != null) for (const sel of m[1].split(',')) rules.set(sel.trim(), px); }
  const used = sel => sel.split(/\s+/).every(part => { const cls = part.match(/\.[\w-]+/g) || [], tag = part.replace(/[.:#[].*$/, ''); return cls.every(c => classes.has(c.slice(1))) && (!tag || tags.has(tag)); });
  for (const [sel, px] of rules) if (used(sel)) sizes.push([sel, px]);
  for (const m of s.matchAll(/\sfont-size="([\d.]+)(?:px)?"/g)) sizes.push(['font-size attribute', Number(m[1])]);
  for (const m of s.matchAll(/style="[^"]*font-size:\s*([\d.]+)px/g)) sizes.push(['style attribute', Number(m[1])]);
  const minPx = sizes.length ? Math.min(...sizes.map(x => x[1])) : 0, mmPerPx = W ? widthMm / W : 0;
  return {widthPx: W, heightPx: H, heightMm: Math.round(H * mmPerPx * 10) / 10, minPx, minPt: Math.floor(minPx * mmPerPx / MM_PER_PT * 100) / 100, smallest: sizes.sort((a, b) => a[1] - b[1]).slice(0, 4)};
}

// The arrangements that cut their ranks to the page; any other is drawn on the page as a tree, and a tree is narrowed
// until it fits (each try deterministic, so the same picture always lands on the same drawing).
const PAGE_ARRANGEMENTS = new Set(['tree', 'layered', 'grouped']);
// The page a figure is laid out on (notation-layout.js `page`): `width` px, its rows `gap` apart, its elements sized for
// the words they print at the floor. A figure's `print.page` is that width, so its layout can be drawn again.
export const printPage = width => ({width, min: 360, gap: PRINT.gap, print: PRINT.floorPx});
// The frame a printed figure is shaped for (rc41, W1; PLAN §2 W1.4): the page's width at the page's proportion, so the
// layout gives a figure the screen's shaping (notation-layout.js `stage`: rows left-aligned under their parents, trunks
// between the rows, tidy trees, packed groups) while its rows are cut to the page's width (its print floor keeps the
// page's width as the limit). Screen and document draw the same picture at their own widths.
export const printStage = (width, orientation = 'portrait') => ({w: width, h: Math.round(width * PAGES[orientation].heightMm / PAGES[orientation].widthMm)});
const orientationOf = max => (max === PAGES.landscape.width ? 'landscape' : 'portrait');
// The shaping holds the page (rc41): the shaped layout keeps within the page's width and, at that width, its height. A
// tidy tree can stand narrow and deep and trunk gaps make rows taller, so where only the layout as before rc41 (no stage)
// holds the page — or only it keeps within the page's width — the figure is laid out that way and the page search goes
// on as it did; everywhere else it is shaped as on the screen. `stage` records which, so the layout can be drawn again.
export const holdsPage = (L, orientation) => L.W <= PAGES[orientation].width && L.H * PAGES[orientation].widthMm / L.W <= PAGES[orientation].heightMm;
const shapedOrNot = (at, a, width, orientation) => {
  const S = at(a, width, orientation, true), shaped = {L: S, stage: printStage(width, orientation)};
  if (holdsPage(S, orientation)) return shaped;
  const U = at(a, width, orientation, false), within = L => L.W <= PAGES[orientation].width;
  return holdsPage(U, orientation) || (within(U) && !within(S)) ? {L: U, stage: null} : shaped;
};
function printLayout(D, arrangement, max = PRINT.width, at = (a, width, orientation, shaped) => notationLayout(D, {arrangement: a, page: printPage(width), ...(shaped ? {stage: printStage(width, orientation)} : {})})) {
  const tries = [...new Set([PAGE_ARRANGEMENTS.has(arrangement) || (arrangement === 'sequence' && D.nodes.length <= 3) ? arrangement : null, D.groups.some(g => D.nodes.some(n => n.group === g.id)) ? 'grouped' : null, 'tree'].filter(Boolean))], orientation = orientationOf(max);
  let best = null;
  for (const a of tries) for (const width of [max, Math.round(max * 0.8), Math.round(max * 0.6)]) {
    const {L, stage} = shapedOrNot(at, a, width, orientation);
    if (L.W <= max) return {L, arrangement: a, page: width, stage};
    if (!best || L.W < best.L.W) best = {L, arrangement: a, page: width, stage};
  }
  return best;
}
// A figure's own layout: drawn for print, or (print: false) at the screen proportions as before round 12.
const layoutFor = (D, arrangement, print, max = PRINT.width, at) => (print ? printLayout(D, arrangement, max, at) : {L: notationLayout(D, {arrangement}), arrangement, page: null, stage: null});
// The notes a printed figure carries: its first, and the count of the rest (a scene can note every path it cannot place).
export const printNotes = D => (D.notes.length > PRINT.notes ? {...D, notes: [...D.notes.slice(0, PRINT.notes - 1), `… and ${plural(D.notes.length - PRINT.notes + 1, 'more note')} on this picture; the picture on screen lists every one.`]} : D);
// The relationships a printed overview or detail draws: one and a half per element, at least 12, at most PRINT.edges.
const printEdges = n => Math.min(PRINT.edges, Math.max(12, Math.round(n * 1.5)));

const clip = (v, max) => { const t = String(v ?? '').replace(/\s+/g, ' ').trim(); return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t; };
const plural = (n, one, many = one + 's') => `${Number(n).toLocaleString('en-GB')} ${n === 1 ? one : many}`;
// What a picture holds, by kind, the largest first: "12 components, 5 interfaces and 3 more kinds" (round 24: an external
// system, a container or a running part named for what it is, figure-budget.js wordKind).
function kindsLine(D) {
  const by = new Map(); for (const n of D.nodes) { const k = n.fold ? null : wordKind(n); if (k) by.set(k, (by.get(k) || 0) + 1); }
  const list = [...by].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))), shown = list.slice(0, 3).map(([k, c]) => countWords(c, k));
  return shown.join(', ') + (list.length > 3 ? ` and ${plural(list.length - 3, 'more kind')}` : '');
}
// A text alternative within PRINT.alt characters: the parts are joined while they fit, the last that does not fit is
// clipped, so the summary always ends on where the elements are listed.
function shortText(parts, where) { const tail = ' ' + where, room = PRINT.alt - tail.length; let out = ''; for (const p of parts.filter(Boolean)) { const next = out ? out + ' ' + p : p; if (next.length <= room) out = next; else { out = clip(next, room); break; } } return out + tail; }
const listing = (listedIn, scene, chapter) => clip((typeof listedIn === 'function' ? listedIn(scene, chapter) : listedIn) || `The elements are listed in Chapter ${chapter} and in the annexes (Appendix D).`, 240);
// The largest groups of a fold, for a sentence: "Customer onboarding 274, Payments 142, … and 37 more".
const groupsLine = (groups, k = 5) => { const top = groups.slice().sort((a, b) => b.count - a.count || 0).slice(0, k); return top.map(g => `${clip(g.title, 40)} (${g.count})`).join(', ') + (groups.length > k ? ` and ${plural(groups.length - k, 'more')}` : ''); };

// Every scene that draws something, once, under the first chapter that offers it, in chapter order. `scenes` keeps only
// the named scenes (the executive edition draws the journey, the logical application and the deployment); `first` is
// the number of the first figure, so a document that places another figure before them numbers in reading order;
// `fingerprint` is the document's canonical SHA-256 when the caller has it already; `code` names a diagram-as-code
// text each figure carries beside its SVG ('mermaid'), or null.
// Round 12 (P): `budget` is the most elements one figure draws (FIGURE_BUDGET; Infinity draws every scene whole);
// `details` the most detail figures a folded scene gets (the largest groups; 0 for the overview alone); `print` (true)
// draws each figure for the A4 page (false: the screen proportions, as before); `listedIn` (a sentence, or
// (scene, chapter) => sentence) says where the elements are listed, for the text alternatives. Each figure carries
// `role` ('figure', 'overview' or 'detail'), its `fold` (the grouping key, the groups, what was folded, the detail
// figures; a detail's `parent` is its overview's number) and `print` (its width and height in mm at the A4 text width,
// the smallest word in pt). The set's `folds` lists, per folded scene, the overview, its details and the groups listed
// without a figure, for the document that lays the figures out (workstream F).
export function sddFigures(project, {baselineId = null, chapters = Object.keys(CHAPTER_SCENES).map(Number), scenes = null, first = 1, fingerprint = null, code = null, budget = FIGURE_BUDGET, details = DETAILS_MAX, print = true, listedIn = null} = {}) {
  if (code != null && !FIGURE_CODES.includes(code)) throw Error('Figures can be written as Mermaid, or drawn as SVG only.');
  if (!project) return {schema: FIGURE_SCHEMA, code, figures: [], omitted: [], manifest: [], folds: []};
  const seen = new Set(), figures = [], omitted = [], folds = [], version = project.contentVersion != null ? 'v' + project.contentVersion : '';
  const tail = (baselineId ? ' · ' + baselineId : ''), at = version ? ' · ' + version : '';
  for (const chapter of chapters) for (const sceneId of CHAPTER_SCENES[chapter] || []) {
    if (seen.has(sceneId) || (scenes && !scenes.includes(sceneId))) continue; seen.add(sceneId);
    const scene = SCENES.find(s => s.id === sceneId), D = notationDiagram(project, sceneId);
    if (!D || !D.nodes.length) { omitted.push({chapter, scene: sceneId, title: scene?.title || sceneId, reason: D?.notes?.[0] || 'Nothing is recorded for this picture yet.'}); continue; }
    const stem = `figures/AIW-${safe(project.name || 'design')}-ch${chapter}-${sceneId}-${scene.arrangement}${version ? '-' + version : ''}${baselineId ? '-' + safe(baselineId) : ''}`, where = listing(listedIn, scene, chapter);
    // Round 24: the module map keeps its own rules for a page (a module is one box, never folded by the budget).
    if (sceneId === 'module-map') { figures.push(...moduleMapFigures(project, {chapter, first: figures.length + first, stem, where, code, print, at, tail}).figures); continue; }
    const out = diagramFigures(project, D, {scene, chapter, first: figures.length + first, stem, where, code, budget, details, print, at, tail});
    figures.push(...out.figures);
    if (out.fold) folds.push({scene: sceneId, chapter, ...out.fold, listedIn: where});
  }
  // The fingerprint of the document the figures were drawn from (its canonical SHA-256).
  const documentFingerprint = fingerprint || digest(project);
  return {schema: FIGURE_SCHEMA, code, figures, omitted, folds, documentFingerprint, manifest: figures.map(f => manifestEntry(f, documentFingerprint))};
}
// One diagram as the SDD's figures (round 12; drawn by sddFigures for each scene, and by a document for a diagram it
// builds itself, the C4 levels of sdd-c4.js): under the budget the figure itself; above it the overview, then the detail
// of each of the `details` largest groups of several elements, numbered from `first` in reading order. `scene` (id,
// title, standard, arrangement, purpose) captions and describes it, `stem` names its files and `where` says where its
// elements are listed. With `fit` (the architecture edition) a figure taller than the portrait page at 160 mm, or with a
// label under 7 pt there, is laid out for a landscape page and kept there when it fits; `print.fits` says whether it fits
// a page with every label at 7 pt or more, so the caller can fold it again with a smaller budget (recorded in the footer);
// with `stop` as well the drawing stops at the first figure that fits no page (`unfit`), since the caller folds it again. Returns {figures, fold} (fold: what a folded scene exposes).
export function diagramFigures(project, D, {scene = D?.scene, chapter = 5, first = 1, stem, where, code = null, budget = FIGURE_BUDGET, details = DETAILS_MAX, print = true, at = '', tail = '', fit = false, stop = false, list = null, foot = ''} = {}) {
  // A document can retry its page budget with fewer detail figures. The unchanged
  // pictures keep exactly the same layout, even when their figure number changes.
  // Share only during this synchronous, read-only pass; the complete diagram is
  // the key, including branch order and saved record fields. No revision survives
  // in this cache, and captions, SVG IDs and manifests are rendered afresh.
  const layouts = passValue(project, 'sdd:print-layouts', () => new Map());
  const figures = [], sceneId = scene.id, F = Number.isFinite(budget) ? foldDiagram(D, {project, budget, edges: print ? printEdges : Infinity, list}) : {folded: false};
  // A budget other than the document's is recorded in each figure's footer (the fit rule folds a figure again with less), and
  // so are fewer names a folded group (round 24: `list`, the members each list box names at most; without it the fold's own,
  // figure-budget.js listFor).
  // (`foot`, round 24: what a figure drawn smaller to fit its page says it left out, such as the module map's sub-modules)
  const drawnWithin = (Number.isFinite(budget) && budget !== FIGURE_BUDGET ? ` · drawn within a budget of ${budget} elements` : '') + (F.folded && F.list < LIST_MAX ? ` · each folded group names up to ${F.list} of its members` : '') + (foot ? ' · ' + foot : '');
  // One figure: drawn, captioned, described, measured, hashed, and written as Mermaid when asked.
  const draw = (X0, {role, caption, text, path, group = null, parent = null, foldInfo = null}) => {
    // A printed figure carries its first notes and counts the rest (a scene can note every path it cannot place).
    const X = print ? printNotes(X0) : X0, n = figures.length + first;
    // Each arrangement at each width is laid out once for this figure, however many pages the search tries it on.
    const diagramKey = JSON.stringify(X);
    let laid = layouts.get(diagramKey);
    if (!laid) { laid = new Map(); layouts.set(diagramKey, laid); if (layouts.size > 64) layouts.delete(layouts.keys().next().value); }
    // (rc41: shaped for the page's stage, or as before rc41 where the shaping does not hold the page: shapedOrNot)
    const layoutAt = (a, width, orientation = 'portrait', shaped = true) => { const k = a + '|' + width + '|' + (shaped ? orientation : 'plain'); if (!laid.has(k)) laid.set(k, notationLayout(X, {arrangement: a, page: printPage(width), ...(shaped ? {stage: printStage(width, orientation)} : {})})); return laid.get(k); };
    // The figure laid out for a page: the portrait text width, as printLayout lays it out. With `fit` the layouts a page
    // allows are tried in order (the scene's arrangement, grouped, layered, then tree, each at the page's width and
    // narrower), portrait first, then a landscape page, and the first whose height fits its page is kept.
    const render = (L, arrangement, page, orientation, stage = null) => {
      const cap = `Figure ${n} · Chapter ${chapter} · ${caption(arrangement)}${at}${tail}`;
      // A qualifier the print could not place clear of the others is not drawn (notation-layout.js): the footer counts them;
      // so does it the words of lines standing for several relationships that a box would cover (round 24, labelCovered).
      // (round 24 part 3: and the words that would overlap another drawn word or tag, labelOverlap)
      const crowded = L.edges.filter(e => e.qualifierCrowded).length, covered = L.edges.filter(e => e.labelCovered).length, overlap = L.edges.filter(e => e.labelOverlap).length;
      const more = (crowded ? ` · ${plural(crowded, 'qualifier')} not drawn where lines crowd (each stays on its relationship and in the picture on screen)` : '') + (covered ? ` · ${plural(covered, 'word')} of counted lines not drawn where a box would cover ${covered === 1 ? 'it' : 'them'} (each stays on its line and in the picture on screen)` : '') + (overlap ? ` · ${plural(overlap, 'word')} not drawn where ${overlap === 1 ? 'it' : 'they'} would overlap another (each stays on its line and in the picture on screen)` : '');
      const svg = notationSVG(X, L, {prefix: 'f' + n, title: cap, desc: text, footer: `AIW · ${project.name || ''} · ${cap} · positions are a projection, never facts${drawnWithin}${more}`, print});
      return {L, arrangement, page, stage, cap, svg, m: figureLabels(svg, {widthMm: PAGES[orientation].widthMm}), orientation};
    };
    // (rc41: a shaped figure that does not stand on one page with its Key, where the same arrangement laid out as before
    // rc41 does, is drawn that way: the page decides, the shaping gives way)
    const lay = orientation => {
      const {L, arrangement, page, stage} = layoutFor(X, role === 'figure' ? scene.arrangement : 'tree', print, PAGES[orientation].width, layoutAt), r = render(L, arrangement, page, orientation, stage);
      if (!print || !stage || onOne(r)) return r;
      const U = layoutAt(arrangement, page, orientation, false), u = U.W <= PAGES[orientation].width ? render(U, arrangement, page, orientation, null) : null;
      return u && onOne(u) ? u : r;
    };
    const onPage = orientation => {
      const P = PAGES[orientation], own = role === 'figure' ? scene.arrangement : 'tree';
      const tries = [...new Set([PAGE_ARRANGEMENTS.has(own) ? own : null, X.groups.some(g => X.nodes.some(x => x.group === g.id)) ? 'grouped' : null, 'layered', 'tree'].filter(Boolean))];
      for (const a of tries) for (const width of [P.width, Math.round(P.width * 0.8), Math.round(P.width * 0.6)]) {
        // Too wide: a narrower page. Too tall before its key and footer are added: the next arrangement (a narrower page
        // would only print it taller). (rc41: each width is tried shaped as on the screen, then as before rc41.)
        let within = false;
        for (const shaped of [true, false]) {
          const L = layoutAt(a, width, orientation, shaped);
          if (L.W > P.width) continue;
          within = true;
          if (L.H * P.widthMm / L.W > P.heightMm) continue;
          const r = render(L, a, width, orientation, shaped ? printStage(width, orientation) : null); if (onOne(r)) return r;
        }
        if (within) break;
      }
      return null;
    };
    // On one page: within its height, every label at the print floor or more (a layout wider than the page is printed smaller).
    const onOne = r => r.m.heightMm <= PAGES[r.orientation].heightMm && r.m.minPt >= PRINT.minPt;
    let d = lay('portrait');
    if (fit && print && !onOne(d)) d = onPage('portrait') || onPage('landscape') || d;
    const {L, arrangement, page, stage, cap, svg, m} = d, fits = onOne(d);
    const figure = {n, chapter, scene: sceneId, title: scene.title, standard: scene.standard, arrangement, caption: cap, path: path + '.svg', svg, text, sha256: sha256(svg), bytes: new TextEncoder().encode(svg).length, mediaType: 'image/svg+xml', elements: X.nodes.length, relationships: X.edges.length, role, print: {widthMm: PAGES[d.orientation].widthMm, heightMm: m.heightMm, widthPx: m.widthPx, heightPx: m.heightPx, minLabelPt: m.minPt, minLabelPx: m.minPx, page, stage, ...(fit ? {orientation: d.orientation, fits, budget, ...(F.folded ? {list: F.list} : {})} : {})}};
    if (foldInfo) figure.fold = foldInfo; if (group) figure.group = group; if (parent != null) figure.parent = parent;
    if (code === 'mermaid') { const mm = mermaidFigure(X, L, {project, chapter}); if (mm) Object.assign(figure, {mermaid: mm.code, mermaidKind: mm.kind, mermaidPath: path + '.mmd', mermaidSha256: sha256(mm.code), mermaidBytes: new TextEncoder().encode(mm.code).length, mermaidReport: mm.report}); }
    figures.push(figure); return figure;
  };
  const title = a => `${scene.title} (${scene.standard}) · ${ARRANGEMENTS.find(x => x.id === a)?.title || a}`;
  if (!F.folded) {
    const text = shortText([`${scene.title} (${scene.standard}): ${plural(D.nodes.length, 'element')} (${kindsLine(D)}), ${plural(D.edges.length, 'relationship')}${D.groups.length ? ` in ${plural(D.groups.length, 'container')}` : ''}.`, scene.purpose, ...(D.notes || []).slice(0, 2)], where);
    draw(D, {role: 'figure', caption: title, text, path: stem});
    return {figures, fold: null};
  }
  // Above the budget: the overview, then the largest groups of several elements in detail, in the overview's order.
  const many = F.groups.filter(g => g.count > 1), chosen = new Set(many.slice().sort((a, b) => b.count - a.count || F.groups.indexOf(a) - F.groups.indexOf(b)).slice(0, Math.max(0, details)).map(g => g.key));
  const detailed = many.filter(g => chosen.has(g.key)), listed = many.filter(g => !chosen.has(g.key)), nOverview = figures.length + first;
  // Round 24 (D-24-07): the caption names every family the overview groups by (the groups of several elements), joined as a
  // sentence joins them ("by module and external system"), and the one zone a deployment's groups subdivide.
  const by = familiesPhrase(F.groups.some(g => g.count > 1) ? F.groups.filter(g => g.count > 1).map(g => g.family) : F.by) + (F.within ? ' within ' + clip(F.within, 60) : '');
  const hidden = F.overview.fold.hidden.length;
  const range = detailed.length ? (detailed.length === 1 ? `Figure ${nOverview + 1} shows ${clip(detailed[0].title, 60)} in detail` : `Figures ${nOverview + 1}–${nOverview + detailed.length} show the ${detailed.length} largest groups in detail`) : '';
  const info = {key: F.key, by: F.by, budget: F.budget, total: F.total, groups: F.groups.map(g => ({key: g.key, family: g.family, title: g.title, ref: g.ref, count: g.count, figure: chosen.has(g.key) ? nOverview + 1 + detailed.findIndex(x => x.key === g.key) : null, merged: g.merged.length ? g.merged : undefined})), details: detailed.map((g, i) => nOverview + 1 + i), listed: listed.map(g => ({key: g.key, title: g.title, ref: g.ref, count: g.count})), hidden};
  const overviewText = shortText([`${scene.title} (${scene.standard}) as an overview: ${plural(F.total.nodes, 'element')} in ${plural(F.groups.length, 'group')} by ${by}; the largest: ${groupsLine(F.groups)}.`, `${plural(F.total.edges, 'relationship')} drawn as ${plural(F.overview.edges.length, 'counted line')}${hidden ? `; ${plural(hidden, 'lighter line')} between groups ${hidden === 1 ? 'is' : 'are'} left to the details` : ''}.`, range ? range + '.' : '', listed.length ? `${plural(listed.length, 'group')} of several elements ${listed.length === 1 ? 'has' : 'have'} no figure of ${listed.length === 1 ? 'its' : 'their'} own: ${groupsLine(listed, 4)}.` : ''], where);
  const unfit = f => stop && !f.print.fits;
  const overview = draw(F.overview, {role: 'overview', caption: () => `${scene.title} (${scene.standard}) · overview by ${by}: ${plural(F.total.nodes, 'element')} in ${plural(F.groups.length, 'group')}`, text: overviewText, path: stem + '-overview', foldInfo: info});
  if (unfit(overview)) return {figures, fold: {...info, overview: overview.n}, unfit: true};
  for (const g of detailed) {
    const X = F.detail(g.key), G = X.fold.group, nh = X.fold.hidden.length;
    const text = shortText([`${g.family === 'kind' ? '' : familyWord(g.family) + ' '}${g.ref ? g.ref + ' ' : ''}${clip(g.title, 80)} in ${scene.title} (${scene.standard}): ${plural(G.count, 'element')} (${kindsLine(X)})${G.more ? `, the ${G.shown} most connected drawn and ${G.more} more counted in one element` : ''}.`, `${plural(X.edges.length, 'relationship')} drawn${nh ? ` (${nh} lighter lines left out)` : ''}; ${plural(G.neighbours, 'neighbouring group')} ${G.neighbours === 1 ? 'stands' : 'stand'} as one element each.`, `A detail of Figure ${overview.n}.`], where);
    const f = draw(X, {role: 'detail', caption: () => `${scene.title} · ${g.family === 'kind' ? '' : familyWord(g.family).toLowerCase() + ' '}${g.ref ? g.ref + ' ' : ''}${clip(g.title, 60)}: ${plural(G.count, 'element')} (detail of Figure ${overview.n})`, text, path: stem + '-' + safe(g.key.replace(/^[a-z-]+:/, '') || 'group'), group: {key: g.key, family: g.family, title: g.title, ref: g.ref, count: g.count, shown: G.shown, more: G.more}, parent: overview.n});
    if (unfit(f)) return {figures, fold: {...info, overview: overview.n}, unfit: true};
  }
  return {figures, fold: {...info, overview: overview.n}};
}
// The module map for a page (round 24, D-24-07; notation-model.js moduleMapScene). It is drawn whole when it fits one
// page with every word at 7 pt or more; else each module names fewer of its sub-modules (MAP_LINES: three, two, one,
// then none, counted only), and above MAP_MODULES boxes the smallest modules stand together, then fewer boxes
// (MAP_FOLDS), until it fits. Its footer says how many sub-modules a module names; its notes say what stands together.
// Never folded by the figure budget: a module is one box whatever the budget. Returns {figures, D, map: {lines, modules,
// total}} (D: the diagram drawn), or no figure where the project has no module structure to draw.
export const MAP_MODULES = 25, MAP_LINES = Object.freeze([3, 2, 1, 0]), MAP_FOLDS = Object.freeze([20, 16, 12, 8]);
export function moduleMapFigures(project, {chapter = 1, first = 1, stem, where, code = null, at = '', tail = '', print = true, scene = null} = {}) {
  const D0 = notationDiagram(project, 'module-map');
  if (!D0?.nodes.length) return {figures: [], D: D0, map: null};
  const total = D0.map?.modules || 0, counts = [Math.min(total, MAP_MODULES), ...MAP_FOLDS.filter(k => k < Math.min(total, MAP_MODULES))];
  const footOf = lines => (lines >= MAP_LINES[0] ? '' : lines ? `each module names up to ${lines} of its sub-modules` : 'each module counts its requirements without naming its sub-modules');
  let out = null, D = D0, map = null;
  for (const most of print ? counts : [total]) {
    for (const lines of print ? MAP_LINES : [MAP_LINES[0]]) {
      D = notationDiagram(project, 'module-map', {map: {lines, modules: most}}); map = {lines, modules: most, total};
      out = diagramFigures(project, D, {scene: scene || D.scene, chapter, first, stem, where, code, budget: Infinity, details: 0, print, at, tail, fit: print, foot: footOf(lines)});
      if (!print || out.figures.every(f => f.print.fits)) return {figures: out.figures, D, map};
    }
  }
  return {figures: out.figures, D, map};
}

// One manifest row: the SVG file, and the Mermaid file beside it when the figure carries one.
const manifestEntry = (f, documentFingerprint) => ({path: f.path, sha256: f.sha256, bytes: f.bytes, mediaType: f.mediaType, chapter: f.chapter, scene: f.scene, arrangement: f.arrangement, documentFingerprint, ...(f.role && f.role !== 'figure' ? {role: f.role} : {}), ...(f.parent != null ? {parent: f.parent} : {}), ...(f.mermaid ? {mermaid: {path: f.mermaidPath, sha256: f.mermaidSha256, bytes: f.mermaidBytes, mediaType: 'text/plain', kind: f.mermaidKind}} : {})});

// The requirement traceability matrix as a figure (Contract E). The rows are computed by the caller from the saved trace
// (review-domain.js reviewTrace) and passed in, one per requirement in scope, so this module stays free of the review
// model. Counts are links recorded in the design, never evidence that anything is built.
// Up to MATRIX_ROWS requirements: one row per requirement, one column per layer it is traced to, the number of linked
// records in each cell. Round 12 (P): above it, the matrix is drawn by requirement group (requirement-groups.js; the
// smaller groups together as "Other groups" beyond MATRIX_ROWS rows) against the components that realize them, by their
// module when there are more than MATRIX_COLS of them (the largest; the rest as one column), or against the running
// parts where no requirement reaches a component: each cell the number of the group's requirements reached. Every
// requirement is counted in its row; the complete requirement-to-component matrix is the annex (CSV), not the figure.
export const MATRIX_COLUMNS = [['drivers', 'Quality'], ['decisions', 'Decisions'], ['logical', 'Logical'], ['applications', 'Application'], ['capabilities', 'Capability'], ['realizations', 'Realization'], ['contracts', 'Contracts'], ['data', 'Data'], ['controls', 'Controls'], ['runtime', 'Runtime']];
export const MATRIX_ROWS = 40, MATRIX_COLS = 10;
const xml = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const FONT = 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif', FL = PRINT_FLOOR;
// The matrix's sheet: a title, a sub-line, column heads turned to read upwards, rows of cells and the key, at the print
// floor and at most PRINT.width wide.
function matrixSVG({n, caption, text, sub, heads, rows, key, foot}) {
  const LEFT = 20, LABEL = 248, NUM = 34, COL = Math.min(40, Math.floor((PRINT.width - 2 * LEFT - LABEL - NUM) / Math.max(1, heads.length))), ROW = 20, HEAD = 124, TOP = 60 + HEAD, W = Math.min(PRINT.width, 2 * LEFT + LABEL + NUM + COL * heads.length), keyY = TOP + rows.length * ROW + 18, footLines = [];
  for (const word of foot.split(' ')) { const last = footLines.at(-1); if (last != null && (last + ' ' + word).length * FL * 0.52 <= W - 2 * LEFT) footLines[footLines.length - 1] = last + ' ' + word; else footLines.push(word); }
  const H = keyY + 44 + footLines.length * 14 + 10, x0 = LEFT + LABEL + NUM;
  const head = heads.map((h, i) => `<text transform="translate(${x0 + i * COL + COL / 2 + 4} ${TOP - 8}) rotate(-60)" class="tm-col">${xml(clip(h, 22))}</text>`).join('') + `<text x="${LEFT + LABEL + NUM - 4}" y="${TOP - 8}" text-anchor="end" class="tm-col">n</text>`;
  const body = rows.map((r, j) => { const y = TOP + j * ROW; return `<g class="tm-row"><rect x="${LEFT}" y="${y}" width="${W - 2 * LEFT}" height="${ROW}" class="${j % 2 ? 'tm-odd' : 'tm-even'}"/><text x="${LEFT + 4}" y="${y + 14}" class="tm-label">${r.mark ? `<tspan class="tm-mark">${r.mark}</tspan> ` : ''}${r.ref ? `<tspan class="tm-ref">${xml(r.ref)}</tspan> ` : ''}${xml(clip(r.title, r.ref ? 30 : 38))}</text><text x="${LEFT + LABEL + NUM - 4}" y="${y + 14}" text-anchor="end" class="tm-n">${r.total ?? ''}</text>` + r.cells.map((c, i) => { const x = x0 + i * COL + 3; return c ? `<rect x="${x}" y="${y + 2}" width="${COL - 6}" height="${ROW - 4}" rx="3" class="tm-on" fill-opacity="${Math.max(0.25, Math.min(1, c / Math.max(1, r.scale || c)))}"/><text x="${x + (COL - 6) / 2}" y="${y + 14}" text-anchor="middle" class="tm-n">${c}</text>` : `<rect x="${x}" y="${y + 2}" width="${COL - 6}" height="${ROW - 4}" rx="3" class="tm-off"/>`; }).join('') + `<title>${xml(r.say)}</title></g>`; }).join('');
  const keyBox = `<g class="tm-key"><rect x="${LEFT}" y="${keyY}" width="${W - 2 * LEFT}" height="34" rx="6" class="tm-keybox"/><rect x="${LEFT + 10}" y="${keyY + 10}" width="24" height="14" rx="3" class="tm-on"/><text x="${LEFT + 22}" y="${keyY + 21}" text-anchor="middle" class="tm-n">2</text><text x="${LEFT + 40}" y="${keyY + 21}" class="tm-key-t">${xml(key[0])}</text><rect x="${LEFT + 300}" y="${keyY + 10}" width="24" height="14" rx="3" class="tm-off"/><text x="${LEFT + 330}" y="${keyY + 21}" class="tm-key-t">${xml(key[1])}</text></g>`;
  const style = `<style>.tm-title{font:600 15px Georgia,serif;fill:#1e2b26}.tm-sub{font:${FL}px ${FONT};fill:#4c5852}.tm-col{font:600 ${FL}px ${FONT};fill:#2b3a33}.tm-label{font:${FL}px ${FONT};fill:#254638}.tm-ref{font-weight:600;fill:#6d5d33}.tm-mark{fill:#5d6b57}.tm-even{fill:#fffef8}.tm-odd{fill:#f6f8f2}.tm-on{fill:#b9d0ac;stroke:#7f9a77}.tm-off{fill:#ffffff;stroke:#c9b37a;stroke-dasharray:3 3}.tm-n{font:600 ${FL}px ${FONT};fill:#24412f}.tm-keybox{fill:#fbfbf6;stroke:#d5dccd}.tm-key-t{font:${FL}px ${FONT};fill:#4c5852}.tm-foot{font:${FL}px ${FONT};fill:#75816b}</style>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="f${n}-title f${n}-desc" font-family='${FONT}'><title id="f${n}-title">${xml(caption)}</title><desc id="f${n}-desc">${xml(text)}</desc>${style}<rect width="${W}" height="${H}" fill="#ffffff"/><text x="${LEFT}" y="28" class="tm-title">Requirement traceability</text><text x="${LEFT}" y="48" class="tm-sub">${xml(clip(sub, Math.floor((W - 2 * LEFT) / (FL * 0.52))))}</text>${head}${body}${keyBox}${footLines.map((t, i) => `<text x="${LEFT}" y="${keyY + 56 + i * 14}" class="tm-foot">${xml(t)}</text>`).join('')}</svg>`;
}
export function traceabilityFigure(project, rows, {n = 1, baselineId = null, chapter = 11, listedIn = null} = {}) {
  const total = rows.length, version = project?.contentVersion != null ? 'v' + project.contentVersion : '', tail = (version ? ' · ' + version : '') + (baselineId ? ' · ' + baselineId : '');
  const path = `figures/AIW-${safe(project?.name || 'design')}-ch${chapter}-traceability-matrix${version ? '-' + version : ''}${baselineId ? '-' + safe(baselineId) : ''}.svg`;
  const where = clip(listedIn || 'The complete requirement-to-component matrix is the traceability annex (CSV, Appendix D).', 200), done = (caption, text, sheet, elements, relationships, extra = {}) => {
    const svg = matrixSVG({n, caption, text, ...sheet, foot: `AIW · ${project?.name || ''} · ${caption} · counts are links recorded in the design, never evidence that anything is built`}), m = figureLabels(svg);
    return {n, chapter, scene: 'traceability', title: 'Requirement traceability', standard: 'Traceability matrix', arrangement: 'matrix', caption, path, svg, text, sha256: sha256(svg), bytes: new TextEncoder().encode(svg).length, mediaType: 'image/svg+xml', elements, relationships, role: 'figure', print: {widthMm: PRINT.widthMm, heightMm: m.heightMm, widthPx: m.widthPx, heightPx: m.heightPx, minLabelPt: m.minPt, minLabelPx: m.minPx}, ...extra};
  };
  if (total <= MATRIX_ROWS) {
    const links = rows.reduce((t, r) => t + MATRIX_COLUMNS.reduce((u, [k]) => u + (r.counts[k] || 0), 0), 0);
    const caption = `Figure ${n} · Chapter ${chapter} · Requirement traceability (Traceability matrix) · ${plural(total, 'requirement')} × ${MATRIX_COLUMNS.length} layers${tail}`;
    const text = shortText([`Requirement traceability: ${plural(total, 'requirement')}, each against the ${MATRIX_COLUMNS.length} layers of the design (${MATRIX_COLUMNS.map(c => c[1]).join(', ')}); a cell counts the records linked in that layer, an empty cell means nothing is linked.`, `${plural(links, 'recorded link')}; ${rows.filter(r => r.confirmed).length} of the requirements are confirmed.`], where);
    const sheet = {sub: `${plural(total, 'requirement')} in scope · ${plural(links, 'recorded link')} · ${project?.name || ''}`, heads: MATRIX_COLUMNS.map(c => c[1]), rows: rows.map(r => ({mark: r.confirmed ? '✓' : '○', ref: r.ref, title: r.title, total: '', scale: 3, cells: MATRIX_COLUMNS.map(([k]) => r.counts[k] || 0), say: `${r.ref} · ${clip(r.title, 160)} · ` + MATRIX_COLUMNS.map(([k, label]) => `${label} ${r.counts[k] || 0}${(r.ids[k] || []).length ? ' (' + r.ids[k].slice(0, 12).join(', ') + ((r.ids[k] || []).length > 12 ? ', …' : '') + ')' : ''}`).join('; ')})), key: ['records linked in that layer · ✓ confirmed · ○ not yet', 'nothing linked']};
    return done(caption, text, sheet, total, links);
  }
  // By requirement group: each requirement in its first group (none: "In no requirement group"), the largest groups as
  // rows, the rest together; the columns the components (or their modules, or the running parts) the rows reach.
  let index = null, names = new Map(); try { index = groupIndex(project); names = new Map(requirementGroups(project).map((g, i) => [g.id, {title: g.title || g.id, i}])); } catch { index = null; }
  const groupOf = id => index?.of.get(id)?.[0] || '', field = rows.some(r => (r.ids.applications || []).length) ? 'applications' : 'runtime';
  const comps = new Map((project?.realisation?.components || []).map(c => [c.ref || c.id, c])), resp = new Map((project?.logical?.responsibilities || []).map(r => [r.id, r.groupId])), modules = new Map((project?.logical?.groups || []).map((g, i) => [g.id, {title: g.title || g.id, i}])), moduleOf = new Map();
  for (const m of project?.logical?.mappings || []) { const g = resp.get(m.logicalId); if (g && !moduleOf.has(m.physicalId)) moduleOf.set(m.physicalId, g); }
  const reached = new Set(rows.flatMap(r => r.ids[field] || [])), byModule = field === 'applications' && reached.size > MATRIX_COLS;
  const columnOf = ref => (byModule ? moduleOf.get(comps.get(ref)?.id) || '' : ref);
  const colTitle = k => (byModule ? (k ? modules.get(k)?.title || k : 'No module') : field === 'applications' ? (comps.get(k)?.title ? `${k} ${comps.get(k).title}` : k) : k);
  const byGroup = new Map();
  for (const r of rows) { const g = groupOf(r.ref); let x = byGroup.get(g); if (!x) byGroup.set(g, x = {key: g, reqs: [], hit: new Map(), none: 0}); x.reqs.push(r); const cols = new Set((r.ids[field] || []).map(columnOf)); if (!cols.size) x.none++; for (const c of cols) x.hit.set(c, (x.hit.get(c) || 0) + 1); }
  const order = g => (g.key ? names.get(g.key)?.i ?? 1e6 : 1e7);
  let groups = [...byGroup.values()].sort((a, b) => order(a) - order(b) || String(a.key).localeCompare(String(b.key)));
  const allGroups = groups.length;
  if (groups.length > MATRIX_ROWS) {
    const keep = new Set(groups.slice().sort((a, b) => b.reqs.length - a.reqs.length || order(a) - order(b)).slice(0, MATRIX_ROWS - 1).map(g => g.key)), other = {key: '\u0000other', reqs: [], hit: new Map(), none: 0, merged: 0};
    for (const g of groups) if (!keep.has(g.key)) { other.reqs.push(...g.reqs); other.none += g.none; other.merged++; for (const [c, k] of g.hit) other.hit.set(c, (other.hit.get(c) || 0) + k); }
    groups = [...groups.filter(g => keep.has(g.key)), other];
  }
  const colTotals = new Map(); for (const g of groups) for (const [c, k] of g.hit) colTotals.set(c, (colTotals.get(c) || 0) + k);
  const allCols = [...colTotals.keys()], shownCols = allCols.length > MATRIX_COLS - 1 ? allCols.slice().sort((a, b) => colTotals.get(b) - colTotals.get(a) || String(a).localeCompare(String(b), 'en', {numeric: true})).slice(0, MATRIX_COLS - 2) : allCols.slice().sort((a, b) => (byModule ? (modules.get(a)?.i ?? 1e6) - (modules.get(b)?.i ?? 1e6) : 0) || String(a).localeCompare(String(b), 'en', {numeric: true}));
  const restCols = allCols.filter(c => !shownCols.includes(c)), what = byModule ? 'modules' : field === 'applications' ? 'components' : 'running parts';
  const heads = [...shownCols.map(colTitle), ...(restCols.length ? [`${restCols.length} other ${what}`] : []), field === 'applications' ? 'No component' : 'Not running'];
  const titleOf = g => (g.key === '\u0000other' ? `Other groups (${g.merged})` : g.key ? names.get(g.key)?.title || g.key : 'In no requirement group');
  const cellsOf = g => [...shownCols.map(c => g.hit.get(c) || 0), ...(restCols.length ? [restCols.reduce((t, c) => t + (g.hit.get(c) || 0), 0)] : []), g.none];
  const links = groups.reduce((t, g) => t + [...g.hit.values()].reduce((u, k) => u + k, 0), 0), gaps = groups.reduce((t, g) => t + g.none, 0);
  const caption = `Figure ${n} · Chapter ${chapter} · Requirement traceability (Traceability matrix) · ${plural(total, 'requirement')} by requirement group: ${plural(allGroups, 'group')} × ${plural(allCols.length, what.replace(/s$/, ''), what)}${tail}`;
  const text = shortText([`Requirement traceability by requirement group: ${plural(total, 'requirement')} in ${plural(allGroups, 'group')}${allGroups > groups.length ? ` (the ${groups.length - 1} largest drawn, the rest as one row)` : ''}, against ${plural(allCols.length, what.replace(/s$/, ''), what)}${restCols.length ? ` (the ${shownCols.length} most reached drawn, the rest as one column)` : ''}.`, `A cell counts the group's requirements that reach ${byModule ? 'a component of that module' : field === 'applications' ? 'that component' : 'that running part'}; ${plural(gaps, 'requirement')} ${gaps === 1 ? 'reaches' : 'reach'} none.`, `The largest groups: ${groups.filter(g => g.key !== '\u0000other').sort((a, b) => b.reqs.length - a.reqs.length).slice(0, 4).map(g => `${clip(titleOf(g), 40)} (${g.reqs.length})`).join(', ')}.`], where);
  const sheet = {sub: `${plural(total, 'requirement')} in ${plural(allGroups, 'group')} × ${plural(allCols.length, what.replace(/s$/, ''), what)} · ${project?.name || ''}`, heads, rows: groups.map(g => ({ref: g.key && g.key !== '\u0000other' ? g.key : '', title: titleOf(g), total: g.reqs.length, scale: g.reqs.length, cells: cellsOf(g), say: `${titleOf(g)}: ${plural(g.reqs.length, 'requirement')}; ` + heads.map((h, i) => `${h} ${cellsOf(g)[i]}`).join('; ')})), key: [`the group's requirements that reach it (n: the group's size)`, 'none reached']};
  return done(caption, text, sheet, total, links, {by: 'requirement-group', groups: allGroups, columns: {by: what, total: allCols.length, shown: shownCols.length}, unreached: gaps});
}
// A figure set assembled from several parts, with its manifest; the caller has already numbered the figures in reading order.
export function figureSet(project, figures, omitted = [], fingerprint = null, code = null) {
  const documentFingerprint = fingerprint || digest(project);
  return {schema: FIGURE_SCHEMA, code: code || (figures.some(f => f.mermaid) ? 'mermaid' : null), figures, omitted, documentFingerprint, manifest: figures.map(f => manifestEntry(f, documentFingerprint))};
}
