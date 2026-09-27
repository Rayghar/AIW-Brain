// Review desk — drafted fixes. Each vital that reads critical or gives no signal, and each product
// choice that has reached a switch point, comes with a ready-made change built from the desk's own
// numbers: the replicas the objective needs, the timeouts the response target leaves each call, the
// bound a consumer outage asks of a queue, the monitoring its drivers ask for. A draft is only ever a
// set of the owning chapter's ordinary commands — runtime.plan, runtime.placement,
// interfaces.contract, techrealisation.plan, security.control, decision.save — built from the
// current record with the changed fields, so it goes through that chapter's own change review and
// nothing is applied until the architect confirms it. Every drafted value is marked unconfirmed.
//
// simulate() applies drafts to a copy of the project and reads the desk again, so the architect can
// see which cells a draft turns green — and which gaps it reveals — before applying anything.
// Where a fix needs a judgement the desk cannot make from numbers (a threat, a recovery point, a
// third site, a drill), it says so and points to the chapter instead of inventing one. Pure.
import {deskSource, VITALS, RANK} from './desk-vitals.js';
import {applyCanonical} from './canonical-command.js';
import {securityProposal} from './security-domain.js';
import {PROPOSAL_FOR} from './threat-model.js';
import {availabilityBudget, windowDays, toMinutes} from './design-reasoning.js';
import {fmtN} from './desk-capacity.js';
import {fact} from './product-facts.js';
import {describeChoice} from './product-choice.js';

const list = v => Array.isArray(v) ? v : [];
const str = v => typeof v === 'string' ? v.trim() : v == null ? '' : String(v);
const num = v => { const n = Number(v); return v === '' || v == null || !Number.isFinite(n) ? null : n; };
const uniq = xs => [...new Set(xs)];
const json = x => JSON.parse(JSON.stringify(x));
const DRAFTED = 'Drafted on the review desk';
const MAX_COMMANDS = 20;
export const CHAPTER_NAMES = {3: 'Decisions', 6: 'Logical technology', 7: 'Technology realisation', 8: 'Interfaces & data', 9: 'Security', 10: 'Deployment & runtime'};

// ---------------------------------------------------------------- the records a draft edits

const planRec = (p, id) => list(p?.runtime?.plans).find(x => x.id === id) || null;
const contractRec = (p, id) => list(p?.interfaces?.contracts).find(x => x.id === id) || null;
const realRec = (p, id) => list(p?.technologyRealisation?.records).find(x => x.id === id) || null;
const controlRec = (p, id) => list(p?.security?.controls).find(x => x.id === id) || null;
const threatRec = (p, id) => list(p?.security?.threats).find(x => x.id === id) || null;
const zonesOf = (p, envId) => list(p?.runtime?.zones).filter(z => z.environmentId === envId);
const placementsOf = (p, planId) => list(p?.runtime?.placements).filter(l => l.planId === planId);
// Each command carries the whole current record with the changed fields, as the chapter's editor sends it.
const planCmd = (p, id, changes) => ({type: 'runtime.plan', payload: json({...planRec(p, id), ...changes})});
const contractCmd = (p, id, changes) => { const c = contractRec(p, id); return {type: 'interfaces.contract', payload: json({...c, ...changes, exchanges: list(c.exchanges).map(x => ({dataId: x.dataId, role: x.role}))})}; };
const realCmd = (p, id, changes) => ({type: 'techrealisation.plan', payload: json({...realRec(p, id), ...changes, mappings: list(p.technologyRealisation.mappings).filter(m => m.realizationId === id).map(m => ({capabilityId: m.capabilityId, scope: m.scope}))})});
const controlCmd = (p, id, changes) => ({type: 'security.control', payload: json({...controlRec(p, id), ...changes})});
const placementCmd = (raw) => ({type: 'runtime.placement', payload: json({confirmed: false, ...raw})});

// ---------------------------------------------------------------- what kind of part it is

// How a part survives losing one zone: a primary with a standby, a majority of nodes, one instance
// kept apart from what it protects, or replicas spread across the zones.
function survival(row) {
  if (row.band === 'parts') return 'spread';
  if (['transactional', 'caching'].includes(row.category)) return 'pair';
  if (fact(row.product, 'clusterNodes') || fact(row.product, 'dcs')) return 'quorum';
  if (row.category === 'backup') return 'single';
  return 'spread';
}
function recoveryTarget(row) {
  return [...row.drivers.filter(d => (d.category === 'recoverability' || d.category === 'availability') && toMinutes(d.targetValue, d.unit) != null).map(d => ({v: toMinutes(d.targetValue, d.unit), by: d.id})),
    ...row.caps.filter(c => num(c.recoveryMinutes) != null).map(c => ({v: num(c.recoveryMinutes), by: c.ref}))].sort((a, b) => a.v - b.v)[0] || null;
}
function outageBudget(row) {
  return row.drivers.filter(d => d.category === 'availability' && d.unit === '%').map(d => ({d, b: availabilityBudget(d.targetValue, windowDays(d).days), days: windowDays(d).days})).filter(x => x.b != null).sort((a, b) => a.b - b.b)[0] || null;
}
const minutesFor = row => { const t = recoveryTarget(row), b = outageBudget(row); return t ? Math.max(1, Math.floor(t.v)) : b ? Math.max(1, Math.floor(b.b / 2)) : 15; };
const minutesWhy = row => { const t = recoveryTarget(row), b = outageBudget(row); return t ? `${t.by} allows ${fmtN(t.v)} min` : b ? `half of the ${fmtN(b.b, 1)} min ${b.d.id} allows in ${b.days} days, so two recoveries fit` : 'a starting point: no recovery target is recorded'; };
const zoneRef = (p, id) => list(p?.runtime?.zones).find(z => z.id === id)?.ref || id;
const on = (row) => /kubernetes/i.test(row.product) ? 'Kubernetes' : '';

// ---------------------------------------------------------------- the drafts, by vital

function draft(x) { return {aims: [], rows: [], knobs: [], math: [], also: '', ...x}; }
// Wording the architect — or Sol, refining the draft — can rewrite; the numbers stay in their own knobs.
const words = (key, label, value) => ({key, label, type: 'textarea', value, maxLength: 2400, wording: true});
const said = (k, key, fallback) => str(k?.[key]) || fallback;
function judgement(row, vital, text, fix) { return {judgement: {id: `${vital}:${row.id}`, row: row.id, ref: row.ref, vital, text, fix}}; }

