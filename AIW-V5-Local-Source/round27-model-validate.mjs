import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {reasoningSource} from './public/design-reasoning.js';
import {deskSource} from './public/desk-vitals.js';
import {capacityObjective} from './public/desk-capacity.js';
import {deskModel, TRACE_COLS} from './public/desk-model.js';
import {chapterRecordSet} from './public/chapter-records.js';
import {matrixModel, matrixHTML, matrixSets, MATRIX_DEFAULTS} from './public/model-matrix.js';
import {tableModel, tableHTML, tableColumns} from './public/model-table.js';
import {defaultView, trayButtonsHTML, questionPickerHTML, viewsOffered} from './public/instrument-tray.js';

const project = withFinalReview(seedProject()), before = JSON.stringify(project), checks = [];
for (const template of ['bank-payment', 'blank', undefined]) {
  const p = structuredClone(project); p.workspace = {...p.workspace, template};
  assert.equal(capacityObjective(reasoningSource(p)).source.kind, 'none', 'a template or legacy record cannot supply an unstated load');
  assert.ok(deskSource(p).rows.every(row => row.vitals.find(v => v.vital === 'capacity').state === 'na'));
}
const exploratory = deskSource(project, {objective: {example: true}});
assert.ok(exploratory.rows.every(row => !['bad', 'ok', 'warn'].includes(row.vitals.find(v => v.vital === 'capacity').state)), 'an explicit example is an estimate, not a verdict');
assert.equal(capacityObjective(reasoningSource(project), {kind: 'rate', value: 200, reviewer: 'Synthetic fixture'}).source.kind, 'review');
checks.push('No implicit example target in reference, blank or legacy projects; explicit exploration cannot create a capacity verdict; saved objective remains usable.');

assert.deepEqual(MATRIX_DEFAULTS[6], ['component', 'capability']);
const canonical = new Set(Array.from({length: 11}, (_, i) => chapterRecordSet(project, i + 1).records).flat().map(r => r.id));
for (const set of matrixSets(project)) for (const row of matrixModel(project, {rows: set.type, cols: 'requirement'}).rows) assert.ok(canonical.has(row.id), 'matrix axis is a saved chapter record');
const empty = structuredClone(project); empty.artefacts = []; empty.journeys = [];
const X = matrixModel(empty, {rows: 'requirement', cols: 'requirement'}), html = matrixHTML(X, {chapter: 1});
assert.match(html, /nothing to compare yet/); assert.doesNotMatch(html, /no gap/);
assert.match(matrixHTML(matrixModel(project, {rows: 'component', cols: 'capability'}), {chapter: 6, sets: matrixSets(project)}), /optgroup label="Chapter 6"/);
checks.push('Matrix uses canonical records and chapter-grouped axes; Chapter 6 compares components with capabilities; empty axes do not imply coverage.');

for (let chapter = 1; chapter <= 11; chapter++) {
  const table = tableModel(project, chapter), records = chapterRecordSet(project, chapter), ids = new Set(table.rows.map(r => r.id)), canonicalIds = new Set(records.records.map(r => r.id));
  assert.equal(table.registerCount, records.total, 'table reports the same canonical saved record count as the chapter');
  for (const record of records.records) assert.ok(ids.has(record.id), 'every canonical chapter record remains in the table');
  assert.equal(ids.size, table.rows.length, 'canonical records and review entries are not duplicated');
  assert.equal(table.additionalCount, table.rows.filter(r => !canonicalIds.has(r.id)).length, 'supplemental review entries are counted explicitly');
  assert.equal(table.rows.length, table.registerCount + table.additionalCount);
}
assert.ok(tableModel(project, 11).rows.some(r => r.id === 'SDD'), 'the existing SDD review entry remains available beside the chapter register');
const table = tableModel(project, 8), contract = table.rows.find(r => r.type === 'contract'), data = table.rows.find(r => r.type === 'data');
assert.ok(contract && data);
assert.ok(table.columns.some(c => c.key === 'field:operation'));
assert.equal(data.values.operation, undefined, 'data classification is not printed as a contract operation');
assert.ok(table.columns.some(c => c.key === 'kind' && c.label === 'Record type'));
const tech = tableModel(project, 7);
assert.ok(tech.columns.some(c => c.key === 'field:selectionState'));
assert.ok(tech.rows.filter(r => r.type === 'realisation').every(r => r.values.selectionState === 'No option preferred'));
assert.ok(tableColumns(tech).length < tech.columns.length, 'empty obligation columns are folded');
assert.match(tableHTML(tech), /empty columns/); assert.ok(tableColumns(tech, true).length === tech.columns.length);
checks.push('Table preserves each type’s named field semantics, includes all canonical chapter records, folds empty fields and distinguishes product preference from recorded selection.');

for (let chapter = 1; chapter <= 11; chapter++) {
  const tray = trayButtonsHTML(chapter, 'fixture');
  assert.ok(tray.indexOf(`data-id="${defaultView(chapter)}"`) < tray.indexOf('data-id="diagram"'));
  assert.doesNotMatch(questionPickerHTML(project, chapter), /data-cm-question|<button/);
}
assert.ok(viewsOffered(null, 9).later.length);
assert.ok(TRACE_COLS.some(c => c.ch === 6 && c.id === 'capabilities'));
const D = deskModel(project);
assert.ok(D.trace.every(r => Array.isArray(r.cells.capabilities)));
checks.push('Each chapter’s first own view leads; Questions explains views without another switcher; Trace exposes exact Chapter 6 capabilities.');
assert.equal(JSON.stringify(project), before, 'readings do not mutate the model');
console.log(JSON.stringify({suite: 'round27 Model semantics', passed: checks.length, checks}, null, 2));
