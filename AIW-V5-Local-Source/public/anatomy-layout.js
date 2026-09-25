// Design anatomy — deterministic smart layout.
//
// Rules this layout guarantees (and anatomy-validate.mjs checks):
// - Columns are the organising parts of the current scope. Their order and width depend on the
//   model and the viewport only, never on the lens, so switching lenses never moves an object.
// - Each band is one realization level. Items are stacked inside their column and never overlap.
// - A responsibility sits above the component that realizes it; a component stands on the
//   capability lanes it needs; products sit under their capability; runtime under both.
// - A shared capability is one lane spanning every column that uses it. Nothing is copied.
// - Interactions are routed orthogonally through column gutters and a corridor band, so no
//   route passes through a card.
import {STRATA, TYPE_CHAPTER} from './anatomy-model.js';

export const LABEL_W = 156;   // band-label column on the left of the world
export const GAP = 26;        // gutter between columns; vertical routes run here
const PAD = 12, HEAD_H = 58, TRACK = 8;

const shownAt = (chapter, type) => chapter >= (TYPE_CHAPTER[type] || 1);

// ---------------------------------------------------------------- smart ordering

// Minimum-linear-arrangement heuristic: keep strongly connected parts next to each other and
// let work read left to right. Deterministic; ties keep the recorded order.
export function smartOrder(ids, weight, direction, {fixed = null, iterations = 10, anchors = null} = {}) {
  const n = ids.length;
  if (n < 3 && !fixed) return orient(ids.slice(), direction);
  const idx = new Map(ids.map((id, i) => [id, i]));
  const pairs = [];
  for (const [k, w] of weight) { const [a, b] = k.split('|'); if (idx.has(a) && idx.has(b) && a !== b) pairs.push([a, b, w]); }
  const dirs = [];
  for (const [k, w] of direction) { const [a, b] = k.split('|'); if (idx.has(a) && idx.has(b) && a !== b) dirs.push([a, b, w]); }
  const cost = order => {
    const pos = new Map(order.map((id, i) => [id, i]));
    let c = 0;
    for (const [a, b, w] of pairs) c += w * Math.abs(pos.get(a) - pos.get(b));
    for (const [a, b, w] of dirs) if (pos.get(a) > pos.get(b)) c += w * 0.8;
    // Where work enters from outside, read it from the left; where it leaves, to the right.
    if (anchors) for (const [id, a] of anchors) if (pos.has(id)) c += (a.left || 0) * (pos.get(id) + 1) + (a.right || 0) * (order.length - pos.get(id));
    return c;
  };
  if (fixed) {
    // Keep the architect's arrangement; place new parts where they fit best.
    let order = fixed.filter(id => idx.has(id));
    for (const id of ids) if (!order.includes(id)) {
      let best = null, bestC = Infinity;
      for (let i = 0; i <= order.length; i++) { const t = [...order.slice(0, i), id, ...order.slice(i)], c = cost(t); if (c < bestC - 1e-9) { bestC = c; best = t; } }
      order = best || [...order, id];
    }
    return order;
  }
  let order = ids.slice(), best = cost(order);
  for (let it = 0; it < iterations; it++) {
    let improved = false;
    for (let i = 0; i < n; i++) {
      const id = order[i], rest = order.filter(x => x !== id);
      for (let j = 0; j <= rest.length; j++) {
        if (j === i) continue;
        const t = [...rest.slice(0, j), id, ...rest.slice(j)], c = cost(t);
        if (c < best - 1e-9) { best = c; order = t; improved = true; break; }
      }
    }
    if (!improved) break;
  }
  return order;
}
function orient(order, direction) {
  if (order.length !== 2) return order;
  const [a, b] = order, ab = direction.get(a + '|' + b) || 0, ba = direction.get(b + '|' + a) || 0;
  return ba > ab ? [b, a] : order;
}
const addW = (m, a, b, w) => { if (!a || !b || a === b) return; const k = a < b ? a + '|' + b : b + '|' + a; m.set(k, (m.get(k) || 0) + w); };
const addD = (m, a, b, w) => { if (!a || !b || a === b) return; const k = a + '|' + b; m.set(k, (m.get(k) || 0) + w); };

export function moduleOrder(M, fixed = null) {
  const w = new Map(), d = new Map(), mod = id => M.mod.get(id);
  for (const f of M.flows) { addW(w, mod(f.from), mod(f.to), 3); addD(d, mod(f.from), mod(f.to), 1); }
  for (const f of M.lflows) { addW(w, mod(f.from), mod(f.to), 2); addD(d, mod(f.from), mod(f.to), 0.5); }
  for (const [r, cs] of M.realizedBy) for (const c of cs) addW(w, mod(r), mod(c), 2);
  for (const [, users] of M.capUsers) { const ms = [...new Set(users.map(mod).filter(Boolean))]; if (ms.length > 4) continue; for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) addW(w, ms[i], ms[j], 0.25); }
  // Parties pull the modules they talk to towards the edge they will sit on: parties that only
  // start work pull left, parties that only receive it pull right.
  const anchors = new Map(), anchor = (id, k, v) => { if (!id) return; const a = anchors.get(id) || {}; a[k] = (a[k] || 0) + v; anchors.set(id, a); };
  for (const p of M.parties) {
    const out = M.flows.filter(f => f.from === p.id), inn = M.flows.filter(f => f.to === p.id);
    if (out.length && !inn.length) for (const f of out) anchor(mod(f.to), 'left', 3);
    if (inn.length && !out.length) for (const f of inn) anchor(mod(f.from), 'right', 1);
  }
  return smartOrder(M.modules.map(m => m.id), w, d, {fixed, anchors});
}

