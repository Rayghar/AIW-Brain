// Application realisation — the semantic model behind the Chapter 5 Model views.
//
// The logical design embedded in the physical one: each application component carries the
// responsibilities it realises (Chapter 4) and stands on the platform capabilities it needs
// (Chapter 6). Components sit in their modules, talk through recorded interactions, and the
// logical flows between responsibilities are checked against those interactions. Pure: it reads
// the anatomy projection and the Chapter 5 records and never writes.
import {exchangeSource} from './exchange-model.js';
import {components as componentsOf, realisationFindings, realisationProposal} from './realisation-domain.js';
import {mappingCurrent} from './logical-domain.js';

export const REALISE_SCHEMA = 'aiw.realise/1';
export const OUT_L = 'OUT:in', OUT_R = 'OUT:out', NONE = 'NONE', PROPOSED = 'PROPOSED';
export const KIND_LABEL = {service: 'Service', worker: 'Worker', adapter: 'Adapter', queue: 'Queue', store: 'Store', module: 'Module'};
const list = v => (Array.isArray(v) ? v : []);
const text = (v, n = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const uniq = a => [...new Set(a)];

export function realiseSource(p, {order = {}} = {}) {
  const X = exchangeSource(p, {order});
  let findings = [];
  try { findings = realisationFindings(p); } catch { findings = []; }
  const mappings = list(p?.logical?.mappings).map(m => { let current = true; try { current = mappingCurrent(p, m); } catch { current = true; } return {...m, current}; });
  const proposals = [];
  for (const key of ['review', 'dedup', 'recovery']) { try { const q = realisationProposal(p, key); if (q) proposals.push({key, title: q.title || '', kind: q.kind || '', logicalId: q.allocations?.[0]?.logicalId || null, sourceId: q.sourceId || null, existingId: q.existingId || null}); } catch { /* optional */ } }
  return realiseModel(X, {components: componentsOf(p), connections: list(p?.realisation?.connections), mappings, responsibilities: list(p?.logical?.responsibilities), groups: list(p?.logical?.groups), findings, proposals});
}

export function realiseModel(X, {components = [], connections = [], mappings = [], responsibilities = [], groups = [], findings = [], proposals = []} = {}) {
  const {M} = X;
  const rec = new Map(components.map(c => [c.id, c])), lrec = new Map(responsibilities.map(r => [r.id, r]));
  const gtitle = new Map(groups.map(g => [g.id, g]));
  // Modules in the anatomy's order: as their components first appear in the actor order.
  const modOrder = [];
  for (const id of X.order) { const m = M.mod.get(id); if (m && !modOrder.includes(m)) modOrder.push(m); }
  for (const m of M.modules) if (!modOrder.includes(m.id)) modOrder.push(m.id);
  const modules = new Map(modOrder.map((id, i) => { const m = M.byId.get(id); return [id, {id, ref: m?.ref || id, title: m?.title || gtitle.get(id)?.title || id, purpose: text(gtitle.get(id)?.purpose || m?.description, 200), index: i}]; }));
  // Responsibilities and their allocations. Recorded mappings carry scope and currency; the
  // anatomy's realisation links stand in where no mapping is recorded.
  const R = new Map();
  for (const r of M.resp) {
    const lr = lrec.get(r.id) || {};
    R.set(r.id, {id: r.id, ref: r.ref || lr.ref || r.id, title: r.title || lr.title || r.id, purpose: text(lr.purpose || r.description, 220), boundary: text(lr.boundary, 200), module: M.mod.get(r.id) || NONE, why: M.why(r.id), decisions: list(lr.decisionIds), allocations: []});
  }
  const comps = M.comp.map(c => c.id);
  for (const m of mappings) if (R.has(m.logicalId) && comps.includes(m.physicalId)) R.get(m.logicalId).allocations.push({id: m.id, component: m.physicalId, scope: text(m.scope, 220), current: m.current !== false, owner: text(m.owner, 80)});
  for (const r of R.values()) if (!r.allocations.length) for (const c of M.realizedBy.get(r.id) || []) r.allocations.push({id: null, component: c, scope: '', current: true, owner: ''});
  for (const r of R.values()) {
    r.realisedBy = uniq(r.allocations.map(a => a.component));
    const seen = new Map(); r.shared = [];
    for (const a of r.allocations) { const k = a.scope.toLowerCase(); if (k && seen.has(k)) r.shared.push(a.component, seen.get(k)); else if (k) seen.set(k, a.component); }
  }
  // Elements: components, the parties outside, and a hole for every responsibility nothing realises.
  const E = new Map();
  for (const id of X.order) {
    const o = M.byId.get(id);
    if (M.T(id) === 'party') { E.set(id, {id, kind: 'party', title: o.title, ref: o.ref || id, region: null}); continue; }
    const c = rec.get(id) || {};
    const realises = [...R.values()].filter(r => r.realisedBy.includes(id)).map(r => r.id);
    const why = {reqs: uniq(realises.flatMap(r => R.get(r).why.reqs)), qds: uniq(realises.flatMap(r => R.get(r).why.qds)), adrs: uniq([...realises.flatMap(r => R.get(r).why.adrs), ...list(c.decisionIds)])};
    E.set(id, {id, kind: 'component', ckind: c.kind || 'service', ref: c.ref || o.ref || id, title: c.title || o.title, module: M.mod.get(id) || NONE, region: M.mod.get(id) || NONE,
      realises, data: uniq([...list(c.dataIds), ...(M.owned.get(id) || [])]).filter(d => M.byId.has(d)), needs: M.needs.get(id) || [],
      purpose: text(c.purpose || o.description, 260), boundary: text(c.boundary, 260), owner: text(c.owner || o.owner, 80), inputs: text(c.inputs, 200), outputs: text(c.outputs, 200), technologyNeeds: text(c.technologyNeeds, 260),
      status: c.status || o.status || 'candidate', recorded: rec.has(id), why});
  }
  for (const r of R.values()) if (!r.realisedBy.length) E.set('HOLE:' + r.id, {id: 'HOLE:' + r.id, kind: 'hole', title: r.title, ref: r.ref, module: r.module, region: r.module, realises: [r.id], data: [], needs: []});
  for (const e of E.values()) if (e.kind === 'component') e.defined = !!(e.purpose && e.boundary && e.owner && e.inputs && e.outputs);
  // Interactions: Chapter 5's recorded interactions between components, then the anatomy's
  // flows (which include the parties outside and any interaction recorded elsewhere).
  const F = [], pair = new Set(), flowOf = (a, b) => M.flows.find(f => f.from === a && f.to === b);
  for (const c of connections) {
    if (!['sync', 'event', 'data'].includes(c.interaction) || !E.has(c.from) || !E.has(c.to) || E.get(c.from).kind !== 'component' || E.get(c.to).kind !== 'component') continue;
    const mf = flowOf(c.from, c.to), contract = mf?.contract ? X.C.get(mf.contract) : null;
    F.push({id: c.id, ref: c.id, kind: c.interaction, from: c.from, to: c.to, label: text(c.label, 80), condition: text(c.condition, 200), failure: text(c.failure, 220), contract: contract?.id || null, contractRef: contract?.ref || '', recorded: true});
    pair.add(c.from + '>' + c.to);
  }
  for (const f of M.flows) {
    if (pair.has(f.from + '>' + f.to) || !E.has(f.from) || !E.has(f.to)) continue;
    const contract = f.contract ? X.C.get(f.contract) : null;
    F.push({id: f.id, ref: contract?.ref || '', kind: f.async ? 'event' : 'sync', from: f.from, to: f.to, label: text(contract?.title || f.label, 80), condition: '', failure: text(contract?.failure || '', 220), contract: contract?.id || null, contractRef: contract?.ref || '', recorded: false});
    pair.add(f.from + '>' + f.to);
  }
  for (const f of F) f.gap = ['sync', 'event'].includes(f.kind) && !f.failure;
  // Parties that only start work stand outside on the left; the parties work reaches, on the right.
  for (const e of E.values()) if (e.kind === 'party') e.region = F.some(f => f.to === e.id) ? OUT_R : OUT_L;
  // Logical flows, and the interactions that carry them between the components realising each end.
  const LF = M.lflows.filter(l => R.has(l.from) && R.has(l.to)).map(l => {
    const a = R.get(l.from).realisedBy, b = R.get(l.to).realisedBy;
    const carried = F.filter(f => a.includes(f.from) && b.includes(f.to)).map(f => f.id);
    const inside = a.some(x => b.includes(x));
    return {id: l.id, from: l.from, to: l.to, label: text(l.label, 60), carriedBy: carried, inside, carried: carried.length > 0 || inside};
  });
  for (const f of F) { const ra = E.get(f.from).realises || [], rb = E.get(f.to).realises || []; f.logical = LF.filter(l => ra.includes(l.from) && rb.includes(l.to)).map(l => l.id); }
  const V = {X, M, modules, R, elements: E, flows: F, lflows: LF, findings: list(findings), proposals: list(proposals)};
  V.lanes = [OUT_L, ...modOrder, ...(([...E.values()].some(e => e.region === NONE)) ? [NONE] : []), OUT_R].filter(id => id !== OUT_L && id !== OUT_R || [...E.values()].some(e => e.region === id));
  V.pos = new Map(X.order.map((id, i) => [id, i]));
  return V;
}

export function laneInfo(V, id) {
  if (id === OUT_L) return {id, kind: 'outside', title: 'Outside', sub: 'where work comes from'};
  if (id === OUT_R) return {id, kind: 'outside', title: 'Outside', sub: 'systems it reaches'};
  if (id === NONE) return {id, kind: 'none', title: 'No module', sub: 'not placed in a Chapter 4 module'};
  const m = V.modules.get(id);
  return {id, kind: 'module', title: m?.title || id, ref: m?.ref || id, sub: m?.purpose || ''};
}

// ---------------------------------------------------------------- slicing

export function realiseScope(V, scope) {
  if (!scope || scope.kind === 'system' || !scope.id) return {kind: 'system'};
  if (V.modules.has(scope.id)) return {kind: 'module', id: scope.id};
  if (V.elements.has(scope.id) && V.elements.get(scope.id).kind === 'component') return {kind: 'part', id: scope.id};
  if (V.R.has(scope.id)) { const r = V.R.get(scope.id); return r.realisedBy.length ? {kind: 'part', id: r.realisedBy[0], focus: scope.id} : r.module !== NONE ? {kind: 'module', id: r.module, focus: scope.id} : {kind: 'system'}; }
  const f = V.flows.find(x => x.id === scope.id || x.contract === scope.id); if (f) { const a = V.elements.get(f.from); return {kind: 'part', id: a.kind === 'component' ? f.from : f.to, focus: scope.id}; }
  return {kind: 'system'};
}
export function defaultDepth(V) { return [...V.elements.values()].filter(e => e.kind === 'component').length > 30 ? 'modules' : 'components'; }

// Modules at this depth stand in flow order: each after the modules that hand it work.
function stages(V, mods) {
  const ix = new Map(mods.map((m, i) => [m, i])), st = new Map();
  const modOf = id => V.elements.get(id)?.module;
  for (const m of mods) {
    let s = 0;
    for (const f of V.flows) { const a = modOf(f.from), b = modOf(f.to); if (b === m && ix.has(a) && ix.get(a) < ix.get(m)) s = Math.max(s, (st.get(a) ?? 0) + 1); }
    st.set(m, s);
  }
  return st;
}

export function foldRealise(V, scope = {kind: 'system'}, depth = 'components', {proposal = null} = {}) {
  const sc = realiseScope(V, scope);
  let core = null, near = new Set();
  const all = [...V.elements.values()];
  if (sc.kind === 'module') core = new Set(all.filter(e => e.module === sc.id && e.kind !== 'party').map(e => e.id));
  if (sc.kind === 'part') core = new Set([sc.id]);
  if (core) for (const f of V.flows) { if (core.has(f.from)) near.add(f.to); if (core.has(f.to)) near.add(f.from); }
  const folded = depth === 'modules' && !core;
  const rowOf = id => {
    const e = V.elements.get(id);
    if (e.kind === 'party') return !core || near.has(id) ? id : 'MOD:' + e.region;
    if (core) return core.has(id) || near.has(id) ? id : 'MOD:' + e.module;
    return folded ? 'MOD:' + e.module : id;
  };
  const ordered = all.slice().sort((a, b) => (a.kind === 'hole') - (b.kind === 'hole') || (V.pos.get(a.id) ?? 1e6) - (V.pos.get(b.id) ?? 1e6) || (a.id < b.id ? -1 : 1));
  const rows = [], index = new Map();
  for (const e of ordered) {
    const rid = rowOf(e.id);
    if (index.has(rid)) { index.get(rid).members.push(e.id); continue; }
    const row = rid.startsWith('MOD:') ? {id: rid, kind: 'module', region: e.kind === 'party' ? e.region : e.module, module: e.kind === 'party' ? null : e.module, title: e.kind === 'party' ? 'Outside' : laneInfo(V, e.module).title, members: [e.id], ctx: !!core}
      : {id: rid, kind: e.kind, region: e.region, module: e.module || null, title: e.title, ref: e.ref, members: [e.id], element: e.id, ctx: !!core && !core.has(e.id), subject: sc.kind === 'part' && sc.id === e.id};
    index.set(rid, row); rows.push(row);
  }
  // An unsaved proposal stands in its module, beside the component it would work with.
  if (proposal && proposal.title) {
    const lid = list(proposal.allocations)[0]?.logicalId, mod = V.R.get(lid)?.module || V.elements.get(proposal.sourceId)?.module || NONE;
    const src = proposal.sourceId && V.elements.has(proposal.sourceId) ? rowOf(proposal.sourceId) : null;
    if (V.lanes.includes(mod)) rows.push({id: PROPOSED, kind: 'proposed', region: mod, module: mod, title: text(proposal.title, 80), ckind: proposal.kind || 'service', members: [], realises: list(proposal.allocations).map(a => a.logicalId).filter(id => V.R.has(id)), proposed: true, sourceRow: src});
  }
  for (const r of rows) {
    const es = r.members.map(id => V.elements.get(id));
    if (r.kind === 'module') r.realises = uniq(es.flatMap(e => e.realises || []));
    else if (r.kind !== 'proposed') r.realises = es[0].realises || [];
    r.data = uniq(es.flatMap(e => e.data || []));
    r.needs = uniq(es.flatMap(e => e.needs || []));
    r.components = es.filter(e => e.kind === 'component').length;
    r.holes = es.filter(e => e.kind === 'hole').length;
  }
  const rid = new Map(); for (const r of rows) for (const m of r.members) rid.set(m, r.id);
  const links = [], seen = new Map();
  for (const f of V.flows) {
    const a = rid.get(f.from), b = rid.get(f.to);
    if (!a || !b || a === b) continue;
    const k = a + '>' + b;
    if (seen.has(k)) { seen.get(k).flows.push(f.id); continue; }
    const l = {id: 'L:' + k, from: a, to: b, flows: [f.id], dim: sc.kind === 'part' ? !(f.from === sc.id || f.to === sc.id) : false};
    seen.set(k, l); links.push(l);
  }
  if (proposal && rows.some(r => r.id === PROPOSED)) {
    const src = rows.find(r => r.id === PROPOSED).sourceRow;
    if (src && rows.some(r => r.id === src)) links.push({id: 'L:' + src + '>' + PROPOSED, from: src, to: PROPOSED, flows: [], proposed: true, dim: false, label: text(proposal.relationship || 'works with', 60), ref: '', kind: 'sync', gaps: 0, contracts: []});
  }
  for (const l of links) {
    if (l.proposed) continue;
    const fs = l.flows.map(id => V.flows.find(f => f.id === id));
    l.kind = fs.every(f => f.kind === 'event') ? 'event' : fs.every(f => f.kind === 'data') ? 'data' : 'sync';
    const refs = uniq(fs.map(f => f.ref).filter(Boolean));
    l.label = fs.length === 1 ? fs[0].label : refs.length ? refs.join(' · ') : fs.length + ' interactions';
    l.ref = fs.length === 1 ? fs[0].ref : '';
    l.gaps = fs.filter(f => f.gap).length;
    l.contracts = uniq(fs.map(f => f.contractRef).filter(Boolean));
    l.logical = uniq(fs.flatMap(f => f.logical));
    l.party = fs.some(f => V.elements.get(f.from).kind === 'party' || V.elements.get(f.to).kind === 'party');
  }
  // Lanes: the modules. At the module depth of a large system, modules stand in columns in the
  // order work flows through them, so forty modules read as a page rather than a strip.
  let laneIds = V.lanes.filter(id => rows.some(r => r.region === id));
  const inner = laneIds.filter(id => id !== OUT_L && id !== OUT_R);
  let lanes = laneIds.map(id => laneInfo(V, id));
  if (folded && inner.length > 8) {
    const st = stages(V, inner), ix = id => V.modules.get(id)?.index ?? 1e6;
    const order = inner.slice().sort((a, b) => st.get(a) - st.get(b) || ix(a) - ix(b));
    const K = Math.ceil(Math.sqrt(order.length)), per = Math.ceil(order.length / K), col = new Map(order.map((m, i) => [m, Math.floor(i / per)]));
    const pos = new Map(order.map((m, i) => [m, i]));
    for (const r of rows) if (r.kind === 'module' && r.module || r.kind === 'proposed') r.region = 'COL:' + col.get(r.module);
    rows.sort((a, b) => { const k = r => (r.region === OUT_L ? -1 : r.region === OUT_R ? 1e7 : pos.get(r.module) ?? 1e6); return k(a) - k(b); });
    const used = [...new Set(order.map(m => col.get(m)))];
    lanes = [...(laneIds.includes(OUT_L) ? [laneInfo(V, OUT_L)] : []), ...used.map(c => ({id: 'COL:' + c, kind: 'stage', title: `Modules ${c * per + 1}–${Math.min((c + 1) * per, order.length)}`, sub: 'in the order work flows through them'})), ...(laneIds.includes(OUT_R) ? [laneInfo(V, OUT_R)] : [])];
  }
  for (const l of links) { const ra = rows.find(r => r.id === l.from).region, rb = rows.find(r => r.id === l.to).region; l.crosses = ra !== rb; }
  return {scope: sc, depth, lanes, rows, links, rowOf: id => rid.get(id) || null};
}

// ---------------------------------------------------------------- allocation matrix

// Responsibilities × components: which component realises which responsibility, and how.
export function allocation(V, scope = {kind: 'system'}, {proposal = null} = {}) {
  const sc = realiseScope(V, scope);
  const inScopeC = id => sc.kind === 'system' || (sc.kind === 'module' ? V.elements.get(id)?.module === sc.id : id === sc.id);
  const modIx = id => V.modules.get(id)?.index ?? 99;
  const resp = [...V.R.values()].filter(r => sc.kind === 'system' || (sc.kind === 'module' ? r.module === sc.id || r.realisedBy.some(inScopeC) : r.realisedBy.includes(sc.id)));
  resp.sort((a, b) => modIx(a.module) - modIx(b.module) || String(a.ref).localeCompare(String(b.ref)));
  const comps = [...V.elements.values()].filter(e => e.kind === 'component' && (inScopeC(e.id) || resp.some(r => r.realisedBy.includes(e.id))));
  comps.sort((a, b) => modIx(a.module) - modIx(b.module) || (V.pos.get(a.id) ?? 0) - (V.pos.get(b.id) ?? 0));
  const cols = comps.map(c => ({id: c.id, ref: c.ref, title: c.title, ckind: c.ckind, module: c.module, realises: c.realises, status: c.status, orphan: !c.realises.length}));
  if (proposal && proposal.title) {
    const mod = V.R.get(list(proposal.allocations)[0]?.logicalId)?.module || NONE, at = cols.map(c => c.module).lastIndexOf(mod);
    cols.splice(at < 0 ? cols.length : at + 1, 0, {id: PROPOSED, ref: 'Proposed', title: text(proposal.title, 80), ckind: proposal.kind || 'service', module: V.R.get(list(proposal.allocations)[0]?.logicalId)?.module || NONE, realises: list(proposal.allocations).map(a => a.logicalId), proposed: true});
  }
  const cells = [];
  for (const r of resp) {
    for (const a of r.allocations) if (cols.some(c => c.id === a.component)) {
      const kind = !a.scope || !a.current ? 'unscoped' : r.shared.includes(a.component) ? 'shared' : 'allocated';
      cells.push({resp: r.id, comp: a.component, kind, scope: a.scope, current: a.current, outside: V.elements.get(a.component).module !== r.module});
    }
    if (proposal && list(proposal.allocations).some(a => a.logicalId === r.id)) cells.push({resp: r.id, comp: PROPOSED, kind: 'allocated', scope: text(list(proposal.allocations).find(a => a.logicalId === r.id).scope, 220), current: true, outside: false, proposed: true});
  }
  const groups = [];
  for (const r of resp) if (!groups.length || groups.at(-1).module !== r.module) groups.push({module: r.module, title: laneInfo(V, r.module).title, count: 0}), groups.at(-1).count++; else groups.at(-1).count++;
  return {scope: sc, rows: resp, cols, cells, groups, unrealised: resp.filter(r => !r.realisedBy.length).map(r => r.id)};
}

// ---------------------------------------------------------------- reading

const titleOf = (V, id) => V.elements.get(id)?.title || V.R.get(id)?.title || V.M.byId.get(id)?.title || id;
const refTitle = (V, id) => { const r = V.R.get(id), e = V.elements.get(id); return r ? r.ref + ' ' + r.title : e ? (e.ref ? e.ref + ' ' : '') + e.title : titleOf(V, id); };
export function describeFlow(V, id) {
  const f = V.flows.find(x => x.id === id); if (!f) return '';
  const kind = {sync: 'asks and waits for an answer', event: 'hands work on without waiting', data: 'depends on data from'}[f.kind] || 'talks to';
  const lf = f.logical.map(l => V.lflows.find(x => x.id === l)).filter(Boolean);
  return `${titleOf(V, f.from)} ${kind === 'depends on data from' ? kind + ' ' + titleOf(V, f.to) : kind + ' — ' + titleOf(V, f.to)}${f.ref ? ' (' + f.ref + (f.label ? ' ' + f.label : '') + ')' : f.label ? ' (' + f.label + ')' : ''}.${lf.length ? ' It carries the logical flow ' + lf.map(l => `${refTitle(V, l.from)} → ${refTitle(V, l.to)} (${l.label})`).join(' and ') + '.' : ''}${f.condition ? ' Only when: ' + f.condition : ''}${['sync', 'event'].includes(f.kind) ? (f.failure ? ' If it fails: ' + f.failure : ' No failure policy is recorded.') : ''}`;
}
export function describeComponent(V, id) {
  const e = V.elements.get(id); if (!e || e.kind !== 'component') return '';
  const rs = e.realises.map(r => refTitle(V, r));
  const k = (KIND_LABEL[e.ckind] || e.ckind || 'component').toLowerCase();
  return `${e.ref} ${e.title} is ${/^[aeiou]/.test(k) ? 'an' : 'a'} ${k} in ${laneInfo(V, e.module).title}. ${rs.length ? 'It realises ' + rs.join(' and ') + '.' : 'It realises no responsibility yet.'}${e.data.length ? ' It owns ' + e.data.map(d => titleOf(V, d)).join(' and ') + '.' : ''}${e.needs.length ? ' It stands on ' + e.needs.length + ' platform capabilit' + (e.needs.length === 1 ? 'y' : 'ies') + '.' : ''}`;
}

// Observations drawn only from recorded facts, as prompts for review.
export function realiseInsights(V, scope = {kind: 'system'}) {
  const out = [], sc = realiseScope(V, scope);
  const inC = id => sc.kind === 'system' || (sc.kind === 'module' ? V.elements.get(id)?.module === sc.id : id === sc.id);
  const comps = [...V.elements.values()].filter(e => e.kind === 'component' && inC(e.id));
  const resps = [...V.R.values()].filter(r => sc.kind === 'system' || (sc.kind === 'module' ? r.module === sc.id : r.realisedBy.includes(sc.id)));
  const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);
  const holes = resps.filter(r => !r.realisedBy.length);
  if (holes.length) out.push({kind: 'gap', id: holes[0].id, text: `${plural(holes.length, 'responsibility is', 'responsibilities are')} not realised by any component: ${holes.map(r => r.ref + ' ' + r.title).join(', ')}.`, ask: `Which component should realise ${holes[0].ref} ${holes[0].title}?`});
  const orphans = comps.filter(c => !c.realises.length);
  if (orphans.length) out.push({kind: 'gap', id: orphans[0].id, text: `${plural(orphans.length, 'component realises', 'components realise')} no responsibility: ${orphans.map(c => c.ref + ' ' + c.title).join(', ')}. A component needs the responsibility that justifies it.`});
  const outside = resps.flatMap(r => r.realisedBy.filter(c => inC(c) && V.elements.get(c).module !== r.module && r.module !== NONE).map(c => ({r, c})));
  if (outside.length) out.push({kind: 'info', id: outside[0].c, text: `${outside.map(x => `${x.r.ref} ${x.r.title} (${laneInfo(V, x.r.module).title}) is realised by ${titleOf(V, x.c)} in ${laneInfo(V, V.elements.get(x.c).module).title}`).join('; ')}. A component that realises another module's work couples the two.`});
  const lf = V.lflows.filter(l => sc.kind === 'system' || resps.some(r => r.id === l.from || r.id === l.to));
  const uncarried = lf.filter(l => !l.carried && V.R.get(l.from).realisedBy.length && V.R.get(l.to).realisedBy.length);
  if (uncarried.length) out.push({kind: 'gap', id: uncarried[0].from, text: `${plural(uncarried.length, 'logical flow has', 'logical flows have')} no interaction between the components that realise ${uncarried.length === 1 ? 'its' : 'their'} ends: ${uncarried.map(l => `${refTitle(V, l.from)} → ${refTitle(V, l.to)} (${l.label})`).join('; ')}.`, ask: `How does ${titleOf(V, V.R.get(uncarried[0].from).realisedBy[0])} reach ${titleOf(V, V.R.get(uncarried[0].to).realisedBy[0])}?`});
  else if (lf.length && lf.every(l => l.carried)) out.push({kind: 'info', id: lf[0].carriedBy[0] || lf[0].from, text: `Every logical flow is carried: each of the ${plural(lf.length, 'flow', 'flows')} between responsibilities has an interaction between the components that realise them.`});
  const flows = V.flows.filter(f => inC(f.from) || inC(f.to));
  const extra = flows.filter(f => f.recorded && !f.logical.length && V.elements.get(f.from).kind === 'component' && V.elements.get(f.to).kind === 'component');
  if (extra.length) out.push({kind: 'info', id: extra[0].id, text: `${plural(extra.length, 'interaction has', 'interactions have')} no logical flow behind ${extra.length === 1 ? 'it' : 'them'} (${extra.map(f => f.ref || f.label).join(', ')}). The implementation talks where the logical design does not; say why, or add the flow in Chapter 4.`});
  const gaps = flows.filter(f => f.gap && f.recorded), cgaps = flows.filter(f => f.gap && !f.recorded);
  if (gaps.length) out.push({kind: 'risk', id: gaps[0].id, text: `${plural(gaps.length, 'interaction has', 'interactions have')} no failure policy: ${gaps.map(f => `${f.ref} ${titleOf(V, f.from)} → ${titleOf(V, f.to)}`).join('; ')}.`, ask: 'What happens when the answer is late, lost or repeated?'});
  if (cgaps.length) out.push({kind: 'risk', id: cgaps[0].id, text: `${plural(cgaps.length, 'contract', 'contracts')} with the outside ${cgaps.length === 1 ? 'has' : 'have'} no failure handling recorded in Chapter 8: ${cgaps.map(f => `${f.ref} ${f.label}`).join('; ')}. The components at the edge inherit that gap.`, ask: `What does ${titleOf(V, V.elements.get(cgaps[0].from).kind === 'component' ? cgaps[0].from : cgaps[0].to)} do when ${cgaps[0].ref} fails?`});
  const undefined_ = comps.filter(c => !c.defined);
  if (undefined_.length) out.push({kind: 'gap', id: undefined_[0].id, text: `${plural(undefined_.length, 'component has', 'components have')} an incomplete boundary (purpose, owned boundary, owner, inputs or outputs): ${undefined_.map(c => c.ref).join(', ')}.`});
  const noWhy = comps.filter(c => !c.why.adrs.length);
  if (noWhy.length) out.push({kind: 'info', id: noWhy[0].id, text: `${plural(noWhy.length, 'component has', 'components have')} no architecture decision behind ${noWhy.length === 1 ? 'it' : 'them'}: ${noWhy.map(c => c.ref + ' ' + c.title).join(', ')}. The shape is not yet explained.`, ask: `Why is ${noWhy[0].title} a separate ${KIND_LABEL[noWhy[0].ckind]?.toLowerCase() || 'component'}?`});
  const claims = new Map(); for (const c of comps) for (const d of c.data) { if (!claims.has(d)) claims.set(d, []); claims.get(d).push(c.id); }
  const twice = [...claims].filter(([, cs]) => cs.length > 1);
  if (twice.length) out.push({kind: 'risk', id: twice[0][1][0], text: `${twice.map(([d, cs]) => `${titleOf(V, d)} is claimed by ${cs.map(c => titleOf(V, c)).join(' and ')}`).join('; ')}. Choose one authority.`});
  const shared = resps.filter(r => r.shared.length);
  if (shared.length) out.push({kind: 'gap', id: shared[0].id, text: `${shared.map(r => r.ref).join(', ')} ${shared.length === 1 ? 'is' : 'are'} split between components with the same allocation scope. Say which part each one owns.`});
  const stale = resps.flatMap(r => r.allocations.filter(a => a.id && (!a.scope || !a.current) && inC(a.component)));
  if (stale.length) out.push({kind: 'gap', id: stale[0].component, text: `${plural(stale.length, 'allocation has', 'allocations have')} no scope or an out-of-date one: ${stale.map(a => a.id).join(', ')}.`});
  if (comps.length > 1) {
    const count = new Map(); for (const c of comps) for (const n of c.needs) count.set(n, (count.get(n) || 0) + 1);
    const everyone = [...count].filter(([, n]) => n === comps.length).map(([id]) => titleOf(V, id));
    if (everyone.length) out.push({kind: 'info', id: comps[0].id, text: `All ${comps.length} components stand on ${everyone.join(', ')}. Chapter 6 must provide ${everyone.length === 1 ? 'it' : 'them'} to every part.`});
  }
  const unreviewed = comps.filter(c => c.recorded && c.status !== 'reviewed');
  if (unreviewed.length && sc.kind === 'system') out.push({kind: 'info', id: unreviewed[0].id, text: `${unreviewed.length} of ${comps.length} components are ${unreviewed.every(c => c.status === 'candidate') ? 'candidates' : 'drafts or candidates'}, not yet reviewed.`});
  return out;
}

// The logical journey through the realisation: each logical flow, and what carries it.
export function realiseWalk(V) { return V.lflows.slice(); }
export function describeLogical(V, id) {
  const l = V.lflows.find(x => x.id === id); if (!l) return '';
  const a = V.R.get(l.from), b = V.R.get(l.to);
  const by = r => (r.realisedBy.length ? r.realisedBy.map(c => titleOf(V, c)).join(' and ') : 'nothing yet');
  const fs = l.carriedBy.map(f => V.flows.find(x => x.id === f));
  return `${a.ref} ${a.title} → ${b.ref} ${b.title} (${l.label}). Realised by ${by(a)} → ${by(b)}. ${l.inside ? 'Both ends are realised by the same component, so the flow stays inside it.' : fs.length ? 'Carried by ' + fs.map(f => `${f.ref || f.label} (${f.kind === 'event' ? 'event' : f.kind === 'data' ? 'data' : 'request and answer'}${f.gap ? ', no failure policy' : ''})`).join(', ') + '.' : 'No interaction carries it yet.'}`;
}
