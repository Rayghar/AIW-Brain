// Interfaces & data — the semantic model behind the Chapter 8 Model views.
//
// Built on the same projection as the design anatomy, so every lifeline, message and data row
// is an existing object with its existing identity. Scenarios come only from recorded facts:
// a business journey (process path → responsibility → component → contract) or, when no journey
// is recorded, the call tree that starts where work enters from outside. Nothing here writes
// project facts; the views that use it route every change through the chapter's own editors.
import {anatomySource, anatomyModel, contractGaps} from './anatomy-model.js';
import {moduleOrder, componentOrder} from './anatomy-layout.js';
import {processPaths} from './process-model.js';

export const EXCHANGE_SCHEMA = 'aiw.exchange/1';
const list = v => (Array.isArray(v) ? v : []);
const text = (v, n = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const CAP = 90; // events per derived call tree; the rest is summarised

// ---------------------------------------------------------------- model

export function exchangeSource(p, {order = {}} = {}) {
  const M = anatomyModel(anatomySource(p));
  let paths = [];
  try { paths = processPaths(p); } catch { paths = []; }
  return exchangeModel(M, {contracts: list(p?.interfaces?.contracts), data: list(p?.interfaces?.data), lineage: list(p?.interfaces?.lineage), paths, order: order && typeof order === 'object' ? order : {}});
}

export function exchangeModel(M, {contracts = [], data = [], lineage = [], paths = null, order = {}} = {}) {
  const all = M.source?.all || null;
  const full = new Map(contracts.map(c => [c.id, c])), fullD = new Map(data.map(d => [d.id, d]));
  const actor = id => ['component', 'party'].includes(M.T(id));
  const C = new Map();
  for (const c of M.contracts) {
    const r = full.get(c.id) || {}, req = [], res = [], ex = list(r.exchanges);
    if (ex.length) { for (const x of ex) if (M.byId.has(x.dataId)) (x.role === 'response' ? res : req).push(x.dataId); }
    else for (const d of M.exch.get(c.id) || []) req.push(d);
    const from = M.I('uses', c.id).find(actor) || (actor(r.from) ? r.from : null), to = M.I('provides', c.id).find(actor) || (actor(r.to) ? r.to : null);
    C.set(c.id, {id: c.id, ref: c.ref, title: c.title, style: c.style || 'request', async: /event|async|publish/i.test(c.style || ''), from, to,
      operation: text(r.operation, 120), protocol: text(r.protocol, 80), purpose: text(r.purpose || c.description, 260), owner: text(r.owner || c.owner, 80),
      correlation: text(r.correlationKey, 80), idempotency: text(r.idempotencyKey, 80), duplicate: text(r.duplicatePolicy, 220),
      timeout: c.timeout || '', retry: c.retry || '', failure: c.failure || '', authorization: text(r.authorization, 180), transport: text(r.transport, 120),
      req: [...new Set(req)], res: [...new Set(res)], gaps: contractGaps(c), illustrative: r.origin === 'reference' || /illustrative/i.test(r.evidence || '')});
  }
  const D = new Map();
  for (const d of M.data) {
    const r = fullD.get(d.id) || {}, fields = list(r.fields);
    D.set(d.id, {id: d.id, ref: d.ref, title: d.title, classification: d.classification || text(r.classification, 40), authority: M.owner.get(d.id) || null,
      fields: fields.length, fieldNames: fields.slice(0, 10).map(f => text(f.name, 40)), key: text(fields.find(f => f.key)?.name, 40),
      retention: text(r.retentionPolicy, 180), retentionConfirmed: !!r.retentionConfirmed, purpose: text(r.purpose || d.description, 240), owner: text(r.owner || d.owner, 80), protection: text(r.protection, 180)});
  }
  // One link per contract (a contract is an interaction with a promise), plus any recorded
  // interaction that still has no contract.
  const links = [], pairs = new Set();
  for (const c of C.values()) if (c.from && c.to && c.from !== c.to) { links.push({id: 'C:' + c.id, from: c.from, to: c.to, contract: c.id, async: c.async, label: c.title}); pairs.add(c.from + '>' + c.to); }
  for (const f of M.flows) if (!pairs.has(f.from + '>' + f.to)) links.push({id: f.id, from: f.from, to: f.to, contract: null, async: f.async, label: f.label || 'Interaction'});
  const moves = [];
  for (const c of C.values()) {
    if (!c.from || !c.to) continue;
    for (const d of c.req) moves.push({id: c.id + '>' + d, data: d, contract: c.id, from: c.from, to: c.to, role: 'request'});
    for (const d of c.res) moves.push({id: c.id + '<' + d, data: d, contract: c.id, from: c.to, to: c.from, role: 'response'});
  }
  // A component that sends data it neither owns nor received: the model does not say where it
  // comes from. Parties may originate data; they are outside the design.
  const holds = new Map([...D.values()].map(d => [d.id, new Set([d.authority, ...moves.filter(m => m.data === d.id).map(m => m.to)])]));
  for (const m of moves) m.unsourced = M.T(m.from) === 'component' && !holds.get(m.data)?.has(m.from);
  const X = {M, all, C, D, links, moves, lineage: list(lineage).filter(l => D.has(l.from) && D.has(l.to)).map(l => ({id: l.id, from: l.from, to: l.to, title: text(l.title, 120)}))};
  X.order = actorOrder(M, links, order);
  X.pos = new Map(X.order.map((id, i) => [id, i]));
  X.route = (a, b) => route(X, a, b);
  X.journeys = journeyPaths(all, paths);
  X.scenarios = buildScenarios(X);
  return X;
}

// Lifelines read left to right: parties that only start work, then modules in their smart order
// (the same order the design anatomy uses) with their components, then the parties work reaches.
export function actorOrder(M, links, fixed = {}) {
  const arr = v => (Array.isArray(v) ? v : null), mods = moduleOrder(M, arr(fixed.system)), pos = new Map(mods.map((m, i) => [m, i]));
  const colPos = id => (pos.has(M.mod.get(id)) ? pos.get(M.mod.get(id)) : null), comps = [];
  for (const m of mods) comps.push(...componentOrder(M, M.comp.filter(c => M.mod.get(c.id) === m).map(c => c.id), colPos, arr(fixed['comp:' + m])));
  comps.push(...M.comp.filter(c => !pos.has(M.mod.get(c.id))).map(c => c.id));
  const cpos = new Map(comps.map((c, i) => [c, i])), L = [], R = [];
  for (const p of M.parties) {
    const out = links.filter(l => l.from === p.id), inn = links.filter(l => l.to === p.id);
    const near = [...out.map(l => l.to), ...inn.map(l => l.from)].map(x => cpos.get(x)).filter(v => v !== undefined);
    (out.length && !inn.length ? L : R).push({id: p.id, b: near.length ? near.reduce((a, c) => a + c, 0) / near.length : comps.length});
  }
  const by = (a, b) => a.b - b.b || (a.id < b.id ? -1 : 1);
  return [...L.sort(by).map(x => x.id), ...comps, ...R.sort(by).map(x => x.id)];
}

// Shortest recorded chain of component interactions from a to b (never through a party).
function route(X, a, b) {
  const {M} = X, prev = new Map([[a, null]]), q = [a];
  while (q.length) {
    const x = q.shift();
    if (x === b) break;
    if ((prev.get(x)?.depth || 0) >= 3) continue;
    for (const l of X.links) if (l.from === x && !prev.has(l.to) && (l.to === b || M.T(l.to) === 'component')) { prev.set(l.to, {l, depth: (prev.get(x)?.depth || 0) + 1}); q.push(l.to); }
  }
  if (!prev.has(b) || a === b) return null;
  const out = []; let x = b;
  while (prev.get(x)) { out.unshift(prev.get(x).l); x = prev.get(x).l.from; }
  return out;
}

// Business paths: the reference process paths when present, otherwise every path through the
// recorded journey sequence (or the order of journey steps).
function journeyPaths(all, given) {
  if (given?.length) return given.map(p => ({id: p.id, title: p.title, ids: p.ids}));
  if (!all) return [];
  let rels = all.relationships.filter(r => r.type === 'sequence');
  if (!rels.length) rels = all.relationships.filter(r => r.type === 'precedes' && all.objects.get(r.from)?.type === 'journey' && all.objects.get(r.to)?.type === 'journey');
  if (!rels.length) return [];
  const out = new Map(), hasIn = new Set(rels.map(r => r.to));
  for (const r of rels) { if (!out.has(r.from)) out.set(r.from, []); out.get(r.from).push(r.to); }
  const starts = [...new Set(rels.map(r => r.from))].filter(id => !hasIn.has(id)), found = [];
  const walk = (id, trail) => { if (found.length >= 12) return; const next = (out.get(id) || []).filter(n => !trail.includes(n) && n !== id); if (!next.length) { found.push([...trail, id]); return; } for (const n of next) walk(n, [...trail, id]); };
  for (const s of starts) walk(s, []);
  return found.map((ids, i) => ({id: 'path-' + (i + 1), title: all.objects.get(ids.at(-1))?.title || 'Path ' + (i + 1), ids}));
}

export const outcomeOf = s => (/uncertain|unknown|pending|time ?out|lost|enquir|reconcil/i.test(s) ? 'uncertain' : /held|hold|reject|declin|stop|fail|cancel|refus/i.test(s) ? 'stopped' : 'done');

// ---------------------------------------------------------------- scenarios

function recorder(X) {
  const ev = [], stack = [];
  let n = 0;
  const id = () => 'e' + (++n);
  const r = {ev, stack, id,
    call(l) { const c = X.C.get(l.contract); const e = {t: 'call', id: id(), from: l.from, to: l.to, link: l.id, contract: l.contract, async: !!l.async, data: c ? c.req : [], label: l.label}; ev.push(e); if (!e.async) stack.push(e); return e; },
    ret(c) { const k = X.C.get(c.contract); const e = {t: 'return', id: id(), from: c.to, to: c.from, link: c.link, contract: c.contract, data: k ? k.res : [], of: c.id}; ev.push(e); return e; },
    unwindTo(actor) { while (stack.length) { const c = stack.pop(); r.ret(c); if (c.from === actor) break; } },
    push(e) { const x = {id: id(), ...e}; ev.push(x); return x; }};
  return r;
}

function buildJourney(X, path) {
  const {M, all} = X, R = recorder(X), usedDeps = new Set();
  const label = (a, b) => all.relationships.find(r => r.type === 'sequence' && r.from === a && r.to === b)?.label || '';
  let cur = null, step = 0, lastDep = null, outcome = 'done';
  for (let i = 0; i < path.ids.length; i++) {
    const pid = path.ids[i], o = all.objects.get(pid);
    if (!o) continue;
    if (o.type === 'event') {
      if (i === 0) { R.push({t: 'start', ref: pid, title: o.title}); continue; }
      if (i === path.ids.length - 1) {
        outcome = outcomeOf(o.title + ' ' + label(path.ids[i - 1], pid));
        if (outcome === 'uncertain' && lastDep) { lastDep.ret.lost = true; R.ev.splice(R.ev.indexOf(lastDep.ret) + 1, 0, {t: 'recover', id: R.id(), contract: lastDep.call.contract, caller: lastDep.call.from, callee: lastDep.call.to}); }
        R.push({t: 'end', ref: pid, actor: cur, title: o.title, outcome});
        continue;
      }
      R.push({t: 'note', ref: pid, actor: cur, title: o.title});
      continue;
    }
    if (o.type === 'gateway') { R.push({t: 'guard', ref: pid, title: o.title, label: label(pid, path.ids[i + 1]), actor: cur}); continue; }
    if (!['journey', 'task'].includes(o.type)) continue;
    const resp = all.relationships.filter(r => r.type === 'implementedBy' && r.from === pid).map(r => r.to).find(x => M.T(x) === 'responsibility') || null;
    const comp = resp ? (M.realizedBy.get(resp) || [])[0] || null : null;
    step++;
    R.push({t: 'step', ref: pid, n: step, title: o.title, actor: comp, resp, owner: text(o.owner, 60)});
    if (!comp) continue;
    if (cur === null) {
      const entry = X.links.find(l => l.to === comp && M.T(l.from) === 'party');
      if (entry) R.call(entry); else R.push({t: 'enter', actor: comp});
    } else if (cur !== comp) {
      if (R.stack.some(c => c.from === comp)) R.unwindTo(comp);
      else { const r = X.route(cur, comp); if (r) r.forEach(l => R.call(l)); else R.push({t: 'gap', from: cur, to: comp, label: o.title, step: pid}); }
    }
    cur = comp; lastDep = null;
    // What this step needs from outside the system happens inside the step.
    for (const l of X.links.filter(l => l.from === comp && M.T(l.to) === 'party' && !usedDeps.has(l.id))) {
      usedDeps.add(l.id);
      const c = R.call(l);
      if (!c.async) { R.stack.pop(); lastDep = {call: c, ret: R.ret(c)}; }
    }
  }
  while (R.stack.length) R.ret(R.stack.pop());
  return {id: 'journey:' + path.id, kind: 'journey', title: path.title, outcome, events: R.ev};
}

function buildEntry(X, start) {
  const R = recorder(X), seen = new Set();
  let count = 0, more = 0;
  const visit = (actor, depth) => {
    for (const l of X.links.filter(l => l.from === actor)) {
      if (seen.has(l.id)) continue;
      if (count >= CAP) { more++; seen.add(l.id); continue; }
      seen.add(l.id); count++;
      const c = R.call(l);
      if (depth < 8) visit(l.to, depth + 1);
      if (!c.async) { R.stack.pop(); R.ret(c); }
    }
  };
  R.push({t: 'start', ref: start, title: 'Work arrives from ' + (X.M.byId.get(start)?.title || start)});
  visit(start, 0);
  if (more) R.push({t: 'more', count: more});
  return {id: 'entry:' + start, kind: 'entry', title: 'From ' + (X.M.byId.get(start)?.title || start), outcome: 'done', events: R.ev};
}

function buildCatalog(X) {
  const R = recorder(X), pos = id => X.pos.get(id) ?? 1e6;
  const links = X.links.slice().sort((a, b) => pos(a.from) - pos(b.from) || pos(a.to) - pos(b.to));
  let count = 0;
  for (const l of links) {
    if (count >= CAP * 2) { R.push({t: 'more', count: links.length - count}); break; }
    count++;
    const c = R.call(l);
    if (!c.async) { R.stack.pop(); R.ret(c); }
  }
  return {id: 'catalog', kind: 'catalog', title: 'Every interaction', outcome: 'done', events: R.ev};
}

function buildScenarios(X) {
  const out = [];
  if (X.all) for (const p of X.journeys) { try { const s = buildJourney(X, p); if (s.events.some(e => e.t === 'call' || e.t === 'gap' || e.t === 'step')) out.push(s); } catch { /* an incomplete path stays out of the list */ } }
  if (!out.length) for (const p of X.M.parties) if (X.links.some(l => l.from === p.id) && !X.links.some(l => l.to === p.id)) out.push(buildEntry(X, p.id));
  if (X.links.length) out.push(buildCatalog(X));
  for (const s of out) {
    const calls = s.events.filter(e => e.t === 'call'), ext = new Set(calls.flatMap(e => [e.from, e.to]).filter(x => X.M.T(x) === 'party'));
    s.stats = {messages: calls.length, external: ext.size, gaps: s.events.filter(e => e.t === 'gap').length, lost: s.events.filter(e => e.lost).length};
  }
  return out;
}

// ---------------------------------------------------------------- slicing

// What each actor becomes at a scope: itself, or the module it belongs to. The same rule
// folds lifelines in the sequence and columns in the data view, so both read alike.
export function laneFn(X, scope = {kind: 'system'}, depth = 'components') {
  const {M} = X, mod = id => M.mod.get(id), comp = id => M.T(id) === 'component';
  if (scope.kind === 'module') return id => (comp(id) && mod(id) && mod(id) !== scope.id ? mod(id) : id);
  if (scope.kind === 'part') {
    const near = new Set([scope.id]);
    for (const l of X.links) { if (l.from === scope.id) near.add(l.to); if (l.to === scope.id) near.add(l.from); }
    return id => (comp(id) && mod(id) && !near.has(id) ? mod(id) : id);
  }
  if (depth === 'modules') return id => (comp(id) && mod(id) ? mod(id) : id);
  return id => id;
}

// Where an object is looked at from: a module, a component or party with its partners.
export function exchangeScope(X, scope) {
  const {M} = X;
  if (!scope || scope.kind === 'system' || !scope.id || !M.byId.has(scope.id)) return {kind: 'system'};
  const t = M.T(scope.id), id = scope.id;
  if (t === 'module') return {kind: 'module', id};
  if (t === 'component' || t === 'party') return {kind: 'part', id};
  if (t === 'responsibility') { const c = (M.realizedBy.get(id) || [])[0]; return c ? {kind: 'part', id: c, focus: id} : {kind: 'system'}; }
  if (t === 'contract') { const c = X.C.get(id), a = c?.to && M.T(c.to) === 'component' ? c.to : c?.from; return a ? {kind: 'part', id: a, focus: id} : {kind: 'system'}; }
  if (t === 'data') { const a = X.D.get(id)?.authority; return a ? {kind: 'part', id: a, focus: id} : {kind: 'system'}; }
  return {kind: 'system'};
}

export function defaultDepth(X) { return X.order.length > 11 && X.M.modules.length > 1 ? 'modules' : 'components'; }

// A folded lifeline stands where the first actor folded into it stands.
function lanePosition(X, lid, lane) {
  if (X.pos.has(lid)) return X.pos.get(lid);
  const ps = X.order.filter(a => lane(a) === lid).map(a => X.pos.get(a));
  return ps.length ? Math.min(...ps) : 1e6;
}
export function laneInfo(X, lid, scope) {
  const {M} = X, o = M.byId.get(lid), t = M.T(lid);
  const kind = t === 'module' ? 'module' : t === 'party' ? 'party' : 'component';
  const ctx = kind === 'module' && !(scope.kind === 'system');
  return {id: lid, kind, ctx, title: o?.title || lid, ref: o?.ref || lid, module: kind === 'component' ? M.mod.get(lid) || null : kind === 'module' ? lid : null,
    sub: kind === 'party' ? 'Outside the system' : kind === 'module' ? M.comp.filter(c => M.mod.get(c.id) === lid).length + ' components' : M.byId.get(M.mod.get(lid))?.title || ''};
}
export function orderLanes(X, ids, scope, lane = id => id) {
  return [...new Set(ids)].filter(Boolean).sort((a, b) => lanePosition(X, a, lane) - lanePosition(X, b, lane) || (a < b ? -1 : 1)).map(id => laneInfo(X, id, scope));
}
export function subjectOf(scope) { return scope.kind === 'system' ? null : scope.id; }

// A scenario seen at a scope: messages between actors that fold into the same lifeline become
// one internal step on that lifeline; at a part scope, messages that do not touch it are dimmed.
export function foldScenario(X, scenario, scope = {kind: 'system'}, depth = 'components') {
  const lane = laneFn(X, scope, depth), subject = scope.kind === 'part' ? scope.id : null, out = [];
  const inModule = id => scope.kind === 'module' && (X.M.mod.get(id) === scope.id);
  let self = null;
  for (const e of scenario?.events || []) {
    if (e.t === 'call' || e.t === 'return' || e.t === 'gap') {
      const a = lane(e.from), b = lane(e.to);
      if (a === b) {
        if (e.t === 'return') continue;
        if (self && out.at(-1) === self && self.lane === a) { self.count++; self.items.push(e); } else { self = {t: 'self', id: 's' + e.id, lane: a, count: 1, items: [e]}; out.push(self); }
        continue;
      }
      const touches = subject ? (e.from === subject || e.to === subject) : scope.kind === 'module' ? (inModule(e.from) || inModule(e.to)) : true;
      out.push({...e, a, b, dim: !touches});
      continue;
    }
    if (e.t === 'recover') { out.push({...e, a: lane(e.caller), b: lane(e.callee), dim: subject ? !(e.caller === subject || e.callee === subject) : false}); continue; }
    if (['step', 'end', 'enter', 'note', 'guard'].includes(e.t)) { out.push({...e, lane: e.actor ? lane(e.actor) : null}); continue; }
    out.push({...e});
  }
  const ids = [];
  for (const e of out) { if (e.a) ids.push(e.a, e.b); if (e.lane) ids.push(e.lane); }
  if (subject) ids.push(subject);
  return {scenario, scope, depth, lanes: orderLanes(X, ids, scope, lane), events: out};
}

// Data seen at a scope: one row per definition, its authority and every place it travels.
export function foldData(X, scope = {kind: 'system'}, depth = 'components') {
  const lane = laneFn(X, scope, depth), {M} = X, subject = scope.kind === 'part' ? scope.id : null;
  const inScope = id => (scope.kind === 'system' ? true : scope.kind === 'module' ? M.mod.get(id) === scope.id : id === subject);
  const rows = [];
  for (const d of X.D.values()) {
    const moves = X.moves.filter(m => m.data === d.id), touches = inScope(d.authority) || moves.some(m => inScope(m.from) || inScope(m.to));
    if (scope.kind !== 'system' && !touches) continue;
    const seen = new Set(), folded = [];
    let internal = 0;
    for (const m of moves) {
      const a = lane(m.from), b = lane(m.to);
      if (a === b) { internal++; continue; }
      const k = a + '>' + b + '|' + m.contract;
      if (seen.has(k)) continue;
      seen.add(k); folded.push({...m, a, b, dim: subject ? !(m.from === subject || m.to === subject) : false});
    }
    rows.push({id: d.id, data: d, authority: d.authority ? lane(d.authority) : null, moves: folded, internal});
  }
  const ids = [];
  for (const r of rows) { if (r.authority) ids.push(r.authority); for (const m of r.moves) ids.push(m.a, m.b); }
  if (subject) ids.push(subject);
  const lanes = orderLanes(X, ids, scope, lane), lp = new Map(lanes.map((l, i) => [l.id, i]));
  rows.sort((a, b) => (lp.get(a.authority) ?? 1e6) - (lp.get(b.authority) ?? 1e6) || String(a.data.ref).localeCompare(String(b.data.ref)));
  return {scope, depth, lanes, rows};
}

// ---------------------------------------------------------------- reading

// Structural observations drawn only from recorded contracts, data and scenarios.
export function exchangeInsights(X, scope = {kind: 'system'}) {
  const {M} = X, out = [], title = id => M.byId.get(id)?.title || id, ref = id => X.C.get(id)?.ref || id;
  const inS = id => scope.kind === 'system' || (scope.kind === 'module' ? M.mod.get(id) === scope.id : id === scope.id);
  const seenFirst = new Set();
  for (const s of X.scenarios.filter(s => s.kind !== 'catalog')) {
    const first = s.events.find(e => e.t === 'call' && !e.async);
    if (!first || seenFirst.has(first.contract || first.link)) continue;
    seenFirst.add(first.contract || first.link);
    const a = s.events.indexOf(first), b = s.events.findIndex(e => e.t === 'return' && e.of === first.id);
    const inner = s.events.slice(a + 1, b < 0 ? undefined : b).filter(e => e.t === 'call' && !e.async), ext = [...new Set(inner.filter(e => M.T(e.to) === 'party').map(e => e.to))];
    if (inner.length >= 3 && (inS(first.from) || inS(first.to) || inner.some(e => inS(e.from) || inS(e.to)))) out.push({kind: 'risk', id: first.contract || first.to, scenario: s.id,
      text: `${first.contract ? ref(first.contract) + ' ' + X.C.get(first.contract).title : title(first.to)} waits while ${inner.length} further request${inner.length === 1 ? '' : 's'} complete${ext.length ? ', including ' + ext.map(title).join(' and ') : ''}. Every request in the chain waits for its response, so a slow dependency holds ${title(first.from)} open.`,
      ask: `Should ${first.contract ? ref(first.contract) : 'this request'} return once work is accepted, and hand the rest off as an event?`});
  }
  const extNoTimeout = [...X.C.values()].filter(c => c.to && M.T(c.to) === 'party' && !c.async && !c.timeout && (inS(c.from) || inS(c.to)));
  if (extNoTimeout.length) out.push({kind: 'gap', id: extNoTimeout[0].id, text: `${extNoTimeout.length} request${extNoTimeout.length === 1 ? '' : 's'} to an external system ${extNoTimeout.length === 1 ? 'has' : 'have'} no timeout policy (${extNoTimeout.map(c => c.ref).join(', ')}). A missing answer does not mean the work failed.`, ask: 'What should happen when the external system does not answer in time?'});
  const noDup = [...X.C.values()].filter(c => !c.async && !c.idempotency && !c.duplicate && (c.retry || c.failure) && (inS(c.from) || inS(c.to)));
  if (noDup.length) out.push({kind: 'gap', id: noDup[0].id, text: `${noDup.length} contract${noDup.length === 1 ? ' allows' : 's allow'} a retry or recovery but not how a repeated request is recognised (${noDup.slice(0, 4).map(c => c.ref).join(', ')}${noDup.length > 4 ? '…' : ''}).`});
  const bare = X.links.filter(l => !l.contract && (inS(l.from) || inS(l.to)));
  if (bare.length) out.push({kind: 'gap', id: bare[0].from, text: `${bare.length} interaction${bare.length === 1 ? ' has' : 's have'} no interface contract (e.g. ${title(bare[0].from)} → ${title(bare[0].to)}).`});
  for (const s of X.scenarios) for (const g of s.events.filter(e => e.t === 'gap' && (inS(e.from) || inS(e.to)))) out.push({kind: 'gap', id: g.to, scenario: s.id, text: `${s.title}: no recorded interaction carries “${g.label}” from ${title(g.from)} to ${title(g.to)}.`});
  for (const d of X.D.values()) {
    if (!d.authority) { out.push({kind: 'gap', id: d.id, text: `${d.ref} ${d.title} has no authoritative system.`}); continue; }
    const holders = new Set(X.moves.filter(m => m.data === d.id).map(m => m.to).filter(x => x !== d.authority));
    if (!inS(d.authority) && ![...holders].some(inS)) continue;
    const outside = [...holders].filter(x => M.T(x) === 'party');
    if (outside.length && /confidential|restricted|secret|personal|sensitive/i.test(d.classification) && M.T(d.authority) !== 'party') out.push({kind: 'risk', id: d.id, text: `${d.classification} data ${d.ref} ${d.title} leaves the system to ${outside.map(title).join(' and ')}. Chapter 9 should show how it is protected in transit and at the other side.`});
    const orphanSends = X.moves.filter(m => m.data === d.id && m.unsourced && (inS(m.from) || inS(m.to)));
    if (orphanSends.length) out.push({kind: 'gap', id: d.id, text: `${orphanSends.map(m => title(m.from) + ' sends ' + d.title + ' (' + ref(m.contract) + ')').join('; ')}, but no recorded contract brings it there. Either an earlier contract carries it, or the part reads it from ${title(d.authority)} — record which.`, ask: `Where does ${title(orphanSends[0].from)} get ${d.title} from?`});
    if (holders.size >= 3) out.push({kind: 'info', id: d.id, text: `${d.ref} ${d.title} is held in ${holders.size} places besides its authority (${title(d.authority)}). Each copy needs a clear rule for staying current.`});
    if (!X.moves.some(m => m.data === d.id)) out.push({kind: 'info', id: d.id, text: `${d.ref} ${d.title} is not carried by any contract yet.`});
  }
  if (X.scenarios.some(s => s.kind === 'journey')) {
    const used = new Set(X.scenarios.filter(s => s.kind === 'journey').flatMap(s => s.events.filter(e => e.t === 'call').map(e => e.contract)));
    const idle = [...X.C.values()].filter(c => !used.has(c.id) && (inS(c.from) || inS(c.to)));
    if (idle.length) out.push({kind: 'info', id: idle[0].id, text: `${idle.length} contract${idle.length === 1 ? ' is' : 's are'} not used by any recorded journey (${idle.slice(0, 4).map(c => c.ref).join(', ')}${idle.length > 4 ? '…' : ''}).`});
  }
  return out;
}

// The plain reading of one message, used by the walk-through and the companion panel.
export function describeEvent(X, e, {gaps = true} = {}) {
  const {M} = X, t = id => M.byId.get(id)?.title || id, c = e.contract ? X.C.get(e.contract) : null, d = ids => ids.map(id => X.D.get(id)?.title || id);
  if (e.t === 'call') {
    const what = c ? `${c.ref} ${c.title}` : `“${e.label}” (no contract)`;
    const data = d(e.data || []);
    return `${t(e.from)} ${e.async ? 'publishes' : 'asks'} ${t(e.to)} — ${what}${data.length ? ', with ' + data.join(' and ') : ''}.${e.async ? ' It does not wait.' : ''}${gaps && c?.gaps?.length ? ' Not yet agreed: ' + c.gaps.join(', ') + '.' : ''}`;
  }
  if (e.t === 'return') {
    const data = d(e.data || []);
    if (e.lost) return `The answer from ${t(e.from)} does not arrive. ${t(e.to)} cannot tell whether the work was done.`;
    return `${t(e.from)} answers ${t(e.to)}${data.length ? ' with ' + data.join(' and ') : ''}.`;
  }
  if (e.t === 'self') return `${e.count} step${e.count === 1 ? '' : 's'} happen inside ${t(e.lane)}: ${e.items.map(i => i.label).join(', ')}.`;
  if (e.t === 'gap') return `No recorded interaction carries “${e.label}” from ${t(e.from)} to ${t(e.to)}.`;
  if (e.t === 'recover') {
    const k = X.C.get(e.contract);
    const have = k ? [k.timeout && 'timeout: ' + k.timeout, k.retry && 'retry: ' + k.retry, k.failure && 'failure: ' + k.failure].filter(Boolean) : [];
    return have.length ? `${k.ref} records what happens next — ${have.join('; ')}.` : `${k ? k.ref + ' ' + k.title : 'The contract'} does not say what ${t(e.caller)} does when ${t(e.callee)} does not answer.`;
  }
  if (e.t === 'step') return `Step ${e.n} · ${e.title}${e.actor ? ' — done by ' + t(e.actor) : ' — no component realizes this step yet'}.`;
  if (e.t === 'guard') return `${e.title} — the path taken is ${e.label ? '“' + e.label + '”' : 'the recorded one'}.`;
  if (e.t === 'end') return `${e.title}.`;
  if (e.t === 'start') return `${e.title}.`;
  if (e.t === 'enter') return `Work starts at ${t(e.actor)}; no caller is recorded.`;
  return '';
}
