import {REASONING_INSTRUCTIONS_PIN} from './reasoning-instructions-pin.js';
// The AIW Brain at a decision: Sense → Recall → Reason → Refine → Review → Record.
//
// Sense. The desk's instruments read the design — vitals, the arithmetic behind them, drafted fixes
//   and what each would change, product weighings, a decision's alternatives against its drivers.
//   They measure; they never decide.
// Recall. The Brain gathers what is known about those readings: the quality drivers they answer to,
//   the planning assumptions, the SA Playbook's tactics for the vitals concerned, the documented
//   mechanisms of the products involved, and the project's governed claims and methods — each with
//   its receipt, and only while its pack or release is not withdrawn.
// Reason. Sol — the LLM — reads that packet as the attending architect and assesses every decision:
//   apply the draft, refine it, reconsider the approach, or put the judgement to the architect with
//   options, questions and, for a threat nobody has recorded, proposed threat scenarios.
// Refine. Sol may rewrite a draft's wording and propose different numbers within each knob's bounds;
//   the instruments then re-read the design with them, so a number is only ever as good as the
//   arithmetic that checks it.
// Review. Every assessment is checked twice before it is shown: deterministically (its structure,
//   its citations, no number the readings do not contain, no guarantee of a verified outcome) and
//   by a second model pass against the same packet. What fails is withheld and the reading stands.
// Record. Nothing Sol says changes the design. The architect uses a refinement, applies the draft
//   through the chapter's change review, or dismisses the advice with a reason; each outcome is kept
//   with the sources it rested on, for the SDD and for the knowledge stewards.
//
// The same loop runs in every chapter model (chapter-reasoning.js): a chapter's selected record is a
// decision point like a drafted fix, read by that chapter's own model, checks and the desk's vitals.
// And it learns (knowledge-stewardship.js): the stewards' decisions about disagreements are decision
// points too, and what they capture, release and link to a record is read with that record from then on.
//
// Pure: packets, schemas, validation, guards, fallbacks and adoption. The provider call lives in
// intelligence-provider.js; the routes in intelligence-service.js.
import {deskModel, decisionProbe} from './desk-model.js';
import {redactSecrets} from './secret-redaction.js';
import {fixDrafts, simulate, describeCommands, describeEffect, valuesOf} from './desk-fixes.js';
import {VITALS, VSTATE, deskSource, vitalLabel} from './desk-vitals.js';
import {chapterReading, chapterStamp, chapterTitle, fitReading, whatIfValues, chapterCommands, chapterReread, describeReread,findRecord} from './chapter-reasoning.js';
import {stewardshipReading, stewardshipStamp, learnedFor, assessmentObject, assessmentsOf, stewardQueue} from './knowledge-stewardship.js';
import {claimReceipt, knowledgeState} from './knowledge-governance.js';
import {ASSUMPTIONS} from './desk-capacity.js';
import {TACTICS} from './playbook-knowledge.js';
import {traitsFor} from './product-knowledge.js';
import {productMechanisms} from './product-applicability.js';
import {tacticReceipt, traitReceipt, playbookAvailable, productsAvailable, modelReceiptCurrent, modelKnowledgeState} from './model-knowledge.js';
import {brainContext} from './aiw-brain.js';
import {architectureBrain, brainSources, brainSourceCurrent, BRAIN_ENGINE, BRAIN_POLICY} from './architecture-brain.js';
import {THREAT_CATEGORIES, PRIORITIES} from './security-domain.js';
import {digest} from './brain-integrity.js';
import {list, num, uniq} from './util.js';
import {disclosureSourceExcluded, hideExcludedReferences,packArchitectureIntelligence,containsExcludedRecord} from './intelligence-context.js';
import {architectureClaimScope, architectureKnowledgeSnapshot} from './architecture-knowledge.js';
import {architectureContext,architectureIntelligence,architectureIntelligenceCurrent} from './architecture-intelligence.js';
import {driverKind,isQualityDriver} from './quality-domain.js';
import {changeFingerprint} from './changes-domain.js';

export const REASONING_TASK = 'decisions';
export const REASONING_VERSION = 1;
export const MAX_DECISIONS = 8;
const MAX_SOURCES = 22, MAX_CHARS = 28000, ITEM_CHARS = 2200;
const text = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
const mask = s => String(s).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email redacted]').replace(/(?<![\w.-])\+?\d[\d ()-]{8,}\d(?![\w.-])/g, '[phone-like value redacted]');

export const VERDICTS = {
  apply: {label: 'Apply as drafted', short: 'Apply'},
  refine: {label: 'Apply with Sol’s refinements', short: 'Refine'},
  reconsider: {label: 'Reconsider the approach', short: 'Reconsider'},
  judge: {label: 'Your judgement, with Sol’s input', short: 'Your call'},
  insufficient: {label: 'Not enough evidence to advise', short: 'Needs evidence'}
};
// What a verdict means depends on what is being decided: a draft is applied, a record is sound as it
// stands, a move explored in What if holds up, a part seen from Chapter 9 is covered by what is recorded.
const KIND_VERDICTS = {
  record: {apply: {label: 'Sound as recorded', short: 'Sound'}, refine: {label: 'Refine it with Sol’s wording', short: 'Refine'}},
  whatif: {apply: {label: 'The move holds up', short: 'Holds up'}},
  exposure: {apply: {label: 'Covered by what is recorded', short: 'Covered'}},
  stewardship: {apply: {label: 'Capture it as project knowledge', short: 'Capture'}, refine: {label: 'Capture it, in Sol’s words', short: 'Capture, reworded'}, reconsider: {label: 'The advice may still hold', short: 'Reconsider'}},
  'stewardship-impact': {apply: {label: 'The change still holds', short: 'Holds'}, reconsider: {label: 'Revisit the change', short: 'Revisit'}}
};
export const verdictText = (kind, verdict) => KIND_VERDICTS[kind]?.[verdict] || VERDICTS[verdict] || {label: verdict, short: verdict};
const ALLOWED = {fix: ['apply', 'refine', 'reconsider', 'insufficient'], switch: ['apply', 'refine', 'reconsider', 'insufficient'], judgement: ['judge', 'reconsider', 'insufficient'], decision: ['judge', 'reconsider', 'insufficient'],
  record: ['apply', 'refine', 'reconsider', 'judge', 'insufficient'], whatif: ['apply', 'reconsider', 'judge', 'insufficient'], exposure: ['apply', 'judge', 'reconsider', 'insufficient'],
  stewardship: ['apply', 'refine', 'reconsider', 'judge', 'insufficient'], 'stewardship-impact': ['apply', 'reconsider', 'judge', 'insufficient']};
const DESK_ID = /^[FJD]:/;

// ---------------------------------------------------------------- the request

export const EXAMPLE_REFUSAL = 'Sol reasons over this project\'s own load, not the SA Playbook\'s example. Reset the exploration, or save the review objective, and ask again.';
function normaliseObjective(o) {
  if (!o || typeof o !== 'object') return null;
  const assumptions = {};
  for (const a of ASSUMPTIONS) { const v = o.assumptions?.[a.key]; if (v == null) continue; if (a.options) { if (a.options.some(([k]) => k === v)) assumptions[a.key] = v; } else { const n = num(v); if (n != null && n >= 0 && n <= 1e9) assumptions[a.key] = n; } }
  const perReplica = Object.fromEntries(Object.entries(o.perReplica || {}).slice(0, 50).map(([k, v]) => [text(k, 100), num(v)]).filter(([k, v]) => k && v != null && v > 0 && v <= 1e9));
  // rc41 close (governance): the desk's exploration of the SA Playbook's example ({example: true}, desk-capacity.js
  // capacityObjective, GR-RUN-04) is not this project's load. It outranks a recorded objective there and its figures would
  // reach adopted advice and the SDD unlabelled, so Sol is not asked on it; the person is told why and what to do.
  if (o.example === true) throw Error(EXAMPLE_REFUSAL);
  const value = num(o.value);
  if (!['users', 'rate'].includes(o.kind) || value == null || value <= 0 || value > 1e9) throw Error('Choose a positive objective.');
  return {kind: o.kind, value, assumptions, perReplica, surge: o.surge !== false};
}
function normaliseValues(values, ids) {
  const drafts = new Set(ids.filter(id => id.startsWith('F:')).map(id => id.slice(2))), moves = new Set(ids.filter(id => id.endsWith('|whatif'))), out = {};
  for (const [id, kv] of Object.entries(values || {})) {
    if (moves.has(id)) { out[id] = whatIfValues(kv); continue; }
    if (!drafts.has(id) || !kv || typeof kv !== 'object') continue;
    out[id] = Object.fromEntries(Object.entries(kv).slice(0, 12).map(([k, v]) => [text(k, 100), typeof v === 'number' ? v : text(String(v ?? ''), 2400)]).filter(([k]) => k));
  }
  return out;
}
export function reasoningRequest(raw) {
  if (raw?.task !== REASONING_TASK) throw Error('Choose what Sol should reason about.');
  const ids = uniq(list(raw.ids).map(x => text(x, 160)).filter(Boolean));
  if (!ids.length || ids.length > MAX_DECISIONS) throw Error(`Ask Sol about 1 to ${MAX_DECISIONS} decisions at a time.`);
  if (ids.some(id => !/^(?:[FJD]:[\w:+.|-]{1,150}|M:\d{1,2}:[\w:+.|-]{1,150}|K:SA-\d{3,5}(?:\|withdrawn)?)$/.test(id))) throw Error('Choose decisions from the review desk, a chapter model or the stewards’ queue.');
  const priorRunId=typeof raw.priorRunId==='string'?raw.priorRunId.trim():raw.priorRunId;
  if(priorRunId&&!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(priorRunId))throw Error('Choose a saved response for this follow-up.');
  return {task: REASONING_TASK, ids, scope: text(raw.scope, 100) || ids[0], prompt: text(raw.prompt, 2000), objective: normaliseObjective(raw.objective), values: normaliseValues(raw.values, ids), ...(raw.semantic===true?{semantic:true}:{}),...(priorRunId?{priorRunId}:{})};
}

// ---------------------------------------------------------------- sense: the decisions, as the instruments read them

