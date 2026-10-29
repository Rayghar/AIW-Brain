// Round 10 · the chapter-lines evidence (workstream V8). Every chapter view that routes its own lines, on bank-payment
// and the five reference journeys: what the view draws, beside a control computed in the same run from the same
// records, so every gain of the round-10 chapter workstreams (V2–V7) is measured against today's drawing and never
// against a remembered number.
//
// The pictures, each folded and laid out exactly as its view does with a fresh state (whole system, default depth, no
// proposal, no selection; VIEW_SOURCE below names the view code each replicates, and chapter-lines-validate checks it is
// still there): Chapter 1 Context, Chapter 2 Utility tree, Chapter 3 Decision map, Chapter 4 Responsibilities,
// Chapter 5 Components, Chapter 6 Platform, Chapter 9 Threat model, Chapter 10 Deployment (default depth, and modules)
// and Whole design at Chapters 6, 8, 10 and 11 (each chapter's default lens and layer). Chapter 10 is laid out for a
// 1,100 px stage and Whole design for 1,180 px, the widths the round-10 investigation measured; the projects are built
// by createProject as POST /api/projects builds them, with a fixed id and time so the run is reproducible.
//
// The controls are today's drawings, rebuilt here from the layout's own cards and ports, independently of the code the
// workstreams change:
// - lanes (Ch1, Ch4, Ch5, Ch9): the same ports with today's interval colouring of each gutter's tracks, every route
//   drawn on its own with its own head (Ch9 adds today's join dots); Chapter 1 from today's Context configuration
//   (laneLayout without fan-out, its tracks by interval colouring: trackOrder 'colouring'), so V2's and V5's lanes and
//   ports are measured against today's;
// - Ch3: driver tracks and decision ports in priority order, each route on its own;
// - Ch6: today's interval colouring of the dependency brackets;
// - Ch10: today's trunks (a hub for a part four or more parts need, otherwise one per needing part), interval
//   coloured and drawn once per link: two paths, a head and a dot each;
// - Ch2: every edge drawn on its own;
// - Whole design: one pillar per need, beside the other threads and the corridor routes at rest.
// While none of a view's workstreams has landed, its control must equal its drawing line for line (an identity
// chapter-lines-validate checks): that is the proof each control is today's picture.
//
// LANDED names the workstreams whose drawing is in source. A view is measured as its new drawing, and its assertions
// switch on, only when its workstream is listed; chapter-lines-validate fails when the list and the shapes the layouts
// return (shapesOf) disagree, so an engineer landing V2–V7 adds the id in the same change. The drawings after
// landing are read from the shapes design-spec.json declares (lane wires, tradeoff and utility combs, deploy rails,
// anatomy spines) and the views' declared wire merges (mergeWires shares and style keys); a workstream that lands
// with another shape updates its adapter here in that change.
//
// Assertions are relative to the controls computed in the same run; the only absolute checks are the structural
// identities (Ch10 heads equal the needed parts with one mark per link; Ch9 heads equal entries plus contracts; Ch2
// one comb per parent), the integrity of merged wires (no foreign line at a join, along shared ink or as a T) and,
// always, the lane engine's own guarantees (orthogonal routes, none through a card). ANCHORS are the numbers the
// investigation measured on today's source; each control must reproduce them. TARGETS are the workstreams' own
// acceptance numbers (design-spec.json), reported with today's and the drawn value and never gated here.
//   node scripts/chapter-lines-evidence.mjs [--out <dir>] [--project a,b] [--check] [--stdout]
// Writes <out>/chapter-lines.json (default audit/round11/evidence; round 10's record stays as written): deterministic, the same source gives the same
// bytes. --check exits 1 when an anchor, an identity or a switched-on assertion fails; --stdout prints the JSON
// instead of writing it (chapter-lines-validate compares two processes byte for byte).
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = rel => import(pathToFileURL(path.join(REPO, rel)).href);
const {createProject} = await imp('shared/projects-domain.js');
const {REFERENCE_PROJECTS} = await imp('public/reference-projects.js');
const {LANE, laneLayout} = await imp('public/lane-layout.js');
const {mergeWires, wireConflicts} = await imp('public/wire-merge.js');
const story = await imp('public/story-model.js'), storyL = await imp('public/story-layout.js');
const util = await imp('public/utility-model.js'), utilL = await imp('public/utility-layout.js');
const trd = await imp('public/tradeoff-model.js'), trdL = await imp('public/tradeoff-layout.js');
const resp = await imp('public/responsibility-model.js'), respL = await imp('public/responsibility-layout.js');
const real = await imp('public/realise-model.js'), realL = await imp('public/realise-layout.js');
const plat = await imp('public/platform-model.js'), platL = await imp('public/platform-layout.js');
const thr = await imp('public/threat-model.js'), thrL = await imp('public/threat-layout.js');
const dep = await imp('public/deploy-model.js'), depL = await imp('public/deploy-layout.js');
const ana = await imp('public/anatomy-model.js'), anaL = await imp('public/anatomy-layout.js');

// The chapter workstreams whose drawing has landed in source (design-spec.json final.workstreams V2–V7). V1 (the wires
// module) changes no picture.
export const LANDED = new Set(['V2', 'V3', 'V4', 'V5', 'V6', 'V7']);
export const CHAPTER_WORKSTREAMS = ['V2', 'V3', 'V4', 'V5', 'V6', 'V7'];

export const AT = '2026-01-01T00:00:00.000Z';
export const DEPLOY_W = 1100, ANATOMY_W = 1180;
export const PROJECT_KEYS = ['bank-payment', ...REFERENCE_PROJECTS.map(r => r.id)];
const JOURNEYS = new Set(REFERENCE_PROJECTS.map(r => r.id));
// The view code each picture replicates: the measures the views pass to their layouts and Whole design's default lens
// and layer per chapter. chapter-lines-validate checks each line is still in the file.
export const VIEW_SOURCE = [
  ['public/story-view.js', "function measure(l) { return Math.max(90, 24 + 6.4 * String(l.label || '').length); }"],
  ['public/story-view.js', 'L = contextLayout(F, {measure});'],
  ['public/responsibility-view.js', "function measure(l) { return Math.max(112, 24 + 6.6 * (String(l.label || '').length + (l.ref ? l.ref.length + 1 : 0))); }"],
  ['public/realise-view.js', "function measure(l) { return Math.max(96, 24 + 6.6 * (String(l.label || '').length + (l.ref ? l.ref.length + 1 : 0))); }"],
  ['public/threat-view.js', "function measure(l) { return 26 + 7 * Math.max(String(l.label || '').length, l.data.map(d => T.X.D.get(d)?.title || '').join(', ').length * 0.9, (l.threats.length + l.controls.length) * 8); }"],
  ['public/threat-view.js', "const sensitive = l => l.data.some(d => /restricted|confidential|secret|personal/i.test(T.X.D.get(d)?.classification || ''));"],
  ['public/threat-view.js', 'L = threatLayout(F, {measure, sensitive});'],
  ['public/anatomy-view.js', "6: {lens: 'structure', peel: 'capability'}"],
  ['public/anatomy-view.js', "8: {lens: 'signals', peel: null}"],
  ['public/anatomy-view.js', "10: {lens: 'operation', peel: 'runtime'}"],
  ['public/anatomy-view.js', "11: {lens: 'structure', peel: null}"]
];
const storyMeasure = l => Math.max(90, 24 + 6.4 * String(l.label || '').length);
const respMeasure = l => Math.max(112, 24 + 6.6 * (String(l.label || '').length + (l.ref ? l.ref.length + 1 : 0)));
const realMeasure = l => Math.max(96, 24 + 6.6 * (String(l.label || '').length + (l.ref ? l.ref.length + 1 : 0)));
const threatMeasure = T => l => 26 + 7 * Math.max(String(l.label || '').length, (l.data || []).map(d => T.X.D.get(d)?.title || '').join(', ').length * 0.9, ((l.threats || []).length + (l.controls || []).length) * 8);
const ANATOMY_DEFAULT = {6: {lens: 'structure', peel: 'capability'}, 8: {lens: 'signals', peel: null}, 10: {lens: 'operation', peel: 'runtime'}, 11: {lens: 'structure', peel: null}};

export const DEFINITIONS = {
  lines: 'drawn line elements (SVG paths) at rest: one per route today; one per merged chain, rail or spine once a workstream lands',
  relationships: 'recorded relationships the picture draws (each keeps its own route for selection and its own reading)',
  heads: 'arrowheads drawn',
  marks: 'per-relationship marks drawn on the lines (Ch6 and Ch10 dots, Ch10 rail marks, Whole design feet)',
  joins: 'join dots drawn where a shared line divides',
  ink: 'total length of the drawn lines in px, as straight segments between their points (rounded corners and Whole design curves are not shortened)',
  uniqueInk: 'ink with collinear overlaps counted once',
  overdraw: 'ink / uniqueInk',
  crossingPairs: 'interior horizontal × vertical intersections between lines of different shares, counted per pair of segments',
  visualCrossings: 'distinct points (rounded to 1 px) where lines of different shares cross: what the reader sees',
  overlaps: 'pairs of collinear segments of different drawn lines overlapping by more than 2 px',
  foreignOverlaps: 'overlaps between lines of different shares',
  bends: 'corners: segments minus one, per drawn line',
  share: 'lines of one share are one drawn structure from one element (a Ch9 entry, a Ch10 trunk or rail, a Ch3 driver track, a Ch2 parent, a merged chain group); they never count as crossing each other',
  maxPortsPerSide: 'lane views: the most distinct port heights on one side of one card',
  gutterW: 'lane views: the summed width of every lane gutter; Ch3 the driver gutter; Ch6 and Ch10 the bracket and trunk gutters',
  levels: 'track levels: the most in any one gutter (lane views), or the gutter\'s levels (Ch6, Ch10)',
  passes: 'Whole design: segments of the need lines (pillars, or spines once V7 lands) passing behind a card that is not their own (component, party, responsibility, lane, plate, run, socket, intent and count cards)',
  passesAtRest: 'Whole design: the same for every thread drawn at rest',
  needInk: 'Whole design: the ink of the need lines (pillars, or spines)'
};

