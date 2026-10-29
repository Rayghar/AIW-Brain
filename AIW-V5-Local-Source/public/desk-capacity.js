// Review desk — "What it takes": an objective, such as 100,000 concurrent users, turned into a
// performance specification for every part the design records.
//
// The arithmetic is plain and shown: the arrival rate from the objective (Little's law for a closed
// population: users ÷ (time between requests + response time)), carried along the Chapter 5
// interactions from the entry the Chapter 8 contracts record; replicas for that rate at a target
// utilisation, plus what the availability rule asks; the connections, messages, cache reads,
// telemetry and cluster that follow. Every number that is not recorded in the design is a named
// planning assumption the architect can change, and every product rule is quoted with its source.
// The result is compared with what Chapters 7 and 10 record. Pure; nothing here changes the project.
import {reasoningSource, planFacts, productOf, productLabel, rowsWith, firstWith, carriersOf} from './design-reasoning.js';
import {toMs, toMinutes} from './target-units.js';
import {BRAIN_TRADEOFFS} from './brain-tradeoffs.js';
import {fact, factsFor} from './product-facts.js';
import {ceilingOf} from './product-knowledge.js';
import {productMechanisms} from './product-applicability.js';
import {productsAvailable} from './model-knowledge.js';
import {list, str, num, uniq} from './util.js';
import {REFERENCE_PROJECTS} from './reference-projects.js';

export function fmtN(n, digits = 0) {
  if (n == null || !Number.isFinite(n)) return '—';
  const f = Math.abs(n) < 10 && digits === 0 && n % 1 ? 1 : digits;
  const [a, b] = n.toFixed(f).split('.');
  return a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (b && Number(b) ? '.' + b : '');
}
const ceil = x => Math.ceil(x - 1e-9);
const sig = n => { if (!n || !Number.isFinite(n)) return n; const q = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.abs(n))) - 1)); return Math.round(n / q) * q; };
const lower = t => t ? t[0].toLowerCase() + t.slice(1) : t;

export const ASSUMPTIONS = [
  {key: 'thinkSeconds', group: 'Workload', label: 'Time between one user\'s requests', unit: 's', def: 30, why: 'With the response time, turns concurrent users into requests per second.'},
  {key: 'utilisation', group: 'Workload', label: 'Utilisation to plan for at peak', unit: '%', def: 70, why: 'Headroom for bursts, garbage collection and a slow dependency.'},
  {key: 'survive', group: 'Workload', label: 'Keep serving after losing', unit: '', def: 'replica', options: [['replica', 'one replica'], ['zone', 'one zone']], why: 'What the parts that carry an availability, recovery or Critical driver must survive at full load.'},
  {key: 'servicePerReplica', group: 'Parts', label: 'Requests one service replica handles', unit: 'req/s', def: 200, why: 'Replace with a load-test result for each service.'},
  {key: 'workerPerReplica', group: 'Parts', label: 'Messages one worker replica handles', unit: 'msg/s', def: 100, why: 'Replace with a load-test result for each worker.'},
  {key: 'platformPerReplica', group: 'Parts', label: 'Requests one gateway or identity replica handles', unit: 'req/s', def: 1000, why: 'Replace with the product\'s own sizing guide and a load test.'},
  {key: 'cpuPerReplica', group: 'Parts', label: 'CPU per replica', unit: 'vCPU', def: 0.5, why: 'The request each replica makes of the cluster.'},
  {key: 'memPerReplica', group: 'Parts', label: 'Memory per replica', unit: 'GiB', def: 0.5, why: 'The request each replica makes of the cluster.'},
  {key: 'poolPerReplica', group: 'Data', label: 'Database connections each replica holds', unit: '', def: 10, why: 'The size of each replica\'s connection pool.'},
  {key: 'storeOpsPerRequest', group: 'Data', label: 'Database operations per request', unit: '', def: 2, why: 'Reads and writes one request makes of its store.'},
  {key: 'readShare', group: 'Data', label: 'Share of operations that are reads', unit: '%', def: 50, why: 'Only reads can be answered from a cache.'},
  {key: 'cacheHitRatio', group: 'Data', label: 'Reads the cache answers', unit: '%', def: 80, why: 'For parts that stand on a cache.'},
  {key: 'recordKB', group: 'Data', label: 'Size of a written record', unit: 'KB', def: 2, why: 'Turns writes into daily growth and backup volume.'},
  {key: 'messageKB', group: 'Data', label: 'Size of a message', unit: 'KB', def: 2, why: 'Turns a queue backlog into storage.'},
  {key: 'spanKB', group: 'Data', label: 'Telemetry per request, per part', unit: 'KB', def: 1, why: 'Traces, metrics and logs each part emits for one request.'},
  {key: 'queueMsgPerSec', group: 'Products', label: 'Messages one queue\'s leader handles', unit: 'msg/s', def: 10000, why: 'Where a single queue stops keeping up: replace with a benchmark of your message size and durability settings.'},
  {key: 'primaryWritesPerSec', group: 'Products', label: 'Writes one database primary sustains', unit: 'writes/s', def: 10000, why: 'Where a single primary stops keeping up: replace with a benchmark of your schema, indexes and hardware.'},
  {key: 'nodeVcpu', group: 'Cluster', label: 'vCPU per cluster node', unit: 'vCPU', def: 8, why: 'The machine size the cluster is built from.'},
  {key: 'nodeMemGiB', group: 'Cluster', label: 'Memory per cluster node', unit: 'GiB', def: 32, why: 'The machine size the cluster is built from.'}
];
const DEF = Object.fromEntries(ASSUMPTIONS.map(a => [a.key, a.def]));

// ---------------------------------------------------------------- objective

const USERS = /concurrent|users?\b|sessions?/i, RATE = /(\/|per)\s*(s|sec|second)\b|\brps\b|\btps\b/i, SURGE = /×|\bx\b|times|normal peak/i;
const PLAYBOOK_TARGET = {value: 100000, text: 'Scale to 100,000 concurrent users.', src: 'QR-Guidebook!F5'};

// A workload the project records in its own words, in a driver's conditions ("10 applications per second").
// It is not an objective, but it tells the SA Playbook's example apart from this project's load.
const WORKLOAD = /(\d[\d,]*(?:\.\d+)?)\s+(requests?|applications?|submissions?|messages?|orders?|transactions?|calls?|events?)\s+(?:a|per)\s+second/i;
export function recordedWorkload(R) {
  for (const d of R.drivers || []) { const m = WORKLOAD.exec(String(d.conditions || '')); if (m) return {driverId: d.id, value: num(m[1].replace(/,/g, '')), text: `${m[1]} ${m[2]} a second`}; }
  return null;
}

// No template, including an illustrative reference or legacy project, supplies an implicit
// workload. Explicit exploration is labelled as an estimate; a saved objective or recorded
// driver is needed for a capacity verdict. The SDD never inherits an unstated example.
export const NO_LOAD = 'no load stated';
export const EXAMPLE_LABEL = 'assumed (playbook example)';
export const PLAYBOOK_EXAMPLE = Object.freeze({kind: 'users', value: PLAYBOOK_TARGET.value, text: PLAYBOOK_TARGET.text, src: PLAYBOOK_TARGET.src});
// AIW's illustrative references: the payment sample (and documents from before a template was recorded) and the
// reference journeys. Every other project (blank, imported from a workbook, restored) is the person's own.
export const illustrative = p => { const t = p?.workspace?.template; return !t || t === 'bank-payment' || REFERENCE_PROJECTS.some(r => r.id === t); };

// What the desk plans for: the objective explored on the desk, else the review's own objective, else a Chapter 2
// scalability driver; the playbook's example only when explicitly explored; else no load.
export function capacityObjective(R, saved = null, override = null) {
  const drivers = R.drivers.filter(d => d.category === 'scalability' && num(d.targetValue) != null);
  const byUsers = drivers.find(d => USERS.test(d.unit || '') && !SURGE.test(d.unit || ''));
  const byRate = drivers.find(d => RATE.test(d.unit || '') && !SURGE.test(d.unit || ''));
  const surgeD = drivers.find(d => SURGE.test(d.unit || ''));
  const perf = R.drivers.find(d => d.category === 'performance' && toMs(d.targetValue, d.unit) != null);
  const example = {kind: 'users', value: PLAYBOOK_TARGET.value, source: {kind: 'playbook', text: 'The SA Playbook\'s example scalability target: "' + PLAYBOOK_TARGET.text + '", ' + EXAMPLE_LABEL, src: PLAYBOOK_TARGET.src, workload: recordedWorkload(R)}};
  const base = override?.example ? example
    : override && num(override.value) ? {kind: override.kind === 'rate' ? 'rate' : 'users', value: num(override.value), source: {kind: 'explore', text: 'Explored on the desk, not yet saved'}}
    : saved && num(saved.value) ? {kind: saved.kind === 'rate' ? 'rate' : 'users', value: num(saved.value), source: {kind: 'review', text: 'The review objective, saved in Chapter 11' + (saved.reviewer ? ' by ' + saved.reviewer : '')}}
    : byUsers ? {kind: 'users', value: num(byUsers.targetValue), source: {kind: 'driver', id: byUsers.id, text: `${byUsers.id} · ${byUsers.title}`}}
    : byRate ? {kind: 'rate', value: num(byRate.targetValue), source: {kind: 'driver', id: byRate.id, text: `${byRate.id} · ${byRate.title}`}}
    : {kind: 'users', value: null, source: {kind: 'none', text: 'No load stated: no Chapter 2 scalability driver states a target and no review objective is saved', workload: recordedWorkload(R)}};
  const assume = {...DEF, ...(saved?.assumptions || {}), ...(override?.assumptions || {})};
  for (const a of ASSUMPTIONS) if (a.options ? !a.options.some(([v]) => v === assume[a.key]) : num(assume[a.key]) == null) assume[a.key] = a.def;
  const useSurge = surgeD && (override?.surge ?? saved?.surge ?? true);
  return {...base, assume, perReplica: {...(saved?.perReplica || {}), ...(override?.perReplica || {})},
    surge: surgeD ? {factor: num(surgeD.targetValue), driverId: surgeD.id, title: surgeD.title, on: !!useSurge} : null,
    response: perf ? {ms: toMs(perf.targetValue, perf.unit), driverId: perf.id} : {ms: 1000, driverId: null}};
}