function cellReading(D, rowId, vital) {
  const row = D.rows.find(r => r.id === rowId), v = row?.vitals.find(x => x.vital === vital);
  return row && v ? {part: `${row.ref} ${row.title}`, runs: row.product || row.kind, vital: vitalLabel(vital), state: VSTATE[v.state].label, recorded: v.value, against: v.target, why: v.why, drivers: list(v.drivers)} : null;
}
function objectsOf(D, row) {
  const R = D.R, reqs = R.contracts.filter(k => (k.kind === 'request' || !k.kind) && (k.from === row.assetId || k.to === row.assetId));
  return uniq([row.assetId, ...reqs.map(k => k.id), ...R.contracts.filter(k => k.kind === 'event' && (k.from === row.assetId || k.to === row.assetId)).map(k => k.id), ...list(row.asset?.dataIds)]);
}
function refOf(p, id) {
  for (const xs of [p?.interfaces?.contracts, p?.interfaces?.data, p?.realisation?.components, p?.technologyRealisation?.records, p?.runtime?.plans]) { const r = list(xs).find(x => x.id === id); if (r) return {id, ref: r.ref || r.id, title: r.title || ''}; }
  return {id, ref: id, title: ''};
}
const clip = (s, n = 300) => { const t = String(s ?? ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

// What identifies a decision as Sol saw it: the cells it aims at, as read, and the draft's own
// commands at its default values (the architect's numbers are advice's subject, not its identity).
const baseCommands = (p, d) => JSON.parse(JSON.stringify(d.build(p, valuesOf(d, {}))));
const cellsOf = (D, d) => d.aims.map(a => { const [r, vt] = a.split(':'); return cellReading(D, r, vt); }).filter(Boolean);
const readingKey = cells => cells.map(c => [c.part, c.vital, c.state, c.recorded, c.against]);
// Product advice is current only for the configuration and applicability it saw.
// Reuse Chapter 7's reading; a name-only summary must not revive excluded support.
const comparisonBasis = C => C ? {criteria:C.criteria.map(c=>[c.id,c.weight,c.hard]),options:C.options.map(o=>({id:o.option.id,product:o.option.product,version:o.option.version,configuration:[o.option.topology,o.option.serviceTier,o.option.replicaCount,o.option.failureDomains,o.option.operatingModel,o.option.configurationFacts],applicability:o.applicability,cells:o.cells.map(c=>[c.crit,c.recorded,c.stale]),mechanisms:o.mechanisms?.map(m=>[m.id,m.src,m.applicability.state,m.applicability.checks])}))} : null;
export function currentStamp(p, D, FX, id, values = null) {
  const rest = id.slice(2);
  if (id.startsWith('M:')) return chapterStamp(p, id, {values: values || {}, D: D && Array.isArray(D.rows) ? D : null});
  if (id.startsWith('K:')) return stewardshipStamp(p, id);
  try {
    if (id.startsWith('F:')) { const d = FX.byId.get(rest); return d ? digest({reading: readingKey(cellsOf(D, d)), base: baseCommands(p, d), title: d.title,...(d.switchPoint?{comparison:comparisonBasis(D.choices?.get(d.target.id))}:{})}) : null; }
    if (id.startsWith('J:')) { const j = FX.judgements.find(x => x.id === rest); if (!j) return null; const c = cellReading(D, j.row, j.vital); return digest({reading: readingKey(c ? [c] : []), text: j.text}); }
    if (id.startsWith('D:')) { const d = list(p.decisions?.records).find(x => x.id === rest); return d ? digest({decision: {...d, history: undefined, sourceSnapshot: undefined}}) : null; }
  } catch { return null; }
  return null;
}
function fixItem(p, D, d, values, objective = null) {
  const v = valuesOf(d, values[d.id]), E = simulate(p, [d], {[d.id]: v}, {before: D, desk: {objective}});
  const base = baseCommands(p, d);
  const reading = cellsOf(D, d);
  const rows = d.rows.map(id => D.rows.find(r => r.id === id)).filter(Boolean);
  const C = d.switchPoint ? D.choices?.get(d.target.id) : null;
  const choice = C ? {realisation: `${C.record.ref} ${C.record.title}`, reading: C.reading, lean: C.leanRecorded || C.leanAll, options: C.options.map(o => ({id: o.option.id, product: o.option.product || o.option.title, operatingModel: o.option.operatingModel, version:o.option.version, topology:o.option.topology, configurationFacts:o.option.configurationFacts||{}, applicability:o.applicability, mechanisms:(o.mechanisms||[]).map(m=>({id:m.id,state:m.applicability.state,reasons:m.applicability.reasons,source:m.src})), score: o.score, recordedScore: o.recordedScore})), ceiling: C.ceiling ? {what: C.ceiling.what, limit: C.ceiling.limit, unit: C.ceiling.unit, demand: C.ceiling.demand, passed: C.ceiling.passed, holds: C.ceiling.holdsText} : null, criteria: C.criteria.map(c => `${c.id} ${c.title} (weight ${c.weight})`), obligations:(C.obligations||[]).map(o=>({id:o.id,action:o.action,evidence:o.evidence,verification:'pending'})),authority:'Applicability reflects the declared configuration. Recorded judgements, proposed effects and measured target outcomes remain separate.'} : null;
  // A switch point is about a Chapter 7 realisation: Sol's recall of what the project knows and has
  // learned anchors on it (its stamp is unchanged, so earlier advice stays current).
  const item = {id: 'F:' + d.id, kind: d.switchPoint ? 'switch' : 'fix', title: d.title, chapter: d.chapter, vital: d.vital, rows: rows.map(r => r.ref), ...(C ? {objectId: C.record.id, objectChapter: 7} : {}),
    reading, choice, draft: {why: d.why, also: d.also || '', arithmetic: list(d.math).slice(0, 6), changes: describeCommands(p, E.commands).flatMap(x => x.fields.map(f => `${x.head} · ${f.label}: ${f.before ? clip(f.before, 80) + ' → ' : ''}${clip(f.after, 160)}`)).slice(0, 8), effect: describeEffect(E, {brief: true}), moves: E.changed.map(c => `${c.ref} ${vitalLabel(c.vital)}: ${VSTATE[c.from].label} → ${VSTATE[c.to].label}`).slice(0, 10)},
    knobs: d.knobs.map(k => ({key: k.key, label: k.label, type: k.type, value: v[k.key], ...(k.type === 'number' ? {min: k.min ?? 0, max: k.max ?? 1e12, step: k.step || 1, unit: k.unit || ''} : {maxLength: k.maxLength || (k.type === 'textarea' ? 2400 : 120)})})),
    products: uniq([...rows.map(r => r.product), ...(choice ? choice.options.map(o => o.product) : [])].filter(Boolean))};
  item.stamp = digest({reading: readingKey(reading), base, title: d.title,...(d.switchPoint?{comparison:comparisonBasis(C)}:{})});
  item.allowed = {verdicts: ALLOWED[item.kind], knobs: item.knobs.map(k => k.key), proposals: null, preferred: null};
  return item;
}
function judgementItem(p, D, j) {
  const row = D.rows.find(r => r.id === j.row), reading = row ? [cellReading(D, row.id, j.vital)].filter(Boolean) : [];
  const threat = j.vital === 'security' && row && reading[0]?.state === VSTATE.none.label;
  const targets = threat ? objectsOf(D, row).map(id => refOf(p, id)) : [];
  const item = {id: 'J:' + j.id, kind: 'judgement', title: `${j.ref} · ${vitalLabel(j.vital)}: needs your judgement`, chapter: j.fix?.chapter || VITALS.find(v => v.id === j.vital)?.chapter || 11, vital: j.vital, rows: row ? [row.ref] : [],
    reading, judgement: j.text, fix: j.fix ? j.fix.label : '', knobs: [], products: row?.product ? [row.product] : [],
    proposals: threat ? {kind: 'threat', targets, categories: THREAT_CATEGORIES, priorities: PRIORITIES} : null};
  item.stamp = digest({reading: readingKey(reading), text: j.text});
  item.allowed = {verdicts: ALLOWED.judgement, knobs: [], proposals: threat ? {targets: targets.map(t => t.id)} : null, preferred: null};
  return item;
}
// A chapter's record, as its own model reads it (chapter-reasoning.js).
function recordItem(p, D, id, values) {
  const x = chapterReading(p, id, {values, D});
  if (!x) return null;
  const item = {id, kind: x.kind, title: chapterTitle(p, id, values), chapter: x.chapter, vital: x.vitals[0] || null, vitals: x.vitals, objectId: x.record.id, recordType: x.type, rows: x.rows.map(r => r.ref),
    reading: x.reading, knobs: x.knobs, products: x.products, drivers: x.drivers, tactics: x.tactics, names: x.names, proposals: x.proposals,
    usesObjective: x.rows.length > 0 && ['plan', 'component', 'realisation', 'capability'].includes(x.type)};
  item.stamp = digest(x.key);
  item.allowed = {verdicts: ALLOWED[x.kind], knobs: x.knobs.map(k => k.key), proposals: x.proposals ? {targets: x.proposals.targets.map(t => t.id)} : null, preferred: x.preferred};
  return item;
}
// A stewards' decision: what a disagreement should teach, or whether a change still holds.
function stewardItem(p, id) {
  const x = stewardshipReading(p, id);
  if (!x) return null;
  const item = {id, kind: x.kind, title: x.title, chapter: x.chapter, vital: null, objectId: x.objectId, rows: [], reading: x.reading, knobs: x.knobs, products: [], drivers: [], tactics: [], names: {}, proposals: null, extraSources: x.sources, usesObjective: false};
  item.stamp = digest(x.key);
  item.allowed = {verdicts: ALLOWED[x.kind], knobs: x.knobs.map(k => k.key), proposals: null, preferred: null};
  return item;
}
function decisionItem(p, D, id) {
  const q = decisionProbe(D, id);
  if (!q) return null;
  const d = q.decision;
  const item = {id: 'D:' + id, kind: 'decision', title: `${id} · ${d.question}`, chapter: 3, vital: 'decision', rows: [],
    decision: {question: d.question, context: clip(d.context, 600), status: d.status || 'draft', chosen: d.selectedAlternativeId || null, lean: q.lean || null, drivers: list(d.driverIds),
      alternatives: q.alts.map(a => ({id: a.alt.id, title: a.alt.title, pattern: a.alt.pattern || '', avoid: a.alt.antiPattern || '', consequences: clip(a.alt.consequences, 300), effects: a.effects.map(e => `${e.id} ${e.effect}${e.reason ? ': ' + clip(e.reason, 160) : ''}`)})),
      reaches: `${q.implications.upstream.length} earlier and ${q.implications.downstream.length} later records`},
    knobs: [], products: []};
  item.stamp = digest({decision: {...d, history: undefined, sourceSnapshot: undefined}});
  item.allowed = {verdicts: ALLOWED.decision, knobs: [], proposals: null, preferred: q.alts.map(a => a.alt.id)};
  return item;
}

// Every decision the request names, read from the design as it is now. D and FX may be passed in by
// the desk, which already holds them.
export function decisionPoints(p, req, {D = null, FX = null} = {}) {
  // The desk's own model only when a desk decision is asked about; a chapter record needs the vitals alone.
  const desk = req.ids.some(id => DESK_ID.test(id));
  D ||= desk ? deskModel(p, {objective: req.objective}) : deskSource(p, {objective: req.objective});
  if (desk) FX ||= fixDrafts(D);
  const items = [], missing = [];
  for (const id of req.ids) {
    const rest = id.slice(2);
    let item = null;
    try {
      if (id.startsWith('F:')) { const d = FX.byId.get(rest); if (d) item = fixItem(p, D, d, req.values || {}, req.objective || null); }
      else if (id.startsWith('J:')) { const j = FX.judgements.find(x => x.id === rest); if (j) item = judgementItem(p, D, j); }
      else if (id.startsWith('D:')) item = decisionItem(p, D, rest);
      else if (id.startsWith('M:')) item = recordItem(p, D, id, req.values?.[id] || {});
      else if (id.startsWith('K:')) item = stewardItem(p, id);
    } catch (e) { item = null; }
    if (item) items.push(item); else missing.push(id);
  }
  return {D, FX, items, missing};
}
export const itemStamp = (p, id, opts = {}) => decisionPoints(p, {ids: [id], values: {}, objective: opts.objective || null}, opts).items[0]?.stamp || null;

// ---------------------------------------------------------------- recall: the packet

export function reasoningPacket(p, raw) {
  const request = reasoningRequest(raw), policy = p.workspace?.aiPolicy || {}, excluded = new Set(policy.excludedObjectIds || []);
  const {D, items, missing} = decisionPoints(p, request);
  if (missing.length) throw Error(`The desk no longer holds ${missing.join(', ')}. Read the desk again before asking Sol.`);
  const snapshot=architectureKnowledgeSnapshot(p);
  const recalls=items.map(it=>{const row=D.rows.find(r=>it.rows.includes(r.ref)),objectId=it.objectId||(it.kind==='decision'?it.id.slice(2):row?.id),chapter=it.objectChapter||it.chapter;const query=[request.prompt,it.title,...list(it.products)].filter(Boolean).join(' ');return {it,objectId,chapter,query,scope:architectureClaimScope(p,{objectId,query},snapshot)};});
  const applicableTo=(source,only=null)=>recalls.filter(r=>(!only||only.includes(r.it.id))&&(source.kind!=='governed-claim'||!r.scope.excluded.has(source.receipt?.releaseId+':'+source.receipt?.claimId))).map(r=>r.it.id);
  for (const it of items) {
    const rows = D.rows.filter(r => it.rows.includes(r.ref)),record=findRecord(p,it.objectId||(it.kind==='decision'?it.id.slice(2):''))?.record;
    // A derived comparison can repeat an excluded child's wording after its ID
    // has disappeared. Keep the native reading intact and refuse this broader
    // request; masking an identifier cannot authorize the child's conclusions.
    if ((it.objectId && excluded.has(it.objectId)) || rows.some(r => excluded.has(r.id) || excluded.has(r.assetId)) || containsExcludedRecord(record,excluded) || containsExcludedRecord(it,excluded)) throw Error(`The project disclosure policy excludes ${it.title} or part of its saved comparison from LLM requests. Choose a narrower allowed scope.`);
  }
  const sources = [], seen = new Set(), omissions = [], criticalIds = new Set();
  let chars = 0;
  let withheld = 0, criticalWithheld = 0;
  const add = (s, must = false) => {
    if (seen.has(s.id)) { const existing=sources.find(x=>x.id===s.id);if(existing&&s.applicableTo)existing.applicableTo=uniq([...list(existing.applicableTo),...s.applicableTo]);return existing?.ref||null; }
    seen.add(s.id);
    // The disclosure policy holds for every source, not only for the decisions asked about (audit B-02):
    // an excluded object is never read, and the packet records only how many were held back.
    if (disclosureSourceExcluded(s,excluded) || (s.linkedObjectId && excluded.has(s.linkedObjectId))) { withheld += 1; if(must)criticalWithheld++; return null; }
    if (sources.length >= MAX_SOURCES || chars + s.excerpt.length > MAX_CHARS) { if (must) throw Error('These decisions do not fit in one request. Ask Sol about fewer at a time.'); omissions.push({id: s.id, title: s.title, reason: sources.length >= MAX_SOURCES ? 'source limit' : 'character budget'}); return null; }
    const ref = 'S' + (sources.length + 1); sources.push({...s, ref}); chars += s.excerpt.length; return ref;
  };
  // Sense: one reading for each decision, first. A chapter record's reading is fitted to its share.
  const share = items.length === 1 ? 5200 : items.length <= 3 ? 3400 : 2600;
  for (const it of items) {
    const chapter = /^[MK]:/.test(it.id), knobs = it.knobs.map(k => k.type === 'number' ? k : {...k, value: clip(k.value, !chapter ? 600 : share >= 3400 ? 400 : 160)});
    const proposals = it.proposals ? {kind: 'threat', targets: it.proposals.targets.map(t => `${t.id} (${t.ref} ${t.title})`), categories: it.proposals.categories, priorities: it.proposals.priorities} : undefined;
    const frame = {decision: it.id, kind: it.kind, title: it.title, chapter: it.chapter, parts: it.rows, knobs, options: chapter && it.allowed.preferred ? it.names : undefined, proposals};
    const cap = chapter ? share : ITEM_CHARS;
    const body = JSON.stringify(chapter ? {...frame, reading: fitReading(it.reading, Math.max(600, cap - JSON.stringify(frame).length - 40))} : {...frame, reading: it.reading, choice: it.choice, draft: it.draft, judgement: it.judgement, decision: it.decision});
    it.ref = add(it.id.startsWith('K:')
      ? {id: 'reading:' + it.id, kind: 'stewardship-reading', objectId: it.objectId, title: it.title, posture: 'The project’s record of Sol’s earlier advice, what the architect did with it, and the record as it reads now. The architect’s words are testimony to weigh, not measurement.', versionStamp: it.stamp, excerpt: body.slice(0, cap), truncated: body.length > cap}
      : chapter
      ? {id: 'reading:' + it.id, kind: 'chapter-reading', objectId: it.objectId, title: it.title, posture: `Chapter ${it.chapter}’s reading of its own record: recorded facts, the journey’s checks and the desk’s vitals for the parts it touches — design arithmetic, not measurement.`, versionStamp: it.stamp, excerpt: body.slice(0, cap), truncated: body.length > cap}
      : {id: 'reading:' + it.id, kind: 'instrument-reading', objectId: it.id, title: it.title, posture: 'The review desk’s reading: design arithmetic and recorded facts, not measurement. Drafts are proposals, not decisions.', versionStamp: it.stamp, excerpt: body.slice(0, ITEM_CHARS), truncated: body.length > ITEM_CHARS}, true);
  }
  // Prepare each selected scope once. Source admission below preserves the
  // instruments’ basis, then complete contextual deductions and optional recall.
  const captured = new Set(knowledgeState(p).sources.filter(x => x.origin === 'architect-dismissal').map(x => x.id));
  const recallLists=recalls.map(r=>{
    if(!r.objectId)return [];
    try{
      const c=brainContext(p,{chapter:r.chapter,id:r.objectId});if(c.selected.id==='project')return [];
      const brain=architectureBrain(p,c,{query:r.query,limit:3});
      r.architectureContext=architectureContext(p,{chapter:r.chapter,id:r.objectId});
      r.intelligence=architectureIntelligence(p,{chapter:r.chapter,id:r.objectId},{context:r.architectureContext,prompt:r.query,limit:3});
      return [...brainSources(p,brain),...r.intelligence.sources].filter(s=>!(s.kind==='governed-claim'&&captured.has(s.receipt?.sourceId))).filter(s=>applicableTo(s,[r.it.id]).length).map(s=>({...s,applicableTo:[r.it.id]}));
    }catch{omissions.push({id:'recall:'+r.it.id,title:r.it.title,reason:'Connected knowledge context unavailable; the saved reading remains available.'});return [];}
  });
  // Saved intent precedes optional knowledge on the reasoning path too. The
  // panel already reserves these records; a chapter assessment must not lose a
  // migration constraint because catalogue text consumed the remaining budget.
  // Missing permitted facts fail before a call. Exclusions retain only a count
  // and the guard permits no fit judgement while that context is incomplete.
  for(const r of recalls){
    const c=r.architectureContext;if(!c){criticalWithheld++;continue;}
    for(const n of [c.selected,...c.requirements,...c.drivers,...c.constraints.map(record=>({id:record.id,chapter:1,title:record.title,record}))]){
      const record=n.record||n;
      if(containsExcludedRecord(record,excluded)&&!excluded.has(n.id))throw Error('The project disclosure policy excludes part of the required architecture context. Choose a narrower allowed scope.');
      const excerpt=JSON.stringify(record,(key,value)=>['history','sourceSnapshot','basis','generation'].includes(key)?undefined:value),id='model:'+n.id;
      if(add({id,kind:'model',objectId:n.id,chapter:n.chapter||c.chapter,title:n.title||record.title||n.id,posture:'Saved architecture intent and constraints; declarations are not measured outcomes.',versionStamp:changeFingerprint(record),excerpt,truncated:false,applicableTo:[r.it.id]},true))criticalIds.add(id);
    }
  }
  // Recall, first what the project has learned: claims its stewards linked to these records, reviewed,
  // released and active — often captured from an architect's earlier disagreement with Sol.
  const learnedIds = [...items.flatMap(i => [i.objectId, i.id.startsWith('D:') ? i.id.slice(2) : null]), ...D.rows.filter(r => items.some(i => i.rows.includes(r.ref))).flatMap(r => [r.id, r.assetId])];
  for (const {link, hit} of learnedFor(p, learnedIds).slice(0, 4)) {const applicability=applicableTo({kind:'governed-claim',receipt:{releaseId:hit.release.id,claimId:hit.claim.id}});if(!applicability.length)continue;add({applicableTo:applicability,id: 'claim:' + hit.release.id + ':' + hit.claim.id, kind: 'governed-claim', objectId: hit.claim.id, linkedObjectId: link.objectId, title: `${hit.claim.subjectId} · learned by the project`, posture: `Project knowledge its stewards reviewed, released and linked to ${link.objectId}: within its conditions it holds for this record.`, receipt: claimReceipt(p, hit.claim, hit.release), excerpt: JSON.stringify({statement: hit.claim.statement, conditions: hit.claim.conditions, limitations: hit.claim.limitations, linkedTo: link.objectId, linkReason: link.reason, architectureUnit:hit.claim.architectureUnit||null, sourcePassage: hit.claim.excerpt}), truncated: false});}
  // Recall, next what the architect said: a recorded disagreement with earlier advice about the same record that
  // the stewards have not captured yet (round 2, I2-19). It is read as testimony and labelled so; once captured,
  // released and linked it is read as the claim above instead, and the note is no longer sent.
  for (const it of items) for (const sa of projectNotes(p, it).slice(0, 2)) add({id: 'note:' + sa.id, kind: 'project-note', objectId: sa.id, linkedObjectId: it.objectId, title: `${sa.id} · the architect’s recorded reason, unreviewed`, posture: 'An architect’s recorded reason for declining earlier advice on this record: testimony to weigh, not reviewed by the stewards, not knowledge, not a measurement and not an approval.', versionStamp: digest({id: sa.id, reason: sa.reason, at: sa.at}), excerpt: JSON.stringify({record: it.title, adviceDeclined: {verdict: sa.verdict, headline: sa.headline, recorded: String(sa.at || '').slice(0, 10)}, architectSaid: sa.reason, stewards: 'not yet captured as project knowledge'}).slice(0, 1400), truncated: false});
  // The knowledge a stewardship item's advice rested on, as it reads now (withdrawn knowledge is never sent).
  for (const it of items) for (const src of list(it.extraSources)) add(src);
  // Recall: the objective and assumptions, the drivers, the tactics, the product mechanisms, the governed knowledge.
  const C = D.cap, O = C.objective;
  const assumptions = Object.fromEntries(ASSUMPTIONS.map(a => [a.key, `${O.assume[a.key]}${a.unit ? ' ' + a.unit : ''}`]));
  // Without a recorded objective the desk sizes for the SA Playbook's example; the packet says so, and says
  // what the project records instead, so Sol never takes the example for this project's load.
  // Round 12 (G, GR-RUN-04): with no load stated there is no objective to reason from, and the packet says so.
  const posture = C.noLoad ? 'No load is stated: the desk computes no capacity reading. Ask for the objective; never assume one.'
    : !C.example ? 'The review objective and planning assumptions: starting points to replace with load tests, not benchmarks.'
    : C.workload ? `The SA Playbook’s example, not this project’s load: ${C.workload.driverId} records ${C.workload.text}. A figure computed from the example is not this project’s need.`
    : 'The SA Playbook’s example: this project records no objective of its own. Figures computed from it are starting points to replace with the project’s objective and load tests, not benchmarks.';
  if (items.some(i => i.usesObjective !== false)) add({id: 'objective', kind: 'planning-assumptions', objectId: 'objective', title: `Objective · ${C.objText}${C.example ? ' — the SA Playbook’s example' : ''}`, posture, versionStamp: digest({O: {kind: O.kind, value: O.value, assume: O.assume, perReplica: O.perReplica}}), excerpt: JSON.stringify({objective: C.objText, source: O.source?.text || '', recordedByThisProject: !C.example && !C.noLoad, ...(C.workload ? {thisProjectRecordsInstead: `${C.workload.driverId}: ${C.workload.text}`} : {}), arrival: C.lambdaMath, assumptions:C.noLoad?{}:assumptions, perReplica:C.noLoad?{}:O.perReplica}).slice(0, 2400), truncated: false});
  const rowRefs = new Set(items.flatMap(i => i.rows)), rows = D.rows.filter(r => rowRefs.has(r.ref));
  // Keep mandatory saved intent and the objective, then admit complete contextual
  // deductions before optional product mechanisms, tactics and neighbour recall.
  const packed=packArchitectureIntelligence(recalls.filter(r=>r.intelligence).map(r=>({id:r.it.id,reading:r.intelligence,applicableTo:[r.it.id]})),{sources,maxCharacters:MAX_CHARS,maxSources:MAX_SOURCES,excluded});
  for(const source of packed.sources){const existing=sources.find(s=>s.id===source.id);if(existing)Object.assign(existing,source);else add(source);}
  if(packed.omitted)omissions.push({id:'architecture-intelligence-coverage',title:'Some contextual deductions were withheld',reason:'Complete source dependencies must fit the disclosure and request bounds.'});
  if (productsAvailable(p)) {
    const traits = uniq(items.flatMap(i => i.products)).map(pr => pr.replace(/^on\s+/i, '')).flatMap(pr => traitsFor(pr).map(t => ({t, pr}))).slice(0, 6);
    const evaluated=list(p.technologyRealisation?.records).flatMap(r=>list(r.options).map(option=>({realisationId:r.id,option,mechanisms:productMechanisms(option)})));
    for (const {t, pr} of traits) {
      const configurations=evaluated.flatMap(({realisationId,option,mechanisms})=>{const mechanism=mechanisms.find(m=>m.id===t.id);return mechanism?[{realisationId,optionId:option.id,product:option.product,version:option.version,state:mechanism.applicability.state,reasons:mechanism.applicability.reasons}]:[];});
      add({id: 'mechanism:' + t.id, kind: 'product-mechanism', objectId: t.id, title: `${pr} · documented mechanism`, posture: 'Conditional documentation. Read each named option’s applicability before suggesting support; missing facts and declared matches are not verified project outcomes.', receipt: traitReceipt(t), excerpt: JSON.stringify({product:pr,conditionalEffect:t.effect,bearsOn:t.attrs,mechanism:t.text,conditions:t.applicability||null,configurations,documented:t.src}), truncated:false});
    }
  }
  const readingDrivers = uniq(items.flatMap(i => Array.isArray(i.reading) ? i.reading.flatMap(c => list(c.drivers)) : [])), itemDrivers = uniq([...items.flatMap(i => list(i.drivers)), ...readingDrivers, ...items.flatMap(i => list(i.decision?.drivers)), ...rows.flatMap(r => r.drivers.map(d => d.id))]);
  for (const d of itemDrivers.map(id => list(p.quality?.drivers).find(x => x.id === id)).filter(Boolean).slice(0, 4)) {
    add({id: 'model:' + d.id, kind: 'model', objectId: d.id, chapter: 2, title: `${d.id} ${d.title}`, posture: isQualityDriver(d)?'Recorded quality scenario; target confirmation is separate from measured achievement.':'Recorded '+driverKind(d)+' driver and its architectural impact; no numeric quality target is implied.', versionStamp: changeFingerprint(d), excerpt: JSON.stringify(d), truncated: false});
  }
  if (playbookAvailable(p)) {
    const vitals = uniq(items.flatMap(i => [i.vital, ...list(i.vitals)])).map(id => VITALS.find(v => v.id === id)).filter(Boolean);
    const tactics = uniq([...items.flatMap(i => list(i.tactics)), ...vitals.flatMap(v => v.tactics)]).map(n => TACTICS.find(t => t.name === n)).filter(Boolean).slice(0, 3);
    for (const t of tactics) add({id: 'tactic:' + t.id, kind: 'playbook-entry', objectId: t.id, title: `${t.name} · SA Playbook tactic`, posture: 'The SA Playbook’s own text: a method, not proof that it applies here.', receipt: tacticReceipt(t), excerpt: JSON.stringify({name: t.name, group: t.group, attribute: t.attribute, concept: t.concept, example: t.example, useCase: t.useCase}).slice(0, 1400), truncated: false});
  }
  // Each decision has its own recall and product scope. Round-robin admission
  // prevents the first selected item from consuming every knowledge slot.
  for(let depth=0;depth<6;depth++)for(const sourcesForItem of recallLists){const source=sourcesForItem[depth];if(source)add(source);}
  // Keep linkage used only to enforce exclusions off the provider packet. Redact every remaining string,
  // including item names, knobs, record fields and receipts, before stamping the previewed packet.
  const shown = sources.map(({linkedObjectId, ...s}) => s);
  if (withheld) omissions.push({id: 'disclosure-policy', title: `${withheld} source${withheld === 1 ? '' : 's'} excluded by the project disclosure policy`, reason: 'disclosure policy'});
  const packet = {version: REASONING_VERSION, task: REASONING_TASK, request, responseContract:{version:3,verification:'Proposed tests only; the model explicitly cites the own reading. No execution or measured result is implied.'},
    items: items.map(i => ({id: i.id, kind: i.kind, title: i.title, chapter: i.chapter, vital: i.vital, ref: i.ref, stamp: i.stamp, knobs: i.knobs, allowed: i.allowed, rows: i.rows, ...(i.objectId ? {objectId: i.objectId, recordType: i.recordType, names: i.names} : {})})),
    sources: shown, omissions, criticalContext:{version:1,complete:criticalWithheld===0,withheldCount:criticalWithheld,sourceRefs:shown.filter(s=>criticalIds.has(s.id)).map(s=>s.ref),policy:'Saved requirements, architecture drivers and constraints precede optional knowledge. Incomplete context permits only an insufficient-evidence assessment; no preferred option or refinement.'},knowledgeCoverage:items.map(it=>({itemId:it.id,sourceRefs:shown.filter(s=>list(s.applicableTo).includes(it.id)).map(s=>s.ref),reviewedClaims:shown.filter(s=>s.kind==='governed-claim'&&list(s.applicableTo).includes(it.id)).length})), coverage: {characters: chars, maxCharacters: MAX_CHARS, sourceCount: sources.length, maxSources: MAX_SOURCES},
    objective: {recorded: !C.example && !C.noLoad, ...(C.noLoad ? {stated: false} : {}), ...(C.workload ? {conflict: {driverId: C.workload.driverId, text: C.workload.text}, figures: C.exampleFigures} : {})},
    brainReceipt: {engine: BRAIN_ENGINE, policy: BRAIN_POLICY, reasoning: 'aiw-desk-reasoning-1', instructions: instructionsPin(), models: modelKnowledgeState(p).map(k => ({id: k.id, withdrawn: k.withdrawn})), claimIds: sources.filter(s => s.kind === 'governed-claim').map(s => s.objectId), claimRefs:sources.filter(s=>s.kind==='governed-claim').map(s=>s.receipt.releaseId+':'+s.receipt.claimId), retrieval:'graph + lexical', scoring: false},
    disclosure: {version: 2, redactContacts: !!policy.redactContacts, redactSecrets: true, excludedObjectCount: excluded.size, withheldSources: withheld}};
  const redact = value => typeof value === 'string' ? redactSecrets(policy.redactContacts ? mask(value) : value)
    : Array.isArray(value) ? value.map(redact)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, part]) => [key, redact(part)])) : value;
  const safe = redact(hideExcludedReferences(packet,excluded));
  return {...safe, stamp: digest(safe)};
}

