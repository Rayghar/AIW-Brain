// Design reasoning — the SA Playbook read against this project's recorded design.
//
// One chain for every quality driver: driver → requirements → responsibilities (Ch 4) → components
// (Ch 5) → platform capabilities (Ch 6) → products (Ch 7) → runtime plans and placements (Ch 10),
// with the decisions (Ch 3) and interface contracts (Ch 8) that bear on it. Over that chain:
// - which of the playbook's tactics the design already names, with the evidence;
// - what the playbook's style table says about each style against the project's own drivers;
// - what a changed target or priority would do: arithmetic on recorded facts, never a guess.
// Pure and deterministic; nothing here changes the project.
import {ATTRIBUTES, TACTICS, PATTERNS, STYLE_KEY, attribute, tacticsFor} from './playbook-knowledge.js';
import {CATALOGUE} from './catalogue-index.js';
import {productMechanisms} from './product-applicability.js';
import {productsAvailable} from './model-knowledge.js';
import {optionAssessmentCurrent} from './technology-realisation-domain.js';
import {list,str,num,uniq} from './util.js';
import {firstById, memoOff} from './document-memo.js';
import {driverPriority, driverKind, driverCodes} from './quality-domain.js';
import {linkedRequirementIds} from './requirement-links.js';
import {readDecision} from './decision-reading.js';
import {driverScope, driverScopeIndex} from './driver-scope.js';
import {toMs, toMinutes} from './target-units.js';

const fmt = n => n == null ? '—' : Math.abs(n) >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10);

// The weights and the arithmetic of a decision's alternatives are the decision reading's (round 25, D-25-01,
// decision-reading.js): a driver with no stated priority weighs nothing, and the readings say so.
export const STATES = {
  holds: 'Holds', breaks: 'Stops holding', revisit: 'Revisit', unknown: 'Not recorded', eases: 'Eases', holdsNow: 'Now holds'
};

// ---------------------------------------------------------------- source

export function reasoningSource(p) {
  // Every driver, of every kind, with its kind, its display code and its priority as read (High, Medium, Low; quality-domain.js).
  const codes = p?.quality ? driverCodes(p) : new Map();
  const drivers = list(p?.quality?.drivers).map(d => ({...d, kind: driverKind(d), code: codes.get(d.id) || d.id, priority: driverPriority(d), attr: driverKind(d)==='quality' && attribute(d.category) ? d.category : null}));
  const resp = new Map(list(p?.logical?.responsibilities).map(r => [r.id, r]));
  const comps = new Map(list(p?.realisation?.components).map(c => [c.id, c]));
  const caps = new Map(list(p?.technology?.capabilities).map(c => [c.id, c]));
  const reals = new Map(list(p?.technologyRealisation?.records).map(r => [r.id, r]));
  const plans = new Map(list(p?.runtime?.plans).map(r => [r.id, r]));
  const zones = new Map(list(p?.runtime?.zones).map(z => [z.id, z]));
  const decisions = list(p?.decisions?.records);
  const contracts = list(p?.interfaces?.contracts);
  const connections = list(p?.realisation?.connections);
  const artefacts = new Map(list(p?.artefacts).map(a => [a.id, a]));
  const controls = list(p?.security?.controls);
  const R = {p, drivers, resp, comps, caps, reals, plans, zones, decisions, contracts, connections, artefacts, controls, scopes: driverScopeIndex(p), chains: new Map()};
  let byId = null;
  R.driver = id => (memoOff() ? drivers.find(d => d.id === id) : (byId ??= firstById(drivers)).get(id)) || null;
  return R;
}

