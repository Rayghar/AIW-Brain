// Record lifecycle (round 12, DM-17). Every design record has a state beside its origin (origin keeps where it came
// from; the state says where it stands):
//   proposed  created by AIW (or an import, or a drafter) without a person asking for that record: a contract seeded from
//             an interaction, a plan or a path seeded from an environment, a need read from cue words. A proposed record
//             counts in no chapter check: each chapter leaves it out and raises one grouped finding, "Review the
//             proposals", that names them all. A person's save of the record makes it authored; its origin is kept.
//   authored  the default: a record that stores no state is authored (every record saved before round 12 reads so, and
//             keeps its shape, so the fingerprints other records keep of it stay current).
//   retired   withdrawn with record.retire {id | ids, reason, chapter?}: kept whole in p.retired with who, when and why,
//             and left out of every reader until record.restore {id | ids} puts it back where it was. A record that
//             another record still names cannot be retired: the refusal names the records that name it. A proposal
//             is kept as the person's with record.keep {id | ids}. These three are the one lifecycle path of every
//             chapter (round 12, GR-GOV-23; below).
// The state is stored as `state` only when it is not authored. Chapters write `state: 'proposed'` on what they seed.
// Pure: the command works on a copy and returns it.
import {fieldOpen} from './open-fields.js';
import {documentCopy} from './document-memo.js';
export const RECORD_STATES = Object.freeze(['proposed', 'authored', 'retired']);
export const recordState = r => (r?.state === 'proposed' || r?.state === 'retired' ? r.state : 'authored');
export const isProposed = r => r?.state === 'proposed';
// Sol's mark on a record it drafted (architecture-drafter.js markDrafted): provenance.draft {by: 'sol', job, key, bundle,
// reviewed: false, appliedBy, appliedAt, …}, kept when a person keeps or saves the record (then edited: true). The
// mark, or null. Here, beside the lifecycle it goes with, so that a reader of authorship (the SDD) need not load the drafter.
export const solDraftOf = r => (r?.provenance?.draft?.by === 'sol' ? r.provenance.draft : null);
// What a chapter's checks read: the records that are not proposals, and the proposals for its one grouped finding.
export const checked = list => (Array.isArray(list) ? list.filter(r => !isProposed(r)) : []);
// The fields of a record that are open (open-fields.js): recorded as not stated or as an open question, or holding the
// words a record before round 12 used for that ("Open question: …"). An empty field is not open: it is a gap.
export function openCauses(r, fields) {
  const notStated = [], questions = [];
  for (const k of fields) { const o = fieldOpen(r, k); if (!o || (!r?.open?.[k] && !String(r?.[k] ?? '').trim())) continue; if (o.state === 'open-question') questions.push(o.question || k); else notStated.push(k); }
  return {notStated, questions};
}
// The words of a field's name: technologyNeeds is "technology needs".
export const fieldWords = k => k.replace(/([A-Z])/g, ' $1').toLowerCase();
// One finding per cause for a record's open fields: those no source states, and its open questions (warnings both).
export function openFindings(r, fields, add, id = r?.id) {
  const {notStated, questions} = openCauses(r, fields);
  if (notStated.length) add('not-stated', id, 'Stated by no source', `No source states its ${notStated.map(fieldWords).join(', ')}. Find ${notStated.length === 1 ? 'it' : 'them'}, or keep ${notStated.length === 1 ? 'it' : 'them'} open.`, 'warning');
  if (questions.length) add('open-question', id, 'Answer the open questions', 'Open: ' + questions.join(' '), 'warning');
}
export function proposalFinding(list, chapter) {
  const ids = (Array.isArray(list) ? list : []).filter(isProposed).map(r => r.ref || r.code || r.id);
  if (!ids.length) return null;
  return {code: 'proposals', id: 'proposals:' + chapter, title: 'Review the proposals', detail: `${ids.length === 1 ? '1 record was' : ids.length + ' records were'} proposed by AIW and not yet written by a person: ${ids.slice(0, 12).join(', ')}${ids.length > 12 ? ' and ' + (ids.length - 12) + ' more' : ''}. Keep, complete or retire each.`, level: 'warning', ids};
}