// Components inside one module: partners on the left pull a component left.
export function componentOrder(M, comps, colPos, fixed = null) {
  const w = new Map(), d = new Map(), set = new Set(comps);
  for (const f of M.flows) if (set.has(f.from) && set.has(f.to)) { addW(w, f.from, f.to, 3); addD(d, f.from, f.to, 1); }
  let order = smartOrder(comps, w, d, {fixed});
  if (!fixed && colPos) {
    const bary = id => { const ps = M.flows.filter(f => f.from === id || f.to === id).map(f => colPos(f.from === id ? f.to : f.from)).filter(v => v !== null && v !== undefined); return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null; };
    const inner = M.flows.filter(f => set.has(f.from) && set.has(f.to)).length;
    if (!inner) order = order.map((id, i) => ({id, i, b: bary(id)})).sort((a, b) => (a.b ?? a.i) - (b.b ?? b.i) || a.i - b.i).map(x => x.id);
  }
  return order;
}

// ---------------------------------------------------------------- scope resolution

// Any selected object can be dissected; resolve it to the part that anchors the view.
export function resolveScope(M, scope) {
  if (!scope || scope.kind === 'system' || !scope.id) return {kind: 'system'};
  const id = scope.id, t = M.T(id);
  if (scope.kind === 'module' || t === 'module') return M.byId.has(id) && t === 'module' ? {kind: 'module', id} : {kind: 'system'};
  if (t === 'component') return {kind: 'part', id, partType: 'component'};
  if (t === 'capability') return {kind: 'part', id, partType: 'capability'};
  if (t === 'responsibility') { const c = (M.realizedBy.get(id) || [])[0]; return c ? {kind: 'part', id: c, partType: 'component', focus: id} : (M.mod.get(id) ? {kind: 'module', id: M.mod.get(id), focus: id} : {kind: 'system'}); }
  if (t === 'technology') { const c = M.capOf.get(id); return c ? {kind: 'part', id: c, partType: 'capability', focus: id} : {kind: 'system'}; }
  if (t === 'runtime') { const a = M.byId.get(id)?.asset; return a ? resolveScope(M, {kind: 'part', id: a}) : {kind: 'system'}; }
  if (t === 'instance') { const plan = M.I('placedAs', id)[0]; return plan ? resolveScope(M, {kind: 'part', id: plan}) : {kind: 'system'}; }
  if (t === 'data') { const o = M.owner.get(id); return o && M.T(o) === 'component' ? {kind: 'part', id: o, partType: 'component', focus: id} : {kind: 'system'}; }
  if (t === 'contract') { const p = M.I('provides', id).find(x => M.T(x) === 'component') || M.I('uses', id).find(x => M.T(x) === 'component'); return p ? {kind: 'part', id: p, partType: 'component', focus: id} : {kind: 'system'}; }
  return {kind: 'system'};
}

// ---------------------------------------------------------------- columns

function systemColumns(M, S) {
  if (S.chapter < 4) return [{id: 'BRIEF', kind: 'brief', title: 'The brief', sub: 'Needs, qualities and decisions before any structure'}];
  const order = moduleOrder(M, S.order?.system || null), pos = new Map(order.map((id, i) => [id, i]));
  const mid = (order.length - 1) / 2, L = [], R = [];
  for (const p of M.parties) {
    const partners = M.flows.filter(f => f.from === p.id || f.to === p.id).map(f => pos.get(M.mod.get(f.from === p.id ? f.to : f.from))).filter(v => v !== undefined);
    const b = partners.length ? partners.reduce((a, c) => a + c, 0) / partners.length : order.length;
    (b <= mid ? L : R).push({id: p.id, b});
  }
  L.sort((a, b) => a.b - b.b); R.sort((a, b) => a.b - b.b);
  const cols = [];
  if (L.length) cols.push({id: 'EXT-L', kind: 'ext', side: 'L', title: 'Outside the system', parties: L.map(x => x.id)});
  for (const id of order) {
    const m = M.byId.get(id);
    const comps = M.comp.filter(c => M.mod.get(c.id) === id).map(c => c.id);
    const colPos = x => (M.T(x) === 'party' ? (L.some(p => p.id === x) ? -1 : order.length) : pos.get(M.mod.get(x)) ?? null);
    const corder = componentOrder(M, comps, colPos, S.order?.['comp:' + id] || null);
    cols.push({id, kind: 'module', title: m.title, sub: m.description, moduleId: id, comps: corder, resps: orderResps(M, M.resp.filter(r => M.mod.get(r.id) === id).map(r => r.id), corder)});
  }
  if (R.length) cols.push({id: 'EXT-R', kind: 'ext', side: 'R', title: 'Outside the system', parties: R.map(x => x.id)});
  return cols;
}
function orderResps(M, resps, compOrder) {
  const rank = r => { const cs = M.realizedBy.get(r) || []; const i = Math.min(...cs.map(c => compOrder.indexOf(c)).filter(i => i >= 0)); return Number.isFinite(i) ? i : 1e6; };
  return resps.map((r, i) => ({r, i, k: rank(r)})).sort((a, b) => a.k - b.k || a.i - b.i).map(x => x.r);
}

