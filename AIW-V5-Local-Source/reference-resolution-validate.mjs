// Reference resolution (rc41, W3): `?object=<ref>` (APP-001, LR-001, QD-003, IF-001 …), a `data-work-record` link, Sol's
// answer links and the sheet's links resolve to the record by its reference as they do by its id, on every tab; two
// records with one reference across chapters resolve by the chapter in the address. This suite pins the one resolver
// (chapter-records.js resolveRecordRef) and the shell's saved-record subject (shell-record-subject.js) for every record
// collection the model registers in a chapter, the chapter rule for an ambiguous reference, and the names that resolve to
// nothing.
import assert from 'node:assert/strict';
import {referenceProject} from './notation-fixtures.mjs';
import {chapterRecordSet, resolveRecordRef, chapterOfRecord} from './public/chapter-records.js';
import {savedRecordSubject} from './public/shell-record-subject.js';
import {OBJECT_TYPES, RECORD_COLLECTION_PATHS, architectureModel} from './public/architecture-model.js';
import {applySecurityCommand, threatStamp, controlStamp} from './public/security-domain.js';
import {applyRuntimeCommand, runtimePlanStamp} from './public/runtime-domain.js';

const checks = [];
const pass = n => { checks.push(n); console.log('PASS', n); };
// rc41 close (C32): the reference project holds no risk treatment (security.risks, Chapter 9) and no evidence
// (security.evidence, runtime.evidence, Chapter 11), so the walk below never resolved one. One of each is recorded here, in
// memory, through the domains' own commands (their rules, ids and stamps: RR-001, EV-001, RV-001), so every chapter record
// collection is walked; section 6 fails when one is not.
const at = '2026-10-22T00:00:00.000Z', reviewed = {reviewed: true, reviewer: 'Synthetic reviewer', reference: 'Unit fixture only', observations: 'Synthetic record in an in-memory fixture; no external verification.'};
let p = referenceProject();
{ const t = p.security.threats[0]; p = applySecurityCommand(p, {type: 'security.risk', payload: {...reviewed, id: t.id, stamp: threatStamp(p, t), treatment: 'mitigate', owner: 'Synthetic owner', residual: 'Synthetic residual exposure', nextReview: '2027-01-01'}}, at).document; }
{ const c = p.security.controls[0]; p = applySecurityCommand(p, {type: 'security.evidence', payload: {...reviewed, id: c.id, stamp: controlStamp(p, c), kind: 'design', result: 'partial'}}, at).document; }
{ const r = p.runtime.plans[0]; p = applyRuntimeCommand(p, {type: 'runtime.evidence', payload: {...reviewed, id: r.id, stamp: runtimePlanStamp(p, r), kind: 'design', result: 'partial'}}, at).document; }
assert.deepEqual([p.security.risks.length, p.security.evidence.length, p.runtime.evidence.length], [1, 1, 1], 'one risk treatment and one evidence record of each chapter, recorded by the domains');

// 1. Every chapter record of the reference project, by reference and by id, with and without the chapter, whatever the case.
const records = [];
for (let chapter = 1; chapter <= 11; chapter++) for (const r of chapterRecordSet(p, chapter).records) records.push(r);
assert.ok(records.length >= 100, `the reference project holds ${records.length} chapter records`);
const types = new Set(records.map(r => r.type));
const refsThatDiffer = records.filter(r => r.ref && r.ref !== r.id);
assert.ok(refsThatDiffer.length >= 30, `${refsThatDiffer.length} records carry a reference other than their id (APP-001 for api-pod …)`);
for (const r of records) {
  assert.equal(resolveRecordRef(p, r.id), r.id, `${r.type} ${r.id}: the id resolves to itself`);
  assert.equal(resolveRecordRef(p, r.id, {chapter: r.chapter}), r.id, `${r.type} ${r.id}: the id with its chapter`);
  if (r.ref) {
    assert.equal(resolveRecordRef(p, r.ref, {chapter: r.chapter}), r.id, `${r.type} ${r.ref} → ${r.id} with the chapter in the address`);
    assert.equal(resolveRecordRef(p, r.ref), r.id, `${r.type} ${r.ref} → ${r.id} without a chapter (no other chapter shares it)`);
    assert.equal(resolveRecordRef(p, r.ref.toLowerCase(), {chapter: r.chapter}), r.id, `${r.type} ${r.ref.toLowerCase()} → ${r.id}: a reference is matched without case`);
    assert.equal(resolveRecordRef(p, ' ' + r.ref + ' '), r.id, `${r.type}: surrounding spaces are ignored`);
  }
}
pass(`every one of the ${records.length} chapter records of the reference project (${types.size} record types: ${[...types].join(', ')}) resolves by its id and by its reference, with and without the chapter, without case`);