// Dismissals of earlier advice on a record that the stewards have not captured: the architect's own testimony,
// newest first. A stewardship item is its own record of the disagreement and takes none.
export function projectNotes(p, item) {
  if (!item?.objectId || String(item.id).startsWith('K:')) return [];
  const captured = new Set(list(knowledgeState(p).stewardship).filter(d => d.decision === 'captured').map(d => d.assessmentId));
  return assessmentsOf(p).filter(sa => sa.outcome === 'dismissed' && sa.reason && !captured.has(sa.id) && !String(sa.itemId).startsWith('K:') && assessmentObject(p, sa.itemId) === item.objectId).slice(-4).reverse();
}

// ---------------------------------------------------------------- reason: the contract Sol answers in

const string = {type: 'string'}, strings = {type: 'array', items: string};
const obj = properties => ({type: 'object', properties, required: Object.keys(properties), additionalProperties: false});
export function reasoningSchema(packet) {
  const refs = {type: 'array', items: {type: 'string', enum: packet.sources.map(s => s.ref)}};
  const assessment=it=>{const keys=it.allowed.knobs,targets=it.allowed.proposals?.targets||[],alts=it.allowed.preferred||[];return obj({
    id: {type: 'string', enum: [it.id]},
    verdict: {type: 'string', enum: it.allowed.verdicts},
    headline: string, reasoning: string,
    refinements: {type: 'array', maxItems: keys.length?6:0, items: obj({key: {type: 'string', enum: keys.length ? keys : ['none']}, value: string, why: string})},
    proposals: {type: 'array', maxItems: targets.length?3:0, items: obj({title: string, category: {type: 'string', enum: THREAT_CATEGORIES}, priority: {type: 'string', enum: PRIORITIES}, targetIds: {type: 'array', items: {type: 'string', enum: targets.length ? targets : ['none']}}, scenario: string, consequence: string})},
    preferred: {type: 'string', enum: [...alts, 'none']},
    alternativeChecks: {type:'array',minItems:alts.length,maxItems:alts.length,description:'Assess each supplied option AS STATED before quality trade-offs. Do not rescue it by adding an unrecorded mechanism.',items:obj({alternativeId:{type:'string',enum:alts.length?alts:['none']},admissibility:{type:'string',enum:['viable_as_stated','violates_constraint','not_established'],description:'viable_as_stated: supplied mechanism satisfies recorded correctness constraints; violates_constraint: contradicts one or lacks its required enforcement mechanism; not_established: a missing fact prevents deciding fit, not merely missing workload/latency.'},constraint:{...string,description:'Quote or faithfully paraphrase the fixed requirement from the cited reading; preserve its mandatory scope.'},reason:string,sourceRefs:refs})},
    verification:{type:'array',maxItems:2,description:'Proposed verification only. When the question requests a test, supply concrete steps, failure or interleaving, and an observable pass criterion on the relevant assessment.',items:obj({title:string,steps:{...strings,minItems:1,maxItems:4},failure:string,passCriterion:string,ownReadingRef:{type:'string',enum:[it.ref]},sourceRefs:refs})},
    risks: {...strings, maxItems: 4}, questions: {...strings, maxItems: 4}, sourceRefs: refs});};
  return obj({summary:string,sourceRefs:refs,assessments:{type:'array',minItems:packet.items.length,maxItems:packet.items.length,items:packet.items.length===1?assessment(packet.items[0]):{anyOf:packet.items.map(assessment)}}});
}
const reviewTexts={defects:{...strings,maxItems:8},notes:{...strings,maxItems:8}};
export const REVIEW_SCHEMA = obj({assessments: {type: 'array', items: obj({id: string, supported: {type: 'boolean'}, ...reviewTexts, alternativeFindings:{type:'array',items:obj({alternativeId:string,classificationMatchesSources:{type:'boolean',description:'Judge whether the candidate classification is correct, NOT whether the option is viable. True when a violates_constraint or not_established label accurately follows from sources. False only when the label or its stated basis is wrong; name that error in defects.'},proseConsistent:{type:'boolean',description:'True only when all candidate prose preserves its classification and the recorded constraint.'},...reviewTexts})},requestFulfillment:obj({supported:{type:'boolean'},...reviewTexts})})}});

