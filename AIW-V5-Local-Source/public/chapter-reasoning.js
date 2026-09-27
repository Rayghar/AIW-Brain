// Sol in every chapter model: what a chapter's selection is to the AIW Brain.
//
// The review desk is one place Sol reasons; the chapter models are where the design is made. Here a
// chapter's own record — a quality driver, a responsibility, a component, a platform capability, a
// realisation and its product options, a contract or data definition, a threat or control, a
// runtime plan — becomes a decision point for the same reasoning task (brain-reasoning.js), with
// the same packet, contract, checks and adoption. Only the reading differs:
//
// Sense. The chapter's own words for the record (its model's description), the record's recorded
//   fields and what is not yet recorded, the journey's checks on it, the review desk's vitals for
//   the running parts it touches, and what else the chapter knows about it — a driver's carriers,
//   tactics and trade-offs, a What if's reach, a product weighing, a threat's coverage.
// Refine. Sol may reword a record's listed fields and, where an instrument reads them, propose
//   numbers within bounds (a contract's timeout, a runtime plan's replicas and recovery). Before
//   the architect reviews anything, the same instruments read the design again with them:
//   `chapterReread` says which checks clear, which appear and which vitals move.
// Decide. A refinement becomes the chapter's own change command and goes through the change review
//   like any other edit; a proposed threat becomes a Chapter 9 threat record the same way.
//
// Identifiers: 'M:<chapter>:<objectId>' for a record as its home chapter reads it;
// 'M:2:<driverId>|whatif' for a move being explored in Chapter 2's What if (the architect's target
// and priority travel with the request); 'M:9:<objectId>' for a part viewed in Chapter 9, where the
// question is what could go wrong. Chapter 3's decisions keep the desk's 'D:<decisionId>'.
// Pure: nothing here changes the project.
import {reasoningSource, driverChain, driverTactics, driverTradeoffs, tuneDriver, describeTuning, planFacts, productOf, productLabel, PRIORITY_WEIGHT} from './design-reasoning.js';
import {specFor, productsOfComponent} from './design-spec.js';
import {inheritedFindings} from './review-domain.js';
import {deskSource, VITALS, VSTATE} from './desk-vitals.js';
import {choiceReading} from './product-choice.js';
import {applyCanonical} from './canonical-command.js';
import {digest} from './brain-integrity.js';
import {THREAT_CATEGORIES, PRIORITIES as THREAT_PRIORITIES} from './security-domain.js';
import {utilitySource, describeDriver, PRIORITIES as DRIVER_PRIORITIES} from './utility-model.js';
import {responsibilitySource, describeResponsibility} from './responsibility-model.js';
import {realiseSource, describeComponent} from './realise-model.js';
import {platformSource, describeCapability} from './platform-model.js';
import {stackSource, describeRealisation} from './stack-model.js';
import {deploySource, describePlan} from './deploy-model.js';
import {journeyIndex} from './journey-context.js';

