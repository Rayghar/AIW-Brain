// Deployment & runtime — deterministic layout for the Chapter 10 Model views.
//
// Guarantees (checked by deploy-validate.mjs):
// - A row is one deployable part and keeps the same height and place in every zone column, so a
//   part reads straight across: where it runs, where it does not, and what happens to it.
// - Zone columns sharing a failure domain stand together under one bracket.
// - Dependencies run as trunks in their own gutter (one per part that needs something) and never
//   cross a card.
// - Geometry depends on the folded rows and the stage width only — never on the lens or on the
//   failure being explored — so switching either never moves anything.

export const DEP = {RAIL: 232, DOM_H: 24, HEAD_H: 74, GROUP_H: 30, ROW_H: 58, MIN_Z: 150, MAX_Z: 280, TRAY: 168, OUT: 214, ARC_STEP: 7, ARC_PAD: 12, DOMAIN_GAP: 14};

export function deployHead() { return DEP.DOM_H + DEP.HEAD_H + 10; }

export function deployLayout(F, {viewW = 1100} = {}) {
  const top = deployHead() + 6, rows = [], groups = [];
  let y = top, group = null;
  for (const r of F.rows) {
    if (r.group !== group) { group = r.group; groups.push({id: 'G:' + group + ':' + rows.length, key: group, y, h: DEP.GROUP_H, first: r.id}); y += DEP.GROUP_H; }
    rows.push({id: r.id, row: r, y, h: DEP.ROW_H, cy: y + DEP.ROW_H / 2});
    y += DEP.ROW_H;
  }
  const H = y + 24, cy = new Map(rows.map(r => [r.id, r.cy]));
  // Dependencies run on trunks. Something many parts need (a shared platform service) collects
  // its branches on one trunk; otherwise each part that needs something has its own trunk with a
  // branch to each thing it needs. Shorter trunks sit next to the cards, longer ones further out,
  // and trunks on one level never overlap.
  const links = F.links.filter(l => cy.has(l.from) && cy.has(l.to)), trunks = new Map(), inDegree = new Map();
  for (const l of links) inDegree.set(l.to, (inDegree.get(l.to) || 0) + 1);
  for (const l of links) {
    const hub = inDegree.get(l.to) >= 4, key = hub ? 'to:' + l.to : 'from:' + l.from, anchor = hub ? l.to : l.from, other = hub ? l.from : l.to;
    const t = trunks.get(key) || {from: key, a: cy.get(anchor), b: cy.get(anchor), links: []};
    t.a = Math.min(t.a, cy.get(other)); t.b = Math.max(t.b, cy.get(other)); t.links.push(l); trunks.set(key, t);
  }
  const levels = [], order = [...trunks.values()].sort((p, q) => (p.b - p.a) - (q.b - q.a) || p.a - q.a || (p.from < q.from ? -1 : 1));
  for (const t of order) {
    let k = levels.findIndex(iv => iv.every(([a, b]) => t.b < a - 3 || t.a > b + 3));
    if (k < 0) { k = levels.length; levels.push([]); }
    levels[k].push([t.a, t.b]); t.level = k;
  }
  const arcW = Math.max(30, DEP.ARC_PAD * 2 + levels.length * DEP.ARC_STEP), x0 = DEP.RAIL + arcW, xb = x0 - 4;
  const trunkX = t => xb - DEP.ARC_PAD - t.level * DEP.ARC_STEP;
  const arcs = order.flatMap(t => t.links.map(l => ({id: l.id, link: l, from: l.from, to: l.to, y1: cy.get(l.from), y2: cy.get(l.to), x: trunkX(t), xb, level: t.level})));
  const trunkList = order.map(t => ({from: t.from, x: trunkX(t), y1: t.a, y2: t.b, level: t.level}));
  // Zone columns, with a gap between failure domains.
  const nz = Math.max(1, F.zones.length), gaps = F.zones.reduce((n, z, i) => n + (i && z.domain !== F.zones[i - 1].domain ? 1 : 0), 0);
  const zw = Math.max(DEP.MIN_Z, Math.min(DEP.MAX_Z, Math.floor((Math.max(viewW, 640) - x0 - DEP.TRAY - DEP.OUT - 36 - gaps * DEP.DOMAIN_GAP) / nz)));
  const zones = [];
  let x = x0 + 6;
  F.zones.forEach((z, i) => { if (i && z.domain !== F.zones[i - 1].domain) x += DEP.DOMAIN_GAP; zones.push({id: z.id, zone: z, x, w: zw}); x += zw; });
  const zx = new Map(zones.map(z => [z.id, z]));
  const trayX = x + 12, outX = trayX + DEP.TRAY + 8, W = outX + DEP.OUT + 16;
  const domains = [];
  for (const z of zones) { const last = domains.at(-1); if (last && last.domain === z.zone.domain) { last.x2 = z.x + z.w; last.zones.push(z.id); } else domains.push({domain: z.zone.domain, x1: z.x, x2: z.x + z.w, zones: [z.id]}); }
  const cells = [], trays = [], outs = [];
  for (const r of rows) {
    for (const [zid, c] of r.row.cells) { const z = zx.get(zid); if (z) cells.push({id: r.id + '@' + zid, row: r.id, zone: zid, cell: c, x: z.x + 8, y: r.y + 7, w: z.w - 16, h: DEP.ROW_H - 14}); }
    trays.push({id: r.id + '@tray', row: r.id, x: trayX + 4, y: r.y + 7, w: DEP.TRAY - 8, h: DEP.ROW_H - 14});
    outs.push({id: r.id + '@out', row: r.id, x: outX + 4, y: r.y + 7, w: DEP.OUT - 8, h: DEP.ROW_H - 14});
  }
  const env = zones.length ? {x: zones[0].x - 4, y: DEP.DOM_H - 2, w: zones.at(-1).x + zones.at(-1).w - zones[0].x + 8, h: H - DEP.DOM_H - 10} : null;
  return {kind: 'deploy', W, H, top, rail: DEP.RAIL, arcW, x0, zones, domains, trayX, outX, rows, groups, cells, trays, outs, arcs, trunks: trunkList, env, levels: levels.length};
}

export const boxOverlap = (a, b, pad = 0) => a.x < b.x + b.w - pad && b.x < a.x + a.w - pad && a.y < b.y + b.h - pad && b.y < a.y + a.h - pad;
