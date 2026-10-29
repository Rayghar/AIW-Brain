// What a project already says about a field (round 2, I2-12; audit/round2/04_BRAIN.md §4, 06_ARCHIVE_ADOPTION.md §6).
//
// The field spark (field-spark.js) and the Co-author panel (coauthor-ui.js) offer values for the free-text fields of
// the records of Chapters 1–11 (the Chapter 1–3 page apps and the Chapter 4–11 studios) in three bands, always in
// this order:
//   Stated    — a value copied verbatim from a record the project already holds (a requirement, a quality driver, a
//               decision, a sibling record, a journey step), with the record it was copied from (band 'project');
//   Inferred  — a value the chapter guide or the journey already implies (an owner named on a linked record, the
//               responsibilities a group's other members own), asked as a question the person answers (band 'confirm');
//   Sol draft — a server-recorded model draft (intelligence-service.js, mode 'field'); not produced here.
// The words are the one provenance vocabulary (provenance-words.js, round 11); the bands keep their recorded keys.
// This module is the first two bands: pure rules over the saved document. It reads project records only — never
// candidate or discovery knowledge, never a model — and no offer carries a score or a rank. An offer is an
// invitation: accepting it fills the open form, and only the chapter's own command, submitted by a person, saves it
// (with `solSuggestions` provenance that worker.js validates and stores as `provenance.suggestions[]`).
//
// It also holds what the server and the client share about that provenance: which records carry it, which fields a
// spark serves and which Sol may draft, and the Co-author dispositions (`coauthor.disposition`, a workspace record,
// not a canonical design change).
import {FORM_IDS, fieldsFor, fieldOf} from './record-fields.js';
import {CHAPTER_METHODS} from './chapter-methods.js';
import {remember} from './document-memo.js';
import {provenanceWord} from './provenance-words.js';
import {driverScope,driversForComponent,driversForRequirement} from './driver-scope.js';
import {linkedRequirementIds} from './requirement-links.js';

const list = v => Array.isArray(v) ? v : [];
const str = v => typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
const uniq = xs => [...new Set(xs)];

export const SUGGESTION_SOURCES = ['project', 'confirm', 'sol'];
export const MAX_SUGGESTIONS = 40;
export const BAND_LABELS = {project: provenanceWord('project'), confirm: provenanceWord('confirm'), sol: provenanceWord('sol')};

// ---------------------------------------------------------------- the records that carry provenance

const CHAPTERS = {brief: 1, artefact: 1, quality: 2, decision: 3, logical: 4, realisation: 5, technology: 6, techrealisation: 7, interfaces: 8, security: 9, runtime: 10, review: 11};
export const chapterOf = command => CHAPTERS[String(command || '').split('.')[0]] || null;
// The narrative is one record under one name ('SDD'), as chapter-reasoning.js reads it; the brief is one record too,
// addressed as 'brief' (as refExists reads it). Neither carries an id of its own.
const narrative = p => p?.finalReview?.narrative ? [p.finalReview.narrative] : [];
const SINGLETONS = {'review.narrative': 'SDD', brief: 'brief'};
export const singletonId = command => SINGLETONS[command] || null;
export const RECORD_COLLECTIONS = {
  // Chapters 1–3 (the page apps): the brief, every artefact type, quality drivers and conflicts, decisions and the
  // alternatives nested in them (alternative ids are unique across the project: ALT-001, ALT-002, …).
  brief: p => p?.brief ? [p.brief] : [], artefact: p => p?.artefacts,
  'quality.driver': p => p?.quality?.drivers, 'quality.conflict': p => p?.quality?.conflicts,
  'decision.save': p => p?.decisions?.records, 'decision.alternative': p => list(p?.decisions?.records).flatMap(d => list(d?.alternatives)),
  'logical.responsibility': p => p?.logical?.responsibilities, 'logical.group': p => p?.logical?.groups,
  'logical.connection': p => p?.logical?.connections, 'logical.mapping': p => p?.logical?.mappings,
  // A reviewed ghost (round 11): its form is sparked like a responsibility's, and what it saves is a responsibility
  // or an asset, so it holds no records of its own (worker.js suggestionTypes maps its save to the logical types).
  'logical.candidate': () => [],
  'realisation.component': p => p?.realisation?.components, 'realisation.interaction': p => p?.realisation?.connections,
  'technology.capability': p => p?.technology?.capabilities, 'technology.dependency': p => p?.technology?.dependencies, 'technology.boundary': p => p?.technology?.boundaries,
  'techrealisation.plan': p => p?.technologyRealisation?.records, 'techrealisation.connection': p => p?.technologyRealisation?.connections,
  'interfaces.contract': p => p?.interfaces?.contracts, 'interfaces.data': p => p?.interfaces?.data, 'interfaces.party': p => p?.interfaces?.parties, 'interfaces.lineage': p => p?.interfaces?.lineage,
  // A data field is nested in its definition (ids are unique across the project: DF-001, DF-002, …).
  'interfaces.field': p => list(p?.interfaces?.data).flatMap(d => list(d?.fields)),
  'security.threat': p => p?.security?.threats, 'security.control': p => p?.security?.controls,
  'runtime.environment': p => p?.runtime?.environments, 'runtime.zone': p => p?.runtime?.zones, 'runtime.plan': p => p?.runtime?.plans, 'runtime.placement': p => p?.runtime?.placements, 'runtime.path': p => p?.runtime?.paths,
  'review.action': p => p?.finalReview?.actions, 'review.narrative': narrative,
};
// What one record of each type is called in a sentence ("a new quality scenario"); an artefact is named by its own
// type (requirement, constraint, …) where the record gives one.
const RECORD_NOUNS = {
  brief: 'project brief', artefact: 'artefact', 'quality.driver': 'quality scenario', 'quality.conflict': 'quality conflict',
  'decision.save': 'decision', 'decision.alternative': 'alternative',
  'logical.responsibility': 'responsibility', 'logical.group': 'responsibility group', 'logical.connection': 'logical connection', 'logical.mapping': 'logical-to-physical mapping', 'logical.candidate': 'candidate responsibility',
  'realisation.component': 'component', 'realisation.interaction': 'component interaction',
  'technology.capability': 'platform capability', 'technology.dependency': 'technology dependency', 'technology.boundary': 'technology boundary',
  'techrealisation.plan': 'technology realization', 'techrealisation.connection': 'realization connection',
  'interfaces.contract': 'interface contract', 'interfaces.data': 'data definition', 'interfaces.field': 'data field', 'interfaces.party': 'party', 'interfaces.lineage': 'data lineage',
  'security.threat': 'threat', 'security.control': 'control',
  'runtime.environment': 'environment', 'runtime.zone': 'zone', 'runtime.plan': 'runtime plan', 'runtime.placement': 'placement', 'runtime.path': 'runtime path',
  'review.action': 'delivery action', 'review.narrative': 'SDD narrative',
};
export const recordNoun = (command, record = null) => (command === 'artefact' && typeof record?.type === 'string' && record.type.trim() ? record.type.trim().toLowerCase() : RECORD_NOUNS[command] || 'record');
export const supported = command => Object.hasOwn(RECORD_COLLECTIONS, command);
export const recordsOf = (p, command) => list(RECORD_COLLECTIONS[command]?.(p));
// The narrative and the brief have no id of their own; they are addressed as 'SDD' and 'brief' (or with no id).
export const recordOf = (p, command, id) => singletonId(command) ? (!id || id === singletonId(command) ? recordsOf(p, command)[0] || null : null) : (id ? recordsOf(p, command).find(r => r?.id === id) || null : null);
// The record a saving command's payload names: its id or, for an alternative (nested in a decision, whose id the
// payload carries as `id`), its `alternativeId`. Null for a new record or a singleton.
export const carriedRecordId = (type, payload) => (type === 'decision.alternative' ? payload?.alternativeId : type === 'interfaces.field' ? payload?.field?.id : payload?.id) ?? null;
// The one record of these types a command added (a new conflict or alternative, whose command answers with no id
// of its own), or null when it added none or several.
export function addedRecordId(prior, next, types) {
  const added = [];
  for (const t of types) { const before = new Set(recordsOf(prior, t).map(r => r?.id).filter(Boolean)); for (const r of recordsOf(next, t)) if (r?.id && !before.has(r.id)) added.push(r.id); }
  return added.length === 1 ? added[0] : null;
}
// The record types a command prefix saves (a reviewed proposal, `security.proposal`, saves one of them).
export const commandsOfPrefix = prefix => Object.keys(RECORD_COLLECTIONS).filter(c => c.startsWith(prefix + '.') && !c.endsWith('.candidate'));
export const commandForForm = formId => Object.entries(FORM_IDS).find(([, id]) => id === formId)?.[0] || null;
export const formFor = command => FORM_IDS[command] || null;
export {fieldOf};

// The fields a spark serves: free text only. Numbers, selects, dates, ids and checkboxes never get one, nor does the
// free text of a measured target (a driver's metric, unit and window: `measure` in record-fields.js).
export const sparkFields = command => supported(command) ? fieldsFor(command).filter(d => (d.kind === 'text' || d.kind === 'textarea') && !d.measure && !d.form) : [];
// The fields Sol may draft: free text that is not an owner, an identifier, evidence, a source or the basis of a
// number. A person records those (04_BRAIN.md §4.5: no owner, identifier, number, test result or approval is drafted).
const NO_DRAFT = new Set(['owner', 'recoveryOwner', 'evidence', 'assumptionEvidence', 'source', 'contractVersion', 'releaseReference', 'correlationKey', 'idempotencyKey', 'timeoutBasis', 'capacityBasis', 'targetsBasis', 'retentionBasis', 'costBasis', 'capacityUnit', 'currency', 'name', 'example', 'enumeration', 'due', 'route']);
export const draftable = (command, name) => sparkFields(command).some(d => d.name === name) && !NO_DRAFT.has(name);
// The links a form chooses that the rules follow (a checkbox group or a select), whether or not the record type's
// descriptors list them (a control's targets and threats are drawn by its studio beside the described fields). Two
// come from the page app rather than a control (sparkStudio's `links`): the decision an alternative is nested in
// (decisionId) and the artefacts a new Chapter 1 record will be linked to once saved (linkedIds).
export const LINK_FIELDS = new Set(['requirementIds', 'decisionIds', 'driverIds', 'logicalIds', 'dataIds', 'needIds', 'capabilityIds', 'targetIds', 'threatIds', 'controlIds', 'assetIds', 'requestData', 'responseData', 'groupId', 'logicalId', 'physicalId', 'from', 'to', 'assetId', 'contractId', 'authorityId', 'decisionId', 'linkedIds']);
export const maxLengthOf = (command, name) => { const d = fieldOf(command, name); return d?.maxlength || (d?.kind === 'text' ? 300 : 2400); };

// ---------------------------------------------------------------- lookups over the saved document

