// Interfaces & data — deterministic layout for the Chapter 8 Model's Data flow view.
//
// Guarantees (checked by exchange-validate.mjs):
// - Columns come from the folded lanes in their one order (the lifelines of the Diagram's Sequence picture
//   read the same model), so a system keeps its place.
// - Geometry depends on the folded data and the stage width only — never on the lens — so switching
//   lens never moves anything.
// - Every definition owns one row; rows never overlap and read strictly top to bottom.
// Retired (round 11, A): the sequence layout of the chapter's own Sequence view; the Diagram's Sequence picture
// is laid out by notation-layout.js.

export const SEQ = {GUTTER: 52, MOD_H: 26, HEAD_H: 64, MIN_COL: 112, MAX_COL: 236, BAR: 10, LABEL_MAX: 300};
export const DATA = {GUTTER: 184, MIN_COL: 104, MAX_COL: 220, TRACK: 22};

export function headHeight() { return SEQ.MOD_H + SEQ.HEAD_H + 16; }

function columns(lanes, viewW, gutter, min, max) {
  const n = Math.max(1, lanes.length), colW = Math.max(min, Math.min(max, Math.floor((Math.max(viewW, 600) - gutter - 28) / n)));
  const at = new Map(lanes.map((l, i) => [l.id, gutter + colW * (i + 0.5)]));
  return {colW, at, W: gutter + colW * n + 28};
}

// Module brackets over consecutive lanes of the same module; parties group as outside.
function brackets(lanes, at, colW) {
  const out = [];
  for (const l of lanes) {
    const key = l.kind === 'party' ? 'outside' : l.kind === 'module' ? null : l.module || null;
    const last = out.at(-1);
    if (key && last && last.key === key && last.to === lanes.indexOf(l) - 1) { last.to++; last.x2 = at.get(l.id) + colW / 2 - 6; continue; }
    if (key) out.push({key, id: key === 'outside' ? null : key, from: lanes.indexOf(l), to: lanes.indexOf(l), x1: at.get(l.id) - colW / 2 + 6, x2: at.get(l.id) + colW / 2 - 6});
  }
  return out;
}

// One row per data definition: its authority, and each place it travels as its own track.
export function dataLayout(G, {viewW = 1100} = {}) {
  const lanes = G.lanes, {colW, at, W} = columns(lanes, viewW, DATA.GUTTER, DATA.MIN_COL, DATA.MAX_COL);
  const top = headHeight(), rows = [], moves = [], marks = [];
  let y = top + 8;
  for (const r of G.rows) {
    const segs = r.moves.map(m => {
      const xa = at.get(m.a), xb = at.get(m.b), dir = xb >= xa ? 1 : -1;
      return {m, x1: xa + dir * 9, x2: xb - dir * 9, lo: Math.min(xa, xb), hi: Math.max(xa, xb), dir};
    }).sort((a, b) => a.lo - b.lo || a.hi - b.hi);
    const tracks = [];
    for (const s of segs) { let t = tracks.findIndex(end => end < s.lo - 2); if (t < 0) { t = tracks.length; tracks.push(-Infinity); } tracks[t] = s.hi; s.track = t; }
    const h = Math.max(62, 30 + Math.max(1, tracks.length) * DATA.TRACK + 8);
    rows.push({id: r.id, y, h, row: r, tracks: tracks.length});
    const mid = y + h / 2;
    if (r.authority && at.has(r.authority)) marks.push({kind: 'authority', data: r.id, lane: r.authority, x: at.get(r.authority), y: mid});
    const held = new Set();
    for (const s of segs) {
      const ty = y + 22 + s.track * DATA.TRACK + (tracks.length === 1 ? (h - 44) / 2 - 4 : 0);
      moves.push({id: r.id + '|' + s.m.id, data: r.id, move: s.m, contract: s.m.contract, role: s.m.role, x1: s.x1, x2: s.x2, y: ty, dim: s.m.dim, lx: s.lo + 12, lw: Math.max(30, s.hi - s.lo - 24)});
      if (s.m.b !== r.authority && !held.has(s.m.b)) { held.add(s.m.b); marks.push({kind: 'copy', data: r.id, lane: s.m.b, x: at.get(s.m.b), y: ty}); }
      if (s.m.unsourced) marks.push({kind: 'unsourced', data: r.id, lane: s.m.a, x: at.get(s.m.a), y: ty, move: s.m.id});
    }
    if (!r.authority) marks.push({kind: 'orphan', data: r.id, x: DATA.GUTTER + 10, y: mid});
    y += h;
  }
  return {kind: 'data', W, H: y + 26, top, colW, gutter: DATA.GUTTER, lanes: lanes.map(l => ({...l, x: at.get(l.id), w: colW})), mods: brackets(lanes, at, colW), rows, moves, marks};
}

export const boxesOverlap = (a, b, pad = 0) => a.x < b.x + b.w - pad && b.x < a.x + a.w - pad && a.y < b.y + b.h - pad && b.y < a.y + a.h - pad;
