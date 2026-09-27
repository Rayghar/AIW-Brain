// Smart arrangement for the standard diagrams. A diagram (notation-model.js) is nodes, groups and
// edges; an arrangement gives each a position and each edge a route:
// - tree: ranks from the roots down, right-angled connectors (the application architecture pages);
// - orthogonal: the same ranks left to right (integration pages);
// - radial: rings around the hub (the API gateway, the shared database);
// - layered: bands by level — business, application, services, data, technology, deployment;
// - grouped: nested containers sized to what they hold (clusters, sites, trust zones);
// - lanes: swimlanes, one per lane, steps in sequence order (the BPMN page).
// Deterministic: the same diagram and choices give the same picture. A pinned node keeps the place
// the reader dragged it to; its group grows around it. A position is never a model fact.
export const NL = {W: 168, H: 58, HG: 44, VG: 64, LEFT: 28, TOP: 84, GPAD: 18, GHEAD: 30, GGAP: 30, MAXW: 1500, EVENT: 40, GATE: 44, TASK_W: 150, TASK_H: 50};
const LEVELS = [[0, 'Business'], [1, 'Process'], [2, 'Application'], [3, 'Services'], [4, 'Data'], [5, 'Technology'], [6, 'Technology (physical)'], [7, 'Deployment']];

const sizeOf = n => (n.kind === 'event' ? {w: NL.EVENT, h: NL.EVENT} : n.kind === 'gateway' ? {w: NL.GATE, h: NL.GATE} : n.kind === 'task' ? {w: NL.TASK_W, h: NL.TASK_H} : {w: NL.W, h: NL.H});
const byId = list => new Map(list.map(x => [x.id, x]));

// Ranks from the roots down over the edges given, cycles cut where they close (a stable order).
function rank(nodes, edges) {
  const ids = nodes.map(n => n.id), out = new Map(ids.map(id => [id, []])), inn = new Map(ids.map(id => [id, 0]));
  const seen = new Set();
  for (const e of edges) { const k = e.from + '>' + e.to; if (seen.has(k) || !out.has(e.from) || !inn.has(e.to)) continue; seen.add(k); out.get(e.from).push(e.to); inn.set(e.to, inn.get(e.to) + 1); }
  // Cut back-edges by depth-first order from the roots (nodes without a parent), then the rest.
  const state = new Map(), keep = new Set();
  const visit = from => { state.set(from, 1); for (const to of out.get(from)) { if (state.get(to) === 1) continue; keep.add(from + '>' + to); if (!state.has(to)) visit(to); } state.set(from, 2); };
  for (const id of ids) if (!inn.get(id) && !state.has(id)) visit(id);
  for (const id of ids) if (!state.has(id)) visit(id);
  const parents = new Map(ids.map(id => [id, []]));
  for (const k of keep) { const [a, b] = k.split('>'); parents.get(b).push(a); }
  const r = new Map(), depth = id => { if (r.has(id)) return r.get(id); r.set(id, 0); const d = parents.get(id).length ? 1 + Math.max(...parents.get(id).map(depth)) : 0; r.set(id, d); return d; };
  for (const id of ids) depth(id);
  return {rank: r, parents};
}
// Order within a rank by the mean position of the parents above (one sweep), then by name.
function order(nodes, ranks, parents) {
  const rows = new Map();
  for (const n of nodes) { const d = ranks.get(n.id); if (!rows.has(d)) rows.set(d, []); rows.get(d).push(n); }
  const pos = new Map(), sorted = [...rows.keys()].sort((a, b) => a - b), rowsOut = [];
  for (const d of sorted) {
    const row = rows.get(d).slice().sort((a, b) => {
      const pa = parents.get(a.id).map(p => pos.get(p)).filter(x => x != null), pb = parents.get(b.id).map(p => pos.get(p)).filter(x => x != null);
      const ma = pa.length ? pa.reduce((s, x) => s + x, 0) / pa.length : 1e9, mb = pb.length ? pb.reduce((s, x) => s + x, 0) / pb.length : 1e9;
      return ma - mb || String(a.group || '').localeCompare(String(b.group || '')) || a.title.localeCompare(b.title);
    });
    row.forEach((n, i) => pos.set(n.id, i)); rowsOut.push(row);
  }
  return rowsOut;
}
const rowsToPositions = (rows, {vertical = true} = {}) => {
  const P = new Map(), widths = rows.map(row => row.reduce((s, n) => s + sizeOf(n).w + NL.HG, -NL.HG)), maxW = Math.max(0, ...widths);
  const heights = rows.map(row => Math.max(0, ...row.map(n => sizeOf(n).h)));
  let off = vertical ? NL.TOP : NL.LEFT;
  rows.forEach((row, i) => {
    if (vertical) { let x = NL.LEFT + (maxW - widths[i]) / 2; for (const n of row) { const s = sizeOf(n); P.set(n.id, {x: Math.round(x), y: off + Math.round((heights[i] - s.h) / 2), ...s}); x += s.w + NL.HG; } off += heights[i] + NL.VG; }
    else { const rowH = row.reduce((s, n) => s + sizeOf(n).h + NL.HG, -NL.HG), colW = Math.max(...row.map(n => sizeOf(n).w)); let y = NL.TOP + (Math.max(...rows.map(r => r.reduce((s, n) => s + sizeOf(n).h + NL.HG, -NL.HG))) - rowH) / 2; for (const n of row) { const s = sizeOf(n); P.set(n.id, {x: off + Math.round((colW - s.w) / 2), y: Math.round(y), ...s}); y += s.h + NL.HG; } off += colW + NL.VG + 40; }
  });
  return P;
};

