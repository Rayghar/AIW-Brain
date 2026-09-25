// Review desk — deterministic layouts. Each view is a grid, so nothing is routed and nothing
// crosses, and no layout reads the selection, the probes or the lens.
//
// Vitals: running parts down a sticky rail, grouped into the parts that do the work and the
// platform beneath them; one column per vital under sticky heads. What it takes: one card per part,
// in bands from the edge inwards (edge, parts, data, platform, outside), three to a row. Trace:
// requirements down the rail, one column per chapter the thread passes through.

export const VX = {RAIL: 232, COL_W: 114, HEAD_H: 80, BAND_H: 30, ROW_H: 60, PAD: 10};
export function vitalsLayout(rows, vitals) {
  const top = VX.HEAD_H + 6, bands = [], out = [];
  let y = top;
  for (const band of ['parts', 'platform']) {
    const rs = rows.filter(r => r.band === band);
    if (!rs.length) continue;
    bands.push({id: band, y, h: VX.BAND_H}); y += VX.BAND_H;
    for (const r of rs) { out.push({id: r.id, y, h: VX.ROW_H, band}); y += VX.ROW_H; }
    y += 8;
  }
  const cols = vitals.map((v, i) => ({id: v.id, x: VX.RAIL + VX.PAD + i * VX.COL_W, w: VX.COL_W}));
  const W = VX.RAIL + VX.PAD * 2 + vitals.length * VX.COL_W, H = Math.max(y + 16, top + 120);
  return {kind: 'vitals', W, H, top: VX.HEAD_H, rail: VX.RAIL, rows: out, bands, cols};
}

export const LX = {RAIL: 160, HEAD: 10, CARD_W: 286, CARD_H: 222, GAP: 12, BGAP: 22, PER: 3, PAD: 12};
export const LOAD_BANDS = [
  {id: 'edge', label: 'Edge', note: 'where every request enters'},
  {id: 'parts', label: 'Services and workers', note: 'in the order work flows'},
  {id: 'data', label: 'Data and messaging', note: 'what the parts keep and hand on'},
  {id: 'platform', label: 'Platform', note: 'what everything runs on'},
  {id: 'outside', label: 'Outside', note: 'what other systems must take'}
];
export function loadLayout(rows) {
  const cards = [], bands = [];
  let y = LX.HEAD + LX.PAD;
  for (const b of LOAD_BANDS) {
    const rs = rows.filter(r => r.band === b.id);
    if (!rs.length) continue;
    const lines = Math.ceil(rs.length / LX.PER), h = lines * LX.CARD_H + (lines - 1) * LX.GAP;
    rs.forEach((r, i) => cards.push({id: r.id, band: b.id, x: LX.RAIL + LX.PAD + (i % LX.PER) * (LX.CARD_W + LX.GAP), y: y + Math.floor(i / LX.PER) * (LX.CARD_H + LX.GAP), w: LX.CARD_W, h: LX.CARD_H}));
    bands.push({...b, y: y - 8, h: h + 16, count: rs.length});
    y += h + LX.BGAP + 16;
  }
  const W = LX.RAIL + LX.PAD * 2 + LX.PER * LX.CARD_W + (LX.PER - 1) * LX.GAP, H = Math.max(y, 300);
  return {kind: 'load', W, H, top: LX.HEAD, rail: LX.RAIL, cards, bands};
}

export const TX = {RAIL: 230, COL_W: 140, HEAD_H: 64, CHIP_H: 21, MAX_CHIPS: 4, PAD: 10, ROW_PAD: 22};
export function traceLayout(trace, cols) {
  const top = TX.HEAD_H + 6, rows = [];
  let y = top;
  for (const t of trace) {
    const n = Math.max(1, ...cols.map(c => Math.min(TX.MAX_CHIPS + 1, t.cells[c.id].length)));
    const h = Math.max(78, TX.ROW_PAD + n * TX.CHIP_H + 10);
    rows.push({id: t.id, y, h}); y += h + 6;
  }
  const cs = cols.map((c, i) => ({id: c.id, x: TX.RAIL + TX.PAD + i * TX.COL_W, w: TX.COL_W}));
  return {kind: 'trace', W: TX.RAIL + TX.PAD * 2 + cols.length * TX.COL_W, H: Math.max(y + 16, top + 120), top: TX.HEAD_H, rail: TX.RAIL, rows, cols: cs};
}
