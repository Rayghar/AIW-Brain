// Deployment / runtime — deterministic layout for the Chapter 10 Model views.
//
// Guarantees (checked by deploy-validate.mjs):
// - A row is one deployable part and keeps the same height and place in every zone column, so a
//   part reads straight across: where it runs, where it does not, and what happens to it.
// - Zone columns sharing a failure domain stand together under one bracket.
// - Dependencies run on rails in their own gutter (round 10, V6): one rail per part that something
//   needs, ending in one arrow into that part's row, with one mark on it at the row of each part
//   that needs it. Rails never cross a card, and a rail spans every one of its marks and its stub.
// - Geometry depends on the folded rows and the stage width only — never on the lens or on the
//   failure being explored — so switching either never moves anything.
import {assignTracks} from './wire-merge.js';

// PORT: a part's marks ("needs") sit PORT px above its row's centre and the arrow into it ("needed by") arrives PORT px
// below, so no mark ever lies on another rail's stub. SLACK: the rail levels allowed over interval colouring's to cut
// crossings are max(SLACK, 15%); one, not the lanes' two, keeps the gutter of a large system (deploy-validate's
// synthetic 160 parts) within the levels its trunks needed before round 10.
export const DEP = {RAIL: 232, DOM_H: 24, HEAD_H: 74, GROUP_H: 30, ROW_H: 58, MIN_Z: 150, MAX_Z: 280, TRAY: 168, OUT: 214, ARC_STEP: 7, ARC_PAD: 12, DOMAIN_GAP: 14, PORT: 6, SLACK: 1};

export function deployHead() { return DEP.DOM_H + DEP.HEAD_H + 10; }

export function deployLayout(F, {viewW = 1100, compactTray = false} = {}) {
  const trayWidth = compactTray ? 88 : DEP.TRAY;
  const top = deployHead() + 6, rows = [], groups = [];
  let y = top, group = null;
  for (const r of F.rows) {
    if (r.group !== group) { group = r.group; groups.push({id: 'G:' + group + ':' + rows.length, key: group, y, h: DEP.GROUP_H, first: r.id}); y += DEP.GROUP_H; }
    rows.push({id: r.id, row: r, y, h: DEP.ROW_H, cy: y + DEP.ROW_H / 2});
    y += DEP.ROW_H;
  }
  const H = y + 24, cy = new Map(rows.map(r => [r.id, r.cy]));
  // Dependencies run on rails: one per part that something needs. Its stub arrives PORT px below that part's row centre
  // with the one arrow; each part that needs it has one mark on the rail, PORT px above its own row's centre. The rail
  // runs from the topmost to the bottommost of its marks and its stub. A farther rail's stub passes the nearer rails,
  // so the levels (0 nearest the cards) come from assignTracks with every stub on the cards' side, cutting those
  // crossings within interval colouring's levels plus max(DEP.SLACK, 15%); rails on one level never come within 3 px.
  const links = F.links.filter(l => cy.has(l.from) && cy.has(l.to)), byTo = new Map();
  for (const l of links) { if (!byTo.has(l.to)) byTo.set(l.to, []); byTo.get(l.to).push(l); }
  const rails = [...byTo].map(([to, ls]) => {
    const stubY = cy.get(to) + DEP.PORT, dots = ls.map(l => ({link: l.id, from: l.from, y: cy.get(l.from) - DEP.PORT})).sort((p, q) => p.y - q.y);
    const ys = [stubY, ...dots.map(d => d.y)];
    return {id: 'to:' + to, to, x: 0, xb: 0, y1: Math.min(...ys), y2: Math.max(...ys), level: 0, stubY, dots};
  }).sort((p, q) => p.stubY - q.stubY);
  const plan = assignTracks(rails.map(r => ({key: r.id, a: r.y1, b: r.y2, inner: [r.stubY]})), {gap: 3, slack: DEP.SLACK, ratio: 0.15});
  const levels = plan.levels, arcW = Math.max(30, DEP.ARC_PAD * 2 + levels * DEP.ARC_STEP), x0 = DEP.RAIL + arcW, xb = x0 - 4;
  for (const r of rails) { r.level = plan.level.get(r.id); r.x = xb - DEP.ARC_PAD - r.level * DEP.ARC_STEP; r.xb = xb; }
  // One arc per link, for selection and the failure carried: its whole route from the dependent's row along its
  // rail into the part it needs (M xb y1 H x V y2 H xb), drawn only when lit or carrying.
  const railOf = new Map(rails.map(r => [r.to, r]));
  const arcs = links.map(l => { const r = railOf.get(l.to); return {id: l.id, link: l, from: l.from, to: l.to, rail: r.id, y1: cy.get(l.from) - DEP.PORT, y2: r.stubY, x: r.x, xb, level: r.level}; });
  const railPlan = {how: plan.how, crossings: plan.crossings, budget: plan.budget, colouring: plan.colouring.levels};
  // Zone columns, with a gap between failure domains.
  const nz = Math.max(1, F.zones.length), gaps = F.zones.reduce((n, z, i) => n + (i && z.domain !== F.zones[i - 1].domain ? 1 : 0), 0);
  const zw = Math.max(DEP.MIN_Z, Math.min(DEP.MAX_Z, Math.floor((Math.max(viewW, 640) - x0 - trayWidth - DEP.OUT - 36 - gaps * DEP.DOMAIN_GAP) / nz)));
  const zones = [];
  let x = x0 + 6;
  F.zones.forEach((z, i) => { if (i && z.domain !== F.zones[i - 1].domain) x += DEP.DOMAIN_GAP; zones.push({id: z.id, zone: z, x, w: zw}); x += zw; });
  const zx = new Map(zones.map(z => [z.id, z]));
  const trayX = x + 12, outX = trayX + trayWidth + 8, W = outX + DEP.OUT + 16;
  const domains = [];
  for (const z of zones) { const last = domains.at(-1); if (last && last.domain === z.zone.domain) { last.x2 = z.x + z.w; last.zones.push(z.id); } else domains.push({domain: z.zone.domain, x1: z.x, x2: z.x + z.w, zones: [z.id]}); }
  const cells = [], trays = [], outs = [];
  for (const r of rows) {
    for (const [zid, c] of r.row.cells) { const z = zx.get(zid); if (z) cells.push({id: r.id + '@' + zid, row: r.id, zone: zid, cell: c, x: z.x + 8, y: r.y + 7, w: z.w - 16, h: DEP.ROW_H - 14}); }
    trays.push({id: r.id + '@tray', row: r.id, x: trayX + 4, y: r.y + 7, w: trayWidth - 8, h: DEP.ROW_H - 14});
    outs.push({id: r.id + '@out', row: r.id, x: outX + 4, y: r.y + 7, w: DEP.OUT - 8, h: DEP.ROW_H - 14});
  }
  const env = zones.length ? {x: zones[0].x - 4, y: DEP.DOM_H - 2, w: zones.at(-1).x + zones.at(-1).w - zones[0].x + 8, h: H - DEP.DOM_H - 10} : null;
  return {kind: 'deploy', W, H, top, rail: DEP.RAIL, arcW, x0, zones, domains, trayX, trayWidth, compactTray, outX, rows, groups, cells, trays, outs, arcs, rails, railPlan, env, levels};
}

export const boxOverlap = (a, b, pad = 0) => a.x < b.x + b.w - pad && b.x < a.x + a.w - pad && a.y < b.y + b.h - pad && b.y < a.y + a.h - pad;