// ---------------------------------------------------------------- geometry

const EPS = 0.5;
const segsOf = pts => { const s = []; for (let i = 1; i < pts.length; i++) { const [x1, y1] = pts[i - 1], [x2, y2] = pts[i]; if (x1 === x2 && y1 === y2) continue; s.push({x1, y1, x2, y2, h: Math.abs(y1 - y2) < EPS, v: Math.abs(x1 - x2) < EPS}); } return s; };
const between = (a, lo, hi) => a > Math.min(lo, hi) + EPS && a < Math.max(lo, hi) - EPS;
const segLen = s => Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
const span = (p1, p2, q1, q2) => Math.min(Math.max(p1, p2), Math.max(q1, q2)) - Math.max(Math.min(p1, p2), Math.min(q1, q2));
const round2 = v => Math.round(v * 100) / 100;

// What a set of drawn lines ([{id, share, pts}]) shows, with the heads, marks and joins the view draws on them.
export function lineMetrics(lines, {heads = 0, marks = 0, joins = 0} = {}) {
  const L = lines.map(l => ({share: String(l.share ?? l.id), segs: segsOf(l.pts)}));
  let ink = 0, bends = 0, pairs = 0, overlaps = 0, foreign = 0; const points = new Set();
  for (const l of L) { bends += Math.max(0, l.segs.length - 1); for (const s of l.segs) ink += segLen(s); }
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const same = L[i].share === L[j].share;
    for (const a of L[i].segs) for (const b of L[j].segs) {
      if (a.h && b.v) { if (!same && between(b.x1, a.x1, a.x2) && between(a.y1, b.y1, b.y2)) { pairs++; points.add(Math.round(b.x1) + ',' + Math.round(a.y1)); } }
      else if (a.v && b.h) { if (!same && between(a.x1, b.x1, b.x2) && between(b.y1, a.y1, a.y2)) { pairs++; points.add(Math.round(a.x1) + ',' + Math.round(b.y1)); } }
      else if ((a.h && b.h && Math.abs(a.y1 - b.y1) < EPS && span(a.x1, a.x2, b.x1, b.x2) > 2) || (a.v && b.v && Math.abs(a.x1 - b.x1) < EPS && span(a.y1, a.y2, b.y1, b.y2) > 2)) { overlaps++; if (!same) foreign++; }
    }
  }
  // Unique ink: collinear runs on one line (rounded to 1 px) drawn once.
  const runs = new Map(); let unique = 0;
  for (const l of L) for (const s of l.segs) {
    if (!s.h && !s.v) { unique += segLen(s); continue; }
    const k = s.h ? 'h' + Math.round(s.y1) : 'v' + Math.round(s.x1), iv = s.h ? [Math.min(s.x1, s.x2), Math.max(s.x1, s.x2)] : [Math.min(s.y1, s.y2), Math.max(s.y1, s.y2)];
    (runs.get(k) || runs.set(k, []).get(k)).push(iv);
  }
  for (const k of [...runs.keys()].sort()) {
    const iv = runs.get(k).sort((a, b) => a[0] - b[0] || a[1] - b[1]); let [lo, hi] = iv[0];
    for (const [a, b] of iv.slice(1)) { if (a > hi) { unique += hi - lo; lo = a; hi = b; } else hi = Math.max(hi, b); }
    unique += hi - lo;
  }
  return {lines: lines.length, heads, marks, joins, ink: Math.round(ink), uniqueInk: Math.round(unique), overdraw: unique ? round2(ink / unique) : 0, crossingPairs: pairs, visualCrossings: points.size, overlaps, foreignOverlaps: foreign, bends};
}
export const inkOf = lines => Math.round(lines.reduce((t, l) => t + segsOf(l.pts).reduce((u, s) => u + segLen(s), 0), 0));
// Interval colouring as the chapter layouts do it today: shortest span first, then the top, then the key; each track
// takes the lowest level no track within `gap` holds. Sets t.level; returns the number of levels.
export function colourIntervals(tracks, gap) {
  const levels = [];
  for (const t of [...tracks].sort((p, q) => (p.b - p.a) - (q.b - q.a) || p.a - q.a || (p.key < q.key ? -1 : p.key > q.key ? 1 : 0))) {
    let k = levels.findIndex(iv => iv.every(([a, b]) => t.b < a - gap || t.a > b + gap));
    if (k < 0) { k = levels.length; levels.push([]); }
    levels[k].push([t.a, t.b]); t.level = k;
  }
  return levels.length;
}
const budget = levels => levels + Math.max(2, Math.ceil(0.15 * levels));
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const sameLines = (a, b) => JSON.stringify([...a].sort(byId).map(l => [l.id, l.pts])) === JSON.stringify([...b].sort(byId).map(l => [l.id, l.pts]));
// Merged chains as drawn lines: one per chain, a chain group is one share.
const chainLines = W => W.chains.map((c, i) => ({id: 'c' + i + ':' + c.ids.join(' '), share: 'g' + c.group, pts: c.pts}));
const conflictCounts = W => { const c = wireConflicts(W); return {atJoin: c.atJoin.length, onTrunk: c.onTrunk.length, tContacts: c.tContacts.length, apart: W.apart.length}; };

// ---------------------------------------------------------------- lanes (Ch1, Ch4, Ch5, Ch9)

const trunkKey = r => String(r.share ?? r.entry ?? r.id);
const laneOfRoute = L => { const C = new Map(L.cards.map(c => [c.id, c])), lane = new Map(L.lanes.map((ln, i) => [ln.cardX, i])); return r => lane.get(C.get(r.link.to).x); };
// Today's tracks for a lane layout's routes: per gutter (the target lane and the side a flow enters), one track per
// trunk (a shared trunk, else the route), interval coloured with a 3 px gap, at GUT/2 + level × TRACK from the card.
export function laneColouring(L) {
  const laneOf = laneOfRoute(L), gutters = new Map(), trunks = new Map();
  for (const r of L.routes) {
    const side = r.xt < r.xb ? 'L' : 'R', g = laneOf(r) + '|' + side, k = g + '\u0000' + trunkKey(r);
    if (!trunks.has(k)) { const t = {key: trunkKey(r), side, a: Infinity, b: -Infinity, routes: []}; trunks.set(k, t); (gutters.get(g) || gutters.set(g, []).get(g)).push(t); }
    const t = trunks.get(k); t.a = Math.min(t.a, r.ya, r.yb); t.b = Math.max(t.b, r.ya, r.yb); t.routes.push(r);
  }
  const levels = new Map(), trunkOf = new Map();
  for (const [g, ts] of gutters) levels.set(g, colourIntervals(ts, 3));
  for (const t of trunks.values()) for (const r of t.routes) trunkOf.set(r, t);
  const routes = L.routes.map(r => {
    const t = trunkOf.get(r), xt = t.side === 'L' ? r.xb - LANE.GUT / 2 - t.level * LANE.TRACK : r.xb + LANE.GUT / 2 + t.level * LANE.TRACK;
    return {...r, xt, pts: [[r.xa, r.ya], [xt, r.ya], [xt, r.yb], [r.xb, r.yb]]};
  });
  const gutterW = L.lanes.reduce((t, ln, i) => t + 2 * LANE.GUT + ((levels.get(i + '|L') || 0) + (levels.get(i + '|R') || 0)) * LANE.TRACK, 0);
  return {routes, levels, gutterW};
}
const laneLevels = L => { const m = new Map(); L.lanes.forEach((ln, i) => { m.set(i + '|L', Math.round((ln.gl - LANE.GUT) / LANE.TRACK)); m.set(i + '|R', Math.round((ln.gr - LANE.GUT) / LANE.TRACK)); }); return m; };
const laneGutterW = L => L.lanes.reduce((t, ln) => t + ln.gl + ln.gr, 0);
// The lanes' width as laneLayout gives it (Chapter 1 may widen its picture further for the notes beneath).
const laneW = L => (L.lanes.length ? L.lanes.at(-1).x + L.lanes.at(-1).w + LANE.LANE_GAP + 6 : 0);
export function maxPortsPerSide(routes) {
  const ports = new Map(), add = (k, y) => (ports.get(k) || ports.set(k, new Set()).get(k)).add(Math.round(y));
  for (const r of routes) { add(r.link.from + '|' + (r.xt > r.xa ? 'R' : 'L'), r.ya); add(r.link.to + '|' + (r.xt < r.xb ? 'L' : 'R'), r.yb); }
  return Math.max(0, ...[...ports.values()].map(s => s.size));
}
// Engine guarantees, counted: segments that are not orthogonal and segments through a card that is not their own.
function laneFaults(L) {
  let diagonal = 0, through = 0;
  for (const r of L.routes) for (let i = 1; i < r.pts.length; i++) {
    const [a, b] = [r.pts[i - 1], r.pts[i]]; if (a[0] !== b[0] && a[1] !== b[1]) diagonal++;
    const x1 = Math.min(a[0], b[0]), x2 = Math.max(a[0], b[0]), y1 = Math.min(a[1], b[1]), y2 = Math.max(a[1], b[1]);
    for (const c of L.cards) if (c.id !== r.link.from && c.id !== r.link.to && x1 < c.x + c.w && x2 > c.x && y1 < c.y + c.h && y2 > c.y) through++;
  }
  return {diagonal, through};
}
const routeLines = routes => routes.map(r => ({id: r.id, share: r.entry ?? r.id, pts: r.pts}));
const todayJoins = routes => { const n = new Map(); for (const r of routes) if (r.entry) n.set(r.entry, (n.get(r.entry) || 0) + 1); return [...n.values()].reduce((t, k) => t + (k > 1 ? k - 1 : 0), 0); };
const entryCount = routes => new Set(routes.filter(r => r.entry).map(r => r.entry)).size;
// Chapter 1 Context as configured today (story-layout.js before V5: no fan-out; the lane engine's tracks by interval
// colouring alone, as before V2), the base of its control: today's lanes, ports and words, wherever V2 moves them.
const contextToday = F => laneLayout(F, {top: storyL.contextHead(), left: 12, cardW: storyL.CT.CARD_W, cardH: (row, ports) => Math.max(storyL.CT.CARD_H, 22 + ports * LANE.PORT), labelMax: storyL.CT.LABEL_MAX, labelInset: 12, measure: storyMeasure, labelled: l => l.kind === 'delivers', trackOrder: 'colouring'});
// The same configuration with the lane engine's crossing-aware tracks (V2) and no fan-out: the picture V5's fans are
// drawn into, so their own effect on ink is measured in the same run (extra.unfannedInk).
const contextUnfanned = F => laneLayout(F, {top: storyL.contextHead(), left: 12, cardW: storyL.CT.CARD_W, cardH: (row, ports) => Math.max(storyL.CT.CARD_H, 22 + ports * LANE.PORT), labelMax: storyL.CT.LABEL_MAX, labelInset: 12, measure: storyMeasure, labelled: l => l.kind === 'delivers'});