// 2. The shell's saved-record subject answers a reference as it answers an id, and only for the record's own chapter.
let subjects = 0;
for (const r of records) {
  const byId = savedRecordSubject(p, r.chapter, r.id), byRef = r.ref ? savedRecordSubject(p, r.chapter, r.ref) : byId;
  assert.equal(byId?.id, r.id, `${r.type} ${r.id}: the subject by id`);
  assert.equal(byRef?.id, r.id, `${r.type} ${r.ref}: the subject by reference carries the id`);
  assert.equal(byRef?.ref, r.ref || r.id, 'and the reference');
  assert.deepEqual(byRef, byId, 'the same subject either way');
  const other = r.chapter === 1 ? 2 : r.chapter - 1;
  assert.equal(savedRecordSubject(p, other, r.ref || r.id), null, `${r.type} ${r.ref || r.id} is not a Chapter ${other} subject`);
  subjects++;
}
pass(`savedRecordSubject answers ${subjects} records by reference exactly as by id (same subject, the id in it), and null for another chapter`);

// 3. The id form keeps working for ids that look like references and for records whose ref equals their id.
const sameRef = records.filter(r => !r.ref || r.ref === r.id);
assert.ok(sameRef.length > 0, 'some records carry their id as their reference (TN-001, PL-001, RP-001 …)');
for (const r of sameRef) assert.equal(resolveRecordRef(p, r.id, {chapter: 11}), r.id, `${r.id}: an id resolves whatever chapter the address names`);
pass(`${sameRef.length} records whose reference is their id resolve by that one name from any chapter`);

// 4. Two records with one reference across chapters: the chapter in the address decides; without one, the lowest chapter.
const twin = JSON.parse(JSON.stringify(p));
const responsibility = twin.logical.responsibilities[0], component = twin.realisation.components[0];
component.ref = responsibility.ref; // APP-001's component now also answers to LR-001
assert.equal(chapterOfRecord(twin, component.id), 5); assert.equal(chapterOfRecord(twin, responsibility.id), 4);
assert.equal(resolveRecordRef(twin, responsibility.ref, {chapter: 5}), component.id, `${responsibility.ref} on a Chapter 5 address is the component`);
assert.equal(resolveRecordRef(twin, responsibility.ref, {chapter: 4}), responsibility.id, `${responsibility.ref} on a Chapter 4 address is the responsibility`);
assert.equal(resolveRecordRef(twin, responsibility.ref, {chapter: 9}), responsibility.id, 'on a chapter that holds neither, the lowest chapter (4)');
assert.equal(resolveRecordRef(twin, responsibility.ref), responsibility.id, 'without a chapter, the lowest chapter (4)');
assert.equal(savedRecordSubject(twin, 5, responsibility.ref)?.id, component.id, 'the Chapter 5 subject by the shared reference is the component');
assert.equal(savedRecordSubject(twin, 4, responsibility.ref)?.id, responsibility.id, 'the Chapter 4 subject is the responsibility');
assert.equal(resolveRecordRef(p, responsibility.ref, {chapter: 5}), responsibility.id, 'the reference project itself is unchanged: LR-001 on a Chapter 5 address is still the responsibility');
pass('an ambiguous reference resolves by the chapter in the address, else to the lowest chapter; the saved document was not touched');