// ---------------------------------------------------------------- lookups (round 5, R5-G)
// What a filter or a find over one of the project's lists answers, from an index built the first time it is asked and
// kept with the reasoning source: the same records in list order (the first of them for a find). The chains, the
// anti-pattern scan and the capacity plan read every driver, component and realisation; at 500 records per chapter,
// searching every mapping, need, plan and placement again for each of them was most of the SDD's time.
const LISTS = {
  logicalByLogical: ['logical.mappings', 'logicalId'], logicalByPhysical: ['logical.mappings', 'physicalId'],
  needsByApp: ['technology.needs', 'applicationId'], needsById: ['technology.needs', 'id'],
  techByNeed: ['technology.mappings', 'needId'], techByCap: ['technology.mappings', 'capabilityId'],
  realByCap: ['technologyRealisation.mappings', 'capabilityId'], realByReal: ['technologyRealisation.mappings', 'realizationId'],
  placementsByPlan: ['runtime.placements', 'planId'], plansByAsset: ['plans', 'assetId'],
  contractsByFrom: ['contracts', 'from'], contractsByTo: ['contracts', 'to'], connectionsByFrom: ['connections', 'from'],
  decisionsByDriver: ['decisions', 'driverIds', 1]
};
// A list: the project's (by its path) or the reasoning source's own (its plans in the order R.plans keeps them).
const rowsOf = (R, name) => { const [a, b] = LISTS[name][0].split('.'); return b ? list(R.p?.[a]?.[b]) : a === 'plans' ? [...R.plans.values()] : R[a]; };
// A record's keys for a lookup: its one field, or each of a field's list (once).
const keysOf = (name, r) => { const [, f, many] = LISTS[name]; return many ? new Set(list(r[f])) : [r[f]]; };
const lookups = new WeakMap();
const lookupsOf = R => { let all = lookups.get(R); if (!all) lookups.set(R, all = new Map()); return all; };
function lookupOf(R, name) {
  const all = lookupsOf(R);
  let m = all.get(name);
  if (!m) {
    m = new Map();
    rowsOf(R, name).forEach((r, at) => { for (const k of keysOf(name, r)) { let xs = m.get(k); if (!xs) m.set(k, xs = []); xs.push([at, r]); } });
    all.set(name, m);
  }
  return m;
}
// With every cache off (document-memo.js unmemoised) each lookup searches its list as the code did before the index, so
// scale-validate.mjs compares the indexed answers with the searched ones.
const keyed = (name, r, value) => { const [, f, many] = LISTS[name]; return many ? list(r[f]).includes(value) : r[f] === value; };
// rowsWith(R, name, value): list.filter(r => key(r) === value) — for a list of keys, list.filter(r => keys(r).includes(value)).
export const rowsWith = (R, name, value) => (memoOff() ? rowsOf(R, name).filter(r => keyed(name, r, value)) : (lookupOf(R, name).get(value) || []).map(x => x[1]));
// firstWith(R, name, value): list.find(r => key(r) === value).
export const firstWith = (R, name, value) => (memoOff() ? rowsOf(R, name).find(r => keyed(name, r, value)) : lookupOf(R, name).get(value)?.[0][1]);
// rowsAmong(R, names, values): list.filter(r => values.has(key(r))), or, for several names over one list, the rows any of
// their keys has among values; each row once, in list order.
export function rowsAmong(R, names, values) {
  if (memoOff()) { const vs = [...values]; return rowsOf(R, [].concat(names)[0]).filter(r => [].concat(names).some(name => vs.some(v => keyed(name, r, v)))); }
  const hits = new Map();
  for (const name of [].concat(names)) { const m = lookupOf(R, name); for (const v of values) for (const [at, r] of m.get(v) || []) hits.set(at, r); }
  return [...hits].sort((a, b) => a[0] - b[0]).map(x => x[1]);
}
// carriersOf(R): for each component, realisation and runtime plan, the drivers whose chain reaches it, in driver order —
// what R.drivers.filter(d => driverChain(R, d.id) reaches it) answers, worked out once.
export function carriersOf(R) {
  const all = lookupsOf(R);
  let c = all.get('carriers');
  if (!c) {
    c = {parts: new Map(), plans: new Map(), at: new Map()};
    const put = (m, k, d) => { let xs = m.get(k); if (!xs) m.set(k, xs = []); if (xs[xs.length - 1] !== d) xs.push(d); };
    R.drivers.forEach((d, i) => {
      c.at.set(d, i);
      const ch = driverChain(R, d.id); if (!ch) return;
      for (const x of ch.components) put(c.parts, x.id, d);
      for (const r of ch.realisations) put(c.parts, r.record.id, d);
      for (const f of ch.plans) put(c.plans, f.plan.id, d);
    });
    all.set('carriers', c);
  }
  return c;
}

// How a product reads in one line. A composite option (several products) records a version per
// part; its name alone reads better, and the versions stay in its specification.
export const productLabel = pr => pr?.product ? (/ · /.test(pr.version || '') ? pr.product : [pr.product, pr.version].filter(Boolean).join(' ')) : '';
const productOf = r => {
  const opts = list(r?.options), sel = opts.find(o => o.id === r?.selectedOptionId);
  const o = sel || opts.find(o => str(o.product)) || null;
  return o ? {option: o, selected: !!sel, product: str(o.product), version: str(o.version), vendor: str(o.vendor), operatingModel: str(o.operatingModel)} : null;
};
export {productOf};

// What carries one driver through the design.
export function driverChain(R, id) {
  if (R.chains.has(id)) return R.chains.get(id);
  const d = R.driver(id);
  if (!d) return null;
  // Each step reads its list through a lookup (above): the same records, in the same order, as a scan of the list.
  const scope = driverScope(R.p, d, R.scopes);
  const responsibilities = scope.responsibilityIds.map(x => R.resp.get(x)).filter(Boolean);
  const components = scope.componentIds.map(x => R.comps.get(x)).filter(Boolean);
  const cIds = new Set(components.map(c => c.id));
  const needs = rowsAmong(R, 'needsByApp', cIds);
  const nIds = new Set(needs.map(n => n.id));
  const capIds = uniq(rowsAmong(R, 'techByNeed', nIds).map(m => m.capabilityId));
  const capabilities = capIds.map(x => R.caps.get(x)).filter(Boolean).map(c => ({...c, essential: needs.some(n => n.criticality === 'essential' && rowsWith(R, 'techByNeed', n.id).some(m => m.capabilityId === c.id))}));
  const realIds = uniq(rowsAmong(R, 'realByCap', capIds).map(m => m.realizationId));
  const realisations = realIds.map(x => R.reals.get(x)).filter(Boolean).map(r => ({record: r, product: productOf(r), capabilityIds: rowsWith(R, 'realByReal', r.id).map(m => m.capabilityId)}));
  const assetIds = new Set([...cIds, ...realIds]);
  const plans = rowsAmong(R, 'plansByAsset', assetIds).map(r => planFacts(R, r));
  const decisions = rowsWith(R, 'decisionsByDriver', id).map(x => ({record: x, selected: list(x.alternatives).find(a => a.id === x.selectedAlternativeId) || null,
    alternatives: list(x.alternatives).map(a => ({alt: a, effect: a.assessments?.[id]?.effect || 'unknown', reason: str(a.assessments?.[id]?.reason)}))}));
  const contracts = rowsAmong(R, ['contractsByFrom', 'contractsByTo'], cIds);
  const connections = rowsAmong(R, 'connectionsByFrom', cIds).filter(c => cIds.has(c.to));
  const requirements = linkedRequirementIds(R.p, d).map(x => R.artefacts.get(x)).filter(Boolean); // named, then the members of its groups (round 12)
  const chain = {driver: d, scope, requirements, responsibilities, components, capabilities, realisations, plans, decisions, contracts, connections};
  R.chains.set(id, chain);
  return chain;
}