const DRAFTERS = {
  availability(D, row, v) {
    const p = D.p, pl = row.plan, zones = zonesOf(p, pl.environmentId), how = survival(row);
    if (!zones.length) return judgement(row, 'availability', `No zone is recorded for ${row.ref}'s environment, so there is nowhere to place it. The desk does not invent sites.`, {chapter: 10, id: pl.id, label: 'Record a zone in Chapter 10'});
    if (v.state === 'warn') return judgement(row, 'availability', `${v.why} Only ${zones.length} zone${zones.length === 1 ? ' is' : 's are'} recorded; a third failure domain is a decision about sites, not a number the desk can draft.`, {chapter: 10, id: pl.id, label: 'Record a third zone in Chapter 10'});
    const knobs = how === 'spread' ? [{key: 'perZone', label: 'Active replicas in each zone', type: 'number', min: 1, max: 50, value: Math.max(1, ...placementsOf(p, pl.id).filter(l => l.role === 'active').map(l => num(l.replicas) || 1)), unit: 'replicas'}]
      : how === 'quorum' ? [{key: 'nodes', label: 'Nodes', type: 'number', min: 3, max: 9, step: 2, value: (fact(row.product, 'clusterNodes') || fact(row.product, 'dcs'))?.value || 3, unit: 'nodes'}]
      : [{key: 'recoveryMinutes', label: how === 'pair' ? 'Failover within' : 'Restart within', type: 'number', min: 1, max: 1440, value: minutesFor(row), unit: 'min', hint: minutesWhy(row)}, ...(how === 'pair' && !str(pl.fencing) ? [words('fencing', 'Fencing', FENCING)] : [])];
    const title = how === 'pair' ? `Give ${row.ref} a standby in a second zone` : how === 'quorum' ? `Spread ${row.ref}'s nodes across the zones` : how === 'single' ? `Place ${row.ref} apart from what it protects` : `Run ${row.ref} in ${Math.min(zones.length, 3)} zone${zones.length === 1 ? '' : 's'}`;
    const why = how === 'pair' ? `${row.product || row.title} keeps one primary: a standby in another zone, promoted within the recovery time, keeps ${v.target.split(' · ')[0]} within its budget.`
      : how === 'quorum' ? `It works while a majority of its nodes agree, so its nodes are spread across the zones.${zones.length < 3 ? ` With ${zones.length} zone${zones.length === 1 ? '' : 's'} a majority does not survive losing the zone that holds most of them: the desk will read it as “to watch” until a third failure domain is recorded.` : ''}`
      : how === 'single' ? `A copy kept in the same zone as what it protects is lost with it: it runs in the recovery zone, restarted within the recovery time.`
      : `${v.why} With active replicas in ${zones.length > 1 ? 'every zone' : 'its zone'}, losing ${zones.length > 1 ? 'one zone' : 'one replica'} does not stop it.`;
    return draft({id: `availability:${row.id}`, vital: 'availability', chapter: 10, target: {chapter: 10, id: pl.id, ref: pl.ref}, rows: [row.id], aims: [`${row.id}:availability`], title, why, knobs,
      build(p, k) {
        const out = [], pl = planRec(p, row.id), zs = zonesOf(p, pl.environmentId), ls = placementsOf(p, pl.id);
        const act = zid => ls.find(l => l.zoneId === zid && l.role === 'active');
        if (how === 'spread') {
          const n = Math.max(1, Math.round(num(k.perZone) || 1)), use = zs.slice(0, 3);
          for (const z of use) { const l = act(z.id); if (!l) out.push(placementCmd({planId: pl.id, zoneId: z.id, role: 'active', replicas: n, basis: `${DRAFTED}: ${n} active in each of ${use.length} zone${use.length === 1 ? '' : 's'}, so losing one zone leaves the others serving. Confirm the zones fail independently.`})); else if ((num(l.replicas) || 0) < n) out.push(placementCmd({...l, replicas: n, basis: `${DRAFTED}: ${n} active in each zone.`})); }
          const total = n * use.length; if ((num(pl.maxReplicas) || 0) < total) out.push(planCmd(p, pl.id, {maxReplicas: total}));
        } else if (how === 'quorum') {
          const n = Math.max(3, Math.round(num(k.nodes) || 3)), use = zs.slice(0, Math.min(zs.length, n)), per = use.map((z, i) => Math.floor(n / use.length) + (i < n % use.length ? 1 : 0));
          use.forEach((z, i) => { const l = act(z.id); if (!l) out.push(placementCmd({planId: pl.id, zoneId: z.id, role: 'active', replicas: per[i], basis: `${DRAFTED}: ${n} nodes across ${use.length} zone${use.length === 1 ? '' : 's'} (${per.join(' + ')}), so a majority of ${Math.floor(n / 2) + 1} agrees. ${use.length < 3 ? 'Losing the zone with the most nodes loses the majority: record a third failure domain.' : 'Losing one zone keeps the majority.'}`})); else if ((num(l.replicas) || 0) !== per[i]) out.push(placementCmd({...l, replicas: per[i]})); });
          const ch = {}; if ((num(pl.maxReplicas) || 0) < n) ch.maxReplicas = n; if (str(pl.stateMode) === 'Unspecified' || !pl.stateMode) ch.stateMode = 'Stateful service'; if (['Unspecified', ''].includes(str(pl.recoveryStrategy))) ch.recoveryStrategy = 'Failover';
          if (Object.keys(ch).length) out.push(planCmd(p, pl.id, ch));
        } else {
          const m = Math.max(1, Math.round(num(k.recoveryMinutes) || minutesFor(row)));
          const primary = ls.find(l => l.role === 'active')?.zoneId || zs[0].id, other = zs.find(z => z.id !== primary && z.failureDomain) || zs.find(z => z.id !== primary) || null;
          if (how === 'pair') {
            if (!ls.some(l => l.role === 'active')) out.push(placementCmd({planId: pl.id, zoneId: primary, role: 'active', replicas: 1, basis: `${DRAFTED}: one primary.`}));
            if (other && !ls.some(l => l.role === 'standby')) out.push(placementCmd({planId: pl.id, zoneId: other.id, role: 'standby', replicas: 1, basis: `${DRAFTED}: a standby in ${other.ref}, promoted when the primary fails. Confirm replication and promotion with a drill.`}));
            out.push(planCmd(p, pl.id, {stateMode: 'Stateful service', recoveryStrategy: 'Failover', recoveryMinutes: m, maxReplicas: Math.max(2, num(pl.maxReplicas) || 1), backupZoneId: pl.backupZoneId || other?.id || '',
              fencing: str(pl.fencing) || said(k, 'fencing', FENCING),
              targetsBasis: `${DRAFTED}: failover within ${fmtN(m)} min (${minutesWhy(row)}). Prove it with a failover drill.`, targetsConfirmed: false}));
          } else {
            const z = other || zs[0];
            if (!ls.some(l => l.role === 'active')) out.push(placementCmd({planId: pl.id, zoneId: z.id, role: 'active', replicas: 1, basis: `${DRAFTED}: kept in ${z.ref}, apart from what it protects.`}));
            out.push(planCmd(p, pl.id, {recoveryStrategy: str(pl.recoveryStrategy) && pl.recoveryStrategy !== 'Unspecified' ? pl.recoveryStrategy : 'Restart', recoveryMinutes: m, targetsBasis: `${DRAFTED}: back within ${fmtN(m)} min (${minutesWhy(row)}). Prove it with a restore drill.`, targetsConfirmed: false}));
          }
        }
        return out;
      }});
  },

  recovery(D, row, v) {
    const pl = row.plan;
    if (v.state === 'bad') return judgement(row, 'recovery', `${v.why} Recording a shorter time does not make it true: a faster recovery needs a standby or a quicker restart path, proven by a drill.`, v.fix);
    const how = survival(row), m0 = minutesFor(row);
    return draft({id: `recovery:${row.id}`, vital: 'recovery', chapter: 10, target: {chapter: 10, id: pl.id, ref: pl.ref}, rows: [row.id], aims: [`${row.id}:recovery`],
      title: `Set ${row.ref}'s recovery objective to ${fmtN(m0)} min`, why: `${v.why} ${minutesWhy(row)[0].toUpperCase() + minutesWhy(row).slice(1)}; recorded as an objective to prove, not a measurement.`,
      knobs: [{key: 'recoveryMinutes', label: 'Recover within', type: 'number', min: 1, max: 1440, value: m0, unit: 'min', hint: minutesWhy(row)}, ...(!str(pl.recoveryPlan) ? [words('recoveryPlan', 'Recovery plan', recoveryWords(row, how))] : [])],
      build(p, k) {
        const pl = planRec(p, row.id), m = Math.max(1, Math.round(num(k.recoveryMinutes) || m0)), ch = {recoveryMinutes: m, targetsConfirmed: false};
        if (num(pl.recoveryMinutes) === m) return [];
        const strat = str(pl.recoveryStrategy);
        if (!strat || strat === 'Unspecified') ch.recoveryStrategy = how === 'pair' || how === 'quorum' ? 'Failover' : 'Restart';
        if (!str(pl.stateMode) || pl.stateMode === 'Unspecified') ch.stateMode = row.band === 'parts' ? 'Stateless process' : how === 'pair' || how === 'quorum' ? 'Stateful service' : 'Unspecified';
        const restart = (ch.recoveryStrategy || strat) === 'Restart';
        ch.targetsBasis = `${DRAFTED}: back within ${fmtN(m)} min (${minutesWhy(row)}).${ch.stateMode === 'Stateless process' ? ' Assumes it keeps no state of its own — its state lives in the stores it calls; confirm.' : ''} Prove it with a recovery drill.`;
        if (!str(pl.recoveryPlan)) ch.recoveryPlan = said(k, 'recoveryPlan', restart ? RESTART_WORDS(row) : FAILOVER_WORDS);
        return [planCmd(p, pl.id, ch)];
      }});
  },

  loss(D, row, v) {
    const pl = row.plan, t = row.caps.filter(c => num(c.lossMinutes) != null).map(c => ({v: num(c.lossMinutes), by: c.ref})).sort((a, b) => a.v - b.v)[0];
    if (!t) return judgement(row, 'loss', `${v.why} How much data may be lost is a recovery-point objective only the business can set.`, v.fix);
    return draft({id: `loss:${row.id}`, vital: 'loss', chapter: 10, target: {chapter: 10, id: pl.id, ref: pl.ref}, rows: [row.id], aims: [`${row.id}:loss`], title: `Protect ${row.ref} to lose at most ${fmtN(t.v)} min`, why: `${t.by} allows ${fmtN(t.v)} min of loss: continuous log shipping or replication to the recovery zone meets it; a nightly copy does not.`,
      knobs: [{key: 'lossMinutes', label: 'Lose at most', type: 'number', min: 0, max: 1440, value: t.v, unit: 'min'}],
      build(p, k) { const m = Math.max(0, num(k.lossMinutes) ?? t.v), pl = planRec(p, row.id); return [planCmd(p, pl.id, {lossMinutes: m, backupPlan: str(pl.backupPlan) || `Ship the write-ahead log continuously to the recovery zone, so at most ${fmtN(m)} min is lost; test a restore.`, targetsBasis: `${DRAFTED}: loss within ${fmtN(m)} min (${t.by}). Prove it with a restore.`, targetsConfirmed: false})]; }});
  },

  latency(D, row, v) {
    const x = v.path;
    if (!x || !x.calls.length) return judgement(row, 'latency', `${v.why} Record the call as a Chapter 8 contract first.`, v.fix);
    const d = x.driver, fault = new Set(x.faults.map(f => f.id));
    const todo = x.calls.filter(c => c.ms == null || fault.has(c.contract.id));
    if (!todo.length) return null;
    return draft({id: `latency:${d.id}`, vital: 'latency', chapter: 8, target: {chapter: 8, id: todo[0].contract.id, ref: todo[0].contract.ref}, rows: [row.id], aims: [`${row.id}:latency`],
      title: `Time ${d.id}'s path: ${x.calls.map(c => `${c.contract.ref} ${fmtN(c.ms != null && !fault.has(c.contract.id) ? c.ms : c.budget)} ms`).join(' › ')}`,
      why: `${d.id} allows ${fmtN(x.target)} ms. The calls nest — each caller waits while its callee works — so each timeout leaves its caller about ${fmtN(x.target / x.levels)} ms for its own work: ${x.levels} level${x.levels === 1 ? '' : 's'}.`,
      math: x.calls.map(c => `${c.contract.ref} ${c.contract.title} · level ${c.depth}: ${fmtN(x.target)} × ${x.levels - c.depth} ÷ ${x.levels} → ${fmtN(c.budget)} ms`),
      knobs: [...todo.map(c => ({key: c.contract.id, label: `${c.contract.ref} ${c.contract.title}`, type: 'number', min: 50, max: 600000, step: 50, value: c.budget, unit: 'ms', hint: c.depth === 0 ? 'the entry: the caller\'s whole wait' : `inside ${x.calls.filter(k => k.contract.to === c.contract.from).map(k => k.contract.ref).join(', ') || 'its caller'}`})), words('timeoutPolicy', 'On timeout', TIMEOUT_WORDS)],
      build(p, k) {
        return todo.map(c => { const cur = contractRec(p, c.contract.id), ms = Math.max(1, Math.round(num(k[c.contract.id]) || c.budget)); if (!cur || num(cur.timeoutMs) === ms) return null;
          return contractCmd(p, c.contract.id, {timeoutMs: ms, timeoutConfirmed: false, timeoutBasis: `${DRAFTED}: ${d.id} allows ${fmtN(x.target)} ms. ${c.depth === 0 ? `This is the entry: the caller waits at most ${fmtN(ms)} ms in all.` : `Level ${c.depth} of ${x.levels} nested calls: giving up at ${fmtN(ms)} ms leaves its caller time for its own work.`} Confirm with the provider and a load test.`,
            timeoutPolicy: str(cur.timeoutPolicy) || said(k, 'timeoutPolicy', TIMEOUT_WORDS)}); }).filter(Boolean);
      }});
  },

  capacity(D, row, v) {
    const c = v.capacity, pl = row.plan;
    if (!c) return null;
    const note = [];
    if (c.ceiling?.passed) note.push(`${c.ceiling.what} past about ${c.ceiling.holdsText.replace('≈', '')}: a product choice, drafted as a Chapter 3 decision.`);
    if (c.connections && /connections/.test(c.verdict.why)) { const m = fact(c.product, 'maxConnections'); if (m && c.spec.some(s => s.k === 'Connections')) note.push(`${c.spec.find(s => s.k === 'Connections').v} connections against ${m.text.toLowerCase()} ${m.advice}`); }
    if (['service', 'worker', 'gateway', 'identity'].includes(c.kind) || (c.band === 'parts')) {
      if (c.verdict.state === 'ok' || c.replicas == null) return null;
      const need = c.replicas;
      return draft({id: `capacity:${row.id}`, vital: 'capacity', chapter: 10, target: {chapter: 10, id: pl.id, ref: pl.ref}, rows: [row.id], aims: [`${row.id}:capacity`],
        title: `Let ${row.ref} grow to ${fmtN(need)} replicas${D.cap.workload ? " for the SA Playbook's example load" : ""}`, why: `${c.demand.text} for ${D.cap.objBasis}: ${c.spec[0].d}. ${pl.ref} can grow to ${fmtN(num(pl.maxReplicas) ?? 0)}.`, math: c.math,
        knobs: [{key: 'maxReplicas', label: 'Grow to', type: 'number', min: 1, max: 10000, value: need, unit: 'replicas', hint: c.spec[0].d}, words('scalingPolicy', 'Scaling policy', `${on(row) ? 'Horizontal Pod Autoscaler' : 'Scale out'} on CPU at {utilisation} %, from {min} to {max} replicas.`)],
        build(p, k) {
          const pl = planRec(p, row.id), n = Math.max(1, Math.round(num(k.maxReplicas) || need)), min = Math.min(num(pl.minReady) || 1, n);
          if (num(pl.maxReplicas) === n) return [];
          const u = Math.round((D.cap.objective.assume.utilisation || 70));
          return [planCmd(p, pl.id, {maxReplicas: n, minReady: min, capacityConfirmed: false,
            scalingPolicy: fill(said(k, 'scalingPolicy', `${on(row) ? 'Horizontal Pod Autoscaler' : 'Scale out'} on CPU at {utilisation} %, from {min} to {max} replicas.`), {utilisation: u, min: fmtN(min), max: fmtN(n)}),
            capacityBasis: `${DRAFTED} for ${D.cap.objBasis}: ${steps(c.math)}. Replace the per-replica rate with a load test.`})];
        }});
    }
    if (c.kind === 'store') {
      const nodes = c.replicas || 1;
      if ((num(pl.maxReplicas) ?? 0) >= nodes) return note.length ? judgement(row, 'capacity', note.join(' '), c.ceiling?.passed ? {chapter: 3, id: '', label: 'Frame the choice in Chapter 3'} : v.fix) : null;
      return draft({id: `capacity:${row.id}`, vital: 'capacity', chapter: 10, target: {chapter: 10, id: pl.id, ref: pl.ref}, rows: [row.id], aims: [`${row.id}:capacity`], title: `Allow ${row.ref} ${fmtN(nodes)} nodes: a primary and a standby`, why: `${c.spec.find(s => s.k === 'Nodes')?.d || ''}.`, also: note.join(' '), math: c.math,
        knobs: [{key: 'nodes', label: 'Nodes', type: 'number', min: 1, max: 20, value: nodes, unit: 'nodes'}],
        build(p, k) { const pl = planRec(p, row.id), n = Math.max(1, Math.round(num(k.nodes) || nodes)); return (num(pl.maxReplicas) ?? 0) >= n ? [] : [planCmd(p, pl.id, {maxReplicas: n, capacityConfirmed: false, capacityBasis: `${DRAFTED} for ${D.cap.objBasis}: ${c.spec.map(s => `${s.k} ${s.v}`).join('; ')}.`})]; }});
    }
    if (c.kind === 'queue') {
      if (c.backlog == null) return judgement(row, 'capacity', 'How long a consumer may be down is not recorded, so the backlog a queue must hold cannot be read. Record a recovery target in Chapter 2.', {chapter: 2, id: '', label: 'Record a recovery target in Chapter 2'});
      if (c.verdict.state === 'ok' || (c.verdict.state === 'warn' && c.recorded)) return c.ceiling?.passed ? judgement(row, 'capacity', note.join(' '), {chapter: 3, id: '', label: 'Frame the choice in Chapter 3'}) : null;
      const bound = roundUp(c.backlog), rabbit = /rabbitmq/i.test(c.product), kafka = /kafka/i.test(c.product);
      const full = rabbit ? 'the queue\'s overflow is set to reject-publish, so a publisher using confirms is told and keeps the instruction pending; nothing is dropped (https://www.rabbitmq.com/docs/maxlength)' : kafka ? 'the topic\'s retention is sized for it, and a producer whose buffer fills blocks and then fails, keeping the instruction pending (https://kafka.apache.org/documentation/#producerconfigs_max.block.ms)' : 'the sender is refused, keeps the instruction pending and says so; nothing is dropped';
      return draft({id: `capacity:${row.id}`, vital: 'capacity', chapter: 7, target: {chapter: 7, id: row.assetId, ref: row.assetRef}, rows: [row.id], aims: [`${row.id}:capacity`], title: `Bound ${row.assetRef}'s queue at ${fmtN(bound)} messages`, why: `A consumer outage leaves ${fmtN(c.backlog)} messages waiting (${c.spec.find(s => s.k === 'Backlog to hold')?.d || ''}). The queue's bound must hold them — and say what the sender does when it is full.`, also: note.join(' '), math: c.math,
        knobs: [{key: 'bound', label: 'Hold up to', type: 'number', min: 1, max: 1e12, step: 1000, value: bound, unit: 'messages', hint: `the backlog is ${fmtN(c.backlog)}`}, words('whenFull', 'When it is full', full)],
        build(p, k) { const n = Math.max(1, Math.round(num(k.bound) || bound)), r = realRec(p, row.assetId); if (num(r.capacityValue) === n && /messag/i.test(str(r.capacityUnit))) return [];
          return [realCmd(p, row.assetId, {capacityValue: n, capacityUnit: 'messages', estimatesConfirmed: false, capacityBasis: `${DRAFTED} for ${D.cap.objBasis}: ${steps(c.math)}. When it is full, ${said(k, 'whenFull', full).replace(/[.]\s*$/, '')}. Confirm with a load test.`})]; }});
    }
    if (c.kind === 'cluster' || c.kind === 'telemetry') {
      if (c.verdict.state === 'ok') return null;
      const cluster = c.kind === 'cluster', value = cluster ? c.replicas : Math.ceil(c.demand.value / 100) * 100, unit = cluster ? 'nodes' : 'spans/s';
      if (!value) return null;
      return draft({id: `capacity:${row.id}`, vital: 'capacity', chapter: 7, target: {chapter: 7, id: row.assetId, ref: row.assetRef}, rows: [row.id], aims: [`${row.id}:capacity`],
        title: cluster ? `Size ${row.assetRef}'s cluster at ${fmtN(value)} nodes` : `Size ${row.assetRef} for ${fmtN(value)} spans a second`,
        why: cluster ? `${c.spec.find(s => s.k === 'Pods')?.v} pods need ${c.spec.find(s => s.k === 'vCPU · memory')?.v}: ${c.spec.find(s => s.k === 'Nodes')?.d}.` : `${c.spec.map(s => `${s.k}: ${s.v}`).join('; ')}. Sampling and retention are then sized from it.`, math: c.math,
        knobs: [{key: 'value', label: cluster ? 'Nodes' : 'Ingest', type: 'number', min: 1, max: 1e9, value, unit}],
        build(p, k) { const n = Math.max(1, Math.round(num(k.value) || value)), r = realRec(p, row.assetId); if (num(r.capacityValue) === n && str(r.capacityUnit) === unit) return [];
          return [realCmd(p, row.assetId, {capacityValue: n, capacityUnit: unit, estimatesConfirmed: false, capacityBasis: `${DRAFTED} for ${D.cap.objBasis}: ${steps([...c.spec.map(s => `${s.k} ${s.v}${s.d ? ' (' + s.d + ')' : ''}`), ...c.math])}.`})]; }});
    }
    if (c.kind === 'cache') return judgement(row, 'capacity', `${c.verdict.why} A cache's memory follows the records read most, which only a measurement shows.`, v.fix);
    if (c.kind === 'backup') return judgement(row, 'capacity', `${c.verdict.why} How much data may be lost is the business's recovery-point objective; the desk sizes the backup once it is set.`, v.fix);
    if (c.kind === 'recovery') return judgement(row, 'capacity', `${c.verdict.why}`, v.fix);
    return null;
  },

  integrity(D, row, v) {
    const p = D.p, reqs = D.R.contracts.filter(k => (k.kind === 'request' || !k.kind) && (k.from === row.assetId || k.to === row.assetId) && !str(k.idempotencyKey) && !str(k.duplicatePolicy));
    if (!reqs.length) return null;
    const keyOf = k => str(k.correlationKey) || list(k.exchanges).filter(x => x.role === 'request').map(x => list(p.interfaces?.data).find(d => d.id === x.dataId)).filter(Boolean).flatMap(d => list(d.fields).filter(f => f.key).map(f => f.name))[0] || camel(`${k.title} reference`);
    return draft({id: `integrity:${reqs.map(k => k.id).sort().join('+')}`, vital: 'integrity', chapter: 8, target: {chapter: 8, id: reqs[0].id, ref: reqs[0].ref}, rows: [row.id], aims: [`${row.id}:integrity`],
      title: `Make ${reqs.map(k => k.ref).join(', ')} safe to repeat`, why: `${v.drivers.join(', ')} allows no repeated effect. Each request carries a reference the caller already sends; recorded as its idempotency key, a repeat returns the first outcome instead of acting twice.`,
      knobs: [...reqs.map(k => ({key: k.id, label: `${k.ref} ${k.title}`, type: 'text', value: keyOf(k), hint: str(k.correlationKey) ? 'its correlation key' : 'the key field of the data it carries'})), words('duplicatePolicy', 'Duplicate policy ({key} is each request\'s key)', DUPLICATE_WORDS)],
      build(p, kv) {
        return reqs.map(k => { const cur = contractRec(p, k.id); if (!cur || str(cur.idempotencyKey) || str(cur.duplicatePolicy)) return null; const key = str(kv[k.id]) || keyOf(k);
          return contractCmd(p, k.id, {idempotencyKey: key, duplicatePolicy: `${fill(said(kv, 'duplicatePolicy', DUPLICATE_WORDS), {key})} (${DRAFTED} for ${v.drivers.join(', ')}.)`}); }).filter(Boolean);
      }});
  },

  security(D, row, v) {
    const p = D.p;
    if (v.state === 'none') return judgement(row, 'security', `${v.why} The desk does not invent threats: examine what could go wrong here in Chapter 9, where the threat model suggests them from the flows.`, v.fix);
    const objs = objectsOf(D, row), out = [];
    for (const t of list(p.security?.threats).filter(t => list(t.targetIds).some(id => objs.includes(id)))) {
      const open = list(t.targetIds).filter(id => !list(p.security?.controls).some(c => list(c.threatIds).includes(t.id) && list(c.targetIds).includes(id)));
      if (!open.some(id => objs.includes(id))) continue;
      const existing = list(p.security?.controls).find(c => list(c.threatIds).includes(t.id));
      const key = PROPOSAL_FOR[t.category] || 'authority', proposal = existing ? null : securityProposal(p, key, t.id);
      if (!existing && !proposal) continue;
      out.push(draft({id: `security:${t.id}`, vital: 'security', chapter: 9, target: {chapter: 9, id: t.id, ref: t.ref}, rows: [row.id], aims: [`${row.id}:security`], knobs: proposal ? [words('mechanism', 'Mechanism', proposal.record.mechanism), words('failureResponse', 'When it cannot decide', proposal.record.failureResponse)] : [],
        title: existing ? `Extend ${existing.ref} ${existing.title} to ${open.map(id => refOf(p, id)).join(', ')}` : `Cover ${t.ref} with “${proposal.record.title}”`,
        why: `${t.ref} ${t.title} lands on ${list(t.targetIds).map(id => refOf(p, id)).join(' and ')}; ${open.map(id => refOf(p, id)).join(', ')} ${open.length === 1 ? 'has' : 'have'} no control. ${existing ? `${existing.ref} already answers ${t.ref}; the draft extends it to where the threat also lands.` : `The draft is Chapter 9's own ${proposal.record.category.toLowerCase()} proposal for ${t.category.toLowerCase()}, with its owner and enforcement point left for you.`}`,
        build(p, kw = {}) {
          const ctl = list(p.security?.controls).find(c => list(c.threatIds).includes(t.id)), still = list(threatRec(p, t.id)?.targetIds).filter(id => !list(p.security?.controls).some(c => list(c.threatIds).includes(t.id) && list(c.targetIds).includes(id)));
          if (!still.length) return [];
          if (ctl) return [controlCmd(p, ctl.id, {targetIds: uniq([...list(ctl.targetIds), ...still]), assumptionsResolved: false})];
          const q = securityProposal(p, key, t.id); return q ? [{type: 'security.control', payload: json({...q.record, mechanism: said(kw, 'mechanism', q.record.mechanism), failureResponse: said(kw, 'failureResponse', q.record.failureResponse), id: null, origin: 'suggestion', owner: q.record.owner || ''})}] : [];
        }}));
    }
    return out.length ? out : null;
  },

  observability(D, row) {
    const pl = row.plan, text = monitoringText(D, row);
    return draft({id: `observability:${row.id}`, vital: 'observability', chapter: 10, target: {chapter: 10, id: pl.id, ref: pl.ref}, rows: [row.id], aims: [`${row.id}:observability`],
      title: `Record how ${row.ref} would be seen failing`, why: `It carries ${row.drivers.map(d => d.id).join(', ') || 'no driver'}${row.drivers.some(d => d.priority === 'Critical') ? ', Critical among them' : ''}. The monitoring is drawn from what each driver measures.`,
      knobs: [{key: 'monitoring', label: 'Monitoring', type: 'textarea', value: text}],
      build(p, k) { const pl = planRec(p, row.id), t = str(k.monitoring) || text; return str(pl.monitoring) ? [] : [planCmd(p, pl.id, {monitoring: t.slice(0, 2400)})]; }});
  }
};

