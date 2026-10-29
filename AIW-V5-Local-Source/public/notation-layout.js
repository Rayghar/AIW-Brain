// Smart arrangement for the standard diagrams. A diagram (notation-model.js) is nodes, groups and
// edges; an arrangement gives each a position and each edge a route:
// - tree: a layered (Sugiyama) layout from the roots down, right-angled connectors;
// - orthogonal: the same layers left to right (integration pages);
// - radial: rings around the hub (the API gateway, the shared database);
// - layered: bands by level — business, application, services, data, technology, deployment;
// - grouped: nested containers, each laid out inside by the layered algorithm, placed by the
//   edges between them (clusters, sites, trust zones);
// - lanes: swimlanes, one per lane or container, steps in sequence order (the BPMN page).
// The layered pipeline: cycle removal, longest-path ranks balanced toward the neighbours, a rank
// wider than the page cut into rows in order, a picture far longer than wide folded, dummy nodes for long edges, alternating barycenter sweeps with
// adjacent transposition until crossings stop falling, x-coordinates by priority, then orthogonal
// routing on a cell grid where an element is never crossed and parallel runs take separate cells,
// and label placement by a collision search along each route.
// Deterministic: the same diagram and choices give the same picture at any window width. A pinned
// node keeps the place the reader dragged it to (relative to its container); unpinned neighbours
// move out of its way; its group grows around it. A position is never a model fact.
import {styleOf, KINDS} from './notation-palette.js';
export const NL = {W: 168, H: 62, MAXNW: 236, HG: 44, VG: 72, LEFT: 28, TOP: 84, GPAD: 18, GHEAD: 30, GGAP: 36, MAXW: 1500, PAGE: 1400, PAGEH: 900, FOLD_V: 2400, FOLD_H: 2800, EVENT: 40, GATE: 44, TASK_W: 150, TASK_H: 50, CELL: 8, MAXR: 7, KICKER: 9, TITLE: 12};
const LEVELS = [[0, 'Business'], [1, 'Process'], [2, 'Application'], [3, 'Services'], [4, 'Data'], [5, 'Technology'], [6, 'Technology (physical)'], [7, 'Deployment']];
const DUMMY_W = 14;

// ---------------------------------------------------------------- text and sizes
// Sizes come from the text, measured once per title by character width (no DOM, so the SDD figure
// and the screen agree): a 9 px upper-case kicker, a 12 px title wrapped to three lines, a sub-line.
export const charW = (s, px) => { let w = 0; for (const ch of String(s)) w += /[A-Z]/.test(ch) ? px * 0.68 : /[mw]/.test(ch) ? px * 0.82 : /[il.,:;'| ]/.test(ch) ? px * 0.3 : /[0-9]/.test(ch) ? px * 0.56 : px * 0.54; return w; };
export function wrapText(s, maxW, px, maxLines = 3) {
  const words = String(s || '').split(' ').filter(Boolean), lines = []; let cur = '';
  for (const w of words) { const next = cur ? cur + ' ' + w : w; if (charW(next, px) <= maxW || !cur) cur = next; else { lines.push(cur); cur = w; } }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { const kept = lines.slice(0, maxLines); let last = kept[maxLines - 1]; while (last.length > 1 && charW(last + '…', px) > maxW) last = last.slice(0, -1); kept[maxLines - 1] = last.replace(/[\s,;:]+$/, '') + '…'; return kept; }
  return lines.map(l => { if (charW(l, px) <= maxW) return l; let t = l; while (t.length > 1 && charW(t + '…', px) > maxW) t = t.slice(0, -1); return t + '…'; });
}
// Printed (round 12, P: a page with `print`, the print floor in px), a kicker longer than the narrowest element prints as
// its kind's short word (notation-svg.js kickerOf), so the element is sized by the word it prints, not the longer one.
function kickerWidth(n) {
  const full = String(n.kicker || '').toUpperCase(), printedW = t => charW(t, PRINT_PX) * 1.12 + 28;
  const kick = PRINT_PX && printedW(full) > NL.W ? String(KINDS[n.kind]?.short || n.kicker || '').toUpperCase() : full;
  return PRINT_PX ? printedW(kick) : 20 + charW(kick, 9.5) * 1.04 + 0.04 * 9.5 * kick.length + 10;
}
// A folded group drawn as a list box (round 24, D-24-07; figure-budget.js aggregate names its members): its kind band, its
// title (two lines at most), its counts and a rule, then up to six of its members, the most connected first, each by its
// reference and title, and "and N more", one line each at the size the picture draws its small words (`px`: the print
// floor on a printed page, 10 px on screen), as wide as its longest line within the widest element. The layout sizes the
// box by it and the renderer (notation-svg.js) writes the same lines, so the two never disagree. A lane card of the
// Layers overview (fold.preview, layers-view.js) keeps its own drawing.
// An element that lists its parts is drawn the same way (round 24, D-24-07: the module map's modules name their
// sub-modules, a kind of external system its systems): `listing` {list: [{id, ref, title, n}], count, n, compact, w},
// where an item's `n` is a count drawn at the right of its line (a sub-module's requirements) and `count` is how many
// parts there are in all. A compact listing (the map's modules) has no kind band: its title and its own count (`n`) on
// the first line, then its parts, so that twenty-five modules stand on one printed page; `w` is the width it asks for.
export const listOf = n => (n?.fold ? (n.fold.list?.length && !n.fold.preview ? {list: n.fold.list, count: n.fold.count ?? n.fold.members?.length ?? n.fold.list.length} : null) : n?.listing ? {list: n.listing.list || [], count: n.listing.count ?? (n.listing.list || []).length} : null);
export const isListBox = n => !!listOf(n);
// A list box is at most LIST_W px wide, so three stand side by side on the A4 portrait page (680 px less its margins,
// NL.HG apart) and seven across the screen's overview page: an overview of many groups stays within one page, and on
// screen within the zoom that brings it all into view. A longer name is shortened; the element's title and the
// companion carry it whole.
export const LIST_W = 178;
const counted = v => (v == null || v === '' ? '' : typeof v === 'number' ? v.toLocaleString('en-GB') : String(v));
export function listBox(n, px = PRINT_PX || 10, width = null) {
  const f = listOf(n), line = Math.ceil(px * 1.3), more = Math.max(0, f.count - f.list.length);
  const said = f.list.map(x => ({ref: x.ref && x.ref !== x.title ? String(x.ref) : '', text: (x.ref && x.ref !== x.title ? x.ref + ' ' : '') + x.title, n: counted(x.n)}));
  const moreText = more ? `and ${more.toLocaleString('en-GB')} more` : '';
  // A count stands at the right of its line, 8 px clear of the words it counts.
  const room = t => (t ? charW(t, px) + 8 : 0);
  // Each member on one line, shortened where it is wider than the box; its reference stays marked while the line keeps it.
  const itemsIn = (w, left) => said.map(x => { const t = wrapText(x.text, w - left - 14 - room(x.n), px, 1)[0] || ''; return {text: t, ref: x.ref && t.startsWith(x.ref + ' ') ? x.ref : '', n: x.n}; });
  if (n.listing?.compact) {
    // (`note`: a last line in the manner of "and N more", such as what a platform module serves; a box that names none of
    // its parts counts them on its first line alone, with no "and N more")
    const w = width ?? n.listing.w ?? LIST_W, own = counted(n.listing.n), lines = wrapText(n.title, w - 16 - room(own), NL.TITLE, 2), rule = 15 + (lines.length - 1) * 14 + 6, items = itemsIn(w, 8);
    const rest = items.length ? moreText : '', note = n.listing.note ? wrapText(n.listing.note, w - 22, px, 1)[0] : '', rows = items.length + (rest ? 1 : 0) + (note ? 1 : 0);
    return {compact: true, w, h: rows ? rule + line * rows + 5 : rule + 1, lines, titleY: 15, own, subY: 0, rule: rows ? rule : 0, line, items, more: rest, note, at: i => rule + line * (i + 1) - 3};
  }
  // (10 px of margin at the left, 14 at the right: a face wider than the measure still ends inside the box)
  const w = width ?? n.listing?.w ?? Math.round(Math.max(NL.W, Math.min(LIST_W, Math.max(kickerWidth(n), ...[...said.map(x => x.text + (x.n ? ' ' + x.n : '')), moreText].map(t => charW(t, px) + 28)))));
  const lines = wrapText(n.title, w - 16, NL.TITLE, 2), subY = 32 + (lines.length - 1) * 14 + 13, rule = subY + 6;
  const items = itemsIn(w, 10);
  return {w, h: rule + line * (items.length + (more ? 1 : 0)) + 5, lines, subY, rule, line, items, more: moreText, at: i => rule + line * (i + 1) - 3};
}
function naturalSize(n) {
  if (isListBox(n)) { const B = listBox(n); return {w: B.w, h: B.h, lines: B.lines.length}; }
  if (n.kind === 'event') return {w: NL.EVENT, h: NL.EVENT};
  if (n.kind === 'gateway') return {w: NL.GATE, h: NL.GATE};
  if (n.kind === 'task') return {w: NL.TASK_W, h: NL.TASK_H};
  // A collapsed sub-process (round 6): a task with room for its count and the marker.
  if (n.kind === 'subprocess') return {w: NL.TASK_W + 30, h: NL.TASK_H + 18};
  const w = Math.round(Math.max(NL.W, Math.min(NL.MAXNW, kickerWidth(n))));
  const lines = wrapText(n.title, w - 16, NL.TITLE, 3).length;
  // Printed, the reference stands on a line of its own under the sub-line, which prints larger.
  const h = Math.round(Math.max(NL.H, 16 + 4 + lines * 14 + (n.sub ? 13 : 0) + 8 + (PRINT_PX && n.ref && n.sub ? 12 : 0)));
  return {w, h, lines};
}
// Reader sizing belongs to one picture. A request cannot shrink text below its natural box or
// stretch notation whose dimensions carry meaning (events, gateways, lifelines and summary cards).
export const canSize = n => !!n && !n.fold && !isListBox(n) && !['event', 'gateway', 'lifeline'].includes(n.kind);
export function sizeOf(n) {
  const b = naturalSize(n), s = canSize(n) && n.layoutSize;
  if (!s) return b;
  return {...b, w: Number.isFinite(s.w) ? Math.max(b.w, Math.min(640, Math.round(s.w))) : b.w, h: Number.isFinite(s.h) ? Math.max(b.h, Math.min(640, Math.round(s.h))) : b.h};
}
const byId = list => new Map(list.map(x => [x.id, x]));
export const overlaps = (a, b, m = 0) => a.x < b.x + b.w - m && b.x < a.x + a.w - m && a.y < b.y + b.h - m && b.y < a.y + a.h - m;

// Standard arrangement commands share the same boxes as the renderer and return workspace
// preferences only. Reject an ambiguous scope or collision before a pin can be silently released.
export function arrangeSelection(D, L, ids, action, {pins = {}, sizes = {}, grid = 16, dx = 0, dy = 0, layout = {}} = {}) {
  const fail = reason => ({ok: false, reason}), selected = [...new Set(ids || [])], nodes = byId(D?.nodes || []), boxes = byId(L?.nodes || []), groups = byId(L?.groups || []);
  const allowed = ['left', 'center', 'right', 'top', 'middle', 'bottom', 'distribute-horizontal', 'distribute-vertical', 'same-width', 'same-height', 'same-size', 'snap', 'move'];
  if (!allowed.includes(action)) return fail('Choose an available arrangement command.');
  const minimum = action.startsWith('distribute-') ? 3 : ['snap', 'move'].includes(action) ? 1 : 2;
  if (selected.length < minimum || selected.length > 200) return fail(`Select ${minimum === 1 ? 'one or more' : minimum + ' or more'} visible elements, up to 200.`);
  if (selected.some(id => !nodes.has(id) || !boxes.has(id))) return fail('The selection changed. Select visible elements again.');
  if (L?.arrangement === 'sequence' || selected.some(id => nodes.get(id).fold)) return fail('Open the individual records before arranging them; sequence and overview positions carry their own meaning.');
  const ownGroup = id => groups.has(nodes.get(id).group) ? nodes.get(id).group : null;
  if (new Set(selected.map(ownGroup)).size > 1) return fail('Select elements within one recorded boundary to arrange them together.');
  const bandKey = L.arrangement === 'by-layer' ? (D.viewBands ? 'viewBand' : 'layer') : L.arrangement === 'layered' ? 'level' : null;
  if (bandKey && !['left', 'center', 'right', 'same-width', 'same-height', 'same-size', 'snap'].includes(action) && !(action === 'move' && dy === 0) && new Set(selected.map(id => nodes.get(id)[bandKey])).size > 1) return fail('Keep each element in its architecture lane. Select one lane for vertical alignment or distribution.');
  const next = selected.map(id => ({...boxes.get(id)})), dimension = action.startsWith('same-'), dimensions = {...sizes};
  const checked = (result, reason) => {
    const candidate = notationLayout(D, {...layout, arrangement: L.arrangement, pins: result, sizes: dimensions, positionsOnly: true});
    if (candidate.droppedPins.some(id => selected.includes(id) || !(L.droppedPins || []).includes(id))) return fail('This arrangement conflicts with a saved pin. Release the conflicting pin or restore the previous sizes first.');
    // A moved pin can push an unpinned neighbour outward. Check the enclosing boundaries after
    // that reflow as well as the selected boxes, without routing all their connectors twice.
    const area = (a, b) => a && b ? Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)) : 0;
    for (const g of candidate.groups) {
      if (candidate.groups.some(h => g.id !== h.id && g.parent === h.parent && area(g, h) > area(groups.get(g.id), groups.get(h.id)) + 1)) return fail('This would make recorded boundaries overlap. Add space or release a pin before arranging these elements.');
      for (const b of candidate.nodes) {
        let own = nodes.get(b.id).group, guard = 0;
        while (own && own !== g.id && guard++ < 50) own = groups.get(own)?.parent;
        if (own !== g.id && area(b, g) > area(boxes.get(b.id), groups.get(g.id)) + 1) return fail('This would place an element inside a different recorded boundary. Keep the selection within its own boundary.');
      }
    }
    return {ok: true, reason, pins: result, sizes: dimensions, ids: selected};
  };
  if (dimension) {
    if (selected.some(id => !canSize(nodes.get(id)))) return fail('Choose ordinary record boxes to match sizes; notation symbols and summary cards keep their own proportions.');
    const w = Math.max(...next.map(b => Math.max(b.w, naturalSize(nodes.get(b.id)).w))), h = Math.max(...next.map(b => Math.max(b.h, naturalSize(nodes.get(b.id)).h)));
    for (const b of next) { if (action !== 'same-height') b.w = w; if (action !== 'same-width') b.h = h; dimensions[b.id] = {w: b.w, h: b.h}; }
    return checked({...pins}, `${selected.length} elements matched in size; unpinned elements reflow within their recorded boundaries.`);
  } else if (action === 'move') {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return fail('Use finite drawing distances.');
    const step = Number.isFinite(grid) && grid > 0 ? Math.max(4, Math.min(64, Math.round(grid))) : 0;
    const mx = step ? Math.round(dx / step) * step : Math.round(dx), my = step ? Math.round(dy / step) * step : Math.round(dy);
    for (const b of next) { b.x += mx; b.y += my; }
  } else if (action.startsWith('distribute-')) {
    const horizontal = action === 'distribute-horizontal', key = horizontal ? 'x' : 'y', extent = horizontal ? 'w' : 'h';
    next.sort((a, b) => a[key] - b[key] || a.id.localeCompare(b.id));
    const start = next[0][key], end = Math.max(...next.map(b => b[key] + b[extent])), gap = Math.max(16, (end - start - next.reduce((t, b) => t + b[extent], 0)) / (next.length - 1));
    let at = start; for (const b of next) { b[key] = Math.round(at); at += b[extent] + gap; }
  } else if (action === 'snap') {
    const step = Math.max(4, Math.min(64, Number.isFinite(grid) ? Math.round(grid) : 16));
    for (const b of next) { const g = groups.get(ownGroup(b.id)), band = bandKey && L.bands.find(x => x[bandKey] === nodes.get(b.id)[bandKey]); const x0 = g ? g.x + NL.GPAD : 0, y0 = g ? g.y + NL.GHEAD + NL.GPAD : band ? band.y + 24 : NL.TOP; b.x = Math.max(x0, x0 + Math.round((b.x - x0) / step) * step); b.y = Math.max(y0, y0 + Math.round((b.y - y0) / step) * step); }
  } else {
    const horizontal = ['left', 'center', 'right'].includes(action), key = horizontal ? 'x' : 'y', extent = horizontal ? 'w' : 'h';
    const start = Math.min(...next.map(b => b[key])), end = Math.max(...next.map(b => b[key] + b[extent]));
    for (const b of next) b[key] = Math.round(['left', 'top'].includes(action) ? start : ['right', 'bottom'].includes(action) ? end - b[extent] : (start + end - b[extent]) / 2);
  }
  const chosen = new Set(selected), fixed = (L.nodes || []).filter(b => !chosen.has(b.id) && (b.pinned || pins[b.id]));
  if (next.some((b, i) => next.slice(i + 1).some(c => overlaps(b, c)) || fixed.some(c => overlaps(b, c)))) return fail('This arrangement would overlap selected or pinned elements. Add space or release the conflicting pin first.');
  const result = {...pins};
  for (const b of next) {
    const n = nodes.get(b.id), g = groups.get(ownGroup(b.id)), band = bandKey && L.bands.find(x => x[bandKey] === n[bandKey]);
    if (b.x < 0 || b.y < 0 || b.x > 20000 || b.y > 20000) return fail('Keep the arrangement within the drawing limits.');
    if (band && (b.y < band.y + 20 || b.y + b.h > band.y + band.h - 8)) return fail('This would cross the architecture lane. Arrange within the lane or use Smart arrange.');
    if (g) {
      const modelGroup = D.groups.find(x => x.id === g.id), pad = padOf(modelGroup), grown = {x: Math.min(g.x, b.x - pad), y: Math.min(g.y, b.y - NL.GHEAD - pad), w: 0, h: 0};
      grown.w = Math.max(g.x + g.w, b.x + b.w + pad) - grown.x; grown.h = Math.max(g.y + g.h, b.y + b.h + pad) - grown.y;
      if (b.x < g.x + pad || b.y < g.y + NL.GHEAD + pad || [...groups.values()].some(other => other.id !== g.id && other.parent === g.parent && overlaps(grown, other))) return fail('This would overlap a boundary or its heading. Keep the selection inside its recorded boundary.');
      result[b.id] = {x: b.x, y: b.y, group: g.id, dx: b.x - g.x, dy: b.y - g.y};
    } else result[b.id] = {x: b.x, y: b.y};
  }
  if (Object.keys(result).length > 200) return fail('Release some existing pins before pinning more than 200 elements in this picture.');
  return checked(result, `${selected.length} element${selected.length === 1 ? '' : 's'} arranged; architectural records and relationships are unchanged.`);
}

