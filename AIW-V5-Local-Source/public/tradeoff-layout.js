// Chapter 3 Model — deterministic layout for the decision map and the trade-off matrix.
//
// Decision map: the drivers on the left, the decisions in the middle, each decision's alternatives
// on the right. Each driver has its own track in the first gutter and its own port on every
// decision it reaches, so no two routes share a segment. The drivers stay in priority order down
// the page; only the order of their tracks across the gutter follows the crossings (round 10, V3):
// the order with the fewest crossings is searched exactly up to TRACKS.EXACT linked drivers and
// found with the shared track assigner (wire-merge.js) beyond, and on each decision the routes
// arriving from above take the top ports, the track nearest the decisions first, and the routes
// from below the bottom ports in mirror order. Each decision's alternatives hang from one comb in
// the second gutter. Trade-off matrix: drivers down a sticky rail, alternatives across in groups
// under sticky decision heads, and a weighted row beneath. Neither layout reads the lens.
// Guarantees are checked in tradeoff-validate.mjs.
import {assignTracks, trackCrossings, mergeWires, wireConflicts} from './wire-merge.js';

export const DM = {HEAD_H: 64, PAD: 16, DRV_W: 236, DRV_H: 100, DEC_W: 262, DEC_H: 170, ALT_W: 320, ALT_H: 168, SUG_H: 132, G2: 46, TRACK: 11, VGAP: 12, BGAP: 26};
export function mapHead() { return DM.HEAD_H + 8; }

// Track search: every order of up to EXACT linked drivers is searched (branch and bound over the orders, so the result
// is the true minimum of the crossings the port rule leaves); above that the shared assigner orders the tracks for the
// ports the rule gives (exactly by subsets up to its own limit, greedily beyond), re-run on the ports of its order
// until the order settles, at most ROUNDS times, once above ONCE linked drivers, and not above ASSIGN (where the
// priority order takes the port rule alone), so the layout's time stays bounded. COMB is the step between the spines of
// one decision's comb where its alternatives are drawn in more than one style; CLEAR how near (px) another line may
// come: a decision stub within CLEAR of a farther driver's stub runs along it (and would pass through the dot where
// that driver's track divides), and no other style's line comes within CLEAR of a comb's spine. CHECK is the most
// weighs routes whose merged ink is checked line against line (apartOf); a larger map that needs the check draws them
// apart.
export const TRACKS = {EXACT: 8, ROUNDS: 6, ONCE: 24, ASSIGN: 120, EPS: 0.5, COMB: 8, CLEAR: 4, CHECK: 400};
const ALONG = 1e6; // a run along another driver's stub costs more than every crossing the gutter can hold