function laneRow(view, L, base, {merge = null, wires = null, joinsToday = false} = {}) {
  const ctl = laneColouring(base), own = laneColouring(L), drawnLevels = laneLevels(L);
  const controlLines = routeLines(ctl.routes), control = lineMetrics(controlLines, {heads: ctl.routes.length, joins: joinsToday ? todayJoins(ctl.routes) : 0});
  let lines, drawn, conflicts = null;
  if (merge || wires) { const W = wires || mergeWires(L.routes.map(merge)); lines = chainLines(W); drawn = lineMetrics(lines, {heads: W.heads.length, joins: W.joins.length}); conflicts = conflictCounts(W); }
  else { lines = routeLines(L.routes); drawn = lineMetrics(lines, {heads: L.routes.length, joins: joinsToday ? todayJoins(L.routes) : 0}); }
  // Per gutter: the levels drawn against the colouring of the drawn picture's own trunks and its budget.
  const overBudget = [...own.levels.entries()].filter(([g, c]) => (drawnLevels.get(g) || 0) > budget(c)).map(([g, c]) => g + ': ' + drawnLevels.get(g) + ' > ' + budget(c));
  return {
    view, relationships: L.routes.length, drawn, control, conflicts,
    extra: {
      levels: [Math.max(0, ...drawnLevels.values()), Math.max(0, ...ctl.levels.values())], gutterW: [Math.round(laneGutterW(L)), Math.round(ctl.gutterW)],
      maxPortsPerSide: [maxPortsPerSide(L.routes), maxPortsPerSide(base.routes)], W: [Math.round(laneW(L)), Math.round(laneW(base))], perLinkInk: inkOf(routeLines(L.routes)),
      ...(joinsToday ? {entries: entryCount(L.routes), contracts: L.routes.filter(r => !r.entry).length} : {})
    },
    structure: {...laneFaults(L), overBudget},
    lines, controlLines
  };
}

// ---------------------------------------------------------------- Chapter 3 Decision map

// Today's decision map routes from the layout's cards: each driver's track at 16 + priority index × TRACK into the
// gutter, a port per driver on each decision in priority order; each alternative on its decision's trunk.
export function priorityRoutes(F, L) {
  const C = new Map(L.cards.map(c => [c.id, c])), DM = trdL.DM, out = [], incoming = new Map();
  for (const l of F.links) { if (!incoming.has(l.to)) incoming.set(l.to, []); incoming.get(l.to).push(l.from); }
  for (const [to, froms] of incoming) {
    const d = C.get(to), ordered = F.drivers.filter(id => froms.includes(id));
    ordered.forEach((from, k) => {
      const s = C.get(from), tx = s.x + DM.DRV_W + 16 + F.drivers.indexOf(from) * DM.TRACK, py = Math.round(d.y + 26 + (k + 0.5) * ((d.h - 40) / ordered.length)), sy = Math.round(s.y + s.h / 2);
      out.push({id: from + '>' + to, from, to, kind: 'weighs', pts: [[s.x + s.w, sy], [tx, sy], [tx, py], [d.x, py]]});
    });
  }
  for (const c of L.cards.filter(c => c.decision)) {
    const d = C.get(c.decision), sy = Math.round(d.y + d.h / 2), ty = Math.round(c.y + Math.min(c.h / 2, 48)), xm = d.x + d.w + DM.G2 / 2;
    out.push({id: c.decision + '>' + c.id, from: c.decision, to: c.id, kind: c.kind === 'alt' ? 'option' : c.kind, pts: [[d.x + d.w, sy], [xm, sy], [xm, ty], [c.x, ty]]});
  }
  return out;
}
const decisionShare = r => (r.kind === 'weighs' ? 'drv:' : 'dec:') + r.from;
function decisionRow(F, L, landed) {
  const ctl = priorityRoutes(F, L), controlLines = ctl.map(r => ({id: r.id, share: decisionShare(r), pts: r.pts}));
  const control = lineMetrics(controlLines, {heads: ctl.filter(r => r.kind === 'weighs').length});
  const weighs = L.routes.filter(r => r.kind === 'weighs'), options = L.routes.filter(r => r.kind !== 'weighs');
  let lines, drawn, conflicts = null, weighsInk, optionsInk;
  if (landed.has('V3')) {
    // The wires as the layout declares them (tradeoff-layout.js mapWireRoutes: 'drv:' + driver, 'dec:' + decision by style,
    // a share it records in L.apart standing alone), which is how the view draws them.
    const D = trdL.mapWireRoutes(L), Ww = mergeWires(D.weighs), Wo = mergeWires(D.options);
    const lw = chainLines(Ww), lo = chainLines(Wo).map(l => ({...l, id: 'o' + l.id, share: 'o' + l.share}));
    lines = [...lw, ...lo]; drawn = lineMetrics(lines, {heads: Ww.heads.length, joins: Ww.joins.length}); weighsInk = inkOf(lw); optionsInk = inkOf(lo);
    const a = conflictCounts(Ww), b = conflictCounts(Wo); conflicts = Object.fromEntries(Object.keys(a).map(k => [k, a[k] + b[k]]));
  } else {
    lines = L.routes.map(r => ({id: r.id, share: decisionShare(r), pts: r.pts})); drawn = lineMetrics(lines, {heads: weighs.length});
    weighsInk = inkOf(weighs); optionsInk = inkOf(options);
  }
  return {
    view: 'ch3-decision-map', relationships: L.routes.length, drawn, control, conflicts,
    extra: {drivers: F.drivers.length, decisions: F.blocks.length, weighsInk: [weighsInk, inkOf(ctl.filter(r => r.kind === 'weighs'))], optionsInk: [optionsInk, inkOf(ctl.filter(r => r.kind !== 'weighs'))], gutterW: [L.gutter.w, 34 + F.drivers.length * trdL.DM.TRACK]},
    structure: {}, lines, controlLines
  };
}

// ---------------------------------------------------------------- Chapter 2 Utility tree

function utilityRow(L, landed) {
  const controlLines = L.edges.map(e => ({id: e.id, share: e.from, pts: e.pts})), control = lineMetrics(controlLines);
  const parents = new Set(L.edges.map(e => e.from));
  let lines, drawn, conflicts = null; const structure = {};
  if (landed.has('V4')) {
    // The combs as the view draws them (utility-layout.js treeWires: one structure per parent, solid where a recorded
    // child travels, a hole's or proposal's own tooth dashed).
    const W = utilL.treeWires(L);
    lines = chainLines(W); drawn = lineMetrics(lines); conflicts = conflictCounts(W);
    const combs = L.combs || [], of = c => String(c.from ?? c.parent ?? ''), seen = new Map();
    for (const c of combs) seen.set(of(c), (seen.get(of(c)) || 0) + 1);
    structure.combs = combs.length; structure.parents = parents.size;
    structure.combFaults = [...parents].filter(p => seen.get(p) !== 1).map(p => p + ': ' + (seen.get(p) || 0) + ' combs').concat([...seen.keys()].filter(p => !parents.has(p)).map(p => p + ': a comb with no edge'));
  } else { lines = controlLines; drawn = control; }
  return {view: 'ch2-utility', relationships: L.edges.length, drawn, control, conflicts, extra: {parents: parents.size, perLinkInk: inkOf(controlLines)}, structure, lines, controlLines};
}