// ---------------------------------------------------------------- the layered pipeline
// The hierarchy an edge expresses: its target stands above its source when the style says so
// (a realizer below what it realizes), else its source stands above its target.
const parentChild = e => (e.up ? [e.to, e.from] : [e.from, e.to]);
function graphOf(items, edges) {
  const ids = items.map(n => n.id), index = new Map(ids.map((id, i) => [id, i]));
  const out = new Map(ids.map(id => [id, []])), inn = new Map(ids.map(id => [id, []])), seen = new Set(), pairs = [];
  for (const e of edges) { const [a, b] = parentChild(e); if (a === b || !index.has(a) || !index.has(b)) continue; const k = a + '\u0001' + b; if (seen.has(k) || seen.has(b + '\u0001' + a)) continue; seen.add(k); pairs.push([a, b]); }
  // Cycles cut by depth-first order: a back edge is reversed for ranking only (the picture keeps its arrow).
  const adj = new Map(ids.map(id => [id, []])); for (const [a, b] of pairs) adj.get(a).push(b);
  const state = new Map(), kept = [];
  const visit = u => { state.set(u, 1); for (const v of adj.get(u)) { if (state.get(v) === 1) { kept.push([v, u]); continue; } kept.push([u, v]); if (!state.has(v)) visit(v); } state.set(u, 2); };
  const indeg = new Map(ids.map(id => [id, 0])); for (const [, b] of pairs) indeg.set(b, indeg.get(b) + 1);
  for (const id of ids) if (!indeg.get(id) && !state.has(id)) visit(id);
  for (const id of ids) if (!state.has(id)) visit(id);
  const seen2 = new Set();
  for (const [a, b] of kept) { const k = a + '\u0001' + b; if (seen2.has(k) || seen2.has(b + '\u0001' + a)) continue; seen2.add(k); out.get(a).push(b); inn.get(b).push(a); }
  return {ids, index, out, inn};
}
// Ranks: longest path from the sources, then balanced toward the neighbours (a node with parents and
// children moves to the mean of its neighbours' ranks; a source moves down next to its children).
function rankOf(G, {fixed = null} = {}) {
  const r = new Map();
  if (fixed) { for (const id of G.ids) r.set(id, fixed.get(id)); return r; }
  const depth = id => { if (r.has(id)) return r.get(id); r.set(id, 0); const ps = G.inn.get(id); const d = ps.length ? 1 + Math.max(...ps.map(depth)) : 0; r.set(id, d); return d; };
  for (const id of G.ids) depth(id);
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const id of G.ids) {
      const ps = G.inn.get(id), cs = G.out.get(id);
      if (!ps.length && cs.length) { const want = Math.min(...cs.map(c => r.get(c))) - 1; if (want > r.get(id)) { r.set(id, want); moved = true; } continue; }
      if (ps.length && cs.length) { const lo = Math.max(...ps.map(p => r.get(p))) + 1, hi = Math.min(...cs.map(c => r.get(c))) - 1; if (hi < lo) continue; const mean = Math.round((ps.reduce((s, p) => s + r.get(p), 0) + cs.reduce((s, c) => s + r.get(c), 0)) / (ps.length + cs.length)); const want = Math.max(lo, Math.min(hi, mean)); if (want !== r.get(id)) { r.set(id, want); moved = true; } }
    }
    if (!moved) break;
  }
  const min = Math.min(0, ...r.values()); for (const [id, v] of r) r.set(id, v - min);
  return r;
}
// Ordering within the ranks: dummies for long edges, then alternating barycenter sweeps with
// adjacent transposition, keeping the order with the fewest crossings.
// The dummies are bounded (round 5, scale): a picture would need more than MAX_DUMMIES only at a scale no reference
// picture comes near (the most any orders is 2,344, the stress project's connected Chapter 11 model); beyond it the
// shortest edges keep their corridors, in order of span, and a longer one is linked straight to its end and routed
// without a planned corridor. 500 components in seven ranks cut into rows asked for 222,014.
export const MAX_DUMMIES = 4000;
function orderOf(G, ranks) {
  const rows = new Map(), nodeRank = new Map(ranks), chains = new Map(), up = new Map(), down = new Map();
  const add = (id, rank) => { if (!rows.has(rank)) rows.set(rank, []); rows.get(rank).push(id); nodeRank.set(id, rank); if (!up.has(id)) up.set(id, []); if (!down.has(id)) down.set(id, []); };
  for (const id of G.ids) add(id, ranks.get(id));
  const span = (a, b) => Math.max(0, nodeRank.get(b) - nodeRank.get(a) - 1);
  let wanted = 0; for (const a of G.ids) for (const b of G.out.get(a)) wanted += span(a, b);
  let corridors = null;
  if (wanted > MAX_DUMMIES) {
    const all = []; for (const a of G.ids) for (const b of G.out.get(a)) if (span(a, b)) all.push([a, b, span(a, b), all.length]);
    all.sort((x, y) => x[2] - y[2] || x[3] - y[3]);
    corridors = new Set(); let used = 0;
    for (const [a, b, n] of all) { if (used + n > MAX_DUMMIES) break; used += n; corridors.add(a + '\u0001' + b); }
  }
  let dummies = 0;
  for (const a of G.ids) for (const b of G.out.get(a)) {
    const ra = nodeRank.get(a), rb = corridors && !corridors.has(a + '\u0001' + b) ? ra : nodeRank.get(b), chain = [a];
    let prev = a;
    for (let rank = ra + 1; rank < rb; rank++) { const d = '\u0000d' + dummies++; add(d, rank); chain.push(d); down.get(prev).push(d); up.get(d).push(prev); prev = d; }
    chain.push(b); down.get(prev).push(b); up.get(b).push(prev);
    chains.set(a + '\u0001' + b, chain);
  }
  const rankKeys = [...rows.keys()].sort((x, y) => x - y);
  const pos = new Map();
  const place = () => rankKeys.forEach(k => rows.get(k).forEach((id, i) => pos.set(id, i)));
  // The first order: each rank by the mean position of its parents, then by the input order. Every rank is placed after
  // the first is sorted; after that only the rank just sorted moves (round 5, scale: placing every rank again after each
  // sort gave the same positions at the cost of ranks × nodes).
  let placed = false;
  for (const k of rankKeys) { const row = rows.get(k); row.sort((a, b) => { const pa = up.get(a).map(p => pos.get(p)).filter(x => x != null), pb = up.get(b).map(p => pos.get(p)).filter(x => x != null); const ma = pa.length ? pa.reduce((s, x) => s + x, 0) / pa.length : 1e9, mb = pb.length ? pb.reduce((s, x) => s + x, 0) / pb.length : 1e9; return ma - mb || (G.index.get(a) ?? 1e6) - (G.index.get(b) ?? 1e6); }); if (!placed) { place(); placed = true; } else row.forEach((id, i) => pos.set(id, i)); }
  place();
  // The crossings between two ranks: the pairs of edges whose ends are in opposite order, counted over the edges in
  // order of their upper end with a running count of the lower ends seen (a Fenwick tree), the same count as comparing
  // every pair of edges (round 5, scale).
  const crossingsBetween = (upper, lower) => {
    const pairs = []; for (const v of lower) for (const u of up.get(v)) pairs.push([pos.get(u), pos.get(v)]);
    pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let size = 1; for (const [, b] of pairs) if (b + 2 > size) size = b + 2;
    const tree = new Int32Array(size + 1), addAt = i => { for (i++; i <= size; i += i & -i) tree[i]++; }, upTo = i => { let n = 0; for (i++; i > 0; i -= i & -i) n += tree[i]; return n; };
    let c = 0, seen = 0;
    for (let i = 0; i < pairs.length;) {
      let j = i; while (j < pairs.length && pairs[j][0] === pairs[i][0]) j++;
      for (let k = i; k < j; k++) c += seen - upTo(pairs[k][1]);
      for (let k = i; k < j; k++) { addAt(pairs[k][1]); seen++; }
      i = j;
    }
    return c;
  };
  const total = () => { let c = 0; for (let i = 1; i < rankKeys.length; i++) c += crossingsBetween(rows.get(rankKeys[i - 1]), rows.get(rankKeys[i])); return c; };
  const bary = (id, nb) => { const ps = nb.get(id).map(p => pos.get(p)); return ps.length ? ps.reduce((s, x) => s + x, 0) / ps.length : null; };
  const sweep = (keys, nb) => { for (const k of keys) { const row = rows.get(k), b = new Map(row.map(id => [id, bary(id, nb) ?? pos.get(id)])); row.sort((x, y) => b.get(x) - b.get(y) || pos.get(x) - pos.get(y)); row.forEach((id, i) => pos.set(id, i)); } };
  // Swapping two neighbours changes only the crossings among their own edges.
  const transpose = () => {
    let improved = false;
    for (const k of rankKeys) {
      const row = rows.get(k);
      for (let i = 0; i + 1 < row.length; i++) {
        const u = row[i], v = row[i + 1]; let keep = 0, swap = 0;
        for (const nb of [up, down]) for (const a of nb.get(u)) for (const b of nb.get(v)) { if (pos.get(a) > pos.get(b)) keep++; else if (pos.get(a) < pos.get(b)) swap++; }
        if (swap < keep) { row[i] = v; row[i + 1] = u; pos.set(v, i); pos.set(u, i + 1); improved = true; }
      }
    }
    return improved;
  };
  let best = total(), bestRows = new Map(rankKeys.map(k => [k, rows.get(k).slice()])), still = 0;
  for (let iter = 0; iter < 12 && best > 0; iter++) {
    if (iter % 2 === 0) sweep(rankKeys.slice(1), up); else sweep(rankKeys.slice(0, -1).reverse(), down);
    for (let t = 0; t < 4 && transpose(); t++);
    const c = total();
    if (c < best) { best = c; bestRows = new Map(rankKeys.map(k => [k, rows.get(k).slice()])); still = 0; } else if (++still >= 3) break;
  }
  for (const k of rankKeys) rows.set(k, bestRows.get(k));
  place();
  return {rows, rankKeys, pos, chains, up, down, nodeRank, crossings: best, wanted};
}
// Coordinates along each rank: each node is drawn toward the mean of its neighbours (dummies and
// well-connected nodes first), then the rank is separated left to right and re-centred, so no
// two nodes touch and no rank creeps away from the others. Bounded: the mean never leaves the
// span of the picture, and the separation adds at most the rank's own width.
function coordinates(O, sizeAlong, gap, pairGap = null) {
  const u = new Map(), extent = id => (id.startsWith('\u0000') ? DUMMY_W : sizeAlong(id)), gapOf = id => (id.startsWith('\u0000') ? 12 : gap);
  // Two neighbours joined by a labelled link stand far enough apart for the word between them.
  const between = (a, b) => Math.max(gapOf(a), pairGap?.get(a + '\u0001' + b) || 0);
  for (const k of O.rankKeys) { let x = 0; const row = O.rows.get(k); row.forEach((id, i) => { u.set(id, x); x += extent(id) + (row[i + 1] ? between(id, row[i + 1]) : gapOf(id)); }); }
  const center = id => u.get(id) + extent(id) / 2;
  const separate = row => {
    if (!row.length) return;
    const before = row.map(id => u.get(id));
    for (let i = 1; i < row.length; i++) { const min = u.get(row[i - 1]) + extent(row[i - 1]) + between(row[i - 1], row[i]); if (u.get(row[i]) < min) u.set(row[i], min); }
    for (let i = row.length - 2; i >= 0; i--) { const max = u.get(row[i + 1]) - between(row[i], row[i + 1]) - extent(row[i]); if (u.get(row[i]) > max) u.set(row[i], max); }
    for (let i = 1; i < row.length; i++) { const min = u.get(row[i - 1]) + extent(row[i - 1]) + between(row[i - 1], row[i]); if (u.get(row[i]) < min) u.set(row[i], min); }
    const drift = row.reduce((s, id, i) => s + (u.get(id) - before[i]), 0) / row.length;
    for (const id of row) u.set(id, u.get(id) - drift);
  };
  const settle = (keys, nb) => {
    for (const k of keys) {
      const row = O.rows.get(k);
      const want = new Map(row.map(id => { const ns = nb.get(id).map(center); return [id, ns.length ? ns.reduce((s, x) => s + x, 0) / ns.length - extent(id) / 2 : null]; }));
      // A node without neighbours on this side keeps its place relative to the one beside it.
      for (let i = 0; i < row.length; i++) if (want.get(row[i]) == null) { const left = row[i - 1], right = row[i + 1]; want.set(row[i], left != null && want.get(left) != null ? want.get(left) + extent(left) + gapOf(left) : right != null && want.get(right) != null ? want.get(right) - gapOf(row[i]) - extent(row[i]) : u.get(row[i])); }
      // The well-connected and the dummies have priority: a lightly connected node yields to them.
      const prio = new Map(row.map(id => [id, id.startsWith('\u0000') ? 1e6 : nb.get(id).length]));
      for (const id of row) u.set(id, u.get(id) + (want.get(id) - u.get(id)) * Math.min(1, 0.4 + prio.get(id) / 4));
      separate(row);
    }
  };
  for (let pass = 0; pass < 4; pass++) { settle(O.rankKeys.slice(1), O.up); settle(O.rankKeys.slice(0, -1).reverse(), O.down); }
  settle(O.rankKeys.slice(1), O.up);
  for (const k of O.rankKeys) separate(O.rows.get(k));
  // A loop, not Math.min(...u.values()): a picture with many long connectors has more positions than a call may take arguments.
  let min = Infinity; for (const x of u.values()) if (x < min) min = x;
  for (const [id, x] of u) u.set(id, Math.round(x - min));
  return u;
}
// Cuts an ordered rank into balanced rows no longer than the page allows, keeping the order, so
// siblings stay side by side; returns the rows.
function cutRow(ids, extent, gap, limit) {
  const total = ids.reduce((s, id) => s + extent(id) + gap, -gap);
  if (ids.length < 2 || total <= limit) return [ids];
  const parts = Math.min(ids.length, Math.ceil(total / limit)), size = Math.ceil(ids.length / parts), out = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  // On a printed page (round 12, P) every row fits: with elements of different widths, rows of one fewer each until
  // they do (a single element is a row of its own).
  const fits = rows => rows.every(row => row.reduce((s, id) => s + extent(id) + gap, -gap) <= limit);
  if (PAGE_ON && !fits(out)) for (let k = size - 1; k >= 1; k--) { const n = Math.ceil(ids.length / Math.ceil(ids.length / k)), rows = []; for (let i = 0; i < ids.length; i += n) rows.push(ids.slice(i, i + n)); if (fits(rows) || k === 1) return rows; }
  return out;
}
// A layered layout of items (nodes or blocks) with the edges among them; positions start at (0, 0).
// A rank wider than the page is cut into rows (in order); a picture much longer than it is wide
// folds into lines side by side (top-to-bottom pictures) or one under another (left-to-right
// pictures), aiming at a landscape page, so a long chain reads like text rather than a ribbon.
function layered(items, edges, {vertical = true, fixedRank = null, wrap = true, fold = wrap} = {}) {
  const S = byId(items);
  if (!items.length) return {P: new Map(), W: 0, H: 0, rows: [], rankOf: new Map(), way: new Map(), crossings: 0};
  const along = id => (vertical ? S.get(id).w : S.get(id).h), across = id => (vertical ? S.get(id).h : S.get(id).w);
  const G = graphOf(items, edges);
  let ranks = rankOf(G, {fixed: fixedRank}), O = orderOf(G, ranks);
  if (wrap && !fixedRank) {
    const limit = vertical ? NL.PAGE - 2 * NL.LEFT : NL.PAGEH, fine = new Map(); let r = 0, cut = false;
    let rows = [];
    for (const k of O.rankKeys) { const real = O.rows.get(k).filter(id => !id.startsWith('\u0000')), cutRows = cutRow(real, along, NL.HG, limit); if (cutRows.length > 1) cut = true; rows.push(...cutRows); }
    // On a printed page (round 12, P) consecutive rows that fit the page together share one, so a chain of single
    // elements reads three to a row instead of running down several pages.
    if (PAGE_ON && vertical) { const packed = [], width = row => row.reduce((s, id) => s + along(id) + NL.HG, -NL.HG); for (const row of rows) { const last = packed[packed.length - 1]; if (last && width(last) + NL.HG + width(row) <= limit) { last.push(...row); cut = true; } else packed.push(row.slice()); } rows = packed; }
    for (const row of rows) { for (const id of row) fine.set(id, r); r++; }
    if (cut) { ranks = fine; O = orderOf(G, ranks); }
  }
  // Links within a rank (a flow between two steps side by side) carry their word in the gap (not on a printed page,
  // whose rows are packed to its width: the word stands along the route instead).
  const pairGap = new Map();
  if (vertical && !PAGE_ON) for (const e of edges) { const word = (e.step ? e.step + ' ' : '') + (e.label || ''); if (!word || ranks.get(e.from) !== ranks.get(e.to)) continue; const g = labelWidth(word) + 28; for (const k of [e.from + '\u0001' + e.to, e.to + '\u0001' + e.from]) pairGap.set(k, Math.max(pairGap.get(k) || 0, g)); }
  const u = coordinates(O, along, NL.HG, pairGap);
  // On a printed page (round 12, P) the barycentre pass may not spread the rows wider than the page: each row is packed
  // in its order and centred on the widest, and the long edges find their own way (no corridor is planned).
  if (PAGE_ON && vertical) {
    const gapOf = (a, b) => Math.max(NL.HG, pairGap.get(a + '\u0001' + b) || 0), rowsReal = O.rankKeys.map(k => O.rows.get(k).filter(id => !id.startsWith('\u0000')));
    const width = row => row.reduce((t, id, i) => t + along(id) + (i ? gapOf(row[i - 1], id) : 0), 0), widest = Math.max(0, ...rowsReal.map(width));
    for (const row of rowsReal) { let x = Math.round((widest - width(row)) / 2); row.forEach((id, i) => { if (i) x += gapOf(row[i - 1], id); u.set(id, x); x += along(id); }); }
  }
  // On a printed page (round 12, P) a gap between two rows that no route can cross is narrow (QUIET_GAP): no relationship
  // runs from a row above it to a row below it or along either row, and no element of either row is related outside
  // this layout (a container's element, a block) — a group's unrelated elements read as a grid rather than a ladder.
  let quiet = null;
  if (PAGE_ON && vertical) {
    const rowOf = new Map(), inner = new Map(), busy = O.rankKeys.map(() => false);
    O.rankKeys.forEach((k, i) => { for (const id of O.rows.get(k)) rowOf.set(id, i); });
    for (const e of edges) {
      const a = rowOf.get(e.from), b = rowOf.get(e.to); if (a == null || b == null) continue;
      for (const id of [e.from, e.to]) inner.set(id, (inner.get(id) || 0) + 1);
      const lo = Math.min(a, b), hi = Math.max(a, b);
      if (lo === hi) { busy[lo] = true; if (lo) busy[lo - 1] = true; } else for (let i = lo; i < hi; i++) busy[i] = true;
    }
    for (const [id, i] of rowOf) if (!id.startsWith('\u0000') && (!PAGE_NODES.has(id) || (PAGE_DEGREE.get(id) || 0) > (inner.get(id) || 0))) { busy[i] = true; if (i) busy[i - 1] = true; }
    quiet = busy.map(b => !b);
  }
  const P = new Map(), rowsOut = [], mid = new Map(), dummyRow = new Map(); let v = 0;
  for (const [ri, k] of O.rankKeys.entries()) {
    const row = O.rows.get(k), real = row.filter(id => !id.startsWith('\u0000')), thick = Math.max(0, ...real.map(across));
    for (const id of real) { const a = u.get(id), s = S.get(id); P.set(id, vertical ? {x: Math.round(a), y: Math.round(v + (thick - s.h) / 2), w: s.w, h: s.h} : {x: Math.round(v + (thick - s.w) / 2), y: Math.round(a), w: s.w, h: s.h}); }
    for (const id of row) if (id.startsWith('\u0000')) { const a = u.get(id) + DUMMY_W / 2, c = v + thick / 2; mid.set(id, vertical ? [Math.round(a), Math.round(c)] : [Math.round(c), Math.round(a)]); dummyRow.set(id, rowsOut.length); }
    rowsOut.push({rank: k, ids: real, v, thick});
    v += thick + (vertical ? (quiet?.[ri] ? QUIET_GAP : NL.VG) : NL.VG + 40);
  }
  if (fold && rowsOut.length > 3) foldRows(P, mid, dummyRow, rowsOut, vertical);
  // The corridors the long edges were ordered through: the router follows them.
  const way = new Map();
  if (!PAGE_ON) for (const [key, chain] of O.chains) if (chain.length > 2) way.set(key, chain.slice(1, -1).map(d => mid.get(d)));
  const W = Math.max(0, ...[...P.values()].map(b => b.x + b.w)), H = Math.max(0, ...[...P.values()].map(b => b.y + b.h));
  return {P, W, H, rows: rowsOut, rankOf: ranks, crossings: O.crossings, way, wanted: O.wanted};
}
// Folding: the rows (ranks) of a picture far longer than wide are dealt into k lines of about equal
// length, k chosen so that the folded picture is near a landscape page (16:10).
function foldRows(P, mid, dummyRow, rows, vertical) {
  const last = rows[rows.length - 1], T = last.v + last.thick;
  const extent = Math.max(1, ...[...P.values()].map(b => (vertical ? b.x + b.w : b.y + b.h)));
  if (T < (vertical ? NL.FOLD_V : NL.FOLD_H)) return;
  const k = Math.round(vertical ? Math.sqrt(1.6 * T / extent) : Math.sqrt(T / (1.6 * extent)));
  if (k < 2) return;
  const target = T / k, lineOf = [], starts = [0]; let line = 0;
  for (const row of rows) { if (row.v - starts[line] + row.thick > target * 1.08 && row.v > starts[line] && line < k - 1) { line++; starts.push(row.v); } lineOf.push(line); }
  if (line === 0) return;
  // Each line is packed against the one before it by its own extent, not the widest line's.
  const gap = vertical ? NL.HG * 3 : NL.VG * 2, lo = Array(line + 1).fill(Infinity), hi = Array(line + 1).fill(-Infinity);
  rows.forEach((row, i) => { for (const id of row.ids) { const b = P.get(id), a0 = vertical ? b.x : b.y, a1 = vertical ? b.x + b.w : b.y + b.h; lo[lineOf[i]] = Math.min(lo[lineOf[i]], a0); hi[lineOf[i]] = Math.max(hi[lineOf[i]], a1); } });
  for (const [id, pt] of mid) { const l = lineOf[dummyRow.get(id)], a = vertical ? pt[0] : pt[1]; lo[l] = Math.min(lo[l], a - DUMMY_W); hi[l] = Math.max(hi[l], a + DUMMY_W); }
  const offset = []; let cursor = 0; for (let l = 0; l <= line; l++) { if (!Number.isFinite(lo[l])) { lo[l] = 0; hi[l] = 0; } offset[l] = cursor - lo[l]; cursor += hi[l] - lo[l] + gap; }
  const shift = rowIndex => { const l = lineOf[rowIndex]; return {dv: -starts[l], da: offset[l]}; };
  rows.forEach((row, i) => { const {dv, da} = shift(i); for (const id of row.ids) { const b = P.get(id); if (vertical) { b.y += dv; b.x += da; } else { b.x += dv; b.y += da; } } row.v += dv; row.line = lineOf[i]; });
  for (const [id, pt] of mid) { const {dv, da} = shift(dummyRow.get(id)); if (vertical) { pt[1] += dv; pt[0] += da; } else { pt[0] += dv; pt[1] += da; } }
}
// Bands by level for the layered arrangement: the rank is the level; a band wider than the page
// is cut into rows inside the band, keeping its order.
function byLevel(D, stage = null) {
  const levels = [...new Set(D.nodes.map(n => n.level))].sort((a, b) => a - b);
  const items = D.nodes.map(n => ({id: n.id, ...sizeOf(n)})), S = byId(items);
  const G = graphOf(items, D.edges), coarse = new Map(D.nodes.map(n => [n.id, levels.indexOf(n.level)]));
  const O = orderOf(G, coarse);
  // The row limit (rc40, W1): on screen (`stage`, the frame every picture is laid out for) the limit a band's rows are cut
  // to is the one, among a fixed set, that brings the whole picture closest to the frame — a wide band becomes one wide
  // row where the frame is wider than it is tall, two rows where that fits better — so the picture opens whole and
  // readable; on a page it is the page's width, as before.
  // (on screen neighbours in a row stand STAGE_HG apart, a trunk's branches still well clear of each other)
  const gap = stage ? STAGE_HG : NL.HG;
  const rowsAt = limit => { const out = []; for (const k of O.rankKeys) { const real = O.rows.get(k).filter(id => !id.startsWith('\u0000')); if (!real.length) continue; out.push(cutRow(real, id => S.get(id).w, gap, limit)); } return out; };
  // (on screen the rows stand as far apart as the trunks between them need: busGap)
  // (rc41: a printed page keeps its own row gap — the page's height is the scarce thing — and its buses take the gaps that
  // have room for them, busWays' floor)
  const keepVG = NL.VG; if (stage && !PRINT_PX) NL.VG = busGap(D, coarse);
  try {
    // (rc41, W1; PLAN §2 W1.4: a printed page's figure — `stage` from sdd-figures.js printStage, PRINT_PX set — keeps the
    // page's width as its limit, since a wider row would print smaller than the floor, and takes the screen's shaping)
    const limit = stage && !PRINT_PX ? bestLimit(rowsAt, S, stage, gap) : NL.PAGE - 2 * NL.LEFT;
    const fine = new Map(); let rank = 0; const bandOf = new Map();
    for (const k of O.rankKeys) { const real = O.rows.get(k).filter(id => !id.startsWith('\u0000')); if (!real.length) { rank++; continue; } for (const row of cutRow(real, id => S.get(id).w, gap, limit)) { for (const id of row) { fine.set(id, rank); bandOf.set(id, k); } rank++; } }
    const L = layered(items, D.edges, {vertical: true, fixedRank: fine, wrap: false, fold: false});
    // On screen the rows are left-aligned and each element stands under the elements it is drawn from in the rows above
    // (the median of their centres, never over its left neighbour: the Brandes–Köpf idea in one pass), so a realization
    // runs straight down; a band's first element with nothing above it stands at the left margin.
    // (rc41: on a printed page no element is moved past the page's width: alignUnderParents' right bound)
    if (stage) { alignUnderParents(D, L, fine, S, gap, PRINT_PX ? limit : Infinity); L.way = new Map(); }
    const bands = [];
    for (const k of O.rankKeys) { const ids = [...bandOf].filter(([, b]) => b === k).map(([id]) => id); if (!ids.length) continue; const ys = ids.map(id => L.P.get(id)); const level = D.nodes.find(n => n.id === ids[0]).level; bands.push({level, title: D.viewLevels?.find(b => b.level === level)?.title || LEVELS.find(([l]) => l === level)?.[1] || '', y: Math.min(...ys.map(p => p.y)) - 24, h: Math.max(...ys.map(p => p.y + p.h)) - Math.min(...ys.map(p => p.y)) + 40}); }
    // (the title strip above a band's first row, for the buses: busWays)
    const rowHead = new Map(); for (const [id, b] of bandOf) { const r = fine.get(id); rowHead.set(b, Math.min(rowHead.get(b) ?? Infinity, r)); } const heads = new Map([...rowHead.values()].map(r => [r, 24]));
    return {L, bands, way: L.way, rowOf: fine, rowHead: heads};
  } finally { NL.VG = keepVG; }
}
// Left to right (rc41, W1; PLAN §2 W1.5: the Arrange panel's Direction on a Layered picture): the role bands stand as
// columns read left to right — the standard's layers side by side — each column its band's elements stacked in the
// ordering's order (orderOf: the fewest crossings between neighbouring columns), as wide as its widest element or its
// title, the columns COL apart so a relationship's word stands between them. A band's title and its aspect header stand
// over its column. Positions are absolute; nothing is pinned or written.
function byLevelAcross(D) {
  const levels = [...new Set(D.nodes.map(n => n.level))].sort((a, b) => a - b);
  const items = D.nodes.map(n => ({id: n.id, ...sizeOf(n)})), S = byId(items);
  const O = orderOf(graphOf(items, D.edges), new Map(D.nodes.map(n => [n.id, levels.indexOf(n.level)])));
  const COL = NL.VG + 48, ROW = Math.round(NL.HG * 0.6), top = NL.TOP + ASPECT_H + 6, P = new Map(), bands = [];
  let x = NL.LEFT, bottom = top;
  for (const k of O.rankKeys) {
    const ids = O.rows.get(k).filter(id => !isDummy(id)); if (!ids.length) continue;
    const level = D.nodes.find(n => n.id === ids[0]).level, title = D.viewLevels?.find(b => b.level === level)?.title || LEVELS.find(([l]) => l === level)?.[1] || '';
    const w = Math.max(...ids.map(id => S.get(id).w), Math.round(charW(title, 14) * 1.15 + 18) - 24);
    let y = top; for (const id of ids) { const s = S.get(id); P.set(id, {x: x + Math.round((w - s.w) / 2), y, w: s.w, h: s.h}); y += s.h + ROW; }
    bands.push({level, title, x: x - 12, w: w + 24, y: NL.TOP - 24, across: true}); bottom = Math.max(bottom, y - ROW); x += w + COL;
  }
  for (const b of bands) b.h = bottom + 16 - b.y;
  return {P, bands};
}
// The frame a screen picture is laid out for (rc40, W1): the stage at 1440 × 900 with the shell's columns open, so the
// same picture is drawn the same on every screen (a position never depends on the window) and opens whole on the usual one.
export const SCREEN_STAGE = Object.freeze({w: 1180, h: 430});
const ROW_LIMITS = [1264, 1500, 1750, 2000, 2300, 2600], STAGE_HG = 32;
// The limit among ROW_LIMITS whose picture fits the frame at the largest zoom (its rows' widest row against the frame's
// width, its rows and bands against the height), the narrower on a tie.
function bestLimit(rowsAt, S, stage, gap = NL.HG) {
  let best = null;
  for (const limit of ROW_LIMITS) {
    const bands = rowsAt(limit), rows = bands.flat();
    const W = Math.max(NL.W, ...rows.map(row => row.reduce((t, id) => t + S.get(id).w + gap, -gap)));
    const H = bands.reduce((t, band) => t + band.reduce((u, row) => u + Math.max(...row.map(id => S.get(id).h)) + NL.VG, 0) - NL.VG + 40, 0) + NL.VG * Math.max(0, bands.length - 1) + NL.TOP;
    const z = Math.min(stage.w / (W + 2 * NL.LEFT + 24), stage.h / (H + 48));
    if (!best || z > best.z + 1e-6) best = {limit, z};
  }
  return best ? best.limit : NL.PAGE - 2 * NL.LEFT;
}
// `maxRight` (rc41): the right edge a row keeps within (a printed page's width; none on the screen): an element stands
// under its parents only as far right as leaves room for the rest of its row.
function alignUnderParents(D, L, rowOf, S, gap = NL.HG, maxRight = Infinity) {
  const rows = new Map();
  for (const [id, r] of rowOf) { if (!rows.has(r)) rows.set(r, []); rows.get(r).push(id); }
  const above = new Map([...rowOf.keys()].map(id => [id, []]));
  for (const e of D.edges) { const a = rowOf.get(e.from), b = rowOf.get(e.to); if (a == null || b == null || a === b) continue; if (a < b) above.get(e.to).push(e.from); else above.get(e.from).push(e.to); }
  const centre = id => L.P.get(id).x + L.P.get(id).w / 2;
  for (const r of [...rows.keys()].sort((a, b) => a - b)) {
    const row = rows.get(r).sort((a, b) => L.P.get(a).x - L.P.get(b).x);
    let cursor = 0, tail = row.reduce((t, id) => t + S.get(id).w + gap, -gap);
    for (const id of row) {
      const cs = above.get(id).map(centre).sort((a, b) => a - b), w = S.get(id).w;
      const want = cs.length ? (cs.length % 2 ? cs[(cs.length - 1) / 2] : (cs[cs.length / 2 - 1] + cs[cs.length / 2]) / 2) - w / 2 : cursor;
      const x = Math.round(Math.max(cursor, Math.min(want, maxRight - tail))); tail -= w + gap;
      L.P.get(id).x = x; cursor = x + w + gap;
    }
  }
  let min = Infinity; for (const b of L.P.values()) min = Math.min(min, b.x);
  for (const b of L.P.values()) b.x -= min;
  L.W = Math.max(0, ...[...L.P.values()].map(b => b.x + b.w));
}