// The weighs routes as a track problem: each linked driver's stub height, and per decision its port heights and the
// drivers that reach it from above or below its middle, in priority order. The ports are spread down the decision's
// left side; with `clear`, a port within TRACKS.CLEAR of a driver's stub height moves just clear of it (up or down,
// keeping the ports in order, apart and on the card), so no decision stub can run beside another driver's stub or pass
// through the dot where its track divides, whatever the track order.
function weighsProblem(F, C, clear) {
  const incoming = new Map();
  for (const l of F.links) { if (!incoming.has(l.to)) incoming.set(l.to, []); incoming.get(l.to).push(l.from); }
  const sy = new Map(F.drivers.map(id => { const s = C.get(id); return [id, Math.round(s.y + s.h / 2)]; }));
  const decs = [...incoming].map(([to, froms]) => {
    const d = C.get(to), ordered = F.drivers.filter(id => froms.includes(id)), mid = d.y + d.h / 2;
    const slots = ordered.map((_, k) => Math.round(d.y + 26 + (k + 0.5) * ((d.h - 40) / ordered.length)));
    return {to, ordered, slots, above: ordered.filter(id => sy.get(id) <= mid), below: ordered.filter(id => sy.get(id) > mid), top: d.y + 12, foot: d.y + d.h - 12};
  });
  const of = new Map(F.drivers.map(id => [id, []]));
  for (const D of decs) for (const id of D.ordered) of.get(id).push(D);
  const linked = F.drivers.filter(id => of.get(id).length), stubs = linked.map(id => sy.get(id)), E = TRACKS.CLEAR;
  if (clear) for (const D of decs) D.slots.forEach((y, k) => {
    const hit = stubs.find(v => Math.abs(v - y) <= E);
    if (hit === undefined) return;
    const lo = k ? D.slots[k - 1] + E : D.top, hi = k + 1 < D.slots.length ? D.slots[k + 1] - E : D.foot;
    const to = (y >= hit ? [hit + E + 2, hit - E - 2] : [hit - E - 2, hit + E + 2]).find(v => v > lo && v < hi && stubs.every(w => Math.abs(w - v) > E));
    if (to !== undefined) D.slots[k] = to;
  });
  return {drivers: F.drivers, index: new Map(F.drivers.map((id, i) => [id, i])), linked, sy, decs, of};
}
// The port of every route ('from>to' → y): in priority order, or by the port rule for the track ranks given.
function portsOf(P, rank, rule) {
  const py = new Map();
  for (const D of P.decs) {
    const seq = rule ? [...[...D.above].sort((a, b) => rank.get(b) - rank.get(a)), ...[...D.below].sort((a, b) => rank.get(a) - rank.get(b))] : D.ordered;
    seq.forEach((id, k) => py.set(id + '>' + D.to, D.slots[k]));
  }
  return py;
}
// One track per linked driver for the shared assigner: level 0 nearest the drivers; the driver's stub runs towards
// them (inner), its decision stubs away (outer). Keys sort in priority order, so the assigner's ties keep it.
function trackItems(P, py) {
  return P.linked.map(id => {
    const outer = P.of.get(id).map(D => py.get(id + '>' + D.to)), ys = [P.sy.get(id), ...outer];
    return {key: String(P.index.get(id)).padStart(6, '0'), id, a: Math.min(...ys), b: Math.max(...ys), inner: [P.sy.get(id)], outer};
  });
}
// The crossings (the shared assigner's model) and the runs along another driver's stub of an order (linked drivers,
// nearest the drivers first): a decision stub of a nearer track within CLEAR of a farther driver's stub.
function scoreOf(P, order, rule) {
  const rank = new Map(order.map((id, i) => [id, i])), items = trackItems(P, portsOf(P, rank, rule)), level = new Map(items.map(t => [t.key, rank.get(t.id)]));
  let alongs = 0;
  for (const p of items) for (const q of items) if (rank.get(p.id) < rank.get(q.id)) for (const y of p.outer) if (Math.abs(y - q.inner[0]) <= TRACKS.CLEAR) alongs++;
  return {order, rule, items, crossings: trackCrossings(items, level, {gap: Infinity}), alongs};
}
const better = (p, q) => p.alongs < q.alongs || (p.alongs === q.alongs && p.crossings < q.crossings);
// Every order of the linked drivers under the port rule, by branch and bound from a seed order. Placing the tracks from
// the drivers outward fixes each one's ports as it is placed (its rank among a decision's drivers is then known). What
// a placed track will cost against every track still to come is charged when it is placed, as far as it is known: the
// later drivers' stubs it crosses or runs along, and its decision stubs that cross the least span a later track can
// have (its stub and the nearest port the rule can give it on each decision); the rest is charged when that track is
// placed. So a prefix's cost never exceeds that of any order completing it; two tracks still to come add at least the
// crossing the cheaper of their two orders must draw between their least spans. The search is exact. Children go in
// priority order; the bound starts half a crossing above the seed's cost and only a cheaper order replaces the best, so
// the result is the first order in priority order of the least cost: ties keep the priority order.
function exactOrder(P, seed) {
  const ids = P.linked, n = ids.length, at = new Map(ids.map((id, i) => [id, i])), E = TRACKS.EPS;
  const sy = ids.map(id => P.sy.get(id)), inside = (y, a, b) => y > a + E && y < b - E;
  const mem = ids.map(id => P.of.get(id).map(D => ({slots: D.slots, up: D.above.includes(id), A: D.above.map(x => at.get(x)), B: D.below.map(x => at.get(x))})));
  const minLo = Float64Array.from(sy), minHi = Float64Array.from(sy);
  mem.forEach((ms, j) => { for (const m of ms) { const r = m.up ? m.slots.slice(0, m.A.length) : m.slots.slice(m.A.length), y = r.reduce((b, v) => (Math.abs(v - sy[j]) < Math.abs(b - sy[j]) ? v : b)); minLo[j] = Math.min(minLo[j], y); minHi[j] = Math.max(minHi[j], y); } });
  const pair = ids.map((_, u) => ids.map((__, v) => (u === v ? 0 : Math.min(inside(sy[v], minLo[u], minHi[u]) ? 1 : 0, inside(sy[u], minLo[v], minHi[v]) ? 1 : 0))));
  let rest = 0; for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) rest += pair[u][v];
  const placed = new Uint8Array(n), order = [], lo = new Float64Array(n), hi = new Float64Array(n), outs = ids.map(() => []);
  let best = seed.alongs * ALONG + seed.crossings + 0.5, bestOrder = seed.order.map(id => at.get(id));
  const place = j => {
    const o = outs[j]; o.length = 0; lo[j] = hi[j] = sy[j];
    for (const m of mem[j]) {
      let k = m.up ? 0 : m.A.length;
      if (m.up) { for (const x of m.A) if (x !== j && !placed[x]) k++; } else for (const x of m.B) if (placed[x]) k++;
      const y = m.slots[k]; o.push(y); if (y < lo[j]) lo[j] = y; if (y > hi[j]) hi[j] = y;
    }
    let c = 0;
    for (const i of order) for (const y of outs[i]) c += (inside(y, lo[j], hi[j]) ? 1 : 0) - (inside(y, minLo[j], minHi[j]) ? 1 : 0);
    for (let u = 0; u < n; u++) {
      if (placed[u] || u === j) continue;
      if (inside(sy[u], lo[j], hi[j])) c++;
      for (const y of o) { if (inside(y, minLo[u], minHi[u])) c++; if (Math.abs(y - sy[u]) <= TRACKS.CLEAR) c += ALONG; }
    }
    return c;
  };
  const search = cost => {
    if (order.length === n) { best = cost; bestOrder = [...order]; return; }
    for (let j = 0; j < n; j++) {
      if (placed[j]) continue;
      let drop = 0; for (let u = 0; u < n; u++) if (!placed[u]) drop += pair[j][u];
      const c = cost + place(j);
      if (c + rest - drop >= best) continue;
      placed[j] = 1; order.push(j); rest -= drop; search(c); rest += drop; order.pop(); placed[j] = 0;
    }
  };
  search(0);
  return scoreOf(P, bestOrder.map(i => ids[i]), true);
}
// The shared assigner orders the tracks for the ports the rule gives the current order, and the rule is applied again
// to its order, until an order repeats; the best order seen is kept. Above TRACKS.EXACT this is the order drawn; up to
// it, the seed of the exact search.
function assignedOrder(P, seed) {
  let best = seed, order = seed.order;
  const seen = new Set([order.join('\u0000')]), m = order.length, rounds = m > TRACKS.ASSIGN ? 0 : m > TRACKS.ONCE ? 1 : TRACKS.ROUNDS;
  for (let round = 0; round < rounds; round++) {
    const items = trackItems(P, portsOf(P, new Map(order.map((id, i) => [id, i])), true)), A = assignTracks(items, {gap: Infinity, avoidAlongs: true});
    order = [...items].sort((p, q) => A.level.get(p.key) - A.level.get(q.key)).map(t => t.id);
    const key = order.join('\u0000');
    if (seen.has(key)) break;
    seen.add(key);
    const s = scoreOf(P, order, true);
    if (better(s, best)) best = s;
  }
  return best;
}
// The track order and ports: 'priority' is the map as drawn before round 10 (tracks and ports in priority order), the
// in-run control; 'crossings' (the default) keeps the ports clear of the drivers' stubs and searches the order under the
// port rule, falling back to the priority order (on those ports) where that would cross less. `priority` reports the
// map as drawn before round 10.
function trackPlan(F, C, trackOrder) {
  const P0 = weighsProblem(F, C, false), before = scoreOf(P0, P0.linked, false);
  if (trackOrder === 'priority') return {P: P0, how: 'priority', ...before, priority: before};
  const P = weighsProblem(F, C, true), control = scoreOf(P, P.linked, false), m = P.linked.length;
  const assigned = assignedOrder(P, scoreOf(P, P.linked, true)), found = m <= TRACKS.EXACT ? exactOrder(P, assigned) : assigned;
  const win = better(control, found) ? control : found;
  return {P, how: win === control ? 'priority' : m <= TRACKS.EXACT ? 'exact' : m <= TRACKS.ASSIGN ? 'assigned' : 'ports', ...win, priority: before};
}

