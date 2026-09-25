// Review desk — vitals. Every running part of the design read like a patient on a monitor: its
// availability against the budget its drivers allow, how fast it recovers and how much it may lose,
// the time it has on the synchronous path, whether it can carry the objective, whether a repeated
// request is safe, whether its threats are covered, and whether anyone would see it fail.
//
// Each vital is a recorded value against a recorded target, with a state — normal, watch, critical,
// no signal (the value or the target is not recorded) or not carried (no driver asks it of this
// part) — the reason in words, the playbook tactics that would move it, and the chapter whose editor
// changes it. Pure; nothing here changes the project.
import {reasoningSource, driverChain, planFacts, productOf, productLabel, availabilityBudget, windowDays, availabilityCheck, recoveryCheck, syncPath, toMs, toMinutes, catalogueRecord} from './design-reasoning.js';
import {TACTICS} from './playbook-knowledge.js';
import {detectAntiPatterns, antiPatternsFor} from './design-spec.js';
import {capacityObjective, capacityPlan, fmtN} from './desk-capacity.js';
import {fact} from './product-facts.js';
import {productsAvailable} from './model-knowledge.js';

const list = v => Array.isArray(v) ? v : [];
const str = v => typeof v === 'string' ? v.trim() : v == null ? '' : String(v);
const num = v => { const n = Number(v); return v === '' || v == null || !Number.isFinite(n) ? null : n; };
const uniq = xs => [...new Set(xs)];
const OP = {'At least': '≥', 'At most': '≤', Exactly: '='};

export const VSTATE = {
  ok: {label: 'Normal', glyph: '●'}, warn: {label: 'Watch', glyph: '▲'}, bad: {label: 'Critical', glyph: '✕'},
  none: {label: 'No signal', glyph: '⋯'}, na: {label: 'Not carried', glyph: '·'}
};
export const RANK = ['bad', 'warn', 'none', 'ok', 'na'];
export const worstOf = states => states.slice().sort((a, b) => RANK.indexOf(a) - RANK.indexOf(b))[0] || 'na';

const T = name => TACTICS.find(t => t.name === name);
export const VITALS = [
  {id: 'availability', label: 'Availability', short: 'Avail.', family: 'reliability', chapter: 10, q: 'Can it stay up within the unavailability its drivers allow?', tactics: ['Redundancy', 'Failover Mechanisms', 'Load Balancing']},
  {id: 'recovery', label: 'Recovery', short: 'Recover', family: 'reliability', chapter: 10, q: 'Does it come back within its recovery target?', tactics: ['Rollback', 'Shadow', 'Failover Mechanisms']},
  {id: 'loss', label: 'Data loss', short: 'Loss', family: 'reliability', chapter: 10, q: 'Can it lose no more than its recovery point allows?', tactics: ['Data Replication', 'Regular Backups']},
  {id: 'latency', label: 'Latency', short: 'Latency', family: 'efficiency', chapter: 8, q: 'Does it fit the time the response target leaves it?', tactics: ['Introduce concurrency', 'Caching', 'Network Communication']},
  {id: 'capacity', label: 'Capacity', short: 'Capacity', family: 'efficiency', chapter: 10, q: 'Can it carry the objective on the desk?', tactics: ['Horizontal Scaling', 'Stateless Design', 'Capacity Planning']},
  {id: 'integrity', label: 'Integrity', short: 'Integrity', family: 'reliability', chapter: 8, q: 'Is a repeated request safe?', tactics: [], patterns: ['PAT-IDEMPOTENT-CONSUMER']},
  {id: 'security', label: 'Protection', short: 'Protect', family: 'protection', chapter: 9, q: 'Are the threats to it covered by a control?', tactics: ['Limit access', 'Validate input', 'Detect intrusion']},
  {id: 'observability', label: 'Observability', short: 'Observe', family: 'protection', chapter: 10, q: 'Would anyone see it fail before the customer does?', tactics: ['Heartbeat', 'Monitoring and Alerting', 'Self-test']}
];
export const vitalTactics = v => v.tactics.map(T).filter(Boolean);