const list = v => Array.isArray(v) ? v : [];
const str = v => typeof v === 'string' ? v.trim() : v == null ? '' : String(v);
const uniq = xs => [...new Set(xs)];
const clip = (s, n = 220) => { const t = str(s); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const memo = fn => { const c = new WeakMap(); return p => { if (!p || typeof p !== 'object') return fn(p); if (!c.has(p)) c.set(p, fn(p)); return c.get(p); }; };
const vitalLabel = id => VITALS.find(v => v.id === id)?.label || id;

// ---------------------------------------------------------------- the records a chapter owns

const W = (key, label, maxLength = 2400) => ({key, label, type: 'textarea', maxLength});
const L = (key, label, maxLength = 160) => ({key, label, type: 'text', maxLength});
const N = (key, label, min, max, unit = '', step = 1) => ({key, label, type: 'number', min, max, step, unit});
export const RECORD_TYPES = {
  driver: {chapter: 2, noun: 'quality driver', coll: p => p?.quality?.drivers, command: 'quality.driver',
    fields: ['category', 'priority', 'stimulus', 'conditions', 'response', 'metric', 'operator', 'targetValue', 'unit', 'window', 'measurement', 'tactic', 'rationale', 'targetConfirmed'],
    knobs: [W('stimulus', 'When (the stimulus)', 1200), W('conditions', 'Under (the conditions)', 1200), W('response', 'The system (the response)', 1200), L('metric', 'Measured by', 300), W('measurement', 'How it is measured', 1200)]},
  responsibility: {chapter: 4, noun: 'responsibility', coll: p => p?.logical?.responsibilities, command: 'logical.responsibility',
    fields: ['purpose', 'boundary', 'owner', 'requirementIds', 'decisionIds', 'confirmed'], knobs: [W('purpose', 'Purpose'), L('boundary', 'Boundary', 300)]},
  component: {chapter: 5, noun: 'component', coll: p => p?.realisation?.components, command: 'realisation.component',
    fields: ['kind', 'purpose', 'boundary', 'inputs', 'outputs', 'dataIds', 'technologyNeeds', 'status', 'assumptions'],
    knobs: [W('purpose', 'Purpose'), L('boundary', 'Boundary', 300), W('inputs', 'Inputs', 1200), W('outputs', 'Outputs', 1200), W('technologyNeeds', 'Technology needs')]},
  capability: {chapter: 6, noun: 'platform capability', coll: p => p?.technology?.capabilities, command: 'technology.capability',
    fields: ['category', 'purpose', 'boundary', 'need', 'failureDomain', 'continuity', 'alternateDomain', 'continuityPlan', 'recoveryPlan', 'recoveryMinutes', 'lossMinutes', 'status'],
    knobs: [W('purpose', 'Purpose'), W('boundary', 'Boundary', 1200), W('continuityPlan', 'Continuity plan'), W('recoveryPlan', 'Recovery plan'), W('rationale', 'Rationale')]},
  realisation: {chapter: 7, noun: 'realisation', coll: p => p?.technologyRealisation?.records, command: 'techrealisation.plan',
    fields: ['purpose', 'operationsPlan', 'accessPlan', 'dataPlan', 'resiliencePlan', 'interfacePlan', 'lifecyclePlan', 'capacityValue', 'capacityUnit', 'capacityBasis', 'risks'],
    knobs: [W('operationsPlan', 'Operations'), W('resiliencePlan', 'Resilience'), W('dataPlan', 'Data'), W('accessPlan', 'Access'), W('interfacePlan', 'Interfaces'), W('lifecyclePlan', 'Lifecycle')]},
  contract: {chapter: 8, noun: 'contract', coll: p => p?.interfaces?.contracts, command: 'interfaces.contract',
    fields: ['kind', 'from', 'to', 'purpose', 'protocol', 'operation', 'correlationKey', 'idempotencyKey', 'duplicatePolicy', 'timeoutMs', 'timeoutPolicy', 'retryPolicy', 'failurePolicy', 'authorization'],
    knobs: [N('timeoutMs', 'Timeout', 50, 600000, 'ms', 50), W('timeoutPolicy', 'On timeout', 1200), W('retryPolicy', 'Retries', 1200), W('failurePolicy', 'On failure', 1200), L('idempotencyKey', 'Idempotency key', 120), W('duplicatePolicy', 'Duplicates', 1200)]},
  data: {chapter: 8, noun: 'data definition', coll: p => p?.interfaces?.data, command: 'interfaces.data',
    fields: ['purpose', 'owner', 'authorityId', 'classification', 'retentionPolicy', 'retentionDays', 'protection'], knobs: [W('protection', 'Protection', 1200), W('retentionPolicy', 'Retention', 1200)]},
  threat: {chapter: 9, noun: 'threat', coll: p => p?.security?.threats, command: 'security.threat',
    fields: ['category', 'actor', 'scenario', 'consequence', 'targetIds', 'priority', 'priorityBasis'], knobs: [L('actor', 'Actor', 300), W('scenario', 'Scenario', 1200), W('consequence', 'Consequence', 1200)]},
  control: {chapter: 9, noun: 'control', coll: p => p?.security?.controls, command: 'security.control',
    fields: ['category', 'purpose', 'targetIds', 'threatIds', 'enforcement', 'mechanism', 'failureMode', 'failureResponse', 'telemetry', 'verificationPlan'],
    knobs: [W('mechanism', 'Mechanism', 1200), W('failureResponse', 'When it fails', 1200), W('telemetry', 'Telemetry', 1200), W('verificationPlan', 'Verification', 1200)]},
  plan: {chapter: 10, noun: 'runtime plan', coll: p => p?.runtime?.plans, command: 'runtime.plan',
    fields: ['assetId', 'stateMode', 'minReady', 'maxReplicas', 'capacityBasis', 'scalingPolicy', 'readiness', 'monitoring', 'runbook', 'rollout', 'rollback', 'recoveryStrategy', 'recoveryPlan', 'fencing', 'backupPlan', 'recoveryMinutes', 'lossMinutes'],
    knobs: [N('maxReplicas', 'Grow to', 1, 10000, 'replicas'), N('minReady', 'Ready copies', 1, 50, 'replicas'), N('recoveryMinutes', 'Recover within', 1, 1440, 'min'), W('scalingPolicy', 'Scaling policy', 1200), W('recoveryPlan', 'Recovery plan'), W('monitoring', 'Monitoring')]}
};
export const CHAPTER_NAMES = {2: 'Quality drivers', 3: 'Decisions', 4: 'Responsibilities', 5: 'Components', 6: 'Platform', 7: 'Products', 8: 'Interfaces', 9: 'Threats', 10: 'Runtime'};
const EXPOSED = ['component', 'contract', 'data', 'realisation'];

// Which record an identifier names, wherever it is kept.
export function findRecord(p, id) {
  if (!p || !id) return null;
  for (const [type, T] of Object.entries(RECORD_TYPES)) { const r = list(T.coll(p)).find(x => x.id === id); if (r) return {type, record: r}; }
  for (const d of list(p.decisions?.records)) { if (d.id === id) return {type: 'decision', record: d}; const a = list(d.alternatives).find(x => x.id === id); if (a) return {type: 'alternative', record: a, parent: d}; }
  for (const r of list(p.technologyRealisation?.records)) { const o = list(r.options).find(x => x.id === id); if (o) return {type: 'option', record: o, parent: r}; }
  return null;
}
export const refOf = r => r ? `${r.ref || r.id}${r.title || r.question ? ' ' + (r.title || r.question) : ''}` : '';
// A participant's name, including the parties outside the design that contracts reach.
const nameOf = (p, id) => refOf(findRecord(p, id)?.record || list(p?.interfaces?.parties).find(x => x.id === id)) || id;

// The record a drawn selection stands for: an option's realisation ("tr-001/TO-001"), a contract's link
// ("C:if-004"), a group ("G:…"), or a placeholder's part ("HOLE:…", "EMPTY:…"); otherwise the id itself.
export function drawnOwner(p, id) {
  const s = String(id || ''), m = /^(?:G|HOLE|EMPTY|C):(.+)$/.exec(s) || /^([^/]+)\/[^/]+$/.exec(s);
  return m && (findRecord(p, m[1]) || list(p?.logical?.groups).some(g => g.id === m[1])) ? m[1] : s;
}
// The saved record Sol's panel can explain for a selection in any chapter model — the record itself or the
// record it is drawn from — or null for what is only drawn (a module, a link, a family of drivers).
export function solOwner(p, sel) {
  if (!p || !sel || sel === 'project') return null;
  const id = drawnOwner(p, sel);
  return findRecord(p, id) || journeyIndex(p).nodes.has(id) ? id : null;
}
// What Sol can be asked about for a selection in a chapter model, or null.
export function solTarget(p, chapter, id, {whatIf = false} = {}) {
  const t = findRecord(p, id) || findRecord(p, drawnOwner(p, id));
  if (!t) return null;
  if (t.type === 'decision') return 'D:' + t.record.id;
  if (t.type === 'alternative') return 'D:' + t.parent.id;
  if (t.type === 'option') return 'M:7:' + t.parent.id;
  if (Number(chapter) === 9 && EXPOSED.includes(t.type)) return 'M:9:' + t.record.id;
  if (t.type === 'driver' && whatIf) return `M:2:${t.record.id}|whatif`;
  return RECORD_TYPES[t.type] ? `M:${RECORD_TYPES[t.type].chapter}:${t.record.id}` : null;
}
export function parseTarget(id) {
  const m = /^M:(\d{1,2}):([\w.+-][\w:+.-]{0,140})(?:\|(whatif))?$/.exec(String(id || ''));
  return m ? {chapter: Number(m[1]), objectId: m[2], variant: m[3] || null} : null;
}
// The architect's What if, as it travels with a request: a target value and a priority, no more.
export function whatIfValues(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {}, v = str(raw.targetValue);
  if (v && v.length <= 40 && Number.isFinite(Number(v))) out.targetValue = v;
  if (DRIVER_PRIORITIES.includes(raw.priority)) out.priority = raw.priority;
  return out;
}

// ---------------------------------------------------------------- sense: the chapter's reading

const reasonOf = memo(p => reasoningSource(p));
const findingsOf = memo(p => { try { return inheritedFindings(p); } catch { return []; } });
const vitalsOf = memo(p => { try { return deskSource(p); } catch { return null; } });
const utilityOf = memo(p => utilitySource(p)), responsibilityOf = memo(p => responsibilitySource(p)), realiseOf = memo(p => realiseSource(p, {})), platformOf = memo(p => platformSource(p, {})), stackOf = memo(p => stackSource(p, {})), deployOf = memo(p => deploySource(p, {}));
function chapterWords(p, type, id) {
  try {
    if (type === 'driver') return describeDriver(utilityOf(p), id);
    if (type === 'responsibility') return describeResponsibility(responsibilityOf(p), id);
    if (type === 'component') return describeComponent(realiseOf(p), id);
    if (type === 'capability') return describeCapability(platformOf(p), id);
    if (type === 'realisation') return describeRealisation(stackOf(p), id);
    if (type === 'plan') return describePlan(deployOf(p), id);
  } catch { return ''; }
  return '';
}
function recorded(r, fields) {
  const out = {}, missing = [];
  for (const k of fields) {
    const v = r[k];
    if (v == null || v === '' || (Array.isArray(v) && !v.length) || v === 'Unspecified') { missing.push(k); continue; }
    out[k] = Array.isArray(v) ? v.slice(0, 8).map(x => typeof x === 'object' ? clip(x.title || x.id, 60) : clip(x, 60)) : typeof v === 'string' ? clip(v, 240) : v;
  }
  return {out, missing};
}
// The journey's checks on this record, errors first.
function checksOn(p, ids) {
  const set = new Set(ids), seen = new Set();
  return findingsOf(p).filter(f => (set.has(f.objectId) || list(f.objectIds).some(x => set.has(x))) && ['error', 'warning'].includes(f.level))
    .sort((a, b) => (a.level === 'error' ? 0 : 1) - (b.level === 'error' ? 0 : 1))
    .filter(f => { const k = f.chapter + '|' + f.title; if (seen.has(k)) return false; seen.add(k); return true; })
    .map(f => ({chapter: f.chapter, level: f.level, title: clip(f.title, 120), detail: clip(f.detail, 150)}));
}
// The running parts a record touches, as the desk reads them.
function rowsFor(D, p, t) {
  if (!D) return [];
  const r = t.record, id = r.id, rows = D.rows;
  const byAsset = ids => { const s = new Set(ids); return rows.filter(x => s.has(x.assetId)); };
  const compsOfData = dataIds => list(p.realisation?.components).filter(c => list(c.dataIds).some(d => dataIds.includes(d))).map(c => c.id);
  const endpoints = ids => list(p.interfaces?.contracts).filter(c => ids.includes(c.id)).flatMap(c => [c.from, c.to]);
  const targetAssets = ids => uniq([...ids, ...endpoints(ids), ...compsOfData(ids)]);
  switch (t.type) {
    case 'plan': return rows.filter(x => x.id === id);
    case 'component': case 'realisation': return byAsset([id]);
    case 'capability': return rows.filter(x => list(x.caps).some(c => c.id === id));
    case 'contract': return byAsset([r.from, r.to]);
    case 'data': return byAsset(compsOfData([id]));
    case 'threat': return byAsset(targetAssets(list(r.targetIds)));
    case 'control': return byAsset(targetAssets([...list(r.targetIds), ...list(p.security?.threats).filter(x => list(r.threatIds).includes(x.id)).flatMap(x => list(x.targetIds))]));
    case 'responsibility': return byAsset(list(p.logical?.mappings).filter(m => m.logicalId === id).map(m => m.physicalId));
    case 'driver': return rows.filter(x => list(x.drivers).some(d => d.id === id));
    default: return [];
  }
}
const RANK = {bad: 0, warn: 1, none: 2, ok: 3, na: 4};
// The vitals a record bears on: a contract on waiting, repeats and protection; data on loss, repeats and protection.
const VITALS_FOR = {contract: ['latency', 'integrity', 'security', 'availability'], data: ['loss', 'integrity', 'security'], responsibility: null};
function vitalCells(rows, {only = null, all = false, driver = null} = {}) {
  const cells = rows.flatMap(row => list(row.vitals).filter(v => v.state !== 'na' && (!only || only.includes(v.vital)) && (!driver || list(v.drivers).includes(driver)) && (all || v.state !== 'ok')).map(v => ({row, v})));
  return cells.sort((a, b) => RANK[a.v.state] - RANK[b.v.state]).slice(0, 8).map(({row, v}) => ({part: `${row.ref} ${row.title}`, vital: vitalLabel(v.vital), state: VSTATE[v.state].label, recorded: clip(v.value, 80), against: clip(v.target, 80), why: clip(v.why, 150), key: [row.ref, v.vital, v.state]}));
}
function specOf(R, id) {
  let s = null;
  try { s = specFor(R, id); } catch { s = null; }
  if (!s) return null;
  return {responsibilities: s.responsibilities.map(r => r.ref).slice(0, 6), components: s.components.map(c => c.ref).slice(0, 6), capabilities: s.capabilities.map(c => `${c.ref} ${c.category}`).slice(0, 8),
    products: s.products.map(x => x.product?.product ? `${productLabel(x.product)}${x.product.selected ? '' : ' (candidate)'}` : `${x.realisation.ref}: no product`).slice(0, 6),
    plans: s.plans.map(f => `${f.plan.ref}: ${f.active} active${f.standby ? ', ' + f.standby + ' standby' : ''} in ${f.zonesAll.length} zone${f.zonesAll.length === 1 ? '' : 's'}; ${f.stateMode}; recovery ${f.recoveryMinutes == null ? 'not recorded' : f.recoveryMinutes + ' min'}`).slice(0, 4),
    drivers: s.drivers.map(d => `${d.id} ${d.priority}`).slice(0, 6), decisions: s.decisions.map(d => d.id).slice(0, 6), gaps: s.gaps.slice(0, 8)};
}
function productsFor(p, R, t) {
  const r = t.record;
  try {
    if (t.type === 'component') return productsOfComponent(R, r.id).map(x => x.product?.product).filter(Boolean);
    if (t.type === 'realisation') return uniq([productOf(r)?.product, ...list(r.options).map(o => o.product)].filter(Boolean));
    if (t.type === 'capability') { const s = specFor(R, r.id); return s ? s.products.map(x => x.product?.product).filter(Boolean) : []; }
    if (t.type === 'plan') { const s = specFor(R, r.id); return s ? s.products.map(x => x.product?.product).filter(Boolean) : []; }
  } catch { return []; }
  return [];
}
// What a threat proposal may target for a part viewed in Chapter 9.
function exposureTargets(p, t) {
  const r = t.record, ids = [r.id];
  if (t.type === 'component') ids.push(...list(p.interfaces?.contracts).filter(c => (c.kind === 'request' || !c.kind) && (c.from === r.id || c.to === r.id)).map(c => c.id), ...list(r.dataIds));
  if (t.type === 'contract') ids.push(...list(r.exchanges).map(x => x.dataId));
  return uniq(ids).slice(0, 8).map(id => { const f = findRecord(p, id); return {id, ref: f?.record.ref || id, title: f?.record.title || ''}; }).filter(x => x.ref);
}

// Everything the chapter knows about one record, as compact data for Sol, and what identifies it.
export function chapterReading(p, id, {values = {}, D = null} = {}) {
  const q = parseTarget(id);
  if (!q) return null;
  const t = findRecord(p, q.objectId);
  if (!t || !RECORD_TYPES[t.type]) return null;
  const T = RECORD_TYPES[t.type];
  const kind = q.variant === 'whatif' ? 'whatif' : q.chapter === 9 && EXPOSED.includes(t.type) ? 'exposure' : 'record';
  if (kind === 'whatif' && t.type !== 'driver') return null;
  if (kind === 'record' && T.chapter !== q.chapter) return null;
  const r = t.record, R = reasonOf(p), DV = D && Array.isArray(D.rows) ? D : vitalsOf(p);
  const rows = rowsFor(DV, p, t), rec = recorded(r, T.fields);
  const reading = {record: `${refOf(r)} · ${T.noun}`, recorded: rec.out, notRecorded: rec.missing};
  const words = chapterWords(p, t.type, r.id);
  if (words) reading.chapterReads = words;
  const checks = checksOn(p, [r.id]);
  if (checks.length) reading.checks = checks.slice(0, 8);
  const cells = vitalCells(rows, {all: t.type === 'plan', only: kind === 'exposure' || ['threat', 'control'].includes(t.type) ? ['security'] : VITALS_FOR[t.type] || null, driver: t.type === 'driver' ? r.id : null});
  if (cells.length) reading.vitals = cells.map(({key, ...c}) => c);
  if (['responsibility', 'component', 'capability', 'realisation', 'plan'].includes(t.type)) { const s = specOf(R, r.id); if (s) reading.specification = s; }
  let drivers = [], tactics = [], names = {}, preferred = null, proposals = null, extra = {};
  if (t.type === 'driver') {
    const ch = driverChain(R, r.id);
    if (ch) reading.carriedBy = {responsibilities: ch.responsibilities.map(x => x.ref), components: ch.components.map(x => x.ref), products: ch.realisations.filter(x => x.product?.product).map(x => productLabel(x.product)).slice(0, 5), plans: ch.plans.map(f => `${f.plan.ref}: ${f.active} active${f.standby ? ', ' + f.standby + ' standby' : ''}`).slice(0, 5), decisions: ch.decisions.map(x => `${x.record.id}${x.selected ? ' (chosen: ' + clip(x.selected.title, 60) + ')' : ''}`)};
    const ts = driverTactics(R, r.id);
    reading.tactics = {named: ts.filter(x => x.state === 'named').map(x => x.tactic.name), considered: ts.filter(x => x.state === 'considered').map(x => x.tactic.name), open: ts.filter(x => x.state === 'open').map(x => x.tactic.name).slice(0, 8)};
    const dr = R.driver(r.id), tos = dr ? driverTradeoffs(R, dr) : [];
    if (tos.length) reading.pullsAgainst = tos.slice(0, 3).map(x => `${x.with}: ${clip(x.text, 160)}${x.drivers.length ? ' — here ' + x.drivers.map(d => d.id).join(', ') : ''}`);
    drivers = [r.id]; tactics = ts.filter(x => x.state !== 'named').map(x => x.tactic.name);
    if (kind === 'whatif') {
      const v = whatIfValues(values), M = tuneDriver(R, r.id, v);
      if (M) {
        extra.move = {target: `${r.operator} ${M.before.targetValue} → ${M.after.targetValue} ${r.unit}`.trim(), priority: `${M.before.priority} → ${M.after.priority}`, direction: M.direction > 0 ? 'stricter' : M.direction < 0 ? 'looser' : 'unchanged'};
        reading.whatIf = {...extra.move, summary: describeTuning(M), arithmetic: M.budget?.text || '', counts: M.counts,
          reaches: M.effects.filter(e => e.state !== 'holds').slice(0, 8).map(e => `${e.ref} (${e.kind}): ${e.state}${e.was && e.was !== e.state ? ', was ' + e.was : ''} — ${clip(e.why, 140)}`),
          suggestedTactics: M.suggested.map(x => x.tactic.name).slice(0, 5), pullsAgainst: M.tradeoffs.map(x => x.with).slice(0, 4)};
        tactics = uniq([...M.suggested.map(x => x.tactic.name), ...tactics]);
      }
    }
  } else if (t.type === 'responsibility') {
    reading.answersFor = list(p.quality?.drivers).filter(d => list(d.responsibilityIds).includes(r.id)).map(d => `${d.id} ${d.priority} ${clip(d.title, 60)}`);
    drivers = list(p.quality?.drivers).filter(d => list(d.responsibilityIds).includes(r.id)).map(d => d.id);
  } else if (t.type === 'realisation') {
    let C = null;
    try { C = list(r.options).length > 1 ? choiceReading(p, r.id) : null; } catch { C = null; }
    reading.options = list(r.options).slice(0, 6).map(o => `${o.id} ${clip(o.product || o.title, 60)}${o.version ? ' ' + o.version : ''}${o.operatingModel ? ' · ' + o.operatingModel : ''}`);
    if (C) reading.weighing = {reading: clip(C.reading, 400), lean: C.leanRecorded || C.leanAll || null, criteria: C.criteria.map(c => `${c.id} (weight ${c.weight})`).slice(0, 6), scores: C.options.map(o => `${o.option.id}: ${o.score}`)};
    if (list(r.options).length > 1) { preferred = list(r.options).map(o => o.id); names = Object.fromEntries(list(r.options).map(o => [o.id, clip(o.product || o.title, 80)])); }
    try { drivers = (specFor(R, r.id)?.drivers || []).map(d => d.id); } catch { drivers = []; }
  } else if (t.type === 'contract') {
    reading.between = `${nameOf(p, r.from)} → ${nameOf(p, r.to)}`;
    reading.carries = list(r.exchanges).map(x => `${x.role}: ${nameOf(p, x.dataId)}`);
  } else if (t.type === 'threat' || t.type === 'control') {
    const ctrls = t.type === 'threat' ? list(p.security?.controls).filter(c => list(c.threatIds).includes(r.id)) : [];
    if (t.type === 'threat') reading.coveredBy = ctrls.map(c => `${c.ref} ${clip(c.title, 60)}: ${c.mechanism ? 'mechanism recorded' : 'no mechanism recorded'}`);
    else reading.mitigates = list(p.security?.threats).filter(x => list(r.threatIds).includes(x.id)).map(x => `${x.ref} ${clip(x.title, 70)} (${x.priority})`);
    reading.targets = list(r.targetIds).map(x => nameOf(p, x));
  }
  if (kind === 'exposure') {
    const targets = exposureTargets(p, t), ids = new Set(targets.map(x => x.id));
    const threats = list(p.security?.threats).filter(x => list(x.targetIds).some(y => ids.has(y)));
    reading.threatsRecorded = threats.map(x => `${x.ref} ${clip(x.title, 70)} (${x.category}, ${x.priority}) on ${list(x.targetIds).filter(y => ids.has(y)).join(', ')}`);
    reading.controlsRecorded = list(p.security?.controls).filter(c => list(c.targetIds).some(y => ids.has(y))).map(c => `${c.ref} ${clip(c.title, 60)}${c.mechanism ? '' : ' (no mechanism recorded)'}`);
    if (t.type === 'data') reading.classification = r.classification || 'not recorded';
    if (t.type === 'contract') reading.authorization = r.authorization || 'not recorded';
    proposals = {kind: 'threat', targets, categories: THREAT_CATEGORIES, priorities: THREAT_PRIORITIES};
    names = Object.fromEntries(targets.map(x => [x.id, `${x.ref} ${x.title}`.trim()]));
  }
  // A move is the subject of its reading: it comes straight after the record.
  if (kind === 'whatif' && reading.whatIf) { const {record, whatIf, ...rest} = reading; for (const k of Object.keys(reading)) delete reading[k]; Object.assign(reading, {record, whatIf, ...rest}); }
  if (!drivers.length) { try { drivers = (specFor(R, r.id)?.drivers || []).map(d => d.id); } catch { drivers = []; } }
  drivers = uniq([...drivers, ...rows.flatMap(x => list(x.drivers).map(d => d.id))]);
  const knobs = kind === 'record' ? T.knobs.map(k => ({...k, value: k.type === 'number' ? (str(r[k.key]) === '' ? '' : Number(r[k.key])) : str(r[k.key])})) : [];
  const vitals = uniq(list(reading.vitals).length ? cells.filter(c => c.key[2] !== 'ok').map(c => VITALS.find(v => v.label === c.vital)?.id).filter(Boolean) : []);
  const key = {record: signature(r), kind, move: extra.move || null, checks: checks.map(c => [c.chapter, c.level, c.title]), vitals: cells.map(c => c.key), lean: reading.weighing?.lean || null};
  return {q, type: t.type, record: r, kind, chapter: q.chapter, reading, knobs, rows, drivers, tactics, vitals, names, preferred, proposals, products: productsFor(p, R, t), key};
}
const signature = r => { const {history, review, sourceSnapshot, updatedAt, ...rest} = r || {}; return rest; };

export function chapterStamp(p, id, opts = {}) {
  try { const x = chapterReading(p, id, opts); return x ? digest(x.key) : null; } catch { return null; }
}
export function chapterTitle(p, id, values = {}) {
  if (String(id).startsWith('D:')) { const d = findRecord(p, id.slice(2)); return d ? `${d.record.id} · ${d.record.question}` : id; }
  const q = parseTarget(id), t = q ? findRecord(p, q.objectId) : null;
  if (!t) return id;
  if (q.variant === 'whatif') { const v = whatIfValues(values), r = t.record; return `${r.id} · What if ${r.operator || ''} ${v.targetValue ?? r.targetValue} ${r.unit || ''}${v.priority && v.priority !== r.priority ? ', ' + v.priority : ''}`.replace(/\s+/g, ' ').trim(); }
  return q.chapter === 9 && EXPOSED.includes(t.type) ? `${refOf(t.record)} · what could go wrong` : refOf(t.record);
}

// ---------------------------------------------------------------- decide: the chapter's own change command

const json = x => JSON.parse(JSON.stringify(x));
export function chapterCommands(p, id, changes) {
  const q = parseTarget(id), t = q ? findRecord(p, q.objectId) : null;
  if (!t || !RECORD_TYPES[t.type] || q.variant) throw Error('Sol’s refinements apply to a chapter record.');
  const T = RECORD_TYPES[t.type], keys = new Set(T.knobs.map(k => k.key)), r = t.record;
  const set = Object.fromEntries(Object.entries(changes || {}).filter(([k]) => keys.has(k)).map(([k, v]) => [k, T.knobs.find(x => x.key === k).type === 'number' ? (v === '' || v == null ? '' : Number(v)) : str(v)]));
  if (!Object.keys(set).length) throw Error('Nothing to change: Sol’s refinements name none of the record’s fields.');
  const base = {...json(signature(r)), ...set};
  if (t.type === 'contract') base.exchanges = list(r.exchanges).map(x => ({dataId: x.dataId, role: x.role}));
  // The relations a chapter's editor saves with the record, so an edit of its words keeps them.
  if (t.type === 'realisation') base.mappings = list(p.technologyRealisation?.mappings).filter(m => m.realizationId === r.id).map(m => ({capabilityId: m.capabilityId, scope: m.scope}));
  if (t.type === 'component') base.allocations = list(p.logical?.mappings).filter(m => m.physicalId === r.id).map(m => ({logicalId: m.logicalId, scope: m.scope}));
  if (t.type === 'capability') base.mappings = list(p.technology?.mappings).filter(m => m.capabilityId === r.id).map(m => ({needId: m.needId, scope: m.scope}));
  return [{type: T.command, payload: base}];
}
// The instruments read the design again with the changes: which checks clear or appear, which
// vitals move. This is what makes a proposed number only as good as the arithmetic that checks it.
export function chapterReread(p, id, commands) {
  let q = p;
  for (const c of commands) q = applyCanonical(q, c, 'preview').document;
  const a = chapterReading(p, id), b = chapterReading(q, id);
  if (!a || !b) return {cleared: [], raised: [], moved: [], same: true};
  const titles = x => new Map(list(x.reading.checks).map(c => [c.chapter + '|' + c.title, c]));
  const A = titles(a), B = titles(b);
  const cleared = [...A].filter(([k]) => !B.has(k)).map(([, c]) => c.title), raised = [...B].filter(([k]) => !A.has(k)).map(([, c]) => c.title);
  const cell = x => new Map(x.rows.flatMap(row => list(row.vitals).filter(v => v.state !== 'na').map(v => [row.ref + '|' + v.vital, {ref: row.ref, vital: vitalLabel(v.vital), state: v.state}])));
  const CA = cell(a), CB = cell(b);
  const moved = [...CB].filter(([k, v]) => CA.has(k) && CA.get(k).state !== v.state).map(([k, v]) => ({ref: v.ref, vital: v.vital, from: VSTATE[CA.get(k).state].label, to: VSTATE[v.state].label, better: RANK[v.state] > RANK[CA.get(k).state]}));
  return {cleared, raised, moved, same: !cleared.length && !raised.length && !moved.length};
}
export function describeReread(x, {numeric = false} = {}) {
  if (!x) return '';
  if (x.same) return numeric ? 'The checks and vitals read the same with them: the new numbers do not change what the instruments find.' : 'The checks and vitals read the same with them: the refinements make the record clearer without changing what the instruments measure.';
  const parts = [];
  if (x.cleared.length) parts.push(`${x.cleared.length} check${x.cleared.length === 1 ? ' clears' : 's clear'} (${x.cleared.slice(0, 3).join('; ')}${x.cleared.length > 3 ? '; …' : ''})`);
  if (x.raised.length) parts.push(`${x.raised.length} new check${x.raised.length === 1 ? '' : 's'} (${x.raised.slice(0, 3).join('; ')})`);
  for (const m of x.moved.slice(0, 4)) parts.push(`${m.ref} ${m.vital.toLowerCase()}: ${m.from.toLowerCase()} → ${m.to.toLowerCase()}`);
  return `Read again with them: ${parts.join('; ')}.`;
}

// ---------------------------------------------------------------- Sol's round of a chapter

// The chapter's own records with the most open checks, for a round of advice when nothing is selected.
export function chapterRound(p, chapter, n = 6) {
  chapter = Number(chapter);
  const types = chapter === 3 ? ['decision'] : Object.entries(RECORD_TYPES).filter(([, T]) => T.chapter === chapter).map(([k]) => k);
  if (!types.length) return [];
  const records = types.flatMap(type => list(type === 'decision' ? p?.decisions?.records : RECORD_TYPES[type].coll(p)).map(r => ({type, r})));
  const score = new Map();
  for (const f of findingsOf(p)) if (['error', 'warning'].includes(f.level)) score.set(f.objectId, (score.get(f.objectId) || 0) + (f.level === 'error' ? 2 : 1));
  const weight = x => (score.get(x.r.id) || 0) + (x.type === 'driver' ? (PRIORITY_WEIGHT[x.r.priority] || 0) / 10 : 0);
  return records.filter(x => weight(x) > 0).sort((a, b) => weight(b) - weight(a) || String(a.r.ref || a.r.id).localeCompare(String(b.r.ref || b.r.id))).slice(0, n).map(x => x.type === 'decision' ? 'D:' + x.r.id : `M:${chapter}:${x.r.id}`);
}

// A reading made to fit its share of the packet: the least telling parts go first, the record's
// own fields, its checks and its vitals last.
export function fitReading(reading, max) {
  const r = structuredClone(reading), size = () => JSON.stringify(r).length;
  const steps = [
    () => { if (r.specification) { delete r.specification.capabilities; delete r.specification.plans; } },
    () => { delete r.pullsAgainst; if (r.tactics) delete r.tactics.open; if (r.whatIf) delete r.whatIf.pullsAgainst; },
    () => { for (const k of Object.keys(r)) if (Array.isArray(r[k]) && r[k].length > 5) r[k] = r[k].slice(0, 5); },
    () => { if (r.checks) r.checks = r.checks.map(c => ({...c, detail: clip(c.detail, 80)})); if (r.vitals) r.vitals = r.vitals.map(v => ({...v, why: clip(v.why, 90)})); },
    () => { delete r.specification; delete r.carriedBy; delete r.weighing?.criteria; },
    () => { for (const k of Object.keys(r.recorded || {})) if (typeof r.recorded[k] === 'string') r.recorded[k] = clip(r.recorded[k], 110); },
    () => { if (r.checks) r.checks = r.checks.slice(0, 4).map(({detail, ...c}) => c); if (r.vitals) r.vitals = r.vitals.slice(0, 4).map(({why, ...v}) => v); },
    () => { delete r.notRecorded; delete r.tactics; },
    () => { for (const k of Object.keys(r.recorded || {})) if (typeof r.recorded[k] === 'string') r.recorded[k] = clip(r.recorded[k], 60); if (r.chapterReads) r.chapterReads = clip(r.chapterReads, 200); if (r.checks) r.checks = r.checks.slice(0, 3); if (r.vitals) r.vitals = r.vitals.slice(0, 3); },
    () => { for (const k of Object.keys(r)) if (!['record', 'recorded', 'chapterReads', 'checks', 'vitals', 'whatIf', 'advice', 'architectDisagreed', 'architectDid', 'withdrawnSince'].includes(k)) delete r[k]; },
    () => { for (const k of Object.keys(r.recorded || {})) if (typeof r.recorded[k] === 'string') r.recorded[k] = clip(r.recorded[k], 40); if (r.vitals) r.vitals = r.vitals.map(v => ({part: v.part, vital: v.vital, state: v.state})); }
  ];
  for (const step of steps) { if (size() <= max) break; step(); }
  return r;
}
