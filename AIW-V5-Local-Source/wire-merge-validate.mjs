// Round 10, V1: the pure wires module the chapter views share (public/wire-merge.js), without a browser.
// - mergeWires on 1,000 random orthogonal route sets and on every reference chapter layout: each route's pieces are
//   carried by exactly the chains that list it, chains are orthogonal and never mix shares or style keys, joins sit
//   only where three or more pieces meet, there is one head per distinct end, offsets run on from the shared end, and
//   the result is the same twice and in any route order.
// - assignTracks never leaves its budget, never models more crossings than today's interval colouring, is exact on
//   small cliques, and its modelled crossings equal the crossings drawn on the reference gutters it was checked on.
// - The lane engine and the Chapter 6 brackets draw the assigner's levels (round 10, V2), never crossing more than
//   interval colouring would on the same ports; the lane engine returns its wires beside its routes.
// - One roundPath (F2-09): the retired Whole design copy drew exactly what the shared one draws on every reference flow.
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {mergeWires, wireConflicts, assignTracks, colourTracks, trackCrossings, trackAlongs, roundPath, headPath, headD, headDir, drawnLength, drawnOffsets, WIRE} from './public/wire-merge.js';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {createProject} from './shared/projects-domain.js';
import * as story from './public/story-model.js';
import {contextLayout} from './public/story-layout.js';
import * as threat from './public/threat-model.js';
import {threatLayout, threatHead, threatWireStyle} from './public/threat-layout.js';
import * as deploy from './public/deploy-model.js';
import {deployLayout, DEP} from './public/deploy-layout.js';
import * as utility from './public/utility-model.js';
import {utilityLayout} from './public/utility-layout.js';
import * as tradeoff from './public/tradeoff-model.js';
import {mapLayout, DM} from './public/tradeoff-layout.js';
import * as realise from './public/realise-model.js';
import {realiseLayout} from './public/realise-layout.js';
import * as resp from './public/responsibility-model.js';
import {responsibilityLayout} from './public/responsibility-layout.js';
import * as platform from './public/platform-model.js';
import {platformLayout, PX} from './public/platform-layout.js';
import {anatomySource, anatomyModel} from './public/anatomy-model.js';
import {anatomyLayout} from './public/anatomy-layout.js';
import {exchangeModel} from './public/exchange-model.js';
import {LANE, laneLayout} from './public/lane-layout.js';
import {coreBankingSource, syntheticSource} from './anatomy-fixtures.mjs';
// Chapter 10's trunks as drawn before round 10 (V6 replaced them with rails), rebuilt from the layout's rows by the
// chapter-lines evidence: the baseline the rails' crossings are reported against.
import {deployTrunks} from './scripts/chapter-lines-evidence.mjs';

const checks = [], measured = {};
const pass = name => checks.push(name);

// ---------------------------------------------------------------- independent geometry for the checks
const snap = v => Math.round(v * 2) / 2 + 0;
const key = p => p[0] + ',' + p[1];
const ck = (a, b) => (key(a) < key(b) ? key(a) + '|' + key(b) : key(b) + '|' + key(a));
const clean = pts => { const out = []; for (const q of pts) { const s = [snap(q[0]), snap(q[1])]; if (!out.length || key(out.at(-1)) !== key(s)) out.push(s); } return out; };
const lenOf = pts => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; };
const axis = (a, b) => a[0] === b[0] || a[1] === b[1];
// Unit pieces of a polyline, split at every point of `cuts` that lies inside one of its axis segments.
function units(pts, cuts) {
  const out = new Set();
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], inner = [];
    if (a[0] === b[0]) for (const c of cuts) { if (c[0] === a[0] && c[1] > Math.min(a[1], b[1]) && c[1] < Math.max(a[1], b[1])) inner.push(c); }
    else if (a[1] === b[1]) for (const c of cuts) { if (c[1] === a[1] && c[0] > Math.min(a[0], b[0]) && c[0] < Math.max(a[0], b[0])) inner.push(c); }
    inner.sort((p, q) => Math.hypot(p[0] - a[0], p[1] - a[1]) - Math.hypot(q[0] - a[0], q[1] - a[1]));
    const seq = [a, ...inner, b];
    for (let k = 1; k < seq.length; k++) if (key(seq[k - 1]) !== key(seq[k])) out.add(ck(seq[k - 1], seq[k]));
  }
  return out;
}
// Arc lengths at which a polyline passes a point.
function positions(pts, p) {
  const at = []; let s = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const t = L ? ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (L * L) : 0;
    const on = t >= 0 && t <= 1 && Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) < 1e-6;
    if (on) at.push(s + t * L);
    s += L;
  }
  return at;
}
const near = (list, v) => list.some(x => Math.abs(x - v) < 1e-6);
const shuffle = (arr, rnd) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// mulberry32: the checks' own seeded randomness (the module itself has none).
const seeded = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// Every contract of mergeWires on one route set. Returns the drawn measures.
function checkWires(routes, label, rnd = seeded(7)) {
  const W = mergeWires(routes), json = JSON.stringify(W);
  assert.equal(JSON.stringify(mergeWires(routes)), json, label + ': the same twice');
  assert.equal(JSON.stringify(mergeWires(shuffle(routes, rnd))), json, label + ': the same in any route order');
  const byId = new Map(routes.map(r => [String(r.id), r]));
  const groupOf = r => JSON.stringify(r.share == null ? [0, String(r.id)] : [1, String(r.share), r.end === 'to' ? 'to' : 'from', String(r.style ?? '')]);
  const ortho = new Set(routes.filter(r => { const p = clean(r.pts); return p.every((q, i) => !i || axis(p[i - 1], q)); }).map(r => String(r.id)));
  const groups = new Map();
  for (const r of routes) { const g = groupOf(r); if (!groups.has(g)) groups.set(g, {routes: [], chains: []}); groups.get(g).routes.push(r); }
  for (const c of W.chains) {
    assert.ok(c.ids.length > 0 && c.pts.length >= 2, label + ': a chain has members and length');
    assert.deepEqual(c.ids, [...new Set(c.ids)].sort((a, b) => (a < b ? -1 : 1)), label + ': chain ids sorted and unique');
    const gs = new Set(c.ids.map(id => groupOf(byId.get(id))));
    assert.equal(gs.size, 1, label + ': a chain never mixes shares, ends or style keys');
    const r0 = byId.get(c.ids[0]);
    assert.equal(c.share, r0.share == null ? null : String(r0.share), label + ': chain share'); assert.equal(c.style, String(r0.style ?? ''), label + ': chain style');
    if (r0.share == null) assert.equal(c.ids.length, 1, label + ': a route that stands alone shares no ink');
    for (let i = 1; i < c.pts.length; i++) {
      assert.notEqual(key(c.pts[i - 1]), key(c.pts[i]), label + ': no empty segment');
      if (c.ids.every(id => ortho.has(id))) assert.ok(axis(c.pts[i - 1], c.pts[i]), label + ': chains are orthogonal');
    }
    for (let i = 1; i + 1 < c.pts.length; i++) { const [a, p, b] = [c.pts[i - 1], c.pts[i], c.pts[i + 1]]; assert.ok(!((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1])), label + ': no collinear interior point'); }
    assert.ok(c.offset >= 0, label + ': offset from the shared end');
    groups.get([...gs][0]).chains.push(c);
  }
  const apartKeys = new Set(W.apart.map(a => a.ids.join(' ') + '|' + JSON.stringify(a.pts)));
  let routeInk = 0, apartPieces = 0;
  for (const G of groups.values()) {
    const cuts = [];
    for (const r of G.routes) cuts.push(...clean(r.pts));
    for (const c of G.chains) cuts.push(...c.pts);
    // Membership: a route's unit pieces are exactly the union of the pieces of the chains that list it.
    for (const r of G.routes) {
      const own = units(clean(r.pts), cuts), drawn = new Set();
      for (const c of G.chains) if (c.ids.includes(String(r.id))) for (const u of units(c.pts, cuts)) drawn.add(u);
      assert.deepEqual([...drawn].sort(), [...own].sort(), label + ': route ' + r.id + ' is carried whole by the chains that list it, and only there');
      routeInk += lenOf(clean(r.pts));
    }
    // Drawn once: a piece carried by two chains of one sub-share only where the members disagree on the root.
    const by = new Map();
    for (const c of G.chains) for (const u of units(c.pts, cuts)) { if (!by.has(u)) by.set(u, []); by.get(u).push(c); }
    for (const cs of by.values()) if (cs.length > 1) { apartPieces++; for (const c of cs) assert.ok(apartKeys.has(c.ids.join(' ') + '|' + JSON.stringify(c.pts)), label + ': ink drawn twice in one sub-share is recorded as apart'); }
    // Offsets run on from the shared end along every member.
    for (const c of G.chains) for (const id of c.ids) {
      const r = byId.get(id), walk = r.share != null && r.end === 'to' ? [...clean(r.pts)].reverse() : clean(r.pts);
      assert.ok(near(positions(walk, c.pts[0]), c.offset), label + ': chain of ' + id + ' starts at its arc length from the shared end');
      assert.ok(near(positions(walk, c.pts.at(-1)), c.offset + lenOf(c.pts)), label + ': and runs outward along it');
    }
    // Joins exactly where three or more pieces meet.
    const deg = new Map(), ids = new Map();
    for (const c of G.chains) for (const u of units(c.pts, cuts)) for (const p of u.split('|')) { if (!deg.has(p)) { deg.set(p, new Set()); ids.set(p, new Set()); } deg.get(p).add(u); for (const id of c.ids) ids.get(p).add(id); }
    const want = [...deg.entries()].filter(([, s]) => s.size >= 3).map(([p, s]) => p + ' ' + s.size + ' ' + [...ids.get(p)].sort().join(',')).sort();
    const got = W.joins.filter(j => j.group === (G.chains[0]?.group)).map(j => j.x + ',' + j.y + ' ' + j.degree + ' ' + j.ids.join(',')).sort();
    if (G.chains.length) assert.deepEqual(got, want, label + ': joins only at degree three or more, and at every such point');
    // One head per distinct end.
    const ends = new Map();
    for (const r of G.routes) { const p = clean(r.pts), d = headDir(p); if (!d) continue; const k = key(p.at(-1)) + ',' + d; if (!ends.has(k)) ends.set(k, []); ends.get(k).push(String(r.id)); }
    const heads = W.heads.filter(h => G.chains.length && h.group === G.chains[0].group).map(h => h.x + ',' + h.y + ',' + h.dir + ' ' + h.ids.join(',')).sort();
    if (G.chains.length) assert.deepEqual(heads, [...ends.entries()].map(([k, v]) => k + ' ' + v.sort().join(',')).sort(), label + ': exactly one head per distinct end');
  }
  assert.equal(new Set(W.chains.map(c => c.group)).size, [...groups.values()].filter(G => G.chains.length).length, label + ': one group index per sub-share');
  const chainInk = W.chains.reduce((s, c) => s + lenOf(c.pts), 0);
  assert.ok(Math.abs(chainInk - W.ink) < 0.02, label + ': ink is the chains\' length');
  assert.ok(W.ink <= routeInk + 0.02, label + ': merging never adds ink');
  return {routes: routes.length, chains: W.chains.length, joins: W.joins.length, heads: W.heads.length, ink: Math.round(W.ink), routeInk: Math.round(routeInk), apart: W.apart.length, apartPieces, W};
}