// ---------------------------------------------------------------- flow

const FLOW = new Set(['sync', 'event', 'async', 'queue', 'request', 'stream']);
const isAsync = i => ['event', 'async', 'queue', 'stream'].includes(i);
function flowOf(R) {
  const p = R.p, comps = [...R.comps.keys()];
  const parties = new Set(list(p?.interfaces?.parties).map(x => x.id));
  const edges = R.connections.filter(c => R.comps.has(c.from) && R.comps.has(c.to) && FLOW.has(c.interaction || 'sync'));
  const entries = R.contracts.filter(c => (c.kind === 'request' || !c.kind) && parties.has(c.from) && R.comps.has(c.to));
  const entryIds = uniq(entries.map(c => c.to));
  const roots = entryIds.length ? entryIds : comps.filter(id => !edges.some(e => e.to === id));
  // Kahn's order; edges that close a cycle are left out and named.
  const indeg = new Map(comps.map(id => [id, 0])); for (const e of edges) indeg.set(e.to, indeg.get(e.to) + 1);
  const order = [], q = comps.filter(id => indeg.get(id) === 0), seen = new Set();
  while (q.length) { const id = q.shift(); if (seen.has(id)) continue; seen.add(id); order.push(id); for (const e of edges.filter(e => e.from === id)) { indeg.set(e.to, indeg.get(e.to) - 1); if (indeg.get(e.to) === 0) q.push(e.to); } }
  const cyclic = comps.filter(id => !seen.has(id)); order.push(...cyclic);
  const outside = R.contracts.filter(c => (c.kind === 'request' || !c.kind) && R.comps.has(c.from) && parties.has(c.to));
  return {edges, entries, roots, order, cyclic, outside, parties: list(p?.interfaces?.parties)};
}

// ---------------------------------------------------------------- the plan

// Each reads the project's lists through the reasoning source's lookups (design-reasoning.js, round 5, R5-G): the same
// records a scan of the list finds, at one lookup each, so the plan no longer searches every need, mapping, plan and
// driver chain for each of 500 components and realisations.
const capsOf = (R, compId) => {
  const needs = rowsWith(R, 'needsByApp', compId);
  return needs.map(n => { const m = firstWith(R, 'techByNeed', n.id); const c = m && R.caps.get(m.capabilityId); return c ? {cap: c, need: n} : null; }).filter(Boolean);
};
const realsOfCap = (R, capId) => uniq(rowsWith(R, 'realByCap', capId).map(m => m.realizationId)).map(id => R.reals.get(id)).filter(Boolean);
const capsOfReal = (R, realId) => uniq(rowsWith(R, 'realByReal', realId).map(m => m.capabilityId)).map(id => R.caps.get(id)).filter(Boolean);
const planOf = (R, assetId) => { const plans = rowsWith(R, 'plansByAsset', assetId); const pl = R.selectedEnvironmentId ? plans.find(p => p.environmentId === R.selectedEnvironmentId) : plans[0]; return pl ? planFacts(R, pl) : null; };
// The drivers whose chain reaches one of ids (a component or a realisation), in driver order.
const carried = (R, ids) => { const C = carriersOf(R), found = new Set(); for (const id of ids) for (const d of C.parts.get(id) || []) found.add(d); return [...found].sort((a, b) => C.at.get(a) - C.at.get(b)); };
const needsSpare = ds => ds.some(d => ['availability', 'recoverability'].includes(d.category) || d.priority === 'High');