// A runtime plan's recorded redundancy: where it runs, how many, and how it recovers.
export function planFacts(R, plan) {
  const pl = rowsWith(R, 'placementsByPlan', plan.id);
  const active = pl.filter(x => x.role === 'active'), standby = pl.filter(x => x.role === 'standby');
  const count = xs => xs.reduce((n, x) => n + (num(x.replicas) || 0), 0);
  const zonesActive = uniq(active.map(x => x.zoneId)), zonesAll = uniq(pl.map(x => x.zoneId));
  const asset = R.comps.get(plan.assetId) || R.reals.get(plan.assetId) || null;
  return {plan, asset, assetKind: R.comps.has(plan.assetId) ? 'component' : R.reals.has(plan.assetId) ? 'realisation' : 'other',
    product: R.reals.has(plan.assetId) ? productOf(R.reals.get(plan.assetId)) : null,
    placements: pl, active: count(active), standby: count(standby), zonesActive, zonesAll,
    // Round 12 (DM-08): placements whose role or copy count is not stated; they count as nothing, never as one.
    open: pl.filter(x => !['active', 'standby'].includes(x.role) || num(x.replicas) == null).length,
    minReady: num(plan.minReady), maxReplicas: num(plan.maxReplicas), recoveryMinutes: num(plan.recoveryMinutes), lossMinutes: num(plan.lossMinutes),
    stateMode: str(plan.stateMode) || 'Unspecified', recoveryStrategy: str(plan.recoveryStrategy) || 'Unspecified'};
}

// ---------------------------------------------------------------- tactics in the design

// Every recorded text the chain carries, with where it came from.
function chainTexts(R, chain) {
  const out = [], add = (chapter, kind, id, ref, label, field, text) => { const t = str(text); if (t) out.push({chapter, kind, id, ref, label, field, text: t}); };
  const d = chain.driver;
  add(2, 'driver', d.id, d.id, d.title, 'tactic', d.tactic);
  add(2, 'driver', d.id, d.id, d.title, 'response', d.response);
  for (const x of chain.decisions) for (const a of x.alternatives) {
    const role = x.selected?.id === a.alt.id ? 'chosen' : 'considered';
    for (const f of ['strategy', 'pattern', 'summary']) add(3, 'alternative:' + role, a.alt.id, x.record.id, a.alt.title, f, a.alt[f]);
  }
  for (const c of chain.capabilities) for (const f of ['continuityPlan', 'recoveryPlan']) add(6, 'capability', c.id, c.ref, c.title, f, c[f]);
  for (const r of chain.realisations) {
    for (const f of ['resiliencePlan', 'operationsPlan', 'lifecyclePlan', 'dataPlan']) add(7, 'realisation', r.record.id, r.record.ref, r.record.title, f, r.record[f]);
    if (r.product) add(7, 'product', r.record.id, r.record.ref, r.record.title, 'product', productLabel(r.product));
  }
  for (const f of chain.plans) for (const k of ['monitoring', 'readiness', 'rollout', 'rollback', 'recoveryPlan', 'scalingPolicy', 'backupPlan', 'runbook']) add(10, 'plan', f.plan.id, f.plan.ref, f.plan.title, k, f.plan[k]);
  for (const c of chain.contracts) for (const k of ['timeoutPolicy', 'retryPolicy', 'failurePolicy', 'duplicatePolicy']) add(8, 'contract', c.id, c.ref, c.title, k, c[k]);
  return out;
}

const FIELD = {tactic: 'tactic', response: 'response', strategy: 'strategy', pattern: 'pattern', summary: 'summary', continuityPlan: 'continuity plan', recoveryPlan: 'recovery plan', resiliencePlan: 'resilience plan', operationsPlan: 'operations plan', lifecyclePlan: 'lifecycle plan', dataPlan: 'data plan', product: 'product', monitoring: 'monitoring', readiness: 'readiness', rollout: 'rollout', rollback: 'rollback', scalingPolicy: 'scaling policy', backupPlan: 'backup plan', capacityBasis: 'capacity basis', runbook: 'runbook', timeoutPolicy: 'timeout policy', retryPolicy: 'retry policy', failurePolicy: 'failure policy', duplicatePolicy: 'duplicate policy'};
const excerpt = (text, i, len) => { const a = Math.max(0, i - 40), b = Math.min(text.length, i + len + 50); return (a ? '…' : '') + text.slice(a, b).trim() + (b < text.length ? '…' : ''); };