const ARTEFACTS = p => list(p?.artefacts);
const requirement = (p, id) => ARTEFACTS(p).find(a => a.id === id && a.type === 'requirement') || null;
const responsibility = (p, id) => list(p?.logical?.responsibilities).find(r => r.id === id) || null;
const component = (p, id) => list(p?.realisation?.components).find(c => c.id === id) || null;
const capability = (p, id) => list(p?.technology?.capabilities).find(c => c.id === id) || null;
const realisationRecord = (p, id) => list(p?.technologyRealisation?.records).find(r => r.id === id) || null;
const contract = (p, id) => list(p?.interfaces?.contracts).find(c => c.id === id) || null;
const dataRecord = (p, id) => list(p?.interfaces?.data).find(d => d.id === id) || null;
const party = (p, id) => list(p?.interfaces?.parties).find(x => x.id === id) || null;
const threat = (p, id) => list(p?.security?.threats).find(t => t.id === id) || null;
const control = (p, id) => list(p?.security?.controls).find(c => c.id === id) || null;
const decision = (p, id) => list(p?.decisions?.records).find(d => d.id === id) || null;
const driver = (p, id) => list(p?.quality?.drivers).find(d => d.id === id) || null;
// Chapter 1: any artefact, and the artefacts linked to a record — through the saved relationships (either direction)
// and, for a record not saved yet, through the links its editor will add when it is saved (linkedIds). The links are
// indexed once per settled document (document-memo.js; afresh for any other), so the Co-author list stays linear.
const artefactIndex = p => remember(p, 'field-suggestions:artefacts', 'index', () => {
  const byId = new Map(ARTEFACTS(p).map(a => [a.id, a])), linked = new Map(), link = (a, b) => { if (!linked.has(a)) linked.set(a, []); linked.get(a).push(b); };
  for (const x of list(p?.relationships)) { link(x.from, x.to); link(x.to, x.from); }
  return {byId, linked};
});
const artefact = (p, id) => artefactIndex(p).byId.get(id) || null;
function linkedArtefacts(p, r) {
  const {byId, linked} = artefactIndex(p), out = new Map(), add = a => { if (a && a.id !== r.id && !out.has(a.id)) out.set(a.id, a); };
  if (r.id) for (const id of linked.get(r.id) || []) add(byId.get(id));
  for (const id of list(r.linkedIds)) add(byId.get(id));
  return [...out.values()];
}
const ofType = (xs, type) => xs.filter(a => a.type === type);
// The decision an alternative is nested in: the one its editor names (decisionId), else the one that holds it.
const decisionOf = (p, r) => decision(p, r.decisionId) || (r.id ? list(p?.decisions?.records).find(d => list(d.alternatives).some(a => a.id === r.id)) || null : null);
// The given / when / then clauses of a recorded acceptance criterion, each verbatim with its keyword (capitalised).
function clauses(text) {
  const m = /^\s*given\s+([\s\S]+?),\s*when\s+([\s\S]+?),\s*then\s+([\s\S]+?)\s*$/i.exec(str(text));
  return m ? {given: 'Given ' + m[1], when: 'When ' + m[2], then: 'Then ' + m[3]} : null;
}
// A recorded sentence read inside another one: its first letter lowered unless it starts an acronym or a name.
const inline = t => /^[A-Z][a-z]/.test(str(t)) ? str(t)[0].toLowerCase() + str(t).slice(1) : str(t);
const BRIEF = {id: 'brief', ref: 'Brief'};
// A participant's name: a component, a party outside the design, a realisation or a responsibility.
const titleOf = (p, id) => (component(p, id) || party(p, id) || realisationRecord(p, id) || responsibility(p, id) || contract(p, id) || dataRecord(p, id) || capability(p, id))?.title || id;
const refOf = r => r?.ref || r?.id || '';
// The components a responsibility is allocated to, and the responsibilities a component realises.
const componentsOf = (p, logicalId) => list(p?.logical?.mappings).filter(m => m.logicalId === logicalId).map(m => component(p, m.physicalId)).filter(Boolean);
const responsibilitiesOf = (p, componentId) => list(p?.logical?.mappings).filter(m => m.physicalId === componentId).map(m => responsibility(p, m.logicalId)).filter(Boolean);
// The quality drivers that ask something of a component (through the responsibilities it realises).
const driversOfComponent = (p, componentId) => { const rs = new Set(responsibilitiesOf(p, componentId).map(r => r.id)); return list(p?.quality?.drivers).filter(d => list(d.responsibilityIds).some(id => rs.has(id))); };
// The platform capabilities an application needs, and the realisations that realise a capability.
const capabilitiesOfApplication = (p, appId) => { const needs = new Set(list(p?.technology?.needs).filter(n => n.applicationId === appId).map(n => n.id)); return uniq(list(p?.technology?.mappings).filter(m => needs.has(m.needId)).map(m => m.capabilityId)).map(id => capability(p, id)).filter(Boolean); };
const realisationsOfCapability = (p, capId) => list(p?.technologyRealisation?.mappings).filter(m => m.capabilityId === capId).map(m => realisationRecord(p, m.realizationId)).filter(Boolean);
const capabilitiesOfRealisation = (p, recId) => list(p?.technologyRealisation?.mappings).filter(m => m.realizationId === recId).map(m => capability(p, m.capabilityId)).filter(Boolean);
// An owner that only asks for one ("Confirm control owner") is no owner to offer.
const placeholder = v => !str(v) || /^(?:confirm|tbd|to be (?:confirmed|decided)|unassigned|unknown|n\/a|none)\b/i.test(str(v));
// The first sentence of a recorded text, verbatim.
export function firstSentence(text) { const t = str(text); const m = /^([\s\S]{12,600}?[.!?])(?:\s|$)/.exec(t); return m ? m[1] : t.slice(0, 600); }
const controlsOn = (p, ids) => { const s = new Set(ids.filter(Boolean)); return list(p?.security?.controls).filter(c => list(c.targetIds).some(id => s.has(id))); };
const TRANSPORT = /transport|network|service trust|encrypt|tls/i;

// Every identifier the project holds, so that a cited reference can be checked (worker.js refuses a reference the
// project does not hold). Records, artefacts, drivers, decisions and their alternatives, groups, links and fields.
export function refExists(p, ref) {
  const id = str(ref);
  if (!id || id.length > 160) return false;
  if (id === 'brief') return !!p?.brief;
  if (id === 'SDD') return !!p?.finalReview?.narrative;
  for (const get of Object.values(RECORD_COLLECTIONS)) if (list(get(p)).some(r => r?.id === id)) return true;
  if (ARTEFACTS(p).some(a => a.id === id) || list(p?.quality?.drivers).some(d => d.id === id)) return true;
  for (const d of list(p?.decisions?.records)) if (d.id === id || list(d.alternatives).some(a => a.id === id)) return true;
  if (list(p?.technology?.needs).some(n => n.id === id) || list(p?.technology?.mappings).some(m => m.id === id) || list(p?.technologyRealisation?.mappings).some(m => m.id === id)) return true;
  for (const d of list(p?.interfaces?.data)) if (list(d.fields).some(f => f.id === id)) return true;
  return false;
}

// ---------------------------------------------------------------- the offers, per record type

// An offer: the field, the value, the record it comes from (ref: its id; refLabel: what a person reads, e.g. REQ-001
// or LR-001) and why. A 'confirm' offer also carries the question it answers.
const P = (field, value, from, why) => ({band: 'project', field, value: str(value), ref: from.id, refLabel: refOf(from), why});
const C = (field, value, from, why, question = '') => ({band: 'confirm', field, value: str(value), ref: from.id, refLabel: refOf(from), why, question});