function moduleColumns(M, S, sc) {
  const mid = sc.id, m = M.byId.get(mid), cols = [];
  const resps = M.resp.filter(r => M.mod.get(r.id) === mid).map(r => r.id);
  const own = M.comp.filter(c => M.mod.get(c.id) === mid).map(c => c.id);
  const borrowed = [...new Set(resps.flatMap(r => M.realizedBy.get(r) || []))].filter(c => !own.includes(c));
  const comps = [...own, ...borrowed];
  const set = new Set(comps);
  const sysOrder = moduleOrder(M, S.order?.system || null), sysPos = new Map(sysOrder.map((id, i) => [id, i])), here = sysPos.get(mid);
  const side = x => { if (M.T(x) === 'party') { const f = M.flows.find(f => (f.from === x && set.has(f.to)) || (f.to === x && set.has(f.from))); return f && f.from === x ? 'L' : 'R'; } const p = sysPos.get(M.mod.get(x)); return p === undefined ? 'R' : p < here ? 'L' : p > here ? 'R' : (M.flows.some(f => f.from === x && set.has(f.to)) ? 'L' : 'R'); };
  const partners = [...new Set(M.flows.filter(f => set.has(f.from) !== set.has(f.to)).map(f => (set.has(f.from) ? f.to : f.from)))];
  const left = partners.filter(x => side(x) === 'L'), right = partners.filter(x => side(x) === 'R');
  const colPos = x => (left.includes(x) ? -1 : right.includes(x) ? comps.length : null);
  if (left.length) cols.push({id: 'CTX-L', kind: 'ctx', side: 'L', title: 'Calls into ' + m.title, partners: left});
  if (S.chapter < 5 || !comps.length) {
    for (const r of resps) cols.push({id: 'R:' + r, kind: 'resp', title: M.byId.get(r).title, sub: M.byId.get(r).ref, respId: r, resps: [r], comps: []});
  } else {
    const order = componentOrder(M, comps, colPos, S.order?.['comp:' + mid] || null), placed = new Set();
    for (const c of order) {
      const rs = orderResps(M, (M.realizes.get(c) || []).filter(r => !placed.has(r)), order);
      rs.forEach(r => placed.add(r));
      const o = M.byId.get(c);
      cols.push({id: 'C:' + c, kind: 'component', title: o.title, sub: o.ref + (borrowed.includes(c) ? ' · from ' + (M.byId.get(M.mod.get(c))?.title || 'another module') : ''), compId: c, comps: [c], resps: rs});
    }
    const loose = resps.filter(r => !placed.has(r));
    if (loose.length) cols.push({id: 'UNREALIZED', kind: 'unrealized', title: 'Not yet realized', sub: loose.length + ' responsibilit' + (loose.length === 1 ? 'y' : 'ies'), comps: [], resps: loose});
  }
  if (right.length) cols.push({id: 'CTX-R', kind: 'ctx', side: 'R', title: 'Called by ' + m.title, partners: right});
  return cols;
}

function partColumns(M, S, sc) {
  const cols = [];
  if (sc.partType === 'capability') {
    const users = M.capUsers.get(sc.id) || [];
    const sysOrder = moduleOrder(M, S.order?.system || null);
    const sorted = users.slice().sort((a, b) => sysOrder.indexOf(M.mod.get(a)) - sysOrder.indexOf(M.mod.get(b)));
    for (const c of sorted) { const o = M.byId.get(c); cols.push({id: 'C:' + c, kind: 'component', title: o.title, sub: M.byId.get(M.mod.get(c))?.title || '', compId: c, comps: [c], resps: M.realizes.get(c) || []}); }
    if (!cols.length) cols.push({id: 'NOUSER', kind: 'unrealized', title: 'No component stands on it yet', sub: '', comps: [], resps: []});
    return cols;
  }
  const c = sc.id, callers = [...new Set(M.flows.filter(f => f.to === c).map(f => f.from))], callees = [...new Set(M.flows.filter(f => f.from === c).map(f => f.to))].filter(x => !callers.includes(x));
  if (callers.length) cols.push({id: 'CTX-L', kind: 'ctx', side: 'L', title: 'Calls in', partners: callers});
  const o = M.byId.get(c);
  cols.push({id: 'C:' + c, kind: 'subject', title: o.title, sub: o.ref + ' · ' + (M.byId.get(M.mod.get(c))?.title || ''), compId: c, comps: [c], resps: M.realizes.get(c) || []});
  if (callees.length) cols.push({id: 'CTX-R', kind: 'ctx', side: 'R', title: 'Calls out', partners: callees});
  return cols;
}