// Structured facts that show a tactic without any wording.
function structural(R, chain, t) {
  const out = [], plan = (f, why) => out.push({chapter: 10, kind: 'plan', id: f.plan.id, ref: f.plan.ref, label: f.plan.title, field: 'runtime', excerpt: why});
  for (const f of chain.plans) {
    if (['T-AV-REDUNDANCY', 'D-AV-1'].includes(t.id)) {
      if (f.active >= 2) plan(f, `${f.active} active replicas${f.zonesActive.length > 1 ? ' across ' + f.zonesActive.length + ' zones' : ''}`);
      else if (f.standby) plan(f, `a standby in ${f.zonesAll.filter(z => !f.placements.some(x => x.role === 'active' && x.zoneId === z)).length ? 'another zone' : 'the same zone'}`);
      else if (f.recoveryStrategy === 'Failover') plan(f, 'recovery strategy: failover');
    }
    if (t.id === 'D-AV-5' && f.zonesAll.length > 1) plan(f, `placed in ${f.zonesAll.length} zones`);
    if (t.id === 'D-SC-6' && f.stateMode === 'Stateless process') plan(f, 'stateless process');
    if (t.id === 'D-SC-1' && f.maxReplicas != null && f.minReady != null && f.maxReplicas > f.minReady) plan(f, `scales from ${f.minReady} to ${f.maxReplicas} replicas`);
    if (t.id === 'D-AV-4' && f.recoveryStrategy === 'Restore') plan(f, 'recovery strategy: restore');
  }
  if (t.id === 'T-AV-REDUNDANCY') for (const c of chain.capabilities) if (c.continuity && c.continuity !== 'single' && c.continuity !== 'bypass') out.push({chapter: 6, kind: 'capability', id: c.id, ref: c.ref, label: c.title, field: 'continuity', excerpt: 'continuity: ' + c.continuity});
  if (t.id === 'T-AV-DEGRADATION') for (const c of chain.capabilities) if (c.continuity === 'bypass') out.push({chapter: 6, kind: 'capability', id: c.id, ref: c.ref, label: c.title, field: 'continuity', excerpt: 'continuity: bypassed when lost'});
  return out;
}

export function tacticEvidence(R, chain, t) {
  const found = [];
  const res = t.cues.map(c => new RegExp(c, 'i'));
  for (const s of chainTexts(R, chain)) {
    for (const re of res) { const m = re.exec(s.text); if (m) { found.push({...s, field: FIELD[s.field] || s.field, excerpt: excerpt(s.text, m.index, m[0].length)}); break; } }
  }
  found.push(...structural(R, chain, t));
  // One piece of evidence per object and field.
  const seen = new Set();
  return found.filter(f => { const k = f.id + '|' + f.field; if (seen.has(k)) return false; seen.add(k); return true; });
}

// The playbook's tactics for a driver's attribute: named in the design (with evidence) or not yet.
// The playbook's tactics that answer an attribute. Recoverability has no entry of its own: the
// playbook treats recovery under availability (MTTR, RTO, RPO), so its recovery tactics apply.
export function tacticsForAttribute(attr) {
  if (attr === 'recoverability') return TACTICS.filter(t => t.attribute === 'availability' && (t.group === 'Recover from faults' || ['D-AV-1', 'D-AV-4', 'D-AV-6'].includes(t.id)));
  return tacticsFor(attr);
}
export function driverTactics(R, id) {
  const chain = driverChain(R, id);
  if (!chain || !chain.driver.attr) return [];
  return tacticsForAttribute(chain.driver.attr).map(t => {
    const ev = tacticEvidence(R, chain, t);
    const chosen = ev.some(e => e.kind !== 'alternative:considered');
    return {tactic: t, evidence: ev, state: !ev.length ? 'open' : chosen ? 'named' : 'considered'};
  });
}

// ---------------------------------------------------------------- tuning a driver

export function windowDays(d) {
  const w = str(d.window).toLowerCase(), m = w.match(/(\d+(?:\.\d+)?)[\s-]*day/);
  if (m) return {days: Number(m[1]), stated: true};
  if (/year|annual/.test(w)) return {days: 365, stated: true};
  if (/month/.test(w)) return {days: 30, stated: true};
  if (/week/.test(w)) return {days: 7, stated: true};
  return {days: 30, stated: false};
}
// Round 12 (G, GR-RUN-07): every printed reading of a budget computed over an assumed window says so, in one phrase
// ("window not stated (30 days assumed)"; an annual window would allow about twelve times as much); '' when stated.
export const windowNote = w => (w && !w.stated ? `window not stated (${w.days} days assumed)` : '');

// How strict a target is, in the direction its operator reads: a larger value is stricter for
// "At least" and looser for "At most".
function stricter(d, before, after) {
  if (before == null || after == null || before === after) return 0;
  return d.operator === 'At least' ? Math.sign(after - before) : d.operator === 'At most' ? Math.sign(before - after) : 0;
}

export function availabilityBudget(value, days) {
  const v = num(value);
  return v == null || v < 0 || v > 100 ? null : (1 - v / 100) * days * 1440;
}

// The playbook's trade-offs for an attribute, joined to the project's other drivers.
export function driverTradeoffs(R, d) {
  const a = attribute(d.attr);
  if (!a) return [];
  const alias = {Performance: 'performance', Security: 'security', Maintainability: 'maintainability', Scalability: 'scalability', Availability: 'availability', Usability: 'usability', Deployability: 'deployability'};
  return a.tradeoffs.map(t => ({...t, src: a.tradeoffSrc, drivers: alias[t.with] ? R.drivers.filter(x => x.id !== d.id && x.attr === alias[t.with]) : []}));
}

function planLabel(f) { return f.plan.ref + ' ' + f.plan.title + (f.product?.product ? ' · ' + f.product.product : ''); }