// ---------------------------------------------------------------- Chapter 6 Platform

// Today's brackets from the layout's arcs: interval coloured with a 4 px gap, at GUT/2 + level × LEVEL from the rail.
export function platformColouring(L) {
  const PX = platL.PX, ts = L.arcs.map(a => ({key: a.id, a: Math.min(a.ya, a.yb), b: Math.max(a.ya, a.yb), arc: a}));
  const levels = colourIntervals(ts, 4);
  return {levels, arcs: ts.map(t => ({...t.arc, level: t.level, x: PX.RAIL + PX.GUT / 2 + t.level * PX.LEVEL}))};
}
const arcLines = arcs => arcs.map(a => ({id: a.id, share: a.id, pts: [[a.xa, a.ya], [a.x, a.ya], [a.x, a.yb], [a.xa + 4, a.yb]]}));
function platformRow(L) {
  const ctl = platformColouring(L), lines = arcLines(L.arcs), controlLines = arcLines(ctl.arcs), PX = platL.PX;
  return {
    view: 'ch6-platform', relationships: L.arcs.length, drawn: lineMetrics(lines, {heads: L.arcs.length, marks: L.arcs.length}), control: lineMetrics(controlLines, {heads: ctl.arcs.length, marks: ctl.arcs.length}), conflicts: null,
    extra: {levels: [L.levels, ctl.levels], gutterW: [PX.GUT + L.levels * PX.LEVEL, PX.GUT + ctl.levels * PX.LEVEL], plates: L.plates.length}, structure: {}, lines, controlLines
  };
}

// ---------------------------------------------------------------- Chapter 10 Deployment

// Today's trunks from the layout's rows and the folded links (deploy-layout.js before V6).
export function deployTrunks(L, F) {
  const DEP = depL.DEP, cy = new Map(L.rows.map(r => [r.id, r.cy])), links = F.links.filter(l => cy.has(l.from) && cy.has(l.to)), trunks = new Map(), inDegree = new Map();
  for (const l of links) inDegree.set(l.to, (inDegree.get(l.to) || 0) + 1);
  for (const l of links) {
    const hub = inDegree.get(l.to) >= 4, key = hub ? 'to:' + l.to : 'from:' + l.from, anchor = hub ? l.to : l.from, other = hub ? l.from : l.to;
    const t = trunks.get(key) || {key, a: cy.get(anchor), b: cy.get(anchor), links: []};
    t.a = Math.min(t.a, cy.get(other)); t.b = Math.max(t.b, cy.get(other)); t.links.push(l); trunks.set(key, t);
  }
  const ts = [...trunks.values()], levels = colourIntervals(ts, 3), arcW = Math.max(30, DEP.ARC_PAD * 2 + levels * DEP.ARC_STEP), xb = DEP.RAIL + arcW - 4;
  const arcs = ts.flatMap(t => t.links.map(l => ({id: l.id, trunk: t.key, x: xb - DEP.ARC_PAD - t.level * DEP.ARC_STEP, xb, y1: cy.get(l.from), y2: cy.get(l.to)})));
  return {levels, arcW, trunks: ts.length, arcs};
}
// Today's drawing (deploy-view.js): per link a trunk path from the dependent's row down to the 4 px corner before its
// target, then the branch round that corner into the target, with the head.
const arcPaths = arcs => arcs.flatMap(a => { const ym = a.y2 - 4 * (a.y2 > a.y1 ? 1 : -1); return [{id: a.id + ':trunk', share: a.trunk, pts: [[a.xb, a.y1], [a.x, a.y1], [a.x, ym]]}, {id: a.id + ':branch', share: a.trunk, pts: [[a.x, ym], [a.x, a.y2], [a.xb, a.y2]]}]; });
export function deployRow(view, L, F, landed = LANDED) {
  const ctl = deployTrunks(L, F), controlLines = arcPaths(ctl.arcs), control = lineMetrics(controlLines, {heads: ctl.arcs.length, marks: ctl.arcs.length});
  const trunkOf = a => (L.trunks || []).find(t => t.x === a.x && t.y1 <= Math.min(a.y1, a.y2) + EPS && t.y2 >= Math.max(a.y1, a.y2) - EPS)?.from ?? a.id;
  const links = F.links.filter(l => L.rows.some(r => r.id === l.from) && L.rows.some(r => r.id === l.to));
  let lines, drawn, levels; const structure = {};
  if (landed.has('V6')) {
    const rails = L.rails || [], xb = L.x0 - 4;
    lines = rails.flatMap(r => [{id: r.id + ':rail', share: r.id, pts: [[r.x, r.y1], [r.x, r.y2]]}, {id: r.id + ':stub', share: r.id, pts: [[r.x, r.stubY], [r.xb ?? xb, r.stubY]]}]);
    const marks = rails.reduce((t, r) => t + (r.dots || []).length, 0);
    drawn = {...lineMetrics(lines, {heads: rails.length, marks}), lines: rails.length};
    levels = rails.length ? Math.max(...rails.map(r => r.level)) + 1 : 0;
    // The structural identities: a rail per needed part, a mark per link on its target's rail, the rail spanning its
    // marks and its stub, no mark within 3 px of a stub, levels within the colouring budget of the rails.
    const targets = new Set(links.map(l => l.to)), seen = new Map();
    for (const r of rails) for (const d of r.dots || []) seen.set(d.link, (seen.get(d.link) || 0) + 1);
    const ts = rails.map(r => ({key: String(r.id), a: r.y1, b: r.y2}));
    structure.rails = rails.length; structure.targets = targets.size; structure.sharedRails = rails.filter(r => (r.dots || []).length > 1).length;
    structure.railFaults = [
      ...rails.filter(r => !targets.has(r.to)).map(r => r.id + ': no link needs ' + r.to),
      ...[...targets].filter(t => rails.filter(r => r.to === t).length !== 1).map(t => t + ': ' + rails.filter(r => r.to === t).length + ' rails'),
      ...links.filter(l => seen.get(l.id) !== 1 || !rails.find(r => r.to === l.to)?.dots?.some(d => d.link === l.id)).map(l => l.id + ': ' + (seen.get(l.id) || 0) + ' marks'),
      ...rails.filter(r => [r.stubY, ...(r.dots || []).map(d => d.y)].some(y => y < r.y1 - EPS || y > r.y2 + EPS)).map(r => r.id + ': the rail does not span its marks and stub'),
      ...rails.flatMap(r => (r.dots || []).filter(d => rails.some(o => Math.abs(o.stubY - d.y) < 3 && o.x <= r.x + EPS)).map(d => r.id + ': the mark for ' + d.link + ' is within 3 px of a stub')),
      ...(levels > budget(colourIntervals(ts, 3)) ? ['levels ' + levels + ' exceed the budget ' + budget(colourIntervals(ts, 3))] : [])
    ];
  } else {
    lines = arcPaths(L.arcs.map(a => ({...a, trunk: trunkOf(a)}))); drawn = {...lineMetrics(lines, {heads: L.arcs.length, marks: L.arcs.length})};
    levels = L.levels;
  }
  return {view, relationships: links.length, drawn, control, conflicts: null, extra: {levels: [levels, ctl.levels], gutterW: [L.arcW, ctl.arcW], trunks: [landed.has('V6') ? (L.rails || []).length : (L.trunks || []).length, ctl.trunks], targets: new Set(links.map(l => l.to)).size}, structure, lines, controlLines};
}

// ---------------------------------------------------------------- Whole design

const CARD_KINDS = new Set(['comp', 'party', 'resp', 'lane', 'plate', 'run', 'socket', 'intent', 'count']);
// Today's pillars (anatomy-layout.js realizationThreads before V7): one per need, from the component's foot to the
// top of the capability lane, spread across the component and kept inside the lane.
export function pillarThreads(M, L, chapter) {
  if (chapter < 6) return [];
  const lanes = new Map(L.items.filter(i => i.kind === 'lane').map(i => [i.obj, i])), out = [];
  for (const c of L.items.filter(i => i.kind === 'comp' && !i.ctx)) {
    const needs = (M.needs.get(c.obj) || []).map(k => lanes.get(k)).filter(Boolean);
    needs.forEach((ln, i) => { const x = Math.max(ln.x + 8, Math.min(ln.x + ln.w - 8, c.x + c.w * (i + 1) / (needs.length + 1))); out.push({kind: 'pillar', from: c.obj, to: ln.obj, points: [[x, c.y + c.h], [x, ln.y]]}); });
  }
  return out;
}
const threadLines = threads => { const n = new Map(); return threads.map(t => { const k = t.kind + ':' + t.from + '>' + t.to, i = n.get(k) || 0; n.set(k, i + 1); return {id: k + (i ? '#' + i : ''), share: k + (i ? '#' + i : ''), pts: t.points, own: t.own || [t.from, t.to]}; }); };
function passes(lines, cards) {
  let n = 0;
  for (const t of lines) for (let i = 1; i < t.pts.length; i++) {
    const [a, b] = [t.pts[i - 1], t.pts[i]], x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]) + 1, y1 = Math.max(a[1], b[1]) - 1;
    for (const c of cards) if (!t.own.includes(c.obj) && x0 <= c.x + c.w && x1 >= c.x && y0 < c.y + c.h && y1 > c.y) n++;
  }
  return n;
}
// The need lines a layout draws at rest: spines once V7 lands, else one pillar per need.
const needLines = (L, landed) => (landed.has('V7')
  ? (L.spines || L.threads.filter(t => t.kind === 'spine')).map(s => ({id: 'spine:' + s.from, share: 'spine:' + s.from, pts: s.points, own: [s.from, ...(s.feet || []).map(f => f.to)], spine: s}))
  : threadLines(L.threads.filter(t => t.kind === 'pillar')));