// One comb per decision. Alternatives drawn alike share one stub (from the middle of the decision's right side) and one
// spine; where they are drawn in more than one style (recorded, an unsaved proposal, the playbook's suggestions) each
// style has its own stub and spine, since ink is shared only among lines drawn alike, and the spines take the columns
// that keep every style's stub and teeth clear of the others' spines.
function combOf(d, kids) {
  const groups = new Map();
  for (const c of kids) { const kind = c.kind === 'alt' ? 'option' : c.kind; if (!groups.has(kind)) groups.set(kind, []); groups.get(kind).push(c); }
  const k = groups.size, xm = d.x + d.w + DM.G2 / 2, G = [...groups].map(([kind, cs], g) => {
    const y = k === 1 ? Math.round(d.y + d.h / 2) : Math.round(d.y + 26 + (g + 0.5) * ((d.h - 40) / k)), teeth = cs.map(c => Math.round(c.y + Math.min(c.h / 2, 48)));
    return {kind, cards: cs, y, teeth, y1: Math.min(y, ...teeth), y2: Math.max(y, ...teeth)};
  });
  const cols = G.map((g, c) => xm + (c - (k - 1) / 2) * TRACKS.COMB), near = (y, g) => y >= g.y1 - TRACKS.CLEAR && y <= g.y2 + TRACKS.CLEAR;
  const clashes = xs => {
    let n = 0;
    G.forEach((p, i) => G.forEach((q, j) => {
      if (i === j) return;
      if (xs[j] < xs[i] && near(p.y, q)) n++; // p's stub passes q's spine
      if (xs[j] > xs[i]) n += p.teeth.filter(t => near(t, q)).length; // p's teeth pass q's spine
      if (xs[j] < xs[i]) n += q.teeth.filter(t => Math.abs(t - p.y) < TRACKS.CLEAR).length; // p's stub along q's tooth
    }));
    return n;
  };
  const perms = a => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(r => [x, ...r])));
  let best = null;
  for (const p of perms([...cols.keys()])) { const xs = p.map(c => cols[c]), n = clashes(xs); if (!best || n < best.n) best = {xs, n}; if (!n) break; }
  return {groups: G, xs: best.xs, clashes: best.n};
}

