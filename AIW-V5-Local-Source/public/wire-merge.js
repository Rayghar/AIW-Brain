// Wires for the chapter views (round 10, V1): the one pure drawing module the chapter layouts and views share.
// No DOM, no clock, no randomness, no viewport: node suites import it as the browser does (wire-merge-validate.mjs).
//
// A chapter layout keeps one route per relationship. Where it declares that several routes may share ink (a fan into
// one element, a comb out of one parent), mergeWires draws that ink once:
// - Ink is shared only inside one declared share (one shared element and one side of it) and only among routes whose
//   style key is identical (the classes for kind, proposed, hole, sensitive, buffered, party and lens state). A share
//   whose members differ in style splits into identical-style sub-shares; no member's style is hidden under another's.
// - Each recorded route stays whole: every unit piece of it is carried by exactly the chains that list its id, so a
//   view can still light, select and describe one relationship along its full path (and draws lit or proposed routes
//   on their own, on top, from the layout's routes).
// - Chains run outward from the shared end, each with `offset` (its arc length from the shared end) for
//   stroke-dashoffset, so a dash pattern runs on unbroken from the root. Pieces whose members reach them along
//   different lengths (a share that rejoins itself) are never merged; they are drawn apart and listed in `apart`.
// - A join is reported only where three or more pieces of one sub-share meet; a plain crossing shares no vertex and
//   never gets one. There is one head per distinct end.
// wireConflicts names where another sub-share's ink would make merged wires mislead (a foreign line through a join,
// along shared ink, or a foreign corner on it), for the views' integrity checks.
// assignTracks orders gutter tracks to cut crossings within a level budget; colourTracks is the interval colouring
// the chapter layouts use today. headPath draws an arrowhead as a classed polygon, so heads take token fills from
// CSS. roundPath is the one rounded-corner path (model-stage.js re-exports it; audit F2-09).
// Exact-biclique buses are not built (round 10 decision: a bus implies relationships that are not recorded).
import {esc} from './html-escape.js';

export const WIRE = {GRID: 0.5, HEAD: 7, EXACT: 12, ORDER_MAX: 1500, REDUCE_MAX: 60, EPS: 0.5};

const snap = v => Math.round(v / WIRE.GRID) * WIRE.GRID + 0; // + 0 turns -0 into 0
const pk = p => p[0] + ',' + p[1];
const less = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
// p lies on the straight run from a to b (a corner or a turn back is kept).
const through = (a, p, b) => (a[0] === p[0] && p[0] === b[0] && (p[1] - a[1]) * (b[1] - p[1]) > 0) || (a[1] === p[1] && p[1] === b[1] && (p[0] - a[0]) * (b[0] - p[0]) > 0);
const segLen = (a, b) => (a[0] === b[0] ? Math.abs(b[1] - a[1]) : a[1] === b[1] ? Math.abs(b[0] - a[0]) : Math.hypot(b[0] - a[0], b[1] - a[1]));

// An SVG path through `pts` ([x, y] pairs on orthogonal segments) with each corner rounded by up to `r`.
export function roundPath(pts, r = 6) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i], [px, py] = pts[i - 1], n = pts[i + 1];
    if (!n) { d += `L${x} ${y}`; break; }
    const inLen = Math.hypot(x - px, y - py), outLen = Math.hypot(n[0] - x, n[1] - y), rr = Math.min(r, inLen / 2, outLen / 2);
    if (rr < 1) { d += `L${x} ${y}`; continue; }
    const ax = x - Math.sign(x - px) * rr, ay = y - Math.sign(y - py) * rr, bx = x + Math.sign(n[0] - x) * rr, by = y + Math.sign(n[1] - y) * rr;
    d += `L${ax} ${ay}Q${x} ${y} ${bx} ${by}`;
  }
  return d;
}