const PROVIDERS = {
  // ---- Chapter 1: the brief and its artefacts (requirements.js)
  brief(p) {
    const out = [], arts = ARTEFACTS(p);
    // The goal: the observable change the project's outcomes record.
    for (const o of ofType(arts, 'outcome').filter(o => o.description)) out.push(P('goal', o.description, o, `The outcome ${o.id} ${o.title} records.`));
    // The source most of the Chapter 1 records name, to confirm (asked in the guide's words).
    const counts = new Map();
    for (const a of arts) if (str(a.source) && !placeholder(a.source)) counts.set(str(a.source), [...(counts.get(str(a.source)) || []), a]);
    const [source, holders] = [...counts.entries()].sort((x, y) => y[1].length - x[1].length)[0] || [];
    if (source) out.push(C('source', source, holders[0], `${holders.length} of ${arts.length} Chapter 1 records name this source (${holders.slice(0, 3).map(a => a.id).join(', ')}${holders.length > 3 ? ', …' : ''}).`));
    return out;
  },
  artefact(p, r) {
    const out = [], type = str(r.type) || (r.id ? artefact(p, r.id)?.type : '') || '', links = linkedArtefacts(p, r), brief = p?.brief || {};
    const journeys = ofType(links, 'journey'), outcomes = ofType(links, 'outcome'), reqs = ofType(links, 'requirement');
    if (type === 'requirement') {
      // A requirement's behaviour and acceptance follow the journey step that requires it, who takes part in that
      // step, and the outcome it delivers.
      for (const j of journeys) if (j.description) out.push(P('description', j.description, j, `The description of ${j.id} ${j.title}, the journey step this requirement serves.`));
      for (const o of outcomes) if (o.description) out.push(P('description', o.description, o, `The outcome ${o.id} ${o.title} this requirement delivers.`));
      for (const j of journeys) {
        const actor = ofType(linkedArtefacts(p, j), 'actor')[0];
        for (const o of outcomes.filter(o => o.description)) out.push(C('acceptance', `Given ${actor ? actor.title + ' at ' : ''}“${j.title}”, when the step completes, then ${inline(o.description).replace(/[.!?]?$/, '.')}`, j, `${j.id} ${j.title} requires this requirement${actor ? `, ${actor.id} ${actor.title} takes part in it,` : ''} and ${o.id} ${o.title} is the outcome it delivers.`, `Does ${r.id || 'this requirement'} pass when ${o.id} ${o.title} is observed at the end of ${j.id} ${j.title}?`));
      }
    } else if (type === 'journey') {
      for (const q of reqs) if (q.description) out.push(P('description', firstSentence(q.description), q, `The description of ${q.id} ${q.title}, a requirement this step requires.`));
    } else if (type === 'outcome') {
      if (brief.goal) out.push(P('description', brief.goal, BRIEF, 'The goal the project brief records.'));
    } else if (type === 'constraint') {
      if (brief.problem) out.push(P('description', brief.problem, BRIEF, 'The problem the project brief records; a constraint names what limits the answer to it.'));
    } else if (type === 'actor' && journeys.length) {
      out.push(C('description', `Takes part in ${journeys.map(j => `${j.id} ${j.title}`).join('; ')}.`, journeys[0], `The journey steps linked to this actor (${journeys.map(j => j.id).join(', ')}).`, 'Is this what this actor does in the journey?'));
    } else if (type === 'stakeholder' && outcomes.length) {
      out.push(C('description', `Accountable for ${outcomes.map(o => `${o.id} ${o.title}`).join('; ')}.`, outcomes[0], `The outcomes linked to this stakeholder (${outcomes.map(o => o.id).join(', ')}).`, 'Is this what this stakeholder is accountable for?'));
    } else if (type === 'scope' && journeys.length) {
      out.push(C('description', `${r.scopeMode === 'out' ? 'Out of scope' : 'In scope'}: ${journeys.map(j => j.title).join(', ')}.`, journeys[0], `The journey steps linked to this scope boundary (${journeys.map(j => j.id).join(', ')}).`, 'Does this boundary cover these journey steps?'));
    }
    // Every artefact type: its source as the brief records it, and owners named on the records linked to it.
    if (str(brief.source) && !placeholder(brief.source)) out.push(P('source', brief.source, BRIEF, 'The source the project brief records.'));
    for (const a of links) if (str(a.source) && !placeholder(a.source)) out.push(P('source', a.source, a, `The source ${a.id} ${a.title}, linked to this record, names.`));
    for (const a of links) if (!placeholder(a.owner)) out.push(C('owner', a.owner, a, `${a.id} ${a.title}, linked to this record, is owned by ${a.owner}.`, `Is ${a.owner}, who owns ${a.id}, accountable for this record too?`));
    return out;
  },
  // ---- Chapter 2: quality drivers and their conflicts (quality.js)
  'quality.driver'(p, r) {
    const out = [], reqs = list(r.requirementIds).map(id => requirement(p, id)).filter(Boolean);
    for (const q of reqs) {
      // The scenario reads the requirement's acceptance criteria: given → conditions, when → stimulus, then → response.
      const k = clauses(q.acceptance);
      if (k) {
        out.push(P('stimulus', k.when, q, `The “when” clause of ${q.id}’s acceptance criteria.`));
        out.push(P('conditions', k.given, q, `The “given” clause of ${q.id}’s acceptance criteria.`));
        out.push(P('response', k.then, q, `The “then” clause of ${q.id}’s acceptance criteria.`));
      }
      if (q.description) out.push(P('response', firstSentence(q.description), q, `The description of ${q.id} ${q.title}, the requirement this scenario covers.`));
      if (q.acceptance) out.push(P('measurement', q.acceptance, q, `The acceptance criteria ${q.id} records; the scenario is verified against them.`));
      if (q.source) out.push(P('source', `${q.id}: ${q.source}`, q, `The source ${q.id} records.`));
      if (!placeholder(q.owner)) out.push(C('owner', q.owner, q, `${q.id}, which this scenario covers, names ${q.owner} as its owner.`, `Is ${q.owner}, who owns ${q.id}, accountable for this scenario too?`));
      const o = ofType(linkedArtefacts(p, q), 'outcome')[0];
      out.push(C('rationale', `${q.id} ${q.title} ${q.priority ? `is a ${q.priority} requirement` : 'has no stated priority'}${o ? ` and delivers ${o.id} ${o.title}` : ''}.`, q, `${q.priority ? 'The priority' : 'The missing priority'} ${q.id} records${o ? ' and the outcome it delivers' : ''}.`, q.priority ? `Does this scenario take its priority from ${q.id}?` : `What priority should the architect assign to this scenario and ${q.id}?`));
    }
    if (reqs.length && p?.brief?.goal) out.push(C('rationale', p.brief.goal, BRIEF, 'The goal the project brief records, which the requirements this scenario covers serve.', 'Does this scenario’s priority follow from the brief’s goal?'));
    return out;
  },
  'quality.conflict'(p, r) {
    const out = [], [a, b] = uniq([r.driver0 || list(r.driverIds)[0], r.driver1 || list(r.driverIds)[1]].filter(Boolean)).map(id => driver(p, id));
    if (!a || !b) return out;
    if (a.response && b.response) out.push(C('effect', `${a.id} ${a.title} asks: ${a.response} ${b.id} ${b.title} asks: ${b.response}`, a, `The responses ${a.id} and ${b.id} record.`, `Do ${a.id} and ${b.id} ask competing things of the same part of the design?`));
    out.push(C('title', `${a.title} versus ${b.title}`, a, `The two drivers this record sets against each other (${a.id}, ${b.id}).`, `Is this the trade-off between ${a.id} and ${b.id}?`));
    for (const x of [a, b]) if (!placeholder(x.owner)) out.push(C('owner', x.owner, x, `${x.id} ${x.title} is owned by ${x.owner}.`, `Is ${x.owner}, who owns ${x.id}, accountable for resolving this conflict?`));
    // A decision that weighs both drivers says how the trade-off is settled.
    for (const d of list(p?.decisions?.records).filter(d => list(d.driverIds).includes(a.id) && list(d.driverIds).includes(b.id))) {
      if (d.rationale) out.push(P('resolution', d.rationale, d, `The rationale of ${d.id}, a decision that weighs both drivers.`));
      const chosen = list(d.alternatives).find(x => x.id === d.selectedAlternativeId);
      if (chosen) out.push(C('resolution', `${d.id} chooses ${chosen.title}${chosen.summary ? ': ' + chosen.summary : '.'}`, d, `The working choice of ${d.id}, a decision that weighs both drivers.`, `Does ${d.id}’s choice settle this trade-off?`));
    }
    return out;
  },
  // ---- Chapter 3: decisions and their alternatives (decisions.js)
  'decision.save'(p, r) {
    const out = [], reqs = list(r.requirementIds).map(id => requirement(p, id)).filter(Boolean), drivers = list(r.driverIds).map(id => driver(p, id)).filter(Boolean);
    // The context names what shapes the choice (asked in the guide's words), and the constraints on its requirements.
    if (reqs.length || drivers.length) out.push(C('context', `Shaped by ${[...drivers.map(x => `${x.id} ${x.title} (${x.priority})`), ...reqs.map(q => `${q.id} ${q.title}`)].join('; ')}.`, drivers[0] || reqs[0], `The quality drivers and requirements this question links.`));
    for (const q of reqs) for (const c of ofType(linkedArtefacts(p, q), 'constraint')) if (c.description) out.push(P('context', c.description, c, `The constraint ${c.id} ${c.title} on ${q.id}, a requirement this question links.`));
    // The rationale: the working choice, then why each linked driver matters, as it records.
    const chosen = r.id ? list(decision(p, r.id)?.alternatives).find(x => x.id === decision(p, r.id)?.selectedAlternativeId) : null;
    if (chosen) {
      if (chosen.benefits) out.push(P('rationale', chosen.benefits, chosen, `The benefits ${chosen.id} ${chosen.title}, the working choice, records.`));
      const supports = drivers.filter(x => chosen.assessments?.[x.id]?.effect === 'supports');
      if (supports.length) out.push(C('rationale', `${chosen.title}: the comparison records that it supports ${supports.map(x => `${x.id} ${x.title}`).join(', ')}.`, chosen, `How the comparison of ${chosen.id}, the working choice, records its effect on the linked drivers.`, 'Is this why this choice is made?'));
      if (chosen.costs) out.push(P('risks', chosen.costs, chosen, `The costs and trade-offs ${chosen.id} ${chosen.title}, the working choice, records.`));
      if (chosen.consequences) out.push(P('risks', chosen.consequences, chosen, `The consequences ${chosen.id} ${chosen.title}, the working choice, records.`));
    }
    for (const x of drivers) if (x.rationale) out.push(P('rationale', x.rationale, x, `Why ${x.id} ${x.title} matters, as it records; this question weighs it.`));
    for (const x of drivers) if (x.tactic) out.push(P('mitigation', x.tactic, x, `The candidate tactic ${x.id} ${x.title} names for evaluation.`));
    for (const q of reqs) for (const a of ofType(linkedArtefacts(p, q), 'assumption')) if (a.description) out.push(P('assumptions', a.description, a, `The assumption ${a.id} ${a.title} on ${q.id}, a requirement this question links.`));
    for (const q of reqs) if (q.source) out.push(P('source', `${q.id}: ${q.source}`, q, `The source ${q.id} records.`));
    for (const x of [...drivers, ...reqs]) if (!placeholder(x.owner)) out.push(C('owner', x.owner, x, `${x.id} ${x.title}, which this question links, is owned by ${x.owner}.`, `Is ${x.owner}, who owns ${x.id}, accountable for this decision?`));
    return out;
  },
  'decision.alternative'(p, r) {
    const out = [], d = decisionOf(p, r);
    if (!d) return out;
    for (const x of list(d.driverIds).map(id => driver(p, id)).filter(Boolean)) {
      // An approach to the decision's question: a tactic a driver names for evaluation (asked against the question).
      if (x.tactic) {
        out.push(P('pattern', x.tactic, x, `The candidate tactic ${x.id} ${x.title} names for evaluation.`));
        out.push(C('summary', x.tactic, x, `The candidate tactic ${x.id} ${x.title} names; ${d.id} weighs ${x.id}.`, `Is this the approach to answer ${d.id}: “${d.question}”?`));
      }
      // Its consequences for the design: what each driver the decision weighs asks for.
      if (x.response) out.push(C('consequences', `Bears on ${x.id} ${x.title} (${x.priority}): ${x.response}`, x, `${d.id} compares its alternatives against ${x.id}; this is the response ${x.id} asks for.`, `Does this alternative change how ${x.id} ${x.title} is met?`));
      // What its own comparison records, once saved.
      const effect = r.assessments?.[x.id]?.effect;
      if (effect === 'supports') out.push(C('benefits', `Supports ${x.id} ${x.title}.`, x, `This alternative’s comparison records that it supports ${x.id}.`, `Is supporting ${x.id} a benefit of this alternative?`));
      if (effect === 'tension') out.push(C('costs', `Creates tension with ${x.id} ${x.title}.`, x, `This alternative’s comparison records a tension with ${x.id}.`, `Is the tension with ${x.id} a cost of this alternative?`));
      if (effect === 'violates') out.push(C('costs', `Breaks ${x.id} ${x.title}.`, x, `This alternative’s comparison records that it breaks ${x.id}.`, `Is breaking ${x.id} why this alternative is not chosen?`));
    }
    return out;
  },
  // ---- Chapters 4–11 (the studios)
  'logical.responsibility'(p, r) {
    const out = [], reqs = list(r.requirementIds).map(id => requirement(p, id)).filter(Boolean);
    for (const q of reqs) {
      if (q.description) out.push(P('purpose', firstSentence(q.description), q, `The description of ${q.id}, the requirement this responsibility serves.`));
      if (q.source) out.push(P('source', `${q.id}: ${q.source}`, q, `The source ${q.id} records.`));
      if (!placeholder(q.owner)) out.push(C('owner', q.owner, q, `${q.id}, which this responsibility serves, names ${q.owner} as its owner.`));
    }
    // A journey step no responsibility carries yet: the requirements nothing owns.
    if (!reqs.length) {
      const carried = new Set(list(p?.logical?.responsibilities).filter(x => x.id !== r.id).flatMap(x => list(x.requirementIds)));
      for (const q of ARTEFACTS(p).filter(a => a.type === 'requirement' && !carried.has(a.id) && a.description).slice(0, 2)) out.push(C('purpose', firstSentence(q.description), q, `${q.id} is a requirement no responsibility carries yet; link it in the traceability step if this responsibility owns it.`, `Does this responsibility own ${q.id} · ${q.title}?`));
    }
    const group = list(p?.logical?.groups).find(g => g.id === r.groupId), siblings = group ? list(p?.logical?.responsibilities).filter(x => x.groupId === group.id && x.id !== r.id) : [];
    if (siblings.length) out.push(C('boundary', `Outside this responsibility: ${siblings.map(x => x.title).join('; ')}, owned by the other responsibilities in ${group.title}.`, group, `The other responsibilities in ${group.id} ${group.title} own these.`));
    for (const d of list(r.decisionIds).map(id => decision(p, id)).filter(Boolean)) if (!placeholder(d.owner)) out.push(C('owner', d.owner, d, `${d.id}, a decision this responsibility follows, is owned by ${d.owner}.`));
    if (r.id) for (const c of componentsOf(p, r.id)) if (!placeholder(c.owner)) out.push(C('owner', c.owner, c, `${refOf(c)} ${c.title}, which realises this responsibility, is owned by ${c.owner}.`));
    return out;
  },
  'logical.group'(p, r) {
    const members = r.id ? list(p?.logical?.responsibilities).filter(x => x.groupId === r.id) : [];
    return members.length ? [C('purpose', `Holds ${members.map(x => x.title).join(', ')}.`, members[0], `The responsibilities filed in this group.`)] : [];
  },
  'logical.mapping'(p, r) {
    const out = [], lr = responsibility(p, r.logicalId), app = component(p, r.physicalId);
    if (lr) {
      if (lr.boundary) out.push(P('scope', lr.boundary, lr, `The boundary ${refOf(lr)} records.`));
      if (lr.purpose) out.push(P('componentPurpose', lr.purpose, lr, `The purpose ${refOf(lr)} records.`));
      if (lr.title) out.push(C('componentTitle', lr.title, lr, `The name of the responsibility it realises.`));
      if (!placeholder(lr.owner)) out.push(C('owner', lr.owner, lr, `${refOf(lr)} names ${lr.owner} as its owner.`));
    }
    if (app && !placeholder(app.owner)) out.push(C('owner', app.owner, app, `${refOf(app)} ${app.title} is owned by ${app.owner}.`));
    return out;
  },
  'logical.connection'(p, r) {
    const out = [], froms = new Set(componentsOf(p, r.from).map(c => c.id)), tos = new Set(componentsOf(p, r.to).map(c => c.id));
    for (const x of list(p?.realisation?.connections).filter(x => froms.has(x.from) && tos.has(x.to))) {
      if (x.condition) out.push(P('condition', x.condition, x, `The condition ${x.id} records between the components that realise both ends.`));
      if (x.label) out.push(P('label', x.label, x, `What ${x.id} calls the interaction between the components that realise both ends.`));
    }
    return out;
  },
  'realisation.component'(p, r) {
    const out = [], ids = list(r.logicalIds).length ? list(r.logicalIds) : r.id ? responsibilitiesOf(p, r.id).map(x => x.id) : [];
    for (const lr of ids.map(id => responsibility(p, id)).filter(Boolean)) {
      if (lr.purpose) out.push(P('purpose', lr.purpose, lr, `The purpose of ${refOf(lr)} ${lr.title}, which this component realises.`));
      if (lr.boundary) out.push(P('boundary', lr.boundary, lr, `The boundary of ${refOf(lr)} ${lr.title}, which this component realises.`));
      if (lr.source) out.push(P('source', `${refOf(lr)}: ${lr.source}`, lr, `The source ${refOf(lr)} records.`));
      if (!placeholder(lr.owner)) out.push(C('owner', lr.owner, lr, `${refOf(lr)} names ${lr.owner} as its owner.`));
    }
    if (r.id) {
      const flows = list(p?.realisation?.connections).filter(x => x.kind !== 'trace' && x.label), inbound = flows.filter(x => x.to === r.id), outbound = flows.filter(x => x.from === r.id);
      if (inbound.length) out.push(C('inputs', inbound.map(x => `${x.label} from ${titleOf(p, x.from)}`).join('; '), inbound[0], `The interactions that reach this component (${inbound.map(x => x.id).join(', ')}).`));
      if (outbound.length) out.push(C('outputs', outbound.map(x => `${x.label} to ${titleOf(p, x.to)}`).join('; '), outbound[0], `The interactions this component starts (${outbound.map(x => x.id).join(', ')}).`));
      for (const n of list(p?.technology?.needs).filter(n => n.applicationId === r.id && n.description).slice(0, 2)) out.push(P('technologyNeeds', n.description, n, `The ${n.category} need Chapter 6 records for this component.`));
    }
    return out;
  },
  'realisation.interaction'(p, r) {
    const out = [];
    for (const c of list(p?.interfaces?.contracts).filter(c => c.from === r.from && c.to === r.to)) if (c.failurePolicy) out.push(P('failure', c.failurePolicy, c, `The failure policy of ${refOf(c)} ${c.title}, the contract between the same components.`));
    const froms = new Set(responsibilitiesOf(p, r.from).map(x => x.id)), tos = new Set(responsibilitiesOf(p, r.to).map(x => x.id));
    for (const e of list(p?.logical?.connections).filter(e => froms.has(e.from) && tos.has(e.to))) {
      if (e.label) out.push(P('label', e.label, e, `What ${e.id} calls the relationship between the responsibilities both components realise.`));
      if (e.condition) out.push(P('condition', e.condition, e, `The condition ${e.id} records between the responsibilities both components realise.`));
    }
    return out;
  },
  'technology.capability'(p, r) {
    const out = [], ids = list(r.needIds).length ? list(r.needIds) : r.id ? list(p?.technology?.mappings).filter(m => m.capabilityId === r.id).map(m => m.needId) : [];
    for (const n of ids.map(id => list(p?.technology?.needs).find(x => x.id === id)).filter(Boolean)) {
      const app = component(p, n.applicationId);
      if (n.description) { out.push(P('purpose', n.description, n, `The need ${n.id} records for ${app ? refOf(app) + ' ' + app.title : n.applicationId}.`)); out.push(P('rationale', n.description, n, `The need this capability supports.`)); }
      if (app && !placeholder(app.owner)) out.push(C('owner', app.owner, app, `${refOf(app)} ${app.title}, whose need this supports, is owned by ${app.owner}.`));
    }
    if (r.id) for (const rec of realisationsOfCapability(p, r.id)) {
      if (rec.resiliencePlan) { out.push(P('recoveryPlan', rec.resiliencePlan, rec, `The resilience plan of ${refOf(rec)} ${rec.title}, which realises this capability.`)); out.push(P('continuityPlan', rec.resiliencePlan, rec, `The resilience plan of ${refOf(rec)} ${rec.title}, which realises this capability.`)); }
      if (!placeholder(rec.owner)) out.push(C('recoveryOwner', rec.owner, rec, `${refOf(rec)} ${rec.title}, which realises this capability, is owned by ${rec.owner}.`));
    }
    return out;
  },
  'techrealisation.plan'(p, r) {
    const out = [], ids = list(r.capabilityIds).length ? list(r.capabilityIds) : r.id ? capabilitiesOfRealisation(p, r.id).map(c => c.id) : [];
    for (const c of ids.map(id => capability(p, id)).filter(Boolean)) {
      if (c.purpose) out.push(P('purpose', c.purpose, c, `The purpose of ${refOf(c)} ${c.title}, the capability this realises.`));
      if (c.continuityPlan) out.push(P('resiliencePlan', c.continuityPlan, c, `The continuity plan ${refOf(c)} records.`));
      if (c.recoveryPlan) out.push(P('resiliencePlan', c.recoveryPlan, c, `The recovery plan ${refOf(c)} records.`));
      if (c.boundary) out.push(P('dataPlan', c.boundary, c, `The boundary ${refOf(c)} records.`));
      if (!placeholder(c.owner)) out.push(C('owner', c.owner, c, `${refOf(c)} ${c.title} is owned by ${c.owner}.`));
      if (!placeholder(c.recoveryOwner)) out.push(C('owner', c.recoveryOwner, c, `${refOf(c)} names ${c.recoveryOwner} for its recovery.`));
    }
    if (r.id) for (const plan of list(p?.runtime?.plans).filter(x => x.assetId === r.id)) if (plan.runbook) out.push(P('operationsPlan', plan.runbook, plan, `The runbook of ${refOf(plan)}, which runs this realisation.`));
    return out;
  },
  'interfaces.contract'(p, r) {
    const out = [], ends = [r.from, r.to].filter(Boolean);
    const link = r.sourceId ? list(p?.realisation?.connections).find(x => x.id === r.sourceId) : list(p?.realisation?.connections).find(x => x.from === r.from && x.to === r.to);
    if (link?.failure) out.push(P('failurePolicy', link.failure, link, `The failure policy Chapter 5 records for the interaction ${link.id} this contract defines.`));
    if (link?.condition) out.push(P('timeoutPolicy', link.condition, link, `The condition Chapter 5 records for ${link.id}.`));
    if (link?.label) out.push(C('purpose', `${link.label}: ${titleOf(p, link.from)} to ${titleOf(p, link.to)}.`, link, `The interaction ${link.id} this contract defines.`, CHAPTER_METHODS[8]?.fields?.find(([f]) => f === 'purpose')?.[1]));
    const drivers = uniq(ends.flatMap(id => driversOfComponent(p, id)));
    for (const d of drivers) {
      if (d.category === 'integrity' && d.response) out.push(P('duplicatePolicy', d.response, d, `${d.id} (${d.category}, ${d.priority}) asks this response of the components at either end.`));
      if (d.category === 'performance' && d.response) out.push(P('timeoutPolicy', d.response, d, `${d.id} (${d.category}, ${d.priority}) asks this response of the components at either end.`));
      if (['availability', 'recoverability'].includes(d.category) && d.response) out.push(P('failurePolicy', d.response, d, `${d.id} (${d.category}, ${d.priority}) asks this response of the components at either end.`));
      if (d.category === 'integrity' && d.tactic) out.push(P('retryPolicy', d.tactic, d, `The tactic ${d.id} names for the components at either end.`));
    }
    for (const c of controlsOn(p, [r.id, ...ends])) {
      const text = c.mechanism || c.enforcement || c.purpose;
      if (text) out.push(P(TRANSPORT.test(c.category || '') ? 'transport' : 'authorization', text, c, `${refOf(c)} ${c.title}, a Chapter 9 control on ${c.targetIds.includes(r.id) ? 'this contract' : 'one of its endpoints'}.`));
    }
    const request = list(r.requestData).length ? list(r.requestData) : list(r.exchanges).filter(x => x.role === 'request').map(x => x.dataId);
    for (const d of request.map(id => dataRecord(p, id)).filter(Boolean)) for (const f of list(d.fields).filter(f => f.key && f.name)) {
      out.push(P('correlationKey', f.name, d, `The key field of ${refOf(d)} ${d.title}, the request payload.`));
      out.push(P('idempotencyKey', f.name, d, `The key field of ${refOf(d)} ${d.title}, the request payload.`));
    }
    const provider = component(p, r.to) || party(p, r.to);
    if (provider && !placeholder(provider.owner)) out.push(C('owner', provider.owner, provider, `${refOf(provider)} ${provider.title}, which provides this contract, is owned by ${provider.owner}.`));
    return out;
  },
  'interfaces.data'(p, r) {
    const out = [];
    for (const c of controlsOn(p, [r.id])) { const text = c.mechanism || c.enforcement || c.purpose; if (text) out.push(P('protection', text, c, `${refOf(c)} ${c.title}, a Chapter 9 control on this data.`)); }
    const authority = component(p, r.authorityId);
    if (authority && !placeholder(authority.owner)) out.push(C('owner', authority.owner, authority, `${refOf(authority)} ${authority.title}, the authoritative system for this data, is owned by ${authority.owner}.`));
    return out;
  },
  'security.threat'(p, r) {
    const out = [], targets = list(r.targetIds), set = new Set(targets);
    for (const t of list(p?.security?.threats).filter(t => t.id !== r.id && list(t.targetIds).some(id => set.has(id)))) {
      if (t.consequence) out.push(P('consequence', t.consequence, t, `The consequence ${refOf(t)} records for an object this threat also affects.`));
      if (t.actor) out.push(P('actor', t.actor, t, `The actor ${refOf(t)} records for an object this threat also affects.`));
    }
    for (const id of targets) {
      const target = contract(p, id) || dataRecord(p, id) || component(p, id);
      if (target && !placeholder(target.owner)) out.push(C('owner', target.owner, target, `${refOf(target)} ${target.title}, which this threat affects, is owned by ${target.owner}.`));
      const comps = contract(p, id) ? [contract(p, id).from, contract(p, id).to] : component(p, id) ? [id] : [];
      for (const d of uniq(comps.flatMap(c => driversOfComponent(p, c))).filter(d => ['security', 'integrity'].includes(d.category))) out.push(C('priorityBasis', `Bears on ${d.id} ${d.title} (${d.category}, ${d.priority}).`, d, `${d.id} asks this of the parts the threat affects.`));
    }
    return out;
  },
  'security.control'(p, r) {
    const out = [], threats = list(r.threatIds).map(id => threat(p, id)).filter(Boolean), targets = list(r.targetIds);
    for (const t of threats) {
      out.push(C('purpose', `Protects against ${refOf(t)} ${t.title}: ${t.scenario || t.consequence || ''}`.trim(), t, `The threat this control treats.`));
      if (!placeholder(t.owner)) out.push(C('owner', t.owner, t, `${refOf(t)} names ${t.owner} as its risk owner.`));
    }
    for (const c of targets.map(id => contract(p, id)).filter(Boolean)) {
      if (c.failurePolicy) out.push(P('failureResponse', c.failurePolicy, c, `The failure policy of ${refOf(c)} ${c.title}, which this control protects.`));
      if (c.authorization) out.push(P('mechanism', c.authorization, c, `The authorization ${refOf(c)} records.`));
      out.push(C('enforcement', `At ${c.title} (${titleOf(p, c.from)} to ${titleOf(p, c.to)})`, c, `${refOf(c)} is an object this control protects.`));
    }
    const comps = uniq(targets.flatMap(id => contract(p, id) ? [contract(p, id).from, contract(p, id).to] : [id]));
    for (const plan of list(p?.runtime?.plans).filter(x => comps.includes(x.assetId) || (r.id && list(x.controlIds).includes(r.id)))) if (plan.monitoring) out.push(P('telemetry', plan.monitoring, plan, `The monitoring ${refOf(plan)} records for a part this control protects.`));
    for (const id of targets) { const target = contract(p, id) || dataRecord(p, id) || component(p, id); if (target && !placeholder(target.owner)) out.push(C('owner', target.owner, target, `${refOf(target)} ${target.title}, which this control protects, is owned by ${target.owner}.`)); }
    // The security drivers on the protected parts say what must happen and how it is measured.
    for (const d of uniq(comps.flatMap(id => driversOfComponent(p, id))).filter(d => d.category === 'security')) {
      if (d.response) out.push(P('failureResponse', d.response, d, `${d.id} (${d.priority}) asks this response of the parts this control protects.`));
      if (d.measurement) out.push(P('verificationPlan', d.measurement, d, `How ${d.id} says its response is measured.`));
    }
    return out;
  },
  'runtime.plan'(p, r) {
    const out = [], app = component(p, r.assetId), rec = realisationRecord(p, r.assetId);
    const caps = app ? capabilitiesOfApplication(p, app.id) : rec ? capabilitiesOfRealisation(p, rec.id) : [];
    const recs = rec ? [rec] : uniq(caps.flatMap(c => realisationsOfCapability(p, c.id)));
    for (const x of recs) {
      if (x.operationsPlan) out.push(P('runbook', x.operationsPlan, x, `The operations plan of ${refOf(x)} ${x.title}, which this plan runs on.`));
      if (x.resiliencePlan) out.push(P('recoveryPlan', x.resiliencePlan, x, `The resilience plan of ${refOf(x)} ${x.title}.`));
      if (x.lifecyclePlan) out.push(P('rollout', x.lifecyclePlan, x, `The lifecycle plan of ${refOf(x)} ${x.title}.`));
    }
    for (const c of caps) {
      if (c.recoveryPlan) out.push(P('recoveryPlan', c.recoveryPlan, c, `The recovery plan of ${refOf(c)} ${c.title}, a capability this part needs.`));
      if (c.continuityPlan) out.push(P('backupPlan', c.continuityPlan, c, `The continuity plan of ${refOf(c)} ${c.title}, a capability this part needs.`));
    }
    const controls = uniq([...list(r.controlIds).map(id => control(p, id)).filter(Boolean), ...controlsOn(p, [r.assetId])]);
    for (const c of controls) {
      if (c.telemetry) out.push(P('monitoring', c.telemetry, c, `The telemetry ${refOf(c)} ${c.title} records for this part.`));
      if (c.mechanism) out.push(P('securityEnforcement', c.mechanism, c, `The mechanism of ${refOf(c)} ${c.title}, a control on this part.`));
    }
    if (app) {
      for (const d of driversOfComponent(p, app.id)) {
        if (d.category === 'performance' && d.response) out.push(P('scalingPolicy', d.response, d, `${d.id} (${d.priority}) asks this response of ${refOf(app)} ${app.title}.`));
        if (['availability', 'recoverability'].includes(d.category) && d.response) out.push(P('recoveryPlan', d.response, d, `${d.id} (${d.priority}) asks this response of ${refOf(app)} ${app.title}.`));
        if (d.measurement && ['performance', 'availability'].includes(d.category)) out.push(P('monitoring', d.measurement, d, `How ${d.id} says its response is measured.`));
      }
      const served = list(p?.interfaces?.contracts).filter(c => c.to === app.id);
      if (served.length) out.push(C('readiness', `Ready when it can serve ${served.map(c => `${refOf(c)} ${c.title}`).join(', ')}.`, served[0], `The contracts ${refOf(app)} provides.`, CHAPTER_METHODS[10]?.fields?.find(([f]) => f === 'readiness')?.[1]));
      for (const c of list(p?.interfaces?.contracts).filter(c => (c.from === app.id || c.to === app.id) && c.transport)) out.push(P('networkPolicy', c.transport, c, `The transport ${refOf(c)} records.`));
      if (!placeholder(app.owner)) out.push(C('owner', app.owner, app, `${refOf(app)} ${app.title}, which this plan runs, is owned by ${app.owner}.`));
    } else if (rec && !placeholder(rec.owner)) out.push(C('owner', rec.owner, rec, `${refOf(rec)} ${rec.title}, which this plan runs, is owned by ${rec.owner}.`));
    return out;
  },
  'runtime.path'(p, r) {
    const out = [], c = contract(p, r.contractId);
    if (c) {
      if (c.authorization) out.push(P('access', c.authorization, c, `The authorization ${refOf(c)} records.`));
      if (c.failurePolicy) out.push(P('failureResponse', c.failurePolicy, c, `The failure policy ${refOf(c)} records.`));
      if (!placeholder(c.owner)) out.push(C('owner', c.owner, c, `${refOf(c)} ${c.title}, the contract this path carries, is owned by ${c.owner}.`));
    }
    return out;
  },
  // ---- Round 11: the seven types without a provider, the placement, the data field and the reviewed ghost. Every
  // offer copies or implies a value from a record the project holds; none is scored.
  'technology.dependency'(p, r) {
    const out = [], from = capability(p, r.from), to = capability(p, r.to);
    if (from && to) out.push(C('label', `${from.title} needs ${to.title}.`, from, `The two capabilities this dependency joins (${refOf(from)}, ${refOf(to)}).`, 'Is this what the dependency means?'));
    const boundaries = uniq([from?.boundaryId, to?.boundaryId].filter(Boolean)).map(id => list(p?.technology?.boundaries).find(b => b.id === id)).filter(Boolean);
    for (const b of boundaries) if (b.policy) out.push(P('policy', b.policy, b, `The policy of ${refOf(b)} ${b.title}, the trust boundary ${boundaries.length === 1 ? 'both capabilities sit in' : 'this dependency crosses'}.`));
    if (to?.boundary) out.push(P('policy', to.boundary, to, `The boundary ${refOf(to)} ${to.title}, the capability depended on, records.`));
    return out;
  },
  'technology.boundary'(p, r) {
    const out = [];
    for (const c of list(p?.security?.controls).filter(c => TRANSPORT.test(c.category || ''))) { const text = c.enforcement || c.mechanism; if (text) out.push(P('policy', text, c, `${refOf(c)} ${c.title}, a Chapter 9 ${c.category} control; a boundary policy says what is checked at the crossing.`)); }
    if (r.id) {
      const inside = list(p?.technology?.capabilities).filter(c => c.boundaryId === r.id);
      for (const c of inside) if (c.boundary) out.push(P('policy', c.boundary, c, `The boundary ${refOf(c)} ${c.title}, a capability inside this trust boundary, records.`));
      for (const c of inside) if (!placeholder(c.owner)) out.push(C('owner', c.owner, c, `${refOf(c)} ${c.title}, inside this boundary, is owned by ${c.owner}.`));
      for (const z of list(p?.runtime?.zones).filter(z => z.boundaryId === r.id)) { if (z.isolation) out.push(P('policy', z.isolation, z, `The isolation ${refOf(z)} ${z.title}, a zone that enforces this boundary, records.`)); if (!placeholder(z.owner)) out.push(C('owner', z.owner, z, `${refOf(z)} ${z.title}, which enforces this boundary, is owned by ${z.owner}.`)); }
    }
    return out;
  },
  'techrealisation.connection'(p, r) {
    const out = [], from = realisationRecord(p, r.from), to = realisationRecord(p, r.to);
    if (!from || !to) return out;
    // The contracts between the components the two realizations serve (through the capabilities they realise and the
    // needs those support) say what the interface must honour.
    const servedBy = rec => uniq(capabilitiesOfRealisation(p, rec.id).flatMap(c => list(p?.technology?.mappings).filter(m => m.capabilityId === c.id).map(m => list(p?.technology?.needs).find(n => n.id === m.needId)?.applicationId).filter(Boolean)));
    const a = new Set(servedBy(from)), b = new Set(servedBy(to));
    for (const c of list(p?.interfaces?.contracts).filter(c => (a.has(c.from) && b.has(c.to)) || (a.has(c.to) && b.has(c.from)))) {
      if (c.protocol) out.push(P('protocol', c.protocol, c, `The protocol of ${refOf(c)} ${c.title}, a contract between the components these realizations serve.`));
      if (c.purpose) out.push(P('contract', c.purpose, c, `The purpose of ${refOf(c)} ${c.title}.`));
      if (c.failurePolicy) out.push(P('failure', c.failurePolicy, c, `The failure policy of ${refOf(c)} ${c.title}.`));
      if (c.authorization) out.push(P('security', c.authorization, c, `The authorization ${refOf(c)} ${c.title} records.`));
      const data = uniq([...list(c.requestData), ...list(c.responseData), ...list(c.exchanges).map(x => x.dataId)]).map(id => dataRecord(p, id)).filter(Boolean);
      if (data.length) out.push(C('data', data.map(d => `${d.title} (${d.classification || 'classification to confirm'})`).join('; '), data[0], `The payloads ${refOf(c)} ${c.title} exchanges, with their classification.`, 'Is this the data this interface carries?'));
    }
    for (const x of [from, to]) if (x.interfacePlan) out.push(P('contract', x.interfacePlan, x, `The interface plan of ${refOf(x)} ${x.title}.`));
    for (const x of [from, to]) if (x.accessPlan) out.push(P('security', x.accessPlan, x, `The access plan of ${refOf(x)} ${x.title}.`));
    out.push(C('title', `${from.title} to ${to.title}`, from, `The two realizations this interface joins (${refOf(from)}, ${refOf(to)}).`, 'Is this the interface?'));
    if (!placeholder(to.owner)) out.push(C('owner', to.owner, to, `${refOf(to)} ${to.title}, the destination, is owned by ${to.owner}.`));
    return out;
  },
  'interfaces.party'(p, r) {
    const out = [], named = ARTEFACTS(p).filter(a => ['actor', 'stakeholder'].includes(a.type) && str(a.title) && str(a.title).toLowerCase() === str(r.title).toLowerCase());
    for (const a of named) { if (a.description) out.push(P('purpose', a.description, a, `The description of ${a.id} ${a.title}, the Chapter 1 ${a.type} of the same name.`)); if (!placeholder(a.owner)) out.push(C('owner', a.owner, a, `${a.id} ${a.title}, the Chapter 1 ${a.type} of the same name, is owned by ${a.owner}.`)); }
    if (r.id) {
      const cs = list(p?.interfaces?.contracts).filter(c => c.from === r.id || c.to === r.id);
      if (cs.length) out.push(C('purpose', `Takes part in ${cs.map(c => `${refOf(c)} ${c.title} (${c.from === r.id ? 'calls' : 'provides'})`).join('; ')}.`, cs[0], `The contracts this party takes part in (${cs.map(refOf).join(', ')}).`, 'Is this what this party does in the design?'));
      for (const c of cs) if (!placeholder(c.owner)) out.push(C('owner', c.owner, c, `${refOf(c)} ${c.title}, a contract this party takes part in, is owned by ${c.owner}.`));
    }
    return out;
  },
  'interfaces.lineage'(p, r) {
    const out = [], from = dataRecord(p, r.from), to = dataRecord(p, r.to), c = contract(p, r.contractId);
    if (from && to) out.push(C('title', `${from.title} to ${to.title}`, from, `The two data definitions this lineage joins (${refOf(from)}, ${refOf(to)}).`, 'Is this the lineage?'));
    if (c?.purpose) out.push(P('transformation', c.purpose, c, `The purpose of ${refOf(c)} ${c.title}, the contract this lineage passes through.`));
    if (from && to?.purpose) out.push(C('transformation', `From ${from.title}: ${inline(to.purpose)}`, to, `The purpose ${refOf(to)} ${to.title} records for the data this lineage produces.`, 'Is this how the data changes on the way?'));
    for (const d of [to, from]) if (d && !placeholder(d.owner)) out.push(C('owner', d.owner, d, `${refOf(d)} ${d.title} is owned by ${d.owner}.`));
    for (const d of [to, from]) if (d?.evidence) out.push(P('evidence', d.evidence, d, `The evidence ${refOf(d)} ${d.title} records.`));
    return out;
  },
  'runtime.environment'(p, r) {
    const out = [], assets = list(r.assetIds).map(id => component(p, id) || realisationRecord(p, id)).filter(Boolean);
    if (assets.length) out.push(C('purpose', `Runs ${assets.map(a => a.title).join(', ')}.`, assets[0], `The assets this environment includes (${assets.map(refOf).join(', ')}).`, 'Is this what this environment is for?'));
    if (r.id) for (const z of list(p?.runtime?.zones).filter(z => z.environmentId === r.id)) { if (z.isolation) out.push(P('basis', z.isolation, z, `The isolation ${refOf(z)} ${z.title}, a zone of this environment, records.`)); if (!placeholder(z.owner)) out.push(C('owner', z.owner, z, `${refOf(z)} ${z.title}, a zone of this environment, is owned by ${z.owner}.`)); }
    for (const d of list(p?.quality?.drivers).filter(d => ['availability', 'recoverability'].includes(d.category) && d.conditions)) out.push(P('basis', d.conditions, d, `The operating conditions ${d.id} ${d.title} (${d.category}) records; an environment’s basis says what it is built for.`));
    for (const a of assets) if (!placeholder(a.owner)) out.push(C('owner', a.owner, a, `${refOf(a)} ${a.title}, which this environment runs, is owned by ${a.owner}.`));
    return out;
  },
  'runtime.zone'(p, r) {
    const out = [], b = list(p?.technology?.boundaries).find(x => x.id === r.boundaryId), e = list(p?.runtime?.environments).find(x => x.id === r.environmentId);
    if (b) { if (b.policy) out.push(P('isolation', b.policy, b, `The policy of ${refOf(b)} ${b.title}, the trust boundary this zone enforces.`)); if (!placeholder(b.owner)) out.push(C('owner', b.owner, b, `${refOf(b)} ${b.title}, which this zone enforces, is owned by ${b.owner}.`)); }
    for (const c of list(p?.technology?.capabilities).filter(c => b && c.boundaryId === b.id)) { if (c.failureDomain) out.push(P('failureDomain', c.failureDomain, c, `The failure domain ${refOf(c)} ${c.title}, a capability in the same trust boundary, records.`)); if (c.alternateDomain) out.push(C('failureDomain', c.alternateDomain, c, `The alternate domain ${refOf(c)} ${c.title} records; a zone is a failure domain of its own.`, 'Is this zone that alternate domain?')); }
    if (r.id) for (const z of list(p?.runtime?.zones).filter(z => z.id !== r.id && z.environmentId === r.environmentId)) if (z.isolation) out.push(C('isolation', z.isolation, z, `The isolation ${refOf(z)} ${z.title}, another zone of the same environment, records.`, 'Does this zone share the same dependencies?'));
    if (e && !placeholder(e.owner)) out.push(C('owner', e.owner, e, `${refOf(e)} ${e.title}, the environment this zone belongs to, is owned by ${e.owner}.`));
    return out;
  },
  'runtime.placement'(p, r) {
    const out = [], plan = list(p?.runtime?.plans).find(x => x.id === r.planId), z = list(p?.runtime?.zones).find(x => x.id === r.zoneId);
    if (plan?.capacityBasis) out.push(P('basis', plan.capacityBasis, plan, `The capacity basis of ${refOf(plan)} ${plan.title}, the plan this placement belongs to.`));
    if (plan && z) out.push(C('basis', `${plan.title} in ${z.title}${z.failureDomain ? ` (${z.failureDomain})` : ''}, ${r.role === 'standby' ? 'standby' : 'active'}${Number(r.replicas) > 0 ? `, ${r.replicas} ${Number(r.replicas) === 1 ? 'replica' : 'replicas'}` : ''}.`, z, `The plan and the zone this placement names.`, 'Is this the basis of this placement?'));
    if (plan?.scalingPolicy) out.push(P('basis', plan.scalingPolicy, plan, `The scaling policy ${refOf(plan)} ${plan.title} records.`));
    const app = plan ? component(p, plan.assetId) : null;
    if (app) for (const d of driversOfComponent(p, app.id).filter(d => ['performance', 'availability'].includes(d.category) && d.conditions)) out.push(P('basis', d.conditions, d, `The conditions ${d.id} ${d.title} (${d.category}) records for ${refOf(app)} ${app.title}.`));
    return out;
  },
  'interfaces.field'(p, r) {
    const out = [], name = str(r.name).toLowerCase(), home = list(p?.interfaces?.data).find(d => list(d.fields).some(f => f.id === r.id)) || dataRecord(p, r.dataId);
    if (name) for (const d of list(p?.interfaces?.data)) for (const f of list(d.fields).filter(f => f.id !== r.id && str(f.name).toLowerCase() === name)) {
      if (f.description) out.push(P('description', f.description, d, `The meaning of ${f.name} in ${refOf(d)} ${d.title}, a field of the same name.`));
      if (f.constraints) out.push(P('constraints', f.constraints, d, `The constraints of ${f.name} in ${refOf(d)} ${d.title}, a field of the same name.`));
      if (f.enumeration) out.push(P('enumeration', f.enumeration, d, `The allowed values of ${f.name} in ${refOf(d)} ${d.title}, a field of the same name.`));
    }
    if (home?.purpose) out.push(C('description', `Part of ${home.title}: ${inline(home.purpose)}`, home, `The purpose of ${refOf(home)} ${home.title}, the data definition this field belongs to.`, 'Does this field serve that purpose?'));
    if (name) for (const c of list(p?.interfaces?.contracts).filter(c => str(c.correlationKey).toLowerCase() === name || str(c.idempotencyKey).toLowerCase() === name)) out.push(C('constraints', `Unique for each ${str(c.correlationKey).toLowerCase() === name ? 'request: the correlation key' : 'instruction: the idempotency key'} of ${refOf(c)} ${c.title}.`, c, `${refOf(c)} ${c.title} names this field as its key.`, 'Must this field be unique for that contract?'));
    return out;
  },
  // A reviewed ghost's form (title, purpose, boundary, owner, source and the links it ticks) is read like a responsibility's.
  'logical.candidate'(p, r) { return PROVIDERS['logical.responsibility'](p, r); },
  'review.narrative'(p) {
    const out = [], brief = p?.brief;
    if (brief?.goal) out.push(P('summary', brief.goal, {id: 'brief', ref: 'Brief'}, 'The goal the project brief records.'));
    if (brief?.problem) out.push(P('summary', brief.problem, {id: 'brief', ref: 'Brief'}, 'The problem the project brief records.'));
    for (const s of ARTEFACTS(p).filter(a => a.type === 'scope' && a.description).slice(0, 2)) out.push(P('scope', s.description, s, `The scope ${s.id} ${s.title} records.`));
    const stakeholders = ARTEFACTS(p).filter(a => a.type === 'stakeholder' && a.title);
    if (stakeholders.length) out.push(C('audience', stakeholders.map(s => s.title).join(', '), stakeholders[0], `The stakeholders Chapter 1 records (${stakeholders.map(s => s.id).join(', ')}).`));
    const chosen = list(p?.decisions?.records).filter(d => d.selectedAlternativeId).map(d => ({d, a: list(d.alternatives).find(a => a.id === d.selectedAlternativeId)})).filter(x => x.a);
    if (chosen.length) out.push(C('approach', chosen.map(({d, a}) => `${d.id}: ${a.title}`).join('; '), chosen[0].d, `The alternatives the Chapter 3 decisions chose.`));
    return out;
  },
  'review.action'(p, r) {
    const out = [];
    for (const id of list(r.objectIds)) { const o = responsibility(p, id) || component(p, id) || capability(p, id) || realisationRecord(p, id) || contract(p, id) || dataRecord(p, id) || threat(p, id) || control(p, id); if (o && !placeholder(o.owner)) out.push(C('owner', o.owner, o, `${refOf(o)} ${o.title}, which this action treats, is owned by ${o.owner}.`)); }
    return out;
  },
};