// By layer (round 3, D): one horizontal lane per model layer present, in the sidebar's order, its elements in rows
// (a lane wider than the page is cut into rows inside the lane, keeping its order), ordered across the lanes by the
// same barycenter sweeps as every layered picture so that relationships between lanes cross as little as they can.
// A layer the reader has hidden keeps its place as a collapsed strip that says how many elements it holds.
// `every` (round 4, the Layers view): a lane for each of the eight layers, always — {counts: the elements each layer
// holds in the whole picture, none: what an empty lane says}. A layer the picture does not hold is a thin strip
// ("Data · none in this chapter"); one with elements that are not drawn for another reason (a focus) says so.
export const LANE_ORDER = ['process', 'logical', 'physical', 'data', 'technology', 'interface', 'security', 'deployment'];
export const LANE_TITLES = {process: 'Process', logical: 'Logical application', physical: 'Physical application', data: 'Data', technology: 'Technology', interface: 'Interface', security: 'Security', deployment: 'Deployment'};
const STRIP_H = 30, STRIP_GAP = 14, NONE_H = 22;
// A lane's head (its title line) and, under it, the row of its aspect columns' headers (rc40, W1). The clear strip under
// the headers, ASPECT_GAP (rc41, W1: 18, was 14): at 14 a line into the top face of a first-row element under a header
// could find no free routing cell (the page's 12 px cell), and the search opened the titles as its last resort (Chapter 4
// Layers' "constrains ×13" through two lane titles). The value is chosen by measurement on the reference project's Layers
// pictures (Chapters 4, 5, 6, 7, 11: no counted line over a box or a title) and its unfolded Chapter 4 picture, whose
// bundles hold their checks there (26 drawn, 1 dissolved; 22 dissolved 15 of them — the routes are sensitive to where
// the rows fall on the cell grid).
export const LANE_HEAD = 24, ASPECT_H = 14, ASPECT_GAP = 18;
// How much wider a band's title may stand on the screen than its closed strip zoomed out to about half (notation.css keeps
// a title at 11 px at any zoom, the strip is measured at 0.8): a header on the title line keeps clear of that (rc41).
const TITLE_GROWTH = 1.6;
// The strip of a lane that is not drawn: hidden by the layers or outside the focus (a collapsed strip, which opens the
// lane), or held by no element (a thinner strip to read, not a collapsed lane: there is nothing to open).
function laneStrip(l, hidden, every, title = LANE_TITLES[l] || l) {
  if (hidden) return {layer: l, count: hidden.count, collapsed: true, title: `${title} · ${hidden.count} hidden by layers`};
  if (!every) return null;
  const n = Number(every.counts?.[l]) || 0;
  return n ? {layer: l, count: n, collapsed: true, title: `${title} · ${n} outside the focus`} : {layer: l, count: 0, none: true, h: NONE_H, title: `${title} · ${every.none || 'none in this picture'}`};
}
// Corridors (round 11, D): a connector that spans more than one lane (its ends SPAN lanes apart or more) is given a
// corridor through each row it crosses. The rows are the ranks of a layered ordering (orderOf: the barycentre sweeps
// and transpositions every layered picture is ordered by, over every relationship between two rows), in which each such
// connector is a chain of dummies, one in each row between its ends, ordered among that row's elements; so a corridor
// stands where the crossings are fewest, and a row's elements keep the order those sweeps give them. The gaps between a
// row's elements (GAP_X px) hold SLOTS slots PITCH px apart, MARGIN px from either element (clear of the rim the dotted
// fans keep off): a gap's dummies take its slots in their order, on the run of slots nearest the places their chains
// hold in the row above, so a corridor runs as straight as the gap allows. A row's two outer gaps (from the lane's edge
// to MARGIN px before the first element, and after the last) hold up to SLOTS corridors each, every one under its own
// place above, in order and at least PITCH apart. The dummies beyond a gap's SLOTS are left to the router (moving one to
// the next gap, 240 px away, was measured to add crossings, as was widening the row: a row's gap never widens and no
// element moves for a corridor). The point at each slot, at the row's middle, becomes `way` for the router, the shape `layered`
// gives its dummy chains, so a long connector threads the rows where it was planned and the members of a fan from one
// far lane find each other in neighbouring slots. Reserving the slot's cells against every other line, at any cost,
// was measured to add crossings and fallbacks (the lines kept off them double up beside the elements) and is not done.
// A picture drawn straight plans none.
export const CORRIDOR = Object.freeze({SPAN: 2, SLOTS: 4, PITCH: NL.CELL, MARGIN: 24});
const GAP_X = 72; // = 2 × MARGIN + (SLOTS − 1) × PITCH: four slots between two elements, 24 px from either
export const NO_CORRIDORS = () => ({planned: 0, crossings: 0, slotted: 0, edges: []});
// The trunks a screen picture planned (rc40, W1: busWays), for the metrics and the evidence: the buses, their members
// and each member's way point.
export const NO_TRUNKS = () => ({buses: 0, members: 0, edges: []});
const isDummy = id => id.startsWith('\u0000');
// The layered ordering of the rows: every relationship between two rows as a pair (its upper element first, the
// relationships between one pair once), the lane-spanning pairs marked `long`; returns the pairs, the ordering (its
// dummy chains keyed by pair) and each row's elements and dummies in order, with each long dummy's predecessor in its
// chain (`prevOf`: the dummy in the row above, or the upper element).
function planCorridors(D, rows, rowOf, laneIdx, laneOf) {
  const pairs = new Map();
  for (const e of D.edges) {
    const la = laneIdx.get(laneOf.get(e.from)), lb = laneIdx.get(laneOf.get(e.to));
    if (la == null || lb == null || rowOf.get(e.from) === rowOf.get(e.to)) continue;
    const down = rowOf.get(e.from) < rowOf.get(e.to), a = down ? e.from : e.to, b = down ? e.to : e.from, key = a + '\u0001' + b;
    if (!pairs.has(key)) pairs.set(key, {a, b, long: Math.abs(la - lb) >= CORRIDOR.SPAN, edges: []});
    pairs.get(key).edges.push({e, down});
  }
  const ids = rows.flatMap(r => r.ids), index = new Map(ids.map((id, i) => [id, i])), out = new Map(ids.map(id => [id, []])), inn = new Map(ids.map(id => [id, []]));
  for (const {a, b} of pairs.values()) { out.get(a).push(b); inn.get(b).push(a); }
  const O = orderOf({ids, index, out, inn}, rowOf), prevOf = new Map();
  for (const [key, p] of pairs) if (p.long) { const chain = O.chains.get(key) || []; chain.slice(1, -1).forEach((d, i) => prevOf.set(d, chain[i])); }
  return {pairs, O, prevOf, ordered: rows.map((r, i) => O.rows.get(i) || r.ids)};
}
// The gaps of one row (left to right): the outer-left gap, from the lane's edge to MARGIN px before the first element,
// each gap between two elements with its SLOTS slots PITCH px apart, and the outer-right gap, to the lane's edge. An
// outer gap holds up to SLOTS corridors too, but not on fixed slots: each stands under its own place above.
function rowGaps(boxes, laneLeft, laneRight) {
  const {MARGIN, PITCH, SLOTS} = CORRIDOR, gaps = [], first = boxes[0], last = boxes[boxes.length - 1];
  const room = (lo, hi) => Math.max(0, Math.min(SLOTS, Math.floor((hi - lo) / PITCH) + 1));
  gaps.push({lo: laneLeft, hi: first.x - MARGIN, outer: 'left', slots: [], cap: room(laneLeft, first.x - MARGIN)});
  for (let i = 1; i < boxes.length; i++) { const lo = boxes[i - 1].x + boxes[i - 1].w, slots = []; for (let j = 0; j < SLOTS; j++) slots.push(lo + MARGIN + j * PITCH); gaps.push({lo, hi: boxes[i].x, outer: null, slots, cap: SLOTS}); }
  gaps.push({lo: last.x + last.w + MARGIN, hi: laneRight, outer: 'right', slots: [], cap: room(last.x + last.w + MARGIN, laneRight)});
  return gaps;
}
// A row's dummies (in order, each with its gap, 0 before the first element, and `target`, the x its chain holds in the
// row above) take their gaps: in a gap between two elements the first SLOTS of them, in their order, take the run of
// slots nearest their targets; in an outer gap each stands at its target, kept in order, at least PITCH apart and inside
// the gap. Returns each dummy's x or null (left to the router).
function slotsFor(dummies, gaps) {
  const {PITCH} = CORRIDOR, byGap = gaps.map(() => []); dummies.forEach((d, i) => byGap[d.gap].push(i));
  const xs = dummies.map(() => null), at = i => dummies[i].target;
  byGap.forEach((list, g) => {
    const {lo, hi, outer, slots, cap} = gaps[g], n = Math.min(list.length, cap); if (!n) return;
    const mine = list.slice(0, n);
    if (outer === 'left') { let next = hi; for (let j = n - 1; j >= 0; j--) { const x = Math.min(next, Math.max(lo + j * PITCH, at(mine[j]) ?? hi)); xs[mine[j]] = x; next = x - PITCH; } return; }
    if (outer === 'right') { let prev = lo; for (let j = 0; j < n; j++) { const x = Math.max(prev, Math.min(hi - (n - 1 - j) * PITCH, at(mine[j]) ?? lo)); xs[mine[j]] = x; prev = x + PITCH; } return; }
    let best = null;
    for (let o = 0; o + n <= slots.length; o++) { const cost = mine.reduce((t, i, j) => t + (at(i) == null ? 0 : Math.abs(slots[o + j] - at(i))), 0); if (!best || cost < best[0]) best = [cost, o]; }
    mine.forEach((i, j) => { xs[i] = slots[best[1] + j]; });
  });
  return xs;
}
function byLayer(D, collapsed = [], every = null, {corridors = true} = {}) {
  // The screen's folded connected model (rc39, W2): one list box per type group in its band's lane, a group of one as
  // the record itself, both at the renderer's own size; its detail and every unfurled picture go through the same lane
  // layout. The relationships between the groups are routed and bundled between the lanes as in every lane picture.
  const laneOrder = D.viewBands?.map(b => b.id) || LANE_ORDER, laneTitle = l => D.viewBands?.find(b => b.id === l)?.title || LANE_TITLES[l] || l;
  const layer = n => D.viewBands ? n.viewBand : n.layer;
  const present = laneOrder.filter(l => D.nodes.some(n => layer(n) === l)), extra = [...new Set(D.nodes.map(layer))].filter(l => !laneOrder.includes(l));
  const lanes = [...present, ...extra], S = new Map(D.nodes.map(n => [n.id, sizeOf(n)])), node = new Map(D.nodes.map(n => [n.id, n]));
  // The framework grid (rc40, W1; layers-view.js VIEW_ASPECTS): with the concern-band projection each element stands in
  // its band's aspect column (passive structure · behaviour · active structure; motivation's and security's own sets),
  // the columns of one set sharing their x across the lanes that use it, a column with nothing in a lane omitted there.
  // Without the projection (the repository layers) a lane is one column. Rows are left-aligned in their column.
  const columned = !!(D.viewBands && D.viewAspects);
  // (rc41: a band with its own column set in the projection — motivation, security, strategy, implementation — uses it; the rest the core set)
  const setOf = l => (!columned ? 'plain' : D.viewAspects[l] && l !== 'core' ? l : 'core');
  const colsOf = set => (set === 'plain' ? [{id: 'all', title: ''}] : D.viewAspects[set] || D.viewAspects.core);
  const colOf = id => (columned ? node.get(id).aspect || 'behaviour' : 'all');
  // Order inside each lane: stable by reference, then barycenter sweeps down and up the lanes so that a relationship
  // between lanes runs as straight as it can. No dummy node widens a lane: a lane's width is its own elements', never
  // a long edge's (round 11: the corridors stand in the gaps the elements leave, planCorridors below).
  const order = new Map(lanes.map(l => [l, D.nodes.filter(n => layer(n) === l).sort((a, b) => String(a.ref || a.title).localeCompare(String(b.ref || b.title), undefined, {numeric: true})).map(n => n.id)]));
  const laneOf = new Map(D.nodes.map(n => [n.id, layer(n)])), adj = new Map(D.nodes.map(n => [n.id, []]));
  for (const e of D.edges) if (adj.has(e.from) && adj.has(e.to) && e.from !== e.to) { adj.get(e.from).push(e.to); adj.get(e.to).push(e.from); }
  const pos = () => { const m = new Map(); for (const ids of order.values()) ids.forEach((id, i) => m.set(id, ids.length > 1 ? i / (ids.length - 1) : 0.5)); return m; };
  for (let pass = 0; pass < 6; pass++) {
    const at = pos(), seq = pass % 2 ? [...lanes].reverse() : lanes;
    for (const l of seq) {
      const ids = order.get(l), bc = new Map(ids.map(id => { const ns = adj.get(id).filter(o => laneOf.get(o) !== l); return [id, ns.length ? ns.reduce((t, o) => t + at.get(o), 0) / ns.length : at.get(id)]; }));
      order.set(l, ids.map((id, i) => [id, i]).sort((a, b) => bc.get(a[0]) - bc.get(b[0]) || a[1] - b[1]).map(x => x[0]));
    }
  }
  // The columns of each set that hold an element in one of its lanes, and each column's row budget: the natural
  // (unwrapped) row width, narrowed on the widest column, in turn, while the set is wider than the page, so a lane
  // wraps inside its columns keeping its order. A column never narrows under its widest element.
  const limit = NL.PAGE - 2 * NL.LEFT, natural = ids => ids.reduce((t, id) => t + S.get(id).w, 0) + GAP_X * Math.max(0, ids.length - 1);
  const cutRows = (ids, b) => { const out = []; let w = 0; for (const id of ids) { const sw = S.get(id).w; if (out.length && w + sw > b) { out.push([]); w = 0; } if (!out.length) out.push([]); out[out.length - 1].push(id); w += sw + GAP_X; } return out; };
  const setLanes = new Map(); for (const l of lanes) { const s = setOf(l); if (!setLanes.has(s)) setLanes.set(s, []); setLanes.get(s).push(l); }
  const members = (l, c) => order.get(l).filter(id => colOf(id) === c);
  const colsIn = new Map([...setLanes].map(([s, ls]) => [s, colsOf(s).filter(c => ls.some(l => members(l, c.id).length))]));
  const budget = new Map(), key = (s, c) => s + '|' + c;
  const widthOf = (s, c) => Math.max(0, ...setLanes.get(s).map(l => Math.max(0, ...cutRows(members(l, c), budget.get(key(s, c))).map(natural))));
  for (const [s, cols] of colsIn) {
    for (const c of cols) budget.set(key(s, c.id), limit);
    const minW = c => Math.max(NL.W, ...setLanes.get(s).flatMap(l => members(l, c.id).map(id => S.get(id).w)));
    for (let guard = 0; guard < 60; guard++) {
      const total = cols.reduce((t, c) => t + widthOf(s, c.id), 0) + GAP_X * (cols.length - 1);
      if (total <= limit) break;
      const cand = cols.filter(c => widthOf(s, c.id) > minW(c)).sort((a, b) => widthOf(s, b.id) - widthOf(s, a.id))[0];
      if (!cand) break;
      budget.set(key(s, cand.id), Math.max(minW(cand), Math.floor(widthOf(s, cand.id) * 0.62)));
    }
  }
  // Each set's columns side by side from the left margin, each as wide as its widest row in any of the set's lanes.
  const colX = new Map(), colW = new Map();
  let widest = NL.W;
  for (const [s, cols] of colsIn) { let x = NL.LEFT; for (const c of cols) { const w = widthOf(s, c.id); colX.set(key(s, c.id), x); colW.set(key(s, c.id), w); x += w + GAP_X; } widest = Math.max(widest, x - GAP_X - NL.LEFT); }
  // Rows: the i-th row of each column of the lane, side by side in column order (a lane wider than the page wraps inside
  // its columns, keeping its order). Elements stand further apart than in a tree: the words of the relationships
  // between lanes run in the gaps.
  const rowsOf = new Map(), rows = [], colById = new Map();
  for (const l of lanes) {
    const s = setOf(l), cols = colsIn.get(s), perCol = cols.map(c => cutRows(members(l, c.id), budget.get(key(s, c.id))));
    const n = Math.max(1, ...perCol.map(r => r.length)), own = [];
    for (let i = 0; i < n; i++) { const ids = []; cols.forEach((c, ci) => { for (const id of perCol[ci][i] || []) { ids.push(id); colById.set(id, key(s, c.id)); } }); own.push({lane: l, ids, dummies: []}); }
    rowsOf.set(l, own); rows.push(...own);
  }
  // The corridors (round 11): the rows as ranks, every relationship between two rows in the ordering and the lane-spanning
  // ones as dummy chains; each row keeps its elements in that order inside their columns (the columns stay in their
  // order), with each long dummy's gap (0 before the first element: its place among the ordered elements).
  const laneIdx = new Map(lanes.map((l, i) => [l, i])), rowOf = new Map(); rows.forEach((r, i) => r.ids.forEach(id => rowOf.set(id, i)));
  const plan = corridors && D.edges.length ? planCorridors(D, rows, rowOf, laneIdx, laneOf) : null;
  if (plan) rows.forEach((r, i) => {
    const ordered = plan.ordered[i], cols = colsIn.get(setOf(r.lane)), colIndex = id => cols.findIndex(c => key(setOf(r.lane), c.id) === colById.get(id));
    const real = ordered.filter(id => !isDummy(id)).map((id, i) => [id, i]).sort((a, b) => colIndex(a[0]) - colIndex(b[0]) || a[1] - b[1]).map(x => x[0]);
    r.ids = real; r.dummies = [];
    ordered.forEach((id, j) => { if (!isDummy(id) || !plan.prevOf.has(id)) return; const after = ordered.slice(j + 1).find(x => !isDummy(x)); r.dummies.push({id, gap: after ? real.indexOf(after) : real.length, target: null}); });
    r.dummies.sort((a, b) => a.gap - b.gap);
  });
  const P = new Map(), bands = [], at = layer => laneOrder.indexOf(layer);
  // A hidden layer's strip (every repository layer, in the Layers view's own lanes) or a hidden band's (rc39: the Layers
  // view's concern bands name what the layers hide beside their count, and a band whose every record is hidden is a strip).
  const strips = collapsed.filter(c => c && c.count > 0 && !present.includes(c.layer)).sort((a, b) => at(a.layer) - at(b.layer)), hiddenIn = l => collapsed.find(c => c && c.layer === l && c.count > 0 && present.includes(l));
  // (rc41, W1; PLAN §2 W1.5: the Arrange panel's Spacing moves the Concern bands — their rows and lanes closer or further
  // apart; the corridor slots between two elements keep their pitch, GAP_X)
  // (rc41 close, C22: each gap moves from its Comfortable value by whole cells of the screen's routing grid — NL.CELL × 1.5,
  // the cell a Layers picture on the page is routed on — so every row keeps the place on that grid where the clear strip
  // under the headers, ASPECT_GAP, was measured; scaled as such, 45 / 33 px at Compact and 81 / 59 px at Spacious, the rows
  // fell between the cells and the search opened a lane title or an aspect header again: Chapter 5's overview at Compact,
  // its every element at Spacious. Compact is 48 / 32 px, Spacious 84 / 56 px.)
  const ROUTE_CELL = NL.CELL * 1.5, onGrid = gap => gap + ROUTE_CELL * Math.round((gap * LANE_SPACING - gap) / ROUTE_CELL);
  const ROW_GAP = onGrid(60), LANE_GAP = onGrid(44);
  let y = NL.TOP - 24;
  for (const l of [...laneOrder, ...extra]) {
    const strip = rowsOf.has(l) ? null : laneStrip(l, strips.find(c => c.layer === l), laneOrder.includes(l) ? every : null, laneTitle(l));
    if (strip) { const h = strip.h || STRIP_H; bands.push({...strip, ...(D.viewBands ? {viewBand: l} : {}), y, h}); y += h + STRIP_GAP; continue; }
    if (!rowsOf.has(l)) continue;
    const s = setOf(l), own = rowsOf.get(l), top = y, laneCols = columned ? colsIn.get(s).filter(c => members(l, c.id).length) : [];
    // (under the aspect headers a clear strip of ASPECT_GAP, so a line into a box's top face has a row of free cells)
    let ry = y + LANE_HEAD + (laneCols.length ? ASPECT_H + ASPECT_GAP : 0);
    for (const r of own) {
      // A column's row is centred on the column (the widest row the column holds in any lane), so a corridor finds a gap on
      // either side of a lone element and a shorter row reads under the rows above it.
      const h = Math.max(...r.ids.map(id => S.get(id).h)), cursor = new Map(), inCol = new Map();
      for (const id of r.ids) { const k = colById.get(id); inCol.set(k, (inCol.get(k) || []).concat(id)); }
      for (const [k, ids] of inCol) cursor.set(k, colX.get(k) + Math.round((colW.get(k) - natural(ids)) / 2));
      for (const id of r.ids) { const sz = S.get(id), k = colById.get(id), x = cursor.get(k); P.set(id, {x, y: ry + Math.round((h - sz.h) / 2), w: sz.w, h: sz.h}); cursor.set(k, x + sz.w + GAP_X); }
      r.y = ry; r.h = h; ry += h + ROW_GAP;
    }
    const count = D.layerSummary?.counts?.[l] ?? order.get(l).length, hidden = hiddenIn(l);
    bands.push({layer: l, ...(D.viewBands ? {viewBand: l} : {}), count, title: `${laneTitle(l)} · ${count}${hidden ? ` · ${hidden.count} hidden by layers` : ''}`, y: top, h: ry - ROW_GAP + 16 - top, columns: laneCols.map(c => ({id: c.id, title: c.title, x: colX.get(key(s, c.id)), w: colW.get(key(s, c.id)), y: top + LANE_HEAD}))});
    y = ry - ROW_GAP + 16 + LANE_GAP;
  }
  // Each row's dummies take its slots, top row first (a dummy's target is its chain's place in the row above), then each
  // lane-spanning connector's corridor as way points from its source to its target.
  const way = new Map(), slotOf = new Map();
  let crossings = 0, slotted = 0;
  if (plan) {
    const laneLeft = NL.LEFT - 12 + CORRIDOR.PITCH / 2, laneRight = NL.LEFT + widest + 12 - CORRIDOR.PITCH / 2;
    for (const r of rows) {
      if (!r.dummies.length) continue;
      crossings += r.dummies.length;
      for (const d of r.dummies) { const p = plan.prevOf.get(d.id); d.target = isDummy(p) ? (slotOf.get(p) || [null])[0] : P.get(p).x + P.get(p).w / 2; }
      const xs = slotsFor(r.dummies, rowGaps(r.ids.map(id => P.get(id)), laneLeft, laneRight));
      r.dummies.forEach((d, i) => { if (xs[i] != null) { slotOf.set(d.id, [xs[i], Math.round(r.y + r.h / 2)]); slotted++; } });
    }
    for (const [key, {long, edges}] of plan.pairs) {
      if (!long) continue;
      const pts = (plan.O.chains.get(key) || []).slice(1, -1).map(d => slotOf.get(d)).filter(Boolean);
      if (pts.length) for (const {e, down} of edges) way.set(e.id, (down ? pts : pts.slice().reverse()).map(p => p.slice()));
    }
  }
  // (the title strip and the aspect headers above a lane's first row, for the buses: busWays)
  const rowHead = new Map(); rows.forEach((r, i) => { if (r === rowsOf.get(r.lane)[0]) rowHead.set(i, LANE_HEAD + (columned && colsIn.get(setOf(r.lane)).some(c => members(r.lane, c.id).length) ? ASPECT_H + ASPECT_GAP : 0)); });
  return {P, bands, way, rowOf, rowHead, corridors: {planned: way.size, crossings, slotted, edges: []}};
}
// Trunks between the rows (rc40, W1; PLAN §4.1.3): on screen, the relationships of one line style from two or more
// sources on one side of their target run as one trunk — a bus in the gap next to the target's row, the branches joining
// it where each source stands and the trunk dropping from it to the target — and so do the relationships of one style
// from one source to two or more targets on one side that no fan-in holds. Each member is given the bus's point
// (xAnchor, yBus) as the way point it threads (the corridor cells from its far port to the bus, along it and to the
// shared port are the cheap way, so the shape holds); formBundles declares the same fans (LANE_FAN_IN) and consolidate
// checks them as every bundle. A fan with no room left in its gap is left to the router.
// A bus stands at least BUS.NEAR px from the row of the element the fan shares (its stem, BUNDLE.STEM cells, lies
// between), at least BUS.FAR px from the rows of the far elements (a join clear of every element, JOIN_ELEMENT) and
// clear of the title strip above a band's or a lane's first row (`headOf`); one bus per fan PITCH px apart.
const BUS = Object.freeze({NEAR: 24, FAR: 14, PITCH: NL.CELL, COLLINEAR: 40});
function busWays(D, P, rowOf, headOf = () => 0) {
  const way = new Map(), rows = new Map();
  for (const [id, r] of rowOf) { const b = P.get(id); if (!b) continue; if (!rows.has(r)) rows.set(r, {top: Infinity, bottom: -Infinity}); const g = rows.get(r); g.top = Math.min(g.top, b.y); g.bottom = Math.max(g.bottom, b.y + b.h); }
  const keys = [...rows.keys()].sort((a, b) => a - b), beside = (r, d) => keys[keys.indexOf(r) + d];
  const eligible = e => !(e.step || e.cardinality || e.crossing || e.from === e.to || fanExcluded(e) || !P.has(e.from) || !P.has(e.to)) && rowOf.get(e.from) != null && rowOf.get(e.to) != null && rowOf.get(e.from) !== rowOf.get(e.to);
  // The fan-ins first (one trunk per target and line style, its sources on one side), then the fan-outs among the
  // relationships no fan-in holds (one trunk per source and line style, its targets on one side).
  const fans = [], inFan = new Set();
  const collect = (kind, anchorOf, farOf) => {
    const groups = new Map();
    for (const e of D.edges) {
      if (!eligible(e) || inFan.has(e.id)) continue;
      const side = rowOf.get(farOf(e)) < rowOf.get(anchorOf(e)) ? -1 : 1, k = kind + '|' + anchorOf(e) + '|' + side + '|' + lineStyle(e) + (kind === 'o' ? fanOutQualifier(e) : '');
      if (!groups.has(k)) groups.set(k, {kind, anchor: anchorOf(e), side, edges: [], far: new Set()}); groups.get(k).edges.push(e); groups.get(k).far.add(farOf(e));
    }
    for (const g of groups.values()) if (g.far.size >= BUNDLE.MIN) { fans.push(g); for (const e of g.edges) inFan.add(e.id); }
  };
  collect('i', e => e.to, e => e.from);
  collect('o', e => e.from, e => e.to);
  fans.sort((a, b) => P.get(a.anchor).x - P.get(b.anchor).x || String(a.anchor).localeCompare(String(b.anchor)));
  const taken = new Map(), cellY = y => Math.floor(y / NL.CELL) * NL.CELL + NL.CELL / 2;
  for (const g of fans) {
    const ra = rowOf.get(g.anchor), rn = beside(ra, g.side); if (rn == null) continue;
    const upper = g.side < 0 ? rn : ra, lower = g.side < 0 ? ra : rn, A = P.get(g.anchor), xA = Math.round(A.x + A.w / 2);
    // The buses of one gap stack from its top; the first keeps NEAR px from the upper row when the shared element is there,
    // FAR px otherwise; the last keeps the lower row's title strip and NEAR or FAR px below it.
    const top = rows.get(upper).bottom + (g.side > 0 ? BUS.NEAR : BUS.FAR), floor = rows.get(lower).top - headOf(lower) - (g.side < 0 ? BUS.NEAR : BUS.FAR);
    const key = upper + '|' + lower, i = taken.get(key) || 0, y = cellY(top) + i * BUS.PITCH;
    if (y > floor) continue;
    // A far element standing over (or under) the shared one would join the bus within JOIN_GAP of the trunk: that member
    // becomes the trunk's own straight line (routeAll slides its port onto it), and the branches from the right take a
    // second bus two cells on, so every split on the trunk is a T (never four ways: BUNDLE's rule for dotted fans).
    const near = [...g.far].some(id => Math.abs(P.get(id).x + P.get(id).w / 2 - xA) < BUS.COLLINEAR), y2 = near && y + 2 * BUS.PITCH <= floor ? y + 2 * BUS.PITCH : null;
    taken.set(key, i + (y2 != null ? 3 : 1));
    // A member whose far element stands in the neighbouring row is drawn on the bus directly (routeAll `trunks`); one
    // from a row further off threads the bus's point as a way point and finds its way to it.
    for (const e of g.edges) { const far = g.kind === 'i' ? e.from : e.to; way.set(e.id, {x: xA, y, y2, kind: g.kind, direct: rowOf.get(far) === rn}); }
  }
  return way;
}
// The gap a screen picture's rows need for its buses: the most fans any one gap holds (counted by lane, the rows are not
// cut yet), their pitch and the clearances — never under NL.VG, never over BUS_GAP_MAX.
const BUS_GAP_MAX = 112;
function busGap(D, laneOf) {
  const seen = new Set(), perGap = new Map(), count = (kind, anchorOf, farOf) => {
    const groups = new Map();
    for (const e of D.edges) {
      if (e.step || e.cardinality || e.crossing || e.from === e.to || fanExcluded(e) || seen.has(e.id)) continue;
      const a = laneOf.get(anchorOf(e)), f = laneOf.get(farOf(e)); if (a == null || f == null || a === f) continue;
      const k = kind + '|' + anchorOf(e) + '|' + (f < a ? -1 : 1) + '|' + lineStyle(e) + (kind === 'o' ? fanOutQualifier(e) : '');
      if (!groups.has(k)) groups.set(k, {gap: Math.min(a, f) + '|' + Math.max(a, f), far: new Set(), edges: []}); groups.get(k).far.add(farOf(e)); groups.get(k).edges.push(e);
    }
    for (const g of groups.values()) if (g.far.size >= BUNDLE.MIN) { perGap.set(g.gap, (perGap.get(g.gap) || 0) + 1); for (const e of g.edges) seen.add(e.id); }
  };
  count('i', e => e.to, e => e.from); count('o', e => e.from, e => e.to);
  const n = Math.max(0, ...perGap.values());
  return Math.max(NL.VG, Math.min(BUS_GAP_MAX, BUS.NEAR + BUS.NEAR + 24 + Math.max(0, n - 1) * BUS.PITCH + 4));
}