// ---------------------------------------------------------------- source

const CAT_ORDER = ['connectivity', 'identity', 'transactional', 'messaging', 'caching', 'observability', 'backup', 'recovery', 'compute'];
const capsOfComp = (R, id) => { const p = R.p; return list(p?.technology?.needs).filter(n => n.applicationId === id).map(n => list(p.technology.mappings).find(m => m.needId === n.id)).filter(Boolean).map(m => R.caps.get(m.capabilityId)).filter(Boolean); };
const capsOfReal = (R, id) => uniq(list(R.p?.technologyRealisation?.mappings).filter(m => m.realizationId === id).map(m => m.capabilityId)).map(x => R.caps.get(x)).filter(Boolean);

export function deskSource(p, {objective = null, saved = undefined} = {}) {
  const R = reasoningSource(p);
  const env = list(p?.runtime?.environments)[0]?.id || null;
  const plans = [...R.plans.values()].filter(x => !env || x.environmentId === env);
  const carriers = new Map();
  for (const d of R.drivers) for (const f of driverChain(R, d.id)?.plans || []) { if (!carriers.has(f.plan.id)) carriers.set(f.plan.id, []); carriers.get(f.plan.id).push(d); }
  // Components first, in the order work flows through them; then the platform, in reading order.
  const compOrder = [...R.comps.keys()];
  const rows = plans.map(pl => {
    const f = planFacts(R, pl), comp = R.comps.get(pl.assetId), real = R.reals.get(pl.assetId);
    const caps = comp ? capsOfComp(R, comp.id) : real ? capsOfReal(R, real.id) : [];
    const compute = comp ? caps.find(c => c.category === 'compute') : null;
    const computeReal = compute ? [...R.reals.values()].find(r => capsOfReal(R, r.id).some(c => c.id === compute.id)) : null;
    const product = real ? productLabel(productOf(real)) : computeReal ? 'on ' + productLabel(productOf(computeReal)) : '';
    const category = real ? (caps.map(c => c.category).sort((a, b) => CAT_ORDER.indexOf(a) - CAT_ORDER.indexOf(b))[0] || '') : '';
    return {id: pl.id, plan: pl, f, asset: comp || real || null, assetId: pl.assetId, assetKind: comp ? 'component' : real ? 'realisation' : 'other', ref: pl.ref, assetRef: (comp || real)?.ref || pl.assetId,
      title: pl.title, kind: comp ? comp.kind || 'component' : category, band: comp ? 'parts' : 'platform', product, caps, category,
      drivers: (carriers.get(pl.id) || []).slice().sort((a, b) => a.id.localeCompare(b.id)),
      order: comp ? compOrder.indexOf(comp.id) : 100 + CAT_ORDER.indexOf(category)};
  }).sort((a, b) => a.order - b.order || a.ref.localeCompare(b.ref));
  const anti = detectAntiPatterns(R);
  const O = capacityObjective(R, saved === undefined ? p?.finalReview?.capacity || null : saved, objective);
  const cap = capacityPlan(R, O);
  const D = {p, R, rows, anti, objective: O, cap, env};
  for (const row of rows) { row.vitals = partVitals(D, row); row.alarms = uniq([...antiPatternsFor(anti, row.id), ...antiPatternsFor(anti, row.assetId)]); row.state = worstOf(row.vitals.map(v => v.state)); }
  D.system = systemVitals(D);
  return D;
}

// ---------------------------------------------------------------- one part

const V = (vital, state, value, target, why, extra = {}) => ({vital, state, value, target, why, ...extra});
const placedText = f => !f.placements.length ? 'not placed' : `${f.active} active${f.standby ? ' + ' + f.standby + ' standby' : ''} · ${f.zonesAll.length} zone${f.zonesAll.length === 1 ? '' : 's'}`;
const fromCheck = c => ({holds: 'ok', breaks: 'bad', unknown: 'none', revisit: 'warn'})[c.state] || 'none';