// ---------------------------------------------------------------- sizing helpers

const chipW = t => Math.min(190, 20 + String(t).length * 6.1);
function chipRows(labels, w) {
  if (!labels.length) return 0;
  let rows = 1, x = 0; const max = Math.max(60, w - 18);
  for (const l of labels) { const cw = Math.min(max, chipW(l)); if (x && x + cw > max) { rows++; x = 0; } x += cw + 4; }
  return rows;
}
function cardHeight(kind, detail, extra = {}) {
  const w = extra.w || 200;
  switch (kind) {
    case 'intent': return detail === 'full' ? 34 : detail === 'compact' ? 22 : 26;
    case 'resp': return detail === 'compact' ? 24 : detail === 'full' ? 66 : extra.narrow ? 38 : 46;
    case 'party': return detail === 'compact' ? 24 : extra.narrow ? 38 : 42;
    case 'comp': {
      if (detail === 'compact') return 26;
      const chips = chipRows(extra.chips || [], w) * 20, data = chipRows(extra.data || [], w) * 20;
      if (detail === 'full') return 74 + chips + data + chipRows(extra.provides || [], w) * 20 + chipRows(extra.uses || [], w) * 20 + (extra.provides?.length ? 16 : 0) + (extra.uses?.length ? 16 : 0) + (extra.chips?.length ? 16 : 0) + (extra.data?.length ? 16 : 0);
      return (extra.narrow ? 38 : 46) + chips + data + (chips || data ? 4 : 0);
    }
    case 'run': return detail === 'compact' ? 24 : detail === 'full' ? 60 : 46;
    case 'socket': return detail === 'compact' ? 24 : extra.narrow ? 46 : 38;
    case 'lane': return detail === 'compact' ? 18 : detail === 'full' ? 38 : 24;
    default: return 30;
  }
}

// ---------------------------------------------------------------- the layout