export function mapLayout(F, {trackOrder = 'crossings'} = {}) {
  const top = mapHead() + DM.PAD;
  const tracks = F.drivers.length;
  const g1 = 34 + tracks * DM.TRACK;
  const X = {drv: DM.PAD}; X.dec = X.drv + DM.DRV_W + g1; X.alt = X.dec + DM.DEC_W + DM.G2;
  const cards = [];
  // Decisions and their alternatives, block by block.
  let y = top;
  for (const b of F.blocks) {
    const alts = b.alts, h = b.kind === 'style-proposal' ? DM.DEC_H - 20 : DM.DEC_H;
    if (!alts.length) { cards.push({id: b.id, kind: b.kind, block: b, x: X.dec, y, w: DM.DEC_W, h}); y += h + DM.BGAP; continue; }
    const t0 = y;
    for (const a of alts) { const ah = a.kind === 'suggested' ? DM.SUG_H : DM.ALT_H; cards.push({id: a.id, kind: a.kind, alt: a, decision: b.id, x: X.alt, y, w: DM.ALT_W, h: ah}); y += ah + DM.VGAP; }
    y -= DM.VGAP;
    const span = y - t0, dy = span > h ? t0 + (span - h) / 2 : t0;
    cards.push({id: b.id, kind: b.kind, block: b, x: X.dec, y: Math.round(dy), w: DM.DEC_W, h});
    y = Math.max(y, dy + h) + DM.BGAP;
  }
  // Drivers, in priority order down the left.
  F.drivers.forEach((id, i) => cards.push({id, kind: 'driver', x: X.drv, y: top + i * (DM.DRV_H + DM.VGAP), w: DM.DRV_W, h: DM.DRV_H}));
  const C = new Map(cards.map(c => [c.id, c]));
  // Driver → decision: a track per driver, a port per driver on each decision. In priority order each track keeps its
  // place at the driver's priority index (an unlinked driver's stays empty), as drawn before round 10; otherwise the
  // linked drivers' tracks come first, in the planned order. The gutter keeps its width either way.
  const plan = trackPlan(F, C, trackOrder), P = plan.P, rank = new Map();
  if (plan.how === 'priority') F.drivers.forEach((id, i) => rank.set(id, i));
  else plan.order.forEach((id, i) => rank.set(id, i));
  const py = portsOf(P, rank, plan.rule), txOf = id => X.drv + DM.DRV_W + 16 + rank.get(id) * DM.TRACK;
  const routes = [];
  for (const D of P.decs) for (const from of D.ordered) {
    const s = C.get(from), d = C.get(D.to), tx = txOf(from), p = py.get(from + '>' + D.to), sy = P.sy.get(from);
    routes.push({id: from + '>' + D.to, from, to: D.to, kind: 'weighs', pts: [[s.x + s.w, sy], [tx, sy], [tx, p], [d.x, p]]});
  }
  const trackList = P.linked.map(id => { const ys = [P.sy.get(id), ...P.of.get(id).map(D => py.get(id + '>' + D.to))]; return {id, level: rank.get(id), x: txOf(id), y1: Math.min(...ys), y2: Math.max(...ys)}; });
  // Decision → alternatives: one comb each.
  const combs = [], option = new Map();
  for (const b of F.blocks) {
    const kids = cards.filter(c => c.decision === b.id);
    if (!kids.length) continue;
    const d = C.get(b.id), K = combOf(d, kids);
    const parts = K.groups.map((g, i) => {
      const x = K.xs[i];
      g.cards.forEach((c, t) => option.set(c.id, {d, x, y: g.y, ty: g.teeth[t], kind: g.kind}));
      return {kind: g.kind, x, y: g.y, y1: g.y1, y2: g.y2, to: g.cards.map(c => c.id), ids: g.cards.map(c => b.id + '>' + c.id)};
    });
    combs.push({id: 'comb:' + b.id, from: b.id, parts, ...(K.clashes ? {clashes: K.clashes} : {})});
  }
  for (const c of cards.filter(c => c.decision)) {
    const o = option.get(c.id);
    routes.push({id: c.decision + '>' + c.id, from: c.decision, to: c.id, kind: o.kind, pts: [[o.d.x + o.d.w, o.y], [o.x, o.y], [o.x, o.ty], [c.x, o.ty]]});
  }
  const W = X.alt + DM.ALT_W + DM.PAD, H = Math.max(top + 40, ...cards.map(c => c.y + c.h)) + 24;
  return {
    kind: 'map', W, H, top: mapHead(), rail: 0, cards, routes, combs, tracks: trackList, apart: apartOf(routes, {weighs: plan.alongs > 0 || P.decs.some(D => D.slots.some((y, k) => k && y - D.slots[k - 1] <= TRACKS.CLEAR)), options: combs.some(c => c.clashes)}),
    trackPlan: {how: plan.how, crossings: plan.crossings, alongs: plan.alongs, priority: {crossings: plan.priority.crossings, alongs: plan.priority.alongs}},
    cols: [{id: 'drivers', x: X.drv, w: DM.DRV_W}, {id: 'decisions', x: X.dec, w: DM.DEC_W}, {id: 'alternatives', x: X.alt, w: DM.ALT_W}], gutter: {x: X.drv + DM.DRV_W, w: g1}
  };
}

