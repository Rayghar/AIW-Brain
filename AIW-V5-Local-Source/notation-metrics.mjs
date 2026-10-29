// Measures of a laid-out diagram, shared by the notation suites, the remediation report and the round-10 line evidence
// (scripts/notation-lines-evidence.mjs). Pure geometry over L (notation-layout.js notationLayout); no DOM.
//
// diagramMetrics(L) (round 2): what each relationship's own route does. Through-passes (an edge run crossing an element
// it does not join), segment-pair crossings, shared runs, labels on elements, on labels and on lines, overlaps, the page.
//
// drawnMetrics(L) (round 10): what the picture DRAWS. A relationship outside a bundle draws its whole route; a bundle
// (L.bundles, round 10: relationships of one line style that share one element and one side of it, or one fact recorded
// twice) draws each of its runs once and each member draws only its own branch. Every number is read from L; the
// definitions, which the evidence and the report cite:
//   paths            drawn pieces with ink: one per relationship outside a bundle, one per bundle run, one per member
//                    branch that has length.
//   markers          end marks drawn (arrowheads, diamonds, dots, circles), by the renderer's own rule (notation-svg.js
//                    svgParts: a head unless ends is 'none', a tail when ends is 'both' or the style has one, and in a
//                    sequence picture a message's tail is never drawn): every member's far-end mark on its branch, plus
//                    the shared-end mark once on the root run and the far-end mark once on each far run (a 'both'
//                    bundle, one fact recorded twice, carries both marks once on its single run).
//   lineEnds         distinct points where a line meets an element (the first and last point of every route).
//   ink              the length inked: the union of the drawn pieces' segments per axis line, each run once, plus any
//                    diagonal segment as drawn (px, rounded).
//   visualCrossings  distinct points (rounded to the pixel) where two drawn pieces of different groups properly cross;
//                    a group is one relationship outside a bundle, or one bundle with its members' branches, so a trunk
//                    crossing a line is one point however many relationships run on it.
//   visualCrossingsDisjoint  the same, counting only pairs of pieces whose relationships share no end element (the
//                    round-2 rule of diagramMetrics.crossings, "shared end: a fan, not a crossing").
//   touches          pairs of segments of different groups that meet without crossing and without running together: an
//                    end or corner of one lying on the other (a T or an L contact).
//   words            relationship words drawn (label or step, not folded).
//   joins            join points recorded by the bundles (where a branch leaves a trunk).
//   bends            interior points of each relationship's whole route where the direction changes, summed.
//   shortSegs        interior segments (neither the first nor the last of a route) shorter than 8 px, summed.
//   foreignShared    shared runs (two relationships on one line for more than 6 px, as diagramMetrics.sharedRuns) over
//                    pairs that are not both members of one bundle that passes bundleIntegrity.
//   sameBundleShared the pairs that foreignShared leaves out because they share a valid bundle's trunk.
//   foreignOnTrunk   pairs of (a segment of a run of 2 or more members, a non-member segment) collinear for more than 6 px.
//   foreignAtJoin    pairs of (a join, a non-member relationship) with a segment within 3 px of the join.
//   tContacts        pairs of (a bundle, a non-member route point) lying within 0.5 px of a run of 2 or more members.
//   tabStops         relationships, each with its own focusable hit (= L.edges.length).
//   bundles, bundled, duplicates   bundles, members in bundles, and bundles that draw one fact recorded twice ('both').
//   fallback, dissolved            from L.consolidation (false, 'duplicates' or 'none'; bundles drawn apart).
//
// corridorMetrics(L) (round 11): the Layers corridors as planned (L.corridors.edges: each connector that spans more than
// one lane with its way points, one per row it crosses, at a slot's x and the row's middle; notation-layout.js byLayer)
// against the elements and the routes as drawn, read from L alone:
//   planned     connectors given a corridor; crossings: their way points (one per row crossed and slotted).
//   followed    way points whose connector's drawn route runs vertically through the point within CORRIDOR_PITCH / 2 px
//               of the slot's x (a route snapped onto its port may stand half a cell off the slot).
//   overfull    gaps of one row holding more corridors than CORRIDOR_SLOTS; the two outer gaps included.
//   offPitch    neighbouring corridors of one gap that are not CORRIDOR_PITCH px apart (in an outer gap, before the
//               first element or after the last, closer than that: there each stands under its own place).
//   onElement   way points inside an element, or nearer an element's side along the row than CORRIDOR_MARGIN px.
//   rows        rows (distinct way-point heights) that hold a corridor.
//
// bundleIntegrity(L) (round 10): every way a bundle can misstate the model or read as a bus, as a list of violations
// {bundle, rule, detail}; an empty list is a valid picture. diagramMetrics.sharedRuns exempts only pairs inside a bundle
// with no violation, so the round-2 shared-run guard (audit/round2/03_DIAGRAMS.md:59, finding D2-12, "which component is
// served by which capability cannot be read"; :88, proposal P2, "bundles a parent's fan-out" in channels) is redefined
// for declared, validated bundles only (round-10 owner decision 1, owner acceptance pending), never weakened.
import {styleOf} from './public/notation-palette.js';
import {STRAIGHT_EDGES, lineStyle, sameFact, qualifierOf, tagBoxes} from './public/notation-layout.js';