export function anatomyLayout(M, S) {
  const chapter = S.chapter || 11, sc = resolveScope(M, S.scope), viewW = Math.max(700, S.viewW || 1200);
  const shown = t => shownAt(chapter, t);
  const cols = sc.kind === 'system' ? systemColumns(M, S) : sc.kind === 'module' ? moduleColumns(M, S, sc) : partColumns(M, S, sc);
  // Column widths depend on scope and viewport only.
  const nMain = cols.filter(c => !['ext', 'ctx'].includes(c.kind)).length, nSide = cols.length - nMain;
  const avail = viewW - LABEL_W - 24 - GAP * (cols.length - 1);
  let mainW, sideW;
  if (sc.kind === 'system') {
    sideW = 158; mainW = (avail - nSide * sideW) / Math.max(1, nMain);
    if (mainW < 190 && nSide) { sideW = 124; mainW = (avail - nSide * sideW) / Math.max(1, nMain); }
    mainW = cols[0]?.kind === 'brief' ? Math.max(720, avail) : Math.max(150, Math.min(330, mainW));
  }
  else if (sc.kind === 'module') { sideW = 170; mainW = Math.max(200, Math.min(430, (avail - nSide * sideW) / Math.max(1, nMain))); }
  else if (sc.partType === 'capability') { sideW = 170; mainW = Math.max(170, Math.min(300, avail / Math.max(1, nMain))); }
  else { sideW = 184; mainW = Math.max(420, Math.min(780, avail - nSide * sideW)); }
  let x = LABEL_W + 12;
  cols.forEach((c, i) => { c.index = i; c.w = ['ext', 'ctx'].includes(c.kind) ? sideW : mainW; c.x = x; x += c.w + GAP; });
  const W = x - GAP + 24, colIndex = new Map(cols.map(c => [c.id, c.index]));
  const colOf = new Map();
  for (const c of cols) { for (const id of c.comps || []) colOf.set(id, c.index); for (const id of c.resps || []) if (!colOf.has(id)) colOf.set(id, c.index); for (const id of c.parties || c.partners || []) colOf.set(id, c.index); }
  const items = [], byObj = new Map(), bands = [];
  const add = it => { items.push(it); if (it.obj && !byObj.has(it.obj)) byObj.set(it.obj, it); return it; };
  const next = STRATA.filter(s => s.ch > chapter).sort((a, b) => a.ch - b.ch)[0]?.id || null;
  const partMode = sc.kind === 'part';
  const mode = s => {
    if (chapter < s.ch) return s.id === next ? 'next' : 'future';
    if (S.peel === s.id) return 'open';
    // Across the whole system the reasons are summarised per module until the Intent layer is opened.
    if (s.id === 'intent' && sc.kind === 'system' && chapter >= 4) return 'summary';
    if (S.peel) return 'compact';
    return 'normal';
  };
  const detailFor = (md, col) => (md === 'compact' ? 'compact' : md === 'open' || col.kind === 'subject' ? 'full' : 'normal');
  // Stack cards inside a column; wide columns take two or three per row.
  const stack = (col, top, defs) => {
    const inner = col.w - 16, single = defs.some(d => d.kind === 'comp' && col.kind === 'subject') || defs.some(d => d.kind === 'run' && col.kind === 'subject');
    const per = single ? 1 : col.kind === 'brief' ? Math.max(1, Math.floor(inner / 250)) : inner >= 900 ? 3 : inner >= 460 ? 2 : 1, cw = (inner - (per - 1) * 8) / per;
    let y = top, rowH = 0, k = 0;
    for (const d of defs) {
      const h = d.h ?? cardHeight(d.kind, d.detail, {w: cw, narrow: col.w < 175, ...d});
      add({...d, x: col.x + 8 + (k % per) * (cw + 8), y, w: cw, h, col: col.index});
      rowH = Math.max(rowH, h); k++;
      if (k % per === 0) { y += rowH + 8; rowH = 0; }
    }
    if (k % per) y += rowH + 8;
    return y - top;
  };
  let y = 8;
  for (const c of cols) add({kind: 'head', id: 'H:' + c.id, col: c.index, colId: c.id, colKind: c.kind, title: c.title, sub: c.sub, moduleId: c.moduleId, compId: c.compId, x: c.x, y, w: c.w, h: HEAD_H});
  y += HEAD_H + 10;
  // Capability lanes for this scope (computed once; reused by product and runtime bands).
  const lanes = capabilityLanes(M, cols, colOf, sc, chapter);
  let corridor = null;
  const flowsFor = () => {
    if (chapter < 4) return [];
    if (chapter < 5) return M.lflows.filter(f => colOf.has(f.from) && colOf.has(f.to));
    return M.flows.filter(f => colOf.has(f.from) && colOf.has(f.to));
  };
  const flows = flowsFor();
  for (const s of STRATA) {
    const md = mode(s), top = y;
    let h = 0;
    if (md === 'future') h = 16;
    else if (md === 'next') {
      const q = {logical: 'What must this part do?', application: 'Which component realizes these responsibilities?', capability: 'What platform support do these components need?', technology: 'Which product provides each capability?', runtime: 'Where will these run, and how many copies?'}[s.id];
      for (const c of cols.filter(c => !['ext', 'ctx'].includes(c.kind))) {
        const ok = s.id === 'logical' || (s.id === 'application' ? c.resps?.length : c.comps?.length || s.id === 'technology');
        if (!ok) continue;
        if (s.id === 'technology') continue;
        add({kind: 'socket', next: true, id: 'S:' + s.id + ':' + c.id, x: c.x + 8, y: top + PAD, w: c.w - 16, h: 36, col: c.index, band: s.id, label: 'Chapter ' + s.ch + ' · ' + q});
      }
      if (s.id === 'technology') for (const L of lanes) add({kind: 'socket', next: true, id: 'S:tech:' + L.cap, x: L.x, y: top + PAD + L.lane * 36, w: L.w, h: 30, band: s.id, label: 'Chapter 7 · Which product provides ' + M.byId.get(L.cap).title + '?'});
      h = s.id === 'technology' && lanes.length ? Math.max(...lanes.map(l => l.lane + 1)) * 36 - 6 : 36;
    } else if (s.id === 'intent') {
      for (const c of cols) {
        let ids;
        if (c.kind === 'brief') ids = [...M.reqs, ...M.qds, ...M.adrs].filter(o => shown(o.type)).map(o => o.id);
        else if (['ext', 'ctx'].includes(c.kind)) ids = [];
        else { const set = new Set(); for (const r of c.resps || []) { const w = M.why(r); [...w.reqs, ...w.qds, ...w.adrs].forEach(i => set.add(i)); } ids = [...set].filter(i => shown(M.T(i))).sort((a, b) => ['requirement', 'quality', 'decision'].indexOf(M.T(a)) - ['requirement', 'quality', 'decision'].indexOf(M.T(b))); }
        if (!ids.length) continue;
        if (md === 'summary') {
          const n = t => ids.filter(i => M.T(i) === t).length;
          const label = [n('requirement') && n('requirement') + ' REQ', n('quality') && n('quality') + ' QD', n('decision') && n('decision') + ' ADR'].filter(Boolean).join(' · ');
          add({kind: 'count', id: 'N:intent:' + c.id, x: c.x + 8, y: top + PAD, w: c.w - 16, h: 24, col: c.index, band: s.id, label, members: ids});
          h = Math.max(h, 24); continue;
        }
        h = Math.max(h, stack(c, top + PAD, ids.map(i => ({kind: 'intent', id: 'I:' + c.id + ':' + i, obj: i, band: s.id, detail: detailFor(md, c)}))));
      }
    } else if (s.id === 'logical') {
      for (const c of cols.filter(c => !['ext', 'ctx'].includes(c.kind))) {
        const d = detailFor(md, c);
        h = Math.max(h, stack(c, top + PAD, (c.resps || []).map(r => ({kind: 'resp', id: 'R:' + r, obj: r, band: s.id, detail: d, focus: sc.focus === r}))));
      }
    } else if (s.id === 'application') {
      for (const c of cols) {
        const d = detailFor(md, c), defs = [];
        if (c.kind === 'ext') { for (const p of c.parties) defs.push({kind: 'party', id: 'P:' + p, obj: p, band: s.id, detail: md === 'compact' ? 'compact' : 'normal'}); }
        else if (c.kind === 'ctx') { for (const p of c.partners) defs.push({kind: M.T(p) === 'party' ? 'party' : 'comp', ctx: true, id: 'X:' + p, obj: p, band: s.id, detail: 'compact', chips: []}); }
        else {
          for (const comp of c.comps || []) {
            const chips = (M.realizes.get(comp) || []).filter(() => shown('responsibility')).map(r => M.byId.get(r).title);
            const data = chapter >= 8 ? (M.owned.get(comp) || []).map(x => M.byId.get(x).title) : [];
            const provides = d === 'full' && chapter >= 8 ? (M.provides.get(comp) || []).map(x => M.byId.get(x).ref + ' ' + M.byId.get(x).title) : [];
            const uses = d === 'full' && chapter >= 8 ? (M.usesC.get(comp) || []).map(x => M.byId.get(x).ref + ' ' + M.byId.get(x).title) : [];
            defs.push({kind: 'comp', id: 'A:' + comp, obj: comp, band: s.id, detail: d, chips, data, provides, uses});
          }
          if (chapter >= 5 && c.kind === 'module') for (const r of c.resps || []) if (!(M.realizedBy.get(r) || []).length) defs.push({kind: 'socket', id: 'G:realize:' + r, gapFor: r, band: s.id, detail: md === 'compact' ? 'compact' : 'normal', label: 'No component realizes ' + M.byId.get(r).title});
          if (c.kind === 'unrealized') for (const r of c.resps || []) defs.push({kind: 'socket', id: 'G:realize:' + r, gapFor: r, band: s.id, detail: 'normal', label: 'No component realizes ' + M.byId.get(r).title});
        }
        h = Math.max(h, stack(c, top + PAD, defs));
      }
    } else if (s.id === 'capability' || s.id === 'technology') {
      const lh = cardHeight('lane', md === 'compact' ? 'compact' : md === 'open' ? 'full' : 'normal'), lg = md === 'open' ? 8 : 4;
      for (const L of lanes) {
        const ly = top + PAD + L.lane * (lh + lg), cap = M.byId.get(L.cap);
        if (s.id === 'capability') add({kind: 'lane', id: 'K:' + L.cap, obj: L.cap, x: L.x, y: ly, w: L.w, h: lh, band: s.id, detail: md, users: L.users, usersHere: L.usersHere, orphan: L.orphan, elsewhere: L.elsewhere, cols: L.cols});
        else {
          const t = M.techOf.get(L.cap);
          if (t) add({kind: 'plate', id: 'T:' + t, obj: t, x: L.x, y: ly, w: L.w, h: lh, band: s.id, detail: md, capId: L.cap});
          else add({kind: 'socket', id: 'G:tech:' + L.cap, gapFor: L.cap, x: L.x, y: ly, w: L.w, h: lh, band: s.id, detail: 'compact', label: 'No technology realization for ' + cap.title});
        }
      }
      h = lanes.length ? (Math.max(...lanes.map(l => l.lane)) + 1) * (lh + lg) - lg : 20;
    } else if (s.id === 'runtime') {
      let colH = 0;
      for (const c of cols.filter(c => !['ext', 'ctx'].includes(c.kind))) {
        const d = detailFor(md, c), defs = [];
        for (const comp of c.comps || []) {
          const runs = M.runsOf.get(comp) || [];
          if (!runs.length) defs.push({kind: 'socket', id: 'G:run:' + comp, gapFor: comp, band: s.id, detail: md === 'compact' ? 'compact' : 'normal', label: M.byId.get(comp).title + ' is not operated yet'});
          for (const r of runs) defs.push({kind: 'run', id: 'U:' + r, obj: r, band: s.id, detail: d});
        }
        colH = Math.max(colH, stack(c, top + PAD, defs));
      }
      const lh = md === 'open' ? 26 : 18;
      let used = 0;
      for (const L of lanes) {
        const t = M.techOf.get(L.cap), runs = t ? M.runsOf.get(t) || [] : [];
        if (!runs.length) continue;
        add({kind: 'run', platform: true, id: 'U:' + runs[0], obj: runs[0], extra: runs.slice(1), x: L.x, y: top + PAD + colH + L.lane * (lh + 4), w: L.w, h: lh, band: s.id, detail: 'compact'});
        used = Math.max(used, L.lane + 1);
      }
      h = colH + (used ? used * (lh + 4) : 0);
    }
    h = Math.max(h, md === 'future' ? 16 : 26);
    const bh = h + PAD * 2;
    bands.push({id: s.id, stratum: s, mode: md, y: top, h: bh});
    y = top + bh;
    // The interaction corridor sits under the band whose parts interact.
    const corridorAfter = chapter < 5 ? 'logical' : 'application';
    if (s.id === corridorAfter && flows.length && chapter >= 4) {
      corridor = {y0: y, flows};
      const routed = routeFlows(M, items, cols, flows, y);
      corridor.routes = routed.routes; corridor.h = routed.h;
      bands.push({id: 'corridor', corridor: true, y, h: routed.h, mode: 'normal', stratum: {id: 'corridor', label: 'Interactions', short: 'Interactions', sub: chapter < 5 ? 'Logical interactions between responsibilities' : 'Calls and events between components', color: '#2d6450', ch: chapter < 5 ? 4 : 5}});
      y += routed.h;
    }
  }
  for (const c of cols) add({kind: 'colbg', id: 'C:' + c.id, col: c.index, colKind: c.kind, x: c.x - 5, y: 4, w: c.w + 10, h: y - 4});
  const threads = realizationThreads(M, items, byObj, chapter);
  return {scope: sc, chapter, cols, items, byObj, bands, lanes, W: Math.max(W, viewW - 4), H: y + 24, routes: corridor?.routes || [], threads, labelW: LABEL_W};
}

