// One count for a chapter's records (round 26, D-26-09). A chapter's record set is the records the project's collections
// register for that chapter (architecture-model.js RECORD_COLLECTIONS, each record typed and placed in its chapter by
// OBJECT_TYPES), never a projection the model derives (alternatives, options, exchanges, fields, process steps drawn
// from the journey): so "N records" on Work, Model, Validate and Output prints one number, and a view that counts more
// (drawn elements, relationships, passages) says so in a caption. Pure and rule-based; memoised per document.
import {architectureModel, OBJECT_TYPES, RECORD_COLLECTION_PATHS} from './architecture-model.js';
import {perDocument} from './document-memo.js';
import {plural} from './util.js';

// The process model's elements and claims are Chapter 4's picture material and Chapter 11's source claims; neither is a
// chapter register, so neither counts as a record here. Saved views are the workbench's, not a chapter's.
const NOT_RECORDS = new Set(['process.elements', 'process.claims', 'workbench.views']);
const RECORD_PATHS = RECORD_COLLECTION_PATHS.filter(path => !NOT_RECORDS.has(path));
const collectionOf = source => RECORD_PATHS.find(path => String(source || '').startsWith(path + '['));

export const chapterOfType = type => OBJECT_TYPES[type]?.chapter ?? null;
export const typeLabel = type => OBJECT_TYPES[type]?.label || type;

const sets = perDocument(p => {
  const by = new Map();
  if (!p) return by;
  for (const o of architectureModel(p).objects.values()) {
    if (!collectionOf(o.source)) continue;
    const chapter = chapterOfType(o.type);
    if (!chapter) continue;
    let set = by.get(chapter);
    if (!set) by.set(chapter, set = {records: [], byType: {}});
    set.records.push({id: o.id, ref: o.ref, type: o.type, title: o.title, status: o.status, chapter});
    set.byType[o.type] = (set.byType[o.type] || 0) + 1;
  }
  return by;
});

// The words for a type's count: "5 requirements", "1 trust boundary", "3 responsibility groups".
export const typeCount = (type, n) => {
  const label = typeLabel(type).toLowerCase();
  return plural(n, label, label.endsWith('y') ? label.slice(0, -1) + 'ies' : label + 's');
};

// The chapter's record set: its records, the count per type, the total, the one label every surface prints and a
// caption for a number that counts something else besides.
export function chapterRecordSet(p, chapter) {
  chapter = Number(chapter);
  const set = sets(p).get(chapter) || {records: [], byType: {}};
  const total = set.records.length;
  const types = Object.entries(set.byType).sort((a, b) => b[1] - a[1]);
  return {
    chapter, records: set.records, byType: set.byType, total,
    // "20 records" or "no records yet"; with detail, "20 records · 5 requirements, 5 journey steps, …".
    label: ({detail = false} = {}) => total ? plural(total, 'record') + (detail && types.length > 1 ? ' · ' + types.map(([t, n]) => typeCount(t, n)).join(', ') : '') : 'no records yet',
    // What a larger number holds besides the chapter's records: "42 elements, 22 of them from other chapters' records".
    caption: (n, noun = 'element') => n === total ? plural(n, 'record') : n > total ? `${plural(n, noun)}, ${plural(n - total, 'of them')} beyond this chapter's ${plural(total, 'record')}`.replace('of thems', 'of them') : `${plural(n, noun)} of this chapter's ${plural(total, 'record')}`,
  };
}

// Whether a record (by id) belongs to the chapter: the rule a chapter change uses to keep or release a selection.
export function recordBelongsTo(p, chapter, id) {
  if (!id) return false;
  return (sets(p).get(Number(chapter))?.records || []).some(r => r.id === id);
}
// The chapter a record belongs to, or null when it is not a chapter record.
export function chapterOfRecord(p, id) {
  if (!id) return null;
  for (const [chapter, set] of sets(p)) if (set.records.some(r => r.id === id)) return chapter;
  return null;
}

// Reference resolution (rc41, W3): an address, a link or an answer may name a record by its reference (APP-001, LR-001,
// QD-003, IF-001 …) as well as by its id. Once per document: every chapter record's id, and its reference (compared
// without case) with the records that carry it, in chapter order.
const refIndex = perDocument(p => {
  const ids = new Set(), byRef = new Map();
  for (const [chapter, set] of [...sets(p)].sort((a, b) => a[0] - b[0])) for (const r of set.records) {
    ids.add(r.id);
    const ref = String(r.ref || '').trim().toLowerCase(); if (!ref) continue;
    if (!byRef.has(ref)) byRef.set(ref, []); byRef.get(ref).push({chapter, id: r.id});
  }
  return {ids, byRef};
});
// The id a reference or id names, or null: an id resolves to itself; a reference to the record that carries it — the
// chapter in the address first when two chapters share one reference, else the lowest chapter's.
export function resolveRecordRef(p, ref, {chapter = null} = {}) {
  const wanted = typeof ref === 'string' ? ref.trim() : ''; if (!p || !wanted) return null;
  const {ids, byRef} = refIndex(p);
  if (ids.has(wanted)) return wanted;
  const hits = byRef.get(wanted.toLowerCase()); if (!hits?.length) return null;
  return (chapter != null && hits.find(h => h.chapter === Number(chapter)))?.id || hits[0].id;
}