const steps = xs => list(xs).map(m => str(m).replace(/[.;]\s*$/, '')).filter(Boolean).join('; ');
const fill = (t, vars) => str(t).replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? String(vars[k]) : m);
const FENCING = 'One primary accepts writes. Fence the old primary before the standby is promoted, so two never act at once.';
const FAILOVER_WORDS = 'Promote the standby, fence the old primary, verify the state is consistent, then resume.';
const RESTART_WORDS = row => `Restart the failed instance${on(row) ? ' (Kubernetes restarts it and readiness gates traffic)' : ''}; reconcile in-flight work by its reference before it resumes.`;
const recoveryWords = (row, how) => how === 'pair' || how === 'quorum' ? FAILOVER_WORDS : RESTART_WORDS(row);
const TIMEOUT_WORDS = 'On timeout the caller stops waiting and treats the outcome as unknown: it keeps the reference, does not repeat a state-changing call without its idempotency key, and enquires before retrying.';
const DUPLICATE_WORDS = 'A repeat with the same {key} returns the original outcome and applies nothing again; a changed request under the same {key} is refused.';
const roundUp = n => { if (!n) return 0; const e = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1)); return Math.ceil(n / e) * e; };
const camel = s => str(s).toLowerCase().replace(/[^a-z0-9]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^./, c => c.toLowerCase());
function objectsOf(D, row) {
  const reqs = D.R.contracts.filter(k => (k.kind === 'request' || !k.kind) && (k.from === row.assetId || k.to === row.assetId));
  return uniq([row.assetId, ...reqs.map(k => k.id), ...D.R.contracts.filter(k => k.kind === 'event' && (k.from === row.assetId || k.to === row.assetId)).map(k => k.id), ...list(row.asset?.dataIds)]);
}
export function refOf(p, id) {
  for (const xs of [p?.interfaces?.contracts, p?.interfaces?.data, p?.realisation?.components, p?.technologyRealisation?.records, p?.runtime?.zones, p?.runtime?.plans, p?.security?.threats, p?.security?.controls, p?.interfaces?.parties]) { const r = list(xs).find(x => x.id === id); if (r) return r.ref || r.id; }
  return id;
}