// ---------------------------------------------------------------- the tree and the packed grid (rc40, W1)
// Hierarchical pictures as trees (PLAN §4.1.6): on screen a picture whose edges make a forest — every element one
// parent (the edge's upper end, parentChild) except shared leaves, which have several and no children of their own —
// is drawn as a tidy tree: each parent centred over its children, siblings STAGE_HG apart, subtrees packed side by
// side, the trees side by side, and the shared leaves on a last row under the median of their parents (Chapter 3 reads
// decision → alternatives → affected elements top-down). A picture that is not such a forest, or whose tree would be
// wider than TREE_MAX_W, is laid out by the layered pipeline as before. Positions start at (0, 0); `rowOf` names each
// element's row for the trunks between the rows.
const TREE_MAX_W = 2600, TREE_MAX_DEPTH = 5;
function tidyTree(D, maxW = TREE_MAX_W) {
  const items = D.nodes.map(n => ({id: n.id, ...sizeOf(n)})), S = byId(items);
  if (items.length < 2) return null;
  const parents = new Map(items.map(n => [n.id, []])), children = new Map(items.map(n => [n.id, []])), seen = new Set();
  for (const e of D.edges) { const [a, b] = parentChild(e); if (a === b || !S.has(a) || !S.has(b)) continue; const k = a + '\u0001' + b; if (seen.has(k) || seen.has(b + '\u0001' + a)) continue; seen.add(k); parents.get(b).push(a); children.get(a).push(b); }
  const shared = new Set(items.filter(n => parents.get(n.id).length >= 2).map(n => n.id));
  // (never an ordered notation — a BPMN chain or a sequence reads as text, folded by the layered pipeline — and only a
  // picture that branches and stays within TREE_MAX_DEPTH rows: a long chain is not a hierarchy)
  if (!seen.size || ['process', 'sequence', 'lifecycle'].includes(D.scene?.id) || [...shared].some(id => children.get(id).length)) return null;
  if (!items.some(n => children.get(n.id).filter(c => !shared.has(c)).length >= 2)) return null;
  const kids = id => children.get(id).filter(c => !shared.has(c)), roots = items.filter(n => !parents.get(n.id).length && !shared.has(n.id)).map(n => n.id);
  const reached = new Set(), visit = id => { if (reached.has(id)) return; reached.add(id); for (const c of kids(id)) visit(c); };
  for (const r of roots) visit(r);
  if (items.some(n => !shared.has(n.id) && !reached.has(n.id))) return null;
  const gap = STAGE_HG, width = new Map();
  const measure = id => { const cs = kids(id), w = cs.length ? cs.reduce((t, c) => t + measure(c) + gap, -gap) : 0, me = Math.max(S.get(id).w, w); width.set(id, me); return me; };
  const P = new Map(), rowOf = new Map();
  const place = (id, x, depth) => { const cs = kids(id), w = width.get(id), me = S.get(id), cw = cs.reduce((t, c) => t + width.get(c) + gap, -gap); let cx = x + (w - cw) / 2; P.set(id, {x: Math.round(x + (w - me.w) / 2), w: me.w, h: me.h}); rowOf.set(id, depth); for (const c of cs) { place(c, cx, depth + 1); cx += width.get(c) + gap; } };
  let x = 0; for (const r of roots) { measure(r); place(r, x, 0); x += width.get(r) + gap * 2; }
  if (x - gap * 2 > maxW || Math.max(0, ...rowOf.values()) >= TREE_MAX_DEPTH) return null;
  // The shared leaves, on the row under the deepest parent, each as near the median of its parents' centres as its left
  // neighbour allows, in the order of those medians.
  const deepest = Math.max(0, ...rowOf.values()), centre = id => P.get(id).x + P.get(id).w / 2;
  const median = xs => { const s = xs.slice().sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
  const leaves = [...shared].map(id => ({id, want: median(parents.get(id).map(centre))})).sort((a, b) => a.want - b.want || String(a.id).localeCompare(String(b.id)));
  let cursor = 0;
  for (const {id, want} of leaves) { const me = S.get(id), lx = Math.round(Math.max(cursor, want - me.w / 2)); P.set(id, {x: lx, w: me.w, h: me.h}); rowOf.set(id, deepest + 1); cursor = lx + me.w + gap; }
  // Rows top-down, each as tall as its tallest element, NL.VG apart; every row's elements centred on the row's height.
  const rows = [...new Set(rowOf.values())].sort((a, b) => a - b), rowH = new Map(rows.map(r => [r, Math.max(...[...rowOf].filter(([, d]) => d === r).map(([id]) => S.get(id).h))]));
  let y = 0; const rowY = new Map(); for (const r of rows) { rowY.set(r, y); y += rowH.get(r) + NL.VG; }
  for (const [id, b] of P) { const r = rowOf.get(id); b.y = Math.round(rowY.get(r) + (rowH.get(r) - b.h) / 2); }
  let min = Infinity; for (const b of P.values()) min = Math.min(min, b.x); for (const b of P.values()) b.x -= min;
  return {P, rowOf, W: Math.max(0, ...[...P.values()].map(b => b.x + b.w)), H: Math.max(0, ...[...P.values()].map(b => b.y + b.h))};
}
// Grouped pictures packed (PLAN §4.1.7): on screen the containers stand in a row-major grid sized to their contents,
// the loose elements in rows after them, the rows cut to the limit among ROW_LIMITS that brings the whole picture
// closest to the frame. Positions start at (0, 0); the router draws the lines between them as in every arrangement.
function packedGrid(items, groupIds, stage) {
  const gap = NL.HG, vgap = 48, groups = items.filter(it => groupIds.has(it.id)), loose = items.filter(it => !groupIds.has(it.id));
  const rowsOf = (list, limit) => { const out = []; let w = 0; for (const it of list) { if (out.length && w + it.w > limit) { out.push([]); w = 0; } if (!out.length) out.push([]); out[out.length - 1].push(it); w += it.w + gap; } return out; };
  const layout = limit => {
    const rows = [...(groups.length ? rowsOf(groups, limit) : []), ...(loose.length ? rowsOf(loose, limit) : [])], P = new Map();
    let y = 0, W = 0;
    for (const row of rows) { const h = Math.max(...row.map(it => it.h)); let x = 0; for (const it of row) { P.set(it.id, {x, y: y + Math.round((h - it.h) / 2), w: it.w, h: it.h}); x += it.w + gap; } W = Math.max(W, x - gap); y += h + vgap; }
    return {P, W, H: Math.max(0, y - vgap), way: new Map()};
  };
  let best = null;
  // (rc41: on a printed page the page's width is the one limit)
  for (const limit of PRINT_PX ? [NL.PAGE - 2 * NL.LEFT] : ROW_LIMITS) { const L = layout(limit), z = Math.min(stage.w / (L.W + 2 * NL.LEFT + 24), stage.h / (L.H + NL.TOP + 48)); if (!best || z > best.z + 1e-6) best = {L, z}; }
  return best.L;
}

// ---------------------------------------------------------------- radial, grouped, lanes

function radial(D, hubId) {
  const deg = new Map(D.nodes.map(n => [n.id, 0]));
  for (const e of D.edges) { deg.set(e.from, deg.get(e.from) + 1); deg.set(e.to, deg.get(e.to) + 1); }
  const hub = D.nodes.find(n => n.id === hubId) || D.nodes.slice().sort((a, b) => deg.get(b.id) - deg.get(a.id) || a.title.localeCompare(b.title))[0];
  const P = new Map(); if (!hub) return P;
  const dist = new Map([[hub.id, 0]]), queue = [hub.id], adj = new Map(D.nodes.map(n => [n.id, []]));
  for (const e of D.edges) { adj.get(e.from).push(e.to); adj.get(e.to).push(e.from); }
  while (queue.length) { const id = queue.shift(); for (const o of adj.get(id).slice().sort()) if (!dist.has(o)) { dist.set(o, dist.get(id) + 1); queue.push(o); } }
  const far = Math.max(0, ...dist.values()) + 1;
  for (const n of D.nodes) if (!dist.has(n.id)) dist.set(n.id, far);
  const rings = new Map();
  for (const n of D.nodes) { const d = dist.get(n.id); if (!rings.has(d)) rings.set(d, []); rings.get(d).push(n); }
  const parentAngle = new Map([[hub.id, 0]]);
  // Each ring stands clear of the one inside it (half the widest diagonal of each, plus a gap) and is
  // wide enough that neighbours on it never touch (the chord between two places holds a diagonal).
  let radius = 0, inner = 0; const placed = new Map(), S = new Map(D.nodes.map(n => [n.id, sizeOf(n)]));
  const diag = n => Math.hypot(S.get(n.id).w, S.get(n.id).h);
  for (const d of [...rings.keys()].sort((a, b) => a - b)) {
    const ring = rings.get(d).slice().sort((a, b) => { const pa = adj.get(a.id).map(x => parentAngle.get(x)).find(x => x != null) ?? 9, pb = adj.get(b.id).map(x => parentAngle.get(x)).find(x => x != null) ?? 9; return pa - pb || a.title.localeCompare(b.title); });
    if (d === 0) { placed.set(hub.id, {x: 0, y: 0}); inner = diag(hub); continue; }
    const widest = Math.max(...ring.map(diag)), n = ring.length;
    const clear = radius + (inner + widest) / 2 + 24, chord = n > 1 ? (widest + 16) / (2 * Math.sin(Math.PI / n)) : 0;
    radius = Math.ceil(Math.max(clear, chord, radius + 150));
    inner = widest;
    ring.forEach((x, i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / n; parentAngle.set(x.id, a); placed.set(x.id, {x: radius * Math.cos(a), y: radius * Math.sin(a)}); });
  }
  const minX = Math.min(...[...placed.entries()].map(([id, p]) => p.x - S.get(id).w / 2)), minY = Math.min(...[...placed.entries()].map(([id, p]) => p.y - S.get(id).h / 2));
  for (const n of D.nodes) { const s = S.get(n.id), c = placed.get(n.id); P.set(n.id, {x: Math.round(c.x - s.w / 2 - minX + NL.LEFT), y: Math.round(c.y - s.h / 2 - minY + NL.TOP), w: s.w, h: s.h}); }
  return P;
}
// Crowds (round 4): a rank of one container, or of the page, so wide that the page would cut it into five rows or
// more (CROWD_ROWS) is laid out as one block — a grid of rows no wider than the page, its columns aligned, its members
// in the order given — which the layered layout then places like any other item. Cut into ranks of its own, such a
// rank made every edge from its upper rows run down through the lower ones as dummies, each row stood aside for the
// dummies of the rows above it, and the picture stepped sideways a row at a time (a 134-part Running board was
// 26,796 px wide; it is now 1,356). The row is the page width every layered rank is cut to (six 168 px elements, four
// of the widest). A rank the page holds in four rows or fewer is laid out exactly as before — the widest rank of every
// scene of the reference and stress projects (notation-fixtures.mjs) is cut into four, so their pictures do not move —
// and a container whose items all fit in four page widths is not looked at. A picture with a crowd routes on a cell
// CROWD_CELL times the fine one (makeGrid).
// The tree and the orthogonal arrangement take the same rule when their ranks, cut into rows, would ask for more
// dummies than MAX_DUMMIES (round 5, scale): 500 components in a tree were cut into 271 ranks, 222,014 dummies and a
// page 140,039 px wide. Below that bound they are laid out exactly as before. Left to right, a block's lines are
// columns no taller than the page.
export const CROWD_ROWS = 5, CROWD_CELL = 2;
function crowded(items, edges, vertical = true) {
  const limit = vertical ? NL.PAGE - 2 * NL.LEFT : NL.PAGEH, along = it => (vertical ? it.w : it.h), across = it => (vertical ? it.h : it.w);
  const wide = list => list.reduce((s, it) => s + along(it) + NL.HG, -NL.HG) > (CROWD_ROWS - 1) * limit;
  if (items.length < 2 || !wide(items)) return layered(items, edges, {vertical});
  const r = rankOf(graphOf(items, edges)), byRank = new Map();
  for (const it of items) { const k = r.get(it.id); if (!byRank.has(k)) byRank.set(k, []); byRank.get(k).push(it); }
  const blocks = [...byRank.values()].filter(list => list.length > 1 && wide(list)).map((members, i) => {
    const cw = Math.max(...members.map(along)), cols = Math.max(1, Math.floor((limit + NL.HG) / (cw + NL.HG)));
    const lines = Math.ceil(members.length / cols), per = Math.ceil(members.length / lines), cells = new Map();
    let y = 0;
    for (let row = 0; row < lines; row++) {
      const line = members.slice(row * per, row * per + per), h = Math.max(...line.map(across));
      line.forEach((m, col) => { const a = col * (cw + NL.HG) + Math.round((cw - along(m)) / 2), b = y + Math.round((h - across(m)) / 2); cells.set(m.id, vertical ? {x: a, y: b, w: m.w, h: m.h} : {x: b, y: a, w: m.w, h: m.h}); });
      y += h + NL.HG;
    }
    const a = per * (cw + NL.HG) - NL.HG, b = y - NL.HG;
    return {id: 'crowd\u0002' + i, members, cells, w: vertical ? a : b, h: vertical ? b : a};
  });
  if (!blocks.length) return layered(items, edges, {vertical});
  crowded.count += blocks.length;
  const owner = new Map(blocks.flatMap(b => b.members.map(m => [m.id, b])));
  const reducedItems = items.filter(it => !owner.has(it.id) || owner.get(it.id).members[0] === it).map(it => (owner.has(it.id) ? owner.get(it.id) : it));
  const seen = new Set(), reducedEdges = [];
  for (const e of edges) { const a = owner.get(e.from)?.id || e.from, b = owner.get(e.to)?.id || e.to, k = a + '\u0001' + b + '\u0001' + !!e.up; if (a === b || seen.has(k)) continue; seen.add(k); reducedEdges.push({...e, from: a, to: b}); }
  const L = layered(reducedItems.map(it => ({id: it.id, w: it.w, h: it.h})), reducedEdges, {vertical});
  for (const b of blocks) {
    const at = L.P.get(b.id); L.P.delete(b.id);
    for (const [id, c] of b.cells) L.P.set(id, {x: at.x + c.x, y: at.y + c.y, w: c.w, h: c.h});
  }
  for (const k of [...L.way.keys()]) if (k.includes('crowd\u0002')) L.way.delete(k);
  return L;
}
// A set rather than a flow (round 24, D-24-07: the module map's modules, its kinds of external system): a group marked
// `grid`, and the top level of a scene marked `grid` (D.grid), stand their items in reading order, left to right in rows
// as wide as the page allows, each row as tall as its tallest item, GRID.GAP apart, inside GRID.PAD of padding. Positions
// only: the router draws the lines between them as in every arrangement.
export const GRID = Object.freeze({GAP: 16, PAD: 8});
export const padOf = g => (g?.grid ? GRID.PAD : NL.GPAD);
function gridOf(items, avail) {
  const P = new Map(); let x = 0, y = 0, rowH = 0, W = 0;
  for (const it of items) {
    if (x > 0 && x + it.w > avail) { y += rowH + GRID.GAP; x = 0; rowH = 0; }
    P.set(it.id, {x, y, w: it.w, h: it.h}); W = Math.max(W, x + it.w); x += it.w + GRID.GAP; rowH = Math.max(rowH, it.h);
  }
  return {P, W, H: y + rowH, way: new Map()};
}
// Nested containers: each group is laid out inside by the layered algorithm over the edges among
// its members, and the groups and free elements are laid out by the edges between them. A crowded
// rank stands as a grid (crowded, above).
function grouped(D, stage = null) {
  crowded.count = 0;
  const P = new Map(), G = new Map(), children = new Map(), nodesIn = new Map(), groupOfNode = new Map(D.nodes.map(n => [n.id, n.group || null])), parentOf = new Map(D.groups.map(g => [g.id, g.parent || null]));
  for (const g of D.groups) { children.set(g.id, []); nodesIn.set(g.id, []); }
  for (const g of D.groups) if (g.parent && children.has(g.parent)) children.get(g.parent).push(g);
  for (const n of D.nodes) if (n.group && nodesIn.has(n.group)) nodesIn.get(n.group).push(n);
  // The item inside container `gid` that holds node `id`: the node itself, or the child group it is in.
  const itemIn = (gid, id) => { let g = groupOfNode.get(id); if (g === gid) return id; while (g) { if (parentOf.get(g) === gid) return g; g = parentOf.get(g); } return null; };
  const edgesAmong = (gid, itemIds) => { const set = new Set(itemIds), out = []; for (const e of D.edges) { const a = itemIn(gid, e.from), b = itemIn(gid, e.to); if (a && b && a !== b && set.has(a) && set.has(b)) out.push({from: a, to: b, up: e.up}); } return out; };
  const ways = new Map(); // container id (null for the page) → waypoints keyed by item pair
  // The width a grid group's items may take: the page less its margins and the padding of the group and its containers.
  const byGroup = new Map(D.groups.map(g => [g.id, g])), inner = g => { let w = NL.PAGE - 2 * NL.LEFT; for (let x = g, guard = 0; x && guard < 50; x = byGroup.get(x.parent), guard++) w -= 2 * padOf(x); return w; };
  const measure = g => {
    const subs = children.get(g.id).map(measure), items = [...nodesIn.get(g.id).map(n => ({id: n.id, ...sizeOf(n)})), ...subs.map(b => ({id: b.g.id, w: b.w, h: b.h}))], pad = padOf(g);
    const L = g.grid ? gridOf(items, inner(g)) : crowded(items, edgesAmong(g.id, items.map(i => i.id)));
    // (round 24 part 3: a grid group, such as a module's boundary around its one component, is as wide as its title)
    return {g, subs, L, w: Math.max(L.W, NL.W, g.grid ? Math.min(groupTitleWidth(g), inner(g)) - 2 * pad : 0) + 2 * pad, h: (L.H || NL.H) + NL.GHEAD + 2 * pad};
  };
  const place = (m, x, y) => {
    const pad = padOf(m.g);
    G.set(m.g.id, {x, y, w: m.w, h: m.h});
    ways.set(m.g.id, new Map([...m.L.way].map(([k, pts]) => [k, pts.map(([px, py]) => [x + pad + px, y + NL.GHEAD + pad + py])])));
    for (const [id, b] of m.L.P) { const sub = m.subs.find(s => s.g.id === id); if (sub) place(sub, x + pad + b.x, y + NL.GHEAD + pad + b.y); else P.set(id, {x: x + pad + b.x, y: y + NL.GHEAD + pad + b.y, w: b.w, h: b.h}); }
  };
  const tops = D.groups.filter(g => !g.parent || !D.groups.some(x => x.id === g.parent)).map(measure);
  let items = [...tops.map(m => ({id: m.g.id, w: m.w, h: m.h})), ...D.nodes.filter(n => !n.group).map(n => ({id: n.id, ...sizeOf(n)}))];
  // A grid scene's top level stands in the order its elements are recorded: a free element, or the group that holds it.
  if (D.grid) { const at = new Map(); D.nodes.forEach((n, i) => { let g = n.group ? byGroup.get(n.group) : null, guard = 0; while (g?.parent && byGroup.has(g.parent) && guard++ < 50) g = byGroup.get(g.parent); const k = g ? g.id : n.id; if (!at.has(k)) at.set(k, i); }); items = items.slice().sort((a, b) => (at.get(a.id) ?? 1e9) - (at.get(b.id) ?? 1e9)); }
  // (on screen, rc40: the containers in a grid sized to their contents, the loose elements in rows after them — packedGrid)
  const L = D.grid ? gridOf(items, NL.PAGE - 2 * NL.LEFT) : stage ? packedGrid(items, new Set([...tops.map(m => m.g.id), ...D.nodes.filter(n => !n.group && isListBox(n)).map(n => n.id)]), stage) : crowded(items, edgesAmong(null, items.map(i => i.id)));
  ways.set(null, new Map([...L.way].map(([k, pts]) => [k, pts.map(([px, py]) => [NL.LEFT + px, NL.TOP + py])])));
  for (const [id, b] of L.P) { const m = tops.find(t => t.g.id === id); if (m) place(m, NL.LEFT + b.x, NL.TOP + b.y); else P.set(id, {x: NL.LEFT + b.x, y: NL.TOP + b.y, w: b.w, h: b.h}); }
  // An edge's corridor is the one planned at the deepest container that holds both its ends in different items.
  const way = new Map();
  for (const e of D.edges) { let gid = null; for (let guard = 0; guard < 50; guard++) { const a = itemIn(gid, e.from), b = itemIn(gid, e.to); if (!a || !b) break; if (a !== b) { const w = ways.get(gid); const pts = w?.get(a + '\u0001' + b) || (w?.get(b + '\u0001' + a) || []).slice().reverse(); if (pts.length) way.set(e.id, pts); break; } gid = a; } }
  return {P, G, way, crowds: crowded.count};
}
// Swimlanes: one band per lane or container that holds elements, steps by rank across, branches
// stacked; containers that only hold lanes (a pool) enclose them, and two pools never touch.
export const CAPTION_H = 28;
const captioned = n => (n.kind === 'event' || n.kind === 'gateway') && !isListBox(n);
function lanes(D) {
  const P = new Map(), G = new Map(), items = D.nodes.map(n => ({id: n.id, ...sizeOf(n)}));
  // A boundary event (round 6) ranks just after the task it hangs on, so what follows it stands downstream of the task.
  const hints = D.nodes.filter(n => n.attachedTo && D.nodes.some(x => x.id === n.attachedTo)).map(n => ({id: 'hint:' + n.id, from: n.attachedTo, to: n.id, kind: 'sequence', up: false}));
  const Gr = graphOf(items, [...D.edges.filter(e => e.kind !== 'message' && e.kind !== 'accesses'), ...hints]), r = rankOf(Gr);
  // A band per container that holds elements, and per empty container with nothing inside it (an empty recovery zone is a finding, drawn as an empty lane).
  const bandGroups = D.groups.filter(g => D.nodes.some(n => n.group === g.id) || !D.groups.some(x => x.parent === g.id)), bandIds = bandGroups.map(g => g.id);
  const bandOf = n => (bandIds.includes(n.group) ? n.group : null), free = D.nodes.some(n => !bandOf(n));
  const parentOf = id => D.groups.find(x => x.id === id)?.parent || null;
  const depth = id => { let d = 0, p = parentOf(id); while (p) { d++; p = parentOf(p); } return d; };
  const topOf = id => { let t = id, p = parentOf(id); while (p) { t = p; p = parentOf(p); } return t; };
  // Bands of one pool stay together, in the order the pools were recorded.
  const pools = [...new Set(bandIds.map(topOf))];
  const bands = [...pools.flatMap(t => bandIds.filter(id => topOf(id) === t)), ...(free ? [null] : [])];
  const cols = new Map(); for (const n of D.nodes) { const k = r.get(n.id) + '|' + (bandOf(n) || ''); if (!cols.has(k)) cols.set(k, []); cols.get(k).push(n); }
  for (const list of cols.values()) list.sort((a, b) => (a.record?.branch || 0) - (b.record?.branch || 0) || a.title.localeCompare(b.title));
  const maxRank = Math.max(0, ...D.nodes.map(n => r.get(n.id))), colW = new Map(), colX = new Map();
  for (let i = 0; i <= maxRank; i++) colW.set(i, Math.max(NL.TASK_W, ...D.nodes.filter(n => r.get(n.id) === i).map(n => (captioned(n) ? 130 : sizeOf(n).w))));
  const maxDepth = Math.max(0, ...bandIds.map(depth)), inset = d => d * NL.GPAD;
  let x = NL.LEFT + inset(maxDepth) + 150; for (let i = 0; i <= maxRank; i++) { colX.set(i, x); x += colW.get(i) + NL.HG + 20; }
  const right = Math.max(x, NL.LEFT + 400) + inset(maxDepth);
  let y = NL.TOP + maxDepth * (NL.GHEAD + NL.GPAD); const synthetic = []; let prevTop;
  for (const lane of bands) {
    const pool = lane ? topOf(lane) : null;
    // A new pool leaves room for the last pool's bottom edge and this pool's header.
    if (prevTop !== undefined && pool !== prevTop) y += NL.GPAD + NL.GGAP + (lane ? depth(lane) * (NL.GHEAD + NL.GPAD) : 0);
    prevTop = pool;
    const inLane = D.nodes.filter(n => bandOf(n) === lane);
    const rowH = Math.max(NL.TASK_H, ...inLane.map(n => sizeOf(n).h + (captioned(n) ? CAPTION_H : 0))) + 18;
    const stacks = Math.max(1, ...[...cols.entries()].filter(([k]) => k.endsWith('|' + (lane || ''))).map(([, v]) => v.length));
    const top = NL.GHEAD + NL.GPAD, h = Math.max(96, top + stacks * rowH + 4), d = lane ? depth(lane) : 0;
    if (lane) G.set(lane, {x: NL.LEFT + inset(d), y, w: right - NL.LEFT - 2 * inset(d), h}); else synthetic.push({title: 'Ungrouped', y, h, x: NL.LEFT, w: right - NL.LEFT});
    for (const n of inLane) { const k = r.get(n.id) + '|' + (lane || ''), i = cols.get(k).indexOf(n), s = sizeOf(n), extra = captioned(n) ? CAPTION_H : 0; P.set(n.id, {x: colX.get(r.get(n.id)) + Math.round((colW.get(r.get(n.id)) - s.w) / 2), y: y + top + i * rowH + Math.round((rowH - 18 - s.h - extra) / 2), w: s.w, h: s.h}); }
    y += h + 8;
  }
  // A boundary event hangs on the lower right edge of its task (a hint to this arrangement, not a new one).
  for (const n of D.nodes) if (n.attachedTo && P.has(n.attachedTo) && P.has(n.id)) { const t = P.get(n.attachedTo), b = P.get(n.id); P.set(n.id, {...b, x: t.x + t.w - Math.round(b.w * 0.6), y: t.y + t.h - Math.round(b.h / 2)}); }
  return {P, G, bands: synthetic};
}

// ---------------------------------------------------------------- sequence (round 6, Contract T)
// Lifelines as evenly spaced columns, each a head box with a dashed line down the page; messages as rows top-down, a
// horizontal connector from the sender's line to the receiver's with its step number and word above it; a message to
// the sending lifeline itself is a small loop. The columns stand far enough apart for the longest word between two
// neighbours. Linear in the messages: 500 of them lay out in a few milliseconds and stand ~17,000 px tall.
export const SQ = {HEAD_W: 168, HEAD_H: 52, COL: 220, ROW: 34, TOP_GAP: 36, SELF_W: 42, SELF_H: 16};
function sequence(D) {
  const heads = D.nodes, index = new Map(heads.map((n, i) => [n.id, i]));
  // The gap each pair of adjacent columns needs: the widest word that runs between them (a message spanning several
  // columns asks each gap for its share).
  const gaps = Array(Math.max(0, heads.length - 1)).fill(SQ.COL);
  for (const e of D.edges) { const a = index.get(e.from), b = index.get(e.to); if (a == null || b == null || a === b) continue; const lo = Math.min(a, b), hi = Math.max(a, b), need = (labelWidth((e.step ? e.step + ' ' : '') + (e.label || '')) + 24) / (hi - lo); for (let i = lo; i < hi; i++) gaps[i] = Math.max(gaps[i], Math.ceil(need)); }
  const xs = []; let x = NL.LEFT; for (let i = 0; i < heads.length; i++) { xs.push(x); x += SQ.HEAD_W + (gaps[i] || SQ.COL) - SQ.HEAD_W; }
  const P = new Map(); heads.forEach((n, i) => P.set(n.id, {x: xs[i], y: NL.TOP, w: SQ.HEAD_W, h: SQ.HEAD_H}));
  const cx = id => P.get(id).x + SQ.HEAD_W / 2;
  let y = NL.TOP + SQ.HEAD_H + SQ.TOP_GAP;
  const edges = [];
  const ordered = D.edges.slice().sort((p, q) => (p.step || 0) - (q.step || 0));
  for (const e of ordered) {
    if (!P.has(e.from) || !P.has(e.to)) continue;
    const word = (e.step ? e.step + ' ' : '') + (e.label || ''), w = labelWidth(word);
    let pts, lx, ly;
    if (e.from === e.to) { const a = cx(e.from); pts = [[a, y], [a + SQ.SELF_W, y], [a + SQ.SELF_W, y + SQ.SELF_H], [a, y + SQ.SELF_H]]; lx = a + SQ.SELF_W + 6 + w / 2; ly = y + SQ.SELF_H / 2 + 4; y += SQ.ROW + SQ.SELF_H; }
    else { const a = cx(e.from), b = cx(e.to); pts = [[a, y], [b, y]]; lx = (a + b) / 2; ly = y - 4; y += SQ.ROW; }
    const labelBox = {x: Math.round(lx - w / 2), y: Math.round(ly - 11), w, h: 11};
    const out = {...e, pts: pts.map(([px, py]) => [Math.round(px), Math.round(py)]), lx: Math.round(lx), ly: Math.round(ly), labelBox, through: false, portIndex: 0};
    if (e.qualifier) { out.qx = out.pts[0][0] + (out.pts[1][0] >= out.pts[0][0] ? 6 : -6); out.qy = out.pts[0][1] + 12; out.qAnchor = out.pts[1][0] >= out.pts[0][0] ? 'start' : 'end'; }
    edges.push(out);
  }
  const bottom = y + 12, lifelines = heads.map(n => ({id: n.id, x: cx(n.id), y1: NL.TOP + SQ.HEAD_H, y2: bottom}));
  const W = Math.max(MIN_W, (xs.at(-1) ?? NL.LEFT) + SQ.HEAD_W + NL.LEFT, ...edges.map(e => e.labelBox.x + e.labelBox.w + NL.LEFT));
  return {P, edges, lifelines, W, bottom};
}
// Groups drawn as containers grow to hold their nodes and subgroups (pins included).
function enclose(D, P, G) {
  const depth = g => (g.parent && D.groups.some(x => x.id === g.parent) ? 1 + depth(D.groups.find(x => x.id === g.parent)) : 0);
  const byDepth = D.groups.slice().sort((a, b) => depth(b) - depth(a));
  for (const g of byDepth) {
    const inside = [...D.nodes.filter(n => n.group === g.id).map(n => P.get(n.id)), ...D.groups.filter(x => x.parent === g.id).map(x => G.get(x.id))].filter(Boolean), pad = padOf(g);
    if (!inside.length) { if (!G.has(g.id)) G.set(g.id, {x: NL.LEFT, y: NL.TOP, w: NL.W + 2 * pad, h: NL.H + NL.GHEAD + 2 * pad}); continue; }
    const x1 = Math.min(...inside.map(b => b.x)) - pad, y1 = Math.min(...inside.map(b => b.y)) - NL.GHEAD - pad, x2 = Math.max(...inside.map(b => b.x + b.w)) + pad, y2 = Math.max(...inside.map(b => b.y + b.h)) + pad;
    const cur = G.get(g.id) || {x: x1, y: y1, w: x2 - x1, h: y2 - y1};
    G.set(g.id, {x: Math.min(cur.x, x1), y: Math.min(cur.y, y1), w: Math.max(cur.x + cur.w, x2) - Math.min(cur.x, x1), h: Math.max(cur.y + cur.h, y2) - Math.min(cur.y, y1)});
  }
  return G;
}

// ---------------------------------------------------------------- routing
// Orthogonal routes on a cell grid: an element's cells are closed (so a connector never passes
// through a box), a group's header is closed (so a title is never crossed), a cell another route
// already runs along costs more (so parallel runs take separate cells), a turn costs more than a
// straight run. Search is A* between the two ports, bounded to the neighbourhood first. The search runs on cell
// centres; the whole run that leaves a port, and the whole run that enters one, are then moved onto the port's line
// (snapRoute), so a straight drop is drawn as one segment and every corner is a real turn.
// Round 10: connectors never share a start, an end or a run, except inside a declared bundle that passes its checks
// (formBundles, consolidate, below): there the relationships of one line style at one side of one element leave it by
// one port and run on one trunk. The grid counts the routes along each cell, and the bundle routes among them, so a
// member keeps to its own bundle's cells and every other route keeps off a trunk (BUNDLE.AVOID).
function makeGrid(W, H, boxes, headers, soft = [], cell = null) {
  // The cell stays fine enough that the gap between a container's title and its first row (and the
  // gap between two elements) is always at least one open cell; only a very large picture coarsens, and a
  // picture with a crowd (grouped, above) routes on the cell it is given.
  const c = cell || (W * H / (NL.CELL * NL.CELL) > 3e6 ? NL.CELL * 1.5 : NL.CELL), cols = Math.ceil(W / c) + 2, rows = Math.ceil(H / c) + 2, blocked = new Uint8Array(cols * rows);
  const close = b => { const x1 = Math.max(0, Math.floor((b.x + 2) / c)), x2 = Math.min(cols - 1, Math.floor((b.x + b.w - 2) / c)), y1 = Math.max(0, Math.floor((b.y + 2) / c)), y2 = Math.min(rows - 1, Math.floor((b.y + b.h - 2) / c)); for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) blocked[y * cols + x] = 1; };
  for (const b of boxes) close(b);
  // A container's title and sub-line are closed (a connector never crosses a word); the rest of its
  // header strip is open, as is its border.
  const head = new Uint8Array(cols * rows), closeHead = b => { const x1 = Math.max(0, Math.floor((b.x + 2) / c)), x2 = Math.min(cols - 1, Math.floor((b.x + b.w - 2) / c)), y1 = Math.max(0, Math.floor((b.y + 2) / c)), y2 = Math.min(rows - 1, Math.floor((b.y + b.h - 2) / c)); for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) if (!blocked[y * cols + x]) { blocked[y * cols + x] = 1; head[y * cols + x] = 1; } };
  for (const h of headers) closeHead(h);
  // Soft cells (an event's or a gateway's caption) cost more to cross but are not closed.
  const softCells = new Uint8Array(cols * rows); for (const b of soft) { const x1 = Math.max(0, Math.floor(b.x / c)), x2 = Math.min(cols - 1, Math.floor((b.x + b.w) / c)), y1 = Math.max(0, Math.floor(b.y / c)), y2 = Math.min(rows - 1, Math.floor((b.y + b.h) / c)); for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) softCells[y * cols + x] = 1; }
  // Routes along each cell, horizontally (uh) and vertically (uv), and of them the routes of bundle members (bh, bv).
  // `member` and `hard` are set for the one route being searched (a bundle member; a line re-routed off a trunk).
  const n = cols * rows;
  // `door`: the cell in front of each port (round 10, set only where bundles are drawn), 1 for a top or bottom port (a
  // route along it runs across the port's way in), 2 for a side port.
  // `rim` (the round-10 review): the cells whose centre stands outside an element within BUNDLE.JOIN_ELEMENT px of one of
  // its sides, 1 along a top or bottom side, 2 along a left or right side. A member of a fan with join dots (`dotted`,
  // set for the one route being searched) pays BUNDLE.AVOID to travel along such a side, so its joins stand clear of every
  // element (consolidate's join-near-element: a dot there would read as leaving the element, or sit in a branch's head).
  // Every other line, the control's included, crosses the rim for nothing, as before.
  const rim = new Uint8Array(n), M = BUNDLE.JOIN_ELEMENT;
  for (const b of boxes) {
    const x1 = Math.max(0, Math.floor((b.x - M) / c)), x2 = Math.min(cols - 1, Math.floor((b.x + b.w + M) / c)), y1 = Math.max(0, Math.floor((b.y - M) / c)), y2 = Math.min(rows - 1, Math.floor((b.y + b.h + M) / c));
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
      const cx = x * c + c / 2, cy = y * c + c / 2, dy = cy < b.y ? b.y - cy : cy > b.y + b.h ? cy - b.y - b.h : 0, dx = cx < b.x ? b.x - cx : cx > b.x + b.w ? cx - b.x - b.w : 0;
      if (dy > 0 && dy < M && dx === 0) rim[y * cols + x] |= 1; else if (dx > 0 && dx < M && dy === 0) rim[y * cols + x] |= 2;
    }
  }
  return {c, cols, rows, blocked, uh: new Uint16Array(n), uv: new Uint16Array(n), bh: new Uint16Array(n), bv: new Uint16Array(n), door: new Uint8Array(n), rim, member: false, hard: false, dotted: false, head, soft: softCells, pref: new Uint8Array(n)};
}
// A binary heap of (cost, state) in typed arrays: no allocation per push or pop.
class Heap {
  constructor() { this.k = new Uint32Array(1024); this.v = new Int32Array(1024); this.n = 0; }
  push(key, val) {
    if (this.n === this.k.length) { const k = new Uint32Array(this.n * 2), v = new Int32Array(this.n * 2); k.set(this.k); v.set(this.v); this.k = k; this.v = v; }
    const K = this.k, V = this.v; let i = this.n++;
    while (i > 0) { const p = (i - 1) >> 1; if (K[p] <= key) break; K[i] = K[p]; V[i] = V[p]; i = p; }
    K[i] = key; V[i] = val;
  }
  pop() {
    const K = this.k, V = this.v, top = V[0], n = --this.n;
    if (n > 0) {
      const key = K[n], val = V[n]; let i = 0;
      for (;;) { const l = 2 * i + 1; if (l >= n) break; const r = l + 1, m = r < n && K[r] < K[l] ? r : l; if (K[m] >= key) break; K[i] = K[m]; V[i] = V[m]; i = m; }
      K[i] = key; V[i] = val;
    }
    return top;
  }
  get size() { return this.n; }
}
// A* over (cell, direction) states with generation-stamped typed arrays, so each route starts
// from a clean table without clearing it.
function astar(grid, from, to, openA, openB, bounds, {headersOpen = false} = {}) {
  const {cols, rows, blocked, uh, uv, bh, bv, door, rim, pref, head, soft, member, hard, dotted} = grid;
  // The tables are generation-stamped, so grids of one size may share them (round 10: the passes of one layout do).
  const T = grid.tables ||= {n: cols * rows * 4, gen: 0};
  if (!T.best) { T.best = new Uint32Array(T.n); T.prev = new Int32Array(T.n); T.stamp = new Uint32Array(T.n); T.done = new Uint32Array(T.n); }
  const gen = ++T.gen, best = T.best, prev = T.prev, stamp = T.stamp, done = T.done, heap = new Heap();
  const tx = to[0], ty = to[1];
  const x1 = Math.max(0, bounds.x1), y1 = Math.max(0, bounds.y1), x2 = Math.min(cols - 1, bounds.x2), y2 = Math.min(rows - 1, bounds.y2);
  const weight = grid.heuristic || 12;
  const h = (x, y) => (Math.abs(x - tx) + Math.abs(y - ty)) * weight; // dense grids use a slightly greedier guide; obstacles and costs remain unchanged
  for (let d = 0; d < 4; d++) { const k = (from[1] * cols + from[0]) * 4 + d; stamp[k] = gen; best[k] = 0; prev[k] = -1; heap.push(h(from[0], from[1]), k); }
  let expansions = 0;
  while (heap.size) {
    const k = heap.pop();
    if (done[k] === gen) continue; // a stale entry: this state was already expanded at a lower cost
    done[k] = gen;
    const d = k & 3, cell = k >> 2, x = cell % cols, y = (cell - x) / cols, g = best[k];
    if (x === tx && y === ty) { const pts = []; let c = k; while (c >= 0) { const cc = c >> 2; pts.push([cc % cols, (cc - cc % cols) / cols]); c = prev[c]; } return pts.reverse(); }
    if (++expansions > 300000) return null;
    const h0 = h(x, y);
    for (let nd = 0; nd < 4; nd++) {
      if (nd === ((d + 2) & 3)) continue;
      const nx = x + (nd === 0 ? 1 : nd === 2 ? -1 : 0), ny = y + (nd === 1 ? 1 : nd === 3 ? -1 : 0);
      if (nx < x1 || ny < y1 || nx > x2 || ny > y2) continue;
      const nc = ny * cols + nx;
      if (blocked[nc] && nc !== openA && nc !== openB && !(headersOpen && head[nc])) continue;
      const nk = nc * 4 + nd;
      if (done[nk] === gen) continue;
      // Along another route: 40, or BUNDLE.AVOID when either this route or that cell's route is a bundle member (a
      // member keeps to its own trunk, every other line keeps off one), or BUNDLE.HARD for a line re-routed off a trunk.
      // A member also keeps off the way into another port (along the cell in front of it), which that port's line must
      // cross, and a member of a fan with join dots off the rim of every element (along its side, within JOIN_ELEMENT px).
      const horizontal = (nd & 1) === 0, along = horizontal ? uh[nc] : uv[nc], across = horizontal ? uv[nc] : uh[nc], trunk = horizontal ? bh[nc] : bv[nc], ways = horizontal ? 1 : 2;
      const ng = g + (pref[nc] ? 3 : 10) + (nd !== d ? 40 : 0) + (along ? (hard && trunk ? BUNDLE.HARD : member || trunk ? BUNDLE.AVOID : 40) : 0) + (across ? 10 : 0) + (soft[nc] ? 60 : 0) + (member && door[nc] & ways && nc !== openA && nc !== openB ? BUNDLE.AVOID : 0) + (dotted && rim[nc] & ways && nc !== openA && nc !== openB ? BUNDLE.AVOID : 0);
      if (stamp[nk] !== gen || ng < best[nk]) {
        // A cardinal step changes Manhattan distance by one; derive its exact heuristic from this cell.
        const nextH = h0 + (nd === 0 ? (x < tx ? -weight : weight) : nd === 2 ? (x > tx ? -weight : weight) : nd === 1 ? (y < ty ? -weight : weight) : (y > ty ? -weight : weight));
        stamp[nk] = gen; best[nk] = ng; prev[nk] = k; heap.push(ng + nextH, nk);
      }
    }
  }
  return null;
}
// Ports: where a connector leaves and enters a box, spread along the facing side so that the
// connectors of one box never share a start or an end, except inside a declared bundle (round 10): its members share
// the port at their shared end, and two records of one fact share both ports. The slots of a face are merged by
// bundle (or by fact), each placed at the mean of its far ends, so a picture without bundles keeps its order.
// Returns the bundles declared (formBundles; none unless `bundle`).
function portsOf(nodes, edges, capIds = new Set(), {bundle = false, fans = true, banned = new Set(), laneOf = null} = {}) {
  const P = byId(nodes);
  const faceOf = (a, b) => { const ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2; const dx = bx - ax, dy = by - ay; const vertical = Math.abs(dy) * 1.0 >= Math.abs(dx) || (b.y >= a.y + a.h || b.y + b.h <= a.y); return vertical ? (dy >= 0 ? 'bottom' : 'top') : (dx >= 0 ? 'right' : 'left'); };
  const opp = {bottom: 'top', top: 'bottom', right: 'left', left: 'right'};
  // An event or a gateway carries its name below: its connectors leave by the sides or the top.
  const side = (box, other) => ((other.x + other.w / 2) >= box.x + box.w / 2 ? 'right' : 'left');
  const slots = new Map();
  for (const e of edges) { const a = P.get(e.from), b = P.get(e.to); if (!a || !b) continue; let fa = faceOf(a, b), fb = opp[fa]; if (fa === 'bottom' && capIds.has(e.from)) fa = side(a, b); if (fb === 'bottom' && capIds.has(e.to)) fb = side(b, a); e._fa = fa; e._fb = fb; for (const [id, f, other, end] of [[e.from, fa, b, 'from'], [e.to, fb, a, 'to']]) { const k = id + '|' + f; if (!slots.has(k)) slots.set(k, []); slots.get(k).push({e, other, end}); } }
  const port = (box, face, i, n) => { const span = face === 'top' || face === 'bottom' ? box.w : box.h, step = Math.min(18, span / (n + 1)), off = (i - (n - 1) / 2) * step; return face === 'bottom' ? [box.x + box.w / 2 + off, box.y + box.h] : face === 'top' ? [box.x + box.w / 2 + off, box.y] : face === 'right' ? [box.x + box.w, box.y + box.h / 2 + off] : [box.x, box.y + box.h / 2 + off]; };
  const declared = bundle ? formBundles(edges, {fans, banned, laneOf}) : [];
  for (const [k, list] of slots) {
    const [id, face] = k.split('|'), box = P.get(id), along = s => (face === 'top' || face === 'bottom' ? s.other.x + s.other.w / 2 : s.other.y + s.other.h / 2);
    const merged = [], by = new Map();
    for (const s of list) {
      const b = s.e._bundle, u = s.e._unit, mk = b && (b.end === s.end || b.end === 'both') ? 'B' + b.key : u && u.edges.length > 1 ? 'U' + u.key : null;
      if (!mk) { merged.push({items: [s]}); continue; }
      if (!by.has(mk)) { const m = {items: []}; by.set(mk, m); merged.push(m); }
      by.get(mk).items.push(s);
    }
    for (const m of merged) { m.at = m.items.reduce((t, s) => t + along(s), 0) / m.items.length; m.first = m.items.map(s => String(s.e.id)).sort()[0]; }
    merged.sort((p, q) => p.at - q.at || p.first.localeCompare(q.first));
    // One port array per slot: the members of a merged slot hold the same point.
    merged.forEach((m, i) => { const pt = port(box, face, i, merged.length); for (const s of m.items) { if (s.end === 'from') { s.e._pa = pt; s.e._pi = i; } else s.e._pb = pt; } });
  }
  return declared;
}