// The record types that have a rule provider: every type the spark serves (field-spark-validate.mjs holds it so).
export const PROVIDED_TYPES = Object.keys(PROVIDERS);
// A short, stable id for an offer: the same record, field, source and value give the same id, so a dismissal holds
// until the source changes and the offer with it (FNV-1a, not a security digest).
export function suggestionId(command, recordId, field, ref, value) {
  let h = 0x811c9dc5;
  for (const ch of [command, recordId || '', field, ref || '', value].join('␟')) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return 'sg-' + h.toString(36).padStart(7, '0');
}
// The record a person is editing, as the rules read it: the saved record, overlaid with what the open form says
// (a linked id ticked in the form counts before it is saved).
export function workingRecord(p, command, {recordId = null, values = {}} = {}) {
  const saved = recordOf(p, command, recordId) || {};
  return {...saved, ...(recordId ? {id: recordId} : {}), ...Object.fromEntries(Object.entries(values || {}).filter(([, v]) => v !== undefined))};
}
// Every offer for a record, by field: at most three from the project and two to confirm, never one equal to what the
// field already holds, each with its id. Pure.
export function fieldOffers(p, command, ctx = {}) {
  const provider = PROVIDERS[command];
  if (!provider || !p) return {};
  const r = workingRecord(p, command, ctx), allowed = new Set(sparkFields(command).map(d => d.name)), byField = {};
  let offers = [];
  try { offers = provider(p, r) || []; } catch { offers = []; }
  for (const o of offers) {
    if (!allowed.has(o.field) || !o.value || !o.ref) continue;
    const value = o.value.slice(0, maxLengthOf(command, o.field)), current = str(r[o.field]);
    if (value === current) continue;
    const bucket = byField[o.field] ||= [];
    if (bucket.some(x => x.value === value) || bucket.filter(x => x.band === o.band).length >= (o.band === 'project' ? 3 : 2)) continue;
    const guide = CHAPTER_METHODS[chapterOf(command)], method = [...list(guide?.fields), ...list(guide?.questions)].find(([f]) => f === o.field)?.[1];
    bucket.push({...o, value, id: suggestionId(command, ctx.recordId || r.id, o.field, o.ref, value), ...(o.band === 'confirm' ? {question: o.question || method || `Use this for ${fieldOf(command, o.field)?.label || o.field}?`} : {})});
  }
  for (const k of Object.keys(byField)) byField[k].sort((a, b) => (a.band === b.band ? 0 : a.band === 'project' ? -1 : 1));
  return byField;
}
export const suggest = (p, command, field, ctx = {}) => fieldOffers(p, command, ctx)[field] || [];