// ---------------------------------------------------------------- 1. hand-made cases
{
  // A comb out of one parent: drawn once, joins where branches leave, the last branch turns as a corner.
  const comb = [0, 1, 2].map(i => ({id: 'c' + i, pts: [[0, 0], [10, 0], [10, 20 + 20 * i], [30, 20 + 20 * i]], share: 'P', end: 'from', style: 'k'}));
  const {W} = checkWires(comb, 'comb');
  assert.deepEqual(W.chains.map(c => [c.ids.join(' '), JSON.stringify(c.pts), c.offset]), [['c0 c1 c2', '[[0,0],[10,0],[10,20]]', 0], ['c1 c2', '[[10,20],[10,40]]', 30], ['c0', '[[10,20],[30,20]]', 30], ['c2', '[[10,40],[10,60],[30,60]]', 50], ['c1', '[[10,40],[30,40]]', 50]]);
  assert.deepEqual(W.joins.map(j => [j.x, j.y, j.degree]), [[10, 20, 3], [10, 40, 3]]);
  assert.equal(W.heads.length, 3); assert.equal(W.ink, 10 + 60 + 60);
  // A fan into one port: one trunk, one head, offsets measured from the shared (target) end.
  const fan = [0, 1, 2].map(i => ({id: 'f' + i, pts: [[0, 10 * i], [50, 10 * i], [50, 40], [80, 40]], share: 'T', end: 'to', style: 'uses'}));
  const F = checkWires(fan, 'fan in').W;
  assert.equal(F.heads.length, 1); assert.deepEqual(F.heads[0].ids, ['f0', 'f1', 'f2']); assert.equal(F.heads[0].dir, 'r');
  assert.deepEqual(F.chains[0], {group: 0, share: 'T', style: 'uses', end: 'to', ids: ['f0', 'f1', 'f2'], pts: [[80, 40], [50, 40], [50, 20]], offset: 0});
  // Different styles in one share never share ink; a route standing alone keeps its own direction and phase.
  const mixed = [{id: 'a', pts: [[0, 0], [20, 0], [20, 30]], share: 'S', style: 'recorded'}, {id: 'b', pts: [[0, 0], [20, 0], [20, -30]], share: 'S', style: 'proposed'}, {id: 'z', pts: [[40, 30], [40, -30]], share: null, end: 'to'}];
  const M = checkWires(mixed, 'mixed').W;
  assert.ok(M.chains.every(c => c.ids.length === 1), 'recorded and proposed members draw their own ink');
  assert.deepEqual(M.chains.find(c => c.ids[0] === 'z').pts, [[40, 30], [40, -30]]);
  assert.equal(M.joins.length, 0);
  // A plain crossing inside one share gets no join; a fourth arm at a split does (degree 4).
  const cross = [{id: 'h', pts: [[0, 0], [0, 10], [40, 10]], share: 'X', style: 'k'}, {id: 'v', pts: [[0, 0], [20, 0], [20, 30]], share: 'X', style: 'k'}];
  assert.equal(checkWires(cross, 'crossing').W.joins.length, 0, 'a plain crossing is not a join');
  const four = [[30, 0], [0, 20], [0, -20]].map((tip, i) => ({id: 'q' + i, pts: [[-20, 0], [0, 0], tip], share: 'Q', style: 'k'}));
  assert.deepEqual(checkWires(four, 'four way').W.joins.map(j => j.degree), [4]);
  // A share that rejoins itself at a different distance is drawn apart, never merged with a broken dash phase.
  const rejoin = [{id: 'r1', pts: [[0, 0], [40, 0], [40, 20]], share: 'R', style: 'k'}, {id: 'r2', pts: [[0, 0], [0, -10], [30, -10], [30, 0], [40, 0], [40, 20]], share: 'R', style: 'k'}];
  const RJ = checkWires(rejoin, 'rejoin');
  assert.ok(RJ.apart > 0 && RJ.apartPieces > 0, 'the rejoined run is drawn apart and recorded');
  // Rounding to the half-pixel grid merges what float drift splits.
  const drift = [{id: 'd1', pts: [[0, 0.1], [10.3, 0.1], [10.3, 30]], share: 'D', style: 'k'}, {id: 'd2', pts: [[0, -0.2], [10.4, -0.2], [10.4, -30]], share: 'D', style: 'k'}];
  const DR = checkWires(drift, 'drift').W;
  assert.deepEqual(DR.chains[0].pts, [[0, 0], [10.5, 0]]); assert.equal(DR.joins.length, 1);
  // Integrity: what another sub-share's ink does to merged wires is named, never hidden.
  assert.deepEqual(wireConflicts(W), {atJoin: [], onTrunk: [], tContacts: []}, 'a clean comb has no conflicts');
  const through = wireConflicts(mergeWires([...comb, {id: 'x', pts: [[-10, 21], [50, 21]]}]));
  assert.deepEqual([through.atJoin.length, through.atJoin[0].foreign, through.onTrunk.length, through.tContacts.length], [1, ['x'], 0, 0], 'a foreign line within 3 px of a join');
  const ride = wireConflicts(mergeWires([...comb, {id: 'y', pts: [[10, -10], [10, 30]]}]));
  assert.ok(ride.onTrunk.length === 2 && ride.onTrunk.every(r => r.foreign[0] === 'y' && r.length > 6) && ride.tContacts.length === 1, 'a foreign line along shared ink, ending on it');
  const tee = wireConflicts(mergeWires([...comb, {id: 'z', pts: [[-20, 10], [10, 10]]}]));
  assert.deepEqual(tee.tContacts.map(t => [t.x, t.y, t.foreign[0]]), [[10, 10, 'z']], 'a foreign end on shared ink is a T-contact');
  assert.equal(wireConflicts(mergeWires([...comb, {id: 'w', pts: [[0, 30], [40, 30]]}])).atJoin.length, 0, 'a plain crossing of a trunk is not a conflict');
  assert.throws(() => mergeWires([{id: 'x', pts: [[0, 0], [1, 0]]}, {id: 'x', pts: [[0, 0], [0, 1]]}]), /duplicate route id/);
  assert.throws(() => mergeWires([{id: 'y', pts: [[0, NaN], [1, 0]]}]), /no valid points/);
  assert.deepEqual(mergeWires([]), {chains: [], joins: [], heads: [], apart: [], ink: 0});
  pass('Hand-made cases: a comb draws its trunk once with a join where each branch leaves and a corner for the last; a fan into one port has one trunk and one head; members of different styles share no ink; a crossing is not a join; a four-way split is; a share that rejoins itself is drawn apart and recorded; float drift snaps to the half-pixel grid; a foreign line through a join, along shared ink or ending on it is named by wireConflicts, a plain crossing is not');
}

