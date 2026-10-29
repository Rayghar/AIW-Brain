// One chapter record set (round 26, D-26-09): the records a chapter's collections register, typed and placed by
// OBJECT_TYPES, never a projection; the same number on every surface; the words for the count; the rule a chapter change
// uses to keep or release a selection; the app's date words. Run: npm run test:chapter-records
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {chapterRecordSet, recordBelongsTo, chapterOfRecord, chapterOfType, typeCount} from './public/chapter-records.js';
import {OBJECT_TYPES, RECORD_COLLECTION_PATHS} from './public/architecture-model.js';
import {plural, appDate, appDateTime} from './public/util.js';

const checks = [], pass = name => checks.push(name);
const at = '2026-10-15T09:00:00.000Z';
const ref = withFinalReview(createProject({name: 'Reference bank-payment', template: 'bank-payment'}, 'rs-ref', at));
const blank = createProject({name: 'Blank', template: 'blank'}, 'rs-blank', at);
const before = JSON.stringify(ref) + JSON.stringify(blank);
const list = v => Array.isArray(v) ? v : [];

// 1. The collections export their paths in registration order, and the process model and saved views are among them.
assert.ok(RECORD_COLLECTION_PATHS.length >= 20, 'the record collections are listed');
for (const path of ['artefacts', 'quality.drivers', 'decisions.records', 'logical.responsibilities', 'realisation.components', 'technology.capabilities', 'interfaces.contracts', 'security.threats', 'runtime.plans', 'process.elements', 'workbench.views']) assert.ok(RECORD_COLLECTION_PATHS.includes(path), path + ' is a registered collection');
pass('collection paths');

// 2. On the reference project each chapter's total is the sum of its own collections, read independently of the model.
const expected = {
  1: list(ref.artefacts).length,
  2: list(ref.quality?.drivers).length,
  3: list(ref.decisions?.records).length,
  4: list(ref.logical?.responsibilities).length + list(ref.logical?.groups).length,
  5: list(ref.realisation?.components).length,
  6: list(ref.technology?.capabilities).length + list(ref.technology?.needs).length + list(ref.technology?.boundaries).length,
  7: list(ref.technologyRealisation?.records).length,
  8: list(ref.interfaces?.contracts).length + list(ref.interfaces?.data).length + list(ref.interfaces?.parties).length,
  9: list(ref.security?.threats).length + list(ref.security?.controls).length + list(ref.security?.risks).length,
  10: list(ref.runtime?.environments).length + list(ref.runtime?.zones).length + list(ref.runtime?.plans).length + list(ref.runtime?.placements).length + list(ref.runtime?.paths).length,
  11: list(ref.security?.evidence).length + list(ref.runtime?.evidence).length,
};
for (const [chapter, n] of Object.entries(expected)) {
  const S = chapterRecordSet(ref, chapter);
  assert.equal(S.total, n, `Chapter ${chapter}: ${S.total} records equal the ${n} its collections hold`);
  assert.equal(Object.values(S.byType).reduce((a, b) => a + b, 0), S.total, `Chapter ${chapter}: the types add up`);
  for (const r of S.records) { assert.equal(chapterOfType(r.type), Number(chapter), `${r.id} is typed for Chapter ${chapter}`); assert.ok(r.id && r.title, `${r.id} has an id and a title`); }
  for (const type of Object.keys(S.byType)) assert.ok(OBJECT_TYPES[type], type + ' is an object type');
}
assert.ok(chapterRecordSet(ref, 1).total >= 20, 'the reference brief has at least twenty records');
pass('reference totals');

// 3. Projections never count: Chapter 3 counts decisions, not alternatives; Chapter 7 realizations, not options;
//    Chapter 8 contracts, data and parties, not exchanges or fields; Chapter 1 its artefacts, not the journey's process steps.
assert.deepEqual(Object.keys(chapterRecordSet(ref, 3).byType), ['decision']);
assert.deepEqual(Object.keys(chapterRecordSet(ref, 7).byType), ['technology']);
assert.ok(!('exchange' in chapterRecordSet(ref, 8).byType) && !('field' in chapterRecordSet(ref, 8).byType));
assert.equal(chapterRecordSet(ref, 1).byType.journey, list(ref.artefacts).filter(a => a.type === 'journey').length, 'journey steps are the brief\'s, not the process model\'s');
pass('no projections');

// 4. The words: one label, the detail per type, a caption for a larger or smaller number.
const S1 = chapterRecordSet(ref, 1);
assert.equal(S1.label(), plural(S1.total, 'record'));
assert.match(S1.label({detail: true}), /^\d+ records · .*requirements/);
assert.equal(S1.caption(S1.total), plural(S1.total, 'record'));
assert.match(S1.caption(S1.total + 22), new RegExp(`^${S1.total + 22} elements, 22 of them beyond this chapter's ${S1.total} records$`));
assert.match(S1.caption(5, 'passage'), new RegExp(`^5 passages of this chapter's ${S1.total} records$`));
assert.equal(typeCount('capability', 1), '1 technology capability');
assert.equal(typeCount('capability', 2), '2 technology capabilities');
assert.equal(typeCount('module', 3), '3 responsibility groups');
assert.equal(plural(1, 'finding'), '1 finding'); assert.equal(plural(2, 'finding'), '2 findings');
pass('words');

// 5. The blank project: every chapter says "no records yet" and holds nothing.
for (let chapter = 1; chapter <= 11; chapter++) { const S = chapterRecordSet(blank, chapter); assert.equal(S.total, 0); assert.equal(S.label(), 'no records yet'); assert.deepEqual(S.records, []); }
pass('blank');

// 6. Belonging: the rule a chapter change uses. A Chapter 4 responsibility is not a Chapter 5 record; a project id is nobody's.
const lr = list(ref.logical?.responsibilities)[0], app = list(ref.realisation?.components)[0];
assert.ok(lr && app, 'the reference project has a responsibility and a component');
assert.equal(recordBelongsTo(ref, 4, lr.id), true); assert.equal(recordBelongsTo(ref, 5, lr.id), false);
assert.equal(recordBelongsTo(ref, 5, app.id), true); assert.equal(recordBelongsTo(ref, 4, app.id), false);
assert.equal(chapterOfRecord(ref, lr.id), 4); assert.equal(chapterOfRecord(ref, app.id), 5);
assert.equal(chapterOfRecord(ref, 'project'), null); assert.equal(chapterOfRecord(ref, null), null); assert.equal(recordBelongsTo(ref, 4, ''), false);
pass('belonging');

// 7. Dates as the app writes them: no ISO string, no leading zero on the day, a 24-hour time.
assert.equal(appDate('2026-10-15T06:24:47.403Z'), '15 Oct 2026');
assert.equal(appDate('2026-01-05T00:00:00.000Z'), '5 Jan 2026');
assert.equal(appDateTime(new Date(Date.UTC(2026, 9, 15, 6, 24, 47))).startsWith('15 Oct 2026, '), true);
assert.match(appDateTime('2026-10-15T06:24:47.403Z'), /^15 Oct 2026, \d\d:\d\d$/);
assert.equal(appDate('not a date'), ''); assert.equal(appDateTime(null), '');
pass('dates');

// 8. Nothing was changed by reading.
assert.equal(JSON.stringify(ref) + JSON.stringify(blank), before, 'reading the record sets changes nothing');
pass('pure');

console.log(`chapter-records: ${checks.length} checks passed (${checks.join(', ')})`);