// ---------------------------------------------------------------- bundles (round 10)
// Consolidation merges ink, never records. Relationships of one line style (kind, word, ends, weak, reply, diff change)
// that meet one element at one side of it may be drawn as one line from that element: one port, one trunk drawn once,
// one mark at the shared end, and a branch per relationship where it leaves (a join). Two records of one fact (same
// ends, line style and qualifier) may be drawn as one line. Every relationship keeps its own L.edge with its complete
// route, in model order, so its hit, its Tab stop, its reading and its export stay its own; the bundle lies beside it
// (L.bundles; each member's bundle, bundleEnd and branch) and never reaches a code export.
// Never bundled: the sequence and lanes arrangements, the process (BPMN) and sequence pictures, a picture drawn
// straight (radial, the straight-mode giants), a numbered step, a cardinality, a crossing mark, a relationship to
// itself; and no fan forms on an ArchiMate Flow or Triggering kind or the flow, sequence, message and path families
// (a join there would read as a fork or a merge the model does not record). A fan-out whose relationships carry a
// qualifier is not formed (the qualifier sits at the source, which the fan-out shares).
// Every bundle is checked after routing (consolidate): one port, a tree from it with a root of at least BUNDLE.ROOT px,
// a join at every split, no rejoining, no element crossed, and no foreign line along a trunk, within JOIN_CLEAR px of
// a join or with a point on a trunk; a composition, aggregation or dot-ended fan splits only as a T. A bundle that
// fails is repaired (the foreign line re-routed off it once, or the failing members drawn apart) or drawn apart, in at
// most PASSES further passes; a picture never draws more ink than the same picture without bundles (routeConsolidated).
// When the first pass fails on more than BAIL of its bundles (and at least BAIL_MIN of them), or the last pass still
// fails, the picture keeps only the records of one fact drawn once, and if even that fails it is drawn without bundles.
// Each repair and fallback is recorded (L.consolidation).
// Frozen tuning, read from nowhere else. AVOID 150 and 600, one bundle per side of an element, fan-outs first on a tie,
// no doubling for a mark and bundles routed before every other line were tried on the dense Layers pictures (bank-payment
// Chapters 5 and 6, which fall back): none kept them bundled, and the last two drew more pictures apart elsewhere.
// The review of round 10 added the shape rules: a member along HUG px of two sides of its shared element (HUG_RUN px
// each) frames it; a member DETOUR times its control route plus DETOUR_PAD px wanders to the shared port; a join within
// JOIN_ELEMENT px of an element reads as a relationship leaving it (an element's mark badge stands 8 px below its bottom
// edge); two joins closer than JOIN_GAP px touch, and a bend within JOIN_GAP px of a join hides which bar a branch hangs
// from. ROOT is JOIN_ELEMENT, so the first join of a root keeps that distance from the shared element.
export const BUNDLE = Object.freeze({MIN: 2, ROOT: 12, PASSES: 3, AVOID: 300, HARD: 4000, STEM: 2, BAIL: 0.25, BAIL_MIN: 4, RUN: 6, JOIN_CLEAR: 3, ON_RUN: 0.5, WHY: 12, HUG: 12, HUG_RUN: 16, DETOUR: 1.5, DETOUR_PAD: 40, JOIN_ELEMENT: 12, JOIN_GAP: 10});
const NO_FAN_FAMILIES = new Set(['flow', 'sequence', 'message', 'path']);
export const NO_BUNDLE_SCENES = new Set(['process', 'sequence']), NO_BUNDLE_ARRANGEMENTS = new Set(['sequence', 'lanes', 'radial']);
// The weight that puts a fan-in from one lane before every fan-out (formBundles, rc40): more than any count of units.
const LANE_FAN_IN = 1000;
// One line style: what two relationships must share to be drawn as one line. The word and the qualifier compare in full
// (fullLabel and fullQualifier, notation-model.js: the picture draws them shortened, and two different ones may shorten
// alike). The renderer, the view and the metrics read these two, so one fact is one fact everywhere.
export const lineStyle = e => [e.kind, e.fullLabel ?? e.label ?? '', e.ends || 'one', e.weak ? 1 : 0, e.reply ? 1 : 0, e.change || ''].join('\u0002');
export const qualifierOf = e => String(e.fullQualifier ?? e.qualifier ?? '');
// A fan-out's members share their source, so the qualifier written there is one for all of them (rc41, W1; PLAN §2 W1.5):
// relationships of one line style from one element form a fan-out only with one qualifier between them (none, or the
// same words: Chapter 7's "serves (degraded)" servings from one capability join a trunk of their own), which the root
// writes once (placeLabels). The key part names it.
const fanOutQualifier = e => (e.qualifier ? '\u0002q:' + qualifierOf(e) : '');
// Two records of one fact: the same ends, line style and qualifier (one line may be drawn for both).
export const sameFact = (a, b) => !!a && !!b && a.from === b.from && a.to === b.to && lineStyle(a) === lineStyle(b) && qualifierOf(a) === qualifierOf(b);
// A short, stable name for a bundle (FNV-1a over its key): the reading packet and the exported picture carry it, so it
// says nothing of the element's side or the style tuple the key holds.
const shortHash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
const fanExcluded = e => { const st = styleOf(e.kind); return st.archimate === 'Flow' || st.archimate === 'Triggering' || NO_FAN_FAMILIES.has(e.family || st.family); };
// A composition, aggregation or dot-ended bundle carries no join dot (its own end mark is a diamond or a dot): it splits
// as a plain T, never four ways.
const undotted = kind => { const st = styleOf(kind); return st.archimate === 'Composition' || st.archimate === 'Aggregation' || st.head === 'dot' || st.tail === 'dot'; };
// Whether the renderer draws a mark at that end (notation-svg.js svgParts).
const markedAt = (e, end) => { const st = styleOf(e.kind); return end === 'to' ? e.ends !== 'none' && st.head !== 'none' : e.ends === 'both' || st.tail !== 'none'; };
const idCmp = (p, q) => (String(p.id) < String(q.id) ? -1 : String(p.id) > String(q.id) ? 1 : 0);
// The bundles of a picture, declared before routing from each connector's faces (portsOf). A unit is one fact (its
// records, the smallest id first); fan keys are 'i|to|face|style' (a fan-in) and 'o|from|face|style' (a fan-out,
// only without a qualifier). Greedy and deterministic: the key with the most free units wins, doubled where a mark
// sits at the shared end, ties to the smaller key (so a fan-in first); each unit joins at most one bundle, so every
// bundle is a tree from one end. A fact recorded more than once that joins no fan is a bundle of its own ('both').
// `banned` holds keys drawn apart ('i|…', 'o|…', 'd|…') and relationships drawn apart ('x|id').
// `laneOf` (rc40, W1: the fan-in across sources that share a lane): a fan-in whose every source stands in one lane (a
// role level, a concern band) and shares one line style is the trunk the standard draws — one line into the target with
// one word — so it is chosen before any fan-out that would take one of its relationships (the bank-payment Chapter 7
// "serves" case: 41 servings from one band of components into five capabilities).
function formBundles(edges, {fans = true, banned = new Set(), laneOf = null} = {}) {
  const facts = new Map();
  for (const e of edges) {
    if (!e._fa || e.step || e.cardinality || e.crossing || e.from === e.to || banned.has('x|' + e.id)) continue;
    const k = 'd|' + e.from + '|' + e.to + '|' + lineStyle(e) + '|' + qualifierOf(e);
    if (!facts.has(k)) facts.set(k, []); facts.get(k).push(e);
  }
  const units = [];
  for (const [key, list] of facts) { list.sort(idCmp); if (list.length > 1 && banned.has(key)) for (const e of list) units.push({key: key + '|' + e.id, edges: [e], rep: e}); else units.push({key, edges: list, rep: list[0]}); }
  const groups = new Map(), add = (k, u) => { if (banned.has(k)) return; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(u); };
  if (fans) for (const u of units) { const e = u.rep; if (fanExcluded(e)) continue; add('i|' + e.to + '|' + e._fb + '|' + lineStyle(e), u); add('o|' + e.from + '|' + e._fa + '|' + lineStyle(e) + fanOutQualifier(e), u); }
  for (const [k, list] of groups) if (list.length < BUNDLE.MIN) groups.delete(k);
  const taken = new Set(), out = [];
  for (;;) {
    let best = null;
    for (const [k, list] of groups) {
      const free = list.filter(u => !taken.has(u)); if (free.length < BUNDLE.MIN) continue;
      const shared = k[0] === 'i' && laneOf && free.every(u => laneOf.has(u.rep.from)) && new Set(free.map(u => laneOf.get(u.rep.from))).size === 1;
      const s = free.length * (markedAt(free[0].rep, k[0] === 'i' ? 'to' : 'from') ? 2 : 1) + (shared ? LANE_FAN_IN : 0);
      if (!best || s > best.s || (s === best.s && k < best.k)) best = {k, s, free};
    }
    if (!best) break;
    for (const u of best.free) taken.add(u);
    groups.delete(best.k);
    const end = best.k[0] === 'i' ? 'to' : 'from', e = best.free[0].rep;
    out.push({key: best.k, end, units: best.free, node: end === 'to' ? e.to : e.from, face: end === 'to' ? e._fb : e._fa});
  }
  for (const u of units) if (u.edges.length > 1 && !taken.has(u)) out.push({key: u.key, end: 'both', units: [u]});
  const ids = new Set();
  for (const b of out) {
    let id = 'line:' + shortHash(b.key), n = 2; while (ids.has(id)) id = 'line:' + shortHash(b.key) + '-' + n++;
    ids.add(id); b.id = id;
    for (const u of b.units) for (const e of u.edges) { e._bundle = b; e._unit = u; }
  }
  for (const u of units) for (const e of u.edges) e._unit ||= u;
  return out;
}
// An event's or a gateway's name stands under its symbol: the router avoids it, labels keep off it.
const captionBoxes = (D, P) => D.nodes.filter(captioned).map(n => P.get(n.id)).filter(Boolean).map(b => ({x: b.x + b.w / 2 - 65, y: b.y + b.h + 2, w: 130, h: CAPTION_H - 2}));
// The words of a container's header: the title at the left, the sub-line at the right when it fits.
export const groupTitleWidth = g => Math.round(charW(g.title || '', 12) * 1.1 + 24);
export const groupSubWidth = g => (g.sub ? Math.round(charW(g.sub, 10) + 20) : 0);
export const groupSubShown = g => !!g.sub && g.w >= groupTitleWidth(g) + groupSubWidth(g) + 12;
const headerBoxes = g => { const h = Math.min(NL.GHEAD, g.h), out = [{x: g.x, y: g.y, w: Math.min(g.w, groupTitleWidth(g)), h}]; if (groupSubShown(g)) { const w = groupSubWidth(g); out.push({x: g.x + g.w - w, y: g.y, w, h}); } return out; };
const simplify = pts => { const out = [pts[0]]; for (let i = 1; i < pts.length - 1; i++) { const [x0, y0] = out[out.length - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; if ((x0 === x1 && x1 === x2) || (y0 === y1 && y1 === y2)) continue; out.push(pts[i]); } out.push(pts[pts.length - 1]); return out; };
// A step that a snap left diagonal is squared: at the first point it runs along the first point's line, elsewhere it
// keeps the line it came in on and turns at the next point's.
const square = arr => { const o = [arr[0]]; for (let i = 1; i < arr.length; i++) { const [x0, y0] = o[o.length - 1], [x1, y1] = arr[i]; if (x0 !== x1 && y0 !== y1) o.push(i === 1 ? [x1, y0] : [x0, y1]); o.push(arr[i]); } return simplify(o); };
// Ports meet routes (round 10, the jog fix). A route is searched on cell centres (`mid`), but its port stands where
// portsOf spreads it along the face, up to half a cell off that centre line. Before round 10 only the first and last
// route points moved onto the port, so the rest of the run stayed on the cell centre and a straight drop was drawn as
// a stair of 1–4 px jogs (72% of routed connectors carried one). `whole`: the whole straight run that leaves the port
// (the points that share the first point's column, for a top or bottom face, or its row, for a side) moves onto the
// port's line, and so does the whole run that enters the far port; a route that is one straight run between two
// offset ports keeps a single jog, half way. The move never leaves the run's own column or row of cells, so the route
// keeps its topology. `whole` false is the round-9 snap, kept for an edge whose moved run would enter an element it
// does not join or run on another connector (routeAll reverts that edge alone and records it in L.snapReverted).
// `wholeB` (round 10) may differ from `wholeA`: a bundle member keeps its shared run whole (its trunk lies on the shared
// port's line, as every other member's does) when only its far end must keep the round-9 snap.
const WOBBLE = 4; // px: a link shorter than this between two port runs is a wobble, not a step (routeAll straighten)
function snapRoute(path, pa, pb, vA, vB, wholeA, wholeB = wholeA) {
  const mid = path.map(p => p.slice()), n = mid.length, onto = (p, v, q) => { if (v) p[0] = q[0]; else p[1] = q[1]; };
  const nineA = () => { const first = mid[0]; if (vA) { first[0] = pa[0]; if (n > 1 && mid[1][1] !== first[1]) mid[1][0] = pa[0]; } else { first[1] = pa[1]; if (n > 1 && mid[1][0] !== first[0]) mid[1][1] = pa[1]; } };
  const nineB = () => { const last = mid[n - 1]; if (vB) { last[0] = pb[0]; if (n > 1 && mid[n - 2][1] !== last[1]) mid[n - 2][0] = pb[0]; } else { last[1] = pb[1]; if (n > 1 && mid[n - 2][0] !== last[0]) mid[n - 2][1] = pb[1]; } };
  if (wholeA || wholeB) {
    let ia = 0; while (ia + 1 < n && (vA ? mid[ia + 1][0] === mid[0][0] : mid[ia + 1][1] === mid[0][1])) ia++;
    let ib = n - 1; while (ib > 0 && (vB ? mid[ib - 1][0] === mid[n - 1][0] : mid[ib - 1][1] === mid[n - 1][1])) ib--;
    if (wholeA && wholeB && ia >= ib && vA === vB && (vA ? pa[0] !== pb[0] : pa[1] !== pb[1])) { const h = Math.floor((ia + ib) / 2); for (let i = 0; i < n; i++) onto(mid[i], vA, i <= h ? pa : pb); }
    else { if (wholeA) for (let i = 0; i <= ia; i++) onto(mid[i], vA, pa); else nineA(); if (wholeB) for (let i = ib; i < n; i++) onto(mid[i], vB, pb); else nineB(); }
  } else { nineA(); nineB(); }
  return square(simplify([pa, ...mid, pb].map(([x, y]) => [Math.round(x), Math.round(y)])));
}
function routeAll(D, nodes, groups, edges, W, H, {straight = false, way = new Map(), direct = false, cell = null, heads = [], laneOf = null, trunks = null, bundle = false, fans = true, banned = new Set(), prev = null, repair = new Set(), hard = new Set(), declareOnly = false, scratch = null, ownGrid = false, heuristic = 12} = {}) {
  // The closed strips: each container's header words and (rc40, W1) each lane's or level band's title and aspect
  // headers (`heads`), so a line never runs over a title.
  const P = byId(nodes), headers = [...groups.flatMap(headerBoxes), ...heads];
  // The grid is made when the first connector needs a search: a picture drawn straight never does (round 5, scale; the
  // data picture of a 500-record project is 136,363 px square, a grid of 129 million cells).
  let grid = null, c = 0;
  let doorsOf = null;
  // The passes of one layout (round 10) route the same page: they share its grid, cleared of routes (the control keeps its
  // own), and the search tables.
  const gridOf = () => {
    if (grid) return grid;
    const key = W + '|' + H + '|' + cell;
    if (scratch?.grid && scratch.key === key && !ownGrid) { grid = scratch.grid; for (const a of [grid.uh, grid.uv, grid.bh, grid.bv, grid.door, grid.pref]) a.fill(0); grid.member = false; grid.hard = false; grid.dotted = false; }
    else { grid = makeGrid(W, H, nodes, headers, captionBoxes(D, P), cell); if (scratch && !ownGrid) Object.assign(scratch, {grid, key}); }
    if (scratch) { const n = grid.cols * grid.rows * 4; if (scratch.tables?.n !== n) scratch.tables = {n, gen: 0}; grid.tables = scratch.tables; }
    c = grid.c; grid.heuristic = heuristic; if (doorsOf) doorsOf(); return grid;
  };
  const cellOf = ([x, y]) => [Math.max(0, Math.min(grid.cols - 1, Math.floor(x / c))), Math.max(0, Math.min(grid.rows - 1, Math.floor(y / c)))];
  const out = [];
  const crossesBox = (x1, y1, x2, y2, b, m = 3) => Math.min(x1, x2) < b.x + b.w - m && Math.max(x1, x2) > b.x + m && Math.min(y1, y2) < b.y + b.h - m && Math.max(y1, y2) > b.y + m;
  const clearStraight = (a, b, pts) => { for (let i = 1; i < pts.length; i++) { const [x1, y1] = pts[i - 1], [x2, y2] = pts[i]; for (const n of nodes) if (n.id !== a.id && n.id !== b.id && crossesBox(x1, y1, x2, y2, n)) return false; } return true; };
  // (rc41, W1: a line drawn without a search keeps off the closed strips too — a lane's or a level band's title and the
  // aspect headers, a container's header words — or it is searched, as the Diagram's lines are: no line over a title)
  const clearHeads = pts => { for (let i = 1; i < pts.length; i++) { const [x1, y1] = pts[i - 1], [x2, y2] = pts[i]; for (const h of headers) if (crossesBox(x1, y1, x2, y2, h, 0)) return false; } return true; };
  // The elements a route enters by more than 1 px (the margin diagramMetrics counts a through-pass at), other than its own two.
  // (rc41, W1: and the closed strips — a lane's or a band's title, the aspect headers, a container's header words — so a
  // run the port snap or a straightening moves whole never lands over a title; the search itself keeps off them)
  const foreignHits = (a, b, pts) => { const ids = []; for (const n of nodes) { if (n.id === a.id || n.id === b.id) continue; for (let i = 1; i < pts.length; i++) if (crossesBox(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], n, 1)) { ids.push(n.id); break; } } for (let h = 0; h < headers.length; h++) for (let i = 1; i < pts.length; i++) if (crossesBox(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], headers[h], 0)) { ids.push('\u0003head:' + h); break; } return ids; };
  // The axis-parallel runs drawn so far, by the line they lie on, so a moved run can ask whether it runs on another
  // connector: two connectors on one line for more than 6 px, a shared run as diagramMetrics counts it. Two members of
  // one declared bundle share their trunk by design and are not counted (round 10).
  const drawn = new Map(), lineOf = (p, q) => (p[1] === q[1] ? 'h' + p[1] : p[0] === q[0] ? 'v' + p[0] : null);
  const runsOf = pts => { const r = []; for (let i = 1; i < pts.length; i++) { const k = lineOf(pts[i - 1], pts[i]); if (!k) continue; const ax = k[0] === 'h' ? 0 : 1; r.push([k, Math.min(pts[i - 1][ax], pts[i][ax]), Math.max(pts[i - 1][ax], pts[i][ax])]); } return r; };
  // (by the connectors' own records, which keep their bundle after the routes are cleaned up for the caller)
  const bundleOf = x => (x ? (x._bundle || edgeOf.get(x.id)?._bundle) : null), sameBundle = (o, self) => { const b = bundleOf(self); return !!(b && bundleOf(o) === b); };
  const sharedRuns = (pts, self = null) => { let n = 0; for (const [k, lo, hi] of runsOf(pts)) for (const [l, h, o] of drawn.get(k) || []) if (o !== self && !sameBundle(o, self) && Math.min(hi, h) - Math.max(lo, l) > 6) n++; return n; };
  const draw = o => { for (const [k, lo, hi] of runsOf(o.pts)) { if (!drawn.has(k)) drawn.set(k, []); drawn.get(k).push([lo, hi, o]); } };
  const undraw = o => { for (const [k] of runsOf(o.pts)) drawn.set(k, drawn.get(k).filter(r => r[2] !== o)); };
  // Each routed connector's round-9 route, for the pass that gives it back (below).
  const snapReverted = new Set(), round9 = new Map();
  const dist = e => { const a = P.get(e.from), b = P.get(e.to); return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); };
  const order = edges.slice().sort((p, q) => dist(p) - dist(q) || String(p.id).localeCompare(String(q.id))), edgeOf = new Map(order.map(e => [e.id, e]));
  const capIds = new Set(D.nodes.filter(captioned).map(n => n.id));
  const declared = portsOf(nodes, order, capIds, {bundle: bundle && !straight, fans, banned, laneOf});
  // Only the declaration (round 10, routeConsolidated asks whether there is anything to bundle).
  if (declareOnly) return {edges: [], snapReverted: [], declared, routes: new Map()};
  // The way into every port, which a bundle member keeps off (astar).
  const doorCell = (pt, f) => { const [x, y] = cellOf(pt), [cx, cy] = f === 'bottom' ? [x, y + 1] : f === 'top' ? [x, y - 1] : f === 'right' ? [x + 1, y] : [x - 1, y]; return cx >= 0 && cy >= 0 && cx < grid.cols && cy < grid.rows ? cy * grid.cols + cx : -1; };
  if (declared.length) doorsOf = () => { for (const e of order) for (const [pt, f] of [[e._pa, e._fa], [e._pb, e._fb]]) { if (!pt || !f) continue; const k = doorCell(pt, f); if (k >= 0) grid.door[k] |= f === 'top' || f === 'bottom' ? 1 : 2; } };
  const port0 = new Map(order.map(e => [e.id, [e._pa ? e._pa.slice() : null, e._pb ? e._pb.slice() : null]]));
  // The routing sequence (round 10): a bundle is routed together, where its first member would be, its farthest member
  // first, so the nearer ones follow the trunk it lays; a fact recorded more than once is routed once and its other
  // records take that route.
  let seq = order;
  if (declared.length) { const seen = new Set(); seq = []; for (const e of order) { const u = e._unit; if (u && u.edges.length > 1 && e !== u.rep) continue; const b = e._bundle; if (!b) { seq.push(e); continue; } if (seen.has(b)) continue; seen.add(b); seq.push(...b.units.map(x => x.rep).sort((p, q) => dist(q) - dist(p) || String(p.id).localeCompare(String(q.id)))); } }
  // A line re-routed off a trunk is routed last, once the trunks it must keep off are drawn.
  const last = e => repair.has(e.id) || hard.has(e.id);
  if (repair.size || hard.size) seq = [...seq.filter(e => !last(e)), ...seq.filter(last)];
  // Every port on each face, so a port that slides to straighten a wobble keeps clear of the others.
  const faceKey = (id, f) => id + '|' + f, onFace = new Map();
  for (const e of order) for (const [id, f] of [[e.from, e._fa], [e.to, e._fb]]) { if (!f) continue; const k = faceKey(id, f); if (!onFace.has(k)) onFace.set(k, []); onFace.get(k).push(e); }
  const portOf = (o, id, f) => (o.from === id && o._fa === f ? o._pa : o._pb);
  const unitMate = (o, e) => !!(e._unit && e._unit.edges.length > 1 && o._unit === e._unit);
  // A wobble between two offset ports (round 10): a route that is one run out of a port, a link shorter than WOBBLE and
  // one run on in the same direction into the far port (two ports less than WOBBLE apart across the line, which the
  // single jog of snapRoute would draw as a 1–3 px step) becomes one straight segment: one port slides along its face
  // onto the other port's line. A port slides only on a rectangle (an event's circle and a gateway's diamond keep
  // theirs), stays at least 6 px inside its face and at least WOBBLE from every other port on that face (so the ports
  // keep their order and never meet), and the line it makes enters no element and runs on no connector already drawn.
  // The end whose face holds fewer ports slides first; when neither may, the route keeps its jog. A bundle's shared
  // port never slides (`fixed`: 'from', 'to' or 'both'); a port that two records of one fact hold slides for both.
  const straighten = (e, a, b, pts, fixed = null) => {
    if (pts.length !== 4 || e.from === e.to) return pts;
    const [p0, p1, p2, p3] = pts, vertical = p0[0] === p1[0] && p2[0] === p3[0] && p1[1] === p2[1], horizontal = p0[1] === p1[1] && p2[1] === p3[1] && p1[0] === p2[0];
    if (!vertical && !horizontal) return pts;
    const ax = vertical ? 0 : 1, nx = 1 - ax, link = Math.abs(p2[ax] - p1[ax]), dir = Math.sign(p1[nx] - p0[nx]);
    if (!link || link >= WOBBLE || !dir || dir !== Math.sign(p3[nx] - p2[nx])) return pts;
    const ends = [['to', b, e._fb, p0[ax]], ['from', a, e._fa, p3[ax]]].sort((x, y) => onFace.get(faceKey(x[1].id, x[2])).length - onFace.get(faceKey(y[1].id, y[2])).length);
    let before = null;
    for (const [end, box, face, want] of ends) {
      if (fixed === end || fixed === 'both') continue;
      if (capIds.has(box.id) || (face === 'top' || face === 'bottom') !== vertical) continue;
      if (want < (vertical ? box.x : box.y) + 6 || want > (vertical ? box.x + box.w : box.y + box.h) - 6) continue;
      if (onFace.get(faceKey(box.id, face)).some(o => o !== e && !unitMate(o, e) && Math.abs(portOf(o, box.id, face)[ax] - want) < WOBBLE)) continue;
      const moved = end === 'to' ? p3.slice() : p0.slice(); moved[ax] = want;
      const line = end === 'to' ? [p0, moved] : [moved, p3];
      before ||= new Set(foreignHits(a, b, pts));
      if (foreignHits(a, b, line).some(id => !before.has(id)) || sharedRuns(line, e) > sharedRuns(pts, e)) continue;
      (end === 'to' ? e._pb : e._pa)[ax] = want;
      return line;
    }
    return pts;
  };
  // A later pass (round 10, routeConsolidated) keeps every route whose two ports and bundle are unchanged and that is not
  // being repaired, with the cells it holds; a bundle, and a fact's records, are kept whole or routed again whole.
  const kept = new Set(), own = new Map(), stems = new Map(), routes = new Map(), samePt = (p, q) => (!p && !q) || (!!p && !!q && p[0] === q[0] && p[1] === q[1]);
  if (prev) {
    for (const e of seq) { const p = prev.get(e.id), [pa, pb] = port0.get(e.id); if (p && !repair.has(e.id) && samePt(p.pa0, pa) && samePt(p.pb0, pb) && p.key === (e._bundle ? e._bundle.key : null)) kept.add(e.id); }
    for (const e of order) { const u = e._unit; if (u && u.edges.length > 1 && !u.edges.every(x => { const p = prev.get(x.id), [pa, pb] = port0.get(x.id); return p && samePt(p.pa0, pa) && samePt(p.pb0, pb); })) kept.delete(u.rep.id); }
    for (const b of declared) { const reps = b.units.map(u => u.rep); if (!reps.every(x => kept.has(x.id))) for (const x of reps) kept.delete(x.id); }
    if (kept.size) {
      gridOf();
      for (const e of seq) {
        if (!kept.has(e.id)) continue;
        const p = prev.get(e.id);
        for (const k of p.cells) { const cc = k >> 1; (k & 1 ? grid.uh : grid.uv)[cc]++; if (e._bundle) (k & 1 ? grid.bh : grid.bv)[cc]++; }
        if (e._bundle) { if (!own.has(e._bundle)) own.set(e._bundle, []); own.get(e._bundle).push(...p.cells); }
        // A port it slid stays slid (in place: the records of one fact hold one port).
        if (e._pa && p.pa) { e._pa[0] = p.pa[0]; e._pa[1] = p.pa[1]; } if (e._pb && p.pb) { e._pb[0] = p.pb[0]; e._pb[1] = p.pb[1]; }
      }
    }
  }
  // One connector's route (round 10: the loop below, and a line re-routed off a trunk in place, `reroute`): the search
  // between its ports, the snap onto them and the straightening; it marks the cells it takes.
  const routeOne = (e, hardCost) => {
    gridOf();
    const a = P.get(e.from), b = P.get(e.to), pa = e._pa, pb = e._pb, ca = cellOf(pa), cb = cellOf(pb);
    // The first cell outside each port is open even where the box closes it.
    const stepOut = (cell, face) => (face === 'bottom' ? [cell[0], cell[1] + 1] : face === 'top' ? [cell[0], cell[1] - 1] : face === 'right' ? [cell[0] + 1, cell[1]] : [cell[0] - 1, cell[1]]);
    const sa = stepOut(ca, e._fa), sb = stepOut(cb, e._fb);
    const clampCell = ([x, y]) => [Math.max(0, Math.min(grid.cols - 1, x)), Math.max(0, Math.min(grid.rows - 1, y))];
    const s0 = clampCell(sa), s1 = clampCell(sb), openA = s0[1] * grid.cols + s0[0], openB = s1[1] * grid.cols + s1[0];
    // The planned corridor (the dummy nodes the edge was ordered through) is the cheap way across.
    const stops = [s0, ...(way.get(e.id) || []).map(cellOf), s1], corridor = [];
    for (let i = 1; i < stops.length; i++) { const [x0, y0] = stops[i - 1], [x1, y1] = stops[i]; for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) corridor.push(y * grid.cols + x0); for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) corridor.push(y1 * grid.cols + x); }
    for (const c of corridor) grid.pref[c] = 1;
    // A bundle member (round 10) runs cheaply on the cells its bundle already holds (and they do not count as another
    // route's), dearly along any other route; every other line keeps off a bundle's cells, a repaired one at all costs.
    const bu = e._bundle, sharedEnd = bu ? bu.end : null, mine = bu ? own.get(bu) || [] : [];
    for (const k of mine) { const cc = k >> 1; grid.pref[cc] = 1; (k & 1 ? grid.uh : grid.uv)[cc]--; (k & 1 ? grid.bh : grid.bv)[cc]--; }
    grid.member = !!bu; grid.hard = hardCost; grid.dotted = !!bu && bu.end !== 'both' && !undotted(e.kind);
    // A fan leaves its shared element by one stem, so its members share a root: the first member routed takes up to STEM
    // open cells straight out (fewer where a box or a title closes them), and every later member the STEM cells the
    // first one took out of the port, whichever way they turn.
    const face = sharedEnd === 'from' ? e._fa : sharedEnd === 'to' ? e._fb : null, other = sharedEnd === 'from' ? s1 : s0;
    let stem = [];
    if (face && stems.has(bu)) stem = stems.get(bu).map(p => p.slice());
    else if (face) {
      const [dx, dy] = {bottom: [0, 1], top: [0, -1], right: [1, 0], left: [-1, 0]}[face], st = sharedEnd === 'from' ? s0 : s1;
      for (let k = 1; k <= BUNDLE.STEM; k++) { const x = st[0] + dx * k, y = st[1] + dy * k; if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows || grid.blocked[y * grid.cols + x]) break; stem.push([x, y]); }
    }
    if (stem.some(p => p[0] === other[0] && p[1] === other[1])) stem = [];
    const from = sharedEnd === 'from' && stem.length ? stem[stem.length - 1] : s0, to = sharedEnd === 'to' && stem.length ? stem[stem.length - 1] : s1;
    let path = null;
    // Near first, then wider, then the whole page; a route that still finds no way may cross a
    // container's title strip (never an element) before it is given up as a marked straight line.
    const xs = stops.map(s => s[0]), ys = stops.map(s => s[1]);
    // Behind a stem's outer cell the stem is closed to the search (the cell at the port and the stem's inner cells), so a
    // member joins its stem only at the outer end, never by crossing the port's own cell.
    const closed = [];
    if (stem.length) for (const [x, y] of [sharedEnd === 'from' ? s0 : s1, ...stem.slice(0, -1)]) { const k = y * grid.cols + x; closed.push([k, grid.blocked[k]]); grid.blocked[k] = 1; }
    const oa = stem.length && sharedEnd === 'from' ? -1 : openA, ob = stem.length && sharedEnd === 'to' ? -1 : openB;
    for (const [pad, headersOpen] of [[12, false], [48, false], [1e5, false], [1e5, true]]) { path = astar(grid, from, to, oa, ob, {x1: Math.min(...xs) - pad, x2: Math.max(...xs) + pad, y1: Math.min(...ys) - pad, y2: Math.max(...ys) + pad}, {headersOpen}); if (path) break; }
    for (const [k, v] of closed.reverse()) grid.blocked[k] = v;
    if (path && stem.length) path = unturn(sharedEnd === 'from' ? [s0, ...stem.slice(0, -1), ...path] : [...path, ...stem.slice(0, -1).reverse(), s1]);
    if (path && face && !stems.has(bu)) { const out1 = sharedEnd === 'from' ? path.slice(1, 1 + BUNDLE.STEM) : path.slice(-1 - BUNDLE.STEM, -1).reverse(); if (out1.length) stems.set(bu, out1); }
    for (const c of corridor) grid.pref[c] = 0;
    for (const k of mine) { const cc = k >> 1; grid.pref[cc] = 0; (k & 1 ? grid.uh : grid.uv)[cc]++; (k & 1 ? grid.bh : grid.bv)[cc]++; }
    grid.member = false; grid.hard = false; grid.dotted = false;
    let pts, through = false, kept9 = null, reverted = false; const cells = [];
    if (path) {
      for (let i = 0; i < path.length; i++) { const [x, y] = path[i], cc = y * grid.cols + x; const horizontal = i > 0 ? path[i][1] === path[i - 1][1] : i + 1 < path.length ? path[i + 1][1] === y : true; (horizontal ? grid.uh : grid.uv)[cc]++; if (bu) (horizontal ? grid.bh : grid.bv)[cc]++; cells.push(cc * 2 + (horizontal ? 1 : 0)); }
      if (bu) { if (!own.has(bu)) own.set(bu, []); own.get(bu).push(...cells); }
      const mid = path.map(([x, y]) => [x * c + c / 2, y * c + c / 2]), vA = e._fa === 'top' || e._fa === 'bottom', vB = e._fb === 'top' || e._fb === 'bottom';
      // The runs at both ports move whole onto the port's line. A moved run leaves the cell centre, so it may now enter an
      // element it does not join by more than 1 px (the cells are closed only 2 px inside a box): when the whole snap
      // enters an element the round-9 snap does not, this edge alone keeps the round-9 snap and is recorded. A fan
      // member first keeps its shared run whole and only its far end at the round-9 snap.
      // The round-9 snap is made when it is asked for (a revert, the shared-run pass), from the ports as they are now.
      const paNow = pa.slice(), pbNow = pb.slice(); let nine = null; kept9 = () => (nine ||= snapRoute(mid, paNow, pbNow, vA, vB, false));
      pts = snapRoute(mid, pa, pb, vA, vB, true);
      const entered = foreignHits(a, b, pts);
      if (entered.length) {
        const before = new Set(foreignHits(a, b, kept9()));
        if (entered.some(id => !before.has(id))) {
          let half = null;
          if (sharedEnd === 'from' || sharedEnd === 'to') { half = snapRoute(mid, pa, pb, vA, vB, sharedEnd === 'from', sharedEnd === 'to'); if (foreignHits(a, b, half).some(id => !before.has(id))) half = null; }
          pts = half || kept9(); reverted = true;
        }
      }
      if (!reverted) pts = straighten(e, a, b, pts, sharedEnd);
      through = !clearStraight(a, b, pts);
    } else { pts = [pa, pb]; through = true; }
    return {pts, through, kept9, reverted, cells};
  };
  for (const e of seq) {
    const a = P.get(e.from), b = P.get(e.to);
    if (kept.has(e.id)) {
      const p = prev.get(e.id), o = {...e, pts: p.pts.map(q => q.slice()), through: p.through}; out.push(o); draw(o); routes.set(e.id, p);
      if (p.reverted) snapReverted.add(e.id); else if (p.r9) round9.set(o, p.r9);
      continue;
    }
    if (straight) {
      const ac = {x: a.x + a.w / 2, y: a.y + a.h / 2}, bc = {x: b.x + b.w / 2, y: b.y + b.h / 2}, dx = bc.x - ac.x, dy = bc.y - ac.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      const clip = (box, sx, sy) => Math.min(box.w / 2 / Math.abs(sx || 1e-9), box.h / 2 / Math.abs(sy || 1e-9));
      const pts = [[ac.x + ux * clip(a, ux, uy), ac.y + uy * clip(a, ux, uy)], [bc.x - ux * clip(b, ux, uy), bc.y - uy * clip(b, ux, uy)]];
      if (clearStraight(a, b, pts)) { out.push({...e, pts: pts.map(([x, y]) => [Math.round(x), Math.round(y)]), through: false}); draw(out.at(-1)); continue; }
      // A very large picture (by layer) keeps its straight lines rather than searching a route for each.
      if (direct) { out.push({...e, pts: pts.map(([x, y]) => [Math.round(x), Math.round(y)]), through: true}); draw(out.at(-1)); continue; }
    }
    // A trunk member whose far element stands in the neighbouring row (rc40, W1: busWays `direct`) is drawn on its bus
    // without a search: out of its far port to the bus, along it to the shared port's line and in; its cells are taken
    // as a searched route's are, and the first member's steps out of the shared port are the bundle's stem.
    const t = trunks?.get(e.id), tb = e._bundle;
    let fixedPts = null;
    if (t && !straight && tb && tb.end === (t.kind === 'i' ? 'to' : 'from') && e._pa && e._pb && !last(e)) {
      // (integer coordinates, as every searched route has after its snap, so the members meet at one port)
      const pa = e._pa, pb = e._pb, shared = tb.end === 'to' ? pb : pa, far = tb.end === 'to' ? pa : pb, sx = Math.round(shared[0]), fx = Math.round(far[0]);
      if (Math.abs(fx - sx) < BUNDLE.JOIN_GAP + 2) {
        // The far element stands over the shared one: its port slides onto the trunk's line (inside its face, clear of
        // the face's other ports, as straighten slides a port) and the member is the trunk's straight line.
        const farId = tb.end === 'to' ? e.from : e.to, face = tb.end === 'to' ? e._fa : e._fb, box = P.get(farId);
        if (!capIds.has(farId) && sx >= box.x + 6 && sx <= box.x + box.w - 6 && !onFace.get(faceKey(farId, face)).some(o => o !== e && !unitMate(o, e) && Math.abs(portOf(o, farId, face)[0] - sx) < WOBBLE)) { far[0] = sx; fixedPts = [[sx, Math.round(pa[1])], [sx, Math.round(pb[1])]]; }
      } else {
        const y = fx > sx && t.y2 != null ? t.y2 : t.y;
        fixedPts = [[Math.round(pa[0]), Math.round(pa[1])], [Math.round(pa[0]), y], [Math.round(pb[0]), y], [Math.round(pb[0]), Math.round(pb[1])]];
      }
      // A member whose direct drawing would enter an element (one further off) or run over a title (rc41: a counted line
      // into a Layers lane's first row, under the lane's title) is searched instead, through the bus's point.
      if (fixedPts && ((!t.direct && !clearStraight(a, b, fixedPts)) || !clearHeads(fixedPts))) fixedPts = null;
    }
    if (fixedPts) {
      gridOf();
      const pa = e._pa, pb = e._pb, pts = fixedPts, cells = [];
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], horizontal = y0 === y1, [ca0, ra0] = cellOf([x0, y0]), [ca1, ra1] = cellOf([x1, y1]);
        if (horizontal) for (let x = Math.min(ca0, ca1); x <= Math.max(ca0, ca1); x++) cells.push((ra0 * grid.cols + x) * 2 + 1);
        else for (let y = Math.min(ra0, ra1); y <= Math.max(ra0, ra1); y++) cells.push((y * grid.cols + ca0) * 2);
      }
      for (const k of cells) { const cc = k >> 1; (k & 1 ? grid.uh : grid.uv)[cc]++; (k & 1 ? grid.bh : grid.bv)[cc]++; }
      if (!own.has(tb)) own.set(tb, []); own.get(tb).push(...cells);
      if (!stems.has(tb)) { const shared = tb.end === 'to' ? pb : pa, face = tb.end === 'to' ? e._fb : e._fa, [dx, dy] = {bottom: [0, 1], top: [0, -1], right: [1, 0], left: [-1, 0]}[face], [sx, sy] = cellOf(shared), stem = []; for (let k = 1; k <= BUNDLE.STEM; k++) stem.push([sx + dx * k, sy + dy * k]); stems.set(tb, stem); }
      const [pa0, pb0] = port0.get(e.id), o = {...e, pts, through: !clearStraight(a, b, pts)}; out.push(o); draw(o);
      routes.set(e.id, {pa0, pb0, pa: pa.slice(), pb: pb.slice(), key: tb.key, cells, pts, through: o.through, reverted: false, r9: null});
      continue;
    }
    const [pa0, pb0] = port0.get(e.id), r = routeOne(e, last(e)), bu = e._bundle;
    if (r.reverted) snapReverted.add(e.id);
    const o = {...e, pts: r.pts, through: r.through}; out.push(o); draw(o);
    if (r.kept9 && !r.reverted) round9.set(o, r.kept9);
    routes.set(e.id, {pa0, pb0, pa: e._pa.slice(), pb: e._pb.slice(), key: bu ? bu.key : null, cells: r.cells, pts: r.pts, through: r.through, reverted: r.reverted, r9: r.kept9 && !r.reverted ? r.kept9 : null});
  }
  // A moved run also leaves the cell centre the search kept apart from other routes, so it may come to run on another
  // connector for more than 6 px (two routes that shared cells a few px apart, or a corner contact made longer), in
  // either order of routing. Once every connector is drawn, each in routing order whose route shares more runs with the
  // others than its round-9 route would takes the round-9 route back and is recorded. Each change lowers the number of
  // shared runs, so one pass settles. A fan member keeps its route: its trunk is its bundle's, which the checks after
  // routing hold against every other line (consolidate).
  for (const [o, nine] of round9) {
    if (o._bundle && o._bundle.end !== 'both') continue;
    const now = sharedRuns(o.pts, o); if (!now) continue;
    const r9 = nine(); if (now <= sharedRuns(r9, o)) continue;
    undraw(o); o.pts = r9; o.through = !clearStraight(P.get(o.from), P.get(o.to), r9); draw(o); snapReverted.add(o.id);
    const p = routes.get(o.id); if (p) routes.set(o.id, {...p, pts: r9, through: o.through, reverted: true, r9: null});
  }
  // The other records of a fact take its route.
  for (const o of out.slice()) {
    const u = o._unit; if (!u || u.edges.length < 2 || u.rep.id !== o.id) continue;
    for (const d of u.edges) { if (d === u.rep) continue; out.push({...d, pts: o.pts.map(p => p.slice()), through: o.through}); if (snapReverted.has(o.id)) snapReverted.add(d.id); const [pa0, pb0] = port0.get(d.id); routes.set(d.id, {...routes.get(o.id), pa0, pb0, cells: []}); }
  }
  for (const e of out) { e.portIndex = e._pi || 0; delete e._pa; delete e._pb; delete e._fa; delete e._fb; delete e._pi; delete e._bundle; delete e._unit; }
  const routed = new Map(); for (const o of out) if (!routed.has(o.id)) routed.set(o.id, o);
  // A line outside every bundle that the checks found along, at or on a trunk (round 10, routeConsolidated) is routed
  // again at once, on this pass's grid with every trunk drawn, keeping off bundle cells at all costs (BUNDLE.HARD).
  const reroutable = id => { const e = edgeOf.get(id); return !!(e && grid && !straight && routes.has(id) && !e._bundle && !(e._unit && e._unit.edges.length > 1)); };
  const reroute = id => {
    if (!reroutable(id)) return false;
    const e = edgeOf.get(id), o = routed.get(id), p = routes.get(id);
    undraw(o); for (const k of p.cells) (k & 1 ? grid.uh : grid.uv)[k >> 1]--;
    const r = routeOne(e, true); let {pts, through, reverted} = r;
    if (r.kept9 && !reverted) { const now = sharedRuns(pts, o); if (now && now > sharedRuns(r.kept9(), o)) { pts = r.kept9(); through = !clearStraight(P.get(e.from), P.get(e.to), pts); reverted = true; } }
    o.pts = pts; o.through = through; draw(o);
    if (reverted) snapReverted.add(id); else snapReverted.delete(id);
    routes.set(id, {...p, pa: e._pa.slice(), pb: e._pb.slice(), cells: r.cells, pts, through, reverted, r9: r.kept9 && !reverted ? r.kept9 : null});
    return true;
  };
  // The cells under a route moved after its search (each cell once, with the way it is travelled, as the search lists them).
  const cellsAlong = pts => { const out = []; for (let i = 1; i < pts.length; i++) { const [x1, y1] = pts[i - 1], [x2, y2] = pts[i], hz = y1 === y2; if (!hz && x1 !== x2) continue; const [a, b] = cellOf([x1, y1]), [p, q] = cellOf([x2, y2]); if (hz) for (let x = Math.min(a, p); x <= Math.max(a, p); x++) out.push((b * grid.cols + x) * 2 + 1); else for (let y = Math.min(b, q); y <= Math.max(b, q); y++) out.push((y * grid.cols + a) * 2); } return out; };
  // A member's run slid (the round-10 review, consolidate's join-gap): the vertex `j` of the route of `id` moves to
  // `k` (one axis apart), carrying the run at `j` that lies across that axis, so two members leave the trunk at one
  // point rather than a step apart (the run of one meets the trunk at the other's corner), or a run that stepped off
  // the trunk to run beside it closes the step and rides the trunk on. The move holds only when the run keeps off both
  // ports, no segment turns round (one may close up), the route enters no element it did not enter before and runs on
  // no other connector;
  // the other records of the member's fact move with it. Returns what undoes the move (routeConsolidated keeps a slide
  // only when the bundle then passes, or can slide on), or false.
  const align = (id, j, k) => {
    const o = routed.get(id), e = edgeOf.get(id), p = routes.get(id); if (!o || !e || !p || straight || !grid) return false;
    const pts = o.pts.map(q => q.slice()), i = pts.findIndex(q => q[0] === j[0] && q[1] === j[1]); if (i < 0) return false;
    const t = k[0] !== j[0] ? 0 : 1; if (k[1 - t] !== j[1 - t] || k[t] === j[t]) return false;
    // The run at j across the trunk, before j or after it (the other neighbour runs along the trunk).
    const across = n => n >= 0 && n < pts.length && pts[n][t] === j[t] && pts[n][1 - t] !== j[1 - t];
    const c = across(i - 1) ? i - 1 : across(i + 1) ? i + 1 : -1; if (c < 0) return false;
    const n = c + (c - i), m = i - (c - i);
    if (n < 0 || n >= pts.length || m < 0 || m >= pts.length) return false;
    const turns = q => Math.sign(pts[q][t] - k[t]) === -Math.sign(pts[q][t] - j[t]) && pts[q][t] !== k[t];
    if (turns(n) || turns(m)) return false;
    pts[i][t] = k[t]; pts[c][t] = k[t];
    const next = cleanPoly(pts), a = P.get(e.from), b = P.get(e.to); if (next.length < 2) return false;
    const before = new Set(foreignHits(a, b, o.pts)); if (foreignHits(a, b, next).some(x => !before.has(x))) return false;
    const mates = e._unit && e._unit.edges.length > 1 ? e._unit.edges.map(x => routed.get(x.id)).filter(x => x && x !== o) : [];
    undraw(o); for (const x of mates) undraw(x);
    if (sharedRuns(next, o) > sharedRuns(o.pts, o)) { draw(o); for (const x of mates) draw(x); return false; }
    for (const cc of p.cells) (cc & 1 ? grid.uh : grid.uv)[cc >> 1]--;
    const cells = cellsAlong(next); for (const cc of cells) (cc & 1 ? grid.uh : grid.uv)[cc >> 1]++;
    const through = !clearStraight(a, b, next), was = {pts: o.pts, through: o.through, route: p, mates: mates.map(x => [x, x.pts, x.through, routes.get(x.id)])};
    o.pts = next; o.through = through; draw(o); routes.set(id, {...p, pts: next, through, cells, r9: null});
    for (const x of mates) { x.pts = next.map(q => q.slice()); x.through = through; draw(x); const px = routes.get(x.id); if (px) routes.set(x.id, {...px, pts: x.pts, through, r9: null}); }
    return () => {
      undraw(o); for (const [x] of was.mates) undraw(x);
      for (const cc of cells) (cc & 1 ? grid.uh : grid.uv)[cc >> 1]--; for (const cc of p.cells) (cc & 1 ? grid.uh : grid.uv)[cc >> 1]++;
      o.pts = was.pts; o.through = was.through; draw(o); routes.set(id, was.route);
      for (const [x, pts, thr, px] of was.mates) { x.pts = pts; x.through = thr; draw(x); if (px) routes.set(x.id, px); }
    };
  };
  const snapRevertedNow = () => edges.filter(e => snapReverted.has(e.id)).map(e => e.id);
  return {edges: edges.map(e => routed.get(e.id)), snapReverted: snapRevertedNow(), declared, routes, reroutable, reroute, align, snapRevertedNow};
}
// A route that a stem joins can double back along it: the back-and-forth is removed (a cell visited, left and visited
// again at once).
const unturn = path => { const o = []; for (const p of path) { if (o.length >= 2 && o[o.length - 2][0] === p[0] && o[o.length - 2][1] === p[1]) { o.pop(); continue; } if (o.length && o[o.length - 1][0] === p[0] && o[o.length - 1][1] === p[1]) continue; o.push(p); } return o; };