// A label's box from its text at the font size it is drawn in (8.5 px before round 2, 10 px since),
// measured by the same character widths for every picture, so the numbers compare.
const charW = (s, px) => { let w = 0; for (const ch of String(s)) w += /[A-Z]/.test(ch) ? px * 0.68 : /[mw]/.test(ch) ? px * 0.82 : /[il.,:;'| ]/.test(ch) ? px * 0.3 : /[0-9]/.test(ch) ? px * 0.56 : px * 0.54; return w; };
export const labelBox = (e, px = 10) => { const s = (e.step ? e.step + ' ' : '') + (e.label || ''); if (!s || e.labelHidden) return null; const w = Math.max(10, charW(s, px) + 4); return {x: e.lx - w / 2, y: e.ly - 4 - px * 0.85, w, h: px * 1.05, id: e.id}; };
const hits = (x1, y1, x2, y2, b, m = 1) => Math.min(x1, x2) < b.x + b.w - m && Math.max(x1, x2) > b.x + m && Math.min(y1, y2) < b.y + b.h - m && Math.max(y1, y2) > b.y + m;
const over = (a, b, m = 0) => a.x < b.x + b.w - m && b.x < a.x + a.w - m && a.y < b.y + b.h - m && b.y < a.y + a.h - m;
const orient = (ax, ay, bx, by, cx, cy) => Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
function segmentsCross(a, b) {
  const [[x1, y1], [x2, y2]] = a, [[x3, y3], [x4, y4]] = b;
  if (Math.max(x1, x2) < Math.min(x3, x4) || Math.max(x3, x4) < Math.min(x1, x2) || Math.max(y1, y2) < Math.min(y3, y4) || Math.max(y3, y4) < Math.min(y1, y2)) return false;
  const o1 = orient(x1, y1, x2, y2, x3, y3), o2 = orient(x1, y1, x2, y2, x4, y4), o3 = orient(x3, y3, x4, y4, x1, y1), o4 = orient(x3, y3, x4, y4, x2, y2);
  return o1 !== o2 && o3 !== o4 && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0;
}
// The bundles of L that pass bundleIntegrity (null when L has none, so a picture without bundles measures as before).
const validBundles = (L, opts) => {
  if (!L.bundles?.length) return null;
  const bad = new Set(bundleIntegrity(L, opts).map(v => v.bundle));
  return new Set(L.bundles.map(b => b.id).filter(id => !bad.has(id)));
};
const exempt = (valid, a, b) => !!(valid && a.bundle && a.bundle === b.bundle && valid.has(a.bundle));
export function diagramMetrics(L, {margin = 1, px = 10, scene = null} = {}) {
  const nodes = L.nodes;
  let through = 0, crossings = 0, labelOnNode = 0, labelOnLabel = 0, labelOnEdge = 0;
  const runs = [];
  for (const e of L.edges) {
    for (let i = 1; i < e.pts.length; i++) {
      const [x1, y1] = e.pts[i - 1], [x2, y2] = e.pts[i];
      runs.push({e, seg: [[x1, y1], [x2, y2]]});
      for (const n of nodes) if (n.id !== e.from && n.id !== e.to && hits(x1, y1, x2, y2, n, margin)) { through++; break; }
    }
  }
  for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) {
    const a = runs[i], b = runs[j];
    if (a.e === b.e) continue;
    if (a.e.from === b.e.from || a.e.to === b.e.to || a.e.from === b.e.to || a.e.to === b.e.from) continue; // shared end: a fan, not a crossing
    if (segmentsCross(a.seg, b.seg)) crossings++;
  }
  // Shared runs: two connectors drawn on the same line for more than a few pixels, so the eye cannot
  // tell them apart (the bus the old router drew); a fan from one end is counted too. Round 10: two members of one
  // declared bundle that passes bundleIntegrity share their trunk by design (one line, one mark, a join where each
  // leaves) and are not counted; any other pair is (the header cites the round-2 finding and the owner decision).
  const valid = validBundles(L, {scene});
  let sharedRuns = 0;
  for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) {
    const a = runs[i], b = runs[j]; if (a.e === b.e || exempt(valid, a.e, b.e)) continue;
    const [[ax1, ay1], [ax2, ay2]] = a.seg, [[bx1, by1], [bx2, by2]] = b.seg;
    if (ay1 === ay2 && by1 === by2 && Math.abs(ay1 - by1) < 1) { const lo = Math.max(Math.min(ax1, ax2), Math.min(bx1, bx2)), hi = Math.min(Math.max(ax1, ax2), Math.max(bx1, bx2)); if (hi - lo > 6) sharedRuns++; }
    else if (ax1 === ax2 && bx1 === bx2 && Math.abs(ax1 - bx1) < 1) { const lo = Math.max(Math.min(ay1, ay2), Math.min(by1, by2)), hi = Math.min(Math.max(ay1, ay2), Math.max(by1, by2)); if (hi - lo > 6) sharedRuns++; }
  }
  const labels = L.edges.map(e => labelBox(e, px)).filter(Boolean);
  for (const l of labels) { if (nodes.some(n => over(l, n))) labelOnNode++; }
  for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) if (over(labels[i], labels[j])) labelOnLabel++;
  // A word on a qualifier or a cardinality tag counts as a word on a word (the review of round 10).
  const tags = L.edges.flatMap(e => tagBoxes(e));
  for (const l of labels) for (const t of tags) if (over(l, t)) labelOnLabel++;
  for (const l of labels) for (const r of runs) { if (r.e.id === l.id) continue; const [[x1, y1], [x2, y2]] = r.seg; if (hits(x1, y1, x2, y2, l, 0)) { labelOnEdge++; break; } }
  let nodeOverlaps = 0;
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) if (over(nodes[i], nodes[j], 1)) nodeOverlaps++;
  // A label that leaves the page, or an element outside its group, is a defect too.
  let outside = 0;
  for (const g of L.groups || []) for (const n of nodes) if (n.group === g.id && !(n.x >= g.x && n.y >= g.y && n.x + n.w <= g.x + g.w && n.y + n.h <= g.y + g.h)) outside++;
  return {nodes: nodes.length, edges: L.edges.length, W: L.W, H: L.H, through, crossings, sharedRuns, labelOnNode, labelOnLabel, labelOnEdge, nodeOverlaps, outside};
}