export function availabilityCheck(f, budget) {
  const where = f.zonesActive.length > 1 ? ` across ${f.zonesActive.length} zones` : f.zonesActive.length === 1 ? ' in one zone' : '';
  if (!f.placements.length) return {state: 'unknown', why: 'Not placed in any zone, so what an outage costs cannot be read.'};
  if (f.active >= 2 && f.zonesActive.length > 1) return {state: 'holds', why: `${f.active} active replicas${where}: losing one replica or one zone does not stop it.`};
  if (f.open) return {state: 'unknown', why: `${f.open === 1 ? 'A placement does' : f.open + ' placements do'} not state ${f.open === 1 ? 'its' : 'their'} role or copies, so what an outage costs cannot be read.`};
  if (f.active >= 2) return {state: f.recoveryMinutes == null ? 'unknown' : f.recoveryMinutes <= budget ? 'holds' : 'breaks', why: `${f.active} active replicas${where} survive a replica failure, but a zone failure stops it${f.recoveryMinutes == null ? ' for an unrecorded time' : ` for ${fmt(f.recoveryMinutes)} min`}.`};
  if (f.recoveryMinutes == null) return {state: 'unknown', why: `One active replica${where}${f.standby ? ' with a standby' : ''}: every restart or release is unavailability, and its recovery time is not recorded.`};
  const fits = Math.floor(budget / Math.max(f.recoveryMinutes, 0.0001));
  return f.recoveryMinutes > budget
    ? {state: 'breaks', why: `One active replica${where}${f.standby ? ' with a standby' : ''}: one ${f.recoveryStrategy === 'Unspecified' ? '' : f.recoveryStrategy.toLowerCase() + ' '}recovery (${fmt(f.recoveryMinutes)} min) is more than the whole budget (${fmt(budget)} min).`}
    : {state: 'holds', why: `One active replica${where}${f.standby ? ' with a standby' : ''}: ${fits} recover${fits === 1 ? 'y' : 'ies'} of ${fmt(f.recoveryMinutes)} min fit the budget of ${fmt(budget)} min.`};
}

export function recoveryCheck(f, target) {
  if (f.recoveryMinutes == null) return {state: 'unknown', why: 'No recovery time is recorded for it.'};
  return f.recoveryMinutes <= target ? {state: 'holds', why: `Recovers in ${fmt(f.recoveryMinutes)} min, within ${fmt(target)} min.`} : {state: 'breaks', why: `Recovers in ${fmt(f.recoveryMinutes)} min, longer than ${fmt(target)} min.`};
}

// Synchronous hops among the parts that carry the driver, with any recorded timeouts.
export function syncPath(chain) {
  const hops = chain.connections.filter(c => c.interaction === 'sync' || c.kind === 'request');
  const timed = chain.contracts.filter(c => (c.kind === 'request' || !c.kind) && num(c.timeoutMs) != null);
  return {hops, contracts: chain.contracts.filter(c => c.kind === 'request'), timed, timeoutMs: timed.reduce((n, c) => n + num(c.timeoutMs), 0)};
}