// ---------------------------------------------------------------- bundle checks (round 10)
// Routes in a routed picture are integer and axis-aligned (snapRoute), so lengths along them are exact.
const segLen = (a, b) => Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
const polyLen = Q => { let t = 0; for (let i = 1; i < Q.length; i++) t += segLen(Q[i - 1], Q[i]); return t; };
const dirOf = (a, b) => (b[0] > a[0] ? 0 : b[1] > a[1] ? 1 : b[0] < a[0] ? 2 : b[1] < a[1] ? 3 : -1);
const stepAlong = (p, d, s) => [p[0] + [s, 0, -s, 0][d], p[1] + [0, s, 0, -s][d]];
const segsOf = Q => { const o = []; for (let i = 1; i < Q.length; i++) if (segLen(Q[i - 1], Q[i])) o.push([Q[i - 1], Q[i]]); return o; };
const lineKey = ([[x1, y1], [x2, y2]]) => (y1 === y2 ? 'h' + y1 : x1 === x2 ? 'v' + x1 : null);
const spanOf = ([[x1, y1], [x2, y2]]) => (y1 === y2 ? [Math.min(x1, x2), Math.max(x1, x2)] : [Math.min(y1, y2), Math.max(y1, y2)]);
const overlapOf = (s, t) => { const k = lineKey(s); if (!k || k !== lineKey(t)) return 0; const [a, b] = spanOf(s), [c, d] = spanOf(t); return Math.min(b, d) - Math.max(a, c); };
const distToSeg = ([px, py], [[x1, y1], [x2, y2]]) => { const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2)) : 0; return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)); };
const samePts = (A, B) => A.length === B.length && A.every((p, i) => p[0] === B[i][0] && p[1] === B[i][1]);
// The sides of a box a route runs along: a run parallel to a side, outside the box within BUNDLE.HUG px of it, for at least
// BUNDLE.HUG_RUN px of the side's own span. A run that leaves a port stands square to its face and across no side, so a
// fan's stem and trunk (BUNDLE.STEM cells out) count no side; a route round a corner of the box counts two.
function hugs(Q, b, hug = BUNDLE.HUG, run = BUNDLE.HUG_RUN) {
  const sides = new Set();
  for (const [[x1, y1], [x2, y2]] of segsOf(Q)) {
    if (y1 === y2) { if (Math.min(Math.max(x1, x2), b.x + b.w) - Math.max(Math.min(x1, x2), b.x) < run) continue; if (y1 <= b.y && b.y - y1 <= hug) sides.add('top'); else if (y1 >= b.y + b.h && y1 - b.y - b.h <= hug) sides.add('bottom'); }
    else if (x1 === x2) { if (Math.min(Math.max(y1, y2), b.y + b.h) - Math.max(Math.min(y1, y2), b.y) < run) continue; if (x1 <= b.x && b.x - x1 <= hug) sides.add('left'); else if (x1 >= b.x + b.w && x1 - b.x - b.w <= hug) sides.add('right'); }
  }
  return [...sides];
}
// Without repeated or straight-through points, so two routes compare by shape.
const cleanPoly = Q => simplify(Q.filter((p, i) => !i || p[0] !== Q[i - 1][0] || p[1] !== Q[i - 1][1]));
// The length two routes from one start run together before they part.
function commonPrefix(A, B) {
  if (A[0][0] !== B[0][0] || A[0][1] !== B[0][1]) return 0;
  let i = 1, j = 1, cur = A[0], t = 0;
  while (i < A.length && j < B.length) {
    if (!segLen(cur, A[i])) { i++; continue; } if (!segLen(cur, B[j])) { j++; continue; }
    const da = dirOf(cur, A[i]), db = dirOf(cur, B[j]); if (da !== db) break;
    const ra = segLen(cur, A[i]), rb = segLen(cur, B[j]), s = Math.min(ra, rb);
    cur = stepAlong(cur, da, s); t += s; if (ra === s) i++; if (rb === s) j++;
  }
  return t;
}
// The part of a route between two lengths along it.
function slicePoly(Q, t0, t1) {
  const o = []; let t = 0;
  for (let i = 1; i < Q.length; i++) {
    const a = Q[i - 1], b = Q[i], l = segLen(a, b); if (!l) continue;
    const s0 = Math.max(t0, t), s1 = Math.min(t1, t + l);
    if (s1 > s0) { const d = dirOf(a, b), p0 = stepAlong(a, d, s0 - t), p1 = stepAlong(a, d, s1 - t); if (!o.length || o[o.length - 1][0] !== p0[0] || o[o.length - 1][1] !== p0[1]) o.push(p0); o.push(p1); }
    t += l; if (t >= t1) break;
  }
  return o.length > 2 ? simplify(o) : o;
}
// After routing: each declared bundle as a tree of runs from its shared port (each run with the members that travel
// it, oriented away from the shared end, `offset` its length from the port, `root` the run at the port, `far` a run
// that ends at its members' far element), a join where each branch leaves, and each member's own branch (in the
// route's own direction; empty when it ends on a run). A bundle is checked against everything bundleIntegrity
// (notation-metrics.mjs) holds: one port; no element crossed; no member along two sides of the shared element (hugs) or
// DETOUR times its control route; a root of at least BUNDLE.ROOT px; no member ending on another's route unless both are
// records of one fact; no two members running together again once they part; no four-way split where a T is required;
// no join within JOIN_ELEMENT px of an element, closer than JOIN_GAP px to another join or with a bend within JOIN_GAP px
// of it; and no foreign line along a run of two or more members, within JOIN_CLEAR px of a join, or with a point on such
// a run. A failure names the rule, the foreign line to re-route when there is one (a line outside every bundle, or one
// fact's first record), and the members to draw apart when the rest still make a bundle (at a join, the smallest party:
// a run that leaves it or a member whose own branch does).
// `meta` gives each bundle that holds its key and, with the control's route lengths (`length`), the ink it saves.
function consolidate(edges, declared, nodes, length = null) {
  const edgeOf = new Map(edges.map(e => [e.id, e])), index = new Map(edges.map((e, i) => [e.id, i])), nodeOf = byId(nodes);
  const memberOf = new Map(); for (const b of declared) for (const u of b.units) for (const e of u.edges) memberOf.set(e.id, {b, u});
  // Every route's segments by the line they lie on ('h' + y, 'v' + x) and its points by row and by column: routes are integer
  // and axis-aligned, so a line within JOIN_CLEAR px of a join lies on one of the lines around it and a point on a trunk
  // lies on the trunk's own line. A segment or a point off that grid (a route given up as a straight line) is read in full.
  const lines = new Map(), byRow = new Map(), byCol = new Map(), odd = [], oddPts = [], put = (M, k, v) => { const l = M.get(k); if (l) l.push(v); else M.set(k, [v]); };
  const whole = p => Number.isInteger(p[0]) && Number.isInteger(p[1]);
  for (const e of edges) {
    for (const s of segsOf(e.pts)) { const k = lineKey(s); if (k) put(lines, k, {e, s}); if (!k || !whole(s[0]) || !whole(s[1])) odd.push({e, s}); }
    for (const p of e.pts) if (whole(p)) { put(byRow, p[1], {e, p}); put(byCol, p[0], {e, p}); } else oddPts.push({e, p});
  }
  // The elements, in buckets of 128 px, for the question whether a member crosses one.
  const NG = 128, near = new Map(), cellsOf = (x1, y1, x2, y2) => { const o = []; for (let by = Math.floor(y1 / NG); by <= Math.floor(y2 / NG); by++) for (let bx = Math.floor(x1 / NG); bx <= Math.floor(x2 / NG); bx++) o.push(bx * 1e6 + by); return o; };
  for (const n of nodes) for (const k of cellsOf(n.x, n.y, n.x + n.w, n.y + n.h)) put(near, k, n);
  const enters = e => { for (const [[x1, y1], [x2, y2]] of segsOf(e.pts)) for (const k of cellsOf(Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2))) for (const n of near.get(k) || []) if (n.id !== e.from && n.id !== e.to && Math.min(x1, x2) < n.x + n.w - 1 && Math.max(x1, x2) > n.x + 1 && Math.min(y1, y2) < n.y + n.h - 1 && Math.max(y1, y2) > n.y + 1) return true; return false; };
  // The line to re-route off a bundle: one outside every bundle, or the first record of a fact drawn once.
  const reroutable = id => { const m = memberOf.get(id); return !m ? id : m.b.end === 'both' ? m.u.rep.id : null; };
  const bundles = [], meta = [], failed = [];
  for (const b of declared) {
    const members = b.units.flatMap(u => u.edges).map(e => edgeOf.get(e.id)).sort((p, q) => index.get(p.id) - index.get(q.id));
    const ids = new Set(members.map(e => e.id)), n = members.length, fan = b.end !== 'both', rep = members[0];
    const fail = (rule, detail, more = {}) => failed.push({key: b.key, id: b.id, rule, detail, offender: null, drop: null, ...more});
    const dropIf = list => (fan && list.length && n - list.length >= BUNDLE.MIN ? list : null);
    // The members to draw apart with the ones named: each one's fact (its unit's records) goes with it.
    const unitOf = e => memberOf.get(e.id).u, withFacts = list => [...new Set(list.flatMap(id => unitOf(edgeOf.get(id)).edges.map(e => e.id)))];
    const entering = members.filter(e => e.through || enters(e));
    if (entering.length) { fail('through', entering[0].id + ' crosses an element', {drop: dropIf(entering.map(e => e.id))}); continue; }
    const Q = members.map(e => cleanPoly(b.end === 'to' ? e.pts.slice().reverse() : e.pts)), len = Q.map(polyLen), port = Q[0][0];
    if (Q.some(q => q[0][0] !== port[0] || q[0][1] !== port[1])) { fail('shared-end', `the members leave by different ports (${Q.map(q => q[0].join(',')).join(' ')})`); continue; }
    if (!fan && Q.some(q => !samePts(q, Q[0]))) { fail('shared-end', 'the records are not drawn on one route'); continue; }
    // A member that goes round its shared element to reach the shared port (along two of its sides: the element reads
    // as framed), or whose route is DETOUR times its own in the control plus DETOUR_PAD px, is drawn apart.
    if (fan) {
      const shared = nodeOf.get(b.node), wrap = shared ? members.filter((_, u) => hugs(Q[u], shared).length >= 2) : [];
      if (wrap.length) { fail('encircle', wrap[0].id + ' runs along the ' + hugs(Q[members.indexOf(wrap[0])], shared).join(' and ') + ' sides of ' + b.node, {drop: dropIf(withFacts(wrap.map(e => e.id)))}); continue; }
      const far = length ? members.filter((e, u) => length.has(e.id) && len[u] > BUNDLE.DETOUR * length.get(e.id) + BUNDLE.DETOUR_PAD) : [];
      if (far.length) { const e = far[0]; fail('detour', e.id + ' is ' + Math.round(len[members.indexOf(e)]) + ' px, ' + Math.round(length.get(e.id)) + ' px drawn apart', {drop: dropIf(withFacts(far.map(e => e.id)))}); continue; }
    }
    const C = members.map(() => new Array(n).fill(0));
    let bad = null, root = len[0];
    if (fan) {
      for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) { const c = commonPrefix(Q[u], Q[v]); C[u][v] = C[v][u] = c; root = Math.min(root, c); }
      if (root < BUNDLE.ROOT) { const early = members.filter((_, u) => Math.max(...C[u].filter((_, v) => v !== u)) < BUNDLE.ROOT).map(e => e.id); fail('root', 'the shared root is ' + root + ' px', {drop: dropIf(early)}); continue; }
      for (let u = 0; u < n && !bad; u++) for (let v = u + 1; v < n && !bad; v++) {
        const endU = C[u][v] >= len[u], endV = C[u][v] >= len[v];
        if (endU && endV ? unitOf(members[u]) !== unitOf(members[v]) : endU || endV) { bad = ['tree', (endU ? members[u].id : members[v].id) + ' ends on the route of ' + (endU ? members[v].id : members[u].id), endU ? members[u] : members[v]]; break; }
        if (endU || endV) continue;
        const su = segsOf(slicePoly(Q[u], C[u][v], len[u])), sv = segsOf(slicePoly(Q[v], C[u][v], len[v]));
        if (su.some(s => sv.some(t => overlapOf(s, t) > 1))) bad = ['rejoin', members[u].id + ' and ' + members[v].id + ' run together again after they part', members[v]];
      }
      // The member that ends on another's route, or the later of two that rejoin, is drawn apart (its fact with it).
      if (bad) { fail(bad[0], bad[1], {drop: dropIf(unitOf(bad[2]).edges.map(e => e.id))}); continue; }
    }
    // The runs, the joins and the branches.
    const runs = [], joins = [], joinOffset = new Map(), seen = new Set(), branch = new Map();
    if (fan) for (let u = 0; u < n; u++) {
      const cuts = [...new Set([0, ...C[u].filter((c, v) => v !== u && c > 0)])].sort((x, y) => x - y), top = cuts[cuts.length - 1];
      for (let i = 0; i + 1 < cuts.length; i++) {
        const set = members.filter((_, v) => v === u || C[u][v] >= cuts[i + 1]).map(e => e.id), key = set.join('\u0001') + '@' + cuts[i];
        if (seen.has(key)) continue; seen.add(key);
        const pts = slicePoly(Q[u], cuts[i], cuts[i + 1]), far = cuts[i + 1] >= len[u];
        runs.push({members: set, pts, root: cuts[i] === 0, far, offset: cuts[i]});
        if (!far) { const j = pts[pts.length - 1], jk = j.join(','); if (!joinOffset.has(jk)) { joins.push(j); joinOffset.set(jk, cuts[i + 1]); } }
      }
      const mine = top >= len[u] ? [] : slicePoly(Q[u], top, len[u]);
      branch.set(members[u].id, b.end === 'to' ? mine.reverse() : mine);
    } else runs.push({members: members.map(e => e.id), pts: Q[0].map(p => p.slice()), root: true, far: true, offset: 0});
    // A composition, aggregation or dot-ended fan splits only as a T: at a join, the trunk in and at most two ways out.
    if (fan && undotted(rep.kind)) for (const j of joins) {
      const dirs = new Set();
      for (const q of Q) for (const [s0, s1] of segsOf(q)) { if (distToSeg(j, [s0, s1]) > 0) continue; if (s0[0] === j[0] && s0[1] === j[1]) dirs.add(dirOf(s0, s1)); else if (s1[0] === j[0] && s1[1] === j[1]) dirs.add(dirOf(s1, s0)); else { dirs.add(dirOf(s0, s1)); dirs.add(dirOf(s1, s0)); } }
      if (dirs.size >= 4) { bad = ['four-way', 'a ' + rep.kind + ' fan splits four ways at ' + j.join(',')]; break; }
    }
    if (bad) { fail(bad[0], bad[1]); continue; }
    // The parties at a join (the runs that leave it and each member whose own branch leaves it), smallest first, ties
    // in model order: the smallest is drawn apart when the join fails a check.
    const at = (p, j) => !!p && p[0] === j[0] && p[1] === j[1], leaves = (r, j) => at(r.pts[0], j);
    const partiesAt = j => { const o = runs.filter(r => !r.root && leaves(r, j)).map(r => r.members); for (const e of members) { const br = branch.get(e.id) || []; if (at(b.end === 'to' ? br[br.length - 1] : br[0], j)) o.push([e.id]); } return o.sort((p, q) => p.length - q.length || index.get(p[0]) - index.get(q[0])); };
    const smallestAt = j => partiesAt(j)[0] || null;
    // No join within JOIN_ELEMENT px of an element (a join dot there would read as a relationship leaving that element,
    // or sit in a branch's own head, and the element's mark badge, 8 px below its bottom edge, would hide it; an undotted
    // bundle draws a plain T, which may stand where the trunk drops into an element a party of the join enters: the comb
    // a tree draws), none closer than JOIN_GAP px to another join (two dots touch), and no bend within JOIN_GAP px of a
    // join (a jog at a split leaves it unclear which bar a branch hangs from). The smallest party at the join is drawn
    // apart, at the later of two joins that touch.
    let joinBad = null;
    const M = BUNDLE.JOIN_ELEMENT, G = BUNDLE.JOIN_GAP, firstLen = pts => (pts.length > 2 ? segLen(pts[0], pts[1]) : Infinity), lastLen = pts => (pts.length > 2 ? segLen(pts[pts.length - 2], pts[pts.length - 1]) : Infinity);
    const dotted = !undotted(rep.kind), farOf = id => { const e = edgeOf.get(id); return b.end === 'to' ? e.from : e.to; };
    for (const j of joins) {
      const own = dotted ? null : new Set(partiesAt(j).flat().map(farOf));
      const el = cellsOf(j[0] - M, j[1] - M, j[0] + M, j[1] + M).flatMap(k => near.get(k) || []).find(q => !own?.has(q.id) && j[0] > q.x - M && j[0] < q.x + q.w + M && j[1] > q.y - M && j[1] < q.y + q.h + M);
      if (el) { joinBad = ['join-near-element', 'the join at ' + j.join(',') + ' is within ' + M + ' px of ' + el.id, smallestAt(j)]; break; }
    }
    // A step at a join is first repaired in place (routeConsolidated, routeAll align): the runs of the other parties at
    // the join may slide along the trunk to the step's far point (`align`: the member, the join and where to meet), so
    // the members leave the trunk at one point; two joins that touch slide either way. Only then is a party drawn apart.
    // Each candidate names the members that move together (`ids`: a run's members, or one member), the vertex and
    // where it goes: first the party with the step closes it (its run beside the trunk rides the trunk on), then the
    // other parties at the join meet the trunk at the step's far point.
    const others = (j, party) => partiesAt(j).filter(p => !(p.length === party.length && p.every((x, i) => x === party[i])));
    if (!joinBad) for (const j of joins) {
      const o = joins.find(q => q !== j && joinOffset.get(q.join(',')) > joinOffset.get(j.join(',')) && Math.hypot(q[0] - j[0], q[1] - j[1]) < G);
      if (o) { joinBad = ['join-gap', 'the joins at ' + j.join(',') + ' and ' + o.join(',') + ' are closer than ' + G + ' px', smallestAt(o), [...partiesAt(j).map(ids => ({ids, j, k: o})), ...partiesAt(o).map(ids => ({ids, j: o, k: j}))]]; break; }
      const into = runs.find(r => !r.far && at(r.pts[r.pts.length - 1], j) && lastLen(r.pts) < G);
      if (into) { joinBad = ['join-gap', 'a bend ' + lastLen(into.pts) + ' px before the join at ' + j.join(','), smallestAt(j), [{ids: into.members, j: into.pts[into.pts.length - 2], k: j}]]; break; }
      const out = runs.find(r => !r.root && leaves(r, j) && firstLen(r.pts) < G);
      if (out) { joinBad = ['join-gap', 'a bend ' + firstLen(out.pts) + ' px after the join at ' + j.join(','), out.members, [{ids: out.members, j: out.pts[1], k: j}, ...others(j, out.members).map(ids => ({ids, j, k: out.pts[1]}))]]; break; }
      const bent = members.find(e => { const br = branch.get(e.id) || []; return b.end === 'to' ? at(br[br.length - 1], j) && lastLen(br) < G : at(br[0], j) && firstLen(br) < G; });
      if (bent) { const br = branch.get(bent.id), s = b.end === 'to' ? br[br.length - 2] : br[1]; joinBad = ['join-gap', 'a bend within ' + G + ' px after the join at ' + j.join(',') + ' on ' + bent.id, [bent.id], [{ids: [bent.id], j: s, k: j}, ...others(j, [bent.id]).map(ids => ({ids, j, k: s}))]]; break; }
    }
    if (joinBad) { fail(joinBad[0], joinBad[1], {drop: joinBad[2] ? dropIf(withFacts(joinBad[2])) : null, align: joinBad[3]?.length ? joinBad[3] : null}); continue; }
    // No foreign line along a trunk, with a point on a trunk, or near a join. The line named is the first in model order
    // for the first of these that fails.
    const trunks = runs.filter(r => r.members.length >= 2);
    const first = (rule, hits) => { if (!hits.length) return null; hits.sort((p, q) => index.get(p[0].id) - index.get(q[0].id)); const [e, detail, drop] = hits[0]; return [rule, e.id + detail, e.id, drop]; };
    const onTrunk = [], onPoint = [], atJoin = [];
    for (const r of trunks) for (const s of segsOf(r.pts)) {
      for (const o of lines.get(lineKey(s)) || []) if (!ids.has(o.e.id) && overlapOf(s, o.s) > BUNDLE.RUN) onTrunk.push([o.e, ' runs along the trunk', r.root ? null : r.members]);
      const k = lineKey(s), cand = k ? (k[0] === 'h' ? byRow.get(s[0][1]) : byCol.get(s[0][0])) || [] : [];
      for (const o of [...cand, ...oddPts]) if (!ids.has(o.e.id) && distToSeg(o.p, s) <= BUNDLE.ON_RUN) onPoint.push([o.e, ' has a point on the trunk at ' + o.p.join(','), r.root ? null : r.members]);
    }
    for (const j of joins) {
      const cand = [...odd]; for (let d = -BUNDLE.JOIN_CLEAR; d <= BUNDLE.JOIN_CLEAR; d++) cand.push(...(lines.get('h' + (j[1] + d)) || []), ...(lines.get('v' + (j[0] + d)) || []));
      for (const o of cand) if (!ids.has(o.e.id) && distToSeg(j, o.s) <= BUNDLE.JOIN_CLEAR) atJoin.push([o.e, ' passes the join at ' + j.join(','), smallestAt(j)]);
    }
    const foreign = first('foreign-on-trunk', onTrunk) || first('t-contact', onPoint) || first('foreign-at-join', atJoin);
    if (foreign) { const [rule, detail, by, drop] = foreign; fail(rule, detail, {offender: reroutable(by), drop: drop ? dropIf(withFacts(drop)) : null}); continue; }
    // The ink it saves against its members drawn apart in the control (routeConsolidated ranks the bundles by it).
    meta.push({key: b.key, id: b.id, end: b.end, saves: length ? members.reduce((t, e) => t + (length.get(e.id) || 0), 0) - inkOf(members) : 0});
    bundles.push({id: b.id, end: b.end, node: fan ? b.node : null, face: fan ? b.face : null, kind: rep.kind, family: rep.family || styleOf(rep.kind).family, label: rep.label || '', dotted: fan && !undotted(rep.kind), members: members.map(e => e.id), runs, joins, root});
    for (const e of members) { e.bundle = b.id; e.bundleEnd = b.end; e.branch = fan ? branch.get(e.id) : []; }
  }
  return {bundles, meta, failed};
}
// The layout's record of its bundles when none were tried (the control, a picture that never bundles) or none formed.
const NO_CONSOLIDATION = () => ({bundles: 0, members: 0, duplicates: 0, joins: 0, passes: 0, dissolved: 0, aligned: 0, fallback: false, why: []});
// The ink a picture draws: the union of its routes on each line (a trunk its members share is inked once), plus any
// diagonal as drawn; drawnMetrics (notation-metrics.mjs) measures the same.
function inkOf(edges) {
  const lines = new Map(); let diag = 0;
  for (const e of edges) for (const [[x1, y1], [x2, y2]] of segsOf(e.pts)) { const k = y1 === y2 ? 'h' + y1 : x1 === x2 ? 'v' + x1 : null; if (!k) { diag += Math.hypot(x2 - x1, y2 - y1); continue; } const l = lines.get(k), iv = y1 === y2 ? [Math.min(x1, x2), Math.max(x1, x2)] : [Math.min(y1, y2), Math.max(y1, y2)]; if (l) l.push(iv); else lines.set(k, [iv]); }
  let t = diag;
  for (const iv of lines.values()) { iv.sort((a, b) => a[0] - b[0]); let [s, e] = iv[0]; for (let i = 1; i < iv.length; i++) { if (iv[i][0] <= e) e = Math.max(e, iv[i][1]); else { t += e - s; [s, e] = iv[i]; } } t += e - s; }
  return t;
}
// Routes with bundles (notationLayout consolidate, the default). The control (the same picture without bundles) is
// routed too: it is the ink a bundle must not exceed and the picture drawn when no bundle holds. Pass 1 routes every
// declared bundle; a bundle that fails its checks is repaired in the next pass (the foreign line re-routed off it once,
// else the failing members drawn apart, else the bundle drawn apart); a pass whose picture draws more ink than the
// control draws apart the bundle that saves least. Each later pass (at most BUNDLE.PASSES) keeps every route that did
// not change. When pass 1 fails on more than BUNDLE.BAIL of its bundles (and at least BUNDLE.BAIL_MIN), or the last
// pass still fails, the picture is routed with only the records of one fact drawn once (from the control, the same way),
// and if that fails too it is the control. What is returned always passes every check and never draws more ink than the
// control; each repair and fallback is named in `why` (at most BUNDLE.WHY entries). The passes share the search tables.
function routeConsolidated(D, nodes, groups, edges, W, H, options) {
  const opts = {...options, scratch: {}};
  const banned = new Set(), repaired = new Set(), why = [], note = s => { if (why.length < BUNDLE.WHY) why.push(s); };
  const fresh = () => edges.map(e => ({...e}));
  let alignedRuns = 0;
  const finish = (r, bundles, passes, fallback) => ({edges: r.edges, snapReverted: r.snapReverted, bundles, consolidation: {bundles: bundles.length, members: bundles.reduce((t, b) => t + b.members.length, 0), duplicates: bundles.filter(b => b.end === 'both').length, joins: bundles.reduce((t, b) => t + b.joins.length, 0), passes, dissolved: banned.size, aligned: fallback === 'none' ? 0 : alignedRuns, fallback, why}});
  let prev = null, repair = new Set(), passes = 0, control = null, controlInk = 0, length = null;
  const hard = new Set();
  // A line outside every bundle that a check found along, at or on a trunk is re-routed off it at once, on the pass's own
  // grid, and a step at a join is closed by sliding a run along the trunk (join-gap, routeAll align); the pass is checked
  // again: a repair that holds costs no pass, and one that does not is known at once. Each slide is tried once.
  // A slide is kept only while its bundle passes or can slide on, and never when a bundle that passed now fails: else
  // the round's slides are undone and the failure is handled as before.
  const aligned = new Set();
  const inPlace = (r, C, tag) => {
    for (let guard = 0; guard < 16; guard++) {
      const fix = C.failed.filter(f => f.offender && !repaired.has(f.offender) && r.reroutable(f.offender));
      for (const f of fix) if (!repaired.has(f.offender)) { repaired.add(f.offender); hard.add(f.offender); r.reroute(f.offender); note(`${tag}${f.id}: ${f.rule} (${f.detail}); ${f.offender} re-routed off it`); }
      const moved = [], undos = new Map(), failing = new Set(C.failed.map(f => f.id));
      for (const f of C.failed) {
        if (f.offender || !f.align) continue;
        for (const c of f.align) {
          const key = c.ids.join('+') + '@' + c.j.join(',') + '>' + c.k.join(','); if (aligned.has(key)) continue; aligned.add(key);
          const done = []; for (const id of c.ids) { const undo = r.align(id, c.j, c.k); if (!undo) break; done.push(undo); }
          if (done.length < c.ids.length) { for (const u of done.reverse()) u(); continue; }
          undos.set(f.id, [...(undos.get(f.id) || []), ...done]); moved.push([f.id, `${tag}${f.id}: ${f.rule} (${f.detail}); ${c.ids.join(', ')} slid from ${c.j.join(',')} to ${c.k.join(',')}`]); break;
        }
      }
      if (!fix.length && !moved.length) return C;
      r.snapReverted = r.snapRevertedNow();
      C = consolidate(r.edges, r.declared, nodes, length);
      if (undos.size) {
        const grew = C.failed.some(f => !failing.has(f.id)), back = [...undos].filter(([id]) => grew || C.failed.some(f => f.id === id && !(f.rule === 'join-gap' && f.align)));
        for (const [, list] of back) for (const u of list.reverse()) u();
        const undone = new Set(back.map(([id]) => id));
        for (const [id, m] of moved) if (!undone.has(id)) { alignedRuns++; note(m); }
        if (back.length) { r.snapReverted = r.snapRevertedNow(); C = consolidate(r.edges, r.declared, nodes, length); }
      }
    }
    return C;
  };
  for (let pass = 1; pass <= 1 + BUNDLE.PASSES; pass++) {
    if (!control) {
      // Nothing to bundle: the control is the picture. Else the control first (on its own grid, so a pass's grid stays as it
      // is for a re-route in place), then pass 1.
      if (!routeAll(D, nodes, groups, fresh(), W, H, {...opts, bundle: true, declareOnly: true}).declared.length) { const z = routeAll(D, nodes, groups, fresh(), W, H, opts); return {edges: z.edges, snapReverted: z.snapReverted, bundles: [], consolidation: NO_CONSOLIDATION()}; }
      control = routeAll(D, nodes, groups, fresh(), W, H, {...opts, ownGrid: true}); controlInk = inkOf(control.edges);
      length = new Map(control.edges.map(e => [e.id, polyLen(e.pts)]));
    }
    const r = routeAll(D, nodes, groups, fresh(), W, H, {...opts, bundle: true, banned, prev, repair, hard}); passes = pass;
    if (!r.declared.length) { note(`pass ${pass}: every bundle drawn apart`); break; }
    const C = inPlace(r, consolidate(r.edges, r.declared, nodes, length), '');
    if (!C.failed.length) {
      const ink = inkOf(r.edges);
      if (ink <= controlInk) return finish(r, C.bundles, pass, false);
      // More ink than the control (ports shifted by the merged ones, a line kept off a trunk): the bundle that saves least
      // is drawn apart.
      const bySaves = (p, q) => p.saves - q.saves || (p.id < q.id ? -1 : 1), least = C.meta.filter(b => b.end !== 'both').sort(bySaves)[0] || C.meta.slice().sort(bySaves)[0];
      banned.add(least.key); note(`pass ${pass}: ${Math.round(ink - controlInk)} px more ink than the control; ${least.id} (saving ${Math.round(least.saves)} px) drawn apart`);
      prev = r.routes; repair = new Set(); continue;
    }
    if (pass === 1 && C.failed.length > BUNDLE.BAIL * r.declared.length && C.failed.length >= BUNDLE.BAIL_MIN) { note(`pass 1: ${C.failed.length} of ${r.declared.length} bundles fail their checks, more than ${BUNDLE.BAIL * 100}% (${C.failed.map(f => `${f.id}: ${f.rule}, ${f.detail}`).join('; ')})`); break; }
    repair = new Set();
    for (const f of C.failed) {
      if (f.offender && !repaired.has(f.offender)) { repair.add(f.offender); repaired.add(f.offender); hard.add(f.offender); note(`${f.id}: ${f.rule} (${f.detail}); ${f.offender} re-routed off it`); }
      else if (f.drop) { for (const id of f.drop) banned.add('x|' + id); note(`${f.id}: ${f.rule} (${f.detail}); ${f.drop.join(', ')} drawn apart`); }
      else { banned.add(f.key); note(`${f.id}: ${f.rule} (${f.detail}); drawn apart`); }
    }
    if (pass === 1 + BUNDLE.PASSES) note(`${C.failed.length} bundles still fail after ${pass} passes`);
    prev = r.routes;
  }
  // The fallbacks: one fact's records drawn once and no fan (routed from the control, keeping each of its routes that
  // did not change; a fact that fails its checks is drawn apart in the next pass), then the control itself.
  const facts = new Set([...banned].filter(k => k.startsWith('d|')));
  let dupRepair = new Set();
  prev = control.routes; repaired.clear(); hard.clear();
  for (let pass = 1; pass <= 1 + BUNDLE.PASSES; pass++) {
    const d = routeAll(D, nodes, groups, fresh(), W, H, {...opts, bundle: true, fans: false, banned: facts, prev, repair: dupRepair, hard}); passes++;
    if (!d.declared.length) break;
    const Cd = inPlace(d, consolidate(d.edges, d.declared, nodes, length), 'records of one fact: ');
    if (!Cd.failed.length) { if (inkOf(d.edges) <= controlInk) return finish(d, Cd.bundles, passes, 'duplicates'); note('records of one fact: more ink than the control'); break; }
    const fix = new Set();
    for (const f of Cd.failed) { if (f.offender && !repaired.has(f.offender)) { fix.add(f.offender); repaired.add(f.offender); hard.add(f.offender); note(`records of one fact: ${f.id}: ${f.rule} (${f.detail}); ${f.offender} re-routed off it`); } else { facts.add(f.key); banned.add(f.key); note(`records of one fact: ${f.id}: ${f.rule} (${f.detail}); drawn apart`); } }
    prev = d.routes; dupRepair = fix;
  }
  note('drawn without bundles');
  return finish(control, [], passes, 'none');
}
// A bucket grid over the page (round 5, scale): a box is listed in every bucket it touches, so a question about a small
// box reads what stands near it rather than the whole picture. Two boxes that touch share a bucket, so a question
// widened by its margin misses nothing; each item is answered once however many buckets it shares with the question.
// The grid has tiers, each with buckets eight times wider than the last: an item is listed at the finest tier where it
// touches at most WIDE buckets, so a long straight connector across a large picture is listed a few times, not
// thousands, and a question reads each tier's buckets around it.
const BUCKET = 256, TIERS = 6, WIDE = 64;
function nearIndex() {
  const tiers = Array.from({length: TIERS}, () => new Map()), items = [], seen = [], wide = []; let stamp = 0;
  const span = (x1, y1, x2, y2, size) => [Math.floor(x1 / size), Math.floor(y1 / size), Math.floor(x2 / size), Math.floor(y2 / size)];
  const add = (item, x1, y1, x2, y2) => {
    const i = items.push(item) - 1; seen.push(0);
    for (let l = 0, size = BUCKET; l < TIERS; l++, size *= 8) {
      const [bx1, by1, bx2, by2] = span(x1, y1, x2, y2, size);
      if (!((bx2 - bx1 + 1) * (by2 - by1 + 1) <= WIDE)) continue;
      const cells = tiers[l];
      for (let by = by1; by <= by2; by++) for (let bx = bx1; bx <= bx2; bx++) { const k = bx * 1e6 + by, c = cells.get(k); if (c) c.push(i); else cells.set(k, [i]); }
      return;
    }
    if (![x1, y1, x2, y2].some(Number.isNaN)) wide.push(i);
  };
  const near = (x1, y1, x2, y2, visit) => {
    const now = ++stamp;
    for (const i of wide) { seen[i] = now; if (visit(items[i])) return true; }
    for (let l = 0, size = BUCKET; l < TIERS; l++, size *= 8) {
      const cells = tiers[l]; if (!cells.size) continue;
      const [bx1, by1, bx2, by2] = span(x1, y1, x2, y2, size);
      for (let by = by1; by <= by2; by++) for (let bx = bx1; bx <= bx2; bx++) { const c = cells.get(bx * 1e6 + by); if (c) for (const i of c) { if (seen[i] === now) continue; seen[i] = now; if (visit(items[i])) return true; } }
    }
    return false;
  };
  return {add, addBox: b => add(b, b.x, b.y, b.x + b.w, b.y + b.h), near};
}
// Labels: a word sits beside the last run into its target where the standard writes it, or on
// the first run that has room, never on an element, a title or another word.
// Round 10 (bundle-aware words): a bundle (L.bundles) draws one line from its shared element, so it writes its word
// once (its members share one word: the word is part of the bundle's line style). Its first member in model order
// places it, trying the root run first (from the shared element outward, so for a fan-in the run entering the target
// comes first; one fact recorded twice tries its one route as a line outside a bundle would), then the bundle's other
// runs, longest first, then its own branch; every other member is labelHidden and carries the same lx, ly. The lines a
// word must keep off are what is drawn: each line outside a bundle, each bundle run once (never once per member, so its
// members' shared runs do not crowd its word off the trunk), each member's own branch; a bundle's word keeps off its
// own runs and branch too, so it never sits across its own corner. The source-side fold (a fan of lines from one
// element with one word writes it once) applies only to lines outside a bundle: a bundle always writes its own word, so
// every line drawn into a fan-in carries one. A qualifier stays at its own relationship's source, so a fan-in member
// keeps its own on its own branch; of two records of one fact drawn as one line, the second hides its qualifier
// (qualifierHidden, at the first's place). Steps, cardinalities and crossing marks are never in a bundle (formBundles),
// so they are placed as before. A picture without bundles places every word exactly as before.
export const labelWidth = s => Math.max(10, Math.round(charW(String(s), 10) + 10));
const segLenOf = sg => Math.abs(sg.b[0] - sg.a[0]) + Math.abs(sg.b[1] - sg.a[1]);
const segsAlong = pts => (pts || []).slice(1).map((p, i) => ({a: pts[i], b: p, i})).filter(sg => sg.a[0] !== sg.b[0] || sg.a[1] !== sg.b[1]);
// A line's own order of runs for its word: the run into its target first, then the others longest first.
const wordOrder = segs => [segs[segs.length - 1], ...segs.slice(0, -1).sort((p, q) => segLenOf(q) - segLenOf(p))].filter(Boolean);
function placeLabels(D, edges, nodes, groups, bundles = [], heads = []) {
  const headers = [...groups.flatMap(headerBoxes), ...captionBoxes(D, byId(nodes)), ...heads];
  const bundleOf = new Map(bundles.map(b => [b.id, b])), inBundle = e => !!(e.bundle && bundleOf.has(e.bundle));
  // What is drawn: a line outside a bundle along its whole route, a bundle member along its own branch only, and each
  // bundle run once (`e` null).
  const runs = edges.flatMap(e => { const pts = inBundle(e) ? e.branch || [] : e.pts; return pts.slice(1).map((p, i) => ({e, a: pts[i], b: p})); });
  for (const b of bundles) for (const r of b.runs) for (const sg of segsAlong(r.pts)) runs.push({e: null, a: sg.a, b: sg.b});
  // Elements, titles, placed words and runs, each by the buckets it touches; a question widens the box by 3 px, more
  // than any margin asked below (an overlap counted 1 or 2 px apart).
  const boxesNear = nearIndex(), placedNear = nearIndex(), runsNear = nearIndex();
  for (const n of nodes) boxesNear.add({n, box: n}, n.x, n.y, n.x + n.w, n.y + n.h); for (const h of headers) boxesNear.add({box: h}, h.x, h.y, h.x + h.w, h.y + h.h);
  for (const r of runs) runsNear.add(r, Math.min(r.a[0], r.b[0]), Math.min(r.a[1], r.b[1]), Math.max(r.a[0], r.b[0]), Math.max(r.a[1], r.b[1]));
  const around = (box, visit, index) => index.near(box.x - 3, box.y - 3, box.x + box.w + 3, box.y + box.h + 3, visit);
  const onBox = (box, m, which) => around(box, it => (which === 'node' ? !!it.n : !it.n) && overlaps(box, it.box, m), boxesNear);
  const onPlaced = (box, m, which = null) => around(box, p => (!which || (which === 'tag') === !!p.tag) && overlaps(box, p, m), placedNear);
  const hit = (box, m = 1) => box.x < 0 || box.y < 0 || onBox(box, -m, 'node') || onBox(box, -m, 'header') || onPlaced(box, -2);
  // A vertical run within PAD px of a word's side runs through the word's padding (labelWidth leaves 5 px each side), not
  // its letters (round 10: off the 8 px cell grid since the port snap, a run no longer stands exactly on a box's edge).
  const PAD = 3, crosses = (box, own, r) => { if (own && r.e === own) return false; const pad = r.a[0] === r.b[0] ? PAD : 0; return Math.min(r.a[0], r.b[0]) < box.x + box.w - pad && Math.max(r.a[0], r.b[0]) > box.x + pad && Math.min(r.a[1], r.b[1]) < box.y + box.h && Math.max(r.a[1], r.b[1]) > box.y; };
  const crossesRuns = (box, own) => { let n = 0; around(box, r => { if (crosses(box, own, r)) n++; return false; }, runsNear); return n; };
  // Whether any run crosses the box: the first crossing answers (a count is read only to rank the last resort).
  const crossesAny = (box, own) => around(box, r => crosses(box, own, r), runsNear);
  // The qualifier tags near the source end, cardinalities at each end and the crossing mark mid-route are placed first
  // (they stand where the standard writes them), and their boxes (tagBoxes) are obstacles for the words below, so a
  // word never lands on a tag (the review of round 10: Chapter 5 drew words on qualifiers).
  for (const e of edges) {
    const [x0, y0] = e.pts[0], [x1, y1] = e.pts[1] || e.pts[0], horizontal = y0 === y1, sx = Math.sign(x1 - x0) || 1, sy = Math.sign(y1 - y0) || 1;
    if (e.qualifier) { const k = (e.portIndex || 0) % 3; e.qx = horizontal ? x0 + sx * (14 + 34 * k) : x0 + 5; e.qy = horizontal ? y0 - 5 : y0 + sy * (16 + 12 * k); e.qAnchor = horizontal ? (sx > 0 ? 'start' : 'end') : 'start'; }
    if (e.cardinality) { const [xa, ya] = e.pts[e.pts.length - 1], [xb, yb] = e.pts[e.pts.length - 2] || e.pts[0]; const hz = ya === yb, ex = Math.sign(xa - xb) || 1, ey = Math.sign(ya - yb) || 1; e.cfx = horizontal ? x0 + sx * 8 : x0 + 6; e.cfy = horizontal ? y0 + 12 : y0 + sy * 10; e.ctx = hz ? xa - ex * 8 : xa + 6; e.cty = hz ? ya + 12 : ya - ey * 10; }
    if (e.crossing) { const mid = Math.floor(e.pts.length / 2), [ax, ay] = e.pts[mid - 1], [bx, by] = e.pts[mid]; e.mx = (ax + bx) / 2; e.my = (ay + by) / 2; e.mh = ay === by; }
  }
  // Two records of one fact drawn as one line (a bundle's members with the same ends and qualifier: the bundle of one
  // fact, or two records riding one branch of a fan-in) write one qualifier: the later hides its own, at the first's place.
  const edgeOf = bundles.length ? new Map(edges.map(e => [e.id, e])) : null;
  for (const b of bundles) {
    const first = new Map();
    for (const id of b.members) {
      const e = edgeOf.get(id); if (!e?.qualifier) continue;
      // (rc41: a fan-out's members share their source and their qualifier: the first writes it at the root, once)
      const k = e.from + '\u0001' + (b.end === 'from' ? '' : e.to) + '\u0001' + qualifierOf(e), f = first.get(k);
      if (!f) { first.set(k, e); continue; }
      e.qualifierHidden = true; e.qx = f.qx; e.qy = f.qy; e.qAnchor = f.qAnchor;
    }
  }
  // Printed (round 12, P), where a tag is drawn at the print floor and the source ends of a crowded element stand close
  // together: each shown qualifier takes the first of its places down its source run, beside the line on either side,
  // that no tag placed before it and no element covers (its usual place first). Where none is free it is not drawn
  // (qualifierCrowded): the figure says how many (sdd-figures.js); each stays on its relationship.
  if (PRINT_PX) {
    // (round 24 part 3: off the cardinalities too, which stand where the standard writes them)
    const placed = edges.flatMap(e => (e.cardinality ? tagBoxes({...e, qualifier: ''}) : []));
    for (const e of edges) {
      if (!e.qualifier || e.qualifierHidden || !Number.isFinite(e.qx)) continue;
      const [x0, y0] = e.pts[0], [x1, y1] = e.pts[1] || e.pts[0], horizontal = y0 === y1, sx = Math.sign(x1 - x0) || 1, sy = Math.sign(y1 - y0) || 1;
      const w = Math.round(charW(String(e.qualifier), PRINT_PX) + 2), at = (x, y, anchor) => ({x: anchor === 'end' ? x - w : x, y: y - 10, w, h: 12, qx: x, qy: y, anchor});
      const tries = [at(e.qx, e.qy, e.qAnchor)];
      for (let k = 0; k < 8; k++) {
        if (horizontal) { const x = x0 + sx * (14 + 34 * k), a = sx > 0 ? 'start' : 'end'; tries.push(at(x, y0 - 5, a), at(x, y0 + 15, a)); }
        else { const y = y0 + sy * (16 + 13 * k); tries.push(at(x0 + 5, y, 'start'), at(x0 - 5, y, 'end')); }
      }
      const t = tries.find(c => c.x >= 0 && !placed.some(q => overlaps(c, q, -1)) && !onBox(c, -1, 'node'));
      if (!t) { e.qualifierHidden = true; e.qualifierCrowded = true; continue; }
      e.qx = t.qx; e.qy = t.qy; e.qAnchor = t.anchor; placed.push(t);
    }
  }
  for (const e of edges) for (const t of tagBoxes(e)) placedNear.addBox({...t, tag: true});
  // The member that writes each bundle's word: its first in model order.
  const wordOf = e => (e.step ? e.step + ' ' : '') + (e.label || ''), writer = new Map();
  for (const e of edges) if (inBundle(e) && wordOf(e) && !writer.has(e.bundle)) writer.set(e.bundle, e);
  const bundled = new Set();
  for (const e of edges) {
    const s = wordOf(e); if (!s) { e.lx = e.pts[0][0]; e.ly = e.pts[0][1]; continue; }
    const b = inBundle(e) ? bundleOf.get(e.bundle) : null;
    // A bundle writes its word once: the members after its writer carry the writer's place, hidden.
    if (b && writer.get(b.id) !== e) { const r = writer.get(b.id); e.labelHidden = true; e.lx = r.lx; e.ly = r.ly; continue; }
    // A fan of connectors from one element with one word carries the word once; the Key says the rest.
    const bundle = !b && !e.step && !e.qualifier ? e.from + '\u0001' + e.kind + '\u0001' + e.label : null;
    if (bundle && bundled.has(bundle)) { e.labelHidden = true; const [x1, y1] = e.pts[e.pts.length - 2], [x2, y2] = e.pts[e.pts.length - 1]; e.lx = (x1 + x2) / 2; e.ly = (y1 + y2) / 2; continue; }
    if (bundle) bundled.add(bundle);
    const w = labelWidth(s), h = 11, segs = e.pts.slice(1).map((p, i) => ({a: e.pts[i], b: p, i}));
    // A bundle's word: its root run from the shared element outward, its other runs longest first, then its writer's
    // branch; one fact recorded twice (one run, end to end) as a line outside a bundle.
    let ordered = wordOrder(segs);
    if (b) {
      if (b.end === 'both') ordered = wordOrder(segsAlong(b.runs[0].pts));
      else ordered = [...b.runs.filter(r => r.root).flatMap(r => segsAlong(r.pts)), ...b.runs.filter(r => !r.root).sort((p, q) => polyLen(q.pts) - polyLen(p.pts)).flatMap(r => segsAlong(r.pts)), ...wordOrder(segsAlong(e.branch))];
      if (!ordered.length) ordered = wordOrder(segs);
    }
    const candidates = [];
    for (const sg of ordered) {
      const horizontal = sg.a[1] === sg.b[1], len = Math.abs(horizontal ? sg.b[0] - sg.a[0] : sg.b[1] - sg.a[1]);
      for (const t of [0.5, 0.3, 0.7, 0.15, 0.85, 0.05, 0.95]) {
        const px = sg.a[0] + (sg.b[0] - sg.a[0]) * t, py = sg.a[1] + (sg.b[1] - sg.a[1]) * t;
        const diagonal = !horizontal && sg.a[0] !== sg.b[0];
        if (horizontal || diagonal) { if (len < 16 && !diagonal) continue; candidates.push({x: px - w / 2, y: py - 14, w, h}); candidates.push({x: px - w / 2, y: py + 3, w, h}); }
        if (!horizontal) { if (len < 12 && !diagonal) continue; candidates.push({x: px + 4, y: py - h / 2, w, h}); candidates.push({x: px - w - 4, y: py - h / 2, w, h}); }
      }
    }
    // Further off the line, still beside it, before a word would sit on an element; then farther still (a dense ring of
    // straight lines, where the only room is beyond the tags and words at the line), before the last resort.
    for (const [off, side] of (b ? [[26, 15]] : [[26, 15], [38, 27], [50, 39]])) for (const sg of ordered) { const horizontal = sg.a[1] === sg.b[1]; for (const t of [0.5, 0.25, 0.75]) { const px = sg.a[0] + (sg.b[0] - sg.a[0]) * t, py = sg.a[1] + (sg.b[1] - sg.a[1]) * t; if (horizontal) candidates.push({x: px - w / 2, y: py - off, w, h}, {x: px - w / 2, y: py + side, w, h}); else candidates.push({x: px + side + 1, y: py - h / 2, w, h}, {x: px - w - side - 1, y: py - h / 2, w, h}); } }
    // A line outside a bundle never counts its own route (as before); a bundle's word counts every drawn line, its own
    // runs and branch included, so it never sits across its bundle's corner or another member's run.
    const own = b ? null : e;
    let box = candidates.find(c => !hit(c) && !crossesAny(c, own));
    if (!box) box = candidates.find(c => !hit(c));
    // The last resort ranks what a word would cover: another word is worst (both unreadable), then an element's box,
    // then a tag, then a title; a run crossed counts one.
    if (!box) box = candidates.map((c, i) => ({c, i, n: crossesRuns(c, own) + (onPlaced(c, 0, 'word') ? 60 : 0) + (onBox(c, 0, 'node') ? 50 : 0) + (onPlaced(c, 0, 'tag') ? 40 : 0) + (onBox(c, 0, 'header') ? 20 : 0)})).sort((p, q) => p.n - q.n || p.i - q.i)[0]?.c;
    if (!box) { const [x1, y1] = e.pts[e.pts.length - 2], [x2, y2] = e.pts[e.pts.length - 1]; box = {x: (x1 + x2) / 2 - w / 2, y: (y1 + y2) / 2 - 14, w, h}; }
    box = {x: Math.round(box.x), y: Math.round(box.y), w, h};
    // Printed (round 24, D-24-07), the word of a line that stands for several relationships (a fold's, the module map's)
    // is not drawn where an element's box would cover it (labelCovered): the figure's footer counts them, and each stays
    // on its line's title and in the picture on screen.
    if (PRINT_PX && (e.fold || e.aggregate) && onBox(box, 0, 'node')) { e.labelHidden = true; e.labelCovered = true; e.labelBox = box; e.lx = box.x + w / 2; e.ly = box.y + 13; continue; }
    // Printed (round 24 part 3), no word is drawn over another drawn word or tag: where the only place left is on one
    // (labelOverlap), the word is not drawn; the footer counts them, and each stays on its line's title and on screen.
    if (PRINT_PX && onPlaced(box, 1)) { e.labelHidden = true; e.labelOverlap = true; e.labelBox = box; e.lx = box.x + w / 2; e.ly = box.y + 13; continue; }
    placedNear.addBox(box);
    e.labelBox = box; e.lx = box.x + w / 2; e.ly = box.y + 13;
    e.labelCollides = hit(box, 0);
  }
  return edges;
}
// The boxes of a relationship's tags as the renderer draws them (notation-svg.js: a qualifier at 9 px, a cardinality at
// 600 9 px, each a text at its anchor), for the words to keep off and for the metrics to count a word on a tag.
export function tagBoxes(e) {
  // Printed (round 12, P), the tags are drawn at the print floor (PRINT_PX) and their boxes grow with them.
  const px = PRINT_PX || 9, out = [], box = (text, x, y, anchor) => { const w = Math.round(charW(String(text), px) + 2); out.push({x: anchor === 'end' ? x - w : x, y: y - (PRINT_PX ? 10 : 8), w, h: PRINT_PX ? 12 : 10}); };
  if (e.qualifier && !e.qualifierHidden && Number.isFinite(e.qx)) box(e.qualifier, e.qx, e.qy, e.qAnchor);
  if (e.cardinality && Number.isFinite(e.cfx)) { box(e.cardinality.from, e.cfx, e.cfy, 'start'); box(e.cardinality.to, e.ctx, e.cty, 'start'); }
  return out;
}

