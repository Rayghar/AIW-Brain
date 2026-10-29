// The design questions a record faces (rc39, PLAN §4.2): a projection over the canonical project that reads, for a
// component, a technology capability or a technology realization, the drivers reaching it (driver-scope.js), the
// design questions those drivers open (pattern-dna.js), what already answers each question (an architecture task the
// Companion ran, a Chapter 3 decision, a Chapter 6 need and its capability, a Chapter 7 selection, a Chapter 8 contract
// policy, a Chapter 9 control, a Chapter 10 plan) with its state, and the one-line story of a decided question. It is a
// reading for the Work tab's record card, the driver card, Validate's rule, Sol's packet and the Model's Drivers lens.
// Pure and memoised through the document memo; nothing here writes the document, approves or scores.
import {remember} from './document-memo.js';
import {driversForComponent} from './driver-scope.js';
import {driverKind, targetText, targetIsMeasurable, driverPriority} from './quality-domain.js';
import {READ_OPTIONS} from './read-design-knowledge.js';
import {PERSISTENCE_OPTIONS} from './persistence-knowledge.js';
import {COMPOSITION_TOPICS} from './composition-knowledge.js';
import {INTERACTION_OPTIONS} from './interaction-knowledge.js';
import {DESIGN_QUESTIONS, RECORD_FACTS, targetShape, driverOpens, attributeOf, questionKnowledge} from './pattern-dna.js';

const list = x => Array.isArray(x) ? x : [];
const text = x => typeof x === 'string' ? x.trim() : '';
const stated = x => { const t = text(x); return !!t && !/^(unspecified|not stated|unknown)$/i.test(t); };
const CHAPTERS = {component: 5, capability: 6, realization: 7};

// Every method option by id, for the title an answered task carries.
const OPTION_TITLES = new Map([...READ_OPTIONS, ...PERSISTENCE_OPTIONS, ...INTERACTION_OPTIONS, ...Object.values(COMPOSITION_TOPICS).flatMap(t => t.options)].map(o => [o.id, o.title]));
export const optionTitle = id => OPTION_TITLES.get(id) || id || '';

// A driver as the questions read it: its kind, playbook attribute, target shape and priority.
export function driverReading(d) {
  const kind = driverKind(d), category = kind === 'quality' ? (d.category || d.type || '') : kind;
  return {id: d.id, title: d.title || '', kind, category, shape: kind === 'quality' ? targetShape(d) : null, priority: driverPriority(d), target: kind === 'quality' ? targetText(d) : text(d.description || d.impact), measurable: kind === 'quality' && targetIsMeasurable(d), confirmed: kind === 'quality' ? !!d.targetConfirmed : !!d.confirmed, attribute: kind === 'quality' ? attributeOf(category) : null};
}

// Where a record lives and which components it stands for: a capability stands for the applications whose needs map
// to it, a realization for the applications of the capabilities it realizes. Read from the canonical records here (the
// mappings, needs and components), not through the chapters' domain modules, so that those modules can read this
// projection for their findings without a static import cycle (eslint aiw/no-import-cycle).
function sourcesOfCapabilities(p, caps) {
  const ids = new Set(caps.map(c => c.id)), needIds = new Set(list(p.technology?.mappings).filter(m => ids.has(m.capabilityId)).map(m => m.needId));
  const appIds = [...new Set(list(p.technology?.needs).filter(n => needIds.has(n.id)).map(n => n.applicationId))];
  const components = appIds.map(id => list(p.realisation?.components).find(c => c.id === id)).filter(Boolean);
  const driverIds = new Set(caps.flatMap(c => list(c.driverIds)));
  return {capabilities: caps, applications: components, drivers: list(p.quality?.drivers).filter(d => driverIds.has(d.id))};
}
function locate(p, id) {
  const c = list(p.realisation?.components).find(x => x.id === id);
  if (c) return {kind: 'component', record: c, ref: c.ref || c.id, title: c.title, components: [c]};
  const cap = list(p.technology?.capabilities).find(x => x.id === id);
  if (cap) { const s = sourcesOfCapabilities(p, [cap]); return {kind: 'capability', record: cap, ref: cap.ref || cap.id, title: cap.title, components: s.applications, sources: s}; }
  const tr = list(p.technologyRealisation?.records).find(x => x.id === id);
  if (tr) { const capIds = new Set(list(p.technologyRealisation?.mappings).filter(m => m.realizationId === id).map(m => m.capabilityId)), s = sourcesOfCapabilities(p, list(p.technology?.capabilities).filter(x => capIds.has(x.id))); return {kind: 'realization', record: tr, ref: tr.ref || tr.id, title: tr.title, components: s.applications, sources: s}; }
  return null;
}

