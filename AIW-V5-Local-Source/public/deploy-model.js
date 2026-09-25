// Deployment & runtime — the semantic model behind the Chapter 10 Model views.
//
// Rows are the deployable parts of one environment (components in their modules' smart order,
// then the platform services they stand on, then the parties outside); columns are its zones,
// grouped by the failure domain they share. Every cell is a recorded placement. "What fails
// together" reuses the chapter's own failure simulation, so the Model and the Work lab agree.
// Pure: it reads recorded plans, placements, zones and dependencies and never writes.
import {exchangeSource} from './exchange-model.js';
import {environments, zones as zonesOf, plans as plansOf, placements as placementsOf, paths as pathsOf, runtimeDependencies, runtimeFindings, simulateRuntime, runtimeSources, requiredRuntimeControls} from './runtime-domain.js';

export const DEPLOY_SCHEMA = 'aiw.deploy/1';
const list = v => (Array.isArray(v) ? v : []);
const text = (v, n = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const norm = v => text(v).toLowerCase();
export const STATE_RANK = {available: 0, conditional: 1, degraded: 2, unknown: 3, unavailable: 4};
export const STATE_LABEL = {available: 'Keeps running', conditional: 'Recoverable, unproven', degraded: 'Degraded', unknown: 'Unknown — not enough placed', unavailable: 'Unavailable'};

// From a saved project: one environment's runtime design over the shared model.
export function deploySource(p, {envId = null, order = {}} = {}) {
  const X = exchangeSource(p, {order});
  const envs = environments(p), env = envs.find(e => e.id === envId) || envs[0] || null;
  if (!env) return deployModel(X, {envs});
  const plans = plansOf(p, env.id), ids = new Set(plans.map(r => r.id));
  let findings = [];
  try { findings = runtimeFindings(p); } catch { findings = []; }
  let controls = [];
  try { controls = requiredRuntimeControls(p, env.id).map(c => ({id: c.id, ref: c.ref, title: c.title})); } catch { controls = []; }
  const sources = new Map();
  for (const r of plans) { try { const s = runtimeSources(p, r); sources.set(r.id, {drivers: s.drivers.map(d => ({id: d.id, title: d.title})), requirements: s.requirements.map(a => ({id: a.id, title: a.title})), controls: s.controls.map(c => ({id: c.id, ref: c.ref, title: c.title}))}); } catch { /* sources are optional */ } }
  return deployModel(X, {envs, env, zones: zonesOf(p, env.id), plans, placements: placementsOf(p).filter(l => ids.has(l.planId)),
    deps: runtimeDependencies(p, env.id), paths: pathsOf(p, env.id), findings, controls, sources,
    simulate: (zoneId, mode) => simulateRuntime(p, {environmentId: env.id, zoneId, mode, durationMinutes: 60})});
}

export function deployModel(X, {envs = [], env = null, zones = [], plans = [], placements = [], deps = [], paths = [], findings = [], controls = [], sources = new Map(), simulate = null} = {}) {
  const {M} = X;
  const P = new Map(plans.map(r => [r.id, {id: r.id, ref: r.ref, title: text(r.title, 120), asset: r.assetId, kind: M.T(r.assetId) === 'component' ? 'component' : 'platform',
    owner: text(r.owner, 80), stateMode: r.stateMode || 'Unspecified', minReady: Number(r.minReady) || 1, maxReplicas: Number(r.maxReplicas) || 1,
    recovery: r.recoveryStrategy || 'Unspecified', recoveryPlan: text(r.recoveryPlan, 260), rto: r.recoveryMinutes === '' || r.recoveryMinutes == null ? '' : String(r.recoveryMinutes), rpo: r.lossMinutes === '' || r.lossMinutes == null ? '' : String(r.lossMinutes),
    backupZone: r.backupZoneId || '', fencing: text(r.fencing, 200), backupPlan: text(r.backupPlan, 200), monitoring: text(r.monitoring, 200), runbook: text(r.runbook, 200), rollout: text(r.rollout, 200), rollback: text(r.rollback, 200),
    scaling: text(r.scalingPolicy, 160), readiness: text(r.readiness, 160), network: text(r.networkPolicy, 160), controls: list(r.controlIds), release: text(r.releaseReference, 80), capacityConfirmed: !!r.capacityConfirmed, illustrative: r.origin === 'reference'}]));
  const Z = zones.map(z => ({id: z.id, ref: z.ref, title: text(z.title, 80), domain: text(z.failureDomain, 80), isolation: text(z.isolation, 220), owner: text(z.owner, 80), boundary: z.boundaryId || ''}));
  const L = placements.filter(l => P.has(l.planId)).map(l => ({id: l.id, plan: l.planId, zone: l.zoneId, role: l.role === 'standby' ? 'standby' : 'active', replicas: Math.max(1, Number(l.replicas) || 1), confirmed: !!l.confirmed}));
  const byPlan = new Map([...P.keys()].map(id => [id, L.filter(l => l.plan === id)]));
  for (const r of P.values()) {
    const ls = byPlan.get(r.id), active = ls.filter(l => l.role === 'active' && Z.some(z => z.id === l.zone)).reduce((n, l) => n + l.replicas, 0);
    r.active = active; r.standby = ls.filter(l => l.role === 'standby').reduce((n, l) => n + l.replicas, 0);
    r.placed = ls.length > 0; r.short = active < r.minReady;
    r.domains = [...new Set(ls.filter(l => l.role === 'active').map(l => norm(Z.find(z => z.id === l.zone)?.domain) || l.zone))];
  }
  const planOfAsset = new Map([...P.values()].map(r => [r.asset, r.id]));
  // Dependencies between plans, and runtime paths out to parties outside the environment.
  const D = [], seen = new Set();
  for (const d of deps) { if (!P.has(d.from)) continue; const k = d.from + '>' + (d.to || '?'); if (seen.has(k)) continue; seen.add(k); D.push({id: 'D:' + k, from: d.from, to: d.to && P.has(d.to) ? d.to : null, mode: d.mode === 'buffered' ? 'buffered' : 'required', source: text(d.source, 40), detail: text(d.detail, 200)}); }
  const R = [];
  for (const r of paths) {
    const c = X.C.get(r.contractId); if (!c) continue;
    const route = {id: r.id, contract: c.id, ref: c.ref, title: c.title, from: c.from, to: c.to, mode: r.mode === 'buffered' ? 'buffered' : 'required', route: text(r.route, 160), access: text(r.access, 160), failure: text(r.failureResponse, 200), owner: text(r.owner, 80)};
    R.push(route);
    const a = planOfAsset.get(c.from), b = planOfAsset.get(c.to);
    if (a && M.T(c.to) === 'party') D.push({id: 'P:' + r.id, from: a, to: c.to, mode: route.mode, source: r.id, detail: c.ref + ' ' + c.title, party: true});
    if (b && M.T(c.from) === 'party') D.push({id: 'P:' + r.id, from: c.from, to: b, mode: route.mode, source: r.id, detail: c.ref + ' ' + c.title, party: true, inbound: true});
  }
  // Row order: parts that start work, components in module order, platform by load, parties.
  const comps = X.order.filter(a => M.T(a) === 'component' && planOfAsset.has(a)).map(a => planOfAsset.get(a));
  const users = id => D.filter(d => d.to === id).length;
  const platform = [...P.values()].filter(r => r.kind === 'platform').sort((a, b) => users(b.id) - users(a.id) || String(a.ref).localeCompare(String(b.ref))).map(r => r.id);
  const parties = X.order.filter(a => M.T(a) === 'party' && D.some(d => d.from === a || d.to === a));
  const V = {X, M, env, envs, zones: Z, plans: P, placements: L, byPlan, deps: D, routes: R, findings: list(findings), controls, sources, simulate, planOfAsset,
    order: [...comps, ...platform, ...parties], comps, platform, parties};
  V.domains = domainsOf(Z);
  V.scenarios = failureScenarios(V);
  return V;
}

// Zones that share a failure domain fail together; each distinct domain gets a colour slot.
function domainsOf(Z) {
  const out = [], by = new Map();
  for (const z of Z) { const k = norm(z.domain) || 'zone:' + z.id; if (!by.has(k)) { by.set(k, {key: k, title: z.domain || 'Undeclared failure domain', zones: [], slot: out.length}); out.push(by.get(k)); } by.get(k).zones.push(z.id); }
  return out;
}
export function zoneOrder(V) { return V.domains.flatMap(d => d.zones); }

// What can fail: each zone, and each failure domain shared by more than one zone.
function failureScenarios(V) {
  const out = V.zones.map(z => ({id: 'zone:' + z.id, mode: 'zone', zone: z.id, title: z.title + ' fails'}));
  for (const d of V.domains) if (d.zones.length > 1 && !d.key.startsWith('zone:')) out.push({id: 'domain:' + d.key, mode: 'domain', zone: d.zones[0], title: d.title + ' fails (' + d.zones.length + ' zones)'});
  return out;
}

// The recorded simulation for one scenario, with dependencies that carry the failure.
export function failureOf(V, scenarioId) {
  const s = V.scenarios.find(x => x.id === scenarioId) || V.scenarios[0];
  if (!s) return null;
  let result = null;
  try { result = V.simulate ? V.simulate(s.zone, s.mode) : fallbackSimulation(V, s); } catch (e) { return {scenario: s, error: text(e.message, 200)}; }
  const state = new Map(result.rows.map(r => [r.id, r])), failed = result.failedZoneIds || [];
  // A dependency carries the failure when a part that would survive on its own copies stops
  // because something it requires has stopped.
  const own = id => { const r = V.plans.get(id), ls = V.byPlan.get(id) || [], left = ls.filter(l => l.role === 'active' && !failed.includes(l.zone)).reduce((n, l) => n + l.replicas, 0); return r.active < r.minReady ? 'unknown' : left >= r.minReady ? 'available' : left > 0 ? 'degraded' : 'unavailable'; };
  const carries = V.deps.filter(d => !d.party && d.to && own(d.from) === 'available' && state.get(d.from)?.initial.state !== 'available' && state.get(d.to)?.initial.state !== 'available').map(d => d.id);
  const direct = [...V.plans.keys()].filter(id => ['unavailable', 'degraded'].includes(own(id)) && (V.byPlan.get(id) || []).some(l => failed.includes(l.zone)));
  return {scenario: s, result, state, failed: new Set(failed), carries: new Set(carries), direct: new Set(direct)};
}

// Used where no chapter simulation is available (fixtures): replica counting and required
// dependency propagation only.
function fallbackSimulation(V, s) {
  const failed = s.mode === 'zone' ? [s.zone] : V.zones.filter(z => norm(z.domain) === norm(V.zones.find(x => x.id === s.zone)?.domain)).map(z => z.id);
  const map = new Map();
  for (const r of V.plans.values()) {
    const ls = V.byPlan.get(r.id), all = ls.filter(l => l.role === 'active').reduce((n, l) => n + l.replicas, 0), left = ls.filter(l => l.role === 'active' && !failed.includes(l.zone)).reduce((n, l) => n + l.replicas, 0);
    map.set(r.id, {state: all < r.minReady ? 'unknown' : left >= r.minReady ? 'available' : left > 0 ? 'degraded' : 'unavailable', reason: ''});
  }
  for (let i = 0; i < V.plans.size; i++) { let changed = false; for (const d of V.deps) { if (d.party || !d.to) continue; const a = map.get(d.from), b = map.get(d.to), st = d.mode === 'buffered' ? 'degraded' : b.state; if (b.state !== 'available' && STATE_RANK[st] > STATE_RANK[a.state]) { map.set(d.from, {state: st, reason: 'Requires ' + V.plans.get(d.to).ref}); changed = true; } } if (!changed) break; }
  const rows = [...V.plans.values()].map(r => ({id: r.id, ref: r.ref, title: r.title, initial: map.get(r.id), recovery: map.get(r.id)}));
  return {failedZoneIds: failed, rows, affected: rows.filter(r => r.initial.state !== 'available'), assessments: [], security: [], externalPaths: []};
}

// ---------------------------------------------------------------- slicing

// Rows at a scope and depth. A row is one plan, a folded module, the folded platform, or a party.
export function deployScope(V, scope) {
  const {M} = V;
  if (!scope || scope.kind === 'system' || !scope.id) return {kind: 'system'};
  const t = M.T(scope.id);
  if (t === 'module' && M.byId.has(scope.id)) return {kind: 'module', id: scope.id};
  if (V.plans.has(scope.id)) return {kind: 'part', id: scope.id};
  if (V.planOfAsset.has(scope.id)) return {kind: 'part', id: V.planOfAsset.get(scope.id)};
  if (t === 'party') return {kind: 'part', id: scope.id};
  return {kind: 'system'};
}
export function defaultDepth(V) { return V.comps.length + V.platform.length > 28 && V.M.modules.length > 1 ? 'modules' : 'all'; }

export function foldDeploy(V, scope = {kind: 'system'}, depth = 'all') {
  const {M} = V, mod = id => M.mod.get(V.plans.get(id)?.asset);
  const sc = deployScope(V, scope);
  // Which recorded rows are in view, and which are context around the subject.
  let keep = null, context = new Set();
  if (sc.kind !== 'system') {
    const core = sc.kind === 'module' ? new Set(V.comps.filter(id => mod(id) === sc.id)) : new Set([sc.id]);
    keep = new Set(core);
    for (const d of V.deps) { if (core.has(d.from) && d.to) { keep.add(d.to); if (!core.has(d.to)) context.add(d.to); } if (core.has(d.to)) { keep.add(d.from); if (!core.has(d.from)) context.add(d.from); } }
  }
  const inView = id => !keep || keep.has(id);
  const rowOf = id => {
    if (M.T(id) === 'party') return id;
    const r = V.plans.get(id); if (!r) return null;
    const subject = sc.kind !== 'system' && (sc.kind === 'module' ? mod(id) === sc.id : sc.id === id);
    if (r.kind === 'platform') return depth === 'all' || subject ? id : 'PLATFORM';
    if (depth === 'modules' && !subject && mod(id)) return 'MOD:' + mod(id);
    return id;
  };
  const rows = [], index = new Map();
  const add = (id, info) => { if (index.has(id)) { index.get(id).members.push(...info.members); return; } const row = {id, ...info}; index.set(id, row); rows.push(row); };
  for (const id of V.order) {
    if (!inView(id)) continue;
    const rid = rowOf(id); if (!rid) continue;
    const ctx = context.has(id);
    if (rid === 'PLATFORM') add(rid, {kind: 'platform-group', title: 'Platform services', group: 'platform', members: [id], ctx});
    else if (rid.startsWith('MOD:')) add(rid, {kind: 'module', title: M.byId.get(rid.slice(4))?.title || rid.slice(4), group: rid.slice(4), module: rid.slice(4), members: [id], ctx});
    else if (M.T(id) === 'party') add(rid, {kind: 'party', title: M.byId.get(id)?.title || id, group: 'outside', members: [], ctx});
    else { const r = V.plans.get(id); add(rid, {kind: r.kind, title: r.title, group: r.kind === 'platform' ? 'platform' : mod(id) || 'loose', module: mod(id) || null, members: [id], plan: id, ctx, subject: sc.kind === 'part' && sc.id === id}); }
  }
  for (const r of rows) if (r.members.length > 1 || r.kind === 'module' || r.kind === 'platform-group') r.ctx = r.members.every(id => context.has(id));
  // Cells: what runs in each zone for each row.
  const zoneIds = zoneOrder(V);
  for (const r of rows) {
    r.cells = new Map();
    for (const z of zoneIds) { const ls = r.members.flatMap(id => V.byPlan.get(id) || []).filter(l => l.zone === z); if (ls.length) r.cells.set(z, {active: ls.filter(l => l.role === 'active').reduce((n, l) => n + l.replicas, 0), standby: ls.filter(l => l.role === 'standby').reduce((n, l) => n + l.replicas, 0), placements: ls.map(l => l.id), plans: [...new Set(ls.map(l => l.plan))]}); }
    const ps = r.members.map(id => V.plans.get(id)).filter(Boolean);
    r.unplaced = ps.filter(p => !p.placed).map(p => p.id);
    r.short = ps.filter(p => p.placed && p.short).map(p => p.id);
    r.planned = ps.length;
  }
  // Dependencies between rows (deduplicated; internal ones folded away).
  const rid = new Map(); for (const r of rows) for (const m of (r.kind === 'party' ? [r.id] : r.members)) rid.set(m, r.id);
  const links = [], lk = new Set();
  for (const d of V.deps) {
    const a = rid.get(d.from), b = d.to ? rid.get(d.to) : null;
    if (!a || !b || a === b) continue;
    const k = a + '>' + b;
    if (lk.has(k)) { const l = links.find(x => x.id === 'R:' + k); l.deps.push(d.id); if (d.mode === 'required') l.mode = 'required'; continue; }
    lk.add(k); links.push({id: 'R:' + k, from: a, to: b, mode: d.mode, party: !!d.party, deps: [d.id], dim: sc.kind === 'part' ? !(d.from === sc.id || d.to === sc.id) : false});
  }
  return {scope: sc, depth, zones: zoneIds.map(id => V.zones.find(z => z.id === id)), rows, links, rowOf: id => rid.get(id) || null};
}

// ---------------------------------------------------------------- reading

export function deployInsights(V, scope = {kind: 'system'}) {
  const out = [], {M} = V, sc = deployScope(V, scope);
  const inS = id => sc.kind === 'system' || (sc.kind === 'module' ? M.mod.get(V.plans.get(id)?.asset) === sc.id : id === sc.id);
  const comps = V.comps.map(id => V.plans.get(id)).filter(r => inS(r.id));
  if (!V.env) return [{kind: 'gap', text: 'No environment is designed yet. Chapter 10 starts with one environment and its zones.'}];
  if (!V.zones.length) out.push({kind: 'gap', id: V.env.id, text: V.env.title + ' has no zones. Define where it runs and what fails together.'});
  const unplaced = comps.filter(r => !r.placed);
  if (unplaced.length) out.push({kind: 'gap', id: unplaced[0].id, text: `${unplaced.length} component${unplaced.length === 1 ? ' is' : 's are'} not placed in any zone (${unplaced.map(r => r.title).join(', ')}). The payment path cannot run without ${unplaced.length === 1 ? 'it' : 'them'}.`, ask: `Where should ${unplaced[0].title} run, and with how many copies?`});
  const placedComps = comps.filter(r => r.placed), domains = new Set(placedComps.flatMap(r => r.domains));
  if (placedComps.length > 1 && domains.size === 1) out.push({kind: 'risk', id: [...V.zones].find(z => norm(z.domain) === [...domains][0])?.id || placedComps[0].id, text: `Every placed component runs in one failure domain (${V.zones.find(z => norm(z.domain) === [...domains][0])?.domain || [...domains][0]}). One failure there stops them all.`, ask: 'Which parts need a standby in an independent failure domain?'});
  const single = placedComps.filter(r => r.active <= 1 && r.recovery === 'Unspecified');
  if (single.length) out.push({kind: 'risk', id: single[0].id, text: `${single.length} placed component${single.length === 1 ? ' runs' : 's run'} as a single copy with no recovery strategy (${single.map(r => r.title).join(', ')}).`});
  const platformNeeded = new Map();
  for (const d of V.deps) if (!d.party && d.to && V.plans.get(d.to)?.kind === 'platform' && !V.plans.get(d.to).placed && inS(d.from) && V.plans.get(d.from)?.kind === 'component') platformNeeded.set(d.to, (platformNeeded.get(d.to) || 0) + 1);
  if (platformNeeded.size) { const top = [...platformNeeded].sort((a, b) => b[1] - a[1]); out.push({kind: 'gap', id: top[0][0], text: `${platformNeeded.size} platform service${platformNeeded.size === 1 ? '' : 's'} that components require ${platformNeeded.size === 1 ? 'is' : 'are'} not placed — ${V.plans.get(top[0][0]).title} is required by ${top[0][1]}. Until they are placed, what survives a failure cannot be known.`}); }
  const stateful = comps.filter(r => r.stateMode === 'Stateful service' && (!r.fencing || !r.backupPlan || !r.backupZone));
  if (stateful.length) out.push({kind: 'risk', id: stateful[0].id, text: `${stateful.length} stateful part${stateful.length === 1 ? ' has' : 's have'} no complete state protection (write authority, protected copy and its location).`});
  const unspecified = comps.filter(r => r.stateMode === 'Unspecified');
  if (unspecified.length) out.push({kind: 'gap', id: unspecified[0].id, text: `${unspecified.length} component${unspecified.length === 1 ? ' does' : 's do'} not say whether ${unspecified.length === 1 ? 'it holds' : 'they hold'} state. Recovery cannot be judged without it.`});
  const ext = V.routes.filter(r => V.M.T(r.to) === 'party' && r.mode === 'required' && !r.failure && inS(V.planOfAsset.get(r.from)));
  if (ext.length) out.push({kind: 'gap', id: V.planOfAsset.get(ext[0].from), text: `${ext.length} required runtime path${ext.length === 1 ? '' : 's'} to an external system ${ext.length === 1 ? 'has' : 'have'} no response for when the provider is down (${ext.map(r => r.ref).join(', ')}).`, ask: `What should ${M.byId.get(ext[0].from)?.title} do when ${M.byId.get(ext[0].to)?.title} is unavailable?`});
  const noOps = comps.filter(r => r.placed && (!r.monitoring || !r.runbook));
  if (noOps.length) out.push({kind: 'info', id: noOps[0].id, text: `${noOps.length} placed component${noOps.length === 1 ? ' has' : 's have'} no monitoring or runbook yet.`});
  if (sc.kind === 'system') for (const s of V.scenarios.slice(0, 3)) { const f = failureOf(V, s.id); if (!f?.result) continue; const hit = f.result.rows.filter(r => V.plans.get(r.id)?.kind === 'component' && ['unavailable', 'degraded'].includes(r.initial.state)); if (hit.length) out.push({kind: 'risk', id: s.zone, scenario: s.id, text: `If ${s.title.replace(/ fails.*$/, '')} fails, ${hit.length} of ${V.comps.length} components stop or degrade${hit.some(r => r.recovery.state === 'conditional') ? '; some have a recovery candidate' : ' and none has a recovery candidate'}.`}); }
  return out;
}

export function describePlan(V, id) {
  const r = V.plans.get(id); if (!r) return '';
  const where = (V.byPlan.get(id) || []).map(l => `${l.replicas} ${l.role} in ${V.zones.find(z => z.id === l.zone)?.title || 'a missing zone'}`);
  return `${r.title} ${where.length ? 'runs ' + where.join(' and ') : 'is not placed yet'}; it needs ${r.minReady} ready ${r.minReady === 1 ? 'copy' : 'copies'}. ${r.stateMode === 'Unspecified' ? 'Whether it holds state is not recorded.' : r.stateMode + '.'} Recovery: ${r.recovery === 'Unspecified' ? 'not chosen' : r.recovery}.`;
}