function treeLike(D, vertical) {
  const {rank: r, parents} = rank(D.nodes, D.edges.filter(e => e.kind !== 'sequence' || vertical));
  return rowsToPositions(order(D.nodes, r, parents), {vertical});
}
// Bands by level; a band with more than six elements wraps into rows, so the picture stays a page.
function layered(D) {
  const {parents} = rank(D.nodes, D.edges), levels = [...new Set(D.nodes.map(n => n.level))].sort((a, b) => a - b);
  const r = new Map(D.nodes.map(n => [n.id, levels.indexOf(n.level)]));
  const bandsRows = order(D.nodes, r, parents), rows = [], bandOf = [];
  bandsRows.forEach((row, b) => { for (let i = 0; i < row.length; i += 6) { rows.push(row.slice(i, i + 6)); bandOf.push(b); } });
  const P = rowsToPositions(rows), bands = [];
  bandsRows.forEach((row, b) => { const ys = row.map(n => P.get(n.id)); bands.push({level: row[0].level, title: LEVELS.find(([l]) => l === row[0].level)?.[1] || '', y: Math.min(...ys.map(p => p.y)) - 24, h: Math.max(...ys.map(p => p.y + p.h)) - Math.min(...ys.map(p => p.y)) + 40}); });
  return {P, bands};
}
function radial(D, hubId) {
  const deg = new Map(D.nodes.map(n => [n.id, 0]));
  for (const e of D.edges) { deg.set(e.from, deg.get(e.from) + 1); deg.set(e.to, deg.get(e.to) + 1); }
  const hub = D.nodes.find(n => n.id === hubId) || D.nodes.slice().sort((a, b) => deg.get(b.id) - deg.get(a.id) || a.title.localeCompare(b.title))[0];
  const P = new Map(); if (!hub) return P;
  const dist = new Map([[hub.id, 0]]), queue = [hub.id], adj = new Map(D.nodes.map(n => [n.id, []]));
  for (const e of D.edges) { adj.get(e.from).push(e.to); adj.get(e.to).push(e.from); }
  while (queue.length) { const id = queue.shift(); for (const o of adj.get(id).slice().sort()) if (!dist.has(o)) { dist.set(o, dist.get(id) + 1); queue.push(o); } }
  const far = Math.max(0, ...dist.values()) + 1;
  for (const n of D.nodes) if (!dist.has(n.id)) dist.set(n.id, far);
  const rings = new Map();
  for (const n of D.nodes) { const d = dist.get(n.id); if (!rings.has(d)) rings.set(d, []); rings.get(d).push(n); }
  const parentAngle = new Map([[hub.id, 0]]);
  let radius = 0; const cx = 0, cy = 0, placed = new Map();
  for (const d of [...rings.keys()].sort((a, b) => a - b)) {
    const ring = rings.get(d).slice().sort((a, b) => { const pa = adj.get(a.id).map(x => parentAngle.get(x)).find(x => x != null) ?? 9, pb = adj.get(b.id).map(x => parentAngle.get(x)).find(x => x != null) ?? 9; return pa - pb || a.title.localeCompare(b.title); });
    if (d === 0) { placed.set(hub.id, {x: cx, y: cy}); continue; }
    radius += Math.max(190, (ring.length * (NL.W + NL.HG)) / (2 * Math.PI) + 40);
    ring.forEach((n, i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / ring.length; parentAngle.set(n.id, a); placed.set(n.id, {x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a)}); });
  }
  const minX = Math.min(...[...placed.values()].map(p => p.x)) - NL.W / 2, minY = Math.min(...[...placed.values()].map(p => p.y)) - NL.H / 2;
  for (const n of D.nodes) { const s = sizeOf(n), c = placed.get(n.id); P.set(n.id, {x: Math.round(c.x - s.w / 2 - minX + NL.LEFT), y: Math.round(c.y - s.h / 2 - minY + NL.TOP), ...s}); }
  return P;
}
// Nested containers: a group holds its subgroups and its nodes in rows; top-level groups and free
// nodes flow across the width and wrap.
function grouped(D, viewW) {
  const P = new Map(), G = new Map(), children = new Map(), nodesIn = new Map();
  for (const g of D.groups) { children.set(g.id, []); nodesIn.set(g.id, []); }
  for (const g of D.groups) if (g.parent && children.has(g.parent)) children.get(g.parent).push(g);
  for (const n of D.nodes) if (n.group && nodesIn.has(n.group)) nodesIn.get(n.group).push(n);
  const {rank: r} = rank(D.nodes, D.edges), sortN = a => a.slice().sort((x, y) => r.get(x.id) - r.get(y.id) || x.title.localeCompare(y.title));
  // Size a group: its nodes in rows of up to four, then its subgroups beneath, side by side and wrapping.
  const measure = g => {
    const ns = sortN(nodesIn.get(g.id)), cols = Math.min(4, Math.max(1, ns.length)), rows = Math.ceil(ns.length / cols);
    const cellW = ns.length ? Math.max(...ns.map(n => sizeOf(n).w)) : 0, cellH = ns.length ? Math.max(...ns.map(n => sizeOf(n).h)) : 0;
    let w = ns.length ? cols * cellW + (cols - 1) * NL.HG : 0, h = ns.length ? rows * cellH + (rows - 1) * 22 : 0;
    const subs = children.get(g.id).map(measure);
    if (subs.length) { let x = 0, lineH = 0, y = h ? h + NL.GGAP : 0, lineW = 0; const limit = Math.max(NL.W * 2 + NL.GGAP, Math.min(NL.MAXW - 2 * NL.GPAD, subs.reduce((s, b) => s + b.w + NL.GGAP, 0))); for (const b of subs) { if (x && x + b.w > limit) { y += lineH + NL.GGAP; x = 0; lineH = 0; } b.rx = x; b.ry = y; x += b.w + NL.GGAP; lineH = Math.max(lineH, b.h); lineW = Math.max(lineW, x - NL.GGAP); } h = y + lineH; w = Math.max(w, lineW); }
    return {g, ns, cols, cellW, cellH, subs, w: Math.max(w, NL.W) + 2 * NL.GPAD, h: h + NL.GHEAD + NL.GPAD * 2};
  };
  const place = (m, x, y) => {
    G.set(m.g.id, {x, y, w: m.w, h: m.h});
    m.ns.forEach((n, i) => { const s = sizeOf(n); P.set(n.id, {x: x + NL.GPAD + (i % m.cols) * (m.cellW + NL.HG) + Math.round((m.cellW - s.w) / 2), y: y + NL.GHEAD + NL.GPAD + Math.floor(i / m.cols) * (m.cellH + 22), ...s}); });
    const baseY = y + NL.GHEAD + NL.GPAD + (m.ns.length ? Math.ceil(m.ns.length / m.cols) * (m.cellH + 22) - 22 + NL.GGAP : 0);
    for (const b of m.subs) place(b, x + NL.GPAD + b.rx, baseY + b.ry);
  };
  const tops = D.groups.filter(g => !g.parent || !G.has(g.parent) && !D.groups.some(x => x.id === g.parent)).map(measure);
  const free = sortN(D.nodes.filter(n => !n.group));
  const blocks = [...tops.map(m => ({m, w: m.w, h: m.h})), ...free.map(n => ({n, ...sizeOf(n)}))];
  const limit = Math.max(NL.W * 2, Math.min(NL.MAXW, viewW ? viewW - 2 * NL.LEFT : NL.MAXW));
  let x = NL.LEFT, y = NL.TOP, lineH = 0;
  for (const b of blocks) { if (x > NL.LEFT && x + b.w > limit) { y += lineH + NL.GGAP; x = NL.LEFT; lineH = 0; } if (b.m) place(b.m, x, y); else P.set(b.n.id, {x, y, w: b.w, h: b.h}); x += b.w + NL.GGAP; lineH = Math.max(lineH, b.h); }
  return {P, G};
}
// Swimlanes: one band per lane, steps by sequence rank across, branches stacked.
function lanes(D) {
  const P = new Map(), G = new Map(), {rank: r} = rank(D.nodes, D.edges.filter(e => e.kind === 'sequence'));
  const laneIds = D.groups.filter(g => g.kind === 'lane').map(g => g.id), laneOf = n => (laneIds.includes(n.group) ? n.group : null);
  const cols = new Map(); for (const n of D.nodes) { const k = r.get(n.id) + '|' + (laneOf(n) || ''); if (!cols.has(k)) cols.set(k, []); cols.get(k).push(n); }
  const colX = new Map(), maxRank = Math.max(0, ...D.nodes.map(n => r.get(n.id)));
  let x = NL.LEFT + 150; for (let i = 0; i <= maxRank; i++) { colX.set(i, x); x += NL.TASK_W + NL.HG + 20; }
  let y = NL.TOP;
  const bands = laneIds.length ? laneIds : [null];
  for (const lane of bands) {
    const inLane = D.nodes.filter(n => laneOf(n) === lane), stacks = Math.max(1, ...[...cols.entries()].filter(([k]) => k.endsWith('|' + (lane || ''))).map(([, v]) => v.length));
    const h = Math.max(96, stacks * (NL.TASK_H + 18) + 40);
    if (lane) G.set(lane, {x: NL.LEFT, y, w: Math.max(x, NL.LEFT + 400) - NL.LEFT, h});
    for (const n of inLane.slice().sort((a, b) => r.get(a.id) - r.get(b.id) || (a.record?.branch || 0) - (b.record?.branch || 0) || a.title.localeCompare(b.title))) {
      const k = r.get(n.id) + '|' + (lane || ''), i = cols.get(k).indexOf(n), s = sizeOf(n);
      P.set(n.id, {x: colX.get(r.get(n.id)) + Math.round((NL.TASK_W - s.w) / 2), y: y + 20 + i * (NL.TASK_H + 18) + Math.round((NL.TASK_H - s.h) / 2), ...s});
    }
    y += h + 8;
  }
  return {P, G};
}