// What its drivers ask to be watched, in their own terms.
const SIGNALS = {
  service: 'request rate, error rate, 95th-percentile response time and readiness',
  worker: 'messages processed and failed, the age of the oldest waiting message, and dead-lettered messages',
  adapter: 'calls, failures and timeouts to the system it adapts, and outcomes still uncertain',
  connectivity: 'requests, 4xx and 5xx responses, rate-limited requests and upstream latency',
  identity: 'token and access-decision failures, and decision latency',
  transactional: 'primary health, replication lag, connections against the limit, and the write rate',
  messaging: 'queue depth against its bound, the age of the oldest message, refused publishes and connected consumers',
  caching: 'hit ratio, evictions, memory used and replica health',
  observability: 'ingest rate, dropped and sampled spans, and storage used',
  backup: 'the age of the last good backup and of the archived log, and the last restore test',
  recovery: 'leader changes, failover time and replication health',
  compute: 'node readiness, pending pods, and CPU and memory pressure'
};
export function monitoringText(D, row) {
  const signals = SIGNALS[row.band === 'parts' ? (/worker|consumer/i.test(row.kind) ? 'worker' : /adapter|connector/i.test(row.kind + row.title) ? 'adapter' : 'service') : row.category] || 'health, errors and saturation';
  const alerts = row.drivers.map(d => {
    const w = windowDays(d);
    if (d.category === 'availability' && d.unit === '%') { const b = availabilityBudget(d.targetValue, w.days); return b != null ? `${d.id} when half of the ${fmtN(b, 1)} min it allows in ${w.days} days is spent` : ''; }
    if (d.category === 'performance') return `${d.id} when the 95th percentile passes ${d.targetValue} ${d.unit}`;
    if (d.category === 'recoverability') return `${d.id} when anything is still unresolved after ${d.targetValue} ${d.unit}`;
    if (d.category === 'integrity') return `${d.id} on any repeated effect reconciliation finds`;
    if (d.category === 'security') return `${d.id} on refused access, without logging credentials or payment details`;
    if (d.category === 'traceability') return `${d.id} when a stage loses the reference`;
    return '';
  }).filter(Boolean);
  const owner = str(row.plan.owner) && !/^confirm/i.test(str(row.plan.owner)) ? row.plan.owner : 'the on-call owner';
  return `Watch ${signals}.${alerts.length ? ` Alert ${owner}: ${alerts.join('; ')}.` : ''} Keep payload details out of the telemetry. (${DRAFTED} from ${row.drivers.map(d => d.id).join(', ') || 'its kind'}.)`;
}