// A product that keeps working only while a majority of its nodes agree (quorum queues, a
// configuration store): spread over zones, it must keep that majority when any one zone is lost.
function quorumLoss(R, row, f) {
  if (!productsAvailable(R.p)) return null;
  const qf = fact(row.product, 'clusterNodes') || fact(row.product, 'dcs');
  if (!qf || f.active < 2) return null;
  const by = new Map();
  for (const l of f.placements.filter(x => x.role === 'active')) by.set(l.zoneId, (by.get(l.zoneId) || 0) + (num(l.replicas) || 0));
  const need = Math.floor(f.active / 2) + 1, [zid, n] = [...by].sort((a, b) => b[1] - a[1])[0] || [];
  if (zid == null || f.active - n >= need) return null;
  const ref = list(R.p?.runtime?.zones).find(z => z.id === zid)?.ref || zid;
  return `It works while a majority of its nodes agree: ${f.active} nodes in ${by.size} zone${by.size === 1 ? '' : 's'}, and losing ${ref} (${n} of them) leaves ${f.active - n}, short of a majority of ${need}. A third failure domain keeps the majority.`;
}

// The synchronous calls on a performance driver's path, nested by who calls whom: the entry the
// caller waits on is level 0, the call made while serving it level 1, and so on. Each level's budget
// leaves the level above it time for its own work: with three levels and 2 s, 2,000 › 1,300 › 650 ms.
// A fault is a timeout past the target, or one at or above its caller's — the work goes on after
// the caller has given up.
export function timeoutPath(R, d) {
  const target = toMs(d.targetValue, d.unit);
  const ch = target != null ? driverChain(R, d.id) : null;
  if (!ch) return null;
  const sp = syncPath(ch), reqs = list(ch.contracts).filter(c => c.kind === 'request' || !c.kind);
  const depth = new Map();
  const at = (c, seen) => { if (depth.has(c.id)) return depth.get(c.id); if (seen.has(c.id)) return 0; seen.add(c.id); const up = reqs.filter(k => k.id !== c.id && k.to === c.from); const v = up.length ? 1 + Math.max(...up.map(k => at(k, seen))) : 0; depth.set(c.id, v); return v; };
  reqs.forEach(c => at(c, new Set()));
  const levels = reqs.length ? Math.max(...depth.values()) + 1 : 1;
  const budget = n => Math.max(50, Math.floor(target * (levels - n) / levels / 50) * 50);
  const calls = reqs.map(c => ({contract: c, depth: depth.get(c.id), ms: num(c.timeoutMs), budget: budget(depth.get(c.id))})).sort((a, b) => a.depth - b.depth || str(a.contract.ref).localeCompare(str(b.contract.ref)));
  const faults = [];
  for (const c of calls) {
    if (c.ms == null) continue;
    if (c.ms > target) { faults.push({id: c.contract.id, why: `${c.contract.ref} waits ${fmtN(c.ms)} ms: past ${d.id}'s ${fmtN(target)} ms on its own.`}); continue; }
    for (const k of calls.filter(k => k.contract.to === c.contract.from && k.ms != null && k.contract.id !== c.contract.id)) if (c.ms >= k.ms) faults.push({id: c.contract.id, why: `${c.contract.ref} waits ${fmtN(c.ms)} ms, but its caller ${k.contract.ref} gives up at ${fmtN(k.ms)} ms: the work goes on after the caller has gone.`});
  }
  return {driver: d, target, hops: sp.hops, calls, levels, faults};
}