// L is the picture at the chapter's default lens and layer; L0 the same chapter with no layer opened, the condition
// the investigation measured the need ink in (an opened layer changes the cards' heights, not the lines).
export function anatomyRow(M, L, L0, chapter, landed = LANDED) {
  const {lens} = ANATOMY_DEFAULT[chapter], cards = L.items.filter(i => CARD_KINDS.has(i.kind));
  const atRest = t => t.kind !== 'operate' || lens === 'operation';
  const routeLines = L.routes.map(r => ({id: 'route:' + r.id, share: 'route:' + r.id, pts: r.points}));
  const pillars = pillarThreads(M, L, chapter), otherToday = L.threads.filter(t => t.kind !== 'pillar' && t.kind !== 'spine' && atRest(t));
  const ctlNeed = threadLines(pillars), ctlOther = threadLines(otherToday), controlLines = [...ctlNeed, ...ctlOther, ...routeLines];
  const control = lineMetrics(controlLines, {heads: L.routes.length, marks: pillars.length});
  const need = needLines(L, landed), structure = {};
  const marks = landed.has('V7') ? need.reduce((t, s) => t + (s.spine.feet || []).length, 0) : need.length;
  if (landed.has('V7')) {
    const lanes = new Map(L.items.filter(i => i.kind === 'lane').map(i => [i.obj, i])), comps = L.items.filter(i => i.kind === 'comp' && !i.ctx), per = new Map();
    for (const s of need) per.set(s.spine.from, (per.get(s.spine.from) || 0) + 1);
    structure.spines = need.length;
    structure.spineFaults = [
      ...[...per].filter(([, n]) => n > 1).map(([c, n]) => c + ': ' + n + ' spines'),
      ...need.filter(s => JSON.stringify((s.spine.feet || []).map(f => f.to).sort()) !== JSON.stringify((M.needs.get(s.spine.from) || []).filter(k => lanes.has(k)).sort())).map(s => s.spine.from + ': its feet are not its needs'),
      ...comps.filter(c => (M.needs.get(c.obj) || []).some(k => lanes.has(k)) && !per.has(c.obj)).map(c => c.obj + ': needs a lane and has no spine'),
      ...need.filter(s => passes([s], comps)).map(s => s.id + ': passes behind a component card')
    ];
  }
  const other = threadLines(L.threads.filter(t => t.kind !== 'pillar' && t.kind !== 'spine' && atRest(t))), lines = [...need, ...other, ...routeLines];
  const operate = ls => ls.filter(l => l.id.startsWith('operate:')).length;
  return {
    view: 'whole-design@ch' + chapter, relationships: L.routes.length + pillars.length + otherToday.length, drawn: lineMetrics(lines, {heads: L.routes.length, marks}), control, conflicts: null,
    extra: {
      lens, peel: ANATOMY_DEFAULT[chapter].peel, needInk: [inkOf(need), inkOf(ctlNeed)], needInkLayersClosed: [inkOf(needLines(L0, landed)), inkOf(threadLines(pillarThreads(M, L0, chapter)))],
      passes: [passes(need, cards), passes(ctlNeed, cards)], passesAtRest: [passes([...need, ...other], cards), passes([...ctlNeed, ...ctlOther], cards)],
      linesExcludingLensOnly: [lines.length - operate(other), controlLines.length - operate(ctlOther)]
    },
    structure, lines, controlLines
  };
}

// ---------------------------------------------------------------- the pictures

export const VIEWS = [
  {view: 'ch1-context', chapter: 1, ws: ['V2', 'V5']}, {view: 'ch2-utility', chapter: 2, ws: ['V4']}, {view: 'ch3-decision-map', chapter: 3, ws: ['V3']},
  {view: 'ch4-responsibilities', chapter: 4, ws: ['V2']}, {view: 'ch5-components', chapter: 5, ws: ['V2']}, {view: 'ch6-platform', chapter: 6, ws: ['V2']},
  {view: 'ch9-threat', chapter: 9, ws: ['V2', 'V4']}, {view: 'ch10-deployment', chapter: 10, ws: ['V6']}, {view: 'ch10-deployment@modules', chapter: 10, ws: ['V6']},
  ...[6, 8, 10, 11].map(ch => ({view: 'whole-design@ch' + ch, chapter: ch, ws: ['V7']}))
];
const VIEW = new Map(VIEWS.map(v => [v.view, v]));
export function chapterProjects(only = null) {
  const title = new Map([['bank-payment', 'Bank Payment Journey'], ...REFERENCE_PROJECTS.map(r => [r.id, r.title])]);
  return PROJECT_KEYS.filter(k => !only || only.has(k)).map(key => ({key, name: title.get(key), how: `createProject({name, template:'${key}'}) as POST /api/projects builds it (id '${key}', time ${AT})`, document: createProject({name: title.get(key), template: key}, key, AT)}));
}
// The shapes a landed workstream returns (design-spec.json), per layout; chapter-lines-validate checks LANDED agrees.
export function shapesOf(view, L) {
  const out = [];
  if (['ch1-context', 'ch4-responsibilities', 'ch5-components', 'ch9-threat'].includes(view) && 'wires' in L) out.push('V2');
  if (view === 'ch1-context' && L.routes.some(r => r.share != null)) out.push('V5');
  if (view === 'ch3-decision-map' && 'combs' in L) out.push('V3');
  if (view === 'ch2-utility' && 'combs' in L) out.push('V4');
  if (view.startsWith('ch10-') && 'rails' in L) out.push('V6');
  if (view.startsWith('whole-design') && ('spines' in L || L.threads.some(t => t.kind === 'spine'))) out.push('V7');
  return out;
}

// Lay out and measure every picture of one project. Returns the rows (with their lines, for the validate) and the
// workstream shapes the layouts carry.
export function measureProject(P, landed = LANDED) {
  const doc = P.document, rows = [], shapes = new Set(), empty = [];
  // A picture that draws no line is listed, not measured.
  const add = (meta, L, row) => { for (const s of shapesOf(meta.view, L)) shapes.add(s); if (!row.lines.length && !row.controlLines.length) empty.push(meta.view); else rows.push({project: P.key, ...meta, ...row}); };
  {
    const SM = story.storySource(doc), F = story.foldContext(SM, story.storyScope(SM, {kind: 'system'}), {ghost: null});
    if (F.rows.length) {
      const L = storyL.contextLayout(F, {measure: storyMeasure});
      // Once V5 lands the picture is the layout's wires (each fan merged from its source, story-layout.js), as the view
      // draws them.
      const row = laneRow('ch1-context', L, contextToday(F), {wires: landed.has('V5') ? L.wires : null});
      if (landed.has('V5')) row.extra.unfannedInk = inkOf(routeLines(contextUnfanned(F).routes));
      add({view: 'ch1-context', depth: null}, L, row);
    }
  }
  {
    const UM = util.utilitySource(doc), d = util.defaultDepth(UM), F = util.foldUtility(UM, util.utilityScope(UM, {kind: 'system'}), d, {ghost: null}), L = utilL.utilityLayout(F);
    if (L.edges.length) add({view: 'ch2-utility', depth: d}, L, utilityRow(L, landed));
  }
  {
    const TM = trd.tradeoffSource(doc), d = trd.defaultDepth(TM), F = trd.foldMap(TM, trd.tradeoffScope(TM, {kind: 'system'}), d, {proposal: null, proposalFor: undefined}), L = trdL.mapLayout(F);
    if (L.routes.length) add({view: 'ch3-decision-map', depth: d}, L, decisionRow(F, L, landed));
  }
  {
    const LM = resp.responsibilitySource(doc), d = resp.defaultDepth(LM), F = resp.foldResponsibilities(LM, resp.responsibilityScope(LM, {kind: 'system'}), d, {proposal: null});
    if (F.rows.length) { const L = respL.responsibilityLayout(F, {measure: respMeasure}); add({view: 'ch4-responsibilities', depth: d}, L, laneRow('ch4-responsibilities', L, L)); }
  }
  {
    const V = real.realiseSource(doc, {order: {}}), d = real.defaultDepth(V), F = real.foldRealise(V, real.realiseScope(V, {kind: 'system'}), d, {proposal: null});
    if (F.rows.length) { const L = realL.realiseLayout(F, {measure: realMeasure}); add({view: 'ch5-components', depth: d}, L, laneRow('ch5-components', L, L)); }
  }
  {
    const Pm = plat.platformSource(doc, {order: {}}), d = plat.defaultDepth(Pm), F = plat.foldPlatform(Pm, plat.platformScope(Pm, {kind: 'system'}), d, {proposal: null}), L = platL.platformLayout(F);
    if (F.rows.length) add({view: 'ch6-platform', depth: d}, L, platformRow(L));
  }
  {
    const T = thr.threatSource(doc, {order: {}}), d = thr.defaultDepth(T), F = thr.foldThreat(T, thr.threatScope(T, {kind: 'system'}), d);
    if (F.rows.length) {
      // The view's call (threat-view.js): its label measure and which links carry sensitive data, which the layout's wires
      // (threatWireStyle) keep apart from plain uses. Once V4 lands the picture is those wires, as the view draws them.
      const sensitive = l => (l.data || []).some(x => /restricted|confidential|secret|personal/i.test(T.X.D.get(x)?.classification || ''));
      const L = thrL.threatLayout(F, {measure: threatMeasure(T), sensitive});
      add({view: 'ch9-threat', depth: d}, L, laneRow('ch9-threat', L, L, {wires: landed.has('V4') ? L.wires : null, joinsToday: true}));
    }
  }
  {
    const V = dep.deploySource(doc, {order: {}}), d = dep.defaultDepth(V), sc = dep.deployScope(V, {kind: 'system'});
    for (const [view, depth] of [['ch10-deployment', d], ['ch10-deployment@modules', 'modules']]) {
      if (view !== 'ch10-deployment' && depth === d) continue;
      const F = dep.foldDeploy(V, sc, depth), L = depL.deployLayout(F, {viewW: DEPLOY_W});
      if (F.rows.length) add({view, depth}, L, deployRow(view, L, F, landed));
    }
  }
  {
    const M = ana.anatomyModel(ana.anatomySource(doc));
    for (const ch of [6, 8, 10, 11]) {
      const at = peel => anaL.anatomyLayout(M, {chapter: ch, scope: {kind: 'system'}, peel, order: {}, viewW: ANATOMY_W}), L = at(ANATOMY_DEFAULT[ch].peel);
      add({view: 'whole-design@ch' + ch, depth: null}, L, anatomyRow(M, L, ANATOMY_DEFAULT[ch].peel ? at(null) : L, ch, landed));
    }
  }
  return {rows, shapes, empty};
}