// How the map's lines share ink (the view draws them so, and the chapter evidence measures them so): a driver's weighs
// routes share its stub and track ('drv:' + driver), a decision's alternatives in one style share its comb ('dec:' +
// decision, the style the route's kind); each joined at the shared end. A share in L.apart stands each of its routes
// alone.
export function mapWireRoutes(L, apart = new Set((L.apart || []).map(a => a.share))) {
  const decl = (r, share) => ({id: r.id, pts: r.pts, share: apart.has(share) ? null : share, end: 'from', style: r.kind});
  return {weighs: L.routes.filter(r => r.kind === 'weighs').map(r => decl(r, 'drv:' + r.from)), options: L.routes.filter(r => r.kind !== 'weighs').map(r => decl(r, 'dec:' + r.from))};
}
// The shares whose merged ink would mislead (round 10, principle 3): a line of another share through or within 3 px of
// a join, along shared ink, or with a corner on it. Their routes are drawn apart, each on its own, and recorded here
// with the reason. Only a map that can hold one is checked: tracks are TRACK apart and ports of different decisions
// far apart, so a driver's merged ink can mislead only where a decision stub comes within TRACKS.CLEAR of another
// driver's stub (plan.alongs) or a decision's own ports sit that close; a comb only where its styles clash. Above
// TRACKS.CHECK weighs routes such a map draws every driver's lines apart rather than check them line against line.
function apartOf(routes, need) {
  const out = new Map(), D = mapWireRoutes({routes}, new Set());
  for (const [list, check] of [[D.weighs, need.weighs], [D.options, need.options]]) {
    if (!check) continue;
    if (list.length > TRACKS.CHECK) { for (const r of list) if (!out.has(r.share)) out.set(r.share, 'more lines than the merge check covers'); continue; }
    const Wr = mergeWires(list), c = wireConflicts(Wr), share = new Map(Wr.chains.map(ch => [ch.group, ch.share]));
    for (const [why, xs] of [['a line of another share at a join', c.atJoin], ['a line of another share along shared ink', c.onTrunk], ['a corner of another share on shared ink', c.tContacts]]) for (const e of xs) { const k = share.get(e.group); if (k && !out.has(k)) out.set(k, why); }
  }
  return [...out].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([share, reason]) => ({share, reason}));
}