// ---------------------------------------------------------------- switch points

const SWITCH = 'Review desk switch point';
function switchDraft(D, C) {
  const p = D.p, r = C.record, row = D.rows.find(x => x.assetId === r.id);
  const asked = list(p.decisions?.records).find(d => str(d.source).startsWith(`${SWITCH} · ${r.ref}`));
  const name = id => { const o = C.options.find(x => x.option.id === id)?.option; return o ? o.product || o.title : id; };
  const cur = C.reading ? name(C.reading) : 'no product';
  if (asked) return {judgement: {id: `switch:${r.id}`, row: row?.id || '', ref: r.ref, vital: 'capacity', text: `${asked.id} already frames this choice: ${asked.question}`, fix: {chapter: 3, id: asked.id, label: `Open ${asked.id} in Chapter 3`}}};
  const drivers = C.criteria.filter(c => c.kind === 'driver').map(c => c.id), reqs = uniq(drivers.flatMap(id => list(list(p.quality?.drivers).find(d => d.id === id)?.requirementIds))).filter(id => list(p.artefacts).some(a => a.id === id && a.type === 'requirement'));
  const scores = C.options.map(o => `${name(o.option.id)} ${o.score >= 0 ? '+' : ''}${o.score}`).join(', ');
  const why = [C.ceiling?.passed ? `${C.ceiling.what}: at ${D.cap.workload ? D.cap.objBasis : D.cap.objText} it needs ${fmtN(C.ceiling.demand)} ${C.ceiling.unitName} against ${fmtN(C.ceiling.threshold)} planned, past it above about ${C.ceiling.holdsText.replace('≈', '')}. ${C.ceiling.advice}` : '', `Weighed against the drivers: ${scores}.`].filter(Boolean).join(' ');
  const question = `Should ${r.ref} ${r.title.replace(/ realization$/i, '')} stay on ${cur} for ${D.cap.objText}${D.cap.workload ? " (the SA Playbook's example)" : ""}?`.slice(0, 200);
  const contextWords = `${describeChoice(C)} ${why} Drafted on the review desk from Chapter 7's options, weighed against the drivers; the planning assumptions behind any limit are on the desk.`.slice(0, 2400);
  return draft({id: `switch:${r.id}`, vital: 'choice', chapter: 3, target: {chapter: 3, id: r.id, ref: r.ref}, rows: row ? [row.id] : [], aims: [], switchPoint: true,
    title: `Frame ${r.ref}'s product choice as a Chapter 3 decision`, why: `${describeChoice(C)} ${why}`.trim(), knobs: [words('context', 'The question\'s context', contextWords)],
    build(p, k = {}) {
      const save = {type: 'decision.save', payload: {question, topic: 'custom', owner: str(r.owner), source: `${SWITCH} · ${r.ref}`, driverIds: drivers, requirementIds: reqs,
        context: said(k, 'context', contextWords).slice(0, 4000),
        assumptions: C.ceiling ? `${C.ceiling.label[0].toUpperCase() + C.ceiling.label.slice(1)} is assumed to take ${fmtN(C.ceiling.limit)} ${C.ceiling.unitName}, a planning assumption to replace with a load test.` : '', risks: '', mitigation: '', rationale: ''}};
      const made = applyCanonical(p, save, 'preview'), id = made.selected || list(made.document.decisions.records).at(-1)?.id;
      const alts = C.options.slice(0, 6).map(o => ({type: 'decision.alternative', payload: json({id, title: `${o.option.product || o.option.title}${o.option.operatingModel ? ' · ' + o.option.operatingModel.toLowerCase() : ''}`.slice(0, 160),
        summary: str(o.option.title), benefits: str(o.option.benefits), costs: str(o.option.drawbacks), consequences: C.ceiling && C.ceiling.optionId === o.option.id ? (C.ceiling.passed ? C.ceiling.advice : `Holds to ${C.ceiling.holdsText} on one unit.`) : '', pattern: '', antiPattern: '', responsibilityIds: [], relationships: [],
        assessments: Object.fromEntries(drivers.map(did => { const i = C.criteria.findIndex(c => c.id === did), cell = o.cells[i], s = cell?.recorded || (cell?.suggested && !cell.suggested.weak && cell.suggested.effect !== 'unknown' ? {effect: cell.suggested.effect, reason: cell.suggested.reasons.map(x => x.text).join(' '), evidence: uniq(cell.suggested.reasons.map(x => x.src)).join(' · ')} : null); return [did, s ? {effect: s.effect, reason: str(s.reason), evidence: str(s.evidence)} : {effect: 'unknown', reason: '', evidence: ''}]; }))})}));
      return [save, ...alts];
    }});
}