// ---------------------------------------------------------------- anchors, assertions and targets

// The numbers the round-10 investigation measured on today's source (scratchpad lines.mjs and the chapter-view
// experiments, quoted in design-spec.json); each control reproduces them, whatever has landed. Two differ from the
// spec's quotes, which were taken in other conditions: Chapter 5 parcel-lockers crosses 4 times with the view's own
// label measure (the spec's 6 came from a prototype's), and the Whole design pillar ink 7,362 px is with no layer
// opened (needInkLayersClosed); Chapter 6 opens its Capability layer, where the same pillars draw 9,046 px.
// One moved with the reference data, not the harness (round 12, workstream E, GR-DRF-15): parcel-lockers' REQ-001
// ("Still be accounted for") is named by the drafters' one naming rule, so its Chapter 5 card reads "Door opened offline
// handling service" where round 10 measured "For handling service"; the picture is 33 px wider (634 → 667 px) and its
// 11 links draw 2,472 px where they drew 2,373, with the same 4 crossings and 3 levels.
export const ANCHORS = [
  ['bank-payment', 'ch10-deployment', {heads: 37, visualCrossings: 42, ink: 16824, uniqueInk: 7497, marks: 37, lines: 74}, {levels: 10, trunks: 10}],
  ['bank-payment', 'ch10-deployment@modules', {}, {levels: 4, trunks: 4}],
  ['bank-payment', 'ch9-threat', {heads: 22, visualCrossings: 29, crossingPairs: 49, ink: 5171, uniqueInk: 4199, joins: 11, overlaps: 31}, {}],
  ['bank-payment', 'ch3-decision-map', {visualCrossings: 21, heads: 9}, {weighsInk: 4656, optionsInk: 816}],
  ['library-reservations', 'ch3-decision-map', {visualCrossings: 7}, {}], ['parcel-lockers', 'ch3-decision-map', {visualCrossings: 10}, {}],
  ['clinic-appointments', 'ch3-decision-map', {visualCrossings: 6}, {}], ['warehouse-fulfilment', 'ch3-decision-map', {visualCrossings: 5}, {}],
  ['bank-payment', 'ch1-context', {visualCrossings: 12, ink: 2375}, {}], ['library-reservations', 'ch1-context', {visualCrossings: 73}, {}],
  ['parcel-lockers', 'ch1-context', {visualCrossings: 134}, {}], ['clinic-appointments', 'ch1-context', {visualCrossings: 36}, {}],
  ['service-permits', 'ch1-context', {visualCrossings: 61}, {}], ['warehouse-fulfilment', 'ch1-context', {visualCrossings: 5}, {}],
  ['bank-payment', 'ch2-utility', {ink: 3906, uniqueInk: 2925, visualCrossings: 0}, {}], ['library-reservations', 'ch2-utility', {ink: 4636}, {}],
  ['parcel-lockers', 'ch2-utility', {ink: 4683}, {}], ['clinic-appointments', 'ch2-utility', {ink: 3921}, {}],
  ['warehouse-fulfilment', 'ch2-utility', {ink: 4224}, {}], ['service-permits', 'ch2-utility', {ink: 4253}, {}],
  ['bank-payment', 'ch5-components', {visualCrossings: 0, ink: 1956}, {}], ['parcel-lockers', 'ch5-components', {visualCrossings: 4, ink: 2472}, {}],
  ['bank-payment', 'ch4-responsibilities', {visualCrossings: 0, ink: 850}, {}],
  ['bank-payment', 'ch6-platform', {visualCrossings: 1, ink: 1284}, {levels: 3, plates: 14}],
  ['bank-payment', 'whole-design@ch6', {lines: 40}, {needInkLayersClosed: 7362, passes: 111}],
  ['bank-payment', 'whole-design@ch8', {lines: 49}, {}],
  ['bank-payment', 'whole-design@ch10', {}, {linesExcludingLensOnly: 49}],
  ['bank-payment', 'whole-design@ch11', {lines: 49}, {}]
];
// The workstreams' own acceptance numbers (design-spec.json), on the drawn picture: reported, not gated here.
const T = (ws, project, view, metric, op, value, note = '') => ({ws, project, view, metric, op, value, note});
export const TARGETS = [
  ...[['bank-payment', 4], ['library-reservations', 44], ['parcel-lockers', 78], ['clinic-appointments', 17], ['service-permits', 27], ['warehouse-fulfilment', 3]].map(([p, v]) => T('V2', p, 'ch1-context', 'visualCrossings', '<=', v, 'track order alone')),
  T('V2', 'bank-payment', 'ch9-threat', 'visualCrossings', '<=', 24), T('V2', 'parcel-lockers', 'ch5-components', 'visualCrossings', '<=', 4), T('V2', 'library-reservations', 'ch5-components', 'visualCrossings', '<=', 5), T('V2', 'bank-payment', 'ch5-components', 'visualCrossings', '<=', 0),
  T('V2', 'bank-payment', 'ch6-platform', 'levels', '=', 3),
  ...[['bank-payment', 14], ['library-reservations', 2], ['parcel-lockers', 4], ['clinic-appointments', 1], ['warehouse-fulfilment', 2], ['service-permits', 1]].map(([p, v]) => T('V3', p, 'ch3-decision-map', 'visualCrossings', '<=', v)),
  T('V3', 'bank-payment', 'ch3-decision-map', 'weighsInk', '<=', 4100), T('V3', 'bank-payment', 'ch3-decision-map', 'optionsInk', '<=', 760),
  T('V4', 'bank-payment', 'ch9-threat', 'ink', '<=', 4250), T('V4', 'bank-payment', 'ch9-threat', 'heads', '=', 11), T('V4', 'bank-payment', 'ch9-threat', 'overlaps', '=', 0),
  ...[['bank-payment', 3000], ['library-reservations', 3800], ['parcel-lockers', 3850], ['clinic-appointments', 3150], ['warehouse-fulfilment', 3350], ['service-permits', 2950]].map(([p, v]) => T('V4', p, 'ch2-utility', 'ink', '<=', v)),
  ...[['bank-payment', 4], ['library-reservations', 19], ['parcel-lockers', 33], ['clinic-appointments', 8], ['service-permits', 13], ['warehouse-fulfilment', 2]].map(([p, v]) => T('V5', p, 'ch1-context', 'visualCrossings', '<=', v, 'fan-out plus track order')),
  T('V5', 'parcel-lockers', 'ch1-context', 'W', '<=', 1238), T('V5', 'parcel-lockers', 'ch1-context', 'maxPortsPerSide', '<=', 3, 'five of its steps have four people taking part, and each relationship keeps its own target port'),
  ...[['library-reservations', 5488], ['parcel-lockers', 9746], ['clinic-appointments', 5048], ['warehouse-fulfilment', 2259], ['service-permits', 5677]].map(([p, v]) => T('V5', p, 'ch1-context', 'ink', '<=', v, 'today\'s ink, on every journey')),
  T('V5', 'bank-payment', 'ch1-context', 'ink', '<=', 2375, 'outside the spec\'s acceptance (journeys only): V2\'s delivers order widens a label gap 21 px more than today\'s'),
  T('V6', 'bank-payment', 'ch10-deployment', 'heads', '<=', 15), T('V6', 'bank-payment', 'ch10-deployment', 'visualCrossings', '<=', 12), T('V6', 'bank-payment', 'ch10-deployment', 'ink', '<=', 8600),
  T('V6', 'bank-payment', 'ch10-deployment', 'marks', '=', 37), T('V6', 'bank-payment', 'ch10-deployment@modules', 'heads', '=', 6), T('V6', 'bank-payment', 'ch10-deployment@modules', 'visualCrossings', '=', 0, 'the 0 came from a prototype that put marks at row centres, on the stubs of other rails; with marks 6 px above and stubs 6 px below, each of the two pairs left has each rail\'s stub inside the other\'s span, so 2 is the least any order draws'),
  T('V7', 'bank-payment', 'whole-design@ch6', 'lines', '<=', 17), T('V7', 'bank-payment', 'whole-design@ch6', 'needInkLayersClosed', '<=', 2000, 'with no layer opened, as the investigation measured it'), T('V7', 'bank-payment', 'whole-design@ch6', 'passes', '<=', 10),
  T('V7', 'bank-payment', 'whole-design@ch8', 'lines', '<=', 26), T('V7', 'bank-payment', 'whole-design@ch10', 'linesExcludingLensOnly', '<=', 26, 'the spec counts Ch10 without its lens-only operate threads'), T('V7', 'bank-payment', 'whole-design@ch11', 'lines', '<=', 26)
];
// A metric of a row: drawn and control values, from the line metrics or the [drawn, control] pairs in extra.
export const metricOf = (row, m) => (m in row.drawn ? [row.drawn[m], row.control[m]] : Array.isArray(row.extra[m]) ? row.extra[m] : [row.extra[m], row.extra[m]]);