// The direction a route arrives at its last point: 'r', 'l', 'd' or 'u' along an axis, a unit [x, y] otherwise, and
// null when the route has no length.
export function headDir(pts) {
  for (let i = pts.length - 1; i > 0; i--) {
    const [x1, y1] = pts[i - 1], [x2, y2] = pts[i], dx = x2 - x1, dy = y2 - y1;
    if (!dx && !dy) continue;
    if (!dy) return dx > 0 ? 'r' : 'l';
    if (!dx) return dy > 0 ? 'd' : 'u';
    const n = Math.hypot(dx, dy); return [dx / n, dy / n];
  }
  return null;
}
const UNIT = {r: [1, 0], l: [-1, 0], d: [0, 1], u: [0, -1]};
const num = v => String(Math.round(v * 100) / 100 + 0);
// The outline of an arrowhead whose tip is (x, y), pointing along `dir`, `size` long and half as wide each side (the
// proportions of model-stage's arrowMarker). '' when there is no direction.
export function headD(x, y, dir, size = WIRE.HEAD) {
  const u = typeof dir === 'string' ? UNIT[dir] : Array.isArray(dir) && dir.length === 2 && (dir[0] || dir[1]) ? (n => [dir[0] / n, dir[1] / n])(Math.hypot(dir[0], dir[1])) : null;
  if (!u) return '';
  const [ux, uy] = u, bx = x - ux * size, by = y - uy * size, h = size / 2;
  return `M${num(x)} ${num(y)}L${num(bx - uy * h)} ${num(by + ux * h)}L${num(bx + uy * h)} ${num(by - ux * h)}Z`;
}
// The arrowhead as a polygon with a CSS class, so its fill comes from the stylesheet's tokens (not a marker's literal).
// Stable view relationship identities accompany every segment, head and label.
// A shared trunk lists its real members; visibility never guesses from geometry.
export const connectionAttrs = ids => `data-cm-links="${esc(JSON.stringify(Array.isArray(ids) ? ids : [ids]))}"`;
export function headPath(x, y, dir, size = WIRE.HEAD, cls = '', ids = null) {
  const d = headD(x, y, dir, size);
  return d ? `<path${cls ? ` class="${esc(cls)}"` : ''}${ids == null ? '' : ' ' + connectionAttrs(ids)} d="${d}"/>` : '';
}

// ---------------------------------------------------------------- wires drawn once