// What a changed target or priority does to the recorded design.
export function tuneDriver(R, id, change = {}) {
  const chain = driverChain(R, id);
  if (!chain) return null;
  const d = chain.driver, a = attribute(d.attr);
  const before = {targetValue: str(d.targetValue), priority: d.priority};
  const after = {targetValue: change.targetValue != null && change.targetValue !== '' ? str(change.targetValue) : before.targetValue, priority: change.priority || before.priority};
  const dir = stricter(d, num(before.targetValue), num(after.targetValue));
  const effects = [], add = (x) => effects.push(x);
  const budget = {};
  const pair = (b, n) => b.state === n.state ? n.state : b.state === 'breaks' && n.state === 'holds' ? 'holdsNow' : n.state;

  if (d.attr === 'availability' && d.unit === '%') {
    const {days, stated} = windowDays(d);
    budget.before = availabilityBudget(before.targetValue, days); budget.after = availabilityBudget(after.targetValue, days);
    budget.text = `${after.targetValue} % over ${days} days${stated ? '' : ' (' + windowNote({days, stated}) + ')'} allows ${fmt(budget.after)} minutes of unavailability` + (before.targetValue !== after.targetValue ? `; ${before.targetValue} % allowed ${fmt(budget.before)}.` : '.');
    budget.unit = 'min';
    for (const f of chain.plans) {
      if (budget.after == null) break;
      const b = availabilityCheck(f, budget.before ?? budget.after), n = availabilityCheck(f, budget.after);
      add({kind: 'plan', chapter: 10, id: f.plan.id, ref: f.plan.ref, title: planLabel(f), state: pair(b, n), was: b.state, why: n.why, facts: f});
    }
  } else if (d.attr === 'recoverability' || (d.attr === 'availability' && toMinutes(1, d.unit) != null)) {
    const tb = toMinutes(before.targetValue, d.unit), ta = toMinutes(after.targetValue, d.unit);
    budget.before = tb; budget.after = ta; budget.unit = 'min';
    budget.text = ta == null ? 'The target is not a time, so it cannot be compared with recovery times.' : `Each part that carries it must recover within ${fmt(ta)} minutes` + (tb !== ta && tb != null ? ` (was ${fmt(tb)}).` : '.');
    if (ta != null) for (const f of chain.plans) { const b = recoveryCheck(f, tb ?? ta), n = recoveryCheck(f, ta); add({kind: 'plan', chapter: 10, id: f.plan.id, ref: f.plan.ref, title: planLabel(f), state: pair(b, n), was: b.state, why: n.why, facts: f}); }
    if (ta != null) for (const c of chain.capabilities) {
      const m = num(c.recoveryMinutes), mk = t => m == null ? {state: 'unknown', why: 'No recovery time is recorded for this capability.'} : m <= t ? {state: 'holds', why: `Recovery objective ${fmt(m)} min, within ${fmt(t)} min.`} : {state: 'breaks', why: `Recovery objective ${fmt(m)} min, longer than ${fmt(t)} min.`};
      const b = mk(tb ?? ta), n = mk(ta); add({kind: 'capability', chapter: 6, id: c.id, ref: c.ref, title: c.ref + ' ' + c.title, state: pair(b, n), was: b.state, why: n.why});
    }
  } else if (d.attr === 'performance' && toMs(1, d.unit) != null) {
    const tb = toMs(before.targetValue, d.unit), ta = toMs(after.targetValue, d.unit), path = syncPath(chain);
    budget.before = tb; budget.after = ta; budget.unit = 'ms';
    const calls = path.hops.length;
    budget.text = `${fmt(ta)} ms for the whole response` + (calls ? `; ${calls} synchronous call${calls === 1 ? '' : 's'} among the parts that carry it leave${calls === 1 ? 's' : ''} about ${fmt(ta / (calls + 1))} ms for each step.` : '; no synchronous calls are recorded among the parts that carry it.');
    if (path.timed.length) {
      const mk = t => path.timeoutMs <= t ? {state: 'holds', why: `The recorded timeouts add up to ${fmt(path.timeoutMs)} ms, within ${fmt(t)} ms.`} : {state: 'breaks', why: `The recorded timeouts add up to ${fmt(path.timeoutMs)} ms: a caller may wait longer than ${fmt(t)} ms before it knows.`};
      const b = mk(tb ?? ta), n = mk(ta);
      add({kind: 'path', chapter: 8, id: 'path:' + d.id, ref: 'Ch 8', title: path.timed.map(c => c.ref).join(' + ') + ' timeouts', state: pair(b, n), was: b.state, why: n.why});
    } else if (path.contracts.length) add({kind: 'path', chapter: 8, id: 'path:' + d.id, ref: 'Ch 8', title: path.contracts.map(c => c.ref).join(', '), state: 'unknown', was: 'unknown', why: 'No timeouts are recorded on the requests these parts make, so how long a caller may wait is unknown.'});
  } else if (d.attr === 'scalability') {
    budget.text = 'Growth is carried by parts that can add replicas; a stateful part grows only as its store allows.';
    for (const f of chain.plans) {
      const room = f.maxReplicas != null && f.minReady != null && f.maxReplicas > f.minReady;
      const n = f.stateMode === 'Stateful service' ? {state: 'revisit', why: 'Stateful: it scales only by its store\'s own means.'} : room ? {state: 'holds', why: `Can grow from ${f.minReady} to ${f.maxReplicas} replicas.`} : {state: dir > 0 ? 'breaks' : 'unknown', why: `No room to grow: ${f.minReady ?? '?'} to ${f.maxReplicas ?? '?'} replicas.`};
      add({kind: 'plan', chapter: 10, id: f.plan.id, ref: f.plan.ref, title: planLabel(f), state: n.state, was: n.state, why: n.why, facts: f});
    }
  } else {
    budget.text = before.targetValue === after.targetValue ? '' : `The target reads as a rule about correct results, not capacity: moving it from ${before.targetValue} to ${after.targetValue} ${d.unit} changes what counts as acceptable, which the decisions and tactics below must still deliver.`;
  }

  // Products judged against this driver's target are judged against the old one once it moves.
  for (const r of chain.realisations) {
    const o = r.product?.option, previous = o?.assessments?.[d.id], stale = !!previous && !optionAssessmentCurrent(R.p,r.record,o,previous), as = stale ? null : previous;
    const moved = after.targetValue !== before.targetValue;
    // Not yet judged: what the product is documented to do may still say which way it points.
    const mechanisms = !o || (as && as.effect !== 'unknown') ? [] : productMechanisms(o,{products:productsAvailable(R.p)}).filter(t => t.attrs.includes(d.attr) && t.effect !== 'ceiling');
    const hints = mechanisms.filter(t => t.applicability.state === 'context-match');
    const hint = hints.find(t => t.effect === 'tension') || hints.find(t => t.effect === 'supports') || null;
    const st = !o ? 'unknown' : stale ? 'revisit' : !as || as.effect === 'unknown' ? (hint?.effect === 'tension' ? 'revisit' : 'unknown') : moved || as.effect === 'tension' || as.effect === 'violates' ? 'revisit' : 'holds';
    const why = !o ? 'No option is recorded.' : stale ? `${r.product?.product || o.title} needs re-review against ${d.id}; its recorded configuration, source scope or supporting knowledge changed. Previous judgement: "${previous.reason || previous.effect}".` : !as || as.effect === 'unknown' ? `${r.product?.product || o.title} is not yet judged against ${d.id}.${hint ? ` Its documentation suggests ${hint.effect === 'tension' ? 'a trade-off' : 'it supports it'} in the declared context: ${hint.text} Project verification remains pending.` : mechanisms.length ? ' Its documented mechanisms still need matching configuration evidence.' : ''}` : moved ? `${r.product?.product || o.title} was judged against ${before.targetValue} ${d.unit}: "${as.reason || as.effect}".` : as.effect === 'tension' || as.effect === 'violates' ? `${r.product?.product || o.title} ${as.effect === 'violates' ? 'breaks the constraint' : 'creates a trade-off for'} ${d.id}: "${as.reason}".` : `${r.product?.product || o.title} has a recorded judgement supporting ${d.id}; the judgement is separate from target verification.`;
    add({kind: 'product', chapter: 7, id: r.record.id, ref: r.record.ref, title: r.record.ref + ' ' + (r.product?.product || r.record.title) + (r.product?.version ? ' ' + r.product.version : ''), state: st, was: st, why});
  }

  // Decisions: stricter targets make trade-offs cost more; a priority change can change which
  // alternative the drivers favour (a sensitivity point).
  const decisions = chain.decisions.map(x => {
    const tb = readDecision(R.p, x.record, {lean: true}), ta = readDecision(R.p, x.record, {priorities: {[d.id]: after.priority}, lean: true});
    // An alternative that breaks the driver (a constraint, D-25-03) is named beside the rest, and a chosen one is flagged
    // whichever way the driver moves.
    const tension = x.alternatives.filter(a => a.effect === 'tension'), broken = x.alternatives.filter(a => a.effect === 'violates');
    const flipped = tb.lead !== ta.lead;
    const sel = x.selected, selTension = sel && tension.some(t => t.alt.id === sel.id), selBroken = sel && broken.some(t => t.alt.id === sel.id);
    const state = flipped ? 'revisit' : selBroken ? 'breaks' : selTension && dir > 0 ? 'breaks' : tension.length && dir > 0 ? 'revisit' : tension.length && dir < 0 ? 'eases' : 'holds';
    const breaks = broken.length ? ` ${broken.map(t => t.alt.title).join(' and ')} ${broken.length === 1 ? 'breaks' : 'break'} ${d.id}${selBroken ? (broken.length === 1 ? ', and it is the chosen alternative' : ', the chosen alternative among them') : ''}.` : '';
    const score = (t, id) => t.rows.find(r => r.id === id)?.score;
    const named = tension.map(t => t.alt.title).join(' and ');
    const why = (flipped
      ? `As the drivers weigh it, ${ta.lead ? altTitle(x.record, ta.lead) + ' now leads' : 'no alternative now leads'} instead of ${tb.lead ? altTitle(x.record, tb.lead) : 'a tie'}: ${d.id} is a sensitivity point of this decision.`
      : selTension && dir > 0 ? `The chosen alternative, ${sel.title}, is in tension with ${d.id}; a stricter target makes that trade-off cost more.`
      : tension.length && dir > 0 ? `${named} ${tension.length === 1 ? 'is' : 'are'} in tension with ${d.id}; a stricter target counts against ${tension.length === 1 ? 'it' : 'them'}.`
      : tension.length && dir < 0 ? `A looser target makes the tension of ${named} easier to accept.`
      : before.priority !== after.priority && ta.lead ? `${altTitle(x.record, ta.lead)} still leads (weighted ${score(tb, ta.lead)} → ${score(ta, ta.lead)}); ${d.id} does not decide this one${tension.length ? ', though ' + named + ' is in tension with it' : ''}.`
      : tension.length ? `${named} ${tension.length === 1 ? 'is' : 'are'} in tension with ${d.id}.`
      : `No alternative is in tension with ${d.id}.`) + breaks;
    return {kind: 'decision', chapter: 3, id: x.record.id, ref: x.record.id, title: x.record.id + ' ' + str(x.record.question), state, was: 'holds', why, tallyBefore: tb, tallyAfter: ta, flipped};
  });
  effects.unshift(...decisions);

  const tactics = driverTactics(R, id);
  const focus = d.attr === 'availability' ? (effects.some(e => e.kind === 'plan' && ['breaks', 'unknown'].includes(e.state)) ? ['Recover from faults', 'Detect faults'] : ['Detect faults'])
    : d.attr === 'performance' ? ['Control resource demand', 'Manage resources'] : null;
  const suggested = dir > 0 ? tactics.filter(t => t.state === 'open' && (!focus || focus.includes(t.tactic.group))) : [];
  const tradeoffs = dir > 0 ? driverTradeoffs(R, d) : [];
  const counts = {};
  for (const e of effects) counts[e.state] = (counts[e.state] || 0) + 1;
  return {driver: d, attribute: a, before, after, direction: dir, priorityChanged: before.priority !== after.priority, budget, effects, tactics, suggested, tradeoffs, counts, chain};
}
export const altTitle = (dec, id) => list(dec.alternatives).find(a => a.id === id)?.title || id;