// The assertions each workstream switches on when it lands: relative to the in-run control, or structural.
const RULES = {
  V2: [
    ['lane crossings at or below today\'s interval colouring', r => ['ch1-context', 'ch4-responsibilities', 'ch5-components', 'ch9-threat'].includes(r.view), r => r.drawn.visualCrossings <= r.control.visualCrossings && r.drawn.crossingPairs <= r.control.crossingPairs, r => `visual ${r.drawn.visualCrossings} vs ${r.control.visualCrossings}, pairs ${r.drawn.crossingPairs} vs ${r.control.crossingPairs}`],
    ['lane levels within the budget (colouring + max(2, 15%)) in every gutter', r => ['ch1-context', 'ch4-responsibilities', 'ch5-components', 'ch9-threat'].includes(r.view), r => !r.structure.overBudget.length, r => r.structure.overBudget.join('; ') || 'within'],
    ['Ch1 gutters grow by at most 42 px before V5', (r, landed) => r.view === 'ch1-context' && !landed.has('V5'), r => r.extra.gutterW[0] - r.extra.gutterW[1] <= 42, r => `${r.extra.gutterW[0]} vs ${r.extra.gutterW[1]} px`],
    ['Ch6 bracket crossings at or below today\'s colouring, no extra level', r => r.view === 'ch6-platform', r => r.drawn.visualCrossings <= r.control.visualCrossings && r.extra.levels[0] <= r.extra.levels[1], r => `crossings ${r.drawn.visualCrossings} vs ${r.control.visualCrossings}, levels ${r.extra.levels.join(' vs ')}`]
  ],
  V3: [
    ['Ch3 crossings at or below the priority order', r => r.view === 'ch3-decision-map', r => r.drawn.visualCrossings <= r.control.visualCrossings && r.drawn.crossingPairs <= r.control.crossingPairs, r => `visual ${r.drawn.visualCrossings} vs ${r.control.visualCrossings}, pairs ${r.drawn.crossingPairs} vs ${r.control.crossingPairs}`],
    ['Ch3 weighs and options ink at or below one line per route, no overlap added, gutter unchanged', r => r.view === 'ch3-decision-map', r => r.extra.weighsInk[0] <= r.extra.weighsInk[1] && r.extra.optionsInk[0] <= r.extra.optionsInk[1] && r.drawn.overlaps <= r.control.foreignOverlaps && r.extra.gutterW[0] === r.extra.gutterW[1], r => `weighs ${r.extra.weighsInk.join(' vs ')}, options ${r.extra.optionsInk.join(' vs ')}, overlaps ${r.drawn.overlaps} vs foreign ${r.control.foreignOverlaps}, gutter ${r.extra.gutterW.join(' vs ')}`]
  ],
  V4: [
    ['Ch9 heads equal entries plus contracts', r => r.view === 'ch9-threat', r => r.drawn.heads === r.extra.entries + r.extra.contracts, r => `${r.drawn.heads} heads, ${r.extra.entries} entries + ${r.extra.contracts} contracts`],
    ['Ch9 ink at or below one line per route, no overlap added', r => r.view === 'ch9-threat', r => r.drawn.ink <= r.control.ink && r.drawn.overlaps <= r.control.foreignOverlaps, r => `ink ${r.drawn.ink} vs ${r.control.ink}, overlaps ${r.drawn.overlaps} vs foreign ${r.control.foreignOverlaps}`],
    ['Ch2 one comb per parent', r => r.view === 'ch2-utility', r => !r.structure.combFaults.length, r => r.structure.combFaults.join('; ') || `${r.structure.combs} combs for ${r.structure.parents} parents`],
    ['Ch2 ink at or below one line per edge, crossings at or below, no ink drawn twice', r => r.view === 'ch2-utility', r => r.drawn.ink <= r.control.ink && r.drawn.visualCrossings <= r.control.visualCrossings && r.drawn.overlaps <= r.control.foreignOverlaps, r => `ink ${r.drawn.ink} vs ${r.control.ink}, crossings ${r.drawn.visualCrossings} vs ${r.control.visualCrossings}, overlaps ${r.drawn.overlaps} vs foreign ${r.control.foreignOverlaps}`]
  ],
  // The spec's ink acceptance is 'on every journey' (the five reference journeys; its prototype measured bank-payment
  // 2 px above today's too). On bank-payment V2's crossing-aware delivers order puts the short REQ-001 path on the
  // farthest track, so its words widen the system-to-outcomes gap 21 px more than today's (105 px over five paths)
  // and the fans' saving (103 px) does not cover it: that picture is held to the fans' own effect, ink at or below the
  // same picture without fan-out, which every Ch1 picture must meet.
  V5: [
    ['Ch1 crossings and ports at or below today\'s Context', r => r.view === 'ch1-context', r => r.drawn.visualCrossings <= r.control.visualCrossings && r.drawn.crossingPairs <= r.control.crossingPairs && r.extra.maxPortsPerSide[0] <= r.extra.maxPortsPerSide[1], r => `crossings ${r.drawn.visualCrossings} vs ${r.control.visualCrossings}, pairs ${r.drawn.crossingPairs} vs ${r.control.crossingPairs}, ports ${r.extra.maxPortsPerSide.join(' vs ')}`],
    ['Ch1 ink at or below today\'s Context on every journey', r => r.view === 'ch1-context' && JOURNEYS.has(r.project), r => r.drawn.ink <= r.control.ink, r => `ink ${r.drawn.ink} vs ${r.control.ink}`],
    ['Ch1 ink at or below the same picture without fan-out, no line drawn on another', r => r.view === 'ch1-context', r => r.drawn.ink <= r.extra.unfannedInk && r.drawn.foreignOverlaps === 0, r => `ink ${r.drawn.ink} vs ${r.extra.unfannedInk} unfanned (${r.control.ink} today), foreign overlaps ${r.drawn.foreignOverlaps}`]
  ],
  V6: [
    ['Ch10 rails: a rail and a head per needed part, one mark per link, spans, marks off stubs, levels in budget', r => r.view.startsWith('ch10-'), r => !r.structure.railFaults.length && r.drawn.heads === r.extra.targets, r => r.structure.railFaults.join('; ') || `${r.drawn.heads} heads for ${r.extra.targets} needed parts`],
    // Ink is held to today's where a rail is shared (a part needed by two or more): that is where the rails draw once
    // what today's trunks drew per link. Where no part has a second dependent (parcel-lockers, library-reservations:
    // one part needs two or three), each needed part still gets its own rail and level, where today one trunk served
    // the one needing part, so the rails draw a few px more (each extra level's stub is one ARC_STEP longer).
    ['Ch10 heads and crossings at or below today\'s trunks, and ink too wherever a rail is shared', r => r.view.startsWith('ch10-'), r => r.drawn.heads <= r.control.heads && r.drawn.visualCrossings <= r.control.visualCrossings && (!r.structure.sharedRails || r.drawn.ink <= r.control.ink), r => `heads ${r.drawn.heads} vs ${r.control.heads}, crossings ${r.drawn.visualCrossings} vs ${r.control.visualCrossings}, ink ${r.drawn.ink} vs ${r.control.ink}${r.structure.sharedRails ? '' : ' (no rail shared: ink not held)'}`]
  ],
  V7: [
    ['Whole design: one spine per component, feet are its needs, no spine behind a component', r => r.view.startsWith('whole-design'), r => !r.structure.spineFaults.length, r => r.structure.spineFaults.join('; ') || `${r.structure.spines} spines`],
    ['Whole design lines, need ink and passes at or below one pillar per need', r => r.view.startsWith('whole-design'), r => r.drawn.lines <= r.control.lines && r.extra.needInk[0] <= r.extra.needInk[1] && r.extra.passes[0] <= r.extra.passes[1], r => `lines ${r.drawn.lines} vs ${r.control.lines}, need ink ${r.extra.needInk.join(' vs ')}, passes ${r.extra.passes.join(' vs ')}`]
  ]
};
// Merged wires keep principle 3 (design-spec.json): no foreign line through or near a join, along shared ink, or as a T.
// The views whose wires a workstream merges.
const MERGES = {V3: ['ch3-decision-map'], V4: ['ch2-utility', 'ch9-threat'], V5: ['ch1-context']};
const integrity = ws => ['merged wires: no foreign line at a join, along shared ink or as a T', r => MERGES[ws].includes(r.view), r => r.conflicts != null && !r.conflicts.atJoin && !r.conflicts.onTrunk && !r.conflicts.tContacts, r => JSON.stringify(r.conflicts)];