// ---------------------------------------------------------------- 2. 1,000 random orthogonal route sets
{
  const rnd = seeded(20261003), pick = n => Math.floor(rnd() * n), step = () => (pick(2) ? 1 : -1) * (5 + pick(8) * 5) + (pick(6) === 0 ? 0.3 : 0);
  const walk = (start, n, horizontal) => { const pts = [start]; let h = horizontal; for (let i = 0; i < n; i++) { const [x, y] = pts.at(-1); pts.push(h ? [x + step(), y] : [x, y + step()]); h = !h; } return pts; };
  let sets = 0, routes = 0, shared = 0, joins = 0, apart = 0, saved = 0;
  for (let s = 0; s < 1000; s++) {
    const R = [];
    const shares = 1 + pick(4);
    for (let k = 0; k < shares; k++) {
      const root = [pick(10) * 10, pick(10) * 10], trunk = walk(root, 2 + pick(4), !!pick(2)), end = pick(2) ? 'to' : 'from', styles = pick(4) ? ['k'] : ['k', 'p'];
      const members = 1 + pick(6);
      for (let m = 0; m < members; m++) {
        const cut = 1 + pick(trunk.length - 1), head = trunk.slice(0, cut + 1);
        let pts = pick(5) === 0 ? trunk : [...head, ...walk(head.at(-1), 1 + pick(3), head.length > 1 ? head.at(-1)[1] !== head.at(-2)[1] : true).slice(1)];
        if (pick(12) === 0) { const back = [...pts].reverse(); pts = [...pts, ...back.slice(1, 3)]; } // a route that runs back on itself
        if (end === 'to') pts = [...pts].reverse();
        R.push({id: `s${s}k${k}m${m}`, pts, share: 'S' + k, end, style: styles[pick(styles.length)]});
      }
    }
    for (let i = pick(5); i > 0; i--) R.push({id: `s${s}x${i}`, pts: walk([pick(10) * 10, pick(10) * 10], 1 + pick(4), !!pick(2)), share: null, style: pick(2) ? 'k' : 'p'});
    const m = checkWires(R, 'random set ' + s, rnd);
    sets++; routes += m.routes; joins += m.joins; apart += m.apart; saved += m.routeInk - m.ink; shared += m.W.chains.filter(c => c.ids.length > 1).length;
  }
  measured.random = {sets, routes, sharedChains: shared, joins, apartChains: apart, inkSaved: Math.round(saved)};
  assert.ok(shared > 1000 && joins > 500, 'the random sets exercise real sharing and joins');
  pass(`mergeWires on ${sets} random orthogonal route sets (${routes} routes, ${shared} shared chains, ${joins} joins, ${apart} chains drawn apart): membership preserved, chains orthogonal, no chain mixes shares or style keys, joins only at degree three or more, one head per distinct end, offsets continuous from the shared end, identical twice and in any order`);
}
{
  // Round 10, V4: dashes phased as drawn. roundPath cuts each corner short (a quadratic curve 0.3768·rr shorter than its
  // two legs of rr), so drawnOffsets gives each chain the drawn length from the shared end: the drawn offset of the chain
  // it continues plus that chain's drawn length; a chain that continues none keeps mergeWires' offset.
  const near = (a, b, e = 1e-3) => Math.abs(a - b) <= e;
  assert.equal(drawnLength([[0, 0], [30, 0]]), 30);
  assert.ok(near(drawnLength([[0, 0], [30, 0], [30, 30]], 6), 60 - 0.376775 * 6), 'a right-angle corner of radius 6 is 2.26 px shorter');
  assert.ok(near(drawnLength([[0, 0], [10, 0], [10, 10]], 6), 20 - 0.376775 * 5), 'the radius shrinks to half the shorter leg, as roundPath draws it');
  assert.equal(drawnLength([[0, 0], [1.5, 0], [1.5, 4]], 6), 5.5, 'under a 1 px radius the corner stays sharp');
  const comb = mergeWires([{id: 'a', pts: [[0, 0], [20, 0], [20, 30], [40, 30]], share: 's'}, {id: 'b', pts: [[0, 0], [20, 0], [20, 50], [40, 50]], share: 's'}, {id: 'c', pts: [[0, 0], [20, 0], [20, 50], [20, 70], [40, 70]], share: 's'}]);
  const off = drawnOffsets(comb, 6), at = ids => comb.chains.findIndex(c => c.ids.join() === ids);
  assert.deepEqual([comb.chains[at('a,b,c')].offset, off[at('a,b,c')]], [0, 0]);
  assert.ok(near(off[at('b,c')], 50 - 0.376775 * 6, 0.01) && near(off[at('a')], off[at('b,c')], 0) && near(off[at('c')], off[at('b,c')] + 20, 0.01), 'past the first corner every chain starts 2.26 px earlier than along the straight runs');
  const fresh = drawnOffsets(comb, 6, c => c.ids.join() === 'b,c');
  assert.deepEqual([fresh[at('a,b,c')], fresh[at('b,c')], fresh[at('a')]], [0, 0, off[at('a')]], 'a restarted chain starts its dashes afresh; the others keep theirs');
  assert.ok(near(fresh[at('c')], 20, 0.01), 'and its continuations run on from it');
  const rnd = seeded(20261004), pick = n => Math.floor(rnd() * n);
  let sets = 0, continued = 0, shortened = 0;
  for (let s = 0; s < 400; s++) {
    const R = [];
    for (let k = 0; k < 1 + pick(3); k++) {
      const root = [pick(10) * 20, pick(10) * 20], end = pick(2) ? 'to' : 'from', trunk = [root];
      for (let i = 0; i < 2 + pick(3); i++) { const [x, y] = trunk.at(-1); trunk.push(i % 2 ? [x, y + (pick(2) ? 1 : -1) * (6 + pick(10) * 6)] : [x + 8 + pick(10) * 6, y]); }
      for (let m = 0; m < 2 + pick(4); m++) {
        const head = trunk.slice(0, 2 + pick(trunk.length - 1)), [x, y] = head.at(-1), vertical = head.at(-2)[0] === x;
        let pts = [...head, vertical ? [x + 6 + pick(8) * 6, y] : [x, y + (pick(2) ? 1 : -1) * (6 + pick(8) * 6)]];
        if (end === 'to') pts = pts.reverse();
        R.push({id: `p${s}k${k}m${m}`, pts, share: 'S' + k, end, style: 'k'});
      }
    }
    const W = mergeWires(R), o = drawnOffsets(W, 6), r2 = drawnOffsets(W, 6);
    assert.deepEqual(o, r2, 'deterministic');
    W.chains.forEach((c, i) => {
      const j = W.chains.findIndex((p, k) => k !== i && p.group === c.group && p.pts.at(-1)[0] === c.pts[0][0] && p.pts.at(-1)[1] === c.pts[0][1] && near(p.offset + p.pts.slice(1).reduce((t, q, n) => t + Math.abs(q[0] - p.pts[n][0]) + Math.abs(q[1] - p.pts[n][1]), 0), c.offset) && c.ids.every(id => p.ids.includes(id)));
      if (j < 0) assert.equal(o[i], c.offset, 'random set ' + s + ': a chain that continues none keeps its offset');
      else { assert.ok(near(o[i], o[j] + drawnLength(W.chains[j].pts, 6), 0.011), 'random set ' + s + ': the phase continues as drawn'); continued++; }
      assert.ok(o[i] <= c.offset + 1e-9, 'never longer than the straight runs'); if (o[i] < c.offset - 0.01) shortened++;
    });
    sets++;
  }
  assert.ok(continued > 1000 && shortened > 200, `${continued} chains continue another, ${shortened} start earlier than their straight offset`);
  measured.drawnOffsets = {sets, continued, shortened};
  pass(`drawnOffsets phases dashes as roundPath draws them: corners measured as their curves (radius capped at half the shorter leg, sharp under 1 px), and on ${sets} random combs and fans each of ${continued} continuing chains starts where the chain it continues ends as drawn (${shortened} start before their straight-run offset); a chain that continues none keeps mergeWires' offset`);
}

// ---------------------------------------------------------------- reference projects
const JOURNEYS = ['library-reservations', 'parcel-lockers', 'clinic-appointments', 'warehouse-fulfilment', 'service-permits'];
const PROJECTS = [['bank-payment', withFinalReview(seedProject())], ...JOURNEYS.map(t => [t, createProject({name: t, template: t}, t)])];
const each = (label, fn) => { try { return fn(); } catch (e) { e.message = label + ': ' + e.message; throw e; } };