// The drivers reaching a record, through the driver scope (components) or the record's sources (capabilities, realizations).
function reachingDrivers(p, at) {
  const seen = new Map();
  const add = d => { if (d && !seen.has(d.id)) seen.set(d.id, d); };
  if (at.kind === 'component') driversForComponent(p, at.record.id).forEach(add);
  else { list(at.sources?.drivers).forEach(add); at.components.forEach(c => driversForComponent(p, c.id).forEach(add)); }
  return [...seen.values()].map(driverReading);
}

// The record's facts, three-valued: true, false, or null when the model does not say (RECORD_FACTS has the words).
function componentFacts(p, c) {
  const parties = new Set(list(p.interfaces?.parties).map(x => x.id)), contracts = list(p.interfaces?.contracts), links = list(p.realisation?.connections), data = list(p.interfaces?.data);
  const owns = data.filter(d => d.authorityId === c.id), into = contracts.filter(k => k.to === c.id), out = contracts.filter(k => k.from === c.id);
  const sync = x => !x.interaction || x.interaction === 'sync', async = x => x.interaction === 'async' || x.interaction === 'event' || x.kind === 'event' || x.kind === 'batch';
  const outLinks = links.filter(l => l.from === c.id), inLinks = links.filter(l => l.to === c.id);
  const known = (p.interfaces?.contracts?.length || links.length) > 0;
  return {
    reads: list(c.dataIds).length + list(c.consumesDataIds).length > 0 || owns.length > 0 ? true : known ? false : null,
    writes: owns.length > 0 || list(c.producesDataIds).length > 0 ? true : data.length ? false : null,
    remote: outLinks.some(sync) || out.some(k => k.kind === 'request') ? true : known ? false : null,
    exposed: into.some(k => parties.has(k.from)) || inLinks.some(l => parties.has(l.from)) ? true : known ? false : null,
    handsOff: outLinks.some(async) || out.some(async) || links.some(l => l.from === c.id && list(p.realisation?.components).find(x => x.id === l.to)?.kind === 'queue') ? true : known ? false : null,
    stateful: owns.length > 0 || c.kind === 'store' ? true : data.length ? false : null,
    worker: c.kind === 'worker' || c.kind === 'queue'
  };
}
function recordFacts(p, at) {
  if (at.kind === 'component') return componentFacts(p, at.record);
  const all = at.components.map(c => componentFacts(p, c)), facts = {};
  for (const k of Object.keys(RECORD_FACTS)) facts[k] = all.some(f => f[k] === true) ? true : all.every(f => f[k] === false) && all.length ? false : null;
  return facts;
}