export function evaluate(rows, landed = LANDED) {
  const name = r => r.project + ' · ' + r.view, anchors = [], identities = [], assertions = [], awaiting = [], targets = [];
  // Anchors: the control reproduces the investigation's numbers.
  for (const [project, view, m, x] of ANCHORS) {
    const r = rows.find(q => q.project === project && q.view === view); if (!r) continue;
    for (const [k, v] of Object.entries({...m, ...x})) { const measured = k in r.control ? r.control[k] : metricOf(r, k)[1]; anchors.push({picture: name(r), metric: k, frozen: v, measured, holds: measured === v}); }
  }
  // Identities: while none of a view's workstreams has landed, the control is the drawing, line for line.
  for (const r of rows) {
    const ws = VIEW.get(r.view).ws, open = ws.filter(w => landed.has(w));
    if (open.length) continue;
    const holds = sameLines(r.lines, r.controlLines) && JSON.stringify(r.drawn) === JSON.stringify(r.control);
    identities.push({picture: name(r), holds, detail: holds ? 'control = drawing' : 'the control differs from the drawing: ' + JSON.stringify({drawn: r.drawn, control: r.control})});
  }
  // Engine guarantees on every lane picture, always.
  for (const r of rows.filter(q => 'through' in q.structure)) assertions.push({ws: 'always', rule: 'lane routes orthogonal and through no card', picture: name(r), holds: !r.structure.diagonal && !r.structure.through, detail: `diagonal ${r.structure.diagonal}, through ${r.structure.through}`});
  for (const ws of CHAPTER_WORKSTREAMS) for (const [rule, applies, check, detail] of [...RULES[ws], ...(MERGES[ws] ? [integrity(ws)] : [])]) {
    const rs = rows.filter(r => VIEW.get(r.view).ws.includes(ws) && applies(r, landed));
    if (!landed.has(ws)) { awaiting.push({ws, rule, pictures: rs.length}); continue; }
    for (const r of rs) { const holds = !!check(r); assertions.push({ws, rule, picture: name(r), holds, detail: detail(r)}); }
  }
  for (const t of TARGETS) {
    const r = rows.find(q => q.project === t.project && q.view === t.view); if (!r) continue;
    const [drawn, control] = metricOf(r, t.metric), met = t.op === '=' ? drawn === t.value : drawn <= t.value;
    targets.push({ws: t.ws, picture: name(r), metric: t.metric, today: control, target: t.op + ' ' + t.value, drawn, met, landed: landed.has(t.ws), ...(t.note ? {note: t.note} : {})});
  }
  return {anchors, identities, assertions, awaiting, targets};
}

// ---------------------------------------------------------------- the evidence

const sha256 = text => createHash('sha256').update(text).digest('hex');
export const SOURCES = ['public/lane-layout.js', 'public/story-layout.js', 'public/utility-layout.js', 'public/tradeoff-layout.js', 'public/responsibility-layout.js', 'public/realise-layout.js', 'public/platform-layout.js', 'public/threat-layout.js', 'public/deploy-layout.js', 'public/anatomy-layout.js', 'public/wire-merge.js', 'scripts/chapter-lines-evidence.mjs'];

// The evidence for every project (or those in `only`; `projects` reuses documents already built).
export function chapterLines({only = null, landed = LANDED, projects = chapterProjects(only)} = {}) {
  const rows = [], shapes = new Set(), empty = [];
  for (const P of projects) { const m = measureProject(P, landed); rows.push(...m.rows); for (const s of m.shapes) shapes.add(s); empty.push(...m.empty.map(v => P.key + ' · ' + v)); }
  const ev = evaluate(rows, landed);
  const pkg = JSON.parse(readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  const count = (xs, k = 'holds') => ({held: xs.filter(x => x[k]).length, of: xs.length});
  const pictures = rows.map(({lines, controlLines, ...r}) => r);
  const totals = Object.fromEntries(VIEWS.map(v => v.view).map(view => {
    const rs = pictures.filter(r => r.view === view), sum = (side, k) => rs.reduce((t, r) => t + r[side][k], 0);
    return [view, Object.fromEntries(['lines', 'heads', 'marks', 'joins', 'ink', 'uniqueInk', 'visualCrossings', 'overlaps'].map(k => [k, [sum('drawn', k), sum('control', k)]]))];
  }));
  return {
    schema: 'aiw.chapter-lines.v1', round: 10, workstream: 'V8', release: pkg.release, controllingBaseline: 'AIW v0.10.0-rc.10.73.6', productionAccepted: false,
    generator: 'scripts/chapter-lines-evidence.mjs', gate: 'chapter-lines-validate.mjs (npm run test:chapter-lines)',
    landed: CHAPTER_WORKSTREAMS.filter(w => landed.has(w)), shapesInSource: CHAPTER_WORKSTREAMS.filter(w => shapes.has(w)),
    measuredAs: {projects: 'bank-payment and the five reference journeys, built by createProject as POST /api/projects builds them', state: 'whole system, default depth, no proposal, no selection; Whole design at each chapter\'s default lens and layer', widths: {ch10: DEPLOY_W, wholeDesign: ANATOMY_W}, pairs: 'extra holds [drawn, control] pairs'},
    definitions: DEFINITIONS,
    controls: {lanes: 'the same ports, today\'s interval colouring (3 px gap), one line and head per route; Ch1 from today\'s Context configuration (no fan-out)', ch3: 'driver tracks and ports in priority order', ch6: 'today\'s bracket colouring (4 px gap)', ch10: 'today\'s trunks, interval coloured (3 px gap), two paths, a head and a dot per link', ch2: 'one line per edge', wholeDesign: 'one pillar per need'},
    sources: Object.fromEntries(SOURCES.map(f => [f, sha256(readFileSync(path.join(REPO, f), 'utf8'))])),
    projects: projects.map(p => ({key: p.key, name: p.name, how: p.how, pictures: pictures.filter(r => r.project === p.key).length})),
    summary: {pictures: pictures.length, empty, anchors: count(ev.anchors), identities: count(ev.identities), assertions: count(ev.assertions), awaiting: ev.awaiting.map(a => a.ws + ': ' + a.rule), targets: {met: ev.targets.filter(t => t.met).length, of: ev.targets.length, landedMet: ev.targets.filter(t => t.landed && t.met).length, landedOf: ev.targets.filter(t => t.landed).length}},
    totals, anchors: ev.anchors, identities: ev.identities, assertions: ev.assertions, awaiting: ev.awaiting, targets: ev.targets, pictures
  };
}
// Readable where it is read (the head indented), compact where it is long: one line per entry of a list of records
// (anchors, identities, assertions, targets, pictures) and per view of the totals.
export function serialise(evidence) {
  const part = ([k, v]) => {
    if (Array.isArray(v) && v.length && v.every(x => x && typeof x === 'object')) return ' ' + JSON.stringify(k) + ': [\n' + v.map(x => '  ' + JSON.stringify(x)).join(',\n') + '\n ]';
    if (k === 'totals') return ' "totals": {\n' + Object.entries(v).map(([view, t]) => '  ' + JSON.stringify(view) + ': ' + JSON.stringify(t)).join(',\n') + '\n }';
    return ' ' + JSON.stringify(k) + ': ' + JSON.stringify(v, null, 1).replace(/\n/g, '\n ');
  };
  return '{\n' + Object.entries(evidence).map(part).join(',\n') + '\n}\n';
}
export const failures = e => [...e.anchors.filter(a => !a.holds).map(a => 'anchor ' + a.picture + ' ' + a.metric + ': ' + a.measured + ' (frozen ' + a.frozen + ')'), ...e.identities.filter(i => !i.holds).map(i => 'identity ' + i.picture + ': ' + i.detail), ...e.assertions.filter(a => !a.holds).map(a => a.ws + ' ' + a.rule + ' · ' + a.picture + ': ' + a.detail)];

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2), flag = k => argv.includes(k), arg = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const started = performance.now(), only = arg('--project') ? new Set(arg('--project').split(',')) : null;
  const evidence = chapterLines({only}), text = serialise(evidence);
  if (flag('--stdout')) process.stdout.write(text);
  else {
    const out = path.resolve(REPO, arg('--out', 'audit/round11/evidence'));
    mkdirSync(out, {recursive: true}); writeFileSync(path.join(out, 'chapter-lines.json'), text);
    const s = evidence.summary;
    console.log(`pictures ${s.pictures} · anchors ${s.anchors.held}/${s.anchors.of} · identities ${s.identities.held}/${s.identities.of} · assertions ${s.assertions.held}/${s.assertions.of} · targets met ${s.targets.met}/${s.targets.of} (landed ${s.targets.landedMet}/${s.targets.landedOf}) · landed [${evidence.landed.join(', ')}]`);
    for (const [view, t] of Object.entries(evidence.totals)) console.log(view.padEnd(26), Object.entries(t).map(([k, [d, c]]) => `${k} ${d}${d === c ? '' : ' (control ' + c + ')'}`).join('  '));
    console.log(`wrote ${path.relative(REPO, out)}/chapter-lines.json in ${Math.round(performance.now() - started)} ms`);
  }
  const bad = failures(evidence);
  if (flag('--check') && bad.length) { console.error('chapter-lines: ' + bad.length + ' failure(s)\n' + bad.slice(0, 40).join('\n')); process.exit(1); }
}