// routes: [{id, pts, share, end, style}]
//   id     unique; pts run from the route's 'from' end to its 'to' end (where a head goes).
//   share  the declared shared structure (one shared element and side), or null: the route stands alone.
//   end    'from' (default) or 'to': which end of the route is the shared one. A route that stands alone keeps its
//          own direction, so its dash phase is the one it has today.
//   style  the style key; ink is shared only among identical keys.
// Returns {chains, joins, heads, apart, ink}, deterministic and independent of the routes' order:
//   chains [{group, share, style, end, ids, pts, offset}]  (pts outward from the shared end, axis corners only)
//   joins  [{group, share, style, x, y, degree, ids}]       (three or more pieces of one sub-share meet)
//   heads  [{group, share, style, x, y, dir, ids}]          (one per distinct end of a sub-share)
//   apart  [{group, share, style, ids, pts}]                (pieces not merged because members disagree on the root)
//   ink    total chain length in px.
export function mergeWires(routes) {
  const groups = new Map(), seen = new Set();
  for (const r of routes) {
    const id = String(r.id);
    if (seen.has(id)) throw new Error('mergeWires: duplicate route id ' + id);
    seen.add(id);
    if (!Array.isArray(r.pts) || r.pts.some(p => !Number.isFinite(p?.[0]) || !Number.isFinite(p?.[1]))) throw new Error('mergeWires: route ' + id + ' has no valid points');
    const share = r.share == null ? null : String(r.share), end = r.end === 'to' ? 'to' : 'from', style = String(r.style ?? '');
    const key = JSON.stringify(share == null ? [0, id] : [1, share, end, style]);
    if (!groups.has(key)) groups.set(key, {share, end, style, routes: []});
    groups.get(key).routes.push({id, pts: r.pts});
  }
  const chains = [], joins = [], heads = [], apart = [];
  [...groups.keys()].sort(less).forEach((key, group) => {
    const G = groups.get(key), tag = {group, share: G.share, style: G.style};
    const members = G.routes.map(r => {
      const p = [];
      for (const q of r.pts) { const s = [snap(q[0]), snap(q[1])]; if (!p.length || p.at(-1)[0] !== s[0] || p.at(-1)[1] !== s[1]) p.push(s); }
      return {id: r.id, own: p, walk: G.share != null && G.end === 'to' ? [...p].reverse() : p};
    }).sort((a, b) => less(a.id, b.id));
    // Vertices of the group by line, to split every axis segment where another member's vertex lies on it.
    const onX = new Map(), onY = new Map();
    for (const m of members) for (const [x, y] of m.walk) { (onX.get(x) || onX.set(x, new Set()).get(x)).add(y); (onY.get(y) || onY.set(y, new Set()).get(y)).add(x); }
    const sorted = new Map();
    const line = (map, k, tagKey) => { const c = tagKey + k; if (!sorted.has(c)) sorted.set(c, [...(map.get(k) || [])].sort((a, b) => a - b)); return sorted.get(c); };
    // Directed unit pieces: one per (segment, start, distance from the shared end), carrying the members on it.
    const pieces = new Map(), keysAt = new Map(), idsAt = new Map();
    const touch = (p, k, id) => { const n = pk(p); (keysAt.get(n) || keysAt.set(n, new Set()).get(n)).add(k); (idsAt.get(n) || idsAt.set(n, new Set()).get(n)).add(id); };
    for (const m of members) {
      let dist = 0;
      for (let i = 1; i < m.walk.length; i++) {
        const a = m.walk[i - 1], b = m.walk[i], cuts = [a];
        if (a[0] === b[0]) { const lo = Math.min(a[1], b[1]), hi = Math.max(a[1], b[1]), ys = line(onX, a[0], 'x').filter(y => y > lo && y < hi); if (b[1] < a[1]) ys.reverse(); for (const y of ys) cuts.push([a[0], y]); }
        else if (a[1] === b[1]) { const lo = Math.min(a[0], b[0]), hi = Math.max(a[0], b[0]), xs = line(onY, a[1], 'y').filter(x => x > lo && x < hi); if (b[0] < a[0]) xs.reverse(); for (const x of xs) cuts.push([x, a[1]]); }
        cuts.push(b);
        for (let k = 1; k < cuts.length; k++) {
          const u = cuts[k - 1], v = cuts[k], len = segLen(u, v), ck = pk(u) < pk(v) ? pk(u) + '|' + pk(v) : pk(v) + '|' + pk(u), dk = ck + '@' + pk(u) + '@' + dist;
          if (!pieces.has(dk)) pieces.set(dk, {ck, a: u, b: v, d: dist, len, ids: new Set()});
          pieces.get(dk).ids.add(m.id);
          touch(u, ck, m.id); touch(v, ck, m.id);
          dist += len;
        }
      }
    }
    const list = [...pieces.values()];
    for (const pc of list) pc.sig = [...pc.ids].sort(less).join('\u0000');
    // A piece's members must agree on how far it lies from the shared end; where they do not, the pieces on that
    // segment are drawn apart (each with its own members and offset) and recorded.
    const byCk = new Map();
    for (const pc of list) (byCk.get(pc.ck) || byCk.set(pc.ck, []).get(pc.ck)).push(pc);
    for (const same of byCk.values()) if (same.length > 1) for (const pc of same) pc.apart = true;
    const outAt = new Map(), inAt = new Map();
    for (const pc of list) {
      const o = pk(pc.a) + '@' + pc.d, n = pk(pc.b) + '@' + (pc.d + pc.len);
      (outAt.get(o) || outAt.set(o, []).get(o)).push(pc); (inAt.get(n) || inAt.set(n, []).get(n)).push(pc);
    }
    const degree = p => keysAt.get(pk(p))?.size || 0;
    const next = pc => {
      if (degree(pc.b) !== 2) return null;
      const outs = outAt.get(pk(pc.b) + '@' + (pc.d + pc.len)) || [], ins = inAt.get(pk(pc.b) + '@' + (pc.d + pc.len)) || [];
      return outs.length === 1 && ins.length === 1 && outs[0].sig === pc.sig && outs[0].ck !== pc.ck ? outs[0] : null;
    };
    const hasPrev = new Set();
    for (const pc of list) { const n = next(pc); if (n) hasPrev.add(n); }
    list.sort((p, q) => p.d - q.d || less(pk(p.a), pk(q.a)) || less(pk(p.b), pk(q.b)) || less(p.sig, q.sig));
    for (const start of list) {
      if (hasPrev.has(start)) continue;
      const pts = [start.a, start.b]; let cur = start, len = start.len, split = !!start.apart;
      for (let n = next(cur); n; n = next(cur)) { cur = n; pts.push(n.b); len += n.len; split ||= !!n.apart; }
      const kept = pts.filter((p, i) => i === 0 || i === pts.length - 1 || !through(pts[i - 1], p, pts[i + 1]));
      const ids = start.sig.split('\u0000');
      chains.push({...tag, end: G.end, ids, pts: kept, offset: start.d, len});
      if (split) apart.push({...tag, ids, pts: kept});
    }
    for (const [n, ks] of [...keysAt.entries()].sort((a, b) => less(a[0], b[0]))) {
      if (ks.size < 3) continue;
      const [x, y] = n.split(',').map(Number);
      joins.push({...tag, x, y, degree: ks.size, ids: [...idsAt.get(n)].sort(less)});
    }
    const tips = new Map();
    for (const m of members) {
      const dir = headDir(m.own); if (!dir) continue;
      const [x, y] = m.own.at(-1), k = x + ',' + y + ',' + dir;
      if (!tips.has(k)) tips.set(k, {...tag, x, y, dir, ids: []});
      tips.get(k).ids.push(m.id);
    }
    heads.push(...[...tips.values()].sort((a, b) => a.y - b.y || a.x - b.x || less(String(a.dir), String(b.dir))));
  });
  let ink = 0;
  for (const c of chains) { ink += c.len; delete c.len; }
  return {chains, joins, heads, apart, ink: Math.round(ink * 100) / 100};
}