// Corridors keyed by the parent/child pair become corridors keyed by the edge, in page coordinates.
function shiftWays(D, way, dx, dy) {
  const out = new Map();
  for (const e of D.edges) { const [a, b] = parentChild(e); const pts = way.get(a + '\u0001' + b) || (way.get(b + '\u0001' + a) || []).slice().reverse(); if (pts.length) out.set(e.id, pts.map(([x, y]) => [x + dx, y + dy])); }
  return out;
}
// ---------------------------------------------------------------- pins
// A pin is kept relative to its container when it has one, so it survives the container moving.
// Pins are re-validated against the model each time: a pin whose element left the picture is
// ignored, a pin whose element moved to another container is released (it no longer means what the
// reader meant), and a pin that would land on another pin is released. Unpinned elements then move
// out of the way: horizontally inside architecture bands, downward elsewhere.
function applyPins(D, P, G, pins, {bands = [], bandKey = null} = {}) {
  const pinned = [], dropped = [];
  for (const [id, pin] of Object.entries(pins || {})) {
    const p = P.get(id); if (!p || !pin) continue;
    const n = D.nodes.find(x => x.id === id);
    if (pin.group && pin.group !== (n?.group || null)) { dropped.push(id); continue; }
    const g = n?.group && pin.group === n.group ? G.get(n.group) : null;
    const x = g && Number.isFinite(pin.dx) ? g.x + pin.dx : pin.x, y = g && Number.isFinite(pin.dy) ? g.y + pin.dy : pin.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const box = {x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)), w: p.w, h: p.h};
    const band = bandKey && bands.find(b => b[bandKey] === n[bandKey]);
    if (band && (box.y < band.y + 20 || box.y + box.h > band.y + band.h - 8 || (band.across && (box.x < band.x || box.x + box.w > band.x + band.w)))) { dropped.push(id); continue; }
    if (pinned.some(q => overlaps(box, P.get(q), 1))) { dropped.push(id); continue; }
    p.x = box.x; p.y = box.y; p.pinned = true; pinned.push(id);
  }
  if (pinned.length) {
    const settled = pinned.map(id => P.get(id));
    const rest = D.nodes.map(n => P.get(n.id)).filter(p => p && !p.pinned).sort((a, b) => a.y - b.y || a.x - b.x);
    for (const p of rest) {
      for (let guard = 0; guard < 200; guard++) { const hit = settled.find(b => overlaps(p, b, -6)); if (!hit) break; if (bandKey && !bands.some(b => b.across)) p.x = hit.x + hit.w + 14; else p.y = hit.y + hit.h + 14; }
      settled.push(p);
    }
  }
  return {pinned, dropped};
}

