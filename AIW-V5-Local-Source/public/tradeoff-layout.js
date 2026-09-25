// Chapter 3 Model — deterministic layout for the decision map and the trade-off matrix.
//
// Decision map: the drivers on the left, the decisions in the middle, each decision's alternatives
// on the right. Each driver has its own track in the first gutter and its own port on every
// decision it reaches, so no two routes share a segment; each decision's alternatives hang from one
// trunk in the second gutter. Trade-off matrix: drivers down a sticky rail, alternatives across in
// groups under sticky decision heads, and a weighted row beneath. Neither layout reads the lens.
// Guarantees are checked in tradeoff-validate.mjs.

export const DM = {HEAD_H: 64, PAD: 16, DRV_W: 236, DRV_H: 100, DEC_W: 262, DEC_H: 170, ALT_W: 320, ALT_H: 168, SUG_H: 132, G2: 46, TRACK: 11, VGAP: 12, BGAP: 26};
export function mapHead() { return DM.HEAD_H + 8; }

export function mapLayout(F) {
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
  // Driver → decision: a track per driver, a port per driver on each decision.
  const routes = [];
  const incoming = new Map();
  for (const l of F.links) { if (!incoming.has(l.to)) incoming.set(l.to, []); incoming.get(l.to).push(l.from); }
  for (const [to, froms] of incoming) {
    const d = C.get(to), ordered = F.drivers.filter(id => froms.includes(id));
    ordered.forEach((from, k) => {
      const s = C.get(from), i = F.drivers.indexOf(from), tx = X.drv + DM.DRV_W + 16 + i * DM.TRACK;
      const py = Math.round(d.y + 26 + (k + 0.5) * ((d.h - 40) / ordered.length));
      const sy = Math.round(s.y + s.h / 2);
      routes.push({id: from + '>' + to, from, to, kind: 'weighs', pts: [[s.x + s.w, sy], [tx, sy], [tx, py], [d.x, py]]});
    });
  }
  // Decision → alternatives: one trunk each.
  for (const c of cards.filter(c => c.decision)) {
    const d = C.get(c.decision), sy = Math.round(d.y + d.h / 2), ty = Math.round(c.y + Math.min(c.h / 2, 48)), xm = d.x + d.w + DM.G2 / 2;
    routes.push({id: c.decision + '>' + c.id, from: c.decision, to: c.id, kind: c.kind === 'alt' ? 'option' : c.kind, pts: [[d.x + d.w, sy], [xm, sy], [xm, ty], [c.x, ty]]});
  }
  const W = X.alt + DM.ALT_W + DM.PAD, H = Math.max(top + 40, ...cards.map(c => c.y + c.h)) + 24;
  return {kind: 'map', W, H, top: mapHead(), rail: 0, cards, routes, cols: [{id: 'drivers', x: X.drv, w: DM.DRV_W}, {id: 'decisions', x: X.dec, w: DM.DEC_W}, {id: 'alternatives', x: X.alt, w: DM.ALT_W}], gutter: {x: X.drv + DM.DRV_W, w: g1}};
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