// Capability lanes: one lane per capability, spanning the columns whose components need it.
// Narrow (local) lanes sit nearest the components; widely shared ones form the base.
function capabilityLanes(M, cols, colOf, sc, chapter) {
  if (chapter < 6) return [];
  const main = cols.filter(c => !['ext', 'ctx'].includes(c.kind));
  if (!main.length) return [];
  let caps;
  if (sc.kind === 'part' && sc.partType === 'capability') caps = [sc.id];
  else if (sc.kind === 'system') caps = M.cap.map(c => c.id);
  else caps = [...new Set(main.flatMap(c => (c.comps || []).flatMap(x => M.needs.get(x) || [])))];
  const list = [];
  for (const cap of caps) {
    const users = M.capUsers.get(cap) || [], idx = [...new Set(users.map(u => colOf.get(u)).filter(i => i !== undefined && main.some(c => c.index === i)))].sort((a, b) => a - b);
    let a, b, orphan = false;
    if (sc.kind === 'part' && sc.partType === 'component') { a = b = main[0].index; }
    else if (idx.length) { a = idx[0]; b = idx[idx.length - 1]; }
    else { orphan = true; a = b = main[main.length - 1].index; }
    const usersHere = users.filter(u => colOf.has(u));
    list.push({cap, a, b, users, usersHere, orphan, cols: idx, span: b - a + 1, elsewhere: users.length - usersHere.length});
  }
  if (sc.kind === 'part' && sc.partType === 'component') list.forEach((it, i) => { it.lane = i; });
  else {
    list.sort((p, q) => p.span - q.span || p.a - q.a || p.cap.localeCompare(q.cap));
    const lanes = [];
    for (const it of list) { let lane = 0; while ((lanes[lane] || []).some(o => !(it.b < o.a || it.a > o.b))) lane++; (lanes[lane] ??= []).push(it); it.lane = lane; }
  }
  const byIdx = new Map(cols.map(c => [c.index, c]));
  for (const it of list) { const A = byIdx.get(it.a), B = byIdx.get(it.b); it.x = A.x + 4; it.w = B.x + B.w - 4 - it.x; }
  return list;
}