export function describeTuning(T) {
  if (!T) return '';
  const moved = T.before.targetValue !== T.after.targetValue, parts = [];
  if (moved) parts.push(`${T.driver.id} from ${T.driver.operator} ${T.before.targetValue} to ${T.after.targetValue} ${T.driver.unit}`);
  if (T.priorityChanged) parts.push(`priority from ${T.before.priority} to ${T.after.priority}`);
  if (!parts.length) return `${T.driver.id} as recorded: ${T.driver.operator} ${T.before.targetValue} ${T.driver.unit}, ${T.before.priority}.`;
  if (!moved) parts[0] = T.driver.id + ' ' + parts[0];
  const c = T.counts;
  const bits = [c.breaks && `${c.breaks} stop${c.breaks === 1 ? 's' : ''} holding`, c.holdsNow && `${c.holdsNow} now hold${c.holdsNow === 1 ? 's' : ''}`, c.revisit && `${c.revisit} to revisit`, c.unknown && `${c.unknown} not recorded`].filter(Boolean);
  return `Moving ${parts.join(' and ')}: ${bits.length ? bits.join(', ') : 'nothing recorded changes'}.`;
}

// Quick targets for the tuning control, in the driver's own unit.
export function targetSteps(d) {
  const v = num(d.targetValue);
  if (d.unit === '%' && d.operator === 'At least') return uniq([99, 99.5, 99.9, 99.95, 99.99, 99.999, v].filter(x => x != null)).sort((a, b) => a - b).map(String);
  if (v == null || v === 0) return [];
  const f = d.operator === 'At most' ? [4, 2, 1, 0.5, 0.25] : [0.25, 0.5, 1, 2, 4];
  return uniq(f.map(k => { const x = v * k; return String(x >= 10 ? Math.round(x) : Math.round(x * 100) / 100); }));
}

// ---------------------------------------------------------------- patterns and anti-patterns in words

