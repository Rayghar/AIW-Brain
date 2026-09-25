// Security — the semantic model behind the Chapter 9 Model views.
//
// A threat model in the classic sense: the parts that act (components), the parties outside,
// the stores and platform they reach, the flows between them, and the trust boundaries those
// flows cross. Threats and controls sit on what they concern, and coverage follows the chapter's
// own rule: each thing a threat affects needs a linked control that covers it, or a recorded
// treatment. Pure: it reads recorded contracts, boundaries, threats and controls and never writes.
import {exchangeSource} from './exchange-model.js';
import {threats as threatsOf, controls as controlsOf, securityFindings, assuranceLabel, latestRisk} from './security-domain.js';

export const THREAT_SCHEMA = 'aiw.threat/1';
const list = v => (Array.isArray(v) ? v : []);
const text = (v, n = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
export const OUT_L = 'OUT:in', OUT_R = 'OUT:out';
// The chapter's control proposal that fits each threat category.
export const PROPOSAL_FOR = {'Unauthorised action': 'authority', 'Replay or tampering': 'replay', 'Data disclosure': 'minimise', 'Missing evidence': 'audit'};

export function threatSource(p, {order = {}} = {}) {
  const X = exchangeSource(p, {order});
  let findings = [];
  try { findings = securityFindings(p); } catch { findings = []; }
  const treatment = new Map(); for (const t of threatsOf(p)) { try { const r = latestRisk(p, t.id); if (r?.treatment) treatment.set(t.id, r.treatment); } catch { /* optional */ } }
  const assurance = new Map(); for (const c of controlsOf(p)) { try { assurance.set(c.id, assuranceLabel(p, c)); } catch { assurance.set(c.id, ''); } }
  return threatModel(X, {boundaries: list(p?.technology?.boundaries), appBoundaries: p?.technology?.applicationBoundaries || {}, threats: threatsOf(p), controls: controlsOf(p), findings, treatment, assurance});
}

export function threatModel(X, {boundaries = [], appBoundaries = {}, threats = [], controls = [], findings = [], treatment = new Map(), assurance = new Map()} = {}) {
  const {M} = X;
  const B = boundaries.map((b, i) => ({id: b.id, ref: b.ref || b.id, title: text(b.title, 80), owner: text(b.owner, 80), policy: text(b.policy, 260), index: i}));
  const bset = new Set(B.map(b => b.id));
  const regionOf = id => { const t = M.T(id); if (t === 'party') return null; const r = (M.inBound.get(id) || []).find(b => bset.has(b)) || appBoundaries[id]; return bset.has(r) ? r : 'NONE'; };
  // Threats and controls, with the chapter's coverage rule per affected object.
  const TH = new Map(threats.map(t => [t.id, {id: t.id, ref: t.ref, title: text(t.title, 140), category: text(t.category, 60), priority: t.priority || 'Moderate', actor: text(t.actor, 160), scenario: text(t.scenario, 260), consequence: text(t.consequence, 220), owner: text(t.owner, 80), targets: list(t.targetIds), treatment: treatment.get(t.id) || null}]));
  const CT = new Map(controls.map(c => [c.id, {id: c.id, ref: c.ref, title: text(c.title, 120), category: text(c.category, 60), purpose: text(c.purpose, 260), owner: text(c.owner, 80), enforcement: text(c.enforcement, 200), mechanism: text(c.mechanism, 200), failureMode: c.failureMode || 'Unspecified', failureResponse: text(c.failureResponse, 200), targets: list(c.targetIds), threats: list(c.threatIds).filter(id => TH.has(id)), assurance: assurance.get(c.id) || ''}]));
  for (const t of TH.values()) {
    t.controls = [...CT.values()].filter(c => c.threats.includes(t.id)).map(c => c.id);
    t.coverage = new Map(t.targets.map(id => [id, t.controls.some(cid => CT.get(cid).targets.includes(id))]));
    t.covered = [...t.coverage.values()].every(Boolean) || ['accept', 'avoid'].includes(t.treatment);
  }
  const threatsOn = id => [...TH.values()].filter(t => t.targets.includes(id)).map(t => t.id);
  const controlsOn = id => [...CT.values()].filter(c => c.targets.includes(id)).map(c => c.id);
  // What protection an object has: exposed (a threat is not covered here), guarded, or unexamined.
  const status = id => {
    const ts = threatsOn(id), cs = controlsOn(id);
    const open = ts.filter(tid => { const t = TH.get(tid); return !['accept', 'avoid'].includes(t.treatment) && !t.coverage.get(id); });
    return {threats: ts, controls: cs, open, state: open.length ? 'exposed' : ts.length || cs.length ? 'guarded' : 'unexamined'};
  };
  // Elements: parts that act, parties outside, and the platform and stores they reach.
  const E = new Map();
  for (const id of X.order) E.set(id, {id, kind: M.T(id) === 'party' ? 'party' : 'component', title: M.byId.get(id)?.title || id, region: regionOf(id), module: M.mod.get(id) || null});
  for (const c of M.cap) { const users = (M.capUsers.get(c.id) || []).filter(u => E.has(u)); if (users.length) E.set(c.id, {id: c.id, kind: 'platform', title: c.title, region: regionOf(c.id), users}); }
  for (const e of E.values()) { e.data = [...X.D.values()].filter(d => d.authority === e.id).map(d => d.id); e.protection = status(e.id); }
  // Flows: every contract between elements, and every use of a platform service or store.
  const F = [];
  for (const l of X.links) if (E.has(l.from) && E.has(l.to)) { const c = l.contract ? X.C.get(l.contract) : null; F.push({id: l.id, kind: 'contract', from: l.from, to: l.to, contract: l.contract, ref: c?.ref || '', title: c?.title || l.label, async: l.async, data: c ? [...new Set([...c.req, ...c.res])] : [], protection: status(l.contract || l.id)}); }
  for (const e of E.values()) if (e.kind === 'platform') for (const u of e.users) F.push({id: 'U:' + u + '>' + e.id, kind: 'uses', from: u, to: e.id, ref: '', title: 'uses ' + e.title, data: [], protection: status(e.id)});
  // Parties that only start work stand outside on the left; the parties work reaches, on the right.
  for (const e of E.values()) if (e.kind === 'party') e.region = F.some(f => f.to === e.id) ? OUT_R : OUT_L;
  const T = {X, M, boundaries: B, elements: E, flows: F, threats: TH, controls: CT, findings: list(findings), status};
  T.lanes = laneOrder(T);
  for (const f of F) { f.fromRegion = E.get(f.from).region; f.toRegion = E.get(f.to).region; f.crosses = f.fromRegion !== f.toRegion; }
  T.journey = journeyFlows(T);
  return T;
}

// Region order: outside on the left, boundaries in the order that least often asks a flow to
// pass across a boundary it does not enter (recorded order breaks ties), outside on the right.
function laneOrder(T) {
  const used = new Set([...T.elements.values()].map(e => e.region));
  const inner = [...T.boundaries.map(b => b.id), 'NONE'].filter(id => used.has(id) || T.boundaries.some(b => b.id === id));
  const weight = new Map();
  for (const f of T.flows) { const a = T.elements.get(f.from).region, b = T.elements.get(f.to).region; if (a === b) continue; const k = a + '|' + b; weight.set(k, (weight.get(k) || 0) + (f.kind === 'contract' ? 2 : 1)); }
  const cost = order => { const full = [OUT_L, ...order, OUT_R], pos = new Map(full.map((id, i) => [id, i])); let c = 0; for (const [k, w] of weight) { const [a, b] = k.split('|'); if (pos.has(a) && pos.has(b)) c += w * Math.max(0, Math.abs(pos.get(a) - pos.get(b)) - 1); } return c; };
  let best = inner.slice(), bestC = cost(best);
  if (inner.length <= 7) {
    const perm = (arr, k = 0) => { if (k === arr.length) { const c = cost(arr); if (c < bestC - 1e-9) { bestC = c; best = arr.slice(); } return; } for (let i = k; i < arr.length; i++) { [arr[k], arr[i]] = [arr[i], arr[k]]; perm(arr, k + 1); [arr[k], arr[i]] = [arr[i], arr[k]]; } };
    perm(inner.slice());
  }
  const out = [OUT_L, ...best, OUT_R].filter(id => id === OUT_L || id === OUT_R ? [...T.elements.values()].some(e => e.region === id) : id !== 'NONE' || used.has('NONE'));
  return out;
}
export function laneInfo(T, id) {
  if (id === OUT_L) return {id, kind: 'outside', title: 'Outside', sub: 'where work comes from'};
  if (id === OUT_R) return {id, kind: 'outside', title: 'Outside', sub: 'systems it reaches'};
  if (id === 'NONE') return {id, kind: 'none', title: 'No trust boundary', sub: 'not assigned to a boundary'};
  const b = T.boundaries.find(x => x.id === id);
  return {id, kind: 'boundary', title: b?.title || id, ref: b?.ref || id, sub: b?.policy || '', owner: b?.owner || ''};
}

// The flows of the first business journey, in order — the path a threat walk follows.
function journeyFlows(T) {
  const s = T.X.scenarios.find(x => x.kind === 'journey') || T.X.scenarios.find(x => x.kind === 'entry') || null;
  if (!s) return [];
  const seen = new Set(), out = [];
  for (const e of s.events) if (e.t === 'call') { const f = T.flows.find(x => x.kind === 'contract' && (x.contract ? x.contract === e.contract : x.id === e.link)); if (f && !seen.has(f.id)) { seen.add(f.id); out.push(f.id); } }
  return out;
}

// Boundary crossings as the model draws them: each contract that crosses, and each entry into a
// platform service or store from another region (uses of one element from one region are one entry).
export function crossingsOf(T, pred = () => true) {
  const out = [], entries = new Map();
  for (const f of T.flows) {
    if (!f.crosses || !pred(f)) continue;
    if (f.kind === 'contract') { out.push({kind: 'contract', id: f.id, from: f.from, to: f.to, fromRegion: f.fromRegion, toRegion: f.toRegion, state: f.protection.state, flows: [f.id]}); continue; }
    const k = f.to + '<' + f.fromRegion;
    if (!entries.has(k)) { const e = {kind: 'entry', id: 'E:' + k, from: f.from, to: f.to, fromRegion: f.fromRegion, toRegion: f.toRegion, state: f.protection.state, flows: []}; entries.set(k, e); out.push(e); }
    entries.get(k).flows.push(f.id);
  }
  return out;
}

// ---------------------------------------------------------------- slicing

export function threatScope(T, scope) {
  if (!scope || scope.kind === 'system' || !scope.id) return {kind: 'system'};
  if (T.boundaries.some(b => b.id === scope.id) || scope.id === OUT_L || scope.id === OUT_R) return {kind: 'boundary', id: scope.id};
  if (T.elements.has(scope.id)) return {kind: 'part', id: scope.id};
  const f = T.flows.find(x => x.contract === scope.id || x.id === scope.id); if (f) return {kind: 'part', id: T.elements.get(f.from).kind === 'component' ? f.from : f.to, focus: scope.id};
  const d = T.X.D.get(scope.id); if (d?.authority && T.elements.has(d.authority)) return {kind: 'part', id: d.authority, focus: scope.id};
  return {kind: 'system'};
}
export function defaultDepth(T) { return T.elements.size > 26 ? 'boundaries' : 'parts'; }

// Elements at a scope and depth. A folded region becomes one element that stands for all of it.
export function foldThreat(T, scope = {kind: 'system'}, depth = 'parts') {
  const sc = threatScope(T, scope);
  const shownPlatform = e => depth === 'all' || e.region !== 'NONE' && e.users.some(u => T.elements.get(u).region !== e.region);
  let core = null, near = new Set();
  if (sc.kind === 'boundary') core = new Set([...T.elements.values()].filter(e => e.region === sc.id).map(e => e.id));
  if (sc.kind === 'part') core = new Set([sc.id]);
  if (core) for (const f of T.flows) { if (core.has(f.from)) near.add(f.to); if (core.has(f.to)) near.add(f.from); }
  const rowOf = id => {
    const e = T.elements.get(id); if (!e) return null;
    if (e.kind === 'platform' && !shownPlatform(e) && !(core?.has(id))) return null;
    if (core) return core.has(id) || near.has(id) ? id : 'REG:' + e.region;
    // Folding stops at the system edge: parties outside are not ours to group.
    if (depth === 'boundaries') return e.kind === 'party' ? id : 'REG:' + e.region;
    return id;
  };
  const rows = [], index = new Map();
  const laneIx = new Map(T.lanes.map((l, i) => [l, i]));
  const ordered = [...T.elements.values()].sort((a, b) => (laneIx.get(a.region) ?? 99) - (laneIx.get(b.region) ?? 99) || (a.kind === 'platform') - (b.kind === 'platform') || (a.kind === 'platform' ? (b.users.length - a.users.length) : 0) || (T.X.pos.get(a.id) ?? 1e6) - (T.X.pos.get(b.id) ?? 1e6) || (a.id < b.id ? -1 : 1));
  for (const e of ordered) {
    const rid = rowOf(e.id); if (!rid) continue;
    if (index.has(rid)) { index.get(rid).members.push(e.id); continue; }
    const row = rid.startsWith('REG:') ? {id: rid, kind: 'region', region: e.region, title: laneInfo(T, e.region).title, members: [e.id], ctx: !!core} : {id: rid, kind: e.kind, region: e.region, title: e.title, members: [e.id], element: e.id, ctx: !!core && !core.has(e.id), subject: sc.kind === 'part' && sc.id === e.id};
    index.set(rid, row); rows.push(row);
  }
  for (const r of rows) {
    const es = r.members.map(id => T.elements.get(id));
    r.data = es.flatMap(e => e.data);
    const st = r.kind === 'region' ? null : T.elements.get(r.element).protection;
    r.threats = st ? st.threats : []; r.controls = st ? st.controls : []; r.open = st ? st.open : [];
  }
  const rid = new Map(); for (const r of rows) for (const m of r.members) rid.set(m, r.id);
  const links = [], seen = new Map();
  for (const f of T.flows) {
    const a = rid.get(f.from), b = rid.get(f.to);
    if (!a || !b || a === b) continue;
    const k = a + '>' + b;
    if (seen.has(k)) { const l = seen.get(k); l.flows.push(f.id); continue; }
    const l = {id: 'L:' + k, from: a, to: b, flows: [f.id], dim: sc.kind === 'part' ? !(f.from === sc.id || f.to === sc.id) : false};
    seen.set(k, l); links.push(l);
  }
  for (const l of links) {
    const fs = l.flows.map(id => T.flows.find(f => f.id === id)), ps = fs.map(f => f.protection);
    l.kind = fs.every(f => f.kind === 'uses') ? 'uses' : 'contract';
    l.state = ps.some(p => p.state === 'exposed') ? 'exposed' : ps.some(p => p.state === 'guarded') ? 'guarded' : 'unexamined';
    l.threats = [...new Set(ps.flatMap(p => p.threats))]; l.controls = [...new Set(ps.flatMap(p => p.controls))];
    l.data = [...new Set(fs.flatMap(f => f.data))];
    const refs = [...new Set(fs.map(f => f.ref).filter(Boolean))];
    l.label = fs.length === 1 ? (fs[0].ref ? fs[0].ref + ' ' + fs[0].title : fs[0].title) : refs.length ? refs.join(' · ') : fs.length + ' flows';
    l.ref = fs.length === 1 ? fs[0].ref : '';
    const ra = rows.find(r => r.id === l.from).region, rb = rows.find(r => r.id === l.to).region;
    l.crosses = ra !== rb;
  }
  const lanes = T.lanes.filter(id => rows.some(r => r.region === id)).map(id => laneInfo(T, id));
  return {scope: sc, depth, lanes, rows, links, rowOf: id => rid.get(id) || null};
}

// Where a recorded object sits: its regions and the parts it belongs to.
function regionsOf(T, id) { if (T.elements.has(id)) return [T.elements.get(id).region]; const d = T.X.D.get(id); if (d?.authority && T.elements.has(d.authority)) return [T.elements.get(d.authority).region]; const f = T.flows.find(x => x.contract === id); if (f) return [f.fromRegion, f.toRegion]; return T.boundaries.some(b => b.id === id) ? [id] : []; }
function partsOf(T, id) { if (T.elements.has(id)) return [id]; const d = T.X.D.get(id); if (d?.authority) return [d.authority]; const f = T.flows.find(x => x.contract === id); return f ? [f.from, f.to] : []; }
export function touches(T, sc, id) { return sc.kind === 'system' || (sc.kind === 'boundary' ? regionsOf(T, id).includes(sc.id) : partsOf(T, id).includes(sc.id)); }

// Threats × controls: which control covers which threat, and on which affected objects.
export const PROPOSED = 'PROPOSED';
export function coverage(T, scope = {kind: 'system'}, {proposal = null} = {}) {
  const sc = threatScope(T, scope);
  const inScope = id => touches(T, sc, id);
  const threats = [...T.threats.values()].filter(t => sc.kind === 'system' || t.targets.some(inScope));
  const rank = {Critical: 0, High: 1, Moderate: 2, Low: 3};
  threats.sort((a, b) => (rank[a.priority] ?? 4) - (rank[b.priority] ?? 4) || String(a.ref).localeCompare(String(b.ref)));
  const controls = [...T.controls.values()].filter(c => sc.kind === 'system' || c.targets.some(inScope) || c.threats.some(id => threats.some(t => t.id === id)));
  controls.sort((a, b) => String(a.category).localeCompare(String(b.category)) || String(a.ref).localeCompare(String(b.ref)));
  // An unsaved control proposal is drawn as a column of its own, after the recorded controls.
  const rec = proposal?.record, ghost = rec ? {id: PROPOSED, ref: 'Proposed', title: text(rec.title, 120), category: text(rec.category, 60), targets: list(rec.targetIds), threats: list(rec.threatIds).filter(id => T.threats.has(id)), assurance: 'Not saved', proposed: true, forThreat: proposal.objectId || null} : null;
  const cols = ghost ? [...controls, ghost] : controls;
  const cells = [];
  for (const t of threats) for (const c of cols) {
    const linked = c.threats.includes(t.id), overlap = c.targets.some(id => t.targets.includes(id));
    if (linked || overlap) cells.push({threat: t.id, control: c.id, kind: linked ? (overlap ? 'covers' : 'claims') : 'overlap', proposed: !!c.proposed});
  }
  // Threats the proposal would bring to full coverage once accepted.
  const closes = new Set(ghost ? threats.filter(t => !t.covered && ghost.threats.includes(t.id) && t.targets.every(id => t.coverage.get(id) || ghost.targets.includes(id))).map(t => t.id) : []);
  return {scope: sc, threats, controls: cols, cells, closes};
}

// ---------------------------------------------------------------- reading

const titleOf = (T, id) => T.elements.get(id)?.title || T.X.D.get(id)?.title || T.X.C.get(id)?.title || T.boundaries.find(b => b.id === id)?.title || T.X.M.byId.get(id)?.title || id;
const refTitle = (T, id) => { const c = T.X.C.get(id), d = T.X.D.get(id); return c ? c.ref + ' ' + c.title : d ? d.ref + ' ' + d.title : titleOf(T, id); };
export function describeFlow(T, id) {
  const f = T.flows.find(x => x.id === id); if (!f) return '';
  const a = laneInfo(T, f.fromRegion), b = laneInfo(T, f.toRegion), p = f.protection;
  const where = f.crosses ? `crosses from ${a.title === 'Outside' ? 'outside' : a.title} into ${b.title === 'Outside' ? 'the outside' : b.title}` : `stays inside ${a.title}`;
  const data = f.data.map(d => T.X.D.get(d)?.title).filter(Boolean);
  const th = p.threats.map(t => T.threats.get(t)?.ref).join(', '), cs = p.controls.map(c => T.controls.get(c)?.ref).join(', ');
  return `${titleOf(T, f.from)} → ${titleOf(T, f.to)}${f.ref ? ' (' + f.ref + ' ' + f.title + ')' : ''} ${where}${data.length ? ', carrying ' + data.join(' and ') : ''}. ${p.state === 'unexamined' ? 'No threat or control is recorded for it.' : (th ? 'Threats: ' + th + '. ' : '') + (cs ? 'Controls: ' + cs + '.' : 'No control covers it.')}${p.open.length ? ' Not covered: ' + p.open.map(t => T.threats.get(t)?.ref).join(', ') + '.' : ''}`;
}

export function threatInsights(T, scope = {kind: 'system'}) {
  const out = [], sc = threatScope(T, scope);
  const inS = f => sc.kind === 'system' || (sc.kind === 'boundary' ? f.fromRegion === sc.id || f.toRegion === sc.id : f.from === sc.id || f.to === sc.id);
  const crossing = T.flows.filter(f => f.crosses && inS(f));
  const unexamined = crossing.filter(f => f.protection.state === 'unexamined');
  if (unexamined.length) {
    const all = crossingsOf(T, inS), open = all.filter(x => x.state === 'unexamined');
    const c = open.filter(x => x.kind === 'contract'), u = open.filter(x => x.kind === 'entry');
    const cAll = all.filter(x => x.kind === 'contract').length, eAll = all.filter(x => x.kind === 'entry').length, uses = u.reduce((n, x) => n + x.flows.length, 0);
    const parts = [c.length ? `${c.length} of ${cAll} contract crossing${cAll === 1 ? '' : 's'}` : '', u.length ? `${u.length} of ${eAll} entr${eAll === 1 ? 'y' : 'ies'} into platform services or stores in another boundary (${uses} use${uses === 1 ? '' : 's'})` : ''].filter(Boolean);
    const first = c[0] || u[0], f0 = T.flows.find(f => f.id === first.flows[0]);
    out.push({kind: 'gap', id: f0.contract || f0.to, text: `${parts.join(' and ')} ${c.length + u.length === 1 ? 'has' : 'have'} no threat or control recorded. Every crossing is worth one question: what could go wrong here?`, ask: `What could go wrong where ${titleOf(T, f0.from)} reaches ${titleOf(T, f0.to)}?`});
  }
  const open = [...T.threats.values()].filter(t => !t.covered && t.targets.some(id => touches(T, sc, id)));
  if (open.length) out.push({kind: 'risk', id: open[0].id, text: `${open.length} threat${open.length === 1 ? ' is' : 's are'} not fully covered: ${open.map(t => `${t.ref} ${t.title} (${[...t.coverage].filter(([, v]) => !v).map(([id]) => refTitle(T, id)).join(', ')} uncovered)`).join('; ')}.`, ask: `Which control should cover ${open[0].ref}, or is its risk accepted?`});
  const hints = [...T.controls.values()].flatMap(c => [...T.threats.values()].filter(t => !c.threats.includes(t.id) && c.targets.some(id => t.targets.includes(id)) && t.targets.some(id => touches(T, sc, id))).map(t => ({c, t})));
  if (hints.length) out.push({kind: 'info', id: hints[0].c.id, text: `${hints.map(h => `${h.c.ref} ${h.c.title} protects something ${h.t.ref} threatens but is not linked to it`).join('; ')}. If it answers the threat, link them; if not, say why.`});
  const idle = [...T.controls.values()].filter(c => !c.threats.length);
  if (idle.length && sc.kind === 'system') out.push({kind: 'info', id: idle[0].id, text: `${idle.map(c => c.ref + ' ' + c.title).join(', ')} ${idle.length === 1 ? 'is' : 'are'} not linked to any threat. A control needs the threat that justifies it.`});
  const leaving = T.flows.filter(f => f.kind === 'contract' && f.crosses && inS(f) && [f.fromRegion, f.toRegion].some(r => r === OUT_R || r === OUT_L) && f.data.some(d => /confidential|restricted|secret|personal|sensitive/i.test(T.X.D.get(d)?.classification || '')) && !f.protection.controls.length);
  if (leaving.length) out.push({kind: 'risk', id: leaving[0].contract, text: `${leaving.length} contract${leaving.length === 1 ? ' carries' : 's carry'} confidential or restricted data across the system edge with no control on the contract (${leaving.map(f => f.ref).join(', ')}).`});
  const noBoundary = [...T.elements.values()].filter(e => e.kind === 'component' && e.region === 'NONE');
  if (noBoundary.length) out.push({kind: 'gap', id: noBoundary[0].id, text: `${noBoundary.length} component${noBoundary.length === 1 ? ' is' : 's are'} not inside any trust boundary.`});
  const stores = T.flows.filter(f => f.kind === 'uses' && f.crosses && inS(f)), storeRegions = [...new Set(stores.map(f => f.toRegion))];
  for (const r of storeRegions) { const into = stores.filter(f => f.toRegion === r), users = new Set(into.map(f => f.from)); if (users.size >= 3) out.push({kind: 'info', id: into[0].to, text: `${users.size} components reach into ${laneInfo(T, r).title} (${[...new Set(into.map(f => titleOf(T, f.to)))].join(', ')}). Each is an entry into that boundary; its policy says: “${laneInfo(T, r).sub}”`}); }
  const planned = [...T.controls.values()].filter(c => /planned|needed/i.test(c.assurance));
  if (planned.length && sc.kind === 'system') out.push({kind: 'info', id: planned[0].id, text: `${planned.length} of ${T.controls.size} controls have no evidence yet (design, implementation or test).`});
  return out;
}