// ---------------------------------------------------------------- interaction routing

// Orthogonal routes: out of a card's side, along the gutter to a corridor track, across, and
// back up the target's gutter. Adjacent overlapping cards connect straight across the gutter.
function routeFlows(M, items, cols, flows, corridorTop) {
  const cardOf = new Map();
  for (const it of items) if (it.obj && ['comp', 'party', 'resp'].includes(it.kind) && !cardOf.has(it.obj)) cardOf.set(it.obj, it);
  const routes = [], pending = [];
  const sidePorts = new Map(); // card:side -> count, to spread ports along a side
  const want = (card, side) => { const k = card.obj + ':' + side; sidePorts.set(k, (sidePorts.get(k) || 0) + 1); return k; };
  for (const f of flows) {
    const S = cardOf.get(f.from), T = cardOf.get(f.to);
    if (!S || !T) continue;
    const a = S.col, b = T.col;
    if (a === b) { pending.push({f, S, T, type: 'loop', ks: want(S, 'R'), kt: want(T, 'R')}); continue; }
    const right = b > a;
    const overlap = Math.min(S.y + S.h, T.y + T.h) - Math.max(S.y, T.y);
    if (Math.abs(a - b) === 1 && overlap >= 14) { pending.push({f, S, T, type: 'direct', right, ks: want(S, right ? 'R' : 'L'), kt: want(T, right ? 'L' : 'R')}); continue; }
    pending.push({f, S, T, type: 'corridor', right, ks: want(S, right ? 'R' : 'L'), kt: want(T, right ? 'L' : 'R')});
  }
  const portUsed = new Map();
  const portY = (card, k) => { const n = sidePorts.get(k) || 1, i = portUsed.get(k) || 0; portUsed.set(k, i + 1); const top = card.y + 10, bot = card.y + Math.min(card.h, 64) - 8; return Math.round(top + (bot - top) * (i + 1) / (n + 1)); };
  const colById = new Map(cols.map(c => [c.index, c]));
  const gutterX = (col, side) => { const c = colById.get(col); return side === 'R' ? c.x + c.w + GAP / 2 : c.x - GAP / 2; };
  // Track assignment for corridor segments (interval colouring).
  const corr = pending.filter(p => p.type === 'corridor').map(p => { const x1 = gutterX(p.S.col, p.right ? 'R' : 'L'), x2 = gutterX(p.T.col, p.right ? 'L' : 'R'); return {...p, x1, x2, lo: Math.min(x1, x2), hi: Math.max(x1, x2)}; });
  corr.sort((p, q) => (p.hi - p.lo) - (q.hi - q.lo) || p.lo - q.lo);
  const tracks = [];
  for (const p of corr) { let t = 0; while ((tracks[t] || []).some(o => !(p.hi + 6 < o.lo || p.lo - 6 > o.hi))) t++; (tracks[t] ??= []).push(p); p.track = t; }
  const h = corr.length ? 14 + tracks.length * TRACK + 8 : 18;
  // Gutter lanes so verticals sharing a gutter run side by side.
  const gut = new Map();
  const lane = x => { const i = gut.get(x) || 0; gut.set(x, i + 1); return x + ((i % 5) - 2) * 3.5; };
  for (const p of pending) {
    const {f, S, T} = p;
    let pts, mid;
    if (p.type === 'loop') {
      const ys = portY(S, p.ks), yt = portY(T, p.kt), gx = lane(gutterX(S.col, 'R'));
      pts = [[S.x + S.w, ys], [gx, ys], [gx, yt], [T.x + T.w, yt]]; mid = [gx, (ys + yt) / 2];
    } else if (p.type === 'direct') {
      const lo = Math.max(S.y, T.y) + 8, hi = Math.min(S.y + S.h, T.y + T.h) - 8, yy = Math.round(Math.max(lo, Math.min(hi, (portY(S, p.ks) + portY(T, p.kt)) / 2)));
      const xs = p.right ? S.x + S.w : S.x, xt = p.right ? T.x : T.x + T.w;
      pts = [[xs, yy], [xt, yy]]; mid = [(xs + xt) / 2, yy];
    } else {
      const c = corr.find(q => q.f === f), ty = corridorTop + 12 + c.track * TRACK;
      const ys = portY(S, p.ks), yt = portY(T, p.kt), x1 = lane(c.x1), x2 = lane(c.x2);
      const xs = p.right ? S.x + S.w : S.x, xt = p.right ? T.x : T.x + T.w;
      pts = [[xs, ys], [x1, ys], [x1, ty], [x2, ty], [x2, yt], [xt, yt]]; mid = [(x1 + x2) / 2, ty];
    }
    routes.push({id: f.id, from: f.from, to: f.to, contract: f.contract, async: f.async, logical: !!f.logical, label: f.label, points: pts, mid, type: p.type});
  }
  return {routes, h};
}