// What already answers a question for the record, read from the canonical records in order of authority.
const taskTouches = (t, ids) => list(t.basis?.contextIds).some(id => ids.has(id)) || ['callerId', 'processorId', 'storeId', 'queueId', 'consumerId', 'routerId', 'secondaryId'].some(k => ids.has(t.answers?.[k]));
function answersFor(p, q, at, drivers) {
  const ids = new Set(at.components.map(c => c.id)); if (at.kind !== 'component') ids.add(at.record.id);
  const out = [], push = (kind, ref, title, state, chapter, extra = {}) => out.push({kind, ref, title, state, chapter, ...extra});
  const needs = list(p.technology?.needs).filter(n => ids.has(n.applicationId)), mappings = list(p.technology?.mappings), caps = list(p.technology?.capabilities), trs = list(p.technologyRealisation?.records), trMaps = list(p.technologyRealisation?.mappings);
  for (const a of q.answers) {
    const [what, arg] = a.split(':');
    if (what === 'task') for (const t of list(p.coauthoring?.designTasks)) {
      if (t.status === 'dismissed' || !taskTouches(t, ids)) continue;
      const topic = t.topic || (t.kind === 'architecture' ? 'interaction' : t.kind || '');
      if (topic !== arg) continue;
      push('task', t.id, t.optionId ? optionTitle(t.optionId) : t.title || t.id, t.status === 'applied' ? 'decided' : 'draft', 5, {optionId: t.optionId || null, topic});
    }
    if (what === 'need') for (const n of needs.filter(n => n.category === arg)) {
      const m = mappings.find(m => m.needId === n.id), cap = m ? caps.find(c => c.id === m.capabilityId) : null;
      if (cap) push('need', n.id, cap.title, n.confirmed ? 'decided' : 'draft', 6, {capabilityId: cap.id});
    }
    if (what === 'realization') for (const n of needs.filter(n => n.category === arg)) {
      const m = mappings.find(m => m.needId === n.id); if (!m) continue;
      for (const rm of trMaps.filter(x => x.capabilityId === m.capabilityId)) { const tr = trs.find(x => x.id === rm.realizationId); if (!tr) continue; const o = list(tr.options).find(x => x.id === tr.selectedOptionId); if (o) push('realization', tr.ref || tr.id, o.product || o.title, 'decided', 7, {product: o.product || ''}); else if (list(tr.options).length) push('realization', tr.ref || tr.id, tr.title, 'draft', 7); }
    }
    if (what === 'contract') for (const k of list(p.interfaces?.contracts).filter(k => ids.has(k.to))) {
      if (arg === 'timeout' && stated(k.timeoutMs)) push('contract', k.ref || k.id, `${k.title}: ${k.timeoutMs} ms`, k.timeoutConfirmed ? 'decided' : 'draft', 8);
      if (arg === 'idempotency' && (stated(k.idempotencyKey) || stated(k.duplicatePolicy))) push('contract', k.ref || k.id, `${k.title}: ${stated(k.idempotencyKey) ? 'key ' + k.idempotencyKey : k.duplicatePolicy}`, 'decided', 8);
      if (arg === 'admission' && /rate.?limit|throttl|admission|backlog/i.test([k.failurePolicy, k.retryPolicy, k.purpose].join(' '))) push('contract', k.ref || k.id, k.title, 'draft', 8);
    }
    if (what === 'decision') for (const d of list(p.decisions?.records)) {
      if (d.topic !== arg || !list(d.driverIds).some(id => drivers.some(x => x.id === id))) continue;
      const alt = list(d.alternatives).find(x => x.id === d.selectedAlternativeId);
      push('decision', d.id, alt ? alt.title : d.question || d.id, alt ? 'decided' : 'draft', 3);
    }
    if (what === 'control') for (const c of list(p.security?.controls).filter(c => list(c.targetIds).some(id => ids.has(id)))) push('control', c.ref || c.id, c.title, stated(c.failureMode) && stated(c.enforcement) ? 'decided' : 'draft', 9);
    if (what === 'plan') for (const r of list(p.runtime?.plans).filter(r => ids.has(r.assetId))) push('plan', r.ref || r.id, `${r.title}: ${stated(r.recoveryStrategy) ? r.recoveryStrategy : 'recovery not chosen'}`, stated(r.recoveryStrategy) ? 'decided' : 'draft', 10);
  }
  return out;
}

const stateOf = answers => answers.some(a => a.state === 'decided') ? 'decided' : answers.some(a => a.state === 'draft') ? 'draft' : 'open';
const names = ds => ds.map(d => d.id).join(', ');

// A capability or realization answers the questions of its category (a caching capability answers the read path for
// the components whose caching need maps to it); it does not carry every question of every application it serves.
function categoriesOf(p, at) {
  if (at.kind === 'capability') return [at.record.category].filter(Boolean);
  if (at.kind === 'realization') return [...new Set(list(at.sources?.capabilities).map(c => c.category).filter(Boolean))];
  return null;
}
function questionsOf(p, id) {
  const at = locate(p, id); if (!at) return null;
  const drivers = reachingDrivers(p, at), facts = recordFacts(p, at), questions = [], categories = categoriesOf(p, at);
  for (const q of DESIGN_QUESTIONS) {
    if (categories && !q.answers.some(a => { const [what, arg] = a.split(':'); return (what === 'need' || what === 'realization') && categories.includes(arg); })) continue;
    const because = drivers.filter(d => driverOpens(q, d)); if (!because.length) continue;
    const required = list(q.trigger.facts), unknown = required.filter(f => facts[f] == null), denied = required.filter(f => facts[f] === false);
    if (denied.length) continue;
    const answers = answersFor(p, q, at, because), state = stateOf(answers), decided = answers.find(a => a.state === 'decided');
    questions.push({id: q.id, title: q.title, question: q.question, chapter: q.chapter, state, toConfirm: unknown.map(f => RECORD_FACTS[f]), because: because.map(d => d.id), answers, decide: q.decide, products: q.products, caution: q.caution,
      story: decided ? `${decided.title} for ${at.ref}, because ${names(because)}${decided.ref ? ` (${decided.ref})` : ''}.` : ''});
  }
  const counts = {open: 0, draft: 0, decided: 0}; for (const q of questions) counts[q.state]++;
  return {id, ref: at.ref, title: at.title, kind: at.kind, chapter: CHAPTERS[at.kind], drivers, facts, questions, counts};
}