// Groups drawn as containers grow to hold their nodes and subgroups (pins included).
function enclose(D, P, G) {
  const depth = g => (g.parent && D.groups.some(x => x.id === g.parent) ? 1 + depth(D.groups.find(x => x.id === g.parent)) : 0);
  const byDepth = D.groups.slice().sort((a, b) => depth(b) - depth(a));
  for (const g of byDepth) {
    const inside = [...D.nodes.filter(n => n.group === g.id).map(n => P.get(n.id)), ...D.groups.filter(x => x.parent === g.id).map(x => G.get(x.id))].filter(Boolean);
    if (!inside.length) { if (!G.has(g.id)) G.set(g.id, {x: NL.LEFT, y: NL.TOP, w: NL.W + 2 * NL.GPAD, h: NL.H + NL.GHEAD + 2 * NL.GPAD}); continue; }
    const x1 = Math.min(...inside.map(b => b.x)) - NL.GPAD, y1 = Math.min(...inside.map(b => b.y)) - NL.GHEAD - NL.GPAD, x2 = Math.max(...inside.map(b => b.x + b.w)) + NL.GPAD, y2 = Math.max(...inside.map(b => b.y + b.h)) + NL.GPAD;
    const cur = G.get(g.id) || {x: x1, y: y1, w: x2 - x1, h: y2 - y1};
    G.set(g.id, {x: Math.min(cur.x, x1), y: Math.min(cur.y, y1), w: Math.max(cur.x + cur.w, x2) - Math.min(cur.x, x1), h: Math.max(cur.y + cur.h, y2) - Math.min(cur.y, y1)});
  }
  return G;
}
// Routes: right-angled between the facing sides, or straight in the radial picture. A right-angled run
// that would cross another element moves into the corridor beside that element, so connectors pass
// between the boxes as the standard draws them, not through them.
const crosses = (x1, y1, x2, y2, box, m = 4) => { const lo = Math.min(x1, x2), hi = Math.max(x1, x2), lo2 = Math.min(y1, y2), hi2 = Math.max(y1, y2); return lo < box.x + box.w - m && hi > box.x + m && lo2 < box.y + box.h - m && hi2 > box.y + m; };
const clear = (pts, boxes) => { for (let i = 1; i < pts.length; i++) { const [x1, y1] = pts[i - 1], [x2, y2] = pts[i]; if (boxes.some(b => crosses(x1, y1, x2, y2, b))) return false; } return true; };
function route(a, b, style, obstacles = [], lane = 0) {
  const ac = {x: a.x + a.w / 2, y: a.y + a.h / 2}, bc = {x: b.x + b.w / 2, y: b.y + b.h / 2};
  if (style === 'straight') {
    const dx = bc.x - ac.x, dy = bc.y - ac.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    const clip = (box, sx, sy) => { const hx = box.w / 2, hy = box.h / 2, t = Math.min(hx / Math.abs(sx || 1e-9), hy / Math.abs(sy || 1e-9)); return t; };
    const ta = clip(a, ux, uy), tb = clip(b, ux, uy);
    return [[ac.x + ux * ta, ac.y + uy * ta], [bc.x - ux * tb, bc.y - uy * tb]];
  }
  const others = obstacles.filter(o => o !== a && o !== b), off = (lane % 4) * 6 - 9;
  const below = b.y >= a.y + a.h, above = b.y + b.h <= a.y;
  if (below || above) {
    const y1 = below ? a.y + a.h : a.y, y2 = below ? b.y : b.y + b.h, my = Math.round((y1 + y2) / 2);
    const direct = ac.x === bc.x ? [[ac.x, y1], [bc.x, y2]] : [[ac.x, y1], [ac.x, my], [bc.x, my], [bc.x, y2]];
    if (clear(direct, others)) return direct;
    // Down beside the source, along the gap, then in from the side of the target through its corridor.
    const bus = below ? a.y + a.h + 18 + off : a.y - 18 - off, cx = (bc.x <= ac.x ? b.x - 14 : b.x + b.w + 14) + off, ty = Math.round(bc.y);
    const side = [[ac.x, y1], [ac.x, bus], [cx, bus], [cx, ty], [bc.x <= ac.x ? b.x + b.w : b.x, ty]];
    if (clear(side, others)) return side.length && bc.x <= ac.x ? [[ac.x, y1], [ac.x, bus], [cx, bus], [cx, ty], [b.x + b.w, ty]] : side;
    const wide = [[ac.x, y1], [ac.x, bus], [cx, bus], [cx, y2 - (below ? 12 : -12)], [bc.x, y2 - (below ? 12 : -12)], [bc.x, y2]];
    return clear(wide, others) ? wide : direct;
  }
  const right = b.x >= a.x + a.w, x1 = right ? a.x + a.w : a.x, x2 = right ? b.x : b.x + b.w, mx = Math.round((x1 + x2) / 2);
  if (right || b.x + b.w <= a.x) {
    const direct = ac.y === bc.y ? [[x1, ac.y], [x2, bc.y]] : [[x1, ac.y], [mx, ac.y], [mx, bc.y], [x2, bc.y]];
    if (clear(direct, others)) return direct;
    const bus = right ? a.x + a.w + 18 + off : a.x - 18 - off, cy = (bc.y <= ac.y ? b.y - 14 : b.y + b.h + 14) + off;
    const side = [[x1, ac.y], [bus, ac.y], [bus, cy], [bc.x, cy], [bc.x, bc.y <= ac.y ? b.y + b.h : b.y]];
    return clear(side, others) ? side : direct;
  }
  return [[ac.x, a.y + a.h], [ac.x, a.y + a.h + 24], [bc.x, a.y + a.h + 24], [bc.x, b.y]];
}
// The word sits on the last run into the target, where the standard writes it.
const labelAt = pts => { const i = pts.length - 1, [x1, y1] = pts[i - 1], [x2, y2] = pts[i]; if (pts.length >= 4 && Math.abs(x2 - x1) < 2 && Math.abs(y2 - y1) < 30) { const [px, py] = pts[i - 2]; return {lx: (px + x1) / 2, ly: (py + y1) / 2}; } return {lx: (x1 + x2) / 2, ly: (y1 + y2) / 2}; };