// ---------------------------------------------------------------- the Co-author panel's list

// A chapter's open suggestions across its saved records: for each empty free-text field, the offers the rules make
// (project band first), less those a person dismissed. Sol's saved drafts are added by the panel from the server.
export function openSuggestions(p, chapter, {limit = 60} = {}) {
  const dismissed = dismissedIds(p), out = [];
  for (const command of Object.keys(RECORD_COLLECTIONS).filter(c => chapterOf(c) === Number(chapter))) {
    for (const rec of recordsOf(p, command)) {
      const recordId = singletonId(command) || rec?.id;
      if (!recordId) continue;
      const offers = fieldOffers(p, command, {recordId});
      for (const d of sparkFields(command)) {
        if (str(rec[d.name])) continue;
        const first = list(offers[d.name]).find(o => !dismissed.has(o.id));
        if (first) out.push({command, recordId, recordRef: rec.ref || (command === 'brief' ? 'Brief' : recordId), recordTitle: rec.title || rec.question || rec.route || (command === 'brief' ? 'Project brief' : recordId), field: d.name, label: d.label, offer: first});
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- Co-author dispositions (workspace, not design)

export const dispositionsOf = p => list(p?.workspace?.coauthor?.dispositions);
export const dismissedIds = p => new Set(dispositionsOf(p).filter(d => d.outcome === 'dismissed').map(d => d.suggestionId));
const ID = /^[\w:.-]{1,160}$/, RUN = /^[a-f0-9-]{36}$/;
// A dismissal from the Co-author panel, with its one-line reason. It is kept with the project (so it travels with
// the change journal and the stewards' statistics) and changes no design record.
export function applyCoauthorCommand(input, command, at = new Date().toISOString(), actor = null) {
  if (command?.type !== 'coauthor.disposition') throw Error('Unknown co-author action.');
  const raw = command.payload || {}, kind = String(raw.command || ''), field = String(raw.field || '');
  if (!supported(kind) || !sparkFields(kind).some(d => d.name === field)) throw Error('Choose a field of a record this chapter edits.');
  if (typeof raw.suggestionId !== 'string' || !ID.test(raw.suggestionId)) throw Error('Choose a suggestion to dismiss.');
  if (!SUGGESTION_SOURCES.includes(raw.source)) throw Error('Name where the suggestion came from.');
  const recordId = raw.recordId == null || raw.recordId === '' ? null : String(raw.recordId);
  if (recordId && !recordOf(input, kind, recordId)) throw Error('This record is no longer in the project.');
  if (raw.source === 'sol' && !RUN.test(String(raw.runId || ''))) throw Error('A Sol draft is dismissed with the run it came from.');
  if (raw.source !== 'sol' && raw.ref != null && raw.ref !== '' && !refExists(input, raw.ref)) throw Error('The suggestion cites a record the project does not hold.');
  const reason = typeof raw.reason === 'string' ? raw.reason.trim() : '';
  if (reason.length < 8 || reason.length > 300 || /[\r\n]/.test(reason)) throw Error('Give a one-line reason of 8–300 characters for dismissing this suggestion.');
  const p = structuredClone(input);
  p.workspace = {...(p.workspace || {})};
  const box = {version: 1, ...(p.workspace.coauthor || {})};
  const entry = {id: 'CD-' + String(dispositionsOf(input).length + 1).padStart(4, '0'), suggestionId: raw.suggestionId, command: kind, recordId, field, source: raw.source, ...(raw.ref ? {ref: String(raw.ref)} : {}), ...(raw.source === 'sol' ? {runId: String(raw.runId)} : {}), outcome: 'dismissed', reason, actor: actor || null, at};
  box.dispositions = [...dispositionsOf(input), entry].slice(-500);
  p.workspace.coauthor = box;
  return {document: p, selected: null};
}

// ---------------------------------------------------------------- what Sol reads for a field (server, mode 'field')

// The record a new record hangs from: the requirement a responsibility serves, the responsibility a component
// realises, the need a capability supports, the capability a realisation realises, the interaction a contract defines,
// the object a threat or control protects, the part a runtime plan runs. Null when the form names none.
export function parentOf(p, command, r) {
  const first = (ids, find) => list(ids).map(id => find(p, id)).find(Boolean) || null;
  switch (command) {
    case 'artefact': { const links = linkedArtefacts(p, r); return ofType(links, 'journey')[0] || links[0] || null; }
    case 'quality.driver': case 'decision.save': return first(r.requirementIds, requirement);
    case 'decision.alternative': return decisionOf(p, r);
    case 'logical.responsibility': case 'logical.candidate': return first(r.requirementIds, requirement);
    case 'logical.mapping': return responsibility(p, r.logicalId);
    case 'realisation.component': return first(list(r.logicalIds).length ? r.logicalIds : r.id ? responsibilitiesOf(p, r.id).map(x => x.id) : [], responsibility);
    case 'technology.capability': return first(r.needIds, (q, id) => list(q?.technology?.needs).find(n => n.id === id)) || (r.id ? first(list(p?.technology?.mappings).filter(m => m.capabilityId === r.id).map(m => m.needId), (q, id) => list(q?.technology?.needs).find(n => n.id === id)) : null);
    case 'techrealisation.plan': return first(r.capabilityIds, capability) || (r.id ? capabilitiesOfRealisation(p, r.id)[0] || null : null);
    case 'interfaces.contract': return (r.sourceId ? list(p?.realisation?.connections).find(x => x.id === r.sourceId) : null) || component(p, r.from) || null;
    case 'security.threat': case 'security.control': return first(r.targetIds, (q, id) => contract(q, id) || dataRecord(q, id) || component(q, id)) || first(r.threatIds, threat);
    case 'runtime.plan': return component(p, r.assetId) || realisationRecord(p, r.assetId);
    case 'runtime.placement': return list(p?.runtime?.plans).find(x => x.id === r.planId) || null;
    case 'runtime.path': return contract(p, r.contractId);
    case 'interfaces.field': return list(p?.interfaces?.data).find(d => list(d.fields).some(f => f.id === r.id)) || dataRecord(p, r.dataId) || null;
    default: return null;
  }
}
// The record's own neighbours by chapter (round 11): the records a relevant draft is made of, each as a short reading
// of its saved fields. A component's responsibilities with their purposes, a contract's two components, a control's
// threats, a plan's component and capability, a requirement's drivers, a trade-off's decisions, and so on for every
// record type. At most five, in the order of their value to the draft; each field is kept short. Pure, from the saved
// document and the open form's links only.
const NEIGHBOURS = 5, FIELD_CHARS = 320;
const clip = (v, n = FIELD_CHARS) => { const t = str(v); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const reading = (record, chapter, noun, relation, fields) => {
  const out = {};
  for (const k of fields) { const v = record?.[k]; if (typeof v === 'string' && v.trim()) out[k] = clip(v); else if (typeof v === 'number') out[k] = v; }
  return {id: record.id, ref: refOf(record), title: str(record.title || record.question || record.name || record.route || record.id), chapter, noun, relation, fields: out};
};
const otherEnd = (p, id) => component(p, id) || party(p, id) || realisationRecord(p, id) || responsibility(p, id) || null;
const SHORT = {responsibility: ['purpose', 'boundary', 'owner'], component: ['purpose', 'boundary', 'owner'], capability: ['category', 'purpose', 'boundary', 'failureDomain', 'recoveryPlan'], realisation: ['purpose', 'operationsPlan', 'resiliencePlan'], contract: ['purpose', 'protocol', 'failurePolicy', 'authorization'], data: ['purpose', 'classification', 'protection'], threat: ['category', 'priority', 'scenario', 'consequence'], control: ['category', 'purpose', 'mechanism', 'enforcement'], plan: ['purpose', 'readiness', 'recoveryPlan', 'runbook']};
export function neighboursOf(p, command, r) {
  const out = [], add = (record, chapter, noun, relation, fields) => { if (record && record.id !== r.id && !out.some(x => x.id === record.id) && out.length < NEIGHBOURS) out.push(reading(record, chapter, noun, relation, fields)); };
  const each = (xs, ...rest) => { for (const x of list(xs)) add(x, ...rest); };
  const ends = (from, to, chapter, noun, relation, fields) => { for (const [id, side] of [[from, 'caller'], [to, 'provider']]) { const x = otherEnd(p, id) || capability(p, id) || dataRecord(p, id); if (x) add(x, chapter, noun, `${relation} (${side})`, fields); } };
  const dataOf = (ids, relation) => each(list(ids).map(id => dataRecord(p, id)).filter(Boolean), 8, 'data definition', relation, SHORT.data);
  switch (command) {
    case 'brief': each(ofType(ARTEFACTS(p), 'outcome').slice(0, 3), 1, 'outcome', 'an outcome this brief asks for', ['description']); each(ofType(ARTEFACTS(p), 'scope').slice(0, 2), 1, 'scope boundary', 'a scope boundary of this project', ['description', 'scopeMode']); break;
    case 'artefact': { const links = linkedArtefacts(p, r); for (const a of [...ofType(links, 'journey'), ...ofType(links, 'outcome'), ...ofType(links, 'actor'), ...ofType(links, 'requirement'), ...links]) add(a, 1, a.type || 'record', 'linked to this record', ['description', 'acceptance', 'owner']); break; }
    case 'quality.driver': each(list(r.responsibilityIds).map(id => responsibility(p, id)).filter(Boolean), 4, 'responsibility', 'a responsibility this scenario affects', SHORT.responsibility); each(r.id ? list(p?.quality?.conflicts).filter(c => [c.driver0, c.driver1, ...list(c.driverIds)].includes(r.id)) : [], 2, 'quality conflict', 'a conflict this scenario is part of', ['effect', 'resolution', 'status']); break;
    case 'quality.conflict': { const ids = uniq([r.driver0 || list(r.driverIds)[0], r.driver1 || list(r.driverIds)[1]].filter(Boolean)); each(list(p?.decisions?.records).filter(d => ids.length === 2 && ids.every(id => list(d.driverIds).includes(id))), 3, 'decision', 'a decision that weighs both drivers', ['question', 'context', 'rationale']); break; }
    case 'decision.save': { const d = r.id ? decision(p, r.id) : null, alts = list(d?.alternatives), chosen = alts.find(a => a.id === d?.selectedAlternativeId); for (const a of [chosen, ...alts].filter(Boolean)) add(a, 3, 'alternative', a === chosen ? 'the working choice of this decision' : 'an alternative of this decision', ['summary', 'benefits', 'costs', 'consequences']); each(list(r.requirementIds).flatMap(id => ofType(linkedArtefacts(p, requirement(p, id) || {id}), 'constraint')), 1, 'constraint', 'a constraint on a requirement this decision links', ['description']); break; }
    case 'decision.alternative': { const d = decisionOf(p, r); if (d) { add(d, 3, 'decision', 'the decision this alternative answers', ['question', 'context', 'rationale']); each(list(d.alternatives).filter(a => a.id !== r.id), 3, 'alternative', 'another alternative of the same decision', ['summary', 'benefits', 'costs']); } break; }
    case 'logical.candidate': case 'logical.responsibility': { const g = list(p?.logical?.groups).find(x => x.id === r.groupId); if (g) add({...g, members: list(p?.logical?.responsibilities).filter(x => x.groupId === g.id && x.id !== r.id).map(x => x.title).join('; ')}, 4, 'responsibility group', 'the group this responsibility is filed in', ['purpose', 'members']); if (r.id) { each(componentsOf(p, r.id), 5, 'component', 'a component that realises this responsibility', SHORT.component); for (const e of list(p?.logical?.connections).filter(e => e.from === r.id || e.to === r.id)) { const o = responsibility(p, e.from === r.id ? e.to : e.from); if (o) add(o, 4, 'responsibility', `${e.from === r.id ? 'reached by' : 'reaching'} this one: ${str(e.label)}`, ['purpose', 'boundary']); } } break; }
    case 'logical.group': each(r.id ? list(p?.logical?.responsibilities).filter(x => x.groupId === r.id) : [], 4, 'responsibility', 'a member of this group', SHORT.responsibility); break;
    case 'logical.connection': for (const [id, side] of [[r.from, 'from'], [r.to, 'to']]) add(responsibility(p, id), 4, 'responsibility', `the ${side} end of this relationship`, SHORT.responsibility); break;
    case 'logical.mapping': add(responsibility(p, r.logicalId), 4, 'responsibility', 'the responsibility allocated here', SHORT.responsibility); add(component(p, r.physicalId), 5, 'component', 'the component it is allocated to', SHORT.component); break;
    case 'realisation.component': { const ids = list(r.logicalIds).length ? list(r.logicalIds) : r.id ? responsibilitiesOf(p, r.id).map(x => x.id) : []; each(ids.map(id => responsibility(p, id)).filter(Boolean), 4, 'responsibility', 'a responsibility this component realises', SHORT.responsibility); if (r.id) for (const x of list(p?.realisation?.connections).filter(x => x.kind !== 'trace' && (x.from === r.id || x.to === r.id))) { const o = otherEnd(p, x.from === r.id ? x.to : x.from); if (o) add(o, 5, 'component', `${x.from === r.id ? 'reached by' : 'reaching'} this one: ${str(x.label)}`, ['purpose', 'boundary']); } dataOf(r.dataIds, 'data this component handles'); if (r.id) each(list(p?.technology?.needs).filter(n => n.applicationId === r.id).map(n => ({...n, title: `${n.category} need`})), 6, 'technology need', 'a platform need Chapter 6 records for this component', ['category', 'description', 'criticality']); break; }
    case 'realisation.interaction': ends(r.from, r.to, 5, 'component', 'an end of this interaction', SHORT.component); each(list(p?.interfaces?.contracts).filter(c => c.from === r.from && c.to === r.to), 8, 'interface contract', 'the contract between the same components', SHORT.contract); break;
    case 'technology.capability': { const needs = (list(r.needIds).length ? list(r.needIds) : r.id ? list(p?.technology?.mappings).filter(m => m.capabilityId === r.id).map(m => m.needId) : []).map(id => list(p?.technology?.needs).find(n => n.id === id)).filter(Boolean); for (const n of needs) { const app = component(p, n.applicationId); add({...n, title: `${n.category} need of ${app ? app.title : n.applicationId}`}, 6, 'technology need', 'an application need this capability supports', ['category', 'description', 'criticality']); } if (r.id) { each(realisationsOfCapability(p, r.id), 7, 'technology realization', 'a realization of this capability', SHORT.realisation); for (const d of list(p?.technology?.dependencies).filter(d => d.from === r.id || d.to === r.id)) { const o = capability(p, d.from === r.id ? d.to : d.from); if (o) add(o, 6, 'capability', `${d.from === r.id ? 'needed by' : 'needing'} this one: ${str(d.label)}`, ['purpose', 'failureDomain']); } } break; }
    case 'technology.dependency': for (const [id, side] of [[r.from, 'from'], [r.to, 'to']]) add(capability(p, id), 6, 'capability', `the ${side} end of this dependency`, SHORT.capability); break;
    case 'technology.boundary': if (r.id) { each(list(p?.technology?.capabilities).filter(c => c.boundaryId === r.id), 6, 'capability', 'a capability inside this boundary', ['category', 'purpose']); each(list(p?.runtime?.zones).filter(z => z.boundaryId === r.id), 10, 'zone', 'a zone that enforces this boundary', ['failureDomain', 'isolation']); } break;
    case 'techrealisation.plan': { const ids = list(r.capabilityIds).length ? list(r.capabilityIds) : r.id ? capabilitiesOfRealisation(p, r.id).map(c => c.id) : []; each(ids.map(id => capability(p, id)).filter(Boolean), 6, 'capability', 'a capability this realization realises', SHORT.capability); if (r.id) each(list(p?.runtime?.plans).filter(x => x.assetId === r.id), 10, 'runtime plan', 'a runtime plan that runs this realization', SHORT.plan); break; }
    case 'techrealisation.connection': for (const [id, side] of [[r.from, 'from'], [r.to, 'to']]) add(realisationRecord(p, id), 7, 'technology realization', `the ${side} end of this interface`, ['purpose', 'interfacePlan', 'accessPlan']); break;
    case 'interfaces.contract': ends(r.from, r.to, 5, 'component', 'an end of this contract', SHORT.component); dataOf(list(r.requestData).length ? r.requestData : list(r.exchanges).filter(x => x.role === 'request').map(x => x.dataId), 'the request payload'); dataOf(list(r.responseData).length ? r.responseData : list(r.exchanges).filter(x => x.role === 'response').map(x => x.dataId), 'the response payload'); if (r.id) each(controlsOn(p, [r.id]), 9, 'control', 'a control on this contract', SHORT.control); break;
    case 'interfaces.data': { add(component(p, r.authorityId), 5, 'component', 'the authoritative system for this data', SHORT.component); if (r.id) { each(list(p?.interfaces?.contracts).filter(c => list(c.exchanges).some(x => x.dataId === r.id) || list(c.requestData).includes(r.id) || list(c.responseData).includes(r.id)), 8, 'interface contract', 'a contract that exchanges this data', SHORT.contract); const fields = list(dataRecord(p, r.id)?.fields); if (fields.length) add({id: r.id + ':fields', title: `Fields of ${str(r.title)}`, fields: fields.slice(0, 12).map(f => `${f.name}${f.key ? ' (key)' : ''}${f.description ? ': ' + clip(f.description, 100) : ''}`).join('; ')}, 8, 'data fields', 'the fields of this data definition', ['fields']); } break; }
    case 'interfaces.field': { const d = list(p?.interfaces?.data).find(x => list(x.fields).some(f => f.id === r.id)) || dataRecord(p, r.dataId); if (d) { add(d, 8, 'data definition', 'the data definition this field belongs to', SHORT.data); add({id: d.id + ':fields', title: `Other fields of ${str(d.title)}`, fields: list(d.fields).filter(f => f.id !== r.id).slice(0, 12).map(f => `${f.name}${f.key ? ' (key)' : ''}`).join('; ')}, 8, 'data fields', 'the other fields of the same definition', ['fields']); } break; }
    case 'interfaces.party': if (r.id) each(list(p?.interfaces?.contracts).filter(c => c.from === r.id || c.to === r.id), 8, 'interface contract', 'a contract this party takes part in', SHORT.contract); each(ARTEFACTS(p).filter(a => ['actor', 'stakeholder'].includes(a.type) && str(a.title) && str(a.title).toLowerCase() === str(r.title).toLowerCase()), 1, 'actor', 'the Chapter 1 actor of the same name', ['description']); break;
    case 'interfaces.lineage': for (const [id, side] of [[r.from, 'from'], [r.to, 'to']]) add(dataRecord(p, id), 8, 'data definition', `the ${side} end of this lineage`, SHORT.data); add(contract(p, r.contractId), 8, 'interface contract', 'the contract this lineage passes through', SHORT.contract); break;
    case 'security.threat': for (const id of list(r.targetIds)) { const t = contract(p, id); if (t) add(t, 8, 'interface contract', 'an object this threat targets', SHORT.contract); else { const d = dataRecord(p, id); if (d) add(d, 8, 'data definition', 'an object this threat targets', SHORT.data); else add(component(p, id), 5, 'component', 'an object this threat targets', SHORT.component); } } if (r.id) each(list(p?.security?.controls).filter(c => list(c.threatIds).includes(r.id)), 9, 'control', 'a control that treats this threat', SHORT.control); break;
    case 'security.control': each(list(r.threatIds).map(id => threat(p, id)).filter(Boolean), 9, 'threat', 'a threat this control treats', SHORT.threat); for (const id of list(r.targetIds)) { const t = contract(p, id); if (t) add(t, 8, 'interface contract', 'an object this control protects', SHORT.contract); else { const d = dataRecord(p, id); if (d) add(d, 8, 'data definition', 'an object this control protects', SHORT.data); else add(component(p, id), 5, 'component', 'an object this control protects', SHORT.component); } } break;
    case 'runtime.environment': for (const id of list(r.assetIds)) add(component(p, id) || realisationRecord(p, id), component(p, id) ? 5 : 7, component(p, id) ? 'component' : 'technology realization', 'an asset this environment runs', ['purpose']); if (r.id) each(list(p?.runtime?.zones).filter(z => z.environmentId === r.id), 10, 'zone', 'a zone of this environment', ['failureDomain', 'isolation']); break;
    case 'runtime.zone': { const e = list(p?.runtime?.environments).find(x => x.id === r.environmentId); add(e, 10, 'environment', 'the environment this zone belongs to', ['purpose', 'stage', 'basis']); add(list(p?.technology?.boundaries).find(b => b.id === r.boundaryId), 6, 'trust boundary', 'the trust boundary this zone enforces', ['policy', 'owner']); if (r.id) each(uniq(list(p?.runtime?.placements).filter(l => l.zoneId === r.id).map(l => l.planId)).map(id => list(p?.runtime?.plans).find(x => x.id === id)).filter(Boolean), 10, 'runtime plan', 'a plan placed in this zone', ['purpose', 'readiness']); break; }
    case 'runtime.plan': { const app = component(p, r.assetId), rec = realisationRecord(p, r.assetId); add(app || rec, app ? 5 : 7, app ? 'component' : 'technology realization', 'the part this plan runs', app ? SHORT.component : SHORT.realisation); each(app ? capabilitiesOfApplication(p, app.id) : rec ? capabilitiesOfRealisation(p, rec.id) : [], 6, 'capability', 'a capability this part needs', SHORT.capability); each(uniq([...list(r.controlIds).map(id => control(p, id)).filter(Boolean), ...controlsOn(p, [r.assetId].filter(Boolean))]), 9, 'control', 'a control on this part', SHORT.control); add(list(p?.runtime?.environments).find(x => x.id === r.environmentId), 10, 'environment', 'the environment this plan runs in', ['purpose', 'stage']); break; }
    case 'runtime.placement': add(list(p?.runtime?.plans).find(x => x.id === r.planId), 10, 'runtime plan', 'the plan this placement belongs to', ['purpose', 'capacityBasis', 'minReady', 'maxReplicas', 'scalingPolicy']); add(list(p?.runtime?.zones).find(z => z.id === r.zoneId), 10, 'zone', 'the zone this placement runs in', ['failureDomain', 'isolation']); break;
    case 'runtime.path': add(contract(p, r.contractId), 8, 'interface contract', 'the contract this path carries', SHORT.contract); add(list(p?.runtime?.environments).find(x => x.id === r.environmentId), 10, 'environment', 'the environment this path belongs to', ['purpose', 'stage']); break;
    case 'review.narrative': each(ofType(ARTEFACTS(p), 'outcome').slice(0, 2), 1, 'outcome', 'an outcome the design serves', ['description']); for (const d of list(p?.decisions?.records).filter(d => d.selectedAlternativeId).slice(0, 3)) { const a = list(d.alternatives).find(x => x.id === d.selectedAlternativeId); add({...d, title: str(d.question), chosen: a ? `${a.title}${a.summary ? ': ' + clip(a.summary, 160) : ''}` : ''}, 3, 'decision', 'a decision the design rests on', ['chosen', 'rationale']); } break;
    case 'review.action': for (const id of list(r.objectIds)) add(otherEnd(p, id) || capability(p, id) || contract(p, id) || dataRecord(p, id) || threat(p, id) || control(p, id), null, 'record', 'an object this action treats', ['purpose', 'scenario']); break;
    default: break;
  }
  return out;
}
// The requirements and quality drivers a record answers to, through its links (at most four of each), and its own
// neighbours by chapter (neighboursOf).
export function relatedOf(p, command, r) {
  const reqIds = new Set(), driverIds = new Set();
  const requirementsOf = record => linkedRequirementIds(p, record || {}).forEach(id => reqIds.add(id));
  const viaResponsibilities = ids => { for (const lr of ids.map(id => responsibility(p, id)).filter(Boolean)) { requirementsOf(lr); list(p?.quality?.drivers).filter(d => driverScope(p,d).responsibilityIds.includes(lr.id)).forEach(d => driverIds.add(d.id)); } };
  const viaComponents = ids => { for (const id of ids) { requirementsOf(component(p,id)); driversForComponent(p,id).forEach(d => driverIds.add(d.id)); } viaResponsibilities(ids.flatMap(id => responsibilitiesOf(p, id).map(x => x.id))); };
  if (command === 'logical.responsibility' || command === 'logical.candidate') { list(r.requirementIds).forEach(x => reqIds.add(x)); if (r.id) viaResponsibilities([r.id]); }
  else if (command === 'artefact') { ofType(linkedArtefacts(p, r), 'requirement').forEach(q => reqIds.add(q.id)); if (r.id) driversForRequirement(p,r.id).forEach(d => driverIds.add(d.id)); }
  else if (command === 'quality.driver' || command === 'decision.save') list(r.requirementIds).forEach(x => reqIds.add(x));
  else if (command === 'quality.conflict') [r.driver0, r.driver1, ...list(r.driverIds)].filter(Boolean).forEach(x => driverIds.add(x));
  else if (command === 'decision.alternative') { const d = decisionOf(p, r); list(d?.requirementIds).forEach(x => reqIds.add(x)); list(d?.driverIds).forEach(x => driverIds.add(x)); }
  else if (command === 'logical.mapping') viaResponsibilities([r.logicalId]);
  else if (command === 'realisation.component') { viaResponsibilities(list(r.logicalIds).length ? list(r.logicalIds) : r.id ? responsibilitiesOf(p, r.id).map(x => x.id) : []); if (r.id) driversForComponent(p,r.id).forEach(d=>driverIds.add(d.id)); }
  else if (command === 'interfaces.contract') viaComponents([r.from, r.to].filter(Boolean));
  else if (command === 'runtime.plan') viaComponents([r.assetId].filter(Boolean));
  else if (command === 'runtime.placement') { const plan = list(p?.runtime?.plans).find(x => x.id === r.planId); if (plan) viaComponents([plan.assetId].filter(Boolean)); }
  else if (command === 'security.threat' || command === 'security.control') viaComponents(list(r.targetIds).flatMap(id => contract(p, id) ? [contract(p, id).from, contract(p, id).to] : [id]));
  list(r.driverIds).forEach(x => driverIds.add(x));
  requirementsOf(r);
  for (const id of reqIds) driversForRequirement(p,id).forEach(d=>driverIds.add(d.id));
  const requirements=[...reqIds].map(id=>requirement(p,id)).filter(Boolean),drivers=[...driverIds].map(id=>driver(p,id)).filter(Boolean);
  return {requirements:requirements.slice(0,4),drivers:drivers.slice(0,4),neighbours:neighboursOf(p,command,r),omitted:{requirements:Math.max(0,requirements.length-4),drivers:Math.max(0,drivers.length-4)}};
}