// ---------------------------------------------------------------- all drafts for a desk

export function fixDrafts(D, {choices = D.choices} = {}) {
  const drafts = new Map(), judgements = [];
  const add = d => { if (!d) return; if (d.judgement) { if (!judgements.some(j => j.id === d.judgement.id)) judgements.push(d.judgement); return; } const x = drafts.get(d.id); if (x) { x.rows = uniq([...x.rows, ...d.rows]); x.aims = uniq([...x.aims, ...d.aims]); } else drafts.set(d.id, d); };
  for (const row of D.rows) for (const v of row.vitals) {
    if (!['bad', 'none', 'warn'].includes(v.state)) continue;
    let r = null;
    try { r = DRAFTERS[v.vital]?.(D, row, v) || null; } catch (e) { r = judgement(row, v.vital, `The desk could not draft this fix (${e.message}).`, v.fix); }
    for (const x of Array.isArray(r) ? r : [r]) add(x);
  }
  for (const C of choices ? choices.values() : []) if (C?.revisit) { try { add(switchDraft(D, C)); } catch { /* a choice that cannot be framed is left for Chapter 7 */ } }
  const order = id => VITALS.findIndex(v => v.id === id);
  const rowOrder = id => D.rows.findIndex(r => r.id === id);
  const list_ = [...drafts.values()].sort((a, b) => (a.switchPoint ? 1 : 0) - (b.switchPoint ? 1 : 0) || order(a.vital) - order(b.vital) || rowOrder(a.rows[0]) - rowOrder(b.rows[0]));
  return {drafts: list_, judgements, byId: new Map(list_.map(d => [d.id, d])), forCell: (rowId, vital) => list_.filter(d => d.aims.includes(`${rowId}:${vital}`)), judgementFor: (rowId, vital) => judgements.find(j => j.row === rowId && j.vital === vital) || null};
}