// Realization threads (responsibility → component) and pillars (component → capability lane).
function realizationThreads(M, items, byObj, chapter) {
  const out = [], card = id => byObj.get(id);
  const lanes = new Map(items.filter(i => i.kind === 'lane').map(i => [i.obj, i]));
  const plates = new Map(items.filter(i => i.kind === 'plate').map(i => [i.capId, i]));
  const compCards = items.filter(i => i.kind === 'comp' && !i.ctx);
  if (chapter >= 5) for (const c of compCards) {
    const rs = (M.realizes.get(c.obj) || []).map(card).filter(Boolean);
    rs.forEach((r, i) => {
      const xt = c.x + c.w * (i + 1) / (rs.length + 1), xs = Math.max(r.x + 12, Math.min(r.x + r.w - 12, xt));
      out.push({kind: 'realize', from: r.obj, to: c.obj, points: [[xs, r.y + r.h], [xt, c.y]]});
    });
  }
  if (chapter >= 6) for (const c of compCards) {
    const needs = (M.needs.get(c.obj) || []).map(k => lanes.get(k)).filter(Boolean);
    needs.forEach((L, i) => {
      let x = c.x + c.w * (i + 1) / (needs.length + 1);
      x = Math.max(L.x + 8, Math.min(L.x + L.w - 8, x));
      out.push({kind: 'pillar', from: c.obj, to: L.obj, points: [[x, c.y + c.h], [x, L.y]]});
    });
  }
  if (chapter >= 7) for (const [cap, L] of lanes) { const P = plates.get(cap); if (P) out.push({kind: 'implement', from: cap, to: P.obj, points: [[L.x + L.w / 2, L.y + L.h], [P.x + P.w / 2, P.y]]}); }
  if (chapter >= 10) {
    for (const c of compCards) for (const r of M.runsOf.get(c.obj) || []) { const R = card(r); if (R && !R.platform) out.push({kind: 'operate', from: c.obj, to: r, points: [[c.x + c.w - 14, c.y + c.h], [R.x + R.w - 14, R.y]]}); }
    for (const [cap, P] of plates) { const runs = M.runsOf.get(P.obj) || []; const R = runs.map(card).find(Boolean); if (R) out.push({kind: 'operate', from: P.obj, to: R.obj, points: [[P.x + P.w / 2 + 10, P.y + P.h], [P.x + P.w / 2 + 10, R.y]]}); }
  }
  return out;
}

// Geometry helper shared with the tests.
export function rectsOverlap(a, b, pad = 0) {
  return a.x < b.x + b.w - pad && b.x < a.x + a.w - pad && a.y < b.y + b.h - pad && b.y < a.y + a.h - pad;
}