// Every chapter's collections of records, with the chapter that owns them. A component and the Chapter 4 object that
// stands for it share an id; they are one record and retire together.
export const COLLECTIONS = Object.freeze([['artefacts', 1], ['relationships', 1], ['requirementGroups.records', 1], ['quality.drivers', 2], ['quality.conflicts', 2], ['decisions.records', 3], ['decisions.conflicts', 3], ['logical.responsibilities', 4], ['logical.groups', 4], ['logical.connections', 4], ['logical.mappings', 4], ['logical.assets', 4], ['realisation.components', 5], ['realisation.connections', 5], ['technology.capabilities', 6], ['technology.needs', 6], ['technology.mappings', 6], ['technology.dependencies', 6], ['technology.boundaries', 6], ['technologyRealisation.records', 7], ['technologyRealisation.mappings', 7], ['technologyRealisation.connections', 7], ['interfaces.contracts', 8], ['interfaces.data', 8], ['interfaces.parties', 8], ['interfaces.lineage', 8], ['interfaces.invariants', 8], ['security.threats', 9], ['security.controls', 9], ['runtime.environments', 10], ['runtime.zones', 10], ['runtime.plans', 10], ['runtime.placements', 10], ['runtime.paths', 10],
  // Round 12 (GR-GOV-24): the process perspective's elements, paths and claims are Chapter 1's records (its findings are).
  ['processModel.elements', 1], ['processModel.transitions', 1], ['processModel.claims', 1]]);