export const valuesOf = (d, given = {}) => Object.fromEntries(d.knobs.map(k => [k.key, given?.[k.key] ?? k.value]));

// Build drafts in order on a copy of the project: each draft reads the record as the ones before it
// left it, so several drafts on one record compose into consistent commands.
export function compose(p, drafts, values = {}, {limit = Infinity} = {}) {
  let doc = p;
  const commands = [], used = [], skipped = [], errors = [];
  for (const d of drafts) {
    let cmds;
    try { cmds = d.build(doc, valuesOf(d, values[d.id])).map(json); } catch (e) { errors.push({id: d.id, message: e.message}); continue; }
    if (!cmds.length) { skipped.push(d.id); continue; }
    if (commands.length + cmds.length > limit) { skipped.push(d.id); continue; }
    let next = doc;
    try { for (const c of cmds) next = applyCanonical(next, c, 'preview').document; } catch (e) { errors.push({id: d.id, message: e.message}); continue; }
    doc = next; commands.push(...cmds); used.push(d.id);
  }
  return {commands, document: doc, used, skipped, errors};
}

// What the drafts do to the desk: every vital cell whose state changes, and the whole system's.
// `read` turns a project into a desk reading (deskSource by default; the desk passes its own model).
export function simulate(p, drafts, values = {}, {desk = {}, before = null, limit = Infinity, read = null} = {}) {
  const C = compose(p, drafts, values, {limit});
  const B = before || (read ? read(p) : deskSource(p, desk)), A = read ? read(C.document) : deskSource(C.document, desk);
  return {...C, ...deskDiff(B, A)};
}
// Every vital cell whose state changed between two readings, and those whose value moved without it.
export function deskDiff(B, A) {
  const changed = [], moved = [];
  for (const r of A.rows) { const b = B.rows.find(x => x.id === r.id); if (!b) continue; r.vitals.forEach((v, i) => { const o = b.vitals[i]; if (!o) return; if (o.state !== v.state) changed.push({row: r.id, ref: r.ref, vital: v.vital, from: o.state, to: v.state, was: o.value, now: v.value}); else if (o.value !== v.value) moved.push({row: r.id, ref: r.ref, vital: v.vital, state: v.state, was: o.value, now: v.value}); }); }
  const system = A.system.map((s, i) => ({vital: s.vital, from: B.system[i]?.state, to: s.state, before: B.system[i], after: s}));
  const revealed = changed.filter(c => c.from === 'na');
  return {before: B, after: A, changed, moved, system, revealed, normal: changed.filter(c => c.to === 'ok').length};
}