// The instruction set is pinned into every packet (round 2, I2-16): a recorded assessment names the prompt version
// and the SHA-256 of the exact instructions it answered, so it can be attributed after they change. The packet
// stamp covers the pin, so a changed prompt is a changed packet.
export const REASONING_PROMPT_VERSION = 'sol-reasoning-4';
export function instructionsPin() { return REASONING_INSTRUCTIONS_PIN; }

// ---------------------------------------------------------------- review: validation, the deterministic guard, the fallback

function exact(v, keys, what) { if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k => !keys.includes(k)) || keys.some(k => !(k in v))) throw Error(`Sol returned an unsupported ${what} structure.`); }
// Size is the model's to keep, not a reason to lose the batch: advice text over its limit is cut after
// the last whole sentence that fits (or the last whole word, marked …), lists at their limit, and the
// assessment names what was shortened. Values the design would take keep their rules (refinements below).
function fit(v, n, what, cut) {
  if (typeof v !== 'string') throw Error(`Sol returned an unsupported ${what} value.`);
  const t = v.trim();
  if (t.length <= n) return t;
  cut.add(what);
  const head = t.slice(0, n), end = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '), /[.!?]$/.test(head) ? n - 1 : -1);
  return end >= n / 2 ? head.slice(0, end + 1) : head.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}
function fitList(v, max, n, what, cut) {
  if (!Array.isArray(v)) throw Error(`Sol returned an unsupported ${what} list.`);
  if (v.length > max) cut.add(what);
  return v.slice(0, max).map(x => fit(x, n, what, cut)).filter(Boolean);
}
const citations = v => { if (!Array.isArray(v) || v.some(x => typeof x !== 'string')) throw Error('Sol returned an unsupported citation list.'); return uniq(v.map(x => x.trim()).filter(Boolean)); };