// The stroke-dashoffset each chain needs for its dashes to run on unbroken as drawn (round 10, V4). A chain's `offset`
// is its length from the shared end along the straight runs, but roundPath(pts, r) cuts every corner short: the curve
// is shorter than the two legs it replaces. So a chain's drawn offset is the drawn offset of the chain it continues
// (same sub-share, ending where it starts, at its offset, carrying its members) plus that chain's drawn length; a chain
// that continues none keeps its own offset. `restart(chain, parent)`, when given and true, starts a chain's dashes afresh
// where it leaves its parent (offset 0), as a view does where a dashed run leaves a solid one, and its own continuations
// run on from there. Aligned with W.chains, rounded to 0.01 px; it changes nothing in W.
const bezierLen = (a, c, b) => { // a quadratic curve from a, controlled by c, to b (Simpson's rule, 16 steps)
  const d = t => Math.hypot(2 * ((1 - t) * (c[0] - a[0]) + t * (b[0] - c[0])), 2 * ((1 - t) * (c[1] - a[1]) + t * (b[1] - c[1])));
  let s = d(0) + d(1);
  for (let i = 1; i < 16; i++) s += (i % 2 ? 4 : 2) * d(i / 16);
  return s / 48;
};
export function drawnLength(pts, r = 6) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  for (let i = 1; i < pts.length - 1; i++) { // each corner as roundPath draws it
    const [px, py] = pts[i - 1], [x, y] = pts[i], [nx, ny] = pts[i + 1];
    const rr = Math.min(r, Math.hypot(x - px, y - py) / 2, Math.hypot(nx - x, ny - y) / 2);
    if (rr < 1) continue;
    const a = [x - Math.sign(x - px) * rr, y - Math.sign(y - py) * rr], b = [x + Math.sign(nx - x) * rr, y + Math.sign(ny - y) * rr];
    len += bezierLen(a, [x, y], b) - Math.hypot(x - a[0], y - a[1]) - Math.hypot(b[0] - x, b[1] - y);
  }
  return len;
}
export function drawnOffsets(W, r = 6, restart = null) {
  const key = (group, p, d) => group + '|' + pk(p) + '|' + Math.round(d * 1e4) / 1e4, ends = new Map();
  const straight = W.chains.map(c => { let l = 0; for (let i = 1; i < c.pts.length; i++) l += segLen(c.pts[i - 1], c.pts[i]); return l; });
  W.chains.forEach((c, i) => { const k = key(c.group, c.pts.at(-1), c.offset + straight[i]); (ends.get(k) || ends.set(k, []).get(k)).push(i); });
  const memo = new Map();
  const off = i => {
    if (memo.has(i)) return memo.get(i);
    const c = W.chains[i], p = (ends.get(key(c.group, c.pts[0], c.offset)) || []).find(j => j !== i && c.ids.every(id => W.chains[j].ids.includes(id)));
    memo.set(i, c.offset); // a cycle (never in a tree) falls back to the chain's own offset
    const v = p == null ? c.offset : restart?.(c, W.chains[p]) ? 0 : off(p) + drawnLength(W.chains[p].pts, r);
    memo.set(i, v);
    return v;
  };
  return W.chains.map((c, i) => Math.round(off(i) * 100) / 100 + 0);
}

