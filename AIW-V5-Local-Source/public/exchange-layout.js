// Interfaces & data — deterministic layout for the Chapter 8 Model views.
//
// Guarantees (checked by exchange-validate.mjs):
// - Lifelines (sequence) and columns (data) come from the same folded lanes in the same order,
//   so switching view keeps every system in the same place.
// - Geometry depends on the folded scenario or data and the stage width only — never on the
//   lens — so switching lens never moves anything.
// - Every event owns one row; rows never overlap and read strictly top to bottom.
// - Every label sits inside its own row and inside the span of its message.

export const SEQ = {GUTTER: 52, MOD_H: 26, HEAD_H: 64, MIN_COL: 112, MAX_COL: 236, BAR: 10, LABEL_MAX: 300};
export const DATA = {GUTTER: 184, MIN_COL: 104, MAX_COL: 220, TRACK: 22};
const ROW = {start: 34, step: 38, guard: 30, call: 60, return: 42, self: 52, gap: 56, enter: 36, end: 46, note: 32, more: 32, recover: 104};

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

// A message label is centred on its message. Each row holds one message, so a label may run
// wider than a short message, but it always stays inside its own row and inside the diagram.
const defaultMeasure = e => 16 + 7 * String(e.label || '').length + (e.contract ? 48 : 0);
function place(lo, hi, want, W, gutter) {
  const span = hi - lo - 12, lw = Math.max(40, span, Math.min(SEQ.LABEL_MAX, want));
  return {lw, lx: Math.max(gutter + 4, Math.min(W - 8 - lw, (lo + hi) / 2 - lw / 2))};
}
export function sequenceLayout(F, {viewW = 1100, measure = defaultMeasure} = {}) {
  const lanes = F.lanes, {colW, at, W} = columns(lanes, viewW, SEQ.GUTTER, SEQ.MIN_COL, SEQ.MAX_COL);
  const top = headHeight(), rows = [], msgs = [], bars = [], frames = [], marks = [], steps = [];
  const open = new Map(lanes.map(l => [l.id, []]));
  const depthOf = id => Math.max(0, (open.get(id) || []).length - 1);
  const edge = (id, dir) => (at.get(id) ?? 0) + dir * SEQ.BAR / 2 + depthOf(id) * 4;
  const openBar = (id, y, ev) => { if (!open.has(id)) open.set(id, []); open.get(id).push({y, ev}); };
  const closeBar = (id, y) => { const s = open.get(id); if (!s?.length) return; const b = s.pop(); bars.push({lane: id, x: (at.get(id) ?? 0) - SEQ.BAR / 2 + s.length * 4, y1: b.y, y2: Math.max(y, b.y + 14), depth: s.length, ev: b.ev}); };
  let y = top + 8, step = null;
  const calls = new Map();
  for (const e of F.events) {
    const h = e.t === 'recover' ? ROW.recover : ROW[e.t] || 30, row = {id: e.id, t: e.t, y, h};
    rows.push(row);
    if (e.t === 'step') { if (step) step.y2 = y; step = {id: e.ref, ev: e.id, n: e.n, title: e.title, owner: e.owner, lane: e.lane, y1: y, y2: null}; steps.push(step); marks.push({kind: 'step', ev: e.id, x: at.get(e.lane) ?? null, y: y + 8}); }
    else if (e.t === 'start') marks.push({kind: 'start', ev: e.id, x: at.get(F.events.find(x => x.t === 'call')?.a) ?? SEQ.GUTTER + colW / 2, y: y + 17, title: e.title});
    else if (e.t === 'guard') marks.push({kind: 'guard', ev: e.id, x: at.get(e.lane) ?? null, y: y + 15, title: e.title, label: e.label});
    else if (e.t === 'end' || e.t === 'note') marks.push({kind: e.t, ev: e.id, x: at.get(e.lane) ?? SEQ.GUTTER + 20, y: y + 22, lane: e.lane, outcome: e.outcome, title: e.title});
    else if (e.t === 'more') marks.push({kind: 'more', ev: e.id, x: SEQ.GUTTER + 12, y: y + 16, count: e.count});
    else if (e.t === 'enter') { openBar(e.lane, y + 18, e.id); marks.push({kind: 'enter', ev: e.id, x: at.get(e.lane), y: y + 18}); }
    else if (e.t === 'call' || e.t === 'gap') {
      const ay = y + 36, dir = (at.get(e.b) ?? 0) >= (at.get(e.a) ?? 0) ? 1 : -1;
      if (e.t === 'call' && !(open.get(e.a) || []).length) { if (e.async) bars.push({lane: e.a, x: (at.get(e.a) ?? 0) - SEQ.BAR / 2, y1: ay - 6, y2: ay + 10, depth: 0, ev: e.id, async: true}); else openBar(e.a, ay - 4, 'init:' + e.id); }
      const x1 = edge(e.a, dir);
      if (e.t === 'call') { if (!e.async) openBar(e.b, ay, e.id); else bars.push({lane: e.b, x: (at.get(e.b) ?? 0) - SEQ.BAR / 2 + ((open.get(e.b) || []).length) * 4, y1: ay, y2: ay + 18, depth: (open.get(e.b) || []).length, ev: e.id, async: true}); }
      const x2 = e.t === 'call' && !e.async ? (at.get(e.b) ?? 0) - dir * SEQ.BAR / 2 + depthOf(e.b) * 4 : (at.get(e.b) ?? 0) - dir * SEQ.BAR / 2;
      const lo = Math.min(x1, x2), hi = Math.max(x1, x2), {lx, lw} = place(lo, hi, e.t === 'gap' ? 250 : measure(e), W, SEQ.GUTTER);
      const m = {id: e.id, ev: e, kind: e.t === 'gap' ? 'gap' : e.async ? 'async' : 'call', x1, x2, y: ay, dir, lx, lw, ly: y + 12, ay: ay + 6};
      msgs.push(m); calls.set(e.id, m);
    } else if (e.t === 'return') {
      const ay = y + 26, dir = (at.get(e.b) ?? 0) >= (at.get(e.a) ?? 0) ? 1 : -1;
      const x1 = edge(e.a, dir);
      closeBar(e.a, ay);
      const x2 = (at.get(e.b) ?? 0) - dir * SEQ.BAR / 2 + depthOf(e.b) * 4, lo = Math.min(x1, x2), hi = Math.max(x1, x2), {lx, lw} = place(lo, hi, e.lost ? 150 : measure(e), W, SEQ.GUTTER);
      msgs.push({id: e.id, ev: e, kind: e.lost ? 'lost' : 'return', x1, x2: e.lost ? x1 + dir * Math.max(40, (hi - lo) * 0.45) : x2, y: ay, dir, lx, lw, ly: y + 6, of: e.of});
      if ((open.get(e.b) || []).at(-1)?.ev === 'init:' + e.of) closeBar(e.b, ay + 6);
    } else if (e.t === 'self') {
      const x = (at.get(e.lane) ?? 0) + SEQ.BAR / 2 + depthOf(e.lane) * 4;
      msgs.push({id: e.id, ev: e, kind: 'self', x1: x, x2: x, y: y + 14, y2: y + 38, lx: x + 30, lw: Math.max(60, Math.min(260, W - 8 - (x + 30))), ly: y + 12});
    } else if (e.t === 'recover') {
      const xa = at.get(e.a) ?? 0, xb = at.get(e.b) ?? 0, x1 = Math.min(xa, xb) - colW * 0.46, x2 = Math.max(xa, xb) + colW * 0.46;
      frames.push({id: e.id, ev: e, x: Math.max(SEQ.GUTTER + 4, x1), y: y + 6, w: Math.min(W - 12, x2) - Math.max(SEQ.GUTTER + 4, x1), h: ROW.recover - 14});
    }
    y += h;
  }
  if (step) step.y2 = y;
  for (const [id, s] of open) while (s.length) closeBar(id, y - 6);
  const H = y + 26;
  return {kind: 'sequence', W, H, top, colW, gutter: SEQ.GUTTER, lanes: lanes.map(l => ({...l, x: at.get(l.id), w: colW})), mods: brackets(lanes, at, colW), rows, msgs, bars, frames, marks, steps};
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