// A first-class record leaves the design only through the one retire path (round 12, GR-GOV-24): the hard deletes that
// stood beside it (deleteArtefact, quality.delete, process.remove of an element or a claim) are refused with these words.
export const RETIRE_ONLY = 'A record leaves the design through Retire, with your reason: it is kept with who and when, and can be restored (record.retire).';
const TWINS = new Set(['realisation.components', 'logical.assets']);
const listAt = (p, path) => { const [a, b] = path.split('.'); const v = b ? p?.[a]?.[b] : p?.[a]; return Array.isArray(v) ? v : null; };
// What naming a record is not: its own identity, its history, and the readings a record keeps of others.
const SKIP = new Set(['id', 'ref', 'code', 'alias', 'history', 'sourceSnapshot', 'driverSnapshot', 'sourceDriverIds', 'sourceDecisionIds', 'open', 'provenance', 'origin', 'state', 'retired', 'scenarioId']);
function names(value, id, depth = 0) {
  if (value === id) return true;
  if (!value || typeof value !== 'object' || depth > 6) return false;
  if (Array.isArray(value)) return value.some(v => names(v, id, depth + 1));
  for (const [k, v] of Object.entries(value)) if (!SKIP.has(k) && names(v, id, depth + 1)) return true;
  return false;
}
export function locate(p, id, chapter = null) {
  const out = [];
  for (const [path, ch] of COLLECTIONS) { if (chapter && ch !== Number(chapter)) continue; const list = listAt(p, path); if (!list) continue; const index = list.findIndex(r => r?.id === id); if (index >= 0) out.push({path, chapter: ch, index, record: list[index]}); }
  return out;
}
// The records that name a record, as "Chapter n · ref" (its own twin aside).
export function referencesTo(p, id, own = []) {
  const skip = new Set(own.map(x => x.record)), out = [];
  for (const [path, ch] of COLLECTIONS) for (const r of listAt(p, path) || []) if (!skip.has(r) && names(r, id)) out.push('Chapter ' + ch + ' · ' + (r.ref || r.code || r.id));
  return [...new Set(out)];
}
// ---------------------------------------------------------------- the one lifecycle command family (round 12, GR-GOV-23)
// Every retirement, dismissal, restore and keep of every chapter goes through one family of commands:
//   record.retire  {id | ids, reason, chapter?}  withdraws each record, with why (4 to 2,000 characters, refused past
//                  that, never cut), who and when, and the records that belong to it (DEPENDENTS), each kept with
//                  `with` naming it. Dismissing an AIW proposal is this retirement: its source is not proposed again
//                  while it is retired (each chapter reads p.retired.records for that).
//   record.restore {id | ids, chapter?}          puts the last retirement of each record back where it was, with the
//                  records that left with it, a proposal again if it was one.
//   record.keep    {id | ids, chapter?}          confirms an AIW proposal as the person's: it is not a retirement. The
//                  record loses its proposed state, AIW's own origin becomes 'suggestion' (its words, kept by a person)
//                  and its chapter's rule (rules[path].keep) records the confirmation the chapter keeps.
// `rules` holds what only a chapter knows, by collection path (canonical-command.js assembles them from the chapters):
// seed(p, r) whether a record is AIW's proposal (an earlier document's seeds included), keep(p, r, at), retired(p, r, at)
// and restored(p, r) for what a record's state changes beside it, canRestore(p, r) and namedBy(p, r) for what may stop
// it. The per-chapter commands of D2 (keep-seed, dismiss-seed, restore-seed, remove-contract, remove-plan, remove-path)
// are retired: a stored journal that names one is read as this family (canonical-command.js migrateCommand).
// What leaves with a record and comes back with it: the records that name it through one field and belong to it.
// A contract takes only the runtime paths AIW proposed for it; a path a person wrote names it and stops it.
export const DEPENDENTS = Object.freeze({
  'technology.needs': [{path: 'technology.mappings', key: 'needId'}],
  'interfaces.contracts': [{path: 'runtime.paths', key: 'contractId', proposals: true}],
  'runtime.plans': [{path: 'runtime.placements', key: 'planId'}]
});
export const LIFECYCLE_COMMANDS = Object.freeze(['record.retire', 'record.restore', 'record.keep']);
const text = (v, n) => (typeof v === 'string' ? v.trim() : '').slice(0, n);
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const refOf = r => r?.ref || r?.code || r?.id;
// The records a command names: `ids`, else `id`, each once.
function idsOf(raw) {
  const ids = Array.isArray(raw?.ids) ? raw.ids : raw?.id !== undefined ? [raw.id] : [];
  const out = [...new Set(ids.map(id => text(id, 120)).filter(Boolean))];
  if (!out.length) throw Error('Choose the records.');
  if (out.length > 500) throw Error(`Choose at most 500 records at once; ${fmt(out.length)} were sent.`);
  return out;
}
// Why a record leaves the design: refused when shorter than 4 characters or past 2,000 (DM-10: refused, never cut).
function reasonOf(raw, ref) {
  const t = typeof raw?.reason === 'string' ? raw.reason.trim() : '';
  if (t.length > 2000) throw Error(`The reason holds up to 2,000 characters; ${fmt(t.length)} were sent.`);
  if (t.length < 4) throw Error('Say why ' + ref + ' leaves the design.');
  return t;
}
function touch(p, path) {
  const root = path.split('.')[0];
  // The process perspective counts its own versions (process-model.js), as its commands do.
  if (root === 'processModel') { if (p.processModel) p.processModel.version = (p.processModel.version || 0) + 1; return; }
  if (['artefacts', 'relationships', 'requirementGroups'].includes(root)) { p.contentVersion = (p.contentVersion || 0) + 1; p.review = null; p.handoff = null; if (root === 'requirementGroups') p.requirementGroups.version = (p.requirementGroups.version || 0) + 1; return; }
  const s = p[root]; if (s && typeof s === 'object') { s.version = (s.version || 0) + 1; s.review = null; s.handoff = null; }
}
// Whether a record is a proposal of AIW here: its chapter's reading, else its stored state.
const seedOf = (p, x, rules) => (rules[x.path]?.seed ? !!rules[x.path].seed(p, x.record) : isProposed(x.record));
// The records of one id a chapter means: its own, with the twin a component keeps in Chapter 4 whichever chapter asks.
function twinned(p, id, chapter) {
  const xs = locate(p, id, chapter);
  return xs.some(x => TWINS.has(x.path)) ? [...xs, ...locate(p, id).filter(y => TWINS.has(y.path) && !xs.some(x => x.path === y.path))] : xs;
}
// The records of one id the command means: refused when the id names records of two chapters and none was named.
function found(p, id, chapter, verb) {
  const xs = twinned(p, id, chapter);
  if (!xs.length) throw Error(id + ' no longer exists. Reload the project.');
  if (xs.length > 1 && !xs.every(x => TWINS.has(x.path))) throw Error(`${id} names records in ${xs.map(x => 'Chapter ' + x.chapter).join(' and ')}. Say which chapter's record to ${verb}.`);
  return xs;
}
// What leaves with the records of one id.
function dependentsOf(p, xs) {
  const out = [];
  for (const x of xs) for (const d of DEPENDENTS[x.path] || []) for (const [index, r] of (listAt(p, d.path) || []).entries()) if (r?.[d.key] === x.record.id && (!d.proposals || isProposed(r))) out.push({path: d.path, chapter: COLLECTIONS.find(([path]) => path === d.path)[1], index, record: r, with: x.record.id});
  return out;
}
function retireOne(p, id, raw, at, actor, rules) {
  const xs = found(p, id, raw.chapter, 'retire'), ref = refOf(xs[0].record), reason = reasonOf(raw, ref);
  if (xs.some(x => recordState(x.record) === 'retired')) throw Error(ref + ' is retired already.');
  // A reference component stands for a node of the reference model, which would bring it back: it is not retired.
  if (xs.some(x => x.path === 'realisation.components') && !xs.some(x => x.path === 'logical.assets')) throw Error('This reference component cannot be retired. Change it instead.');
  const deps = dependentsOf(p, xs), named = [...referencesTo(p, id, [...xs, ...deps]), ...xs.flatMap(x => rules[x.path]?.namedBy?.(p, x.record) || [])];
  if (named.length) throw Error(`${ref} is still named by ${named.slice(0, 6).join(', ')}${named.length > 6 ? ' and ' + (named.length - 6) + ' more' : ''}. Remove those links first.`);
  p.retired ??= {records: []}; p.retired.records ??= [];
  const leave = (x, extra = {}) => { const list = listAt(p, x.path), i = list.indexOf(x.record); list.splice(i, 1); p.retired.records.push({id: x.record.id, path: x.path, chapter: x.chapter, index: i, at, actor: actor || '', reason, priorState: isProposed(x.record) ? 'proposed' : 'authored', record: {...x.record, state: 'retired'}, ...extra}); touch(p, x.path); };
  // Last index first, so each splice leaves the earlier positions as they were kept.
  for (const x of [...xs].sort((a, b) => b.index - a.index)) leave(x);
  for (const d of [...deps].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : b.index - a.index)) leave(d, {with: d.with});
  for (const x of xs) rules[x.path]?.retired?.(p, x.record, at);
}
function restoreOne(p, id, raw, rules) {
  const all = p.retired?.records || [], kept = all.filter(x => x.id === id && !x.with && (!raw.chapter || x.chapter === Number(raw.chapter)));
  if (!kept.length) { const left = all.find(x => x.id === id && x.with); throw Error(left ? `${refOf(left.record)} left the design with ${left.with}; restore ${left.with} to bring it back.` : id + ' is not retired.'); }
  const last = kept.at(-1), group = all.filter(x => x.at === last.at && (x.id === id && !x.with || x.with === id));
  for (const x of group) {
    const list = listAt(p, x.path);
    if (!list) throw Error('The chapter that held ' + x.id + ' has no list for it now.');
    if (list.some(r => r?.id === x.id)) throw Error(`Another record now has the id ${x.id}. Restore is refused so that neither is lost.`);
  }
  for (const x of group.filter(x => !x.with)) rules[x.path]?.canRestore?.(p, x.record);
  for (const x of [...group].sort((a, b) => a.index - b.index)) {
    const record = {...x.record}; if (x.priorState === 'proposed') record.state = 'proposed'; else delete record.state;
    const list = listAt(p, x.path); list.splice(Math.min(x.index, list.length), 0, record);
    touch(p, x.path);
    if (!x.with) rules[x.path]?.restored?.(p, record);
  }
  p.retired.records = all.filter(x => !group.includes(x));
}
// AIW's own origins: a kept proposal reads as AIW's words a person kept ('suggestion'); any other origin is kept.
const AIW_ORIGINS = new Set(['seeded', 'inherited', 'reference']);
function keepOne(p, id, raw, at, rules) {
  const xs = found(p, id, raw.chapter, 'keep'), own = xs.filter(x => !(x.path === 'logical.assets' && xs.length > 1));
  if (!own.some(x => seedOf(p, x, rules))) throw Error(id + ' is not proposed by AIW here.');
  for (const x of own) {
    rules[x.path]?.keep?.(p, x.record, at);
    delete x.record.state; if (AIW_ORIGINS.has(x.record.origin)) x.record.origin = 'suggestion';
    touch(p, x.path);
  }
}
export function applyRecordLifecycleCommand(input, command, at = new Date().toISOString(), actor = 'architect', rules = {}) {
  // The one copy a command works on (document-memo.js documentCopy): the document itself when the caller handed it over.
  const p = documentCopy(input), raw = command.payload || {};
  if (!LIFECYCLE_COMMANDS.includes(command.type)) throw Error('Unknown record action.');
  if (raw.chapter !== undefined && raw.chapter !== null && raw.chapter !== '' && !COLLECTIONS.some(([, ch]) => ch === Number(raw.chapter))) throw Error('Choose a chapter from 1 to 10.');
  const ids = idsOf(raw);
  if (command.type === 'record.retire') { for (const id of ids) retireOne(p, id, raw, at, actor, rules); return {document: p, selected: null}; }
  if (command.type === 'record.restore') { for (const id of ids) restoreOne(p, id, raw, rules); return {document: p, selected: ids[0]}; }
  for (const id of ids) keepOne(p, id, raw, at, rules);
  return {document: p, selected: ids[0]};
}
// The retired records of a chapter, newest last, for a page to offer back (the records that left with another are
// listed under it, not on their own).
export function retiredRecords(p, chapter = null) {
  return (Array.isArray(p?.retired?.records) ? p.retired.records : []).filter(x => !x.with && (!chapter || x.chapter === Number(chapter))).map(x => ({id: x.id, ref: refOf(x.record), title: x.record?.title || x.record?.question || x.record?.label || '', path: x.path, chapter: x.chapter, at: x.at, actor: x.actor, reason: x.reason, priorState: x.priorState, with: (p.retired.records || []).filter(y => y.with === x.id && y.at === x.at).map(y => refOf(y.record))}));
}
// Whether a record can be offered for retirement on its chapter's page: it is held in a collection of that chapter and is
// not a reference component (which the reference model would bring back).
export function retirable(p, id, chapter) {
  const xs = twinned(p, id, chapter);
  return xs.length > 0 && (xs.length === 1 || xs.every(x => TWINS.has(x.path))) && !(xs.some(x => x.path === 'realisation.components') && !xs.some(x => x.path === 'logical.assets'));
}
