// Shared lane layout for chapter models that read across regions (Chapter 9 trust boundaries,
// Chapter 5 modules, Chapter 4 journey steps).
//
// Regions are vertical lanes. Elements are stacked in rows; elements in different lanes share a
// row only when no flow's horizontal run would pass through one of them, and an element is drawn
// level with the first neighbour already placed, so most flows read straight across. A flow
// leaves its card through a port, runs across at its own height, turns in a gutter of the target
// lane, and enters the target from the side it came. A chapter may band its rows (Chapter 4 keeps
// each responsibility group in rows of its own); bands stack in the order the rows arrive. Flows a chapter bundles (for example uses of
// one store from one region) share a trunk, a port and, optionally, one marker.
// Guarantees (checked by each chapter's validation): no card overlaps; every route is orthogonal
// and avoids every card but its own two; tracks in one gutter never overlap unless they share a
// trunk; labels avoid cards, markers and each other. The engine never reads a lens.

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
  for (const l of F.links) {
    const la = laneOf(l.from), lb = laneOf(l.to), out = lb >= la ? 'R' : 'L', inn = lb > la ? 'L' : 'R';
    const e = {l, la, lb, out, inn, bundle: bundleOf.get(l.id) || null}; ends.push(e);
    const dy = slot.get(l.to) - slot.get(l.from), dist = Math.abs(turn(lb, inn) - turn(la, out));
    side(l.from, out).push({e, end: 'from', key: [slot.get(l.to), dy < 0 ? dist : -dist, l.id]});
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
  for (const e of ends) {
    e.ya = portAt(e.l.from, e.out, side(e.l.from, e.out).find(x => x.e === e && x.end === 'from'));
    e.yb = portAt(e.l.to, e.inn, e.bundle ? bundlePort.get(e.bundle.id) : side(e.l.to, e.inn).find(x => x.e === e && x.end === 'to'));
  }
  // Vertical tracks: in the gutter of the lane a flow enters, on the side it enters from.
  const gutters = new Map(), trunks = new Map();
  for (const e of ends) {
    const key = e.bundle ? e.bundle.id : e.l.id;
    if (!trunks.has(key)) { const t = {key, ends: [], k: e.lb + '|' + e.inn}; trunks.set(key, t); if (!gutters.has(t.k)) gutters.set(t.k, []); gutters.get(t.k).push(t); }
    trunks.get(key).ends.push(e);
  }
  for (const t of trunks.values()) { const ys = t.ends.flatMap(e => [e.ya, e.yb]); t.a = Math.min(...ys); t.b = Math.max(...ys); }
  const width = new Map();
  for (const [k, ts] of gutters) {
    const levels = [];
    for (const t of ts.sort((p, q) => (p.b - p.a) - (q.b - q.a) || p.a - q.a || (p.key < q.key ? -1 : 1))) {
      let i = levels.findIndex(iv => iv.every(([x, y2]) => t.b < x - 3 || t.a > y2 + 3));
      if (i < 0) { i = levels.length; levels.push([]); }
      levels[i].push([t.a, t.b]); t.track = i;
    }
    width.set(k, GUT + levels.length * TRACK);
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
    const routes = [], markers = [], joins = [], failed = [];
    for (const t of trunks.values()) {
      const e0 = t.ends[0], lb = lanes[e0.lb];
      t.xt = e0.inn === 'L' ? lb.cardX - GUT / 2 - t.track * TRACK : lb.cardX + cardW + GUT / 2 + t.track * TRACK;
    }
    for (const e of ends) {
      const a = C.get(e.l.from), b = C.get(e.l.to), t = trunks.get(e.bundle ? e.bundle.id : e.l.id);
      const xa = e.out === 'R' ? a.x + a.w : a.x, xb = e.inn === 'L' ? b.x : b.x + b.w, xt = t.xt;
      routes.push({id: e.l.id, link: e.l, pts: [[xa, e.ya], [xt, e.ya], [xt, e.yb], [xb, e.yb]], ya: e.ya, yb: e.yb, xa, xt, xb, dir: e.lb === e.la ? 0 : e.lb > e.la ? 1 : -1, entry: e.bundle ? e.bundle.id : null});
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
      const far = t.ends.reduce((m, e) => (Math.abs(e.ya - e0.yb) > Math.abs(m.ya - e0.yb) ? e : m), t.ends[0]);
      if (ls.length > 1) for (const e of t.ends) if (e !== far) joins.push({entry: en.id, links: [e.l.id], x: t.xt, y: e.ya});
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
    return {lanes, W, cards, routes, markers, joins, labels, failed};
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
  const {lanes, W, cards, routes, markers, joins, labels} = P;
  return {W, H, top, lanes, cards, routes, markers, joins, labels, slots};
}