export function partVitals(D, row) {
  const {R} = D, f = row.f, ds = row.drivers, fix = (chapter, label, id = row.id) => ({chapter, id, label});
  const out = [];
  // Availability: the unavailability each availability driver allows, against how it is placed.
  const av = ds.filter(d => d.category === 'availability' && d.unit === '%' && availabilityBudget(d.targetValue, 30) != null);
  if (!av.length) out.push(V('availability', 'na', placedText(f), 'no availability driver', 'No availability driver reaches this part.', {fix: fix(10, 'Place it in Chapter 10')}));
  else {
    const checks = av.map(d => { const w = windowDays(d), b = availabilityBudget(d.targetValue, w.days); return {d, b, days: w.days, c: availabilityCheck(f, b)}; }).sort((a, b) => a.b - b.b);
    const k = checks.sort((a, b) => RANK.indexOf(fromCheck(a.c)) - RANK.indexOf(fromCheck(b.c)))[0];
    const q = fromCheck(k.c) === 'ok' ? quorumLoss(R, row, f) : null;
    out.push(V('availability', q ? 'warn' : fromCheck(k.c), placedText(f), `${OP[k.d.operator] || ''} ${k.d.targetValue} % · ${fmtN(k.b, 1)} min in ${k.days} days`, q || k.c.why, {drivers: av.map(d => d.id), fix: fix(10, q ? `Place ${row.ref} across three failure domains in Chapter 10` : `Add a replica, a standby or a zone to ${row.ref} in Chapter 10`)}));
  }
  // Recovery: the strictest of the drivers' recovery targets and Chapter 6's recovery objectives.
  const recT = [...ds.filter(d => (d.category === 'recoverability' || d.category === 'availability') && toMinutes(d.targetValue, d.unit) != null).map(d => ({v: toMinutes(d.targetValue, d.unit), by: d.id})),
    ...row.caps.filter(c => num(c.recoveryMinutes) != null).map(c => ({v: num(c.recoveryMinutes), by: c.ref}))].sort((a, b) => a.v - b.v);
  const recV = f.recoveryMinutes != null ? `recovers in ${fmtN(f.recoveryMinutes)} min` : 'recovery time not recorded';
  if (!recT.length) out.push(V('recovery', 'na', recV, 'no recovery target', 'No recovery driver or Chapter 6 recovery objective reaches this part.', {fix: fix(10, `Record ${row.ref}'s recovery in Chapter 10`)}));
  else { const c = recoveryCheck(f, recT[0].v), st = fromCheck(c); out.push(V('recovery', st, recV, `≤ ${fmtN(recT[0].v)} min (${recT[0].by})`, c.why + (st === 'ok' && !row.plan.targetsConfirmed ? ' Not yet shown by a recovery drill.' : ''), {drivers: recT.map(x => x.by), fix: fix(10, `Record ${row.ref}'s recovery time in Chapter 10`)})); }
  // Data loss: only for what holds state, against Chapter 6's recovery-point objective.
  const lossT = row.caps.filter(c => num(c.lossMinutes) != null).map(c => ({v: num(c.lossMinutes), by: c.ref})).sort((a, b) => a.v - b.v);
  const lossV = f.lossMinutes != null ? `loses at most ${fmtN(f.lossMinutes)} min` : 'loss not recorded';
  if (f.stateMode === 'Stateless process') out.push(V('loss', 'na', 'holds no state', lossT.length ? `≤ ${fmtN(lossT[0].v)} min` : 'no recovery point', 'A stateless process loses nothing it owns.'));
  else if (!lossT.length) out.push(V('loss', f.stateMode === 'Stateful service' ? 'none' : 'na', lossV, 'no recovery point', f.stateMode === 'Stateful service' ? 'It holds state, but no recovery-point objective is recorded in Chapter 6.' : 'No recovery-point objective reaches it, and whether it holds state is not said.', {fix: fix(6, 'Record the recovery-point objective in Chapter 6', row.caps[0]?.id || row.id)}));
  else out.push(V('loss', f.lossMinutes == null ? 'none' : f.lossMinutes <= lossT[0].v ? 'ok' : 'bad', lossV, `≤ ${fmtN(lossT[0].v)} min (${lossT[0].by})`, f.lossMinutes == null ? 'How much it may lose is not recorded.' : f.lossMinutes <= lossT[0].v ? 'Within the recovery point.' : 'It may lose more than the recovery point allows.', {fix: fix(10, `Record ${row.ref}'s loss and backup in Chapter 10`)}));
  // Latency: the time a performance driver leaves each call on the synchronous path. Calls nest — the
  // caller waits while its callee works — so each timeout must sit inside its caller's.
  const perf = ds.filter(d => d.category === 'performance' && toMs(d.targetValue, d.unit) != null);
  const onPath = perf.map(d => timeoutPath(R, d)).filter(Boolean).filter(x => x.calls.some(c => c.contract.from === row.assetId || c.contract.to === row.assetId) || x.hops.some(h => h.from === row.assetId || h.to === row.assetId));
  if (!onPath.length) out.push(V('latency', 'na', row.assetKind === 'component' ? 'not on a timed path' : 'platform', perf.length ? `${OP[perf[0].operator]} ${perf[0].targetValue} ${perf[0].unit}` : 'no response target', perf.length ? 'It carries a response target but is on no recorded synchronous path.' : 'No response-time driver reaches this part.'));
  else {
    const x = onPath[0], d = x.driver, target = x.target, share = target / x.levels;
    // Its calls: the ones it makes, and the ones it answers.
    const makes = x.calls.filter(c => c.contract.from === row.assetId), answers = x.calls.filter(c => c.contract.to === row.assetId), mine = [...answers, ...makes];
    const open = mine.filter(c => c.ms == null), wrong = x.faults.filter(f => mine.some(c => c.contract.id === f.id));
    const timedOut = makes.filter(c => c.ms != null), timedIn = answers.filter(c => c.ms != null);
    const state = wrong.length ? 'bad' : !mine.length || open.length ? 'none' : 'ok';
    const why = wrong.length ? wrong.map(f => f.why).join(' ')
      : !mine.length ? `It is on ${d.id}'s synchronous path, but no contract records the call.`
      : open.length ? `${x.calls.length} call${x.calls.length === 1 ? '' : 's'} on ${d.id}'s path nest inside ${fmtN(target)} ms — about ${fmtN(share)} ms for each level — but ${open.map(c => c.contract.ref).join(', ')} record${open.length === 1 ? 's' : ''} no timeout, so how long a caller may wait is unknown.`
      : `${mine.map(c => `${c.contract.ref} ${fmtN(c.ms)} ms`).join(', ')}: inside ${fmtN(target)} ms, and each call inside its caller's own timeout.${mine.some(c => !c.contract.timeoutConfirmed) ? ' Not yet confirmed with the provider.' : ''}`;
    const value = open.length || !mine.length ? (mine.length ? 'no timeout recorded' : `≈ ${fmtN(share)} ms budget`) : timedOut.length ? `waits up to ${fmtN(Math.max(...timedOut.map(c => c.ms)))} ms` : `answers within ${fmtN(Math.min(...timedIn.map(c => c.ms)))} ms`;
    const first = open.find(c => c.contract.from === row.assetId) || open[0] || wrong.map(f => mine.find(c => c.contract.id === f.id))[0] || makes[0] || answers[0];
    out.push(V('latency', state, value, `${OP[d.operator]} ${d.targetValue} ${d.unit} (${d.id}) · ≈ ${fmtN(share)} ms a level`, why,
      {drivers: [d.id], path: x, fix: first ? fix(8, `Record ${first.contract.ref}'s timeout in Chapter 8`, first.contract.id) : fix(8, 'Record the timeouts in Chapter 8', row.assetId)}));
  }
  // Capacity: the desk's objective, against what Chapter 10 lets it grow to.
  const c = D.cap.rows.find(x => x.id === row.assetId);
  if (!c) out.push(V('capacity', 'na', f.minReady != null ? `${f.minReady}–${f.maxReplicas ?? '?'} replicas` : 'no scaling recorded', D.cap.objText, 'The objective does not reach this part.'));
  else {
    const nodes = ['store', 'queue', 'cache', 'cluster'].includes(c.kind), unit = n => nodes ? (n === 1 ? 'node' : 'nodes') : (n === 1 ? 'replica' : 'replicas');
    const scaled = ['service', 'worker', 'adapter', 'component', 'gateway', 'identity', 'store', 'queue', 'cache'].includes(c.kind);
    const target = c.recorded ? `Ch 7 records ${c.recorded}` : scaled && f.maxReplicas != null ? `can grow to ${fmtN(f.maxReplicas)}` : scaled ? 'maximum not recorded' : 'nothing recorded';
    const unproven = c.verdict.state === 'ok' ? (['queue', 'cluster', 'telemetry'].includes(c.kind) ? !c.estimatesConfirmed : !row.plan.capacityConfirmed) : false;
    out.push(V('capacity', c.verdict.state, c.replicas != null ? `needs ${fmtN(c.replicas)} ${unit(c.replicas)}` : c.demand.text, target, `${c.demand.text} for ${D.cap.objText}. ${c.verdict.why}${unproven ? ' Not yet confirmed by a load test.' : ''}`, {fix: c.fix, capacity: c}));
  }
  // Integrity: a request that repeats its effect when it is repeated.
  const integ = ds.filter(d => d.category === 'integrity');
  const reqs = R.contracts.filter(k => (k.kind === 'request' || !k.kind) && (k.from === row.assetId || k.to === row.assetId));
  const open = reqs.filter(k => !str(k.idempotencyKey) && !str(k.duplicatePolicy));
  if (!integ.length || !reqs.length) out.push(V('integrity', 'na', reqs.length ? `${reqs.length} request${reqs.length === 1 ? '' : 's'}` : 'no requests', integ.length ? 'one financial effect' : 'no integrity driver', integ.length ? 'It makes or takes no request.' : 'No integrity driver reaches this part.'));
  else out.push(V('integrity', open.length ? 'bad' : 'ok', open.length ? `${open.length} of ${reqs.length} unguarded` : `${reqs.length} guarded`, `${integ.map(d => d.id).join(', ')} · every request idempotent`, open.length ? `${open.map(k => k.ref).join(', ')} record no idempotency key or duplicate policy: a repeated request could repeat its effect.` : 'Every request it makes or takes records how a repeat is recognised.', {drivers: integ.map(d => d.id), fix: open[0] ? fix(8, `Record ${open[0].ref}'s idempotency key in Chapter 8`, open[0].id) : null}));
  // Protection: the chapter's coverage rule, on the part, its contracts and its data.
  const objs = uniq([row.assetId, ...reqs.map(k => k.id), ...R.contracts.filter(k => k.kind === 'event' && (k.from === row.assetId || k.to === row.assetId)).map(k => k.id), ...list(row.asset?.dataIds)]);
  const threats = list(R.p?.security?.threats), controls = list(R.p?.security?.controls);
  const on = threats.filter(t => list(t.targetIds).some(id => objs.includes(id)));
  const uncovered = on.filter(t => list(t.targetIds).filter(id => objs.includes(id)).some(id => !controls.some(c => list(c.threatIds).includes(t.id) && list(c.targetIds).includes(id))));
  const sec = ds.filter(d => d.category === 'security');
  if (!on.length) out.push(V('security', sec.length ? 'none' : 'na', 'no threat recorded', sec.length ? sec.map(d => d.id).join(', ') : 'no security driver', sec.length ? 'It carries a security driver, but no threat to it, its contracts or its data is recorded.' : 'No threat to it is recorded, and no security driver reaches it.', {fix: fix(9, 'Examine its threats in Chapter 9', row.assetId)}));
  else out.push(V('security', uncovered.length ? 'bad' : 'ok', `${on.length - uncovered.length} of ${on.length} threats covered`, 'every threat covered where it lands', uncovered.length ? `${uncovered.map(t => t.ref + ' ' + t.title).join('; ')}: no control covers ${uncovered.length === 1 ? 'it' : 'them'} here.` : 'Every threat to it, its contracts and its data has a control where it lands.', {drivers: sec.map(d => d.id), fix: fix(9, 'Add a control in Chapter 9', uncovered[0]?.id || row.assetId)}));
  // Observability: would anyone see it fail?
  const mon = str(row.plan.monitoring), crit = ds.some(d => d.priority === 'Critical');
  out.push(V('observability', mon ? 'ok' : crit ? 'bad' : ds.length ? 'warn' : 'na', mon ? mon.slice(0, 60) + (mon.length > 60 ? '…' : '') : 'no monitoring recorded', crit ? 'carries a Critical driver' : ds.length ? 'carries a driver' : 'carries no driver', mon ? 'Monitoring is recorded for it.' : crit ? 'It carries a Critical driver, and nothing records how its failure would be seen.' : ds.length ? 'Nothing records how its failure would be seen.' : 'It carries no driver.', {fix: fix(10, `Record ${row.ref}'s monitoring in Chapter 10`)}));
  return out;
}

