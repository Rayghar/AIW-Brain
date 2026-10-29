// Shared lane layout for chapter models that read across regions (Chapter 9 trust boundaries,
// Chapter 5 modules, Chapter 4 journey steps).
//
// Regions are vertical lanes. Elements are stacked in rows; elements in different lanes share a
// row only when no flow's horizontal run would pass through one of them, and an element is drawn
// level with the first neighbour already placed, so most flows read straight across. A flow
// leaves its card through a port, runs across at its own height, turns in a gutter of the target
// lane, and enters the target from the side it came. A chapter may band its rows (Chapter 4 keeps
// each responsibility group in rows of its own); bands stack in the order the rows arrive. Flows a chapter bundles (for example uses of
// one store from one region) share a trunk, a port and, optionally, one marker. Flows a chapter fans out (for example
// the steps one person takes part in) leave one element through one port on one trunk that divides
// at each target. The tracks of a gutter are ordered to cut crossings (wire-merge.js assignTracks),
// a chapter may have the ports of each card side chosen with them (portRule), and the layout
// returns its wires (mergeWires) beside the routes, which stay one per link.
// Guarantees (checked by each chapter's validation): no card overlaps; every route is orthogonal
// and avoids every card but its own two; tracks in one gutter never overlap unless they share a
// trunk (a bundle or a fan); a flow belongs to at most one of them; labels avoid cards, markers
// and each other. The engine never reads a lens.

import {assignTracks, colourTracks, mergeWires} from './wire-merge.js';

export const LANE = {CARD_W: 170, CARD_H: 70, ROW_GAP: 22, GUT: 18, TRACK: 7, LANE_GAP: 14, PORT: 11, LABEL_H: 30, LABEL_MAX: 210};