// ---------------------------------------------------------------- 3. every reference chapter layout through mergeWires
const laneRoutes = (L, {fan = false} = {}) => L.routes.map(r => {
  const lane = L.cards.find(c => c.id === r.link.to), side = r.xb === lane.x ? 'L' : 'R';
  return {id: r.id, pts: r.pts, share: r.entry || (fan ? 'from:' + r.link.from + '>' + lane.x + side : null), end: r.entry ? 'to' : 'from', style: [r.link.kind, r.link.crosses ? 'cross ' + r.link.state : 'inside'].join(' ')};
});
{
  const tally = {};
  const add = (view, m) => {
    const t = tally[view] ||= {layouts: 0, routes: 0, chains: 0, joins: 0, heads: 0, ink: 0, routeInk: 0, apart: 0, foreignAtJoin: 0, foreignOnTrunk: 0, tContacts: 0};
    t.layouts++; for (const k of ['routes', 'chains', 'joins', 'heads', 'ink', 'routeInk', 'apart']) t[k] += m[k];
    const C = wireConflicts(m.W); assert.equal(JSON.stringify(wireConflicts(m.W)), JSON.stringify(C), view + ': conflicts are deterministic');
    t.foreignAtJoin += C.atJoin.length; t.foreignOnTrunk += C.onTrunk.length; t.tContacts += C.tContacts.length;
  };
  for (const [label, project] of PROJECTS) each(label, () => {
    const SM = story.storySource(project), CL = contextLayout(story.foldContext(SM, story.storyScope(SM, {kind: 'system'}), {ghost: null}));
    add('ch1 context', checkWires(laneRoutes(CL), label + ' ch1'));
    add('ch1 context fan-out', checkWires(laneRoutes(CL, {fan: true}), label + ' ch1 fan'));
    const UM = utility.utilitySource(project);
    for (const depth of ['drivers', 'attributes']) {
      const UL = utilityLayout(utility.foldUtility(UM, utility.utilityScope(UM, {kind: 'system'}), depth, {ghost: null})), kind = new Map(UL.cards.map(c => [c.id, c.node?.kind]));
      add('ch2 utility', checkWires(UL.edges.map(e => ({id: e.id, pts: e.pts, share: e.from, end: 'from', style: kind.get(e.to) === 'hole' ? 'hole' : kind.get(e.to) === 'proposed' ? 'proposed' : ''})), label + ' ch2 ' + depth));
    }
    const TM = tradeoff.tradeoffSource(project);
    for (const depth of ['alternatives', 'decisions']) {
      const ML = mapLayout(tradeoff.foldMap(TM, tradeoff.tradeoffScope(TM, {kind: 'system'}), depth, {}));
      add('ch3 weighs', checkWires(ML.routes.filter(r => r.kind === 'weighs').map(r => ({id: r.id, pts: r.pts, share: 'drv:' + r.from, end: 'from', style: 'weighs'})), label + ' ch3 weighs ' + depth));
      add('ch3 options', checkWires(ML.routes.filter(r => r.kind !== 'weighs').map(r => ({id: r.id, pts: r.pts, share: r.from, end: 'from', style: r.kind})), label + ' ch3 options ' + depth));
    }
    const V = realise.realiseSource(project);
    for (const depth of ['components', 'modules']) add('ch5 realise', checkWires(laneRoutes(realiseLayout(realise.foldRealise(V, {kind: 'system'}, depth))), label + ' realise ' + depth));
    const LM = resp.responsibilitySource(project);
    for (const depth of ['responsibilities', 'groups']) add('ch4 responsibilities', checkWires(laneRoutes(responsibilityLayout(resp.foldResponsibilities(LM, {kind: 'system'}, depth))), label + ' responsibilities ' + depth));
    const T = threat.threatSource(project, {order: {}});
    for (const depth of ['parts', 'boundaries']) {
      const TL = threatLayout(threat.foldThreat(T, {kind: 'system'}, depth));
      const m = checkWires(laneRoutes(TL), label + ' ch9 ' + depth);
      for (const en of new Set(TL.routes.map(r => r.entry).filter(Boolean))) assert.equal(m.W.heads.filter(h => h.share === en).length, 1, label + ' ch9: one head per entry');
      add('ch9 threat', m);
    }
    const Pm = platform.platformSource(project, {order: {}});
    for (const depth of ['components', 'modules']) {
      const PL = platformLayout(platform.foldPlatform(Pm, platform.platformScope(Pm, {kind: 'system'}), depth, {}));
      add('ch6 platform', checkWires(PL.arcs.map(a => ({id: a.id, pts: [[a.xa, a.ya], [a.x, a.ya], [a.x, a.yb], [a.xa + 4, a.yb]], share: null, style: a.dep.type})), label + ' ch6 ' + depth));
    }
    const DV = deploy.deploySource(project, {order: {}});
    for (const depth of ['all', 'modules']) {
      // Chapter 10 rails (round 10, V6): each link's route at rest runs from its mark along its target's rail into it;
      // the routes on one rail share it, drawn alike (the rail's one style; the mark carries required, buffered or
      // party). Merged, each rail is drawn once with one head at its stub, exactly the rail the layout gives, and
      // nothing foreign meets it at a join, along it or as a T.
      const DL = deployLayout(deploy.foldDeploy(DV, deploy.deployScope(DV, {kind: 'system'}), depth), {viewW: 1100});
      const arcOf = new Map(DL.arcs.map(a => [a.id, a])), railStyle = new Map(DL.rails.map(r => [r.id, r.dots.every(d => arcOf.get(d.link).link.party) ? 'rail party' : 'rail']));
      const m = checkWires(DL.arcs.map(a => ({id: a.id, pts: [[a.x, a.y1], [a.x, a.y2], [a.xb, a.y2]], share: a.rail, end: 'to', style: railStyle.get(a.rail)})), label + ' ch10 ' + depth), C = wireConflicts(m.W);
      assert.equal(m.W.heads.length, DL.rails.length, label + ' ch10: one head per rail');
      for (const r of DL.rails) assert.ok(m.W.heads.some(h => h.share === r.id && h.x === r.xb && h.y === r.stubY && h.dir === 'r'), label + ' ch10: ' + r.id + '\'s head at its stub');
      assert.ok(Math.abs(m.W.ink - DL.rails.reduce((n, r) => n + (r.y2 - r.y1) + (r.xb - r.x), 0)) < 0.01, label + ' ch10: the merge draws exactly the rails');
      assert.deepEqual([C.atJoin.length, C.onTrunk.length, C.tContacts.length], [0, 0, 0], label + ' ch10: nothing foreign at a join, along a rail or as a T');
      add('ch10 deploy', m);
    }
    const AM = anatomyModel(anatomySource(project));
    for (const chapter of [4, 6, 8, 10, 11]) {
      const AL = anatomyLayout(AM, {chapter, scope: {kind: 'system'}, peel: null, order: {}, viewW: 1180});
      add('whole design', checkWires([...AL.routes.map(r => ({id: 'f:' + r.id, pts: r.points, share: null, style: r.contract ? 'contract' : ''})), ...AL.threads.map((t, i) => ({id: 't:' + i + ':' + t.from + '>' + t.to, pts: t.points, share: 'th:' + t.kind + ':' + t.from, end: 'from', style: t.kind}))], label + ' whole ' + chapter));
    }
  });
  measured.reference = tally;
  const views = Object.keys(tally);
  assert.ok(views.length >= 11 && Object.values(tally).every(t => t.layouts > 0));
  pass(`mergeWires on every reference chapter layout (${Object.values(tally).reduce((n, t) => n + t.layouts, 0)} layouts over ${PROJECTS.length} projects: ${views.join(', ')}): every contract holds; for example Chapter 9 draws ${tally['ch9 threat'].heads} heads for ${tally['ch9 threat'].routes} routes and Chapter 10 ${tally['ch10 deploy'].ink} px of ink for ${tally['ch10 deploy'].routeInk} px of routes`);
}