// Where merged wires would mislead because of ink from another sub-share (the bundle-integrity rules, for the views'
// own checks; mergeWires itself never looks across sub-shares):
//   atJoin    a join with another sub-share's line within `near` px (the dot would read as joining it);
//   onTrunk   shared ink (two or more members) with another sub-share's line running along it for more than `run` px;
//   tContacts another sub-share's corner or end lying on shared ink (a T that is not a join).
// Each entry names the sub-share (group) and the members on both sides. Deterministic; it changes nothing.
export function wireConflicts(W, {near = 3, run = 6} = {}) {
  const segs = [];
  W.chains.forEach((c, ci) => { for (let i = 1; i < c.pts.length; i++) { const [x1, y1] = c.pts[i - 1], [x2, y2] = c.pts[i]; segs.push({ci, c, x1, y1, x2, y2, lx: Math.min(x1, x2), hx: Math.max(x1, x2), ly: Math.min(y1, y2), hy: Math.max(y1, y2)}); } });
  const distTo = (s, x, y) => { const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((x - s.x1) * dx + (y - s.y1) * dy) / L)) : 0; return Math.hypot(s.x1 + t * dx - x, s.y1 + t * dy - y); };
  const atJoin = [], onTrunk = [], tContacts = [], seen = new Set();
  const note = (list, key, entry) => { if (!seen.has(key)) { seen.add(key); list.push(entry); } };
  for (const j of W.joins) for (const s of segs) {
    if (s.c.group === j.group || j.x < s.lx - near || j.x > s.hx + near || j.y < s.ly - near || j.y > s.hy + near) continue;
    if (distTo(s, j.x, j.y) <= near) note(atJoin, 'j' + j.group + ',' + j.x + ',' + j.y + '|' + s.c.group, {group: j.group, x: j.x, y: j.y, ids: j.ids, foreign: s.c.ids});
  }
  for (const a of segs) {
    if (a.c.ids.length < 2) continue;
    for (const b of segs) {
      if (b.c.group === a.c.group || b.hx < a.lx || b.lx > a.hx || b.hy < a.ly || b.ly > a.hy) continue;
      const along = a.y1 === a.y2 && b.y1 === b.y2 && a.y1 === b.y1 ? Math.min(a.hx, b.hx) - Math.max(a.lx, b.lx) : a.x1 === a.x2 && b.x1 === b.x2 && a.x1 === b.x1 ? Math.min(a.hy, b.hy) - Math.max(a.ly, b.ly) : 0;
      if (along > run) note(onTrunk, 'r' + a.ci + '|' + b.ci, {group: a.c.group, ids: a.c.ids, foreign: b.c.ids, length: along});
    }
    if (a.x1 !== a.x2 && a.y1 !== a.y2) continue;
    for (const c of W.chains) {
      if (c.group === a.c.group) continue;
      for (const [x, y] of c.pts) {
        const inside = a.y1 === a.y2 ? y === a.y1 && x > a.lx && x < a.hx : x === a.x1 && y > a.ly && y < a.hy;
        if (inside) note(tContacts, 't' + a.ci + '|' + x + ',' + y + '|' + c.group, {group: a.c.group, x, y, ids: a.c.ids, foreign: c.ids});
      }
    }
  }
  return {atJoin, onTrunk, tContacts};
}

// ---------------------------------------------------------------- tracks

// items: [{key, a, b, inner, outer, cost}] — one vertical (or horizontal) track each, spanning a..b along the gutter.
// Level 0 is nearest the cards. `inner` lists where the track's stubs run from the track towards the cards (level 0's
// side), `outer` where they run away from them; a stub crosses every track it passes whose span holds it. `cost(o)`,
// when given, replaces that model: the crossings if this track sits nearer the cards than `o`. Tracks within `gap` of
// each other never share a level.
const overlap = (p, q, gap) => !(p.b < q.a - gap || p.a > q.b + gap);
function norm(items) {
  const keys = new Set();
  return items.map(it => {
    const key = String(it.key);
    if (keys.has(key)) throw new Error('assignTracks: duplicate track key ' + key);
    keys.add(key);
    const a = Math.min(it.a, it.b), b = Math.max(it.a, it.b);
    if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('assignTracks: track ' + key + ' has no span');
    return {key, a, b, inner: it.inner || [], outer: it.outer || [], cost: it.cost || null, it};
  });
}
const inside = (y, t) => y > t.a + WIRE.EPS && y < t.b - WIRE.EPS;
function pairCost(p, q) { // crossings when p sits nearer the cards than q
  if (p.cost) return p.cost(q.it);
  let c = 0;
  for (const y of q.inner) if (inside(y, p)) c++;
  for (const y of p.outer) if (inside(y, q)) c++;
  return c;
}
// Where p sits nearer the cards than q, a far-side stub of p at the height of a card-side stub of q runs along that
// stub from q's track to p's, so the two lines read as one, joined at q's corner. Counted per such height.
function pairAlong(p, q) {
  if (p.cost) return 0;
  let c = 0;
  for (const y of p.outer) if (q.inner.some(z => Math.abs(z - y) <= WIRE.EPS)) c++;
  return c;
}
function colour(T, order, gap) {
  const level = new Map(), byLevel = [];
  for (const t of order) {
    let k = 0;
    while ((byLevel[k] || []).some(o => overlap(o, t, gap))) k++;
    (byLevel[k] ||= []).push(t); level.set(t.key, k);
  }
  return level;
}
const byColouring = (p, q) => (p.b - p.a) - (q.b - q.a) || p.a - q.a || less(p.key, q.key);
const count = level => (level.size ? Math.max(...level.values()) + 1 : 0);

