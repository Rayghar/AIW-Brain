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
import {driverChain, planFacts, productOf, productLabel, toMs, toMinutes} from './design-reasoning.js';
import {fact, factsFor} from './product-facts.js';
import {ceilingOf, spreadsOf} from './product-knowledge.js';
import {productsAvailable} from './model-knowledge.js';

const list = v => Array.isArray(v) ? v : [];
const str = v => typeof v === 'string' ? v.trim() : v == null ? '' : String(v);
const num = v => { const n = Number(v); return v === '' || v == null || !Number.isFinite(n) ? null : n; };
const uniq = xs => [...new Set(xs)];
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

// What the desk plans for: the review's own objective, else a Chapter 2 scalability driver, else
// the playbook's example target — always saying which.
export function capacityObjective(R, saved = null, override = null) {
  const drivers = R.drivers.filter(d => d.category === 'scalability' && num(d.targetValue) != null);
  const byUsers = drivers.find(d => USERS.test(d.unit || '') && !SURGE.test(d.unit || ''));
  const byRate = drivers.find(d => RATE.test(d.unit || '') && !SURGE.test(d.unit || ''));
  const surgeD = drivers.find(d => SURGE.test(d.unit || ''));
  const perf = R.drivers.find(d => d.category === 'performance' && toMs(d.targetValue, d.unit) != null);
  const base = override && num(override.value) ? {kind: override.kind === 'rate' ? 'rate' : 'users', value: num(override.value), source: {kind: 'explore', text: 'Explored on the desk, not yet saved'}}
    : saved && num(saved.value) ? {kind: saved.kind === 'rate' ? 'rate' : 'users', value: num(saved.value), source: {kind: 'review', text: 'The review objective, saved in Chapter 11' + (saved.reviewer ? ' by ' + saved.reviewer : '')}}
    : byUsers ? {kind: 'users', value: num(byUsers.targetValue), source: {kind: 'driver', id: byUsers.id, text: `${byUsers.id} · ${byUsers.title}`}}
    : byRate ? {kind: 'rate', value: num(byRate.targetValue), source: {kind: 'driver', id: byRate.id, text: `${byRate.id} · ${byRate.title}`}}
    : {kind: 'users', value: PLAYBOOK_TARGET.value, source: {kind: 'playbook', text: 'The SA Playbook\'s example scalability target: "' + PLAYBOOK_TARGET.text + '"', src: PLAYBOOK_TARGET.src}};
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

const capsOf = (R, compId) => {
  const p = R.p, needs = list(p?.technology?.needs).filter(n => n.applicationId === compId);
  return needs.map(n => { const m = list(p.technology.mappings).find(m => m.needId === n.id); const c = m && R.caps.get(m.capabilityId); return c ? {cap: c, need: n} : null; }).filter(Boolean);
};
const realsOfCap = (R, capId) => uniq(list(R.p?.technologyRealisation?.mappings).filter(m => m.capabilityId === capId).map(m => m.realizationId)).map(id => R.reals.get(id)).filter(Boolean);
const capsOfReal = (R, realId) => uniq(list(R.p?.technologyRealisation?.mappings).filter(m => m.realizationId === realId).map(m => m.capabilityId)).map(id => R.caps.get(id)).filter(Boolean);
const planOf = (R, assetId) => { const pl = [...R.plans.values()].find(x => x.assetId === assetId); return pl ? planFacts(R, pl) : null; };
const carried = (R, ids) => R.drivers.filter(d => { const ch = driverChain(R, d.id); return ch && (ch.components.some(c => ids.includes(c.id)) || ch.realisations.some(r => ids.includes(r.record.id))); });
const needsSpare = ds => ds.some(d => ['availability', 'recoverability'].includes(d.category) || d.priority === 'Critical');

export function capacityPlan(R, objective) {
  const O = objective, A = O.assume, u = num(A.utilisation) / 100;
  const F = flowOf(R);
  const env = [...R.plans.values()][0]?.environmentId || null;
  const zones = [...R.zones.values()].filter(z => !env || z.environmentId === env);
  const Z = Math.max(1, zones.length);
  const think = num(A.thinkSeconds), resp = O.response.ms / 1000;
  const surge = O.surge?.on && O.surge.factor ? O.surge.factor : 1;
  const base = O.kind === 'rate' ? O.value : O.value / (think + resp);
  const lambda = base * surge;
  const objText = O.kind === 'rate' ? `${fmtN(O.value)} requests a second at the entry` : `${fmtN(O.value)} concurrent users`;
  const lambdaMath = (O.kind === 'rate' ? `${fmtN(O.value)} req/s` : `${fmtN(O.value)} users ÷ (${fmtN(think)} s between requests + ${fmtN(resp, 1)} s response${O.response.driverId ? ' (' + O.response.driverId + ')' : ', assumed'}) = ${fmtN(base)} req/s`) + (surge !== 1 ? ` × ${fmtN(surge, 1)} for ${O.surge.driverId}'s surge = ${fmtN(lambda)} req/s` : '');

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
  const ceilingFor = (r, demand) => {
    const pr = productOf(r), c = products ? ceilingOf(pr?.product) : null;
    if (!c || demand == null) return null;
    const limit = num(A[c.key]), threshold = limit * u, holdsTo = demand > 0 ? O.value * threshold / demand : null;
    const others = (r.options || []).filter(o => o.product && o.id !== pr.option.id).map(o => ({id: o.id, product: o.product, trait: spreadsOf(o.product)})).filter(x => x.trait);
    return {...c, product: pr.product, optionId: pr.option.id, limit, threshold, demand, passed: demand > threshold, holdsTo, holdsText: holdsTo == null ? 'any objective' : `≈${fmtN(sig(holdsTo))} ${objUnits}`, others, src: c.trait.src, mechanism: c.trait.text,
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
  const usersOf = (real, cat) => [...R.comps.keys()].filter(id => capsOf(R, id).some(x => x.cap.category === cat && realsOfCap(R, x.cap.id).some(r => r.id === real.id)));
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

  const count = s => rows.filter(r => r.verdict.state === s).length;
  return {objective: O, objText, lambda, base, lambdaMath, zones: Z, hops, rows, totals: {pods, vcpu, mem, nodes}, counts: {ok: count('ok'), warn: count('warn'), bad: count('bad'), none: count('none')},
    notes: [F.cyclic.length ? `The interactions among ${F.cyclic.map(id => R.comps.get(id)?.ref).join(', ')} form a loop; their rates count one pass.` : '', F.roots.length > 1 ? `${F.roots.length} entries share the arrival rate equally.` : '', 'Each recorded interaction is taken to happen once for each request that reaches its sender.'].filter(Boolean)};
}

// The same specification as Markdown, for the SDD.
export function capacityMarkdown(C) {
  if (!C) return '';
  const O = C.objective, A = O.assume;
  const row = r => `| ${r.ref} ${r.title} | ${r.product || ''} | ${r.demand.text} | ${r.spec.map(s => s.k + ': ' + s.v).join('; ')} | ${({ok: 'Meets', bad: 'Short', warn: 'Check', none: 'Not recorded'})[r.verdict.state]} — ${r.verdict.why} |`;
  return `## Performance specification\n\nObjective: ${C.objText} (${O.source.text}${O.source.src ? ', ' + O.source.src : ''}). ${C.lambdaMath}.\n\n| Part | Product | Demand | Specification | Against the design |\n| --- | --- | --- | --- | --- |\n${C.rows.map(row).join('\n')}\n\nCluster: ${fmtN(C.totals.pods)} pods, ${fmtN(C.totals.vcpu, 1)} vCPU, ${fmtN(C.totals.mem, 1)} GiB, ${fmtN(C.totals.nodes)} nodes.\n\nPlanning assumptions: ${ASSUMPTIONS.map(a => `${a.label.toLowerCase()} ${a.options ? a.options.find(([v]) => v === A[a.key])?.[1] : fmtN(num(A[a.key]), 1) + (a.unit ? ' ' + a.unit : '')}`).join('; ')}. They are estimates for review, not benchmarks; replace each with load-test evidence.\n\n`;
}