// Recorded pattern and anti-pattern wording, linked to the playbook's pattern table and the pattern
// catalogue: exact names, plus a short list of phrasings this workbench's own decisions use.
const PHRASES = [
  [/idempotent (receiver|consumer)/i, 'PAT-IDEMPOTENT-CONSUMER'], [/retry with backoff|backoff/i, 'PAT-RETRY-WITH-BACKOFF'], [/durable handoff|asynchronous processing|message broker/i, 'PAT-MESSAGE-BROKER'],
  [/synchronous orchestration|request.?reply/i, 'PAT-REQUEST-REPLY'], [/outbox/i, 'PAT-TRANSACTIONAL-OUTBOX'],
  [/circuit/i, 'PAT-CIRCUIT-BREAKER'], [/bulkhead/i, 'PAT-BULKHEAD'], [/\bcache\b|caching/i, 'PAT-CACHE-ASIDE'], [/correlation/i, 'PAT-CORRELATION-IDENTIFIER'],
  [/non-idempotent|without checking concurrent|assuming idempotency/i, 'ANTI-MISSING-IDEMPOTENCY'], [/blind replay|retry immediately|immediate retry/i, 'ANTI-RETRY-STORM'],
  [/single point of failure/i, 'ANTI-SINGLE-POINT-OF-FAILURE'], [/synchronous chain/i, 'ANTI-SYNCHRONOUS-CHAIN'], [/shared database/i, 'ANTI-SHARED-DATABASE-COUPLING']
];
const CAT = new Map(CATALOGUE.records.map(r => [r.id, r]));
export const catalogueRecord = id => CAT.get(id) || null;
// kind: 'pattern' reads a pattern field, 'anti' an anti-pattern field; each finds only its own kind.
export function patternKnowledge(texts, kind = 'pattern') {
  texts = Array.isArray(texts) ? texts : [texts];
  const text = texts.filter(Boolean).join(' · '), low = ' ' + text.toLowerCase() + ' ';
  const playbook = PATTERNS.filter(p => low.includes(p.name.toLowerCase()));
  const ids = new Set();
  for (const r of CATALOGUE.records) {
    const names = [r.name, ...r.aliases].filter(n => n && n.length >= 6);
    if (names.some(n => new RegExp('\\b' + n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(low))) ids.add(r.id);
  }
  for (const [re, id] of PHRASES) if (re.test(text) && CAT.has(id)) ids.add(id);
  const cat = [...ids].map(id => CAT.get(id)).filter(r => kind === 'anti' ? r.type === 'anti-pattern' : r.type !== 'anti-pattern');
  return {playbook: kind === 'anti' ? [] : playbook, records: cat};
}

// ---------------------------------------------------------------- architecture style, as a decision

export const STYLE_DECISION = {topic: 'style', question: 'Which architecture style should structure this design?', context: 'Compare the SA Playbook\'s architecture styles against the quality drivers this design must meet. The playbook\'s marks are qualitative judgements; test each against the recorded design before choosing.', owner: 'Architecture', source: 'SA Playbook › Arch Style Suitability Ass; Arch Style + Quality Props'};
const STYLE_CATALOGUE = {'S-LAYERED': 'STYLE-LAYERED', 'S-MICROKERNEL': 'STYLE-MICROKERNEL', 'S-MODMONO': 'STYLE-MODULAR-MONOLITH', 'S-SOA': 'STYLE-SERVICE-ORIENTED', 'S-MICROSERVICES': 'STYLE-MICROSERVICES'};
export function styleMarks(R, style, driverIds) {
  return driverIds.map(id => R.driver(id)).filter(Boolean).map(d => ({driver: d, attr: d.attr, mark: d.attr ? style.effects[d.attr] || null : null}));
}
// One alternative of the style decision, as a proposal for Chapter 3's editor: the playbook's marks
// become assessments with the playbook quoted as the reason.
export function styleAlternative(R, style, driverIds) {
  const marks = styleMarks(R, style, driverIds), name = a => attribute(a)?.name.toLowerCase() || a;
  const strong = marks.filter(m => m.mark === 'x'), cond = marks.filter(m => m.mark === '(x)'), none = marks.filter(m => !m.mark);
  const cat = catalogueRecord(STYLE_CATALOGUE[style.id]);
  const avoid = (cat?.conflicts || []).map(id => catalogueRecord(id)?.name).filter(Boolean);
  const also = Object.entries(style.also || {}).map(([k, v]) => k.toLowerCase() + (v === '(x)' ? ' (conditional)' : '')).join(', ');
  return {title: `Adopt the ${style.name} style`, strategy: 'style:' + style.id,
    summary: `Structure the design in the ${style.name} style.${style.questions[0] ? ' ' + style.questions[0].text : ''}`,
    benefits: strong.length || cond.length ? `The SA Playbook marks ${style.name} as supporting ${[...new Set([...strong, ...cond].map(m => name(m.attr)))].join(', ')} among this design's drivers${also ? '; it also supports ' + also : ''}.` : `The SA Playbook's table marks none of this design's driver qualities for ${style.name}${also ? '; it supports ' + also : ''}.`,
    costs: none.length ? `The playbook's table does not cover ${[...new Set(none.map(m => name(m.attr)))].join(', ')} for any style: judge them from the design.` : '',
    consequences: STYLE_KEY.caveat, pattern: style.name, antiPattern: avoid.length ? avoid.join('; ') : '',
    responsibilityIds: [], relationships: [],
    assessments: Object.fromEntries(marks.map(m => [m.driver.id, {effect: m.mark === 'x' ? 'supports' : 'unknown', reason: m.mark === 'x' ? `SA Playbook style table: strong support for ${name(m.attr)}.` : m.mark === '(x)' ? `SA Playbook style table: potential or conditional support for ${name(m.attr)} — it depends on design and implementation choices; say whether the condition holds here.` : `The playbook's style table does not cover ${name(m.attr)}; judge it from the design.`, evidence: m.mark ? 'SA Playbook › Arch Style + Quality Props' : ''}]))};
}

export {ATTRIBUTES, TACTICS};