// ---------------------------------------------------------------- 4. assignTracks
// What is drawn: `points`, the distinct crossing points between polylines of different groups (what a reader sees), and
// `contacts`, the distinct (point, pair of groups) crossings, which the model counts. They differ only where stubs of
// different tracks run on one line (today's Chapter 10 rows), so that several pairs cross at one point.
function drawn(lines) {
  const segs = lines.map(l => { const s = []; for (let i = 1; i < l.pts.length; i++) { const [x1, y1] = l.pts[i - 1], [x2, y2] = l.pts[i]; if (x1 !== x2 || y1 !== y2) s.push({x1, y1, x2, y2, h: y1 === y2, v: x1 === x2}); } return {g: String(l.g), s}; });
  const points = new Set(), contacts = new Set(), btw = (a, lo, hi) => a > Math.min(lo, hi) + WIRE.EPS && a < Math.max(lo, hi) - WIRE.EPS;
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    if (segs[i].g === segs[j].g) continue;
    const pair = segs[i].g < segs[j].g ? segs[i].g + '\u0000' + segs[j].g : segs[j].g + '\u0000' + segs[i].g;
    for (const a of segs[i].s) for (const b of segs[j].s) {
      let p = null;
      if (a.h && b.v && btw(b.x1, a.x1, a.x2) && btw(a.y1, b.y1, b.y2)) p = b.x1.toFixed(2) + ',' + a.y1.toFixed(2);
      else if (a.v && b.h && btw(a.x1, b.x1, b.x2) && btw(b.y1, a.y1, a.y2)) p = a.x1.toFixed(2) + ',' + b.y1.toFixed(2);
      if (p) { points.add(p); contacts.add(p + '\u0000' + pair); }
    }
  }
  return {points: points.size, contacts: contacts.size};
}
// A gutter drawn in its own frame, each track once: cards at x = 0, level k at x = -(first + k·step); a track is its
// vertical over its span, with its inner stubs running to the cards and its outer stubs coming from far away.
const localGutter = (tracks, level, first, step) => tracks.flatMap(t => { const x = -(first + level.get(String(t.key)) * step); return [{g: t.key, pts: [[x, t.a], [x, t.b]]}, ...(t.inner || []).map(y => ({g: t.key, pts: [[x, y], [0, y]]})), ...(t.outer || []).map(y => ({g: t.key, pts: [[-1e5, y], [x, y]]}))]; });
const uniq = ys => [...new Set(ys)];
const levelsOf = lv => (lv.size ? Math.max(...lv.values()) + 1 : 0);
function checkTracks(items, opts, label) {
  const A = assignTracks(items, opts), gap = opts.gap ?? 3;
  assert.ok(A.levels <= A.budget, label + ': within the level budget');
  assert.equal(A.budget, A.colouring.levels + Math.max(opts.slack ?? 2, Math.ceil((opts.ratio ?? 0.15) * A.colouring.levels)), label + ': the budget is colouring + max(slack, ratio)');
  assert.ok(A.crossings <= A.colouring.crossings, label + ': never more modelled crossings than interval colouring');
  assert.equal(trackCrossings(items, A.level, {gap}), A.crossings, label + ': the reported crossings are the modelled ones');
  assert.equal(trackAlongs(items, A.level, {gap}), A.alongs, label + ': the reported runs along another line\'s end are the modelled ones');
  assert.equal(trackAlongs(items, colourTracks(items, {gap}), {gap}), A.colouring.alongs, label + ': and interval colouring\'s');
  if (opts.avoidAlongs) assert.ok(A.alongs <= A.colouring.alongs, label + ': never more runs along another line\'s end than interval colouring');
  for (const p of items) for (const q of items) if (p !== q && !(p.b < q.a - gap || p.a > q.b + gap)) assert.notEqual(A.level.get(String(p.key)), A.level.get(String(q.key)), label + ': overlapping tracks never share a level');
  assert.equal(JSON.stringify([...A.level].sort()), JSON.stringify([...assignTracks([...items].reverse(), opts).level].sort()), label + ': the same in any order');
  return A;
}
{
  // Random gutters.
  const rnd = seeded(73), pick = n => Math.floor(rnd() * n);
  let runs = 0, gain = 0, base = 0, reduced = 0;
  const along = {gutters: 0, colouring: 0, assigned: 0, crossings: 0, colouringCrossings: 0};
  for (let s = 0; s < 400; s++) {
    const n = 1 + pick(s < 300 ? 18 : 60), items = [];
    for (let i = 0; i < n; i++) { const a = pick(40) * 10, b = a + 10 + pick(30) * 10, ys = [a, b, ...(pick(3) ? [] : [a + 5 + pick((b - a) / 5 | 0) * 5])]; const inner = ys.filter(() => pick(2)), outer = ys.filter(y => !inner.includes(y)); items.push({key: 't' + String(i).padStart(2, '0'), a, b, inner, outer}); }
    const opts = [{}, {slack: 0, ratio: 0}, {slack: 4}][s % 3];
    const A = checkTracks(items, opts, 'random gutter ' + s);
    runs++; gain += A.colouring.crossings - A.crossings; base += A.colouring.crossings; reduced += A.how.startsWith('reduced') ? 1 : 0;
    // The same gutter with runs along another line's end put first (the lane engine's option).
    const B = checkTracks(items, {...opts, avoidAlongs: true}, 'random gutter ' + s + ' avoiding runs along');
    along.gutters++; along.colouring += B.colouring.alongs; along.assigned += B.alongs; along.crossings += B.crossings; along.colouringCrossings += B.colouring.crossings;
  }
  assert.ok(along.colouring > 0 && along.assigned < along.colouring, 'the random gutters exercise runs along another line\'s end, and the option cuts them');
  // The order kept strictly, with its cheapest levels emptied until the budget holds (round 10, V2), wins somewhere.
  assert.ok(reduced > 0, 'the reduced order is the best candidate in some gutters');
  // Small cliques: exactly optimal against every order.
  const perms = a => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p])));
  for (let s = 0; s < 60; s++) {
    const m = 2 + (s % 6), items = Array.from({length: m}, (_, i) => { const a = pick(20), b = 200 + pick(20); return {key: 'c' + i, a, b, inner: [a, b, 30 + pick(140)].filter(() => pick(2)), outer: [a, b, 30 + pick(140)].filter(() => pick(2))}; });
    const A = checkTracks(items, {slack: m}, 'clique ' + s);
    let best = Infinity;
    for (const p of perms(items.map((_, i) => i))) best = Math.min(best, trackCrossings(items, new Map(p.map((i, r) => [items[i].key, r]))));
    assert.equal(A.crossings, best, 'clique ' + s + ': the order is exactly optimal');
  }
  measured.randomTracks = {gutters: runs, colouringCrossings: base, assignedCrossings: base - gain, reducedWins: reduced, avoidingAlongs: along};
  pass(`assignTracks on ${runs} random gutters stays within its budget, never models more crossings than interval colouring (${base} → ${base - gain}; the reduced strict order wins ${reduced} of them), keeps overlapping tracks apart and ignores input order; with runs along another line's end put first, it never runs along more often or crosses more often than colouring (runs along ${along.colouring} → ${along.assigned}, crossings ${along.colouringCrossings} → ${along.crossings}); on 60 small cliques it is exactly optimal against every order`);
}
// The interval colourings the lane engine and the Chapter 6 brackets drew before round 10 (lane-layout.js and
// platform-layout.js until V2), kept here only as the oracles that colourTracks is the control they are measured against.
const retiredColouring = (tracks, gap) => {
  const levels = [], out = new Map();
  for (const t of [...tracks].sort((p, q) => (p.b - p.a) - (q.b - q.a) || p.a - q.a || (p.key < q.key ? -1 : 1))) {
    let i = levels.findIndex(iv => iv.every(([x, y2]) => t.b < x - gap || t.a > y2 + gap));
    if (i < 0) { i = levels.length; levels.push([]); }
    levels[i].push([t.a, t.b]); out.set(t.key, i);
  }
  return out;
};
{
  // Reference gutters. colourTracks reproduces the colourings drawn before round 10 exactly; the lane engine and the
  // Chapter 6 brackets now draw the assigner's levels (round 10, V2), never crossing more than that colouring would; the
  // model counts exactly what is drawn; and the assigner's levels, drawn in the gutter's own frame, cross exactly as
  // often as it models.
  const out = {lane: {gutters: 0, colouring: 0, assigned: 0, levels: 0, levelsAfter: 0, widened: 0, alongsColouring: 0, alongs: 0}, deploy: {trunks: 0, contacts: 0, points: 0, rails: 0, colouring: 0, assigned: 0, levels: 0, levelsAfter: 0}, platform: {arcs: 0, colouring: 0, assigned: 0}, ch3: {drivers: 0, today: 0, colouring: 0, assigned: 0}, corridor: {layouts: 0, colouring: 0, assigned: 0}};
  // Runs along another line's end as a lane gutter draws them: a flow's far-side stub (from a source in another lane)
  // lying on the same height as another track's card-side stub (into its target, or out of a flow within one lane) and
  // overlapping it, counted once per pair of tracks and height.
  const alongsDrawn = routes => {
    const outer = [], inner = [], seen = new Set(), span = (p, q) => [Math.min(p[0], q[0]), Math.max(p[0], q[0])];
    for (const r of routes) { const t = r.share || r.entry || r.id; inner.push({t, y: r.yb, x: span(r.pts[2], r.pts[3])}); (r.dir === 0 ? inner : outer).push({t, y: r.ya, x: span(r.pts[0], r.pts[1])}); }
    for (const o of outer) for (const i of inner) if (o.t !== i.t && Math.abs(o.y - i.y) <= WIRE.EPS && Math.min(o.x[1], i.x[1]) - Math.max(o.x[0], i.x[0]) > WIRE.EPS) seen.add(o.t + '\u0000' + i.t + '\u0000' + i.y);
    return seen.size;
  };
  // A lane gutter's tracks are its trunks: a bundle's, a fan's (round 10, V5: one element's flows of one kind leaving
  // through one port) or a lone route's (share, else entry, else id).
  const laneGutters = (L, label) => {
    const G = new Map();
    for (const r of L.routes) {
      const card = L.cards.find(c => c.id === r.link.to), side = r.xb === card.x ? 'L' : 'R', k = card.x + side, tk = r.share || r.entry || r.id;
      if (!G.has(k)) G.set(k, {side, edge: side === 'L' ? card.x : card.x + card.w, lane: L.lanes.find(ln => ln.id === card.row.region), tracks: new Map(), routes: []});
      const g = G.get(k); g.routes.push(r);
      if (!g.tracks.has(tk)) g.tracks.set(tk, {key: tk, ys: [], inner: [], outer: [], ends: [], xt: r.xt});
      const t = g.tracks.get(tk); t.ys.push(r.ya, r.yb);
      const loop = r.dir === 0; if (loop) t.inner.push(r.ya, r.yb); else { t.inner.push(r.yb); t.outer.push(r.ya); }
      t.ends.push({y1: r.ya, y2: r.yb, loop});
    }
    for (const [k, g] of G) {
      const tracks = [...g.tracks.values()].map(t => ({...t, a: Math.min(...t.ys), b: Math.max(...t.ys), inner: uniq(t.inner), outer: uniq(t.outer)}));
      const levels = new Map(tracks.map(t => [t.key, Math.round((Math.abs(t.xt - g.edge) - LANE.GUT / 2) / LANE.TRACK)])), col = colourTracks(tracks);
      assert.deepEqual([...col].sort(), [...retiredColouring(tracks, 3)].sort(), label + ' ' + k + ': colourTracks is the lane colouring drawn before round 10');
      const A = checkTracks(tracks, {avoidAlongs: true}, label + ' ' + k);
      assert.deepEqual([...levels].sort(), [...A.level].sort(), label + ' ' + k + ': the lane engine draws the assigner\'s levels, runs along another line\'s end put first');
      assert.equal(alongsDrawn(g.routes), A.alongs, label + ' ' + k + ': the model counts the runs along another line\'s end drawn');
      assert.equal(g.side === 'L' ? g.lane.gl : g.lane.gr, LANE.GUT + A.levels * LANE.TRACK, label + ' ' + k + ': the gutter is as wide as its levels');
      const now = drawn(g.routes.map(r => ({g: r.share || r.entry || r.id, pts: r.pts})));
      assert.equal(trackCrossings(tracks, levels), now.points, label + ' ' + k + ': the model counts the crossing points drawn');
      assert.equal(now.contacts, now.points, label + ' ' + k + ': no two pairs cross at one point');
      assert.deepEqual(drawn(localGutter(tracks, levels, LANE.GUT / 2, LANE.TRACK)), now, label + ' ' + k + ': the gutter\'s own frame draws the same');
      const ctl = drawn(localGutter(tracks, col, LANE.GUT / 2, LANE.TRACK));
      assert.deepEqual(ctl, {points: A.colouring.crossings, contacts: A.colouring.crossings}, label + ' ' + k + ': interval colouring would cross as modelled');
      assert.ok(now.points <= ctl.points, label + ' ' + k + ': the lane engine draws no more crossings than interval colouring would');
      out.lane.gutters++; out.lane.colouring += ctl.points; out.lane.assigned += now.points; out.lane.levels += levelsOf(col); out.lane.levelsAfter += A.levels; out.lane.widened += A.levels > levelsOf(col) ? 1 : 0; out.lane.alongsColouring += A.colouring.alongs; out.lane.alongs += A.alongs;
    }
  };
  for (const [label, project] of PROJECTS) each(label, () => {
    const SM = story.storySource(project);
    laneGutters(contextLayout(story.foldContext(SM, story.storyScope(SM, {kind: 'system'}), {ghost: null})), label + ' ch1');
    const V = realise.realiseSource(project);
    for (const depth of ['components', 'modules']) laneGutters(realiseLayout(realise.foldRealise(V, {kind: 'system'}, depth)), label + ' realise ' + depth);
    const LM = resp.responsibilitySource(project);
    for (const depth of ['responsibilities', 'groups']) laneGutters(responsibilityLayout(resp.foldResponsibilities(LM, {kind: 'system'}, depth)), label + ' responsibilities ' + depth);
    const T = threat.threatSource(project, {order: {}});
    for (const depth of ['parts', 'boundaries']) laneGutters(threatLayout(threat.foldThreat(T, {kind: 'system'}, depth)), label + ' ch9 ' + depth);
    // Chapter 10 rails (round 10, V6; every stub runs to the cards): the layout draws the assigner's levels with Chapter
    // 10's slack, the gutter as wide as they are, and the model counts exactly the crossings drawn, never more than
    // interval colouring of the same rails would draw, and fewer crossing points than today's trunks drew (rebuilt).
    const DV = deploy.deploySource(project, {order: {}});
    for (const depth of ['all', 'modules']) {
      const DF = deploy.foldDeploy(DV, deploy.deployScope(DV, {kind: 'system'}), depth), DL = deployLayout(DF, {viewW: 1100});
      const tracks = DL.rails.map(r => ({key: r.id, a: r.y1, b: r.y2, inner: [r.stubY]})), levels = new Map(DL.rails.map(r => [r.id, r.level]));
      const A = checkTracks(tracks, {gap: 3, slack: DEP.SLACK, ratio: 0.15}, label + ' ch10 ' + depth);
      assert.deepEqual([...levels].sort(), [...A.level].sort(), label + ' ch10: the rails take the assigner\'s levels');
      assert.ok(DL.levels === A.levels && DL.arcW === Math.max(30, DEP.ARC_PAD * 2 + A.levels * DEP.ARC_STEP), label + ' ch10: the gutter is as wide as its levels');
      const now = drawn(DL.rails.map(r => ({g: r.id, pts: r.stubY === r.y1 ? [[r.x, r.y2], [r.x, r.y1], [r.xb, r.y1]] : r.stubY === r.y2 ? [[r.x, r.y1], [r.x, r.y2], [r.xb, r.y2]] : [[r.x, r.y1], [r.x, r.y2]]})).concat(DL.rails.filter(r => r.stubY !== r.y1 && r.stubY !== r.y2).map(r => ({g: r.id, pts: [[r.x, r.stubY], [r.xb, r.stubY]]}))));
      assert.equal(trackCrossings(tracks, levels), now.points, label + ' ch10: the model counts the crossing points drawn');
      assert.equal(now.contacts, now.points, label + ' ch10: no two pairs cross at one point (one stub per row)');
      assert.deepEqual(drawn(localGutter(tracks, levels, DEP.ARC_PAD, DEP.ARC_STEP)), now, label + ' ch10: the gutter\'s own frame draws the same');
      const ctl = drawn(localGutter(tracks, colourTracks(tracks), DEP.ARC_PAD, DEP.ARC_STEP));
      assert.equal(ctl.contacts, A.colouring.crossings, label + ' ch10: interval colouring of the rails would cross as modelled');
      assert.ok(now.points <= ctl.points, label + ' ch10: no more crossings than interval colouring of the rails');
      // Today's trunks, rebuilt (deploy-layout.js before V6): colourTracks is their colouring, drawn once per link.
      const T = deployTrunks(DL, DF), trunkTracks = [...new Set(T.arcs.map(a => a.trunk))].map(k => { const as = T.arcs.filter(a => a.trunk === k), ys = as.flatMap(a => [a.y1, a.y2]); return {key: k, a: Math.min(...ys), b: Math.max(...ys)}; });
      const trunkLevel = new Map(T.arcs.map(a => [a.trunk, Math.round((a.xb - DEP.ARC_PAD - a.x) / DEP.ARC_STEP)]));
      assert.deepEqual([...colourTracks(trunkTracks)].sort(), [...trunkLevel].sort(), label + ' ch10: colourTracks is the trunk colouring drawn before round 10');
      assert.deepEqual([...retiredColouring(trunkTracks, 3)].sort(), [...trunkLevel].sort());
      const before = drawn(T.arcs.map(a => ({g: a.trunk, pts: [[a.xb, a.y1], [a.x, a.y1], [a.x, a.y2], [a.xb, a.y2]]})));
      assert.ok(now.points <= before.points, label + ' ch10: the rails cross at no more points than today\'s trunks did');
      out.deploy.trunks += trunkTracks.length; out.deploy.contacts += before.contacts; out.deploy.points += before.points; out.deploy.rails += tracks.length; out.deploy.colouring += A.colouring.crossings; out.deploy.assigned += A.crossings; out.deploy.levels += T.levels; out.deploy.levelsAfter += A.levels;
    }
    // Chapter 6 brackets: no extra levels (owner decision 11).
    const Pm = platform.platformSource(project, {order: {}});
    for (const depth of ['components', 'modules']) {
      const PL = platformLayout(platform.foldPlatform(Pm, platform.platformScope(Pm, {kind: 'system'}), depth, {}));
      const tracks = PL.arcs.map(a => ({key: a.id, a: Math.min(a.ya, a.yb), b: Math.max(a.ya, a.yb), inner: uniq([a.ya, a.yb]), ends: [{y1: a.ya, y2: a.yb, loop: true}]}));
      const levels = new Map(PL.arcs.map(a => [a.id, a.level])), col = colourTracks(tracks, {gap: 4});
      assert.deepEqual([...col].sort(), [...retiredColouring(tracks, 4)].sort(), label + ' ch6: colourTracks is the bracket colouring drawn before round 10');
      const A = checkTracks(tracks, {gap: 4, slack: 0, ratio: 0}, label + ' ch6 ' + depth);
      assert.deepEqual([...levels].sort(), [...A.level].sort(), label + ' ch6: the brackets draw the assigner\'s levels');
      assert.ok(PL.levels === A.levels && A.levels <= levelsOf(col), label + ' ch6: no extra levels');
      const now = drawn(PL.arcs.map(a => ({g: a.id, pts: [[a.xa, a.ya], [a.x, a.ya], [a.x, a.yb], [a.xa + 4, a.yb]]})));
      assert.equal(trackCrossings(tracks, levels, {gap: 4}), now.points, label + ' ch6: the model counts the crossing points drawn');
      assert.equal(now.contacts, now.points, label + ' ch6: no two pairs cross at one point');
      assert.deepEqual(drawn(localGutter(tracks, levels, PX.GUT / 2, PX.LEVEL)), now, label + ' ch6: the gutter\'s own frame draws the same');
      const ctl = drawn(localGutter(tracks, col, PX.GUT / 2, PX.LEVEL));
      assert.equal(ctl.contacts, A.colouring.crossings, label + ' ch6: interval colouring would cross as modelled');
      assert.ok(now.points <= ctl.points, label + ' ch6: the brackets draw no more crossings than interval colouring would');
      out.platform.arcs += tracks.length; out.platform.colouring += ctl.points; out.platform.assigned += now.points;
    }
    // Chapter 3 driver tracks, one per driver (inner: the driver's stub; outer: the decisions'): the levels drawn, read back
    // from the picture, cross as the model counts them; the assigned levels cross as modelled.
    const TM = tradeoff.tradeoffSource(project);
    const ML = mapLayout(tradeoff.foldMap(TM, tradeoff.tradeoffScope(TM, {kind: 'system'}), tradeoff.defaultDepth(TM), {}));
    const wg = ML.routes.filter(r => r.kind === 'weighs'), drv = [...new Set(wg.map(r => r.from))];
    const tracks = drv.map(d => { const rs = wg.filter(r => r.from === d), ys = rs.flatMap(r => [r.pts[1][1], r.pts[2][1]]); return {key: d, a: Math.min(...ys), b: Math.max(...ys), inner: uniq(rs.map(r => r.pts[1][1])), outer: uniq(rs.map(r => r.pts[2][1])), ends: rs.map(r => ({y1: r.pts[2][1], y2: r.pts[1][1], loop: false}))}; });
    const x0 = wg[0] ? wg[0].pts[0][0] : 0, today = new Map(tracks.map(t => [t.key, Math.round((wg.find(r => r.from === t.key).pts[1][0] - x0 - 16) / DM.TRACK)]));
    const now3 = drawn(wg.map(r => ({g: r.from, pts: r.pts}))), drawnToday = now3.points;
    assert.equal(trackCrossings(tracks, today), now3.contacts, label + ' ch3: the model counts the crossings drawn today');
    assert.equal(now3.contacts, drawnToday, label + ' ch3: no two pairs cross at one point');
    assert.deepEqual(drawn(localGutter(tracks, today, 16, DM.TRACK)), now3, label + ' ch3: the gutter\'s own frame draws the same');
    const A = checkTracks(tracks, {}, label + ' ch3');
    assert.equal(drawn(localGutter(tracks, A.level, 16, DM.TRACK)).contacts, A.crossings, label + ' ch3: the assigned levels cross as modelled');
    out.ch3.drivers += tracks.length; out.ch3.today += drawnToday; out.ch3.colouring += A.colouring.crossings; out.ch3.assigned += A.crossings;
    // Whole design corridor tracks (horizontal; level 0 nearest the cards above; both verticals run to the cards).
    const AL = anatomyLayout(anatomyModel(anatomySource(project)), {chapter: 11, scope: {kind: 'system'}, peel: null, order: {}, viewW: 1180});
    const corr = AL.routes.filter(r => r.type === 'corridor').map(r => ({key: r.id, a: Math.min(r.points[1][0], r.points[4][0]), b: Math.max(r.points[1][0], r.points[4][0]), inner: uniq([r.points[1][0], r.points[4][0]])}));
    if (corr.length) { const C = checkTracks(corr, {gap: 6}, label + ' corridor'); out.corridor.layouts++; out.corridor.colouring += C.colouring.crossings; out.corridor.assigned += C.crossings; }
  });
  measured.referenceTracks = out;
  pass(`assignTracks on the reference gutters: colourTracks reproduces the lane, bracket and Chapter 10 trunk colourings drawn before round 10 exactly; the lane engine and the Chapter 6 brackets draw the assigner's levels, the gutters as wide as those levels, and the model counts exactly the crossings drawn (lanes ${out.lane.assigned} over ${out.lane.gutters} gutters against ${out.lane.colouring} with interval colouring, runs along another line's end ${out.lane.alongsColouring} → ${out.lane.alongs}, ${out.lane.levels} → ${out.lane.levelsAfter} levels with ${out.lane.widened} gutters wider, every one within budget; Chapter 6 ${out.platform.assigned} against ${out.platform.colouring} with no extra level; Chapter 3 ${out.ch3.today}); Chapter 10's ${out.deploy.rails} rails take the assigner's levels and cross ${out.deploy.assigned} times (interval colouring of the same rails ${out.deploy.colouring}; today's ${out.deploy.trunks} trunks, rebuilt, ${out.deploy.contacts} pair crossings at ${out.deploy.points} points where row stubs shared a line; levels ${out.deploy.levels} → ${out.deploy.levelsAfter}); the assigner stays in budget and never models more than colouring (Chapter 3 colouring ${out.ch3.colouring} → ${out.ch3.assigned}), and its levels drawn in each gutter's frame cross exactly as modelled`);
}
{
  // The lane engine's wires (round 10, V2): mergeWires over its routes, returned beside them (routes, joins, markers and
  // labels are as the engine lays them out), with each bundle's entry as the share, joined at the target end, and the
  // chapter's wireStyle as the style key. With no wireStyle declared no two routes share ink. With one declared, a
  // bundle's trunk is drawn once from its port with one head per entry, every merged entry passes the integrity checks,
  // and the style moves nothing. Chapter 1 (round 10, V5) fans out from the source instead: each fan is one element's
  // flows of one kind on one track, merged from its port with a head per branch, and intact.
  const t = {layouts: 0, threatLayouts: 0, contextLayouts: 0, fans: 0, fanRoutes: 0, routes: 0, entries: 0, heads: 0, ink: 0, routeInk: 0};
  const declared = r => ({id: r.id, pts: r.pts, share: r.entry, end: r.entry ? 'to' : 'from', style: 'link ' + r.link.id});
  const asThreat = {top: threatHead(), bundleKey: (l, rowOf) => (l.kind === 'uses' ? l.to + '<' + rowOf.get(l.from).region : null), edgeMarker: l => !!l.crosses, entryMarker: ls => ls.some(l => l.crosses), labelled: l => l.kind !== 'uses'};
  for (const [label, project] of PROJECTS) each(label, () => {
    const SM = story.storySource(project), V = realise.realiseSource(project), LM = resp.responsibilitySource(project), T = threat.threatSource(project, {order: {}});
    const lanes = [['ch1', contextLayout(story.foldContext(SM, story.storyScope(SM, {kind: 'system'}), {ghost: null}))], ...['components', 'modules'].map(d => ['ch5 ' + d, realiseLayout(realise.foldRealise(V, {kind: 'system'}, d))]), ...['responsibilities', 'groups'].map(d => ['ch4 ' + d, responsibilityLayout(resp.foldResponsibilities(LM, {kind: 'system'}, d))])];
    for (const depth of ['parts', 'boundaries', 'all']) {
      const F = threat.foldThreat(T, {kind: 'system'}, depth), L = threatLayout(F), S = laneLayout(F, {...asThreat, wireStyle: l => l.kind});
      lanes.push(['ch9 ' + depth, L]);
      const {wires: W, ...rest} = S, {wires: W0, kind, ...rest0} = L;
      assert.equal(JSON.stringify(rest), JSON.stringify(rest0), label + ' ch9 ' + depth + ': a wireStyle moves nothing');
      assert.equal(JSON.stringify(W), JSON.stringify(mergeWires(S.routes.map(r => ({...declared(r), style: r.link.kind})))), label + ' ch9 ' + depth + ': the wires are the routes merged as declared');
      const m = checkWires(S.routes.map(r => ({...declared(r), style: r.link.kind})), label + ' ch9 ' + depth + ' wires');
      const entries = new Set(S.routes.filter(r => r.entry).map(r => r.entry));
      for (const en of entries) assert.equal(W.heads.filter(h => h.share === en).length, 1, label + ' ch9 ' + depth + ': one head per entry');
      assert.equal(W.heads.length, entries.size + S.routes.filter(r => !r.entry).length, label + ' ch9 ' + depth + ': heads are the entries and the contracts');
      const C = wireConflicts(W);
      assert.deepEqual([C.atJoin.length, C.onTrunk.length, C.tContacts.length, W.apart.length], [0, 0, 0, 0], label + ' ch9 ' + depth + ': no foreign line at a join, along a trunk or as a T, nothing drawn apart');
      t.entries += entries.size; t.heads += W.heads.length; t.ink += m.ink; t.routeInk += m.routeInk;
    }
    for (const [view, L] of lanes) {
      if (view.startsWith('ch9')) {
        // Round 10, V4: Chapter 9 declares how its links are drawn (threat-layout.js threatWireStyle), so an entry's uses
        // drawn alike share ink from the entry: exactly as declared, one head per entry, and every entry intact.
        const style = threatWireStyle(), entries = new Set(L.routes.filter(r => r.entry).map(r => r.entry)), C = wireConflicts(L.wires);
        assert.equal(JSON.stringify(L.wires), JSON.stringify(mergeWires(L.routes.map(r => ({...declared(r), style: style(r.link)})))), label + ' ' + view + ': the wires are the routes merged as Chapter 9 declares');
        assert.equal(L.wires.heads.length, entries.size + L.routes.filter(r => !r.entry).length, label + ' ' + view + ': heads are the entries and the contracts');
        assert.deepEqual([C.atJoin.length, C.onTrunk.length, C.tContacts.length, L.wires.apart.length], [0, 0, 0, 0], label + ' ' + view + ': no foreign line at a join, along a trunk or as a T, nothing drawn apart');
        assert.ok(L.routes.every(r => r.share === r.entry && r.shareEnd === (r.entry ? 'to' : null)), label + ' ' + view + ': a route shares only its entry, from its target end');
        t.threatLayouts++;
      } else if (view === 'ch1') {
        // Round 10, V5: Chapter 1 fans out each person's part in the journey and each owner's outcomes (story-layout.js),
        // drawn by kind. The wires are the routes merged as declared; a fan is two or more flows of one kind from one
        // element, leaving through one port on one track, from its source end; a delivers path is never shared; every
        // branch keeps its head; no foreign line meets a fan at a join, along its trunk or as a T, nothing drawn apart.
        const fans = new Map(), C = wireConflicts(L.wires);
        for (const r of L.routes) if (r.share != null) (fans.get(r.share) || fans.set(r.share, []).get(r.share)).push(r);
        assert.equal(JSON.stringify(L.wires), JSON.stringify(mergeWires(L.routes.map(r => ({id: r.id, pts: r.pts, share: r.share, end: r.shareEnd || 'from', style: r.link.kind})))), label + ' ch1: the wires are the routes merged as Chapter 1 declares');
        assert.ok(fans.size > 0 && [...fans.values()].every(rs => rs.length >= 2 && rs.every(r => r.shareEnd === 'from' && r.entry == null && r.link.from === rs[0].link.from && r.link.kind === rs[0].link.kind && r.ya === rs[0].ya && r.xa === rs[0].xa && r.xt === rs[0].xt)), label + ' ch1: a fan is two or more flows of one kind from one element, through one port on one track');
        assert.ok(L.routes.every(r => (r.share == null) === (r.shareEnd == null)) && L.routes.every(r => r.link.kind !== 'delivers' || r.share == null), label + ' ch1: a delivers path is never shared');
        assert.equal(L.wires.heads.length, L.routes.length, label + ' ch1: every branch keeps its own head');
        assert.deepEqual([C.atJoin.length, C.onTrunk.length, C.tContacts.length, L.wires.apart.length], [0, 0, 0, 0], label + ' ch1: no foreign line at a join, along a trunk or as a T, nothing drawn apart');
        t.contextLayouts++; t.fans += fans.size; t.fanRoutes += [...fans.values()].reduce((n, rs) => n + rs.length, 0);
      } else {
        assert.equal(JSON.stringify(L.wires), JSON.stringify(mergeWires(L.routes.map(declared))), label + ' ' + view + ': the wires are the routes merged as declared');
        assert.ok(L.routes.every(r => r.share == null && r.shareEnd == null), label + ' ' + view + ': no route is shared');
        assert.ok(L.wires.chains.every(c => c.ids.length === 1) && !L.wires.joins.length && L.wires.heads.length === L.routes.filter(r => headDir(r.pts)).length, label + ' ' + view + ': with no wireStyle declared no two routes share ink, and each keeps its head');
      }
      t.layouts++; t.routes += L.routes.length;
    }
  });
  measured.laneWires = t;
  pass(`The lane engine returns its wires beside its routes on ${t.layouts} reference layouts (${t.routes} routes): with no wireStyle declared no two routes share ink; Chapter 1 fans out from its sources (${t.contextLayouts} layouts, ${t.fans} fans of ${t.fanRoutes} flows, merged exactly as declared, a head per branch, intact); Chapter 9 declares its own (${t.threatLayouts} layouts, merged exactly as declared, intact); with Chapter 9's entries declared alike, each entry's trunk is drawn once with one head (${t.heads} heads for the entries and contracts, ${Math.round(t.ink)} px of ink for ${Math.round(t.routeInk)} px of routes), no foreign line at a join, along a trunk or as a T, and the style moves nothing`);
}
{
  // Scale: the synthetic system's Chapter 10 rails (the round-10 scale case) stay quick and within budget, and the layout
  // draws exactly the assigner's levels.
  const X = exchangeModel(anatomyModel(syntheticSource({modules: 40, comps: 4, caps: 12, seed: 5})));
  const zones = Array.from({length: 6}, (_, i) => ({id: 'Z' + i, ref: 'ZON-' + i, title: 'Zone ' + i, failureDomain: 'Site ' + Math.floor(i / 2), boundaryId: ''}));
  const comps = X.M.comp.map(c => c.id), idx = new Map(comps.map((c, i) => [c, 'R' + i]));
  const plans = [...comps.map((id, i) => ({id: 'R' + i, ref: 'RUN-' + i, title: 'Plan ' + id, assetId: id, minReady: 2, maxReplicas: 4})), ...X.M.tech.slice(0, 12).map((t, i) => ({id: 'T' + i, ref: 'RUN-T' + i, title: 'Platform ' + i, assetId: t.id, minReady: 1, maxReplicas: 2}))];
  const deps = [...X.links.filter(l => idx.has(l.from) && idx.has(l.to)).map(l => ({from: idx.get(l.from), to: idx.get(l.to), mode: 'required'})), ...comps.map((c, i) => ({from: 'R' + i, to: 'T' + (i % 12), mode: 'required'}))];
  const SV = deploy.deployModel(X, {env: {id: 'E', title: 'S'}, zones, plans, placements: [], deps});
  const scale = {};
  for (const depth of ['modules', 'all']) {
    const DL = deployLayout(deploy.foldDeploy(SV, {kind: 'system'}, depth), {viewW: 1200});
    const tracks = DL.rails.map(r => ({key: r.id, a: r.y1, b: r.y2, inner: [r.stubY]}));
    const t0 = performance.now(), A = checkTracks(tracks, {gap: 3, slack: DEP.SLACK, ratio: 0.15}, 'synthetic ch10 ' + depth), ms = Math.round(performance.now() - t0);
    assert.ok(ms < 3000, 'synthetic ch10 ' + depth + ': under 3 s (' + ms + ' ms, with the order check)');
    assert.deepEqual(DL.rails.map(r => [r.id, r.level]).sort(), [...A.level].sort(), 'synthetic ch10 ' + depth + ': the rails take the assigner\'s levels');
    if (tracks.length > WIRE.REDUCE_MAX) assert.ok(!A.how.startsWith('reduced'), 'synthetic ch10 ' + depth + ': no reduced order above ' + WIRE.REDUCE_MAX + ' tracks');
    scale[depth] = {trunks: tracks.length, levels: DL.levels, levelsAfter: A.levels, budget: A.budget, colouring: A.colouring.crossings, assigned: A.crossings, how: A.how, ms};
  }
  measured.scaleTracks = scale;
  pass(`assignTracks at scale (synthetic 160-part Chapter 10: ${scale.modules.trunks} and ${scale.all.trunks} rails): within budget (${scale.modules.levelsAfter}/${scale.modules.budget} and ${scale.all.levelsAfter}/${scale.all.budget} levels) and quick (${scale.modules.ms} and ${scale.all.ms} ms including the checks)`);
}