// 5. Names that resolve to nothing.
for (const bad of ['', '   ', 'APP-999', 'no-such-record', 'rel:x', null, undefined, 42]) assert.equal(resolveRecordRef(p, bad, {chapter: 5}), null, `${JSON.stringify(bad)} resolves to nothing`);
assert.equal(resolveRecordRef(null, 'APP-001'), null, 'no document, no record');
assert.equal(savedRecordSubject(p, 5, 'APP-999'), null, 'no subject for an unknown reference');
pass('an unknown reference, an empty name, a non-string and a missing document resolve to nothing (never to another record)');

// 6. Every record collection the model registers in a chapter is covered by the walk above.
// rc41 close (C32): this section claimed completeness but checked the converse — that every walked type is a chapter
// type, which chapterRecordSet guarantees by construction (it keeps only records whose type has a chapter), so it could
// not fail; and its list left out the Chapter 9 risk, which the reference project never held. Kept as a sanity check:
const chapterTypes = new Set(Object.entries(OBJECT_TYPES).filter(([, t]) => t.chapter).map(([type]) => type));
const missing = [...types].filter(t => !chapterTypes.has(t));
assert.deepEqual(missing, [], 'every walked type is a registered chapter type');
// The direction that matters: every record collection the model registers (architecture-model.js RECORD_COLLECTIONS),
// except the documented non-records (chapter-records.js NOT_RECORDS: the process model's elements and claims, saved
// views), holds a record the walk resolved. It fails when the model gains a chapter collection the walk does not
// exercise, and when a collection drops out of the chapter set (a record type losing its chapter, a collection newly
// excluded): its record is then no longer walked.
const NON_RECORD_PATHS = ['process.elements', 'process.claims', 'workbench.views'];
const objects = [...architectureModel(p).objects.values()], walked = new Set(records.map(r => r.id));
const inPath = (o, path) => String(o.source || '').startsWith(path + '[');
assert.ok(NON_RECORD_PATHS.every(path => RECORD_COLLECTION_PATHS.includes(path)), 'the documented non-records are registered collections');
const unexercised = RECORD_COLLECTION_PATHS.filter(path => !NON_RECORD_PATHS.includes(path) && !objects.some(o => inPath(o, path) && walked.has(o.id)));
assert.deepEqual(unexercised, [], 'every chapter record collection holds a record the walk resolved by id and by reference');
const processElements = objects.filter(o => inPath(o, 'process.elements'));
assert.ok(processElements.length > 0 && processElements.every(o => !walked.has(o.id)), 'the process model\'s elements are drawn, never walked as chapter records');
// The types the walk covers, exactly (was: the 26 named types are a subset of those walked; the risk and the evidence of
// the records recorded above are now named, and a type the walk gains or loses fails here until it is named).
const TYPES = ['requirement', 'journey', 'actor', 'outcome', 'constraint', 'assumption', 'context', 'quality', 'decision', 'module', 'responsibility', 'component', 'capability', 'need', 'boundary', 'technology', 'contract', 'data', 'party', 'control', 'threat', 'risk', 'environment', 'zone', 'runtime', 'instance', 'path', 'evidence'];
assert.deepEqual([...types].sort(), [...TYPES].sort(), 'the walk exercises the record types of Chapters 1 to 11, exactly');
for (const [ref, type, chapter] of [['RR-001', 'risk', 9], ['EV-001', 'evidence', 11], ['RV-001', 'evidence', 11]]) {
  assert.equal(chapterOfRecord(p, ref), chapter, `${ref} is a Chapter ${chapter} record`);
  assert.equal(resolveRecordRef(p, ref.toLowerCase(), {chapter}), ref, `?object=${ref.toLowerCase()} resolves on Chapter ${chapter}`);
  assert.equal(savedRecordSubject(p, chapter, ref)?.attrs?.Type, OBJECT_TYPES[type].label, `${ref} is the shell's ${type} subject on Chapter ${chapter}`);
}
pass(`the walk covers every chapter record collection (${RECORD_COLLECTION_PATHS.length - NON_RECORD_PATHS.length} of ${RECORD_COLLECTION_PATHS.length}; the process model's elements and claims and saved views are not chapter records) and exactly ${types.size} record types of Chapters 1 to 11, the risk treatment and the evidence included`);

console.log(JSON.stringify({suite: 'reference resolution', passed: checks.length, checks}, null, 2));