export function laneLayout(F, {
  top,
  cardW = LANE.CARD_W,
  cardH = (row, ports) => Math.max(LANE.CARD_H, 22 + ports * LANE.PORT),
  rowGap = LANE.ROW_GAP,
  labelH = LANE.LABEL_H,
  labelMax = LANE.LABEL_MAX,
  labelInset = 30,
  measure = l => 16 + 7 * String(l.label || '').length,
  bundleKey = () => null,
  edgeMarker = () => false,
  entryMarker = () => false,
  labelled = () => true,
  wireStyle = l => 'link ' + l.id,
  fromKey = () => null,
  portRule = false,
  trackOrder = 'crossings',
  left = 10,
  band = null
} = {}) {
  const {GUT, TRACK, LANE_GAP, PORT} = LANE;
  const laneIx = new Map(F.lanes.map((l, i) => [l.id, i]));
  const rowOf = new Map(F.rows.map(r => [r.id, r]));
  const laneOf = id => laneIx.get(rowOf.get(id).region);
  // Bundles share a trunk, a port and a marker.
  const bundles = new Map();
  for (const l of F.links) { const k = bundleKey(l, rowOf); if (k == null) continue; if (!bundles.has(k)) bundles.set(k, {id: 'E:' + k, to: l.to, region: rowOf.get(l.from).region, links: []}); bundles.get(k).links.push(l); }
  const bundleOf = new Map(); for (const b of bundles.values()) for (const l of b.links) bundleOf.set(l.id, b);
  // Fans (round 10, V5) share a port, a trunk and ink from their source: the flows of one class (fromKey) from one
  // element into one lane, on the side they enter, drawn alike (one wireStyle), when there are at least two. A flow
  // joins at most one structure — a bundle (shared at its target) or a fan (shared at its source), never both — so no
  // drawn line ever joins two sources to two targets. Labelled flows (each carries its own words) and marked flows
  // never fan out.
  const fans = new Map();
  for (const l of F.links) {
    if (bundleOf.has(l.id) || labelled(l) || edgeMarker(l)) continue;
    const k = fromKey(l, rowOf); if (k == null) continue;
    const la = laneOf(l.from), lb = laneOf(l.to), to = lb + (lb > la ? 'L' : 'R'), g = [k, l.from, to, wireStyle(l)].join('\u0000');
    if (!fans.has(g)) fans.set(g, {base: 'F:' + k + '|' + l.from + '>' + to, links: []});
    fans.get(g).links.push(l);
  }
  const fanOf = new Map(), fanIds = new Map();
  for (const f of fans.values()) {
    if (f.links.length < 2) continue;
    const n = fanIds.get(f.base) || 0; fanIds.set(f.base, n + 1);
    f.id = n ? f.base + '#' + n : f.base;
    for (const l of f.links) fanOf.set(l.id, f);
  }
  // Rows. A run from lane a to lane b passes through every lane strictly between them.
  const between = l => { const a = laneOf(l.from), b = laneOf(l.to), out = []; for (let k = Math.min(a, b) + 1; k < Math.max(a, b); k++) out.push(k); return out; };
  const outOf = new Map(F.rows.map(r => [r.id, []])), nb = new Map(F.rows.map(r => [r.id, []]));
  for (const l of F.links) { outOf.get(l.from).push(l); nb.get(l.from).push(l.to); nb.get(l.to).push(l.from); }
  const slot = new Map(), cardsAt = [], runsAt = [], last = new Map();
  let floor = 0, bandKey, top0 = -1;
  for (const r of F.rows) {
    if (band) { const b = band(r); if (b !== bandKey) { floor = top0 + 1; bandKey = b; } }
    const k = laneOf(r.id), mine = [...new Set(outOf.get(r.id).flatMap(between))];
    const placed = nb.get(r.id).filter(id => slot.has(id)).map(id => slot.get(id));
    let s = Math.max(floor, last.has(k) ? last.get(k) + 1 : 0, placed.length ? Math.min(...placed) : 0);
    while ((runsAt[s] && runsAt[s].has(k)) || (cardsAt[s] && mine.some(x => cardsAt[s].has(x)))) s++;
    slot.set(r.id, s); last.set(k, s); top0 = Math.max(top0, s);
    (cardsAt[s] ||= new Set()).add(k); for (const x of mine) (runsAt[s] ||= new Set()).add(x);
  }
  // Ends and ports. Each card side orders its ports by where the other end lies.
  const sides = new Map(), ends = [];
  const side = (id, sd) => { const k = id + '|' + sd; if (!sides.has(k)) sides.set(k, []); return sides.get(k); };
  const turn = (lane, sd) => lane * 2 + (sd === 'R' ? 1 : 0);
  // A fan leaves through one port, placed as its topmost branch would be.
  const fanPort = new Map();
  for (const l of F.links) {
    const la = laneOf(l.from), lb = laneOf(l.to), out = lb >= la ? 'R' : 'L', inn = lb > la ? 'L' : 'R';
    const e = {l, la, lb, out, inn, bundle: bundleOf.get(l.id) || null, fan: fanOf.get(l.id) || null}; ends.push(e);
    if (e.fan && fanPort.has(e.fan.id)) continue;
    const at = e.fan ? Math.min(...e.fan.links.map(x => slot.get(x.to))) : slot.get(l.to);
    const dy = at - slot.get(l.from), dist = Math.abs(turn(lb, inn) - turn(la, out));
    const item = {e, end: 'from', key: [at, dy < 0 ? dist : -dist, e.fan ? e.fan.id : l.id]};
    if (e.fan) fanPort.set(e.fan.id, item);
    side(l.from, out).push(item);
  }
  const bundlePort = new Map();
  for (const e of ends) {
    if (e.bundle) { if (bundlePort.has(e.bundle.id)) continue; const item = {e, end: 'to', key: [Math.min(...e.bundle.links.map(l => slot.get(l.from))), 0, e.bundle.id]}; bundlePort.set(e.bundle.id, item); side(e.l.to, e.inn).push(item); continue; }
    side(e.l.to, e.inn).push({e, end: 'to', key: [slot.get(e.l.from), -Math.abs(e.lb - e.la), e.l.id]});
  }
  const cmp = (a, b) => { for (let i = 0; i < 3; i++) { if (a.key[i] < b.key[i]) return -1; if (a.key[i] > b.key[i]) return 1; } return 0; };
  for (const list of sides.values()) list.sort(cmp);
  const ports = id => Math.max((sides.get(id + '|L') || []).length, (sides.get(id + '|R') || []).length);
  const hOf = new Map(F.rows.map(r => [r.id, cardH(r, ports(r.id))]));
  const slots = Math.max(0, ...slot.values()) + 1, slotH = new Array(slots).fill(0);
  for (const r of F.rows) slotH[slot.get(r.id)] = Math.max(slotH[slot.get(r.id)], hOf.get(r.id));
  const slotY = []; let y = top + 10;
  for (let i = 0; i < slots; i++) { slotY.push(y); y += (slotH[i] || LANE.CARD_H) + rowGap; }
  const H = y + 10;
  const R = new Map(F.rows.map(r => [r.id, {y: slotY[slot.get(r.id)], h: hOf.get(r.id)}]));
  const portAt = (id, sd, item) => { const list = side(id, sd), i = list.indexOf(item), n = list.length, r = R.get(id), step = Math.min(PORT, (r.h - 14) / Math.max(1, n)); return r.y + r.h / 2 + (i - (n - 1) / 2) * step; };
  // Vertical tracks: in the gutter of the lane a flow enters, on the side it enters from.
  const gutters = new Map(), trunks = new Map();
  const trunkOf = e => (e.bundle ? e.bundle.id : e.fan ? e.fan.id : e.l.id);
  for (const e of ends) {
    const key = trunkOf(e);
    if (!trunks.has(key)) { const t = {key, ends: [], k: e.lb + '|' + e.inn}; trunks.set(key, t); if (!gutters.has(t.k)) gutters.set(t.k, []); gutters.get(t.k).push(t); }
    trunks.get(key).ends.push(e);
  }
  // Level 0 is nearest the cards. A track's card-side stubs (into its target, and both ends of a flow within one lane)
  // cross every nearer track whose span holds them; its far-side stubs (from a source in another lane) cross every
  // farther one, and run along a farther track's card-side stub at the same height. The levels are chosen first to
  // keep any flow from running along another's end, then to cut crossings (assignTracks), never crossing more than
  // interval colouring would, within the colouring's levels plus max(2, 15%); tracks within 3 px never share a level.
  // trackOrder 'colouring' keeps the interval colouring alone (shortest span nearest), as before round 10: the in-run
  // control the chapter-lines evidence measures the order against.
  const width = new Map();
  const portOf = (e, end) => (end === 'from' ? (e.fan ? fanPort.get(e.fan.id) : side(e.l.from, e.out).find(x => x.e === e && x.end === 'from')) : e.bundle ? bundlePort.get(e.bundle.id) : side(e.l.to, e.inn).find(x => x.e === e && x.end === 'to'));
  const place1 = e => { e.ya = portAt(e.l.from, e.out, portOf(e, 'from')); e.yb = portAt(e.l.to, e.inn, portOf(e, 'to')); };
  const gutterItems = ts => ts.map(t => {
    const ys = t.ends.flatMap(e => [e.ya, e.yb]);
    return {key: t.key, a: Math.min(...ys), b: Math.max(...ys), inner: [...new Set(t.ends.flatMap(e => (e.la === e.lb ? [e.yb, e.ya] : [e.yb])))], outer: [...new Set(t.ends.filter(e => e.la !== e.lb).map(e => e.ya))]};
  });
  function settle() {
    for (const e of ends) place1(e);
    let alongs = 0, crossings = 0;
    for (const [k, ts] of gutters) {
      const items = gutterItems(ts);
      items.forEach((it, i) => { ts[i].a = it.a; ts[i].b = it.b; });
      let level;
      if (trackOrder === 'colouring') level = colourTracks(items, {gap: 3});
      else { const A = assignTracks(items, {gap: 3, avoidAlongs: true}); level = A.level; alongs += A.alongs; crossings += A.crossings; }
      for (const t of ts) t.track = level.get(String(t.key));
      width.set(k, GUT + (ts.length ? Math.max(...ts.map(t => t.track)) + 1 : 0) * TRACK);
    }
    return [alongs, crossings];
  }
  settle();
  // The port rule (portRule, round 10 V5). The order of the ports a card side gives the flows entering it is chosen with
  // its gutter's tracks. In a gutter of up to PR.SMALL tracks, the orders of its sides' incoming ports (all their
  // combinations up to PR.ALL, otherwise side by side for a few rounds, within PR.WORK tries) are each given their tracks
  // by assignTracks; a side of more than PR.EACH incoming ports tries only the rule's order: flows whose track comes
  // down to them at the top, the nearest track first; flows whose track comes up to them at the bottom, the nearest
  // last; tracks passing by between. A larger gutter tries the rule's order on every side at once, a few rounds. The
  // order kept has the fewest runs along another line's end, then the fewest crossings; the ports by where the other
  // end lies stay when none is better. A side's outgoing ports keep their order; a gutter's ports move nothing in
  // another gutter.
  if (portRule && trackOrder !== 'colouring') {
    const PR = {SMALL: 8, ALL: 2000, EACH: 5, ROUNDS: 4, WORK: 3000};
    const better = (p, q) => p[0] < q[0] || (p[0] === q[0] && p[1] < q[1]);
    const perms = xs => (xs.length < 2 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(q => [x, ...q])));
    const into = new Map(); // gutter → its sides' incoming ports [{list, at, items, moving}]
    for (const list of sides.values()) {
      const at = [], items = [];
      list.forEach((it, i) => { if (it.end === 'to') { at.push(i); items.push(it); } });
      if (items.length < 2) continue;
      const k = trunks.get(trunkOf(items[0].e)).k;
      (into.get(k) || into.set(k, []).get(k)).push({list, at, items, moving: ends.filter(e => items.includes(portOf(e, 'to')))});
    }
    for (const [k, ss] of into) {
      const ts = gutters.get(k);
      const put = (sd, order) => { order.forEach((it, j) => { sd.list[sd.at[j]] = it; }); for (const e of sd.moving) e.yb = portAt(e.l.to, e.inn, portOf(e, 'to')); };
      const assigned = () => { const items = gutterItems(ts), A = assignTracks(items, {gap: 3, avoidAlongs: true}); items.forEach((it, i) => { ts[i].a = it.a; ts[i].b = it.b; ts[i].track = A.level.get(String(it.key)); }); return [A.alongs, A.crossings]; };
      const ruled = sd => sd.items.map((it, i) => {
        const t = trunks.get(trunkOf(it.e)), y = it.e.yb, up = t.a < y - 0.5, down = t.b > y + 0.5;
        return {it, i, r: up && !down ? [0, t.track] : down && !up ? [2, -t.track] : [1, 0]};
      }).sort((p, q) => p.r[0] - q.r[0] || p.r[1] - q.r[1] || p.i - q.i).map(o => o.it);
      let best = {score: assigned(), pick: ss.map(sd => sd.items)};
      const keep = pick => { const sc = assigned(); if (better(sc, best.score)) best = {score: sc, pick}; };
      if (ts.length > PR.SMALL) {
        for (let round = 0; round < PR.ROUNDS; round++) {
          best.pick.forEach((o, j) => put(ss[j], o)); assigned();
          const pick = ss.map(ruled); if (pick.every((o, j) => o.every((it, m) => it === best.pick[j][m]))) break;
          pick.forEach((o, j) => put(ss[j], o)); const was = best; keep(pick); if (was === best) break;
        }
      } else {
        const options = ss.map(sd => (sd.items.length <= PR.EACH ? perms(sd.items) : [sd.items, ruled(sd)]));
        const n = options.reduce((m, o) => m * o.length, 1);
        if (n <= PR.ALL) {
          const idx = ss.map(() => 0);
          for (let i = 0; i < n; i++) {
            ss.forEach((sd, j) => put(sd, options[j][idx[j]])); keep(ss.map((sd, j) => options[j][idx[j]]));
            for (let j = 0; j < idx.length; j++) { idx[j]++; if (idx[j] < options[j].length) break; idx[j] = 0; }
          }
        } else {
          let work = 0;
          for (let round = 0; round < PR.ROUNDS && work < PR.WORK; round++) {
            const was = best;
            ss.forEach((sd, j) => {
              for (const o of options[j]) { if (work++ >= PR.WORK) return; best.pick.forEach((q, m) => put(ss[m], m === j ? o : q)); keep(best.pick.map((q, m) => (m === j ? o : q))); }
            });
            if (was === best) break;
          }
        }
      }
      best.pick.forEach((o, j) => put(ss[j], o));
    }
    settle();
  }
  // Positions follow from the lanes' widths. A label with no room between two neighbouring lanes
  // widens the gap between them, once, so every flow can be read.
  const endOf = new Map(ends.map(e => [e.l.id, e]));
  function place(extra) {
    const lanes = [];
    let x = left;
    F.lanes.forEach((lane, i) => { const gl = width.get(i + '|L') || GUT, gr = width.get(i + '|R') || GUT, w = gl + cardW + gr; lanes.push({...lane, x, w, gl, gr, cardX: x + gl}); x += w + LANE_GAP + (extra[i] || 0); });
    const W = x + 6;
    const cards = F.rows.map(r => { const ln = lanes[laneIx.get(r.region)], b = R.get(r.id); return {id: r.id, row: r, x: ln.cardX, y: b.y, w: cardW, h: b.h, slot: slot.get(r.id)}; });
    const C = new Map(cards.map(c => [c.id, c]));
    const routes = [], markers = [], failed = [];
    for (const t of trunks.values()) {
      const e0 = t.ends[0], lb = lanes[e0.lb];
      t.xt = e0.inn === 'L' ? lb.cardX - GUT / 2 - t.track * TRACK : lb.cardX + cardW + GUT / 2 + t.track * TRACK;
    }
    for (const e of ends) {
      const a = C.get(e.l.from), b = C.get(e.l.to), t = trunks.get(trunkOf(e));
      const xa = e.out === 'R' ? a.x + a.w : a.x, xb = e.inn === 'L' ? b.x : b.x + b.w, xt = t.xt;
      // share: the structure the route's ink is shared along (a bundle, from its target end; a fan, from its source end).
      routes.push({id: e.l.id, link: e.l, pts: [[xa, e.ya], [xt, e.ya], [xt, e.yb], [xb, e.yb]], ya: e.ya, yb: e.yb, xa, xt, xb, dir: e.lb === e.la ? 0 : e.lb > e.la ? 1 : -1, entry: e.bundle ? e.bundle.id : null, share: e.bundle ? e.bundle.id : e.fan ? e.fan.id : null, shareEnd: e.bundle ? 'to' : e.fan ? 'from' : null});
      if (!e.bundle && edgeMarker(e.l)) {
        // Mark where the flow enters the inner region it concerns: the target's edge, or the
        // source's edge when the flow leaves for the outside.
        const toOutside = F.lanes[e.lb].kind === 'outside', ln = toOutside ? lanes[e.la] : lanes[e.lb], dirRight = e.lb > e.la;
        const mx = toOutside ? (dirRight ? ln.x + ln.w : ln.x) : (dirRight ? ln.x : ln.x + ln.w);
        markers.push({id: e.l.id, links: [e.l.id], link: e.l, state: e.l.state, x: mx, y: e.ya, region: ln.id, entry: false});
      }
    }
    for (const en of bundles.values()) {
      const t = trunks.get(en.id), e0 = t.ends[0], ls = en.links;
      if (entryMarker(ls)) {
        const rank = {exposed: 2, guarded: 1, unexamined: 0}, state = ls.map(l => l.state).sort((p, q) => (rank[q] ?? 0) - (rank[p] ?? 0))[0];
        markers.push({id: en.id, links: ls.map(l => l.id), link: ls[0], state, x: t.xt, y: e0.yb, region: F.lanes[e0.lb].id, entry: true, from: en.region, to: en.to, count: ls.length});
      }
    }
    // Labels on the horizontal run, clear of cards, markers and one another.
    const boxes = cards.map(c => ({x: c.x - 2, y: c.y - 2, w: c.w + 4, h: c.h + 4})), labels = [];
    for (const m of markers) boxes.push({x: m.x - 11, y: m.y - 11, w: 22, h: 22});
    const hit = b => boxes.some(o => b.x < o.x + o.w && o.x < b.x + b.w && b.y < o.y + o.h && o.y < b.y + b.h);
    for (const r of routes.filter(r => labelled(r.link)).sort((p, q) => p.ya - q.ya || (p.id < q.id ? -1 : 1))) {
      const w = Math.min(labelMax, Math.max(60, measure(r.link))), lo = Math.min(r.xa, r.xt), hi = Math.max(r.xa, r.xt);
      let placed = null;
      for (const above of [true, false]) {
        const by = above ? r.ya - labelH - 3 : r.ya + 4;
        for (let k = 0; k <= 24 && !placed; k++) { const t = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 18, cx = (r.dir >= 0 ? lo + labelInset + w / 2 : hi - labelInset - w / 2) + t; if (cx - w / 2 < lo + 4 || cx + w / 2 > hi - 4) continue; const b = {x: cx - w / 2, y: by, w, h: labelH}; if (!hit(b)) placed = b; }
        if (placed) break;
      }
      // Otherwise beside the vertical run, in the space the other lanes leave.
      if (!placed) {
        const a = Math.min(r.ya, r.yb), b = Math.max(r.ya, r.yb), mid = (a + b) / 2;
        for (let k = 0; k <= 40 && !placed; k++) {
          const cy = mid + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 12; if (cy < a - 8 || cy > b + 8) continue;
          for (const right of [true, false]) { const bx = right ? r.xt + 7 : r.xt - 7 - w, box = {x: bx, y: cy - labelH / 2, w, h: labelH}; if (bx >= 4 && bx + w <= W - 4 && !hit(box)) { placed = box; break; } }
        }
      }
      // Last, just the reference beside the vertical run.
      let compact = false;
      if (!placed && r.link.ref) {
        const cw = 16 + 7 * r.link.ref.length, a = Math.min(r.ya, r.yb), b = Math.max(r.ya, r.yb), mid = (a + b) / 2;
        for (let k = 0; k <= 40 && !placed; k++) {
          const cy = mid + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 8; if (cy < a + 4 || cy > b - 4) continue;
          for (const right of [true, false]) { const bx = right ? r.xt + 5 : r.xt - 5 - cw, box = {x: bx, y: cy - 9, w: cw, h: 18}; if (bx >= 4 && bx + cw <= W - 4 && !hit(box)) { placed = box; compact = true; break; } }
        }
      }
      if (placed) { boxes.push(placed); labels.push({id: r.id, link: r.link, compact, ...placed}); }
      else failed.push({r, w, lo, hi});
    }
    return {lanes, W, cards, routes, markers, labels, failed};
  }
  let P = place([]);
  if (P.failed.length) {
    const extra = [];
    for (const {r, w, lo, hi} of P.failed) {
      const e = endOf.get(r.id), g = e.la === e.lb ? e.la : Math.abs(e.la - e.lb) === 1 ? Math.min(e.la, e.lb) : -1;
      if (g < 0 || g >= F.lanes.length - 1) continue;
      const need = e.la === e.lb ? w + 20 : w + labelInset + 10 - (hi - lo);
      if (need > 0) extra[g] = Math.max(extra[g] || 0, Math.ceil(need));
    }
    if (extra.some(Boolean)) P = place(extra);
  }
  const {lanes, W, cards, routes, markers, labels} = P;
  // The wires (wire-merge.js) beside the routes, which stay one per link: a bundle's or a fan's members share ink from
  // its shared end only where the chapter's wireStyle says they are drawn identically; with none declared, no two
  // routes share. The wires' joins are where every shared line divides.
  const wires = mergeWires(routes.map(r => ({id: r.id, pts: r.pts, share: r.share, end: r.shareEnd || 'from', style: wireStyle(r.link)})));
  return {W, H, top, lanes, cards, routes, markers, labels, slots, wires};
}