// ---------------------------------------------------------------- 5. heads and the one roundPath
{
  assert.equal(headD(10, 10, 'r'), 'M10 10L3 13.5L3 6.5Z'); assert.equal(headD(10, 10, 'd', 8), 'M10 10L6 2L14 2Z');
  assert.equal(headD(0, 0, null), ''); assert.equal(headPath(0, 0, null, 7, 'x'), '');
  assert.equal(headPath(5, 5, 'u', 7, 'tm-head lit'), '<path class="tm-head lit" d="M5 5L8.5 12L1.5 12Z"/>');
  assert.equal(headPath(5, 5, 'l', 7, '"><script>'), '<path class="&quot;&gt;&lt;script&gt;" d="M5 5L12 1.5L12 8.5Z"/>', 'the class is escaped');
  assert.ok(!/fill|#[0-9a-f]{3}/i.test(headPath(1, 2, 'r', 7, 'k')), 'a head carries no colour of its own: its fill is a CSS token');
  assert.deepEqual([headDir([[0, 0], [5, 0]]), headDir([[0, 0], [0, -5], [0, -5]]), headDir([[1, 1]])], ['r', 'u', null]);
  // One roundPath in public/: the wires module's, re-exported by model-stage.js.
  const copies = readdirSync('public').filter(f => f.endsWith('.js') && /function roundPath\s*\(/.test(readFileSync('public/' + f, 'utf8')));
  assert.deepEqual(copies, ['wire-merge.js'], 'one roundPath');
  assert.match(readFileSync('public/model-stage.js', 'utf8'), /^export \{roundPath, headPath\} from '\.\/wire-merge\.js';$/m);
  for (const [f, r] of [['anatomy-view.js', 6], ['tradeoff-view.js', 7], ['utility-view.js', 8]]) assert.match(readFileSync('public/' + f, 'utf8'), new RegExp('roundPath\\([a-z.]+, ' + r + '\\)'), f + ' keeps its radius');
  assert.equal(roundPath([[0, 0], [20, 0], [20, 20]], 6), 'M0 0L14 0Q20 0 20 6L20 20');
  assert.equal(roundPath([[0, 0], [1, 0], [1, 20]], 6), 'M0 0L1 0L1 20', 'a corner too tight to round stays square');
  // The retired Whole design copy (anatomy-view.js before round 10), kept here only as the oracle for its retirement.
  const retired = (pts, r = 6) => {
    if (pts.length < 2) return '';
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const d1 = Math.hypot(x1 - x0, y1 - y0), d2 = Math.hypot(x2 - x1, y2 - y1), k = Math.min(r, d1 / 2, d2 / 2);
      const ax = x1 - (x1 - x0) / (d1 || 1) * k, ay = y1 - (y1 - y0) / (d1 || 1) * k, bx = x1 + (x2 - x1) / (d2 || 1) * k, by = y1 + (y2 - y1) / (d2 || 1) * k;
      d += `L${ax} ${ay}Q${x1} ${y1} ${bx} ${by}`;
    }
    const [xe, ye] = pts[pts.length - 1];
    return d + `L${xe} ${ye}`;
  };
  let flows = 0, layouts = 0;
  const models = [...PROJECTS.map(([label, p]) => [label, anatomyModel(anatomySource(p))]), ['core banking', anatomyModel(coreBankingSource())], ['synthetic', anatomyModel(syntheticSource({modules: 12, comps: 4, caps: 10, seed: 3}))]];
  for (const [label, M] of models) {
    const scopes = [{kind: 'system'}, ...M.modules.slice(0, 3).map(m => ({kind: 'module', id: m.id})), ...M.comp.slice(0, 3).map(c => ({kind: 'part', id: c.id}))];
    for (let chapter = 4; chapter <= 11; chapter++) for (const scope of scopes) for (const viewW of [760, 1180, 1440]) {
      const AL = anatomyLayout(M, {chapter, scope, peel: null, order: {}, viewW}); layouts++;
      for (const r of AL.routes) { assert.equal(roundPath(r.points, 6), retired(r.points), `${label} ch${chapter} ${scope.kind} ${viewW}: flow ${r.id} draws the same`); flows++; }
    }
  }
  measured.roundPath = {wholeDesignLayouts: layouts, flows};
  assert.ok(flows > 1000);
  pass(`Heads are classed polygons with no colour of their own; one roundPath lives in the wires module (re-exported by model-stage.js; the Whole design, decision map and utility tree keep radii 6, 7 and 8), and on ${flows} Whole design flows over ${layouts} layouts it draws exactly what the retired copy drew`);
}

console.log(JSON.stringify({status: 'passed', checks, measured}, null, 2));