// The changed fields of each command, against the record as it stood, for a person to read.
const LABELS = {minReady: 'Minimum ready', maxReplicas: 'Maximum replicas', scalingPolicy: 'Scaling policy', capacityBasis: 'Capacity basis', capacityConfirmed: 'Capacity confirmed', recoveryMinutes: 'Recovery time (min)', lossMinutes: 'Data loss (min)', recoveryStrategy: 'Recovery strategy', stateMode: 'State', recoveryPlan: 'Recovery plan', fencing: 'Fencing', backupZoneId: 'Recovery zone', backupPlan: 'Backup plan', targetsBasis: 'Targets basis', targetsConfirmed: 'Targets confirmed', monitoring: 'Monitoring', timeoutMs: 'Timeout (ms)', timeoutBasis: 'Timeout basis', timeoutPolicy: 'On timeout', timeoutConfirmed: 'Timeout confirmed', idempotencyKey: 'Idempotency key', duplicatePolicy: 'Duplicate policy', capacityValue: 'Capacity', capacityUnit: 'Capacity unit', estimatesConfirmed: 'Estimates confirmed', targetIds: 'Protects', replicas: 'Replicas', assumptionsResolved: 'Assumptions resolved'};
const NUMERIC = new Set(['minReady', 'maxReplicas', 'recoveryMinutes', 'lossMinutes', 'timeoutMs', 'capacityValue', 'replicas']);
const SKIP = new Set(['history', 'revision', 'sourceSnapshot', 'review', 'origin', 'exchanges', 'mappings', 'options', 'recorded', 'approval', 'selectedOptionId', 'col', 'assessments', 'alternatives', 'id', 'ref']);
const same = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '') || String(a ?? '') === String(b ?? '');
export function describeCommands(p, commands) {
  let doc = p;
  const out = [];
  for (const c of commands) {
    const x = c.payload || {}, show = (k, v) => Array.isArray(v) ? v.map(id => refOf(doc, id)).join(', ') : typeof v === 'boolean' ? (v ? 'yes' : 'no') : k.endsWith('ZoneId') || k === 'zoneId' ? zoneRef(doc, v) : NUMERIC.has(k) && num(v) != null ? fmtN(num(v)) : String(v ?? '');
    let rec = null, head = '';
    if (c.type === 'runtime.plan') { rec = planRec(doc, x.id); head = `${rec?.ref} ${rec?.title}`; }
    else if (c.type === 'interfaces.contract') { rec = contractRec(doc, x.id); head = `${rec?.ref} ${rec?.title}`; }
    else if (c.type === 'techrealisation.plan') { rec = realRec(doc, x.id); head = `${rec?.ref} ${rec?.title}`; }
    else if (c.type === 'security.control' && x.id) { rec = controlRec(doc, x.id); head = `${rec?.ref} ${rec?.title}`; }
    else if (c.type === 'runtime.placement' && x.id) { rec = list(doc.runtime?.placements).find(l => l.id === x.id); head = `${planRec(doc, x.planId)?.ref} in ${zoneRef(doc, x.zoneId)}`; }
    if (rec) out.push({chapter: chapterOf(c.type), head, created: false, fields: Object.keys(x).filter(k => !SKIP.has(k) && k in LABELS && !same(rec[k], x[k])).map(k => ({key: k, label: LABELS[k], before: show(k, rec[k]), after: show(k, x[k])}))});
    else if (c.type === 'runtime.placement') out.push({chapter: 10, head: `New placement · ${planRec(doc, x.planId)?.ref}`, created: true, fields: [{key: 'placement', label: 'Placed', before: '', after: `${x.replicas} ${x.role} in ${zoneRef(doc, x.zoneId)}`}]});
    else if (c.type === 'security.control') out.push({chapter: 9, head: `New control · ${x.title}`, created: true, fields: [{key: 'category', label: 'Category', before: '', after: x.category}, {key: 'targetIds', label: 'Protects', before: '', after: show('targetIds', x.targetIds)}, {key: 'threatIds', label: 'Answers', before: '', after: show('threatIds', x.threatIds)}]});
    else if (c.type === 'decision.save') out.push({chapter: 3, head: 'New decision question', created: true, fields: [{key: 'question', label: 'Question', before: '', after: x.question}]});
    else if (c.type === 'decision.alternative') out.push({chapter: 3, head: 'Alternative', created: true, fields: [{key: 'title', label: 'Alternative', before: '', after: x.title}, {key: 'assessments', label: 'Against the drivers', before: '', after: Object.entries(x.assessments || {}).map(([k, a]) => `${k} ${a.effect}`).join(', ')}]});
    try { doc = applyCanonical(doc, c, 'preview').document; } catch { /* shown as it would be sent */ }
  }
  return out.filter(x => x.fields.length);
}
const chapterOf = type => ({runtime: 10, interfaces: 8, techrealisation: 7, security: 9, decision: 3})[type.split('.')[0]] || 11;

// How a change reads on the desk, in a sentence.
// "No signal" becoming "to watch" is progress — the desk now knows something — so an effect is said
// as where each cell lands, not as better or worse.
export function describeEffect(S, {brief = false} = {}) {
  const n = (xs, w) => xs.length ? `${xs.length} ${w}` : '';
  const known = S.changed.filter(c => c.from !== 'na');
  const parts = [n(known.filter(c => c.to === 'ok'), 'to normal'), n(known.filter(c => c.to === 'warn'), 'to watch'), n(known.filter(c => c.to === 'bad'), 'to critical'), n(known.filter(c => c.to === 'none'), 'to no signal'), n(S.revealed, S.revealed.length === 1 ? 'newly carried' : 'newly carried')].filter(Boolean);
  const moves = S.moved?.length ? `${S.moved.length} move${S.moved.length === 1 ? 's' : ''} without changing state${brief ? '' : ` (${S.moved.slice(0, 2).map(m => `${m.ref} ${m.was} → ${m.now}`).join('; ')})`}` : '';
  if (!parts.length) return moves ? `No vital changes state; ${moves}.` : 'No vital changes on the desk.';
  return `${S.changed.length} vital${S.changed.length === 1 ? '' : 's'} change: ${parts.join(', ')}${moves ? '; ' + moves : ''}.`;
}
export {MAX_COMMANDS};