// ---------------------------------------------------------------- the arrangement
// Routing is a search per connector across the whole page, so its cost grows with the connectors times the page. The
// largest reference or stress picture (the stress project's connected Chapter 11 model, 315 connectors) routes in about
// half a second; Chapter 4 of a 500-record project (499 flows across three crowded modules) took 3.2 s on its cell and
// 1.4 s on the coarsest cell that still leaves an open one between two elements (three times the fine one), against a
// budget of 1.5 s for the whole layout. Above STRAIGHT_EDGES a picture draws its connectors straight, as the by-layer
// picture does above 160, and a line that has to cross an element is marked (`through`) and counted.
export const STRAIGHT_EDGES = 400;
// The narrowest picture: a screen picture is never under 820 px wide; a page (below) sets its own.
let MIN_W = 820, PAGE_ON = false, PRINT_PX = 0, PAGE_NODES = new Set(), PAGE_DEGREE = new Map();
// The Arrange panel's spacing for the call in hand (rc41: byLayer's row and lane gaps; the other arrangements scale NL).
let LANE_SPACING = 1;
const QUIET_GAP = 20;
// `page` (round 12, P: pictures at size): {width, min} lays the picture out for a printed page `width` px wide, the
// width the SDD's figures map to the A4 text width: every rank is cut into rows that fit it, a long picture is never
// folded sideways into a wider one, and the picture is as narrow as its content (never under `min`). Only the
// arrangements that cut their ranks to the page (tree, layered, grouped, by layer) honour the width; the caller reads
// L.W and draws another arrangement where it is still wider (sdd-figures.js). `print` (px), on a printed page, is the
// floor its small words print at, so elements are sized for the words they print (sizeOf). The page is restored after the call.
function onPage(page, D, fn) {
  const keep = {PAGE: NL.PAGE, FOLD_V: NL.FOLD_V, FOLD_H: NL.FOLD_H, VG: NL.VG}, minW = MIN_W, on = PAGE_ON, px = PRINT_PX, nodes = PAGE_NODES, degree = PAGE_DEGREE;
  Object.assign(NL, {PAGE: page.width, FOLD_V: Infinity, FOLD_H: Infinity, VG: page.gap ?? NL.VG}); MIN_W = page.min ?? 360; PAGE_ON = true; PRINT_PX = page.print || 0;
  // The page's elements and how many relationships each takes part in (the quiet gaps, layered()).
  PAGE_NODES = new Set(D.nodes.map(n => n.id)); PAGE_DEGREE = new Map(); for (const e of D.edges) for (const id of [e.from, e.to]) PAGE_DEGREE.set(id, (PAGE_DEGREE.get(id) || 0) + 1);
  try { return fn(); } finally { Object.assign(NL, keep); MIN_W = minW; PAGE_ON = on; PRINT_PX = px; PAGE_NODES = nodes; PAGE_DEGREE = degree; }
}
// `consolidate` (round 10): false lays the picture out without bundles (the control the evidence measures against, and
// what a picture that never bundles draws); true, the default, draws declared, checked bundles where the picture allows.
// `corridors` (round 11): false lays a Layers picture out without its corridors (the round-10 picture, the before the
// round-11 evidence measures against); true, the default, plans them (byLayer) for the router to follow.
// `positionsOnly` gives the same element boxes without routing or placing labels. The Running board's first pass needs
// those boxes to order parts near what they run; its second pass routes the reordered picture once.
// `stage` (rc40, W1): the screen frame {w, h} a layered, tree or grouped picture is shaped for (SCREEN_STAGE on the
// screen): the rows' limit, the tree's shape and the groups' grid are chosen so the picture opens whole; a printed page
// (`page`) shapes its pictures by its width alone, as before.
export function notationLayout(D, {arrangement = D.scene.arrangement, pins = {}, sizes = null, hub = null, collapsed = [], every = null, consolidate = true, corridors = true, page = null, positionsOnly = false, direction = null, stage = null, spacing = 1} = {}) {
  // rc40 W2: the Arrange panel's spacing (Compact 0.75 · Comfortable 1 · Spacious 1.35, arrange-panel.js) scales the gap
  // constants for this call only (as onPage does for a page): the same picture, closer or more open.
  if (spacing !== 1 && Number.isFinite(spacing) && spacing > 0) { const keep = {HG: NL.HG, VG: NL.VG, GGAP: NL.GGAP, GPAD: NL.GPAD}, lanes = LANE_SPACING; for (const k of Object.keys(keep)) NL[k] = Math.round(keep[k] * spacing); LANE_SPACING = spacing; try { return notationLayout(D, {arrangement, pins, sizes, hub, collapsed, every, consolidate, corridors, page, positionsOnly, direction, stage}); } finally { Object.assign(NL, keep); LANE_SPACING = lanes; } }
  if (page) return onPage(page, D, () => notationLayout(D, {arrangement, pins, sizes, hub, collapsed, every, consolidate, corridors, positionsOnly, direction, stage}));
  if (sizes) D = {...D, nodes: D.nodes.map(n => sizes[n.id] ? {...n, layoutSize: sizes[n.id]} : n)};
  let P, G = new Map(), bands = [], way = new Map(), planned = NO_CORRIDORS(), orderCrossings = null, crowds = 0, rowOf = null, rowHead = null, laneOf = null, trunks = NO_TRUNKS(), trunkOf = null;
  if (!D.nodes.length) {
    // Every layer hidden (or nothing recorded): the lanes still say what they hold.
    const hidden = new Map(collapsed.filter(c => c && c.count > 0).map(c => [c.layer, c]));
    let at = NL.TOP - 24;
    const strips = arrangement === 'by-layer' ? LANE_ORDER.map(l => laneStrip(l, hidden.get(l), every)).filter(Boolean).map(c => { const h = c.h || STRIP_H, b = {...c, y: at, h, x: NL.LEFT - 12, w: 640 - 2 * NL.LEFT + 24}; at += h + STRIP_GAP; return b; }) : [];
    const H = Math.max(320, strips.length ? at + 60 : 0);
    return {W: 640, H, nodes: [], groups: [], edges: [], bands: strips, arrangement, header: {x: NL.LEFT, y: 14, w: 640 - 2 * NL.LEFT, h: 46}, notesY: strips.length ? H - 40 : NL.TOP + 20, orderCrossings: 0, through: 0, snapReverted: [], bundles: [], consolidation: NO_CONSOLIDATION(), corridors: planned, pinned: [], droppedPins: []};
  }
  if (arrangement === 'sequence') {
    const r = sequence(D), nodes = D.nodes.map(n => ({id: n.id, group: null, ...r.P.get(n.id)}));
    const notesY = r.bottom + 20, H = Math.max(320, notesY + (D.notes.length ? 18 * D.notes.length + 16 : 20));
    return {W: r.W, H, notesY, nodes, groups: [], edges: r.edges, lifelines: r.lifelines, orderCrossings: 0, bands: [], arrangement, header: {x: NL.LEFT, y: 14, w: r.W - 2 * NL.LEFT, h: 46}, through: 0, snapReverted: [], bundles: [], consolidation: NO_CONSOLIDATION(), corridors: planned, pinned: [], droppedPins: []};
  }
  // A very large picture keeps straight lines rather than searching a route for each: by layer, above 160 connectors or
  // 120 elements; in every arrangement, above STRAIGHT_EDGES connectors. Such a Layers picture plans no corridor.
  const large = arrangement === 'by-layer' && (D.edges.length > 160 || D.nodes.length > 120) || D.edges.length > STRAIGHT_EDGES;
  const items = D.nodes.map(n => ({id: n.id, ...sizeOf(n)}));
  // (a hierarchical picture on screen is a tidy tree where its edges make a forest, rc40: tidyTree)
  // (rc41: and on a printed page — sdd-figures.js passes the page's stage — where the tree keeps within the page's width;
  // wider, it is folded by the layered pipeline as before)
  const tidy = arrangement === 'tree' && stage && (!PAGE_ON || PRINT_PX) ? tidyTree(D, PRINT_PX ? NL.PAGE - 2 * NL.LEFT : TREE_MAX_W) : null;
  if (arrangement === 'by-layer') ({P, bands, way, rowOf, rowHead, corridors: planned} = byLayer(D, collapsed, every, {corridors: corridors !== false && !large}));
  else if (arrangement === 'radial') P = radial(D, hub);
  else if (arrangement === 'layered') {
    // (rc41: `direction: 'across'` lays the bands as columns, byLevelAcross; no trunk buses there, the router draws the lines)
    if (direction === 'across') ({P, bands} = byLevelAcross(D));
    else { const r = byLevel(D, stage); rowOf = r.rowOf; rowHead = r.rowHead; P = new Map([...r.L.P].map(([id, b]) => [id, {...b, x: b.x + NL.LEFT, y: b.y + NL.TOP}])); bands = r.bands.map(b => ({...b, y: b.y + NL.TOP})); way = shiftWays(D, r.way, NL.LEFT, NL.TOP); }
    // The aspect of each role band (rc41, W1; PLAN §2 W1.3): where a band's role maps to an aspect of the standard
    // (layers-view.js viewpointProjection: n.aspectKnown, n.aspectTitle), the aspect stands as a faint header at the right
    // end of the band's title line — the Layers lanes' column header; on the title line so the band keeps its height and
    // the picture its arrival, at the right end where the left-aligned rows leave room and clear of the title, which the
    // screen enlarges while zoomed out — closed to the router as every title is (`heads` below; its x is set once the
    // width is known). A band whose role the table does not name has none.
    if (D.viewLevels) bands = bands.map(b => {
      const own = D.nodes.filter(n => n.level === b.level && n.aspectKnown && n.aspectTitle); if (!own.length) return b;
      const count = new Map(); for (const n of own) count.set(n.aspectTitle, (count.get(n.aspectTitle) || 0) + 1);
      const [title] = [...count].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0], id = own.find(n => n.aspectTitle === title).aspect;
      const w = Math.round(charW(title, 14) * 1.25 + 8);
      // (a column of Left to right carries its header under its title, over its elements)
      return {...b, aspect: id, columns: [b.across ? {id, title, x: b.x + 8, w: Math.min(w, b.w - 16), hw: w, y: b.y + LANE_HEAD} : {id, title, x: null, w, hw: w, y: b.y + 4}]};
    });
  }
  else if (arrangement === 'grouped') ({P, G, way, crowds} = grouped(D, stage));
  else if (tidy) { rowOf = tidy.rowOf; P = new Map([...tidy.P].map(([id, b]) => [id, {...b, x: b.x + NL.LEFT, y: b.y + NL.TOP}])); }
  else if (arrangement === 'lanes') { const r = lanes(D); P = r.P; G = r.G; bands = r.bands; }
  else { const vertical = arrangement !== 'orthogonal'; let L = layered(items, D.edges, {vertical, ...(direction === 'strict' ? {wrap: false, fold: false} : {})}); if (L.wanted > MAX_DUMMIES) { crowded.count = 0; L = crowded(items, D.edges, vertical); crowds = crowded.count; } orderCrossings = L.crossings; P = new Map([...L.P].map(([id, b]) => [id, {...b, x: b.x + NL.LEFT, y: b.y + NL.TOP}])); way = shiftWays(D, L.way, NL.LEFT, NL.TOP); }
  // Trunks (rc40, W1): on screen a layered or lane picture gives each fan-in from one side its bus (busWays) and names the
  // lane of every element, so formBundles keeps the fan-in from one lane as the trunk.
  if (stage && rowOf && ['layered', 'by-layer', 'tree'].includes(arrangement)) {
    laneOf = new Map(D.nodes.map(n => [n.id, arrangement === 'layered' ? n.level : arrangement === 'tree' ? rowOf.get(n.id) : D.viewBands ? n.viewBand : n.layer]));
    const buses = busWays(D, P, rowOf, r => rowHead?.get(r) || 0);
    for (const [id, t] of buses) if (!way.has(id)) way.set(id, [[t.x, t.y]]);
    trunks = {buses: new Set([...buses.values()].map(t => t.x + ',' + t.y)).size, members: buses.size, direct: [...buses.values()].filter(t => t.direct).length, edges: [...buses].map(([id, t]) => [id, [[t.x, t.y]], t.kind, t.direct])};
    trunkOf = buses;
  }
  // A pinned node leaves its planned corridors behind.
  for (const e of D.edges) if (pins[e.from] || pins[e.to]) way.delete(e.id);
  // The Layers corridors as planned, for the metrics (notation-metrics.mjs corridorMetrics) and the evidence.
  if (arrangement === 'by-layer') planned = {...planned, planned: way.size, edges: [...way].map(([id, pts]) => [id, pts.map(p => p.slice())])};
  const drawGroups = arrangement === 'grouped' || arrangement === 'lanes';
  if (drawGroups) G = enclose(D, P, G);
  const pinInfo = applyPins(D, P, G, pins, {bands, bandKey: arrangement === 'by-layer' ? (D.viewBands ? 'viewBand' : 'layer') : arrangement === 'layered' ? 'level' : null});
  if (pinInfo.pinned.length) { way.clear(); if (arrangement === 'by-layer') planned = NO_CORRIDORS(); }
  if (drawGroups) G = enclose(D, P, G);
  const nodes = D.nodes.map(n => ({id: n.id, group: n.group || null, ...P.get(n.id)}));
  const depthOf = g => { let d = 0, p = g.parent; while (p) { d++; p = D.groups.find(x => x.id === p)?.parent; } return d; };
  const groups = drawGroups ? D.groups.map(g => ({id: g.id, ...G.get(g.id), title: g.title, kind: g.kind, sub: g.sub, depth: depthOf(g), parent: g.parent || null})).sort((a, b) => a.depth - b.depth) : [];
  if (positionsOnly) return {nodes, groups, bands, pinned: pinInfo.pinned, droppedPins: pinInfo.dropped};
  const boxes = [...nodes, ...groups];
  const capB = captionBoxes(D, new Map(nodes.map(n => [n.id, n]))), right = Math.ceil(Math.max(...boxes.map(b => b.x + b.w), ...capB.map(b => b.x + b.w))), bottom = Math.ceil(Math.max(...boxes.map(b => b.y + b.h), ...capB.map(b => b.y + b.h), ...bands.map(b => b.y + b.h)));
  const W0 = Math.max(MIN_W, right + NL.LEFT), H0 = bottom + 40;
  // (rc41: a layered band's aspect header stands on its title line, at the right end, 24 px inside the band's right edge. It
  // never widens the picture (the arrival's whole fit depends on the width) and never stands over the top port of a
  // first-row element related to a band above — the header is closed to the router, so it would close the port's way in
  // and the search would open the titles; a header placed mid-line would read as a word of the elements under it — so
  // where the right end is not clear, or not clear of the title as wide as the screen may enlarge it zoomed out
  // (TITLE_GROWTH), the band carries no header.)
  if (arrangement === 'layered') {
    const levelOf = new Map(D.nodes.map(n => [n.id, n.level])), at = new Map(nodes.map(n => [n.id, n]));
    for (const b of bands) {
      const c = b.columns?.[0]; if (!c || c.x != null) continue;
      const own = nodes.filter(n => levelOf.get(n.id) === b.level), top = Math.min(...own.map(n => n.y));
      const fed = own.filter(n => n.y - top < 8 && D.edges.some(e => (e.from === n.id && at.get(e.to)?.y < b.y) || (e.to === n.id && at.get(e.from)?.y < b.y))).sort((p, q) => q.x - p.x);
      const x = W0 - NL.LEFT + 12 - c.w - 24, clear = !fed.some(n => x < n.x + n.w + 6 && x + c.w > n.x - 6);
      if (clear && x >= (b.x ?? NL.LEFT - 12) + 8 + TITLE_GROWTH * (charW(b.title || '', 14) * 1.15 + 18) + 12) c.x = x; else delete b.columns;
    }
  }
  // A picture with a crowd routes its many long connectors on a coarser cell (twice the fine one): the same kind of
  // route at a quarter of the search, so a 134-part board is arranged in well under a second.
  // Bundles (round 10) form only in a routed picture whose arrangement and scene allow them (formBundles says which).
  // A grid scene (round 24, the module map) routes on the fine cell on a page too: its items stand GRID.GAP apart, and a
  // coarser cell could close the gap between two of them.
  // The titles of the lanes and level bands and their aspect headers (rc40, W1) are closed to the router and kept clear
  // of the words, as a container's header is: a line never runs over a title.
  // (measured at the size the screen enlarges them to when the picture stands at 0.8: notation.css keeps a lane title at
  // 11 px and an aspect header at 9 px on screen at any zoom)
  const heads = bands.flatMap(b => (b.collapsed || b.none ? [] : [{x: b.x ?? NL.LEFT - 12, y: b.y, w: Math.round(charW(b.title || '', 14) * 1.15 + 18), h: LANE_HEAD}, ...(b.columns || []).map(c => ({x: c.x - 2, y: c.y, w: c.hw ?? Math.round(charW(c.title || '', 11.5) * 1.2 + 8), h: ASPECT_H}))]));
  const straight = arrangement === 'radial' || large, opts = {straight, direct: large, way, heads, laneOf, trunks: trunkOf, cell: crowds ? NL.CELL * CROWD_CELL : PAGE_ON && !(D.grid && arrangement === 'grouped') ? NL.CELL * 1.5 : null};
  const bundling = consolidate !== false && !straight && !NO_BUNDLE_ARRANGEMENTS.has(arrangement) && !NO_BUNDLE_SCENES.has(D.scene?.id);
  // Large, dense Layers grids spend most of their time exploring equivalent A* cells.
  // Guide the search more firmly toward the destination while retaining every obstacle, cost, fallback, and checker.
  if (arrangement === 'by-layer' && nodes.length >= 60 && D.edges.length >= 100) opts.heuristic = 18;
  // The Running board's dense grouped overview pays for one connector search per displayed relationship. Follow the
  // destination more directly on that grid, with the same blocked cells, crossing costs and fallback checks.
  if (arrangement === 'grouped' && D.scene?.id === 'running-board' && nodes.length >= 100 && D.edges.length >= 100) opts.heuristic = 18;
  const routes = bundling && D.edges.length ? routeConsolidated(D, nodes, groups, D.edges, W0, H0, opts) : {...routeAll(D, nodes, groups, D.edges.map(e => ({...e})), W0, H0, opts), bundles: [], consolidation: NO_CONSOLIDATION()};
  const edges = placeLabels(D, routes.edges, nodes, groups, routes.bundles, heads);
  // A folded Layers picture (rc39): a counted line's word that would land over a box is left out; the line's reading, its
  // hit and the companion carry the count, and the Key says the lines are counted.
  if (D.scene?.id === 'connected' && D.fold) for (const e of edges) if (e.labelBox && !e.labelHidden && nodes.some(n => overlaps(e.labelBox, n))) { e.labelHidden = true; e.labelCovered = true; }
  // On a page, a word placed past its right edge moves back inside it (the route it labels stays where it is), and
  // (round 24) a word placed past its left edge too.
  if (PAGE_ON) for (const e of edges) { const b = e.labelBox, over = b ? b.x + b.w - (NL.PAGE - NL.LEFT) : 0; if (over > 0) { const dx = Math.min(over, b.x); b.x -= dx; e.lx -= dx; } const under = b ? 2 - b.x : 0; if (under > 0) { b.x += under; e.lx += under; } }
  // Printed (round 24 part 3), a word moved inside the page is still clear of every other drawn word and tag, or it is not
  // drawn (labelOverlap, as placeLabels leaves out a word with no clear place).
  if (PRINT_PX) {
    const tags = edges.flatMap(e => tagBoxes(e)), words = [];
    for (const e of edges) {
      const b = e.labelBox; if (!b || e.labelHidden || !(e.label || e.step)) continue;
      // (a counted line's word that a box now covers is left out as placeLabels leaves it out: labelCovered)
      if ((e.fold || e.aggregate) && nodes.some(n => overlaps(b, n))) { e.labelHidden = true; e.labelCovered = true; continue; }
      if (tags.some(t => overlaps(b, t, 1)) || words.some(w => overlaps(b, w, 1))) { e.labelHidden = true; e.labelOverlap = true; continue; }
      words.push(b);
    }
  }
  const labelRight = Math.max(0, ...edges.map(e => (e.labelBox ? e.labelBox.x + e.labelBox.w : 0))), labelBottom = Math.max(0, ...edges.map(e => (e.labelBox ? e.labelBox.y + e.labelBox.h : 0)));
  const notesY = Math.max(bottom, labelBottom) + 20;
  const W = Math.max(W0, Math.ceil(labelRight + NL.LEFT)), H = Math.max(320, notesY + (D.notes.length ? 18 * D.notes.length + 16 : 20));
  return {W, H, notesY, nodes, groups, edges, orderCrossings, bands: bands.map(b => ({...b, x: b.x ?? NL.LEFT - 12, w: b.w ?? W - 2 * NL.LEFT + 24})), arrangement, header: {x: NL.LEFT, y: 14, w: W - 2 * NL.LEFT, h: 46}, through: edges.filter(e => e.through).length, snapReverted: routes.snapReverted, bundles: routes.bundles, consolidation: routes.consolidation, corridors: planned, trunks, pinned: pinInfo.pinned, droppedPins: pinInfo.dropped};
}