// ---------------------------------------------------------------- the whole system

export function systemVitals(D) {
  const {R, rows, cap} = D;
  const col = id => rows.map(r => r.vitals.find(v => v.vital === id)).filter(v => v && v.state !== 'na');
  const counts = xs => Object.fromEntries(['ok', 'warn', 'bad', 'none'].map(s => [s, xs.filter(v => v.state === s).length]));
  const tell = c => [c.bad ? c.bad + ' critical' : '', c.warn ? c.warn + ' to watch' : '', c.none ? c.none + ' no signal' : '', c.ok ? c.ok + ' normal' : ''].filter(Boolean).join(' · ') || 'not carried';
  const av = R.drivers.filter(d => d.category === 'availability' && d.unit === '%').map(d => ({d, b: availabilityBudget(d.targetValue, windowDays(d).days), days: windowDays(d).days})).filter(x => x.b != null).sort((a, b) => a.b - b.b)[0];
  const rec = R.drivers.filter(d => d.category === 'recoverability' && toMinutes(d.targetValue, d.unit) != null).map(d => toMinutes(d.targetValue, d.unit)).sort((a, b) => a - b)[0];
  const perf = R.drivers.find(d => d.category === 'performance' && toMs(d.targetValue, d.unit) != null);
  const threats = list(R.p?.security?.threats), controls = list(R.p?.security?.controls);
  const covered = threats.filter(t => list(t.targetIds).every(id => controls.some(c => list(c.threatIds).includes(t.id) && list(c.targetIds).includes(id))));
  const integ = R.drivers.filter(d => d.category === 'integrity');
  const unguarded = R.contracts.filter(k => (k.kind === 'request' || !k.kind) && !str(k.idempotencyKey) && !str(k.duplicatePolicy));
  const lossCaps = [...R.caps.values()].filter(c => num(c.lossMinutes) != null).map(c => num(c.lossMinutes)).sort((a, b) => a - b);
  const heads = {
    availability: av ? `${av.d.targetValue} % · ${fmtN(av.b, 1)} min / ${av.days} d` : 'no target',
    recovery: rec != null ? `within ${fmtN(rec)} min` : 'no target',
    loss: lossCaps.length ? `≤ ${fmtN(lossCaps[0])} min` : 'no recovery point',
    latency: perf ? `${OP[perf.operator]} ${perf.targetValue} ${perf.unit} · ${cap.hops} sync call${cap.hops === 1 ? '' : 's'}` : 'no target',
    capacity: `${fmtN(cap.lambda)} req/s`,
    integrity: integ.length ? `${unguarded.length} request${unguarded.length === 1 ? '' : 's'} unguarded` : 'no driver',
    security: threats.length ? `${covered.length} of ${threats.length} threats covered` : 'no threats',
    observability: `${rows.filter(r => str(r.plan.monitoring)).length} of ${rows.length} monitored`
  };
  return VITALS.map(v => { const xs = col(v.id), c = counts(xs); return {vital: v.id, state: xs.length ? worstOf(xs.map(x => x.state)) : 'na', counts: c, text: tell(c), head: heads[v.id]}; });
}

export function describeRow(D, row) {
  const bad = row.vitals.filter(v => v.state === 'bad'), none = row.vitals.filter(v => v.state === 'none');
  const name = id => VITALS.find(v => v.id === id).label.toLowerCase();
  return `${row.ref} ${row.title}${row.product ? ' (' + row.product + ')' : ''}: ${bad.length ? 'critical on ' + bad.map(v => name(v.vital)).join(', ') : 'nothing critical'}${none.length ? '; no signal on ' + none.map(v => name(v.vital)).join(', ') : ''}${row.alarms.length ? '; part of ' + row.alarms.map(a => a.name).join(', ') : ''}.`;
}
export {catalogueRecord};
