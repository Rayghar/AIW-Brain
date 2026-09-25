// Logical technology — deterministic layout for the Chapter 6 Model views.
//
// The platform stack: capabilities are rows (grouped by family), the components that stand on
// them are columns (grouped by module), and each need is a cell where the two meet. Contiguous
// cells in a row join into a plate, so shared support reads as one piece of skeleton. Dependencies
// between capabilities run as brackets in their own gutter beside the rail, on levels that never
// overlap. The same geometry serves "what fails together". Guarantees are checked in
// platform-validate.mjs; the layout never reads the lens or the failure explored.

export const PX = {RAIL: 290, HEAD_H: 118, BAND: 22, COL_W: 112, MCOL_W: 88, ROW_H: 62, GROUP_H: 26, GUT: 18, LEVEL: 10, FAIL_W: 214};
export function platformHead() { return PX.HEAD_H + 10; }

export function platformLayout(F) {
  let y = platformHead() + 6, fam;
  const rows = [], groups = [];
  for (const r of F.rows) { if (r.family !== fam) { fam = r.family; const g = F.groups.find(x => x.family === fam); groups.push({family: fam, title: g?.title || fam, y, h: PX.GROUP_H}); y += PX.GROUP_H; } rows.push({id: r.id, row: r, y, h: PX.ROW_H, cy: y + PX.ROW_H / 2}); y += PX.ROW_H; }
  const H = y + 24, R = new Map(rows.map(r => [r.id, r]));
  // Dependency brackets on levels: shorter spans nearer the rail, so nested brackets never cross.
  const spans = F.deps.map(d => { const a = R.get(d.from), b = R.get(d.to); return {dep: d, ya: a.cy, yb: b.cy, lo: Math.min(a.cy, b.cy), hi: Math.max(a.cy, b.cy)}; })
    .sort((p, q) => (p.hi - p.lo) - (q.hi - q.lo) || p.lo - q.lo || (p.dep.id < q.dep.id ? -1 : 1));
  const levels = [];
  for (const s of spans) { let i = levels.findIndex(iv => iv.every(([a, b]) => s.hi < a - 4 || s.lo > b + 4)); if (i < 0) { i = levels.length; levels.push([]); } levels[i].push([s.lo, s.hi]); s.level = i; }
  const gutter = PX.GUT + levels.length * PX.LEVEL;
  const colW = F.depth === 'modules' ? PX.MCOL_W : PX.COL_W, x0 = PX.RAIL + gutter + 8;
  const cols = F.cols.map((c, i) => ({id: c.id, col: c, x: x0 + i * colW, w: colW, cx: x0 + i * colW + colW / 2}));
  const colGroups = [];
  for (const c of cols) { const last = colGroups.at(-1); if (last && last.module === c.col.module) last.w += c.w; else colGroups.push({module: c.col.module, x: c.x, w: c.w}); }
  const K = new Map(cols.map(c => [c.id, c]));
  const cells = F.cells.filter(c => R.has(c.row) && K.has(c.col)).map(c => ({...c, x: K.get(c.col).cx, y: R.get(c.row).cy}));
  // Plates: runs of neighbouring columns that stand on the same capability.
  const plates = [];
  for (const r of rows) {
    const ix = cols.map((c, i) => (cells.some(x => x.row === r.id && x.col === c.id) ? i : -1)).filter(i => i >= 0);
    let start = null, prev = null;
    for (const i of [...ix, Infinity]) { if (start === null) { start = prev = i; continue; } if (i === prev + 1) { prev = i; continue; } if (Number.isFinite(start)) plates.push({row: r.id, x: cols[start].x + 8, w: (prev - start + 1) * colW - 16, y: r.y + 14, h: r.h - 28}); start = prev = i; }
  }
  const arcs = spans.map(s => ({id: s.dep.id, dep: s.dep, level: s.level, x: PX.RAIL + PX.GUT / 2 + s.level * PX.LEVEL, xa: PX.RAIL + 2, ya: s.ya, yb: s.yb}));
  const failX = x0 + cols.length * colW + 10, W = failX + PX.FAIL_W + 16;
  return {kind: 'platform', W, H, top: platformHead(), rail: PX.RAIL, x0, colW, rows, groups, cols, colGroups, cells, plates, arcs, levels: levels.length, failX};
}