// The interval colouring the chapter layouts use today: shortest span first, then the top, then the key; each track
// takes the lowest level no overlapping track holds.
export function colourTracks(items, {gap = 3} = {}) {
  const T = norm(items);
  return colour(T, [...T].sort(byColouring), gap);
}

// The modelled crossings of a level assignment (Map key → level).
export function trackCrossings(items, level, {gap = 3} = {}) {
  const T = norm(items); let c = 0;
  for (const p of T) for (const q of T) if (p !== q && overlap(p, q, gap) && level.get(p.key) < level.get(q.key)) c += pairCost(p, q);
  return c;
}
// The modelled runs along another line's end (pairAlong) of a level assignment.
export function trackAlongs(items, level, {gap = 3} = {}) {
  const T = norm(items); let c = 0;
  for (const p of T) for (const q of T) if (p !== q && overlap(p, q, gap) && level.get(p.key) < level.get(q.key)) c += pairAlong(p, q);
  return c;
}

// Crossing-aware levels. Per overlap component, the order of tracks from the cards outward is solved as a linear
// ordering with pairwise crossing costs: exactly (dynamic programming over subsets) up to WIRE.EXACT tracks, and by
// greedy insertion and adjacent transpositions above that (components above WIRE.ORDER_MAX keep the colouring
// order); ties go by key. Of the candidates within the budget (today's colouring, levels that keep the order, first
// fit in the order, the order kept where the budget allows, and, in gutters of up to WIRE.REDUCE_MAX tracks, the levels
// that keep the order with levels taken away one at a time until the budget holds, each time the level whose tracks
// move to other free levels at the least added cost) the one with the fewest modelled crossings, then fewer levels,
// then the earlier in that list, is improved by single-track moves that stay in the budget. Today's colouring
// is always a candidate, so the result never models more crossings than it. The budget is the colouring's levels plus
// max(slack, ceil(ratio × colouring levels)); the Chapter 6 brackets pass slack 0 and ratio 0 (no extra level).
// avoidAlongs (the lane gutters) puts runs along another line's end (pairAlong) before crossings: each costs more than
// every crossing the gutter could hold, and a result that would cross more often than the colouring is never taken.
// Returns {level: Map key → level, levels, crossings, alongs, budget, colouring: {levels, crossings, alongs}, how}.
export function assignTracks(items, {slack = 2, ratio = 0.15, gap = 3, avoidAlongs = false} = {}) {
  const T = norm(items), n = T.length;
  const base = colour(T, [...T].sort(byColouring), gap), baseLevels = count(base);
  const budget = baseLevels + Math.max(slack, Math.ceil(ratio * baseLevels));
  // Overlap graph and pairwise costs: nb[i][k] overlaps i; near[i][k] = the cost when i sits nearer than nb[i][k],
  // far[i][k] = when it sits farther; the crossings and the runs along are kept apart to report.
  const nb = T.map(() => []), near = T.map(() => []), far = T.map(() => []), nearX = T.map(() => []), nearA = T.map(() => []), farA = T.map(() => []);
  const bySpan = [...T.keys()].sort((p, q) => T[p].a - T[q].a);
  for (let x = 0; x < n; x++) {
    const i = bySpan[x];
    for (let y = x + 1; y < n; y++) {
      const j = bySpan[y];
      if (T[j].a > T[i].b + gap) break;
      if (!overlap(T[i], T[j], gap)) continue;
      const cij = pairCost(T[i], T[j]), cji = pairCost(T[j], T[i]), aij = pairAlong(T[i], T[j]), aji = pairAlong(T[j], T[i]);
      nb[i].push(j); near[i].push(cij); far[i].push(cji); nearX[i].push(cij); nearA[i].push(aij); farA[i].push(aji);
      nb[j].push(i); near[j].push(cji); far[j].push(cij); nearX[j].push(cji); nearA[j].push(aji); farA[j].push(aij);
    }
  }
  const sumOf = M => lv => { let c = 0; for (let i = 0; i < n; i++) for (let k = 0; k < nb[i].length; k++) if (lv[i] < lv[nb[i][k]]) c += M[i][k]; return c; };
  const crossingsOf = sumOf(nearX), alongsOf = sumOf(nearA);
  if (avoidAlongs) {
    let worst = 1; for (let i = 0; i < n; i++) for (let k = 0; k < nb[i].length; k++) worst += Math.max(near[i][k], far[i][k]);
    for (let i = 0; i < n; i++) for (let k = 0; k < nb[i].length; k++) { near[i][k] += worst * nearA[i][k]; far[i][k] += worst * farA[i][k]; }
  }
  const total = sumOf(near);
  const byKey = [...T.keys()].sort((p, q) => less(T[p].key, T[q].key));
  const comp = new Array(n).fill(-1), comps = [];
  for (const s of byKey) {
    if (comp[s] >= 0) continue;
    const c = [s]; comp[s] = comps.length;
    for (let k = 0; k < c.length; k++) for (const v of nb[c[k]]) if (comp[v] < 0) { comp[v] = comps.length; c.push(v); }
    comps.push(c.sort((p, q) => less(T[p].key, T[q].key)));
  }
  // The crossing-aware order, nearest the cards first, solved per component on a dense local cost matrix.
  const order = [];
  for (const ix of comps) {
    const m = ix.length;
    if (m > WIRE.ORDER_MAX) { order.push(...[...ix].sort((p, q) => byColouring(T[p], T[q]))); continue; }
    const at = new Map(ix.map((g, l) => [g, l])), C = new Float64Array(m * m);
    for (let l = 0; l < m; l++) { const g = ix[l]; for (let k = 0; k < nb[g].length; k++) C[l * m + at.get(nb[g][k])] = near[g][k]; }
    if (m <= WIRE.EXACT) {
      const full = (1 << m) - 1, best = new Float64Array(full + 1).fill(Infinity), from = new Int8Array(full + 1).fill(-1);
      best[0] = 0;
      for (let mask = 0; mask < full; mask++) {
        if (best[mask] === Infinity) continue;
        for (let j = 0; j < m; j++) {
          if (mask & (1 << j)) continue;
          let add = 0;
          for (let k = 0; k < m; k++) if (k !== j && !(mask & (1 << k))) add += C[j * m + k];
          const nm = mask | (1 << j);
          if (best[mask] + add < best[nm]) { best[nm] = best[mask] + add; from[nm] = j; }
        }
      }
      const seq = [];
      for (let mask = full; mask; mask &= ~(1 << from[mask])) seq.unshift(ix[from[mask]]);
      order.push(...seq);
    } else {
      const seq = [];
      for (let l = 0; l < m; l++) {
        let c = 0; for (const k of seq) c += C[l * m + k];
        let bc = c, bp = 0;
        for (let q = 0; q < seq.length; q++) { c += C[seq[q] * m + l] - C[l * m + seq[q]]; if (c < bc) { bc = c; bp = q + 1; } }
        seq.splice(bp, 0, l);
      }
      for (let pass = 0, moved = true; moved && pass < 50; pass++) {
        moved = false;
        for (let k = 0; k + 1 < seq.length; k++) { const a = seq[k], b = seq[k + 1]; if (C[b * m + a] < C[a * m + b]) { seq[k] = b; seq[k + 1] = a; moved = true; } }
      }
      order.push(...seq.map(l => ix[l]));
    }
  }
  const asArray = level => T.map(t => level.get(t.key));
  const fromArray = arr => new Map(T.map((t, i) => [t.key, arr[i]]));
  const held = (lv, i) => { const h = new Set(); for (const j of nb[i]) if (lv[j] >= 0) h.add(lv[j]); return h; };
  const strict = new Array(n).fill(-1), kept = new Array(n).fill(-1);
  for (const i of order) {
    let lo = 0; for (const j of nb[i]) if (strict[j] >= 0) lo = Math.max(lo, strict[j] + 1);
    strict[i] = lo;
    const h = held(kept, i);
    let want = 0; for (const j of nb[i]) if (kept[j] >= 0) want = Math.max(want, kept[j] + 1);
    let k = want; while (h.has(k)) k++;
    if (k >= budget) { k = 0; while (h.has(k)) k++; }
    kept[i] = k;
  }
  const first = asArray(colour(T, order.map(i => T[i]), gap));
  const compact = lv => { const used = [...new Set(lv)].sort((a, b) => a - b), to = new Map(used.map((k, r) => [k, r])); return lv.map(k => to.get(k)); };
  // The order kept strictly often needs more levels than the budget allows, though many overlapping pairs cost the
  // same either way round; emptying the cheapest level, one at a time, keeps most of what the order gains.
  const reduce = start => {
    let lv = compact(start);
    for (let L = n ? Math.max(...lv) + 1 : 0; L > budget; L--) {
      let best = null;
      for (let l = 0; l < L; l++) {
        const tr = [...lv];
        let ok = true;
        for (const t of byKey) {
          if (lv[t] !== l) continue;
          const h = held(tr, t);
          let bk = -1, bc = Infinity;
          for (let k = 0; k < L; k++) {
            if (k === l || h.has(k)) continue;
            let c = 0; for (let q = 0; q < nb[t].length; q++) c += k < tr[nb[t][q]] ? near[t][q] : far[t][q];
            if (c < bc) { bc = c; bk = k; }
          }
          if (bk < 0) { ok = false; break; }
          tr[t] = bk;
        }
        if (ok) { const c = total(tr); if (!best || c < best.c) best = {c, tr}; }
      }
      if (!best) break;
      lv = compact(best.tr);
    }
    return lv;
  };
  // Single-track moves that cut crossings without leaving the budget, by key; then empty levels close up. A track's
  // cost over the levels is a step function of its neighbours' levels, so each track's best level is found in one sweep.
  const improve = start => {
    const lv = [...start];
    for (let pass = 0, moved = true; moved && pass < 20; pass++) {
      moved = false;
      for (const i of byKey) {
        const ks = nb[i].map((j, k) => k).sort((p, q) => lv[nb[i][p]] - lv[nb[i][q]]), h = held(lv, i);
        let c = 0; for (let k = 0; k < nb[i].length; k++) c += near[i][k]; // below every neighbour
        let now = 0; for (let k = 0; k < nb[i].length; k++) now += lv[i] < lv[nb[i][k]] ? near[i][k] : far[i][k];
        let best = now, bk = lv[i], q = 0;
        for (let level = 0; level < budget; level++) {
          while (q < ks.length && lv[nb[i][ks[q]]] < level) { c += far[i][ks[q]] - near[i][ks[q]]; q++; }
          if (level !== lv[i] && !h.has(level) && c < best) { best = c; bk = level; }
        }
        if (bk !== lv[i]) { lv[i] = bk; moved = true; }
      }
    }
    return compact(lv);
  };
  const cands = [['colouring', asArray(base)], ['strict', strict], ['firstfit', first], ['budget', kept], ...(n <= WIRE.REDUCE_MAX ? [['reduced', reduce(strict)]] : [])];
  const rankOf = (p, q) => p.cost - q.cost || p.levels - q.levels || p.rank - q.rank;
  const score = (how, lv, rank) => ({how, lv, rank, cost: n ? total(lv) : 0, crossings: n ? crossingsOf(lv) : 0, levels: n ? Math.max(...lv) + 1 : 0});
  const colouring = score('colouring', asArray(base), 0), fits = c => c.levels <= budget && c.crossings <= colouring.crossings;
  const scored = cands.map(([how, lv], rank) => score(how, lv, rank)).filter(fits).sort(rankOf);
  // The best of the first four candidates is improved by moves, and so is the reduced one, so that it never ends worse.
  if (n) {
    for (const top of [scored.find(c => c.how !== 'reduced'), scored.find(c => c.how === 'reduced')].filter(Boolean)) {
      const better = score(top.how + '+moves', improve(top.lv), top.rank);
      if (better.cost < top.cost && fits(better)) scored.push(better);
    }
    scored.sort((p, q) => rankOf(p, q) || (p.how.length < q.how.length ? 1 : p.how.length > q.how.length ? -1 : 0));
  }
  const win = scored[0] || {how: 'colouring', lv: [], crossings: 0, levels: 0};
  return {level: fromArray(win.lv), levels: win.levels, crossings: win.crossings, alongs: n ? alongsOf(win.lv) : 0, budget, colouring: {levels: baseLevels, crossings: colouring.crossings, alongs: n ? alongsOf(colouring.lv) : 0}, how: win.how};
}