// Only a broken structure fails the response. A decision outside the packet, or one assessed twice, is
// set aside; a problem with one assessment withholds that assessment alone; the rest of the batch stands.
export function validateReasoningOutput(raw, packet, {strictCoverage=false}={}) {
  exact(raw, ['summary', 'sourceRefs', 'assessments'], 'response');
  const known = new Set(packet.sources.map(s => s.ref)), top = citations(raw.sourceRefs);
  if (top.some(x => !known.has(x))) throw Error('Sol cited a source outside the reviewed packet.');
  if (!Array.isArray(raw.assessments)) throw Error('Sol returned an unsupported response structure.');
  if(strictCoverage){const expected=packet.items.map(i=>i.id),received=raw.assessments.map(a=>a?.id);if(received.length!==expected.length||new Set(received).size!==received.length||expected.some(id=>!received.includes(id)))throw Error('Sol must return exactly one assessment for every selected decision; this response omitted or repeated a decision.');}
  const topCut = new Set(), setAside = [], result = {summary: fit(raw.summary, 1500, 'summary', topCut), sourceRefs: top, assessments: []};
  for (const a of raw.assessments) {
    exact(a, ['id', 'verdict', 'headline', 'reasoning', 'refinements', 'proposals', 'preferred', 'risks', 'questions', 'sourceRefs',...(strictCoverage||'alternativeChecks' in a?['alternativeChecks']:[]),...(strictCoverage&&packet.responseContract?.version>=2||'verification' in a?['verification']:[])], 'assessment');
    if (typeof a.id !== 'string') throw Error('Sol returned an unsupported assessment structure.');
    const item = packet.items.find(i => i.id === a.id);
    if (!item) { setAside.push({id: a.id.slice(0, 120), reason: 'Sol assessed a decision that is not in the packet.'}); continue; }
    if (result.assessments.some(x => x.id === a.id)) { setAside.push({id: a.id, reason: 'Sol assessed this decision twice; the first assessment stands.'}); continue; }
    const problems = [], cut = new Set();
    if (!VERDICTS[a.verdict] || !item.allowed.verdicts.includes(a.verdict)) problems.push(`“${a.verdict}” is not a verdict for this kind of decision.`);
    const out = {id: a.id, verdict: a.verdict, headline: fit(a.headline, 240, 'headline', cut), reasoning: fit(a.reasoning, 1800, 'reasoning', cut), refinements: [], proposals: [], preferred: 'none', risks: fitList(a.risks, 4, 500, 'risks', cut), questions: fitList(a.questions, 4, 500, 'questions', cut), sourceRefs: [], problems};
    if (!out.headline || !out.reasoning) problems.push('It gives no headline or no reasoning.');
    const refs = citations(a.sourceRefs);
    if (refs.some(x => !known.has(x))) problems.push('It cites a source outside the reviewed packet.');
    out.sourceRefs = refs.filter(x => known.has(x));
    if(out.sourceRefs.some(ref=>{const s=packet.sources.find(x=>x.ref===ref);return Array.isArray(s?.applicableTo)&&!s.applicableTo.includes(item.id);}))problems.push('It cites knowledge outside this decision’s product or object scope.');
    if (!Array.isArray(a.refinements)) throw Error('Sol returned an unsupported refinement list.');
    if (a.refinements.length > 6) cut.add('refinements');
    for (const r of a.refinements.slice(0, 6)) {
      exact(r, ['key', 'value', 'why'], 'refinement');
      if (typeof r.value !== 'string' && typeof r.value !== 'number') throw Error('Sol returned an unsupported refinement structure.');
      const k = item.knobs.find(x => x.key === r.key);
      if (!k) { problems.push(`It refines “${r.key}”, which this draft does not have.`); continue; }
      const why = fit(r.why, 700, 'reasons', cut);
      if(['description','acceptance'].includes(k.key)&&/^(?:(?:the\s+)?(?:requirement|description|acceptance(?:\s+criteria)?|record)\s+(?:should|must|needs?\s+to)\s+(?:specify|state|include|identify|define|clarify|capture)\b|(?:clarify|identify|specify|record|define|add)\s+(?:the\s+)?(?:requirement\s+)?(?:owner|priority|workload|target|acceptance\s+criteria)\b)/i.test(String(r.value).trim())){problems.push('A functional description or acceptance refinement replaces the required behavior with authoring instructions.');continue;}
      if (k.type === 'number') {
        const n = Number(String(r.value).replace(/,/g, ''));
        if (!Number.isFinite(n) || n < k.min || n > k.max) { problems.push(`${k.label}: ${r.value} is outside ${k.min}–${k.max}.`); continue; }
        const v = k.step >= 1 ? Math.round(n) : n;
        if (v === Number(k.value)) continue;
        out.refinements.push({key: k.key, label: k.label, value: v, why});
      } else {
        // Wording the design would take keeps its field's limit, and is never cut: past it, or empty, the
        // refinement is set aside and never applied, and the rest of the advice stands.
        const v = String(r.value).trim(), max = k.maxLength || 2400;
        if (!v || v.length > max) { (out.setAside ||= []).push({key: k.key, label: k.label, value: v.length > 1200 ? v.slice(0, 1200) + '…' : v, why, reason: v ? `Its wording is longer than the field’s ${max} characters, so it is set aside and never applied; the rest of the advice stands.` : 'Its wording is empty, so it is set aside; the rest of the advice stands.'}); continue; }
        if (v === String(k.value ?? '').trim()) continue;
        out.refinements.push({key: k.key, label: k.label, value: v, why});
      }
    }
    if (a.verdict === 'refine' && !out.refinements.length) problems.push('It asks to refine the draft but proposes no change within its knobs.');
    if (!Array.isArray(a.proposals)) throw Error('Sol returned an unsupported proposal list.');
    // Threats proposed for a decision that takes none are set aside, as a guarantee-worded refinement is:
    // they are never recorded, and the rest of the advice stands.
    if (a.proposals.length && !item.allowed.proposals) (out.setAside ||= []).push({key: 'proposals', label: 'Proposed threats', value: a.proposals.slice(0, 3).map(x => String(x?.title || '').slice(0, 160)).filter(Boolean).join('; ') || `${a.proposals.length} proposed`, why: '', reason: 'This decision takes no threats, so they are set aside and never recorded; the rest of the advice stands.'});
    else if (a.proposals.length > 3) cut.add('proposals');
    for (const x of item.allowed.proposals ? a.proposals.slice(0, 3) : []) {
      exact(x, ['title', 'category', 'priority', 'targetIds', 'scenario', 'consequence'], 'proposal');
      const targets = uniq(list(x.targetIds)).filter(id => item.allowed.proposals.targets.includes(id));
      if (!targets.length || !THREAT_CATEGORIES.includes(x.category) || !PRIORITIES.includes(x.priority)) { problems.push('A proposed threat names no listed target, or an unknown category or priority.'); continue; }
      const title = fit(x.title, 160, 'proposals', cut), scenario = fit(x.scenario, 1200, 'proposals', cut), consequence = fit(x.consequence, 1200, 'proposals', cut);
      if (!title || !scenario || !consequence) { problems.push('A proposed threat has no title, scenario or consequence.'); continue; }
      out.proposals.push({title, category: x.category, priority: x.priority, targetIds: targets, scenario, consequence});
    }
    if (typeof a.preferred !== 'string') throw Error('Sol returned an unsupported preference.');
    if (a.preferred !== 'none') { if (item.allowed.preferred?.includes(a.preferred)) out.preferred = a.preferred; else problems.push('It prefers an alternative this decision does not have.'); }
    out.alternativeChecks=[];
    if(strictCoverage||'alternativeChecks' in a){
      const alternatives=item.allowed.preferred||[],checks=a.alternativeChecks;
      if(!Array.isArray(checks))throw Error('Sol returned an unsupported alternative compatibility list.');
      if(checks.length!==alternatives.length||new Set(checks.map(c=>c.alternativeId)).size!==checks.length||alternatives.some(id=>!checks.some(c=>c.alternativeId===id)))problems.push('It must check every supplied alternative exactly once against the recorded constraints.');
      for(const c of checks){exact(c,['alternativeId','admissibility','constraint','reason','sourceRefs'],'alternative check');if(!alternatives.includes(c.alternativeId)||!['viable_as_stated','violates_constraint','not_established'].includes(c.admissibility)){problems.push('An alternative check uses an unlisted option or compatibility status.');continue;}const sourceRefs=citations(c.sourceRefs),constraint=fit(c.constraint,700,'alternative constraints',cut),reason=fit(c.reason,900,'alternative reasons',cut);if(!constraint||!reason||!sourceRefs.includes(item.ref)||sourceRefs.some(ref=>!known.has(ref)||packet.sources.find(s=>s.ref===ref)?.applicableTo&&!packet.sources.find(s=>s.ref===ref).applicableTo.includes(item.id)))problems.push('An alternative check lacks its recorded constraint, causal basis or scoped own-reading citation.');out.alternativeChecks.push({alternativeId:c.alternativeId,admissibility:c.admissibility,constraint,reason,sourceRefs:sourceRefs.filter(ref=>known.has(ref))});}
      if(out.preferred!=='none'&&!out.alternativeChecks.some(c=>c.alternativeId===out.preferred&&c.admissibility==='viable_as_stated')){problems.push('It prefers an alternative whose compatibility with the recorded constraints is not established.');out.preferred='none';}
    }
    out.verification=[];
    if('verification' in a){
      if(!Array.isArray(a.verification)||a.verification.length>2)throw Error('Sol returned an unsupported verification list.');
      for(const v of a.verification){
        exact(v,['title','steps','failure','passCriterion','sourceRefs',...(strictCoverage&&packet.responseContract?.version>=3||'ownReadingRef' in v?['ownReadingRef']:[])],'proposed verification');
        if('ownReadingRef' in v&&v.ownReadingRef!==item.ref)problems.push('A proposed test cites a different own reading than its assessment.');
        const title=fit(v.title,160,'verification title',cut),steps=fitList(v.steps,4,500,'verification steps',cut),failure=fit(v.failure,600,'verification failure',cut),passCriterion=fit(v.passCriterion,700,'verification criterion',cut),sourceRefs=uniq([...citations(v.sourceRefs),...(typeof v.ownReadingRef==='string'?[v.ownReadingRef]:[])]);
        if(!title||!steps.length||!failure||!passCriterion)problems.push('A proposed test lacks concrete steps, a failure/interleaving or an observable pass criterion.');
        if(/\b(?:test|experiment|(?:fault|failure) injection)\s+(?:(?:has|have|was|were|been)\s+)*(?:executed|passed|succeeded|completed)\b|\b(?:we|I)\s+(?:observed|measured|tested|verified)\b/i.test([title,...steps,failure,passCriterion].join('\n')))problems.push('Proposed verification is described as an executed observation or result.');
        if(/\b(?:promptly|quickly|immediately|timely|without undue delay)\b/i.test(passCriterion)&&!/[0-9]|\b(?:recorded|agreed|specified|supplied)\s+(?:(?:response[- ]time|latency|timing)\s+)?(?:target|threshold|bound|limit)\b/i.test(passCriterion))problems.push('A proposed test uses vague timing as a pass criterion without an explicit measurable boundary or agreed target.');
        if(!sourceRefs.includes(item.ref)||sourceRefs.some(ref=>!known.has(ref)||Array.isArray(packet.sources.find(s=>s.ref===ref)?.applicableTo)&&!packet.sources.find(s=>s.ref===ref).applicableTo.includes(item.id)))problems.push('A proposed test lacks scoped source receipts including its own reading.');
        out.verification.push({title,steps,failure,passCriterion,sourceRefs:sourceRefs.filter(ref=>known.has(ref)),status:'proposed'});
      }
    }
    // Carry explicit, eligible nested citations to their containing assessment
    // and response. This preserves the model's references; it invents none.
    const nestedRefs=uniq([...out.alternativeChecks.flatMap(c=>c.sourceRefs),...out.verification.flatMap(v=>v.sourceRefs)]).filter(ref=>known.has(ref)&&(!Array.isArray(packet.sources.find(s=>s.ref===ref)?.applicableTo)||packet.sources.find(s=>s.ref===ref).applicableTo.includes(item.id)));
    out.sourceRefs=uniq([...out.sourceRefs,...nestedRefs]);result.sourceRefs=uniq([...result.sourceRefs,...nestedRefs]);
    if (!out.sourceRefs.includes(item.ref)) problems.push('It does not cite the decision’s own reading.');
    if (cut.size) out.trimmed = [...cut];
    result.assessments.push(out);
  }
  if (topCut.size) result.trimmed = [...topCut];
  if (setAside.length) result.setAside = setAside;
  return result;
}

