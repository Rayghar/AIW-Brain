// Logical technology — the semantic model behind the Chapter 6 Model views.
//
// The platform the application stands on: each application component's needs, the vendor-neutral
// capabilities that fulfil them, the dependencies between those capabilities, their trust
// boundaries and failure domains, and what stops when one of them — or a whole domain — is lost,
// using Chapter 6's own simulation. Pure: it reads the recorded Chapter 6 model and never writes.
import {exchangeSource} from './exchange-model.js';
import {technologyFindings, simulateTechnology, technologyProposal, categoryName, TECHNOLOGY_CATEGORIES} from './technology-domain.js';

export const PLATFORM_SCHEMA = 'aiw.platform/1';
export const PROPOSED = 'PROPOSED';
// Platform families, the order the stack reads from bottom to top of concern.
export const FAMILIES = [
  {id: 'run', title: 'Run', sub: 'where the software executes', cats: ['compute']},
  {id: 'state', title: 'Keep state', sub: 'durable, derived and recoverable data', cats: ['transactional', 'caching', 'backup']},
  {id: 'connect', title: 'Connect', sub: 'how parts and work reach each other', cats: ['messaging', 'connectivity']},
  {id: 'trust', title: 'Trust', sub: 'who may act', cats: ['identity']},
  {id: 'operate', title: 'Operate', sub: 'evidence and recovery', cats: ['observability', 'recovery']}
];
export const familyOf = cat => FAMILIES.find(f => f.cats.includes(cat))?.id || 'other';
const list = v => (Array.isArray(v) ? v : []);
const text = (v, n = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const uniq = a => [...new Set(a)];

export function platformSource(p, {order = {}} = {}) {
  const X = exchangeSource(p, {order});
  const t = p?.technology || {};
  let findings = [];
  try { findings = technologyFindings(p); } catch { findings = []; }
  // What each capability's loss, and each failure domain's loss, stops — by the chapter's own simulation.
  const sim = (id, mode) => { try { return simulateTechnology(p, {capabilityId: id, mode, durationMinutes: 60, measurements: []}); } catch { return null; } };
  const blast = new Map(), domains = new Map();
  for (const c of list(t.capabilities)) {
    const s = sim(c.id, 'capability'); if (s) blast.set(c.id, s);
    const d = text(c.failureDomain, 80); if (d && !domains.has(d.toLowerCase())) { const s2 = sim(c.id, 'domain'); if (s2) domains.set(d.toLowerCase(), {title: d, sim: s2}); }
  }
  // Which of the chapter's proposals would change something here.
  const proposals = [];
  for (const c of list(t.capabilities)) for (const key of ['isolate', 'restore']) {
    if (key === 'isolate' && c.continuity === 'redundant') continue;
    if (key === 'restore' && (!['transactional', 'messaging'].includes(c.category) || (c.recoveryPlan && list(t.dependencies).some(d => d.from === c.id && d.type === 'resilience')))) continue;
    try { const q = technologyProposal(p, key, c.id); if (q) proposals.push({key, capability: c.id, effect: q.effect}); } catch { /* optional */ }
  }
  for (const n of list(t.needs)) if (!list(t.mappings).some(m => m.needId === n.id)) { try { const q = technologyProposal(p, 'missing', n.applicationId, n.id); if (q) proposals.push({key: 'missing', need: n.id, component: n.applicationId, capability: q.record?.id || null, effect: q.effect}); } catch { /* optional */ } }
  return platformModel(X, {capabilities: list(t.capabilities), needs: list(t.needs), mappings: list(t.mappings), dependencies: list(t.dependencies), boundaries: list(t.boundaries), appBoundaries: t.applicationBoundaries || {}, findings, blast, domains, proposals});
}

export function platformModel(X, {capabilities = [], needs = [], mappings = [], dependencies = [], boundaries = [], appBoundaries = {}, findings = [], blast = new Map(), domains = new Map(), proposals = []} = {}) {
  const {M} = X;
  const B = new Map(boundaries.map(b => [b.id, {id: b.id, ref: b.ref || b.id, title: text(b.title, 80), owner: text(b.owner, 80), policy: text(b.policy, 240)}]));
  // Modules in the anatomy's order, and the components within them.
  const comps = X.order.filter(id => M.T(id) === 'component');
  const modOrder = [];
  for (const id of comps) { const m = M.mod.get(id) || 'NONE'; if (!modOrder.includes(m)) modOrder.push(m); }
  const modules = new Map(modOrder.map((id, i) => [id, {id, title: M.byId.get(id)?.title || (id === 'NONE' ? 'No module' : id), index: i}]));
  const K = new Map(comps.map(id => { const o = M.byId.get(id); return [id, {id, ref: o.ref || id, title: o.title, module: M.mod.get(id) || 'NONE', boundary: appBoundaries[id] || null, needs: []}]; }));
  // Capabilities.
  const C = new Map(capabilities.map(c => [c.id, {id: c.id, ref: c.ref || c.id, category: c.category, family: familyOf(c.category), title: text(c.title, 80), purpose: text(c.purpose, 260), boundary: text(c.boundary, 260), owner: text(c.owner, 80), boundaryId: c.boundaryId || null,
    failureDomain: text(c.failureDomain, 80), continuity: c.continuity || 'single', alternateDomain: text(c.alternateDomain, 80), continuityPlan: text(c.continuityPlan, 240), recoveryPlan: text(c.recoveryPlan, 240), recoveryOwner: text(c.recoveryOwner, 80), recoveryMinutes: c.recoveryMinutes ?? '', lossMinutes: c.lossMinutes ?? '', status: c.status || 'candidate',
    drivers: list(c.driverIds), decisions: list(c.decisionIds), needs: [], users: []}]));
  // Needs, and the capability that fulfils each (or nothing).
  const N = new Map();
  for (const n of needs) {
    if (!K.has(n.applicationId)) continue;
    const ms = mappings.filter(m => m.needId === n.id && C.has(m.capabilityId));
    const x = {id: n.id, component: n.applicationId, category: n.category, criticality: n.criticality === 'degraded' ? 'degraded' : 'essential', description: text(n.description, 240), confirmed: !!n.confirmed, capabilities: ms.map(m => m.capabilityId), scope: text(ms[0]?.scope, 240), fit: ms.every(m => C.get(m.capabilityId).category === n.category)};
    N.set(n.id, x); K.get(n.applicationId).needs.push(n.id);
    for (const cid of x.capabilities) { C.get(cid).needs.push(n.id); C.get(cid).users.push(n.applicationId); }
  }
  for (const c of C.values()) c.users = uniq(c.users);
  const D = dependencies.filter(d => C.has(d.from) && C.has(d.to)).map(d => ({id: d.id, from: d.from, to: d.to, type: d.type || 'dependency', critical: !!d.critical, label: text(d.label, 80), policy: text(d.policy, 200)}));
  // Essential: fulfils an essential need, directly or through critical dependencies.
  const essential = new Set([...N.values()].filter(n => n.criticality === 'essential').flatMap(n => n.capabilities));
  for (let i = 0; i < C.size; i++) { const before = essential.size; for (const d of D) if (d.critical && ['dependency', 'trust'].includes(d.type) && essential.has(d.from)) essential.add(d.to); if (before === essential.size) break; }
  for (const c of C.values()) {
    c.essential = essential.has(c.id);
    c.single = c.essential && c.continuity === 'single';
    c.unused = !c.needs.length && !D.some(d => d.from === c.id || d.to === c.id);
    const s = blast.get(c.id);
    c.blast = s ? {caps: s.capabilities.map(x => ({id: x.id, state: x.state, reason: text(x.reason, 160)})), stops: s.applications.filter(a => a.state === 'unavailable').map(a => a.id), degrades: s.applications.filter(a => a.state !== 'unavailable').map(a => a.id)} : {caps: [], stops: [], degrades: []};
    c.recovers = D.filter(d => d.from === c.id && d.type === 'resilience').map(d => d.to);
  }
  const unsupported = [...N.values()].filter(n => !n.capabilities.length);
  const doms = new Map([...domains].map(([k, v]) => [k, {title: v.title, caps: v.sim.capabilities.map(x => ({id: x.id, state: x.state, reason: text(x.reason, 160)})), stops: v.sim.applications.filter(a => a.state === 'unavailable').map(a => a.id), degrades: v.sim.applications.filter(a => a.state !== 'unavailable').map(a => a.id), members: [...C.values()].filter(c => c.failureDomain.toLowerCase() === k).map(c => c.id)}]));
  return {X, M, modules, components: K, capabilities: C, needs: N, deps: D, boundaries: B, unsupported, domains: doms, findings: list(findings), proposals: list(proposals)};
}

export const boundaryTitle = (P, id) => (id && P.boundaries.get(id) ? P.boundaries.get(id).ref + ' · ' + P.boundaries.get(id).title : 'No trust boundary');

// ---------------------------------------------------------------- slicing

export function platformScope(P, scope) {
  if (!scope || scope.kind === 'system' || !scope.id) return {kind: 'system'};
  if (P.modules.has(scope.id)) return {kind: 'module', id: scope.id};
  if (P.capabilities.has(scope.id)) return {kind: 'capability', id: scope.id};
  if (P.components.has(scope.id)) { const m = P.components.get(scope.id).module; return {kind: 'module', id: m, focus: scope.id}; }
  if (P.needs.has(scope.id)) { const n = P.needs.get(scope.id); return n.capabilities[0] ? {kind: 'capability', id: n.capabilities[0], focus: scope.id} : {kind: 'module', id: P.components.get(n.component).module, focus: scope.id}; }
  return {kind: 'system'};
}
export function defaultDepth(P) { return P.components.size > 30 ? 'modules' : 'components'; }

// Rows are capabilities, grouped by family; columns are components (or modules), grouped by module.
export function foldPlatform(P, scope = {kind: 'system'}, depth = 'components', {proposal = null} = {}) {
  const sc = platformScope(P, scope);
  let capIds = [...P.capabilities.keys()], compIds = [...P.components.keys()];
  if (sc.kind === 'capability') {
    const keep = new Set([sc.id]);
    for (const d of P.deps) { if (d.from === sc.id) keep.add(d.to); if (d.to === sc.id) keep.add(d.from); }
    capIds = capIds.filter(id => keep.has(id));
    const users = new Set(capIds.flatMap(id => P.capabilities.get(id).users));
    compIds = compIds.filter(id => users.has(id));
  }
  if (sc.kind === 'module') compIds = compIds.filter(id => P.components.get(id).module === sc.id);
  const folded = depth === 'modules' && sc.kind === 'system';
  // Columns.
  const cols = [];
  if (folded) for (const m of P.modules.values()) { const members = compIds.filter(id => P.components.get(id).module === m.id); if (members.length) cols.push({id: 'MOD:' + m.id, kind: 'module', module: m.id, title: m.title, members}); }
  else for (const id of compIds) { const k = P.components.get(id); cols.push({id, kind: 'component', module: k.module, title: k.title, ref: k.ref, members: [id], boundary: k.boundary}); }
  const colOf = new Map(cols.flatMap(c => c.members.map(m => [m, c.id])));
  // Rows: capabilities by family, the most-used first; a row for each category that has needs but no capability.
  const famIx = f => { const i = FAMILIES.findIndex(x => x.id === f); return i < 0 ? 99 : i; };
  const catIx = c => TECHNOLOGY_CATEGORIES.findIndex(x => x[0] === c);
  const rows = capIds.map(id => { const c = P.capabilities.get(id); return {id, kind: 'capability', family: c.family, category: c.category, title: c.title, ref: c.ref}; });
  const cats = new Set(rows.map(r => r.category));
  for (const n of P.unsupported) if (colOf.has(n.component) && !cats.has(n.category) && sc.kind !== 'capability') { cats.add(n.category); rows.push({id: 'MISSING:' + n.category, kind: 'missing', family: familyOf(n.category), category: n.category, title: categoryName(n.category), ref: ''}); }
  if (proposal?.record && !P.capabilities.has(proposal.record.id) && !rows.some(r => r.category === proposal.record.category && r.kind === 'missing')) rows.push({id: PROPOSED, kind: 'proposed', family: familyOf(proposal.record.category), category: proposal.record.category, title: text(proposal.record.title, 80), ref: 'Proposed'});
  else if (proposal?.record && !P.capabilities.has(proposal.record.id)) { const r = rows.find(x => x.kind === 'missing' && x.category === proposal.record.category); r.id = PROPOSED; r.kind = 'proposed'; r.title = text(proposal.record.title, 80); r.ref = 'Proposed'; }
  const users = r => (r.kind === 'capability' ? P.capabilities.get(r.id).users.length : 0);
  rows.sort((a, b) => famIx(a.family) - famIx(b.family) || users(b) - users(a) || catIx(a.category) - catIx(b.category) || String(a.ref).localeCompare(String(b.ref)));
  const rowOfCap = new Map(rows.filter(r => r.kind === 'capability').map(r => [r.id, r.id]));
  const rowOfCat = cat => rows.find(r => r.category === cat && r.kind !== 'capability')?.id || rows.find(r => r.category === cat)?.id || null;
  // Cells: each need where it lands — on the capability that fulfils it, or unsupported on the row of its category.
  const cellMap = new Map();
  const cell = (row, col) => { const k = row + '|' + col; if (!cellMap.has(k)) cellMap.set(k, {row, col, needs: [], essential: 0, degraded: 0, unsupported: 0, crossing: false, proposed: false}); return cellMap.get(k); };
  for (const n of P.needs.values()) {
    const col = colOf.get(n.component); if (!col) continue;
    const targets = n.capabilities.filter(id => rowOfCap.has(id));
    if (n.capabilities.length && !targets.length) continue;
    const rowIds = targets.length ? targets : [proposal && proposal.needId === n.id && rows.some(r => r.id === PROPOSED) ? PROPOSED : rowOfCat(n.category)].filter(Boolean);
    for (const rid of rowIds) {
      const c = cell(rid, col); c.needs.push(n.id); c[n.criticality]++;
      if (!n.capabilities.length) c.unsupported++;
      const cap = P.capabilities.get(rid), kb = P.components.get(n.component).boundary;
      if (cap && kb && cap.boundaryId && kb !== cap.boundaryId) c.crossing = true;
    }
  }
  // An unsaved proposal: new mappings, and the capability it would change.
  if (proposal?.record) {
    const rid = P.capabilities.has(proposal.record.id) ? proposal.record.id : PROPOSED;
    for (const m of list(proposal.mappings)) { const n = P.needs.get(m.needId); if (!n || !colOf.has(n.component) || !rows.some(r => r.id === rid)) continue; const c = cell(rid, colOf.get(n.component)); if (!c.needs.includes(n.id)) { c.needs.push(n.id); c[n.criticality]++; } if (!n.capabilities.includes(rid)) c.proposed = true; }
  }
  const cells = [...cellMap.values()];
  // Dependencies between the rows in view, and any a proposal would add.
  const inRows = new Set(rows.map(r => r.id));
  const deps = P.deps.filter(d => inRows.has(d.from) && inRows.has(d.to)).map(d => ({...d}));
  if (proposal?.record) for (const d of list(proposal.dependencies)) { const from = P.capabilities.has(d.from) ? d.from : PROPOSED; if (inRows.has(from) && inRows.has(d.to)) deps.push({id: 'PD:' + from + '>' + d.to, from, to: d.to, type: d.type || 'resilience', critical: !!d.critical, label: text(d.label, 80), policy: text(d.policy, 200), proposed: true}); }
  const groups = [];
  for (const r of rows) if (!groups.length || groups.at(-1).family !== r.family) groups.push({family: r.family, title: FAMILIES.find(f => f.id === r.family)?.title || 'Other', count: 1}); else groups.at(-1).count++;
  return {scope: sc, depth: folded ? 'modules' : 'components', rows, cols, cells, deps, groups, colOf: id => colOf.get(id) || null};
}

// ---------------------------------------------------------------- failure

// What a lost capability — or a lost failure domain — stops, from the chapter's own simulation.
export function failureOf(P, fail) {
  if (!fail?.id) return null;
  if (fail.mode === 'domain') { const c = P.capabilities.get(fail.id), d = c && P.domains.get(c.failureDomain.toLowerCase()); return d ? {mode: 'domain', id: fail.id, title: d.title, caps: d.caps, stops: d.stops, degrades: d.degrades, first: d.members} : null; }
  const c = P.capabilities.get(fail.id); if (!c) return null;
  return {mode: 'capability', id: c.id, title: c.title, caps: c.blast.caps, stops: c.blast.stops, degrades: c.blast.degrades, first: [c.id]};
}

// ---------------------------------------------------------------- reading

const titleOf = (P, id) => P.capabilities.get(id)?.title || P.components.get(id)?.title || P.M.byId.get(id)?.title || id;
export function describeCapability(P, id) {
  const c = P.capabilities.get(id); if (!c) return '';
  const cont = c.continuity === 'redundant' ? `a redundant path in ${c.alternateDomain || 'another domain'}` : c.continuity === 'bypass' ? 'a declared bypass' : 'a single path';
  return `${c.ref} ${c.title} (${categoryName(c.category)}) serves ${c.users.length} component${c.users.length === 1 ? '' : 's'}${c.needs.length ? ` through ${c.needs.length} need${c.needs.length === 1 ? '' : 's'}` : ''}. It sits in ${c.failureDomain || 'no named failure domain'} with ${cont}. If it fails, ${c.blast.stops.length ? c.blast.stops.length + ' of ' + P.components.size + ' components stop' : 'no component stops'}${c.blast.degrades.length ? ' and ' + c.blast.degrades.length + ' degrade' : ''}.`;
}
export function describeNeed(P, id) {
  const n = P.needs.get(id); if (!n) return '';
  const dot = v => String(v).replace(/[.\s]+$/, '');
  return `${titleOf(P, n.component)} needs ${categoryName(n.category).toLowerCase()} (${n.criticality}): ${dot(n.description)}. ${n.capabilities.length ? `Fulfilled by ${n.capabilities.map(c => P.capabilities.get(c).ref + ' ' + titleOf(P, c)).join(' and ')}${n.scope && n.scope !== n.description ? ' — ' + dot(n.scope) : ''}.` : 'No capability fulfils it yet.'}`;
}

export function platformInsights(P, scope = {kind: 'system'}) {
  const out = [], sc = platformScope(P, scope), all = P.components.size;
  const inC = id => sc.kind === 'system' || (sc.kind === 'module' ? P.components.get(id)?.module === sc.id : P.capabilities.get(sc.id)?.users.includes(id));
  const caps = [...P.capabilities.values()].filter(c => sc.kind === 'system' || (sc.kind === 'capability' ? c.id === sc.id || P.deps.some(d => (d.from === sc.id && d.to === c.id) || (d.to === sc.id && d.from === c.id)) : c.users.some(inC)));
  const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);
  const unsup = P.unsupported.filter(n => inC(n.component));
  if (unsup.length) out.push({kind: 'gap', id: unsup[0].id, text: `${plural(unsup.length, 'application need has', 'application needs have')} no capability: ${unsup.map(n => `${titleOf(P, n.component)} · ${categoryName(n.category)}`).join('; ')}.`, ask: `Which capability should support ${titleOf(P, unsup[0].component)}'s ${categoryName(unsup[0].category).toLowerCase()} need?`});
  const doms = [...P.domains.values()].filter(d => d.members.some(id => caps.some(c => c.id === id)));
  if (doms.length === 1 && doms[0].members.length > 1) out.push({kind: 'risk', id: doms[0].members[0], text: `All ${doms[0].members.length} capabilities share one failure domain, ${doms[0].title}. Losing it stops ${doms[0].stops.length} of ${all} components.`, ask: 'Which capabilities need to survive the loss of the primary domain?'});
  const wide = caps.filter(c => c.blast.stops.length > 1).sort((a, b) => b.blast.stops.length - a.blast.stops.length);
  if (wide.length) out.push({kind: 'risk', id: wide[0].id, text: `${wide.map(c => `${c.title} (${c.blast.stops.length} of ${all}${c.blast.caps.length > 1 ? ', through ' + c.blast.caps.filter(x => x.id !== c.id).map(x => titleOf(P, x.id)).join(', ') : ''})`).slice(0, 4).join('; ')}${wide.length > 4 ? '; …' : ''} — each stops more than one component when it fails.`});
  const chains = P.deps.filter(d => d.critical && ['dependency', 'trust'].includes(d.type) && caps.some(c => c.id === d.from || c.id === d.to));
  if (chains.length) out.push({kind: 'info', id: chains[0].from, text: `Critical chain: ${chains.map(d => `${titleOf(P, d.from)} → ${titleOf(P, d.to)} (${d.label})`).join('; ')}. A failure lower in the chain stops everything above it.`});
  const single = caps.filter(c => c.single);
  if (single.length) out.push({kind: 'gap', id: single[0].id, text: `${plural(single.length, 'essential capability has', 'essential capabilities have')} a single support path: ${single.map(c => c.ref).join(', ')}. Record a continuity arrangement, or carry the risk explicitly.`});
  const unsafe = caps.filter(c => c.continuity === 'bypass' && ['identity', 'transactional'].includes(c.category));
  if (unsafe.length) out.push({kind: 'risk', id: unsafe[0].id, text: `${unsafe.map(c => c.title).join(', ')} declare${unsafe.length === 1 ? 's' : ''} a bypass. Identity and authoritative state must not fail open.`});
  const norec = caps.filter(c => ['transactional', 'messaging'].includes(c.category) && (!c.recoveryPlan || !c.recovers.length));
  if (norec.length) out.push({kind: 'gap', id: norec[0].id, text: `${norec.map(c => c.title).join(' and ')} ${norec.length === 1 ? 'has' : 'have'} no recovery plan or recovery dependency. Durable state and work need a restorable copy and an owner for restoring it.`, ask: `Where does ${norec[0].title} restore from, and who decides when to resume?`});
  const unused = caps.filter(c => c.unused);
  if (unused.length) out.push({kind: 'info', id: unused[0].id, text: `${unused.map(c => c.ref + ' ' + c.title).join(', ')} ${unused.length === 1 ? 'is' : 'are'} not used by any component or dependency. Keep it only if a need will appear.`});
  const cross = [...P.needs.values()].filter(n => inC(n.component) && n.capabilities.some(cid => { const c = P.capabilities.get(cid), kb = P.components.get(n.component).boundary; return c.boundaryId && kb && c.boundaryId !== kb; }));
  if (cross.length) { const byB = new Map(); for (const n of cross) for (const cid of n.capabilities) { const b = P.capabilities.get(cid).boundaryId; byB.set(b, (byB.get(b) || new Set()).add(cid)); } out.push({kind: 'info', id: cross[0].capabilities[0], text: `${plural(cross.length, 'need reaches', 'needs reach')} a capability in another trust boundary: ${[...byB].map(([b, cs]) => `${boundaryTitle(P, b)} (${[...cs].map(c => titleOf(P, c)).join(', ')})`).join('; ')}. Each crossing follows that boundary's policy.`}); }
  const noWhy = caps.filter(c => !c.drivers.length && !c.decisions.length);
  if (noWhy.length && sc.kind === 'system') out.push({kind: 'info', id: noWhy[0].id, text: `${plural(noWhy.length, 'capability has', 'capabilities have')} no quality driver or decision of its own; ${noWhy.length === 1 ? 'it relies' : 'they rely'} on the reasons of the components that need ${noWhy.length === 1 ? 'it' : 'them'}.`});
  const unconfirmed = [...P.needs.values()].filter(n => inC(n.component) && !n.confirmed);
  if (unconfirmed.length && sc.kind === 'system') out.push({kind: 'info', id: unconfirmed[0].id, text: `${unconfirmed.length} of ${P.needs.size} application needs are not yet confirmed against the Chapter 5 components.`});
  return out;
}
