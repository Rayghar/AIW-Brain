// Application realisation — deterministic layout for the Chapter 5 Model views.
//
// Components: modules are lanes (outside, each module in the anatomy's order, outside), laid out
// by the shared lane engine (lane-layout.js). A card's height follows what it contains — the
// responsibilities it realises — never the lens. Allocation: responsibilities are rows grouped by
// module, components are columns grouped by module. Guarantees are checked in
// realise-validate.mjs; neither layout reads the lens.
import {laneLayout, LANE} from './lane-layout.js';

export const RL = {HEAD_H: 70, CARD_W: 200, LABEL_MAX: 170, HEAD: 42, LINE: 19, LENS: 21, STRIP: 24, PAD: 10, MAX_REAL: 3, MAX_MOD: 4};
export function realiseHead() { return RL.HEAD_H + 12; }

// Lines of realised responsibilities a card shows: at least one ("realises nothing"), at most a
// few with "+ n more".
export function realLines(row) { const n = (row.realises || []).length, max = row.kind === 'module' ? RL.MAX_MOD : RL.MAX_REAL; return Math.max(1, Math.min(max, n)); }
export function cardHeight(row) {
  if (row.kind === 'party' || (row.kind === 'module' && !row.module)) return LANE.CARD_H;
  if (row.kind === 'hole') return RL.HEAD + RL.LINE + RL.LENS + RL.PAD;
  return RL.HEAD + realLines(row) * RL.LINE + RL.LENS + RL.STRIP + RL.PAD;
}

export function realiseLayout(F, {measure = l => 16 + 7 * String(l.label || '').length} = {}) {
  const L = laneLayout(F, {top: realiseHead(), cardW: RL.CARD_W, cardH: (row, ports) => Math.max(cardHeight(row), 22 + ports * LANE.PORT), measure, labelMax: RL.LABEL_MAX, labelInset: 12, labelled: () => true});
  return {kind: 'realise', ...L};
}

// Responsibilities × components.
export const AX = {RAIL: 290, HEAD_H: 118, BAND: 22, COL_W: 112, ROW_H: 56, GROUP_H: 28, REAL_W: 206, WHY_W: 200};
export function allocationHead() { return AX.HEAD_H + 10; }
export function allocationLayout(G) {
  let y = allocationHead() + 6, group = undefined;
  const rows = [], groups = [];
  for (const r of G.rows) { if (r.module !== group) { group = r.module; const g = G.groups.find(x => x.module === group); groups.push({id: 'G:' + group, module: group, title: g?.title || group, y, h: AX.GROUP_H}); y += AX.GROUP_H; } rows.push({id: r.id, resp: r, y, h: AX.ROW_H}); y += AX.ROW_H; }
  const cols = G.cols.map((c, i) => ({id: c.id, col: c, x: AX.RAIL + i * AX.COL_W, w: AX.COL_W}));
  const colGroups = [];
  for (const c of cols) { const last = colGroups.at(-1); if (last && last.module === c.col.module) last.w += c.w; else colGroups.push({module: c.col.module, x: c.x, w: c.w}); }
  const realX = AX.RAIL + cols.length * AX.COL_W + 10, whyX = realX + AX.REAL_W + 6, W = whyX + AX.WHY_W + 16, H = y + 24;
  const R = new Map(rows.map(r => [r.id, r])), K = new Map(cols.map(c => [c.id, c]));
  const cells = G.cells.filter(c => R.has(c.resp) && K.has(c.comp)).map(c => { const r = R.get(c.resp), k = K.get(c.comp); return {...c, x: k.x + k.w / 2, y: r.y + r.h / 2}; });
  return {kind: 'allocation', W, H, top: allocationHead(), rail: AX.RAIL, rows, groups, cols, colGroups, cells, realX, whyX};
}