// ---------------------------------------------------------------- matrix

export const MX = {HEAD_H: 166, GROUP_H: 58, RAIL: 250, COL_W: 136, STYLE_W: 112, GGAP: 18, ROW_H: 64, FOOT_H: 76, PAD: 12};
export function matrixHead() { return MX.HEAD_H + 8; }

export function matrixLayout(F) {
  const x0 = MX.RAIL + MX.PAD, cols = [], groups = [];
  let x = x0;
  for (const g of F.groups) {
    const w = g.kind === 'styles' ? MX.STYLE_W : MX.COL_W, gx = x;
    if (!g.cols.length) { groups.push({id: g.id, kind: g.kind, x, w: MX.COL_W, empty: true}); x += MX.COL_W + MX.GGAP; continue; }
    for (const id of g.cols) { cols.push({id, group: g.id, kind: g.kind, x, w}); x += w; }
    groups.push({id: g.id, kind: g.kind, x: gx, w: x - gx});
    x += MX.GGAP;
  }
  const top = matrixHead() + 6, rows = F.rows.map((id, i) => ({id, y: top + i * MX.ROW_H, h: MX.ROW_H}));
  const footY = top + rows.length * MX.ROW_H + 8;
  const W = Math.max(x - MX.GGAP + MX.PAD, x0 + 200), H = footY + MX.FOOT_H + 24;
  return {kind: 'matrix', W, H, top: matrixHead(), rail: MX.RAIL, cols, groups, rows, footY, footH: MX.FOOT_H};
}