// Numbers Sol states must be in the packet or be its own refinements; nothing may be guaranteed.
const NUMBER = /(?<![\w.])\d{1,3}(?:,\d{3})+(?:\.\d+)?|(?<![\w.,])\d+(?:\.\d+)?/g;
const norm = s => String(Number(String(s).replace(/,/g, '')));
// A refinement's own value restated in another unit (timeoutMs 30000 as "30 seconds") is not a new number.
const RESTATED = {ms: [v => v / 1000, v => v / 60000], min: [v => v * 60, v => v / 60]};
export const restated = (value, unit) => [norm(value), ...(RESTATED[unit] || []).map(f => f(value)).filter(v => Number.isInteger(v * 10)).map(norm)];
// The first sentence that claims a guaranteed or verified outcome. A claim says something ensures one
// ("…, ensuring exactly-once processing", "three replicas ensure availability") or that one was verified
// ("latency was measured at 180 ms in production"). Advice claims nothing: an instruction ("Ensure clear
// recovery procedures"), a purpose or modal ("to ensure", "should ensure", "helps ensure"), a goal ("critical
// for ensuring", "complexity to achieving the target"), missing evidence ("without measured evidence"), a
// question, a hedged sentence ("until a load test replaces it") and a negated claim ("does not guarantee",
// "does not, as written, guarantee"). A negation reaches a claim at most five words after it, so "guarantees
// zero double bookings, not just fewer" still claims; the structural shortcuts keep a sentence-wide negation.
// A drafted value is read strictly, because it is written into the design: an outcome it says it ensures
// is a claim even as a purpose ("…to ensure availability").
const ENSURES = /\b(?:guarantee[sd]?|guaranteeing|ensure[sd]?|ensuring|achieve[sd]?|achieving|prove[sdn]?|proving)\b/gi;
const BASE = new Set(['guarantee', 'ensure', 'achieve', 'prove']);
const ADVISES = new Set(['to', 'should', 'must', 'would', 'could', 'can', 'may', 'might', 'shall', 'cannot', "can't", 'not', 'never', 'no', 'nor', 'help', 'helps', 'helped', 'helping', 'aim', 'aims', 'aimed', 'intended', 'designed', 'meant', 'need', 'needs', 'needed', 'required', 'requires', 'necessary', 'try', 'tries', 'trying', 'seek', 'seeks', 'for', 'of', 'in', 'on', 'about', 'toward', 'towards', 'at', 'before', 'without', 'whether', 'if', 'unless', 'until', 'be']);
const ADVERB = /^(?:\w+ly|also|always|further|still|only|better|then|first|next|please|thus|therefore|hence|so)$/i;
const DIRECTS = /^\s*(?:to|ensure|guarantee|achieve|prove|define|set|add|use|keep|specify|document|establish|implement|configure|introduce|make|consider|confirm|review|monitor|apply|adopt|limit|bound|increase|reduce|raise|lower|run|verify|validate|clarify|align|choose|select|assign|provide|treat|retain|deploy|capture|require|agree|decide|gather|obtain|replace|split|prefer|avoid|enforce|maintain|protect|record|name)\s|\b(?:should|must|needs? to|would|could|can|may|might|shall|helps?|in order to)\b/i;
// What a claim may not ensure: a hard outcome anywhere in its clause, or a softer one as what it ensures.
const HARD = /\b(?:zero|no loss|exactly.once|100 ?%|verified|atomicity|atomic\s+(?:visibility|snapshot|boundary|storage|commit|transaction|context))\b/i;
const SOFT = /^(?:\S+\s+){0,5}?(?<!\b(?:for|of|to|with|in|on|about|from|toward|towards|under|during|at|by|into)\s)(?:the (?:\w+ )?target|availability|recovery|capacity|compliance|correctness|correct\s+(?:handling|execution|processing|outcomes?))\b(?!\s+(?:growth|planning|plans?|models?|drafts?|sizing|order|steps?|procedures?|runbooks?|paths?|needs|figures?|estimates?|assumptions?|reviews?|polic(?:y|ies)|strateg(?:y|ies)|authority|prerequisites)\b)/i;
const VERIFIED = /\b(?:verified|proven|validated|measured)\b/gi;
const UNPROVEN = /\b(?:without|lack|lacks|lacking|absent|missing|no|nor|none|until|before|once|when|if|unless|whether|pending|awaiting|requires?|required|requiring|needs?|needed|seek|gather|obtain|collect|record|provide|request|confirm|verify|validate|measure|test|yet)\b/i;
// Application placement is not a storage transaction. This catches asserted
// topology-to-atomicity shortcuts even when they avoid the word "guarantee".
const TOPOLOGY_ATOMICITY=/\b(?:co[- ]?locat\w*|cohesive\s+(?:component|module|service)|(?:one|single|same|shared)\s+(?:application\s+)?(?:component|module|process|deployment|service))\b.{0,120}\b(?:provides?|creates?|establishes?|implies?|yields?|constitutes?|means?)\b.{0,70}\b(?:atomic\s+(?:context|boundary|storage|commit|transaction)|atomicity|transaction\s+boundary)\b/i;
// Change isolation is not concurrency isolation. A layering explanation must
// not substitute for an explicit transactional/conditional-write mechanism.
function structuralCorrectnessClaim(sentence){
  const structure=/\b(?:layer(?:ed|ing)(?:\s+(?:architecture|architectural\s+style|design|style))?|separation\s+of\s+concerns|dependency\s+isolation|component\s+separation)\b/i.exec(sentence);
  if(!structure||/^\s*(?:test|verify|check|investigate|assess)\b/i.test(sentence))return false;
  const cause=sentence.slice(structure.index),asserted=/\b(?:ensur\w*|guarantee\w*|establish\w*|provid\w*|enforc\w*|deliver\w*|yield\w*)\b.{0,120}\b(?:(?:state|transaction|request)\b.{0,75}\b(?:consistency|consistent|integrity)|atomicity|transactional\s+consistency|concurrency\s+(?:correctness|control)|(?:correct|consistent)\s+(?:concurrent\s+)?(?:state\s+transitions?|commits?|transactions?))\b/i.test(cause);
  const shortcut=/\bdependency\s+isolation\b.{0,70}\b(?:aid\w*|enabl\w*|support\w*)\b.{0,70}\bconcurrency\s+control\b.{0,70}\b(?:enforc\w*|commit\w*|correctness)\b/i.test(cause);
  const conditioned=/\b(?:if|only when|provided(?: that)?|depends? on|requires?)\b/i.test(cause)&&/\b(?:transaction(?:al)?\s+(?:boundary|storage|contract|commit)|(?:database|storage|serializable)\s+transaction|conditional\s+(?:write|update|commit)|compare[- ]and[- ](?:set|swap)|version[- ]checked\s+(?:write|update|commit))\b/i.test(cause);
  return (asserted||shortcut)&&!conditioned;
}
function claims(sentence, m, drafted) {
  if (drafted) return true;
  const word = m[0].toLowerCase(), form = BASE.has(word) ? 'base' : word.endsWith('ing') ? 'ing' : 'finite';
  const before = sentence.slice(0, m.index), words = before.split(/[;:—–(]/).pop().trim().split(/\s+/).filter(Boolean);
  if(/\b(?:is|are)\s+(?:essential|sufficient|enough)\s+to\s*$/i.test(before))return true;
  if (/\b(?:verify|verifies|confirm|confirms|check|checks|test|tests|validate|validates|prove|proves|assess|evaluate|determine|establish|demonstrate|measure)\s+(?:that|whether|if|how)\b|\bwhether\b/i.test(before)) return false; // what is to be verified
  if (/^\s*to\s+(?!date\b)\w+/i.test(before.split(/[;:—–]/).pop())) return false; // "To address the gaps, ensuring…" is a purpose
  while (words.length && ADVERB.test(words.at(-1).replace(/[^\w']/g, ''))) words.pop();
  const last = words.at(-1) || '', bare = last.toLowerCase().replace(/[^\w']/g, '');
  if (!words.length) return form === 'finite'; // "Ensure…" instructs and "Achieving…" names a goal; "Ensures…" claims
  if (last.endsWith(',') || bare === 'and' || bare === 'or') {
    if (form === 'finite') return true;
    if (form === 'base') return !DIRECTS.test(before) && !/\bto\s+(?!(?:the|a|an|at|its|their|this|that|these|those|up|about|around|over|under|within)\b)[a-z]+\b/i.test(words.join(' ')); // "…should add X and ensure Y", "…operations to handle load and ensure Y" advise
    return last.endsWith(',') || !/\b(?:for|of|to|in|on|about|toward|towards|at|before|without)\s+\w+ing\b/i.test(before); // "…, ensuring Y" claims
  }
  if (bare === 'be') return /\bwill\s+be$/i.test(words.slice(-2).join(' '));
  return !ADVISES.has(bare);
}
const NEGATES = /^(?:not|never|cannot|can't|doesn.t|isn.t)$/i;
const negated = before => before.split(';').pop().trim().split(/\s+/).slice(-5).some(w => NEGATES.test(w.replace(/^\W+|\W+$/g, '')));
export function overclaim(text, {drafted = false} = {}) {
  for (const sentence of String(text).split(/(?<=[.!?])\s+|\n+|;\s*|\s+(?:but|while|whereas|although|though|however)\s+/)) {
    if (/\?\s*$/.test(sentence)) continue;
    if (/\b(?:no guarantee|unverified|not yet|until)\b/i.test(sentence)) continue;
    const denied = /\b(?:not|never|cannot|can't|doesn.t|isn.t)\b/i.test(sentence);
    if(!denied&&structuralCorrectnessClaim(sentence))return 'guarantee';
    if(!denied&&TOPOLOGY_ATOMICITY.test(sentence)&&!DIRECTS.test(sentence)&&!/^\s*(?:if|when|provided|assuming)\b/i.test(sentence)&&!/\b(?:via|using|through|backed by)\b.{0,70}\b(?:database|datastore|storage|transaction)\b/i.test(sentence))return 'guarantee';
    for (const m of sentence.matchAll(ENSURES)) {
      if (negated(sentence.slice(0, m.index)) || !claims(sentence, m, drafted)) continue;
      const after = sentence.slice(m.index + m[0].length).split(/[;:—–]|\s(?:but|while|whereas|although|though)\s/)[0].slice(0, 90).trimStart();
      if (HARD.test(after) || SOFT.test(after)) return 'guarantee';
    }
    for (const m of sentence.matchAll(VERIFIED)) {
      const clause = sentence.slice(0, m.index).split(/[;:—–(]/).pop(), after = sentence.slice(m.index + m[0].length);
      if (UNPROVEN.test(clause) || negated(sentence.slice(0, m.index))) continue; // "without measured evidence", "lack of validated results", "has not verified capacity"
      const asserted = /\b(?:is|are|was|were|been)\s+(?:\w+ly\s+)?$/i.test(clause) || /^\s+(?:capacity|latency|throughput|recovery|availability)\b/i.test(after);
      if (asserted && /^.{0,60}\b(?:capacity|latency|throughput|recovery|availability|in production)\b/i.test(after)) return 'verified';
    }
  }
  return null;
}
export function guardReasoning(packet, result) {
  const known = new Set();
  for (const s of packet.sources) for (const m of String(s.excerpt).match(NUMBER) || []) known.add(norm(m));
  for (const n of String(packet.request?.prompt || '').match(NUMBER) || []) known.add(norm(n));
  // Where the project records a workload of its own, sizing for the SA Playbook's example is not advice for it:
  // taking or adjusting a capacity draft sized for the example, or setting a knob to one of its figures.
  const conflict = packet.objective?.conflict, example = new Set(packet.objective?.figures || []);
  const asksTest=packet.responseContract?.version>=2&&String(packet.request?.prompt||'').split(/[.!?;\n]/).some(q=>!/\b(?:do not|don't|no need to|without|exclude|omit)\b.{0,35}\b(?:tests?|verification|injection)\b/i.test(q)&&/\b(?:propos\w*|design\w*|describ\w*|include|give|outline|specif\w*|plan|show|provide)\b.{0,100}\b(?:tests?|fault[- ]injection|failure[- ]injection)\b|\b(?:fault|failure)[- ]injection\b|\bconcurrency\s+test\b/i.test(q));
  const hasTest=result.assessments.some(a=>list(a.verification).length&&!a.problems.length);
  const summaryClaim=overclaim(result.summary);
  for (const a of result.assessments) {
    if(packet.criticalContext?.complete===false&&(a.verdict!=='insufficient'||a.preferred!=='none'||a.refinements.length||a.proposals.length||list(a.alternativeChecks).some(x=>x.admissibility==='viable_as_stated')))a.problems.push('Required architecture context is withheld; the supplied facts cannot establish option fit or a design refinement.');
    if(summaryClaim)a.problems.push('The shared summary claims a guaranteed or verified outcome that the supplied design does not establish.');
    if(asksTest&&!hasTest)a.problems.push('The requested verification is missing: propose concrete steps, a failure/interleaving and an observable pass criterion.');
    const item = packet.items.find(i => i.id === a.id);
    if (conflict && ['apply', 'refine'].includes(a.verdict)) {
      const sized = uniq(a.refinements.filter(r => typeof r.value === 'number').map(r => norm(r.value)).filter(n => example.has(n)));
      if ((item?.kind === 'fix' && item.vital === 'capacity') || sized.length) a.problems.push(`It sizes for the SA Playbook’s example objective, but ${conflict.driverId} records ${conflict.text}${sized.length ? ` (${sized.join(', ')} come${sized.length === 1 ? 's' : ''} from the example)` : ''}; this project’s own objective must be recorded before sizing.`);
    }
    const unit = key => list(item?.knobs).find(k => k.key === key)?.unit;
    const own = new Set(a.refinements.filter(r => typeof r.value === 'number').flatMap(r => restated(r.value, unit(r.key))));
    const alternativeWords=list(a.alternativeChecks).flatMap(c=>[c.constraint,c.reason]);
    const nonviable=list(a.alternativeChecks).filter(c=>c.admissibility!=='viable_as_stated'),violations=nonviable.filter(c=>c.admissibility==='violates_constraint');
    const comparisonText=[a.headline,a.reasoning,...a.risks,...a.questions].join('\n');
    // A correct structured classification must survive the surrounding prose.
    // Human choice does not turn a fixed correctness invariant into a preference.
    const invariantText=violations.map(c=>c.constraint+' '+c.reason).join(' '),orderInvariant=/\border(?:ing)?\b/i.test(invariantText),repeatInvariant=/\b(?:duplicat\w*|repeat\w*|repetition|side.effects?)\b/i.test(invariantText);
    const relaxesInvariant=comparisonText.split(/(?<=[.!?])\s+|\n+/).some(s=>{
      if(/\b(?:(?:explicit|separate|proposed|requested)\s+){1,3}(?:requirement|constraint)\s+change\b/i.test(s)||/^\s*(?:do not|don't|never|avoid)\b|\b(?:must not|cannot|not a permitted|is not acceptable)\b/i.test(s))return false;
      return orderInvariant&&(/\btolerance\s+(?:for|of)\s+(?:(?:strict|global|per[- ]key)\s+)?order(?:ing)?\s+violations?\b/i.test(s)||/\b(?:balanc\w*|weigh\w*|trade\w*|prioriti[sz]\w*)\b.{0,100}\b(?:strict\s+)?(?:(?:global|per[- ]key)\s+)?order(?:ing)?(?:\s+correctness)?\b.{0,50}\b(?:against|versus|vs\.?|for)\s+(?:higher\s+)?(?:throughput|scal\w*|performance|concurrenc\w*)\b/i.test(s))||repeatInvariant&&/\btolerance\s+(?:for|of)\s+(?:unsafe\s+)?(?:duplication|duplicates?|repetition|repeated\s+(?:effects?|instructions?))(?:\s+risk)?\b/i.test(s);
    });
    if(relaxesInvariant)a.problems.push('Its prose turns a recorded correctness constraint into tolerance for violations or a trade-off against performance without an explicit requirement change.');
    if(nonviable.length&&/\b(?:both|all|each)\s+(?:(?:the|supplied|listed|of\s+the)\s+)?(?:(?:alternatives?|options?|approaches?|mechanisms?)\s+)?(?:are\s+|remain\s+|have\s+)?(?:viable|valid\s+trade-offs|satisfy\b|meet\s+(?:the\s+)?(?:fixed|recorded|correctness)|comply\b)/i.test(comparisonText)||violations.length&&/\b(?:no|none\s+of\s+the)\s+(?:alternative|option|approach|mechanism)s?\s+(?:currently\s+)?(?:violates?|conflicts?\s+with)\b/i.test(comparisonText))a.problems.push('Its prose says the alternatives meet the constraints although its own compatibility checks say otherwise.');
    if(violations.length&&a.questions.some(q=>! /\b(?:explicit|proposed|request(?:ed)?)\s+(?:requirement|constraint)\s+change\b/i.test(q)&&/\b(?:deviations?|violations?|eventual\s+consistency)\b.{0,70}\b(?:acceptable|tolerable|permitted|allowed)\b|\b(?:accept|tolerate|allow|permit)\w*\b.{0,70}\b(?:deviations?|violations?)\b|\bmandatory\s+or\s+negotiable\b/i.test(q)))a.problems.push('It asks to tolerate a violation of a recorded constraint instead of treating a requirement change as a separate explicit proposal.');
    const verificationWords=list(a.verification).flatMap(v=>[v.title,...v.steps,v.failure,v.passCriterion]);
    const ownReading=String(packet.sources.find(s=>s.ref===item?.ref)?.excerpt||'');
    const approverOpen=/\bapprov(?:er|al)\s+(?:authorization|authorisation|permissions?|rights)\b.{0,55}\b(?:open|unconfirmed|undefined|unspecified|not\s+(?:agreed|confirmed|defined))\b/i.test(ownReading);
    if(approverOpen&&list(a.verification).some(v=>{
      const steps=v.steps.join(' ');
      const blocked=/\b(?:separately\s+authori[sz]ed\s+approver|approver\s+(?:authorization|authorisation|permissions?)\s+(?:must|needs?|remains?|is\s+(?:open|pending))|confirm\w*\s+(?:the\s+)?approver\s+(?:authorization|authorisation|permissions?))\b/i.test(steps);
      const negative=/\bmakers?\s+without\s+(?:approval|approver)\s+permissions?\b.{0,150}\breject\w*\b/i.test(steps);
      return /\bapprov(?:al|als|e|ing)\b.{0,120}\b(?:using|by|with)\s+(?:a\s+)?makers?\b/i.test(steps)&&!blocked&&!negative;
    }))a.problems.push('The proposed test uses makers for approval while the recorded approver authorization is unresolved. Confirm the approval role as a prerequisite; maker edit/delete permission does not establish it.');
    const said = [a.headline, a.reasoning, ...a.risks, ...a.questions, ...alternativeWords, ...verificationWords, ...a.refinements.map(r => r.why), ...a.proposals.flatMap(x => [x.title, x.scenario, x.consequence])].join('\n');
    const unsupported = uniq((said.match(NUMBER) || []).map(norm).filter(n => Number(n) > 12 && !known.has(n) && !own.has(n)));
    if (unsupported.length) a.problems.push(`It states ${unsupported.slice(0, 3).join(', ')}, which no reading in the packet contains.`);
    // The advice itself may guarantee nothing: that withholds the assessment.
    const claim = overclaim([a.headline, a.reasoning, ...a.risks, ...a.questions, ...alternativeWords, ...verificationWords, ...a.proposals.flatMap(x => [x.title, x.scenario, x.consequence])].join('\n'));
    if (claim) a.problems.push(claim === 'guarantee' ? 'It presents a mechanism or draft as guaranteeing a verified outcome.' : 'It presents an assumption or drafted value as verified.');
    // Refined wording may carry design numbers (a backoff, a retention), but neither it nor its reason may claim
    // a guaranteed or verified outcome: such a refinement is set aside on its own and never applied, and the
    // rest of the advice stands.
    a.refinements = a.refinements.filter(r => {
      const worded = typeof r.value === 'string' ? overclaim(r.value, {drafted: true}) : null, reasoned = worded ? null : overclaim(r.why);
      if (worded) (a.setAside ||= []).push({key: r.key, label: r.label, value: r.value, why: r.why, reason: worded === 'guarantee' ? 'Its wording presents the draft as guaranteeing an outcome, so it is set aside and never applied; the rest of the advice stands.' : 'Its wording presents a drafted value as verified, so it is set aside and never applied; the rest of the advice stands.'});
      if (reasoned) (a.setAside ||= []).push({key: r.key, label: r.label, value: r.value, why: r.why, reason: reasoned === 'guarantee' ? 'Its reason claims the draft guarantees an outcome, so it is set aside and never applied; the rest of the advice stands.' : 'Its reason presents the draft as verified, so it is set aside and never applied; the rest of the advice stands.'});
      return !worded && !reasoned;
    });
  }
  return result;
}

// When an assessment fails a check, or Sol did not reach a decision, the reading stands on its own.
export function withheld(packet, id, issues) {
  const item = packet.items.find(i => i.id === id);
  return {id, verdict: 'insufficient', headline: 'Sol’s reasoning was withheld; the desk’s reading stands.', reasoning: issues.length ? `The assessment did not pass the checks: ${issues.join(' ')}` : 'Sol did not assess this decision in its response.', refinements: [], proposals: [], verification:[], preferred: 'none', risks: [], questions: [], sourceRefs: item?.ref ? [item.ref] : [], withheld: true, issues};
}
// What a second pass found. Its concrete defects decide; it is not trusted where it contradicts itself. A
// defect that only affirms support ("…, so it is supported") is read as the note it is, and a flag that
// disagrees with the defects it names ("unsupported", naming none) is recorded, never relied on. A defect that
// turns after affirming ("supported by S1, but the 5-second window does not appear in any source"), or that names
// what no source states, stays a defect.
const AFFIRMS = /\b(?:is|are|remains?)\s+(?:\w+ly\s+)?(?:supported|acceptable|appropriate)\b|\b(?:so|thus|therefore|all)\s+(?:it is\s+)?(?:supported|acceptable)\b|\bnot (?:an issue|a defect)\b|^no (?:invented|fabricated|unsupported|issues?|defects?)\b|\bno (?:issue|defect)s?\b/i;
const DENIES = /\bnot supported\b|\bunsupported\b|\bcontradict|\bdoes not follow\b|\bnot in the packet\b|\bno reading\b|(?<!\bno )\binvent|(?<!\bno )\bfabricat|\boverstat|\bfalse\b|\bincorrect\b|\bwrong\b|\bmisstat|\bnot (?:true|accurate)\b|\bnot (?:\w+ly )?(?:stated|mentioned|present|found)\b|\b(?:does|do)(?: not|n.t) appear\b|\bno source|\b(?:goes|went) beyond\b|\bunsubstantiated\b|\black(?:s|ing)? (?:\w+ )?support|(?<!\b(?:not|never|without) |n.t )\bexceed|(?<!\b(?:not|never) |n.t )\babsent\b/i;
const TURNS = /\b(?:but|however|although|though|except|yet|whereas)\b/i;
const affirms = d => { const m = AFFIRMS.exec(d); return !!m && !DENIES.test(d) && !TURNS.test(d.slice(m.index + m[0].length)); };
export function reviewFinding(r) {
  if (!r) return {defects: [], notes: [], contradiction: null};
  const defects = [], notes = [...list(r.notes)];
  for (const d of list(r.defects)) (affirms(d) ? notes : defects).push(d);
  const demoted = list(r.defects).length - defects.length, disagrees = r.supported !== !defects.length;
  const asNotes = demoted ? `${demoted} of the defects it named read as support and were taken as notes` : '';
  const note = disagrees && defects.length ? `The source check named ${defects.length} defect${defects.length === 1 ? '' : 's'} while marking it supported; the defects decide.`
    : disagrees ? `The source check marked it unsupported but named no defect${asNotes ? `, and ${asNotes}` : ''}; its flag was not relied on.`
    : asNotes ? `In the source check, ${asNotes}.` : '';
  return {defects, notes, contradiction: note ? {supported: r.supported, defects: defects.length, demoted, note} : null};
}
// New provider responses must account explicitly for the option labels, all
// displayed prose and the requested work. Old saved responses remain readable.
export function validateReasoningReview(raw,packet){
  exact(raw,['assessments'],'review');if(!Array.isArray(raw.assessments))throw Error('The source check returned an unsupported assessment.');
  const ids=raw.assessments.map(r=>r?.id);if(ids.length!==packet.items.length||new Set(ids).size!==ids.length||packet.items.some(it=>!ids.includes(it.id)))throw Error('The source check must reach every selected assessment exactly once.');
  const texts=r=>{const valid=['defects','notes'].every(k=>Array.isArray(r[k])&&r[k].length<=8&&r[k].every(s=>typeof s==='string'));if(valid)for(const k of ['defects','notes'])r[k]=r[k].map(s=>s.slice(0,1600));return valid;};
  for(const r of raw.assessments){exact(r,['id','supported','defects','notes','alternativeFindings','requestFulfillment'],'assessment review');if(typeof r.supported!=='boolean'||!texts(r)||!Array.isArray(r.alternativeFindings))throw Error('The source check returned an unsupported assessment.');const alternatives=packet.items.find(it=>it.id===r.id).allowed.preferred||[],seen=r.alternativeFindings.map(c=>c?.alternativeId);if(seen.length!==alternatives.length||new Set(seen).size!==seen.length||alternatives.some(id=>!seen.includes(id)))throw Error('The source check must assess every supplied alternative exactly once.');for(const c of r.alternativeFindings){exact(c,['alternativeId','classificationMatchesSources','proseConsistent','defects','notes'],'alternative review');if(typeof c.classificationMatchesSources!=='boolean'||typeof c.proseConsistent!=='boolean'||!texts(c))throw Error('The source check returned an unsupported alternative finding.');}exact(r.requestFulfillment,['supported','defects','notes'],'request review');if(typeof r.requestFulfillment.supported!=='boolean'||!texts(r.requestFulfillment))throw Error('The source check returned an unsupported request finding.');}
  return raw;
}
export function settleReasoning(packet, result, review = null) {
  const byId = new Map(result.assessments.map(a => [a.id, a])), contradictions = [], notes = [];
  const assessments = packet.items.map(it => {
    const a = byId.get(it.id), r = review?.assessments?.find(x => x.id === it.id);
    if (!a) return withheld(packet, it.id, []);
    const found = reviewFinding(r);
    if (found.contradiction) contradictions.push({id: it.id, ...found.contradiction});
    if (found.notes.length) notes.push({id: it.id, notes: found.notes.slice(0, 8)});
    const explicit=list(r?.alternativeFindings).flatMap(c=>[...c.defects,...(!(c.classificationMatchesSources??c.classificationSupported)?[`${c.alternativeId}: the source check did not support its compatibility classification.`]:[]),...(!c.proseConsistent?[`${c.alternativeId}: the prose contradicts its compatibility finding or recorded constraint.`]:[])]);
    if(r?.requestFulfillment)explicit.push(...r.requestFulfillment.defects,...(!r.requestFulfillment.supported?['The response did not fulfill the requested reasoning or verification work.']:[]));
    const issues = uniq([...a.problems, ...found.defects, ...explicit, ...(review && !r ? ['The source check did not reach it.'] : [])]);
    return issues.length ? withheld(packet, it.id, issues) : (({problems, ...x}) => ({...x, withheld: false, issues: [], ...(found.contradiction ? {checkNote: found.contradiction.note} : {})}))(a);
  });
  return {summary:assessments.some(a=>a.withheld)?'Some advice was withheld. Read the checked assessments and their unresolved issues below.':result.summary, sourceRefs: result.sourceRefs, assessments, ...(contradictions.length ? {checkContradictions: contradictions} : {}), ...(notes.length ? {checkNotes: notes} : {}), ...(result.setAside ? {setAside: result.setAside} : {}), ...(result.trimmed ? {trimmed: result.trimmed} : {})};
}

// A chapter record's refinements must also pass the chapter's own rules, and the instruments read the
// design again with them: what the chapter's editor would reject is withheld like any failed check,
// and what passes carries the re-reading, so the architect sees what Sol's numbers do before using them.
export function checkRecordRefinements(p, packet, result) {
  return {...result, assessments: result.assessments.map(a => {
    if (a.withheld || !a.refinements?.length || !a.id.startsWith('M:')) return a;
    try { return {...a, reread: describeReread(chapterReread(p, a.id, chapterCommands(p, a.id, Object.fromEntries(a.refinements.map(r => [r.key, r.value])))), {numeric: a.refinements.some(r => typeof r.value === 'number')})}; }
    catch (e) { return withheld(packet, a.id, [`The chapter’s own rules reject its refinements: ${e.message}`]); }
  })};
}

// ---------------------------------------------------------------- record: currency and adoption

// Whether each assessed decision still reads as it did when Sol assessed it.
export function reasoningCurrency(p, run, opts = {}) {
  const req = run?.packet?.request;
  if (!req) return new Map();
  const desk = run.packet.items.some(i => DESK_ID.test(i.id));
  const D = opts.D || (desk ? deskModel(p, {objective: req.objective}) : null), FX = desk ? opts.FX || fixDrafts(D) : null;
  const sources=list(run.packet.sources),currency=new Map(sources.map(s=>[s.id,s.kind==='architecture-intelligence'?architectureIntelligenceCurrent(p,s):s.receipt ? (['product-mechanism', 'playbook-entry'].includes(s.kind) ? modelReceiptCurrent(p, s.receipt) : ['governed-claim', 'brain-method', 'catalogue-description'].includes(s.kind) ? brainSourceCurrent(p, s) : true) : true]));
  // A shared publisher withdrawal can affect several readings. A changed model
  // deduction affects only the items whose packet actually used that scope.
  return new Map(run.packet.items.map(i => [i.id, sources.filter(s=>!list(s.applicableTo).length||s.applicableTo.includes(i.id)).every(s=>currency.get(s.id)) && currentStamp(p, D, FX, i.id, req.values?.[i.id]) === i.stamp]));
}

const pad = n => String(n).padStart(3, '0');
export function adoptReasoning(p, raw, run, at = new Date().toISOString()) {
  if (run?.status !== 'completed' || run.packet?.task !== REASONING_TASK) throw Error('Only a completed, saved assessment can be recorded.');
  const outcome = raw.outcome, itemId = text(raw.itemId, 160);
  if (!['used', 'dismissed', 'applied'].includes(outcome)) throw Error('Say whether the assessment was used, applied or dismissed.');
  const a = list(run.result?.assessments).find(x => x.id === itemId), item = run.packet.items.find(i => i.id === itemId);
  if (!a || !item) throw Error('Choose an assessment from this response.');
  const out = structuredClone(p);
  out.coauthoring ??= {schemaVersion: 1, counters: {source: 0, task: 0}, sources: [], tasks: []};
  out.coauthoring.assessments ??= [];
  out.coauthoring.counters ??= {};
  const records = out.coauthoring.assessments;
  if (records.some(r => r.runId === run.id && r.itemId === itemId && r.outcome === outcome)) return {document: p, selected: records.find(r => r.runId === run.id && r.itemId === itemId && r.outcome === outcome).id};
  if (outcome === 'used' && (a.withheld || !reasoningCurrency(p, {...run, packet: {...run.packet, items: [item]}}).get(itemId))) throw Error('The reading changed since Sol assessed it, or the assessment was withheld. Ask Sol again.');
  if (outcome === 'applied' && !records.some(r => r.runId === run.id && r.itemId === itemId && r.outcome === 'used')) throw Error('Use the assessment before recording that it was applied.');
  const reason = text(raw.reason, 1000);
  if (outcome === 'dismissed' && !reason) throw Error('Say why the advice does not hold.');
  if (records.length >= 400) throw Error('This project has reached its limit of recorded assessments.');
  out.coauthoring.counters.assessment = (out.coauthoring.counters.assessment || 0) + 1;
  const record = {id: 'SA-' + pad(out.coauthoring.counters.assessment), runId: run.id, itemId, title: item.title, kind: item.kind, chapter: item.chapter, verdict: a.verdict, headline: a.headline, outcome, reason, at,
    provider: run.provider, model: run.model, packetStamp: run.packet.stamp, itemStamp: item.stamp, withheld: !!a.withheld, refinements: a.refinements, proposals: a.proposals.length,
    instructions: run.packet.brainReceipt?.instructions || run.instructions || null,
    sources: run.packet.sources.filter(s => a.sourceRefs.includes(s.ref)).map(s => ({ref: s.ref, kind: s.kind, objectId: s.objectId, title: s.title, receipt: s.receipt || null, versionStamp: s.versionStamp || null})),
    authority: 'Sol’s advice, source-checked automatically; the architect’s decision is the change review that follows.'};
  records.push(record);
  return {document: out, selected: record.id};
}
export const assessmentRecords = p => list(p?.coauthoring?.assessments);

// What architects did with Sol's advice, counted from the records the project keeps (round 2, I2-17): per
// chapter, kind of decision, verdict, refined field (knob) and kind of source the advice rested on. One
// advised item counts once, by its last outcome; "taken" is used or applied. Passages and design options
// from Sol's other path are counted from their own records. Counts only: nothing here scores or ranks knowledge.
export function adoptionStatistics(p) {
  const xs = assessmentRecords(p), items = new Map();
  for (const sa of xs) { const k = sa.runId + '|' + sa.itemId, it = items.get(k) || {id: k, chapter: sa.chapter, kind: sa.kind, verdict: sa.verdict, fields: new Set(), sources: new Set(), outcome: null}; it.outcome = sa.outcome; for (const r of list(sa.refinements)) it.fields.add(r.key); for (const s of list(sa.sources)) it.sources.add(s.kind); items.set(k, it); }
  const rows = [...items.values()], taken = it => it.outcome === 'used' || it.outcome === 'applied';
  const by = key => { const m = new Map(); for (const it of rows) for (const k of [].concat(key(it)).filter(x => x != null && x !== '')) { const row = m.get(k) || {key: k, advised: 0, taken: 0, applied: 0, dismissed: 0}; row.advised++; if (taken(it)) row.taken++; if (it.outcome === 'applied') row.applied++; if (it.outcome === 'dismissed') row.dismissed++; m.set(k, row); } return [...m.values()].map(r => ({...r, acceptance: r.advised ? Number((r.taken / r.advised).toFixed(3)) : null})).sort((a, b) => b.advised - a.advised || String(a.key).localeCompare(String(b.key))); };
  const passages = list(p?.coauthoring?.narratives).filter(n => n.generation), designs = list(p?.coauthoring?.designTasks).filter(t => t.generation);
  return {records: xs.length, items: rows.length, taken: rows.filter(taken).length, applied: rows.filter(it => it.outcome === 'applied').length, dismissed: rows.filter(it => it.outcome === 'dismissed').length,
    acceptance: rows.length ? Number((rows.filter(taken).length / rows.length).toFixed(3)) : null,
    byChapter: by(it => it.chapter), byKind: by(it => it.kind), byVerdict: by(it => it.verdict), byField: by(it => [...it.fields]), bySource: by(it => [...it.sources]),
    passages: {drafted: passages.length, accepted: passages.filter(n => n.accepted).length}, designs: {opened: designs.length, applied: designs.filter(t => t.status === 'applied').length},
    learned: list(p?.knowledge?.stewardship).filter(d => d.decision === 'captured').length,
    // Advice taken whose knowledge has since been withdrawn: the stewards' queue holds each one for review.
    withdrawnBasis: (() => { try { return stewardQueue(p).items.filter(i => i.kind === 'withdrawn').length; } catch { return 0; } })()};
}