// ---------------------------------------------------------------- round 10: what is drawn, and bundle integrity
// The thresholds the definitions above name, frozen.
// HUG, HUG_RUN, DETOUR, DETOUR_PAD, JOIN_ELEMENT and JOIN_GAP (the round-10 review) are BUNDLE's in notation-layout.js;
// CORRIDOR_SPAN, CORRIDOR_SLOTS, CORRIDOR_PITCH and CORRIDOR_MARGIN (round 11, the Layers corridors) are CORRIDOR's
// there (a connector SPAN lanes apart or more; SLOTS slots a gap, PITCH px apart, MARGIN px from either element).
export const DRAWN = Object.freeze({RUN: 6, JOIN_CLEAR: 3, ON_RUN: 0.5, SHORT: 8, ROOT: 12, REJOIN: 1, TOL: 0.5, HUG: 12, HUG_RUN: 16, DETOUR: 1.5, DETOUR_PAD: 40, JOIN_ELEMENT: 12, JOIN_GAP: 10, CORRIDOR_SPAN: 2, CORRIDOR_SLOTS: 4, CORRIDOR_PITCH: 8, CORRIDOR_MARGIN: 24});
// Fans never form on ArchiMate Flow or Triggering relationships, nor on the dynamic families (a join would read as a
// fork or a merge the model does not record); one fact recorded twice may be drawn once in any family.
const DYNAMIC = new Set(['flow', 'sequence', 'message', 'path']);
const fanExcluded = e => { const st = styleOf(e.kind); return st.archimate === 'Flow' || st.archimate === 'Triggering' || DYNAMIC.has(e.family || st.family); };
// Composition and aggregation fans split as a plain T under one diamond, and so do kinds whose own end mark is a dot
// (a join dot there would read as the mark): such a bundle is undotted, and it must never split four ways.
export const undottedKind = kind => { const st = styleOf(kind); return st.archimate === 'Composition' || st.archimate === 'Aggregation' || st.head === 'dot' || st.tail === 'dot'; };
// The marks the renderer draws at each end of a relationship (notation-svg.js svgParts).
function endMarks(e, sequence) {
  const base = styleOf(e.kind), st = sequence && e.kind === 'message' ? {head: e.reply ? 'open' : 'filled', tail: 'none'} : base;
  return {head: e.ends !== 'none' && st.head !== 'none' ? 1 : 0, tail: e.ends === 'both' || st.tail !== 'none' ? 1 : 0};
}
const ptKey = p => p[0] + ',' + p[1];
const samePt = (a, b, tol = DRAWN.TOL) => !!a && !!b && Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol;
const segsOf = P => { const o = []; for (let i = 1; i < (P || []).length; i++) { const a = P[i - 1], b = P[i]; if (a[0] !== b[0] || a[1] !== b[1]) o.push([a, b]); } return o; };
const lineKey = ([[x1, y1], [x2, y2]]) => (y1 === y2 ? 'h' + y1 : x1 === x2 ? 'v' + x1 : null);
const spanOf = ([[x1, y1], [x2, y2]]) => (y1 === y2 ? [Math.min(x1, x2), Math.max(x1, x2)] : [Math.min(y1, y2), Math.max(y1, y2)]);
const overlapLen = (s, t) => { const k = lineKey(s); if (!k || k !== lineKey(t)) return 0; const [a, b] = spanOf(s), [c, d] = spanOf(t); return Math.min(b, d) - Math.max(a, c); };
const distToSeg = ([px, py], [[x1, y1], [x2, y2]]) => { const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy; const t = l2 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2)) : 0; return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)); };
const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const pointOn = (p, s) => distToSeg(p, s) <= DRAWN.TOL;
const polyLen = P => { let t = 0; for (let i = 1; i < (P || []).length; i++) t += len(P[i - 1], P[i]); return t; };
const unit = (a, b) => { const l = len(a, b); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
const sameDir = (u, v) => Math.abs(u[0] - v[0]) < 1e-6 && Math.abs(u[1] - v[1]) < 1e-6;
const dirKey = u => Math.round(u[0] * 1000) / 1000 + ',' + Math.round(u[1] * 1000) / 1000;
// A route without repeated points or straight-through points (a reversal is kept), so two routes compare by shape.
function cleanPts(P) {
  const d = []; for (const p of P || []) if (!d.length || !samePt(d[d.length - 1], p, 1e-6)) d.push(p);
  if (d.length < 3) return d;
  const o = [d[0]];
  for (let i = 1; i < d.length - 1; i++) { const a = o[o.length - 1], b = d[i], c = d[i + 1], cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]), dot = (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]); if (Math.abs(cr) < 1e-6 && dot > 0) continue; o.push(b); }
  o.push(d[d.length - 1]); return o;
}
const samePolyline = (A, B) => A.length === B.length && A.every((p, i) => samePt(p, B[i]));
// The length two routes from one start run together before they part.
function commonPrefix(A, B) {
  if (!A?.length || !B?.length || !samePt(A[0], B[0])) return 0;
  let i = 1, j = 1, cur = A[0], t = 0;
  while (i < A.length && j < B.length) {
    const ra = len(cur, A[i]), rb = len(cur, B[j]);
    if (ra < 1e-9) { i++; continue; } if (rb < 1e-9) { j++; continue; }
    const ua = unit(cur, A[i]), ub = unit(cur, B[j]); if (!sameDir(ua, ub)) break;
    const s = Math.min(ra, rb); t += s;
    if (ra - s < 1e-9) { cur = A[i]; i++; } else cur = [cur[0] + ua[0] * s, cur[1] + ua[1] * s];
    if (rb - s < 1e-9) j++;
  }
  return t;
}
const pointAt = (P, t) => { let acc = 0; for (let i = 1; i < P.length; i++) { const l = len(P[i - 1], P[i]); if (acc + l >= t - 1e-9) { const u = l ? (t - acc) / l : 0; return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * u, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * u]; } acc += l; } return P[P.length - 1]; };
// The part of a route after a length along it.
const tailFrom = (P, t) => { const out = [pointAt(P, t)]; let acc = 0; for (let i = 1; i < P.length; i++) { acc += len(P[i - 1], P[i]); if (acc > t + 1e-9) out.push(P[i]); } return cleanPts(out); };
// Two routes run together for more than `min` px somewhere (collinear, axis-aligned).
const runTogether = (A, B, min) => { for (const s of segsOf(A)) for (const t of segsOf(B)) if (overlapLen(s, t) > min) return true; return false; };
// Where a port point sits on its element: the side it is on.
const faceOf = (p, n) => (!p || !n ? null : Math.abs(p[1] - (n.y + n.h)) <= DRAWN.TOL ? 'bottom' : Math.abs(p[1] - n.y) <= DRAWN.TOL ? 'top' : Math.abs(p[0] - n.x) <= DRAWN.TOL ? 'left' : Math.abs(p[0] - (n.x + n.w)) <= DRAWN.TOL ? 'right' : null);
// The line style and the fact are the layout's own (notation-layout.js lineStyle, sameFact: the word and the qualifier
// in full, not as the picture shortens them), so what the checker calls one fact is what the layout drew as one.
const styleWords = ['kind', 'word', 'ends', 'weak', 'reply', 'change'];
// The sides of a box a route runs along (parallel, outside, within `hug` px, over `run` px of the side's span).
const hugs = (Q, b, hug = DRAWN.HUG, run = DRAWN.HUG_RUN) => {
  const sides = new Set();
  for (const [[x1, y1], [x2, y2]] of segsOf(Q)) {
    if (Math.abs(y1 - y2) <= DRAWN.TOL) { if (Math.min(Math.max(x1, x2), b.x + b.w) - Math.max(Math.min(x1, x2), b.x) < run) continue; if (y1 <= b.y + DRAWN.TOL && b.y - y1 <= hug) sides.add('top'); else if (y1 >= b.y + b.h - DRAWN.TOL && y1 - b.y - b.h <= hug) sides.add('bottom'); }
    else if (Math.abs(x1 - x2) <= DRAWN.TOL) { if (Math.min(Math.max(y1, y2), b.y + b.h) - Math.max(Math.min(y1, y2), b.y) < run) continue; if (x1 <= b.x + DRAWN.TOL && b.x - x1 <= hug) sides.add('left'); else if (x1 >= b.x + b.w - DRAWN.TOL && x1 - b.x - b.w <= hug) sides.add('right'); }
  }
  return [...sides];
};
// A picture drawn with straight lines (radial, or above the straight-mode thresholds of notationLayout: by layer above
// 160 connectors or 120 elements, any arrangement above STRAIGHT_EDGES), or an arrangement or scene that never bundles.
export const largeStraight = L => (L.arrangement === 'by-layer' && (L.edges.length > 160 || L.nodes.length > 120)) || L.edges.length > STRAIGHT_EDGES;
const NO_BUNDLE_ARRANGEMENTS = new Set(['sequence', 'lanes', 'radial']), NO_BUNDLE_SCENES = new Set(['process', 'sequence']);