export function notationLayout(D, {arrangement = D.scene.arrangement, pins = {}, hub = null, viewW = 0} = {}) {
  let P, G = new Map(), bands = [];
  const style = arrangement === 'radial' ? 'straight' : 'orthogonal';
  if (!D.nodes.length) return {W: 640, H: 320, nodes: [], groups: [], edges: [], bands: [], arrangement, header: {x: NL.LEFT, y: 14, w: 640 - 2 * NL.LEFT, h: 46}};
  if (arrangement === 'radial') P = radial(D, hub);
  else if (arrangement === 'layered') ({P, bands} = layered(D));
  else if (arrangement === 'grouped') ({P, G} = grouped(D, viewW));
  else if (arrangement === 'lanes') ({P, G} = lanes(D));
  else P = treeLike(D, arrangement !== 'orthogonal');
  for (const [id, pin] of Object.entries(pins)) { const p = P.get(id); if (p && Number.isFinite(pin.x) && Number.isFinite(pin.y)) { p.x = Math.round(pin.x); p.y = Math.round(pin.y); p.pinned = true; } }
  const drawGroups = arrangement === 'grouped' || arrangement === 'lanes';
  if (drawGroups) G = enclose(D, P, G);
  const nodes = D.nodes.map(n => ({id: n.id, ...P.get(n.id)}));
  const groups = drawGroups ? D.groups.map(g => ({id: g.id, ...G.get(g.id), title: g.title, kind: g.kind, sub: g.sub, depth: g.parent ? 1 : 0})) : [];
  const obstacles = [...P.values()], lanesBy = new Map();
  const edges = D.edges.map(e => { const a = P.get(e.from), b = P.get(e.to), n = lanesBy.get(e.from) || 0; lanesBy.set(e.from, n + 1); const pts = route(a, b, style, obstacles, n); return {...e, pts, ...labelAt(pts)}; });
  const boxes = [...nodes, ...groups];
  // The header strip needs its width even when the picture is small.
  const W = Math.max(820, Math.ceil(Math.max(...boxes.map(b => b.x + b.w)) + NL.LEFT)), H = Math.max(320, Math.ceil(Math.max(...boxes.map(b => b.y + b.h)) + 40));
  return {W, H, nodes, groups, edges, bands: bands.map(b => ({...b, x: NL.LEFT - 12, w: W - 2 * NL.LEFT + 24})), arrangement, header: {x: NL.LEFT, y: 14, w: W - 2 * NL.LEFT, h: 46}};
}
export const overlaps = (a, b, m = 0) => a.x < b.x + b.w - m && b.x < a.x + a.w - m && a.y < b.y + b.h - m && b.y < a.y + a.h - m;