export function capacityPlan(R, objective) {
  const O = objective, A = O.assume, u = num(A.utilisation) / 100;
  const F = flowOf(R);
  const env = R.selectedEnvironmentId || [...R.plans.values()][0]?.environmentId || null;
  const zones = [...R.zones.values()].filter(z => !env || z.environmentId === env);
  const Z = Math.max(1, zones.length);
  // No load stated (GR-RUN-04): no arrival rate, no part's demand, no cluster; the synchronous hops stay, which the
  // latency reading counts whatever the load.
  if (O.value == null) {
    const hops = F.edges.filter(e => !isAsync(e.interaction || 'sync')).length;
    return {objective: O, objText: NO_LOAD, objBasis: NO_LOAD, noLoad: true, example: false, workload: O.source?.workload || null, exampleFigures: [], lambda: null, base: null,
      lambdaMath: 'No load is stated, so no arrival rate is computed: state a Chapter 2 scalability driver with a target, or save the review objective here', zones: Z, hops, rows: [],
      totals: {pods: 0, vcpu: 0, mem: 0, nodes: 0}, counts: {ok: 0, warn: 0, bad: 0, none: 0}, notes: []};
  }
  const think = num(A.thinkSeconds), resp = O.response.ms / 1000;
  const surge = O.surge?.on && O.surge.factor ? O.surge.factor : 1;
  const base = O.kind === 'rate' ? O.value : O.value / (think + resp);
  const lambda = base * surge;
  // When the reader explores the SA Playbook's example (GR-RUN-04), every text that carries the objective is labelled
  // "assumed (playbook example)", and where the project records a different workload, says it is not this project's load.
  const example = O.source?.kind === 'playbook', workload = example ? O.source.workload || null : null;
  const objText = (O.kind === 'rate' ? `${fmtN(O.value)} requests a second at the entry` : `${fmtN(O.value)} concurrent users`) + (example ? ', ' + EXAMPLE_LABEL : '');
  const objBasis = !example ? objText : workload ? `${objText} — the SA Playbook's example, not this project's load: ${workload.driverId} records ${workload.text}` : `${objText} — the SA Playbook's example; this project records no objective of its own`;
  const lambdaMath = (O.kind === 'rate' ? `${fmtN(O.value)} req/s` : `${fmtN(O.value)} users ÷ (${fmtN(think)} s between requests + ${fmtN(resp, 1)} s response${O.response.driverId ? ' (' + O.response.driverId + ')' : ', assumed'}) = ${fmtN(base)} req/s`) + (surge !== 1 ? ` × ${fmtN(surge, 1)} for ${O.surge.driverId}'s surge = ${fmtN(lambda)} req/s` : '') + (example ? ', ' + EXAMPLE_LABEL : '');

  // Rates along the recorded interactions: each interaction happens once per request.
  const rate = new Map([...R.comps.keys()].map(id => [id, 0]));
  const perEntry = F.roots.length ? lambda / F.roots.length : 0;
  for (const id of F.roots) rate.set(id, perEntry);
  // Forward along the order; an edge back up the order closes a loop and is counted once.
  const pos = new Map(F.order.map((id, i) => [id, i]));
  for (const id of F.order) for (const e of F.edges.filter(e => e.from === id && pos.get(e.to) > pos.get(id))) rate.set(e.to, rate.get(e.to) + rate.get(id));
  const syncEdges = F.edges.filter(e => !isAsync(e.interaction || 'sync'));
  const onSync = new Set(syncEdges.flatMap(e => [e.from, e.to]));
  const hops = syncEdges.length;

  const spare = (load, ds) => {
    if (!needsSpare(ds)) return {n: Math.max(1, load), rule: 'no availability, recovery or Critical driver: load only'};
    if (A.survive === 'zone' && Z >= 2) { const per = ceil(load / (Z - 1)); return {n: Math.max(2, per * Z), rule: `survive one of ${Z} zones: ${fmtN(per)} in each zone, so ${Z - 1} zone${Z - 1 === 1 ? '' : 's'} still carr${Z - 1 === 1 ? 'ies' : 'y'} the load`}; }
    return {n: Math.max(2, load + 1), rule: A.survive === 'zone' ? 'only one zone is recorded, so one spare replica' : 'survive one replica: one spare'};
  };
  const verdictReplicas = (need, f, label = 'replicas') => {
    if (!f) return {state: 'none', why: 'No runtime plan records it.'};
    if (f.maxReplicas == null) return {state: 'none', why: `${f.plan.ref} records no maximum, so whether it can reach ${fmtN(need)} ${label} is not recorded.`};
    return f.maxReplicas >= need ? {state: 'ok', why: `${f.plan.ref} can grow to ${fmtN(f.maxReplicas)}; ${fmtN(need)} needed.`} : {state: 'bad', why: `${f.plan.ref} can grow to ${fmtN(f.maxReplicas)}: short by ${fmtN(need - f.maxReplicas)}.`};
  };
  // Several checks on one part: the worst state leads, and every concern is said.
  const RANK = ['bad', 'warn', 'none', 'ok'];
  const worst = (...vs) => { const xs = vs.filter(Boolean).sort((a, b) => RANK.indexOf(a.state) - RANK.indexOf(b.state)); return xs.length ? {state: xs[0].state, why: xs.filter(x => x.state !== 'ok' || xs.length === 1).map(x => x.why).join(' ')} : {state: 'none', why: ''}; };
  const rows = [];
  // A single-unit bottleneck (one queue's leader, one database primary): where the objective passes it,
  // and which recorded alternative spreads the load instead.
  const objUnits = O.kind === 'users' ? 'concurrent users' : 'requests a second';
  const products = productsAvailable(R.p), factOf = (n, k) => products ? fact(n, k) : null, factsOf = n => products ? factsFor(n) : [];
  const mechanismCache = new Map(), mechanismsFor = o => {if(!o)return [];if(!mechanismCache.has(o))mechanismCache.set(o,productMechanisms(o,{products}).filter(m=>m.applicability.state==='context-match'));return mechanismCache.get(o);};
  const ceilingFor = (r, demand) => {
    const pr = productOf(r), c = products ? ceilingOf(pr?.product) : null;
    // A planning rate remains an explicit analytical assumption. Calling it one
    // queue or one write-primary also requires that option's actual configuration.
    const mechanism = c && mechanismsFor(pr?.option).find(m=>m.id===c.trait.id&&m.effect==='ceiling');
    if (!mechanism || demand == null) return null;
    const limit = num(A[c.key]), threshold = limit * u, holdsTo = demand > 0 ? O.value * threshold / demand : null;
    const others = (r.options || []).filter(o => o.product && o.id !== pr.option.id).map(o => ({id: o.id, product: o.product, trait: mechanismsFor(o).find(m=>m.spreads)})).filter(x => x.trait);
    return {...c, product: pr.product, optionId: pr.option.id, limit, threshold, demand, passed: demand > threshold, holdsTo, holdsText: holdsTo == null ? 'any objective' : `≈${fmtN(sig(holdsTo))} ${objUnits}`, others, src: c.trait.src, mechanism: c.trait.text,applicability:mechanism.applicability,
      advice: `${c.beyond}${others.length ? ', or ' + others.map(x => `${x.id} ${x.product}: ${lower(x.trait.text)}`).join('; ') : '.'}`};
  };
  const ceilingSpec = c => ({k: c.label[0].toUpperCase() + c.label.slice(1), v: `${c.passed ? 'past it above' : 'holds to'} ≈${fmtN(sig(c.holdsTo))} ${O.kind === 'users' ? 'users' : 'req/s'}`, d: `${fmtN(c.limit)} ${c.unitName} assumed, planned at ${fmtN(u * 100)} %`});
  const ceilingVerdict = c => c.passed ? {state: 'warn', why: `${c.what}: ${fmtN(c.demand)} ${c.unitName} against ${fmtN(c.threshold)} planned (${fmtN(c.limit)} assumed, at ${fmtN(u * 100)} %) — past it from about ${fmtN(sig(c.holdsTo))} ${objUnits}. ${c.advice}`} : null;

  // Services and workers, in the order work flows.
  const compRows = new Map();
  for (const id of F.order) {
    const c = R.comps.get(id), r = rate.get(id), worker = /worker|consumer|job/i.test(c.kind || '') || F.edges.some(e => e.to === id && isAsync(e.interaction));
    const override = num(O.perReplica[id]), per = override ?? (worker ? num(A.workerPerReplica) : num(A.servicePerReplica)), unit = worker ? 'msg/s' : 'req/s';
    const load = r > 0 ? ceil(r / (per * u)) : 0, ds = carried(R, [id]), sp = spare(load, ds);
    const caps = capsOf(R, id), cats = caps.map(x => x.cap.category);
    const compute = caps.find(x => x.cap.category === 'compute'), computeProd = compute ? productOf(realsOfCap(R, compute.cap.id)[0]) : null;
    const f = planOf(R, id);
    const conns = cats.includes('transactional') ? sp.n * num(A.poolPerReplica) : 0;
    const budget = onSync.has(id) ? O.response.ms / (hops + 1) : null;
    const spec = [
      {k: 'Replicas', v: fmtN(sp.n), d: `${fmtN(load)} for the load${sp.n > load ? ` + ${fmtN(sp.n - load)} (${sp.rule})` : ''}`},
      {k: 'Each replica', v: `${fmtN(per)} ${unit}`, d: override != null ? 'set for this part on the desk' : 'planning assumption'},
      {k: 'CPU · memory', v: `${fmtN(sp.n * num(A.cpuPerReplica), 1)} vCPU · ${fmtN(sp.n * num(A.memPerReplica), 1)} GiB`, d: `${fmtN(num(A.cpuPerReplica), 1)} vCPU and ${fmtN(num(A.memPerReplica), 1)} GiB each`}
    ];
    if (conns) spec.push({k: 'Database connections', v: fmtN(conns), d: `${fmtN(sp.n)} replicas × ${fmtN(num(A.poolPerReplica))}`});
    if (budget != null) spec.push({k: 'Time budget', v: `≈ ${fmtN(budget)} ms`, d: `${O.response.driverId || 'the assumed response'} shared by ${hops + 1} steps on the synchronous path`});
    const inbound = F.edges.filter(e => e.to === id).map(e => R.comps.get(e.from)?.ref + (isAsync(e.interaction) ? ' (event)' : '')).filter(Boolean);
    const row = {id, band: 'parts', kind: worker ? 'worker' : 'service', ref: c.ref, title: c.title, product: computeProd ? 'on ' + productLabel(computeProd) : '',
      demand: {value: r, unit, text: `${fmtN(r)} ${unit}`}, spec, replicas: sp.n, loadReplicas: load, connections: conns, cpu: sp.n * num(A.cpuPerReplica), mem: sp.n * num(A.memPerReplica),
      plan: f, drivers: ds.map(d => d.id), verdict: r > 0 ? verdictReplicas(sp.n, f) : {state: 'none', why: 'No recorded interaction reaches it from the entry, so no load is carried to it.'},
      math: [inbound.length ? `${fmtN(r)} ${unit} arrive from ${inbound.join(' and ')}` : F.roots.includes(id) ? `${fmtN(r)} ${unit}: the entry${F.roots.length > 1 ? ', shared with ' + (F.roots.length - 1) + ' other' + (F.roots.length > 2 ? 's' : '') : ''} (${lambdaMath})` : 'nothing recorded reaches it', `${fmtN(r)} ÷ (${fmtN(per)} × ${fmtN(u * 100)} %) = ${fmtN(r / (per * u), 1)} → ${fmtN(load)} replicas for the load`, sp.n > load ? `${sp.rule} → ${fmtN(sp.n)}` : ''].filter(Boolean),
      fix: {chapter: 10, id: f?.plan.id || id, label: f ? `Set ${f.plan.ref}'s replicas in Chapter 10` : 'Plan it in Chapter 10'}, sources: {cats}};
    rows.push(row); compRows.set(id, row);
  }

  // Platform realisations, in a fixed reading order: edge, identity, data, messaging, cache, telemetry, backup, recovery, compute.
  const realsBy = cat => [...R.reals.values()].filter(r => capsOfReal(R, r.id).some(c => c.category === cat));
  // The components that stand on a realisation for a category, in component order: worked out once per category.
  const usersBy = new Map();
  const usersOf = (real, cat) => {
    if (!usersBy.has(cat)) {
      const by = new Map();
      for (const id of R.comps.keys()) { const on = new Set(); for (const x of capsOf(R, id)) if (x.cap.category === cat) for (const r of realsOfCap(R, x.cap.id)) on.add(r.id); for (const rid of on) { let xs = by.get(rid); if (!xs) by.set(rid, xs = []); xs.push(id); } }
      usersBy.set(cat, by);
    }
    return (usersBy.get(cat).get(real.id) || []).slice();
  };
  const prod = r => productOf(r), plabel = r => productLabel(prod(r)) || 'no product named';
  const recordedCap = r => str(r.capacityValue) !== '' ? `${fmtN(num(r.capacityValue))} ${r.capacityUnit || ''}`.trim() : null;
  // A recorded capacity in the unit the desk asks for can be compared; any other stays for a person to read.
  const recordedIn = (r, unit) => num(r.capacityValue) != null && unit.test(str(r.capacityUnit)) ? num(r.capacityValue) : null;
  const against = (r, unit, need, what) => { const v = recordedIn(r, unit); if (v == null || need == null) return null; return v >= need ? {state: 'ok', why: `Chapter 7 records ${recordedCap(r)}: ${what(v, true)}.`} : {state: 'bad', why: `Chapter 7 records ${recordedCap(r)}: ${what(v, false)}.`}; };
  const platformRow = (r, band, kind, demand, unit, extra = {}) => {
    const ds = carried(R, [r.id].concat(extra.users || [])), per = num(O.perReplica[r.id]) ?? num(A.platformPerReplica), load = demand > 0 ? ceil(demand / (per * u)) : 0, sp = spare(load, ds), f = planOf(R, r.id);
    return {id: r.id, band, kind, ref: r.ref, title: r.title, product: plabel(r), demand: {value: demand, unit, text: `${fmtN(demand)} ${unit}`}, replicas: sp.n, loadReplicas: load, plan: f, drivers: ds.map(d => d.id),
      spec: [{k: 'Replicas', v: fmtN(sp.n), d: `${fmtN(load)} for the load${sp.n > load ? ` + ${fmtN(sp.n - load)} (${sp.rule})` : ''}`}, {k: 'Each replica', v: `${fmtN(per)} ${unit}`, d: num(O.perReplica[r.id]) != null ? 'set for this part on the desk' : 'planning assumption'}],
      verdict: verdictReplicas(sp.n, f), math: [extra.why || '', `${fmtN(demand)} ÷ (${fmtN(per)} × ${fmtN(u * 100)} %) → ${fmtN(load)} replicas${sp.n > load ? `; ${sp.rule} → ${fmtN(sp.n)}` : ''}`].filter(Boolean),
      recorded: recordedCap(r), facts: factsOf(prod(r)?.product), fix: {chapter: 7, id: r.id, label: `Record ${r.ref}'s capacity in Chapter 7`}};
  };
  for (const r of realsBy('connectivity')) rows.push(platformRow(r, 'edge', 'gateway', lambda, 'req/s', {why: `Every request enters through it: ${lambdaMath}.`}));
  for (const r of realsBy('identity')) rows.push(platformRow(r, 'edge', 'identity', lambda, 'decisions/s', {why: `One access decision for each request that enters (assumed): ${fmtN(lambda)} a second.`}));

  let writesTotal = 0;
  for (const r of realsBy('transactional')) {
    const users = usersOf(r, 'transactional'), share = num(A.readShare) / 100, hit = num(A.cacheHitRatio) / 100;
    let reads = 0, writes = 0, offload = 0, conns = 0;
    for (const id of users) { const row = compRows.get(id), ops = (row?.demand.value || 0) * num(A.storeOpsPerRequest), rd = ops * share, cached = capsOf(R, id).some(x => x.cap.category === 'caching'); reads += cached ? rd * (1 - hit) : rd; offload += cached ? rd * hit : 0; writes += ops - rd; conns += row?.connections || 0; }
    writesTotal += writes;
    const pr = prod(r), maxC = factOf(pr?.product, 'maxConnections'), ds = carried(R, [r.id, ...users]), nodes = needsSpare(ds) ? 2 : 1, f = planOf(R, r.id), growth = writes * 86400 * num(A.recordKB) / 1048576;
    const connV = maxC && conns > maxC.value ? {state: 'warn', why: `${fmtN(conns)} connections needed; ${maxC.text} ${maxC.advice}`} : null;
    const cl = ceilingFor(r, writes);
    const rv = f && f.maxReplicas != null ? (f.maxReplicas >= nodes ? {state: 'ok', why: `${f.plan.ref} allows ${fmtN(f.maxReplicas)} node${f.maxReplicas === 1 ? '' : 's'}; ${nodes} needed.`} : {state: 'bad', why: `${f.plan.ref} allows ${fmtN(f.maxReplicas)}; ${nodes} needed (primary and standby).`}) : {state: 'none', why: recordedCap(r) ? `Chapter 7 records ${recordedCap(r)}; no runtime plan records how many nodes.` : 'No capacity or node count is recorded.'};
    rows.push({id: r.id, band: 'data', kind: 'store', ref: r.ref, title: r.title, product: plabel(r), demand: {value: reads + writes, unit: 'ops/s', text: `${fmtN(reads + writes)} ops/s`}, plan: f, drivers: ds.map(d => d.id), replicas: nodes,
      spec: [{k: 'Reads · writes', v: `${fmtN(reads)} · ${fmtN(writes)} a second`, d: offload ? `${fmtN(offload)} reads a second answered by the cache` : `${fmtN(num(A.readShare))} % of ${fmtN(num(A.storeOpsPerRequest))} operations a request are reads`},
        ...(cl ? [ceilingSpec(cl)] : []),
        {k: 'Connections', v: fmtN(conns), d: users.map(id => compRows.get(id)?.ref).filter(Boolean).join(', ') + ' together'},
        {k: 'Nodes', v: fmtN(nodes), d: nodes > 1 ? 'a primary and a standby: it carries an availability, recovery or Critical driver' : 'one primary'},
        {k: 'Growth', v: `${fmtN(growth, 1)} GB a day`, d: `${fmtN(writes)} writes a second × ${fmtN(num(A.recordKB))} KB`}],
      verdict: worst(cl && ceilingVerdict(cl), connV, rv), recorded: recordedCap(r), facts: factsOf(pr?.product), ceiling: cl,
      math: [`Reached by ${users.map(id => compRows.get(id)?.ref).filter(Boolean).join(', ') || 'no component'}: each request makes ${fmtN(num(A.storeOpsPerRequest))} operations, ${fmtN(num(A.readShare))} % of them reads${offload ? `; ${fmtN(num(A.cacheHitRatio))} % of the cached parts' reads are answered by the cache` : ''}.`], fix: {chapter: 7, id: r.id, label: `Record ${r.ref}'s capacity in Chapter 7`}});
  }

  for (const r of realsBy('messaging')) {
    const async = F.edges.filter(e => isAsync(e.interaction)), msgs = async.reduce((n, e) => n + (rate.get(e.from) || 0), 0);
    const consumers = uniq(async.map(e => e.to)), recDrv = R.drivers.filter(d => d.category === 'recoverability' && toMinutes(d.targetValue, d.unit) != null);
    const consumerRec = consumers.map(id => planOf(R, id)?.recoveryMinutes).filter(v => v != null);
    const windowMin = recDrv.length ? Math.min(...recDrv.map(d => toMinutes(d.targetValue, d.unit))) : consumerRec.length ? Math.max(...consumerRec) : null;
    const backlog = windowMin != null ? msgs * 60 * windowMin : null, size = backlog != null ? backlog * num(A.messageKB) / 1048576 : null;
    const pr = prod(r), q = factOf(pr?.product, 'clusterNodes'), ds = carried(R, [r.id, ...consumers]), nodes = needsSpare(ds) ? (q ? q.value : 2) : 1, f = planOf(R, r.id);
    const recorded = recordedCap(r), cl = ceilingFor(r, msgs);
    rows.push({id: r.id, band: 'data', kind: 'queue', ref: r.ref, title: r.title, product: plabel(r), demand: {value: msgs, unit: 'msg/s', text: `${fmtN(msgs)} msg/s`}, plan: f, drivers: ds.map(d => d.id), replicas: nodes,
      spec: [{k: 'Messages', v: `${fmtN(msgs)} a second`, d: async.map(e => `${R.comps.get(e.from)?.ref} → ${R.comps.get(e.to)?.ref}`).join(', ') || 'no asynchronous interaction recorded'},
        ...(cl ? [ceilingSpec(cl)] : []),
        {k: 'Backlog to hold', v: backlog != null ? `${fmtN(backlog)} messages` : 'not known', d: backlog != null ? `${fmtN(windowMin)} min of consumer outage (${recDrv.length ? recDrv.map(d => d.id).join(', ') : 'the consumer\'s recorded recovery'}) · ${fmtN(size, 1)} GB at ${fmtN(num(A.messageKB))} KB` : `no recovery target is recorded; it grows by ${fmtN(msgs * 60)} messages a minute of consumer outage`},
        {k: 'Nodes', v: fmtN(nodes), d: q && nodes === q.value ? q.text : nodes > 1 ? 'a spare for the availability it carries' : 'one node'}],
      verdict: worst(against(r, /messag/i, backlog, (v, ok) => ok ? `it holds the ${fmtN(backlog)} messages ${fmtN(windowMin)} min of consumer outage leaves` : `short of the ${fmtN(backlog)} messages ${fmtN(windowMin)} min of consumer outage leaves`) || (recorded ? {state: 'none', why: `Chapter 7 records ${recorded}; compare it with a backlog of ${backlog != null ? fmtN(backlog) + ' messages' : 'the recovery window'}.`} : {state: 'bad', why: `No capacity is recorded, so nothing says the queue can hold ${backlog != null ? fmtN(backlog) + ' messages' : 'a consumer outage'} — or what the sender does when it cannot.`}), cl && ceilingVerdict(cl)), ceiling: cl, backlog, windowMin, estimatesConfirmed: !!r.estimatesConfirmed,
      recorded, facts: factsOf(pr?.product), math: [`Each asynchronous interaction sends one message for each request that reaches its sender.`, backlog != null ? `${fmtN(msgs)} msg/s × 60 × ${fmtN(windowMin)} min = ${fmtN(backlog)} messages` : ''].filter(Boolean), fix: {chapter: 7, id: r.id, label: `Record ${r.ref}'s bound in Chapter 7`}});
  }

  for (const r of realsBy('caching')) {
    const users = usersOf(r, 'caching'), share = num(A.readShare) / 100, hit = num(A.cacheHitRatio) / 100;
    const reads = users.reduce((n, id) => n + (compRows.get(id)?.demand.value || 0) * num(A.storeOpsPerRequest) * share * hit, 0);
    const pr = prod(r), s = factOf(pr?.product, 'sentinels'), ds = carried(R, [r.id, ...users]), nodes = needsSpare(ds) ? 2 : 1, f = planOf(R, r.id);
    rows.push({id: r.id, band: 'data', kind: 'cache', ref: r.ref, title: r.title, product: plabel(r), demand: {value: reads, unit: 'reads/s', text: `${fmtN(reads)} reads/s`}, plan: f, drivers: ds.map(d => d.id), replicas: nodes,
      spec: [{k: 'Reads answered', v: `${fmtN(reads)} a second`, d: users.length ? `for ${users.map(id => compRows.get(id)?.ref).join(', ')}` : 'no component records a caching need'}, {k: 'Nodes', v: fmtN(nodes), d: nodes > 1 ? 'a primary and a replica' + (s ? '; ' + s.text : '') : 'one node'}, {k: 'Memory', v: 'from the hot set', d: 'not recorded: size it from the records read most'}],
      verdict: {state: 'none', why: users.length ? 'Its memory depends on the hot set, which is not recorded.' : 'No component stands on it, so it carries no load.'}, recorded: recordedCap(r), facts: factsOf(pr?.product), math: [], fix: {chapter: 7, id: r.id, label: `Record ${r.ref}'s capacity in Chapter 7`}});
  }

  const spans = [...compRows.values()].reduce((n, x) => n + x.demand.value, 0);
  for (const r of realsBy('observability')) {
    const mb = spans * num(A.spanKB) / 1024;
    rows.push({id: r.id, band: 'platform', kind: 'telemetry', ref: r.ref, title: r.title, product: plabel(r), demand: {value: spans, unit: 'spans/s', text: `${fmtN(spans)} spans/s`}, plan: planOf(R, r.id), drivers: carried(R, [r.id]).map(d => d.id),
      spec: [{k: 'Ingest', v: `${fmtN(mb, 1)} MB a second`, d: `${fmtN(spans)} part-requests a second × ${fmtN(num(A.spanKB))} KB`}, {k: 'Retention', v: `${fmtN(mb * 86400 / 1024, 1)} GB a day`, d: 'before sampling or compression'}],
      verdict: against(r, /span/i, spans, (v, ok) => ok ? `it takes the ${fmtN(spans)} spans a second the objective sends` : `short of the ${fmtN(spans)} spans a second the objective sends`) || {state: 'none', why: 'Size its storage and sampling from this ingest; nothing is recorded to compare it with.'}, recorded: recordedCap(r), estimatesConfirmed: !!r.estimatesConfirmed, ingestMB: mb, facts: factsOf(prod(r)?.product), math: ['Each part a request reaches emits one span of telemetry.'], fix: {chapter: 7, id: r.id, label: `Record ${r.ref}'s capacity in Chapter 7`}});
  }
  for (const r of realsBy('backup')) {
    const gb = writesTotal * 86400 * num(A.recordKB) / 1048576, loss = capsOfReal(R, r.id).map(c => num(c.lossMinutes)).filter(v => v != null);
    rows.push({id: r.id, band: 'platform', kind: 'backup', ref: r.ref, title: r.title, product: plabel(r), demand: {value: gb, unit: 'GB/day', text: `${fmtN(gb, 1)} GB a day`}, plan: planOf(R, r.id), drivers: carried(R, [r.id]).map(d => d.id),
      spec: [{k: 'Changed data', v: `${fmtN(gb, 1)} GB a day`, d: `${fmtN(writesTotal)} writes a second × ${fmtN(num(A.recordKB))} KB`}, {k: 'Loss allowed', v: loss.length ? `${fmtN(Math.min(...loss))} min` : 'not recorded', d: loss.length ? 'the Chapter 6 recovery-point objective' : 'Chapter 6 records no recovery-point objective'}],
      verdict: loss.length ? {state: 'none', why: 'Check the backup interval and log shipping against the recovery-point objective.'} : {state: 'none', why: 'No recovery-point objective is recorded to size it against.'}, recorded: recordedCap(r), facts: factsOf(prod(r)?.product), math: [], fix: {chapter: 6, id: capsOfReal(R, r.id)[0]?.id || r.id, label: 'Record the recovery-point objective in Chapter 6'}});
  }
  for (const r of realsBy('recovery')) {
    const rec = R.drivers.filter(d => d.category === 'recoverability' && toMinutes(d.targetValue, d.unit) != null);
    rows.push({id: r.id, band: 'platform', kind: 'recovery', ref: r.ref, title: r.title, product: plabel(r), demand: {value: null, unit: '', text: rec.length ? `within ${fmtN(Math.min(...rec.map(d => toMinutes(d.targetValue, d.unit))))} min` : 'no target'}, plan: planOf(R, r.id), drivers: carried(R, [r.id]).map(d => d.id),
      spec: [{k: 'Failover within', v: rec.length ? `${fmtN(Math.min(...rec.map(d => toMinutes(d.targetValue, d.unit))))} min` : 'not recorded', d: rec.map(d => d.id).join(', ') || 'no recovery driver'}],
      verdict: {state: 'none', why: 'A failover time is shown by a recovery drill, not by arithmetic.'}, recorded: recordedCap(r), facts: factsOf(prod(r)?.product), math: [], fix: {chapter: 10, id: r.id, label: 'Record the recovery drill in Chapter 10'}});
  }

  // The cluster the services run on.
  const pods = [...compRows.values()].reduce((n, x) => n + x.replicas, 0), vcpu = [...compRows.values()].reduce((n, x) => n + x.cpu, 0), mem = [...compRows.values()].reduce((n, x) => n + x.mem, 0);
  const nodeLoad = Math.max(ceil(vcpu / (num(A.nodeVcpu) * u)), ceil(mem / (num(A.nodeMemGiB) * u)), pods ? 1 : 0);
  const nodes = pods ? (A.survive === 'zone' && Z >= 2 ? ceil(nodeLoad / (Z - 1)) * Z : nodeLoad + 1) : 0;
  for (const r of realsBy('compute')) {
    rows.push({id: r.id, band: 'platform', kind: 'cluster', ref: r.ref, title: r.title, product: plabel(r), demand: {value: pods, unit: 'pods', text: `${fmtN(pods)} pods`}, plan: planOf(R, r.id), drivers: carried(R, [r.id]).map(d => d.id), replicas: nodes,
      spec: [{k: 'Pods', v: fmtN(pods), d: 'the services and workers above'}, {k: 'vCPU · memory', v: `${fmtN(vcpu, 1)} vCPU · ${fmtN(mem, 1)} GiB`, d: 'requested by those pods'}, {k: 'Nodes', v: fmtN(nodes), d: `${fmtN(nodeLoad)} of ${fmtN(num(A.nodeVcpu))} vCPU and ${fmtN(num(A.nodeMemGiB))} GiB at ${fmtN(u * 100)} %${nodes > nodeLoad ? A.survive === 'zone' && Z >= 2 ? `, spread so one of ${Z} zones can fail` : ' + one spare node' : ''}`}],
      verdict: against(r, /node/i, nodes, (v, ok) => ok ? `room for the ${fmtN(nodes)} nodes the pods need` : `short of the ${fmtN(nodes)} nodes the pods need`) || {state: 'none', why: recordedCap(r) ? `Chapter 7 records ${recordedCap(r)}; compare it with ${fmtN(nodes)} nodes.` : 'No cluster size is recorded to compare with.'}, recorded: recordedCap(r), estimatesConfirmed: !!r.estimatesConfirmed, nodeLoad, facts: factsOf(prod(r)?.product),
      math: [`max(${fmtN(vcpu, 1)} ÷ (${fmtN(num(A.nodeVcpu))} × ${fmtN(u * 100)} %), ${fmtN(mem, 1)} ÷ (${fmtN(num(A.nodeMemGiB))} × ${fmtN(u * 100)} %)) → ${fmtN(nodeLoad)} nodes`], fix: {chapter: 7, id: r.id, label: `Record ${r.ref}'s cluster size in Chapter 7`}});
  }

  // What the outside must take.
  for (const c of F.outside) {
    const party = F.parties.find(x => x.id === c.to), r = rate.get(c.from) || 0;
    rows.push({id: c.id, band: 'outside', kind: 'external', ref: party?.ref || c.ref, title: party?.title || c.title, product: c.ref + ' ' + c.title, demand: {value: r, unit: 'req/s', text: `${fmtN(r)} req/s`}, plan: null, drivers: [],
      spec: [{k: 'Must accept', v: `${fmtN(r)} requests a second`, d: `from ${R.comps.get(c.from)?.ref} through ${c.ref}`}, {k: 'Timeout', v: num(c.timeoutMs) != null ? `${fmtN(num(c.timeoutMs))} ms` : 'not recorded', d: 'how long the caller waits'}],
      verdict: {state: 'none', why: 'Agree this rate with the provider, and what happens above it.'}, recorded: null, facts: [], math: [], fix: {chapter: 8, id: c.id, label: `Record ${c.ref}'s limits in Chapter 8`}});
  }

  // Each part's demand read from the example says so on its own line (GR-RUN-04).
  if (example) for (const r of rows) if (r.demand?.text && !r.demand.text.endsWith(EXAMPLE_LABEL)) r.demand.text += ' · ' + EXAMPLE_LABEL;
  const count = s => rows.filter(r => r.verdict.state === s).length;
  // The figures computed from the example, so Sol's checks can tell sizing for it from sizing for this project.
  const exampleFigures = example ? [...new Set([O.value, base, lambda, pods, nodes, ...rows.flatMap(r => [r.replicas, r.loadReplicas, r.demand?.value])].filter(n => Number.isFinite(n) && n > 12).map(n => String(Math.round(n))))] : [];
  return {objective: O, objText, objBasis, example, workload, exampleFigures, lambda, base, lambdaMath, zones: Z, hops, rows, totals: {pods, vcpu, mem, nodes}, counts: {ok: count('ok'), warn: count('warn'), bad: count('bad'), none: count('none')},
    notes: [F.cyclic.length ? `The interactions among ${F.cyclic.map(id => R.comps.get(id)?.ref).join(', ')} form a loop; their rates count one pass.` : '', F.roots.length > 1 ? `${F.roots.length} entries share the arrival rate equally.` : '', 'Each recorded interaction is taken to happen once for each request that reaches its sender.'].filter(Boolean)};
}

// The same specification as Markdown, for the SDD.
export function capacityMarkdown(C) {
  if (!C) return '';
  const O = C.objective, A = O.assume;
  const row = r => `| ${r.ref} ${r.title} | ${r.product || ''} | ${r.demand.text} | ${r.spec.map(s => s.k + ': ' + s.v).join('; ')} | ${({ok: 'Meets', bad: 'Short', warn: 'Check', none: 'Not recorded'})[r.verdict.state]} — ${r.verdict.why} |`;
  return `## Performance specification\n\nObjective: ${C.objText} (${O.source.text}${O.source.src ? ', ' + O.source.src : ''}). ${C.lambdaMath}.\n\n| Part | Product | Demand | Specification | Against the design |\n| --- | --- | --- | --- | --- |\n${C.rows.map(row).join('\n')}\n\nCluster: ${fmtN(C.totals.pods)} pods, ${fmtN(C.totals.vcpu, 1)} vCPU, ${fmtN(C.totals.mem, 1)} GiB, ${fmtN(C.totals.nodes)} nodes.\n\nPlanning assumptions: ${ASSUMPTIONS.map(a => `${a.label.toLowerCase()} ${a.options ? a.options.find(([v]) => v === A[a.key])?.[1] : fmtN(num(A[a.key]), 1) + (a.unit ? ' ' + a.unit : '')}`).join('; ')}. They are estimates for review, not benchmarks; replace each with load-test evidence.\n\n`;
}


// ---------------------------------------------------------------- scale readings (round 6, Contract K)
//
// What the recorded targets imply for each component — derived, never measured. From the Chapter 2 drivers that carry a
// number (a rate, concurrent users, a data volume, a growth rate, a latency target) and the Chapter 8 data definitions
// that state a record count or a size, the demand each component carries at peak: requests a second, storage and
// bandwidth. Compared with the Chapter 10 placements (how many active copies are placed, how many the plan allows) and
// with the reference latency figures of the trade-off pack (brain-tradeoffs.js, LN-*: orders of magnitude for
// estimation, not measurements). Every number names what it rests on, and an assumption is named as one. The findings
// join Chapter 10's checks as to-confirm (runtime-domain.js): SCALE-NO-TARGET once per project when no demand target
// is recorded, SCALE-UNDER-PROVISIONED per plan whose placed copies fall short, SCALE-LATENCY-BUDGET per entry whose
// required path spends the latency target on reference round trips alone, SCALE-UNCONFIRMED once per project while a
// derived number rests on an unconfirmed target or a named assumption. Pure; nothing here changes the project.
export const SCALE_PEAK_FACTOR = 3;
export const SCALE_CODES = ['SCALE-NO-TARGET', 'SCALE-UNDER-PROVISIONED', 'SCALE-LATENCY-BUDGET', 'SCALE-UNCONFIRMED'];
const FIGURE = Object.fromEntries(BRAIN_TRADEOFFS.figures.map(f => [f.id, f]));
const HOP = {centre: 'LN-006', region: 'LN-009'};
const figureMs = id => FIGURE[id].value / 1e6;
const RATE_PER = /(?:\b(?:per|a|an)\s+|\/\s*)(second|sec|s|minute|min|hour|hr|h|day|d)\b|\b(rps|tps|qps)\b/i;
const PER_SECONDS = {second: 1, sec: 1, s: 1, minute: 60, min: 60, hour: 3600, hr: 3600, h: 3600, day: 86400, d: 86400};
const VOLUME = /\b(tb|terabytes?|gb|gigabytes?|mb|megabytes?)\b/i, COUNT_UNIT = /\b(records?|rows|documents?|items?|files?|entries|events?|messages?|orders?|cases?|bookings?|reservations?|parcels?|holds?|loans?|accounts?|customers?|members?)\b/i;
const GROWTH = /\bgrowth\b|\bgrow\w*\b|\b(?:a|per)\s+(?:year|month|annum)\b|\bannual/i, LATENCY_WORDS = /latency|response|acknowledg|within|round trip|wait/i, PEAK_WORDS = /\bpeak\b|\bburst\b|\bsurge\b/i;
const MULT = {thousand: 1e3, k: 1e3, million: 1e6, m: 1e6, billion: 1e9, bn: 1e9};
const multOf = t => { const m = /\b(thousand|million|billion|bn|k|m)\b/i.exec(str(t)); return m ? MULT[m[1].toLowerCase()] : 1; };
// A number in prose, not one inside a reference (REQ-005) or a code: nothing letter-like or a hyphen just before it; and a
// count, not a rate: "20 deposits per second" names no stored records.
const COUNT_IN_TEXT = /(?<![\w-])(\d[\d,]*(?:\.\d+)?)\s*(thousand|million|billion|bn|k|m)?\s+(?:[a-z-]+\s+){0,2}?(records?|rows|documents?|items?|entries|events?|messages?|orders?|cases?|bookings?|reservations?|parcels?|deposits?|holds?|loans?|accounts?|requests?)\b(?!\s*(?:per|a|an|\/)\s*(?:second|sec|s|minute|min|hour|hr|h|day|d)\b)/i;
const SIZE_IN_TEXT = /(?<![\w-])(\d[\d,]*(?:\.\d+)?)\s*(bytes?|kb|kib|mb|mib|gb|gib)\b/i;
const BYTES = {byte: 1, bytes: 1, kb: 1024, kib: 1024, mb: 1048576, mib: 1048576, gb: 1073741824, gib: 1073741824};
const GB = 1073741824;
const unitOf = d => str(d.unit), textOf = d => [d.title, d.metric, d.stimulus, d.conditions, d.window].map(str).join(' ');
const targetWords = d => `${lower(str(d.operator)) || 'at most'} ${fmtN(num(d.targetValue))} ${str(d.unit)}`.trim();
// A driver's number, read as the kind of target its unit names: a rate (per second, minute, hour or day), concurrent
// users, a data volume, a growth rate in percent, or a latency in time units. A surge factor ("× normal peak") is none
// of these and is read as the peak factor.
export function scaleTarget(d) {
  const v = num(d.targetValue), u = unitOf(d);
  if (v == null || v < 0 || !u) return null;
  if (SURGE.test(u)) return {kind: 'surge', factor: v};
  const rate = RATE_PER.exec(u);
  if (rate) { const per = rate[1] ? PER_SECONDS[rate[1].toLowerCase()] : 1; return {kind: 'rate', perSecond: v * multOf(u) / per, peak: PEAK_WORDS.test(u + ' ' + textOf(d))}; }
  if (USERS.test(u)) return {kind: 'users', users: v * multOf(u)};
  const vol = VOLUME.exec(u);
  if (vol) { const k = vol[1].toLowerCase(); return {kind: 'volume', gb: v * (k.startsWith('t') ? 1024 : k.startsWith('m') ? 1 / 1024 : 1)}; }
  if (COUNT_UNIT.test(u)) return {kind: 'count', records: v * multOf(u)};
  if (/%/.test(u) && GROWTH.test(u + ' ' + textOf(d))) return {kind: 'growth', pct: v};
  const ms = toMs(v, u);
  if (ms != null && (d.category === 'performance' || LATENCY_WORDS.test(textOf(d)))) return {kind: 'latency', ms};
  return null;
}
// What a Chapter 8 data definition states about itself: a record count, a size per record, a retention in days.
export function dataFigures(d) {
  const text = [d.purpose, d.assumptions, d.evidence, d.retentionPolicy, ...list(d.fields).map(f => [f.description, f.constraints].join(' '))].map(str).join(' ');
  const c = COUNT_IN_TEXT.exec(text), s = SIZE_IN_TEXT.exec(text);
  return {records: c ? num(c[1].replace(/,/g, '')) * (c[2] ? MULT[c[2].toLowerCase()] : 1) : null, recordsText: c ? c[0].trim() : '', bytes: s ? num(s[1].replace(/,/g, '')) * BYTES[s[2].toLowerCase()] : null, bytesText: s ? s[0].trim() : '', retentionDays: num(d.retentionDays)};
}
const zoneOf = (p, id) => list(p?.runtime?.zones).find(z => z.id === id) || null;
const domainOf = z => lower(str(z?.failureDomain)) || lower(str(z?.title));
// Whether two zones read as one data centre or as two regions: a different failure domain that names a region, a site,
// a city or a country is a region apart; the same domain, or none recorded, is one data centre.
const REGION_WORDS = /\bregion|\bsite\b|\bcity\b|\bcountry\b|\bcontinent|\bdata ?cent|\bdc\b|\bzone [a-z0-9]\b/i;
function hopFigure(zonesA, zonesB) {
  if (!zonesA.length || !zonesB.length) return {id: HOP.centre, why: 'assumed in one data centre: a side is not placed'};
  const same = zonesA.some(a => zonesB.some(b => a.id === b.id || (domainOf(a) && domainOf(a) === domainOf(b))));
  if (same) return {id: HOP.centre, why: 'placed in one failure domain'};
  const apart = [...zonesA, ...zonesB].some(z => REGION_WORDS.test(str(z.failureDomain)));
  return apart ? {id: HOP.region, why: `placed in different failure domains (${domainOf(zonesA[0])} and ${domainOf(zonesB[0])})`} : {id: HOP.centre, why: 'placed in different failure domains that do not name a region'};
}

export function scaleReadings(p, {envId = null} = {}) {
  const R = reasoningSource(p), F = flowOf(R), A = DEF;
  R.selectedEnvironmentId = envId;
  const inputs = [], findings = [], figures = new Set(), unconfirmed = [], assumptions = [];
  const addInput = (d, t, words) => { inputs.push({id: d.id, kind: t.kind, words: `${d.id} · ${words}${d.targetConfirmed ? '' : ' · target not confirmed'}`, confirmed: !!d.targetConfirmed}); if (!d.targetConfirmed) unconfirmed.push(d.id); };
  const add = (code, objectId, title, detail) => findings.push({id: code + ':' + objectId, code, objectId, title, detail, level: 'warning'});
  // The targets, in driver order: the first of each kind leads (a scalability driver first for a rate or users).
  const found = {};
  const ordered = [...R.drivers].sort((a, b) => Number(b.category === 'scalability') - Number(a.category === 'scalability'));
  for (const d of ordered) { const t = scaleTarget(d); if (!t || found[t.kind]) continue; found[t.kind] = {d, t}; }
  const rate = found.rate, users = found.users, surge = found.surge, volume = found.volume, count = found.count, growth = found.growth, latency = found.latency;
  if (rate) addInput(rate.d, rate.t, `${targetWords(rate.d)} (${fmtN(rate.t.perSecond, rate.t.perSecond < 10 ? 2 : 0)} a second${rate.t.peak ? ', stated as a peak' : ''})`);
  else if (users) addInput(users.d, users.t, `${targetWords(users.d)}`);
  if (surge) addInput(surge.d, surge.t, `a peak of ${fmtN(surge.t.factor, 1)} × the stated load`);
  if (volume) addInput(volume.d, volume.t, `${targetWords(volume.d)} (${fmtN(volume.t.gb, 1)} GB)`);
  if (count) addInput(count.d, count.t, `${targetWords(count.d)}`);
  if (growth) addInput(growth.d, growth.t, `${targetWords(growth.d)} growth`);
  if (latency) addInput(latency.d, latency.t, `${targetWords(latency.d)} (${fmtN(latency.t.ms)} ms)`);
  const data = list(p?.interfaces?.data).map(d => ({d, f: dataFigures(d)})).filter(x => x.f.records != null || x.f.bytes != null);
  for (const {d, f} of data) inputs.push({id: d.id, kind: 'data', words: `${d.ref || d.id} · ${[f.recordsText, f.bytesText].filter(Boolean).join(', ')}`, confirmed: !!d.assumptionsResolved});
  // The peak: the surge driver's factor, else the stated rate when it is already a peak, else an assumption.
  const peak = surge ? {factor: surge.t.factor, basis: `${surge.d.id} records a surge of ${fmtN(surge.t.factor, 1)} ×`} : rate?.t.peak ? {factor: 1, basis: `${rate.d.id} states the rate at the peak`} : {factor: SCALE_PEAK_FACTOR, basis: `a peak of ${SCALE_PEAK_FACTOR} × the stated load, an assumption until a measurement replaces it`};
  if (!surge && !rate?.t.peak && (rate || users)) assumptions.push(peak.basis);
  // The arrival rate at the entry, from a rate or from concurrent users (Little's law, as the desk's capacity plan).
  const resp = latency ? latency.t.ms / 1000 : 1;
  const base = rate ? rate.t.perSecond : users ? users.t.users / (num(A.thinkSeconds) + resp) : null;
  const baseWords = rate ? `${fmtN(base, base < 10 ? 2 : 0)} a second (${rate.d.id})` : users ? `${fmtN(users.t.users)} users ÷ (${fmtN(num(A.thinkSeconds))} s between requests + ${fmtN(resp, 1)} s response${latency ? ' (' + latency.d.id + ')' : ', assumed'}) = ${fmtN(base, base < 10 ? 2 : 0)} a second` : '';
  if (users && !latency) assumptions.push(`a response of ${fmtN(resp, 1)} s and ${fmtN(num(A.thinkSeconds))} s between one user's requests, the desk's planning assumptions`);
  const derived = [];
  // Storage: the data each component is authority for, from stated counts and sizes, read whether or not a rate is
  // recorded; a recorded data volume, or a record count on a driver at the desk's record size, is shared by the
  // components whose responsibilities the driver names, else by those that hold data, else by the entries.
  const ownersOf = d => uniq([d.authorityId, ...[...R.comps.values()].filter(c => list(c.dataIds).includes(d.id)).map(c => c.id)].filter(id => R.comps.has(id)));
  const storage = new Map(), storageBasis = new Map(), note = (id, t) => storageBasis.set(id, [...(storageBasis.get(id) || []), t]);
  let sized = false;
  for (const {d, f} of data) {
    const owners = ownersOf(d); if (!owners.length) continue;
    const records = f.records, bytes = f.bytes ?? num(A.recordKB) * 1024;
    if (records == null) continue;
    if (f.bytes == null) sized = true;
    const gb = records * bytes * (1 + (growth ? growth.t.pct / 100 : 0)) / GB;
    for (const id of owners) { storage.set(id, (storage.get(id) || 0) + gb / owners.length); note(id, `${d.ref || d.id}: ${f.recordsText}${f.bytes != null ? ' × ' + f.bytesText : ' × ' + fmtN(num(A.recordKB)) + ' KB assumed'}${growth ? ' + ' + fmtN(growth.t.pct) + ' % growth (' + growth.d.id + ')' : ''}`); }
  }
  if (sized) assumptions.push(`a record of ${fmtN(num(A.recordKB))} KB where a data definition states a count but no size`);
  const bulk = volume ? {d: volume.d, gb: volume.t.gb, words: targetWords(volume.d)} : count ? {d: count.d, gb: count.t.records * num(A.recordKB) * 1024 / GB, words: `${targetWords(count.d)} × ${fmtN(num(A.recordKB))} KB assumed`} : null;
  if (bulk && !volume) assumptions.push(`a record of ${fmtN(num(A.recordKB))} KB for ${count.d.id}'s count`);
  if (bulk) {
    const named = uniq(list(bulk.d.responsibilityIds).flatMap(lr => rowsWith(R, 'logicalByLogical', lr).map(m => m.physicalId))).filter(id => R.comps.has(id));
    const holders = named.length ? named : [...storage.keys()].length ? [...storage.keys()] : F.roots;
    for (const id of holders) { storage.set(id, (storage.get(id) || 0) + bulk.gb * (1 + (growth ? growth.t.pct / 100 : 0)) / holders.length); note(id, `${bulk.d.id}: ${bulk.words}${holders.length > 1 ? ' shared by ' + holders.length : ''}${growth ? ' + ' + fmtN(growth.t.pct) + ' % growth (' + growth.d.id + ')' : ''}`); }
  }
  // The arrival rate along the recorded interactions, each once per request, as the capacity plan carries them.
  const rateOf = new Map([...R.comps.keys()].map(id => [id, 0]));
  if (base != null) {
    const perEntry = F.roots.length ? base / F.roots.length : 0;
    for (const id of F.roots) rateOf.set(id, perEntry);
    const pos = new Map(F.order.map((id, i) => [id, i]));
    for (const id of F.order) for (const e of F.edges.filter(e => e.from === id && pos.get(e.to) > pos.get(id))) rateOf.set(e.to, rateOf.get(e.to) + rateOf.get(id));
  }
  // Bandwidth: the payload a component exchanges, from the stated size of the data its contracts carry, else the
  // desk's record size.
  const payloadOf = id => { const xs = R.contracts.filter(c => c.from === id || c.to === id).flatMap(c => list(c.exchanges).map(x => data.find(y => y.d.id === x.dataId)?.f.bytes).filter(v => v != null)); return xs.length ? {bytes: Math.max(...xs), stated: true} : {bytes: num(A.recordKB) * 1024, stated: false}; };
  let payloadAssumed = false;
  const u = num(A.utilisation) / 100;
  if (base != null || storage.size) for (const id of F.order) {
    const c = R.comps.get(id), r = rateOf.get(id) || 0, qps = r * peak.factor, pl = payloadOf(id);
    if (!pl.stated && qps > 0) payloadAssumed = true;
    // Round 12 (DM-08): copies whose role or count is not stated are not counted as a number; the reading says nothing.
    const f = planOf(R, id), placed = f && !f.placements.some(x => !['active', 'standby'].includes(x.role) || x.role === 'active' && num(x.replicas) == null) ? f.active : null;
    const worker = /worker|consumer|job/i.test(c.kind || '') || F.edges.some(e => e.to === id && isAsync(e.interaction));
    const per = worker ? num(A.workerPerReplica) : num(A.servicePerReplica), needed = qps > 0 ? ceil(qps / (per * u)) : 0;
    const basis = [r > 0 ? (F.roots.includes(id) ? `the entry: ${baseWords}${F.roots.length > 1 ? ', shared by ' + F.roots.length + ' entries' : ''}` : `${fmtN(r, r < 10 ? 2 : 0)} a second arrive from ${F.edges.filter(e => e.to === id).map(e => R.comps.get(e.from)?.ref).filter(Boolean).join(', ')}`) + `; × ${fmtN(peak.factor, 1)} at peak (${peak.basis})` : base == null ? 'no rate or concurrent-user target is recorded, so no request demand is derived' : 'nothing recorded reaches it from the entry', ...(storageBasis.get(id) || []), qps > 0 ? `${fmtN(qps)} a second × ${pl.stated ? fmtN(pl.bytes) + ' bytes stated' : fmtN(num(A.recordKB)) + ' KB assumed'} a request` : ''].filter(Boolean).join('. ');
    derived.push({componentId: id, ref: c.ref, title: c.title, planId: f?.plan.id || null, planRef: f?.plan.ref || null, qps, storageGB: storage.has(id) ? storage.get(id) : null, bandwidthMBs: qps > 0 ? qps * pl.bytes / 1e6 : 0, replicas: {needed, placed, max: f?.maxReplicas ?? null, perReplica: per, utilisation: u}, basis});
    if (f && qps > 0 && placed != null && placed < needed) add('SCALE-UNDER-PROVISIONED', f.plan.id, `Size ${f.plan.ref} for the derived peak`, `${c.ref} ${c.title} carries about ${fmtN(qps)} requests a second at peak (${peak.basis}); at ${fmtN(per)} a second per replica and ${fmtN(u * 100)} % utilisation that is ${fmtN(needed)} replica${needed === 1 ? '' : 's'}. ${fmtN(placed)} active ${placed === 1 ? 'copy is' : 'copies are'} placed${f.maxReplicas != null ? ` and the plan allows at most ${fmtN(f.maxReplicas)}` : ''}. Derived from the recorded targets, not measured: confirm the rate, the peak and what one replica carries.`);
  }
  if (payloadAssumed) assumptions.push(`a payload of ${fmtN(num(A.recordKB))} KB a request where no data definition states a size`);
  // The latency budget: along each required synchronous chain from an entry, the reference round trip of every hop,
  // read from where the two ends are placed; a provider outside the design is read as a region apart.
  let budget = null;
  if (latency) {
    const target = latency.t.ms, zonesOfComp = id => { const f = planOf(R, id); return f ? list(p?.runtime?.placements).filter(l => l.planId === f.plan.id).map(l => zoneOf(p, l.zoneId)).filter(Boolean) : []; };
    const syncEdges = F.edges.filter(e => !isAsync(e.interaction || 'sync')), pos = new Map(F.order.map((id, i) => [id, i]));
    const chains = [];
    const walk = (id, hops, seen) => {
      const next = syncEdges.filter(e => e.from === id && pos.get(e.to) > pos.get(e.from) && !seen.has(e.to));
      const out = F.outside.filter(c => c.from === id).map(c => ({from: id, to: c.to, contract: c, ...{id: HOP.region, why: `${c.ref} reaches a provider outside the design, whose location is not recorded`}}));
      if (!next.length) { chains.push([...hops, ...out]); return; }
      for (const e of next) { const h = hopFigure(zonesOfComp(e.from), zonesOfComp(e.to)); walk(e.to, [...hops, ...out, {from: e.from, to: e.to, ...h}], new Set([...seen, e.to])); }
    };
    for (const root of F.roots.slice(0, 50)) walk(root, [], new Set([root]));
    const read = chains.map(hops => ({hops, ms: hops.reduce((n, h) => n + figureMs(h.id), 0)})).sort((a, b) => b.ms - a.ms);
    const worst = read[0] || {hops: [], ms: 0};
    for (const h of worst.hops) figures.add(h.id);
    const path = worst.hops.map(h => `${R.comps.get(h.from)?.ref || h.from} → ${R.comps.get(h.to)?.ref || F.parties.find(x => x.id === h.to)?.ref || h.to} (${FIGURE[h.id].title.toLowerCase()}, ${fmtN(figureMs(h.id), 1)} ms)`).join(', ');
    budget = {driverId: latency.d.id, targetMs: target, ms: worst.ms, share: target > 0 ? worst.ms / target : null, hops: worst.hops.length, path, words: worst.hops.length ? `${latency.d.id} allows ${fmtN(target)} ms; the reference round trips along the longest required path take about ${fmtN(worst.ms, 1)} ms (${fmtN(Math.round(100 * worst.ms / target))} % of it): ${path}.` : `${latency.d.id} allows ${fmtN(target)} ms; no required synchronous hop is recorded from the entry.`};
    if (worst.hops.length && worst.ms >= target) { const root = worst.hops[0].from, f = planOf(R, root); add('SCALE-LATENCY-BUDGET', f?.plan.id || root, `Fit ${latency.d.id}'s ${fmtN(target)} ms along ${R.comps.get(root)?.ref || root}'s path`, `The reference round trips along the required path alone take about ${fmtN(worst.ms, 1)} ms against the ${fmtN(target)} ms ${latency.d.id} allows: ${path}. Reference figures for estimation (${[...new Set(worst.hops.map(h => h.id))].join(', ')}), not measurements: move the hops into one failure domain, make a hop asynchronous, or confirm the target.`); }
  }
  if (!rate && !users && !volume && !count) add('SCALE-NO-TARGET', 'project', 'Record a scale target', 'No Chapter 2 driver carries a number for a rate, concurrent users or a data volume, so no request demand can be derived for any component' + (storage.size ? '; the storage read below comes from the Chapter 8 data definitions alone' : '') + '. Record one on a scalability driver (requests per second, concurrent users, records or GB), or set the review objective on the Chapter 11 desk.');
  if (derived.some(x => x.qps > 0 || x.storageGB != null) && (unconfirmed.length || assumptions.length)) add('SCALE-UNCONFIRMED', 'project', 'Confirm what the scale readings rest on', [unconfirmed.length ? `The derived demand rests on ${unconfirmed.length === 1 ? 'a target' : 'targets'} not yet confirmed: ${unconfirmed.join(', ')}.` : '', assumptions.length ? `It also rests on ${assumptions.length === 1 ? 'an assumption' : 'assumptions'}: ${assumptions.join('; ')}.` : ''].filter(Boolean).join(' ') + ' Confirm them in Chapter 2, or replace them with a measurement.');
  const carrying = derived.filter(x => x.qps > 0), under = findings.filter(f => f.code === 'SCALE-UNDER-PROVISIONED').length;
  const held = derived.filter(x => x.storageGB != null), heldGB = held.reduce((n, x) => n + x.storageGB, 0);
  const summary = base == null ? (held.length ? `${bulk ? 'From ' + bulk.d.id + "'s " + bulk.words : 'From the Chapter 8 data definitions'}: ${fmtN(heldGB, 1)} GB over ${fmtN(held.length)} component${held.length === 1 ? '' : 's'}; no rate or concurrent-user target is recorded, so no request demand is derived${budget?.hops ? '; ' + budget.words : ''}` : latency && budget?.hops ? `No rate, concurrent-user or data-volume target is recorded; ${budget.words}` : 'No numeric scale target is recorded in Chapter 2, so no demand is derived; the desk sizes for the Playbook\'s example on What it takes.')
    : `From ${rate ? rate.d.id + "'s " + targetWords(rate.d) : users.d.id + "'s " + targetWords(users.d)} and ${peak.factor === 1 ? 'the stated peak' : 'a peak of ' + fmtN(peak.factor, 1) + ' ×'}: ${fmtN(base * peak.factor)} requests a second at the entry over ${fmtN(carrying.length)} component${carrying.length === 1 ? '' : 's'}${under ? `; ${under} placed short of it` : ''}${budget?.hops ? `; ${fmtN(Math.round(100 * budget.share))} % of ${latency.d.id}'s ${fmtN(latency.t.ms)} ms spent on reference round trips` : ''}.`;
  return {inputs, derived, findings, figures: [...figures], peak, base, budget, assumptions, summary};
}
