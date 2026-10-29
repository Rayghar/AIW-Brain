// Logical application — deterministic layout for the Chapter 4 Model views.
//
// Responsibilities: the journey's steps are the lanes (read left to right), each responsibility
// group is a band of rows (read top to bottom), and the logical flows are routed by the shared
// lane engine. Coverage: the reasons are rows, grouped by the chapter that records them; the
// responsibilities are columns, grouped by their group. Guarantees are checked in
// responsibility-validate.mjs; neither layout reads the lens.
import {laneLayout, LANE} from './lane-layout.js';

export const RX = {RAIL: 176, HEAD_H: 74, CARD_W: 204, CELL_W: 188, CARD_H: 112, HEAD: 40, LINE: 18, STRIP: 24, LABEL_MAX: 180};
export function mapHead() { return RX.HEAD_H + 10; }
// Every card carries the same parts — a head, two lens lines and the strip of what realises it.
export function cardHeight() { return RX.CARD_H; }

export function responsibilityLayout(F, {measure} = {}) {
  const L = laneLayout(F, {top: mapHead(), left: RX.RAIL + 12, cardW: F.depth === 'groups' ? RX.CELL_W : RX.CARD_W, cardH: (row, ports) => Math.max(cardHeight(row), 22 + ports * LANE.PORT), labelMax: RX.LABEL_MAX, labelInset: 12, measure, band: r => r.band});
  // Each band spans its rows, from the first card to the last, and the gaps around them.
  const bands = [];
  for (const id of F.bands) {
    const cs = L.cards.filter(c => c.row.band === id);
    if (!cs.length) continue;
    const y1 = Math.min(...cs.map(c => c.y)) - LANE.ROW_GAP / 2 + 1, y2 = Math.max(...cs.map(c => c.y + c.h)) + LANE.ROW_GAP / 2 - 1;
    bands.push({id, y: y1, h: y2 - y1});
  }
  return {kind: 'map', ...L, rail: RX.RAIL, bands};
}

// Coverage: reasons × responsibilities, with what covers each reason at the right.
export const CX = {RAIL: 300, HEAD_H: 132, BAND: 22, COL_W: 84, ROW_H: 44, GROUP_H: 26, SUM_W: 250};
export function coverageHead() { return CX.HEAD_H + 10; }
export function coverageLayout(G) {
  let y = coverageHead() + 6, grp;
  const rows = [], groups = [];
  for (const r of G.rows) {
    if (r.group !== grp) { grp = r.group; const g = G.groups.find(x => x.group === grp); groups.push({group: grp, title: g?.title || grp, y, h: CX.GROUP_H}); y += CX.GROUP_H; }
    rows.push({id: r.id, row: r, y, h: CX.ROW_H}); y += CX.ROW_H;
  }
  const x0 = CX.RAIL + 10;
  const cols = G.cols.map((c, i) => ({id: c.id, col: c, x: x0 + i * CX.COL_W, w: CX.COL_W}));
  const colGroups = [];
  for (const c of cols) { const last = colGroups.at(-1); if (last && last.group === c.col.group) last.w += c.w; else colGroups.push({group: c.col.group, x: c.x, w: c.w}); }
  const K = new Map(cols.map(c => [c.id, c])), R = new Map(rows.map(r => [r.id, r]));
  const cells = G.cells.filter(c => K.has(c.col) && R.has(c.row)).map(c => { const k = K.get(c.col), r = R.get(c.row); return {...c, x: k.x + k.w / 2, y: r.y + r.h / 2}; });
  const sumX = x0 + cols.length * CX.COL_W + 12;
  const W = sumX + CX.SUM_W + 16, H = y + 24;
  return {kind: 'coverage', W, H, top: coverageHead(), rail: CX.RAIL, x0, rows, groups, cols, colGroups, cells, sumX};
}