// The pieces a picture draws, each with the group it belongs to (a relationship, or a bundle with its members' branches),
// the end elements of the relationships it carries, and the marks it carries.
function drawnPieces(L, sequence) {
  const bundles = new Map((L.bundles || []).map(b => [b.id, b])), byId = new Map(L.edges.map(e => [e.id, e])), pieces = [];
  for (const e of L.edges) {
    const m = endMarks(e, sequence), b = e.bundle && bundles.get(e.bundle)?.members?.includes(e.id) ? bundles.get(e.bundle) : null;
    if (!b) { pieces.push({grp: 'e\u0001' + e.id, pts: e.pts, ends: [e.from, e.to], marks: m.head + m.tail}); continue; }
    const far = b.end === 'from' ? m.head : b.end === 'to' ? m.tail : 0;
    if (e.branch && e.branch.length > 1 && polyLen(e.branch) > 0) pieces.push({grp: 'b\u0001' + b.id, pts: e.branch, ends: [e.from, e.to], marks: far});
  }
  for (const b of bundles.values()) {
    const rep = byId.get(b.members?.[0]); if (!rep) continue;
    const m = endMarks(rep, sequence), shared = b.end === 'to' ? m.head : b.end === 'from' ? m.tail : m.head, far = b.end === 'to' ? m.tail : b.end === 'from' ? m.head : m.tail;
    for (const r of b.runs || []) {
      const ends = [...new Set((r.members || []).flatMap(id => { const e = byId.get(id); return e ? [e.from, e.to] : []; }))];
      pieces.push({grp: 'b\u0001' + b.id, pts: r.pts, ends, marks: (r.root ? shared : 0) + (r.far ? far : 0)});
    }
  }
  return pieces;
}
function inkOf(segs) {
  const lines = new Map(); let diag = 0;
  for (const [[x1, y1], [x2, y2]] of segs) { const k = y1 === y2 ? 'h' + y1 : x1 === x2 ? 'v' + x1 : null; if (!k) { diag += Math.hypot(x2 - x1, y2 - y1); continue; } if (!lines.has(k)) lines.set(k, []); lines.get(k).push(y1 === y2 ? [Math.min(x1, x2), Math.max(x1, x2)] : [Math.min(y1, y2), Math.max(y1, y2)]); }
  let t = diag;
  for (const iv of lines.values()) { iv.sort((a, b) => a[0] - b[0]); let [s, e] = iv[0]; for (let i = 1; i < iv.length; i++) { if (iv[i][0] <= e) e = Math.max(e, iv[i][1]); else { t += e - s; [s, e] = iv[i]; } } t += e - s; }
  return Math.round(t);
}
// Proper crossings (distinct points) and touches between pieces of different groups, by a sweep over x.
function crossingsOf(pieces) {
  const all = [];
  for (const p of pieces) for (const s of segsOf(p.pts)) all.push({p, s, x1: Math.min(s[0][0], s[1][0]), x2: Math.max(s[0][0], s[1][0]), y1: Math.min(s[0][1], s[1][1]), y2: Math.max(s[0][1], s[1][1])});
  all.sort((a, b) => a.x1 - b.x1 || a.y1 - b.y1);
  const pts = new Set(), disjoint = new Set(); let touches = 0;
  const onBox = ([x, y], r) => x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2;
  for (let i = 0; i < all.length; i++) {
    const a = all[i];
    for (let j = i + 1; j < all.length && all[j].x1 <= a.x2; j++) {
      const b = all[j]; if (a.p.grp === b.p.grp || b.y1 > a.y2 || b.y2 < a.y1) continue;
      const [[x1, y1], [x2, y2]] = a.s, [[x3, y3], [x4, y4]] = b.s;
      const o1 = orient(x1, y1, x2, y2, x3, y3), o2 = orient(x1, y1, x2, y2, x4, y4), o3 = orient(x3, y3, x4, y4, x1, y1), o4 = orient(x3, y3, x4, y4, x2, y2);
      if (o1 && o2 && o3 && o4 && o1 !== o2 && o3 !== o4) {
        const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4); if (!d) continue;
        const k = Math.round(((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / d) + ',' + Math.round(((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / d);
        pts.add(k); if (!a.p.ends.some(n => b.p.ends.includes(n))) disjoint.add(k);
      } else if (!(o1 === 0 && o2 === 0) && ((o1 === 0 && onBox(b.s[0], a)) || (o2 === 0 && onBox(b.s[1], a)) || (o3 === 0 && onBox(a.s[0], b)) || (o4 === 0 && onBox(a.s[1], b)))) touches++;
    }
  }
  return {visualCrossings: pts.size, visualCrossingsDisjoint: disjoint.size, touches};
}
// Shared runs over every pair of relationship segments on one line for more than 6 px (diagramMetrics.sharedRuns, by
// buckets so a large picture is measured quickly), split into pairs inside one valid bundle and the rest.
function sharedRunsOf(L, valid) {
  const H = new Map(), V = new Map(), put = (M, k, x) => { if (!M.has(k)) M.set(k, []); M.get(k).push(x); };
  for (const e of L.edges) for (let i = 1; i < e.pts.length; i++) {
    const [x1, y1] = e.pts[i - 1], [x2, y2] = e.pts[i];
    if (y1 === y2) put(H, Math.floor(y1), {e, c: y1, lo: Math.min(x1, x2), hi: Math.max(x1, x2)});
    else if (x1 === x2) put(V, Math.floor(x1), {e, c: x1, lo: Math.min(y1, y2), hi: Math.max(y1, y2)});
  }
  let foreign = 0, same = 0;
  const pair = (a, b) => { if (a.e === b.e || Math.abs(a.c - b.c) >= 1 || Math.min(a.hi, b.hi) - Math.max(a.lo, b.lo) <= DRAWN.RUN) return; if (exempt(valid, a.e, b.e)) same++; else foreign++; };
  for (const M of [H, V]) for (const [k, list] of M) { for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) pair(list[i], list[j]); for (const b of M.get(k + 1) || []) for (const a of list) pair(a, b); }
  return {foreign, same};
}
// Foreign lines against one bundle's trunk: collinear with a run of 2 or more members, near a join, or with a route
// point on such a run.
function foreignOf(L, b, lines) {
  const mem = new Set(b.members || []), trunks = (b.runs || []).filter(r => (r.members || []).length >= 2), out = {onTrunk: 0, atJoin: 0, tContacts: 0, examples: {onTrunk: [], atJoin: [], tContacts: []}};
  const note = (k, s) => { if (out.examples[k].length < 3) out.examples[k].push(s); };
  for (const r of trunks) for (const s of segsOf(r.pts)) { const k = lineKey(s); for (const o of (k && lines.get(k)) || []) if (!mem.has(o.e.id) && overlapLen(s, o.s) > DRAWN.RUN) { out.onTrunk++; note('onTrunk', o.e.id + ' runs along the trunk at ' + ptKey(s[0])); } }
  const trunkSegs = trunks.flatMap(r => segsOf(r.pts));
  for (const e of L.edges) {
    if (mem.has(e.id)) continue;
    const segs = segsOf(e.pts);
    for (const j of b.joins || []) if (segs.some(s => distToSeg(j, s) <= DRAWN.JOIN_CLEAR)) { out.atJoin++; note('atJoin', e.id + ' passes the join at ' + ptKey(j)); }
    for (const v of e.pts) if (trunkSegs.some(s => distToSeg(v, s) <= DRAWN.ON_RUN)) { out.tContacts++; note('tContacts', e.id + ' has a point on the trunk at ' + ptKey(v)); }
  }
  return out;
}
const lineIndex = L => { const lines = new Map(); for (const e of L.edges) for (const s of segsOf(e.pts)) { const k = lineKey(s); if (!k) continue; if (!lines.has(k)) lines.set(k, []); lines.get(k).push({e, s}); } return lines; };

export function drawnMetrics(L, {sequence = L.arrangement === 'sequence', scene = null} = {}) {
  const pieces = drawnPieces(L, sequence), segs = pieces.flatMap(p => segsOf(p.pts));
  const ends = new Set(); for (const e of L.edges) if (e.pts?.length) { ends.add(ptKey(e.pts[0])); ends.add(ptKey(e.pts[e.pts.length - 1])); }
  let bends = 0, shortSegs = 0;
  for (const e of L.edges) {
    const p = (e.pts || []).filter((q, i, a) => !i || q[0] !== a[i - 1][0] || q[1] !== a[i - 1][1]);
    for (let i = 1; i + 1 < p.length; i++) { const a = p[i - 1], b = p[i], c = p[i + 1]; if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) bends++; }
    for (let i = 2; i < p.length - 1; i++) if (Math.abs(p[i][0] - p[i - 1][0]) + Math.abs(p[i][1] - p[i - 1][1]) < DRAWN.SHORT) shortSegs++;
  }
  const valid = validBundles(L, {scene}), shared = sharedRunsOf(L, valid), lines = L.bundles?.length ? lineIndex(L) : null;
  let foreignOnTrunk = 0, foreignAtJoin = 0, tContacts = 0;
  for (const b of L.bundles || []) { const f = foreignOf(L, b, lines); foreignOnTrunk += f.onTrunk; foreignAtJoin += f.atJoin; tContacts += f.tContacts; }
  const C = L.consolidation || {}, dissolved = Array.isArray(C.dissolved) ? C.dissolved.length : Number(C.dissolved) || 0;
  return {
    paths: pieces.filter(p => segsOf(p.pts).length).length, markers: pieces.reduce((t, p) => t + p.marks, 0), lineEnds: ends.size, ink: inkOf(segs),
    ...crossingsOf(pieces), words: L.edges.filter(e => (e.label || e.step) && !e.labelHidden).length,
    joins: (L.bundles || []).reduce((t, b) => t + (b.joins || []).length, 0), bends, shortSegs,
    foreignShared: shared.foreign, sameBundleShared: shared.same, foreignOnTrunk, foreignAtJoin, tContacts, tabStops: L.edges.length,
    bundles: (L.bundles || []).length, bundled: L.edges.filter(e => e.bundle).length, duplicates: (L.bundles || []).filter(b => b.end === 'both').length,
    fallback: C.fallback || false, dissolved
  };
}

// Every way a bundle can misstate the model or read as a bus. `scene` is the picture's scene id when the caller knows
// it (BPMN process and sequence pictures never bundle); `control` is the same picture laid out without bundles when
// the caller has it (notationLayout with consolidate false), against which a member's detour is measured.
export function bundleIntegrity(L, {scene = null, control = null} = {}) {
  const out = [], v = (bundle, rule, detail) => out.push({bundle, rule, detail});
  const bundles = L.bundles || [];
  const index = new Map(L.edges.map((e, i) => [e.id, i])), byId = new Map(L.edges.map(e => [e.id, e])), node = new Map((L.nodes || []).map(n => [n.id, n]));
  const known = new Set(bundles.map(b => b.id)), owner = new Map();
  for (const e of L.edges) if (e.bundle && !known.has(e.bundle)) v(e.bundle, 'members', e.id + ' names a bundle the picture does not hold');
  if (!bundles.length) return out;
  const lines = lineIndex(L);
  for (const b of bundles) {
    const id = b.id, ids = b.members || [], members = ids.map(m => byId.get(m));
    if (!['to', 'from', 'both'].includes(b.end)) { v(id, 'shared-end', 'end is ' + b.end); continue; }
    if (ids.length < 2) v(id, 'members', 'a bundle of ' + ids.length);
    if (new Set(ids).size !== ids.length) v(id, 'members', 'a member is listed twice');
    if (members.some(e => !e)) { v(id, 'members', 'names a relationship the picture does not hold: ' + ids.filter(m => !byId.has(m)).join(', ')); continue; }
    for (const e of members) { if (owner.has(e.id) && owner.get(e.id) !== id) v(id, 'members', e.id + ' is also in ' + owner.get(e.id)); owner.set(e.id, id); if (e.bundle !== id) v(id, 'members', e.id + ' names ' + (e.bundle || 'no bundle')); if (e.bundleEnd !== b.end) v(id, 'members', e.id + ' ends ' + e.bundleEnd + ', the bundle ' + b.end); }
    for (const e of L.edges) if (e.bundle === id && !ids.includes(e.id)) v(id, 'members', e.id + ' names the bundle but is not listed');
    if (ids.some((m, i) => i && index.get(m) < index.get(ids[i - 1]))) v(id, 'members', 'members are not in the picture order');
    // Excluded arrangements, scenes, kinds and marks.
    if (NO_BUNDLE_ARRANGEMENTS.has(L.arrangement)) v(id, 'excluded', 'the ' + L.arrangement + ' arrangement never bundles');
    if (scene && NO_BUNDLE_SCENES.has(scene)) v(id, 'excluded', 'the ' + scene + ' picture never bundles');
    if (largeStraight(L)) v(id, 'excluded', 'a picture drawn straight never bundles');
    for (const e of members) { const why = e.step ? 'a numbered step' : e.cardinality ? 'a cardinality' : e.crossing ? 'a crossing mark' : e.from === e.to ? 'a self relationship' : b.end !== 'both' && fanExcluded(e) ? 'a ' + e.kind + ' relationship (no joins on flow or triggering)' : null; if (why) v(id, 'excluded', e.id + ' is ' + why); }
    // One line style, the qualifier where it sits at the shared end (near the source), and the bundle's own record.
    const rep = members[0], key = lineStyle(rep);
    for (const e of members.slice(1)) { const k = lineStyle(e); if (k !== key) { const a = key.split('\u0002'), c = k.split('\u0002'); v(id, 'style', e.id + ' differs in ' + styleWords.filter((_, i) => a[i] !== c[i]).join(', ')); } }
    // rc41 (W1; PLAN §2 W1.5): a fan-out's members share their source end, so a qualifier there is one for all of them: they
    // carry the same one and it is written once (was: no qualifier at a fan-out's shared source end at all).
    if (b.end === 'from' && members.some(e => qualifierOf(e) !== qualifierOf(rep))) v(id, 'style', 'the members differ in the qualifier at their shared source end');
    if (b.end === 'from' && rep.qualifier && members.filter(e => !e.qualifierHidden).length !== 1) v(id, 'style', 'the shared qualifier is written ' + members.filter(e => !e.qualifierHidden).length + ' times at the shared source end');
    if (b.end === 'both' && members.some(e => qualifierOf(e) !== qualifierOf(rep))) v(id, 'style', 'the records differ in their qualifier');
    if (b.kind !== undefined && b.kind !== rep.kind) v(id, 'style', 'the bundle says ' + b.kind + ', its members ' + rep.kind);
    if (b.label !== undefined && (b.label || '') !== (rep.label || '')) v(id, 'style', 'the bundle word differs from its members');
    if (b.family !== undefined && b.family !== (rep.family || styleOf(rep.kind).family)) v(id, 'style', 'the bundle family differs from its members');
    const undotted = undottedKind(rep.kind);
    if (b.dotted !== undefined && b.dotted !== (b.end !== 'both' && !undotted)) v(id, 'style', 'dotted is ' + b.dotted + ' for a ' + rep.kind + ' ' + b.end + ' bundle');
    // One shared element, one side of it, one port.
    const P = members.map(e => (b.end === 'to' ? e.pts.slice().reverse() : e.pts.slice())), C = cleanPts;
    if (b.end === 'both') {
      if (members.some(e => e.from !== rep.from || e.to !== rep.to)) v(id, 'shared-end', 'the records do not join the same two elements');
      if (members.some(e => !samePolyline(C(e.pts), C(rep.pts)))) v(id, 'shared-end', 'the records are not drawn on one route');
    } else {
      const nid = b.node ?? (b.end === 'to' ? rep.to : rep.from), n = node.get(nid), port = P[0][0];
      for (const e of members) if ((b.end === 'to' ? e.to : e.from) !== nid) v(id, 'shared-end', e.id + ' does not ' + (b.end === 'to' ? 'end at ' : 'start at ') + nid);
      P.forEach((p, i) => { if (!samePt(p[0], port)) v(id, 'shared-end', members[i].id + ' leaves ' + nid + ' by another port'); });
      const face = faceOf(port, n);
      if (!face) v(id, 'shared-end', 'the port ' + (port ? ptKey(port) : '?') + ' is not on a side of ' + nid);
      else if (b.face !== undefined && b.face !== face) v(id, 'shared-end', 'the port is on the ' + face + ' side, the bundle says ' + b.face);
    }
    // Through-passes.
    for (const e of members) { let thr = !!e.through; if (!thr) for (const s of segsOf(e.pts)) { const [[x1, y1], [x2, y2]] = s; if ((L.nodes || []).some(n => n.id !== e.from && n.id !== e.to && hits(x1, y1, x2, y2, n, 1))) { thr = true; break; } } if (thr) v(id, 'through', e.id + ' passes through an element'); }
    // A member round its shared element (along two of its sides), or DETOUR times its route in the control.
    if (b.end !== 'both') {
      const shared = node.get(b.node ?? (b.end === 'to' ? rep.to : rep.from));
      if (shared) members.forEach((e, u) => { const s = hugs(P[u], shared); if (s.length >= 2) v(id, 'encircle', e.id + ' runs along the ' + s.join(' and ') + ' sides of ' + shared.id); });
      if (control) { const ctl = new Map((control.edges || []).map(e => [e.id, polyLen(e.pts || [])])); members.forEach((e, u) => { const c = ctl.get(e.id); if (c && polyLen(P[u]) > DRAWN.DETOUR * c + DRAWN.DETOUR_PAD) v(id, 'detour', e.id + ' is ' + Math.round(polyLen(P[u])) + ' px, ' + Math.round(c) + ' px drawn apart'); }); }
    }
    // The routes from the shared end: where each pair parts (a split), the root they share, and no rejoining.
    const n = members.length, splits = [], lens = P.map(polyLen);
    let root = Infinity;
    for (let u = 0; u < n; u++) for (let w = u + 1; w < n; w++) {
      const c = commonPrefix(P[u], P[w]); root = Math.min(root, c);
      const endU = lens[u] - c < 1e-6, endW = lens[w] - c < 1e-6;
      // Two records of one fact (same ends, line style and qualifier) may ride one route inside a fan; nothing else may.
      if (endU && endW) { if (b.end !== 'both' && !sameFact(members[u], members[w])) v(id, 'tree', members[u].id + ' and ' + members[w].id + ' are drawn on one route without being one fact'); continue; }
      if (b.end === 'both') continue;
      if (endU || endW) { v(id, 'tree', (endU ? members[u].id : members[w].id) + ' ends on the route of ' + (endU ? members[w].id : members[u].id)); continue; }
      if (c <= 0) continue;
      const s = pointAt(P[u], c); if (!splits.some(q => samePt(q, s))) splits.push(s);
      if (runTogether(tailFrom(P[u], c), tailFrom(P[w], c), DRAWN.REJOIN)) v(id, 'rejoin', members[u].id + ' and ' + members[w].id + ' run together again after they part');
    }
    if (b.end !== 'both' && n > 1 && root < DRAWN.ROOT) v(id, 'root', 'the shared root is ' + Math.round(root) + ' px (at least ' + DRAWN.ROOT + ')');
    // A join at every split and nowhere else.
    const joins = b.joins || [];
    for (const s of splits) if (!joins.some(j => samePt(j, s))) v(id, 'join', 'the split at ' + ptKey(s.map(Math.round)) + ' has no join');
    for (const j of joins) if (!splits.some(s => samePt(j, s))) v(id, 'join', 'the join at ' + ptKey(j) + ' is not at a split');
    // No join within JOIN_ELEMENT px of an element (a dot there reads as leaving it, or sits in a branch's own head, and
    // the element's mark badge would hide it; an undotted bundle's plain T may stand where the trunk drops into an
    // element a member through the join enters), none closer than JOIN_GAP px to another, and no bend within JOIN_GAP
    // px of a join on any route through it (the turn at the join itself is the branch leaving).
    const M = DRAWN.JOIN_ELEMENT, G = DRAWN.JOIN_GAP, dotted = b.end !== 'both' && !undotted, through = j => members.filter((e, u) => segsOf(P[u]).some(s => pointOn(j, s)));
    for (const j of joins) {
      const own = dotted ? new Set() : new Set(through(j).map(e => (b.end === 'to' ? e.from : e.to)));
      const el = (L.nodes || []).find(q => !own.has(q.id) && j[0] > q.x - M && j[0] < q.x + q.w + M && j[1] > q.y - M && j[1] < q.y + q.h + M);
      if (el) v(id, 'join-near-element', 'the join at ' + ptKey(j) + ' is within ' + M + ' px of ' + el.id);
    }
    for (let i = 0; i < joins.length; i++) for (let k = i + 1; k < joins.length; k++) if (len(joins[i], joins[k]) < G) v(id, 'join-gap', 'the joins at ' + ptKey(joins[i]) + ' and ' + ptKey(joins[k]) + ' are closer than ' + G + ' px');
    for (const j of joins) for (const p of P) {
      const pts = cleanPts(p); let bent = false;
      for (let i = 1; i + 1 < pts.length && !bent; i++) { const a = pts[i - 1], q = pts[i], c = pts[i + 1]; if (samePt(q, j)) continue; if ((pointOn(j, [a, q]) && len(j, q) < G) || (pointOn(j, [q, c]) && len(q, j) < G)) bent = true; }
      if (bent) { v(id, 'join-gap', 'a bend within ' + G + ' px of the join at ' + ptKey(j)); break; }
    }
    // An undotted bundle splits only as a T.
    if (undotted && b.end !== 'both') for (const s of splits) {
      const dirs = new Set();
      for (const p of P) for (const [a, c] of segsOf(p)) { if (distToSeg(s, [a, c]) > DRAWN.TOL) continue; if (samePt(s, a)) dirs.add(dirKey(unit(a, c))); else if (samePt(s, c)) dirs.add(dirKey(unit(c, a))); else { dirs.add(dirKey(unit(a, c))); dirs.add(dirKey(unit(c, a))); } }
      if (dirs.size >= 4) v(id, 'four-way', 'a ' + rep.kind + ' bundle splits four ways at ' + ptKey(s.map(Math.round)));
    }
    // The runs: one root at the port holding every member, member sets nested, and each member's runs, in order from
    // the root, then its own branch, give exactly its route.
    const runs = (b.runs || []).filter(r => (r.pts || []).length > 1);
    const roots = runs.filter(r => r.root);
    if (roots.length !== 1) v(id, 'tree', roots.length + ' root runs');
    else { const r = roots[0]; if ((r.members || []).length !== n || ids.some(m => !r.members.includes(m))) v(id, 'tree', 'the root run does not hold every member'); if (!samePt(r.pts[0], P[0][0]) && !samePt(r.pts[r.pts.length - 1], P[0][0])) v(id, 'tree', 'the root run does not start at the port'); }
    for (let i = 0; i < runs.length; i++) for (let k = i + 1; k < runs.length; k++) { const A = new Set(runs[i].members || []), B = runs[k].members || [], both = B.filter(m => A.has(m)).length; if (both && both !== A.size && both !== B.length) v(id, 'tree', 'two runs hold overlapping member sets'); }
    members.forEach((e, u) => {
      const mine = runs.filter(r => (r.members || []).includes(e.id)), used = new Set();
      let cur = P[u][0], chain = [cur], last = null;
      for (;;) {
        const r = mine.find(x => !used.has(x) && (samePt(x.pts[0], cur) || samePt(x.pts[x.pts.length - 1], cur)));
        if (!r) break;
        used.add(r); last = r; const pts = samePt(r.pts[0], cur) ? r.pts : r.pts.slice().reverse(); chain = chain.concat(pts.slice(1)); cur = pts[pts.length - 1];
      }
      if (used.size !== mine.length) v(id, 'tree', 'the runs of ' + e.id + ' do not chain from the port');
      const br = e.branch && e.branch.length > 1 && polyLen(e.branch) > 0 ? e.branch : null;
      if (br) { if (samePt(br[0], cur)) chain = chain.concat(br.slice(1)); else if (samePt(br[br.length - 1], cur)) chain = chain.concat(br.slice().reverse().slice(1)); else v(id, 'pts', 'the branch of ' + e.id + ' does not leave its last run'); }
      if (!samePolyline(C(chain), C(P[u]))) v(id, 'pts', 'the runs and branch of ' + e.id + ' are not its route');
      if (last && !br !== !!last.far) v(id, 'tree', 'the far mark of ' + e.id + (br ? ' is drawn at a join' : ' is not drawn'));
    });
    // No foreign line along the trunk, through a join, or with a corner on the trunk.
    const f = foreignOf(L, b, lines);
    if (f.onTrunk) v(id, 'foreign-on-trunk', f.onTrunk + ': ' + f.examples.onTrunk.join('; '));
    if (f.atJoin) v(id, 'foreign-at-join', f.atJoin + ': ' + f.examples.atJoin.join('; '));
    if (f.tContacts) v(id, 't-contact', f.tContacts + ': ' + f.examples.tContacts.join('; '));
  }
  return out;
}

// ---------------------------------------------------------------- round 11: the Layers corridors
// The corridors as planned against what is drawn (the definitions in the header). A row is the elements whose box
// holds a way point's height; its gaps are read from those elements, so the check owes nothing to the planner.
export function corridorMetrics(L) {
  const C = L.corridors, edges = Array.isArray(C?.edges) ? C.edges : [], out = {planned: edges.length, crossings: 0, followed: 0, overfull: 0, offPitch: 0, onElement: 0, rows: 0};
  if (!edges.length) return out;
  const {CORRIDOR_SLOTS: SLOTS, CORRIDOR_PITCH: PITCH, CORRIDOR_MARGIN: MARGIN, TOL} = DRAWN, routes = new Map((L.edges || []).map(e => [e.id, e.pts || []])), byRow = new Map();
  for (const [id, pts] of edges) for (const [x, y] of pts) {
    out.crossings++;
    if (!byRow.has(y)) byRow.set(y, []); byRow.get(y).push(x);
    // Followed: a vertical segment of the connector's route through the row's height, at the slot.
    if (segsOf(routes.get(id) || []).some(([a, b]) => Math.abs(a[0] - b[0]) <= TOL && Math.abs(a[0] - x) <= PITCH / 2 + TOL && Math.min(a[1], b[1]) <= y && Math.max(a[1], b[1]) >= y)) out.followed++;
  }
  for (const [y, xs] of byRow) {
    out.rows++;
    const boxes = (L.nodes || []).filter(n => n.y <= y && y <= n.y + n.h).sort((a, b) => a.x - b.x);
    for (const x of xs) if (boxes.some(b => b.x <= x && x <= b.x + b.w)) out.onElement++;
    // The gaps: before the first element, between two, after the last; the corridors of each in order of x.
    const edgesOf = [-Infinity, ...boxes.flatMap(b => [b.x, b.x + b.w]), Infinity], gaps = [];
    for (let i = 0; i + 1 < edgesOf.length; i += 2) gaps.push({lo: edgesOf[i], hi: edgesOf[i + 1], xs: []});
    for (const x of xs) { const g = gaps.find(g => x >= g.lo && x <= g.hi); if (g) g.xs.push(x); }
    for (const g of gaps) {
      g.xs.sort((a, b) => a - b);
      if (g.xs.length > SLOTS) out.overfull++;
      const outer = !Number.isFinite(g.lo) || !Number.isFinite(g.hi);
      for (let i = 1; i < g.xs.length; i++) { const d = g.xs[i] - g.xs[i - 1]; if (outer ? d < PITCH - TOL : Math.abs(d - PITCH) > TOL) out.offPitch++; }
      for (const x of g.xs) if (x - g.lo < MARGIN - TOL || g.hi - x < MARGIN - TOL) out.onElement++;
    }
  }
  return out;
}