// The Validate rule of Chapters 5, 6 and 7 (rc39, PLAN §4.3.3): "A driver asks a design question no decision answers",
// one finding per open question per record (one code, so the frame rolls them into one cause; the id keeps the chapters'
// rule:record shape the registers and the anatomy read, the rule part naming the question: design-question/<question>:<record>),
// level warning (to confirm in the frame), its object the record, its detail
// the question's title and the drivers that ask it. Each chapter's findings function calls this with its own `add`, so
// the frame, its counts, causes and actions carry the rule as they carry every other.
export const DESIGN_QUESTION_RULE = 'A driver asks a design question no decision answers';
export function designQuestionFindings(r, add) {
  if (!r) return;
  for (const q of r.questions) if (q.state === 'open') add('design-question', r.id, DESIGN_QUESTION_RULE, q.title + ' · asked by ' + q.because.join(', ') + ' of ' + r.ref + '. Decide it on the record card (Design basis) or record the answer in Chapter ' + q.chapter + '.', 'warning', {id: 'design-question/' + q.id + ':' + r.id, questionId: q.id, driverIds: q.because});
}
// The questions a record faces, with their state and answers. Null for an id that is not a component, capability or realization.
export function designQuestions(p, id) { return remember(p, 'design-questions', 'record:' + id, () => questionsOf(p, id)); }

// What one driver asks of the design: its attribute and tactics, the questions it opens and the records they land on.
export function driverQuestions(p, driverId) {
  return remember(p, 'design-questions', 'driver:' + driverId, () => {
    const d = list(p.quality?.drivers).find(x => x.id === driverId); if (!d) return null;
    const reading = driverReading(d), opened = DESIGN_QUESTIONS.filter(q => driverOpens(q, reading));
    const lands = new Map(opened.map(q => [q.id, []]));
    for (const c of list(p.realisation?.components)) { const r = designQuestions(p, c.id); if (!r) continue; for (const q of r.questions) if (q.because.includes(driverId) && lands.has(q.id)) lands.get(q.id).push({id: c.id, ref: r.ref, title: r.title, state: q.state}); }
    const questions = opened.map(q => ({id: q.id, title: q.title, chapter: q.chapter, lands: lands.get(q.id), knowledge: questionKnowledge(q.id)}));
    const counts = {open: 0, draft: 0, decided: 0}; for (const q of questions) for (const l of q.lands) counts[l.state]++;
    return {driver: reading, questions, counts};
  });
}

// The whole project: per record its drivers and question counts, totals per chapter, for Validate and the Model lens.
export function projectQuestions(p) {
  return remember(p, 'design-questions', 'project', () => {
    const records = [], byChapter = {};
    const ids = [...list(p.realisation?.components), ...list(p.technology?.capabilities), ...list(p.technologyRealisation?.records)].map(r => r.id);
    for (const id of ids) {
      const r = designQuestions(p, id); if (!r) continue;
      records.push({id, ref: r.ref, title: r.title, chapter: r.chapter, driverIds: r.drivers.map(d => d.id), ...r.counts, state: r.counts.open ? 'open' : r.counts.draft ? 'draft' : r.counts.decided ? 'decided' : 'none'});
      const c = byChapter[r.chapter] ||= {open: 0, draft: 0, decided: 0}; c.open += r.counts.open; c.draft += r.counts.draft; c.decided += r.counts.decided;
    }
    const totals = {open: 0, draft: 0, decided: 0}; for (const c of Object.values(byChapter)) for (const k of Object.keys(totals)) totals[k] += c[k];
    return {records, byChapter, totals};
  });
}

// For a driver on the Model's Drivers lens: the element ids it reaches with their state.
export function driverReach(p, driverId) {
  const q = projectQuestions(p), out = new Map();
  for (const r of q.records) if (r.driverIds.includes(driverId)) { const d = designQuestions(p, r.id); const mine = d.questions.filter(x => x.because.includes(driverId)); out.set(r.id, mine.some(x => x.state === 'open') ? 'open' : mine.some(x => x.state === 'draft') ? 'draft' : mine.length ? 'decided' : 'none'); }
  return out;
}
